/**
 * The art swap contract (DESIGN B15 `art.ts`, B5, A11).
 *
 * Implemented by `src/visuals` (WP4); consumed by `render` (WP5) and `capsule` (WP10) through
 * injection. Gameplay data references only `visualId`; the manifest maps it to a `VisualDef` (B5).
 * The sim owns all timing, so replacing art can never change balance (B5).
 *
 * Pixi types are referenced as type-only `import()` types, so this module has no runtime imports (B2).
 */
import type { AgeId, CardId, CosmeticKey, EffectId, Foil, Pt, RoleGroup, Side, SideLook, SkinId, TeamPreset, VisualId } from './ids';

export type ClipName = 'spawn' | 'idle' | 'walk' | 'attack' | 'hit' | 'stun' | 'die' | 'victory' | 'ability';

export interface ClipRef {
  kind: 'keyframes' | 'atlas' | 'spine';
  ref: string;
  durationMs: number;
  loop: boolean;
}

/** Attachment points in local lu (DESIGN B5). */
export interface Anchors {
  feet: Pt;
  head: Pt;
  muzzle: Pt;
  hitCenter: Pt;
}

/** How an adapter provides the team tint layer (DESIGN B5 Team colour contract). */
export type TeamSpec =
  | { kind: 'zones'; zones: string[] }
  | { kind: 'mask'; maskTextures: string[] }
  | { kind: 'slots'; slots: string[] };

/** A visual manifest entry (DESIGN B5). `kind` picks the adapter. */
export interface VisualDef {
  kind: 'placeholder' | 'procedural' | 'atlas' | 'spine';
  source: string;
  anchors: Anchors;
  heightLu: number;
  team: TeamSpec;
  clips: Partial<Record<ClipName | string, ClipRef>>;
  /** Normalised 0..1 point of the attack clip where the impact lands (DESIGN B5). */
  events: { attack: { impactAt: number } };
  projectileVisualId?: VisualId;
  filters?: { alpha?: number; glow?: string };
}

/** Per-frame pose pushed by the battle view (DESIGN B6). */
export interface UnitPose {
  x: number;
  y: number;
  facing: 1 | -1;
  hpBp: number;
  shieldBp: number;
  stunned: boolean;
  frozen: boolean;
  alpha: number;
  levelTrim: 'none' | 'bronze' | 'silver' | 'gold';
  roleGlyph: RoleGroup;
}

export interface UnitView {
  readonly root: import('pixi.js').Container;
  readonly anchors: Anchors;
  setPose(p: UnitPose): void;
  /** `impactAtMs` time-scales the clip so its impact lands on the sim's impact tick (DESIGN B5). */
  play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean }): void;
  /** Local hitstop (DESIGN A12). */
  freeze(ms: number): void;
  flash(ms: number, color?: number): void;
  update(dtMs: number): void;
  destroy(): void;
}

export interface TurretView {
  readonly root: import('pixi.js').Container;
  aimAt(x: number): void;
  play(clip: 'build' | 'idle' | 'fire' | 'sell' | 'modernise'): void;
  /** Shows the Modernise arrow (DESIGN A2.8). */
  setOutdated(on: boolean): void;
  update(dtMs: number): void;
  destroy(): void;
}

export interface BaseView {
  readonly root: import('pixi.js').Container;
  /** Four mounts stacked vertically; index is visual only (DESIGN A2.8). */
  mountPoints(): Pt[];
  setCrumble(stage: 0 | 1 | 2 | 3): void;
  setTreasury(level: number): void;
  morphTo(age: AgeId, ms: number): void;
  lastStandGlow(on: boolean): void;
  hit(): void;
  collapse(): void;
  update(dtMs: number): void;
  destroy(): void;
}

export interface BackdropView {
  readonly root: import('pixi.js').Container;
  setSeam(x: number): void;
  wipe(side: Side, age: AgeId, ms: number): void;
  update(dtMs: number): void;
  destroy(): void;
  /** Weather lightning since the last call (lane x in lu), so the view can play its thunder. Optional. */
  drainStrikes?(): readonly { side: Side; x: number }[];
}

export interface EffectView {
  readonly root: import('pixi.js').Container;
  fly(from: Pt, to: Pt, travelMs: number, arc: boolean): void;
  playAt(at: Pt, o?: Record<string, number>): void;
  readonly done: boolean;
  update(dtMs: number): void;
  destroy(): void;
}

/**
 * A side's base cosmetics in the lane (DESIGN A18.9.4): the flags on their poles, the decorations in
 * their fixed anchors (never over mounts or the HP bar) and the base skin's restyle. Attached to the
 * base view's root by the battle view; purely cosmetic.
 */
export interface BaseDressingView {
  readonly root: import('pixi.js').Container;
  /** The base changed age (a morph of `ms`): swap to that age's base skin and re-seat the props. */
  setAge(age: AgeId, ms: number): void;
  /** The base took a big hit (flags flutter harder). */
  hit(): void;
  /** Stage 3 crumble or collapse: the props topple. */
  collapse(): void;
  setMotion(o: { reduce: boolean; lite: boolean }): void;
  update(dtMs: number): void;
  destroy(): void;
}

/** Per-frame pose of a fort (DESIGN A16.14.8, B5): stages and flags derived from sim state by the view. */
export interface FortPose {
  x: number;
  y: number;
  hpBp: number;
  /** Scaffold progress, bp (10,000 = complete). */
  scaffoldBp: number;
  /** How far decay has eaten the fort, bp of max HP (drives the crack overlay). */
  decayBp: number;
  crumbleStage: 0 | 1 | 2 | 3;
  /** Trap charge pips. */
  charges?: number;
  /** A tower jammed by Suppress. */
  silenced: boolean;
  /** Ms until a tower's next shot (the renderer plays the 200 ms `windup` pose from it; the sim keeps 0% windup). */
  nextAttackInMs?: number;
}

/** A fort view (walls, towers, camps, traps): a static rig with `scaffold`, `build`, `idle`, `hit`, `crumble1-3`, `collapse`, ... clips. */
export interface FortView {
  readonly root: import('pixi.js').Container;
  setPose(p: FortPose): void;
  play(clip: string, o?: { durationMs?: number; loop?: boolean }): void;
  freeze(ms: number): void;
  flash(ms: number, color?: number): void;
  update(dtMs: number): void;
  destroy(): void;
}

/** The injected art provider (DESIGN B5). */
export interface ArtProvider {
  /** Bakes the given ages (Stone/Medieval at boot, the rest lazily; DESIGN B5). */
  preload(ages: AgeId[]): Promise<void>;
  createUnit(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): UnitView;
  createTurret(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): TurretView;
  /**
   * A fort (`fort.<slug>`, A16.14.8). Optional until F3 draws the rigs: without it the battle view shows a
   * fort through `createUnit` (its twin's visual id falls back to a placeholder).
   */
  createFort?(o: { visualId: VisualId; side: Side; teamPreset: TeamPreset; kind: 'wall' | 'tower' | 'camp' | 'trap' }): FortView;
  createBase(o: { age: AgeId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): BaseView;
  /**
   * `skins`: each half's backdrop skin (`backdrop.<id>`, A18.9.4), left = side 0; absent or null
   * draws that half's classic sky. Optional: providers that do not know skins ignore it.
   */
  createBackdrop(o: { left: AgeId; right: AgeId; arena: string; skins?: { left?: CosmeticKey | null; right?: CosmeticKey | null } }): BackdropView;
  createProjectile(visualId: VisualId, side: Side): EffectView;
  createEffect(effectId: EffectId, o?: Record<string, number>): EffectView;
  /** Base flag, national flag, decorations and skin restyle of one side (A18.9.4); optional. */
  /**
   * `base`: the side's base view; the dressing attaches itself to its root and restyles its body
   * (a base view may offer a duck-typed `setSkinTint(tint | null)`).
   */
  createBaseDressing?(o: { age: AgeId; side: Side; look: SideLook; teamPreset: TeamPreset; base?: BaseView }): BaseDressingView;
  /** Data URL, cached by (card, skin, size) (DESIGN B5 Portraits). */
  portrait(o: { card: CardId; skin?: SkinId; foil?: Foil; size: number; side?: Side }): Promise<string>;
}
