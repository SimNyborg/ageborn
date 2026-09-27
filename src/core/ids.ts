/**
 * Id helpers. Entity ids in the sim are stable, increasing integers (DESIGN B3);
 * string ids for saves (capsules, crates) are derived from a seeded RNG so they are reproducible.
 */
import { sfc32Next, type Sfc32State } from './rng';

/** Monotonic integer id counter. `next()` returns start, start+1, ... */
export interface IdCounter {
  next(): number;
  /** The id the next call will return. */
  peek(): number;
}

export function createIdCounter(start = 1): IdCounter {
  let n = start;
  return {
    next: () => {
      const id = n;
      n += 1;
      return id;
    },
    peek: () => n,
  };
}

/** Separator between a base visualId and a skin id, as in `unit.bonker@pumpkin_head` (DESIGN B5). */
export const SKIN_SEPARATOR = '@';

/** Joins a base visual id and an optional skin id into a manifest key. */
export function skinnedVisualId(visualId: string, skinId?: string | null): string {
  return skinId ? `${visualId}${SKIN_SEPARATOR}${skinId}` : visualId;
}

/** Splits a manifest key into its base visual id and skin id (null when unskinned). */
export function parseSkinnedVisualId(key: string): { visualId: string; skinId: string | null } {
  const i = key.indexOf(SKIN_SEPARATOR);
  if (i < 0) return { visualId: key, skinId: null };
  return { visualId: key.slice(0, i), skinId: key.slice(i + 1) };
}

/**
 * A reproducible random string id: `prefix` + '_' + 12 base-36 characters drawn from `state`.
 * Advances `state` by two draws.
 */
export function rngId(state: Sfc32State, prefix: string): string {
  const a = sfc32Next(state).toString(36).padStart(7, '0').slice(-6);
  const b = sfc32Next(state).toString(36).padStart(7, '0').slice(-6);
  return `${prefix}_${a}${b}`;
}
