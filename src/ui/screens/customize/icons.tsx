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

/** Slot glyphs of Customize › General (two tones, a shadow band and a highlight, 24 grid). */
const SLOT_GLYPH: Record<string, ComponentChildren> = {
  face: (
    <>
      <ellipse cx="12" cy="12.5" rx="8" ry="8.6" fill="#efc39a" stroke="#6a3e22" stroke-width="1.6" />
      <path d="M5.4 15c1.6 3.4 4 5 6.6 5s5-1.6 6.6-5c-2 1.6-4.2 2.4-6.6 2.4S7.4 16.6 5.4 15z" fill="#d49a6a" />
      <circle cx="9.2" cy="11.6" r="1.1" fill="#3a2620" />
      <circle cx="14.8" cy="11.6" r="1.1" fill="#3a2620" />
      <path d="M9.4 15.2q2.6 2 5.2 0" fill="none" stroke="#6a3e22" stroke-width="1.3" stroke-linecap="round" />
    </>
  ),
  hair: (
    <>
      <path d="M4 14C3.4 7 7.4 3.6 12 3.6S20.6 7 20 14c-1.4-3-3.6-4.8-6.4-5.2-2.6 1.6-5.4 2-8.6 2.6C4.6 12 4.2 13 4 14z" fill="#8e5a2b" stroke="#3a2210" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M7 6.4Q10 4.6 13 5" stroke="#c99a6a" stroke-width="1.3" fill="none" stroke-linecap="round" />
      <path d="M6.4 14.4Q8 19 12 20.4Q16 19 17.6 14.4" fill="none" stroke="#3a2210" stroke-width="1.4" stroke-dasharray="1.6 1.6" opacity=".5" />
    </>
  ),
  eyes: (
    <>
      <ellipse cx="7.6" cy="12" rx="4.4" ry="5" fill="#fbf8f2" stroke="#3a2620" stroke-width="1.5" />
      <ellipse cx="16.4" cy="12" rx="4.4" ry="5" fill="#fbf8f2" stroke="#3a2620" stroke-width="1.5" />
      <circle cx="8" cy="12.6" r="2.4" fill="#3f8a4a" />
      <circle cx="16.8" cy="12.6" r="2.4" fill="#3f8a4a" />
      <circle cx="7.2" cy="11.6" r=".9" fill="#fff" />
      <circle cx="16" cy="11.6" r=".9" fill="#fff" />
    </>
  ),
  brows: <path d="M3.4 13.4Q7 8 11 11M13 11q4-3 7.6 2.4" fill="none" stroke="#5a3820" stroke-width="3" stroke-linecap="round" />,
  nose: <path d="M11 5.4Q7.6 13 8.6 16.4Q12 19 15.6 16.6Q14.8 12 11 5.4z" fill="#e0a97c" stroke="#6a3e22" stroke-width="1.6" stroke-linejoin="round" />,
  mouth: (
    <>
      <path d="M4.4 9.6Q12 22 19.6 9.6Q12 12 4.4 9.6z" fill="#7a2a26" stroke="#3a1612" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M6.4 10.6Q12 12.6 17.6 10.6L17 12.4Q12 14 7 12.4z" fill="#fbf8f2" />
    </>
  ),
  facialHair: (
    <path d="M3.6 6.6Q4 19.6 12 21Q20 19.6 20.4 6.6Q18 13 15 13.6Q13.4 11.6 12 12Q10.6 11.6 9 13.6Q6 13 3.6 6.6z" fill="#7a4e2a" stroke="#3a2210" stroke-width="1.6" stroke-linejoin="round" />
  ),
  headwear: (
    <>
      <ellipse cx="12" cy="17" rx="10.4" ry="3" fill="#26503f" stroke="#10241c" stroke-width="1.5" />
      <path d="M5.6 16.4C5.6 8.4 8.4 4.4 12 4.4s6.4 4 6.4 12z" fill="#2e5e4e" stroke="#10241c" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M5.8 13.6Q12 15 18.2 13.6V16.2Q12 17.6 5.8 16.2z" fill="#e8b23a" stroke="#5d4717" stroke-width="1.1" />
    </>
  ),
  top: (
    <>
      <path d="M2.6 21C2.6 14.6 5.4 11.6 9 10.6L10.4 10h3.2l1.4.6c3.6 1 6.4 4 6.4 10.4z" fill="#b83a3a" stroke="#4a1414" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M10.4 10L12 13.4L13.6 10" fill="#efc39a" stroke="#4a1414" stroke-width="1.2" stroke-linejoin="round" />
      <path d="M4.6 15.6Q6 13 8 12.4" stroke="#e08a8a" stroke-width="1.2" fill="none" stroke-linecap="round" />
    </>
  ),
  accessory: (
    <>
      <circle cx="7.4" cy="12" r="4.4" fill="#dff4ff" fill-opacity=".5" stroke="#3a2a22" stroke-width="1.8" />
      <circle cx="16.6" cy="12" r="4.4" fill="#dff4ff" fill-opacity=".5" stroke="#3a2a22" stroke-width="1.8" />
      <path d="M11.8 11.4Q12 10.4 12.2 11.4" stroke="#3a2a22" stroke-width="1.8" />
      <path d="M5.4 10.4Q6.4 9.2 8 9.4" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round" />
    </>
  ),
  background: (
    <>
      <rect x="3" y="3.6" width="18" height="16.8" rx="3" fill="#4a8fd0" stroke="#15304a" stroke-width="1.6" />
      <path d="M3.8 17L9 11.4L13 15.4L15.6 13L20.2 17.6V18.8Q20.2 19.6 19.4 19.6H4.6Q3.8 19.6 3.8 18.8z" fill="#5e8f3a" />
      <circle cx="15.6" cy="8.4" r="2" fill="#ffe9a0" />
    </>
  ),
  frame: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#5d4717" stroke-width="5" />
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#e8b23a" stroke-width="2.6" />
      <path d="M6 4.6H14" stroke="#f6e0b0" stroke-width="1.2" stroke-linecap="round" />
    </>
  ),
  banner: (
    <>
      <path d="M5 3.6H19V20.4L12 16.8L5 20.4z" fill="#5a3a2a" stroke="#241410" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M12 7C14.4 10 15.4 11.6 15.4 13.2A3.4 3.4 0 0 1 8.6 13.2C8.6 11.6 9.6 10 12 7z" fill="#ff9a3a" />
      <rect x="3.6" y="2.4" width="16.8" height="2.6" rx="1.3" fill="#e8b23a" stroke="#5d4717" stroke-width="1" />
    </>
  ),
  title: (
    <>
      <path d="M2.4 9.4H6V16H2.4L4 12.7z" fill="#aca294" stroke="#5d5950" stroke-width="1.3" stroke-linejoin="round" />
      <path d="M21.6 9.4H18V16h3.6L20 12.7z" fill="#aca294" stroke="#5d5950" stroke-width="1.3" stroke-linejoin="round" />
      <rect x="5" y="7.6" width="14" height="7.6" rx="1.2" fill="#e8dfc8" stroke="#5d5950" stroke-width="1.5" />
      <path d="M8 11.4H16" stroke="#5d5950" stroke-width="1.4" stroke-linecap="round" />
    </>
  ),
  portrait: (
    <>
      <rect x="3.4" y="2.6" width="17.2" height="18.8" rx="3" fill="#3a356f" stroke="#15122e" stroke-width="1.6" />
      <circle cx="12" cy="10" r="3.8" fill="#efc39a" stroke="#6a3e22" stroke-width="1.3" />
      <path d="M5.6 20.4C6 16 8.6 14.4 12 14.4s6 1.6 6.4 6z" fill="#2f8f8a" stroke="#0f3a38" stroke-width="1.3" />
    </>
  ),
};

/** The glyph of a General slot or profile tab. */
export function SlotIcon(p: { slot: string; size?: number }) {
  return <S size={p.size}>{SLOT_GLYPH[p.slot] ?? null}</S>;
}
