/**
 * The card detail showcase (ui-plan 4.4; owner request 2026-10-07): `showcaseMount(art)` is the
 * `ShowcaseMount` the app and the dev pages hand the UI through its `ShowcaseContext`, so Card detail
 * plays the card's real battle art on a live stage. Presentation only (no sim, no gameplay timing).
 */
import type { ArtProvider, ShowcaseMount } from '@/contracts';
import { ShowcaseStage, type ShowcaseDeps } from './stage';

export function showcaseMount(art: ArtProvider, o: Omit<ShowcaseDeps, 'art'> = {}): ShowcaseMount {
  return (host, req) => new ShowcaseStage(host, req, { ...o, art });
}

export { ShowcaseStage, SHOWCASE_MAX_SCALE, createPixiApp, heroShare, type ShowcaseDeps, type StageApp } from './stage';
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
