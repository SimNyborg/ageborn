/**
 * The battle view (DESIGN B6, A2.1, A11, A12): renders a running sim with an injected `ArtProvider`
 * and `AudioService`.
 *
 * - Layers, interpolation between ticks, the scrolling camera (A17.4: drag, swipe, wheel, keys, edge
 *   scroll, auto-follow of the fronts with priority moments) and depth rows.
 * - The minimap and off-screen badge snapshot for the HUD (A17.5), culling outside the view and the
 *   backdrop's parallax (A17.7).
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
  BaseDressingView,
  BaseView,
  CardId,
  EffectView,
  MatchConfig,
  PowerDef,
  PowerReach,
  PowerSlot,
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
import { reachAreaMax, type PowerReachRules } from '@/core/powerReach';
import { ColorMatrixFilter, Graphics, type Container } from 'pixi.js';
import { CAMERA, Camera, type CameraHold } from './camera';
import { depthRows, depthZ, easeToward } from './depth';
import { EventMapper, crumbleStage, decodeTurretSource, type UnitInfo } from './eventMapper';
import { FeelDirector } from './feel/director';
import { FloatingNumbers, type LabelFactory } from './feel/numbers';
import { ParticlePool, type ParticleHandle } from './feel/particlePool';
import { cloneFeelConfig, defaultFeelConfig, type RenderFeelConfig } from './feelConfig';
import { HealthBars, barWidthLu, newBar, stepBar, type BarDraw, type BarState } from './healthbars';
import { HOLD_FLAG_FOOT_Y, HOLD_FLAG_TOP_Y, HoldFlagMarker } from './holdFlag';
import { ageOrder, canEvolve } from './hudModel';
import { BattleInput, edgeSpeed } from './input';
import { createLayers, type BattleLayers } from './layers';
import { LANE_LU, MILLI_LU, WORLD_LEFT_LU, WORLD_RIGHT_LU, baseCenterX, facingOf, gateX, pToX, xToP } from './layout';
import { MOUNT_TAP_LU, MOUNT_TAP_PX, MountMarkers, hitTestMount, mountTapKind, textLabelFactory } from './mounts';
import { previewBand, previewFront, previewTargets, powerTakesAim, powerZoneWidth, reachRulesLu, resolveAim, type PreviewTargets, type PreviewUnit } from './powerPreview';
import { ZoneOverlay, clampPowerP, ghostStyle, powerZoneLu, type GhostTarget } from './powerTargeting';
import { AutoPresetMonitor, PRESETS, particleCap, presetDpr, type GraphicsPreset } from './presets';
import { SEAM_START_LU, cameraFronts, followFocus, frontLines, frontMidpoint, framingCenter, spectatorFocus, stepSeam } from './seam';
import { teamColor } from './teamColors';
import {
  DEFAULT_VIEW_SETTINGS,
  type Anchor,
  type CameraCommand,
  type EdgeBadge,
  type MinimapSnapshot,
  type MinimapUnit,
  type MinimapZone,
  type PowerPreviewOpts as HudPowerPreviewOpts,
  type ViewAction,
  type ViewEvent,
  type ViewEventListener,
  type ViewSettings,
} from './types';

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
  /** The next-mount tag ("New slot · 150"); render has no i18n, so the app passes the text. */
  mountLabel?: (cost: number) => string;
  /** Replays: auto-follow the midpoint of both fronts with no bias toward `mySide` (A17.4). */
  spectator?: boolean;
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
  /** Base flag, national flag, decorations and skin (A18.9.4), when the side has a look. */
  dressing?: BaseDressingView;
}

interface ProjectileEntry {
  key: string;
  view: EffectView;
}

/** A particle that moves with a unit (status effects, buffs) and ends when the unit dies. */
interface Follower {
  h: ParticleHandle;
  id: number;
  part: 'feet' | 'hit' | 'head';
  dx: number;
  dy: number;
}

/** One-shot clip lengths used to know when to go back to walk/idle (ms of game time). */
const ONE_SHOT_MS = { spawn: 260, hit: 160, ability: 650, stun: 900, victory: 900, attackRecover: 220 } as const;
const AIR_TAGS = 'air';
/** Health bars in a crowd: above this many units only the front ones and recently hit ones show. */
const BAR_CROWD_UNITS = 10;
const BAR_FRONT_UNITS = 3;
/** Display objects further than this outside the view are not drawn (A17.7 culling). */
const CULL_LU = 150;
/** At most this many minimap dots (the B16 on-screen cap). */
const MINIMAP_MAX_UNITS = 80;
/** Turret cover on the minimap: the turret range cap (A17.3). */
const TURRET_COVER_LU = 480;
/** Priority moments (A17.4): your power zone at most 3.5 s; your Last Stand pans to your gate 1.5 s. */
const POWER_MOMENT_MAX_MS = 3500;
/** Tap-to-aim brings the ghost's centre at least this far inside the view (lu). */
const AIM_REVEAL_MARGIN_LU = 120;
const LAST_STAND_MOMENT_MS = 1500;
/** Off-screen badges (A17.5). */
const BADGE_BASE_HIT_MS = 2000;
const BADGE_BASE_LINGER_MS = 3000;
const BADGE_LEGENDARY_MS = 4000;
const ALERT_BASE_GAP_MS = 10_000;
const BADGES_PER_EDGE = 3;

/** A power zone the view tracks for the camera, the minimap and the badges (game ms). */
interface ZoneTrack {
  id: string;
  side: Side;
  x: number;
  width: number;
  telegraphMs: number;
  totalMs: number;
  ageMs: number;
  power: CardId;
}

/** Legendary aura radius (lu): about half the figure's height, from its head anchor. */
function auraRadius(view: UnitView): number {
  const h = Math.abs(view.anchors.head.y - view.anchors.feet.y);
  return Math.max(24, Math.round(h * 0.55));
}

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
  /** Spectator follow (replays, A17.4): the midpoint of both fronts, unframed. */
  private readonly spectator: boolean;
  private readonly sim: BattleViewOptions['sim'];
  private readonly config: Readonly<MatchConfig>;
  private readonly art: ArtProvider;
  /** The HUD's per-match opponent mute (A18.9.4). */
  private matchMute = false;
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
  /** Your Hold flag on the lane (A18.4.2) and the p a flag drag previews (null when not dragging). */
  private readonly holdFlag = new HoldFlagMarker();
  private flagGhostP: number | null = null;
  private readonly screenFx: EffectView[] = [];
  private readonly listeners = new Set<ViewEventListener>();
  private readonly ages: AgeId[];
  /** Created on the first base flash (a filter needs a GPU context). */
  private baseFlashFilter: ColorMatrixFilter | null | undefined;
  private readonly onPresetChange: ((p: GraphicsPreset) => void) | undefined;
  private feel: RenderFeelConfig;
  private settings: ViewSettings;
  private readonly isMobile: boolean;
  private autoPreset: AutoPresetMonitor;
  private seam = SEAM_START_LU;
  private speed = 1;
  private paused = false;
  private ended = false;
  /** True once the battle has run (the first unpause); the title backdrop shows no mount markers. */
  private started = false;
  private input: BattleInput | null = null;
  private inputEl: HTMLElement | null = null;
  private hudAnchors: { gold: Pt | null; xp: Pt | null } = { gold: null, xp: null };
  private liveIds = new Set<number>();
  private frameGameDt = 0;
  private followers: Follower[] = [];
  /** Your Evolve was available after the last step (the chime plays on the rising edge, A13). */
  private evolveReady: boolean;
  /** Power zones in flight (telegraph plus effect), for follow moments, the minimap and badges. */
  private zoneTracks: ZoneTrack[] = [];
  /** A priority moment the camera frames while following (A17.4), in game ms left. */
  private moment: { x: number; leftMs: number } | null = null;
  /** Real-time clock for badge and minimap timings (ms). */
  private nowMs = 0;
  private baseHitAt: [number | null, number | null] = [null, null];
  private evolveFlashAt: [number | null, number | null] = [null, null];
  private lastAlertAt = -Infinity;
  private legendaryBadges: { id: string; x: number; unitId: number; side: Side; card: CardId; ageMs: number }[] = [];
  /** Your power drag: the pointer (client px) and the previewed p, kept current while edge-scrolling. */
  private powerDrag: { clientX: number; clientY: number; p: number | null; valid: boolean; raw: boolean } | null = null;

  constructor(o: BattleViewOptions) {
    this.sim = o.sim;
    this.config = o.sim.config;
    this.art = o.art;
    this.mySide = o.mySide ?? 0;
    this.spectator = o.spectator === true;
    this.feel = o.feel ?? cloneFeelConfig(defaultFeelConfig);
    this.settings = { ...DEFAULT_VIEW_SETTINGS, ...o.settings };
    this.isMobile = o.isMobile ?? false;
    this.onPresetChange = o.onPresetChange;
    this.rng = mulberry32((o.seed ?? this.config.seed) ^ 0x5eed);
    this.ages = ageOrder(this.config);
    this.layers = createLayers();
    this.root = this.layers.root;
    this.camera = new Camera(this.feel.tuning.maxZoom);
    this.director = new FeelDirector(this.feel, o.audio, this.config.seed);
    this.layers.flash.addChild(this.director.flash.root);
    this.mapper = new EventMapper({ content: this.config.content, feel: this.feel, mySide: this.mySide, rng: this.rng });
    this.autoPreset = new AutoPresetMonitor(this.settings.graphics, this.isMobile);
    this.particles = new ParticlePool(o.art, this.layers.vfx, 0, this.rng);
    this.numbers = new FloatingNumbers(this.layers.text, this.feel.tuning, this.rng, o.labelFactory);
    this.markers = new MountMarkers(o.labelFactory ?? textLabelFactory, o.mountLabel);

    const st = this.sim.state;
    this.backdrop = o.art.createBackdrop({ left: this.ageOf(0), right: this.ageOf(1), arena: o.arena ?? 'tar_pits' });
    this.backdrop.setSeam(this.seam);
    this.layers.backdrop.addChild(this.backdrop.root);
    this.layers.ground.addChild(this.shadows);
    this.bases = [this.createBase(0), this.createBase(1)];
    this.layers.bars.addChild(this.bars.root);
    this.layers.telegraphs.addChild(this.zones.root, this.markers.root);
    this.layers.ground.addChild(this.zones.groundRoot);
    this.layers.structures.addChildAt(this.holdFlag.root, 0);

    this.applySettings(this.settings);
    this.resize(1280, 720);
    this.camera.setHome(this.mySide);
    // A view created mid-match (replay seek) picks up what is already on the field.
    for (const u of st.units) this.ensureUnit(u);
    this.syncTurrets(0);
    this.evolveReady = canEvolve(st, this.config, this.mySide);
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
    const wasHome = !this.started && this.camera.following;
    this.camera.resize(width, height);
    // Before the battle starts the opening view keeps your base at the screen edge.
    if (wasHome) this.camera.setHome(this.mySide);
    this.director.flash.resize(width, height);
    for (const fx of this.screenFx) this.playScreenFx(fx);
  }

  setSpeed(s: number): void {
    this.speed = s > 0 ? s : 1;
  }

  setPaused(p: boolean): void {
    this.paused = p;
    if (!p) this.started = true;
  }

  /** Mutes the opponent's emotes and quotes for this match (HUD wheel, A18.9.4), on top of Settings. */
  muteEmotes(on: boolean): void {
    this.matchMute = on;
  }

  /** True while the opponent's emotes are muted: the Settings switch or the per-match mute. */
  emotesMuted(): boolean {
    return this.settings.mutedEmotes || this.matchMute;
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
    this.camera.setTuning(feel.tuning.maxZoom);
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

  /**
   * The HUD chrome's insets in CSS px (docs/ui-plan.md 3.1 world framing): the camera fits the lane
   * between the top band (with the minimap) and the tray, so unit feet and HP pips never sit under it.
   */
  setHudInsets(insets: { top: number; bottom: number } | null): void {
    const wasHome = !this.started && this.camera.following;
    this.camera.setInsets(insets);
    if (wasHome) this.camera.setHome(this.mySide);
  }

  /** Attaches canvas pointer input (mount taps, pinch zoom, double-tap reset). Returns a detach. */
  attachInput(el: HTMLElement): () => void {
    this.input?.destroy();
    this.inputEl = el;
    this.input = new BattleInput(el, {
      camera: this.camera,
      tap: (p, shift) => this.tap(p, shift),
      jump: (where) => this.cameraCommand({ t: where }),
      cameraEnabled: () => this.cameraActive(),
      edgeScrollEnabled: () => this.settings.edgeScroll && !this.camera.isHeld('popover') && !this.camera.isHeld('powerDrag'),
    });
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

  /**
   * Where the fighting is, from your side: your and their front ground unit as progress 0..1 from
   * your gate (null when a side has no units). Feeds the HUD's front-line strip.
   */
  frontLine(): { mine: number | null; theirs: number | null } {
    const f = frontLines(this.frontInputs());
    const toP = (x: number | null): number | null => (x === null ? null : Math.max(0, Math.min(1, xToP(x, this.mySide) / LANE_LU)));
    return this.mySide === 0 ? { mine: toP(f.left), theirs: toP(f.right) } : { mine: toP(f.right), theirs: toP(f.left) };
  }

  /**
   * True when your front is in a fight within 300 lu of the camera centre (MR-80): the evolve moment
   * then leaves the camera alone.
   */
  private frontBusy(): boolean {
    const f = frontLines(this.frontInputs());
    const mine = this.mySide === 0 ? f.left : f.right;
    const theirs = this.mySide === 0 ? f.right : f.left;
    if (mine === null || theirs === null) return false;
    return Math.abs(mine - theirs) <= 160 && Math.abs(mine - this.camera.centerX) <= 300;
  }

  /** True while the camera takes input: the battle has started (the title backdrop stays put). */
  private cameraActive(): boolean {
    return this.started && !this.camera.isLocked;
  }

  /**
   * Camera commands from the HUD and keys (A17.4): the base button (H), the front button (J), a
   * minimap tap (eases to x in 300 ms) and a minimap drag (scrubs 1:1). All but the front button go
   * Manual.
   */
  cameraCommand(c: CameraCommand): void {
    if (!this.cameraActive()) return;
    switch (c.t) {
      case 'base':
        this.camera.jumpHome();
        return;
      case 'front':
        this.camera.jumpFront();
        return;
      case 'center':
        this.camera.jumpTo(c.x, CAMERA.minimapMs);
        return;
      case 'scrub':
        this.camera.scrubTo(c.x);
        return;
    }
  }

  /**
   * Blocks the auto-follow from resuming (and edge scroll) while the HUD holds something open: a mount
   * popover, a power drag, a minimap scrub, a tutorial beat pointing at your base (A17.4, A17.6).
   */
  cameraHold(key: CameraHold, on: boolean): void {
    this.camera.hold(key, on);
    if (key === 'powerDrag' && !on) this.powerDrag = null;
  }

  /** Brings your base into view for something that needs it (a tutorial beat, A17.6); stays Manual. */
  showBase(): void {
    if (!this.cameraActive()) return;
    if (!this.camera.inView(baseCenterX(this.mySide), -60)) this.camera.jumpHome();
  }

  // ------------------------------------------------------------------------------------------
  // The Hold flag (A18.4.2): drawn here, dragged by the HUD.

  private updateHoldFlag(realDt: number): void {
    const me = this.sim.state.sides[this.mySide];
    const rule = this.config.content.economy.holdFlag;
    const on = !this.spectator && !this.ended && me.stance === 'hold';
    this.holdFlag.update(realDt, {
      on,
      x: pToX(me.holdP / MILLI_LU, this.mySide),
      color: teamColor(this.settings.teamPreset, this.mySide),
      ghostX: this.flagGhostP === null || this.spectator ? null : pToX(this.flagGhostP, this.mySide),
      range: [pToX(rule.minP, this.mySide), pToX(rule.maxP, this.mySide)],
      dir: facingOf(this.mySide),
      reduce: this.settings.reduceMotion,
    });
  }

  /**
   * Your Hold flag's screen point (view-local CSS px): its foot and the top of its pole, or null when
   * it is not standing (not holding, spectating, match over).
   */
  holdFlagScreen(): { x: number; y: number; top: number } | null {
    const me = this.sim.state.sides[this.mySide];
    if (this.spectator || this.ended || me.stance !== 'hold') return null;
    const x = pToX(me.holdP / MILLI_LU, this.mySide);
    const foot = this.camera.worldToScreen(x, HOLD_FLAG_FOOT_Y);
    const top = this.camera.worldToScreen(x, HOLD_FLAG_TOP_Y);
    return { x: foot.x, y: foot.y, top: top.y };
  }

  /** Own-side p (lu, unclamped) under a client point, or null off the lane band: for the flag drag. */
  flagPAt(clientX: number, clientY: number): number | null {
    const r = this.inputEl?.getBoundingClientRect();
    const sx = clientX - (r?.left ?? 0);
    const sy = clientY - (r?.top ?? 0);
    const L = this.camera.layout;
    if (sx < 0 || sx > L.width || sy < L.bandY - L.bandH * 0.1 || sy > L.bandY + L.bandH * 1.1) return null;
    return xToP(this.camera.screenToWorld(sx, sy).x, this.mySide);
  }

  /** Shows the flag drag's ghost at own-side p (lu), or hides it with null; holds the camera while shown. */
  previewHoldFlag(p: number | null): void {
    this.flagGhostP = p;
    this.camera.hold('powerDrag', p !== null);
  }

  /** The screen point (view-local CSS px) of one of your mounts, for placing the HUD popover. */
  mountScreenPoint(mount: number): Pt | null {
    const p = this.mountPoints(this.mySide)[mount];
    return p ? this.camera.worldToScreen(p.x, p.y) : null;
  }

  /** The slot the HUD aims now (A2.9.10: the dock has a Home and a Field button). */
  private aimSlot: PowerSlot = 'home';
  /** The preview's labels and reason, kept for the edge-scroll re-preview. */
  private previewOpts: HudPowerPreviewOpts = {};

  /** A slot's power in your current loadout, if any (default: the slot being aimed). */
  private myPower(slot: PowerSlot = this.aimSlot): PowerDef | undefined {
    const age = this.ageOf(this.mySide);
    const id = this.config.sides[this.mySide].loadouts[age]?.powers[slot];
    return id ? this.config.content.powers[id] : undefined;
  }

  /** True when the slot's power (default Home) is placed by dragging (area powers and strikes). */
  powerAimable(slot: PowerSlot = 'home'): boolean {
    const def = this.myPower(slot);
    return !!def && powerTakesAim(def);
  }

  /** Units as the power preview sees them: own-frame p (lu) of your side, from the sim. */
  private previewUnits(): PreviewUnit[] {
    const out: PreviewUnit[] = [];
    const eco = this.config.content.economy;
    for (const u of this.sim.state.units) {
      if (u.mode === 'dying' || u.hp <= 0) continue;
      const def = this.config.content.units[u.card];
      out.push({
        id: u.id,
        own: u.side === this.mySide,
        p: xToP(u.x / MILLI_LU, this.mySide),
        air: u.air,
        summoned: u.summoned,
        leaping: u.mode === 'leap',
        cost: def?.cost ?? 0,
        half: (def ? eco.sizes[def.size] : 24) / 2,
      });
    }
    return out;
  }

  private reachRules(): PowerReachRules {
    return reachRulesLu(this.config.content.economy);
  }

  /**
   * A slot's reach band now (A2.9.4): the legal zone centres in own-side lu; null for powers that take
   * no aim. The Front band follows your front live.
   */
  powerReach(slot: PowerSlot): { reach: PowerReach; band: [number, number] | null } | null {
    const def = this.myPower(slot);
    if (!def) return null;
    const rules = this.reachRules();
    return { reach: def.reach, band: previewBand(def, previewFront(this.previewUnits(), rules), rules) };
  }

  /**
   * Converts a client point to own-side progress p (lu) clamped to the power band, or null when the
   * point is not over the lane band. Use for power drag targeting.
   */
  laneP(clientX: number, clientY: number): number | null {
    const p = this.lanePAt(clientX, clientY);
    // A drag near the band's edge scrolls the camera (A17.6); remember the pointer for that.
    this.powerDrag = { clientX, clientY, p, valid: this.powerDrag?.valid ?? true, raw: false };
    this.camera.hold('powerDrag', true);
    return p;
  }

  /**
   * Own-side p (lu) under a client point, not clamped to any band (0 to the lane length), or null off
   * the lane: the HUD resolves it against the slot's reach (the magnetic edge, A2.9.10).
   */
  laneRawP(clientX: number, clientY: number): number | null {
    const p = this.laneRawAt(clientX, clientY);
    this.powerDrag = { clientX, clientY, p, valid: this.powerDrag?.valid ?? true, raw: true };
    this.camera.hold('powerDrag', true);
    return p;
  }

  private laneRawAt(clientX: number, clientY: number): number | null {
    const r = this.inputEl?.getBoundingClientRect();
    const sx = clientX - (r?.left ?? 0);
    const sy = clientY - (r?.top ?? 0);
    const L = this.camera.layout;
    if (sy < L.bandY - L.bandH * 0.05 || sy > L.bandY + L.bandH * 1.02 || sx < 0 || sx > L.width) return null;
    const w = this.camera.screenToWorld(sx, sy);
    return Math.round(Math.max(0, Math.min(LANE_LU, xToP(w.x, this.mySide))));
  }

  /**
   * Starts tap-to-aim (owner decision "Age Power targeting"): holds the camera like a drag and returns
   * where the ghost starts: over the eligible enemies nearest your gate inside the reach band (else
   * ahead of your front, else mid-band). Powers without an aim show where they act.
   */
  powerAimStart(slot: PowerSlot = 'home'): number | null {
    this.aimSlot = slot;
    const def = this.myPower(slot);
    const legacy = this.config.content.economy.powerZoneClamp;
    if (!def || !powerTakesAim(def)) {
      // The power picks its own spot (a charge, a drop, a buff, Suppress): the ghost shows it.
      const z = this.ghostZone(0);
      const p = z ? clampPowerP(xToP(z.x, this.mySide), legacy) : Math.round((legacy[0] + legacy[1]) / 2);
      this.powerDrag = { clientX: Number.NaN, clientY: Number.NaN, p, valid: true, raw: false };
      this.camera.hold('powerDrag', true);
      if (z) this.revealAim(z.x);
      return p;
    }
    const rules = this.reachRules();
    const units = this.previewUnits();
    const front = previewFront(units, rules);
    const band = previewBand(def, front, rules) ?? legacy;
    const width = powerZoneWidth(def);
    let foe: number | null = null;
    let mine: number | null = null;
    for (const u of units) {
      if (u.own) mine = mine === null ? u.p : Math.max(mine, u.p);
      else foe = foe === null ? u.p : Math.min(foe, u.p);
    }
    const at = foe !== null ? foe + width * 0.35 : mine !== null ? mine + width * 0.5 : (band[0] + band[1]) / 2;
    const p = clampPowerP(at, band);
    this.powerDrag = { clientX: Number.NaN, clientY: Number.NaN, p, valid: true, raw: false };
    this.camera.hold('powerDrag', true);
    this.revealAim(pToX(p, this.mySide));
    return p;
  }

  /**
   * Aiming mode starts with the ghost on screen: after the player scrolled away (a cancelled drag
   * that edge-scrolled, a minimap jump), a tap would otherwise show "Tap the battlefield" with the
   * ghost out of view. Eases there and stays Manual, like a minimap tap (A17.4).
   */
  private revealAim(x: number): void {
    if (!this.cameraActive() || this.camera.inView(x, -AIM_REVEAL_MARGIN_LU)) return;
    this.camera.jumpTo(x);
  }

  /** The drag ghost now: centre x (lu), width, validity and how many enemy units it would hit. */
  powerGhost(): { x: number; width: number; valid: boolean; targets: number } | null {
    return this.zones.preview;
  }

  /** What the ghost would do now, for the HUD token ("Hits 4 of 5"; a strike's lock). */
  powerGhostInfo(): { covered: number; eligible: number; locked: boolean | null; valid: boolean } | null {
    const g = this.zones.preview;
    if (!g) return null;
    const def = this.myPower();
    const strike = def?.effect.kind === 'strike';
    const t = this.ghostTargets;
    return { covered: t ? t.covered.size : 0, eligible: t ? t.eligible.length : 0, locked: strike ? !!t && t.lock !== null : null, valid: g.valid };
  }

  private lanePAt(clientX: number, clientY: number): number | null {
    const raw = this.laneRawAt(clientX, clientY);
    return raw === null ? null : clampPowerP(raw, this.config.content.economy.powerZoneClamp);
  }

  /** Own-side p for a world x (the minimap drop), clamped to the power band. */
  powerPAtWorld(x: number): number {
    return clampPowerP(xToP(x, this.mySide), this.config.content.economy.powerZoneClamp);
  }

  /** Own-side p for a world x, not clamped (a power dragged over the minimap). */
  pAtWorld(x: number): number {
    return Math.round(Math.max(0, Math.min(LANE_LU, xToP(x, this.mySide))));
  }

  /** The p the drag preview shows right now (it moves while the camera edge-scrolls under the finger). */
  previewedP(): number | null {
    return this.powerDrag?.p ?? null;
  }

  /**
   * Shows a slot's ghost at own-side progress `p` (lu), or hides it with null. `valid` false tints it
   * red: over the HUD (a drop there puts it back) or beyond the power's reach (`o.invalid` 'reach':
   * hatched, with `o.invalidLabel`). The reach band shows while a ghost is out.
   */
  previewPower(p: number | null, valid = true, o: HudPowerPreviewOpts = {}): void {
    if (o.slot) this.aimSlot = o.slot;
    this.previewOpts = o;
    const def = this.myPower();
    if (this.powerDrag) this.powerDrag.valid = valid;
    const z = p === null ? null : this.ghostZone(p);
    if (p === null || z === null) {
      this.zones.hidePreview();
      this.ghostTargets = null;
      if (this.powerDrag) this.powerDrag.p = p;
      return;
    }
    if (this.powerDrag) this.powerDrag.p = p;
    const color = teamColor(this.settings.teamPreset, this.mySide);
    const areaMax = this.refreshBand(def);
    const fx = def?.effect;
    this.zones.showPreview(z.x, z.width, color, {
      valid,
      style: ghostStyle(def),
      dir: facingOf(this.mySide),
      outOfReach: o.invalid === 'reach',
      edge: o.edge === true,
      invalidLabel: o.invalidLabel ?? null,
      clipX: areaMax === null ? null : pToX(areaMax, this.mySide),
      fringe: fx?.kind === 'barrage' ? fx.radius : 0,
    });
  }

  /**
   * Shows the reach band of the power being aimed (A2.9.10 step 1) and returns its far edge (own-side
   * lu; null without one): the Home line for Home powers, the band's reach for Front ones. Called on
   * every preview and every frame, so a Front band's edge follows your front live.
   */
  private refreshBand(def: PowerDef | undefined): number | null {
    if (!def) {
      this.zones.setBand(null);
      return null;
    }
    const rules = this.reachRules();
    const band = previewBand(def, previewFront(this.previewUnits(), rules), rules);
    const areaMax = band && def.reach !== 'anywhere' ? reachAreaMax(def.reach, powerZoneWidth(def), band, rules) : null;
    this.zones.setBand({
      gateX: pToX(0, this.mySide),
      edgeX: areaMax === null ? null : pToX(areaMax, this.mySide),
      farX: pToX(LANE_LU, this.mySide),
      dir: facingOf(this.mySide),
      color: teamColor(this.settings.teamPreset, this.mySide),
      label: this.previewOpts.bandLabel ?? null,
    });
    return areaMax;
  }

  /** A cast was sent: the ghost contracts and fades (MR-70b) instead of vanishing. */
  powerCommit(): void {
    this.zones.commit();
    this.ghostTargets = null;
  }

  /**
   * Where the ghost goes for an aim at `p`: the aimed zone (a strike's pick range), or for a power that
   * picks its own spot the area it will act on (WP2 "abilities and powers"): a charge runs from your
   * front F (p 200 without one) for its distance; a drop lands beyond the enemy front; a buff glows
   * over your front group; Suppress over the enemy wall.
   */
  private ghostZone(p: number): { x: number; width: number } | null {
    const def = this.myPower();
    if (!def) return null;
    const e = def.effect;
    const width = powerZoneLu(def);
    if (width !== null) return { x: pToX(p, this.mySide), width };
    const band = this.config.content.economy.powerZoneClamp;
    const rules = this.reachRules();
    const units = this.previewUnits();
    if (e.kind === 'stampede') {
      const battle = (this.config.content as { battle?: { stampedeFallbackP?: number } }).battle;
      const start = previewFront(units, rules) ?? battle?.stampedeFallbackP ?? 200;
      return { x: pToX(start + e.distance / 2, this.mySide), width: e.distance };
    }
    if (e.kind === 'paradrop') {
      let f: number | null = null;
      for (const u of units) if (!u.own && !u.air) f = f === null ? u.p : Math.min(f, u.p);
      const land = f === null ? e.fallbackP : Math.min(band[1], f + e.beyondFront);
      return { x: pToX(land, this.mySide), width: 220 };
    }
    if (e.kind === 'buffAll') {
      // Your 8 frontmost units glow (A2.9.5): the ghost spans them.
      const own = units.filter((u) => u.own).sort((a, b) => b.p - a.p || a.id - b.id).slice(0, e.maxTargets);
      if (own.length === 0) return { x: pToX(300, this.mySide), width: 200 };
      const lo = Math.min(...own.map((u) => u.p)) - 30;
      const hi = Math.max(...own.map((u) => u.p)) + 30;
      return { x: pToX((lo + hi) / 2, this.mySide), width: Math.max(120, hi - lo) };
    }
    if (e.kind === 'suppress') {
      // The jam lands on the enemy wall (every enemy mount).
      return { x: pToX(LANE_LU - rules.turretRangeCap / 2, this.mySide), width: rules.turretRangeCap };
    }
    return null;
  }

  /** The last prediction for the ghost (pips, covered, lock), refreshed every frame. */
  private ghostTargets: PreviewTargets | null = null;

  /** The enemy units the ghost would hit, refreshed every frame while it shows (they keep walking). */
  private updateGhostTargets(): void {
    const g = this.zones.preview;
    if (g) this.refreshBand(this.myPower());
    if (!g || !g.valid) {
      if (g) {
        this.zones.setTargets([]);
        this.zones.setPips([]);
        this.zones.setNotHit([]);
        this.zones.setLock(null);
      }
      this.ghostTargets = null;
      return;
    }
    const def = this.myPower();
    const fx = def?.effect;
    if (!def || !fx || fx.kind === 'paradrop' || fx.kind === 'suppress') {
      this.zones.setTargets([]);
      this.zones.setPips([]);
      this.zones.setNotHit([]);
      this.zones.setLock(null);
      this.ghostTargets = null;
      return;
    }
    const rules = this.reachRules();
    const units = this.previewUnits();
    const front = previewFront(units, rules);
    const aimP = xToP(g.x, this.mySide);
    const battle = (this.config.content as { battle?: { stampedeFallbackP?: number } }).battle;
    if (fx.kind === 'buffAll') {
      // A buff glows over your 8 frontmost units (the gold ring marks each).
      const own = units.filter((u) => u.own).sort((a, b) => b.p - a.p || a.id - b.id).slice(0, fx.maxTargets);
      this.zones.setTargets(own.flatMap((u) => this.targetAt(u.id)));
      this.zones.setPips([]);
      this.zones.setNotHit([]);
      this.zones.setLock(null);
      this.ghostTargets = { eligible: own.map((u) => u.id), covered: new Set(own.map((u) => u.id)), notHit: [], lock: null, areaMax: rules.lane, run: null };
      return;
    }
    const pt = previewTargets(def, units, aimP, front, rules, battle?.stampedeFallbackP ?? 200);
    this.ghostTargets = pt;
    const capped = fx.kind !== 'cloud' && fx.kind !== 'strike';
    this.zones.setTargets([...pt.covered].flatMap((id) => this.targetAt(id)));
    this.zones.setPips(
      capped
        ? pt.eligible.flatMap((id, i) => {
            const u = this.units.get(id);
            return u && !u.dying ? [{ x: u.x, y: u.y, size: u.sizeLu, n: i + 1, covered: pt.covered.has(id) }] : [];
          })
        : [],
    );
    this.zones.setNotHit(pt.notHit.flatMap((id) => this.targetAt(id)));
    this.zones.setLock(pt.lock === null ? null : (this.targetAt(pt.lock)[0] ?? null));
  }

  private targetAt(id: number): GhostTarget[] {
    const u = this.units.get(id);
    return u && !u.dying ? [{ x: u.x, y: u.y, size: u.sizeLu }] : [];
  }

  /** Call after every `sim.step` with that tick's events. */
  onEvents(events: readonly SimEvent[]): void {
    // Muted AI emotes (Settings) show no bubble and make no sound.
    const evs = this.emotesMuted() ? events.filter((e) => !(e.e === 'emote' && e.side !== this.mySide)) : events;
    for (const ev of evs) this.watchEvent(ev);
    if (evs.length > 0) {
      const actions = this.mapper.map(evs, (id) => this.lookup(id));
      for (const a of actions) this.exec(a);
    }
    // A13 `evolve_ready`: one soft chime when your Evolve becomes available (there is no sim event).
    const ready = canEvolve(this.sim.state, this.config, this.mySide);
    if (ready && !this.evolveReady && !this.ended) {
      const out: ViewAction[] = [];
      this.mapper.rule('evolve.ready', { at: { k: 'base', side: this.mySide, part: 'top' } }, out);
      for (const a of out) this.exec(a);
    }
    this.evolveReady = ready;
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
    this.updateFollowers();
    this.syncTurrets(gameDt);
    this.syncBases(gameDt);
    this.updateProjectiles(gameDt);
    this.particles.update(gameDt);
    for (const fx of this.screenFx) {
      fx.update(gameDt);
      if (fx.done) this.playScreenFx(fx);
    }

    const mid = frontMidpoint(this.frontInputs());
    this.seam = stepSeam(this.seam, mid, gameDt, this.feel.tuning.seamMaxLuPerSec);
    this.backdrop.setSeam(this.seam);

    this.nowMs += realDt;
    this.updateTracks(gameDt);
    this.input?.tick();
    this.updatePowerDragEdge();
    this.camera.follow(this.followTarget());
    this.camera.update(realDt, this.paused ? 1 : this.speed);
    const t = this.camera.transform();
    this.layers.world.position.set(t.x, t.y);
    this.layers.world.scale.set(t.scale);
    this.viewL = -t.x / t.scale;
    this.viewR = this.viewL + this.camera.layout.width / t.scale;
    // The backdrop's layers scroll at their parallax factors (A17.7); it is told the visible range.
    (this.backdrop as BackdropView & { setView?(left: number, width: number, above: number): void }).setView?.(this.viewL, this.viewR - this.viewL, t.y / t.scale);
    this.backdrop.update(gameDt);
    this.cull();

    this.updateGhostTargets();
    this.zones.setView(this.viewL, this.viewR);
    this.zones.update(gameDt, t.scale, realDt);
    this.updateMarkers(realDt, t.scale);
    this.updateHoldFlag(realDt);
    this.numbers.update(this.paused ? 0 : realDt, t.scale);
    this.drawBars(t.scale);
    this.drawShadows();

    const L = this.camera.layout;
    const s = this.director.shake.offset();
    this.layers.shaker.pivot.set(L.width / 2, L.height / 2);
    this.layers.shaker.position.set(L.width / 2 + s.x, L.height / 2 + s.y);
    this.layers.shaker.rotation = s.rot;
  }

  // ------------------------------------------------------------------------------------------
  // Camera follow, moments, badges and the minimap (A17.4, A17.5)
  // ------------------------------------------------------------------------------------------

  /** The visible world range of the last frame (lu), for culling and badges. */
  private viewL = WORLD_LEFT_LU;
  private viewR = WORLD_RIGHT_LU;

  /** Tracks the events that feed the camera moments, the badges and the minimap flashes. */
  private watchEvent(ev: SimEvent): void {
    switch (ev.e) {
      case 'baseDamaged': {
        if (ev.sourceId === null) return; // Siege decay is not an attack
        this.baseHitAt[ev.side] = this.nowMs;
        if (ev.side === this.mySide && this.started && !this.ended && !this.camera.inView(gateX(this.mySide), -20)) {
          if (this.nowMs - this.lastAlertAt >= ALERT_BASE_GAP_MS) {
            this.lastAlertAt = this.nowMs;
            this.director.sound('alert_base', { priority: 4 });
          }
        }
        return;
      }
      case 'unitSpawned': {
        if (ev.side === this.mySide) return;
        const def = this.config.content.units[ev.card];
        if (def?.group !== 'legendary') return;
        const x = ev.x / MILLI_LU;
        if (this.camera.inView(x, -40)) return;
        this.legendaryBadges.push({ id: `leg:${ev.id}`, x, unitId: ev.id, side: ev.side, card: ev.card, ageMs: 0 });
        return;
      }
      case 'lastStandFire':
        if (ev.side === this.mySide) this.moment = { x: gateX(this.mySide), leftMs: LAST_STAND_MOMENT_MS };
        return;
      default:
        return;
    }
  }

  /** A cast's telegraph: tracked for the minimap and badges; your casts (or theirs on your units) get a moment. */
  private trackZone(a: Extract<ViewAction, { a: 'telegraph' }>): void {
    const def = this.config.content.powers[a.power];
    const e = def?.effect as { durationMs?: number } | undefined;
    const effectMs = typeof e?.durationMs === 'number' ? e.durationMs : 1500;
    const totalMs = a.ms + effectMs;
    this.zoneTracks.push({ id: `pw:${a.side}:${a.castId}`, side: a.side, x: a.x, width: a.zone, telegraphMs: a.ms, totalMs, ageMs: 0, power: a.power });
    const half = Math.max(40, a.zone / 2);
    const hitsMine = a.side !== this.mySide && [...this.units.values()].some((u) => u.side === this.mySide && !u.dying && Math.abs(u.x - a.x) <= half);
    if (a.side === this.mySide || hitsMine) this.moment = { x: a.x, leftMs: Math.min(POWER_MOMENT_MAX_MS, totalMs) };
  }

  private updateTracks(gameDt: number): void {
    for (const z of this.zoneTracks) z.ageMs += gameDt;
    this.zoneTracks = this.zoneTracks.filter((z) => z.ageMs < z.totalMs);
    if (this.moment) {
      this.moment.leftMs -= gameDt;
      if (this.moment.leftMs <= 0) this.moment = null;
    }
    for (const b of this.legendaryBadges) {
      b.ageMs += gameDt;
      const u = this.units.get(b.unitId);
      if (u && !u.dying) b.x = u.x;
    }
    this.legendaryBadges = this.legendaryBadges.filter((b) => {
      const u = this.units.get(b.unitId);
      return b.ageMs < BADGE_LEGENDARY_MS && !!u && !u.dying && !this.camera.inView(b.x, -40);
    });
  }

  /** The follow target centre (A17.4): a priority moment, else the fronts' focus, framed. */
  private followTarget(): number | null {
    const V = this.camera.viewLu;
    if (this.spectator) return this.moment ? this.moment.x : spectatorFocus(cameraFronts(this.frontInputs()));
    const focus = this.moment ? this.moment.x : followFocus(cameraFronts(this.frontInputs()), this.mySide, V);
    return focus === null ? null : framingCenter(focus, this.mySide, V);
  }

  private dragEdgeOn = false;

  /** A power drag within 48 px of the band's left or right edge scrolls the camera (A17.6). */
  private updatePowerDragEdge(): void {
    const d = this.powerDrag;
    let speed = 0;
    if (d && this.inputEl && this.cameraActive()) {
      const r = this.inputEl.getBoundingClientRect();
      const sx = d.clientX - r.left;
      const sy = d.clientY - r.top;
      const L = this.camera.layout;
      if (sy >= L.bandY && sy <= L.bandY + L.bandH) speed = edgeSpeed(sx, L.width, CAMERA.dragEdgePx, 150, CAMERA.edgeMaxLuPerSec);
    }
    if (speed !== 0) {
      this.camera.setEdge(speed);
      this.dragEdgeOn = true;
      if (d) {
        if (d.raw) {
          // The HUD aims with raw points: resolve them against the reach band as it does.
          const raw = this.laneRawAt(d.clientX, d.clientY);
          const def = this.myPower();
          if (raw !== null && def) {
            const rules = this.reachRules();
            const r = resolveAim(raw, previewBand(def, previewFront(this.previewUnits(), rules), rules));
            this.previewPower(r.p, r.inReach, { ...this.previewOpts, invalid: r.inReach ? undefined : 'reach', edge: r.edge });
            d.raw = true;
          }
        } else {
          d.p = this.lanePAt(d.clientX, d.clientY);
          this.previewPower(d.p, d.valid, this.previewOpts);
        }
      }
    } else if (this.dragEdgeOn) {
      this.camera.setEdge(0);
      this.dragEdgeOn = false;
    }
  }

  /** Hides display objects more than 150 lu outside the view; their state still updates (A17.7). */
  private cull(): void {
    const lo = this.viewL - CULL_LU;
    const hi = this.viewR + CULL_LU;
    for (const e of this.units.values()) {
      const on = e.x >= lo && e.x <= hi;
      e.view.root.visible = on;
      if (e.aura) e.aura.root.visible = on;
    }
    for (const p of this.projectiles.values()) {
      const x = p.view.root.x;
      p.view.root.visible = x >= lo && x <= hi;
    }
  }

  /** True when a world x is near enough the view to be worth emitting particles for (A17.7). */
  private nearView(x: number): boolean {
    return x >= this.viewL - CULL_LU && x <= this.viewR + CULL_LU;
  }

  /** The off-screen badges (A17.5), newest first, at most 3 per edge. */
  private badges(): EdgeBadge[] {
    const out: EdgeBadge[] = [];
    const L = this.viewL;
    const R = this.viewR;
    const edgeOf = (x: number): 'left' | 'right' => (x < (L + R) / 2 ? 'left' : 'right');
    const hit = this.baseHitAt[this.mySide];
    const gate = gateX(this.mySide);
    if (hit !== null && this.nowMs - hit <= BADGE_BASE_HIT_MS + BADGE_BASE_LINGER_MS && (gate < L - 20 || gate > R + 20) && !this.ended) {
      out.push({ id: 'base', kind: 'base', edge: edgeOf(gate), x: baseCenterX(this.mySide), side: this.mySide, countdown: null, ageMs: this.nowMs - hit });
    }
    for (const z of this.zoneTracks) {
      const half = z.width / 2;
      if (z.x + half >= L && z.x - half <= R) continue;
      out.push({
        id: z.id,
        kind: 'power',
        edge: edgeOf(z.x),
        x: z.x,
        side: z.side,
        card: z.power,
        countdown: z.ageMs < z.telegraphMs ? 1 - z.ageMs / Math.max(1, z.telegraphMs) : null,
        ageMs: z.ageMs,
      });
    }
    for (const b of this.legendaryBadges) {
      out.push({ id: b.id, kind: 'legendary', edge: edgeOf(b.x), x: b.x, side: b.side, card: b.card, countdown: null, ageMs: b.ageMs });
    }
    out.sort((a, b) => a.ageMs - b.ageMs);
    const left = out.filter((b) => b.edge === 'left').slice(0, BADGES_PER_EDGE);
    const right = out.filter((b) => b.edge === 'right').slice(0, BADGES_PER_EDGE);
    return [...left, ...right];
  }

  /**
   * What the HUD's minimap strip and off-screen badges draw (A17.5), from the view's interpolated
   * positions. Cheap: at most 80 unit dots.
   */
  minimap(): MinimapSnapshot {
    const st = this.sim.state;
    const units: MinimapUnit[] = [];
    for (const e of this.units.values()) {
      if (e.dying) continue;
      const g = e.def?.group;
      units.push({ x: e.x, side: e.side, air: e.air, size: g === 'legendary' ? 2 : g === 'heavy' || g === 'epic' ? 1 : 0 });
    }
    // Over the cap: keep the Legendaries and the fronts (the dots that matter most).
    if (units.length > MINIMAP_MAX_UNITS) {
      units.sort((a, b) => b.size - a.size || (a.side === 0 ? b.x - a.x : a.x - b.x));
      units.length = MINIMAP_MAX_UNITS;
    }
    const f = cameraFronts(this.frontInputs());
    const base = (side: Side) => {
      const s = st.sides[side];
      const hit = this.baseHitAt[side];
      const evo = this.evolveFlashAt[side];
      return {
        hpBp: s.baseMaxHp > 0 ? Math.max(0, Math.floor((s.baseHp * 10000) / s.baseMaxHp)) : 0,
        age: this.ageOf(side),
        hitAgoMs: hit === null ? null : this.nowMs - hit,
        evolveAgoMs: evo === null ? null : this.nowMs - evo,
      };
    };
    const zones: MinimapZone[] = this.zoneTracks.map((z) => ({ x: z.x, width: z.width, side: z.side, kind: z.ageMs < z.telegraphMs ? 'telegraph' : 'effect' }));
    const ghost = this.zones.preview;
    if (ghost?.valid) zones.push({ x: ghost.x, width: ghost.width, side: this.mySide, kind: 'preview' });
    // The reach band of the power being aimed (A2.9.10 step 1): the minimap shows the same tint.
    const rb = this.zones.bandShown;
    const reach = rb && rb.edgeX !== null ? { from: Math.min(rb.gateX, rb.edgeX), to: Math.max(rb.gateX, rb.edgeX), side: this.mySide, invalid: this.zones.outOfReach } : null;
    const L = this.camera.layout;
    const r = this.camera.viewRange();
    return {
      worldLeft: WORLD_LEFT_LU,
      worldRight: WORLD_RIGHT_LU,
      lane: LANE_LU,
      mySide: this.mySide,
      view: { left: Math.max(WORLD_LEFT_LU, r.left), right: Math.min(WORLD_RIGHT_LU, r.right) },
      following: this.camera.following,
      autoCamera: this.settings.autoCamera,
      units,
      fronts: [f.left, f.right],
      bases: [base(0), base(1)],
      cover: [st.sides[0].turrets.some((t) => t !== null), st.sides[1].turrets.some((t) => t !== null)],
      coverLu: TURRET_COVER_LU,
      zones,
      badges: this.started ? this.badges() : [],
      band: { y: L.bandY, h: L.bandH },
      reach,
    };
  }

  /** Counters for the dev pages. */
  stats(): {
    units: number;
    projectiles: number;
    particles: number;
    particleCap: number;
    dropped: number;
    numbers: number;
    trauma: number;
    freezeUsedMs: number;
    preset: GraphicsPreset;
    seam: number;
    zoom: number;
    cameraX: number;
    following: boolean;
  } {
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
      cameraX: this.camera.centerX,
      following: this.camera.following,
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
    this.followers = [];
    this.particles.destroy();
    this.numbers.destroy();
    for (const b of this.bases) {
      b.dressing?.destroy();
      b.view.destroy();
    }
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
    this.zones.setReduceMotion(s.reduceMotion);
    this.camera.autoCamera = s.autoCamera;
    this.camera.reduceMotion = s.reduceMotion;
    this.numbers.mode = s.damageNumbers;
    const preset = this.autoPreset.preset;
    this.particles.cap = particleCap(preset, this.isMobile, this.feel.particleCaps);
    this.shadows.visible = PRESETS[preset].shadows;
    if (!PRESETS[preset].legendaryAuras) {
      for (const e of this.units.values()) this.dropAura(e);
    }
    // base and turret upgrade moments follow Reduce motion and Lite (duck-typed `setMotion`)
    for (const b of this.bases ?? []) {
      withMotion(b.view, this.viewMotion());
      if (b.dressing) withMotion(b.dressing, this.viewMotion());
    }
    for (const e of this.turrets?.values() ?? []) withMotion(e.view, this.viewMotion());
  }

  private viewMotion(): ViewMotion {
    return { reduce: this.settings.reduceMotion, lite: this.preset === 'lite' };
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

  /** World points of a side's four mounts (cached from the base view: world space, see createBase). */
  private mountPoints(side: Side): Pt[] {
    return this.bases[side].mountsLocal;
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
      case 'fx': {
        const at = this.anchor(a.at);
        // Off-screen particles are not emitted (A17.7); zones and strikes still show when they matter.
        if (!this.nearView(at.x) && a.at.k !== 'base' && a.opts?.['durationMs'] === undefined) return;
        const handles: ParticleHandle[] = [];
        this.particles.emit(a.effectId, a.count, a.priority, at, {
          ...(a.spreadLu !== undefined ? { spreadLu: a.spreadLu } : {}),
          ...(a.opts ? { opts: a.opts } : {}),
          out: handles,
        });
        if (a.follow && a.at.k === 'unit') this.follow(handles, a.at.id, a.at.part ?? 'hit', at);
        return;
      }
      case 'fxUnits':
        for (const e of this.units.values()) {
          if (e.side !== a.side || e.dying || !this.nearView(e.x)) continue;
          if (a.roles && !(e.def && a.roles.includes(e.def.role))) continue;
          const at = this.anchor({ k: 'unit', id: e.id, part: 'hit' });
          const handles: ParticleHandle[] = [];
          this.particles.emit(a.effectId, 1, a.priority, at, { ...(a.opts ? { opts: a.opts } : {}), out: handles });
          this.follow(handles, e.id, 'hit', at);
        }
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
      case 'camera': {
        const at = this.anchor(a.at);
        if (a.outMs <= 0) {
          // A base falls (A17.4): always pan (500 ms) to it, then push in and stay.
          this.camera.lockOn(at.x);
          if (!this.settings.reduceMotion) this.camera.pushTo({ x: at.x, y: at.y, zoom: a.zoom, inMs: a.inMs, holdMs: a.holdMs, outMs: a.outMs });
          return;
        }
        // Your evolve frames your base from anywhere (MR-80): a pan and a push, at most 3 s, ended by any
        // camera input. The player keeps the camera when they are working it (a drag or Manual input
        // in the last 2 s) or their front is fighting near the camera centre: then the minimap base
        // flashes gold and the banner still drops. Reduce motion: no pan and no push, the flash only.
        const push = { x: at.x, y: at.y, zoom: a.zoom, inMs: a.inMs, holdMs: a.holdMs, outMs: a.outMs };
        if (a.at.k === 'base') {
          const framed = !this.settings.reduceMotion && !this.frontBusy() && this.camera.frameMoment(at.x, push);
          if (!framed || !this.camera.inView(at.x, -40)) this.evolveFlashAt[a.at.side] = this.nowMs;
          return;
        }
        if (this.settings.reduceMotion) return;
        this.camera.pushTo(push);
        return;
      }
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
        if (a.op === 'hit') {
          b.view.hit();
          b.dressing?.hit();
        } else {
          b.view.collapse();
          b.dressing?.collapse();
        }
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
        b.dressing?.setAge(a.age, a.ms);
        b.mountsLocal = b.view.mountPoints();
        return;
      }
      case 'baseAscend':
        (this.bases[a.side].view as Partial<UpgradeBaseView>).ascend?.(a.ms);
        return;
      case 'baseMount':
        (this.bases[a.side].view as Partial<UpgradeBaseView>).mountBuilt?.(a.mount);
        return;
      case 'backdropWipe':
        this.backdrop.wipe(a.side, a.age, a.ms);
        return;
      case 'telegraph':
        this.trackZone(a);
        this.zones.telegraph(a.x, a.zone, teamColor(this.settings.teamPreset, a.side), a.ms);
        // The art's decoration sizes itself by `zone` and loops for `durationMs` (WP4 recipe options).
        if (a.zone > 0) this.particles.emit('fx.telegraph_zone', 1, 3, { x: a.x, y: 0 }, { opts: { zone: a.zone, side: a.side, durationMs: a.ms } });
        return;
      case 'phase':
        if (a.phase === 'overdrive') this.addScreenFx('fx.overdrive_frame');
        if (a.phase === 'siege') this.addScreenFx('fx.siege_vignette');
        return;
      case 'view':
        if (a.ev.t === 'emote' && a.ev.side !== this.mySide && this.emotesMuted()) return;
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
    const fx = this.art.createEffect(effectId, { width: L.width, height: L.height });
    this.playScreenFx(fx);
    this.layers.screenFx.addChild(fx.root);
    this.screenFx.push(fx);
  }

  /**
   * (Re)starts a screen-space effect over the whole canvas: placed by its top-left corner and fitted by
   * `width` / `height` in CSS px (the art's screen-effect convention, WP4 `screenFit` recipes).
   */
  private playScreenFx(fx: EffectView): void {
    const L = this.camera.layout;
    fx.playAt({ x: 0, y: 0 }, { width: L.width, height: L.height });
  }

  /** Keeps particles on unit `id` (offset kept from where they were emitted) until they end or it dies. */
  private follow(handles: readonly ParticleHandle[], id: number, part: Follower['part'], at: Pt): void {
    for (const h of handles) this.followers.push({ h, id, part, dx: h.view.root.x - at.x, dy: h.view.root.y - at.y });
  }

  private updateFollowers(): void {
    if (this.followers.length === 0) return;
    this.followers = this.followers.filter((f) => {
      if (!this.particles.isLive(f.h)) return false;
      const e = this.units.get(f.id);
      if (!e || e.dying) {
        // No effect outlasts its meaning (A12 checklist 10): a status ends with its unit.
        this.particles.stop(f.h);
        return false;
      }
      const p = this.anchor({ k: 'unit', id: f.id, part: f.part });
      f.h.view.root.position.set(p.x + f.dx, p.y + f.dy);
      return true;
    });
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
      // A white glow around the whole figure: centred on the hit centre, sized by the figure's height.
      const radius = auraRadius(view);
      const aura = this.art.createEffect('fx.legendary_aura', { radius, side });
      e.aura = aura;
      this.placeAura(e);
      aura.playAt({ x: aura.root.x, y: aura.root.y }, { radius, side });
      this.layers.units.addChild(aura.root);
    }
    this.units.set(id, e);
    this.writePose(e);
    return e;
  }

  private placeAura(e: UnitEntry): void {
    if (!e.aura) return;
    const c = e.view.anchors.hitCenter;
    e.aura.root.position.set(e.x + c.x * facingOf(e.side), e.y + c.y);
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
        this.placeAura(e);
        e.aura.root.zIndex = e.view.root.zIndex - 1;
        e.aura.update(gameDt);
        if (e.aura.done) {
          e.aura.playAt({ x: e.aura.root.x, y: e.aura.root.y }, { radius: auraRadius(e.view), side: e.side });
          this.placeAura(e);
        }
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
    // In a crowd only the bars that matter show (audit #18): each side's front units, and any unit
    // hit a moment ago (its ghost is still up). Small fights show every damaged bar.
    const front = this.frontIds(BAR_FRONT_UNITS);
    const crowd = this.units.size > BAR_CROWD_UNITS;
    const draws: BarDraw[] = [];
    for (const e of this.units.values()) {
      if (e.dying || !e.bar.shown || !e.view.root.visible) continue;
      const recent = e.bar.holdMs > 0 || e.bar.ghostBp > e.bar.hpBp || e.shieldBp > 0;
      if (crowd && !recent && !front.has(e.id)) continue;
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

  /** Ids of the `n` frontmost ground units of each side. */
  private frontIds(n: number): Set<number> {
    const bySide: [UnitEntry[], UnitEntry[]] = [[], []];
    for (const e of this.units.values()) if (!e.dying && !e.air) bySide[e.side].push(e);
    const out = new Set<number>();
    bySide[0].sort((a, b) => b.x - a.x);
    bySide[1].sort((a, b) => a.x - b.x);
    for (const list of bySide) for (const e of list.slice(0, n)) out.add(e.id);
    return out;
  }

  private drawShadows(): void {
    const g = this.shadows;
    g.clear();
    if (!g.visible) return;
    for (const e of this.units.values()) {
      if (!e.view.root.visible) continue;
      const a = e.dying ? 0.2 * Math.min(1, e.dieLeftMs / 300) : 0.24;
      const w = e.sizeLu * 0.62 + 6;
      if (e.air) {
        g.ellipse(e.x, 4, w * 0.7, 4).fill({ color: 0x000000, alpha: a * 0.5 });
        continue;
      }
      // A team-coloured ground disc under every unit, so the two armies read apart in a crowd.
      const team = teamColor(this.settings.teamPreset, e.side);
      const fade = e.dying ? Math.min(1, e.dieLeftMs / 300) : 1;
      g.ellipse(e.x, e.y + 1, w * 1.08, 7).fill({ color: team, alpha: 0.34 * fade });
      g.ellipse(e.x, e.y + 1, w * 1.08, 7).stroke({ color: team, width: 1.6, alpha: 0.7 * fade });
      g.ellipse(e.x, e.y + 1, w * 0.8, 4.5).fill({ color: 0x000000, alpha: a });
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
    // A base skin targets one age (`base.future@crystal_spire`, A5.8); the provider draws it on that
    // age only, so pass it whatever age the match starts in (it shows after the evolve).
    const skins = this.config.sides[side].skins;
    const skin = skins[`base.${age}`] ?? Object.entries(skins).find(([target]) => target.startsWith('base.'))?.[1];
    const view = this.art.createBase({ age, ...(skin ? { skin } : {}), side, teamPreset: this.settings.teamPreset });
    // The art contract (WP4 base views): the root sits on the gate at ground level and the art
    // mirrors itself for side 1; `mountPoints()` are already in the root's parent (world) space.
    // Mirroring the root here as well flipped side 1 back and pushed side 0 half off screen.
    view.root.position.set(gateX(side), 0);
    this.layers.structures.addChild(view.root);
    withMotion(view, this.viewMotion());
    const s = this.sim.state.sides[side];
    const crumble = crumbleStage(s.baseHp, s.baseMaxHp);
    if (crumble > 0) view.setCrumble(crumble);
    if (s.treasury > 0) view.setTreasury(s.treasury);
    const glow = s.lastStand === 'armed' || s.lastStand === 'charging';
    if (glow) view.lastStandGlow(true);
    // A18.9.4: the side's flags, decorations and base skin, attached to the base (both sides see them)
    const look = this.config.sides[side].look;
    const dressing = look ? this.art.createBaseDressing?.({ age, side, look, teamPreset: this.settings.teamPreset, base: view }) : undefined;
    if (dressing) withMotion(dressing, this.viewMotion());
    return { side, view, age, crumble, treasury: s.treasury, glow, flashLeftMs: 0, mountsLocal: view.mountPoints(), ...(dressing ? { dressing } : {}) };
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
        const f = this.flashFilter();
        if (f) b.view.root.filters = b.flashLeftMs > 0 ? [f] : [];
      }
      b.view.update(gameDt);
      b.dressing?.update(gameDt);
    }
  }

  /** The brightening filter for base flashes, or null where filters are unavailable (tests). */
  private flashFilter(): ColorMatrixFilter | null {
    if (this.baseFlashFilter === undefined) {
      try {
        const f = new ColorMatrixFilter();
        f.brightness(1.9, false);
        this.baseFlashFilter = f;
      } catch {
        this.baseFlashFilter = null;
      }
    }
    return this.baseFlashFilter;
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
        // the new turret grows out of the old one's light (A2.8 Modernise); plain build otherwise
        const up = e.view as Partial<UpgradeTurretView>;
        if (prev && prev.card !== a.card && up.modernisedIn) up.modernisedIn();
        else e.view.play('build');
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
    withMotion(view, this.viewMotion());
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
          const outdated = side === this.mySide && (this.config.content.ages[t.age]?.index ?? 0) < (this.config.content.ages[this.ages[s.ageIndex] ?? 'stone']?.index ?? 0);
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
    // No markers on the title backdrop (the battle waits behind Play) or after the end.
    if (this.ended || !this.started) {
      this.markers.update(realDt, scale, null);
      return;
    }
    this.markers.update(realDt, scale, {
      gold: Math.floor(s.gold / 1000),
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

/** Optional motion hooks of the world views (WP4 atlas views; the art contract stays unchanged). */
interface ViewMotion {
  reduce: boolean;
  lite: boolean;
}
interface UpgradeBaseView {
  ascend(ms: number): void;
  mountBuilt(mount: number): void;
}
interface UpgradeTurretView {
  modernisedIn(): void;
}

function withMotion(view: object, m: ViewMotion): void {
  (view as { setMotion?: (m: ViewMotion) => void }).setMotion?.(m);
}
