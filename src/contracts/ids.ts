/**
 * Shared identifiers and primitive types (DESIGN B15 `ids.ts`).
 *
 * Contracts are owned by WP0 and frozen after Phase 0 (DESIGN C1, B15).
 * Layering: `contracts` imports nothing but itself (DESIGN B2).
 */

/** Side of the lane. 0 = player, left, faces right, blue; 1 = opponent, right, orange (DESIGN A2.1). */
export type Side = 0 | 1;

/**
 * The eight ages, in order (DESIGN A17.8: Stone, Bronze, Medieval, Gunpowder, Industrial, Modern, Future,
 * Cosmic). Ages are data; a new age needs only content, visuals and audio entries plus one id here (A17.15).
 */
export type AgeId = 'stone' | 'bronze' | 'medieval' | 'gunpowder' | 'industrial' | 'modern' | 'future' | 'cosmic';

/** Card rarity (DESIGN A5.1, A6.4). */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Skin rarity (DESIGN A5.8). 'mythic' arrives in v1.1. */
export type SkinRarity = 'rare' | 'epic' | 'legendary';

/** Card slug, e.g. `bonker` (DESIGN A5, A14). */
export type CardId = string;
/** Skin id (DESIGN A5.8). */
export type SkinId = string;
/** Visual manifest key, e.g. `unit.bonker`, `unit.bonker@pumpkin_head` (DESIGN A14.1, B5). */
export type VisualId = string;
/** Effect id, e.g. `fx.blast` (DESIGN A14.1). */
export type EffectId = string;
/** Sound manifest key, e.g. `swing_whoosh` (DESIGN A13, A14.2, B7). */
export type SoundId = string;
/** Music cue, e.g. `music.stone` (DESIGN A14.3). */
export type MusicCueId = string;

/** The six emotes; there is no text chat (DESIGN A5.8, A7.1). */
export type EmoteId = 'laugh' | 'salute' | 'cry' | 'angry' | 'thumbsUp' | 'gg';

/** Match formats (DESIGN A2.10). */
export type FormatId = 'tutorial' | 'short' | 'standard' | 'full';

/** Time Capsule tiers, lowest to highest (DESIGN A6.4). */
export type CapsuleTier = 'clay' | 'bronze' | 'silver' | 'jade' | 'aeon';

/** Card foil variants (DESIGN A5.1 collection, A6.4). */
export type Foil = 'none' | 'bronze' | 'silver' | 'holo';

/** Team colour presets, including colourblind-friendly ones (DESIGN A11, B5 team colour contract). */
export type TeamPreset = 'default' | 'blueYellow' | 'highContrast';

/** Unit tags used by damage mods, targeting and rules (DESIGN A2.6). */
export type Tag = 'light' | 'armored' | 'bio' | 'mech' | 'ground' | 'air' | 'legendary' | 'support' | 'ranged' | 'melee';

/** Card role (DESIGN A2.6, A5 tables). */
export type Role =
  | 'infantry'
  | 'ranged'
  | 'heavy'
  | 'antiArmor'
  | 'support'
  | 'skirmisher'
  | 'siege'
  | 'artillery'
  | 'airBomber'
  | 'airGunship'
  | 'antiMech'
  | 'siegeHeavy';

/** Role group: drives pop, queue conversion on evolve and bot scoring (DESIGN A2.4, A2.6, A2.7). */
export type RoleGroup = 'infantry' | 'ranged' | 'heavy' | 'antiArmor' | 'support' | 'epic' | 'legendary';

/** Damage type; drives hit effects and sounds only, not numbers (DESIGN A14.2, A12). */
export type DmgType = 'blunt' | 'slash' | 'pierce' | 'bullet' | 'laser' | 'blast';

/** A 2D point. Units depend on the consumer (lu in the world, px in views). */
export interface Pt {
  x: number;
  y: number;
}

/** Success or failure with a reason, used by fallible pure operations (DESIGN B9, B8). */
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
