/**
 * Card classes (owner feedback 2026-09-28 "card class and counters visible"): every unit of every
 * age maps to one of the seven classes, the class labels exist, and Strong vs / Weak vs never name
 * the same class twice.
 */
import { AGE_ORDER, content } from '@/content';
import { CLASS_GLYPH, COUNTER_LEGEND, UNIT_CLASSES, counterClasses, unitClass, type ClassGlyphId } from '@/core/cardClass';
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
    for (const age of AGE_ORDER) expect(new Set(units.filter((u) => u.age === age).map(unitClass)).size, age).toBeGreaterThanOrEqual(4);
  });

  it('never lists a class as both strong and weak', () => {
    for (const u of units) {
      const { strong, weak } = counterClasses(u.strongVs, u.weakVs, content.units);
      expect(strong.filter((c) => weak.includes(c)), u.id).toEqual([]);
    }
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
    const save = { collection: {}, powersOwned: [], skins: { equipped: {} } } as never;
    const t = (k: string) => k;
    for (const id of [...content.order.units, ...content.order.turrets, ...content.order.powers]) {
      const tile = cardTile(save, content, id, t)!;
      expect(tile.cls, id).toBeTruthy();
    }
  });
});
