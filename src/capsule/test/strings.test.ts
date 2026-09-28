/**
 * Every string the capsule show puts on screen goes through i18n (CLAUDE.md "Strings"): each
 * `capsule.*` key the code names exists in `capsule.en.json`, every key there is used, and the
 * content keys the show builds from ids (tier, rarity, foil, age names) resolve.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { flattenStrings, i18n } from '@/i18n';
import strings from '@/i18n/capsule.en.json';
import { createCatalog } from '../catalog';
import { TIER_ORDER } from '../tiers';

const sources = import.meta.glob<string>('../*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
const code = Object.values(sources).join('\n');
const defined = Object.keys(flattenStrings(strings));

describe('capsule strings (i18n)', () => {
  it('defines every capsule.* key the code uses', () => {
    const used = new Set([...code.matchAll(/'(capsule\.[A-Za-z.]+)'/g)].map((m) => m[1] ?? ''));
    expect(used.size).toBeGreaterThan(20);
    for (const key of used) expect(defined, key).toContain(key);
  });

  it('uses every key it defines', () => {
    for (const key of defined) expect(code.includes(`'${key}'`), key).toBe(true);
  });

  it('resolves the content names it builds from ids', () => {
    for (const tier of TIER_ORDER) expect(i18n.has(`capsuleTier.${tier}.name`), tier).toBe(true);
    for (const r of ['common', 'rare', 'epic', 'legendary']) expect(i18n.has(`rarity.${r}.name`), r).toBe(true);
    for (const f of ['bronze', 'silver', 'holo']) expect(i18n.has(`foil.${f}.name`), f).toBe(true);
    for (const a of ['stone', 'medieval', 'gunpowder', 'modern', 'future']) expect(i18n.has(`age.${a}.name`), a).toBe(true);
    const catalog = createCatalog(content);
    for (const id of [...Object.keys(content.units), ...Object.keys(content.turrets)]) expect(i18n.has(catalog.card(id).nameKey), id).toBe(true);
    for (const id of Object.keys(content.skins)) expect(i18n.has(catalog.skin(id).nameKey), id).toBe(true);
  });
});
