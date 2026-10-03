/**
 * The live content with the release gate open (`released: false` dropped from every card, fort, power
 * and skin), as it will compile once every held-back card's art ships. Tests of a content wave's own
 * rules (its roster, pools, side nodes, skins) run on this, so they keep checking the wave while the
 * game itself hides it (docs/decisions.md, release gate). Test data only; nothing in the game reads it.
 */
import { compileContent } from '@/content/compile';
import { counterFile, metaTables, type Content } from '@/content';
import { raw } from '@/content/raw';
import type { RawContent } from '@/content/raw/types';
import { skinList } from '@/content/skins';

function open<T extends { released?: boolean }>(x: T): T {
  const { released, ...rest } = x;
  void released;
  return rest as T;
}

/** The raw tables with every `released` flag removed. */
export const rawAllReleased: RawContent = {
  ...raw,
  ages: raw.ages.map((t) => ({ ...t, units: t.units.map(open), turrets: t.turrets.map(open), ...(t.forts ? { forts: t.forts.map(open) } : {}) })),
  powers: raw.powers.map(open),
};

/** The compiled content with the release gate open. */
export const contentAllReleased: Content = compileContent({ raw: rawAllReleased, meta: metaTables, skins: skinList.map(open), counters: counterFile });
