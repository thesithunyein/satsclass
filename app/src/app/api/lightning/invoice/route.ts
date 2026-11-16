import { rateLimit } from "@/lib/kv";
import { ensureLightningReady, lightningConfigured, shopInvoice } from "@/lib/lightning";
import { clientIp } from "@/lib/server-validate";
import { CAFE_PRICE } from "@/lib/ln-ledger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The shop node issues a fresh invoice. First call also sets up the class↔shop channel.
export async function POST(req: Request) {
  if (!lightningConfigured()) return Response.json({ error: "ln_not_configured" }, { status: 404 });
  if (!(await rateLimit(`ln:invoice:${clientIp(req)}`, 30, 60_000))) return Response.json({ error: "rate_limited" }, { status: 429 });
  try {
    await ensureLightningReady();
    return Response.json(await shopInvoice(CAFE_PRICE, "Café Touba"));
  } catch (e) {
    console.error("ln invoice", e instanceof Error ? e.message : e);
    return Response.json({ error: "ln_unavailable" }, { status: 502 });
  }
}
