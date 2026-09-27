/**
 * Small pure helpers for the content compiler (DESIGN B4).
 */

/** Freezes an object graph in place and returns it (the compiled content is frozen, B4). */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

/** A structural deep copy of plain JSON-like data (so compiling never aliases the raw tables). */
export function cloneData<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v: unknown) => cloneData(v)) as T;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value)) {
    const v = (value as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = cloneData(v);
  }
  return out as T;
}

/**
 * Fields that never change what happens in a battle: presentation ids, string keys and the derived
 * counter hints. `stripPresentation` drops them before hashing (B3 replays, B4 counter staleness),
 * so swapping art, sounds or strings never invalidates replays or the counter matrix.
 */
const PRESENTATION_KEYS = new Set([
  'visualId',
  'effectId',
  'sfx',
  'sfxOverrides',
  'nameKey',
  'descKey',
  'strongVs',
  'weakVs',
  'paletteId',
  'baseVisualId',
  'backdropVisualId',
  'musicCue',
]);

/** A deep copy of `value` without presentation fields (see {@link PRESENTATION_KEYS}). */
export function stripPresentation<T>(value: T): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v: unknown) => stripPresentation(v));
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value).sort()) {
    if (PRESENTATION_KEYS.has(k)) continue;
    const v = (value as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = stripPresentation(v);
  }
  return out;
}

/** Builds an id-keyed record from a list, in list order. Throws on a duplicate id. */
export function byId<T extends { id: string }>(items: readonly T[], what: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    if (Object.prototype.hasOwnProperty.call(out, item.id)) throw new Error(`Duplicate ${what} id "${item.id}"`);
    out[item.id] = item;
  }
  return out;
}
