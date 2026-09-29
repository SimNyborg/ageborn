import type { Command, HudCard, HudModel } from '@/contracts';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import {
  buildIntent,
  buyMountIntent,
  cancelIntent,
  clockView,
  denyTargetFor,
  evolveIntent,
  flagIntent,
  formatClock,
  goldIntent,
  hudTeamColors,
  keyIntent,
  lastStandIntent,
  lastStandVisible,
  lowHp,
  moderniseIntent,
  mountMenu,
  nextMountCost,
  nextSpeed,
  powerFraction,
  powerIntent,
  quickTurretIntent,
  sellIntent,
  snapFlagP,
  stanceIntent,
  stanceSetIntent,
  trainIntent,
  type HudIntent,
} from '../model';
import { sampleHudModel } from '../samples';

const config = fakeMatchConfig();

type Over = Parameters<typeof sampleHudModel>[2];
function model(over: Over = {}): HudModel {
  return sampleHudModel(config, 0, over);
}

function withCard(m: HudModel, slot: number, c: Partial<HudCard>): HudModel {
  return { ...m, me: { ...m.me, cards: m.me.cards.map((x) => (x.slot === slot ? { ...x, ...c } : x)) } };
}

function cmdOf(i: HudIntent): Command | null {
  return i.k === 'command' ? i.cmd : null;
}

const MOUNTS_ACTIVE_OLD: HudModel['mounts'] = [
  { index: 0, owned: true, card: 'rock_tosser', outdated: true, state: 'active' },
  { index: 1, owned: true, card: 'rock_tosser', outdated: false, state: 'building' },
  { index: 2, owned: true, card: null, outdated: false, state: 'empty' },
  { index: 3, owned: false, card: null, outdated: false, state: 'empty' },
];

describe('HUD presses (A2.12, A9.2)', () => {
  it('trains a ready card and denies unaffordable and Legendary-in-field cards; empty slots do nothing', () => {
    const m = model();
    expect(cmdOf(trainIntent(m, 0, 0))).toEqual({ t: 'train', side: 0, slot: 0 });
    for (const state of ['unaffordable', 'legendaryInField'] as const) {
      expect(trainIntent(withCard(m, 1, { state }), 1, 0)).toEqual({ k: 'deny', target: 'card1' });
    }
    expect(trainIntent(m, 4, 0)).toEqual({ k: 'none' });
    expect(cmdOf(trainIntent(m, 2, 1))).toEqual({ t: 'train', side: 1, slot: 2 });
  });

  it('an ARMY FULL card can still be queued: only the waiting instance lacks room (A2.7, C5 #10)', () => {
    const m = withCard(model(), 1, { state: 'armyFull', queued: 1 });
    expect(cmdOf(trainIntent(m, 1, 0))).toEqual({ t: 'train', side: 0, slot: 1 });
  });

  it('cancels the last queued instance of a card, or the last item (Backspace)', () => {
    const m = withCard(model(), 1, { queued: 2 });
    expect(cmdOf(cancelIntent(m, 0, 1))).toEqual({ t: 'cancelTrain', side: 0, slot: 1 });
    expect(cancelIntent(m, 0, 0)).toEqual({ k: 'deny', target: 'card0' });
    expect(cmdOf(cancelIntent(m, 0))).toEqual({ t: 'cancelTrain', side: 0 });
    expect(cancelIntent(model(), 0)).toEqual({ k: 'deny', target: 'army' });
    expect(cancelIntent(model(), 0, 4)).toEqual({ k: 'none' });
  });

  it('opens the War Council on the Economy track from the gold counter; a spend takes a second tap (A18.5.4, A18.5.7)', () => {
    expect(goldIntent(model({ me: { gold: 150 } }))).toEqual({ k: 'council', line: 'economy' });
    expect(goldIntent(model({ phase: 'ended' }))).toEqual({ k: 'none' });
    const plain = model();
    const { research: _r, ...me } = plain.me;
    expect(goldIntent({ ...plain, me })).toEqual({ k: 'none' });
  });

  it('evolves only when ready', () => {
    expect(cmdOf(evolveIntent(model({ me: { evolveReady: true } }), 0))).toEqual({ t: 'evolve', side: 0 });
    expect(evolveIntent(model(), 0)).toEqual({ k: 'deny', target: 'evolve' });
  });

  it('casts the power: tap = auto-aim, drag = the placed p; denied until charged or after the end', () => {
    const full = model({ me: { powerPpm: 1_000_000 } });
    expect(cmdOf(powerIntent(full, 0))).toEqual({ t: 'power', side: 0 });
    expect(cmdOf(powerIntent(full, 0, 640))).toEqual({ t: 'power', side: 0, p: 640 });
    expect(powerIntent(model({ me: { powerPpm: 999_999 } }), 0)).toEqual({ k: 'deny', target: 'power' });
    expect(powerIntent(model({ me: { powerPpm: 1_000_000 }, phase: 'ended' }), 0)).toEqual({ k: 'deny', target: 'power' });
    expect(powerFraction(500_000)).toBe(0.5);
    expect(powerFraction(2_000_000)).toBe(1);
  });

  it('S toggles Charge and Hold, Shift+S is Fall back; hidden stance does nothing (A18.4.2)', () => {
    expect(cmdOf(stanceIntent(model(), 0))).toEqual({ t: 'stance', side: 0, mode: 'hold' });
    expect(cmdOf(stanceIntent(model({ me: { stance: 'hold' } }), 0))).toEqual({ t: 'stance', side: 0, mode: 'charge' });
    expect(cmdOf(stanceIntent(model({ me: { stance: 'fallback' } }), 0))).toEqual({ t: 'stance', side: 0, mode: 'charge' });
    expect(cmdOf(stanceIntent(model(), 0, true))).toEqual({ t: 'stance', side: 0, mode: 'fallback' });
    expect(stanceIntent(model({ me: { stanceVisible: false } }), 0)).toEqual({ k: 'none' });
  });

  it('a stance segment sends its mode; the current one does nothing; the 3 s wait denies (A18.4.2)', () => {
    expect(cmdOf(stanceSetIntent(model(), 0, 'fallback'))).toEqual({ t: 'stance', side: 0, mode: 'fallback' });
    expect(stanceSetIntent(model(), 0, 'charge')).toEqual({ k: 'none' });
    expect(stanceSetIntent(model({ me: { stanceWaitMs: 1200 } }), 0, 'hold')).toEqual({ k: 'deny', target: 'stance' });
    expect(stanceSetIntent(model({ phase: 'ended' }), 0, 'hold')).toEqual({ k: 'none' });
  });

  it('drops the Hold flag clamped to [320, 800] in 20 lu steps, switching to Hold (A18.4.2)', () => {
    expect(snapFlagP(100)).toBe(320);
    expect(snapFlagP(911)).toBe(800);
    expect(snapFlagP(531)).toBe(540);
    const hold = model({ me: { stance: 'hold', holdP: 320 } });
    expect(cmdOf(flagIntent(hold, 0, 509))).toEqual({ t: 'stance', side: 0, mode: 'hold', holdP: 500 });
    expect(flagIntent(hold, 0, 325)).toEqual({ k: 'none' });
    // From Charge the drop also switches to Hold, unless the stance wait runs.
    expect(cmdOf(flagIntent(model(), 0, 400))).toEqual({ t: 'stance', side: 0, mode: 'hold', holdP: 400 });
    expect(flagIntent(model({ me: { stanceWaitMs: 900 } }), 0, 400)).toEqual({ k: 'deny', target: 'flag' });
  });

  it('shows the Last Stand button only while armed or charging and when manual (A2.11, A8)', () => {
    expect(lastStandVisible(model({ me: { lastStand: 'armed' } }))).toBe(true);
    expect(lastStandVisible(model({ me: { lastStand: 'charging' } }))).toBe(true);
    expect(lastStandVisible(model({ me: { lastStand: 'locked' } }))).toBe(false);
    expect(lastStandVisible(model({ me: { lastStand: 'used' } }))).toBe(false);
    expect(lastStandVisible(model({ me: { lastStand: 'armed', lastStandManual: false } }))).toBe(false);
    expect(cmdOf(lastStandIntent(model({ me: { lastStand: 'armed' } }), 0))).toEqual({ t: 'lastStand', side: 0 });
    expect(lastStandIntent(model({ me: { lastStand: 'charging' } }), 0)).toEqual({ k: 'deny', target: 'lastStand' });
    expect(lastStandIntent(model({ me: { lastStand: 'armed', lastStandManual: false } }), 0)).toEqual({ k: 'none' });
  });

  it('cycles speed 1x → 1.5x → 2x → 1x', () => {
    expect([nextSpeed(1), nextSpeed(1.5), nextSpeed(2)]).toEqual([1.5, 2, 1]);
  });
});

describe('turret mounts (A2.8, A2.12)', () => {
  it('offers the loadout turrets on an empty owned mount, priced and marked affordable', () => {
    const menu = mountMenu(model({ me: { gold: 100 } }), config, 0, 0);
    expect(menu.status).toBe('empty');
    expect(menu.build).toEqual([{ slot: 0, card: 'rock_tosser', cost: 150, affordable: false }]);
    const rich = mountMenu(model({ me: { gold: 150 } }), config, 0, 0);
    expect(rich.build[0]?.affordable).toBe(true);
    expect(cmdOf(buildIntent(model(), 0, 0, rich.build[0]!))).toEqual({ t: 'buildTurret', side: 0, mount: 0, slot: 0 });
    expect(buildIntent(model(), 0, 0, menu.build[0]!)).toEqual({ k: 'deny', target: 'mounts' });
  });

  it('modernises an outdated turret for the new price minus 50% of the old, and sells for 50%', () => {
    const m = model({ me: { ageIndex: 1, gold: 100 }, mounts: MOUNTS_ACTIVE_OLD });
    const menu = mountMenu(m, config, 0, 0);
    expect(menu.status).toBe('occupied');
    expect(menu.outdated).toBe(true);
    // Medieval Crossbow Nest 150 − 50% of Rock Tosser 150 = 75.
    expect(menu.modernise).toEqual([{ slot: 0, card: 'crossbow_nest', cost: 75, affordable: true }]);
    expect(menu.sellRefund).toBe(75);
    expect(cmdOf(moderniseIntent(m, 0, 0, menu.modernise[0]!))).toEqual({ t: 'replaceTurret', side: 0, mount: 0, slot: 0 });
    expect(cmdOf(sellIntent(m, 0, 0))).toEqual({ t: 'sellTurret', side: 0, mount: 0 });
  });

  it('shows busy mounts, locks unowned ones and never sells a turret that is not active', () => {
    const m = model({ me: { ageIndex: 1 }, mounts: MOUNTS_ACTIVE_OLD });
    expect(mountMenu(m, config, 0, 1).status).toBe('busy');
    expect(mountMenu(m, config, 0, 3).status).toBe('locked');
    expect(sellIntent(m, 0, 1)).toEqual({ k: 'deny', target: 'mounts' });
    expect(sellIntent(m, 0, 2)).toEqual({ k: 'deny', target: 'mounts' });
  });

  it('buys the next mount for 150 / 350 / 700', () => {
    const owned = (n: number): HudModel['mounts'] => [0, 1, 2, 3].map((i) => ({ index: i, owned: i < n, card: null, outdated: false, state: 'empty' as const }));
    expect(nextMountCost(model({ mounts: owned(1) }), config)).toBe(150);
    expect(nextMountCost(model({ mounts: owned(2) }), config)).toBe(350);
    expect(nextMountCost(model({ mounts: owned(3) }), config)).toBe(700);
    expect(nextMountCost(model({ mounts: owned(4) }), config)).toBeNull();
    expect(cmdOf(buyMountIntent(model({ me: { gold: 150 }, mounts: owned(1) }), config, 0))).toEqual({ t: 'buyMount', side: 0 });
    expect(buyMountIntent(model({ me: { gold: 149 }, mounts: owned(1) }), config, 0)).toEqual({ k: 'deny', target: 'mounts' });
  });

  it('Q / W build on the next free mount, else modernise the oldest outdated turret', () => {
    const free = model({ me: { gold: 500 } });
    expect(cmdOf(quickTurretIntent(free, config, 0, 0))).toEqual({ t: 'buildTurret', side: 0, mount: 0, slot: 0 });
    // The fake Stone plan has no second turret.
    expect(quickTurretIntent(free, config, 0, 1)).toEqual({ k: 'deny', target: 'mounts' });
    const full: HudModel['mounts'] = [
      { index: 0, owned: true, card: 'crossbow_nest', outdated: false, state: 'active' },
      { index: 1, owned: true, card: 'rock_tosser', outdated: true, state: 'active' },
      { index: 2, owned: false, card: null, outdated: false, state: 'empty' },
      { index: 3, owned: false, card: null, outdated: false, state: 'empty' },
    ];
    const m = model({ me: { ageIndex: 1, gold: 500 }, mounts: full });
    expect(cmdOf(quickTurretIntent(m, config, 0, 0))).toEqual({ t: 'replaceTurret', side: 0, mount: 1, slot: 0 });
  });
});

describe('keyboard (A2.12)', () => {
  const m = model({ me: { gold: 900, evolveReady: true, powerPpm: 1_000_000, lastStand: 'armed' } });
  const key = (k: string, mm: HudModel = m) => keyIntent(k, mm, config, 0);

  it('maps every key of the controls table', () => {
    expect(cmdOf(key('1'))).toEqual({ t: 'train', side: 0, slot: 0 });
    expect(cmdOf(key('3'))).toEqual({ t: 'train', side: 0, slot: 2 });
    expect(key('Backspace')).toEqual({ k: 'deny', target: 'army' });
    expect(cmdOf(key('q'))).toEqual({ t: 'buildTurret', side: 0, mount: 0, slot: 0 });
    expect(cmdOf(key('B'))).toEqual({ t: 'buyMount', side: 0 });
    expect(key('t')).toEqual({ k: 'none' });
    expect(key('g')).toEqual({ k: 'council' });
    // 6 trains the sixth slot (A18.9); the fake plan leaves it empty.
    expect(key('6')).toEqual({ k: 'none' });
    expect(cmdOf(key('6', withCard(m, 5, { card: 'bonker', state: 'ready' })))).toEqual({ t: 'train', side: 0, slot: 5 });
    expect(cmdOf(key('e'))).toEqual({ t: 'evolve', side: 0 });
    expect(cmdOf(key(' '))).toEqual({ t: 'power', side: 0 });
    expect(cmdOf(key('s'))).toEqual({ t: 'stance', side: 0, mode: 'hold' });
    expect(cmdOf(key('l'))).toEqual({ t: 'lastStand', side: 0 });
    expect(key('p')).toEqual({ k: 'pause' });
    expect(key('f')).toEqual({ k: 'speed' });
  });

  it('never pauses on Escape (it only closes the Council), ignores unknown keys and every key after the end', () => {
    expect(key('Escape')).toEqual({ k: 'close' });
    expect(key('x')).toEqual({ k: 'none' });
    expect(key('1', { ...m, phase: 'ended' })).toEqual({ k: 'none' });
  });
});

describe('clock and warnings', () => {
  it('counts down to the Final Bell with Overdrive and Siege marks (Full War 5:30 / 7:30 / 9:30)', () => {
    const full = { ...fakeMatchConfig(), format: 'full' as const };
    const v = clockView(sampleHudModel(full, 0, { clockMs: 60_000 }));
    expect(v.text).toBe('8:30');
    expect(v.countdown).toBe(true);
    expect(v.marks).toEqual([
      { at: 330 / 570, kind: 'overdrive' },
      { at: 450 / 570, kind: 'siege' },
    ]);
    expect(v.nextPhase).toEqual({ kind: 'overdrive', inMs: 270_000 });
    expect(clockView(sampleHudModel(full, 0, { clockMs: 500_000 })).nextPhase).toEqual({ kind: 'finalBell', inMs: 70_000 });
  });

  it('counts up without a Final Bell (tutorial)', () => {
    const v = clockView(model({ clockMs: 61_000, phaseMarks: { overdriveMs: null, siegeMs: null, finalBellMs: null } }));
    expect(v).toEqual({ text: '1:01', countdown: false, progress: null, marks: [], nextPhase: null });
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(599_001)).toBe('10:00');
  });

  it('pulses the low-HP vignette below 25% base HP while the match runs', () => {
    expect(lowHp(model({ me: { baseHpBp: 2499 } }))).toBe(true);
    expect(lowHp(model({ me: { baseHpBp: 2500 } }))).toBe(false);
    expect(lowHp(model({ me: { baseHpBp: 100 }, phase: 'ended' }))).toBe(false);
  });

  it('points a rejected command at the element that sends it', () => {
    expect(denyTargetFor('train')).toBe('army');
    expect(denyTargetFor('research')).toBe('council');
    expect(denyTargetFor('buildTurret')).toBe('mounts');
    expect(denyTargetFor('power')).toBe('power');
    expect(denyTargetFor('emote')).toBe('emote');
    expect(denyTargetFor('retreat')).toBeNull();
  });

  it('uses the team colours of the preset from the HUD side (A11)', () => {
    expect(hudTeamColors('default', 0)).toEqual({ me: '#2F7DF6', foe: '#F28A1E' });
    expect(hudTeamColors('blueYellow', 0)).toEqual({ me: '#2F7DF6', foe: '#F2C21E' });
    expect(hudTeamColors('highContrast', 1)).toEqual({ me: '#FF6A00', foe: '#1F5FD6' });
  });
});
