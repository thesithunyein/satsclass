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
  constructor(message: string, public status = 502, public detail?: string) {
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
    throw new ChainError("node_unavailable");
  } finally {
    clearTimeout(t);
  }
}

/** All spendable outputs of one address (confirmed and, on Esplora, unconfirmed). */
export async function getUtxos(address: string): Promise<Utxo[]> {
  if (backend === "esplora") {
    const res = await esploraFetch(`/address/${encodeURIComponent(address)}/utxo`);
    if (!res.ok) throw new ChainError("node_unavailable");
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
      throw new ChainError("node_unavailable");
    }
  }
  throw new ChainError("node_busy", 503);
}

export type TxSummary = {
  txid: string;
  direction: "in" | "out" | "self";
  amount: number; // sats received (in) or sent to others (out)
  fee: number;
  vsize: number;
  feeRate: number; // sat/vB
  confirmations: number;
};

/** Recent transactions for one address, summarized from the address's point of view (Esplora only). */
export async function getAddressTxs(address: string, limit = 5): Promise<TxSummary[]> {
  if (backend !== "esplora") return [];
  type ETx = {
    txid: string;
    fee: number;
    weight: number;
    status: { confirmed: boolean; block_height?: number };
    vin: { prevout?: { scriptpubkey_address?: string; value: number } }[];
    vout: { scriptpubkey_address?: string; value: number }[];
  };
  const [txRes, tipRes] = await Promise.all([esploraFetch(`/address/${encodeURIComponent(address)}/txs`), esploraFetch("/blocks/tip/height")]);
  if (!txRes.ok || !tipRes.ok) throw new ChainError("node_unavailable");
  const txs = ((await txRes.json()) as ETx[]).slice(0, limit);
  const tip = Number(await tipRes.text());
  return txs.map((tx) => {
    const fromMe = tx.vin.reduce((s, i) => s + (i.prevout?.scriptpubkey_address === address ? i.prevout.value : 0), 0);
    const toMe = tx.vout.reduce((s, o) => s + (o.scriptpubkey_address === address ? o.value : 0), 0);
    const toOthers = tx.vout.reduce((s, o) => s + (o.scriptpubkey_address !== address ? o.value : 0), 0);
    const vsize = Math.ceil(tx.weight / 4);
    const direction: TxSummary["direction"] = fromMe === 0 ? "in" : toOthers === 0 ? "self" : "out";
    return {
      txid: tx.txid,
      direction,
      amount: direction === "in" ? toMe : toOthers,
      fee: tx.fee,
      vsize,
      feeRate: Math.round((tx.fee / vsize) * 10) / 10,
      confirmations: tx.status.confirmed && tx.status.block_height ? tip - tx.status.block_height + 1 : 0,
    };
  });
}

/** Relay a signed transaction. Returns its txid. */
export async function broadcast(hex: string): Promise<string> {
  if (backend === "esplora") {
    const res = await esploraFetch("/tx", { method: "POST", body: hex, headers: { "Content-Type": "text/plain" } });
    const text = (await res.text()).trim();
    if (!res.ok) throw new ChainError("tx_rejected", 400, text.slice(0, 200));
    return text;
  }
  try {
    return await rpc<string>("sendrawtransaction", [hex]);
  } catch (e) {
    throw new ChainError("tx_rejected", 400, e instanceof RpcError ? e.message : undefined);
  }
}
