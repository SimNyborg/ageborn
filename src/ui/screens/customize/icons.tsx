/** Small tab icons of the Customize screen (A11 cartoon style, ink outline; decorative). */
import type { ComponentChildren } from 'preact';
import { OUTLINE } from '../../components/icons';

const S = (p: { size?: number; children: ComponentChildren }) => (
  <svg viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22} aria-hidden="true" focusable="false">
    {p.children}
  </svg>
);

export function SmileTabIcon(p: { size?: number }) {
  return (
    <S size={p.size}>
      <circle cx="12" cy="12.5" r="9" fill="#ffd447" stroke={OUTLINE} stroke-width="1.6" />
      <circle cx="9" cy="11" r="1.2" fill={OUTLINE} />
      <circle cx="15" cy="11" r="1.2" fill={OUTLINE} />
      <path d="M8.6 14.6c1.8 2.4 5 2.4 6.8 0" fill="none" stroke={OUTLINE} stroke-width="1.5" stroke-linecap="round" />
    </S>
  );
}

export function QuoteTabIcon(p: { size?: number }) {
  return (
    <S size={p.size}>
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fffbe6" stroke={OUTLINE} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M7 9h10M7 12.5h6" stroke={OUTLINE} stroke-width="1.5" stroke-linecap="round" />
    </S>
  );
}

export function StatueTabIcon(p: { size?: number }) {
  return (
    <S size={p.size}>
      <path d="M6 21h12v-3H6z" fill="#b9b2a6" stroke={OUTLINE} stroke-width="1.5" stroke-linejoin="round" />
      <path d="M12 3c-3 3-5 5.4-5 8.4A5 5 0 0 0 12 16a5 5 0 0 0 5-4.6C17 8.4 15 6 12 3z" fill="#ff8a2b" stroke={OUTLINE} stroke-width="1.5" stroke-linejoin="round" />
      <path d="M12 8.6c-1.4 1.5-2.2 2.6-2.2 3.8a2.2 2.2 0 0 0 4.4 0c0-1.2-.8-2.3-2.2-3.8z" fill="#ffe066" />
      <path d="M9 18v-2h6v2" fill="#8c7b68" stroke={OUTLINE} stroke-width="1.3" />
    </S>
  );
}

export function FlagsTabIcon(p: { size?: number }) {
  return (
    <S size={p.size}>
      <path d="M5 21V3" stroke={OUTLINE} stroke-width="2" stroke-linecap="round" />
      <path d="M6 4h13l-2.5 4L19 12H6z" fill="#c8102e" stroke={OUTLINE} stroke-width="1.5" stroke-linejoin="round" />
      <path d="M6 7h11.4M10 4v8" stroke="#fff" stroke-width="1.6" />
    </S>
  );
}

/** Backdrops: a landscape panel with a moon, hills and falling snow. */
export function BackdropTabIcon(p: { size?: number }) {
  return (
    <S size={p.size}>
      <rect x="2.5" y="4" width="19" height="16" rx="3" fill="#5a6c9a" stroke={OUTLINE} stroke-width="1.6" />
      <circle cx="16.5" cy="8.6" r="2.3" fill="#fff3c4" />
      <path d="M3.3 16.4l4.6-5 3.4 3.4 3-2.6 6.4 4.6V17a2.2 2.2 0 0 1-2.2 2.2H5.5A2.2 2.2 0 0 1 3.3 17z" fill="#8fb4a0" stroke={OUTLINE} stroke-width="1.3" stroke-linejoin="round" />
      <circle cx="6.5" cy="7.5" r="0.9" fill="#fff" />
      <circle cx="10.4" cy="9.4" r="0.8" fill="#fff" />
      <circle cx="8.6" cy="12" r="0.7" fill="#fff" />
    </S>
  );
}
