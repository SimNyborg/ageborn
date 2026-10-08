/**
 * Base skins (PLAN 2c, 2e; `raw/baseSkins.ts`): a full model of one age's base. Owned by Track B.
 */
import { describe, expect, it } from 'vitest';
import { stringTables } from '@/i18n';
import { baseSkinItems } from '../raw/baseSkins';
import { content } from '../index';

const en = stringTables.en ?? {};
const skins = content.cosmetics.collections.items.filter((x) => x.collection === 'baseSkin');

/**
 * PLAN 2e: "Every age has at least 3 released base skins once B is done; a test flips from 'warn' to
 * 'fail' at B's release." Track B sets this to true with the release that completes the set.
 */
const BASE_SKIN_SET_RELEASED = false;

describe('base skins', () => {
  it('come from raw/baseSkins.ts, each on one age, named', () => {
    expect(skins).toEqual(baseSkinItems);
    for (const x of skins) {
      expect(x.age, x.id).toBeDefined();
      expect(en[x.nameKey], x.nameKey).toBeTruthy();
    }
    expect(new Set(skins.map((x) => x.id)).size).toBe(skins.length);
  });

  it('keeps the ten skins players own, with their ids', () => {
    const ids = skins.map((x) => x.id);
    for (const id of ['frost_cave', 'mossy_den', 'gilded_ziggurat', 'rose_keep', 'snowy_keep', 'coral_fort', 'copper_foundry', 'desert_bunker', 'midnight_neon', 'nebula_ark']) {
      expect(ids, id).toContain(id);
      expect(skins.find((x) => x.id === id)?.released, id).not.toBe(false);
    }
  });

  it('has a base skin in every age, and three released ones once the set ships', () => {
    const short: string[] = [];
    for (const age of content.order.ages) {
      const n = skins.filter((x) => x.age === age && x.released !== false).length;
      expect(n, age).toBeGreaterThanOrEqual(1);
      if (BASE_SKIN_SET_RELEASED) expect(n, age).toBeGreaterThanOrEqual(3);
      else if (n < 3) short.push(`${age} ${n}`);
    }
    if (short.length > 0) console.warn(`[base skins] released per age below the 3 of PLAN 2c: ${short.join(', ')}`);
  });
});
