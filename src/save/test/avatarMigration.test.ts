/**
 * Save v12, the avatar creator ("Make your General", owner request 2026-10-07, AUDIT §6.7): every legacy
 * seeded face maps to starter parts through a frozen table, so every avatar keeps its face and hat;
 * `portraitCard` and `seed` are kept, `parts` is cleared; the step is idempotent.
 */
import { describe, expect, it } from 'vitest';
import { avatar } from '@/content/raw/avatar';
import { legacyLook } from '@/ui/components/avatar/look';
import { migrate } from '../migrations';
import { legacyToLook, v12 } from '../migrations/v12';
import { validateSaveDoc } from '../schema';
import { SAVE_FIXTURES } from './helpers';

type Doc = Record<string, unknown> & { v: number; profile: { avatar: Record<string, unknown> } };

const v11 = (avatarSpec?: Record<string, unknown>): Doc => {
  const d = JSON.parse(JSON.stringify(SAVE_FIXTURES[11])) as Doc;
  if (avatarSpec) d.profile.avatar = avatarSpec;
  return d;
};

const STARTERS = new Map(avatar.parts.filter((p) => p.rarity === 'starter').map((p) => [p.id, p.slot]));

describe('save v12: the avatar creator', () => {
  it('migrates the frozen v11 fixture, keeps the portrait card and validates', () => {
    const m = migrate(v11());
    expect(m.ok).toBe(true);
    const doc = (m as { doc: Doc }).doc;
    expect(validateSaveDoc(doc).ok).toBe(true);
    const a = doc.profile.avatar as { seed: number; parts: object; portraitCard?: string; look: Record<string, string>; tints: Record<string, number> };
    expect(a.seed).toBe(482113);
    expect(a.parts).toEqual({});
    expect(a.portraitCard).toBe('tuskback');
    // the fixture forced hair 7 → 7 % 6 = 1 (crop)
    expect(a.look.hair).toBe('hair_crop');
    expect(Object.keys(a.look).sort()).toEqual([...avatar.slots].sort());
  });

  it('maps 1,000 seeded legacy looks to valid starter parts in range, the same way the UI draws them', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const s = seed * 7919 + 13;
      const parts: Record<string, number> = seed % 5 === 0 ? { hat: seed, skin: -seed } : {};
      const m = legacyToLook(s, parts);
      for (const [slot, id] of Object.entries(m.look)) expect(STARTERS.get(id), `${seed} ${slot} ${id}`).toBe(slot);
      expect(m.tints.skin).toBeLessThan(avatar.tints.skin);
      expect(m.tints.hair).toBeLessThan(avatar.tints.hair);
      expect(m.tints.cloth).toBeLessThan(avatar.tints.cloth);
      const ui = legacyLook(s, parts);
      expect(ui.parts).toEqual(m.look);
      expect(ui.tints).toEqual(m.tints);
    }
  });

  it('keeps every legacy hat (each old hat is a starter hat)', () => {
    const hats = new Set<string>();
    for (let hat = 0; hat < 6; hat += 1) hats.add(legacyToLook(1, { hat }).look.headwear!);
    expect([...hats].sort()).toEqual(['hat_headband', 'hat_horned_helm', 'hat_none', 'hat_olive_helmet', 'hat_ranger_hat', 'hat_tin_crown']);
  });

  it('is idempotent and never overwrites a look', () => {
    const once = v12.up!(v11({ seed: 5, parts: { hat: 2 } })) as Doc;
    const twice = v12.up!(JSON.parse(JSON.stringify({ ...once, v: 11 }))) as Doc;
    expect(twice.profile.avatar).toEqual(once.profile.avatar);
    const custom = { seed: 9, parts: {}, look: { hair: 'hair_bun' }, tints: { skin: 7 } };
    const kept = v12.up!(v11(custom)) as Doc;
    expect(kept.profile.avatar).toEqual(custom);
  });

  it('survives a malformed avatar', () => {
    const d = v12.up!(v11({ seed: 'x', parts: null })) as Doc;
    expect((d.profile.avatar as { seed: number }).seed).toBe(0);
    expect(d.v).toBe(12);
  });
});
