import "server-only";

// Shared state for rate limits and the faucet lock.
// Uses Upstash Redis over REST when configured (needed on Vercel, where each request may hit a
// different short-lived instance); otherwise falls back to process memory (fine for one Docker container).
const URL_ = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const kvEnabled = Boolean(URL_ && TOKEN);

async function redis<T = unknown>(command: (string | number)[]): Promise<T> {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const body = (await res.json()) as { result?: T; error?: string };
  if (body.error) throw new Error(`Redis: ${body.error}`);
  return body.result as T;
}

// ---- memory fallback ----
const mem = new Map<string, { value: string; expiresAt: number }>();
function memGet(key: string) {
  const e = mem.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e;
}

/** Fixed-window counter. Returns true if this hit is within `max` per `windowMs`. */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const k = `rl:${key}`;
  if (kvEnabled) {
    const n = await redis<number>(["INCR", k]);
    if (n === 1) await redis(["PEXPIRE", k, windowMs]);
    return n <= max;
  }
  const e = memGet(k);
  if (!e) {
    mem.set(k, { value: "1", expiresAt: Date.now() + windowMs });
    return true;
  }
  const n = Number(e.value) + 1;
  e.value = String(n);
  return n <= max;
}

/** Undo one counted hit, e.g. when the action it guarded failed. */
export async function releaseRateLimit(key: string): Promise<void> {
  const k = `rl:${key}`;
  if (kvEnabled) {
    await redis(["DECR", k]);
    return;
  }
  const e = memGet(k);
  if (e) e.value = String(Math.max(0, Number(e.value) - 1));
}

/** Short exclusive lock (SET NX PX). Returns a release function, or null if not acquired in time. */
export async function acquireLock(name: string, ttlMs = 15_000, waitMs = 8_000): Promise<(() => Promise<void>) | null> {
  const key = `lock:${name}`;
  const token = crypto.randomUUID();
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    let ok: boolean;
    if (kvEnabled) {
      ok = (await redis<string | null>(["SET", key, token, "NX", "PX", ttlMs])) === "OK";
    } else {
      ok = !memGet(key);
      if (ok) mem.set(key, { value: token, expiresAt: Date.now() + ttlMs });
    }
    if (ok) {
      return async () => {
        if (kvEnabled) {
          const cur = await redis<string | null>(["GET", key]);
          if (cur === token) await redis(["DEL", key]);
        } else if (memGet(key)?.value === token) {
          mem.delete(key);
        }
      };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

/** Small JSON value with a TTL. */
export async function getJson<T>(key: string): Promise<T | null> {
  const raw = kvEnabled ? await redis<string | null>(["GET", key]) : (memGet(key)?.value ?? null);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setJson(key: string, value: unknown, ttlMs: number): Promise<void> {
  const raw = JSON.stringify(value);
  if (kvEnabled) await redis(["SET", key, raw, "PX", ttlMs]);
  else mem.set(key, { value: raw, expiresAt: Date.now() + ttlMs });
}
