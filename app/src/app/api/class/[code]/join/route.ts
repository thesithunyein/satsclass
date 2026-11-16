import { cleanName, getClass, getLearner, isCode, isLearnerId, saveLearner } from "@/lib/classroom";
import { rateLimit } from "@/lib/kv";
import { clientIp, isValidAddress } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

// Learner joins (or re-joins) a class with a nickname and their wallet address. No personal data.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code?.toUpperCase();
  if (!isCode(code) || !(await getClass(code))) return Response.json({ error: "class_not_found" }, { status: 404 });
  if (!(await rateLimit(`class:join:${clientIp(req)}`, 60, 60_000))) return Response.json({ error: "rate_limited" }, { status: 429 });

  let body: { learnerId?: unknown; nickname?: unknown; address?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  const nickname = cleanName(body.nickname);
  if (!isLearnerId(body.learnerId) || !nickname) return Response.json({ error: "invalid_request" }, { status: 400 });
  if (!isValidAddress(body.address)) return Response.json({ error: "invalid_address" }, { status: 400 });

  const existing = await getLearner(code, body.learnerId);
  await saveLearner(code, body.learnerId, {
    nickname,
    address: body.address,
    joinedAt: existing?.joinedAt ?? Date.now(),
    missions: existing?.missions ?? {},
  });
  return Response.json({ ok: true, missions: existing?.missions ?? {} });
}
