/**
 * The art swap contract (DESIGN B15 `art.ts`, B5, A11).
 *
 * Implemented by `src/visuals` (WP4); consumed by `render` (WP5) and `capsule` (WP10) through
 * injection. Gameplay data references only `visualId`; the manifest maps it to a `VisualDef` (B5).
 * The sim owns all timing, so replacing art can never change balance (B5).
 *
 * Pixi types are referenced as type-only `import()` types, so this module has no runtime imports (B2).
 */
import type { AgeId, CardId, CosmeticKey, EffectId, Foil, Pt, RoleGroup, Side, SideLook, SkinId, SoundId, TeamPreset, VisualId } from './ids';

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
  /**
   * A side's base. `skins` (save v14, PLAN 2c): the base skin per age as art skin ids (`frost_cave`,
   * `crystal_spire`), resolved as `base.<age>@<skin>`; each age shows its own and the view morphs
   * between them on an evolve. `skin` (older callers): one skin applied to whichever age has an entry
   * for it; `skins[age]` wins over it. An age whose skin has no model draws its plain base.
   */
  createBase(o: { age: AgeId; skin?: SkinId; skins?: Partial<Record<AgeId, SkinId>>; side: Side; teamPreset: TeamPreset }): BaseView;
  /**
   * `skins`: each half's backdrop skin (`backdrop.<id>`, A18.9.4; the "Sky" from save v14), left =
   * side 0; absent or null draws that half's classic sky. `scenes` (save v14, PLAN 2b): each half's
   * scene per age (`scene.<id>`); an age without one shows its classic scene, and an evolve wipes to
   * the new age's scene from the same map. Optional: providers that do not know them ignore them.
   */
  createBackdrop(o: {
    left: AgeId;
    right: AgeId;
    arena: string;
    skins?: { left?: CosmeticKey | null; right?: CosmeticKey | null };
    scenes?: { left?: Partial<Record<AgeId, CosmeticKey>>; right?: Partial<Record<AgeId, CosmeticKey>> };
  }): BackdropView;
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

// ---------------------------------------------------------------------------------------------
// Card detail showcase (ui-plan 4.4, owner request 2026-10-07): a live stage where a card's real
// battle art moves and shows its attacks. Presentation only: no sim, no gameplay timing. The render
// layer implements `ShowcaseMount` with the injected `ArtProvider`; the UI receives it through its
// `ShowcaseContext` (the UI may not import render or Pixi, B2) and keeps the still portrait until
// `ready` resolves true.

/** One move of the showcase. Troops: walk, idle, the attack variants, the specials, a hit and a KO. */
export type ShowcaseMove =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'attack_b'
  | 'attack_c'
  | 'attack_alt'
  | 'ability'
  | 'summon'
  | 'hit'
  | 'ko'
  | 'build'
  | 'fire'
  | 'spawn'
  | 'trigger'
  | 'cast';

/** What the stage plays and how it may sound. `content` is the compiled content (read-only). */
export interface ShowcaseRequest {
  card: CardId;
  skin: SkinId | null;
  /** Card level: the battle's level trim under the unit. */
  level: number;
  /** An unowned card plays as a dark silhouette (the album rule). */
  silhouette: boolean;
  teamPreset: TeamPreset;
  /** Reduce motion: the stage idles and plays a move only when asked (one tap, one move). */
  reduceMotion: boolean;
  /** Lite graphics: fewer particles, no footfall dust. */
  lite: boolean;
  /** The compiled content (read-only); absent: the mount's own (`showcaseMount(art, { content })`). */
  content?: import('./content').CompiledContent;
  /** The UI's sound hook (it follows the player's sound settings); absent = silent. */
  sound?: (id: SoundId, o?: { pitchBp?: number; volumeDb?: number }) => void;
  /**
   * Where the stage's floor is, as fractions of the host box: the ground line, and the box an overlay
   * covers (the lg card in the bottom-left corner); the action is framed to its right.
   */
  frame?: { groundY: number; coverRight: number; coverTop: number };
}

/** The stage's state for the UI's caption and play/pause button. */
export interface ShowcaseState {
  /** True while the live art draws (the still portrait is hidden). */
  live: boolean;
  /** The move playing now. */
  move: ShowcaseMove;
  /** 1-based variant number for attack moves (`attack_b` is 2), else 0; with `of`, "Attack 2/3". */
  index: number;
  of: number;
  /** The ability kind the `ability` move shows (`pounce`, `callStrike`, ...), else null. */
  ability: string | null;
  /** True while the showcase loop plays by itself. */
  auto: boolean;
  /** The moves this card shows, in cycle order. */
  moves: readonly ShowcaseMove[];
}

export interface ShowcaseHandle {
  /** Resolves true once the live stage draws, false when it cannot (no WebGL, no art): keep the still. */
  readonly ready: Promise<boolean>;
  state(): ShowcaseState;
  /** Plays one move now and pauses the loop; without a move, the next one in cycle order. */
  play(move?: ShowcaseMove): void;
  /** Resumes (true) or pauses (false) the loop. Pausing lets the current move finish, then idles. */
  setAuto(on: boolean): void;
  /** Applies a changed skin, level, ownership, team preset, motion setting or sound hook. */
  update(patch: Partial<Pick<ShowcaseRequest, 'skin' | 'level' | 'silhouette' | 'teamPreset' | 'reduceMotion' | 'lite' | 'sound' | 'frame'>>): void;
  /** A level-up: the unit cheers (MR-39 follow-through on the stage). */
  celebrate(): void;
  /** Stops drawing while hidden (tab hidden, scrolled away); the loop resumes where it was. */
  setVisible(on: boolean): void;
  subscribe(fn: (s: ShowcaseState) => void): () => void;
  /** Destroys the stage: views, its Pixi app and its GPU context; leased sheets are released. */
  destroy(): void;
}

/** Mounts a showcase stage into `host` (a positioned element the stage fills). */
export type ShowcaseMount = (host: HTMLElement, req: ShowcaseRequest) => ShowcaseHandle;

// ---------------------------------------------------------------------------------------------
// Customize diorama (PLAN 2a "Backdrop and base-skin previews", ui-plan 4.5 PreviewStage): a live
// half of the lane with a side's look: its scene and sky, its base (model, flags, decorations) and two
// idle turrets. Presentation only, like the card showcase: the render layer implements
// `DioramaMount` with the injected `ArtProvider` (`createBackdrop`, `createBase`, `createBaseDressing`),
// the UI receives it through its `DioramaContext` and keeps its still picture until `ready` resolves
// true (or for good when it resolves false: no WebGL, no art).

/** What the diorama shows. */
export interface DioramaRequest {
  /** The age shown: its base, the base skin of that age and the scene of that age. */
  age: AgeId;
  /** Whose half: 0 is the player's (left, blue). */
  side: Side;
  /** The side's look: flags, decorations, base skins per age, the sky (`backdrop`) and the scenes per age. */
  look: SideLook;
  /**
   * The scene shown for `age` in place of `look.scenes[age]` (a tile being tried on; the plan's
   * `sceneOf`): `scene.<id>`, or null for the age's classic scene; absent keeps the look's.
   */
  scene?: CosmeticKey | null;
  /** The sky shown in place of `look.backdrop` (`backdrop.<id>`), or null for none; absent keeps the look's. */
  sky?: CosmeticKey | null;
  /**
   * The base skin per age as art skin ids, the same map the battle passes to `createBase` (the look's
   * `baseSkins` without their `baseSkin.` prefix, with the troop-system skin of an age, Crystal Spire,
   * in its place). Absent: derived from `look.baseSkins`.
   */
  baseSkins?: Partial<Record<AgeId, SkinId>>;
  /** Crumble stage shown (the Damage toggle steps 0-3): the model's quality and that the mounts stay put. */
  crumble: 0 | 1 | 2 | 3;
  teamPreset: TeamPreset;
  /** Reduce motion: a still frame, the weather paused. */
  reduceMotion: boolean;
  /** Lite graphics: half the particles and sprites. */
  lite: boolean;
}

export interface DioramaHandle {
  /** Resolves true once the live stage draws, false when it cannot (no WebGL, no art): keep the still. */
  readonly ready: Promise<boolean>;
  /** Applies a changed look, age, try-on, crumble stage, team preset or motion setting. */
  update(patch: Partial<Omit<DioramaRequest, 'side'>>): void;
  /** Stops drawing while hidden (tab hidden, scrolled away). */
  setVisible(on: boolean): void;
  /** Destroys the stage: views, its Pixi app and its GPU context; leased sheets are released. */
  destroy(): void;
}

/** Mounts a diorama into `host` (a positioned element the stage fills). */
export type DioramaMount = (host: HTMLElement, req: DioramaRequest) => DioramaHandle;
