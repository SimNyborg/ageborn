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

/** The six starter emotes every player has (DESIGN A5.8, A7.1). Bots use only these. */
export type BaseEmoteId = 'laugh' | 'salute' | 'cry' | 'angry' | 'thumbsUp' | 'gg';

/**
 * What an `emote` command carries: a starter emote, a collected emote (`emote.<id>`) or a curated
 * quote (`quote.<id>`) from the cosmetic collections (DESIGN A18.9.4). Quotes are fixed lines from
 * the content; there is no free text chat anywhere (A5.8, A7.1). The sim rejects ids the content
 * does not list.
 */
export type EmoteId = BaseEmoteId | `emote.${string}` | `quote.${string}`;

/** A cosmetic collection item key, `<collection>.<id>` (DESIGN A18.9.4), e.g. `nationalFlag.dk`. */
export type CosmeticKey = string;

/**
 * How a side's base looks (DESIGN A18.9.4): the equipped base flag, national flag, base skin per age
 * and decorations, as cosmetic keys. Presentation only: the sim ignores it and hashes skip it.
 */
export interface SideLook {
  baseFlag?: CosmeticKey | null;
  nationalFlag?: CosmeticKey | null;
  baseSkins?: Partial<Record<AgeId, CosmeticKey>>;
  /** One per decoration anchor, in anchor order; null leaves the anchor empty. */
  decorations?: (CosmeticKey | null)[];
  /** The backdrop skin of this side's half of the battlefield (`backdrop.<id>`); null or absent is classic. */
  backdrop?: CosmeticKey | null;
}

/**
 * A match format: an open string key into `content.formats` (DESIGN A18.3.4, A18.11). A format is a
 * window of consecutive ages with its clocks; the named ones are {@link FormatKind}s, and a window that
 * starts in a later age is one more `FormatDef` (e.g. `short.bronze`, `w2.medieval`).
 */
export type FormatId = string;

/**
 * The family of a format, for rewards, labels and ladder tables (A18.3.4): the tutorial, the three
 * named lengths (3, 5 and 7 ages) and `window` for the shorter War Path and custom windows (1, 2 and 4).
 */
export type FormatKind = 'tutorial' | 'short' | 'standard' | 'full' | 'window';

/** The named formats the ladder, Skirmish and Quick Battle offer (A2.10, A18.3.4). */
export type NamedFormatId = 'tutorial' | 'short' | 'standard' | 'full';

/**
 * Time Capsule tiers, lowest to highest (DESIGN A6.4): the ladder, index 0-6. Gold, Platinum and Aeon
 * always hold 1, 2 and 3 Legendaries (the 2026-09-29 ladder; Jade stays index 3, Aeon moved 4 → 6).
 */
export type CapsuleTier = 'clay' | 'bronze' | 'silver' | 'jade' | 'gold' | 'platinum' | 'aeon';

/** Card foil variants (DESIGN A5.1 collection, A6.4). */
export type Foil = 'none' | 'bronze' | 'silver' | 'holo';

/** Team colour presets, including colourblind-friendly ones (DESIGN A11, B5 team colour contract). */
export type TeamPreset = 'default' | 'blueYellow' | 'highContrast';

/**
 * Unit tags used by damage mods, targeting and rules (DESIGN A2.6). `structure` marks the hidden fort
 * twins (A16.14.8): the ×2 structure mod of Heavy, Legendary, siege and artillery attacks names it.
 */
export type Tag = 'light' | 'armored' | 'bio' | 'mech' | 'ground' | 'air' | 'legendary' | 'support' | 'ranged' | 'melee' | 'structure';

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
  | 'siegeHeavy'
  /** A fort's hidden twin unit (walls, towers, camps; A16.14.8). Never trained, never in a tray. */
  | 'fort';

/**
 * Role group: drives pop, queue conversion on evolve and bot scoring (DESIGN A2.4, A2.6, A2.7). `fort` is
 * the group of the hidden fort twins (A16.14.8): never queued, never converted.
 */
export type RoleGroup = 'infantry' | 'ranged' | 'heavy' | 'antiArmor' | 'support' | 'epic' | 'legendary' | 'fort';

/** Damage type; drives hit effects and sounds only, not numbers (DESIGN A14.2, A12). */
export type DmgType = 'blunt' | 'slash' | 'pierce' | 'bullet' | 'laser' | 'blast';

/** A 2D point. Units depend on the consumer (lu in the world, px in views). */
export interface Pt {
  x: number;
  y: number;
}

/** Success or failure with a reason, used by fallible pure operations (DESIGN B9, B8). */
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
