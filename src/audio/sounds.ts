/**
 * Sound manifest (DESIGN B7, A13, A14.2): every `SoundId` → its source and mix settings.
 *
 * All v1 sounds are ZzFX definitions with 3-5 variants, pre-rendered to sample buffers (B7): the boot
 * groups (UI, shared battle sounds, Stone, Medieval) at boot, the rest lazily. Any id can later point
 * to a recorded file with `{ kind: 'file', src }` without touching callers.
 *
 * Kinds:
 * - `zzfx`: one ZzFX call per variant, the B7 shape (arrays paste to and from the ZzFX designer).
 * - `zzfxMix`: several ZzFX calls mixed per variant, for jingles, fanfares and layered impacts.
 * - `file`: a recorded file, fetched and decoded on first use.
 *
 * Mix settings (all optional): `gainDb` trims the level, `maxVoices` (default 4, never more) and
 * `gapMs` (default 40, never less) limit retriggers (A13), `pitchVarBp` (default 800 = ±8%) and
 * `volVarDb` (default 3) set the per play variation. Sounds that must keep their pitch (musical,
 * timed or pitched by the caller, see below) use `pitchVarBp: 0`.
 */
import type { AgeId, SoundId } from '@/contracts';
import { at, hz, mixVariants, note, variants, type Zz, type ZzfxNote } from './soundKit';
import type { ZzfxParams } from './vendor/zzfx';

export type { ZzfxNote } from './soundKit';

/** Buses a sound can play on (the music bus belongs to the sequencer). */
export type SoundBus = 'sfx' | 'ui';

/**
 * Pre-render groups (B7): UI; `battle`, the sounds every battle needs from its first seconds; one per
 * age (attacks and powers); `match`, the rarer sounds of later match moments (evolve fanfares, Overdrive,
 * Siege, Last Stand, Legendary spawns, the end of the match); and the capsule show.
 */
export type SoundGroup = 'ui' | 'battle' | AgeId | 'match' | 'capsule';

/** Every group, in lazy render order after boot (the eight ages in match order, A17.8). */
export const SOUND_GROUPS: readonly SoundGroup[] = ['ui', 'battle', 'stone', 'bronze', 'medieval', 'match', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic', 'capsule'];

/**
 * Groups rendered at boot (B7 with A17.17: UI and the first two ages, now Stone and Bronze, plus the
 * shared battle sounds they need). The rest render in idle time right after boot, long before a match
 * reaches them, or on first use. These ZzFX renders are only the fallback until the recorded sheets
 * (`files.ts`) decode.
 */
export const BOOT_GROUPS: readonly SoundGroup[] = ['ui', 'battle', 'stone', 'bronze'];

export interface SoundMix {
  bus: SoundBus;
  group: SoundGroup;
  /** Level trim in dB (default 0). */
  gainDb?: number;
  /** Most voices of this id at once (default 4, A13; lower only). */
  maxVoices?: number;
  /** Minimum ms between two starts of this id (default 40, A13; higher only). */
  gapMs?: number;
  /** Random pitch spread per play in bp of the rate (default 800 = ±8%, A13). */
  pitchVarBp?: number;
  /** Random volume spread per play in dB (default 3 = ±3 dB, A13). */
  volVarDb?: number;
}

export type SoundSource =
  | { kind: 'zzfx'; variants: ZzfxParams[] }
  | { kind: 'zzfxMix'; variants: ZzfxNote[][] }
  | { kind: 'file'; src: string };

export type SoundDef = SoundSource & SoundMix;

export const DEFAULT_MAX_VOICES = 4;
export const DEFAULT_GAP_MS = 40;
export const DEFAULT_PITCH_VAR_BP = 800;
export const DEFAULT_VOL_VAR_DB = 3;

type Extra = Omit<SoundMix, 'bus' | 'group'>;

function busOf(group: SoundGroup): SoundBus {
  return group === 'ui' ? 'ui' : 'sfx';
}

/** A single-call ZzFX sound. */
function fx(group: SoundGroup, v: number[][], extra: Extra = {}): SoundDef {
  return { kind: 'zzfx', variants: v, bus: busOf(group), group, ...extra };
}

/** A layered ZzFX sound. */
function mix(group: SoundGroup, v: ZzfxNote[][], extra: Extra = {}): SoundDef {
  return { kind: 'zzfxMix', variants: v, bus: busOf(group), group, ...extra };
}

/*
 * Every sound varies by A13's pitch ±8% and volume ±3 dB per play, except where another DESIGN rule
 * needs a steady pitch (the random pitch is a playback-rate change, so it also changes the length).
 * Those sounds keep the ±3 dB volume spread and still rotate their variants.
 */
/** In tune with the music and each other: jingles, fanfares, rarity reveals, chimes, capsule climbs. */
const MUSICAL: Extra = { pitchVarBp: 0 };
/** Length synced to game timing: the 1.0 s power telegraph (A2.9), the 2.5 s evolve riser, risers. */
const TIMED: Extra = { pitchVarBp: 0 };
/** The caller sets the pitch on purpose: coin climbs (A13), copy-bar climbs and the falling reel (A10.1). */
const CALLER_PITCHED: Extra = { pitchVarBp: 0 };

// ---------------------------------------------------------------------------------------------------
// Shared building blocks

const thump = (atMs: number, freq: number, vol: number, release: number, slide = -0.8): ZzfxNote =>
  at(atMs, { vol, freq, attack: 0.002, release, shape: 'sin', slide });

const noiseBurst = (atMs: number, p: Zz): ZzfxNote => at(atMs, { shape: 'noise', attack: 0.002, ...p });

const coin = (atMs: number, freq: number, vol = 0.45): ZzfxNote =>
  at(atMs, { vol, freq, attack: 0.001, sustain: 0.03, release: 0.14, shape: 'tri', curve: 1.6, jump: freq / 2, jumpTime: 0.045 });

/** The opening of "Dawn March" (C5 G4 C5 E5, see scores/dawnMarch.ts) as a fanfare in one timbre. */
function motifFanfare(k: number, voice: Zz, extra: ZzfxNote[] = [], shift = 0): ZzfxNote[] {
  const n = (ms: number, name: string, len: number, vol: number): ZzfxNote =>
    note(ms, name, { ...voice, vol, sustain: len, release: voice.release ?? 0.12 }, shift);
  const out = [n(0, 'C5', 0.12, 0.42), n(170, 'G4', 0.05, 0.38), n(255, 'C5', 0.05, 0.4), n(340, 'E5', 0.42, 0.45)];
  // Final chord under the long E: C4 + G4 (variant 1 adds the octave C6, variant 2 a closing G5).
  out.push(n(340, 'C4', 0.4, 0.25), n(340, 'G4', 0.4, 0.2));
  if (k === 1) out.push(n(340, 'C6', 0.4, 0.18));
  if (k === 2) out.push(n(760, 'G5', 0.25, 0.3));
  return [...out, ...extra];
}

const FANFARE_VOICES: Record<AgeId, { voice: Zz; extra: (v: number) => ZzfxNote[] }> = {
  // Breathy square flute over hide drums.
  stone: {
    voice: { shape: 'square', curve: 1, attack: 0.02, lowpass: 2200, noise: 0.05 },
    extra: (v) => [thump(0, 95 * (1 + 0.04 * v), 0.6, 0.25), thump(340, 85, 0.6, 0.3), thump(520, 95, 0.4, 0.2)],
  },
  // Horn.
  medieval: {
    voice: { shape: 'saw', attack: 0.04, lowpass: 1600 },
    extra: () => [thump(340, 70, 0.5, 0.4, -0.3)],
  },
  // Fife an octave up over a snare roll.
  gunpowder: {
    voice: { shape: 'square', curve: 0.5, attack: 0.01, lowpass: 5000 },
    extra: (v) => [noiseBurst(0, { vol: 0.3, freq: 1800 * (1 + 0.05 * v), sustain: 0.3, release: 0.08, repeat: 0.04, tremolo: 0.5, highpass: 1200 })],
  },
  // Brass with a chord stab.
  modern: {
    voice: { shape: 'saw', attack: 0.015, lowpass: 2600 },
    extra: () => [note(340, 'E4', { vol: 0.2, shape: 'saw', attack: 0.015, sustain: 0.3, release: 0.15, lowpass: 2000 }), thump(340, 60, 0.6, 0.35, -0.4)],
  },
  // Synth lead, a closing arpeggio and a sub.
  future: {
    voice: { shape: 'square', curve: 0.5, attack: 0.005, lowpass: 4500 },
    extra: () => [
      note(620, 'C6', { vol: 0.2, shape: 'square', curve: 0.5, release: 0.06, lowpass: 5000 }),
      note(660, 'E6', { vol: 0.2, shape: 'square', curve: 0.5, release: 0.06, lowpass: 5000 }),
      note(700, 'G6', { vol: 0.2, shape: 'square', curve: 0.5, release: 0.1, lowpass: 5000 }),
      at(340, { vol: 0.5, freq: 65, attack: 0.01, sustain: 0.3, release: 0.3, shape: 'sin' }),
    ],
  },
  // A17.12 arrangements. Plucked lyre over a frame drum with a reed-pipe drone.
  bronze: {
    voice: { shape: 'tri', curve: 1.4, attack: 0.003, lowpass: 3000 },
    extra: (v) => [
      thump(0, 110 * (1 + 0.04 * v), 0.5, 0.2),
      thump(340, 100, 0.5, 0.25),
      note(340, 'C4', { vol: 0.14, shape: 'square', curve: 0.6, attack: 0.05, sustain: 0.35, release: 0.2, mod: 5, lowpass: 1800 }),
    ],
  },
  // Cornet over tuba and an anvil strike.
  industrial: {
    voice: { shape: 'saw', attack: 0.02, lowpass: 2200 },
    extra: () => [
      note(340, 'C3', { vol: 0.3, shape: 'saw', attack: 0.02, sustain: 0.3, release: 0.2, lowpass: 900 }),
      noiseBurst(340, { vol: 0.25, freq: 2600, release: 0.2, highpass: 1800 }),
      at(340, { vol: 0.22, freq: 1870, attack: 0.001, release: 0.5, shape: 'tri', curve: 2 }),
    ],
  },
  // Choir pad with a bell arpeggio and a deep sub.
  cosmic: {
    voice: { shape: 'saw', attack: 0.06, lowpass: 1800 },
    extra: () => [
      note(620, 'G5', { vol: 0.18, shape: 'sin', release: 0.4 }),
      note(680, 'C6', { vol: 0.18, shape: 'sin', release: 0.4 }),
      note(740, 'E6', { vol: 0.15, shape: 'sin', release: 0.5 }),
      at(340, { vol: 0.5, freq: 49, attack: 0.02, sustain: 0.35, release: 0.4, shape: 'sin' }),
    ],
  },
};

/** Transposition of each fanfare in semitones (the Gunpowder fife plays an octave up). */
const FANFARE_SHIFT: Partial<Record<AgeId, number>> = { gunpowder: 12 };

/**
 * The evolve fanfare of an age. The five original ages render with the `match` group; the A17 ages sit in
 * their own age group, which is also the recorded sheet `tools/audio` put them in.
 */
function fanfare(age: AgeId): SoundDef {
  const f = FANFARE_VOICES[age];
  const shift = FANFARE_SHIFT[age] ?? 0;
  const group: SoundGroup = age === 'bronze' || age === 'industrial' || age === 'cosmic' ? age : 'match';
  return mix(group, mixVariants(3, (v, k) => motifFanfare(k, f.voice, f.extra(v), shift)), MUSICAL);
}

function climb(step: 1 | 2 | 3 | 4): SoundDef {
  const names = ['C5', 'E5', 'G5', 'C6'] as const;
  const name = names[step - 1] as string;
  return mix(
    'capsule',
    mixVariants(3, (v) => {
      const out = [
        noiseBurst(0, { vol: 0.5, freq: 220 * (1 + 0.1 * v), release: 0.12, lowpass: 1500 }),
        thump(0, 90 + 10 * step, 0.4, 0.15),
        note(10, name, { vol: 0.42, attack: 0.002, release: 0.5 + 0.15 * step, shape: 'tri' }),
      ];
      if (step >= 2) out.push(note(10, name, { vol: 0.14, attack: 0.002, release: 0.4 + 0.1 * step, shape: 'sin' }, 7));
      if (step >= 3) out.push(note(10, name, { vol: 0.12, attack: 0.002, release: 0.6, shape: 'sin' }, 12));
      if (step === 4) out.push(at(60, { vol: 0.14, freq: 2400, attack: 0.03, sustain: 0.2, release: 0.3, shape: 'tri', slide: 4, tremolo: 0.5, repeat: 0.025 }));
      return out;
    }),
    MUSICAL,
  );
}

/**
 * The summit tiers (A10 step 3b, A13): Platinum climbs one more step up the arpeggio with a glass-bell
 * partial (inharmonic ×2.76); Aeon is richer and lower, not shriller: a choir pad of detuned saws
 * (lowpass 2.4 kHz) and a clock tick at +60 ms.
 */
function summitClimb(step: 5 | 6): SoundDef {
  return mix(
    'capsule',
    mixVariants(3, (v) => {
      const out = [
        noiseBurst(0, { vol: 0.55, freq: 200 * (1 + 0.1 * v), release: 0.16, lowpass: 1400 }),
        thump(0, step === 5 ? 120 : 80, 0.55, 0.3),
      ];
      if (step === 5) {
        out.push(
          note(10, 'E6', { vol: 0.4, attack: 0.002, release: 1.3, shape: 'tri' }),
          note(10, 'E6', { vol: 0.14, attack: 0.002, release: 1.1, shape: 'sin' }, 7),
          at(10, { vol: 0.13, freq: hz('E6') * 2.76, attack: 0.001, release: 0.9, shape: 'sin' }),
          note(10, 'C5', { vol: 0.14, attack: 0.002, release: 1.0, shape: 'sin' }),
        );
      } else {
        const pad: Zz = { attack: 0.06, sustain: 0.5, release: 0.9, shape: 'saw', lowpass: 2400 };
        out.push(
          note(10, 'C5', { vol: 0.34, attack: 0.002, release: 1.4, shape: 'tri' }),
          note(10, 'C4', { ...pad, vol: 0.14 }),
          at(10, { ...pad, vol: 0.12, freq: hz('C4') * 1.006 }),
          note(10, 'G4', { ...pad, vol: 0.11 }),
          note(10, 'E5', { ...pad, vol: 0.09 }),
          at(10, { vol: 0.5, freq: 65, attack: 0.004, release: 0.9, slide: -0.2 }),
          at(60, { vol: 0.3, freq: 2600, attack: 0.001, release: 0.03, shape: 'square', lowpass: 7000 }),
        );
      }
      return out;
    }),
    MUSICAL,
  );
}

// ---------------------------------------------------------------------------------------------------
// Power family recipes (A2.9, A5.7): the power rework's sounds until `tools/audio` renders them.

/** A sweep: a whoosh that crosses the zone, with a hit at the peak. `freq` colours it, `ms` its length. */
function powerSweep(id: string, group: SoundGroup, freq: number, ms: number): Record<string, SoundDef> {
  const t = ms / 1000;
  return {
    [id]: mix(group, mixVariants(3, (v) => [
      noiseBurst(0, { vol: 0.5, freq: freq * (1 + 0.05 * v), attack: t * 0.4, sustain: t * 0.3, release: t * 0.4, slide: -0.2, tremolo: 0.3, repeat: 0.12, lowpass: 3200 }),
      at(0, { vol: 0.3, freq: 55, attack: t * 0.3, sustain: t * 0.5, release: 0.4 }),
      thump(Math.trunc(ms * 0.45), 70, 0.45, 0.35, -0.3),
    ]), { maxVoices: 2 }),
  };
}

/** A bombard: a row of impacts at `hits` (ms), each a noise thud; `freq` sets the whistle. */
function powerBombard(id: string, group: SoundGroup, freq: number, hits: readonly number[]): Record<string, SoundDef> {
  return {
    [id]: mix(group, mixVariants(3, (v) => [
      at(0, { vol: 0.2, freq: freq * (1 + 0.04 * v), attack: 0.05, sustain: 0.25, release: 0.05, shape: 'tri', slide: -2.5 }),
      ...hits.flatMap((ms, i) => [
        noiseBurst(200 + ms, { vol: 0.45, freq: 200 * (1 + 0.05 * (i - 1)), decay: 0.05, sustainVol: 0.45, release: 0.35, lowpass: 2800 }),
        thump(200 + ms, 58, 0.4, 0.3, -0.3),
      ]),
    ]), { maxVoices: 2 }),
  };
}

/** A ground field (snare, pull, stun): a creak that settles and holds; `hold` in seconds. */
function powerField(id: string, group: SoundGroup, freq: number, hold: number): Record<string, SoundDef> {
  return {
    [id]: mix(group, mixVariants(3, (v) => [
      thump(0, 90, 0.4, 0.3, -0.4),
      at(0, { vol: 0.3, freq: freq * (1 + 0.05 * v), attack: 0.05, sustain: hold, release: 0.4, shape: 'saw', mod: 4, tremolo: 0.3, repeat: 0.09, lowpass: 2400 }),
      noiseBurst(60, { vol: 0.25, freq: 500, attack: 0.1, sustain: hold * 0.6, release: 0.3, lowpass: 2000 }),
    ]), { maxVoices: 2 }),
  };
}

/** A strike: a rising charge for `charge` seconds, then a crack on the locked target. */
function powerStrike(id: string, group: SoundGroup, freq: number, charge: number): Record<string, SoundDef> {
  const hitMs = Math.trunc(charge * 1000);
  return {
    [id]: mix(group, mixVariants(3, (v) => [
      at(0, { vol: 0.25, freq: freq * (1 + 0.04 * v), attack: charge * 0.9, release: 0.05, shape: 'tri', slide: 1.5, lowpass: 6000 }),
      noiseBurst(hitMs, { vol: 0.6, freq: 1800, decay: 0.02, sustainVol: 0.3, release: 0.25, lowpass: 7000 }),
      thump(hitMs, 80, 0.55, 0.3, -0.5),
    ]), { maxVoices: 2 }),
  };
}

/** A charge: runners that rumble in at `starts` (ms) with a low drone underneath. */
function powerCharge(id: string, group: SoundGroup, freq: number, starts: readonly number[]): Record<string, SoundDef> {
  return {
    [id]: mix(group, mixVariants(3, (v) => [
      ...starts.map((ms) => noiseBurst(ms, { vol: 0.45, freq: freq * (1 + 0.06 * v), attack: 0.04, sustain: 0.35, release: 0.25, tremolo: 0.5, repeat: 0.08, lowpass: 1500 })),
      at(0, { vol: 0.35, freq: 48, attack: 0.15, sustain: 1.0, release: 0.4 }),
    ]), { maxVoices: 2 }),
  };
}

/** A buff: a rising three-note chime with a shimmer. */
function powerBuff(id: string, group: SoundGroup, chord: readonly [string, string, string]): Record<string, SoundDef> {
  return {
    [id]: mix(group, mixVariants(3, (_v, k) => [
      note(0, chord[0], { vol: 0.28, attack: 0.02, sustain: 0.2, release: 0.5, shape: 'tri' }),
      note(120, chord[1], { vol: 0.24, attack: 0.02, sustain: 0.2, release: 0.5, shape: 'tri' }),
      note(240, chord[k % 3] as string, { vol: 0.22, attack: 0.01, release: 0.8, shape: 'tri' }, 12),
      at(0, { vol: 0.16, freq: 900, attack: 0.05, sustain: 0.3, release: 0.4, shape: 'tri', slide: 4, tremolo: 0.4, repeat: 0.04 }),
    ]), { ...MUSICAL, maxVoices: 2 }),
  };
}

/** Suppress: a sabotage clank, then crackling static while the turrets are jammed. */
function powerJam(id: string, group: SoundGroup, freq: number): Record<string, SoundDef> {
  return {
    [id]: mix(group, mixVariants(3, (v) => [
      noiseBurst(0, { vol: 0.45, freq: 400, decay: 0.03, sustainVol: 0.3, release: 0.2, lowpass: 5000 }),
      at(120, { vol: 0.3, freq: freq * (1 + 0.05 * v), attack: 0.02, sustain: 0.9, release: 0.3, shape: 'square', crush: 0.2, tremolo: 0.6, repeat: 0.05, lowpass: 3000 }),
      noiseBurst(120, { vol: 0.2, freq: 3000, sustain: 0.8, release: 0.2, tremolo: 0.7, repeat: 0.03, highpass: 2000 }),
    ]), { maxVoices: 1 }),
  };
}

// ---------------------------------------------------------------------------------------------------
// The manifest

const BASE_SOUNDS = {
  // UI ------------------------------------------------------------------------------------------------
  ui_click: fx('ui', variants(3, (v) => ({ vol: 0.5, freq: 1100 * (1 + 0.05 * v), attack: 0.002, sustain: 0.008, release: 0.035, shape: 'tri', jump: 280, jumpTime: 0.012 }))),
  ui_hover: fx('ui', variants(3, (v) => ({ vol: 0.16, freq: 2300 * (1 + 0.04 * v), attack: 0.002, release: 0.025 }))),
  ui_deny: fx('ui', variants(3, (v) => ({ vol: 0.4, freq: 150 * (1 + 0.04 * v), attack: 0.004, sustain: 0.1, release: 0.08, shape: 'square', curve: 0.7, slide: -0.3, tremolo: 0.5, repeat: 0.09, lowpass: 2800 }))),
  ui_toggle: fx('ui', variants(3, (v) => ({ vol: 0.4, freq: 650 * (1 + 0.03 * v), attack: 0.002, sustain: 0.015, release: 0.05, shape: 'tri', jump: 325, jumpTime: 0.02 }))),
  ui_tab: fx('ui', variants(3, (v) => ({ vol: 0.35, freq: 480 * (1 + 0.04 * v), attack: 0.003, release: 0.07, shape: 'tri', curve: 1.4, slide: 1.5 }))),
  ui_confirm: fx('ui', variants(3, (v) => ({ vol: 0.45, freq: 660 * (1 + 0.01 * v), attack: 0.002, sustain: 0.04, release: 0.16, shape: 'tri', jump: 330, jumpTime: 0.05 })), MUSICAL),
  meter_pip: fx('ui', variants(3, (v) => ({ vol: 0.3, freq: 1760 * (1 + 0.02 * v), attack: 0.002, release: 0.05 }))),

  // Spawn and movement --------------------------------------------------------------------------------
  spawn_pop: fx('battle', variants(4, (v) => ({ vol: 0.55, freq: 240 * (1 + 0.08 * v), attack: 0.004, sustain: 0.01, release: 0.09, slide: 5 }))),
  spawn_heavy: mix('battle', mixVariants(3, (v) => [
    thump(0, 95 * (1 + 0.06 * v), 0.8, 0.28, -1),
    noiseBurst(0, { vol: 0.35, freq: 600, attack: 0.01, release: 0.2, lowpass: 1800 }),
  ])),
  spawn_legendary: mix('match', mixVariants(3, (v) => [
    thump(0, 65 * (1 + 0.04 * v), 0.8, 0.7, -0.3),
    at(60, { vol: 0.25, freq: 880 * (1 + 0.03 * v), attack: 0.05, sustain: 0.2, release: 0.5, shape: 'tri', slide: 1.5, tremolo: 0.5, repeat: 0.045 }),
    note(120, 'G5', { vol: 0.2, attack: 0.02, release: 0.8, shape: 'tri' }),
  ]), MUSICAL),
  step_heavy: fx('battle', variants(3, (v) => ({ vol: 0.45, freq: 58 * (1 + 0.08 * v), attack: 0.002, release: 0.12, slide: -0.5, noise: 0.3, lowpass: 1000 })), { gainDb: -3 }),
  step_mech: mix('modern', mixVariants(3, (v) => [
    at(0, { vol: 0.3, freq: 240 * (1 + 0.06 * v), attack: 0.001, release: 0.09, shape: 'square', curve: 0.5, slide: -1.5, crush: 0.08, lowpass: 5200 }),
    noiseBurst(20, { vol: 0.15, freq: 3000, attack: 0.01, release: 0.08, highpass: 5000 }),
  ]), { gainDb: -3 }),

  // Attacks -------------------------------------------------------------------------------------------
  swing_whoosh: fx('battle', variants(5, (v) => ({ vol: 0.38, freq: 700 * (1 + 0.1 * v), attack: 0.035, sustain: 0.02, release: 0.09, shape: 'noise', slide: -2, lowpass: 3600 * (1 + 0.1 * v) }))),
  shot_sling: fx('stone', variants(4, (v) => ({ vol: 0.32, freq: 1100 * (1 + 0.08 * v), attack: 0.015, release: 0.07, shape: 'noise', slide: 4, lowpass: 5600 }))),
  shot_bow: mix('medieval', mixVariants(4, (v) => [
    at(0, { vol: 0.45, freq: 200 * (1 + 0.06 * v), attack: 0.001, release: 0.16, shape: 'tri', curve: 2, slide: -0.2 }),
    noiseBurst(0, { vol: 0.22, freq: 2400, attack: 0.005, release: 0.06, slide: 3, lowpass: 7000 }),
  ])),
  shot_crossbow: mix('medieval', mixVariants(4, (v) => [
    at(0, { vol: 0.5, freq: 150 * (1 + 0.06 * v), attack: 0.001, release: 0.1, shape: 'square', curve: 0.6, slide: -1, lowpass: 2400 }),
    noiseBurst(0, { vol: 0.2, freq: 3200, release: 0.04, highpass: 4000 }),
  ])),
  shot_catapult: mix('stone', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 90, attack: 0.01, sustain: 0.05, release: 0.08, shape: 'saw', repeat: 0.025, tremolo: 0.5, lowpass: 1800 }),
    thump(90, 110 * (1 + 0.06 * v), 0.6, 0.25),
    noiseBurst(90, { vol: 0.25, freq: 500, attack: 0.05, release: 0.2, lowpass: 2400 }),
  ])),
  shot_musket: mix('gunpowder', mixVariants(4, (v) => [
    noiseBurst(0, { vol: 0.6, freq: 900 * (1 + 0.08 * v), attack: 0.001, decay: 0.03, sustainVol: 0.35, release: 0.22, lowpass: 6400 }),
    thump(0, 90, 0.45, 0.12, -1),
  ])),
  shot_lob: mix('gunpowder', mixVariants(3, (v) => [
    at(0, { vol: 0.55, freq: 330 * (1 + 0.05 * v), attack: 0.002, release: 0.13, slide: -4 }),
    noiseBurst(0, { vol: 0.2, freq: 800, release: 0.12, lowpass: 3000 }),
  ])),
  shot_cannon: mix('gunpowder', mixVariants(4, (v) => [
    noiseBurst(0, { vol: 0.7, freq: 140 * (1 + 0.08 * v), decay: 0.06, sustainVol: 0.45, release: 0.5, lowpass: 1400 }),
    thump(0, 58 * (1 + 0.05 * v), 0.7, 0.4, -0.25),
  ])),
  shot_grapeshot: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.55, freq: 120, decay: 0.04, sustainVol: 0.4, release: 0.35, lowpass: 1800 }),
    noiseBurst(30, { vol: 0.35, freq: 1400 * (1 + 0.08 * v), sustain: 0.12, release: 0.12, repeat: 0.028, tremolo: 0.5, lowpass: 8000 }),
  ])),
  shot_rifle: mix('modern', mixVariants(4, (v) => [
    noiseBurst(0, { vol: 0.55, freq: 1600 * (1 + 0.08 * v), attack: 0.001, decay: 0.015, sustainVol: 0.3, release: 0.12, lowpass: 9000 }),
    thump(0, 140, 0.3, 0.07, -2),
  ])),
  shot_mg: fx('modern', variants(5, (v) => ({ vol: 0.4, freq: 1200 * (1 + 0.1 * v), attack: 0.001, decay: 0.01, sustainVol: 0.3, release: 0.06, shape: 'noise', lowpass: 9000 }))),
  shot_flak: mix('modern', mixVariants(3, (v) => [
    at(0, { vol: 0.55, freq: 180 * (1 + 0.06 * v), attack: 0.002, release: 0.18, slide: -3 }),
    noiseBurst(10, { vol: 0.35, freq: 900, release: 0.15, lowpass: 5000 }),
  ])),
  shot_rocket: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.4, freq: 160 * (1 + 0.08 * v), attack: 0.01, release: 0.08, lowpass: 3000 }),
    noiseBurst(0, { vol: 0.35, freq: 300, attack: 0.03, sustain: 0.12, release: 0.3, slide: 1.5, lowpass: 5200 }),
    at(0, { vol: 0.15, freq: 180, attack: 0.03, sustain: 0.1, release: 0.25, shape: 'saw', slide: 3, lowpass: 3000 }),
  ])),
  shot_rail: mix('future', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 400, attack: 0.06, release: 0.01, shape: 'saw', slide: 12, lowpass: 6000 }),
    at(60, { vol: 0.45, freq: 2200 * (1 + 0.05 * v), attack: 0.002, sustain: 0.04, release: 0.25, shape: 'saw', slide: -9, crush: 0.03, lowpass: 10000 }),
    thump(60, 80, 0.35, 0.15, -1),
  ])),
  shot_laser: fx('future', variants(4, (v) => ({ vol: 0.35, freq: 1300 * (1 + 0.08 * v), attack: 0.002, sustain: 0.02, release: 0.13, shape: 'square', curve: 0.6, slide: -14, lowpass: 10000 }))),
  shot_arc: fx('future', variants(3, (v) => ({ vol: 0.35, freq: 520 * (1 + 0.1 * v), attack: 0.003, sustain: 0.08, release: 0.15, shape: 'tan', noise: 2.5, mod: 35, repeat: 0.03, lowpass: 10000 }))),
  shot_plasma: fx('future', variants(4, (v) => ({ vol: 0.45, freq: 520 * (1 + 0.08 * v), attack: 0.008, release: 0.22, curve: 0.7, slide: -3.5, mod: 14 }))),
  bee_buzz: fx('stone', variants(3, (v) => ({ vol: 0.3, freq: 210 * (1 + 0.08 * v), attack: 0.03, sustain: 0.22, release: 0.1, shape: 'saw', mod: 22, tremolo: 0.3, repeat: 0.035, lowpass: 4800 }))),
  log_roll: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.5, freq: 75 * (1 + 0.06 * v), attack: 0.03, sustain: 0.35, release: 0.25, tremolo: 0.5, repeat: 0.11, lowpass: 1400 }),
    at(0, { vol: 0.3, freq: 110, attack: 0.002, sustain: 0.3, release: 0.1, shape: 'tri', repeat: 0.11, tremolo: 0.5 }),
  ])),
  cauldron_pour: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 3000, attack: 0.08, sustain: 0.35, release: 0.3, highpass: 5000, tremolo: 0.3, repeat: 0.05 }),
    at(0, { vol: 0.3, freq: 380 * (1 + 0.1 * v), attack: 0.005, sustain: 0.4, release: 0.15, slide: 6, repeat: 0.07 }),
  ])),
  toad_tongue: mix('stone', mixVariants(3, (v) => [
    at(0, { vol: 0.45, freq: 180 * (1 + 0.08 * v), attack: 0.005, release: 0.09, slide: 14 }),
    noiseBurst(100, { vol: 0.2, freq: 1200, release: 0.04, lowpass: 6000 }),
    at(110, { vol: 0.4, freq: 700 * (1 + 0.05 * v), attack: 0.005, release: 0.1, slide: -12 }),
  ])),
  // Medieval wave (CONTENT_PLAN 5.3): attacks, turrets and powers of the new Medieval cards ---------------
  squire_jab: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.25, freq: 1400 * (1 + 0.06 * v), attack: 0.03, release: 0.04, slide: 4, lowpass: 6000 }),
    at(60, { vol: 0.35, freq: 700 * (1 + 0.05 * v), attack: 0.001, release: 0.04, shape: 'tri', curve: 2 }),
    at(170, { vol: 0.3, freq: 780 * (1 + 0.05 * v), attack: 0.001, release: 0.05, shape: 'tri', curve: 2 }),
  ])),
  flail_smash: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 600 * (1 + 0.06 * v), attack: 0.08, sustain: 0.08, release: 0.05, tremolo: 0.6, repeat: 0.05, lowpass: 2600 }),
    thump(220, 120 * (1 + 0.05 * v), 0.6, 0.2, -0.5),
    at(240, { vol: 0.15, freq: 2400 * (1 + 0.04 * v), attack: 0.001, release: 0.06, shape: 'tri', repeat: 0.02 }),
  ])),
  dagger_stab: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 5000, attack: 0.02, release: 0.04, highpass: 3000 }),
    noiseBurst(70, { vol: 0.3, freq: 2000 * (1 + 0.06 * v), attack: 0.03, release: 0.04, slide: 5, lowpass: 7000 }),
    thump(120, 220 * (1 + 0.05 * v), 0.5, 0.06, -0.6),
  ])),
  greatsword_sweep: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(80, { vol: 0.35, freq: 500 * (1 + 0.06 * v), attack: 0.15, release: 0.12, slide: 3, lowpass: 3000 }),
    at(340, { vol: 0.35, freq: 820 * (1 + 0.04 * v), attack: 0.001, sustain: 0.05, release: 0.35, shape: 'tri', tremolo: 0.2, repeat: 0.03 }),
    thump(340, 140 * (1 + 0.05 * v), 0.4, 0.12, -0.5),
  ])),
  hammer_clang: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 400 * (1 + 0.06 * v), attack: 0.12, release: 0.08, slide: 2, lowpass: 1800 }),
    at(200, { vol: 0.4, freq: 620 * (1 + 0.04 * v), attack: 0.001, sustain: 0.05, release: 0.5, shape: 'tri', tremolo: 0.15, repeat: 0.04 }),
    thump(200, 110 * (1 + 0.05 * v), 0.6, 0.2, -0.5),
  ])),
  whip_crack: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 900 * (1 + 0.06 * v), attack: 0.08, release: 0.04, slide: 4, lowpass: 3000 }),
    noiseBurst(160, { vol: 0.5, freq: 6000, attack: 0.001, release: 0.02, highpass: 2500 }),
    at(220, { vol: 0.2, freq: 520 * (1 + 0.05 * v), attack: 0.005, release: 0.05, shape: 'saw', slide: 3, lowpass: 2500 }),
  ])),
  hound_bite: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 220 * (1 + 0.06 * v), attack: 0.01, sustain: 0.04, release: 0.04, shape: 'saw', tremolo: 0.5, repeat: 0.02, lowpass: 2200 }),
    noiseBurst(80, { vol: 0.45, freq: 2400 * (1 + 0.05 * v), attack: 0.001, release: 0.03, lowpass: 7000 }),
    at(85, { vol: 0.2, freq: 950 * (1 + 0.04 * v), attack: 0.001, release: 0.05, shape: 'tri' }),
  ])),
  drawbridge_slam: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.15, freq: 1900 * (1 + 0.04 * v), attack: 0.001, sustain: 0.18, release: 0.05, shape: 'tri', tremolo: 0.7, repeat: 0.03 }),
    thump(240, 80 * (1 + 0.05 * v), 0.8, 0.35, -0.5),
    noiseBurst(250, { vol: 0.3, freq: 300, attack: 0.01, sustain: 0.1, release: 0.2, lowpass: 1400 }),
  ])),
  wyrm_breath: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.15, freq: 1500, attack: 0.2, release: 0.02, lowpass: 3000 }),
    at(200, { vol: 0.3, freq: 75 * (1 + 0.05 * v), attack: 0.03, sustain: 0.3, release: 0.2, shape: 'saw', tremolo: 0.5, repeat: 0.025, lowpass: 1200 }),
    noiseBurst(200, { vol: 0.4, freq: 900 * (1 + 0.06 * v), attack: 0.04, sustain: 0.3, release: 0.2, slide: 2, lowpass: 3200 }),
  ])),
  shot_windlass: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 1300 * (1 + 0.04 * v), attack: 0.001, release: 0.02, shape: 'tri', repeat: 0.028 }),
    at(150, { vol: 0.5, freq: 140 * (1 + 0.06 * v), attack: 0.001, release: 0.1, shape: 'square', curve: 0.6, slide: -1, lowpass: 2400 }),
    noiseBurst(160, { vol: 0.2, freq: 3000, release: 0.06, highpass: 3500 }),
  ])),
  shot_longbow: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.12, freq: 120 * (1 + 0.05 * v), attack: 0.05, sustain: 0.08, release: 0.03, shape: 'saw', lowpass: 1800 }),
    at(150, { vol: 0.45, freq: 180 * (1 + 0.06 * v), attack: 0.001, release: 0.2, shape: 'tri', curve: 2, slide: -0.2 }),
    at(170, { vol: 0.08, freq: 1600 * (1 + 0.04 * v), attack: 0.04, sustain: 0.1, release: 0.12, slide: 6 }),
  ])),
  trumpet_toot: mix('medieval', mixVariants(3, (_v, k) => {
    const horn: Zz = { attack: 0.02, release: 0.1, shape: 'saw', lowpass: 4400 };
    const [a, b] = ([['D4', 'A4'], ['A4', 'D5'], ['F#4', 'A4']] as const)[k] ?? ['D4', 'A4'];
    return [
      note(0, a, { ...horn, vol: 0.35, sustain: 0.06 }),
      note(130, b, { ...horn, vol: 0.4, sustain: 0.2, release: 0.2 }),
    ];
  })),
  shot_mangonel: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.22, freq: 80 * (1 + 0.05 * v), attack: 0.02, sustain: 0.12, release: 0.05, shape: 'saw', tremolo: 0.5, repeat: 0.05, lowpass: 1500 }),
    thump(180, 110 * (1 + 0.05 * v), 0.7, 0.25, -0.5),
    noiseBurst(200, { vol: 0.3, freq: 350 * (1 + 0.06 * v), attack: 0.1, release: 0.15, slide: 2, lowpass: 1800 }),
  ])),
  vial_toss: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 2400 * (1 + 0.05 * v), attack: 0.001, release: 0.1, shape: 'sin', tremolo: 0.4, repeat: 0.06 }),
    noiseBurst(220, { vol: 0.3, freq: 1500, attack: 0.001, release: 0.03, lowpass: 5000 }),
    noiseBurst(230, { vol: 0.15, freq: 6000, attack: 0.01, sustain: 0.1, release: 0.12, highpass: 3500 }),
  ])),
  shot_springald: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.5, freq: 110 * (1 + 0.06 * v), attack: 0.001, release: 0.12, shape: 'square', curve: 0.6, slide: -1, lowpass: 2000 }),
    noiseBurst(20, { vol: 0.25, freq: 900, attack: 0.03, release: 0.2, slide: 2, lowpass: 2600, tremolo: 0.4, repeat: 0.09 }),
  ])),
  crane_hook: mix('medieval', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 1600 * (1 + 0.06 * v), attack: 0.05, release: 0.1, tremolo: 0.6, repeat: 0.06, lowpass: 5000 }),
    at(160, { vol: 0.35, freq: 980 * (1 + 0.04 * v), attack: 0.001, sustain: 0.03, release: 0.2, shape: 'tri', tremolo: 0.2, repeat: 0.03 }),
    at(300, { vol: 0.2, freq: 700, attack: 0.001, sustain: 0.25, release: 0.03, shape: 'tri', repeat: 0.04 }),
  ])),
  pw_longbow: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 140, attack: 0.01, sustain: 0.1, release: 0.08, shape: 'saw', lowpass: 1800 }),
    at(420, { vol: 0.35, freq: 190 * (1 + 0.04 * v), release: 0.15, shape: 'tri', curve: 2, repeat: 0.02 }),
    noiseBurst(450, { vol: 0.3, freq: 2400, attack: 0.15, sustain: 0.3, release: 0.2, slide: -2, highpass: 2000 }),
    noiseBurst(950, { vol: 0.35, freq: 600, attack: 0.002, sustain: 0.5, release: 0.15, tremolo: 0.6, repeat: 0.06, lowpass: 2500 }),
  ]), { maxVoices: 2 }),
  pw_bell: mix('medieval', mixVariants(3, (v) => [
    thump(0, 70, 0.9, 0.5, -0.4),
    note(0, 'D3', { vol: 0.45 * (1 - 0.03 * v), attack: 0.002, sustain: 0.3, release: 1.6, shape: 'tri', tremolo: 0.15, repeat: 0.3 }),
    note(0, 'A4', { vol: 0.2, attack: 0.002, release: 1.2, shape: 'sin' }),
    note(0, 'D5', { vol: 0.15, attack: 0.002, release: 1.0, shape: 'sin' }),
  ]), { maxVoices: 1 }),
  // Gunpowder wave (CONTENT_PLAN 5.4): attacks, turrets and powers of the new Gunpowder cards -------------
  claymore_chop: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(50, { vol: 0.3, freq: 600 * (1 + 0.05 * v), attack: 0.05, release: 0.12, slide: 3, lowpass: 3000 }),
    at(240, { vol: 0.35, freq: 900 * (1 + 0.04 * v), attack: 0.001, sustain: 0.02, release: 0.18, shape: 'tri', tremolo: 0.3, repeat: 0.03 }),
    thump(240, 150 * (1 + 0.05 * v), 0.5, 0.1, -0.4),
  ])),
  scoop_swing: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.25, freq: 1200 * (1 + 0.05 * v), attack: 0.03, release: 0.06, slide: 3, lowpass: 4000 }),
    at(80, { vol: 0.4, freq: 720 * (1 + 0.05 * v), attack: 0.001, release: 0.06, shape: 'tri' }),
  ])),
  sabre_slash: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(100, { vol: 0.3, freq: 2000 * (1 + 0.05 * v), attack: 0.04, release: 0.08, slide: 4, highpass: 1200 }),
    at(200, { vol: 0.35, freq: 1500 * (1 + 0.04 * v), attack: 0.001, sustain: 0.02, release: 0.2, shape: 'tri', tremolo: 0.3, repeat: 0.025 }),
  ])),
  marshal_sweep: mix('gunpowder', mixVariants(3, (v) => [
    at(0, { vol: 0.3, freq: 115 * (1 + 0.05 * v), attack: 0.02, sustain: 0.12, release: 0.06, shape: 'saw', lowpass: 1600 }),
    noiseBurst(120, { vol: 0.35, freq: 500 * (1 + 0.05 * v), attack: 0.08, release: 0.2, slide: 3, lowpass: 3200 }),
    at(380, { vol: 0.35, freq: 760 * (1 + 0.04 * v), attack: 0.001, sustain: 0.04, release: 0.35, shape: 'tri', tremolo: 0.3, repeat: 0.04 }),
    thump(380, 120, 0.6, 0.15, -0.4),
  ])),
  shot_blunderbuss: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.7, freq: 1500 * (1 + 0.05 * v), attack: 0.001, release: 0.16, lowpass: 6000 }),
    thump(10, 115 * (1 + 0.05 * v), 0.7, 0.25, -0.5),
    noiseBurst(40, { vol: 0.3, freq: 4000, attack: 0.001, sustain: 0.1, release: 0.15, tremolo: 0.7, repeat: 0.02, highpass: 2500 }),
  ])),
  shot_dragoon: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.6, freq: 1800 * (1 + 0.05 * v), attack: 0.001, release: 0.1, lowpass: 7000 }),
    thump(10, 160 * (1 + 0.05 * v), 0.5, 0.15, -0.5),
    at(260, { vol: 0.25, freq: 300 * (1 + 0.05 * v), attack: 0.001, release: 0.05, shape: 'tri' }),
  ])),
  shot_coehorn: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.15, freq: 6000, attack: 0.01, sustain: 0.08, release: 0.03, highpass: 3000 }),
    thump(100, 110 * (1 + 0.05 * v), 0.8, 0.3, -0.5),
    at(140, { vol: 0.07, freq: 700 * (1 + 0.04 * v), attack: 0.05, sustain: 0.15, release: 0.12, slide: 6 }),
  ])),
  shot_wallgun: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.7, freq: 1200 * (1 + 0.05 * v), attack: 0.001, release: 0.18, lowpass: 6000 }),
    thump(10, 120 * (1 + 0.05 * v), 0.8, 0.3, -0.5),
    noiseBurst(30, { vol: 0.25, freq: 300, attack: 0.05, sustain: 0.2, release: 0.3, lowpass: 900 }),
  ])),
  drum_roll: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 2200 * (1 + 0.04 * v), attack: 0.001, release: 0.04, repeat: 0.028, highpass: 800 }),
    noiseBurst(120, { vol: 0.5, freq: 2000 * (1 + 0.04 * v), attack: 0.001, release: 0.12, highpass: 600 }),
    thump(130, 90 * (1 + 0.05 * v), 0.4, 0.2, -0.3),
  ])),
  pipe_drone: mix('gunpowder', mixVariants(3, (_v, k) => {
    const reed: Zz = { attack: 0.02, release: 0.08, shape: 'saw', lowpass: 2600 };
    const [a, b, c] = ([['G4', 'A4', 'D5'], ['G4', 'B4', 'D5'], ['A4', 'G4', 'D5']] as const)[k] ?? ['G4', 'A4', 'D5'];
    return [
      note(30, 'G2', { vol: 0.2, attack: 0.04, sustain: 0.4, release: 0.12, shape: 'saw', lowpass: 900 }),
      note(60, a, { ...reed, vol: 0.25, sustain: 0.05 }),
      note(130, b, { ...reed, vol: 0.25, sustain: 0.05 }),
      note(200, c, { ...reed, vol: 0.3, sustain: 0.2, release: 0.15 }),
    ];
  })),
  mesmer_chime: mix('gunpowder', mixVariants(3, (v) => [
    at(0, { vol: 0.2, freq: 1800 * (1 + 0.04 * v), attack: 0.001, release: 0.02, shape: 'tri' }),
    at(110, { vol: 0.18, freq: 1500 * (1 + 0.04 * v), attack: 0.001, release: 0.02, shape: 'tri' }),
    at(200, { vol: 0.3, freq: 1180 * (1 + 0.04 * v), attack: 0.002, release: 0.5, shape: 'sin', tremolo: 0.3, repeat: 0.16 }),
  ])),
  shot_carronade: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.7, freq: 900 * (1 + 0.05 * v), attack: 0.001, release: 0.3, lowpass: 4000 }),
    thump(0, 85 * (1 + 0.05 * v), 1, 0.5, -0.5),
    thump(120, 70, 0.4, 0.12, -0.3),
  ])),
  shot_sea_mortar: mix('gunpowder', mixVariants(3, (v) => [
    thump(0, 70 * (1 + 0.05 * v), 1, 0.6, -0.5),
    noiseBurst(0, { vol: 0.4, freq: 500, attack: 0.005, sustain: 0.1, release: 0.3, lowpass: 1500 }),
    at(300, { vol: 0.06, freq: 1700 * (1 + 0.04 * v), attack: 0.1, sustain: 0.3, release: 0.2, slide: -4 }),
  ])),
  pw_rockets: mix('gunpowder', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.15, freq: 6000, attack: 0.02, sustain: 0.12, release: 0.05, highpass: 3000 }),
    noiseBurst(180, { vol: 0.35, freq: 900 * (1 + 0.05 * v), attack: 0.05, sustain: 0.35, release: 0.25, slide: 4, lowpass: 5000, repeat: 0.05 }),
    noiseBurst(850, { vol: 0.4, freq: 700, attack: 0.002, sustain: 0.4, release: 0.15, tremolo: 0.7, repeat: 0.07, lowpass: 3000 }),
  ]), { maxVoices: 2 }),
  pw_salute: mix('gunpowder', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 150, attack: 0.01, sustain: 0.1, release: 0.08, shape: 'saw', lowpass: 1800 }),
    thump(200, 92 * (1 + 0.02 * v), 1, 0.5, -0.5),
    thump(360, 88, 0.9, 0.5, -0.5),
    thump(520, 84, 0.9, 0.5, -0.5),
    thump(680, 80, 0.9, 0.5, -0.5),
    at(750, { vol: 0.04, freq: 3100, attack: 0.1, sustain: 0.4, release: 0.35, shape: 'sin' }),
  ]), { maxVoices: 1 }),
  // Stone wave (CONTENT_PLAN 5.1): attacks, turrets and powers of the new Stone cards -----------------------
  wolf_bite: mix('stone', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 140 * (1 + 0.06 * v), attack: 0.01, sustain: 0.06, release: 0.04, shape: 'saw', tremolo: 0.5, repeat: 0.02, lowpass: 1800 }),
    noiseBurst(90, { vol: 0.45, freq: 2400 * (1 + 0.05 * v), attack: 0.001, release: 0.03, lowpass: 7000 }),
    at(95, { vol: 0.2, freq: 900 * (1 + 0.04 * v), attack: 0.001, release: 0.05, shape: 'tri' }),
  ])),
  shield_bash: mix('stone', mixVariants(3, (v) => [
    thump(0, 110 * (1 + 0.05 * v), 0.5, 0.14, -0.4),
    noiseBurst(100, { vol: 0.25, freq: 900 * (1 + 0.06 * v), attack: 0.03, release: 0.05, slide: 3, lowpass: 4000 }),
    at(180, { vol: 0.35, freq: 420 * (1 + 0.05 * v), attack: 0.001, release: 0.06, shape: 'tri', curve: 2 }),
  ])),
  torch_jab: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 800 * (1 + 0.08 * v), attack: 0.04, sustain: 0.02, release: 0.06, slide: 4, lowpass: 5200 }),
    noiseBurst(80, { vol: 0.35, freq: 600, attack: 0.01, sustain: 0.06, release: 0.12, slide: 2, lowpass: 2600 }),
    noiseBurst(100, { vol: 0.15, freq: 4000, attack: 0.002, sustain: 0.1, release: 0.08, highpass: 3000, tremolo: 0.6, repeat: 0.02 }),
  ])),
  horn_hook: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.25, freq: 700 * (1 + 0.05 * v), attack: 0.01, release: 0.06, lowpass: 1800 }),
    noiseBurst(80, { vol: 0.3, freq: 350 * (1 + 0.06 * v), attack: 0.1, release: 0.08, slide: 2, lowpass: 2000 }),
    thump(220, 60 * (1 + 0.05 * v), 0.7, 0.28, -0.5),
  ])),
  bear_swipe: mix('stone', mixVariants(3, (v) => [
    at(0, { vol: 0.3, freq: 95 * (1 + 0.05 * v), attack: 0.03, sustain: 0.2, release: 0.1, shape: 'saw', tremolo: 0.5, repeat: 0.025, lowpass: 1400 }),
    noiseBurst(220, { vol: 0.3, freq: 300 * (1 + 0.06 * v), attack: 0.1, release: 0.08, slide: 2, lowpass: 1800 }),
    thump(380, 50 * (1 + 0.05 * v), 0.75, 0.3, -0.5),
  ])),
  antler_sweep: mix('stone', mixVariants(3, (v) => [
    at(0, { vol: 0.3, freq: 196 * (1 + 0.04 * v), attack: 0.03, sustain: 0.25, release: 0.15, shape: 'saw', slide: 0.3, lowpass: 2200 }),
    noiseBurst(180, { vol: 0.3, freq: 280 * (1 + 0.06 * v), attack: 0.12, release: 0.08, slide: 2, lowpass: 1800 }),
    thump(360, 55 * (1 + 0.05 * v), 0.7, 0.25, -0.5),
  ])),
  shot_bolas: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.25, freq: 500 * (1 + 0.06 * v), attack: 0.08, sustain: 0.12, release: 0.05, tremolo: 0.6, repeat: 0.06, lowpass: 2400 }),
    at(260, { vol: 0.3, freq: 700 * (1 + 0.05 * v), attack: 0.001, release: 0.04, shape: 'tri', repeat: 0.05 }),
  ])),
  shot_atlatl: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 1200 * (1 + 0.06 * v), attack: 0.05, release: 0.05, slide: 5, lowpass: 6000 }),
    at(100, { vol: 0.35, freq: 900 * (1 + 0.05 * v), attack: 0.001, release: 0.04, shape: 'tri', curve: 2 }),
    noiseBurst(110, { vol: 0.15, freq: 1800, attack: 0.05, release: 0.2, slide: -2, lowpass: 4000 }),
  ])),
  shot_heave: mix('stone', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 120 * (1 + 0.06 * v), attack: 0.02, sustain: 0.1, release: 0.06, shape: 'saw', lowpass: 1600 }),
    noiseBurst(120, { vol: 0.3, freq: 300 * (1 + 0.06 * v), attack: 0.1, release: 0.08, slide: 2, lowpass: 1800 }),
    thump(280, 90 * (1 + 0.05 * v), 0.5, 0.15, -0.4),
  ])),
  herb_puff: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 1800 * (1 + 0.06 * v), attack: 0.03, release: 0.04, slide: 4, lowpass: 6000 }),
    noiseBurst(50, { vol: 0.25, freq: 1600, attack: 0.01, sustain: 0.06, release: 0.14, slide: -2, lowpass: 3000 }),
    at(60, { vol: 0.12, freq: 2400 * (1 + 0.05 * v), attack: 0.001, release: 0.02, shape: 'tri', repeat: 0.025 }),
  ])),
  quill_fan: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 5000 * (1 + 0.05 * v), attack: 0.01, sustain: 0.1, release: 0.03, highpass: 2500, tremolo: 0.6, repeat: 0.025 }),
    noiseBurst(130, { vol: 0.3, freq: 2400, attack: 0.002, release: 0.1, slide: -3, lowpass: 6000 }),
  ])),
  shot_sapling: mix('stone', mixVariants(3, (v) => [
    at(0, { vol: 0.2, freq: 260 * (1 + 0.05 * v), attack: 0.001, release: 0.03, shape: 'tri', repeat: 0.03 }),
    noiseBurst(100, { vol: 0.35, freq: 600 * (1 + 0.06 * v), attack: 0.06, sustain: 0.05, release: 0.12, slide: 4, lowpass: 4000 }),
    at(140, { vol: 0.3, freq: 70 * (1 + 0.05 * v), attack: 0.001, release: 0.2, shape: 'tri', curve: 2 }),
  ])),
  // Stone wave powers
  pw_hail: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 600 * (1 + 0.05 * v), attack: 0.08, sustain: 0.15, release: 0.06, tremolo: 0.6, repeat: 0.08, lowpass: 2400 }),
    noiseBurst(350, { vol: 0.2, freq: 2400, attack: 0.05, release: 0.2, slide: -2, lowpass: 5000 }),
    at(600, { vol: 0.3, freq: 1100 * (1 + 0.05 * v), attack: 0.001, sustain: 0.3, release: 0.15, shape: 'tri', tremolo: 0.7, repeat: 0.05 }),
  ]), { maxVoices: 2 }),
  pw_vines: mix('stone', mixVariants(3, (v) => [
    thump(0, 55 * (1 + 0.04 * v), 0.7, 0.4, -0.4),
    at(50, { vol: 0.25, freq: 180 * (1 + 0.05 * v), attack: 0.15, sustain: 0.35, release: 0.3, shape: 'saw', tremolo: 0.5, repeat: 0.45, lowpass: 1600 }),
    noiseBurst(80, { vol: 0.2, freq: 4000, attack: 0.1, sustain: 0.3, release: 0.25, highpass: 2500 }),
  ]), { maxVoices: 2 }),
  goose_honk: fx('medieval', variants(4, (v) => ({ vol: 0.5, freq: 400 * (1 + 0.1 * v), attack: 0.015, sustain: 0.12, release: 0.08, shape: 'saw', curve: 0.8, slide: -0.6, jump: -40, jumpTime: 0.03, lowpass: 4400 }))),
  bomb_whistle: fx('gunpowder', variants(3, (v) => ({ vol: 0.45, freq: 1700 * (1 + 0.05 * v), attack: 0.06, sustain: 0.55, release: 0.08, slide: -2.6, tremolo: 0.08, repeat: 0.04 }))),
  radio_call: mix('modern', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 4000, attack: 0.01, sustain: 0.35, release: 0.05, highpass: 2400, tremolo: 0.4, repeat: 0.07 }),
    at(0, { vol: 0.25, freq: 1000 * (1 + 0.03 * v), sustain: 0.06, release: 0.01, shape: 'square' }),
    at(120, { vol: 0.25, freq: 1300 * (1 + 0.03 * v), sustain: 0.06, release: 0.01, shape: 'square' }),
    at(240, { vol: 0.2, freq: 1000 * (1 + 0.03 * v), sustain: 0.1, release: 0.01, shape: 'square' }),
  ])),
  emp_pulse: mix('future', mixVariants(3, (v) => [
    at(0, { vol: 0.45, freq: 900 * (1 + 0.06 * v), attack: 0.005, sustain: 0.08, release: 0.45, shape: 'saw', slide: -6, mod: 18, crush: 0.15, lowpass: 10000 }),
    thump(0, 70, 0.4, 0.3, -0.5),
  ])),
  time_stop: mix('future', mixVariants(3, (v) => [
    at(0, { vol: 0.35, freq: 700 * (1 + 0.04 * v), attack: 0.35, release: 0.12, slide: -1.2, tremolo: 0.5, repeat: 0.09 }),
    at(380, { vol: 0.3, freq: 2600, attack: 0.001, release: 0.03, shape: 'tri' }),
    at(380, { vol: 0.25, freq: 330, attack: 0.002, release: 0.8 }),
    at(600, { vol: 0.3, freq: 1900, attack: 0.001, release: 0.03, shape: 'tri' }),
  ])),
  gravity_hum: fx('future', variants(3, (v) => ({ vol: 0.5, freq: 85 * (1 + 0.06 * v), attack: 0.12, sustain: 0.35, release: 0.3, slide: 0.3, mod: 5, tremolo: 0.4, repeat: 0.12 }))),

  // A17.12 attacks: Bronze (javelins, bolt-thrower, bronze giant, sun mirror, gorgon) ------------------
  shot_javelin: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 900 * (1 + 0.08 * v), attack: 0.03, sustain: 0.03, release: 0.1, slide: -2, lowpass: 4200 }),
    at(0, { vol: 0.22, freq: 260 * (1 + 0.05 * v), attack: 0.002, release: 0.08, shape: 'tri', slide: -1.5 }),
  ])),
  shot_scorpion: mix('bronze', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 120, attack: 0.01, sustain: 0.06, release: 0.05, shape: 'saw', repeat: 0.02, tremolo: 0.5, lowpass: 1800 }),
    at(90, { vol: 0.55, freq: 140 * (1 + 0.06 * v), attack: 0.001, release: 0.16, shape: 'tri', curve: 2, slide: -0.4 }),
    noiseBurst(90, { vol: 0.25, freq: 2200, attack: 0.004, release: 0.08, slide: 3, lowpass: 6400 }),
  ])),
  stomp_colossus: mix('bronze', mixVariants(3, (v) => [
    thump(0, 52 * (1 + 0.05 * v), 0.85, 0.45, -0.5),
    noiseBurst(0, { vol: 0.4, freq: 240, decay: 0.05, sustainVol: 0.4, release: 0.35, lowpass: 1800 }),
    at(20, { vol: 0.16, freq: 660 * (1 + 0.03 * v), attack: 0.002, release: 0.5, shape: 'tri', curve: 2, tremolo: 0.3, repeat: 0.07 }),
  ])),
  mirror_beam: fx('bronze', variants(3, (v) => ({ vol: 0.28, freq: 1500 * (1 + 0.05 * v), attack: 0.004, sustain: 0.03, release: 0.09, shape: 'tri', slide: -4, tremolo: 0.3, repeat: 0.02, highpass: 900 }))),
  gorgon_gaze: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.28, freq: 3400 * (1 + 0.05 * v), attack: 0.05, sustain: 0.2, release: 0.15, highpass: 3000, tremolo: 0.4, repeat: 0.05 }),
    at(0, { vol: 0.3, freq: 330 * (1 + 0.04 * v), attack: 0.02, sustain: 0.12, release: 0.3, shape: 'saw', slide: -0.6, lowpass: 2400 }),
    thump(200, 85, 0.45, 0.25, -0.3),
  ])),

  // Bronze wave (CONTENT_PLAN 5.2): attacks, turrets and powers of the 13 new Bronze cards --------------
  kopis_hack: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 1100 * (1 + 0.08 * v), attack: 0.04, sustain: 0.03, release: 0.06, slide: 3, lowpass: 5200 }),
    noiseBurst(110, { vol: 0.4, freq: 1800, attack: 0.001, release: 0.05, lowpass: 6000 }),
    at(110, { vol: 0.14, freq: 620 * (1 + 0.04 * v), attack: 0.002, release: 0.18, shape: 'tri', curve: 2 }),
  ])),
  rhomphaia_cut: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.34, freq: 700 * (1 + 0.08 * v), attack: 0.08, sustain: 0.04, release: 0.07, slide: 5, lowpass: 6400 }),
    noiseBurst(150, { vol: 0.3, freq: 3200, attack: 0.002, release: 0.05, highpass: 1600 }),
  ])),
  shot_discus: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.22, freq: 500 * (1 + 0.06 * v), attack: 0.06, release: 0.06, lowpass: 2400 }),
    at(100, { vol: 0.2, freq: 410 * (1 + 0.05 * v), attack: 0.01, sustain: 0.12, release: 0.12, shape: 'tri', slide: -0.6, tremolo: 0.5, repeat: 0.025 }),
    noiseBurst(100, { vol: 0.22, freq: 1600, attack: 0.02, sustain: 0.12, release: 0.08, tremolo: 0.5, repeat: 0.025, lowpass: 4800 }),
  ])),
  trunk_lash: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 350 * (1 + 0.06 * v), attack: 0.1, release: 0.08, slide: 2, lowpass: 2000 }),
    thump(160, 70 * (1 + 0.05 * v), 0.7, 0.3, -0.5),
    at(200, { vol: 0.22, freq: 560 * (1 + 0.04 * v), attack: 0.02, sustain: 0.12, release: 0.15, shape: 'saw', slide: 0.6, lowpass: 2400 }),
  ])),
  shot_belly_bow: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.35, freq: 1400 * (1 + 0.06 * v), attack: 0.001, release: 0.03, lowpass: 5000 }),
    at(6, { vol: 0.4, freq: 82 * (1 + 0.05 * v), attack: 0.001, release: 0.18, shape: 'tri', curve: 2, slide: -0.3 }),
    noiseBurst(20, { vol: 0.18, freq: 1600, attack: 0.03, release: 0.1, slide: 3, lowpass: 4400 }),
  ])),
  aulos_note: mix('bronze', mixVariants(3, (_v, k) => [
    note(0, ['D5', 'A4', 'F#5'][k] as string, { vol: 0.24, attack: 0.012, sustain: 0.1, release: 0.04, shape: 'saw', lowpass: 3200, tremolo: 0.1, repeat: 0.15 }),
    note(160, ['F#5', 'D5', 'A5'][k] as string, { vol: 0.24, attack: 0.012, sustain: 0.1, release: 0.05, shape: 'saw', lowpass: 3200, tremolo: 0.1, repeat: 0.15 }),
  ]), MUSICAL),
  chorus_wail: mix('bronze', mixVariants(3, (_v, k) => [
    note(0, 'D4', { vol: 0.2, attack: 0.06, sustain: 0.3, release: 0.2, shape: 'saw', slide: -0.08, lowpass: 1600 - 100 * k }),
    note(20, 'F4', { vol: 0.18, attack: 0.08, sustain: 0.28, release: 0.2, shape: 'saw', slide: -0.08, lowpass: 1600 }),
    note(40, ['A4', 'G#4', 'C5'][k] as string, { vol: 0.16, attack: 0.1, sustain: 0.26, release: 0.2, shape: 'saw', slide: -0.08, lowpass: 1600 }),
  ]), MUSICAL),
  horse_ram: mix('bronze', mixVariants(3, (v) => [
    at(0, { vol: 0.2, freq: 85 * (1 + 0.05 * v), attack: 0.02, sustain: 0.12, release: 0.06, shape: 'saw', slide: -0.4, lowpass: 1500 }),
    thump(200, 60 * (1 + 0.05 * v), 0.8, 0.35, -0.5),
    noiseBurst(200, { vol: 0.4, freq: 500, attack: 0.002, release: 0.2, lowpass: 2800 }),
  ])),
  sagaris_sweep: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.25, freq: 300, attack: 0.002, release: 0.05, lowpass: 1600 }),
    noiseBurst(20, { vol: 0.32, freq: 900 * (1 + 0.08 * v), attack: 0.06, release: 0.07, slide: 4, lowpass: 5600 }),
    noiseBurst(150, { vol: 0.38, freq: 1600, attack: 0.001, release: 0.06, lowpass: 5000 }),
  ])),
  labrys_chop: mix('bronze', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 95 * (1 + 0.04 * v), attack: 0.01, sustain: 0.12, release: 0.1, shape: 'saw', slide: -0.5, lowpass: 900 }),
    noiseBurst(40, { vol: 0.32, freq: 420 * (1 + 0.06 * v), attack: 0.1, release: 0.08, slide: 3, lowpass: 3000 }),
    thump(220, 62, 0.8, 0.3, -0.5),
    noiseBurst(220, { vol: 0.4, freq: 1400, attack: 0.001, release: 0.08, lowpass: 4200 }),
  ])),
  hydra_bite: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.2, freq: 4200, attack: 0.03, sustain: 0.12, release: 0.12, highpass: 2400 }),
    at(0, { vol: 0.3, freq: 68 * (1 + 0.05 * v), attack: 0.02, sustain: 0.2, release: 0.12, shape: 'saw', tremolo: 0.3, repeat: 0.05, lowpass: 700 }),
    ...[120, 190, 260].map((ms, k) => noiseBurst(ms, { vol: 0.32, freq: 1800 * (1 + 0.1 * k), attack: 0.001, release: 0.04, lowpass: 6000 })),
  ])),
  net_cast: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.28, freq: 700 * (1 + 0.06 * v), attack: 0.05, sustain: 0.15, release: 0.06, tremolo: 0.5, repeat: 0.11, lowpass: 3000 }),
    noiseBurst(240, { vol: 0.25, freq: 1100, attack: 0.02, sustain: 0.12, release: 0.1, tremolo: 0.5, repeat: 0.06, lowpass: 4200 }),
  ])),
  shot_polybolos: mix('bronze', mixVariants(3, (v) => [
    ...[0, 30, 60].map((ms) => at(ms, { vol: 0.16, freq: 1600, attack: 0.001, release: 0.02, shape: 'square', curve: 0.5 })),
    at(90, { vol: 0.45, freq: 96 * (1 + 0.06 * v), attack: 0.001, release: 0.16, shape: 'tri', curve: 2, slide: -0.4 }),
    noiseBurst(100, { vol: 0.22, freq: 2200, attack: 0.004, release: 0.1, slide: 3, lowpass: 6400 }),
  ])),

  // A17.12 attacks: Industrial (carbine, harpoon, flare, fuse, gatling, tesla) --------------------------
  shot_carbine: mix('industrial', mixVariants(4, (v) => [
    noiseBurst(0, { vol: 0.55, freq: 1200 * (1 + 0.08 * v), attack: 0.001, decay: 0.02, sustainVol: 0.35, release: 0.16, lowpass: 7600 }),
    thump(0, 110, 0.35, 0.09, -1.5),
    at(180, { vol: 0.12, freq: 2400, attack: 0.001, release: 0.03, shape: 'square', curve: 0.5 }),
  ])),
  shot_harpoon: mix('industrial', mixVariants(3, (v) => [
    thump(0, 120 * (1 + 0.05 * v), 0.5, 0.12, -1.2),
    noiseBurst(0, { vol: 0.35, freq: 600, attack: 0.002, release: 0.1, lowpass: 3600 }),
    at(40, { vol: 0.2, freq: 900 * (1 + 0.05 * v), attack: 0.02, sustain: 0.1, release: 0.05, shape: 'saw', slide: -3, tremolo: 0.5, repeat: 0.02, lowpass: 4000 }),
  ])),
  flare_pop: mix('industrial', mixVariants(3, (v) => [
    at(0, { vol: 0.45, freq: 420 * (1 + 0.05 * v), attack: 0.002, release: 0.1, slide: 6 }),
    noiseBurst(40, { vol: 0.25, freq: 4000, attack: 0.03, sustain: 0.2, release: 0.2, highpass: 3600, tremolo: 0.3, repeat: 0.03 }),
  ])),
  fuse_hiss: fx('industrial', variants(3, (v) => ({ vol: 0.3, freq: 5200 * (1 + 0.06 * v), attack: 0.03, sustain: 0.35, release: 0.08, shape: 'noise', tremolo: 0.35, repeat: 0.03, highpass: 4000 }))),
  shot_gatling: mix('industrial', mixVariants(4, (v) => [
    noiseBurst(0, { vol: 0.42, freq: 1300 * (1 + 0.1 * v), attack: 0.001, decay: 0.01, sustainVol: 0.3, release: 0.05, lowpass: 8000 }),
    at(0, { vol: 0.12, freq: 90, attack: 0.002, release: 0.04, shape: 'square', curve: 0.4 }),
  ])),
  tesla_zap: mix('industrial', mixVariants(3, (v) => [
    at(0, { vol: 0.35, freq: 480 * (1 + 0.1 * v), attack: 0.002, sustain: 0.12, release: 0.12, shape: 'tan', noise: 3, mod: 45, repeat: 0.025, lowpass: 9000 }),
    noiseBurst(0, { vol: 0.25, freq: 6000, attack: 0.001, release: 0.05, highpass: 5000 }),
  ])),

  // A17.12 attacks: Cosmic (ion, void, starburst, tachyon, blink, drones) ------------------------------
  shot_ion: fx('cosmic', variants(4, (v) => ({ vol: 0.36, freq: 1000 * (1 + 0.08 * v), attack: 0.004, sustain: 0.03, release: 0.14, shape: 'square', curve: 0.5, slide: -9, mod: 20, lowpass: 9000 }))),
  shot_void: mix('cosmic', mixVariants(3, (v) => [
    at(0, { vol: 0.4, freq: 220 * (1 + 0.06 * v), attack: 0.004, sustain: 0.06, release: 0.2, shape: 'saw', slide: -2, mod: 8, crush: 0.05, lowpass: 5200 }),
    thump(0, 70, 0.3, 0.15, -0.6),
  ])),
  shot_starburst: mix('cosmic', mixVariants(3, (v) => [
    at(0, { vol: 0.32, freq: 1600 * (1 + 0.06 * v), attack: 0.002, release: 0.09, shape: 'square', curve: 0.5, slide: -12, lowpass: 9500 }),
    at(40, { vol: 0.26, freq: 1200 * (1 + 0.06 * v), attack: 0.002, release: 0.09, shape: 'square', curve: 0.5, slide: -10, lowpass: 9500 }),
    at(80, { vol: 0.2, freq: 900 * (1 + 0.06 * v), attack: 0.002, release: 0.1, shape: 'square', curve: 0.5, slide: -8, lowpass: 9500 }),
  ])),
  shot_tachyon: mix('cosmic', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 300, attack: 0.1, release: 0.01, shape: 'saw', slide: 14, lowpass: 7000 }),
    at(100, { vol: 0.42, freq: 2600 * (1 + 0.05 * v), attack: 0.002, sustain: 0.05, release: 0.3, shape: 'saw', slide: -11, crush: 0.02, lowpass: 10000 }),
    thump(100, 60, 0.35, 0.2, -0.8),
  ])),
  blink_warp: mix('cosmic', mixVariants(3, (v) => [
    at(0, { vol: 0.32, freq: 600 * (1 + 0.06 * v), attack: 0.005, sustain: 0.06, release: 0.1, shape: 'tri', slide: 18, tremolo: 0.4, repeat: 0.03 }),
    at(260, { vol: 0.3, freq: 2400 * (1 + 0.04 * v), attack: 0.004, release: 0.18, shape: 'tri', slide: -16 }),
  ])),
  drone_launch: mix('cosmic', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 400, attack: 0.05, sustain: 0.2, release: 0.2, slide: 2, lowpass: 3600 }),
    at(0, { vol: 0.25, freq: 300 * (1 + 0.05 * v), attack: 0.08, sustain: 0.15, release: 0.15, shape: 'square', curve: 0.5, slide: 4, mod: 12, lowpass: 5000 }),
  ])),

  // Hits and deaths -----------------------------------------------------------------------------------
  hit_blunt: mix('battle', mixVariants(4, (v) => [
    at(0, { vol: 0.6, freq: 150 * (1 + 0.1 * v), attack: 0.001, release: 0.09, slide: -3 }),
    noiseBurst(0, { vol: 0.2, freq: 900, attack: 0.001, release: 0.03, lowpass: 4800 }),
  ])),
  hit_slash: fx('battle', variants(4, (v) => ({ vol: 0.35, freq: 3000 * (1 + 0.08 * v), attack: 0.002, release: 0.09, shape: 'noise', slide: -6, highpass: 3200 }))),
  hit_pierce: fx('battle', variants(4, (v) => ({ vol: 0.55, freq: 1900 * (1 + 0.08 * v), attack: 0.001, release: 0.05, shape: 'tri', slide: -18, noise: 0.6 }))),
  hit_bullet: mix('battle', mixVariants(4, (v) => [
    noiseBurst(0, { vol: 0.35, freq: 2600 * (1 + 0.1 * v), attack: 0.001, release: 0.05, highpass: 3000 }),
    at(0, { vol: 0.12, freq: 3100 * (1 + 0.06 * v), attack: 0.001, release: 0.09, slide: -3 }),
  ])),
  hit_laser: fx('battle', variants(4, (v) => ({ vol: 0.3, freq: 1700 * (1 + 0.08 * v), attack: 0.002, release: 0.11, shape: 'tan', noise: 1.5, highpass: 1800 }))),
  hit_heavy: mix('battle', mixVariants(3, (v) => [
    thump(0, 95 * (1 + 0.08 * v), 0.8, 0.22, -1.4),
    noiseBurst(0, { vol: 0.4, freq: 600, attack: 0.001, decay: 0.02, sustainVol: 0.4, release: 0.16, lowpass: 3600 }),
  ])),
  hit_effective: fx('battle', variants(3, (v) => ({ vol: 0.5, freq: 1500 * (1 + 0.04 * v), attack: 0.001, release: 0.14, shape: 'tri', jump: 750, jumpTime: 0.025 }))),
  explosion_s: mix('battle', mixVariants(4, (v) => [
    noiseBurst(0, { vol: 0.65, freq: 320 * (1 + 0.1 * v), attack: 0.003, decay: 0.05, sustainVol: 0.45, release: 0.32, lowpass: 4800 }),
    thump(0, 80, 0.5, 0.22),
  ])),
  explosion_m: mix('battle', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.75, freq: 220, attack: 0.003, decay: 0.08, sustainVol: 0.5, release: 0.55, lowpass: 3200 }),
    thump(0, 60 * (1 + 0.06 * v), 0.7, 0.45, -0.4),
  ])),
  explosion_l: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.8, freq: 160, attack: 0.005, decay: 0.15, sustainVol: 0.55, release: 1.0, lowpass: 2200 }),
    at(0, { vol: 0.8, freq: 45 * (1 + 0.06 * v), attack: 0.005, release: 0.9, slide: -0.12 }),
    noiseBurst(150, { vol: 0.2, freq: 1200, sustain: 0.3, release: 0.4, tremolo: 0.5, repeat: 0.045, lowpass: 6000 }),
  ]), { maxVoices: 3 }),
  die_bio: mix('battle', mixVariants(4, (v) => [
    at(0, { vol: 0.45, freq: 230 * (1 + 0.1 * v), attack: 0.01, sustain: 0.03, release: 0.14, shape: 'saw', curve: 0.8, slide: -2.2, lowpass: 2600 }),
    noiseBurst(0, { vol: 0.2, freq: 500, attack: 0.01, release: 0.15, lowpass: 2400 }),
  ])),
  die_mech: mix('battle', mixVariants(4, (v) => [
    at(0, { vol: 0.35, freq: 320 * (1 + 0.08 * v), attack: 0.001, release: 0.28, shape: 'square', curve: 0.5, slide: -1.5, crush: 0.06, lowpass: 7000 }),
    noiseBurst(0, { vol: 0.2, freq: 4000, release: 0.15, highpass: 6000, tremolo: 0.5, repeat: 0.03 }),
  ])),
  prop_drop: fx('battle', variants(3, (v) => ({ vol: 0.35, freq: 620 * (1 + 0.1 * v), attack: 0.001, release: 0.12, shape: 'tri', slide: -2.5, repeat: 0.045, tremolo: 0.4 }))),
  heal_tick: fx('battle', variants(3, (v) => ({ vol: 0.25, freq: 1320 * (1 + 0.02 * v), attack: 0.005, release: 0.14, jump: 440, jumpTime: 0.04 }))),
  shield_up: fx('battle', variants(3, (v) => ({ vol: 0.3, freq: 520 * (1 + 0.04 * v), attack: 0.02, sustain: 0.05, release: 0.2, shape: 'tri', slide: 7, tremolo: 0.35, repeat: 0.03 }))),

  // Turrets and bases ---------------------------------------------------------------------------------
  turret_build: mix('battle', mixVariants(3, (v) => [
    at(0, { vol: 0.45, freq: 260 * (1 + 0.06 * v), attack: 0.001, release: 0.07, shape: 'tri', slide: -2 }),
    at(110, { vol: 0.45, freq: 300 * (1 + 0.06 * v), attack: 0.001, release: 0.07, shape: 'tri', slide: -2 }),
    at(220, { vol: 0.5, freq: 340 * (1 + 0.06 * v), attack: 0.001, release: 0.09, shape: 'tri', slide: -2 }),
    noiseBurst(250, { vol: 0.2, freq: 900, sustain: 0.08, release: 0.03, repeat: 0.02, tremolo: 0.5, lowpass: 6000 }),
  ])),
  turret_sell: mix('battle', mixVariants(3, (v) => [
    at(0, { vol: 0.3, freq: 500 * (1 + 0.05 * v), attack: 0.01, sustain: 0.08, release: 0.15, shape: 'tri', slide: -3 }),
    coin(150, 1500),
  ])),
  turret_upgrade: mix('battle', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.25, freq: 700, sustain: 0.2, release: 0.05, repeat: 0.03, tremolo: 0.5, lowpass: 7000 }),
    at(0, { vol: 0.3, freq: 400 * (1 + 0.04 * v), attack: 0.02, sustain: 0.15, release: 0.1, shape: 'tri', slide: 5 }),
    note(280, 'E6', { vol: 0.35, attack: 0.001, release: 0.3, shape: 'tri' }),
  ]), MUSICAL),
  slot_buy: mix('battle', mixVariants(3, (v) => [
    thump(0, 180 * (1 + 0.06 * v), 0.5, 0.12, -2),
    coin(60, 1600),
  ])),
  base_hit: mix('battle', mixVariants(3, (v) => [
    thump(0, 75 * (1 + 0.08 * v), 0.6, 0.25, -0.6),
    noiseBurst(0, { vol: 0.4, freq: 260, decay: 0.03, sustainVol: 0.5, release: 0.22, lowpass: 1800 }),
  ])),
  // Off-screen "base under attack" badge (A17.4): a short two-tone alarm, rare by design (gap 4 s).
  alert_base: mix('battle', mixVariants(3, (v) => [
    note(0, 'E5', { vol: 0.32, attack: 0.004, sustain: 0.06, release: 0.08, shape: 'square', lowpass: 3600 }),
    note(120, 'B4', { vol: 0.32, attack: 0.004, sustain: 0.06, release: 0.12, shape: 'square', lowpass: 3600 }),
    thump(0, 90 * (1 + 0.05 * v), 0.25, 0.12),
  ]), { ...MUSICAL, maxVoices: 1, gapMs: 4000 }),
  base_crumble: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.45, freq: 600, release: 0.1, lowpass: 5000 }),
    noiseBurst(40, { vol: 0.45, freq: 180 * (1 + 0.08 * v), attack: 0.01, sustain: 0.4, release: 0.45, tremolo: 0.5, repeat: 0.06, lowpass: 1600 }),
    thump(0, 60, 0.45, 0.3, -0.3),
  ])),
  base_destroyed: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.8, freq: 140, attack: 0.005, decay: 0.2, sustainVol: 0.6, release: 1.4, lowpass: 1800 }),
    at(0, { vol: 0.8, freq: 42 * (1 + 0.05 * v), attack: 0.005, release: 1.2, slide: -0.08 }),
    noiseBurst(300, { vol: 0.45, freq: 200, attack: 0.05, sustain: 0.6, release: 0.8, tremolo: 0.5, repeat: 0.07, lowpass: 1400 }),
    noiseBurst(500, { vol: 0.2, freq: 1500, sustain: 0.5, release: 0.5, tremolo: 0.5, repeat: 0.05, lowpass: 7000 }),
  ]), { maxVoices: 1 }),

  // Economy -------------------------------------------------------------------------------------------
  // The caller climbs the pitch on multi-kills (A13); the 40 ms gap is A13's coin throttle.
  coin_gain: mix('battle', mixVariants(3, (v) => [coin(0, 1500 * (1 + 0.02 * v))]), CALLER_PITCHED),
  xp_tick: fx('battle', variants(3, (v) => ({ vol: 0.16, freq: 2500 * (1 + 0.05 * v), attack: 0.002, release: 0.05, slide: 5 }))),
  treasury_up: mix('match', mixVariants(3, (_v, k) => [
    coin(0, 1047, 0.3), coin(70, k === 2 ? 1568 : 1319, 0.3), coin(140, k === 2 ? 2093 : 1568, 0.3), coin(210, k === 1 ? 2637 : 2093, k === 2 ? 0.45 : 0.35),
  ]), MUSICAL),

  // Evolve --------------------------------------------------------------------------------------------
  evolve_ready: mix('battle', mixVariants(3, (_v, k) => [
    note(0, 'C6', { vol: 0.35, attack: 0.003, release: 0.9 }),
    note(0, ['G6', 'E6', 'G5'][k] as string, { vol: 0.12, attack: 0.003, release: 0.6 }),
    note(0, 'C7', { vol: 0.05, attack: 0.003, release: 0.4 }),
  ]), MUSICAL),
  evolve_riser: mix('match', mixVariants(3, (v) => [
    at(0, { vol: 0.3, freq: 110, attack: 2.1, release: 0.15, shape: 'saw', slide: 1.1 * (1 + 0.05 * v), lowpass: 5200, tremolo: 0.25, repeat: 0.1 }),
    noiseBurst(0, { vol: 0.25, freq: 2000, attack: 1.9, release: 0.25, highpass: 1800, slide: 1 }),
    at(0, { vol: 0.3, freq: 55, attack: 0.5, sustain: 1.5, release: 0.2, tremolo: 0.5, repeat: 0.23 }),
  ]), { ...TIMED, maxVoices: 1 }),
  evolve_fanfare_stone: fanfare('stone'),
  evolve_fanfare_medieval: fanfare('medieval'),
  evolve_fanfare_gunpowder: fanfare('gunpowder'),
  evolve_fanfare_modern: fanfare('modern'),
  evolve_fanfare_future: fanfare('future'),
  evolve_fanfare_bronze: fanfare('bronze'),
  evolve_fanfare_industrial: fanfare('industrial'),
  evolve_fanfare_cosmic: fanfare('cosmic'),
  evolve_enemy: mix('match', mixVariants(3, (v) => [
    note(0, 'G3', { vol: 0.4, attack: 0.05, sustain: 0.2, release: 0.2, shape: 'saw', lowpass: 1800 }),
    note(300, 'Eb3', { vol: 0.4, attack: 0.05, sustain: 0.3, release: 0.4, shape: 'saw', lowpass: 1800 }),
    thump(300, 60 * (1 + 0.05 * v), 0.4, 0.4, -0.3),
  ]), MUSICAL),

  // Powers --------------------------------------------------------------------------------------------
  power_ready: mix('battle', mixVariants(3, (_v, k) => [
    note(0, 'E6', { vol: 0.3, attack: 0.003, release: 0.35, shape: 'tri' }),
    note(70, ['B6', 'G#6', 'E7'][k] as string, { vol: 0.25, attack: 0.003, release: 0.45, shape: 'tri' }),
  ]), MUSICAL),
  power_telegraph: fx('battle', variants(3, (v) => ({ vol: 0.4, freq: 300 * (1 + 0.03 * v), attack: 0.05, sustain: 0.75, release: 0.2, shape: 'saw', slide: 0.3, tremolo: 0.5, repeat: 0.25, lowpass: 3200 })), TIMED),
  // The power rework's shared cues (A2.9.10, A5.7): the cast committed (MR-70b, a rising whoosh into a
  // coin clink), a strike's lock (its telegraph) and a silenced mount (Suppress). In `match`, which
  // loads at boot, because the boot pre-render groups are at their budget.
  power_cast: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.25, freq: 900 * (1 + 0.04 * v), attack: 0.12, release: 0.08, slide: 3, lowpass: 7000 }),
    at(20, { vol: 0.2, freq: 330 * (1 + 0.04 * v), attack: 0.04, sustain: 0.08, release: 0.06, shape: 'tri', slide: 2.5 }),
    coin(200, 2093 * (1 + 0.02 * v), 0.3),
  ]), { maxVoices: 2 }),
  power_lock: mix('match', mixVariants(3, (_v, k) => [
    at(0, { vol: 0.25, freq: 2400, attack: 0.001, release: 0.03, shape: 'square', lowpass: 5000 }),
    at(90, { vol: 0.25, freq: 2400, attack: 0.001, release: 0.03, shape: 'square', lowpass: 5000 }),
    note(200, ['E6', 'E6', 'F#6'][k] as string, { vol: 0.25, attack: 0.003, release: 0.3, shape: 'tri' }),
    note(270, ['B6', 'A6', 'B6'][k] as string, { vol: 0.2, attack: 0.003, release: 0.35, shape: 'tri' }),
  ]), { ...MUSICAL, maxVoices: 2 }),
  turret_jammed: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.35, freq: 500, decay: 0.03, sustainVol: 0.2, release: 0.12, lowpass: 5000 }),
    at(30, { vol: 0.2, freq: 900 * (1 + 0.05 * v), attack: 0.01, sustain: 0.1, release: 0.3, shape: 'saw', slide: -3, lowpass: 2400 }),
    noiseBurst(40, { vol: 0.15, freq: 3000, sustain: 0.3, release: 0.15, tremolo: 0.7, repeat: 0.03, highpass: 2000 }),
  ]), { maxVoices: 2 }),
  pw_stampede: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.6, freq: 90 * (1 + 0.06 * v), attack: 0.05, sustain: 1.4, release: 0.5, tremolo: 0.5, repeat: 0.085, lowpass: 1200 }),
    at(100, { vol: 0.35, freq: 95, attack: 0.08, sustain: 0.4, release: 0.4, shape: 'saw', slide: -0.15, lowpass: 1400 }),
    at(0, { vol: 0.4, freq: 45, attack: 0.2, sustain: 1.2, release: 0.5 }),
  ]), { maxVoices: 2 }),
  pw_meteor: mix('stone', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 1400 * (1 + 0.05 * v), attack: 0.1, sustain: 0.3, release: 0.2, slide: -2.5, lowpass: 6000 }),
    noiseBurst(550, { vol: 0.7, freq: 220, decay: 0.08, sustainVol: 0.5, release: 0.6, lowpass: 3000 }),
    thump(550, 55, 0.7, 0.5, -0.3),
    noiseBurst(900, { vol: 0.45, freq: 260, decay: 0.05, sustainVol: 0.5, release: 0.4, lowpass: 3000 }),
  ]), { maxVoices: 2 }),
  pw_arrows: mix('medieval', mixVariants(3, (v) => [
    at(0, { vol: 0.35, freq: 200, release: 0.15, shape: 'tri', curve: 2, repeat: 0.03 }),
    noiseBurst(100, { vol: 0.35, freq: 2500 * (1 + 0.06 * v), attack: 0.15, sustain: 0.8, release: 0.5, highpass: 3000, tremolo: 0.45, repeat: 0.045 }),
  ]), { maxVoices: 2 }),
  pw_decree: mix('medieval', mixVariants(3, (_v, k) => {
    const horn: Zz = { attack: 0.03, release: 0.12, shape: 'saw', lowpass: 4400 };
    return [
      note(0, 'G4', { ...horn, vol: 0.35, sustain: 0.08 }),
      note(130, 'C5', { ...horn, vol: 0.35, sustain: 0.08 }),
      note(260, 'E5', { ...horn, vol: 0.38, sustain: 0.08 }),
      note(390, ['G5', 'E5', 'C6'][k] as string, { ...horn, vol: 0.4, sustain: 0.45, release: 0.3 }),
      note(390, 'C4', { ...horn, vol: 0.22, sustain: 0.45, release: 0.3 }),
      thump(390, 98, 0.5, 0.5, -0.2),
    ];
  }), { ...MUSICAL, maxVoices: 2 }),
  pw_smoke: mix('gunpowder', mixVariants(3, (v) => [
    thump(0, 200, 0.35, 0.1, -3),
    noiseBurst(0, { vol: 0.5, freq: 600 * (1 + 0.06 * v), attack: 0.2, sustain: 0.6, release: 1.0, slide: -0.3, lowpass: 3000 }),
  ]), { maxVoices: 2 }),
  pw_broadside: mix('gunpowder', mixVariants(3, (v) =>
    [0, 1, 2, 3].flatMap((i) => [
      noiseBurst(i * 260, { vol: 0.5, freq: 130 * (1 + 0.05 * (i - 1.5)) * (1 + 0.04 * v), decay: 0.05, sustainVol: 0.45, release: 0.45, lowpass: 1600 }),
      thump(i * 260, 55, 0.45, 0.35, -0.3),
    ]),
  ), { maxVoices: 2 }),
  pw_paratroop: mix('modern', mixVariants(3, (v) => [
    at(0, { vol: 0.35, freq: 95 * (1 + 0.05 * v), attack: 0.3, sustain: 0.8, release: 0.5, shape: 'saw', mod: 3, tremolo: 0.2, repeat: 0.06, lowpass: 1800 }),
    ...[700, 850, 1000, 1150].map((ms) => noiseBurst(ms, { vol: 0.3, freq: 400, release: 0.08, lowpass: 4000 })),
  ]), { maxVoices: 2 }),
  pw_bomber: mix('modern', mixVariants(3, (v) => [
    at(0, { vol: 0.45, freq: 75 * (1 + 0.04 * v), attack: 0.4, sustain: 0.4, release: 0.8, shape: 'saw', slide: -0.05, tremolo: 0.3, repeat: 0.04, lowpass: 1600 }),
    at(300, { vol: 0.2, freq: 1600, attack: 0.05, sustain: 0.4, release: 0.05, slide: -2.5 }),
    at(450, { vol: 0.18, freq: 1400, attack: 0.05, sustain: 0.4, release: 0.05, slide: -2.5 }),
  ]), { maxVoices: 2 }),
  pw_lance: mix('future', mixVariants(3, (v) => [
    at(0, { vol: 0.35, freq: 180 * (1 + 0.04 * v), attack: 0.45, release: 0.05, shape: 'saw', slide: 3, lowpass: 6000 }),
    at(450, { vol: 0.4, freq: 620, attack: 0.01, sustain: 1.6, release: 0.4, shape: 'square', curve: 0.8, mod: 55, crush: 0.05, tremolo: 0.2, repeat: 0.05, lowpass: 9000 }),
    at(450, { vol: 0.45, freq: 50, sustain: 1.5, release: 0.4 }),
  ]), { maxVoices: 2 }),
  pw_nanite: mix('future', mixVariants(3, (v) => [
    at(0, { vol: 0.3, freq: 1800 * (1 + 0.05 * v), attack: 0.1, sustain: 0.9, release: 0.4, shape: 'tri', mod: 30, tremolo: 0.5, repeat: 0.025 }),
    note(0, 'C5', { vol: 0.25, attack: 0.3, sustain: 0.4, release: 0.5, slide: 1.5 }),
  ]), { maxVoices: 2 }),
  // A17.12 powers ---------------------------------------------------------------------------------------
  pw_wave: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.55, freq: 300 * (1 + 0.05 * v), attack: 0.4, sustain: 0.9, release: 0.7, slide: -0.2, tremolo: 0.3, repeat: 0.18, lowpass: 2200 }),
    noiseBurst(300, { vol: 0.3, freq: 3000, attack: 0.2, sustain: 0.6, release: 0.6, highpass: 2400, tremolo: 0.4, repeat: 0.09 }),
    at(0, { vol: 0.35, freq: 55, attack: 0.3, sustain: 1.0, release: 0.5 }),
  ]), { maxVoices: 2 }),
  pw_aegis: mix('bronze', mixVariants(3, (_v, k) => [
    note(0, 'C5', { vol: 0.28, attack: 0.02, sustain: 0.3, release: 0.6, shape: 'tri' }),
    note(0, 'G5', { vol: 0.22, attack: 0.02, sustain: 0.3, release: 0.6, shape: 'tri' }),
    note(160, ['E6', 'C6', 'G6'][k] as string, { vol: 0.22, attack: 0.01, release: 0.9, shape: 'tri' }),
    at(0, { vol: 0.2, freq: 520, attack: 0.05, sustain: 0.3, release: 0.4, shape: 'tri', slide: 5, tremolo: 0.35, repeat: 0.04 }),
    thump(0, 90, 0.45, 0.35, -0.3),
  ]), { ...MUSICAL, maxVoices: 2 }),
  // Bronze wave (CONTENT_PLAN 5.2) powers
  pw_sandstorm: mix('bronze', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.5, freq: 900 * (1 + 0.05 * v), attack: 0.12, sustain: 0.8, release: 0.6, slide: 0.4, tremolo: 0.3, repeat: 0.08, lowpass: 3600 }),
    noiseBurst(60, { vol: 0.25, freq: 5200, attack: 0.1, sustain: 0.7, release: 0.5, highpass: 3500, tremolo: 0.4, repeat: 0.07 }),
    thump(0, 60, 0.5, 0.3, -0.4),
  ]), { maxVoices: 2 }),
  pw_whirlpool: mix('bronze', mixVariants(3, (v) => [
    thump(0, 50 * (1 + 0.04 * v), 0.7, 0.4, -0.4),
    noiseBurst(0, { vol: 0.45, freq: 360 * (1 + 0.05 * v), attack: 0.1, sustain: 1.4, release: 0.6, tremolo: 0.5, repeat: 0.3, lowpass: 1600 }),
    noiseBurst(500, { vol: 0.25, freq: 1800, attack: 0.3, sustain: 0.8, release: 0.4, slide: -1.5, lowpass: 2600 }),
  ]), { maxVoices: 2 }),
  pw_iron_horse: mix('industrial', mixVariants(3, (v) => [
    ...[0, 180, 360, 540, 720, 900].map((ms) => noiseBurst(ms, { vol: 0.4, freq: 180 * (1 + 0.05 * v), attack: 0.01, release: 0.12, lowpass: 1400 })),
    note(0, 'A4', { vol: 0.2, attack: 0.03, sustain: 0.5, release: 0.2, shape: 'square', curve: 0.8, lowpass: 3000 }),
    note(0, 'C#5', { vol: 0.18, attack: 0.03, sustain: 0.5, release: 0.2, shape: 'square', curve: 0.8, lowpass: 3000 }),
    at(0, { vol: 0.45, freq: 48, attack: 0.1, sustain: 1.1, release: 0.4 }),
  ]), { maxVoices: 2 }),
  pw_zeppelin: mix('industrial', mixVariants(3, (v) => [
    at(0, { vol: 0.4, freq: 62 * (1 + 0.04 * v), attack: 0.4, sustain: 0.8, release: 0.6, shape: 'saw', tremolo: 0.3, repeat: 0.07, lowpass: 1200 }),
    ...[500, 700, 900, 1100].map((ms) => at(ms, { vol: 0.16, freq: 1500, attack: 0.03, sustain: 0.15, release: 0.03, slide: -3 })),
  ]), { maxVoices: 2 }),
  pw_starfall: mix('cosmic', mixVariants(3, (v) => [
    at(0, { vol: 0.25, freq: 2400 * (1 + 0.04 * v), attack: 0.08, sustain: 0.6, release: 0.3, shape: 'tri', slide: -3, tremolo: 0.5, repeat: 0.03 }),
    ...[500, 800, 1100].map((ms) => noiseBurst(ms, { vol: 0.5, freq: 260, decay: 0.05, sustainVol: 0.45, release: 0.35, lowpass: 3600 })),
    thump(500, 60, 0.55, 0.4, -0.3),
  ]), { maxVoices: 2 }),
  pw_warp: mix('cosmic', mixVariants(3, (v) => [
    at(0, { vol: 0.35, freq: 150 * (1 + 0.04 * v), attack: 0.4, release: 0.05, shape: 'saw', slide: 5, mod: 10, lowpass: 5000 }),
    at(450, { vol: 0.35, freq: 1800 * (1 + 0.04 * v), attack: 0.004, release: 0.35, shape: 'tri', slide: -14 }),
    thump(450, 70, 0.5, 0.3, -0.5),
  ]), { maxVoices: 2 }),

  // The power rework (A2.9, A5.7): first-pass ZzFX from the family recipes until the next `tools/audio`
  // render (WP6 P3/P4). Sweeps whoosh across, bombards thud in a row, fields creak and hold, strikes
  // charge then crack, charges rumble, buffs chime, drops land, Suppress jams with static. The Stone and
  // Bronze ones sit in the `match` group for now: the boot groups are at their pre-render budget.
  ...powerSweep('pw_rockslide', 'match', 120, 1500),
  ...powerField('pw_tar', 'match', 70, 0.6),
  ...powerBuff('pw_huntcry', 'match', ['A4', 'E5', 'A5']),
  ...powerStrike('pw_spear', 'match', 420, 0.9),
  ...powerBombard('pw_bolts', 'match', 900, [0, 250, 500, 750]),
  ...powerField('pw_gaze', 'match', 300, 0.3),
  ...powerCharge('pw_chariots', 'match', 150, [0, 500, 1000]),
  ...powerStrike('pw_apollo', 'match', 900, 1.2),
  ...powerField('pw_caltrops', 'medieval', 1800, 0.25),
  ...powerSweep('pw_oil', 'medieval', 260, 1000),
  ...powerCharge('pw_knights', 'medieval', 130, [0, 500, 1000]),
  ...powerJam('pw_undermine', 'medieval', 90),
  ...powerSweep('pw_volley', 'gunpowder', 400, 1000),
  ...powerField('pw_nets', 'gunpowder', 220, 0.4),
  ...powerBombard('pw_horse_art', 'gunpowder', 140, [0, 250, 500]),
  ...powerStrike('pw_sharpshooter', 'gunpowder', 700, 0.8),
  ...powerSweep('pw_gunline', 'industrial', 350, 1500),
  ...powerField('pw_wire', 'industrial', 1200, 0.3),
  ...powerStrike('pw_railgun', 'industrial', 180, 2.0),
  ...powerBuff('pw_hospital', 'industrial', ['C5', 'E5', 'G5']),
  ...powerSweep('pw_strafe', 'modern', 520, 1500),
  ...powerBombard('pw_flak', 'modern', 700, [0, 200, 400]),
  ...powerCharge('pw_tanks', 'modern', 70, [0, 600]),
  ...powerStrike('pw_sniper', 'modern', 1100, 0.7),
  ...powerBombard('pw_pdg', 'future', 1500, [0, 150, 300, 450, 600]),
  ...powerField('pw_stasis', 'future', 900, 0.2),
  ...powerBombard('pw_drones', 'future', 1200, [0, 200, 400, 600]),
  ...powerJam('pw_emp', 'future', 160),
  ...powerField('pw_singularity', 'cosmic', 60, 0.5),
  ...powerSweep('pw_flare', 'cosmic', 800, 1500),
  ...powerCharge('pw_comet', 'cosmic', 200, [0, 400, 800]),
  ...powerStrike('pw_ion', 'cosmic', 1400, 1.1),

  // Match ---------------------------------------------------------------------------------------------
  last_stand_armed: mix('match', mixVariants(3, (_v, k) => [
    note(0, 'D3', { vol: 0.45, attack: 0.12, sustain: 0.45, release: 0.4, shape: 'saw', slide: -0.05, lowpass: 2000 }),
    note(0, ['A3', 'F3', 'D4'][k] as string, { vol: 0.25, attack: 0.12, sustain: 0.45, release: 0.4, shape: 'saw', lowpass: 2000 }),
  ]), { ...MUSICAL, maxVoices: 1 }),
  last_stand_charge: mix('match', mixVariants(3, (v) => [
    at(0, { vol: 0.4, freq: 90 * (1 + 0.04 * v), attack: 0.9, release: 0.05, shape: 'saw', slide: 2.2, lowpass: 4800 }),
    noiseBurst(0, { vol: 0.35, freq: 120, attack: 0.5, sustain: 0.4, release: 0.05, repeat: 0.045, tremolo: 0.5, lowpass: 2400 }),
  ]), { ...TIMED, maxVoices: 1 }),
  last_stand_fire: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.75, freq: 160, decay: 0.12, sustainVol: 0.55, release: 0.8, lowpass: 2400 }),
    at(0, { vol: 0.75, freq: 48 * (1 + 0.05 * v), attack: 0.003, release: 0.8, slide: -0.1 }),
    at(0, { vol: 0.3, freq: 1600, attack: 0.002, release: 0.6, shape: 'saw', slide: -5, lowpass: 8000 }),
  ]), { maxVoices: 1 }),
  overdrive_horn: mix('match', mixVariants(3, (_v, k) => [
    note(0, 'A3', { vol: 0.45, attack: 0.06, sustain: 0.2, release: 0.05, shape: 'saw', lowpass: 3000 }),
    note(250, 'D4', { vol: 0.45, attack: 0.03, sustain: 0.35, release: 0.25, shape: 'saw', lowpass: 3000 }),
    note(250, ['F#4', 'A3', 'D5'][k] as string, { vol: 0.2, attack: 0.03, sustain: 0.35, release: 0.25, shape: 'saw', lowpass: 3000 }),
    note(250, 'D3', { vol: 0.25, attack: 0.03, sustain: 0.35, release: 0.25, shape: 'saw', lowpass: 2000 }),
  ]), { ...MUSICAL, maxVoices: 1 }),
  siege_bell: mix('match', mixVariants(3, (_v, k) => {
    // Bell partials (hum, prime, tierce, quint, nominal), two tolls.
    const root = ['G3', 'F#3', 'A3'][k] as string;
    const toll = (ms: number, vol: number): ZzfxNote[] => [
      noiseBurst(ms, { vol: 0.2 * vol, freq: 3000, release: 0.03, highpass: 4000 }),
      note(ms, root, { vol: 0.45 * vol, attack: 0.002, release: 2.2 }, -12),
      note(ms, root, { vol: 0.35 * vol, attack: 0.002, release: 1.8 }),
      note(ms, root, { vol: 0.18 * vol, attack: 0.002, release: 1.2 }, 3),
      note(ms, root, { vol: 0.14 * vol, attack: 0.002, release: 1.0 }, 7),
      note(ms, root, { vol: 0.12 * vol, attack: 0.002, release: 0.8 }, 12),
    ];
    return [...toll(0, 1), ...toll(900, 0.7)];
  }), { ...MUSICAL, maxVoices: 1 }),
  victory_jingle: mix('match', mixVariants(3, (_v, k) => {
    const lead: Zz = { attack: 0.005, release: 0.08, shape: 'square', curve: 1, lowpass: 5000 };
    const out = [
      note(0, 'C5', { ...lead, vol: 0.35, sustain: 0.08 }),
      note(110, 'G4', { ...lead, vol: 0.3, sustain: 0.03 }),
      note(170, 'C5', { ...lead, vol: 0.32, sustain: 0.03 }),
      note(230, 'E5', { ...lead, vol: 0.34, sustain: 0.08 }),
      note(350, 'G5', { ...lead, vol: 0.34, sustain: 0.08 }),
      note(470, 'C6', { ...lead, vol: 0.36, sustain: 0.5, release: 0.3 }),
      note(470, 'E5', { vol: 0.2, attack: 0.01, sustain: 0.5, release: 0.4, shape: 'tri' }),
      note(470, 'G4', { vol: 0.2, attack: 0.01, sustain: 0.5, release: 0.4, shape: 'tri' }),
      thump(0, 90, 0.4, 0.2),
      thump(470, 70, 0.5, 0.4, -0.3),
    ];
    if (k === 1) out.push(note(470, 'C4', { vol: 0.2, attack: 0.01, sustain: 0.5, release: 0.4, shape: 'tri' }));
    if (k === 2) out.push(at(470, { vol: 0.12, freq: 2400, attack: 0.05, sustain: 0.3, release: 0.4, shape: 'tri', slide: 3, tremolo: 0.5, repeat: 0.03 }));
    return out;
  }), { ...MUSICAL, maxVoices: 1 }),
  // Gentle, not mocking (A13): a soft descent that comes home to the tonic.
  defeat_jingle: mix('match', mixVariants(3, (_v, k) => {
    const soft: Zz = { attack: 0.03, release: 0.2, shape: 'tri', lowpass: 3000 };
    return [
      note(0, 'G4', { ...soft, vol: 0.32, sustain: 0.15 }),
      note(260, 'E4', { ...soft, vol: 0.3, sustain: 0.15 }),
      note(520, 'D4', { ...soft, vol: 0.3, sustain: 0.15 }),
      note(780, 'C4', { ...soft, vol: 0.32, sustain: 0.5, release: 0.6 }),
      note(780, ['E3', 'G3', 'G2'][k] as string, { ...soft, vol: 0.2, sustain: 0.5, release: 0.6 }),
      note(780, 'C3', { ...soft, vol: 0.2, sustain: 0.5, release: 0.6 }),
    ];
  }), { ...MUSICAL, maxVoices: 1 }),
  emote_pop: fx('battle', variants(3, (v) => ({ vol: 0.4, freq: 480 * (1 + 0.1 * v), attack: 0.003, release: 0.08, slide: 9 }))),

  // Capsules ------------------------------------------------------------------------------------------
  cap_thud: mix('capsule', mixVariants(3, (v) => [
    thump(0, 70 * (1 + 0.05 * v), 0.8, 0.35, -0.7),
    noiseBurst(0, { vol: 0.35, freq: 300, attack: 0.005, release: 0.3, lowpass: 1600 }),
  ])),
  cap_riser: mix('capsule', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.35, freq: 60, attack: 1.2, release: 0.2, tremolo: 0.4, repeat: 0.05, lowpass: 1000 }),
    at(0, { vol: 0.3, freq: 150 * (1 + 0.03 * v), attack: 1.3, release: 0.15, shape: 'saw', slide: 0.8, lowpass: 3600 }),
    at(0, { vol: 0.15, freq: 2000, attack: 1.2, release: 0.2, shape: 'tri', tremolo: 0.5, repeat: 0.03 }),
  ]), { ...TIMED, maxVoices: 1 }),
  cap_climb_1: climb(1),
  cap_climb_2: climb(2),
  cap_climb_3: climb(3),
  cap_climb_4: climb(4),
  cap_climb_5: summitClimb(5),
  cap_climb_6: summitClimb(6),
  // A summit gem rising out of the capsule's cap: a stone grind under a rising glass chime (400 ms).
  cap_summit_rise: mix('capsule', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.35, freq: 90 * (1 + 0.05 * v), attack: 0.03, sustain: 0.22, release: 0.1, tremolo: 0.6, repeat: 0.03, lowpass: 900 }),
    at(0, { vol: 0.22, freq: 1400, attack: 0.05, sustain: 0.2, release: 0.12, shape: 'tri', slide: 6, tremolo: 0.4, repeat: 0.04 }),
    at(300, { vol: 0.18, freq: hz('G6'), attack: 0.002, release: 0.35, shape: 'sin' }),
  ]), { ...TIMED, maxVoices: 2 }),
  // The hammer's count-in (A10 step 3): a dry brass-and-wood tick; the plan pitches the three ticks up.
  cap_strike_tick: mix('capsule', mixVariants(3, (v) => [
    at(0, { vol: 0.32, freq: 1320 * (1 + 0.012 * v), attack: 0.001, release: 0.045, shape: 'tri', slide: -2 }),
    at(0, { vol: 0.12, freq: 2640 * (1 + 0.012 * v), attack: 0.001, release: 0.025, shape: 'sin' }),
    noiseBurst(0, { vol: 0.12, freq: 2400, attack: 0.001, release: 0.02, highpass: 1800 }),
  ]), { ...CALLER_PITCHED, maxVoices: 2 }),
  // A Perfect hit (A10 step 3): an anvil clang and a heavy thump under a bright bell ring (C7 and
  // G7). Feel only; the runner raises its pitch with the combo.
  cap_strike_perfect: mix('capsule', mixVariants(3, (v) => [
    thump(0, 95 * (1 + 0.03 * v), 0.75, 0.28, -0.9),
    noiseBurst(0, { vol: 0.35, freq: 900, decay: 0.02, sustainVol: 0.3, release: 0.12, lowpass: 5200 }),
    at(0, { vol: 0.2, freq: 1244 * (1 + 0.01 * v), attack: 0.001, release: 0.5, shape: 'square', curve: 0.5, lowpass: 7000 }),
    note(8, 'C7', { vol: 0.24, attack: 0.001, release: 0.9, shape: 'sin' }),
    note(8, 'G7', { vol: 0.12, attack: 0.001, release: 0.6, shape: 'sin' }),
    at(8, { vol: 0.08, freq: hz('C7') * 2.76, attack: 0.001, release: 0.35, shape: 'sin' }),
  ]), { ...MUSICAL, maxVoices: 2 }),
  // A Good hit: a lighter ring over a small knock.
  cap_strike_good: mix('capsule', mixVariants(3, (v) => [
    thump(0, 120 * (1 + 0.03 * v), 0.4, 0.14, -0.8),
    note(6, 'G6', { vol: 0.2, attack: 0.001, release: 0.45, shape: 'sin' }),
    at(6, { vol: 0.06, freq: hz('G6') * 2.76, attack: 0.001, release: 0.2, shape: 'sin' }),
  ]), { ...MUSICAL, maxVoices: 2 }),
  // A neutral knock, never a penalty sound (A10).
  cap_clunk: mix('capsule', mixVariants(3, (v) => [
    at(0, { vol: 0.45, freq: 160 * (1 + 0.06 * v), attack: 0.001, release: 0.14, shape: 'tri', slide: -1.5 }),
    noiseBurst(0, { vol: 0.2, freq: 400, attack: 0.005, release: 0.12, lowpass: 1800 }),
  ])),
  cap_burst: mix('capsule', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.6, freq: 1800 * (1 + 0.05 * v), decay: 0.05, sustainVol: 0.4, release: 0.5, highpass: 1200 }),
    thump(0, 70, 0.6, 0.5, -0.4),
    note(30, 'C6', { vol: 0.15, attack: 0.005, release: 0.9, shape: 'tri' }),
    note(30, 'E6', { vol: 0.15, attack: 0.005, release: 0.9, shape: 'tri' }),
    note(30, 'G6', { vol: 0.15, attack: 0.005, release: 0.9, shape: 'tri' }),
  ]), { ...MUSICAL, maxVoices: 2 }),
  // Platinum stinger: a struck glass-bell chord with a long tail, over cap_burst (no casino colour).
  cap_burst_platinum: mix('capsule', mixVariants(3, (_v, k) => {
    const bell = (ms: number, name: string, vol: number): ZzfxNote[] => [
      note(ms, name, { vol, attack: 0.001, release: 2.2, shape: 'sin' }),
      at(ms, { vol: vol * 0.45, freq: hz(name) * 2.76, attack: 0.001, release: 1.2, shape: 'sin' }),
      at(ms, { vol: vol * 0.25, freq: hz(name) * 5.4, attack: 0.001, release: 0.6, shape: 'sin' }),
    ];
    return [
      ...bell(0, 'C5', 0.26),
      ...bell(20, 'E5', 0.22),
      ...bell(40, 'G5', 0.22),
      ...bell(60, ['E6', 'C6', 'G6'][k] as string, 0.2),
      at(0, { vol: 0.14, freq: 3200, attack: 0.3, sustain: 0.6, release: 0.9, shape: 'tri', tremolo: 0.5, repeat: 0.04 }),
    ];
  }), { ...MUSICAL, maxVoices: 1 }),
  // Aeon stinger: a deep bell, a choir chord and a clock chime, with a 2 s star-glitter tail.
  cap_burst_aeon: mix('capsule', mixVariants(3, (_v, k) => {
    const pad: Zz = { attack: 0.25, sustain: 1.1, release: 1.2, shape: 'saw', lowpass: 2400 };
    return [
      note(0, 'C3', { vol: 0.5, attack: 0.001, release: 2.6, shape: 'sin' }),
      at(0, { vol: 0.18, freq: hz('C3') * 2.76, attack: 0.001, release: 1.6, shape: 'sin' }),
      at(0, { vol: 0.12, freq: hz('C3') * 5.4, attack: 0.001, release: 0.9, shape: 'sin' }),
      note(0, 'C4', { ...pad, vol: 0.12 }),
      at(0, { ...pad, vol: 0.1, freq: hz('C4') * 1.006 }),
      note(0, 'G4', { ...pad, vol: 0.1 }),
      note(0, 'E5', { ...pad, vol: 0.08 }),
      note(0, ['C5', 'G5', 'E4'][k] as string, { ...pad, vol: 0.08 }),
      ...[300, 450, 600].map((ms, i) => note(ms, ['G6', 'E6', 'C6'][i] as string, { vol: 0.14, attack: 0.001, release: 0.5, shape: 'tri' })),
      at(500, { vol: 0.1, freq: 4200, attack: 0.4, sustain: 0.8, release: 1.0, shape: 'tri', slide: -1, tremolo: 0.6, repeat: 0.03 }),
    ];
  }), { ...MUSICAL, maxVoices: 1 }),
  card_flip: fx('capsule', variants(4, (v) => ({ vol: 0.3, freq: 2600 * (1 + 0.1 * v), attack: 0.004, release: 0.05, shape: 'noise', slide: -4, highpass: 3600 }))),
  foil_shine: fx('capsule', variants(3, (v) => ({ vol: 0.35, freq: 2200 * (1 + 0.04 * v), attack: 0.05, sustain: 0.2, release: 0.25, shape: 'tri', slide: 5, tremolo: 0.5, repeat: 0.02 }))),
  rarity_common: mix('capsule', mixVariants(3, (_v, k) => [
    note(0, ['G5', 'E5', 'C6'][k] as string, { vol: 0.55, attack: 0.001, release: 0.22, shape: 'tri', curve: 1.5 }),
  ]), MUSICAL),
  rarity_rare: mix('capsule', mixVariants(3, (_v, k) => [
    note(0, 'E5', { vol: 0.35, attack: 0.002, release: 0.25, shape: 'tri' }),
    note(120, ['B5', 'A5', 'E6'][k] as string, { vol: 0.38, attack: 0.002, release: 0.45, shape: 'tri' }),
    at(120, { vol: 0.1, freq: 3000, attack: 0.03, sustain: 0.1, release: 0.25, shape: 'tri', tremolo: 0.5, repeat: 0.02 }),
  ]), MUSICAL),
  rarity_epic: mix('capsule', mixVariants(3, (_v, k) => [
    note(0, 'C5', { vol: 0.32, attack: 0.002, release: 0.4, shape: 'tri' }),
    note(90, 'E5', { vol: 0.32, attack: 0.002, release: 0.4, shape: 'tri' }),
    note(180, 'G5', { vol: 0.32, attack: 0.002, release: 0.5, shape: 'tri' }),
    note(270, ['C6', 'B5', 'E6'][k] as string, { vol: 0.35, attack: 0.002, release: 0.7, shape: 'tri' }),
    at(180, { vol: 0.12, freq: 2600, attack: 0.08, sustain: 0.3, release: 0.4, shape: 'tri', slide: 2, tremolo: 0.5, repeat: 0.025 }),
  ]), MUSICAL),
  rarity_legendary: mix('capsule', mixVariants(3, (_v, k) => {
    const lead: Zz = { attack: 0.01, release: 0.1, shape: 'square', curve: 1, lowpass: 4400 };
    const pad: Zz = { attack: 0.3, sustain: 0.8, release: 0.8, shape: 'saw', lowpass: 2400 };
    return [
      note(0, 'G4', { ...lead, vol: 0.3, sustain: 0.06 }),
      note(120, 'C5', { ...lead, vol: 0.3, sustain: 0.06 }),
      note(240, 'E5', { ...lead, vol: 0.32, sustain: 0.06 }),
      note(360, 'G5', { ...lead, vol: 0.32, sustain: 0.06 }),
      note(480, ['C6', 'G5', 'E6'][k] as string, { ...lead, vol: 0.34, sustain: 0.7, release: 0.4 }),
      note(480, 'C4', { ...pad, vol: 0.18 }),
      note(480, 'G4', { ...pad, vol: 0.15 }),
      at(480, { vol: 0.7, freq: 110, attack: 0.005, release: 1.0, slide: -0.7 }),
    ];
  }), { ...MUSICAL, maxVoices: 1 }),
  walkout_bass: mix('capsule', mixVariants(3, (v) => [
    at(0, { vol: 0.9, freq: 95 * (1 + 0.03 * v), attack: 0.005, release: 1.4, slide: -0.25 }),
    noiseBurst(0, { vol: 0.4, freq: 200, release: 0.4, lowpass: 1400 }),
  ]), { maxVoices: 1 }),
  copy_tick: fx('capsule', variants(3, (v) => ({ vol: 0.25, freq: 1900 * (1 + 0.03 * v), attack: 0.001, release: 0.035 })), CALLER_PITCHED),
  upgrade_ready: mix('capsule', mixVariants(3, (_v, k) => [
    note(0, 'C6', { vol: 0.3, attack: 0.002, release: 0.2, shape: 'tri' }),
    note(90, 'E6', { vol: 0.3, attack: 0.002, release: 0.2, shape: 'tri' }),
    note(180, ['G6', 'C7', 'E7'][k] as string, { vol: 0.32, attack: 0.002, release: 0.4, shape: 'tri' }),
  ]), MUSICAL),
  upgrade_slam: mix('capsule', mixVariants(3, (v) => [
    thump(0, 85 * (1 + 0.05 * v), 0.8, 0.3, -0.9),
    at(0, { vol: 0.3, freq: 880, attack: 0.001, release: 0.6, shape: 'square', curve: 0.5, lowpass: 6000 }),
    noiseBurst(0, { vol: 0.3, freq: 500, decay: 0.02, sustainVol: 0.4, release: 0.15, lowpass: 3000 }),
  ])),
  level_up: mix('capsule', mixVariants(3, (_v, k) => [
    ...['C5', 'E5', 'G5', 'C6'].map((n, i) => note(i * 70, n, { vol: 0.3, attack: 0.002, sustain: 0.03, release: 0.18, shape: 'square', curve: 1, lowpass: 5000 })),
    note(280, ['E6', 'G6', 'C7'][k] as string, { vol: 0.32, attack: 0.002, sustain: 0.1, release: 0.5, shape: 'tri' }),
    at(280, { vol: 0.12, freq: 3000, attack: 0.05, sustain: 0.2, release: 0.3, shape: 'tri', slide: 3, tremolo: 0.5, repeat: 0.025 }),
  ]), { ...MUSICAL, maxVoices: 1 }),
  // The reel calls this per tile with a falling pitch (A10.1) and already spaces its ticks 40 ms apart.
  reel_tick: fx('capsule', variants(3, (v) => ({ vol: 0.25, freq: 1500 * (1 + 0.03 * v), attack: 0.001, release: 0.016, shape: 'square', lowpass: 10000 })), CALLER_PITCHED),

  // Forts (DESIGN A16.14.8, A13): placing, the scaffold's hammering, completion, hits by material, the
  // crumble stages, the collapse and the quiet decay, the traps, the camp's horn and the levy's step-out.
  // Every age shares them (a wall is timber, stone, metal or energy whatever the age); no fort is up before
  // 0:20, so they pre-render with the later match moments (the `match` group); the denial is a UI sound.
  fort_place: mix('match', mixVariants(3, (v) => [
    thump(0, 70 * (1 + 0.05 * v), 0.7, 0.22, -0.6),
    noiseBurst(0, { vol: 0.45, freq: 260, decay: 0.02, sustainVol: 0.3, release: 0.18, lowpass: 1600 }),
    noiseBurst(60, { vol: 0.2, freq: 900, release: 0.3, lowpass: 2600, tremolo: 0.3, repeat: 0.05 }),
  ]), { maxVoices: 2 }),
  fort_build: mix('match', mixVariants(3, (v) => [
    ...[0, 170, 340, 560].map((ms, k) => at(ms, { vol: 0.35, freq: 380 * (1 + 0.04 * v + 0.03 * k), attack: 0.001, release: 0.06, shape: 'tri', noise: 0.4, lowpass: 3200 })),
    noiseBurst(620, { vol: 0.18, freq: 1200, release: 0.25, tremolo: 0.6, repeat: 0.03, lowpass: 3000 }),
  ]), { maxVoices: 2, gapMs: 200 }),
  fort_complete: mix('match', mixVariants(3, (v) => [
    thump(0, 90, 0.55, 0.2),
    at(40, { vol: 0.35, freq: 523 * (1 + 0.01 * v), attack: 0.002, sustain: 0.04, release: 0.25, shape: 'tri', jump: 262, jumpTime: 0.07 }),
    noiseBurst(0, { vol: 0.3, freq: 400, release: 0.2, lowpass: 2200 }),
  ]), MUSICAL),
  fort_hit_wood: fx('match', variants(4, (v) => ({ vol: 0.45, freq: 210 * (1 + 0.07 * v), attack: 0.001, release: 0.1, shape: 'tri', noise: 0.8, slide: -1.2, lowpass: 2600 }))),
  fort_hit_stone: fx('match', variants(4, (v) => ({ vol: 0.45, freq: 150 * (1 + 0.07 * v), attack: 0.001, release: 0.12, shape: 'noise', slide: -0.8, lowpass: 2200 }))),
  fort_hit_metal: mix('match', mixVariants(4, (v) => [
    at(0, { vol: 0.35, freq: 820 * (1 + 0.06 * v), attack: 0.001, sustain: 0.02, release: 0.22, shape: 'sin', mod: 3.2, lowpass: 7000 }),
    noiseBurst(0, { vol: 0.3, freq: 1500, release: 0.05, highpass: 900 }),
  ])),
  fort_hit_energy: fx('match', variants(4, (v) => ({ vol: 0.35, freq: 640 * (1 + 0.06 * v), attack: 0.002, sustain: 0.03, release: 0.14, shape: 'square', curve: 0.6, slide: -6, lowpass: 6000 }))),
  fort_crumble: mix('match', mixVariants(3, (v) => [
    thump(0, 62 * (1 + 0.05 * v), 0.6, 0.3),
    noiseBurst(0, { vol: 0.5, freq: 300, decay: 0.05, sustainVol: 0.35, release: 0.45, lowpass: 1800, tremolo: 0.4, repeat: 0.06 }),
  ]), { maxVoices: 2 }),
  fort_collapse: mix('match', mixVariants(3, (v) => [
    thump(0, 48 * (1 + 0.04 * v), 0.8, 0.5),
    noiseBurst(0, { vol: 0.6, freq: 240, decay: 0.08, sustainVol: 0.4, release: 0.9, lowpass: 1600, tremolo: 0.5, repeat: 0.08 }),
    noiseBurst(250, { vol: 0.3, freq: 700, release: 0.6, lowpass: 2600, tremolo: 0.6, repeat: 0.05 }),
  ]), { maxVoices: 2 }),
  fort_decay: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.3, freq: 420 * (1 + 0.05 * v), attack: 0.05, sustain: 0.2, release: 0.5, lowpass: 1500, tremolo: 0.5, repeat: 0.07 }),
    thump(120, 70, 0.3, 0.25),
  ]), { maxVoices: 2 }),
  trap_arm: fx('match', variants(3, (v) => ({ vol: 0.3, freq: 900 * (1 + 0.05 * v), attack: 0.002, sustain: 0.01, release: 0.05, shape: 'tri', jump: -300, jumpTime: 0.03, repeat: 0.06 }))),
  trap_snap: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.55, freq: 1400 * (1 + 0.05 * v), release: 0.06, highpass: 600 }),
    at(10, { vol: 0.4, freq: 180 * (1 + 0.06 * v), attack: 0.001, release: 0.12, shape: 'tri', slide: -2, noise: 0.5 }),
  ])),
  trap_blast: mix('match', mixVariants(3, (v) => [
    thump(0, 55 * (1 + 0.05 * v), 0.8, 0.4),
    noiseBurst(0, { vol: 0.7, freq: 200, decay: 0.05, sustainVol: 0.5, release: 0.6, lowpass: 2000 }),
  ]), { maxVoices: 2 }),
  camp_horn: fx('match', variants(3, (v) => ({ vol: 0.3, freq: 196 * (1 + 0.01 * v), attack: 0.06, sustain: 0.28, release: 0.25, shape: 'saw', curve: 0.9, slide: 0.05, lowpass: 1600, tremolo: 0.06, repeat: 0.18 })), { ...MUSICAL, maxVoices: 1, gapMs: 3000 }),
  levy_spawn: mix('match', mixVariants(3, (v) => [
    noiseBurst(0, { vol: 0.28, freq: 500 * (1 + 0.05 * v), release: 0.09, lowpass: 2400 }),
    at(30, { vol: 0.25, freq: 260 * (1 + 0.08 * v), attack: 0.003, release: 0.08, shape: 'tri', slide: 3 }),
  ])),
  fort_denied: mix('ui', mixVariants(3, (v) => [
    thump(0, 110 * (1 + 0.03 * v), 0.45, 0.1),
    at(0, { vol: 0.3, freq: 150 * (1 + 0.04 * v), attack: 0.004, sustain: 0.08, release: 0.08, shape: 'square', curve: 0.7, slide: -0.3, lowpass: 2400 }),
  ])),
} satisfies Record<SoundId, SoundDef>;

/** A ZzFX fallback that borrows another sound's variants in its own group and mix settings. */
function like(base: SoundDef, group: SoundGroup, extra: Extra = {}): SoundDef {
  const { gainDb: _g, maxVoices: _m, gapMs: _gap, pitchVarBp: _p, volVarDb: _v, ...src } = base;
  return { ...src, bus: busOf(group), group, ...extra } as SoundDef;
}

/**
 * The MVP pass sounds (audio audit 2026-10-01; designs in `tools/audio/sfx/sounds_mvp.py`). The recorded
 * sheets carry them; the ZzFX fallback borrows the nearest older sound until a sheet decodes.
 */
const B = BASE_SOUNDS;
const MVP_SOUNDS: Record<SoundId, SoundDef> = {
  // UI (ui-plan 5.4, the War Path map): these replace the app's UI_SOUND_FALLBACK stand-ins. The UI group
  // pre-renders when there are no files, so the fallbacks borrow the shortest UI sound (B16 boot budget: the
  // recorded `ui` sheet is what plays; it decodes right after unlock).
  ui_sheet: like(B.ui_hover, 'ui'),
  ui_pop: like(B.ui_hover, 'ui'),
  ui_whoosh: like(B.ui_hover, 'ui'),
  ui_stamp: like(B.ui_hover, 'ui', { maxVoices: 2 }),
  card_lift: like(B.ui_hover, 'ui'),
  card_place: like(B.ui_hover, 'ui'),
  // the caller raises the pitch per star (MR-41)
  star_stamp: like(B.ui_hover, 'ui', CALLER_PITCHED),
  path_draw: like(B.ui_hover, 'ui', { maxVoices: 1, gapMs: 200 }),
  node_drop: like(B.ui_hover, 'ui'),
  region_open: like(B.ui_hover, 'ui', { ...MUSICAL, maxVoices: 1, gapMs: 1000 }),
  ui_unlock: like(B.ui_hover, 'ui', { ...MUSICAL, maxVoices: 1, gapMs: 400 }),
  reward_fly: like(B.ui_hover, 'ui'),
  council_open: like(B.ui_hover, 'ui', { maxVoices: 1, gapMs: 150 }),
  council_pick: like(B.ui_hover, 'ui', { maxVoices: 1, gapMs: 150 }),
  vs_slam: like(B.ui_hover, 'ui', { maxVoices: 1, gapMs: 500 }),
  sundial_claim: like(B.ui_hover, 'ui', { ...MUSICAL, maxVoices: 1, gapMs: 300 }),
  glyph_light: like(B.ui_hover, 'ui', { ...MUSICAL, maxVoices: 1, gapMs: 300 }),
  // Battle cues: the `match` sheet loads right after unlock, with the battle sheet
  stance_charge: like(B.overdrive_horn, 'match', { maxVoices: 1, gapMs: 300 }),
  stance_hold: like(B.shield_up, 'match', { maxVoices: 1, gapMs: 300 }),
  stance_fallback: like(B.ui_deny, 'match', { maxVoices: 1, gapMs: 300 }),
  research_done: like(B.turret_upgrade, 'match', { ...MUSICAL, maxVoices: 2 }),
  alert_heavy: like(B.spawn_heavy, 'match', { maxVoices: 1, gapMs: 4000 }),
  hit_armor_crack: like(B.hit_heavy, 'match', { maxVoices: 2, gapMs: 80 }),
  brace_clank: like(B.shield_up, 'match', { maxVoices: 2, gapMs: 150 }),
  thunder: like(B.explosion_l, 'match', { maxVoices: 2, gapMs: 600 }),
  // Last Base Standing: the game raises the horn's pitch per step, so the steps climb
  escalate_horn: like(B.siege_bell, 'match', { ...CALLER_PITCHED, maxVoices: 1, gapMs: 1000 }),
  crumble_pulse: like(B.base_crumble, 'match', { maxVoices: 2, gapMs: 600 }),
  // Energy forts (Future, Cosmic)
  fort_build_energy: like(B.fort_build, 'future', { maxVoices: 2, gapMs: 200 }),
  camp_warp: like(B.camp_horn, 'future', { ...MUSICAL, maxVoices: 1, gapMs: 3000 }),
  levy_warp: like(B.levy_spawn, 'future'),
  trap_blast_energy: like(B.trap_blast, 'future', { maxVoices: 2 }),
};

export const sounds: Readonly<Record<SoundId, SoundDef>> = { ...BASE_SOUNDS, ...MVP_SOUNDS };

/** Every sound id in the manifest, in declaration order. */
export const SOUND_IDS: readonly SoundId[] = Object.keys(sounds);
