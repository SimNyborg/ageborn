/**
 * Card classes (owner feedback 2026-09-28 "card class and counters visible"): every unit of every
 * age maps to one of the seven classes, the class labels exist, and Strong vs / Weak vs never name
 * the same class twice.
 */
import { AGE_ORDER, content } from '@/content';
import {
  CLASS_GLYPH,
  COUNTER_LEGEND,
  UNIT_CLASSES,
  counterClasses,
  heavyThreat,
  takesCounterFloor,
  unitClass,
  type ClassGlyphId,
} from '@/core/cardClass';
import { i18n } from '@/i18n';
import { describe, expect, it } from 'vitest';
import { CLASS_NAME_KEY } from '../ClassIcon';
import { cardTile } from '../../screens/model/cards';
import { classGlyphSvg } from '../../../capsule/classBadge';

const EXPECTED: Record<string, string> = {
  bonker: 'infantry',
  pebbler: 'ranged',
  tuskback: 'heavy',
  spear_hunter: 'antiArmor',
  drum_shaman: 'support',
  sabertooth: 'infantry',
  mammoth_matriarch: 'heavy',
  scorpion: 'siege',
  battering_ram: 'siege',
  sapper: 'siege',
  balloon_admiral: 'air',
  gyrocopter: 'air',
  repair_drone: 'air',
  mothership: 'air',
  emp_saboteur: 'antiArmor',
  warp_stalker: 'infantry',
};

describe('card classes', () => {
  const units = content.order.units.map((id) => content.units[id]!);

  it('covers all 8 ages', () => {
    expect(AGE_ORDER.length).toBe(8);
    for (const age of AGE_ORDER) expect(units.filter((u) => u.age === age).length, age).toBeGreaterThanOrEqual(5);
  });

  it('maps every unit in every age to a class', () => {
    for (const u of units) expect(UNIT_CLASSES, u.id).toContain(unitClass(u));
    for (const u of Object.values(content.units)) expect(UNIT_CLASSES, u.id).toContain(unitClass(u));
  });

  it('maps known units to the expected class', () => {
    for (const [id, cls] of Object.entries(EXPECTED)) expect(unitClass(content.units[id]!), id).toBe(cls);
  });

  it('uses every class somewhere in the content', () => {
    const used = new Set(units.map(unitClass));
    for (const c of UNIT_CLASSES) expect(used.has(c), c).toBe(true);
  });

  it('keeps each age mixed (at least 4 classes per age)', () => {
    for (const age of AGE_ORDER)
      expect(new Set(units.filter((u) => u.age === age).map(unitClass)).size, age).toBeGreaterThanOrEqual(4);
  });

  it('never lists a class as both strong and weak', () => {
    for (const u of units) {
      const { strong, weak } = counterClasses(u.strongVs, u.weakVs, content.units);
      expect(
        strong.filter((c) => weak.includes(c)),
        u.id,
      ).toEqual([]);
    }
  });

  it('never lists a unit\'s own class, nor contradicts the War Plan legend', () => {
    const beats = (a: string, b: string) => COUNTER_LEGEND.some((l) => l.a === a && l.b === b);
    for (const u of Object.values(content.units)) {
      if (u.hidden) continue;
      const self = unitClass(u);
      const { strong, weak } = counterClasses(u.strongVs, u.weakVs, content.units, self);
      expect(strong, u.id).not.toContain(self);
      expect(weak, u.id).not.toContain(self);
      expect(strong.filter((c) => beats(c, self)), u.id).toEqual([]);
      expect(weak.filter((c) => beats(self, c)), u.id).toEqual([]);
    }
  });

  it('the triangle is a floor (A18.9.1): every Anti-heavy card is Strong vs Heavy, every Heavy card Weak vs Anti-heavy', () => {
    for (const u of units) {
      if (!takesCounterFloor(u)) continue;
      const self = unitClass(u);
      const { strong, weak } = counterClasses(u.strongVs, u.weakVs, content.units, self, true);
      if (self === 'antiArmor') {
        expect(strong[0], u.id).toBe('heavy');
        expect(weak, u.id).toContain('infantry');
      }
      if (self === 'heavy') {
        expect(strong[0], u.id).toBe('infantry');
        expect(weak[0], u.id).toBe('antiArmor');
      }
      if (self === 'infantry') {
        expect(strong[0], u.id).toBe('antiArmor');
        expect(weak[0], u.id).toBe('heavy');
      }
      expect(strong.filter((c) => weak.includes(c)), u.id).toEqual([]);
    }
    // Epics and Legendaries keep their measured lists (the Anti-heavy multiplier skips Legendaries).
    expect(takesCounterFloor(content.units['mammoth_matriarch']!)).toBe(false);
    expect(takesCounterFloor(content.units['sabertooth']!)).toBe(false);
  });

  it('labels the Anti-armor role "Anti-heavy" (owner feedback 2026-09-29)', () => {
    expect(i18n.t(CLASS_NAME_KEY.antiArmor)).toBe('Anti-heavy');
  });

  it('the Heavy counter hint (A9.2): 2+ Heavies, or Heavies at 40%+ of the value on the lane', () => {
    const h = { group: 'heavy' as const, value: 150 };
    const i = { group: 'infantry' as const, value: 50 };
    expect(heavyThreat([])).toBe(false);
    expect(heavyThreat([i, i, i])).toBe(false);
    expect(heavyThreat([h])).toBe(true);
    expect(heavyThreat([h, h, ...Array.from({ length: 12 }, () => i)])).toBe(true);
    // One Heavy among 5 Infantry is 150 of 400 = 37.5%: below the bar.
    expect(heavyThreat([h, i, i, i, i, i])).toBe(false);
    // A Legendary heavy is group `legendary`, so it does not count.
    expect(heavyThreat([{ group: 'legendary', value: 350 }])).toBe(false);
  });

  it('has a label, a colour and a glyph for every class', () => {
    const ids = Object.keys(CLASS_NAME_KEY) as ClassGlyphId[];
    for (const id of ids) {
      expect(i18n.has(CLASS_NAME_KEY[id]), id).toBe(true);
      expect(CLASS_GLYPH[id].length, id).toBeGreaterThan(0);
      expect(classGlyphSvg(id)).toContain('<path');
    }
    for (const r of COUNTER_LEGEND) {
      expect(ids).toContain(r.a);
      expect(ids).toContain(r.b);
    }
  });

  it('gives every card tile a class', () => {
    const save = {
      collection: {},
      powersOwned: [],
      skins: { equipped: {} },
    } as never;
    const t = (k: string) => k;
    for (const id of [...content.order.units, ...content.order.turrets, ...content.order.powers]) {
      const tile = cardTile(save, content, id, t)!;
      expect(tile.cls, id).toBeTruthy();
    }
  });
});
