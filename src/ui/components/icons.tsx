/**
 * Meta UI icons as inline SVG in the A11 cartoon style: flat fills, one highlight, and a dark
 * outline (never pure black). No emoji and no external requests. One module, so a later art pass can
 * swap every icon in one place. All icons are decorative (`aria-hidden`); the text next to them, or
 * the button's `aria-label`, carries the meaning.
 */
import type { AgeId, CapsuleTier, Rarity, Role, RoleGroup } from '@/contracts';
import type { ComponentChildren } from 'preact';
import './capsuleLadder.css';

export interface IconProps {
  size?: number;
  class?: string;
}

/** Outline colour of every icon (dark violet, as in the HUD). */
export const OUTLINE = '#1b1330';

/** DESIGN A10 rarity colours (UI only). */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#B8C0CC',
  rare: '#22B8CF',
  epic: '#A855F7',
  legendary: '#F5B82E',
};

/** DESIGN A10 capsule tier colours (none of them is a rarity colour). */
export const TIER_COLOR: Record<CapsuleTier, string> = {
  clay: '#9C6B4A',
  bronze: '#C27C3A',
  silver: '#C9D1DC',
  jade: '#2FBF71',
  // The 2026-09-29 ladder (A10, ui-plan 3.2): champagne Gold, ice Platinum, electric-indigo Aeon
  gold: '#EFE0B0',
  platinum: '#C4F2EA',
  aeon: '#5D3DFF',
};

/** A11 age accents and large-area colours, for UI tints. */
export const AGE_COLOR: Record<AgeId, { main: string; accent: string; light: string }> = {
  stone: { main: '#8C7B68', accent: '#C98A3D', light: '#EDE3C8' },
  medieval: { main: '#6B7682', accent: '#D4A437', light: '#E8DFC8' },
  gunpowder: { main: '#2E5E4E', accent: '#C9A227', light: '#EFE6CF' },
  modern: { main: '#62664A', accent: '#B0306A', light: '#B8A67A' },
  future: { main: '#23262E', accent: '#29E3F5', light: '#3AF0B4' },
  // A17.12
  bronze: { main: '#CDBE9E', accent: '#B8863B', light: '#4F8F7F' },
  industrial: { main: '#5B6168', accent: '#B06A3B', light: '#DCD6C8' },
  cosmic: { main: '#1E1830', accent: '#3FE0B0', light: '#8E44C8' },
};

function Svg(p: IconProps & { children: ComponentChildren; view?: string; tier?: CapsuleTier }) {
  const s = p.size ?? 24;
  return (
    <svg
      class={p.class ? `ui-icon ${p.class}` : 'ui-icon'}
      data-tier={p.tier}
      width={s}
      height={s}
      viewBox={p.view ?? '0 0 24 24'}
      aria-hidden="true"
      focusable="false"
    >
      {p.children}
    </svg>
  );
}

const O = { stroke: OUTLINE, 'stroke-width': 1.6, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };

// ---------------------------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------------------------

export function AmberIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.2 20 7.4v9.2l-8 5.2-8-5.2V7.4z" fill="#d9771a" {...O} />
      <path d="M12 3.6 18.5 8v8L12 20.3 5.5 16V8z" fill="#ffb238" />
      <path d="M12 3.6V12l6.5 4V8z" fill="#ff9a1f" />
      <path d="M12 12 5.5 16l6.5 4.3 6.5-4.3z" fill="#e8841c" />
      <path d="M7.4 8.6 12 5.6" stroke="#fff1c4" stroke-width="1.7" stroke-linecap="round" fill="none" />
      <path d="M12 2.2 20 7.4v9.2l-8 5.2-8-5.2V7.4z" fill="none" {...O} />
    </Svg>
  );
}

export function DustIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 3.5 12 9l-3.5 5L5 9z" fill="#b58cff" {...O} />
      <path d="M16.5 8 19.5 12.5 16.5 17 13.5 12.5z" fill="#8b5cf6" {...O} />
      <path d="M9.5 13.5 12 17.3 9.5 21 7 17.3z" fill="#c9a8ff" {...O} />
      <path d="M8.5 5.6 7 8.6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" />
      <circle cx="18.8" cy="4.5" r="1.3" fill="#fff" />
      <circle cx="4" cy="15" r="1" fill="#e7dcff" />
    </Svg>
  );
}

export function TrophyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 5H3.8v2.4A4 4 0 0 0 7.6 11.4M17.5 5h2.7v2.4a4 4 0 0 1-3.8 4" fill="none" stroke={OUTLINE} stroke-width="2.6" />
      <path d="M6.5 5H3.8v2.4A4 4 0 0 0 7.6 11.4M17.5 5h2.7v2.4a4 4 0 0 1-3.8 4" fill="none" stroke="#ffcf3a" stroke-width="1.2" />
      <path d="M6 3h12v5.5a6 6 0 0 1-12 0z" fill="#ffcf3a" {...O} />
      <path d="M13.5 14h-3l-.6 3.6h4.2z" fill="#d99a1e" {...O} />
      <rect x="7" y="17.4" width="10" height="3.6" rx="1" fill="#b87a12" {...O} />
      <path d="M8.6 5v3.2a3.6 3.6 0 0 0 1.6 3" stroke="#fff5c2" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Navigation and actions
// ---------------------------------------------------------------------------------------------

export function BackIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.8 4.2 7 12l7.8 7.8" fill="none" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M14.8 4.2 7 12l7.8 7.8"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" />
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
    </Svg>
  );
}

export function GearIcon(p: IconProps) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Svg {...p}>
      {teeth.map((a) => (
        <rect key={a} x="10.2" y="1.6" width="3.6" height="5" rx="1" fill="#cfd6e4" {...O} transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="7.4" fill="#cfd6e4" {...O} />
      <circle cx="12" cy="12" r="3" fill="#6b7384" {...O} />
      <path d="M7.4 9.6a5.3 5.3 0 0 1 3.4-2.9" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" />
    </Svg>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 11.2 12 3.5l9 7.7" fill="none" stroke={OUTLINE} stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5.5 10.5V20h13v-9.5L12 5z" fill="#f2c14e" {...O} />
      <rect x="9.8" y="13.5" width="4.4" height="6.5" rx="1" fill="#8e5a2b" {...O} />
      <path d="M3 11.2 12 3.5l9 7.7" fill="none" stroke="#e05a3c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function SwordsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <g>
        <path d="M4 3.5 15 14.5l-1.6 1.6L2.4 5.1V3.5z" fill="#e8eef7" {...O} />
        <path d="M20 3.5 9 14.5l1.6 1.6L21.6 5.1V3.5z" fill="#e8eef7" {...O} />
        <path d="M11.8 16.8 7.4 21.2 5 18.8l4.4-4.4zM12.2 16.8l4.4 4.4 2.4-2.4-4.4-4.4z" fill="#8e5a2b" {...O} />
        <path d="M6.5 12.4 11.6 17.5M17.5 12.4 12.4 17.5" stroke={OUTLINE} stroke-width="3.6" stroke-linecap="round" />
        <path d="M6.5 12.4 11.6 17.5M17.5 12.4 12.4 17.5" stroke="#ffcf3a" stroke-width="1.8" stroke-linecap="round" />
        <path d="M4.3 5 12 12.7" stroke="#fff" stroke-width="1" stroke-linecap="round" />
      </g>
    </Svg>
  );
}

export function ScrollIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4h11.5a2.5 2.5 0 0 1 0 5H17v9a3 3 0 0 1-3 3H5.5a2.5 2.5 0 0 1 0-5H6z" fill="#efe1bd" {...O} />
      <path d="M17.5 4A2.5 2.5 0 0 0 15 6.5V9h2.5" fill="#d9c58f" {...O} />
      <path d="M9 9h5M9 12h5M9 15h3" stroke="#9c7a45" stroke-width="1.6" stroke-linecap="round" />
      <path d="M5.5 16H14a2.5 2.5 0 0 1 0 5" fill="none" stroke={OUTLINE} stroke-width="1.4" />
    </Svg>
  );
}

export function CardsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="11" height="15" rx="2" fill="#22b8cf" {...O} transform="rotate(-10 8.5 12.5)" />
      <rect x="9" y="3.5" width="11" height="15" rx="2" fill="#a855f7" {...O} transform="rotate(8 14.5 11)" />
      <path
        d="M14.8 7.5 16.2 10l2.7.3-2 1.8.6 2.7-2.4-1.4-2.4 1.4.6-2.7-2-1.8 2.7-.3z"
        fill="#ffcf3a"
        stroke={OUTLINE}
        stroke-width="1"
        transform="rotate(8 14.5 11)"
      />
    </Svg>
  );
}

export function RoadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21c2-5 9-3 9-8s-6-4-6-8" fill="none" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" />
      <path d="M4 21c2-5 9-3 9-8s-6-4-6-8" fill="none" stroke="#d9c58f" stroke-width="3" stroke-linecap="round" />
      <path d="M16 3v9" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
      <path d="M16 3.5h5.2l-1.6 2.3 1.6 2.3H16z" fill="#e05a3c" {...O} />
    </Svg>
  );
}

export function CastleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 21V9h3v2h2.5V9h2v2H13V9h2v2h2.5V9h3v12z" fill="#aab4c4" {...O} />
      <path d="M8.5 21v-4a3.5 3.5 0 0 1 7 0v4z" fill="#5a4636" {...O} />
      <path d="M12 3.5v5" stroke={OUTLINE} stroke-width="1.8" stroke-linecap="round" />
      <path d="M12 3.6h5l-1.4 1.6L17 6.8h-5z" fill="#f2c14e" {...O} />
      <path d="M5 11.5v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7" />
    </Svg>
  );
}

export function ProfileIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="4.6" fill="#f6c89b" {...O} />
      <path d="M3.8 21a8.2 8.2 0 0 1 16.4 0z" fill="#2f7df6" {...O} />
      <path d="M7.4 7.4a4.6 4.6 0 0 1 9.2 0c-2.8.6-6.4.6-9.2 0z" fill="#6b3f22" {...O} />
    </Svg>
  );
}

export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" fill="#2f7df6" {...O} />
      <circle cx="12" cy="7.4" r="1.6" fill="#fff" />
      <rect x="10.6" y="10.2" width="2.8" height="7.6" rx="1.2" fill="#fff" />
    </Svg>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke={OUTLINE} stroke-width="4" />
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="#aab4c4" stroke-width="2" />
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="#f2c14e" {...O} />
      <circle cx="12" cy="14.6" r="1.8" fill={OUTLINE} />
      <path d="M12 15.5v2.8" stroke={OUTLINE} stroke-width="1.8" stroke-linecap="round" />
    </Svg>
  );
}

export function StarIcon(p: IconProps & { filled?: boolean }) {
  const filled = p.filled ?? true;
  return (
    <Svg {...p}>
      <path
        d="M12 2.6 14.8 8.4l6.4.8-4.7 4.4 1.2 6.3L12 16.8l-5.7 3.1 1.2-6.3-4.7-4.4 6.4-.8z"
        fill={filled ? '#ffcf3a' : '#3b3760'}
        {...O}
      />
      {filled ? <path d="M9.4 9.4 11.5 5.6" stroke="#fff5c2" stroke-width="1.5" stroke-linecap="round" /> : null}
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        fill="none"
        stroke={OUTLINE}
        stroke-width="5.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}

export function HammerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12.2 10.6 3.8 19a1.8 1.8 0 0 0 2.5 2.5l8.4-8.4z" fill="#a8703f" {...O} />
      <path d="M9.5 6.2 14 1.8l4 1.6 3 3-1.2 2.2-2.8-1.4-4.3 4.3z" fill="#aab4c4" {...O} />
      <path d="M13.2 3.6 16 3.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round" />
    </Svg>
  );
}

export function ArrowUpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 20 12h-4.8v9H8.8v-9H4z" fill="#3cc46b" {...O} />
      <path d="M12 5.4 7.5 10.5" stroke="#c9ffd9" stroke-width="1.4" stroke-linecap="round" />
    </Svg>
  );
}

export function ReplayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" fill="#2f7df6" {...O} />
      <path d="M10 8.3v7.4l6-3.7z" fill="#fff" stroke={OUTLINE} stroke-width="1.2" stroke-linejoin="round" />
    </Svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke={OUTLINE} stroke-width="1.8" stroke-linejoin="round" />
    </Svg>
  );
}

export function PencilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.5 3.8 20.2 8.5 9 19.7 3.6 20.4 4.3 15z" fill="#f2c14e" {...O} />
      <path d="M13.2 6.1 17.9 10.8" stroke={OUTLINE} stroke-width="1.6" />
      <path d="M4.3 15 9 19.7 3.6 20.4z" fill="#f6c89b" {...O} />
    </Svg>
  );
}

export function RefreshIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" />
      <path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      <path d="M20.5 3.5v5.6h-5.6z" fill="currentColor" {...O} />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.3" fill="#e8eef7" {...O} />
      <path d="M12 6.5V12l3.6 2.4" fill="none" stroke={OUTLINE} stroke-width="2.2" stroke-linecap="round" />
    </Svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" fill="#fff" {...O} />
      <path d="M3.5 7.4A2.4 2.4 0 0 1 5.9 5h12.2a2.4 2.4 0 0 1 2.4 2.4V10h-17z" fill="#e05a3c" {...O} />
      <path d="M8 3v4M16 3v4" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
      <path d="M9.5 13.5 11.5 15.5 15 12" fill="none" stroke="#3cc46b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v11M7 10l5 5 5-5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 3v11M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 15V4M7 8.5l5-5 5 5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M12 15V4M7 8.5l5-5 5 5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke={OUTLINE} stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 17.5v2.5h16v-2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function CopyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="8" y="8" width="12" height="13" rx="2" fill="#e8eef7" {...O} />
      <path d="M16 6V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" fill="none" {...O} stroke-width="2" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 7.5h13l-1.2 12.6a1.6 1.6 0 0 1-1.6 1.4H8.3a1.6 1.6 0 0 1-1.6-1.4z" fill="#e8eef7" {...O} />
      <rect x="3.5" y="4.6" width="17" height="3" rx="1.2" fill="#e05a3c" {...O} />
      <path d="M9.6 4.6V3h4.8v1.6M10 11v7M14 11v7" fill="none" stroke={OUTLINE} stroke-width="1.6" stroke-linecap="round" />
    </Svg>
  );
}

export function SpeakerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 9h4l5-4.5v15l-5-4.5h-4z" fill="#e8eef7" {...O} />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke={OUTLINE} stroke-width="3.6" stroke-linecap="round" />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </Svg>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="#e8eef7" {...O} />
      <circle cx="12" cy="12" r="3.6" fill="#2f7df6" {...O} />
      <circle cx="13.2" cy="10.8" r="1" fill="#fff" />
    </Svg>
  );
}

export function FlagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 21V3" stroke={OUTLINE} stroke-width="2.4" stroke-linecap="round" />
      <path d="M5.5 3.6h13l-3 4.2 3 4.2h-13z" fill="#f2f2f2" {...O} />
    </Svg>
  );
}

/** Customize (skins and looks): a paint brush over a palette. */
export function BrushIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c5 0 9 3.4 9 7.6 0 2.4-1.9 3.4-3.6 3.4h-1.6c-1.2 0-1.8 1.3-1.1 2.2.9 1.2.1 3.8-2.7 3.8-5 0-9-3.8-9-8.5S7 3.5 12 3.5z" fill="#f2d7a6" {...O} />
      <circle cx="7.6" cy="10.4" r="1.6" fill="#e05a3c" stroke={OUTLINE} stroke-width="1" />
      <circle cx="11" cy="7.2" r="1.6" fill="#ffcf3a" stroke={OUTLINE} stroke-width="1" />
      <circle cx="15.2" cy="7.8" r="1.6" fill="#22b8cf" stroke={OUTLINE} stroke-width="1" />
      <circle cx="8.4" cy="14.6" r="1.6" fill="#a855f7" stroke={OUTLINE} stroke-width="1" />
      <path d="m21.5 12.5-6.8 6.8" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round" />
      <path d="M14.9 19.1c-.9.9-2.6 1.4-3.4 1.4.1-.9.5-2.4 1.4-3.3.6-.6 1.5-.6 2 0 .5.5.5 1.3 0 1.9z" fill="#3a8ee0" {...O} />
    </Svg>
  );
}

export function CrownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8.5 7.5 12 12 4.5 16.5 12 21 8.5l-2 10.5H5z" fill="#ffcf3a" {...O} />
      <rect x="4.8" y="17.4" width="14.4" height="3" rx="1" fill="#d99a1e" {...O} />
      <circle cx="12" cy="13.8" r="1.6" fill="#e05a3c" stroke={OUTLINE} stroke-width="1" />
      <path d="M8.2 14.2 7.4 16" stroke="#fff5c2" stroke-width="1.3" stroke-linecap="round" />
    </Svg>
  );
}

export function ShieldBrokenIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.8 20 5.6v6c0 5-3.6 8.4-8 10-4.4-1.6-8-5-8-10v-6z" fill="#8e97ab" {...O} />
      <path d="M12 2.8 10.2 9l3 2.4-2 4.2 1 6" fill="none" stroke={OUTLINE} stroke-width="2" stroke-linejoin="round" />
    </Svg>
  );
}

export function ScalesIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v17M7 20.5h10M4.5 7h15" stroke={OUTLINE} stroke-width="2.2" stroke-linecap="round" />
      <path d="M2.5 13.5 5 7l2.5 6.5a2.5 2.5 0 0 1-5 0zM16.5 13.5 19 7l2.5 6.5a2.5 2.5 0 0 1-5 0z" fill="#ffcf3a" {...O} />
    </Svg>
  );
}

/** Robot face: shown with the "AI" chip on every bot nameplate (DESIGN A7.1). */
export function RobotIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5v3" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="2.6" r="1.6" fill="#e05a3c" stroke={OUTLINE} stroke-width="1.2" />
      <rect x="4" y="6" width="16" height="13" rx="3.4" fill="#cfd6e4" {...O} />
      <rect x="6.6" y="9" width="10.8" height="5.6" rx="2.2" fill="#2a3552" {...O} />
      <circle cx="9.6" cy="11.8" r="1.4" fill="#5ff2ff" />
      <circle cx="14.4" cy="11.8" r="1.4" fill="#5ff2ff" />
      <path d="M9 17h6" stroke={OUTLINE} stroke-width="1.6" stroke-linecap="round" />
      <path d="M2.5 11v3.5M21.5 11v3.5" stroke={OUTLINE} stroke-width="2.4" stroke-linecap="round" />
    </Svg>
  );
}

export function BoltIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.5 2 4.5 13.5h6L9 22l10-12.5h-6.2z" fill="#ffcf3a" {...O} />
      <path d="M12.4 4.8 8 10.6" stroke="#fff5c2" stroke-width="1.4" stroke-linecap="round" />
    </Svg>
  );
}

export function TowerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 21 7.4 9h9.2L18 21z" fill="#aab4c4" {...O} />
      <path d="M5.5 5h2.2v2h2.1V5h4.4v2h2.1V5h2.2v4h-13z" fill="#cfd6e4" {...O} />
      <path d="M10.2 21v-4a1.8 1.8 0 0 1 3.6 0v4z" fill="#5a4636" {...O} />
      <rect x="10.8" y="11.2" width="2.4" height="3" rx="1" fill={OUTLINE} />
    </Svg>
  );
}

export function CoinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12.8" r="9.5" fill="#b87a12" {...O} />
      <circle cx="12" cy="11.4" r="9" fill="#ffcf3a" {...O} />
      <circle cx="12" cy="11.4" r="5.6" fill="none" stroke="#d99a1e" stroke-width="1.6" />
      <path d="M8.2 7.6a6 6 0 0 1 4.8-2" stroke="#fff5c2" stroke-width="1.6" fill="none" stroke-linecap="round" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Roles (used as card art fallback and filters)
// ---------------------------------------------------------------------------------------------

export type GlyphKind = RoleGroup | 'turret' | 'power';

/** Maps a unit role to its role-group glyph (A2.6). */
export function roleGlyph(role: Role, group: RoleGroup): GlyphKind {
  if (group !== 'epic' && group !== 'legendary') return group;
  switch (role) {
    case 'infantry':
    case 'skirmisher':
      return 'infantry';
    case 'ranged':
    case 'artillery':
    case 'airGunship':
      return 'ranged';
    case 'antiArmor':
    case 'antiMech':
      return 'antiArmor';
    case 'support':
      return 'support';
    default:
      return 'heavy';
  }
}

export function RoleGlyph(p: IconProps & { kind: GlyphKind; color?: string }) {
  const c = p.color ?? '#f4ecd8';
  switch (p.kind) {
    case 'infantry':
      return (
        <Svg {...p}>
          <path d="M16.5 3 21 3v4.5L10 18.5 5.5 14z" fill={c} {...O} />
          <path d="M4 14.5 9.5 20M3 21l3.4-3.4" stroke={OUTLINE} stroke-width="3" stroke-linecap="round" />
          <path d="M4 14.5 9.5 20" stroke="#ffcf3a" stroke-width="1.4" stroke-linecap="round" />
        </Svg>
      );
    case 'ranged':
      return (
        <Svg {...p}>
          <path d="M6 3c9 2 13 8 15 15" fill="none" stroke={OUTLINE} stroke-width="4.2" stroke-linecap="round" />
          <path d="M6 3c9 2 13 8 15 15" fill="none" stroke={c} stroke-width="2.2" stroke-linecap="round" />
          <path d="M6 3 21 18" stroke={OUTLINE} stroke-width="1.2" />
          <path d="M3 21 16 8" stroke={OUTLINE} stroke-width="2.6" stroke-linecap="round" />
          <path d="M16 8l1.2-3.4L20 7.4 16.8 8.6z" fill="#ffcf3a" {...O} stroke-width="1.2" />
        </Svg>
      );
    case 'heavy':
      return (
        <Svg {...p}>
          <path d="M12 2.8 20 5.6v6c0 5-3.6 8.4-8 10-4.4-1.6-8-5-8-10v-6z" fill={c} {...O} />
          <path d="M12 5.6v13.2M7 10.5h10" stroke={OUTLINE} stroke-width="1.8" stroke-linecap="round" />
        </Svg>
      );
    case 'antiArmor':
      return (
        <Svg {...p}>
          {/* Anti-heavy: the Heavy shield split by a spear (owner feedback 2026-09-29). */}
          <path d="M10.6 3.2 4.2 5.5v6.1c0 4.7 2.9 8 6.4 9.6z" fill={c} {...O} transform="rotate(-9 10.6 21.2)" />
          <path d="M13.4 3.2l6.4 2.3v6.1c0 4.7-2.9 8-6.4 9.6z" fill={c} {...O} transform="rotate(9 13.4 21.2)" />
          <path d="M12 1.5v14.2" stroke={OUTLINE} stroke-width="3.2" stroke-linecap="round" />
          <path d="M12 1.5v14.2" stroke="#a8703f" stroke-width="1.4" stroke-linecap="round" />
          <path d="M12 22.8l-2.7-7.4h5.4z" fill="#ffcf3a" {...O} />
        </Svg>
      );
    case 'support':
      return (
        <Svg {...p}>
          <path d="M9 3.5h6v5.5h5.5v6H15v5.5H9V15H3.5V9H9z" fill={c} {...O} />
          <path d="M10.4 5v5.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8" />
        </Svg>
      );
    case 'epic':
      return <StarIcon {...p} />;
    case 'legendary':
      return <CrownIcon {...p} />;
    case 'turret':
      return <TowerIcon {...p} />;
    case 'power':
      return <BoltIcon {...p} />;
  }
}

// ---------------------------------------------------------------------------------------------
// Ages
// ---------------------------------------------------------------------------------------------

export function AgeGlyph(p: IconProps & { age: AgeId }) {
  switch (p.age) {
    case 'stone':
      return (
        <Svg {...p}>
          <path d="M5 20.5 12.5 9" stroke={OUTLINE} stroke-width="4.2" stroke-linecap="round" />
          <path d="M5 20.5 12.5 9" stroke="#a8703f" stroke-width="2.2" stroke-linecap="round" />
          <path d="M11 4.5c3-2 7.5-.5 8.5 3s-1.5 6-4.5 5.5-6.5-5-4-8.5z" fill="#8c7b68" {...O} />
          <circle cx="14.6" cy="6.6" r="1" fill="#c9b8a3" />
        </Svg>
      );
    case 'bronze':
      // A crested bronze helmet (Hellas).
      return (
        <Svg {...p}>
          <path d="M6 13.5c0-4.6 2.7-7.5 6-7.5s6 2.9 6 7.5v6.5h-3.2v-4.2H9.2V20H6z" fill="#c68a3c" {...O} />
          <path d="M9.2 15.8V12h5.6v3.8" fill="#3a2a1c" {...O} stroke-width="1.2" />
          <path d="M5.5 6.5C8 2.8 16 2.8 18.5 6.5" fill="none" stroke={OUTLINE} stroke-width="4" stroke-linecap="round" />
          <path d="M5.5 6.5C8 2.8 16 2.8 18.5 6.5" fill="none" stroke="#b0302a" stroke-width="2.2" stroke-linecap="round" />
          <path d="M8 10c.6-1.6 1.8-2.6 3.2-3" stroke="#f3cf8a" stroke-width="1.3" stroke-linecap="round" fill="none" />
        </Svg>
      );
    case 'industrial':
      // A factory gear with a smokestack.
      return (
        <Svg {...p}>
          <path d="M15 3h3v8h-3z" fill="#5d4a3e" {...O} />
          <path
            d="M12 7.2l1.4.3.6-1.3 1.6.9-.5 1.3 1 1 1.3-.5.9 1.6-1.3.6.3 1.4-.3 1.4 1.3.6-.9 1.6-1.3-.5-1 1 .5 1.3-1.6.9-.6-1.3-1.4.3-1.4-.3-.6 1.3-1.6-.9.5-1.3-1-1-1.3.5-.9-1.6 1.3-.6-.3-1.4.3-1.4-1.3-.6.9-1.6 1.3.5 1-1-.5-1.3 1.6-.9.6 1.3z"
            fill="#8a8f98"
            {...O}
            stroke-width="1.2"
          />
          <circle cx="12" cy="14.2" r="2.4" fill="#3a3f45" {...O} stroke-width="1.2" />
        </Svg>
      );
    case 'cosmic':
      // A ringed planet and a star.
      return (
        <Svg {...p}>
          <circle cx="11" cy="13" r="6" fill="#7a55d8" {...O} />
          <ellipse cx="11" cy="13" rx="10" ry="3" fill="none" stroke={OUTLINE} stroke-width="3" transform="rotate(-18 11 13)" />
          <ellipse cx="11" cy="13" rx="10" ry="3" fill="none" stroke="#ffd466" stroke-width="1.4" transform="rotate(-18 11 13)" />
          <path d="M19 2.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fff4c4" {...O} stroke-width="0.9" />
          <path d="M8.4 10.4a3.4 3.4 0 0 1 2.4-1.4" stroke="#d9c8ff" stroke-width="1.2" stroke-linecap="round" fill="none" />
        </Svg>
      );
    case 'medieval':
      return (
        <Svg {...p}>
          <path d="M5 21V7.5h2.5v2h2.2v-2h4.6v2h2.2v-2H19V21z" fill="#6b7682" {...O} />
          <path d="M9.8 21v-3.8a2.2 2.2 0 0 1 4.4 0V21z" fill="#3a2f28" {...O} />
          <path d="M12 2.5v5" stroke={OUTLINE} stroke-width="1.6" />
          <path d="M12 2.6h4.4l-1.2 1.4 1.2 1.4H12z" fill="#8e2a4a" {...O} stroke-width="1.2" />
          <rect x="11" y="11" width="2" height="2.6" rx=".8" fill="#d4a437" />
        </Svg>
      );
    case 'gunpowder':
      return (
        <Svg {...p}>
          <path d="M3.5 10.5 17.5 5.2l1.5 4.4-13.8 5.2z" fill="#4a3b2e" {...O} />
          <rect x="17" y="4" width="3.4" height="6.6" rx="1" fill="#c9a227" {...O} transform="rotate(-20 18.7 7.3)" />
          <circle cx="9" cy="16.5" r="4" fill="#8e5a2b" {...O} />
          <circle cx="9" cy="16.5" r="1.4" fill="#c9a227" {...O} stroke-width="1" />
          <path d="M2.5 20.5h13" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
        </Svg>
      );
    case 'modern':
      return (
        <Svg {...p}>
          <path d="M3.5 15.5a8.5 8.5 0 0 1 17 0z" fill="#62664a" {...O} />
          <path d="M2 15.5h20v2.4H2z" fill="#3a3f45" {...O} />
          <path d="M7 12a5.4 5.4 0 0 1 4-4.5" stroke="#b8a67a" stroke-width="1.6" fill="none" stroke-linecap="round" />
          <rect x="10.5" y="12.2" width="3" height="2" rx=".6" fill="#b0306a" />
        </Svg>
      );
    case 'future':
      return (
        <Svg {...p}>
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke={OUTLINE} stroke-width="3.2" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#29e3f5" stroke-width="1.4" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke={OUTLINE} stroke-width="3.2" transform="rotate(-30 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#f03aa8" stroke-width="1.4" transform="rotate(-30 12 12)" />
          <circle cx="12" cy="12" r="3.2" fill="#3af0b4" {...O} />
        </Svg>
      );
  }
}

// ---------------------------------------------------------------------------------------------
// Capsules, crates, rarity gems
// ---------------------------------------------------------------------------------------------

/**
 * The ladder the drum icon draws, lowest first. It mirrors `content.capsules.tierOrder` (the UI draws
 * without the content tables; a test keeps the two equal, as `src/capsule/tiers.ts` does).
 */
export const TIER_LADDER: readonly CapsuleTier[] = ['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon'];
/**
 * The drum carves 5 rings (A10): tiers up to `capsules.summitAbove` light rings 1 to index + 1, and
 * each tier above it adds one summit gem in the cap band. A test keeps `DRUM_RINGS - 1` equal to the
 * index of `summitAbove`.
 */
export const DRUM_RINGS = 5;

/** Tier material ramps (highlight, key, mid-tone, shadow); DESIGN A10 and the 2026-09-29 ladder spec. */
const TIER_RAMP: Record<CapsuleTier, readonly [string, string, string, string]> = {
  clay: ['#CFA283', '#9C6B4A', '#7E5238', '#553423'],
  bronze: ['#EDB57A', '#C27C3A', '#9C5F27', '#6A3E19'],
  silver: ['#F5F8FB', '#C9D1DC', '#A3ADBB', '#6C7584'],
  jade: ['#96EDBB', '#2FBF71', '#22955A', '#155F39'],
  gold: ['#FFF6DC', '#EFE0B0', '#BCA45A', '#6B5A2A'],
  platinum: ['#F2FFFC', '#C4F2EA', '#A6D4CD', '#7E9E99'],
  aeon: ['#B8AAFF', '#5D3DFF', '#3A2A9E', '#241C4A'],
};
/** What fills a drum's ring grooves: lapis enamel on Gold, dark carving elsewhere. */
const GROOVE: Partial<Record<CapsuleTier, string>> = { gold: '#2B4C9B' };
/** Surface finish: brushed streaks on platinum, a drifting starfield in the Aeon time crystal. */
const FINISH: Partial<Record<CapsuleTier, 'brushed' | 'stars'>> = { platinum: 'brushed', aeon: 'stars' };
/** Every tier icon's outer contour (WCAG 1.4.11: the Aeon fill alone is under 3:1 on the surfaces). */
const PARCHMENT = '#F4ECD8';
/** The Legendary crest: the Legendary star on a dark enamel shield (the one rarity colour on a capsule). */
const CREST_SHIELD = '#1D1405';

// The drum's geometry in its 40 × 40 view: a cylinder (rx 13, ry 3.8) with the cap's top face at
// y 8, the stone cap band 8-11.5 (summit gems), the brass band 11.5-16 (crests) and the body 16-32
// (5 carved rings).
const RX = 13;
const RY = 3.8;
const SILHOUETTE = `M7 8V32A${RX} ${RY} 0 0 0 33 32V8A${RX} ${RY} 0 0 0 7 8Z`;
const band = (y1: number, y2: number) => `M7 ${y1}V${y2}A${RX} ${RY} 0 0 0 33 ${y2}V${y1}A${RX} ${RY} 0 0 1 7 ${y1}Z`;
/** The front arc's drop below the band line at x (0 at the rim, RY at the centre). */
const arcDrop = (x: number) => RY * Math.sqrt(Math.max(0, 1 - ((x - 20) / RX) ** 2));
const RING_Y = [30.6, 27.3, 24, 20.7, 17.4];
const star = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';
const spread = (n: number, gap: number) => Array.from({ length: n }, (_, i) => 20 + (i - (n - 1) / 2) * gap);

/**
 * The capsule drum of A10 in its tier's material (ui-plan 3.5; the 2026-09-29 ladder).
 *
 * From 32 px: carved stone and brass with 5 rings; the rings up to the tier are lit, each in its own
 * tier's colour (bottom-up: clay, bronze, silver, jade, gold); tiers above the summit add 1-2 summit
 * gems in the cap band; `crests` stamps that many Legendary crests on the brass band. Below 32 px: a
 * flat silhouette in the tier colour with a "★n" crest badge beside it. Nothing is drawn for a ring,
 * gem or crest that is not earned beyond the carved drum itself, and every size carries a 1.5 px
 * parchment outline.
 *
 * `crests`: set it only for a fixed-tier capsule or one already opened (from its guarantees; see
 * `capsuleLook.ts`). An unopened climbing capsule shows its start tier and never gets crests.
 */
export function CapsuleIcon(p: IconProps & { tier: CapsuleTier; crests?: number }) {
  const size = p.size ?? 24;
  const k = 40 / size; // view units per CSS pixel
  const ink = Math.min(3, Math.max(1.5, size / 16)) * k;
  const rim = ink + 3 * k; // the parchment band shows 1.5 px outside the dark outline
  const ramp = TIER_RAMP[p.tier];
  const idx = Math.max(0, TIER_LADDER.indexOf(p.tier));
  const crests = Math.max(0, Math.min(3, p.crests ?? 0));
  const gid = `cap-body-${p.tier}`;
  const body = (
    <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color={ramp[3]} />
      <stop offset=".18" stop-color={ramp[2]} />
      <stop offset=".38" stop-color={ramp[1]} />
      <stop offset=".47" stop-color={ramp[0]} />
      <stop offset=".58" stop-color={ramp[1]} />
      <stop offset=".84" stop-color={ramp[2]} />
      <stop offset="1" stop-color={ramp[3]} />
    </linearGradient>
  );

  if (size < 32) {
    const svg = (
      <Svg {...p} view="0 0 40 40">
        <defs>{body}</defs>
        <path d={SILHOUETTE} fill="none" stroke={PARCHMENT} stroke-opacity=".6" stroke-width={rim} stroke-linejoin="round" />
        <path d={SILHOUETTE} fill={`url(#${gid})`} stroke={OUTLINE} stroke-width={ink} stroke-linejoin="round" />
        <ellipse cx="20" cy="8" rx={RX} ry={RY} fill={ramp[0]} stroke={OUTLINE} stroke-width={ink * 0.7} />
      </Svg>
    );
    if (crests === 0) return svg;
    return (
      <span class="ui-capicon">
        {svg}
        <CrestBadge n={crests} />
      </span>
    );
  }

  const lit = Math.min(idx, DRUM_RINGS - 1) + 1;
  const summit = Math.max(0, idx - (DRUM_RINGS - 1));
  const groove = GROOVE[p.tier] ?? OUTLINE;
  const line = ink * 0.55;
  return (
    <Svg {...p} view="0 0 40 40">
      <defs>
        {body}
        <linearGradient id="cap-brass" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#6b5018" />
          <stop offset=".4" stop-color="#d9b560" />
          <stop offset=".5" stop-color="#f3dc95" />
          <stop offset=".62" stop-color="#c49a3e" />
          <stop offset="1" stop-color="#5e4614" />
        </linearGradient>
        <linearGradient id="cap-stone" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#4a4640" />
          <stop offset=".45" stop-color="#9d968a" />
          <stop offset="1" stop-color="#3f3b35" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="36.2" rx="14.5" ry="2.6" fill="#000" opacity=".28" />
      <path d={SILHOUETTE} fill="none" stroke={PARCHMENT} stroke-opacity=".6" stroke-width={rim} stroke-linejoin="round" />
      <path d={SILHOUETTE} fill={`url(#${gid})`} stroke={OUTLINE} stroke-width={ink} stroke-linejoin="round" />
      {/* Material: a drifting starfield on the time crystal, brushed streaks on platinum. */}
      {FINISH[p.tier] === 'stars'
        ? [
            [11.5, 22],
            [15, 29.5],
            [26.5, 20.5],
            [29, 27.5],
            [22.5, 33],
            [18, 24.5],
          ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 0.55 : 0.8} fill="#fff" opacity=".85" />)
        : null}
      {FINISH[p.tier] === 'brushed' ? (
        <path d="M10.5 30.5 15 18.5M24 33.5 29.5 19.5" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".55" />
      ) : null}
      {/* Rings, bottom-up: lit ones glow in their own tier's colour, the rest are carved grooves. */}
      {RING_Y.map((y, i) => {
        const d = `M7.6 ${y}A${RX} ${RY} 0 0 0 32.4 ${y}`;
        const cut = (
          <>
            <path d={d} fill="none" stroke={groove} stroke-width=".9" opacity=".5" />
            <path d={`M7.8 ${y + 0.75}A${RX} ${RY} 0 0 0 32.2 ${y + 0.75}`} fill="none" stroke="#fff" stroke-width=".45" opacity=".22" />
          </>
        );
        if (i >= lit) return <g key={i}>{cut}</g>;
        const c = TIER_RAMP[TIER_LADDER[i] ?? p.tier][1];
        return (
          <g key={i} class="ui-capicon__ring">
            {cut}
            <path d={d} fill="none" stroke={groove} stroke-width="1.7" opacity=".55" />
            <path d={d} fill="none" stroke={c} stroke-width=".95" />
            <circle cx="20" cy={y + RY} r="1.35" fill={c} stroke={OUTLINE} stroke-width=".55" />
            <circle cx="19.6" cy={y + RY - 0.45} r=".42" fill="#fff" opacity=".85" />
          </g>
        );
      })}
      <path d="M10.5 18.5v10" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".35" />
      {/* The brass band (crests) and the stone cap band (summit gems). */}
      <path d={band(11.5, 16)} fill="url(#cap-brass)" stroke={OUTLINE} stroke-width={line} />
      <path d={band(8, 11.5)} fill="url(#cap-stone)" stroke={OUTLINE} stroke-width={line} />
      <ellipse cx="20" cy="8" rx={RX} ry={RY} fill="#b9b2a3" stroke={OUTLINE} stroke-width={ink * 0.8} />
      <ellipse cx="20" cy="8" rx="7.5" ry="2" fill={ramp[1]} stroke={OUTLINE} stroke-width={line} />
      <ellipse cx="18" cy="7.6" rx="3" ry=".6" fill="#fff" opacity=".45" />
      {spread(summit, 7).map((x, g) => {
        const y = 9.75 + arcDrop(x);
        const c = TIER_RAMP[TIER_LADDER[DRUM_RINGS + g] ?? p.tier][1];
        return (
          <g key={`s${g}`} class="ui-capicon__summit">
            <path d={`M${x} ${y - 2.1}L${x + 2.1} ${y}L${x} ${y + 2.1}L${x - 2.1} ${y}Z`} fill={c} stroke={OUTLINE} stroke-width={line} stroke-linejoin="round" />
            <path d={`M${x - 0.9} ${y - 0.2}L${x} ${y - 1.2}`} stroke="#fff" stroke-width=".6" stroke-linecap="round" />
          </g>
        );
      })}
      {spread(crests, 6.6).map((x, c) => {
        const y = 13.6 + arcDrop(x);
        return (
          <g key={`c${c}`} class="ui-capicon__crestmark">
            <path
              d={`M${x - 2.2} ${y - 2.1}h4.4v2.2q0 1.9-2.2 2.8q-2.2-.9-2.2-2.8z`}
              fill={CREST_SHIELD}
              stroke={PARCHMENT}
              stroke-width={Math.max(0.45, line * 0.7)}
              stroke-linejoin="round"
            />
            <path d={star(x, y - 0.3, 1.55)} fill={RARITY_COLOR.legendary} />
          </g>
        );
      })}
    </Svg>
  );
}

/** The "★n" crest badge: n guaranteed Legendaries (the small form of the drum's crests). */
export function CrestBadge(p: { n: number }) {
  return (
    <span class="ui-capicon__crest" aria-hidden="true">
      ★{p.n}
    </span>
  );
}

/** One Legendary crest: the Legendary star on its dark enamel shield with a white-gold rim. */
export function CrestIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 3.5h14v7.2c0 5.4-3.6 8.2-7 9.8-3.4-1.6-7-4.4-7-9.8z" fill={CREST_SHIELD} stroke={PARCHMENT} stroke-width="1.5" stroke-linejoin="round" />
      <path d={star(12, 11, 5.2)} fill={RARITY_COLOR.legendary} />
    </Svg>
  );
}

export function CrateIcon(p: IconProps) {
  return (
    <Svg {...p} view="0 0 40 40">
      <ellipse cx="20" cy="34" rx="14" ry="3" fill="#000" opacity=".25" />
      <path d="M5 13 20 7l15 6v16l-15 6-15-6z" fill="#b0763f" stroke={OUTLINE} stroke-width="2" stroke-linejoin="round" />
      <path d="M5 13l15 6 15-6M20 19v16" fill="none" stroke={OUTLINE} stroke-width="2" stroke-linejoin="round" />
      <path d="M20 19v16l15-6V13z" fill="#8e5a2b" stroke={OUTLINE} stroke-width="2" stroke-linejoin="round" />
      <path d="M8 16.5l9 3.6M8 22.5l9 3.6M23 20.2l9-3.6M23 26.2l9-3.6" stroke="#6b3f22" stroke-width="1.6" />
      <path d="M16 4.5h8l-2 3h-4z" fill="#a855f7" stroke={OUTLINE} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M20 7 12 10.3" stroke="#f0c98c" stroke-width="1.4" stroke-linecap="round" />
    </Svg>
  );
}

/**
 * Rarity gems (ui-plan 3.5): the shape carries the rarity without colour (A3): Common a circle, Rare
 * a rhombus, Epic a hexagon, Legendary a five-point star, each in its A10 colour.
 */
export function RarityGem(p: IconProps & { rarity: Rarity }) {
  const c = RARITY_COLOR[p.rarity];
  return (
    <Svg {...p}>
      {p.rarity === 'common' ? (
        <>
          <circle cx="12" cy="12" r="7.6" fill={c} {...O} />
          <path d="M8.6 9.6a4.2 4.2 0 0 1 3-2.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none" />
        </>
      ) : p.rarity === 'rare' ? (
        <>
          <path d="M12 2.8 20.2 12 12 21.2 3.8 12z" fill={c} {...O} />
          <path d="M3.8 12h16.4M12 2.8v18.4" stroke={OUTLINE} stroke-width="0.9" opacity=".45" />
          <path d="M7.2 11 11 6.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
        </>
      ) : p.rarity === 'epic' ? (
        <>
          <path d="M12 2.6 20.2 7.3v9.4L12 21.4l-8.2-4.7V7.3z" fill={c} {...O} />
          <path d="M12 7.2 16.1 9.6v4.8L12 16.8l-4.1-2.4V9.6z" fill="none" stroke={OUTLINE} stroke-width="0.9" opacity=".5" />
          <path d="M6.2 8.8 11 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
        </>
      ) : (
        <>
          <path d="M12 2.4 14.8 8.6l6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" fill={c} {...O} />
          <path d="M9.6 8.9 12 4.8" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
        </>
      )}
    </Svg>
  );
}

/** Undo (a curved arrow back), for the Army header (ui-plan 4.2). */
export function UndoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 9H15a5 5 0 0 1 0 10h-4" fill="none" stroke={OUTLINE} stroke-width="4.2" stroke-linecap="round" />
      <path d="M8.5 9H15a5 5 0 0 1 0 10h-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
      <path d="M9.5 3.8 3.8 9l5.7 5.2z" fill="currentColor" {...O} />
    </Svg>
  );
}

/** Filter (a funnel), for grids with filters and sort (ui-plan 3.5 "System"). */
export function FilterIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 4.5h17l-6.6 7.8v6.4l-3.8 2v-8.4z" fill="currentColor" {...O} />
      <path d="M6.5 6.5h6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".7" />
    </Svg>
  );
}

/** Who beats whom: three class discs on a ring of arrows (the counter legend, ui-plan 4.2). */
export function CountersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.8 5.6 17.6 12M16 16.9H8M6.4 12l3.8-6.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="12" cy="4.6" r="3" fill="#E69F00" {...O} />
      <circle cx="18.6" cy="16.8" r="3" fill="#0072B2" {...O} />
      <circle cx="5.4" cy="16.8" r="3" fill="#D55E00" {...O} />
    </Svg>
  );
}
