/**
 * The cosmetic collections (DESIGN A18.9.4, owner direction 2026-09-28): sizes, sources, strings, the
 * release gate and the tone of the quotes (A16.28: friendly, never insulting). Owned by Track C; the
 * collections with their own data file have their own test: `scenes.test.ts` (Track A),
 * `baseSkins.test.ts` (Track B) and `nationalFlags.test.ts` (Track D).
 */
import { describe, expect, it } from 'vitest';
import type { AgeId } from '@/contracts/ids';
import { flattenStrings, stringTables } from '@/i18n';
import strings from '@/i18n/cosmetics.en.json';
import { AGE_ORDER, content } from '../index';
import { validateContent } from '../schema';
import type { CosmeticCollection, CosmeticItemDef } from '../types';

const col = content.cosmetics.collections;
const of = (c: CosmeticCollection): CosmeticItemDef[] => col.items.filter((x) => x.collection === c);
const en = flattenStrings(strings);
const all = stringTables.en ?? {};

describe('cosmetic collections (A18.9.4)', () => {
  it('validates', () => {
    const issues = validateContent(content).filter((i) => i.path.startsWith('cosmetics'));
    expect(issues).toEqual([]);
  });

  it('has the owner sizes', () => {
    expect(of('emote').length).toBeGreaterThanOrEqual(24);
    expect(of('quote').length).toBe(40);
    // the 15 emblem flags; the Flag Atlas's region rewards are base flags too (PLAN 2d)
    expect(of('baseFlag').filter((x) => x.source.kind !== 'flagRegion' && x.source.kind !== 'flagsOwned').length).toBe(15);
    expect(of('decoration').length).toBeGreaterThanOrEqual(20);
    // battle backdrops (owner request 2026-09-30), the Skies from save v14: at least 8, every rarity, none free at the start
    expect(of('backdrop').length).toBeGreaterThanOrEqual(8);
    expect(new Set(of('backdrop').map((x) => x.rarity)).size).toBe(4);
    expect(col.defaults.backdrop).toBeNull();
    // every age starts on its classic scene (save v14)
    expect(col.defaults.scenes).toEqual({});
  });

  it('has emotes for every age and general themes', () => {
    const themes = new Set(of('emote').map((x) => x.theme));
    for (const age of AGE_ORDER) expect(themes.has(age as AgeId), age).toBe(true);
    expect(of('emote').filter((x) => x.theme === 'general').length).toBeGreaterThanOrEqual(6);
  });

  it('has every decoration kind', () => {
    const kinds = new Set(of('decoration').map((x) => x.kind));
    expect([...kinds].sort()).toEqual(['banner', 'brazier', 'plant', 'statue', 'trophy']);
  });

  it('is all earned: every source is a starter, a drop pool, the road, a feat, an arena, a Codex Level, the War Path, a milestone or Dust', () => {
    const kinds = new Set(col.items.map((x) => x.source.kind));
    for (const k of kinds) {
      expect(['start', 'capsule', 'crate', 'road', 'feat', 'arena', 'codexLevel', 'warPath', 'warPathBoss', 'warPathStars', 'title', 'capsuleTier', 'dust', 'flagRegion', 'flagsOwned']).toContain(k);
    }
    for (const k of ['start', 'capsule', 'crate', 'road', 'feat']) expect(kinds.has(k as never), k).toBe(true);
  });

  it('prices national flags in Dust only, and nothing else (PLAN 2d, owner decisions 2026-10-08)', () => {
    expect(col.drops.flagDust).toBe(500);
    expect(col.drops.firstFlagFree).toBe(true);
    for (const x of col.items) expect(x.source.kind === 'dust', `${x.collection}.${x.id}`).toBe(x.collection === 'nationalFlag');
  });

  it('gates items by `released` only (PLAN 2e): absent or a boolean', () => {
    for (const x of col.items) expect(x.released === undefined || typeof x.released === 'boolean', `${x.collection}.${x.id}`).toBe(true);
    // everything that shipped before the scene, base model and Flag Atlas build stays released
    for (const c of ['emote', 'quote', 'decoration', 'backdrop', 'avatar'] as const) expect(of(c).every((x) => x.released !== false), c).toBe(true);
  });

  it('has a name (and a line for quotes) for every item', () => {
    for (const x of col.items) {
      expect(all[x.nameKey], x.nameKey).toBeTruthy();
      if (x.textKey) expect(all[x.textKey], x.textKey).toBeTruthy();
    }
    for (const c of ['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop', 'scene']) expect(en[`cosmetic.collection.${c}`], c).toBeTruthy();
  });

  it('keeps quotes short, friendly and free of insults (A16.28)', () => {
    const banned = /\b(noob|loser|lose[rs]?|stupid|dumb|idiot|trash|ez|easy win|suck|bad|weak|pathetic|cry|rekt|owned|git gud|hate|kill yourself|shut up)\b/i;
    for (const x of of('quote')) {
      const text = en[x.textKey ?? ''] ?? '';
      expect(text.length, text).toBeLessThanOrEqual(40);
      expect(banned.test(text), text).toBe(false);
    }
  });

  it('never picks a national flag by default', () => {
    expect(col.defaults.nationalFlag).toBeNull();
  });
});
