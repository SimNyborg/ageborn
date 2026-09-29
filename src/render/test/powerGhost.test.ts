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
function config(home = 'arrow_storm'): MatchConfig {
  const c = fakeMatchConfig();
  const sides = structuredClone(c.sides) as [MatchConfig['sides'][0], MatchConfig['sides'][1]];
  const stone = sides[0].loadouts['stone'];
  if (!stone) throw new Error('no stone loadout');
  stone.powers = { home, field: null };
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

  it('tap-to-aim starts the ghost over the enemy front, clamped into the reach band', () => {
    const { view } = setup();
    // Enemy front at p 700; 35% of the 450 lu zone beyond it is 858, but a Home power's centre stays at
    // or below the Home line minus half its zone: 1,000 − 225 = 775 (A2.9.4).
    expect(view.powerAimStart()).toBe(775);
    expect(view.previewedP()).toBe(775);
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
    // The single power button drives the Home slot (A2.9.13); put Stampede there to test the path.
    const sim = new FakeSim({ events, config: config('stampede') });
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

describe('reach band, pips and the committed cast (A2.9.10 targeting)', () => {
  it('shows the Home band up to the Home line, on the lane and the minimap, and numbers the eligible enemy', () => {
    const { view } = setup();
    view.powerAimStart('home');
    view.previewPower(700, true, { slot: 'home', bandLabel: 'Your half' });
    view.render(0, 16);
    // The minimap tints your half (world x 0 to the Home line, side 0).
    expect(view.minimap().reach).toEqual({ from: 0, to: 1000, side: 0, invalid: false });
    // One enemy stands in the reach area (p 700; the other is at p 1,500, past the line): pip 1, covered.
    expect(view.powerGhostInfo()).toEqual({ covered: 1, eligible: 1, locked: null, valid: true });
    // Out of reach: red and hatched; the minimap edge turns red.
    view.previewPower(1300, false, { slot: 'home', invalid: 'reach', invalidLabel: 'Only in your half' });
    view.render(0, 16);
    expect(view.minimap().reach?.invalid).toBe(true);
    expect(view.powerGhost()).toMatchObject({ valid: false });
  });

  it('a committed cast contracts the ghost and clears the band', () => {
    const { view } = setup();
    view.powerAimStart('home');
    view.previewPower(700, true, { slot: 'home' });
    view.render(0, 16);
    view.powerCommit();
    view.previewPower(null);
    view.render(0, 16);
    expect(view.powerGhost()).toBeNull();
    expect(view.minimap().reach).toBeNull();
  });
});

describe('ZoneOverlay reach and pips', () => {
  it('draws pips only while the ghost is valid and forgets them when hidden', () => {
    const z = new ZoneOverlay();
    z.setBand({ gateX: 0, edgeX: 1000, farX: 2000, dir: 1, color: 0x2f7df6, label: 'Your half' });
    z.showPreview(600, 450, 0x2f7df6, { style: 'sweep' });
    z.setPips([{ x: 620, y: 0, size: 24, n: 1, covered: true }]);
    z.update(16, 0.5, 16);
    expect(z.pipCount).toBe(1);
    expect(z.bandShown?.edgeX).toBe(1000);
    z.showPreview(1300, 450, 0x2f7df6, { valid: false, outOfReach: true, invalidLabel: 'Only in your half' });
    z.update(16, 0.5, 16);
    expect(z.pipCount).toBe(0);
    expect(z.outOfReach).toBe(true);
    z.hidePreview();
    expect(z.bandShown).toBeNull();
  });
});
