/**
 * Audio service (DESIGN B15 `audio.ts`, B7, A13). Implemented by `WebAudioService` (WP6);
 * tests use a recording fake (B7). Injected into render and capsule (B2).
 */
import type { MusicCueId, SoundId } from './ids';

/**
 * Mixer buses (A13). `voice` is the narrator (queue item 39, owner request 2026-10-18): its own volume
 * setting, under the master like the others, never ducked itself (it ducks the music while it speaks).
 */
export type Bus = 'master' | 'music' | 'sfx' | 'ui' | 'voice';

/** Adaptive music layers (DESIGN A14.3, A13). */
export type MusicLayer = 'intensity' | 'overdrive' | 'siege';

export interface AudioService {
  /** Resolves after the first user gesture unlocks the AudioContext (DESIGN B11 Boot). */
  unlock(): Promise<void>;
  play(id: SoundId, o?: { pitchBp?: number; volumeDb?: number; pan?: number; priority?: number }): void;
  setBusVolume(bus: Bus, v01: number): void;
  music: {
    setCue(cue: MusicCueId, o?: { fadeMs?: number }): void;
    setLayer(l: MusicLayer, v01: number): void;
    transpose(semitones: number): void;
    duck(db: number, ms: number): void;
    stop(fadeMs?: number): void;
  };
}
