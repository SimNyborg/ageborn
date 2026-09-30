/**
 * Match results (DESIGN A6.3 ladder table, the Sundial and the Clay meter; A6.8 MMR and loss protection;
 * A6.1 stats; A5.8 titles; C5 #24-#26).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { C, DAY, HOUR, M, TestClock, clock, fresh, matchInput, play, scripted } from './helpers';


/** A save past onboarding with every free capsule used. */
function noFree(seed = 1): SaveDoc {
  const s = scripted(seed);
  return { ...s, capsules: { ...s.capsules, freeCapsulesLeft: 0 }, flags: { ...s.flags, 'meta.ladderPlayed': true } };
}

/** The same with an empty Sundial. */
function empty(seed = 1): SaveDoc {
  const s = noFree(seed);
  return { ...s, capsules: { ...s.capsules, charges: 0 } };
}

describe('ladder results (A6.3)', () => {
  it('a win: +30 trophies, 20 Amber and a Sundial Capsule while one is ready', () => {
    const s = noFree();
    const r = play(s, 'ladder', 'win');
    expect(r.rewards.slice(0, 3).map((x) => x.kind)).toEqual(['trophies', 'amber', 'capsule']);
    expect(r.rewards.some((x) => x.kind === 'clayPip')).toBe(false);
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 30 });
    expect(r.rewards[1]).toEqual({ kind: 'amber', amount: 20 });
    expect(r.save.trophies).toMatchObject({ current: 30, best: 30 });
    expect(r.save.capsules.charges).toBe(11);
    expect(r.save.capsules.pending).toHaveLength(1);
    expect(r.save.currencies.amber).toBe(20);
  });

  it('a win with the Sundial empty: 40 Amber and a Clay pip; 2 pips make a Clay capsule without the Sundial (C5 #25)', () => {
    let s: SaveDoc = empty();
    const c = clock();
    for (let i = 1; i <= 2; i += 1) {
      const r = play(s, 'ladder', 'win', c);
      expect(r.rewards).toContainEqual({ kind: 'amber', amount: 40 });
      expect(r.rewards).toContainEqual({ kind: 'clayPip', meter: i });
      s = r.save;
    }
    expect(s.capsules.clayMeter).toBe(0);
    expect(s.capsules.pending).toHaveLength(1);
    expect(s.capsules.pending[0]).toMatchObject({ kind: 'meter', tier: 'clay', startTier: 'clay' });
    expect(s.capsules.charges).toBe(0);
  });

  it('loss −20 (none below 400, never below the arena gate), 15 Amber and a pip with the Sundial empty; draw 0 and 15', () => {
    const s = empty();
    const low = play({ ...s, trophies: { current: 380, best: 380, roadClaimed: [] }, arenaIndex: 1 }, 'ladder', 'loss');
    expect(low.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(low.rewards).toContainEqual({ kind: 'amber', amount: 15 });
    expect(low.rewards).toContainEqual({ kind: 'clayPip', meter: 1 });
    const mid = play({ ...s, trophies: { current: 500, best: 520, roadClaimed: [] }, arenaIndex: 2 }, 'ladder', 'loss');
    expect(mid.save.trophies.current).toBe(480);
    const gate = play({ ...s, trophies: { current: 810, best: 810, roadClaimed: [] }, arenaIndex: 3 }, 'ladder', 'loss');
    expect(gate.save.trophies.current).toBe(800);
    expect(gate.save.arenaIndex).toBe(3);
    const draw = play(s, 'ladder', 'draw');
    expect(draw.rewards[0]).toEqual({ kind: 'trophies', delta: 0 });
    expect(draw.rewards).toContainEqual({ kind: 'amber', amount: 15 });
  });

  it('the first 10 capsules of a save need no Sundial; then it readies 1 per 5 h and holds 34 (C5 #24, A15.4)', () => {
    let s = fresh();
    const c = clock();
    expect(s.capsules.charges).toBe(12);
    expect(s.capsules.freeCapsulesLeft).toBe(10);
    for (let i = 0; i < 2; i += 1) s = play(s, 'tutorial', 'win', c).save;
    // Free capsules come from any finished match, a loss included (A6.3, 2026-09-30).
    for (let i = 0; i < 8; i += 1) s = play(s, 'ladder', i % 2 === 0 ? 'win' : 'loss', c).save;
    expect(s.capsules.freeCapsulesLeft).toBe(0);
    expect(s.capsules.charges).toBe(12);
    for (let i = 0; i < 12; i += 1) s = play(s, 'ladder', i % 3 === 0 ? 'loss' : 'win', c).save;
    expect(s.capsules.charges).toBe(0);
    expect(s.capsules.pending.filter((p) => p.kind === 'win')).toHaveLength(22);
    const extra = play(s, 'ladder', 'win', c);
    expect(extra.save.capsules.pending.filter((p) => p.kind === 'win')).toHaveLength(22);
    c.advance(5 * HOUR - 1);
    expect(M.tickTimers(s, c).capsules.charges).toBe(0);
    c.advance(1);
    expect(M.tickTimers(s, c).capsules.charges).toBe(1);
    c.advance(30 * DAY);
    expect(M.tickTimers(s, c).capsules.charges).toBe(34);
  });

  it('claiming from a full Sundial starts a fresh 5 h period', () => {
    const c = clock();
    const s = noFree();
    c.advance(8 * DAY);
    const r = play(s, 'ladder', 'loss', c);
    expect(r.save.capsules.charges).toBe(33);
    expect(r.save.capsules.chargesUpdatedAt).toBe(c.now());
    c.advance(5 * HOUR - 1);
    expect(M.tickTimers(r.save, c).capsules.charges).toBe(33);
    c.advance(1);
    expect(M.tickTimers(r.save, c).capsules.charges).toBe(34);
  });

  it('a clock moved backwards never takes charges away', () => {
    const c = clock();
    const s = { ...noFree(), capsules: { ...noFree().capsules, charges: 4 } };
    const back = new TestClock(c.now() - 10 * DAY);
    const t = M.tickTimers(s, back);
    expect(t.capsules.charges).toBe(4);
    expect(t.capsules.chargesUpdatedAt).toBe(back.now());
  });

  it('MMR: Elo K = 32 against the tier rating; ladder only (A6.8)', () => {
    const s = noFree();
    const win = play(s, 'ladder', 'win');
    // Tier I (rating 900) vs MMR 1,000: E = 0.640 → +32 × 0.36 ≈ +12.
    expect(win.opponent.tier).toBe(1);
    expect(win.save.mmr).toBe(1012);
    expect(play(s, 'ladder', 'loss').save.mmr).toBe(1000 - 20);
    expect(play(s, 'skirmish', 'win').save.mmr).toBe(1000);
  });

  it('after 3 ladder losses in a row the next opponent is a warm-up one tier lower (C5 #26)', () => {
    let s: SaveDoc = { ...noFree(), mmr: 1100, arenaIndex: 1, trophies: { current: 200, best: 200, roadClaimed: [] } };
    for (let i = 0; i < 3; i += 1) {
      const o = M.pickOpponent(s, 'ladder', C, clock());
      expect(o.warmUp).toBe(false);
      s = M.applyMatchResult(s, matchInput('ladder', 'loss', o), C, clock()).save;
    }
    expect(s.lossStreak).toBe(3);
    const warm = M.pickOpponent(s, 'ladder', C, clock());
    expect(warm.warmUp).toBe(true);
    const normal = M.pickOpponent({ ...s, lossStreak: 0 }, 'ladder', C, clock());
    expect(warm.tier).toBe(Math.max(0, normal.tier - 1));
    const after = M.applyMatchResult(s, matchInput('ladder', 'win', warm), C, clock()).save;
    expect(after.lossStreak).toBe(0);
  });

  it('reaching a gate moves the arena up and never down', () => {
    const s = { ...noFree(), trophies: { current: 140, best: 140, roadClaimed: [] } };
    const r = play(s, 'ladder', 'win');
    expect(r.save.arenaIndex).toBe(1);
    expect(r.rewards).toContainEqual({ kind: 'arena', arenaIndex: 1 });
    expect(play(r.save, 'ladder', 'loss').save.arenaIndex).toBe(1);
  });
});

describe('other modes', () => {
  it('tutorial matches: the scripted capsule win or lose, no trophies, no charge, no MMR', () => {
    const s = fresh();
    const win = play(s, 'tutorial', 'win');
    expect(win.rewards.map((x) => x.kind).slice(0, 2)).toEqual(['amber', 'capsule']);
    expect(win.save.trophies.current).toBe(0);
    expect(win.save.mmr).toBe(s.mmr);
    const loss = play(win.save, 'tutorial', 'loss');
    expect(loss.opponent).toMatchObject({ generalId: 'pip', tier: 0, format: 'short' });
    expect(loss.rewards).toContainEqual({ kind: 'amber', amount: 15 });
    expect(loss.save.capsules.pending).toHaveLength(2);
    expect(loss.save.capsules.charges).toBe(12);
  });

  it('skirmish: 5 Amber per win, no trophies; a ready Sundial Capsule, never a Clay pip', () => {
    const s = noFree();
    const opp = M.pickOpponent(s, 'skirmish', C, clock(), { skirmish: { generalId: 'moss', tier: 4, format: 'standard', standardLevels: true } });
    const r = M.applyMatchResult(s, matchInput('skirmish', 'win', opp), C, clock());
    expect(r.rewards[0]).toEqual({ kind: 'amber', amount: 5 });
    expect(r.rewards[1]).toMatchObject({ kind: 'capsule' });
    expect(r.save.trophies).toEqual(s.trophies);
    expect(r.save.capsules.pending).toHaveLength(1);
    expect(r.save.capsules.pending[0]).toMatchObject({ kind: 'win' });
    const none = M.applyMatchResult(empty(), matchInput('skirmish', 'loss', opp), C, clock());
    expect(none.save.capsules.pending).toHaveLength(0);
    expect(none.rewards.some((x) => x.kind === 'clayPip')).toBe(false);
  });

  it('every match updates the profile stats (A6.1)', () => {
    let s = noFree();
    s = play(s, 'ladder', 'win', clock(), { stats: { durationMs: 250_000 } }).save;
    s = play(s, 'ladder', 'win', clock(), { stats: { durationMs: 200_000 } }).save;
    s = play(s, 'ladder', 'loss').save;
    s = play(s, 'skirmish', 'draw').save;
    expect(s.stats).toMatchObject({ matches: 4, wins: 2, losses: 1, draws: 1, fastestWinMs: 200_000 });
    expect(s.matchesPlayed).toBe(4);
    expect(s.stats.winsByTier.reduce((a, b) => a + b, 0)).toBe(2);
    expect(s.stats.lossesByTier.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('titles unlock from matches: Firestarter, Evolver, Last Stander, Speedrunner, Veteran (A5.8)', () => {
    const s = noFree();
    const r = play(s, 'ladder', 'win', clock(), { format: 'short', stats: { usedLastStand: true } });
    expect(r.rewards).toContainEqual({ kind: 'title', title: 'firestarter' });
    expect(r.rewards).toContainEqual({ kind: 'title', title: 'last_stander' });
    // A17.13: Evolver is the first Cosmic Age, so the tutorial's Future Age no longer earns it.
    const tutorial = play(fresh(), 'tutorial', 'win', clock(), { stats: { reachedFinalAgeAtMs: 90_000 } });
    expect(tutorial.save.cosmetics.owned).not.toContain('evolver');
    expect(tutorial.save.stats.futureReached).toBe(0);
    const full = { ...noFree(), arenaIndex: 2, trophies: { current: 400, best: 400, roadClaimed: [] } };
    // A18 pacing: the Full War's final age (Future, 7-age window) before 10:00: Evolver and Speedrunner
    const fast = play(full, 'ladder', 'loss', clock(), { format: 'full', stats: { reachedFinalAgeAtMs: 599_000 } });
    expect(fast.rewards).toContainEqual({ kind: 'title', title: 'speedrunner' });
    expect(fast.rewards).toContainEqual({ kind: 'title', title: 'evolver' });
    // `futureReached` counts the game's last age (Cosmic): a Stone-start Full War window now ends at Future
    expect(fast.save.stats.futureReached).toBe(0);
    const slow = play(full, 'ladder', 'loss', clock(), { format: 'full', stats: { reachedFinalAgeAtMs: 601_000 } });
    expect(slow.rewards).not.toContainEqual({ kind: 'title', title: 'speedrunner' });
    const vet = play({ ...s, stats: { ...s.stats, wins: 99 } }, 'ladder', 'win');
    expect(vet.save.cosmetics.owned).toContain('veteran');
  });

  it('never mutates the input save', () => {
    const s = noFree();
    const copy = JSON.parse(JSON.stringify(s)) as SaveDoc;
    play(s, 'ladder', 'win');
    play(s, 'daily', 'win');
    expect(s).toEqual(copy);
  });
});
