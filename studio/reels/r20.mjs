// R20 edit: "1 MAMMOTH MATRIARCH vs 2 TUSKBACKS" (narrated balance test, spoken question from frame 1).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r20',
    file: 'r20-1-mammoth-matriarch-vs-2-tuskbacks',
    heroName: 'Mammoth Matriarch',
    heroSize: 96,
    hordeLabel: '2 Tuskbacks',
    hordeWord: 'TUSKBACKS',
    ageName: 'Stone Age',
    music: 'music.stone',
    accentFill: 'orange',
    winLine: 'The mammoth wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
    narration: new URL('../work/r20/narration.wav', import.meta.url).pathname,
  });
}
