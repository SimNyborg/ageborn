/**
 * Sprite-sheet tier for the world art: turrets and bases rendered by the 3D pipeline
 * (`art/blender/world`, DESIGN B5 "Later tiers"). The `AtlasAdapter` hands turret and base
 * requests here; units and effects stay with it.
 *
 * Sheets are loaded per age (`preload(ages)`: Stone and Medieval at boot, the rest in idle time,
 * B5/B16), and on demand when a view needs an age that is not loaded yet (a base morphing into
 * the next age keeps its old art until the new sheet arrives).
 *
 * Sheet contract (world/common.py):
 * - turrets: `mount` (static footing, 1 frame), `idle` and `fire` (the head only, drawn over the
 *   mount and rotated about `meta.ageborn.pivotLu` to aim), `build` and `destroyed` (the whole
 *   turret); `fire` carries a per-frame `anchorsLu.muzzle`.
 * - bases: `body` (one frame per crumble stage 0-3), one looping clip per flag (`flags`),
 *   `treasury` (frame n = Treasury level n + 1), plus `mountsLu`, `lightsLu`, `smokeLu`, `hornLu`.
 * Every clip has a `<clip>_team` twin: grey team surfaces drawn tinted UNDER the base frame.
 */
import { Assets, ImageSource, Spritesheet, Texture, type SpritesheetData } from 'pixi.js';
import type { VisualDef } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { loadWorldSheet } from './worldPortrait';

export interface WorldClipMeta {
  durationsMs?: number[];
  durationMs?: number;
  loop?: boolean;
  impactAt?: number;
  anchorsLu?: Record<string, [number, number][]>;
}

export interface WorldMeta {
  visualId?: string;
  kind?: 'turret' | 'base' | 'decoration';
  age?: AgeId;
  heightLu: number;
  widthLu?: number;
  pxPerLu: number;
  pivotLu?: [number, number];
  aimLimits?: [number, number];
  mountsLu?: [number, number][];
  flags?: { clip: string; crumbleMax: number; z: 'front' | 'back' }[];
  lightsLu?: { x: number; y: number; crumbleMax: number; r: number }[];
  smokeLu?: { x: number; y: number; crumbleMin: number }[];
  hornLu?: [number, number];
  /** Base skin models (PLAN 2c): the skin id the sheet models (`base.<age>@<skin>`). */
  skin?: string;
  /**
   * Base skin models: their tall joints (tower, mast, chimney, statue) that topple as one piece in the
   * collapse, in screen lu from the gate (`collapse/profiles.ts` ToppleSpec); the age's profile otherwise.
   */
  topple?: { x0: number; x1: number; y0: number; dir: 1 | -1; delayMs: number; push: number; sinkLu: number }[];
  /** Base skin models: the collapse's material family when it differs from the age's (ice, coral, neon). */
  collapseMaterial?: 'stone' | 'iron' | 'concrete' | 'energy';
  /** Base skin models: the rubble and dust colours of its own materials (hex strings). */
  rubbleColors?: string[];
  dustColor?: string;
  /** Base skin models: where the dressing's ambient code particles start (screen lu, y up). */
  ambientLu?: { kind: string; x: number; y: number; r: number; rate: number }[];
  /** Legendary base skin models (PLAN 2c): the white aura the model stands in. */
  aura?: 'legendary';
  /**
   * Legendary base skin models whose aura shines round one spot instead of the body (Colossus Lighthouse's
   * raised torch): its centre (screen lu from the gate, y up) and radius (lu).
   */
  auraLu?: { x: number; y: number; r: number };
  /**
   * Base prop loops (round 3; art/blender/world/common.py `prop_loop`: Windmill Redoubt's sails, Arctic Radar's
   * dish, Crystal Spire's orbiting shards): each an N-frame loop clip over the body (and its `_team` twin), the
   * crumble stages it shows in, drawn in front of or behind the body, the step it holds under Reduce motion, its
   * anchor (screen lu from the gate, y up: where it rides in the collapse) and its opacity.
   */
  props?: { clip: string; crumbleMin: number; crumbleMax: number; z: 'front' | 'back'; holdFrame: number; anchorLu: [number, number]; alpha?: number }[];
  /** Decoration props (round 3): the decoration id. */
  id?: string;
  /** Decoration props: what the code adds over the sheet (plants sway, fire flickers, plasma pulses, crystals glint). */
  motion?: 'sway' | 'flicker' | 'pulse' | 'glint' | null;
  /** Decoration props: the light the code animates (screen lu from the foot, y up; a `#RRGGBB` colour). */
  glowLu?: { x: number; y: number; r: number; color: string };
  /** Decoration props: where glints flash (screen lu from the foot, y up). */
  glintsLu?: { x: number; y: number; r: number }[];
  /** Decoration props: the half width of the contact shadow under the prop (lu). */
  shadowLu?: number;
  /** Decoration props: false when the prop keeps its look on side 1 (banners fly with the lane's one wind). */
  mirror?: boolean;
  clips: Record<string, WorldClipMeta>;
}

export interface WorldSheet {
  animations: Readonly<Record<string, readonly Texture[]>>;
  /** Lu per texture unit (`meta.scale / meta.ageborn.pxPerLu`). */
  luPerUnit: number;
  meta: WorldMeta;
}

interface SheetJson {
  meta: { scale?: string | number; ageborn?: WorldMeta };
}

export type WorldLoader = (url: string) => Promise<WorldSheet>;

async function loadWithAssets(url: string): Promise<WorldSheet> {
  if (isBaseSkinSource(url) || isDecorationSource(url)) return loadSharedSheet(url);
  const sheet = (await Assets.load(url)) as Spritesheet;
  return worldSheetOf(sheet, url);
}

function worldSheetOf(sheet: Spritesheet, url: string): WorldSheet {
  const data = sheet.data as unknown as SheetJson;
  const m = data.meta.ageborn;
  if (!m) throw new Error(`World sheet "${url}" has no meta.ageborn block`);
  const scale = Number(data.meta.scale ?? 1) || 1;
  return { animations: sheet.animations, luPerUnit: scale / m.pxPerLu, meta: m };
}

/**
 * A base skin model's sheet (PLAN 2c) through the menus' loader (`loadWorldSheet`: one fetch of the JSON
 * and one decode of the PNG, shared with the portraits of VS, Home and Customize), parsed into a Pixi
 * spritesheet here. Review 1 saw every model's sheet download twice, once for the portraits and once
 * for the battle; now whichever asks first loads it and the other reuses it.
 */
async function loadSharedSheet(url: string): Promise<WorldSheet> {
  const shared = await loadWorldSheet(url);
  if (!shared) throw new Error(`World sheet "${url}" failed to load`);
  // the same source settings as Pixi's own image loader (premultiplied on upload)
  const source = new ImageSource({ resource: shared.image, alphaMode: 'premultiply-alpha-on-upload', label: url });
  const sheet = new Spritesheet(new Texture({ source, label: url }), shared.json as unknown as SpritesheetData);
  await sheet.parse();
  return worldSheetOf(sheet, url);
}

/** Age of a world sheet from its source path (`art/turrets/<age>/<slug>.json`, `art/bases/<age>.json`). */
export function worldSourceAge(source: string): AgeId | null {
  const m = /art\/(?:turrets\/([a-z]+)\/|bases\/([a-z]+)\.json)/.exec(source);
  return (m?.[1] ?? m?.[2] ?? null) as AgeId | null;
}

/**
 * A base skin model's sheet (PLAN 2c: `art/bases/skins/<skin>.json`). It belongs to one age's base but
 * loads lazily, only when that skin shows (equipped by a side and its age reached, or previewed), never
 * with its age's preload; `worldSourceAge` is null for it.
 */
export function isBaseSkinSource(source: string): boolean {
  return /art\/bases\/skins\/[a-z0-9_]+\.json$/.test(source);
}

/**
 * A base decoration's prop sheet (round 3: `art/cosmetics/decorations/<id>.json`, a few KB). It loads lazily,
 * only when a side shows that decoration (the lane's dressing, the Customize stage), through the same shared
 * loader as the skin models; it belongs to no age (`worldSourceAge` is null) and is never preloaded. The
 * atlas keeps a loaded prop for the session (a battle shows at most six; all 24 decode to under 2 MB).
 */
export function isDecorationSource(source: string): boolean {
  return /art\/cosmetics\/decorations\/[a-z0-9_]+\.json$/.test(source) && !source.endsWith('/thumbs.json');
}

export function isWorldSource(source: string): boolean {
  return worldSourceAge(source) !== null || isBaseSkinSource(source) || isDecorationSource(source);
}

/**
 * How long a sheet that failed to load counts as failed (ms): a dropped fetch (phones on mobile data drop them
 * often) is fetched again by the next ask after this, or at once after `forgetFailures` (a new match).
 */
export const WORLD_RETRY_MS = 5000;

export class WorldAtlas {
  private readonly sheets = new Map<string, WorldSheet>();
  private readonly pending = new Map<string, Promise<WorldSheet | null>>();
  /** Sheets that failed, with the time from which the next ask fetches them again (never: headless). */
  private readonly failed = new Map<string, number>();
  /** Live views drawing each sheet (turrets, forts): `release` never takes a sheet from under one. */
  private readonly views = new Map<string, number>();
  /**
   * Unloads in flight (`release`): a new load of the same sheet waits for them, since Pixi's loader would hand
   * back the asset it is destroying (review N2; the unit sheets' `AtlasAdapter` does the same).
   */
  private readonly unloading = new Map<string, Promise<void>>();

  /**
   * `load` loads a sheet (tests pass a fake), `unload` lets go of a released sheet's URL (default Pixi's
   * `Assets.unload` for Pixi's loader, nothing for another loader), `now` is the clock of the retry window
   * (tests pass a fake).
   */
  constructor(
    private readonly url: (source: string) => string,
    private readonly load: WorldLoader = loadWithAssets,
    private readonly unload: ((url: string) => Promise<void> | void) | null = load === loadWithAssets ? (u) => Assets.unload(u) : null,
    private readonly now: () => number = () => performance.now(),
  ) {}

  get(source: string): WorldSheet | undefined {
    return this.sheets.get(source);
  }

  /** Registers an already loaded sheet (tests). */
  register(source: string, sheet: WorldSheet): void {
    this.sheets.set(source, sheet);
  }

  /**
   * Loads one sheet (once); resolves null when it failed. A failed sheet resolves null at once for
   * {@link WORLD_RETRY_MS}; the first ask after that (or after `forgetFailures`) fetches it again.
   */
  ensure(source: string): Promise<WorldSheet | null> {
    const hit = this.sheets.get(source);
    if (hit) return Promise.resolve(hit);
    const retryAt = this.failed.get(source);
    if (retryAt !== undefined) {
      if (this.now() < retryAt) return Promise.resolve(null);
      this.failed.delete(source);
    }
    if (this.load === loadWithAssets && typeof document === 'undefined') {
      // headless (tests, tools): no fetch of app assets; the procedural tier draws instead
      this.failed.set(source, Infinity);
      return Promise.resolve(null);
    }
    let p = this.pending.get(source);
    if (!p) {
      // (a load `forgetSkins` dropped while it was on the way resolves for its callers but is not kept; a sheet
      // still being unloaded loads again only once that is done)
      const prior = this.unloading.get(source);
      const url = this.url(source);
      const mine: Promise<WorldSheet | null> = (prior ? prior.then(() => this.load(url)) : this.load(url))
        .then((s) => {
          if (this.pending.get(source) === mine) this.sheets.set(source, s);
          return s;
        })
        .catch((e: unknown) => {
          if (this.pending.get(source) === mine) this.failed.set(source, this.now() + WORLD_RETRY_MS);
          console.warn(`[visuals] world sheet "${source}" failed to load; the stand-in is used until a later try`, e);
          return null;
        })
        .finally(() => {
          if (this.pending.get(source) === mine) this.pending.delete(source);
        });
      p = mine;
      this.pending.set(source, p);
    }
    return p;
  }

  /**
   * Forgets the sheets that failed to load (a new match: `prefetchMatch`, `beginMatch`), so the next ask
   * fetches them again at once instead of after the rest of {@link WORLD_RETRY_MS}. Headless failures stay.
   */
  forgetFailures(): void {
    for (const [source, retryAt] of [...this.failed]) if (retryAt !== Infinity) this.failed.delete(source);
  }

  /** Whether a sheet is held as failed right now (tests). */
  isFailed(source: string): boolean {
    const retryAt = this.failed.get(source);
    return retryAt !== undefined && this.now() < retryAt;
  }

  /**
   * Drops the base skin model sheets `keep` does not want (review 2, Safari memory): their decoded image
   * belongs to the menus' loader (`loadWorldSheet`), which lets go of it at the same time, and their GPU
   * copy is freed. A dropped model loads again when something asks for it; the age sheets (`preload`) stay.
   */
  forgetSkins(keep: (source: string) => boolean): number {
    let n = 0;
    for (const source of [...this.pending.keys()]) if (isBaseSkinSource(source) && !keep(source)) this.pending.delete(source);
    for (const [source, sheet] of [...this.sheets]) {
      if (!isBaseSkinSource(source) || keep(source)) continue;
      this.sheets.delete(source);
      const sources = new Set<Texture['source']>();
      for (const frames of Object.values(sheet.animations)) for (const t of frames) sources.add(t.source);
      for (const s of sources) s.unload();
      n++;
    }
    return n;
  }

  /** Counts a view drawing a sheet until the returned release runs (idempotent). */
  retain(source: string): () => void {
    this.views.set(source, (this.views.get(source) ?? 0) + 1);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const n = (this.views.get(source) ?? 1) - 1;
      if (n > 0) this.views.set(source, n);
      else this.views.delete(source);
    };
  }

  /** Live views on a sheet (tests). */
  viewCount(source: string): number {
    return this.views.get(source) ?? 0;
  }

  /**
   * Lets go of the loaded sheets `drop` names that no live view draws (a battle's passed ages, 2026-10-18):
   * their textures and decoded copies go (Pixi's `Assets.unload`); a sheet asked for again loads again. Base
   * skin models are left to `forgetSkins`, loads in flight to finish. Returns how many sheets went.
   */
  release(drop: (source: string) => boolean): number {
    let n = 0;
    for (const source of [...this.sheets.keys()]) {
      if (isBaseSkinSource(source) || (this.views.get(source) ?? 0) > 0 || !drop(source)) continue;
      this.sheets.delete(source);
      this.failed.delete(source);
      n++;
      const unload = this.unload;
      if (unload) {
        const url = this.url(source);
        const done: Promise<void> = Promise.resolve()
          .then(() => unload(url))
          .catch((e: unknown) => console.warn(`[visuals] unloading "${url}" failed`, e))
          .then(() => {
            if (this.unloading.get(source) === done) this.unloading.delete(source);
          });
        this.unloading.set(source, done);
      }
    }
    return n;
  }

  /**
   * The page is going away (the provider's `releaseAll`): closes the decoded bitmap behind every loaded sheet,
   * so none waits for the garbage collector while the next page loads. Nothing draws from them afterwards.
   */
  releaseDecoded(): void {
    for (const sheet of this.sheets.values()) {
      const seen = new Set<Texture['source']>();
      for (const frames of Object.values(sheet.animations)) for (const t of frames) seen.add(t.source);
      for (const s of seen) if (typeof ImageBitmap !== 'undefined' && s.resource instanceof ImageBitmap) s.resource.close();
    }
  }

  /** Loads the world sheets of the given ages among `defs` (only those `want` accepts, when given). */
  async preload(ages: readonly AgeId[], defs: readonly VisualDef[], want?: (source: string) => boolean): Promise<void> {
    const set = new Set(ages);
    const todo = [...new Set(defs.filter((d) => d.kind === 'atlas' && isWorldSource(d.source)).map((d) => d.source))].filter((s) => {
      const a = worldSourceAge(s);
      return a !== null && set.has(a) && (want?.(s) ?? true);
    });
    await Promise.all(todo.map((s) => this.ensure(s)));
  }
}

/** Frame index at time t (ms) of a clip with per-frame durations. */
export function frameIndex(durations: readonly number[], t: number, loop: boolean): number {
  const total = durations.reduce((a, b) => a + b, 0);
  if (durations.length === 0 || total <= 0) return 0;
  let at = loop ? ((t % total) + total) % total : Math.min(t, total - 1e-6);
  for (let i = 0; i < durations.length; i++) {
    at -= durations[i] ?? 0;
    if (at < 0) return i;
  }
  return durations.length - 1;
}

/** Per-step durations of an animation (the sheet's `durationsMs`, or an even split). */
export function clipDurations(sheet: WorldSheet, clip: string, fallbackMs = 100): number[] {
  const frames = sheet.animations[clip]?.length ?? 0;
  const d = sheet.meta.clips[clip]?.durationsMs;
  if (d && d.length === frames) return [...d];
  return Array.from({ length: frames }, () => fallbackMs);
}

/** Swaps a sprite's texture and pins it at the frame's anchor (the feet, set by the sheet). */
export function setFrame(s: { texture: Texture; anchor: { set(x: number, y: number): void } }, tex: Texture | undefined): void {
  const t = tex ?? Texture.EMPTY;
  if (s.texture === t) return;
  s.texture = t;
  const a = t.defaultAnchor;
  if (a) s.anchor.set(a.x, a.y);
}
