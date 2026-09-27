/**
 * Localisation (DESIGN B15 `i18n.ts`, B4 Strings). Implemented by `src/i18n/index.ts` (WP0) with
 * EN fallback. No hard-coded UI text anywhere (CLAUDE.md).
 */

/** 'da' files ship in v1.1. */
export type Locale = 'en' | 'da';

export interface I18n {
  readonly locale: Locale;
  setLocale(l: Locale): void;
  /** Missing keys fall back to EN (DESIGN B4 Strings). */
  t(key: string, params?: Record<string, string | number>): string;
  has(key: string): boolean;
}
