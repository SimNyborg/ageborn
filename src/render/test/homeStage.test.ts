/**
 * Home's live island stage (queue item 37, `showcase/home.ts`) on the fake art provider: it leases its
 * troops' sheets before anything draws, goes live on the menus' shared app, plays the choreography through
 * the battle's event mapper (sparks, shots), flies the flags on the lane's dressing (a plain banner where a
 * side has none), swaps troops when the deck or the opponent changes, stops drawing while hidden or when a
 * newer stage takes the canvas, and lets everything go on destroy (the shared context at once when a match
 * starts). Review M: the cast the first lease loads is the one built (S4), the found opponent stands by off
 * stage on the GPU (S10), a lost context shows the still and comes back (S6), the drawn boxes reach the
 * still island (S3), moved spots and team colours apply (N3, N4), a cold start waits while held (S7), Auto
 * drops to Lite's pace when frames run long (N2), and a start that throws leaves the still (N9).
 */
import { Container, Graphics } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { content } from '@/content';
import { FakeArtProvider } from '@/contracts/fakes/art';
import type { BaseDressingView, SideLook, SkinId, TeamPreset, UnitView, VisualId } from '@/contracts';
import { SharedApp, type DioramaApp, type SharedAppUser } from '../showcase/diorama';
import { HomeStage, type HomeStageRequest, type HomeTroopBox } from '../showcase/home';

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
  /** The fake's views plus the atlas tier's idle box (how far the drawn idle pose reaches). */
  override createUnit(o: { visualId: VisualId; skin?: SkinId; side: 0 | 1; teamPreset: TeamPreset }) {
    const v = super.createUnit(o) as ReturnType<FakeArtProvider['createUnit']> & UnitView & { extentLu?: (o?: { clips?: readonly string[] }) => { front: number; back: number; top: number } };
    v.extentLu = () => ({ front: 40, back: 20, top: 80 });
    return v;
  }
}

function fakeApp(): DioramaApp & { destroyed: boolean; renders: number; hosts: unknown[]; uploads: number; lose(): void; restore(): void } {
  const ctx = { lost: [] as (() => void)[], restored: [] as (() => void)[] };
  const app = {
    stage: new Container(),
    destroyed: false,
    renders: 0,
    uploads: 0,
    hosts: [] as unknown[],
    attach: (host: HTMLElement) => app.hosts.push(host),
    resize: () => {},
    render: () => (app.renders += 1),
    upload: () => (app.uploads += 1),
    onContext: (lost: () => void, restored: () => void) => {
      ctx.lost.push(lost);
      ctx.restored.push(restored);
      return () => {};
    },
    lose: () => ctx.lost.forEach((f) => f()),
    restore: () => ctx.restored.forEach((f) => f()),
    destroy: () => (app.destroyed = true),
  };
  return app;
}

/** A frame scheduler the test drives: `tick(ms)` runs the pending frame `ms` after the last one. */
function manualFrames() {
  let cb: ((now: number) => void) | null = null;
  let now = 0;
  return {
    request: (f: (now: number) => void) => {
      cb = f;
      return 1;
    },
    cancel: () => {
      cb = null;
    },
    tick(ms: number) {
      now += ms;
      const f = cb;
      cb = null;
      f?.(now);
    },
  };
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

function setup(o: { art?: IslandArt; req?: Partial<HomeStageRequest>; loadTimeoutMs?: number; frames?: { request(cb: (now: number) => void): number; cancel(h: number): void } } = {}) {
  const art = o.art ?? new IslandArt();
  const apps: ReturnType<typeof fakeApp>[] = [];
  const shared = new SharedApp(async () => {
    const a = fakeApp();
    apps.push(a);
    return a;
  }, 1000);
  const stage = new HomeStage(host, req(o.req), { art, shared, content, frames: o.frames ?? noFrames, loadTimeoutMs: o.loadTimeoutMs ?? 60, dpr: 2, quietMs: 0 });
  return { art, stage, shared, apps };
}

const settle = (ms = 0) => new Promise((r) => setTimeout(r, ms));

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

  it('flashes white at most once per exchange (the last blow), however many blows land', async () => {
    const { stage, art } = setup();
    await stage.ready;
    const flashes: number[] = [];
    const hits: number[] = [];
    let t = 0;
    for (const a of (stage as unknown as { actors: Map<number, { view: { flash(ms: number): void; play(c: string): void } }> }).actors.values()) {
      const flash = a.view.flash.bind(a.view);
      a.view.flash = (ms: number) => {
        flashes.push(t);
        flash(ms);
      };
    }
    void art;
    let lastCycles = 0;
    let perExchange = 0;
    let worst = 0;
    for (; t < 90_000; t += 16) {
      const before = flashes.length;
      stage.step(16);
      const d = stage.debug();
      if (d.cycles !== lastCycles) {
        worst = Math.max(worst, perExchange);
        perExchange = 0;
        lastCycles = d.cycles;
      }
      perExchange += flashes.length - before;
      if (flashes.length > before) hits.push(t);
    }
    expect(flashes.length).toBeGreaterThan(0);
    expect(Math.max(worst, perExchange)).toBeLessThanOrEqual(1);
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

describe('review M fixes', () => {
  it('a troop change during the start-up builds the leased cast first, then leases and swaps in the new one (S4)', async () => {
    const art = new IslandArt(false);
    const { stage } = setup({ art });
    await settle();
    expect(art.leases).toHaveLength(1);
    // the deck switches while the first sheets are still on their way
    const next = req().troops.map((t) => (t.side === 0 && t.slot === 0 ? { ...t, card: 'bonker' } : t));
    stage.update({ troops: next });
    art.leases[0]!.resolve();
    expect(await stage.ready).toBe(true);
    // the island went live with the cast whose sheets loaded (never a stand-in for an unleased one) ...
    expect(art.calls.filter((c) => c.method === 'createUnit').map((c) => (c.args[0] as { visualId: string }).visualId)).not.toContain(content.units['bonker']!.visualId);
    // ... and the change follows on its own lease
    await settle();
    expect(art.leases).toHaveLength(2);
    expect(art.leases[1]!.visuals.map((v) => v.visualId)).toContain(content.units['bonker']!.visualId);
    art.leases[1]!.resolve();
    await settle();
    expect(stage.debug().troops.find((t) => t.id === 1)?.card).toBe('bonker');
    expect(art.leases[0]!.released).toBe(1);
    stage.destroy();
  });

  it('the found opponent stands by off stage on the GPU while the search runs, and only shows at found (S10)', async () => {
    const mine = req().troops.filter((t) => t.side === 0);
    const { stage, art, apps } = setup({ req: { troops: mine, preload: [{ card: 'squire_pair' }, { card: 'longbowman' }] } });
    await stage.ready;
    await settle(5);
    expect(stage.debug().standby).toBe(2);
    expect(apps[0]!.uploads).toBeGreaterThanOrEqual(2);
    const made = art.calls.filter((c) => c.method === 'createUnit').length;
    // found: the troops join and the preload goes in the same change
    stage.update({ troops: req().troops, preload: [] });
    await settle();
    expect(stage.debug().actors).toEqual([1, 2, 11, 12]);
    // the stand-bys stepped in: no new views at the found beat
    expect(art.calls.filter((c) => c.method === 'createUnit').length).toBe(made);
    expect(stage.debug().standby).toBe(0);
    // a search cancelled: its stand-bys go
    stage.update({ preload: [{ card: 'bonker' }] });
    await settle(5);
    expect(stage.debug().standby).toBe(1);
    stage.update({ preload: [] });
    expect(stage.debug().standby).toBe(0);
    stage.destroy();
  });

  it('a lost context stops the drawing and shows the still; the restore brings the island back (S6)', async () => {
    const onLive = vi.fn();
    const { stage, apps } = setup({ req: { onLive } });
    await stage.ready;
    expect(stage.debug().running).toBe(true);
    apps[0]!.lose();
    expect(stage.debug()).toMatchObject({ lost: true, running: false });
    expect(onLive).toHaveBeenLastCalledWith(false);
    const renders = apps[0]!.renders;
    stage.step(16);
    expect(apps[0]!.renders).toBe(renders);
    apps[0]!.restore();
    expect(stage.debug()).toMatchObject({ lost: false, running: true });
    expect(onLive).toHaveBeenLastCalledWith(true);
    stage.destroy();
  });

  it("tells the UI how far each troop's drawn idle pose reaches, for its still island (S3)", async () => {
    const boxes: (readonly HomeTroopBox[])[] = [];
    const { stage } = setup({ req: { onBoxes: (b) => boxes.push(b) } });
    await stage.ready;
    expect(boxes).toHaveLength(1);
    expect(boxes[0]!.map((b) => b.card).sort()).toEqual(['footman', 'longbowman', 'longbowman', 'squire_pair']);
    expect(boxes[0]![0]).toMatchObject({ front: 40, back: 20, top: 80 });
    expect(boxes[0]!.every((b) => b.skin === undefined)).toBe(true);
    // a swap reports again
    stage.update({ troops: req().troops.map((t) => (t.side === 1 && t.slot === 0 ? { ...t, card: 'bonker' } : t)) });
    await settle();
    expect(boxes.length).toBe(2);
    // a skinned troop's box says which skin it is (a skin may stand at another size than the card's own look)
    stage.update({ troops: req().troops.map((t) => (t.side === 0 && t.slot === 0 ? { ...t, skin: 'tin_can' as SkinId } : t)) });
    await settle();
    expect(boxes.length).toBe(3);
    expect(boxes[2]!.find((b) => b.card === 'footman')).toMatchObject({ skin: 'tin_can' });
    stage.destroy();
  });

  it('measures a troop drawn without the atlas idle box (a skin drawn as the puppet) by its drawn bounds', async () => {
    class PuppetSkinArt extends IslandArt {
      override createUnit(o: { visualId: VisualId; skin?: SkinId; side: 0 | 1; teamPreset: TeamPreset }) {
        const v = super.createUnit(o);
        if (o.skin) {
          delete (v as { extentLu?: unknown }).extentLu;
          v.root.addChild(new Graphics().rect(-30, -90, 100, 90).fill(0xffffff));
        }
        return v;
      }
    }
    const boxes: (readonly HomeTroopBox[])[] = [];
    const troops = req().troops.map((t) => (t.slot === 0 ? { ...t, skin: 'tin_can' as SkinId } : t));
    const { stage } = setup({ art: new PuppetSkinArt(), req: { troops, onBoxes: (b) => boxes.push(b) } });
    await stage.ready;
    const last = boxes.at(-1)!;
    // facing right, the drawn shape (around the fake's own) reaches 70 lu ahead, 30 behind and 90 up; facing left it mirrors
    expect(last.find((b) => b.card === 'footman')).toMatchObject({ skin: 'tin_can', front: 70, back: 30, top: 90 });
    expect(last.find((b) => b.card === 'squire_pair')).toMatchObject({ skin: 'tin_can', front: 30, back: 70, top: 90 });
    expect(last.find((b) => b.card === 'longbowman')).toMatchObject({ front: 40, back: 20, top: 80 });
    stage.destroy();
  });

  it('moved spots and new team colours reach the troops standing (N3, N4)', async () => {
    const { stage, art } = setup();
    await stage.ready;
    const homes = stage.debug().troops.map((t) => t.homeX);
    stage.update({ troops: req().troops.map((t) => ({ ...t, x: t.x + 10 })) });
    await settle();
    const moved = stage.debug().troops.map((t) => t.homeX);
    moved.forEach((x, i) => expect(x).not.toBe(homes[i]));
    const made = art.calls.filter((c) => c.method === 'createUnit').length;
    stage.update({ teamPreset: 'colorblind' as TeamPreset });
    await settle();
    expect(art.calls.filter((c) => c.method === 'createUnit').length).toBe(made + 4);
    for (const c of art.calls.filter((x) => x.method === 'createUnit').slice(made)) expect((c.args[0] as { teamPreset: string }).teamPreset).toBe('colorblind');
    stage.destroy();
  });

  it('a cold start waits while a search or a launch holds it (no WebGL start-up under the player, S7)', async () => {
    const { stage, apps } = setup({ req: { hold: true } });
    await settle(250);
    expect(apps).toHaveLength(0);
    expect(stage.debug().live).toBe(false);
    stage.update({ hold: false });
    expect(await stage.ready).toBe(true);
    expect(apps).toHaveLength(1);
    stage.destroy();
  });

  it("on Graphics Auto, frames that run long switch the island to Lite's pace (N2)", async () => {
    const frames = manualFrames();
    const { stage } = setup({ req: { auto: true }, frames });
    await stage.ready;
    for (let i = 0; i < 40; i++) frames.tick(16);
    expect(stage.debug().slow).toBe(false);
    for (let i = 0; i < 120; i++) frames.tick(48);
    expect(stage.debug().slow).toBe(true);
    stage.destroy();
    // without Auto it never switches
    const f2 = manualFrames();
    const b = setup({ frames: f2 });
    await b.stage.ready;
    for (let i = 0; i < 160; i++) f2.tick(48);
    expect(b.stage.debug().slow).toBe(false);
    b.stage.destroy();
  });

  it('a return within the app linger finds its sheets still leased: the leaving island hands its lease over, a match start drops it (S3)', async () => {
    const kept: ({ release(): void } | null)[] = [];
    const nows: boolean[] = [];
    const art = new IslandArt();
    const apps: ReturnType<typeof fakeApp>[] = [];
    const shared = new SharedApp(async () => {
      const a = fakeApp();
      apps.push(a);
      return a;
    }, 1000);
    const keepLease = (l: { release(): void } | null, o: { now: boolean }) => {
      kept.push(l);
      nows.push(o.now);
    };
    const a = new HomeStage(host, req(), { art, shared, content, frames: noFrames, dpr: 2, quietMs: 0, keepLease });
    await a.ready;
    a.destroy();
    // handed over, not released: the next island's lease finds the sheets (and their decoded copies) in
    expect(kept).toHaveLength(1);
    expect(kept[0]).not.toBeNull();
    expect(art.leases[0]!.released).toBe(0);
    // a warm start (the app is still up) draws at once
    const renders = apps[0]!.renders;
    const b = new HomeStage(host, req(), { art, shared, content, frames: noFrames, dpr: 2, quietMs: 0, keepLease });
    expect(await b.ready).toBe(true);
    expect(apps).toHaveLength(1);
    expect(apps[0]!.renders - renders).toBeLessThanOrEqual(2);
    // leaving for a match: nothing is kept, and what was kept goes
    b.destroy({ now: true });
    expect(kept.at(-1)).toBeNull();
    expect(nows.at(-1)).toBe(true);
    expect(art.leases[1]!.released).toBe(1);
  });

  it("sizes the canvas from the host's layout box, not its transformed rect (the island's entrance scales it)", async () => {
    const scaled = { getBoundingClientRect: () => ({ width: 322, height: 182 }), clientWidth: 343, clientHeight: 194 } as unknown as HTMLElement;
    const art = new IslandArt();
    const sizes: [number, number][] = [];
    const shared = new SharedApp(async () => ({ ...fakeApp(), resize: (w: number, h: number) => void sizes.push([w, h]) }), 1000);
    const s = new HomeStage(scaled, req(), { art, shared, content, frames: noFrames, dpr: 2, quietMs: 0 });
    await s.ready;
    expect(sizes.at(-1)).toEqual([343, 194]);
    s.destroy();
  });

  it('a start that throws leaves the still island: ready resolves false and nothing is held (N9)', async () => {
    const art = new IslandArt();
    art.createBaseDressing = () => {
      throw new Error('no dressing');
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { stage, shared } = setup({ art });
    expect(await stage.ready).toBe(false);
    expect(art.leases.every((l) => l.released === 1)).toBe(true);
    expect(shared.owner()).toBeNull();
    warn.mockRestore();
  });
});
