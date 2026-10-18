/**
 * The lane's cloth wave for DOM flags (queue item 37, `clothWave.ts`) and the War Path's small pennants
 * (`SvgPennant.tsx`): the cloth is pinned at the hoist and moves most at the fly, its waves travel from the
 * hoist outward, the loop closes without a seam, a gust swells the ripple once a loop, light and shade follow
 * the folds, and every flag waves on its own phase.
 */
import { describe, expect, it } from 'vitest';
import { clothLift, clothPull, clothSeedOf, CLOTH_LOOP_MS, gustAt, stripCount, stripKeyframes, stripPose } from '../clothWave';
import { pennantPath } from '../SvgPennant';

const LOOP_S = CLOTH_LOOP_MS / 1000;
const DT = 1 / 60;
const times = Array.from({ length: Math.round(LOOP_S / DT) }, (_, k) => k * DT);

describe('the cloth', () => {
  it('is pinned at the hoist and moves more toward the free edge', () => {
    const maxLift = (u: number): number => Math.max(...times.map((t) => Math.abs(clothLift(u, t, 0.4))));
    for (const t of times.filter((_, k) => k % 30 === 0)) {
      expect(Math.abs(clothLift(0, t, 0.4))).toBe(0);
      expect(Math.abs(clothPull(0, t, 0.4))).toBe(0);
    }
    const reach = [0.25, 0.5, 0.75, 1].map(maxLift);
    for (let i = 1; i < reach.length; i++) expect(reach[i]!).toBeGreaterThan(reach[i - 1]!);
    // a ripple, never a flap: the free edge lifts at most about a tenth of the cloth's height (gust included)
    expect(reach[3]!).toBeLessThan(0.16);
    expect(reach[3]!).toBeGreaterThan(0.06);
  });

  it('waves travel from the hoist to the fly (the free edge follows the hoist side about 0.6 s later)', () => {
    // the lag that best lines up the cloth near the hoist with the cloth near the fly
    const near = times.map((t) => clothLift(0.2, t, 0.4, 1) / 0.2);
    const far = times.map((t) => clothLift(0.8, t, 0.4, 1) / 0.8);
    let best = { lag: 0, score: -Infinity };
    for (let lag = 0; lag < Math.round(1.5 / DT); lag++) {
      let score = 0;
      for (let k = 0; k < times.length; k++) score += near[k]! * far[(k + lag) % times.length]!;
      if (score > best.score) best = { lag, score };
    }
    const lagS = best.lag * DT;
    expect(lagS).toBeGreaterThan(0.4);
    expect(lagS).toBeLessThan(0.8);
  });

  it('closes its loop without a seam', () => {
    for (const u of [0.3, 0.7, 1]) {
      for (const t of [0, 1.3, 7.1]) expect(clothLift(u, t + LOOP_S, 1.1)).toBeCloseTo(clothLift(u, t, 1.1), 9);
    }
    const k = stripKeyframes(3, 8, 0.69, 2.2);
    expect(k.transform.length).toBe(LOOP_S * 30 + 1);
    expect(k.transform.at(-1)).toEqual(k.transform[0]);
    expect(k.dark.at(-1)).toEqual(k.dark[0]);
    expect(k.light.at(-1)).toEqual(k.light[0]);
  });

  it('a gust swells the ripple about two seconds once a loop, smoothly', () => {
    const g = times.map(gustAt);
    const swollen = g.filter((x) => x > 1.01).length * DT;
    expect(swollen).toBeGreaterThan(1.2);
    expect(swollen).toBeLessThan(2.4);
    expect(Math.max(...g)).toBeGreaterThan(1.7);
    expect(Math.min(...g)).toBe(1);
    for (let k = 1; k < g.length; k++) expect(Math.abs(g[k]! - g[k - 1]!)).toBeLessThan(0.05);
  });

  it('light and shade follow the folds: a band turning down darkens, one turning up brightens', () => {
    let darkSeen = 0;
    let lightSeen = 0;
    for (const t of times.filter((_, k) => k % 6 === 0)) {
      for (let i = 0; i < 8; i++) {
        const p = stripPose(i, 8, t, 0.69, 0.4);
        const down = clothLift((i + 1) / 8, t, 0.4) - clothLift(i / 8, t, 0.4);
        expect(p.dark > 0 && p.light > 0).toBe(false);
        if (p.dark > 0) expect(down).toBeGreaterThan(0);
        if (p.light > 0) expect(down).toBeLessThan(0);
        expect(p.dark).toBeLessThanOrEqual(0.2);
        expect(p.light).toBeLessThanOrEqual(0.13);
        if (p.dark > 0) darkSeen += 1;
        if (p.light > 0) lightSeen += 1;
      }
    }
    expect(darkSeen).toBeGreaterThan(0);
    expect(lightSeen).toBeGreaterThan(0);
  });

  it('every flag waves on its own phase and from its own point of the loop', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) {
      const { phase, offsetMs } = clothSeedOf(s * 7919);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(2 * Math.PI);
      expect(offsetMs).toBeGreaterThanOrEqual(0);
      expect(offsetMs).toBeLessThan(CLOTH_LOOP_MS);
      seen.add(`${phase.toFixed(3)}|${offsetMs}`);
    }
    expect(seen.size).toBe(40);
    expect(clothSeedOf(12345)).toEqual(clothSeedOf(12345));
  });

  it('cuts a flag into strips of about 8 px, 5 to 12 of them', () => {
    expect(stripCount(20)).toBe(5);
    expect(stripCount(64)).toBe(8);
    expect(stripCount(400)).toBe(12);
  });
});

describe('the pennant', () => {
  it('ripples from a fixed hoist, closes its outline and plays the same way every time', () => {
    const a = pennantPath(1, -180, 16, 10, 4, 0, 1.1);
    const b = pennantPath(1, -180, 16, 10, 4, 2.5, 1.1);
    expect(a).toMatch(/^M1 -180 L.*Z$/);
    expect(b.startsWith('M1 -180 ')).toBe(true);
    expect(a).not.toBe(b);
    expect(pennantPath(1, -180, 16, 10, 4, 2.5, 1.1)).toBe(b);
  });
});
