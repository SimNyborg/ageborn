/**
 * Feat medals (AUDIT #16): an embossed medal per hidden feat (A15.10). A locked medal is dull bronze
 * with a keyhole; a found one is gold with its own engraved emblem and a ribbon. Drawn to the art
 * sheet: shadow band on the lower edge, bevel highlight on the top edge, colour-matched outline.
 */

/** Each feat's emblem, in a 40 × 40 box centred on (20, 20). */
const EMBLEM: Record<string, string> = {
  caveman_diplomacy: 'M12 30L24 12C26 9 30 10 30 13C30 15 28 16 27 18L15 33Z',
  arrows_into_tomorrow: 'M9 31L27 13M27 13L22 13M27 13L27 18M9 31L13 31M9 31L9 27M14 26L18 30M12 24L16 28',
  stubborn: 'M10 30C9 22 13 15 20 14C27 13 32 19 31 26C30 31 26 32 20 32C15 32 11 32 10 30Z',
  no_walls: 'M12 32V16L16 18V13H20V18L24 16V20L28 14V32ZM18 32V26H22V32',
  photo_finish: 'M20 33A12 12 0 1 1 20 9A12 12 0 1 1 20 33ZM20 13V21L25 24M17 6H23',
  horn_of_legends: 'M8 26C14 26 22 20 26 10L32 12C30 24 22 32 10 32Z',
  lightspeed: 'M23 6L12 22H19L15 34L29 16H21Z',
  underdog: 'M20 33C14 33 12 29 14 26C16 23 18 22 20 22C22 22 24 23 26 26C28 29 26 33 20 33ZM11 20A3 4 0 1 1 11 12A3 4 0 1 1 11 20ZM29 20A3 4 0 1 1 29 12A3 4 0 1 1 29 20ZM17 15A3 4 0 1 1 17 7A3 4 0 1 1 17 15ZM23 15A3 4 0 1 1 23 7A3 4 0 1 1 23 15Z',
  humble_beginnings: 'M20 33V20M20 22C14 22 10 18 10 12C16 12 20 16 20 22ZM20 19C20 13 24 9 30 9C30 15 26 19 20 19Z',
  back_from_the_brink: 'M20 32L9 21C5 17 7 10 13 10C16 10 18 12 20 14C22 12 24 10 27 10C33 10 35 17 31 21ZM17 15L22 20L18 24L23 28',
  stone_cold: 'M20 7V33M8 14L32 26M8 26L32 14M16 9L20 12L24 9M16 31L20 28L24 31',
  old_guard: 'M12 7H28L22 18V22L28 33H12L18 22V18ZM15 30H25L20 24Z',
};

/** Emblems drawn as lines (the rest are filled). */
const LINED = new Set(['arrows_into_tomorrow', 'photo_finish', 'stone_cold', 'humble_beginnings', 'back_from_the_brink']);

export function FeatMedal(p: { id: string; found: boolean; size?: number }) {
  const size = p.size ?? 56;
  const gold = p.found;
  const rim = gold ? '#e8b23a' : '#8a6a46';
  const rimDark = gold ? '#976526' : '#5a4430';
  const rimLine = gold ? '#5d4717' : '#33251a';
  const face = gold ? '#f6d27a' : '#6a5440';
  const faceShadow = gold ? '#d9a441' : '#54412f';
  const ink = gold ? '#7a4e14' : '#2a1d14';
  const notch = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI * 2) / 16;
    return `M${(30 + Math.cos(a) * 21).toFixed(1)} ${(36 + Math.sin(a) * 21).toFixed(1)}L${(30 + Math.cos(a) * 24).toFixed(1)} ${(36 + Math.sin(a) * 24).toFixed(1)}`;
  }).join('');
  const d = EMBLEM[p.id];
  return (
    <svg class={`feat-medal${gold ? ' is-found' : ''}`} viewBox="0 0 60 64" width={size} height={(size * 64) / 60} aria-hidden="true">
      {/* the ribbon */}
      <path d="M20 2H28L32 16L26 20Z" fill={gold ? '#b83a3a' : '#5a3a3a'} stroke={rimLine} stroke-width="1.8" stroke-linejoin="round" />
      <path d="M40 2H32L28 16L34 20Z" fill={gold ? '#3f7f46' : '#3a4a3a'} stroke={rimLine} stroke-width="1.8" stroke-linejoin="round" />
      {/* the rim, its teeth and bands */}
      <circle cx="30" cy="36" r="25" fill={rim} stroke={rimLine} stroke-width="2.6" />
      <path d={notch} stroke={rimDark} stroke-width="2" stroke-linecap="round" />
      <path d="M5 36A25 25 0 0 0 55 36A25 25 0 0 0 5 36ZM5 36A25 25 0 0 0 55 36A25 22 0 0 0 5 36Z" fill-rule="evenodd" fill={rimDark} opacity=".55" />
      <path d="M12 22A22 22 0 0 1 30 13" stroke={gold ? '#fff3d6' : '#b09070'} stroke-width="2.4" fill="none" stroke-linecap="round" />
      {/* the face */}
      <circle cx="30" cy="36" r="18" fill={face} stroke={rimLine} stroke-width="2" />
      <path d="M12 36A18 18 0 0 0 48 36A18 14 0 0 1 12 36Z" fill={faceShadow} />
      {gold && d ? (
        <g transform="translate(10 16)">
          {LINED.has(p.id) ? (
            <path d={d} fill="none" stroke={ink} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          ) : (
            <path d={d} fill="#fff3d6" stroke={ink} stroke-width="2" stroke-linejoin="round" />
          )}
        </g>
      ) : (
        <g>
          <circle cx="30" cy="32" r="5" fill={ink} />
          <path d="M27.4 34L26 44H34L32.6 34Z" fill={ink} />
        </g>
      )}
      {gold ? <circle cx="22" cy="26" r="2.2" fill="#fff" opacity=".7" class="feat-medal__glint" /> : null}
    </svg>
  );
}
