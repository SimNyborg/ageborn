/**
 * Unit manifest entries for the 3D-rendered sprite sheets (DESIGN B5 swap point, `art/blender`).
 * Every unit with a sheet in `public/art/units/<age>/<slug>.json` gets an atlas entry built from
 * the sheet's own metadata (`unitSheets.gen.ts`, written by `art/blender/gen_unit_manifest.mjs`),
 * so anchors, heights and the attack's contact frame match the art exactly. The sim owns all
 * timing: the atlas view warps each clip onto the sim's impact tick and walk speed (B5).
 *
 * Troop skins rendered as sheets (queue item 46, contract C3: `<slug>@<skinId>.json` next to the unit's
 * sheet, `skinSheets.gen.ts`) get an atlas entry under the skin's own id (`unit.<slug>@<skinId>`), so the
 * provider draws a skinned copy from its skin sheet wherever the unit's sheet would be drawn, and a match
 * loads the skin sheet in place of the unit's (both only when a skinned and a plain copy are held).
 *
 * The procedural puppet stays the fallback: skins without a sheet keep their procedural entry,
 * a unit or skin whose sheet has not loaded yet (or failed) is drawn procedurally, card portraits
 * come from the puppet where no still is rendered, and `?art=procedural` shows the old tier for
 * comparison.
 *
 * Sheets load per age (`AtlasAdapter`): Stone blocks the boot preload (every match starts there),
 * every other age streams in the background, so the first download stays small (B16).
 */
import type { VisualDef } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { atlasVisualDef, type AtlasJson } from './adapters/atlas';
import { puppetById } from './library';
import { SKIN_SHEETS } from './skinSheets.gen';
import { UNIT_SHEETS } from './unitSheets.gen';
import { unitSheetSource } from './unitSheetPaths';

export { BLOCKING_UNIT_SHEET_AGES, unitSheetAge, unitSheetSource } from './unitSheetPaths';

/** One clip of a sheet, summarised: its timing, and for shot clips the aim data the pipeline writes (contract C2). */
export interface SheetClipSummary {
  durationMs: number;
  loop: boolean;
  impactAt?: number;
  /** An aimed variant (`attack_up45`, `attack_b_down`, ...): the shot clip it aims, with exactly its timing. */
  aimOf?: string;
  /** The drawn weapon's angle at the release frame (degrees above the facing direction). */
  aimDeg?: number;
  /** Where the shot leaves (`frame`: a unique frame index; `atLu`: lu from the feet, x forward, y up). */
  release?: { frame: number; atLu: readonly [number, number] };
  /** An emitting clip (a spell, an aura): no aim and no lean. */
  omni?: true;
}

/** One installed unit sheet, summarised (see the generator). Points are lu from the feet, x right, y up. */
export interface UnitSheetSummary {
  age: AgeId;
  slug: string;
  visualId: string;
  heightLu: number;
  pxPerLu: number;
  anchorsLu: { head: readonly [number, number]; hitCenter: readonly [number, number]; muzzle: readonly [number, number] };
  /**
   * Includes the attack variants `attack_b`, `attack_c` and `attack_alt` and their aimed variants when the sheet
   * (or its extras sheet) has them.
   */
  clips: Readonly<Record<string, SheetClipSummary>>;
  /** Body type of the walk (ANIM_SPEC 2.1), written by sheets made to the animation standard. */
  gait?: string;
}

/** A troop skin rendered as a sheet (contract C3): `slug` is `<unit slug>@<skinId>`, `visualId` the skin's manifest id. */
export interface SkinSheetSummary extends UnitSheetSummary {
  /** The unit's own visual id (`unit.<slug>`). */
  skinOf: string;
  /** The skin id (`SkinDef.id`). */
  skin: string;
  /** Both card stills (`art/portraits/<slug>@<skinId>.png` and `_team.png`) are installed. */
  still: boolean;
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
  // aimed variants (C2) live in the extras sheet: listed, so the extras sheet loads for them too (the view plays one
  // only once it has loaded; until then the base clip plays)
  for (const [name, c] of Object.entries(s.clips)) {
    if (c.aimOf !== undefined && def.clips[name] === undefined) def.clips[name] = { kind: 'atlas', ref: name, durationMs: c.durationMs, loop: false };
  }
  // keep what the puppet adds on top of the art: its projectile (skins may override) and filters
  const p = puppetById(s.visualId);
  if (p?.projectileVisualId) def.projectileVisualId = p.projectileVisualId;
  if (p && p.alpha !== undefined) def.filters = { alpha: p.alpha };
  return def;
}

/**
 * Atlas entries for the units' sheets and the skins' sheets. A skin sheet whose unit has no sheet (or whose id is
 * not the unit's skin id) is left out: the skin keeps its procedural entry.
 */
export function buildUnitOverrides(sheets: readonly UnitSheetSummary[] = UNIT_SHEETS, skins: readonly SkinSheetSummary[] = SKIN_SHEETS): Record<string, VisualDef> {
  const out: Record<string, VisualDef> = {};
  for (const s of sheets) out[s.visualId] = unitSheetDef(s);
  for (const s of skins) {
    if (!out[s.skinOf] || s.visualId !== `${s.skinOf}@${s.skin}`) continue;
    out[s.visualId] = unitSheetDef(s);
  }
  return out;
}

export const UNIT_OVERRIDES: Readonly<Record<string, VisualDef>> = buildUnitOverrides();
