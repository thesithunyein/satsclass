import { backend } from "@/lib/chain";
import { serverNetName } from "@/lib/server-validate";

export const dynamic = "force-dynamic";

// Public block explorer for "View" links. Mutinynet by default on the Esplora backend; none on local regtest.
const EXPLORER = (process.env.EXPLORER_URL ?? (backend === "esplora" ? "https://mutinynet.com" : "")).replace(/\/+$/, "");

export function GET() {
  return Response.json({ network: serverNetName(), explorer: EXPLORER || null });
}
