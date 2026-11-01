/**
 * Damage stages (queue item 40, design section 3.2): the bases' own crumble thresholds, so the game speaks one damage
 * language. A stage is entered at 75%, 50% and 25% of max HP and left only 5 points above its line (a heal that
 * bobs around a line does not flicker the look). Pure and integer: the stage of a unit is a function of the HP the sim
 * reports and the stage it had.
 */
import type { DamageFamily, DamageStage } from './types';

/** HP (basis points of max HP) at or under which stage 1, 2 and 3 are entered. */
export const STAGE_ENTER_BP: readonly [number, number, number] = [7500, 5000, 2500];
/** A stage is left only once HP climbs this far above its line (5 points). */
export const STAGE_HYSTERESIS_BP = 500;

/**
 * The stage after a frame whose HP is `hpBp`, from the stage shown `prev`. Damage goes straight to the deepest stage it
 * reaches (a blow that crosses two lines shows the deeper stage with one burst); a heal steps back one line at a time,
 * each only past its hysteresis.
 */
export function nextStage(prev: DamageStage, hpBp: number): DamageStage {
  const hp = Number.isFinite(hpBp) ? hpBp : 10000;
  let deep: DamageStage = 0;
  if (hp <= STAGE_ENTER_BP[0]) deep = 1;
  if (hp <= STAGE_ENTER_BP[1]) deep = 2;
  if (hp <= STAGE_ENTER_BP[2]) deep = 3;
  if (deep >= prev) return deep;
  let s: number = prev;
  while (s > 0 && hp > (STAGE_ENTER_BP[s - 1] ?? 10000) + STAGE_HYSTERESIS_BP) s--;
  return s as DamageStage;
}

/** How many marks a stage shows in all (design 3.2: 1, then 2-3, then 3-4; the seed picks within the range). */
export function marksAt(stage: DamageStage, seed: number): number {
  if (stage <= 0) return 0;
  if (stage === 1) return 1;
  const extra = (seed >>> 3) & 1;
  return stage === 2 ? 2 + extra : 3 + extra;
}

/** Graphics Lite keeps the newest marks only (design section 6). */
export const LITE_MAX_MARKS = 2;
/** At most this many marks and strips on one unit (High). */
export const MAX_MARKS = 4;
export const MAX_STRIPS = 1;

/**
 * The stage tint (a vertex colour on the unit's own art, never on its team colour: free, no batch break; design 4c).
 * Machines darken and warm toward scorch; soldiers and riders darken a little; beasts take a dusty pale cast; energy
 * bodies dim. No lilac or blue (the frozen tint), no red.
 */
const TINT: Readonly<Record<DamageFamily, readonly [number, number, number, number]>> = {
  soldier: [0xffffff, 0xf7f3ee, 0xece6de, 0xddd5cb],
  armoured: [0xffffff, 0xf4f1ec, 0xe6e0d8, 0xd4ccc2],
  rider: [0xffffff, 0xf6f2ec, 0xe9e3da, 0xd9d0c5],
  beast: [0xffffff, 0xf7f3ea, 0xeee7da, 0xe2d9c9],
  vehicle: [0xffffff, 0xf1ece5, 0xdcd3c8, 0xbcb1a4],
  flyer: [0xffffff, 0xf1ece5, 0xdcd3c8, 0xc2b8ac],
  mech: [0xffffff, 0xf1eee9, 0xdfd8cf, 0xc4bbb0],
  energy: [0xffffff, 0xf5f4f2, 0xe9e8e5, 0xdcdad6],
};

export function stageTint(family: DamageFamily, stage: DamageStage): number {
  return TINT[family]?.[stage] ?? 0xffffff;
}

/** Families whose bodies are machines: smoke, sparks and fire, an engine sputter, the whump of a fire catching. */
export function isMachine(family: DamageFamily): boolean {
  return family === 'vehicle' || family === 'flyer' || family === 'mech';
}

/** Families that tire at stage 3 (weary motion): soldiers, armoured troops, riders and beasts. */
export function tires(family: DamageFamily): boolean {
  return family === 'soldier' || family === 'armoured' || family === 'rider' || family === 'beast';
}

/** A colour mixed toward another (RGB, 0..1). */
export function mixRgb(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (sh: number): number => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k) << sh;
  return ch(16) | ch(8) | ch(0);
}

/** Two tints multiplied (a damage tint on top of the frozen lilac, for example). */
export function multiplyRgb(a: number, b: number): number {
  const ch = (sh: number): number => Math.round((((a >> sh) & 255) * ((b >> sh) & 255)) / 255) << sh;
  return ch(16) | ch(8) | ch(0);
}

/** The dust the hanging strips are dulled toward (design 3.3: the team colour dulled 30% toward dust). */
export const STRIP_DUST = 0x8a8478;
export const STRIP_DULL = 0.3;
