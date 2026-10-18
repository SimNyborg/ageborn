/**
 * Home's live island stage (queue item 37, `showcase/home.ts`) on the fake art provider: it leases its
 * troops' sheets before anything draws, goes live on the menus' shared app, plays the choreography through
 * the battle's event mapper (sparks, shots), flies the flags on the lane's dressing (a plain banner where a
 * side has none), swaps troops when the deck or the opponent changes, stops drawing while hidden or when a
 * newer stage takes the canvas, sounds only for its first exchanges, and lets everything go on destroy (the
 * shared context at once when a match starts).
 */
import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { content } from '@/content';
import { FakeArtProvider } from '@/contracts/fakes/art';
import type { BaseDressingView, SideLook, VisualId } from '@/contracts';
import { SharedApp, type DioramaApp, type SharedAppUser } from '../showcase/diorama';
import { HomeStage, type HomeStageRequest } from '../showcase/home';

interface Lease {
  visuals: readonly { visualId: VisualId; skin?: string | null }[];
  resolve: () => void;
  released: number;
  /** How many leases existed when this one was let go (the order of a hand-over). */
  leasesAtRelease?: number;
}

/** The fake provider plus the extras the real one has: `showcaseLease` and the lane dressing. */
class IslandArt extends FakeArtProvider {
  readonly leases: Lease[] = [];
  readonly dressings: { look: SideLook; banner: unknown; destroyed: boolean }[] = [];
  constructor(private readonly auto = true) {
    super();
  }
  showcaseLease(o: { visuals: readonly { visualId: VisualId; skin?: string | null }[]; hd?: boolean }): { ready: Promise<void>; hd: boolean; release(): void } {
    let resolve: () => void = () => {};
    const ready = new Promise<void>((r) => (resolve = r));
    const l: Lease = { visuals: o.visuals, resolve, released: 0 };
    this.leases.push(l);
    if (this.auto) resolve();
    return {
      ready,
      hd: false,
      release: () => {
        l.released += 1;
        l.leasesAtRelease = this.leases.length;
      },
    };
  }
  createBaseDressing(o: { look: SideLook; banner?: unknown }): BaseDressingView {
    const rec = { look: o.look, banner: o.banner ?? null, destroyed: false };
    this.dressings.push(rec);
    return { root: new Container(), setAge: () => {}, hit: () => {}, collapse: () => {}, setMotion: () => {}, update: () => {}, destroy: () => (rec.destroyed = true) };
  }
}

function fakeApp(): DioramaApp & { destroyed: boolean; renders: number; hosts: unknown[] } {
  const app = {
    stage: new Container(),
    destroyed: false,
    renders: 0,
    hosts: [] as unknown[],
    attach: (host: HTMLElement) => app.hosts.push(host),
    resize: () => {},
    render: () => (app.renders += 1),
    destroy: () => (app.destroyed = true),
  };
  return app;
}

const host = { getBoundingClientRect: () => ({ width: 343, height: 194 }), clientWidth: 343, clientHeight: 194 } as unknown as HTMLElement;
const noFrames = { request: () => 1, cancel: () => {} };

function req(o: Partial<HomeStageRequest> = {}): HomeStageRequest {
  return {
    troops: [
      { side: 0, slot: 0, card: 'footman', skin: null, x: 247.5, y: 224 },
      { side: 0, slot: 1, card: 'longbowman', skin: null, x: 181.5, y: 219 },
      { side: 1, slot: 0, card: 'squire_pair', skin: null, x: 352.5, y: 224 },
      { side: 1, slot: 1, card: 'longbowman', skin: null, x: 418.5, y: 219 },
    ],
    poles: [
      { side: 0, x: 170, y: 214, height: 104, baseFlag: 'baseFlag.ember', nationalFlag: 'nationalFlag.dk' },
      { side: 1, x: 430, y: 214, height: 104, baseFlag: null, nationalFlag: null },
    ],
    island: { width: 600, height: 340, center: 300, ground: 224, unitsPerLu: 0.92 },
    teamPreset: 'default',
    lite: false,
    seed: 1234,
    ...o,
  };
}

function setup(o: { art?: IslandArt; req?: Partial<HomeStageRequest>; loadTimeoutMs?: number } = {}) {
  const art = o.art ?? new IslandArt();
  const apps: ReturnType<typeof fakeApp>[] = [];
  const shared = new SharedApp(async () => {
    const a = fakeApp();
    apps.push(a);
    return a;
  }, 1000);
  const stage = new HomeStage(host, req(o.req), { art, shared, content, frames: noFrames, loadTimeoutMs: o.loadTimeoutMs ?? 60, dpr: 2 });
  return { art, stage, shared, apps };
}

/** Steps `ms` of island time in 16 ms frames. */
function run(stage: HomeStage, ms: number): void {
  for (let t = 0; t < ms; t += 16) stage.step(16);
}

describe('lazy load and release', () => {
  it('leases the troops first, goes live on the shared app once they load, and lets everything go on destroy', async () => {
    const art = new IslandArt(false);
    const { stage, shared, apps } = setup({ art });
    await Promise.resolve();
    expect(art.leases).toHaveLength(1);
    expect(art.leases[0]!.visuals.map((v) => v.visualId)).toEqual(expect.arrayContaining([content.units['footman']!.visualId, content.units['squire_pair']!.visualId]));
    expect(apps).toHaveLength(0);
    expect(stage.debug().live).toBe(false);
    art.leases[0]!.resolve();
    expect(await stage.ready).toBe(true);
    const d = stage.debug();
    expect(d).toMatchObject({ live: true, owner: true, actors: [1, 2, 11, 12], poles: 2 });
    expect(apps[0]!.renders).toBeGreaterThan(0);
    expect(apps[0]!.hosts).toContain(host);
    stage.destroy();
    expect(art.leases[0]!.released).toBe(1);
    expect(art.dressings.every((x) => x.destroyed)).toBe(true);
    // the shared app lingers for the next stage (a tab switch to Customize re-uses it)
    expect(shared.alive).toBe(true);
    stage.destroy();
    expect(art.leases[0]!.released).toBe(1);
  });

  it('leaving for a match lets the shared app and its context go at once', async () => {
    const { stage, shared, apps } = setup();
    await stage.ready;
    stage.destroy({ now: true });
    expect(shared.alive).toBe(false);
    expect(apps[0]!.destroyed).toBe(true);
  });

  it('destroyed while loading, it never draws and still gives the sheets back', async () => {
    const art = new IslandArt(false);
    const { stage, apps } = setup({ art });
    await Promise.resolve();
    stage.destroy();
    art.leases[0]!.resolve();
    expect(await stage.ready).toBe(false);
    await Promise.resolve();
    expect(apps).toHaveLength(0);
    expect(art.leases[0]!.released).toBe(1);
  });

  it('gives up after the load timeout: a stalled download only ever leaves the still island', async () => {
    const art = new IslandArt(false);
    const { stage, apps } = setup({ art });
    expect(await stage.ready).toBe(false);
    expect(apps).toHaveLength(0);
    expect(art.leases[0]!.released).toBe(1);
  });
});

describe('the island', () => {
  it('flies your flags on the lane dressing and a plain banner on the opponent pole (grey while unknown)', async () => {
    const { stage, art } = setup();
    await stage.ready;
    expect(art.dressings).toHaveLength(2);
    expect(art.dressings[0]).toMatchObject({ look: { baseFlag: 'baseFlag.ember', nationalFlag: 'nationalFlag.dk' }, banner: null });
    expect(art.dressings[1]!.banner).toMatchObject({ color: null });
    stage.update({ poles: req().poles.map((p) => (p.side === 1 ? { ...p, grey: true } : p)) });
    expect(art.dressings[1]!.destroyed).toBe(true);
    expect(art.dressings[2]!.banner).toMatchObject({ color: 0x7a8294 });
    stage.destroy();
  });

  it("plays the choreography with the battle's feel: the hits throw the mapper's sparks, and everyone comes home", async () => {
    const { stage, art } = setup();
    await stage.ready;
    run(stage, 30_000);
    expect(stage.debug().cycles).toBeGreaterThan(2);
    expect(art.calls.some((c) => c.method === 'createEffect')).toBe(true);
    // nobody fell, and between cycles everyone stands on the spot
    expect(stage.debug().actors).toEqual([1, 2, 11, 12]);
    while (stage.debug().cycle !== null) stage.step(16);
    for (const t of stage.debug().troops) expect(t.x).toBe(t.homeX);
    stage.destroy();
  });

  it('a shooter in front looses real projectiles at the other front troop', async () => {
    const troops = req().troops.map((t) => (t.side === 0 && t.slot === 0 ? { ...t, card: 'longbowman' } : t));
    const { stage, art } = setup({ req: { troops } });
    await stage.ready;
    run(stage, 12_000);
    expect(art.calls.some((c) => c.method === 'createProjectile')).toBe(true);
    stage.destroy();
  });

  it('a deck switch or the opponent found swaps the troops: new sheets leased first, the arrival pops in', async () => {
    const { stage, art } = setup({ req: { troops: req().troops.filter((t) => t.side === 0) } });
    await stage.ready;
    expect(stage.debug().actors).toEqual([1, 2]);
    const before = art.calls.filter((c) => c.method === 'createUnit').length;
    stage.update({ troops: req().troops });
    await new Promise((r) => setTimeout(r, 0));
    expect(art.leases).toHaveLength(2);
    expect(art.leases[0]!.released).toBe(1);
    expect(stage.debug().actors).toEqual([1, 2, 11, 12]);
    expect(art.calls.filter((c) => c.method === 'createUnit').length).toBe(before + 2);
    // the old troops stayed; a replaced one fades out with a dust poof
    stage.update({ troops: req().troops.map((t) => (t.side === 0 && t.slot === 0 ? { ...t, card: 'bonker' } : t)) });
    await new Promise((r) => setTimeout(r, 0));
    expect(stage.debug().troops.find((t) => t.id === 1)?.card).toBe('bonker');
    run(stage, 600);
    stage.destroy();
  });

  it("preloads the troops that may come next (the search's opponent) without drawing them, and lets them go", async () => {
    const mine = req().troops.filter((t) => t.side === 0);
    const { stage, art } = setup({ req: { troops: mine, preload: [{ card: 'squire_pair' }, { card: 'longbowman' }] } });
    await stage.ready;
    // the preload's own lease, next to the island's
    const pre = art.leases.find((l) => l.visuals.some((v) => v.visualId === content.units['squire_pair']!.visualId))!;
    expect(pre).toBeDefined();
    expect(stage.debug().actors).toEqual([1, 2]);
    // the opponent found: they join (their sheets are ready), and only then does the preload let go
    stage.update({ troops: req().troops, preload: [] });
    const joined = art.leases.at(-1)!;
    expect(joined.visuals).toHaveLength(4);
    // the island's new lease came first, so the sheets moving over are never let go in between
    expect(pre.released).toBe(1);
    expect(pre.leasesAtRelease).toBe(art.leases.indexOf(joined) + 1);
    await new Promise((r) => setTimeout(r, 0));
    expect(stage.debug().actors).toEqual([1, 2, 11, 12]);
    // a new search, then cancelled: the preload goes with it; destroy gives every lease back
    stage.update({ preload: [{ card: 'bonker' }] });
    const next = art.leases.at(-1)!;
    stage.update({ preload: [] });
    expect(next.released).toBe(1);
    stage.update({ preload: [{ card: 'bonker' }] });
    stage.destroy();
    expect(art.leases.every((l) => l.released === 1)).toBe(true);
  });

  it('draws only while visible and on the shared canvas; a newer stage takes it and gives it back', async () => {
    const { stage, shared, apps } = setup();
    await stage.ready;
    expect(stage.debug().running).toBe(true);
    stage.setVisible(false);
    expect(stage.debug().running).toBe(false);
    stage.setVisible(true);
    expect(stage.debug().running).toBe(true);
    const other: SharedAppUser = { yieldApp: vi.fn(), reclaimApp: vi.fn() };
    await shared.acquire(other, { width: 100, height: 100 });
    expect(stage.debug()).toMatchObject({ owner: false, running: false });
    const renders = apps[0]!.renders;
    stage.step(16);
    expect(apps[0]!.renders).toBe(renders);
    shared.release(other);
    expect(stage.debug()).toMatchObject({ owner: true, running: true });
    stage.destroy();
  });

  it('sounds (quietly) only for its first exchanges: a menu that keeps clanging is noise', async () => {
    const sound = vi.fn();
    const { stage } = setup({ req: { sound } });
    await stage.ready;
    run(stage, 14_000);
    const early = sound.mock.calls.length;
    expect(early).toBeGreaterThan(0);
    for (const [, o] of sound.mock.calls) expect((o as { volumeDb?: number }).volumeDb ?? 0).toBeLessThan(0);
    run(stage, 60_000);
    const settled = sound.mock.calls.length;
    run(stage, 60_000);
    expect(sound.mock.calls.length).toBe(settled);
    stage.destroy();
  });

  it('a card the content does not know is left out, and an island with no troops still flies its flags', async () => {
    const { stage, art } = setup({ req: { troops: [{ side: 0, slot: 0, card: 'no_such_card', x: 247.5, y: 224 }] } });
    expect(await stage.ready).toBe(true);
    expect(stage.debug().actors).toEqual([]);
    expect(art.dressings).toHaveLength(2);
    run(stage, 5000);
    stage.destroy();
  });
});
