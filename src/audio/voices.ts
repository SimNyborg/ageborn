/**
 * Voice management for sound effects (DESIGN A13 Mixer), pure and clock-driven so it is testable
 * without an AudioContext:
 *
 * - at most `maxVoices` (default 4) voices per sound id, and a minimum gap (default 40 ms) between two
 *   starts of the same id;
 * - a global voice cap across all effects;
 * - priority: a higher `priority` wins. Sounds the player causes pass a higher priority than the
 *   opponent's (A13 "Sounds caused by the player get priority"); UI sounds get a bonus on top. A new
 *   voice at a full cap steals the oldest voice of the lowest priority that is not above its own, and
 *   is dropped when every playing voice outranks it. The retrigger gap is absolute (A13 "40 ms
 *   minimum"): a same-id start inside it would only flam with the one just started, whoever caused it.
 * - simultaneous identical starts (queue item 38, A7): two or three hits of one id on the same frame
 *   are two or three blows, not one. Starts of an id inside `STACK_WINDOW_MS` of the first form a stack
 *   of at most `limits.stack` (3 for world effects); the extra members play a few ms later, at another
 *   pitch and a little softer (the service applies `STACK_SPREAD`), and anything past the stack still
 *   meets the gap. Sounds that must hold their pitch never stack.
 * - bursts (A7): a big clash lands a dozen hits in one frame. World effects starting inside
 *   `BURST_WINDOW_MS` of each other are counted; past `BURST_SOFT` each new one is softer by
 *   `BURST_STEP_DB` more, and past `BURST_MAX` new ones are dropped (cues of priority 2 and up, such
 *   as the base collapse's layers, always pass), so a clash stays a crash instead of a wall of noise and
 *   the master limiter is not slammed.
 * - per-play variation: a random variant (never the same one twice in a row), pitch ±8% and volume
 *   ±3 dB by default.
 */
import type { SoundId } from '@/contracts';

/** Priority added to UI-bus sounds, so menus and HUD feedback are never crowded out. */
export const UI_PRIORITY_BONUS = 10;
/** Default global cap on simultaneous effect voices. */
export const DEFAULT_MAX_TOTAL_VOICES = 32;

/** Starts of one id within this time of the first (ms) are one frame's stack. */
export const STACK_WINDOW_MS = 20;
/** The most starts of one id a stack plays (world effects; 1 means no stacking). */
export const STACK_MAX = 3;
/**
 * How each stack member is played, by its index: the delay after the first (s, plus up to `jitterS`), its
 * rate relative to the first one's, and its trim (dB). Two blows 11-27 ms apart read as two, and the
 * spread pitch keeps them from sounding like one sound doubled; three cost +2.9 dB, not +4.8.
 */
export const STACK_SPREAD: readonly { delayS: number; rate: number; gainDb: number }[] = [
  { delayS: 0, rate: 1, gainDb: 0 },
  { delayS: 0.011, rate: 0.94, gainDb: -2.5 },
  { delayS: 0.023, rate: 1.07, gainDb: -4 },
];
/** Random extra delay of a stack member (s). */
export const STACK_JITTER_S = 0.004;

/** World-effect starts within this time of each other (ms) count as one burst. */
export const BURST_WINDOW_MS = 60;
/** Starts in a burst before each new one is softened. */
export const BURST_SOFT = 5;
/** The most world-effect starts a burst lets through (priority 2 and up always pass). */
export const BURST_MAX = 11;
/** dB taken off each start past `BURST_SOFT`, cumulative (the 6th start -1 dB, the 11th -6 dB). */
export const BURST_STEP_DB = -1;
/** Priority from which a start ignores the burst cap (the base collapse's crash, escalation horns). */
export const BURST_EXEMPT_PRIORITY = 2;

export interface VoiceLimits {
  maxVoices: number;
  gapMs: number;
  /** Most starts of this id in one frame's stack (default 1: no stacking). */
  stack?: number;
  /** Counts toward and obeys the burst limit (world effects; default false). */
  burst?: boolean;
}

export interface Voice<H = unknown> {
  id: SoundId;
  priority: number;
  /** Start time in seconds (audio clock). */
  start: number;
  /** End time in seconds (audio clock). */
  end: number;
  handle: H;
}

/**
 * The verdict for a new voice. When admitted: the voices to stop first, the voice's index in its frame's
 * stack (0 for an ordinary start, 1 and 2 for the extra blows) and the trim it gets from a busy burst (dB,
 * 0 or less).
 */
export type Admission<H> = { ok: true; steal: Voice<H>[]; stack: number; burstDb: number } | { ok: false; reason: 'gap' | 'idCap' | 'totalCap' | 'burst' };

export class VoicePolicy<H = unknown> {
  private voices: Voice<H>[] = [];
  /** Start time (seconds) of the latest stack of each id (its first voice), for the retrigger gap. */
  private readonly lastStart = new Map<SoundId, number>();
  /** Per id, how many voices its latest stack started. */
  private readonly stackCount = new Map<SoundId, number>();
  /** The current burst: when it began (seconds) and how many world effects it started. */
  private burst = { start: Number.NEGATIVE_INFINITY, count: 0 };

  constructor(public maxTotal: number = DEFAULT_MAX_TOTAL_VOICES) {}

  /** Voices still playing at `now`. */
  active(now: number): readonly Voice<H>[] {
    this.prune(now);
    return this.voices;
  }

  count(now: number, id?: SoundId): number {
    this.prune(now);
    return id === undefined ? this.voices.length : this.voices.filter((v) => v.id === id).length;
  }

  /**
   * Decides whether a new voice of `id` may start at `now` (seconds). On success, the caller must stop
   * the voices in `steal` and then call `started` with the same `stack` index.
   */
  admit(id: SoundId, priority: number, now: number, limits: VoiceLimits): Admission<H> {
    this.prune(now);
    let stack = 0;
    const last = this.lastStart.get(id);
    if (last !== undefined && (now - last) * 1000 < limits.gapMs) {
      // Inside the gap: only another blow of the same frame's stack may start.
      const n = this.stackCount.get(id) ?? 1;
      if ((now - last) * 1000 > STACK_WINDOW_MS || n >= Math.max(1, limits.stack ?? 1)) return { ok: false, reason: 'gap' };
      stack = n;
    }

    let burstDb = 0;
    if (limits.burst) {
      const count = (now - this.burst.start) * 1000 <= BURST_WINDOW_MS ? this.burst.count : 0;
      if (count >= BURST_MAX && priority < BURST_EXEMPT_PRIORITY) return { ok: false, reason: 'burst' };
      burstDb = count >= BURST_SOFT ? BURST_STEP_DB * (count - BURST_SOFT + 1) : 0;
    }

    const steal: Voice<H>[] = [];
    const same = this.voices.filter((v) => v.id === id);
    if (same.length >= limits.maxVoices) {
      const victim = pickVictim(same, priority);
      if (!victim) return { ok: false, reason: 'idCap' };
      steal.push(victim);
    }
    if (this.voices.length - steal.length >= this.maxTotal) {
      const victim = pickVictim(
        this.voices.filter((v) => !steal.includes(v)),
        priority,
      );
      if (!victim) return { ok: false, reason: 'totalCap' };
      steal.push(victim);
    }
    return { ok: true, steal, stack, burstDb };
  }

  /**
   * Records a voice that started. `stack` is the index `admit` gave (0 opens a new stack; its start time
   * is the one the gap counts from, whatever delay the extra blows get); `burst` counts it in the burst.
   */
  started(v: Voice<H>, stack = 0, burst = false, now: number = v.start): void {
    this.voices.push(v);
    if (stack === 0) {
      this.lastStart.set(v.id, now);
      this.stackCount.set(v.id, 1);
    } else {
      this.stackCount.set(v.id, stack + 1);
    }
    if (burst) {
      if ((now - this.burst.start) * 1000 > BURST_WINDOW_MS) this.burst = { start: now, count: 0 };
      this.burst.count++;
    }
  }

  /** Removes a voice (it ended or was stolen). */
  ended(handle: H): void {
    const i = this.voices.findIndex((v) => v.handle === handle);
    if (i >= 0) this.voices.splice(i, 1);
  }

  clear(): void {
    this.voices = [];
    this.lastStart.clear();
    this.stackCount.clear();
    this.burst = { start: Number.NEGATIVE_INFINITY, count: 0 };
  }

  private prune(now: number): void {
    if (this.voices.some((v) => v.end <= now)) this.voices = this.voices.filter((v) => v.end > now);
  }
}

/** The oldest voice of the lowest priority that does not outrank `priority`, or undefined. */
function pickVictim<H>(voices: readonly Voice<H>[], priority: number): Voice<H> | undefined {
  let best: Voice<H> | undefined;
  for (const v of voices) {
    if (v.priority > priority) continue;
    if (!best || v.priority < best.priority || (v.priority === best.priority && v.start < best.start)) best = v;
  }
  return best;
}

export interface Variation {
  /** Playback-rate factor (1 = as rendered). */
  rate: number;
  /** Gain offset in dB. */
  gainDb: number;
}

/** Random pitch (±`pitchVarBp` bp of the rate) and volume (±`volVarDb` dB), uniform (A13). */
export function rollVariation(random: () => number, pitchVarBp: number, volVarDb: number): Variation {
  const rate = 1 + ((random() * 2 - 1) * pitchVarBp) / 10000;
  const gainDb = (random() * 2 - 1) * volVarDb;
  return { rate, gainDb };
}

/** Picks a variant index in [0, n), avoiding `previous` when there is a choice. */
export function pickVariant(random: () => number, n: number, previous: number | undefined): number {
  if (n <= 1) return 0;
  if (previous === undefined || previous < 0 || previous >= n) return Math.min(n - 1, Math.floor(random() * n));
  const k = Math.min(n - 2, Math.floor(random() * (n - 1)));
  return k >= previous ? k + 1 : k;
}

/** dB to linear gain. */
export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

/**
 * The pan law for a mono effect (A7, A17.7): a balance law, so a panned sound at the centre plays at
 * exactly the level of an unpanned one (a mono source into the stereo bus plays at full level in both
 * channels), the near side stays at that level and the far side fades by 1 - |pan|. A StereoPannerNode on a
 * mono input is equal-power (-3 dB per channel at the centre); this returns the panner value and the gain
 * that turn it into the balance law: for p > 0, left = gain × cos(θ) = 1 - p and right = gain × sin(θ) = 1,
 * with θ = (pan' + 1) π / 4.
 */
export function balancePan(pan: number): { pan: number; gain: number } {
  const p = Math.max(-1, Math.min(1, Number.isFinite(pan) ? pan : 0));
  const far = 1 - Math.abs(p);
  const theta = Math.atan2(1, far);
  const value = (4 * theta) / Math.PI - 1;
  return { pan: p < 0 ? -value : value, gain: Math.hypot(1, far) };
}
