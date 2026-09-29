/**
 * War Council icons (DESIGN A18.5.7 "one badge per pick"): the Council button's workshop glyph, a mark
 * per track, a glyph per pick and the three stance glyphs, as inline SVG in the A11 HUD style (dark
 * ink outline, flat light fill, one highlight). WP4 will draw real `research.<id>` badges
 * (docs/requests/wp4-council-badges.md); until then these stand in, drawn from the pick's kind so two
 * picks of a pair never share a glyph.
 */
import type { ResearchClass, ResearchPickDef, ResearchTrack, StanceMode } from '@/contracts';
import { CLASS_COLOR } from '@/core/cardClass';
import type { JSX } from 'preact';
import { ClassGlyph } from '../components/ClassIcon';

const INK = '#1b1330';
const FILL = '#fff8e8';
const W = { stroke: INK, 'stroke-width': 1.5, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };

/** Glyph ids for picks and tracks. */
export type CouncilGlyph =
  | 'sword'
  | 'mail'
  | 'shield'
  | 'speed'
  | 'range'
  | 'plate'
  | 'push'
  | 'wall'
  | 'target'
  | 'burst'
  | 'heal'
  | 'drum'
  | 'banner'
  | 'tower'
  | 'loader'
  | 'wrench'
  | 'cannon'
  | 'sack'
  | 'forage'
  | 'coins'
  | 'bounty'
  | 'fire'
  | 'horn'
  | 'helmet'
  | 'anvil';

/** The glyph of each v1 pick (by the last part of its id), drawn from what it does. */
const PICK_GLYPH: Readonly<Record<string, CouncilGlyph>> = {
  weapons: 'sword',
  mail: 'mail',
  shield_wall: 'shield',
  rush: 'speed',
  long_draw: 'range',
  plating: 'plate',
  trample: 'push',
  bulwark: 'wall',
  hunters: 'target',
  lightfoot: 'speed',
  ambush: 'burst',
  skirmish: 'plate',
  field_care: 'heal',
  war_drums: 'drum',
  rally: 'banner',
  watchtowers: 'tower',
  quick_loaders: 'loader',
  engineers: 'wrench',
  arsenal: 'cannon',
  granary: 'sack',
  forage: 'forage',
  market: 'coins',
  bounty_hunters: 'bounty',
  signal_fires: 'fire',
  war_horns: 'horn',
};

export const TRACK_GLYPH: Readonly<Record<ResearchTrack, CouncilGlyph>> = {
  troops: 'helmet',
  defences: 'tower',
  economy: 'coins',
  command: 'horn',
};

/** Disc colours per track (Troops picks use their class colour). */
export const TRACK_COLOR: Readonly<Record<ResearchTrack, { main: string; dark: string }>> = {
  troops: { main: '#d9564a', dark: '#7c2620' },
  defences: { main: '#8c7a62', dark: '#4a3d2e' },
  economy: { main: '#f0b429', dark: '#8f6100' },
  command: { main: '#9b6ce0', dark: '#4d2a86' },
};

export function pickGlyph(p: Pick<ResearchPickDef, 'id' | 'track'>): CouncilGlyph {
  const slug = p.id.slice(p.id.lastIndexOf('.') + 1);
  return PICK_GLYPH[slug] ?? TRACK_GLYPH[p.track];
}

export function pickColor(p: Pick<ResearchPickDef, 'track' | 'group'>): { main: string; dark: string } {
  if (p.track === 'troops' && p.group) return CLASS_COLOR[p.group];
  return TRACK_COLOR[p.track];
}

function paths(g: CouncilGlyph): JSX.Element {
  switch (g) {
    case 'sword':
      return (
        <g>
          <path d="M16.6 3.4h4v4L11 17l-4-4z" fill={FILL} {...W} />
          <path d="M4.6 12.2l7.2 7.2" {...W} stroke-width="3.4" />
          <path d="M4.6 12.2l7.2 7.2" stroke={FILL} stroke-width="1.4" stroke-linecap="round" />
          <path d="M3.6 20.4l3.2-3.2" {...W} stroke-width="3" />
          <path d="M19.2 4.8 12 12" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.8" />
        </g>
      );
    case 'mail':
      return (
        <g fill="none" {...W}>
          <path d="M5 8.5c0-2.3 3.1-4.2 7-4.2s7 1.9 7 4.2v8.8c0 1.3-3.1 2.4-7 2.4s-7-1.1-7-2.4z" fill={FILL} />
          <circle cx="9" cy="9.5" r="1.8" />
          <circle cx="15" cy="9.5" r="1.8" />
          <circle cx="12" cy="12.8" r="1.8" />
          <circle cx="9" cy="16" r="1.8" />
          <circle cx="15" cy="16" r="1.8" />
        </g>
      );
    case 'shield':
      return (
        <g>
          <path d="M4 5.2h16v6.3c0 4.9-3.4 8-8 9.9-4.6-1.9-8-5-8-9.9z" fill={FILL} {...W} />
          <path d="M4 9.4h16M4 13.6h15.2" {...W} stroke-width="1.2" />
          <path d="M6.5 7.2h4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" />
        </g>
      );
    case 'speed':
      return (
        <g fill={FILL} {...W}>
          <path d="M3 6.5h5.6l5.2 5.5-5.2 5.5H3l5.2-5.5z" />
          <path d="M10.4 6.5H16l5.2 5.5-5.2 5.5h-5.6l5.2-5.5z" />
        </g>
      );
    case 'range':
      return (
        <g>
          <path d="M5.2 3.4c6.4 2 10.4 6.2 11.6 12.6" fill="none" {...W} stroke-width="4" />
          <path d="M5.2 3.4c6.4 2 10.4 6.2 11.6 12.6" fill="none" stroke={FILL} stroke-width="2" stroke-linecap="round" />
          <path d="M5.2 3.4 16.8 16" {...W} stroke-width="1" />
          <path d="M3 21 20.6 8.8" {...W} stroke-width="2.4" />
          <path d="M21.4 6.4l-1.2 5-3.4-2.6z" fill={FILL} {...W} />
        </g>
      );
    case 'plate':
      return (
        <g>
          <path d="M6 3.8h12l2 4.2-2 11.8H6L4 8z" fill={FILL} {...W} />
          <path d="M7.6 8.2h8.8M8.4 12.4h7.2M9.2 16.4h5.6" {...W} stroke-width="1.3" />
          <circle cx="7" cy="6" r="0.9" fill={INK} />
          <circle cx="17" cy="6" r="0.9" fill={INK} />
        </g>
      );
    case 'push':
      return (
        <g>
          <path d="M3 9.2h9.4V5.6L20.8 12l-8.4 6.4v-3.6H3z" fill={FILL} {...W} />
          <path d="M3 7v10" {...W} stroke-width="2.4" />
        </g>
      );
    case 'wall':
      return (
        <g fill={FILL} {...W}>
          <path d="M3 8h18v12H3z" />
          <path d="M3 4h4v4H3zM10 4h4v4h-4zM17 4h4v4h-4z" />
          <path d="M3 14h18M9 8v6M15 8v6M6 14v6M12 14v6M18 14v6" fill="none" stroke-width="1.2" />
        </g>
      );
    case 'target':
      return (
        <g fill="none" {...W}>
          <circle cx="12" cy="12" r="8.2" fill={FILL} />
          <circle cx="12" cy="12" r="4.4" />
          <circle cx="12" cy="12" r="1.3" fill={INK} />
          <path d="M12 1.6v4.2M12 18.2v4.2M1.6 12h4.2M18.2 12h4.2" stroke-width="1.8" />
        </g>
      );
    case 'burst':
      return (
        <g>
          <path d="M12 2l2.4 6 6.2-2.2-3.6 5.6L22 14.6l-6.4.6.6 6.6-4.2-4.9-4.2 4.9.6-6.6-6.4-.6 5-3.2L3.4 5.8 9.6 8z" fill={FILL} {...W} />
          <circle cx="12" cy="12.4" r="2.2" fill="#ffcf3a" {...W} stroke-width="1" />
        </g>
      );
    case 'heal':
      return (
        <g>
          <path d="M9 3.5h6v5.5h5.5v6H15v5.5H9V15H3.5V9H9z" fill={FILL} {...W} />
          <path d="M10.6 5.2v5.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" />
        </g>
      );
    case 'drum':
      return (
        <g>
          <path d="M4.5 8.4v8.2c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2V8.4" fill={FILL} {...W} />
          <ellipse cx="12" cy="8.4" rx="7.5" ry="3.1" fill={FILL} {...W} />
          <path d="M4.8 10l3.8 9M19.2 10l-3.8 9M9.8 11.4 12 19.6l2.2-8.2" fill="none" {...W} stroke-width="1.1" />
          <path d="M15.6 2.2l-3 5.2M20.4 3.6l-5 4.2" {...W} stroke-width="2" />
        </g>
      );
    case 'banner':
      return (
        <g>
          <path d="M5.2 2.6v19" {...W} stroke-width="2.4" />
          <path d="M6 3.6h13l-3 4.4 3 4.4H6z" fill={FILL} {...W} />
          <path d="M9.2 6.4l1.6 1.6 3-3" fill="none" {...W} stroke-width="1.2" />
        </g>
      );
    case 'tower':
      return (
        <g>
          <path d="M6.4 21V9.6h11.2V21z" fill={FILL} {...W} />
          <path d="M5 9.6V4.4h2.6v2.2h2.2V4.4h4.4v2.2h2.2V4.4H19v5.2z" fill={FILL} {...W} />
          <path d="M10.2 21v-4.2a1.8 1.8 0 0 1 3.6 0V21" fill={INK} />
          <path d="M11 11.4h2v2.4h-2z" fill={INK} />
        </g>
      );
    case 'loader':
      return (
        <g>
          <circle cx="9" cy="14.6" r="6" fill={FILL} {...W} />
          <circle cx="9" cy="14.6" r="2.2" fill={INK} />
          <path d="M13.4 3.6h3.8l4 4.2-4 4.2h-3.8l4-4.2z" fill={FILL} {...W} />
        </g>
      );
    case 'wrench':
      return (
        <g>
          <path d="M14.6 2.8a5 5 0 0 0-4.4 6.6L3.2 16.4a2.1 2.1 0 0 0 3 3l7-7a5 5 0 0 0 6.6-4.4l-2.9 2.1-2.8-.9-.9-2.8z" fill={FILL} {...W} />
          <circle cx="4.9" cy="18.2" r="0.9" fill={INK} />
        </g>
      );
    case 'cannon':
      return (
        <g>
          <circle cx="10" cy="13.4" r="7.2" fill={FILL} {...W} />
          <path d="M6.6 10.2a4 4 0 0 1 3.4-2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
          <path d="M15.4 8.2l2.8-2.8" {...W} stroke-width="2" />
          <path d="M19 3.2l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" fill="#ffcf3a" {...W} stroke-width="1" />
        </g>
      );
    case 'sack':
      return (
        <g>
          <path d="M8.6 7.4c-3.6 2.4-5.2 6-4.6 9.4.5 2.6 3.4 4 8 4s7.5-1.4 8-4c.6-3.4-1-7-4.6-9.4z" fill={FILL} {...W} />
          <path d="M8.2 7.4h7.6M9 4.2l3 3.2 3-3.2" fill="none" {...W} />
          <path d="M9 13.6h6M12 11v6" {...W} stroke-width="2" />
        </g>
      );
    case 'forage':
      return (
        <g>
          <path d="M12 21.4V9" {...W} stroke-width="2" />
          <path d="M12 9c-.4-2.6.4-4.6 2.4-6 .8 2.4 0 4.6-2.4 6zM12 12.6c-2.2-1-3.4-2.8-3.4-5.2 2.4.4 3.6 2.2 3.4 5.2zM12 12.6c2.2-1 3.4-2.8 3.4-5.2-2.4.4-3.6 2.2-3.4 5.2zM12 16.2c-2.2-1-3.4-2.8-3.4-5.2 2.4.4 3.6 2.2 3.4 5.2zM12 16.2c2.2-1 3.4-2.8 3.4-5.2-2.4.4-3.6 2.2-3.4 5.2z" fill="#ffcf3a" {...W} stroke-width="1.1" />
        </g>
      );
    case 'coins':
      return (
        <g {...W}>
          <ellipse cx="9" cy="17.2" rx="6" ry="2.6" fill="#ffcf3a" />
          <path d="M3 17.2v-2.6c0-1.4 2.7-2.6 6-2.6s6 1.2 6 2.6v2.6" fill="#ffcf3a" />
          <ellipse cx="9" cy="14.6" rx="6" ry="2.6" fill="#ffe27a" />
          <ellipse cx="15" cy="9.6" rx="6" ry="2.6" fill="#ffcf3a" />
          <path d="M9 9.6V7c0-1.4 2.7-2.6 6-2.6s6 1.2 6 2.6v2.6" fill="#ffcf3a" />
          <ellipse cx="15" cy="7" rx="6" ry="2.6" fill="#ffe27a" />
        </g>
      );
    case 'bounty':
      return (
        <g>
          <circle cx="12" cy="12" r="7" fill="#ffcf3a" {...W} />
          <circle cx="12" cy="12" r="3.6" fill="none" stroke="#b87a12" stroke-width="1.4" />
          <path d="M12 1.6v5M12 17.4v5M1.6 12h5M17.4 12h5" {...W} stroke-width="2.2" />
        </g>
      );
    case 'fire':
      return (
        <g>
          <path d="M12 2.2c1 3.4 5.8 5.6 5.8 11 0 3.6-2.6 6.6-5.8 6.6s-5.8-3-5.8-6.6c0-2.6 1.2-4.4 2.6-5.8.2 1.6.8 2.6 1.8 3.2 0-3.4.4-5.8 1.4-8.4z" fill="#ffb03a" {...W} />
          <path d="M12 12.4c1.4 1.4 2.4 2.6 2.4 4.2a2.4 2.4 0 0 1-4.8 0c0-1.6 1-2.8 2.4-4.2z" fill="#fff1a8" {...W} stroke-width="1" />
          <path d="M4 21.6h16" {...W} stroke-width="2.2" />
        </g>
      );
    case 'horn':
      return (
        <g>
          <path d="M3 9.4c4.4 0 9.2-2.2 13.6-6v17.2c-4.4-3.8-9.2-6-13.6-6z" fill={FILL} {...W} />
          <path d="M16.6 5.6c2.2.8 3.8 3.4 3.8 6.4s-1.6 5.6-3.8 6.4" fill="none" {...W} stroke-width="1.6" />
          <path d="M5.4 14.6l1.4 5h2.6l-.8-4.6" fill={FILL} {...W} />
        </g>
      );
    case 'helmet':
      return (
        <g>
          <path d="M4 15.4c0-6 3.6-10.6 8-10.6s8 4.6 8 10.6z" fill={FILL} {...W} />
          <path d="M3 15.4h18v3H3z" fill={FILL} {...W} />
          <path d="M12 4.8v10.6" {...W} stroke-width="1.6" />
          <path d="M7 9.4a5 5 0 0 1 2.6-2.8" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" />
        </g>
      );
    case 'anvil':
      return (
        <g>
          <path d="M3.2 9.6h14.4c0 2.2-1.4 3.6-3.6 3.8l1.2 3.4h2.6v3H6.2v-3h2.6l1.2-3.4C6.4 13.2 4 11.8 3.2 9.6z" fill={FILL} {...W} />
          <path d="M17.6 9.6h3.2c0 1.2-1.6 2-3.4 2" fill={FILL} {...W} />
          <path d="M13.8 2.6l6 3.6-1.4 2.2-6-3.6z" fill="#ffcf3a" {...W} />
          <path d="M16.6 5.4 12.8 11" {...W} stroke-width="1.8" />
        </g>
      );
  }
}

/** A glyph alone (no disc). */
export function CouncilGlyphIcon(p: { glyph: CouncilGlyph; size?: number }) {
  const s = p.size ?? 24;
  return (
    <svg class="hud-cg" viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" focusable="false">
      {paths(p.glyph)}
    </svg>
  );
}

/**
 * A pick or track badge: a cel-shaded disc (rim, top highlight) in the track or class colour with the
 * glyph. Troops picks carry their class badge in the corner, so "Weapons" for Infantry and Heavy read
 * apart.
 */
export function CouncilBadge(p: { glyph: CouncilGlyph; color: { main: string; dark: string }; size?: number; cls?: ResearchClass | null; class?: string }) {
  const s = p.size ?? 40;
  return (
    <span
      class={`hud-cbadge ${p.class ?? ''}`}
      style={{ width: `${s}px`, height: `${s}px`, '--cb-main': p.color.main, '--cb-dark': p.color.dark }}
      aria-hidden="true"
    >
      <CouncilGlyphIcon glyph={p.glyph} size={Math.round(s * 0.66)} />
      {p.cls ? (
        <span class="hud-cbadge-cls" style={{ '--cb-main': CLASS_COLOR[p.cls].main, '--cb-dark': CLASS_COLOR[p.cls].dark }}>
          <ClassGlyph id={p.cls} size={Math.max(10, Math.round(s * 0.3))} />
        </span>
      ) : null}
    </span>
  );
}

/** The badge for a pick. */
export function PickBadge(p: { def: Pick<ResearchPickDef, 'id' | 'track' | 'group'>; size?: number; corner?: boolean; class?: string }) {
  return (
    <CouncilBadge
      glyph={pickGlyph(p.def)}
      color={pickColor(p.def)}
      {...(p.size !== undefined ? { size: p.size } : {})}
      cls={p.corner === false ? null : p.def.group}
      {...(p.class !== undefined ? { class: p.class } : {})}
    />
  );
}

/** Stance glyphs (A18.4.2): Charge crossed swords, Hold a flag, Fall back a shield with a back arrow. */
export function StanceGlyph(p: { mode: StanceMode; size?: number }) {
  const s = p.size ?? 22;
  return (
    <svg class="hud-stance-glyph" viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" focusable="false">
      {p.mode === 'charge' ? (
        <g>
          <path d="M16.4 3h4.4v4.4L9.4 18.8l-4.4-4.4z" fill="currentColor" {...W} />
          <path d="M7.6 3H3.2v4.4l11.4 11.4 4.4-4.4z" fill="currentColor" {...W} />
          <path d="M3.4 16.6l4 4M20.6 16.6l-4 4" {...W} stroke-width="3" />
          <path d="M3.4 16.6l4 4M20.6 16.6l-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </g>
      ) : p.mode === 'hold' ? (
        <g>
          <path d="M5.4 2.4v19.4" {...W} stroke-width="3.2" />
          <path d="M5.4 2.4v19.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M6.6 3.4c3-1.2 5.4 1.4 8.4.2 1.6-.6 3.2-.6 4.6 0v8.6c-1.4-.6-3-.6-4.6 0-3 1.2-5.4-1.4-8.4-.2z" fill="currentColor" {...W} />
          <path d="M3 21.6h5.4" {...W} stroke-width="2" />
        </g>
      ) : (
        <g>
          <path d="M9 4h12v6.2c0 4.6-2.6 7.6-6 9.4-3.4-1.8-6-4.8-6-9.4z" fill="currentColor" {...W} />
          <path d="M2.4 11.4l4.4-4.2v2.6h4.4v3.2H6.8v2.6z" fill="currentColor" {...W} />
        </g>
      )}
    </svg>
  );
}
