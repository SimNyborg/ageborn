/**
 * Shared sky art for the Home diorama and the War Path (UI art audit #3, #5, #7): cumulus clouds with
 * lit tops and flat shaded undersides, and two-tone mountain ranges with snow caps and an atmospheric
 * fade toward the sky. Pure SVG fragments; decorative (`aria-hidden` through the parent SVG).
 */
import type { ComponentChildren } from 'preact';
import { ink, light, mix, shade } from '../../components/tone';

const blob = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** Cloud silhouettes (about 100 wide, flat base at y 0), picked by `kind`. */
const CLOUDS: readonly (readonly [number, number, number][])[] = [
  [
    [-30, -9, 13],
    [-12, -19, 18],
    [10, -21, 16],
    [28, -11, 12],
  ],
  [
    [-22, -10, 12],
    [-4, -20, 17],
    [18, -13, 13],
  ],
  [
    [-36, -8, 10],
    [-20, -16, 14],
    [0, -24, 18],
    [20, -17, 14],
    [36, -9, 10],
  ],
];

let cloudN = 0;

/** A crescent along the upper-left rim of a puff (the sun-lit edge), as a filled path. */
function crescent(cx: number, cy: number, r: number): string {
  const pt = (a: number, rr: number, oy = 0) => `${(cx + Math.cos((a * Math.PI) / 180) * rr).toFixed(1)} ${(cy + oy + Math.sin((a * Math.PI) / 180) * rr).toFixed(1)}`;
  const R = r * 0.9;
  const ri = r * 0.7;
  return `M${pt(196, R)}A${R} ${R} 0 0 1 ${pt(330, R)}A${ri} ${ri} 0 0 0 ${pt(206, ri, r * 0.16)}Z`;
}

/**
 * A cumulus cloud (UI art audit §2.1, review fix): puffs over a rounded base, the shaded underside
 * first (cloud shadow mixed with the sky) with a soft feathered rim, the lit body lifted over it so a
 * curved shadow crescent stays along the bottom, then sun-lit crescents on the crowns of the tallest
 * puffs. No outline (a soft edge, per the art sheet), so it sits behind the outlined layers.
 */
export function Cumulus(p: { kind?: number; sky: string; tint?: string; opacity?: number }): ComponentChildren {
  const parts = CLOUDS[(p.kind ?? 0) % CLOUDS.length]!;
  const body = p.tint ?? '#f4f1ea';
  const under = mix('#a9a6b0', p.sky, 0.38);
  const mid = mix(body, under, 0.35);
  const id = `cu${(cloudN = (cloudN + 1) % 1e9)}`;
  const x0 = Math.min(...parts.map(([x, , r]) => x - r));
  const x1 = Math.max(...parts.map(([x, , r]) => x + r));
  const cx = (x0 + x1) / 2;
  const base = (lift: number, k: number): string => {
    const rx = ((x1 - x0) / 2) * k;
    return `M${cx - rx} ${-3 - lift}a${rx} 5 0 1 0 ${2 * rx} 0a${rx} 5 0 1 0 ${-2 * rx} 0Z`;
  };
  const all = parts.map(([x, y, r]) => blob(x, y, r)).join('') + base(0, 1);
  const lit = parts.map(([x, y, r]) => blob(x - r * 0.04, y - 4.2, r * 0.95)).join('') + base(4.2, 0.9);
  const tops = [...parts].sort((a, b) => a[1] - a[2] - (b[1] - b[2])).slice(0, 2);
  return (
    <g opacity={p.opacity ?? 1}>
      <clipPath id={id}>
        <path d="M-80 -80H80V3.4H-80Z" />
      </clipPath>
      <g clip-path={`url(#${id})`}>
        <path d={all} fill={under} />
        <path d={lit} fill={mid} />
        <path d={parts.map(([x, y, r]) => blob(x - r * 0.05, y - 5.4, r * 0.93)).join('') + base(5.4, 0.86)} fill={body} />
        {tops.map(([x, y, r], i) => (
          <path key={i} d={crescent(x - r * 0.05, y - 5.4, r * 0.93)} fill="#fff" opacity={i ? 0.6 : 0.9} />
        ))}
      </g>
    </g>
  );
}

type Rng = { next(): number };

/**
 * A mountain range on `base`: peaks with a lit left face and a shaded right face split by a jagged
 * ridge line, optional snow caps, in `color` faded `fade` of the way toward the sky.
 */
export function Mountains(p: { rng: Rng; w: number; base: number; amp: number; step: number; color: string; sky: string; fade: number; snow?: boolean; bottom: number }): ComponentChildren {
  const c = mix(p.color, p.sky, p.fade);
  const lit = mix(c, '#ffffff', 0.12);
  const dark = mix(c, '#000000', 0.18);
  const snowLit = mix('#f4f6fa', p.sky, p.fade * 0.6);
  const snowDark = mix('#c9d3e2', p.sky, p.fade * 0.6);
  const out: ComponentChildren[] = [];
  out.push(<rect key="fill" x="0" y={p.base - 1} width={p.w} height={p.bottom - p.base + 1} fill={dark} />);
  for (let x = -p.step * 0.5, i = 0; x < p.w + p.step; x += p.step * (0.7 + p.rng.next() * 0.6), i++) {
    const h = p.amp * (0.5 + p.rng.next() * 0.5);
    const hw = h * (0.95 + p.rng.next() * 0.5);
    const top = p.base - h;
    const rx = x + hw * 0.12;
    const j1 = top + h * 0.3;
    const j2 = top + h * 0.62;
    const ridge = `L${(rx + hw * 0.05).toFixed(1)} ${j1.toFixed(1)} L${(rx - hw * 0.04).toFixed(1)} ${j2.toFixed(1)} L${(rx + hw * 0.08).toFixed(1)} ${p.base}`;
    out.push(
      <g key={i}>
        <path d={`M${(x - hw).toFixed(1)} ${p.base} L${x.toFixed(1)} ${top.toFixed(1)} ${ridge} Z`} fill={lit} />
        <path d={`M${x.toFixed(1)} ${top.toFixed(1)} L${(x + hw).toFixed(1)} ${p.base} L${(rx + hw * 0.08).toFixed(1)} ${p.base} L${(rx - hw * 0.04).toFixed(1)} ${j2.toFixed(1)} L${(rx + hw * 0.05).toFixed(1)} ${j1.toFixed(1)} Z`} fill={dark} />
        {p.snow && h > p.amp * 0.62 ? (
          <>
            <path d={`M${x.toFixed(1)} ${top.toFixed(1)} L${(x - hw * 0.3).toFixed(1)} ${(top + h * 0.3).toFixed(1)} L${(x - hw * 0.16).toFixed(1)} ${(top + h * 0.24).toFixed(1)} L${(x - hw * 0.06).toFixed(1)} ${(top + h * 0.34).toFixed(1)} L${(rx + hw * 0.03).toFixed(1)} ${(top + h * 0.26).toFixed(1)}Z`} fill={snowLit} />
            <path d={`M${x.toFixed(1)} ${top.toFixed(1)} L${(rx + hw * 0.03).toFixed(1)} ${(top + h * 0.26).toFixed(1)} L${(x + hw * 0.14).toFixed(1)} ${(top + h * 0.33).toFixed(1)} L${(x + hw * 0.3).toFixed(1)} ${(top + h * 0.29).toFixed(1)}Z`} fill={snowDark} />
          </>
        ) : null}
      </g>,
    );
  }
  return <g>{out}</g>;
}

// ---------------------------------------------------------------------------------------------
// Birds (UI art audit #5): a real bird with body, head, beak, tail and wings in 6 frames
// ---------------------------------------------------------------------------------------------

export type BirdKind = 'crow' | 'gull' | 'pigeon' | 'drone' | 'manta';

const BIRD_LOOK: Readonly<Record<BirdKind, { body: string; wing: string; far: string; beak: string; eye: string; glow?: string; rim?: string }>> = {
  crow: { body: '#4a4756', wing: '#3a3846', far: '#2a2934', beak: '#e0a43a', eye: '#f4ecd8', rim: '#a9b4d0' },
  gull: { body: '#f2f1ec', wing: '#c3cad2', far: '#9aa3ad', beak: '#f0b43a', eye: '#2b2a30' },
  pigeon: { body: '#8d93a3', wing: '#a9aebb', far: '#6f7584', beak: '#d8a07a', eye: '#f2c14e' },
  drone: { body: '#5d6c7c', wing: '#9fd0ff', far: '#3f4d5c', beak: '#5ff2ff', eye: '#5ff2ff', glow: '#5ff2ff' },
  manta: { body: '#6b4fb0', wing: '#8d6fd8', far: '#4a3a7c', beak: '#f5b82e', eye: '#fff4d0', glow: '#d8b8ff' },
};

/** The near wing per flap frame: up, mid, down, down-follow, mid (recover); then the glide pose. */
const WING_FRAMES: readonly string[] = [
  'M10.8 8.4Q11.8 2.2 15.4 0.6Q14.8 4.6 14.6 8.6Z',
  'M10.6 8.6Q13 4.8 17.4 4.2Q15.4 7 14.8 9Z',
  'M10.8 9.2Q12.4 13.2 15.6 15.4Q15.2 11.6 14.6 9.4Z',
  'M10.8 9.2Q12.2 12 14.8 13.4Q14.6 11 14.2 9.4Z',
  'M10.6 8.8Q13.2 6.4 17 6.4Q15.2 8.4 14.8 9.2Z',
];
/** Wings drawn 1.4x about the shoulder, so the span reads at Home and War Path sizes (review fix). */
const WING_SCALE = 'translate(12 8.8) scale(1.4) translate(-12 -8.8)';
const WING_GLIDE = 'M10.4 8.6Q14.2 7.4 19.4 7Q15.8 9.6 14.6 9.6Z';
/** The far wing peeks out behind the body on the up-strokes. */
const FAR_FRAMES: readonly (string | null)[] = ['M12 8Q13.4 3 16.6 2.2Q15.6 5.6 15 8.2Z', 'M12 8.2Q14.4 5.4 18 5.2Q16 7.6 15.2 8.6Z', null, null, 'M12 8.4Q14.2 6.8 17.4 6.8Q15.6 8.4 15 8.8Z'];
const BODY = 'M4.8 9.2Q8.8 6.6 14.6 7.6Q17.4 7.2 19.4 8.2Q20.4 8.9 19.4 9.7Q16.8 11.1 12.8 10.9Q8.2 10.9 4.8 9.2Z';
const TAIL = 'M5.6 8.8 1.2 7 2.2 9.2 1.2 11.4 5.6 9.8Z';
const BEAK = 'M19.6 8.3 22.2 8.9 19.6 9.6Z';

function BirdFrame(p: { k: BirdKind; wing: string; far: string | null }) {
  const c = BIRD_LOOK[p.k];
  const o = ink(c.body);
  return (
    <>
      {p.far ? <path d={p.far} transform={WING_SCALE} fill={c.far} stroke={ink(c.far)} stroke-width=".7" stroke-linejoin="round" /> : null}
      <path d={TAIL} fill={c.wing} stroke={ink(c.wing)} stroke-width=".8" stroke-linejoin="round" />
      <path d={BEAK} fill={c.beak} stroke={ink(c.beak)} stroke-width=".7" stroke-linejoin="round" />
      <path d={BODY} fill={c.body} stroke={o} stroke-width=".9" stroke-linejoin="round" />
      <path d="M6.6 9.8Q10 10.6 13 10.6Q16.6 10.6 18.8 9.6Q16.6 10.9 12.8 10.9Q8.6 10.9 6.6 9.8Z" fill={shade(c.body)} />
      <path d="M12 7.7Q15 7.3 17.4 7.6Q15.2 8 12.6 8.4Z" fill={light(c.body)} />
      <circle cx="18.2" cy="8.3" r=".75" fill={c.eye} />
      {c.glow ? <circle cx="18.2" cy="8.3" r="1.8" fill={c.glow} opacity=".35" /> : null}
      {/* a pale rim under the body and along the wing's leading edge, so dark birds read on dark skies */}
      <path d="M6.4 9.9Q10 11.3 13 11.3Q16.6 11.2 18.9 9.9" stroke={c.rim ?? light(c.body, 'gloss')} stroke-width=".55" fill="none" opacity=".85" />
      <g transform={WING_SCALE}>
        <path d={p.wing} fill={c.wing} stroke={ink(c.wing)} stroke-width=".7" stroke-linejoin="round" />
        <path d={p.wing} fill="none" stroke={c.rim ?? light(c.wing, 'gloss')} stroke-width=".45" stroke-dasharray="3.2 40" opacity=".9" />
      </g>
    </>
  );
}

/**
 * One bird, flying right: a 5-frame flap strip stepped by CSS (`steps(5)`, 90 ms a frame) that hands
 * over to the glide pose for a second or two every few seconds (motion.css `.ui-bird`). `phase` staggers
 * the flap so a flock never flaps in sync. Reduce motion shows the glide pose only.
 */
export function Bird(p: { kind: BirdKind; size: number; phase?: number; cycle?: number; flip?: boolean }) {
  const delay = `${-(p.phase ?? 0).toFixed(2)}s`;
  return (
    <svg class={`ui-bird${p.flip ? ' ui-bird--flip' : ''}`} viewBox="0 -4 24 22" width={p.size} height={(p.size * 22) / 24} aria-hidden="true" style={{ '--bird-cycle': `${p.cycle ?? 6}s`, '--bird-delay': delay }}>
      <g class="ui-bird__flap">
        <g class="ui-bird__strip">
          {WING_FRAMES.map((w, i) => (
            <g key={i} transform={`translate(${i * 24} 0)`}>
              <BirdFrame k={p.kind} wing={w} far={FAR_FRAMES[i] ?? null} />
            </g>
          ))}
        </g>
      </g>
      <g class="ui-bird__glide">
        <BirdFrame k={p.kind} wing={WING_GLIDE} far={null} />
      </g>
    </svg>
  );
}

/** A loose V of birds with staggered flap phases (the flock's path and bank are the caller's CSS). */
export function Flock(p: { kind: BirdKind; n: number; size: number; seed: number }) {
  return (
    <>
      {Array.from({ length: p.n }, (_, i) => {
        const row = Math.ceil(i / 2);
        const side = i % 2 ? -1 : 1;
        const jitter = ((p.seed * (i + 3)) % 7) / 7;
        return (
          <span key={i} class="ui-flock__bird" style={{ left: `${(row * 0.9 + jitter * 0.3) * p.size * -1}px`, top: `${(row * side * 0.42 + jitter * 0.2) * p.size}px` }}>
            <Bird kind={p.kind} size={p.size * (1 - row * 0.06)} phase={(i * 0.13 + jitter * 0.3) % 0.45} cycle={5 + ((i + p.seed) % 4)} />
          </span>
        );
      })}
    </>
  );
}
