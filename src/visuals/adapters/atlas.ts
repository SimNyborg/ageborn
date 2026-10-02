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
import { isWorldSource, WorldAtlas } from './worldAtlas';

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
}

export interface AtlasClipMeta {
  durationsMs?: readonly number[];
  durationMs?: number;
  loop?: boolean;
  impactAt?: number;
  /** Walk only: ground speed at the authored timing (feet do not slide at this speed). */
  naturalSpeedLuPerS?: number;
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
}

export interface AtlasJson {
  animations?: Record<string, string[]>;
  meta: { scale?: string | number; ageborn?: AtlasMeta };
}

const UNIT_CLIPS: readonly ClipName[] = ['spawn', 'idle', 'walk', 'attack', 'hit', 'stun', 'die', 'victory', 'ability'];

/**
 * Realistic weight for the rendered (atlas) units (docs/ui-plan.md 5.8, MR-100, MR-103, MR-105):
 * bodies are rigid, so weight shows through timing and a few lu of offset, never a scale squash.
 * Mass classes: light (infantry, ranged, support), medium (anti-armor, taller than 90 lu), heavy
 * (the Heavy class, or taller than 150 lu).
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
    clips[name] = { kind: 'atlas', ref: src, durationMs: c.durationMs ?? (summed > 0 ? summed : 600), loop: c.loop ?? (name === 'idle' || name === 'walk') };
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
  return {
    animations: sheet.animations,
    luPerUnit: m ? scale / m.pxPerLu : 1,
    clips: m?.clips ?? {},
    ...(m?.heightLu ? { heightLu: m.heightLu } : {}),
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
  private readonly sheets = new Map<string, AtlasData>();
  private readonly failed = new Set<string>();
  private readonly pending = new Map<string, Promise<void>>();

  /** Turret and base sheets (3D world art), loaded per age. */
  readonly world: WorldAtlas;

  constructor(private readonly o: AtlasOptions) {
    this.world = new WorldAtlas((s) => this.url(s));
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

  /** Loads one unit or effect sheet (once); failures are remembered and warned about. */
  ensure(source: string): Promise<void> {
    if (this.sheets.has(source) || this.failed.has(source)) return Promise.resolve();
    let p = this.pending.get(source);
    if (!p) {
      const load = this.o.load ?? loadWithAssets;
      const url = this.url(source);
      const hd = this.o.hd ? hdSheetUrl(url) : url;
      p = (hd === url ? load(url) : load(hd).catch(() => load(url)))
        .then((d) => void this.sheets.set(source, d))
        .catch((e: unknown) => {
          this.failed.add(source);
          console.warn(`[visuals] atlas "${source}" failed to load; the procedural art is drawn instead`, e);
        })
        .finally(() => this.pending.delete(source));
      this.pending.set(source, p);
    }
    return p;
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
    await Promise.all(this.unitSources(ages).map((s) => this.ensure(s)));
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

  createUnit(r: ViewRequest): UnitView {
    return new AtlasUnitView(r.def, this.sheet(r.def), this.o.decor, r.side, teamColor(r.side, r.teamPreset), { seed: r.seed, ...(this.o.quality ? { quality: this.o.quality } : {}) });
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
    });
  }

  createBackdrop(r: BackdropRequest): BackdropView {
    throw new Error(`Atlas backdrops are not supported yet (${r.left.def.source})`);
  }

  async portrait(r: PortraitRequest): Promise<string> {
    const still = portraitStillBase(r.def.source);
    const puppet = puppetById(r.key);
    const color = teamColor(r.side, r.teamPreset);
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
}

function track(sheet: AtlasData, def: VisualDef, name: string, o: { durationMs?: number; impactAtMs?: number; loop?: boolean } = {}): Track | null {
  const anim = def.clips[name]?.ref ?? (FALLBACK[name] ?? [name]).find((c) => sheet.animations[c]);
  if (!anim) return null;
  const frames = sheet.animations[anim];
  if (!frames || frames.length === 0) return null;
  const meta = sheet.clips[anim] ?? {};
  const authored = meta.durationsMs && meta.durationsMs.length === frames.length ? meta.durationsMs : frames.map(() => (def.clips[name]?.durationMs ?? 600) / frames.length);
  const total = authored.reduce((a, b) => a + b, 0);
  const impactAt = name === 'attack' ? def.events.attack.impactAt : (meta.impactAt ?? null);
  let durationMs = o.durationMs ?? total;
  if (o.durationMs === undefined && o.impactAtMs !== undefined && impactAt !== null) durationMs = o.impactAtMs + total * (1 - impactAt);
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
  };
}

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

class AtlasUnitView implements UnitView {
  readonly root = new Container();
  readonly anchors: Anchors;
  private readonly body = new Container();
  private readonly teamSprite: Sprite;
  private readonly baseSprite: Sprite;
  private readonly flashSprite: Sprite;
  private readonly ground = new Container();
  private readonly overlay = new Container();
  private readonly puffs: PuffList;
  private readonly rng: CosmeticRng;
  private readonly facing0: 1 | -1;
  private facing: 1 | -1;
  /** Sprite scale: the sheet's density, times `heightLu / sheet heightLu` for an entry drawn smaller (levies). */
  private readonly k: number;
  private glyph: Container | null = null;
  private glyphGroup: RoleGroup | null = null;
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
  /** Spawn arrival time (MR-100: a short drop and settle, no scale), -1 when done. */
  private spawnT = -1;
  /** Hit flinch time (MR-103), -1 when done. */
  private flinchT = -1;
  private dead = false;
  /** Death hand-off (sheet `die.fx`): effects still to spawn, and when the body hides. */
  private deathFx: { id: string; atMs: number; offsetLu?: readonly [number, number]; scale?: number; loops?: number }[] = [];
  private hideAtMs = -1;
  private sinkDust = false;
  private destroyed = false;

  constructor(
    private readonly def: VisualDef,
    private readonly sheet: AtlasData,
    private readonly decor: PartBaker,
    side: Side,
    private readonly team: number,
    o: { quality?: 'high' | 'lite'; seed?: number } = {},
  ) {
    this.anchors = def.anchors;
    this.root.label = def.source;
    this.facing0 = side === 0 ? 1 : -1;
    this.facing = this.facing0;
    this.rng = mulberry32(o.seed ?? 1);
    const size = def.heightLu > 150 ? 3.1 : def.heightLu > 90 ? 1.85 : 1;
    // Team ring (A11 redundant cue) behind the contact shadow: flatter and a little wider than the
    // body, at 60% alpha, so it reads as a ground marker and does not clutter the feet of a crowd.
    const ring = partSprite(decor, side === 0 ? 'shared.ring.circle' : 'shared.ring.diamond', UI_ZONES, team);
    ring.scale.set(size * RING_WIDEN, RING_FLATTEN);
    ring.alpha = RING_ALPHA;
    this.ground.addChild(ring);
    if (o.quality !== 'lite') {
      const sh = partSprite(decor, 'shared.shadow', UI_ZONES);
      sh.scale.set(size * 1.1, 1);
      this.ground.addChild(sh);
    }
    this.teamSprite = new Sprite(Texture.EMPTY);
    this.teamSprite.tint = team;
    this.baseSprite = new Sprite(Texture.EMPTY);
    this.flashSprite = new Sprite(Texture.EMPTY);
    this.flashSprite.blendMode = 'add';
    this.flashSprite.visible = false;
    this.body.addChild(this.teamSprite, this.baseSprite, this.flashSprite);
    const hk = sheet.heightLu && def.heightLu > 0 ? def.heightLu / sheet.heightLu : 1;
    this.k = sheet.luPerUnit * (Math.abs(hk - 1) > 0.02 ? hk : 1);
    this.body.scale.set(this.k * this.facing, this.k);
    if (def.filters?.alpha !== undefined) this.body.alpha = def.filters.alpha;
    this.root.addChild(this.ground, this.body, this.overlay);
    this.puffs = new PuffList(this.overlay);
    this.base = track(sheet, def, 'idle', { loop: true });
    if (this.base) this.base.t = this.rng.next() * this.base.durationMs; // crowds do not breathe in step
    this.show();
  }

  setPose(p: UnitPose): void {
    if (this.destroyed) return;
    this.root.position.set(p.x, p.y);
    if (p.facing !== this.facing) {
      this.facing = p.facing;
      this.body.scale.x = this.k * p.facing;
      for (const o of [this.stars, this.clock, this.bubble]) if (o) o.x = this.anchors.hitCenter.x * p.facing;
    }
    this.root.alpha = p.alpha;
    if (p.roleGlyph !== this.glyphGroup) {
      this.glyphGroup = p.roleGlyph;
      this.glyph?.destroy({ children: true });
      this.glyph = partSprite(this.decor, `icon.role.${p.roleGlyph}`, UI_ZONES, this.team);
      this.glyph.position.set(0, 5.2);
      this.glyph.scale.set(STYLE.roleGlyphLu / 17.2, (STYLE.roleGlyphLu / 17.2) * 0.72);
      this.glyph.alpha = 0.85;
      this.ground.addChild(this.glyph);
    }
    if (p.levelTrim !== this.trimName) {
      this.trimName = p.levelTrim;
      this.trim?.destroy({ children: true });
      this.trim = p.levelTrim === 'none' ? null : partSprite(this.decor, `trim.${p.levelTrim}`, UI_ZONES);
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

  play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean }): void {
    if (this.destroyed || this.dead) return;
    if (clip === 'idle' || clip === 'walk' || clip === 'victory') this.requested = clip;
    if (this.stunned && (clip === 'idle' || clip === 'walk')) return;
    const loops = clip === 'idle' || clip === 'walk' || clip === 'victory' || clip === 'stun';
    let opts = o;
    if (clip === 'walk') {
      // play the walk at the sim's speed so the feet stay planted (sheet `naturalSpeedLuPerS`)
      const t0 = track(this.sheet, this.def, 'walk');
      if (t0 && t0.name === 'walk' && t0.anim === 'walk') {
        const meta = this.sheet.clips[t0.anim];
        const authored = t0.steps.reduce((a, b) => a + b, 0);
        // a smaller entry (a levy) strides shorter in lu: scale the natural speed with it
        const natural = meta?.naturalSpeedLuPerS !== undefined ? meta.naturalSpeedLuPerS * (this.k / this.sheet.luPerUnit) : undefined;
        opts = { ...o, durationMs: atlasWalkDurationMs(authored, natural, o?.durationMs) };
      }
    }
    const t = track(this.sheet, this.def, clip, loops ? { loop: true, ...opts } : opts);
    if (!t) return;
    if (clip === 'spawn') {
      this.spawnT = 0;
      this.spawnDust();
    }
    if (clip === 'victory') this.hop = 0;
    if (clip === 'die') this.die();
    if (loops && opts?.loop !== false) {
      // keep the phase when a loop restarts at a new speed (no foot pop)
      if (this.base && this.base.anim === t.anim && this.base.durationMs > 0) t.t = (this.base.t % this.base.durationMs) * (t.durationMs / this.base.durationMs);
      this.base = t;
    } else this.action = t;
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
    // A victim flash is a hit: the body flinches back by its mass (MR-103), never squashes.
    if (!this.dead) this.flinchT = 0;
  }

  private mass(): UnitMass {
    return unitMass(this.glyphGroup, this.def.heightLu);
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clockMs += dtMs;
    let animDt = dtMs;
    // Offsets are code motion on a rigid body (5.8): x = hitstop jitter + flinch, y = spawn, hop, sink.
    let ox = 0;
    let oy = this.body.y;
    if (this.frozenMs > 0) {
      const used = Math.min(this.frozenMs, animDt);
      this.frozenMs -= used;
      animDt -= used;
      // local hitstop jitter (A12: 1-2 px)
      ox = (this.rng.next() - 0.5) * 2.4;
    }
    if (animDt > 0 && !this.frozenPose) {
      if (this.base) this.base.t += animDt;
      if (this.action) {
        this.action.t += animDt;
        if (!this.action.hold && !this.action.loop && this.action.t >= this.action.durationMs) this.action = null;
      }
      oy = 0;
      // the spawn arrival and the victory hop are code motion, so every sheet gets them
      if (this.spawnT >= 0) {
        this.spawnT += animDt;
        const a = spawnArrival(this.mass(), this.spawnT);
        oy += a.y;
        this.body.alpha = (this.def.filters?.alpha ?? 1) * a.alpha;
        if (this.spawnT >= UNIT_WEIGHT[this.mass()].spawnMs) {
          this.spawnT = -1;
          this.body.alpha = this.def.filters?.alpha ?? 1;
        }
      }
      if (this.flinchT >= 0) {
        this.flinchT += animDt;
        if (this.flinchT >= UNIT_WEIGHT[this.mass()].flinchMs) this.flinchT = -1;
      }
      let rot = 0;
      if (this.base && this.base.name === 'walk' && !this.action && !this.dead && this.base.durationMs > 0) {
        const st = walkStep(this.mass(), this.base.t / this.base.durationMs);
        oy += st.y;
        rot = st.rot;
      }
      this.body.rotation = rot;
      if (this.requested === 'victory' && !this.action) {
        this.hop += animDt;
        oy -= Math.abs(Math.sin((this.hop / 700) * Math.PI)) * 8;
      }
      if (this.dead && this.action) {
        this.deathHandoff(this.action.t);
        // MR-105: the body lies, then sinks a little as the render fades it out.
        const sinkT = this.action.t - this.action.durationMs - DEATH_LIE_MS;
        if (sinkT > 0) oy += DEATH_SINK_LU * Math.min(1, sinkT / DEATH_FADE_MS);
      }
    }
    // the flinch pushes the body back, away from what it faces
    if (this.flinchT >= 0) ox -= this.facing * flinchOffset(this.mass(), this.flinchT);
    this.body.x = ox;
    this.body.y = oy;
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
    this.show();
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
    // A sheet's hide at the end of its fall is not honoured: the body lies for DEATH_LIE_MS and then
    // sinks and fades (MR-105, realistic weight); an earlier hide (a body that bursts) still is.
    const dur = this.action?.durationMs ?? 0;
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
    // MR-100: a dust ring at the feet as the body takes its weight (ground-toned, 5.8).
    const k = UNIT_WEIGHT[this.mass()].settleLu / UNIT_WEIGHT.light.settleLu;
    for (let i = 0; i < 5; i++) {
      const s = partSprite(this.decor, 'fx.p.dust', UI_ZONES);
      const dir = i < 2 ? -1 : 1;
      s.position.set((this.rng.next() - 0.5) * 16, -2);
      this.puffs.add(s, { vx: dir * (30 + this.rng.next() * 50), vy: -12 - this.rng.next() * 18, life: 380 + this.rng.next() * 160, s0: 0.5, s1: Math.min(2, 1.1 * Math.sqrt(k)), a0: 0.55 });
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

  private show(): void {
    const tr = this.action ?? this.base;
    if (!tr) return;
    const i = frameAt(tr);
    const tex = tr.frames[i] ?? Texture.EMPTY;
    setFrame(this.baseSprite, tex);
    setFrame(this.flashSprite, tex);
    setFrame(this.teamSprite, tr.team?.[i] ?? Texture.EMPTY);
  }

  /** True once the die clip has played out and the body has lain and faded (MR-105). */
  get finished(): boolean {
    return this.dead && this.action !== null && this.action.t >= this.action.durationMs + DEATH_LIE_MS + DEATH_FADE_MS;
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
