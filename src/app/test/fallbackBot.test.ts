import { describe, expect, it } from 'vitest';
import type { Command } from '@/contracts';
import { content } from '@/content';
import { createSim } from '@/sim';
import { createFallbackBot, tierTiming } from '../fallbackBot';
import { quickBattle } from '../matchSetup';
import { BattleSessionImpl } from '../session';
import { profile } from './helpers';

describe('fallback bot timing (A7.3)', () => {
  it('uses the tier table and interpolates between rows', () => {
    expect(tierTiming(0)).toEqual({ intervalTicks: 40, delayTicks: 20 });
    expect(tierTiming(3)).toEqual({ intervalTicks: 27, delayTicks: 15 });
    expect(tierTiming(10)).toEqual({ intervalTicks: 10, delayTicks: 6 });
    // Tier II halfway between I and III.
    expect(tierTiming(2).intervalTicks).toBe(30);
    // No bot reacts faster than 300 ms.
    expect(tierTiming(99).delayTicks).toBeGreaterThanOrEqual(6);
  });
});

describe('fallback bot honesty (A7.1)', () => {
  it('commands only its own side, respects its decision interval and is deterministic', () => {
    const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI', format: 'short', seed: 5 });
    const run = (): Command[] => {
      const sim = createSim(setup.config);
      const bot = createFallbackBot(profile(3), 1, 5, content);
      const cmds: Command[] = [];
      const s = new BattleSessionImpl({ sim, mode: 'skirmish', opponent: setup.opponent, simVersion: 'x', bots: [{ side: 1, controller: { snapshotDelayTicks: bot.snapshotDelayTicks, onTick: (o) => {
        const out = bot.onTick(o);
        cmds.push(...out);
        return out;
      } } }] });
      s.start();
      s.fastForward(20 * 90);
      expect(s.droppedBotCommands).toBe(0);
      return cmds;
    };
    const a = run();
    expect(a.length).toBeGreaterThan(5);
    expect(a.every((c) => c.side === 1)).toBe(true);
    expect(run()).toEqual(a);
  });

  it('wins some and loses some against another tier (not degenerate)', () => {
    const winners = new Set<number | null>();
    for (let seed = 1; seed <= 6; seed += 1) {
      const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI', format: 'short', seed });
      const s = new BattleSessionImpl({
        sim: createSim(setup.config),
        mode: 'skirmish',
        opponent: setup.opponent,
        simVersion: 'x',
        bots: [
          { side: 0, controller: createFallbackBot(profile(5), 0, seed, content) },
          { side: 1, controller: createFallbackBot(profile(5), 1, seed + 50, content) },
        ],
      });
      s.start();
      s.fastForward(20 * 60 * 7);
      winners.add(s.result!.input.outcome.winner);
    }
    expect(winners.size).toBeGreaterThan(1);
  });
});
