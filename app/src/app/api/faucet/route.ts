import { backend, broadcast, getUtxos } from "@/lib/chain";
import { acquireLock, getJson, rateLimit, releaseRateLimit, setJson } from "@/lib/kv";
import { rpc } from "@/lib/rpc";
import { clientIp, isValidAddress, serverNetName } from "@/lib/server-validate";
import { buildSend, deriveAccount } from "@/lib/wallet";

export const dynamic = "force-dynamic";

const AMOUNT_BTC = Number(process.env.FAUCET_AMOUNT_BTC ?? "0.001");
const SATS = Math.round(AMOUNT_BTC * 1e8);
const CORE_WALLET = process.env.FAUCET_WALLET ?? "faucet";
const FAUCET_MNEMONIC = process.env.FAUCET_MNEMONIC ?? "";
const SPENT_KEY = "faucet:spent";

type Outpoint = `${string}:${number}`;

/** Esplora backend: the faucet is a server-side wallet whose seed lives only in an env var. */
async function sendFromHotWallet(to: string): Promise<string> {
  if (!FAUCET_MNEMONIC) throw new Error("FAUCET_MNEMONIC not set");
  const release = await acquireLock("faucet");
  if (!release) throw new Error("faucet busy");
  try {
    const net = serverNetName();
    const { address } = deriveAccount(FAUCET_MNEMONIC, net);
    // Skip outputs we spent in the last few minutes that the explorer may not have indexed yet.
    const spent = new Set((await getJson<Outpoint[]>(SPENT_KEY)) ?? []);
    const utxos = (await getUtxos(address)).filter((u) => !spent.has(`${u.txid}:${u.vout}`));
    const tx = buildSend(FAUCET_MNEMONIC, net, utxos, to, SATS, 2);
    const txid = await broadcast(tx.hex);
    const next = [...spent, ...tx.inputs.map((u) => `${u.txid}:${u.vout}` as Outpoint)].slice(-200);
    await setJson(SPENT_KEY, next, 10 * 60_000);
    return txid;
  } finally {
    await release();
  }
}

// One claim per address (24 h) and at most 10 claims per IP per hour.
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
  if (!(await rateLimit(ipKey, 10, 3600_000))) {
    return Response.json({ error: "Limite atteinte pour cet appareil, réessayez plus tard" }, { status: 429 });
  }
  if (!(await rateLimit(addrKey, 1, 24 * 3600_000))) {
    await releaseRateLimit(ipKey);
    return Response.json({ error: "Cette adresse a déjà reçu ses sats de test" }, { status: 429 });
  }

  try {
    const txid = backend === "esplora" ? await sendFromHotWallet(address) : await rpc<string>("sendtoaddress", [address, AMOUNT_BTC], CORE_WALLET);
    return Response.json({ txid, sats: SATS });
  } catch (e) {
    console.error("faucet error:", e instanceof Error ? e.message : "unknown"); // no address/PII logged
    // Don't burn the learner's one claim if the faucet itself failed.
    await releaseRateLimit(ipKey);
    await releaseRateLimit(addrKey);
    return Response.json({ error: "Le faucet de la classe est vide ou occupé, réessayez dans un instant" }, { status: 502 });
  }
}
