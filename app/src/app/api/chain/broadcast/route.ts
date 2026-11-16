import { broadcast, ChainError } from "@/lib/chain";
import { rateLimit } from "@/lib/kv";
import { clientIp, isValidTxHex } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

// Relays an already-signed transaction. The server never sees keys, only the signed hex.
export async function POST(req: Request) {
  if (!(await rateLimit(`broadcast:${clientIp(req)}`, 30, 60_000))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  let hex: unknown;
  try {
    ({ hex } = await req.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!isValidTxHex(hex)) return Response.json({ error: "invalid_tx" }, { status: 400 });

  try {
    return Response.json({ txid: await broadcast(hex) });
  } catch (e) {
    const err = e instanceof ChainError ? e : new ChainError("node_unavailable");
    return Response.json({ error: err.message, detail: err.detail }, { status: err.status });
  }
}
