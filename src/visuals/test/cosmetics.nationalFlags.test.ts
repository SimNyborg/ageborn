/**
 * National flags in the visuals (PLAN 2d, 2g Track D; `cosmetics/nationalFlags.ts`). Owned by Track D.
 *
 * The vendored flag-icons designs (`public/art/flags/`, written by `tools/flags/vendor.ts`; the files
 * themselves are checked in `tools/flags/vendor.test.ts` and pixel by pixel in `tests/e2e/flagAtlas.spec.ts`),
 * the picture routes, the lane cloth hook, the region rewards, and the hand-drawn fallback designs.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import atlas from '../../../public/art/flags/atlas.json';
import { cosmeticSvg, hasCosmeticArt } from '../cosmetics/art';
import {
  flagFileName,
  hasNationalFlagArt,
  NATIONAL_FLAGS,
  nationalFlagSvg,
  nationalFlagSvgUrl,
  nationalFlagTexture,
  nationalFlagUrl,
  REGION_PENNANT_TIER,
  REGION_PENNANTS,
  VENDORED_FLAGS,
} from '../cosmetics/nationalFlags';

const items = content.cosmetics.collections.items;
const flags = items.filter((x) => x.collection === 'nationalFlag' && x.released !== false);
const svgs = import.meta.glob<string>('/public/art/flags/svg/*.svg', { query: '?raw', import: 'default', eager: true });

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

describe('the vendored national flags', () => {
  it('cover exactly the national flags of the content: one SVG and one atlas cell each', () => {
    expect([...VENDORED_FLAGS].sort()).toEqual(flags.map((x) => x.id).sort());
    const cells = atlas.cells as Record<string, number>;
    for (const x of flags) {
      expect(hasNationalFlagArt(x.id) && hasCosmeticArt('nationalFlag', x.id), x.id).toBe(true);
      const file = flagFileName(x.id);
      expect(file, x.id).toBe(x.country);
      expect(svgs[`/public/art/flags/svg/${file}.svg`], x.id).toMatch(/^<svg [^>]*viewBox="0 0 640 480"/);
      expect(cells[file], x.id).toBeGreaterThanOrEqual(0);
      expect(cells[file]!, x.id).toBeLessThan(atlas.cols * atlas.rows);
    }
    expect(new Set(Object.values(atlas.cells)).size).toBe(flags.length);
    expect(Object.keys(svgs)).toHaveLength(flags.length);
  });

  it('routes the big view to the SVG and a tile to the SVG until the atlas is in (no DOM here)', () => {
    expect(nationalFlagUrl('dk', 'big')).toBe('/art/flags/svg/dk.svg');
    expect(nationalFlagUrl('gb_eng', 'big')).toBe('/art/flags/svg/gb-eng.svg');
    expect(nationalFlagUrl('gb_wls', 'tile')).toBe('/art/flags/svg/gb-wls.svg');
    // without a DOM the atlas can never load, so even a grid that waits gets the SVG
    expect(nationalFlagUrl('mx', 'tile', { cached: true })).toBe('/art/flags/svg/mx.svg');
    expect(nationalFlagUrl('atlantis', 'big')).toBeNull();
    expect(nationalFlagSvgUrl('atlantis')).toBeNull();
  });

  it('has no lane cloth without a DOM (the dressing then keeps its own fallback)', () => {
    expect(nationalFlagTexture('dk')).toBeNull();
    expect(nationalFlagTexture('atlantis')).toBeNull();
  });
});

describe('the Flag Atlas rewards (PLAN 2d)', () => {
  const rewards = items.filter((x) => x.source.kind === 'flagRegion' || x.source.kind === 'flagsOwned');

  it('every reward base flag has a design here, drawn by the router like a base flag on the team colour', () => {
    expect(Object.keys(REGION_PENNANTS).sort()).toEqual(rewards.map((x) => x.id).sort());
    for (const x of rewards) {
      expect(hasCosmeticArt('baseFlag', x.id), x.id).toBe(true);
      const blue = cosmeticSvg(`baseFlag.${x.id}`, { team: 0x2f7df6 })!;
      const orange = cosmeticSvg(`baseFlag.${x.id}`, { team: 0xf28a1e })!;
      expect(blue, x.id).toContain('<svg');
      expect(blue.toLowerCase(), x.id).toContain('#2f7df6');
      expect(orange.toLowerCase(), x.id).toContain('#f28a1e');
      // gold edge and compass star on every reward
      expect(blue.toLowerCase(), x.id).toContain('#ffcf3a');
    }
  });

  it('their finish tier follows their rarity: Epic pennants, the Legendary World Compass', () => {
    for (const x of rewards) expect(REGION_PENNANT_TIER[x.id], x.id).toBe(x.rarity);
  });

  it('each pennant shows a different continent', () => {
    const pennants = rewards.filter((x) => x.source.kind === 'flagRegion').map((x) => JSON.stringify(REGION_PENNANTS[x.id]));
    expect(new Set(pennants).size).toBe(6);
  });
});

describe('the hand-drawn fallback designs (review 2026-09-29)', () => {
  it('draws the Danish flag with a white Nordic cross on red', () => {
    const svg = nationalFlagSvg('dk')!;
    expect(svg).toContain('#c8102e');
    expect(svg).toContain('#ffffff');
    expect(cosmeticSvg('nationalFlag.dk')).not.toBeNull();
    expect(Object.keys(NATIONAL_FLAGS).length).toBeGreaterThanOrEqual(40);
  });

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
    for (const [x, y] of arms) {
      const along = (x - 30) * (40 / 60);
      const off = x < 30 === y < 20 ? y - 20 - along : y - 20 + along;
      if (x < 30 && y < 20) expect(off).toBeGreaterThan(2);
      if (x > 30 && y > 20) expect(off).toBeLessThan(-2);
      if (x > 30 && y < 20) expect(off).toBeLessThan(-2);
      if (x < 30 && y > 20) expect(off).toBeGreaterThan(2);
    }
  });
});
