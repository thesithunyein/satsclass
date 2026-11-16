import { broadcast, ChainError } from "@/lib/chain";
import { rateLimit } from "@/lib/kv";
import { clientIp, isValidTxHex, serverNetwork } from "@/lib/server-validate";
import { completeMission, getRoster, isCode, isLearnerId } from "@/lib/classroom";
import * as bitcoin from "bitcoinjs-lib";

/** Addresses this transaction pays to, decoded from the signed hex (not trusted from the client). */
function outputAddresses(hex: string): string[] {
  try {
    return bitcoin.Transaction.fromHex(hex).outs.flatMap((o) => {
      try {
        return [bitcoin.address.fromOutputScript(o.script, serverNetwork())];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

// Relays an already-signed transaction. The server never sees keys, only the signed hex.
export async function POST(req: Request) {
  if (!(await rateLimit(`broadcast:${clientIp(req)}`, 30, 60_000))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  let hex: unknown;
  let classCode: unknown;
  let learnerId: unknown;
  try {
    ({ hex, classCode, learnerId } = await req.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!isValidTxHex(hex)) return Response.json({ error: "invalid_tx" }, { status: 400 });

  try {
    const txid = await broadcast(hex);
    // "Send to a classmate" mission: completed only if the transaction really pays another learner in the class.
    const code = isCode(classCode) ? classCode : null;
    const me = isLearnerId(learnerId) ? learnerId : null;
    if (code && me) {
      const roster = await getRoster(code);
      if (roster[me]) {
        const outs = new Set(outputAddresses(hex));
        const paysClassmate = Object.entries(roster).some(([id, l]) => id !== me && outs.has(l.address));
        if (paysClassmate) await completeMission(code, me, "send");
      }
    }
    return Response.json({ txid });
  } catch (e) {
    const err = e instanceof ChainError ? e : new ChainError("node_unavailable");
    return Response.json({ error: err.message, detail: err.detail }, { status: err.status });
  }
}
