// R19 edit: "1 ARMOURED TRAIN vs 6 RIVETERS" (narrated balance test; owner note 2026-10-26: every Reel narrated).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r19',
    file: 'r19-1-armoured-train-vs-6-riveters',
    heroName: 'Armoured Train',
    heroSize: 104,
    hordeLabel: '6 Riveters',
    hordeWord: 'RIVETERS',
    ageName: 'Industrial Age',
    music: 'music.industrial',
    accentFill: 'orange',
    winLine: 'The train wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
    narration: new URL('../work/r19/narration.wav', import.meta.url).pathname,
  });
}
