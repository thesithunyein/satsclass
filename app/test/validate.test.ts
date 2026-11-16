import { afterEach, describe, expect, it } from "vitest";
import { isValidAddress, isValidTxHex, serverNetName } from "@/lib/server-validate";

const SIGNET = "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl";

afterEach(() => {
  delete process.env.BTC_NETWORK;
});

describe("server address validation", () => {
  it("defaults to regtest and rejects signet addresses there", () => {
    expect(serverNetName()).toBe("regtest");
    expect(isValidAddress(SIGNET)).toBe(false);
  });

  it("accepts signet addresses when configured for signet", () => {
    process.env.BTC_NETWORK = "signet";
    expect(isValidAddress(SIGNET)).toBe(true);
    expect(isValidAddress("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu")).toBe(false);
  });

  it("rejects non-strings and absurd lengths", () => {
    process.env.BTC_NETWORK = "signet";
    expect(isValidAddress(undefined)).toBe(false);
    expect(isValidAddress(42)).toBe(false);
    expect(isValidAddress("tb1q" + "q".repeat(200))).toBe(false);
  });
});

describe("raw transaction validation", () => {
  it("accepts even-length hex within bounds", () => {
    expect(isValidTxHex("ab".repeat(100))).toBe(true);
  });
  it("rejects odd length, non-hex, too short and too long", () => {
    expect(isValidTxHex("abc")).toBe(false);
    expect(isValidTxHex("zz".repeat(100))).toBe(false);
    expect(isValidTxHex("ab".repeat(10))).toBe(false);
    expect(isValidTxHex("ab".repeat(100_001))).toBe(false);
    expect(isValidTxHex(null)).toBe(false);
  });
});
