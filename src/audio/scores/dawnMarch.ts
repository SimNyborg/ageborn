/**
 * "Dawn March", Ageborn's own theme (DESIGN A13 Music "Theme"): 16 singable bars at 110 BPM in C major,
 * written as note data. Every age arrangement, the menu version and the stingers are built on it.
 *
 * Shape: A (bars 1-4, rising call that ends open), A' (5-8, reaches higher and comes home), B (9-12,
 * a bridge through A minor and F that lifts to the dominant), A'' (13-16, the call from the top of the
 * range, then home). The opening "C - G C E" is the motif the fanfares and stingers quote. It is a
 * dotted, stepwise march rather than a fanfare of leaps, deliberately unlike the classic genre themes.
 */
import type { SeqNote } from '../sequencer';
import { midi } from '../soundKit';

export const THEME_BPM = 110;
export const STEPS_PER_BEAT = 4;
export const BEATS_PER_BAR = 4;
export const STEPS_PER_BAR = STEPS_PER_BEAT * BEATS_PER_BAR;
export const THEME_BARS = 16;
export const THEME_STEPS = THEME_BARS * STEPS_PER_BAR;

/** A melody bar: [note name or null for a rest, length in 16th steps]; each bar sums to 16. */
export type MelodyBar = readonly (readonly [string | null, number])[];

export const MELODY: readonly MelodyBar[] = [
  // A
  [['C5', 4], ['G4', 2], ['C5', 2], ['E5', 6], ['D5', 2]],
  [['C5', 3], ['D5', 1], ['E5', 4], ['G5', 8]],
  [['A5', 4], ['G5', 2], ['E5', 2], ['F5', 4], ['D5', 4]],
  [['E5', 3], ['D5', 1], ['C5', 4], ['D5', 8]],
  // A'
  [['C5', 4], ['G4', 2], ['C5', 2], ['E5', 6], ['D5', 2]],
  [['C5', 3], ['D5', 1], ['E5', 4], ['A5', 8]],
  [['G5', 4], ['F5', 2], ['E5', 2], ['D5', 4], ['G4', 4]],
  [['C5', 12], [null, 4]],
  // B
  [['A4', 2], ['C5', 2], ['E5', 4], ['A5', 4], ['G5', 4]],
  [['F5', 6], ['E5', 2], ['D5', 4], ['C5', 4]],
  [['B4', 2], ['D5', 2], ['G5', 4], ['F5', 4], ['D5', 4]],
  [['E5', 4], ['D5', 2], ['E5', 2], ['G5', 8]],
  // A''
  [['C6', 4], ['G5', 2], ['E5', 2], ['A5', 6], ['G5', 2]],
  [['F5', 4], ['A5', 4], ['G5', 4], ['E5', 4]],
  [['D5', 4], ['G5', 2], ['F5', 2], ['E5', 4], ['D5', 4]],
  [['C5', 12], [null, 4]],
];

export type ChordName = 'C' | 'Dm' | 'Em' | 'F' | 'G' | 'Am' | 'E';

/** Chord root as a pitch class (C = 0) and its tones in semitones above the root. */
export const CHORDS: Readonly<Record<ChordName, { root: number; tones: readonly number[] }>> = {
  C: { root: 0, tones: [0, 4, 7] },
  Dm: { root: 2, tones: [0, 3, 7] },
  Em: { root: 4, tones: [0, 3, 7] },
  F: { root: 5, tones: [0, 4, 7] },
  G: { root: 7, tones: [0, 4, 7] },
  Am: { root: 9, tones: [0, 3, 7] },
  E: { root: 4, tones: [0, 4, 7] },
};

/** One chord per bar under the melody. */
export const HARMONY: readonly ChordName[] = ['C', 'C', 'F', 'G', 'C', 'Am', 'G', 'C', 'Am', 'F', 'G', 'G', 'C', 'F', 'G', 'C'];

/** Turns melody bars into sequencer notes (bars are 16 steps; rests leave gaps). */
export function barsToNotes(bars: readonly MelodyBar[], o: { octave?: number; vel?: number; startStep?: number } = {}): SeqNote[] {
  const notes: SeqNote[] = [];
  const shift = 12 * (o.octave ?? 0);
  let step = o.startStep ?? 0;
  for (const bar of bars) {
    for (const [name, len] of bar) {
      if (name !== null) notes.push({ step, len, midi: midi(name) + shift, vel: o.vel ?? 0.85 });
      step += len;
    }
  }
  return notes;
}

/** The theme melody as sequencer notes. */
export function themeMelody(o: { octave?: number; vel?: number } = {}): SeqNote[] {
  return barsToNotes(MELODY, o);
}

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** The diatonic note `degrees` scale steps below `m` in C major (a third below = 2). */
export function diatonicBelow(m: number, degrees: number): number {
  const pc = ((m % 12) + 12) % 12;
  const idx = C_MAJOR.indexOf(pc);
  if (idx < 0) return m - 3;
  const octave = Math.floor(m / 12);
  const targetIdx = idx - degrees;
  const wrap = Math.floor(targetIdx / C_MAJOR.length);
  const pcTarget = C_MAJOR[((targetIdx % C_MAJOR.length) + C_MAJOR.length) % C_MAJOR.length] as number;
  return (octave + wrap) * 12 + pcTarget;
}

/** The chord's tones voiced inside the octave [low, low + 12). */
export function chordVoicing(chord: ChordName, low: number): number[] {
  const c = CHORDS[chord];
  return c.tones
    .map((t) => {
      const pc = (c.root + t) % 12;
      let m = low - (((low % 12) + 12) % 12) + pc;
      if (m < low) m += 12;
      return m;
    })
    .sort((a, b) => a - b);
}

/** The chord root at an octave (C of octave `octave` = MIDI 12 × (octave + 1)). */
export function chordRoot(chord: ChordName, octave: number): number {
  return 12 * (octave + 1) + CHORDS[chord].root;
}
