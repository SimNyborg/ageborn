/**
 * A ranked battle left by a reload or a closed tab counts as a Retreat (bug hunt 2026-10-01 #9: a
 * reload dropped a losing Ladder match with no loss, a free escape while Retreat costs trophies).
 *
 * From its first tick, right after the start countdown, a Ladder battle keeps a small record of
 * itself in local storage; the match's end (any outcome, including Retreat) removes it. If the app
 * boots with the record still there, the battle was left: meta applies it as a Retreat, the same
 * result the player could have chosen. There is no free window (owner decision 2026-10-07: Retreat is
 * open at once, so a reload in the first minute is a Retreat too; until then nothing was recorded
 * before 1:00). Like a chosen Retreat it pays nothing (owner decision 2026-10-03): it costs the loss's
 * trophies and brings no Amber, capsule or progress. Other modes stake no trophies: a left Skirmish,
 * Quick Battle, Daily, War Path or Conquest battle stays void (A6.3), and their Retreat is a loss with
 * no rewards.
 */
import type { MatchResultInput, MatchStats, OpponentSpec, SaveDoc, Side } from '@/contracts';
import type { Services } from './services';

const KEY = 'ageborn.openMatch.v1';

export interface OpenMatch {
  mode: 'ladder';
  mySide: Side;
  opponent: OpponentSpec;
  durationMs: number;
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Records the running Ladder battle (once Retreat is open). */
export function markOpenMatch(m: OpenMatch): void {
  try {
    store()?.setItem(KEY, JSON.stringify(m));
  } catch {
    // Storage full or blocked: the battle just is not protected against a reload.
  }
}

/** The battle ended (or was left on purpose): forget it. */
export function clearOpenMatch(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // ignore
  }
}

function readOpenMatch(): OpenMatch | null {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Partial<OpenMatch>;
    return m && m.mode === 'ladder' && m.opponent && (m.mySide === 0 || m.mySide === 1) ? (m as OpenMatch) : null;
  } catch {
    return null;
  }
}

function emptyStats(durationMs: number): MatchStats {
  return {
    trained: 0,
    kills: 0,
    turretKills: 0,
    evolves: 0,
    reachedFinalAgeAtMs: null,
    powerMaxHits: 0,
    baseDamage: 0,
    heavyKillsByAA: 0,
    usedTreasury: false,
    usedLastStand: false,
    ownBaseHpBpAtEnd: 10000,
    durationMs,
    mvpCard: null,
  };
}

/** The Retreat result for a left battle. */
export function abandonedResult(m: OpenMatch): MatchResultInput {
  const foe: Side = m.mySide === 0 ? 1 : 0;
  return {
    mode: m.mode,
    outcome: { winner: foe, reason: 'retreat', tick: Math.round(m.durationMs / 50), baseHpBp: [10000, 10000] },
    mySide: m.mySide,
    opponent: m.opponent,
    stats: emptyStats(m.durationMs),
  };
}

/** True once per boot that settled a left battle (Home shows a one-line notice). */
let settledNotice = false;

/** Reads (and clears) the "your last battle counted as a Retreat" notice. */
export function takeAbandonNotice(): boolean {
  const v = settledNotice;
  settledNotice = false;
  return v;
}

/**
 * Boot: applies a left Ladder battle as a Retreat and returns the new save (or the save unchanged).
 */
export async function settleAbandoned(services: Pick<Services, 'meta' | 'content' | 'clock' | 'saveStore' | 'eventLog'>, save: SaveDoc | null): Promise<SaveDoc | null> {
  const m = readOpenMatch();
  if (!m) return save;
  clearOpenMatch();
  if (!save || !services.meta) return save;
  try {
    const next = services.meta.applyMatchResult(save, abandonedResult(m), services.content, services.clock).save;
    await services.saveStore.save(next, { immediate: true });
    services.eventLog.record('abandoned', m.mode, { ms: m.durationMs });
    settledNotice = true;
    return next;
  } catch {
    return save;
  }
}
