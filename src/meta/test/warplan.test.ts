/**
 * The War Plan (DESIGN A3, C5 #32): validation and the advisor, auto-fill, Equip now, presets, skins.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, Loadout, SaveDoc } from '@/contracts';
import { hitsAir, type WarPlan } from '../advisor';
import { autoFill, equipNow, starterPlan } from '../warplan';
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
      for (const i of issues) expect(C.formats[f].ages).toContain(i.age);
    }
    const short = codes(plan, s);
    expect(short).toContain('stone:warning:onlyThreeUnits');
    expect(short).toContain('stone:warning:noAntiArmor');
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
    expect(codes(withLoadout(base, 'stone', { power: 'meteor_shower' }), s)).toContain('stone:error:badPower');
    expect(codes(withLoadout(base, 'stone', { power: 'arrow_storm' }), s)).toContain('stone:error:badPower');
    expect(codes(withLoadout(base, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'training_dummy', null] }), s)).toContain('stone:error:unknownCard');
    // Errors only for ages the format uses.
    expect(codes(withLoadout(base, 'future', { turrets: [null, null] }), s, 'short')).toEqual(codes(base, s, 'short'));
  });

  it('warnings: no anti-armor, cannot hit air (from Gunpowder), only 3 units, no splash anywhere', () => {
    const s = ownsAll(fresh());
    let plan = starterPlan(C);
    plan = withLoadout(plan, 'modern', { units: ['trench_raider', 'tankette', 'emp_saboteur', null, null], turrets: ['howitzer', null] });
    const all = codes(plan, s, 'full');
    expect(all).toContain('modern:warning:noAir');
    expect(all).not.toContain('stone:warning:noAir');
    expect(all).not.toContain('medieval:warning:noAir');
    expect(all).toContain('medieval:warning:onlyThreeUnits');
    let noSplash = starterPlan(C);
    noSplash = withLoadout(noSplash, 'stone', { units: ['bonker', 'tuskback', 'spear_hunter', null, null], turrets: ['rock_tosser', null] });
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
    expect(stone.units.filter(Boolean)).toHaveLength(5);
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
    const withAlt = { ...s, powersOwned: [...s.powersOwned, 'meteor_shower'], warPlans: [withLoadout(s.warPlans[0]!, 'stone', { power: 'meteor_shower' })] };
    expect(autoFill(withAlt, C).loadouts.stone.power).toBe('meteor_shower');
  });
});

describe('Equip now (A3)', () => {
  it('fills an empty slot, else the same-role slot, else the lowest-level slot', () => {
    let s: SaveDoc = { ...fresh(), collection: { ...fresh().collection, spear_hunter: { level: 1, copies: 0, isNew: true, foil: 'none' as const } } };
    s = equipNow(s, 'spear_hunter', C);
    expect(s.warPlans[0]!.loadouts.stone.units).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', null]);
    // Full loadout: a Support replaces nothing of its role, so the lowest level (ties: last) goes.
    const full = withLoadout(s.warPlans[0]!, 'stone', { units: ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth'] });
    let t: SaveDoc = ownsAll({ ...s, warPlans: [full] }, 2);
    t = { ...t, collection: { ...t.collection, tuskback: { level: 1, copies: 0, isNew: false, foil: 'none' } } };
    expect(equipNow(t, 'drum_shaman', C).warPlans[0]!.loadouts.stone.units).toEqual(['bonker', 'pebbler', 'drum_shaman', 'spear_hunter', 'sabertooth']);
    // Same role: the Matriarch (Legendary group) has no same-group card here; a Heavy for a Heavy.
    const heavy = { ...t, collection: { ...t.collection, tuskback: { level: 5, copies: 0, isNew: false, foil: 'none' as const } } };
    expect(equipNow(heavy, 'mammoth_matriarch', C).warPlans[0]!.loadouts.stone.units).toContain('mammoth_matriarch');
    // Turrets and powers.
    expect(equipNow(t, 'grumpy_toad', C).warPlans[0]!.loadouts.stone.turrets).toContain('grumpy_toad');
    expect(equipNow(t, 'meteor_shower', C).warPlans[0]!.loadouts.stone.power).toBe('meteor_shower');
    // Unowned cards and cards already in the loadout change nothing.
    expect(equipNow(fresh(), 'sabertooth', C)).toEqual(fresh());
    expect(equipNow(t, 'bonker', C)).toBe(t);
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
