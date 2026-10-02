/**
 * Upgrades, Dust and crafting, Codex Level (DESIGN A6.6, A6.7, C5 #30-#31).
 */
import { describe, expect, it } from 'vitest';
import type { CardId, Rarity, SaveDoc } from '@/contracts';
import { codexLevelFor } from '../codex';
import { craftCost } from '../dust';
import { upgradeCost } from '../upgrades';
import { C, M, fresh, scripted } from './helpers';

/** A6.6 table: copies to reach level 2 ... 10 and the Amber row. */
const COPIES: Record<Rarity, number[]> = {
  common: [2, 3, 5, 8, 12, 18, 25, 35, 45],
  rare: [1, 2, 4, 6, 10, 15, 22, 30, 40],
  epic: [1, 1, 1, 2, 3, 5, 7, 10, 14],
  legendary: [1, 1, 1, 1, 1, 1, 1, 2, 2],
};
const AMBER = [20, 50, 100, 200, 350, 550, 800, 1200, 1700];
const SAMPLE: Record<Rarity, CardId> = { common: 'bonker', rare: 'friar', epic: 'sabertooth', legendary: 'chrono_titan' };

function rich(s: SaveDoc, card: CardId, level: number, copies: number): SaveDoc {
  return { ...s, currencies: { amber: 1_000_000, dust: 0 }, collection: { ...s.collection, [card]: { level, copies, isNew: false, foil: 'none' } } };
}

describe('upgrades (A6.6)', () => {
  it('costs follow the A6.6 table for every rarity; totals 153 / 130 / 44 / 11 copies and 4,970 Amber', () => {
    for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
      for (let level = 1; level < 10; level += 1) expect(upgradeCost(C, SAMPLE[r], level)).toEqual({ copies: COPIES[r][level - 1], amber: AMBER[level - 1] });
      expect(upgradeCost(C, SAMPLE[r], 10)).toBeNull();
    }
    expect(COPIES.common.reduce((a, b) => a + b)).toBe(153);
    expect(AMBER.reduce((a, b) => a + b)).toBe(4970);
  });

  it('an upgrade spends copies and Amber, raises the level and earns Codex points', () => {
    for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
      const s = rich(fresh(), SAMPLE[r], 3, 50);
      const res = M.upgrade(s, SAMPLE[r], C);
      expect(res.ok).toBe(true);
      if (!res.ok) continue;
      expect(res.value.collection[SAMPLE[r]]).toMatchObject({ level: 4, copies: 50 - COPIES[r][2]! });
      expect(res.value.currencies.amber).toBe(1_000_000 - 100);
      expect(res.value.codexPoints).toBe({ common: 1, rare: 2, epic: 4, legendary: 8 }[r]);
    }
  });

  it('reports why an upgrade is blocked', () => {
    const s = fresh();
    expect(M.upgrade(s, 'nope', C)).toEqual({ ok: false, reason: 'unknownCard' });
    expect(M.upgrade(s, 'friar', C)).toEqual({ ok: false, reason: 'notOwned' });
    expect(M.upgrade(s, 'bonker', C)).toEqual({ ok: false, reason: 'copies' });
    expect(M.upgrade({ ...s, collection: { ...s.collection, bonker: { level: 1, copies: 2, isNew: false, foil: 'none' } } }, 'bonker', C)).toEqual({ ok: false, reason: 'amber' });
    expect(M.upgrade(rich(s, 'bonker', 10, 0), 'bonker', C)).toEqual({ ok: false, reason: 'maxLevel' });
    expect(M.upgrade(s, 'stampede', C)).toEqual({ ok: false, reason: 'unknownCard' });
  });

  it('reaching L10 turns the leftover copies into Dust (A6.6 "copy past L10")', () => {
    const s = rich(fresh(), 'friar', 9, 45);
    const res = M.upgrade(s, 'friar', C);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.collection['friar']).toMatchObject({ level: 10, copies: 0 });
    expect(res.value.currencies.dust).toBe(5 * 20);
  });

  it('counts for "Upgrade 2 cards"', () => {
    let s = rich(fresh(), 'bonker', 1, 100);
    s = { ...s, quests: { ...s.quests, daily: [{ id: 'upgrade_2', progress: 0, claimed: false }] } };
    for (let i = 0; i < 2; i += 1) {
      const r = M.upgrade(s, 'bonker', C);
      if (!r.ok) throw new Error(r.reason);
      s = r.value;
    }
    expect(s.quests.daily[0]?.progress).toBe(2);
  });
});

describe('Codex Level (A6.7)', () => {
  it('15 points per level; the full collection maxed gives about 130 levels (A17.13)', () => {
    expect(codexLevelFor(0, C)).toBe(1);
    expect(codexLevelFor(14, C)).toBe(1);
    expect(codexLevelFor(15, C)).toBe(2);
    let total = 0;
    // The 88 original cards (X0 content-wave cards come on top: about 300 levels with all eight waves).
    for (const id of [...C.order.units, ...C.order.turrets].filter((x) => !(x in C.cardArena))) total += 9 * C.rarities.cards[(C.units[id] ?? C.turrets[id])!.rarity].codexPoints;
    expect(total).toBe(1944);
    expect(codexLevelFor(total, C) - 1).toBe(129);
  });

  it('level rewards: 100 Amber each, a Silver Codex Capsule at 5, a Wardrobe Crate at 10, frames, titles', () => {
    // Past the onboarding script (the first five capsules of any kind follow it, A6.5).
    let s = rich(scripted(), 'chrono_titan', 1, 0);
    s = { ...s, codexPoints: 59, codexLevel: 4 };
    s = { ...s, collection: { ...s.collection, bonker: { level: 1, copies: 999, isNew: false, foil: 'none' } } };
    const r1 = M.upgrade(s, 'bonker', C);
    if (!r1.ok) throw new Error(r1.reason);
    expect(r1.value.codexLevel).toBe(5);
    expect(r1.value.currencies.amber).toBe(s.currencies.amber - 20 + 100);
    expect(r1.value.capsules.pending.at(-1)).toMatchObject({ kind: 'codex', tier: 'silver', startTier: 'silver' });
    expect(r1.value.cosmetics.owned).toContain('bark');
    const at10 = { ...r1.value, codexPoints: 134, codexLevel: 9 };
    const r2 = M.upgrade(at10, 'bonker', C);
    if (!r2.ok) throw new Error(r2.reason);
    expect(r2.value.codexLevel).toBe(10);
    expect(r2.value.capsules.wardrobe).toHaveLength(1);
    expect(r2.value.capsules.wardrobe[0]?.source).toBe('codex');
    expect(r2.value.cosmetics.owned).toContain('collector');
  });
});

describe('Dust and crafting (A6.6)', () => {
  it('craft costs: cards 40 / 100 / 400 / 1,600; crate skins 200 / 800 / 3,000; Crystal Spire never', () => {
    expect(craftCost(C, 'bonker')).toBe(40);
    expect(craftCost(C, 'friar')).toBe(100);
    expect(craftCost(C, 'sabertooth')).toBe(400);
    expect(craftCost(C, 'chrono_titan')).toBe(1600);
    expect(craftCost(C, 'pumpkin_head')).toBe(200);
    expect(craftCost(C, 'woolly_tuskback')).toBe(800);
    expect(craftCost(C, 'kaiju_walker')).toBe(3000);
    expect(craftCost(C, 'crystal_spire')).toBeNull();
    expect(craftCost(C, 'training_dummy')).toBeNull();
    expect(craftCost(C, 'stampede')).toBeNull();
  });

  it('crafting unlocks an unowned card or adds a copy; skins become owned (C5 #31)', () => {
    const s = { ...fresh(), currencies: { amber: 0, dust: 5000 } };
    const unlock = M.craft(s, 'chrono_titan', C);
    if (!unlock.ok) throw new Error(unlock.reason);
    expect(unlock.value.collection['chrono_titan']).toEqual({ level: 1, copies: 1, isNew: true, foil: 'none' });
    expect(unlock.value.currencies.dust).toBe(3400);
    const copy = M.craft(unlock.value, 'bonker', C);
    if (!copy.ok) throw new Error(copy.reason);
    expect(copy.value.collection['bonker']?.copies).toBe(1);
    const skin = M.craft(copy.value, 'woolly_tuskback', C);
    if (!skin.ok) throw new Error(skin.reason);
    expect(skin.value.skins.owned).toContain('woolly_tuskback');
    expect(M.craft(skin.value, 'woolly_tuskback', C)).toEqual({ ok: false, reason: 'owned' });
    expect(M.craft(skin.value, 'crystal_spire', C)).toEqual({ ok: false, reason: 'notCraftable' });
    expect(M.craft({ ...s, currencies: { amber: 0, dust: 10 } }, 'bonker', C)).toEqual({ ok: false, reason: 'dust' });
    expect(M.craft({ ...s, collection: { ...s.collection, bonker: { level: 10, copies: 0, isNew: false, foil: 'none' } } }, 'bonker', C)).toEqual({
      ok: false,
      reason: 'maxLevel',
    });
  });
});
