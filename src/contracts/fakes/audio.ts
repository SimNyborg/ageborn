/**
 * Recording `AudioService` fake (DESIGN B7: "Tests run against a FakeAudioService that records calls").
 * Makes no sound; every call is appended to `calls` in order.
 */
import type { AudioService, Bus, MusicLayer } from '../audio';
import type { MusicCueId, SoundId } from '../ids';

export type FakeAudioCall =
  | { method: 'unlock' }
  | { method: 'play'; id: SoundId; o?: { pitchBp?: number; volumeDb?: number; pan?: number; priority?: number } }
  | { method: 'setBusVolume'; bus: Bus; v01: number }
  | { method: 'music.setCue'; cue: MusicCueId; o?: { fadeMs?: number } }
  | { method: 'music.setLayer'; layer: MusicLayer; v01: number }
  | { method: 'music.transpose'; semitones: number }
  | { method: 'music.duck'; db: number; ms: number }
  | { method: 'music.stop'; fadeMs?: number };

export class FakeAudio implements AudioService {
  readonly calls: FakeAudioCall[] = [];
  unlocked = false;
  readonly busVolume: Record<Bus, number> = { master: 1, music: 1, sfx: 1, ui: 1 };
  cue: MusicCueId | null = null;

  async unlock(): Promise<void> {
    this.unlocked = true;
    this.calls.push({ method: 'unlock' });
  }

  play(id: SoundId, o?: { pitchBp?: number; volumeDb?: number; pan?: number; priority?: number }): void {
    this.calls.push(o === undefined ? { method: 'play', id } : { method: 'play', id, o });
  }

  setBusVolume(bus: Bus, v01: number): void {
    this.busVolume[bus] = v01;
    this.calls.push({ method: 'setBusVolume', bus, v01 });
  }

  readonly music: AudioService['music'] = {
    setCue: (cue, o) => {
      this.cue = cue;
      this.calls.push(o === undefined ? { method: 'music.setCue', cue } : { method: 'music.setCue', cue, o });
    },
    setLayer: (layer, v01) => {
      this.calls.push({ method: 'music.setLayer', layer, v01 });
    },
    transpose: (semitones) => {
      this.calls.push({ method: 'music.transpose', semitones });
    },
    duck: (db, ms) => {
      this.calls.push({ method: 'music.duck', db, ms });
    },
    stop: (fadeMs) => {
      this.cue = null;
      this.calls.push(fadeMs === undefined ? { method: 'music.stop' } : { method: 'music.stop', fadeMs });
    },
  };

  /** Sound ids passed to `play`, in order. */
  played(): SoundId[] {
    return this.calls.flatMap((c) => (c.method === 'play' ? [c.id] : []));
  }

  clear(): void {
    this.calls.length = 0;
  }
}
