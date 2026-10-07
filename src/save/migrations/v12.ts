/**
 * Save version 12: the avatar creator ("Make your General", owner request 2026-10-07, AUDIT §6.7).
 * Additive and idempotent; nothing is taken away.
 *
 * 1. Every profile avatar without a `look` gets one: the legacy face is re-rolled exactly as the v11 code
 *    did (`mulberry32(seed)`, one `int(count)` per slot in the fixed order skin, hairColor, hair, eyes,
 *    brows, mouth, beard, hat, bg with counts 6, 6, 6, 4, 3, 4, 4, 6, 6, then the `parts` overrides
 *    wrapped into range) and mapped through the frozen table below to starter parts, so every current
 *    avatar keeps its face and hat. The face shape, nose and accessory (new slots) are round, button and
 *    none; the top is the tunic in the cloth tint nearest the old shoulder colour.
 * 2. `look` and `tints` are written, `seed` and `portraitCard` kept, `parts` cleared to `{}` (the look now
 *    carries them).
 *
 * The order, counts and table are frozen here on purpose: the save package may not read the content
 * or the UI (DESIGN B2). Never edit this step; a later change needs a new version. The UI's legacy view
 * (`src/ui/components/avatar/look.ts`) uses the same table, and a test compares the two.
 */
import { mulberry32 } from '@/core';
import type { SaveVersion } from './types';

const ORDER = ['skin', 'hairColor', 'hair', 'eyes', 'brows', 'mouth', 'beard', 'hat', 'bg'] as const;
const COUNTS: Readonly<Record<(typeof ORDER)[number], number>> = { skin: 6, hairColor: 6, hair: 6, eyes: 4, brows: 3, mouth: 4, beard: 4, hat: 6, bg: 6 };

const MAP = {
  skin: [0, 1, 2, 4, 5, 6],
  hairColor: [0, 2, 3, 7, 10, 9],
  hair: ['hair_bald', 'hair_crop', 'hair_spikes', 'hair_long', 'hair_topknot', 'hair_mohawk'],
  eyes: ['eyes_bright', 'eyes_happy', 'eyes_wide', 'eyes_sleepy'],
  brows: ['brows_determined', 'brows_raised', 'brows_arched'],
  mouth: ['mouth_smile', 'mouth_grin', 'mouth_flat', 'mouth_shout'],
  beard: ['beard_none', 'beard_stubble', 'beard_full', 'beard_moustache'],
  hat: ['hat_none', 'hat_horned_helm', 'hat_headband', 'hat_ranger_hat', 'hat_tin_crown', 'hat_olive_helmet'],
  bg: ['bg_sky', 'bg_meadow', 'bg_violet', 'bg_ember', 'bg_sun', 'bg_lagoon'],
  shoulderCloth: [4, 1, 2, 0, 3, 4],
} as const;

type Avatar = { seed?: unknown; parts?: unknown; portraitCard?: unknown; look?: unknown; tints?: unknown };

/** The v12 `look` and `tints` of a legacy avatar (exported for tests). */
export function legacyToLook(seed: number, parts: Readonly<Record<string, unknown>>): { look: Record<string, string>; tints: Record<string, number> } {
  const rng = mulberry32(seed);
  const r = {} as Record<(typeof ORDER)[number], number>;
  for (const k of ORDER) {
    const n = COUNTS[k];
    const rolled = rng.int(n);
    const forced = parts[k];
    r[k] = typeof forced === 'number' && Number.isFinite(forced) ? ((Math.trunc(forced) % n) + n) % n : rolled;
  }
  return {
    look: {
      face: 'face_round',
      eyes: MAP.eyes[r.eyes]!,
      brows: MAP.brows[r.brows]!,
      nose: 'nose_button',
      mouth: MAP.mouth[r.mouth]!,
      hair: MAP.hair[r.hair]!,
      facialHair: MAP.beard[r.beard]!,
      headwear: MAP.hat[r.hat]!,
      top: 'top_tunic',
      accessory: 'acc_none',
      background: MAP.bg[r.bg]!,
    },
    tints: { skin: MAP.skin[r.skin]!, hair: MAP.hairColor[r.hairColor]!, eyes: 0, cloth: MAP.shoulderCloth[(r.bg + 2) % 6]! },
  };
}

export const v12: SaveVersion = {
  v: 12,
  summary: 'The avatar creator: AvatarSpec gains look and tints, mapped from the legacy seeded face (nothing is taken away)',
  up: (input) => {
    const doc = input as Record<string, unknown> & { profile?: { avatar?: Avatar } };
    const av = doc.profile?.avatar;
    if (av && typeof av === 'object' && (av.look === undefined || av.look === null)) {
      const seed = typeof av.seed === 'number' && Number.isFinite(av.seed) ? Math.trunc(av.seed) : 0;
      const parts = av.parts && typeof av.parts === 'object' ? (av.parts as Record<string, unknown>) : {};
      const m = legacyToLook(seed, parts);
      doc.profile = { ...doc.profile, avatar: { ...av, seed, parts: {}, look: m.look, tints: m.tints } };
    }
    return { ...doc, v: 12 };
  },
};
