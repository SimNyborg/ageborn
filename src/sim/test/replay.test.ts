import { describe, expect, it } from 'vitest';
import { createSim } from '../createSim';
import { devSpawn } from '../debug';
import { ReplayContentMismatchError, buildReplay, replayMatch, verifyReplay } from '../replay';
import { compileForSim } from '../shim';
import { raw as fixtureRaw } from '../../../tests/fixtures/content';
import { STRATEGIES, fixture, matchConfig, runMatch, scriptedPlayer } from './helpers';

function play(seed: number) {
  const cfg = matchConfig({ seed, format: 'short' });
  return runMatch(cfg, [scriptedPlayer(fixture, 0, seed, STRATEGIES.heavy!), scriptedPlayer(fixture, 1, seed + 1, STRATEGIES.rush!)]);
}

describe('determinism and replays (B3, B13)', () => {
  it('the same seed and commands give the same hashes', () => {
    const a = play(11);
    const b = play(11);
    expect(a.sim.state.hashes).toEqual(b.sim.state.hashes);
    expect(a.sim.hash()).toBe(b.sim.hash());
    expect(a.sim.state.outcome).toEqual(b.sim.state.outcome);
    const c = play(12);
    expect(c.sim.hash()).not.toBe(a.sim.hash());
  });

  it('a recorded replay re-simulates to the same final hash', () => {
    const { sim } = play(21);
    const r = buildReplay(sim);
    expect(r.v).toBe(1);
    expect(r.contentHash).toBe(fixture.hash);
    expect(r.commands.length).toBeGreaterThan(50);
    // JSON round trip, as saved to localStorage
    const doc = JSON.parse(JSON.stringify(r)) as typeof r;
    const check = verifyReplay(doc, fixture);
    expect(check).toEqual({ ok: true, finalHash: r.finalHash, firstMismatch: -1 });
    // replay to a tick in the middle
    const mid = replayMatch(doc, fixture, 600);
    expect(mid.state.tick).toBe(600);
    expect(mid.state.hashes.slice(0, 30)).toEqual(r.hashes.slice(0, 30));
  });

  it('a replay from other content cannot be played', () => {
    const { sim } = play(5);
    const r = buildReplay(sim);
    expect(() => replayMatch({ ...r, contentHash: 'deadbeef' }, fixture)).toThrow(ReplayContentMismatchError);
  });

  it('the compile shim is deterministic: the same raw tables give the same content hash', () => {
    expect(compileForSim(fixtureRaw).hash).toBe(fixture.hash);
  });

  it('a sim touched by dev helpers refuses to build a replay', () => {
    const sim = createSim(matchConfig());
    devSpawn(sim, 0, 'bonker');
    expect(() => buildReplay(sim)).toThrow();
  });
});
