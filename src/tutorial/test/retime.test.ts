/**
 * The retiming run of match 1 (DESIGN A8: "WP11 retimes every beat from a scripted sim run, and
 * `tutorial/scripts.ts` holds the exact ticks").
 *
 * The real sim plays the Tutorial format against Old Grogg's script while the autopilot follows the
 * prompts at a new player's pace (a tap every 1.5 s from 0:02.5). The measured beat times must stay
 * within `MATCH1_TIMING_TOLERANCE` of `MATCH1_TIMING`; when content tuning moves them, rerun this
 * test, update `MATCH1_TIMING` (and the script ticks if the A8 order breaks).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@/contracts';
import { content } from '@/content';
import { createSim, SIM_VERSION } from '@/sim';
import { BattleSessionImpl } from '@/app/session';
import { tutorialMatch1 } from '@/app/matchSetup';
import { createGroggBrain } from '../grogg';
import { TutorialAutopilot } from '../autopilot';
import { TutorialDirector, type DirectorLogEntry } from '../director';
import { MATCH1, MATCH1_TIMING, MATCH1_TIMING_TOLERANCE, MATCH1_TURRET_GRANT_TICK } from '../scripts';
import { evolveReady } from '../view';

function runMatch1(decideEveryTicks: number) {
  const setup = tutorialMatch1(null, content, 'Old Grogg');
  const sim = createSim(setup.config);
  const autopilot = new TutorialAutopilot(content, { turretFromTick: MATCH1_TURRET_GRANT_TICK, maxAgeIndex: 4, decideEveryTicks, startTick: 50 });
  const session = new BattleSessionImpl({
    sim,
    mode: 'tutorial',
    opponent: setup.opponent,
    simVersion: SIM_VERSION,
    bots: [
      { side: 1, controller: createGroggBrain(1) },
      { side: 0, controller: autopilot },
    ],
  });
  const log: DirectorLogEntry[] = [];
  const director = new TutorialDirector(setup.script, { adaptive: false, onLog: (e) => log.push(e) });
  const t: Partial<Record<keyof typeof MATCH1_TIMING, number>> = {};
  const events: SimEvent[] = [];
  session.onTick((evs, s) => {
    events.push(...evs);
    const input = { state: s.state, config: s.config, events: evs, side: 0 as const };
    director.update(input);
    if (t.evolveReady === undefined && evolveReady(input)) t.evolveReady = s.state.tick;
    for (const e of evs) {
      if (e.e === 'died' && e.killerSide === 0 && t.firstKill === undefined) t.firstKill = e.tick;
      if (e.e === 'ageUp' && e.side === 0 && e.age !== 'stone') t[e.age] = e.tick;
      if (e.e === 'powerReady' && e.side === 0 && s.state.sides[0].ageIndex === 1 && t.arrowStormReady === undefined) t.arrowStormReady = e.tick;
      if (e.e === 'matchEnded') t.groggFalls = e.tick;
    }
  });
  session.start();
  session.fastForward(20 * 600);
  return { session, sim, log, t, events };
}

describe('match 1 retiming run (A8)', () => {
  const run = runMatch1(30);

  it('ends with Grogg falling, the player in the Future and Grogg still in the Stone Age (C5 #2)', () => {
    const out = run.session.result!.input.outcome;
    expect(out.winner).toBe(0);
    expect(out.reason).toBe('baseDestroyed');
    expect(run.sim.state.sides[0].ageIndex).toBe(4);
    expect(run.sim.state.sides[1].ageIndex).toBe(0);
    expect(run.events.some((e) => e.e === 'ascendStart' && e.side === 1)).toBe(false);
  });

  it('hits every pinned beat time within the tolerance', () => {
    for (const k of Object.keys(MATCH1_TIMING) as (keyof typeof MATCH1_TIMING)[]) {
      const got = run.t[k];
      expect(got, k).toBeDefined();
      expect(Math.abs(got! - MATCH1_TIMING[k]), `${k}: measured ${got}, pinned ${MATCH1_TIMING[k]}`).toBeLessThanOrEqual(MATCH1_TIMING_TOLERANCE);
    }
  });

  it('keeps the A8 order: kill, Pebbler, Rock Tosser, evolve, Arrow Storm, later ages', () => {
    const t = MATCH1_TIMING;
    const order = [t.firstKill, t.evolveReady, t.medieval, t.arrowStormReady, t.gunpowder, t.modern, t.future, t.groggFalls];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(t.firstKill).toBeLessThan(MATCH1_TURRET_GRANT_TICK);
    expect(MATCH1_TURRET_GRANT_TICK).toBeLessThan(t.evolveReady);
  });

  it('shows every beat once, in order, with no drop-offs', () => {
    const shown = run.log.filter((e) => e.kind === 'beatShown').map((e) => e.id);
    expect(shown).toEqual(MATCH1.beats.map((b) => b.id));
    expect(run.log.filter((e) => e.kind === 'beatTimeout' || e.kind === 'beatSkipped')).toEqual([]);
  });

  it('first Bonker spawns well within 10 s of the click (B16, C5 #1)', () => {
    const first = run.events.find((e) => e.e === 'unitSpawned' && e.side === 0);
    expect(first!.tick).toBeLessThanOrEqual(200);
  });

  it('the fast e2e autopilot also wins match 1', () => {
    const fast = runMatch1(10);
    expect(fast.session.result!.input.outcome.winner).toBe(0);
    expect(fast.sim.state.sides[1].ageIndex).toBe(0);
  });
});
