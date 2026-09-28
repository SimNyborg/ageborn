/**
 * A small step sequencer (DESIGN A13 Music "Engine"). Pure: it turns a score and a clock into timed
 * note events, and the music engine plays those with the synth instruments. Tempo can change between
 * steps (the Overdrive layer's +8 BPM feel); layers and transposition are applied by the engine.
 */
import type { MusicLayer } from '@/contracts';
import type { InstrumentId } from './instruments';

/** One note: starts at `step`, lasts `len` steps; `midi` is ignored by unpitched drums; `vel` 0..1. */
export interface SeqNote {
  step: number;
  len: number;
  midi: number;
  vel: number;
}

/** A track plays on the base loop or on one of the adaptive layers (A13 Layers). */
export type TrackLayer = 'base' | MusicLayer;

export interface SeqTrack {
  name: string;
  instrument: InstrumentId;
  layer: TrackLayer;
  notes: readonly SeqNote[];
  /** Linear gain for the whole track (default 1). */
  gain?: number;
  /** False for drums: the key-change transposition does not apply. Default true. */
  pitched?: boolean;
  /** Routes the track through the score's sidechain pump. */
  pump?: boolean;
}

export interface Score {
  bpm: number;
  stepsPerBeat: number;
  lengthSteps: number;
  loop: boolean;
  tracks: readonly SeqTrack[];
  /** BPM added at full Overdrive layer (A13: "+8 BPM feel"); 0 or absent for non-battle cues. */
  overdriveBpm?: number;
  /** Sidechain pump on `pump` tracks: gain dips by `depth` (0..1) on every beat (A13 Future). */
  pump?: { depth: number };
}

export interface NoteEvent {
  /** Start in seconds (audio clock). */
  time: number;
  /** Length in seconds. */
  dur: number;
  midi: number;
  vel: number;
  track: number;
  step: number;
}

export interface BeatEvent {
  time: number;
  /** Beat length in seconds at the current tempo. */
  beat: number;
}

export interface SeqBlock {
  notes: NoteEvent[];
  beats: BeatEvent[];
}

/** Seconds per step at a tempo. */
export function stepSeconds(bpm: number, stepsPerBeat: number): number {
  return 60 / Math.max(1, bpm) / Math.max(1, stepsPerBeat);
}

/** Length of one pass of a score in seconds at its own tempo. */
export function scoreSeconds(score: Score): number {
  return score.lengthSteps * stepSeconds(score.bpm, score.stepsPerBeat);
}

export class Sequencer {
  /** The next step to schedule. */
  step: number;
  /** Audio time of `step`. */
  nextTime: number;
  /** Passes completed (loops wrap back to step 0). */
  passes = 0;
  private finished = false;
  private readonly byStep: { track: number; note: SeqNote }[][];

  constructor(
    readonly score: Score,
    startTime: number,
    startStep = 0,
  ) {
    this.step = ((startStep % score.lengthSteps) + score.lengthSteps) % score.lengthSteps;
    this.nextTime = startTime;
    this.byStep = Array.from({ length: score.lengthSteps }, () => []);
    score.tracks.forEach((t, track) => {
      for (const note of t.notes) {
        if (note.step >= 0 && note.step < score.lengthSteps) this.byStep[note.step]!.push({ track, note });
      }
    });
  }

  /** True once a one-shot score has scheduled its last step. */
  get done(): boolean {
    return this.finished;
  }

  /**
   * Schedules every step that starts before `until` at tempo `bpm`, and returns the notes (with their
   * lengths at that tempo) and the beats. `include(track)` can skip tracks (silent layers).
   */
  advance(until: number, bpm: number, include: (track: number) => boolean = () => true): SeqBlock {
    const out: SeqBlock = { notes: [], beats: [] };
    const sp = stepSeconds(bpm, this.score.stepsPerBeat);
    while (!this.finished && this.nextTime < until) {
      const t = this.nextTime;
      for (const { track, note } of this.byStep[this.step] ?? []) {
        if (!include(track)) continue;
        out.notes.push({ time: t, dur: note.len * sp, midi: note.midi, vel: note.vel, track, step: this.step });
      }
      if (this.step % this.score.stepsPerBeat === 0) out.beats.push({ time: t, beat: sp * this.score.stepsPerBeat });
      this.nextTime += sp;
      this.step++;
      if (this.step >= this.score.lengthSteps) {
        this.passes++;
        if (this.score.loop) this.step = 0;
        else this.finished = true;
      }
    }
    return out;
  }

  /**
   * When the clock ran ahead (a throttled background tab), skips the missed steps silently so the
   * music resumes on the grid instead of bursting out every late note.
   */
  catchUp(now: number, bpm: number): number {
    const sp = stepSeconds(bpm, this.score.stepsPerBeat);
    let skipped = 0;
    while (!this.finished && this.nextTime < now) {
      this.nextTime += sp;
      this.step++;
      skipped++;
      if (this.step >= this.score.lengthSteps) {
        this.passes++;
        if (this.score.loop) this.step = 0;
        else this.finished = true;
      }
    }
    return skipped;
  }
}
