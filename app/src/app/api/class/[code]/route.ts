import { getClass, isCode } from "@/lib/classroom";

export const dynamic = "force-dynamic";

// Public: does this class exist, and what is it called?
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code?.toUpperCase();
  if (!isCode(code)) return Response.json({ error: "class_not_found" }, { status: 404 });
  const info = await getClass(code);
  if (!info) return Response.json({ error: "class_not_found" }, { status: 404 });
  return Response.json({ code, name: info.name });
}
