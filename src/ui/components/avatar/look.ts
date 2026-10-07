/**
 * Looks for the renderer (AUDIT §6.7): the creator's saved look, the frozen v12 mapping of a legacy
 * seeded face (a save without `look`), seeded random starter looks (onboarding pre-fill, Shuffle,
 * procedural commanders) and the AI Generals' fixed looks from content.
 *
 * The legacy mapping must stay identical to `src/save/migrations/v12.ts` (a test compares them).
 */
import type { AvatarSlot, AvatarSpec } from '@/contracts';
import { avatar as AVATAR } from '@/content/raw/avatar';
import { mulberry32 } from '@/core';
import type { ResolvedLook } from './render';

// ---------------------------------------------------------------------------------------------
// The frozen legacy roll (v11 and older): order skin, hairColor, hair, eyes, brows, mouth, beard, hat, bg
// ---------------------------------------------------------------------------------------------

export const LEGACY_ORDER = ['skin', 'hairColor', 'hair', 'eyes', 'brows', 'mouth', 'beard', 'hat', 'bg'] as const;
export const LEGACY_COUNTS: Record<(typeof LEGACY_ORDER)[number], number> = { skin: 6, hairColor: 6, hair: 6, eyes: 4, brows: 3, mouth: 4, beard: 4, hat: 6, bg: 6 };

export const LEGACY_MAP = {
  skin: [0, 1, 2, 4, 5, 6],
  hairColor: [0, 2, 3, 7, 10, 9],
  hair: ['hair_bald', 'hair_crop', 'hair_spikes', 'hair_long', 'hair_topknot', 'hair_mohawk'],
  eyes: ['eyes_bright', 'eyes_happy', 'eyes_wide', 'eyes_sleepy'],
  brows: ['brows_determined', 'brows_raised', 'brows_arched'],
  mouth: ['mouth_smile', 'mouth_grin', 'mouth_flat', 'mouth_shout'],
  beard: ['beard_none', 'beard_stubble', 'beard_full', 'beard_moustache'],
  hat: ['hat_none', 'hat_horned_helm', 'hat_headband', 'hat_ranger_hat', 'hat_tin_crown', 'hat_olive_helmet'],
  bg: ['bg_sky', 'bg_meadow', 'bg_violet', 'bg_ember', 'bg_sun', 'bg_lagoon'],
  /** The old shoulder colour was bg[(bg + 2) % 6]; each maps to the nearest non-team cloth tint. */
  shoulderCloth: [4, 1, 2, 0, 3, 4],
} as const;

/** The legacy face of a seed, exactly as the v11 code rolled it. */
export function legacyRoll(seed: number, parts: Readonly<Record<string, number>> = {}): Record<(typeof LEGACY_ORDER)[number], number> {
  const rng = mulberry32(seed);
  const out = {} as Record<(typeof LEGACY_ORDER)[number], number>;
  for (const k of LEGACY_ORDER) {
    const n = LEGACY_COUNTS[k];
    const rolled = rng.int(n);
    const forced = parts[k];
    out[k] = forced === undefined ? rolled : ((Math.trunc(forced) % n) + n) % n;
  }
  return out;
}

/** The v12 look of a legacy seeded face (nothing is taken away: every old part has a starter part). */
export function legacyLook(seed: number, parts: Readonly<Record<string, number>> = {}): ResolvedLook {
  const r = legacyRoll(seed, parts);
  const M = LEGACY_MAP;
  return {
    parts: {
      face: 'face_round',
      eyes: M.eyes[r.eyes],
      brows: M.brows[r.brows],
      nose: 'nose_button',
      mouth: M.mouth[r.mouth],
      hair: M.hair[r.hair],
      facialHair: M.beard[r.beard],
      headwear: M.hat[r.hat],
      top: 'top_tunic',
      accessory: 'acc_none',
      background: M.bg[r.bg],
    },
    tints: { skin: M.skin[r.skin] ?? 0, hair: M.hairColor[r.hairColor] ?? 0, eyes: 0, cloth: M.shoulderCloth[(r.bg + 2) % 6] ?? 0 },
  };
}

const clampTint = (n: number | undefined, max: number, fallback: number): number => (n !== undefined && Number.isInteger(n) && n >= 0 && n < max ? n : fallback);

/** The look a spec shows: the creator's `look` over the legacy mapping of its seed (so no slot is ever empty). */
export function resolveLook(spec: Pick<AvatarSpec, 'seed' | 'parts' | 'look' | 'tints'>): ResolvedLook {
  const base = legacyLook(spec.seed, spec.parts);
  if (!spec.look && !spec.tints) return base;
  const tn = AVATAR.tints;
  return {
    parts: { ...base.parts, ...(spec.look ?? {}) },
    tints: {
      skin: clampTint(spec.tints?.skin, tn.skin, base.tints.skin),
      hair: clampTint(spec.tints?.hair, tn.hair, base.tints.hair),
      eyes: clampTint(spec.tints?.eyes, tn.eyes, base.tints.eyes),
      cloth: clampTint(spec.tints?.cloth, tn.cloth, base.tints.cloth),
    },
  };
}

const startersBySlot = (() => {
  const m = new Map<AvatarSlot, string[]>();
  for (const p of AVATAR.parts) if (p.rarity === 'starter') m.set(p.slot, [...(m.get(p.slot) ?? []), p.id]);
  return m;
})();

/** Starter part ids of a slot, in content order. */
export function starterParts(slot: AvatarSlot): string[] {
  return startersBySlot.get(slot) ?? [];
}

/**
 * A random starter look from a seed (onboarding pre-fill, Shuffle, procedural commanders). Optional
 * slots stay empty more often, so a shuffled General reads clean.
 */
export function randomStarterLook(seed: number): ResolvedLook {
  const rng = mulberry32(seed);
  const pick = (slot: AvatarSlot, emptyBias = 0): string => {
    const all = starterParts(slot);
    if (emptyBias > 0 && rng.int(100) < emptyBias) return all[0]!;
    return all[rng.int(all.length)]!;
  };
  const parts: Partial<Record<AvatarSlot, string>> = {
    face: pick('face'),
    eyes: pick('eyes'),
    brows: pick('brows'),
    nose: pick('nose'),
    mouth: pick('mouth'),
    hair: pick('hair'),
    facialHair: pick('facialHair', 55),
    headwear: pick('headwear', 60),
    top: pick('top'),
    accessory: pick('accessory', 65),
    background: pick('background'),
  };
  const tn = AVATAR.tints;
  return { parts, tints: { skin: rng.int(tn.skin), hair: rng.int(tn.hair), eyes: rng.int(tn.eyes), cloth: rng.int(tn.cloth) } };
}

/** An AI General's fixed look; a procedural commander gets a seeded starter look. */
export function generalLook(id: string, seed: number): ResolvedLook {
  const g = AVATAR.generals[id];
  return g ? { parts: { ...g.look }, tints: { ...g.tints } } : randomStarterLook(seed);
}

/** A stable hash of a look (cache key). */
export function lookKey(l: ResolvedLook): string {
  const p = l.parts;
  return `${AVATAR.slots.map((s) => p[s] ?? '').join(',')}|${l.tints.skin},${l.tints.hair},${l.tints.eyes},${l.tints.cloth}`;
}

/** The ids of wearables (non-starter parts) a look uses. */
export function wearablesIn(l: ResolvedLook): string[] {
  const starters = new Set(AVATAR.parts.filter((x) => x.rarity === 'starter').map((x) => x.id));
  return Object.values(l.parts).filter((id): id is string => !!id && !starters.has(id));
}
