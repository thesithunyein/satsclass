import * as bip39 from "bip39";
import { getAddressTxs, type TxSummary } from "@/lib/chain";
import { rateLimit } from "@/lib/kv";
import { clientIp, isValidAddress, serverNetName } from "@/lib/server-validate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL = process.env.TUTOR_MODEL ?? "anthropic/claude-haiku-5.5";
const WORDS = new Set(bip39.wordlists.english);

/** Looks like someone pasted their recovery phrase: 8+ BIP39 words in a row-ish. Never send that to an AI. */
function looksLikeSeed(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let run = 0;
  let best = 0;
  for (const w of words) {
    run = WORDS.has(w) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best >= 8;
}

function systemPrompt(lang: "en" | "fr", net: string, txs: TxSummary[], balance: number | null): string {
  const language = lang === "fr" ? "French" : "English";
  const txLines = txs.length
    ? txs
        .map(
          (t, i) =>
            `${i + 1}. ${t.direction === "in" ? "received" : t.direction === "out" ? "sent" : "moved to self"} ${t.amount} sats, ` +
            `fee ${t.fee} sats (${t.vsize} vbytes, ${t.feeRate} sat/vB), ${t.confirmations} confirmations, txid ${t.txid.slice(0, 10)}…`,
        )
        .join("\n")
    : "No transactions yet.";
  return [
    `You are the SatsClass tutor: a patient Bitcoin teacher for complete beginners in a classroom.`,
    `Always answer in ${language}. Use short sentences and everyday words. Explain any technical word you use.`,
    `Keep answers under 110 words. Use at most 3 short bullet points. No headings.`,
    `The learner uses a self-custodial practice wallet on Bitcoin ${net} (a test network). Their sats have no money value.`,
    `When the question is about their wallet, use their real data below and refer to their actual numbers.`,
    `Rules: never ask for or accept a recovery phrase, PIN or private key. If they mention sharing their 12 words, tell them to never share them.`,
    `Stay on Bitcoin, Lightning, wallets and money basics. For anything else, gently bring them back to Bitcoin.`,
    `Do not give investment or price advice.`,
    ``,
    `Learner's wallet:`,
    `Balance: ${balance ?? "unknown"} sats`,
    `Recent transactions (newest first):`,
    txLines,
  ].join("\n");
}

export async function POST(req: Request) {
  if (!(await rateLimit(`tutor:${clientIp(req)}`, 30, 3600_000))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { question?: unknown; lang?: unknown; address?: unknown; balance?: unknown; history?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!question) return Response.json({ error: "invalid_request" }, { status: 400 });
  const lang = body.lang === "fr" ? "fr" : "en";

  // Protect learners from themselves: a pasted seed never leaves this server.
  if (looksLikeSeed(question)) return Response.json({ error: "tutor_seed" }, { status: 400 });

  const token = process.env.AI_GATEWAY_API_KEY ?? req.headers.get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) return Response.json({ error: "tutor_unavailable" }, { status: 503 });

  // Ground the answer in the learner's own public on-chain data (address only; no keys).
  let txs: TxSummary[] = [];
  if (isValidAddress(body.address)) {
    try {
      txs = await getAddressTxs(body.address);
    } catch {}
  }
  const balance = typeof body.balance === "number" && Number.isFinite(body.balance) ? Math.max(0, Math.round(body.balance)) : null;

  // Short memory of the conversation: last 4 turns, trimmed.
  const history = Array.isArray(body.history)
    ? (body.history as { role?: unknown; content?: unknown }[])
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-8)
        .map((m) => ({ role: m.role as "user" | "assistant", content: (m.content as string).slice(0, 800) }))
        .filter((m) => m.role !== "user" || !looksLikeSeed(m.content))
    : [];

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "system", content: systemPrompt(lang, serverNetName(), txs, balance) }, ...history, { role: "user", content: question }],
      }),
    });
    if (!res.ok) {
      console.error("tutor gateway status", res.status, (await res.text()).slice(0, 300));
      return Response.json({ error: "tutor_unavailable" }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return Response.json({ error: "tutor_unavailable" }, { status: 502 });
    return Response.json({ answer });
  } catch {
    return Response.json({ error: "tutor_unavailable" }, { status: 502 });
  }
}
