/**
 * The War Plan (DESIGN A3, C5 #32): validation and the advisor, auto-fill, Equip now, presets, skins.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, Loadout, SaveDoc } from '@/contracts';
import { hitsAir, type WarPlan } from '../advisor';
import { autoFill, equipNow, fillNewTroopSlots, SEVENTH_SLOT_FLAG, SIXTH_SLOT_FLAG, starterPlan } from '../warplan';
import { C, M, fresh, ownsAll } from './helpers';

function withLoadout(plan: WarPlan, age: AgeId, l: Partial<Loadout>): WarPlan {
  return { ...plan, loadouts: { ...plan.loadouts, [age]: { ...plan.loadouts[age], ...l } } };
}

function codes(plan: WarPlan, s: SaveDoc, format: 'short' | 'standard' | 'full' = 'short'): string[] {
  return M.validatePlan(plan, s, C, format).map((i) => `${i.age}:${i.severity}:${i.code}`);
}

describe('validatePlan and the advisor (A3)', () => {
  it('the starter plan is playable in every format and warns about what it lacks', () => {
    const s = fresh();
    const plan = s.warPlans[0]!;
    for (const f of ['short', 'standard', 'full'] as const) {
      const issues = M.validatePlan(plan, s, C, f);
      expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
      for (const i of issues) expect(C.formats[f]!.ages).toContain(i.age);
    }
    const short = codes(plan, s);
    // The starter kit holds each age's Anti-heavy Rare (owner feedback 2026-09-29): four units, no anti-heavy warning.
    expect(short).not.toContain('stone:warning:onlyThreeUnits');
    expect(short.filter((x) => x.endsWith(':noAntiArmor'))).toEqual([]);
    // Without it the advisor says so ("Stone has no anti-heavy").
    const bare = withLoadout(plan, 'stone', { units: ['bonker', 'pebbler', 'tuskback', null, null] });
    expect(codes(bare, s)).toContain('stone:warning:onlyThreeUnits');
    expect(codes(bare, s)).toContain('stone:warning:noAntiArmor');
    expect(short.some((x) => x.startsWith('modern'))).toBe(false);
    for (const i of M.validatePlan(plan, s, C, 'full')) expect(i.messageKey).toBe(`ui.advisor.${i.code}`);
  });

  it('errors: fewer than 3 units, no turret, unowned, wrong age, duplicate, bad power', () => {
    const s = fresh();
    const base = s.warPlans[0]!;
    expect(codes(withLoadout(base, 'stone', { units: ['bonker', 'pebbler', null, null, null] }), s)).toContain('stone:error:tooFewUnits');
    expect(codes(withLoadout(base, 'stone', { turrets: [null, null] }), s)).toContain('stone:error:noTurret');
    expect(codes(withLoadout(base, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'drum_shaman', null] }), s)).toContain('stone:error:notOwned');
    expect(codes(withLoadout(base, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'footman', null] }), s)).toContain('stone:error:wrongAge');
    expect(codes(withLoadout(base, 'stone', { units: ['bonker', 'bonker', 'tuskback', 'pebbler', null] }), s)).toContain('stone:error:duplicate');
    expect(codes(withLoadout(base, 'stone', { powers: { home: 'meteor_shower', field: 'stampede' } }), s)).toContain('stone:error:badPower');
    expect(codes(withLoadout(base, 'stone', { powers: { home: 'arrow_storm', field: 'stampede' } }), s)).toContain('stone:error:badPower');
    // A power in the wrong slot (A2.9.1).
    expect(codes(withLoadout(base, 'stone', { powers: { home: 'stampede', field: 'rockslide' } }), s)).toContain('stone:error:badPower');
    // Empty slots are legal.
    expect(codes(withLoadout(base, 'stone', { powers: { home: null, field: null } }), s)).not.toContain('stone:error:badPower');
    expect(codes(withLoadout(base, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'training_dummy', null] }), s)).toContain('stone:error:unknownCard');
    // Errors only for ages the format uses.
    expect(codes(withLoadout(base, 'future', { turrets: [null, null] }), s, 'short')).toEqual(codes(base, s, 'short'));
  });

  it('warnings: no anti-heavy, cannot hit air (from Gunpowder), only 3 units, no splash anywhere', () => {
    const s = ownsAll(fresh());
    let plan = starterPlan(C);
    plan = withLoadout(plan, 'modern', { units: ['trench_raider', 'tankette', 'emp_saboteur', null, null], turrets: ['howitzer', null] });
    const all = codes(plan, s, 'full');
    expect(all).toContain('modern:warning:noAir');
    expect(all).not.toContain('stone:warning:noAir');
    expect(all).not.toContain('medieval:warning:noAir');
    expect(all).not.toContain('medieval:warning:onlyThreeUnits');
    expect(codes(withLoadout(plan, 'medieval', { units: ['footman', 'longbowman', 'destrier_knight', null, null] }), s, 'full')).toContain('medieval:warning:onlyThreeUnits');
    let noSplash = starterPlan(C);
    noSplash = withLoadout(noSplash, 'stone', { units: ['bonker', 'tuskback', 'spear_hunter', null, null], turrets: ['rock_tosser', null] });
    // The Javelineer's pierce counts as area damage, so Bronze leaves it out too (Short War has 4 ages, A17.8).
    noSplash = withLoadout(noSplash, 'bronze', { units: ['hoplite', 'war_chariot', 'phalangite', null, null], turrets: ['archer_tower', null] });
    noSplash = withLoadout(noSplash, 'medieval', { units: ['footman', 'longbowman', 'destrier_knight', null, null], turrets: ['crossbow_nest', null] });
    noSplash = withLoadout(noSplash, 'gunpowder', { units: ['corsair', 'fusilier', 'cuirassier', null, null], turrets: ['swivel_gun', null] });
    expect(codes(noSplash, s)).toContain('stone:warning:noSplash');
    // Pebbler's ricochet hits two enemies: it counts as area damage.
    expect(codes(withLoadout(noSplash, 'stone', { units: ['bonker', 'tuskback', 'spear_hunter', 'pebbler', null] }), s)).not.toContain('stone:warning:noSplash');
  });
});

describe('auto-fill (A3)', () => {
  it('keeps a Heavy or Legendary, a Ranged, an Anti-armor and, from Gunpowder, an air-hitter; then highest level', () => {
    let s = ownsAll(fresh(), 1);
    s = { ...s, collection: { ...s.collection, sabertooth: { level: 9, copies: 0, isNew: false, foil: 'none' }, drum_shaman: { level: 8, copies: 0, isNew: false, foil: 'none' } } };
    const plan = autoFill(s, C);
    const stone = plan.loadouts.stone;
    expect(stone.units).toHaveLength(7);
    expect(stone.units.filter(Boolean)).toHaveLength(7);
    const groups = stone.units.map((id) => (id ? C.units[id]?.group : null));
    expect(groups.some((g) => g === 'heavy' || g === 'legendary')).toBe(true);
    expect(groups).toContain('ranged');
    expect(groups).toContain('antiArmor');
    expect(stone.units).toContain('sabertooth');
    expect(stone.units).toContain('drum_shaman');
    for (const age of ['gunpowder', 'modern', 'future'] as const) {
      const l = plan.loadouts[age];
      expect([...l.units, ...l.turrets].some((id) => id !== null && hitsAir(C, id))).toBe(true);
    }
    for (const age of C.order.ages) expect(M.validatePlan(plan, s, C, 'full').filter((i) => i.severity === 'error' && i.age === age)).toEqual([]);
  });

  it('works on a new save and keeps the chosen power when it is owned', () => {
    const s = fresh();
    const plan = autoFill(s, C);
    expect(M.validatePlan(plan, s, C, 'full').filter((i) => i.severity === 'error')).toEqual([]);
    const withAlt = { ...s, powersOwned: [...s.powersOwned, 'meteor_shower'], warPlans: [withLoadout(s.warPlans[0]!, 'stone', { powers: { home: 'meteor_shower', field: 'stampede' } })] };
    expect(autoFill(withAlt, C).loadouts.stone.powers).toEqual({ home: 'meteor_shower', field: 'stampede' });
    // An empty slot is filled with the age's starter (A2.9.10 auto-fill).
    const empty = { ...s, warPlans: [withLoadout(s.warPlans[0]!, 'stone', { powers: { home: null, field: null } })] };
    expect(autoFill(empty, C).loadouts.stone.powers).toEqual({ home: 'rockslide', field: 'stampede' });
  });
});

describe('Equip now (A3)', () => {
  it('fills an empty slot, else the same-role slot, else the lowest-level slot', () => {
    let s: SaveDoc = { ...fresh(), collection: { ...fresh().collection, spear_hunter: { level: 1, copies: 0, isNew: true, foil: 'none' as const } } };
    s = equipNow(s, 'spear_hunter', C);
    expect(s.warPlans[0]!.loadouts.stone.units).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', null, null, null]);
    // Full loadout (seven troops, A18.9): a Support replaces nothing of its role, so the lowest level (ties: last) goes.
    const full = withLoadout(s.warPlans[0]!, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth', 'mammoth_matriarch', 'hunting_wolves'] });
    let t: SaveDoc = ownsAll({ ...s, warPlans: [full] }, 2);
    t = { ...t, collection: { ...t.collection, tuskback: { level: 1, copies: 0, isNew: false, foil: 'none' } } };
    expect(equipNow(t, 'drum_shaman', C).warPlans[0]!.loadouts.stone.units).toEqual(['bonker', 'pebbler', 'drum_shaman', 'spear_hunter', 'sabertooth', 'mammoth_matriarch', 'hunting_wolves']);
    // Same role: the Matriarch (Legendary group) has no same-group card here; a Heavy for a Heavy.
    const noMatriarch = withLoadout(full, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth', 'drum_shaman', 'hunting_wolves'] });
    const heavy = { ...t, warPlans: [noMatriarch], collection: { ...t.collection, tuskback: { level: 5, copies: 0, isNew: false, foil: 'none' as const } } };
    expect(equipNow(heavy, 'mammoth_matriarch', C).warPlans[0]!.loadouts.stone.units).toContain('mammoth_matriarch');
    // Turrets and powers.
    expect(equipNow(t, 'grumpy_toad', C).warPlans[0]!.loadouts.stone.turrets).toContain('grumpy_toad');
    expect(equipNow(t, 'meteor_shower', C).warPlans[0]!.loadouts.stone.powers).toEqual({ home: 'meteor_shower', field: 'stampede' });
    // Unowned cards and cards already in the loadout change nothing.
    expect(equipNow(fresh(), 'sabertooth', C)).toEqual(fresh());
    expect(equipNow(t, 'bonker', C)).toBe(t);
  });
});

describe('new troop slots (A18.9: the sixth from save v4, the seventh from save v13)', () => {
  const level = (n: number) => ({ level: n, copies: 0, isNew: false, foil: 'none' as const });
  /** A save after the v13 migration: six filled troops per age and an empty seventh slot, sixth flag set. */
  function migrated(): SaveDoc {
    const s = ownsAll(fresh(), 2);
    const six: Partial<Record<AgeId, (string | null)[]>> = { stone: ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman', 'sabertooth', null] };
    const plans = [0, 1, 2].map((i) => {
      let p = { ...starterPlan(C), name: `Plan ${i + 1}` };
      for (const age of C.order.ages) {
        const units = six[age] ?? [...p.loadouts[age].units.slice(0, 6), null];
        p = withLoadout(p, age, { units });
      }
      return p;
    });
    return { ...s, warPlans: plans, flags: { ...s.flags, [SIXTH_SLOT_FLAG]: true } };
  }

  it('fills the seventh slot of every plan and age with the best owned troop not in the loadout, once', () => {
    let s = migrated();
    // Best = highest level, ties in content order: the Matriarch (L9) beats the Wolves (L5).
    s = { ...s, collection: { ...s.collection, mammoth_matriarch: level(9), hunting_wolves: level(5) } };
    const out = fillNewTroopSlots(s, C);
    expect(out.flags[SEVENTH_SLOT_FLAG]).toBe(true);
    for (const plan of out.warPlans) {
      expect(plan.loadouts.stone.units).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman', 'sabertooth', 'mammoth_matriarch']);
      for (const age of C.order.ages) {
        const units = plan.loadouts[age].units;
        expect(units).toHaveLength(7);
        expect(new Set(units.filter(Boolean)).size).toBe(units.filter(Boolean).length);
        for (const id of units) if (id) expect(C.units[id]?.age).toBe(age);
      }
    }
    for (const age of C.order.ages) expect(M.validatePlan(out.warPlans[0]!, out, C, 'full').filter((i) => i.severity === 'error' && i.age === age)).toEqual([]);
    // Once: a slot emptied later stays empty, and a second call changes nothing.
    const emptied = { ...out, warPlans: out.warPlans.map((p) => withLoadout(p, 'stone', { units: [...p.loadouts.stone.units.slice(0, 6), null] })) };
    expect(fillNewTroopSlots(emptied, C)).toBe(emptied);
  });

  it('leaves the seventh slot empty when no eligible troop is left, and never picks a hidden or unowned card', () => {
    const s = fresh();
    const plan = withLoadout(s.warPlans[0]!, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'spear_hunter', null, null, null] });
    const out = fillNewTroopSlots({ ...s, warPlans: [plan], flags: { ...s.flags, [SIXTH_SLOT_FLAG]: true } }, C);
    expect(out.warPlans[0]!.loadouts.stone.units).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', null, null, null]);
    expect(out.flags[SEVENTH_SLOT_FLAG]).toBe(true);
    expect(out.warPlans[0]!.loadouts.stone.units).not.toContain('training_dummy');
  });

  it('a save from before v4 fills the sixth slot first, then the seventh', () => {
    let s = ownsAll(fresh(), 1);
    s = { ...s, collection: { ...s.collection, sabertooth: level(8), drum_shaman: level(6) } };
    const plan = withLoadout(s.warPlans[0]!, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'hunting_wolves', null, null] });
    const out = fillNewTroopSlots({ ...s, warPlans: [plan] }, C);
    expect(out.warPlans[0]!.loadouts.stone.units).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'hunting_wolves', 'sabertooth', 'drum_shaman']);
    expect(out.flags[SIXTH_SLOT_FLAG]).toBe(true);
    expect(out.flags[SEVENTH_SLOT_FLAG]).toBe(true);
  });
});

describe('presets and skins', () => {
  it('three presets; the active one can change', () => {
    const s = fresh();
    const b = M.setWarPlan(s, 1, { ...s.warPlans[0]!, name: 'B' });
    if (!b.ok) throw new Error(b.reason);
    expect(b.value.warPlans.map((p) => p.name)).toEqual(['A', 'B']);
    expect(M.setWarPlan(s, 2, s.warPlans[0]!)).toEqual({ ok: false, reason: 'badIndex' });
    expect(M.setWarPlan(b.value, 3, s.warPlans[0]!)).toEqual({ ok: false, reason: 'badIndex' });
    const active = M.setActivePlan(b.value, 1);
    if (!active.ok) throw new Error(active.reason);
    expect(active.value.activePlan).toBe(1);
    expect(M.setActivePlan(b.value, 2)).toEqual({ ok: false, reason: 'badIndex' });
  });

  it('only an owned skin equips, only on its own target', () => {
    const s = { ...fresh(), skins: { owned: ['pumpkin_head'], equipped: {} } };
    const on = M.equipSkin(s, 'bonker', 'pumpkin_head', C);
    if (!on.ok) throw new Error(on.reason);
    expect(on.value.skins.equipped).toEqual({ bonker: 'pumpkin_head' });
    expect(M.equipSkin(s, 'pebbler', 'pumpkin_head', C)).toEqual({ ok: false, reason: 'wrongTarget' });
    expect(M.equipSkin(s, 'tuskback', 'woolly_tuskback', C)).toEqual({ ok: false, reason: 'notOwned' });
    const off = M.equipSkin(on.value, 'bonker', null, C);
    if (!off.ok) throw new Error(off.reason);
    expect(off.value.skins.equipped).toEqual({});
  });
});
