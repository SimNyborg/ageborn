/**
 * ANIM_SPEC R1, R3, R4, R7 in the battle view: walk and idle from the measured sim velocity with
 * hysteresis, the velocity passed to views that can use it, second attackers routed away from the
 * body clip, projectiles from the playing variant's muzzle, and one seed per unit.
 */
import type { SimEvent } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FakeSim } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import type { LabelFactory } from '../feel/numbers';
import { GAIT_TUNING, newGait, stepGait, tickVelocity, walkDurationForSpeed } from '../gait';
import { MILLI_LU } from '../layout';

describe('gait hysteresis (R1)', () => {
  it('measures the velocity toward the enemy from one tick', () => {
    expect(tickVelocity(104_375, 100_000, 1, MILLI_LU)).toBeCloseTo(87.5);
    expect(tickVelocity(95_625, 100_000, -1, MILLI_LU)).toBeCloseTo(87.5);
    expect(tickVelocity(104_375, 100_000, -1, MILLI_LU)).toBeCloseTo(-87.5);
  });

  const run = (s: ReturnType<typeof newGait>, v: number, ms: number): void => {
    for (let t = 0; t < ms; t += 10) stepGait(s, v, 87.5, 10);
  };

  it('walks once the speed holds, idles once it stays low, and ignores one-tick stutters', () => {
    const s = newGait();
    run(s, 87.5, 140);
    expect(s.walking).toBe(false);
    run(s, 87.5, 60);
    expect(s.walking).toBe(true);
    // a 50 ms stall (one tick) does not flip it
    run(s, 0, 50);
    expect(s.walking).toBe(true);
    run(s, 87.5, 100);
    run(s, 0, 250);
    expect(s.walking).toBe(true);
    run(s, 0, 150);
    expect(s.walking).toBe(false);
    expect(GAIT_TUNING.idleShare).toBeLessThan(GAIT_TUNING.walkOnShare);
  });

  it('walks backward with a negative velocity (the Hold walk-back and Fall back)', () => {
    const s = newGait();
    run(s, -87.5, 400);
    expect(s.walking).toBe(true);
    expect(s.v).toBeLessThan(-80);
  });

  it('sizes procedural walks by the measured speed', () => {
    expect(walkDurationForSpeed(80)).toBe(500);
    expect(walkDurationForSpeed(-160)).toBe(250);
    expect(walkDurationForSpeed(1)).toBe(2000);
  });
});

type FakeUnit = ReturnType<FakeArtProvider['createUnit']>;
interface Hooks {
  gaits: number[];
  identity: { id: number; seed: number } | null;
  alts: { impactAtMs?: number }[];
  clips: string[];
}

class HookArt extends FakeArtProvider {
  readonly hooks = new Map<number, Hooks>();
  readonly views: FakeUnit[] = [];
  override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): FakeUnit {
    const v = super.createUnit(o);
    const h: Hooks = { gaits: [], identity: null, alts: [], clips: [] };
    const orig = v.play.bind(v);
    Object.assign(v, {
      setGait: (g: { speedLuPerS: number }) => h.gaits.push(g.speedLuPerS),
      setIdentity: (i: { id: number; seed: number }) => {
        h.identity = i;
        this.hooks.set(i.id, h);
      },
      playAlt: (a: { impactAtMs?: number }) => h.alts.push(a),
      muzzleNow: (i = 0) => (i === 0 ? { x: 33, y: -21 } : null),
      play: (clip: string) => {
        h.clips.push(clip);
        orig(clip);
      },
    });
    this.views.push(v);
    return v;
  }
}

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

function setup() {
  const sim = new FakeSim();
  const art = new HookArt();
  const view = new BattleView({ sim, art, audio: new FakeAudio(), labelFactory: labels });
  view.resize(1280, 720);
  view.onEvents(sim.step([]));
  return { sim, art, view };
}

describe('battle view gait and attack routing (R1, R3, R4, R7)', () => {
  it('gives each unit its id and a seed from the match seed', () => {
    const s = setup();
    const a = s.art.hooks.get(1)?.identity;
    const b = s.art.hooks.get(2)?.identity;
    expect(a?.id).toBe(1);
    expect(b?.id).toBe(2);
    expect(a?.seed).not.toBe(b?.seed);
  });

  it('passes the smoothed sim velocity to the view and walks on the hysteresis', () => {
    const s = setup();
    const u = s.sim.state.units.find((x) => x.id === 1) as { x: number; prevX: number } | undefined;
    if (!u) throw new Error('no unit 1');
    u.prevX = u.x;
    u.x = u.prevX + 4375; // 87.5 lu/s for side 0
    for (let i = 0; i < 40; i++) s.view.render(1, 1000 / 60);
    const h = s.art.hooks.get(1);
    expect(h?.gaits.at(-1)).toBeGreaterThan(80);
    expect(h?.clips).toContain('walk');
  });

  it('never restarts the body clip for a second attacker; index 0 still plays the attack', () => {
    const s = setup();
    for (let i = 0; i < 30; i++) s.view.render(1, 1000 / 60);
    const h = s.art.hooks.get(2);
    if (!h) throw new Error('no hooks');
    h.clips.length = 0;
    s.view.onEvents([{ tick: 5, e: 'attackStarted', id: 2, targetId: 1, windupTicks: 4, attackIndex: 1 } as SimEvent]);
    expect(h.alts).toEqual([{ impactAtMs: 200 }]);
    expect(h.clips).not.toContain('attack');
    s.view.onEvents([{ tick: 6, e: 'attackStarted', id: 2, targetId: 1, windupTicks: 14, attackIndex: 0 } as SimEvent]);
    expect(h.clips).toContain('attack');
  });

  it('starts a projectile at the view muzzle of the playing variant', () => {
    const s = setup();
    s.view.render(1, 16);
    s.view.onEvents([{ tick: 19, e: 'projectileFired', pid: 3, from: 2, targetId: 1, toX: 540_000, travelTicks: 7, visualId: 'proj.rock' } as SimEvent]);
    const proj = s.view.layers.projectiles.children.at(-1);
    // unit 2 stands at 700 lu facing left: the muzzle x is mirrored
    expect(proj?.x).toBeCloseTo(700 - 33, 0);
  });
});
