// R11 edit: "1 LAND DREADNOUGHT vs 6 RIVETERS" (P1 Age Clash, short hook-first format).
import { duelEdit } from './duel.mjs';

export async function edit() {
  return duelEdit({
    id: 'r11',
    file: 'r11-1-land-dreadnought-vs-6-riveters',
    heroName: 'Land Dreadnought',
    heroSize: 100, // the long name must fit the frame
    hordeLabel: '6 Riveters',
    hordeWord: 'RIVETERS',
    ageName: 'Industrial Age',
    music: 'music.industrial',
    accentFill: 'orange',
    winLine: 'The landship wins',
    tagline: 'One lane. Eight ages. Pick your legend.',
  });
}
