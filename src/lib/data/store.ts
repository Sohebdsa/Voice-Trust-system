import { buildSeed } from "./seed";
import type { Db } from "./types";

/**
 * Prototype persistence: one seeded object graph held in module scope.
 * Kept on globalThis so Next's dev hot-reload does not rebuild it (and reset
 * any mutations made during a demo).
 */
/** Bump when the `Db` shape changes, so a dev-hot-reloaded stale seed is rebuilt. */
const SEED_VERSION = 7;

const globalStore = globalThis as unknown as {
  __voiceTrustDb?: Db;
  __voiceTrustDbVersion?: number;
};

if (globalStore.__voiceTrustDbVersion !== SEED_VERSION) {
  globalStore.__voiceTrustDb = buildSeed();
  globalStore.__voiceTrustDbVersion = SEED_VERSION;
}

export const db: Db = globalStore.__voiceTrustDb!;
