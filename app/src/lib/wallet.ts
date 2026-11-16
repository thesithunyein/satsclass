// Client-side wallet. Keys are generated and used ONLY in the browser.
import "./polyfill";
import { Buffer } from "buffer";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { BIP32Factory, type BIP32Interface } from "bip32";
import * as bip39 from "bip39";

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

export type NetName = "regtest" | "signet";
export type Utxo = { txid: string; vout: number; value: number };

// BIP84 native segwit, coin type 1 (all test networks), first receive address.
const PATH = "m/84'/1'/0'/0/0";
const DUST = 546;

export function network(net: NetName): bitcoin.Network {
  return net === "signet" ? bitcoin.networks.testnet : bitcoin.networks.regtest;
}

export function newMnemonic(): string {
  return bip39.generateMnemonic(128); // 12 words
}

export function isValidMnemonic(m: string): boolean {
  return bip39.validateMnemonic(normalizeMnemonic(m));
}

export function normalizeMnemonic(m: string): string {
  return m.trim().toLowerCase().split(/\s+/).join(" ");
}

type Account = { node: BIP32Interface; address: string; output: Buffer };

export function deriveAccount(mnemonic: string, net: NetName): Account {
  const nw = network(net);
  const seed = Buffer.from(bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic)));
  const node = bip32.fromSeed(seed, nw).derivePath(PATH);
  const pay = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(node.publicKey), network: nw });
  if (!pay.address || !pay.output) throw new Error("Could not derive address");
  return { node, address: pay.address, output: pay.output };
}

export function isValidAddress(address: string, net: NetName): boolean {
  try {
    bitcoin.address.toOutputScript(address.trim(), network(net));
    return true;
  } catch {
    return false;
  }
}

/** Approximate vsize of a P2WPKH-only transaction. */
function estimateVsize(inputs: number, outputs: number): number {
  return Math.ceil(10.5 + 68 * inputs + 31 * outputs);
}

export type BuiltTx = { hex: string; txid: string; fee: number; vsize: number; change: number };

/**
 * Build and sign a transaction sending `amount` sats to `to`, paying `feeRate` sat/vB.
 * Largest-first coin selection; change goes back to the learner's own address.
 */
export function buildSend(
  mnemonic: string,
  net: NetName,
  utxos: Utxo[],
  to: string,
  amount: number,
  feeRate = 2,
): BuiltTx {
  if (!Number.isInteger(amount) || amount < DUST) throw new Error(`Montant minimum : ${DUST} sats`);
  if (!isValidAddress(to, net)) throw new Error("Adresse invalide pour ce réseau");

  const { node, address, output } = deriveAccount(mnemonic, net);
  const nw = network(net);

  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const picked: Utxo[] = [];
  let total = 0;
  let fee = 0;
  for (const u of sorted) {
    picked.push(u);
    total += u.value;
    fee = estimateVsize(picked.length, 2) * feeRate;
    if (total >= amount + fee) break;
  }
  if (total < amount + fee) throw new Error("Solde insuffisant (frais compris)");

  let change = total - amount - fee;
  let outputs = 2;
  if (change < DUST) {
    // Too small to be worth an output: leave it to the miner as extra fee.
    outputs = 1;
    fee = total - amount;
    change = 0;
  }

  const psbt = new bitcoin.Psbt({ network: nw });
  for (const u of picked) {
    psbt.addInput({ hash: u.txid, index: u.vout, witnessUtxo: { script: output, value: u.value } });
  }
  psbt.addOutput({ address: to.trim(), value: amount });
  if (outputs === 2) psbt.addOutput({ address, value: change });

  psbt.signAllInputs(node);
  const ok = psbt.validateSignaturesOfAllInputs((pubkey, msghash, signature) => ecc.verify(msghash, pubkey, signature));
  if (!ok) throw new Error("Signature invalide");
  psbt.finalizeAllInputs();

  const tx = psbt.extractTransaction();
  return { hex: tx.toHex(), txid: tx.getId(), fee, vsize: tx.virtualSize(), change };
}
