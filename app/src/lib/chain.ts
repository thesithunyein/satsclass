import "server-only";
import { rpc, RpcError } from "./rpc";

// Two interchangeable chain backends:
//  - "core":    our own Bitcoin Core node over JSON-RPC (Docker / regtest, one-command setup for judges)
//  - "esplora": a public Esplora HTTP API, e.g. Mutinynet signet (serverless hosting such as Vercel)
export type Backend = "core" | "esplora";
export const backend: Backend = process.env.CHAIN_BACKEND === "esplora" ? "esplora" : "core";
const ESPLORA = (process.env.ESPLORA_URL ?? "https://mutinynet.com/api").replace(/\/+$/, "");

export type Utxo = { txid: string; vout: number; value: number; confirmed: boolean };

export class ChainError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function esploraFetch(path: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    return await fetch(`${ESPLORA}${path}`, { ...init, signal: ctrl.signal, cache: "no-store" });
  } catch {
    throw new ChainError("Explorateur Bitcoin injoignable");
  } finally {
    clearTimeout(t);
  }
}

/** All spendable outputs of one address (confirmed and, on Esplora, unconfirmed). */
export async function getUtxos(address: string): Promise<Utxo[]> {
  if (backend === "esplora") {
    const res = await esploraFetch(`/address/${encodeURIComponent(address)}/utxo`);
    if (!res.ok) throw new ChainError("Explorateur Bitcoin indisponible");
    const list = (await res.json()) as { txid: string; vout: number; value: number; status: { confirmed: boolean } }[];
    return list.map((u) => ({ txid: u.txid, vout: u.vout, value: u.value, confirmed: u.status.confirmed }));
  }

  // Bitcoin Core: scan the UTXO set (confirmed only). One scan at a time per node, so retry briefly.
  type Scan = { unspents: { txid: string; vout: number; amount: number }[] };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await rpc<Scan>("scantxoutset", ["start", [{ desc: `addr(${address})` }]]);
      return r.unspents.map((u) => ({ txid: u.txid, vout: u.vout, value: Math.round(u.amount * 1e8), confirmed: true }));
    } catch (e) {
      if (e instanceof RpcError && /in progress/i.test(e.message)) {
        await sleep(300 + attempt * 200);
        continue;
      }
      throw new ChainError("Nœud Bitcoin indisponible");
    }
  }
  throw new ChainError("Nœud occupé, réessayez", 503);
}

/** Relay a signed transaction. Returns its txid. */
export async function broadcast(hex: string): Promise<string> {
  if (backend === "esplora") {
    const res = await esploraFetch("/tx", { method: "POST", body: hex, headers: { "Content-Type": "text/plain" } });
    const text = (await res.text()).trim();
    if (!res.ok) throw new ChainError(`Transaction refusée : ${text.slice(0, 200)}`, 400);
    return text;
  }
  try {
    return await rpc<string>("sendrawtransaction", [hex]);
  } catch (e) {
    throw new ChainError(`Transaction refusée : ${e instanceof RpcError ? e.message : "nœud indisponible"}`, 400);
  }
}
