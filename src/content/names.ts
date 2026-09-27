/**
 * Name tables (DESIGN A6.1 auto profile names, A7.4 procedural AI Commanders).
 *
 * AI Commander names always carry the prefix "AI · " (A7.1, A7.4), for example "AI · Brakka Stonejaw".
 * Names are proper nouns built from syllables and are not translated; the prefix stays the same in
 * every language because the AI label must never be lost.
 */
import { randInt, type Sfc32State } from '@/core/rng';
import type { NameTables } from './types';

export const names: NameTables = {
  aiPrefix: 'AI · ',
  commanderFirst: {
    start: ['Brak', 'Grun', 'Tor', 'Vel', 'Mar', 'Kel', 'Dra', 'Zor', 'Hal', 'Rok', 'Sil', 'Fen', 'Ul', 'Bor', 'Nar', 'Tess', 'Kir', 'Osk', 'Yar', 'Gil'],
    end: ['ka', 'da', 'gar', 'ric', 'na', 'mir', 'ek', 'ra', 'tha', 'dor', 'is', 'en', 'o', 'us', 'wyn'],
  },
  commanderLast: {
    start: ['Stone', 'Iron', 'Ash', 'Frost', 'Brass', 'Storm', 'Ember', 'Oak', 'Flint', 'Steel', 'Thunder', 'Copper', 'Bone', 'Mud', 'Gear'],
    end: ['jaw', 'fist', 'beard', 'horn', 'hammer', 'shield', 'fang', 'hide', 'heart', 'brow', 'crest', 'song', 'wall', 'tooth', 'spark'],
  },
  // A6.1: "Chief-4821"
  player: { prefixes: ['Chief', 'Warlord', 'Captain', 'Marshal', 'Elder', 'Scout'], digits: 4 },
};

function draw(state: Sfc32State, items: readonly string[]): string {
  return items[randInt(state, items.length)] ?? '';
}

/** A procedural AI Commander name with the AI prefix, drawn from `state` (advances it by 4 draws). */
export function commanderName(state: Sfc32State, t: NameTables = names): string {
  const first = draw(state, t.commanderFirst.start) + draw(state, t.commanderFirst.end);
  const last = draw(state, t.commanderLast.start) + draw(state, t.commanderLast.end);
  return `${t.aiPrefix}${first} ${last}`;
}

/** An auto-generated profile name such as "Chief-4821" (A6.1), drawn from `state` (advances it by 2 draws). */
export function playerName(state: Sfc32State, t: NameTables = names): string {
  const prefix = draw(state, t.player.prefixes);
  let limit = 1;
  for (let i = 0; i < t.player.digits; i += 1) limit *= 10;
  const n = randInt(state, limit - limit / 10) + limit / 10;
  return `${prefix}-${n}`;
}
