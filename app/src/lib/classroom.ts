import "server-only";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getJson, hget, hgetall, hset, setJson } from "./kv";

// A class lives for 48 hours: long enough for a workshop day plus follow-up.
export const CLASS_TTL_MS = 48 * 3600_000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export type Mission = "claim" | "backup" | "send" | "lightning";
export const MISSIONS: Mission[] = ["claim", "backup", "send", "lightning"];

export type ClassInfo = { name: string; tokenHash: string; createdAt: number };
export type Learner = { nickname: string; address: string; joinedAt: number; missions: Partial<Record<Mission, number>> };

const classKey = (code: string) => `class:${code}`;
const rosterKey = (code: string) => `class:${code}:learners`;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const isCode = (v: unknown): v is string => typeof v === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(v);
export const isLearnerId = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** 1–24 visible characters; control characters and angle brackets removed. */
export function cleanName(v: unknown, max = 24): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  return s.length ? s : null;
}

function newCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export async function createClass(name: string): Promise<{ code: string; token: string }> {
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    if (await getJson<ClassInfo>(classKey(code))) continue;
    const token = randomUUID();
    await setJson(classKey(code), { name, tokenHash: sha256(token), createdAt: Date.now() } satisfies ClassInfo, CLASS_TTL_MS);
    return { code, token };
  }
  throw new Error("could not allocate class code");
}

export const getClass = (code: string) => getJson<ClassInfo>(classKey(code));

export function tokenMatches(info: ClassInfo, token: string | null): boolean {
  if (!token) return false;
  const a = Buffer.from(sha256(token), "hex");
  const b = Buffer.from(info.tokenHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const getLearner = (code: string, id: string) => hget<Learner>(rosterKey(code), id);
export const getRoster = (code: string) => hgetall<Learner>(rosterKey(code));

export async function saveLearner(code: string, id: string, learner: Learner): Promise<void> {
  await hset(rosterKey(code), id, learner, CLASS_TTL_MS);
}

export async function completeMission(code: string, id: string, mission: Mission): Promise<void> {
  const learner = await getLearner(code, id);
  if (!learner || learner.missions[mission]) return;
  learner.missions[mission] = Date.now();
  await saveLearner(code, id, learner);
}
