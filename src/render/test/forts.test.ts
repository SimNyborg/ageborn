/**
 * Forts in the render layer (DESIGN A16.14.8): the fort feel table covers the content, the event mapper
 * turns fort events into the placing thud, the build pop, the material hit, the collapse, the trap snap
 * or blast and the camp's levy pulse, and the fort pose follows the sim's scaffold, decay, Suppress and
 * shot timer.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent, UnitState } from '@/contracts';
import { content } from '@/content';
import { mulberry32 } from '@/core';
import { sounds } from '@/audio/sounds';
import { EventMapper, type UnitInfo } from '../eventMapper';
import { defaultFeelConfig } from '../feelConfig';
import { FORT_MATERIAL, FORT_SOUNDS, fortHitSound } from '../fortFeel';
import { fortCrumble, fortPoseOf, FortUnitView, scaffoldMsFor } from '../fortViews';
import type { ViewAction } from '../types';

const T = 100;
function ev(e: Record<string, unknown>): SimEvent {
  return { tick: T, ...e } as unknown as SimEvent;
}

const UNITS: Record<number, UnitInfo> = {
  10: { side: 0, card: 'palisade', x: 300 },
  11: { side: 0, card: 'war_camp', x: 230 },
  12: { side: 1, card: 'tuskback', x: 330 },
  13: { side: 0, card: 'cave_youth', x: 230 },
};

function run(events: SimEvent[], m = new EventMapper({ content, feel: defaultFeelConfig, mySide: 0, rng: mulberry32(1) })): ViewAction[] {
  return m.map(events, (id) => UNITS[id]);
}

const sound = (out: ViewAction[]): string[] => out.filter((a): a is Extract<ViewAction, { a: 'sound' }> => a.a === 'sound').map((a) => a.id);

describe('fort feel data', () => {
  it('names a material for every fort card, and every fort sound exists', () => {
    expect(Object.keys(FORT_MATERIAL).sort()).toEqual(Object.keys(content.forts).sort());
    for (const id of Object.values(FORT_SOUNDS)) expect(sounds[id], id).toBeDefined();
    for (const card of Object.keys(content.forts)) expect(sounds[fortHitSound(card)], card).toBeDefined();
  });
});

describe('fort events (A16.14.8)', () => {
  it('a placement thuds, raises dust and holds the fort for 40 ms; its twin plays no unit spawn', () => {
    const out = run([
      ev({ e: 'unitSpawned', id: 10, side: 0, card: 'palisade', x: 300000, summoned: false, level: 1 }),
      ev({ e: 'fortPlaced', side: 0, id: 10, card: 'palisade', pad: 2, x: 300000, cost: 125 }),
    ]);
    expect(out.some((a) => a.a === 'unitSpawn' && a.id === 10)).toBe(true);
    expect(out.some((a) => a.a === 'unitClip' && a.id === 10)).toBe(false);
    expect(sound(out)).toEqual([FORT_SOUNDS.place, FORT_SOUNDS.build]);
    expect(out.some((a) => a.a === 'unitFreeze' && a.id === 10 && a.ms === 40)).toBe(true);
    expect(out.some((a) => a.a === 'fx' && a.effectId === 'fx.fort_scaffold_dust')).toBe(true);
  });

  it('completion pops the fort and plays its chime', () => {
    const out = run([ev({ e: 'fortBuilt', id: 10 })]);
    expect(out.some((a) => a.a === 'fortClip' && a.id === 10 && a.clip === 'build')).toBe(true);
    expect(sound(out)).toContain(FORT_SOUNDS.complete);
  });

  it('hits on a fort sound like its material', () => {
    const out = run([ev({ e: 'hit', targetId: 10, sourceId: 12, sourceKind: 'unit', damage: 2000, dmgType: 'blunt', modBp: 10000, heavy: false, x: 300000, castId: null })]);
    expect(sound(out)).toContain('fort_hit_wood');
  });

  it('a destroyed fort collapses with debris, dust and trauma; a decayed one crumbles quietly', () => {
    const died = (id: number): SimEvent => ev({ e: 'died', id, side: 0, card: 'palisade', killerId: 12, killerSide: 1, killerKind: 'unit', bountyGold: 62000, bountyXp: 87000 });
    const out = run([died(10)]);
    expect(out.some((a) => a.a === 'unitDie' && a.id === 10)).toBe(true);
    expect(out.some((a) => a.a === 'fx' && a.effectId === 'fx.fort_debris_wood')).toBe(true);
    expect(out.some((a) => a.a === 'trauma' && a.amount === 0.2)).toBe(true);
    expect(sound(out)).toContain(FORT_SOUNDS.collapse);
    const quiet = run([ev({ e: 'fortDecayed', id: 10 }), died(10)]);
    expect(sound(quiet)).toContain(FORT_SOUNDS.decay);
    expect(quiet.some((a) => a.a === 'trauma')).toBe(false);
  });

  it('a levy steps out of its camp: the door opens with a puff and the horn', () => {
    const out = run([ev({ e: 'unitSpawned', id: 13, side: 0, card: 'cave_youth', x: 230000, summoned: true, level: 1, from: 11 })]);
    expect(out.some((a) => a.a === 'fortClip' && a.id === 11 && a.clip === 'spawn')).toBe(true);
    expect(sound(out)).toEqual([FORT_SOUNDS.levySpawn, FORT_SOUNDS.campHorn]);
  });

  it('traps arm, snap or blast, freeze their victim for 60 ms and go spent', () => {
    const m = new EventMapper({ content, feel: defaultFeelConfig, mySide: 0, rng: mulberry32(1) });
    run([ev({ e: 'fortPlaced', side: 0, id: 40, card: 'spike_pit', pad: 0, x: 160000, cost: 75 }), ev({ e: 'fortPlaced', side: 0, id: 41, card: 'powder_keg', pad: 1, x: 230000, cost: 75 })], m);
    expect(sound(run([ev({ e: 'trapArmed', id: 40 })], m))).toEqual([FORT_SOUNDS.trapArm]);
    const snap = run([ev({ e: 'trapTriggered', id: 40, charge: 0, x: 160000 }), ev({ e: 'hit', targetId: 12, sourceId: 40, sourceKind: 'ability', damage: 4000, dmgType: 'pierce', modBp: 10000, heavy: false, x: 160000, castId: null })], m);
    expect(snap.some((a) => a.a === 'trapClip' && a.id === 40 && a.clip === 'trigger')).toBe(true);
    expect(sound(snap)).toContain(FORT_SOUNDS.trapSnap);
    expect(snap.some((a) => a.a === 'unitFreeze' && a.id === 12 && a.ms === 60)).toBe(true);
    const blast = run([ev({ e: 'trapTriggered', id: 41, charge: 0, x: 230000 })], m);
    expect(sound(blast)).toContain(FORT_SOUNDS.trapBlast);
    expect(blast.some((a) => a.a === 'fx' && a.effectId === 'fx.blast')).toBe(true);
    const gone = run([ev({ e: 'trapExpired', id: 41 })], m);
    expect(gone.some((a) => a.a === 'trapClip' && a.id === 41 && a.clip === 'spent')).toBe(true);
  });
});

describe('fort pose from sim state', () => {
  const fort = (o: Partial<NonNullable<UnitState['fort']>> = {}, next = 0, target = 0): UnitState =>
    ({
      fort: { pad: 2, kind: 'tower', doneTick: 200, done: false, decayFromTick: 1400, campNextTick: 0, levyIds: [], multBp: 10000, silencedUntilTick: 0, lastEnemyHitTick: 0, lastEnemyHitBy: 0, ...o },
      attacks: [{ targetId: target, impactTick: 0, nextAttackTick: next, lastAttackTick: 0, retargetTick: 0, firstHit: false, bite: false }],
    }) as unknown as UnitState;

  it('runs the scaffold from placement to completion', () => {
    expect(fortPoseOf(fort(), 100, 100, false, 5000).scaffoldBp).toBe(0);
    expect(fortPoseOf(fort(), 150, 100, false, 5000).scaffoldBp).toBe(5000);
    expect(fortPoseOf(fort({ done: true }), 250, 100, false, 5000).scaffoldBp).toBe(10000);
  });

  it('eats 1% a second from the decay tick, 2% in Siege', () => {
    expect(fortPoseOf(fort({ done: true }), 1400, 100, false, 5000).decayBp).toBe(0);
    expect(fortPoseOf(fort({ done: true }), 1600, 100, false, 5000).decayBp).toBe(1000);
    expect(fortPoseOf(fort({ done: true }), 1600, 100, true, 5000).decayBp).toBe(2000);
  });

  it("reads the tower's next shot (the 200 ms wind-up) and Suppress", () => {
    expect(fortPoseOf(fort({ done: true }, 304, 12), 300, 100, false, 5000).nextAttackInMs).toBe(200);
    expect(fortPoseOf(fort({ done: true }, 304, 0), 300, 100, false, 5000).nextAttackInMs).toBeUndefined();
    expect(fortPoseOf(fort({ done: true, silencedUntilTick: 400 }), 300, 100, false, 5000).silenced).toBe(true);
  });

  it('crumbles at 66, 33 and 12%', () => {
    expect([10000, 6600, 3300, 1200].map(fortCrumble)).toEqual([0, 1, 2, 3]);
  });

  it("an Engineers scaffold (3 s) rises from the ground, using the owner's scaffold time", () => {
    const eng = fort({ doneTick: 160 });
    expect(fortPoseOf(eng, 100, 100, false, 3000).scaffoldBp).toBe(0);
    expect(fortPoseOf(eng, 130, 100, false, 3000).scaffoldBp).toBe(5000);
    const owned = content.research.picks.findIndex((p) => p.effects.some((x) => x.kind === 'fortScaffold'));
    expect(scaffoldMsFor(content, [owned])).toBe(3000);
    expect(scaffoldMsFor(content, [])).toBe(5000);
  });

  it('keeps the decay shown before the Siege switch, and drops the wind-up of a dead target', () => {
    // A fort 40% into decay when Siege starts: the clock moves to the Siege start, the cracks stay.
    expect(fortPoseOf(fort({ done: true, decayFromTick: 3900 }), 3900, 100, true, 5000, { decayCarryBp: 4000 }).decayBp).toBe(4000);
    expect(fortPoseOf(fort({ done: true, decayFromTick: 3900 }), 3940, 100, true, 5000, { decayCarryBp: 4000 }).decayBp).toBe(4400);
    expect(fortPoseOf(fort({ done: true }, 304, 12), 300, 100, false, 5000, { targetAlive: () => false }).nextAttackInMs).toBeUndefined();
    expect(fortPoseOf(fort({ done: true }, 304, 12), 300, 100, false, 5000, { targetAlive: (id) => id === 12 }).nextAttackInMs).toBe(200);
  });

  it('a scaffold stands at 50% HP but shows no crumble stage until it is complete', () => {
    const shown: number[] = [];
    const view = new FortUnitView({ root: {}, setPose: (p: { crumbleStage: number }) => shown.push(p.crumbleStage) } as never);
    const pose = { x: 0, y: 0, facing: 1, hpBp: 5000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 0, roleGlyph: 'fort' } as never;
    view.setFortState({ scaffoldBp: 4000, decayBp: 0, silenced: false });
    view.setPose(pose);
    view.setFortState({ scaffoldBp: 10000, decayBp: 0, silenced: false });
    view.setPose(pose);
    expect(shown).toEqual([0, 1]);
  });
});
