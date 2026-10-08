/**
 * `AtlasAnimView` tier (DESIGN B5 "Later tiers"): pre-rendered sprite sheets, e.g. from the
 * `art/blender` pipeline or AssetPack, loaded as Pixi spritesheets.
 *
 * A unit moves to sprite sheets by editing its manifest entry only (`OVERRIDES` in manifest.ts);
 * `atlasVisualDef()` builds that entry from the sheet's JSON:
 *
 *   'unit.bonker': {
 *     kind: 'atlas', source: 'art/units/bonker.json',      // URL, relative to the app base
 *     anchors, heightLu,                                    // from meta.ageborn (same pivots)
 *     team: { kind: 'mask', maskTextures: ['_team'] },      // `<frame>_team` tint underlay
 *     clips: { idle: { kind: 'atlas', ref: 'idle', durationMs: 1000, loop: true }, ... },
 *     events: { attack: { impactAt: 0.5 } },                // start of the contact frame
 *   }
 *
 * Sheet format (PixiJS spritesheet JSON): frames anchored at the feet, `animations[<clip>]` and
 * `animations[<clip>_team]` (grey team surfaces, drawn tinted UNDER the base frame, whose team
 * surfaces are holes), `meta.scale`, and `meta.ageborn` with `pxPerLu`, `anchorsLu` (x right, y up)
 * and per-clip `durationsMs` / `loop` / `impactAt` (art/blender/README.md).
 *
 * Timing follows the same contract as the procedural tier: `play('attack', { impactAtMs })` warps
 * the clip so the contact frame starts exactly at the sim's impact tick (B5). Clips a sheet lacks
 * fall back (spawn, stun, victory → idle frames with code motion; ability → attack). Ground rings,
 * role glyphs, trims and status overlays come from the shared procedural parts, so every tier shows
 * the same team cues. Units and one-shot effects are supported; turrets, bases and backdrops in an
 * atlas entry draw as placeholders until needed.
 */
import { Assets, Container, Sprite, Texture, type Spritesheet } from 'pixi.js';
import type { Anchors, BackdropView, BaseView, ClipName, ClipRef, EffectView, TurretView, UnitPose, UnitView, VisualDef } from '@/contracts/art';
import type { AgeId, Pt, RoleGroup, Side } from '@/contracts/ids';
import { clipU } from '../animator';
import type { PartBaker } from '../bake';
import { FX_ZONES } from '../effects/sprites';
import { teamColor, TRIM_COLORS } from '../palette';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { CLIP_TIMING, STYLE } from '../style';
import { BLOCKING_UNIT_SHEET_AGES, unitSheetAge } from '../unitSheetPaths';
import type { ClipDef } from '../types';
import { puppetById } from '../library';
import { renderPortrait } from '../portraits';
import { portraitStillBase, renderStillPortrait } from './atlasPortrait';
import { partSprite, PuffList, tintPartSprite } from './procedural/shared';
import { AtlasBaseView } from './world/atlasBaseView';
import { AtlasTurretView } from './world/atlasTurretView';
import { isWorldSource, WorldAtlas, worldSourceAge } from './worldAtlas';
import { renderWorldPortrait } from './worldPortrait';
import {
  ALT_ATTACK,
  ALT_LATE_MIN_MS,
  ATTACK_VARIANTS,
  attackCycle,
  attackTimeline,
  CROSS_HOLD_MS,
  crossHoldAlpha,
  easeExp,
  EXTRA_CLIPS,
  extrasSheetUrl,
  FRAME_LOCK_CATCH_UP_TAU_MS,
  FRAME_LOCK_MAX_LU,
  FRAME_LOCK_RELEASE_TAU_MS,
  FRAME_LOCK_SETTLE_TAU_MS,
  frameLockOffset,
  gaitWalkDurationMs,
  hitSquash,
  hoverBob,
  hovers,
  HOVER_AMP_LU,
  HOVER_PERIOD_MS,
  HOVER_TILT_RAD,
  HOVER_TILT_TAU_MS,
  impactStepOf,
  LEAN_TAU_MS,
  leanTarget,
  legacyGait,
  loopStepAt,
  mergeExtras,
  pickAttackVariant,
  plantsFeet,
  RETREAT_TURN_MS,
  RETREAT_UNTURN_MS,
  spawnPop,
  SPAWN_POP,
  timelineImpactMs,
  timelineStepAt,
  TURN_MS,
  turnScale,
  UNIT_GAITS,
  walkDirection,
  type TimelineSeg,
  type UnitGait,
} from './atlasMotion';

/** Fort sheets (`art/forts/<age>/<slug>.json`, A16.14.8) are not unit sheets. */
function isFortSource(source: string): boolean {
  return /art\/forts\//.test(source);
}
import type { BackdropRequest, BaseRequest, EffectRequest, PortraitRequest, ViewKind, ViewRequest, VisualAdapter } from './types';

/** What the adapter needs from a loaded sheet (a Pixi Spritesheet, or a fake in tests). */
export interface AtlasData {
  animations: Readonly<Record<string, readonly Texture[]>>;
  /** Scale of the sheet (texture units per lu = `meta.scale / meta.ageborn.pxPerLu`). */
  luPerUnit: number;
  clips: Readonly<Record<string, AtlasClipMeta>>;
  /** The sheet's own `heightLu`: an entry drawing it at another height (a levy at 0.85) scales the sprite. */
  heightLu?: number;
  /** Body type of the walk (ANIM_SPEC 2.1, `meta.ageborn.gait`); absent on sheets made before the spec. */
  gait?: UnitGait;
  /** Frame name -> texture, and animation -> frame names (extras sheets reuse core frames by name, P3/P4). */
  textures?: Readonly<Record<string, Texture>>;
  frameNames?: Readonly<Record<string, readonly string[]>>;
}

export interface AtlasClipMeta {
  durationsMs?: readonly number[];
  durationMs?: number;
  loop?: boolean;
  impactAt?: number;
  /** Frame index per step (steps may repeat frames); per-frame anchors are indexed by frame. */
  sequence?: readonly number[];
  /**
   * Attack clips: the unique frame of the impact (an index into the frames `sequence` plays, not a
   * step). The runtime finds the impact step from `impactAt`, then `impactStep`, then this frame
   * mapped through `sequence` (`impactStepOf`).
   */
  impactFrame?: number;
  /** Attack clips: the step of the impact (its start is `impactAt`); written by the pipeline since review B2. */
  impactStep?: number;
  /** Attack clips (R5): the held anticipation step that absorbs any extra sim wind-up. */
  holdStep?: number;
  /** Attack clips (R5): two steps that alternate while a long hold lasts (fuse fizz, aim wobble). */
  holdLoop?: readonly [number, number];
  /** Attack clips (R4): where the projectile leaves on the impact frame (lu from the feet, x forward, y up). */
  muzzle?: readonly [number, number];
  /** Per-frame anchors (lu from the feet, y up): `muzzle`, `riderMuzzle`, `mgMuzzle`, ... */
  anchorsLu?: Readonly<Record<string, readonly (readonly [number, number] | null)[]>>;
  /** Walk only: ground speed at the authored timing (feet do not slide at this speed). */
  naturalSpeedLuPerS?: number;
  /** Walk only (P2): the steps where a foot plants, and where (x lu from the feet anchor, or [x, y]). */
  contacts?: readonly { step: number; foot?: string; atLu?: number | readonly [number, number] }[];
  /** Die only: shared effects to spawn (the death hand-off) and when the body disappears. */
  fx?: readonly { id: string; atMs: number; offsetLu?: readonly [number, number]; scale?: number; loops?: number }[];
  hideUnitAtMs?: number;
}

/** The `meta.ageborn` block written by the art pipeline. */
export interface AtlasMeta {
  visualId?: string;
  heightLu: number;
  pxPerLu: number;
  anchorsLu?: Partial<Record<'head' | 'hitCenter' | 'muzzle', readonly [number, number]>>;
  clips: Record<string, AtlasClipMeta>;
  team?: { mode: string; frameSuffix: string };
  gait?: string;
}

/** A known gait name, or undefined. */
export function asGait(g: unknown): UnitGait | undefined {
  return typeof g === 'string' && (UNIT_GAITS as readonly string[]).includes(g) ? (g as UnitGait) : undefined;
}

/** Atlas units move in the cartoon style (A11, owner decision 2026-09-30); 'realistic' keeps MR-100/103/105. */
export type AtlasMotionStyle = 'cartoon' | 'realistic';

export interface AtlasJson {
  animations?: Record<string, string[]>;
  meta: { scale?: string | number; ageborn?: AtlasMeta };
}

const UNIT_CLIPS: readonly ClipName[] = ['spawn', 'idle', 'walk', 'attack', 'hit', 'stun', 'die', 'victory', 'ability'];
/** Clips that loop; every other clip plays once (and never inherits the loop of the clip it falls back to). */
const LOOP_CLIPS: ReadonlySet<string> = new Set(['idle', 'walk', 'victory', 'stun']);

/**
 * Weight of the rendered (atlas) units by mass class: light (infantry, ranged, support), medium
 * (anti-armor, taller than 90 lu), heavy (the Heavy class, or taller than 150 lu). The hit flinch
 * (MR-103) applies in both motion styles. The drop-in spawn (MR-100) and the lie-and-sink death
 * (MR-105) belong to the parked 'realistic' style only; the default 'cartoon' style pops, squashes
 * and hands its KO pose to the poof (`AtlasMotionStyle`, ANIM_SPEC R6, docs/requests/wp4-cartoon-runtime-motion.md).
 */
export type UnitMass = 'light' | 'medium' | 'heavy';
export const UNIT_WEIGHT: Readonly<
  Record<UnitMass, { spawnMs: number; dropLu: number; settleLu: number; flinchLu: number; flinchMs: number }>
> = {
  // MR-100: drop the last lu into the stance and settle (heavier: longer, lower).
  // MR-103: light units flinch back 4-6 px, medium 2-3 px, heavy 1 px; back over 120-200 ms.
  light: { spawnMs: 200, dropLu: 10, settleLu: 0.8, flinchLu: 5, flinchMs: 140 },
  medium: { spawnMs: 240, dropLu: 12, settleLu: 1.4, flinchLu: 2.5, flinchMs: 170 },
  heavy: { spawnMs: 300, dropLu: 14, settleLu: 2.4, flinchLu: 1, flinchMs: 200 },
};
/** MR-105: after the fall the body lies this long, then sinks and fades. */
export const DEATH_LIE_MS = 600;
export const DEATH_FADE_MS = 300;
const DEATH_SINK_LU = 3;

/** The mass class of a unit from its role and height. */
export function unitMass(group: RoleGroup | null, heightLu: number): UnitMass {
  if (group === 'heavy' || heightLu > 150) return 'heavy';
  if (group === 'antiArmor' || heightLu > 90) return 'medium';
  return 'light';
}

/**
 * Owner feedback 2026-10-02 ("they float"): code motion layered on the walk sheet, so every unit
 * steps. Two bounces per walk cycle (one per foot), lowest at contact, plus a small side-to-side
 * sway; heavier units bounce less and barely sway. `phase` is the walk clip's progress, 0..1.
 * Returns the y offset (lu, + is down) and the rotation (radians).
 */
export const WALK_STEP: Readonly<Record<UnitMass, { bobLu: number; swayRad: number }>> = {
  light: { bobLu: 4, swayRad: 0.06 },
  medium: { bobLu: 3, swayRad: 0.035 },
  heavy: { bobLu: 2, swayRad: 0.012 },
};
export function walkStep(mass: UnitMass, phase: number): { y: number; rot: number } {
  const w = WALK_STEP[mass];
  const a = (((phase % 1) + 1) % 1) * Math.PI * 2;
  return { y: -Math.abs(Math.sin(a)) * w.bobLu, rot: Math.sin(a) * w.swayRad };
}

/** MR-100 spawn arrival: y offset (lu, + is down) and alpha at `t` ms. */
export function spawnArrival(mass: UnitMass, t: number): { y: number; alpha: number } {
  const w = UNIT_WEIGHT[mass];
  const u = Math.max(0, Math.min(1, t / w.spawnMs));
  const alpha = Math.min(1, u / 0.3);
  if (u < 0.5) {
    // the last few lu of a drop, accelerating (gravity)
    const f = u / 0.5;
    return { y: -w.dropLu * (1 - f * f), alpha };
  }
  // the landing: knees take the weight, one small settle below the stance, then back (no squash)
  const g = (u - 0.5) / 0.5;
  return { y: w.settleLu * Math.sin(g * Math.PI) * (1 - 0.35 * g), alpha };
}

/** MR-103 hit reaction: the flinch offset (lu, backwards) at `t` ms: out fast, back with one overshoot. */
export function flinchOffset(mass: UnitMass, t: number): number {
  const w = UNIT_WEIGHT[mass];
  const u = t / w.flinchMs;
  if (u <= 0 || u >= 1) return 0;
  if (u < 0.2) return w.flinchLu * Math.sin((u / 0.2) * (Math.PI / 2));
  if (u < 0.75) return w.flinchLu * (1 - 1.15 * (1 - Math.cos(((u - 0.2) / 0.55) * Math.PI)) / 2);
  return -0.15 * w.flinchLu * (1 - (u - 0.75) / 0.25);
}
const FALLBACK: Readonly<Record<string, readonly string[]>> = {
  spawn: ['spawn', 'idle'],
  idle: ['idle'],
  walk: ['walk', 'idle'],
  attack: ['attack', 'idle'],
  hit: ['hit', 'idle'],
  stun: ['stun', 'hit', 'idle'],
  die: ['die', 'hit', 'idle'],
  victory: ['victory', 'idle'],
  ability: ['ability', 'attack', 'idle'],
};

/** The gait of a sheet without `meta.ageborn.gait`, from the unit's procedural puppet (its rig family). */
export function inferGait(key: string, def: VisualDef): UnitGait | null {
  const p = puppetById(key) ?? puppetById(key.split('@')[0] ?? key);
  const slug = /([a-z0-9_]+)\.json$/.exec(def.source)?.[1];
  const wheels = p?.bones.some((b) => /^wheel/.test(b.id)) ?? false;
  return legacyGait(p?.motion.family, def.heightLu, { ...(p?.motion.air ? { air: true } : {}), ...(slug ? { slug } : {}), ...(wheels ? { wheels } : {}) });
}

/** Builds a manifest entry from a sheet's JSON (see the header). */
export function atlasVisualDef(json: AtlasJson, url: string): VisualDef {
  const m = json.meta.ageborn;
  if (!m) throw new Error(`Atlas "${url}" has no meta.ageborn block`);
  const a = (k: 'head' | 'hitCenter' | 'muzzle', fb: [number, number]): Pt => {
    const v = m.anchorsLu?.[k] ?? fb;
    return { x: v[0], y: -v[1] };
  };
  const clips: Record<string, ClipRef> = {};
  for (const name of UNIT_CLIPS) {
    const src = (FALLBACK[name] ?? [name]).find((c) => json.animations?.[c] || m.clips[c]);
    if (!src) continue;
    const c = m.clips[src] ?? {};
    const summed = (c.durationsMs ?? []).reduce((x, y) => x + y, 0);
    // a one-shot clip that falls back to a loop (spawn -> idle) never loops itself (review B1)
    const loop = LOOP_CLIPS.has(name) ? (c.loop ?? (name === 'idle' || name === 'walk')) : src === name && c.loop === true;
    clips[name] = { kind: 'atlas', ref: src, durationMs: c.durationMs ?? (summed > 0 ? summed : 600), loop };
  }
  // Attack variants B and C and the second attacker's clip (ANIM_SPEC R3/R4): listed only when the
  // sheet (or its extras sheet) has them; the view falls back to A for anything that has not loaded.
  for (const name of EXTRA_CLIPS) {
    if (!json.animations?.[name] && !m.clips[name]) continue;
    const c = m.clips[name] ?? {};
    const summed = (c.durationsMs ?? []).reduce((x, y) => x + y, 0);
    clips[name] = { kind: 'atlas', ref: name, durationMs: c.durationMs ?? (summed > 0 ? summed : (clips['attack']?.durationMs ?? 600)), loop: false };
  }
  return {
    kind: 'atlas',
    source: url,
    anchors: { feet: { x: 0, y: 0 }, head: a('head', [0, m.heightLu]), muzzle: a('muzzle', [10, m.heightLu * 0.55]), hitCenter: a('hitCenter', [0, m.heightLu * 0.5]) },
    heightLu: m.heightLu,
    team: { kind: 'mask', maskTextures: [m.team?.frameSuffix ?? '_team'] },
    clips,
    events: { attack: { impactAt: m.clips['attack']?.impactAt ?? 0.5 } },
  };
}

/** Loads a sheet with Pixi Assets (the texture resolution follows `meta.scale`). */
async function loadWithAssets(url: string): Promise<AtlasData> {
  const sheet = (await Assets.load(url)) as Spritesheet;
  const data = sheet.data as unknown as AtlasJson;
  const m = data.meta.ageborn;
  const scale = Number(data.meta.scale ?? 1) || 1;
  const gait = asGait(m?.gait ?? (m?.clips['walk'] as { gait?: string } | undefined)?.gait);
  return {
    // a copy: extras sheets merge their animations into it later (P4)
    animations: { ...sheet.animations },
    luPerUnit: m ? scale / m.pxPerLu : 1,
    clips: { ...(m?.clips ?? {}) },
    ...(m?.heightLu ? { heightLu: m.heightLu } : {}),
    ...(gait ? { gait } : {}),
    textures: sheet.textures,
    ...(data.animations ? { frameNames: data.animations } : {}),
  };
}

export interface AtlasOptions {
  /** Every manifest entry of kind 'atlas' is loaded by `preload`. */
  entries: () => readonly VisualDef[];
  /** Shared baker for ground rings, glyphs, trims and overlays (the procedural tier's). */
  decor: PartBaker;
  /** Loader (tests pass a fake). */
  load?: (url: string) => Promise<AtlasData>;
  /** Base URL for relative sources (default the app base). */
  baseUrl?: string;
  /** Graphics preset (B6): Lite drops the ground shadow. */
  quality?: 'high' | 'lite';
  /**
   * Load the high-density unit sheets (`<slug>.hd.json`, 2.46 px/lu instead of 1.23) when the screen
   * draws more than about 1.3 device px per lu, so units stay as crisp as the code-drawn world
   * (see `wantsHdSheets`). Falls back to the plain sheet when an HD sheet is missing.
   */
  hd?: boolean;
  /** Runtime motion of atlas units (default 'cartoon': spawn pop, hit squash, KO hand-off; R6). */
  motionStyle?: AtlasMotionStyle;
  /** Unloads a sheet URL (tests pass a fake; default Pixi `Assets.unload`). */
  unload?: (url: string) => Promise<void> | void;
  /** How long a showcase-only sheet stays after its last lease ends, ms (default `LEASE_LINGER_MS`). */
  leaseLingerMs?: number;
}

/**
 * A showcase-only sheet stays this long after its last lease ends (ms), so going back and forth
 * between two cards, or a skin change that re-creates the stage, does not load it twice.
 */
export const LEASE_LINGER_MS = 4000;

/** A sheet held for a card detail showcase (`AtlasAdapter.lease`). */
export interface SheetLease {
  /** Resolves once the sheet (and its extras sheet, if any) has loaded or failed. */
  readonly ready: Promise<void>;
  /** True when the views must come from the showcase's HD copy (`createUnit` with `hd`). */
  readonly hd: boolean;
  /** Ends the lease; a sheet only showcases used is unloaded `leaseLingerMs` later. Idempotent. */
  release(): void;
}

/** One density of loaded unit sheets: the battle's (`main`), or the showcase's HD copies. */
interface SheetSet {
  readonly hd: boolean;
  readonly sheets: Map<string, AtlasData>;
  readonly failed: Set<string>;
  readonly pending: Map<string, Promise<void>>;
  readonly extrasPending: Map<string, Promise<void>>;
  /** The URLs a loaded sheet came from (core, then extras), for unloading. */
  readonly urls: Map<string, string[]>;
}

function sheetSet(hd: boolean): SheetSet {
  return { hd, sheets: new Map(), failed: new Set(), pending: new Map(), extrasPending: new Map(), urls: new Map() };
}

/** Device px per lu above which the HD unit sheets are worth their download (1x sheets are 1.23 px/lu). */
export const HD_SHEET_THRESHOLD_PX_PER_LU = 1.3;

/** True when units drawn at `worldPxPerLu` CSS px per lu on a `dpr` screen would upscale the 1x sheets. */
export function wantsHdSheets(worldPxPerLu: number, dpr: number): boolean {
  return worldPxPerLu * dpr > HD_SHEET_THRESHOLD_PX_PER_LU;
}

/** `art/units/<age>/<slug>.json` → `art/units/<age>/<slug>.hd.json` (other sources are unchanged). */
export function hdSheetUrl(url: string): string {
  return /art\/units\/[^?#]+(?<!\.hd)\.json$/.test(url) ? url.replace(/\.json$/, '.hd.json') : url;
}

function baseUrl(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

function mixColor(a: number, b: number, t: number): number {
  const ch = (sh: number): number => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t) << sh;
  return ch(16) | ch(8) | ch(0);
}

/** Ground ring shape (art director review fix 12). */
const RING_WIDEN = 1.2;
const RING_FLATTEN = 0.8;
const RING_ALPHA = 0.6;

export class AtlasAdapter implements VisualAdapter {
  readonly kind = 'atlas' as const;
  readonly available = true;
  /** The sheets the battle draws (at its density, `hd`). */
  private readonly main: SheetSet;
  /** Showcase-only HD copies, used while the battle draws the 1x sheets (`lease` with `hd`). */
  private readonly hdOnly: SheetSet;
  private readonly sheets: Map<string, AtlasData>;
  private readonly failed: Set<string>;
  private readonly pending: Map<string, Promise<void>>;
  /** Sources the game itself asked for (`ensure`): shared with showcases, never unloaded by them. */
  private readonly pinned = new Set<string>();
  /** Live showcase leases per set and source, and the delayed unloads of their last release. */
  private readonly leases = new Map<SheetSet, Map<string, number>>();
  private readonly unloads = new Map<SheetSet, Map<string, ReturnType<typeof setTimeout>>>();

  /** Turret and base sheets (3D world art), loaded per age. */
  readonly world: WorldAtlas;

  constructor(private readonly o: AtlasOptions) {
    this.world = new WorldAtlas((s) => this.url(s));
    this.main = sheetSet(o.hd === true);
    this.hdOnly = sheetSet(true);
    this.sheets = this.main.sheets;
    this.failed = this.main.failed;
    this.pending = this.main.pending;
    this.extrasPending = this.main.extrasPending;
  }

  private url(source: string): string {
    if (/^(https?:|data:|\/)/.test(source)) return source;
    return `${this.o.baseUrl ?? baseUrl()}${source}`;
  }

  /** Registers an already loaded sheet (tests, or sheets bundled some other way). */
  register(source: string, data: AtlasData): void {
    this.sheets.set(source, data);
  }

  canDraw(what: ViewKind, def: VisualDef): boolean {
    if (def.kind === 'atlas' && isWorldSource(def.source)) {
      // menu and card portraits composite the sheet's resting frames (worldPortrait.ts, audit #1/#2)
      if (what === 'portrait') return true;
      if (what !== 'turret' && what !== 'base') return false;
      if (this.world.get(def.source)) return true;
      void this.world.ensure(def.source);
      return false;
    }
    if (def.kind !== 'atlas') return false;
    // forts draw through `createFort` (fortViews/atlasFortView.ts); here only their card still
    if (isFortSource(def.source)) return what === 'portrait' && portraitStillBase(def.source) !== null;
    // units with a sheet also get a rendered card still (falls back to the procedural portrait)
    if (what === 'portrait') return portraitStillBase(def.source) !== null;
    if (!this.sheets.has(def.source)) {
      // a unit whose age has not streamed in yet: load it now, draw the fallback meanwhile
      if (what === 'unit' && unitSheetAge(def.source)) void this.ensure(def.source);
      return false;
    }
    return what === 'unit' || what === 'effect' || what === 'projectile';
  }

  /**
   * Loads one unit or effect sheet (once) because the game draws it; failures are remembered and
   * warned about. An ensured sheet is never unloaded by a showcase lease.
   */
  ensure(source: string): Promise<void> {
    this.pinned.add(source);
    this.cancelUnload(this.main, source);
    return this.load(this.main, source);
  }

  /** Loads a sheet into a set (once): the HD sheet where the set wants it, else (or on failure) the 1x one. */
  private load(set: SheetSet, source: string): Promise<void> {
    if (set.sheets.has(source) || set.failed.has(source)) return Promise.resolve();
    let p = set.pending.get(source);
    if (!p) {
      const load = this.o.load ?? loadWithAssets;
      const url = this.url(source);
      const hd = set.hd ? hdSheetUrl(url) : url;
      const from = { url: hd };
      p = (
        hd === url
          ? load(url)
          : load(hd).catch(() => {
              from.url = url;
              return load(url);
            })
      )
        .then((d) => {
          set.sheets.set(source, d);
          set.urls.set(source, [from.url]);
          // B, C and attack_alt stream in after the core sheet; they never block a boot or a battle (P4)
          this.loadExtras(set, source, d, from.url);
        })
        .catch((e: unknown) => {
          set.failed.add(source);
          console.warn(`[visuals] atlas "${source}" failed to load; the procedural art is drawn instead`, e);
        })
        .finally(() => set.pending.delete(source));
      set.pending.set(source, p);
    }
    return p;
  }

  /** Extras sheets in flight (ANIM_SPEC P4), by source. */
  private readonly extrasPending: Map<string, Promise<void>>;

  /**
   * Loads `<slug>.x.json` (or `.x.hd.json`) when the manifest lists variant clips the core sheet does
   * not have, and merges its animations into the loaded sheet. Views pick variants only from what has
   * loaded, so a missing or failed extras sheet just keeps attack A.
   */
  private loadExtras(set: SheetSet, source: string, core: AtlasData, coreUrl: string): void {
    const def = this.o.entries().find((d) => d.kind === 'atlas' && d.source === source);
    if (!def) return;
    const missing = EXTRA_CLIPS.filter((c) => def.clips[c] && !core.animations[def.clips[c]?.ref ?? c]);
    if (missing.length === 0) return;
    const load = this.o.load ?? loadWithAssets;
    const xUrl = extrasSheetUrl(coreUrl);
    const plainX = extrasSheetUrl(this.url(source));
    const got = { url: xUrl };
    const p = (
      xUrl === plainX
        ? load(xUrl)
        : load(xUrl).catch(() => {
            got.url = plainX;
            return load(plainX);
          })
    )
      .then((x) => {
        set.urls.set(source, [...(set.urls.get(source) ?? []), got.url]);
        const added = mergeExtras(core, x);
        if (added.length === 0) console.warn(`[visuals] extras sheet "${xUrl}" added no clips (scale mismatch or missing frames)`);
      })
      .catch((e: unknown) => console.warn(`[visuals] extras sheet for "${source}" failed to load; attack A is used`, e))
      .finally(() => set.extrasPending.delete(source));
    set.extrasPending.set(source, p);
  }

  /** Resolves once the source's extras sheet (if any) has loaded or failed (tests, screenshots). */
  async extrasReady(source: string): Promise<void> {
    await this.ensure(source);
    await this.extrasPending.get(source);
  }

  /**
   * Holds a unit sheet for a card detail showcase (docs/decisions.md, "card showcase"): loads it
   * (and its extras sheet) and keeps it until `release`. A sheet the game asked for (`ensure`) is
   * shared and stays; a sheet loaded only for showcases is unloaded `leaseLingerMs` after its last
   * lease ends, so browsing cards does not pile up decoded sheets. `hd` asks for the 2.46 px/lu sheet
   * where the battle draws the 1x one (a large stage on a 1x screen): such copies are showcase-only.
   */
  lease(source: string, o: { hd?: boolean } = {}): SheetLease {
    const set = o.hd && !this.main.hd && unitSheetAge(source) ? this.hdOnly : this.main;
    const counts = this.leases.get(set) ?? new Map<string, number>();
    this.leases.set(set, counts);
    counts.set(source, (counts.get(source) ?? 0) + 1);
    this.cancelUnload(set, source);
    const ready = (async () => {
      await this.load(set, source);
      await set.extrasPending.get(source);
    })();
    let done = false;
    return {
      ready,
      hd: set === this.hdOnly,
      release: () => {
        if (done) return;
        done = true;
        const n = (counts.get(source) ?? 1) - 1;
        if (n > 0) {
          counts.set(source, n);
          return;
        }
        counts.delete(source);
        this.scheduleUnload(set, source);
      },
    };
  }

  /** Live showcase leases on a source (tests, the dev overlay). */
  leaseCount(source: string, o: { hd?: boolean } = {}): number {
    const set = o.hd && !this.main.hd ? this.hdOnly : this.main;
    return this.leases.get(set)?.get(source) ?? 0;
  }

  /** True when the showcase's HD copy of a source is loaded (tests). */
  hasHdCopy(source: string): boolean {
    return this.hdOnly.sheets.has(source);
  }

  private cancelUnload(set: SheetSet, source: string): void {
    const timers = this.unloads.get(set);
    const t = timers?.get(source);
    if (t === undefined) return;
    clearTimeout(t);
    timers?.delete(source);
  }

  private scheduleUnload(set: SheetSet, source: string): void {
    if (set === this.main && this.pinned.has(source)) return;
    const timers = this.unloads.get(set) ?? new Map<string, ReturnType<typeof setTimeout>>();
    this.unloads.set(set, timers);
    this.cancelUnload(set, source);
    const linger = Math.max(0, this.o.leaseLingerMs ?? LEASE_LINGER_MS);
    timers.set(
      source,
      setTimeout(() => {
        timers.delete(source);
        void this.unloadNow(set, source);
      }, linger),
    );
  }

  /** Drops a showcase-only sheet (both its URLs) unless the game or a new lease wants it by now. */
  private async unloadNow(set: SheetSet, source: string): Promise<void> {
    if ((this.leases.get(set)?.get(source) ?? 0) > 0) return;
    if (set === this.main && this.pinned.has(source)) return;
    // never pull a sheet out from under a load or extras merge still in flight
    await set.pending.get(source);
    await set.extrasPending.get(source);
    if ((this.leases.get(set)?.get(source) ?? 0) > 0 || (set === this.main && this.pinned.has(source))) return;
    const urls = set.urls.get(source) ?? [];
    set.sheets.delete(source);
    set.urls.delete(source);
    set.failed.delete(source);
    const unload = this.o.unload ?? ((url: string) => Assets.unload(url));
    for (const url of urls) {
      try {
        await unload(url);
      } catch (e: unknown) {
        console.warn(`[visuals] unloading "${url}" failed`, e);
      }
    }
  }

  /** Non-world sheet sources of the given ages (sheets outside `art/units/<age>/` count for every age). */
  private unitSources(ages: readonly AgeId[]): string[] {
    const set = new Set(ages);
    // fort sheets (art/forts/...) load through the provider's fort atlas, not as unit sheets
    return [...new Set(this.o.entries().filter((d) => d.kind === 'atlas' && !isWorldSource(d.source) && !isFortSource(d.source)).map((d) => d.source))].filter((s) => {
      const a = unitSheetAge(s);
      return a === null || set.has(a);
    });
  }

  /**
   * Loads the sheets of `ages`. Unit sheets of the blocking ages (Stone, where every match starts)
   * and sheets without an age are awaited; the other ages stream in the background so the boot
   * download stays small (B16). `unitSheetsReady` waits for all of them.
   */
  async preload(ages: AgeId[]): Promise<void> {
    const world = this.world.preload(ages, this.o.entries());
    const blocking = new Set<AgeId>(BLOCKING_UNIT_SHEET_AGES);
    const now: Promise<void>[] = [];
    for (const s of this.unitSources(ages)) {
      const p = this.ensure(s);
      const a = unitSheetAge(s);
      if (a === null || blocking.has(a)) now.push(p);
    }
    await Promise.all([world, ...now]);
  }

  /** Resolves once every unit sheet of `ages` has loaded (or failed). Dev pages and screenshots use it. */
  async unitSheetsReady(ages: readonly AgeId[]): Promise<void> {
    await Promise.all(this.unitSources(ages).map((s) => this.extrasReady(s)));
  }

  /**
   * A loaded unit sheet, or undefined (and starts loading it). Fort views draw a tower's crew from the
   * age's Ranged Common sheet this way (A16.14.8).
   */
  sheetFor(source: string): AtlasData | undefined {
    const s = this.sheets.get(source);
    if (!s) void this.ensure(source);
    return s;
  }

  /** True when the sheet is loaded (tests, gallery). */
  hasSheet(source: string): boolean {
    return this.sheets.has(source);
  }

  private sheet(def: VisualDef): AtlasData {
    const s = this.sheets.get(def.source);
    if (!s) throw new Error(`Atlas "${def.source}" is not loaded`);
    return s;
  }

  /** True when the showcase's HD copy of the sheet is loaded (`createUnit` with `hd` then draws it). */
  canDrawHd(def: VisualDef): boolean {
    return def.kind === 'atlas' && this.hdOnly.sheets.has(def.source);
  }

  createUnit(r: ViewRequest): UnitView {
    const sheet = (r.hd ? this.hdOnly.sheets.get(r.def.source) : undefined) ?? this.sheet(r.def);
    return new AtlasUnitView(r.def, sheet, this.o.decor, r.side, teamColor(r.side, r.teamPreset), {
      seed: r.seed,
      gait: sheet.gait ?? inferGait(r.key, r.def),
      style: this.o.motionStyle ?? 'cartoon',
      ...(this.o.quality ? { quality: this.o.quality } : {}),
    });
  }

  createProjectile(r: EffectRequest): EffectView {
    return new AtlasEffectView(r.def, this.sheet(r.def), teamColor(r.side, r.teamPreset));
  }

  createEffect(r: EffectRequest): EffectView {
    return new AtlasEffectView(r.def, this.sheet(r.def), teamColor(r.side, r.teamPreset));
  }

  createTurret(r: ViewRequest): TurretView {
    const sheet = this.world.get(r.def.source);
    if (!sheet) throw new Error(`Atlas turret sheet "${r.def.source}" is not loaded (${r.key})`);
    return new AtlasTurretView({ def: r.def, sheet, decor: this.o.decor, side: r.side, teamColor: teamColor(r.side, r.teamPreset), seed: r.seed });
  }

  createBase(r: BaseRequest): BaseView {
    return new AtlasBaseView({
      age: r.age,
      side: r.side,
      teamColor: teamColor(r.side, r.teamPreset),
      decor: this.o.decor,
      seed: r.seed,
      world: this.world,
      def: r.def,
      // skinned bases without a sheet morph into the plain sheet of that age
      sourceFor: (age) => {
        const e = r.resolveAge(age);
        if (e && e.def.kind === 'atlas' && isWorldSource(e.def.source)) return e.def.source;
        const plain = this.o.entries().find((d) => d.kind === 'atlas' && d.source === `art/bases/${age}.json`);
        return plain?.source;
      },
      // the age's collapse kit (manifest `clips.collapse`; a skin without one uses the plain base's)
      collapseKitFor: (age) => {
        const own = r.resolveAge(age)?.def.clips['collapse']?.ref;
        if (own) return own;
        return this.o.entries().find((d) => d.kind === 'atlas' && d.source === `art/bases/${age}.json`)?.clips['collapse']?.ref;
      },
    });
  }

  createBackdrop(r: BackdropRequest): BackdropView {
    throw new Error(`Atlas backdrops are not supported yet (${r.left.def.source})`);
  }

  async portrait(r: PortraitRequest): Promise<string> {
    const still = portraitStillBase(r.def.source);
    const puppet = puppetById(r.key);
    const color = teamColor(r.side, r.teamPreset);
    if (isWorldSource(r.def.source)) {
      const url = await renderWorldPortrait({ url: this.url(r.def.source), age: worldSourceAge(r.def.source), size: r.size, foil: r.foil, teamColor: color, plate: r.plate });
      if (url) return url;
    }
    if (still) {
      const url = await renderStillPortrait({ url: this.url(still), age: unitSheetAge(r.def.source) ?? (/art\/forts\/([a-z]+)\//.exec(r.def.source)?.[1] as AgeId | undefined) ?? puppet?.age ?? null, size: r.size, foil: r.foil, teamColor: color, plate: r.plate });
      if (url) return url;
    }
    if (!puppet) return '';
    return renderPortrait({ puppet, size: r.size, foil: r.foil, teamColor: color, fit: puppet.legendary && !puppet.motion.air ? 'bust' : 'full', plate: r.plate });
  }
}

// ---------------------------------------------------------------------------------------------
// Frame playback

interface Track {
  name: string;
  anim: string;
  frames: readonly Texture[];
  team: readonly Texture[] | null;
  steps: readonly number[];
  durationMs: number;
  loop: boolean;
  impactAt: number | null;
  impactAtMs: number | null;
  t: number;
  hold: boolean;
  /** Attack clips re-timed onto the sim wind-up (R5); null plays through `frameAt`. */
  timeline: TimelineSeg[] | null;
  /** The impact step of an attack clip, or null. */
  impactStep: number | null;
  /**
   * When a moving unit may drop this one-shot for its walk (ms into the track): an attack once its
   * impact hold has shown, a hit at once (review M1/M2). Infinity never drops it.
   */
  releaseMs: number;
}

function isAttackAnim(anim: string): boolean {
  return (ATTACK_VARIANTS as readonly string[]).includes(anim) || anim === ALT_ATTACK;
}

function track(sheet: AtlasData, def: VisualDef, name: string, o: { durationMs?: number; impactAtMs?: number; loop?: boolean } = {}, animOverride?: string): Track | null {
  const anim = animOverride ?? def.clips[name]?.ref ?? (FALLBACK[name] ?? [name]).find((c) => sheet.animations[c]);
  if (!anim) return null;
  const frames = sheet.animations[anim];
  if (!frames || frames.length === 0) return null;
  const meta = sheet.clips[anim] ?? {};
  const own = meta.durationsMs !== undefined && meta.durationsMs.length === frames.length;
  const authored = own && meta.durationsMs ? meta.durationsMs : frames.map(() => (def.clips[name]?.durationMs ?? def.clips[anim]?.durationMs ?? 600) / frames.length);
  const total = authored.reduce((a, b) => a + b, 0);
  // A and its variants share the manifest's impact point (the timing contract, ANIM_SPEC 2.0)
  const impactAt = name === 'attack' ? (anim === 'attack' ? def.events.attack.impactAt : (meta.impactAt ?? def.events.attack.impactAt)) : (meta.impactAt ?? null);
  let durationMs = o.durationMs ?? total;
  let timeline: TimelineSeg[] | null = null;
  let impactStep: number | null = null;
  if (o.durationMs === undefined && o.impactAtMs !== undefined && impactAt !== null) {
    impactStep = isAttackAnim(anim) ? impactStepOf(authored, impactAt, own ? meta.impactFrame : undefined, own ? meta.sequence : undefined, own ? meta.impactStep : undefined) : null;
    if (impactStep !== null) {
      // R5: the held anticipation absorbs the extra wind-up (sheets without `holdStep` warp evenly)
      timeline = attackTimeline(authored, impactStep, o.impactAtMs, own ? meta.holdStep : undefined, own ? meta.holdLoop : undefined);
      durationMs = timeline.reduce((a, s) => a + s.ms, 0);
    } else durationMs = o.impactAtMs + total * (1 - impactAt);
  }
  let releaseMs = Infinity;
  if (name === 'hit') releaseMs = 0;
  else if (isAttackAnim(anim) || name === 'attack' || name === 'ability') {
    // the impact frame and its hold always show; the follow-through gives way to the walk
    if (timeline && impactStep !== null) releaseMs = timelineImpactMs(timeline, impactStep) + (authored[impactStep] ?? 0);
    else if (o.impactAtMs !== undefined) releaseMs = o.impactAtMs + IMPACT_HOLD_FALLBACK_MS;
    else releaseMs = durationMs * 0.6;
  }
  return {
    name,
    anim,
    frames,
    team: sheet.animations[`${anim}_team`] ?? null,
    steps: authored,
    durationMs: Math.max(1, durationMs),
    loop: o.loop ?? def.clips[name]?.loop ?? meta.loop ?? false,
    impactAt,
    impactAtMs: o.impactAtMs ?? null,
    t: 0,
    hold: name === 'die',
    timeline,
    impactStep,
    releaseMs,
  };
}

/** The impact hold assumed for a clip without an impact step (A12: 110-150 ms for small units). */
const IMPACT_HOLD_FALLBACK_MS = 120;

/** Frame index for a track at its current time (impact-warped like the keyframe tier). */
export function frameAt(tr: Pick<Track, 't' | 'durationMs' | 'impactAtMs' | 'loop' | 'impactAt' | 'steps'>): number {
  const clip = { id: '', durationMs: tr.durationMs, loop: tr.loop, tracks: {}, ...(tr.impactAt !== null ? { impactAt: tr.impactAt } : {}) } as ClipDef;
  const u = clipU({ t: tr.t, durationMs: tr.durationMs, impactAtMs: tr.impactAtMs, loop: tr.loop, clip });
  const total = tr.steps.reduce((a, b) => a + b, 0);
  let acc = 0;
  const at = u * total;
  for (let i = 0; i < tr.steps.length; i++) {
    acc += tr.steps[i] ?? 0;
    if (at < acc - 1e-9) return i;
  }
  return tr.steps.length - 1;
}

function stepOf(tr: Track): number {
  return tr.timeline ? timelineStepAt(tr.timeline, tr.t) : frameAt(tr);
}


const UI_ZONES = { ...FX_ZONES, trim_bronze: TRIM_COLORS.bronze, trim_silver: TRIM_COLORS.silver, trim_gold: TRIM_COLORS.gold };

/** Swaps a sprite's frame and keeps it pinned at the frame's anchor (the feet, set by the sheet). */
function setFrame(s: Sprite, tex: Texture): void {
  if (s.texture === tex) return;
  s.texture = tex;
  const a = tex.defaultAnchor;
  if (a) s.anchor.set(a.x, a.y);
}

/** The unit speed (lu/s) a walk request stands for: the battle view sizes walk clips by the procedural convention (A11). */
export function walkSpeedFromDuration(durationMs: number): number {
  return (CLIP_TIMING.walkCycleMs * CLIP_TIMING.walkRefSpeedLuPerSec) / Math.max(1, durationMs);
}

/**
 * Walk clip length for a sheet so the feet do not slide: the authored cycle scaled by
 * `naturalSpeedLuPerS / unit speed` (art/blender README). Sheets without a natural speed (flyers)
 * keep their authored cycle; the result is clamped to 0.5x-2x of it so odd speeds never look broken.
 */
export function atlasWalkDurationMs(authoredMs: number, naturalLuPerS: number | undefined, requestedMs: number | undefined): number {
  if (requestedMs === undefined || !naturalLuPerS || !(naturalLuPerS > 0)) return authoredMs;
  const d = (authoredMs * naturalLuPerS) / walkSpeedFromDuration(requestedMs);
  return Math.min(authoredMs * 2, Math.max(authoredMs * 0.5, d));
}

/** Options of an atlas unit view (all visual only). */
interface AtlasUnitOptions {
  quality?: 'high' | 'lite';
  seed?: number;
  /** The walk's body type (sheet meta, or inferred from the puppet for older sheets). */
  gait?: UnitGait | null;
  style?: AtlasMotionStyle;
}

/** Sheets this tall (lu) or taller put dust at the foot on each contact step (R8). */
const FOOTFALL_MIN_HEIGHT_LU = 95;
/** A walk faster than this share of the natural speed counts as moving (hover tilt, attack_alt). */
const MOVING_SHARE = 0.3;
/** Natural speed assumed for sheets without one (flyers) when judging "moving". */
const FALLBACK_NATURAL_LU_PER_S = 60;

class AtlasUnitView implements UnitView {
  readonly root = new Container();
  readonly anchors: Anchors;
  private readonly body = new Container();
  private readonly teamSprite: Sprite;
  private readonly baseSprite: Sprite;
  private readonly flashSprite: Sprite;
  /** The outgoing frame of a walk <-> other clip switch, dissolving over `CROSS_HOLD_MS` (review M4). */
  private readonly ghostTeam: Sprite;
  private readonly ghostBase: Sprite;
  private ghostT = -1;
  private shownTrack: Track | null = null;
  private readonly ground = new Container();
  private readonly overlay = new Container();
  private readonly puffs: PuffList;
  private rng: CosmeticRng;
  private readonly facing0: 1 | -1;
  /** The drawn facing (mirrored while a retreat walks home forward, review N4). */
  private facing: 1 | -1;
  /** The facing the battle view poses (toward the enemy): world velocity and the frame lock use it. */
  private poseFacing: 1 | -1;
  /** Walking home forward on a long retreat (review N4), and the turn animation's time (-1 when none). */
  private turned = false;
  private retreatMs = 0;
  private calmMs = 0;
  private turnT = -1;
  /** A rider shot that started during a body attack (clock ms of its impact): it may still play `attack_alt` (review N2). */
  private pendingAlt: number | null = null;
  /** Sprite scale: the sheet's density, times `heightLu / sheet heightLu` for an entry drawn smaller (levies). */
  private readonly k: number;
  /** `k` over the sheet density: lu in the sheet -> lu on screen (1 except for levies). */
  private readonly hk: number;
  private readonly shadow: Container | null = null;
  private readonly shadowScaleX: number = 1;
  private readonly gait: UnitGait | null;
  private readonly style: AtlasMotionStyle;
  private lite: boolean;
  private reduceMotion = false;
  private glyph: Container | null = null;
  private glyphGroup: RoleGroup | null = null;
  private ring: Container | null = null;
  /** Team ring, role glyph and level trim on the ground (off on the card detail showcase). */
  private marks = true;
  private trim: Container | null = null;
  private trimName: UnitPose['levelTrim'] = 'none';
  private stars: Container | null = null;
  private clock: Container | null = null;
  private bubble: Container | null = null;
  private base: Track | null;
  private action: Track | null = null;
  private frozenMs = 0;
  private flashMs = 0;
  private flashDur = 1;
  private stunned = false;
  private frozenPose = false;
  private requested = 'idle';
  private hop = 0;
  private clockMs = 0;
  /** Spawn arrival or pop time, -1 when done. */
  private spawnT = -1;
  /** Hit flinch time (MR-103), -1 when done. */
  private flinchT = -1;
  /** Hit squash time (cartoon, R6), -1 when done. */
  private squashT = -1;
  private dead = false;
  /** Death hand-off (sheet `die.fx`): effects still to spawn, and when the body hides. */
  private deathFx: { id: string; atMs: number; offsetLu?: readonly [number, number]; scale?: number; loops?: number }[] = [];
  private hideAtMs = -1;
  private sinkDust = false;
  private destroyed = false;
  // ANIM_SPEC R1-R8 state
  private unitId = 0;
  private attackPlays = 0;
  /** Where the playing attack's projectile leaves (impact-frame muzzle, local lu, y down), or null. */
  private actionMuzzle: Pt | null = null;
  /** Measured ground velocity toward the enemy (lu/s), from the battle view (R1); null until it reports. */
  private gaitV: number | null = null;
  private prevGaitV = 0;
  private walkDir: 1 | -1 = 1;
  private lean = 0;
  private tilt = 0;
  private hoverPeriod: number;
  private hoverPhase: number;
  private rootX = 0;
  private lockX = 0;
  private lockStep = -1;
  private lockShift = 0;
  private lockLag = 0;
  private lastRootX = 0;
  private lastWalkStep = -1;
  private footfalls = 0;
  /** Second-attacker accents waiting for their impact time (clock ms). */
  private accents: number[] = [];
  /** Offsets kept through a hitstop (the animation clock is paused then). */
  private offY = 0;
  private rot = 0;
  private pop = 1;

  constructor(
    private readonly def: VisualDef,
    private readonly sheet: AtlasData,
    private readonly decor: PartBaker,
    side: Side,
    private readonly team: number,
    o: AtlasUnitOptions = {},
  ) {
    this.anchors = def.anchors;
    this.root.label = def.source;
    this.facing0 = side === 0 ? 1 : -1;
    this.facing = this.facing0;
    this.poseFacing = this.facing0;
    this.rng = mulberry32(o.seed ?? 1);
    this.gait = o.gait ?? null;
    this.style = o.style ?? 'cartoon';
    this.lite = o.quality === 'lite';
    this.hoverPeriod = HOVER_PERIOD_MS[0] + this.rng.next() * (HOVER_PERIOD_MS[1] - HOVER_PERIOD_MS[0]);
    this.hoverPhase = this.rng.next();
    const size = def.heightLu > 150 ? 3.1 : def.heightLu > 90 ? 1.85 : 1;
    // Team ring (A11 redundant cue) behind the contact shadow: flatter and a little wider than the
    // body, at 60% alpha, so it reads as a ground marker and does not clutter the feet of a crowd.
    const ring = partSprite(decor, side === 0 ? 'shared.ring.circle' : 'shared.ring.diamond', UI_ZONES, team);
    this.ring = ring;
    ring.scale.set(size * RING_WIDEN, RING_FLATTEN);
    ring.alpha = RING_ALPHA;
    this.ground.addChild(ring);
    if (o.quality !== 'lite') {
      // R8: a lighter, narrower contact shadow, so the feet (and the gap between them) read
      const sh = partSprite(decor, 'shared.shadow', UI_ZONES);
      this.shadowScaleX = size * 0.88;
      sh.scale.set(this.shadowScaleX, 0.9);
      sh.alpha = 0.72;
      this.ground.addChild(sh);
      this.shadow = sh;
    }
    this.teamSprite = new Sprite(Texture.EMPTY);
    this.teamSprite.tint = team;
    this.baseSprite = new Sprite(Texture.EMPTY);
    this.flashSprite = new Sprite(Texture.EMPTY);
    this.flashSprite.blendMode = 'add';
    this.flashSprite.visible = false;
    this.ghostTeam = new Sprite(Texture.EMPTY);
    this.ghostTeam.tint = team;
    this.ghostTeam.visible = false;
    this.ghostBase = new Sprite(Texture.EMPTY);
    this.ghostBase.visible = false;
    this.body.addChild(this.teamSprite, this.baseSprite, this.ghostTeam, this.ghostBase, this.flashSprite);
    const hk = sheet.heightLu && def.heightLu > 0 ? def.heightLu / sheet.heightLu : 1;
    this.k = sheet.luPerUnit * (Math.abs(hk - 1) > 0.02 ? hk : 1);
    this.hk = this.k / (sheet.luPerUnit || 1);
    this.body.scale.set(this.k * this.facing, this.k);
    if (def.filters?.alpha !== undefined) this.body.alpha = def.filters.alpha;
    this.root.addChild(this.ground, this.body, this.overlay);
    this.puffs = new PuffList(this.overlay);
    this.base = track(sheet, def, 'idle', { loop: true });
    if (this.base) this.base.t = this.rng.next() * this.base.durationMs; // crowds do not breathe in step
    this.show(0);
  }

  /**
   * R7 (duck-typed, called by the battle view right after creation): the sim unit id and a per-unit
   * seed. The seed de-syncs the idle phase, the hitstop jitter and the hover phase; the id offsets
   * the attack variant cycle (R4).
   */
  setIdentity(o: { id: number; seed: number }): void {
    this.unitId = o.id;
    this.rng = mulberry32(o.seed >>> 0 || 1);
    this.hoverPeriod = HOVER_PERIOD_MS[0] + this.rng.next() * (HOVER_PERIOD_MS[1] - HOVER_PERIOD_MS[0]);
    this.hoverPhase = this.rng.next();
    if (this.base && this.base.name === 'idle') this.base.t = this.rng.next() * this.base.durationMs;
  }

  /** R1 (duck-typed): the measured ground velocity toward the enemy, lu/s (negative walks back). */
  setGait(o: { speedLuPerS: number }): void {
    this.gaitV = Number.isFinite(o.speedLuPerS) ? o.speedLuPerS : 0;
    this.retimeWalk();
  }

  /**
   * How far the frame on screen reaches from the feet (duck-typed, the card detail showcase): `front`
   * toward where the unit faces, `back` behind it and `top` above the feet, in lu, from the visible
   * (trimmed) part of the frame. With `clips`, the furthest any frame of those loaded clips reaches
   * (an attack's wind-up behind the back). Null before a frame shows, or when none of the clips loaded.
   */
  extentLu(o: { clips?: readonly string[] } = {}): { front: number; back: number; top: number } | null {
    if (!o.clips) return this.frameExtent(this.baseSprite.texture);
    let out: { front: number; back: number; top: number } | null = null;
    for (const name of o.clips) {
      for (const tex of this.sheet.animations[name] ?? []) {
        const e = this.frameExtent(tex);
        if (e) out = out ? { front: Math.max(out.front, e.front), back: Math.max(out.back, e.back), top: Math.max(out.top, e.top) } : e;
      }
    }
    return out;
  }

  /**
   * Where the unit's attack lands (duck-typed, the card detail showcase): how far attack A's impact
   * frame reaches in front of the feet, lu. Null without an attack clip.
   */
  impactReachLu(): number | null {
    const tr = track(this.sheet, this.def, 'attack', { loop: false }, 'attack');
    if (!tr || tr.impactAt === null) return null;
    const meta = this.sheet.clips[tr.anim];
    const step = impactStepOf(tr.steps, tr.impactAt, meta?.impactFrame, meta?.sequence, meta?.impactStep);
    if (step === null) return null;
    return this.frameExtent(tr.frames[step])?.front ?? null;
  }

  private frameExtent(tex: Texture | undefined): { front: number; back: number; top: number } | null {
    if (!tex || tex === Texture.EMPTY) return null;
    const o = tex.orig;
    const tr = tex.trim ?? { x: 0, y: 0, width: o.width, height: o.height };
    const a = tex.defaultAnchor ?? { x: 0.5, y: 1 };
    const ax = a.x * o.width;
    const ay = a.y * o.height;
    return { front: (tr.x + tr.width - ax) * this.k, back: (ax - tr.x) * this.k, top: (ay - tr.y) * this.k };
  }

  /**
   * Shows or hides the battle's ground marks (team ring, role glyph, level trim; duck-typed). The card
   * detail showcase draws a unit alone on its stage, with its contact shadow only.
   */
  setGroundMarks(on: boolean): void {
    this.marks = on;
    for (const c of [this.ring, this.glyph, this.trim]) if (c) c.visible = on;
  }

  /** Reduce motion and Lite (duck-typed, like the world views): no lean and no footfall dust. */
  setMotion(m: { reduce: boolean; lite: boolean }): void {
    this.reduceMotion = m.reduce;
    this.lite = m.lite;
  }

  /** Contact steps of a big unit since the last call (the battle view adds a little trauma for Legendaries). */
  drainFootfalls(): number {
    const n = this.footfalls;
    this.footfalls = 0;
    return n;
  }

  /**
   * R4 (duck-typed): where a projectile of `attackIndex` leaves right now (local lu from the feet,
   * x forward, y down), or null for the static muzzle anchor. Index 0 gives the playing variant's
   * impact-frame muzzle; a second attacker gives its `attack_alt` muzzle or the current frame's
   * `riderMuzzle` / `mgMuzzle`.
   */
  muzzleNow(attackIndex = 0): Pt | null {
    if (attackIndex <= 0) return this.action && this.action.name === 'attack' ? this.actionMuzzle : null;
    if (this.action && this.action.name === ALT_ATTACK && this.actionMuzzle) return this.actionMuzzle;
    return this.frameAnchor('riderMuzzle') ?? this.frameAnchor('mgMuzzle');
  }

  /**
   * R3 (duck-typed): a second sim attack (`attackIndex >= 1`: riders, sponsons, an MG). It never
   * replaces the body's attack: while the unit stands and no attack plays, the sheet's `attack_alt`
   * plays (warped to its own wind-up); otherwise a small accent shows at the rider or MG anchor on
   * the impact beat and the gait keeps running.
   */
  playAlt(o: { impactAtMs?: number } = {}): void {
    if (this.destroyed || this.dead) return;
    const busy = this.action !== null && (this.action.name === 'attack' || this.action.name === 'ability' || this.action.name === 'spawn' || this.action.hold);
    if (!busy && !this.stunned && !this.isMoving() && (this.sheet.animations[ALT_ATTACK]?.length ?? 0) > 0) {
      const t = track(this.sheet, this.def, ALT_ATTACK, o.impactAtMs !== undefined ? { impactAtMs: o.impactAtMs } : {}, ALT_ATTACK);
      if (t) {
        this.action = t;
        this.actionMuzzle = this.muzzleOf(t);
        return;
      }
    }
    const at = this.clockMs + Math.max(0, o.impactAtMs ?? 0);
    this.accents.push(at);
    // review N2: the riders' wind-up usually starts during the body's gore; if enough of it is left
    // when the gore ends (and the unit still stands), the throw itself plays then
    if (busy && this.action?.name === 'attack' && o.impactAtMs !== undefined && !this.isMoving() && (this.sheet.animations[ALT_ATTACK]?.length ?? 0) > 0) this.pendingAlt = at;
  }

  /** Starts a pending rider shot as `attack_alt` once the body is free (review N2). */
  private startLateAlt(): void {
    if (this.pendingAlt === null) return;
    const left = this.pendingAlt - this.clockMs;
    if (left < ALT_LATE_MIN_MS || this.dead || this.stunned || this.isMoving()) {
      if (left < ALT_LATE_MIN_MS || this.dead) this.pendingAlt = null;
      return;
    }
    if (this.action) return;
    const t = track(this.sheet, this.def, ALT_ATTACK, { impactAtMs: left }, ALT_ATTACK);
    if (!t) {
      this.pendingAlt = null;
      return;
    }
    const at = this.pendingAlt;
    this.accents = this.accents.filter((x) => x !== at);
    this.pendingAlt = null;
    this.action = t;
    this.actionMuzzle = this.muzzleOf(t);
  }

  setPose(p: UnitPose): void {
    if (this.destroyed) return;
    this.root.position.set(p.x, p.y);
    this.rootX = p.x;
    this.poseFacing = p.facing;
    if (this.turnT < 0 && this.drawnFacing() !== this.facing) this.applyFacing(this.drawnFacing());
    this.root.alpha = p.alpha;
    if (p.roleGlyph !== this.glyphGroup) {
      this.glyphGroup = p.roleGlyph;
      this.glyph?.destroy({ children: true });
      this.glyph = partSprite(this.decor, `icon.role.${p.roleGlyph}`, UI_ZONES, this.team);
      this.glyph.visible = this.marks;
      this.glyph.position.set(0, 5.2);
      this.glyph.scale.set(STYLE.roleGlyphLu / 17.2, (STYLE.roleGlyphLu / 17.2) * 0.72);
      this.glyph.alpha = 0.85;
      this.ground.addChild(this.glyph);
    }
    if (p.levelTrim !== this.trimName) {
      this.trimName = p.levelTrim;
      this.trim?.destroy({ children: true });
      this.trim = p.levelTrim === 'none' ? null : partSprite(this.decor, `trim.${p.levelTrim}`, UI_ZONES);
      if (this.trim) this.trim.visible = this.marks;
      if (this.trim) {
        this.trim.position.set(9.6, 5.4);
        this.trim.scale.set(STYLE.levelTrimScale);
        this.ground.addChild(this.trim);
      }
    }
    if (p.stunned !== this.stunned) {
      this.stunned = p.stunned;
      this.showStars(p.stunned);
      this.play(p.stunned ? 'stun' : this.requested);
    }
    if (p.frozen !== this.frozenPose) {
      this.frozenPose = p.frozen;
      this.showClock(p.frozen);
      this.body.tint = p.frozen ? 0xd9d2f2 : 0xffffff;
    }
    this.showBubble(p.shieldBp);
  }

  /**
   * `variant` (duck-typed, the card detail showcase): plays that attack variant instead of the next one
   * of the per-unit cycle (R4), when it has loaded.
   */
  play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean; variant?: string }): void {
    if (this.destroyed || this.dead) return;
    if (clip === ALT_ATTACK) {
      this.playAlt(o?.impactAtMs !== undefined ? { impactAtMs: o.impactAtMs } : {});
      return;
    }
    if (clip === 'idle' || clip === 'walk' || clip === 'victory') this.requested = clip;
    if (this.stunned && (clip === 'idle' || clip === 'walk')) return;
    if (clip === 'spawn' && !(this.sheet.animations['spawn']?.length)) {
      // review B1: no spawn frames: the pop and the dust are code motion, and no action holds the
      // body (the idle fallback used to loop forever, so units glided down the lane in their guard)
      this.startSpawn();
      return;
    }
    // review M2: a hit taken on the move squashes and flashes (R6) but keeps the walk running
    if (clip === 'hit' && this.isMoving()) return;
    // a hit never cuts an attack (or the riders' attack_alt) before its impact hold has shown; the
    // battle view guards the body attack, this guards attack_alt too (it sets no one-shot timer there)
    if (clip === 'hit' && this.action && isAttackAnim(this.action.anim) && this.action.t < this.action.releaseMs) return;
    const loops = LOOP_CLIPS.has(clip);
    let opts = o;
    if (clip === 'walk') {
      // play the walk at the sim's speed so the feet stay planted (sheet `naturalSpeedLuPerS`)
      const t0 = track(this.sheet, this.def, 'walk');
      if (t0 && t0.name === 'walk' && t0.anim === 'walk') {
        const authored = t0.steps.reduce((a, b) => a + b, 0);
        const natural = this.naturalSpeed();
        // R1: the measured velocity wins over the requested length once the battle view reports it
        opts = { ...o, durationMs: this.gaitV !== null ? gaitWalkDurationMs(authored, natural, this.gaitV) : atlasWalkDurationMs(authored, natural, o?.durationMs) };
        if (this.gaitV !== null) this.walkDir = this.dirNow();
      }
    }
    // R4: the attack variant comes from a fixed per-unit cycle over the variants that have loaded
    const anim = clip === 'attack' ? this.variantFor(o?.variant) : undefined;
    // a one-shot never loops, whatever the clip it falls back to (review B1)
    const t = track(this.sheet, this.def, clip, loops ? { loop: true, ...opts } : { ...opts, loop: false }, anim);
    if (!t) return;
    if (clip === 'spawn') this.startSpawn();
    if (clip === 'attack' || clip === 'ability') this.setTurned(false, true);
    // a body attack takes over from the riders' attack_alt: their throw still shows as the accent
    const alt = this.action;
    if (!loops && alt && alt.name === ALT_ATTACK && alt.impactAtMs !== null && alt.t < alt.impactAtMs) this.accents.push(this.clockMs + alt.impactAtMs - alt.t);
    if (clip === 'victory') this.hop = 0;
    if (clip === 'die') this.die();
    if (loops && opts?.loop !== false) {
      // keep the phase when a loop restarts at a new speed (no foot pop)
      if (this.base && this.base.anim === t.anim && this.base.durationMs > 0) t.t = (this.base.t % this.base.durationMs) * (t.durationMs / this.base.durationMs);
      this.base = t;
    } else {
      this.action = t;
      this.actionMuzzle = clip === 'attack' ? this.muzzleOf(t) : null;
    }
  }

  private startSpawn(): void {
    this.spawnT = 0;
    if (this.style === 'cartoon') this.pop = 0;
    this.spawnDust();
  }

  /** The facing to draw: toward the enemy, or toward home while a long retreat walks forward (N4). */
  private drawnFacing(): 1 | -1 {
    return this.turned ? (-this.poseFacing as 1 | -1) : this.poseFacing;
  }

  private applyFacing(f: 1 | -1): void {
    this.facing = f;
    this.body.scale.x = this.k * f;
    for (const o of [this.stars, this.clock, this.bubble]) if (o) o.x = this.anchors.hitCenter.x * f;
  }

  /** Turns to walk home forward (or back to face the enemy); `instant` skips the turn animation. */
  private setTurned(on: boolean, instant = false): void {
    if (this.turned === on) return;
    this.turned = on;
    this.retreatMs = 0;
    this.calmMs = 0;
    if (instant || this.reduceMotion) {
      this.turnT = -1;
      this.applyFacing(this.drawnFacing());
    } else this.turnT = 0;
    if (this.gaitV !== null) this.walkDir = this.dirNow();
  }

  /** The walk's play direction: backward on a backpedal, forward once turned for home. */
  private dirNow(): 1 | -1 {
    return this.turned ? 1 : walkDirection(this.gaitV ?? 0);
  }

  /** Review N4: a retreat longer than `RETREAT_TURN_MS` turns round; standing or advancing turns back. */
  private updateRetreat(dt: number): void {
    if (this.dead || this.gaitV === null) return;
    const retreating = this.gaitV < -MOVING_SHARE * (this.naturalSpeed() ?? FALLBACK_NATURAL_LU_PER_S) && !this.action && !this.stunned;
    if (retreating) {
      this.retreatMs += dt;
      this.calmMs = 0;
      if (!this.turned && this.retreatMs >= RETREAT_TURN_MS) this.setTurned(true);
    } else {
      this.calmMs += dt;
      if (this.calmMs >= RETREAT_UNTURN_MS) this.retreatMs = 0;
      if (this.turned && this.calmMs >= RETREAT_UNTURN_MS) this.setTurned(false);
    }
    if (this.turnT >= 0) {
      this.turnT += dt;
      if (this.turnT >= TURN_MS / 2 && this.facing !== this.drawnFacing()) this.applyFacing(this.drawnFacing());
      if (this.turnT >= TURN_MS) this.turnT = -1;
    }
  }

  private pickVariant(): string {
    const cycle = attackCycle((a) => (this.sheet.animations[a]?.length ?? 0) > 0);
    return pickAttackVariant(cycle, this.unitId, this.attackPlays++);
  }

  /** The asked variant when it has loaded (it still counts as a play of the cycle), else the cycle's next. */
  private variantFor(want: string | undefined): string {
    if (want && (ATTACK_VARIANTS as readonly string[]).includes(want) && (this.sheet.animations[want]?.length ?? 0) > 0) {
      this.attackPlays++;
      return want;
    }
    return this.pickVariant();
  }

  /**
   * What this unit's art can show (duck-typed, the card detail showcase): the attack variants that have
   * loaded (A first), whether a second attacker has its own `attack_alt` clip, the walk's body type and
   * its natural ground speed (lu/s on screen; null for sheets without one, such as flyers).
   */
  motionInfo(): { attacks: string[]; alt: boolean; gait: UnitGait | null; naturalSpeedLuPerS: number | null } {
    const has = (a: string): boolean => (this.sheet.animations[a]?.length ?? 0) > 0;
    return {
      attacks: ATTACK_VARIANTS.filter((a) => has(a)),
      alt: has(ALT_ATTACK),
      gait: this.gait,
      naturalSpeedLuPerS: this.naturalSpeed() ?? null,
    };
  }

  /** The walk's natural speed in screen lu/s (a smaller entry, a levy, strides shorter). */
  private naturalSpeed(): number | undefined {
    const n = this.sheet.clips['walk']?.naturalSpeedLuPerS;
    return n !== undefined ? n * this.hk : undefined;
  }

  private isMoving(): boolean {
    if (this.gaitV === null) return this.requested === 'walk';
    return Math.abs(this.gaitV) > MOVING_SHARE * (this.naturalSpeed() ?? FALLBACK_NATURAL_LU_PER_S);
  }

  /** R1: resize the walk to the measured velocity, keeping the phase; a negative velocity plays it backward. */
  private retimeWalk(): void {
    const b = this.base;
    if (!b || b.name !== 'walk' || b.anim !== 'walk' || this.gaitV === null) return;
    const authored = b.steps.reduce((a, s) => a + s, 0);
    const d = gaitWalkDurationMs(authored, this.naturalSpeed(), this.gaitV);
    this.walkDir = this.dirNow();
    if (Math.abs(d - b.durationMs) > 0.25 && b.durationMs > 0) {
      b.t = (b.t / b.durationMs) * d;
      b.durationMs = d;
    }
  }

  /** A clip's impact-frame muzzle (meta `muzzle`, else its per-frame `muzzle`/`beam` anchor), local lu, y down. */
  private muzzleOf(tr: Track): Pt | null {
    const meta = this.sheet.clips[tr.anim];
    if (!meta) return null;
    let v: readonly [number, number] | null | undefined = meta.muzzle;
    if (!v && tr.impactStep !== null) {
      const frame = meta.sequence?.[tr.impactStep] ?? tr.impactStep;
      v = meta.anchorsLu?.['muzzle']?.[frame] ?? meta.anchorsLu?.['beam']?.[frame];
    } else if (!v) {
      const s = impactStepOf(tr.steps, tr.impactAt, meta.impactFrame, meta.sequence, meta.impactStep);
      if (s !== null) {
        const frame = meta.sequence?.[s] ?? s;
        v = meta.anchorsLu?.['muzzle']?.[frame] ?? meta.anchorsLu?.['beam']?.[frame];
      }
    }
    return v ? { x: v[0] * this.hk, y: -v[1] * this.hk } : null;
  }

  /** A per-frame anchor of the frame on screen (local lu, y down), or null. */
  private frameAnchor(name: string): Pt | null {
    const tr = this.action ?? this.base;
    if (!tr) return null;
    const meta = this.sheet.clips[tr.anim];
    const list = meta?.anchorsLu?.[name];
    if (!list) return null;
    const step = stepOf(tr);
    const v = list[meta.sequence?.[step] ?? step];
    return v ? { x: v[0] * this.hk, y: -v[1] * this.hk } : null;
  }

  private die(): void {
    this.dead = true;
    this.showStars(false);
    if (this.bubble) this.bubble.visible = false;
    const meta = this.sheet.clips['die'];
    this.deathFx = [...(meta?.fx ?? [])].sort((a, b) => a.atMs - b.atMs);
    this.hideAtMs = meta?.hideUnitAtMs ?? -1;
    if (!meta?.fx) {
      // sheets without a hand-off still leave a poof
      this.deathFx = [{ id: 'fx.dust_poof', atMs: 160, offsetLu: [0, this.def.heightLu * 0.35], scale: 0.6 }];
    }
  }

  freeze(ms: number): void {
    this.frozenMs = Math.max(this.frozenMs, ms);
  }

  flash(ms: number, color = 0xffffff): void {
    this.flashMs = ms;
    this.flashDur = Math.max(1, ms);
    this.flashSprite.tint = color;
    // A victim flash is a hit: the body flinches back by its mass (MR-103) and, in the cartoon
    // style, squashes for a beat (R6).
    if (!this.dead) {
      this.flinchT = 0;
      if (this.style === 'cartoon') this.squashT = 0;
    }
  }

  private mass(): UnitMass {
    return unitMass(this.glyphGroup, this.def.heightLu);
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clockMs += dtMs;
    let animDt = dtMs;
    // Code motion on top of the frames: x = hitstop jitter + flinch (+ the R2 frame lock), y = spawn,
    // hop, hover, sink; rotation = lean, tilt, the legacy walk sway; scale = spawn pop and hit squash.
    let ox = 0;
    if (this.frozenMs > 0) {
      const used = Math.min(this.frozenMs, animDt);
      this.frozenMs -= used;
      animDt -= used;
      // local hitstop jitter (A12: 1-2 px)
      ox = (this.rng.next() - 0.5) * 2.4;
    }
    let sx = 1;
    let sy = 1;
    if (animDt > 0 && !this.frozenPose) {
      if (this.base) this.base.t += animDt * (this.base.name === 'walk' ? this.walkDir : 1);
      if (this.action) {
        this.action.t += animDt;
        // attack_alt plays only while the unit stands (R3)
        if (this.action.name === ALT_ATTACK && this.isMoving()) this.action = null;
        else if (!this.action.hold && !this.action.loop && this.action.t >= this.action.durationMs) this.action = null;
        // review M1: once a target dies the sim walks the unit on; the follow-through gives way to
        // the walk after the impact hold instead of sliding down the lane
        else if (!this.dead && this.action.t >= this.action.releaseMs && this.isMoving()) this.action = null;
      }
      this.startLateAlt();
      this.updateRetreat(animDt);
      let oy = 0;
      const mass = this.mass();
      if (this.spawnT >= 0) {
        this.spawnT += animDt;
        if (this.style === 'cartoon') {
          // R6: the cartoon pop, 0 -> 1.15 -> 1 (heavies slower, 1.08)
          this.pop = spawnPop(mass, this.spawnT);
          if (this.spawnT >= SPAWN_POP[mass].ms) {
            this.spawnT = -1;
            this.pop = 1;
          }
        } else {
          const a = spawnArrival(mass, this.spawnT);
          oy += a.y;
          this.body.alpha = (this.def.filters?.alpha ?? 1) * a.alpha;
          if (this.spawnT >= UNIT_WEIGHT[mass].spawnMs) {
            this.spawnT = -1;
            this.body.alpha = this.def.filters?.alpha ?? 1;
          }
        }
      }
      if (this.flinchT >= 0) {
        this.flinchT += animDt;
        if (this.flinchT >= UNIT_WEIGHT[mass].flinchMs) this.flinchT = -1;
      }
      if (this.squashT >= 0) {
        this.squashT += animDt;
        if (this.squashT >= 210) this.squashT = -1;
      }
      // R8: lean against acceleration (ground) or pitch with it (flyers), at most 3 degrees, eased
      const v = this.gaitV ?? 0;
      const accel = ((v - this.prevGaitV) * 1000) / animDt;
      this.prevGaitV = v;
      const flyer = hovers(this.gait);
      const leanTo = this.reduceMotion || this.dead || this.stunned ? 0 : leanTarget(accel, flyer);
      this.lean = easeExp(this.lean, leanTo, animDt, LEAN_TAU_MS);
      let rot = this.lean;
      const walking = this.base?.name === 'walk' && !this.action && !this.dead && (this.base.durationMs ?? 0) > 0;
      if (flyer) {
        // G8: nose down while moving, level at rest; a hover bob that never steps
        this.tilt = easeExp(this.tilt, !this.dead && this.isMoving() ? HOVER_TILT_RAD : 0, animDt, HOVER_TILT_TAU_MS);
        rot += this.tilt;
        if (!this.dead) {
          const bob = hoverBob(this.clockMs, this.hoverPeriod, this.hoverPhase) * (this.reduceMotion ? 0.5 : 1);
          oy -= bob;
          // the contact shadow stays on the ground and shrinks at the top of the bob
          if (this.shadow) this.shadow.scale.x = this.shadowScaleX * (1 - 0.08 * (bob / (2 * HOVER_AMP_LU)) - 0.04);
        }
      }
      rot *= this.facing;
      if (walking && this.base && !this.sheet.gait && !flyer) {
        // sheets made before the walk standard: the code step bounce (owner feedback 2026-10-02)
        const st = walkStep(mass, this.base.t / this.base.durationMs);
        oy += st.y;
        rot += st.rot;
      }
      if (this.requested === 'victory' && !this.action) {
        this.hop += animDt;
        oy -= Math.abs(Math.sin((this.hop / 700) * Math.PI)) * 8;
      }
      if (this.dead && this.action) {
        this.deathHandoff(this.action.t);
        if (this.style === 'realistic') {
          // MR-105: the body lies, then sinks a little as the render fades it out.
          const sinkT = this.action.t - this.action.durationMs - DEATH_LIE_MS;
          if (sinkT > 0) oy += DEATH_SINK_LU * Math.min(1, sinkT / DEATH_FADE_MS);
        }
      }
      this.fireAccents();
      this.offY = oy;
      this.rot = rot;
    }
    if (this.squashT >= 0) {
      const s = hitSquash(this.mass(), this.squashT);
      sx = s.sx;
      sy = s.sy;
    }
    // the flinch pushes the body back, away from what it faces
    if (this.flinchT >= 0) ox -= this.facing * flinchOffset(this.mass(), this.flinchT);
    if (this.flashMs > 0) {
      // full for 60%, then fades (same curve as the procedural tier)
      this.flashMs = Math.max(0, this.flashMs - dtMs);
      const t = 1 - this.flashMs / this.flashDur;
      this.flashSprite.visible = this.flashMs > 0;
      this.flashSprite.alpha = t < 0.6 ? 0.95 : 0.95 * (1 - (t - 0.6) / 0.4);
    }
    if (this.stars?.visible) {
      const n = this.stars.children.length;
      this.stars.children.forEach((s, i) => {
        const a = (this.clockMs / 520) * Math.PI + (i * Math.PI * 2) / n;
        s.position.set(Math.cos(a) * 9, Math.sin(a) * 3);
        s.scale.set(0.8 + 0.2 * Math.sin(a));
      });
    }
    if (this.clock?.visible) this.clock.rotation = Math.sin(this.clockMs / 180) * 0.04;
    if (this.bubble?.visible) this.bubble.scale.set(((this.def.heightLu * 0.62) / 10) * (1 + 0.03 * Math.sin(this.clockMs / 160)));
    this.puffs.update(dtMs);
    this.show(dtMs);
    this.place(ox, sx, sy);
  }

  /** Puts the body: offsets, the R2 frame lock, rotation about the feet (flyers: the hit centre), scale. */
  private place(ox: number, sx: number, sy: number): void {
    const r = this.rot;
    // flyers pitch about their middle, everything else leans from the feet
    const cx = hovers(this.gait) ? this.anchors.hitCenter.x * this.facing : 0;
    const cy = hovers(this.gait) ? this.anchors.hitCenter.y : 0;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    this.body.rotation = r;
    this.body.x = ox + this.lockShift + (cx - (cx * cos - cy * sin));
    this.body.y = this.offY + (cy - (cx * sin + cy * cos));
    const turn = this.turnT >= 0 ? turnScale(this.turnT) : 1;
    this.body.scale.set(this.k * this.facing * sx * this.pop * turn, this.k * sy * this.pop);
    if (this.shadow) this.shadow.x = this.lockShift;
  }

  /** Second-attacker accents due now: a throw puff at the rider, or a muzzle flash at the MG (R3). */
  private fireAccents(): void {
    if (this.accents.length === 0) return;
    const due = this.accents.filter((t) => t <= this.clockMs);
    if (due.length === 0) return;
    this.accents = this.accents.filter((t) => t > this.clockMs);
    if (this.dead) return;
    const mg = this.frameAnchor('mgMuzzle');
    const rider = mg ? null : this.frameAnchor('riderMuzzle');
    const at = mg ?? rider;
    if (!at) return;
    const x = at.x * this.facing;
    const y = at.y;
    if (mg) {
      const s = partSprite(this.decor, 'fx.p.spark', UI_ZONES);
      s.position.set(x, y);
      this.puffs.add(s, { life: 70, s0: 1.1, s1: 0.8, a0: 1 });
    } else {
      const s = partSprite(this.decor, 'fx.p.dust', UI_ZONES);
      s.position.set(x, y);
      this.puffs.add(s, { vx: this.facing * 30, vy: -10, life: 260, s0: 0.4, s1: 0.8, a0: 0.5 });
    }
  }

  /** Spawns the sheet's death effects on time and hides the body at `hideUnitAtMs` (art/blender README). */
  private deathHandoff(t: number): void {
    while (this.deathFx.length > 0 && (this.deathFx[0]?.atMs ?? 0) <= t) {
      const fx = this.deathFx.shift();
      if (!fx) break;
      const x = (fx.offsetLu?.[0] ?? 0) * this.facing;
      const y = -(fx.offsetLu?.[1] ?? this.def.heightLu * 0.4);
      const k = (fx.scale ?? 1) * Math.max(1, this.def.heightLu / 68);
      // Owner decision 2026-09-30: the cartoon style is back, so KO stars pop again.
      if (fx.id === 'fx.ko_stars') this.koStars(x, y, k, fx.loops ?? 1);
      else this.dustPoof(x, y, k);
    }
    const dur = this.action?.durationMs ?? 0;
    if (this.style === 'cartoon') {
      // R6: the KO pose hands off to the poof and the stars; the body ends at `hideUnitAtMs` (no lie, sink or fade)
      const hideAt = this.hideAtMs >= 0 ? this.hideAtMs : dur;
      if (t >= hideAt && this.body.visible) {
        this.body.visible = false;
        this.ground.visible = false;
      }
      return;
    }
    // Realistic style: a sheet's hide at the end of its fall is not honoured: the body lies for
    // DEATH_LIE_MS and then sinks and fades (MR-105); an earlier hide (a body that bursts) still is.
    if (this.hideAtMs >= 0 && this.hideAtMs < dur - 1 && t >= this.hideAtMs && this.body.visible) {
      this.body.visible = false;
      this.ground.alpha = 0.5;
    }
    if (!this.sinkDust && t >= dur + DEATH_LIE_MS && this.body.visible) {
      this.sinkDust = true;
      this.ground.alpha = 0.5;
      this.dustPoof(0, -2, 0.5 * Math.max(1, this.def.heightLu / 68));
    }
  }

  private dustPoof(x: number, y: number, k: number): void {
    for (let i = 0; i < 9; i++) {
      const s = partSprite(this.decor, 'fx.p.dust', UI_ZONES);
      const a = (i / 9) * Math.PI * 2 + this.rng.next() * 0.5;
      s.position.set(x + Math.cos(a) * 6 * k, y + Math.sin(a) * 4 * k);
      this.puffs.add(s, { vx: Math.cos(a) * (26 + this.rng.next() * 30) * k, vy: Math.sin(a) * (14 + this.rng.next() * 16) * k - 10, life: 420 + this.rng.next() * 220, s0: 0.7 * k, s1: 1.35 * k, a0: 0.6, g: 20 });
    }
  }

  private koStars(x: number, y: number, k: number, loops: number): void {
    for (let i = 0; i < 3; i++) {
      const s = partSprite(this.decor, 'fx.p.star', UI_ZONES);
      s.position.set(x, y);
      const a = -Math.PI / 2 + (i - 1) * 0.7;
      this.puffs.add(s, { vx: Math.cos(a) * 34 * k, vy: Math.sin(a) * 40 * k, life: 360 + 180 * loops, s0: 1 * k, s1: 0.6 * k, a0: 1, spin: (this.rng.next() - 0.5) * 8, g: 30 });
    }
  }

  private spawnDust(): void {
    // MR-100 / A11: a dust ring at the feet as the body takes its weight (ground-toned, 5.8).
    const k = UNIT_WEIGHT[this.mass()].settleLu / UNIT_WEIGHT.light.settleLu;
    for (let i = 0; i < 5; i++) {
      const s = partSprite(this.decor, 'fx.p.dust', UI_ZONES);
      const dir = i < 2 ? -1 : 1;
      s.position.set((this.rng.next() - 0.5) * 16, -2);
      this.puffs.add(s, { vx: dir * (30 + this.rng.next() * 50), vy: -12 - this.rng.next() * 18, life: 380 + this.rng.next() * 160, s0: 0.5, s1: Math.min(2, 1.1 * Math.sqrt(k)), a0: 0.55 });
    }
  }

  /** R8: a small ground-toned puff at a big unit's foot on a contact step (off in Lite and Reduce motion). */
  private footDust(atLu: number | readonly [number, number] | undefined): void {
    const x = (typeof atLu === 'number' ? atLu : (atLu?.[0] ?? 0)) * this.hk * this.facing + this.lockShift;
    const k = Math.max(1, this.def.heightLu / 120);
    for (let i = 0; i < 3; i++) {
      const s = partSprite(this.decor, 'fx.p.dust', UI_ZONES);
      const dir = i === 0 ? -1 : 1;
      s.position.set(x + (this.rng.next() - 0.5) * 6 * k, -1.5);
      this.puffs.add(s, { vx: dir * (14 + this.rng.next() * 18) * k, vy: -6 - this.rng.next() * 8, life: 300 + this.rng.next() * 120, s0: 0.35 * k, s1: 0.8 * k, a0: 0.4 });
    }
  }

  private showStars(on: boolean): void {
    if (on && !this.stars) {
      this.stars = new Container();
      for (let i = 0; i < 3; i++) this.stars.addChild(partSprite(this.decor, 'fx.p.star', UI_ZONES));
      this.stars.position.set(this.anchors.head.x * this.facing, this.anchors.head.y - 6);
      this.overlay.addChild(this.stars);
    }
    if (this.stars) this.stars.visible = on;
  }

  private showClock(on: boolean): void {
    if (on && !this.clock) {
      this.clock = partSprite(this.decor, 'fx.p.clock', UI_ZONES);
      this.clock.position.set(this.anchors.hitCenter.x * this.facing, this.anchors.hitCenter.y);
      this.clock.scale.set(this.def.heightLu / 34);
      this.clock.alpha = 0.75;
      this.overlay.addChildAt(this.clock, 0);
    }
    if (this.clock) this.clock.visible = on;
  }

  private showBubble(shieldBp: number): void {
    if (shieldBp > 0 && !this.bubble) {
      this.bubble = partSprite(this.decor, 'fx.p.bubble', UI_ZONES);
      this.bubble.position.set(this.anchors.hitCenter.x * this.facing, this.anchors.hitCenter.y);
      this.bubble.scale.set((this.def.heightLu * 0.62) / 10);
      // a filled bubble in a light team tint with a solid rim (reads at 56 px; review fix 11)
      this.bubble.tint = mixColor(this.team, 0xffffff, 0.35);
      this.overlay.addChildAt(this.bubble, 0);
    }
    if (this.bubble) {
      this.bubble.visible = shieldBp > 0 && !this.dead;
      this.bubble.alpha = 0.45 + 0.55 * Math.min(1, shieldBp / 10000);
    }
  }

  private show(dtMs: number): void {
    const tr = this.action ?? this.base;
    if (!tr) return;
    const i = stepOf(tr);
    const tex = tr.frames[i] ?? Texture.EMPTY;
    // review M4: a switch between the walk (carry pose) and another clip (guard, attack) cross-dissolves
    const prev = this.shownTrack;
    if (prev && prev !== tr && prev.anim !== tr.anim && (prev.anim === 'walk' || tr.anim === 'walk') && !this.dead && this.baseSprite.texture !== Texture.EMPTY) {
      setFrame(this.ghostBase, this.baseSprite.texture);
      setFrame(this.ghostTeam, this.teamSprite.texture);
      this.ghostT = 0;
    } else if (this.ghostT >= 0) this.ghostT += dtMs;
    this.shownTrack = tr;
    if (this.ghostT >= CROSS_HOLD_MS || this.dead) this.ghostT = -1;
    const ghost = this.ghostT >= 0;
    this.ghostBase.visible = ghost;
    this.ghostTeam.visible = ghost && this.ghostTeam.texture !== Texture.EMPTY;
    if (ghost) {
      const a = crossHoldAlpha(this.ghostT);
      this.ghostBase.alpha = a;
      this.ghostTeam.alpha = a;
    }
    setFrame(this.baseSprite, tex);
    setFrame(this.flashSprite, tex);
    setFrame(this.teamSprite, tr.team?.[i] ?? Texture.EMPTY);
    const walking = tr === this.base && tr.name === 'walk' && tr.anim === 'walk' && !this.dead;
    // R2: legged units hold their body where it stood when the frame began, so the planted foot stays put.
    // `lockShift` = the frame lock (0 at a frame start, then -v x dt) + `lockLag`, the offset carried in
    // from a clip that held the body still (review M1/M3: no jump at a walk start or end).
    const legged = plantsFeet(this.gait) && this.gaitV !== null && !this.frozenPose && !this.dead;
    const rootMoved = Math.abs(this.rootX - this.lastRootX) > 1e-3;
    this.lastRootX = this.rootX;
    if (walking && legged) {
      if (this.lockStep < 0) {
        // the walk starts from where the body is drawn; the carried offset melts away while walking
        this.lockLag = this.lockShift;
        this.lockX = this.rootX;
        this.lockStep = i;
      } else if (i !== this.lockStep) {
        const { sinceMs } = loopStepAt(tr.steps, tr.durationMs, tr.t, this.walkDir);
        this.lockX = this.rootX + frameLockOffset(this.poseFacing * (this.gaitV ?? 0), sinceMs);
        this.lockStep = i;
      }
      this.lockLag = Math.abs(this.lockLag) < 0.05 ? 0 : easeExp(this.lockLag, 0, dtMs, FRAME_LOCK_CATCH_UP_TAU_MS);
      let off = this.lockX - this.rootX;
      if (Math.abs(off) > FRAME_LOCK_MAX_LU) {
        this.lockX = this.rootX;
        off = 0;
      }
      this.lockShift = off + this.lockLag;
    } else if (legged) {
      // an attack, a hit or the idle: the feet stay planted, so the body holds where it stands while
      // the sim already moves the unit (the walk clip takes over within a few frames); standing
      // still, it settles slowly onto the sim position. A knockback (too far) lets go at once.
      if (this.lockStep !== -2) {
        this.lockX = this.rootX + this.lockShift;
        this.lockStep = -2;
      }
      if (!rootMoved) this.lockX = this.rootX + easeExp(this.lockX - this.rootX, 0, dtMs, FRAME_LOCK_SETTLE_TAU_MS);
      if (Math.abs(this.lockX - this.rootX) > FRAME_LOCK_MAX_LU || Math.abs(this.lockX - this.rootX) < 0.02) this.lockX = this.rootX;
      this.lockShift = this.lockX - this.rootX;
    } else {
      // no planted feet (wheels, hover, the KO): ease back onto the sim position (about 100 ms)
      this.lockStep = -1;
      this.lockShift = Math.abs(this.lockShift) < 0.05 ? 0 : easeExp(this.lockShift, 0, dtMs, FRAME_LOCK_RELEASE_TAU_MS);
    }
    // R8: footfalls of big units (contact steps from the sheet's walk meta)
    if (walking) {
      if (i !== this.lastWalkStep) {
        this.lastWalkStep = i;
        const c = this.sheet.clips['walk']?.contacts?.find((x) => x.step === i);
        if (c && this.def.heightLu >= FOOTFALL_MIN_HEIGHT_LU) {
          this.footfalls++;
          if (!this.lite && !this.reduceMotion) this.footDust(c.atLu);
        }
      }
    } else this.lastWalkStep = -1;
  }

  /** True once the die clip has played out (cartoon: hidden and the poof spent; realistic: lain and faded). */
  get finished(): boolean {
    if (!this.dead || this.action === null) return false;
    if (this.style === 'cartoon') return this.action.t >= Math.max(this.hideAtMs, this.action.durationMs) + 500;
    return this.action.t >= this.action.durationMs + DEATH_LIE_MS + DEATH_FADE_MS;
  }

  setTeamColor(color: number): void {
    this.teamSprite.tint = color;
    for (const c of this.ground.children) tintPartSprite(c as Container, color);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.destroy({ children: true });
  }
}


/** A one-shot sheet effect (`play` or the first animation), or a projectile that flies along. */
class AtlasEffectView implements EffectView {
  readonly root = new Container();
  private readonly sprite = new Sprite(Texture.EMPTY);
  private readonly teamSprite = new Sprite(Texture.EMPTY);
  private tr: Track | null = null;
  private from: Pt = { x: 0, y: 0 };
  private to: Pt | null = null;
  private travel = 1;
  private arc = false;
  private started = false;
  private elapsed = 0;

  constructor(
    private readonly def: VisualDef,
    private readonly sheet: AtlasData,
    team: number,
  ) {
    this.root.label = def.source;
    this.teamSprite.tint = team;
    const body = new Container();
    body.scale.set(sheet.luPerUnit);
    body.addChild(this.teamSprite, this.sprite);
    this.root.addChild(body);
  }

  get done(): boolean {
    if (!this.started) return false;
    if (this.to) return this.elapsed >= this.travel;
    return this.tr === null || this.elapsed >= this.tr.durationMs;
  }

  private begin(): void {
    const name = Object.keys(this.sheet.animations).find((k) => !k.endsWith('_team')) ?? 'play';
    this.tr = track(this.sheet, { ...this.def, clips: { play: { kind: 'atlas', ref: this.sheet.animations['play'] ? 'play' : name, durationMs: 600, loop: false } } }, 'play', { loop: this.to !== null });
    this.started = true;
    this.elapsed = 0;
  }

  fly(from: Pt, to: Pt, travelMs: number, arc: boolean): void {
    this.from = from;
    this.to = to;
    this.travel = Math.max(1, travelMs);
    this.arc = arc;
    this.root.position.set(from.x, from.y);
    this.begin();
  }

  playAt(at: Pt): void {
    this.to = null;
    this.root.position.set(at.x, at.y);
    this.begin();
  }

  update(dtMs: number): void {
    if (!this.started) return;
    this.elapsed += dtMs;
    if (this.tr) {
      this.tr.t += dtMs;
      const i = frameAt(this.tr);
      setFrame(this.sprite, this.tr.frames[i] ?? Texture.EMPTY);
      setFrame(this.teamSprite, this.tr.team?.[i] ?? Texture.EMPTY);
    }
    if (this.to) {
      const u = Math.min(1, this.elapsed / this.travel);
      const lift = this.arc ? 4 * 60 * u * (1 - u) : 0;
      this.root.position.set(this.from.x + (this.to.x - this.from.x) * u, this.from.y + (this.to.y - this.from.y) * u - lift);
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
