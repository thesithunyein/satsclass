// Generates a new faucet wallet for the Esplora/Vercel backend (signet / Mutinynet).
// Usage (inside app/ after `npm install`):  npm run faucet:new
// Put the printed mnemonic in the FAUCET_MNEMONIC env var (never commit it),
// then fund the printed address from https://faucet.mutinynet.com
import { Buffer } from "buffer";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { BIP32Factory } from "bip32";
import * as bip39 from "bip39";

const bip32 = BIP32Factory(ecc);
const network = bitcoin.networks.testnet; // signet uses tb1 addresses
const mnemonic = process.argv[2] ?? bip39.generateMnemonic(128);
if (!bip39.validateMnemonic(mnemonic)) throw new Error("Invalid mnemonic");

const node = bip32.fromSeed(Buffer.from(bip39.mnemonicToSeedSync(mnemonic)), network).derivePath("m/84'/1'/0'/0/0");
const { address } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(node.publicKey), network });

console.log("FAUCET_MNEMONIC=" + JSON.stringify(mnemonic));
console.log("Faucet address (fund this): " + address);
