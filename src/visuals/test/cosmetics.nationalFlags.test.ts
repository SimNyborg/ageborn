/**
 * National flags in the visuals (PLAN 2d; `cosmetics/nationalFlags.ts`). Owned by Track D.
 *
 * C0 moved the 50 hand-drawn designs here unchanged; these checks are the ones they had (review
 * 2026-09-29), plus the hooks Track D fills in with the vendored flag-icons designs.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { cosmeticSvg, hasCosmeticArt } from '../cosmetics/art';
import { hasNationalFlagArt, NATIONAL_FLAGS, nationalFlagSvg, nationalFlagTexture, nationalFlagUrl, REGION_PENNANTS } from '../cosmetics/nationalFlags';

const flags = content.cosmetics.collections.items.filter((x) => x.collection === 'nationalFlag' && x.released !== false);

/** The centre of a path shape's points (polygons only: M/L pairs). */
function centreOf(d: string): [number, number] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let x = 0;
  let y = 0;
  for (let i = 0; i + 1 < n.length; i += 2) {
    x += n[i]!;
    y += n[i + 1]!;
  }
  const k = Math.max(1, n.length / 2);
  return [x / k, y / k];
}

describe('national flags', () => {
  it('draws every released national flag of the content', () => {
    for (const x of flags) expect(hasNationalFlagArt(x.id) && hasCosmeticArt('nationalFlag', x.id), x.id).toBe(true);
  });

  it('draws the Danish flag with a white Nordic cross on red', () => {
    const svg = cosmeticSvg('nationalFlag.dk')!;
    expect(svg).toContain('#c8102e');
    expect(svg).toContain('#ffffff');
    expect(nationalFlagSvg('dk')).not.toBeNull();
    expect(Object.keys(NATIONAL_FLAGS).length).toBeGreaterThanOrEqual(40);
  });

  it('has its hooks: no vendored picture or lane texture yet, and no region pennant yet', () => {
    expect(nationalFlagUrl('dk', 'tile')).toBeNull();
    expect(nationalFlagTexture('dk')).toBeNull();
    expect(Object.keys(REGION_PENNANTS)).toEqual([]);
  });
});

describe('national flags are drawn correctly (review 2026-09-29)', () => {
  it('Korea: geon upper left, gam upper right, ri lower left, gon lower right, bars across their diagonal', () => {
    const bars = NATIONAL_FLAGS.kr!.filter((sh) => 'fill' in sh && sh.fill === '#111111') as { d: string }[];
    const quad = (fx: (x: number) => boolean, fy: (y: number) => boolean) =>
      bars.filter((b) => {
        const [x, y] = centreOf(b.d);
        return fx(x) && fy(y);
      }).length;
    const left = (x: number) => x < 30;
    const right = (x: number) => x > 30;
    const up = (y: number) => y < 20;
    const down = (y: number) => y > 20;
    expect(quad(left, up)).toBe(3); // geon: three whole bars
    expect(quad(right, up)).toBe(5); // gam: broken, whole, broken
    expect(quad(left, down)).toBe(4); // ri: whole, broken, whole
    expect(quad(right, down)).toBe(6); // gon: three broken bars
    // geon's bars run across the upper-left to lower-right diagonal: up and to the right
    const geon = bars.find((b) => {
      const [x, y] = centreOf(b.d);
      return left(x) && up(y);
    })!;
    const pts = (geon.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    const top = ys.indexOf(Math.min(...ys));
    const bottom = ys.indexOf(Math.max(...ys));
    expect(xs[top]!).toBeGreaterThan(xs[bottom]!);
  });

  it('Union Flag: the red diagonals are counterchanged like a pinwheel', () => {
    const red = NATIONAL_FLAGS.gb!.flatMap((sh) => ('shapes' in sh ? sh.shapes : [sh])).filter((sh) => 'fill' in sh && sh.fill === '#c8102e' && sh.d.split('L').length === 4) as {
      d: string;
    }[];
    // the four diagonal arms (the upright and bar of the cross are rects)
    const arms = red.map((r) => centreOf(r.d)).filter(([x, y]) => Math.abs(x - 30) > 4 && Math.abs(y - 20) > 3);
    expect(arms).toHaveLength(4);
    // facing out from the centre, each arm's red lies on its anticlockwise side (offset off the white diagonal)
    for (const [x, y] of arms) {
      // the signed offset (y down) from the white diagonal the arm lies on
      const along = (x - 30) * (40 / 60);
      const off = x < 30 === y < 20 ? y - 20 - along : y - 20 + along;
      // upper hoist below the white, lower fly above it; upper fly above, lower hoist below
      if (x < 30 && y < 20) expect(off).toBeGreaterThan(2);
      if (x > 30 && y > 20) expect(off).toBeLessThan(-2);
      if (x > 30 && y < 20) expect(off).toBeLessThan(-2);
      if (x < 30 && y > 20) expect(off).toBeGreaterThan(2);
    }
  });
});
