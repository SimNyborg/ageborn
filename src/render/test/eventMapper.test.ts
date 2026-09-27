import type { CompiledContent, SimEvent, UnitDef } from '@/contracts';
import { fakeContent } from '@/contracts/fakes/content';
import { cannedBattleEvents } from '@/contracts/fakes/sim';
import { mulberry32 } from '@/core';
import { describe, expect, it } from 'vitest';
import {
  EventMapper,
  coinCount,
  crumbleStage,
  decodeTurretSource,
  hitSoundFor,
  sparkFor,
  transposeAfter,
  type UnitInfo,
} from '../eventMapper';
import { defaultFeelConfig } from '../feelConfig';
import type { ViewAction } from '../types';
import { A13_SOUND_IDS, A14_EFFECT_IDS, A14_MUSIC_CUES } from './designIds';

/** Fake content plus a mech Heavy and a Legendary, for the death rules. */
function testContent(): CompiledContent {
  const base = fakeContent.units['tuskback'] as UnitDef;
  const units: Record<string, UnitDef> = {
    ...fakeContent.units,
    tankette: { ...base, id: 'tankette', group: 'heavy', tags: ['armored', 'mech', 'ground'], sfx: { spawn: 'spawn_heavy', die: 'die_mech' } },
    matriarch: { ...base, id: 'matriarch', group: 'legendary', rarity: 'legendary', sfx: { spawn: 'spawn_legendary', die: 'die_bio' } },
  };
  return { ...fakeContent, units };
}

const T = 10;
/** The body of the event kind `E` (distributes over members whose `e` is a union of kinds). */
type EvBody<E extends SimEvent['e']> = SimEvent extends infer U ? (U extends { e: infer K } ? (E extends K ? Omit<U, 'e' | 'tick'> : never) : never) : never;
function ev<E extends SimEvent['e']>(e: E, body: EvBody<E>): SimEvent {
  return { e, tick: T, ...body } as unknown as SimEvent;
}

const UNITS: Record<number, UnitInfo> = {
  1: { side: 0, card: 'bonker', x: 500 },
  2: { side: 1, card: 'pebbler', x: 700 },
  3: { side: 1, card: 'tankette', x: 720 },
  4: { side: 1, card: 'matriarch', x: 760 },
  5: { side: 0, card: 'tuskback', x: 480 },
};

function mapper(rngSeed = 1): EventMapper {
  return new EventMapper({ content: testContent(), feel: defaultFeelConfig, mySide: 0, rng: mulberry32(rngSeed) });
}

function run(events: SimEvent[], m = mapper()): ViewAction[] {
  return m.map(events, (id) => UNITS[id]);
}

function pick<A extends ViewAction['a']>(out: ViewAction[], a: A): Extract<ViewAction, { a: A }>[] {
  return out.filter((x): x is Extract<ViewAction, { a: A }> => x.a === a);
}

function hit(o: Partial<Extract<SimEvent, { e: 'hit' }>> = {}): SimEvent {
  return ev('hit', {
    targetId: 2, sourceId: 1, sourceCard: 'bonker', castId: null, sourceKind: 'unit', damage: 2000,
    shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 700_000, dmgType: 'blunt', ...o,
  });
}

function died(o: Partial<Extract<SimEvent, { e: 'died' }>> = {}): SimEvent {
  return ev('died', {
    id: 2, side: 1, card: 'pebbler', killerId: 1, killerCard: 'bonker', killerKind: 'unit', killerSide: 0,
    bountyGold: 45_000, bountyXp: 75_000, x: 700_000, ...o,
  });
}

describe('event mapper: A12 hits', () => {
  it('light hit: victim flash 60 ms, 3 sparks by damage type, hit_<type>, no hitstop or trauma', () => {
    const out = run([hit()]);
    expect(pick(out, 'unitFlash')).toEqual([{ a: 'unitFlash', id: 2, ms: 60 }]);
    expect(pick(out, 'fx')).toMatchObject([{ effectId: 'fx.spark_blunt', count: 3 }]);
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['hit_blunt']);
    expect(pick(out, 'unitFreeze')).toEqual([]);
    expect(pick(out, 'trauma')).toEqual([]);
    expect(pick(out, 'unitClip')).toMatchObject([{ id: 2, clip: 'hit' }]);
  });

  it('heavy hit: local hitstop victim 70 / attacker 50 with jitter, trauma 0.05, flash 80, 6 sparks and dust', () => {
    const out = run([hit({ heavy: true, dmgType: 'slash' })]);
    expect(pick(out, 'unitFreeze')).toEqual([
      { a: 'unitFreeze', id: 2, ms: 70, jitterPx: 2 },
      { a: 'unitFreeze', id: 1, ms: 50 },
    ]);
    expect(pick(out, 'trauma')).toMatchObject([{ amount: 0.05, dir: { x: 1, y: 0 } }]);
    expect(pick(out, 'unitFlash')).toEqual([{ a: 'unitFlash', id: 2, ms: 80 }]);
    expect(pick(out, 'fx')).toMatchObject([
      { effectId: 'fx.spark_slash', count: 6 },
      { effectId: 'fx.dust_poof', count: 2 },
    ]);
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['hit_heavy']);
    expect(pick(out, 'freeze')).toEqual([]);
  });

  it('shows the effective spark at >= x1.5 and the resisted puff at <= x0.75', () => {
    expect(sparkFor('pierce', 15000)).toBe('fx.spark_effective');
    expect(sparkFor('pierce', 7500)).toBe('fx.puff_resisted');
    expect(sparkFor('laser', 10000)).toBe('fx.scorch_laser');
    expect(hitSoundFor('pierce', 15000)).toBe('hit_effective');
    expect(hitSoundFor('blast', 10000)).toBe('explosion_s');
    expect(hitSoundFor('bullet', 10000)).toBe('hit_bullet');
    const out = run([hit({ modBp: 20000 })]);
    expect(pick(out, 'fx')[0]?.effectId).toBe('fx.spark_effective');
  });

  it('numbers: powers, base damage and own turret kills are Important; plain hits are not', () => {
    const plain = pick(run([hit()]), 'number');
    expect(plain).toMatchObject([{ kind: 'damage', value: 20, important: false }]);
    const power = pick(run([hit({ sourceKind: 'power', sourceId: -1, castId: 4 })]), 'number');
    expect(power).toMatchObject([{ kind: 'power', important: true, key: 'c4:2' }]);
    const turretKill = pick(run([hit({ sourceKind: 'turret', sourceId: -10 }), died({ killerId: -10, killerKind: 'turret' })]), 'number');
    expect(turretKill[0]).toMatchObject({ kind: 'kill', important: true });
    const enemyTurret = pick(run([hit({ targetId: 1, sourceKind: 'turret', sourceId: -14 })]), 'number');
    expect(enemyTurret[0]).toMatchObject({ kind: 'damage', important: false });
    const base = pick(run([ev('baseDamaged', { side: 1, sourceId: 1, damage: 4000, hp: 996_000, maxHp: 1_000_000 })]), 'number');
    expect(base).toMatchObject([{ kind: 'base', value: 40, important: true }]);
  });
});

describe('event mapper: A12 deaths', () => {
  it('unit death: local 50 ms, trauma 0.1, 10 dust, KO stars, die sound; coins and XP fly for player kills', () => {
    const out = run([died()]);
    expect(pick(out, 'unitDie')).toEqual([{ a: 'unitDie', id: 2 }]);
    expect(pick(out, 'unitFreeze')).toEqual([{ a: 'unitFreeze', id: 2, ms: 50 }]);
    expect(pick(out, 'trauma')).toMatchObject([{ amount: 0.1 }]);
    expect(pick(out, 'fx')).toMatchObject([
      { effectId: 'fx.dust_poof', count: 10 },
      { effectId: 'fx.ko_stars', count: 1 },
    ]);
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['die_bio']);
    expect(pick(out, 'fxFly')).toMatchObject([
      { effectId: 'fx.coin', to: 'gold', count: 2 },
      { effectId: 'fx.xp_sparkle', to: 'xp' },
    ]);
    expect(pick(out, 'freeze')).toEqual([]);
  });

  it('no coins for enemy kills of your units', () => {
    const out = run([died({ id: 1, side: 0, card: 'bonker', killerId: 2, killerSide: 1 })]);
    expect(pick(out, 'fxFly')).toEqual([]);
  });

  it('heavy death: 70 ms and trauma 0.15; Legendary death freezes globally for 80 ms', () => {
    const heavy = run([died({ id: 5, side: 0, card: 'tuskback', killerSide: 1 })]);
    expect(pick(heavy, 'unitFreeze')).toEqual([{ a: 'unitFreeze', id: 5, ms: 70 }]);
    expect(pick(heavy, 'trauma')).toMatchObject([{ amount: 0.15 }]);
    const leg = run([died({ id: 4, card: 'matriarch' })]);
    expect(pick(leg, 'freeze')).toEqual([{ a: 'freeze', ms: 80, exempt: false }]);
  });

  it('mech death: trauma 0.12, flash 60 ms, die_mech; 1 in 3 explodes (cosmetic RNG)', () => {
    const m = mapper(9);
    let explosions = 0;
    const n = 600;
    for (let i = 0; i < n; i++) {
      const out = m.map([died({ id: 3, card: 'tankette' })], (id) => UNITS[id]);
      expect(pick(out, 'trauma').map((t) => t.amount)).toEqual([0.15, 0.12]);
      expect(pick(out, 'unitFlash')).toEqual([{ a: 'unitFlash', id: 3, ms: 60 }]);
      expect(pick(out, 'sound')[0]?.id).toBe('die_mech');
      if (pick(out, 'fx').some((f) => f.effectId === 'fx.explosion_s')) explosions++;
    }
    expect(explosions / n).toBeGreaterThan(0.25);
    expect(explosions / n).toBeLessThan(0.42);
  });

  it('coin count follows the bounty (1-4)', () => {
    expect(coinCount(10_000)).toBe(1);
    expect(coinCount(45_000)).toBe(2);
    expect(coinCount(90_000)).toBe(4);
    expect(coinCount(900_000)).toBe(4);
  });
});

describe('event mapper: turrets, bases, powers', () => {
  it('turret shot: fire clip, 1-frame muzzle, 3 smoke, the turret sound', () => {
    const m = mapper();
    const out = run([ev('turretBuilt', { side: 1, mount: 0, card: 'rock_tosser' }), ev('turretFired', { side: 1, mount: 0, targetId: 1 })], m);
    expect(pick(out, 'turret').map((t) => t.op)).toEqual(['built', 'fire']);
    expect(pick(out, 'fx')).toMatchObject([
      { effectId: 'fx.muzzle', count: 1 },
      { effectId: 'fx.dust_poof', count: 3 },
    ]);
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['shot_catapult']);
    expect(decodeTurretSource(-10)).toEqual({ side: 0, mount: 0 });
    expect(decodeTurretSource(-17)).toEqual({ side: 1, mount: 3 });
    expect(decodeTurretSource(-1)).toBeNull();
  });

  it('base hit: trauma 0.2 at most once per 0.5 s, base flash 60 ms, 4 chunks, base_hit; crumble at 75/50/25%', () => {
    const out = run([ev('baseDamaged', { side: 0, sourceId: 2, damage: 300_000, hp: 700_000, maxHp: 1_000_000 })]);
    expect(pick(out, 'trauma')).toMatchObject([{ amount: 0.2, gap: { gapMs: 500 } }, { amount: 0.15 }]);
    expect(pick(out, 'baseFlash')).toEqual([{ a: 'baseFlash', side: 0, ms: 60 }]);
    expect(pick(out, 'fx')[0]).toMatchObject({ effectId: 'fx.debris', count: 4 });
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['base_hit', 'base_crumble']);
    expect([crumbleStage(80, 100), crumbleStage(75, 100), crumbleStage(50, 100), crumbleStage(25, 100)]).toEqual([0, 1, 2, 3]);
  });

  it('power telegraph and power lands: global 120 ms, trauma 0.5, 1-frame 30% white, duck 6 dB for 1.5 s', () => {
    const tel = run([ev('powerTelegraph', { side: 0, power: 'stampede', castId: 1, x: 700_000, zone: 500_000 })]);
    expect(pick(tel, 'telegraph')).toEqual([{ a: 'telegraph', side: 0, castId: 1, power: 'stampede', x: 700, zone: 500, ms: 1000 }]);
    expect(pick(tel, 'sound').map((s) => s.id)).toEqual(['power_telegraph']);
    const out = run([ev('powerImpact', { side: 0, power: 'stampede', castId: 1, x: 703_000, index: 0 })]);
    expect(pick(out, 'powerFx')).toMatchObject([{ power: 'stampede', x: 703, index: 0 }]);
    expect(pick(out, 'freeze')).toEqual([{ a: 'freeze', ms: 120, exempt: false }]);
    expect(pick(out, 'trauma')).toMatchObject([{ amount: 0.5 }]);
    expect(pick(out, 'screenFlash')).toEqual([{ a: 'screenFlash', ms: 16, color: 0xffffff, alpha: 0.3 }]);
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['pw_stampede']);
    expect(pick(out, 'duck')).toEqual([{ a: 'duck', db: -6, ms: 1500 }]);
    const more = run([ev('powerImpact', { side: 0, power: 'stampede', castId: 1, x: 703_000, index: 3 })]);
    expect(pick(more, 'freeze')).toEqual([]);
    expect(pick(more, 'sound')).toEqual([]);
  });

  it('Last Stand: armed shows the horn, fire freezes 150 ms with trauma 0.5, red flash 100 ms and the wave', () => {
    const armed = run([ev('lastStandArmed', { side: 1 })]);
    expect(pick(armed, 'baseGlow')).toEqual([{ a: 'baseGlow', side: 1, on: true }]);
    expect(pick(armed, 'sound').map((s) => s.id)).toEqual(['last_stand_armed']);
    const fire = run([ev('lastStandFire', { side: 0 })]);
    expect(pick(fire, 'freeze')).toEqual([{ a: 'freeze', ms: 150, exempt: false }]);
    expect(pick(fire, 'trauma')).toMatchObject([{ amount: 0.5 }]);
    expect(pick(fire, 'screenFlash')[0]).toMatchObject({ ms: 100, color: 0xff3b30 });
    expect(pick(fire, 'fx')[0]).toMatchObject({ effectId: 'fx.last_stand_wave' });
    expect(pick(fire, 'sound').map((s) => s.id)).toEqual(['last_stand_fire']);
  });

  it('base destroyed: 250 ms (exempt), 0.3x slow motion for 1.2 s, trauma 1, flash 200, 120 debris, stinger', () => {
    const out = run([ev('matchEnded', { result: { winner: 0, reason: 'baseDestroyed', tick: T, baseHpBp: [5000, 0] } })]);
    expect(pick(out, 'base')).toEqual([{ a: 'base', side: 1, op: 'collapse' }]);
    expect(pick(out, 'freeze')).toEqual([{ a: 'freeze', ms: 250, exempt: true }]);
    expect(pick(out, 'slowMo')).toEqual([{ a: 'slowMo', scale: 0.3, ms: 1200 }]);
    expect(pick(out, 'trauma')).toMatchObject([{ amount: 1 }]);
    expect(pick(out, 'screenFlash')[0]).toMatchObject({ ms: 200 });
    expect(pick(out, 'fx')[0]).toMatchObject({ effectId: 'fx.debris', count: 120 });
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['base_destroyed']);
    expect(pick(out, 'musicCue')).toEqual([{ a: 'musicCue', cue: 'stinger.victory', fadeMs: 300 }]);
    expect(pick(out, 'cheer')).toEqual([{ a: 'cheer', side: 0 }]);
  });
});

describe('event mapper: evolve sequence (A11, A12, A13)', () => {
  it('own evolve: riser at Ascension; at age up global 100 ms, trauma 0.4, white 120 ms, pillar, fanfare, key change, cheer, morph, wipe', () => {
    const m = mapper();
    const start = m.map([ev('ascendStart', { side: 0, age: 'medieval' })], (id) => UNITS[id]);
    expect(pick(start, 'sound').map((s) => s.id)).toEqual(['evolve_riser']);
    expect(pick(start, 'fx')[0]).toMatchObject({ effectId: 'fx.evolve_pillar' });
    const up = m.map([ev('ageUp', { side: 0, age: 'medieval' })], (id) => UNITS[id]);
    expect(pick(up, 'freeze')).toEqual([{ a: 'freeze', ms: 100, exempt: false }]);
    expect(pick(up, 'trauma')).toMatchObject([{ amount: 0.4 }]);
    expect(pick(up, 'screenFlash')[0]).toMatchObject({ ms: 120, color: 0xffffff });
    expect(pick(up, 'sound').map((s) => s.id)).toEqual(['evolve_fanfare_medieval']);
    expect(pick(up, 'cheer')).toEqual([{ a: 'cheer', side: 0 }]);
    expect(pick(up, 'musicCue')).toEqual([{ a: 'musicCue', cue: 'music.medieval', fadeMs: 600 }]);
    expect(pick(up, 'musicTranspose')).toEqual([{ a: 'musicTranspose', semitones: 2 }]);
    expect(pick(up, 'baseMorph')).toEqual([{ a: 'baseMorph', side: 0, age: 'medieval', ms: 1800 }]);
    expect(pick(up, 'backdropWipe')).toEqual([{ a: 'backdropWipe', side: 0, age: 'medieval', ms: 1500 }]);
  });

  it('enemy evolve: trauma 0.1, smaller pillar, evolve_enemy, no freeze and no key change', () => {
    const up = run([ev('ageUp', { side: 1, age: 'medieval' })]);
    expect(pick(up, 'freeze')).toEqual([]);
    expect(pick(up, 'trauma')).toMatchObject([{ amount: 0.1 }]);
    expect(pick(up, 'fx')[0]).toMatchObject({ effectId: 'fx.evolve_pillar', opts: { small: 1 } });
    expect(pick(up, 'sound').map((s) => s.id)).toEqual(['evolve_enemy']);
    expect(pick(up, 'musicTranspose')).toEqual([]);
    expect(pick(up, 'view')).toEqual([{ a: 'view', ev: { t: 'evolved', side: 1, age: 'medieval' } }]);
  });

  it('transposes +2, +2, +1, +1 over four own evolves', () => {
    expect([1, 2, 3, 4].map(transposeAfter)).toEqual([2, 4, 5, 6]);
  });
});

describe('event mapper: coverage', () => {
  const every: SimEvent[] = [
    ev('unitSpawned', { id: 1, side: 0, card: 'bonker', x: 20_000, summoned: false, level: 5 }),
    ev('attackStarted', { id: 1, targetId: 2, windupTicks: 8, attackIndex: 0 }),
    ev('attackStarted', { id: 2, targetId: 1, windupTicks: 14, attackIndex: 0 }),
    ev('projectileFired', { pid: 9, from: 2, targetId: 1, toX: 500_000, travelTicks: 5, visualId: 'proj.rock' }),
    ev('projectileFired', { pid: 10, from: -14, targetId: 1, toX: 500_000, travelTicks: 7, visualId: 'proj.boulder' }),
    hit(),
    ev('healed', { id: 1, amount: 500 }),
    ev('statusApplied', { id: 1, kind: 'stun', ms: 1000, frozen: true }),
    ev('statusApplied', { id: 1, kind: 'shield', ms: 3000, frozen: false }),
    ev('statusApplied', { id: 1, kind: 'mark', ms: 3000, frozen: false }),
    ev('statusApplied', { id: 1, kind: 'slow', ms: 3000, frozen: false }),
    ev('knockback', { id: 2, fromX: 700_000, toX: 703_000 }),
    ev('abilityUsed', { id: 3, ability: 'emp', x: 720_000 }),
    ev('abilityUsed', { id: 3, ability: 'callStrike', x: 400_000 }),
    died(),
    ev('turretBuildStart', { side: 0, mount: 0, card: 'rock_tosser' }),
    ev('turretBuilt', { side: 0, mount: 0, card: 'rock_tosser' }),
    ev('turretFired', { side: 0, mount: 0, targetId: 2 }),
    ev('turretSold', { side: 0, mount: 0, card: 'rock_tosser' }),
    ev('turretReplaced', { side: 0, mount: 1, card: 'crossbow_nest' }),
    ev('baseDamaged', { side: 1, sourceId: 1, damage: 2000, hp: 998_000, maxHp: 1_000_000 }),
    ev('goldEarned', { side: 0, amount: 30_000, reason: 'bounty', x: 700_000 }),
    ev('goldEarned', { side: 0, amount: 6_000, reason: 'passive' }),
    ev('xpEarned', { side: 0, amount: 4_000, reason: 'passive' }),
    ev('queueChanged', { side: 0 }),
    ev('queueConverted', { side: 0, from: 'bonker', to: 'footman' }),
    ev('mountBought', { side: 0, mount: 1 }),
    ev('treasuryUp', { side: 0, level: 1 }),
    ev('ascendStart', { side: 1, age: 'medieval' }),
    ev('ageUp', { side: 1, age: 'medieval' }),
    ev('powerReady', { side: 0 }),
    ev('powerTelegraph', { side: 1, power: 'arrow_storm', castId: 2, x: 500_000, zone: 450_000 }),
    ev('powerImpact', { side: 1, power: 'arrow_storm', castId: 2, x: 500_000, index: 0 }),
    ev('stanceChanged', { side: 0, stance: 'hold' }),
    ev('lastStandArmed', { side: 0 }),
    ev('lastStandCharge', { side: 0 }),
    ev('lastStandFire', { side: 0 }),
    ev('phaseChanged', { phase: 'overdrive' }),
    ev('phaseChanged', { phase: 'siege' }),
    ev('emote', { side: 1, emote: 'gg' }),
    ev('commandRejected', { side: 0, t: 'train', reason: 'gold' }),
    ev('commandRejected', { side: 1, t: 'train', reason: 'gold' }),
    ev('matchEnded', { result: { winner: 1, reason: 'finalBell', tick: T, baseHpBp: [4000, 6000] } }),
  ];

  it('maps every SimEvent kind without throwing, and only uses IDs from A13 / A14', () => {
    const out = run([...every, ...cannedBattleEvents]);
    for (const a of out) {
      if (a.a === 'fx' || a.a === 'fxFly') {
        const ok = A14_EFFECT_IDS.has(a.effectId);
        expect(ok, `effect ${a.effectId}`).toBe(true);
      }
      if (a.a === 'sound') expect(A13_SOUND_IDS.has(a.id), `sound ${a.id}`).toBe(true);
      if (a.a === 'musicCue') expect(A14_MUSIC_CUES.has(a.cue), `cue ${a.cue}`).toBe(true);
    }
    const kinds = new Set(every.map((e) => e.e));
    expect(kinds.size).toBe(34);
  });

  it('every sound and effect in feel.config.json is a DESIGN id (or a placeholder)', () => {
    for (const [key, r] of Object.entries(defaultFeelConfig.events)) {
      if (r.sound && !r.sound.startsWith('$')) expect(A13_SOUND_IDS.has(r.sound), `${key}: ${r.sound}`).toBe(true);
      for (const p of r.particles ?? []) {
        if (!p.effectId.startsWith('$')) expect(A14_EFFECT_IDS.has(p.effectId), `${key}: ${p.effectId}`).toBe(true);
      }
    }
  });

  it('attack clips are time-scaled so the impact lands on the sim impact tick (B5)', () => {
    const out = run([ev('attackStarted', { id: 1, targetId: 2, windupTicks: 8, attackIndex: 0 })]);
    expect(pick(out, 'unitClip')).toEqual([{ a: 'unitClip', id: 1, clip: 'attack', impactAtMs: 400 }]);
    // Melee swing sound lands just before the impact.
    expect(pick(out, 'sound')).toEqual([{ a: 'sound', id: 'swing_whoosh', delayMs: 320 }]);
  });

  it('emits HUD events for emotes, denied commands (own side only) and the match end', () => {
    const out = run([ev('emote', { side: 1, emote: 'gg' }), ev('commandRejected', { side: 0, t: 'evolve', reason: 'xp' }), ev('commandRejected', { side: 1, t: 'train', reason: 'gold' })]);
    expect(pick(out, 'view').map((v) => v.ev.t)).toEqual(['emote', 'denied']);
    expect(pick(out, 'sound').map((s) => s.id)).toEqual(['emote_pop', 'ui_deny']);
  });
});
