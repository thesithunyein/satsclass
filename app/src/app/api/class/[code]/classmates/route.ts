import { getRoster, isCode, isLearnerId } from "@/lib/classroom";

export const dynamic = "force-dynamic";

// Nicknames and practice addresses of other learners in the class, for the "send to a classmate" mission.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code?.toUpperCase();
  const me = new URL(req.url).searchParams.get("learner");
  if (!isCode(code) || !isLearnerId(me)) return Response.json({ error: "invalid_request" }, { status: 400 });
  const roster = await getRoster(code);
  if (!roster[me]) return Response.json({ error: "not_joined" }, { status: 404 });
  const classmates = Object.entries(roster)
    .filter(([id]) => id !== me)
    .map(([, l]) => ({ nickname: l.nickname, address: l.address }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname))
    .slice(0, 100);
  return Response.json({ classmates });
}
