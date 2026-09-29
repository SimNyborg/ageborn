import type { MatchConfig, SimEvent } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FakeSim, fakeMatchConfig } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import type { LabelFactory } from '../feel/numbers';
import { ZoneOverlay, ghostStyle, inZone } from '../powerTargeting';

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

/** Side 0 carries Arrow Storm (an aimable barrage, zone 450 lu) in the Stone Age. */
function config(): MatchConfig {
  const c = fakeMatchConfig();
  const sides = structuredClone(c.sides) as [MatchConfig['sides'][0], MatchConfig['sides'][1]];
  const stone = sides[0].loadouts['stone'];
  if (!stone) throw new Error('no stone loadout');
  stone.powers = { home: 'arrow_storm', field: null };
  return { ...c, sides };
}

const events: SimEvent[] = [
  { tick: 1, e: 'unitSpawned', id: 1, side: 0, card: 'bonker', x: 540_000, summoned: false, level: 1 },
  { tick: 1, e: 'unitSpawned', id: 2, side: 1, card: 'pebbler', x: 700_000, summoned: false, level: 1 },
  { tick: 1, e: 'unitSpawned', id: 3, side: 1, card: 'pebbler', x: 1_500_000, summoned: false, level: 1 },
];

function setup() {
  const cfg = config();
  const sim = new FakeSim({ events, config: cfg });
  const view = new BattleView({ sim, art: new FakeArtProvider(), audio: new FakeAudio(), labelFactory: labels });
  view.resize(1280, 720);
  view.onEvents(sim.step([]));
  view.render(0, 16);
  return { sim, view };
}

describe('Age Power drag ghost (owner decision "Age Power targeting")', () => {
  it('shows a world-scale ghost and highlights the enemy units it would hit', () => {
    const { view } = setup();
    expect(view.powerAimable()).toBe(true);
    view.previewPower(700);
    view.render(0, 16);
    expect(view.powerGhost()).toEqual({ x: 700, width: 450, valid: true, targets: 1 });
    // Over the HUD the ghost stays but turns invalid, and highlights nothing.
    view.previewPower(700, false);
    view.render(0, 16);
    expect(view.powerGhost()).toMatchObject({ valid: false, targets: 0 });
    view.previewPower(null);
    expect(view.powerGhost()).toBeNull();
  });

  it('tap-to-aim starts the ghost over the enemy front, reaching into their group', () => {
    const { view } = setup();
    // Enemy front at p 700; 35% of the 450 lu zone beyond it.
    expect(view.powerAimStart()).toBe(858);
    expect(view.previewedP()).toBe(858);
    view.cameraHold('powerDrag', false);
    expect(view.previewedP()).toBeNull();
  });

  it('shows the ghost on the minimap while it is out', () => {
    const { view } = setup();
    view.powerAimStart();
    view.previewPower(900);
    expect(view.minimap().zones).toContainEqual({ x: 900, width: 450, side: 0, kind: 'preview' });
  });
});

describe('Age Power ghost for a power that picks its own spot', () => {
  it('Stampede shows the run from your front wherever the pointer is', () => {
    const sim = new FakeSim({ events });
    const view = new BattleView({ sim, art: new FakeArtProvider(), audio: new FakeAudio(), labelFactory: labels });
    view.resize(1280, 720);
    view.onEvents(sim.step([]));
    view.render(0, 16);
    expect(view.powerAimable()).toBe(false);
    // Front bonker at x 540; the fake Stampede runs 500 lu, so the ghost covers 540-1,040.
    view.previewPower(1234);
    view.render(0, 16);
    expect(view.powerGhost()).toEqual({ x: 790, width: 500, valid: true, targets: 1 });
    expect(view.powerAimStart()).toBe(790);
  });
});

describe('ZoneOverlay ghost', () => {
  it('pops in, keeps its style and reports targets only while valid', () => {
    const z = new ZoneOverlay();
    z.showPreview(500, 400, 0x2f7df6, { style: 'barrage', dir: 1 });
    z.setTargets([{ x: 520, y: 0, size: 30 }]);
    z.update(16, 0.5, 16);
    expect(z.preview).toEqual({ x: 500, width: 400, valid: true, targets: 1 });
    z.showPreview(500, 400, 0x2f7df6, { valid: false });
    z.update(16, 0.5, 16);
    expect(z.preview).toMatchObject({ valid: false, targets: 0 });
    z.hidePreview();
    expect(z.previewing).toBe(false);
  });

  it('classifies units in the zone and power motifs', () => {
    expect(inZone(725, 20, 500, 450)).toBe(true);
    expect(inZone(740, 20, 500, 450)).toBe(false);
    expect(ghostStyle(undefined)).toBe('plain');
  });
});
