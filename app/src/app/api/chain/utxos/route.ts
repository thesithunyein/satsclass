import { ChainError, getUtxos } from "@/lib/chain";
import { rateLimit } from "@/lib/kv";
import { clientIp, isValidAddress } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  if (!isValidAddress(address)) return Response.json({ error: "invalid_address" }, { status: 400 });
  if (!(await rateLimit(`utxos:${clientIp(req)}`, 120, 60_000))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    const all = await getUtxos(address);
    const utxos = all.map(({ txid, vout, value }) => ({ txid, vout, value }));
    const balance = all.filter((u) => u.confirmed).reduce((s, u) => s + u.value, 0);
    const pending = all.filter((u) => !u.confirmed).reduce((s, u) => s + u.value, 0);
    return Response.json({ utxos, balance, pending });
  } catch (e) {
    const err = e instanceof ChainError ? e : new ChainError("node_unavailable");
    return Response.json({ error: err.message, detail: err.detail }, { status: err.status });
  }
}
