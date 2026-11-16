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

type View = "loading" | "welcome" | "restore" | "backup" | "pin" | "locked" | "wallet";
type Msg = { kind: "ok" | "err"; text: string } | null;

const fmt = (sats: number) => sats.toLocaleString("fr-FR");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Erreur réseau, réessayez");
  return body as T;
}

export default function Home() {
  const [view, setView] = useState<View>("loading");
  const [net, setNet] = useState<NetName>("regtest");
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  // form state
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    api<{ network: NetName }>("/api/config")
      .then((c) => setNet(c.network))
      .catch(() => setMsg({ kind: "err", text: "Serveur injoignable" }))
      .finally(() => setView(hasVault() ? "locked" : "welcome"));
  }, []);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const r = await api<{ utxos: Utxo[]; balance: number; pending: number }>(`/api/chain/utxos?address=${encodeURIComponent(address)}`);
      setUtxos(r.utxos);
      setBalance(r.balance);
      setPending(r.pending ?? 0);
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    }
  }, [address]);

  // Poll the balance while the wallet is open (blocks are mined every few seconds on the class chain).
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
    if (!/^\d{6}$/.test(pin)) return setMsg({ kind: "err", text: "Le code PIN doit contenir 6 chiffres" });
    if (pin !== pin2) return setMsg({ kind: "err", text: "Les deux codes PIN ne sont pas identiques" });
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
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function claimFaucet() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api<{ txid: string; sats: number }>("/api/faucet", { method: "POST", body: JSON.stringify({ address }) });
      setMsg({ kind: "ok", text: `${fmt(r.sats)} sats en route ! Ils apparaîtront après le prochain bloc (quelques secondes).` });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setMsg(null);
    if (!mnemonic) return;
    const amount = Number(sendAmount);
    if (!isValidAddress(sendTo, net)) return setMsg({ kind: "err", text: "Adresse invalide. Vérifiez qu'elle commence par bcrt1 (classe) ou tb1 (signet)." });
    if (!Number.isInteger(amount) || amount <= 0) return setMsg({ kind: "err", text: "Entrez un montant en sats (nombre entier)" });
    setBusy(true);
    try {
      const tx = buildSend(mnemonic, net, utxos, sendTo, amount);
      const r = await api<{ txid: string }>("/api/chain/broadcast", { method: "POST", body: JSON.stringify({ hex: tx.hex }) });
      setMsg({ kind: "ok", text: `Envoyé ! Frais payés : ${fmt(tx.fee)} sats. Identifiant : ${r.txid.slice(0, 12)}…` });
      setSendTo("");
      setSendAmount("");
      setTimeout(refresh, 1500);
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    setMnemonic(null);
    setAddress("");
    setBalance(null);
    setShowSeed(false);
    setMsg(null);
    setView("locked");
  }

  const Message = () => (msg ? <div className={`msg ${msg.kind}`} role={msg.kind === "err" ? "alert" : "status"}>{msg.text}</div> : null);

  if (view === "loading") return <main><p className="muted">Chargement…</p></main>;

  if (view === "welcome")
    return (
      <main>
        <h1>SatsClass</h1>
        <p className="muted">Apprenez Bitcoin en pratiquant, avec de l&apos;argent de test. Aucun risque.</p>
        <Message />
        <div className="card">
          <h2>Bienvenue</h2>
          <p>Votre portefeuille est créé sur ce téléphone. Personne d&apos;autre ne détient vos clés, pas même SatsClass.</p>
          <button onClick={() => { setMnemonic(newMnemonic()); setView("backup"); }}>Créer mon portefeuille</button>
          <button className="secondary" onClick={() => setView("restore")}>J&apos;ai déjà une phrase de récupération</button>
        </div>
      </main>
    );

  if (view === "restore")
    return (
      <main>
        <h1>Restaurer</h1>
        <Message />
        <div className="card">
          <label htmlFor="restore">Vos 12 mots, séparés par des espaces</label>
          <textarea id="restore" autoComplete="off" autoCapitalize="none" spellCheck={false} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} />
          <button
            onClick={() => {
              if (!isValidMnemonic(restoreText)) return setMsg({ kind: "err", text: "Phrase invalide. Vérifiez l'orthographe et l'ordre des 12 mots." });
              setMsg(null);
              setMnemonic(normalizeMnemonic(restoreText));
              setRestoreText("");
              setView("pin");
            }}
          >
            Restaurer
          </button>
          <button className="secondary" onClick={() => { setMsg(null); setView("welcome"); }}>Retour</button>
        </div>
      </main>
    );

  if (view === "backup" && mnemonic)
    return (
      <main>
        <h1>Votre phrase de récupération</h1>
        <div className="warn">Écrivez ces 12 mots sur papier, dans l&apos;ordre. Quiconque les connaît contrôle vos bitcoins. Ne les photographiez pas.</div>
        <div className="card">
          <ol className="words">
            {mnemonic.split(" ").map((w, i) => (
              <li key={i}><span>{i + 1}.</span>{w}</li>
            ))}
          </ol>
          <button onClick={() => setView("pin")}>Je les ai écrits</button>
        </div>
      </main>
    );

  if (view === "pin")
    return (
      <main>
        <h1>Choisissez un code PIN</h1>
        <p className="muted">Il protège votre portefeuille sur ce téléphone.</p>
        <Message />
        <div className="card">
          <label htmlFor="pin">Code PIN (6 chiffres)</label>
          <input id="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <label htmlFor="pin2">Confirmez le code PIN</label>
          <input id="pin2" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
          <button disabled={busy} onClick={createPinAndSave}>{busy ? "Chiffrement…" : "Continuer"}</button>
        </div>
      </main>
    );

  if (view === "locked")
    return (
      <main>
        <h1>SatsClass</h1>
        <Message />
        <div className="card">
          <label htmlFor="unlock">Code PIN</label>
          <input id="unlock" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && unlock()} />
          <button disabled={busy || pin.length !== 6} onClick={unlock}>{busy ? "Ouverture…" : "Ouvrir mon portefeuille"}</button>
          <button
            className="secondary"
            onClick={() => {
              if (confirm("Supprimer le portefeuille de ce téléphone ? Sans votre phrase de 12 mots, les sats seront perdus.")) {
                deleteVault();
                setView("welcome");
              }
            }}
          >
            Oublier ce portefeuille
          </button>
        </div>
      </main>
    );

  // wallet
  return (
    <main>
      <div className="row" style={{ alignItems: "center" }}>
        <h1>Mon portefeuille</h1>
        <button className="secondary" style={{ flex: "0 0 auto", width: "auto" }} onClick={lock}>Verrouiller</button>
      </div>
      <p className="muted">Réseau de test : {net === "regtest" ? "classe (regtest)" : "signet"}. Ces sats n&apos;ont pas de valeur réelle.</p>
      <Message />

      <div className="card">
        <p className="muted">Solde confirmé</p>
        <div className="balance">{balance === null ? "…" : `${fmt(balance)} sats`}</div>
        {pending > 0 && <p className="muted">+ {fmt(pending)} sats en attente de confirmation</p>}
        <button className="secondary" onClick={refresh}>Actualiser</button>
        <button disabled={busy} onClick={claimFaucet}>Recevoir mes sats de test</button>
      </div>

      <div className="card">
        <h2>Recevoir</h2>
        <div className="qr"><QRCodeSVG value={address} size={200} level="M" /></div>
        <p className="address" aria-label="Votre adresse">{address}</p>
        <button className="secondary" onClick={() => navigator.clipboard?.writeText(address).then(() => setMsg({ kind: "ok", text: "Adresse copiée" }))}>Copier l&apos;adresse</button>
      </div>

      <div className="card">
        <h2>Envoyer</h2>
        <label htmlFor="to">Adresse du destinataire</label>
        <input id="to" autoComplete="off" autoCapitalize="none" spellCheck={false} value={sendTo} onChange={(e) => setSendTo(e.target.value.trim())} />
        <label htmlFor="amt">Montant (sats)</label>
        <input id="amt" inputMode="numeric" value={sendAmount} onChange={(e) => setSendAmount(e.target.value.replace(/\D/g, ""))} />
        <p className="muted">Frais réseau : environ 2 sats par octet virtuel.</p>
        <button disabled={busy || !sendTo || !sendAmount} onClick={send}>{busy ? "Envoi…" : "Envoyer"}</button>
      </div>

      <div className="card">
        <h2>Sauvegarde</h2>
        {showSeed && mnemonic ? (
          <>
            <ol className="words">
              {mnemonic.split(" ").map((w, i) => (
                <li key={i}><span>{i + 1}.</span>{w}</li>
              ))}
            </ol>
            <button className="secondary" onClick={() => setShowSeed(false)}>Masquer</button>
          </>
        ) : (
          <button className="secondary" onClick={() => setShowSeed(true)}>Afficher ma phrase de récupération</button>
        )}
      </div>
    </main>
  );
}
