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
          <path d="M4 20L17 7" stroke={OUT} stroke-width="3.2" stroke-linecap="round" />
          <path d="M4 20L17 7" stroke="#8c5a2b" stroke-width="1.6" stroke-linecap="round" />
          <path d="M15.2 5.2l5-1.6-1.6 5-2.3.2z" fill="#dfe6f5" {...common} />
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
  const face = (children: JSX.Element | JSX.Element[], fill = '#ffd447') => (
    <Svg {...p}>
      <circle cx="12" cy="12.5" r="9.3" fill={fill} stroke={OUT} stroke-width="1.6" />
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
