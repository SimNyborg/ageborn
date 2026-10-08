/**
 * The card detail showcase stage (owner request 2026-10-07) on the fake art provider: it leases the
 * card's sheets lazily and goes live only once they load, frees everything on destroy, loops the
 * card's moves through the battle's event mapper, idles under Reduce motion until tapped, and plays its
 * sounds on the first loop and after a tap only.
 */
import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { content } from '@/content';
import { FakeArtProvider } from '@/contracts/fakes/art';
import type { ShowcaseMove, ShowcaseRequest, VisualId } from '@/contracts';
import { autoLoop, DUMMY, HERO } from '../showcase/script';
import { ShowcaseStage, type StageApp } from '../showcase/stage';

interface Lease {
  visuals: readonly { visualId: VisualId; skin?: string | null }[];
  resolve: () => void;
  released: number;
}

/** The fake provider plus the `showcaseLease` extra the real one has. */
class LeaseArt extends FakeArtProvider {
  readonly leases: Lease[] = [];
  /** Resolve every lease at once (the default) or leave them pending for the test to resolve. */
  constructor(private readonly auto = true) {
    super();
  }
  showcaseLease(o: { visuals: readonly { visualId: VisualId; skin?: string | null }[]; hd?: boolean }): { ready: Promise<void>; hd: boolean; release(): void } {
    let resolve: () => void = () => {};
    const ready = new Promise<void>((r) => (resolve = r));
    const l: Lease = { visuals: o.visuals, resolve, released: 0 };
    this.leases.push(l);
    if (this.auto) resolve();
    return { ready, hd: false, release: () => (l.released += 1) };
  }
}

function fakeApp(): StageApp & { destroyed: boolean; renders: number } {
  const app = {
    stage: new Container(),
    destroyed: false,
    renders: 0,
    render: () => (app.renders += 1),
    resize: () => {},
    destroy: () => (app.destroyed = true),
  };
  return app;
}

const host = { getBoundingClientRect: () => ({ width: 300, height: 264 }), clientWidth: 300, clientHeight: 264 } as unknown as HTMLElement;
const noFrames = { request: () => 1, cancel: () => {} };

function req(card: string, o: Partial<ShowcaseRequest> = {}): ShowcaseRequest {
  return { card, skin: null, level: 5, silhouette: false, teamPreset: 'default', reduceMotion: false, lite: false, content, frame: { groundY: 0.72, coverRight: 0.35, coverTop: 0.4 }, ...o };
}

function stageFor(card: string, o: Partial<ShowcaseRequest> = {}, art = new LeaseArt(), app = fakeApp()) {
  const created: StageApp[] = [];
  const stage = new ShowcaseStage(host, req(card, o), {
    art,
    createApp: async () => {
      created.push(app);
      return app;
    },
    frames: noFrames,
    loadTimeoutMs: 60,
  });
  return { stage, art, app, created };
}

/** Steps `ms` of stage time in 16 ms frames; returns the moves seen, in order. */
function run(stage: ShowcaseStage, ms: number): ShowcaseMove[] {
  const seen: ShowcaseMove[] = [];
  for (let t = 0; t < ms; t += 16) {
    stage.step(16);
    const m = stage.state().move;
    if (seen.at(-1) !== m) seen.push(m);
  }
  return seen;
}

afterEach(() => vi.useRealTimers());

describe('lazy load and unload', () => {
  it('leases the sheets first, goes live once they load, and frees everything on destroy', async () => {
    const art = new LeaseArt(false);
    const { stage, app, created } = stageFor('bonker', {}, art);
    await Promise.resolve();
    expect(art.leases).toHaveLength(1);
    const ids = art.leases[0]!.visuals.map((v) => v.visualId);
    expect(ids).toContain(content.units['bonker']!.visualId);
    expect(ids).toContain(content.units['training_dummy']!.visualId);
    // nothing draws while the sheets load: the UI keeps its still
    expect(stage.state().live).toBe(false);
    expect(created).toHaveLength(0);
    art.leases[0]!.resolve();
    expect(await stage.ready).toBe(true);
    expect(stage.state().live).toBe(true);
    expect(app.renders).toBeGreaterThan(0);
    stage.destroy();
    expect(app.destroyed).toBe(true);
    expect(art.leases[0]!.released).toBe(1);
    // idempotent
    stage.destroy();
    expect(art.leases[0]!.released).toBe(1);
  });

  it('destroyed while loading, it never draws and still gives the sheets back', async () => {
    const art = new LeaseArt(false);
    const { stage, created } = stageFor('bonker', {}, art);
    await Promise.resolve();
    stage.destroy();
    art.leases[0]!.resolve();
    expect(await stage.ready).toBe(false);
    await Promise.resolve();
    expect(created).toHaveLength(0);
    expect(art.leases[0]!.released).toBe(1);
  });

  it('gives up after the load timeout, so a stalled download only ever leaves the still', async () => {
    const art = new LeaseArt(false);
    const { stage, created } = stageFor('bonker', {}, art);
    expect(await stage.ready).toBe(false);
    expect(created).toHaveLength(0);
    expect(art.leases[0]!.released).toBe(1);
  });

  it('a skin picked on the page re-leases the sheet with the skin and re-dresses the hero', async () => {
    const { stage, art } = stageFor('bonker');
    await stage.ready;
    stage.update({ skin: 'pumpkin_head' });
    await new Promise((r) => setTimeout(r, 0));
    expect(art.leases).toHaveLength(2);
    expect(art.leases[1]!.visuals.find((v) => v.visualId === content.units['bonker']!.visualId)?.skin).toBe('pumpkin_head');
    // the old lease goes once the new one holds the sheet
    expect(art.leases[0]!.released).toBe(1);
    const skinned = art.calls.filter((c) => c.method === 'createUnit' && (c.args[0] as { skin?: string }).skin === 'pumpkin_head');
    expect(skinned.length).toBeGreaterThan(0);
    stage.destroy();
    expect(art.leases[1]!.released).toBe(1);
  });
});

describe('the show', () => {
  it("loops the card's moves in order, starting with the arrival", async () => {
    const { stage } = stageFor('bonker');
    await stage.ready;
    const p = stage.debug().plan!;
    const seen = run(stage, 20_000);
    const loop = autoLoop(p);
    // idle → attack → hit → ko → walk → idle ...
    expect(seen.slice(0, loop.length + 1)).toEqual([...loop, loop[0]]);
    stage.destroy();
  });

  it('turns the beats into the battle feel: the hero swings, the dummy is hit and later the hero falls', async () => {
    const { stage, art } = stageFor('bonker');
    await stage.ready;
    stage.play('attack');
    const views = art.calls.filter((c) => c.method === 'createUnit');
    expect(views.length).toBeGreaterThanOrEqual(2);
    run(stage, 450);
    // the hit spawns the battle's impact effect through the event mapper
    expect(art.calls.some((c) => c.method === 'createEffect')).toBe(true);
    stage.play('ko');
    run(stage, 3000);
    expect(stage.debug().actors).toContain(DUMMY);
    stage.destroy();
  });

  it('Reduce motion idles without walking; one tap plays one move and it idles again', async () => {
    const { stage } = stageFor('bonker', { reduceMotion: true });
    await stage.ready;
    expect(stage.state().auto).toBe(false);
    expect(run(stage, 6000)).toEqual(['idle']);
    stage.play();
    expect(stage.state().move).toBe('attack');
    const after = run(stage, 4000);
    expect(after.at(-1)).toBe('idle');
    expect(after).not.toContain('walk');
    expect(stage.state().auto).toBe(false);
    stage.destroy();
  });

  it('a tap pauses the loop on the next move; play resumes it', async () => {
    const { stage } = stageFor('bonker');
    await stage.ready;
    stage.play();
    expect(stage.state()).toMatchObject({ move: 'attack', auto: false });
    run(stage, 3000);
    expect(stage.state().move).toBe('idle');
    stage.setAuto(true);
    expect(stage.state().auto).toBe(true);
    expect(run(stage, 6000).length).toBeGreaterThan(1);
    stage.destroy();
  });

  it('sounds play on the first loop and after a tap, not on every loop after', async () => {
    const sound = vi.fn();
    const { stage } = stageFor('bonker', { sound });
    await stage.ready;
    run(stage, 9000);
    const first = sound.mock.calls.length;
    expect(first).toBeGreaterThan(0);
    run(stage, 9000);
    run(stage, 9000);
    const quiet = sound.mock.calls.length;
    run(stage, 9000);
    expect(sound.mock.calls.length).toBe(quiet);
    stage.play('attack');
    run(stage, 1200);
    expect(sound.mock.calls.length).toBeGreaterThan(quiet);
    stage.destroy();
  });

  it('a squad brings every member, a turret its dummy, a power its targets', async () => {
    const wolves = stageFor('hunting_wolves');
    await wolves.stage.ready;
    expect(wolves.stage.debug().actors).toEqual(expect.arrayContaining([HERO, HERO + 1, DUMMY]));
    wolves.stage.destroy();

    const tower = stageFor('archer_tower');
    await tower.stage.ready;
    run(tower.stage, 2600);
    expect(tower.stage.debug().actors).toContain(DUMMY);
    tower.stage.destroy();

    const power = stageFor('meteor_shower');
    await power.stage.ready;
    run(power.stage, 2600);
    expect(power.stage.debug().actors).toEqual(expect.arrayContaining([DUMMY, DUMMY + 1, DUMMY + 2]));
    power.stage.destroy();
  });

  it('a card the content does not know stays a still', async () => {
    const { stage, art } = stageFor('no_such_card');
    expect(await stage.ready).toBe(false);
    expect(art.leases).toHaveLength(0);
  });
});
