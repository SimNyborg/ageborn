/**
 * The arena diorama at the centre of the Battle hub (owner decision 2026-09-30; ui-plan 2.3): the
 * player's arena as a floating island in the A11 cartoon look, with the lane across it, your base on
 * the left (team colour; with the lane's flag pole carrying your base flag and national flag, `StillPole`)
 * and the AI's base on the right, each with its banner, and the arena's own
 * landmark behind them (a smoking volcano, an ice peak, a moated keep, a harbour with a tall ship, a
 * factory, a neon skyline, a ringed planet, a time rift).
 *
 * The bases are the real base pictures from the art provider (`SkinnedBase`, the ArtProvider portrait
 * `base.<age>` with the side's base skin: its model, or the standard base with the skin's tint; the AI's
 * in its team colour), so swapping art changes them here too; the island,
 * landmark and props are code-drawn chrome like the War Path regions. Each side's frontline troops
 * (your War Plan's first units with their skins, the opponent's from its plan) stand in the lane.
 *
 * **Live island** (owner request 2026-10-16, queue item 37): when the app provides the Home stage
 * (`homeStage.ts`), the troops play their real battle clips on a transparent Pixi layer over the island
 * (idle breathing on the real idle clip, a cheer now and then, and every so often one of the front pair
 * marches up to the other and they trade blows with the battle's sparks and hit-stop, or a shooter looses a
 * shot) and the flags wave with the lane's cloth; the layer floats with the island. It starts once Home is
 * idle (at once on a return while the menus' app is still up), pauses while a sheet covers Home or the
 * island is off screen, and goes with Home. Until it draws (and for good under Reduce motion, without WebGL
 * or a mount, and while its context is lost) the still island shows the same scene at the same size and
 * place (review M S3): each troop's idle strip from its battle sheet, fitted to the box the live layer
 * measured for it (`troopBoxes`), and the flag poles drawn on the lane dressing's own geometry, so the live
 * layer takes over without a jump.
 *
 * Ambient life (the island's float, smoke, water, snow, neon, motes) is CSS and stills under reduce
 * motion. Deterministic, decorative (`aria-hidden`).
 */
import type { AgeId, CardId, CosmeticKey, Side, SkinId, TeamPreset } from '@/contracts';
import type { ArenaId } from '@/content/types';
import { fnv1a32, mulberry32 } from '@/core';
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import { useCosmeticImage } from '../../components/cosmeticArt';
import { SvgPennant } from '../../components/SvgPennant';
import { useKit, type PortraitFn, type PortraitRequest } from '../../components/kit';
import { ink, light, shade } from '../../components/tone';
import { useUi } from '../context';
import { boxKey, troopBoxes, useHomeStage, type HomeStagePole, type HomeStageRequest, type HomeStageTroop } from './homeStage';
import { Keep, Volcano } from './landmarks';
import { SkinnedBase } from './skinnedBase';
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

/**
 * The island's layout in the picture's units, shared by the live layer and the still island: the lane's
 * middle and its front line, where each troop stands, the flag poles (yours beside your gate, the opponent's
 * mirrored) and how many units one lu is (troops about as tall as the old portraits). The front pair stands
 * far enough apart that a duel's walker takes at least one full stride before the blows (review M S1).
 */
export const LIVE_ISLAND = { width: W, height: H, center: 300, ground: 224, unitsPerLu: 0.98 } as const;
export const LIVE_SPOTS: Readonly<Record<Side, readonly [{ x: number; y: number }, { x: number; y: number }]>> = {
  0: [
    { x: 240, y: 224 },
    { x: 181.5, y: 219 },
  ],
  1: [
    { x: 360, y: 224 },
    { x: 418.5, y: 219 },
  ],
};
const LIVE_POLES: Readonly<Record<Side, { x: number; y: number; height: number }>> = {
  0: { x: 170, y: 214, height: 104 },
  1: { x: 430, y: 214, height: 104 },
};
/** Flyers hover this high over their spot (lu; render's `ISLAND_ALTITUDE`, mirrored: the UI may not import render). */
const ISLAND_ALTITUDE_LU = 42;
/** The opponent's banner while no player has been found (render's `GREY`). */
const GREY_BANNER = '#7a8294';
/**
 * The lane dressing's pole (`visuals/cosmetics/dressing.ts` `buildPole`), in the dressing's own lu: 176 lu
 * tall, the base flag's texture 0.9 lu per view-box unit, the national flag's 0.75, each 60 x 40 units of
 * cloth inside a 2-unit margin, the first 4 lu under the top and the next 6 lu under the one above. The
 * still pole draws the same, scaled to the live pole's height, so the live one replaces it in place.
 */
const LANE_POLE = { top: 176, base: 0.9, nation: 0.75, w: 60, h: 40 } as const;
const POLE_INK = '#1b1330';
const BANNER_OUTLINE = 'M0 0H60L51 20L60 40H0Z';

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
          <Volcano smoke={<Smoke x={292} y={80} s={1.15} color="#93868a" />} />
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
    case 'kingsmoat':
      return <Keep />;
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
            <SvgPennant x={283} y={94} w={16} h={8} notch={4} fill="#b8453a" stroke={ink('#b8453a')} strokeWidth={1.2} phase={0.5} />
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

/**
 * The plain banner the lane flies on a pole with no flag of its own (`dressing.ts` `drawPlainBanner`: the base
 * flags' swallowtail cloth in one colour, its fold bands, stitched hem, light and shadow bands and the hoist
 * sleeve, outlined in its own dark), in the cloth's 60 x 40 units at (`x`, `y`), `s` units per cloth unit.
 */
function PlainBanner(p: { id: string; x: number; y: number; s: number; color: string }) {
  const dark = shade(p.color);
  const lite = light(p.color);
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
      <clipPath id={p.id}>
        <path d={BANNER_OUTLINE} />
      </clipPath>
      <g clip-path={`url(#${p.id})`}>
        <path d={BANNER_OUTLINE} fill={p.color} />
        <path d="M15.6 0C17.4 10 15.2 28 17.4 40H22.6C20.4 28 22.6 10 20.6 0Z" fill={dark} opacity=".26" />
        <path d="M24.6 0C25.8 12 24.2 26 25.8 40H28C26.4 26 28 12 26.8 0Z" fill={lite} opacity=".3" />
        <path d="M37.6 0C39.4 11 37.2 27 39.4 40H45.4C43.2 27 45.4 11 43.6 0Z" fill={dark} opacity=".24" />
        <path d="M6.4 2.2H56.6L48.6 20L56.6 37.8H6.4" fill="none" stroke={lite} stroke-width=".55" stroke-dasharray="1.6 1.1" opacity=".85" />
        <path d="M0 0H60L59.1 2H0Z" fill={lite} opacity=".45" />
        <path d={`${BANNER_OUTLINE}M0 -3.2H60L51 16.8L60 36.8H0Z`} fill={dark} fill-rule="evenodd" opacity=".42" />
        <path d="M0 0H5.6V40H0Z" fill={dark} />
        <path d="M0 0H1.6V40H0Z" fill="#fff" opacity=".22" />
        <path d="M4.4 0H5.6V40H4.4Z" fill="#000" opacity=".22" />
      </g>
      <path d={BANNER_OUTLINE} fill="none" stroke={ink(p.color)} stroke-width="1.6" stroke-linejoin="round" />
    </g>
  );
}

/**
 * A national flag as the lane's cloth shows it (`nationalFlags.ts` `drawCloth`): the 4:3 design at the
 * field's full height from the hoist, rounded, with the lane cloth's finish (fold bands, a sheen from the top
 * left, a darker hoist hem and lower edge) and an outline inside the edge in the flag's own dark. A flag
 * without a picture shows the neutral parchment cloth the lane shows while one loads.
 */
function NationCloth(p: { id: string; x: number; y: number; s: number; src: string | null }) {
  const w = ((LANE_POLE.h * 4) / 3) * p.s;
  const h = LANE_POLE.h * p.s;
  const r = 2.4 * p.s;
  const x = p.x;
  const y = p.y;
  return (
    <g>
      <clipPath id={p.id}>
        <rect x={x} y={y} width={w} height={h} rx={r} />
      </clipPath>
      <g clip-path={`url(#${p.id})`}>
        {p.src ? <image href={p.src} x={x} y={y} width={w} height={h} preserveAspectRatio="none" /> : <rect x={x} y={y} width={w} height={h} fill="#e8dfc8" />}
        <rect x={x + w * 0.29} y={y} width={w * 0.1} height={h} fill="#000" opacity=".09" />
        <rect x={x + w * 0.47} y={y} width={w * 0.06} height={h} fill="#fff" opacity=".09" />
        <rect x={x + w * 0.66} y={y} width={w * 0.13} height={h} fill="#000" opacity=".11" />
        <path d={`M${x} ${y}h${w * 0.42}L${x} ${y + h * 0.58}Z`} fill="#fff" opacity=".14" />
        <rect x={x} y={y} width={1.3 * p.s} height={h} fill="#000" opacity=".16" />
        <rect x={x} y={y + h - 2.6 * p.s} width={w} height={2.6 * p.s} fill="#000" opacity=".08" />
        <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke="#000" stroke-opacity=".62" stroke-width={2.6 * p.s} />
      </g>
    </g>
  );
}

/**
 * A side's flag pole as the lane flies it beside the gate (A18.9.4; PLAN 2d "Where the chosen flag shows";
 * `visuals/cosmetics/dressing.ts` `buildPole`), drawn on the dressing's own geometry and scaled to the live
 * pole's height, so the live island's cloth flags take over in place (review M S3): the base flag on top in
 * the side's team colour, the national flag under it, or a plain banner when the side flies neither (the
 * opponent's in grey while no player has been found). The still flags hang still: the live layer brings the
 * lane's wind, and Reduce motion keeps them still anyway.
 */
function StillPole(p: { id: string; side: Side; team: string; baseFlag: string | null; nationalFlag: string | null; grey?: boolean }) {
  const fn = useCosmeticImage();
  const at = LIVE_POLES[p.side];
  const k = at.height / LANE_POLE.top;
  const team = Number.parseInt(p.team.replace('#', ''), 16);
  const kinds: ('base' | 'nation' | 'banner')[] = [];
  if (p.baseFlag) kinds.push('base');
  if (p.nationalFlag) kinds.push('nation');
  if (kinds.length === 0) kinds.push('banner');
  const flags: ComponentChildren[] = [];
  let y = -LANE_POLE.top + 4;
  for (const kind of kinds) {
    const s = kind === 'nation' ? LANE_POLE.nation : LANE_POLE.base;
    // the cloth's corner (its texture has a 2-unit margin, and the hoist edge sits on the pole)
    const cx = 2;
    if (kind === 'base') {
      const url = fn ? fn(p.baseFlag!, { team: Number.isFinite(team) ? team : 0x2f7df6, animate: false }) : null;
      flags.push(
        <g key="base" data-flag={p.baseFlag}>
          {url ? (
            <image href={url} x={cx - 2 * s} y={y - 2 * s} width={(LANE_POLE.w + 4) * s} height={(LANE_POLE.h + 4) * s} preserveAspectRatio="none" />
          ) : (
            <rect x={cx} y={y} width={LANE_POLE.w * s} height={LANE_POLE.h * s} rx="2" fill="#e8dfc8" stroke="rgba(0,0,0,.45)" stroke-width="1.4" />
          )}
        </g>,
      );
    } else if (kind === 'nation') {
      flags.push(
        <g key="nation" data-flag={p.nationalFlag}>
          <NationCloth id={`${p.id}-nation`} x={cx} y={y} s={s} src={fn ? fn(p.nationalFlag!) : null} />
        </g>,
      );
    } else flags.push(<PlainBanner key="banner" id={`${p.id}-banner`} x={cx} y={y} s={s} color={p.grey ? GREY_BANNER : p.team} />);
    y += LANE_POLE.h * s + 6;
  }
  const top = LANE_POLE.top;
  return (
    <g class="hd-still" transform={`translate(${at.x} ${at.y}) scale(${k.toFixed(4)})`} data-testid={p.side === 0 ? 'hub-flagpole' : 'hub-flagpole-foe'}>
      <rect x="-7" y="-6" width="14" height="7" rx="2" fill="#6e6258" stroke={POLE_INK} stroke-width="1.6" />
      <rect x="-2" y={-top} width="4" height={top - 5} fill="#8a6a45" stroke={POLE_INK} stroke-width="1.4" />
      <rect x="-1.2" y={-top + 3} width="1" height={top - 10} fill="#fff" opacity=".35" />
      <circle cx="0" cy={-top} r="4.2" fill="#ffcf3a" stroke={POLE_INK} stroke-width="1.4" />
      <circle cx="-1.2" cy={-top - 1.2} r="1.2" fill="#fff" opacity=".7" />
      {flags}
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

/** A troop's drawn idle box before the live island has measured its card (a typical soldier; bigger units bigger). */
function defaultBox(size: string | undefined): { front: number; back: number; top: number } {
  if (size === 'huge') return { front: 66, back: 52, top: 94 };
  if (size === 'large') return { front: 58, back: 38, top: 88 };
  return { front: 44, back: 21, top: 78 };
}
/** How far a sheet's frames typically reach below the feet (lu): only used before a card's box is known. */
const BELOW_FEET_LU = 4;

/** The strips' cell size (px): crisp on a large high-density screen, light on a phone. */
const STRIP_PX = typeof window !== 'undefined' && (window.innerWidth || 0) * (window.devicePixelRatio || 1) >= 2200 ? 256 : 160;
/** The idle clip's pace when a strip does not say its length (ms a frame; the battle sheets' idle is 115-155 ms a frame). */
const IDLE_FRAME_MS = 115;
/**
 * The live island's size rule, mirrored (the UI may not import render; `render/showcase/home.ts` `MAX_TROOP_LU`
 * and its troop `scale`, held together by a test): a troop is drawn at most this many lu tall to its head.
 */
export const MAX_TROOP_LU = 96;

/** The live island's drawn size of a unit whose head anchor stands `headLu` above its feet (render's troop `scale`). */
export function liveTroopScale(headLu: number): number {
  return Math.min(1, MAX_TROOP_LU / Math.max(20, headLu));
}

/**
 * A strip, its frame count and clip length, where its feet are and how large it stands (from the provider's
 * strip layout), and where its frames' drawn pixels lie together (in one cell's px).
 */
interface IdleStrip {
  url: string;
  frames: number;
  cell: number;
  /** The clip's length (ms); 0 plays `frames x IDLE_FRAME_MS`. */
  ms: number;
  /** The feet in a cell, cell px per lu and the head's height (lu); null for a strip without a layout (it is measured). */
  feet: { x: number; y: number; pxPerLu: number; headLu: number } | null;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** The layout the provider answers `stripinfo:<clip>:<card>` with (visuals' `StripInfo`, a JSON data URL). */
export interface StripLayoutInfo {
  frames: number;
  cell: number;
  ms: number;
  feet: [number, number];
  pxPerLu: number;
  headLu: number;
  box: [number, number, number, number];
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Reads a strip layout from its JSON data URL; null when absent or malformed (the strip is then measured). */
export function parseStripInfo(s: string | null | undefined): StripLayoutInfo | null {
  const head = 'data:application/json,';
  if (!s || !s.startsWith(head)) return null;
  try {
    const v = JSON.parse(decodeURIComponent(s.slice(head.length))) as Partial<StripLayoutInfo> | null;
    if (!v || !finite(v.frames) || v.frames < 1 || !finite(v.cell) || v.cell < 8 || !finite(v.pxPerLu) || v.pxPerLu <= 0 || !finite(v.headLu)) return null;
    if (!Array.isArray(v.feet) || v.feet.length !== 2 || !v.feet.every(finite) || !Array.isArray(v.box) || v.box.length !== 4 || !v.box.every(finite)) return null;
    return { frames: Math.round(v.frames), cell: v.cell, ms: finite(v.ms) && v.ms > 0 ? v.ms : 0, feet: [v.feet[0]!, v.feet[1]!], pxPerLu: v.pxPerLu, headLu: v.headLu, box: [v.box[0]!, v.box[1]!, v.box[2]!, v.box[3]!] };
  } catch {
    return null;
  }
}

/** Reads a strip's frame count and the box its frames' drawn pixels fill together (a strip without a layout). */
function measureStrip(url: string, im: HTMLImageElement): IdleStrip | null {
  const cell = Math.max(1, im.naturalHeight);
  const frames = Math.max(1, Math.round(im.naturalWidth / cell));
  const box = { url, frames, cell, ms: 0, feet: null, x0: 0, x1: cell - 1, y0: 0, y1: cell - 1 };
  try {
    const c = document.createElement('canvas');
    c.width = frames * cell;
    c.height = cell;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return box;
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, cell).data;
    let x0 = cell;
    let x1 = -1;
    let y0 = cell;
    let y1 = -1;
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3]! < 8) continue;
        const cx = x % cell;
        if (cx < x0) x0 = cx;
        if (cx > x1) x1 = cx;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    return x1 >= x0 && y1 >= y0 ? { ...box, x0, x1: x1 + 1, y0, y1: y1 + 1 } : box;
  } catch {
    return box;
  }
}

function measureUrl(url: string): Promise<IdleStrip | null> {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(measureStrip(url, im));
    im.onerror = () => resolve(null);
    im.src = url;
  });
}

/**
 * Whether the provider's strips draw a troop's skin: they do (docs/requests/motion-m-skinned-strips.md: its own
 * sheet, or the skinned puppet as the lane draws it), so the still asks for the troop's skin and a skinned troop
 * keeps its outfit when the live layer takes over.
 */
const STRIPS_DRAW_SKINS = true;

/** The idle strips this page has loaded (null: the troop has none), by card, side, skin and cell size: a return to Home shows them at once. */
const idleStrips = new Map<string, IdleStrip | null>();
const idleLoads = new Map<string, Promise<IdleStrip | null>>();
/** Counts the idle strips that came in (Diorama re-reads which of its troops are still on their way). */
const idleSettled = signal(0);
/**
 * The troops shown so far (by `stripKey`): a troop whose strip comes in is placed (and its strip decoded) at
 * opacity 0 and marked shown in the next animation frame, so its fade-in starts in a frame that is painted and runs
 * on the compositor; marked in the same task, a long task before the next paint (Home's first work) used up the
 * whole fade and the troop popped in at full opacity.
 */
const shownStrips = new Set<string>();
const shownTick = signal(0);
const pendingShow = new Set<string>();

function showNextFrame(key: string): void {
  if (pendingShow.has(key)) return;
  pendingShow.add(key);
  const go = (): void => {
    pendingShow.delete(key);
    shownStrips.add(key);
    shownTick.value++;
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
  else setTimeout(go, 0);
}

const stripKey = (card: CardId, side: Side, skin: SkinId | null): string => `${card}|${side}|${skin ?? ''}|${STRIP_PX}`;

/**
 * A troop's idle clip from its battle sheet (or its skin's drawing) as a sprite strip in its side's team colour,
 * with its layout: the provider's `strip:idle:<card>` and `stripinfo:idle:<card>`. The provider keeps strips
 * between visits and draws new ones off the main thread, so they are asked for at once (no wait for Home to
 * settle): a returning player's troops stand with the island's entrance. A strip without a layout is measured.
 */
function loadIdleStrip(portrait: PortraitFn, card: CardId, side: Side, skin: SkinId | null): Promise<IdleStrip | null> {
  const key = stripKey(card, side, skin);
  const known = idleStrips.get(key);
  if (known !== undefined) return Promise.resolve(known);
  const busy = idleLoads.get(key);
  if (busy) return busy;
  const req: PortraitRequest = { card: `strip:idle:${card}` as CardId, size: STRIP_PX, plate: false, ...(side ? { side: 1 as const } : {}), ...(skin ? { skin } : {}) };
  const job = Promise.all([portrait(req), portrait({ ...req, card: `stripinfo:idle:${card}` as CardId }).catch(() => '')])
    .then(async ([url, info]): Promise<IdleStrip | null> => {
      if (!url) return null;
      const l = parseStripInfo(info);
      if (!l) return measureUrl(url);
      return { url, frames: l.frames, cell: l.cell, ms: l.ms, feet: { x: l.feet[0], y: l.feet[1], pxPerLu: l.pxPerLu, headLu: l.headLu }, x0: l.box[0], x1: l.box[1], y0: l.box[2], y1: l.box[3] };
    })
    .catch(() => null)
    .then((s) => {
      idleStrips.set(key, s);
      idleLoads.delete(key);
      idleSettled.value++;
      return s;
    });
  idleLoads.set(key, job);
  return job;
}

/**
 * A troop's idle strip: undefined while it is on its way, null when the troop has none. Asked for in the render
 * (idempotent; an effect would ask only after Home's first paint) and read from the page's strips on every render,
 * re-rendering as soon as a strip comes in (`idleSettled`), so a returning player's troops (whose strips the strip
 * worker found on the device as the visuals loaded) stand in Home's first frames, before its other first work.
 */
function useIdleStrip(card: CardId, side: Side, skin: SkinId | null): IdleStrip | null | undefined {
  const { portrait } = useKit();
  if (!portrait) return null;
  void idleSettled.value;
  const key = stripKey(card, side, skin);
  const known = idleStrips.get(key);
  if (known === undefined && !idleLoads.has(key)) void loadIdleStrip(portrait, card, side, skin);
  return known;
}

/**
 * Whether any of these troops is not standing yet: its strip on its way, or placed and waiting for its frame to
 * fade in (the live island's cold start waits for them, so its long task never holds a troop back).
 */
function useStillPending(troops: readonly { card: CardId; side: Side; skin: SkinId | null }[]): boolean {
  const { portrait } = useKit();
  void idleSettled.value;
  void shownTick.value;
  return (
    !!portrait &&
    troops.some((t) => {
      const key = stripKey(t.card, t.side, t.skin);
      const s = idleStrips.get(key);
      return s === undefined || (s !== null && !shownStrips.has(key));
    })
  );
}

/**
 * Where a troop's strip cell goes on the island picture from the strip's own layout: its feet on the troop's
 * spot, at the size the live layer draws it (cell px per lu, times the live island's troop scale for the unit's
 * head height and its units per lu), so the live layer takes over in place from the very first visit.
 */
function feetPlacement(strip: IdleStrip, feet: NonNullable<IdleStrip['feet']>, side: Side, spot: { x: number; y: number }, feetY: number): { left: number; top: number; cell: number; feetX: number } {
  // island units per strip px; the opponent's strip is mirrored (it faces left)
  const per = (LIVE_ISLAND.unitsPerLu * liveTroopScale(feet.headLu)) / feet.pxPerLu;
  const fx = side === 0 ? feet.x : strip.cell - feet.x;
  return { left: spot.x - fx * per, top: feetY - feet.y * per, cell: strip.cell * per, feetX: fx * per };
}

/**
 * Where a troop's strip cell goes on the island picture so its frames land exactly on the live layer's
 * (review M S3): the live island's box for the card (how far the idle pose reaches toward the opponent,
 * behind and above the feet, in island lu at the drawn size) against where the strip's pixels lie; the
 * horizontal reach fixes the scale and the top fixes the feet. Before a card's box is known: a typical
 * soldier's height, its feet just above the frames' lowest pixels.
 */
function stillPlacement(strip: IdleStrip, box: { front: number; back: number; top: number } | undefined, size: string | undefined, side: Side, spot: { x: number; y: number }, feetY: number): { left: number; top: number; cell: number; feetX: number } {
  const u = LIVE_ISLAND.unitsPerLu;
  const w = Math.max(1, strip.x1 - strip.x0);
  const h = Math.max(1, strip.y1 - strip.y0);
  let k: number;
  let ax: number;
  let ay: number;
  if (box && box.front + box.back > 1) {
    k = w / (box.front + box.back);
    ax = strip.x0 + box.back * k;
    ay = strip.y0 + box.top * k;
  } else {
    const d = defaultBox(size);
    k = h / (d.top + BELOW_FEET_LU);
    ax = strip.x0 + (w * d.back) / (d.front + d.back);
    ay = strip.y1 - BELOW_FEET_LU * k;
  }
  // island units per strip px; the opponent's strip is mirrored (it faces left)
  const per = u / k;
  const anchorX = side === 0 ? ax : strip.cell - ax;
  return { left: spot.x - anchorX * per, top: feetY - ay * per, cell: strip.cell * per, feetX: anchorX * per };
}

/**
 * One troop on the still island, exactly where and as large as the live layer draws it (review M S3): its
 * battle sheet's idle clip (or its skin's drawing) as a strip (`useIdleStrip`), its feet on the troop's spot at
 * the live layer's size (`feetPlacement`; a strip without a layout is fitted to the box the live island measured
 * for the card and skin, `troopBoxes`), playing at the clip's own pace. The opponent faces left. Under Reduce
 * motion the strip holds its first frame. It fades in (with a slight settle) from the animation frame after its strip
 * is in (`showNextFrame`), never pops.
 */
function StillTroop(p: { card: CardId; side: Side; slot: 0 | 1; skin?: SkinId | null; size?: string; air?: boolean }) {
  // the look the still can draw: the skin once the strips draw skins, else the card's own
  const look = STRIPS_DRAW_SKINS ? (p.skin ?? null) : null;
  const strip = useIdleStrip(p.card, p.side, look);
  const box = troopBoxes.value[boxKey(p.card, look)];
  const u = LIVE_ISLAND.unitsPerLu;
  const spot = LIVE_SPOTS[p.side][p.slot];
  const feet = spot.y - (p.air ? ISLAND_ALTITUDE_LU * u : 0);
  const pct = (v: number, of: number): string => `${((v / of) * 100).toFixed(3)}%`;
  const cls = `hd__unit hd__unit--${p.side ? 'foe' : 'me'} hd__unit--s${p.slot}`;
  if (!strip) return <span class={cls} data-card={p.card} data-skin={look ?? undefined} />;
  const key = stripKey(p.card, p.side, look);
  void shownTick.value;
  const shown = shownStrips.has(key);
  if (!shown) showNextFrame(key);
  const at = strip.feet ? feetPlacement(strip, strip.feet, p.side, spot, feet) : stillPlacement(strip, box, p.size, p.side, spot, feet);
  // the contact shadow under the feet (on the ground for a flyer), in the cell's own share
  const shadowW = (p.size === 'huge' ? 54 : p.size === 'large' ? 40 : 26) * u;
  const ms = strip.ms > 0 ? strip.ms : strip.frames * IDLE_FRAME_MS;
  return (
    <span class={`${cls} ${shown ? 'is-in' : 'is-ready'}`} data-card={p.card} data-skin={look ?? undefined} style={{ left: pct(at.left, W), top: pct(at.top, H), width: pct(at.cell, W), height: pct(at.cell, H) }}>
      <i class="hd__unitShadow" style={{ left: pct(at.feetX - shadowW / 2, at.cell), width: pct(shadowW, at.cell), top: pct(spot.y - at.top - 2.2 * u, at.cell), height: pct(4.4 * u, at.cell) }} />
      <span
        class={`ui-strip hd__unitStrip${p.side ? ' ui-strip--flip' : ''}`}
        aria-hidden="true"
        style={{ backgroundImage: `url("${strip.url}")`, '--strip-frames': strip.frames, '--strip-ms': `${Math.round(ms)}ms` }}
      />
    </span>
  );
}

/**
 * The far side of the lane (spec "online-first Battle hub" 1.6): the AI's base (`ai`); online, a grey
 * "?" silhouette until a player is found (`unknown`), fog drifting over it while searching
 * (`searching`, MR-121), and the found player's base dropping in as the fog clears (`found`, MR-122).
 */
export type FoeLook = 'ai' | 'unknown' | 'searching' | 'found';

/** What the live island needs beyond the still picture (HomeScreen passes it; absent: the still only). */
export interface DioramaLive {
  /** A sheet or panel covers Home (or the launch has begun): the live island stops drawing. */
  paused: boolean;
  /** Home is leaving for a match: the live island lets its WebGL context go at once. */
  leaving: boolean;
  /** Reduce motion: the still island stays (no live layer). */
  reduce: boolean;
  lite: boolean;
  teamPreset: TeamPreset;
  /** Your troops' equipped skins, by card. */
  skins: Readonly<Record<string, SkinId>>;
  /** The opponent's flags once a player is found (the AI flies a plain banner). */
  foeFlags?: { baseFlag: CosmeticKey | null; nationalFlag: CosmeticKey | null } | null;
  /** The opponent's troops before they show (the ranked search's prepared opponent): loaded, not drawn. */
  foeNext?: readonly CardId[];
  /** Graphics on Auto: the island takes Lite's pace once frames run long (the battle's Auto rule). */
  auto?: boolean;
  /** A ranked search or a launch is under way: a cold start of the live island waits until it is over. */
  hold?: boolean;
}

/** The live island's request for these troops and flags, or null when it should not run (Reduce motion). */
export function liveIslandRequest(p: { arena: ArenaId; mine: readonly CardId[]; foe: readonly CardId[]; hidden: boolean; myFlags?: { baseFlag: string | null; nationalFlag: string | null } | undefined; live: DioramaLive }): HomeStageRequest | null {
  if (p.live.reduce) return null;
  const troops: HomeStageTroop[] = [];
  p.mine.slice(0, 2).forEach((card, i) => troops.push({ side: 0, slot: i as 0 | 1, card, skin: p.live.skins[card] ?? null, ...LIVE_SPOTS[0][i]! }));
  p.foe.slice(0, 2).forEach((card, i) => troops.push({ side: 1, slot: i as 0 | 1, card, skin: null, ...LIVE_SPOTS[1][i]! }));
  const flag = (k: string | null | undefined): CosmeticKey | null => (k ? (k as CosmeticKey) : null);
  const poles: HomeStagePole[] = [
    { side: 0, ...LIVE_POLES[0], baseFlag: flag(p.myFlags?.baseFlag), nationalFlag: flag(p.myFlags?.nationalFlag) },
    { side: 1, ...LIVE_POLES[1], baseFlag: p.hidden ? null : (p.live.foeFlags?.baseFlag ?? null), nationalFlag: p.hidden ? null : (p.live.foeFlags?.nationalFlag ?? null), ...(p.hidden ? { grey: true } : {}) },
  ];
  return {
    troops,
    poles,
    island: LIVE_ISLAND,
    teamPreset: p.live.teamPreset,
    lite: p.live.lite,
    ...(p.live.auto ? { auto: true } : {}),
    seed: fnv1a32(`home:${p.arena}:${p.mine.join(',')}:${p.foe.join(',')}`),
    // always sent (empty when none), so a cancelled search lets the preloaded sheets go
    preload: (p.live.foeNext ?? []).slice(0, 2).map((card) => ({ card })),
    hold: p.live.hold === true,
  };
}

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
  /** Your equipped flags (owned keys or null): with either, your base flies the lane's flag pole instead of the plain banner. */
  myFlags?: { baseFlag: string | null; nationalFlag: string | null };
  /** The live island's settings (absent: the still island only). */
  live?: DioramaLive;
}) {
  const look = p.foeLook ?? 'ai';
  const hidden = look === 'unknown' || look === 'searching';
  const pal = ISLANDS[p.arena];
  const seed = fnv1a32(`hub:${p.arena}`);
  const liveHost = useRef<HTMLDivElement>(null);
  const { content } = useUi();
  // the live island's request (small; the hook sends a change only when its content changed)
  const req = p.live ? liveIslandRequest({ arena: p.arena, mine: p.mine ?? [], foe: p.foe ?? [], hidden, myFlags: p.myFlags, live: p.live }) : null;
  // the live island's cold start (one long task) waits until the still troops are in, so they never wait behind it
  const stills = [...(p.mine ?? []).slice(0, 2).map((card) => ({ card, side: 0 as Side, skin: STRIPS_DRAW_SKINS ? (p.live?.skins[card] ?? null) : null })), ...(p.foe ?? []).slice(0, 2).map((card) => ({ card, side: 1 as Side, skin: null }))];
  const pending = useStillPending(stills);
  const live = useHomeStage(liveHost, req, { paused: !!p.live?.paused, leaving: !!p.live?.leaving || !!p.launching, wait: pending });
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
      class={`hd${p.launching ? ' is-launching' : ''}${(p.mine?.length ?? 0) > 0 && (p.foe?.length ?? 0) > 0 ? ' has-units' : ''} is-foe-${look}${live ? ' is-live' : ''}`}
      data-arena={p.arena}
      data-live={live ? 'true' : undefined}
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
              <g key={`root${i}`} transform={`translate(${x} ${y})`}>
                <g class="hd-root" style={{ animationDelay: `${-i * 0.9}s` }}>
                  <path d={`M0 0 q-4 ${len! * 0.4} 2 ${len! * 0.7} q4 ${len! * 0.2} -1 ${len! * 0.3}`} stroke={ink('#6b4a2e')} stroke-width="3.6" fill="none" stroke-linecap="round" />
                  <path d={`M0 0 q-4 ${len! * 0.4} 2 ${len! * 0.7} q4 ${len! * 0.2} -1 ${len! * 0.3}`} stroke="#7a5433" stroke-width="1.8" fill="none" stroke-linecap="round" />
                </g>
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
            {/* the clash point at the lane's middle */}
            <g class="hd-clash" transform="translate(300 206)">
              <circle r="22" fill={pal.glow} opacity=".22" />
              <path d="M-12 -12 L12 12 M12 -12 L-12 12" stroke="#1b140d" stroke-width="7" stroke-linecap="round" />
              <path d="M-12 -12 L12 12 M12 -12 L-12 12" stroke="#ffe39a" stroke-width="3.5" stroke-linecap="round" />
            </g>
          </svg>
          <span class="hd__base hd__base--me">
            <SkinnedBase age={p.age} skin={p.mySkin} />
          </span>
          <span class="hd__base hd__base--foe" key={look === 'found' ? 'found' : 'base'}>
            <SkinnedBase age={p.age} skin={p.foeSkin} side={1} />
            {hidden ? (
              <i class="hd__unknown">
                <b>?</b>
              </i>
            ) : null}
          </span>
          {/* the still flag poles and troops, where and as large as the live layer draws them (over the bases,
              as the live layer is); they step aside while it draws */}
          <svg class="hd__poles" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <StillPole id={`${id}-p0`} side={0} team={p.teamMe} baseFlag={p.myFlags?.baseFlag ?? null} nationalFlag={p.myFlags?.nationalFlag ?? null} />
            <StillPole id={`${id}-p1`} side={1} team={p.teamFoe} baseFlag={hidden ? null : (p.live?.foeFlags?.baseFlag ?? null)} nationalFlag={hidden ? null : (p.live?.foeFlags?.nationalFlag ?? null)} grey={hidden} />
          </svg>
          {(p.mine ?? []).slice(0, 2).map((c, i) => (
            <StillTroop key={`m${i}${c}`} card={c} side={0} slot={i as 0 | 1} skin={p.live?.skins[c] ?? null} size={content.units[c]?.size} air={content.units[c]?.tags.includes('air') ?? false} />
          ))}
          {(p.foe ?? []).slice(0, 2).map((c, i) => (
            <StillTroop key={`f${i}${c}`} card={c} side={1} slot={i as 0 | 1} size={content.units[c]?.size} air={content.units[c]?.tags.includes('air') ?? false} />
          ))}
          {/* the live island's Pixi layer (troops and flags), over the bases and under the search fog */}
          {req ? <div class="hd__live" ref={liveHost} /> : null}
          {look === 'searching' ? (
            <span class="hd__fog">
              <i class="hd__fog-a" />
              <i class="hd__fog-b" />
              <i class="hd__fog-sweep" />
            </span>
          ) : null}
          {look === 'found' ? <i class="hd__dust" /> : null}
          <i class="hd__spark hd__spark--1" />
          <i class="hd__spark hd__spark--2" />
          <i class="hd__spark hd__spark--3" />
        </div>
      </div>
    </div>
  );
}
