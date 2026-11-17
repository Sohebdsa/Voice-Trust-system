import { buildSeed } from "./seed";
import type { Db } from "./types";

/**
 * Prototype persistence: one seeded object graph held in module scope.
 * Kept on globalThis so Next's dev hot-reload does not rebuild it (and reset
 * any mutations made during a demo).
 */
const globalStore = globalThis as unknown as { __voiceTrustDb?: Db };

export const db: Db = globalStore.__voiceTrustDb ?? (globalStore.__voiceTrustDb = buildSeed());
