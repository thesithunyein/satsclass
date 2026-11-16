import "server-only";
import { readFileSync } from "node:fs";
import https from "node:https";
import { rpc } from "./rpc";

// Real Lightning payments between two LND nodes on the classroom chain:
//  - the CLASS node holds learners' practice Lightning balances and pays invoices
//  - the SHOP node issues invoices for the "buy a café Touba" mission
// Talks to LND over its REST API with TLS pinned to each node's own certificate.

type Node = { url: string; cert: Buffer; macaroon: string };

function loadNode(prefix: "LND" | "SHOP_LND"): Node | null {
  const url = process.env[`${prefix}_REST_URL`];
  const certPath = process.env[`${prefix}_TLS_CERT_PATH`];
  const macPath = process.env[`${prefix}_MACAROON_PATH`];
  if (!url || !certPath || !macPath) return null;
  try {
    return { url: url.replace(/\/+$/, ""), cert: readFileSync(certPath), macaroon: readFileSync(macPath).toString("hex") };
  } catch {
    return null;
  }
}

export const lightningConfigured = () => Boolean(process.env.LND_REST_URL && process.env.SHOP_LND_REST_URL);

export class LightningError extends Error {}

function lnd<T>(node: Node, method: "GET" | "POST", path: string, body?: unknown, timeoutMs = 20_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const u = new URL(node.url + path);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        ca: node.cert,
        headers: { "Grpc-Metadata-macaroon": node.macaroon, "Content-Type": "application/json" },
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          // /v2/router/send streams one JSON object per line; keep the last complete one.
          const lines = data.trim().split("\n").filter(Boolean);
          let parsed: unknown = {};
          try {
            parsed = lines.length ? JSON.parse(lines[lines.length - 1]) : {};
          } catch {
            return reject(new LightningError("ln_bad_response"));
          }
          if ((res.statusCode ?? 500) >= 400) {
            const msg = (parsed as { message?: string; error?: { message?: string } }).message ?? (parsed as { error?: { message?: string } }).error?.message;
            return reject(new LightningError(msg ?? `HTTP ${res.statusCode}`));
          }
          resolve(parsed as T);
        });
      },
    );
    req.on("timeout", () => req.destroy(new LightningError("ln_timeout")));
    req.on("error", (e) => reject(e instanceof LightningError ? e : new LightningError("ln_unreachable")));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function nodes(): { cls: Node; shop: Node } {
  const cls = loadNode("LND");
  const shop = loadNode("SHOP_LND");
  if (!cls || !shop) throw new LightningError("ln_not_configured");
  return { cls, shop };
}

type Info = { identity_pubkey: string; synced_to_chain: boolean };
type Channel = { remote_pubkey: string; active: boolean; local_balance: string };

let ready = false;
let preparing: Promise<void> | null = null;

/**
 * One-time setup on the regtest classroom chain: fund the class node from the faucet wallet,
 * connect to the shop node and open a 1,000,000 sat channel. Safe to call repeatedly.
 */
export function ensureLightningReady(): Promise<void> {
  if (ready) return Promise.resolve();
  if (!preparing) preparing = prepare().finally(() => (preparing = null));
  return preparing;
}

async function prepare(): Promise<void> {
  const { cls, shop } = nodes();
  const [clsInfo, shopInfo] = await Promise.all([lnd<Info>(cls, "GET", "/v1/getinfo"), lnd<Info>(shop, "GET", "/v1/getinfo")]);

  const channels = (await lnd<{ channels?: Channel[] }>(cls, "GET", "/v1/channels")).channels ?? [];
  if (channels.some((c) => c.remote_pubkey === shopInfo.identity_pubkey && c.active)) {
    ready = true;
    return;
  }

  const minerAddr = await rpc<string>("getnewaddress", [], process.env.FAUCET_WALLET ?? "faucet");
  const mine = (n: number) => rpc<string[]>("generatetoaddress", [n, minerAddr]);

  // Fund the class node's on-chain wallet if needed.
  const bal = await lnd<{ confirmed_balance?: string }>(cls, "GET", "/v1/balance/blockchain");
  if (Number(bal.confirmed_balance ?? 0) < 1_100_000) {
    const { address } = await lnd<{ address: string }>(cls, "GET", "/v1/newaddress");
    await rpc<string>("sendtoaddress", [address, 0.05], process.env.FAUCET_WALLET ?? "faucet");
    await mine(6);
    for (let i = 0; i < 30; i++) {
      const b = await lnd<{ confirmed_balance?: string }>(cls, "GET", "/v1/balance/blockchain");
      if (Number(b.confirmed_balance ?? 0) >= 1_100_000) break;
      await sleep(1000);
    }
  }

  // Connect to the shop (ignore "already connected").
  const shopHost = process.env.SHOP_LND_P2P_HOST ?? "lnd-shop:9735";
  await lnd(cls, "POST", "/v1/peers", { addr: { pubkey: shopInfo.identity_pubkey, host: shopHost }, perm: true }).catch(() => undefined);

  const pending = await lnd<{ pending_open_channels?: { channel?: { remote_node_pub?: string } }[] }>(cls, "GET", "/v1/channels/pending");
  const alreadyOpening = (pending.pending_open_channels ?? []).some((p) => p.channel?.remote_node_pub === shopInfo.identity_pubkey);
  if (!alreadyOpening) {
    await lnd(cls, "POST", "/v1/channels", {
      node_pubkey: Buffer.from(shopInfo.identity_pubkey, "hex").toString("base64"),
      local_funding_amount: "1000000",
      private: false,
    });
  }
  await mine(6);

  for (let i = 0; i < 40; i++) {
    const ch = (await lnd<{ channels?: Channel[] }>(cls, "GET", "/v1/channels")).channels ?? [];
    if (ch.some((c) => c.remote_pubkey === shopInfo.identity_pubkey && c.active)) {
      ready = true;
      return;
    }
    if (i % 5 === 4) await mine(1);
    await sleep(1000);
  }
  void clsInfo;
  throw new LightningError("ln_channel_not_ready");
}

export type Invoice = { paymentRequest: string; amount: number; memo: string; expiresIn: number };

/** The shop issues a fresh invoice for one practice café Touba. */
export async function shopInvoice(amount: number, memo: string): Promise<Invoice> {
  const { shop } = nodes();
  const r = await lnd<{ payment_request: string }>(shop, "POST", "/v1/invoices", { value: String(amount), memo, expiry: "600" });
  return { paymentRequest: r.payment_request, amount, memo, expiresIn: 600 };
}

export type Decoded = { destination: string; amount: number; memo: string; expired: boolean };

export async function decode(paymentRequest: string): Promise<Decoded> {
  const { cls } = nodes();
  const d = await lnd<{ destination: string; num_satoshis: string; description: string; timestamp: string; expiry: string }>(
    cls,
    "GET",
    `/v1/payreq/${encodeURIComponent(paymentRequest)}`,
  );
  const expiresAt = (Number(d.timestamp) + Number(d.expiry)) * 1000;
  return { destination: d.destination, amount: Number(d.num_satoshis), memo: d.description, expired: Date.now() > expiresAt };
}

export async function shopPubkey(): Promise<string> {
  const { shop } = nodes();
  return (await lnd<Info>(shop, "GET", "/v1/getinfo")).identity_pubkey;
}

export type Paid = { preimage: string; feeSat: number; ms: number; hops: number };

/** Pay an invoice from the class node. Returns the preimage: the receipt that proves payment. */
export async function pay(paymentRequest: string): Promise<Paid> {
  const { cls } = nodes();
  const started = Date.now();
  type Update = { result?: { status?: string; payment_preimage?: string; fee_sat?: string; failure_reason?: string; htlcs?: { route?: { hops?: unknown[] } }[] } };
  const u = await lnd<Update>(cls, "POST", "/v2/router/send", { payment_request: paymentRequest, timeout_seconds: 30, fee_limit_sat: "50" }, 40_000);
  const r = u.result;
  if (r?.status !== "SUCCEEDED" || !r.payment_preimage) throw new LightningError(r?.failure_reason ?? "ln_payment_failed");
  const hops = r.htlcs?.[r.htlcs.length - 1]?.route?.hops?.length ?? 1;
  return { preimage: r.payment_preimage, feeSat: Number(r.fee_sat ?? 0), ms: Date.now() - started, hops };
}
