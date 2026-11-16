import { completeMission, getLearner, isCode, isLearnerId } from "@/lib/classroom";
import { getUtxos } from "@/lib/chain";

export const dynamic = "force-dynamic";

// GET: a learner's own mission status.
// POST "backup": the learner re-typed 3 words from their phrase.
// POST "claim": verified on-chain. Done if the learner's joined address already holds sats
// (covers wallets that got sats before joining the class). Send is recorded on broadcast.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code?.toUpperCase();
  const id = new URL(req.url).searchParams.get("learner");
  if (!isCode(code) || !isLearnerId(id)) return Response.json({ error: "invalid_request" }, { status: 400 });
  const learner = await getLearner(code, id);
  if (!learner) return Response.json({ error: "not_joined" }, { status: 404 });
  return Response.json({ missions: learner.missions });
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code?.toUpperCase();
  let body: { learnerId?: unknown; mission?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  if (!isCode(code) || !isLearnerId(body.learnerId) || (body.mission !== "backup" && body.mission !== "claim")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (body.mission === "claim") {
    const learner = await getLearner(code, body.learnerId);
    if (!learner) return Response.json({ error: "not_joined" }, { status: 404 });
    try {
      const sats = (await getUtxos(learner.address)).reduce((s, u) => s + u.value, 0);
      if (sats <= 0) return Response.json({ error: "not_funded" }, { status: 400 });
    } catch {
      return Response.json({ error: "node_unavailable" }, { status: 502 });
    }
  }
  await completeMission(code, body.learnerId, body.mission);
  return Response.json({ ok: true });
}
