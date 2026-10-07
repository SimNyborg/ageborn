/**
 * A new save (DESIGN A3 starter kit, A6.1, A6.3, C5 #24) and the economy entry points (A6.9).
 */
import { describe, expect, it } from 'vitest';
import type { AgeId } from '@/contracts';
import { bagCapsuleAverages, copiesStillNeeded, copiesToMax, expectedCopiesX10k } from '../economy';
import { SAVE_VERSION } from '../rules';
import { C, M, TestClock, T0, fresh } from './helpers';

describe('newSave', () => {
  it('owns every Common and each age\'s Anti-heavy Rare at L1 and each default power; nothing else', () => {
    const s = fresh();
    // X0: the starter Commons (content-wave Commons are capsule cards).
    const commons = [...C.order.units, ...C.order.turrets].filter((id) => (C.units[id] ?? C.turrets[id])?.rarity === 'common' && (C.units[id] ?? C.turrets[id])?.starter === true);
    // Owner feedback 2026-09-29: the Anti-heavy Rare of every age is in the starter kit (A3).
    const antiHeavy = C.order.units.filter((id) => C.units[id]?.group === 'antiArmor' && C.units[id]?.rarity === 'rare' && C.units[id]?.starter === true);
    expect(antiHeavy).toEqual(['spear_hunter', 'phalangite', 'pikeman', 'grenadier', 'harpoon_gunner', 'bazooka_trooper', 'rail_gunner', 'graviton_halberdier']);
    expect(Object.keys(s.collection).sort()).toEqual([...commons, ...antiHeavy].sort());
    expect(commons).toHaveLength(40);
    for (const e of Object.values(s.collection)) expect(e).toEqual({ level: 1, copies: 0, isNew: false, foil: 'none' });
    // Both starters of every age (A2.9.8): Home then Field per age, in age order.
    expect(s.powersOwned).toEqual([
      'rockslide', 'stampede', 'tidal_wave', 'chariot_rush', 'arrow_storm', 'knights_charge', 'volley_fire', 'smoke_screen',
      'gun_line', 'iron_horse', 'strafing_run', 'paratroopers', 'orbital_lance', 'drone_swarm', 'starfall', 'comet_run',
    ]);
    expect(s.collection['training_dummy']).toBeUndefined();
  });

  it('12 charges, 10 free capsules, fresh bag, no Daily yet, all currencies 0 (A6.2, A6.3)', () => {
    const s = fresh();
    expect(s.capsules).toMatchObject({ charges: 12, freeCapsulesLeft: 10, clayMeter: 0, dailyBank: 0, dailyNextAt: null, bag: [], pending: [], wardrobe: [] });
    expect(s.capsules.chargesUpdatedAt).toBe(T0);
    expect(s.currencies).toEqual({ amber: 0, dust: 0 });
    expect(s).toMatchObject({ v: SAVE_VERSION, createdAt: T0, arenaIndex: 0, mmr: 1000, codexLevel: 1, codexPoints: 0, scriptStep: 0, matchesPlayed: 0 });
    expect(s.trophies).toEqual({ current: 0, best: 0, roadClaimed: [] });
  });

  it('the starter War Plan: 3 common units, the Anti-heavy Rare in slot 4 and 2 common turrets per age, playable in every format', () => {
    const s = fresh();
    expect(s.warPlans).toHaveLength(1);
    expect(s.activePlan).toBe(0);
    const plan = s.warPlans[0]!;
    for (const age of C.order.ages as AgeId[]) {
      const l = plan.loadouts[age];
      expect(l.units.filter(Boolean)).toHaveLength(4);
      expect(C.units[l.units[3]!]).toMatchObject({ group: 'antiArmor', rarity: 'rare', age });
      expect(l.units.slice(4)).toEqual([null, null]);
      expect(l.turrets.filter(Boolean)).toHaveLength(2);
      expect(C.powers[l.powers.home!]).toMatchObject({ slot: 'home', source: 'starter', age });
      expect(C.powers[l.powers.field!]).toMatchObject({ slot: 'field', source: 'starter', age });
    }
    expect(plan.loadouts.stone.units.slice(0, 4)).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter']);
  });

  it('an editable auto name, the Tar Pit banner and the Recruit title (A6.1, A5.8)', () => {
    const s = fresh();
    expect(s.profile.name).toMatch(/^(Chief|Warlord|Captain|Marshal|Elder|Scout)-\d{4}$/);
    expect(s.profile).toMatchObject({ banner: 'tar_pit', frame: 'none', title: 'recruit' });
    expect(s.cosmetics.owned.sort()).toEqual(['recruit', 'tar_pit']);
  });

  it('is deterministic in (seed, clock) and differs between seeds', () => {
    expect(fresh(42)).toEqual(fresh(42));
    expect(fresh(42).rng.capsule).not.toEqual(fresh(43).rng.capsule);
    expect(M.newSave(C, new TestClock(T0 + 1000), 42).createdAt).toBe(T0 + 1000);
  });
});

describe('economy entry points (A6.4, A6.6, A6.9)', () => {
  it('per-tier expected copies match the A6.4 table', () => {
    for (const tier of C.capsules.tierOrder) {
      expect(Math.round(expectedCopiesX10k(C, tier) / 1000) / 10).toBeCloseTo(C.capsules.tiers[tier].expectedCopiesCenti / 100, 5);
    }
  });

  it('16.1 copies and 330.3 Amber per bag capsule before pity (the 2026-09-29 ladder, Amber re-tuned 2026-10-07; A6.9)', () => {
    const a = bagCapsuleAverages(C);
    expect(Math.round(a.copiesCenti / 10) / 10).toBe(16.1);
    expect(a.amberCenti).toBe(33030);
  });


  it('copies and Amber to max one card', () => {
    expect(copiesToMax(C, 'common')).toEqual({ copies: 153, amber: 20020 });
    expect(copiesToMax(C, 'rare').copies).toBe(130);
    expect(copiesToMax(C, 'epic').copies).toBe(44);
    expect(copiesToMax(C, 'legendary').copies).toBe(11);
  });

  it('copies a card still needs for max level, counting the copies it holds (A6.6 surplus rule)', () => {
    expect(copiesStillNeeded(C, 'common', 1, 0)).toBe(153);
    expect(copiesStillNeeded(C, 'common', 8, 70)).toBe(10);
    expect(copiesStillNeeded(C, 'common', 8, 95)).toBe(0);
    expect(copiesStillNeeded(C, 'legendary', 8, 1)).toBe(3);
    expect(copiesStillNeeded(C, 'epic', 10, 0)).toBe(0);
  });
});
