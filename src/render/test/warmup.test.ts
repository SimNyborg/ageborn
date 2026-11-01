/**
 * The first-contact warm-up (W0 DAMAGE step 1, item 38 Phase A's open hot spot): one-time set-ups that used to land on
 * the battle's first hit and first kill run on quiet frames after the battle starts, drawn invisibly for a frame.
 */
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FakeSim } from '@/contracts/fakes/sim';
import { mulberry32 } from '@/core';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import { FloatingNumbers, type LabelFactory } from '../feel/numbers';
import { defaultFeelConfig } from '../feelConfig';

let made = 0;
const labels: LabelFactory = () => {
  made++;
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

function setup(): { view: BattleView; art: FakeArtProvider } {
  const art = new FakeArtProvider();
  const view = new BattleView({ sim: new FakeSim(), art, audio: new FakeAudio(), labelFactory: labels });
  view.resize(1280, 720);
  return { view, art };
}

const warmFx = (art: FakeArtProvider): string[] => art.calls.filter((c) => c.method === 'createEffect').map((c) => String(c.args[0]));

describe('the first-contact warm-up', () => {
  it('waits for the battle to start, then warms the bars and the first combat effects a few frames in, and ends a frame later', () => {
    const { view, art } = setup();
    const bars = (view as unknown as { bars: { root: { label: string } } }).bars;
    // the opening view (before the battle starts) never warms: the first frame and the VS hand-off stay as they were
    for (let i = 0; i < 30; i++) view.render(1, 16);
    expect(warmFx(art)).toEqual([]);
    view.setPaused(false);
    let warmedAt = -1;
    let barFrame = false;
    for (let i = 0; i < 40; i++) {
      view.render(1, 16);
      const v = view as unknown as { barWarm: boolean; warmup: unknown };
      if (warmedAt < 0 && warmFx(art).length > 0) warmedAt = i;
      if (v.barWarm) barFrame = true;
    }
    expect(warmedAt).toBeGreaterThanOrEqual(10);
    expect(warmFx(art)).toEqual(['fx.contact_spark', 'fx.dust_poof', 'fx.ground_glow']);
    expect(barFrame).toBe(true);
    expect((view as unknown as { warmup: unknown }).warmup).toBeNull();
    expect((view as unknown as { barWarm: boolean }).barWarm).toBe(false);
    void bars;
    view.destroy();
  });

  it('holds while paused and runs once per view', () => {
    const { view, art } = setup();
    view.setPaused(false);
    view.setPaused(true);
    for (let i = 0; i < 40; i++) view.render(1, 16);
    expect(warmFx(art)).toEqual([]);
    view.setPaused(false);
    for (let i = 0; i < 80; i++) view.render(1, 16);
    expect(warmFx(art).length).toBe(3);
    view.destroy();
  });

  it('a view destroyed mid warm-up lets its warm effects go', () => {
    const { view, art } = setup();
    view.setPaused(false);
    const destroyed: string[] = [];
    const orig = art.createEffect.bind(art);
    art.createEffect = (id, o) => {
      const fx = orig(id, o);
      const d = fx.destroy.bind(fx);
      fx.destroy = () => {
        destroyed.push(id);
        d();
      };
      return fx;
    };
    for (let i = 0; i < 40 && warmFx(art).length === 0; i++) view.render(1, 16);
    expect(warmFx(art).length).toBe(3);
    view.destroy();
    expect(destroyed.sort()).toEqual(['fx.contact_spark', 'fx.dust_poof', 'fx.ground_glow']);
  });
});

describe('the warm label (floating numbers)', () => {
  it('draws one label nearly transparent and a speck in size, then hands it to the first real number', () => {
    made = 0;
    const layer = new Container();
    const n = new FloatingNumbers(layer, defaultFeelConfig.tuning, mulberry32(4), labels);
    n.warmLabel({ x: 500, y: 26 });
    n.warmLabel({ x: 500, y: 26 });
    expect(made).toBe(1);
    expect(layer.children.length).toBe(1);
    const node = layer.children[0] as Container;
    expect(node.alpha).toBeLessThan(0.01);
    expect(node.scale.x).toBeLessThan(0.1);
    expect(n.liveCount).toBe(0);
    n.endWarmLabel();
    expect(layer.children.length).toBe(0);
    // the first gold bounty reuses it at full size and alpha
    n.show('gold', 30, { x: 900, y: -70 }, { important: true, scale: 1 });
    n.update(16, 1);
    expect(made).toBe(1);
    expect(layer.children[0]).toBe(node);
    expect(node.alpha).toBe(1);
    expect(node.scale.x).toBeGreaterThan(0.5);
    n.destroy();
  });
});
