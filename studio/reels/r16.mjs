// R16 edit: "1 LINDWORM vs 5 CROSSBOWMEN" (balance test, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r16',
    file: 'r16-1-lindworm-vs-5-crossbowmen',
    heroName: 'Lindworm',
    heroSize: 128,
    hordeLabel: '5 Crossbowmen',
    hordeWord: 'CROSSBOWMEN',
    ageName: 'Medieval Age',
    music: 'music.medieval',
    accentFill: 'orange',
    winLine: 'The dragon wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
