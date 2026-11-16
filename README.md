# SatsClass

**A hands-on Bitcoin classroom.** A teacher shows one QR code; every student gets a real self-custodial wallet on their own phone, test sats, guided missions in French, and an AI tutor that explains their own transactions. Built for Dakar Bitcoin Hack 2026.

> Status: Day 1 of 5 (wallet + classroom chain). Test networks only: no real money.

## Quick start

Requirements: Docker Desktop (or Docker Engine with Compose v2).

```bash
cp .env.example .env        # then set BTC_RPC_PASS to a long random string
docker compose up --build
```

Open http://localhost:3000 on your computer, or `http://<your-LAN-IP>:3000` on a phone on the same Wi-Fi.

What starts:

| Service | What it does |
| --- | --- |
| `bitcoind` | Bitcoin Core 29 on **regtest** (the private classroom chain) |
| `seed` | Creates the class faucet wallet, mines 101 blocks to fund it, then mines 1 block every `BLOCK_INTERVAL` seconds |
| `lnd` | LND v0.21.8 class Lightning node (used from mission 5) |
| `app` | Next.js web app on port 3000 |

### Run the app outside Docker (faster UI work)

```bash
docker compose up bitcoind seed      # chain only
cd app && npm install
BTC_RPC_URL=http://127.0.0.1:18443 BTC_RPC_USER=satsclass BTC_RPC_PASS=... npm run dev
```

For this, add `ports: ["18443:18443"]` under `bitcoind` in `docker-compose.yml`.

## Day 1 happy path

1. **Créer mon portefeuille** → write down the 12 words → choose a 6-digit PIN.
2. **Recevoir mes sats de test** → 100,000 sats arrive after the next block (≈10 s).
3. **Envoyer** → paste a classmate's `bcrt1…` address, enter an amount, send.
4. **Verrouiller**, then unlock with the PIN; or restore from the 12 words on another device.

## Architecture

```
Learner's phone (browser)            Teacher's laptop
  - seed generated + kept here          - session, QR, live board (Day 2-3)
  - signs transactions locally
        │  address, signed tx hex            │
        ▼                                    ▼
             SatsClass server (Next.js API)
               - never receives seeds or keys
               - rate limits + input validation
        │ scantxoutset / sendrawtransaction    │ faucet (sendtoaddress)
        ▼                                      ▼
   Bitcoin Core (regtest / signet)  ◄──  LND class node
```

- **Wallet:** BIP39 12 words → BIP84 native SegWit (`m/84'/1'/0'/0/0`), built with `bitcoinjs-lib`, `bip32`, `bip39` and `@bitcoinerlab/secp256k1`, all in the browser.
- **Seed at rest:** encrypted in `localStorage` with AES-GCM; key derived from the PIN with PBKDF2-SHA256 (210,000 iterations).
- **Balances:** the server reads confirmed UTXOs for one address with Bitcoin Core's `scantxoutset`, so learners need no server-side wallet.
- **Sending:** the browser builds and signs the transaction; the server only relays the signed hex with `sendrawtransaction`.

## Security notes (full threat model on Day 4)

- Keys never leave the device; the server has no endpoint that accepts a seed or private key.
- All inputs validated server-side (address format + network, tx hex shape and size).
- Faucet: one claim per address and at most 10 per IP per hour; claim is refunded if the faucet fails.
- RPC credentials live only in server environment variables.
- Known limits: a 6-digit PIN is weak against an attacker who copies the browser storage; acceptable for valueless test sats, documented as a constraint. The in-memory rate limiter assumes a single server instance.

## Constraints

- Regtest/signet only. Balances show **confirmed** funds only (a block every ~10 s on the class chain).
- One receive address per wallet (simplicity for beginners).

## Roadmap (this hackathon)

- **Day 2:** teacher sessions + QR join, mission 1 (claim), mission 2 (forced seed-restore check), mission 3 (send to a classmate).
- **Day 3:** mission 4 (explorer + confirmations), mission 5 (Lightning invoice), teacher live board, AI tutor in French.
- **Day 4:** UX pass for low-end phones and slow 3G, `THREAT_MODEL.md`, live signet deployment.
- **Day 5:** demo video and submission.

## License

MIT
