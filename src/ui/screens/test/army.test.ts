/**
 * Army's rules (ui-plan 4.2, UI-4): the "Equip now" placement, reached ages, the status marks, the
 * grid's views, filters and sorts, the album count, and when a touch move becomes a drag.
 */
import { content } from '@/content';
import type { Loadout } from '@/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { dragStarts } from '../../components/drag';
import { midGameSave, newPlayerSave } from '../fixtures/saves';
import { text } from './dom';
import { mount, type Mounted } from './harness';
import {
  ALL_SLOTS,
  ARMY_FILTER,
  activeFilterCount,
  assignCard,
  clearSlot,
  fortSlotOpen,
  fortSlotShown,
  setFortSlotPreview,
  slotKindOf,
  ageStatus,
  albumProgress,
  armyCards,
  changedSlots,
  equipSlot,
  fieldSlotLockKeys,
  fieldSlotOpen,
  fitsSlot,
  normalizeLoadout,
  presetsOpen,
  reachedAges,
  slotFromKey,
  slotKey,
  slotOfCard,
} from '../model/plan';

const mid = midGameSave(content);
const stone = (): Loadout => normalizeLoadout(mid.warPlans[0]!.loadouts.stone);

describe('Equip now (A3, ui-plan 4.2 "Use")', () => {
  it('takes the first empty slot of the card kind', () => {
    const l = {
      ...stone(),
      units: stone().units.map((u, i) => (i === 2 ? null : u)),
    };
    expect(equipSlot(mid, content, l, 'mammoth_matriarch')).toEqual({
      kind: 'unit',
      index: 2,
    });
    const t = { ...stone(), turrets: [stone().turrets[0]!, null] };
    expect(equipSlot(mid, content, t, 'log_roller')).toEqual({
      kind: 'turret',
      index: 1,
    });
  });

  it('else replaces a card of the same class, the lowest level first', () => {
    // Mammoth Matriarch is Heavy; the full Stone army holds Tuskback (Heavy).
    const slot = equipSlot(mid, content, stone(), 'mammoth_matriarch');
    expect(slot).toEqual(slotOfCard(stone(), 'tuskback'));
  });

  it('else the lowest-level slot; a card already in the army stays where it is', () => {
    const noHeavy = {
      ...stone(),
      units: stone()
        .units.map((u) => (u === 'tuskback' ? 'sabertooth' : u))
        .map((u, i, a) => (a.indexOf(u) !== i ? 'spear_hunter' : u)),
    };
    const slot = equipSlot(mid, content, noHeavy, 'mammoth_matriarch')!;
    const levels = noHeavy.units.map((u) => mid.collection[u!]?.level ?? 1);
    expect(slot.kind).toBe('unit');
    expect(levels[(slot as { index: number }).index]).toBe(Math.min(...levels));
    expect(equipSlot(mid, content, stone(), 'bonker')).toEqual(slotOfCard(stone(), 'bonker'));
    // A power takes its own slot (A2.9.10): Meteor Shower is a Home power.
    expect(equipSlot(mid, content, stone(), 'meteor_shower')).toEqual({ kind: 'power', slot: 'home' });
  });

  it('a card fits a slot only when it is the same kind, the same age and owned', () => {
    expect(fitsSlot(mid, content, 'stone', { kind: 'unit', index: 0 }, 'mammoth_matriarch')).toBe(true);
    expect(fitsSlot(mid, content, 'stone', { kind: 'turret', index: 0 }, 'mammoth_matriarch')).toBe(false);
    expect(fitsSlot(mid, content, 'bronze', { kind: 'unit', index: 0 }, 'mammoth_matriarch')).toBe(false);
    const fresh = newPlayerSave(content);
    expect(fitsSlot(fresh, content, 'stone', { kind: 'unit', index: 0 }, 'mammoth_matriarch')).toBe(false);
  });
});

describe('slots and changes', () => {
  it('has seven troops, two turrets, the Home and Field powers and the Fort slot, with stable keys', () => {
    expect(ALL_SLOTS.map(slotKey)).toEqual(['unit-0', 'unit-1', 'unit-2', 'unit-3', 'unit-4', 'unit-5', 'unit-6', 'turret-0', 'turret-1', 'power-home', 'power-field', 'fort']);
    for (const s of ALL_SLOTS) expect(slotFromKey(slotKey(s))).toEqual(s);
    expect(slotFromKey('grid')).toBeNull();
  });

  it('lists the slots whose card changed (auto-fill and Undo motion)', () => {
    const a = stone();
    const b = {
      ...a,
      units: [...a.units.slice(0, 6), null],
      turrets: [a.turrets[1]!, a.turrets[0]!],
    };
    expect(changedSlots(a, b).map(slotKey)).toEqual(['unit-6', 'turret-0', 'turret-1']);
    expect(changedSlots(a, a)).toEqual([]);
  });

  it('marks an age full and valid, with advice, or not playable', () => {
    expect(ageStatus([], 'stone', stone())).toBe('ok');
    expect(
      ageStatus([], 'stone', {
        ...stone(),
        units: [...stone().units.slice(0, 5), null],
      }),
    ).toBe('warn');
    expect(
      ageStatus(
        [
          {
            age: 'stone',
            severity: 'warning',
            code: 'noAir',
            messageKey: 'ui.advisor.noAir',
          },
        ],
        'stone',
        stone(),
      ),
    ).toBe('warn');
    expect(
      ageStatus(
        [
          {
            age: 'stone',
            severity: 'error',
            code: 'tooFewUnits',
            messageKey: 'ui.advisor.tooFewUnits',
          },
        ],
        'stone',
        stone(),
      ),
    ).toBe('error');
  });
});

describe('reached ages and presets (2.6, U8)', () => {
  it('a new player has reached the ages of the Ladder format they fight in; presets wait for the first boss', () => {
    const fresh = newPlayerSave(content);
    // Owner decision 2026-09-30: after the onboarding Home's Battle is the Ladder, so the ages of its
    // lengths are reached at once; during the onboarding only the first age is. Since 2026-10-03 the
    // Long War is open from Arena 1, so a new player can fight (and so set up) all of its ages.
    expect(reachedAges(fresh, content)).toEqual(content.formats['full']!.ages);
    expect(reachedAges({ ...fresh, stats: { ...fresh.stats, wins: 1 }, tutorial: { ...fresh.tutorial, step: 2 }, warPath: { ...fresh.warPath, stars: { 'wp.stone.l01': 1 } } }, content)).toEqual(['stone']);
    expect(presetsOpen(fresh, content)).toBe(false);
    // The War Path is optional: enough wins anywhere (the Ladder) open the presets too.
    expect(presetsOpen({ ...fresh, stats: { ...fresh.stats, wins: 9 } }, content)).toBe(false);
    expect(presetsOpen({ ...fresh, stats: { ...fresh.stats, wins: 10 } }, content)).toBe(true);
  });

  it('the War Path region and the ladder formats open ages; a legacy save has them all', () => {
    const ages = reachedAges(mid, content);
    expect(ages.slice(0, 2)).toEqual(['stone', 'bronze']);
    expect(ages.length).toBeGreaterThan(2);
    expect(presetsOpen(mid, content)).toBe(true);
    const legacy = { ...mid, warPath: { ...mid.warPath, legacy: true } };
    expect(reachedAges(legacy, content)).toEqual([...content.order.ages]);
  });
});

describe('the Army grid (4.2 "Right column")', () => {
  it('"This age" holds the age cards that fit its slots, owned first', () => {
    const ids = armyCards(mid, content, 'stone', ARMY_FILTER);
    const want = [...content.order.units, ...content.order.turrets, ...content.order.powers].filter(
      (id) => (content.units[id] ?? content.turrets[id] ?? content.powers[id])!.age === 'stone',
    );
    expect([...ids].sort()).toEqual([...want].sort());
    const owned = ids.map((id) => (content.powers[id] ? mid.powersOwned.includes(id) : (mid.collection[id]?.level ?? 0) >= 1));
    expect(owned.indexOf(false) === -1 || owned.slice(owned.indexOf(false)).every((o) => !o)).toBe(true);
  });

  it('narrows to a slot kind, filters by class, rarity and ownership, and sorts', () => {
    expect(armyCards(mid, content, 'stone', ARMY_FILTER, 'turret').every((id) => !!content.turrets[id])).toBe(true);
    const heavy = armyCards(mid, content, 'stone', {
      ...ARMY_FILTER,
      classes: ['heavy'],
    });
    expect(heavy).toContain('tuskback');
    expect(heavy).not.toContain('bonker');
    const epics = armyCards(mid, content, 'stone', {
      ...ARMY_FILTER,
      view: 'all',
      rarity: 'epic',
    });
    // Powers have rarities too (A5.7: Common starters, Rare and Epic War Path and Road powers).
    expect(epics.every((id) => (content.units[id] ?? content.turrets[id] ?? content.powers[id])?.rarity === 'epic')).toBe(true);
    // The Power chip's Home / Field chips narrow the powers only (A2.9.10).
    const homes = armyCards(mid, content, 'stone', { ...ARMY_FILTER, view: 'all', classes: ['power'], powerSlots: ['home'] });
    expect(homes.length).toBeGreaterThan(0);
    expect(homes.every((id) => content.powers[id]?.slot === 'home')).toBe(true);
    const all = armyCards(mid, content, 'stone', {
      ...ARMY_FILTER,
      view: 'all',
    });
    expect(all).toHaveLength(content.order.units.length + content.order.turrets.length + content.order.powers.length);
    const byLevel = armyCards(mid, content, 'stone', {
      ...ARMY_FILTER,
      sort: 'level',
      ownedOnly: true,
    });
    const lv = byLevel.map((id) => mid.collection[id]?.level ?? 1);
    expect(lv).toEqual([...lv].sort((a, b) => b - a));
    expect(
      activeFilterCount({
        ...ARMY_FILTER,
        classes: ['air', 'heavy'],
        ownedOnly: true,
      }),
    ).toBe(3);
  });

  it('counts the album over every troop, turret and power', () => {
    const p = albumProgress(mid, content);
    expect(p.total).toBe(content.order.units.length + content.order.turrets.length + content.order.powers.length);
    expect(p.owned).toBeGreaterThan(0);
    expect(p.owned).toBeLessThanOrEqual(p.total);
  });
});

describe('drag start (T5, 4.2 gesture matrix)', () => {
  it('waits for 8 px on touch, 6 with a mouse', () => {
    expect(dragStarts(5, 0, 'x', true)).toBe('wait');
    expect(dragStarts(9, 0, 'x', true)).toBe('drag');
    expect(dragStarts(5, 0, 'free', false)).toBe('wait');
    expect(dragStarts(7, 0, 'free', false)).toBe('drag');
  });

  it('a mostly vertical touch move scrolls the grid and never picks a card up', () => {
    expect(dragStarts(2, 12, 'x', true)).toBe('scroll');
    expect(dragStarts(8, 8, 'x', true)).toBe('scroll');
    expect(dragStarts(10, 6, 'x', true)).toBe('drag');
    // A mouse or a slot drag may go any way.
    expect(dragStarts(2, 12, 'x', false)).toBe('drag');
    expect(dragStarts(2, 12, 'free', true)).toBe('drag');
  });
});

describe('Card detail (ui-plan 4.4)', () => {
  let m: Mounted | null = null;
  afterEach(() => {
    m?.unmount();
    m = null;
  });

  it('Use places the card by the Equip now rule, with Undo; an equipped card reads "In army"', () => {
    m = mount({
      state: 'mid',
      routes: [{ id: 'home' }, { id: 'cardDetail', card: 'mammoth_matriarch' }],
    });
    const plan = () => m!.save.value.warPlans[m!.save.value.activePlan]!.loadouts.stone;
    const before = plan();
    expect(m.q('[data-testid="action-bar"] [data-testid="card-use"]')).not.toBeNull();
    m.click('[data-testid="card-use"]');
    expect(plan().units).toContain('mammoth_matriarch');
    expect(m.q('[data-testid="card-in-army"]')).not.toBeNull();
    m.click('[data-testid="toast-undo"]');
    expect(plan()).toEqual(before);
  });

  it('counters come first, as class icons with one plain sentence', () => {
    m = mount({
      state: 'mid',
      routes: [{ id: 'home' }, { id: 'cardDetail', card: 'bonker' }],
    });
    const right = m.q('.cd-right')!;
    expect(right.children[0]!.getAttribute('data-testid')).toBe('counter-classes');
    expect(text(m.q('[data-testid="class-weak"]')!)).toContain('Heavy');
    expect(text(m.q('[data-testid="class-weak"]')!)).toContain('Armor shrugs off blows.');
  });

  it('Show odds opens the odds panel over the card', () => {
    m = mount({
      state: 'mid',
      routes: [{ id: 'home' }, { id: 'cardDetail', card: 'bonker' }],
    });
    m.click('[data-testid="card-odds"]');
    expect(m.q('[data-testid="card-odds-sheet"]')).not.toBeNull();
  });
});

describe('the Field power slot on the Army screen (A2.9.1, A2.9.13)', () => {
  it('stays locked until battles play it, even for a save that earned it, and says why', () => {
    const earned = { ...mid, flags: { ...mid.flags, 'power.field': true } };
    const fresh = { ...mid, flags: { ...mid.flags, 'power.field': false } };
    // With battles off, no battle sends a Field power, so the Army never shows one as equipped
    expect(fieldSlotOpen(earned, false)).toBe(false);
    expect(fieldSlotLockKeys(earned, false)).toEqual({ line: 'ui.power.fieldSoon', short: 'ui.power.fieldSoonShort' });
    expect(fieldSlotLockKeys(fresh, false)).toEqual({ line: 'ui.power.lockedField', short: 'ui.power.lockedFieldShort' });
    // MVP 2026-10-01: battles play it, so the flag opens it (never "Coming soon")
    expect(fieldSlotOpen(earned)).toBe(true);
    expect(fieldSlotOpen(fresh)).toBe(false);
    expect(fieldSlotLockKeys(earned)).toEqual({ line: 'ui.power.lockedField', short: 'ui.power.lockedFieldShort' });
  });

  it('an earned Field slot is open on the Army and never says "Coming soon"', () => {
    const save = { ...mid, flags: { ...mid.flags, 'power.field': true } };
    const m = mount({ save, routes: [{ id: 'home' }, { id: 'warPlan', age: 'stone' }] });
    const field = m.save.value.warPlans[m.save.value.activePlan]?.loadouts.stone?.powers.field ?? null;
    expect(field).not.toBeNull();
    expect(text(m.q('[data-testid="slot-power-field"]')!)).not.toContain('Coming soon');
  });
});

describe('The Fort slot (A16.14.7)', () => {
  const withForts = (open: boolean) => ({ ...mid, fortsOwned: ['palisade', 'war_camp', 'spike_pit', 'sling_perch', 'cyclopean_wall'], flags: { ...mid.flags, 'fort.slot': open } });
  afterEach(() => setFortSlotPreview(false));

  it('is hidden until battles play it, then shows open or with its padlock', () => {
    expect(fortSlotShown(false)).toBe(false);
    expect(fortSlotOpen(withForts(true), false)).toBe(false);
    expect(fortSlotShown(true)).toBe(true);
    expect(fortSlotOpen(withForts(true), true)).toBe(true);
    expect(fortSlotOpen(withForts(false), true)).toBe(false);
    setFortSlotPreview(true);
    expect(fortSlotShown(false)).toBe(true);
  });

  it('takes only an owned fort of its age, and a fort goes nowhere else', () => {
    setFortSlotPreview(true);
    const s = withForts(true);
    expect(slotKindOf(content, 'palisade')).toBe('fort');
    expect(fitsSlot(s, content, 'stone', { kind: 'fort' }, 'palisade')).toBe(true);
    expect(fitsSlot(s, content, 'stone', { kind: 'unit', index: 0 }, 'palisade')).toBe(false);
    expect(fitsSlot(s, content, 'bronze', { kind: 'fort' }, 'palisade')).toBe(false);
    expect(fitsSlot(s, content, 'stone', { kind: 'fort' }, 'bonker')).toBe(false);
    // Not owned yet, or the slot still locked.
    expect(fitsSlot({ ...s, fortsOwned: [] }, content, 'stone', { kind: 'fort' }, 'palisade')).toBe(false);
    expect(fitsSlot(withForts(false), content, 'stone', { kind: 'fort' }, 'palisade')).toBe(false);
  });

  it('Use fills the Fort slot or swaps its fort; clearing empties it; the key is stable', () => {
    setFortSlotPreview(true);
    const s = withForts(true);
    const l = { ...stone(), fort: null };
    expect(equipSlot(s, content, l, 'war_camp')).toEqual({ kind: 'fort' });
    const a = assignCard(content, l, { kind: 'fort' }, 'war_camp');
    expect(a.fort).toBe('war_camp');
    expect(a.units).toEqual(l.units);
    expect(slotOfCard(a, 'war_camp')).toEqual({ kind: 'fort' });
    expect(changedSlots(l, a).map(slotKey)).toEqual(['fort']);
    expect(assignCard(content, a, { kind: 'fort' }, 'palisade').fort).toBe('palisade');
    expect(clearSlot(a, { kind: 'fort' }).fort).toBeNull();
    expect(slotFromKey('fort')).toEqual({ kind: 'fort' });
    expect(equipSlot(withForts(false), content, l, 'war_camp')).toBeNull();
  });

  it('keeps the Fort card through normalizing an older loadout', () => {
    expect(normalizeLoadout({ units: [], turrets: [], powers: { home: null, field: null } }).fort).toBeNull();
    expect(normalizeLoadout({ ...stone(), fort: 'palisade' }).fort).toBe('palisade');
  });
});
