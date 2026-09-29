/**
 * Cosmetic art (DESIGN A18.9.4, A14.4 `cosmetic.<collection>.<id>`): every collection item in the
 * content has code-drawn art, the SVG output is well formed, emotes animate unless told not to, and
 * the base dressing seats its props in the fixed anchors (mirrored for side 1), restyles the base and
 * cleans up.
 */
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { BaseView } from '@/contracts/art';
import { content } from '@/content';
import { cosmeticImageUrl, cosmeticSvg, hasCosmeticArt, parseCosmeticKey } from '../cosmetics/art';
import { BASE_SKINS } from '../cosmetics/baseSkins';
import { BaseDressing, DRESSING_ANCHORS } from '../cosmetics/dressing';
import { NATIONAL_FLAGS } from '../cosmetics/flags';

const items = content.cosmetics.collections.items;
const FROST = BASE_SKINS.frost_cave!.tint;
const ROSE = BASE_SKINS.rose_keep!.tint;

function fakeBase(): BaseView & { tints: (number | null)[] } {
  const tints: (number | null)[] = [];
  return {
    root: new Container(),
    tints,
    mountPoints: () => [],
    setCrumble: () => {},
    setTreasury: () => {},
    morphTo: () => {},
    lastStandGlow: () => {},
    hit: () => {},
    collapse: () => {},
    update: () => {},
    destroy: () => {},
    setSkinTint: (t: number | null) => tints.push(t),
  } as BaseView & { tints: (number | null)[]; setSkinTint: (t: number | null) => void };
}

/** Tag balance of a small SVG string (no DOM in Node). */
function balanced(svg: string): boolean {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name!);
  }
  return stack.length === 0;
}

describe('cosmetic art', () => {
  it('draws every collection item in the content', () => {
    const missing = items.filter((x) => !hasCosmeticArt(x.collection, x.id)).map((x) => x.art);
    expect(missing).toEqual([]);
  });

  it('gives every item a well-formed SVG', () => {
    for (const x of items) {
      const svg = cosmeticSvg(`${x.collection}.${x.id}`);
      expect(svg, x.art).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+"/);
      expect(balanced(svg!), x.art).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it('animates emotes unless motion is off, and never otherwise', () => {
    const key = 'emote.supernova';
    expect(cosmeticSvg(key)).toContain('<animateTransform');
    expect(cosmeticSvg(key, { animate: false })).not.toContain('<animate');
    expect(cosmeticSvg('nationalFlag.dk')).not.toContain('<animate');
  });

  it('paints base flags in the team colour', () => {
    expect(cosmeticSvg('baseFlag.ember', { team: 0x2f7df6 })).toContain('#2f7df6');
    expect(cosmeticSvg('baseFlag.ember', { team: 0xf28a1e })).toContain('#f28a1e');
  });

  it('draws the Danish flag with a white Nordic cross on red', () => {
    const svg = cosmeticSvg('nationalFlag.dk')!;
    expect(svg).toContain('#c8102e');
    expect(svg).toContain('#ffffff');
    expect(Object.keys(NATIONAL_FLAGS).length).toBeGreaterThanOrEqual(40);
  });

  it('returns null for unknown keys and caches image URLs', () => {
    expect(cosmeticSvg('nationalFlag.nowhere')).toBeNull();
    expect(cosmeticSvg('banana.split')).toBeNull();
    expect(parseCosmeticKey('nationalFlag.gb_eng')).toEqual({ collection: 'nationalFlag', id: 'gb_eng' });
    const a = cosmeticImageUrl('decoration.fern');
    expect(a).toMatch(/^data:image\/svg\+xml/);
    expect(cosmeticImageUrl('decoration.fern')).toBe(a);
  });
});

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

describe('base skin layers for the Customize preview', () => {
  it('gives a tint swatch and a particle layer for base skins only, still under Reduce motion', () => {
    const tint = cosmeticSvg('baseSkin.frost_cave', { layer: 'tint' })!;
    expect(tint).toContain(`#${FROST.toString(16).padStart(6, '0')}`);
    expect(cosmeticSvg('baseSkin.frost_cave', { layer: 'fx' })).toContain('<animate');
    expect(cosmeticSvg('baseSkin.frost_cave', { layer: 'fx', animate: false })).not.toContain('<animate');
    expect(cosmeticSvg('nationalFlag.dk', { layer: 'tint' })).toBeNull();
    expect(cosmeticImageUrl('baseSkin.frost_cave', { layer: 'tint' })).not.toBe(cosmeticImageUrl('baseSkin.frost_cave'));
  });
});

describe('base dressing (A18.9.4)', () => {
  const look = {
    baseFlag: 'baseFlag.mammoth',
    nationalFlag: 'nationalFlag.dk',
    baseSkins: { stone: 'baseSkin.frost_cave', medieval: 'baseSkin.rose_keep' },
    decorations: ['decoration.lion_statue', null, 'decoration.fire_bowl'],
  };

  it('attaches to the base and seats the pole and decorations in their anchors', () => {
    const base = fakeBase();
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    expect(base.root.children).toContain(d.root);
    const xs = d.root.children.map((c) => Math.round(c.position.x));
    expect(xs).toContain(DRESSING_ANCHORS.pole);
    expect(xs).toContain(DRESSING_ANCHORS.decorations[0]);
    expect(xs).toContain(DRESSING_ANCHORS.decorations[2]);
    expect(xs).not.toContain(DRESSING_ANCHORS.decorations[1]);
    // the base skin tints the body at once
    expect(base.tints).toEqual([FROST]);
  });

  it('mirrors the anchors for side 1', () => {
    const d = new BaseDressing({ age: 'stone', side: 1, look, team: 0xf28a1e });
    const xs = d.root.children.map((c) => Math.round(c.position.x));
    expect(xs).toContain(-DRESSING_ANCHORS.pole);
    expect(xs).toContain(-DRESSING_ANCHORS.decorations[0]);
  });

  it('switches the skin on an evolve half-way through the morph, and clears it for an age without one', () => {
    const base = fakeBase();
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    d.setAge('medieval', 1000);
    d.update(100);
    expect(base.tints).toEqual([FROST]);
    for (let i = 0; i < 6; i += 1) d.update(100);
    expect(base.tints).toEqual([FROST, ROSE]);
    d.setAge('gunpowder', 0);
    d.update(16);
    expect(base.tints[base.tints.length - 1]).toBeNull();
  });

  it('keeps no pole without flags, topples on collapse and survives the base destroying it first', () => {
    const base = fakeBase();
    const bare = new BaseDressing({ age: 'stone', side: 0, look: { decorations: [] }, team: 0x2f7df6, base });
    expect(bare.root.children.filter((c) => Math.round(c.position.x) === DRESSING_ANCHORS.pole)).toHaveLength(0);
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    d.hit();
    d.collapse();
    for (let i = 0; i < 12; i += 1) d.update(100);
    expect(d.root.children.every((c) => c.alpha <= 0.01 || c.children.length === 0)).toBe(true);
    base.root.destroy({ children: true });
    expect(() => d.destroy()).not.toThrow();
    expect(() => bare.destroy()).not.toThrow();
  });

  it('honours Reduce motion: no particles', () => {
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6 });
    d.setMotion({ reduce: true, lite: false });
    for (let i = 0; i < 5; i += 1) d.update(50);
    const motes = d.root.children[d.root.children.length - 1]!;
    expect(motes.children.length).toBe(0);
    d.setMotion({ reduce: false, lite: false });
    d.update(50);
    expect(motes.children.length).toBeGreaterThan(0);
  });
});
