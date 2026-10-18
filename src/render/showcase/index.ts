/**
 * The menus' live stages, presentation only (no sim, no gameplay timing): `showcaseMount(art)` is the card
 * detail showcase (ui-plan 4.4; owner request 2026-10-07) the app and the dev pages hand the UI through its
 * `ShowcaseContext`; `menuStages(art)` gives the Customize diorama and Home's live island (queue item 37),
 * which share one Pixi app and with it one WebGL context.
 */
import type { ArtProvider, CompiledContent, DioramaMount, ShowcaseMount } from '@/contracts';
import { dioramaMount, sharedMenuApp, type DioramaDeps, type SharedApp } from './diorama';
import { homeStageMount, type HomeStage, type HomeStageMount } from './home';
import { ShowcaseStage, type ShowcaseDeps } from './stage';

export function showcaseMount(art: ArtProvider, o: Omit<ShowcaseDeps, 'art'> = {}): ShowcaseMount {
  return (host, req) => new ShowcaseStage(host, req, { ...o, art });
}

/**
 * The Customize diorama and Home's live island on one shared Pixi app. `shared` and `lastHome` (the newest
 * island stage) are for the dev hooks: the second context's textures and the island's frame cost.
 */
export interface MenuStages {
  diorama: DioramaMount | null;
  home: HomeStageMount | null;
  shared: SharedApp;
  lastHome: HomeStage | null;
}

export function menuStages(art: ArtProvider, o: Omit<DioramaDeps, 'content'> & { content?: CompiledContent } = {}): MenuStages {
  const shared = sharedMenuApp(o);
  const home = o.content ? homeStageMount(art, { shared, content: o.content, ...(o.frames ? { frames: o.frames } : {}) }) : null;
  const out: MenuStages = { diorama: dioramaMount(art, { ...o, shared }), home: null, shared, lastHome: null };
  if (home)
    out.home = (host, req) => {
      const s = home(host, req) as HomeStage;
      out.lastHome = s;
      return s;
    };
  return out;
}

export { ShowcaseStage, SHOWCASE_MAX_SCALE, createPixiApp, heroShare, type ShowcaseDeps, type StageApp } from './stage';
export { HomeStage, homeStageMount, type HomeStageHandle, type HomeStageMount, type HomeStagePole, type HomeStageRequest, type HomeStageTroop } from './home';
export { homeCycle, HOME_IDS, plantedSpeed, type HomeActor, type HomeBeat, type HomeCycle } from './homeScript';
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
