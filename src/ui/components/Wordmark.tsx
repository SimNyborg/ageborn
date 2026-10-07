/**
 * The "AGEBORN" logo lockup (UI art audit #19): an emblem (an hourglass over crossed swords on a
 * bronze shield) and the name in condensed, beveled letters with a bronze-to-gold ramp, a dark warm
 * outline, a lit top bevel and a one-time 600 ms shine sweep (motion.css; none under reduce motion).
 * SVG, so it stays crisp at every size. `label` is the accessible name.
 */
import { useId } from 'preact/hooks';
import { SwordShape } from './icons';

export function Wordmark(p: { text: string; label?: string; height?: number; class?: string; emblem?: boolean }) {
  const uid = useId().replace(/[^\w-]/g, '');
  const h = p.height ?? 40;
  const emblem = p.emblem ?? true;
  const textX = emblem ? 58 : 4;
  const w = textX + p.text.length * 27 + 8;
  const g = `wm-g-${uid}`;
  const hi = `wm-h-${uid}`;
  const clip = `wm-c-${uid}`;
  const shine = `wm-s-${uid}`;
  const txt = (extra: Record<string, unknown>) => (
    <text x={textX} y="38" font-family="var(--ui-font-display, sans-serif)" font-size="38" font-weight="900" letter-spacing="1.5" textLength={p.text.length * 27 - 4} lengthAdjust="spacingAndGlyphs" {...extra}>
      {p.text.toUpperCase()}
    </text>
  );
  return (
    <svg class={`ui-wordmark${p.class ? ` ${p.class}` : ''}`} viewBox={`0 0 ${w} 50`} height={h} width={(h * w) / 50} role="img" aria-label={p.label ?? p.text}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff0b0" />
          <stop offset=".42" stop-color="#f5c34a" />
          <stop offset=".58" stop-color="#d98e2a" />
          <stop offset="1" stop-color="#9a5a1c" />
        </linearGradient>
        <linearGradient id={hi} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fffbe8" stop-opacity=".95" />
          <stop offset="1" stop-color="#fffbe8" stop-opacity="0" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0" />
          <stop offset=".5" stop-color="#fff" stop-opacity=".85" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <clipPath id={clip}>{txt({})}</clipPath>
      </defs>
      {emblem ? (
        <g class="ui-wordmark__emblem">
          <path d="M25 3 L45 10 V26 Q45 40 25 48 Q5 40 5 26 V10Z" fill="#5d3a1c" />
          <path d="M25 5.6 L42.6 11.8 V26 Q42.6 38.2 25 45.2 Q7.4 38.2 7.4 26 V11.8Z" fill="#b8742e" />
          <path d="M25 5.6 L42.6 11.8 V26 Q42.6 38.2 25 45.2Z" fill="#9a5e24" />
          <path d="M9.6 13.4 L25 8 V11 L12 15.6Z" fill="#f2c27a" opacity=".85" />
          <g transform="translate(5.5 7) scale(1.62)">
            <g transform="translate(24 0) scale(-1 1) translate(12 11) rotate(42) scale(.95) translate(-12 -9.5)">
              <SwordShape />
            </g>
            <g transform="translate(12 11) rotate(42) scale(.95) translate(-12 -9.5)">
              <SwordShape />
            </g>
          </g>
          <path d="M18.6 12 H31.4 M18.6 33 H31.4" stroke="#3a2614" stroke-width="3.4" stroke-linecap="round" />
          <path d="M18.6 12 H31.4 M18.6 33 H31.4" stroke="#e8b23a" stroke-width="1.8" stroke-linecap="round" />
          <path d="M19.6 13 Q19.6 19.6 25 22.5 Q19.6 25.4 19.6 32 H30.4 Q30.4 25.4 25 22.5 Q30.4 19.6 30.4 13Z" fill="#d8eef7" stroke="#2f4a5a" stroke-width="1.3" stroke-linejoin="round" />
          <path d="M21.4 16 Q25 17.4 28.6 16 Q27.6 19.8 25 21.6 Q22.4 19.8 21.4 16Z M21 31.2 Q21.6 27.4 25 26.4 Q28.4 27.4 29 31.2Z" fill="#f5c34a" />
        </g>
      ) : null}
      {txt({ fill: 'none', stroke: '#3a1e0a', 'stroke-width': 7, 'stroke-linejoin': 'round', transform: 'translate(0 2.6)' })}
      {txt({ fill: 'none', stroke: '#3a1e0a', 'stroke-width': 7, 'stroke-linejoin': 'round' })}
      {txt({ fill: `url(#${g})` })}
      <g clip-path={`url(#${clip})`}>
        <rect x={textX - 4} y="8" width={w} height="13" fill={`url(#${hi})`} />
        <rect class="ui-wordmark__shine" x={textX - 60} y="0" width="40" height="50" fill={`url(#${shine})`} transform="skewX(-20)" />
      </g>
    </svg>
  );
}
