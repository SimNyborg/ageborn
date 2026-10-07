/**
 * Meta UI icons as inline SVG in the A11 cartoon style: flat fills, one highlight, and a dark
 * outline (never pure black). No emoji and no external requests. One module, so a later art pass can
 * swap every icon in one place. All icons are decorative (`aria-hidden`); the text next to them, or
 * the button's `aria-label`, carries the meaning.
 */
import type { AgeId, CapsuleTier, Rarity, Role, RoleGroup } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { ink, light, line, shade } from './tone';
import './capsuleLadder.css';

export interface IconProps {
  size?: number;
  class?: string;
}

/** Outline colour of every icon (dark violet, as in the HUD). */
export const OUTLINE = '#1b1330';

/** DESIGN A10 rarity colours (UI only). */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#B8C0CC',
  rare: '#22B8CF',
  epic: '#A855F7',
  legendary: '#F5B82E',
};

/** DESIGN A10 capsule tier colours (none of them is a rarity colour). */
export const TIER_COLOR: Record<CapsuleTier, string> = {
  clay: '#9C6B4A',
  bronze: '#C27C3A',
  silver: '#C9D1DC',
  jade: '#2FBF71',
  // The 2026-09-29 ladder (A10, ui-plan 3.2): champagne Gold, ice Platinum, electric-indigo Aeon
  gold: '#EFE0B0',
  platinum: '#C4F2EA',
  aeon: '#5D3DFF',
};

/** A11 age accents and large-area colours, for UI tints. */
export const AGE_COLOR: Record<AgeId, { main: string; accent: string; light: string }> = {
  stone: { main: '#8C7B68', accent: '#C98A3D', light: '#EDE3C8' },
  medieval: { main: '#6B7682', accent: '#D4A437', light: '#E8DFC8' },
  gunpowder: { main: '#2E5E4E', accent: '#C9A227', light: '#EFE6CF' },
  modern: { main: '#62664A', accent: '#B0306A', light: '#B8A67A' },
  future: { main: '#23262E', accent: '#29E3F5', light: '#3AF0B4' },
  // A17.12
  bronze: { main: '#CDBE9E', accent: '#B8863B', light: '#4F8F7F' },
  industrial: { main: '#5B6168', accent: '#B06A3B', light: '#DCD6C8' },
  cosmic: { main: '#1E1830', accent: '#3FE0B0', light: '#8E44C8' },
};

function Svg(p: IconProps & { children: ComponentChildren; view?: string; tier?: CapsuleTier }) {
  const s = p.size ?? 24;
  return (
    <svg
      class={p.class ? `ui-icon ${p.class}` : 'ui-icon'}
      data-tier={p.tier}
      width={s}
      height={s}
      viewBox={p.view ?? '0 0 24 24'}
      aria-hidden="true"
      focusable="false"
    >
      {p.children}
    </svg>
  );
}

const O = { stroke: OUTLINE, 'stroke-width': 1.6, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };

/** A unique, CSS-safe id per icon instance (clip paths for the shadow bands). */
function useUid(prefix: string): string {
  return `${prefix}${useId().replace(/[^\w-]/g, '')}`;
}

/** Path helpers, so every part is one path (it is filled, clipped and outlined from the same data). */
export const circ = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
export const oval = (cx: number, cy: number, rx: number, ry: number): string => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
export const rrect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

export type PartMaterial = 'matte' | 'metal' | 'gold' | 'skin';

/**
 * One cel-shaded part (UI art audit §3.1): the fill, a hard shadow band on its lower side (`band`: the
 * y where the band starts, drawn with a slight sag, or a custom path), one highlight shape (`hi`),
 * both clipped to the part, and the outline in the fill's own dark (fill × 0.40, never black) on top.
 */
export function Part(p: { d: string; fill: string; band?: number | string | false; hi?: string | false; mat?: PartMaterial; sw?: number; stroke?: string; class?: string; transform?: string }) {
  const id = useUid('pt');
  const mat = p.mat ?? 'matte';
  const sh = shade(p.fill, mat === 'gold' ? 'metal' : mat);
  const hi = light(p.fill, mat === 'gold' ? 'gold' : mat === 'metal' ? 'gloss' : 'matte');
  const bandD = p.band === undefined || p.band === false ? null : typeof p.band === 'number' ? `M-40 ${p.band}Q12 ${p.band + 1.4} 80 ${p.band}V120H-40Z` : p.band;
  const clip = bandD !== null || !!p.hi;
  return (
    <g class={p.class} transform={p.transform}>
      {clip ? (
        <clipPath id={id}>
          <path d={p.d} />
        </clipPath>
      ) : null}
      <path d={p.d} fill={p.fill} />
      {bandD ? <path d={bandD} fill={sh} clip-path={`url(#${id})`} /> : null}
      {p.hi ? <path d={p.hi} fill={hi} clip-path={`url(#${id})`} /> : null}
      <path d={p.d} fill="none" stroke={p.stroke ?? ink(p.fill)} stroke-width={p.sw ?? 1.5} stroke-linejoin="round" stroke-linecap="round" />
    </g>
  );
}

/** Fill plus its own outline, for small parts that need no band (`{...F('#e8b23a')}`). */
export function F(fill: string, sw = 1.5) {
  return { fill, stroke: ink(fill), 'stroke-width': sw, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };
}

/** A stroked line with a darker under-stroke (rope, grips, poles). */
function Line2(p: { d: string; color: string; w: number; edge?: number }) {
  return (
    <>
      <path d={p.d} fill="none" stroke={ink(p.color)} stroke-width={p.w + (p.edge ?? 1.6)} stroke-linecap="round" stroke-linejoin="round" />
      <path d={p.d} fill="none" stroke={p.color} stroke-width={p.w} stroke-linecap="round" stroke-linejoin="round" />
    </>
  );
}

const STEEL = '#d5dde7';
const GOLD = '#e8b23a';
const LEATHER = '#7a4a2c';

/**
 * One sword, drawn upright about x 12 (tip at the top), shaded for a light from above once it is
 * turned: the blade's right half takes the band (it faces down after the turn), a sliver on the left
 * catches the light. `hero` adds the engraved fuller and a guard gem.
 */
export function SwordShape(p: { hero?: boolean }) {
  return (
    <>
      <Part d="M12 0.6 13.7 3.3V15.2H10.3V3.3Z" fill={STEEL} mat="metal" band="M12 -2H18V18H12Z" hi="M10.95 3.5 11.85 2V14.7H10.95Z" sw={1.4} />
      <path d={p.hero ? 'M12 4.4V13.6' : 'M12 4.6V13.4'} stroke={shade(STEEL, 'metal')} stroke-width={p.hero ? 0.9 : 0.75} stroke-linecap="round" />
      {p.hero ? <path d="M12.6 5V12.8" stroke="#fff" stroke-width=".45" stroke-linecap="round" opacity=".7" /> : null}
      <Part d="M11 16.7H13V20.4H11Z" fill={LEATHER} band="M12 15H15V22H12Z" sw={1.3} />
      <path d="M11.1 17.7 12.9 17.2M11.1 18.9 12.9 18.4M11.1 20.1 12.9 19.6" stroke={shade(LEATHER)} stroke-width=".6" stroke-linecap="round" />
      <Part d="M7.3 15.4Q12 14.2 16.7 15.4V16.8Q12 17.9 7.3 16.8Z" fill={GOLD} mat="gold" band={16.3} hi="M8.2 15.3Q12 14.5 15.8 15.3V15.8Q12 15 8.2 15.8Z" sw={1.3} />
      <Part d={circ(12, 21.75, 1.45)} fill={GOLD} mat="gold" band={22} hi={circ(11.55, 21.3, 0.5)} sw={1.2} />
      {p.hero ? <Part d={circ(12, 16.1, 0.85)} fill="#c0392b" band={16.3} hi={circ(11.75, 15.85, 0.3)} sw={0.8} /> : null}
    </>
  );
}

/** The pair's geometry: each sword turns 42° about its blade point at y 9.5, placed at (12, 10.5). */
const SWORD_PLACE = 'translate(12 11) rotate(42) scale(.95) translate(-12 -9.5)';

// ---------------------------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------------------------

export function AmberIcon(p: IconProps) {
  const o = ink('#d9771a');
  return (
    <Svg {...p}>
      <path d="M12 2.2 20 7.4v9.2l-8 5.2-8-5.2V7.4z" fill="#d9771a" />
      <path d="M12 3.6 18.5 8v8L12 20.3 5.5 16V8z" fill="#ffb238" />
      <path d="M12 3.6V12l6.5 4V8z" fill="#ff9a1f" />
      <path d="M12 12 5.5 16l6.5 4.3 6.5-4.3z" fill="#d97a16" />
      <path d="M12 12 5.5 8 12 3.6z" fill="#ffc861" />
      <path d="M7.4 8.6 12 5.6" stroke="#fff1c4" stroke-width="1.7" stroke-linecap="round" fill="none" />
      <circle cx="15.8" cy="14.8" r=".8" fill="#fff1c4" opacity=".8" />
      <path d="M12 2.2 20 7.4v9.2l-8 5.2-8-5.2V7.4z" fill="none" stroke={o} stroke-width="1.5" stroke-linejoin="round" />
    </Svg>
  );
}

/** Dust (A18.9): one bright spark over a small heap of violet dust (ui-plan 3.5). */
export function DustIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <Part d="M2.8 20.2Q3.6 16 7.4 15.2Q9.4 12.4 13 13.4Q17.8 13.4 21.2 20.2Z" fill="#9b6cf0" band={18.3} hi="M6.4 16.4Q8.2 15.6 9.4 14.4Q10.4 14 11.2 14.4Q9.6 15.2 8.6 16.4Z" />
      <path d="M7 18.6h.01M11.4 17.4h.01M15.6 18.8h.01M13.4 15.8h.01" stroke="#e6dbff" stroke-width="1.3" stroke-linecap="round" />
      <Part d="M12.6 1.6Q13.4 6.1 17.9 6.9Q13.4 7.7 12.6 12.2Q11.8 7.7 7.3 6.9Q11.8 6.1 12.6 1.6Z" fill="#efe6ff" band={8.6} sw={1.3} stroke="#4b2f86" />
      <path d="M19.4 2.4 19.8 3.8 21.2 4.2 19.8 4.6 19.4 6 19 4.6 17.6 4.2 19 3.8Z" fill="#fff" stroke="#4b2f86" stroke-width=".8" stroke-linejoin="round" />
      <path d="M5 8.2 5.3 9.1 6.2 9.4 5.3 9.7 5 10.6 4.7 9.7 3.8 9.4 4.7 9.1Z" fill="#d9c8ff" stroke="#4b2f86" stroke-width=".7" stroke-linejoin="round" />
    </Svg>
  );
}

/** The trophy cup's parts on the 24 grid (also the Progress tab glyph). */
export function TrophyShape() {
  const cup = '#f2c230';
  return (
    <>
      <path d="M6.6 5.2H3.6V7.6A4.2 4.2 0 0 0 7.8 11.8M17.4 5.2H20.4V7.6A4.2 4.2 0 0 1 16.2 11.8" fill="none" stroke={ink(cup)} stroke-width="3" stroke-linecap="round" />
      <path d="M6.6 5.2H3.6V7.6A4.2 4.2 0 0 0 7.8 11.8M17.4 5.2H20.4V7.6A4.2 4.2 0 0 1 16.2 11.8" fill="none" stroke={cup} stroke-width="1.3" stroke-linecap="round" />
      <Part d="M5.8 2.8H18.2V8.6A6.2 6.2 0 0 1 5.8 8.6Z" fill={cup} mat="gold" band="M5 9.6Q12 11.2 19 9.6V20H5Z" hi="M7.4 4.2H9.2V8.8Q9.2 10.6 10.4 11.8Q7.4 11 7.4 8.4Z" />
      <path d="M16.6 4.2H14.8V5.4H16.6Z" fill={light(cup, 'gold')} opacity=".8" />
      <Part d="M10.4 14.4H13.6L14.2 17.6H9.8Z" fill="#d99a1e" mat="gold" band={16.4} sw={1.3} />
      <Part d={rrect(6.8, 17.4, 10.4, 3.8, 1)} fill="#8e5a2b" band={19.6} hi="M8 18.2H16V18.8H8Z" />
      <path d="M10 19.3H14" stroke={GOLD} stroke-width="1" stroke-linecap="round" />
    </>
  );
}

export function TrophyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <TrophyShape />
    </Svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Navigation and actions
// ---------------------------------------------------------------------------------------------

export function BackIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.8 4.2 7 12l7.8 7.8" fill="none" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M14.8 4.2 7 12l7.8 7.8"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" />
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
    </Svg>
  );
}

export function GearIcon(p: IconProps) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  const m = '#cfd6e2';
  return (
    <Svg {...p}>
      {teeth.map((a) => (
        <path key={a} d={rrect(10.1, 1.5, 3.8, 5, 1)} {...F(m, 1.4)} transform={`rotate(${a} 12 12)`} />
      ))}
      <Part d={circ(12, 12, 7.4)} fill={m} mat="metal" band={13.4} hi="M6.6 10.6A5.8 5.8 0 0 1 10.6 6.4L10.9 7.6A4.6 4.6 0 0 0 7.8 10.9Z" />
      <Part d={circ(12, 12, 3)} fill="#5d6576" band={12.8} sw={1.3} />
    </Svg>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 11.2 12 3.5l9 7.7" fill="none" stroke={OUTLINE} stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5.5 10.5V20h13v-9.5L12 5z" {...F('#f2c14e')} />
      <rect x="9.8" y="13.5" width="4.4" height="6.5" rx="1" {...F('#8e5a2b')} />
      <path d="M3 11.2 12 3.5l9 7.7" fill="none" stroke="#e05a3c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

/**
 * Crossed swords (Battle, the Battle tab, Next battle, Play level): two straight, mirror-symmetric
 * blades crossing at the optical centre, pointed tips, perpendicular gold guards, wrapped grips and
 * round pommels, steel in two tones with the band on each blade's lower edge and a highlight on both
 * (UI art audit #4). From 36 px it draws the "hero" variant (engraved fuller, guard gems, a spark),
 * and inside a pressed button the blades clash: each turns 8° in and back with a spark
 * (`capsuleLadder.css`, still under reduce motion).
 */
export function SwordsIcon(p: IconProps & { hero?: boolean }) {
  const hero = p.hero ?? (p.size ?? 24) >= 36;
  const cls = ['ui-swords', hero ? 'ui-swords--hero' : null, p.class].filter(Boolean).join(' ');
  return (
    <Svg size={p.size ?? 24} class={cls}>
      <g class="ui-swords__b">
        <g transform={`translate(24 0) scale(-1 1) ${SWORD_PLACE}`}>
          <SwordShape hero={hero} />
        </g>
      </g>
      <g class="ui-swords__a">
        <g transform={SWORD_PLACE}>
          <SwordShape hero={hero} />
        </g>
      </g>
      {hero ? (
        <path class="ui-swords__spark" d="M12 2.6 12.9 5.4 15.6 4.6 13.7 6.6 15.4 8.6 12.8 7.9 12 10.4 11.2 7.9 8.6 8.6 10.3 6.6 8.4 4.6 11.1 5.4Z" fill="#fff4c2" stroke="#f5b82e" stroke-width=".5" stroke-linejoin="round" />
      ) : null}
    </Svg>
  );
}

/** Skirmish (training): a straw training dummy on its post with a painted target (one glyph per mode, §3.5). */
export function SkirmishIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <Line2 d="M12 13V21.6" color="#8e6440" w={2.4} />
      <Line2 d="M4.6 11.6H19.4" color="#8e6440" w={2} />
      <Part d="M7.2 10.4Q7 7.6 12 7.4Q17 7.6 16.8 10.4L16.2 17.2Q12 18.6 7.8 17.2Z" fill="#d2b57a" band={14.6} hi="M8.4 9.6Q9.4 8.2 12 8.1V9.2Q9.8 9.3 9 10.6Z" />
      <path d="M8 12.4Q12 13.3 16 12.4M8.2 15Q12 16 15.8 15" stroke={line('#d2b57a')} stroke-width=".7" fill="none" />
      <Part d={circ(12, 12.9, 2.5)} fill="#c0392b" band={13.9} sw={1.1} />
      <path d={circ(12, 12.9, 1)} fill="#f4ecd8" />
      <Part d={oval(12, 4.6, 3, 2.9)} fill="#d2b57a" band={5.6} hi={oval(11, 3.4, 1.1, 0.6)} />
      <path d="M10.6 21.6H13.4" stroke={ink('#8e6440')} stroke-width="1.6" stroke-linecap="round" />
    </Svg>
  );
}

/** Quick Battle: one sword with a lightning bolt across it (one glyph per mode, §3.5). */
export function QuickBattleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <g transform="translate(12 11.5) rotate(38) scale(.9) translate(-12 -11)">
        <SwordShape />
      </g>
      <Part d="M13.8 2.4 7.6 11.6H11.4L9.6 19.4 16.6 9.4H12.6L14.8 2.4Z" fill="#ffd23f" mat="gold" band={12.5} hi="M12.9 3.6 9.3 9.6H10.4L13.4 4.2Z" sw={1.3} />
    </Svg>
  );
}

/** A wooden chest with iron bands and a gold lock (the War Path's side node, a reward to find). */
export function ChestIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <Part d="M3.6 11.2H20.4V19.4Q20.4 20.6 19.2 20.6H4.8Q3.6 20.6 3.6 19.4Z" fill="#9a6a3c" band={17.4} />
      <Part d="M3.6 11.2V8.6Q3.6 4.6 12 4.6Q20.4 4.6 20.4 8.6V11.2Z" fill="#b07a45" band={9.6} hi="M5.4 8.4Q6 6.1 11 5.9V7Q7.2 7.2 6.6 8.6Z" />
      <path d="M7.4 5.4V20.6M16.6 5.4V20.6" stroke={ink('#9a6a3c')} stroke-width="2.6" />
      <path d="M7.4 5.4V20.6M16.6 5.4V20.6" stroke="#8b9099" stroke-width="1.4" />
      <path d="M3.6 11.2H20.4" stroke={ink('#9a6a3c')} stroke-width="1.3" />
      <Part d={rrect(10.2, 9.6, 3.6, 4.4, 1)} fill={GOLD} mat="gold" band={12.4} hi="M10.9 10.3H12.2V11H10.9Z" sw={1.1} />
      <path d="M12 11.4V12.6" stroke={ink(GOLD)} stroke-width="1" stroke-linecap="round" />
    </Svg>
  );
}

export function ScrollIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4h11.5a2.5 2.5 0 0 1 0 5H17v9a3 3 0 0 1-3 3H5.5a2.5 2.5 0 0 1 0-5H6z" {...F('#efe1bd')} />
      <path d="M17.5 4A2.5 2.5 0 0 0 15 6.5V9h2.5" {...F('#d9c58f')} />
      <path d="M9 9h5M9 12h5M9 15h3" stroke="#9c7a45" stroke-width="1.6" stroke-linecap="round" />
      <path d="M5.5 16H14a2.5 2.5 0 0 1 0 5" fill="none" stroke={OUTLINE} stroke-width="1.4" />
    </Svg>
  );
}

export function CardsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="11" height="15" rx="2" {...F('#22b8cf')} transform="rotate(-10 8.5 12.5)" />
      <rect x="9" y="3.5" width="11" height="15" rx="2" {...F('#a855f7')} transform="rotate(8 14.5 11)" />
      <path
        d="M14.8 7.5 16.2 10l2.7.3-2 1.8.6 2.7-2.4-1.4-2.4 1.4.6-2.7-2-1.8 2.7-.3z"
        fill="#ffcf3a"
        stroke={OUTLINE}
        stroke-width="1"
        transform="rotate(8 14.5 11)"
      />
    </Svg>
  );
}

export function RoadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21c2-5 9-3 9-8s-6-4-6-8" fill="none" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" />
      <path d="M4 21c2-5 9-3 9-8s-6-4-6-8" fill="none" stroke="#d9c58f" stroke-width="3" stroke-linecap="round" />
      <path d="M16 3v9" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
      <path d="M16 3.5h5.2l-1.6 2.3 1.6 2.3H16z" {...F('#e05a3c')} />
    </Svg>
  );
}

export function CastleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 21V9h3v2h2.5V9h2v2H13V9h2v2h2.5V9h3v12z" {...F('#aab4c4')} />
      <path d="M8.5 21v-4a3.5 3.5 0 0 1 7 0v4z" {...F('#5a4636')} />
      <path d="M12 3.5v5" stroke={OUTLINE} stroke-width="1.8" stroke-linecap="round" />
      <path d="M12 3.6h5l-1.4 1.6L17 6.8h-5z" {...F('#f2c14e')} />
      <path d="M5 11.5v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7" />
    </Svg>
  );
}

export function ProfileIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="4.6" {...F('#f6c89b')} />
      <path d="M3.8 21a8.2 8.2 0 0 1 16.4 0z" {...F('#8b5cf6')} />
      <path d="M7.4 7.4a4.6 4.6 0 0 1 9.2 0c-2.8.6-6.4.6-9.2 0z" {...F('#6b3f22')} />
    </Svg>
  );
}

export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" {...F('#2f7df6')} />
      <circle cx="12" cy="7.4" r="1.6" fill="#fff" />
      <rect x="10.6" y="10.2" width="2.8" height="7.6" rx="1.2" fill="#fff" />
    </Svg>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke={ink('#aab4c4')} stroke-width="4" />
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="#c5ccd8" stroke-width="2" />
      <Part d={rrect(4.5, 10, 15, 11, 2.5)} fill="#f2c14e" mat="gold" band={17.4} hi="M6.4 11.6H17.6V12.6H6.4Z" />
      <path d={circ(12, 14.6, 1.8)} fill={ink('#f2c14e')} />
      <path d="M12 15.5v2.8" stroke={ink('#f2c14e')} stroke-width="1.8" stroke-linecap="round" />
    </Svg>
  );
}

export function StarIcon(p: IconProps & { filled?: boolean }) {
  const filled = p.filled ?? true;
  const d = 'M12 2.4 14.8 8.3l6.5.8-4.8 4.5 1.2 6.4L12 16.9l-5.7 3.1 1.2-6.4-4.8-4.5 6.5-.8z';
  if (!filled) return <Svg {...p}><path d={d} {...F('#3b3760', 1.5)} /></Svg>;
  return (
    <Svg {...p}>
      <Part d={d} fill="#ffcc33" mat="gold" band="M0 12.6Q12 14.6 24 12.6V24H0Z" hi="M9.4 9.4 11.6 4.6 12.4 6.3 10.8 9.6Z" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        fill="none"
        stroke={OUTLINE}
        stroke-width="5.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}

export function HammerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12.2 10.6 3.8 19a1.8 1.8 0 0 0 2.5 2.5l8.4-8.4z" {...F('#a8703f')} />
      <path d="M9.5 6.2 14 1.8l4 1.6 3 3-1.2 2.2-2.8-1.4-4.3 4.3z" {...F('#aab4c4')} />
      <path d="M13.2 3.6 16 3.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round" />
    </Svg>
  );
}

export function ArrowUpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 20 12h-4.8v9H8.8v-9H4z" {...F('#3cc46b')} />
      <path d="M12 5.4 7.5 10.5" stroke="#c9ffd9" stroke-width="1.4" stroke-linecap="round" />
    </Svg>
  );
}

export function ReplayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" {...F('#2f7df6')} />
      <path d="M10 8.3v7.4l6-3.7z" fill="#fff" stroke={OUTLINE} stroke-width="1.2" stroke-linejoin="round" />
    </Svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke={OUTLINE} stroke-width="1.8" stroke-linejoin="round" />
    </Svg>
  );
}

export function PencilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.5 3.8 20.2 8.5 9 19.7 3.6 20.4 4.3 15z" {...F('#f2c14e')} />
      <path d="M13.2 6.1 17.9 10.8" stroke={OUTLINE} stroke-width="1.6" />
      <path d="M4.3 15 9 19.7 3.6 20.4z" {...F('#f6c89b')} />
    </Svg>
  );
}

export function RefreshIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" />
      <path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      <path d="M20.5 3.5v5.6h-5.6z" fill="currentColor" {...O} />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.3" {...F('#e8eef7')} />
      <path d="M12 6.5V12l3.6 2.4" fill="none" stroke={OUTLINE} stroke-width="2.2" stroke-linecap="round" />
    </Svg>
  );
}

/**
 * The Sundial (A6.3): a bold stone dial face with engraved hours, a thick bronze gnomon, its shadow,
 * and a small sun in the corner, so it reads at 24 px (UI art audit §2.1). `dim` greys it out
 * (nothing ready); the Home chip lights it while a capsule is ready.
 */
export function SundialIcon(p: IconProps & { dim?: boolean }) {
  const cls = [p.class, p.dim ? 'is-dim' : null].filter(Boolean).join(' ');
  const stone = p.dim ? '#a8a294' : '#e8dcc0';
  const base = p.dim ? '#7f796c' : '#a89880';
  const bronze = p.dim ? '#8e8574' : '#c98a3d';
  return (
    <Svg size={p.size ?? 24} {...(cls ? { class: cls } : {})}>
      {!p.dim ? (
        <g>
          <path d="M5 1.4V2.4M5 7.6V8.6M1.4 5H2.4M7.6 5H8.6M2.5 2.5 3.2 3.2M7.5 2.5 6.8 3.2" stroke="#e8a21e" stroke-width="1.1" stroke-linecap="round" />
          <path d={circ(5, 5, 1.9)} {...F('#ffd23f', 1)} />
        </g>
      ) : null}
      <Part d="M1.8 15.6Q1.8 13.2 12 13.2Q22.2 13.2 22.2 15.6V17.6Q22.2 21.6 12 21.6Q1.8 21.6 1.8 17.6Z" fill={base} band={18.6} />
      <Part d={oval(12, 15.2, 10.2, 4.6)} fill={stone} band="M0 16.8Q12 20.6 24 16.8V24H0Z" hi="M5 13.4Q8 11.6 12 11.4V12.2Q8.4 12.4 6 13.8Z" />
      <path d="M3.8 15.4H5.2M6 18.2 7 17.3M12 19.6V18.4M18 18.2 17 17.3M20.2 15.4H18.8M12 10.8V11.8" stroke={line(stone)} stroke-width="1.2" stroke-linecap="round" />
      <path d="M12.2 15.6 5.4 17.8" stroke={ink(stone)} stroke-opacity={p.dim ? 0.3 : 0.55} stroke-width="2.4" stroke-linecap="round" />
      <Part d="M10.2 15.8H14L12.9 3.6Q12 2.6 11.2 3.8Z" fill={bronze} mat="gold" band="M12.4 0H20V20H12.4Z" hi="M11.2 14.6 11.6 5 12.1 4.6 11.9 14.6Z" sw={1.3} />
    </Svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" {...F('#fff')} />
      <path d="M3.5 7.4A2.4 2.4 0 0 1 5.9 5h12.2a2.4 2.4 0 0 1 2.4 2.4V10h-17z" {...F('#e05a3c')} />
      <path d="M8 3v4M16 3v4" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
      <path d="M9.5 13.5 11.5 15.5 15 12" fill="none" stroke="#3cc46b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v11M7 10l5 5 5-5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 3v11M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 15V4M7 8.5l5-5 5 5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M12 15V4M7 8.5l5-5 5 5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function CopyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="8" y="8" width="12" height="13" rx="2" {...F('#e8eef7')} />
      <path d="M16 6V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" fill="none" {...O} stroke-width="2" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 7.5h13l-1.2 12.6a1.6 1.6 0 0 1-1.6 1.4H8.3a1.6 1.6 0 0 1-1.6-1.4z" {...F('#e8eef7')} />
      <rect x="3.5" y="4.6" width="17" height="3" rx="1.2" {...F('#e05a3c')} />
      <path d="M9.6 4.6V3h4.8v1.6M10 11v7M14 11v7" fill="none" stroke={OUTLINE} stroke-width="1.6" stroke-linecap="round" />
    </Svg>
  );
}

export function SpeakerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 9h4l5-4.5v15l-5-4.5h-4z" {...F('#e8eef7')} />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke={OUTLINE} stroke-width="3.6" stroke-linecap="round" />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </Svg>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" {...F('#e8eef7')} />
      <circle cx="12" cy="12" r="3.6" {...F('#2f7df6')} />
      <circle cx="13.2" cy="10.8" r="1" fill="#fff" />
    </Svg>
  );
}

export function FlagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 21V3" stroke={OUTLINE} stroke-width="2.4" stroke-linecap="round" />
      <path d="M5.5 3.6h13l-3 4.2 3 4.2h-13z" {...F('#f2f2f2')} />
    </Svg>
  );
}

/** Customize (skins and looks): a paint brush over a palette. */
export function BrushIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c5 0 9 3.4 9 7.6 0 2.4-1.9 3.4-3.6 3.4h-1.6c-1.2 0-1.8 1.3-1.1 2.2.9 1.2.1 3.8-2.7 3.8-5 0-9-3.8-9-8.5S7 3.5 12 3.5z" {...F('#f2d7a6')} />
      <circle cx="7.6" cy="10.4" r="1.6" fill="#e05a3c" stroke={OUTLINE} stroke-width="1" />
      <circle cx="11" cy="7.2" r="1.6" fill="#ffcf3a" stroke={OUTLINE} stroke-width="1" />
      <circle cx="15.2" cy="7.8" r="1.6" fill="#22b8cf" stroke={OUTLINE} stroke-width="1" />
      <circle cx="8.4" cy="14.6" r="1.6" fill="#a855f7" stroke={OUTLINE} stroke-width="1" />
      <path d="m21.5 12.5-6.8 6.8" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round" />
      <path d="M14.9 19.1c-.9.9-2.6 1.4-3.4 1.4.1-.9.5-2.4 1.4-3.3.6-.6 1.5-.6 2 0 .5.5.5 1.3 0 1.9z" {...F('#3a8ee0')} />
    </Svg>
  );
}

export function CrownIcon(p: IconProps) {
  const c = '#ffcc33';
  return (
    <Svg {...p}>
      <Part d="M3 8.4 7.6 12 12 4.4 16.4 12 21 8.4 19 18.6H5Z" fill={c} mat="gold" band={14.6} hi="M5.6 11.6 7.4 13.2 7 14.6Z M18.4 11.6 16.6 13.2 17 14.6Z M11.2 7.6 12 6.2 12.8 7.6 12 9.4Z" />
      <Part d={rrect(4.6, 17.2, 14.8, 3.2, 1)} fill="#d99a1e" mat="gold" band={19.2} sw={1.4} />
      <Part d={circ(12, 13.6, 1.7)} fill="#c0392b" band={14.2} hi={circ(11.5, 13.1, 0.55)} sw={1.1} />
      <path d={`${circ(3, 8.4, 1.2)}${circ(21, 8.4, 1.2)}${circ(12, 4.2, 1.2)}`} {...F(c, 1)} />
    </Svg>
  );
}

export function ShieldBrokenIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.8 20 5.6v6c0 5-3.6 8.4-8 10-4.4-1.6-8-5-8-10v-6z" {...F('#8e97ab')} />
      <path d="M12 2.8 10.2 9l3 2.4-2 4.2 1 6" fill="none" stroke={OUTLINE} stroke-width="2" stroke-linejoin="round" />
    </Svg>
  );
}

export function ScalesIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v17M7 20.5h10M4.5 7h15" stroke={OUTLINE} stroke-width="2.2" stroke-linecap="round" />
      <path d="M2.5 13.5 5 7l2.5 6.5a2.5 2.5 0 0 1-5 0zM16.5 13.5 19 7l2.5 6.5a2.5 2.5 0 0 1-5 0z" {...F('#ffcf3a')} />
    </Svg>
  );
}

/** Robot face: shown with the "AI" chip on every bot nameplate (DESIGN A7.1). */
export function RobotIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5v3" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="2.6" r="1.6" fill="#e05a3c" stroke={OUTLINE} stroke-width="1.2" />
      <rect x="4" y="6" width="16" height="13" rx="3.4" {...F('#cfd6e4')} />
      <rect x="6.6" y="9" width="10.8" height="5.6" rx="2.2" {...F('#2a3552')} />
      <circle cx="9.6" cy="11.8" r="1.4" fill="#5ff2ff" />
      <circle cx="14.4" cy="11.8" r="1.4" fill="#5ff2ff" />
      <path d="M9 17h6" stroke={OUTLINE} stroke-width="1.6" stroke-linecap="round" />
      <path d="M2.5 11v3.5M21.5 11v3.5" stroke={OUTLINE} stroke-width="2.4" stroke-linecap="round" />
    </Svg>
  );
}

export function BoltIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.5 2 4.5 13.5h6L9 22l10-12.5h-6.2z" {...F('#ffcf3a')} />
      <path d="M12.4 4.8 8 10.6" stroke="#fff5c2" stroke-width="1.4" stroke-linecap="round" />
    </Svg>
  );
}

export function TowerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 21 7.4 9h9.2L18 21z" {...F('#aab4c4')} />
      <path d="M5.5 5h2.2v2h2.1V5h4.4v2h2.1V5h2.2v4h-13z" {...F('#cfd6e4')} />
      <path d="M10.2 21v-4a1.8 1.8 0 0 1 3.6 0v4z" {...F('#5a4636')} />
      <rect x="10.8" y="11.2" width="2.4" height="3" rx="1" fill={OUTLINE} />
    </Svg>
  );
}

export function CoinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12.8" r="9.5" {...F('#b87a12')} />
      <circle cx="12" cy="11.4" r="9" {...F('#ffcf3a')} />
      <circle cx="12" cy="11.4" r="5.6" fill="none" stroke="#d99a1e" stroke-width="1.6" />
      <path d="M8.2 7.6a6 6 0 0 1 4.8-2" stroke="#fff5c2" stroke-width="1.6" fill="none" stroke-linecap="round" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Roles (used as card art fallback and filters)
// ---------------------------------------------------------------------------------------------

export type GlyphKind = RoleGroup | 'turret' | 'power';

/** Maps a unit role to its role-group glyph (A2.6). */
export function roleGlyph(role: Role, group: RoleGroup): GlyphKind {
  if (group !== 'epic' && group !== 'legendary') return group;
  switch (role) {
    case 'infantry':
    case 'skirmisher':
      return 'infantry';
    case 'ranged':
    case 'artillery':
    case 'airGunship':
      return 'ranged';
    case 'antiArmor':
    case 'antiMech':
      return 'antiArmor';
    case 'support':
      return 'support';
    default:
      return 'heavy';
  }
}

export function RoleGlyph(p: IconProps & { kind: GlyphKind; color?: string }) {
  const c = p.color ?? '#f4ecd8';
  switch (p.kind) {
    case 'infantry':
      return (
        <Svg {...p}>
          <path d="M16.5 3 21 3v4.5L10 18.5 5.5 14z" {...F(c)} />
          <path d="M4 14.5 9.5 20M3 21l3.4-3.4" stroke={OUTLINE} stroke-width="3" stroke-linecap="round" />
          <path d="M4 14.5 9.5 20" stroke="#ffcf3a" stroke-width="1.4" stroke-linecap="round" />
        </Svg>
      );
    case 'ranged':
      return (
        <Svg {...p}>
          <path d="M6 3c9 2 13 8 15 15" fill="none" stroke={OUTLINE} stroke-width="4.2" stroke-linecap="round" />
          <path d="M6 3c9 2 13 8 15 15" fill="none" stroke={c} stroke-width="2.2" stroke-linecap="round" />
          <path d="M6 3 21 18" stroke={OUTLINE} stroke-width="1.2" />
          <path d="M3 21 16 8" stroke={OUTLINE} stroke-width="2.6" stroke-linecap="round" />
          <path d="M16 8l1.2-3.4L20 7.4 16.8 8.6z" {...F('#ffcf3a')} stroke-width="1.2" />
        </Svg>
      );
    case 'heavy':
      return (
        <Svg {...p}>
          <path d="M12 2.8 20 5.6v6c0 5-3.6 8.4-8 10-4.4-1.6-8-5-8-10v-6z" {...F(c)} />
          <path d="M12 5.6v13.2M7 10.5h10" stroke={OUTLINE} stroke-width="1.8" stroke-linecap="round" />
        </Svg>
      );
    case 'antiArmor':
      return (
        <Svg {...p}>
          {/* Anti-heavy: the Heavy shield split by a spear (owner feedback 2026-09-29). */}
          <path d="M10.6 3.2 4.2 5.5v6.1c0 4.7 2.9 8 6.4 9.6z" {...F(c)} transform="rotate(-9 10.6 21.2)" />
          <path d="M13.4 3.2l6.4 2.3v6.1c0 4.7-2.9 8-6.4 9.6z" {...F(c)} transform="rotate(9 13.4 21.2)" />
          <path d="M12 1.5v14.2" stroke={OUTLINE} stroke-width="3.2" stroke-linecap="round" />
          <path d="M12 1.5v14.2" stroke="#a8703f" stroke-width="1.4" stroke-linecap="round" />
          <path d="M12 22.8l-2.7-7.4h5.4z" {...F('#ffcf3a')} />
        </Svg>
      );
    case 'support':
      return (
        <Svg {...p}>
          <path d="M9 3.5h6v5.5h5.5v6H15v5.5H9V15H3.5V9H9z" {...F(c)} />
          <path d="M10.4 5v5.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8" />
        </Svg>
      );
    case 'epic':
      return <StarIcon {...p} />;
    case 'legendary':
      return <CrownIcon {...p} />;
    case 'turret':
      return <TowerIcon {...p} />;
    case 'power':
      return <BoltIcon {...p} />;
  }
}

// ---------------------------------------------------------------------------------------------
// Ages
// ---------------------------------------------------------------------------------------------

export function AgeGlyph(p: IconProps & { age: AgeId }) {
  switch (p.age) {
    case 'stone':
      return (
        <Svg {...p}>
          <path d="M5 20.5 12.5 9" stroke={OUTLINE} stroke-width="4.2" stroke-linecap="round" />
          <path d="M5 20.5 12.5 9" stroke="#a8703f" stroke-width="2.2" stroke-linecap="round" />
          <path d="M11 4.5c3-2 7.5-.5 8.5 3s-1.5 6-4.5 5.5-6.5-5-4-8.5z" {...F('#8c7b68')} />
          <circle cx="14.6" cy="6.6" r="1" fill="#c9b8a3" />
        </Svg>
      );
    case 'bronze':
      // A crested bronze helmet (Hellas).
      return (
        <Svg {...p}>
          <path d="M6 13.5c0-4.6 2.7-7.5 6-7.5s6 2.9 6 7.5v6.5h-3.2v-4.2H9.2V20H6z" {...F('#c68a3c')} />
          <path d="M9.2 15.8V12h5.6v3.8" {...F('#3a2a1c')} stroke-width="1.2" />
          <path d="M5.5 6.5C8 2.8 16 2.8 18.5 6.5" fill="none" stroke={OUTLINE} stroke-width="4" stroke-linecap="round" />
          <path d="M5.5 6.5C8 2.8 16 2.8 18.5 6.5" fill="none" stroke="#b0302a" stroke-width="2.2" stroke-linecap="round" />
          <path d="M8 10c.6-1.6 1.8-2.6 3.2-3" stroke="#f3cf8a" stroke-width="1.3" stroke-linecap="round" fill="none" />
        </Svg>
      );
    case 'industrial':
      // A factory gear with a smokestack.
      return (
        <Svg {...p}>
          <path d="M15 3h3v8h-3z" {...F('#5d4a3e')} />
          <path
            d="M12 7.2l1.4.3.6-1.3 1.6.9-.5 1.3 1 1 1.3-.5.9 1.6-1.3.6.3 1.4-.3 1.4 1.3.6-.9 1.6-1.3-.5-1 1 .5 1.3-1.6.9-.6-1.3-1.4.3-1.4-.3-.6 1.3-1.6-.9.5-1.3-1-1-1.3.5-.9-1.6 1.3-.6-.3-1.4.3-1.4-1.3-.6.9-1.6 1.3.5 1-1-.5-1.3 1.6-.9.6 1.3z"
            fill="#8a8f98"
            {...O}
            stroke-width="1.2"
          />
          <circle cx="12" cy="14.2" r="2.4" {...F('#3a3f45')} stroke-width="1.2" />
        </Svg>
      );
    case 'cosmic':
      // A ringed planet and a star.
      return (
        <Svg {...p}>
          <circle cx="11" cy="13" r="6" {...F('#7a55d8')} />
          <ellipse cx="11" cy="13" rx="10" ry="3" fill="none" stroke={OUTLINE} stroke-width="3" transform="rotate(-18 11 13)" />
          <ellipse cx="11" cy="13" rx="10" ry="3" fill="none" stroke="#ffd466" stroke-width="1.4" transform="rotate(-18 11 13)" />
          <path d="M19 2.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" {...F('#fff4c4')} stroke-width="0.9" />
          <path d="M8.4 10.4a3.4 3.4 0 0 1 2.4-1.4" stroke="#d9c8ff" stroke-width="1.2" stroke-linecap="round" fill="none" />
        </Svg>
      );
    case 'medieval':
      return (
        <Svg {...p}>
          <path d="M5 21V7.5h2.5v2h2.2v-2h4.6v2h2.2v-2H19V21z" {...F('#6b7682')} />
          <path d="M9.8 21v-3.8a2.2 2.2 0 0 1 4.4 0V21z" {...F('#3a2f28')} />
          <path d="M12 2.5v5" stroke={OUTLINE} stroke-width="1.6" />
          <path d="M12 2.6h4.4l-1.2 1.4 1.2 1.4H12z" {...F('#8e2a4a')} stroke-width="1.2" />
          <rect x="11" y="11" width="2" height="2.6" rx=".8" fill="#d4a437" />
        </Svg>
      );
    case 'gunpowder':
      return (
        <Svg {...p}>
          <path d="M3.5 10.5 17.5 5.2l1.5 4.4-13.8 5.2z" {...F('#4a3b2e')} />
          <rect x="17" y="4" width="3.4" height="6.6" rx="1" {...F('#c9a227')} transform="rotate(-20 18.7 7.3)" />
          <circle cx="9" cy="16.5" r="4" {...F('#8e5a2b')} />
          <circle cx="9" cy="16.5" r="1.4" {...F('#c9a227')} stroke-width="1" />
          <path d="M2.5 20.5h13" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
        </Svg>
      );
    case 'modern':
      return (
        <Svg {...p}>
          <path d="M3.5 15.5a8.5 8.5 0 0 1 17 0z" {...F('#62664a')} />
          <path d="M2 15.5h20v2.4H2z" {...F('#3a3f45')} />
          <path d="M7 12a5.4 5.4 0 0 1 4-4.5" stroke="#b8a67a" stroke-width="1.6" fill="none" stroke-linecap="round" />
          <rect x="10.5" y="12.2" width="3" height="2" rx=".6" fill="#b0306a" />
        </Svg>
      );
    case 'future':
      return (
        <Svg {...p}>
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke={OUTLINE} stroke-width="3.2" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#29e3f5" stroke-width="1.4" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke={OUTLINE} stroke-width="3.2" transform="rotate(-30 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#f03aa8" stroke-width="1.4" transform="rotate(-30 12 12)" />
          <circle cx="12" cy="12" r="3.2" {...F('#3af0b4')} />
        </Svg>
      );
  }
}

// ---------------------------------------------------------------------------------------------
// Capsules, crates, rarity gems
// ---------------------------------------------------------------------------------------------

/**
 * The ladder the drum icon draws, lowest first. It mirrors `content.capsules.tierOrder` (the UI draws
 * without the content tables; a test keeps the two equal, as `src/capsule/tiers.ts` does).
 */
export const TIER_LADDER: readonly CapsuleTier[] = ['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon'];
/**
 * The drum carves 5 rings (A10): tiers up to `capsules.summitAbove` light rings 1 to index + 1, and
 * each tier above it adds one summit gem in the cap band. A test keeps `DRUM_RINGS - 1` equal to the
 * index of `summitAbove`.
 */
export const DRUM_RINGS = 5;

/** Tier material ramps (highlight, key, mid-tone, shadow); DESIGN A10 and the 2026-09-29 ladder spec. */
const TIER_RAMP: Record<CapsuleTier, readonly [string, string, string, string]> = {
  clay: ['#CFA283', '#9C6B4A', '#7E5238', '#553423'],
  bronze: ['#EDB57A', '#C27C3A', '#9C5F27', '#6A3E19'],
  silver: ['#F5F8FB', '#C9D1DC', '#A3ADBB', '#6C7584'],
  jade: ['#96EDBB', '#2FBF71', '#22955A', '#155F39'],
  gold: ['#FFF6DC', '#EFE0B0', '#BCA45A', '#6B5A2A'],
  platinum: ['#F2FFFC', '#C4F2EA', '#A6D4CD', '#7E9E99'],
  aeon: ['#B8AAFF', '#5D3DFF', '#3A2A9E', '#241C4A'],
};
/** What fills a drum's ring grooves: lapis enamel on Gold, dark carving elsewhere. */
const GROOVE: Partial<Record<CapsuleTier, string>> = { gold: '#2B4C9B' };
/** Surface finish: brushed streaks on platinum, a drifting starfield in the Aeon time crystal. */
const FINISH: Partial<Record<CapsuleTier, 'brushed' | 'stars'>> = { platinum: 'brushed', aeon: 'stars' };
/** Every tier icon's outer contour (WCAG 1.4.11: the Aeon fill alone is under 3:1 on the surfaces). */
const PARCHMENT = '#F4ECD8';
/** The Legendary crest: the Legendary star on a dark enamel shield (the one rarity colour on a capsule). */
const CREST_SHIELD = '#1D1405';

// The drum's geometry in its 40 × 40 view: a cylinder (rx 13, ry 3.8) with the cap's top face at
// y 8, the stone cap band 8-11.5 (summit gems), the brass band 11.5-16 (crests) and the body 16-32
// (5 carved rings).
const RX = 13;
const RY = 3.8;
const SILHOUETTE = `M7 8V32A${RX} ${RY} 0 0 0 33 32V8A${RX} ${RY} 0 0 0 7 8Z`;
const band = (y1: number, y2: number) => `M7 ${y1}V${y2}A${RX} ${RY} 0 0 0 33 ${y2}V${y1}A${RX} ${RY} 0 0 1 7 ${y1}Z`;
/** The front arc's drop below the band line at x (0 at the rim, RY at the centre). */
const arcDrop = (x: number) => RY * Math.sqrt(Math.max(0, 1 - ((x - 20) / RX) ** 2));
const RING_Y = [30.6, 27.3, 24, 20.7, 17.4];
const star = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';
const spread = (n: number, gap: number) => Array.from({ length: n }, (_, i) => 20 + (i - (n - 1) / 2) * gap);

/**
 * The capsule drum of A10 in its tier's material (ui-plan 3.5; the 2026-09-29 ladder).
 *
 * From 32 px: carved stone and brass with 5 rings; the rings up to the tier are lit, each in its own
 * tier's colour (bottom-up: clay, bronze, silver, jade, gold); tiers above the summit add 1-2 summit
 * gems in the cap band; `crests` stamps that many Legendary crests on the brass band. Below 32 px: a
 * flat silhouette in the tier colour with a "★n" crest badge beside it. Nothing is drawn for a ring,
 * gem or crest that is not earned beyond the carved drum itself, and every size carries a 1.5 px
 * parchment outline.
 *
 * `crests`: set it only for a fixed-tier capsule or one already opened (from its guarantees; see
 * `capsuleLook.ts`). An unopened climbing capsule shows its start tier and never gets crests.
 */
export function CapsuleIcon(p: IconProps & { tier: CapsuleTier; crests?: number }) {
  const size = p.size ?? 24;
  const k = 40 / size; // view units per CSS pixel
  const ink = Math.min(3, Math.max(1.5, size / 16)) * k;
  const rim = ink + 3 * k; // the parchment band shows 1.5 px outside the dark outline
  const ramp = TIER_RAMP[p.tier];
  const idx = Math.max(0, TIER_LADDER.indexOf(p.tier));
  const crests = Math.max(0, Math.min(3, p.crests ?? 0));
  const gid = `cap-body-${p.tier}`;
  const body = (
    <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color={ramp[3]} />
      <stop offset=".18" stop-color={ramp[2]} />
      <stop offset=".38" stop-color={ramp[1]} />
      <stop offset=".47" stop-color={ramp[0]} />
      <stop offset=".58" stop-color={ramp[1]} />
      <stop offset=".84" stop-color={ramp[2]} />
      <stop offset="1" stop-color={ramp[3]} />
    </linearGradient>
  );

  if (size < 32) {
    const svg = (
      <Svg {...p} view="0 0 40 40">
        <defs>{body}</defs>
        <path d={SILHOUETTE} fill="none" stroke={PARCHMENT} stroke-opacity=".6" stroke-width={rim} stroke-linejoin="round" />
        <path d={SILHOUETTE} fill={`url(#${gid})`} stroke={OUTLINE} stroke-width={ink} stroke-linejoin="round" />
        <ellipse cx="20" cy="8" rx={RX} ry={RY} fill={ramp[0]} stroke={OUTLINE} stroke-width={ink * 0.7} />
      </Svg>
    );
    if (crests === 0) return svg;
    return (
      <span class="ui-capicon">
        {svg}
        <CrestBadge n={crests} />
      </span>
    );
  }

  const lit = Math.min(idx, DRUM_RINGS - 1) + 1;
  const summit = Math.max(0, idx - (DRUM_RINGS - 1));
  const groove = GROOVE[p.tier] ?? OUTLINE;
  const line = ink * 0.55;
  return (
    <Svg {...p} view="0 0 40 40">
      <defs>
        {body}
        <linearGradient id="cap-brass" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#6b5018" />
          <stop offset=".4" stop-color="#d9b560" />
          <stop offset=".5" stop-color="#f3dc95" />
          <stop offset=".62" stop-color="#c49a3e" />
          <stop offset="1" stop-color="#5e4614" />
        </linearGradient>
        <linearGradient id="cap-stone" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#4a4640" />
          <stop offset=".45" stop-color="#9d968a" />
          <stop offset="1" stop-color="#3f3b35" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="36.2" rx="14.5" ry="2.6" fill="#000" opacity=".28" />
      <path d={SILHOUETTE} fill="none" stroke={PARCHMENT} stroke-opacity=".6" stroke-width={rim} stroke-linejoin="round" />
      <path d={SILHOUETTE} fill={`url(#${gid})`} stroke={OUTLINE} stroke-width={ink} stroke-linejoin="round" />
      {/* Material: a drifting starfield on the time crystal, brushed streaks on platinum. */}
      {FINISH[p.tier] === 'stars'
        ? [
            [11.5, 22],
            [15, 29.5],
            [26.5, 20.5],
            [29, 27.5],
            [22.5, 33],
            [18, 24.5],
          ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 0.55 : 0.8} fill="#fff" opacity=".85" />)
        : null}
      {FINISH[p.tier] === 'brushed' ? (
        <path d="M10.5 30.5 15 18.5M24 33.5 29.5 19.5" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".55" />
      ) : null}
      {/* Rings, bottom-up: lit ones glow in their own tier's colour, the rest are carved grooves. */}
      {RING_Y.map((y, i) => {
        const d = `M7.6 ${y}A${RX} ${RY} 0 0 0 32.4 ${y}`;
        const cut = (
          <>
            <path d={d} fill="none" stroke={groove} stroke-width=".9" opacity=".5" />
            <path d={`M7.8 ${y + 0.75}A${RX} ${RY} 0 0 0 32.2 ${y + 0.75}`} fill="none" stroke="#fff" stroke-width=".45" opacity=".22" />
          </>
        );
        if (i >= lit) return <g key={i}>{cut}</g>;
        const c = TIER_RAMP[TIER_LADDER[i] ?? p.tier][1];
        return (
          <g key={i} class="ui-capicon__ring">
            {cut}
            <path d={d} fill="none" stroke={groove} stroke-width="1.7" opacity=".55" />
            <path d={d} fill="none" stroke={c} stroke-width=".95" />
            <circle cx="20" cy={y + RY} r="1.35" fill={c} stroke={OUTLINE} stroke-width=".55" />
            <circle cx="19.6" cy={y + RY - 0.45} r=".42" fill="#fff" opacity=".85" />
          </g>
        );
      })}
      <path d="M10.5 18.5v10" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".35" />
      {/* The brass band (crests) and the stone cap band (summit gems). */}
      <path d={band(11.5, 16)} fill="url(#cap-brass)" stroke={OUTLINE} stroke-width={line} />
      <path d={band(8, 11.5)} fill="url(#cap-stone)" stroke={OUTLINE} stroke-width={line} />
      <ellipse cx="20" cy="8" rx={RX} ry={RY} fill="#b9b2a3" stroke={OUTLINE} stroke-width={ink * 0.8} />
      <ellipse cx="20" cy="8" rx="7.5" ry="2" fill={ramp[1]} stroke={OUTLINE} stroke-width={line} />
      <ellipse cx="18" cy="7.6" rx="3" ry=".6" fill="#fff" opacity=".45" />
      {spread(summit, 7).map((x, g) => {
        const y = 9.75 + arcDrop(x);
        const c = TIER_RAMP[TIER_LADDER[DRUM_RINGS + g] ?? p.tier][1];
        return (
          <g key={`s${g}`} class="ui-capicon__summit">
            <path d={`M${x} ${y - 2.1}L${x + 2.1} ${y}L${x} ${y + 2.1}L${x - 2.1} ${y}Z`} fill={c} stroke={OUTLINE} stroke-width={line} stroke-linejoin="round" />
            <path d={`M${x - 0.9} ${y - 0.2}L${x} ${y - 1.2}`} stroke="#fff" stroke-width=".6" stroke-linecap="round" />
          </g>
        );
      })}
      {spread(crests, 6.6).map((x, c) => {
        const y = 13.6 + arcDrop(x);
        return (
          <g key={`c${c}`} class="ui-capicon__crestmark">
            <path
              d={`M${x - 2.2} ${y - 2.1}h4.4v2.2q0 1.9-2.2 2.8q-2.2-.9-2.2-2.8z`}
              fill={CREST_SHIELD}
              stroke={PARCHMENT}
              stroke-width={Math.max(0.45, line * 0.7)}
              stroke-linejoin="round"
            />
            <path d={star(x, y - 0.3, 1.55)} fill={RARITY_COLOR.legendary} />
          </g>
        );
      })}
    </Svg>
  );
}

/** The "★n" crest badge: n guaranteed Legendaries (the small form of the drum's crests). */
export function CrestBadge(p: { n: number }) {
  return (
    <span class="ui-capicon__crest" aria-hidden="true">
      ★{p.n}
    </span>
  );
}

/** One Legendary crest: the Legendary star on its dark enamel shield with a white-gold rim. */
export function CrestIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 3.5h14v7.2c0 5.4-3.6 8.2-7 9.8-3.4-1.6-7-4.4-7-9.8z" fill={CREST_SHIELD} stroke={PARCHMENT} stroke-width="1.5" stroke-linejoin="round" />
      <path d={star(12, 11, 5.2)} fill={RARITY_COLOR.legendary} />
    </Svg>
  );
}

/** The Wardrobe Crate: a banded wooden crate with brass corners and a violet seal (40 view). */
export function CrateIcon(p: IconProps) {
  const top = '#c0874c';
  const left = '#a8703f';
  const right = '#865631';
  return (
    <Svg {...p} view="0 0 40 40">
      <ellipse cx="20" cy="35" rx="14" ry="2.8" fill="#000" opacity=".28" />
      <Part d="M5 13.6 20 19.6V35L5 29Z" fill={left} band="M0 26 20 33 40 26V40H0Z" sw={2} />
      <Part d="M35 13.6 20 19.6V35L35 29Z" fill={right} band="M0 26 20 33 40 26V40H0Z" sw={2} />
      <Part d="M5 13.6 20 7.6 35 13.6 20 19.6Z" fill={top} hi="M9 13.6 20 9.2 23 10.4 12 14.8Z" sw={2} />
      <path d="M8 18.4 17 22M8 24.4 17 28M23 22 32 18.4M23 28 32 24.4M11 12.4 26 18.4M14 11.2 29 17.2" stroke={line(left)} stroke-width="1.1" stroke-linecap="round" />
      <path d="M5 13.6 8.6 15V19M35 13.6 31.4 15V19M20 31V35M5 25.6V29L8.4 30.4M35 25.6V29L31.6 30.4" fill="none" stroke="#e3b862" stroke-width="2" stroke-linejoin="round" />
      <Part d="M17 21.2 23 21.2 22.6 26.2 20 27.6 17.4 26.2Z" fill="#9b5cf6" band={24.8} hi="M18 22 19.6 22 19.2 24.2 18.2 23.8Z" sw={1.4} />
    </Svg>
  );
}

/**
 * Rarity gems (ui-plan 3.5): the shape carries the rarity without colour (A3): Common a circle, Rare
 * a rhombus, Epic a hexagon, Legendary a five-point star, each in its A10 colour.
 */
export function RarityGem(p: IconProps & { rarity: Rarity }) {
  const c = RARITY_COLOR[p.rarity];
  return (
    <Svg {...p}>
      {p.rarity === 'common' ? (
        <>
          <circle cx="12" cy="12" r="7.6" {...F(c)} />
          <path d="M8.6 9.6a4.2 4.2 0 0 1 3-2.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none" />
        </>
      ) : p.rarity === 'rare' ? (
        <>
          <path d="M12 2.8 20.2 12 12 21.2 3.8 12z" {...F(c)} />
          <path d="M3.8 12h16.4M12 2.8v18.4" stroke={OUTLINE} stroke-width="0.9" opacity=".45" />
          <path d="M7.2 11 11 6.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
        </>
      ) : p.rarity === 'epic' ? (
        <>
          <path d="M12 2.6 20.2 7.3v9.4L12 21.4l-8.2-4.7V7.3z" {...F(c)} />
          <path d="M12 7.2 16.1 9.6v4.8L12 16.8l-4.1-2.4V9.6z" fill="none" stroke={OUTLINE} stroke-width="0.9" opacity=".5" />
          <path d="M6.2 8.8 11 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
        </>
      ) : (
        <>
          <path d="M12 2.4 14.8 8.6l6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" {...F(c)} />
          <path d="M9.6 8.9 12 4.8" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
        </>
      )}
    </Svg>
  );
}

/** Undo (a curved arrow back), for the Army header (ui-plan 4.2). */
export function UndoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 9H15a5 5 0 0 1 0 10h-4" fill="none" stroke={OUTLINE} stroke-width="4.2" stroke-linecap="round" />
      <path d="M8.5 9H15a5 5 0 0 1 0 10h-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      <path d="M9.5 3.8 3.8 9l5.7 5.2z" fill="currentColor" {...O} />
    </Svg>
  );
}

/** Filter (a funnel), for grids with filters and sort (ui-plan 3.5 "System"). */
export function FilterIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 4.5h17l-6.6 7.8v6.4l-3.8 2v-8.4z" fill="currentColor" {...O} />
      <path d="M6.5 6.5h6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".7" />
    </Svg>
  );
}

/** Who beats whom: three class discs on a ring of arrows (the counter legend, ui-plan 4.2). */
export function CountersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.8 5.6 17.6 12M16 16.9H8M6.4 12l3.8-6.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="12" cy="4.6" r="3" {...F('#E69F00')} />
      <circle cx="18.6" cy="16.8" r="3" {...F('#0072B2')} />
      <circle cx="5.4" cy="16.8" r="3" {...F('#D55E00')} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------------------------
// The online-first Battle hub and the battle lengths (2026-10-01)
// ---------------------------------------------------------------------------------------------

/** Last Base Standing (A2.10.1), the "no clock" length: an hourglass with an infinity loop. */
export function LastBaseIcon(p: IconProps) {
  const wood = '#9a6a3c';
  const glass = '#cfe6f2';
  const sand = '#e8b84a';
  return (
    <Svg {...p}>
      <Part d="M5.6 4.4Q5.6 9.4 9.8 11.6Q5.6 13.8 5.6 18.8H15.8Q15.8 13.8 11.6 11.6Q15.8 9.4 15.8 4.4Z" fill={glass} hi="M7.2 5.4H8.2Q8.2 8.6 9.6 10.4Q7.4 9.4 7.2 5.4Z" sw={1.3} />
      <path d="M7.6 7.6Q10.7 8.6 13.8 7.6Q13.2 9.6 10.7 11Q8.2 9.6 7.6 7.6Z M7.2 18.6Q7.6 15.6 10.7 14.6Q13.8 15.6 14.2 18.6Z" fill={sand} />
      <path d="M10.7 11V14.6" stroke={sand} stroke-width=".9" />
      <Part d={rrect(3.8, 2.4, 13.8, 2.6, 1)} fill={wood} band={4.2} sw={1.3} />
      <Part d={rrect(3.8, 18.4, 13.8, 2.6, 1)} fill={wood} band={20.2} sw={1.3} />
      <Line2 d="M14.6 16.4C14.6 14.6 17.2 14.6 18.4 16.4S22.2 18.2 22.2 16.4 19.6 14.6 18.4 16.4 14.6 18.2 14.6 16.4Z" color="#7fd3e6" w={1.5} edge={2} />
    </Svg>
  );
}

/** A person (the Player chip on a human nameplate online, A16.21; never on a bot). */
export function PlayerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4.2" {...F('#ffd9a8')} />
      <path d="M4.2 21a7.8 7.8 0 0 1 15.6 0z" {...F('#3fc27a')} />
    </Svg>
  );
}

/** Two people side by side: Friend Duel and, later, Friends (no team colours). */
export function FriendsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <Part d="M10.6 21.2A5.4 5.4 0 0 1 21.4 21.2Z" fill="#8b5cf6" band={20.2} />
      <Part d={circ(16, 9.6, 3.5)} fill="#e0a97c" mat="skin" band={11} hi={circ(14.8, 8.4, 0.9)} />
      <path d="M12.6 9Q13 5.8 16 5.8Q19.2 5.8 19.4 9Q17.6 7.6 16.2 8.2Q14.4 7.4 12.6 9Z" {...F('#3b2a20', 1.2)} />
      <Part d="M2.4 21.6A6.2 6.2 0 0 1 14.8 21.6Z" fill="#3fae6a" band={20.4} />
      <Part d={circ(8.6, 10.4, 4)} fill="#f7d7b5" mat="skin" band={12} hi={circ(7.2, 9, 1)} />
      <path d="M4.6 10Q4.6 6 8.6 6Q12.6 6 12.6 9.6Q10.6 8 8.2 8.6Q6.4 8 4.6 10Z" {...F('#c9772e', 1.2)} />
    </Svg>
  );
}

/** A globe: Online Battle. */
export function GlobeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.2" {...F('#2f9df6')} />
      <path d="M6 7.5c2.2.6 3 2.3 2 3.8-.9 1.4.4 2.8 1.8 3 1.3.3 1.1 2.4.4 4.3M14.2 3.4c-.6 1.5.2 2.6 1.6 2.9 1.6.3 1.6 2.3 3.6 2.2M15 20.2c.2-1.6 1-2.6 2.6-2.8 1.2-.2 1.7-1 2.2-2" fill="none" stroke="#3fc27a" stroke-width="2.6" stroke-linecap="round" />
      <path d="M7 5.6a8 8 0 0 1 4-1.6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7" />
    </Svg>
  );
}

/** Caret pointing down (a chooser opens). */
export function CaretIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

/** Chevron for steppers (`left` mirrors it). */
export function ChevronIcon(p: IconProps & { left?: boolean }) {
  const d = p.left ? 'M14.5 6 8.5 12l6 6' : 'M9.5 6l6 6-6 6';
  return (
    <Svg {...p}>
      <path d={d} fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d={d} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

/** Share (an arrow leaving a tray). */
export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12v7.5h14V12" fill="none" stroke={OUTLINE} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5 12v7.5h14V12" fill="none" stroke="#e8eef7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 15V3.5M7.6 7.6 12 3.2l4.4 4.4" fill="none" stroke={OUTLINE} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 15V3.5M7.6 7.6 12 3.2l4.4 4.4" fill="none" stroke="#5ad1ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

/** A compass (the search, MR-121): the needle turns slowly while searching. */
export function CompassIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.4" {...F('#f1e6c4')} />
      <circle cx="12" cy="12" r="6.8" fill="none" stroke="#c9b27a" stroke-width="1.2" />
      <g class="ui-compass__needle">
        <path d="M12 4.6 14.2 12H9.8z" {...F('#e05a3c')} />
        <path d="M12 19.4 9.8 12h4.4z" {...F('#5a6478')} />
      </g>
      <circle cx="12" cy="12" r="1.3" fill={OUTLINE} />
    </Svg>
  );
}

/** Connection strength: 1-3 lit bars (online VS, A16.21). */
export function SignalIcon(p: IconProps & { bars: 1 | 2 | 3 }) {
  return (
    <Svg {...p}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={4 + i * 6} y={15 - i * 5} width="4.4" height={6 + i * 5} rx="1.2" fill={i < p.bars ? '#3fc27a' : '#4a5468'} {...O} />
      ))}
    </Svg>
  );
}
