/**
 * Conquest (DESIGN A6.10, C5 #34): stars pay once, milestones pay once, the board opens in order,
 * no charges, no trophies, no MMR.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { starsEarned } from '../conquest';
import { C, M, TestClock, fresh, lastPending, matchInput, play, scripted, stats } from './helpers';

const R = C.generals.conquest;

/** Arena 3 with the Sundial empty, so only Conquest's own rewards show (sundial.test.ts has the Sundial claim). */
function arena3(): SaveDoc {
  const s = scripted(4, 2);
  return { ...s, capsules: { ...s.capsules, charges: 0, freeCapsulesLeft: 0 }, flags: { ...s.flags, 'meta.ladderPlayed': true } };
}

describe('Conquest (A6.10)', () => {
  it('opens at Arena 3; each General opens after the previous one is beaten once', () => {
    expect(M.conquestBoard(fresh(), C).every((e) => !e.open)).toBe(true);
    let s = arena3();
    let board = M.conquestBoard(s, C);
    expect(board.map((e) => e.general)).toEqual(R.board.map((b) => b.general));
    expect(board.map((e) => e.open)).toEqual([true, false, false, false, false, false, false, false, false]);
    s = play(s, 'conquest', 'loss', new TestClock(), { conquestGeneral: 'pip' }).save;
    expect(M.conquestBoard(s, C)[1]?.open).toBe(false);
    s = play(s, 'conquest', 'win', new TestClock(), { conquestGeneral: 'pip', stats: { ownBaseHpBpAtEnd: 2000, durationMs: 500_000 } }).save;
    board = M.conquestBoard(s, C);
    expect(board[0]).toMatchObject({ beaten: true, stars: [true, false, false] });
    expect(board[1]?.open).toBe(true);
    expect(board[2]?.open).toBe(false);
  });

  it('star conditions: win; win with base above 50%; win before 5:45 (Standard War, A17.13)', () => {
    expect(starsEarned(R, false, stats({ ownBaseHpBpAtEnd: 9000, durationMs: 1000 }))).toEqual([false, false, false]);
    expect(starsEarned(R, true, stats({ ownBaseHpBpAtEnd: 5000, durationMs: 345_000 }))).toEqual([true, false, false]);
    expect(starsEarned(R, true, stats({ ownBaseHpBpAtEnd: 5001, durationMs: 344_999 }))).toEqual([true, true, true]);
  });

  it('stars pay once: 200 Amber, 100 Dust, an Age Capsule; no charges, trophies or MMR', () => {
    const s = arena3();
    const c = new TestClock();
    const a = play(s, 'conquest', 'win', c, { conquestGeneral: 'pip', stats: { ownBaseHpBpAtEnd: 8000, durationMs: 300_000 } });
    expect(a.rewards.slice(0, 6)).toEqual([
      { kind: 'star', generalId: 'pip', star: 1 },
      { kind: 'amber', amount: 200 },
      { kind: 'star', generalId: 'pip', star: 2 },
      { kind: 'dust', amount: 100 },
      { kind: 'star', generalId: 'pip', star: 3 },
      { kind: 'capsule', capsuleId: lastPending(a.save).id },
    ]);
    expect(lastPending(a.save).kind).toBe('age');
    expect(a.save.currencies).toEqual({ amber: s.currencies.amber + 200, dust: s.currencies.dust + 100 });
    expect(a.save.trophies).toEqual(s.trophies);
    expect(a.save.mmr).toBe(s.mmr);
    expect(a.save.capsules.charges).toBe(s.capsules.charges);
    const again = play(a.save, 'conquest', 'win', c, { conquestGeneral: 'pip', stats: { ownBaseHpBpAtEnd: 8000, durationMs: 300_000 } });
    expect(again.rewards.some((x) => x.kind === 'star' || x.kind === 'amber' || x.kind === 'dust')).toBe(false);
    expect(again.save.currencies).toEqual(a.save.currencies);
  });

  it('a General that is not open yet pays nothing: before Arena 3, or before the previous one is beaten', () => {
    const c = new TestClock();
    const great = { ownBaseHpBpAtEnd: 9000, durationMs: 200_000 };
    const early = play({ ...arena3(), arenaIndex: 1 }, 'conquest', 'win', c, { conquestGeneral: 'pip', stats: great });
    expect(early.rewards.some((x) => x.kind === 'star' || x.kind === 'capsule')).toBe(false);
    expect(early.save.conquest.stars).toEqual({});
    const skipped = play(arena3(), 'conquest', 'win', c, { conquestGeneral: 'kettle', stats: great });
    expect(skipped.rewards.some((x) => x.kind === 'star')).toBe(false);
    expect(skipped.save.conquest.stars).toEqual({});
    expect(skipped.save.currencies).toEqual(arena3().currencies);
  });

  it('star 3\'s Age Capsule holds the age the player picked (A6.4 dialog)', () => {
    const s = arena3();
    const c = new TestClock();
    const o = M.pickOpponent(s, 'conquest', C, c, { conquestGeneral: 'pip' });
    const fast = matchInput('conquest', 'win', o, { stats: { durationMs: 300_000 } });
    const slow = matchInput('conquest', 'win', o, { stats: { durationMs: 400_000 } });
    expect(M.ageCapsuleDue(s, fast, C, c)).toBe(true);
    expect(M.ageCapsuleDue(s, slow, C, c)).toBe(false);
    const r = M.applyMatchResult(s, fast, C, c, { age: 'future' });
    expect(lastPending(r.save)).toMatchObject({ kind: 'age', age: 'future' });
    for (const st of lastPending(r.save).contents.stacks) expect((C.units[st.card] ?? C.turrets[st.card])?.age).toBe('future');
    // Star 3 pays once.
    expect(M.ageCapsuleDue(r.save, fast, C, c)).toBe(false);
  });

  it('milestones: 9 stars a Jade Capsule, 18 a Jade Capsule, 27 an Aeon Capsule and the title Conqueror', () => {
    let s = arena3();
    const c = new TestClock();
    for (const b of R.board) {
      const r = play(s, 'conquest', 'win', c, { conquestGeneral: b.general, stats: { ownBaseHpBpAtEnd: 9000, durationMs: 200_000 } });
      s = r.save;
    }
    expect(s.conquest.milestonesClaimed).toEqual([9, 18, 27]);
    const kinds = s.capsules.pending.filter((p) => p.kind === 'conquest').map((p) => p.tier);
    expect(kinds).toEqual(['jade', 'jade', 'aeon']);
    expect(s.cosmetics.owned).toContain('conqueror');
    expect(s.cosmetics.owned).toContain('wardens_bane');
    const more = play(s, 'conquest', 'win', c, { conquestGeneral: 'warden', stats: { ownBaseHpBpAtEnd: 9000, durationMs: 200_000 } });
    expect(more.save.capsules.pending.filter((p) => p.kind === 'conquest')).toHaveLength(3);
  });
});
