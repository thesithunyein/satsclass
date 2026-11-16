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
import { errText, LANGS, useLang, type Dict, type Lang } from "@/lib/i18n";
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
type Sheet = null | "receive" | "send";

class ApiError extends Error {
  constructor(code: string) {
    super(code);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("network");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? "network");
  return body as T;
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="lang" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} className={l.code === lang ? "on" : ""} aria-pressed={l.code === lang} onClick={() => setLang(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
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
      const r = await api<{ txid: string; sats: number }>("/api/faucet", { method: "POST", body: JSON.stringify({ address }) });
      setToast({ kind: "ok", text: t.faucetOk(fmt(r.sats)), txid: r.txid });
      setTimeout(refresh, 2500);
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
      const r = await api<{ txid: string }>("/api/chain/broadcast", { method: "POST", body: JSON.stringify({ hex: tx.hex }) });
      setToast({ kind: "ok", text: t.sentOk(fmt(amount)), txid: r.txid });
      setSendTo("");
      setSendAmount("");
      setSheet(null);
      setTimeout(refresh, 1500);
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

        <div className="actions">
          <button className="action" onClick={() => setSheet("receive")}>
            <span className="action-icon"><IconReceive /></span>
            {t.receive}
          </button>
          <button className="action" onClick={() => { setFormErr(null); setSheet("send"); }}>
            <span className="action-icon"><IconSend /></span>
            {t.send}
          </button>
          <button className="action" onClick={getSats} disabled={busy}>
            <span className="action-icon accent"><IconDrop /></span>
            {t.getSats}
          </button>
        </div>

        <div className="list">
          <h2 className="list-title">{t.security}</h2>
          <button className="row" onClick={() => setShowSeed((s) => !s)} aria-expanded={showSeed}>
            <span className="row-icon"><IconKey size={20} /></span>
            <span className="row-text">{showSeed ? t.hidePhrase : t.showPhrase}</span>
            <IconChevron size={18} className={showSeed ? "rot" : ""} />
          </button>
          {showSeed && mnemonic && <div className="row-panel"><Words m={mnemonic} /></div>}
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

      <ToastView />
    </div>
  );
}
