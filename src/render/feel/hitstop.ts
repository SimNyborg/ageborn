/**
 * Hitstop (DESIGN A12 Hitstop).
 *
 * - Local hitstop is view-only: the clips of attacker and victim pause (`UnitView.freeze`); the sim
 *   continues. The view adds a 1-2 px jitter to a frozen heavy-hit victim.
 * - Global freezes pause the session's sim accumulator in offline modes (the view exposes
 *   `simFrozen`); this never changes the outcome. Only Legendary death, power impact, your own evolve,
 *   Last Stand and base destroyed freeze globally.
 * - Global freezes total at most 150 ms per rolling 3 s; base destroyed is exempt.
 *
 * All times here are real (wall-clock) view time, since a global freeze stops game time.
 */

interface Grant {
  at: number;
  ms: number;
}

/** The global freeze with its rolling budget. */
export class GlobalFreeze {
  private grants: Grant[] = [];
  private remaining = 0;

  constructor(
    public capMs = 150,
    public windowMs = 3000,
  ) {}

  /** Milliseconds of freeze still to run. */
  get remainingMs(): number {
    return this.remaining;
  }

  get frozen(): boolean {
    return this.remaining > 0;
  }

  /** Frozen time already spent from the budget in the window ending at `now`. */
  usedMs(now: number): number {
    this.prune(now);
    let used = 0;
    for (const g of this.grants) used += g.ms;
    return used;
  }

  /**
   * Requests a freeze of `ms` at view time `now`. Overlapping freezes do not add up: the freeze is
   * extended to the longer one, and only the extension is charged to the budget. Returns the
   * milliseconds actually added.
   */
  request(ms: number, now: number, exempt = false): number {
    if (!(ms > 0)) return 0;
    const extension = Math.max(0, ms - this.remaining);
    if (extension <= 0) return 0;
    if (exempt) {
      this.remaining += extension;
      return extension;
    }
    const room = Math.max(0, this.capMs - this.usedMs(now));
    const granted = Math.min(extension, room);
    if (granted <= 0) return 0;
    this.grants.push({ at: now, ms: granted });
    this.remaining += granted;
    return granted;
  }

  update(realDtMs: number): void {
    this.remaining = Math.max(0, this.remaining - Math.max(0, realDtMs));
  }

  reset(): void {
    this.grants = [];
    this.remaining = 0;
  }

  private prune(now: number): void {
    const from = now - this.windowMs;
    if (this.grants.length > 0 && (this.grants[0]?.at ?? now) <= from) {
      this.grants = this.grants.filter((g) => g.at > from);
    }
  }
}

/**
 * View-only slow motion (base destroyed: slowed from the break, then easing back to full speed, A12;
 * the numbers live in the feel config). `easeMs` ramps the scale back to 1 with a smoothstep over the
 * end of the window, so time never jumps from slow to fast.
 */
export class SlowMotion {
  private scale = 1;
  private remaining = 0;
  private easeMs = 0;

  start(scale: number, ms: number, easeMs = 0): void {
    if (!(ms > 0) || !(scale > 0)) return;
    this.scale = Math.min(1, scale);
    this.remaining = Math.max(this.remaining, ms);
    this.easeMs = Math.max(0, Math.min(easeMs, ms));
  }

  /** The game-time multiplier right now. */
  get timeScale(): number {
    if (this.remaining <= 0) return 1;
    if (this.easeMs > 0 && this.remaining < this.easeMs) {
      const u = 1 - this.remaining / this.easeMs;
      return this.scale + (1 - this.scale) * u * u * (3 - 2 * u);
    }
    return this.scale;
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  update(realDtMs: number): void {
    this.remaining = Math.max(0, this.remaining - Math.max(0, realDtMs));
    if (this.remaining === 0) {
      this.scale = 1;
      this.easeMs = 0;
    }
  }

  reset(): void {
    this.scale = 1;
    this.remaining = 0;
    this.easeMs = 0;
  }
}

export interface HitstopSettings {
  hitstop: boolean;
  reduceMotion: boolean;
}

/** Applies the player's settings to a hitstop duration: off = 0, reduce motion = ×`reduceFactor`. */
export function scaleHitstop(ms: number, s: HitstopSettings, reduceFactor = 0.5): number {
  if (!s.hitstop || !(ms > 0)) return 0;
  return s.reduceMotion ? ms * reduceFactor : ms;
}
