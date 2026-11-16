"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  buildSend,
  deriveAccount,
  isValidAddress,
  isValidMnemonic,
  newMnemonic,
  normalizeMnemonic,
  type NetName,
  type Utxo,
} from "@/lib/wallet";
import { deleteVault, hasVault, openVault, saveVault } from "@/lib/vault";
import { errText, useLang, type Dict } from "@/lib/i18n";
import { api } from "@/lib/api";
import { LangSwitch } from "@/components/lang-switch";
import Link from "next/link";
import { getClass, learnerId, setClass, type JoinedClass, type Missions } from "@/lib/class-client";
import { Logo, LogoMark } from "@/components/logo";
import { HeroArt } from "@/components/hero-art";
import {
  IconAlert,
  IconCheck,
  IconChevron,
  IconClose,
  IconCopy,
  IconDrop,
  IconExternal,
  IconKey,
  IconLock,
  IconPhone,
  IconReceive,
  IconSend,
  IconShield,
  IconSignal,
  IconTrash,
} from "@/components/icons";

type View = "loading" | "welcome" | "restore" | "backup" | "pin" | "locked" | "wallet";
type Toast = { kind: "ok" | "err"; text: string; txid?: string } | null;
type Sheet = null | "receive" | "send" | "join" | "check" | "tutor";

function Words({ m }: { m: string }) {
  return (
    <ol className="words">
      {m.split(" ").map((w, i) => (
        <li key={i}>
          <span>{i + 1}</span>
          {w}
        </li>
      ))}
    </ol>
  );
}

function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Focus the sheet once when it opens (not on every render, which would steal focus from inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    const first = ref.current?.querySelector<HTMLElement>("input, textarea");
    (first ?? ref.current)?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang, t] = useLang();
  const [view, setView] = useState<View>("loading");
  const [net, setNet] = useState<NetName>("regtest");
  const [explorer, setExplorer] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [showSeed, setShowSeed] = useState(false);

  // classroom
  const [cls, setCls] = useState<JoinedClass | null>(null);
  const [missions, setMissions] = useState<Missions>({});
  const [nick, setNick] = useState("");
  const [classmates, setClassmates] = useState<{ nickname: string; address: string }[]>([]);
  const [checkIdx, setCheckIdx] = useState<number[]>([]);
  const [checkWords, setCheckWords] = useState<string[]>(["", "", ""]);
  const joined = Boolean(cls?.joined);

  // tutor
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string; err?: boolean }[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const classBody = () => (joined && cls ? { classCode: cls.code, learnerId: learnerId() } : {});

  const fmt = (sats: number) => sats.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const total = (confirmed ?? 0) + pending;
  const codeOf = (e: unknown) => (e instanceof Error ? e.message : "network");
  const fail = (e: unknown, dict: Dict = t) => setToast({ kind: "err", text: errText(dict, codeOf(e)) });

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.kind === "ok" ? 6000 : 5000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    api<{ network: NetName; explorer: string | null }>("/api/config")
      .then((c) => {
        setNet(c.network);
        setExplorer(c.explorer);
      })
      .catch(() => setToast({ kind: "err", text: errText(t, "server_unreachable") }))
      .finally(() => setView(hasVault() ? "locked" : "welcome"));
    setCls(getClass());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const r = await api<{ utxos: Utxo[]; balance: number; pending: number }>(`/api/chain/utxos?address=${encodeURIComponent(address)}`);
      setUtxos(r.utxos);
      setConfirmed(r.balance);
      setPending(r.pending ?? 0);
    } catch (e) {
      fail(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const loadMissions = useCallback(async () => {
    if (!cls?.joined) return;
    try {
      const r = await api<{ missions: Missions }>(`/api/class/${cls.code}/progress?learner=${learnerId()}`);
      setMissions(r.missions);
    } catch (e) {
      if (codeOf(e) === "not_joined" || codeOf(e) === "class_not_found") {
        const next = { ...cls, joined: false };
        setClass(next);
        setCls(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls]);

  // Joined a class from a link but no nickname yet: ask once the wallet is open.
  useEffect(() => {
    if (view === "wallet" && cls && !cls.joined && address) setSheet("join");
    if (view === "wallet" && cls?.joined) loadMissions();
  }, [view, cls, address, loadMissions]);

  async function joinClass() {
    if (!cls) return;
    setFormErr(null);
    const name = nick.trim();
    if (!name) return setFormErr(t.nickname);
    setBusy(true);
    try {
      const r = await api<{ missions: Missions }>(`/api/class/${cls.code}/join`, {
        method: "POST",
        body: JSON.stringify({ learnerId: learnerId(), nickname: name, address }),
      });
      const next = { ...cls, joined: true };
      setClass(next);
      setCls(next);
      setMissions(r.missions);
      setSheet(null);
    } catch (e) {
      setFormErr(errText(t, codeOf(e)));
    } finally {
      setBusy(false);
    }
  }

  function openCheck() {
    if (!mnemonic) return;
    const n = mnemonic.split(" ").length;
    const picks = new Set<number>();
    const rnd = new Uint32Array(8);
    crypto.getRandomValues(rnd);
    for (const r of rnd) {
      picks.add(r % n);
      if (picks.size === 3) break;
    }
    while (picks.size < 3) picks.add(picks.size);
    setCheckIdx([...picks].sort((a, b) => a - b));
    setCheckWords(["", "", ""]);
    setFormErr(null);
    setSheet("check");
  }

  async function submitCheck() {
    if (!mnemonic || !cls) return;
    const words = mnemonic.split(" ");
    const ok = checkIdx.every((idx, i) => checkWords[i].trim().toLowerCase() === words[idx]);
    if (!ok) return setFormErr(t.err.wrong_words);
    setBusy(true);
    try {
      await api(`/api/class/${cls.code}/progress`, { method: "POST", body: JSON.stringify({ learnerId: learnerId(), mission: "backup" }) });
      setMissions((m) => ({ ...m, backup: Date.now() }));
      setSheet(null);
      setToast({ kind: "ok", text: t.checkOk });
    } catch (e) {
      setFormErr(errText(t, codeOf(e)));
    } finally {
      setBusy(false);
    }
  }

  async function openSend() {
    setFormErr(null);
    setSheet("send");
    if (!joined || !cls) return;
    try {
      const r = await api<{ classmates: { nickname: string; address: string }[] }>(`/api/class/${cls.code}/classmates?learner=${learnerId()}`);
      setClassmates(r.classmates);
    } catch {
      setClassmates([]);
    }
  }

  // Mission 1 is about having sats. If this wallet already holds some (e.g. got them before joining),
  // ask the server to verify on-chain and tick it.
  async function syncClaim() {
    if (!cls?.joined) return false;
    try {
      await api(`/api/class/${cls.code}/progress`, { method: "POST", body: JSON.stringify({ learnerId: learnerId(), mission: "claim" }) });
      setMissions((m) => ({ ...m, claim: Date.now() }));
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (joined && total > 0 && !missions.claim) syncClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, total, missions.claim]);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || thinking) return;
    const history = chat.filter((m) => !m.err).map(({ role, content }) => ({ role, content }));
    setChat((c) => [...c, { role: "user", content: text }]);
    setQuestion("");
    setThinking(true);
    try {
      const r = await api<{ answer: string }>("/api/tutor", {
        method: "POST",
        body: JSON.stringify({ question: text, lang, address, balance: total, history }),
      });
      setChat((c) => [...c, { role: "assistant", content: r.answer }]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: errText(t, codeOf(e)), err: true }]);
    } finally {
      setThinking(false);
    }
  }

  function leaveClass() {
    setClass(null);
    setCls(null);
    setMissions({});
  }

  useEffect(() => {
    if (view !== "wallet") return;
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [view, refresh]);

  function go(v: View) {
    setFormErr(null);
    setView(v);
  }

  function openWallet(m: string) {
    setMnemonic(m);
    setAddress(deriveAccount(m, net).address);
    go("wallet");
  }

  async function createPinAndSave() {
    setFormErr(null);
    if (!/^\d{6}$/.test(pin)) return setFormErr(t.err.pin_digits);
    if (pin !== pin2) return setFormErr(t.err.pin_mismatch);
    if (!mnemonic) return;
    setBusy(true);
    try {
      await saveVault(mnemonic, pin);
      setPin("");
      setPin2("");
      openWallet(mnemonic);
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    setFormErr(null);
    setBusy(true);
    try {
      const m = await openVault(pin);
      setPin("");
      openWallet(m);
    } catch (e) {
      setFormErr(errText(t, codeOf(e)));
    } finally {
      setBusy(false);
    }
  }

  async function getSats() {
    setBusy(true);
    try {
      const r = await api<{ txid: string; sats: number }>("/api/faucet", { method: "POST", body: JSON.stringify({ address, ...classBody() }) });
      setToast({ kind: "ok", text: t.faucetOk(fmt(r.sats)), txid: r.txid });
      setTimeout(refresh, 2500);
      loadMissions();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setFormErr(null);
    if (!mnemonic) return;
    const amount = Number(sendAmount);
    if (!isValidAddress(sendTo, net)) return setFormErr(t.addressHelp);
    if (!Number.isInteger(amount) || amount <= 0) return setFormErr(t.enterAmount);
    setBusy(true);
    try {
      const tx = buildSend(mnemonic, net, utxos, sendTo, amount);
      const r = await api<{ txid: string }>("/api/chain/broadcast", { method: "POST", body: JSON.stringify({ hex: tx.hex, ...classBody() }) });
      setToast({ kind: "ok", text: t.sentOk(fmt(amount)), txid: r.txid });
      setSendTo("");
      setSendAmount("");
      setSheet(null);
      setTimeout(refresh, 1500);
      loadMissions();
    } catch (e) {
      setFormErr(errText(t, codeOf(e)));
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    setMnemonic(null);
    setAddress("");
    setConfirmed(null);
    setPending(0);
    setShowSeed(false);
    setSheet(null);
    setToast(null);
    go("locked");
  }

  const Header = () => (
    <header className="bar">
      <Logo />
      <div className="bar-right">
        <LangSwitch lang={lang} setLang={setLang} />
        {view === "wallet" && (
          <button className="icon-btn" onClick={lock} aria-label={t.lock} title={t.lock}>
            <IconLock size={20} />
          </button>
        )}
      </div>
    </header>
  );

  const FormError = () =>
    formErr ? (
      <p className="form-err" role="alert">
        <IconAlert size={18} />
        {formErr}
      </p>
    ) : null;

  const ToastView = () =>
    toast ? (
      <div className={`toast ${toast.kind}`} role={toast.kind === "err" ? "alert" : "status"}>
        {toast.kind === "ok" ? <IconCheck size={18} /> : <IconAlert size={18} />}
        <span>{toast.text}</span>
        {toast.txid && explorer && (
          <a href={`${explorer}/tx/${toast.txid}`} target="_blank" rel="noreferrer">
            {t.viewTx}
            <IconExternal size={15} />
          </a>
        )}
      </div>
    ) : null;

  let body: React.ReactNode;

  if (view === "loading") {
    body = <div className="center-fill"><span className="spinner" aria-label={t.loading} /></div>;
  } else if (view === "welcome") {
    body = (
      <section className="welcome">
        <HeroArt />
        <h1 className="display">{t.heroTitle}</h1>
        <p className="lead">{t.heroSub}</p>
        <ul className="points">
          <li><IconPhone /><span>{t.point1}</span></li>
          <li><IconShield /><span>{t.point2}</span></li>
          <li><IconSignal /><span>{t.point3}</span></li>
        </ul>
        <div className="stack">
          <button className="btn primary" onClick={() => { setMnemonic(newMnemonic()); go("backup"); }}>{t.createWallet}</button>
          <button className="btn ghost" onClick={() => go("restore")}>{t.restoreWallet}</button>
        </div>
        <Link className="teach-link" href="/teach">{t.teachLink}</Link>
      </section>
    );
  } else if (view === "restore") {
    body = (
      <section className="flow">
        <h1 className="title">{t.restoreTitle}</h1>
        <p className="lead">{t.restoreSub}</p>
        <label className="field">
          <span>{t.restoreLabel}</span>
          <textarea autoComplete="off" autoCapitalize="none" spellCheck={false} rows={4} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} />
        </label>
        <FormError />
        <div className="stack">
          <button
            className="btn primary"
            onClick={() => {
              if (!isValidMnemonic(restoreText)) return setFormErr(t.err.bad_seed);
              setMnemonic(normalizeMnemonic(restoreText));
              setRestoreText("");
              go("pin");
            }}
          >
            {t.restore}
          </button>
          <button className="btn ghost" onClick={() => go("welcome")}>{t.back}</button>
        </div>
      </section>
    );
  } else if (view === "backup" && mnemonic) {
    body = (
      <section className="flow">
        <div className="flow-icon"><IconKey size={26} /></div>
        <h1 className="title">{t.seedTitle}</h1>
        <p className="lead">{t.seedSub}</p>
        <Words m={mnemonic} />
        <p className="note warn"><IconAlert size={18} />{t.seedWarn}</p>
        <button className="btn primary" onClick={() => go("pin")}>{t.wroteThem}</button>
      </section>
    );
  } else if (view === "pin") {
    body = (
      <section className="flow">
        <div className="flow-icon"><IconLock size={26} /></div>
        <h1 className="title">{t.pinTitle}</h1>
        <p className="lead">{t.pinSub}</p>
        <label className="field">
          <span>{t.pinLabel}</span>
          <input className="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="field">
          <span>{t.pinConfirm}</span>
          <input className="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
        </label>
        <FormError />
        <button className="btn primary" disabled={busy} onClick={createPinAndSave}>{busy ? t.working : t.continue}</button>
      </section>
    );
  } else if (view === "locked") {
    body = (
      <section className="flow">
        <div className="flow-mascot"><LogoMark size={88} /></div>
        <h1 className="title">{t.welcomeBack}</h1>
        <p className="lead">{t.unlockSub}</p>
        <label className="field">
          <span>{t.pinLabel}</span>
          <input className="pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && pin.length === 6 && unlock()} />
        </label>
        <FormError />
        <div className="stack">
          <button className="btn primary" disabled={busy || pin.length !== 6} onClick={unlock}>{busy ? t.working : t.unlock}</button>
          <button
            className="btn text danger"
            onClick={() => {
              if (confirm(t.forgetConfirm)) {
                deleteVault();
                go("welcome");
              }
            }}
          >
            {t.forgetWallet}
          </button>
        </div>
      </section>
    );
  } else {
    body = (
      <section className="wallet">
        {joined && cls && <div className="class-chip">{t.inClass(cls.name)}</div>}
        <div className="balance-card">
          <div className="bc-mascot" aria-hidden="true"><LogoMark size={92} /></div>
          <div className="bc-top">
            <span className="bc-label">{t.balance}
              <button className="bc-refresh" onClick={refresh} aria-label={t.refresh} title={t.refresh}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></svg>
            </button>
            </span>
            <span className="badge">{t.practice}</span>
          </div>
          <div className="bc-amount">
            {confirmed === null ? <span className="skeleton" /> : <>{fmt(total)}<small>sats</small></>}
          </div>
          <div className="bc-foot">
            {pending > 0 ? (
              <span className="confirming"><i />{t.confirming(fmt(pending))}</span>
            ) : (
              <span className="bc-addr">{address.slice(0, 10)}…{address.slice(-6)}</span>
            )}

          </div>
        </div>

        <button className="tutor-fab" onClick={() => setSheet("tutor")} aria-label={t.tutor}>
          <LogoMark size={40} />
          <span>{t.tutor}</span>
        </button>

        <div className="actions">
          <button className="action" onClick={() => setSheet("receive")}>
            <span className="action-icon"><IconReceive /></span>
            {t.receive}
          </button>
          <button className="action" onClick={openSend}>
            <span className="action-icon"><IconSend /></span>
            {t.send}
          </button>
          <button className="action" onClick={getSats} disabled={busy}>
            <span className="action-icon accent"><IconDrop /></span>
            {t.getSats}
          </button>
        </div>

        {joined && (
          <div className="missions">
            <h2 className="list-title">{t.missionsTitle}<span>{[missions.claim, missions.backup, missions.send].filter(Boolean).length}/3</span></h2>
            {missions.claim && missions.backup && missions.send && <p className="done-banner">{t.missionsDone}</p>}
            {([
              ["claim", t.m1, t.m1Hint, () => (total > 0 ? syncClaim() : getSats())],
              ["backup", t.m2, t.m2Hint, openCheck],
              ["send", t.m3, t.m3Hint, openSend],
            ] as const).map(([key, title, hint, action], i) => (
              <div className={`mission ${missions[key] ? "done" : ""}`} key={key}>
                <span className="num">{missions[key] ? <IconCheck size={16} /> : i + 1}</span>
                <span className="body"><strong>{title}</strong>{!missions[key] && <small>{hint}</small>}</span>
                {!missions[key] && <button className="go" onClick={action} disabled={busy}>{t.start}</button>}
              </div>
            ))}
          </div>
        )}

        <div className="list">
          <h2 className="list-title">{t.security}</h2>
          <button className="row" onClick={() => setShowSeed((s) => !s)} aria-expanded={showSeed}>
            <span className="row-icon"><IconKey size={20} /></span>
            <span className="row-text">{showSeed ? t.hidePhrase : t.showPhrase}</span>
            <IconChevron size={18} className={showSeed ? "rot" : ""} />
          </button>
          {showSeed && mnemonic && <div className="row-panel"><Words m={mnemonic} /></div>}
          {joined && (
            <button className="row" onClick={leaveClass}>
              <span className="row-icon"><IconClose size={20} /></span>
              <span className="row-text">{t.leaveClass}</span>
              <IconChevron size={18} />
            </button>
          )}
          <button
            className="row"
            onClick={() => {
              if (confirm(t.forgetConfirm)) {
                deleteVault();
                lock();
                go("welcome");
              }
            }}
          >
            <span className="row-icon danger"><IconTrash size={20} /></span>
            <span className="row-text danger">{t.forgetWallet}</span>
            <IconChevron size={18} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="app">
      <Header />
      <main>{body}</main>

      {sheet === "receive" && (
        <SheetFrame title={t.receiveTitle} onClose={() => setSheet(null)}>
          <p className="lead">{t.receiveSub}</p>
          <div className="qr-wrap"><QRCodeSVG value={address} size={208} level="M" fgColor="#101735" /></div>
          <p className="address">{address}</p>
          <button className="btn primary" onClick={() => navigator.clipboard?.writeText(address).then(() => setToast({ kind: "ok", text: t.copied }))}>
            <IconCopy size={19} />
            {t.copy}
          </button>
        </SheetFrame>
      )}

      {sheet === "send" && (
        <SheetFrame title={t.sendTitle} onClose={() => setSheet(null)}>
          {joined && (
            <>
              <p className="peers-label">{t.classmates}</p>
              {classmates.length === 0 ? (
                <p className="hint">{t.noClassmates}</p>
              ) : (
                <div className="peers">
                  {classmates.map((c) => (
                    <button key={c.address} className={`peer ${sendTo === c.address ? "on" : ""}`} onClick={() => setSendTo(c.address)}>
                      {c.nickname}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <label className="field">
            <span>{t.to}</span>
            <input autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t.toPlaceholder} value={sendTo} onChange={(e) => setSendTo(e.target.value.trim())} />
          </label>
          <label className="field">
            <span>{t.amount}</span>
            <div className="amount-input">
              <input inputMode="numeric" placeholder="0" value={sendAmount} onChange={(e) => setSendAmount(e.target.value.replace(/\D/g, ""))} />
              <em>sats</em>
            </div>
          </label>
          <p className="hint">{t.available(fmt(total))}<br />{t.fee}</p>
          <FormError />
          <button className="btn primary" disabled={busy || !sendTo || !sendAmount} onClick={send}>
            <IconSend size={19} />
            {busy ? t.sending : t.sendNow}
          </button>
        </SheetFrame>
      )}

      {sheet === "join" && cls && (
        <SheetFrame title={t.joinTitle(cls.name)} onClose={() => setSheet(null)}>
          <p className="lead">{t.joinSub}</p>
          <label className="field">
            <span>{t.nickname}</span>
            <input maxLength={24} autoComplete="nickname" placeholder={t.nicknamePlaceholder} value={nick} onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinClass()} />
          </label>
          <FormError />
          <button className="btn primary" disabled={busy || !nick.trim()} onClick={joinClass}>{busy ? t.joining : t.joinClass}</button>
        </SheetFrame>
      )}

      {sheet === "check" && (
        <SheetFrame title={t.checkTitle} onClose={() => setSheet(null)}>
          <p className="lead">{t.checkSub}</p>
          {checkIdx.map((idx, i) => (
            <label className="field" key={idx}>
              <span>{t.word(idx + 1)}</span>
              <input
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={checkWords[i]}
                onChange={(e) => setCheckWords((w) => w.map((v, j) => (j === i ? e.target.value : v)))}
              />
            </label>
          ))}
          <FormError />
          <button className="btn primary" disabled={busy || checkWords.some((w) => !w.trim())} onClick={submitCheck}>{t.check}</button>
        </SheetFrame>
      )}

      {sheet === "tutor" && (
        <SheetFrame title={t.tutorTitle} onClose={() => setSheet(null)}>
          <p className="lead">{t.tutorSub}</p>
          <div className="chat" aria-live="polite">
            {chat.length === 0 && (
              <div className="suggest">
                {[t.tutorQ1, t.tutorQ2, t.tutorQ3, t.tutorQ4].map((q) => (
                  <button key={q} className="peer" onClick={() => ask(q)}>{q}</button>
                ))}
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={`bubble ${m.role} ${m.err ? "err" : ""}`}>
                {m.role === "assistant" && <span className="bubble-avatar"><LogoMark size={28} /></span>}
                <p>{m.content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[*-]\s+/gm, "• ")}</p>
              </div>
            ))}
            {thinking && (
              <div className="bubble assistant">
                <span className="bubble-avatar"><LogoMark size={28} /></span>
                <p className="typing" aria-label={t.tutorThinking}><i /><i /><i /></p>
              </div>
            )}
          </div>
          <div className="ask-row">
            <input
              placeholder={t.tutorPlaceholder}
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(question)}
            />
            <button className="ask-btn" disabled={thinking || !question.trim()} onClick={() => ask(question)} aria-label={t.tutorAsk}>
              <IconSend size={20} />
            </button>
          </div>
          <p className="hint">{t.tutorNote}</p>
        </SheetFrame>
      )}

      <ToastView />
    </div>
  );
}
