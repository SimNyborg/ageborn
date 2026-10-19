// R12 edit: "1 CHRONO TITAN vs 8 PULSE TROOPERS" (P1 Age Clash, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r12',
    file: 'r12-1-chrono-titan-vs-8-pulse-troopers',
    heroName: 'Chrono Titan',
    heroSize: 104,
    hordeLabel: '8 Pulse Troopers',
    hordeWord: 'TROOPERS',
    ageName: 'Future Age',
    music: 'music.future',
    accentFill: 'orange',
    winLine: 'The titan wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
