import { getJson, setJson } from "@/lib/kv";
import { lightningConfigured } from "@/lib/lightning";
import { isValidAddress } from "@/lib/server-validate";
import { LN_START_BALANCE, LN_TTL_MS, lnBalanceKey } from "@/lib/ln-ledger";

export const dynamic = "force-dynamic";


/** Learner's practice Lightning balance, held by the class node. 5,000 sats on first visit. */
export async function GET(req: Request) {
  if (!lightningConfigured()) return Response.json({ enabled: false });
  const address = new URL(req.url).searchParams.get("address");
  if (!isValidAddress(address)) return Response.json({ error: "invalid_address" }, { status: 400 });
  let balance = await getJson<number>(lnBalanceKey(address));
  if (balance === null) {
    balance = LN_START_BALANCE;
    await setJson(lnBalanceKey(address), balance, LN_TTL_MS);
  }
  return Response.json({ enabled: true, balance });
}
