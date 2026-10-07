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
import { ink, light, shade } from '../../components/tone';
import { boulder, broadleaf, Cel, crystal, Grove, type KitProp, pine } from '../warPath/propKit';
import type { RegionTheme } from '../warPath/regionArt';

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
  iron_front: { top: '#7a7350', lit: '#9b9468', patch: '#5c5640', cliff: '#6a6052', cliffDark: '#3a342c', strata: '#8a7f6a', lane: '#9a8a6a', laneLit: '#bba98a', prop: '#4a4436', propLit: '#6e6650', glow: '#ffcf7a' },
  neon_harbor: { top: '#3a3a5e', lit: '#51517e', patch: '#2a2a48', cliff: '#2c2a44', cliffDark: '#17162a', strata: '#403d62', lane: '#56567e', laneLit: '#7a7aa8', prop: '#ff5ac8', propLit: '#ffb0e6', glow: '#ff5ac8' },
  orbital_ring: { top: '#4a5a7a', lit: '#6a7ea6', patch: '#35425c', cliff: '#2f3650', cliffDark: '#171b2c', strata: '#46507a', lane: '#8a9ac0', laneLit: '#b8c6e6', prop: '#5f8fd8', propLit: '#9fd0ff', glow: '#8fb0ff' },
  chrono_rift: { top: '#4f3a7a', lit: '#6f54a6', patch: '#3a2a5c', cliff: '#3a2a55', cliffDark: '#1c1230', strata: '#54407c', lane: '#8f7ac0', laneLit: '#b8a6e6', prop: '#f5b82e', propLit: '#ffe39a', glow: '#d8b8ff' },
};

const W = 600;
const H = 340;

type Rng = { next(): number };

/** The island's top: an ellipse with a seeded wobble, so it never reads as a bare primitive (§3.4). */
function islandTop(seed: number): string {
  const rng = mulberry32(seed + 5);
  const n = 28;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rng.next() - 0.5) * 0.035;
    pts.push([300 + Math.cos(a) * 264 * k, 206 + Math.sin(a) * 54 * k]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[i]!;
    const p1 = pts[(i + 1) % n]!;
    const mx = ((p0[0] + p1[0]) / 2).toFixed(1);
    const my = ((p0[1] + p1[1]) / 2).toFixed(1);
    d += i === 0 ? `M${mx} ${my}` : ` Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${mx} ${my}`;
  }
  const p0 = pts[0]!;
  const p1 = pts[1]!;
  return `${d} Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${((p0[0] + p1[0]) / 2).toFixed(1)} ${((p0[1] + p1[1]) / 2).toFixed(1)}Z`;
}

/** The rock mass under the island: its silhouette, three strata boundaries and the shaded right face. */
function cliffParts(seed: number): { body: string; strata: string[]; shadow: string; lit: string } {
  const rng = mulberry32(seed);
  const n = 16;
  const bottom: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = 40 + ((W - 80) * i) / n;
    const edge = Math.sin((i / n) * Math.PI);
    const y = 212 + edge * (78 + rng.next() * 30) + (i % 2 ? 7 : -3);
    bottom.push([x, y]);
  }
  const body = `M34 206 ${bottom.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} L566 206 Z`;
  const strata = [0.38, 0.66, 0.86].map((k, s) => {
    const r = mulberry32(seed + 31 * (s + 1));
    return bottom
      .map(([x, y], i) => {
        const yy = 210 + (y - 210) * k + (r.next() - 0.5) * 6;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${yy.toFixed(1)}`;
      })
      .join(' ');
  });
  // the right face of the rock turns from the light: a jagged split near the middle
  const split = [300, 318, 306, 326, 312, 334, 320].map((x, i) => `L${x + (rng.next() - 0.5) * 10} ${(214 + i * 16).toFixed(0)}`).join(' ');
  const shadow = `M300 206 ${split} L340 330 L566 330 L566 206Z`;
  const lit = `M34 206 L60 262 L84 250 L104 284 L120 214Z`;
  return { body, strata, shadow, lit };
}

/** Smoke that rises in shaded puffs, grows and fades. */
function Smoke(p: { x: number; y: number; s?: number; color?: string }) {
  const c = p.color ?? '#8a7d80';
  return (
    <g class="hd-smoke" transform={`translate(${p.x} ${p.y}) scale(${p.s ?? 1})`}>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} class="hd-smoke__puff" style={{ animationDelay: `${-i * 1.05}s` }}>
          <circle r={9 + i * 3} fill={shade(c)} />
          <circle cx={-1.5} cy={-2} r={(9 + i * 3) * 0.86} fill={c} />
          <circle cx={-3.5} cy={-4.5} r={(9 + i * 3) * 0.35} fill={light(c)} opacity=".8" />
        </g>
      ))}
    </g>
  );
}

/** A window with a dark frame and a warm lit pane; `flicker` makes it one of the flickering few. */
function Win(p: { x: number; y: number; w?: number; h?: number; flicker?: boolean; c?: string }) {
  const w = p.w ?? 7;
  const h = p.h ?? 9;
  return (
    <g class={p.flicker ? 'hd-win' : undefined}>
      <rect x={p.x - 1} y={p.y - 1} width={w + 2} height={h + 2} rx="1" fill="#2a2420" />
      <rect x={p.x} y={p.y} width={w} height={h} fill={p.c ?? '#ffc56e'} />
      <rect x={p.x} y={p.y} width={w * 0.4} height={h} fill="#fff1c4" opacity=".55" />
    </g>
  );
}

/** Each arena's landmark, drawn behind the island (its y 196 lands on the island's back edge). */
function Landmark(p: { arena: ArenaId }): ComponentChildren {
  switch (p.arena) {
    case 'tar_pits':
      return (
        <g>
          <Cel d="M196 196 L262 96 Q272 88 282 96 L292 90 Q300 86 308 92 Q316 88 322 98 L392 196Z" fill="#6a4a42" band="M296 80 L410 196 V210 H300Z" hi="M214 192 L264 112 L270 108 L226 192Z" sw={2.4} />
          <path d="M240 160 L256 150 M330 150 L346 164 M268 130 L280 124 M306 120 L318 128" stroke={shade('#6a4a42')} stroke-width="2" stroke-linecap="round" />
          <path class="hd-glow" d="M272 96 Q290 84 312 94 Q298 102 286 100Z" fill="#ff8a3a" />
          <path class="hd-glow" d="M292 100 Q298 140 284 176 Q290 140 286 104Z" fill="#ff7a2a" stroke="#ffcf6a" stroke-width="1.2" />
          <Smoke x={294} y={78} s={1.15} color="#93868a" />
          <Cel d="M370 206 Q408 196 446 206 Q408 214 370 206Z" fill="#2a201a" sw={1.8} />
          <path d="M386 204 Q400 200 414 203" stroke="#5a4a3c" stroke-width="1.6" fill="none" />
          <circle class="hd-bubble" cx="398" cy="205" r="3" fill="#3a2e24" stroke="#6a5a4a" stroke-width="1" />
          <circle class="hd-bubble hd-bubble--2" cx="418" cy="206" r="2.4" fill="#3a2e24" stroke="#6a5a4a" stroke-width="1" />
        </g>
      );
    case 'frostfang':
      return (
        <g>
          <Cel d="M186 198 L262 74 L292 116 L318 82 L410 198Z" fill="#8ea3bf" band="M290 70 L330 70 L420 198 V210 H300Z" sw={2.4} />
          <Cel d="M262 74 L292 116 L318 82 L338 118 L320 112 L302 132 L284 110 L264 124 L246 104Z" fill="#f4f8fc" band="M296 60 L360 120 L300 140Z" sw={1.8} />
          <path d="M262 74 L246 104 L232 126 L262 110Z" fill="#ffffff" />
          <g class="hd-snow">
            {[80, 150, 230, 320, 400, 470, 530].map((x, i) => (
              <circle key={x} cx={x} cy={40 + (i % 3) * 30} r={i % 2 ? 1.8 : 2.4} fill="#fff" style={{ animationDelay: `${-i * 0.9}s` }} />
            ))}
          </g>
        </g>
      );
    case 'kingsmoat': {
      const wall = '#8f97a6';
      return (
        <g>
          <Cel d="M200 200 Q300 184 400 200 Q300 214 200 200Z" fill="#3f8fc4" band={202} sw={1.8} />
          <path class="hd-shimmer" d="M224 200 h26 M266 203 h20 M322 199 h30 M364 202 h14" stroke="#e8f7ff" stroke-width="2" stroke-linecap="round" />
          <Cel d="M250 130 H350 V196 H250Z" fill={wall} band="M318 120H360V200H318Z" hi="M251.4 131.4H256V194.6H251.4Z" sw={2.2} />
          {[238, 336].map((x) => (
            <g key={x}>
              <Cel d={`M${x} 104 H${x + 26} V196 H${x}Z`} fill={wall} band={`M${x + 16} 96H${x + 34}V200H${x + 16}Z`} hi={`M${x + 1.4} 105.4H${x + 5}V194.6H${x + 1.4}Z`} sw={2.2} />
              <Cel d={`M${x - 4} 104 L${x + 13} 82 L${x + 30} 104Z`} fill="#a8473c" band={`M${x + 13} 76 L${x + 36} 104 V110 H${x + 13}Z`} sw={2} />
              <Win x={x + 9.5} y={132} flicker={x > 300} />
            </g>
          ))}
          <Cel d="M286 84 H314 V196 H286Z" fill={wall} band="M304 76H322V200H304Z" sw={2.2} />
          <Cel d="M282 84 L300 58 L318 84Z" fill="#a8473c" band="M300 52 L324 84 V90 H300Z" sw={2} />
          {[146, 158, 170, 182].map((y) => (
            <path key={y} d={`M250 ${y} H350`} stroke={shade(wall)} stroke-width="1.2" opacity=".75" />
          ))}
          <Win x={296} y={108} flicker />
          <Cel d="M290 196 V172 Q300 160 310 172 V196Z" fill="#2b2420" sw={1.6} />
          <path d="M300 58 V42" stroke={ink('#5a3a24')} stroke-width="3.6" stroke-linecap="round" />
          <path d="M300 58 V42" stroke="#8e6440" stroke-width="1.8" stroke-linecap="round" />
          <path class="hd-flag" d="M301 42 h18 l-5 5 l5 5 h-18 z" fill="#ffd466" stroke={ink('#ffd466')} stroke-width="1.2" stroke-linejoin="round" />
        </g>
      );
    }
    case 'powder_bay':
      return (
        <g>
          <Cel d="M146 204 Q300 186 454 204 V216 H146Z" fill="#2f6a8a" band={210} sw={1.8} />
          <path class="hd-shimmer" d="M170 206 h24 M214 209 h18 M300 205 h26 M360 208 h20 M410 206 h16" stroke="#e8f7ff" stroke-width="2" stroke-linecap="round" />
          <g class="hd-ship">
            <Cel d="M244 196 H358 L342 216 H260Z" fill="#6b4a2c" band={206} hi="M250 197.4 H352 V200 H250Z" sw={2} />
            <path d="M256 204 H346" stroke={shade('#6b4a2c')} stroke-width="1.6" />
            {[270, 290, 310, 330].map((x) => (
              <circle key={x} cx={x} cy="209" r="2" fill="#2a1d14" />
            ))}
            <path d="M282 196 V94 M322 196 V110" stroke={ink('#3b2a1e')} stroke-width="5.4" />
            <path d="M282 196 V94 M322 196 V110" stroke="#5a3a24" stroke-width="3" />
            <Cel d="M284 100 Q316 116 284 138Z" fill="#f2ead2" band="M296 100H330V140H296Z" sw={1.6} />
            <Cel d="M284 142 Q322 156 284 188Z" fill="#f2ead2" band="M300 142H340V190H300Z" sw={1.6} />
            <Cel d="M324 116 Q350 128 324 146Z" fill="#f2ead2" band="M334 116H360V150H334Z" sw={1.6} />
            <Cel d="M324 150 Q354 162 324 188Z" fill="#f2ead2" band="M336 150H364V190H336Z" sw={1.6} />
            <path class="hd-flag" d="M283 94 h16 l-4 4 l4 4 h-16z" fill="#b8453a" stroke={ink('#b8453a')} stroke-width="1.2" />
          </g>
        </g>
      );
    case 'iron_front': {
      const brick = '#7a5444';
      return (
        <g>
          <Cel d="M312 70 H326 V136 H312Z" fill="#5a4038" band="M320 64H332V140H320Z" sw={2} />
          <Cel d="M340 88 H352 V136 H340Z" fill="#5a4038" band="M346.6 84H358V140H346.6Z" sw={2} />
          <path d="M312 80 H326 M312 92 H326 M312 104 H326 M340 98 H352 M340 110 H352" stroke={shade('#5a4038')} stroke-width="1.2" />
          <Cel d="M212 150 H300 V198 H212Z" fill={brick} band="M276 144H306V202H276Z" hi="M213.4 151.4H217V196.6H213.4Z" sw={2.2} />
          <Cel d="M212 150 L226 134 L240 150 L254 134 L268 150 L282 134 L296 150 L300 150 L300 148Z" fill="#5d6576" band={146} sw={2} />
          <Cel d="M300 132 H372 V198 H300Z" fill={brick} band="M350 126H380V202H350Z" hi="M301.4 133.4H305V196.6H301.4Z" sw={2.2} />
          <Cel d="M376 162 H424 V198 H376Z" fill="#6a4a3c" band="M408 156H430V202H408Z" sw={2.2} />
          {[164, 176, 188].map((y) => (
            <path key={y} d={`M212 ${y} H300 M300 ${y - 18} H372`} stroke={shade(brick)} stroke-width="1.1" opacity=".8" />
          ))}
          {[220, 234, 248, 262, 276].map((x, i) => (
            <Win key={x} x={x} y={168} flicker={i === 2} />
          ))}
          {[310, 326, 342, 356].map((x, i) => (
            <Win key={x} x={x} y={150} flicker={i === 1} />
          ))}
          <Win x={392} y={172} w={14} h={8} />
          <Smoke x={319} y={62} s={1.1} color="#7d7570" />
          <Smoke x={346} y={80} s={0.85} color="#8a827c" />
        </g>
      );
    }
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
              <Cel d={`M${x} ${198 - h!} H${x! + w!} V198 H${x}Z`} fill={i % 2 ? '#2e2a52' : '#272346'} band={`M${x! + w! * 0.62} ${190 - h!}H${x! + w! + 6}V202H${x! + w! * 0.62}Z`} sw={1.8} />
              <rect class={`hd-neon hd-neon--${i % 3}`} x={x! + 5} y={206 - h!} width={w! - 10} height="3" rx="1.5" fill={i % 2 ? '#5ff2ff' : '#ff5ac8'} />
              {Array.from({ length: Math.floor(h! / 18) }, (_, r) => (
                <rect key={r} class={(r + i) % 5 === 0 ? 'hd-win' : undefined} x={x! + 7} y={218 - h! + r * 18} width={w! - 14} height="3.4" fill="#ffd9f2" opacity={(r + i) % 3 ? 0.18 : 0.55} />
              ))}
            </g>
          ))}
          <path d="M364 48 v-20" stroke={ink('#2a2548')} stroke-width="4" />
          <circle class="hd-blink" cx="364" cy="26" r="3.6" fill="#ff4a8a" stroke="#6a1236" stroke-width="1" />
        </g>
      );
    case 'orbital_ring':
      return (
        <g>
          <Cel d="M250 104 A50 50 0 1 0 350 104 A50 50 0 1 0 250 104Z" fill="#4a5c9a" band="M240 110 Q300 124 360 110 V170 H240Z" hi="M262 88 A36 36 0 0 1 290 64 L292 70 A30 30 0 0 0 268 92Z" sw={2.2} />
          <path d="M262 100 Q300 92 338 104 M266 118 Q300 112 334 122" stroke={shade('#4a5c9a')} stroke-width="2" fill="none" opacity=".7" />
          <g class="hd-orbit">
            <ellipse cx="300" cy="104" rx="104" ry="20" fill="none" stroke={ink('#9fd0ff')} stroke-width="6.4" opacity=".55" transform="rotate(-12 300 104)" stroke-dasharray="210 120" />
            <ellipse cx="300" cy="104" rx="104" ry="20" fill="none" stroke="#9fd0ff" stroke-width="3.6" opacity=".85" transform="rotate(-12 300 104)" stroke-dasharray="210 120" />
          </g>
          <circle cx="420" cy="54" r="7" fill="#c9d6ff" class="hd-twinkle" />
          <Cel d="M240 198 L256 150 L272 198Z" fill="#3f4d6e" band="M256 140H280V200H256Z" sw={1.6} />
          <Cel d="M330 198 L342 162 L354 198Z" fill="#3f4d6e" band="M342 156H360V200H342Z" sw={1.6} />
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
          {[
            [226, 110, 262],
            [338, 124, 374],
            [270, 150, 290],
          ].map(([a, top, b], i) => (
            <Cel key={i} d={`M${a} 198 L${(a! + b!) / 2} ${top} L${b} 198Z`} fill="#5e4a8c" band={`M${(a! + b!) / 2} ${top! - 6}H${b! + 6}V202H${(a! + b!) / 2}Z`} hi={`M${a! + 4} 196 L${(a! + b!) / 2 - 1} ${top! + 10} L${(a! + b!) / 2} ${top! + 16} L${a! + 9} 196Z`} sw={1.8} />
          ))}
        </g>
      );
  }
}

/** The prop kit's theme for an island palette (trees, rocks and crystals on the rim). */
function kitTheme(pal: IslandPalette): RegionTheme {
  return {
    skyTop: '#000',
    skyBottom: '#000',
    sun: pal.glow,
    far1: pal.cliff,
    far2: pal.cliffDark,
    groundTop: pal.top,
    groundBottom: pal.patch,
    patchLight: pal.lit,
    patchDark: pal.patch,
    body: pal.prop,
    lit: pal.propLit,
    accent: pal.glow,
    road: pal.lane,
    roadEdge: pal.cliffDark,
  };
}

/** Props on the island's rim, off the lane: groves and rocks (crystals on the late arenas). */
function Props(p: { pal: IslandPalette; seed: number; arena: ArenaId }) {
  const t = kitTheme(p.pal);
  const crystals = p.arena === 'neon_harbor' || p.arena === 'orbital_ring' || p.arena === 'chrono_rift';
  const kinds: readonly KitProp[] = crystals ? [crystal] : p.arena === 'frostfang' || p.arena === 'tar_pits' ? [pine] : [broadleaf, pine];
  return (
    <g>
      <g transform="translate(78 200) scale(.62)">
        <Grove t={t} seed={p.seed} n={5} kinds={kinds} />
      </g>
      <g transform="translate(524 202) scale(.6)">
        <Grove t={t} seed={p.seed + 9} n={4} kinds={kinds} />
      </g>
      <g transform="translate(198 246) scale(.62)">{boulder(t, 0.2)}</g>
      <g transform="translate(410 248) scale(.66)">{boulder(t, 0.8)}</g>
      <g transform="translate(470 238) scale(.5)">{crystals ? crystal(t, 0.3) : boulder(t, 0.4)}</g>
    </g>
  );
}

/** A banner on a pole, waving (team colour), with a shaded fold and its own dark edge. */
function Banner(p: { x: number; y: number; color: string; flip?: boolean }) {
  return (
    <g transform={`translate(${p.x} ${p.y})${p.flip ? ' scale(-1 1)' : ''}`}>
      <ellipse cx="0" cy="0" rx="7" ry="2" fill="#000" opacity=".3" />
      <path d="M0 0 V-62" stroke={ink('#6b4a2e')} stroke-width="4.6" stroke-linecap="round" />
      <path d="M0 0 V-62" stroke="#8e6440" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="0" cy="-63" r="3.2" fill="#e8b23a" stroke={ink('#e8b23a')} stroke-width="1.2" />
      <g class="hd-banner">
        <path d="M1 -58 H24 Q27 -50 24 -42 L18 -34 L12 -40 L1 -34 Z" fill={p.color} />
        <path d="M14 -58 H24 Q27 -50 24 -42 L18 -34 L15 -37 Q18 -47 14 -58Z" fill={shade(p.color)} />
        <path d="M2.4 -56.6 H12 V-54 H2.4Z" fill={light(p.color)} />
        <path d="M1 -58 H24 Q27 -50 24 -42 L18 -34 L12 -40 L1 -34 Z" fill="none" stroke={ink(p.color)} stroke-width="1.5" stroke-linejoin="round" />
      </g>
    </g>
  );
}

/** Small cel stones along the lane's edges. */
function EdgeStones(p: { pal: IslandPalette; seed: number }) {
  const rng: Rng = mulberry32(p.seed + 17);
  const out: ComponentChildren[] = [];
  for (let i = 0; i < 14; i++) {
    const k = (i + 0.5) / 14;
    const a = Math.PI * (1 - k);
    const front = i % 2 === 0;
    const x = 300 + Math.cos(a) * 224;
    const y = 214 + (front ? 1 : -1) * Math.sin(a) * 15.5 + (front ? 1.5 : -1);
    if (x > 250 && x < 350) continue;
    const r = 1.6 + rng.next() * 1.6;
    const w = r * (1.2 + rng.next() * 0.6);
    out.push(
      <path
        key={i}
        d={`M${(x - w).toFixed(1)} ${y.toFixed(1)} Q${(x - w).toFixed(1)} ${(y - r * 1.2).toFixed(1)} ${x.toFixed(1)} ${(y - r * 1.3).toFixed(1)} Q${(x + w).toFixed(1)} ${(y - r * 1.1).toFixed(1)} ${(x + w).toFixed(1)} ${y.toFixed(1)}Z`}
        fill={front ? p.pal.strata : shade(p.pal.strata)}
        stroke={ink(p.pal.strata)}
        stroke-width="1"
      />,
    );
  }
  return <g>{out}</g>;
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
  const top = useMemo(() => islandTop(seed), [seed]);
  const cliff = useMemo(() => cliffParts(seed), [seed]);
  const patches = useMemo(() => {
    const rng = mulberry32(seed + 1);
    return Array.from({ length: 6 }, () => ({ cx: 110 + rng.next() * 380, cy: 190 + rng.next() * 46, rx: 18 + rng.next() * 30 }));
  }, [seed]);
  const tufts = useMemo(() => {
    const rng = mulberry32(seed + 2);
    return Array.from({ length: 26 }, () => {
      const a = Math.PI * rng.next();
      const front = rng.next() < 0.6;
      const x = 300 + Math.cos(a) * (190 + rng.next() * 60);
      const y = 214 + (front ? 1 : -1) * Math.sin(a) * (24 + rng.next() * 18);
      return `M${(x - 3).toFixed(1)} ${y.toFixed(1)} l1 -5 M${x.toFixed(1)} ${y.toFixed(1)} l0 -7 M${(x + 3).toFixed(1)} ${y.toFixed(1)} l-1 -5`;
    }).join(' ');
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
            {/* floating rock chunks under the island, bobbing out of phase (UI art audit #3) */}
            {[
              [150, 304, 0.9],
              [432, 318, 0.7],
              [312, 330, 0.5],
            ].map(([x, y, k], i) => (
              <g key={`chunk${i}`} transform={`translate(${x} ${y}) scale(${k})`}>
                <g class="hd-chunk" style={{ animationDelay: `${-i * 1.3}s` }}>
                  <Cel d="M-20 -8 L-12 -15 L4 -16 L18 -10 L20 -4 L12 8 L4 18 L-6 12 L-14 4Z" fill={pal.strata} band="M4 -20 L30 -20 L30 30 L2 30Z" hi="M-16 -6 L-11 -11 L-9 -4 L-13 2Z" sw={2.2} />
                  <Cel d="M-20 -8 L-12 -15 L4 -16 L18 -10 L20 -4 Q2 -1 -20 -8Z" fill={pal.top} hi="M-13 -11 L2 -13.4 L-2 -11 L-11 -9.4Z" sw={1.8} />
                </g>
              </g>
            ))}
            <g transform="translate(0 -42)">
              <Landmark arena={p.arena} />
            </g>
            {/* the rock mass: three cel-shaded strata, the right face in shadow, a lit left edge */}
            <clipPath id={`${id}-rock`}>
              <path d={cliff.body} />
            </clipPath>
            <path d={cliff.body} fill={pal.strata} />
            <g clip-path={`url(#${id}-rock)`}>
              <path d={`${cliff.strata[0]} L566 340 L34 340Z`} fill={pal.cliff} />
              <path d={`${cliff.strata[1]} L566 340 L34 340Z`} fill={shade(pal.cliff)} />
              <path d={`${cliff.strata[2]} L566 340 L34 340Z`} fill={pal.cliffDark} />
              <path d={cliff.shadow} fill="#000" opacity=".16" />
              <path d={cliff.lit} fill={light(pal.strata)} opacity=".55" />
              {cliff.strata.map((d, i) => (
                <path key={i} d={d} stroke={ink(pal.cliff)} stroke-width="1.6" fill="none" opacity=".55" />
              ))}
              <path d="M120 236 L134 252 M188 262 L198 280 M262 254 L270 270 M372 262 L380 276 M452 240 L462 256" stroke={ink(pal.cliff)} stroke-width="1.6" stroke-linecap="round" opacity=".45" />
            </g>
            <path d={cliff.body} fill="none" stroke={ink(pal.cliff)} stroke-width="2.8" stroke-linejoin="round" />
            {/* roots hanging from under the lip, swaying */}
            {[
              [118, 222, 26],
              [206, 238, 34],
              [356, 240, 30],
              [470, 226, 22],
            ].map(([x, y, len], i) => (
              <g key={`root${i}`} class="hd-root" style={{ animationDelay: `${-i * 0.9}s` }} transform={`translate(${x} ${y})`}>
                <path d={`M0 0 q-4 ${len! * 0.4} 2 ${len! * 0.7} q4 ${len! * 0.2} -1 ${len! * 0.3}`} stroke={ink('#6b4a2e')} stroke-width="3.6" fill="none" stroke-linecap="round" />
                <path d={`M0 0 q-4 ${len! * 0.4} 2 ${len! * 0.7} q4 ${len! * 0.2} -1 ${len! * 0.3}`} stroke="#7a5433" stroke-width="1.8" fill="none" stroke-linecap="round" />
              </g>
            ))}
            {/* the top: a shaded back rim, a lit front lip, patches with texture and the outline in the grass's own dark */}
            <clipPath id={`${id}-top`}>
              <path d={top} />
            </clipPath>
            <path d={top} fill={shade(pal.top)} />
            <g clip-path={`url(#${id}-top)`}>
              <ellipse cx="300" cy="213" rx="266" ry="52" fill={pal.top} />
              <ellipse cx="292" cy="204" rx="236" ry="38" fill={`url(#${id}-top)`} opacity=".75" />
              {patches.map((q, i) => (
                <g key={i}>
                  <ellipse cx={q.cx.toFixed(0)} cy={q.cy.toFixed(0)} rx={q.rx.toFixed(0)} ry={(q.rx * 0.24).toFixed(1)} fill={pal.patch} opacity=".55" />
                  <ellipse cx={(q.cx - q.rx * 0.2).toFixed(0)} cy={(q.cy - 1.5).toFixed(0)} rx={(q.rx * 0.55).toFixed(0)} ry={(q.rx * 0.1).toFixed(1)} fill={pal.lit} opacity=".35" />
                </g>
              ))}
              <path d="M44 218 Q300 286 556 218" stroke={light(pal.top)} stroke-width="5" fill="none" opacity=".7" />
            </g>
            <path d={top} fill="none" stroke={ink(pal.top)} stroke-width="2.8" />
            <path d={tufts} stroke={pal.lit} stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".8" />
            {/* the lane: worn dirt with a lit centre, ruts and edge stones */}
            <ellipse cx="300" cy="214" rx="226" ry="17" fill={pal.lane} stroke={ink(pal.lane)} stroke-width="1.8" />
            <ellipse cx="300" cy="217.5" rx="222" ry="12.5" fill={shade(pal.lane)} opacity=".45" />
            <ellipse cx="296" cy="212" rx="200" ry="9" fill={pal.laneLit} opacity=".55" />
            <path d="M100 216 Q300 225 500 216 M108 211 Q300 219 492 211" stroke={shade(pal.lane)} stroke-width="1.4" fill="none" opacity=".75" />
            <path d="M96 214 Q300 206 504 214" stroke={pal.laneLit} stroke-width="4" stroke-dasharray="14 12" stroke-linecap="round" fill="none" opacity=".6" />
            <EdgeStones pal={pal} seed={seed} />
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
