/**
 * A new save (DESIGN A3 starter kit, A6.1, A6.3, C5 #24) and the economy entry points (A6.9).
 */
import { describe, expect, it } from 'vitest';
import type { AgeId } from '@/contracts';
import { bagCapsuleAverages, copiesToMax, expectedCopiesX10k } from '../economy';
import { SAVE_VERSION } from '../rules';
import { C, M, TestClock, T0, fresh } from './helpers';

describe('newSave', () => {
  it('owns every Common at L1 and each default power; nothing else', () => {
    const s = fresh();
    const commons = [...C.order.units, ...C.order.turrets].filter((id) => (C.units[id] ?? C.turrets[id])?.rarity === 'common');
    expect(Object.keys(s.collection).sort()).toEqual([...commons].sort());
    expect(commons).toHaveLength(40);
    for (const e of Object.values(s.collection)) expect(e).toEqual({ level: 1, copies: 0, isNew: false, foil: 'none' });
    expect(s.powersOwned).toEqual(['stampede', 'tidal_wave', 'arrow_storm', 'smoke_screen', 'iron_horse', 'paratroopers', 'orbital_lance', 'starfall']);
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

  it('the starter War Plan: 3 common units and 2 common turrets per age, playable in every format', () => {
    const s = fresh();
    expect(s.warPlans).toHaveLength(1);
    expect(s.activePlan).toBe(0);
    const plan = s.warPlans[0]!;
    for (const age of C.order.ages as AgeId[]) {
      const l = plan.loadouts[age];
      expect(l.units.filter(Boolean)).toHaveLength(3);
      expect(l.units.slice(3)).toEqual([null, null, null]);
      expect(l.turrets.filter(Boolean)).toHaveLength(2);
      expect(C.powers[l.power]?.slot).toBe('default');
    }
    expect(plan.loadouts.stone.units.slice(0, 3)).toEqual(['bonker', 'pebbler', 'tuskback']);
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
    for (const tier of ['clay', 'bronze', 'silver', 'jade', 'aeon'] as const) {
      expect(Math.round(expectedCopiesX10k(C, tier) / 1000) / 10).toBeCloseTo(C.capsules.tiers[tier].expectedCopiesCenti / 100, 5);
    }
  });

  it('15.7 copies and 398.7 Amber per bag capsule before pity (A17.13: about ×1.75)', () => {
    const a = bagCapsuleAverages(C);
    expect(Math.round(a.copiesCenti / 10) / 10).toBe(15.7);
    expect(a.amberCenti).toBe(39870);
  });

  it('copies and Amber to max one card', () => {
    expect(copiesToMax(C, 'common')).toEqual({ copies: 153, amber: 4970 });
    expect(copiesToMax(C, 'rare').copies).toBe(130);
    expect(copiesToMax(C, 'epic').copies).toBe(44);
    expect(copiesToMax(C, 'legendary').copies).toBe(11);
  });
});
