/**
 * The cosmetic collections (DESIGN A18.9.4, owner direction 2026-09-28): sizes, required national
 * flags, sources, strings and the tone of the quotes (A16.28: friendly, never insulting).
 */
import { describe, expect, it } from 'vitest';
import type { AgeId } from '@/contracts/ids';
import strings from '@/i18n/cosmetics.en.json';
import { flattenStrings } from '@/i18n';
import { AGE_ORDER, content } from '../index';
import { validateContent } from '../schema';
import type { CosmeticCollection, CosmeticItemDef } from '../types';

const col = content.cosmetics.collections;
const of = (c: CosmeticCollection): CosmeticItemDef[] => col.items.filter((x) => x.collection === c);
const en = flattenStrings(strings);

describe('cosmetic collections (A18.9.4)', () => {
  it('validates', () => {
    const issues = validateContent(content).filter((i) => i.path.startsWith('cosmetics'));
    expect(issues).toEqual([]);
  });

  it('has the owner sizes', () => {
    expect(of('emote').length).toBeGreaterThanOrEqual(24);
    expect(of('quote').length).toBe(40);
    expect(of('baseFlag').length).toBe(15);
    expect(of('nationalFlag').length).toBeGreaterThanOrEqual(40);
    expect(of('decoration').length).toBeGreaterThanOrEqual(20);
    for (const age of AGE_ORDER) expect(of('baseSkin').some((x) => x.age === age), `base skin for ${age}`).toBe(true);
    // battle backdrops (owner request 2026-09-30): at least 8, every rarity, none free at the start
    expect(of('backdrop').length).toBeGreaterThanOrEqual(8);
    expect(new Set(of('backdrop').map((x) => x.rarity)).size).toBe(4);
    expect(col.defaults.backdrop).toBeNull();
  });

  it('has emotes for every age and general themes', () => {
    const themes = new Set(of('emote').map((x) => x.theme));
    for (const age of AGE_ORDER) expect(themes.has(age as AgeId), age).toBe(true);
    expect(of('emote').filter((x) => x.theme === 'general').length).toBeGreaterThanOrEqual(6);
  });

  it('has the national flags the owner named (country flags only)', () => {
    const countries = new Set(of('nationalFlag').map((x) => x.country));
    for (const c of ['dk', 'gb-eng', 'gb', 'us', 'de', 'fr', 'se', 'no']) expect(countries.has(c), c).toBe(true);
    expect(countries.size).toBe(of('nationalFlag').length);
    // every national flag is earned from the capsule pool (so it can also be crafted), none at the start
    for (const x of of('nationalFlag')) expect(x.source.kind).toBe('capsule');
  });

  it('has every decoration kind', () => {
    const kinds = new Set(of('decoration').map((x) => x.kind));
    expect([...kinds].sort()).toEqual(['banner', 'brazier', 'plant', 'statue', 'trophy']);
  });

  it('is all earned: every source is a starter, a drop pool, the road, a feat, an arena, a Codex Level or the War Path', () => {
    const kinds = new Set(col.items.map((x) => x.source.kind));
    for (const k of kinds) expect(['start', 'capsule', 'crate', 'road', 'feat', 'arena', 'codexLevel', 'warPath']).toContain(k);
    for (const k of ['start', 'capsule', 'crate', 'road', 'feat']) expect(kinds.has(k as never), k).toBe(true);
  });

  it('has a name (and a line for quotes) for every item', () => {
    for (const x of col.items) {
      expect(en[x.nameKey], x.nameKey).toBeTruthy();
      if (x.textKey) expect(en[x.textKey], x.textKey).toBeTruthy();
    }
    for (const c of ['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop']) expect(en[`cosmetic.collection.${c}`]).toBeTruthy();
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
