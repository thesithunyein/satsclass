import "server-only";
import * as bitcoin from "bitcoinjs-lib";

export type NetName = "regtest" | "signet";

export function serverNetName(): NetName {
  return process.env.BTC_NETWORK === "signet" ? "signet" : "regtest";
}

export function serverNetwork(): bitcoin.Network {
  // Signet uses the testnet address format (tb1...).
  return serverNetName() === "signet" ? bitcoin.networks.testnet : bitcoin.networks.regtest;
}

/** Returns true only for a well-formed address on the configured test network. */
export function isValidAddress(address: unknown): address is string {
  if (typeof address !== "string" || address.length < 14 || address.length > 90) return false;
  try {
    bitcoin.address.toOutputScript(address, serverNetwork());
    return true;
  } catch {
    return false;
  }
}

/** Raw transaction hex: even length, hex only, bounded size (100 kB). */
export function isValidTxHex(hex: unknown): hex is string {
  return typeof hex === "string" && hex.length >= 120 && hex.length <= 200_000 && hex.length % 2 === 0 && /^[0-9a-f]+$/i.test(hex);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}
