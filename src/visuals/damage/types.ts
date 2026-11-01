/**
 * Visible battle damage (queue item 40, design `docs/design-history/item40-visible-damage.md`, option a + c): the
 * shared vocabulary of the runtime. Presentation only: everything here is read from `UnitPose.hpBp` (sim state) and
 * the hit's kind (a sim event); nothing reaches the sim.
 */

/** 0 unhurt, 1 "scuffed" (HP <= 75%), 2 "battered" (<= 50%), 3 "wrecked" (<= 25%). */
export type DamageStage = 0 | 1 | 2 | 3;

/** What a unit is made of, for its marks, emitters and motion (design Appendix A; the bundle's `family`). */
export type DamageFamily = 'soldier' | 'armoured' | 'beast' | 'rider' | 'vehicle' | 'flyer' | 'mech' | 'energy';
export const DAMAGE_FAMILIES: readonly DamageFamily[] = ['soldier', 'armoured', 'beast', 'rider', 'vehicle', 'flyer', 'mech', 'energy'];

/** A mark's or strip's surface (contract C1): stone covers stone, crystal and bone; glass covers visors. */
export type MarkMat = 'cloth' | 'hide' | 'metal' | 'wood' | 'stone' | 'glass' | 'energy';
export const MARK_MATS: readonly MarkMat[] = ['cloth', 'hide', 'metal', 'wood', 'stone', 'glass', 'energy'];

/** An emit spot's medium (contract C1). */
export type EmitMedium = 'smoke' | 'steam' | 'spark' | 'breath' | 'motes';
export const EMIT_MEDIA: readonly EmitMedium[] = ['smoke', 'steam', 'spark', 'breath', 'motes'];

/**
 * What the runtime emits from a damaged unit (`damageFx()`): the media of the bundle plus fire (the pale flames of a
 * wrecked machine), the dark smoke column of stage 3 and the dust a tired beast kicks up.
 */
export type EmitKind = 'smoke' | 'smokeDark' | 'steam' | 'fire' | 'spark' | 'breath' | 'motes' | 'dust';
export const EMIT_KINDS: readonly EmitKind[] = ['smoke', 'smokeDark', 'steam', 'fire', 'spark', 'breath', 'motes', 'dust'];

/** The blow that crossed a step (the hit's damage type; the sim event's `dmgType`). */
export type BlowKind = 'blunt' | 'slash' | 'pierce' | 'bullet' | 'laser' | 'blast';
export const BLOW_KINDS: readonly BlowKind[] = ['blunt', 'slash', 'pierce', 'bullet', 'laser', 'blast'];

/** A spot of the bundle (contract C1). `r`: a mark's surface radius, a strip's hanging length, an emitter's puff size. */
export interface DamageSpot {
  id: string;
  kind: 'mark' | 'strip' | 'emit';
  mat: MarkMat | EmitMedium;
  r: number;
  team?: boolean;
}

/** One frame of a spot: lu from the feet, x forward, y up; rotation (deg, counter-clockwise), scale and visibility (%). */
export type SpotFrame = readonly [x: number, y: number, rotDeg: number, scalePct: number, visPct: number];

/** A unit's entry in a damage bundle (contract C1). */
export interface DamageUnitData {
  family: DamageFamily;
  spots?: readonly DamageSpot[];
  /** Per clip (the sheet's animation name), per spot id, one frame per unique frame (indexed like `anchorsLu`). */
  clips?: Readonly<Record<string, Readonly<Record<string, readonly SpotFrame[]>>>>;
  /** Per clip, per unique frame: the torso box `[x0, y0, x1, y1]` (lu, x forward, y up). */
  torso?: Readonly<Record<string, readonly (readonly [number, number, number, number])[]>>;
  /** Per clip, per unique frame: the centre of the head as drawn (riders: the leading head, the mount's). */
  head?: Readonly<Record<string, readonly (readonly [number, number])[]>>;
}

/** A per-age damage bundle, `public/art/damage/<age>.json` (contract C1). */
export interface DamageBundle {
  v: 1;
  units: Readonly<Record<string, DamageUnitData>>;
}

/** The moment a unit crosses a step (`onDamageStep`): where the new mark sits (root space, lu, y down) and of what. */
export interface DamageStepEvent {
  stage: DamageStage;
  prev: DamageStage;
  /** A heal lifted the unit above a hysteresis line (its newest marks fade with a mint glint). */
  mend: boolean;
  /** Where the burst plays (root space: x along the world, y down from the feet), or null (the battle view's contact). */
  x: number;
  y: number;
  spot: boolean;
  /** The surface the burst and the sound speak for. */
  mat: MarkMat;
  /** The blow that crossed the step, if the view was told (`react(tier, dir, kind)`). */
  kind: BlowKind | null;
  family: DamageFamily;
  /** The body's height (lu): bursts and sounds scale with it. */
  heightLu: number;
  /** A machine's stage 3: the fire catches (`damage.ignite`), only where it has a place to burn clear of its crew. */
  ignite: boolean;
  /** Where the fire catches (root space, as `x`, `y`): the fire's place, never the step's mark; set with `ignite`. */
  igniteX?: number;
  igniteY?: number;
}

/** A live emitter of a damaged unit (`damageFx()`): root space (lu, y down), particles per second of game time. */
export interface DamageEmitter {
  kind: EmitKind;
  x: number;
  y: number;
  rate: number;
  /** The puff size (lu), from the spot's `r` or the body. */
  size: number;
}
