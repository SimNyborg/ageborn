/**
 * Types shared by the capsule show (WP10, DESIGN A10, A10.1).
 *
 * The show consumes the reveal data (`CapsuleReveal`, `WardrobeReveal`) only. Everything else it
 * needs to *present* a card (its age, visual id and name key) or a skin arrives through a small
 * injected `CapsuleCatalog`, and duplicate progress through a `ProgressLookup`, both built by the
 * app from content and the save. The show never rolls, changes or reinterprets a result.
 */
import type { AgeId, CardId, PendingCapsule, Rarity, RoleGroup, SaveDoc, SkinId, SkinRarity, VisualId } from '@/contracts';

export type CapsuleKind = PendingCapsule['kind'];

/** How to draw and name one card. */
export interface CardInfo {
  /** Null when unknown: the walkout then shows no age glyph. */
  age: AgeId | null;
  visualId: VisualId;
  nameKey: string;
  /** Which `ArtProvider` view stages it in a walkout: units walk out, turrets drop in and fire. */
  view: 'unit' | 'turret';
  /** A unit's role group (its ground-ring glyph); null for turrets and unknown ids. */
  group: RoleGroup | null;
}

/** How to draw and name one skin. */
export interface SkinInfo {
  rarity: SkinRarity;
  /** The skinned card, or `base.<age>` for base skins (A5.8). */
  target: string;
  visualId: VisualId;
  nameKey: string;
}

/** Presentation lookups injected by the app (built from content with `createCatalog`). */
export interface CapsuleCatalog {
  card(id: CardId): CardInfo;
  skin(id: SkinId): SkinInfo;
  /** False for fixed-tier kinds (Trophy Road, Age, Codex, Conquest, Age Unlock): the show starts at the burst (A6.4, A10). */
  hasClimb(kind: CapsuleKind): boolean;
}

/**
 * A card's copies bar around this reveal (A10 step 7). `before`/`after` are the unspent copies
 * before and after the capsule(s) were opened; `need` is the copies for the next level, or null
 * at the level cap (the copies became Dust).
 */
export interface CardProgress {
  level: number;
  before: number;
  after: number;
  need: number | null;
}

export type ProgressLookup = (card: CardId, rarity: Rarity) => CardProgress | null;

/**
 * Pity thresholds shown on every capsule screen (A6.5). Field names match `content.capsules.pity`,
 * so the app can pass that object straight through.
 */
export interface PityRules {
  epicEvery: number;
  legendaryGuaranteeAt: number;
  newCardEvery: number;
  wardrobeEpicEvery: number;
  wardrobeLegendaryEvery: number;
}

export type PityCounters = SaveDoc['pity'];

/** A10 defaults; content is the source of truth when the app passes its table. */
export const DEFAULT_PITY_RULES: PityRules = {
  epicEvery: 10,
  legendaryGuaranteeAt: 40,
  newCardEvery: 5,
  wardrobeEpicEvery: 5,
  wardrobeLegendaryEvery: 25,
};

/** Player settings the show honours (A12 reduce motion, A13 vibrate). */
export interface ShowSettings {
  reduceMotion: boolean;
  vibrate: boolean;
  teamPreset: SaveDoc['settings']['teamPreset'];
}

export const DEFAULT_SHOW_SETTINGS: ShowSettings = { reduceMotion: false, vibrate: true, teamPreset: 'default' };
