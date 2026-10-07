/** The bottom navigation's tab glyphs (UI art audit #13), apart from `Nav.tsx` so galleries and tests can draw them alone. */
import type { ComponentChildren } from 'preact';
import type { TabId } from '../router';
import { circ, oval, Part, rrect, SwordShape, TrophyShape } from './icons';

/**
 * Tab glyphs (UI art audit #13): cel-shaded two-tone pictures on the 32 grid in the battle sheets'
 * style (shadow band, one highlight, outlines in each fill's own dark): fanned cards, a capsule drum,
 * crossed swords over a round shield, a trophy cup and a pennant with a brush. Inactive tabs show them
 * at about 55% saturation (still over 3:1 on the bar); the active tab shows full colour, pops, and
 * plays its own micro motion once (cards fan, the drum lid hops, the swords clash, the cup glints,
 * the brush strokes; theme.css). Distinct silhouettes, so colour is never the only cue.
 */
export function NavIcon(p: { id: TabId; size?: number }): ComponentChildren {
  const s = p.size ?? 28;
  const common = { class: `ui-tabbar__glyph nav-g nav-g--${p.id}`, width: s, height: s, viewBox: '0 0 32 32', 'aria-hidden': 'true' as const, focusable: 'false' as const };
  switch (p.id) {
    case 'army':
      return (
        <svg {...common}>
          <g class="nav-army__back">
            <Part d={rrect(4.6, 6.4, 13, 19, 2.4)} fill="#7c5cd6" band={20.4} hi={rrect(6.4, 8, 2, 12, 1)} transform="rotate(-12 11 16)" />
          </g>
          <g class="nav-army__front">
            <g transform="rotate(9 19 15)">
              <Part d={rrect(12.4, 4.6, 13.2, 19.4, 2.4)} fill="#f1e3c0" band={19.6} />
              <Part d={rrect(14.4, 6.6, 9.2, 15.4, 1.4)} fill="#b8473c" band={18} hi={rrect(15.4, 7.6, 7.2, 1.4, 0.7)} sw={1.1} />
              <Part d="M19 9.4 20.6 12.6 24 13 21.5 15.3 22.1 18.6 19 17 15.9 18.6 16.5 15.3 14 13 17.4 12.6Z" fill="#ffcc33" mat="gold" band={15.6} sw={1.1} />
            </g>
          </g>
        </svg>
      );
    case 'capsules':
      return (
        <svg {...common}>
          <ellipse cx="16" cy="27.4" rx="10" ry="2" fill="#000" opacity=".3" />
          <Part d="M6 11V23A10 3.6 0 0 0 26 23V11Z" fill="#c27c3a" band="M19.5 0H40V40H19.5Z" hi="M8 14.4H9.6V23.6Q8.6 23.2 8 22.6Z" />
          <path d="M6.4 19.2A10 3.6 0 0 0 25.6 19.2" fill="none" stroke="#155f39" stroke-width="2.4" />
          <path d="M6.4 19.2A10 3.6 0 0 0 25.6 19.2" fill="none" stroke="#3fe08a" stroke-width="1.2" />
          <path d={circ(16, 22.8, 1.5)} fill="#3fe08a" stroke="#155f39" stroke-width=".8" />
          <g class="nav-cap__lid">
            <Part d="M6 9.6V13.4A10 3.6 0 0 0 26 13.4V9.6Z" fill="#e8b23a" mat="gold" band="M19.5 0H40V40H19.5Z" sw={1.3} />
            <Part d={oval(16, 9.6, 10, 3.6)} fill="#d8cfbf" hi={oval(13, 8.6, 4, 1)} sw={1.4} />
            <Part d={oval(16, 9.6, 5.4, 1.6)} fill="#c27c3a" sw={1} />
          </g>
        </svg>
      );
    case 'battle':
      return (
        <svg {...common}>
          <Part d={circ(16, 17, 9.4)} fill="#8e6440" band={20.4} hi="M9.6 13.2A7.2 7.2 0 0 1 14 9.2L14.4 10.4A6 6 0 0 0 10.8 13.6Z" />
          <path d={circ(16, 17, 7.6)} fill="none" stroke="#c7d0da" stroke-width="1.6" />
          <path d={circ(16, 17, 7.6)} fill="none" stroke="#69422f" stroke-width=".6" opacity=".6" />
          <g transform="translate(-0.4 -1) scale(1.36)">
            <g class="nav-sw__b">
              <g transform="translate(24 0) scale(-1 1) translate(12 11) rotate(42) scale(.95) translate(-12 -9.5)">
                <SwordShape />
              </g>
            </g>
            <g class="nav-sw__a">
              <g transform="translate(12 11) rotate(42) scale(.95) translate(-12 -9.5)">
                <SwordShape />
              </g>
            </g>
          </g>
        </svg>
      );
    case 'progress':
      return (
        <svg {...common}>
          <g transform="translate(1.6 1.4) scale(1.2)">
            <TrophyShape />
          </g>
          <path class="nav-cup__glint" d="M9 3H12L8 17H5Z" fill="#fff" opacity="0" />
        </svg>
      );
    case 'customize':
      return (
        <svg {...common}>
          <path d="M7 4.6V28.4" fill="none" stroke="#39281a" stroke-width="3.6" stroke-linecap="round" />
          <path d="M7 4.6V28.4" fill="none" stroke="#a87a4c" stroke-width="1.8" stroke-linecap="round" />
          <path d={circ(7, 4, 1.6)} fill="#e8b23a" stroke="#5d4717" stroke-width="1" />
          <g class="nav-flag">
            <Part d="M8.2 5.4H23L19.2 10.4 23 15.4H8.2Z" fill="#a8473c" band={12.4} hi="M9.4 6.6H19.6L19 7.6H9.4Z" />
            <path d={circ(13.6, 10.4, 1.9)} fill="#e8b23a" stroke="#5d4717" stroke-width=".9" />
          </g>
          <g class="nav-brush">
            <path d="M27.4 13.2 19.4 21.2" stroke="#39281a" stroke-width="4.2" stroke-linecap="round" />
            <path d="M27.4 13.2 19.4 21.2" stroke="#d6a868" stroke-width="2.4" stroke-linecap="round" />
            <path d="M20.6 18.6 22 20" stroke="#c7d0da" stroke-width="3" stroke-linecap="butt" />
            <Part d="M19.2 21.2C17.2 21.2 15.6 22.8 15.6 24.9C15.6 25.5 15.2 26.1 14.6 26.3C17.6 27.2 20.8 25.7 20.9 22.9Z" fill="#22b8cf" band={24.6} sw={1.3} />
          </g>
        </svg>
      );
  }
}
