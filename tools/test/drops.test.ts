import { describe, expect, it } from 'vitest';
import type { CapsuleTier, Foil, Rarity, SaveDoc } from '../../src/contracts';
import { asContent, content } from '../../src/content';
import { seedSfc32, shuffle } from '../../src/core/rng';
import { chiAlpha, climbIssue, contentBagSize, dropsChecks, dropsDefaults, DropsTally, P_MIN, runDrops, skinRarityWeights, type OpenedCapsule } from '../drops';
import { loadMeta } from '../lib/modules';

const c = asContent(content);
const PITY0: SaveDoc['pity'] = { sinceEpic: 0, sinceLegendary: 0, sinceNewCard: 0, opened: 0, wardrobeSinceEpic: 0, wardrobeSinceLegendary: 0 };

/** A capsule of `tier` holding its guaranteed rarities, then `extra`, then Commons. */
function capsule(tier: CapsuleTier, o: Partial<OpenedCapsule> & { extra?: Rarity[]; foil?: Foil } = {}): OpenedCapsule {
  const def = c.capsules.tiers[tier];
  const rarities = [...def.guaranteed, ...(o.extra ?? [])];
  while (rarities.length < def.stacks) rarities.push('common');
  return {
    stream: 0,
    kind: 'win',
    tier,
    scripted: false,
    stacks: rarities.map((rarity) => ({ rarity, foil: o.foil ?? 'none', isNew: false, card: 'bonker' })),
    skin: false,
    pityBefore: PITY0,
    unownedBefore: 0,
    ...o,
  };
}

function bag(seed: number): CapsuleTier[] {
  const tiers = c.capsules.tierOrder.flatMap((t) => Array<CapsuleTier>(c.capsules.bag[t]).fill(t));
  return shuffle(seedSfc32(seed), tiers);
}

describe('DropsTally (A6.4, A6.5)', () => {
  it('checks stack counts against the table of its arena (the all-ages table from Arena 3, A6.4)', () => {
    const last = c.arenas.list.length - 1;
    const wide = new DropsTally(content);
    const base = capsule('silver');
    wide.add(base);
    expect(wide.summary().stackCountViolations).toBe(1);
    const t = new DropsTally(content, last);
    const stacks = c.capsules.allAges.tiers.silver.stacks;
    t.add({ ...base, stacks: Array.from({ length: stacks }, (_, i) => base.stacks[i] ?? { rarity: 'common' as Rarity, foil: 'none' as Foil, isNew: false, card: 'bonker' }) });
    expect(t.summary().stackCountViolations).toBe(0);
  });

  it('accepts exact bags and flags a wrong one', () => {
    const t = new DropsTally(content, 0);
    for (const tier of [...bag(1), ...bag(2)]) t.add(capsule(tier, { extra: ['epic', 'legendary'] }));
    expect(t.summary().bag).toEqual({ groups: 2, badGroups: 0, firstBad: null });
    const wrong = bag(3);
    wrong[0] = wrong[0] === 'aeon' ? 'clay' : 'aeon';
    for (const tier of wrong) t.add(capsule(tier, { extra: ['epic', 'legendary'] }));
    const s = t.summary();
    expect(s.bag.badGroups).toBe(1);
    expect(dropsChecks(s, content).find((x) => x.id === 'drops.bag')?.verdict).toBe('fail');
  });

  it('runs chi-square tests against the published odds', () => {
    const daily = new DropsTally(content, 0);
    const odds = c.capsules.dailyOddsBp;
    for (const tier of c.capsules.tierOrder) for (let i = 0; i < odds[tier] / 10; i += 1) daily.add(capsule(tier, { kind: 'daily' }));
    expect(daily.summary().daily?.p).toBeGreaterThan(0.99);
    // Clay stacks rolled exactly at 72/22/5/1 with no pity pending.
    const t = new DropsTally(content, 0);
    const rolls: Rarity[] = [...Array<Rarity>(72).fill('common'), ...Array<Rarity>(22).fill('rare'), ...Array<Rarity>(5).fill('epic'), 'legendary'];
    for (let i = 0; i < rolls.length; i += 2) t.add(capsule('clay', { extra: [rolls[i] as Rarity, rolls[i + 1] as Rarity] }));
    const s = t.summary();
    expect(s.daily).toBeNull();
    expect(s.rarity?.observed).toEqual([72, 22, 5, 1]);
    expect(s.rarity?.p).toBeGreaterThan(0.99);
    const verdicts = Object.fromEntries(dropsChecks(s, content).map((x) => [x.id, x.verdict]));
    expect(verdicts).toMatchObject({ 'drops.daily': 'skipped', 'drops.rarity': 'pass', 'drops.guarantees': 'pass', 'drops.stackCount': 'pass' });
    // 2,000 stacks and not one foil is far from the published 5.25%.
    const plain = new DropsTally(content, 0);
    for (let i = 0; i < 1000; i += 1) plain.add(capsule('clay'));
    expect(plain.summary().foils?.p).toBeLessThan(0.01);
    expect(dropsChecks(plain.summary(), content).find((x) => x.id === 'drops.foils')?.verdict).toBe('fail');
  });

  it('leaves stacks that pity may have touched out of the rarity test', () => {
    const t = new DropsTally(content, 0);
    t.add(capsule('clay', { extra: ['epic', 'epic'], pityBefore: { ...PITY0, sinceEpic: 9 } }));
    expect(t.summary().rarity).toBeNull();
  });

  it('finds pity boundary and guarantee violations', () => {
    const t = new DropsTally(content, 0);
    for (let i = 0; i < 12; i += 1) t.add(capsule('clay', { unownedBefore: 3 }));
    const bad = capsule('silver');
    bad.stacks = bad.stacks.map((s) => ({ ...s, rarity: 'common' }));
    t.add(bad);
    const s = t.summary();
    expect(s.maxWithoutEpic).toBe(13);
    // The last capsule's pool had no unowned card left, which ends the run.
    expect(s.maxWithoutNew).toBe(12);
    expect(s.guaranteeViolations).toBe(1);
    const verdicts = Object.fromEntries(dropsChecks(s, content).map((x) => [x.id, x.verdict]));
    expect(verdicts).toMatchObject({ 'drops.epicPity': 'fail', 'drops.newCard': 'fail', 'drops.guarantees': 'fail', 'drops.legendaryPity': 'pass' });
  });

  it('checks the Legendary guarantees from the data: count, different cards, extra-stack copies', () => {
    const multi = c.capsules.tierOrder.filter((t) => c.capsules.tiers[t].guaranteed.filter((r) => r === 'legendary').length >= 2);
    expect(multi.length).toBeGreaterThan(0);
    for (const tier of multi) {
      const def = c.capsules.tiers[tier];
      let n = 0;
      const good = capsule(tier);
      good.stacks = good.stacks.map((x, i) => {
        if (x.rarity !== 'legendary') return { ...x, card: `c${i}` };
        n += 1;
        return { ...x, card: `L${i}`, copies: n === 1 ? def.copies.legendary : def.extraLegendaryCopies };
      });
      const ok = new DropsTally(content, 0);
      ok.add({ ...good, skin: true });
      expect(ok.summary().legendaryViolations, tier).toBe(0);
      // the same Legendary twice
      const dup = new DropsTally(content, 0);
      dup.add({ ...good, skin: true, stacks: good.stacks.map((x) => (x.rarity === 'legendary' ? { ...x, card: 'same' } : x)) });
      expect(dup.summary().legendaryViolations, tier).toBe(1);
      // one Legendary short (the extra stack fell back to Epic)
      const short = new DropsTally(content, 0);
      const idx = good.stacks.findIndex((x) => x.rarity === 'legendary');
      short.add({ ...good, skin: true, stacks: good.stacks.map((x, i) => (i === idx ? { ...x, rarity: 'epic' as Rarity } : x)) });
      expect(short.summary().legendaryViolations, tier).toBe(1);
    }
  });

  it('checks sure skins, skin floors and the Wardrobe pity counters', () => {
    const sure = c.capsules.tierOrder.filter((t) => c.capsules.tiers[t].skinChanceBp >= 10_000);
    expect(sure.length).toBeGreaterThan(0);
    const t = new DropsTally(content, 0);
    for (const tier of sure) t.add({ ...capsule(tier), skin: false });
    const floor = sure.find((x) => c.capsules.tiers[x].skinMinRarity !== 'rare');
    if (floor) t.add({ ...capsule(floor), skin: true, skinRarity: 'rare' });
    t.add({ ...capsule('clay'), pityAfter: { ...PITY0, wardrobeSinceEpic: 1 } });
    const s = t.summary();
    expect(s.sureSkinViolations).toBe(sure.length + (floor ? 1 : 0));
    expect(s.wardrobePityViolations).toBe(1);
    const verdicts = Object.fromEntries(dropsChecks(s, content).map((x) => [x.id, x.verdict]));
    expect(verdicts).toMatchObject({ 'drops.sureSkin': 'fail', 'drops.wardrobePity': 'fail' });
  });

  it('tests the skin rarity split of every skin tier against the renormalised Wardrobe odds (A6.4 step 7)', () => {
    const skinTiers = c.capsules.tierOrder.filter((t) => c.capsules.tiers[t].skinChanceBp > 0);
    expect(skinTiers.length).toBeGreaterThan(0);
    const rarities = ['rare', 'epic', 'legendary'] as const;
    // Exactly at the published split: passes. Aeon from Epic is 1800 : 400 (81.82% / 18.18%).
    const good = new DropsTally(content, 0);
    for (const tier of skinTiers) {
      const w = skinRarityWeights(c, c.capsules.tiers[tier].skinMinRarity);
      w.forEach((x, i) => {
        for (let n = 0; n < x / 20; n += 1) good.add({ ...capsule(tier), skin: true, skinRarity: rarities[i] });
      });
    }
    const gs = good.summary();
    for (const tier of skinTiers) expect(gs.skinRarity[tier]?.p, tier).toBeGreaterThan(0.99);
    const top = skinTiers.find((t) => c.capsules.tiers[t].skinMinRarity === 'epic');
    if (top) expect(skinRarityWeights(c, 'epic')).toEqual([0, 1800, 400]);
    const goodVerdicts = dropsChecks(gs, content).filter((x) => x.id.startsWith('drops.skinRarity.'));
    expect(goodVerdicts.map((x) => x.verdict)).toEqual(skinTiers.map(() => 'pass'));
    // A wrong split (every skin Epic) fails for each tier.
    const bad = new DropsTally(content, 0);
    for (const tier of skinTiers) for (let n = 0; n < 200; n += 1) bad.add({ ...capsule(tier), skin: true, skinRarity: 'epic' });
    const bv = Object.fromEntries(dropsChecks(bad.summary(), content).map((x) => [x.id, x.verdict]));
    for (const tier of skinTiers) expect(bv[`drops.skinRarity.${tier}`], tier).toBe('fail');
  });

  it('shares the 0.01 false-alarm budget across the chi-square checks of a run (Bonferroni)', () => {
    const checks = dropsChecks(new DropsTally(content, 0).summary(), content);
    const chi = checks.filter((x) => x.target.startsWith('chi-square'));
    expect(chi.length).toBeGreaterThan(3);
    const alpha = chiAlpha(chi.length);
    expect(alpha).toBeCloseTo(P_MIN / chi.length, 12);
    for (const x of chi) expect(x.target).toContain(`${P_MIN} / ${chi.length} checks`);
    // A p between alpha and 0.01 (seed 1's full-run Supply draw, p = 0.0074) passes; below alpha fails.
    const t = new DropsTally(content, 0);
    const odds = c.capsules.dailyOddsBp;
    for (const tier of c.capsules.tierOrder) for (let i = 0; i < odds[tier] / 10; i += 1) t.add(capsule(tier, { kind: 'daily' }));
    const s = t.summary();
    const at = (p: number) => dropsChecks({ ...s, daily: s.daily ? { ...s.daily, p } : null }, content).find((x) => x.id === 'drops.daily')?.verdict;
    expect(at(0.0074)).toBe('pass');
    expect(at(alpha / 2)).toBe('fail');
  });

  it('checks the honest climb for every start and final pair (A10)', () => {
    const order = c.capsules.tierOrder;
    const top = order.indexOf(c.capsules.summitAbove);
    for (let a = 0; a < order.length; a += 1) {
      for (let b = a; b < order.length; b += 1) {
        const main = Math.max(0, Math.min(4, Math.min(b, top) - a));
        const summit = Math.max(0, b - Math.max(top, a));
        const strikeClimbs = [0, 1, 2, 3].map((i) => i >= 4 - main);
        expect(climbIssue(c, order[b]!, { startTier: order[a]!, climbs: main + summit, strikeClimbs }), `${order[a]}>${order[b]}`).toBeNull();
      }
    }
    expect(climbIssue(c, 'aeon', { startTier: 'clay', climbs: 6, strikeClimbs: [true, false, true, true] })).toMatch(/non-climb/);
    expect(climbIssue(c, 'gold', { startTier: 'clay', climbs: 5, strikeClimbs: [true, true, true, true] })).toMatch(/summit/);
    const t = new DropsTally(content, 0);
    t.add({ ...capsule('silver'), climb: { startTier: 'clay', climbs: 2, strikeClimbs: [true, true, false, false] } });
    expect(t.summary().climbViolations).toBe(1);
  });

  it('uses the content bag size (200) for the bag groups', () => {
    expect(contentBagSize(c)).toBe(200);
  });
});

describe('runDrops', () => {
  it('uses the B12 size for full runs', () => {
    expect(dropsDefaults('full').openings).toBe(1_000_000);
  });

  it('skips with a reason until src/meta exists, and otherwise runs through the Meta contract', async (ctx) => {
    const { meta } = await loadMeta();
    const r = await runDrops({ ...dropsDefaults('smoke'), openings: 300, streams: 2 });
    if (!meta) {
      expect(r.checks.map((x) => x.verdict)).toEqual(['skipped']);
      expect(r.checks[0]?.note).toMatch(/src\/meta/);
      return;
    }
    ctx.annotate('src/meta is present: ran 300 openings through it');
    expect(r.checks.find((x) => x.id === 'drops.run')).toBeUndefined();
    expect(r.data.summary?.openings).toBe(300);
  }, 120_000);
});
