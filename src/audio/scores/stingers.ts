/**
 * Victory and defeat stingers on the "Dawn March" motif (DESIGN A13 Music: "Plus victory and defeat
 * stingers on the motif"). One-shot scores; they play in the key the battle ended in.
 */
import type { Score, SeqNote, SeqTrack } from '../sequencer';
import { barsToNotes, chordRoot, chordVoicing, STEPS_PER_BAR, STEPS_PER_BEAT, type MelodyBar } from './dawnMarch';

function hits(steps: readonly (readonly [number, number])[], midi = 60): SeqNote[] {
  return steps.map(([step, vel]) => ({ step, len: 1, midi, vel }));
}

/** Victory: the motif as a brass fanfare that climbs to the top C, over a snare and timpani roll. */
const VICTORY_MELODY: readonly MelodyBar[] = [
  [['C5', 4], ['G4', 2], ['C5', 2], ['E5', 4], ['G5', 4]],
  [['C6', 16]],
];
/** Two bars and a beat for the last chord to ring. */
const STINGER_STEPS = 2 * STEPS_PER_BAR + STEPS_PER_BEAT;

export const victoryStinger: Score = {
  bpm: 120,
  stepsPerBeat: STEPS_PER_BEAT,
  lengthSteps: STINGER_STEPS,
  loop: false,
  tracks: [
    { name: 'brass fanfare', instrument: 'brass', layer: 'base', notes: barsToNotes(VICTORY_MELODY, { vel: 0.95 }) },
    {
      name: 'brass chord',
      instrument: 'brass',
      layer: 'base',
      notes: chordVoicing('C', 55).map((midi) => ({ step: STEPS_PER_BAR, len: 12, midi, vel: 0.6 })),
    },
    {
      name: 'snare roll',
      instrument: 'snare',
      layer: 'base',
      pitched: false,
      notes: hits([[8, 0.3], [9, 0.35], [10, 0.4], [11, 0.45], [12, 0.55], [13, 0.65], [14, 0.75], [15, 0.9]]),
    },
    {
      name: 'timpani',
      instrument: 'timpani',
      layer: 'base',
      notes: [
        { step: 0, len: 4, midi: chordRoot('C', 2), vel: 0.8 },
        { step: 8, len: 4, midi: chordRoot('G', 1), vel: 0.7 },
        { step: STEPS_PER_BAR, len: 8, midi: chordRoot('C', 2), vel: 1 },
      ],
    },
    { name: 'sub', instrument: 'sub', layer: 'base', notes: [{ step: STEPS_PER_BAR, len: 14, midi: chordRoot('C', 2), vel: 0.8 }] },
  ] satisfies SeqTrack[],
};

/** Defeat: gentle, not mocking (A13). A slow descent on the soft flute that still comes home to C. */
const DEFEAT_MELODY: readonly MelodyBar[] = [
  [['G4', 4], ['E4', 4], ['D4', 4], ['C4', 4]],
  [['D4', 6], ['E4', 2], ['C4', 8]],
];

export const defeatStinger: Score = {
  bpm: 96,
  stepsPerBeat: STEPS_PER_BEAT,
  lengthSteps: STINGER_STEPS,
  loop: false,
  tracks: [
    { name: 'soft flute', instrument: 'softFlute', layer: 'base', notes: barsToNotes(DEFEAT_MELODY, { vel: 0.7 }) },
    {
      name: 'pad',
      instrument: 'pad',
      layer: 'base',
      notes: [
        ...chordVoicing('Am', 52).map((midi) => ({ step: 0, len: 16, midi, vel: 0.55 })),
        ...chordVoicing('F', 52).map((midi) => ({ step: 16, len: 8, midi, vel: 0.5 })),
        ...chordVoicing('C', 52).map((midi) => ({ step: 24, len: 12, midi, vel: 0.5 })),
      ],
    },
    {
      name: 'sub',
      instrument: 'sub',
      layer: 'base',
      notes: [
        { step: 0, len: 15, midi: chordRoot('Am', 2), vel: 0.5 },
        { step: 16, len: 7, midi: chordRoot('F', 2), vel: 0.45 },
        { step: 24, len: 12, midi: chordRoot('C', 2), vel: 0.45 },
      ],
    },
    { name: 'bell', instrument: 'bell', layer: 'base', notes: [{ step: 24, len: 8, midi: chordRoot('C', 5), vel: 0.3 }] },
  ] satisfies SeqTrack[],
};
