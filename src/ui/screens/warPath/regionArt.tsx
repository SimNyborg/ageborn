/**
 * The War Path region backdrops (ui-plan 4.1, 3.7): one landscape per age, drawn as layered SVG so
 * the map looks finished before the art track paints `ui.warpath.region.<ageId>.*` (the CSS-only
 * fallback 3.7 asks for). Two layers per region:
 *
 * - **Far** (parallax, slower): the sky with its light, two hazy ridges and the age's skyline
 *   landmark (a smoking volcano, a temple over the sea, a castle, a star fort with tall ships,
 *   factories, a city, spires, a ringed planet).
 * - **Ground** (moves with the road): the ground plane with soft patches and props of the age
 *   placed beside the road, never on it (trees, huts, columns, windmills, chimneys, pylons,
 *   crystals), each with a contact shadow and a top-left highlight (one light, 3.7).
 *
 * Deterministic per age (cosmetic RNG), decorative only (`aria-hidden`). Ambient life (smoke,
 * turning blades, twinkles, flickers) is CSS animation that the reduce-motion rules still.
 */
import type { AgeId } from '@/contracts';
import { fnv1a32, mulberry32 } from '@/core';
import type { ComponentChildren } from 'preact';

export interface RegionTheme {
  skyTop: string;
  skyBottom: string;
  /** The low sun or glow. */
  sun: string;
  far1: string;
  far2: string;
  groundTop: string;
  groundBottom: string;
  /** Lighter and darker ground patches. */
  patchLight: string;
  patchDark: string;
  /** Foliage or prop body colour and its lit side. */
  body: string;
  lit: string;
  /** Accent (roofs, flags, glows). */
  accent: string;
  /** Road bed and its edge. */
  road: string;
  roadEdge: string;
}

export const REGION_THEMES: Readonly<Record<AgeId, RegionTheme>> = {
  stone: {
    skyTop: '#2c3550', skyBottom: '#d9955a', sun: '#ffc27a', far1: '#6b5a66', far2: '#4a3f4c',
    groundTop: '#5f6b3a', groundBottom: '#2c351d', patchLight: '#7a8646', patchDark: '#3e4826',
    body: '#2f4a2a', lit: '#5d7f3f', accent: '#c8733a', road: '#b89a6a', roadEdge: '#5a4630',
  },
  bronze: {
    skyTop: '#27456e', skyBottom: '#e8c07e', sun: '#fff0b8', far1: '#7c8fa0', far2: '#5b6f80',
    groundTop: '#9a8a4e', groundBottom: '#4b4424', patchLight: '#b7a760', patchDark: '#6d6334',
    body: '#56683a', lit: '#8fa25a', accent: '#e9e1cc', road: '#d8c79a', roadEdge: '#6f5d38',
  },
  medieval: {
    skyTop: '#2b3f5c', skyBottom: '#a9c0c6', sun: '#fff3c9', far1: '#5b7486', far2: '#415b68',
    groundTop: '#4f7a3a', groundBottom: '#233c1c', patchLight: '#6e9a4a', patchDark: '#35592a',
    body: '#2c4d25', lit: '#5f8d3e', accent: '#b8453a', road: '#b69c72', roadEdge: '#5a4631',
  },
  gunpowder: {
    skyTop: '#23385a', skyBottom: '#e3a066', sun: '#ffd49a', far1: '#5e7483', far2: '#3f5664',
    groundTop: '#6f7a44', groundBottom: '#343a20', patchLight: '#8c954f', patchDark: '#4d5530',
    body: '#3d5530', lit: '#6f8a45', accent: '#e6dcc2', road: '#c1a57a', roadEdge: '#5e4a33',
  },
  industrial: {
    skyTop: '#2a2a33', skyBottom: '#b98d62', sun: '#ffbe6e', far1: '#5c5652', far2: '#403c3a',
    groundTop: '#5b5842', groundBottom: '#2a2820', patchLight: '#716c50', patchDark: '#3f3c2e',
    body: '#5a3e32', lit: '#8b5e45', accent: '#d7823b', road: '#8c8272', roadEdge: '#3c362e',
  },
  modern: {
    skyTop: '#1d2436', skyBottom: '#6e7f8f', sun: '#e6eef2', far1: '#465463', far2: '#323d49',
    groundTop: '#4d5642', groundBottom: '#252a22', patchLight: '#646e55', patchDark: '#373e30',
    body: '#434b52', lit: '#6c7780', accent: '#e05a3c', road: '#7b7d78', roadEdge: '#34362f',
  },
  future: {
    skyTop: '#0f1630', skyBottom: '#3c5a8c', sun: '#9fd8ff', far1: '#2c3f66', far2: '#1f2d4c',
    groundTop: '#2d4050', groundBottom: '#121b26', patchLight: '#3c5566', patchDark: '#1d2b37',
    body: '#34506a', lit: '#6fa8c8', accent: '#5ff2ff', road: '#8aa3b5', roadEdge: '#23364a',
  },
  cosmic: {
    skyTop: '#07061a', skyBottom: '#3a2466', sun: '#d8b8ff', far1: '#34245a', far2: '#241a44',
    groundTop: '#3b2d5a', groundBottom: '#150f28', patchLight: '#4d3b72', patchDark: '#271d42',
    body: '#4a3a7c', lit: '#9d7cf0', accent: '#f5b82e', road: '#a497c8', roadEdge: '#2a2048',
  },
};

type Rng = ReturnType<typeof mulberry32>;

/** A smooth ridge path from seeded heights, closed to `bottom`. */
function ridge(rng: Rng, w: number, base: number, amp: number, step: number, bottom: number): string {
  const pts: [number, number][] = [];
  for (let x = -step; x <= w + step; x += step) pts.push([x, base - rng.next() * amp]);
  let d = `M${pts[0]![0]} ${bottom} L${pts[0]![0]} ${pts[0]![1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    d += ` Q${x0} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1]!;
  return `${d} L${last[0]} ${last[1].toFixed(1)} L${last[0]} ${bottom} Z`;
}

/** A jagged mountain range (Stone Age, crystal peaks). */
function peaks(rng: Rng, w: number, base: number, amp: number, step: number, bottom: number): string {
  let d = `M${-step} ${bottom} L${-step} ${base}`;
  for (let x = -step; x <= w + step; x += step) {
    const top = base - amp * (0.45 + rng.next() * 0.55);
    d += ` L${(x + step * 0.5).toFixed(1)} ${top.toFixed(1)} L${(x + step).toFixed(1)} ${(base - rng.next() * amp * 0.25).toFixed(1)}`;
  }
  return `${d} L${w + step * 2} ${bottom} Z`;
}

// ---------------------------------------------------------------------------------------------
// Far skylines (one landmark per age)
// ---------------------------------------------------------------------------------------------

function Smoke(p: { x: number; y: number; s: number; color: string; n?: number }) {
  return (
    <g class="wp-smoke" transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
      {Array.from({ length: p.n ?? 4 }, (_, i) => (
        <circle key={i} class="wp-smoke__puff" cx="0" cy="0" r={10 + i * 3} fill={p.color} style={{ animationDelay: `${-i * 1.1}s` }} />
      ))}
    </g>
  );
}

function Skyline(p: { age: AgeId; w: number; h: number; hz: number; t: RegionTheme; rng: Rng }): ComponentChildren {
  const { w, hz, t, rng } = p;
  const out: ComponentChildren[] = [];
  const spots = Math.max(1, Math.round(w / 700));
  for (let k = 0; k < spots; k++) {
    const x = ((k + 0.35 + rng.next() * 0.3) * w) / spots;
    const s = Math.max(0.6, Math.min(1.2, p.h / 420));
    const key = `${p.age}-${k}`;
    switch (p.age) {
      case 'stone':
        out.push(
          <g key={key} transform={`translate(${x} ${hz}) scale(${s})`}>
            <path d="M-120 0 L-34 -118 L-18 -112 L-8 -121 L6 -114 L96 0 Z" fill={t.far2} />
            <path d="M-34 -118 L-18 -112 L-8 -121 L6 -114 L-6 -70 L-24 -60 Z" fill={t.far1} opacity=".7" />
            <path d="M-18 -114 q8 -8 20 -2" stroke={t.accent} stroke-width="4" fill="none" opacity=".9" />
            <Smoke x={-8} y={-128} s={1.1} color="#8a7d80" n={5} />
          </g>,
        );
        break;
      case 'bronze':
        out.push(
          <g key={key} transform={`translate(${x} ${hz}) scale(${s})`}>
            <path d="M-150 0 Q-60 -64 20 -56 Q100 -50 150 0 Z" fill={t.far2} />
            <g fill={t.accent} opacity=".92">
              <path d="M-44 -66 L0 -88 L44 -66 Z" />
              <rect x="-42" y="-66" width="84" height="5" />
              {[-36, -22, -8, 6, 20, 34].map((cx) => (
                <rect key={cx} x={cx - 2.5} y="-61" width="5" height="26" />
              ))}
              <rect x="-46" y="-35" width="92" height="5" />
            </g>
            <path d="M-44 -66 L0 -88 L0 -66 Z" fill="#fff" opacity=".25" />
          </g>,
        );
        break;
      case 'medieval':
        out.push(
          <g key={key} transform={`translate(${x} ${hz}) scale(${s})`}>
            <path d="M-160 0 Q-40 -60 60 -52 Q140 -44 170 0 Z" fill={t.far2} />
            <g fill="#5d6776">
              <rect x="-50" y="-96" width="100" height="46" />
              <rect x="-62" y="-122" width="24" height="72" />
              <rect x="38" y="-122" width="24" height="72" />
              <rect x="-14" y="-140" width="28" height="90" />
              <path d="M-66 -122 L-50 -142 L-34 -122 Z M34 -122 L50 -142 L66 -122 Z M-18 -140 L0 -164 L18 -140 Z" fill="#3f4856" />
            </g>
            <path d="M-50 -96 h100 v8 h-100 z" fill="#8792a3" opacity=".6" />
            <path d="M0 -164 v-16" stroke="#3f4856" stroke-width="2.5" />
            <path class="wp-flag" d="M1 -180 h16 l-4 5 l4 5 h-16 z" fill={t.accent} />
          </g>,
        );
        break;
      case 'gunpowder':
        out.push(
          <g key={key} transform={`translate(${x} ${hz}) scale(${s})`}>
            <path d="M-110 0 L-80 -26 L-30 -20 L0 -34 L30 -20 L80 -26 L110 0 Z" fill="#6b6a62" />
            <path d="M-80 -26 L-30 -20 L0 -34" stroke="#9b998c" stroke-width="3" fill="none" />
            <g transform="translate(150 -2)" class="wp-bob">
              <path d="M-40 0 h80 l-12 14 h-56 z" fill="#4a3526" />
              <path d="M-14 0 v-70 M16 0 v-56" stroke="#3b2a1e" stroke-width="3" />
              <path d="M-12 -66 q22 12 0 26 z M-12 -38 q26 10 0 30 z M18 -52 q18 10 0 22 z M18 -28 q20 8 0 22 z" fill={t.accent} />
            </g>
          </g>,
        );
        break;
      case 'industrial':
        out.push(
          <g key={key} transform={`translate(${x} ${hz}) scale(${s})`}>
            <g fill="#4d3f38">
              <rect x="-110" y="-46" width="90" height="46" />
              <path d="M-110 -46 l15 -14 l15 14 l15 -14 l15 14 l15 -14 l15 14 z" />
              <rect x="-14" y="-62" width="70" height="62" />
              <rect x="-6" y="-120" width="10" height="60" />
              <rect x="22" y="-104" width="10" height="44" />
              <rect x="70" y="-40" width="50" height="40" />
            </g>
            <g fill="#ffbe6e" opacity=".75">
              {[-100, -86, -72, -58, -44].map((cx) => (
                <rect key={cx} x={cx} y="-30" width="6" height="8" />
              ))}
              {[-4, 10, 24, 38].map((cx) => (
                <rect key={cx} x={cx} y="-44" width="6" height="8" />
              ))}
            </g>
            <Smoke x={-1} y={-126} s={1.2} color="#6d6560" n={5} />
            <Smoke x={27} y={-110} s={0.9} color="#7a716a" n={4} />
          </g>,
        );
        break;
      case 'modern':
        out.push(
          <g key={key} transform={`translate(${x} ${hz}) scale(${s})`}>
            {[
              [-130, 40, 70],
              [-86, 34, 110],
              [-48, 46, 84],
              [2, 30, 140],
              [36, 44, 96],
              [84, 36, 70],
              [124, 30, 52],
            ].map(([bx, bw, bh], i) => (
              <g key={i}>
                <rect x={bx} y={-bh!} width={bw} height={bh} fill={i % 2 ? '#39444f' : '#2f3943'} />
                {Array.from({ length: Math.floor(bh! / 16) }, (_, r) => (
                  <rect key={r} x={bx! + 6} y={-bh! + 8 + r * 16} width={bw! - 12} height="3" fill="#f4d28a" opacity={(r + i) % 3 ? 0.18 : 0.55} />
                ))}
              </g>
            ))}
            <path d="M17 -140 v-40" stroke="#2f3943" stroke-width="3" />
            <circle class="wp-blink" cx="17" cy="-181" r="3" fill="#ff4a3a" />
            <path class="wp-beam" d="M-60 -10 L-160 -260 L-120 -260 Z" fill="#fff6d0" opacity=".12" />
          </g>,
        );
        break;
      case 'future':
        out.push(
          <g key={key} transform={`translate(${x} ${hz}) scale(${s})`}>
            <path d="M-120 0 Q-80 -60 -40 0 Z" fill="#284466" />
            <path d="M-20 0 L-6 -170 L8 0 Z" fill="#35577e" />
            <path d="M-6 -170 L8 0 L2 0 Z" fill="#9fd8ff" opacity=".35" />
            <path d="M30 0 L40 -120 L52 0 Z" fill="#2c4a6e" />
            <path d="M70 0 Q110 -70 150 0 Z" fill="#2a4266" />
            <g class="wp-bob">
              <ellipse cx="-6" cy="-110" rx="46" ry="8" fill="none" stroke="#5ff2ff" stroke-width="2.5" opacity=".7" />
            </g>
            <path d="M-110 -30 h60 M60 -40 h80" stroke="#5ff2ff" stroke-width="2" opacity=".5" />
          </g>,
        );
        break;
      case 'cosmic':
        out.push(
          <g key={key} transform={`translate(${x} ${hz - p.h * 0.1}) scale(${s})`}>
            <circle cx="0" cy="-70" r="56" fill="#6b4fb0" />
            <circle cx="-16" cy="-86" r="40" fill="#8d6fd8" opacity=".55" />
            <ellipse cx="0" cy="-70" rx="104" ry="18" fill="none" stroke={t.accent} stroke-width="5" opacity=".75" transform="rotate(-14 0 -70)" />
            <circle cx="120" cy="-130" r="12" fill="#c9b8ff" />
            <circle cx="-150" cy="-40" r="7" fill="#e0d6ff" opacity=".8" />
          </g>,
        );
        break;
    }
  }
  return out;
}

/** Twinkling stars for the dark skies (Future, Cosmic) and a few for Modern. */
function Stars(p: { w: number; hz: number; rng: Rng; n: number }) {
  return (
    <g>
      {Array.from({ length: p.n }, (_, i) => (
        <circle
          key={i}
          class={i % 3 === 0 ? 'wp-twinkle' : undefined}
          cx={(p.rng.next() * p.w).toFixed(0)}
          cy={(p.rng.next() * p.hz * 0.9).toFixed(0)}
          r={(0.6 + p.rng.next() * 1.4).toFixed(1)}
          fill="#fff"
          opacity={(0.35 + p.rng.next() * 0.6).toFixed(2)}
          style={{ animationDelay: `${-(i % 7) * 0.6}s` }}
        />
      ))}
    </g>
  );
}

/** The far layer of a region: sky, sun glow, ridges and the age's landmark. */
export function RegionFar(p: { age: AgeId; w: number; h: number; horizon: number }) {
  const t = REGION_THEMES[p.age];
  const id = `wpf-${p.age}`;
  const rng = mulberry32(fnv1a32(`far:${p.age}`));
  const hz = p.horizon;
  const dark = p.age === 'future' || p.age === 'cosmic';
  return (
    <svg class="wp-art" width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={t.skyTop} />
          <stop offset={(hz / p.h).toFixed(3)} stop-color={t.skyBottom} />
          <stop offset="1" stop-color={t.skyBottom} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stop-color={t.sun} stop-opacity=".85" />
          <stop offset=".35" stop-color={t.sun} stop-opacity=".25" />
          <stop offset="1" stop-color={t.sun} stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width={p.w} height={p.h} fill={`url(#${id}-sky)`} />
      {dark || p.age === 'modern' ? <Stars w={p.w} hz={hz} rng={rng} n={dark ? Math.round(p.w / 14) : Math.round(p.w / 40)} /> : null}
      <circle cx={p.w * 0.62} cy={hz - 10} r={p.h * 0.55} fill={`url(#${id}-sun)`} />
      <path d={p.age === 'stone' || p.age === 'cosmic' ? peaks(rng, p.w, hz, p.h * 0.2, 90, p.h) : ridge(rng, p.w, hz, p.h * 0.14, 120, p.h)} fill={t.far1} opacity=".8" />
      {Skyline({ age: p.age, w: p.w, h: p.h, hz: hz + 4, t, rng })}
      <path d={ridge(rng, p.w, hz + 10, p.h * 0.07, 80, p.h)} fill={t.far2} />
      <rect y={hz - 6} width={p.w} height="24" fill={t.skyBottom} opacity=".22" />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Ground props
// ---------------------------------------------------------------------------------------------

function Shadow(p: { rx: number }) {
  return <ellipse cx="0" cy="0" rx={p.rx} ry={p.rx * 0.28} fill="#000" opacity=".28" />;
}

type Prop = (t: RegionTheme, v: number) => ComponentChildren;

const pine: Prop = (t) => (
  <g>
    <Shadow rx={14} />
    <rect x="-2.5" y="-10" width="5" height="10" fill="#4a3322" />
    <path d="M0 -58 L16 -18 L-16 -18 Z M0 -44 L19 -8 L-19 -8 Z" fill={t.body} />
    <path d="M0 -58 L-16 -18 L-4 -18 Z M0 -44 L-19 -8 L-6 -8 Z" fill={t.lit} opacity=".8" />
  </g>
);
const roundTree: Prop = (t) => (
  <g>
    <Shadow rx={16} />
    <rect x="-3" y="-16" width="6" height="16" fill="#4d3423" />
    <circle cx="0" cy="-30" r="17" fill={t.body} />
    <circle cx="-6" cy="-35" r="10" fill={t.lit} opacity=".75" />
    <circle cx="9" cy="-24" r="9" fill={t.body} />
  </g>
);
const cypress: Prop = (t) => (
  <g>
    <Shadow rx={8} />
    <path d="M0 -60 Q9 -30 6 0 H-6 Q-9 -30 0 -60 Z" fill={t.body} />
    <path d="M0 -60 Q-9 -30 -6 0 H-1 Q-3 -30 0 -60 Z" fill={t.lit} opacity=".7" />
  </g>
);
const boulder: Prop = () => (
  <g>
    <Shadow rx={14} />
    <path d="M-14 0 Q-16 -14 -4 -18 Q10 -20 14 -8 Q16 0 10 0 Z" fill="#7a7468" />
    <path d="M-12 -6 Q-12 -14 -3 -16 Q2 -12 -4 -8 Z" fill="#a39c8c" opacity=".8" />
  </g>
);
const tent: Prop = (t) => (
  <g>
    <Shadow rx={18} />
    <path d="M-18 0 L0 -30 L18 0 Z" fill="#8a6a48" />
    <path d="M-18 0 L0 -30 L-4 0 Z" fill="#b08a5e" />
    <path d="M-3 0 L0 -12 L3 0 Z" fill="#2a1d14" />
    <path d="M-4 -30 L2 -38 M4 -30 L-1 -37" stroke="#4a3322" stroke-width="2" />
    <circle class="wp-flicker" cx="24" cy="-3" r="4" fill={t.accent} />
  </g>
);
const bones: Prop = () => (
  <g>
    <Shadow rx={16} />
    <path d="M-16 0 Q-18 -24 -2 -30 M16 0 Q18 -22 4 -28" stroke="#e8dfc8" stroke-width="4" fill="none" stroke-linecap="round" />
    <ellipse cx="0" cy="-4" rx="9" ry="5" fill="#d8ceb6" />
  </g>
);
const column: Prop = (t) => (
  <g>
    <Shadow rx={10} />
    <rect x="-5" y="-34" width="10" height="34" fill={t.accent} />
    <rect x="-5" y="-34" width="4" height="34" fill="#fff" opacity=".35" />
    <rect x="-8" y="-38" width="16" height="5" fill={t.accent} />
    <rect x="-8" y="-3" width="16" height="3" fill="#b9b19b" />
  </g>
);
const whiteHouse: Prop = () => (
  <g>
    <Shadow rx={18} />
    <rect x="-16" y="-20" width="32" height="20" fill="#efe6d2" />
    <rect x="-16" y="-20" width="10" height="20" fill="#fff" opacity=".4" />
    <rect x="-18" y="-24" width="36" height="5" fill="#b24e32" />
    <rect x="-4" y="-12" width="7" height="12" fill="#4a6b8a" />
  </g>
);
const cottage: Prop = (t) => (
  <g>
    <Shadow rx={18} />
    <rect x="-15" y="-18" width="30" height="18" fill="#d9c9a4" />
    <path d="M-15 -18 h30 M-5 -18 v18 M5 -18 v18" stroke="#5b4028" stroke-width="2" />
    <path d="M-19 -17 L0 -34 L19 -17 Z" fill={t.accent} />
    <path d="M-19 -17 L0 -34 L0 -17 Z" fill="#fff" opacity=".18" />
    <rect x="8" y="-38" width="5" height="10" fill="#6a5a50" />
  </g>
);
const hay: Prop = () => (
  <g>
    <Shadow rx={12} />
    <path d="M-12 0 Q-12 -18 0 -20 Q12 -18 12 0 Z" fill="#d6b35a" />
    <path d="M-8 -4 Q-6 -14 0 -16" stroke="#f0d888" stroke-width="2" fill="none" />
  </g>
);
const windmill: Prop = (t) => (
  <g>
    <Shadow rx={14} />
    <path d="M-10 0 L-6 -40 H6 L10 0 Z" fill="#d8ccb2" />
    <path d="M-10 0 L-6 -40 H-1 L-2 0 Z" fill="#fff" opacity=".35" />
    <path d="M-8 -40 L0 -50 L8 -40 Z" fill={t.roadEdge} />
    <g class="wp-blades" transform="translate(0 -40)">
      <g>
        <path d="M0 0 L3 -26 L9 -26 L2 0 Z M0 0 L26 3 L26 9 L0 2 Z M0 0 L-3 26 L-9 26 L-2 0 Z M0 0 L-26 -3 L-26 -9 L0 -2 Z" fill="#f2ead8" stroke="#5a4631" stroke-width="1" />
      </g>
    </g>
  </g>
);
const cannon: Prop = () => (
  <g>
    <Shadow rx={14} />
    <rect x="-12" y="-13" width="26" height="7" rx="3" fill="#2d2d30" transform="rotate(-12)" />
    <circle cx="-4" cy="-4" r="5" fill="#6b4a2c" />
    <circle cx="-4" cy="-4" r="2" fill="#3b2a1e" />
  </g>
);
const barrels: Prop = () => (
  <g>
    <Shadow rx={14} />
    <rect x="-13" y="-14" width="11" height="14" rx="2" fill="#7a5433" />
    <rect x="1" y="-14" width="11" height="14" rx="2" fill="#6b4a2c" />
    <rect x="-6" y="-26" width="11" height="12" rx="2" fill="#835a37" />
    <path d="M-13 -9 h25 M-6 -21 h11" stroke="#3b2a1e" stroke-width="1.5" />
  </g>
);
const chimney: Prop = (t) => (
  <g>
    <Shadow rx={20} />
    <rect x="-20" y="-18" width="30" height="18" fill={t.body} />
    <rect x="-20" y="-18" width="9" height="18" fill={t.lit} opacity=".6" />
    <rect x="4" y="-44" width="8" height="30" fill="#4a352c" />
    <rect x="-14" y="-10" width="5" height="5" fill="#ffbe6e" opacity=".8" />
    <Smoke x={8} y={-50} s={0.45} color="#7d746c" n={3} />
  </g>
);
const lamp: Prop = () => (
  <g>
    <Shadow rx={6} />
    <path d="M0 0 V-36 Q0 -40 6 -40" stroke="#2b2b2e" stroke-width="2.5" fill="none" />
    <circle class="wp-flicker" cx="7" cy="-37" r="3.5" fill="#ffd27a" />
  </g>
);
const crates: Prop = () => (
  <g>
    <Shadow rx={14} />
    <rect x="-14" y="-12" width="12" height="12" fill="#9a7445" />
    <rect x="-1" y="-12" width="12" height="12" fill="#8a6a3e" />
    <rect x="-8" y="-24" width="12" height="12" fill="#a57c4a" />
    <path d="M-14 -12 l12 12 M-1 -12 l12 12 M-8 -24 l12 12" stroke="#5c4428" stroke-width="1.2" />
  </g>
);
const sandbags: Prop = () => (
  <g>
    <Shadow rx={18} />
    {[-12, 0, 12].map((x) => (
      <ellipse key={x} cx={x} cy="-5" rx="7" ry="5" fill="#a8956a" />
    ))}
    {[-6, 6].map((x) => (
      <ellipse key={x} cx={x} cy="-13" rx="7" ry="5" fill="#bba678" />
    ))}
  </g>
);
const mast: Prop = () => (
  <g>
    <Shadow rx={8} />
    <path d="M-7 0 L0 -54 L7 0 M-5 -14 h10 M-3 -30 h6" stroke="#5c646c" stroke-width="2" fill="none" />
    <circle class="wp-blink" cx="0" cy="-56" r="2.5" fill="#ff4a3a" />
  </g>
);
const block: Prop = (t) => (
  <g>
    <Shadow rx={18} />
    <rect x="-16" y="-34" width="28" height="34" fill={t.body} />
    <rect x="-16" y="-34" width="9" height="34" fill={t.lit} opacity=".45" />
    {[-28, -20, -12].map((y) => (
      <rect key={y} x="-12" y={y} width="20" height="3" fill="#f4d28a" opacity=".45" />
    ))}
  </g>
);
const pylon: Prop = (t) => (
  <g>
    <Shadow rx={10} />
    <path d="M-6 0 L0 -44 L6 0 Z" fill={t.body} />
    <circle class="wp-twinkle" cx="0" cy="-46" r="4" fill={t.accent} />
    <path d="M-3 -10 h6 M-2 -22 h4" stroke={t.accent} stroke-width="1.5" opacity=".8" />
  </g>
);
const dome: Prop = (t) => (
  <g>
    <Shadow rx={20} />
    <path d="M-20 0 A20 20 0 0 1 20 0 Z" fill={t.body} />
    <path d="M-14 -6 A14 14 0 0 1 0 -18" stroke="#bfefff" stroke-width="2" fill="none" opacity=".6" />
    <rect x="-4" y="-7" width="8" height="7" fill={t.accent} opacity=".7" />
  </g>
);
const crystal: Prop = (t, v) => (
  <g>
    <Shadow rx={12} />
    <path d={`M-10 0 L-6 -${22 + v * 10} L-2 0 Z M-3 0 L2 -${32 + v * 12} L7 0 Z M5 0 L10 -18 L13 0 Z`} fill={t.lit} />
    <path d={`M-6 -${22 + v * 10} L-2 0 L-4 0 Z M2 -${32 + v * 12} L7 0 L4 0 Z`} fill="#fff" opacity=".45" />
  </g>
);
const shroom: Prop = (t) => (
  <g>
    <Shadow rx={10} />
    <rect x="-2" y="-14" width="4" height="14" fill="#cdbdf0" />
    <path class="wp-twinkle" d="M-11 -13 Q0 -28 11 -13 Z" fill={t.accent} opacity=".85" />
  </g>
);

const PROPS: Readonly<Record<AgeId, readonly Prop[]>> = {
  stone: [pine, pine, boulder, tent, bones, pine],
  bronze: [roundTree, cypress, column, whiteHouse, cypress, roundTree],
  medieval: [roundTree, cottage, hay, pine, roundTree, cottage],
  gunpowder: [windmill, cannon, barrels, roundTree, roundTree, cottage],
  industrial: [chimney, lamp, crates, chimney, lamp, crates],
  modern: [sandbags, mast, block, sandbags, block, lamp],
  future: [pylon, dome, pylon, dome, crystal, pylon],
  cosmic: [crystal, shroom, crystal, shroom, crystal, crystal],
};

/**
 * The ground layer of a region: the ground plane from the horizon down, soft patches, and props
 * placed beside the road (never within `clear` px of it). `roadY(x)` is the road's centre at x in
 * this layer's coordinates.
 */
export function RegionGround(p: { age: AgeId; w: number; h: number; horizon: number; roadY: (x: number) => number; clear: number; bottomClear: number }) {
  const t = REGION_THEMES[p.age];
  const id = `wpg-${p.age}`;
  const rng = mulberry32(fnv1a32(`ground:${p.age}`));
  const hz = p.horizon;
  const patches: ComponentChildren[] = [];
  const nPatches = Math.round(p.w / 90);
  for (let i = 0; i < nPatches; i++) {
    const x = rng.next() * p.w;
    const y = hz + 20 + rng.next() * (p.h - hz - 20);
    const rx = 40 + rng.next() * 90;
    patches.push(<ellipse key={i} cx={x.toFixed(0)} cy={y.toFixed(0)} rx={rx.toFixed(0)} ry={(rx * 0.22).toFixed(0)} fill={i % 2 ? t.patchLight : t.patchDark} opacity=".45" />);
  }
  const props: { x: number; y: number; s: number; f: Prop; v: number }[] = [];
  const list = PROPS[p.age];
  const step = 46;
  for (let x = 12; x < p.w - 12; x += step * (0.6 + rng.next() * 0.9)) {
    const ry = p.roadY(x);
    const above = rng.next() < 0.55;
    const top = hz + 24;
    const bottom = p.h - p.bottomClear;
    const y = above ? ry - p.clear - rng.next() * Math.max(10, ry - p.clear - top) : ry + p.clear + 16 + rng.next() * Math.max(10, bottom - ry - p.clear);
    if (y < top || y > bottom + 40) continue;
    const depth = (y - hz) / Math.max(1, p.h - hz);
    props.push({ x, y, s: 0.55 + depth * 0.75, f: list[Math.floor(rng.next() * list.length)]!, v: rng.next() });
  }
  props.sort((a, b) => a.y - b.y);
  return (
    <svg class="wp-art" width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset={(hz / p.h).toFixed(3)} stop-color={t.groundTop} />
          <stop offset="1" stop-color={t.groundBottom} />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={t.skyBottom} stop-opacity=".55" />
          <stop offset="1" stop-color={t.skyBottom} stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0 ${hz + 14} Q${p.w * 0.25} ${hz + 4} ${p.w * 0.5} ${hz + 12} T${p.w} ${hz + 10} V${p.h} H0 Z`} fill={`url(#${id}-g)`} />
      {patches}
      <rect y={hz} width={p.w} height="40" fill={`url(#${id}-haze)`} />
      {props.map((q, i) => (
        <g key={i} transform={`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) scale(${q.s.toFixed(2)})`}>
          {q.f(t, q.v)}
        </g>
      ))}
    </svg>
  );
}
