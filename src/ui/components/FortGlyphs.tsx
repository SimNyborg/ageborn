/**
 * Fort icons and card art (DESIGN A16.14.8 `icon.fort.*`, `icon.fort.pad`, ui-plan 3.5): the four kind
 * glyphs (wall, tower, camp, trap) used in the corner of the Fort button, slots and tips, the pad glyph,
 * and a cel-shaded illustration per kind whose material follows the age (wood stakes, dressed stone,
 * gabions and sandbags, energy panels). The illustration is the fort's card face until F3 delivers the
 * fort rigs' portraits through the art service (`FORT_PORTRAITS`); it never stands in for battle art.
 */
import type { AgeId, FortKind } from '@/contracts';
import './fortGlyphs.css';
import { OUTLINE, type IconProps } from './icons';

/**
 * Fort portraits come from the art service once F3 draws the fort rigs (A16.14.8). Until then the F1
 * placeholder rigs are turret puppets, so the UI draws the kind illustration below instead.
 */
export const FORT_PORTRAITS = false;

const GLYPH = '#FFF8E8';
const S = { stroke: OUTLINE, 'stroke-linejoin': 'round' as const, 'stroke-linecap': 'round' as const };

/** The kind's short name key (`fort.kind.*`, forts.en.json). */
export const FORT_KIND_KEY: Readonly<Record<FortKind, string>> = {
  wall: 'fort.kind.wall',
  tower: 'fort.kind.tower',
  camp: 'fort.kind.camp',
  trap: 'fort.kind.trap',
};

/** A kind glyph, light on dark (24 × 24): distinct silhouettes so kinds never rely on colour. */
export function FortKindGlyph(p: IconProps & { kind: FortKind; color?: string }) {
  const s = p.size ?? 18;
  const c = p.color ?? GLYPH;
  return (
    <svg class={`ui-fort-glyph ${p.class ?? ''}`} viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" focusable="false">
      {p.kind === 'wall' ? (
        <>
          <path d="M2.4 20.4V7.6h3v2.8h2.4V7.6h3v2.8h2.4V7.6h3v2.8h2.4V7.6h3v12.8z" fill={c} {...S} stroke-width="1.5" />
          <path d="M2.8 15.2h18.4M8.4 10.6v4.6M15.6 10.6v4.6M12 15.2v5" {...S} stroke-width="1.2" fill="none" />
        </>
      ) : p.kind === 'tower' ? (
        <>
          <path d="M7.4 21.2 8.2 9.6H6V3.4h2.6v2.2h2.2V3.4h2.4v2.2h2.2V3.4H18v6.2h-2.2l.8 11.6z" fill={c} {...S} stroke-width="1.5" />
          <path d="M11 12.6h2v3.6h-2z" fill={OUTLINE} />
        </>
      ) : p.kind === 'camp' ? (
        <>
          <path d="M12 6.6 2.6 20.6h18.8z" fill={c} {...S} stroke-width="1.5" />
          <path d="M12 12.4 8.8 20.6h6.4z" fill={OUTLINE} />
          <path d="M12 6.6V2.2" {...S} stroke-width="1.5" />
          <path d="M12.4 2.4h5l-1.4 1.5 1.4 1.5h-5z" fill={c} {...S} stroke-width="1.2" />
        </>
      ) : (
        <>
          <path d="M2.6 19.6c2.8-1.6 16-1.6 18.8 0-2.8 1.8-16 1.8-18.8 0z" fill={OUTLINE} />
          <path d="M5 19 7 9.8 9 19zM10 19l2-11.6 2 11.6zM15 19l2-9.2 2 9.2z" fill={c} {...S} stroke-width="1.4" />
        </>
      )}
    </svg>
  );
}

/** The kind glyph on a small dark disc (corners of the Fort button, slots and tiles). */
export function FortKindBadge(p: { kind: FortKind; size?: number; class?: string; title?: string }) {
  const s = p.size ?? 22;
  return (
    <span
      class={`ui-fort-badge ui-fort-badge--${p.kind} ${p.class ?? ''}`}
      style={{ width: `${s}px`, height: `${s}px` }}
      role={p.title ? 'img' : undefined}
      aria-label={p.title}
      title={p.title}
      aria-hidden={p.title ? undefined : 'true'}
    >
      <FortKindGlyph kind={p.kind} size={Math.round(s * 0.74)} />
    </span>
  );
}

/** The pad marker glyph (`icon.fort.pad`): a stone plinth seen from the side. */
export function PadGlyph(p: IconProps & { color?: string }) {
  const s = p.size ?? 18;
  const c = p.color ?? '#C9C2B2';
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" focusable="false" class={p.class}>
      <path d="M3 13.4c0-2.2 18-2.2 18 0v3.4c0 2.4-18 2.4-18 0z" fill={c} {...S} stroke-width="1.5" />
      <path d="M3 13.4c0 2.2 18 2.2 18 0" fill="none" {...S} stroke-width="1.5" />
      <path d="M6.4 12.6c1.8-.8 5-.9 7.4-.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.6" fill="none" />
    </svg>
  );
}

/** The building material of an age's forts (A16.14.8 look: palisade to crystal). */
type Material = 'wood' | 'stone' | 'earth' | 'sandbag' | 'energy';

const AGE_MATERIAL: Readonly<Record<AgeId, Material>> = {
  stone: 'wood',
  bronze: 'stone',
  medieval: 'stone',
  gunpowder: 'earth',
  industrial: 'earth',
  modern: 'sandbag',
  future: 'energy',
  cosmic: 'energy',
};

const MAT: Readonly<Record<Material, { face: string; shade: string; light: string; line: string }>> = {
  wood: { face: '#B07A43', shade: '#7A4C22', light: '#DDAE72', line: '#4F3015' },
  stone: { face: '#BDB6A6', shade: '#857E70', light: '#E9E4D8', line: '#5B554B' },
  earth: { face: '#A58D5E', shade: '#6F5C36', light: '#D2BC8C', line: '#4C3E22' },
  sandbag: { face: '#B8A77C', shade: '#7E7050', light: '#E1D3A9', line: '#4E4530' },
  energy: { face: '#6FE3F0', shade: '#1F8FA6', light: '#D9FBFF', line: '#0E4252' },
};

/** Ages whose traps are spiked pits; later ages lay mines and charges. */
const SPIKE_AGES: ReadonlySet<AgeId> = new Set<AgeId>(['stone', 'bronze', 'medieval']);

/**
 * A fort's card face (64 × 64): the kind's structure in its age's material, cel-shaded with a top-left
 * light and a dark outline, a `banner` cloth (team colour in battle, a neutral gold on meta screens,
 * ui-plan 3.2) and a soft ground shadow. `glow` is the energy accent for Future and Cosmic.
 */
export function FortArt(p: { kind: FortKind; age: AgeId; size?: number; banner?: string; silhouette?: boolean; class?: string }) {
  const s = p.size ?? 64;
  const mat = AGE_MATERIAL[p.age] ?? 'stone';
  const m = MAT[mat];
  const banner = p.banner ?? '#E0A93A';
  const glow = p.age === 'cosmic' ? '#B784FF' : '#6FF3FF';
  return (
    <svg
      class={`ui-fort-art${p.silhouette ? ' is-silhouette' : ''} ${p.class ?? ''}`}
      viewBox="0 0 64 64"
      width={s}
      height={s}
      aria-hidden="true"
      focusable="false"
      data-kind={p.kind}
      data-material={mat}
    >
      <ellipse cx="32" cy="55" rx="27" ry="4.6" fill="#000" opacity="0.28" />
      {p.kind === 'wall' ? <Wall m={m} mat={mat} banner={banner} glow={glow} /> : null}
      {p.kind === 'tower' ? <Tower m={m} mat={mat} banner={banner} glow={glow} /> : null}
      {p.kind === 'camp' ? <Camp m={m} mat={mat} banner={banner} glow={glow} /> : null}
      {p.kind === 'trap' ? <Trap m={m} spikes={SPIKE_AGES.has(p.age)} glow={glow} /> : null}
    </svg>
  );
}

interface PartProps {
  m: (typeof MAT)[Material];
  mat: Material;
  banner: string;
  glow: string;
}

function Wall(p: PartProps) {
  const { m } = p;
  if (p.mat === 'wood') {
    // Sharpened stakes lashed with rope (the Palisade).
    const stakes = [0, 1, 2, 3, 4, 5].map((i) => {
      const x = 6.4 + i * 8.6;
      const top = 13 + (i % 2) * 4;
      return (
        <g key={i}>
          <path d={`M${x} 53V${top + 6}L${x + 3.8} ${top}l3.8 ${6}V53z`} fill={m.face} {...S} stroke-width="2" />
          <path d={`M${x + 1.6} 52V${top + 6.6}l1.6-3`} stroke={m.light} stroke-width="1.6" fill="none" stroke-linecap="round" />
          <path d={`M${x + 6} 52V${top + 7}`} stroke={m.shade} stroke-width="1.8" fill="none" stroke-linecap="round" />
        </g>
      );
    });
    return (
      <g>
        {stakes}
        <path d="M5 30.5c18 2.4 36 2.4 54 0M5 43c18 2 36 2 54 0" stroke={OUTLINE} stroke-width="3.2" fill="none" stroke-linecap="round" />
        <path d="M5 30.5c18 2.4 36 2.4 54 0M5 43c18 2 36 2 54 0" stroke="#D9B77A" stroke-width="1.6" fill="none" stroke-linecap="round" />
        <path d="M46 24.5v-15" {...S} stroke-width="2" />
        <path d="M46.6 9.8h10l-2.6 3 2.6 3h-10z" fill={p.banner} {...S} stroke-width="1.6" />
      </g>
    );
  }
  if (p.mat === 'energy') {
    // A hardlight barrier: two emitter posts and a glowing hex panel.
    return (
      <g>
        <path d="M14 22h36v28H14z" fill={p.glow} opacity="0.32" />
        <path d="M14 22h36v28H14z" fill="none" stroke={p.glow} stroke-width="2" />
        <path d="M22 26l4 2.4v4.6L22 35.4l-4-2.4v-4.6zM34 26l4 2.4v4.6L34 35.4l-4-2.4v-4.6zM28 36l4 2.4v4.6L28 45.4l-4-2.4v-4.6zM40 36l4 2.4v4.6L40 45.4l-4-2.4v-4.6z" fill="none" stroke="#E8FEFF" stroke-width="1.2" opacity="0.8" />
        <path d="M6 53V17.4l3.6-3.4 3.6 3.4V53zM50.8 53V17.4l3.6-3.4 3.6 3.4V53z" fill="#3B4452" {...S} stroke-width="2" />
        <path d="M7.8 50V19M52.6 50V19" stroke="#8A97AA" stroke-width="1.4" stroke-linecap="round" />
        <circle cx="9.6" cy="22" r="2.2" fill={p.glow} {...S} stroke-width="1.2" />
        <circle cx="54.4" cy="22" r="2.2" fill={p.glow} {...S} stroke-width="1.2" />
        <path d="M9.6 34.4h4.4M50 34.4h4.4" stroke={p.banner} stroke-width="3" />
      </g>
    );
  }
  // Crenellated wall: dressed stone, gabion baskets or sandbags.
  const body = 'M6 53V22h4.6v-8h9v8h5v-8h9v8h5v-8h9v8h4.8v-8H58v39z';
  return (
    <g>
      <path d={body} fill={m.face} {...S} stroke-width="2.2" />
      <path d="M44.8 22.4V53H58V14h-3.6z" fill={m.shade} opacity="0.55" />
      <path d="M8 24v27M10.6 16v6" stroke={m.light} stroke-width="1.8" stroke-linecap="round" fill="none" />
      {p.mat === 'stone' ? (
        <path d="M6.5 30.4h51M6.5 38.6h51M6.5 46.4h51M16 22.2v8.2M34 22.2v8.2M25 30.4v8.2M44 30.4v8.2M16 38.6v7.8M34 38.6v7.8M25 46.4v6.4M48 46.4v6.4" stroke={m.line} stroke-width="1.3" fill="none" />
      ) : p.mat === 'earth' ? (
        <path d="M6.5 33h51M6.5 43.4h51M20 22v31M34 22v31M47 22v31M8 24l12 9M8 33l12 10M20 24l14 9M20 33l14 10M34 24l13 9M34 33l13 10M47 24l10 8M47 33l10 9" stroke={m.line} stroke-width="1.1" fill="none" opacity="0.85" />
      ) : (
        <path d="M6.5 30.6c4-2.2 9-2.2 13 0 4-2.2 9-2.2 13 0 4-2.2 9-2.2 13 0 4-2.2 8.6-2.2 12.5 0M6.5 38.8c4-2.2 9-2.2 13 0 4-2.2 9-2.2 13 0 4-2.2 9-2.2 13 0 4-2.2 8.6-2.2 12.5 0M6.5 46.4c4-2.2 9-2.2 13 0 4-2.2 9-2.2 13 0 4-2.2 9-2.2 13 0 4-2.2 8.6-2.2 12.5 0" stroke={m.line} stroke-width="1.3" fill="none" />
      )}
      <path d="M33.6 14V4.6" {...S} stroke-width="2" />
      <path d="M34.2 4.8h10.4l-2.6 3 2.6 3H34.2z" fill={p.banner} {...S} stroke-width="1.6" />
    </g>
  );
}

function Tower(p: PartProps) {
  const { m } = p;
  if (p.mat === 'energy') {
    // A sentry pylon: a tapered mast with a floating crystal on a ring.
    return (
      <g>
        <path d="M24 53l4.6-30h6.8L40 53z" fill="#3B4452" {...S} stroke-width="2.2" />
        <path d="M27 50l3.4-24" stroke="#8A97AA" stroke-width="1.6" stroke-linecap="round" />
        <path d="M30.4 30h3.2v14h-3.2z" fill={p.glow} />
        <ellipse cx="32" cy="19.4" rx="11" ry="3.2" fill="none" stroke={p.glow} stroke-width="2.2" />
        <path d="M32 4.6l5 9-5 9.4-5-9.4z" fill={p.glow} {...S} stroke-width="1.8" />
        <path d="M32 6.6l-2.8 7" stroke="#F2FEFF" stroke-width="1.4" stroke-linecap="round" />
        <path d="M24.4 44.4h15" stroke={p.banner} stroke-width="3" />
      </g>
    );
  }
  const roof = p.mat === 'wood';
  return (
    <g>
      <path d="M21 53l2.4-31h17.2L43 53z" fill={m.face} {...S} stroke-width="2.2" />
      <path d="M34.6 22.4 36.6 53H43l-2.4-30.6z" fill={m.shade} opacity="0.55" />
      <path d="M24.8 50l1.8-26" stroke={m.light} stroke-width="1.8" stroke-linecap="round" />
      {roof ? (
        <>
          <path d="M16.6 22.6h30.8v-5.4H16.6z" fill={m.face} {...S} stroke-width="2" />
          <path d="M14 17.4 32 5.4l18 12z" fill={p.banner} {...S} stroke-width="2" />
          <path d="M19 15.6 32 7" stroke="#FFFFFF" stroke-width="1.4" opacity="0.55" stroke-linecap="round" />
        </>
      ) : (
        <>
          <path d="M16.6 23V15h4.4v3h4.2v-3h4.6v3h4.4v-3h4.6v3h4.2v-3h4.4v8z" fill={m.face} {...S} stroke-width="2" />
          <path d="M18.2 16.4v5" stroke={m.light} stroke-width="1.6" stroke-linecap="round" />
          <path d="M32 15V4.4" {...S} stroke-width="2" />
          <path d="M32.6 4.6h10l-2.6 3 2.6 3h-10z" fill={p.banner} {...S} stroke-width="1.6" />
        </>
      )}
      <path d="M30.2 28.6h3.6v8.2h-3.6z" fill={OUTLINE} />
      <path d="M28 53v-7a4 4 0 0 1 8 0v7z" fill={OUTLINE} />
      {p.mat === 'stone' ? <path d="M22.6 32.4h18.6M22.2 40.6h19.8" stroke={m.line} stroke-width="1.2" fill="none" /> : null}
    </g>
  );
}

function Camp(p: PartProps) {
  const cloth = p.mat === 'wood' ? '#C9A77C' : p.mat === 'sandbag' ? '#7A8350' : p.mat === 'energy' ? '#C7CFDA' : '#E6DDC6';
  const clothShade = p.mat === 'wood' ? '#8E6D45' : p.mat === 'sandbag' ? '#4F5732' : p.mat === 'energy' ? '#7F8A9A' : '#A89C80';
  return (
    <g>
      <path d="M6.5 53 32 15.4 57.5 53z" fill={cloth} {...S} stroke-width="2.2" />
      <path d="M32 15.4 57.5 53H32z" fill={clothShade} opacity="0.7" />
      <path d="M11.4 49.6 30 21.4" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.5" />
      {p.mat === 'energy' ? <path d="M9.4 49h45.2" stroke={p.glow} stroke-width="2.2" /> : <path d="M13 44.6h38" stroke={p.banner} stroke-width="3" opacity="0.9" />}
      <path d="M32 29.6 24.6 53h14.8z" fill={OUTLINE} />
      <path d="M32 29.6 27.6 53" stroke={cloth} stroke-width="1.6" opacity="0.7" />
      <path d="M32 15.4V4.6" {...S} stroke-width="2" />
      <path d="M32.6 4.8h10.2l-2.6 3 2.6 3H32.6z" fill={p.banner} {...S} stroke-width="1.6" />
      <path d="M52.4 53v-7.4h7.4V53z" fill="#8C6A3E" {...S} stroke-width="1.8" />
      <path d="M52.4 49.3h7.4" stroke="#4F3015" stroke-width="1.2" />
    </g>
  );
}

function Trap(p: { m: (typeof MAT)[Material]; spikes: boolean; glow: string }) {
  if (p.spikes) {
    return (
      <g>
        <ellipse cx="32" cy="47" rx="27" ry="9" fill="#4A3826" {...S} stroke-width="2.2" />
        <ellipse cx="32" cy="48.4" rx="21" ry="5.6" fill="#2A1E12" />
        {[
          [14, 30],
          [22, 24],
          [32, 21],
          [42, 24],
          [50, 30],
        ].map(([x, y], i) => (
          <g key={i}>
            <path d={`M${x! - 3.2} 49 ${x} ${y}l3.2 25z`} fill="#D8C9A4" {...S} stroke-width="1.8" />
            <path d={`M${x! - 1} 46 ${x} ${y! + 4}`} stroke="#FFFFFF" stroke-width="1.2" opacity="0.6" stroke-linecap="round" />
          </g>
        ))}
        <path d="M7 45.4c4-4 10-5.4 14-5.4M57 45.4c-4-4-10-5.4-14-5.4" stroke="#8C6E48" stroke-width="2.4" fill="none" stroke-linecap="round" />
      </g>
    );
  }
  // A mine or charge: a dome with a warning light, half buried, and a hazard ring.
  return (
    <g>
      <ellipse cx="32" cy="48" rx="27" ry="8.4" fill="#4E4430" {...S} stroke-width="2.2" />
      <ellipse cx="32" cy="48" rx="21" ry="5.6" fill="none" stroke="#F2C230" stroke-width="3" stroke-dasharray="5 4" />
      <path d="M17.6 47.6c0-11 28.8-11 28.8 0z" fill="#59616A" {...S} stroke-width="2.2" />
      <path d="M21.6 44.4c1.6-4 8-6 12-5.4" stroke="#AAB4BE" stroke-width="1.8" fill="none" stroke-linecap="round" />
      <path d="M29 36.4h6v-3.6h-6z" fill="#3A3F46" {...S} stroke-width="1.6" />
      <circle cx="32" cy="31.4" r="3" fill="#FF5A4A" {...S} stroke-width="1.4" />
      <circle cx="31" cy="30.4" r="1" fill="#FFFFFF" opacity="0.8" />
    </g>
  );
}
