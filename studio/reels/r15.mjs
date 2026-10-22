// R15 edit: "1 BRONZE COLOSSUS vs 13 HOPLITES" (P1 Age Clash, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r15',
    file: 'r15-1-bronze-colossus-vs-13-hoplites',
    heroName: 'Bronze Colossus',
    heroSize: 104,
    hordeLabel: '13 Hoplites',
    hordeWord: 'HOPLITES',
    ageName: 'Bronze Age',
    music: 'music.bronze',
    accentFill: 'orange',
    winLine: 'The colossus wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
