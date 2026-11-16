// Encrypts the learner's seed phrase at rest in localStorage with a PIN (PBKDF2 + AES-GCM).
// The plaintext seed only lives in memory while the wallet is unlocked.
const KEY = "satsclass.vault.v1";
const ITERATIONS = 210_000;

type Stored = { v: 1; salt: string; iv: string; ct: string };

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function hasVault(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export async function saveVault(mnemonic: string, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(mnemonic));
  const data: Stored = { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** Returns the mnemonic, or throws if the PIN is wrong. */
export async function openVault(pin: string): Promise<string> {
  const raw = localStorage.getItem(KEY);
  if (!raw) throw new Error("no_wallet");
  const data = JSON.parse(raw) as Stored;
  const key = await deriveKey(pin, unb64(data.salt));
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(data.iv) as BufferSource }, key, unb64(data.ct) as BufferSource);
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error("wrong_pin");
  }
}

export function deleteVault(): void {
  localStorage.removeItem(KEY);
}
