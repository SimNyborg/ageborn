/**
 * Unit manifest entries for the 3D-rendered sprite sheets (DESIGN B5 swap point, `art/blender`).
 * Every unit with a sheet in `public/art/units/<age>/<slug>.json` gets an atlas entry built from
 * the sheet's own metadata (`unitSheets.gen.ts`, written by `art/blender/gen_unit_manifest.mjs`),
 * so anchors, heights and the attack's contact frame match the art exactly. The sim owns all
 * timing: the atlas view warps each clip onto the sim's impact tick and walk speed (B5).
 *
 * The procedural puppet stays the fallback: skins without a sheet keep their procedural entry,
 * a unit whose sheet has not loaded yet (or failed) is drawn procedurally, card portraits still
 * come from the puppet, and `?art=procedural` shows the old tier for comparison.
 *
 * Sheets load per age (`AtlasAdapter`): Stone blocks the boot preload (every match starts there),
 * every other age streams in the background, so the first download stays small (B16).
 */
import type { VisualDef } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { atlasVisualDef, type AtlasJson } from './adapters/atlas';
import { puppetById } from './library';
import { UNIT_SHEETS } from './unitSheets.gen';
import { unitSheetSource } from './unitSheetPaths';

export { BLOCKING_UNIT_SHEET_AGES, unitSheetAge, unitSheetSource } from './unitSheetPaths';

/** One installed unit sheet, summarised (see the generator). Points are lu from the feet, x right, y up. */
export interface UnitSheetSummary {
  age: AgeId;
  slug: string;
  visualId: string;
  heightLu: number;
  pxPerLu: number;
  anchorsLu: { head: readonly [number, number]; hitCenter: readonly [number, number]; muzzle: readonly [number, number] };
  clips: Readonly<Record<string, { durationMs: number; loop: boolean; impactAt?: number }>>;
}

export function unitSheetDef(s: UnitSheetSummary): VisualDef {
  const json: AtlasJson = {
    meta: {
      ageborn: {
        visualId: s.visualId,
        heightLu: s.heightLu,
        pxPerLu: s.pxPerLu,
        anchorsLu: { head: s.anchorsLu.head, hitCenter: s.anchorsLu.hitCenter, muzzle: s.anchorsLu.muzzle },
        clips: Object.fromEntries(Object.entries(s.clips).map(([k, c]) => [k, { ...c }])),
      },
    },
  };
  const def = atlasVisualDef(json, unitSheetSource(s.age, s.slug));
  // keep what the puppet adds on top of the art: its projectile (skins may override) and filters
  const p = puppetById(s.visualId);
  if (p?.projectileVisualId) def.projectileVisualId = p.projectileVisualId;
  if (p && p.alpha !== undefined) def.filters = { alpha: p.alpha };
  return def;
}

export function buildUnitOverrides(sheets: readonly UnitSheetSummary[] = UNIT_SHEETS): Record<string, VisualDef> {
  const out: Record<string, VisualDef> = {};
  for (const s of sheets) out[s.visualId] = unitSheetDef(s);
  return out;
}

export const UNIT_OVERRIDES: Readonly<Record<string, VisualDef>> = buildUnitOverrides();
