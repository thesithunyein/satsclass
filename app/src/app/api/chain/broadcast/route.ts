import { rpc, RpcError } from "@/lib/rpc";
import { clientIp, isValidTxHex, rateLimit } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

// Relays an already-signed transaction. The server never sees keys, only the signed hex.
export async function POST(req: Request) {
  if (!rateLimit(`broadcast:${clientIp(req)}`, 30, 60_000)) {
    return Response.json({ error: "Trop de requêtes, réessayez dans une minute" }, { status: 429 });
  }
  let hex: unknown;
  try {
    ({ hex } = await req.json());
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!isValidTxHex(hex)) return Response.json({ error: "Transaction invalide" }, { status: 400 });

  try {
    const txid = await rpc<string>("sendrawtransaction", [hex]);
    return Response.json({ txid });
  } catch (e) {
    const msg = e instanceof RpcError ? e.message : "Nœud Bitcoin indisponible";
    return Response.json({ error: `Transaction refusée : ${msg}` }, { status: 400 });
  }
}
