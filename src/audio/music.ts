/**
 * Music manifest (DESIGN B7, A13 Music, A14.3): every `MusicCueId` → a sequenced score or, later, a
 * composed file with optional layer stems.
 *
 * `role` drives the engine's state between cues: `battle` cues keep the adaptive layers and the
 * evolve key changes when the next cue is another battle cue (an evolve) or a stinger; switching to a
 * `menu` cue, back into battle from anything else, or after `stop()`, starts from the home key with
 * the layers off.
 */
import type { MusicCueId, MusicLayer } from '@/contracts';
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

export type MusicSource =
  | { kind: 'seq'; score: Score }
  /** A composed file (looped unless it is a stinger), with optional stems per adaptive layer. */
  | { kind: 'file'; src: string; layers?: Partial<Record<MusicLayer, string>> };

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
