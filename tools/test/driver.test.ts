import { describe, expect, it } from 'vitest';
import type { BotController, Command, Observation, Side } from '../../src/contracts';
import { content } from '../../src/content';
import { createSim } from '../../src/sim';
import { HeadlessMatch } from '../lib/driver';
import { baselinePlan, sideConfig } from '../lib/plans';
import { createProxy } from '../proxies';

function newSim(seed = 1) {
  const plan = baselinePlan(content);
  return createSim({
    seed,
    format: 'short',
    content,
    sides: [sideConfig(content, plan, { level: 1, label: 'A', isBot: false }), sideConfig(content, plan, { level: 1, label: 'AI B', isBot: true })],
  });
}

/** Records what it saw and issues one command on a fixed tick. */
class Recorder implements BotController {
  readonly seen: number[] = [];
  constructor(
    readonly snapshotDelayTicks: number,
    private readonly side: Side,
    private readonly on: number,
    private readonly cmd: (side: Side) => Command,
  ) {}
  onTick(obs: Observation): Command[] {
    this.seen.push(obs.tick);
    return obs.tick === this.on ? [this.cmd(this.side)] : [];
  }
}

describe('HeadlessMatch (DESIGN B6 loop)', () => {
  it('hands each controller the observation from snapshotDelayTicks ago', () => {
    const sim = newSim();
    const slow = new Recorder(6, 0, -1, (side) => ({ t: 'researchCancel', side }));
    const fast = new Recorder(0, 1, -1, (side) => ({ t: 'researchCancel', side }));
    const m = new HeadlessMatch(sim, [
      { side: 0, controller: slow },
      { side: 1, controller: fast },
    ]);
    for (let i = 0; i < 20; i += 1) m.step();
    expect(fast.seen.slice(0, 3)).toEqual([0, 1, 2]);
    // While the ring fills the oldest observation is used, then it lags by exactly 6 ticks.
    expect(slow.seen.slice(0, 3)).toEqual([0, 0, 0]);
    expect(slow.seen.at(-1)).toBe((fast.seen.at(-1) as number) - 6);
  });

  it('stamps commands with tick + 1 and a per-side sequence, and drops commands for the other side', () => {
    const sim = newSim();
    const mine = new Recorder(0, 0, 3, (side) => ({ t: 'stance', side, mode: 'hold' }));
    const cheat = new Recorder(0, 1, 3, () => ({ t: 'retreat', side: 0 }));
    const m = new HeadlessMatch(sim, [
      { side: 0, controller: mine },
      { side: 1, controller: cheat },
    ]);
    for (let i = 0; i < 6; i += 1) m.step(i === 4 ? [{ t: 'emote', side: 0, emote: 'gg' }] : []);
    expect(m.commands).toEqual([
      { t: 'stance', side: 0, mode: 'hold', tick: 4, seq: 1 },
      { t: 'emote', side: 0, emote: 'gg', tick: 5, seq: 2 },
    ]);
    expect(sim.state.outcome).toBeNull();
  });

  it('refuses two controllers on one side', () => {
    const c = new Recorder(0, 0, -1, (side) => ({ t: 'researchCancel', side }));
    expect(() => new HeadlessMatch(newSim(), [{ side: 0, controller: c }, { side: 0, controller: c }])).toThrow(/two controllers/);
  });

  it('plays a whole match deterministically', () => {
    const play = (): { hash: number; tick: number } => {
      const sim = newSim(42);
      const m = new HeadlessMatch(sim, [
        { side: 0, controller: createProxy('cheap_spam', content, 0, 42, 'short') },
        { side: 1, controller: createProxy('balanced', content, 1, 42, 'short') },
      ]);
      const out = m.run();
      expect(out).not.toBeNull();
      return { hash: sim.hash(), tick: sim.state.tick };
    };
    expect(play()).toEqual(play());
  });
});
