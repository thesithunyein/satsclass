import { looksLikeSeed } from "@/lib/seed-guard";
import { getAddressTxs, type TxSummary } from "@/lib/chain";
import { rateLimit } from "@/lib/kv";
import { clientIp, isValidAddress, serverNetName } from "@/lib/server-validate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
// First model the account can use wins. Free-tier AI Gateway accounts can't use every model,
// so we fall back to cheaper ones on 403. Set TUTOR_MODEL to pin one.
const MODELS = [
  process.env.TUTOR_MODEL,
  "anthropic/claude-haiku-5.5",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "deepseek/deepseek-v4-flash",
  "alibaba/qwen3.5-flash",
].filter((m): m is string => Boolean(m));
let workingModel: string | null = null; // remembered per warm instance
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
    `Keep answers under 70 words: one short paragraph, then at most 3 short bullet points. No headings.`,
    `The learner uses a self-custodial practice wallet on Bitcoin ${net} (a test network). Their sats have no money value.`,
    net === "signet"
      ? `On this practice network a new block arrives about every 30 seconds. On the real Bitcoin network it is about every 10 minutes. Say both when timing matters.`
      : `On this classroom network a new block arrives about every 10 seconds. On the real Bitcoin network it is about every 10 minutes.`,
    `Write plain text only: no markdown, no asterisks. For a list, start lines with "• ".`,
    `When the question is about their wallet, use their real data below and quote exact numbers per transaction (for example "your last send paid a 282 sat fee"). Never add numbers together unless asked.`,
    `If the learner has transactions and the question touches fees, sending, receiving, confirmations or balance, your FIRST sentence must name their own most relevant transaction with its exact numbers, e.g. "Your last send of 1000 sats paid a 282 sat fee." Then explain the idea.`,
    `Use comparisons from daily life (a market, a bus ticket, mobile money) only when they are accurate.`,
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

  const messages = [{ role: "system", content: systemPrompt(lang, serverNetName(), txs, balance) }, ...history, { role: "user", content: question }];
  const order = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : MODELS;
  try {
    for (const model of order) {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 400, messages }),
      });
      if (res.status === 403 || res.status === 404) {
        console.warn("tutor model unavailable", model, res.status);
        continue;
      }
      if (!res.ok) {
        console.error("tutor gateway status", model, res.status, (await res.text()).slice(0, 300));
        return Response.json({ error: "tutor_unavailable" }, { status: 502 });
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const answer = data.choices?.[0]?.message?.content?.trim();
      if (!answer) return Response.json({ error: "tutor_unavailable" }, { status: 502 });
      workingModel = model;
      return Response.json({ answer });
    }
    return Response.json({ error: "tutor_unavailable" }, { status: 502 });
  } catch {
    return Response.json({ error: "tutor_unavailable" }, { status: 502 });
  }
}
