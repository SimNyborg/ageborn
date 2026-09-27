/**
 * i18n key conventions for content strings (DESIGN B4 Strings). The English strings live in
 * `src/i18n/content.en.json`; Danish files with the same keys arrive in v1.1.
 *
 * Content owns these top-level key namespaces (keys are global across string files):
 * `card`, `skin`, `age`, `format`, `rarity`, `role`, `group`, `tag`, `foil`, `capsuleTier`,
 * `capsuleKind`, `arena`, `general`, `quest`, `modifier`, `banner`, `frame`, `title`, `emote`.
 * Card keys (`card.<slug>.name` / `.desc`) are set in `src/content/raw` (WP0).
 */
import type { AgeId, CapsuleTier, EmoteId, Foil, FormatId, Rarity, Role, RoleGroup, Tag } from '@/contracts/ids';
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
export const emoteNameKey = (id: EmoteId): string => `emote.${id}.name`;
