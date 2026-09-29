import { describe, expect, it } from 'vitest';
import type { AgeId, Loadout } from '../../src/contracts';
import { content } from '../../src/content';
import { agesOf, allCardTests, baselineLoadout, baselinePlan, cardTest, planIssues, sideConfig } from '../lib/plans';

const ages = agesOf(content);

describe('A2.14 baseline plan', () => {
  it.each(ages)('%s: 3 Commons, the AA Rare, the Support Rare, both Common turrets, the default power', (age) => {
    const l = baselineLoadout(content, age);
    const units = l.units.map((id) => (id ? content.units[id] : undefined));
    expect(units.map((u) => [u?.rarity, u?.group])).toEqual([
      ['common', 'infantry'],
      ['common', 'ranged'],
      ['common', 'heavy'],
      ['rare', 'antiArmor'],
      ['rare', 'support'],
      // A18.9: six troop slots; the baseline keeps the sixth empty
      [undefined, undefined],
    ]);
    expect(l.turrets.map((id) => (id ? content.turrets[id]?.rarity : null))).toEqual(['common', 'common']);
    expect(content.powers[l.power]?.slot).toBe('default');
    for (const id of [...l.units, ...l.turrets]) if (id !== null) expect(content.units[id]?.age ?? content.turrets[id]?.age).toBe(age);
  });

  it('is a valid A3 War Plan for every format', () => {
    for (const f of ['short', 'standard', 'full'] as const) expect(planIssues(content, baselinePlan(content), f)).toEqual([]);
  });

  it('planIssues catches A3 violations', () => {
    const plan = baselinePlan(content);
    const stone = plan.stone as Loadout;
    stone.units = [stone.units[0] ?? null, stone.units[0] ?? null, null, null, null, null];
    stone.turrets = [null, null];
    const issues = planIssues(content, plan, 'short');
    expect(issues.some((i) => i.includes('duplicate'))).toBe(true);
    expect(issues.some((i) => i.includes('no turret'))).toBe(true);
    expect(issues.some((i) => i.includes('at least 3'))).toBe(true);
  });
});

describe('A2.14 test plans', () => {
  const tests = allCardTests(content);
  const base = baselinePlan(content);

  it('covers every collectable card once', () => {
    const collectable = [
      ...Object.values(content.units).filter((u) => !u.hidden),
      ...Object.values(content.turrets),
      ...Object.values(content.powers),
    ].map((c) => c.id);
    expect(tests.map((t) => t.card).sort()).toEqual([...collectable].sort());
  });

  it('marks baseline cards as the control and changes nothing for them', () => {
    for (const t of tests.filter((x) => x.inBaseline)) {
      expect(t.replaces).toBeNull();
      expect(t.plan).toEqual(base);
    }
  });

  it('swaps exactly one card of the tested age by the A2.14 rules', () => {
    for (const t of tests.filter((x) => !x.inBaseline)) {
      for (const age of ages) {
        if (age !== t.age) expect(t.plan[age]).toEqual(base[age]);
      }
      const l = t.plan[t.age] as Loadout;
      const b = base[t.age] as Loadout;
      const diff = [...l.units.map((c, i) => [c, b.units[i]]), ...l.turrets.map((c, i) => [c, b.turrets[i]]), [l.power, b.power]].filter(([x, y]) => x !== y);
      expect(diff).toEqual([[t.card, t.replaces]]);
      if (t.kind === 'unit' && (t.rarity === 'epic' || t.rarity === 'legendary')) expect(l.units[4]).toBe(t.card);
      if (t.kind === 'turret') expect(l.turrets[1]).toBe(t.card);
      if (t.kind === 'power') expect(l.power).toBe(t.card);
      expect(planIssues(content, t.plan, 'full')).toEqual([]);
    }
  });

  it('rejects hidden and unknown cards', () => {
    expect(() => cardTest(content, 'training_dummy')).toThrow();
    expect(() => cardTest(content, 'no_such_card')).toThrow();
  });
});

describe('sideConfig', () => {
  it('levels every unit (summon sources included) and turret', () => {
    const s = sideConfig(content, baselinePlan(content), { level: 7, label: 'AI Test', isBot: true });
    for (const id of [...Object.keys(content.units), ...Object.keys(content.turrets)]) expect(s.levels[id]).toBe(7);
    expect(Object.keys(s.loadouts).sort()).toEqual([...ages].sort() as AgeId[]);
  });
});
