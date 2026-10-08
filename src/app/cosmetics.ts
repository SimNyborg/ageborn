/**
 * App glue for the cosmetic collections (DESIGN A18.9.4): the battle wheel the HUD shows, and the
 * Flag Atlas services the screens call (PLAN 2d: buy a national flag, the Atlas's progress, the search),
 * built on meta's `flagAtlas.ts` (Track D) so the screens never import meta (B2).
 */
import type { ReadonlySignal } from '@preact/signals';
import type { CompiledContent, EmoteId, I18n, Result, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import type { MetaRules } from '@/meta';
import type { ActionResult, UiServices } from '@/ui/screens';

/**
 * The player's equipped battle wheel (A18.9.4): owned emotes and quotes only; the content defaults
 * for a save without a wheel. Null without a save or collections (the fakes).
 */
export function emoteWheelOf(save: SaveDoc | null | undefined, compiled: CompiledContent): { emotes: EmoteId[]; quotes: EmoteId[]; quoteCooldownMs: number } | null {
  const cos = compiled.cosmetics as Partial<Content['cosmetics']> | null | undefined;
  const col = cos?.collections;
  if (!save || !col || !cos.emotes) return null;
  const eq = save.cosmetics.equipped;
  const owned = new Set(save.cosmetics.owned);
  const starters = new Set(col.items.filter((x) => x.source.kind === 'start').map((x) => `${x.collection}.${x.id}`));
  const base = new Set<string>(cos.emotes.map((e) => e.id));
  const ok = (k: string) => base.has(k) || starters.has(k) || owned.has(k);
  return {
    emotes: eq.emotes.filter(ok) as EmoteId[],
    quotes: eq.quotes.filter(ok) as EmoteId[],
    quoteCooldownMs: col.quoteCooldownMs,
  };
}

export interface FlagServicesDeps {
  meta: MetaRules;
  content: CompiledContent;
  save: ReadonlySignal<SaveDoc>;
  /** The names and aliases the search reads (the app's i18n). */
  i18n: Pick<I18n, 't' | 'has'>;
  /** Commits a meta result (immediately: a Dust spend is never left to the debounce, B8). */
  apply(r: Result<SaveDoc>, immediate?: boolean): ActionResult;
}

/** The Flag Atlas's services (PLAN 2d), for `createUiServices`. */
export function flagServices(d: FlagServicesDeps): Pick<UiServices, 'buyNationalFlag' | 'flagAtlasProgress' | 'searchFlags'> {
  return {
    buyNationalFlag: (key) => d.apply(d.meta.buyNationalFlag(d.save.peek(), key, d.content), true),
    // a query: reading `.value` lets the screen that calls it re-render after a purchase
    flagAtlasProgress: () => d.meta.flagAtlas(d.save.value, d.content),
    searchFlags: (query) => d.meta.searchFlags(d.content, d.i18n, query).map((x) => `${x.collection}.${x.id}`),
  };
}
