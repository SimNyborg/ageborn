/**
 * The War Path's richer scenery (owner decision 2026-09-30: "the path looks far too simple"): per
 * region, rolling hills under the horizon, a body of water (a lake with reeds, a sea shore with boats,
 * a river, a canal, an energy channel, a star-void), and two landmark set pieces beside the road (a
 * cave camp and a mammoth skeleton, a temple and a statue, a keep and a tourney camp, a star fort and
 * a windmill farm, a factory and a railway, a radar and a helipad, a floating platform and a beacon,
 * a portal and floating rocks). Drawn in the same A11 cartoon language as `regionArt.tsx`: flat fills,
 * a dark outline, a top-left light, contact shadows. Ambient life (water shimmer, smoke, fire, turning
 * radar and rotor, the train, bobbing boats and platforms, a portal's swirl) is CSS and stills under
 * reduce motion. Deterministic per region; decorative (`aria-hidden` through the parent SVG).
 */
import type { AgeId } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { ink, shade } from '../../components/tone';
import { Cel, Contact } from './propKit';
import type { RegionTheme } from './regionArt';

type Rng = { next(): number };

const INK = '#1b1712';

// ---------------------------------------------------------------------------------------------
// Hills: rounded mounds just under the horizon, lit on their left
// ---------------------------------------------------------------------------------------------

export function Hills(p: { w: number; hz: number; t: RegionTheme; rng: Rng }) {
  const n = Math.max(3, Math.round(p.w / 260));
  const out: ComponentChildren[] = [];
  for (let i = 0; i < n; i++) {
    const cx = ((i + 0.2 + p.rng.next() * 0.6) * p.w) / n;
    const rx = 90 + p.rng.next() * 110;
    const ry = 18 + p.rng.next() * 16;
    const cy = p.hz + 20 + p.rng.next() * 10;
    out.push(
      <g key={i}>
        <ellipse cx={cx.toFixed(0)} cy={cy.toFixed(0)} rx={rx.toFixed(0)} ry={ry.toFixed(0)} fill={p.t.patchDark} opacity=".55" />
        <ellipse cx={(cx - rx * 0.18).toFixed(0)} cy={(cy - ry * 0.35).toFixed(0)} rx={(rx * 0.62).toFixed(0)} ry={(ry * 0.5).toFixed(0)} fill={p.t.patchLight} opacity=".35" />
      </g>,
    );
  }
  return <g>{out}</g>;
}

// ---------------------------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------------------------

const WATER: Readonly<Record<AgeId, { deep: string; light: string; kind: 'lake' | 'shore' | 'river' }>> = {
  stone: { deep: '#2f5b6e', light: '#7fb6c8', kind: 'lake' },
  bronze: { deep: '#1f5f86', light: '#8fd0f0', kind: 'shore' },
  medieval: { deep: '#2c5f7a', light: '#9ccbe0', kind: 'river' },
  gunpowder: { deep: '#24587a', light: '#9ad0ea', kind: 'shore' },
  industrial: { deep: '#3a4a4a', light: '#8a9a90', kind: 'river' },
  modern: { deep: '#2c4a5e', light: '#8fb2c6', kind: 'lake' },
  future: { deep: '#123a5a', light: '#5ff2ff', kind: 'river' },
  cosmic: { deep: '#1a1238', light: '#c9b8ff', kind: 'lake' },
};

function Shimmer(p: { x: number; y: number; w: number; color: string; n?: number }) {
  return (
    <g class="wp-shimmer">
      {Array.from({ length: p.n ?? 4 }, (_, i) => (
        <path
          key={i}
          d={`M${(p.x + ((i * 0.27) % 1) * p.w - p.w / 2).toFixed(0)} ${(p.y + (i % 3) * 6 - 6).toFixed(0)} h${(10 + (i % 3) * 8).toFixed(0)}`}
          stroke={p.color}
          stroke-width="2"
          stroke-linecap="round"
          style={{ animationDelay: `${-i * 0.7}s` }}
        />
      ))}
    </g>
  );
}

function Boat(p: { x: number; y: number; s: number; sail: string }) {
  return (
    <g transform={`translate(${p.x.toFixed(0)} ${p.y.toFixed(0)}) scale(${p.s.toFixed(2)})`}>
      <g class="wp-boat">
        <Cel d="M-22 0 H22 L14 10 H-14Z" fill="#7a5433" band={5} hi="M-18 1.4 H18 V3 H-18Z" sw={1.5} />
        <path d="M0 0 V-34" stroke={ink('#5a3a24')} stroke-width="3.6" />
        <path d="M0 0 V-34" stroke="#6b4a2c" stroke-width="2" />
        <Cel d="M2 -32 Q20 -20 2 -4Z" fill={p.sail} band="M8 -40H30V0H8Z" sw={1.3} />
        <Cel d="M-2 -26 Q-14 -16 -2 -4Z" fill="#f0e6cc" band="M-6 -30H-20V0H-6Z" sw={1.3} />
      </g>
    </g>
  );
}

/**
 * A region's water. Lakes and rivers sit below the road; a shore runs along the bottom of the region.
 * Returns the water art and the x-range it covers, so props keep off it.
 */
export function Water(p: { age: AgeId; w: number; h: number; hz: number; roadY: (x: number) => number; clear: number; t: RegionTheme; rng: Rng }): { art: ComponentChildren; blocked: { x0: number; x1: number; y0: number } } {
  const c = WATER[p.age];
  if (c.kind === 'shore') {
    const top = p.h - Math.max(46, p.h * 0.16);
    const d = `M0 ${top} Q${p.w * 0.25} ${top - 12} ${p.w * 0.5} ${top} T${p.w} ${top} V${p.h} H0 Z`;
    const boats = Math.max(1, Math.round(p.w / 700));
    return {
      art: (
        <g>
          <path d={`M0 ${top - 6} Q${p.w * 0.25} ${top - 18} ${p.w * 0.5} ${top - 6} T${p.w} ${top - 4}`} stroke="#e8dcb4" stroke-width="10" fill="none" opacity=".75" />
          <path d={d} fill={c.deep} />
          <path d={d} fill={c.light} opacity=".18" transform="translate(0 6)" />
          <path class="wp-surf" d={`M0 ${top + 2} Q${p.w * 0.25} ${top - 10} ${p.w * 0.5} ${top + 2} T${p.w} ${top + 2}`} stroke="#fff" stroke-width="2.5" fill="none" opacity=".6" />
          {Array.from({ length: Math.round(p.w / 120) }, (_, i) => (
            <Shimmer key={i} x={(i + 0.5) * 120} y={top + 18 + (i % 2) * 12} w={80} color={c.light} n={3} />
          ))}
          {Array.from({ length: boats }, (_, i) => (
            <Boat key={`b${i}`} x={((i + 0.3 + p.rng.next() * 0.4) * p.w) / boats} y={top + 22} s={0.9 + p.rng.next() * 0.3} sail={p.t.accent} />
          ))}
        </g>
      ),
      blocked: { x0: 0, x1: p.w, y0: top - 14 },
    };
  }
  if (c.kind === 'river') {
    const x = p.w * (0.38 + p.rng.next() * 0.1);
    const wv = 26;
    const d = `M${x - 30} ${p.hz + 12} C${x + 40} ${p.hz + 70} ${x - 60} ${p.h * 0.62} ${x + 10} ${p.h + 4} L${x + 10 + wv * 2.4} ${p.h + 4} C${x - 20 + wv * 2} ${p.h * 0.62} ${x + 60 + wv} ${p.hz + 70} ${x - 30 + wv * 0.7} ${p.hz + 12} Z`;
    return {
      art: (
        <g>
          <path d={d} fill="#e8dcb4" opacity=".55" transform="translate(-4 0) scale(1.02 1)" />
          <path d={d} fill={c.deep} stroke={INK} stroke-width="1.5" stroke-opacity=".4" />
          <path d={d} fill={c.light} opacity=".2" transform="translate(4 0)" />
          <g class="wp-flow">
            {Array.from({ length: 7 }, (_, i) => {
              const k = (i + 0.5) / 7;
              const yy = p.hz + 20 + k * (p.h - p.hz - 20);
              const xx = x + Math.sin(k * 5) * 20 + 14;
              return <path key={i} d={`M${xx.toFixed(0)} ${yy.toFixed(0)} q6 4 12 0`} stroke={c.light} stroke-width="2" fill="none" style={{ animationDelay: `${-i * 0.5}s` }} />;
            })}
          </g>
        </g>
      ),
      blocked: { x0: x - 70, x1: x + 110, y0: p.hz },
    };
  }
  // A lake below the road, with reeds (or crystals) on its shore.
  const x = p.w * (0.8 + p.rng.next() * 0.08);
  const ry = p.roadY(x);
  const y = Math.min(p.h - 34, ry + p.clear + 56);
  const rx = 90 + p.rng.next() * 40;
  const reed = p.age === 'cosmic' ? p.t.accent : '#4a6a2a';
  return {
    art: (
      <g>
        <ellipse cx={x.toFixed(0)} cy={(y + 4).toFixed(0)} rx={(rx + 10).toFixed(0)} ry="28" fill={p.t.patchDark} opacity=".6" />
        <ellipse cx={x.toFixed(0)} cy={y.toFixed(0)} rx={rx.toFixed(0)} ry="22" fill={c.deep} stroke={INK} stroke-width="1.5" stroke-opacity=".45" />
        <ellipse cx={(x - rx * 0.25).toFixed(0)} cy={(y - 6).toFixed(0)} rx={(rx * 0.5).toFixed(0)} ry="8" fill={c.light} opacity=".28" />
        <Shimmer x={x} y={y} w={rx * 1.3} color={c.light} n={5} />
        {[-0.8, -0.62, 0.7, 0.86].map((k, i) => (
          <g key={i} transform={`translate(${(x + k * rx).toFixed(0)} ${(y + (i % 2 ? 10 : -8)).toFixed(0)})`}>
            <g class="wp-reed" style={{ animationDelay: `${-i * 0.6}s` }}>
              <path d="M0 0 q-2 -12 -5 -18 M3 0 q1 -14 4 -20 M-3 0 q-5 -8 -10 -10" stroke={reed} stroke-width="2" fill="none" stroke-linecap="round" />
              <ellipse cx="-5" cy="-18" rx="1.8" ry="4" fill="#6b4a2c" />
            </g>
          </g>
        ))}
      </g>
    ),
    blocked: { x0: x - rx - 20, x1: x + rx + 20, y0: y - 34 },
  };
}

// ---------------------------------------------------------------------------------------------
// Set pieces: two per region, beside the road
// ---------------------------------------------------------------------------------------------

function Smoke(p: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g class="wp-smoke" transform={`translate(${p.x} ${p.y}) scale(${p.s ?? 1})`}>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} class="wp-smoke__puff" cx="0" cy="0" r={8 + i * 3} fill={p.color ?? '#8a8080'} style={{ animationDelay: `${-i * 1.1}s` }} />
      ))}
    </g>
  );
}

function Fire(p: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${p.s ?? 1})`}>
      <ellipse cx="0" cy="2" rx="14" ry="4" fill="#3b2a1e" />
      <path d="M-10 2 l20 -4 M-10 -2 l20 4" stroke="#6b4a2c" stroke-width="3" stroke-linecap="round" />
      <g class="wp-fire">
        <path d="M-7 0 Q-8 -12 -2 -18 Q-1 -10 3 -14 Q8 -6 7 0 Z" fill="#ff9a2a" />
        <path d="M-3 0 Q-4 -8 0 -12 Q2 -6 4 -4 Q4 -1 3 0 Z" fill="#ffe27a" />
      </g>
      <circle class="wp-ember" cx="0" cy="-16" r="1.4" fill="#ffd27a" />
      <circle class="wp-ember wp-ember--2" cx="3" cy="-14" r="1.2" fill="#ffd27a" />
    </g>
  );
}

function Pennant(p: { x: number; y: number; color: string; h?: number }) {
  const h = p.h ?? 30;
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <path d={`M0 0 V-${h}`} stroke={ink('#6b4a2e')} stroke-width="3.4" stroke-linecap="round" />
      <path d={`M0 0 V-${h}`} stroke="#8e6440" stroke-width="1.6" stroke-linecap="round" />
      <path class="wp-flag" d={`M1 -${h} h14 l-4 4 l4 4 h-14 z`} fill={p.color} stroke={ink(p.color)} stroke-width="1.2" stroke-linejoin="round" />
      <path class="wp-flag" d={`M1 -${h - 4.6} h10.6 l.9 1 l-.9 2 h-10.6z`} fill={shade(p.color)} />
    </g>
  );
}

type Piece = (t: RegionTheme) => ComponentChildren;

const blob = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const WOOD = '#8e6440';

/** Stone: a cave in a rock outcrop with its camp fire and drying hides. */
const caveCamp: Piece = (t) => (
  <g>
    <Contact rx={66} />
    <Cel d="M-60 0 Q-64 -50 -22 -68 Q22 -80 54 -46 Q68 -24 60 0Z" fill="#7c7266" band="M-80 -26 Q0 -10 80 -30 V20 H-80Z" hi="M-50 -14 Q-52 -48 -20 -60 Q-8 -58 -28 -42 Q-42 -26 -40 -14Z" sw={2.4} />
    <path d="M-36 -40 Q-24 -46 -12 -44 M10 -58 Q24 -60 34 -50 M30 -22 Q42 -26 50 -18 M-46 -18 Q-40 -24 -30 -22" stroke={shade('#7c7266')} stroke-width="1.8" fill="none" stroke-linecap="round" />
    <Cel d="M-22 0 Q-24 -36 0 -40 Q24 -36 22 0Z" fill="#2a211a" sw={2} />
    <path d="M-16 -4 Q-14 -27 0 -31" stroke="#ff9a2a" stroke-width="3" fill="none" opacity=".4" />
    <path d="M18 -64 Q28 -74 40 -66 Q48 -60 44 -54" stroke={ink(t.lit)} stroke-width="7" fill="none" stroke-linecap="round" />
    <path d="M18 -64 Q28 -74 40 -66 Q48 -60 44 -54" stroke={t.lit} stroke-width="4" fill="none" stroke-linecap="round" />
    <Fire x={42} y={-2} s={1.15} />
    <Smoke x={42} y={-28} s={0.55} color="#a39a90" />
    <g transform="translate(-70 0)">
      <path d="M-8 0 V-30 M8 0 V-30 M-10 -28 H10" stroke={ink(WOOD)} stroke-width="3.6" stroke-linecap="round" />
      <path d="M-8 0 V-30 M8 0 V-30 M-10 -28 H10" stroke={WOOD} stroke-width="1.8" stroke-linecap="round" />
      <Cel d="M-6 -27 H6 L7 -10 Q0 -7 -7 -10Z" fill="#c8733a" band={-14} sw={1.4} />
    </g>
  </g>
);

/** Stone: a mammoth skeleton half sunk in the grass. */
const mammoth: Piece = () => {
  const bone = '#efe6d0';
  return (
    <g>
      <Contact rx={58} />
      {[-26, -14, -2, 10].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 0 Q${x - 5} -26 ${x + 8} -${36 - i}`} stroke={ink(bone)} stroke-width="8.4" fill="none" stroke-linecap="round" />
          <path d={`M${x} 0 Q${x - 5} -26 ${x + 8} -${36 - i}`} stroke={bone} stroke-width="5" fill="none" stroke-linecap="round" />
          <path d={`M${x + 1.4} -3 Q${x - 2.6} -24 ${x + 8} -${33 - i}`} stroke={shade(bone)} stroke-width="1.6" fill="none" stroke-linecap="round" />
        </g>
      ))}
      <path d="M-34 -36 Q0 -46 30 -34" stroke={ink(bone)} stroke-width="9.6" fill="none" stroke-linecap="round" />
      <path d="M-34 -36 Q0 -46 30 -34" stroke={bone} stroke-width="6" fill="none" stroke-linecap="round" />
      <path d="M32 -30 Q52 -28 54 -10 Q55 2 42 4" stroke={ink('#f4ecd8')} stroke-width="7.6" fill="none" stroke-linecap="round" />
      <path d="M32 -30 Q52 -28 54 -10 Q55 2 42 4" stroke="#f4ecd8" stroke-width="4.4" fill="none" stroke-linecap="round" />
      <Cel d={blob(36, -32, 11)} fill="#e3d8bd" band={-29} hi={blob(32, -37, 3.4)} sw={1.8} />
      <circle cx="39" cy="-33" r="2.4" fill={ink('#e3d8bd')} />
    </g>
  );
};

/** Bronze: a hill temple with a gilded pediment. */
const temple: Piece = () => {
  const marble = '#ece4cf';
  return (
    <g>
      <Contact rx={70} />
      <Cel d="M-62 0 H62 V-8 H-62Z" fill="#d8ceb2" band={-3} sw={1.8} />
      <Cel d="M-56 -8 H56 V-14 H-56Z" fill="#e2d9c0" band={-10} sw={1.6} />
      {[-44, -26, -8, 10, 28, 46].map((x) => (
        <g key={x}>
          <Cel d={`M${x - 5} -56 H${x + 5} V-14 H${x - 5}Z`} fill={marble} band={`M${x + 1.6} -60H${x + 9}V-10H${x + 1.6}Z`} hi={`M${x - 4} -55H${x - 2}V-15H${x - 4}Z`} sw={1.4} />
          <path d={`M${x - 0.5} -54V-16`} stroke={shade(marble)} stroke-width=".8" />
        </g>
      ))}
      <Cel d="M-62 -56 H62 V-63 H-62Z" fill="#e7dec6" band={-58.6} sw={1.6} />
      <Cel d="M-64 -63 L0 -90 L64 -63Z" fill="#efe7d2" band="M0 -96 L80 -60 V-50 H0Z" hi="M-52 -65 L-2 -86 L-2 -82 L-44 -65Z" sw={2} />
      <Cel d={blob(0, -73, 5.6)} fill="#e8b23a" band={-72} hi={blob(-1.6, -75, 1.6)} sw={1.3} />
    </g>
  );
};

/** Bronze: a hero statue on its plinth. */
const statue: Piece = () => (
  <g>
    <Contact rx={28} />
    <Cel d="M-16 -18 H16 V0 H-16Z" fill="#c8bea4" band="M4 -22H24V4H4Z" hi="M-14.6 -16.6H-11V-1.4H-14.6Z" sw={1.6} />
    <Cel d="M-6 -18 L-4.4 -44 Q0 -52 4.4 -44 L6 -18Z" fill="#c9a86a" band="M1 -50H12V-14H1Z" metal sw={1.5} />
    <Cel d={blob(0, -53, 6.4)} fill="#c9a86a" band={-51} hi={blob(-2, -55, 1.8)} metal sw={1.5} />
    <path d="M4 -42 L18 -62" stroke={ink('#8a6a3a')} stroke-width="4.6" stroke-linecap="round" />
    <path d="M4 -42 L18 -62" stroke="#a8844a" stroke-width="2.6" stroke-linecap="round" />
    <Cel d="M18 -62 L22 -70 L13 -66Z" fill="#e8b23a" sw={1.2} />
  </g>
);

/** Medieval: a moated keep with towers and pennants. */
const keep: Piece = (t) => {
  const wall = '#9aa0a6';
  return (
    <g>
      <Contact rx={70} />
      <Cel d="M-58 2 Q-50 -16 0 -18 Q50 -16 58 2 Q0 10 -58 2Z" fill="#3f8fc4" band={-3} hi="M-40 -10 Q-20 -14 0 -14.6 L-2 -12 Q-24 -11 -38 -7Z" sw={1.6} />
      <path class="wp-shimmerline" d="M-36 -4 H-22 M6 -6 H22 M30 -2 H42" stroke="#e8f7ff" stroke-width="1.6" stroke-linecap="round" />
      <Cel d="M-30 -64 H30 V-12 H-30Z" fill={wall} band="M8 -70H40V-8H8Z" hi="M-28.6 -62.6H-25V-13.4H-28.6Z" sw={2} />
      {[-44, 24].map((x) => (
        <g key={x}>
          <Cel d={`M${x} -80 H${x + 20} V-12 H${x}Z`} fill={wall} band={`M${x + 12} -84H${x + 30}V-8H${x + 12}Z`} hi={`M${x + 1.4} -78.6H${x + 4.6}V-13.4H${x + 1.4}Z`} sw={2} />
          {[0, 8, 15].map((dx) => (
            <Cel key={dx} d={`M${x + dx} -86 h5 v6 h-5Z`} fill={wall} sw={1.3} />
          ))}
          <Cel d={`M${x + 7} -60 h6 v8 h-6Z`} fill="#ffd27a" sw={1.1} />
        </g>
      ))}
      {[-48, -40, -32, -24].map((y) => (
        <path key={y} d={`M-30 ${y} H30`} stroke={shade(wall)} stroke-width="1" opacity=".7" />
      ))}
      <Cel d="M-8 -12 V-30 Q0 -40 8 -30 V-12Z" fill="#3a2f28" sw={1.6} />
      <Pennant x={-34} y={-86} color={t.accent} h={22} />
      <Pennant x={34} y={-86} color={t.accent} h={22} />
    </g>
  );
};

/** Medieval: a tourney camp of striped tents. */
const tourney: Piece = (t) => (
  <g>
    <Contact rx={62} />
    {[
      [-34, '#e9e1cc'],
      [0, t.accent],
      [34, '#e9e1cc'],
    ].map(([x, c], i) => (
      <g key={i} transform={`translate(${x} 0)`}>
        <Cel d="M-17 0 L0 -36 L17 0Z" fill={c as string} band="M0 -44 L26 0 V8 H0Z" hi="M-12 -3 L-1.4 -28 L-1 -24 L-8 -3Z" sw={1.6} />
        <path d="M-6 -1 L-1 -26 M6 -1 L1 -26" stroke={i === 1 ? '#e9e1cc' : (t.accent as string)} stroke-width="2.2" opacity=".85" />
        <Cel d="M-3.4 0 L0 -11 L3.4 0Z" fill="#3b2a1e" sw={1} />
        <Pennant x={0} y={-36} color={i === 1 ? '#e9e1cc' : (t.accent as string)} h={13} />
      </g>
    ))}
  </g>
);

/** Gunpowder: a star fort with its cannon puff. */
const starFort: Piece = (t) => (
  <g>
    <Contact rx={74} />
    <Cel d="M-68 -4 L-41 -21 L-22 -13 L0 -27 L22 -13 L41 -21 L68 -4 L41 7 L0 3 L-41 7Z" fill="#8a8676" band={-6} hi="M-60 -5 L-41 -17 L-23 -10 L-2 -23 L-2 -20 L-23 -7 L-41 -13Z" sw={2} />
    <path d="M-48 -4 L-30 -14 M30 -14 L48 -4 M-10 -4 H10" stroke={shade('#8a8676')} stroke-width="1.2" />
    <Cel d="M-12 -46 H12 V-22 H-12Z" fill="#9a9584" band="M3 -50H20V-18H3Z" hi="M-10.6 -44.6H-8V-23.4H-10.6Z" sw={1.6} />
    <Cel d="M-14 -50 H14 V-46 H-14Z" fill="#a8a392" sw={1.3} />
    <Pennant x={0} y={-50} color={t.accent} h={20} />
    <g transform="translate(-44 -20) rotate(-14)">
      <Cel d="M-2 -4 H14 Q16 -1.5 14 1 H-2Z" fill="#3d3f45" band={-1} metal sw={1.3} />
    </g>
    <g transform="translate(-26 -30)">
      <g class="wp-cannonPuff">
        <circle r="6.4" fill="#d8d0c0" stroke={ink('#d8d0c0')} stroke-width="1.2" />
        <circle cx="6" cy="-3" r="4.4" fill="#ece6d8" stroke={ink('#ece6d8')} stroke-width="1.2" />
      </g>
    </g>
  </g>
);

/** Gunpowder: two windmills over a wheat field. */
const windFarm: Piece = (t) => (
  <g>
    <Contact rx={58} />
    {[-30, 26].map((x, i) => (
      <g key={x} transform={`translate(${x} 0) scale(${i ? 0.8 : 1})`}>
        <Cel d="M-12 0 L-7 -50 H7 L12 0Z" fill="#ddd0b4" band="M2 -54 L16 -54 L18 4 H3Z" hi="M-10 -2 L-5.6 -48 H-3.4 L-7 -2Z" sw={1.6} />
        <Cel d="M-3.4 0 V-10 Q0 -13.4 3.4 -10 V0Z" fill="#5a3a24" sw={1.1} />
        <Cel d="M-9.6 -49 L0 -62 L9.6 -49Z" fill={t.roadEdge} band="M0 -66H14V-46H0Z" sw={1.4} />
        <g class="wp-blades" transform="translate(0 -51)">
          <g style={{ animationDuration: `${5 + i}s` }}>
            <path d="M0 0 L3 -30 L10 -30 L2 0Z M0 0 L30 3 L30 10 L0 2Z M0 0 L-3 30 L-10 30 L-2 0Z M0 0 L-30 -3 L-30 -10 L0 -2Z" fill="#f2ead8" stroke={ink('#f2ead8')} stroke-width="1.2" stroke-linejoin="round" />
          </g>
        </g>
        <circle cx="0" cy="-51" r="2.4" fill="#5a3a24" />
      </g>
    ))}
    <path d="M-52 4 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0" stroke={ink('#d6b35a')} stroke-width="6.4" fill="none" />
    <path d="M-52 4 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0" stroke="#d6b35a" stroke-width="3.6" fill="none" />
  </g>
);

/** Industrial: a brick foundry with two smoking stacks and glowing windows. */
const factory: Piece = () => {
  const brick = '#8a4f3e';
  return (
    <g>
      <Contact rx={74} />
      <Cel d="M26 -98 H37 V-50 H26Z" fill="#7a4a3a" band="M32 -102H44V-46H32Z" sw={1.8} />
      <Cel d="M44 -86 H54 V-50 H44Z" fill="#7a4a3a" band="M49.6 -90H60V-46H49.6Z" sw={1.8} />
      <path d="M26 -90 H37 M26 -82 H37 M44 -78 H54 M44 -70 H54" stroke={shade('#7a4a3a')} stroke-width="1" />
      <Cel d="M16 -54 H62 V0 H16Z" fill={brick} band="M44 -58H70V4H44Z" hi="M17.4 -52.6H21V-1.4H17.4Z" sw={2} />
      <Cel d="M-62 -36 H16 V0 H-62Z" fill={brick} band="M-6 -40H20V4H-6Z" hi="M-60.6 -34.6H-57V-1.4H-60.6Z" sw={2} />
      <Cel d="M-62 -36 L-50 -48 L-38 -36 L-26 -48 L-14 -36 L-2 -48 L10 -36 L16 -36 L16 -38Z" fill="#5d6576" band={-40} sw={1.8} />
      {[-28, -20, -12].map((y) => (
        <path key={y} d={`M-62 ${y} H16 M16 ${y - 18} H62`} stroke={shade(brick)} stroke-width=".9" opacity=".8" />
      ))}
      {[-54, -42, -30, -18, -6].map((x) => (
        <Cel key={x} class={x === -30 ? 'wp-twinkle' : undefined} d={`M${x} -26 h7 v9 h-7Z`} fill="#ffbe6e" sw={1} />
      ))}
      {[22, 35, 48].map((x) => (
        <Cel key={x} d={`M${x} -42 h7 v9 h-7Z`} fill="#ffbe6e" sw={1} />
      ))}
      <Cel d="M30 0 V-16 H44 V0Z" fill="#3a2f28" sw={1.3} />
      <Smoke x={31} y={-104} s={0.95} color="#7a726c" />
      <Smoke x={49} y={-92} s={0.75} color="#867d76" />
    </g>
  );
};

/** Industrial: a rail line with a steam train crossing. */
const railway: Piece = () => (
  <g>
    <ellipse cx="0" cy="4" rx="82" ry="8" fill="#000" opacity=".22" />
    {Array.from({ length: 11 }, (_, i) => (
      <path key={i} d={`M${-76 + i * 15} -1 v12`} stroke={ink('#6b4a2c')} stroke-width="4.4" />
    ))}
    {Array.from({ length: 11 }, (_, i) => (
      <path key={`s${i}`} d={`M${-76 + i * 15} 0 v10`} stroke="#7a5433" stroke-width="2.6" />
    ))}
    <path d="M-82 2 H82 M-82 8 H82" stroke={ink('#8a8f98')} stroke-width="3.6" />
    <path d="M-82 2 H82 M-82 8 H82" stroke="#8a8f98" stroke-width="1.8" />
    <g class="wp-train">
      <Cel d="M-31 -19 H-3 V0 H-31Z" fill="#33363c" band={-6} hi="M-29.6 -17.6H-26V-1.4H-29.6Z" metal sw={1.6} />
      <Cel d="M-27 -30 H-14 V-17 H-27Z" fill="#3e424a" band={-20} metal sw={1.4} />
      <Cel d="M-9 -28 H-2 V-17 H-9Z" fill="#33363c" sw={1.3} />
      <Cel d="M-25 -27 H-17 V-22 H-25Z" fill="#ffd27a" sw={1} />
      <Cel d="M0 -15 H23 V0 H0Z" fill="#9a3e2e" band={-5} hi="M1.4 -13.6H4V-1.4H1.4Z" sw={1.5} />
      {[-24, -10, 6, 17].map((x) => (
        <g key={x}>
          <circle cx={x} cy="1" r="4.2" fill="#24262a" stroke={ink('#24262a')} stroke-width="1" />
          <circle cx={x} cy="1" r="1.4" fill="#c7d0da" />
        </g>
      ))}
      <Smoke x={-5} y={-34} s={0.45} color="#a39c98" />
    </g>
  </g>
);

/** Modern: a radar station with a turning dish. */
const radar: Piece = (t) => (
  <g>
    <Contact rx={42} />
    <Cel d="M-24 -20 H24 V0 H-24Z" fill="#5f6a74" band="M8 -24H30V4H8Z" hi="M-22.6 -18.6H-19V-1.4H-22.6Z" sw={1.6} />
    <Cel d="M-16 -12 H-8 V-6 H-16Z" fill="#f4d28a" sw={1} />
    <path d="M0 -20 V-40" stroke={ink('#4a525c')} stroke-width="6" />
    <path d="M0 -20 V-40" stroke="#4a525c" stroke-width="3.4" />
    <g transform="translate(0 -44)">
      <g class="wp-radar">
        <Cel d="M-26 -6 Q0 20 26 -6 Q0 4 -26 -6Z" fill="#c9d1dc" band={2} metal sw={1.5} />
        <path d="M0 2 V-18" stroke={ink('#4a525c')} stroke-width="2.4" />
        <circle cx="0" cy="-19" r="3.2" fill={t.accent} stroke={ink(t.accent)} stroke-width="1" />
      </g>
    </g>
    <circle class="wp-blink" cx="18" cy="-22" r="2.6" fill="#ff4a3a" stroke="#6a1a12" stroke-width="1" />
  </g>
);

/** Modern: an airfield pad with a helicopter. */
const helipad: Piece = () => (
  <g>
    <Cel d="M-52 0 A52 14 0 1 0 52 0 A52 14 0 1 0 -52 0Z" fill="#454a4e" band={4} sw={1.6} />
    <ellipse cx="0" cy="0" rx="40" ry="10" fill="none" stroke="#f4d28a" stroke-width="2" />
    <path d="M-8 -5 v10 M8 -5 v10 M-8 0 h16" stroke="#f4d28a" stroke-width="2.6" />
    <g class="wp-heli">
      <Cel d="M-22 -26 Q-22 -38 -6 -38 H6 Q16 -38 16 -28 Q16 -20 6 -20 H-14Z" fill="#56683e" band={-26} hi="M-16 -32 Q-14 -36 -6 -36 H0 V-34 H-6 Q-12 -34 -14 -31Z" sw={1.6} />
      <Cel d="M-12 -34 Q-12 -36.6 -8 -36.6 H-2 V-29 H-12Z" fill="#9fd0ff" sw={1.1} />
      <path d="M16 -30 H42 L46 -36" stroke={ink('#56683e')} stroke-width="6" stroke-linecap="round" fill="none" />
      <path d="M16 -30 H42 L46 -36" stroke="#56683e" stroke-width="3.4" stroke-linecap="round" fill="none" />
      <path d="M-18 -18 v6 M6 -18 v6 M-24 -12 h36" stroke={ink('#56683e')} stroke-width="2.2" />
      <path d="M-4 -38 v-6" stroke={ink('#56683e')} stroke-width="2.2" />
      <g transform="translate(-4 -45)">
        <ellipse class="wp-rotor" cx="0" cy="0" rx="34" ry="2.5" fill="#2b2b2e" opacity=".7" />
      </g>
    </g>
  </g>
);

/** Future: a hovering platform (the arcology's landing deck). */
const platform: Piece = (t) => (
  <g>
    <Contact rx={48} />
    <g class="wp-hover">
      <Cel d="M-20 -34 V-54 H20 V-34Z" fill="#2c4a6e" band="M6 -58H26V-30H6Z" metal sw={1.6} />
      <path d="M-14 -48 h28" stroke={t.accent} stroke-width="3" opacity=".85" />
      <Cel d="M-46 -30 H46 L36 -17 H-36Z" fill="#34506a" band={-24} hi="M-42 -29 H42 V-27.4 H-42Z" metal sw={2} />
      <Cel d="M-24 -17 L-18 -7 H18 L24 -17Z" fill="#23364a" sw={1.5} />
      <path d="M-14 -9 h28" stroke={t.accent} stroke-width="3" class="wp-twinkle" />
    </g>
  </g>
);

/** Future: a beacon tower with its sweeping light. */
const beacon: Piece = (t) => (
  <g>
    <Contact rx={32} />
    <path class="wp-beam" d="M0 -76 L-60 -200 L-40 -200Z" fill={t.accent} opacity=".12" />
    <Cel d="M-16 0 L-6 -70 H6 L16 0Z" fill="#34506a" band="M2 -74 L20 -74 L22 4 H3Z" hi="M-13 -2 L-4.4 -66 H-2 L-9 -2Z" metal sw={1.8} />
    <path d="M-12 -20 H12 M-9 -42 H9" stroke={t.accent} stroke-width="1.8" opacity=".8" />
    <circle class="wp-pulse" cx="0" cy="-76" r="8" fill={t.accent} stroke={ink(t.accent)} stroke-width="1.2" />
  </g>
);

/** Cosmic: a stone portal with a swirling rift. */
const portal: Piece = (t) => (
  <g>
    <Contact rx={48} o={0.3} />
    <Cel d="M-34 0 L-26 -10 H26 L34 0Z" fill="#4a3a6e" band={-4} sw={1.6} />
    <path d={blob(0, -46, 34).replace(/a34 34/g, 'a30 40')} fill="none" stroke={ink('#5a4a8c')} stroke-width="10" />
    <path d={blob(0, -46, 34).replace(/a34 34/g, 'a30 40')} fill="#150f28" stroke="#5a4a8c" stroke-width="6.4" />
    <g transform="translate(0 -46)">
      <g class="wp-swirl">
        <ellipse cx="0" cy="0" rx="20" ry="28" fill="none" stroke={t.accent} stroke-width="3" stroke-dasharray="10 8" />
        <ellipse cx="0" cy="0" rx="10" ry="16" fill="none" stroke="#d8b8ff" stroke-width="2.5" stroke-dasharray="6 6" />
      </g>
    </g>
    <ellipse cx="0" cy="-46" rx="6" ry="9" fill="#fff4d0" opacity=".6" class="wp-twinkle" />
    {[-32, 32].map((x) => (
      <Cel key={x} d={`M${x - 5} -4 L${x} -${x < 0 ? 30 : 24} L${x + 5} -4Z`} fill={t.lit} band={`M${x} -40H${x + 10}V4H${x}Z`} sw={1.3} />
    ))}
  </g>
);

/** Cosmic: floating rock islands with crystals. */
const floatRocks: Piece = (t) => (
  <g>
    {[
      [-30, -30, 1],
      [10, -54, 0.8],
      [36, -24, 0.65],
    ].map(([x, y, s], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
        <g class="wp-hover" style={{ animationDelay: `${-i * 1.1}s` }}>
          <Cel d="M-18 0 Q-16 -10 0 -12 Q16 -10 18 0 L8 16 L-6 14Z" fill="#5a4a86" band={2} sw={1.8} />
          <Cel d="M-18 0 Q-16 -10 0 -12 Q16 -10 18 0 Q0 4 -18 0Z" fill="#7a66b0" hi="M-12 -3 Q-8 -8 0 -9 Q-6 -6 -9 -2Z" sw={1.4} />
          <Cel d="M-4 -11 L-1 -26 L3 -11Z" fill={t.lit} band="M-1 -30H6V-8H-1Z" sw={1.2} />
        </g>
      </g>
    ))}
  </g>
);

const PIECES: Readonly<Record<AgeId, readonly [Piece, Piece]>> = {
  stone: [caveCamp, mammoth],
  bronze: [temple, statue],
  medieval: [keep, tourney],
  gunpowder: [starFort, windFarm],
  industrial: [factory, railway],
  modern: [radar, helipad],
  future: [platform, beacon],
  cosmic: [portal, floatRocks],
};

/** Where a region's two set pieces stand (fractions of its width), and their rough half-size. */
const PIECE_AT: readonly number[] = [0.24, 0.66];
const PIECE_HALF = 70;

/**
 * The region's two set pieces, below the road when there is room there, else above it. Returns the
 * art (to be depth-sorted by the caller) and their footprints so props keep off them.
 */
export function SetPieces(p: { age: AgeId; w: number; h: number; hz: number; roadY: (x: number) => number; clear: number; t: RegionTheme; bottomLimit: number }): {
  items: { x: number; y: number; s: number; art: ComponentChildren }[];
  blocked: { x0: number; x1: number; y0: number; y1: number }[];
} {
  const items: { x: number; y: number; s: number; art: ComponentChildren }[] = [];
  const blocked: { x0: number; x1: number; y0: number; y1: number }[] = [];
  PIECES[p.age].forEach((piece, i) => {
    const x = p.w * PIECE_AT[i]!;
    const ry = p.roadY(x);
    const below = ry + p.clear + 70;
    const room = p.bottomLimit - below;
    // Below the road where it fits; otherwise tucked just under the horizon, above the road.
    const y = room > 10 ? Math.min(p.bottomLimit, below + Math.min(40, room)) : Math.max(p.hz + 60, ry - p.clear - 10);
    const depth = (y - p.hz) / Math.max(1, p.h - p.hz);
    // Smaller on short screens, so a set piece never crowds the nodes on a phone.
    const s = Math.max(0.62, Math.min(1.3, (0.7 + depth * 0.6) * Math.min(1.05, p.h / 520)));
    items.push({ x, y, s, art: piece(p.t) });
    blocked.push({ x0: x - PIECE_HALF * s, x1: x + PIECE_HALF * s, y0: y - 100 * s, y1: y + 20 });
  });
  return { items, blocked };
}

// ---------------------------------------------------------------------------------------------
// Ground detail: fields, rock patches and worn earth, so the ground is never one flat plane
// ---------------------------------------------------------------------------------------------

/** Ages that farm: striped crop fields (the others get scrub or plating patches instead). */
const FIELDS: Readonly<Partial<Record<AgeId, readonly [string, string]>>> = {
  bronze: ['#c9ad5a', '#9c8a3e'],
  medieval: ['#c8b45a', '#7e8f3a'],
  gunpowder: ['#d0b060', '#8a9a44'],
  industrial: ['#a89a5a', '#6f7a3e'],
};

/** A crop field in perspective: a skewed plot with furrow rows and a darker rim. */
function field(w: number, h: number, c: readonly [string, string], rows: number) {
  const k = 0.18 * w;
  const d = `M${-w / 2 + k} ${-h} L${w / 2 + k * 0.4} ${-h} L${w / 2} 0 L${-w / 2} 0 Z`;
  return (
    <g>
      <path d={d} fill={c[1]} stroke={INK} stroke-opacity=".35" stroke-width="1.5" stroke-linejoin="round" />
      {Array.from({ length: rows }, (_, i) => {
        const y = -h + ((i + 0.5) * h) / rows;
        const f = (y + h) / h;
        const x0 = -w / 2 + k * (1 - f);
        const x1 = w / 2 + k * 0.4 * (1 - f);
        return <path key={i} d={`M${(x0 + 3).toFixed(1)} ${y.toFixed(1)} L${(x1 - 3).toFixed(1)} ${y.toFixed(1)}`} stroke={c[0]} stroke-width={(1.6 + f * 2.4).toFixed(1)} stroke-linecap="round" />;
      })}
    </g>
  );
}

/** A patch of flat stones half sunk in the ground. */
function rocks(rng: Rng, n: number, t: RegionTheme) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = (rng.next() - 0.5) * 70;
        const y = (rng.next() - 0.5) * 14;
        const r = 5 + rng.next() * 9;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <ellipse cx="0" cy="1.5" rx={(r * 1.1).toFixed(1)} ry={(r * 0.42).toFixed(1)} fill="#000" opacity=".22" />
            <ellipse cx="0" cy="0" rx={r.toFixed(1)} ry={(r * 0.5).toFixed(1)} fill={t.far2} stroke={INK} stroke-opacity=".4" stroke-width="1" />
            <ellipse cx={(-r * 0.25).toFixed(1)} cy={(-r * 0.15).toFixed(1)} rx={(r * 0.55).toFixed(1)} ry={(r * 0.22).toFixed(1)} fill="#fff" opacity=".22" />
          </g>
        );
      })}
    </g>
  );
}

/** Worn earth: a bare, lighter patch with pebbles (trampled ground, a dry clearing). */
function worn(rng: Rng, t: RegionTheme) {
  const rx = 40 + rng.next() * 40;
  return (
    <g>
      <ellipse cx="0" cy="0" rx={rx.toFixed(0)} ry={(rx * 0.26).toFixed(1)} fill={t.roadEdge} opacity=".32" />
      <ellipse cx={(-rx * 0.2).toFixed(0)} cy="-2" rx={(rx * 0.55).toFixed(0)} ry={(rx * 0.14).toFixed(1)} fill={t.road} opacity=".3" />
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} cx={((rng.next() - 0.5) * rx * 1.4).toFixed(1)} cy={((rng.next() - 0.5) * rx * 0.3).toFixed(1)} r={(1.2 + rng.next() * 1.6).toFixed(1)} fill={t.far2} opacity=".7" />
      ))}
    </g>
  );
}

/**
 * Fields, rock patches and worn earth beside the road, one feature every ~300 px, alternating, never
 * on the road (`clear` px from it) and inside the ground band. Returns the art and the areas props
 * should keep off.
 */
export function GroundDetail(p: { age: AgeId; w: number; h: number; hz: number; roadY: (x: number) => number; clear: number; t: RegionTheme; rng: Rng; bottom: number }): {
  art: ComponentChildren;
  blocked: { x0: number; x1: number; y0: number; y1: number }[];
} {
  const out: ComponentChildren[] = [];
  const blocked: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const crops = FIELDS[p.age];
  let i = 0;
  for (let x = 90 + p.rng.next() * 120; x < p.w - 60; x += 240 + p.rng.next() * 140, i++) {
    const ry = p.roadY(x);
    const kind = i % 3 === 0 ? (crops ? 'field' : 'worn') : i % 3 === 1 ? 'rocks' : crops && i % 2 ? 'field' : 'worn';
    const fw = 110 + p.rng.next() * 60;
    const fh = kind === 'field' ? 30 + p.rng.next() * 16 : 20;
    // Below the road when there is room (the fields read best there), else above it.
    const below = ry + p.clear + 30 + fh;
    const above = ry - p.clear - 24;
    const y = below < p.bottom - 6 ? Math.min(p.bottom - 6, below + p.rng.next() * Math.max(0, p.bottom - 6 - below) * 0.6) : above;
    if (y < p.hz + 34 || y > p.bottom) continue;
    const depth = Math.max(0.6, Math.min(1.3, 0.6 + ((y - p.hz) / Math.max(1, p.h - p.hz)) * 0.9));
    const art = kind === 'field' ? field(fw, fh, crops!, 5 + Math.round(p.rng.next() * 2)) : kind === 'rocks' ? rocks(p.rng, 4 + Math.round(p.rng.next() * 3), p.t) : worn(p.rng, p.t);
    out.push(
      <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${depth.toFixed(2)})`}>
        {art}
      </g>,
    );
    blocked.push({
      x0: x - (fw / 2) * depth - 8,
      x1: x + (fw / 2) * depth + 8,
      y0: y - fh * depth - 10,
      y1: y + 12,
    });
  }
  return { art: <g>{out}</g>, blocked };
}

// ---------------------------------------------------------------------------------------------
// The start camp: where the road begins (the lead-in before level 1)
// ---------------------------------------------------------------------------------------------

/** Your camp at the road's start: two tents, a campfire with smoke, a supply cart and your banner. */
export function StartCamp(p: { x: number; y: number; s: number; t: RegionTheme }) {
  return (
    <g transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.s.toFixed(2)})`} aria-hidden="true">
      <ellipse cx="0" cy="4" rx="96" ry="18" fill={p.t.roadEdge} opacity=".35" />
      {/* tents */}
      <g transform="translate(-52 0)">
        <ellipse cx="0" cy="2" rx="30" ry="6" fill="#000" opacity=".28" />
        <path d="M-28 0 L0 -44 L28 0 Z" fill="#8a6a48" stroke={INK} stroke-width="2" stroke-linejoin="round" />
        <path d="M-28 0 L0 -44 L-6 0 Z" fill="#b08a5e" />
        <path d="M-6 0 L0 -18 L6 0 Z" fill="#2a1d14" />
        <path d="M-5 -44 L2 -54 M5 -44 L-1 -53" stroke="#4a3322" stroke-width="2.5" stroke-linecap="round" />
      </g>
      <g transform="translate(-14 -16) scale(.72)">
        <ellipse cx="0" cy="2" rx="30" ry="6" fill="#000" opacity=".25" />
        <path d="M-28 0 L0 -44 L28 0 Z" fill="#7a5a3c" stroke={INK} stroke-width="2.4" stroke-linejoin="round" />
        <path d="M-28 0 L0 -44 L-6 0 Z" fill="#a07a50" />
      </g>
      {/* campfire */}
      <g transform="translate(18 6)">
        <ellipse cx="0" cy="2" rx="14" ry="4" fill="#000" opacity=".3" />
        <path d="M-10 2 L8 -3 M-8 -3 L10 2" stroke="#5b3d24" stroke-width="4" stroke-linecap="round" />
        <path class="wp-fire" d="M-6 -2 Q-8 -14 0 -22 Q2 -12 7 -10 Q8 -4 4 -2 Z" fill="#ff9a2e" stroke={INK} stroke-width="1.2" />
        <path class="wp-fire" d="M-2 -3 Q-3 -10 1 -14 Q3 -8 4 -4 Z" fill="#ffe08a" />
        <g class="wp-smoke" transform="translate(0 -30) scale(.5)">
          {[0, 1, 2].map((i) => (
            <circle key={i} class="wp-smoke__puff" cx="0" cy="0" r={10 + i * 3} fill="#8a7d80" style={{ animationDelay: `${-i * 1.1}s` }} />
          ))}
        </g>
      </g>
      {/* supply cart */}
      <g transform="translate(58 4)">
        <ellipse cx="0" cy="0" rx="22" ry="5" fill="#000" opacity=".28" />
        <rect x="-18" y="-20" width="34" height="12" rx="2" fill="#8a5a2c" stroke={INK} stroke-width="2" />
        <path d="M-14 -20 Q-4 -32 12 -20" fill="#d8c79a" stroke={INK} stroke-width="1.6" />
        <circle cx="-9" cy="-5" r="6" fill="#5b3d24" stroke={INK} stroke-width="2" />
        <circle cx="9" cy="-5" r="6" fill="#5b3d24" stroke={INK} stroke-width="2" />
        <path d="M16 -12 L30 -6" stroke="#5b3d24" stroke-width="3" stroke-linecap="round" />
      </g>
      {/* your banner */}
      <g transform="translate(36 -4)">
        <path d="M0 0 V-58" stroke="#3b2a1e" stroke-width="3" stroke-linecap="round" />
        <circle cx="0" cy="-59" r="2.8" fill="#ffd466" stroke={INK} stroke-width="1" />
        <path class="wp-flag" d="M1 -55 H22 L17 -47 L22 -39 H1 Z" fill="var(--ui-team-me)" stroke={INK} stroke-width="1.4" stroke-linejoin="round" />
      </g>
    </g>
  );
}

/** A region's hero set piece on its own (the Home War Path card draws it in its mid layer). */
export function HeroPiece(p: { age: AgeId; t: RegionTheme }): ComponentChildren {
  return PIECES[p.age][0](p.t);
}
