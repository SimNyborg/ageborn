/**
 * Victory moves (owner request 2026-10-07; DESIGN A9 #7, ui-plan MR-129): the short cartoon moment at
 * the top of the Result. On a win your General triumphs over the opponent (a giant mallet bonk, a pie in
 * the face, tar and feathers, a cannon launch over the horizon, a dust-cloud scuffle); on a loss you take
 * a gentle pie or a little rain cloud; on a draw you both shrug at a stand-off.
 *
 * This file is data plus the deterministic pick, small enough for the Result's first render. The
 * choreography and the art load lazily (`./scenes.ts`, `./art.ts`), keyed by the move id.
 *
 * Collectibles later: a move is a stable id with a name, a rarity-ready `starter` flag and the props it
 * draws. A future version can make some moves earned (a cosmetic collection item `victoryMove.<id>`)
 * and pass the owned ids to {@link pickMove}; nothing here has to change shape.
 */
import { fnv1a32 } from '@/core';
import { signal } from '@preact/signals';

export type MomentKind = 'win' | 'loss' | 'draw';

/** The props the art module draws (also what a future collection card would preview). */
export type MomentPropId =
  | 'mallet'
  | 'pie'
  | 'tarBucket'
  | 'pillow'
  | 'feathers'
  | 'cannon'
  | 'match'
  | 'dustCloud'
  | 'whiteFlag'
  | 'rainCloud'
  | 'tumbleweed';

export interface VictoryMoveDef {
  /** Stable id: the save remembers the last one played (`ui-moment.<id>`), a collection would key by it. */
  readonly id: string;
  readonly kind: MomentKind;
  /** i18n key of the move's name. */
  readonly nameKey: string;
  /** i18n key of the line a screen reader hears ("You bonk {foe} with a giant mallet"). */
  readonly lineKey: string;
  /** Every player has it; a later collectible move would be `false` and earned. */
  readonly starter: boolean;
  /** Relative chance in the seeded pick (a non-negative integer). */
  readonly weight: number;
  readonly props: readonly MomentPropId[];
  /** The sound ids it plays (an integrity test checks each one exists in the audio manifest). */
  readonly sounds: readonly string[];
  /** About how long the full-motion version runs (ms, hit-stops included). */
  readonly durationMs: number;
}

const move = (id: string, kind: MomentKind, props: MomentPropId[], sounds: string[], durationMs: number): VictoryMoveDef => ({
  id,
  kind,
  nameKey: `moment.move.${id}`,
  lineKey: `moment.line.${id}`,
  starter: true,
  weight: 1,
  props,
  sounds,
  durationMs,
});

/** Every move, in the order a collection would list them. */
export const VICTORY_MOVES: readonly VictoryMoveDef[] = [
  move('mallet', 'win', ['mallet'], ['ui_pop', 'moment_swish', 'moment_bonk', 'moment_dizzy', 'moment_tada'], 2900),
  move('pie', 'win', ['pie'], ['ui_pop', 'moment_swish', 'moment_splat', 'moment_tada'], 2800),
  move('tarFeathers', 'win', ['tarBucket', 'pillow', 'feathers'], ['ui_pop', 'moment_tar', 'moment_swish', 'moment_poof', 'moment_cluck', 'moment_tada'], 3300),
  move('launch', 'win', ['cannon', 'match'], ['ui_pop', 'moment_clank', 'moment_fuse', 'moment_boom', 'moment_whistle', 'moment_twinkle', 'moment_tada'], 3300),
  move('scuffle', 'win', ['dustCloud', 'whiteFlag'], ['ui_pop', 'moment_scuffle', 'moment_poof', 'moment_dizzy', 'moment_tada'], 3300),
  move('rainCloud', 'loss', ['rainCloud'], ['ui_pop', 'moment_wahwah'], 2300),
  move('piedYou', 'loss', ['pie'], ['ui_pop', 'moment_swish', 'moment_splat'], 2400),
  move('standoff', 'draw', ['tumbleweed'], ['ui_pop', 'moment_wind', 'moment_shrug'], 2300),
];

export function moveById(id: string): VictoryMoveDef | undefined {
  return VICTORY_MOVES.find((m) => m.id === id);
}

/**
 * The move a match plays: picked from the match seed (so the Result of a match always shows the same
 * one), never the previous match's move while the pool has another, from the moves the player has
 * (every starter move; a later collection passes `owned`). Null when the pool is empty.
 */
export function pickMove(kind: MomentKind, seed: number, previous: string | null, owned?: readonly string[]): VictoryMoveDef | null {
  const pool = VICTORY_MOVES.filter((m) => m.kind === kind && m.weight > 0 && (owned ? owned.includes(m.id) : m.starter));
  if (pool.length === 0) return null;
  const fresh = pool.length > 1 ? pool.filter((m) => m.id !== previous) : pool;
  const total = fresh.reduce((n, m) => n + m.weight, 0);
  let r = fnv1a32(`moment|${kind}|${seed >>> 0}`) % total;
  for (const m of fresh) {
    if (r < m.weight) return m;
    r -= m.weight;
  }
  return fresh[fresh.length - 1]!;
}

/** The UI flag that remembers the last move played (`SaveDoc.flags`, keys start with `ui-`). */
export const MOMENT_FLAG = 'ui-moment.';

/** The previous match's move from the save flags (null on a first match). */
export function lastMove(flags: Readonly<Record<string, boolean>>): string | null {
  for (const m of VICTORY_MOVES) if (flags[`${MOMENT_FLAG}${m.id}`]) return m.id;
  return null;
}

/** The flag patch that records `next` as the last move (and clears every other). */
export function momentFlags(next: string): Record<string, boolean> {
  const patch: Record<string, boolean> = {};
  for (const m of VICTORY_MOVES) patch[`${MOMENT_FLAG}${m.id}`] = m.id === next;
  return patch;
}

/**
 * Dev pages only (`?dev=1#screens/result-moment-*`): forces a move on the Result and can hold its last
 * frame for screenshots. Null in the game.
 */
export const momentPreview = signal<{ move: string; hold?: boolean } | null>(null);
