/**
 * Avatar part art (AUDIT §6.4). A part is data: shapes in a 120 × 120 box (head centre 60, 52;
 * shoulders from y 88), each with a tone, so tints apply by tone and every ramp comes from the art
 * sheet. The renderer stacks the layers in a fixed order.
 */
import type { Material } from './color';

/** Draw order, back to front (AUDIT §6.4 layer order). */
export const LAYERS = [
  'bg',
  'hatBack',
  'hairBack',
  'body',
  'neck',
  'collar',
  'ears',
  'face',
  'beard',
  'mouth',
  'nose',
  'eyes',
  'brows',
  'faceAcc',
  'hairFront',
  'hat',
  'over',
  'fx',
] as const;
export type Layer = (typeof LAYERS)[number];

/** A colour: a tint slot of the look or a fixed hex colour. `eyesDark` is the eye tint darkened for dot eyes. */
export type Tone = 'skin' | 'skinDark' | 'hair' | 'eyes' | 'eyesDark' | 'cloth' | 'clothDark' | 'clothLight' | 'mouth' | 'ink' | 'white' | `#${string}`;

export interface Shape {
  d: string;
  /** Fill tone (or the stroke tone for `st`). */
  c: Tone;
  /** Material of the ramp; default by tone (skin, hair, cloth, else matte). */
  m?: Material;
  /** Cel shadow band: the part minus itself moved up by `sh` units. */
  sh?: number;
  /** Highlight sliver: the part minus itself moved down by `hl` (and right by half). */
  hl?: number;
  /** Outline width in units (default 3.5 on filled shapes, 0 = none). */
  ln?: number;
  /** Outline colour: the outer line (default) or the softer interior line. */
  lc?: 'line' | 'inner' | Tone;
  /** Stroke-only line drawn with tone `c` at width `ln` (round caps). */
  st?: boolean;
  /** Opacity. */
  op?: number;
  /** Dropped at low detail (below 48 px): interior lines, freckles, stitching, shapes under 6 units. */
  lo?: boolean;
  /** Casts a soft shadow of itself onto the face, moved down by this many units. */
  cast?: number;
  /** A CSS class for idle motion (blink, sway, glint). */
  fx?: string;
  /** Fill with a gradient instead of a flat tone (skies and glows only, AUDIT §3.1). */
  grad?: { kind: 'radial' | 'linear'; stops: [number, Tone, number?][]; cx?: number; cy?: number; r?: number; angle?: number };
}

export interface PartArt {
  layers: Partial<Record<Layer, Shape[]>>;
  /** Hair: the short version shown under headwear that caps the hair (default: side tufts). */
  capped?: Partial<Record<Layer, Shape[]>>;
  /** Headwear: covers the top of the head, so front hair switches to its capped version. */
  capsHair?: boolean;
  /** Headwear: hides the back hair (full hoods and helmets). */
  hidesHairBack?: boolean;
  /** Headwear: hides the brows (full helmets). */
  hidesBrows?: boolean;
  /** Headwear: hides the ears. */
  hidesEars?: boolean;
  /** Legendary aura on the bust (A12 "white Legendary aura"). */
  aura?: boolean;
}

export type PartLibrary = Record<string, PartArt>;
