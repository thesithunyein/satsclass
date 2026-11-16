"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "fr";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

const en = {
  loading: "Loading…",
  tagline: "Learn Bitcoin by doing, with test money. Zero risk.",
  welcome: "Welcome",
  welcomeBody: "Your wallet is created on this phone. Nobody else holds your keys, not even SatsClass.",
  createWallet: "Create my wallet",
  haveSeed: "I already have a recovery phrase",
  restoreTitle: "Restore",
  restoreLabel: "Your 12 words, separated by spaces",
  restore: "Restore",
  back: "Back",
  seedTitle: "Your recovery phrase",
  seedWarn: "Write these 12 words on paper, in order. Anyone who knows them controls your bitcoin. Don't photograph them.",
  wroteThem: "I wrote them down",
  pinTitle: "Choose a PIN",
  pinSub: "It protects your wallet on this phone.",
  pinLabel: "PIN (6 digits)",
  pinConfirm: "Confirm PIN",
  encrypting: "Encrypting…",
  continue: "Continue",
  pin: "PIN",
  opening: "Opening…",
  openWallet: "Open my wallet",
  forgetWallet: "Forget this wallet",
  forgetConfirm: "Remove the wallet from this phone? Without your 12 words, the sats will be lost.",
  myWallet: "My wallet",
  lock: "Lock",
  networkLine: (net: string) => `Test network: ${net === "regtest" ? "classroom (regtest)" : "signet"}. These sats have no real value.`,
  confirmedBalance: "Confirmed balance",
  pendingLine: (s: string) => `+ ${s} sats waiting for confirmation`,
  refresh: "Refresh",
  getTestSats: "Get my test sats",
  receive: "Receive",
  yourAddress: "Your address",
  copyAddress: "Copy address",
  copied: "Address copied",
  send: "Send",
  recipient: "Recipient address",
  amountSats: "Amount (sats)",
  feeNote: "Network fee: about 2 sats per virtual byte.",
  sending: "Sending…",
  backup: "Backup",
  showSeed: "Show my recovery phrase",
  hide: "Hide",
  faucetOk: (s: string) => `${s} sats on the way! They'll show up after the next block.`,
  sentOk: (fee: string, id: string) => `Sent! Network fee paid: ${fee} sats. ID: ${id}…`,
  enterAmount: "Enter an amount in sats (whole number)",
  addressHelp: "Invalid address. Check that it starts with bcrt1 (classroom) or tb1 (signet).",
  err: {
    pin_digits: "The PIN must be 6 digits",
    pin_mismatch: "The two PINs don't match",
    bad_seed: "Invalid phrase. Check the spelling and the order of the 12 words.",
    no_wallet: "No wallet on this device",
    wrong_pin: "Wrong PIN",
    min_amount: "Minimum amount: 546 sats",
    invalid_address: "Invalid address for this network",
    insufficient_funds: "Not enough funds (fee included)",
    invalid_signature: "Invalid signature",
    invalid_request: "Invalid request",
    invalid_tx: "Invalid transaction",
    rate_limited: "Too many requests, try again in a minute",
    node_unavailable: "Bitcoin network unreachable, try again",
    node_busy: "Network busy, try again",
    tx_rejected: "Transaction rejected by the network",
    faucet_misconfigured: "Faucet is misconfigured",
    faucet_ip_limit: "Limit reached for this device, try again later",
    faucet_already_claimed: "This address already received its test sats",
    faucet_unavailable: "The class faucet is empty or busy, try again in a moment",
    server_unreachable: "Server unreachable",
    network: "Network error, try again",
  },
};

export type Dict = typeof en;

const fr: Dict = {
  loading: "Chargement…",
  tagline: "Apprenez Bitcoin en pratiquant, avec de l'argent de test. Aucun risque.",
  welcome: "Bienvenue",
  welcomeBody: "Votre portefeuille est créé sur ce téléphone. Personne d'autre ne détient vos clés, pas même SatsClass.",
  createWallet: "Créer mon portefeuille",
  haveSeed: "J'ai déjà une phrase de récupération",
  restoreTitle: "Restaurer",
  restoreLabel: "Vos 12 mots, séparés par des espaces",
  restore: "Restaurer",
  back: "Retour",
  seedTitle: "Votre phrase de récupération",
  seedWarn: "Écrivez ces 12 mots sur papier, dans l'ordre. Quiconque les connaît contrôle vos bitcoins. Ne les photographiez pas.",
  wroteThem: "Je les ai écrits",
  pinTitle: "Choisissez un code PIN",
  pinSub: "Il protège votre portefeuille sur ce téléphone.",
  pinLabel: "Code PIN (6 chiffres)",
  pinConfirm: "Confirmez le code PIN",
  encrypting: "Chiffrement…",
  continue: "Continuer",
  pin: "Code PIN",
  opening: "Ouverture…",
  openWallet: "Ouvrir mon portefeuille",
  forgetWallet: "Oublier ce portefeuille",
  forgetConfirm: "Supprimer le portefeuille de ce téléphone ? Sans votre phrase de 12 mots, les sats seront perdus.",
  myWallet: "Mon portefeuille",
  lock: "Verrouiller",
  networkLine: (net: string) => `Réseau de test : ${net === "regtest" ? "classe (regtest)" : "signet"}. Ces sats n'ont pas de valeur réelle.`,
  confirmedBalance: "Solde confirmé",
  pendingLine: (s: string) => `+ ${s} sats en attente de confirmation`,
  refresh: "Actualiser",
  getTestSats: "Recevoir mes sats de test",
  receive: "Recevoir",
  yourAddress: "Votre adresse",
  copyAddress: "Copier l'adresse",
  copied: "Adresse copiée",
  send: "Envoyer",
  recipient: "Adresse du destinataire",
  amountSats: "Montant (sats)",
  feeNote: "Frais réseau : environ 2 sats par octet virtuel.",
  sending: "Envoi…",
  backup: "Sauvegarde",
  showSeed: "Afficher ma phrase de récupération",
  hide: "Masquer",
  faucetOk: (s: string) => `${s} sats en route ! Ils apparaîtront après le prochain bloc.`,
  sentOk: (fee: string, id: string) => `Envoyé ! Frais payés : ${fee} sats. Identifiant : ${id}…`,
  enterAmount: "Entrez un montant en sats (nombre entier)",
  addressHelp: "Adresse invalide. Vérifiez qu'elle commence par bcrt1 (classe) ou tb1 (signet).",
  err: {
    pin_digits: "Le code PIN doit contenir 6 chiffres",
    pin_mismatch: "Les deux codes PIN ne sont pas identiques",
    bad_seed: "Phrase invalide. Vérifiez l'orthographe et l'ordre des 12 mots.",
    no_wallet: "Aucun portefeuille sur cet appareil",
    wrong_pin: "Code PIN incorrect",
    min_amount: "Montant minimum : 546 sats",
    invalid_address: "Adresse invalide pour ce réseau",
    insufficient_funds: "Solde insuffisant (frais compris)",
    invalid_signature: "Signature invalide",
    invalid_request: "Requête invalide",
    invalid_tx: "Transaction invalide",
    rate_limited: "Trop de requêtes, réessayez dans une minute",
    node_unavailable: "Réseau Bitcoin injoignable, réessayez",
    node_busy: "Réseau occupé, réessayez",
    tx_rejected: "Transaction refusée par le réseau",
    faucet_misconfigured: "Faucet mal configuré",
    faucet_ip_limit: "Limite atteinte pour cet appareil, réessayez plus tard",
    faucet_already_claimed: "Cette adresse a déjà reçu ses sats de test",
    faucet_unavailable: "Le faucet de la classe est vide ou occupé, réessayez dans un instant",
    server_unreachable: "Serveur injoignable",
    network: "Erreur réseau, réessayez",
  },
};

const DICTS: Record<Lang, Dict> = { en, fr };
const KEY = "satsclass.lang";

/** English by default; remembers the learner's choice on this device. */
export function useLang(): [Lang, (l: Lang) => void, Dict] {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "en" || saved === "fr") setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  };
  return [lang, setLang, DICTS[lang]];
}

/** Translate an error code (from the API or the wallet) into the current language. */
export function errText(t: Dict, codeOrMessage: string): string {
  return (t.err as Record<string, string>)[codeOrMessage] ?? t.err.network;
}
