import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { createCatalog } from '../catalog';

describe('createCatalog (from compiled content)', () => {
  const c = createCatalog(content);

  it('describes units, turrets and powers', () => {
    expect(c.card('mammoth_matriarch')).toEqual({
      age: 'stone',
      visualId: 'unit.mammoth_matriarch',
      nameKey: 'card.mammoth_matriarch.name',
      view: 'unit',
      group: 'legendary',
    });
    expect(c.card('trebuchet').age).toBe('medieval');
    expect(c.card('trebuchet').visualId).toBe('turret.trebuchet');
  });

  it('tells walkouts to stage turrets as turrets and units with their role group (DESIGN B5)', () => {
    expect(c.card('grumpy_toad')).toMatchObject({ view: 'turret', group: null });
    expect(c.card('sabertooth')).toMatchObject({ view: 'unit', group: 'epic' });
    expect(c.card('spear_hunter')).toMatchObject({ view: 'unit', group: 'antiArmor' });
    for (const id of Object.keys(content.turrets)) expect(c.card(id).view, id).toBe('turret');
    for (const id of Object.keys(content.units)) expect(c.card(id).view, id).toBe('unit');
  });

  it('describes skins with their rarity and target', () => {
    const s = c.skin('frost_matriarch');
    expect(s.rarity).toBe('legendary');
    expect(s.target).toBe('mammoth_matriarch');
    expect(s.nameKey).toBe('skin.frost_matriarch.name');
  });

  it('reads which capsule kinds climb from content (A6.4)', () => {
    expect(c.hasClimb('win')).toBe(true);
    expect(c.hasClimb('daily')).toBe(true);
    expect(c.hasClimb('meter')).toBe(true);
    for (const k of ['road', 'age', 'codex', 'conquest', 'ageUnlock'] as const) expect(c.hasClimb(k)).toBe(false);
  });

  it('falls back for unknown ids', () => {
    expect(c.card('nope').visualId).toBe('unit.nope');
    expect(c.skin('nope').rarity).toBe('rare');
  });
});
