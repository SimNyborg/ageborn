/**
 * Art round W0 (contract C2): the battle view asks a shooter's view for the aimed clip of its attack variant by the
 * shot's launch angle (`play('attack', { aimAt })`, `playAlt({ aimAt })`), measured from where the weapon is drawn now
 * to where the shot is aimed, relative to the facing direction. Melee attacks, emitters, targets not in front and views
 * without the aim hooks ask for nothing (the base clip plays, as before). Presentation only: the sim's events and ticks
 * are untouched.
 */
import type { MatchConfig, SimEvent, SimState, UnitState } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { aimWantDeg, lineDeg, shotKindOf } from '../aim';
import { BattleView } from '../battleView';
import type { LabelFactory } from '../feel/numbers';

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

type FakeUnit = ReturnType<FakeArtProvider['createUnit']>;
interface Spy {
  plays: { clip: string; o?: Record<string, unknown> }[];
  alts: Record<string, unknown>[];
  weapon: { x: number; y: number; deg: number; omni: boolean };
}

class AimArt extends FakeArtProvider {
  readonly views: (FakeUnit & Spy)[] = [];
  constructor(private readonly hooks = true) {
    super();
  }
  override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): FakeUnit {
    const v = super.createUnit(o) as FakeUnit & Spy & Record<string, unknown>;
    Object.assign(v, { plays: [], alts: [], weapon: { x: 20, y: -40, deg: 0, omni: false } });
    const play = v.play.bind(v);
    v.play = (clip: string, opts?: Record<string, unknown>) => {
      v.plays.push({ clip, ...(opts ? { o: opts } : {}) });
      play(clip);
    };
    v['playAlt'] = (opts: Record<string, unknown>) => v.alts.push(opts);
    if (this.hooks) {
      v['aimInfo'] = () => ({ variants: [{ anim: 'attack', deg: v.weapon.deg, omni: v.weapon.omni }], next: 'attack', maxLeanDeg: 14 });
      v['aimLean'] = () => undefined;
      v['aimNow'] = () => ({ x: v.weapon.x, y: v.weapon.y, deg: v.weapon.deg, drawnDeg: v.weapon.deg, leanDeg: 0, omni: v.weapon.omni });
    }
    this.views.push(v);
    return v;
  }
}

function unitState(id: number, side: 0 | 1, card: string, x: number, o: Partial<UnitState> = {}): UnitState {
  return {
    id, side, card, level: 1, x: x * 1000, prevX: x * 1000, hp: 40_000, maxHp: 40_000, shield: 0, innateShield: 0,
    mode: 'walk', attacks: [{ targetId: -1, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 }], statuses: [],
    air: false, summoned: false, timers: [], lastDamageTick: 0, ...o,
  };
}

function setup(hooks = true) {
  const config: MatchConfig = fakeMatchConfig();
  const state = { tick: 10, phase: 'regulation', sides: [], units: [], projectiles: [], casts: [], traps: [], rng: [1, 2, 3, 4], nextId: 1, outcome: null, hashes: [] } as unknown as SimState;
  (state as unknown as { sides: unknown[] }).sides = [0, 1].map(() => ({
    ageIndex: 0, gold: 0, xp: 0, baseHp: 1_000_000, baseMaxHp: 1_000_000, turrets: [null, null, null, null], mountsOwned: 1, treasury: 0, lastStand: 'idle',
    stance: 'charge', holdP: 0, queue: [], pop: 0, research: { owned: [], cur: -1, startTick: 0, endTick: 0, paid: 0 }, powerPpm: [0, 0], ascendUntil: 0,
  }));
  const art = new AimArt(hooks);
  const view = new BattleView({ sim: { state, config }, art, audio: new FakeAudio(), labelFactory: labels, settings: {} });
  view.resize(1280, 720);
  view.setPaused(false);
  return { state, art, view, config };
}

const frames = (s: ReturnType<typeof setup>, n: number): void => {
  for (let i = 0; i < n; i++) s.view.render(1, 1000 / 60);
};

/** A shooter of `side` at `x` attacking a Bonker at `tx` (the views in creation order: shooter, target). */
function duel(s: ReturnType<typeof setup>, side: 0 | 1, card: string, x: number, tx: number) {
  s.state.units.push(unitState(1, side, card, x, { mode: 'attack', attacks: [{ targetId: 2, impactTick: 20, nextAttackTick: 38, lastAttackTick: 10 }] }));
  s.state.units.push(unitState(2, side === 0 ? 1 : 0, 'bonker', tx, { mode: 'walk' }));
  frames(s, 3);
  return { v: s.art.views[0]!, target: s.art.views[1]! };
}

const started = (o: Partial<Extract<SimEvent, { e: 'attackStarted' }>> = {}): SimEvent => ({ e: 'attackStarted', tick: 10, id: 1, targetId: 2, windupTicks: 10, attackIndex: 0, ...o }) as SimEvent;

describe("the battle view asks for the shot's aimed clip (contract C2)", () => {
  it("passes the launch angle from the drawn weapon to the target with the attack", () => {
    const s = setup();
    const { v, target } = duel(s, 0, 'pebbler', 400, 600);
    s.view.onEvents([started()]);
    const kind = shotKindOf(s.config.content.units['pebbler']?.attacks[0]);
    expect(kind).not.toBeNull();
    const from = { x: v.root.x + v.weapon.x, y: v.root.y + v.weapon.y };
    const to = { x: target.root.x, y: target.root.y + target.anchors.hitCenter.y };
    const want = aimWantDeg(kind!, lineDeg(from, to, 1) ?? Number.NaN);
    expect(v.plays.at(-1)?.clip).toBe('attack');
    expect(v.plays.at(-1)?.o?.['aimAt']).toBeCloseTo(want, 9);
  });

  it('a shooter facing left measures the angle from its own facing (up stays up, in front stays in front)', () => {
    const s = setup();
    const { v, target } = duel(s, 1, 'pebbler', 600, 400);
    // the weapon drawn in front of a unit facing left
    v.weapon = { ...v.weapon, x: -20 };
    s.view.onEvents([started()]);
    const from = { x: v.root.x - 20, y: v.root.y - 40 };
    const to = { x: target.root.x, y: target.root.y + target.anchors.hitCenter.y };
    expect(to.x).toBeLessThan(from.x);
    const want = v.plays.at(-1)?.o?.['aimAt'] as number;
    expect(want).toBeCloseTo(lineDeg(from, to, -1) ?? Number.NaN, 9);
    // the same geometry seen facing right would be behind the shooter: no angle at all
    expect(lineDeg(from, to, 1)).toBeNull();
  });

  it('melee attackers, emitters, targets right at the muzzle and views without the hooks ask for nothing', () => {
    const melee = setup();
    duel(melee, 0, 'bonker', 480, 517);
    melee.view.onEvents([started()]);
    expect(melee.art.views[0]!.plays.at(-1)?.o?.['aimAt']).toBeUndefined();

    const emitter = setup();
    const e = duel(emitter, 0, 'pebbler', 400, 600).v;
    e.weapon = { ...e.weapon, omni: true };
    emitter.view.onEvents([started()]);
    expect(e.plays.at(-1)?.o?.['aimAt']).toBeUndefined();

    const close = setup();
    const c = duel(close, 0, 'pebbler', 400, 600).v;
    // the muzzle drawn past the target: not in front of it
    c.weapon = { ...c.weapon, x: 210 };
    close.view.onEvents([started()]);
    expect(c.plays.at(-1)?.o?.['aimAt']).toBeUndefined();

    const plain = setup(false);
    const p = duel(plain, 0, 'pebbler', 400, 600).v;
    plain.view.onEvents([started()]);
    expect(p.plays.at(-1)?.clip).toBe('attack');
    expect(p.plays.at(-1)?.o?.['aimAt']).toBeUndefined();
  });

  it('a second attack never restarts the body clip; its aimed alt is asked for only when the attack shoots', () => {
    const s = setup();
    const v = duel(s, 0, 'pebbler', 400, 600).v;
    s.view.onEvents([started({ attackIndex: 1 })]);
    // the fake content's Pebbler has no second attack: an alt that is not a shot asks for no angle
    expect(v.plays.filter((p) => p.clip === 'attack')).toHaveLength(0);
    expect(v.alts.at(-1)?.['aimAt']).toBeUndefined();
    expect(v.alts.at(-1)?.['impactAtMs']).toBeGreaterThan(0);
  });
});
