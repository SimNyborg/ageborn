/**
 * The living backdrop behind Home: the player's arena (A6.3) as layered, slowly drifting
 * silhouettes with a landmark, ambient motes and a warm glow behind the Battle button. Code-drawn
 * SVG in the A11 palette logic (desaturated, low-contrast backdrops) so it never competes with the
 * UI. Deterministic per arena (cosmetic RNG), purely decorative.
 */
import type { ArenaId } from '@/content/types';
import { fnv1a32, mulberry32 } from '@/core';
import { useMemo } from 'preact/hooks';

interface ArenaPalette {
  skyTop: string;
  skyBottom: string;
  far: string;
  mid: string;
  near: string;
  glow: string;
  mote: string;
}

export const ARENA_PALETTES: Record<ArenaId, ArenaPalette> = {
  tar_pits: { skyTop: '#2a1e3f', skyBottom: '#c7703a', far: '#5b3a4a', mid: '#3d2a36', near: '#241826', glow: '#ffb35a', mote: '#ffcf8a' },
  frostfang: { skyTop: '#1b2a4f', skyBottom: '#8fc3e8', far: '#6f8fb8', mid: '#4a6690', near: '#2b3c5e', glow: '#dff4ff', mote: '#ffffff' },
  kingsmoat: { skyTop: '#23294a', skyBottom: '#7fa0a8', far: '#5d6f7c', mid: '#3f4d5c', near: '#27303d', glow: '#ffe3a0', mote: '#fff2c4' },
  powder_bay: { skyTop: '#1c2b44', skyBottom: '#d99a5c', far: '#56707a', mid: '#2e4a52', near: '#1b2d34', glow: '#ffc27a', mote: '#ffe1b0' },
  iron_front: { skyTop: '#26262a', skyBottom: '#9a8a6a', far: '#6a6456', mid: '#48443a', near: '#2c2a25', glow: '#ffcf7a', mote: '#e8d9b0' },
  neon_harbor: { skyTop: '#14082b', skyBottom: '#6b2a7a', far: '#3c2a6a', mid: '#281c4c', near: '#170f30', glow: '#ff5ac8', mote: '#5ff2ff' },
  orbital_ring: { skyTop: '#07081c', skyBottom: '#2a2a6a', far: '#2c2f5c', mid: '#1c1e40', near: '#10112a', glow: '#8fb0ff', mote: '#ffffff' },
  chrono_rift: { skyTop: '#1a0a2e', skyBottom: '#7a3fb0', far: '#4a2a7a', mid: '#301a55', near: '#1c0f36', glow: '#f5b82e', mote: '#d8b8ff' },
};

const W = 1600;
const H = 900;

/** A smooth ridge path from seeded heights, closed to the bottom. */
function ridge(seed: number, base: number, amp: number, step: number): string {
  const rng = mulberry32(seed);
  const pts: [number, number][] = [];
  for (let x = -step; x <= W + step; x += step) pts.push([x, base - rng.next() * amp]);
  let d = `M${pts[0]![0]} ${H} L${pts[0]![0]} ${pts[0]![1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const mx = (x0 + x1) / 2;
    d += ` Q${x0} ${y0.toFixed(1)} ${mx} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1]!;
  d += ` L${last[0]} ${last[1].toFixed(1)} L${last[0]} ${H} Z`;
  return d;
}

function Landmark(p: { arena: ArenaId; color: string; glow: string }) {
  const c = p.color;
  switch (p.arena) {
    case 'tar_pits':
      return (
        <g fill={c}>
          <ellipse cx="1180" cy="700" rx="160" ry="26" fill={p.glow} opacity=".25" />
          <path d="M1060 700c20-40 60-30 70 0zM1190 705c14-30 50-24 58 0zM1260 698c10-22 34-18 40 0z" />
          <path d="M300 640l40-120 30 70 20-50 50 100z" />
        </g>
      );
    case 'frostfang':
      return (
        <g fill={c}>
          <path d="M980 700l120-300 60 120 50-80 140 260z" />
          <path d="M1100 400l-24 60 30-10 18 30 20-40z" fill="#fff" opacity=".75" />
        </g>
      );
    case 'kingsmoat':
      return (
        <g fill={c}>
          <path d="M1040 700V520h30v-30h24v30h40v-80h-10v-30h60v30h-10v80h40v-30h24v30h30v180z" />
          <path d="M1144 380v-50" stroke={c} stroke-width="6" />
          <path d="M1147 330h40l-12 12 12 12h-40z" fill={p.glow} opacity=".7" />
        </g>
      );
    case 'powder_bay':
      return (
        <g fill={c}>
          <path d="M1000 690h300l-30 40h-240z" />
          <path d="M1090 690V420M1180 690V450" stroke={c} stroke-width="8" />
          <path d="M1095 430h70l-10 90h-60zM1185 460h60l-10 80h-50z" opacity=".9" />
        </g>
      );
    case 'iron_front':
      return (
        <g fill={c}>
          <path d="M1000 700V560h60V470h30v90h50V440h34v120h60v140z" />
          <circle cx="1075" cy="430" r="26" fill={c} opacity=".35" />
          <circle cx="1150" cy="400" r="32" fill={c} opacity=".3" />
        </g>
      );
    case 'neon_harbor':
      return (
        <g>
          <path d="M960 700V460h70v240zM1050 700V380h90v320zM1160 700V500h60v200zM1240 700V420h80v280z" fill={c} />
          <path d="M1060 400h70M1060 440h70M1250 450h60M970 480h50" stroke={p.glow} stroke-width="5" opacity=".8" />
          <path d="M1170 520h40" stroke="#5ff2ff" stroke-width="5" opacity=".8" />
        </g>
      );
    case 'orbital_ring':
      return (
        <g fill="none">
          <ellipse cx="1150" cy="300" rx="340" ry="70" stroke={p.glow} stroke-width="10" opacity=".35" transform="rotate(-12 1150 300)" />
          <circle cx="1150" cy="300" r="90" fill={c} />
          <ellipse cx="1150" cy="300" rx="340" ry="70" stroke={p.glow} stroke-width="4" opacity=".6" transform="rotate(-12 1150 300)" stroke-dasharray="820 1400" />
        </g>
      );
    case 'chrono_rift':
      return (
        <g fill={c}>
          <path d="M1060 700l40-260 40 260zM1150 700l30-180 30 180zM990 700l30-140 30 140z" />
          <path d="M1100 440l-8 90 14-60z" fill={p.glow} opacity=".8" />
          <circle cx="1120" cy="300" r="70" fill="none" stroke={p.glow} stroke-width="4" opacity=".5" stroke-dasharray="12 16" />
        </g>
      );
  }
}

export function ArenaScene(p: { arena: ArenaId }) {
  const pal = ARENA_PALETTES[p.arena];
  const seed = fnv1a32(p.arena);
  const paths = useMemo(
    () => ({
      far: ridge(seed, 560, 180, 110),
      mid: ridge(seed + 1, 660, 120, 80),
      near: ridge(seed + 2, 760, 60, 60),
    }),
    [seed],
  );
  const motes = useMemo(() => {
    const rng = mulberry32(seed + 7);
    return Array.from({ length: 16 }, () => ({
      left: `${(rng.next() * 100).toFixed(1)}%`,
      delay: `${(-rng.next() * 12).toFixed(2)}s`,
      dur: `${(9 + rng.next() * 8).toFixed(2)}s`,
      size: `${(2 + rng.next() * 3).toFixed(1)}px`,
    }));
  }, [seed]);
  const gid = `home-sky-${p.arena}`;
  return (
    <div class="home-scene" aria-hidden="true">
      <svg class="home-scene__sky" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color={pal.skyTop} />
            <stop offset="1" stop-color={pal.skyBottom} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${gid})`} />
        <circle cx="800" cy="520" r="260" fill={pal.glow} opacity=".16" />
        <circle cx="800" cy="520" r="140" fill={pal.glow} opacity=".14" />
      </svg>
      <svg class="home-scene__layer home-scene__layer--far" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={paths.far} fill={pal.far} opacity=".75" />
        <Landmark arena={p.arena} color={pal.mid} glow={pal.glow} />
      </svg>
      <svg class="home-scene__layer home-scene__layer--mid" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={paths.mid} fill={pal.mid} />
      </svg>
      <svg class="home-scene__layer home-scene__layer--near" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <path d={paths.near} fill={pal.near} />
      </svg>
      <div class="home-scene__motes">
        {motes.map((m, i) => (
          <i key={i} style={{ left: m.left, animationDelay: m.delay, animationDuration: m.dur, width: m.size, height: m.size, background: pal.mote }} />
        ))}
      </div>
      <div class="home-scene__vignette" />
    </div>
  );
}
