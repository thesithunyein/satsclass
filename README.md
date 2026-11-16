<div align="center">

<img src="app/public/icon.svg" width="112" alt="SatsClass mascot: a sat-coin in a graduation cap" />

# SatsClass

**Your first bitcoin, the safe way.**
A real self-custodial wallet on your phone, with practice money, built for Bitcoin classes and meetups.

[![Live](https://img.shields.io/badge/live-satsclass.vercel.app-101735?style=flat-square)](https://satsclass.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-F7931A?style=flat-square)](LICENSE)
[![Network](https://img.shields.io/badge/network-signet%20%7C%20regtest-5A6178?style=flat-square)](#networks)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](app/tsconfig.json)
[![bitcoinjs-lib](https://img.shields.io/badge/bitcoinjs--lib-6-F7931A?style=flat-square&logo=bitcoin&logoColor=white)](https://github.com/bitcoinjs/bitcoinjs-lib)
[![Languages](https://img.shields.io/badge/languages-English%20%7C%20Fran%C3%A7ais-0F7A55?style=flat-square)](app/src/lib/i18n.ts)

[Live app](https://satsclass.vercel.app) · [How it works](#how-it-works) · [Run it](#run-it) · [Security](SECURITY.md)

</div>

---

## Why

Most people meet Bitcoin through a custodial exchange app. They never hold a key, never back up a seed, never see a fee. When they finally try self-custody with real money, one mistake costs them.

In classrooms it's worse: a teacher can't ask 30 students to risk real sats, so the lesson stays on the whiteboard.

**SatsClass lets everyone do the real thing with practice money.** Each learner gets a self-custodial wallet in the browser, receives sats from the class faucet, backs up a recovery phrase, and sends a real transaction on a test network. Nothing to install, no account, no personal data.

## Features

| | |
|---|---|
| **Self-custody from minute one** | Keys are generated and used only in the browser. The server never sees a seed or a private key. |
| **Practice money** | Runs on signet (Mutinynet) or a private regtest chain. Sats have no value, so mistakes are free. |
| **Class faucet** | One tap gives each learner 10,000 practice sats. One claim per address, rate-limited per device. |
| **Real transactions** | Native SegWit (BIP84). The browser selects coins, signs, and the server only relays the signed hex. |
| **Encrypted on the phone** | The recovery phrase is stored with AES-GCM, keyed from a 6-digit PIN through PBKDF2 (210,000 rounds). |
| **Built for real classrooms** | Mobile-first, works on slow networks, plain words, English and French. |
| **Classroom mode** | A teacher opens `/teach`, students scan one QR code and pick a nickname. Three missions (get sats, back up, send to a classmate) show up live on the teacher's board. |
| **Ask Sats, the AI tutor** | Answers beginner questions in English or French using the learner's own practice transactions (amounts, fees, confirmations). Pasted recovery phrases are blocked before they reach the model. |
| **One-command setup** | `docker compose up` starts Bitcoin Core, LND, a block miner and the app. |

## How it works

### Architecture

```mermaid
flowchart LR
  subgraph Phone["Learner's phone (browser)"]
    UI["SatsClass web app"]
    W["Wallet core<br/>BIP39 · BIP84 · PSBT signing"]
    V[("Encrypted vault<br/>AES-GCM + PBKDF2")]
    UI --> W
    W <--> V
  end

  subgraph Server["SatsClass server (Next.js API)"]
    API["/api/chain · /api/faucet · /api/config"]
    RL[("Rate limits + faucet lock<br/>Upstash Redis")]
    FW["Faucet wallet<br/>(server key, practice sats only)"]
    API <--> RL
    API --> FW
  end

  subgraph Chain["Bitcoin test network"]
    direction TB
    ESP["Esplora API<br/>(Mutinynet signet)"]
    CORE["Bitcoin Core<br/>(regtest, Docker)"]
  end

  UI -- "address, signed tx hex" --> API
  API -- "UTXOs, broadcast" --> ESP
  API -. "Docker mode" .-> CORE

  classDef key fill:#FFE7CC,stroke:#F7931A,color:#101735
  classDef srv fill:#E7EAF6,stroke:#1E2A5A,color:#101735
  class W,V key
  class API,RL,FW srv
```

The trust boundary is the browser. Anything that can move a learner's sats (the seed, the keys, the signature) is created and used there. The server handles public data only: addresses, unspent outputs and already-signed transactions.

### Sending sats

```mermaid
sequenceDiagram
  autonumber
  actor L as Learner
  participant B as Browser wallet
  participant S as SatsClass API
  participant N as Test network

  L->>B: Enter address + amount
  B->>S: GET /api/chain/utxos?address=…
  S->>N: Look up unspent outputs
  N-->>S: UTXOs
  S-->>B: UTXOs, confirmed + pending
  Note over B: Coin selection, fee estimate,<br/>PSBT built and signed locally
  B->>S: POST /api/chain/broadcast { signed hex }
  S->>N: Relay transaction
  N-->>S: txid
  S-->>B: txid
  B-->>L: "Sent 1,000 sats" + explorer link
```

### Claiming from the class faucet

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser wallet
  participant S as Faucet API
  participant R as Redis
  participant N as Test network

  B->>S: POST /api/faucet { address }
  S->>S: Validate address and network
  S->>R: INCR device counter, INCR address counter
  alt already claimed or over limit
    S-->>B: 429 faucet_already_claimed
  else allowed
    S->>R: SET faucet lock NX PX
    S->>N: Fetch faucet UTXOs (skip recently spent)
    S->>S: Build and sign with faucet key
    S->>N: Broadcast
    S->>R: Record spent outputs, release lock
    S-->>B: 200 { txid, sats }
  end
```

The lock and the spent-output list stop two simultaneous claims from spending the same coins. If the faucet fails, the learner's claim is refunded.

## Run it

### Option A: everything local, one command (regtest)

Requirements: Docker with Compose v2.

```bash
git clone https://github.com/thesithunyein/satsclass
cd satsclass
cp .env.example .env          # set BTC_RPC_PASS to a long random string
docker compose up --build
```

Open <http://localhost:3000>, or `http://<your-computer-ip>:3000` from phones on the same Wi-Fi.

| Service | What it does |
|---|---|
| `bitcoind` | Bitcoin Core 29 on regtest, a private chain for the class |
| `seed` | Funds the faucet wallet, then mines a block every 10 seconds |
| `lnd` | LND class node, for Lightning lessons |
| `app` | The web app on port 3000 |

### Option B: hosted on Vercel (signet)

Vercel can't run a Bitcoin node, so the hosted app uses the **Esplora** backend against [Mutinynet](https://mutinynet.com), a public signet with ~30-second blocks.

1. Import the repo in Vercel and set **Root Directory** to `app`.
2. Add **Upstash Redis** from the Vercel Marketplace.
3. Create a faucet wallet (`npm run faucet:new` in `app/`, or create one in the app) and fund it at [faucet.mutinynet.com](https://faucet.mutinynet.com).
4. Set the environment variables below and deploy.

<a id="networks"></a>

### Configuration

| Variable | Docker (regtest) | Vercel (signet) | Notes |
|---|---|---|---|
| `CHAIN_BACKEND` | `core` | `esplora` | Own node vs. public explorer API |
| `BTC_NETWORK` | `regtest` | `signet` | Address format and derivation network |
| `ESPLORA_URL` | | `https://mutinynet.com/api` | Esplora-compatible API |
| `FAUCET_AMOUNT_BTC` | `0.001` | `0.0001` | Per claim, capped at 0.01 |
| `FAUCET_MNEMONIC` | | 12 words | **Secret.** Mark as Sensitive. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | | from Upstash | Shared rate limits and lock |
| `BTC_RPC_URL` / `_USER` / `_PASS` | set in Compose | | Bitcoin Core RPC |
| `EXPLORER_URL` | | optional | Defaults to Mutinynet on Esplora |
| `TUTOR_MODEL` | | optional | Pin an AI Gateway model; otherwise the first allowed model is used |
| `AI_GATEWAY_API_KEY` | | optional | Only needed outside Vercel; on Vercel the project's OIDC token is used |

## Project structure

```
satsclass/
├── app/                      Next.js app (UI + API)
│   ├── src/app/              page, layout, styles, API routes
│   │   └── api/              config · chain/utxos · chain/broadcast · faucet
│   ├── src/lib/              wallet (keys, PSBT), vault (encryption), chain backends,
│   │                         kv (Redis/memory), validation, i18n
│   ├── src/components/       logo, illustration, icon set
│   └── scripts/              faucet wallet generator
├── scripts/seed.sh           regtest funding + block miner
└── docker-compose.yml        bitcoind · lnd · seed · app
```

## Security

Practice networks only. The full threat model, known limits and how to report a vulnerability are in [SECURITY.md](SECURITY.md).

## Roadmap

- [x] Self-custodial browser wallet (create, restore, receive, send)
- [x] Class faucet with shared rate limits
- [x] Regtest Docker stack and hosted signet deployment
- [x] English and French
- [x] Teacher sessions: join a class by QR code
- [x] Guided missions with a seed backup check
- [x] Live class progress board for teachers
- [ ] Lightning mission (pay an invoice)
- [x] Plain-language AI tutor that explains your own transactions
- [ ] More languages, reviewed by native speakers

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) first.

## License

[MIT](LICENSE) © Sithu Nyein
