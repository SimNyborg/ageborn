/**
 * The onboarding capsule script (DESIGN A6.5, A8, C5 #5-#7): capsules 1-5 in order, whatever kind,
 * no charges, the forced Bonker upgrade after capsule 2, the first Epic at 4, the Matriarch at 5.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { C, M, clock, fresh, lastPending, matchInput, play, rarityOf } from './helpers';

function openLast(s: SaveDoc) {
  return M.openCapsule(s, lastPending(s).id);
}

describe('onboarding script (A6.5)', () => {
  it('capsule 1 is a Bronze climb with Spear Hunter NEW and a Bonker stack; it uses no charge', () => {
    const s0 = fresh();
    const m1 = play(s0, 'tutorial', 'win');
    expect(m1.opponent.generalId).toBe('grogg');
    const cap = lastPending(m1.save);
    expect(cap).toMatchObject({ kind: 'win', tier: 'bronze', startTier: 'clay', scriptIndex: 1 });
    expect(cap.contents.stacks).toHaveLength(C.capsules.tiers.bronze.stacks);
    expect(cap.contents.stacks.map((x) => x.card)).toEqual(expect.arrayContaining(['spear_hunter', 'bonker']));
    expect(m1.save.capsules.charges).toBe(s0.capsules.charges);
    expect(m1.save.capsules.freeCapsulesLeft).toBe(s0.capsules.freeCapsulesLeft - 1);
    expect(m1.save.capsules.bag).toEqual([]);
    const o = openLast(m1.save);
    expect(o.reveal.climbs).toBe(1);
    expect(o.reveal.strikeClimbs).toEqual([false, false, false, true]);
    const spear = o.reveal.capsule.contents.stacks.find((x) => x.card === 'spear_hunter');
    expect(spear?.isNew).toBe(true);
    expect(o.save.collection['spear_hunter']?.level).toBe(1);
    // Every other stack is an owned Common: the script decides every NEW card.
    for (const st of o.reveal.capsule.contents.stacks) if (st.card !== 'spear_hunter') expect(st.isNew).toBe(false);
  });

  it('capsules 2-5 follow the table, then the bag takes over', () => {
    let s = fresh(7);
    const reveals = [];
    for (let i = 0; i < 6; i += 1) {
      const g = M.grantCapsule(s, i === 2 ? 'daily' : 'win', C, clock());
      const o = openLast(g);
      reveals.push(o.reveal);
      s = o.save;
    }
    const [c1, c2, c3, c4, c5, c6] = reveals;
    expect(c1?.capsule.contents.stacks.some((x) => x.card === 'spear_hunter' && x.isNew)).toBe(true);
    expect(c2?.capsule.tier).toBe('silver');
    expect(c2?.capsule.contents.stacks.filter((x) => x.isNew).map((x) => x.card).sort()).toEqual(['grenadier', 'pikeman']);
    // The script overrides the kind: capsule 3 is a Daily Capsule here and still the scripted Bronze.
    expect(c3?.capsule).toMatchObject({ kind: 'daily', tier: 'bronze', startTier: 'bronze', scriptIndex: 3 });
    expect(c3?.climbs).toBe(0);
    expect(c3?.capsule.contents.stacks.filter((x) => x.isNew).map((x) => x.card)).toEqual(['log_roller']);
    // Capsule 4: the first Epic, random and unowned.
    const epics = c4?.capsule.contents.stacks.filter((x) => x.rarity === 'epic') ?? [];
    expect(epics).toHaveLength(1);
    expect(epics[0]?.isNew).toBe(true);
    for (const r of [c1, c2, c3]) expect(r?.capsule.contents.stacks.some((x) => x.rarity === 'epic' || x.rarity === 'legendary')).toBe(false);
    // Capsule 5: Aeon with the Mammoth Matriarch and its first-ever walkout.
    expect(c5?.capsule.tier).toBe('aeon');
    expect(c5?.capsule.contents.stacks.find((x) => x.rarity === 'legendary')?.card).toBe('mammoth_matriarch');
    expect(c5?.firstLegendaryReveal).toEqual(['mammoth_matriarch']);
    expect(s.cosmetics.owned).toContain('mammoth_tamer');
    // After the script: bag capsules with pity again.
    expect(c6?.capsule.scriptIndex).toBeNull();
    expect(s.scriptStep).toBe(5);
    expect(s.capsules.bag.length).toBe(99);
  });

  it('after capsule 2 the forced Bonker upgrade (A8) is affordable', () => {
    let s = fresh(3);
    for (let i = 0; i < 2; i += 1) {
      const m = play(s, 'tutorial', 'win');
      s = openLast(m.save).save;
    }
    const r = M.upgrade(s, 'bonker', C);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.collection['bonker']?.level).toBe(2);
  });

  it('a scripted Age Capsule follows the script, belongs to no age and needs no age dialog', () => {
    let s = fresh(11);
    for (let i = 0; i < 4; i += 1) s = openLast(M.grantCapsule(s, 'win', C, clock())).save;
    const c = clock();
    const scriptedWin = { ...s, flags: { ...s.flags, 'meta.ladderPlayed': true } };
    const win = matchInput('daily', 'win', M.pickOpponent(scriptedWin, 'daily', C, c));
    expect(M.ageCapsuleDue(scriptedWin, win, C, c)).toBe(false);
    const cap = lastPending(M.applyMatchResult(scriptedWin, win, C, c, { age: 'modern' }).save);
    expect(cap).toMatchObject({ kind: 'age', tier: 'aeon', scriptIndex: 5, age: null });
    expect(cap.contents.stacks.some((x) => x.card === 'mammoth_matriarch')).toBe(true);
  });

  it('Age Unlock Capsules do not take a script step', () => {
    const s = fresh();
    const g = M.grantCapsule(s, 'ageUnlock', C, clock(), { age: 'modern' });
    expect(g.scriptStep).toBe(0);
    const cap = lastPending(g);
    expect(cap.scriptIndex).toBeNull();
    expect(cap.contents.stacks.map((x) => x.card).sort()).toEqual(['bazooka_trooper', 'rifleman', 'tankette', 'trench_raider']);
    expect(cap.contents.stacks.find((x) => x.card === 'bazooka_trooper')?.copies).toBe(1);
    for (const st of cap.contents.stacks) if (rarityOf(st.card) === 'common') expect(st.copies).toBe(4);
    const o = M.openCapsule(g, cap.id);
    expect(o.reveal.pityAfter).toEqual(o.reveal.pityBefore);
  });
});
