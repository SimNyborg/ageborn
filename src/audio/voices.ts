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
 *   is dropped when every playing voice outranks it. A retrigger inside the gap is dropped unless it
 *   outranks the voice that started it.
 * - per-play variation: a random variant (never the same one twice in a row), pitch ±8% and volume
 *   ±3 dB by default.
 */
import type { SoundId } from '@/contracts';

/** Priority added to UI-bus sounds, so menus and HUD feedback are never crowded out. */
export const UI_PRIORITY_BONUS = 10;
/** Default global cap on simultaneous effect voices. */
export const DEFAULT_MAX_TOTAL_VOICES = 32;

export interface VoiceLimits {
  maxVoices: number;
  gapMs: number;
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

export type Admission<H> = { ok: true; steal: Voice<H>[] } | { ok: false; reason: 'gap' | 'idCap' | 'totalCap' };

export class VoicePolicy<H = unknown> {
  private voices: Voice<H>[] = [];
  private readonly lastStart = new Map<SoundId, { at: number; priority: number }>();

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
   * the voices in `steal` and then call `started`.
   */
  admit(id: SoundId, priority: number, now: number, limits: VoiceLimits): Admission<H> {
    this.prune(now);
    const last = this.lastStart.get(id);
    if (last && (now - last.at) * 1000 < limits.gapMs && priority <= last.priority) return { ok: false, reason: 'gap' };

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
    return { ok: true, steal };
  }

  started(v: Voice<H>): void {
    this.voices.push(v);
    this.lastStart.set(v.id, { at: v.start, priority: v.priority });
  }

  /** Removes a voice (it ended or was stolen). */
  ended(handle: H): void {
    const i = this.voices.findIndex((v) => v.handle === handle);
    if (i >= 0) this.voices.splice(i, 1);
  }

  clear(): void {
    this.voices = [];
    this.lastStart.clear();
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
