import { rpc } from "@/lib/rpc";
import { clientIp, isValidAddress, rateLimit, releaseRateLimit } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

const WALLET = process.env.FAUCET_WALLET ?? "faucet";
const AMOUNT_BTC = Number(process.env.FAUCET_AMOUNT_BTC ?? "0.001");

// Day 1 faucet: one claim per address, and at most 10 claims per device/IP per hour.
// Day 2 replaces this with session-scoped claims (one per learner per class session).
export async function POST(req: Request) {
  let address: unknown;
  try {
    ({ address } = await req.json());
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!isValidAddress(address)) return Response.json({ error: "Adresse invalide" }, { status: 400 });

  if (!(AMOUNT_BTC > 0 && AMOUNT_BTC <= 0.01)) {
    return Response.json({ error: "Faucet mal configuré" }, { status: 500 });
  }
  const ipKey = `faucet:ip:${clientIp(req)}`;
  const addrKey = `faucet:addr:${address}`;
  if (!rateLimit(ipKey, 10, 3600_000)) {
    return Response.json({ error: "Limite atteinte pour cet appareil, réessayez plus tard" }, { status: 429 });
  }
  if (!rateLimit(addrKey, 1, 24 * 3600_000)) {
    releaseRateLimit(ipKey);
    return Response.json({ error: "Cette adresse a déjà reçu ses sats de test" }, { status: 429 });
  }

  try {
    const txid = await rpc<string>("sendtoaddress", [address, AMOUNT_BTC], WALLET);
    return Response.json({ txid, sats: Math.round(AMOUNT_BTC * 1e8) });
  } catch {
    // Don't burn the learner's one claim if the faucet itself failed.
    releaseRateLimit(ipKey);
    releaseRateLimit(addrKey);
    return Response.json({ error: "Le faucet de la classe est vide ou indisponible" }, { status: 502 });
  }
}
