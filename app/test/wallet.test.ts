import { describe, expect, it } from "vitest";
import * as bitcoin from "bitcoinjs-lib";
import { buildSend, deriveAccount, isValidAddress, isValidMnemonic, network, newMnemonic, normalizeMnemonic } from "@/lib/wallet";

const ABANDON = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const TXID_A = "a".repeat(64);
const TXID_B = "b".repeat(64);

describe("mnemonics", () => {
  it("generates valid 12-word phrases", () => {
    const m = newMnemonic();
    expect(m.split(" ")).toHaveLength(12);
    expect(isValidMnemonic(m)).toBe(true);
  });

  it("rejects garbage and accepts messy but valid input", () => {
    expect(isValidMnemonic("hello world")).toBe(false);
    expect(isValidMnemonic(`  ${ABANDON.toUpperCase().replace(/ /g, "   ")}  `)).toBe(true);
    expect(normalizeMnemonic("  Abandon   ABOUT ")).toBe("abandon about");
  });
});

describe("derivation (BIP84, coin type 1)", () => {
  it("matches the known test vector for m/84'/1'/0'/0/0", () => {
    expect(deriveAccount(ABANDON, "signet").address).toBe("tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl");
  });

  it("uses the right address prefix per network and the same key on both", () => {
    const reg = deriveAccount(ABANDON, "regtest");
    const sig = deriveAccount(ABANDON, "signet");
    expect(reg.address.startsWith("bcrt1q")).toBe(true);
    expect(sig.address.startsWith("tb1q")).toBe(true);
    expect(Buffer.from(reg.output).equals(Buffer.from(sig.output))).toBe(true);
  });

  it("is deterministic", () => {
    expect(deriveAccount(ABANDON, "regtest").address).toBe(deriveAccount(ABANDON, "regtest").address);
  });
});

describe("address validation", () => {
  it("accepts only addresses for the selected network", () => {
    const reg = deriveAccount(ABANDON, "regtest").address;
    expect(isValidAddress(reg, "regtest")).toBe(true);
    expect(isValidAddress(reg, "signet")).toBe(false);
    expect(isValidAddress("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu", "signet")).toBe(false);
    expect(isValidAddress("not-an-address", "regtest")).toBe(false);
  });
});

describe("buildSend", () => {
  const net = "regtest" as const;
  const me = deriveAccount(ABANDON, net).address;
  const to = deriveAccount(newMnemonic(), net).address;

  it("pays the recipient, returns change and charges ~2 sat/vB", () => {
    const tx = buildSend(ABANDON, net, [{ txid: TXID_A, vout: 0, value: 10_000 }], to, 1_000, 2);
    const decoded = bitcoin.Transaction.fromHex(tx.hex);
    const outs = decoded.outs.map((o) => ({ addr: bitcoin.address.fromOutputScript(o.script, network(net)), value: Number(o.value) }));

    expect(tx.fee).toBe(282); // estimate for 1 input, 2 outputs at 2 sat/vB, same as seen on the live network
    expect(outs).toContainEqual({ addr: to, value: 1_000 });
    expect(outs).toContainEqual({ addr: me, value: 10_000 - 1_000 - 282 });
    expect(Math.abs(tx.vsize - 141)).toBeLessThanOrEqual(1);
    expect(tx.txid).toBe(decoded.getId());
  });

  it("drops dust change into the fee instead of creating a tiny output", () => {
    const tx = buildSend(ABANDON, net, [{ txid: TXID_A, vout: 0, value: 1_500 }], to, 1_000, 2);
    expect(bitcoin.Transaction.fromHex(tx.hex).outs).toHaveLength(1);
    expect(tx.change).toBe(0);
    expect(tx.fee).toBe(500);
  });

  it("selects the largest coin first and spends no more inputs than needed", () => {
    const tx = buildSend(
      ABANDON,
      net,
      [
        { txid: TXID_A, vout: 0, value: 5_000 },
        { txid: TXID_B, vout: 1, value: 20_000 },
      ],
      to,
      10_000,
      2,
    );
    expect(tx.inputs).toEqual([{ txid: TXID_B, vout: 1, value: 20_000 }]);
  });

  it("refuses to spend more than the wallet has, including the fee", () => {
    expect(() => buildSend(ABANDON, net, [{ txid: TXID_A, vout: 0, value: 1_100 }], to, 1_000, 2)).toThrow("insufficient_funds");
  });

  it("refuses dust amounts and wrong-network addresses", () => {
    expect(() => buildSend(ABANDON, net, [{ txid: TXID_A, vout: 0, value: 10_000 }], to, 100, 2)).toThrow("min_amount");
    expect(() => buildSend(ABANDON, net, [{ txid: TXID_A, vout: 0, value: 10_000 }], "tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl", 1_000, 2)).toThrow(
      "invalid_address",
    );
  });
});
