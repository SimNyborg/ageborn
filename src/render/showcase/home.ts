/**
 * Home's live island (owner request 2026-10-16, queue item 37; ui-plan 2.3, MR-112): the troops standing on
 * the island play their real battle clips and the flags wave with the lane's cloth, on a small transparent
 * Pixi layer over the island's SVG (which keeps the island, its landmark and its ambient life).
 *
 * - **The battle's art and feel.** Troops come from the injected `ArtProvider` exactly as in a match (the
 *   atlas views keep their idle breathing, gait-locked walk, attack variants, hit squash and cheer hop). The
 *   choreography (`homeScript.ts`) turns into the `SimEvent` shapes a battle emits and runs through the
 *   battle's `EventMapper`, so sparks, flashes, hit-stop and swing sounds follow `feel.config.json`. The
 *   flags are the lane's dressing (`createBaseDressing`: the cloth mesh rippling from the hoist).
 * - **Presentation only.** No sim runs; the stage clock is its own; nothing feeds back into play.
 * - **Lazy and light.** The stage leases its troops' sheets first (`showcaseLease`, the HD copy only where
 *   the island draws them large enough) and goes live once they load; until then, and for good if they
 *   never do, the UI keeps its still island. It draws on the menus' shared Pixi app (`SharedApp`, the
 *   Customize previews' WebGL context), only while visible, at most 60 fps (30 on Lite). Troops that may
 *   come next (the ranked opponent's while the search runs) preload their sheets, so they step in on the
 *   found beat.
 * - **Released.** `destroy` drops every view and the lease (a sheet only the island wanted unloads a few
 *   seconds later); `destroy({ now: true })` (leaving for a match) also lets the shared app and its context
 *   go at once.
 *
 * Coordinates: the island picture's own units (its SVG view box) map onto the host box; a troop's spot and a
 * pole's foot come in those units and the world is in lu (x toward the opponent, y down, 0 on the front line).
 */
import { Container, Graphics } from 'pixi.js';
import type { ArtProvider, BaseDressingView, CardId, ClipName, CompiledContent, CosmeticKey, EffectView, Pt, Side, SimEvent, SkinId, SoundId, TeamPreset, UnitPose, UnitView, VisualId } from '@/contracts';
import { mulberry32 } from '@/core';
import { EventMapper, type UnitInfo } from '../eventMapper';
import { defaultFeelConfig, type RenderFeelConfig } from '../feelConfig';
import { ParticlePool, type ParticleHandle } from '../feel/particlePool';
import { walkDurationForSpeed } from '../gait';
import type { Anchor, ViewAction } from '../types';
import type { DioramaApp, SharedApp, SharedAppUser } from './diorama';
import { HOME_IDS, homeCycle, type HomeActor, type HomeBeat, type HomeCycle } from './homeScript';
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

export interface HomeStageRequest {
  troops: readonly HomeStageTroop[];
  poles: readonly HomeStagePole[];
  /** The island picture: its size in its own units, where its lane's middle and front line are, and its units per lu. */
  island: { width: number; height: number; center: number; ground: number; unitsPerLu: number };
  teamPreset: TeamPreset;
  lite: boolean;
  /** The choreography's seed (the same island plays the same way). */
  seed: number;
  /** The UI's sound hook (the player's sound settings apply); absent = silent. */
  sound?: (id: SoundId, o?: { pitchBp?: number; volumeDb?: number }) => void;
  /**
   * Troops that may come next (the ranked opponent's while the search runs): their sheets load in the
   * background and nothing draws them, so they step in at once when they join the island.
   */
  preload?: readonly { card: CardId; skin?: SkinId | null }[];
}

export interface HomeStageHandle {
  /** Resolves true once the live island draws, false when it cannot (no WebGL, no art): keep the still. */
  readonly ready: Promise<boolean>;
  /** Applies changed troops, flags, team preset, quality or sound hook. */
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
/** Flyers hover this high over their spot on the island (lu; the lane's height compressed). */
const ISLAND_ALTITUDE = 42;
/** Showcase-like feel on a menu: sounds a little under the battle, and only for the first exchange. */
const VOLUME_DB = -8;
const LOUD_CYCLES = 2;
/** One-shot clip holds (ms), as the battle view's. */
const ONE_SHOT = { spawn: 260, hit: 160, ability: 650, victory: 900, attackRecover: 220 } as const;
const FADE_MS = 260;
const MAX_DT = 100;
const PARTICLE_CAP = { high: 160, lite: 60 } as const;
const LOAD_TIMEOUT_MS = 12_000;
/** A later change (a deck switch, the opponent found) waits at most this long for its sheets. */
const SWAP_TIMEOUT_MS = 6_000;
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

interface Pending {
  at: number;
  id: SoundId;
  pitchBp?: number;
  volumeDb?: number;
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
  private hd = false;
  private destroyed = false;
  private live = false;
  private visible = true;
  private frameHandle = 0;
  private lastFrame = -1;
  private observers: { disconnect(): void }[] = [];
  private width = 0;
  private height = 0;
  private gen = 0;
  private builtTroops = '';

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
  private sounds: Pending[] = [];
  private readonly lastSound = new Map<string, number>();

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
    void this.start();
  }

  // ---- HomeStageHandle ------------------------------------------------------------------------

  update(patch: Partial<HomeStageRequest>): void {
    if (this.destroyed) return;
    const prev = this.req;
    this.req = { ...this.req, ...patch };
    if (this.live) {
      if (patch.lite !== undefined && patch.lite !== prev.lite) {
        if (this.particles) this.particles.cap = patch.lite ? PARTICLE_CAP.lite : PARTICLE_CAP.high;
        for (const a of this.actors.values()) a.view.setMotion?.({ reduce: false, lite: patch.lite });
        for (const p of this.poles) p.view.setMotion({ reduce: false, lite: patch.lite });
      }
      if (patch.poles || patch.teamPreset !== undefined || patch.island) this.syncPoles();
      if (patch.troops || (patch.teamPreset !== undefined && patch.teamPreset !== prev.teamPreset) || patch.island) void this.syncTroops(false);
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
    for (const p of this.poles) p.view.destroy();
    this.poles = [];
    for (const f of this.flying) f.destroy();
    this.flying = [];
    this.particles?.destroy();
    this.particles = null;
    if (this.app && this.world.parent === this.app.stage) this.app.stage.removeChild(this.world);
    this.world.destroy({ children: true });
    this.app = null;
    this.deps.shared.release(this, { now: o.now === true });
    this.lease?.release();
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

  // ---- setup ------------------------------------------------------------------------------------

  private frames(): NonNullable<HomeStageDeps['frames']> {
    return this.deps.frames ?? { request: (cb) => requestAnimationFrame(cb), cancel: (h) => cancelAnimationFrame(h) };
  }

  private measure(): void {
    const r = this.host.getBoundingClientRect?.();
    this.width = Math.max(1, Math.round(r?.width || this.host.clientWidth || 343));
    this.height = Math.max(1, Math.round(r?.height || this.host.clientHeight || 194));
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
    const first = await this.leaseTroops(true);
    if (this.destroyed) return;
    if (!first) {
      this.destroy();
      return;
    }
    const app = await this.deps.shared.acquire(this, { width: this.width, height: this.height });
    if (this.destroyed) return;
    if (!app) {
      this.destroy();
      return;
    }
    this.app = app;
    this.particles = new ParticlePool(this.art, this.fx, this.req.lite ? PARTICLE_CAP.lite : PARTICLE_CAP.high, this.rng);
    this.mapper = new EventMapper({ content: this.content, feel: this.feel, mySide: 0, rng: mulberry32(0x40e6) });
    this.buildTroops(false);
    this.syncPoles();
    this.observe();
    this.live = true;
    if (this.owns()) this.takeApp();
    this.place();
    await this.warmUp();
    if (this.destroyed) return;
    this.step(0);
    this.resolveReady(true);
    this.schedule();
    // a change that came in while the first troops loaded
    if (this.troopSig() !== this.builtTroops) void this.syncTroops(false);
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

  private troopSig(): string {
    return this.req.troops.map(troopKey).join(',');
  }

  /**
   * Leases the sheets the current troops draw (the latest call wins). The first lease gives up after the
   * load timeout (false: the still stays); a later one swaps in what has loaded after a shorter wait.
   */
  private async leaseTroops(first: boolean): Promise<boolean> {
    const g = ++this.gen;
    const leaser = this.art as ArtProvider & LeasingArt;
    if (!leaser.showcaseLease) return true;
    const l = leaser.showcaseLease({ visuals: this.visualsOf(this.req.troops), hd: this.wantHd() });
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
   * Keeps the sheets of the troops that may come next (`preload`) loading in the background: when they
   * join (the opponent found), their lease is ready at once and they drop in with the found beat.
   */
  private syncPreload(): void {
    if (this.destroyed) return;
    const list = this.req.preload ?? [];
    const sig = list.map((t) => `${t.card}|${t.skin ?? ''}`).join(',');
    if (sig === this.preloadSig) return;
    this.preloadSig = sig;
    this.preloadLease?.release();
    this.preloadLease = null;
    const leaser = this.art as ArtProvider & LeasingArt;
    const visuals = this.visualsOf(list);
    if (!leaser.showcaseLease || visuals.length === 0) return;
    const l = leaser.showcaseLease({ visuals, hd: this.wantHd() });
    // a sheet that fails here simply loads again when its troop comes
    l.ready.catch(() => undefined);
    this.preloadLease = l;
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

  // ---- troops -------------------------------------------------------------------------------------

  /** Brings the troops on stage in line with the request (new sheets leased first). */
  private async syncTroops(first: boolean): Promise<void> {
    const sig = this.troopSig();
    if (sig === this.builtTroops) return;
    const ok = await this.leaseTroops(first);
    if (!ok || this.destroyed || this.troopSig() !== sig) return;
    this.buildTroops(true);
  }

  /** Creates, replaces or removes troops to match the request; `swap`: arrivals pop in with the battle's spawn. */
  private buildTroops(swap: boolean): void {
    const want = new Map<number, HomeStageTroop>();
    for (const t of this.req.troops) {
      const ids = t.side === 0 ? HOME_IDS.me : HOME_IDS.foe;
      const id = ids[t.slot];
      if (id !== undefined && this.content.units[t.card]) want.set(id, t);
    }
    for (const [id, a] of [...this.actors]) {
      const t = want.get(id);
      if (t && t.card === a.card && (t.skin ?? null) === a.skin && a.side === t.side) {
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
    this.builtTroops = this.troopSig();
    // the choreography restarts from a calm gap with the new cast
    this.cycle = null;
  }

  private spawnActor(id: number, t: HomeStageTroop, pop: boolean): void {
    const def = this.content.units[t.card]!;
    const skin = t.skin ?? null;
    const view = this.art.createUnit({ visualId: def.visualId, ...(skin ? { skin } : {}), side: t.side, teamPreset: this.req.teamPreset, ...(this.hd ? { hd: true } : {}) } as Parameters<ArtProvider['createUnit']>[0]) as IslandView;
    view.setIdentity?.({ id: id * 7919, seed: (Math.imul(id + 17, 2654435761) ^ this.req.seed) >>> 0 });
    view.setGroundMarks?.(false);
    view.setMotion?.({ reduce: false, lite: this.req.lite });
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
    return [...this.actors.values()].map((a) => ({ id: a.id, side: a.side, slot: a.slot, card: a.card, plan: a.plan, homeX: a.homeX, homeY: a.homeY, front: a.front, naturalSpeed: a.natural }));
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
      view.setMotion({ reduce: false, lite: this.req.lite });
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
    if (this.destroyed || !this.live) return;
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
    this.playSounds();
    this.drawGround();
    this.render();
    if (dtMs > 0 && typeof performance !== 'undefined') {
      this.costs.push(performance.now() - t0);
      if (this.costs.length > 240) this.costs.shift();
    }
  }

  private render(): void {
    if (this.live && this.owns()) this.app?.render();
  }

  /** Runs the frame loop while live, visible and on the shared canvas (60 fps at most, 30 on Lite). */
  private schedule(): void {
    if (this.destroyed || !this.live) return;
    if (!this.visible || !this.owns()) {
      if (this.frameHandle) this.frames().cancel(this.frameHandle);
      this.frameHandle = 0;
      this.lastFrame = -1;
      return;
    }
    if (this.frameHandle) return;
    const tick = (now: number): void => {
      this.frameHandle = 0;
      if (this.destroyed || !this.visible || !this.owns()) return;
      const dt = this.lastFrame < 0 ? 16 : now - this.lastFrame;
      if (dt >= (this.req.lite ? 30 : 14) || this.lastFrame < 0) {
        this.lastFrame = now;
        this.step(dt);
      }
      this.frameHandle = this.frames().request(tick);
    };
    this.frameHandle = this.frames().request(tick);
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
      this.runBeat(b);
    }
    if (this.cycleT >= c.ms) this.cycle = null;
  }

  private runBeat(b: HomeBeat): void {
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
        // a light touch: the battle's spark, flash and flinch, never a KO
        this.event({ e: 'hit', targetId: b.target, sourceId: b.source, sourceCard: b.card, castId: null, sourceKind: b.by, damage: 1000, shieldAbsorbed: 0, heavy: b.heavy, modBp: 10000, x: Math.round(target.x * 1000), dmgType: b.dmgType });
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
    if (this.req.lite) return;
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

  private event(body: Record<string, unknown> & { e: string }, extra: { attackIndex?: number; travelMs?: number } = {}): void {
    const m = this.mapper;
    if (!m) return;
    const ev = { ...body, tick: Math.floor(this.clockMs / 50) } as unknown as SimEvent;
    m.tick = ev.tick;
    for (const act of m.map([ev], this.lookup)) this.exec(act, extra);
  }

  private exec(act: ViewAction, extra: { attackIndex?: number; travelMs?: number }): void {
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
      case 'sound':
        this.sound(act.id, act.delayMs ?? 0, act.gap?.gapMs ?? 0, act.pitchBp, act.volumeDb);
        return;
      case 'freeze':
        this.freezeMs = Math.min(this.feel.globalFreezeCapMs, Math.max(this.freezeMs, act.ms));
        return;
      default:
        // trauma (no shake: the island is the menu's), numbers, music, camera, HUD: not on Home
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
    view.fly(from, to, ms, act.arc);
    this.shots.addChild(view.root);
    this.flying.push(view);
  }

  // ---- sound --------------------------------------------------------------------------------------

  private sound(id: SoundId, delayMs: number, gapMs: number, pitchBp?: number, volumeDb?: number): void {
    // the first exchanges sound (quietly); after that the island is silent: a menu that keeps clanging is noise
    if (!this.req.sound || this.cycleN > LOUD_CYCLES) return;
    const at = this.clockMs + Math.max(0, delayMs);
    const last = this.lastSound.get(id);
    if (last !== undefined && at - last < Math.max(gapMs, 40)) return;
    this.lastSound.set(id, at);
    this.sounds.push({ at, id, ...(pitchBp !== undefined ? { pitchBp } : {}), volumeDb: (volumeDb ?? 0) + VOLUME_DB });
  }

  private playSounds(): void {
    if (this.sounds.length === 0) return;
    const due = this.sounds.filter((s) => s.at <= this.clockMs);
    if (due.length === 0) return;
    this.sounds = this.sounds.filter((s) => s.at > this.clockMs);
    const fn = this.req.sound;
    if (!fn) return;
    for (const s of due) {
      try {
        fn(s.id, { ...(s.pitchBp !== undefined ? { pitchBp: s.pitchBp } : {}), ...(s.volumeDb !== undefined ? { volumeDb: s.volumeDb } : {}) });
      } catch {
        // a missing sound never breaks the island
      }
    }
  }

  // ---- debug --------------------------------------------------------------------------------------

  /** Exposed for tests and the dev hook: what stands, what plays and whether it draws. */
  debug(): {
    live: boolean;
    owner: boolean;
    running: boolean;
    actors: number[];
    troops: { id: number; card: CardId; x: number; homeX: number; front: number; scale: number }[];
    poles: number;
    cycle: HomeCycle['kind'] | null;
    cycles: number;
    hd: boolean;
  } {
    const troops = [...this.actors.values()].map((a) => ({ id: a.id, card: a.card, x: Math.round(a.x * 10) / 10, homeX: Math.round(a.homeX * 10) / 10, front: Math.round(a.front * 10) / 10, scale: Math.round(a.scale * 100) / 100 }));
    return { live: this.live, owner: this.owns(), running: this.frameHandle !== 0, actors: [...this.actors.keys()].sort((a, b) => a - b), troops, poles: this.poles.length, cycle: this.cycle?.kind ?? null, cycles: this.cycleN, hd: this.hd };
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
