/** The battle view's camera wiring (A17.4-A17.7): follow, minimap snapshot, badges, evolve push, culling. */
import type { SimEvent } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FakeSim } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import type { LabelFactory } from '../feel/numbers';

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

function setup(events: Omit<SimEvent, 'tick'>[] & { tick?: number }[], w = 844, h = 390) {
  const sim = new FakeSim({ events: events as SimEvent[] });
  const view = new BattleView({ sim, art: new FakeArtProvider(), audio: new FakeAudio(), labelFactory: labels });
  view.resize(w, h);
  view.setPaused(false);
  const stepTo = (ticks: number): void => {
    for (let i = 0; i < ticks; i++) view.onEvents(sim.step([]));
  };
  const frames = (ms: number): void => {
    for (let t = 0; t < ms; t += 16) view.render(1, 16);
  };
  return { sim, view, stepTo, frames };
}

const spawn = (tick: number, id: number, side: 0 | 1, x: number) => ({ tick, e: 'unitSpawned' as const, id, side, card: 'bonker', x: x * 1000, summoned: false, level: 1 });

describe('battle view camera (A17.4)', () => {
  it('opens on your base and walks out with the fight', () => {
    const s = setup([spawn(1, 1, 0, 900), spawn(1, 2, 1, 1000)]);
    s.frames(16);
    const home = s.view.camera.centerX;
    expect(s.view.camera.viewRange().left).toBeCloseTo(-180, 3);
    s.stepTo(2);
    s.frames(4000);
    // Contact at 900 / 1,000: the focus is their midpoint, framed at 55% of the view.
    const V = s.view.camera.viewLu;
    expect(s.view.camera.centerX).toBeCloseTo(950 - 0.05 * V, 0);
    expect(s.view.camera.centerX).toBeGreaterThan(home);
  });

  it('the minimap snapshot has the world, the camera window, dots, fronts and bases', () => {
    const s = setup([spawn(1, 1, 0, 400), spawn(1, 2, 1, 1600)]);
    s.stepTo(2);
    s.frames(100);
    const m = s.view.minimap();
    expect([m.worldLeft, m.worldRight, m.lane]).toEqual([-180, 2180, 2000]);
    expect(m.units.map((u) => [u.side, Math.round(u.x)])).toEqual([
      [0, 400],
      [1, 1600],
    ]);
    expect(m.fronts).toEqual([400, 1600]);
    expect(m.bases[0].hpBp).toBe(10000);
    expect(m.view.right - m.view.left).toBeCloseTo(s.view.camera.viewLu, 3);
    expect(m.band.h).toBeCloseTo(390 * 0.68);
  });

  it('a hit on your base while it is off-screen shows the base badge for 3 s after the last hit', () => {
    const s = setup([{ tick: 3, e: 'baseDamaged', side: 0, sourceId: 7, damage: 50, hp: 9950, maxHp: 10000 }]);
    s.frames(16);
    s.view.cameraCommand({ t: 'scrub', x: 1800 });
    s.frames(16);
    s.stepTo(3);
    s.frames(100);
    const b = s.view.minimap().badges;
    expect(b.map((x) => [x.kind, x.edge])).toEqual([['base', 'left']]);
    expect(s.view.minimap().bases[0].hitAgoMs).not.toBeNull();
    s.frames(5200);
    expect(s.view.minimap().badges).toEqual([]);
  });

  it('an off-screen power zone shows a power badge with a countdown during the telegraph', () => {
    const s = setup([{ tick: 2, e: 'powerTelegraph', side: 1, power: 'stampede', castId: 3, x: 1700_000, zone: 400_000 }]);
    s.frames(16);
    s.stepTo(2);
    s.frames(100);
    const b = s.view.minimap().badges;
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ kind: 'power', edge: 'right', card: 'stampede' });
    expect(b[0]?.countdown).toBeGreaterThan(0);
    expect(s.view.minimap().zones[0]).toMatchObject({ side: 1, kind: 'telegraph' });
  });

  it('your evolve pushes in only when your base is in view; otherwise the minimap base flashes', () => {
    const s = setup([{ tick: 2, e: 'ascendStart', side: 0, age: 'medieval' }], 1280, 720);
    s.frames(16);
    s.view.cameraCommand({ t: 'scrub', x: 1800 });
    s.frames(16);
    s.stepTo(2);
    s.frames(2500);
    expect(s.view.camera.pushed).toBe(0);
    expect(s.view.minimap().bases[0].evolveAgoMs).not.toBeNull();
  });

  it('culls units more than 150 lu outside the view', () => {
    const s = setup([spawn(1, 1, 0, 100), spawn(1, 2, 1, 1900)]);
    s.stepTo(1);
    s.frames(32);
    const roots = s.view.layers.units.children.filter((c) => c.label !== 'aura');
    const visible = roots.filter((c) => c.visible).length;
    expect(visible).toBe(1);
  });
});
