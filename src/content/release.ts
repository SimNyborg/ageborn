/**
 * The release gate (docs/decisions.md, "Release gate for unfinished content"): a card, fort, power or
 * skin with `released: false` stays in the content, so the sim, tests and dev tools can use it, but no
 * player or bot ever meets it: compile leaves it out of every `order` list, General plan, Trophy Road
 * reward, War Path side node and counter hint, and meta checks {@link isReleased} wherever it reads the
 * records directly. A content wave sets `released: false` on each card until its art and sounds ship,
 * then flips the flag (or deletes the line). Pure; no runtime state.
 */
import type { CardId, SkinId } from '@/contracts/ids';

/** The record slots the gate reads (a `CompiledContent` or a partly compiled body). */
export interface ReleaseView {
  units: Readonly<Record<CardId, { released?: boolean } | undefined>>;
  turrets: Readonly<Record<CardId, { released?: boolean } | undefined>>;
  powers: Readonly<Record<CardId, { released?: boolean } | undefined>>;
  forts?: Readonly<Record<CardId, { released?: boolean } | undefined>>;
  skins?: Readonly<Record<SkinId, { released?: boolean; target: string } | undefined>>;
}

/**
 * Is this id released to players? True for every unit, turret, power, fort and skin without
 * `released: false`; a skin is also unreleased while its target card is. Unknown ids read as released
 * (callers check existence themselves), so content that predates the flag is unaffected.
 */
export function isReleased(c: ReleaseView, id: string): boolean {
  const skin = c.skins?.[id];
  if (skin) return skin.released !== false && isReleased(c, skin.target);
  // A fort and its hidden twin unit share one id (A16.14.8): either flag gates both.
  return c.units[id]?.released !== false && c.turrets[id]?.released !== false && c.powers[id]?.released !== false && c.forts?.[id]?.released !== false;
}

/** Every unreleased id of the content (units, turrets, powers, forts and skins), sorted. */
export function unreleasedIds(c: ReleaseView): string[] {
  const ids = new Set<string>();
  for (const rec of [c.units, c.turrets, c.powers, c.forts ?? {}, c.skins ?? {}]) {
    for (const id of Object.keys(rec)) if (!isReleased(c, id)) ids.add(id);
  }
  return [...ids].sort();
}
