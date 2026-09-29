import { describe, expect, it } from 'vitest';
import type { FormatId, ReplayDoc } from '@/contracts';
import { content } from '@/content';
import { InMemorySaveStore } from '@/contracts/fakes/saveStore';
import { createSim, SIM_VERSION } from '@/sim';
import { createFallbackBot } from '../fallbackBot';
import { quickBattle } from '../matchSetup';
import { ReplayPlayer, commandsByTick, replayCompatible } from '../replayPlayer';
import { BattleSessionImpl } from '../session';
import { ManualScheduler, RecordingView, profile } from './helpers';

/** One bot-vs-bot match through the real session; returns its replay. */
function playMatch(seed: number, format: FormatId = 'short'): ReplayDoc {
  const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI Kettle', format, seed });
  const sim = createSim(setup.config);
  const s = new BattleSessionImpl({
    sim,
    mode: 'skirmish',
    opponent: setup.opponent,
    simVersion: SIM_VERSION,
    bots: [
      { side: 1, controller: createFallbackBot(profile(3), 1, seed, content) },
      { side: 0, controller: createFallbackBot(profile(1 + (seed % 9)), 0, seed * 7, content) },
    ],
  });
  s.start();
  s.fastForward(20 * 60 * 13);
  const r = s.result;
  if (!r) throw new Error('match did not end');
  return r.replay;
}

describe('Replays of the last 20 matches (C2/WP11 DoD)', () => {
  it('play back with an identical outcome and final hash', () => {
    const store = new InMemorySaveStore();
    for (let i = 0; i < 22; i += 1) store.pushReplay(playMatch(500 + i, i % 5 === 0 ? 'standard' : 'short'));
    const replays = store.loadReplays();
    expect(replays).toHaveLength(20);
    const outcomes = new Set<string>();
    for (const r of replays) {
      const p = new ReplayPlayer({ replay: r, content, createSim, simVersion: SIM_VERSION });
      expect(p.status.value).toBe('ready');
      expect(p.runToEnd()).toBe(true);
      expect(p.sim!.state.outcome).toEqual(r.result);
      expect(p.sim!.hash()).toBe(r.finalHash);
      expect(p.status.value).toBe('ended');
      outcomes.add(`${r.result.winner}:${r.result.reason}`);
    }
    // The set is not degenerate: the bots produce more than one kind of result.
    expect(outcomes.size).toBeGreaterThan(1);
  }, 60_000);
});

describe('ReplayPlayer controls (A9 #14)', () => {
  const replay = playMatch(42);

  it('plays in real time at 1x / 2x / 4x through the frame clock, and pauses', () => {
    const scheduler = new ManualScheduler();
    const view = new RecordingView();
    const p = new ReplayPlayer({ replay, content, createSim, simVersion: SIM_VERSION, scheduler, createView: () => view });
    p.play();
    scheduler.frame(0);
    scheduler.frame(100);
    expect(p.sim!.state.tick).toBe(2);
    p.setSpeed(4);
    expect(view.speed).toBe(4);
    scheduler.frame(100);
    expect(p.sim!.state.tick).toBe(10);
    p.pause();
    expect(view.paused).toBe(true);
    scheduler.frame(100);
    expect(p.sim!.state.tick).toBe(10);
    p.play();
    p.setSpeed(2);
    scheduler.frame(100);
    expect(p.sim!.state.tick).toBe(14);
    expect(view.events.length).toBeGreaterThan(0);
    p.dispose();
    expect(scheduler.pending).toBe(0);
  });

  it('restart starts over from tick 0 with a new sim and view (no seek)', () => {
    const views: RecordingView[] = [];
    const p = new ReplayPlayer({
      replay,
      content,
      createSim,
      simVersion: SIM_VERSION,
      createView: () => {
        const v = new RecordingView();
        views.push(v);
        return v;
      },
    });
    p.play();
    p.advance(250);
    expect(p.sim!.state.tick).toBe(5);
    p.restart();
    expect(views).toHaveLength(2);
    expect(views[0]!.destroyed).toBe(true);
    expect(p.sim!.state.tick).toBe(0);
    expect(p.status.value).toBe('playing');
    expect(p.runToEnd()).toBe(true);
  });

  it('shows either side on the HUD', () => {
    const p = new ReplayPlayer({ replay, content, createSim, simVersion: SIM_VERSION });
    expect(p.hudSide.value).toBe(0);
    expect(p.hud.value?.foe.label).toBe(replay.sides[1].label);
    p.setHudSide(1);
    expect(p.hud.value?.foe.label).toBe(replay.sides[0].label);
  });

  it('refuses a replay from another content or sim version ("from an older version", B3)', () => {
    const old = { ...replay, contentHash: 'deadbeef' };
    expect(replayCompatible(old, content, SIM_VERSION)).toBe(false);
    expect(replayCompatible({ ...replay, simVersion: '0.0.1' }, content, SIM_VERSION)).toBe(false);
    const p = new ReplayPlayer({ replay: old, content, createSim, simVersion: SIM_VERSION });
    expect(p.status.value).toBe('incompatible');
    expect(p.sim).toBeNull();
    p.play();
    expect(p.status.value).toBe('incompatible');
    expect(p.runToEnd()).toBeNull();
  });

  it('reports a tampered replay as not verified', () => {
    const cmds = commandsByTick(replay);
    expect([...cmds.values()].flat()).toHaveLength(replay.commands.length);
    const tampered: ReplayDoc = { ...replay, commands: replay.commands.slice(0, Math.floor(replay.commands.length / 2)) };
    const p = new ReplayPlayer({ replay: tampered, content, createSim, simVersion: SIM_VERSION });
    expect(p.runToEnd()).toBe(false);
  });
});
