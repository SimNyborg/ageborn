/**
 * `NonePlatform`: the v1 adapter for our own GitHub Pages build (DESIGN B11).
 *
 * No ads and no portal SDK (CLAUDE.md: no ads SDK in v1). Every hook is a no-op that only tracks the
 * gameplay state, so the app can call the same lifecycle it will call on a portal later.
 * `commercialBreak` resolves at once. The Wardrobe reel is on (A10.1); external links are allowed.
 */
import type { PlatformAdapter } from '@/contracts';

export class NonePlatform implements PlatformAdapter {
  readonly features = { reelReveal: true, externalLinks: true };
  /** True between `gameplayStart` and `gameplayStop`. Portals use this to suppress ads mid-play. */
  inGameplay = false;
  initialized = false;
  loaded = false;

  async init(): Promise<void> {
    this.initialized = true;
  }

  loadingFinished(): void {
    this.loaded = true;
  }

  gameplayStart(): void {
    this.inGameplay = true;
  }

  gameplayStop(): void {
    this.inGameplay = false;
  }

  /** No ads in v1: nothing to show, so the break is over immediately. */
  async commercialBreak(): Promise<void> {
    return;
  }
}
