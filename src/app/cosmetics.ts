/**
 * App glue for the cosmetic collections (DESIGN A18.9.4): the battle wheel the HUD shows.
 */
import type { CompiledContent, EmoteId, SaveDoc } from '@/contracts';
import type { Content } from '@/content';

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

