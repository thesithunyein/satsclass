import "server-only";

// Minimal JSON-RPC client for Bitcoin Core. Server-side only: credentials never reach the browser.
const RPC_URL = process.env.BTC_RPC_URL ?? "http://127.0.0.1:18443";
const RPC_USER = process.env.BTC_RPC_USER ?? "";
const RPC_PASS = process.env.BTC_RPC_PASS ?? "";

export class RpcError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
  }
}

export async function rpc<T>(method: string, params: unknown[] = [], wallet?: string): Promise<T> {
  const url = wallet ? `${RPC_URL}/wallet/${encodeURIComponent(wallet)}` : RPC_URL;
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ jsonrpc: "1.0", id: "satsclass", method, params }),
    cache: "no-store",
  });

  // Bitcoin Core returns HTTP 500 with a JSON body for RPC errors, so parse before checking status.
  let body: { result: T; error: { code: number; message: string } | null };
  try {
    body = await res.json();
  } catch {
    throw new RpcError(`Bitcoin node unreachable (HTTP ${res.status})`);
  }
  if (body.error) throw new RpcError(body.error.message, body.error.code);
  return body.result;
}
