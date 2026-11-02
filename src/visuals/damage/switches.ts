/**
 * Dev-only switches of the damage runtime (W0 WebKit-crash bisection, 2026-11-02; temporary): CI's WebKit loses its page
 * in the long wars from the damage merge on, so parts of the runtime can be turned off one at a time with
 * `?dev=1&dmgoff=<part>[,<part>...]`. The app reads the parameter at boot only with `?dev=1`; without it nothing is off,
 * so the game is unchanged.
 *
 * - `all`: the whole runtime (no bundles requested, no stages, so no marks, strips, tint, weary motion, emitters,
 *   steps or kit bake, and no tracked torsos for the staging);
 * - `strips`: no hanging strips;
 * - `emitters`: no smoke, fire, sparks, steam, breath or motes;
 * - `marks`: no marks and no kit bake (the kit's pages);
 * - `bursts`: no step events (no burst, ignite flare or step sound; the marks still come, silently);
 * - `tint`: no stage tint and no weary motion.
 */
export const DAMAGE_PARTS = ['all', 'strips', 'emitters', 'marks', 'bursts', 'tint'] as const;
export type DamagePart = (typeof DAMAGE_PARTS)[number];

const OFF = new Set<DamagePart>();

/** Sets the parts that are off (unknown names are ignored); an empty list turns everything on again. */
export function setDamageOff(parts: Iterable<string>): void {
  OFF.clear();
  for (const p of parts) if ((DAMAGE_PARTS as readonly string[]).includes(p)) OFF.add(p as DamagePart);
}

/** Whether a part of the damage runtime is off (`all` turns every part off). */
export function damageOff(part: DamagePart): boolean {
  return OFF.size > 0 && (OFF.has('all') || OFF.has(part));
}

/** The parts that are off, for logs. */
export function damageOffList(): DamagePart[] {
  return [...OFF];
}
