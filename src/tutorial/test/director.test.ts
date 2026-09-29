import { describe, expect, it } from 'vitest';
import { TutorialDirector, type DirectorLogEntry } from '../director';
import { KILLS_EARN_GOLD_TICKS, MATCH1, MATCH1_PEBBLER_TICK, MATCH1_TURRET_GRANT_TICK, MATCH2, sec } from '../scripts';
import { Harness, config, type Ev } from './helpers';

function match1(): { h: Harness; d: TutorialDirector; log: DirectorLogEntry[] } {
  const h = new Harness(config({ format: 'tutorial' }));
  const log: DirectorLogEntry[] = [];
  const d = new TutorialDirector(MATCH1, { adaptive: false, onLog: (e) => log.push(e) });
  return { h, d, log };
}

const kill = (): Ev => ({ e: 'died', id: 900, side: 1, card: 'training_dummy', killerId: 1, killerCard: 'bonker', killerKind: 'unit', killerSide: 0, bountyGold: 30000, bountyXp: 50000, x: 600_000 });

describe('TutorialDirector: match 1 beats in A8 order', () => {
  it('walks Bonker → kill → Pebbler → Rock Tosser → Evolve → Arrow Storm → stance → Future', () => {
    const { h, d, log } = match1();
    h.advance();
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm1.sendBonker', textKey: 'tutorial.m1.sendBonker', target: 'card0' });

    h.advance();
    h.state.sides[0].queue.push({ card: 'bonker', group: 'infantry', progress: 0, total: 30, waiting: false });
    d.update(h.input());
    expect(d.prompt).toBeNull();

    h.advance(100);
    d.update(h.input([kill()]));
    expect(d.prompt?.id).toBe('m1.killsEarnGold');
    h.advance(KILLS_EARN_GOLD_TICKS);
    d.update(h.input());
    // "Kills earn gold" is over; the Pebbler waits for its tick.
    expect(d.prompt).toBeNull();

    h.state.tick = MATCH1_PEBBLER_TICK;
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm1.pebbler', target: 'card1' });
    h.advance();
    d.update(h.input([{ e: 'unitSpawned', id: 5, side: 0, card: 'pebbler', x: 20_000, summoned: false, level: 1 }]));

    h.state.tick = MATCH1_TURRET_GRANT_TICK;
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm1.buildTurret', target: 'mount0' });
    h.advance();
    d.update(h.input([{ e: 'turretBuildStart', side: 0, mount: 0, card: 'rock_tosser' }]));
    expect(d.prompt).toBeNull();

    h.advance();
    h.state.sides[0].xp = 1_000_000;
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm1.evolve', target: 'evolve' });
    h.advance();
    d.update(h.input([{ e: 'ascendStart', side: 0, age: 'medieval' }]));
    h.advance(50);
    h.state.sides[0].ageIndex = 1;
    h.state.sides[0].xp = 0;
    d.update(h.input([{ e: 'ageUp', side: 0, age: 'medieval' }]));
    // The ascension beat is silent.
    expect(d.prompt).toBeNull();

    h.advance();
    h.state.sides[0].powerPpm = [1_000_000, 0];
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm1.arrowStorm', target: 'power', hand: 'powerDrag' });
    h.advance();
    d.update(h.input([{ e: 'powerTelegraph', side: 0, slot: 'home', power: 'arrow_storm', castId: 1, x: 700_000, zone: 450, cost: 100, targetId: -1, telegraphMs: 1000 }]));
    expect(d.prompt).toBeNull();

    // Gunpowder brings the one stance hint (owner feedback 2026-09-28); it points at the flag for 6 s.
    h.advance(100);
    d.update(h.input([{ e: 'ageUp', side: 0, age: 'gunpowder' }]));
    h.advance();
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm1.stance', textKey: 'tutorial.m1.stance', target: 'stance' });
    h.advance(sec(6));
    d.update(h.input());
    expect(d.prompt).toBeNull();
    h.advance(100);
    d.update(h.input([{ e: 'ageUp', side: 0, age: 'modern' }]));
    h.advance();
    d.update(h.input());
    expect(d.prompt).toBeNull();
    h.advance(100);
    d.update(h.input([{ e: 'ageUp', side: 0, age: 'future' }]));
    h.advance();
    d.update(h.input());
    expect(d.prompt?.textKey).toBe('tutorial.m1.future');
    h.advance(sec(3));
    d.update(h.input());
    expect(d.prompt).toBeNull();
    expect(d.finished).toBe(true);

    const shown = log.filter((e) => e.kind === 'beatShown').map((e) => e.id);
    expect(shown).toEqual(MATCH1.beats.map((b) => b.id));
    // Each beat appears at most once (C5 #2).
    expect(new Set(shown).size).toBe(shown.length);
    expect(log.filter((e) => e.kind === 'beatTimeout' || e.kind === 'beatSkipped')).toEqual([]);
  });

  it('completes a beat silently when the player already did it (turret built early)', () => {
    const { h, d, log } = match1();
    h.advance();
    d.update(h.input());
    h.state.sides[0].queue.push({ card: 'bonker', group: 'infantry', progress: 0, total: 30, waiting: false });
    h.advance();
    d.update(h.input([kill()]));
    h.advance(KILLS_EARN_GOLD_TICKS);
    d.update(h.input());
    h.state.tick = MATCH1_PEBBLER_TICK;
    d.update(h.input());
    expect(d.prompt?.id).toBe('m1.pebbler');
    // The player builds the turret the moment the gold arrives, while the Pebbler prompt is still up.
    h.state.tick = MATCH1_TURRET_GRANT_TICK;
    d.update(h.input([{ e: 'turretBuildStart', side: 0, mount: 0, card: 'rock_tosser' }]));
    expect(d.prompt?.id).toBe('m1.pebbler');
    h.advance();
    d.update(h.input([{ e: 'unitSpawned', id: 5, side: 0, card: 'pebbler', x: 20_000, summoned: false, level: 1 }]));
    h.advance();
    d.update(h.input());
    expect(log.find((e) => e.id === 'm1.buildTurret')?.kind).toBe('beatDone');
    expect(log.some((e) => e.id === 'm1.buildTurret' && e.kind === 'beatShown')).toBe(false);
  });

  it('skips a beat whose age has passed and retires a shown beat after its timeout', () => {
    const { h, d, log } = match1();
    h.advance();
    d.update(h.input());
    h.advance(sec(30));
    d.update(h.input());
    expect(log.at(-1)).toMatchObject({ kind: 'beatTimeout', id: 'm1.sendBonker' });
    d.update(h.input([kill()]));
    h.advance(KILLS_EARN_GOLD_TICKS);
    d.update(h.input());
    // The player evolved before the Pebbler beat: it names a Stone card, so it is skipped.
    h.state.sides[0].ageIndex = 1;
    h.state.tick = MATCH1_PEBBLER_TICK;
    d.update(h.input([{ e: 'ageUp', side: 0, age: 'medieval' }]));
    expect(log.filter((e) => e.kind === 'beatSkipped').map((e) => e.id).sort()).toEqual(['m1.buildTurret', 'm1.evolve', 'm1.pebbler']);
  });
});

describe('TutorialDirector: Evolve jumps the queue', () => {
  it('shows "Evolve!" while the turret step still waits, and the turret step retires with Stone', () => {
    const { h, d, log } = match1();
    h.advance();
    d.update(h.input());
    h.state.sides[0].queue.push({ card: 'bonker', group: 'infantry', progress: 0, total: 30, waiting: false });
    h.advance();
    d.update(h.input());
    h.advance(100);
    d.update(h.input([kill()]));
    h.advance(KILLS_EARN_GOLD_TICKS);
    d.update(h.input());
    h.state.tick = MATCH1_PEBBLER_TICK;
    d.update(h.input());
    h.advance();
    d.update(h.input([{ e: 'unitSpawned', id: 5, side: 0, card: 'pebbler', x: 20_000, summoned: false, level: 1 }]));
    h.state.tick = MATCH1_TURRET_GRANT_TICK;
    d.update(h.input());
    expect(d.prompt?.id).toBe('m1.buildTurret');
    // The player ignores the turret; XP fills.
    h.advance(sec(4));
    h.state.sides[0].xp = 1_000_000;
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm1.evolve', target: 'evolve' });
    h.advance();
    d.update(h.input([{ e: 'ascendStart', side: 0, age: 'medieval' }]));
    h.advance(50);
    h.state.sides[0].ageIndex = 1;
    h.state.sides[0].xp = 0;
    d.update(h.input([{ e: 'ageUp', side: 0, age: 'medieval' }]));
    expect(d.prompt).toBeNull();
    expect(log.find((e) => e.id === 'm1.buildTurret' && e.kind !== 'beatShown')?.kind).toBe('beatSkipped');
    expect(log.find((e) => e.id === 'm1.evolve' && e.kind !== 'beatShown')?.kind).toBe('beatDone');
  });
});

describe('TutorialDirector: other scripts and hints', () => {
  it('match 2 teaches Treasury once gold allows it after 0:15', () => {
    const h = new Harness();
    const d = new TutorialDirector(MATCH2, { adaptive: false });
    h.gold(250);
    h.state.tick = sec(10);
    d.update(h.input());
    expect(d.prompt).toBeNull();
    h.state.tick = sec(15);
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm2.treasury', target: 'gold' });
    h.advance();
    // A18.5.4: the beat ends when the Economy research starts, not when it completes 10 s later.
    d.update(h.input([{ e: 'researchStarted', side: 0, pick: 'economy.granary', cost: 150, endTick: h.state.tick + 200 }]));
    expect(d.prompt).toBeNull();
  });

  it('match 2 points at Last Stand when it arms (owner feedback 2026-09-28: was match 5)', () => {
    const h = new Harness();
    const lastStandOnly = { ...MATCH2, beats: MATCH2.beats.filter((b) => b.id === 'm2.lastStand') };
    const d = new TutorialDirector(lastStandOnly, { adaptive: false });
    d.update(h.input());
    expect(d.prompt).toBeNull();
    h.state.sides[0].lastStand = 'armed';
    h.advance();
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'm2.lastStand', textKey: 'tutorial.m2.lastStand', target: 'lastStand' });
  });

  it('shows adaptive hints only when no beat is on screen, and they can be dismissed', () => {
    const h = new Harness();
    const d = new TutorialDirector(null, {});
    h.state.sides[0].xp = 700_000;
    h.state.tick = 100;
    d.update(h.input());
    h.state.tick = 100 + sec(10);
    d.update(h.input());
    expect(d.prompt).toMatchObject({ id: 'hint.evolveFirst', kind: 'hint', target: 'evolve' });
    expect(d.entries().at(-1)).toMatchObject({ kind: 'hintShown', id: 'evolveFirst' });
    d.dismissHint();
    expect(d.prompt).toBeNull();
    expect(d.hintsShown()).toEqual({ evolveFirst: 1 });
  });
});
