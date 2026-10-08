/**
 * Sheet leases for the card detail showcase (docs/decisions.md, "card showcase"): a stage holds the
 * sheets it draws; a sheet the game itself loaded is shared and never unloaded by a showcase; a sheet
 * only showcases wanted is unloaded (core and extras URLs) a few seconds after its last lease ends,
 * unless a new lease comes first; the HD copy a 1x battle does not have is a showcase-only copy.
 */
import { Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { AtlasAdapter, LEASE_LINGER_MS, type AtlasData } from '../adapters/atlas';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';

const tex = (n: number): Texture[] => Array.from({ length: n }, () => new Texture());

function data(): AtlasData {
  return {
    luPerUnit: 1,
    animations: { idle: tex(4), walk: tex(4), attack: tex(5), hit: tex(2), die: tex(3) },
    clips: {
      idle: { durationsMs: [100, 100, 100, 100], loop: true },
      walk: { durationsMs: [100, 100, 100, 100], loop: true },
      attack: { durationsMs: [100, 100, 200, 100, 100], impactAt: 0.4 },
      hit: { durationsMs: [100, 100] },
      die: { durationsMs: [100, 100, 100] },
    },
  };
}

const extras = (): AtlasData => ({ luPerUnit: 1, animations: { attack_b: tex(5) }, clips: { attack_b: { durationsMs: [100, 100, 200, 100, 100], impactAt: 0.4 } } });

function adapter(o: { hd?: boolean } = {}) {
  const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
  const loads: string[] = [];
  const unloads: string[] = [];
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({
    entries: () => [def],
    decor: art.procedural.baker,
    baseUrl: '/ageborn/',
    ...(o.hd ? { hd: true } : {}),
    load: async (url) => {
      loads.push(url);
      return url.includes('.x.') ? extras() : data();
    },
    unload: (url) => {
      unloads.push(url);
    },
  });
  return { a, def, src: def.source, loads, unloads };
}

/** Lets pending promise chains settle under fake timers. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

afterEach(() => vi.useRealTimers());

describe('showcase sheet leases', () => {
  it('a showcase-only sheet loads with its extras and is unloaded after the linger', async () => {
    vi.useFakeTimers();
    const { a, src, loads, unloads } = adapter();
    const l = a.lease(src);
    await l.ready;
    expect(l.hd).toBe(false);
    expect(loads).toEqual(['/ageborn/art/units/stone/bonker.json', '/ageborn/art/units/stone/bonker.x.json']);
    expect(a.hasSheet(src)).toBe(true);
    expect(a.leaseCount(src)).toBe(1);
    l.release();
    l.release(); // idempotent
    expect(a.leaseCount(src)).toBe(0);
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS - 10);
    expect(unloads).toEqual([]);
    await vi.advanceTimersByTimeAsync(20);
    await settle();
    expect(unloads).toEqual(['/ageborn/art/units/stone/bonker.json', '/ageborn/art/units/stone/bonker.x.json']);
    expect(a.hasSheet(src)).toBe(false);
  });

  it('a new lease within the linger keeps the sheet (back and forth between cards loads it once)', async () => {
    vi.useFakeTimers();
    const { a, src, loads, unloads } = adapter();
    const l1 = a.lease(src);
    await l1.ready;
    l1.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS / 2);
    const l2 = a.lease(src);
    await l2.ready;
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 2);
    expect(unloads).toEqual([]);
    expect(loads).toHaveLength(2);
    l2.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(unloads).toHaveLength(2);
  });

  it('a sheet stays while any lease holds it', async () => {
    vi.useFakeTimers();
    const { a, src, unloads } = adapter();
    const l1 = a.lease(src);
    const l2 = a.lease(src);
    await Promise.all([l1.ready, l2.ready]);
    l1.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 2);
    expect(unloads).toEqual([]);
    l2.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(unloads).toHaveLength(2);
  });

  it('a sheet the game loaded is shared and never unloaded by a showcase', async () => {
    vi.useFakeTimers();
    const { a, src, loads, unloads } = adapter();
    await a.extrasReady(src);
    const l = a.lease(src);
    await l.ready;
    expect(loads).toHaveLength(2); // no second download
    l.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 3);
    await settle();
    expect(unloads).toEqual([]);
    expect(a.hasSheet(src)).toBe(true);
  });

  it('the game asking for a leased sheet pins it, so the lease ending does not unload it', async () => {
    vi.useFakeTimers();
    const { a, src, unloads } = adapter();
    const l = a.lease(src);
    await l.ready;
    l.release();
    await a.ensure(src);
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 2);
    await settle();
    expect(unloads).toEqual([]);
  });

  it('an HD lease on a 1x battle loads a showcase-only HD copy and unloads just that', async () => {
    vi.useFakeTimers();
    const { a, def, src, loads, unloads } = adapter();
    await a.extrasReady(src); // the battle's 1x sheet
    const l = a.lease(src, { hd: true });
    await l.ready;
    expect(l.hd).toBe(true);
    expect(loads.slice(2)).toEqual(['/ageborn/art/units/stone/bonker.hd.json', '/ageborn/art/units/stone/bonker.x.hd.json']);
    expect(a.hasHdCopy(src)).toBe(true);
    expect(a.canDrawHd(def)).toBe(true);
    const v = a.createUnit({ key: 'unit.bonker', def, side: 0, teamPreset: 'default', seed: 1, hd: true });
    v.destroy();
    l.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(unloads).toEqual(['/ageborn/art/units/stone/bonker.hd.json', '/ageborn/art/units/stone/bonker.x.hd.json']);
    expect(a.hasHdCopy(src)).toBe(false);
    expect(a.hasSheet(src)).toBe(true);
  });

  it('an HD battle shares its own sheets: an HD lease adds no copy', async () => {
    const { a, src, loads } = adapter({ hd: true });
    await a.extrasReady(src);
    const l = a.lease(src, { hd: true });
    await l.ready;
    expect(l.hd).toBe(false);
    expect(loads).toHaveLength(2);
    expect(a.hasHdCopy(src)).toBe(false);
    l.release();
  });
});

describe('measured reach (the stage frames its actors with it)', () => {
  it('reports the visible frame, and the furthest any frame of the given clips reaches', () => {
    const { a, def, src } = adapter();
    const d = data();
    // trimmed frames: an idle 20 lu wide around the feet, an attack wind-up reaching 30 lu behind
    const frame = (x: number, w: number): Texture => {
      const t = new Texture();
      (t as unknown as { orig: { width: number; height: number } }).orig = { width: 100, height: 100 } as never;
      (t as unknown as { trim: { x: number; y: number; width: number; height: number } }).trim = { x, y: 20, width: w, height: 80 } as never;
      (t as unknown as { defaultAnchor: { x: number; y: number } }).defaultAnchor = { x: 0.5, y: 1 } as never;
      return t;
    };
    (d.animations as Record<string, Texture[]>)['idle'] = [frame(40, 20)];
    (d.animations as Record<string, Texture[]>)['attack'] = [frame(20, 40), frame(45, 30)];
    a.register(src, { ...d, heightLu: def.heightLu });
    const v = a.createUnit({ key: 'unit.bonker', def: { ...def }, side: 0, teamPreset: 'default', seed: 3 }) as unknown as {
      extentLu(o?: { clips?: readonly string[] }): { front: number; back: number; top: number } | null;
      destroy(): void;
    };
    const all = v.extentLu({ clips: ['idle', 'attack'] });
    expect(all).not.toBeNull();
    const idle = v.extentLu({ clips: ['idle'] })!;
    expect(all!.back).toBeGreaterThan(idle.back);
    expect(all!.front).toBeGreaterThan(idle.front);
    expect(v.extentLu({ clips: ['no_such_clip'] })).toBeNull();
    v.destroy();
  });
});
