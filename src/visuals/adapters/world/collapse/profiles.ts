/**
 * Per-age collapse profiles of the destroyed base (DESIGN A11 "destroyed collapse", A12 base destroyed).
 *
 * Coordinates: base-local lu, unmirrored (x toward the lane is positive, the gate is at 0 and the body
 * reaches back to about -180), heights in lu above the ground. The view mirrors everything for side 1.
 *
 * A profile is presentation data only: how many pieces, which part topples which way, how hard things
 * bounce and what flavour the dust, fire, sparks, splinters and energy have. The simulation never reads
 * it, so retuning a collapse can never change a match (DESIGN B5).
 */
import type { AgeId } from '@/contracts/ids';

/**
 * The sound and debris family of a base: stone ages crumble and splinter, gunpowder and industrial
 * add fire and iron, modern concrete and sparks, future and cosmic energy and shield shards.
 */
export type CollapseMaterial = 'stone' | 'iron' | 'concrete' | 'energy';

/** A part of the base that topples as one piece before it breaks up (a tower, a chimney, a mast). */
export interface ToppleSpec {
  /** Cells whose centre lies in x0..x1 (lu from the gate) and at least y0 lu high topple together. */
  x0: number;
  x1: number;
  y0: number;
  /** +1 falls toward the lane (stays in view: the base stands at the world's end), -1 backward. */
  dir: 1 | -1;
  /** Starts this long after the break (ms of game time). */
  delayMs: number;
  /** Scales the topple's angular acceleration (1 = a tall tower). */
  push: number;
  /** How far the support under it sinks while it starts to tip (lu). */
  sinkLu: number;
}

export interface CollapseProfile {
  material: CollapseMaterial;
  /** Fracture cells above the stump on High (Lite uses about 55%). */
  cells: number;
  /** Cells whose centre stands lower than this (lu) stay as the ruin's stump. */
  stumpLu: number;
  /** Cell shape: > 1 wider than tall (masonry, brick courses), < 1 taller (spires, crystal). */
  aspect: number;
  topple: readonly ToppleSpec[];
  /** Outward blast speed of the free pieces at the break (lu/s) and its upward share. */
  blast: number;
  lift: number;
  /** Bounce and friction of pieces on the ground. */
  restitution: number;
  friction: number;
  /** Small debris pieces thrown at the break on High (Lite about half). */
  debris: number;
  colors: {
    /** Dust and its shade. */
    dust: number;
    dust2: number;
    /** Smoke columns over the ruin. */
    smoke: number;
    /** Glowing embers (pale warm; violet or mint in the last ages, A11 colour rule). */
    ember: number;
    /** Sparks of metal and energy. */
    spark: number;
    /** Energy cracks, shield and shards (future ages). */
    energy: number;
    /** Rubble tints of the code-drawn debris (wall, dark stone, accent). */
    rubble: readonly number[];
    /** Soot tint the stump takes on after the collapse. */
    soot: number;
  };
  /** Flavour amounts 0..1. */
  fire: number;
  sparks: number;
  splinters: number;
  /** Future ages: a failing shield bubble flickers in the build-up and shatters at the break. */
  shield: boolean;
  /** Future ages: lights and cracks flicker like failing power. */
  flicker: boolean;
}

const WARM_EMBER = 0xffd9a8;
const SPARK = 0xfff4dc;

export const COLLAPSE_PROFILES: Readonly<Record<AgeId, CollapseProfile>> = {
  // Cave Hold: the mossy summit crag tips over toward the lane, the face crumbles into boulders,
  // the palisade logs splinter; the cave fire throws embers.
  stone: {
    material: 'stone',
    cells: 20,
    stumpLu: 62,
    aspect: 1.0,
    topple: [{ x0: -160, x1: 30, y0: 150, dir: 1, delayMs: 0, push: 1, sinkLu: 34 }],
    blast: 180,
    lift: 0.52,
    restitution: 0.28,
    friction: 0.62,
    debris: 34,
    colors: { dust: 0xbfae92, dust2: 0x9c8c74, smoke: 0x8e8880, ember: WARM_EMBER, spark: SPARK, energy: 0xfff0d2, rubble: [0x8c7b68, 0x77695a, 0xa08e78, 0x6e8b3d], soot: 0x9a9088 },
    fire: 0.35,
    sparks: 0,
    splinters: 0.55,
    shield: false,
    flicker: false,
  },
  // Ziggurat: the hilltop shrine topples off the stepped tiers, which break into sandstone blocks.
  bronze: {
    material: 'stone',
    cells: 22,
    stumpLu: 70,
    aspect: 1.3,
    topple: [{ x0: -150, x1: -10, y0: 200, dir: 1, delayMs: 0, push: 1, sinkLu: 30 }],
    blast: 180,
    lift: 0.51,
    restitution: 0.26,
    friction: 0.62,
    debris: 34,
    colors: { dust: 0xd6c9aa, dust2: 0xb3a582, smoke: 0x908a80, ember: WARM_EMBER, spark: SPARK, energy: 0xfff0d2, rubble: [0xcdbe9e, 0xb0a282, 0xdccfb2, 0x4f8f7f], soot: 0xa8a090 },
    fire: 0.4,
    sparks: 0.1,
    splinters: 0.3,
    shield: false,
    flicker: false,
  },
  // Keep: the tall tower breaks off and falls toward the lane in big masonry blocks; the side
  // tower follows a beat later; timber hoardings splinter.
  medieval: {
    material: 'stone',
    cells: 24,
    stumpLu: 64,
    aspect: 1.35,
    topple: [
      { x0: -175, x1: -72, y0: 150, dir: 1, delayMs: 0, push: 1, sinkLu: 40 },
      { x0: -72, x1: 10, y0: 120, dir: 1, delayMs: 140, push: 0.85, sinkLu: 26 },
    ],
    blast: 173,
    lift: 0.49,
    restitution: 0.24,
    friction: 0.64,
    debris: 36,
    colors: { dust: 0xbcb9b0, dust2: 0x96938a, smoke: 0x8a8680, ember: WARM_EMBER, spark: SPARK, energy: 0xfff4dc, rubble: [0x9a9c98, 0x7c7f80, 0xaeb0aa, 0x7a5e44], soot: 0x8e8c88 },
    fire: 0.35,
    sparks: 0.15,
    splinters: 0.5,
    shield: false,
    flicker: false,
  },
  // Star Fort: the powder magazine goes up in a fireball, the bastion towers topple, iron bits fly.
  gunpowder: {
    material: 'iron',
    cells: 22,
    stumpLu: 60,
    aspect: 1.3,
    topple: [
      { x0: -165, x1: -100, y0: 120, dir: 1, delayMs: 0, push: 1, sinkLu: 36 },
      { x0: -100, x1: -48, y0: 150, dir: 1, delayMs: 110, push: 0.9, sinkLu: 28 },
    ],
    blast: 209,
    lift: 0.55,
    restitution: 0.26,
    friction: 0.6,
    debris: 36,
    colors: { dust: 0xd2c6a8, dust2: 0xab9f84, smoke: 0x837d76, ember: WARM_EMBER, spark: SPARK, energy: 0xfff4dc, rubble: [0xb8a88a, 0x9a8c72, 0xcabb9c, 0x4a3b2e], soot: 0x9a9284 },
    fire: 0.85,
    sparks: 0.45,
    splinters: 0.35,
    shield: false,
    flicker: false,
  },
  // Foundry: the chimney topples like a felled tree, the gantry and the clock tower follow; brick,
  // iron girders, a boiler burst of fire and sparks.
  industrial: {
    material: 'iron',
    cells: 24,
    stumpLu: 58,
    aspect: 1.4,
    topple: [
      { x0: -180, x1: -132, y0: 110, dir: 1, delayMs: 0, push: 1, sinkLu: 30 },
      { x0: -105, x1: -42, y0: 130, dir: 1, delayMs: 90, push: 0.85, sinkLu: 26 },
      { x0: -42, x1: 20, y0: 115, dir: 1, delayMs: 180, push: 0.8, sinkLu: 22 },
    ],
    blast: 209,
    lift: 0.54,
    restitution: 0.22,
    friction: 0.58,
    debris: 38,
    colors: { dust: 0xb8ada4, dust2: 0x938a82, smoke: 0x77726e, ember: WARM_EMBER, spark: SPARK, energy: 0xfff6e4, rubble: [0x8a6a63, 0x5b6168, 0x9c7e76, 0x2b2a2e], soot: 0x7e7672 },
    fire: 0.9,
    sparks: 0.85,
    splinters: 0.15,
    shield: false,
    flicker: false,
  },
  // Bunker: the radar mast keels over, the concrete tower breaks into slabs with rebar; sparks.
  modern: {
    material: 'concrete',
    cells: 22,
    stumpLu: 56,
    aspect: 1.15,
    topple: [
      { x0: -215, x1: -108, y0: 100, dir: 1, delayMs: 0, push: 1.05, sinkLu: 26 },
      { x0: -108, x1: -48, y0: 140, dir: 1, delayMs: 110, push: 0.85, sinkLu: 30 },
    ],
    blast: 194,
    lift: 0.51,
    restitution: 0.2,
    friction: 0.66,
    debris: 36,
    colors: { dust: 0xc2bfb6, dust2: 0x9c9990, smoke: 0x807e7b, ember: WARM_EMBER, spark: SPARK, energy: 0xf4f8ff, rubble: [0xa29f96, 0x86837b, 0xb6b3a9, 0x62664a], soot: 0x8a8884 },
    fire: 0.5,
    sparks: 0.9,
    splinters: 0,
    shield: false,
    flicker: false,
  },
  // Spire: the shield flickers out and shatters, the spire's top tips over, hull panels and glowing
  // shards scatter while the energy dies in flickers.
  future: {
    material: 'energy',
    cells: 24,
    stumpLu: 50,
    aspect: 0.8,
    topple: [{ x0: -170, x1: 40, y0: 150, dir: 1, delayMs: 0, push: 1, sinkLu: 34 }],
    blast: 202,
    lift: 0.52,
    restitution: 0.24,
    friction: 0.6,
    debris: 34,
    colors: { dust: 0xb6bcc6, dust2: 0x8e95a2, smoke: 0x96949f, ember: 0xc8fff0, spark: 0xe6fff8, energy: 0x3af0b4, rubble: [0xbfc4cb, 0x3a3f4a, 0xced3d9, 0x23262e], soot: 0x8c919a },
    fire: 0.2,
    sparks: 0.6,
    splinters: 0,
    shield: true,
    flicker: true,
  },
  // Star Ark: the hull rings break apart under a shattering violet shield; star-metal and crystal.
  cosmic: {
    material: 'energy',
    cells: 24,
    stumpLu: 52,
    aspect: 0.85,
    topple: [{ x0: -180, x1: 30, y0: 155, dir: 1, delayMs: 0, push: 1, sinkLu: 34 }],
    blast: 202,
    lift: 0.52,
    restitution: 0.24,
    friction: 0.6,
    debris: 34,
    colors: { dust: 0xb4b0cc, dust2: 0x8c88a8, smoke: 0x9893aa, ember: 0xe2d4ff, spark: 0xf2ecff, energy: 0xb48cf0, rubble: [0xc8c4dc, 0x33264c, 0xe0dcf2, 0x8e44c8], soot: 0x8e8aa2 },
    fire: 0.25,
    sparks: 0.55,
    splinters: 0,
    shield: true,
    flicker: true,
  },
};

export function collapseProfile(age: AgeId): CollapseProfile {
  return COLLAPSE_PROFILES[age] ?? COLLAPSE_PROFILES.stone;
}
