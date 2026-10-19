// R13 edit: "1 BEHEMOTH TANK vs 8 RIFLEMEN" (P1 Age Clash, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r13',
    file: 'r13-1-behemoth-tank-vs-8-riflemen',
    heroName: 'Behemoth Tank',
    heroSize: 112,
    hordeLabel: '8 Riflemen',
    hordeWord: 'RIFLEMEN',
    ageName: 'Modern Age',
    music: 'music.modern',
    accentFill: 'orange',
    winLine: 'The tank wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
