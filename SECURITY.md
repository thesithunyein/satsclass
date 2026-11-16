# Security policy

SatsClass is a learning wallet. It runs on **test networks only** (signet and regtest), and its sats have no monetary value. It is not designed or audited to hold real bitcoin. Do not point it at mainnet.

## Reporting a vulnerability

Please report security issues **privately** through GitHub:
**[Report a vulnerability](https://github.com/thesithunyein/satsclass/security/advisories/new)**

Include what you found, how to reproduce it, and the impact you expect. Do not open a public issue for security problems.

You can expect an acknowledgement within 3 days and a status update within 10 days. Fixed issues are credited in the release notes unless you ask otherwise.

## Supported versions

Only the latest commit on `main` (deployed at [satsclass.vercel.app](https://satsclass.vercel.app)) receives fixes.

## Security model

### What we protect

| Asset | Where it lives | Protection |
|---|---|---|
| Learner seed and keys | Learner's browser only | Generated with the browser's CSPRNG; encrypted at rest with AES-GCM; key derived from the PIN with PBKDF2-SHA256 (210,000 rounds); never sent to the server |
| Faucet key | Server environment (`FAUCET_MNEMONIC`) | Sensitive env var, read only by the faucet route; practice sats only |
| Bitcoin Core RPC credentials | Server environment | Never exposed to the browser |
| Rate-limit state | Upstash Redis / process memory | Short-lived counters; no personal data |

### Design choices

- **No custody.** The server has no endpoint that accepts a seed or private key. It sees addresses, unspent outputs and already-signed transactions only.
- **Signing on the device.** Transactions are built and signed in the browser with `bitcoinjs-lib`, and every signature is verified before broadcast.
- **Proven libraries.** `bitcoinjs-lib`, `bip32`, `bip39`, `@bitcoinerlab/secp256k1` and the Web Crypto API. No custom cryptography.
- **Input validation.** Addresses are checked against the configured network; raw transactions are checked for format and size before relay.
- **Abuse limits.** One faucet claim per address per day, ten per device per hour; a lock and a spent-output list prevent double-spends between concurrent claims; failed claims are refunded.
- **No personal data.** No accounts, emails, phone numbers or names. Logs never contain addresses.
- **Security headers.** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.

### Known limits

- **A 6-digit PIN is brute-forceable offline** if an attacker copies the browser's storage. This is acceptable only because funds have no value. A real-money wallet would need a stronger secret or hardware-backed keys.
- **Browser wallets inherit browser risk.** A malicious extension or a compromised device can read memory while the wallet is unlocked.
- **In-memory rate limits** (Docker mode without Redis) reset on restart and assume one server instance.
- **The faucet is a hot wallet.** Anyone with the server environment can spend practice sats. Keep the balance small.
