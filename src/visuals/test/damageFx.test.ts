/**
 * The damage kit and effects (queue item 40, design 4a and 3.3-3.4): every part and recipe follows the A11 colour rule
 * (no saturated colour in the team hues: marks are neutral, flames pale, energy pale mint), the step's burst throws a
 * few pieces that land, lie 2 s and fade, capped across the lane, and draws the same for the same seed.
 */
import { Container, Sprite } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EffectView } from '@/contracts/art';
import { PartBaker } from '../bake';
import { effectColorRule } from '../checks';
import { DAMAGE_FX_IDS, liveDamagePieces, MAX_PIECES, PIECE_FADE_MS, PIECE_LIE_MS } from '../damage/fx';
import { DAMAGE_FX_PARTS, DAMAGE_STRIP_PARTS } from '../damage/kit';
import { markParts } from '../damage/marks';
import { bakeDamageKit, damageKitParts } from '../damage/unitDamage';
import { damageFxVariants } from '../effects/recipes';
import { FX_ZONES } from '../effects/sprites';
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

function sprites(c: Container): Sprite[] {
  const out: Sprite[] = [];
  for (const ch of c.children) {
    if (ch instanceof Sprite) out.push(ch);
    if (ch instanceof Container) out.push(...sprites(ch));
  }
  return out;
}

const partRule = (p: string): number => effectColorRule({ id: p, durationMs: 1, sprites: [{ sprite: p, life: 1, keys: [{ t: 0 }] }] }, getPart).share;

describe('the damage kit follows the colour rule (A11)', () => {
  it.each([...markParts(), ...DAMAGE_STRIP_PARTS, ...DAMAGE_FX_PARTS].map((p) => [p] as const))('part %s', (p) => {
    expect(getPart(p), p).toBeDefined();
    expect(partRule(p)).toBeLessThanOrEqual(0.1);
  });

  it('registers every damage effect id in the manifest', () => {
    for (const id of DAMAGE_FX_IDS) expect(MANIFEST[id], id).toBeDefined();
  });

  it.each(damageFxVariants().map((r) => [r.id, r] as const))('%s', (_id, r) => {
    expect(effectColorRule(r, getPart).share).toBeLessThanOrEqual(0.1);
  });
});

describe("the emitters' particles", () => {
  it('each plays and ends on its own (smoke under 2 s, sparks under 250 ms)', () => {
    const life: Record<string, number> = {};
    for (const id of ['fx.dmg_smoke', 'fx.dmg_smoke_dark', 'fx.dmg_steam', 'fx.dmg_fire', 'fx.dmg_spark', 'fx.dmg_breath', 'fx.dmg_motes', 'fx.dmg_ignite', 'fx.dmg_mend']) {
      const e = play(id, { dir: 1, scale: 1 });
      let t = 0;
      e.update(16);
      expect(sprites(e.root).length, id).toBeGreaterThan(0);
      while (!e.done && t < 5000) {
        e.update(20);
        t += 20;
      }
      expect(e.done, id).toBe(true);
      life[id] = t;
    }
    expect(life['fx.dmg_spark']).toBeLessThan(260);
    expect(life['fx.dmg_smoke_dark']).toBeLessThan(2100);
  });
});

describe('fx.dmg_burst (design 3.4)', () => {
  const run = (e: EffectView, ms: number): void => {
    for (let t = 0; t < ms; t += 20) e.update(20);
  };

  it('throws pieces along the blow that land, lie about 2 s and fade', () => {
    const before = liveDamagePieces();
    const e = play('fx.dmg_burst', { mat: 3, stage: 3, dir: 1, size: 1, groundLu: 30, seed: 5 });
    expect(liveDamagePieces() - before).toBeGreaterThanOrEqual(2);
    run(e, 1200);
    expect(e.done).toBe(false);
    run(e, PIECE_LIE_MS + PIECE_FADE_MS + 600);
    expect(e.done).toBe(true);
    expect(liveDamagePieces()).toBe(before);
  });

  it('Reduce motion plays only the puff (no flying pieces); Lite throws one piece', () => {
    const before = liveDamagePieces();
    const r = play('fx.dmg_burst', { mat: 2, stage: 3, dir: -1, size: 2, groundLu: 40, reduce: 1, seed: 1 });
    expect(liveDamagePieces()).toBe(before);
    run(r, 1500);
    expect(r.done).toBe(true);
    play('fx.dmg_burst', { mat: 2, stage: 3, dir: -1, size: 2, groundLu: 40, lite: 1, seed: 1 });
    expect(liveDamagePieces() - before).toBe(1);
  });

  it('holds at most MAX_PIECES on the field (the oldest fade early) and frees them when the view goes', () => {
    const views = Array.from({ length: 20 }, (_, i) => play('fx.dmg_burst', { mat: 0, stage: 3, dir: 1, size: 2, groundLu: 30, side: 1, seed: i + 1 }));
    expect(liveDamagePieces()).toBeGreaterThan(MAX_PIECES);
    for (const v of views) run(v, 300);
    expect(liveDamagePieces()).toBeLessThanOrEqual(MAX_PIECES);
    for (const v of open.splice(0)) v.destroy();
    expect(liveDamagePieces()).toBe(0);
  });

  it("throws the same pieces for the same seed (the pool passes a seed from the battle view's seeded RNG: a replay matches)", () => {
    const pos = (seed: number): string => {
      const e = play('fx.dmg_burst', { mat: 4, stage: 3, dir: 1, size: 2, groundLu: 25, seed });
      run(e, 200);
      // the pieces are the burst layer's own sprites (the puff is a nested effect)
      const layer = e.root.children[0] as Container;
      return layer.children
        .filter((c): c is Sprite => c instanceof Sprite)
        .map((s) => `${s.x.toFixed(2)},${s.y.toFixed(2)}`)
        .join('|');
    };
    expect(pos(9).length).toBeGreaterThan(0);
    expect(pos(9)).toBe(pos(9));
    expect(pos(9)).not.toBe(pos(10));
  });
});

describe('the kit bakes ahead of the battle (W0: no part bakes and no page uploads mid-battle)', () => {
  it('bakeDamageKit bakes every mark, strip and step piece once per baker in idle slices, ahead of use, and uploads once at the end', async () => {
    vi.useFakeTimers();
    try {
      const got: string[] = [];
      const ahead: boolean[] = [];
      let uploads = 0;
      // each bake takes 2 ms of the slice's time (the slice bakes while it has time left)
      const bake = (p: { id?: string }, _z: unknown, _t: unknown, o?: { ahead?: boolean }): void => {
        got.push(p.id ?? '?');
        ahead.push(o?.ahead === true);
        vi.setSystemTime(Date.now() + 2);
      };
      const baker = { enabled: true, has: (p: { id?: string }) => got.includes(p.id ?? '?'), get: bake, flushAll: () => void uploads++ } as unknown as PartBaker;
      const first = bakeDamageKit(baker);
      expect(first).not.toBeNull();
      // asked again while it bakes: the same promise, nothing baked twice
      expect(bakeDamageKit(baker)).toBe(first);
      expect(got).toEqual([]);
      await vi.advanceTimersByTimeAsync(20);
      // a few parts in the first slice, not the whole kit, and no upload yet
      expect(got.length).toBeGreaterThan(0);
      expect(got.length).toBeLessThan(damageKitParts().length);
      expect(uploads).toBe(0);
      await vi.advanceTimersByTimeAsync(16 * 200);
      await first;
      expect(got.sort()).toEqual(damageKitParts().sort());
      expect(new Set(got).size).toBe(got.length);
      expect(ahead.every((a) => a)).toBe(true);
      expect(damageKitParts()).toEqual(expect.arrayContaining([...markParts(), ...DAMAGE_STRIP_PARTS, 'fx.p.dmgFlame', 'fx.p.dmgThread']));
      // one upload, at the end; once baked, nothing more to wait for
      expect(uploads).toBe(1);
      expect(bakeDamageKit(baker)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("the baker: parts baked ahead leave their page to the batch's last upload, and a view that gets one has it uploaded", () => {
    vi.stubGlobal('Path2D', class {
      addPath(): void {}
    });
    try {
      // a canvas stand-in for Node: any 2D call is a no-op
      const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
      const canvasFactory = (w: number, h: number): HTMLCanvasElement => ({ width: w, height: h, getContext: () => ctx }) as unknown as HTMLCanvasElement;
      const baker = new PartBaker({ pxPerLu: 1, canvasFactory });
      baker.seal();
      const [m1, m2, m3, m4] = markParts().map((id) => getPart(id)!);
      const plain = getPart('fx.p.dust')!;
      expect(m1 && m2 && m3 && m4 && plain).toBeTruthy();
      let uploads = 0;
      const a = baker.get(m1!, FX_ZONES, 0, { ahead: true });
      const page = a.main.source;
      const up = page.update.bind(page);
      page.update = () => {
        uploads++;
        up();
      };
      // the views' flushes while the batch bakes upload nothing of it
      baker.flush();
      baker.get(m2!, FX_ZONES, 0, { ahead: true });
      baker.flush();
      expect(uploads).toBe(0);
      // a part the view already has (on the GPU) does not upload the page either
      expect(baker.get(m1!, FX_ZONES, 0, { ahead: true })).toBe(a);
      baker.flush();
      expect(uploads).toBe(0);
      // the end of the batch: one upload; nothing left to upload after it
      baker.flushAll();
      expect(uploads).toBe(1);
      baker.get(m1!, FX_ZONES);
      baker.flush();
      expect(uploads).toBe(1);
      // a plain bake (a view waiting for it) uploads at the view's flush, as before
      expect(baker.get(plain, FX_ZONES).main.source).toBe(page);
      baker.flush();
      expect(uploads).toBe(2);
      // a view that gets a part baked ahead before the batch's end has its page uploaded by its flush
      baker.get(m3!, FX_ZONES, 0, { ahead: true });
      baker.flush();
      expect(uploads).toBe(2);
      baker.get(m3!, FX_ZONES);
      baker.flush();
      expect(uploads).toBe(3);
      // a view getting a part that is on the GPU already does not upload the page for later parts baked ahead
      baker.get(m4!, FX_ZONES, 0, { ahead: true });
      baker.get(m1!, FX_ZONES);
      baker.flush();
      expect(uploads).toBe(3);
      baker.flushAll();
      expect(uploads).toBe(4);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
