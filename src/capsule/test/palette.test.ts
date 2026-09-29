/**
 * Tier colours stay clear of the rarity, team and button colours (DESIGN A10 "Tier colours", the
 * 2026-09-29 ladder): every new or changed tier key (Gold, Platinum, Aeon) and the mid-tone and
 * highlight of its drum body (the gradient stops the drum is filled with, `bodyStops`) is at least
 * ΔE2000 12 from every rarity, team and button colour and from every other tier key. The old keys keep
 * their documented exceptions. The Legendary crest keeps its contrast (A10, WCAG 1.4.11).
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier } from '@/contracts';
import { bodyStops } from '../climb';
import { CREST, ROOM, TIER_COLORS, TIER_RAMPS } from '../palette';
import { TIER_ORDER } from '../tiers';

function lab(hex: number): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = lin((hex >> 16) & 0xff);
  const g = lin((hex >> 8) & 0xff);
  const b = lin(hex & 0xff);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIEDE2000 (Sharma, Wu and Dalal 2005). */
export function deltaE2000(c1: number, c2: number): number {
  const [L1, a1, b1] = lab(c1);
  const [L2, a2, b2] = lab(c2);
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h = (a: number, b: number) => {
    if (a === 0 && b === 0) return 0;
    const d = Math.atan2(b, a) / rad;
    return d < 0 ? d + 360 : d;
  };
  const h1p = h(a1p, b1);
  const h2p = h(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lmp = (L1 + L2) / 2;
  const Cmp = (C1p + C2p) / 2;
  let hmp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hmp += h1p + h2p < 360 ? 360 : -360;
    hmp /= 2;
  }
  const T = 1 - 0.17 * Math.cos((hmp - 30) * rad) + 0.24 * Math.cos(2 * hmp * rad) + 0.32 * Math.cos((3 * hmp + 6) * rad) - 0.2 * Math.cos((4 * hmp - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hmp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cmp, 7) / (Math.pow(Cmp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lmp - 50, 2)) / Math.sqrt(20 + Math.pow(Lmp - 50, 2));
  const Sc = 1 + 0.045 * Cmp;
  const Sh = 1 + 0.015 * Cmp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh));
}

function luminance(hex: number): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((hex >> 16) & 0xff) + 0.7152 * lin((hex >> 8) & 0xff) + 0.0722 * lin(hex & 0xff);
}

function contrast(a: number, b: number): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Rarity (with Epic text), team (every preset) and button colours (A10 "Tier colours"). */
const OTHERS: Record<string, number> = {
  common: 0xb8c0cc,
  rare: 0x22b8cf,
  epic: 0xa855f7,
  epicText: 0xb77bf9,
  legendary: 0xf5b82e,
  teamMe: 0x2f7df6,
  teamMeText: 0x5b9bff,
  teamFoe: 0xf28a1e,
  blueYellowFoe: 0xf2c21e,
  highContrastMe: 0x1f5fd6,
  highContrastFoe: 0xff6a00,
  primary: 0xf2b52c,
  primaryLight: 0xffd466,
  primaryLip: 0xb7801a,
  progress: 0x3cc46b,
  destructive: 0xc9392f,
};

/** Tiers whose key changed with the 2026-09-29 ladder; the others keep their documented exceptions. */
const NEW_KEYS: readonly CapsuleTier[] = ['gold', 'platinum', 'aeon'];
const MIN_DE = 12;

describe('tier colours (DESIGN A10)', () => {
  it('uses the A10 keys and reference ramps', () => {
    expect(TIER_COLORS).toEqual({ clay: 0x9c6b4a, bronze: 0xc27c3a, silver: 0xc9d1dc, jade: 0x2fbf71, gold: 0xefe0b0, platinum: 0xc4f2ea, aeon: 0x5d3dff });
    expect(TIER_RAMPS.gold).toEqual({ highlight: 0xfff6dc, key: 0xefe0b0, mid: 0xcdb887, shadow: 0x8a7a5a });
    expect(TIER_RAMPS.platinum).toEqual({ highlight: 0xf2fffc, key: 0xc4f2ea, mid: 0xa6d4cd, shadow: 0x7e9e99 });
    expect(TIER_RAMPS.aeon).toEqual({ highlight: 0xb8aaff, key: 0x5d3dff, mid: 0x3a2a9e, shadow: 0x241c4a });
    for (const t of TIER_ORDER) expect(TIER_RAMPS[t].key, t).toBe(TIER_COLORS[t]);
  });

  it('keeps every new tier key at least ΔE2000 12 from rarity, team, button and other tier colours', () => {
    for (const t of NEW_KEYS) {
      for (const [name, c] of Object.entries(OTHERS)) expect(deltaE2000(TIER_COLORS[t], c), `${t} vs ${name}`).toBeGreaterThanOrEqual(MIN_DE);
      for (const o of TIER_ORDER) if (o !== t) expect(deltaE2000(TIER_COLORS[t], TIER_COLORS[o]), `${t} vs ${o}`).toBeGreaterThanOrEqual(MIN_DE);
    }
  });

  it('keeps the mid-tone and highlight of the Gold, Platinum and Aeon drum bodies clear of rarity, team and button colours', () => {
    for (const t of NEW_KEYS) {
      const stops = bodyStops(t).map((s) => s.color);
      const r = TIER_RAMPS[t];
      // The body is painted with its ramp: the mid-tone and highlight are stops (Aeon lights its
      // highlight in the facets, drawn from the same ramp).
      expect(stops, t).toContain(r.mid);
      if (t !== 'aeon') expect(stops, t).toContain(r.highlight);
      for (const sample of [r.mid, r.highlight]) {
        for (const [name, c] of Object.entries(OTHERS)) expect(deltaE2000(sample, c), `${t} ${sample.toString(16)} vs ${name}`).toBeGreaterThanOrEqual(MIN_DE);
      }
    }
  });

  it('lists the known exceptions of the older keys and nothing else', () => {
    const exceptions: [CapsuleTier, number, number][] = [
      ['silver', OTHERS.common ?? 0, 4.2],
      ['jade', OTHERS.progress ?? 0, 2.4],
      ['bronze', OTHERS.primaryLip ?? 0, 8.3],
      ['bronze', OTHERS.teamFoe ?? 0, 10.1],
      ['clay', TIER_COLORS.bronze, 11.4],
    ];
    for (const [t, c, de] of exceptions) expect(deltaE2000(TIER_COLORS[t], c)).toBeCloseTo(de, 0);
  });

  it('gives the Legendary crest its contrast: the star on its shield, the shield on the brass band', () => {
    expect(contrast(CREST.star, CREST.shield)).toBeGreaterThanOrEqual(10);
    expect(contrast(CREST.shield, ROOM.brass)).toBeGreaterThanOrEqual(3);
    // Straight on the brass the star would be unreadable, which is why the shield exists.
    expect(contrast(CREST.star, ROOM.brass)).toBeLessThan(3);
  });
});
