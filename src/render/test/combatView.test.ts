import type { MatchConfig, SimEvent, SimState, UnitDef, UnitState } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView, type CombatView, type HitTier } from '../battleView';
import type { Reach } from '../contact';
import type { LabelFactory } from '../feel/numbers';

/**
 * Queue item 38 Phase A, track B: the battle view's combat staging and feel against views that have the INTERFACE
 * hooks (spies) and views that do not.
 */

const labels: LabelFactory = () => {
  const root = new Container();
  return { root, setText: (s) => (root.label = s), setStyle: () => {} };
};

const CLUB: Reach = { tipLu: 67, lungeLu: 13, frontLu: 60, backLu: 20, torsoFrontLu: 25, tipYLu: 6 };

type FakeUnit = ReturnType<FakeArtProvider['createUnit']>;
interface Spy {
  offsets: number[];
  comps: number[];
  reacts: { tier: HitTier; dir: 1 | -1 }[];
  lifts: { ms: number; liftLu: number; kind: string; tumble: boolean }[];
  lands: (() => void)[];
  deaths: { dir: 1 | -1; tier: HitTier; heavy: boolean; lieMs: number; fadeMs: number; onLand?: () => void }[];
  marks: boolean[];
  finished: boolean;
}

/** Fake art whose unit views have the combat hooks (`hooks: false` for views without them). */
class CombatArt extends FakeArtProvider {
  readonly views: (FakeUnit & Spy)[] = [];
  constructor(private readonly hooks = true) {
    super();
  }
  override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): FakeUnit {
    const v = super.createUnit(o) as FakeUnit & Spy & CombatView & { setGroundMarks?(on: boolean): void };
    Object.assign(v, { offsets: [], comps: [], reacts: [], lifts: [], lands: [], deaths: [], marks: [], finished: false });
    if (this.hooks) {
      v.reach = () => CLUB;
      v.setOffsetX = (lu: number) => void v.offsets.push(lu);
      v.setLungeComp = (s: number) => void v.comps.push(s);
      v.react = (tier, dir) => void v.reacts.push({ tier, dir });
      v.airborne = (a) => {
        v.lifts.push({ ms: a.ms, liftLu: a.liftLu, kind: a.kind, tumble: a.tumble });
        if (a.onLand) v.lands.push(a.onLand);
      };
      v.dieWith = (d) => void v.deaths.push(d);
      v.setGroundMarks = (on: boolean) => void v.marks.push(on);
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

/** An audio fake with track S's duck-typed ambience hook. */
class AmbienceAudio extends FakeAudio {
  readonly levels: number[] = [];
  setBattleAmbience(level: number): void {
    this.levels.push(level);
  }
}

/** The fake content plus a pouncer and a Legendary (queue item 38 A8). */
function withCards(config: MatchConfig): MatchConfig {
  const units = config.content.units;
  const bonker = units['bonker'] as UnitDef;
  const extra: Record<string, UnitDef> = {
    sabertooth: { ...bonker, id: 'sabertooth', group: 'epic', size: 'medium', abilities: [{ kind: 'pounce', searchRange: 150, cooldownMs: 10000, leapMs: 500, firstBiteBp: 20000 }] },
    matriarch: { ...bonker, id: 'matriarch', group: 'legendary', rarity: 'legendary', size: 'huge' },
  };
  return { ...config, content: { ...config.content, units: { ...units, ...extra } } };
}

function setup(hooks = true, o: { reduceMotion?: boolean; timeScaleHost?: boolean; live?: boolean; audio?: FakeAudio; width?: number; height?: number } = {}) {
  let config: MatchConfig = withCards(fakeMatchConfig());
  if (o.live) config = { ...config, sides: [config.sides[0], { ...config.sides[1], online: { name: 'Mira', avatar: 'a1', trophies: 1200 } }] as unknown as MatchConfig['sides'] };
  const state = {
    tick: 10, phase: 'regulation', sides: [], units: [], projectiles: [], casts: [], traps: [], rng: [1, 2, 3, 4], nextId: 1, outcome: null, hashes: [],
  } as unknown as SimState;
  // the fake config's sides (gold, ages ...) come from a real side state shape
  const st = state as unknown as { sides: unknown[] };
  st.sides = [0, 1].map(() => ({ ageIndex: 0, gold: 0, xp: 0, baseHp: 1_000_000, baseMaxHp: 1_000_000, turrets: [null, null, null, null], mountsOwned: 1, treasury: 0, lastStand: 'idle', stance: 'charge', holdP: 0, queue: [], pop: 0, research: { owned: [], cur: -1, startTick: 0, endTick: 0, paid: 0 }, powerPpm: [0, 0], ascendUntil: 0 }));
  const art = new CombatArt(hooks);
  const audio = o.audio ?? new FakeAudio();
  const view = new BattleView({ sim: { state, config }, art, audio, labelFactory: labels, settings: { reduceMotion: o.reduceMotion === true }, timeScaleHost: o.timeScaleHost === true });
  view.resize(o.width ?? 1280, o.height ?? 720);
  view.setPaused(false);
  return { state, art, audio, view };
}

/** Puts two Bonkers in a mutual melee at 37 lu (the sim's contact distance) and renders `frames` 60 fps frames. */
function duel(s: ReturnType<typeof setup>, frames = 30) {
  const a = unitState(1, 0, 'bonker', 480, { mode: 'attack', attacks: [{ targetId: 2, impactTick: 18, nextAttackTick: 30, lastAttackTick: 10 }] });
  const b = unitState(2, 1, 'bonker', 517, { mode: 'attack', attacks: [{ targetId: 1, impactTick: 18, nextAttackTick: 30, lastAttackTick: 10 }] });
  s.state.units.push(a, b);
  for (let i = 0; i < frames; i++) s.view.render(1, 1000 / 60);
  return { a, b, va: s.art.views[0]!, vb: s.art.views[1]! };
}

function hitEv(o: Partial<Extract<SimEvent, { e: 'hit' }>> = {}): SimEvent {
  return { e: 'hit', tick: 10, targetId: 2, sourceId: 1, sourceCard: 'bonker', castId: null, sourceKind: 'unit', damage: 2000, shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 517_000, dmgType: 'blunt', ...o } as SimEvent;
}

describe('A1 contact staging in the battle view', () => {
  it('pulls a mirror duel apart through setOffsetX, keeps the poses on the sim x, and sends the lunge compensation', () => {
    const s = setup();
    const { va, vb } = duel(s);
    const oa = va.offsets.at(-1) ?? 0;
    const ob = vb.offsets.at(-1) ?? 0;
    expect(oa).toBeLessThan(-10);
    expect(ob).toBeGreaterThan(10);
    // the root stays on the sim x (the view's frame lock plants the feet against it)
    expect(va.lastPose?.x).toBeCloseTo(480, 5);
    expect(vb.lastPose?.x).toBeCloseTo(517, 5);
    const gap = 517 + ob - (480 + oa);
    expect(gap).toBeGreaterThan(70);
    expect(gap).toBeLessThan(100);
    expect(va.comps.at(-1)).toBeGreaterThan(0);
    // a duel shares a depth row
    expect(va.lastPose?.y).toBeCloseTo(vb.lastPose?.y ?? NaN, 5);
  });

  it('draws views without the hook at the drawn x through the pose', () => {
    const s = setup(false);
    const { va, vb } = duel(s);
    // the fallback has no reach (no reach() or extents on the fake view): no stand-off, the sim x
    expect(va.lastPose?.x).toBeCloseTo(480, 5);
    expect(vb.lastPose?.x).toBeCloseTo(517, 5);
  });

  it('releases the stand-off when the foe falls: held while the winner stands, then at half its walking speed at most (review A, S1)', () => {
    const s = setup();
    const { a, b, va } = duel(s);
    const held = va.offsets.at(-1) ?? 0;
    expect(held).toBeLessThan(-10);
    // b falls; a stands a moment (its follow-through), then the sim walks it on at its march speed (87.5 lu/s)
    s.state.units.splice(s.state.units.indexOf(b), 1);
    s.view.onEvents([diedEv(2, 'bonker', 517)]);
    a.mode = 'walk';
    a.attacks[0]!.targetId = -1;
    for (let i = 0; i < 12; i++) s.view.render(1, 1000 / 60);
    expect(va.offsets.at(-1) ?? 0).toBeCloseTo(held, 0);
    const seen: number[] = [];
    for (let tick = 0; tick < 24; tick++) {
      a.prevX = a.x;
      a.x += 4375;
      s.state.tick++;
      for (let f = 0; f < 3; f++) {
        s.view.render((f + 1) / 3, 50 / 3);
        seen.push(va.offsets.at(-1) ?? 0);
      }
    }
    expect(Math.abs(seen.at(-1) ?? 99)).toBeLessThan(1.5);
    // never faster than half the walk itself (87.5 / 2 lu/s: 0.73 lu a frame), so the winner walks on at 1.5x its pace
    // at most while it catches up with its sim x (its walk clip retimes to the drawn speed)
    for (let i = 1; i < seen.length; i++) expect(Math.abs((seen[i] as number) - (seen[i - 1] as number))).toBeLessThanOrEqual((87.5 * 0.5 * 50) / 3 / 1000 + 1e-6);
  });

  it('takes the stand-off on the approach: two walking into each other stand at it when the sim stops them (review A, S1)', () => {
    const s = setup();
    const a = unitState(1, 0, 'bonker', 300);
    const b = unitState(2, 1, 'bonker', 640);
    s.state.units.push(a, b);
    const gaps: number[] = [];
    // both walk in at 87.5 lu/s (4.375 lu a tick) until the sim parks them 40 lu apart (range 16 + 12 + 12)
    let sep = 340;
    while (sep > 40) {
      const step = Math.min(4.375, (sep - 40) / 2);
      a.prevX = a.x;
      b.prevX = b.x;
      a.x += step * 1000;
      b.x -= step * 1000;
      sep -= 2 * step;
      s.state.tick++;
      for (let f = 0; f < 3; f++) s.view.render((f + 1) / 3, 50 / 3);
      gaps.push((b.x - a.x) / 1000 + (s.art.views[1]?.offsets.at(-1) ?? 0) - (s.art.views[0]?.offsets.at(-1) ?? 0));
    }
    const atContact = gaps.at(-1) ?? 0;
    // the sim engages them: the stand-off they now get is the one they arrived at (no step back in the wind-up)
    a.mode = 'attack';
    b.mode = 'attack';
    a.attacks[0]!.targetId = 2;
    b.attacks[0]!.targetId = 1;
    a.prevX = a.x;
    b.prevX = b.x;
    for (let i = 0; i < 30; i++) s.view.render(1, 1000 / 60);
    const engaged = (b.x - a.x) / 1000 + (s.art.views[1]?.offsets.at(-1) ?? 0) - (s.art.views[0]?.offsets.at(-1) ?? 0);
    expect(atContact).toBeGreaterThan(70);
    expect(Math.abs(engaged - atContact)).toBeLessThan(4);
    // the drawn gap closed without turning back (under 1 lu, the spring's lag at the stop), slowing into the stop
    for (let i = 1; i < gaps.length; i++) expect(gaps[i] as number).toBeLessThanOrEqual((gaps[i - 1] as number) + 1);
    const late = (gaps.at(-3) as number) - (gaps.at(-2) as number);
    const early = (gaps[10] as number) - (gaps[11] as number);
    expect(late).toBeLessThan(early * 0.35);
    // the pair walked into its duel row already
    expect(s.art.views[0]?.lastPose?.y).toBeCloseTo(s.art.views[1]?.lastPose?.y ?? NaN, 0);
  });
});

describe('rows of a unit that appears (review A, N5)', () => {
  it('a unit the view meets mid-field takes its first row among the whole field and keeps it on the next frames', () => {
    const s = setup();
    s.state.units.push(unitState(1, 0, 'bonker', 500), unitState(2, 0, 'bonker', 504), unitState(3, 0, 'bonker', 508));
    for (let i = 0; i < 10; i++) s.view.render(1, 1000 / 60);
    // a summon appears first in the sim's list, in the middle of the three, with no spawn event (a replay seek)
    s.state.units.unshift(unitState(4, 0, 'bonker', 502));
    s.view.render(1, 1000 / 60);
    const v = s.art.views[3]!;
    const first = v.lastPose?.y ?? NaN;
    for (let i = 0; i < 10; i++) s.view.render(1, 1000 / 60);
    expect(v.lastPose?.y).toBeCloseTo(first, 6);
    // and not on a row a neighbour holds
    const ys = s.art.views.slice(0, 3).map((w) => w.lastPose?.y);
    expect(ys).not.toContain(first);
  });
});

describe('A2 reactions and knockback', () => {
  it('reacts on every hit through react(), with the tier and the push direction, and plays no hit clip', () => {
    const s = setup();
    const { va, vb } = duel(s);
    va.clip = 'attack';
    s.view.onEvents([hitEv()]);
    expect(vb.reacts).toEqual([{ tier: 'light', dir: 1 }]);
    expect(vb.clip).not.toBe('hit');
    s.view.onEvents([hitEv({ targetId: 1, sourceId: 2, x: 480_000, damage: 8000 })]);
    expect(va.reacts).toEqual([{ tier: 'heavy', dir: -1 }]);
  });

  it('keeps the old rule for views without react(): the hit clip only when no attack plays', () => {
    const s = setup(false);
    const { vb } = duel(s, 2);
    s.view.onEvents([{ e: 'attackStarted', tick: 10, id: 2, targetId: 1, windupTicks: 8, attackIndex: 0 } as SimEvent]);
    s.view.onEvents([hitEv()]);
    expect(vb.clip).toBe('attack');
  });

  it('draws a knockback over about 220 ms from where the unit stood, with a hop', () => {
    const s = setup();
    const { b, vb } = duel(s);
    const before = 517 + (vb.offsets.at(-1) ?? 0);
    // the sim shoves the victim 30 lu in one tick
    b.prevX = b.x;
    b.x += 30_000;
    s.state.tick = 11;
    s.view.onEvents([{ e: 'knockback', tick: 11, id: 2, fromX: 517_000, toX: 547_000 } as SimEvent]);
    expect(vb.lifts).toEqual([{ ms: 220, liftLu: 9, kind: 'knockback', tumble: true }]);
    s.view.render(0.2, 1000 / 60);
    const first = (vb.lastPose?.x ?? 0) + (vb.offsets.at(-1) ?? 0);
    // the first frame still draws it near where it stood (not 30 lu away)
    expect(Math.abs(first - before)).toBeLessThan(8);
    for (let i = 0; i < 20; i++) s.view.render(1, 1000 / 60);
    const later = (vb.lastPose?.x ?? 0) + (vb.offsets.at(-1) ?? 0);
    expect(later - before).toBeGreaterThan(15);
  });

  it('a unit killed in its knockback hop finishes the travel as it falls: no pop by what was left of the jump (review A, N2)', () => {
    const s = setup();
    const { b, vb } = duel(s);
    const drawn = (): number => (vb.lastPose?.x ?? 0) + (vb.offsets.at(-1) ?? 0);
    b.prevX = b.x;
    b.x += 30_000;
    s.state.tick = 11;
    s.view.onEvents([{ e: 'knockback', tick: 11, id: 2, fromX: 517_000, toX: 547_000 } as SimEvent]);
    for (let i = 0; i < 3; i++) s.view.render(1, 1000 / 60);
    // killed 50 ms into the 220 ms hop
    b.hp = 0;
    b.mode = 'dying';
    s.view.onEvents([hitEv({ damage: 40_000, x: 547_000 }), diedEv(2, 'bonker', 547)]);
    // the hop's fast first part and the fall's slide move it up to about 7 lu a frame; the old pop was the rest of the
    // jump (here 14 lu) on top, in one frame
    let last = drawn();
    for (let i = 0; i < 20; i++) {
      s.view.render(1, 1000 / 60);
      expect(Math.abs(drawn() - last)).toBeLessThan(9);
      last = drawn();
    }
  });
});

describe('A4 deaths with weight', () => {
  it('hands the death to dieWith with the blow, slides the body along it, lands it with a thud and ends when it has faded', () => {
    const s = setup();
    const { b, vb } = duel(s);
    const drawn = (): number => (vb.lastPose?.x ?? 0) + (vb.offsets.at(-1) ?? 0);
    const before = drawn();
    b.hp = 0;
    b.mode = 'dying';
    s.view.onEvents([hitEv({ damage: 40_000 }), { e: 'died', tick: 10, id: 2, side: 1, card: 'bonker', killerId: 1, killerCard: 'bonker', killerKind: 'unit', killerSide: 0, bountyGold: 0, bountyXp: 0, x: 517_000 } as SimEvent]);
    expect(vb.reacts.at(-1)?.tier).toBe('kill');
    expect(vb.deaths).toHaveLength(1);
    expect(vb.deaths[0]).toMatchObject({ dir: 1, tier: 'heavy', heavy: false, lieMs: 2000, fadeMs: 600 });
    expect(vb.marks).toEqual([false]);
    for (let i = 0; i < 30; i++) s.view.render(1, 1000 / 60);
    // a heavy blow throws a light body about 24 lu along the blow
    expect(drawn() - before).toBeGreaterThan(18);
    // the fallen body sorts behind the living near its row and settles 8 lu back in depth as it falls: the winner
    // walking on in the duel's row passes in front of it instead of standing in it (review A, N7)
    expect(vb.root.zIndex).toBeLessThan(s.art.views[0]!.root.zIndex);
    expect((vb.lastPose?.y ?? 0) - (s.art.views[0]!.lastPose?.y ?? 0)).toBeCloseTo(-8, 1);
    vb.deaths[0]?.onLand?.();
    expect(s.audio.played()).toContain('body_fall_s');
    vb.finished = true;
    s.view.render(1, 1000 / 60);
    expect(vb.destroyed).toBe(true);
  });
});

describe('A3 kicks and the combat recipes\' motion flags', () => {
  it('kicks the screen for a kill in view, and not for one off screen', () => {
    const s = setup();
    duel(s);
    s.view.onEvents([hitEv({ damage: 40_000 }), { e: 'died', tick: 10, id: 2, side: 1, card: 'bonker', killerId: 1, killerCard: 'bonker', killerKind: 'unit', killerSide: 0, bountyGold: 0, bountyXp: 0, x: 517_000 } as SimEvent]);
    expect(s.view.director.shake.kickStrength).toBeGreaterThan(3);
    const far = setup();
    const a = unitState(1, 0, 'bonker', 1900, { mode: 'attack', attacks: [{ targetId: 2, impactTick: 18, nextAttackTick: 30, lastAttackTick: 10 }] });
    const b = unitState(2, 1, 'bonker', 1937);
    far.state.units.push(a, b);
    far.view.render(1, 16);
    far.view.onEvents([hitEv({ damage: 40_000, x: 1_937_000 }), { e: 'died', tick: 10, id: 2, side: 1, card: 'bonker', killerId: 1, killerCard: 'bonker', killerKind: 'unit', killerSide: 0, bountyGold: 0, bountyXp: 0, x: 1_937_000 } as SimEvent]);
    expect(far.view.director.shake.kickStrength).toBe(0);
  });

  it('tells the effects about Reduce motion through their options', () => {
    const s = setup(true, { reduceMotion: true });
    duel(s);
    const seen: Record<string, number>[] = [];
    const orig = s.art.createEffect.bind(s.art);
    s.art.createEffect = (id, o) => {
      if (o) seen.push(o);
      return orig(id, o);
    };
    s.view.onEvents([hitEv()]);
    expect(seen.some((o) => o['reduce'] === 1)).toBe(true);
  });
});

function diedEv(id: number, card: string, x: number, side: 0 | 1 = 1): SimEvent {
  return { e: 'died', tick: 10, id, side, card, killerId: 1, killerCard: 'bonker', killerKind: 'unit', killerSide: side === 1 ? 0 : 1, bountyGold: 0, bountyXp: 0, x: x * 1000 } as SimEvent;
}

describe('A6 the clash moment in the view', () => {
  it('shakes, punches and holds the engaged units near it, except one in its wind-up', () => {
    const s = setup();
    const { a, b, va, vb } = duel(s, 2);
    // the second line stands close behind each fighter
    s.state.units.push(unitState(3, 0, 'bonker', 440), unitState(4, 1, 'bonker', 560));
    for (let i = 0; i < 20; i++) s.view.render(1, 1000 / 60);
    // a has struck; b is winding up its own swing
    a.attacks[0]!.impactTick = 0;
    b.attacks[0]!.impactTick = s.state.tick + 4;
    s.view.onEvents([hitEv()]);
    // the attacker holds for the clash (70 ms, over its 35 ms hit-stop); the victim in its wind-up is never held (its
    // swing stays on the sim's beat, the timing contract)
    expect(va.frozenMs).toBe(70);
    expect(vb.frozenMs).toBe(0);
    expect(s.art.views[2]!.frozenMs).toBe(0);
    expect(s.view.director.shake.trauma).toBeGreaterThanOrEqual(0.4);
    expect(s.audio.played()).toContain('clash_crash');
    s.view.render(1, 1000 / 60);
    expect(s.view.camera.punchScale).toBeGreaterThan(1);
    // the dust's flat rings lie on the ground, under the units' legs; the puffs rise in front (review A, S4)
    const inLayer = (c: Container, label: string): boolean => c.children.some((ch) => ch.label === label);
    expect(inLayer(s.view.layers.ground, 'fx.clash_ring')).toBe(true);
    expect(inLayer(s.view.layers.vfx, 'fx.clash_ring')).toBe(false);
    expect(inLayer(s.view.layers.vfx, 'fx.clash_dust')).toBe(true);
    // the second blow of the same contact is no clash
    s.state.tick = 14;
    s.audio.clear();
    s.view.onEvents([hitEv({ tick: 14 })]);
    expect(s.audio.played()).not.toContain('clash_crash');
  });
});

describe('the timing contract: a hit-stop never holds a swing still winding up (review A, B1)', () => {
  it('holds a victim between its swings, never one whose own swing is pending; the attacker holds its impact', () => {
    const s = setup();
    const { a, b, va, vb } = duel(s, 2);
    // a lands its blow; b is 3 ticks short of its own impact (the de-phased reply)
    a.attacks[0]!.impactTick = 0;
    b.attacks[0]!.impactTick = s.state.tick + 3;
    s.view.onEvents([hitEv()]);
    expect(vb.reacts).toHaveLength(1);
    expect(vb.frozenMs).toBe(0);
    expect(va.frozenMs).toBe(35);
    // three ticks later b's reply lands on a, which is between its swings: a is held as the victim, b at its impact
    for (let i = 0; i < 9; i++) s.view.render(1, 1000 / 60);
    s.state.tick += 3;
    b.attacks[0]!.impactTick = 0;
    a.attacks[0]!.impactTick = s.state.tick + 17;
    s.view.onEvents([hitEv({ tick: s.state.tick, targetId: 1, sourceId: 2, x: 480_000 })]);
    expect(va.frozenMs).toBe(0);
    a.attacks[0]!.impactTick = 0;
    s.view.onEvents([hitEv({ tick: s.state.tick, targetId: 1, sourceId: 2, x: 480_000 })]);
    expect(va.frozenMs).toBe(50);
    expect(vb.frozenMs).toBe(35);
  });

  it('keeps the hold of a victim the blow killed (its swing never lands) and of a death in a wind-up', () => {
    const s = setup();
    const { b, vb } = duel(s, 2);
    b.attacks[0]!.impactTick = s.state.tick + 3;
    b.hp = 0;
    b.mode = 'dying';
    s.view.onEvents([hitEv({ damage: 40_000 }), diedEv(2, 'bonker', 517)]);
    // the kill's hit-stop (90 ms) holds the falling body: no swing of its will ever land
    expect(vb.frozenMs).toBeGreaterThanOrEqual(50);
  });

  it('protects every pending swing, a shot\'s release too: a heavy power hit holds nothing while it winds up', () => {
    const s = setup();
    const { b, vb } = duel(s, 2);
    b.attacks[0]!.impactTick = s.state.tick + 2;
    s.view.onEvents([hitEv({ sourceKind: 'power', sourceId: 0, damage: 8000 })]);
    expect(vb.reacts.at(-1)?.tier).toBe('heavy');
    expect(vb.frozenMs).toBe(0);
    b.attacks[0]!.impactTick = 0;
    s.view.onEvents([hitEv({ sourceKind: 'power', sourceId: 0, damage: 8000 })]);
    expect(vb.frozenMs).toBeGreaterThan(55);
  });
});

describe('A8 in the view: pounces, homing shots, the Legendary slow motion', () => {
  it('draws a pounce as a hop and lands it with dust and the thump', () => {
    const s = setup();
    s.state.units.push(unitState(1, 0, 'sabertooth', 400), unitState(2, 1, 'bonker', 600));
    for (let i = 0; i < 4; i++) s.view.render(1, 1000 / 60);
    s.view.onEvents([{ e: 'abilityUsed', tick: 10, id: 1, ability: 'pounce', x: 560_000 } as SimEvent]);
    const v = s.art.views[0]!;
    // a 160 lu leap: 0.28 x 160 lu, held to the 40 lu cap (it clears the heads of the line it jumps)
    expect(v.lifts).toEqual([{ ms: 500, liftLu: 40, kind: 'pounce', tumble: false }]);
    v.lands[0]?.();
    expect(s.audio.played()).toContain('leap_land');
  });

  it('homes a shot to its target as drawn: it lands where the walking target is', () => {
    const s = setup();
    const target = unitState(2, 1, 'bonker', 600);
    s.state.units.push(unitState(1, 0, 'pebbler', 300), target);
    s.view.render(1, 16);
    s.view.onEvents([{ e: 'projectileFired', tick: 10, pid: 9, from: 1, targetId: 2, toX: 600_000, travelTicks: 10, visualId: 'proj.rock' } as SimEvent]);
    const shot = s.view.layers.projectiles.children.at(-1)!;
    const from = shot.x;
    // the target walks 2 lu a tick toward the shooter while the shot flies (10 ticks)
    for (let t = 0; t < 10; t++) {
      target.prevX = target.x;
      target.x -= 2000;
      s.state.tick++;
      for (let f = 0; f < 3; f++) s.view.render((f + 1) / 3, 50 / 3);
    }
    expect(shot.x - from).toBeCloseTo(-20, 0);
  });

  it('slows the whole match for a beat when a Legendary falls, only for a host that scales its clock', () => {
    const fall = (o: Parameters<typeof setup>[1]): number => {
      const s = setup(true, o);
      s.state.units.push(unitState(1, 0, 'bonker', 480), unitState(2, 1, 'matriarch', 517));
      s.view.render(1, 16);
      s.view.onEvents([diedEv(2, 'matriarch', 517)]);
      return s.view.simTimeScale;
    };
    expect(fall({ timeScaleHost: true })).toBeCloseTo(0.4, 5);
    expect(fall({})).toBe(1);
    expect(fall({ timeScaleHost: true, live: true })).toBe(1);
    expect(fall({ timeScaleHost: true, reduceMotion: true })).toBe(1);
    // the beat passes: back to full speed within about a second
    const s = setup(true, { timeScaleHost: true });
    s.state.units.push(unitState(1, 0, 'bonker', 480), unitState(2, 1, 'matriarch', 517));
    s.view.render(1, 16);
    s.view.onEvents([diedEv(2, 'matriarch', 517)]);
    for (let i = 0; i < 70; i++) s.view.render(1, 1000 / 60);
    expect(s.view.simTimeScale).toBe(1);
  });
});

describe('A7 sound hooks in the view', () => {
  it('pans a world sound by its screen position (up to 0.6) and fades it past the view, at most 12 dB', () => {
    const s = setup();
    duel(s, 2);
    s.audio.clear();
    s.view.onEvents([hitEv()]);
    const near = s.audio.calls.find((c) => c.method === 'play' && c.id === 'hit_blunt');
    const sx = s.view.camera.worldToScreen(517, 0).x;
    const want = Math.round(Math.max(-1, Math.min(1, (sx - 640) / 640)) * 0.6 * 100) / 100;
    expect(near && near.method === 'play' ? (near.o?.pan ?? 0) : NaN).toBeCloseTo(want, 2);
    expect(near && near.method === 'play' ? near.o?.volumeDb : NaN).toBeUndefined();
    s.audio.clear();
    s.view.onEvents([hitEv({ targetId: 99, sourceId: 0, sourceKind: 'unit', x: 2_300_000 })]);
    const far = s.audio.calls.find((c) => c.method === 'play' && c.id === 'hit_blunt');
    expect(far && far.method === 'play' ? far.o : null).toMatchObject({ pan: 0.6, volumeDb: -12 });
  });

  it('places a melee swing like its blow: off screen the anticipation is never louder than the impact (review A, S2)', () => {
    const s = setup();
    s.state.units.push(unitState(1, 0, 'bonker', 2300), unitState(2, 1, 'bonker', 2337));
    s.view.render(1, 16);
    s.audio.clear();
    s.view.onEvents([{ e: 'attackStarted', tick: 10, id: 1, targetId: 2, windupTicks: 8, attackIndex: 0 } as SimEvent, hitEv({ x: 2_337_000 })]);
    // the swing sounds 80 ms before its impact (a delayed play)
    for (let i = 0; i < 30; i++) s.view.render(1, 1000 / 60);
    const play = (id: string) => s.audio.calls.find((c) => c.method === 'play' && c.id === id);
    const swing = play('swing_whoosh');
    const blow = play('hit_blunt');
    expect(swing && swing.method === 'play' ? swing.o : null).toMatchObject({ pan: 0.6, volumeDb: -12 });
    expect(blow && blow.method === 'play' ? blow.o : null).toMatchObject({ pan: 0.6, volumeDb: -12 });
  });

  it('keeps the battle ambience at the share of engaged units, and quiet while paused and after the battle', () => {
    const audio = new AmbienceAudio();
    const s = setup(true, { audio });
    duel(s, 30);
    expect(audio.levels.at(-1)).toBeCloseTo(2 / 12, 2);
    s.view.setPaused(true);
    for (let i = 0; i < 20; i++) s.view.render(1, 1000 / 60);
    expect(audio.levels.at(-1)).toBe(0);
    s.view.setPaused(false);
    for (let i = 0; i < 20; i++) s.view.render(1, 1000 / 60);
    expect(audio.levels.at(-1)).toBeGreaterThan(0);
    s.view.destroy();
    expect(audio.levels.at(-1)).toBe(0);
  });
});

describe('A3 global freezes and live matches', () => {
  it('a Legendary death freezes the match clock offline, never in a live match', () => {
    const offline = setup();
    offline.state.units.push(unitState(1, 0, 'bonker', 480), unitState(2, 1, 'matriarch', 517));
    offline.view.render(1, 16);
    offline.view.onEvents([diedEv(2, 'matriarch', 517)]);
    expect(offline.view.simFrozen).toBe(true);
    const live = setup(true, { live: true });
    live.state.units.push(unitState(1, 0, 'bonker', 480), unitState(2, 1, 'matriarch', 517));
    live.view.render(1, 16);
    live.view.onEvents([diedEv(2, 'matriarch', 517)]);
    expect(live.view.simFrozen).toBe(false);
  });
});
