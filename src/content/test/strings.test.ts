/**
 * English strings for all content (C2/WP1: "Write English strings for all content. Keys are final").
 * Every key the content references exists in `src/i18n/content.en.json`, and the file holds nothing
 * else, so Danish translators (v1.1) get exactly the keys the game uses.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier, Foil, Rarity, Role, RoleGroup, Tag } from '@/contracts/ids';
import { flattenStrings, i18n } from '@/i18n';
import strings from '@/i18n/content.en.json';
import {
  ageMechanicKey,
  ageNameKey,
  bannerNameKey,
  capsuleKindNameKey,
  capsuleTierNameKey,
  content,
  emoteNameKey,
  foilNameKey,
  formatDescKey,
  formatNameKey,
  frameNameKey,
  generalKey,
  groupNameKey,
  rarityNameKey,
  roleNameKey,
  skinLookKey,
  tagNameKey,
  titleNameKey,
  titleUnlockKey,
} from '../index';

const ROLES: Role[] = [
  'infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'skirmisher', 'siege', 'artillery', 'airBomber', 'airGunship', 'antiMech', 'siegeHeavy',
];
const GROUPS: RoleGroup[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'];
const TAGS: Tag[] = ['light', 'armored', 'bio', 'mech', 'ground', 'air', 'legendary', 'support', 'ranged', 'melee'];

/** Every string key the content references. */
function referencedKeys(): string[] {
  const c = content;
  const keys: string[] = [];
  for (const u of Object.values(c.units)) keys.push(u.nameKey, u.descKey);
  for (const t of Object.values(c.turrets)) keys.push(t.nameKey, t.descKey);
  for (const p of Object.values(c.powers)) keys.push(p.nameKey, p.descKey);
  for (const s of Object.values(c.skins)) keys.push(s.nameKey, skinLookKey(s.id));
  for (const a of c.order.ages) keys.push(ageNameKey(a), ageMechanicKey(a));
  for (const f of c.order.formats) keys.push(formatNameKey(f), formatDescKey(f));
  for (const r of c.rarities.order as Rarity[]) keys.push(c.rarities.cards[r].nameKey, rarityNameKey(r));
  for (const r of c.rarities.skinOrder) keys.push(c.rarities.skins[r].nameKey);
  for (const f of c.rarities.foilOrder as Foil[]) keys.push(c.rarities.foils[f].nameKey, foilNameKey(f));
  for (const r of ROLES) keys.push(roleNameKey(r));
  for (const g of GROUPS) keys.push(groupNameKey(g));
  for (const t of TAGS) keys.push(tagNameKey(t));
  for (const t of c.capsules.tierOrder as CapsuleTier[]) keys.push(c.capsules.tiers[t].nameKey, capsuleTierNameKey(t));
  for (const k of Object.values(c.capsules.kinds)) keys.push(k.nameKey, capsuleKindNameKey(k.kind));
  for (const a of c.arenas.list) keys.push(a.nameKey);
  for (const id of c.generals.order) {
    const g = c.generals.list[id];
    keys.push(g.nameKey, g.personalityKey, g.signatureKey, g.lineKey, ...g.disclosureKeys);
    keys.push(generalKey(id, 'name'), generalKey(id, 'line'));
  }
  for (const q of [...c.quests.daily, c.quests.weekly]) keys.push(q.nameKey);
  for (const id of c.dailyModifiers.order) keys.push(c.dailyModifiers.list[id].nameKey, c.dailyModifiers.list[id].descKey);
  for (const b of c.cosmetics.banners) keys.push(b.nameKey, bannerNameKey(b.id));
  for (const f of c.cosmetics.frames) keys.push(f.nameKey, frameNameKey(f.id));
  for (const t of c.cosmetics.titles) keys.push(t.nameKey, titleNameKey(t.id), titleUnlockKey(t.id));
  for (const e of c.cosmetics.emotes) keys.push(e.nameKey, emoteNameKey(e.id));
  return [...new Set(keys)].sort();
}

const table = flattenStrings(strings);

describe('content.en.json', () => {
  it('has every key the content references', () => {
    const missing = referencedKeys().filter((k) => table[k] === undefined);
    expect(missing).toEqual([]);
  });

  it('has no keys the content does not use', () => {
    const used = new Set(referencedKeys());
    expect(Object.keys(table).filter((k) => !used.has(k))).toEqual([]);
  });

  it('has only non-empty strings, trimmed', () => {
    for (const [k, s] of Object.entries(table)) {
      expect(s.length, k).toBeGreaterThan(0);
      expect(s.trim(), k).toBe(s);
    }
  });

  it('uses only the {n} placeholder, and only where the quest target fills it', () => {
    const questKeys = new Set([...content.quests.daily, content.quests.weekly].map((q) => q.nameKey));
    for (const [k, s] of Object.entries(table)) {
      for (const m of s.matchAll(/\{(\w+)\}/g)) {
        expect(m[1], k).toBe('n');
        expect(questKeys.has(k), k).toBe(true);
      }
    }
  });

  it('keeps to our own IP (CLAUDE.md)', () => {
    for (const s of Object.values(table)) expect(s.toLowerCase()).not.toContain('age of war');
  });

  it('is loaded by the i18n module', () => {
    expect(i18n.t('card.bonker.name')).toBe('Bonker');
    expect(i18n.t('quest.win_2.name', { n: 2 })).toBe('Win 2 battles');
    expect(i18n.t('general.warden.disclosure')).toMatch(/Legendaries/);
  });
});
