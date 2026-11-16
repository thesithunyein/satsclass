# Contributing to SatsClass

Thanks for helping people take their first steps with Bitcoin.

## Ways to help

- **Translate.** Native speakers are the most valuable contributors. Add a language in `app/src/lib/i18n.ts`; keep sentences short and plain.
- **Test in a real class.** Run a session and open an issue with what confused learners.
- **Fix bugs and polish the UI.** Check the open issues first.
- **Review security.** See [SECURITY.md](SECURITY.md) for how to report privately.

## Development

```bash
git clone https://github.com/thesithunyein/satsclass
cd satsclass
cp .env.example .env
docker compose up bitcoind seed           # chain only
cd app && npm install
BTC_RPC_URL=http://127.0.0.1:18443 BTC_RPC_USER=satsclass BTC_RPC_PASS=... npm run dev
```

To reach Bitcoin Core from your machine, add `ports: ["18443:18443"]` under `bitcoind` in `docker-compose.yml`.

Before opening a pull request:

```bash
npm run typecheck
npm run build
```

## Guidelines

- **Keys never leave the browser.** Pull requests that send a seed, private key or PIN to the server will not be merged.
- **Use proven libraries** for anything cryptographic. No hand-rolled crypto.
- **Plain words in the UI.** Write for someone who has never used Bitcoin. Add every new string in both English and French.
- **Small pull requests** with a clear description of what changed and why.
- **Commit messages** in the imperative mood: "Add Wolof translation", not "Added".

By contributing, you agree that your work is released under the [MIT License](LICENSE) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
