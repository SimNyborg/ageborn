/**
 * Ladder, Conquest and Skirmish wiring end to end on the real meta (WP7), AI (WP3) and sim (WP2):
 * meta picks an AI opponent per A6.8, the app builds the match, two real bots play it through the
 * session, the replay goes into the ring of 20 and plays back with an identical outcome (A9 #14, B3).
 * Every opponent is labeled AI (A7.1).
 */
import { describe, expect, it } from 'vitest';
import { botProfile, createBot, BALANCED_BRAIN_ID } from '@/ai';
import type { Clock, MatchResultInput, ReplayDoc, SaveDoc } from '@/contracts';
import { content } from '@/content';
import { InMemorySaveStore } from '@/contracts/fakes/saveStore';
import { i18n } from '@/i18n';
import { createMeta } from '@/meta';
import { createSim, SIM_VERSION } from '@/sim';
import type { MatchRequest } from '@/ui/screens';
import { opponentController } from '../battle';
import { matchSetupFor } from '../matchSetup';
import { displayName } from '../names';
import { ReplayPlayer } from '../replayPlayer';
import { BattleSessionImpl } from '../session';
import { opponentOptions } from '../uiServices';

const meta = createMeta(content);
const clock: Clock = { now: () => Date.UTC(2026, 8, 28, 12, 0, 0) };

/** A save past onboarding in Arena 3 (Conquest open, every ladder format). */
function veteranSave(): SaveDoc {
  const s = meta.newSave(content, clock, 4242);
  return { ...s, matchesPlayed: 30, arenaIndex: 2, tutorial: { ...s.tutorial, step: 99 }, trophies: { ...s.trophies, current: 450, best: 450 } };
}

function play(save: SaveDoc, req: Exclude<MatchRequest, { mode: 'tutorial' }>): { replay: ReplayDoc; label: string; levels: [number[], number[]] } {
  const opponent = meta.pickOpponent(save, req.mode, content, clock, opponentOptions(req));
  expect(opponent.isAI).toBe(true);
  const label = displayName(opponent.displayName, i18n);
  const setup = matchSetupFor(save, opponent, req.mode as MatchResultInput['mode'], content, {
    opponentLabel: label,
    standardLevels: opponent.standardLevels === true || (req.mode === 'skirmish' && req.options.standardLevels),
  });
  expect(setup.config.sides[1].isBot).toBe(true);
  const sim = createSim(setup.config);
  const me = createBot(botProfile(content, { generalId: BALANCED_BRAIN_ID, tier: 5 }), 0, 99, content);
  const s = new BattleSessionImpl({
    sim,
    mode: setup.mode,
    opponent: setup.opponent,
    simVersion: SIM_VERSION,
    bots: [
      { side: 1, controller: opponentController({ createBot }, setup, content) },
      { side: 0, controller: me },
    ],
  });
  s.start();
  s.fastForward(20 * 60 * 12);
  const r = s.result;
  if (!r) throw new Error('match did not end');
  const lv = (i: 0 | 1): number[] => [...new Set(Object.values(setup.config.sides[i].levels))];
  return { replay: r.replay, label, levels: [lv(0), lv(1)] };
}

describe('modes wiring (A6.3, A6.8, A6.10, A9 #3)', () => {
  it('ladder, conquest and skirmish matches play on real bots, are labeled AI, and replay identically', () => {
    const save = veteranSave();
    const store = new InMemorySaveStore();
    const ladder = play(save, { mode: 'ladder', format: 'standard' });
    expect(ladder.replay.format).toBe('standard');
    const conquest = play(save, { mode: 'conquest', general: 'pip' });
    expect(conquest.replay.format).toBe('full');
    expect(conquest.label).toBe(i18n.t('general.pip.name'));
    const skirmish = play(save, { mode: 'skirmish', options: { generalId: 'kettle', tier: 2, format: 'short', standardLevels: true }, speed: 1 });
    // "Standard levels": every card on both sides at L7 (A6.8).
    expect(skirmish.levels).toEqual([[7], [7]]);
    for (const m of [ladder, conquest, skirmish]) {
      store.pushReplay(m.replay);
      // The replay keeps the AI flag of the opponent's side (A7.1 "AI" in match history).
      expect(m.replay.sides[1].isBot).toBe(true);
      expect(m.replay.sides[0].isBot === false || m.replay.sides[0].isBot === true).toBe(true);
    }
    for (const r of store.loadReplays()) {
      const p = new ReplayPlayer({ replay: r, content, createSim, simVersion: SIM_VERSION });
      expect(p.runToEnd()).toBe(true);
      expect(p.sim!.state.outcome).toEqual(r.result);
    }
  }, 120_000);

  it('procedural ladder opponents carry the "AI · " prefix; named Generals get the AI chip from isBot', () => {
    let save = veteranSave();
    const names = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      save = { ...save, matchesPlayed: save.matchesPlayed + 1, profile: { ...save.profile } };
      const o = meta.pickOpponent({ ...save, mmr: 1000 + i }, 'ladder', content, clock, { format: 'short' });
      expect(o.isAI).toBe(true);
      expect(o.side.isBot).toBe(true);
      const name = displayName(o.displayName, i18n);
      if (o.generalId.startsWith('commander:')) expect(name.startsWith('AI · ')).toBe(true);
      names.add(name);
    }
    expect(names.size).toBeGreaterThan(0);
  });
});
