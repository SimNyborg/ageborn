/**
 * Skeleton math (pure): bone world matrices from the rest pose plus clip deltas, slot matrices and
 * slot visibility. Shared by the Pixi puppet view, portraits, handoff sheets and the raster tests.
 */
import type { BoneDef, BoneDelta, PuppetDef, SlotDef, SlotWhen } from './types';
import { matCompose, matMul, type Mat } from './svg';

export const NO_DELTA: BoneDelta = { r: 0, x: 0, y: 0, sx: 1, sy: 1 };

export type DeltaLookup = (boneId: string) => BoneDelta | undefined;

/** Checks that every bone's parent comes first and ids are unique. Returns problems (empty = ok). */
export function validateBones(bones: readonly BoneDef[]): string[] {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const b of bones) {
    if (seen.has(b.id)) problems.push(`duplicate bone "${b.id}"`);
    if (b.parent !== null && !seen.has(b.parent)) problems.push(`bone "${b.id}" before its parent "${b.parent}"`);
    seen.add(b.id);
  }
  return problems;
}

/** Local matrix of a bone including a pose delta. */
export function boneLocal(b: BoneDef, d: BoneDelta = NO_DELTA): Mat {
  return matCompose(b.x + d.x, b.y + d.y, (b.rot ?? 0) + d.r, (b.sx ?? 1) * d.sx, (b.sy ?? 1) * d.sy);
}

/**
 * World matrices (puppet space: origin at the feet) for every bone. Bones must be parent-first.
 * `out` is reused when given, to avoid allocation in the render loop.
 */
export function boneWorld(bones: readonly BoneDef[], deltas?: DeltaLookup, out: Map<string, Mat> = new Map()): Map<string, Mat> {
  for (const b of bones) {
    const local = boneLocal(b, deltas?.(b.id) ?? NO_DELTA);
    const parent = b.parent === null ? undefined : out.get(b.parent);
    out.set(b.id, parent ? matMul(parent, local) : local);
  }
  return out;
}

export function slotLocal(s: SlotDef): Mat {
  return matCompose(s.x ?? 0, s.y ?? 0, s.rot ?? 0, s.sx ?? 1, s.sy ?? 1);
}

export function slotId(s: SlotDef): string {
  return s.id ?? s.part;
}

export interface PuppetState {
  crumble: number;
  treasury: number;
}

export const DEFAULT_STATE: PuppetState = { crumble: 0, treasury: 0 };

export function slotVisible(when: SlotWhen | undefined, st: PuppetState): boolean {
  if (!when) return true;
  if (when.crumbleMin !== undefined && st.crumble < when.crumbleMin) return false;
  if (when.crumbleMax !== undefined && st.crumble > when.crumbleMax) return false;
  if (when.treasuryMin !== undefined && st.treasury < when.treasuryMin) return false;
  return true;
}

/** Slots in draw order (z ascending, stable by declaration order). */
export function slotsInOrder(p: PuppetDef): SlotDef[] {
  return p.slots
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.z - b.s.z || a.i - b.i)
    .map((e) => e.s);
}
