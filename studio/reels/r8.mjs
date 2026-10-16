// R8 edit: "1 URSA PALADIN vs 8 FOOTMEN" (P1 Age Clash, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r8',
    file: 'r8-1-ursa-paladin-vs-8-footmen',
    heroName: 'Ursa Paladin',
    hordeLabel: '8 Footmen',
    hordeWord: 'FOOTMEN',
    ageName: 'Medieval Age',
    music: 'music.medieval',
    accentFill: 'orange',
    winLine: 'The bear wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
