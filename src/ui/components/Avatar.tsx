/**
 * Procedural face avatars (A6.1 "procedural face avatar built from parts") and AI General portraits.
 *
 * A look is picked from the save's `AvatarSpec`: explicit `parts` win, the rest derive from `seed`
 * with the cosmetic RNG (DESIGN B3: views use mulberry32). A player may instead show the portrait of
 * an owned unit (`portraitCard`). Generals get a seeded look with a hat per personality; every
 * General portrait is paired with the AI label by its caller (A7.1).
 */
import type { AgeId, AvatarSpec } from '@/contracts';
import { fnv1a32, mulberry32 } from '@/core';
import { CardArt } from './CardTile';
import { OUTLINE } from './icons';

export const AVATAR_PARTS = {
  skin: ['#f6d2ae', '#eab88e', '#d49a6a', '#b07a4f', '#8a5a3a', '#6a4430'],
  hairColor: ['#2d1b12', '#5a3620', '#8e5a2b', '#d9a441', '#c9c9c9', '#b8452d'],
  hair: 6,
  eyes: 4,
  brows: 3,
  mouth: 4,
  beard: 4,
  hat: 6,
  bg: ['#2f7df6', '#3cc46b', '#a855f7', '#e05a3c', '#f2c14e', '#22b8cf'],
} as const;

export interface AvatarLook {
  skin: number;
  hairColor: number;
  hair: number;
  eyes: number;
  brows: number;
  mouth: number;
  beard: number;
  hat: number;
  bg: number;
}

const COUNTS: Record<keyof AvatarLook, number> = {
  skin: AVATAR_PARTS.skin.length,
  hairColor: AVATAR_PARTS.hairColor.length,
  hair: AVATAR_PARTS.hair,
  eyes: AVATAR_PARTS.eyes,
  brows: AVATAR_PARTS.brows,
  mouth: AVATAR_PARTS.mouth,
  beard: AVATAR_PARTS.beard,
  hat: AVATAR_PARTS.hat,
  bg: AVATAR_PARTS.bg.length,
};

const ORDER: (keyof AvatarLook)[] = ['skin', 'hairColor', 'hair', 'eyes', 'brows', 'mouth', 'beard', 'hat', 'bg'];

/** Deterministic look from a seed; `parts` override single slots (wrapped into range). */
export function avatarLook(seed: number, parts: Readonly<Record<string, number>> = {}): AvatarLook {
  const rng = mulberry32(seed);
  const look = {} as AvatarLook;
  for (const k of ORDER) {
    const rolled = rng.int(COUNTS[k]);
    const forced = parts[k];
    look[k] = forced === undefined ? rolled : ((Math.trunc(forced) % COUNTS[k]) + COUNTS[k]) % COUNTS[k];
  }
  return look;
}

function Face(p: { look: AvatarLook; x?: number; scale?: number; visor?: boolean }) {
  const L = p.look;
  const skin = AVATAR_PARTS.skin[L.skin]!;
  const hair = AVATAR_PARTS.hairColor[L.hairColor]!;
  const s = p.scale ?? 1;
  const tx = p.x ?? 0;
  return (
    <g transform={`translate(${tx} 0) translate(50 56) scale(${s}) translate(-50 -56)`}>
      {/* shoulders */}
      <path
        d="M18 100c2-18 16-26 32-26s30 8 32 26z"
        fill={AVATAR_PARTS.bg[(L.bg + 2) % AVATAR_PARTS.bg.length]}
        stroke={OUTLINE}
        stroke-width="3"
      />
      {/* long hair behind */}
      {L.hair === 3 ? <path d="M24 50c0-22 12-32 26-32s26 10 26 32v26H24z" fill={hair} stroke={OUTLINE} stroke-width="3" /> : null}
      {/* head */}
      <ellipse cx="50" cy="52" rx="24" ry="26" fill={skin} stroke={OUTLINE} stroke-width="3" />
      <ellipse cx="27" cy="54" rx="4" ry="6" fill={skin} stroke={OUTLINE} stroke-width="2.5" />
      <ellipse cx="73" cy="54" rx="4" ry="6" fill={skin} stroke={OUTLINE} stroke-width="2.5" />
      <path d="M36 66c4 4 10 6 14 6" stroke="#000" stroke-opacity=".12" stroke-width="5" fill="none" stroke-linecap="round" />
      {/* beard */}
      {L.beard === 1 ? <path d="M30 62c4 14 12 18 20 18s16-4 20-18c-6 6-12 8-20 8s-14-2-20-8z" fill={hair} opacity=".45" /> : null}
      {L.beard === 2 ? (
        <path d="M28 58c2 18 12 26 22 26s20-8 22-26c-6 8-14 10-22 10s-16-2-22-10z" fill={hair} stroke={OUTLINE} stroke-width="2.5" />
      ) : null}
      {L.beard === 3 ? (
        <path d="M38 63c4-3 8-3 12-1 4-2 8-2 12 1-4 4-8 3-12 1-4 2-8 3-12-1z" fill={hair} stroke={OUTLINE} stroke-width="2" />
      ) : null}
      {/* eyes */}
      {p.visor ? (
        <>
          <rect x="31" y="42" width="38" height="12" rx="6" fill="#2a3552" stroke={OUTLINE} stroke-width="2.5" />
          <circle cx="41" cy="48" r="3.2" fill="#5ff2ff" />
          <circle cx="59" cy="48" r="3.2" fill="#5ff2ff" />
        </>
      ) : L.eyes === 1 ? (
        <>
          <path d="M36 50q5-6 10 0M54 50q5-6 10 0" fill="none" stroke={OUTLINE} stroke-width="3" stroke-linecap="round" />
        </>
      ) : L.eyes === 2 ? (
        <>
          <ellipse cx="41" cy="49" rx="4" ry="5" fill="#fff" stroke={OUTLINE} stroke-width="2" />
          <ellipse cx="59" cy="49" rx="4" ry="5" fill="#fff" stroke={OUTLINE} stroke-width="2" />
          <circle cx="42" cy="50" r="2.2" fill={OUTLINE} />
          <circle cx="60" cy="50" r="2.2" fill={OUTLINE} />
        </>
      ) : L.eyes === 3 ? (
        <>
          <path d="M36 50h10M54 50h10" stroke={OUTLINE} stroke-width="3.4" stroke-linecap="round" />
        </>
      ) : (
        <>
          <circle cx="41" cy="49" r="3.2" fill={OUTLINE} />
          <circle cx="59" cy="49" r="3.2" fill={OUTLINE} />
          <circle cx="42" cy="48" r="1" fill="#fff" />
          <circle cx="60" cy="48" r="1" fill="#fff" />
        </>
      )}
      {/* brows */}
      {L.brows === 0 ? <path d="M35 41l11 2M65 41l-11 2" stroke={hair} stroke-width="3.4" stroke-linecap="round" /> : null}
      {L.brows === 1 ? <path d="M35 43l11-3M65 43l-11-3" stroke={hair} stroke-width="3.4" stroke-linecap="round" /> : null}
      {L.brows === 2 ? (
        <path d="M35 41q5-3 11 0M54 41q6-3 11 0" fill="none" stroke={hair} stroke-width="3.4" stroke-linecap="round" />
      ) : null}
      {/* nose */}
      <path d="M50 52q-4 6 0 8" fill="none" stroke={OUTLINE} stroke-width="2.2" stroke-linecap="round" opacity=".6" />
      {/* mouth */}
      {L.mouth === 0 ? <path d="M42 66q8 6 16 0" fill="none" stroke={OUTLINE} stroke-width="3" stroke-linecap="round" /> : null}
      {L.mouth === 1 ? <path d="M41 64q9 10 18 0z" fill="#fff" stroke={OUTLINE} stroke-width="2.6" stroke-linejoin="round" /> : null}
      {L.mouth === 2 ? <path d="M43 67h14" stroke={OUTLINE} stroke-width="3" stroke-linecap="round" /> : null}
      {L.mouth === 3 ? <ellipse cx="50" cy="67" rx="5" ry="4" fill="#7a2a2a" stroke={OUTLINE} stroke-width="2.4" /> : null}
      {/* hair on top */}
      {L.hair === 1 ? (
        <path d="M26 46c0-20 12-28 24-28s24 8 24 28c-6-8-14-12-24-12s-18 4-24 12z" fill={hair} stroke={OUTLINE} stroke-width="3" />
      ) : null}
      {L.hair === 2 ? (
        <path
          d="M26 46l2-14 6 6 4-14 6 8 6-12 6 12 6-8 4 14 6-6 2 14c-8-6-16-9-24-9s-16 3-24 9z"
          fill={hair}
          stroke={OUTLINE}
          stroke-width="3"
          stroke-linejoin="round"
        />
      ) : null}
      {L.hair === 3 ? (
        <path d="M26 48c0-20 12-30 24-30s24 10 24 30c-8-10-16-14-24-14s-16 4-24 14z" fill={hair} stroke={OUTLINE} stroke-width="3" />
      ) : null}
      {L.hair === 4 ? (
        <>
          <circle cx="50" cy="20" r="8" fill={hair} stroke={OUTLINE} stroke-width="3" />
          <path d="M26 46c0-18 12-26 24-26s24 8 24 26c-6-8-14-11-24-11s-18 3-24 11z" fill={hair} stroke={OUTLINE} stroke-width="3" />
        </>
      ) : null}
      {L.hair === 5 ? <path d="M44 32l2-16h8l2 16c-2 2-10 2-12 0z" fill={hair} stroke={OUTLINE} stroke-width="3" /> : null}
      {/* hats */}
      {L.hat === 1 ? (
        <>
          <path d="M24 42c0-16 12-24 26-24s26 8 26 24z" fill="#8c95a6" stroke={OUTLINE} stroke-width="3" />
          <path
            d="M26 30c-8-4-10-12-8-18 4 6 8 8 12 10M74 30c8-4 10-12 8-18-4 6-8 8-12 10"
            fill="#ede3c8"
            stroke={OUTLINE}
            stroke-width="2.6"
          />
          <path d="M22 42h56" stroke={OUTLINE} stroke-width="4" stroke-linecap="round" />
        </>
      ) : null}
      {L.hat === 2 ? <path d="M25 36h50v8H25z" fill="#e05a3c" stroke={OUTLINE} stroke-width="2.6" /> : null}
      {L.hat === 3 ? (
        <>
          <path d="M22 38c4-16 16-22 28-22s24 6 28 22z" fill="#2e5e4e" stroke={OUTLINE} stroke-width="3" />
          <path d="M18 38h64" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" />
          <path d="M18 38h64" stroke="#c9a227" stroke-width="2.4" stroke-linecap="round" />
        </>
      ) : null}
      {L.hat === 4 ? (
        <path d="M30 34l4-16 8 8 8-12 8 12 8-8 4 16z" fill="#ffcf3a" stroke={OUTLINE} stroke-width="3" stroke-linejoin="round" />
      ) : null}
      {L.hat === 5 ? (
        <>
          <path d="M24 44c0-18 12-28 26-28s26 10 26 28z" fill="#62664a" stroke={OUTLINE} stroke-width="3" />
          <path d="M20 44h60" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" />
        </>
      ) : null}
    </g>
  );
}

/** Player avatar in a round frame. */
export function Avatar(p: { spec: AvatarSpec; size?: number; frameColor?: string; label?: string; testid?: string }) {
  const size = p.size ?? 64;
  if (p.spec.portraitCard) {
    return (
      <span
        class="ui-avatar"
        style={{ width: `${size}px`, height: `${size}px`, '--frame': p.frameColor ?? '#f2c14e' }}
        role="img"
        aria-label={p.label}
        data-testid={p.testid}
      >
        <CardArt card={p.spec.portraitCard} age="stone" glyph="infantry" size={size} />
      </span>
    );
  }
  const look = avatarLook(p.spec.seed, p.spec.parts);
  return (
    <span
      class="ui-avatar"
      style={{ width: `${size}px`, height: `${size}px`, '--frame': p.frameColor ?? '#f2c14e' }}
      role="img"
      aria-label={p.label}
      data-testid={p.testid}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <rect width="100" height="100" fill={AVATAR_PARTS.bg[look.bg]} />
        <circle cx="50" cy="40" r="42" fill="#fff" opacity=".12" />
        <Face look={look} />
      </svg>
    </span>
  );
}

/** Hat per General personality, so the board reads at a glance. */
const GENERAL_HATS: Record<string, number> = {
  grogg: 1,
  pip: 2,
  kettle: 3,
  moss: 0,
  ledger: 4,
  boomsworth: 5,
  twins: 2,
  rook: 3,
  tempest: 4,
  warden: 5,
};

const GENERAL_AGE_BG: Record<string, AgeId> = {
  grogg: 'stone',
  pip: 'stone',
  kettle: 'medieval',
  moss: 'medieval',
  ledger: 'gunpowder',
  boomsworth: 'gunpowder',
  twins: 'modern',
  rook: 'modern',
  tempest: 'future',
  warden: 'future',
  echo: 'future',
};

const AGE_PLATE: Record<AgeId, [string, string]> = {
  stone: ['#c98a3d', '#5a4a3a'],
  medieval: ['#8e2a4a', '#3a2f3f'],
  gunpowder: ['#2e5e4e', '#1d3a31'],
  modern: ['#62664a', '#2f3228'],
  future: ['#6b3fd6', '#1a1440'],
};

/**
 * Seeded portrait of an AI General or procedural commander. Ada & Ivo get two faces (A7.4). The
 * caller shows the AI badge next to it (A7.1).
 */
export function GeneralPortrait(p: { generalId: string; name?: string; size?: number; label?: string; testid?: string }) {
  const size = p.size ?? 96;
  const seed = fnv1a32(`${p.generalId}|${p.name ?? ''}`);
  const base = avatarLook(seed);
  const hat = GENERAL_HATS[p.generalId];
  const look: AvatarLook = hat === undefined ? base : { ...base, hat };
  const plate = AGE_PLATE[GENERAL_AGE_BG[p.generalId] ?? 'medieval'];
  const twins = p.generalId === 'twins';
  const visor = p.generalId === 'warden' || p.generalId === 'echo';
  const gid = `gp-${p.generalId}`;
  return (
    <span class="ui-general" style={{ width: `${size}px`, height: `${size}px` }} role="img" aria-label={p.label} data-testid={p.testid}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <defs>
          <radialGradient id={gid} cx="50%" cy="38%" r="70%">
            <stop offset="0" stop-color={plate[0]} />
            <stop offset="1" stop-color={plate[1]} />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gid})`} />
        {twins ? (
          <>
            <Face look={{ ...look, hair: 3, beard: 0, hat: 0 }} x={-15} scale={0.82} />
            <Face look={{ ...look, hair: 1, beard: 3, hat: 2, skin: (look.skin + 2) % 6 }} x={15} scale={0.82} />
          </>
        ) : (
          <Face look={look} visor={visor} />
        )}
      </svg>
    </span>
  );
}
