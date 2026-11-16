import { serverNetName } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ network: serverNetName() });
}
