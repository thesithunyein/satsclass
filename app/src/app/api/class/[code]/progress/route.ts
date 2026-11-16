import { getLearner, isCode, isLearnerId } from "@/lib/classroom";
import { completeMission } from "@/lib/classroom";

export const dynamic = "force-dynamic";

// GET: a learner's own mission status. POST: mark the backup mission done
// (claim and send are recorded server-side when they actually happen).
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
  if (!isCode(code) || !isLearnerId(body.learnerId) || body.mission !== "backup") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  await completeMission(code, body.learnerId, "backup");
  return Response.json({ ok: true });
}
