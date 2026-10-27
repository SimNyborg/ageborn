// R17 edit: "1 DRONE CARRIER vs 4 PULSE TROOPERS" (narrated balance test; owner note 2026-10-26: every Reel narrated).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r17',
    file: 'r17-1-drone-carrier-vs-4-pulse-troopers',
    heroName: 'Drone Carrier',
    heroSize: 112,
    hordeLabel: '4 Pulse Troopers',
    hordeWord: 'TROOPERS',
    ageName: 'Future Age',
    music: 'music.future',
    accentFill: 'orange',
    winLine: 'The carrier wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
    narration: new URL('../work/r17/narration.wav', import.meta.url).pathname,
  });
}
