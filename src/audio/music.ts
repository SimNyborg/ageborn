/**
 * Music manifests (DESIGN B7, A13 Music, A14.3): every `MusicCueId` → a composed file with layer stems
 * (`fileMusic`, what the game plays) or a sequenced score (`music`, the synthesized fallback that plays
 * while a file loads or where a browser cannot decode it).
 *
 * `role` drives the engine's state between cues: `battle` cues keep the adaptive layers and the
 * evolve key changes when the next cue is another battle cue (an evolve) or a stinger; switching to a
 * `menu` cue, back into battle from anything else, or after `stop()`, starts from the home key with
 * the layers off.
 */
import type { MusicCueId, MusicLayer } from '@/contracts';
import { MUSIC_FILES } from './files';
import {
  capsuleArrangement,
  futureArrangement,
  gunpowderArrangement,
  medievalArrangement,
  menuArrangement,
  modernArrangement,
  stoneArrangement,
} from './scores/arrangements';
import { defeatStinger, victoryStinger } from './scores/stingers';
import type { Score } from './sequencer';

export type MusicRole = 'battle' | 'menu' | 'stinger';

/** A looping stem file for an adaptive layer. */
export interface MusicStem {
  src: string;
  /** Loop window in seconds (default: the whole file). */
  loopStart?: number;
  loopLength?: number;
}

export type MusicSource =
  | { kind: 'seq'; score: Score }
  /**
   * A composed file (looped unless it is a stinger), with optional stems per adaptive layer. The
   * loop window (`loopStart`, `loopLength`) defaults to the whole file; `fallback` plays while the
   * file loads or if it cannot be decoded; `prefetch` names cues to load in the background while this
   * one plays (the next age, the stingers).
   */
  | {
      kind: 'file';
      src: string;
      loopStart?: number;
      loopLength?: number;
      layers?: Partial<Record<MusicLayer, string | MusicStem>>;
      fallback?: Score;
      prefetch?: readonly MusicCueId[];
    };

export type MusicDef = MusicSource & {
  role: MusicRole;
  /** Level trim in dB (default 0). */
  gainDb?: number;
};

/** Level trims (`gainDb`) even out the arrangements, measured through the mixer with every layer up. */
export const music: Readonly<Record<MusicCueId, MusicDef>> = {
  'music.menu': { kind: 'seq', score: menuArrangement, role: 'menu', gainDb: 2 },
  'music.capsule': { kind: 'seq', score: capsuleArrangement, role: 'menu', gainDb: 3.5 },
  'music.stone': { kind: 'seq', score: stoneArrangement, role: 'battle', gainDb: -2 },
  'music.medieval': { kind: 'seq', score: medievalArrangement, role: 'battle', gainDb: 4 },
  'music.gunpowder': { kind: 'seq', score: gunpowderArrangement, role: 'battle' },
  'music.modern': { kind: 'seq', score: modernArrangement, role: 'battle' },
  'music.future': { kind: 'seq', score: futureArrangement, role: 'battle' },
  'stinger.victory': { kind: 'seq', score: victoryStinger, role: 'stinger' },
  'stinger.defeat': { kind: 'seq', score: defeatStinger, role: 'stinger', gainDb: 2 },
};

export const MUSIC_CUES: readonly MusicCueId[] = Object.keys(music);

/** Battle cues in age order (an evolve moves one step along). */
export const AGE_CUES: readonly MusicCueId[] = ['music.stone', 'music.medieval', 'music.gunpowder', 'music.modern', 'music.future'];

/**
 * Level trims for the composed files (mastered to about -16 LUFS). Battle music sits a little under
 * the effects; the menu, with nothing to compete with, a little higher.
 */
export const FILE_GAIN_DB: Readonly<Record<MusicRole, number>> = { battle: -3, menu: -1.5, stinger: -2 };

function stem(id: string): MusicStem | undefined {
  const f = Object.hasOwn(MUSIC_FILES, id) ? MUSIC_FILES[id] : undefined;
  if (!f) return undefined;
  return { src: f.src, ...(f.loopStart !== undefined ? { loopStart: f.loopStart } : {}), ...(f.loopLength !== undefined ? { loopLength: f.loopLength } : {}) };
}

function prefetchFor(cue: MusicCueId): MusicCueId[] {
  if (cue === 'music.menu') return ['music.stone'];
  const k = AGE_CUES.indexOf(cue);
  if (k < 0) return [];
  const next = AGE_CUES[k + 1];
  return [...(next ? [next] : []), 'stinger.victory', 'stinger.defeat'];
}

/** Builds the file manifest from the generated asset list; cues without a file keep their score. */
export function buildFileMusic(seq: Readonly<Record<MusicCueId, MusicDef>> = music): Record<MusicCueId, MusicDef> {
  const out: Record<MusicCueId, MusicDef> = {};
  for (const [cue, def] of Object.entries(seq)) {
    const f = Object.hasOwn(MUSIC_FILES, cue) ? MUSIC_FILES[cue] : undefined;
    if (!f) {
      out[cue] = def;
      continue;
    }
    const age = AGE_CUES.includes(cue) ? cue.slice('music.'.length) : null;
    const layers: Partial<Record<MusicLayer, MusicStem>> = {};
    if (age) {
      const intensity = stem(`layer.intensity.${age}`);
      const overdrive = stem('layer.overdrive');
      const siege = stem('layer.siege');
      if (intensity) layers.intensity = intensity;
      if (overdrive) layers.overdrive = overdrive;
      if (siege) layers.siege = siege;
    }
    out[cue] = {
      kind: 'file',
      src: f.src,
      ...(f.loopStart !== undefined ? { loopStart: f.loopStart } : {}),
      ...(f.loopLength !== undefined ? { loopLength: f.loopLength } : {}),
      ...(Object.keys(layers).length > 0 ? { layers } : {}),
      ...(def.kind === 'seq' ? { fallback: def.score } : {}),
      prefetch: prefetchFor(cue),
      role: def.role,
      gainDb: FILE_GAIN_DB[def.role],
    };
  }
  return out;
}

/** What the game plays: the composed files, each with its sequenced score as the fallback. */
export const fileMusic: Readonly<Record<MusicCueId, MusicDef>> = buildFileMusic();

/** Semitones added by each own evolve, in turn (A13 "Key changes": +2, +2, +1, +1 = +6 at Future). */
export const EVOLVE_TRANSPOSE_STEPS: readonly number[] = [2, 2, 1, 1];

/** Total transposition after `evolves` own evolves (0 in Stone, 6 in Future). */
export function evolveTranspose(evolves: number): number {
  let t = 0;
  for (let k = 0; k < evolves; k++) t += EVOLVE_TRANSPOSE_STEPS[Math.min(k, EVOLVE_TRANSPOSE_STEPS.length - 1)] ?? 0;
  return t;
}

/** Whether moving from `prev` to `next` continues the same battle (layers and key carry over). */
export function continuesBattle(prev: MusicRole | null, next: MusicRole): boolean {
  return prev === 'battle' && (next === 'battle' || next === 'stinger');
}
