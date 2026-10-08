/**
 * The Flag Atlas screen (PLAN 2d, 2g Track D #5-#8) on the tiny DOM, with the real meta rules behind the
 * services: the grid by region with counts and rewards, the search (accents, aliases, ISO codes, empty),
 * the region chips, the detail's one primary (claim, buy in two taps, need, fly, flying), the reward
 * reveal, and the Profile's flag. Owned by Track D.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { content } from '@/content';
import { i18n } from '@/i18n';
import { buyNationalFlag, flagAtlasProgress, searchFlags } from '@/meta/flagAtlas';
import { equipCosmetic } from '@/meta/cosmetics';
import type { UiServices } from '../../services';
import { loadFlagAtlas } from '../../ScreenHost';
import { input, text } from '../../test/dom';
import { flush, mount, saveFor, type Mounted } from '../../test/harness';
import { atlasAction, newRewards } from '../model';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

const OCEANIA = ['au', 'fj', 'ki', 'mh', 'fm', 'nr', 'nz', 'pw', 'pg', 'ws', 'sb', 'to', 'tv', 'vu'];

/** A save with exactly these national flags (and no Atlas rewards), this Dust and this flag flying. */
function withFlags(flags: readonly string[], dust: number, equip: string | null = null): SaveDoc {
  const s = saveFor('mid');
  const keep = s.cosmetics.owned.filter((k) => !k.startsWith('nationalFlag.') && !k.startsWith('baseFlag.pennant_') && k !== 'baseFlag.world_compass' && k !== 'world_ambassador');
  return {
    ...s,
    currencies: { ...s.currencies, dust },
    cosmetics: { ...s.cosmetics, owned: [...keep, ...flags.map((f) => `nationalFlag.${f}`)], equipped: { ...s.cosmetics.equipped, nationalFlag: equip } },
  };
}

/** Mounts the Atlas with the real meta rules behind the Atlas services. */
async function atlas(save: SaveDoc, route: { flag?: string; region?: 'oceania' } = {}): Promise<Mounted> {
  await loadFlagAtlas();
  const holder: { m?: Mounted } = {};
  const cur = (): SaveDoc => holder.m?.save.value ?? save;
  const patch: Partial<UiServices> = {
    flagAtlasProgress: () => flagAtlasProgress(cur(), content),
    searchFlags: (q) => searchFlags(content, i18n, q).map((x) => `nationalFlag.${x.id}`),
    buyNationalFlag: (key) => {
      holder.m?.log.calls.push({ name: 'buyNationalFlag', args: [key] });
      const r = buyNationalFlag(cur(), content, key);
      if (!r.ok) return r;
      holder.m!.save.value = r.value;
      return { ok: true };
    },
    equipCosmetic: (e) => {
      const r = equipCosmetic(cur(), content, e as Parameters<typeof equipCosmetic>[2]);
      if (!r.ok) return r;
      holder.m!.save.value = r.value;
      return { ok: true };
    },
  };
  holder.m = mount({ save, routes: [{ id: 'home' }, { id: 'flagAtlas', ...route }], patch });
  return holder.m;
}

const tiles = (mm: Mounted) => mm.qa('.fa-tile');

describe('the Flag Atlas screen', () => {
  it('shows every flag by region with its count, bar and reward, and the Atlas count', async () => {
    m = await atlas(withFlags(['dk', 'se', 'fo'], 1240, 'nationalFlag.dk'));
    expect(m.q('[data-screen="flagAtlas"]')).not.toBeNull();
    expect(text(m.q('[data-testid="atlas-count"]')!)).toBe('2/195');
    expect(tiles(m)).toHaveLength(200);
    for (const r of ['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania', 'other']) expect(m.q(`[data-testid="atlas-head-${r}"]`), r).not.toBeNull();
    expect(text(m.q('[data-testid="atlas-head-europe"]')!)).toContain('2/45');
    expect(text(m.q('[data-testid="atlas-reward-europe"]')!)).toContain('Europe Pennant');
    expect(text(m.q('[data-testid="atlas-head-other"]')!)).toContain('1/5');
    expect(m.q('[data-testid="atlas-chip-all"]')!.getAttribute('aria-pressed')).toBe('true');
    // unowned flags show the one price; owned ones do not; the flying one carries the check
    expect(text(m.q('[data-testid="flag-es"]')!)).toContain('500');
    expect(text(m.q('[data-testid="flag-se"]')!)).not.toContain('500');
    expect(m.q('[data-testid="flag-dk"] .fa-tile__check')).not.toBeNull();
    // the world reward at the foot
    expect(text(m.q('[data-testid="atlas-world"]')!)).toContain('World Compass');
  });

  it('searches every region: accents, aliases, ISO codes, and an empty result', async () => {
    m = await atlas(withFlags(['dk'], 1240));
    const search = m.q('[data-testid="atlas-search"]')!;
    const shown = () => tiles(m!).map((el) => el.getAttribute('data-testid'));
    const type = (q: string) => flush(() => input(search, q));
    type('cote');
    expect(shown()).toEqual(['flag-ci']);
    expect(text(m.q('[data-testid="atlas-results"]')!)).toBe('1 found');
    type('holland');
    expect(shown()).toEqual(['flag-nl']);
    type('gb-wls');
    expect(shown()).toEqual(['flag-gb_wls']);
    type('USA');
    expect(shown()).toEqual(['flag-us']);
    type('zzzz');
    expect(shown()).toEqual([]);
    expect(text(m.q('[data-testid="atlas-empty"]')!)).toContain('No flag matches');
    m.click('[data-testid="atlas-search-clear"]');
    expect(tiles(m)).toHaveLength(200);
  });

  it('a region chip shows that region only; the route can preselect one', async () => {
    m = await atlas(withFlags(['au'], 0), { region: 'oceania' });
    expect(tiles(m)).toHaveLength(14);
    expect(m.q('[data-testid="atlas-chip-oceania"]')!.getAttribute('aria-pressed')).toBe('true');
    m.click('[data-testid="atlas-chip-southAmerica"]');
    expect(tiles(m)).toHaveLength(12);
    m.click('[data-testid="atlas-chip-all"]');
    expect(tiles(m)).toHaveLength(200);
  });

  it('buys a flag with two taps for exactly 500, then offers to fly it; never buys twice', async () => {
    m = await atlas(withFlags(['dk'], 1240, 'nationalFlag.dk'));
    m.click('[data-testid="flag-es"]');
    expect(m.q('[data-testid="atlas-detail"]')!.getAttribute('data-action')).toBe('buy');
    const buy = '[data-testid="atlas-buy"]';
    expect(text(m.q(buy)!)).toContain('Buy · 500');
    m.click(buy);
    expect(text(m.q(buy)!)).toContain('Confirm · 500');
    expect(text(m.q(buy)!)).toContain('1,240');
    expect(text(m.q(buy)!)).toContain('740');
    expect(m.save.value.currencies.dust).toBe(1240);
    m.click(buy);
    expect(m.log.calls.filter((c) => c.name === 'buyNationalFlag')).toHaveLength(1);
    expect(m.save.value.currencies.dust).toBe(740);
    expect(m.save.value.cosmetics.owned).toContain('nationalFlag.es');
    expect(m.q(buy)).toBeNull();
    expect(m.q('[data-testid="atlas-fly"]')).not.toBeNull();
    expect(text(m.q('[data-testid="atlas-count"]')!)).toBe('2/195');
    m.click('[data-testid="atlas-fly"]');
    expect(m.save.value.cosmetics.equipped.nationalFlag).toBe('nationalFlag.es');
    expect(m.q('[data-testid="atlas-flying"]')).not.toBeNull();
  });

  it('the "flying" toast never covers the detail and closes when another flag is picked (review 1)', async () => {
    m = await atlas(withFlags(['dk', 'es'], 1240, 'nationalFlag.dk'));
    m.click('[data-testid="flag-es"]');
    m.click('[data-testid="atlas-fly"]');
    const toasts = () => [...m!.qa('[data-testid="toast"]')];
    expect(toasts()).toHaveLength(1);
    expect(text(toasts()[0]!)).toContain('Spain');
    // in the screen's usual toast place, not anchored over the detail's name, region and progress
    expect(m.qa('.ui-toast.is-anchored')).toHaveLength(0);
    m.click('[data-testid="flag-dk"]');
    expect(toasts()).toHaveLength(0);
  });

  it("the save's first flag is claimed for no Dust; too little Dust says how much more and where it comes from", async () => {
    m = await atlas(withFlags([], 100));
    expect(text(m.q('[data-testid="atlas-first"]')!)).toContain('costs no Dust');
    expect(text(m.q('[data-testid="flag-jp"]')!)).not.toContain('500');
    m.click('[data-testid="flag-jp"]');
    m.click('[data-testid="atlas-claim"]');
    m.click('[data-testid="atlas-claim"]');
    expect(m.save.value.currencies.dust).toBe(100);
    expect(m.save.value.cosmetics.owned).toContain('nationalFlag.jp');
    expect(m.q('[data-testid="atlas-first"]')).toBeNull();
    m.click('[data-testid="flag-kr"]');
    expect(text(m.q('[data-testid="atlas-need"]')!)).toContain('Need 400 more');
    m.click('[data-testid="atlas-need"]');
    expect(text(m.q('[data-testid="atlas-dust-help"]')!)).toContain('Dust comes from');
    expect(m.save.value.cosmetics.owned).not.toContain('nationalFlag.kr');
  });

  it('the purchase that completes a region reveals its pennant, once', async () => {
    m = await atlas(withFlags(['dk', ...OCEANIA.slice(0, 13)], 900, 'nationalFlag.dk'), { region: 'oceania' });
    m.click('[data-testid="flag-vu"]');
    m.click('[data-testid="atlas-buy"]');
    m.click('[data-testid="atlas-buy"]');
    expect(text(m.q('[data-testid="atlas-reveal"]')!)).toContain('Oceania complete!');
    expect(text(m.q('[data-testid="atlas-reveal"]')!)).toContain('Oceania Pennant');
    m.click('[data-testid="atlas-reveal"]');
    expect(m.q('[data-testid="atlas-reveal"]')).toBeNull();
    expect(m.save.value.cosmetics.owned.filter((k) => k === 'baseFlag.pennant_oceania')).toHaveLength(1);
    expect(text(m.q('[data-testid="atlas-head-oceania"]')!)).toContain('Oceania Pennant earned');
  });

  it('opens on a flag passed in (the Profile), with its detail', async () => {
    m = await atlas(withFlags(['dk'], 0, 'nationalFlag.dk'), { flag: 'nationalFlag.dk' });
    expect(m.q('[data-testid="atlas-detail"]')!.getAttribute('data-flag')).toBe('nationalFlag.dk');
    expect(m.q('[data-testid="atlas-flying"]')).not.toBeNull();
  });
});

describe('the Profile shows the flag and opens the Atlas', () => {
  it('a flying flag goes to its detail; none goes to the Atlas', () => {
    m = mount({ save: withFlags(['gb_wls'], 0, 'nationalFlag.gb_wls'), routes: [{ id: 'home' }, { id: 'profile' }] });
    expect(m.q('[data-testid="profile-flag"]')!.getAttribute('data-flag')).toBe('nationalFlag.gb_wls');
    m.click('[data-testid="profile-flag"]');
    expect(m.router.current.value).toMatchObject({ id: 'flagAtlas', flag: 'nationalFlag.gb_wls' });
    m.unmount();
    m = mount({ save: withFlags([], 0), routes: [{ id: 'home' }, { id: 'profile' }] });
    m.click('[data-testid="profile-flag"]');
    expect(m.router.current.value).toEqual({ id: 'flagAtlas' });
  });
});

describe('the model', () => {
  it('offers one primary per state', () => {
    expect(atlasAction({ owned: false, equipped: false }, 0, 0)).toEqual({ kind: 'claim' });
    expect(atlasAction({ owned: false, equipped: false }, 500, 1240)).toEqual({ kind: 'buy', price: 500, after: 740 });
    expect(atlasAction({ owned: false, equipped: false }, 500, 500)).toEqual({ kind: 'buy', price: 500, after: 0 });
    expect(atlasAction({ owned: false, equipped: false }, 500, 499)).toEqual({ kind: 'need', price: 500, missing: 1 });
    expect(atlasAction({ owned: true, equipped: false }, 500, 0)).toEqual({ kind: 'fly' });
    expect(atlasAction({ owned: true, equipped: true }, 500, 0)).toEqual({ kind: 'flying' });
  });

  it('reveals a reward only when it turns owned', () => {
    const a = flagAtlasProgress(withFlags(OCEANIA.slice(0, 13), 900), content);
    const done = { ...a, regions: a.regions.map((r) => (r.region === 'oceania' ? { ...r, owned: 14, rewardOwned: true } : r)) };
    expect(newRewards(a, done)).toEqual([{ kind: 'region', region: 'oceania', reward: 'baseFlag.pennant_oceania' }]);
    expect(newRewards(done, done)).toEqual([]);
  });
});
