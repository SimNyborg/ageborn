/**
 * Stopping well (DESIGN A15.6, A15.20): the session counters, the one card a Result may show
 * (tilt, break or wrap, in that priority), the night line hour and the healthy-play signals of the
 * local event log.
 *
 * - **Session.** A session begins at boot, or when the tab becomes visible after at least 20 minutes
 *   hidden. The counters live here in memory and are never saved.
 * - **Active play** is time with the tab visible while a battle runs unpaused, or while the player
 *   gave input in the last 60 s. The app samples it about once a second.
 * - **Cards.** At most one per Result, never in battle (the Result is only shown after a match), none
 *   blocks input or runs a timer; the Result screen makes Home primary.
 *   - Tilt: once per session, on the Result of the 3rd Ladder loss in a row.
 *   - Break: when `settings.breakReminder` is on (the default), the first Result after each 60 min
 *     of active play.
 *   - Wrap: once per session, on the Result of the Ladder win that used the last capsule charge, or
 *     the first Result after 30 min of active play with at least 3 finished matches.
 * - **Night line.** The Result gets the local hour the match ended; 22:00-06:00 adds the line.
 * - **Healthy-play signals** (A15.20), local only: sessions over 90 min, sessions after 22:00,
 *   sessions that end right after 3 losses, and sessions that end on a wrap, tilt or break card.
 *
 * No reward is ever attached to any of this (A15.6).
 */
import type { MatchResultInput } from '@/contracts';
import type { ResultCard } from '@/ui/router';

export const MINUTE = 60_000;
/** Hidden this long, a visible tab starts a new session. */
export const NEW_SESSION_HIDDEN_MS = 20 * MINUTE;
/** Input this recent counts as active play. */
export const INPUT_ACTIVE_MS = 60_000;
export const BREAK_EVERY_MS = 60 * MINUTE;
export const WRAP_AFTER_MS = 30 * MINUTE;
export const WRAP_MIN_MATCHES = 3;
export const TILT_LOSSES = 3;
export const LONG_SESSION_MS = 90 * MINUTE;
/** A sample never adds more than this (a sleeping device or a stalled timer adds nothing). */
const MAX_SAMPLE_MS = 5_000;

/** Night line: a match that ends between 22:00 and 06:00 local time (A15.6). */
export function isNightHour(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

export interface HealthLog {
  record(kind: string, id: string, data?: Record<string, string | number | boolean | null>): void;
}

export interface StoppingOptions {
  now: () => number;
  /** The local hour (0-23) of an epoch time; the app passes `new Date(t).getHours()`. */
  hourOf: (t: number) => number;
  log?: HealthLog | null;
}

/** What the Result tells the counters about one finished match (void matches never get here). */
export interface ResultFacts {
  mode: MatchResultInput['mode'];
  won: boolean;
  lost: boolean;
  /** Ladder losses in a row after this match (`SaveDoc.lossStreak`). */
  lossStreak: number;
  /** This Ladder win paid its capsule with the last charge. */
  usedLastCharge: boolean;
  /** `settings.breakReminder` (default on). */
  breakReminder: boolean;
  /** Cards owned now (the wrap card counts new cards of the session). */
  collectionSize: number;
  /** Damage dealt to the enemy base (the tilt card's Watch picks the closest loss). */
  baseDamage: number;
  /** The kept replay's final hash, or null when none was kept. */
  replayHash: string | null;
}

interface SessionState {
  startedAt: number;
  activeMs: number;
  matches: number;
  wins: number;
  losses: number;
  ladderLossRun: number;
  /** The Ladder losses of the current run: replay hash and base damage dealt. */
  lossRun: { replayHash: string | null; baseDamage: number }[];
  tiltShown: boolean;
  wrapShown: boolean;
  /** Active play at which the next break card is due. */
  nextBreakAtMs: number;
  collectionAtStart: number;
  longLogged: boolean;
  lastCard: ResultCard['kind'] | null;
}

/**
 * The session counters and the Result card choice (A15.6). `now` and `hourOf` default to the wall
 * clock (this is app code, not a pure rules module).
 */
export class StoppingCues {
  private readonly now: () => number;
  private readonly hourOf: (t: number) => number;
  private readonly log: HealthLog | null;
  private s!: SessionState;
  private visible = true;
  private hiddenAt: number | null = null;
  private lastInputAt = Number.NEGATIVE_INFINITY;
  private lastSampleAt: number;
  private battleRunning = false;

  constructor(collectionSize = 0, o: Partial<StoppingOptions> = {}) {
    this.now = o.now ?? (() => Date.now());
    this.hourOf = o.hourOf ?? ((t) => new Date(t).getHours());
    this.log = o.log ?? null;
    this.lastSampleAt = this.now();
    this.begin(this.now(), collectionSize);
  }

  /** Active play in this session, ms. */
  get activeMs(): number {
    return this.s.activeMs;
  }

  /** Finished (non-tutorial) matches in this session. */
  get matches(): number {
    return this.s.matches;
  }

  get startedAt(): number {
    return this.s.startedAt;
  }

  private begin(now: number, collectionSize: number): void {
    this.s = {
      startedAt: now,
      activeMs: 0,
      matches: 0,
      wins: 0,
      losses: 0,
      ladderLossRun: 0,
      lossRun: [],
      tiltShown: false,
      wrapShown: false,
      nextBreakAtMs: BREAK_EVERY_MS,
      collectionAtStart: collectionSize,
      longLogged: false,
      lastCard: null,
    };
    if (this.hourOf(now) >= 22) this.log?.record('health', 'sessionLate', { hour: this.hourOf(now) });
  }

  private end(): void {
    const s = this.s;
    if (s.matches === 0) return;
    const data = { activeMin: Math.round(s.activeMs / MINUTE), matches: s.matches, lossRun: s.ladderLossRun, card: s.lastCard };
    this.log?.record('health', 'sessionEnd', data);
    if (s.ladderLossRun >= TILT_LOSSES) this.log?.record('health', 'sessionEndAfterLosses', data);
    if (s.lastCard) this.log?.record('health', 'sessionEndOnCard', { card: s.lastCard });
  }

  /** Tab visibility: visible again after 20 min hidden starts a new session. */
  setVisible(visible: boolean, collectionSize?: number): void {
    const now = this.now();
    this.sample();
    if (!visible) {
      this.visible = false;
      this.hiddenAt = now;
      return;
    }
    const wasHidden = this.hiddenAt;
    this.visible = true;
    this.hiddenAt = null;
    this.lastSampleAt = now;
    if (wasHidden !== null && now - wasHidden >= NEW_SESSION_HIDDEN_MS) {
      this.end();
      this.begin(now, collectionSize ?? this.s.collectionAtStart);
    }
  }

  /** Any player input (pointer or key). */
  input(): void {
    this.sample();
    this.lastInputAt = this.now();
  }

  /** Whether a battle is running unpaused. */
  setBattleRunning(running: boolean): void {
    this.sample();
    this.battleRunning = running;
  }

  /** Adds the active time since the last sample. The app calls it about once a second. */
  sample(): void {
    const now = this.now();
    const dt = Math.max(0, Math.min(MAX_SAMPLE_MS, now - this.lastSampleAt));
    this.lastSampleAt = now;
    if (!this.visible) return;
    if (this.battleRunning || now - this.lastInputAt <= INPUT_ACTIVE_MS) this.s.activeMs += dt;
    if (!this.s.longLogged && this.s.activeMs >= LONG_SESSION_MS) {
      this.s.longLogged = true;
      this.log?.record('health', 'sessionLong', { activeMin: Math.round(this.s.activeMs / MINUTE) });
    }
  }

  /**
   * Counts a finished match and picks its Result card, if any (the tutorial shows none).
   * `indexOf` turns a kept replay's hash into the Result's replay index (newest first).
   */
  onResult(f: ResultFacts, indexOf: (hash: string) => number | null = () => null): ResultCard | null {
    this.sample();
    const s = this.s;
    if (f.mode === 'tutorial') return null;
    s.matches += 1;
    if (f.won) s.wins += 1;
    if (f.lost) s.losses += 1;
    if (f.mode === 'ladder') {
      if (f.lost) {
        s.ladderLossRun = Math.max(s.ladderLossRun + 1, f.lossStreak);
        s.lossRun.push({ replayHash: f.replayHash, baseDamage: f.baseDamage });
      } else {
        s.ladderLossRun = 0;
        s.lossRun = [];
      }
    }
    const card = this.pick(f, indexOf);
    s.lastCard = card ? card.kind : null;
    if (card) this.log?.record('health', 'card', { card: card.kind, activeMin: Math.round(s.activeMs / MINUTE) });
    return card;
  }

  private pick(f: ResultFacts, indexOf: (hash: string) => number | null): ResultCard | null {
    const s = this.s;
    // Tilt: the 3rd Ladder loss in a row (when the Warm-up rule fires, A6.3).
    if (!s.tiltShown && f.mode === 'ladder' && f.lost && Math.max(s.ladderLossRun, f.lossStreak) >= TILT_LOSSES) {
      s.tiltShown = true;
      let best: { replayHash: string | null; baseDamage: number } | null = null;
      for (const l of s.lossRun) if (l.replayHash !== null && (!best || l.baseDamage > best.baseDamage)) best = l;
      return { kind: 'tilt', watchIndex: best?.replayHash ? indexOf(best.replayHash) : null };
    }
    // Break: the first Result after each 60 min of active play.
    if (s.activeMs >= s.nextBreakAtMs) {
      s.nextBreakAtMs = (Math.floor(s.activeMs / BREAK_EVERY_MS) + 1) * BREAK_EVERY_MS;
      if (f.breakReminder) return { kind: 'break' };
    }
    // Wrap: once per session.
    if (!s.wrapShown) {
      const usedLast = f.mode === 'ladder' && f.won && f.usedLastCharge;
      const longEnough = s.activeMs >= WRAP_AFTER_MS && s.matches >= WRAP_MIN_MATCHES;
      if (usedLast || longEnough) {
        s.wrapShown = true;
        return { kind: 'wrap', wins: s.wins, losses: s.losses, newCards: Math.max(0, f.collectionSize - s.collectionAtStart), chargesOut: usedLast };
      }
    }
    return null;
  }
}

/** What {@link attachActivity} reads from the app. */
export interface ActivitySources {
  battleRunning: () => boolean;
  collectionSize: () => number;
}

/**
 * Feeds the counters from the page: pointer and key input, tab visibility and a 1 s sample of
 * whether a battle runs. Returns the detach function. Without a DOM (tests) it does nothing.
 */
export function attachActivity(cues: StoppingCues, src: ActivitySources, o: { intervalMs?: number } = {}): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined;
  const onInput = (): void => cues.input();
  const onVisibility = (): void => cues.setVisible(document.visibilityState !== 'hidden', src.collectionSize());
  window.addEventListener('pointerdown', onInput, { passive: true });
  window.addEventListener('keydown', onInput);
  document.addEventListener('visibilitychange', onVisibility);
  const timer = setInterval(() => cues.setBattleRunning(src.battleRunning()), o.intervalMs ?? 1000);
  return () => {
    window.removeEventListener('pointerdown', onInput);
    window.removeEventListener('keydown', onInput);
    document.removeEventListener('visibilitychange', onVisibility);
    clearInterval(timer);
  };
}
