/**
 * Queue item 44: the battle view aims ranged shooters (views with the duck-typed aim hooks) and flies their shots along
 * the drawn weapon; views without the hooks, melee units and turrets keep working. Presentation only: the shots land on
 * the sim's target at the sim's time.
 */
import type { EffectView, MatchConfig, Pt, SimEvent, SimState, UnitState } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { MAX_LAUNCH_DEG as VIEW_MAX_LAUNCH_DEG } from '@/visuals/effects/flight';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { leanFor, lineDeg, MAX_LAUNCH_DEG, MIN_AIM_DX_LU, pathFor } from '../aim';
import { BattleView } from '../battleView';
import type { LabelFactory } from '../feel/numbers';

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

type FakeUnit = ReturnType<FakeArtProvider['createUnit']>;
interface AimSpy {
  plays: { clip: string; o?: Record<string, unknown> }[];
  leans: number[];
  /** What `aimNow` answers: the muzzle in root space and the drawn weapon (its lean added on top). */
  weapon: { x: number; y: number; deg: number };
  lean: number;
}

interface FlySpy {
  aimed: { from: Pt; to: Pt; ms: number; o: { launchDeg: number; path: string } }[];
  flown: { from: Pt; to: Pt; ms: number; arc: boolean }[];
}

class AimArt extends FakeArtProvider {
  readonly views: (FakeUnit & AimSpy)[] = [];
  readonly shots: (EffectView & FlySpy)[] = [];
  readonly turretViews: ReturnType<FakeArtProvider['createTurret']>[] = [];
  constructor(private readonly hooks = true) {
    super();
  }
  override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): FakeUnit {
    const v = super.createUnit(o) as FakeUnit & AimSpy & Record<string, unknown>;
    Object.assign(v, { plays: [], leans: [], weapon: { x: 20, y: -40, deg: 0 }, lean: 0 });
    const play = v.play.bind(v);
    v.play = (clip: string, opts?: Record<string, unknown>) => {
      v.plays.push({ clip, ...(opts ? { o: opts } : {}) });
      play(clip);
    };
    if (this.hooks) {
      v['aimInfo'] = () => ({ variants: [{ anim: 'attack', deg: v.weapon.deg, omni: false }, { anim: 'attack_b', deg: 30, omni: false }], next: 'attack', maxLeanDeg: 14 });
      v['aimLean'] = (deg: number) => {
        v.leans.push(deg);
        v.lean = deg;
      };
      v['aimNow'] = () => ({ x: v.weapon.x, y: v.weapon.y, deg: v.weapon.deg + v.lean, drawnDeg: v.weapon.deg, leanDeg: v.lean, omni: false });
    }
    this.views.push(v);
    return v;
  }
  override createProjectile(visualId: string, side: 0 | 1): EffectView {
    const e = super.createProjectile(visualId, side) as EffectView & FlySpy & Record<string, unknown>;
    Object.assign(e, { aimed: [], flown: [] });
    const fly = e.fly.bind(e);
    e.fly = (from: Pt, to: Pt, ms: number, arc: boolean) => {
      e.flown.push({ from, to, ms, arc });
      fly(from, to, ms, arc);
    };
    e['flyAimed'] = (from: Pt, to: Pt, ms: number, o: { launchDeg: number; path: string }) => {
      e.aimed.push({ from, to, ms, o });
      fly(from, to, ms, false);
    };
    this.shots.push(e);
    return e;
  }
  override createTurret(o: Parameters<FakeArtProvider['createTurret']>[0]) {
    const t = super.createTurret(o) as ReturnType<FakeArtProvider['createTurret']> & Record<string, unknown>;
    // the atlas turret views' live muzzle (10 lu over the mount) and the requested snap, when a test asks for them
    if (this.turretMuzzle) {
      t['muzzlePoint'] = () => ({ x: t.root.x, y: t.root.y - 10 });
      t['snaps'] = 0;
      t['snapAim'] = () => (t['snaps'] = (t['snaps'] as number) + 1);
    }
    this.turretViews.push(t);
    return t;
  }
  turretMuzzle = false;
}

function unitState(id: number, side: 0 | 1, card: string, x: number, o: Partial<UnitState> = {}): UnitState {
  return {
    id, side, card, level: 1, x: x * 1000, prevX: x * 1000, hp: 40_000, maxHp: 40_000, shield: 0, innateShield: 0,
    mode: 'walk', attacks: [{ targetId: -1, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 }], statuses: [],
    air: false, summoned: false, timers: [], lastDamageTick: 0, ...o,
  };
}

function setup(hooks = true, tweak?: (c: MatchConfig) => MatchConfig) {
  const base: MatchConfig = fakeMatchConfig();
  const config: MatchConfig = tweak ? tweak(base) : base;
  const state = { tick: 10, phase: 'regulation', sides: [], units: [], projectiles: [], casts: [], traps: [], rng: [1, 2, 3, 4], nextId: 1, outcome: null, hashes: [] } as unknown as SimState;
  (state as unknown as { sides: unknown[] }).sides = [0, 1].map(() => ({
    ageIndex: 0, gold: 0, xp: 0, baseHp: 1_000_000, baseMaxHp: 1_000_000, turrets: [null, null, null, null], mountsOwned: 1, treasury: 0, lastStand: 'idle',
    stance: 'charge', holdP: 0, queue: [], pop: 0, research: { owned: [], cur: -1, startTick: 0, endTick: 0, paid: 0 }, powerPpm: [0, 0], ascendUntil: 0,
  }));
  const art = new AimArt(hooks);
  const view = new BattleView({ sim: { state, config }, art, audio: new FakeAudio(), labelFactory: labels, settings: {} });
  view.resize(1280, 720);
  view.setPaused(false);
  return { state, art, view };
}

/** A Pebbler (ranged, a rock at 500 lu/s) at 400 shooting a Bonker at 600. */
function shooter(s: ReturnType<typeof setup>) {
  s.state.units.push(unitState(1, 0, 'pebbler', 400, { mode: 'attack', attacks: [{ targetId: 2, impactTick: 20, nextAttackTick: 38, lastAttackTick: 10 }] }));
  s.state.units.push(unitState(2, 1, 'bonker', 600, { mode: 'walk' }));
  for (let i = 0; i < 3; i++) s.view.render(1, 1000 / 60);
  return { v: s.art.views[0]!, target: s.art.views[1]! };
}

const started = (o: Partial<Extract<SimEvent, { e: 'attackStarted' }>> = {}): SimEvent => ({ e: 'attackStarted', tick: 10, id: 1, targetId: 2, windupTicks: 10, attackIndex: 0, ...o }) as SimEvent;
const fired = (o: Partial<Extract<SimEvent, { e: 'projectileFired' }>> = {}): SimEvent => ({ e: 'projectileFired', tick: 20, pid: 50, from: 1, targetId: 2, toX: 600_000, travelTicks: 8, visualId: 'proj.rock', ...o }) as SimEvent;

const frames = (s: ReturnType<typeof setup>, n: number) => {
  for (let i = 0; i < n; i++) s.view.render(1, 1000 / 60);
};

describe('ranged shooters aim at their target (queue item 44)', () => {
  it('leans toward the target as drawn from the wind-up on, every frame, and holds the lean after the shot', () => {
    const s = setup();
    const { v, target } = shooter(s);
    // a weapon drawn 30 degrees down at a target a little below the muzzle: it leans up (as far as the body allows)
    v.weapon = { x: 20, y: -40, deg: -30 };
    s.view.onEvents([started()]);
    expect(v.plays.at(-1)?.clip).toBe('attack');
    const from = { x: v.root.x + 20, y: v.root.y - 40 };
    const to = { x: target.root.x, y: target.root.y + target.anchors.hitCenter.y };
    const want = leanFor('ballistic', lineDeg(from, to, 1) ?? 0, -30, 14);
    expect(want).toBeGreaterThan(4);
    expect(v.leans.at(-1)).toBeCloseTo(want, 6);
    const n = v.leans.length;
    frames(s, 5);
    expect(v.leans.length).toBe(n + 5);
    // the shot is away and the unit keeps attacking the same target: the lean stays where it is
    s.view.onEvents([fired()]);
    frames(s, 5);
    expect(v.leans.length).toBe(n + 10);
    for (const l of v.leans.slice(n)) expect(l).toBeCloseTo(want, 6);
  });

  it('keeps the lean from shot to shot at one target: no upright frame between two attacks (no rocking)', () => {
    const s = setup();
    const { v } = shooter(s);
    v.weapon = { x: 20, y: -40, deg: -30 };
    s.view.onEvents([started()]);
    frames(s, 10);
    s.view.onEvents([fired()]);
    // the recovery and the gap to the next attack
    frames(s, 30);
    s.view.onEvents([started({ tick: 38 })]);
    frames(s, 10);
    s.view.onEvents([fired({ tick: 48, pid: 51 })]);
    frames(s, 10);
    expect(v.plays.filter((p) => p.clip === 'attack')).toHaveLength(2);
    expect(v.leans.length).toBeGreaterThan(60);
    expect(Math.min(...v.leans)).toBeGreaterThan(4);
  });

  it('a new target re-aims from the lean it has; the aim ends on a stun, when the unit walks on, and a gone target stands it up', () => {
    const s = setup();
    const { v } = shooter(s);
    s.state.units.push(unitState(3, 1, 'bonker', 640, { mode: 'walk' }));
    frames(s, 2);
    v.weapon = { x: 20, y: -40, deg: -30 };
    s.view.onEvents([started()]);
    frames(s, 5);
    const before = v.leans.length;
    // another target: no stand-up in between
    s.view.onEvents([started({ tick: 38, targetId: 3 })]);
    frames(s, 5);
    expect(v.leans.slice(before).every((l) => l > 0)).toBe(true);
    // a stun ends the aim: the view stands up and the battle view stops asking
    s.view.onEvents([{ e: 'statusApplied', tick: 40, id: 1, kind: 'stun', ms: 1000, frozen: false } as SimEvent]);
    expect(v.leans.at(-1)).toBe(0);
    const stunned = v.leans.length;
    frames(s, 5);
    expect(v.leans.length).toBe(stunned);
    // aiming again, then the unit walks on (the sim's mode leaves attack): the view stands up
    s.view.onEvents([started({ tick: 60 })]);
    frames(s, 3);
    expect(v.leans.at(-1)).toBeGreaterThan(0);
    s.state.units[0]!.mode = 'walk';
    frames(s, 1);
    expect(v.leans.at(-1)).toBe(0);
    const walked = v.leans.length;
    frames(s, 3);
    expect(v.leans.length).toBe(walked);
    // aiming again at a target that dies in the wind-up: it stands up while the unit stays in attack
    s.state.units[0]!.mode = 'attack';
    s.view.onEvents([started({ tick: 80 })]);
    frames(s, 2);
    expect(v.leans.at(-1)).toBeGreaterThan(0);
    s.view.onEvents([{ e: 'died', tick: 81, id: 2, side: 1, card: 'bonker', killerId: 1, killerCard: 'pebbler', killerKind: 'unit', killerSide: 0, bountyGold: 0, bountyXp: 0, x: 600_000 } as SimEvent]);
    frames(s, 2);
    expect(v.leans.at(-1)).toBe(0);
  });

  it('flies the shot from the weapon as drawn along the drawn angle, to the target the sim hits', () => {
    const s = setup();
    const { v, target } = shooter(s);
    v.weapon = { x: 20, y: -40, deg: 38 };
    s.view.onEvents([started()]);
    s.view.render(1, 1000 / 60);
    s.view.onEvents([fired()]);
    const shot = s.art.shots.at(-1)!;
    expect(shot.flown).toEqual([]);
    const a = shot.aimed[0]!;
    expect(a.from.x).toBeCloseTo(v.root.x + 20, 6);
    expect(a.from.y).toBeCloseTo(v.root.y - 40, 6);
    expect(a.to.x).toBeCloseTo(600, 6);
    expect(a.to.y).toBeCloseTo(target.root.y + target.anchors.hitCenter.y, 6);
    expect(a.ms).toBe(400);
    // a bow raised over its target: no lean, a ballistic path along the bow
    expect(v.leans.at(-1)).toBe(0);
    expect(a.o).toEqual(pathFor('ballistic', lineDeg(a.from, a.to, 1) ?? 0, 38));
    expect(a.o.path).toBe('ballistic');
  });

  it('a variant that cannot start the shot gives way to one that can', () => {
    const s = setup();
    const { v } = shooter(s);
    // the next variant points 40 degrees under the line to the target (a direct shot would need it); the other at 30
    v.weapon = { x: 20, y: -40, deg: -60 };
    s.view.onEvents([started()]);
    expect(v.plays.at(-1)?.o?.['variant']).toBe('attack_b');
  });

  it('views without the hooks fire as before: the static muzzle, the classic flight', () => {
    const s = setup(false);
    const { v } = shooter(s);
    s.view.onEvents([started()]);
    expect(v.plays.at(-1)?.o?.['variant']).toBeUndefined();
    s.view.onEvents([fired()]);
    const shot = s.art.shots.at(-1)!;
    expect(shot.aimed).toEqual([]);
    expect(shot.flown[0]?.from.x).toBeCloseTo(v.root.x + v.anchors.muzzle.x, 6);
    expect(shot.flown[0]?.arc).toBe(false);
  });

  it('melee attackers never aim', () => {
    const s = setup();
    s.state.units.push(unitState(1, 0, 'bonker', 480, { mode: 'attack', attacks: [{ targetId: 2, impactTick: 20, nextAttackTick: 38, lastAttackTick: 10 }] }));
    s.state.units.push(unitState(2, 1, 'bonker', 517, { mode: 'attack' }));
    for (let i = 0; i < 3; i++) s.view.render(1, 1000 / 60);
    s.view.onEvents([started()]);
    for (let i = 0; i < 3; i++) s.view.render(1, 1000 / 60);
    expect(s.art.views[0]!.leans).toEqual([]);
  });
});

describe('turrets aim before they fire (queue item 44)', () => {
  it('the barrel follows its target as drawn every frame', () => {
    const s = setup();
    s.state.units.push(unitState(2, 0, 'bonker', 1500, { mode: 'walk' }));
    const sides = s.state.sides as unknown as { turrets: unknown[] }[];
    sides[1]!.turrets[0] = { card: 'crossbow_nest', age: 'medieval', level: 1, state: 'active', readyTick: 0, attack: { targetId: 2, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0, retargetTick: 0, firstHit: false, bite: false } };
    for (let i = 0; i < 2; i++) s.view.render(1, 1000 / 60);
    const t = s.art.turretViews[0] as unknown as { aimX: number };
    expect(t.aimX).toBeCloseTo(1500, 0);
    s.state.units[0]!.x = 1450_000;
    s.state.units[0]!.prevX = 1450_000;
    s.view.render(1, 1000 / 60);
    expect(t.aimX).toBeCloseTo(1450, 0);
  });

  it('with a live muzzle the barrel points at the body (not the feet), and level at a flyer', () => {
    const s = setup();
    s.art.turretMuzzle = true;
    s.state.units.push(unitState(2, 0, 'bonker', 1500, { mode: 'walk' }));
    const sides = s.state.sides as unknown as { turrets: unknown[] }[];
    sides[1]!.turrets[0] = { card: 'crossbow_nest', age: 'medieval', level: 1, state: 'active', readyTick: 0, attack: { targetId: 2, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0, retargetTick: 0, firstHit: false, bite: false } };
    for (let i = 0; i < 2; i++) s.view.render(1, 1000 / 60);
    const t = s.art.turretViews[0]! as unknown as { aimX: number; root: Container };
    const u = s.art.views[0]!;
    const x0 = t.root.x;
    const my = t.root.y - 10;
    const tx = u.root.x;
    const ty = u.root.y + u.anchors.hitCenter.y;
    // `aimAt` aims from the barrel at the ground under x: through the ground point on the line from the muzzle to the body
    expect(my).toBeLessThan(ty);
    expect(t.aimX).toBeCloseTo(x0 + ((tx - x0) * -my) / (ty - my), 6);
    // that ground point lies beyond the target (a flatter barrel than aiming at its feet)
    expect(Math.abs(t.aimX - x0)).toBeGreaterThan(Math.abs(tx - x0));
    // a target above the muzzle (as a flyer always is): `aimAt` cannot aim up, so the barrel goes level (toward the
    // enemy: side 1 faces left); the muzzle's height is read again at each shot (no allocation per frame between)
    (t as unknown as Record<string, unknown>)['muzzlePoint'] = () => ({ x: t.root.x, y: ty + 5 });
    s.view.onEvents([{ e: 'turretFired', tick: 11, side: 1, mount: 0, targetId: 2 } as SimEvent]);
    expect(t.aimX).toBeLessThan(x0 - 4000);
    s.view.render(1, 1000 / 60);
    expect(t.aimX).toBeLessThan(x0 - 4000);
  });

  it("shots leave the live muzzle, and a new target's first shot turns the barrel at once where the view can", () => {
    const s = setup();
    s.art.turretMuzzle = true;
    s.state.units.push(unitState(2, 0, 'bonker', 1500, { mode: 'walk' }));
    s.state.units.push(unitState(3, 0, 'bonker', 1420, { mode: 'walk' }));
    const sides = s.state.sides as unknown as { turrets: unknown[] }[];
    sides[1]!.turrets[0] = { card: 'crossbow_nest', age: 'medieval', level: 1, state: 'active', readyTick: 0, attack: { targetId: 0, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0, retargetTick: 0, firstHit: false, bite: false } };
    frames(s, 2);
    const t = s.art.turretViews[0]! as unknown as { root: Container; snaps: number };
    const fire = (targetId: number, pid: number) => {
      s.view.onEvents([
        { e: 'turretFired', tick: 12, side: 1, mount: 0, targetId } as SimEvent,
        // turret sources: -10 - (side * 4 + mount)
        fired({ pid, from: -14, targetId, toX: 1500_000, visualId: 'proj.bolt' }),
      ]);
    };
    fire(2, 60);
    expect(t.snaps).toBe(1);
    const shot = s.art.shots.at(-1)!;
    const from = shot.flown[0]?.from ?? shot.aimed[0]?.from;
    expect(from?.x).toBeCloseTo(t.root.x, 6);
    expect(from?.y).toBeCloseTo(t.root.y - 10, 6);
    // the same target again: the barrel is already there
    frames(s, 3);
    fire(2, 61);
    expect(t.snaps).toBe(1);
    // a new target's first shot
    fire(3, 62);
    expect(t.snaps).toBe(2);
  });
});

describe('call strikes, close targets and the shared limits (queue item 44)', () => {
  it("a call strike's shell comes in from the sky on the caller's side, not out of the caller", () => {
    const s = setup(true, (c) => {
      const pebbler = c.content.units['pebbler']!;
      return { ...c, content: { ...c.content, units: { ...c.content.units, pebbler: { ...pebbler, abilities: [...pebbler.abilities, { kind: 'callStrike' } as never] } } } };
    });
    shooter(s);
    s.view.onEvents([fired({ pid: 70, visualId: 'proj.shell', travelTicks: 20 })]);
    const a = s.art.shots.at(-1)!.aimed[0]!;
    // 320 lu back on the caller's side (it faces right) and 560 lu up, diving at 32 degrees, over the sim's time
    expect(a.to.x).toBeCloseTo(600, 6);
    expect(a.from.x).toBeCloseTo(600 - 320, 6);
    expect(a.from.y).toBe(-560);
    expect(a.o).toEqual({ launchDeg: -32, path: 'ballistic' });
    expect(a.ms).toBe(1000);
  });

  it('a target closer than MIN_AIM_DX_LU in front of the muzzle (or behind it) keeps the classic flight', () => {
    const s = setup();
    const { v } = shooter(s);
    v.weapon = { x: 20, y: -40, deg: 38 };
    s.view.onEvents([started()]);
    // the muzzle sits at 420: a shot at 425 is under the weapon
    s.view.onEvents([fired({ pid: 80, toX: (400 + 20 + MIN_AIM_DX_LU - 3) * 1000, targetId: 0 })]);
    const shot = s.art.shots.at(-1)!;
    expect(shot.aimed).toEqual([]);
    expect(shot.flown).toHaveLength(1);
  });

  it('the steepest launch is the same in the render rules and in the projectile views', () => {
    expect(MAX_LAUNCH_DEG).toBe(VIEW_MAX_LAUNCH_DEG);
  });
});
