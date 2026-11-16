"use client";

import { useCallback, useEffect, useState } from "react";
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

type View = "loading" | "welcome" | "restore" | "backup" | "pin" | "locked" | "wallet";
type Msg = { kind: "ok" | "err"; text: string } | null;

class ApiError extends Error {
  constructor(code: string, public detail?: string) {
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
  if (!res.ok) throw new ApiError(body.error ?? "network", body.detail);
  return body as T;
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="lang" role="group" aria-label="Language / Langue">
      {LANGS.map((l) => (
        <button key={l.code} className={l.code === lang ? "on" : ""} aria-pressed={l.code === lang} onClick={() => setLang(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [lang, setLang, t] = useLang();
  const [view, setView] = useState<View>("loading");
  const [net, setNet] = useState<NetName>("regtest");
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [showSeed, setShowSeed] = useState(false);

  const fmt = (sats: number) => sats.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const fail = (e: unknown, dict: Dict = t) => {
    const code = e instanceof Error ? e.message : "network";
    const detail = e instanceof ApiError && e.detail ? ` (${e.detail})` : "";
    setMsg({ kind: "err", text: errText(dict, code) + detail });
  };

  useEffect(() => {
    api<{ network: NetName }>("/api/config")
      .then((c) => setNet(c.network))
      .catch(() => setMsg({ kind: "err", text: errText(t, "server_unreachable") }))
      .finally(() => setView(hasVault() ? "locked" : "welcome"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const r = await api<{ utxos: Utxo[]; balance: number; pending: number }>(`/api/chain/utxos?address=${encodeURIComponent(address)}`);
      setUtxos(r.utxos);
      setBalance(r.balance);
      setPending(r.pending ?? 0);
    } catch (e) {
      fail(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Poll the balance while the wallet is open.
  useEffect(() => {
    if (view !== "wallet") return;
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [view, refresh]);

  function openWallet(m: string) {
    setMnemonic(m);
    setAddress(deriveAccount(m, net).address);
    setView("wallet");
  }

  async function createPinAndSave() {
    setMsg(null);
    if (!/^\d{6}$/.test(pin)) return setMsg({ kind: "err", text: t.err.pin_digits });
    if (pin !== pin2) return setMsg({ kind: "err", text: t.err.pin_mismatch });
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
    setMsg(null);
    setBusy(true);
    try {
      const m = await openVault(pin);
      setPin("");
      openWallet(m);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function claimFaucet() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api<{ txid: string; sats: number }>("/api/faucet", { method: "POST", body: JSON.stringify({ address }) });
      setMsg({ kind: "ok", text: t.faucetOk(fmt(r.sats)) });
      setTimeout(refresh, 2000);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setMsg(null);
    if (!mnemonic) return;
    const amount = Number(sendAmount);
    if (!isValidAddress(sendTo, net)) return setMsg({ kind: "err", text: t.addressHelp });
    if (!Number.isInteger(amount) || amount <= 0) return setMsg({ kind: "err", text: t.enterAmount });
    setBusy(true);
    try {
      const tx = buildSend(mnemonic, net, utxos, sendTo, amount);
      const r = await api<{ txid: string }>("/api/chain/broadcast", { method: "POST", body: JSON.stringify({ hex: tx.hex }) });
      setMsg({ kind: "ok", text: t.sentOk(fmt(tx.fee), r.txid.slice(0, 12)) });
      setSendTo("");
      setSendAmount("");
      setTimeout(refresh, 1500);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    setMnemonic(null);
    setAddress("");
    setBalance(null);
    setPending(0);
    setShowSeed(false);
    setMsg(null);
    setView("locked");
  }

  const Message = () => (msg ? <div className={`msg ${msg.kind}`} role={msg.kind === "err" ? "alert" : "status"}>{msg.text}</div> : null);
  const Words = ({ m }: { m: string }) => (
    <ol className="words">
      {m.split(" ").map((w, i) => (
        <li key={i}><span>{i + 1}.</span>{w}</li>
      ))}
    </ol>
  );
  const Top = () => (
    <header className="top">
      <strong>SatsClass</strong>
      <LangSwitch lang={lang} setLang={setLang} />
    </header>
  );

  if (view === "loading")
    return <main><Top /><p className="muted">{t.loading}</p></main>;

  if (view === "welcome")
    return (
      <main>
        <Top />
        <p className="muted">{t.tagline}</p>
        <Message />
        <div className="card">
          <h2>{t.welcome}</h2>
          <p>{t.welcomeBody}</p>
          <button onClick={() => { setMnemonic(newMnemonic()); setView("backup"); }}>{t.createWallet}</button>
          <button className="secondary" onClick={() => setView("restore")}>{t.haveSeed}</button>
        </div>
      </main>
    );

  if (view === "restore")
    return (
      <main>
        <Top />
        <h1>{t.restoreTitle}</h1>
        <Message />
        <div className="card">
          <label htmlFor="restore">{t.restoreLabel}</label>
          <textarea id="restore" autoComplete="off" autoCapitalize="none" spellCheck={false} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} />
          <button
            onClick={() => {
              if (!isValidMnemonic(restoreText)) return setMsg({ kind: "err", text: t.err.bad_seed });
              setMsg(null);
              setMnemonic(normalizeMnemonic(restoreText));
              setRestoreText("");
              setView("pin");
            }}
          >
            {t.restore}
          </button>
          <button className="secondary" onClick={() => { setMsg(null); setView("welcome"); }}>{t.back}</button>
        </div>
      </main>
    );

  if (view === "backup" && mnemonic)
    return (
      <main>
        <Top />
        <h1>{t.seedTitle}</h1>
        <div className="warn">{t.seedWarn}</div>
        <div className="card">
          <Words m={mnemonic} />
          <button onClick={() => setView("pin")}>{t.wroteThem}</button>
        </div>
      </main>
    );

  if (view === "pin")
    return (
      <main>
        <Top />
        <h1>{t.pinTitle}</h1>
        <p className="muted">{t.pinSub}</p>
        <Message />
        <div className="card">
          <label htmlFor="pin">{t.pinLabel}</label>
          <input id="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <label htmlFor="pin2">{t.pinConfirm}</label>
          <input id="pin2" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
          <button disabled={busy} onClick={createPinAndSave}>{busy ? t.encrypting : t.continue}</button>
        </div>
      </main>
    );

  if (view === "locked")
    return (
      <main>
        <Top />
        <Message />
        <div className="card">
          <label htmlFor="unlock">{t.pin}</label>
          <input id="unlock" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && unlock()} />
          <button disabled={busy || pin.length !== 6} onClick={unlock}>{busy ? t.opening : t.openWallet}</button>
          <button
            className="secondary"
            onClick={() => {
              if (confirm(t.forgetConfirm)) {
                deleteVault();
                setView("welcome");
              }
            }}
          >
            {t.forgetWallet}
          </button>
        </div>
      </main>
    );

  return (
    <main>
      <Top />
      <div className="row" style={{ alignItems: "center" }}>
        <h1>{t.myWallet}</h1>
        <button className="secondary" style={{ flex: "0 0 auto", width: "auto" }} onClick={lock}>{t.lock}</button>
      </div>
      <p className="muted">{t.networkLine(net)}</p>
      <Message />

      <div className="card">
        <p className="muted">{t.confirmedBalance}</p>
        <div className="balance">{balance === null ? "…" : `${fmt(balance)} sats`}</div>
        {pending > 0 && <p className="muted">{t.pendingLine(fmt(pending))}</p>}
        <button className="secondary" onClick={refresh}>{t.refresh}</button>
        <button disabled={busy} onClick={claimFaucet}>{t.getTestSats}</button>
      </div>

      <div className="card">
        <h2>{t.receive}</h2>
        <div className="qr"><QRCodeSVG value={address} size={200} level="M" /></div>
        <p className="address" aria-label={t.yourAddress}>{address}</p>
        <button className="secondary" onClick={() => navigator.clipboard?.writeText(address).then(() => setMsg({ kind: "ok", text: t.copied }))}>{t.copyAddress}</button>
      </div>

      <div className="card">
        <h2>{t.send}</h2>
        <label htmlFor="to">{t.recipient}</label>
        <input id="to" autoComplete="off" autoCapitalize="none" spellCheck={false} value={sendTo} onChange={(e) => setSendTo(e.target.value.trim())} />
        <label htmlFor="amt">{t.amountSats}</label>
        <input id="amt" inputMode="numeric" value={sendAmount} onChange={(e) => setSendAmount(e.target.value.replace(/\D/g, ""))} />
        <p className="muted">{t.feeNote}</p>
        <button disabled={busy || !sendTo || !sendAmount} onClick={send}>{busy ? t.sending : t.send}</button>
      </div>

      <div className="card">
        <h2>{t.backup}</h2>
        {showSeed && mnemonic ? (
          <>
            <Words m={mnemonic} />
            <button className="secondary" onClick={() => setShowSeed(false)}>{t.hide}</button>
          </>
        ) : (
          <button className="secondary" onClick={() => setShowSeed(true)}>{t.showSeed}</button>
        )}
      </div>
    </main>
  );
}
