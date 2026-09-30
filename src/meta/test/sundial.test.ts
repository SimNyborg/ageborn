/**
 * The Sundial (DESIGN A6.3, A15.4; owner request 2026-09-29, built 2026-09-30): one capsule ready every
 * 5 h, holding 34; any finished match but the tutorial or a Retreat claims one, win or lose; the Clay
 * meter needs 2 pips; the Supply allowance no longer grows.
 */
import { describe, expect, it } from 'vitest';
import type { MatchResultInput, SaveDoc } from '@/contracts';
import { accrueCharges, claimSundial, nextSundialAt, restartSundialOnce, settleClayMeter, sundialReady } from '../charges';
import { C, DAY, HOUR, M, clock, fresh, grantOpen, matchInput, noSundial, play, scripted, type TestClock } from './helpers';

const PERIOD = 5 * HOUR;

/** Past onboarding, free capsules used, the Ladder played, `ready` capsules on the Sundial at `c`. */
function withReady(ready: number, c: TestClock = clock()): SaveDoc {
  const s = scripted(3, 0, c);
  return { ...s, capsules: { ...s.capsules, charges: ready, chargesUpdatedAt: c.now(), freeCapsulesLeft: 0 }, flags: { ...s.flags, 'meta.ladderPlayed': true } };
}

const sundialCaps = (s: SaveDoc) => s.capsules.pending.filter((p) => p.kind === 'win').length;

function apply(s: SaveDoc, mode: MatchResultInput['mode'], res: 'win' | 'loss' | 'draw', c: TestClock, reason?: MatchResultInput['outcome']['reason']) {
  const opp = M.pickOpponent(s, mode, C, c);
  return M.applyMatchResult(s, matchInput(mode, res, opp, reason ? { reason } : {}), C, c);
}

describe('the Sundial clock (A6.3)', () => {
  it('readies one capsule every 5 h (integer epoch ms) and holds 34', () => {
    const c = clock();
    const s = withReady(0, c);
    expect(sundialReady(s, C, c.now() + PERIOD - 1)).toBe(0);
    expect(sundialReady(s, C, c.now() + PERIOD)).toBe(1);
    expect(sundialReady(s, C, c.now() + 7 * PERIOD + 123)).toBe(7);
    const a = accrueCharges(s, C, c.now() + 7 * PERIOD + 123);
    // The period start moves forward in whole periods.
    expect(a.capsules.chargesUpdatedAt).toBe(c.now() + 7 * PERIOD);
    expect(nextSundialAt(s, C, c.now() + 7 * PERIOD + 123)).toBe(c.now() + 8 * PERIOD);
    // 34 × 5 h = 170 h: the smallest bank of 5 h steps that holds 7 days.
    expect(sundialReady(s, C, c.now() + 34 * PERIOD)).toBe(34);
    expect(sundialReady(s, C, c.now() + 400 * DAY)).toBe(34);
    expect(nextSundialAt(s, C, c.now() + 34 * PERIOD)).toBeNull();
  });

  it('claiming from a full Sundial restarts the period, so the next one takes a full 5 h', () => {
    const c = clock();
    const later = c.now() + 30 * DAY;
    const paid = claimSundial(withReady(0, c), C, later);
    expect(paid?.paid).toBe('sundial');
    expect(paid!.save.capsules).toMatchObject({ charges: 33, chargesUpdatedAt: later });
    expect(nextSundialAt(paid!.save, C, later)).toBe(later + PERIOD);
  });

  it('a clock moved backwards restarts the current period and never removes a ready capsule', () => {
    const c = clock();
    const s = withReady(6, c);
    const back = c.now() - 3 * DAY;
    const t = accrueCharges(s, C, back);
    expect(t.capsules.charges).toBe(6);
    expect(t.capsules.chargesUpdatedAt).toBe(back);
    expect(nextSundialAt(s, C, back)).toBe(back + PERIOD);
    // Moved forwards, it fills at most to the cap.
    expect(accrueCharges(s, C, c.now() + 10_000 * DAY).capsules.charges).toBe(34);
  });

  it('a save full at the old cap of 28 (save v10 flag) carries over one-for-one: 28 stays 28', () => {
    const c = clock();
    // The old rule left the period start at the moment the bank filled, here 3 days ago.
    const s0 = withReady(28, c);
    const s = { ...s0, capsules: { ...s0.capsules, chargesUpdatedAt: c.now() - 3 * DAY }, flags: { ...s0.flags, 'sundial.restart': true } };
    const t = M.tickTimers(s, c);
    expect(t.capsules.charges).toBe(28);
    expect(t.capsules.chargesUpdatedAt).toBe(c.now());
    expect(t.flags['sundial.restart']).toBeUndefined();
    expect(nextSundialAt(t, C, c.now())).toBe(c.now() + PERIOD);
    // Without the flag the step is a no-op.
    expect(restartSundialOnce(s0, c.now())).toBe(s0);
  });

  it('after 30 days away: 34 ready and nothing else owned changed (walk-away rule, A15.4)', () => {
    const c = clock();
    const s = withReady(3, c);
    c.advance(30 * DAY);
    const after = M.tickTimers(s, c);
    expect(after.capsules.charges).toBe(34);
    expect(after.capsules.pending).toEqual(s.capsules.pending);
    expect(after.currencies).toEqual(s.currencies);
    expect(after.collection).toEqual(s.collection);
    expect(after.capsules.clayMeter).toBe(s.capsules.clayMeter);
  });
});

describe('claiming (A6.3)', () => {
  it('a Ladder win with one ready: a Sundial Capsule and 20 Amber, no pip', () => {
    const c = clock();
    const r = apply(withReady(2, c), 'ladder', 'win', c);
    expect(r.rewards.slice(0, 3).map((x) => x.kind)).toEqual(['trophies', 'amber', 'capsule']);
    expect(r.rewards[1]).toEqual({ kind: 'amber', amount: 20 });
    expect(r.rewards.some((x) => x.kind === 'clayPip')).toBe(false);
    expect(r.save.capsules.charges).toBe(1);
    expect(r.save.capsules.pending.at(-1)).toMatchObject({ kind: 'win', startTier: 'clay', scriptIndex: null });
  });

  it('a Ladder loss or draw with one ready claims it too (15 Amber, no pip)', () => {
    const c = clock();
    for (const res of ['loss', 'draw'] as const) {
      const r = apply(withReady(2, c), 'ladder', res, c);
      expect(r.rewards).toContainEqual({ kind: 'amber', amount: 15 });
      expect(r.rewards.some((x) => x.kind === 'capsule')).toBe(true);
      expect(r.rewards.some((x) => x.kind === 'clayPip')).toBe(false);
      expect(r.save.capsules.charges).toBe(1);
    }
  });

  it('with none ready: a win pays 40 Amber and a pip, a loss 15 Amber and a pip', () => {
    const c = clock();
    const win = apply(withReady(0, c), 'ladder', 'win', c);
    expect(win.rewards).toContainEqual({ kind: 'amber', amount: 40 });
    expect(win.rewards).toContainEqual({ kind: 'clayPip', meter: 1 });
    expect(sundialCaps(win.save)).toBe(0);
    const loss = apply(withReady(0, c), 'ladder', 'loss', c);
    expect(loss.rewards).toContainEqual({ kind: 'amber', amount: 15 });
    expect(loss.rewards).toContainEqual({ kind: 'clayPip', meter: 1 });
  });

  it('a match that started before the capsule was ready but finished after claims it', () => {
    const c = clock();
    const s = withReady(0, c);
    c.advance(PERIOD);
    const r = apply(s, 'ladder', 'loss', c);
    expect(sundialCaps(r.save)).toBe(1);
    expect(r.save.capsules.charges).toBe(0);
    expect(r.save.capsules.chargesUpdatedAt).toBe(s.capsules.chargesUpdatedAt + PERIOD);
  });

  it('a Retreat never claims and adds no Clay pip (A15.4); the tutorial never uses the Sundial', () => {
    const c = clock();
    const r = apply(withReady(3, c), 'ladder', 'loss', c, 'retreat');
    expect(sundialCaps(r.save)).toBe(0);
    expect(r.save.capsules.charges).toBe(3);
    expect(r.rewards.some((x) => x.kind === 'clayPip')).toBe(false);
    expect(r.save.capsules.clayMeter).toBe(0);
    // With the Sundial empty too, repeated Retreats never build a Clay capsule.
    let farm = withReady(0, c);
    for (let i = 0; i < 6; i++) farm = apply(farm, 'ladder', 'loss', c, 'retreat').save;
    expect(farm.capsules.clayMeter).toBe(0);
    expect(farm.capsules.pending.filter((p) => p.kind === 'meter')).toHaveLength(0);
    const wp = apply(withReady(3, c), 'warPath', 'loss', c, 'retreat');
    expect(sundialCaps(wp.save)).toBe(0);
    // The tutorial: its scripted capsule, and the Sundial untouched.
    const t = fresh(9, c);
    const tut = play(t, 'tutorial', 'loss', c);
    expect(tut.save.capsules.charges).toBe(t.capsules.charges);
    expect(tut.save.capsules.freeCapsulesLeft).toBe(t.capsules.freeCapsulesLeft - 1);
  });

  it('Skirmish, Daily and War Path claim one, win or lose, and never add a pip', () => {
    const c = clock();
    for (const mode of ['skirmish', 'daily', 'warPath'] as const) {
      for (const res of ['win', 'loss'] as const) {
        const s = { ...withReady(2, c), daily: { ...withReady(2, c).daily, bank: 0 } };
        const r = apply(s, mode, res, c);
        expect(sundialCaps(r.save), `${mode} ${res}`).toBe(1);
        expect(r.save.capsules.charges, `${mode} ${res}`).toBe(1);
        expect(r.rewards.some((x) => x.kind === 'clayPip')).toBe(false);
        expect(r.save.capsules.clayMeter).toBe(s.capsules.clayMeter);
      }
    }
  });

  it('a Daily win can bring its Age Capsule and a Sundial Capsule', () => {
    const c = clock();
    const s = withReady(2, c);
    expect(s.daily.bank).toBe(1);
    const r = apply(s, 'daily', 'win', c);
    expect(r.save.capsules.pending.slice(-2).map((p) => p.kind)).toEqual(['age', 'win']);
  });

  it('free capsules come first, from any finished match, a loss included; one claim per match at most', () => {
    const c = clock();
    const s = { ...withReady(5, c), capsules: { ...withReady(5, c).capsules, freeCapsulesLeft: 2 } };
    const a = apply(s, 'ladder', 'loss', c);
    expect(a.save.capsules).toMatchObject({ freeCapsulesLeft: 1, charges: 5 });
    expect(sundialCaps(a.save)).toBe(1);
    const b = apply(a.save, 'warPath', 'win', c);
    expect(b.save.capsules).toMatchObject({ freeCapsulesLeft: 0, charges: 5 });
    expect(sundialCaps(b.save)).toBe(2);
    const d = apply(b.save, 'ladder', 'win', c);
    expect(d.save.capsules.charges).toBe(4);
    expect(sundialCaps(d.save)).toBe(3);
    expect(d.rewards.filter((x) => x.kind === 'capsule')).toHaveLength(1);
  });

  it('the same save, clock and result give the same capsule', () => {
    const c = clock();
    const s = withReady(4, c);
    const input = matchInput('ladder', 'loss', M.pickOpponent(s, 'ladder', C, c));
    const a = M.applyMatchResult(s, input, C, c);
    const b = M.applyMatchResult(JSON.parse(JSON.stringify(s)) as SaveDoc, input, C, c);
    expect(b).toEqual(a);
  });
});

describe('weekly and daily players (A15.4 walk-away rule)', () => {
  /** 28 days of the same 49 ladder matches a week, 60% wins, spread daily or all on every 7th day. */
  function capsulesOver28Days(pattern: 'daily' | 'weekly'): number {
    const c = clock();
    let s = withReady(0, c);
    s = { ...s, capsules: { ...s.capsules, dailyBank: 0, pending: [] } };
    for (let d = 1; d <= 28; d++) {
      c.advance(DAY);
      s = M.tickTimers(s, c);
      const n = pattern === 'daily' ? 7 : d % 7 === 0 ? 49 : 0;
      for (let i = 0; i < n; i++) s = apply(s, 'ladder', i % 5 < 3 ? 'win' : 'loss', c).save;
    }
    return s.capsules.pending.length;
  }

  it('a player who plays once a week earns within 15% of one who spreads the same matches over the week', () => {
    const daily = capsulesOver28Days('daily');
    const weekly = capsulesOver28Days('weekly');
    expect(daily).toBeGreaterThan(0);
    expect(Math.abs(weekly - daily) * 100).toBeLessThanOrEqual(15 * daily);
  });
});

describe('the Clay meter and the retired Supply Capsule (A6.3, A15.4)', () => {
  it('2 pips make a Clay capsule; a meter left full by the 3 → 2 change converts exactly once', () => {
    expect(C.capsules.clayMeterPips).toBe(2);
    const c = clock();
    const s = { ...noSundial(scripted(5, 0, c)), capsules: { ...noSundial(scripted(5, 0, c)).capsules, clayMeter: 2 } };
    const once = M.tickTimers(s, c);
    expect(once.capsules.clayMeter).toBe(0);
    expect(once.capsules.pending.filter((p) => p.kind === 'meter')).toHaveLength(1);
    const twice = M.tickTimers(once, c);
    expect(twice.capsules.pending).toHaveLength(once.capsules.pending.length);
    expect(settleClayMeter(once, C, c.now())).toBe(once);
    // A meter below the pip count is left alone.
    const one = { ...s, capsules: { ...s.capsules, clayMeter: 1 } };
    expect(M.tickTimers(one, c).capsules.pending).toHaveLength(one.capsules.pending.length);
  });

  it('an allowance banked before still turns into a Supply Capsule on every 3rd match; the capsule-2 grant stays', () => {
    const c = clock();
    const s = { ...noSundial(scripted(6, 0, c)), matchesPlayed: 2, capsules: { ...noSundial(scripted(6, 0, c)).capsules, dailyBank: 1 } };
    const r = apply(s, 'skirmish', 'win', c);
    expect(r.save.capsules.pending.filter((p) => p.kind === 'daily')).toHaveLength(1);
    expect(r.save.capsules.dailyBank).toBe(0);
    let f = fresh(6, c);
    f = grantOpen(f, 'win', c).save;
    f = grantOpen(f, 'win', c).save;
    expect(f.capsules.pending.filter((p) => p.kind === 'daily')).toHaveLength(1);
  });
});
