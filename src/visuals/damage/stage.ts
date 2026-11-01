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
 * Neutral grey: a warm multiply would raise the saturation of the art's warm colours (bronze, leather, skin) past the
 * A11 colour rule's 40% in the orange band, so the scorch reads through soot marks and smoke instead. Machines darken
 * most, soldiers and beasts a little. No lilac or blue (the frozen tint), no red.
 */
const TINT: Readonly<Record<DamageFamily, readonly [number, number, number, number]>> = {
  // foot troops' last stage a little darker (A-S2: their stage has no smoke or fire to carry it)
  soldier: [0xffffff, 0xf4f4f4, 0xe8e8e8, 0xcdcdcd],
  armoured: [0xffffff, 0xf2f2f2, 0xe4e4e4, 0xc8c8c8],
  rider: [0xffffff, 0xf3f3f3, 0xe6e6e6, 0xd8d8d8],
  beast: [0xffffff, 0xf6f6f6, 0xececec, 0xe0e0e0],
  vehicle: [0xffffff, 0xeeeeee, 0xd8d8d8, 0xbcbcbc],
  flyer: [0xffffff, 0xeeeeee, 0xd8d8d8, 0xc2c2c2],
  mech: [0xffffff, 0xf0f0f0, 0xdcdcdc, 0xc4c4c4],
  energy: [0xffffff, 0xf5f5f5, 0xe9e9e9, 0xdcdcdc],
};

export function stageTint(family: DamageFamily, stage: DamageStage): number {
  return TINT[family]?.[stage] ?? 0xffffff;
}

/** Families whose bodies are machines: smoke, sparks, an engine sputter. */
export function isMachine(family: DamageFamily): boolean {
  return family === 'vehicle' || family === 'flyer' || family === 'mech';
}

/**
 * Families that catch fire at their last stage (design 3.3): vehicles only, with small pale flames on the hull and the
 * whump of the fire catching. Mechs shower sparks and flyers trail smoke instead; neither burns.
 */
export function burns(family: DamageFamily): boolean {
  return family === 'vehicle';
}

/**
 * Families with small bodies (foot troops): their marks are drawn bigger, the first boldest on their biggest team
 * surface, and their strip hangs longer, so their stage reads at a glance at phone scale (W0 art review A-S2).
 */
export function smallBody(family: DamageFamily): boolean {
  return family === 'soldier' || family === 'armoured';
}

/** How much longer a small body's strip hangs (A-S2). */
export const STRIP_SMALL_SCALE = 1.35;

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
