/**
 * Visible battle damage in the battle view (queue item 40, design 3.4 and 6): a step plays its burst and a quiet
 * material sound within the rate limits, never for a frozen or off-view unit, never on a fast-forward frame; damaged
 * units' emitters spawn on game time, on at most the capped number of units (biggest and nearest the middle first),
 * Lite at half rate and without sparks, Reduce motion with half the smoke and no sparks. Live matches gain no freeze.
 */
import type { MatchConfig, SimEvent, SimState, UnitState } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import { DAMAGE_TUNING_DEFAULTS, DamageFeel, type DamageEmitterInfo, type DamageHost, type DamageStepInfo, type DamageUnit } from '../damageFeel';
import { EventMapper } from '../eventMapper';
import { defaultFeelConfig, feelRule } from '../feelConfig';
import type { ViewAction } from '../types';
import { mulberry32 } from '@/core';

interface Emitted {
  id: string;
  x: number;
  y: number;
  priority: number;
  opts?: Record<string, number>;
}

function host(o: Partial<{ lite: boolean; reduce: boolean; mobile: boolean; near: (x: number) => boolean }> = {}) {
  const emitted: Emitted[] = [];
  const executed: ViewAction[] = [];
  const mapper = new EventMapper({ content: fakeMatchConfig().content, feel: defaultFeelConfig, mySide: 0, rng: mulberry32(1) });
  const h: DamageHost = {
    particles: {
      emit: (id, _count, priority, at, opts) => {
        emitted.push({ id, x: at.x, y: at.y, priority, ...(opts?.opts ? { opts: opts.opts } : {}) });
        return 1;
      },
    },
    rule: (key, t, out) => mapper.rule(key, t, out),
    exec: (a) => executed.push(a),
    nearView: o.near ?? (() => true),
    viewMid: () => 1000,
    lite: () => o.lite ?? false,
    reduce: () => o.reduce ?? false,
    mobile: () => o.mobile ?? false,
    tuning: () => DAMAGE_TUNING_DEFAULTS,
    teamOf: () => 0x3a7bd5,
  };
  return { feel: new DamageFeel(h), emitted, executed };
}

function unit(id: number, o: Partial<DamageUnit> & { stage?: number; fx?: DamageEmitterInfo[] } = {}): DamageUnit {
  const fx = o.fx ?? [{ kind: 'smokeDark', x: -10, y: -40, rate: 2, size: 8 }, { kind: 'fire', x: 4, y: -44, rate: 3, size: 6 }, { kind: 'spark', x: 0, y: -30, rate: 1.4, size: 4 }];
  return {
    id,
    side: 0,
    drawX: 1000,
    y: 0,
    sizeLu: 48,
    dying: false,
    frozen: false,
    view: { root: { visible: true }, damageStage: o.stage ?? 3, damageFx: () => fx },
    ...o,
  };
}

const step = (o: Partial<DamageStepInfo> = {}): DamageStepInfo => ({ stage: 2, prev: 1, mend: false, x: 3, y: -30, spot: true, mat: 'metal', kind: 'blunt', family: 'vehicle', heightLu: 60, ignite: false, ...o });

describe('a damage step in the battle view', () => {
  it('plays its burst at the new mark, along the blow, with the material sound 4 dB under the hit (big bodies)', () => {
    const { feel, emitted, executed } = host();
    feel.update(16, []);
    feel.step({ ...unit(1), hitDir: -1, drawX: 500, y: 8 }, step({ mat: 'metal', stage: 2 }));
    const fx = executed.find((a) => a.a === 'fx');
    expect(fx).toMatchObject({ a: 'fx', effectId: 'fx.dmg_burst', at: { k: 'world', x: 503, y: -22 }, priority: 0 });
    expect((fx as { opts: Record<string, number> }).opts).toMatchObject({ mat: 2, stage: 2, dir: -1, size: 1, groundLu: 30 });
    const snd = executed.find((a) => a.a === 'sound');
    expect(snd).toMatchObject({ id: 'dmg_clank', volumeDb: -4, priority: 0, gap: { key: 'dmg:dmg_clank', gapMs: 200 } });
    expect(emitted).toEqual([]);
    // no hit-stop, shake, kick or flash is ever added
    expect(executed.some((a) => ['freeze', 'unitFreeze', 'trauma', 'kick', 'screenFlash', 'unitFlash', 'cameraPunch'].includes(a.a))).toBe(false);
  });

  it('small bodies sound only their last step; a machine catching fire whumps; a mend glints without a sound', () => {
    const a = host();
    a.feel.step(unit(1, { sizeLu: 24 }), step({ mat: 'cloth', stage: 2 }));
    expect(a.executed.some((x) => x.a === 'sound')).toBe(false);
    a.feel.step(unit(2, { sizeLu: 24 }), step({ mat: 'cloth', stage: 3 }));
    expect(a.executed.filter((x) => x.a === 'sound').map((x) => (x as { id: string }).id)).toEqual(['dmg_rip']);
    const b = host();
    b.feel.step(unit(3), step({ stage: 3, ignite: true }));
    expect(b.executed.filter((x) => x.a === 'fx').map((x) => (x as { effectId: string }).effectId)).toEqual(['fx.dmg_burst', 'fx.dmg_ignite']);
    expect(b.executed.filter((x) => x.a === 'sound').map((x) => (x as { id: string }).id)).toEqual(['dmg_clank', 'dmg_ignite']);
    const c = host();
    c.feel.step(unit(4), step({ mend: true, stage: 1, prev: 2 }));
    expect(c.executed.map((x) => x.a)).toEqual(['fx']);
    expect((c.executed[0] as { effectId: string }).effectId).toBe('fx.dmg_mend');
  });

  it('is silent for a frozen, dying, hidden or off-view unit and on a fast-forward frame; at most 3 bursts per 250 ms', () => {
    const { feel, executed } = host({ near: (x) => x < 1500 });
    feel.step(unit(1, { frozen: true }), step());
    feel.step(unit(2, { dying: true }), step());
    feel.step(unit(3, { drawX: 2000 }), step());
    expect(executed).toEqual([]);
    feel.update(150, []);
    feel.step(unit(4), step());
    expect(executed).toEqual([]);
    feel.update(16, []);
    for (let i = 0; i < 6; i++) feel.step(unit(10 + i), step());
    expect(executed.filter((a) => a.a === 'fx').length).toBe(3);
    feel.update(260, []);
    feel.update(16, []);
    feel.step(unit(20), step());
    expect(executed.filter((a) => a.a === 'fx').length).toBe(4);
  });

  it('every material and stage has its rule; the rules carry no freeze, shake or kick', () => {
    for (const mat of ['cloth', 'hide', 'metal', 'wood', 'stone', 'glass', 'energy']) {
      for (const st of [1, 2, 3]) {
        const r = feelRule(defaultFeelConfig, `damage.step.${mat}.${st}`);
        expect(r.particles?.[0]?.effectId, `${mat}.${st}`).toBe('fx.dmg_burst');
        expect(r.sound, `${mat}.${st}`).toMatch(/^dmg_/);
        expect(r.hitstopGlobalMs ?? 0).toBe(0);
        expect(r.trauma ?? 0).toBe(0);
        expect(r.kickPx ?? 0).toBe(0);
        expect(r.flashMs ?? 0).toBe(0);
      }
    }
  });
});

describe('the emitters of damaged units', () => {
  it('spawn on game time at their rates, in world space, at the lowest priority', () => {
    const { feel, emitted } = host();
    const u = unit(1, { drawX: 700, y: 10 });
    for (let i = 0; i < 60; i++) feel.update(1000 / 60, [u]);
    const by = (id: string): number => emitted.filter((e) => e.id === id).length;
    expect(by('fx.dmg_smoke_dark')).toBe(2);
    expect(by('fx.dmg_fire')).toBe(3);
    expect(by('fx.dmg_spark')).toBe(1);
    expect(emitted.every((e) => e.priority === 0)).toBe(true);
    expect(emitted.find((e) => e.id === 'fx.dmg_smoke_dark')).toMatchObject({ x: 690, y: -30 });
    // the same game time in other frame sizes spawns the same
    const b = host();
    const u2 = unit(1);
    for (let i = 0; i < 20; i++) b.feel.update(50, [u2]);
    expect(b.emitted.length).toBe(emitted.length);
  });

  it('emit on at most 12 units on desktop and 8 on mobile, the biggest and nearest the middle first; none below stage 2 or off view', () => {
    const units = Array.from({ length: 20 }, (_, i) => unit(i + 1, { drawX: 400 + i * 60, sizeLu: i < 4 ? 80 : 24, fx: [{ kind: 'smoke', x: 0, y: -30, rate: 10, size: 6 }] }));
    const desk = host();
    desk.feel.update(100, units);
    const xs = new Set(desk.emitted.map((e) => e.x));
    expect(xs.size).toBe(12);
    // the four huge bodies always emit
    for (let i = 0; i < 4; i++) expect(xs.has(400 + i * 60)).toBe(true);
    const mob = host({ mobile: true });
    mob.feel.update(100, units);
    expect(new Set(mob.emitted.map((e) => e.x)).size).toBe(8);
    const none = host({ near: () => false });
    none.feel.update(100, [unit(1), unit(2, { stage: 1 })]);
    expect(none.emitted).toEqual([]);
    const low = host();
    low.feel.update(100, [unit(2, { stage: 1 })]);
    expect(low.emitted).toEqual([]);
  });

  it('Graphics Lite: at most 4 units at half rate, no sparks; Reduce motion: half the smoke, no sparks', () => {
    const units = Array.from({ length: 6 }, (_, i) => unit(i + 1, { drawX: 800 + i * 40 }));
    const lite = host({ lite: true });
    for (let i = 0; i < 60; i++) lite.feel.update(1000 / 60, units);
    // one fire emitter per unit (at x + 4): four units emit, the four nearest the middle (1000)
    expect([...new Set(lite.emitted.filter((e) => e.id === 'fx.dmg_fire').map((e) => e.x))].sort((a, b) => a - b)).toEqual([884, 924, 964, 1004]);
    expect(lite.emitted.filter((e) => e.id === 'fx.dmg_spark')).toEqual([]);
    // half rate: fire 3/s makes 1 in a second (not 3), dark smoke 2/s makes 1
    expect(lite.emitted.filter((e) => e.id === 'fx.dmg_fire' && e.x === 1004).length).toBe(1);
    expect(lite.emitted.filter((e) => e.id === 'fx.dmg_smoke_dark' && e.x === 990).length).toBe(1);
    const red = host({ reduce: true });
    const u = unit(1);
    for (let i = 0; i < 60; i++) red.feel.update(1000 / 60, [u]);
    expect(red.emitted.filter((e) => e.id === 'fx.dmg_spark')).toEqual([]);
    expect(red.emitted.filter((e) => e.id === 'fx.dmg_smoke_dark').length).toBe(1);
    expect(red.emitted.every((e) => e.opts?.['reduce'] === 1)).toBe(true);
  });

  it('a fast-forward frame spawns at most one particle per emitter', () => {
    const { feel, emitted } = host();
    feel.update(2000, [unit(1)]);
    expect(emitted.filter((e) => e.id === 'fx.dmg_fire').length).toBe(1);
  });
});

describe('the battle view wires it', () => {
  type FakeUnit = ReturnType<FakeArtProvider['createUnit']>;
  interface Spy {
    reacts: { tier: string; dir: number; kind?: string; effective?: boolean }[];
    freezes: number;
    step?: (e: DamageStepInfo) => void;
  }
  /** Fake art whose unit views have the combat and damage hooks (stage 3, one dark smoke emitter). */
  class DamageArt extends FakeArtProvider {
    readonly views: (FakeUnit & Spy)[] = [];
    override createUnit(o: Parameters<FakeArtProvider['createUnit']>[0]): FakeUnit {
      const v = super.createUnit(o) as FakeUnit & Spy & Record<string, unknown>;
      Object.assign(v, {
        reacts: [],
        freezes: 0,
        react: (tier: string, dir: number, kind?: string, effective?: boolean) => void v.reacts.push({ tier, dir, kind, effective }),
        damageStage: 3,
        onDamageStep: (cb: (e: DamageStepInfo) => void) => void (v.step = cb),
        damageFx: (): DamageEmitterInfo[] => [{ kind: 'smokeDark', x: 0, y: -30, rate: 6, size: 6 }],
      });
      const freeze = v.freeze.bind(v);
      v.freeze = (ms: number) => {
        v.freezes++;
        freeze(ms);
      };
      this.views.push(v);
      return v;
    }
    created(id: string): number {
      return this.calls.filter((c) => c.method === 'createEffect' && c.args[0] === id).length;
    }
  }
  const unitState = (id: number, side: 0 | 1, x: number, o: Partial<UnitState> = {}): UnitState => ({
    id, side, card: 'bonker', level: 1, x: x * 1000, prevX: x * 1000, hp: 40_000, maxHp: 40_000, shield: 0, innateShield: 0,
    mode: 'walk', attacks: [{ targetId: -1, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 }], statuses: [],
    air: false, summoned: false, timers: [], lastDamageTick: 0, ...o,
  });

  it("passes the blow's kind to react, and a step plays its burst and clank with no freeze in a live match; emitters spawn", () => {
    let config: MatchConfig = fakeMatchConfig();
    config = { ...config, sides: [config.sides[0], { ...config.sides[1], online: { name: 'Mira', avatar: 'a1', trophies: 1200 } }] as unknown as MatchConfig['sides'] };
    const state = { tick: 10, phase: 'regulation', sides: [], units: [], projectiles: [], casts: [], traps: [], rng: [1, 2, 3, 4], nextId: 1, outcome: null, hashes: [] } as unknown as SimState;
    (state as unknown as { sides: unknown[] }).sides = [0, 1].map(() => ({ ageIndex: 0, gold: 0, xp: 0, baseHp: 1_000_000, baseMaxHp: 1_000_000, turrets: [null, null, null, null], mountsOwned: 1, treasury: 0, lastStand: 'idle', stance: 'charge', holdP: 0, queue: [], pop: 0, research: { owned: [], cur: -1, startTick: 0, endTick: 0, paid: 0 }, powerPpm: [0, 0], ascendUntil: 0 }));
    const art = new DamageArt();
    const audio = new FakeAudio();
    const labels = (): { root: Container; setText: (s: string) => void; setStyle: () => void } => {
      const root = new Container();
      return { root, setText: (t) => (root.label = t), setStyle: () => {} };
    };
    const view = new BattleView({ sim: { state, config }, art, audio, labelFactory: labels, settings: { reduceMotion: false } });
    view.resize(1280, 720);
    view.setPaused(false);
    state.units.push(
      unitState(1, 0, 480, { mode: 'attack', attacks: [{ targetId: 2, impactTick: 18, nextAttackTick: 30, lastAttackTick: 10 }] }),
      unitState(2, 1, 517, { mode: 'attack', attacks: [{ targetId: 1, impactTick: 18, nextAttackTick: 30, lastAttackTick: 10 }] }),
    );
    for (let i = 0; i < 30; i++) view.render(1, 1000 / 60);
    const vb = art.views[1]!;
    view.onEvents([{ e: 'hit', tick: 10, targetId: 2, sourceId: 1, sourceCard: 'bonker', castId: null, sourceKind: 'unit', damage: 2000, shieldAbsorbed: 0, heavy: false, modBp: 15000, x: 517_000, dmgType: 'pierce' } as SimEvent]);
    expect(vb.reacts.at(-1)).toEqual({ tier: 'light', dir: 1, kind: 'pierce', effective: true });
    for (const v of art.views) v.freezes = 0;
    // the view crosses its last step: the burst and the material sound (quiet), and nothing holds the frame
    expect(typeof vb.step).toBe('function');
    const bursts = art.created('fx.dmg_burst');
    vb.step?.(step({ stage: 3, prev: 2, mat: 'metal', kind: 'pierce' }));
    view.render(1, 1000 / 60);
    expect(art.created('fx.dmg_burst')).toBe(bursts + 1);
    expect(audio.played()).toContain('dmg_clank');
    expect(art.views.reduce((n, v) => n + v.freezes, 0)).toBe(0);
    expect((view as unknown as { director: { freeze: { frozen: boolean } } }).director.freeze.frozen).toBe(false);
    // both units are at stage 3: their emitters spawn on game time
    for (let i = 0; i < 30; i++) view.render(1, 1000 / 60);
    expect(art.created('fx.dmg_smoke_dark')).toBeGreaterThan(0);
    view.destroy();
  });
});
