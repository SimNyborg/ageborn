/**
 * i18n key conventions for content strings (DESIGN B4 Strings). The English strings live in
 * `src/i18n/content.en.json`; Danish files with the same keys arrive in v1.1.
 *
 * Content owns these top-level key namespaces (keys are global across string files):
 * `card`, `skin`, `age`, `format`, `rarity`, `role`, `group`, `tag`, `foil`, `capsuleTier`,
 * `capsuleKind`, `arena`, `general`, `quest`, `modifier`, `banner`, `frame`, `title`, `emote`.
 * Card keys (`card.<slug>.name` / `.desc`) are set in `src/content/raw` (WP0).
 */
import type { AgeId, BaseEmoteId, CapsuleTier, EmoteId, Foil, FormatId, Rarity, Role, RoleGroup, Tag } from '@/contracts/ids';
import type { CosmeticCollection, FlagRegion } from './types';
import type { PendingCapsule } from '@/contracts/save';

export const ageNameKey = (age: AgeId): string => `age.${age}.name`;
/** The new mechanic an age introduces (A2.5), for age intro cards. */
export const ageMechanicKey = (age: AgeId): string => `age.${age}.mechanic`;
export const formatNameKey = (format: FormatId): string => `format.${format}.name`;
export const formatDescKey = (format: FormatId): string => `format.${format}.desc`;
export const rarityNameKey = (rarity: Rarity): string => `rarity.${rarity}.name`;
export const roleNameKey = (role: Role): string => `role.${role}.name`;
export const groupNameKey = (group: RoleGroup): string => `group.${group}.name`;
export const tagNameKey = (tag: Tag): string => `tag.${tag}.name`;
export const foilNameKey = (foil: Foil): string => `foil.${foil}.name`;
export const capsuleTierNameKey = (tier: CapsuleTier): string => `capsuleTier.${tier}.name`;
/** The tier's short name ("Gold"), for odds lines and chips (A6.4). */
export const capsuleTierShortKey = (tier: CapsuleTier): string => `capsuleTier.${tier}.short`;
export const capsuleKindNameKey = (kind: PendingCapsule['kind']): string => `capsuleKind.${kind}.name`;
export const arenaNameKey = (id: string): string => `arena.${id}.name`;
export const skinNameKey = (id: string): string => `skin.${id}.name`;
/** The skin's look (A5.8 "Look" column), shown in the skin picker and crate reveal. */
export const skinLookKey = (id: string): string => `skin.${id}.look`;
export const generalKey = (id: string, field: 'name' | 'personality' | 'signature' | 'line'): string =>
  `general.${id}.${field}`;
export const questNameKey = (id: string): string => `quest.${id}.name`;
export const modifierNameKey = (id: string): string => `modifier.${id}.name`;
export const modifierDescKey = (id: string): string => `modifier.${id}.desc`;
export const bannerNameKey = (id: string): string => `banner.${id}.name`;
export const frameNameKey = (id: string): string => `frame.${id}.name`;
export const titleNameKey = (id: string): string => `title.${id}.name`;
export const titleUnlockKey = (id: string): string => `title.${id}.unlock`;
export const emoteNameKey = (id: BaseEmoteId): string => `emote.${id}.name`;
/** A cosmetic collection item's name (A18.9.4): `cosmetic.<collection>.<id>.name`. */
export const cosmeticNameKey = (collection: CosmeticCollection, id: string): string => `cosmetic.${collection}.${id}.name`;
/** A quote's fixed line: `cosmetic.quote.<id>.text`. */
export const quoteTextKey = (id: string): string => `cosmetic.quote.${id}.text`;
/** A collection's name: `cosmetic.collection.<collection>`. */
export const cosmeticCollectionKey = (collection: CosmeticCollection): string => `cosmetic.collection.${collection}`;
/**
 * Other names a national flag is searched by (PLAN 2d: "UK", "USA", "Holland"), comma separated:
 * `cosmetic.nationalFlag.<id>.aliases` (`src/i18n/flags.en.json`); most flags have none.
 */
export const flagAliasesKey = (id: string): string => `cosmetic.nationalFlag.${id}.aliases`;
/** A Flag Atlas browsing group's name (PLAN 2d): `cosmetic.flagRegion.<region>.name` (`src/i18n/flags.en.json`). */
export const flagRegionNameKey = (region: FlagRegion): string => `cosmetic.flagRegion.${region}.name`;
/** An age's classic scene, which is not an item (PLAN 2b): `cosmetic.sceneClassic.<age>.name` (`src/i18n/scenes.en.json`). */
export const sceneClassicNameKey = (age: AgeId): string => `cosmetic.sceneClassic.${age}.name`;
/**
 * What an emote command shows: a starter emote's name, a collected emote's name, or a quote's line.
 */
export function emoteLabelKey(e: EmoteId): string {
  if (e.startsWith('emote.')) return cosmeticNameKey('emote', e.slice(6));
  if (e.startsWith('quote.')) return quoteTextKey(e.slice(6));
  return emoteNameKey(e as BaseEmoteId);
}
