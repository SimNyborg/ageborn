// R7 edit: "1 HYDRA vs 5 HOPLITES" (P1 Age Clash, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r7',
    file: 'r7-1-hydra-vs-5-hoplites',
    heroName: 'Hydra',
    hordeLabel: '5 Hoplites',
    hordeWord: 'HOPLITES',
    ageName: 'Bronze Age',
    music: 'music.bronze',
    accentFill: 'gold',
    winLine: 'The Hydra wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
