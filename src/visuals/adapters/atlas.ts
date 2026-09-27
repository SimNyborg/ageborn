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
import { STYLE } from '../style';
import type { ClipDef } from '../types';
import { partSprite, tintPartSprite } from './procedural/shared';
import type { BackdropRequest, BaseRequest, EffectRequest, PortraitRequest, ViewKind, ViewRequest, VisualAdapter } from './types';

/** What the adapter needs from a loaded sheet (a Pixi Spritesheet, or a fake in tests). */
export interface AtlasData {
  animations: Readonly<Record<string, readonly Texture[]>>;
  /** Scale of the sheet (texture units per lu = `meta.scale / meta.ageborn.pxPerLu`). */
  luPerUnit: number;
  clips: Readonly<Record<string, AtlasClipMeta>>;
}

export interface AtlasClipMeta {
  durationsMs?: readonly number[];
  durationMs?: number;
  loop?: boolean;
  impactAt?: number;
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
}

function baseUrl(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

export class AtlasAdapter implements VisualAdapter {
  readonly kind = 'atlas' as const;
  readonly available = true;
  private readonly sheets = new Map<string, AtlasData>();
  private readonly failed = new Set<string>();

  constructor(private readonly o: AtlasOptions) {}

  private url(source: string): string {
    if (/^(https?:|data:|\/)/.test(source)) return source;
    return `${this.o.baseUrl ?? baseUrl()}${source}`;
  }

  /** Registers an already loaded sheet (tests, or sheets bundled some other way). */
  register(source: string, data: AtlasData): void {
    this.sheets.set(source, data);
  }

  canDraw(what: ViewKind, def: VisualDef): boolean {
    if (def.kind !== 'atlas' || !this.sheets.has(def.source)) return false;
    return what === 'unit' || what === 'effect' || what === 'projectile';
  }

  async preload(_ages: AgeId[]): Promise<void> {
    const load = this.o.load ?? loadWithAssets;
    const todo = [...new Set(this.o.entries().filter((d) => d.kind === 'atlas').map((d) => d.source))].filter((s) => !this.sheets.has(s) && !this.failed.has(s));
    await Promise.all(
      todo.map(async (s) => {
        try {
          this.sheets.set(s, await load(this.url(s)));
        } catch (e) {
          this.failed.add(s);
          console.warn(`[visuals] atlas "${s}" failed to load; placeholders are drawn instead`, e);
        }
      }),
    );
  }

  private sheet(def: VisualDef): AtlasData {
    const s = this.sheets.get(def.source);
    if (!s) throw new Error(`Atlas "${def.source}" is not loaded`);
    return s;
  }

  createUnit(r: ViewRequest): UnitView {
    return new AtlasUnitView(r.def, this.sheet(r.def), this.o.decor, r.side, teamColor(r.side, r.teamPreset));
  }

  createProjectile(r: EffectRequest): EffectView {
    return new AtlasEffectView(r.def, this.sheet(r.def), teamColor(r.side, r.teamPreset));
  }

  createEffect(r: EffectRequest): EffectView {
    return new AtlasEffectView(r.def, this.sheet(r.def), teamColor(r.side, r.teamPreset));
  }

  createTurret(r: ViewRequest): TurretView {
    throw new Error(`Atlas turrets are not supported yet (${r.key})`);
  }

  createBase(r: BaseRequest): BaseView {
    throw new Error(`Atlas bases are not supported yet (${r.key})`);
  }

  createBackdrop(r: BackdropRequest): BackdropView {
    throw new Error(`Atlas backdrops are not supported yet (${r.left.def.source})`);
  }

  async portrait(_r: PortraitRequest): Promise<string> {
    return '';
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

class AtlasUnitView implements UnitView {
  readonly root = new Container();
  readonly anchors: Anchors;
  private readonly body = new Container();
  private readonly teamSprite: Sprite;
  private readonly baseSprite: Sprite;
  private readonly flashSprite: Sprite;
  private readonly ground = new Container();
  private glyph: Container | null = null;
  private glyphGroup: RoleGroup | null = null;
  private trim: Container | null = null;
  private trimName: UnitPose['levelTrim'] = 'none';
  private base: Track | null;
  private action: Track | null = null;
  private frozenMs = 0;
  private flashMs = 0;
  private flashDur = 1;
  private stunned = false;
  private requested = 'idle';
  private hop = 0;
  /** Spawn pop time (A11: scale 0 → 1.15 → 1 over 180 ms, ease-out-back), -1 when done. */
  private spawnT = -1;
  private dead = false;
  private destroyed = false;

  constructor(
    private readonly def: VisualDef,
    private readonly sheet: AtlasData,
    private readonly decor: PartBaker,
    private readonly side: Side,
    private readonly team: number,
  ) {
    this.anchors = def.anchors;
    this.root.label = def.source;
    const ring = partSprite(decor, side === 0 ? 'shared.ring.circle' : 'shared.ring.diamond', UI_ZONES, team);
    ring.scale.set(Math.max(1, (def.heightLu > 150 ? 80 : def.heightLu > 90 ? 48 : 24) / 26), 1);
    this.ground.addChild(ring);
    this.teamSprite = new Sprite(Texture.EMPTY);
    this.teamSprite.tint = team;
    this.baseSprite = new Sprite(Texture.EMPTY);
    this.flashSprite = new Sprite(Texture.EMPTY);
    this.flashSprite.blendMode = 'add';
    this.flashSprite.visible = false;
    this.body.addChild(this.teamSprite, this.baseSprite, this.flashSprite);
    this.body.scale.set(sheet.luPerUnit * (side === 0 ? 1 : -1), sheet.luPerUnit);
    this.root.addChild(this.ground, this.body);
    this.base = track(sheet, def, 'idle', { loop: true });
    this.show();
  }

  setPose(p: UnitPose): void {
    if (this.destroyed) return;
    this.root.position.set(p.x, p.y);
    this.body.scale.x = this.sheet.luPerUnit * p.facing;
    this.root.alpha = p.alpha;
    if (p.roleGlyph !== this.glyphGroup) {
      this.glyphGroup = p.roleGlyph;
      this.glyph?.destroy({ children: true });
      this.glyph = partSprite(this.decor, `icon.role.${p.roleGlyph}`, UI_ZONES, this.team);
      this.glyph.position.set(0, 6.6);
      this.glyph.scale.set(STYLE.roleGlyphLu / 17.2);
      this.ground.addChild(this.glyph);
    }
    if (p.levelTrim !== this.trimName) {
      this.trimName = p.levelTrim;
      this.trim?.destroy({ children: true });
      this.trim = p.levelTrim === 'none' ? null : partSprite(this.decor, `trim.${p.levelTrim}`, UI_ZONES);
      if (this.trim) {
        this.trim.position.set(9.6, 5.4);
        this.trim.scale.set(0.8);
        this.ground.addChild(this.trim);
      }
    }
    if (p.stunned !== this.stunned) {
      this.stunned = p.stunned;
      this.play(p.stunned ? 'stun' : this.requested);
    }
    this.body.tint = p.frozen ? 0xd9d2f2 : 0xffffff;
  }

  play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean }): void {
    if (this.destroyed || this.dead) return;
    if (clip === 'idle' || clip === 'walk' || clip === 'victory') this.requested = clip;
    const loops = clip === 'idle' || clip === 'walk' || clip === 'victory' || clip === 'stun';
    const t = track(this.sheet, this.def, clip, loops ? { loop: true, ...o } : o);
    if (!t) return;
    if (clip === 'spawn') this.spawnT = 0;
    if (clip === 'victory') this.hop = 0;
    if (clip === 'die') this.dead = true;
    if (loops && o?.loop !== false) this.base = t;
    else this.action = t;
  }

  freeze(ms: number): void {
    this.frozenMs = Math.max(this.frozenMs, ms);
  }

  flash(ms: number, color = 0xffffff): void {
    this.flashMs = ms;
    this.flashDur = Math.max(1, ms);
    this.flashSprite.tint = color;
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    if (this.frozenMs > 0) {
      const used = Math.min(this.frozenMs, dtMs);
      this.frozenMs -= used;
      dtMs -= used;
    }
    if (dtMs > 0) {
      if (this.base) this.base.t += dtMs;
      if (this.action) {
        this.action.t += dtMs;
        if (!this.action.hold && !this.action.loop && this.action.t >= this.action.durationMs) this.action = null;
      }
      // spawn pop and the victory hop are code motion, so every sheet gets them
      if (this.spawnT >= 0) {
        this.spawnT += dtMs;
        const u = Math.min(1, this.spawnT / 180);
        this.root.scale.set(u < 0.62 ? 0.05 + (1.1 * u) / 0.62 : 1.15 - (0.15 * (u - 0.62)) / 0.38);
        if (u >= 1) this.spawnT = -1;
      }
      if (this.requested === 'victory' && !this.action) {
        this.hop += dtMs;
        this.body.y = -Math.abs(Math.sin((this.hop / 700) * Math.PI)) * 8;
      } else if (this.body.y !== 0) this.body.y = 0;
      if (this.dead && this.action && this.action.t > this.action.durationMs) this.root.alpha = Math.max(0, 1 - (this.action.t - this.action.durationMs) / 300);
    }
    if (this.flashMs > 0) {
      this.flashMs = Math.max(0, this.flashMs - dtMs);
      this.flashSprite.visible = this.flashMs > 0;
      this.flashSprite.alpha = this.flashMs / this.flashDur;
    }
    this.show();
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

  /** True once the die clip has played out. */
  get finished(): boolean {
    return this.dead && this.action !== null && this.action.t >= this.action.durationMs + 300;
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
