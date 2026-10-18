/**
 * The menus' live stages, presentation only (no sim, no gameplay timing): `showcaseMount(art)` is the card
 * detail showcase (ui-plan 4.4; owner request 2026-10-07) the app and the dev pages hand the UI through its
 * `ShowcaseContext`; `menuStages(art)` gives the Customize diorama and Home's live island (queue item 37),
 * which share one Pixi app and with it one WebGL context.
 *
 * Home's island loads its code only when it first mounts (`import('./home')`, review M S9): Home's first
 * paint never waits for it, and the still island shows meanwhile.
 */
import type { ArtProvider, CompiledContent, DioramaMount, ShowcaseMount } from '@/contracts';
import { dioramaMount, sharedMenuApp, type DioramaDeps, type SharedApp } from './diorama';
import type { HomeStage, HomeStageHandle, HomeStageRequest } from './home';
import { listen as listenInput } from './inputQuiet';
import { ShowcaseStage, type ShowcaseDeps } from './stage';

export function showcaseMount(art: ArtProvider, o: Omit<ShowcaseDeps, 'art'> = {}): ShowcaseMount {
  return (host, req) => new ShowcaseStage(host, req, { ...o, art });
}

/**
 * Home's live island mount: a stage for a host and request, plus `warm()`: true while the shared app is up
 * (a return to Home within its linger), so the island may go live at once instead of after Home's idle wait.
 */
export type HomeIslandMount = ((host: HTMLElement, req: HomeStageRequest) => HomeStageHandle) & { warm(): boolean };

/**
 * The Customize diorama and Home's live island on one shared Pixi app. `shared` and `lastHome` (the newest
 * island stage) are for the dev hooks: the second context's textures and the island's frame cost.
 */
export interface MenuStages {
  diorama: DioramaMount | null;
  home: HomeIslandMount | null;
  shared: SharedApp;
  lastHome: HomeStage | null;
}

/**
 * A handle for an island whose code is still loading: it keeps the latest request, visibility and destroy,
 * and hands them to the stage once the module is in (a destroy before then means no stage at all).
 */
class LazyIsland implements HomeStageHandle {
  readonly ready: Promise<boolean>;
  private stage: HomeStage | null = null;
  private visible = true;
  private gone = false;

  constructor(
    private req: HomeStageRequest,
    load: Promise<(req: HomeStageRequest) => HomeStage>,
  ) {
    this.ready = load.then(
      (make) => {
        if (this.gone) return false;
        const s = make(this.req);
        this.stage = s;
        if (!this.visible) s.setVisible(false);
        return s.ready;
      },
      () => false,
    );
  }

  update(patch: Partial<HomeStageRequest>): void {
    if (this.gone) return;
    if (this.stage) this.stage.update(patch);
    else this.req = { ...this.req, ...patch };
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.stage?.setVisible(on);
  }

  destroy(o?: { now?: boolean }): void {
    if (this.gone) return;
    this.gone = true;
    this.stage?.destroy(o);
  }
}

/** How long a leaving island's sheets stay leased for a return (the shared app's own linger). */
const KEEP_MS = 4_000;

export function menuStages(art: ArtProvider, o: Omit<DioramaDeps, 'content'> & { content?: CompiledContent } = {}): MenuStages {
  const shared = sharedMenuApp(o);
  // the player's taps from boot on count for the island's quiet start (review M S7)
  listenInput();
  const out: MenuStages = { diorama: dioramaMount(art, { ...o, shared }), home: null, shared, lastHome: null };
  const content = o.content;
  if (content) {
    let mod: Promise<typeof import('./home')> | null = null;
    // the last island's lease, kept while the app lingers: a return to Home leases its sheets at once (review M S3)
    let kept: { release(): void } | null = null;
    let keptTimer: ReturnType<typeof setTimeout> | null = null;
    const dropKept = (): void => {
      if (keptTimer) clearTimeout(keptTimer);
      keptTimer = null;
      kept?.release();
      kept = null;
    };
    const keepLease = (lease: { release(): void } | null, k: { now: boolean }): void => {
      dropKept();
      if (!lease || k.now) {
        lease?.release();
        return;
      }
      kept = lease;
      keptTimer = setTimeout(dropKept, KEEP_MS);
    };
    const mount = (host: HTMLElement, req: HomeStageRequest): HomeStageHandle =>
      new LazyIsland(
        req,
        (mod ??= import('./home')).then((m) => (r: HomeStageRequest) => {
          const s = new m.HomeStage(host, r, { art, shared, content, keepLease, ...(o.frames ? { frames: o.frames } : {}) });
          out.lastHome = s;
          return s;
        }),
      );
    out.home = Object.assign(mount, { warm: () => shared.alive && !shared.lost });
  }
  return out;
}

export { ShowcaseStage, SHOWCASE_MAX_SCALE, createPixiApp, heroShare, type ShowcaseDeps, type StageApp } from './stage';
export type { HomeStage, HomeStageHandle, HomeStageMount, HomeStagePole, HomeStageRequest, HomeStageTroop, HomeTroopBox } from './home';
export type { HomeActor, HomeBeat, HomeCycle } from './homeScript';
export {
  autoLoop,
  arrivalMove,
  moveScript,
  planVisuals,
  showcasePlan,
  shownRange,
  variantIndex,
  windupMs,
  type Beat,
  type HeroArt,
  type MoveScript,
  type ShowcasePlan,
} from './script';
