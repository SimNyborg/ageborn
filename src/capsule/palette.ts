/**
 * Colours of the capsule show (DESIGN A10, A11).
 *
 * Tier colours are never rarity colours, and rarity colours appear in UI only (A10 Rules), which
 * is exactly where this package draws them. Everything here is presentation; nothing feeds rules.
 */
import type { AgeId, CapsuleTier, Foil, Rarity } from '@/contracts';

/** Capsule tier colours (A10 table). */
export const TIER_COLORS: Readonly<Record<CapsuleTier, number>> = {
  clay: 0x9c6b4a,
  bronze: 0xc27c3a,
  silver: 0xc9d1dc,
  jade: 0x2fbf71,
  aeon: 0x8b5cf6,
};

/** Every Aeon capsule carries a gold rim (A10: "Violet with a gold rim"). */
export const AEON_RIM = 0xf2c14e;

/** Rarity colours, UI only (A10 Rules). */
export const RARITY_COLORS: Readonly<Record<Rarity, number>> = {
  common: 0xb8c0cc,
  rare: 0x22b8cf,
  epic: 0xa855f7,
  legendary: 0xf5b82e,
};

/** Foil sheen colours: the sweep band and the lasting tint of a foiled card. */
export const FOIL_COLORS: Readonly<Record<Exclude<Foil, 'none'>, number>> = {
  bronze: 0xe0a060,
  silver: 0xe8eef7,
  holo: 0xffffff,
};

/** Holo sweeps through these hues. */
export const HOLO_BANDS: readonly number[] = [0xff5f8f, 0xffc94d, 0x7dff9a, 0x4dd8ff, 0xb57bff];

/** Large-area and accent colours of each age (A11 age palettes), for walkout backdrops and glyphs. */
export const AGE_COLORS: Readonly<Record<AgeId, { sky: number; ground: number; accent: number; light: number }>> = {
  stone: { sky: 0x8c7b68, ground: 0x6e8b3d, accent: 0xc98a3d, light: 0xede3c8 },
  medieval: { sky: 0x6b7682, ground: 0x8e2a4a, accent: 0xd4a437, light: 0xe8dfc8 },
  gunpowder: { sky: 0x2e5e4e, ground: 0x4a3b2e, accent: 0xc9a227, light: 0xefe6cf },
  modern: { sky: 0x62664a, ground: 0x3a3f45, accent: 0xb0306a, light: 0xb8a67a },
  future: { sky: 0x23262e, ground: 0x3af0b4, accent: 0x29e3f5, light: 0xf03aa8 },
  // A17.12
  bronze: { sky: 0xcdbe9e, ground: 0x4f8f7f, accent: 0xb8863b, light: 0x6a5566 },
  industrial: { sky: 0x5b6168, ground: 0x2b2a2e, accent: 0xb06a3b, light: 0xdcd6c8 },
  cosmic: { sky: 0x1e1830, ground: 0x8e44c8, accent: 0x3fe0b0, light: 0xf2f0ff },
};

/** The capsule room: a dusky, warm stage (theme background #1b1a2e). */
export const ROOM = {
  bgInner: 0x3b2d4f,
  bgOuter: 0x0d0b16,
  stone: 0x7d6e60,
  stoneDark: 0x4f453c,
  stoneLight: 0xa8998a,
  brass: 0xc9a227,
  brassDark: 0x7a5f18,
  brassLight: 0xf4dc8a,
  ink: 0x1b1a2e,
  parchment: 0xf4ecd8,
  amber: 0xf5a524,
  dust: 0xb8a58c,
  newStamp: 0xff6a3d,
  ready: 0x4ade80,
} as const;

/** Colour as a CSS hex string, for DOM styles. */
export function cssHex(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** Linear blend of two RGB colours; `t` in [0, 1]. */
export function mixColor(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (shift: number): number => {
    const x = (a >> shift) & 0xff;
    const y = (b >> shift) & 0xff;
    return Math.round(x + (y - x) * k) & 0xff;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Darkens (negative) or lightens (positive) a colour by `amount` in [-1, 1]. */
export function shade(color: number, amount: number): number {
  return amount >= 0 ? mixColor(color, 0xffffff, amount) : mixColor(color, 0x000000, -amount);
}
