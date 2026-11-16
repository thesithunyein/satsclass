import { describe, expect, it } from "vitest";
import { cleanName, isCode, isLearnerId } from "@/lib/classroom";
import { looksLikeSeed } from "@/lib/seed-guard";

describe("nicknames and class names", () => {
  it("strips markup characters and control characters", () => {
    expect(cleanName("Awa <b>")).toBe("Awa b");
    expect(cleanName("Mou\u0000ssa\n")).toBe("Moussa");
  });
  it("collapses whitespace, trims and caps length", () => {
    expect(cleanName("   Fatou    Diop  ")).toBe("Fatou Diop");
    expect(cleanName("x".repeat(50))).toHaveLength(24);
    expect(cleanName("x".repeat(50), 40)).toHaveLength(40);
  });
  it("rejects empty and non-string input", () => {
    expect(cleanName("   ")).toBeNull();
    expect(cleanName(undefined)).toBeNull();
    expect(cleanName(123)).toBeNull();
  });
});

describe("identifiers", () => {
  it("accepts 6-character codes without look-alike characters", () => {
    expect(isCode("VG8VFY")).toBe(true);
    expect(isCode("ABC12O")).toBe(false); // O and 1 are excluded
    expect(isCode("abc234")).toBe(false);
    expect(isCode("ABCDEFG")).toBe(false);
  });
  it("accepts only UUID learner ids", () => {
    expect(isLearnerId(crypto.randomUUID())).toBe(true);
    expect(isLearnerId("learner-1")).toBe(false);
  });
});

describe("seed guard (AI tutor)", () => {
  it("blocks a pasted recovery phrase", () => {
    expect(looksLikeSeed("my words: abandon ability able about above absent absorb abstract absurd abuse access accident")).toBe(true);
  });
  it("allows normal questions, even with some wordlist words", () => {
    expect(looksLikeSeed("Why did I pay a fee when I sent sats to my friend?")).toBe(false);
    expect(looksLikeSeed("What is a confirmation and how long does it take?")).toBe(false);
  });
});
