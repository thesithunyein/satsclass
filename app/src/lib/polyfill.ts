// bitcoinjs-lib v6 expects a global Buffer. Browsers don't have one, so provide it
// before any Bitcoin library is evaluated. Import this module FIRST.
import { Buffer } from "buffer";

const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (!g.Buffer) g.Buffer = Buffer;

export {};
