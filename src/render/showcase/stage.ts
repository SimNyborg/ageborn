/**
 * The card detail showcase stage (ui-plan 4.4; owner request 2026-10-07): a small Pixi stage where a
 * card's real battle art moves, attacks a sparring dummy, takes a hit and a KO, and loops.
 *
 * - **Real art, real feel.** Units, turrets, forts, projectiles and effects come from the injected
 *   `ArtProvider` exactly as in a battle (the atlas views keep their gait, frame lock, attack variants,
 *   squash, KO hand-off). The script's beats become the `SimEvent` shapes a battle emits and run
 *   through the battle's `EventMapper`, so sparks, sounds, hit-stop, flashes and deaths follow
 *   `feel.config.json`.
 * - **Presentation only.** No sim runs; the stage clock is its own. Nothing feeds back into play.
 * - **Lazy and light.** Sheets are leased from the provider (`showcaseLease`, duck-typed) and the
 *   stage goes live only once they load; until then the UI keeps the still portrait. `destroy`
 *   releases the lease (a showcase-only sheet is unloaded a few seconds later), destroys every view
 *   and the Pixi app, and with it its WebGL context. Drawing pauses while the tab is hidden or the
 *   stage is off screen.
 * - **Reduce motion.** The stage idles; a move plays only when asked (one tap, one move); arrivals
 *   fade in instead of popping; hit-stop and shake follow the battle's reduce-motion tuning.
 */
import { Application, Container, Graphics } from 'pixi.js';
import type {
  ArtProvider,
  CardId,
  ClipName,
  CompiledContent,
  EffectView,
  FortView,
  Pt,
  ShowcaseHandle,
  ShowcaseMove,
  ShowcaseRequest,
  ShowcaseState,
  Side,
  SimEvent,
  TurretView,
  UnitPose,
  UnitView,
  VisualId,
} from '@/contracts';
import { mulberry32 } from '@/core';
import { EventMapper, type UnitInfo } from '../eventMapper';
import { defaultFeelConfig, type RenderFeelConfig } from '../feelConfig';
import { ParticlePool, type ParticleHandle } from '../feel/particlePool';
import { Shake } from '../feel/shake';
import { FortUnitView } from '../fortViews';
import { walkDurationForSpeed } from '../gait';
import { ZoneOverlay } from '../powerTargeting';
import { teamColor } from '../teamColors';
import type { Anchor, ViewAction } from '../types';
import {
  ALLY,
  arrivalMove,
  autoLoop,
  DUMMY,
  DUMMY_CARD,
  FOE_TURRET,
  HERO,
  memberIds,
  memberSpot,
  moveScript,
  planVisuals,
  SHOOTER,
  showcasePlan,
  STRUCTURE,
  TURRET_SOURCE,
  variantIndex,
  type Beat,
  type HeroArt,
  type MoveScript,
  type ShowcasePlan,
} from './script';

// ---------------------------------------------------------------------------------------------
// Seams (tests pass fakes)

/** The drawing surface: a Pixi app in the host (tests pass a fake without WebGL). */
export interface StageApp {
  readonly stage: Container;
  render(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

/** Optional art-provider extras the stage uses when present (duck-typed, `visuals` provides them). */
interface LeasingArt {
  showcaseLease?(o: { visuals: readonly { visualId: VisualId; skin?: string | null }[]; hd?: boolean }): { ready: Promise<void>; hd: boolean; release(): void };
}

/** Optional unit-view extras (the atlas tier's duck-typed hooks). */
interface ShowView extends UnitView {
  setGait?(o: { speedLuPerS: number }): void;
  setIdentity?(o: { id: number; seed: number }): void;
  setMotion?(m: { reduce: boolean; lite: boolean }): void;
  playAlt?(o: { impactAtMs?: number }): void;
  muzzleNow?(attackIndex?: number): Pt | null;
  motionInfo?(): { attacks: string[]; alt: boolean; gait: string | null; naturalSpeedLuPerS: number | null };
  setGroundMarks?(on: boolean): void;
  extentLu?(): { front: number; back: number; top: number } | null;
  impactReachLu?(): number | null;
  readonly finished?: boolean;
}

interface MotionView {
  setMotion?(m: { reduce: boolean; lite: boolean }): void;
}

export interface ShowcaseDeps {
  art: ArtProvider;
  /** Content for requests that bring none (the onboarding's first upgrade stage). */
  content?: CompiledContent;
  /** Makes the drawing surface; resolves null when it cannot (no WebGL): the UI keeps its still. */
  createApp?: (host: HTMLElement, size: { width: number; height: number }) => Promise<StageApp | null>;
  feel?: RenderFeelConfig;
  /** Frame scheduling (tests drive `step` themselves and pass a no-op). */
  frames?: { request(cb: (now: number) => void): number; cancel(h: number): void };
  /** Longest wait for the sheets before the stage gives up and the still stays, ms. */
  loadTimeoutMs?: number;
}

// ---------------------------------------------------------------------------------------------
// Tuning

/** Largest drawing scale, CSS px per lu (the HD sheets are 2.46 px/lu; more upscales them softly). */
export const SHOWCASE_MAX_SCALE = 3.2;
/** Smallest drawing scale (a Legendary on a short phone stage). */
const MIN_SCALE = 0.35;
/** Showcase sounds sit a little under the battle's (a menu preview, not a fight). */
const SHOWCASE_VOLUME_DB = -4;
/** One-shot clip holds (ms), as the battle view's `ONE_SHOT_MS`. */
const ONE_SHOT = { spawn: 260, hit: 160, ability: 650, victory: 900, attackRecover: 220 } as const;
/** A KO'd actor stays at least this long (its die clip, poof and stars), ms; at most `DEATH_CAP_MS`. */
const DEATH_LINGER_MS = 700;
const DEATH_CAP_MS = 2400;
/** A fallen fort's rubble lingers this long, ms. */
const FORT_RUBBLE_MS = 2000;
const VANISH_MS = 260;
/** After a walk-in the unit settles this long before the next move, ms. */
const WALK_SETTLE_MS = 420;
const FADE_IN_MS = 240;
/** Frame step clamp, ms. */
const MAX_DT = 100;
/** Particle caps: High and Lite. */
const PARTICLE_CAP = { high: 220, lite: 90 } as const;

function levelTrim(level: number): UnitPose['levelTrim'] {
  if (level >= 10) return 'gold';
  if (level >= 7) return 'silver';
  if (level >= 4) return 'bronze';
  return 'none';
}

const facingOf = (side: Side): 1 | -1 => (side === 0 ? 1 : -1);

/** The share of the stage's height a hero of `h` lu fills: big units fill more (size still reads). */
export function heroShare(h: number): number {
  const u = Math.min(1, Math.max(0, (h - 70) / 130));
  return 0.5 + 0.18 * u;
}

/** The hero's back may overlap the lg card's right edge by this share of the stage width. */
const COVER_OVERLAP = 0.03;
/** Room kept free at the top for the caption and play/pause row, px. */
const TOP_ROOM_PX = 40;
/** The Training Dummy's drawn reach behind its feet (lu), until a troop stage measures it. */
const DUMMY_BACK = 22;

// ---------------------------------------------------------------------------------------------
// Actors

interface Actor {
  id: number;
  side: Side;
  card: CardId;
  /** Units (and forts, wrapped) draw through `view`; a turret or trap through its own view; ghosts draw nothing. */
  view: ShowView | null;
  turret: (TurretView & MotionView) | null;
  trap: (FortView & MotionView) | null;
  fort: FortUnitView | null;
  x: number;
  /** Row offset (positive = nearer the viewer); flyers carry their altitude here (negative). */
  y: number;
  air: boolean;
  sizeLu: number;
  walk: { toX: number; speed: number } | null;
  dash: { fromX: number; toX: number; ms: number; t: number; lift: number } | null;
  gaitV: number;
  loop: 'idle' | 'walk' | null;
  oneShotMs: number;
  dying: boolean;
  dieMs: number;
  vanishMs: number;
  fadeInMs: number;
  shieldBp: number;
  stunMs: number;
  frozen: boolean;
  hpBp: number;
  pose: UnitPose;
  aura: EffectView | null;
  /** The next body attack's variant (set by the beat, used by the mapper's `unitClip`). */
  variant: string | null;
}

interface Flying {
  view: EffectView;
}

interface Pending {
  at: number;
  id: string;
  pitchBp?: number;
  volumeDb?: number;
}

// ---------------------------------------------------------------------------------------------
// The stage

export class ShowcaseStage implements ShowcaseHandle {
  readonly ready: Promise<boolean>;
  private resolveReady: (ok: boolean) => void = () => {};
  private req: ShowcaseRequest;
  private readonly art: ArtProvider;
  private readonly feel: RenderFeelConfig;
  private readonly deps: ShowcaseDeps;
  private readonly content: CompiledContent;
  private app: StageApp | null = null;
  private lease: { release(): void } | null = null;
  private hd = false;
  private destroyed = false;
  private live = false;
  private visible = true;
  private pageVisible = true;
  private frameHandle = 0;
  private lastFrame = -1;
  private readonly listeners = new Set<(s: ShowcaseState) => void>();
  private observers: { disconnect(): void }[] = [];
  private offVisibility: (() => void) | null = null;

  // scene
  private readonly world = new Container();
  private readonly ground = new Graphics();
  private readonly units = new Container();
  private readonly shots = new Container();
  private readonly fx = new Container();
  private readonly zones = new ZoneOverlay();
  private particles: ParticlePool | null = null;
  private mapper: EventMapper | null = null;
  private readonly shake: Shake;
  private readonly rng = mulberry32(0x5c0e);
  private readonly actors = new Map<number, Actor>();
  private flying: Flying[] = [];
  private followers: { handles: ParticleHandle[]; id: number; part: 'feet' | 'hit' | 'head' }[] = [];
  private sounds: Pending[] = [];
  private readonly lastSound = new Map<string, number>();

  // show
  private plan: ShowcasePlan | null = null;
  private loopMoves: ShowcaseMove[] = [];
  private loopIndex = 0;
  private script: MoveScript | null = null;
  private beatIndex = 0;
  private moveT = 0;
  private move: ShowcaseMove = 'idle';
  private auto = true;
  /** Auto loops still played with sound (the first, and one after each tap). */
  private loudLoops = 1;
  private manual = false;
  private dummyHits = 0;
  private structureHits = 0;
  private clockMs = 0;
  private freezeMs = 0;
  private width = 0;
  private height = 0;
  private scale = 1;
  private pid = 1;

  constructor(
    private readonly host: HTMLElement,
    req: ShowcaseRequest,
    deps: ShowcaseDeps,
  ) {
    this.req = req;
    this.deps = deps;
    this.art = deps.art;
    this.content = (req.content ?? deps.content) as CompiledContent;
    this.feel = deps.feel ?? defaultFeelConfig;
    this.shake = new Shake({ ...this.feel.shake, maxRotDeg: 0, maxOffsetPx: 5 }, 7, 3, 120);
    this.auto = !req.reduceMotion;
    this.ready = new Promise<boolean>((r) => (this.resolveReady = r));
    this.world.addChild(this.ground, this.zones.groundRoot, this.units, this.shots, this.fx, this.zones.root);
    this.units.sortableChildren = true;
    void this.start();
  }

  // ---- public API ---------------------------------------------------------------------------

  state(): ShowcaseState {
    const v = this.plan ? variantIndex(this.plan, this.move) : { index: 0, of: 0 };
    const ab = this.plan?.kind === 'troop' ? this.plan.ability : null;
    // a Time Stop that does not freeze is a roar (a daze with dizzy stars, X0 M5)
    const ability = ab ? (ab.kind === 'timeStop' && ab.frozen === false ? 'roar' : ab.kind) : null;
    return { live: this.live, move: this.move, index: v.index, of: v.of, ability, auto: this.auto, moves: this.plan?.moves ?? [] };
  }

  play(move?: ShowcaseMove): void {
    if (!this.plan || this.destroyed) return;
    const moves = this.plan.moves;
    const next = move && moves.includes(move) ? move : (moves[(moves.indexOf(this.move) + 1) % moves.length] ?? 'idle');
    this.manual = true;
    this.auto = false;
    this.loudLoops = 1;
    this.begin(next);
  }

  setAuto(on: boolean): void {
    if (this.destroyed || this.auto === on) return;
    this.auto = on;
    if (on) {
      this.manual = false;
      this.loudLoops = 1;
      // continue the loop from the move after the one on stage
      const i = this.loopMoves.indexOf(this.move);
      this.loopIndex = i >= 0 ? i : 0;
      if (!this.script || this.moveT >= this.script.ms) this.advance();
    }
    this.emit();
  }

  update(patch: Partial<Pick<ShowcaseRequest, 'skin' | 'level' | 'silhouette' | 'teamPreset' | 'reduceMotion' | 'lite' | 'sound' | 'frame'>>): void {
    if (this.destroyed) return;
    const prev = this.req;
    this.req = { ...this.req, ...patch };
    if ('sound' in patch) this.req = { ...this.req, ...(patch.sound ? { sound: patch.sound } : {}) };
    if (!this.live) return;
    if (patch.reduceMotion !== undefined && patch.reduceMotion !== prev.reduceMotion) {
      for (const a of this.actors.values()) this.applyMotion(a);
      this.zones.setReduceMotion(patch.reduceMotion);
      this.shake.multiplier = patch.reduceMotion ? 0 : 0.6;
      if (patch.reduceMotion && this.auto) this.setAuto(false);
    }
    if (patch.lite !== undefined && this.particles) {
      this.particles.cap = patch.lite ? PARTICLE_CAP.lite : PARTICLE_CAP.high;
      for (const a of this.actors.values()) this.applyMotion(a);
    }
    if ((patch.skin !== undefined && patch.skin !== prev.skin) || (patch.teamPreset !== undefined && patch.teamPreset !== prev.teamPreset)) {
      void this.refreshHero(patch.teamPreset !== undefined && patch.teamPreset !== prev.teamPreset);
      return;
    }
    if (patch.silhouette !== undefined || patch.level !== undefined) for (const a of this.actors.values()) this.dressHero(a);
  }

  celebrate(): void {
    if (!this.live || !this.plan) return;
    if (this.plan.kind === 'troop') {
      for (const id of memberIds(this.plan)) {
        const a = this.actors.get(id);
        if (!a?.view || a.dying) continue;
        a.view.play('victory');
        a.oneShotMs = ONE_SHOT.victory;
        a.loop = null;
      }
    }
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.schedule();
  }

  subscribe(fn: (s: ShowcaseState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.frameHandle) this.frames().cancel(this.frameHandle);
    this.frameHandle = 0;
    for (const o of this.observers) o.disconnect();
    this.observers = [];
    this.offVisibility?.();
    for (const a of [...this.actors.values()]) this.dropActor(a);
    this.actors.clear();
    for (const f of this.flying) f.view.destroy();
    this.flying = [];
    this.particles?.destroy();
    this.particles = null;
    this.listeners.clear();
    try {
      this.app?.destroy();
    } catch {
      // a lost context throws on destroy; nothing left to free then
    }
    this.app = null;
    this.lease?.release();
    this.lease = null;
    this.resolveReady(false);
  }

  /** Advances the stage by `dtMs` and draws (the frame loop calls it; tests call it directly). */
  step(dtMs: number): void {
    if (this.destroyed || !this.live) return;
    const dt = Math.max(0, Math.min(MAX_DT, dtMs));
    this.clockMs += dt;
    let gameDt = dt;
    if (this.freezeMs > 0) {
      const used = Math.min(this.freezeMs, gameDt);
      this.freezeMs -= used;
      gameDt -= used;
    }
    if (gameDt > 0) {
      this.moveT += gameDt;
      this.runBeats();
      this.settleWalk();
      if (this.script && this.moveT >= this.script.ms) this.advance();
    }
    this.updateScaffold(gameDt);
    this.updateActors(gameDt);
    this.particles?.update(gameDt);
    this.updateFollowers();
    for (const f of this.flying) f.view.update(gameDt);
    const done = this.flying.filter((f) => f.view.done);
    if (done.length) {
      for (const f of done) f.view.destroy();
      this.flying = this.flying.filter((f) => !f.view.done);
    }
    this.zones.update(gameDt, this.scale);
    this.shake.update(dt);
    this.playSounds();
    this.drawGround();
    this.place();
    this.app?.render();
  }

  // ---- setup --------------------------------------------------------------------------------

  private frames(): NonNullable<ShowcaseDeps['frames']> {
    return (
      this.deps.frames ?? {
        request: (cb) => requestAnimationFrame(cb),
        cancel: (h) => cancelAnimationFrame(h),
      }
    );
  }

  private async start(): Promise<void> {
    const content = this.content;
    const plan0 = content ? showcasePlan(content, this.req.card) : null;
    if (!plan0) {
      this.resolveReady(false);
      return;
    }
    // lease the sheets (with the skin) before anything draws; the still portrait shows meanwhile
    const visuals = planVisuals(content, plan0).map((visualId) => ({ visualId, skin: plan0.kind === 'troop' && visualId === plan0.visualId ? this.req.skin : null }));
    const leaser = this.art as ArtProvider & LeasingArt;
    if (leaser.showcaseLease) {
      const l = leaser.showcaseLease({ visuals, hd: true });
      this.lease = l;
      this.hd = l.hd;
      const timeout = new Promise<'late'>((r) => setTimeout(() => r('late'), this.deps.loadTimeoutMs ?? 12_000));
      const r = await Promise.race([l.ready.then(() => 'ok' as const), timeout]);
      if (r === 'late' && !this.destroyed) {
        this.destroy();
        return;
      }
    }
    if (this.destroyed) return;
    this.measure();
    const app = await (this.deps.createApp ?? createPixiApp)(this.host, { width: this.width, height: this.height });
    if (this.destroyed) {
      app?.destroy();
      return;
    }
    if (!app) {
      this.destroy();
      return;
    }
    this.app = app;
    app.stage.addChild(this.world);
    this.particles = new ParticlePool(this.art, this.fx, this.req.lite ? PARTICLE_CAP.lite : PARTICLE_CAP.high, this.rng);
    this.mapper = new EventMapper({ content: content as CompiledContent, feel: this.feel, mySide: 0, rng: mulberry32(0x5ca1) });
    this.zones.setReduceMotion(this.req.reduceMotion);
    this.shake.multiplier = this.req.reduceMotion ? 0 : 0.6;
    this.buildScene(plan0);
    this.observe();
    this.live = true;
    // the arrival: a troop pops in (fades in with Reduce motion), a turret or fort builds, a power's
    // targets take their places
    this.loopMoves = this.plan ? autoLoop(this.plan) : [];
    this.loopIndex = 0;
    const first = this.plan && !this.req.reduceMotion ? arrivalMove(this.plan) : 'idle';
    this.begin(first, true);
    if (this.plan && first !== this.loopMoves[0]) this.loopIndex = -1;
    this.step(0);
    this.emit();
    this.resolveReady(true);
    this.schedule();
  }

  private measure(): void {
    const r = this.host.getBoundingClientRect?.();
    this.width = Math.max(1, Math.round(r?.width || this.host.clientWidth || 300));
    this.height = Math.max(1, Math.round(r?.height || this.host.clientHeight || 260));
  }

  private observe(): void {
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => {
        const w = this.width;
        const h = this.height;
        this.measure();
        if (w !== this.width || h !== this.height) {
          this.app?.resize(this.width, this.height);
          this.place();
        }
      });
      ro.observe(this.host);
      this.observers.push(ro);
    }
    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((list) => {
        const e = list[list.length - 1];
        if (e) this.setVisible(e.isIntersecting);
      });
      io.observe(this.host);
      this.observers.push(io);
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      const on = (): void => {
        this.pageVisible = !document.hidden;
        this.schedule();
      };
      document.addEventListener('visibilitychange', on);
      this.offVisibility = () => document.removeEventListener('visibilitychange', on);
    }
  }

  /** Runs the frame loop while live and visible (60 fps at most). */
  private schedule(): void {
    if (this.destroyed || !this.live) return;
    const want = this.visible && this.pageVisible;
    if (!want) {
      if (this.frameHandle) this.frames().cancel(this.frameHandle);
      this.frameHandle = 0;
      this.lastFrame = -1;
      return;
    }
    if (this.frameHandle) return;
    const tick = (now: number): void => {
      this.frameHandle = 0;
      if (this.destroyed || !this.visible || !this.pageVisible) return;
      const dt = this.lastFrame < 0 ? 16 : now - this.lastFrame;
      if (dt >= 14 || this.lastFrame < 0) {
        this.lastFrame = now;
        this.step(dt);
      }
      this.frameHandle = this.frames().request(tick);
    };
    this.frameHandle = this.frames().request(tick);
  }

  private buildScene(plan0: ShowcasePlan): void {
    const content = this.content;
    const p = plan0;
    this.plan = p;
    if (p.kind === 'troop') {
      this.spawnDummy(p.layout.dummyX, false);
      this.ghost(SHOOTER, p.foe.by === 'shot' ? p.foe.card : DUMMY_CARD, 1, p.layout.dummyX + 170);
      memberIds(p).forEach((id, i) => {
        const at = memberSpot(p, i);
        this.spawnUnit(id, p.card, 0, at.x, at.y, { pop: false, fade: false });
      });
      // the art decides the variants, the riders' clip and how close the two bodies may stand
      this.plan = showcasePlan(content, this.req.card, this.heroArt()) ?? p;
      this.restSpots();
      if (p.shield) for (const id of memberIds(p)) this.setShield(id, 10000);
      return;
    }
    if (p.kind === 'turret') {
      this.spawnTurret(STRUCTURE, 0, p.card, p.visualId, p.layout.turretX);
      this.mapper?.setTurretCard(0, 0, p.card);
      return;
    }
    if (p.kind === 'fort') {
      this.spawnFort(p, false);
      return;
    }
    // powers: the targets walk in with the first move
  }

  /** What the hero's loaded art can show (variants, riders' clip) and how far its drawn idle reaches. */
  private heroArt(): HeroArt | undefined {
    const hero = this.actors.get(HERO);
    const dummy = this.actors.get(DUMMY);
    const info = hero?.view?.motionInfo?.();
    const reachOf = (a: Actor | undefined): { front: number; back: number } | null => {
      const v = a?.view;
      if (!v) return null;
      v.update(0);
      // the visible (trimmed) frame where the art can say it, else the drawn bounds
      const e = v.extentLu?.();
      if (e) return { front: e.front, back: e.back };
      const b = v.root.getLocalBounds();
      if (!(b.width > 0)) return null;
      return facingOf(a.side) > 0 ? { front: b.maxX, back: -b.minX } : { front: -b.minX, back: b.maxX };
    };
    const h = reachOf(hero);
    const d = reachOf(dummy);
    const impact = hero?.view?.impactReachLu?.() ?? null;
    const extent = h && d ? { heroFront: h.front, heroBack: h.back, heroImpact: impact, dummyFront: d.front } : undefined;
    this.extents = { heroBack: h?.back ?? null, dummyBack: d?.back ?? null };
    if (!info && !extent) return undefined;
    return { attacks: info?.attacks ?? ['attack'], alt: info?.alt ?? false, ...(extent ? { extent } : {}) };
  }

  /** Drawn reach behind the hero and the dummy (lu), for framing; null until measured. */
  private extents: { heroBack: number | null; dummyBack: number | null } = { heroBack: null, dummyBack: null };

  /** Puts the standing heroes on their (re-measured) spots. */
  private restSpots(): void {
    const p = this.plan;
    if (p?.kind !== 'troop') return;
    memberIds(p).forEach((id, i) => {
      const a = this.actors.get(id);
      if (!a || a.dying || a.walk) return;
      const at = memberSpot(p, i);
      a.x = at.x;
      a.y = at.y;
      this.writePose(a);
    });
  }

  /** Re-creates the hero (a skin or the team preset changed); the new look pops in where it stood. */
  private async refreshHero(all: boolean): Promise<void> {
    const p = this.plan;
    if (!p || this.destroyed) return;
    if (p.kind === 'troop') {
      const leaser = this.art as ArtProvider & LeasingArt;
      const prev = this.lease;
      if (leaser.showcaseLease) {
        const l = leaser.showcaseLease({ visuals: planVisuals(this.content, p).map((visualId) => ({ visualId, skin: visualId === p.visualId ? this.req.skin : null })), hd: true });
        this.lease = l;
        await l.ready;
        prev?.release();
        if (this.destroyed) return;
      }
      for (const id of memberIds(p)) {
        const a = this.actors.get(id);
        if (!a) continue;
        const { x, y } = a;
        const dead = a.dying;
        this.dropActor(a);
        if (!dead) this.spawnUnit(id, p.card, 0, x, y, { pop: !this.req.reduceMotion, fade: this.req.reduceMotion, feel: true });
      }
      this.plan = showcasePlan(this.content, this.req.card, this.heroArt()) ?? p;
      this.restSpots();
      this.loopMoves = autoLoop(this.plan);
      if (!this.plan.moves.includes(this.move)) this.begin('idle');
      if (all) {
        const d = this.actors.get(DUMMY);
        if (d && !d.dying) {
          const x = d.x;
          this.dropActor(d);
          this.spawnDummy(x, false);
        }
      }
      this.emit();
    }
  }

  // ---- actors -------------------------------------------------------------------------------

  private newActor(id: number, side: Side, card: CardId, x: number, y: number): Actor {
    const def = this.content.units[card];
    const sizeLu = def ? (this.content.economy.sizes[def.size] ?? 24) : 24;
    return {
      id,
      side,
      card,
      view: null,
      turret: null,
      trap: null,
      fort: null,
      x,
      y,
      air: def?.tags.includes('air') ?? false,
      sizeLu,
      walk: null,
      dash: null,
      gaitV: 0,
      loop: null,
      oneShotMs: 0,
      dying: false,
      dieMs: 0,
      vanishMs: -1,
      fadeInMs: -1,
      shieldBp: 0,
      stunMs: 0,
      frozen: false,
      hpBp: 10000,
      pose: { x, y, facing: facingOf(side), hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: def?.group ?? 'infantry' },
      aura: null,
      variant: null,
    };
  }

  /** An actor without art (the unseen marksman), known to the event mapper only. */
  private ghost(id: number, card: CardId, side: Side, x: number): void {
    this.actors.set(id, this.newActor(id, side, card, x, 0));
  }

  private spawnUnit(id: number, card: CardId, side: Side, x: number, y: number, o: { pop: boolean; fade: boolean; feel?: boolean; summoner?: number; from?: number }): Actor {
    const old = this.actors.get(id);
    if (old) this.dropActor(old);
    const a = this.newActor(id, side, card, x, y);
    const def = this.content.units[card];
    const hero = this.plan?.kind === 'troop' ? card === this.plan.card && side === 0 : false;
    const skin = hero && this.req.skin ? this.req.skin : undefined;
    const visualId = def?.visualId ?? `unit.${card}`;
    const view = this.art.createUnit({ visualId, ...(skin ? { skin } : {}), side, teamPreset: this.req.teamPreset, ...(this.hd ? { hd: true } : {}) } as Parameters<ArtProvider['createUnit']>[0]) as ShowView;
    view.setIdentity?.({ id: id * 7919, seed: (id * 2654435761) >>> 0 });
    // alone on a stage: the contact shadow, without the battle's team ring, role glyph and level trim
    view.setGroundMarks?.(false);
    a.view = view;
    this.applyMotion(a);
    this.units.addChild(view.root);
    this.actors.set(id, a);
    this.dressHero(a);
    // a Legendary (or a Legendary skin) wears the battle's white aura
    const legendary = def?.group === 'legendary' || (skin !== undefined && this.content.skins[skin]?.rarity === 'legendary');
    if (legendary && !this.req.lite) {
      const radius = Math.max(24, Math.round(Math.abs(view.anchors.head.y - view.anchors.feet.y) * 0.55));
      a.aura = this.art.createEffect('fx.legendary_aura', { radius, side });
      a.aura.playAt({ x, y: y + view.anchors.hitCenter.y }, { radius, side });
      this.units.addChild(a.aura.root);
    }
    if (o.pop && !this.req.reduceMotion) {
      // the battle's spawn: the cartoon pop with its dust ring and the card's spawn sound
      if (o.feel !== false) this.event({ e: 'unitSpawned', id, side, card, x: Math.round(x * 1000), summoned: o.summoner !== undefined || o.from !== undefined, level: this.req.level, ...(o.summoner !== undefined ? { summoner: o.summoner } : {}), ...(o.from !== undefined ? { from: o.from } : {}) });
      else {
        view.play('spawn');
        a.oneShotMs = ONE_SHOT.spawn;
      }
    } else if (o.fade || o.pop) {
      // Reduce motion replaces the pop with a fade
      a.fadeInMs = 0;
    }
    this.writePose(a);
    return a;
  }

  private spawnDummy(x: number, walkIn: boolean): Actor {
    this.dummyHits = 0;
    return this.spawnUnit(DUMMY, DUMMY_CARD, 1, x, 0, { pop: false, fade: !walkIn && this.live });
  }

  private spawnTurret(id: number, side: Side, card: CardId, visualId: VisualId, x: number): void {
    const a = this.newActor(id, side, card, x, 0);
    const v = this.art.createTurret({ visualId, side, teamPreset: this.req.teamPreset }) as TurretView & MotionView;
    v.setMotion?.({ reduce: this.req.reduceMotion, lite: this.req.lite });
    v.root.position.set(x, 0);
    a.turret = v;
    this.units.addChild(v.root);
    this.actors.set(id, a);
  }

  private spawnFort(p: Extract<ShowcasePlan, { kind: 'fort' }>, placing: boolean): void {
    const old = this.actors.get(STRUCTURE);
    if (old) this.dropActor(old);
    this.structureHits = 0;
    const a = this.newActor(STRUCTURE, 0, p.card, p.layout.fortX, 0);
    if (!this.art.createFort) {
      this.actors.set(STRUCTURE, a);
      return;
    }
    const view = this.art.createFort({ visualId: p.visualId, side: 0, teamPreset: this.req.teamPreset, kind: p.fortKind }) as FortView & MotionView;
    view.setMotion?.({ reduce: this.req.reduceMotion, lite: this.req.lite });
    if (p.fortKind === 'trap') {
      a.trap = view;
      view.setPose({ x: a.x, y: 2, hpBp: 10000, scaffoldBp: placing ? 0 : 10000, decayBp: 0, crumbleStage: 0, silenced: false });
      view.root.zIndex = 0;
    } else {
      const f = new FortUnitView(view);
      f.setFortState({ scaffoldBp: placing ? 0 : 10000, decayBp: 0, silenced: false });
      a.fort = f;
      a.view = f as unknown as ShowView;
    }
    a.y = p.fortKind === 'trap' ? 0 : -6;
    this.units.addChild(view.root);
    this.actors.set(STRUCTURE, a);
    this.writePose(a);
  }

  private applyMotion(a: Actor): void {
    const m = { reduce: this.req.reduceMotion, lite: this.req.lite };
    a.view?.setMotion?.(m);
    a.turret?.setMotion?.(m);
    a.trap?.setMotion?.(m);
    if (a.fort) (a.fort.fort as FortView & MotionView).setMotion?.(m);
  }

  /** The hero's level trim and the album's silhouette for an unowned card. */
  private dressHero(a: Actor): void {
    const p = this.plan;
    const hero = p?.kind === 'troop' ? a.side === 0 && a.card === p.card : false;
    a.pose.levelTrim = hero ? levelTrim(this.req.level) : 'none';
    if (a.view) {
      const sil = hero && this.req.silhouette;
      a.view.root.tint = sil ? 0x0b0d12 : 0xffffff;
    }
  }

  private setShield(id: number, bp: number): void {
    const a = this.actors.get(id);
    if (a) a.shieldBp = bp;
  }

  private dropActor(a: Actor): void {
    this.actors.delete(a.id);
    a.aura?.destroy();
    a.aura = null;
    a.view?.destroy();
    a.turret?.destroy();
    a.trap?.destroy();
    a.view = null;
    a.turret = null;
    a.trap = null;
    a.fort = null;
  }

  private updateActors(dt: number): void {
    for (const a of [...this.actors.values()]) {
      if (!a.view && !a.turret && !a.trap) continue;
      if (a.dying) {
        a.dieMs += dt;
        // the KO hand-off ends the body (`finished`); forts leave their rubble a moment
        const gone = a.fort ? a.dieMs >= FORT_RUBBLE_MS : (a.view?.finished === true && a.dieMs >= DEATH_LINGER_MS) || a.dieMs >= DEATH_CAP_MS;
        if (gone) {
          this.dropActor(a);
          continue;
        }
      }
      if (a.vanishMs >= 0) {
        a.vanishMs += dt;
        if (a.vanishMs >= VANISH_MS) {
          this.dropActor(a);
          continue;
        }
      }
      if (a.fadeInMs >= 0) {
        a.fadeInMs += dt;
        if (a.fadeInMs >= FADE_IN_MS) a.fadeInMs = -1;
      }
      if (a.stunMs > 0) {
        a.stunMs = Math.max(0, a.stunMs - dt);
        if (a.stunMs === 0) {
          a.frozen = false;
          a.view?.play(a.loop ?? 'idle');
        }
      }
      this.moveActor(a, dt);
      if (a.turret) {
        const d = a.id === STRUCTURE ? this.actors.get(DUMMY) : undefined;
        if (d && !d.dying && dt > 0) a.turret.aimAt(d.x);
        a.turret.update(dt);
        continue;
      }
      if (a.trap) {
        a.trap.update(dt);
        continue;
      }
      if (!a.dying && a.view && !a.fort) this.loopClip(a, dt);
      this.writePose(a);
      a.view?.update(dt);
      if (a.aura) {
        const c = a.view?.anchors.hitCenter ?? { x: 0, y: -30 };
        a.aura.root.position.set(a.x + c.x * facingOf(a.side), a.y + c.y + this.liftOf(a));
        a.aura.root.zIndex = (a.view?.root.zIndex ?? 0) - 1;
        a.aura.root.visible = !a.dying;
        a.aura.update(dt);
        if (a.aura.done) a.aura.playAt({ x: a.aura.root.x, y: a.aura.root.y }, { radius: Math.max(24, Math.round(Math.abs((a.view?.anchors.head.y ?? -60) - (a.view?.anchors.feet.y ?? 0)) * 0.55)), side: a.side });
      }
    }
  }

  private liftOf(a: Actor): number {
    const d = a.dash;
    if (!d || d.ms <= 0) return 0;
    const u = Math.min(1, d.t / d.ms);
    return -d.lift * 4 * u * (1 - u);
  }

  private moveActor(a: Actor, dt: number): void {
    let v = 0;
    if (a.dash) {
      const d = a.dash;
      d.t += dt;
      const u = Math.min(1, d.t / Math.max(1, d.ms));
      const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      const nx = d.fromX + (d.toX - d.fromX) * e;
      v = dt > 0 ? ((nx - a.x) * 1000) / dt : 0;
      a.x = nx;
      if (u >= 1) a.dash = null;
    } else if (a.walk && dt > 0) {
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
    // the walk follows the velocity toward the facing (negative backpedals), eased like the battle's gait
    const toward = v * facingOf(a.side);
    a.gaitV += (toward - a.gaitV) * (1 - Math.exp(-Math.max(0, dt) / 90));
    if (a.walk || a.dash) a.gaitV = toward;
    if (a.view && !a.fort) a.view.setGait?.({ speedLuPerS: a.walk ? toward : a.dash ? 0 : a.gaitV });
  }

  /** Idle or walk unless a one-shot (attack, hit, spawn) is still showing (the battle view's rule). */
  private loopClip(a: Actor, dt: number): void {
    const view = a.view;
    if (!view) return;
    if (a.stunMs > 0) return;
    if (a.oneShotMs > 0) {
      a.oneShotMs -= dt;
      if (a.oneShotMs > 0 && !a.walk) return;
      a.oneShotMs = 0;
    }
    if (a.dash) return;
    const want: 'idle' | 'walk' = a.walk ? 'walk' : 'idle';
    if (want !== a.loop) {
      const speed = a.walk?.speed ?? 60;
      view.play(want, want === 'walk' ? { loop: true, durationMs: walkDurationForSpeed(speed) } : { loop: true });
      a.loop = want;
    }
  }

  private writePose(a: Actor): void {
    const view = a.view;
    if (!view) return;
    const p = a.pose;
    p.x = a.x;
    p.y = a.y + this.liftOf(a);
    p.shieldBp = a.shieldBp;
    p.stunned = a.stunMs > 0;
    p.frozen = a.frozen;
    p.hpBp = a.hpBp;
    let alpha = 1;
    if (a.fadeInMs >= 0) alpha = Math.min(1, a.fadeInMs / FADE_IN_MS);
    if (a.vanishMs >= 0) alpha = Math.max(0, 1 - a.vanishMs / VANISH_MS);
    const p0 = this.plan;
    const hero = p0?.kind === 'troop' && a.side === 0 && a.card === p0.card;
    if (hero && this.req.silhouette) alpha *= 0.62;
    p.alpha = alpha;
    view.setPose(p);
    // nearer rows draw on top; flyers above everything on the ground
    view.root.zIndex = a.fort ? -100 : a.air ? 10_000 + a.id : Math.round(a.y * 10) + a.id;
  }

  // ---- the show -----------------------------------------------------------------------------

  /** Starts a move: its preconditions (a fallen hero respawns), then its beats on the stage clock. */
  private begin(move: ShowcaseMove, first = false): void {
    const p = this.plan;
    if (!p) return;
    this.prepare(move);
    this.move = move;
    this.script = moveScript(p, move, { first, dummyHits: this.dummyHits, structureHits: this.structureHits });
    this.beatIndex = 0;
    this.moveT = 0;
    this.walkSettled = false;
    this.emit();
  }

  /** What a move needs on stage before it starts (moves can be picked in any order by a tap). */
  private prepare(move: ShowcaseMove): void {
    const p = this.plan;
    if (!p) return;
    if (p.kind === 'troop') {
      // a new soldier walks in on a swept floor: what the last one dropped (a KO's weapon, a rider's
      // banner) is cleared away rather than left lying for the prop's full battle lifetime
      if (move === 'walk') this.sweepProps();
      // a fallen or departed hero pops back in at its spot (the walk move brings its own)
      if (move !== 'walk') {
        memberIds(p).forEach((id, i) => {
          const a = this.actors.get(id);
          const at = memberSpot(p, i);
          if (!a || a.dying || a.vanishMs >= 0) {
            this.spawnUnit(id, p.card, 0, at.x, at.y, { pop: !this.req.reduceMotion, fade: this.req.reduceMotion, feel: true });
            if (p.shield) this.setShield(id, 10000);
          } else if (Math.abs(a.x - at.x) > 1 && !a.walk && !a.dash) {
            a.walk = { toX: at.x, speed: p.groundSpeed };
          }
        });
      }
      const d = this.actors.get(DUMMY);
      if (!d || d.dying) this.spawnDummy(p.layout.dummyX, false);
      return;
    }
    if (p.kind === 'turret') {
      if (move === 'fire' || move === 'build') {
        const d = this.actors.get(DUMMY);
        if ((!d || d.dying) && move === 'fire') this.spawnDummy(p.layout.dummyX, false);
      }
      return;
    }
    if (p.kind === 'fort') {
      const s = this.actors.get(STRUCTURE);
      if (move === 'build') {
        this.spawnFort(p, true);
        return;
      }
      if (!s || s.dying) this.spawnFort(p, false);
      if (move !== 'idle' && move !== 'spawn') {
        const d = this.actors.get(DUMMY);
        const x = p.fortKind === 'trap' ? p.layout.fortX + 4 : p.layout.dummyX;
        if (!d || d.dying) this.spawnDummy(x, false);
      }
      return;
    }
    // powers: the targets (a jammer's turret) must stand for the cast
    if (move === 'cast') {
      if (p.foeTurret && !this.actors.get(FOE_TURRET)) this.spawnTurret(FOE_TURRET, 1, p.foeTurret.card, p.foeTurret.visualId, p.layout.centerX + p.foeTurret.x);
      const buff = p.def.effect.kind === 'buffAll';
      p.targets.forEach((x, i) => {
        const id = (buff ? ALLY : DUMMY) + i;
        const a = this.actors.get(id);
        if (!a || a.dying) {
          const card = buff ? (p.allies?.card ?? DUMMY_CARD) : DUMMY_CARD;
          this.spawnUnit(id, card, buff ? 0 : 1, p.layout.centerX + x, 0, { pop: false, fade: true });
        }
      });
    }
  }

  /** Hides the loose props on the floor (children of the unit layer that no actor owns). */
  private sweepProps(): void {
    const owned = new Set<unknown>();
    for (const a of this.actors.values()) {
      if (a.view) owned.add(a.view.root);
      if (a.turret) owned.add(a.turret.root);
      if (a.trap) owned.add(a.trap.root);
      if (a.aura) owned.add(a.aura.root);
    }
    // the prop pool still ages and frees them; hidden, they no longer litter the next round
    for (const c of this.units.children) if (!owned.has(c)) c.visible = false;
  }

  /** A walk-in ends a moment after the walkers arrive (the stage may have shortened their way in). */
  private settleWalk(): void {
    const s = this.script;
    const p = this.plan;
    if (!s || !p || this.walkSettled || s.move !== 'walk' || p.kind !== 'troop' || this.beatIndex < s.beats.length) return;
    if (memberIds(p).some((id) => this.actors.get(id)?.walk)) return;
    this.walkSettled = true;
    this.script = { ...s, ms: Math.min(s.ms, this.moveT + WALK_SETTLE_MS) };
  }

  private walkSettled = false;

  /** The next move: the loop's next (auto), or idle after a tapped move (manual). */
  private advance(): void {
    if (!this.plan) return;
    if (!this.auto) {
      if (this.move !== 'idle' || !this.script || this.moveT >= this.script.ms) {
        // after a tapped move the stage idles (a troop at its spot)
        if (this.move !== 'idle') this.begin('idle');
        else this.script = { move: 'idle', beats: [], ms: Number.POSITIVE_INFINITY };
      }
      return;
    }
    if (this.loopMoves.length === 0) return;
    this.loopIndex += 1;
    if (this.loopIndex >= this.loopMoves.length) {
      this.loopIndex = 0;
      if (this.loudLoops > 0) this.loudLoops -= 1;
    }
    this.begin(this.loopMoves[this.loopIndex] ?? 'idle');
  }

  private runBeats(): void {
    const s = this.script;
    if (!s) return;
    while (this.beatIndex < s.beats.length && (s.beats[this.beatIndex]?.at ?? Infinity) <= this.moveT) {
      const b = s.beats[this.beatIndex]!;
      this.beatIndex += 1;
      this.runBeat(b);
    }
  }

  private runBeat(b: Beat): void {
    const p = this.plan;
    if (!p) return;
    switch (b.k) {
      case 'spawn': {
        if (b.side === 0 && p.kind === 'troop' && b.id >= HERO && b.id < HERO + 3) {
          // the next soldier steps out of its card (or in from the stage's left edge): never off stage
          const x = Math.max(b.x, this.worldX(this.coverPx() * 0.3 + 6) + (b.x - p.layout.spawnX));
          this.spawnUnit(b.id, b.card, b.side, x, b.y ?? 0, { pop: b.pop && !this.req.reduceMotion, fade: !b.pop || this.req.reduceMotion, feel: true });
          return;
        }
        if (b.side === 1 && b.card === DUMMY_CARD) {
          // a dummy still standing stays; a new one marches in from beyond the edge
          const cur = this.actors.get(b.id);
          if (cur && !cur.dying) return;
          if (b.id === DUMMY) this.spawnDummy(b.x, true);
          else this.spawnUnit(b.id, DUMMY_CARD, 1, b.x, 0, { pop: false, fade: false });
          return;
        }
        // a buff's own troops still standing stay where they are (the walk beat lines them up)
        const cur = this.actors.get(b.id);
        if (b.id >= ALLY && b.id < ALLY + 3 && cur && !cur.dying && cur.vanishMs < 0 && cur.card === b.card) return;
        const pop = b.pop && !this.req.reduceMotion;
        this.spawnUnit(b.id, b.card, b.side, b.x, b.y ?? 0, { pop, fade: !pop, feel: true, ...(b.summoner !== undefined ? { summoner: b.summoner } : {}), ...(b.from !== undefined ? { from: b.from } : {}) });
        return;
      }
      case 'vanish': {
        const a = this.actors.get(b.id);
        if (!a || a.dying) return;
        a.vanishMs = 0;
        this.emitFx('fx.dust_poof', { x: a.x, y: a.y - 6 }, 2, 1, { spreadLu: 10 });
        return;
      }
      case 'walk': {
        const a = this.actors.get(b.id);
        if (!a || a.dying) return;
        if (this.req.reduceMotion && !this.manual) {
          // Reduce motion: no walking unless asked; the actor fades in where it is going
          a.x = b.toX;
          a.fadeInMs = 0;
          return;
        }
        a.walk = { toX: b.toX, speed: Math.abs(b.speed) };
        return;
      }
      case 'dash': {
        const a = this.actors.get(b.id);
        if (!a || a.dying) return;
        a.walk = null;
        a.dash = { fromX: a.x, toX: b.toX, ms: b.ms, t: 0, lift: this.req.reduceMotion ? 0 : b.lift };
        return;
      }
      case 'attack': {
        const a = this.actors.get(b.id);
        if (!a || a.dying || (!a.view && !a.fort)) return;
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
        if (!target || target.dying) return;
        if (b.target === DUMMY) this.dummyHits += 1;
        if (b.target === STRUCTURE) this.structureHits += 1;
        this.event({
          e: 'hit',
          targetId: b.target,
          sourceId: b.source,
          sourceCard: b.card,
          castId: b.castId ?? null,
          sourceKind: b.by,
          damage: 1000,
          shieldAbsorbed: 0,
          heavy: b.heavy,
          modBp: 10000,
          x: Math.round(target.x * 1000),
          dmgType: b.dmgType,
        });
        return;
      }
      case 'die': {
        const a = this.actors.get(b.id);
        if (!a || a.dying) return;
        const killer = b.killer !== null ? this.actors.get(b.killer) : undefined;
        this.event({
          e: 'died',
          id: b.id,
          side: a.side,
          card: a.card,
          killerId: b.killer,
          killerCard: killer?.card ?? null,
          killerKind: b.killer === TURRET_SOURCE ? 'turret' : b.killer === -1 ? 'power' : 'unit',
          killerSide: a.side === 0 ? 1 : 0,
          bountyGold: 0,
          bountyXp: 0,
          x: Math.round(a.x * 1000),
        });
        return;
      }
      case 'ability': {
        const a = this.actors.get(b.id);
        if (!a) return;
        this.event({ e: 'abilityUsed', id: b.id, ability: b.ability, x: Math.round((b.x ?? a.x) * 1000) });
        return;
      }
      case 'heal':
        this.event({ e: 'healed', id: b.id, amount: 1000 });
        return;
      case 'status': {
        const a = this.actors.get(b.id);
        if (!a || a.dying) return;
        if (b.status === 'stun') {
          a.stunMs = b.ms;
          a.frozen = b.frozen;
        }
        this.event({ e: 'statusApplied', id: b.id, kind: b.status, ms: b.ms, frozen: b.frozen });
        return;
      }
      case 'shield':
        this.setShield(b.id, b.bp);
        return;
      case 'turret': {
        const card = p.card;
        if (b.op === 'build') this.event({ e: 'turretBuildStart', side: 0, mount: 0, card });
        else if (b.op === 'built') this.event({ e: 'turretBuilt', side: 0, mount: 0, card });
        else this.event({ e: 'turretFired', side: 0, mount: 0, targetId: b.target ?? DUMMY });
        return;
      }
      case 'fort': {
        if (p.kind !== 'fort') return;
        const s = this.actors.get(STRUCTURE);
        if (b.op === 'place') {
          if (!s) return;
          this.event({ e: 'fortPlaced', side: 0, id: STRUCTURE, card: p.card, pad: 0, x: Math.round(s.x * 1000), cost: 0 });
          this.raiseScaffold(s, b.scaffoldMs ?? 1000);
        } else if (b.op === 'built') {
          if (s?.fort) s.fort.setFortState({ scaffoldBp: 10000, decayBp: 0, silenced: false });
          this.scaffold = null;
          this.event({ e: 'fortBuilt', id: STRUCTURE });
        } else if (b.op === 'hp' && s) {
          s.hpBp = b.hpBp ?? s.hpBp;
        }
        return;
      }
      case 'trap': {
        if (b.op === 'armed') {
          this.scaffold = null;
          this.actors.get(STRUCTURE)?.trap?.setPose({ x: p.kind === 'fort' ? p.layout.fortX : 0, y: 2, hpBp: 10000, scaffoldBp: 10000, decayBp: 0, crumbleStage: 0, silenced: false });
          this.event({ e: 'trapArmed', id: STRUCTURE });
        } else if (b.op === 'trigger') {
          const s = this.actors.get(STRUCTURE);
          this.event({ e: 'trapTriggered', id: STRUCTURE, charge: 1, x: Math.round((s?.x ?? 0) * 1000) });
        } else {
          this.event({ e: 'trapExpired', id: STRUCTURE });
        }
        return;
      }
      case 'foeTurret': {
        if (p.kind !== 'power' || !p.foeTurret) return;
        if (b.op === 'place') {
          if (this.actors.get(FOE_TURRET)) return;
          this.spawnTurret(FOE_TURRET, 1, p.foeTurret.card, p.foeTurret.visualId, p.layout.centerX + p.foeTurret.x);
          this.actors.get(FOE_TURRET)?.turret?.play('build');
          return;
        }
        const ms = b.ms ?? 1500;
        this.event({ e: 'turretSilenced', side: 1, mount: 0, untilTick: Math.floor(this.clockMs / 50) + Math.round(ms / 50) });
        return;
      }
      case 'power': {
        if (p.kind !== 'power') return;
        if (b.op === 'telegraph') {
          this.event({ e: 'powerTelegraph', side: 0, slot: p.def.slot, power: p.card, castId: 1, x: Math.round(b.x * 1000), zone: Math.round(b.zone * 1000), cost: 0, targetId: b.target ?? -1, telegraphMs: b.ms });
        } else {
          this.event({ e: 'powerImpact', side: 0, power: p.card, castId: 1, x: Math.round(b.x * 1000), index: b.index });
        }
        return;
      }
    }
  }

  /** A fort's scaffold rising (A16.14.8 build pop follows on `built`). */
  private scaffold: { a: Actor; t: number; ms: number } | null = null;

  private raiseScaffold(a: Actor, ms: number): void {
    this.scaffold = { a, t: 0, ms: Math.max(1, ms) };
  }

  private updateScaffold(dt: number): void {
    const s = this.scaffold;
    if (!s) return;
    s.t += dt;
    const bp = Math.min(9999, Math.floor((s.t / s.ms) * 10000));
    if (s.a.fort) s.a.fort.setFortState({ scaffoldBp: bp, decayBp: 0, silenced: false });
    if (s.a.trap) s.a.trap.setPose({ x: s.a.x, y: 2, hpBp: 10000, scaffoldBp: bp, decayBp: 0, crumbleStage: 0, silenced: false });
  }

  // ---- events through the battle's mapper ---------------------------------------------------

  private lookup = (id: number): UnitInfo | undefined => {
    const a = this.actors.get(id);
    if (a) return { side: a.side, card: a.card, x: a.x };
    return undefined;
  };

  private event(body: Record<string, unknown> & { e: string }, extra: { attackIndex?: number; travelMs?: number } = {}): void {
    const m = this.mapper;
    if (!m) return;
    const ev = { ...body, tick: Math.floor(this.clockMs / 50) } as unknown as SimEvent;
    m.tick = ev.tick;
    for (const a of m.map([ev], this.lookup)) this.exec(a, extra);
  }

  private exec(a: ViewAction, extra: { attackIndex?: number; travelMs?: number }): void {
    switch (a.a) {
      case 'unitClip': {
        const e = this.actors.get(a.id);
        if (!e || e.dying) return;
        if (e.fort) {
          e.fort.play(a.clip);
          return;
        }
        const view = e.view;
        if (!view) return;
        if (a.clip === 'attack' && (a.attackIndex ?? 0) >= 1) {
          view.playAlt?.(a.impactAtMs !== undefined ? { impactAtMs: a.impactAtMs } : {});
          return;
        }
        if (a.clip === 'hit' && e.oneShotMs > 0) return;
        if (a.clip === 'attack') {
          const o: { impactAtMs?: number; variant?: string } = { ...(a.impactAtMs !== undefined ? { impactAtMs: a.impactAtMs } : {}), ...(e.variant ? { variant: e.variant } : {}) };
          e.variant = null;
          (view.play as (c: ClipName | string, o?: { impactAtMs?: number; variant?: string }) => void)('attack', o);
          e.oneShotMs = (a.impactAtMs ?? 0) + ONE_SHOT.attackRecover;
        } else {
          view.play(a.clip);
          e.oneShotMs = a.clip === 'spawn' ? ONE_SHOT.spawn : a.clip === 'hit' ? ONE_SHOT.hit : ONE_SHOT.ability;
        }
        e.loop = null;
        return;
      }
      case 'unitDie': {
        const e = this.actors.get(a.id);
        if (!e || e.dying) return;
        e.dying = true;
        e.dieMs = 0;
        e.walk = null;
        e.dash = null;
        e.shieldBp = 0;
        if (e.fort) e.fort.play('die');
        else e.view?.play('die');
        e.loop = null;
        return;
      }
      case 'unitFlash':
        this.actors.get(a.id)?.view?.flash(a.ms, a.color);
        return;
      case 'unitFreeze': {
        const e = this.actors.get(a.id);
        const ms = this.hitstop(a.ms);
        if (e?.view && ms > 0) e.view.freeze(ms);
        return;
      }
      case 'fortClip':
        this.actors.get(a.id)?.fort?.fort.play(a.clip);
        return;
      case 'trapClip':
        this.actors.get(a.id)?.trap?.play(a.clip);
        return;
      case 'projectile':
        this.fire(a, extra);
        return;
      case 'fx': {
        // no own base on a card stage: its cues (a power's cast cue) have nowhere to play
        if (a.at.k === 'base' && a.at.side === 0) return;
        const at = this.anchor(a.at);
        const handles: ParticleHandle[] = [];
        this.emitFx(a.effectId, at, a.count, a.priority, { ...(a.spreadLu !== undefined ? { spreadLu: a.spreadLu } : {}), ...(a.opts ? { opts: a.opts } : {}), out: handles });
        if (a.follow && a.at.k === 'unit') this.followers.push({ handles, id: a.at.id, part: a.at.part ?? 'hit' });
        return;
      }
      case 'fxUnits': {
        for (const e of this.actors.values()) {
          if (e.side !== a.side || e.dying || !e.view || e.fort) continue;
          const at = this.anchor({ k: 'unit', id: e.id, part: 'hit' });
          const handles: ParticleHandle[] = [];
          this.emitFx(a.effectId, at, 1, a.priority, { ...(a.opts ? { opts: a.opts } : {}), out: handles });
          this.followers.push({ handles, id: e.id, part: 'hit' });
        }
        return;
      }
      case 'sound':
        this.sound(a.id, a.delayMs ?? 0, a.gap?.gapMs ?? 0, a.pitchBp, a.volumeDb);
        return;
      case 'trauma':
        if (!this.req.reduceMotion) this.shake.add(a.amount * 0.7);
        return;
      case 'freeze':
        this.freezeMs = Math.min(this.feel.globalFreezeCapMs, Math.max(this.freezeMs, this.hitstop(a.ms)));
        return;
      case 'turret': {
        const s = this.actors.get(STRUCTURE)?.turret;
        if (!s) return;
        if (a.op === 'buildStart') s.play('build');
        else if (a.op === 'built') s.play('idle');
        else if (a.op === 'fire') {
          const t = a.targetId !== undefined ? this.actors.get(a.targetId) : undefined;
          if (t) s.aimAt(t.x);
          s.play('fire');
        }
        return;
      }
      case 'telegraph': {
        const color = teamColor(this.req.teamPreset, a.side);
        this.zones.telegraph(a.x, a.zone, color, a.ms);
        if (a.targetId !== undefined) {
          const id = a.targetId;
          this.zones.lockTelegraph(() => {
            const t = this.actors.get(id);
            return t && !t.dying ? { x: t.x, y: t.y, size: t.sizeLu } : null;
          }, color, a.ms);
        }
        if (a.zone > 0) this.emitFx('fx.telegraph_zone', { x: a.x, y: 0 }, 1, 3, { opts: { zone: a.zone, side: a.side, durationMs: a.ms } });
        // Suppress marks the enemy mount it is about to jam (A2.9.10)
        const foe = this.actors.get(FOE_TURRET);
        if (foe && this.content.powers[a.power]?.effect.kind === 'suppress') {
          const pt = this.anchor({ k: 'mount', side: 1, mount: 0 });
          this.zones.jam(pt.x, pt.y, color, a.ms, false);
        }
        return;
      }
      case 'jam': {
        const pt = this.anchor({ k: 'mount', side: a.side, mount: a.mount });
        if (a.ms > 0) this.zones.jam(pt.x, pt.y, teamColor(this.req.teamPreset, a.side === 0 ? 1 : 0), a.ms, true);
        return;
      }
      default:
        // numbers, music, camera, HUD events: not on a card stage
        return;
    }
  }

  private hitstop(ms: number): number {
    return Math.round(ms * (this.req.reduceMotion ? this.feel.tuning.reduceMotion.hitstop : 1));
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
      // a follower ends with its unit (a KO, a summon or levy leaving, a hero replaced by a skin)
      if (!a || a.dying || a.vanishMs >= 0 || live.length === 0) {
        for (const h of live) this.particles?.stop(h);
        continue;
      }
      const at = this.anchor({ k: 'unit', id: f.id, part: f.part });
      for (const h of live) h.view.root.position.set(at.x, at.y);
      keep.push({ ...f, handles: live });
    }
    this.followers = keep;
  }

  /** Where an anchor is in the stage world (lu). */
  private anchor(at: Anchor): Pt {
    switch (at.k) {
      case 'world':
        return { x: at.x, y: at.y };
      case 'unit': {
        const a = this.actors.get(at.id);
        if (!a) return { x: 0, y: -30 };
        const an = a.view?.anchors;
        const f = facingOf(a.side);
        const y = a.y + this.liftOf(a);
        if (!an || at.part === 'feet') return { x: a.x, y: at.part === 'feet' ? y : y - 30 };
        if (at.part === 'head') return { x: a.x + an.head.x * f, y: y + an.head.y - 6 };
        return { x: a.x + an.hitCenter.x * f, y: y + an.hitCenter.y };
      }
      case 'base': {
        // the bases stand off stage: their effects play at the stage edge on their side (the enemy
        // gate of a jammer's turret is that turret)
        const foe = at.side === 1 ? this.actors.get(FOE_TURRET) : undefined;
        if (foe) return { x: foe.x, y: at.part === 'top' ? -60 : -18 };
        const b = this.bounds();
        return { x: at.side === 0 ? b.minX - 20 : b.maxX + 20, y: at.part === 'top' ? -90 : -44 };
      }
      case 'mount': {
        const s = this.actors.get(at.side === 1 ? FOE_TURRET : STRUCTURE);
        const t = s?.turret as (TurretView & { extentLu?(): { top: number } | null }) | null | undefined;
        const top = t?.extentLu?.()?.top ?? 46;
        return { x: (s?.x ?? 0) + (at.side === 1 ? -4 : 6), y: -Math.round(top * 0.62) };
      }
    }
  }

  private fire(a: Extract<ViewAction, { a: 'projectile' }>, extra: { attackIndex?: number; travelMs?: number }): void {
    const from = this.origin(a.from, a.attackIndex ?? extra.attackIndex ?? 0);
    const t = this.actors.get(a.targetId);
    const to = t ? this.anchor({ k: 'unit', id: t.id, part: 'hit' }) : { x: a.toX, y: -30 };
    const ms = extra.travelMs ?? a.travelMs;
    if (a.visualId.startsWith('fx.')) {
      this.emitFx(a.visualId, from, 1, 2, { opts: { toX: to.x, toY: to.y, ms, side: a.side ?? 0 } });
      return;
    }
    if (!a.visualId) return;
    const view = this.art.createProjectile(a.visualId, a.side ?? 0);
    view.fly(from, to, ms, a.arc);
    this.shots.addChild(view.root);
    this.flying.push({ view });
  }

  /** Where a shot leaves: the playing variant's muzzle, a turret's live muzzle, a tower's anchor. */
  private origin(from: number, attackIndex: number): Pt {
    if (from === TURRET_SOURCE) {
      const s = this.actors.get(STRUCTURE);
      const m = (s?.turret as (TurretView & { muzzlePoint?(): Pt }) | null | undefined)?.muzzlePoint?.();
      return m ?? { x: (s?.x ?? 0) + 10, y: -34 };
    }
    if (from === SHOOTER) {
      const b = this.bounds();
      return { x: b.maxX + 60, y: -46 };
    }
    const a = this.actors.get(from);
    if (!a) return { x: 0, y: -30 };
    const f = facingOf(a.side);
    const m = a.view?.muzzleNow?.(attackIndex) ?? a.view?.anchors.muzzle ?? a.fort?.anchors.muzzle ?? { x: 10, y: -30 };
    return { x: a.x + m.x * f, y: a.y + this.liftOf(a) + m.y };
  }

  // ---- sound ----------------------------------------------------------------------------------

  private sound(id: string, delayMs: number, gapMs: number, pitchBp?: number, volumeDb?: number): void {
    if (!this.req.sound) return;
    if (!this.manual && this.loudLoops <= 0) return;
    const at = this.clockMs + Math.max(0, delayMs);
    const gap = Math.max(gapMs, 40);
    const last = this.lastSound.get(id);
    if (last !== undefined && at - last < gap) return;
    this.lastSound.set(id, at);
    this.sounds.push({ at, id, ...(pitchBp !== undefined ? { pitchBp } : {}), volumeDb: (volumeDb ?? 0) + SHOWCASE_VOLUME_DB });
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
        // a missing sound never breaks the stage
      }
    }
  }

  // ---- layout and drawing ---------------------------------------------------------------------

  /** The world box the action needs (lu): everything that must be seen right of the card overlay. */
  private bounds(): { minX: number; maxX: number; top: number; heroH: number } {
    const p = this.plan;
    const heightOf = (id: number, fb: number): number => {
      const v = this.actors.get(id)?.view;
      return v ? Math.max(20, -v.anchors.head.y + 10) : fb;
    };
    if (!p) return { minX: -100, maxX: 60, top: -120, heroH: 70 };
    const dummyH = 64;
    if (p.kind === 'troop') {
      const h = heightOf(HERO, 70);
      const half = this.extents.heroBack ?? (p.sizeLu * 1.4) / 2;
      const back = Math.min(0, ...p.layout.members.map((m) => m.dx));
      return { minX: p.layout.heroX + back - half - 4, maxX: p.layout.dummyX + (this.extents.dummyBack ?? DUMMY_BACK) + 8, top: -(p.layout.altitude + h + 10), heroH: h + p.layout.altitude };
    }
    if (p.kind === 'turret') {
      // the sheet's measured size where the art can say it (a sprite's bounds include its empty frame)
      const s = this.actors.get(STRUCTURE)?.turret as (TurretView & { extentLu?(): { front: number; back: number; top: number } | null }) | null | undefined;
      const e = s?.extentLu?.() ?? null;
      const h = e ? Math.max(30, e.top) : 72;
      return { minX: p.layout.turretX - (e ? e.back : 34) - 4, maxX: p.layout.dummyX + DUMMY_BACK + 8, top: -(h + 10), heroH: h };
    }
    if (p.kind === 'fort') {
      const h = p.fortKind === 'trap' ? dummyH : p.fortKind === 'tower' ? 130 : 100;
      return { minX: p.layout.fortX - (p.fortKind === 'trap' ? 40 : 60), maxX: (p.fortKind === 'trap' ? p.layout.fortX + 40 : p.layout.dummyX) + DUMMY_BACK + 12, top: -(h + 12), heroH: h };
    }
    return { minX: p.layout.centerX - p.zone / 2 - 26, maxX: p.layout.centerX + p.zone / 2 + 26, top: -150, heroH: 120 };
  }

  /**
   * The card overlay's right edge in stage px: 0 without one, and 0 when the card sits below the floor
   * line (a tall desktop stage), where the action may use the full width above it.
   */
  private coverPx(): number {
    const f = this.req.frame;
    return f && f.coverRight > 0 && f.coverTop < f.groundY - 0.04 ? this.width * f.coverRight : 0;
  }

  /** World x (lu) at stage x (px), with the current placement. */
  private worldX(px: number): number {
    return (px - this.world.position.x) / Math.max(0.0001, this.scale);
  }

  /** Scales and places the world so the action fits right of the card overlay, feet on the ground. */
  private place(): void {
    const W = this.width;
    const H = this.height;
    const f = this.req.frame ?? { groundY: 0.82, coverRight: 0, coverTop: 1 };
    const ground = H * f.groundY;
    const cover = this.coverPx() > 0 ? W * Math.max(0, Math.min(0.7, f.coverRight - COVER_OVERLAP)) : 0;
    const margin = Math.max(8, Math.round(W * 0.025));
    const b = this.bounds();
    const free = Math.max(40, W - cover - margin * 2);
    const sW = free / Math.max(1, b.maxX - b.minX);
    const sH = (ground - Math.min(TOP_ROOM_PX, H * 0.14)) / Math.max(1, -b.top);
    const sHero = (H * heroShare(b.heroH)) / Math.max(1, b.heroH);
    const s = Math.max(MIN_SCALE, Math.min(SHOWCASE_MAX_SCALE, sW, sH, sHero));
    this.scale = s;
    const used = (b.maxX - b.minX) * s;
    const ox = cover + margin + (free - used) / 2 - b.minX * s;
    const sh = this.shake.offset();
    this.world.scale.set(s);
    this.world.position.set(Math.round(ox + sh.x), Math.round(ground + sh.y));
  }

  /** A flyer's shadow on the ground (ground units carry their own contact shadow), as in a battle. */
  private drawGround(): void {
    const g = this.ground;
    g.clear();
    if (this.req.lite) return;
    for (const a of this.actors.values()) {
      if (!a.view || !a.air || (a.dying && a.dieMs > 400)) continue;
      const fade = a.vanishMs >= 0 ? Math.max(0, 1 - a.vanishMs / VANISH_MS) : a.fadeInMs >= 0 ? Math.min(1, a.fadeInMs / FADE_IN_MS) : 1;
      // the higher the flyer, the smaller and fainter its shadow
      const w = a.sizeLu * 0.62 + 6;
      g.ellipse(a.x, 2, w * 0.8, 5).fill({ color: 0x000000, alpha: 0.22 * fade });
    }
  }

  private emit(): void {
    const s = this.state();
    for (const fn of this.listeners) fn(s);
  }

  /** Exposed for tests: the actor ids on stage and the current move clock. */
  debug(): { actors: number[]; move: ShowcaseMove; t: number; plan: ShowcasePlan | null; live: boolean; hd: boolean } {
    return { actors: [...this.actors.keys()].sort((a, b) => a - b), move: this.move, t: this.moveT, plan: this.plan, live: this.live, hd: this.hd };
  }

}

/** The default drawing surface: a transparent WebGL Pixi app filling the host. Null without WebGL. */
export async function createPixiApp(host: HTMLElement, size: { width: number; height: number }): Promise<StageApp | null> {
  if (typeof document === 'undefined') return null;
  const app = new Application();
  try {
    await app.init({
      width: size.width,
      height: size.height,
      backgroundAlpha: 0,
      antialias: true,
      preference: 'webgl',
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      autoStart: false,
      sharedTicker: false,
    });
  } catch {
    try {
      app.destroy();
    } catch {
      // nothing was created
    }
    return null;
  }
  app.ticker?.stop();
  const canvas = app.canvas;
  canvas.setAttribute('data-testid', 'showcase-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  host.appendChild(canvas);
  return {
    stage: app.stage,
    render: () => app.render(),
    resize: (w, h) => app.renderer.resize(w, h),
    destroy: () => app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false }),
  };
}

