/**
 * Game portal adapter (DESIGN B15 `platform.ts`, B11). v1 ships `NonePlatform` in
 * `src/platform/none.ts` (WP11): no ads, `reelReveal: false` (A15.3: the reel is not built). No ads SDK in v1 (CLAUDE.md).
 */
export interface PlatformAdapter {
  init(): Promise<void>;
  loadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  /** Resolves immediately in v1 (no ads). */
  commercialBreak(): Promise<void>;
  /** `reelReveal` is kept for contract stability and is always `false`: there is no reel (A15.3 rule 1). */
  features: { reelReveal: boolean; externalLinks: boolean };
}
