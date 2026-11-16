import "server-only";

// Practice Lightning balances held by the class node, keyed by the learner's on-chain address.
export const LN_START_BALANCE = 5_000;
export const LN_TTL_MS = 48 * 3600_000;
export const CAFE_PRICE = 1_000;
export const lnBalanceKey = (address: string) => `ln:bal:${address}`;
