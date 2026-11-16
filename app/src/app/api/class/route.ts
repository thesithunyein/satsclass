import { cleanName, createClass } from "@/lib/classroom";
import { rateLimit } from "@/lib/kv";
import { clientIp } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

// Teacher creates a class. Returns the join code and a secret teacher token (shown once, kept on the teacher's device).
export async function POST(req: Request) {
  if (!(await rateLimit(`class:create:${clientIp(req)}`, 10, 3600_000))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  let name: string | null = null;
  try {
    name = cleanName((await req.json()).name, 40);
  } catch {}
  if (!name) return Response.json({ error: "class_name" }, { status: 400 });
  try {
    return Response.json(await createClass(name));
  } catch {
    return Response.json({ error: "node_busy" }, { status: 503 });
  }
}
