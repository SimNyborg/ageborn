/**
 * Home's live island (owner request 2026-10-16, queue item 37; ui-plan 2.3, MR-112): the troops standing on
 * the island play their real battle clips and the flags wave with the lane's cloth, on a small transparent
 * Pixi layer over the island's SVG (which keeps the island, its landmark and its ambient life).
 *
 * - **The battle's art and feel.** Troops come from the injected `ArtProvider` exactly as in a match (the
 *   atlas views keep their idle breathing, gait-locked walk, attack variants, hit squash and cheer hop). The
 *   choreography (`homeScript.ts`) turns into the `SimEvent` shapes a battle emits and runs through the
 *   battle's `EventMapper`, so sparks, hit-stop and flinches follow `feel.config.json`. The flags are the
 *   lane's dressing (`createBaseDressing`: the cloth mesh rippling from the hoist).
 * - **Calm and silent.** A menu scene, not a fight: long calm stretches between occasional exchanges, at most
 *   one hit flash per exchange, and no sound at all (orchestrator decision 2026-10-18, review M N1).
 * - **Presentation only.** No sim runs; the stage clock is its own; nothing feeds back into play.
 * - **Lazy and light.** The stage leases its troops' sheets first (`showcaseLease`, the HD copy only where
 *   the island draws them large enough) and goes live once they load; until then, and for good if they
 *   never do, the UI keeps its still island (drawn to the same size and place: the stage reports each
 *   troop's drawn idle box, `onBoxes`). A cold start of the shared Pixi app (one long task) waits until the
 *   player has left the screen alone for a moment and no search or launch is under way (`hold`). It draws on
 *   the menus' shared app (`SharedApp`, the Customize previews' WebGL context), only while visible, at most
 *   60 fps (30 on Lite, and on Auto once frames run long, as the battle's Auto does). Troops that may come
 *   next (the ranked opponent's while the search runs) preload their sheets and stand by off stage, already
 *   on the GPU, so they step in on the found beat without a stall.
 * - **Lost context.** When the shared context is lost (iOS drops a background tab's; a page hide lets it go)
 *   the stage stops and tells the UI (`onLive(false)`), which shows the still island; it draws again once
 *   the context is back.
 * - **Released.** `destroy` drops every view and the lease (a sheet only the island wanted unloads a few
 *   seconds later); `destroy({ now: true })` (leaving for a match) also lets the shared app and its context
 *   go at once.
 *
 * Coordinates: the island picture's own units (its SVG view box) map onto the host box; a troop's spot and a
 * pole's foot come in those units and the world is in lu (x toward the opponent, y down, 0 on the front line).
 */
import { Container, Graphics } from 'pixi.js';
import type { ArtProvider, BaseDressingView, CardId, ClipName, CompiledContent, CosmeticKey, EffectView, Pt, Side, SimEvent, SkinId, TeamPreset, UnitPose, UnitView, VisualId } from '@/contracts';
import { mulberry32 } from '@/core';
import { aimedPath, attackAt, type ShotPath } from '../aim';
import { EventMapper, type UnitInfo } from '../eventMapper';
import { defaultFeelConfig, type RenderFeelConfig } from '../feelConfig';
import { ParticlePool, type ParticleHandle } from '../feel/particlePool';
import { walkDurationForSpeed } from '../gait';
import { AutoPresetMonitor } from '../presets';
import type { Anchor, ViewAction } from '../types';
import type { DioramaApp, SharedApp, SharedAppUser } from './diorama';
import { HOME_IDS, homeCycle, type HomeActor, type HomeBeat, type HomeCycle } from './homeScript';
import { whenQuiet } from './inputQuiet';
import { troopPlan, type TroopPlan } from './script';

// ---------------------------------------------------------------------------------------------
// The request (the UI mirrors these shapes in `ui/screens/home/homeStage.ts`)

/** A troop on the island: its side, row (0 front), card and skin, and its spot in island units. */
export interface HomeStageTroop {
  side: Side;
  slot: 0 | 1;
  card: CardId;
  skin?: SkinId | null;
  x: number;
  y: number;
}

/** A flag pole: its foot and height in island units and the flags it flies (none: a plain banner). */
export interface HomeStagePole {
  side: Side;
  x: number;
  y: number;
  height: number;
  baseFlag: CosmeticKey | null;
  nationalFlag: CosmeticKey | null;
  /** The plain banner in grey instead of the team colour (an opponent not found yet). */
  grey?: boolean;
}

/**
 * How far a troop's drawn idle pose reaches from its feet (lu on the island, at its drawn size), over every
 * frame of its idle clip: toward the opponent, behind and above. The UI's still island draws its troops'
 * idle strips (the same frames, fitted to that box) at exactly the live size and place.
 */
export interface HomeTroopBox {
  card: CardId;
  /** The troop's skin: a skin may be drawn another way (a skin without its own sheet is the puppet) and size. */
  skin?: SkinId | null;
  front: number;
  back: number;
  top: number;
}

export interface HomeStageRequest {
  troops: readonly HomeStageTroop[];
  poles: readonly HomeStagePole[];
  /** The island picture: its size in its own units, where its lane's middle and front line are, and its units per lu. */
  island: { width: number; height: number; center: number; ground: number; unitsPerLu: number };
  teamPreset: TeamPreset;
  lite: boolean;
  /** Graphics on Auto: the stage takes Lite's pace once frames run long (the battle's Auto rule). */
  auto?: boolean;
  /** The choreography's seed (the same island plays the same way). */
  seed: number;
  /**
   * Troops that may come next (the ranked opponent's while the search runs): their sheets load in the
   * background and their views stand by off stage (already on the GPU), so they step in at once.
   */
  preload?: readonly { card: CardId; skin?: SkinId | null }[];
  /** A ranked search or a launch is under way: a cold start of the shared app waits until it is over. */
  hold?: boolean;
  /** The live layer started drawing (true) or stopped for a while (false: a lost context; show the still). */
  onLive?: (live: boolean) => void;
  /** The troops' drawn idle boxes, whenever the cast on stage changes. */
  onBoxes?: (boxes: readonly HomeTroopBox[]) => void;
}

export interface HomeStageHandle {
  /** Resolves true once the live island draws, false when it cannot (no WebGL, no art): keep the still. */
  readonly ready: Promise<boolean>;
  /** Applies changed troops, flags, team preset, quality, hold or callbacks. */
  update(patch: Partial<HomeStageRequest>): void;
  /** Stops drawing while hidden (off screen, tab hidden, a sheet over Home); resumes where it was. */
  setVisible(on: boolean): void;
  /** Drops the views and the lease; `now` also lets the shared app go at once (a match starts). */
  destroy(o?: { now?: boolean }): void;
}

export type HomeStageMount = (host: HTMLElement, req: HomeStageRequest) => HomeStageHandle;

// ---------------------------------------------------------------------------------------------
// Seams (tests pass fakes)

export interface HomeStageDeps {
  art: ArtProvider;
  shared: SharedApp;
  /** The compiled content (the troops' cards and attacks). */
  content: CompiledContent;
  feel?: RenderFeelConfig;
  /** Frame scheduling (tests drive `step` themselves and pass a no-op). */
  frames?: { request(cb: (now: number) => void): number; cancel(h: number): void };
  /** Longest wait for the troops' sheets before the stage gives up and the still stays, ms. */
  loadTimeoutMs?: number;
  /** The screen's pixel ratio (tests). */
  dpr?: number;
  /** How long the player must leave the page alone before a cold start of the shared app, ms (tests: 0). */
  quietMs?: number;
  /**
   * Keeps a leaving island's sheets (and their decoded copies) for a return within the shared app's linger
   * (`menuStages`): a return to Home then leases them at once instead of decoding them again. `now` (a match
   * starts) lets go of whatever it keeps.
   */
  keepLease?: (lease: { release(): void } | null, o: { now: boolean }) => void;
}

/** Optional art-provider extras (duck-typed, `visuals` provides them). */
interface LeasingArt {
  showcaseLease?(o: { visuals: readonly { visualId: VisualId; skin?: string | null }[]; hd?: boolean }): { ready: Promise<void>; hd: boolean; release(): void };
}

/** Optional unit-view extras (the atlas tier's duck-typed hooks, as the card showcase uses them). */
interface IslandView extends UnitView {
  setGait?(o: { speedLuPerS: number }): void;
  setIdentity?(o: { id: number; seed: number }): void;
  setMotion?(m: { reduce: boolean; lite: boolean }): void;
  playAlt?(o: { impactAtMs?: number }): void;
  muzzleNow?(attackIndex?: number): Pt | null;
  motionInfo?(): { attacks: string[]; alt: boolean; naturalSpeedLuPerS: number | null };
  setGroundMarks?(on: boolean): void;
  extentLu?(o?: { clips?: readonly string[] }): { front: number; back: number; top: number } | null;
}

/** The lane dressing's duck-typed extras (`visuals/cosmetics/dressing.ts`). */
interface IslandDressing extends BaseDressingView {
  poleAnchor?(): { x: number; top: number } | null;
}

// ---------------------------------------------------------------------------------------------
// Tuning

/** Device px per lu above which the HD sheets are worth leasing (the atlas tier's threshold). */
const HD_PX_PER_LU = 1.3;
/** A troop is drawn at most this tall (lu): a mammoth or a tank keeps its weight without towering over the island. */
const MAX_TROOP_LU = 96;
/** Flyers hover this high over their spot on the island (lu; the lane's height compressed; the UI's still mirrors it). */
export const ISLAND_ALTITUDE = 42;
/** One-shot clip holds (ms), as the battle view's. */
const ONE_SHOT = { spawn: 260, hit: 160, ability: 650, victory: 900, attackRecover: 220 } as const;
const FADE_MS = 260;
const MAX_DT = 100;
const PARTICLE_CAP = { high: 160, lite: 60 } as const;
const LOAD_TIMEOUT_MS = 12_000;
/** A later change (a deck switch, the opponent found) waits at most this long for its sheets. */
const SWAP_TIMEOUT_MS = 6_000;
/** A cold start of the shared app waits until the player has left the page alone this long (review M S7). */
const QUIET_MS = 1200;
/** The lane pole's height (lu) when the dressing cannot say (`DRESSING_ANCHORS.poleTop`). */
const LANE_POLE_LU = 176;
const GREY = 0x7a8294;

const facingOf = (side: Side): 1 | -1 => (side === 0 ? 1 : -1);

interface Actor {
  id: number;
  side: Side;
  slot: 0 | 1;
  card: CardId;
  skin: SkinId | null;
  preset: TeamPreset;
  view: IslandView;
  plan: TroopPlan;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  /** Drawn size factor (big units are kept at most `MAX_TROOP_LU` tall). */
  scale: number;
  air: boolean;
  front: number;
  natural: number | null;
  walk: { toX: number; speed: number } | null;
  gaitV: number;
  loop: 'idle' | 'walk' | null;
  oneShotMs: number;
  fadeInMs: number;
  vanishMs: number;
  pose: UnitPose;
  variant: string | null;
}

interface Pole {
  key: string;
  view: IslandDressing;
}

/**
 * How far a troop's view reaches when it cannot say over its idle clip (`extentLu` is the atlas tier's; a
 * skin without its own sheet is drawn as the puppet): its drawn bounds now, as the card showcase measures them.
 */
function drawnBox(a: Actor): { front: number; back: number; top: number } | null {
  const b = a.view.root.getLocalBounds();
  if (!(b.width > 0) || !(b.height > 0)) return null;
  const top = -b.minY;
  return facingOf(a.side) > 0 ? { front: b.maxX, back: -b.minX, top } : { front: -b.minX, back: b.maxX, top };
}

const troopKey = (t: HomeStageTroop): string => `${t.side}${t.slot}|${t.card}|${t.skin ?? ''}`;
const poleKey = (p: HomeStagePole): string => `${p.side}|${p.x}|${p.y}|${p.height}|${p.baseFlag ?? ''}|${p.nationalFlag ?? ''}|${p.grey ? 1 : 0}`;

export class HomeStage implements HomeStageHandle, SharedAppUser {
  readonly ready: Promise<boolean>;
  private resolveReady: (ok: boolean) => void = () => {};
  private req: HomeStageRequest;
  private readonly art: ArtProvider;
  private readonly content: CompiledContent;
  private readonly feel: RenderFeelConfig;
  private app: DioramaApp | null = null;
  private lease: { release(): void } | null = null;
  /** A lease whose sheets are still on their way (released at once if the stage goes meanwhile). */
  private pendingLease: { release(): void } | null = null;
  /** The sheets of the troops that may come next (`preload`), loading in the background. */
  private preloadLease: { release(): void } | null = null;
  private preloadSig = '';
  private preloadReady = false;
  /** The preload's views, built off stage once their sheets are in and sent to the GPU (`${side}|${card}|${skin}`). */
  private readonly standby = new Map<string, IslandView[]>();
  /** The preload went while a troop change was still loading: its unused stand-bys go after that change. */
  private standbyStale = false;
  private standbyGen = 0;
  private hd = false;
  private destroyed = false;
  private live = false;
  /** The shared context is lost: nothing draws until it is back. */
  private lost = false;
  private visible = true;
  private frameHandle = 0;
  private lastFrame = -1;
  private observers: { disconnect(): void }[] = [];
  private width = 0;
  private height = 0;
  private gen = 0;
  private builtTroops = '';
  /** Graphics Auto: the battle's frame-time monitor; Lite's pace and particle cap once it trips. */
  private monitor: AutoPresetMonitor | null = null;
  private slow = false;

  // scene
  private readonly world = new Container();
  private readonly scene = new Container();
  private readonly ground = new Graphics();
  private readonly shots = new Container();
  private readonly fx = new Container();
  private particles: ParticlePool | null = null;
  private mapper: EventMapper | null = null;
  private readonly rng = mulberry32(0x40e5);
  private readonly actors = new Map<number, Actor>();
  private readonly leaving: Actor[] = [];
  private poles: Pole[] = [];
  private flying: EffectView[] = [];
  private followers: { handles: ParticleHandle[]; id: number; part: 'feet' | 'hit' | 'head' }[] = [];

  // the choreography
  private cycle: HomeCycle | null = null;
  private cycleN = 0;
  private cycleT = 0;
  private beatIndex = 0;
  private clockMs = 0;
  private freezeMs = 0;
  private pid = 1;
  /** Per-frame cost of step and render (ms), the last 240 frames (the dev overlay and the perf check). */
  private readonly costs: number[] = [];

  constructor(
    private readonly host: HTMLElement,
    req: HomeStageRequest,
    private readonly deps: HomeStageDeps,
  ) {
    this.req = req;
    this.art = deps.art;
    this.content = deps.content;
    this.feel = deps.feel ?? defaultFeelConfig;
    this.ready = new Promise<boolean>((r) => (this.resolveReady = r));
    this.world.label = 'home';
    this.scene.sortableChildren = true;
    this.world.addChild(this.ground, this.scene, this.shots, this.fx);
    this.monitor = req.auto ? new AutoPresetMonitor('auto', false) : null;
    void this.start().catch((e: unknown) => {
      // a stage that cannot start never breaks Home: the still island stays (review M N9)
      if (typeof console !== 'undefined') console.warn('home island did not start', e);
      this.destroy();
    });
  }

  // ---- HomeStageHandle ------------------------------------------------------------------------

  update(patch: Partial<HomeStageRequest>): void {
    if (this.destroyed) return;
    const prev = this.req;
    this.req = { ...this.req, ...patch };
    if (patch.auto !== undefined && patch.auto !== prev.auto) this.monitor = patch.auto && !this.slow ? new AutoPresetMonitor('auto', false) : null;
    if (this.live) {
      if (patch.lite !== undefined && patch.lite !== prev.lite) this.applyQuality();
      if (patch.poles || (patch.teamPreset !== undefined && patch.teamPreset !== prev.teamPreset) || patch.island) this.syncPoles();
      // a deck switch, the opponent found, the team colours, or the spots moved (review M N3, N4)
      if (patch.troops || (patch.teamPreset !== undefined && patch.teamPreset !== prev.teamPreset) || patch.island) void this.syncTroops();
      this.place();
    }
    // after the troops' own lease, so a sheet moving from the preload onto the island is never let go between
    if ('preload' in patch) this.syncPreload();
  }

  setVisible(on: boolean): void {
    if (this.destroyed || this.visible === on) return;
    this.visible = on;
    this.schedule();
  }

  destroy(o: { now?: boolean } = {}): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.live = false;
    if (this.frameHandle) this.frames().cancel(this.frameHandle);
    this.frameHandle = 0;
    for (const ob of this.observers) ob.disconnect();
    this.observers = [];
    for (const a of [...this.actors.values(), ...this.leaving]) this.dropActor(a);
    this.actors.clear();
    this.leaving.length = 0;
    this.dropStandby(() => true);
    for (const p of this.poles) p.view.destroy();
    this.poles = [];
    for (const f of this.flying) f.destroy();
    this.flying = [];
    this.particles?.destroy();
    this.particles = null;
    if (this.app && this.world.parent === this.app.stage) this.app.stage.removeChild(this.world);
    this.world.destroy({ children: true });
    this.app = null;
    const wasWarm = this.deps.shared.alive && !this.deps.shared.lost;
    this.deps.shared.release(this, { now: o.now === true });
    // a return to Home within the app's linger finds the sheets still in (never into a match)
    if (this.deps.keepLease && wasWarm && o.now !== true) this.deps.keepLease(this.lease, { now: false });
    else {
      this.deps.keepLease?.(null, { now: o.now === true });
      this.lease?.release();
    }
    this.lease = null;
    this.pendingLease?.release();
    this.pendingLease = null;
    this.preloadLease?.release();
    this.preloadLease = null;
    this.resolveReady(false);
  }

  // ---- the shared app ---------------------------------------------------------------------------

  yieldApp(): void {
    if (this.app && this.world.parent === this.app.stage) this.app.stage.removeChild(this.world);
    if (this.frameHandle) this.frames().cancel(this.frameHandle);
    this.frameHandle = 0;
    this.lastFrame = -1;
  }

  reclaimApp(): void {
    if (this.destroyed || !this.app || !this.live) return;
    this.takeApp();
    this.schedule();
    this.render();
  }

  contextLost(): void {
    if (this.destroyed || this.lost) return;
    this.lost = true;
    if (this.frameHandle) this.frames().cancel(this.frameHandle);
    this.frameHandle = 0;
    this.lastFrame = -1;
    // the UI shows the still island meanwhile (review M S6)
    if (this.live) this.tell(false);
  }

  contextRestored(): void {
    if (this.destroyed || !this.lost) return;
    this.lost = false;
    if (!this.live) return;
    this.render();
    this.schedule();
    this.tell(true);
  }

  private owns(): boolean {
    return this.deps.shared.owner() === this;
  }

  private takeApp(): void {
    const app = this.app;
    if (!app) return;
    app.stage.removeChildren();
    app.stage.addChild(this.world);
    app.attach(this.host, 'home-stage-canvas');
    app.resize(this.width, this.height);
  }

  private tell(on: boolean): void {
    try {
      this.req.onLive?.(on);
    } catch {
      // the UI's hook never breaks the island
    }
  }

  // ---- setup ------------------------------------------------------------------------------------

  private frames(): NonNullable<HomeStageDeps['frames']> {
    return this.deps.frames ?? { request: (cb) => requestAnimationFrame(cb), cancel: (h) => cancelAnimationFrame(h) };
  }

  /**
   * The host's layout box (never its transformed rect: the island's entrance scales it, and a size taken
   * mid-entrance would re-allocate the canvas twice, about 0.3 s each on a software GPU).
   */
  private measure(): void {
    const r = this.host.clientWidth > 0 ? null : this.host.getBoundingClientRect?.();
    this.width = Math.max(1, Math.round(this.host.clientWidth || r?.width || 343));
    this.height = Math.max(1, Math.round(this.host.clientHeight || r?.height || 194));
  }

  /** CSS px per island unit, from the host box (it has the island picture's aspect ratio). */
  private ppu(): number {
    return this.width / Math.max(1, this.req.island.width);
  }

  /** CSS px per lu on the island. */
  private pxPerLu(): number {
    return this.ppu() * this.req.island.unitsPerLu;
  }

  private toWorld(x: number, y: number): { x: number; y: number } {
    const i = this.req.island;
    return { x: (x - i.center) / i.unitsPerLu, y: (y - i.ground) / i.unitsPerLu };
  }

  private async start(): Promise<void> {
    this.measure();
    this.syncPreload();
    // the cast this first lease loads is the one that gets built (a change meanwhile follows once live, review M S4)
    const cast = this.req.troops;
    const first = await this.leaseTroops(true, cast);
    if (this.destroyed) return;
    if (!first) {
      this.destroy();
      return;
    }
    // a cold start of the shared app is one long task (WebGL start-up): never under the player's taps, nor
    // while a search or a launch runs (review M S7); a warm app (a return within its linger) starts at once
    if (!this.deps.shared.alive) {
      const ok = await whenQuiet(this.deps.quietMs ?? QUIET_MS, { held: () => this.req.hold === true, cancelled: () => this.destroyed });
      if (!ok || this.destroyed) return;
    }
    const warm = this.deps.shared.alive;
    const app = await this.deps.shared.acquire(this, { width: this.width, height: this.height });
    if (this.destroyed) return;
    if (!app) {
      this.destroy();
      return;
    }
    this.app = app;
    this.lost = this.deps.shared.lost;
    this.particles = new ParticlePool(this.art, this.fx, this.liteNow() ? PARTICLE_CAP.lite : PARTICLE_CAP.high, this.rng);
    this.mapper = new EventMapper({ content: this.content, feel: this.feel, mySide: 0, rng: mulberry32(0x40e6) });
    this.buildTroops(false, cast);
    this.syncPoles();
    this.observe();
    this.live = true;
    if (this.owns()) this.takeApp();
    this.place();
    // a warm app already holds these sheets on its GPU (a return within its linger): no staged upload
    if (!warm) await this.warmUp();
    if (this.destroyed) return;
    this.step(0);
    this.resolveReady(true);
    // the context went while the stage started: the still shows until it is back
    if (this.lost) this.tell(false);
    this.schedule();
    this.reportBoxes();
    // a change that came in while the first troops loaded (other troops, or the same ones moved)
    if (this.troopSig() !== this.builtTroops) void this.syncTroops();
    else this.respot();
    void this.prepareStandby();
  }

  /**
   * Draws the island one piece at a time (a pole, a troop), each in its own task, before it shows: the
   * first draw uploads each piece's sheet to the GPU, and all of them in one frame was one long stall
   * (about 1.8 s with a 4x slower CPU and a software GPU). The layer is still hidden meanwhile.
   */
  private async warmUp(): Promise<void> {
    const parts = [...this.poles.map((p) => p.view.root), ...[...this.actors.values()].map((a) => a.view.root)];
    for (const p of parts) p.visible = false;
    for (const p of parts) {
      if (this.destroyed) return;
      p.visible = true;
      this.render();
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  private sigOf(list: readonly HomeStageTroop[]): string {
    return `${this.req.teamPreset}#${list.map(troopKey).join(',')}`;
  }

  private troopSig(): string {
    return this.sigOf(this.req.troops);
  }

  /**
   * Leases the sheets `list` draws (the latest call wins). The first lease gives up after the load timeout
   * (false: the still stays); a later one swaps in what has loaded after a shorter wait.
   */
  private async leaseTroops(first: boolean, list: readonly HomeStageTroop[]): Promise<boolean> {
    const g = ++this.gen;
    const leaser = this.art as ArtProvider & LeasingArt;
    if (!leaser.showcaseLease) return true;
    const l = leaser.showcaseLease({ visuals: this.visualsOf(list), hd: this.wantHd() });
    // a newer lease supersedes one still on its way
    this.pendingLease?.release();
    this.pendingLease = l;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<'late'>((r) => {
      timer = setTimeout(() => r('late'), first ? (this.deps.loadTimeoutMs ?? LOAD_TIMEOUT_MS) : SWAP_TIMEOUT_MS);
    });
    const r = await Promise.race([l.ready.then(() => 'ok' as const), late]);
    clearTimeout(timer);
    // released meanwhile (the stage went, or a newer lease took over): nothing more to do
    if (this.pendingLease !== l) return false;
    this.pendingLease = null;
    if (this.destroyed || g !== this.gen || (r === 'late' && first)) {
      l.release();
      return false;
    }
    this.lease?.release();
    this.lease = l;
    this.hd = l.hd;
    return true;
  }

  /** The HD copy only where the island draws troops large enough to show it (a desktop island at DPR 2). */
  private wantHd(): boolean {
    const dpr = Math.min(2, this.deps.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
    return !this.req.lite && this.pxPerLu() * dpr > HD_PX_PER_LU;
  }

  private visualsOf(list: readonly { card: CardId; skin?: SkinId | null }[]): { visualId: VisualId; skin: string | null }[] {
    const out: { visualId: VisualId; skin: string | null }[] = [];
    for (const t of list) {
      const def = this.content.units[t.card];
      if (def) out.push({ visualId: def.visualId, skin: t.skin ?? null });
    }
    return out;
  }

  /**
   * Keeps the sheets of the troops that may come next (`preload`) loading in the background, and their views
   * standing by off stage once they are in: when they join (the opponent found), their lease is ready at once
   * and the views only show (review M S10).
   */
  private syncPreload(): void {
    if (this.destroyed) return;
    const list = this.req.preload ?? [];
    const sig = list.map((t) => `${t.card}|${t.skin ?? ''}`).join(',');
    if (sig === this.preloadSig) return;
    this.preloadSig = sig;
    this.preloadReady = false;
    this.preloadLease?.release();
    this.preloadLease = null;
    // stand-bys the preload no longer names go; while a troop change is still loading they wait for it (they may join)
    if (this.pendingLease) this.standbyStale = true;
    else this.dropStandby((key) => !list.some((t) => key === this.standbyKey(1, t.card, t.skin ?? null)));
    const leaser = this.art as ArtProvider & LeasingArt;
    const visuals = this.visualsOf(list);
    if (!leaser.showcaseLease || visuals.length === 0) return;
    const l = leaser.showcaseLease({ visuals, hd: this.wantHd() });
    this.preloadLease = l;
    l.ready.then(
      () => {
        if (this.preloadLease !== l || this.destroyed) return;
        this.preloadReady = true;
        void this.prepareStandby();
      },
      // a sheet that fails here simply loads again when its troop comes
      () => undefined,
    );
  }

  private standbyKey(side: Side, card: CardId, skin: SkinId | null): string {
    return `${side}|${card}|${skin ?? ''}`;
  }

  /** Builds the preload's views off stage and sends their sheets to the GPU, one per task (live only). */
  private async prepareStandby(): Promise<void> {
    if (!this.live || !this.preloadReady || this.destroyed || this.lost) return;
    const g = ++this.standbyGen;
    const counts = new Map<string, number>();
    for (const t of this.req.preload ?? []) {
      const def = this.content.units[t.card];
      if (!def) continue;
      const key = this.standbyKey(1, t.card, t.skin ?? null);
      const want = (counts.get(key) ?? 0) + 1;
      counts.set(key, want);
      const have = this.standby.get(key) ?? [];
      if (have.length >= want) continue;
      const view = this.makeView(1, t.card, t.skin ?? null);
      have.push(view);
      this.standby.set(key, have);
      this.app?.upload?.(view.root);
      await new Promise<void>((r) => setTimeout(r, 0));
      if (this.destroyed || g !== this.standbyGen) return;
    }
  }

  /** Lets go of the stand-by views whose key `drop` names. */
  private dropStandby(drop: (key: string) => boolean): void {
    for (const [key, views] of [...this.standby]) {
      if (!drop(key)) continue;
      for (const v of views) v.destroy();
      this.standby.delete(key);
    }
  }

  private observe(): void {
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(() => {
      const w = this.width;
      const h = this.height;
      this.measure();
      if (w === this.width && h === this.height) return;
      if (this.owns()) this.app?.resize(this.width, this.height);
      this.place();
      this.render();
    });
    ro.observe(this.host);
    this.observers.push(ro);
  }

  // ---- quality ----------------------------------------------------------------------------------

  /** Lite's pace and particle cap: the Lite setting, or Auto once frames ran long. */
  private liteNow(): boolean {
    return this.req.lite || this.slow;
  }

  private applyQuality(): void {
    const lite = this.liteNow();
    if (this.particles) this.particles.cap = lite ? PARTICLE_CAP.lite : PARTICLE_CAP.high;
    for (const a of this.actors.values()) a.view.setMotion?.({ reduce: false, lite });
    for (const p of this.poles) p.view.setMotion({ reduce: false, lite });
  }

  // ---- troops -------------------------------------------------------------------------------------

  /** Brings the troops on stage in line with the request (new sheets leased first; moved spots at once). */
  private async syncTroops(): Promise<void> {
    const list = this.req.troops;
    const sig = this.sigOf(list);
    if (sig === this.builtTroops) {
      this.respot();
      return;
    }
    const ok = await this.leaseTroops(false, list);
    if (!ok || this.destroyed || this.troopSig() !== sig) return;
    this.buildTroops(true, list);
    this.reportBoxes();
  }

  /** The request's spots for the troops standing (the same troops, moved: an island patch, review M N4). */
  private respot(): void {
    let moved = false;
    for (const t of this.req.troops) {
      const id = (t.side === 0 ? HOME_IDS.me : HOME_IDS.foe)[t.slot];
      const a = id !== undefined ? this.actors.get(id) : undefined;
      if (!a) continue;
      const at = this.toWorld(t.x, t.y);
      const y = at.y + (a.air ? -ISLAND_ALTITUDE : 0);
      if (Math.abs(a.homeX - at.x) < 1e-6 && Math.abs(a.homeY - y) < 1e-6) continue;
      a.homeX = at.x;
      a.homeY = y;
      a.x = at.x;
      a.y = y;
      a.walk = null;
      moved = true;
    }
    // the choreography restarts from a calm gap on the new spots
    if (moved) this.cycle = null;
  }

  /** Creates, replaces or removes troops to match `list`; `swap`: arrivals pop in with the battle's spawn. */
  private buildTroops(swap: boolean, list: readonly HomeStageTroop[]): void {
    const want = new Map<number, HomeStageTroop>();
    for (const t of list) {
      const ids = t.side === 0 ? HOME_IDS.me : HOME_IDS.foe;
      const id = ids[t.slot];
      if (id !== undefined && this.content.units[t.card]) want.set(id, t);
    }
    for (const [id, a] of [...this.actors]) {
      const t = want.get(id);
      if (t && t.card === a.card && (t.skin ?? null) === a.skin && a.side === t.side && a.preset === this.req.teamPreset) {
        // same troop: only its spot may have moved
        const at = this.toWorld(t.x, t.y);
        a.homeX = at.x;
        a.homeY = at.y + (a.air ? -ISLAND_ALTITUDE : 0);
        continue;
      }
      // a troop that left: a dust poof and it fades
      this.actors.delete(id);
      a.vanishMs = 0;
      a.walk = null;
      this.leaving.push(a);
      if (swap) this.emitFx('fx.dust_poof', { x: a.x, y: a.y - 6 }, 2, 1, { spreadLu: 10 });
    }
    for (const [id, t] of want) {
      if (this.actors.has(id)) continue;
      this.spawnActor(id, t, swap);
    }
    this.builtTroops = this.sigOf(list);
    if (this.standbyStale) {
      this.standbyStale = false;
      const pre = this.req.preload ?? [];
      this.dropStandby((key) => !pre.some((t) => key === this.standbyKey(1, t.card, t.skin ?? null)));
    }
    // the choreography restarts from a calm gap with the new cast
    this.cycle = null;
  }

  /** A troop's view, as the battle makes it (its sheet already leased). */
  private makeView(side: Side, card: CardId, skin: SkinId | null): IslandView {
    const def = this.content.units[card]!;
    return this.art.createUnit({ visualId: def.visualId, ...(skin ? { skin } : {}), side, teamPreset: this.req.teamPreset, ...(this.hd ? { hd: true } : {}) } as Parameters<ArtProvider['createUnit']>[0]) as IslandView;
  }

  private spawnActor(id: number, t: HomeStageTroop, pop: boolean): void {
    const def = this.content.units[t.card]!;
    const skin = t.skin ?? null;
    // a stand-by view (the found opponent's) is already built and on the GPU: it only shows
    const key = this.standbyKey(t.side, t.card, skin);
    const waiting = this.standby.get(key);
    const view = waiting?.shift() ?? this.makeView(t.side, t.card, skin);
    if (waiting && waiting.length === 0) this.standby.delete(key);
    view.setIdentity?.({ id: id * 7919, seed: (Math.imul(id + 17, 2654435761) ^ this.req.seed) >>> 0 });
    view.setGroundMarks?.(false);
    view.setMotion?.({ reduce: false, lite: this.liteNow() });
    view.update(0);
    const info = view.motionInfo?.();
    const plan = troopPlan(this.content, def, info ? { attacks: info.attacks, alt: info.alt } : undefined);
    const heightLu = Math.max(20, -view.anchors.head.y);
    const scale = Math.min(1, MAX_TROOP_LU / heightLu);
    view.root.scale.set(scale);
    const air = plan.air;
    const at = this.toWorld(t.x, t.y);
    const ext = view.extentLu?.();
    const front = (ext ? ext.front : plan.sizeLu * 0.7) * scale;
    const homeY = at.y + (air ? -ISLAND_ALTITUDE : 0);
    const a: Actor = {
      id,
      side: t.side,
      slot: t.slot,
      card: t.card,
      skin,
      preset: this.req.teamPreset,
      view,
      plan,
      x: at.x,
      y: homeY,
      homeX: at.x,
      homeY,
      scale,
      air,
      front,
      natural: info?.naturalSpeedLuPerS !== null && info?.naturalSpeedLuPerS !== undefined ? info.naturalSpeedLuPerS * scale : null,
      walk: null,
      gaitV: 0,
      loop: null,
      oneShotMs: 0,
      // the first troops come with the layer's own cross-fade; a later arrival pops in (the spawn below)
      fadeInMs: -1,
      vanishMs: -1,
      pose: { x: at.x, y: homeY, facing: facingOf(t.side), hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: def.group ?? 'infantry' },
      variant: null,
    };
    this.scene.addChild(view.root);
    this.actors.set(id, a);
    if (pop) this.event({ e: 'unitSpawned', id, side: t.side, card: t.card, x: Math.round(at.x * 1000), summoned: false, level: 1 });
    this.writePose(a);
  }

  private dropActor(a: Actor): void {
    a.view.destroy();
  }

  /** The cast as the choreography sees it: every troop standing on the island. */
  private cast(): HomeActor[] {
    return [...this.actors.values()].map((a) => ({ id: a.id, side: a.side, slot: a.slot, card: a.card, plan: a.plan, homeX: a.homeX, homeY: a.homeY, front: a.front, naturalSpeed: a.natural, scale: a.scale }));
  }

  /** Tells the UI how far each troop's drawn idle pose reaches (its still island draws them the same, review M S3). */
  private reportBoxes(): void {
    const fn = this.req.onBoxes;
    if (!fn) return;
    const out: HomeTroopBox[] = [];
    for (const a of this.actors.values()) {
      const e = a.view.extentLu?.({ clips: ['idle'] }) ?? drawnBox(a);
      if (e) out.push({ card: a.card, ...(a.skin ? { skin: a.skin } : {}), front: e.front * a.scale, back: e.back * a.scale, top: e.top * a.scale });
    }
    if (out.length === 0) return;
    try {
      fn(out);
    } catch {
      // the UI's hook never breaks the island
    }
  }

  // ---- flags --------------------------------------------------------------------------------------

  /** The poles as the request wants them: the lane's dressing (its cloth flags), or a plain banner. */
  private syncPoles(): void {
    const want = this.req.poles.map((p) => ({ p, key: `${poleKey(p)}|${this.req.teamPreset}` }));
    const keep: Pole[] = [];
    for (const old of this.poles) {
      if (want.some((w) => w.key === old.key)) keep.push(old);
      else old.view.destroy();
    }
    this.poles = keep;
    const make = this.art.createBaseDressing?.bind(this.art);
    if (!make) return;
    for (const { p, key } of want) {
      if (this.poles.some((x) => x.key === key)) continue;
      const look = { baseFlag: p.baseFlag, nationalFlag: p.nationalFlag };
      // `banner` (duck-typed, dressing.ts): with no flags the pole flies a plain banner in this colour
      const extra = { banner: p.baseFlag || p.nationalFlag ? null : { color: p.grey ? GREY : null } };
      const view = make({ age: 'stone', side: p.side, look, teamPreset: this.req.teamPreset, ...extra } as Parameters<NonNullable<ArtProvider['createBaseDressing']>>[0]) as IslandDressing;
      view.setMotion({ reduce: false, lite: this.liteNow() });
      this.placePole(view, p);
      this.scene.addChild(view.root);
      this.poles.push({ key, view });
    }
  }

  private placePole(view: IslandDressing, p: HomeStagePole): void {
    const anchor = view.poleAnchor?.() ?? { x: 44 * facingOf(p.side), top: LANE_POLE_LU };
    const foot = this.toWorld(p.x, p.y);
    const s = p.height / this.req.island.unitsPerLu / Math.max(1, anchor.top);
    view.root.scale.set(s);
    view.root.position.set(foot.x - anchor.x * s, foot.y);
    // behind the troops on the front line (a pole stands further back on the lane)
    view.root.zIndex = Math.round(foot.y * 10) - 5;
  }

  // ---- frames -------------------------------------------------------------------------------------

  /** Advances the island by `dtMs` and draws (the frame loop calls it; tests call it directly). */
  step(dtMs: number): void {
    if (this.destroyed || !this.live || this.lost) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const dt = Math.max(0, Math.min(MAX_DT, dtMs));
    this.clockMs += dt;
    let gameDt = dt;
    if (this.freezeMs > 0) {
      // the battle's hit-stop holds the troops a beat; the wind in the flags never stops
      const used = Math.min(this.freezeMs, gameDt);
      this.freezeMs -= used;
      gameDt -= used;
    }
    if (gameDt > 0) this.runCycle(gameDt);
    this.updateActors(gameDt);
    for (const p of this.poles) p.view.update(dt);
    this.particles?.update(gameDt);
    this.updateFollowers();
    for (const f of this.flying) f.update(gameDt);
    if (this.flying.some((f) => f.done)) {
      for (const f of this.flying) if (f.done) f.destroy();
      this.flying = this.flying.filter((f) => !f.done);
    }
    this.drawGround();
    this.render();
    if (dtMs > 0 && typeof performance !== 'undefined') {
      this.costs.push(performance.now() - t0);
      if (this.costs.length > 240) this.costs.shift();
    }
  }

  private render(): void {
    if (this.live && !this.lost && this.owns()) this.app?.render();
  }

  /** Runs the frame loop while live, visible and on the shared canvas (60 fps at most, 30 on Lite and slow Auto). */
  private schedule(): void {
    if (this.destroyed || !this.live) return;
    if (!this.visible || !this.owns() || this.lost) {
      if (this.frameHandle) this.frames().cancel(this.frameHandle);
      this.frameHandle = 0;
      this.lastFrame = -1;
      return;
    }
    if (this.frameHandle) return;
    const tick = (now: number): void => {
      this.frameHandle = 0;
      if (this.destroyed || !this.visible || !this.owns() || this.lost) return;
      const dt = this.lastFrame < 0 ? 16 : now - this.lastFrame;
      if (dt >= (this.liteNow() ? 30 : 14) || this.lastFrame < 0) {
        if (this.lastFrame >= 0) this.watchFrames(dt);
        this.lastFrame = now;
        this.step(dt);
      }
      this.frameHandle = this.frames().request(tick);
    };
    this.frameHandle = this.frames().request(tick);
  }

  /** Graphics Auto: frames that run long for a while switch the island to Lite's pace (review M N2). */
  private watchFrames(dt: number): void {
    if (!this.monitor || this.slow) return;
    if (this.monitor.frame(dt)) {
      this.slow = true;
      this.monitor = null;
      this.applyQuality();
    }
  }

  /** Places the world on the host box: island units to px, the lane's middle and front line as its origin. */
  private place(): void {
    const ppu = this.ppu();
    const i = this.req.island;
    this.world.position.set(i.center * ppu, i.ground * ppu);
    this.world.scale.set(this.pxPerLu());
    for (const pole of this.poles) {
      const p = this.req.poles.find((x) => `${poleKey(x)}|${this.req.teamPreset}` === pole.key);
      if (p) this.placePole(pole.view, p);
    }
  }

  // ---- the choreography ---------------------------------------------------------------------------

  private runCycle(dt: number): void {
    if (!this.cycle) {
      this.cycle = homeCycle(this.cast(), this.req.seed, this.cycleN);
      this.cycleN += 1;
      this.cycleT = 0;
      this.beatIndex = 0;
    }
    this.cycleT += dt;
    const c = this.cycle;
    while (this.beatIndex < c.beats.length && c.beats[this.beatIndex]!.at <= this.cycleT) {
      const b = c.beats[this.beatIndex]!;
      this.beatIndex += 1;
      this.runBeat(b, c);
    }
    if (this.cycleT >= c.ms) this.cycle = null;
  }

  private runBeat(b: HomeBeat, c: HomeCycle): void {
    switch (b.k) {
      case 'walk': {
        const a = this.actors.get(b.id);
        if (a) a.walk = { toX: b.toX, speed: Math.abs(b.speed) };
        return;
      }
      case 'attack': {
        const a = this.actors.get(b.id);
        if (!a) return;
        if (b.variant) a.variant = b.variant;
        this.event({ e: 'attackStarted', id: b.id, targetId: b.target, windupTicks: Math.round(b.windupMs / 50), attackIndex: b.index });
        return;
      }
      case 'shot': {
        const target = this.actors.get(b.target);
        if (!target) return;
        this.event({ e: 'projectileFired', pid: this.pid++, from: b.from, targetId: b.target, toX: Math.round(target.x * 1000), travelTicks: Math.max(1, Math.round(b.travelMs / 50)), visualId: b.visualId }, { attackIndex: b.index, travelMs: b.travelMs });
        return;
      }
      case 'hit': {
        const target = this.actors.get(b.target);
        if (!target) return;
        // a light touch: the battle's spark and flinch, never a KO; only the exchange's last blow flashes
        // white (a menu has no repeating flash, U15)
        const last = !c.beats.slice(this.beatIndex).some((x) => x.k === 'hit');
        this.event({ e: 'hit', targetId: b.target, sourceId: b.source, sourceCard: b.card, castId: null, sourceKind: b.by, damage: 1000, shieldAbsorbed: 0, heavy: b.heavy, modBp: 10000, x: Math.round(target.x * 1000), dmgType: b.dmgType }, { flash: last });
        return;
      }
      case 'cheer': {
        const a = this.actors.get(b.id);
        if (!a || a.walk) return;
        a.view.play('victory');
        a.oneShotMs = ONE_SHOT.victory;
        a.loop = null;
        return;
      }
      default:
        return;
    }
  }

  // ---- actors -------------------------------------------------------------------------------------

  private updateActors(dt: number): void {
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const a = this.leaving[i]!;
      a.vanishMs += dt;
      if (a.vanishMs >= FADE_MS) {
        this.dropActor(a);
        this.leaving.splice(i, 1);
        continue;
      }
      this.writePose(a);
      a.view.update(dt);
    }
    for (const a of this.actors.values()) {
      if (a.fadeInMs >= 0) {
        a.fadeInMs += dt;
        if (a.fadeInMs >= FADE_MS) a.fadeInMs = -1;
      }
      this.moveActor(a, dt);
      this.loopClip(a, dt);
      this.writePose(a);
      a.view.update(dt);
    }
  }

  private moveActor(a: Actor, dt: number): void {
    let v = 0;
    if (a.walk && dt > 0) {
      const w = a.walk;
      const dir = Math.sign(w.toX - a.x);
      const stepLu = (w.speed * dt) / 1000;
      if (dir === 0 || Math.abs(w.toX - a.x) <= stepLu) {
        a.x = w.toX;
        a.walk = null;
      } else {
        a.x += dir * stepLu;
        v = dir * w.speed;
      }
    }
    // the walk follows the velocity toward the facing (negative backpedals), eased like the battle's gait;
    // the view's own lu are the drawn size's, so a troop drawn smaller takes proportionally longer strides
    const toward = (v * facingOf(a.side)) / a.scale;
    a.gaitV += (toward - a.gaitV) * (1 - Math.exp(-Math.max(0, dt) / 90));
    if (a.walk) a.gaitV = toward;
    a.view.setGait?.({ speedLuPerS: a.walk ? toward : a.gaitV });
  }

  /** Idle or walk unless a one-shot (attack, hit, cheer, spawn) is still showing (the battle view's rule). */
  private loopClip(a: Actor, dt: number): void {
    if (a.oneShotMs > 0) {
      a.oneShotMs -= dt;
      if (a.oneShotMs > 0 && !a.walk) return;
      a.oneShotMs = 0;
    }
    const want: 'idle' | 'walk' = a.walk ? 'walk' : 'idle';
    if (want === a.loop) return;
    const speed = (a.walk?.speed ?? 60) / a.scale;
    a.view.play(want, want === 'walk' ? { loop: true, durationMs: walkDurationForSpeed(speed) } : { loop: true });
    a.loop = want;
  }

  private writePose(a: Actor): void {
    const p = a.pose;
    p.x = a.x;
    p.y = a.y;
    let alpha = 1;
    if (a.fadeInMs >= 0) alpha = Math.min(1, a.fadeInMs / FADE_MS);
    if (a.vanishMs >= 0) alpha = Math.max(0, 1 - a.vanishMs / FADE_MS);
    p.alpha = alpha;
    a.view.setPose(p);
    // nearer rows draw on top; flyers above everything on the ground
    a.view.root.zIndex = a.air ? 10_000 + a.id : Math.round(a.y * 10) + a.id;
  }

  /** A flyer's shadow on the lane (ground troops carry their own contact shadow). */
  private drawGround(): void {
    const g = this.ground;
    g.clear();
    if (this.liteNow()) return;
    for (const a of this.actors.values()) {
      if (!a.air) continue;
      const w = a.plan.sizeLu * 0.62 * a.scale + 5;
      g.ellipse(a.x, a.homeY + ISLAND_ALTITUDE + 1, w * 0.8, 3.6).fill({ color: 0x000000, alpha: 0.2 });
    }
  }

  // ---- events through the battle's mapper -------------------------------------------------------

  private lookup = (id: number): UnitInfo | undefined => {
    const a = this.actors.get(id);
    return a ? { side: a.side, card: a.card, x: a.x } : undefined;
  };

  private event(body: Record<string, unknown> & { e: string }, extra: { attackIndex?: number; travelMs?: number; flash?: boolean } = {}): void {
    const m = this.mapper;
    if (!m) return;
    const ev = { ...body, tick: Math.floor(this.clockMs / 50) } as unknown as SimEvent;
    m.tick = ev.tick;
    for (const act of m.map([ev], this.lookup)) this.exec(act, extra);
  }

  private exec(act: ViewAction, extra: { attackIndex?: number; travelMs?: number; flash?: boolean }): void {
    switch (act.a) {
      case 'unitClip': {
        const a = this.actors.get(act.id);
        if (!a) return;
        if (act.clip === 'attack' && (act.attackIndex ?? 0) >= 1) {
          a.view.playAlt?.(act.impactAtMs !== undefined ? { impactAtMs: act.impactAtMs } : {});
          return;
        }
        if (act.clip === 'hit' && a.oneShotMs > 0) return;
        if (act.clip === 'attack') {
          const o: { impactAtMs?: number; variant?: string } = { ...(act.impactAtMs !== undefined ? { impactAtMs: act.impactAtMs } : {}), ...(a.variant ? { variant: a.variant } : {}) };
          a.variant = null;
          (a.view.play as (c: ClipName | string, o?: { impactAtMs?: number; variant?: string }) => void)('attack', o);
          a.oneShotMs = (act.impactAtMs ?? 0) + ONE_SHOT.attackRecover;
        } else {
          a.view.play(act.clip);
          a.oneShotMs = act.clip === 'spawn' ? ONE_SHOT.spawn : act.clip === 'hit' ? ONE_SHOT.hit : ONE_SHOT.ability;
        }
        a.loop = null;
        return;
      }
      case 'unitFlash':
        if (extra.flash === false) return;
        this.actors.get(act.id)?.view.flash(act.ms, act.color);
        return;
      case 'unitFreeze': {
        const ms = act.ms;
        if (ms > 0) this.actors.get(act.id)?.view.freeze(ms);
        return;
      }
      case 'projectile':
        this.fire(act, extra);
        return;
      case 'fx': {
        if (act.at.k === 'base' || act.at.k === 'mount') return;
        const at = this.anchor(act.at);
        const handles: ParticleHandle[] = [];
        this.emitFx(act.effectId, at, act.count, act.priority, { ...(act.spreadLu !== undefined ? { spreadLu: act.spreadLu } : {}), ...(act.opts ? { opts: act.opts } : {}), out: handles });
        if (act.follow && act.at.k === 'unit') this.followers.push({ handles, id: act.at.id, part: act.at.part ?? 'hit' });
        return;
      }
      case 'freeze':
        this.freezeMs = Math.min(this.feel.globalFreezeCapMs, Math.max(this.freezeMs, act.ms));
        return;
      default:
        // sound (the island is silent), trauma (no shake: the island is the menu's), numbers, music,
        // camera, HUD: not on Home
        return;
    }
  }

  private emitFx(effectId: string, at: Pt, count: number, priority: number, o: { spreadLu?: number; opts?: Record<string, number>; out?: ParticleHandle[] } = {}): void {
    this.particles?.emit(effectId, count, priority, at, o);
  }

  private updateFollowers(): void {
    if (this.followers.length === 0) return;
    const keep: typeof this.followers = [];
    for (const f of this.followers) {
      const a = this.actors.get(f.id);
      const live = f.handles.filter((h) => this.particles?.isLive(h));
      if (!a || live.length === 0) {
        for (const h of live) this.particles?.stop(h);
        continue;
      }
      const at = this.anchor({ k: 'unit', id: f.id, part: f.part });
      for (const h of live) h.view.root.position.set(at.x, at.y);
      keep.push({ ...f, handles: live });
    }
    this.followers = keep;
  }

  /** Where an anchor is on the island (lu); a troop's parts scale with its drawn size. */
  private anchor(at: Anchor): Pt {
    if (at.k === 'world') return { x: at.x, y: at.y };
    if (at.k !== 'unit') return { x: 0, y: -30 };
    const a = this.actors.get(at.id);
    if (!a) return { x: 0, y: -30 };
    const an = a.view.anchors;
    const f = facingOf(a.side);
    const s = a.scale;
    if (at.part === 'feet') return { x: a.x, y: a.y };
    if (at.part === 'head') return { x: a.x + an.head.x * f * s, y: a.y + (an.head.y - 6) * s };
    return { x: a.x + an.hitCenter.x * f * s, y: a.y + an.hitCenter.y * s };
  }

  private fire(act: Extract<ViewAction, { a: 'projectile' }>, extra: { attackIndex?: number; travelMs?: number }): void {
    const src = this.actors.get(act.from);
    const m = src ? (src.view.muzzleNow?.(act.attackIndex ?? extra.attackIndex ?? 0) ?? src.view.anchors.muzzle) : { x: 10, y: -30 };
    const from = src ? { x: src.x + m.x * facingOf(src.side) * src.scale, y: src.y + m.y * src.scale } : { x: 0, y: -30 };
    const t = this.actors.get(act.targetId);
    const to = t ? this.anchor({ k: 'unit', id: t.id, part: 'hit' }) : { x: act.toX, y: -30 };
    const ms = extra.travelMs ?? act.travelMs;
    if (!act.visualId) return;
    if (act.visualId.startsWith('fx.')) {
      this.emitFx(act.visualId, from, 1, 2, { opts: { toX: to.x, toY: to.y, ms, side: act.side ?? 0 } });
      return;
    }
    const view = this.art.createProjectile(act.visualId, act.side ?? 0);
    // queue item 44: the shot leaves along the shooter's drawn weapon (the views that know it)
    const index = act.attackIndex ?? extra.attackIndex ?? 0;
    const path = src ? aimedPath(src.view, attackAt(this.content.units[src.card], index), act.visualId, index, from, to, facingOf(src.side)) : null;
    const aimed = view as EffectView & { flyAimed?(from: Pt, to: Pt, ms: number, o: { launchDeg: number; path: ShotPath }): void };
    if (path && typeof aimed.flyAimed === 'function') aimed.flyAimed(from, to, ms, path);
    else view.fly(from, to, ms, act.arc);
    this.shots.addChild(view.root);
    this.flying.push(view);
  }

  // ---- debug --------------------------------------------------------------------------------------

  /** Exposed for tests and the dev hook: what stands, what plays and whether it draws. */
  debug(): {
    live: boolean;
    owner: boolean;
    running: boolean;
    lost: boolean;
    slow: boolean;
    actors: number[];
    troops: { id: number; card: CardId; x: number; homeX: number; front: number; scale: number }[];
    standby: number;
    poles: number;
    cycle: HomeCycle['kind'] | null;
    cycles: number;
    hd: boolean;
  } {
    const troops = [...this.actors.values()].map((a) => ({ id: a.id, card: a.card, x: Math.round(a.x * 10) / 10, homeX: Math.round(a.homeX * 10) / 10, front: Math.round(a.front * 10) / 10, scale: Math.round(a.scale * 100) / 100 }));
    let standby = 0;
    for (const v of this.standby.values()) standby += v.length;
    return { live: this.live, owner: this.owns(), running: this.frameHandle !== 0, lost: this.lost, slow: this.slow, actors: [...this.actors.keys()].sort((a, b) => a - b), troops, standby, poles: this.poles.length, cycle: this.cycle?.kind ?? null, cycles: this.cycleN, hd: this.hd };
  }

  /** Per-frame cost of step and render over the last frames (ms): mean and 95th percentile. */
  stats(): { frames: number; meanMs: number; p95Ms: number } {
    const n = this.costs.length;
    if (n === 0) return { frames: 0, meanMs: 0, p95Ms: 0 };
    const sorted = [...this.costs].sort((a, b) => a - b);
    const mean = this.costs.reduce((s, x) => s + x, 0) / n;
    return { frames: n, meanMs: Math.round(mean * 100) / 100, p95Ms: Math.round(sorted[Math.min(n - 1, Math.floor(n * 0.95))]! * 100) / 100 };
  }
}

/** Home's live island for this art provider, drawing on `shared` (the menus' one WebGL context). */
export function homeStageMount(art: ArtProvider, o: Omit<HomeStageDeps, 'art'>): HomeStageMount {
  return (host, req) => new HomeStage(host, req, { ...o, art });
}
