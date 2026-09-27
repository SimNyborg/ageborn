/**
 * Game portal adapter (DESIGN B15 `platform.ts`, B11). v1 ships `NonePlatform` in
 * `src/platform/none.ts` (WP11): no ads, `reelReveal: true`. No ads SDK in v1 (CLAUDE.md).
 */
export interface PlatformAdapter {
  init(): Promise<void>;
  loadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  /** Resolves immediately in v1 (no ads). */
  commercialBreak(): Promise<void>;
  /** `reelReveal` gates the Wardrobe Crate reel (DESIGN A10.1). */
  features: { reelReveal: boolean; externalLinks: boolean };
}
