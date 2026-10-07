/**
 * HUD icons as inline SVG (no emoji, no external requests). One module so a later art pass can
 * replace them in one place. All icons use a 24×24 view box, a dark outline and flat fills in the
 * A11 cartoon style; colours come from CSS where they depend on state.
 */
import type { AgeId, EmoteId, RoleGroup } from '@/contracts';
import type { ComponentChildren, JSX } from 'preact';

type P = { size?: number; class?: string };

const OUT = '#1b1330';

function Svg(props: P & { children: ComponentChildren; view?: string }) {
  const s = props.size ?? 24;
  return (
    <svg class={props.class} width={s} height={s} viewBox={props.view ?? '0 0 24 24'} aria-hidden="true" focusable="false">
      {props.children}
    </svg>
  );
}

export function CoinIcon(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12.8" r="9.5" fill="#b87a12" stroke={OUT} stroke-width="1.6" />
      <circle cx="12" cy="11.4" r="9" fill="#ffcf3a" stroke={OUT} stroke-width="1.6" />
      <circle cx="12" cy="11.4" r="5.6" fill="none" stroke="#d99a1e" stroke-width="1.6" />
      <path d="M8.2 7.6a6 6 0 0 1 4.8-2" stroke="#fff5c2" stroke-width="1.6" fill="none" stroke-linecap="round" />
    </Svg>
  );
}

export function PauseIcon(p: P) {
  return (
    <Svg {...p}>
      <rect x="5.5" y="4.5" width="4.6" height="15" rx="1.4" fill="currentColor" stroke={OUT} stroke-width="1.4" />
      <rect x="13.9" y="4.5" width="4.6" height="15" rx="1.4" fill="currentColor" stroke={OUT} stroke-width="1.4" />
    </Svg>
  );
}

export function PlayIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke={OUT} stroke-width="1.4" stroke-linejoin="round" />
    </Svg>
  );
}

export function SpeedIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M3.5 5.5v13l8-6.5zM12 5.5v13l8.5-6.5z" fill="currentColor" stroke={OUT} stroke-width="1.4" stroke-linejoin="round" />
    </Svg>
  );
}

/** Scouted: an eye (what you have seen of their army). */
export function EyeIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M2 12c2.6-4.4 6-6.6 10-6.6s7.4 2.2 10 6.6c-2.6 4.4-6 6.6-10 6.6S4.6 16.4 2 12z" fill="#f4efe4" stroke={OUT} stroke-width="1.6" stroke-linejoin="round" />
      <circle cx="12" cy="12" r="4" fill="#46536a" stroke={OUT} stroke-width="1.4" />
      <circle cx="10.6" cy="10.6" r="1.3" fill="#fff" />
    </Svg>
  );
}

export function RobotIcon(p: P) {
  return (
    <Svg {...p}>
      <line x1="12" y1="2.8" x2="12" y2="6" stroke={OUT} stroke-width="1.6" />
      <circle cx="12" cy="2.8" r="1.6" fill="#ff8a3d" stroke={OUT} stroke-width="1.2" />
      <rect x="4" y="6" width="16" height="13" rx="4" fill="#dfe6f5" stroke={OUT} stroke-width="1.6" />
      <rect x="6.6" y="9" width="10.8" height="5.4" rx="2.4" fill="#27304a" />
      <circle cx="9.4" cy="11.7" r="1.4" fill="#6ff0ff" />
      <circle cx="14.6" cy="11.7" r="1.4" fill="#6ff0ff" />
      <rect x="9" y="16" width="6" height="1.6" rx="0.8" fill="#7d879f" />
    </Svg>
  );
}

export function HornIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 9.5c0-1 .8-1.6 1.7-1.3L18 12.3c1.6.5 2.8 2 2.8 3.7 0 .5-.5.9-1 .7L4.2 11.3A1.8 1.8 0 0 1 3 9.5z" fill="#f2d7a1" stroke={OUT} stroke-width="1.5" />
      <path d="M17.6 12.2c.8-1.9 2.6-3 3.4-2.6.4 2.2-.3 4.8-1.8 6.4" fill="#c98a3d" stroke={OUT} stroke-width="1.5" />
      <path d="M8 10.6l1 3M11.5 11.7l.8 3" stroke="#a8773a" stroke-width="1.4" />
    </Svg>
  );
}

export function ChargeFlagIcon(p: P) {
  return (
    <Svg {...p}>
      <line x1="5" y1="3" x2="5" y2="21.5" stroke={OUT} stroke-width="2.2" stroke-linecap="round" />
      <path d="M6 4h12.5l-3.2 4.2 3.2 4.3H6z" fill="currentColor" stroke={OUT} stroke-width="1.5" stroke-linejoin="round" />
      <path d="M9 6.2l3 2.1-3 2.1" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function HoldShieldIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 2.8l7.6 2.8v6c0 5-3.3 8.3-7.6 9.8-4.3-1.5-7.6-4.8-7.6-9.8v-6z" fill="currentColor" stroke={OUT} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M12 5.8v12.4M7.4 10.6h9.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.85" />
    </Svg>
  );
}

export function SmileIcon(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.2" fill="#ffd447" stroke={OUT} stroke-width="1.6" />
      <circle cx="9" cy="10" r="1.3" fill={OUT} />
      <circle cx="15" cy="10" r="1.3" fill={OUT} />
      <path d="M7.8 13.6c1.9 3 6.5 3 8.4 0" fill="none" stroke={OUT} stroke-width="1.6" stroke-linecap="round" />
    </Svg>
  );
}

export function BoltIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M13.8 2.5L5.5 13.4h5.3l-1.6 8.1 8.3-11h-5.3z" fill="#ffe16b" stroke={OUT} stroke-width="1.5" stroke-linejoin="round" />
    </Svg>
  );
}

/** Age glyphs: stone axe, keep tower, cannon, helmet, atom. */
export function AgeGlyph(p: P & { age: AgeId }) {
  switch (p.age) {
    case 'stone':
      return (
        <Svg {...p}>
          <path d="M14.2 4.5l5.4 5.4-10.7 10.7a1.8 1.8 0 0 1-2.6 0l-2.8-2.8a1.8 1.8 0 0 1 0-2.6z" fill="#8c5a2b" stroke={OUT} stroke-width="1.5" />
          <path d="M11.2 3.3c3.2-1.6 7.8.4 9.4 3.9.3.7-.4 1.4-1.1 1.1L12 5.2c-.7-.3-1.4-1.5-.8-1.9z" fill="#b9b0a2" stroke={OUT} stroke-width="1.5" />
        </Svg>
      );
    // MVP fix 2026-10-01: Bronze, Industrial and Cosmic had no glyph, so every Short War showed blank discs.
    case 'bronze':
      return (
        <Svg {...p}>
          <path d="M5.6 8.6c.4-3.9 3.6-6.4 6.4-6.4s6 2.5 6.4 6.4z" fill="#c8402e" stroke={OUT} stroke-width="1.4" stroke-linejoin="round" />
          <path d="M5 11.2C5 8.1 8 6.2 12 6.2s7 1.9 7 5V20h-4v-5.6h-1.8V21h-2.4v-6.6H9V20H5z" fill="#cf8f3c" stroke={OUT} stroke-width="1.5" stroke-linejoin="round" />
          <path d="M7.6 12.2h8.8" stroke={OUT} stroke-width="1.6" stroke-linecap="round" />
          <path d="M8 9.4c1.2-1.2 2.6-1.6 4-1.6" fill="none" stroke="#f3c77a" stroke-width="1.3" stroke-linecap="round" />
        </Svg>
      );
    case 'industrial':
      return (
        <Svg {...p}>
          <g fill="#8a9099" stroke={OUT} stroke-width="1.3" stroke-linejoin="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <rect key={a} x="10.4" y="2.4" width="3.2" height="4.2" rx="0.6" transform={`rotate(${a} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r="6.6" />
          </g>
          <circle cx="12" cy="12" r="2.4" fill="#3a3f45" stroke={OUT} stroke-width="1.2" />
          <path d="M8.6 9.2c.9-1 2-1.5 3.2-1.6" fill="none" stroke="#d6dbe2" stroke-width="1.3" stroke-linecap="round" />
        </Svg>
      );
    case 'cosmic':
      return (
        <Svg {...p}>
          <circle cx="11" cy="12.6" r="5.8" fill="#7b52d4" stroke={OUT} stroke-width="1.5" />
          <path d="M8 10.4c.8-1.2 2-1.9 3.4-2" fill="none" stroke="#c9b3ff" stroke-width="1.4" stroke-linecap="round" />
          <ellipse cx="11" cy="12.6" rx="9.6" ry="2.7" fill="none" stroke={OUT} stroke-width="3.2" transform="rotate(-18 11 12.6)" />
          <ellipse cx="11" cy="12.6" rx="9.6" ry="2.7" fill="none" stroke="#ffd36a" stroke-width="1.6" transform="rotate(-18 11 12.6)" />
          <path d="M19.6 2.2l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" fill="#fff" stroke={OUT} stroke-width="0.8" stroke-linejoin="round" />
        </Svg>
      );
    case 'medieval':
      return (
        <Svg {...p}>
          <path d="M5 21V8h2.4v2H10V8h4v2h2.6V8H19v13z" fill="#b9c1cc" stroke={OUT} stroke-width="1.5" stroke-linejoin="round" />
          <path d="M10 21v-4.2a2 2 0 0 1 4 0V21" fill="#4a3a2e" stroke={OUT} stroke-width="1.3" />
          <path d="M12 8V2.6l4 1.5-4 1.5" fill="#d4a437" stroke={OUT} stroke-width="1.2" />
        </Svg>
      );
    case 'gunpowder':
      return (
        <Svg {...p}>
          <path d="M3.5 12.2l12.8-5.4 1.6 3.8-12.4 5.2a1.6 1.6 0 0 1-2-.8z" fill="#3a3f45" stroke={OUT} stroke-width="1.5" />
          <circle cx="9.5" cy="16.8" r="4" fill="#8c5a2b" stroke={OUT} stroke-width="1.5" />
          <circle cx="9.5" cy="16.8" r="1.2" fill={OUT} />
          <circle cx="19.6" cy="7.2" r="1.6" fill="#c9a227" stroke={OUT} stroke-width="1.1" />
        </Svg>
      );
    case 'modern':
      return (
        <Svg {...p}>
          <path d="M3.5 15.5c0-6 3.8-10 8.5-10s8.5 4 8.5 10z" fill="#62664a" stroke={OUT} stroke-width="1.5" />
          <rect x="2.5" y="15" width="19" height="3.2" rx="1.2" fill="#4c4f39" stroke={OUT} stroke-width="1.4" />
          <path d="M8 9.5c1.2-1.4 2.6-2 4-2" fill="none" stroke="#b8a67a" stroke-width="1.5" stroke-linecap="round" />
        </Svg>
      );
    case 'future':
      return (
        <Svg {...p}>
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#3af0b4" stroke-width="1.8" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#29e3f5" stroke-width="1.8" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#f03aa8" stroke-width="1.8" transform="rotate(-60 12 12)" />
          <circle cx="12" cy="12" r="2.4" fill="#fff" stroke={OUT} stroke-width="1.2" />
        </Svg>
      );
  }
}

/** Role-group glyphs for card art fallbacks. */
export function RoleGlyph(p: P & { group: RoleGroup }) {
  const common = { stroke: OUT, 'stroke-width': 1.5, 'stroke-linejoin': 'round' as const };
  switch (p.group) {
    case 'infantry':
      return (
        <Svg {...p}>
          <path d="M5 19.5l9.2-9.2" stroke={OUT} stroke-width="3.6" stroke-linecap="round" />
          <path d="M5 19.5l9.2-9.2" stroke="#8c5a2b" stroke-width="2" stroke-linecap="round" />
          <path d="M12.6 7.2c1.8-2.7 5.6-3.5 7.6-1.5s1.2 5.8-1.5 7.6c-1.6 1-3.6-.5-4.8-1.8s-2.4-2.8-1.3-4.3z" fill="#b9b0a2" {...common} />
        </Svg>
      );
    case 'ranged':
      return (
        <Svg {...p}>
          <path d="M6 3.5c7.5 3 7.5 14 0 17" fill="none" stroke={OUT} stroke-width="3.4" stroke-linecap="round" />
          <path d="M6 3.5c7.5 3 7.5 14 0 17" fill="none" stroke="#b07a3a" stroke-width="1.8" stroke-linecap="round" />
          <path d="M6 3.5v17" stroke="#f4ecd8" stroke-width="1" />
          <path d="M4 12h15.5" stroke={OUT} stroke-width="1.6" />
          <path d="M20.5 12l-3-2v4z" fill="#dfe6f5" {...common} />
        </Svg>
      );
    case 'heavy':
      return (
        <Svg {...p}>
          <path d="M12 2.8l7.6 2.8v6c0 5-3.3 8.3-7.6 9.8-4.3-1.5-7.6-4.8-7.6-9.8v-6z" fill="#9aa4b4" {...common} />
          <path d="M12 5.4l5 1.9v4.3c0 3.5-2.2 5.8-5 6.8z" fill="#c9d1dc" />
        </Svg>
      );
    case 'antiArmor':
      return (
        <Svg {...p}>
          {/* Anti-heavy: the Heavy shield split by a spear (owner feedback 2026-09-29). */}
          <path d="M10.6 3.2 4.4 5.4v6.2c0 4.6 2.8 7.8 6.2 9.4z" fill="#9aa4b4" {...common} transform="rotate(-9 10.6 21)" />
          <path d="M13.4 3.2l6.2 2.2v6.2c0 4.6-2.8 7.8-6.2 9.4z" fill="#9aa4b4" {...common} transform="rotate(9 13.4 21)" />
          <path d="M12 1.6v14" stroke={OUT} stroke-width="3.2" stroke-linecap="round" />
          <path d="M12 1.6v14" stroke="#8c5a2b" stroke-width="1.6" stroke-linecap="round" />
          <path d="M12 22.6l-2.6-7h5.2z" fill="#dfe6f5" {...common} />
        </Svg>
      );
    case 'support':
      return (
        <Svg {...p}>
          <circle cx="12" cy="12" r="9" fill="#f4ecd8" {...common} />
          <path d="M10 6.5h4v3.5h3.5v4H14v3.5h-4V14H6.5v-4H10z" fill="#3fbf7f" {...common} />
        </Svg>
      );
    case 'epic':
      return (
        <Svg {...p}>
          <path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z" fill="#c07cff" {...common} />
        </Svg>
      );
    case 'legendary':
      return (
        <Svg {...p}>
          <path d="M3.5 18.5l-.8-11 5.3 4.2L12 4.5l4 7.2 5.3-4.2-.8 11z" fill="#ffcf3a" {...common} />
          <rect x="3.5" y="18" width="17" height="2.6" rx="1" fill="#e0a51e" {...common} />
        </Svg>
      );
  }
}

/** Emote faces (A5.8: six emotes, no text chat). */
export function EmoteGlyph(p: P & { emote: EmoteId }) {
  // The same three cel layers as the collected emotes (visuals/cosmetics/emotes.ts `face()`): fill, a
  // lower shadow crescent, a highlight, then the outline (request uiart-b-starter-emotes).
  const face = (children: JSX.Element | JSX.Element[], fill = '#ffd447') => (
    <Svg {...p}>
      <circle cx="12" cy="12.5" r="9.3" fill={fill} />
      <path d="M2.75 12.9A9.3 9.3 0 0 0 21.25 12.9A9.3 7.2 0 0 1 2.75 12.9Z" fill="#b5650f" opacity=".26" />
      <ellipse cx="8.6" cy="7.6" rx="2.6" ry="1.4" fill="#fff" opacity=".55" />
      <circle cx="12" cy="12.5" r="9.3" fill="none" stroke={OUT} stroke-width="1.6" />
      {children}
    </Svg>
  );
  switch (p.emote) {
    case 'laugh':
      return face([
        <path key="e" d="M7 9.6l2.4 1.2L7 12M17 9.6l-2.4 1.2L17 12" fill="none" stroke={OUT} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />,
        <path key="m" d="M7.2 14h9.6c-.6 3-2.6 4.6-4.8 4.6S7.8 17 7.2 14z" fill="#8a2338" stroke={OUT} stroke-width="1.4" />,
      ]);
    case 'salute':
      return face([
        <circle key="l" cx="9" cy="11" r="1.2" fill={OUT} />,
        <circle key="r" cx="15" cy="11" r="1.2" fill={OUT} />,
        <path key="m" d="M9 15.5h6" stroke={OUT} stroke-width="1.6" stroke-linecap="round" />,
        <path key="h" d="M15.5 3.5l5 4-2.2 1.6-4.4-3.4z" fill="#f2c9a0" stroke={OUT} stroke-width="1.3" />,
      ]);
    case 'cry':
      return face(
        [
          <path key="e" d="M7.4 10.4h3M13.6 10.4h3" stroke={OUT} stroke-width="1.6" stroke-linecap="round" />,
          <path key="t" d="M8 11.5v5M16 11.5v5" stroke="#4fb7ff" stroke-width="2" stroke-linecap="round" />,
          <path key="m" d="M9.2 17c1.6-1.6 4-1.6 5.6 0" fill="none" stroke={OUT} stroke-width="1.5" stroke-linecap="round" />,
        ],
        '#ffd98a',
      );
    case 'angry':
      return face(
        [
          <path key="b" d="M6.8 8.4l3.6 1.8M17.2 8.4l-3.6 1.8" stroke={OUT} stroke-width="1.7" stroke-linecap="round" />,
          <circle key="l" cx="9.2" cy="11.8" r="1.2" fill={OUT} />,
          <circle key="r" cx="14.8" cy="11.8" r="1.2" fill={OUT} />,
          <path key="m" d="M9 17c1.8-1.5 4.2-1.5 6 0" fill="none" stroke={OUT} stroke-width="1.6" stroke-linecap="round" />,
        ],
        '#ff8a5b',
      );
    case 'thumbsUp':
      return (
        <Svg {...p}>
          <path d="M7.5 10.5l3.6-6.3c.7-1.2 2.6-.7 2.6.7V9h5.1c1.3 0 2.2 1.2 1.9 2.4l-1.7 7.2c-.2.9-1 1.4-1.9 1.4H7.5z" fill="#ffd447" stroke={OUT} stroke-width="1.5" stroke-linejoin="round" />
          <rect x="2.8" y="10" width="4.4" height="10.4" rx="1.2" fill="#4a86f0" stroke={OUT} stroke-width="1.5" />
        </Svg>
      );
    case 'gg':
      return (
        <Svg {...p}>
          <path d="M6.5 4h11v5.2a5.5 5.5 0 0 1-11 0z" fill="#ffcf3a" stroke={OUT} stroke-width="1.5" />
          <path d="M6.5 6H3.5c0 3 1.2 4.6 3.4 5M17.5 6h3c0 3-1.2 4.6-3.4 5" fill="none" stroke={OUT} stroke-width="1.5" />
          <path d="M12 14.7v3.3M8 20.5h8" stroke={OUT} stroke-width="2" stroke-linecap="round" />
          <path d="M9.3 6.5v2.4" stroke="#fff5c2" stroke-width="1.5" stroke-linecap="round" />
        </Svg>
      );
  }
}

/** The base button (A17.5 `icon.base`): a small keep with a team pennant. */
export function HouseIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M4.5 20.5v-9l2-1.6v-2.4h2.6v1l2.9-2.3 2.9 2.3v-1h2.6v2.4l2 1.6v9z" fill="#e9dcc0" stroke={OUT} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M10 20.5v-4.3a2 2 0 0 1 4 0v4.3" fill="#5b4a3a" stroke={OUT} stroke-width="1.4" />
      <path d="M12 6.2V2.6l3.6 1.2L12 5" fill="currentColor" stroke={OUT} stroke-width="1.2" stroke-linejoin="round" />
    </Svg>
  );
}

/** The front button (A17.5 `icon.follow`): crossed swords. */
export function SwordsIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 4l10.5 10.5M20 4L9.5 14.5" stroke={OUT} stroke-width="4.2" stroke-linecap="round" />
      <path d="M4 4l10.5 10.5M20 4L9.5 14.5" stroke="#eef2f8" stroke-width="2" stroke-linecap="round" />
      <path d="M12.6 16.4l4.8-4.8M11.4 16.4l-4.8-4.8" stroke={OUT} stroke-width="3.6" stroke-linecap="round" />
      <path d="M12.6 16.4l4.8-4.8M11.4 16.4l-4.8-4.8" stroke="#d8a23a" stroke-width="1.8" stroke-linecap="round" />
      <path d="M17.4 17.4l2.4 2.4M6.6 17.4l-2.4 2.4" stroke={OUT} stroke-width="3.4" stroke-linecap="round" />
      <path d="M17.4 17.4l2.4 2.4M6.6 17.4l-2.4 2.4" stroke="#8a5a2b" stroke-width="1.6" stroke-linecap="round" />
    </Svg>
  );
}

/** A hammer (the base button's "empty mount you can afford" badge, A17.6). */
export function HammerIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M12.5 11.5l-7.5 7.5" stroke={OUT} stroke-width="4.4" stroke-linecap="round" />
      <path d="M12.5 11.5l-7.5 7.5" stroke="#c9884a" stroke-width="2.2" stroke-linecap="round" />
      <path d="M9.6 6.9l4.2-4.2 2.2 1.2 1.4-1.4 3.8 3.8-1.4 1.4 1.2 2.2-4.2 4.2z" fill="#cfd6e2" stroke={OUT} stroke-width="1.5" stroke-linejoin="round" />
    </Svg>
  );
}

/** The off-screen badge chevron (A17.5 `icon.chevron`), pointing right; CSS mirrors it on the left. */
export function ChevronIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M8.5 4.5l7.5 7.5-7.5 7.5" fill="none" stroke={OUT} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M8.5 4.5l7.5 7.5-7.5 7.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

/** Base under attack (A17.5 `icon.base_alert`): a keep with a crack and a spark. */
export function BaseAlertIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M4.5 21v-9.5l2-1.5V7.5h2.6v1.2L12 6.3l2.9 2.4V7.5h2.6V10l2 1.5V21z" fill="#f4e3c8" stroke={OUT} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M12.5 10.5l-1.6 3 2.2 1.2-1.8 3.6" fill="none" stroke={OUT} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M17.5 2.5l1 2.4 2.5.3-1.9 1.7.5 2.5-2.1-1.3-2.2 1.3.6-2.5-1.9-1.7 2.5-.3z" fill="#ffd447" stroke={OUT} stroke-width="1.1" stroke-linejoin="round" />
    </Svg>
  );
}

/** A Legendary (the enemy Legendary badge): a crown. */
export function CrownIcon(p: P) {
  return (
    <Svg {...p}>
      <path d="M3.5 18.5l-1-10 5.2 4.3L12 4.5l4.3 8.3 5.2-4.3-1 10z" fill="#ffd447" stroke={OUT} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M3.5 18.5h17v2.5h-17z" fill="#e0a92b" stroke={OUT} stroke-width="1.4" stroke-linejoin="round" />
      <circle cx="12" cy="14.6" r="1.6" fill="#fff" stroke={OUT} stroke-width="1" />
    </Svg>
  );
}
