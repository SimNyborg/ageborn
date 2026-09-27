/**
 * Data model of the procedural art tier (DESIGN B5 "Procedural v1"). Everything here is plain data:
 * parts are SVG path data in lu, puppets are a skeleton plus slots that place parts on bones, and
 * clips are keyframes on bones. Adapters turn this data into Pixi views; tests rasterise it.
 *
 * Nothing in this file (or in the part and puppet libraries) imports Pixi, so the handoff sheets,
 * the silhouette test and the colour-rule test read exactly what the game draws.
 */
import type { Anchors } from '@/contracts/art';
import type { AgeId, RoleGroup } from '@/contracts/ids';
import type { Palette } from './palette';

/** One filled, outlined shape of a part. */
export interface LayerDef {
  /** SVG path data in lu, part-local (pivot at 0, 0). */
  d: string;
  /** Palette zone (`team*` zones are tinted at runtime) or a literal '#rrggbb'. */
  zone: string;
  /** Cel shadow: 'auto' crescent (default for big enough shapes), a custom path, or none. */
  shade?: 'auto' | string | false;
  /** One highlight shape: 'auto' (default), a custom path, or none. */
  light?: 'auto' | string | false;
  /** Outline width in lu; default STYLE.outlineLu; 0 = no outline. */
  line?: number;
  /** Fill opacity (effects and glass). */
  alpha?: number;
  /** A banner-type team layer: striped for the opponent in the high-contrast preset (A11). */
  banner?: boolean;
}

export interface PartDef {
  id: string;
  layers: readonly LayerDef[];
}

export interface BoneDef {
  id: string;
  parent: string | null;
  /** Rest offset from the parent bone's origin, lu. */
  x: number;
  y: number;
  /** Rest rotation, degrees (clockwise on screen, since y points down). */
  rot?: number;
  sx?: number;
  sy?: number;
}

/** Visibility rule for base states (crumble stage, Treasury level). */
export interface SlotWhen {
  crumbleMin?: number;
  crumbleMax?: number;
  treasuryMin?: number;
}

export interface SlotDef {
  /** Unique within a puppet; defaults to the part id. */
  id?: string;
  part: string;
  bone: string;
  /** Draw order (higher on top). */
  z: number;
  x?: number;
  y?: number;
  rot?: number;
  sx?: number;
  sy?: number;
  /** Far-side limbs are drawn darker for depth. */
  tone?: 'back';
  /**
   * weapon: excluded from the body-width check; prop: drops and stays 6 s on death (A11 die);
   * overlay: skin overlay (counted by the silhouette test like any other part).
   */
  tag?: 'weapon' | 'prop' | 'overlay';
  when?: SlotWhen;
  /** Slot opacity (glass canopies, ghosts). */
  alpha?: number;
}

export type RigKind = 'biped' | 'quadruped' | 'rider' | 'vehicle' | 'walker' | 'flyer' | 'turret' | 'base' | 'sprite';

/** Which clips a puppet uses: rig clip-set names resolved by `clips/`. */
export interface MotionSpec {
  /** Clip-set family, e.g. 'biped', 'quadruped', 'vehicle'. */
  family: string;
  /** Attack clip id (e.g. 'biped.attack.swing'). */
  attack: string;
  /** Card-specific ability clip id, or a generic flourish. */
  ability: string;
  /** Idle flourish (weapon twirl) bone, if any. */
  twirlBone?: string;
  /** Gait parameters. */
  strideLu?: number;
  /** The unit hovers (air units): idle and walk bob in the air. */
  air?: boolean;
}

/** A complete procedural visual: a skeleton, parts on bones, a palette. */
export interface PuppetDef {
  /** Source key, equal to the manifest's `VisualDef.source` (e.g. 'unit.bonker', 'unit.bonker@pumpkin_head'). */
  id: string;
  kind: 'unit' | 'turret' | 'base' | 'projectile' | 'sprite';
  rig: RigKind;
  age: AgeId | null;
  bones: readonly BoneDef[];
  slots: readonly SlotDef[];
  palette: Palette;
  /** Authored standing height (feet to top), lu. */
  heightLu: number;
  anchors: Anchors;
  motion: MotionSpec;
  /** Normalised impact point of the attack clip. */
  impactAt: number;
  /** Role group (placeholder shape, ground-ring glyph default). */
  group?: RoleGroup;
  /** Collision size class (width check). */
  size?: 'small' | 'medium' | 'large' | 'huge';
  legendary?: boolean;
  /** Whole-body translucency (skins may go down to 0.7, A5.8). */
  alpha?: number;
  /** Idle aura: legendary white glow, snow, ... */
  aura?: 'legendary' | 'snow' | 'ghost' | 'neon' | null;
  /** Projectile visual override (skins). */
  projectileVisualId?: string;
  /** For skins: the base puppet id. */
  skinOf?: string;
}

// ---------------------------------------------------------------------------------------------
// Clips

export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'outBack' | 'step';

/** A keyframe on one bone; values are deltas from the rest pose (degrees, lu, scale multipliers). */
export interface Key {
  /** Normalised time 0..1. */
  t: number;
  r?: number;
  x?: number;
  y?: number;
  sx?: number;
  sy?: number;
  /** Easing into this key from the previous one. */
  e?: Ease;
}

/** Procedural motion helpers mixed into a clip (walk cycles, bobs, spinning wheels). */
export type ProcId =
  | 'breathe'
  | 'walkBiped'
  | 'walkQuad'
  | 'walkWalker'
  | 'rollVehicle'
  | 'hover'
  | 'spinRotor'
  | 'riderBounce'
  | 'dizzy'
  | 'tremble';

export interface ClipDef {
  id: string;
  durationMs: number;
  loop: boolean;
  /** Normalised impact point for attacks (DESIGN B5: the view time-scales so it lands on the sim tick). */
  impactAt?: number;
  tracks: Readonly<Record<string, readonly Key[]>>;
  proc?: readonly ProcId[];
  /** Whole-puppet opacity keys (die fade). */
  alpha?: readonly { t: number; v: number }[];
}

/** A bone's pose delta from rest. */
export interface BoneDelta {
  r: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
}
