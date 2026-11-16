import { rpc, RpcError } from "@/lib/rpc";
import { clientIp, isValidAddress, rateLimit } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

type ScanResult = {
  success: boolean;
  total_amount: number;
  unspents: { txid: string; vout: number; amount: number; height: number }[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Reads confirmed UTXOs for one address with `scantxoutset`, so the node needs no wallet for learners.
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  if (!isValidAddress(address)) return Response.json({ error: "Adresse invalide" }, { status: 400 });
  if (!rateLimit(`utxos:${clientIp(req)}`, 120, 60_000)) {
    return Response.json({ error: "Trop de requêtes, réessayez dans une minute" }, { status: 429 });
  }

  // Only one scan can run at a time on the node; retry briefly if another learner's scan is running.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await rpc<ScanResult>("scantxoutset", ["start", [{ desc: `addr(${address})` }]]);
      const utxos = r.unspents.map((u) => ({ txid: u.txid, vout: u.vout, value: Math.round(u.amount * 1e8) }));
      const balance = utxos.reduce((s, u) => s + u.value, 0);
      return Response.json({ utxos, balance });
    } catch (e) {
      if (e instanceof RpcError && /in progress/i.test(e.message)) {
        await sleep(300 + attempt * 200);
        continue;
      }
      return Response.json({ error: "Nœud Bitcoin indisponible" }, { status: 502 });
    }
  }
  return Response.json({ error: "Nœud occupé, réessayez" }, { status: 503 });
}
