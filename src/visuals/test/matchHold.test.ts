/**
 * G7 (Safari memory): unit sheets load per match. With `lazyUnits` (the game) `preload(ages)` loads no
 * unit sheet; a battle's lease (the provider's `holdArt`) loads one, and when the lease ends it unloads
 * after the linger, but never while a view still draws from it; a sheet a view draws before any hold has
 * it (the fallback path) is loaded without a pin and unloads once nothing holds or draws it. The provider's
 * hold resolves units with their skins and a tower's crew from its fort sheet.
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

function adapter(o: { lazy?: boolean } = {}) {
  const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
  const other = MANIFEST['unit.pebbler'] as VisualDef & { source: string };
  const loads: string[] = [];
  const unloads: string[] = [];
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({
    entries: () => [{ ...def, clips: { idle: def.clips['idle']! } }, { ...other, clips: { idle: other.clips['idle']! } }],
    decor: art.procedural.baker,
    baseUrl: '/ageborn/',
    lazyUnits: o.lazy !== false,
    load: async (url) => {
      loads.push(url);
      return data();
    },
    unload: (url) => {
      unloads.push(url);
    },
  });
  return { a, def, src: def.source, other: other.source, loads, unloads };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

afterEach(() => vi.useRealTimers());

describe('unit sheets per match (G7)', () => {
  it('with lazyUnits, preload loads the ages\' world sheets only, never a unit sheet', async () => {
    const { a, loads } = adapter();
    await a.preload(['stone', 'bronze']);
    expect(loads.filter((u) => u.includes('art/units/'))).toEqual([]);
    const eager = adapter({ lazy: false });
    await eager.a.preload(['stone']);
    expect(eager.loads).toContain('/ageborn/art/units/stone/bonker.json');
  });

  it('a battle lease loads a sheet; it unloads after the linger once released, but not while a view draws it', async () => {
    vi.useFakeTimers();
    const { a, def, src, unloads } = adapter();
    const l = a.lease(src);
    await l.core;
    expect(a.hasSheet(src)).toBe(true);
    const view = a.createUnit({ key: 'unit.bonker', def, side: 0, teamPreset: 'default', seed: 1 });
    l.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 3);
    await settle();
    expect(unloads).toEqual([]);
    expect(a.hasSheet(src)).toBe(true);
    view.destroy();
    view.destroy(); // idempotent
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(unloads).toEqual(['/ageborn/art/units/stone/bonker.json']);
    expect(a.hasSheet(src)).toBe(false);
  });

  it('a new lease or view during the linger keeps the sheet', async () => {
    vi.useFakeTimers();
    const { a, def, src, unloads, loads } = adapter();
    const l = a.lease(src);
    await l.core;
    l.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS / 2);
    const view = a.createUnit({ key: 'unit.bonker', def, side: 1, teamPreset: 'default', seed: 2 });
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 2);
    await settle();
    expect(unloads).toEqual([]);
    view.destroy();
    const again = a.lease(src);
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 2);
    await settle();
    expect(unloads).toEqual([]);
    expect(loads.filter((u) => u === '/ageborn/art/units/stone/bonker.json')).toHaveLength(1);
    again.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(unloads).toEqual(['/ageborn/art/units/stone/bonker.json']);
  });

  it('a unit drawn before its sheet (the fallback path) loads it unpinned: it unloads unless something keeps it', async () => {
    vi.useFakeTimers();
    const { a, def, other, unloads } = adapter();
    expect(a.canDraw('unit', def)).toBe(false);
    await settle();
    expect(a.hasSheet(def.source)).toBe(true);
    // a view drawn from it now keeps it
    const view = a.createUnit({ key: 'unit.bonker', def, side: 0, teamPreset: 'default', seed: 3 });
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 2);
    await settle();
    expect(a.hasSheet(def.source)).toBe(true);
    view.destroy();
    // a crew sheet asked for and never drawn goes after the linger
    expect(a.sheetFor(other)).toBeUndefined();
    await settle();
    expect(a.hasSheet(other)).toBe(true);
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(unloads.sort()).toEqual(['/ageborn/art/units/stone/bonker.json', '/ageborn/art/units/stone/pebbler.json']);
    // a crew the fort keeps stays
    a.sheetFor(other);
    await settle();
    const keep = a.holdSheet(other);
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS * 2);
    await settle();
    expect(a.hasSheet(other)).toBe(true);
    keep();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(a.hasSheet(other)).toBe(false);
  });

  it('a sheet asked for again while it unloads loads once the unload is done (never the asset being destroyed)', async () => {
    vi.useFakeTimers();
    const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
    const log: string[] = [];
    let finish: (() => void) | null = null;
    const art = createArtProvider({ warn: () => {} });
    const a = new AtlasAdapter({
      entries: () => [{ ...def, clips: { idle: def.clips['idle']! } }],
      decor: art.procedural.baker,
      baseUrl: '/ageborn/',
      lazyUnits: true,
      load: async (url) => {
        log.push(`load ${url}`);
        return data();
      },
      unload: (url) =>
        new Promise<void>((r) => {
          log.push(`unload ${url}`);
          finish = () => {
            log.push('unloaded');
            r();
          };
        }),
    });
    const l = a.lease(def.source);
    await l.core;
    l.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(log).toEqual(['load /ageborn/art/units/stone/bonker.json', 'unload /ageborn/art/units/stone/bonker.json']);
    // wanted again mid-unload: the load waits
    const again = a.lease(def.source);
    await settle();
    expect(log).toHaveLength(2);
    finish!();
    await again.core;
    expect(log).toEqual(['load /ageborn/art/units/stone/bonker.json', 'unload /ageborn/art/units/stone/bonker.json', 'unloaded', 'load /ageborn/art/units/stone/bonker.json']);
    expect(a.hasSheet(def.source)).toBe(true);
  });

  it("a tower in the hold holds its crew's unit sheet, named in the fort sheet", async () => {
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const fort = MANIFEST['fort.sling_perch'];
    expect(fort?.kind).toBe('atlas');
    // the fort sheet as loaded (its meta names the crew); 1x here, as the provider picks for this screen
    art.forts.register(fort!.source, { animations: {}, luPerUnit: 1, meta: { heightLu: 100, pxPerLu: 1, clips: {}, crew: { visualId: 'unit.pebbler' } } as never });
    const leased: string[] = [];
    vi.spyOn(art.atlas, 'lease').mockImplementation((src) => {
      leased.push(src);
      return { ready: Promise.resolve(), core: Promise.resolve(), hd: false, release: () => undefined };
    });
    await art.holdArt().set([{ visualId: 'fort.sling_perch' }]);
    expect(leased).toEqual([MANIFEST['unit.pebbler']!.source]);
  });

  it("the provider's hold keeps what a match draws: units by visual id and skin, swapped as the set changes", async () => {
    vi.useFakeTimers();
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const leased: string[] = [];
    const released: string[] = [];
    const lease = art.atlas.lease.bind(art.atlas);
    vi.spyOn(art.atlas, 'lease').mockImplementation((src, o) => {
      leased.push(src);
      const l = lease(src, o);
      return {
        ...l,
        core: Promise.resolve(),
        ready: Promise.resolve(),
        release: () => {
          released.push(src);
          l.release();
        },
      };
    });
    const hold = art.holdArt();
    await hold.set([{ visualId: 'unit.bonker' }, { visualId: 'unit.pebbler' }, { visualId: 'unit.bonker' }, { visualId: 'turret.sapling_sling' }]);
    expect(leased.sort()).toEqual(['art/units/stone/bonker.json', 'art/units/stone/pebbler.json']);
    await hold.set([{ visualId: 'unit.pebbler' }, { visualId: 'unit.spear_hunter' }]);
    expect(released).toEqual(['art/units/stone/bonker.json']);
    expect(leased).toContain(MANIFEST['unit.spear_hunter']!.source);
    hold.release();
    expect(released.sort()).toEqual(['art/units/stone/bonker.json', 'art/units/stone/pebbler.json', MANIFEST['unit.spear_hunter']!.source].sort());
    // a released hold ignores later sets
    await hold.set([{ visualId: 'unit.bonker' }]);
    expect(leased.filter((s) => s === 'art/units/stone/bonker.json')).toHaveLength(1);
  });
});
