/**
 * Colours for the procedural art (DESIGN A11): colour math, team presets, age palettes and the
 * colour rule.
 *
 * Colours are 0xRRGGBB integers. "Darken by p" multiplies each channel by (1 - p), which keeps hue
 * and HSV saturation; that is also what a Pixi tint does, so a white-baked team layer tinted with the
 * team colour yields exactly the darkened shade and outline colours (see `bake.ts`).
 *
 * This module is pure data and math (no Pixi), so tests and the gallery share it.
 */
import type { AgeId, Side, TeamPreset } from '@/contracts/ids';

export type Rgb = [number, number, number];

export function hexToRgb(c: number): Rgb {
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

export function rgbToHex(r: number, g: number, b: number): number {
  const q = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return (q(r) << 16) | (q(g) << 8) | q(b);
}

/** Parses '#rrggbb' or 'rrggbb'. */
export function parseHex(s: string): number {
  const h = s.startsWith('#') ? s.slice(1) : s;
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Bad colour "${s}"`);
  return parseInt(h, 16);
}

export function toCss(c: number, alpha = 1): string {
  const [r, g, b] = hexToRgb(c);
  return alpha >= 1 ? `#${c.toString(16).padStart(6, '0')}` : `rgba(${r},${g},${b},${alpha})`;
}

/** Multiplies every channel by (1 - pct): same hue and saturation, lower value. */
export function darken(c: number, pct: number): number {
  const [r, g, b] = hexToRgb(c);
  const k = 1 - pct;
  return rgbToHex(r * k, g * k, b * k);
}

/** Mixes toward white by `pct`. */
export function lighten(c: number, pct: number): number {
  return mix(c, 0xffffff, pct);
}

export function mix(a: number, b: number, t: number): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Moves a colour toward its own grey (luma) by `amount` (0 = unchanged, 1 = grey). */
export function desaturate(c: number, amount: number): number {
  const [r, g, b] = hexToRgb(c);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return rgbToHex(r + (y - r) * amount, g + (y - g) * amount, b + (y - b) * amount);
}

/** HSV with hue in degrees [0, 360), saturation and value in [0, 1]. */
export function rgbToHsv(c: number): { h: number; s: number; v: number } {
  const [r, g, b] = hexToRgb(c);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max / 255 };
}

// ---------------------------------------------------------------------------------------------
// Team colours (DESIGN A11 Team readability)

/** Side 0 (you, left, blue) and side 1 (opponent, right) per preset. */
export const TEAM_COLORS: Readonly<Record<TeamPreset, readonly [number, number]>> = {
  default: [0x2f7df6, 0xf28a1e],
  blueYellow: [0x2f7df6, 0xf2c21e],
  highContrast: [0x1f5fd6, 0xff6a00],
};

export const TEAM_PRESETS: readonly TeamPreset[] = ['default', 'blueYellow', 'highContrast'];

export function teamColor(side: Side, preset: TeamPreset): number {
  return TEAM_COLORS[preset][side];
}

/**
 * High contrast adds a stripe pattern to banner-type team layers. Only the opponent's banners are
 * striped, so the pattern itself tells the sides apart (docs/decisions.md, WP4).
 */
export function teamStripes(side: Side, preset: TeamPreset): boolean {
  return preset === 'highContrast' && side === 1;
}

// ---------------------------------------------------------------------------------------------
// Colour rule (DESIGN A11, MUST)

/** Hue half-width around every team hue that non-team parts must avoid when saturated. */
export const COLOR_RULE_HUE_DEG = 35;
/** HSV saturation above which an in-band hue counts. */
export const COLOR_RULE_MAX_SAT = 0.4;
/** Share of the silhouette that may use in-band saturated colours (accents). */
export const COLOR_RULE_MAX_SHARE = 0.1;

export interface HueBand {
  /** Inclusive start hue in degrees, [0, 360). The band may wrap past 360. */
  from: number;
  /** Width in degrees. */
  width: number;
}

/** The union of ±35° around every team hue of every preset, merged into bands. */
export function teamHueBands(): HueBand[] {
  const intervals: [number, number][] = [];
  for (const p of TEAM_PRESETS) {
    for (const c of TEAM_COLORS[p]) {
      const h = rgbToHsv(c).h;
      intervals.push([h - COLOR_RULE_HUE_DEG, h + COLOR_RULE_HUE_DEG]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([iv[0], iv[1]]);
  }
  return merged.map(([a, b]) => ({ from: ((a % 360) + 360) % 360, width: b - a }));
}

const BANDS = teamHueBands();

export function hueInTeamBand(h: number): boolean {
  for (const b of BANDS) {
    const d = (((h - b.from) % 360) + 360) % 360;
    if (d <= b.width) return true;
  }
  return false;
}

/** True when a non-team colour would count against the colour rule (in-band hue, saturated). */
export function violatesColorRule(c: number): boolean {
  const { h, s } = rgbToHsv(c);
  return s > COLOR_RULE_MAX_SAT && hueInTeamBand(h);
}

// ---------------------------------------------------------------------------------------------
// Palettes

/** A palette maps zone names to colours. Zones starting with `team` are tinted at runtime. */
export type Palette = Readonly<Record<string, number>>;

export function isTeamZone(zone: string): boolean {
  return zone === 'team' || zone.startsWith('team');
}

/**
 * Team zones bake in grey so a runtime tint reproduces the A11 shade and outline rule:
 * `team` = white (full team colour), `team2` = a darker team colour for secondary areas.
 */
export const TEAM_ZONE_GREY: Readonly<Record<string, number>> = {
  team: 0xffffff,
  team2: 0xc4c4c4,
};

/**
 * A11 age palettes. Large-area colours respect the colour rule; the accent (last column) may cover
 * at most 10% of a silhouette.
 */
export const AGE_PALETTES: Readonly<Record<AgeId, { large: readonly number[]; accent: number; names: readonly string[] }>> = {
  stone: { large: [0x8c7b68, 0x6e8b3d, 0xede3c8], accent: 0xc98a3d, names: ['stone brown', 'moss', 'bone', 'ochre'] },
  medieval: { large: [0x6b7682, 0x8e2a4a, 0xe8dfc8], accent: 0xd4a437, names: ['slate', 'wine', 'parchment', 'gold'] },
  gunpowder: { large: [0x2e5e4e, 0xefe6cf, 0x4a3b2e], accent: 0xc9a227, names: ['bottle green', 'cream', 'dark wood', 'brass'] },
  modern: { large: [0x62664a, 0xb8a67a, 0x3a3f45], accent: 0xb0306a, names: ['olive', 'khaki', 'gunmetal', 'signal red-violet'] },
  future: { large: [0x23262e, 0xf03aa8, 0x3af0b4, 0xf4f6f8], accent: 0x29e3f5, names: ['charcoal', 'magenta', 'mint', 'white', 'cyan'] },
  // A17.12
  bronze: { large: [0xcdbe9e, 0x4f8f7f, 0x6a5566], accent: 0xb8863b, names: ['sandstone', 'verdigris', 'dusk plum', 'polished bronze'] },
  industrial: { large: [0x5b6168, 0x2b2a2e, 0xdcd6c8, 0x8a6a63], accent: 0xb06a3b, names: ['iron', 'coal', 'smoke cream', 'muted brick', 'copper'] },
  cosmic: { large: [0x1e1830, 0x8e44c8, 0xf2f0ff], accent: 0x3fe0b0, names: ['void', 'nebula violet', 'star white', 'mint'] },
};

/**
 * Skin tones. Every tone keeps HSV saturation at or below 0.38, so faces and hands never count
 * against the colour rule however large the head is.
 */
export const SKIN_TONES: readonly number[] = [0xe8c9ad, 0xcfa98c, 0xa8876f, 0x86695a, 0x6a5246];

/** Neutral zones shared by every age (eyes, mouths, soot, highlights). */
export const SHARED_ZONES: Palette = {
  eye: 0xfbf8f0,
  pupil: 0x2a2530,
  mouth: 0x4a3036,
  dark: 0x33302f,
  shadow: 0x000000,
  white: 0xf7f5ef,
  rope: 0xb5a58a,
  cheek: 0xd9a59a,
};

/** Base zone colours per age (every puppet of that age starts from these). */
export const AGE_ZONES: Readonly<Record<AgeId, Palette>> = {
  stone: {
    ...SHARED_ZONES,
    skin: 0xcfa98c,
    hair: 0x4d4038,
    cloth: 0x8c7b68, // stone brown hide
    cloth2: 0x6e8b3d, // moss
    leather: 0x7d6a58,
    fur: 0x8a7866,
    fur2: 0x6b5d50,
    wood: 0x7a6552,
    wood2: 0x5e4d3f,
    stone: 0x9a9288,
    stone2: 0x77716a,
    bone: 0xede3c8,
    accent: 0xc98a3d,
    metal: 0x9a9288,
    moss: 0x6e8b3d,
  },
  medieval: {
    ...SHARED_ZONES,
    skin: 0xe8c9ad,
    hair: 0x5a4a3e,
    cloth: 0x6b7682, // slate
    cloth2: 0x8e2a4a, // wine
    cloth3: 0xe8dfc8, // parchment
    leather: 0x76604e,
    metal: 0xaab2ba,
    metal2: 0x7d8791,
    wood: 0x6e5a48,
    wood2: 0x54443a,
    stone: 0x8f8a84,
    stone2: 0x6c6862,
    fur: 0x6e5a4a,
    fur2: 0x54463b,
    bone: 0xe8dfc8,
    accent: 0xd4a437,
  },
  gunpowder: {
    ...SHARED_ZONES,
    skin: 0xcfa98c,
    hair: 0x3f3530,
    cloth: 0x2e5e4e, // bottle green
    cloth2: 0xefe6cf, // cream
    cloth3: 0x4a3b2e, // dark wood brown
    leather: 0x5e4b3c,
    metal: 0x8d9398,
    metal2: 0x5b6066,
    wood: 0x5a4838,
    wood2: 0x4a3b2e,
    stone: 0x8c8780,
    stone2: 0x6a655f,
    fur: 0x6a5a4c,
    fur2: 0x4f4439,
    bone: 0xefe6cf,
    accent: 0xc9a227,
  },
  modern: {
    ...SHARED_ZONES,
    skin: 0xa8876f,
    hair: 0x3a332e,
    cloth: 0x62664a, // olive
    cloth2: 0xb8a67a, // khaki
    cloth3: 0x3a3f45, // gunmetal
    leather: 0x5c5040,
    metal: 0x6f757c,
    metal2: 0x3a3f45,
    wood: 0x6a5846,
    wood2: 0x4e4236,
    stone: 0x87837c,
    stone2: 0x66625c,
    fur: 0x6a5a4c,
    fur2: 0x4f4439,
    bone: 0xe6dcc4,
    accent: 0xb0306a,
  },
  future: {
    ...SHARED_ZONES,
    skin: 0xe8c9ad,
    hair: 0x2e2a33,
    cloth: 0x23262e, // charcoal
    cloth2: 0xf4f6f8, // white
    cloth3: 0x3af0b4, // mint
    leather: 0x3b3f4a,
    metal: 0xd9dee4,
    metal2: 0x4a4f5c,
    wood: 0x4a4f5c,
    wood2: 0x3b3f4a,
    stone: 0x8a8d96,
    stone2: 0x5c606b,
    fur: 0x5c606b,
    fur2: 0x3b3f4a,
    bone: 0xf4f6f8,
    magenta: 0xf03aa8,
    mint: 0x3af0b4,
    glow: 0x3af0b4,
    accent: 0x29e3f5,
  },
  // A17.12: Bronze (bronze armour stays under 40% saturation; polished bronze is the accent)
  bronze: {
    ...SHARED_ZONES,
    skin: 0xcfa98c,
    hair: 0x4d4038,
    cloth: 0xcdbe9e, // sandstone
    cloth2: 0x4f8f7f, // verdigris
    cloth3: 0x6a5566, // dusk plum
    leather: 0x7a6250,
    metal: 0xb09c78,
    metal2: 0x7a6c54,
    wood: 0x7a6552,
    wood2: 0x5e4d3f,
    stone: 0xb5a888,
    stone2: 0x8f846c,
    fur: 0x7a6858,
    fur2: 0x5e5044,
    bone: 0xede3c8,
    accent: 0xb8863b,
  },
  industrial: {
    ...SHARED_ZONES,
    skin: 0xe8c9ad,
    hair: 0x3f3530,
    cloth: 0x5b6168, // iron
    cloth2: 0xdcd6c8, // smoke cream
    cloth3: 0x8a6a63, // muted brick
    leather: 0x5e4b3c,
    metal: 0x7d838a,
    metal2: 0x2b2a2e,
    wood: 0x5a4838,
    wood2: 0x4a3b2e,
    stone: 0x8a6a63,
    stone2: 0x6a524c,
    fur: 0x6a5a4c,
    fur2: 0x4f4439,
    bone: 0xdcd6c8,
    accent: 0xb06a3b,
  },
  cosmic: {
    ...SHARED_ZONES,
    skin: 0xa8876f,
    hair: 0x2a2530,
    cloth: 0x33264c, // void, nudged to 260° so it stays out of the blue team band
    cloth2: 0x8e44c8, // nebula violet
    cloth3: 0xf2f0ff, // star white
    leather: 0x3c3252,
    metal: 0xb8b4d0,
    metal2: 0x5a5478,
    wood: 0x4a4460,
    wood2: 0x36304a,
    stone: 0x6e6a88,
    stone2: 0x4e4a66,
    fur: 0x4a4460,
    fur2: 0x36304a,
    bone: 0xf2f0ff,
    magenta: 0x8e44c8,
    mint: 0x3fe0b0,
    glow: 0x3fe0b0,
    accent: 0x3fe0b0,
  },
};

/** Muted sky, silhouette and mid-ground colours per age (backdrops stay desaturated, A11). */
export const BACKDROP_PALETTES: Readonly<
  Record<AgeId, { skyTop: number; skyBottom: number; far: number; mid: number; near: number; light: number }>
> = {
  stone: { skyTop: 0x8db3cf, skyBottom: 0xf0e2c4, far: 0x9c98a6, mid: 0x7f8762, near: 0x5f7247, light: 0xfff0cc },
  medieval: { skyTop: 0x92b6d6, skyBottom: 0xeee6d0, far: 0x97a1b3, mid: 0x78886c, near: 0x5a6e4e, light: 0xfff4dc },
  gunpowder: { skyTop: 0x8cb6c6, skyBottom: 0xf2e2c0, far: 0x8ea3a6, mid: 0x6c8874, near: 0x546c56, light: 0xfff0d0 },
  modern: { skyTop: 0x98a8b6, skyBottom: 0xe6dcc4, far: 0x8a8f9a, mid: 0x6c7264, near: 0x565c4a, light: 0xf2ead2 },
  future: { skyTop: 0x2c2e50, skyBottom: 0x9a7aa8, far: 0x524e78, mid: 0x3e3e60, near: 0x2c2e46, light: 0xd8f3ea },
  // A17.12: temples and olive hills; chimneys and viaducts; planets and nebulae
  bronze: { skyTop: 0x94b4c8, skyBottom: 0xf0dcc0, far: 0xa39aa0, mid: 0x8a8a66, near: 0x6a7250, light: 0xfff0cc },
  industrial: { skyTop: 0x8e9aa4, skyBottom: 0xdcd2c0, far: 0x7e7c80, mid: 0x686460, near: 0x4e4a48, light: 0xf2e6cc },
  cosmic: { skyTop: 0x1e1830, skyBottom: 0x6a4a8e, far: 0x4a3e6e, mid: 0x36305a, near: 0x262040, light: 0xe8e4ff },
};

/** Level trims (DESIGN A11: they follow the colour rule, so they stay small accents). */
export const TRIM_COLORS: Readonly<Record<'bronze' | 'silver' | 'gold', number>> = {
  bronze: 0xb07a52,
  silver: 0xc9ced6,
  gold: 0xe0b93e,
};

/** Resolves a zone or a literal '#rrggbb' colour against a palette. */
export function resolveZone(palette: Palette, zone: string): number | undefined {
  if (zone.startsWith('#')) return parseHex(zone);
  return palette[zone];
}
