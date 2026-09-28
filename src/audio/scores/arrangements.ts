/**
 * The "Dawn March" arrangements (DESIGN A13 Music "Arrangements" and "Layers"):
 *
 * | Arrangement | Instruments |
 * |---|---|
 * | Stone | hide drums, toms and shaker, breathy square flute, a low drone |
 * | Medieval | plucked lute, horn, tabor |
 * | Gunpowder | fife, snare march, bass drum, tuba |
 * | Modern | brass lead and stabs, synth bass, drum kit |
 * | Future | arpeggiated synths, lead, pad, sidechain pump, four-on-the-floor |
 * | Menu | the slow version (84 BPM), soft flute, pad, bell |
 * | Capsule room | an 8-bar anticipation loop built on the motif in A minor |
 *
 * Every battle arrangement is 16 bars long at 110 BPM, so an evolve can switch arrangements on the same
 * step, and has the three adaptive layers: `intensity` (a harmony line a third below the melody plus
 * extra percussion), `overdrive` (double-time percussion; the engine also adds 8 BPM) and `siege`
 * (a heartbeat bass on the chord roots).
 */
import type { InstrumentId } from '../instruments';
import type { Score, SeqNote, SeqTrack, TrackLayer } from '../sequencer';
import {
  barsToNotes,
  chordRoot,
  chordVoicing,
  diatonicBelow,
  HARMONY,
  STEPS_PER_BAR,
  STEPS_PER_BEAT,
  THEME_BARS,
  THEME_BPM,
  themeMelody,
  type ChordName,
  type MelodyBar,
} from './dawnMarch';

/** Overdrive's tempo lift at full layer (A13: "+8 BPM feel"). */
export const OVERDRIVE_BPM = 8;

// ---------------------------------------------------------------------------------------------------
// Track builders

type Hits = readonly (readonly [number, number])[];

function track(name: string, instrument: InstrumentId, layer: TrackLayer, notes: SeqNote[], extra: Partial<SeqTrack> = {}): SeqTrack {
  return { name, instrument, layer, notes, ...extra };
}

/** The theme melody. */
function melody(instrument: InstrumentId, layer: TrackLayer = 'base', o: { octave?: number; vel?: number } = {}): SeqTrack {
  return track(`${instrument} melody`, instrument, layer, themeMelody(o));
}

/** A harmony line a diatonic third below the melody (the intensity layer's counter voice). */
function harmonyLine(instrument: InstrumentId, layer: TrackLayer, o: { octave?: number; vel?: number } = {}): SeqTrack {
  const notes = themeMelody(o).map((n) => ({ ...n, midi: diatonicBelow(n.midi, 2) }));
  return track(`${instrument} harmony`, instrument, layer, notes);
}

/** Repeats a one-bar drum pattern [step, velocity] over `bars` (optionally only some bars). */
function drums(instrument: InstrumentId, layer: TrackLayer, hits: Hits, bars: number, only?: (bar: number) => boolean): SeqTrack {
  const notes: SeqNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    if (only && !only(bar)) continue;
    for (const [step, vel] of hits) notes.push({ step: bar * STEPS_PER_BAR + step, len: 1, midi: 60, vel });
  }
  return track(`${instrument} ${layer}`, instrument, layer, notes, { pitched: false });
}

/** Per-bar notes from the chord of each bar: `make(chord, barStart)` returns that bar's notes. */
function perChord(name: string, instrument: InstrumentId, layer: TrackLayer, chords: readonly ChordName[], make: (chord: ChordName, at: number) => SeqNote[], extra: Partial<SeqTrack> = {}): SeqTrack {
  return track(name, instrument, layer, chords.flatMap((c, bar) => make(c, bar * STEPS_PER_BAR)), extra);
}

/** Held chords, one per bar. */
function heldChords(instrument: InstrumentId, layer: TrackLayer, chords: readonly ChordName[], low: number, vel: number, extra: Partial<SeqTrack> = {}): SeqTrack {
  return perChord(`${instrument} chords`, instrument, layer, chords, (c, at) => chordVoicing(c, low).map((m) => ({ step: at, len: STEPS_PER_BAR, midi: m, vel })), extra);
}

/** Chord stabs at the given steps of every bar. */
function stabs(instrument: InstrumentId, layer: TrackLayer, chords: readonly ChordName[], low: number, hits: Hits, len: number): SeqTrack {
  return perChord(`${instrument} stabs`, instrument, layer, chords, (c, at) =>
    hits.flatMap(([step, vel]) => chordVoicing(c, low).map((m) => ({ step: at + step, len, midi: m, vel }))),
  );
}

/** Broken-chord arpeggio: `pattern` indexes the voicing (3 and up reach the next octave). */
function arpeggio(instrument: InstrumentId, layer: TrackLayer, chords: readonly ChordName[], low: number, pattern: readonly number[], every: number, vel: number, extra: Partial<SeqTrack> = {}): SeqTrack {
  return perChord(`${instrument} arpeggio`, instrument, layer, chords, (c, at) => {
    const v = chordVoicing(c, low);
    const notes: SeqNote[] = [];
    for (let k = 0; k * every < STEPS_PER_BAR; k++) {
      const idx = pattern[k % pattern.length] as number;
      const m = (v[idx % v.length] as number) + 12 * Math.floor(idx / v.length);
      notes.push({ step: at + k * every, len: every, midi: m, vel: k % 4 === 0 ? vel : vel * 0.8 });
    }
    return notes;
  }, extra);
}

/** A bass line: [step, semitones above the root, length, velocity] per bar at an octave. */
function bassLine(instrument: InstrumentId, layer: TrackLayer, chords: readonly ChordName[], octave: number, pattern: readonly (readonly [number, number, number, number])[], extra: Partial<SeqTrack> = {}): SeqTrack {
  return perChord(`${instrument} bass`, instrument, layer, chords, (c, at) =>
    pattern.map(([step, semis, len, vel]) => ({ step: at + step, len, midi: chordRoot(c, octave) + semis, vel })),
  extra);
}

/** Siege heartbeat (A13 Layers): lub-dub twice a bar on the chord root. */
function heartbeat(chords: readonly ChordName[]): SeqTrack {
  return bassLine('heartbeat', 'siege', chords, 2, [
    [0, 0, 2, 1],
    [3, 0, 2, 0.7],
    [8, 0, 2, 1],
    [11, 0, 2, 0.7],
  ]);
}

const every16th = (vel: number, accent: number): Hits => Array.from({ length: 16 }, (_, k) => [k, k % 4 === 2 ? accent : vel] as const);
const offbeats8th = (vel: number): Hits => [2, 6, 10, 14].map((k) => [k, vel] as const);
const eighths = (vel: number, offVel: number): Hits => [0, 2, 4, 6, 8, 10, 12, 14].map((k) => [k, k % 4 === 0 ? vel : offVel] as const);
const lastOfFour = (bar: number): boolean => bar % 4 === 3;

function battleScore(tracks: SeqTrack[], extra: Partial<Score> = {}): Score {
  return {
    bpm: THEME_BPM,
    stepsPerBeat: STEPS_PER_BEAT,
    lengthSteps: THEME_BARS * STEPS_PER_BAR,
    loop: true,
    overdriveBpm: OVERDRIVE_BPM,
    tracks,
    ...extra,
  };
}

const B = THEME_BARS;
const H = HARMONY;

// ---------------------------------------------------------------------------------------------------
// Battle arrangements

export const stoneArrangement: Score = battleScore([
  melody('flute'),
  bassLine('drone', 'base', H, 3, [[0, 0, 16, 0.7]]),
  drums('hideDrum', 'base', [[0, 1], [6, 0.55], [8, 0.9]], B),
  drums('tom', 'base', [[4, 0.7], [12, 0.7]], B),
  drums('tom', 'base', [[13, 0.55], [14, 0.65], [15, 0.8]], B, lastOfFour),
  drums('shaker', 'base', offbeats8th(0.6), B),
  harmonyLine('flute', 'intensity', { vel: 0.55 }),
  drums('tom', 'intensity', eighths(0.5, 0.35), B),
  drums('shaker', 'overdrive', every16th(0.35, 0.6), B),
  drums('hideDrum', 'overdrive', [[4, 0.7], [12, 0.7]], B),
  heartbeat(H),
]);

export const medievalArrangement: Score = battleScore([
  melody('horn'),
  arpeggio('lute', 'base', H, 55, [0, 1, 2, 1], 2, 0.75),
  bassLine('lute', 'base', H, 2, [[0, 0, 4, 0.9], [8, 7, 4, 0.8]]),
  drums('tabor', 'base', [[0, 1], [8, 0.8], [12, 0.6], [14, 0.5]], B),
  harmonyLine('horn', 'intensity', { vel: 0.55 }),
  drums('tabor', 'intensity', [[4, 0.6], [10, 0.5]], B),
  drums('tabor', 'overdrive', every16th(0.3, 0.5), B),
  drums('shaker', 'overdrive', eighths(0.4, 0.55), B),
  heartbeat(H),
]);

export const gunpowderArrangement: Score = battleScore([
  melody('fife', 'base', { octave: 1, vel: 0.8 }),
  drums('snare', 'base', [[0, 1], [2, 0.45], [3, 0.5], [4, 0.9], [8, 1], [10, 0.45], [11, 0.5], [12, 0.9], [14, 0.6], [15, 0.6]], B),
  drums('bassDrum', 'base', [[0, 1], [8, 0.9]], B),
  bassLine('tuba', 'base', H, 2, [[0, 0, 3, 0.9], [4, 7, 3, 0.7], [8, 0, 3, 0.85], [12, 7, 3, 0.7]]),
  harmonyLine('fife', 'intensity', { octave: 1, vel: 0.5 }),
  drums('bassDrum', 'intensity', [[4, 0.6], [12, 0.6]], B),
  drums('snare', 'overdrive', every16th(0.22, 0.4), B),
  drums('bassDrum', 'overdrive', [[6, 0.6], [14, 0.6]], B),
  heartbeat(H),
]);

export const modernArrangement: Score = battleScore([
  melody('brass'),
  stabs('brassStab', 'base', H, 55, [[0, 0.9], [6, 0.7], [10, 0.75]], 2),
  bassLine('synthBass', 'base', H, 2, [[0, 0, 2, 1], [2, 0, 2, 0.7], [4, 12, 2, 0.8], [6, 0, 2, 0.7], [8, 0, 2, 0.9], [10, 7, 2, 0.7], [12, 12, 2, 0.8], [14, 10, 2, 0.7]]),
  drums('kick', 'base', [[0, 1], [8, 0.95]], B),
  drums('snare', 'base', [[4, 0.9], [12, 0.9]], B),
  drums('hat', 'base', eighths(0.5, 0.75), B),
  harmonyLine('brass', 'intensity', { vel: 0.5 }),
  drums('kick', 'intensity', [[10, 0.7]], B),
  drums('hat', 'overdrive', every16th(0.35, 0.6), B),
  drums('snare', 'overdrive', [[7, 0.35], [15, 0.4]], B),
  heartbeat(H),
]);

export const futureArrangement: Score = battleScore(
  [
    melody('lead'),
    arpeggio('arp', 'base', H, 60, [0, 1, 2, 3, 2, 1], 1, 0.7, { pump: true }),
    heldChords('pad', 'base', H, 55, 0.7, { pump: true }),
    bassLine('synthBass', 'base', H, 2, [[2, 0, 2, 0.9], [6, 0, 2, 0.8], [10, 0, 2, 0.9], [14, 12, 2, 0.8]], { pump: true }),
    drums('kick', 'base', [[0, 1], [4, 0.9], [8, 1], [12, 0.9]], B),
    drums('hat', 'base', offbeats8th(0.7), B),
    drums('clap', 'base', [[4, 0.8], [12, 0.8]], B),
    arpeggio('arp', 'intensity', H, 72, [2, 1, 0, 1], 2, 0.5, { pump: true }),
    harmonyLine('lead', 'intensity', { vel: 0.45 }),
    drums('hat', 'overdrive', every16th(0.3, 0.55), B),
    drums('clap', 'overdrive', [[7, 0.4], [15, 0.5]], B),
    heartbeat(H),
  ],
  { pump: { depth: 0.55 } },
);

// ---------------------------------------------------------------------------------------------------
// Menu and capsule room

/** The slow version for Home and the menus (A13 "Menu: slow version"). */
export const menuArrangement: Score = {
  bpm: 84,
  stepsPerBeat: STEPS_PER_BEAT,
  lengthSteps: B * STEPS_PER_BAR,
  loop: true,
  tracks: [
    melody('softFlute', 'base', { vel: 0.7 }),
    heldChords('pad', 'base', H, 52, 0.6),
    bassLine('sub', 'base', H, 2, [[0, 0, 14, 0.55]]),
    arpeggio('bell', 'base', H, 72, [0, 2], 8, 0.35),
  ],
};

/** The capsule room loop: A minor anticipation, with the motif in minor in bars 5-6. */
const CAPSULE_CHORDS: readonly ChordName[] = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'];
const CAPSULE_MOTIF: readonly MelodyBar[] = [
  [[null, 16]],
  [[null, 16]],
  [[null, 16]],
  [[null, 16]],
  [['A4', 4], ['E4', 2], ['A4', 2], ['C5', 6], ['B4', 2]],
  [['A4', 3], ['B4', 1], ['C5', 4], ['E5', 8]],
  [[null, 16]],
  [[null, 16]],
];

export const capsuleArrangement: Score = {
  bpm: 100,
  stepsPerBeat: STEPS_PER_BEAT,
  lengthSteps: CAPSULE_CHORDS.length * STEPS_PER_BAR,
  loop: true,
  tracks: [
    arpeggio('bell', 'base', CAPSULE_CHORDS, 67, [0, 1, 2, 1], 2, 0.55),
    heldChords('pad', 'base', CAPSULE_CHORDS, 55, 0.6),
    bassLine('sub', 'base', CAPSULE_CHORDS, 2, [[0, 0, 3, 0.55], [4, 0, 3, 0.4], [8, 0, 3, 0.5], [12, 0, 3, 0.4]]),
    drums('shaker', 'base', offbeats8th(0.35), CAPSULE_CHORDS.length),
    track('softFlute motif', 'softFlute', 'base', barsToNotes(CAPSULE_MOTIF, { vel: 0.6 })),
  ],
};
