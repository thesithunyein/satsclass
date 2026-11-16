import { getClass, getRoster, isCode, MISSIONS, tokenMatches } from "@/lib/classroom";
import { lightningConfigured } from "@/lib/lightning";

export const dynamic = "force-dynamic";

// Teacher-only live board. Requires the teacher token from class creation.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code?.toUpperCase();
  if (!isCode(code)) return Response.json({ error: "class_not_found" }, { status: 404 });
  const info = await getClass(code);
  if (!info) return Response.json({ error: "class_not_found" }, { status: 404 });
  if (!tokenMatches(info, req.headers.get("x-teacher-token"))) return Response.json({ error: "forbidden" }, { status: 403 });

  const learners = Object.values(await getRoster(code))
    .map((l) => ({ nickname: l.nickname, joinedAt: l.joinedAt, missions: l.missions }))
    .sort((a, b) => a.joinedAt - b.joinedAt);
  const done = (m: (typeof MISSIONS)[number]) => learners.filter((l) => l.missions[m]).length;
  return Response.json({
    name: info.name,
    learners,
    totals: { joined: learners.length, claim: done("claim"), backup: done("backup"), send: done("send"), lightning: done("lightning") },
    lightning: lightningConfigured(),
  });
}
