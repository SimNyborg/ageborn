/**
 * Meta UI icons as inline SVG in the A11 cartoon style: flat fills, one highlight, and a dark
 * outline (never pure black). No emoji and no external requests. One module, so a later art pass can
 * swap every icon in one place. All icons are decorative (`aria-hidden`); the text next to them, or
 * the button's `aria-label`, carries the meaning.
 */
import type { AgeId, CapsuleTier, Rarity, Role, RoleGroup } from '@/contracts';
import type { ComponentChildren } from 'preact';

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
  aeon: '#8B5CF6',
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

function Svg(p: IconProps & { children: ComponentChildren; view?: string }) {
  const s = p.size ?? 24;
  return (
    <svg
      class={p.class ? `ui-icon ${p.class}` : 'ui-icon'}
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
          <path d="M3.5 20.5 17 7" stroke={OUTLINE} stroke-width="3.2" stroke-linecap="round" />
          <path d="M3.5 20.5 17 7" stroke="#a8703f" stroke-width="1.4" stroke-linecap="round" />
          <path d="M21.2 2.8 19.6 10l-2.2-1.6-1.8-1.8L14 4.4z" fill={c} {...O} />
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

/** The capsule drum of A10 (carved stone and brass, 5 age rings) in its tier colour. */
export function CapsuleIcon(p: IconProps & { tier: CapsuleTier }) {
  const c = TIER_COLOR[p.tier];
  const gid = `cap-${p.tier}`;
  return (
    <Svg {...p} view="0 0 40 40">
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color={c} stop-opacity=".75" />
          <stop offset=".35" stop-color="#fff" stop-opacity=".55" />
          <stop offset=".5" stop-color={c} />
          <stop offset="1" stop-color={c} stop-opacity=".6" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="33" rx="13" ry="3.5" fill="#000" opacity=".25" />
      <path d="M7 11v17c0 3 6 5 13 5s13-2 13-5V11z" fill={c} stroke={OUTLINE} stroke-width="2" />
      <path d="M7 11v17c0 3 6 5 13 5s13-2 13-5V11z" fill={`url(#${gid})`} opacity=".7" />
      {[15, 19, 23, 27].map((y) => (
        <path key={y} d={`M7 ${y}c0 2.6 6 4.4 13 4.4s13-1.8 13-4.4`} fill="none" stroke="#c9a227" stroke-width="1.6" />
      ))}
      <ellipse cx="20" cy="11" rx="13" ry="4.4" fill="#e8d9a8" stroke={OUTLINE} stroke-width="2" />
      <ellipse cx="20" cy="11" rx="7" ry="2.2" fill={c} stroke={OUTLINE} stroke-width="1.4" />
      <path d="M11 16v8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55" />
      {p.tier === 'aeon' ? <ellipse cx="20" cy="11" rx="13" ry="4.4" fill="none" stroke="#f5d060" stroke-width="1.4" /> : null}
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

export function RarityGem(p: IconProps & { rarity: Rarity }) {
  const c = RARITY_COLOR[p.rarity];
  return (
    <Svg {...p}>
      <path d="M12 3 20 10 12 21 4 10z" fill={c} {...O} />
      <path d="M4 10h16M9 10l3-7 3 7-3 11z" fill="none" stroke={OUTLINE} stroke-width="1" opacity=".55" />
      <path d="M7.4 9.2 10 5.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
    </Svg>
  );
}
