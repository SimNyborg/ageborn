/**
 * The combat effects (queue item 38, Phase A4/A5/A6): contact sparks by kind and tier, landing and clash dust,
 * the bits a fallen soldier leaves (lying, fading, capped across the lane), stuck shafts and the ground glow.
 * Visual only: none of this reads or changes sim state.
 */
import { Container, Sprite } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EffectView } from '@/contracts/art';
import type { PartBaker } from '../bake';
import { effectColorRule } from '../checks';
import {
  BITS_FADE_MS,
  BITS_LIE_MS,
  bitKinds,
  bitPartsFor,
  BIT_KITS,
  clashDustRecipe,
  clashRingRecipe,
  COMBAT_PARTS,
  FX_CONTACT_KINDS,
  FX_STUCK_KINDS,
  FX_TIERS,
  GLOW_MS,
  liveBits,
  MAX_BITS,
  STUCK_MS,
  warmBits,
} from '../effects/combat';
import { combatFxVariants } from '../effects/recipes';
import { MANIFEST } from '../manifest';
import { getPart } from '../parts/registry';
import { createArtProvider } from '../provider';

const art = createArtProvider({ warn: () => {}, dpr: 1 });
const open: EffectView[] = [];

function play(id: string, o: Record<string, number> = {}): EffectView {
  const e = art.createEffect(id, o);
  e.playAt({ x: 0, y: 0 }, o);
  open.push(e);
  return e;
}

afterEach(() => {
  for (const e of open.splice(0)) e.destroy();
});

/** Every sprite drawn under a container (the effect's own and its nested recipes'). */
function sprites(c: Container): Sprite[] {
  const out: Sprite[] = [];
  for (const ch of c.children) {
    if (ch instanceof Sprite) out.push(ch);
    if (ch instanceof Container) out.push(...sprites(ch));
  }
  return out;
}

const layer = (e: EffectView): Container => e.root.children[0] as Container;

function runOut(e: EffectView, step = 50, max = 12000): number {
  let t = 0;
  while (!e.done && t < max) {
    e.update(step);
    t += step;
  }
  return t;
}

describe('combat effects are in the manifest and follow the colour rule (A11)', () => {
  it('registers the six ids', () => {
    for (const id of ['fx.contact_spark', 'fx.land_dust', 'fx.clash_dust', 'fx.bits', 'fx.stuck', 'fx.ground_glow']) expect(MANIFEST[id], id).toBeDefined();
  });

  it.each(combatFxVariants().map((r) => [r.id, r] as const))('%s', (_id, r) => {
    expect(effectColorRule(r, getPart).share).toBeLessThanOrEqual(0.1);
  });

  it.each(COMBAT_PARTS.map((p) => [p] as const))('part %s', (p) => {
    expect(getPart(p), p).toBeDefined();
    expect(effectColorRule({ id: p, durationMs: 1, sprites: [{ sprite: p, life: 1, keys: [{ t: 0 }] }] }, getPart).share).toBeLessThanOrEqual(0.1);
  });

  it('draws each effect once per emit: the extra copies of a multi-count emit finish at once, empty', () => {
    const base = { kind: 1, tier: 2, size: 1, age: 2, count: 3, seed: 9, widthLu: 120 };
    for (const id of ['fx.contact_spark', 'fx.land_dust', 'fx.clash_dust', 'fx.bits', 'fx.stuck', 'fx.ground_glow']) {
      const first = play(id, { ...base, i: 0, n: 4 });
      first.update(16);
      expect(sprites(first.root).length, id).toBeGreaterThan(0);
      const extra = play(id, { ...base, i: 1, n: 4 });
      expect(sprites(extra.root).length, id).toBe(0);
      expect(extra.done, id).toBe(true);
    }
  });
});

describe('fx.contact_spark (A5)', () => {
  it('plays every kind and tier to the end', () => {
    for (let kind = 0; kind < FX_CONTACT_KINDS.length; kind++) {
      for (let tier = 0; tier < FX_TIERS.length; tier++) {
        const e = play('fx.contact_spark', { kind, tier, dir: 1 });
        expect(runOut(e), `${kind}/${tier}`).toBeLessThan(1500);
      }
    }
  });

  it('a killing blow draws more than a light hit; Lite draws about half', () => {
    const count = (o: Record<string, number>): number => {
      const e = play('fx.contact_spark', o);
      e.update(16);
      return sprites(e.root).length;
    };
    expect(count({ kind: 0, tier: 3 })).toBeGreaterThan(count({ kind: 0, tier: 0 }));
    expect(count({ kind: 4, tier: 2, lite: 1 })).toBeLessThan(count({ kind: 4, tier: 2 }));
  });
});

describe('fx.land_dust and fx.clash_dust (A4, A6)', () => {
  it('a large landing throws more dust than a small one, and a wide clash more than a narrow one', () => {
    const count = (id: string, o: Record<string, number>): number => {
      const e = play(id, o);
      e.update(16);
      return sprites(e.root).length;
    };
    expect(count('fx.land_dust', { size: 2 })).toBeGreaterThan(count('fx.land_dust', { size: 0 }));
    expect(count('fx.clash_dust', { widthLu: 300 })).toBeGreaterThan(count('fx.clash_dust', { widthLu: 60 }));
    expect(runOut(play('fx.land_dust', { size: 1, dir: -1 }))).toBeLessThan(1500);
    expect(runOut(play('fx.clash_dust', { widthLu: 200 }))).toBeLessThan(2000);
  });

  it('the clash\'s flat rings are their own short effect (the view lays it on the ground); the curtain has none (review A, S4)', () => {
    const k = { flash: () => ({}), ring: (s: number) => ({ sprite: 'ring', s }), smoke: () => ({}), sparks: () => ({}), dust: () => ({}), chunks: () => ({}), bloom: () => ({}), scorch: () => ({}) } as unknown as Parameters<typeof clashRingRecipe>[0];
    expect(clashRingRecipe(k, 200, false, false).sprites).toHaveLength(2);
    expect(clashRingRecipe(k, 200, true, false).sprites).toHaveLength(1);
    expect(clashRingRecipe(k, 200, false, false).particles ?? []).toHaveLength(0);
    expect(clashDustRecipe(k, 200, false, false).sprites ?? []).toHaveLength(0);
    expect(MANIFEST['fx.clash_ring']).toBeDefined();
    const e = play('fx.clash_ring', { widthLu: 200 });
    e.update(16);
    expect(sprites(e.root).length).toBeGreaterThan(0);
    expect(runOut(e)).toBeLessThan(800);
  });
});

describe('fx.bits (A4)', () => {
  it('tosses the asked pieces, lands them on the ground line, lets them lie, then fades them out', () => {
    const e = play('fx.bits', { age: 2, dir: 1, count: 4, seed: 77, heightLu: 68 });
    const pieces = () => sprites(layer(e)).filter((s) => s.visible && s.tint !== 0x000000);
    expect(pieces().length).toBe(4);
    e.update(16);
    const lifted = pieces().map((s) => s.y);
    expect(Math.max(...lifted)).toBeLessThan(-10);
    for (let t = 0; t < 1600; t += 16) e.update(16);
    // all down: their centres sit just above the ground line (y 0), and they stay there
    const rest = pieces().map((s) => s.y);
    for (const y of rest) expect(y).toBeGreaterThan(-6);
    for (const y of rest) expect(y).toBeLessThan(0);
    for (let t = 0; t < 2000; t += 50) e.update(50);
    expect(pieces().map((s) => s.y)).toEqual(rest);
    expect(pieces().every((s) => s.alpha === 1)).toBe(true);
    // gone after the lie and the fade
    const left = runOut(e);
    expect(left).toBeLessThan(BITS_LIE_MS + BITS_FADE_MS + 500);
    expect(e.done).toBe(true);
  });

  it('draws the same pieces for the same seed (a replay looks the same); Lite drops about half', () => {
    const at = (o: Record<string, number>): number[] => {
      const e = play('fx.bits', o);
      for (let t = 0; t < 300; t += 16) e.update(16);
      return sprites(layer(e)).map((s) => Math.round(s.x * 100) / 100);
    };
    expect(at({ age: 5, dir: -1, count: 3, bitsSeed: 4242 })).toEqual(at({ age: 5, dir: -1, count: 3, bitsSeed: 4242 }));
    expect(at({ age: 5, dir: -1, count: 3, bitsSeed: 4242 })).not.toEqual(at({ age: 5, dir: -1, count: 3, bitsSeed: 99 }));
    const e = play('fx.bits', { age: 1, count: 4, seed: 3, lite: 1 });
    expect(sprites(layer(e)).length).toBe(2);
  });

  it('holds at most MAX_BITS on the field: the oldest fade out first', () => {
    const views = Array.from({ length: 18 }, (_, i) => play('fx.bits', { age: 3, count: 3, seed: i + 1, lite: 1 }));
    // Lite: 2 pieces a death, 36 pieces: under the cap
    expect(liveBits()).toBe(36);
    const more = Array.from({ length: 6 }, (_, i) => play('fx.bits', { age: 3, count: 3, seed: 100 + i }));
    for (let t = 0; t < 400; t += 16) for (const e of [...views, ...more]) e.update(16);
    expect(liveBits()).toBeLessThanOrEqual(MAX_BITS);
    // the first deaths' pieces went first
    expect(sprites(layer(views[0] as EffectView)).filter((s) => s.visible).length).toBe(0);
    expect(sprites(layer(more[5] as EffectView)).filter((s) => s.visible).length).toBeGreaterThan(0);
  });

  it('frees its place on the field when the view goes', () => {
    const before = liveBits();
    const e = play('fx.bits', { age: 0, count: 3, seed: 5 });
    expect(liveBits()).toBe(before + 3);
    e.destroy();
    open.splice(open.indexOf(e), 1);
    expect(liveBits()).toBe(before);
  });

  it('a beast never drops a helmet and a machine no cloth; a soldier drops its headgear at most once', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(bitKinds(2, 2, 6, seed).some((k) => k.part.startsWith('fx.bit.helm'))).toBe(false);
      expect(bitKinds(5, 1, 6, seed).some((k) => k.cloth)).toBe(false);
      expect(bitKinds(2, 0, 6, seed).filter((k) => k.part === BIT_KITS.medieval.head.part).length).toBeLessThanOrEqual(1);
    }
  });

  it('tints cloth scraps with the fallen soldier team colour', () => {
    const e = play('fx.bits', { age: 2, count: 6, seed: 11, side: 1 });
    const cloth = sprites(layer(e)).filter((s) => s.tint !== 0xffffff && s.tint !== 0x000000);
    expect(cloth.length).toBeGreaterThan(0);
  });

  it('bakes an age bits ahead of the first death, one part per idle slice, once per age and baker', () => {
    vi.useFakeTimers();
    try {
      const baked: string[] = [];
      let flushes = 0;
      const fake = { enabled: true, has: () => false, get: (p: { id: string }) => baked.push(p.id), flush: () => flushes++ } as unknown as PartBaker;
      warmBits(fake, 2);
      warmBits(fake, 2);
      expect(baked).toEqual([]);
      vi.advanceTimersByTime(5000);
      expect(baked).toEqual(bitPartsFor(2));
      expect(baked).toContain('fx.bit.helmKettle');
      expect(flushes).toBe(1);
      warmBits(fake, 2);
      vi.advanceTimersByTime(5000);
      expect(baked.length).toBe(bitPartsFor(2).length);
      warmBits({ ...fake, enabled: false } as unknown as PartBaker, 3);
      vi.advanceTimersByTime(5000);
      expect(baked.length).toBe(bitPartsFor(2).length);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('fx.stuck and fx.ground_glow (A5)', () => {
  it('a stuck shaft points into the body along the blow, quivers, stays and fades', () => {
    const r = play('fx.stuck', { kind: 0, dir: 1 });
    r.update(400);
    const s = sprites(layer(r))[0] as Sprite;
    expect(s.rotation).toBeGreaterThan(0.2);
    const l = play('fx.stuck', { kind: 1, dir: -1 });
    l.update(400);
    expect((sprites(layer(l))[0] as Sprite).rotation).toBeLessThan(-0.2);
    expect(runOut(r, 50)).toBeGreaterThanOrEqual((STUCK_MS[0] ?? 0) - 450);
    expect(runOut(l, 50)).toBeGreaterThanOrEqual((STUCK_MS[1] ?? 0) - 450);
  });

  it('every stuck kind (arrow, javelin, quill, needle) draws its own shaft and fades out in its time (review A, S3)', () => {
    for (let kind = 0; kind < FX_STUCK_KINDS.length; kind++) {
      const e = play('fx.stuck', { kind, dir: 1 });
      e.update(16);
      expect(sprites(layer(e)), FX_STUCK_KINDS[kind]).toHaveLength(1);
      const left = runOut(e, 50);
      expect(left, FX_STUCK_KINDS[kind]).toBeGreaterThanOrEqual((STUCK_MS[kind] ?? 0) - 450);
      expect(left, FX_STUCK_KINDS[kind]).toBeLessThanOrEqual((STUCK_MS[kind] ?? 0) + 100);
    }
    expect(STUCK_MS).toHaveLength(FX_STUCK_KINDS.length);
    // each kind its own part (the colour rule rasterises them with COMBAT_PARTS)
    const parts = ['fx.p.stuckArrow', 'fx.p.stuckJavelin', 'fx.p.stuckQuill', 'fx.p.stuckNeedle'];
    for (const p of parts) {
      expect(getPart(p), p).toBeDefined();
      expect(COMBAT_PARTS).toContain(p);
    }
  });

  it('the ground glow takes the asked colour, lies flat and is short', () => {
    const e = play('fx.ground_glow', { size: 1, color: 0xbff5e0 });
    e.update(50);
    const s = sprites(layer(e))[0] as Sprite;
    expect(s.tint).toBe(0xbff5e0);
    expect(s.scale.y).toBeLessThan(s.scale.x * 0.5);
    expect(runOut(e, 20)).toBeLessThanOrEqual((GLOW_MS[1] ?? 0) + 40);
  });
});
