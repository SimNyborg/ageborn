/**
 * The War Path's node dressings and road decorations (owner decision 2026-09-30: varied node types,
 * decorations along the way, a satisfying unlock): the treasure chest and the story scroll that sit on
 * their nodes, the elite crest behind a Hard shield, the boss's lair (spiked banners and torches), the
 * lanterns between nodes, the near-layer silhouettes and the burst when a node breaks free of its
 * padlock (MR-41). Code-drawn A11 cartoon chrome; decorative (`aria-hidden`); CSS motion stills under
 * reduce motion.
 */
import type { AgeId } from '@/contracts';
import { fnv1a32, mulberry32 } from '@/core';
import type { ComponentChildren } from 'preact';
import { REGION_THEMES } from './regionArt';

const INK = '#1b1712';

/** A small treasure chest on a treasure node: closed with a glint until won, then open with gold. */
export function Chest(p: { open: boolean }) {
  return (
    <i class={`wp-chest${p.open ? ' is-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 40 34" width="34" height="29">
        <ellipse cx="20" cy="31" rx="15" ry="3" fill="#000" opacity=".3" />
        <rect x="5" y="14" width="30" height="16" rx="3" fill="#8a5a2c" stroke={INK} stroke-width="2" />
        <rect x="5" y="14" width="10" height="16" rx="2" fill="#b07a42" opacity=".6" />
        <path d="M5 21 h30" stroke="#d9a441" stroke-width="3" />
        {p.open ? (
          <>
            <path d="M8 14 Q20 6 32 14" fill="#ffd466" />
            <circle cx="15" cy="12" r="2.4" fill="#fff4c0" />
            <circle cx="24" cy="11" r="2" fill="#fff4c0" />
            <path class="wp-chest__lid" d="M5 14 L7 2 Q20 -4 33 2 L35 14 Z" fill="#9a6632" stroke={INK} stroke-width="2" transform="rotate(-24 5 14)" />
          </>
        ) : (
          <>
            <path class="wp-chest__lid" d="M5 14 Q5 4 20 4 Q35 4 35 14 Z" fill="#9a6632" stroke={INK} stroke-width="2" />
            <path d="M10 8 Q20 4 30 8" stroke="#d9a441" stroke-width="2.5" fill="none" />
            <rect x="17" y="17" width="6" height="7" rx="1" fill="#ffd466" stroke={INK} stroke-width="1.5" />
            <path class="wp-chest__glint" d="M28 6 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 z" fill="#fff" />
          </>
        )}
      </svg>
    </i>
  );
}

/** A story scroll on a node that teaches something (A18.7.5). */
export function Scroll() {
  return (
    <i class="wp-scroll" aria-hidden="true">
      <svg viewBox="0 0 40 30" width="32" height="24">
        <ellipse cx="20" cy="28" rx="13" ry="2.5" fill="#000" opacity=".3" />
        <rect x="8" y="5" width="24" height="18" fill="#f3e6c4" stroke={INK} stroke-width="1.8" />
        <path d="M12 10 h16 M12 14 h13 M12 18 h15" stroke="#8a6a3a" stroke-width="1.6" stroke-linecap="round" />
        <rect x="4" y="3" width="6" height="22" rx="3" fill="#d9c08a" stroke={INK} stroke-width="1.8" />
        <rect x="30" y="3" width="6" height="22" rx="3" fill="#d9c08a" stroke={INK} stroke-width="1.8" />
        <path d="M30 18 l6 10" stroke="#b8453a" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    </i>
  );
}

/** Two crossed swords behind an elite (Hard) shield. */
export function EliteCrest(p: { size: number }) {
  const s = p.size * 1.5;
  return (
    <i class="wp-crest" aria-hidden="true" style={{ width: `${s}px`, height: `${s}px`, left: `${(p.size - s) / 2}px`, top: `${(p.size - s) / 2 - 4}px` }}>
      <svg viewBox="0 0 60 60" width={s} height={s}>
        <g stroke-linecap="round">
          <path d="M8 8 L52 52 M52 8 L8 52" stroke={INK} stroke-width="7" />
          <path d="M8 8 L52 52 M52 8 L8 52" stroke="#c9d1dc" stroke-width="3.5" />
          <path d="M14 20 l6 -6 M40 14 l6 6" stroke="#d9a441" stroke-width="4" />
        </g>
      </svg>
    </i>
  );
}

/** The boss's lair: spiked banners either side and torches, glowing once the boss can be fought. */
export function BossLair(p: { size: number; lit: boolean }) {
  const w = p.size * 2.1;
  const h = p.size * 1.4;
  return (
    <i class={`wp-lair${p.lit ? ' is-lit' : ''}`} aria-hidden="true" style={{ width: `${w}px`, height: `${h}px`, left: `${(p.size - w) / 2}px`, top: `${p.size - h + 4}px` }}>
      <svg viewBox="0 0 120 80" width={w} height={h}>
        <ellipse class="wp-lair__aura" cx="60" cy="54" rx="50" ry="22" fill="#ff5a3a" opacity=".25" />
        {[14, 106].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 80 V14`} stroke="#3b2a1e" stroke-width="3" />
            <path d={`M${x} 14 l-4 -8 l4 3 l4 -3 z`} fill="#c9d1dc" stroke={INK} stroke-width="1" />
            <path class="wp-lair__banner" d={i ? `M${x} 18 h-14 v22 l7 -5 l7 5 z` : `M${x} 18 h14 v22 l-7 -5 l-7 5 z`} fill="#7a2a24" stroke={INK} stroke-width="1.5" />
            <path d={i ? `M${x - 10} 26 l3 4 l3 -4` : `M${x + 4} 26 l3 4 l3 -4`} stroke="#d9a441" stroke-width="1.6" fill="none" />
          </g>
        ))}
        {[30, 90].map((x, i) => (
          <g key={`t${x}`}>
            <path d={`M${x} 80 V52`} stroke="#4a3322" stroke-width="3" />
            <path d={`M${x - 4} 52 h8 l-2 4 h-4 z`} fill="#6b4a2c" />
            <path class="wp-lair__flame" style={{ animationDelay: `${-i * 0.2}s` }} d={`M${x - 4} 52 Q${x - 5} 44 ${x} 38 Q${x + 5} 44 ${x + 4} 52 Z`} fill="#ff9a2a" />
          </g>
        ))}
      </svg>
    </i>
  );
}

/** A lantern beside the road, in the region's style: lit (glow and flicker) or dark. */
export function Lantern(p: { x: number; y: number; age: AgeId; lit: boolean; s: number }) {
  const t = REGION_THEMES[p.age];
  const glow = p.age === 'future' || p.age === 'cosmic' ? t.accent : '#ffcf6a';
  const post = p.age === 'future' || p.age === 'cosmic' ? '#34506a' : '#3b2a1e';
  return (
    <g transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.s.toFixed(2)})`} class={p.lit ? 'wp-lantern is-lit' : 'wp-lantern'}>
      <ellipse cx="0" cy="0" rx="6" ry="2" fill="#000" opacity=".3" />
      <path d="M0 0 V-22" stroke={post} stroke-width="2.4" />
      {p.age === 'stone' || p.age === 'bronze' ? (
        <path d="M-5 -22 h10 l-2 5 h-6 z" fill="#6b4a2c" stroke={INK} stroke-width="1" />
      ) : (
        <rect x="-4" y="-30" width="8" height="9" rx="1.5" fill={p.lit ? '#3b2a1e' : '#2a2f38'} stroke={INK} stroke-width="1" />
      )}
      {p.lit ? (
        <>
          <circle class="wp-lantern__glow" cx="0" cy="-26" r="9" fill={glow} opacity=".35" />
          <path class="wp-lantern__flame" d="M-2.6 -23 Q-3 -28 0 -31 Q3 -28 2.6 -23 Z" fill={glow} />
        </>
      ) : (
        <circle cx="0" cy="-25.5" r="2" fill="#5a6070" />
      )}
    </g>
  );
}

/** Near-layer silhouettes for a region: bushes, grass, rocks (or crystals), dark and soft. */
export function Foreground(p: { age: AgeId; w: number; h: number }) {
  const t = REGION_THEMES[p.age];
  const rng = mulberry32(fnv1a32(`near:${p.age}:${p.w}`));
  const crystal = p.age === 'future' || p.age === 'cosmic';
  const items: ComponentChildren[] = [];
  let x = 20 + rng.next() * 60;
  let i = 0;
  while (x < p.w - 20) {
    const k = rng.next();
    const sc = 0.7 + rng.next() * 0.6;
    const tr = `translate(${x.toFixed(0)} ${p.h}) scale(${sc.toFixed(2)})`;
    if (crystal)
      items.push(
        <g key={i} transform={tr}>
          <path d="M-22 0 L-14 -46 L-6 0 Z M-6 0 L4 -64 L14 0 Z M12 0 L20 -34 L28 0 Z" fill={t.body} />
          <path d="M-14 -46 L-6 0 L-10 0 Z M4 -64 L14 0 L9 0 Z" fill={t.lit} opacity=".35" />
        </g>,
      );
    else if (k < 0.45)
      items.push(
        <g key={i} transform={tr}>
          <circle cx="-16" cy="-18" r="20" fill={t.body} />
          <circle cx="8" cy="-26" r="26" fill={t.body} />
          <circle cx="30" cy="-14" r="16" fill={t.body} />
          <circle cx="0" cy="-36" r="12" fill={t.lit} opacity=".28" />
          <rect x="-40" y="-10" width="84" height="10" fill={t.body} />
        </g>,
      );
    else if (k < 0.62)
      items.push(
        <g key={i} transform={`${tr} scale(0.7)`}>
          <path d="M-30 0 Q-32 -22 -6 -28 Q22 -32 32 -12 Q36 0 30 0 Z" fill="#4d4944" />
          <path d="M-24 -6 Q-24 -20 -6 -24 Q2 -18 -8 -12 Z" fill="#8a847a" opacity=".6" />
          <path d="M-36 0 Q-38 -16 -44 -24 M-30 0 Q-28 -20 -32 -30 M34 0 Q38 -14 44 -20" stroke={t.body} stroke-width="4" fill="none" stroke-linecap="round" />
        </g>,
      );
    else
      items.push(
        <g key={i} transform={tr}>
          <g class="wp-grass" style={{ animationDelay: `${-i * 0.7}s` }}>
            <path d="M-20 0 Q-22 -30 -30 -44 M-10 0 Q-8 -36 -16 -56 M0 0 Q2 -40 8 -60 M10 0 Q14 -30 24 -46 M18 0 Q24 -20 34 -30" stroke={t.body} stroke-width="5" fill="none" stroke-linecap="round" />
          </g>
        </g>,
      );
    x += 120 + rng.next() * 160;
    i++;
  }
  return (
    <svg class="wp-near__art" width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`} aria-hidden="true">
      <g class="wp-near__dark">
        {items}
      </g>
    </svg>
  );
}

/** MR-41: the padlock bursts into shards, a ring flashes and dust puffs as the node lands. */
export function UnlockBurst() {
  return (
    <i class="wp-burst" aria-hidden="true">
      <i class="wp-burst__ring" />
      {Array.from({ length: 8 }, (_, k) => (
        <i key={k} class="wp-burst__shard" style={{ '--a': `${k * 45 + 10}deg` }} />
      ))}
      {Array.from({ length: 4 }, (_, k) => (
        <i key={`d${k}`} class="wp-burst__dust" style={{ '--dx': `${(k - 1.5) * 22}px` }} />
      ))}
    </i>
  );
}
