/**
 * Troop skins drawn from their own sheets (queue item 46, contract C3): where a skin sheet lives, which unit it
 * stands in for, and whether its card still is installed. Pure lookups over `skinSheets.gen.ts` (written by
 * `art/blender/gen_unit_manifest.mjs`); kept apart from `manifest.units.ts` so the atlas tier can ask without an
 * import cycle.
 */
import { SKIN_SHEETS } from './skinSheets.gen';

const SKIN_SOURCE = /art\/units\/([a-z]+)\/([a-z0-9_]+)@([a-z0-9_]+)(?:\.x)?(?:\.hd)?\.json(?:$|[?#])/;

/** Skin sheets whose card stills (both images) are installed, by `<age>/<slug>@<skinId>`. */
let stills: ReadonlySet<string> | null = null;

/** `art/units/<age>/<slug>@<skinId>[.x][.hd].json` → its parts; null for any other source. */
export function skinSheetOf(source: string): { age: string; slug: string; skin: string } | null {
  const m = SKIN_SOURCE.exec(source);
  return m ? { age: m[1]!, slug: m[2]!, skin: m[3]! } : null;
}

/** The unit's own sheet a skin sheet stands in for (`art/units/<age>/<slug>.json`), or null for any other source. */
export function skinUnitSource(source: string): string | null {
  const s = skinSheetOf(source);
  return s ? `art/units/${s.age}/${s.slug}.json` : null;
}

/**
 * The card still of a skin sheet (`art/portraits/<slug>@<skinId>`, no extension) when both its images are
 * installed, else null: a skin's still is used only when both exist (C3), so the game never asks for a missing file.
 */
export function skinStillBase(source: string): string | null {
  const s = skinSheetOf(source);
  if (!s) return null;
  stills ??= new Set(SKIN_SHEETS.filter((r) => r.still).map((r) => `${r.age}/${r.slug}`));
  return stills.has(`${s.age}/${s.slug}@${s.skin}`) ? `art/portraits/${s.slug}@${s.skin}` : null;
}
