/**
 * Fort ownership, the Fort slot and the fort match rule (DESIGN A16.14.6, spec section 6): the unlock at
 * War Path Bronze L4 or 400 trophies (walls, the Stone set, every preset's empty slot filled), War Path
 * L4/L6/L8 and Road fort-set grants (60 Amber for a second source), bots limited to forts the player could
 * own, and the match rule that sends `fort: null` for both sides while the slot is off (F1).
 */
import { describe, expect, it } from 'vitest';
import type { MatchConfig, SaveDoc } from '@/contracts';
import {
  applyFortMatchRule,
  botForts,
  botMayUseFort,
  checkFortUnlock,
  FORT_OWNED_AMBER,
  fortSlotLive,
  fortSlotUnlocked,
  grantWarPathFort,
  roadFortsOf,
  unlockFortSlot,
  unlockSet,
  wallOf,
  warPathFortOf,
} from '../index';
import { validatePlan } from '../advisor';
import { applyTrophies, claimRoad } from '../trophies';
import { autoFill } from '../warplan';
import { C, T0, fresh } from './helpers';

const WALLS = C.order.ages.map((a) => wallOf(C, a));
const cleared = (s: SaveDoc, ids: string[]): SaveDoc => ({ ...s, warPath: { ...s.warPath, stars: { ...s.warPath.stars, ...Object.fromEntries(ids.map((id) => [id, 1])) } } });

describe('new saves and the unlock (A16.14.6)', () => {
  it('a new save owns no forts and every Fort slot is empty', () => {
    const s = fresh();
    expect(s.fortsOwned).toEqual([]);
    expect(fortSlotUnlocked(s)).toBe(false);
    for (const age of C.order.ages) expect(s.warPlans[0]?.loadouts[age].fort).toBeNull();
    expect(checkFortUnlock(s, C).save).toBe(s);
  });

  it('400 trophies open the slot: the walls and the Stone set, and every preset’s empty slot gets its wall', () => {
    const s0 = fresh();
    const three = { ...s0, warPlans: [s0.warPlans[0], s0.warPlans[0], s0.warPlans[0]].filter((p) => p !== undefined) } as SaveDoc;
    expect(applyTrophies(three, C, 399).save.flags['fort.slot']).toBeUndefined();
    const s = applyTrophies(three, C, 400).save;
    expect(fortSlotUnlocked(s)).toBe(true);
    expect([...s.fortsOwned].sort()).toEqual([...WALLS, 'war_camp', 'spike_pit', 'sling_perch'].sort());
    expect(unlockSet(C).sort()).toEqual([...s.fortsOwned].sort());
    for (const plan of s.warPlans) for (const age of C.order.ages) expect(plan.loadouts[age].fort).toBe(wallOf(C, age));
    // Once open, nothing is granted twice.
    expect(unlockFortSlot(s, C).save).toBe(s);
  });

  it('the first clear of Bronze L4 opens the slot and grants its camp; L6 then grants the trap', () => {
    const s0 = cleared(fresh(), ['wp.bronze.l04']);
    const a = grantWarPathFort(s0, C, 'bronze', 4);
    expect(fortSlotUnlocked(a.save)).toBe(true);
    expect(a.save.fortsOwned).toContain('muster_tents');
    expect(a.save.fortsOwned.filter((x) => x === 'muster_tents')).toHaveLength(1);
    const b = grantWarPathFort(cleared(a.save, ['wp.bronze.l06']), C, 'bronze', 6);
    expect(b.save.fortsOwned).toContain('hidden_stakes');
    expect(b.steps).toEqual([{ kind: 'card', card: 'hidden_stakes', copies: 0 }]);
    // A second grant pays 60 Amber instead.
    const c = grantWarPathFort(b.save, C, 'bronze', 6);
    expect(c.save.currencies.amber - b.save.currencies.amber).toBe(FORT_OWNED_AMBER);
    expect(c.save.fortsOwned).toEqual(b.save.fortsOwned);
  });

  it('before the unlock no fort is granted; Stone L4, L6 and L8 never grant one', () => {
    const s0 = cleared(fresh(), ['wp.medieval.l06']);
    expect(grantWarPathFort(s0, C, 'medieval', 6).save.fortsOwned).toEqual([]);
    for (const l of [4, 6, 8]) expect(warPathFortOf(C, 'stone', l)).toBeNull();
    expect([4, 6, 8].map((l) => warPathFortOf(C, 'cosmic', l))).toEqual(['warp_barracks', 'void_mine', 'ion_spire']);
  });

  it('the unlock grants pending sources: cleared levels and claimed fort-set nodes (a double source pays 60 Amber once)', () => {
    const s0 = { ...cleared(fresh(), ['wp.bronze.l04', 'wp.medieval.l08']), trophies: { current: 450, best: 450, roadClaimed: [2200] } };
    const u = unlockFortSlot(s0, C).save;
    expect(u.fortsOwned).toEqual(expect.arrayContaining(['muster_tents', 'hidden_stakes', 'pyrgos_tower', 'longbow_tower']));
    expect(u.fortsOwned).not.toContain('levy_camp');
    expect(u.currencies.amber - s0.currencies.amber).toBe(FORT_OWNED_AMBER);
  });

  it('a Road fort set grants its three forts; one already owned pays 60 Amber', () => {
    expect(roadFortsOf(C, 2200).sort()).toEqual(['hidden_stakes', 'muster_tents', 'pyrgos_tower']);
    const open = unlockFortSlot({ ...fresh(), trophies: { current: 2250, best: 2250, roadClaimed: [] } }, C).save;
    const withCamp = { ...open, fortsOwned: [...open.fortsOwned, 'muster_tents'] };
    const r = claimRoad(withCamp, 2200, C, T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.fortsOwned).toEqual(expect.arrayContaining(['hidden_stakes', 'pyrgos_tower']));
    expect(r.value.fortsOwned.filter((x) => x === 'muster_tents')).toHaveLength(1);
    expect(r.value.currencies.amber - withCamp.currencies.amber).toBeGreaterThanOrEqual(FORT_OWNED_AMBER);
  });

  it('plan validation: an empty Fort slot is fine; a fort must be owned and of the age', () => {
    const s = fresh();
    const plan = s.warPlans[0];
    if (!plan) throw new Error('no plan');
    const codes = (fort: string | null, save: SaveDoc) =>
      validatePlan({ ...plan, loadouts: { ...plan.loadouts, stone: { ...plan.loadouts.stone, fort } } }, save, C, 'short')
        .filter((i) => i.age === 'stone' && i.severity === 'error')
        .map((i) => i.code);
    expect(codes(null, s)).toEqual([]);
    expect(codes('palisade', s)).toEqual(['notOwned']);
    const open = unlockFortSlot(s, C).save;
    expect(codes('palisade', open)).toEqual([]);
    expect(codes('cyclopean_wall', open)).toEqual(['wrongAge']);
    expect(codes('nope', open)).toEqual(['unknownCard']);
  });

  it('auto-fill keeps an owned fort of the age, else the age’s wall once the slot is open', () => {
    const open = unlockFortSlot(fresh(), C).save;
    expect(autoFill(fresh(), C).loadouts.stone.fort).toBeNull();
    const plan = autoFill(open, C);
    for (const age of C.order.ages) expect(plan.loadouts[age].fort).toBe(wallOf(C, age));
    const withCamp = { ...open, warPlans: open.warPlans.map((p) => ({ ...p, loadouts: { ...p.loadouts, stone: { ...p.loadouts.stone, fort: 'war_camp' } } })) };
    expect(autoFill(withCamp, C).loadouts.stone.fort).toBe('war_camp');
  });
});

describe('bots and the match rule (A16.14.6)', () => {
  const cfgWith = (fort: string | null, botFort: string | null): MatchConfig => {
    const side = (isBot: boolean, f: string | null) => ({
      label: isBot ? 'AI' : 'Player',
      isBot,
      loadouts: { stone: { units: [], turrets: [], powers: { home: null, field: null }, fort: f }, bronze: { units: [], turrets: [], powers: { home: null, field: null }, fort: isBot ? 'pyrgos_tower' : null } },
      levels: {},
      skins: {},
    });
    return { seed: 1, format: 'short', content: C, sides: [side(false, fort), side(true, botFort)] };
  };

  it('bots use the walls and the Stone set once the player’s slot is open; later forts only by the A2.9.8 rule', () => {
    const locked = fresh();
    const open = unlockFortSlot(fresh(), C).save;
    expect(botMayUseFort(C, locked, 'palisade')).toBe(false);
    expect(botMayUseFort(C, open, 'palisade')).toBe(true);
    expect(botMayUseFort(C, open, 'sling_perch')).toBe(true);
    expect(botMayUseFort(C, open, 'pyrgos_tower')).toBe(false);
    expect(botMayUseFort(C, { ...open, trophies: { ...open.trophies, best: 2100 } }, 'pyrgos_tower')).toBe(true);
    expect(botMayUseFort(C, cleared(open, ['wp.bronze.l08']), 'pyrgos_tower')).toBe(true);
    expect(botMayUseFort(C, open, 'pyrgos_tower', ['bronze'])).toBe(true);
    const side = botForts(C, open, cfgWith(null, 'war_camp').sides[1]);
    expect(side.loadouts.stone?.fort).toBe('war_camp');
    expect(side.loadouts.bronze?.fort).toBe('cyclopean_wall');
  });

  it('while the slot is off in battle (F1) both sides play with fort: null', () => {
    const open = unlockFortSlot(fresh(), C).save;
    const out = applyFortMatchRule(cfgWith('palisade', 'war_camp'), open, 'ladder');
    for (const s of out.sides) for (const l of Object.values(s.loadouts)) expect(l?.fort).toBeNull();
    expect(fortSlotLive(open, 'ladder')).toBe(false);
  });

  it('with the slot on (F2): a locked slot is empty for both sides; the Daily always plays it', () => {
    const locked = fresh();
    const open = unlockFortSlot(fresh(), C).save;
    const off = applyFortMatchRule(cfgWith('palisade', 'war_camp'), locked, 'ladder', true);
    for (const s of off.sides) expect(s.loadouts.stone?.fort).toBeNull();
    const on = applyFortMatchRule(cfgWith('palisade', 'war_camp'), open, 'ladder', true);
    expect(on.sides[0].loadouts.stone?.fort).toBe('palisade');
    expect(on.sides[1].loadouts.stone?.fort).toBe('war_camp');
    expect(on.sides[1].loadouts.bronze?.fort).toBe('cyclopean_wall');
    const daily = applyFortMatchRule(cfgWith(null, null), locked, 'daily', true);
    expect(daily.sides[0].loadouts.stone?.fort).toBe('palisade');
  });
});
