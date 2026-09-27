/**
 * The battle view (DESIGN B6, A2.1, A11, A12): renders a running sim with an injected `ArtProvider`
 * and `AudioService`.
 *
 * - Layers, interpolation between ticks, camera (fit plus mobile pinch-follow) and depth rows.
 * - The event mapper turns each tick's `SimEvent`s into clips, feel (hitstop with the global cap,
 *   shake, flash), particles, numbers, sounds and music.
 * - Health bars with ghost segments, power telegraphs and drag targeting, mount markers and taps.
 * - Split-age backdrop seam and the evolve sequence (base morph, backdrop wipe, pillar, cheer).
 * - Graphics presets with the Auto fallback.
 *
 * It only reads sim state and events; the sim owns all timing (B5). The session calls
 * `onEvents(events)` after every `sim.step` and `render(alpha, frameMs)` once per frame, and pauses its
 * accumulator while `simFrozen` is true (global freezes, A12).
 */
import type {
  AgeId,
  ArtProvider,
  AudioService,
  BackdropView,
  BaseView,
  CardId,
  EffectView,
  MatchConfig,
  PowerDef,
  Pt,
  Side,
  SimEvent,
  SimState,
  TurretView,
  UnitDef,
  UnitPose,
  UnitState,
  UnitView,
} from '@/contracts';
import { mulberry32, type CosmeticRng } from '@/core';
import { ColorMatrixFilter, Graphics, type Container } from 'pixi.js';
import { Camera } from './camera';
import { depthRows, depthZ, easeToward } from './depth';
import { EventMapper, crumbleStage, decodeTurretSource, type UnitInfo } from './eventMapper';
import { FeelDirector } from './feel/director';
import { FloatingNumbers, bitmapLabelFactory, type LabelFactory } from './feel/numbers';
import { ParticlePool } from './feel/particlePool';
import { cloneFeelConfig, defaultFeelConfig, type RenderFeelConfig } from './feelConfig';
import { HealthBars, barWidthLu, newBar, stepBar, type BarDraw, type BarState } from './healthbars';
import { ageOrder } from './hudModel';
import { BattleInput } from './input';
import { createLayers, type BattleLayers } from './layers';
import { MILLI_LU, baseCenterX, facingOf, gateX, pToX, xToP } from './layout';
import { MOUNT_TAP_LU, MOUNT_TAP_PX, MountMarkers, hitTestMount, mountTapKind, mountWorldPoints } from './mounts';
import { ZoneOverlay, clampPowerP, powerZoneLu } from './powerTargeting';
import { AutoPresetMonitor, PRESETS, particleCap, presetDpr, type GraphicsPreset } from './presets';
import { SEAM_START_LU, frontMidpoint, stepSeam } from './seam';
import { teamColor } from './teamColors';
import { DEFAULT_VIEW_SETTINGS, type Anchor, type ViewAction, type ViewEvent, type ViewEventListener, type ViewSettings } from './types';

export interface BattleViewOptions {
  /** The running sim (or anything with read-only state and config, such as a replay). */
  sim: { readonly state: Readonly<SimState>; readonly config: Readonly<MatchConfig> };
  art: ArtProvider;
  audio: AudioService;
  /** The side whose HUD, colours and "own" feel apply. Default 0 (the player). */
  mySide?: Side;
  settings?: Partial<ViewSettings>;
  feel?: RenderFeelConfig;
  /** Mobile devices get the lower particle cap and Lite under Auto. */
  isMobile?: boolean;
  /** Arena id for the ground layer (A14.1 `ground.<arena>`). */
  arena?: string;
  /** Cosmetic RNG seed (defaults to the match seed). */
  seed?: number;
  /** Text factory for numbers and labels (tests pass a plain one). */
  labelFactory?: LabelFactory;
  /** Called when the Auto preset drops to Lite (the host lowers the resolution). */
  onPresetChange?: (preset: GraphicsPreset) => void;
}

type LoopClip = 'walk' | 'idle';

interface UnitEntry {
  id: number;
  side: Side;
  card: CardId;
  def: UnitDef | undefined;
  view: UnitView;
  air: boolean;
  sizeLu: number;
  level: number;
  /** Interpolated world x (lu). */
  x: number;
  /** Current depth y (lu), easing toward the row. */
  y: number;
  bar: BarState;
  shieldBp: number;
  stunned: boolean;
  frozen: boolean;
  moving: boolean;
  dying: boolean;
  dieLeftMs: number;
  jitterLeftMs: number;
  jitterPx: number;
  loopClip: LoopClip | null;
  oneShotLeftMs: number;
  aura: EffectView | null;
  pose: UnitPose;
}

interface TurretEntry {
  side: Side;
  mount: number;
  card: CardId;
  view: TurretView;
  selling: boolean;
  outdated: boolean;
}

interface BaseEntry {
  side: Side;
  view: BaseView;
  age: AgeId;
  crumble: 0 | 1 | 2 | 3;
  treasury: number;
  glow: boolean;
  flashLeftMs: number;
  mountsLocal: Pt[];
}

interface ProjectileEntry {
  key: string;
  view: EffectView;
}

/** One-shot clip lengths used to know when to go back to walk/idle (ms of game time). */
const ONE_SHOT_MS = { spawn: 260, hit: 160, ability: 650, stun: 900, victory: 900, attackRecover: 220 } as const;
const AIR_TAGS = 'air';

function levelTrim(level: number): UnitPose['levelTrim'] {
  if (level >= 10) return 'gold';
  if (level >= 7) return 'silver';
  if (level >= 4) return 'bronze';
  return 'none';
}

export class BattleView {
  readonly root: Container;
  readonly camera: Camera;
  readonly layers: BattleLayers;
  readonly director: FeelDirector;
  readonly mySide: Side;
  private readonly sim: BattleViewOptions['sim'];
  private readonly config: Readonly<MatchConfig>;
  private readonly art: ArtProvider;
  private readonly rng: CosmeticRng;
  private readonly mapper: EventMapper;
  private readonly units = new Map<number, UnitEntry>();
  private readonly turrets = new Map<string, TurretEntry>();
  private leavingTurrets: { view: TurretView; leftMs: number }[] = [];
  private readonly projectiles = new Map<number, ProjectileEntry>();
  private readonly projectilePool = new Map<string, EffectView[]>();
  private readonly bases: [BaseEntry, BaseEntry];
  private readonly backdrop: BackdropView;
  private readonly particles: ParticlePool;
  private readonly numbers: FloatingNumbers;
  private readonly bars = new HealthBars();
  private readonly shadows = new Graphics();
  private readonly zones = new ZoneOverlay();
  private readonly markers: MountMarkers;
  private readonly screenFx: EffectView[] = [];
  private readonly listeners = new Set<ViewEventListener>();
  private readonly ages: AgeId[];
  private readonly baseFlashFilter = new ColorMatrixFilter();
  private readonly onPresetChange: ((p: GraphicsPreset) => void) | undefined;
  private feel: RenderFeelConfig;
  private settings: ViewSettings;
  private readonly isMobile: boolean;
  private autoPreset: AutoPresetMonitor;
  private seam = SEAM_START_LU;
  private speed = 1;
  private paused = false;
  private ended = false;
  private input: BattleInput | null = null;
  private inputEl: HTMLElement | null = null;
  private hudAnchors: { gold: Pt | null; xp: Pt | null } = { gold: null, xp: null };
  private liveIds = new Set<number>();
  private frameGameDt = 0;

  constructor(o: BattleViewOptions) {
    this.sim = o.sim;
    this.config = o.sim.config;
    this.art = o.art;
    this.mySide = o.mySide ?? 0;
    this.feel = o.feel ?? cloneFeelConfig(defaultFeelConfig);
    this.settings = { ...DEFAULT_VIEW_SETTINGS, ...o.settings };
    this.isMobile = o.isMobile ?? false;
    this.onPresetChange = o.onPresetChange;
    this.rng = mulberry32((o.seed ?? this.config.seed) ^ 0x5eed);
    this.ages = ageOrder(this.config);
    this.layers = createLayers();
    this.root = this.layers.root;
    this.camera = new Camera(this.feel.tuning.maxZoom, this.feel.tuning.cameraFollowK);
    this.director = new FeelDirector(this.feel, o.audio, this.config.seed);
    this.layers.flash.addChild(this.director.flash.root);
    this.mapper = new EventMapper({ content: this.config.content, feel: this.feel, mySide: this.mySide, rng: this.rng });
    this.autoPreset = new AutoPresetMonitor(this.settings.graphics, this.isMobile);
    this.particles = new ParticlePool(o.art, this.layers.vfx, 0, this.rng);
    this.numbers = new FloatingNumbers(this.layers.text, this.feel.tuning, this.rng, o.labelFactory);
    this.markers = new MountMarkers(o.labelFactory ?? bitmapLabelFactory);

    const st = this.sim.state;
    this.backdrop = o.art.createBackdrop({ left: this.ageOf(0), right: this.ageOf(1), arena: o.arena ?? 'tar_pits' });
    this.backdrop.setSeam(this.seam);
    this.layers.backdrop.addChild(this.backdrop.root);
    this.layers.ground.addChild(this.shadows);
    this.bases = [this.createBase(0), this.createBase(1)];
    this.layers.bars.addChild(this.bars.root);
    this.layers.telegraphs.addChild(this.zones.root, this.markers.root);
    this.baseFlashFilter.brightness(1.9, false);

    this.applySettings(this.settings);
    this.resize(1280, 720);
    // A view created mid-match (replay seek) picks up what is already on the field.
    for (const u of st.units) this.ensureUnit(u);
    this.syncTurrets(0);
  }

  // ------------------------------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------------------------------

  /** True while a global freeze runs: the session must not add time to its sim accumulator (A12). */
  get simFrozen(): boolean {
    return this.director.frozen && !this.ended;
  }

  /** The preset in use right now (Auto may have dropped to Lite). */
  get preset(): GraphicsPreset {
    return this.autoPreset.preset;
  }

  /** Render resolution for the host: capped at 2, and 1 in Lite (B16). */
  resolution(devicePixelRatio: number): number {
    return presetDpr(this.preset, devicePixelRatio);
  }

  /** Screen size in CSS px. */
  resize(width: number, height: number): void {
    this.camera.resize(width, height);
    this.director.flash.resize(width, height);
    for (const fx of this.screenFx) fx.playAt({ x: width / 2, y: height / 2 }, { w: width, h: height });
  }

  setSpeed(s: number): void {
    this.speed = s > 0 ? s : 1;
  }

  setPaused(p: boolean): void {
    this.paused = p;
  }

  setSettings(s: Partial<ViewSettings>): void {
    const graphicsChanged = s.graphics !== undefined && s.graphics !== this.settings.graphics;
    this.settings = { ...this.settings, ...s };
    if (graphicsChanged) this.autoPreset = new AutoPresetMonitor(this.settings.graphics, this.isMobile);
    this.applySettings(this.settings);
  }

  get currentSettings(): Readonly<ViewSettings> {
    return this.settings;
  }

  /** Live feel tuning (dev feel page). */
  setFeel(feel: RenderFeelConfig): void {
    this.feel = feel;
    this.mapper.feel = feel;
    this.director.setFeel(feel);
    this.numbers.setTuning(feel.tuning);
    this.camera.setTuning(feel.tuning.maxZoom, feel.tuning.cameraFollowK);
    this.applySettings(this.settings);
  }

  /** Subscribes to view events (mount taps, emotes, denied commands, evolves, match end). */
  on(listener: ViewEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Where coins and XP sparkles fly to, in CSS px relative to the canvas (the HUD measures them). */
  setHudAnchors(a: { gold?: Pt | null; xp?: Pt | null }): void {
    if (a.gold !== undefined) this.hudAnchors.gold = a.gold;
    if (a.xp !== undefined) this.hudAnchors.xp = a.xp;
  }

  /** Attaches canvas pointer input (mount taps, pinch zoom, double-tap reset). Returns a detach. */
  attachInput(el: HTMLElement): () => void {
    this.input?.destroy();
    this.inputEl = el;
    this.input = new BattleInput(el, { camera: this.camera, tap: (p, shift) => this.tap(p, shift) });
    return () => {
      this.input?.destroy();
      this.input = null;
      this.inputEl = null;
    };
  }

  /** Handles a tap at a view-local point. Returns true when it hit one of your mounts. */
  tap(screen: Pt, shift: boolean): boolean {
    if (this.ended) return false;
    const pts = this.mountPoints(this.mySide);
    const at = this.camera.screenToWorld(screen.x, screen.y);
    const radius = Math.max(MOUNT_TAP_LU, MOUNT_TAP_PX / this.camera.scale);
    const idx = hitTestMount(pts, at, radius);
    if (idx === null) return false;
    const kind = mountTapKind(idx, this.sim.state.sides[this.mySide].mountsOwned);
    if (!kind) return false;
    this.emit({ t: 'mountTap', mount: idx, kind, screen: { ...screen }, shift });
    return true;
  }

  /** The screen point (view-local CSS px) of one of your mounts, for placing the HUD popover. */
  mountScreenPoint(mount: number): Pt | null {
    const p = this.mountPoints(this.mySide)[mount];
    return p ? this.camera.worldToScreen(p.x, p.y) : null;
  }

  /** The power in your current loadout, if any. */
  private myPower(): PowerDef | undefined {
    const age = this.ageOf(this.mySide);
    const id = this.config.sides[this.mySide].loadouts[age]?.power;
    return id ? this.config.content.powers[id] : undefined;
  }

  /** True when your current power can be placed by dragging (others only auto-aim). */
  powerAimable(): boolean {
    return powerZoneLu(this.myPower()) !== null;
  }

  /**
   * Converts a client point to own-side progress p (lu) clamped to the power band, or null when the
   * point is not over the lane band. Use for power drag targeting.
   */
  laneP(clientX: number, clientY: number): number | null {
    const r = this.inputEl?.getBoundingClientRect();
    const sx = clientX - (r?.left ?? 0);
    const sy = clientY - (r?.top ?? 0);
    const L = this.camera.layout;
    if (sy < L.bandY - L.bandH * 0.05 || sy > L.bandY + L.bandH * 1.02 || sx < 0 || sx > L.width) return null;
    const w = this.camera.screenToWorld(sx, sy);
    return clampPowerP(xToP(w.x, this.mySide), this.config.content.economy.powerZoneClamp);
  }

  /** Shows the power zone at own-side progress `p` (lu), or hides it with null. */
  previewPower(p: number | null): void {
    const width = powerZoneLu(this.myPower());
    if (p === null || width === null) {
      this.zones.hidePreview();
      return;
    }
    this.zones.showPreview(pToX(p, this.mySide), width, teamColor(this.settings.teamPreset, this.mySide));
  }

  /** Call after every `sim.step` with that tick's events. */
  onEvents(events: readonly SimEvent[]): void {
    if (events.length === 0) return;
    const actions = this.mapper.map(events, (id) => this.lookup(id));
    for (const a of actions) this.exec(a);
  }

  /** Draws one frame. `alpha` = acc / 50 from the session, `frameMs` the real frame time. */
  render(alpha: number, frameMs: number): void {
    const realDt = Math.max(0, Math.min(frameMs, 250));
    if (this.autoPreset.frame(frameMs)) {
      this.applySettings(this.settings);
      this.onPresetChange?.(this.autoPreset.preset);
    }
    const frozen = this.director.frozen;
    const gameDt = this.paused || frozen ? 0 : realDt * this.speed * this.director.slowMo.timeScale;
    this.frameGameDt = gameDt;
    this.director.update(this.paused ? 0 : realDt, gameDt);

    this.syncUnits(alpha, gameDt);
    this.syncTurrets(gameDt);
    this.syncBases(gameDt);
    this.updateProjectiles(gameDt);
    this.particles.update(gameDt);
    for (const fx of this.screenFx) {
      fx.update(gameDt);
      if (fx.done) fx.playAt({ x: this.camera.layout.width / 2, y: this.camera.layout.height / 2 }, { w: this.camera.layout.width, h: this.camera.layout.height });
    }

    const mid = frontMidpoint(this.frontInputs());
    this.seam = stepSeam(this.seam, mid, gameDt, this.feel.tuning.seamMaxLuPerSec);
    this.backdrop.setSeam(this.seam);
    this.backdrop.update(gameDt);

    this.camera.follow(mid);
    this.camera.update(realDt);
    const t = this.camera.transform();
    this.layers.world.position.set(t.x, t.y);
    this.layers.world.scale.set(t.scale);

    this.zones.update(gameDt, t.scale);
    this.updateMarkers(realDt, t.scale);
    this.numbers.update(this.paused ? 0 : realDt, t.scale);
    this.drawBars(t.scale);
    this.drawShadows();

    const L = this.camera.layout;
    const s = this.director.shake.offset();
    this.layers.shaker.pivot.set(L.width / 2, L.height / 2);
    this.layers.shaker.position.set(L.width / 2 + s.x, L.height / 2 + s.y);
    this.layers.shaker.rotation = s.rot;
  }

  /** Counters for the dev pages. */
  stats(): { units: number; projectiles: number; particles: number; particleCap: number; dropped: number; numbers: number; trauma: number; freezeUsedMs: number; preset: GraphicsPreset; seam: number; zoom: number } {
    return {
      units: this.units.size,
      projectiles: this.projectiles.size,
      particles: this.particles.liveCount,
      particleCap: this.particles.cap,
      dropped: this.particles.dropped,
      numbers: this.numbers.liveCount,
      trauma: this.director.shake.trauma,
      freezeUsedMs: this.director.freeze.usedMs(this.director.nowMs),
      preset: this.preset,
      seam: this.seam,
      zoom: this.camera.zoom,
    };
  }

  destroy(): void {
    this.input?.destroy();
    this.input = null;
    for (const e of this.units.values()) this.destroyUnit(e);
    this.units.clear();
    for (const e of this.turrets.values()) e.view.destroy();
    this.turrets.clear();
    for (const l of this.leavingTurrets) l.view.destroy();
    this.leavingTurrets = [];
    for (const p of this.projectiles.values()) p.view.destroy();
    this.projectiles.clear();
    for (const list of this.projectilePool.values()) for (const v of list) v.destroy();
    this.projectilePool.clear();
    for (const fx of this.screenFx) fx.destroy();
    this.particles.destroy();
    this.numbers.destroy();
    for (const b of this.bases) b.view.destroy();
    this.backdrop.destroy();
    this.director.destroy();
    this.listeners.clear();
    this.root.destroy({ children: true });
  }

  // ------------------------------------------------------------------------------------------
  // Settings and presets
  // ------------------------------------------------------------------------------------------

  private applySettings(s: ViewSettings): void {
    this.director.applySettings({ hitstop: s.hitstop, reduceMotion: s.reduceMotion, shake: s.shake });
    this.numbers.mode = s.damageNumbers;
    const preset = this.autoPreset.preset;
    this.particles.cap = particleCap(preset, this.isMobile, this.feel.particleCaps);
    this.shadows.visible = PRESETS[preset].shadows;
    if (!PRESETS[preset].legendaryAuras) {
      for (const e of this.units.values()) this.dropAura(e);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Lookups
  // ------------------------------------------------------------------------------------------

  private ageOf(side: Side): AgeId {
    return this.ages[this.sim.state.sides[side].ageIndex] ?? this.ages[0] ?? 'stone';
  }

  private lookup(id: number): UnitInfo | undefined {
    const e = this.units.get(id);
    if (e) return { side: e.side, card: e.card, x: e.x };
    const u = this.sim.state.units.find((v) => v.id === id);
    return u ? { side: u.side, card: u.card, x: u.x / MILLI_LU } : undefined;
  }

  private mountPoints(side: Side): Pt[] {
    const b = this.bases[side];
    return mountWorldPoints(b.mountsLocal, b.view.root.x, b.view.root.y, b.view.root.scale.x);
  }

  private anchor(a: Anchor): Pt {
    switch (a.k) {
      case 'world':
        return { x: a.x, y: a.y };
      case 'unit': {
        const e = this.units.get(a.id);
        if (!e) {
          const u = this.sim.state.units.find((v) => v.id === a.id);
          return { x: u ? u.x / MILLI_LU : SEAM_START_LU, y: -30 };
        }
        const an = e.view.anchors;
        const f = facingOf(e.side);
        if (a.part === 'feet') return { x: e.x, y: e.y };
        if (a.part === 'head') return { x: e.x + an.head.x * f, y: e.y + an.head.y - 6 };
        return { x: e.x + an.hitCenter.x * f, y: e.y + an.hitCenter.y };
      }
      case 'base': {
        const cx = baseCenterX(a.side);
        const top = Math.min(-90, ...this.bases[a.side].mountsLocal.map((p) => p.y)) - 24;
        if (a.part === 'front') return { x: gateX(a.side) + (a.side === 0 ? -10 : 10), y: -44 };
        if (a.part === 'top') return { x: cx, y: top };
        return { x: cx, y: top * 0.45 };
      }
      case 'mount': {
        const p = this.mountPoints(a.side)[a.mount];
        return p ?? { x: baseCenterX(a.side), y: -80 };
      }
    }
  }

  private emit(ev: ViewEvent): void {
    for (const l of this.listeners) l(ev);
  }

  // ------------------------------------------------------------------------------------------
  // Action execution
  // ------------------------------------------------------------------------------------------

  private exec(a: ViewAction): void {
    switch (a.a) {
      case 'unitSpawn': {
        if (this.units.has(a.id)) return;
        this.createUnit(a.id, a.side, a.card, a.level, a.x);
        return;
      }
      case 'unitClip': {
        const e = this.units.get(a.id);
        if (!e || e.dying) return;
        if (a.clip === 'hit' && e.oneShotLeftMs > 0) return; // never cut an attack or spawn short
        if (a.clip === 'attack') {
          e.view.play('attack', a.impactAtMs !== undefined ? { impactAtMs: a.impactAtMs } : undefined);
          e.oneShotLeftMs = (a.impactAtMs ?? 0) + ONE_SHOT_MS.attackRecover;
        } else {
          e.view.play(a.clip);
          e.oneShotLeftMs = a.clip === 'spawn' ? ONE_SHOT_MS.spawn : a.clip === 'hit' ? ONE_SHOT_MS.hit : a.clip === 'stun' ? ONE_SHOT_MS.stun : ONE_SHOT_MS.ability;
        }
        e.loopClip = null;
        return;
      }
      case 'unitDie': {
        const e = this.units.get(a.id);
        if (!e || e.dying) return;
        e.dying = true;
        e.dieLeftMs = this.feel.tuning.deathLingerMs;
        e.view.play('die');
        e.loopClip = null;
        e.bar.shown = false;
        this.dropAura(e);
        return;
      }
      case 'unitFlash':
        this.units.get(a.id)?.view.flash(a.ms, a.color);
        return;
      case 'unitFreeze': {
        const e = this.units.get(a.id);
        const ms = this.director.hitstopMs(a.ms);
        if (!e || ms <= 0) return;
        e.view.freeze(ms);
        if (a.jitterPx) {
          e.jitterLeftMs = ms;
          e.jitterPx = a.jitterPx;
        }
        return;
      }
      case 'cheer':
        for (const e of this.units.values()) {
          if (e.side !== a.side || e.dying) continue;
          e.view.play('victory');
          e.oneShotLeftMs = this.feel.tuning.cheerMs;
          e.loopClip = null;
        }
        return;
      case 'projectile':
        this.fireProjectile(a);
        return;
      case 'fx':
        this.particles.emit(a.effectId, a.count, a.priority, this.anchor(a.at), {
          ...(a.spreadLu !== undefined ? { spreadLu: a.spreadLu } : {}),
          ...(a.opts ? { opts: a.opts } : {}),
        });
        return;
      case 'fxFly': {
        const from = this.anchor(a.from);
        const target = this.hudTarget(a.to);
        const to = this.camera.screenToWorld(target.x, target.y);
        const t = this.feel.tuning;
        const travel = a.to === 'gold' ? t.coinTravelMs : t.xpTravelMs;
        for (let i = 0; i < a.count; i++) {
          const jitter = { x: from.x + (this.rng.next() - 0.5) * 16, y: from.y + (this.rng.next() - 0.5) * 10 };
          this.particles.fly(a.effectId, jitter, to, travel + i * t.coinStaggerMs, true, a.priority);
        }
        return;
      }
      case 'sound':
        this.director.sound(a.id, {
          ...(a.delayMs !== undefined ? { delayMs: a.delayMs } : {}),
          ...(a.gap ? { gap: a.gap } : {}),
          ...(a.climb ? { climb: a.climb } : {}),
          ...(a.priority !== undefined ? { priority: a.priority } : {}),
        });
        return;
      case 'trauma':
        this.director.addTrauma(a.amount, a.dir, a.gap);
        return;
      case 'screenFlash':
        this.director.screenFlash(a.ms, a.color, a.alpha);
        return;
      case 'baseFlash': {
        const b = this.bases[a.side];
        b.flashLeftMs = Math.max(b.flashLeftMs, a.ms * (this.settings.reduceMotion ? 0.5 : 1));
        return;
      }
      case 'freeze':
        this.director.requestFreeze(a.ms, a.exempt);
        return;
      case 'slowMo':
        this.director.startSlowMo(a.scale, a.ms);
        return;
      case 'duck':
        this.director.duck(a.db, a.ms);
        return;
      case 'musicCue':
        this.director.musicCue(a.cue, a.fadeMs);
        return;
      case 'musicTranspose':
        this.director.transpose(a.semitones);
        return;
      case 'musicLayer':
        this.director.musicLayer(a.layer, a.v);
        return;
      case 'intensity':
        this.director.addIntensity(a.amount);
        return;
      case 'number':
        this.numbers.show(a.kind, a.value, this.anchor(a.at), {
          important: a.important,
          ...(a.key !== undefined ? { key: a.key } : {}),
          scale: this.camera.scale,
        });
        return;
      case 'turret':
        this.turretAction(a);
        return;
      case 'base': {
        const b = this.bases[a.side];
        if (a.op === 'hit') b.view.hit();
        else b.view.collapse();
        return;
      }
      case 'baseTreasury': {
        const b = this.bases[a.side];
        b.treasury = a.level;
        b.view.setTreasury(a.level);
        return;
      }
      case 'baseGlow': {
        const b = this.bases[a.side];
        b.glow = a.on;
        b.view.lastStandGlow(a.on);
        return;
      }
      case 'baseMorph': {
        const b = this.bases[a.side];
        b.age = a.age;
        b.view.morphTo(a.age, a.ms);
        b.mountsLocal = b.view.mountPoints();
        return;
      }
      case 'backdropWipe':
        this.backdrop.wipe(a.side, a.age, a.ms);
        return;
      case 'telegraph':
        this.zones.telegraph(a.x, a.zone, teamColor(this.settings.teamPreset, a.side), a.ms);
        this.particles.emit('fx.telegraph_zone', 1, 3, { x: a.x, y: 0 }, { opts: { width: a.zone, side: a.side, ms: a.ms } });
        return;
      case 'powerFx': {
        const def = this.config.content.powers[a.power];
        this.particles.emit(def?.visualId ?? `power.${a.power}`, 1, 5, { x: a.x, y: 0 }, { opts: { index: a.index, side: a.side, castId: a.castId } });
        return;
      }
      case 'phase':
        if (a.phase === 'overdrive') this.addScreenFx('fx.overdrive_frame');
        if (a.phase === 'siege') this.addScreenFx('fx.siege_vignette');
        return;
      case 'view':
        if (a.ev.t === 'emote' && a.ev.side !== this.mySide && this.settings.mutedEmotes) return;
        if (a.ev.t === 'matchEnded') this.ended = true;
        this.emit(a.ev);
        return;
    }
  }

  private hudTarget(to: 'gold' | 'xp'): Pt {
    const L = this.camera.layout;
    const set = to === 'gold' ? this.hudAnchors.gold : this.hudAnchors.xp;
    if (set) return set;
    return to === 'gold' ? { x: L.width * 0.07, y: L.trayY + L.trayH * 0.5 } : { x: L.width * 0.2, y: L.topBarH * 0.72 };
  }

  private addScreenFx(effectId: string): void {
    const L = this.camera.layout;
    const fx = this.art.createEffect(effectId, { w: L.width, h: L.height });
    fx.playAt({ x: L.width / 2, y: L.height / 2 }, { w: L.width, h: L.height });
    this.layers.screenFx.addChild(fx.root);
    this.screenFx.push(fx);
  }

  // ------------------------------------------------------------------------------------------
  // Units
  // ------------------------------------------------------------------------------------------

  private ensureUnit(u: Readonly<UnitState>): UnitEntry {
    return this.units.get(u.id) ?? this.createUnit(u.id, u.side, u.card, u.level, u.x / MILLI_LU);
  }

  private createUnit(id: number, side: Side, card: CardId, level: number, x: number): UnitEntry {
    const def = this.config.content.units[card];
    const skin = this.config.sides[side].skins[card];
    const view = this.art.createUnit({
      visualId: def?.visualId ?? `unit.${card}`,
      ...(skin ? { skin } : {}),
      side,
      teamPreset: this.settings.teamPreset,
    });
    const air = def?.tags.includes(AIR_TAGS) ?? false;
    const sizeLu = def ? this.config.content.economy.sizes[def.size] : 24;
    const e: UnitEntry = {
      id,
      side,
      card,
      def,
      view,
      air,
      sizeLu,
      level,
      x,
      y: 0,
      bar: newBar(),
      shieldBp: 0,
      stunned: false,
      frozen: false,
      moving: false,
      dying: false,
      dieLeftMs: 0,
      jitterLeftMs: 0,
      jitterPx: 0,
      loopClip: null,
      oneShotLeftMs: 0,
      aura: null,
      pose: {
        x,
        y: 0,
        facing: facingOf(side),
        hpBp: 10000,
        shieldBp: 0,
        stunned: false,
        frozen: false,
        alpha: 1,
        levelTrim: levelTrim(level),
        roleGlyph: def?.group ?? 'infantry',
      },
    };
    const rows = depthRows([...this.units.values(), e].filter((v) => !v.dying).map((v) => ({ id: v.id, side: v.side, x: v.x, air: v.air })));
    e.y = rows.get(id) ?? 0;
    this.layers.units.addChild(view.root);
    if ((def?.group === 'legendary' || (skin && this.config.content.skins[skin]?.rarity === 'legendary')) && PRESETS[this.preset].legendaryAuras) {
      const aura = this.art.createEffect('fx.legendary_aura', { heightLu: 200, side });
      aura.playAt({ x, y: e.y });
      this.layers.units.addChild(aura.root);
      e.aura = aura;
    }
    this.units.set(id, e);
    this.writePose(e);
    return e;
  }

  private dropAura(e: UnitEntry): void {
    if (!e.aura) return;
    e.aura.destroy();
    e.aura = null;
  }

  private destroyUnit(e: UnitEntry): void {
    this.dropAura(e);
    e.view.destroy();
  }

  private syncUnits(alpha: number, gameDt: number): void {
    const st = this.sim.state;
    this.liveIds.clear();
    for (const u of st.units) {
      this.liveIds.add(u.id);
      const e = this.ensureUnit(u);
      if (e.dying) continue;
      e.x = (u.prevX + (u.x - u.prevX) * Math.min(1, Math.max(0, alpha))) / MILLI_LU;
      e.moving = u.x !== u.prevX && u.mode !== 'attack';
      e.stunned = false;
      e.frozen = false;
      for (const s of u.statuses) {
        if (s.kind === 'stun') {
          e.stunned = true;
          if (s.frozen) e.frozen = true;
        }
      }
      const hpBp = u.maxHp > 0 ? Math.floor((u.hp * 10000) / u.maxHp) : 0;
      e.shieldBp = u.maxHp > 0 ? Math.floor(((u.shield + u.innateShield) * 10000) / u.maxHp) : 0;
      stepBar(e.bar, hpBp, e.shieldBp, gameDt, this.feel.tuning.ghostHoldMs, this.feel.tuning.ghostDrainMs);
    }
    const rows = depthRows(
      [...this.units.values()].filter((e) => !e.dying && this.liveIds.has(e.id)).map((e) => ({ id: e.id, side: e.side, x: e.x, air: e.air })),
    );
    const rowStep = (this.feel.tuning.rowEaseLuPerSec * gameDt) / 1000;
    for (const e of [...this.units.values()]) {
      if (!e.dying && !this.liveIds.has(e.id)) {
        // Removed without a death event (for example a replay seek): drop it quietly.
        this.destroyUnit(e);
        this.units.delete(e.id);
        continue;
      }
      if (e.dying) {
        e.dieLeftMs -= gameDt;
        if (e.dieLeftMs <= 0) {
          this.destroyUnit(e);
          this.units.delete(e.id);
          continue;
        }
      } else {
        const target = rows.get(e.id);
        if (target !== undefined) e.y = easeToward(e.y, target, rowStep);
        this.updateLoopClip(e, gameDt);
      }
      if (e.jitterLeftMs > 0) e.jitterLeftMs -= gameDt;
      this.writePose(e);
      e.view.update(gameDt);
      if (e.aura) {
        e.aura.root.position.set(e.x, e.y);
        e.aura.root.zIndex = e.view.root.zIndex - 1;
        e.aura.update(gameDt);
        if (e.aura.done) e.aura.playAt({ x: e.x, y: e.y });
      }
    }
  }

  private updateLoopClip(e: UnitEntry, gameDt: number): void {
    if (e.oneShotLeftMs > 0) {
      e.oneShotLeftMs -= gameDt;
      if (e.oneShotLeftMs > 0) return;
    }
    const want: LoopClip | null = e.stunned ? null : e.moving ? 'walk' : 'idle';
    if (want === null) {
      if (e.loopClip !== null) {
        e.view.play('stun', { loop: true });
        e.loopClip = null;
      }
      return;
    }
    if (want !== e.loopClip) {
      const speed = e.def?.speed ?? 70;
      e.view.play(want, want === 'walk' ? { loop: true, durationMs: Math.round((500 * 80) / Math.max(20, speed)) } : { loop: true });
      e.loopClip = want;
    }
  }

  private writePose(e: UnitEntry): void {
    const p = e.pose;
    const jitter = e.jitterLeftMs > 0 ? ((this.rng.next() * 2 - 1) * e.jitterPx) / Math.max(0.0001, this.camera.scale) : 0;
    p.x = e.x + jitter;
    p.y = e.y;
    p.hpBp = e.bar.hpBp;
    p.shieldBp = e.shieldBp;
    p.stunned = e.stunned;
    p.frozen = e.frozen;
    p.alpha = e.dying ? Math.min(1, e.dieLeftMs / 300) : 1;
    e.view.setPose(p);
    e.view.root.zIndex = depthZ(e.y, e.air, e.id);
  }

  private frontInputs(): { side: Side; x: number; air: boolean }[] {
    const out: { side: Side; x: number; air: boolean }[] = [];
    for (const e of this.units.values()) if (!e.dying) out.push({ side: e.side, x: e.x, air: e.air });
    return out;
  }

  private drawBars(scale: number): void {
    const draws: BarDraw[] = [];
    for (const e of this.units.values()) {
      if (e.dying || !e.bar.shown) continue;
      draws.push({
        x: e.x,
        y: e.y + e.view.anchors.head.y - 12,
        widthLu: barWidthLu(e.sizeLu),
        bar: e.bar,
        color: teamColor(this.settings.teamPreset, e.side),
        alpha: 1,
      });
    }
    this.bars.draw(draws, scale);
  }

  private drawShadows(): void {
    const g = this.shadows;
    g.clear();
    if (!g.visible) return;
    for (const e of this.units.values()) {
      const a = e.dying ? 0.2 * Math.min(1, e.dieLeftMs / 300) : 0.24;
      const w = e.sizeLu * 0.62 + 6;
      if (e.air) g.ellipse(e.x, 4, w * 0.7, 4).fill({ color: 0x000000, alpha: a * 0.5 });
      else g.ellipse(e.x, e.y + 1, w, 5.5).fill({ color: 0x000000, alpha: a });
    }
  }

  // ------------------------------------------------------------------------------------------
  // Projectiles
  // ------------------------------------------------------------------------------------------

  private fireProjectile(a: Extract<ViewAction, { a: 'projectile' }>): void {
    const from = this.projectileOrigin(a.from, a.side);
    let toY = -30;
    if (a.targetId > 0) {
      const t = this.units.get(a.targetId);
      if (t) toY = t.y + t.view.anchors.hitCenter.y;
    } else if (a.targetId === -1 && a.side !== null) {
      toY = -44;
    }
    const to = { x: a.toX, y: toY };
    if (a.visualId.startsWith('fx.')) {
      this.particles.emit(a.visualId, 1, 2, from, { opts: { toX: to.x, toY: to.y, ms: a.travelMs, side: a.side ?? 0 } });
      return;
    }
    if (!a.visualId) return;
    const side = a.side ?? 0;
    const key = `${a.visualId}|${side}`;
    const view = this.projectilePool.get(key)?.pop() ?? this.art.createProjectile(a.visualId, side);
    view.fly(from, to, a.travelMs, a.arc);
    this.layers.projectiles.addChild(view.root);
    const old = this.projectiles.get(a.pid);
    if (old) this.releaseProjectile(old);
    this.projectiles.set(a.pid, { key, view });
  }

  private projectileOrigin(from: number, side: Side | null): Pt {
    if (from > 0) {
      const e = this.units.get(from);
      if (e) {
        const an = e.view.anchors;
        return { x: e.x + an.muzzle.x * facingOf(e.side), y: e.y + an.muzzle.y };
      }
    }
    const turret = decodeTurretSource(from);
    if (turret) {
      const p = this.mountPoints(turret.side)[turret.mount];
      if (p) return { x: p.x + facingOf(turret.side) * 10, y: p.y - 6 };
    }
    return { x: side === null ? SEAM_START_LU : gateX(side), y: -40 };
  }

  private updateProjectiles(gameDt: number): void {
    for (const [pid, p] of this.projectiles) {
      p.view.update(gameDt);
      if (p.view.done) {
        this.releaseProjectile(p);
        this.projectiles.delete(pid);
      }
    }
  }

  private releaseProjectile(p: ProjectileEntry): void {
    p.view.root.parent?.removeChild(p.view.root);
    let list = this.projectilePool.get(p.key);
    if (!list) this.projectilePool.set(p.key, (list = []));
    if (list.length < 48) list.push(p.view);
    else p.view.destroy();
  }

  // ------------------------------------------------------------------------------------------
  // Turrets and bases
  // ------------------------------------------------------------------------------------------

  private createBase(side: Side): BaseEntry {
    const age = this.ageOf(side);
    const skin = this.config.sides[side].skins[`base.${age}`];
    const view = this.art.createBase({ age, ...(skin ? { skin } : {}), side, teamPreset: this.settings.teamPreset });
    view.root.position.set(baseCenterX(side), 0);
    view.root.scale.x = side === 1 ? -1 : 1;
    this.layers.structures.addChild(view.root);
    const s = this.sim.state.sides[side];
    const crumble = crumbleStage(s.baseHp, s.baseMaxHp);
    if (crumble > 0) view.setCrumble(crumble);
    if (s.treasury > 0) view.setTreasury(s.treasury);
    const glow = s.lastStand === 'armed' || s.lastStand === 'charging';
    if (glow) view.lastStandGlow(true);
    return { side, view, age, crumble, treasury: s.treasury, glow, flashLeftMs: 0, mountsLocal: view.mountPoints() };
  }

  private syncBases(gameDt: number): void {
    for (const b of this.bases) {
      const s = this.sim.state.sides[b.side];
      const crumble = crumbleStage(s.baseHp, s.baseMaxHp);
      if (crumble !== b.crumble) {
        b.crumble = crumble;
        b.view.setCrumble(crumble);
      }
      if (s.treasury !== b.treasury) {
        b.treasury = s.treasury;
        b.view.setTreasury(s.treasury);
      }
      const glow = s.lastStand === 'armed' || s.lastStand === 'charging';
      if (glow !== b.glow) {
        b.glow = glow;
        b.view.lastStandGlow(glow);
      }
      if (b.flashLeftMs > 0) {
        b.flashLeftMs -= this.paused ? 0 : Math.max(gameDt, 16);
        b.view.root.filters = b.flashLeftMs > 0 ? [this.baseFlashFilter] : [];
      }
      b.view.update(gameDt);
    }
  }

  private turretAction(a: Extract<ViewAction, { a: 'turret' }>): void {
    const key = `${a.side}:${a.mount}`;
    switch (a.op) {
      case 'buildStart': {
        const e = this.turretEntry(a.side, a.mount, a.card);
        e.view.play('build');
        return;
      }
      case 'built': {
        const prev = this.turrets.get(key);
        const e = this.turretEntry(a.side, a.mount, a.card);
        if (prev !== e) e.view.play('build');
        else e.view.play('idle');
        return;
      }
      case 'sell': {
        const e = this.turrets.get(key);
        if (!e || e.selling) return;
        e.selling = true;
        e.view.play('sell');
        return;
      }
      case 'replace': {
        const prev = this.turrets.get(key);
        if (prev && prev.card !== a.card) {
          prev.view.play('modernise');
          this.leavingTurrets.push({ view: prev.view, leftMs: 600 });
          this.turrets.delete(key);
        }
        const e = this.turretEntry(a.side, a.mount, a.card);
        e.view.play('build');
        return;
      }
      case 'fire': {
        const e = this.turrets.get(key);
        if (!e) return;
        const t = a.targetId !== undefined ? this.units.get(a.targetId) : undefined;
        if (t) e.view.aimAt(t.x);
        e.view.play('fire');
        return;
      }
    }
  }

  private turretEntry(side: Side, mount: number, card: CardId): TurretEntry {
    const key = `${side}:${mount}`;
    const cur = this.turrets.get(key);
    if (cur && cur.card === card) return cur;
    if (cur) {
      cur.view.destroy();
      this.turrets.delete(key);
    }
    const def = this.config.content.turrets[card];
    const skin = this.config.sides[side].skins[card];
    const view = this.art.createTurret({ visualId: def?.visualId ?? `turret.${card}`, ...(skin ? { skin } : {}), side, teamPreset: this.settings.teamPreset });
    const p = this.mountPoints(side)[mount] ?? { x: baseCenterX(side), y: -80 };
    view.root.position.set(p.x, p.y);
    view.root.scale.x = side === 1 ? -1 : 1;
    this.layers.structures.addChild(view.root);
    const e: TurretEntry = { side, mount, card, view, selling: false, outdated: false };
    this.turrets.set(key, e);
    this.mapper.setTurretCard(side, mount, card);
    return e;
  }

  private syncTurrets(gameDt: number): void {
    const st = this.sim.state;
    for (const side of [0, 1] as const) {
      const s = st.sides[side];
      const pts = this.mountPoints(side);
      for (let m = 0; m < 4; m++) {
        const t = s.turrets[m] ?? null;
        const key = `${side}:${m}`;
        let e = this.turrets.get(key);
        if (t) {
          if (!e || e.card !== t.card) e = this.turretEntry(side, m, t.card);
          const outdated = side === this.mySide && (this.config.content.ages[t.age]?.index ?? 0) < s.ageIndex;
          if (outdated !== e.outdated) {
            e.outdated = outdated;
            e.view.setOutdated(outdated);
          }
          if (t.state === 'selling' && !e.selling) {
            e.selling = true;
            e.view.play('sell');
          }
          const p = pts[m];
          if (p) e.view.root.position.set(p.x, p.y);
        } else if (e) {
          e.view.destroy();
          this.turrets.delete(key);
          this.mapper.setTurretCard(side, m, null);
          e = undefined;
        }
        e?.view.update(gameDt);
      }
    }
    if (this.leavingTurrets.length > 0) {
      for (const l of this.leavingTurrets) {
        l.leftMs -= gameDt;
        l.view.update(gameDt);
        if (l.leftMs <= 0) l.view.destroy();
      }
      this.leavingTurrets = this.leavingTurrets.filter((l) => l.leftMs > 0);
    }
  }

  private updateMarkers(realDt: number, scale: number): void {
    const s = this.sim.state.sides[this.mySide];
    if (this.ended) {
      this.markers.update(realDt, scale, null);
      return;
    }
    this.markers.update(realDt, scale, {
      points: this.mountPoints(this.mySide),
      mountsOwned: s.mountsOwned,
      occupied: [0, 1, 2, 3].map((m) => (s.turrets[m] ?? null) !== null),
      nextCost: s.mountsOwned < 4 ? (this.config.content.economy.mountCosts[s.mountsOwned] ?? null) : null,
      color: teamColor(this.settings.teamPreset, this.mySide),
    });
  }

  /** Game-time delta of the last frame (tests). */
  get lastGameDt(): number {
    return this.frameGameDt;
  }
}
