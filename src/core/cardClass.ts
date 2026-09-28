/**
 * Card classes (owner feedback 2026-09-28 "card class and counters visible", DESIGN A2.6).
 *
 * Every unit shows one player-facing class, derived from its role and tags so content stays the
 * single source of truth: Infantry, Ranged, Heavy, Anti-armor, Siege, Support or Air. Legendary is
 * a marker on top of the class (a Legendary Heavy is still Heavy); turrets and powers have their
 * own kinds. The glyphs are plain SVG path data (no DOM) so the UI and the capsule show draw the
 * very same shapes. Shapes differ per class, so the icons never rely on colour alone.
 */
import type { CardId, UnitDef } from '@/contracts';

export type UnitClass = 'infantry' | 'ranged' | 'heavy' | 'antiArmor' | 'siege' | 'support' | 'air';
export type CardClass = UnitClass | 'turret' | 'power';
/** Everything a class icon can show: a class, or the Legendary marker. */
export type ClassGlyphId = CardClass | 'legendary';

/** Display order everywhere (filters, Strong vs / Weak vs lists, the legend). */
export const UNIT_CLASSES: readonly UnitClass[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'siege', 'support', 'air'];

/** The class of a unit card (A2.6 roles and tags). Air units are Air whatever their role. */
export function unitClass(u: Pick<UnitDef, 'role' | 'tags'>): UnitClass {
  if (u.tags.includes('air')) return 'air';
  switch (u.role) {
    case 'infantry':
    case 'skirmisher':
      return 'infantry';
    case 'ranged':
      return 'ranged';
    case 'heavy':
    case 'siegeHeavy':
      return 'heavy';
    case 'antiArmor':
    case 'antiMech':
      return 'antiArmor';
    case 'siege':
    case 'artillery':
      return 'siege';
    case 'support':
      return 'support';
    case 'airBomber':
    case 'airGunship':
      return 'air';
  }
}

/** True for Legendary units (shown as a crown marker next to the class). */
export function isLegendaryUnit(u: Pick<UnitDef, 'rarity' | 'tags'>): boolean {
  return u.rarity === 'legendary' || u.tags.includes('legendary');
}

/** The distinct classes of a card list (the compiled `strongVs` / `weakVs`), in display order. */
export function classesOf(ids: readonly CardId[], units: Readonly<Record<CardId, Pick<UnitDef, 'role' | 'tags'> | undefined>>): UnitClass[] {
  const seen = new Set<UnitClass>();
  for (const id of ids) {
    const u = units[id];
    if (u) seen.add(unitClass(u));
  }
  return UNIT_CLASSES.filter((c) => seen.has(c));
}

/**
 * Strong vs / Weak vs as classes. A class that shows up on both lists goes to the list that names
 * more of its cards, and is dropped on a tie, so a card never reads "Strong vs Heavy, Weak vs Heavy".
 */
export function counterClasses(
  strongVs: readonly CardId[],
  weakVs: readonly CardId[],
  units: Readonly<Record<CardId, Pick<UnitDef, 'role' | 'tags'> | undefined>>,
): { strong: UnitClass[]; weak: UnitClass[] } {
  const score = new Map<UnitClass, number>();
  const add = (ids: readonly CardId[], d: number) => {
    for (const id of ids) {
      const u = units[id];
      if (u) score.set(unitClass(u), (score.get(unitClass(u)) ?? 0) + d);
    }
  };
  add(strongVs, 1);
  add(weakVs, -1);
  const s = new Set(classesOf(strongVs, units));
  const w = new Set(classesOf(weakVs, units));
  return {
    strong: UNIT_CLASSES.filter((c) => s.has(c) && (!w.has(c) || (score.get(c) ?? 0) > 0)),
    weak: UNIT_CLASSES.filter((c) => w.has(c) && (!s.has(c) || (score.get(c) ?? 0) < 0)),
  };
}

/**
 * The counter legend (A2.6 counter triangle plus air and siege): `a` beats `b`. The first three
 * rows are the triangle the War Plan draws; the rest are the side notes.
 */
export const COUNTER_LEGEND: readonly { a: CardClass; b: CardClass; note: string }[] = [
  { a: 'heavy', b: 'infantry', note: 'armor' },
  { a: 'antiArmor', b: 'heavy', note: 'pierce' },
  { a: 'infantry', b: 'antiArmor', note: 'swarm' },
  { a: 'air', b: 'infantry', note: 'melee' },
  { a: 'ranged', b: 'air', note: 'shootDown' },
  { a: 'siege', b: 'turret', note: 'splash' },
];

/**
 * Class colours (Okabe-Ito based, colourblind-safe) for the badge disc. Presentation data only;
 * the shape is what tells classes apart.
 */
export const CLASS_COLOR: Readonly<Record<ClassGlyphId, { main: string; dark: string }>> = {
  infantry: { main: '#E69F00', dark: '#8A5A00' },
  ranged: { main: '#56B4E9', dark: '#1F6E9C' },
  heavy: { main: '#7E8FAE', dark: '#3E4A63' },
  antiArmor: { main: '#D55E00', dark: '#7F3500' },
  siege: { main: '#CC79A7', dark: '#7D3D62' },
  support: { main: '#009E73', dark: '#005C43' },
  air: { main: '#3C8DDB', dark: '#1B4C85' },
  legendary: { main: '#FFC23A', dark: '#9A6A00' },
  turret: { main: '#A08A70', dark: '#5E4C38' },
  power: { main: '#B16CF0', dark: '#5E2E8C' },
};

/** One SVG element of a glyph on a 24 × 24 view box. `fill: 'glyph'` uses the light glyph colour. */
export interface GlyphPart {
  d: string;
  fill?: 'glyph' | 'ink' | 'none';
  /** Stroke width in tenths of a view-box unit (integers: core bans float literals, B3); the stroke is the dark ink unless `strokeGlyph`. */
  stroke?: number;
  strokeGlyph?: boolean;
  /** An SVG transform (for mirrored halves). */
  transform?: string;
}

const WING = 'M12 9.2C10.4 6.4 6.9 4.6 2.4 4.8c.7 3 2.5 5.3 5 6.2-1.6.4-2.6 1.6-2.4 3.2 2.4.6 5 .1 7-1.6z';

/** The glyph shapes, each distinct in silhouette. */
export const CLASS_GLYPH: Readonly<Record<ClassGlyphId, readonly GlyphPart[]>> = {
  // A sword pointing up and right.
  infantry: [
    { d: 'M17.2 3.3h3.5v3.5L10.6 16.9l-3.5-3.5z', fill: 'glyph', stroke: 14 },
    { d: 'M5 12.6l6.4 6.4', stroke: 34 },
    { d: 'M5 12.6l6.4 6.4', stroke: 15, strokeGlyph: true },
    { d: 'M4 20l3.2-3.2', stroke: 32 },
  ],
  // A drawn bow with an arrow.
  ranged: [
    { d: 'M6.5 3.2c7.4 1.6 12.7 6.9 14.3 14.3', fill: 'none', stroke: 44 },
    { d: 'M6.5 3.2c7.4 1.6 12.7 6.9 14.3 14.3', fill: 'none', stroke: 22, strokeGlyph: true },
    { d: 'M6.5 3.2 20.8 17.5', stroke: 11 },
    { d: 'M3.4 20.6 15 9', stroke: 26 },
    { d: 'M17.8 6.2 12.6 7.4l4 4z', fill: 'glyph', stroke: 12 },
  ],
  // A kite shield with a boss.
  heavy: [
    { d: 'M12 2.6l8 2.9v6.2c0 5.1-3.5 8.6-8 10.2-4.5-1.6-8-5.1-8-10.2V5.5z', fill: 'glyph', stroke: 15 },
    { d: 'M12 5.6v13.2M7.2 10.4h9.6', stroke: 17 },
  ],
  // A spear driving down through a cracked armor plate.
  antiArmor: [
    { d: 'M2.8 14.2h7.4l1.1 1.6-1.1 1.6h-7.4zM13.8 14.2h7.4v3.2h-7.4l-1.1-1.6z', fill: 'glyph', stroke: 13 },
    { d: 'M12 2.5v10', stroke: 32 },
    { d: 'M12 2.5v10', stroke: 13, strokeGlyph: true },
    { d: 'M12 21.6 8.6 12.4h6.8z', fill: 'glyph', stroke: 14 },
  ],
  // A lit bomb (cannonball with fuse and spark).
  siege: [
    { d: 'M10.6 20.8a6.6 6.6 0 1 0 0-13.2 6.6 6.6 0 0 0 0 13.2z', fill: 'glyph', stroke: 15 },
    { d: 'M8 11.2a3 3 0 0 1 2.4-1.4', fill: 'none', stroke: 13 },
    { d: 'M14.8 9.2l2.6-2.6', stroke: 22 },
    { d: 'M19 2.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z', fill: 'glyph', stroke: 11 },
  ],
  // A medic cross.
  support: [{ d: 'M9 3.2h6v5.8h5.8v6H15v5.8H9V15H3.2V9H9z', fill: 'glyph', stroke: 15 }],
  // A pair of wings.
  air: [
    { d: WING, fill: 'glyph', stroke: 13 },
    { d: WING, fill: 'glyph', stroke: 13, transform: 'matrix(-1 0 0 1 24 0)' },
    { d: 'M12 7.6c1.3 0 2 1.4 2 3.4 0 3-1 6.6-2 9.4-1-2.8-2-6.4-2-9.4 0-2 .7-3.4 2-3.4z', fill: 'glyph', stroke: 13 },
  ],
  // A crown.
  legendary: [
    { d: 'M3.2 8.2l4.6 3.6L12 4.8l4.2 7 4.6-3.6-1.8 10.6H5z', fill: 'glyph', stroke: 14 },
    { d: 'M5.4 16h13.2', stroke: 12 },
  ],
  // A crenellated tower.
  turret: [
    { d: 'M5.5 21V4.2h2.9v2.2h2.1V4.2h3v2.2h2.1V4.2h2.9V21z', fill: 'glyph', stroke: 14 },
    { d: 'M10 21v-4a2 2 0 0 1 4 0v4z', fill: 'ink' },
    { d: 'M10.8 10.2h2.4v2.6h-2.4z', fill: 'ink' },
  ],
  // A lightning bolt.
  power: [{ d: 'M13.8 2.4 4.8 13.6h6l-1.6 8 9-11.2h-6z', fill: 'glyph', stroke: 14 }],
};

