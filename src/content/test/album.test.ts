import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { ALBUM, ALBUM_NO } from '../album';

describe('Card Album numbers (owner request 2026-09-30)', () => {
  it('gives every troop, turret and power card exactly one fixed number', () => {
    const cards = [...content.order.units, ...content.order.turrets, ...content.order.powers];
    expect(new Set(ALBUM).size).toBe(ALBUM.length);
    for (const id of cards) expect(ALBUM_NO[id], id).toBeGreaterThan(0);
  });

  it('keeps the numbers players already know (No. 1 is the Bonker, No. 136 the Ion Cannon)', () => {
    expect(ALBUM_NO['bonker']).toBe(1);
    expect(ALBUM_NO['mammoth_matriarch']).toBe(7);
    expect(ALBUM_NO['ion_cannon']).toBe(136);
  });
});
