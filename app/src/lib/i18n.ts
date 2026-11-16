"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "fr";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

const en = {
  loading: "Loading",
  // welcome
  heroTitle: "Your first bitcoin, the safe way.",
  heroSub: "A real wallet on your phone. Practice money. Learn by doing.",
  point1: "Your keys stay on this phone",
  point2: "Practice money, zero risk",
  point3: "Works on slow networks",
  createWallet: "Create wallet",
  restoreWallet: "I have a recovery phrase",
  // restore
  restoreTitle: "Restore wallet",
  restoreSub: "Type your 12 words in order.",
  restoreLabel: "Recovery phrase",
  restore: "Restore",
  back: "Back",
  // backup
  seedTitle: "Write these words down",
  seedSub: "On paper, in order. They are the only way back into your wallet.",
  seedWarn: "Anyone with these words can take your bitcoin. Never share or photograph them.",
  wroteThem: "I wrote them down",
  // pin
  pinTitle: "Set a PIN",
  pinSub: "Six digits to open your wallet on this phone.",
  pinLabel: "PIN",
  pinConfirm: "Repeat PIN",
  continue: "Continue",
  working: "One moment",
  // unlock
  welcomeBack: "Welcome back",
  unlockSub: "Enter your PIN.",
  unlock: "Unlock",
  forgetWallet: "Remove wallet from this phone",
  forgetConfirm: "Remove this wallet? You'll need your 12 words to get it back.",
  // wallet
  practice: "Practice network",
  balance: "Balance",
  confirming: (s: string) => `${s} confirming`,
  receive: "Receive",
  send: "Send",
  getSats: "Get sats",
  lock: "Lock",
  refresh: "Refresh",
  // receive sheet
  receiveTitle: "Receive",
  receiveSub: "Share this code or address.",
  copy: "Copy address",
  copied: "Address copied",
  // send sheet
  sendTitle: "Send",
  to: "To",
  toPlaceholder: "Paste an address",
  amount: "Amount",
  available: (s: string) => `Available: ${s} sats`,
  fee: "Network fee is about 300 sats.",
  sendNow: "Send",
  sending: "Sending",
  // settings
  security: "Security",
  showPhrase: "Show recovery phrase",
  hidePhrase: "Hide recovery phrase",
  // results
  faucetOk: (s: string) => `${s} sats are on the way.`,
  sentOk: (s: string) => `Sent ${s} sats.`,
  viewTx: "View",
  enterAmount: "Enter an amount in sats.",
  addressHelp: "That address doesn't look right. Check it and try again.",
  err: {
    pin_digits: "Use 6 digits.",
    pin_mismatch: "PINs don't match.",
    bad_seed: "Those words don't match a wallet. Check spelling and order.",
    no_wallet: "No wallet on this phone.",
    wrong_pin: "Wrong PIN.",
    min_amount: "Send at least 546 sats.",
    invalid_address: "That address doesn't look right.",
    insufficient_funds: "Not enough sats, including the fee.",
    invalid_signature: "Couldn't sign. Try again.",
    invalid_request: "Something went wrong. Try again.",
    invalid_tx: "Couldn't build the transaction.",
    rate_limited: "Too many tries. Wait a minute.",
    node_unavailable: "Can't reach the network. Try again.",
    node_busy: "Network busy. Try again.",
    tx_rejected: "The network refused this payment.",
    faucet_misconfigured: "Sats are unavailable right now.",
    faucet_ip_limit: "Limit reached on this device. Try later.",
    faucet_already_claimed: "You already got your sats.",
    faucet_unavailable: "Sats are unavailable right now. Try again soon.",
    faucet_self: "This wallet can't receive practice sats.",
    server_unreachable: "Can't connect. Check your internet.",
    network: "Connection problem. Try again.",
  },
};

export type Dict = typeof en;

const fr: Dict = {
  loading: "Chargement",
  heroTitle: "Votre premier bitcoin, en toute sécurité.",
  heroSub: "Un vrai portefeuille sur votre téléphone. De l'argent d'entraînement. On apprend en pratiquant.",
  point1: "Vos clés restent sur ce téléphone",
  point2: "Argent d'entraînement, zéro risque",
  point3: "Fonctionne avec une connexion lente",
  createWallet: "Créer un portefeuille",
  restoreWallet: "J'ai une phrase de récupération",
  restoreTitle: "Restaurer",
  restoreSub: "Saisissez vos 12 mots dans l'ordre.",
  restoreLabel: "Phrase de récupération",
  restore: "Restaurer",
  back: "Retour",
  seedTitle: "Notez ces mots",
  seedSub: "Sur papier, dans l'ordre. C'est le seul moyen de retrouver votre portefeuille.",
  seedWarn: "Quiconque a ces mots peut prendre vos bitcoins. Ne les partagez et ne les photographiez jamais.",
  wroteThem: "Je les ai notés",
  pinTitle: "Choisissez un code",
  pinSub: "Six chiffres pour ouvrir votre portefeuille sur ce téléphone.",
  pinLabel: "Code",
  pinConfirm: "Répétez le code",
  continue: "Continuer",
  working: "Un instant",
  welcomeBack: "Bon retour",
  unlockSub: "Entrez votre code.",
  unlock: "Ouvrir",
  forgetWallet: "Retirer le portefeuille de ce téléphone",
  forgetConfirm: "Retirer ce portefeuille ? Il faudra vos 12 mots pour le retrouver.",
  practice: "Réseau d'entraînement",
  balance: "Solde",
  confirming: (s: string) => `${s} en confirmation`,
  receive: "Recevoir",
  send: "Envoyer",
  getSats: "Obtenir des sats",
  lock: "Verrouiller",
  refresh: "Actualiser",
  receiveTitle: "Recevoir",
  receiveSub: "Partagez ce code ou cette adresse.",
  copy: "Copier l'adresse",
  copied: "Adresse copiée",
  sendTitle: "Envoyer",
  to: "À",
  toPlaceholder: "Collez une adresse",
  amount: "Montant",
  available: (s: string) => `Disponible : ${s} sats`,
  fee: "Les frais réseau sont d'environ 300 sats.",
  sendNow: "Envoyer",
  sending: "Envoi",
  security: "Sécurité",
  showPhrase: "Afficher la phrase de récupération",
  hidePhrase: "Masquer la phrase de récupération",
  faucetOk: (s: string) => `${s} sats sont en route.`,
  sentOk: (s: string) => `${s} sats envoyés.`,
  viewTx: "Voir",
  enterAmount: "Entrez un montant en sats.",
  addressHelp: "Cette adresse semble incorrecte. Vérifiez-la.",
  err: {
    pin_digits: "Utilisez 6 chiffres.",
    pin_mismatch: "Les codes ne correspondent pas.",
    bad_seed: "Ces mots ne correspondent à aucun portefeuille. Vérifiez l'orthographe et l'ordre.",
    no_wallet: "Aucun portefeuille sur ce téléphone.",
    wrong_pin: "Code incorrect.",
    min_amount: "Envoyez au moins 546 sats.",
    invalid_address: "Cette adresse semble incorrecte.",
    insufficient_funds: "Pas assez de sats, frais compris.",
    invalid_signature: "Signature impossible. Réessayez.",
    invalid_request: "Un problème est survenu. Réessayez.",
    invalid_tx: "Transaction impossible à créer.",
    rate_limited: "Trop d'essais. Attendez une minute.",
    node_unavailable: "Réseau injoignable. Réessayez.",
    node_busy: "Réseau occupé. Réessayez.",
    tx_rejected: "Le réseau a refusé ce paiement.",
    faucet_misconfigured: "Sats indisponibles pour le moment.",
    faucet_ip_limit: "Limite atteinte sur cet appareil. Réessayez plus tard.",
    faucet_already_claimed: "Vous avez déjà reçu vos sats.",
    faucet_unavailable: "Sats indisponibles pour le moment. Réessayez bientôt.",
    faucet_self: "Ce portefeuille ne peut pas recevoir de sats d'entraînement.",
    server_unreachable: "Connexion impossible. Vérifiez internet.",
    network: "Problème de connexion. Réessayez.",
  },
};

const DICTS: Record<Lang, Dict> = { en, fr };
const KEY = "satsclass.lang";

/** English by default; remembers the choice on this device. */
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

export function errText(t: Dict, code: string): string {
  return (t.err as Record<string, string>)[code] ?? t.err.network;
}
