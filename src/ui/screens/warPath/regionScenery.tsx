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
        <path d="M-22 0 h44 l-8 10 h-28 z" fill="#6b4a2c" stroke={INK} stroke-width="1.5" />
        <path d="M0 0 V-34" stroke="#3b2a1e" stroke-width="2.4" />
        <path d="M2 -32 q18 12 0 28 z" fill={p.sail} stroke={INK} stroke-width="1.2" />
        <path d="M-2 -26 q-12 10 0 22 z" fill="#f0e6cc" stroke={INK} stroke-width="1.2" />
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
  const x = p.w * (0.14 + p.rng.next() * 0.16);
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
      <path d={`M0 0 V-${h}`} stroke="#3b2a1e" stroke-width="2" />
      <path class="wp-flag" d={`M1 -${h} h14 l-4 4 l4 4 h-14 z`} fill={p.color} stroke={INK} stroke-width="1" />
    </g>
  );
}

type Piece = (t: RegionTheme) => ComponentChildren;

const caveCamp: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="62" ry="12" fill="#000" opacity=".28" />
    <path d="M-58 0 Q-60 -52 -18 -66 Q24 -76 52 -44 Q64 -24 58 0 Z" fill="#6f665c" stroke={INK} stroke-width="2.5" />
    <path d="M-58 0 Q-60 -52 -18 -66 Q-4 -60 -30 -40 Q-44 -20 -40 0 Z" fill="#8f877a" />
    <path d="M-22 0 Q-24 -34 0 -38 Q24 -34 22 0 Z" fill="#1e1914" />
    <path d="M-18 -4 Q-16 -26 0 -30" stroke="#ff9a2a" stroke-width="3" fill="none" opacity=".35" />
    <path d="M22 -62 q10 -8 20 -2" stroke={t.lit} stroke-width="5" fill="none" stroke-linecap="round" />
    <Fire x={40} y={-2} s={1.1} />
    <Smoke x={40} y={-26} s={0.55} color="#9a8f86" />
    <path d="M-62 0 l-6 -26 l10 0 z M-70 -26 l6 -8 l6 8" fill="#c8733a" stroke={INK} stroke-width="1.5" />
  </g>
);
const mammoth: Piece = () => (
  <g>
    <ellipse cx="0" cy="0" rx="54" ry="10" fill="#000" opacity=".25" />
    <g stroke="#efe6d0" stroke-width="5" fill="none" stroke-linecap="round">
      {[-24, -12, 0, 12].map((x) => (
        <path key={x} d={`M${x} 0 Q${x - 4} -26 ${x + 8} -34`} />
      ))}
      <path d="M-30 -34 Q0 -44 30 -32" stroke-width="6" />
      <path d="M30 -32 Q48 -30 50 -12 Q52 0 40 2" stroke-width="4" />
    </g>
    <circle cx="36" cy="-30" r="10" fill="#e3d8bd" stroke={INK} stroke-width="1.5" />
    <circle cx="39" cy="-31" r="2" fill={INK} />
  </g>
);
const temple: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="66" ry="12" fill="#000" opacity=".28" />
    <path d="M-60 0 h120 v-8 h-120 z M-54 -8 h108 v-6 h-108 z" fill="#d8ceb2" stroke={INK} stroke-width="1.5" />
    {[-44, -26, -8, 10, 28, 46].map((x) => (
      <g key={x}>
        <rect x={x - 5} y="-56" width="10" height="42" fill={t.accent} stroke={INK} stroke-width="1.2" />
        <rect x={x - 5} y="-56" width="4" height="42" fill="#fff" opacity=".4" />
      </g>
    ))}
    <path d="M-60 -56 h120 v-7 h-120 z" fill="#e7dec6" stroke={INK} stroke-width="1.5" />
    <path d="M-62 -63 L0 -88 L62 -63 Z" fill="#efe7d2" stroke={INK} stroke-width="2" />
    <path d="M-62 -63 L0 -88 L0 -63 Z" fill="#fff" opacity=".3" />
    <circle cx="0" cy="-72" r="5" fill="#d9a441" />
  </g>
);
const statue: Piece = () => (
  <g>
    <ellipse cx="0" cy="0" rx="26" ry="7" fill="#000" opacity=".28" />
    <rect x="-16" y="-18" width="32" height="18" fill="#bfb49a" stroke={INK} stroke-width="1.5" />
    <rect x="-16" y="-18" width="10" height="18" fill="#fff" opacity=".3" />
    <path d="M-6 -18 L-4 -44 Q0 -52 4 -44 L6 -18 Z" fill="#c9a86a" stroke={INK} stroke-width="1.5" />
    <circle cx="0" cy="-52" r="6" fill="#c9a86a" stroke={INK} stroke-width="1.5" />
    <path d="M4 -42 L18 -62" stroke="#8a6a3a" stroke-width="3" stroke-linecap="round" />
    <path d="M18 -62 l4 -6 l-8 2 z" fill="#d9a441" />
  </g>
);
const keep: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="64" ry="12" fill="#000" opacity=".28" />
    <path d="M-50 0 Q-40 -18 0 -20 Q40 -18 50 0 Z" fill="#6a8a4a" />
    <g fill="#8b93a3" stroke={INK} stroke-width="2">
      <rect x="-30" y="-64" width="60" height="50" />
      <rect x="-44" y="-78" width="20" height="64" />
      <rect x="24" y="-78" width="20" height="64" />
    </g>
    <path d="M-30 -64 h60 v6 h-60 z" fill="#aab2c0" />
    <path d="M-44 -78 v64 h7 v-64 z M24 -78 v64 h7 v-64 z" fill="#fff" opacity=".22" />
    {[-44, -36, -28, 24, 32, 40].map((x) => (
      <rect key={x} x={x} y="-84" width="5" height="6" fill="#8b93a3" stroke={INK} stroke-width="1.2" />
    ))}
    <path d="M-8 -14 v-18 a8 8 0 0 1 16 0 v18z" fill="#2b2420" />
    <Pennant x={-34} y={-84} color={t.accent} h={22} />
    <Pennant x={34} y={-84} color={t.accent} h={22} />
  </g>
);
const tourney: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="60" ry="10" fill="#000" opacity=".25" />
    {[
      [-34, '#e9e1cc'],
      [0, t.accent],
      [34, '#e9e1cc'],
    ].map(([x, c], i) => (
      <g key={i} transform={`translate(${x} 0)`}>
        <path d="M-16 0 L0 -34 L16 0 Z" fill={c as string} stroke={INK} stroke-width="1.5" />
        <path d="M-16 0 L0 -34 L-4 0 Z" fill="#fff" opacity=".25" />
        <path d="M-3 0 L0 -10 L3 0 Z" fill="#3b2a1e" />
        <Pennant x={0} y={-34} color={i === 1 ? '#e9e1cc' : (t.accent as string)} h={12} />
      </g>
    ))}
  </g>
);
const starFort: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="70" ry="13" fill="#000" opacity=".28" />
    <path d="M-66 -4 L-40 -20 L-22 -12 L0 -26 L22 -12 L40 -20 L66 -4 L40 6 L0 2 L-40 6 Z" fill="#7a786c" stroke={INK} stroke-width="2" />
    <path d="M-66 -4 L-40 -20 L-22 -12 L0 -26 L0 -18 L-22 -6 L-40 -12 Z" fill="#a09c8c" />
    <rect x="-12" y="-44" width="24" height="22" fill="#8a8676" stroke={INK} stroke-width="1.5" />
    <Pennant x={0} y={-44} color={t.accent} h={20} />
    <g transform="translate(-44 -20)">
      <rect x="-2" y="-4" width="16" height="5" rx="2" fill="#2d2d30" transform="rotate(-14)" />
    </g>
    <g transform="translate(-26 -30)">
      <g class="wp-cannonPuff">
        <circle r="6" fill="#d8d0c0" />
        <circle cx="6" cy="-3" r="4" fill="#e8e0d0" />
      </g>
    </g>
  </g>
);
const windFarm: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="56" ry="10" fill="#000" opacity=".25" />
    {[-30, 26].map((x, i) => (
      <g key={x} transform={`translate(${x} 0) scale(${i ? 0.8 : 1})`}>
        <path d="M-12 0 L-7 -50 H7 L12 0 Z" fill="#d8ccb2" stroke={INK} stroke-width="1.5" />
        <path d="M-12 0 L-7 -50 H-2 L-3 0 Z" fill="#fff" opacity=".35" />
        <path d="M-9 -50 L0 -62 L9 -50 Z" fill={t.roadEdge} stroke={INK} stroke-width="1.2" />
        <g class="wp-blades" transform="translate(0 -50)">
          <g style={{ animationDuration: `${5 + i}s` }}>
            <path d="M0 0 L3 -30 L10 -30 L2 0 Z M0 0 L30 3 L30 10 L0 2 Z M0 0 L-3 30 L-10 30 L-2 0 Z M0 0 L-30 -3 L-30 -10 L0 -2 Z" fill="#f2ead8" stroke="#5a4631" stroke-width="1" />
          </g>
        </g>
      </g>
    ))}
    <path d="M-50 4 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0" stroke="#d6b35a" stroke-width="4" fill="none" />
  </g>
);
const factory: Piece = () => (
  <g>
    <ellipse cx="0" cy="0" rx="70" ry="12" fill="#000" opacity=".3" />
    <g fill="#6a4a3c" stroke={INK} stroke-width="2">
      <rect x="-60" y="-36" width="76" height="36" />
      <path d="M-60 -36 l12 -12 l12 12 l12 -12 l12 12 l12 -12 l12 12 z" />
      <rect x="16" y="-52" width="44" height="52" />
      <rect x="26" y="-96" width="10" height="46" />
      <rect x="44" y="-84" width="9" height="34" />
    </g>
    <g fill="#ffbe6e">
      {[-52, -40, -28, -16, -4].map((x) => (
        <rect key={x} class={x === -28 ? 'wp-twinkle' : undefined} x={x} y="-24" width="6" height="8" />
      ))}
      {[22, 34, 46].map((x) => (
        <rect key={x} x={x} y="-40" width="6" height="8" />
      ))}
    </g>
    <Smoke x={31} y={-102} s={0.9} color="#6d6560" />
    <Smoke x={48} y={-90} s={0.7} color="#7a716a" />
  </g>
);
const railway: Piece = () => (
  <g>
    <ellipse cx="0" cy="4" rx="80" ry="8" fill="#000" opacity=".22" />
    <path d="M-80 2 H80 M-80 8 H80" stroke="#3c362e" stroke-width="2.5" />
    {Array.from({ length: 11 }, (_, i) => (
      <path key={i} d={`M${-76 + i * 15} 0 v10`} stroke="#6b4a2c" stroke-width="3" />
    ))}
    <g class="wp-train">
      <rect x="-30" y="-18" width="26" height="18" rx="2" fill="#2d2d30" stroke={INK} stroke-width="1.5" />
      <rect x="-26" y="-28" width="12" height="12" fill="#3a3a40" stroke={INK} stroke-width="1.5" />
      <rect x="-8" y="-26" width="6" height="10" fill="#2d2d30" />
      <circle cx="-24" cy="1" r="4" fill="#1b1b1e" />
      <circle cx="-10" cy="1" r="4" fill="#1b1b1e" />
      <rect x="0" y="-14" width="22" height="14" rx="2" fill="#8b3a2c" stroke={INK} stroke-width="1.5" />
      <circle cx="6" cy="1" r="3.5" fill="#1b1b1e" />
      <circle cx="16" cy="1" r="3.5" fill="#1b1b1e" />
      <Smoke x={-5} y={-32} s={0.45} color="#9a9290" />
    </g>
  </g>
);
const radar: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="40" ry="9" fill="#000" opacity=".28" />
    <rect x="-24" y="-20" width="48" height="20" fill="#56606a" stroke={INK} stroke-width="1.5" />
    <rect x="-24" y="-20" width="14" height="20" fill="#fff" opacity=".15" />
    <path d="M0 -20 V-40" stroke="#3a4048" stroke-width="4" />
    <g transform="translate(0 -44)">
      <g class="wp-radar">
        <path d="M-26 -6 Q0 20 26 -6 Q0 4 -26 -6 Z" fill="#c9d1dc" stroke={INK} stroke-width="1.5" />
        <path d="M0 2 V-18" stroke="#3a4048" stroke-width="2" />
        <circle cx="0" cy="-19" r="3" fill={t.accent} />
      </g>
    </g>
    <circle class="wp-blink" cx="18" cy="-22" r="2.5" fill="#ff4a3a" />
  </g>
);
const helipad: Piece = () => (
  <g>
    <ellipse cx="0" cy="0" rx="50" ry="14" fill="#3a3e40" stroke={INK} stroke-width="1.5" />
    <ellipse cx="0" cy="0" rx="40" ry="10" fill="none" stroke="#f4d28a" stroke-width="2" />
    <path d="M-8 -5 v10 M8 -5 v10 M-8 0 h16" stroke="#f4d28a" stroke-width="2.5" />
    <g class="wp-heli">
      <path d="M-22 -26 q0 -12 16 -12 h12 q10 0 10 10 q0 8 -10 8 h-20 z" fill="#4a5a3a" stroke={INK} stroke-width="1.5" />
      <path d="M16 -30 h26 l4 -6" stroke="#4a5a3a" stroke-width="4" stroke-linecap="round" fill="none" />
      <path d="M-18 -18 v6 M6 -18 v6 M-24 -12 h36" stroke={INK} stroke-width="2" />
      <path d="M-4 -38 v-6" stroke={INK} stroke-width="2" />
      <g transform="translate(-4 -45)">
        <ellipse class="wp-rotor" cx="0" cy="0" rx="34" ry="2.5" fill="#2b2b2e" opacity=".7" />
      </g>
    </g>
  </g>
);
const platform: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="46" ry="9" fill="#000" opacity=".25" />
    <g class="wp-hover">
      <path d="M-44 -30 h88 l-10 12 h-68 z" fill="#34506a" stroke={INK} stroke-width="2" />
      <path d="M-44 -30 h88 v-4 h-88 z" fill="#6fa8c8" />
      <path d="M-24 -18 l6 10 h36 l6 -10" fill="#23364a" stroke={INK} stroke-width="1.5" />
      <path d="M-14 -8 h28" stroke={t.accent} stroke-width="3" class="wp-twinkle" />
      <path d="M-20 -34 v-18 h40 v18" fill="#2c4a6e" stroke={INK} stroke-width="1.5" />
      <path d="M-14 -46 h28" stroke={t.accent} stroke-width="3" opacity=".8" />
    </g>
  </g>
);
const beacon: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="30" ry="8" fill="#000" opacity=".28" />
    <path d="M-16 0 L-6 -70 H6 L16 0 Z" fill="#34506a" stroke={INK} stroke-width="1.8" />
    <path d="M-16 0 L-6 -70 H-1 L-4 0 Z" fill="#6fa8c8" opacity=".6" />
    <circle class="wp-pulse" cx="0" cy="-76" r="8" fill={t.accent} />
    <path class="wp-beam" d="M0 -76 L-60 -200 L-40 -200 Z" fill={t.accent} opacity=".12" />
  </g>
);
const portal: Piece = (t) => (
  <g>
    <ellipse cx="0" cy="0" rx="46" ry="10" fill="#000" opacity=".3" />
    <path d="M-34 0 L-26 -10 L26 -10 L34 0 Z" fill="#3b2d5a" stroke={INK} stroke-width="1.5" />
    <ellipse cx="0" cy="-46" rx="28" ry="38" fill="#150f28" stroke="#4a3a7c" stroke-width="6" />
    <g transform="translate(0 -46)">
      <g class="wp-swirl">
        <ellipse cx="0" cy="0" rx="20" ry="28" fill="none" stroke={t.accent} stroke-width="3" stroke-dasharray="10 8" />
        <ellipse cx="0" cy="0" rx="10" ry="16" fill="none" stroke="#d8b8ff" stroke-width="2.5" stroke-dasharray="6 6" />
      </g>
    </g>
    <ellipse cx="0" cy="-46" rx="6" ry="9" fill="#fff4d0" opacity=".6" class="wp-twinkle" />
  </g>
);
const floatRocks: Piece = (t) => (
  <g>
    {[
      [-30, -30, 1],
      [10, -54, 0.8],
      [36, -24, 0.65],
    ].map(([x, y, s], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
        <g class="wp-hover" style={{ animationDelay: `${-i * 1.1}s` }}>
          <path d="M-18 0 Q-16 -10 0 -12 Q16 -10 18 0 L8 16 L-6 14 Z" fill="#4d3b72" stroke={INK} stroke-width="1.8" />
          <path d="M-18 0 Q-16 -10 0 -12 Q16 -10 18 0 Q0 4 -18 0 Z" fill="#6f5a9e" />
          <path d="M-4 -12 L-1 -24 L3 -12 Z" fill={t.lit} />
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
const PIECE_AT: readonly number[] = [0.58, 0.86];
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
    const s = Math.max(0.7, Math.min(1.35, 0.7 + depth * 0.8));
    items.push({ x, y, s, art: piece(p.t) });
    blocked.push({ x0: x - PIECE_HALF * s, x1: x + PIECE_HALF * s, y0: y - 100 * s, y1: y + 20 });
  });
  return { items, blocked };
}
