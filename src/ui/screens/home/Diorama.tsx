/**
 * The arena diorama at the centre of the Battle hub (owner decision 2026-09-30; ui-plan 2.3): the
 * player's arena as a floating island in the A11 cartoon look, with the lane across it, your base on
 * the left (team colour) and the AI's base on the right, each with its banner, and the arena's own
 * landmark behind them (a smoking volcano, an ice peak, a moated keep, a harbour with a tall ship, a
 * factory, a neon skyline, a ringed planet, a time rift).
 *
 * The bases are the real base pictures from the art provider (`BaseLook`, the ArtProvider portrait
 * `base.<age>`; the AI's in its team colour), so swapping art changes them here too; the island,
 * landmark and props are code-drawn chrome like the War Path regions. Each side's frontline troops
 * (your War Plan's first units, the AI's from its plan; ArtProvider portraits) stand in the lane:
 * they breathe, the back ones taunt with a hop, and every few seconds the front pair lunges in for a
 * near-clash with a spark and springs back (anticipation, stretch, recoil, settle). Ambient life
 * (the island's float, smoke, water, flags, snow, neon, motes) is CSS and stills under reduce
 * motion. Deterministic, decorative (`aria-hidden`).
 */
import type { AgeId, CardId, Side } from '@/contracts';
import type { ArenaId } from '@/content/types';
import { fnv1a32, mulberry32 } from '@/core';
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { BaseLook } from '../../components/cosmeticArt';
import { usePortrait } from '../../components/kit';

interface IslandPalette {
  /** Top surface, its lit side and its patches. */
  top: string;
  lit: string;
  patch: string;
  /** Cliff body, its shadow and its strata. */
  cliff: string;
  cliffDark: string;
  strata: string;
  /** The lane's dirt and its worn centre. */
  lane: string;
  laneLit: string;
  /** Foliage or crystal props. */
  prop: string;
  propLit: string;
  /** The glow under the island. */
  glow: string;
}

export const ISLANDS: Readonly<Record<ArenaId, IslandPalette>> = {
  tar_pits: { top: '#6d6b35', lit: '#93913f', patch: '#4f4d27', cliff: '#6a4a3a', cliffDark: '#3b271f', strata: '#8a634c', lane: '#a4815a', laneLit: '#c9a577', prop: '#3f5a2a', propLit: '#6f8f3c', glow: '#ff9a4a' },
  frostfang: { top: '#dfe9f2', lit: '#ffffff', patch: '#b8cbe0', cliff: '#6b7f9a', cliffDark: '#3c4a62', strata: '#8ea3bf', lane: '#a7b8cc', laneLit: '#cfdbe8', prop: '#2f5a58', propLit: '#4f8a82', glow: '#bfe6ff' },
  kingsmoat: { top: '#5f8a3f', lit: '#86b04e', patch: '#44692c', cliff: '#6f6a5e', cliffDark: '#3d3a33', strata: '#8e897a', lane: '#b49a6c', laneLit: '#d4bd8c', prop: '#2e5226', propLit: '#5a8a3c', glow: '#ffe3a0' },
  powder_bay: { top: '#c9b27a', lit: '#e6d39c', patch: '#a8925c', cliff: '#7a6a52', cliffDark: '#433a2c', strata: '#9b8a6c', lane: '#b49064', laneLit: '#d6b486', prop: '#3f6a3a', propLit: '#6e9a4e', glow: '#ffc27a' },
  iron_front: { top: '#6b6650', lit: '#8a8466', patch: '#4f4b3a', cliff: '#5a544a', cliffDark: '#2f2c27', strata: '#76705f', lane: '#8a7c62', laneLit: '#a99a7c', prop: '#4a4436', propLit: '#6e6650', glow: '#ffcf7a' },
  neon_harbor: { top: '#3a3a5e', lit: '#51517e', patch: '#2a2a48', cliff: '#2c2a44', cliffDark: '#17162a', strata: '#403d62', lane: '#56567e', laneLit: '#7a7aa8', prop: '#ff5ac8', propLit: '#ffb0e6', glow: '#ff5ac8' },
  orbital_ring: { top: '#4a5a7a', lit: '#6a7ea6', patch: '#35425c', cliff: '#2f3650', cliffDark: '#171b2c', strata: '#46507a', lane: '#8a9ac0', laneLit: '#b8c6e6', prop: '#5f8fd8', propLit: '#9fd0ff', glow: '#8fb0ff' },
  chrono_rift: { top: '#4f3a7a', lit: '#6f54a6', patch: '#3a2a5c', cliff: '#3a2a55', cliffDark: '#1c1230', strata: '#54407c', lane: '#8f7ac0', laneLit: '#b8a6e6', prop: '#f5b82e', propLit: '#ffe39a', glow: '#d8b8ff' },
};

const W = 600;
const H = 340;

/** The island's cliff underside: a jagged, stepped rock mass hanging below the top ellipse. */
function cliffPath(seed: number): string {
  const rng = mulberry32(seed);
  const pts: string[] = [];
  const n = 13;
  for (let i = 0; i <= n; i++) {
    const x = 44 + ((W - 88) * i) / n;
    const edge = Math.sin((i / n) * Math.PI);
    const y = 214 + edge * (70 + rng.next() * 34) + (i % 2 ? 10 : -4);
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M38 206 L${pts.join(' L')} L562 206 Z`;
}

function Smoke(p: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g class="hd-smoke" transform={`translate(${p.x} ${p.y}) scale(${p.s ?? 1})`}>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} class="hd-smoke__puff" r={9 + i * 3} fill={p.color ?? '#8a7d80'} style={{ animationDelay: `${-i * 1.05}s` }} />
      ))}
    </g>
  );
}

/** Each arena's landmark, drawn behind the island (its y 196 lands on the island's back edge). */
function Landmark(p: { arena: ArenaId }): ComponentChildren {
  switch (p.arena) {
    case 'tar_pits':
      return (
        <g>
          <path d="M210 196 L270 92 L286 98 L298 88 L312 96 L380 196 Z" fill="#5a3d3a" />
          <path d="M270 92 L286 98 L298 88 L312 96 L300 132 L278 138 Z" fill="#7a5048" />
          <path d="M282 96 q10 -8 22 -2" stroke="#ff8a3a" stroke-width="5" fill="none" class="hd-glow" />
          <path d="M292 104 Q296 140 286 178" stroke="#ff7a2a" stroke-width="4" fill="none" opacity=".85" class="hd-glow" />
          <Smoke x={298} y={80} s={1.1} />
          <ellipse cx="408" cy="206" rx="34" ry="8" fill="#1d1612" />
          <ellipse cx="400" cy="204" rx="16" ry="3" fill="#4a3a30" opacity=".7" />
          <circle class="hd-bubble" cx="398" cy="205" r="3" fill="#2b221c" stroke="#5a4a3c" stroke-width="1" />
          <circle class="hd-bubble hd-bubble--2" cx="416" cy="206" r="2.4" fill="#2b221c" stroke="#5a4a3c" stroke-width="1" />
        </g>
      );
    case 'frostfang':
      return (
        <g>
          <path d="M190 198 L262 76 L292 118 L316 84 L406 198 Z" fill="#8ea3bf" />
          <path d="M262 76 L292 118 L316 84 L336 118 L318 112 L300 132 L282 110 L262 122 L246 104 Z" fill="#fff" />
          <path d="M262 76 L246 104 L230 128 L262 110 Z" fill="#dfe9f2" />
          <path d="M316 84 L360 150 L352 196 L406 198 Z" fill="#6b7f9a" opacity=".6" />
          <g class="hd-snow">
            {[80, 150, 230, 320, 400, 470, 530].map((x, i) => (
              <circle key={x} cx={x} cy={40 + (i % 3) * 30} r={i % 2 ? 1.8 : 2.4} fill="#fff" style={{ animationDelay: `${-i * 0.9}s` }} />
            ))}
          </g>
        </g>
      );
    case 'kingsmoat':
      return (
        <g>
          <ellipse cx="300" cy="200" rx="96" ry="14" fill="#3f7a9a" />
          <path class="hd-shimmer" d="M220 200 h26 M262 203 h20 M320 199 h30 M364 202 h14" stroke="#bfe6ff" stroke-width="2" stroke-linecap="round" opacity=".7" />
          <g fill="#7d8698">
            <rect x="250" y="130" width="100" height="66" />
            <rect x="238" y="104" width="26" height="92" />
            <rect x="336" y="104" width="26" height="92" />
            <rect x="286" y="84" width="28" height="112" />
          </g>
          <path d="M250 130 h100 v8 h-100z M238 104 h26 v6 h-26z M336 104 h26 v6 h-26z" fill="#a8b0c0" />
          <path d="M234 104 L251 84 L268 104 Z M332 104 L349 84 L366 104 Z M282 84 L300 60 L318 84 Z" fill="#b8453a" />
          <path d="M290 196 v-26 a10 10 0 0 1 20 0 v26z" fill="#2b2420" />
          <path d="M300 60 v-16" stroke="#3f4856" stroke-width="2.5" />
          <path class="hd-flag" d="M301 44 h18 l-5 5 l5 5 h-18 z" fill="#ffd466" />
        </g>
      );
    case 'powder_bay':
      return (
        <g>
          <path d="M150 204 Q300 188 450 204 L450 214 L150 214 Z" fill="#2f6a8a" />
          <path class="hd-shimmer" d="M170 206 h24 M214 209 h18 M300 205 h26 M360 208 h20 M410 206 h16" stroke="#cfeaff" stroke-width="2" stroke-linecap="round" opacity=".7" />
          <g class="hd-ship">
            <path d="M246 196 h110 l-16 18 h-80 z" fill="#5a3a24" />
            <path d="M246 196 h110 l-4 5 h-102 z" fill="#8a5a34" />
            <path d="M282 196 V96 M322 196 V112" stroke="#3b2a1e" stroke-width="3.5" />
            <path d="M284 102 q30 16 0 36 z M284 142 q36 14 0 44 z M324 118 q24 12 0 30 z M324 152 q28 12 0 36 z" fill="#f0e6cc" stroke="#9a8a6a" stroke-width="1" />
            <path class="hd-flag" d="M283 96 h16 l-4 4 l4 4 h-16z" fill="#b8453a" />
          </g>
        </g>
      );
    case 'iron_front':
      return (
        <g>
          <g fill="#4d4640">
            <rect x="214" y="150" width="84" height="48" />
            <path d="M214 150 l14 -14 l14 14 l14 -14 l14 14 l14 -14 l14 14 z" />
            <rect x="300" y="132" width="70" height="66" />
            <rect x="312" y="74" width="12" height="62" />
            <rect x="340" y="92" width="11" height="44" />
            <rect x="378" y="162" width="46" height="36" />
          </g>
          <g fill="#ffbe6e" class="hd-windows">
            {[222, 236, 250, 264, 278].map((x) => (
              <rect key={x} x={x} y="170" width="7" height="9" />
            ))}
            {[310, 326, 342, 356].map((x) => (
              <rect key={x} x={x} y="150" width="7" height="9" />
            ))}
          </g>
          <Smoke x={318} y={68} s={1.1} color="#6d6560" />
          <Smoke x={345} y={86} s={0.85} color="#7a716a" />
        </g>
      );
    case 'neon_harbor':
      return (
        <g>
          {[
            [206, 44, 90],
            [252, 38, 130],
            [292, 52, 112],
            [346, 36, 150],
            [384, 44, 100],
          ].map(([x, w, h], i) => (
            <g key={i}>
              <rect x={x} y={198 - h!} width={w} height={h} fill={i % 2 ? '#2a2548' : '#231f3e'} />
              <rect class={`hd-neon hd-neon--${i % 3}`} x={x! + 5} y={206 - h!} width={w! - 10} height="3" fill={i % 2 ? '#5ff2ff' : '#ff5ac8'} />
              {Array.from({ length: Math.floor(h! / 18) }, (_, r) => (
                <rect key={r} x={x! + 7} y={218 - h! + r * 18} width={w! - 14} height="3" fill="#ffd9f2" opacity={(r + i) % 3 ? 0.14 : 0.45} />
              ))}
            </g>
          ))}
          <path d="M364 48 v-20" stroke="#2a2548" stroke-width="3" />
          <circle class="hd-blink" cx="364" cy="26" r="3.5" fill="#ff4a8a" />
        </g>
      );
    case 'orbital_ring':
      return (
        <g>
          <circle cx="300" cy="104" r="50" fill="#3f4f8a" />
          <circle cx="286" cy="90" r="34" fill="#6a82c8" opacity=".55" />
          <g class="hd-orbit">
            <ellipse cx="300" cy="104" rx="104" ry="20" fill="none" stroke="#9fd0ff" stroke-width="4" opacity=".75" transform="rotate(-12 300 104)" stroke-dasharray="210 120" />
          </g>
          <circle cx="420" cy="54" r="7" fill="#c9d6ff" class="hd-twinkle" />
          <path d="M240 198 L256 150 L272 198 Z M330 198 L342 162 L354 198 Z" fill="#35425c" />
        </g>
      );
    case 'chrono_rift':
      return (
        <g>
          <g class="hd-rift">
            <ellipse cx="300" cy="110" rx="46" ry="62" fill="none" stroke="#f5b82e" stroke-width="4" stroke-dasharray="14 10" opacity=".85" />
            <ellipse cx="300" cy="110" rx="30" ry="44" fill="none" stroke="#d8b8ff" stroke-width="3" stroke-dasharray="8 8" opacity=".8" />
          </g>
          <ellipse cx="300" cy="110" rx="20" ry="32" fill="#fff4d0" opacity=".35" class="hd-glow" />
          <path d="M226 198 L244 110 L262 198 Z M338 198 L356 124 L374 198 Z M270 198 L280 150 L290 198 Z" fill="#54407c" />
          <path d="M244 110 L262 198 L252 198 Z M356 124 L374 198 L364 198 Z" fill="#b8a6e6" opacity=".5" />
        </g>
      );
  }
}

/** Small props on the island's rim: trees, rocks or crystals, placed off the lane. */
function Props(p: { pal: IslandPalette; seed: number; arena: ArenaId }) {
  const rng = mulberry32(p.seed + 3);
  const spots: { x: number; y: number; s: number; k: number }[] = [
    { x: 70, y: 202, s: 1, k: 0 },
    { x: 112, y: 190, s: 0.8, k: 1 },
    { x: 488, y: 190, s: 0.85, k: 2 },
    { x: 534, y: 204, s: 1.05, k: 0 },
    { x: 196, y: 244, s: 0.7, k: 3 },
    { x: 410, y: 246, s: 0.75, k: 3 },
  ];
  const crystal = p.arena === 'neon_harbor' || p.arena === 'orbital_ring' || p.arena === 'chrono_rift';
  return (
    <g>
      {spots.map((q, i) => {
        const v = rng.next();
        const tr = `translate(${q.x} ${q.y}) scale(${q.s})`;
        if (q.k === 3)
          return (
            <g key={i} transform={tr}>
              <ellipse cx="0" cy="0" rx="12" ry="3.5" fill="#000" opacity=".25" />
              <path d="M-11 0 Q-12 -10 -3 -13 Q8 -14 11 -5 Q12 0 8 0 Z" fill={p.pal.cliff} />
              <path d="M-9 -4 Q-9 -10 -2 -11 Q1 -8 -3 -5 Z" fill={p.pal.strata} />
            </g>
          );
        if (crystal)
          return (
            <g key={i} transform={tr}>
              <ellipse cx="0" cy="0" rx="12" ry="3.5" fill="#000" opacity=".25" />
              <g class="hd-twinkle" style={{ animationDelay: `${-i * 0.7}s` }}>
                <path d={`M-9 0 L-5 -${18 + v * 8} L-1 0 Z M-2 0 L3 -${28 + v * 10} L8 0 Z`} fill={p.pal.prop} />
                <path d={`M-5 -${18 + v * 8} L-1 0 L-3 0 Z M3 -${28 + v * 10} L8 0 L5 0 Z`} fill="#fff" opacity=".5" />
              </g>
            </g>
          );
        return (
          <g key={i} transform={tr}>
            <ellipse cx="0" cy="0" rx="14" ry="4" fill="#000" opacity=".25" />
            <g class="hd-sway" style={{ animationDelay: `${-i * 0.8}s` }}>
            <rect x="-2.5" y="-12" width="5" height="12" fill="#4d3423" />
            {q.k === 1 ? (
              <>
                <path d="M0 -46 L13 -14 L-13 -14 Z M0 -34 L15 -6 L-15 -6 Z" fill={p.pal.prop} />
                <path d="M0 -46 L-13 -14 L-3 -14 Z M0 -34 L-15 -6 L-5 -6 Z" fill={p.pal.propLit} opacity=".85" />
              </>
            ) : (
              <>
                <circle cx="0" cy="-24" r="14" fill={p.pal.prop} />
                <circle cx="-5" cy="-29" r="8" fill={p.pal.propLit} opacity=".8" />
                <circle cx="8" cy="-19" r="7" fill={p.pal.prop} />
              </>
            )}
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** A banner on a pole, waving (team colour). */
function Banner(p: { x: number; y: number; color: string; flip?: boolean }) {
  return (
    <g transform={`translate(${p.x} ${p.y})${p.flip ? ' scale(-1 1)' : ''}`}>
      <ellipse cx="0" cy="0" rx="7" ry="2" fill="#000" opacity=".3" />
      <path d="M0 0 V-62" stroke="#3b2a1e" stroke-width="3.2" stroke-linecap="round" />
      <circle cx="0" cy="-63" r="3" fill="#ffd466" stroke="#1b140d" stroke-width="1" />
      <path class="hd-banner" d="M1 -58 H24 Q27 -50 24 -42 L18 -34 L12 -40 L1 -34 Z" fill={p.color} stroke="#0f1218" stroke-width="1.4" stroke-linejoin="round" />
      <path class="hd-banner" d="M1 -58 H24 Q25 -55 24 -52 H1 Z" fill="#fff" opacity=".25" />
    </g>
  );
}

/**
 * One troop in the lane: an ArtProvider portrait (transparent, the side's team colour) in three
 * layers, so the motions stack: the act (lunge or taunt hop), the body (breathing squash and
 * stretch from the feet) and the picture (mirrored for the AI, who faces left).
 */
function LaneUnit(p: { card: CardId; side: Side; slot: 0 | 1 }) {
  const url = usePortrait(p.card, { size: 192, plate: false, ...(p.side ? { side: 1 as const } : {}) });
  return (
    <span class={`hd__unit hd__unit--${p.side ? 'foe' : 'me'} hd__unit--s${p.slot}`} data-card={p.card}>
      <i class="hd__unitShadow" />
      <span class="hd__unitAct">
        <span class="hd__unitBody">{url ? <img class="hd__unitImg" src={url} alt="" draggable={false} /> : <i class="hd__unitGhost" />}</span>
      </span>
    </span>
  );
}

/**
 * The far side of the lane (spec "online-first Battle hub" 1.6): the AI's base (`ai`); online, a grey
 * "?" silhouette until a player is found (`unknown`), fog drifting over it while searching
 * (`searching`, MR-121), and the found player's base dropping in as the fog clears (`found`, MR-122).
 */
export type FoeLook = 'ai' | 'unknown' | 'searching' | 'found';

export function Diorama(p: {
  arena: ArenaId;
  age: AgeId;
  mySkin: string | null;
  foeSkin: string | null;
  teamMe: string;
  teamFoe: string;
  /** Each side's frontline troops (up to two; the first stands in front). */
  mine?: readonly CardId[];
  foe?: readonly CardId[];
  foeLook?: FoeLook;
  launching?: boolean;
}) {
  const look = p.foeLook ?? 'ai';
  const hidden = look === 'unknown' || look === 'searching';
  const pal = ISLANDS[p.arena];
  const seed = fnv1a32(`hub:${p.arena}`);
  const cliff = useMemo(() => cliffPath(seed), [seed]);
  const patches = useMemo(() => {
    const rng = mulberry32(seed + 1);
    return Array.from({ length: 7 }, () => ({ cx: 90 + rng.next() * 420, cy: 186 + rng.next() * 50, rx: 18 + rng.next() * 34 }));
  }, [seed]);
  const id = `hd-${p.arena}`;
  return (
    <div
      class={`hd${p.launching ? ' is-launching' : ''}${(p.mine?.length ?? 0) > 0 && (p.foe?.length ?? 0) > 0 ? ' has-units' : ''} is-foe-${look}`}
      data-arena={p.arena}
      aria-hidden="true"
      data-testid="hub-diorama"
    >
      <div class="hd__float">
        {/* One bob for the island and everything on it, so bases and troops ride it together. */}
        <div class="hd__bob">
          <svg class="hd__art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id={`${id}-glow`}>
                <stop offset="0" stop-color={pal.glow} stop-opacity=".55" />
                <stop offset="1" stop-color={pal.glow} stop-opacity="0" />
              </radialGradient>
              <linearGradient id={`${id}-cliff`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color={pal.cliff} />
                <stop offset="1" stop-color={pal.cliffDark} />
              </linearGradient>
              <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color={pal.lit} />
                <stop offset="1" stop-color={pal.top} />
              </linearGradient>
            </defs>
            <ellipse class="hd-underglow" cx="300" cy="300" rx="230" ry="44" fill={`url(#${id}-glow)`} />
            <g transform="translate(0 -42)">
              <Landmark arena={p.arena} />
            </g>
            {/* the cliff underside with strata and a lit left face */}
            <path d={cliff} fill={`url(#${id}-cliff)`} stroke="#0f1218" stroke-width="3" stroke-linejoin="round" />
            <path d="M60 226 Q170 252 300 256 Q430 252 540 226" stroke={pal.strata} stroke-width="4" fill="none" opacity=".6" />
            <path d="M96 256 Q200 280 300 284 Q400 280 504 256" stroke={pal.strata} stroke-width="3" fill="none" opacity=".45" />
            <path d="M44 208 L70 262 L96 250" stroke="#fff" stroke-width="3" fill="none" opacity=".18" />
            {/* the top surface */}
            <ellipse cx="300" cy="206" rx="264" ry="54" fill={pal.top} stroke="#0f1218" stroke-width="3" />
            <ellipse cx="286" cy="198" rx="236" ry="40" fill={`url(#${id}-top)`} opacity=".9" />
            {patches.map((q, i) => (
              <ellipse key={i} cx={q.cx.toFixed(0)} cy={q.cy.toFixed(0)} rx={q.rx.toFixed(0)} ry={(q.rx * 0.22).toFixed(1)} fill={pal.patch} opacity=".45" />
            ))}
            {/* the lane */}
            <ellipse cx="300" cy="214" rx="226" ry="17" fill={pal.lane} stroke="#0f1218" stroke-width="2" opacity=".95" />
            <path d="M96 214 Q300 206 504 214" stroke={pal.laneLit} stroke-width="5" stroke-dasharray="14 12" stroke-linecap="round" fill="none" opacity=".75" />
            <Props pal={pal} seed={seed} arena={p.arena} />
            <Banner x={176} y={214} color={p.teamMe} />
            <Banner x={424} y={214} color={hidden ? '#7a8294' : p.teamFoe} flip />
            {/* the clash point at the lane's middle */}
            <g class="hd-clash" transform="translate(300 206)">
              <circle r="22" fill={pal.glow} opacity=".22" />
              <path d="M-12 -12 L12 12 M12 -12 L-12 12" stroke="#1b140d" stroke-width="7" stroke-linecap="round" />
              <path d="M-12 -12 L12 12 M12 -12 L-12 12" stroke="#ffe39a" stroke-width="3.5" stroke-linecap="round" />
            </g>
          </svg>
          <span class="hd__base hd__base--me">
            <BaseLook age={p.age} skin={p.mySkin} />
          </span>
          <span class="hd__base hd__base--foe" key={look === 'found' ? 'found' : 'base'}>
            <BaseLook age={p.age} skin={p.foeSkin} side={1} />
            {hidden ? (
              <i class="hd__unknown">
                <b>?</b>
              </i>
            ) : null}
          </span>
          {look === 'searching' ? (
            <span class="hd__fog">
              <i class="hd__fog-a" />
              <i class="hd__fog-b" />
              <i class="hd__fog-sweep" />
            </span>
          ) : null}
          {look === 'found' ? <i class="hd__dust" /> : null}
          {(p.mine ?? []).slice(0, 2).map((c, i) => (
            <LaneUnit key={`m${i}${c}`} card={c} side={0} slot={i as 0 | 1} />
          ))}
          {(p.foe ?? []).slice(0, 2).map((c, i) => (
            <LaneUnit key={`f${i}${c}`} card={c} side={1} slot={i as 0 | 1} />
          ))}
          <i class="hd__clash" />
          <i class="hd__spark hd__spark--1" />
          <i class="hd__spark hd__spark--2" />
          <i class="hd__spark hd__spark--3" />
        </div>
      </div>
    </div>
  );
}
