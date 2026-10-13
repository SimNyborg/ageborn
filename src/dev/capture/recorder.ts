/**
 * What a capture records besides the pictures (dev capture page): every sound and music call the battle
 * view makes and every sim event, stamped with the frame it happened in. A video tool mixes the game's
 * own audio files at those times, so sound and picture stay frame-exact without capturing audio live.
 */
import type { AudioService, Bus, MusicCueId, MusicLayer, SimEvent, SoundId } from '@/contracts';

export type PlayOptions = { pitchBp?: number; volumeDb?: number; pan?: number; priority?: number };

/** One audio call, stamped with the frame (0-based) and the output time at that frame's end (ms). */
export type SoundCall =
  | { frame: number; t: number; kind: 'play'; id: SoundId; o?: PlayOptions }
  | { frame: number; t: number; kind: 'cue'; cue: MusicCueId; fadeMs?: number }
  | { frame: number; t: number; kind: 'layer'; layer: MusicLayer; v: number }
  | { frame: number; t: number; kind: 'transpose'; semitones: number }
  | { frame: number; t: number; kind: 'duck'; db: number; ms: number }
  | { frame: number; t: number; kind: 'stop'; fadeMs?: number };

/** One sim event, stamped like the sounds (plus the sim tick it came from). */
export interface EventCall {
  frame: number;
  t: number;
  tick: number;
  ev: SimEvent;
}

/** The clock the recorder stamps with (the page advances it frame by frame). */
export interface FrameClock {
  frame: number;
  t: number;
}

type Stamp = { frame: number; t: number };
type Unstamped<T> = T extends unknown ? Omit<T, 'frame' | 't'> : never;

/** An `AudioService` that makes no sound and records every call against the capture clock. */
export class RecordingAudio implements AudioService {
  private calls: SoundCall[] = [];
  /** Set to false to drop calls (the headless setup before the capture starts). */
  enabled = true;

  constructor(private readonly clock: FrameClock) {}

  private push(c: Unstamped<SoundCall>): void {
    if (!this.enabled) return;
    const stamp: Stamp = { frame: this.clock.frame, t: Math.round(this.clock.t * 100) / 100 };
    this.calls.push({ ...stamp, ...c } as SoundCall);
  }

  async unlock(): Promise<void> {
    // nothing to unlock: no sound is made
  }

  play(id: SoundId, o?: PlayOptions): void {
    this.push(o === undefined ? { kind: 'play', id } : { kind: 'play', id, o: { ...o } });
  }

  setBusVolume(_bus: Bus, _v01: number): void {
    // the mix is made later from the recording
  }

  readonly music: AudioService['music'] = {
    setCue: (cue, o) => this.push(o?.fadeMs === undefined ? { kind: 'cue', cue } : { kind: 'cue', cue, fadeMs: o.fadeMs }),
    setLayer: (layer, v01) => this.push({ kind: 'layer', layer, v: v01 }),
    transpose: (semitones) => this.push({ kind: 'transpose', semitones }),
    duck: (db, ms) => this.push({ kind: 'duck', db, ms }),
    stop: (fadeMs) => this.push(fadeMs === undefined ? { kind: 'stop' } : { kind: 'stop', fadeMs }),
  };

  /** Returns and forgets the calls recorded so far. */
  drain(): SoundCall[] {
    const out = this.calls;
    this.calls = [];
    return out;
  }
}

/** Collects sim events against the capture clock. */
export class EventLog {
  private calls: EventCall[] = [];
  enabled = true;

  constructor(private readonly clock: FrameClock) {}

  add(tick: number, events: readonly SimEvent[]): void {
    if (!this.enabled) return;
    for (const ev of events) this.calls.push({ frame: this.clock.frame, t: Math.round(this.clock.t * 100) / 100, tick, ev });
  }

  drain(): EventCall[] {
    const out = this.calls;
    this.calls = [];
    return out;
  }
}
