/**
 * Scenes (PLAN 2b, 2e; `raw/scenes.ts`): the scenery of one age, equipped per age; each age's classic
 * scene is free and is not an item. Owned by Track A.
 */
import { describe, expect, it } from 'vitest';
import { stringTables } from '@/i18n';
import { sceneClassicNameKey } from '../keys';
import { sceneItems } from '../raw/scenes';
import { content } from '../index';

const en = stringTables.en ?? {};
const scenes = content.cosmetics.collections.items.filter((x) => x.collection === 'scene');

describe('scenes', () => {
  it('come from raw/scenes.ts, each on one age, with the cosmetic key shapes', () => {
    expect(scenes).toEqual(sceneItems);
    for (const x of scenes) {
      expect(x.age, x.id).toBeDefined();
      expect(x.art).toBe(`cosmetic.scene.${x.id}`);
      expect(x.nameKey).toBe(`cosmetic.scene.${x.id}.name`);
      expect(en[x.nameKey], x.nameKey).toBeTruthy();
    }
    expect(new Set(scenes.map((x) => x.id)).size).toBe(scenes.length);
  });

  it('are earned from the Time Capsule, the Wardrobe Crate or the Trophy Road; Rare or Epic (PLAN 2e)', () => {
    for (const x of scenes) {
      expect(['capsule', 'crate', 'road'], x.id).toContain(x.source.kind);
      expect(['rare', 'epic'], x.id).toContain(x.rarity);
    }
  });

  it('two per age once the scene rows are in', () => {
    if (scenes.length === 0) return;
    for (const age of content.order.ages) expect(scenes.filter((x) => x.age === age).length, age).toBe(2);
  });

  it('every age has its classic scene, named', () => {
    for (const age of content.order.ages) expect(en[sceneClassicNameKey(age)], age).toBeTruthy();
  });
});
