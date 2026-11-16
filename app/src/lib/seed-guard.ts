import * as bip39 from "bip39";

const WORDS = new Set(bip39.wordlists.english);

/**
 * True when text contains 8 or more BIP39 words in a row: almost certainly a pasted recovery phrase.
 * Used to stop learners from sending their seed to the AI tutor.
 */
export function looksLikeSeed(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let run = 0;
  let best = 0;
  for (const w of words) {
    run = WORDS.has(w) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best >= 8;
}
