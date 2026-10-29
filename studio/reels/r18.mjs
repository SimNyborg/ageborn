// R18 edit: "1 ELK CHIEFTAIN vs 5 BONKERS" (narrated balance test; owner note 2026-10-26: every Reel narrated).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r18',
    file: 'r18-1-elk-chieftain-vs-5-bonkers',
    heroName: 'Elk Chieftain',
    heroSize: 112,
    hordeLabel: '5 Bonkers',
    hordeWord: 'BONKERS',
    ageName: 'Stone Age',
    music: 'music.stone',
    accentFill: 'orange',
    winLine: 'The elk wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
    narration: new URL('../work/r18/narration.wav', import.meta.url).pathname,
  });
}
