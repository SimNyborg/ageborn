/**
 * The avatar creator's rules (owner request 2026-10-07, AUDIT §6): starter parts for everyone, earned
 * wearables only (never sold), War Path, Trophy Road, milestone and feat grants by state, and the
 * Time Capsule and Wardrobe Crate pools through the existing collection rules.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { equipCosmetic, poolItems, syncEarnedCosmetics } from '../cosmetics';
import { ownsAvatarPart, setAvatarLook } from '../avatar';
import { C, fresh } from './helpers';

const owned = (s: SaveDoc, ...keys: string[]): SaveDoc => ({ ...s, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, ...keys] } });

describe('avatar creator (meta)', () => {
  it('lets anyone wear starter parts and only owners wear wearables', () => {
    const s = fresh();
    expect(ownsAvatarPart(s, C, 'hair_afro')).toBe(true);
    expect(ownsAvatarPart(s, C, 'hat_wool_cap')).toBe(false);
    expect(setAvatarLook(s, C, { headwear: 'hat_wool_cap' })).toEqual({ ok: false, reason: 'notOwned' });
    const r = setAvatarLook(owned(s, 'avatar.hat_wool_cap'), C, { headwear: 'hat_wool_cap', hair: 'hair_bun' }, { skin: 7, cloth: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.profile.avatar.look).toMatchObject({ headwear: 'hat_wool_cap', hair: 'hair_bun' });
      expect(r.value.profile.avatar.tints).toMatchObject({ skin: 7, cloth: 2 });
      expect(r.value.profile.avatar.seed).toBe(s.profile.avatar.seed);
    }
  });

  it('rejects unknown parts, parts in the wrong slot and tints out of range', () => {
    const s = fresh();
    expect(setAvatarLook(s, C, { hair: 'nope' })).toEqual({ ok: false, reason: 'unknownPart' });
    expect(setAvatarLook(s, C, { hair: 'eyes_bright' })).toEqual({ ok: false, reason: 'wrongSlot' });
    expect(setAvatarLook(s, C, {}, { skin: 8 })).toEqual({ ok: false, reason: 'badTint' });
    expect(setAvatarLook(s, C, {}, { hair: -1 })).toEqual({ ok: false, reason: 'badTint' });
  });

  it('equips through equipCosmetic', () => {
    const r = equipCosmetic(fresh(), C, { slot: 'avatar', look: { eyes: 'eyes_starry' }, tints: { eyes: 3 } });
    expect(r.ok && r.value.profile.avatar.look?.eyes).toBe('eyes_starry');
  });

  it('grants War Path boss headwear on Normal, the star chest top at 30/30 and milestone Legendaries', () => {
    const s = fresh();
    const region = C.warPath.regions.find((x) => x.age === 'stone')!;
    const boss = region.levels.find((id) => C.warPath.levels[id]?.role === 'boss')!;
    const easy = syncEarnedCosmetics({ ...s, warPath: { ...s.warPath, stars: { [boss]: 1 }, crowns: { [boss]: 1 } } }, C).save;
    expect(easy.cosmetics.owned).not.toContain('avatar.hat_mammoth_hood');
    const normal = syncEarnedCosmetics({ ...s, warPath: { ...s.warPath, stars: { [boss]: 1 }, crowns: { [boss]: 2 } } }, C).save;
    expect(normal.cosmetics.owned).toContain('avatar.hat_mammoth_hood');
    const allStars = Object.fromEntries(region.levels.map((id) => [id, 3]));
    const chest = syncEarnedCosmetics({ ...s, warPath: { ...s.warPath, stars: allStars } }, C).save;
    expect(chest.cosmetics.owned).toContain('avatar.top_fur_mantle');
    const two = Object.fromEntries(region.levels.map((id, i) => [id, i === 0 ? 2 : 3]));
    expect(syncEarnedCosmetics({ ...s, warPath: { ...s.warPath, stars: two } }, C).save.cosmetics.owned).not.toContain('avatar.top_fur_mantle');
    const scout = syncEarnedCosmetics(owned(s, 'card_scout'), C).save;
    expect(scout.cosmetics.owned).toContain('avatar.acc_scout_spyglass');
  });

  it('puts Common to Epic wearables in the Time Capsule pool and Rare to Legendary ones in the crate pool', () => {
    const cap = poolItems(C, 'capsule').filter((x) => x.collection === 'avatar');
    const crate = poolItems(C, 'crate').filter((x) => x.collection === 'avatar');
    expect(cap.length).toBeGreaterThan(30);
    expect(cap.every((x) => x.rarity !== 'legendary')).toBe(true);
    expect(crate.every((x) => x.rarity !== 'common')).toBe(true);
    expect(crate.some((x) => x.rarity === 'legendary')).toBe(true);
  });
});
