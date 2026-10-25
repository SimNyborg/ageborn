/**
 * The Customize diorama (PLAN 2c, Track B) on the fake art provider: it leases its look first and goes
 * live only once that is in (the still stays otherwise), builds one half of the lane (the age's scene
 * under the sky, the base with its skin and dressing, two idle turrets on the first and third mounts),
 * applies changes (a crumble step, a tile tried on, a new sky) without blinking, shares one app (one
 * WebGL context) between the stages of a mount, pauses when hidden and parks on a still frame under
 * Reduce motion.
 */
import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { content } from '@/content';
import { FakeArtProvider } from '@/contracts/fakes/art';
import type { AgeId, BaseDressingView, BaseView, CosmeticKey, DioramaRequest, SideLook, SkinId, TeamPreset, VisualId } from '@/contracts';
import { DRESSING_ANCHORS } from '@/visuals/cosmetics/dressing';
import { DIORAMA_GROUND, DIORAMA_POLE_LU, DIORAMA_SPOTS_LU, DioramaStage, dioramaAnchors, dioramaFraming, dioramaGateX, dioramaMount, dioramaTurrets, resolveDiorama, SharedApp, type DioramaApp } from '../showcase/diorama';
import { WORLD_LEFT_LU } from '../layout';

interface Lease {
  o: { age: AgeId; skin?: SkinId | null; turrets: readonly VisualId[]; scene?: CosmeticKey | null; arena: string };
  resolve: () => void;
  released: number;
}

class FakeDressing implements BaseDressingView {
  readonly root = new Container();
  hits = 0;
  destroyed = false;
  constructor(readonly look: SideLook) {}
  setAge(): void {}
  hit(): void {
    this.hits++;
  }
  collapse(): void {}
  setMotion(): void {}
  update(): void {}
  destroy(): void {
    this.destroyed = true;
  }
}

/** The fake provider plus the `dioramaLease` extra and a dressing, as the real one has them. */
class DioramaArt extends FakeArtProvider {
  readonly leases: Lease[] = [];
  readonly dressings: FakeDressing[] = [];
  constructor(private readonly auto = true) {
    super();
  }
  dioramaLease(o: Lease['o']): { ready: Promise<void>; release(): void } {
    let resolve: () => void = () => {};
    const ready = new Promise<void>((r) => (resolve = r));
    const l: Lease = { o, resolve, released: 0 };
    this.leases.push(l);
    if (this.auto) resolve();
    return { ready, release: () => (l.released += 1) };
  }
  createBaseDressing(o: { age: AgeId; side: 0 | 1; look: SideLook; teamPreset: TeamPreset; base?: BaseView }): BaseDressingView {
    const d = new FakeDressing(o.look);
    o.base?.root.addChild(d.root);
    this.dressings.push(d);
    return d;
  }
}

function fakeApp(): DioramaApp & { destroyed: boolean; renders: number; hosts: HTMLElement[]; size: [number, number] } {
  const app = {
    stage: new Container(),
    destroyed: false,
    renders: 0,
    hosts: [] as HTMLElement[],
    size: [0, 0] as [number, number],
    attach: (h: HTMLElement) => void app.hosts.push(h),
    render: () => void (app.renders += 1),
    resize: (w: number, h: number) => void (app.size = [w, h]),
    destroy: () => void (app.destroyed = true),
  };
  return app;
}

const hostOf = (w = 610, h = 343): HTMLElement => ({ getBoundingClientRect: () => ({ width: w, height: h }), clientWidth: w, clientHeight: h }) as unknown as HTMLElement;

/** Frames driven by the test: `tick` runs what the stage asked for. */
function fakeFrames() {
  let next = 1;
  const pending = new Map<number, (now: number) => void>();
  let now = 0;
  return {
    request: (cb: (now: number) => void) => {
      pending.set(next, cb);
      return next++;
    },
    cancel: (h: number) => void pending.delete(h),
    get waiting(): number {
      return pending.size;
    },
    tick(ms = 16): void {
      now += ms;
      const cbs = [...pending.values()];
      pending.clear();
      for (const cb of cbs) cb(now);
    },
  };
}

const look: SideLook = { baseFlag: 'baseFlag.wyvern', nationalFlag: null, baseSkins: { medieval: 'baseSkin.rose_keep' }, decorations: [null, null, null], backdrop: 'backdrop.golden_dusk', scenes: {} };

function req(o: Partial<DioramaRequest> = {}): DioramaRequest {
  return { age: 'medieval', side: 0, look, crumble: 0, teamPreset: 'default', reduceMotion: false, lite: false, ...o };
}

function setup(o: { art?: DioramaArt; app?: ReturnType<typeof fakeApp> | null; frames?: ReturnType<typeof fakeFrames>; lingerMs?: number } = {}) {
  const art = o.art ?? new DioramaArt();
  const app = o.app === undefined ? fakeApp() : o.app;
  const frames = o.frames ?? fakeFrames();
  let made = 0;
  const shared = new SharedApp(async () => {
    made += 1;
    return app;
  }, o.lingerMs ?? 50);
  const mount = (host: HTMLElement, r: DioramaRequest) => new DioramaStage(host, r, { art, content, shared, frames, loadTimeoutMs: 60 });
  return { art, app, frames, shared, mount, made: () => made };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

afterEach(() => vi.useRealTimers());

describe('framing and picks', () => {
  it('stands the base in the left third with the ground where the still has it, inside the world', () => {
    const f = dioramaFraming(610, 343);
    expect(f.y).toBeCloseTo(343 * 0.83, 5);
    expect(f.left).toBe(WORLD_LEFT_LU);
    // the base (330 lu) and its flags fit under the top edge, and some lane shows beside it
    expect(f.y - 330 * f.scale).toBeGreaterThan(20);
    expect(f.viewLu).toBeGreaterThanOrEqual(520);
    const gate = (dioramaGateX(0) - f.left) / f.viewLu;
    expect(gate).toBeGreaterThan(0.2);
    expect(gate).toBeLessThan(0.4);
    // a narrow stage zooms out rather than cropping the lane to the base
    expect(dioramaFraming(300, 340).viewLu).toBeGreaterThanOrEqual(520);
  });

  it('picks two released turrets of the age, its starters first', () => {
    for (const age of content.order.ages) {
      const ids = dioramaTurrets(content, age);
      expect(ids.length).toBe(2);
      const defs = Object.values(content.turrets).filter((t) => ids.includes(t.visualId));
      expect(defs.every((t) => t.age === age && t.released !== false)).toBe(true);
      if (Object.values(content.turrets).filter((t) => t.age === age && t.starter && t.released !== false).length >= 2) expect(defs.every((t) => t.starter)).toBe(true);
    }
    expect(dioramaTurrets(undefined, 'stone')).toEqual([]);
  });

  it('resolves the look: the try-on skin, scene and sky over the equipped ones', () => {
    const l = resolveDiorama(req({ baseSkins: { medieval: 'snowy_keep' }, scene: 'scene.misty_moor', sky: null }), content);
    expect(l.skin).toBe('snowy_keep');
    expect(l.dressing.baseSkins?.medieval).toBe('baseSkin.snowy_keep');
    expect(l.scene).toBe('scene.misty_moor');
    expect(l.sky).toBeNull();
    // absent fields keep the look's
    const d = resolveDiorama(req(), content);
    expect(d.skin).toBe('rose_keep');
    expect(d.sky).toBe('backdrop.golden_dusk');
    expect(d.scene).toBeNull();
    // the standard base tried on drops the age's skin key from the dressing
    const s = resolveDiorama(req({ baseSkins: {} }), content);
    expect(s.skin).toBeNull();
    expect(s.dressing.baseSkins?.medieval).toBeUndefined();
  });
});

describe('lazy start', () => {
  it('leases its look first, goes live once it is in, and frees everything on destroy', async () => {
    const t = setup({ art: new DioramaArt(false) });
    const stage = t.mount(hostOf(), req());
    await flush();
    expect(t.art.leases).toHaveLength(1);
    const l = t.art.leases[0]!;
    expect(l.o).toMatchObject({ age: 'medieval', skin: 'rose_keep', scene: null, arena: DIORAMA_GROUND.medieval });
    expect(l.o.turrets).toEqual(dioramaTurrets(content, 'medieval'));
    // nothing is built while the files load: the UI keeps its still
    expect(t.art.calls.filter((c) => c.method === 'createBase')).toHaveLength(0);
    expect(stage.debug().live).toBe(false);
    l.resolve();
    expect(await stage.ready).toBe(true);
    const calls = (m: string) => t.art.calls.filter((c) => c.method === m).map((c) => c.args[0] as Record<string, unknown>);
    expect(calls('createBackdrop')).toEqual([{ left: 'medieval', right: 'medieval', arena: 'kingsmoat', skins: { left: 'backdrop.golden_dusk', right: 'backdrop.golden_dusk' }, scenes: { left: {}, right: {} } }]);
    expect(calls('createBase')[0]).toMatchObject({ age: 'medieval', skins: { medieval: 'rose_keep' }, side: 0 });
    expect(calls('createTurret').map((o) => o['visualId'])).toEqual(dioramaTurrets(content, 'medieval'));
    expect(t.art.dressings).toHaveLength(1);
    expect(t.app!.renders).toBeGreaterThan(0);
    expect(t.app!.hosts).toHaveLength(1);
    expect(stage.debug()).toMatchObject({ live: true, owner: true, turrets: 2 });
    stage.destroy();
    expect(l.released).toBe(1);
    expect(t.art.dressings[0]!.destroyed).toBe(true);
    // idempotent
    stage.destroy();
    expect(l.released).toBe(1);
  });

  it('keeps the still without WebGL, after a stalled download, or when destroyed while loading', async () => {
    const none = setup({ app: null });
    expect(await none.mount(hostOf(), req()).ready).toBe(false);
    expect(none.art.leases[0]!.released).toBe(1);

    const slow = setup({ art: new DioramaArt(false) });
    expect(await slow.mount(hostOf(), req()).ready).toBe(false);
    expect(slow.art.calls.some((c) => c.method === 'createBase')).toBe(false);

    const gone = setup({ art: new DioramaArt(false) });
    const s = gone.mount(hostOf(), req());
    await flush();
    s.destroy();
    gone.art.leases[0]!.resolve();
    expect(await s.ready).toBe(false);
    await flush();
    expect(gone.art.calls.some((c) => c.method === 'createBase')).toBe(false);
    expect(gone.art.leases[0]!.released).toBe(1);
  });

  it('a change made while the first look loads is applied once it is live', async () => {
    const t = setup({ art: new DioramaArt(false) });
    const stage = t.mount(hostOf(), req());
    await flush();
    stage.update({ baseSkins: { medieval: 'snowy_keep' } });
    t.art.leases[0]!.resolve();
    expect(await stage.ready).toBe(true);
    await flush();
    expect(t.art.leases).toHaveLength(2);
    expect(t.art.leases[1]!.o.skin).toBe('snowy_keep');
  });
});

describe('changes', () => {
  it('steps the crumble in place: the base takes a hit, the turrets stay on their mounts', async () => {
    const t = setup();
    const stage = t.mount(hostOf(), req());
    expect(await stage.ready).toBe(true);
    const base = t.art.calls.filter((c) => c.method === 'createBase');
    stage.update({ crumble: 2 });
    await flush();
    // no rebuild, no new lease
    expect(t.art.calls.filter((c) => c.method === 'createBase')).toEqual(base);
    expect(t.art.leases).toHaveLength(1);
    const view = (stage as unknown as { base: { crumble: number; hits: number } }).base;
    expect(view.crumble).toBe(2);
    expect(view.hits).toBe(1);
    expect(t.art.dressings[0]!.hits).toBe(1);
    // back to whole: no hit
    stage.update({ crumble: 0 });
    await flush();
    expect(view.crumble).toBe(0);
    expect(view.hits).toBe(1);
  });

  it('a skin tried on leases its model, then swaps the base, its dressing and turrets in with a pop', async () => {
    const t = setup();
    const stage = t.mount(hostOf(), req());
    expect(await stage.ready).toBe(true);
    stage.update({ baseSkins: { medieval: 'snowy_keep' } });
    await flush();
    expect(t.art.leases).toHaveLength(2);
    expect(t.art.leases[0]!.released).toBe(1);
    const bases = t.art.calls.filter((c) => c.method === 'createBase').map((c) => (c.args[0] as { skins: unknown }).skins);
    expect(bases).toEqual([{ medieval: 'rose_keep' }, { medieval: 'snowy_keep' }]);
    expect(t.art.dressings[0]!.destroyed).toBe(true);
    expect(t.art.dressings[1]!.look.baseSkins?.medieval).toBe('baseSkin.snowy_keep');
    // the backdrop did not change
    expect(t.art.calls.filter((c) => c.method === 'createBackdrop')).toHaveLength(1);
    const s = (stage as unknown as { structures: Container }).structures;
    stage.step(80);
    expect(s.scale.y).not.toBe(1);
    for (let i = 0; i < 30; i++) stage.step(16);
    expect(s.scale.y).toBe(1);
  });

  it('a new sky cross-fades the scene; under Reduce motion it swaps at once', async () => {
    const t = setup();
    const stage = t.mount(hostOf(), req());
    expect(await stage.ready).toBe(true);
    stage.update({ sky: 'backdrop.starry_night' });
    await flush();
    expect(t.art.calls.filter((c) => c.method === 'createBackdrop')).toHaveLength(2);
    expect(stage.debug().fading).toBe(true);
    for (let i = 0; i < 30; i++) stage.step(16);
    expect(stage.debug().fading).toBe(false);
    stage.update({ reduceMotion: true, sky: null });
    await flush();
    expect(t.art.calls.filter((c) => c.method === 'createBackdrop')).toHaveLength(3);
    expect(stage.debug().fading).toBe(false);
  });
});

describe('one app, paused and parked', () => {
  it('stages of one mount share one app; the newest draws, the older takes it back, and the app goes after the last', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const t = setup({ lingerMs: 1000 });
    const a = t.mount(hostOf(), req());
    await vi.runAllTimersAsync();
    expect(await a.ready).toBe(true);
    const hostB = hostOf(400, 260);
    const b = t.mount(hostB, req({ age: 'stone' }));
    await vi.runAllTimersAsync();
    expect(await b.ready).toBe(true);
    expect(t.made()).toBe(1);
    expect(a.debug().owner).toBe(false);
    expect(b.debug().owner).toBe(true);
    expect(t.app!.hosts.at(-1)).toBe(hostB);
    b.destroy();
    expect(a.debug().owner).toBe(true);
    expect(t.app!.hosts.length).toBe(3);
    a.destroy();
    expect(t.app!.destroyed).toBe(false);
    // a tab switch inside the linger re-uses the app
    const c = t.mount(hostOf(), req());
    await vi.advanceTimersByTimeAsync(10);
    expect(await c.ready).toBe(true);
    expect(t.made()).toBe(1);
    c.destroy();
    await vi.advanceTimersByTimeAsync(1100);
    expect(t.app!.destroyed).toBe(true);
    expect(t.shared.alive).toBe(false);
  });

  it('draws no frames while hidden, and parks on a still frame under Reduce motion', async () => {
    const t = setup();
    const stage = t.mount(hostOf(), req());
    expect(await stage.ready).toBe(true);
    expect(t.frames.waiting).toBe(1);
    stage.setVisible(false);
    expect(t.frames.waiting).toBe(0);
    stage.setVisible(true);
    expect(t.frames.waiting).toBe(1);
    stage.update({ reduceMotion: true });
    await flush();
    for (let i = 0; i < 80 && t.frames.waiting > 0; i++) t.frames.tick(16);
    expect(t.frames.waiting).toBe(0);
    expect(stage.debug().running).toBe(false);
    // a change wakes it for a moment, then it parks again
    const renders = t.app!.renders;
    stage.update({ crumble: 1 });
    await flush();
    expect(t.app!.renders).toBeGreaterThan(renders);
    for (let i = 0; i < 80 && t.frames.waiting > 0; i++) t.frames.tick(16);
    expect(t.frames.waiting).toBe(0);
  });

  it('the factory returns a mount without content too (no turrets)', async () => {
    const art = new DioramaArt();
    const mount = dioramaMount(art, { createApp: async () => fakeApp(), frames: fakeFrames(), lingerMs: 10 });
    expect(mount).not.toBeNull();
    const h = mount!(hostOf(), req());
    expect(await h.ready).toBe(true);
    expect(art.calls.filter((c) => c.method === 'createTurret')).toHaveLength(0);
    h.destroy();
  });
});

describe('anchors for the tap targets over the stage (round 3)', () => {
  /** Stage px of a world point (x lu, y lu above the ground) under `dioramaFraming`. */
  const toPx = (w: number, h: number, side: 0 | 1, xLu: number, yLu = 0): [number, number] => {
    const f = dioramaFraming(w, h, side);
    return [f.x + xLu * f.scale, f.y - yLu * f.scale];
  };

  it('match the lane dressing\'s anchors', () => {
    expect([...DIORAMA_SPOTS_LU]).toEqual([...DRESSING_ANCHORS.decorations]);
    expect(DIORAMA_POLE_LU).toBe(DRESSING_ANCHORS.pole);
  });

  it('gives the three spots in anchor order, then the pole, centred on their anchors and standing on the ground', () => {
    for (const [w, h] of [
      [610, 343],
      [244, 166],
      [380, 214],
    ] as const) {
      for (const side of [0, 1] as const) {
        const list = dioramaAnchors(w, h, side);
        expect(list).toHaveLength(4);
        const gate = dioramaGateX(side);
        const facing = side === 1 ? -1 : 1;
        const ground = toPx(w, h, side, gate)[1];
        DIORAMA_SPOTS_LU.forEach((a, i) => {
          const b = list[i]!;
          const [cx] = toPx(w, h, side, gate + a * facing);
          expect(b.x + b.w / 2, `${w}x${h} side ${side} spot ${i}`).toBeCloseTo(cx, 0);
          expect(b.y + b.h).toBeCloseTo(ground, 0);
          // a prop's size: about 55 lu tall, some 50 lu wide
          const f = dioramaFraming(w, h, side);
          expect(b.h / f.scale).toBeGreaterThan(55);
          expect(b.w / f.scale).toBeGreaterThan(40);
          // inside the stage
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(w);
          expect(b.y).toBeGreaterThanOrEqual(0);
        });
        // the pole: its x inside the box, the box up to the cap (176 lu) and toward +x, where its flags fly
        const p = list[3]!;
        const [px] = toPx(w, h, side, gate + DIORAMA_POLE_LU * facing);
        expect(p.x).toBeLessThan(px);
        expect(p.x + p.w).toBeGreaterThan(px + 40 * dioramaFraming(w, h, side).scale);
        expect(p.y).toBeLessThan(toPx(w, h, side, gate, 176)[1]);
        expect(p.y + p.h).toBeCloseTo(ground, 0);
      }
    }
    // side 1 mirrors the spots: the first stands furthest from the lane on either side
    const l0 = dioramaAnchors(610, 343, 0);
    const l1 = dioramaAnchors(610, 343, 1);
    expect(l0[0]!.x).toBeLessThan(l0[2]!.x);
    expect(l1[0]!.x).toBeGreaterThan(l1[2]!.x);
  });

  it('the handle reports them in host px from the mount on, and calls back when the stage resizes', async () => {
    let fire: (() => void) | null = null;
    const RO = vi.fn(function (this: unknown, cb: () => void) {
      fire = cb;
      return { observe: () => {}, disconnect: () => {} };
    });
    vi.stubGlobal('ResizeObserver', RO);
    try {
      const t = setup();
      const host = { getBoundingClientRect: () => ({ width: 610, height: 343 }), clientWidth: 610, clientHeight: 343 };
      const stage = t.mount(host as unknown as HTMLElement, req());
      // valid before the stage is live (the UI can lay its targets out under the still)
      expect(stage.anchorsPx()).toEqual(dioramaAnchors(610, 343, 0));
      const seen: number[] = [];
      const off = stage.onAnchorsChange(() => seen.push(stage.anchorsPx()[0]!.w));
      expect(await stage.ready).toBe(true);
      // going live tells once
      expect(seen.length).toBe(1);
      host.clientWidth = 380;
      host.clientHeight = 214;
      fire!();
      expect(stage.anchorsPx()).toEqual(dioramaAnchors(380, 214, 0));
      expect(seen.length).toBe(2);
      expect(seen[1]).toBeLessThan(seen[0]!);
      expect(t.app!.size).toEqual([380, 214]);
      // the same size again: no call
      fire!();
      expect(seen.length).toBe(2);
      off();
      host.clientWidth = 600;
      fire!();
      expect(seen.length).toBe(2);
      // side 1 reports the mirrored spots
      const s1 = t.mount(hostOf(), req({ side: 1 }));
      expect(s1.anchorsPx()).toEqual(dioramaAnchors(610, 343, 1));
      s1.destroy();
      stage.destroy();
      expect(stage.onAnchorsChange(() => {})).toBeTypeOf('function');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
