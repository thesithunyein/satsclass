import { completeMission, getLearner, isCode, isLearnerId } from "@/lib/classroom";
import { acquireLock, getJson, rateLimit, setJson } from "@/lib/kv";
import { decode, lightningConfigured, pay, shopPubkey } from "@/lib/lightning";
import { clientIp, isValidAddress } from "@/lib/server-validate";
import { LN_START_BALANCE, LN_TTL_MS, lnBalanceKey } from "@/lib/ln-ledger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pays a SHOP invoice from the learner's practice Lightning balance over a real channel.
// Only the classroom shop's invoices are accepted, so the class node can't be drained to outside nodes.
export async function POST(req: Request) {
  if (!lightningConfigured()) return Response.json({ error: "ln_not_configured" }, { status: 404 });
  if (!(await rateLimit(`ln:pay:${clientIp(req)}`, 20, 60_000))) return Response.json({ error: "rate_limited" }, { status: 429 });

  let body: { address?: unknown; paymentRequest?: unknown; classCode?: unknown; learnerId?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  const { address, paymentRequest } = body;
  if (!isValidAddress(address)) return Response.json({ error: "invalid_address" }, { status: 400 });
  if (typeof paymentRequest !== "string" || !/^ln[a-z0-9]{20,1500}$/i.test(paymentRequest)) {
    return Response.json({ error: "ln_bad_invoice" }, { status: 400 });
  }

  const release = await acquireLock(`ln:${address}`, 60_000, 5_000);
  if (!release) return Response.json({ error: "node_busy" }, { status: 503 });
  try {
    const [inv, shop] = await Promise.all([decode(paymentRequest), shopPubkey()]);
    if (inv.destination !== shop) return Response.json({ error: "ln_bad_invoice" }, { status: 400 });
    if (inv.expired) return Response.json({ error: "ln_expired" }, { status: 400 });

    const balance = (await getJson<number>(lnBalanceKey(address))) ?? LN_START_BALANCE;
    if (inv.amount <= 0 || inv.amount > balance) return Response.json({ error: "insufficient_funds" }, { status: 400 });

    const paid = await pay(paymentRequest);
    const left = balance - inv.amount - paid.feeSat;
    await setJson(lnBalanceKey(address), left, LN_TTL_MS);

    if (isCode(body.classCode) && isLearnerId(body.learnerId)) {
      const learner = await getLearner(body.classCode, body.learnerId);
      if (learner?.address === address) await completeMission(body.classCode, body.learnerId, "lightning");
    }
    return Response.json({ ...paid, amount: inv.amount, balance: left });
  } catch (e) {
    console.error("ln pay", e instanceof Error ? e.message : e);
    return Response.json({ error: "ln_payment_failed" }, { status: 502 });
  } finally {
    await release();
  }
}
