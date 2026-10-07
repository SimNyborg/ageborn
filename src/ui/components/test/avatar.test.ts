/**
 * The avatar renderer ("Make your General", AUDIT §6): every content part has art and every art has a
 * content part, the palettes match the content's tint counts, looks render to well-formed SVG with no
 * NaN, low detail drops small shapes, moods change only eyes and mouth, and the General looks resolve.
 */
import { describe, expect, it } from 'vitest';
import { avatar } from '@/content/raw/avatar';
import { generalLook, randomStarterLook, resolveLook, wearablesIn } from '../avatar/look';
import { TINTS } from '../avatar/palette';
import { avatarSvg, type ResolvedLook } from '../avatar/render';
import { STARTER_ART } from '../avatar/starter';
import { WEARABLE_ART } from '../avatar/wearables';

const LIB = { ...STARTER_ART, ...WEARABLE_ART };

const balanced = (svg: string): boolean => {
  const open = (svg.match(/<[a-zA-Z][^>]*>/g) ?? []).filter((x) => !x.endsWith('/>')).length;
  const close = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
  return open === close;
};

describe('avatar parts', () => {
  it('draws every content part, and every drawing is a content part', () => {
    const ids = new Set(avatar.parts.map((p) => p.id));
    expect(avatar.parts.filter((p) => !LIB[p.id]).map((p) => p.id)).toEqual([]);
    expect(Object.keys(LIB).filter((id) => !ids.has(id))).toEqual([]);
    for (const p of avatar.parts) expect(p.rarity === 'starter' ? STARTER_ART[p.id] : WEARABLE_ART[p.id], p.id).toBeDefined();
  });

  it('has the starter and wearable counts of the spec', () => {
    const starters = avatar.parts.filter((p) => p.rarity === 'starter');
    const count = (slot: string) => starters.filter((p) => p.slot === slot).length;
    expect([count('face'), count('eyes'), count('brows'), count('nose'), count('mouth'), count('hair'), count('facialHair'), count('headwear'), count('top'), count('accessory'), count('background')]).toEqual([5, 10, 8, 6, 10, 16, 8, 6, 6, 4, 8]);
    const wear = avatar.parts.filter((p) => p.rarity !== 'starter');
    expect(wear).toHaveLength(96);
  });

  it('matches the palettes to the content tint counts and keeps cloth off the team hues', () => {
    expect(TINTS.skin).toHaveLength(avatar.tints.skin);
    expect(TINTS.hair).toHaveLength(avatar.tints.hair);
    expect(TINTS.eyes).toHaveLength(avatar.tints.eyes);
    expect(TINTS.cloth).toHaveLength(avatar.tints.cloth);
    expect(TINTS.cloth.map((c) => c.toLowerCase())).not.toContain('#2f7df6');
    expect(TINTS.cloth.map((c) => c.toLowerCase())).not.toContain('#f28a1e');
  });
});

describe('avatar renderer', () => {
  const base = randomStarterLook(7);

  it('renders every part on a look as well-formed SVG', () => {
    for (const p of avatar.parts) {
      const look: ResolvedLook = { ...base, parts: { ...base.parts, [p.slot]: p.id } };
      const svg = avatarSvg(look, LIB, { crop: 'bust', detail: 'full', motion: true });
      expect(svg.startsWith('<svg'), p.id).toBe(true);
      expect(svg, p.id).not.toMatch(/NaN|undefined|Infinity/);
      expect(balanced(svg), p.id).toBe(true);
    }
  });

  it('drops small details at low detail and changes only eyes and mouth for a mood', () => {
    const look: ResolvedLook = { ...base, parts: { ...base.parts, accessory: 'acc_freckles' } };
    const full = avatarSvg(look, LIB, { crop: 'head', detail: 'full', motion: false });
    const low = avatarSvg(look, LIB, { crop: 'head', detail: 'low', motion: false });
    expect(low.length).toBeLessThan(full.length);
    const cheer = avatarSvg(look, LIB, { crop: 'bust', detail: 'full', motion: false, mood: 'cheer' });
    const cheer2 = avatarSvg({ ...look, parts: { ...look.parts, eyes: 'eyes_happy', mouth: 'mouth_laugh' } }, LIB, { crop: 'bust', detail: 'full', motion: false });
    expect(cheer).toBe(cheer2);
  });

  it('resolves saved looks over the legacy face and clamps bad tints', () => {
    const r = resolveLook({ seed: 5, parts: {}, look: { hair: 'hair_bun' }, tints: { skin: 99, hair: 3 } });
    expect(r.parts.hair).toBe('hair_bun');
    expect(r.parts.face).toBe('face_round');
    expect(r.tints.hair).toBe(3);
    expect(r.tints.skin).toBeLessThan(avatar.tints.skin);
  });

  it('gives every AI General a fixed look from the parts', () => {
    for (const id of Object.keys(avatar.generals)) {
      const g = generalLook(id, 1);
      for (const [slot, part] of Object.entries(g.parts)) expect(avatar.parts.find((p) => p.id === part)?.slot, `${id} ${slot}`).toBe(slot);
    }
    expect(wearablesIn(generalLook('grogg', 1))).toContain('hat_mammoth_hood');
  });
});
