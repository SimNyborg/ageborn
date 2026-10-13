/**
 * The Customize diorama (PLAN 2a "Backdrop and base-skin previews", 2c, 2f interface 3; ui-plan 4.5
 * PreviewStage): a small Pixi stage with one half of the lane, the side's scene under its sky (the art
 * provider's `createBackdrop` with `scenes` and the sky as both halves' skin), its base model (`createBase`
 * with the per-age `skins`), its dressing (`createBaseDressing`: the flags on the pole, the decorations)
 * and two idle turrets of the age on its first and third mounts. Presentation only, like the card showcase
 * (`stage.ts`): no sim runs and nothing feeds back into play.
 *
 * - **Framing.** The ground line sits where the still's ground does (83% down); about 440 lu of world
 *   show above it, so the base fills the left third with its flags, and the lane runs off to the right
 *   with the scene's midground (`dioramaFraming`). Each age stands on the arena ground that suits its
 *   classic scene (`DIORAMA_GROUND`).
 * - **Lazy and light.** The stage leases what it draws from the provider first (`dioramaLease`,
 *   duck-typed: the base model, the two turret sheets, the scene's files and the ground; the files come
 *   from the caches the stills already filled) and goes live only once they are in, so the still never
 *   gives way to a stand-in. A change (an age, a tile tried on, a sky) leases the new pieces first and
 *   swaps them in when they arrive (the latest change wins); the base pops in, a new scene cross-fades.
 * - **One WebGL context.** Every stage of one `dioramaMount` draws on the same Pixi app (`SharedApp`):
 *   the newest stage takes its canvas, an older one takes it back when the newer goes, and the app
 *   outlives the last stage by a few seconds, so switching the Customize tab re-uses the context and the
 *   textures already on its GPU; then it is destroyed and its context released. World and scene sheets
 *   keep their decoded copies for exactly this (decisions "Safari and iPhone"), so a second context can
 *   upload them; unit sheets are never drawn here.
 * - **Paused.** No frames while the stage is hidden (`setVisible`: scrolled away, tab hidden). Reduce
 *   motion shows a still frame: the views settle for a moment after each change, then the loop parks
 *   (no weather, no flutter, no scanning turrets).
 * - **Damage preview.** `crumble` steps the base through its stages 0-3 (the mounts stay put, so the
 *   turrets never move); a step up lands with the base's hit shake, flash and debris.
 *
 * Owned by Track B. C0 (2026-10-08) landed the contract types (`DioramaMount`, `DioramaRequest`,
 * `DioramaHandle` in `contracts/art.ts`) and the app wiring (`AppRoot` provides the mount through the UI's
 * `DioramaContext`; Customize's `PreviewStage` mounts it after the panel's entrance and keeps its still
 * until `ready` resolves true).
 */
import { Application, Container } from 'pixi.js';
import type {
  AgeId,
  ArtProvider,
  BackdropView,
  BaseDressingView,
  BaseView,
  CompiledContent,
  CosmeticKey,
  DioramaHandle,
  DioramaMount,
  DioramaRequest,
  SideLook,
  SkinId,
  TeamPreset,
  TurretView,
  VisualId,
} from '@/contracts';
import { WORLD_LEFT_LU, WORLD_RIGHT_LU } from '../layout';

// ---------------------------------------------------------------------------------------------
// Seams (tests pass fakes)

/** The drawing surface: one transparent WebGL Pixi app, moved between the stages that use it. */
export interface DioramaApp {
  readonly stage: Container;
  /** Moves the canvas into `host` (a positioned element it fills). */
  attach(host: HTMLElement): void;
  resize(width: number, height: number): void;
  render(): void;
  destroy(): void;
}

export interface DioramaDeps {
  /** The compiled content (the age's turrets for the mounts); absent: the stage picks none. */
  content?: CompiledContent;
  /** Makes the drawing surface; resolves null when it cannot (no WebGL): the UI keeps its still. */
  createApp?: (size: { width: number; height: number }) => Promise<DioramaApp | null>;
  /** Frame scheduling (tests drive `step` themselves and pass a no-op). */
  frames?: { request(cb: (now: number) => void): number; cancel(h: number): void };
  /** Longest wait for the first look's files before the stage gives up and the still stays, ms. */
  loadTimeoutMs?: number;
  /** How long the shared app outlives its last stage, ms (a tab switch re-uses it). */
  lingerMs?: number;
}

/** Optional art-provider extras the stage uses when present (duck-typed, `visuals` provides them). */
interface LeasingArt {
  dioramaLease?(o: { age: AgeId; skin?: SkinId | null; turrets: readonly VisualId[]; scene?: CosmeticKey | null; arena: string }): { ready: Promise<void>; release(): void };
  showcaseLease?(o: { visuals: readonly { visualId: VisualId; skin?: string | null }[]; hd?: boolean }): { ready: Promise<void>; release(): void };
}

interface MotionView {
  setMotion?(m: { reduce: boolean; lite: boolean }): void;
}

// ---------------------------------------------------------------------------------------------
// Tuning

/** The ground (an arena's ground strip) each age's half stands on: the one that suits its classic scene. */
export const DIORAMA_GROUND: Readonly<Record<AgeId, string>> = {
  stone: 'tar_pits',
  bronze: 'powder_bay',
  medieval: 'kingsmoat',
  gunpowder: 'powder_bay',
  industrial: 'iron_front',
  modern: 'neon_harbor',
  future: 'orbital_ring',
  cosmic: 'chrono_rift',
};

/** The ground line's height in the stage (the still's ground strip is the bottom 17%). */
const GROUND_AT = 0.83;
/** World height shown above the ground line: the base (about 330 lu) with its flags and a strip of sky. */
const ABOVE_LU = 440;
/**
 * How far behind the gate the stage's edge is (the base's back wall and contact shadow stay inside). The
 * edge is the world's (the backdrop's strips end there), so the base stands this far in from it.
 */
const BEHIND_LU = 228;
/** At least this much world width shows (a narrow stage zooms out instead of cropping the base). */
const MIN_VIEW_LU = 520;
/** The seam between the halves: mid-lane, off the stage (both halves show the same look anyway). */
const SEAM_LU = 1000;
/** The mounts the two turrets stand on (the lower ledge and the third one: both clear of the flags). */
const TURRET_MOUNTS = [0, 2] as const;
/** Where the idle turrets look (lu along the lane from the gate) and how far their slow scan sweeps. */
const AIM_LU = 420;
const AIM_SWEEP_LU = 180;
const MAX_DT = 50;
const POP_MS = 420;
const FADE_MS = 360;
/** Reduce motion: the views run this long after a change, then the loop parks on the still frame. */
const SETTLE_MS = 900;
const LOAD_TIMEOUT_MS = 12_000;
/** A later change waits at most this long for its files; then it builds with what is in (fallbacks). */
const SWAP_TIMEOUT_MS = 4_000;
const LINGER_MS = 4_000;

/** World x of the side's gate in the diorama (its base stands behind it, toward the world's edge). */
export function dioramaGateX(side: 0 | 1): number {
  return side === 0 ? WORLD_LEFT_LU + BEHIND_LU : WORLD_RIGHT_LU - BEHIND_LU;
}

/**
 * Where the world sits in a `width` x `height` stage: px per lu, the world offset and the visible range
 * (side 0 from the world's left edge, side 1 up to its right edge, as the battle camera shows them).
 */
export function dioramaFraming(width: number, height: number, side: 0 | 1 = 0): { scale: number; x: number; y: number; left: number; viewLu: number; above: number } {
  const w = Math.max(1, width);
  const groundY = Math.max(1, height) * GROUND_AT;
  const scale = Math.max(0.05, Math.min(groundY / ABOVE_LU, w / MIN_VIEW_LU));
  const viewLu = w / scale;
  const left = side === 0 ? WORLD_LEFT_LU : WORLD_RIGHT_LU - viewLu;
  return { scale, x: -left * scale, y: groundY, left, viewLu, above: groundY / scale };
}

/** The age's two turrets for the mounts: its released starters first, then the rest, by id. */
export function dioramaTurrets(content: CompiledContent | undefined, age: AgeId): VisualId[] {
  if (!content) return [];
  const all = Object.values(content.turrets)
    .filter((t) => t.age === age && t.released !== false)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return [...all.filter((t) => t.starter), ...all.filter((t) => !t.starter)].slice(0, TURRET_MOUNTS.length).map((t) => t.visualId);
}

/** What one request draws, resolved (`DioramaRequest`'s defaults applied). */
export interface DioramaLook {
  age: AgeId;
  side: 0 | 1;
  /** The base skin per age (art skin ids), as `createBase` takes it. */
  skins: Partial<Record<AgeId, SkinId>>;
  /** The skin shown for `age`, or null for the standard base. */
  skin: SkinId | null;
  /** `scene.<id>`, or null for the age's classic scene. */
  scene: CosmeticKey | null;
  /** `backdrop.<id>`, or null for none. */
  sky: CosmeticKey | null;
  /** The dressing's look: the side's flags and decorations, its base skin key that of the skin shown. */
  dressing: SideLook;
  turrets: VisualId[];
  crumble: 0 | 1 | 2 | 3;
  teamPreset: TeamPreset;
  reduceMotion: boolean;
  lite: boolean;
}

/** Applies a request's defaults: the look's scene, sky and base skins where it names none. */
export function resolveDiorama(req: DioramaRequest, content?: CompiledContent): DioramaLook {
  const age = req.age;
  const skins: Partial<Record<AgeId, SkinId>> = {};
  if (req.baseSkins) Object.assign(skins, req.baseSkins);
  else
    for (const [a, key] of Object.entries(req.look.baseSkins ?? {}) as [AgeId, CosmeticKey | undefined][]) {
      if (key) skins[a] = key.slice(key.indexOf('.') + 1);
    }
  const skin = skins[age] ?? null;
  // the dressing reads the shown skin's cosmetic key (its tint while a model streams in, its pole trim);
  // a troop-system skin has none, which the dressing ignores
  const baseSkins: Partial<Record<AgeId, CosmeticKey>> = { ...(req.look.baseSkins ?? {}) };
  if (skin) baseSkins[age] = `baseSkin.${skin}`;
  else delete baseSkins[age];
  return {
    age,
    side: req.side === 1 ? 1 : 0,
    skins,
    skin,
    scene: req.scene !== undefined ? req.scene : (req.look.scenes?.[age] ?? null),
    sky: req.sky !== undefined ? req.sky : (req.look.backdrop ?? null),
    dressing: { ...req.look, baseSkins },
    turrets: dioramaTurrets(content, age),
    crumble: req.crumble,
    teamPreset: req.teamPreset,
    reduceMotion: req.reduceMotion,
    lite: req.lite,
  };
}

const leaseKey = (l: DioramaLook): string => `${l.age}|${l.skin ?? ''}|${l.turrets.join(',')}|${l.scene ?? ''}`;
const structureKey = (l: DioramaLook): string => `${l.age}|${l.side}|${l.skin ?? ''}|${l.turrets.join(',')}|${l.teamPreset}`;
const backdropKey = (l: DioramaLook): string => `${l.age}|${l.scene ?? ''}|${l.sky ?? ''}`;
const dressingKey = (l: DioramaLook): string => JSON.stringify([l.dressing.baseFlag ?? null, l.dressing.nationalFlag ?? null, l.dressing.decorations ?? [], l.dressing.baseSkins?.[l.age] ?? null]);

// ---------------------------------------------------------------------------------------------
// The shared app

/**
 * One WebGL context for every stage of a mount: the newest stage that wants the app draws on it (its
 * canvas moves into that stage's host), an older one takes it back when the newer is destroyed, and the
 * app is destroyed once no stage has used it for `lingerMs` (its context released with it).
 */
export class SharedApp {
  private app: DioramaApp | null = null;
  private pending: Promise<DioramaApp | null> | null = null;
  private readonly users: DioramaStage[] = [];
  private linger: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly make: (size: { width: number; height: number }) => Promise<DioramaApp | null>,
    private readonly lingerMs: number,
  ) {}

  /** The app for `user` (created on first use), which becomes the owner; null without one. */
  async acquire(user: DioramaStage, size: { width: number; height: number }): Promise<DioramaApp | null> {
    if (this.linger) {
      clearTimeout(this.linger);
      this.linger = null;
    }
    if (!this.users.includes(user)) {
      const prev = this.owner();
      this.users.push(user);
      prev?.yieldApp();
    }
    if (!this.app) {
      this.pending ??= this.make(size).then(
        (app) => {
          this.pending = null;
          this.app = app;
          if (app && this.users.length === 0) this.scheduleDestroy();
          return app;
        },
        () => {
          this.pending = null;
          return null;
        },
      );
      await this.pending;
    }
    return this.users.includes(user) ? this.app : null;
  }

  /** The stage that draws now (the newest user). */
  owner(): DioramaStage | null {
    return this.users[this.users.length - 1] ?? null;
  }

  release(user: DioramaStage): void {
    const i = this.users.indexOf(user);
    if (i < 0) return;
    const wasOwner = i === this.users.length - 1;
    this.users.splice(i, 1);
    if (wasOwner) this.owner()?.reclaimApp();
    if (this.users.length === 0) this.scheduleDestroy();
  }

  /** True while an app exists (tests). */
  get alive(): boolean {
    return this.app !== null;
  }

  private scheduleDestroy(): void {
    if (this.linger) return;
    this.linger = setTimeout(() => {
      this.linger = null;
      if (this.users.length > 0 || !this.app) return;
      const app = this.app;
      this.app = null;
      try {
        app.destroy();
      } catch {
        // a lost context throws on destroy; nothing left to free then
      }
    }, this.lingerMs);
  }
}

// ---------------------------------------------------------------------------------------------
// The stage

export class DioramaStage implements DioramaHandle {
  readonly ready: Promise<boolean>;
  private resolveReady: (ok: boolean) => void = () => {};
  private req: DioramaRequest;
  private readonly art: ArtProvider;
  private readonly content: CompiledContent | undefined;
  private app: DioramaApp | null = null;
  private lease: { release(): void } | null = null;
  private leased = '';
  private destroyed = false;
  private live = false;
  private visible = true;
  private frameHandle = 0;
  private lastFrame = -1;
  private observers: { disconnect(): void }[] = [];
  private gen = 0;
  private width = 0;
  private height = 0;
  private clockMs = 0;
  /** Reduce motion: frame time left before the loop parks on the still frame. */
  private settleMs = SETTLE_MS;

  // scene
  private readonly world = new Container();
  private readonly structures = new Container();
  private backdrop: BackdropView | null = null;
  private fading: { view: BackdropView; t: number } | null = null;
  private base: BaseView | null = null;
  private dressing: BaseDressingView | null = null;
  private turrets: TurretView[] = [];
  private built: DioramaLook | null = null;
  private popMs = 0;

  constructor(
    private readonly host: HTMLElement,
    req: DioramaRequest,
    private readonly deps: DioramaDeps & { art: ArtProvider; shared: SharedApp },
  ) {
    this.req = req;
    this.art = deps.art;
    this.content = deps.content;
    this.ready = new Promise<boolean>((r) => (this.resolveReady = r));
    this.world.label = 'diorama';
    this.structures.label = 'diorama.structures';
    this.world.addChild(this.structures);
    void this.start();
  }

  // ---- DioramaHandle --------------------------------------------------------------------------

  update(patch: Partial<Omit<DioramaRequest, 'side'>>): void {
    if (this.destroyed) return;
    this.req = { ...this.req, ...patch };
    if (this.live) void this.apply(false);
  }

  setVisible(on: boolean): void {
    if (this.destroyed || this.visible === on) return;
    this.visible = on;
    this.schedule();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.live = false;
    if (this.frameHandle) this.frames().cancel(this.frameHandle);
    this.frameHandle = 0;
    for (const o of this.observers) o.disconnect();
    this.observers = [];
    this.dropStructures();
    this.fading?.view.destroy();
    this.fading = null;
    this.backdrop?.destroy();
    this.backdrop = null;
    if (this.app && this.world.parent === this.app.stage) this.app.stage.removeChild(this.world);
    this.world.destroy({ children: true });
    this.app = null;
    this.deps.shared.release(this);
    this.lease?.release();
    this.lease = null;
    this.resolveReady(false);
  }

  // ---- the shared app ---------------------------------------------------------------------------

  /** A newer stage took the canvas: stop drawing (this one keeps its views for when it comes back). */
  yieldApp(): void {
    if (this.app && this.world.parent === this.app.stage) this.app.stage.removeChild(this.world);
    if (this.frameHandle) this.frames().cancel(this.frameHandle);
    this.frameHandle = 0;
    this.lastFrame = -1;
  }

  /** The newer stage went: take the canvas back and draw again. */
  reclaimApp(): void {
    if (this.destroyed || !this.app || !this.live) return;
    this.takeApp();
    this.wake();
    this.renderNow();
  }

  private owns(): boolean {
    return this.deps.shared.owner() === this;
  }

  private takeApp(): void {
    const app = this.app;
    if (!app) return;
    app.stage.removeChildren();
    app.stage.addChild(this.world);
    app.attach(this.host);
    app.resize(this.width, this.height);
  }

  // ---- setup ------------------------------------------------------------------------------------

  private frames(): NonNullable<DioramaDeps['frames']> {
    return (
      this.deps.frames ?? {
        request: (cb) => requestAnimationFrame(cb),
        cancel: (h) => cancelAnimationFrame(h),
      }
    );
  }

  private async start(): Promise<void> {
    this.measure();
    const app = this.deps.shared.acquire(this, { width: this.width, height: this.height });
    const first = await this.apply(true);
    const a = await app;
    if (this.destroyed) return;
    if (!first || !a) {
      // no WebGL, or the files did not come in time: the still stays
      this.destroy();
      return;
    }
    this.app = a;
    this.observe();
    this.live = true;
    if (this.owns()) this.takeApp();
    this.step(0);
    this.resolveReady(true);
    this.schedule();
    // a change that came in while the first look loaded
    if (leaseKey(resolveDiorama(this.req, this.content)) !== this.leased) void this.apply(false);
  }

  /**
   * Leases what the current request draws, then builds what changed (the latest call wins). The first
   * build gives up after the load timeout (false: the still stays); a later one builds with what is in.
   */
  private async apply(first: boolean): Promise<boolean> {
    const g = ++this.gen;
    const look = resolveDiorama(this.req, this.content);
    const key = leaseKey(look);
    if (key !== this.leased) {
      const l = this.leaseFor(look);
      if (l) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const late = new Promise<'late'>((r) => {
          timer = setTimeout(() => r('late'), first ? (this.deps.loadTimeoutMs ?? LOAD_TIMEOUT_MS) : SWAP_TIMEOUT_MS);
        });
        const r = await Promise.race([l.ready.then(() => 'ok' as const), late]);
        clearTimeout(timer);
        if (this.destroyed || g !== this.gen) {
          l.release();
          return false;
        }
        if (r === 'late' && first) {
          l.release();
          return false;
        }
        this.lease?.release();
        this.lease = l;
      }
      this.leased = key;
    }
    if (this.destroyed || g !== this.gen) return false;
    this.sync(resolveDiorama(this.req, this.content));
    return true;
  }

  private leaseFor(l: DioramaLook): { ready: Promise<void>; release(): void } | null {
    const art = this.art as ArtProvider & LeasingArt;
    if (art.dioramaLease) return art.dioramaLease({ age: l.age, skin: l.skin, turrets: l.turrets, scene: l.scene, arena: DIORAMA_GROUND[l.age] });
    if (art.showcaseLease) return art.showcaseLease({ visuals: [{ visualId: `base.${l.age}`, skin: l.skin }, ...l.turrets.map((visualId) => ({ visualId }))] });
    return null;
  }

  /** Builds the differences between what stands and `look`. */
  private sync(look: DioramaLook): void {
    const prev = this.built;
    const swap = prev !== null;
    const structures = !prev || structureKey(prev) !== structureKey(look);
    if (!prev || backdropKey(prev) !== backdropKey(look)) this.buildBackdrop(look, swap);
    if (structures) this.buildStructures(look, swap);
    else if (prev && dressingKey(prev) !== dressingKey(look)) this.buildDressing(look);
    const motion = !prev || prev.reduceMotion !== look.reduceMotion || prev.lite !== look.lite;
    this.built = look;
    if (motion) this.applyMotion();
    if (structures || prev?.crumble !== look.crumble) {
      this.base?.setCrumble(look.crumble);
      // a step up lands like a hit (shake, flash, debris; the flags whip); the mounts stay put
      if (!structures && prev && look.crumble > prev.crumble && !look.reduceMotion) {
        this.base?.hit();
        this.dressing?.hit();
      }
    }
    this.frame();
    this.wake();
    this.renderNow();
  }

  private buildBackdrop(look: DioramaLook, fade: boolean): void {
    const scenes = look.scene ? { [look.age]: look.scene } : {};
    const view = this.art.createBackdrop({
      left: look.age,
      right: look.age,
      arena: DIORAMA_GROUND[look.age],
      skins: { left: look.sky, right: look.sky },
      scenes: { left: scenes, right: scenes },
    });
    view.setSeam(SEAM_LU);
    (view as MotionView).setMotion?.({ reduce: look.reduceMotion, lite: look.lite });
    // the old scene fades out under the new one's fade-in (at once under Reduce motion)
    this.fading?.view.destroy();
    this.fading = null;
    const old = this.backdrop;
    if (old && fade && !look.reduceMotion) {
      this.fading = { view: old, t: 0 };
      view.root.alpha = 0;
    } else old?.destroy();
    this.world.addChildAt(view.root, old && this.fading ? this.world.getChildIndex(old.root) + 1 : 0);
    this.backdrop = view;
  }

  private dropStructures(): void {
    for (const t of this.turrets) t.destroy();
    this.turrets = [];
    this.dressing?.destroy();
    this.dressing = null;
    this.base?.destroy();
    this.base = null;
  }

  private buildStructures(look: DioramaLook, pop: boolean): void {
    this.dropStructures();
    const side = look.side;
    const base = this.art.createBase({ age: look.age, skins: look.skins, side, teamPreset: look.teamPreset });
    base.root.position.set(dioramaGateX(side), 0);
    this.structures.addChild(base.root);
    this.base = base;
    this.buildDressing(look);
    const pts = base.mountPoints();
    look.turrets.forEach((visualId, i) => {
      const t = this.art.createTurret({ visualId, side, teamPreset: look.teamPreset });
      const p = pts[TURRET_MOUNTS[i] ?? 0];
      if (p) t.root.position.set(p.x, p.y);
      t.root.scale.x = side === 1 ? -1 : 1;
      this.structures.addChild(t.root);
      t.play('idle');
      t.aimAt(this.aimX(i));
      this.turrets.push(t);
    });
    // the swap lands with a small pop about the base's foot (a fade under Reduce motion)
    this.popMs = pop ? POP_MS : 0;
  }

  private buildDressing(look: DioramaLook): void {
    this.dressing?.destroy();
    this.dressing = null;
    if (!this.base) return;
    this.dressing = this.art.createBaseDressing?.({ age: look.age, side: look.side, look: look.dressing, teamPreset: look.teamPreset, base: this.base }) ?? null;
    (this.dressing as MotionView | null)?.setMotion?.({ reduce: look.reduceMotion, lite: look.lite });
  }

  private applyMotion(): void {
    const l = this.built;
    if (!l) return;
    const m = { reduce: l.reduceMotion, lite: l.lite };
    for (const v of [this.backdrop, this.fading?.view, this.base, this.dressing, ...this.turrets]) (v as MotionView | null | undefined)?.setMotion?.(m);
  }

  /** World x the turret `i` looks at: down the lane, sweeping slowly (still under Reduce motion). */
  private aimX(i: number): number {
    const l = this.built;
    const side = l?.side ?? 0;
    const dir = side === 1 ? -1 : 1;
    const sweep = l && !l.reduceMotion ? Math.sin(this.clockMs / 2600 + i * 2.1) * AIM_SWEEP_LU : 0;
    return dioramaGateX(side) + dir * (AIM_LU + i * 90 + sweep);
  }

  private measure(): void {
    const r = this.host.getBoundingClientRect?.();
    this.width = Math.max(1, Math.round(r?.width || this.host.clientWidth || 360));
    this.height = Math.max(1, Math.round(r?.height || this.host.clientHeight || 220));
  }

  /** Places the world for the stage size and tells the backdrop what it shows. */
  private frame(): void {
    const f = dioramaFraming(this.width, this.height, this.built?.side ?? 0);
    this.world.position.set(f.x, f.y);
    this.world.scale.set(f.scale);
    const tell = (v: BackdropView | null | undefined): void => (v as (BackdropView & { setView?(left: number, width: number, above: number): void }) | null | undefined)?.setView?.(f.left, f.viewLu, f.above);
    tell(this.backdrop);
    tell(this.fading?.view);
  }

  private observe(): void {
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(() => {
      const w = this.width;
      const h = this.height;
      this.measure();
      if (w === this.width && h === this.height) return;
      if (this.owns()) this.app?.resize(this.width, this.height);
      this.frame();
      this.wake();
      this.renderNow();
    });
    ro.observe(this.host);
    this.observers.push(ro);
  }

  // ---- frames -----------------------------------------------------------------------------------

  /** Advances the stage by `dtMs` and draws (the frame loop calls it; tests call it directly). */
  step(dtMs: number): void {
    if (this.destroyed || !this.live) return;
    const dt = Math.max(0, Math.min(MAX_DT, dtMs));
    this.clockMs += dt;
    const reduce = this.built?.reduceMotion ?? false;
    if (reduce) this.settleMs -= dt;
    this.backdrop?.update(dt);
    const f = this.fading;
    if (f) {
      f.t += dt;
      f.view.update(dt);
      const u = Math.min(1, f.t / FADE_MS);
      if (this.backdrop) this.backdrop.root.alpha = u * u * (3 - 2 * u);
      if (u >= 1) {
        f.view.destroy();
        this.fading = null;
      }
    }
    this.base?.update(dt);
    this.dressing?.update(dt);
    this.turrets.forEach((t, i) => {
      if (!reduce) t.aimAt(this.aimX(i));
      t.update(dt);
    });
    this.stepArrival(dt, reduce);
    this.app?.render();
  }

  /** The new base's pop (an overshoot about its foot) or, under Reduce motion, its fade-in. */
  private stepArrival(dt: number, reduce: boolean): void {
    const s = this.structures;
    const side = this.built?.side ?? 0;
    const cx = dioramaGateX(side) + (side === 1 ? 1 : -1) * 92;
    if (this.popMs <= 0) {
      s.pivot.set(0, 0);
      s.position.set(0, 0);
      s.scale.set(1);
      s.alpha = 1;
      return;
    }
    this.popMs = Math.max(0, this.popMs - dt);
    const u = 1 - this.popMs / POP_MS;
    if (reduce) {
      s.alpha = Math.min(1, u * 1.6);
      return;
    }
    // ease-out-back: 0.94 → 1.03 → 1, the width a touch behind the height (squash and stretch)
    const back = (x: number): number => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
    const k = 0.94 + 0.06 * back(u);
    s.pivot.set(cx, 0);
    s.position.set(cx, 0);
    s.scale.set(k + (1 - k) * 0.35, k);
    s.alpha = Math.min(1, u * 3);
  }

  private renderNow(): void {
    if (!this.live || !this.owns()) return;
    this.step(0);
  }

  /** Reduce motion: run the views a moment longer (a change settles), then park again. */
  private wake(): void {
    this.settleMs = SETTLE_MS;
    this.schedule();
  }

  /** Runs the frame loop while live, owning the app and visible; parked once a still frame has settled. */
  private schedule(): void {
    if (this.destroyed || !this.live) return;
    const parked = (this.built?.reduceMotion ?? false) && this.settleMs <= 0 && !this.fading && this.popMs <= 0;
    const want = this.visible && this.owns() && !parked;
    if (!want) {
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
      if (dt >= 14 || this.lastFrame < 0) {
        this.lastFrame = now;
        this.step(dt);
      }
      if ((this.built?.reduceMotion ?? false) && this.settleMs <= 0 && !this.fading && this.popMs <= 0) {
        this.lastFrame = -1;
        return;
      }
      this.frameHandle = this.frames().request(tick);
    };
    this.frameHandle = this.frames().request(tick);
  }

  /** Exposed for tests and the dev pages: what stands and whether it draws. */
  debug(): { live: boolean; owner: boolean; running: boolean; look: DioramaLook | null; turrets: number; fading: boolean } {
    return { live: this.live, owner: this.owns(), running: this.frameHandle !== 0, look: this.built, turrets: this.turrets.length, fading: this.fading !== null };
  }
}

/** The default drawing surface: a transparent WebGL Pixi app whose canvas fills its host. Null without WebGL. */
export async function createDioramaApp(size: { width: number; height: number }): Promise<DioramaApp | null> {
  // no browser canvas (unit tests, a server render): the UI keeps its still
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') return null;
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
  canvas.setAttribute('data-testid', 'diorama-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  return {
    stage: app.stage,
    attach: (host) => {
      if (canvas.parentElement !== host) host.appendChild(canvas);
    },
    resize: (w, h) => app.renderer.resize(w, h),
    render: () => app.render(),
    destroy: () => app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false }),
  };
}

/** The diorama mount for this art provider: every stage it mounts shares one Pixi app (see the module note). */
export function dioramaMount(art: ArtProvider, o: DioramaDeps = {}): DioramaMount | null {
  const shared = new SharedApp(o.createApp ?? createDioramaApp, o.lingerMs ?? LINGER_MS);
  return (host, req) => new DioramaStage(host, req, { ...o, art, shared });
}
