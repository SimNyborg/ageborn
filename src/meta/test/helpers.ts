/**
 * Test helpers for the meta rules: a fixed local clock, save builders, match results and a small
 * chi-square check. Tests only (exempt from the determinism lint).
 */
import type { AgeId, CardId, FormatId, MatchResultInput, MatchStats, OpponentSpec, PendingCapsule, SaveDoc, Side } from '@/contracts';
import { content, type Content } from '@/content';
import { createMeta, type MetaRules } from '../index';
import type { LocalClock } from '../time';

export const C: Content = content;
export const M: MetaRules = createMeta(C);

/**
 * The content as it was before the Supply Capsule retired into the Sundial (2026-09-30, A15.4): the
 * allowance still accrues. For the tests of the rules an old allowance keeps following.
 */
export const C_SUPPLY: Content = { ...content, capsules: { ...content.capsules, supply: { ...content.capsules.supply, accrues: true } } };
export const M_SUPPLY: MetaRules = createMeta(C_SUPPLY);

/** A save with an empty Sundial and no free capsules left, so a mode's own rewards show alone. */
export function noSundial(s: SaveDoc): SaveDoc {
  return { ...s, capsules: { ...s.capsules, charges: 0, freeCapsulesLeft: 0 } };
}

/** 2026-03-02 12:00 UTC, a Monday. */
export const T0 = Date.UTC(2026, 2, 2, 12, 0, 0);
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** A settable clock with an optional fixed local offset. */
export class TestClock implements LocalClock {
  constructor(
    public t: number = T0,
    private readonly offset: number | null = null,
  ) {}
  now(): number {
    return this.t;
  }
  offsetMs(): number {
    return this.offset ?? 0;
  }
  advance(ms: number): this {
    this.t += ms;
    return this;
  }
}

export function clock(t = T0): TestClock {
  return new TestClock(t);
}

/** A fresh save. */
export function fresh(seed = 1, c: TestClock = clock()): SaveDoc {
  return M.newSave(C, c, seed);
}

/** A save past the onboarding script, in arena `arenaIndex` (0-based) at that arena's gate. */
export function scripted(seed = 1, arenaIndex = 0, c: TestClock = clock()): SaveDoc {
  const s = fresh(seed, c);
  const arena = C.arenas.list[arenaIndex];
  return {
    ...s,
    arenaIndex,
    trophies: { ...s.trophies, current: arena?.trophies ?? 0, best: arena?.trophies ?? 0 },
    scriptStep: C.capsules.script.length,
    // Past capsule 2, so the Supply allowance is unlocked (A15.4).
    flags: { ...s.flags, 'meta.dailyUnlocked': true },
  };
}

/** A save that owns every collectable card at `level` with `copies` each. */
export function ownsAll(s: SaveDoc, level = 1, copies = 0): SaveDoc {
  const collection: SaveDoc['collection'] = {};
  for (const id of [...C.order.units, ...C.order.turrets]) collection[id] = { level, copies, isNew: false, foil: 'none' };
  return { ...s, collection, powersOwned: [...C.order.powers] };
}

export function stats(o: Partial<MatchStats> = {}): MatchStats {
  return {
    trained: 10,
    kills: 8,
    turretKills: 2,
    evolves: 2,
    reachedFinalAgeAtMs: null,
    powerMaxHits: 2,
    baseDamage: 1000,
    heavyKillsByAA: 0,
    usedTreasury: true,
    usedLastStand: false,
    ownBaseHpBpAtEnd: 4000,
    durationMs: 300_000,
    mvpCard: null,
    ...o,
  };
}

export type Res = 'win' | 'loss' | 'draw';

export function matchInput(
  mode: MatchResultInput['mode'],
  res: Res,
  opponent: OpponentSpec,
  o: { stats?: Partial<MatchStats>; mySide?: Side; reason?: MatchResultInput['outcome']['reason'] } = {},
): MatchResultInput {
  const mySide: Side = o.mySide ?? 0;
  const other: Side = mySide === 0 ? 1 : 0;
  const winner = res === 'win' ? mySide : res === 'loss' ? other : null;
  return {
    mode,
    mySide,
    opponent,
    stats: stats(o.stats),
    outcome: {
      winner,
      reason: o.reason ?? (res === 'draw' ? 'finalBell' : 'baseDestroyed'),
      tick: 6000,
      baseHpBp: res === 'win' ? [4000, 0] : res === 'loss' ? [0, 4000] : [3000, 3000],
    },
  };
}

/** Plays one match of `mode` against the opponent meta picks and applies the result. */
export function play(
  s: SaveDoc,
  mode: MatchResultInput['mode'],
  res: Res,
  c: TestClock = clock(),
  o: { format?: FormatId; stats?: Partial<MatchStats>; conquestGeneral?: string } = {},
): { save: SaveDoc; rewards: ReturnType<MetaRules['applyMatchResult']>['rewards']; opponent: OpponentSpec } {
  const opponent = M.pickOpponent(s, mode, C, c, { ...(o.format ? { format: o.format } : {}), ...(o.conquestGeneral ? { conquestGeneral: o.conquestGeneral } : {}) });
  const r = M.applyMatchResult(s, matchInput(mode, res, opponent, { ...(o.stats ? { stats: o.stats } : {}) }), C, c);
  return { ...r, opponent };
}

/** The newest pending capsule. */
export function lastPending(s: SaveDoc): PendingCapsule {
  const p = s.capsules.pending[s.capsules.pending.length - 1];
  if (!p) throw new Error('no pending capsule');
  return p;
}

/** Grants and opens one capsule. */
export function grantOpen(s: SaveDoc, kind: PendingCapsule['kind'], c: TestClock = clock(), o?: { tier?: PendingCapsule['tier']; age?: AgeId }) {
  const g = M.grantCapsule(s, kind, C, c, o);
  const cap = lastPending(g);
  return M.openCapsule(g, cap.id);
}

export function rarityOf(id: CardId): string {
  return (C.units[id] ?? C.turrets[id])?.rarity ?? '?';
}

/** Chi-square statistic of observed counts against expected proportions (weights). */
export function chiSquare(observed: readonly number[], weights: readonly number[]): { stat: number; df: number } {
  const n = observed.reduce((a, b) => a + b, 0);
  const wsum = weights.reduce((a, b) => a + b, 0);
  let stat = 0;
  let df = -1;
  observed.forEach((o, i) => {
    const e = (n * (weights[i] ?? 0)) / wsum;
    if (e <= 0) return;
    stat += ((o - e) * (o - e)) / e;
    df += 1;
  });
  return { stat, df };
}

/** Chi-square critical values at p = 0.01 (df 1-6). */
export const CHI2_P01 = [0, 6.635, 9.21, 11.345, 13.277, 15.086, 16.812];

/** True when the counts pass the chi-square test at p > 0.01. */
export function passesChi2(observed: readonly number[], weights: readonly number[]): boolean {
  const { stat, df } = chiSquare(observed, weights);
  return stat < (CHI2_P01[df] ?? Number.POSITIVE_INFINITY);
}

export function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const x of Object.values(v as Record<string, unknown>)) deepFreeze(x);
  }
  return v;
}
