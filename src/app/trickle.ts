/**
 * The "trickle" detector (DESIGN A16.6 Teaching the wave, A8 adaptive hints, A15.12 Result tip).
 *
 * It fires when, in the last 30 s, the player spawned at least 6 units, no two within 2 s of each
 * other, while the enemy army value on the lane was at least 1.5 × the player's. Banking gold and
 * releasing a wave beats spending as you go (A16.2), so after a loss where this fired the Result shows
 * one tip: "Tip: units sent one by one fall one by one. Bank gold, then send a wave."
 *
 * It is pure over the sim's events and state (no DOM, no clock) and checks only when the player
 * spawns a unit, so it costs nothing on most ticks. Summoned units (abilities, powers) do not count.
 */
import type { CompiledContent, Side, SimEvent, SimState } from '@/contracts';

/** Detector window: 30 s at 20 ticks per second. */
export const TRICKLE_WINDOW_TICKS = 30 * 20;
/** At least this many spawns in the window ... */
export const TRICKLE_MIN_SPAWNS = 6;
/** ... no two within 2 s of each other ... */
export const TRICKLE_MIN_GAP_TICKS = 2 * 20;
/** ... while the enemy army value is at least 1.5 × the player's (bp). */
export const TRICKLE_RATIO_BP = 15000;

/** The loss tip's i18n key (A16.6). */
export const TRICKLE_TIP_KEY = 'app.tip.trickle';

export class TrickleDetector {
  private spawns: number[] = [];
  private firedValue = false;
  /** Tick of the first time the pattern was seen, or null. */
  firstTick: number | null = null;

  constructor(
    private readonly content: Pick<CompiledContent, 'units'>,
    private readonly side: Side = 0,
  ) {}

  /** True once the pattern has been seen in this match. */
  get fired(): boolean {
    return this.firedValue;
  }

  /** Feeds one tick's events and the state after it. Returns true on the tick the pattern first shows. */
  update(events: readonly SimEvent[], state: Pick<SimState, 'tick' | 'units'>): boolean {
    let spawned = false;
    for (const e of events) {
      if (e.e === 'unitSpawned' && e.side === this.side && !e.summoned) {
        this.spawns.push(state.tick);
        spawned = true;
      }
    }
    if (!spawned) return false;
    const from = state.tick - TRICKLE_WINDOW_TICKS;
    while (this.spawns.length > 0 && (this.spawns[0] as number) < from) this.spawns.shift();
    if (this.firedValue || this.spawns.length < TRICKLE_MIN_SPAWNS) return false;
    for (let i = 1; i < this.spawns.length; i += 1) {
      if ((this.spawns[i] as number) - (this.spawns[i - 1] as number) < TRICKLE_MIN_GAP_TICKS) return false;
    }
    let mine = 0;
    let theirs = 0;
    for (const u of state.units) {
      const v = this.content.units[u.card]?.cost ?? 0;
      if (u.side === this.side) mine += v;
      else theirs += v;
    }
    if (theirs * 10000 < TRICKLE_RATIO_BP * mine || theirs === 0) return false;
    this.firedValue = true;
    this.firstTick = state.tick;
    return true;
  }
}

/** The Result tip for a finished match: only after a loss where the detector fired (A16.6). */
export function lossTipKey(o: { won: boolean; draw: boolean; trickled: boolean }): string | null {
  return !o.won && !o.draw && o.trickled ? TRICKLE_TIP_KEY : null;
}
