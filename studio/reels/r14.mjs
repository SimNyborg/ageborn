// R14 edit: "1 GRAND MARSHAL vs 8 HIGHLANDERS" (P1 Age Clash, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r14',
    file: 'r14-1-grand-marshal-vs-8-highlanders',
    heroName: 'Grand Marshal',
    heroSize: 112,
    hordeLabel: '8 Highlanders',
    hordeWord: 'HIGHLANDERS',
    ageName: 'Gunpowder Age',
    music: 'music.gunpowder',
    accentFill: 'orange',
    winLine: 'The marshal wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
