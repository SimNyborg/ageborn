/**
 * The avatar creator's parts ("Make your General", owner request 2026-10-07, AUDIT §6). Data only:
 * id, slot, rarity and source; the UI draws each id (`src/ui/components/avatar`).
 *
 * - **Starter parts** (free, 87): skin tone and the other colours are tints; face 5, eyes 10, brows 8,
 *   nose 6, mouth 10, hair 16, facial hair 8, headwear 6 (the six legacy hats, so every old look keeps
 *   its hat), tops 6, accessories 4, backgrounds 8.
 * - **Wearables** (earned only, never sold, 96): 36 Common, 28 Rare, 20 Epic, 12 Legendary. Sources:
 *   each age's War Path boss (Epic headwear) and star chest (Rare top), 12 Trophy Road nodes, the
 *   Time Capsule cosmetic roll (Common to Epic), the Wardrobe Crate (Rare to Legendary), the four
 *   collection milestones (named Legendaries) and eight hidden feats (Epics). They are also items of the
 *   `avatar` cosmetic collection, so ownership, drops, odds, duplicates and Dust crafting follow the
 *   existing collection rules exactly.
 * - Every name is our own.
 */
import type { AgeId, AvatarSlot, Rarity } from '@/contracts';
import type { AvatarLookDef, AvatarPartDef, AvatarTables, CosmeticItemDef, CosmeticSource } from '../types';

const START: CosmeticSource = { kind: 'start' };

function starters(slot: AvatarSlot, prefix: string, names: readonly string[]): AvatarPartDef[] {
  return names.map((n) => ({ id: `${prefix}_${n}`, slot, rarity: 'starter', source: START, nameKey: `avatar.part.${prefix}_${n}.name` }));
}

const STARTERS: AvatarPartDef[] = [
  ...starters('face', 'face', ['round', 'oval', 'square', 'long', 'heart']),
  ...starters('eyes', 'eyes', ['bright', 'wide', 'happy', 'sleepy', 'sharp', 'round', 'almond', 'wink', 'tired', 'starry']),
  ...starters('brows', 'brows', ['determined', 'raised', 'arched', 'bushy', 'thin', 'scarred', 'uni', 'worried']),
  ...starters('nose', 'nose', ['button', 'round', 'long', 'hook', 'wide', 'small']),
  ...starters('mouth', 'mouth', ['smile', 'grin', 'flat', 'shout', 'smirk', 'whistle', 'toothy', 'gap', 'laugh', 'frown']),
  ...starters('hair', 'hair', ['bald', 'crop', 'spikes', 'long', 'topknot', 'mohawk', 'braids', 'bob', 'curls', 'afro', 'ponytail', 'sidepart', 'buzz', 'bun', 'wild', 'tiedback']),
  ...starters('facialHair', 'beard', ['none', 'stubble', 'full', 'moustache', 'goatee', 'chops', 'braided', 'handlebar']),
  ...starters('headwear', 'hat', ['none', 'horned_helm', 'headband', 'ranger_hat', 'tin_crown', 'olive_helmet']),
  ...starters('top', 'top', ['tunic', 'hoodie', 'vest', 'tee', 'padded', 'robe']),
  ...starters('accessory', 'acc', ['none', 'war_paint', 'freckles', 'bandage']),
  ...starters('background', 'bg', ['sky', 'meadow', 'violet', 'ember', 'sun', 'lagoon', 'rose', 'slate']),
];

const capsule: CosmeticSource = { kind: 'capsule' };
const crate: CosmeticSource = { kind: 'crate' };
const road = (trophies: number): CosmeticSource => ({ kind: 'road', trophies });
const feat = (f: string): CosmeticSource => ({ kind: 'feat', feat: f });
const boss = (age: AgeId): CosmeticSource => ({ kind: 'warPathBoss', age });
const chest = (age: AgeId): CosmeticSource => ({ kind: 'warPathStars', age });
const title = (t: string): CosmeticSource => ({ kind: 'title', title: t });

type W = [id: string, rarity: Rarity, source: CosmeticSource, age?: AgeId];

const HEADWEAR: W[] = [
  ['hat_wool_cap', 'common', road(50)],
  ['hat_bone_band', 'common', capsule, 'stone'],
  ['hat_straw_hat', 'common', capsule, 'bronze'],
  ['hat_hood', 'common', capsule, 'medieval'],
  ['hat_sailor_cap', 'common', capsule, 'gunpowder'],
  ['hat_flat_cap', 'common', road(1350), 'industrial'],
  ['hat_beret', 'common', capsule, 'modern'],
  ['hat_field_cap', 'common', capsule, 'modern'],
  ['hat_space_beanie', 'common', capsule, 'future'],
  ['hat_bandana', 'common', capsule],
  ['hat_laurel', 'rare', road(1050), 'bronze'],
  ['hat_coif', 'rare', capsule, 'medieval'],
  ['hat_tricorne', 'rare', capsule, 'gunpowder'],
  ['hat_pith_helmet', 'rare', capsule, 'industrial'],
  ['hat_aviator', 'rare', capsule, 'modern'],
  ['hat_visor_band', 'rare', crate, 'future'],
  ['hat_feather_cap', 'rare', crate, 'medieval'],
  ['hat_wizard', 'rare', capsule, 'cosmic'],
  ['hat_pirate', 'rare', crate, 'gunpowder'],
  ['hat_mammoth_hood', 'epic', boss('stone'), 'stone'],
  ['hat_crest_helm', 'epic', boss('bronze'), 'bronze'],
  ['hat_great_helm', 'epic', boss('medieval'), 'medieval'],
  ['hat_bicorne', 'epic', boss('gunpowder'), 'gunpowder'],
  ['hat_top_hat', 'epic', boss('industrial'), 'industrial'],
  ['hat_tank_goggles', 'epic', boss('modern'), 'modern'],
  ['hat_holo_crown', 'epic', boss('future'), 'future'],
  ['hat_astro_helm', 'epic', boss('cosmic'), 'cosmic'],
  ['hat_frost_helm', 'epic', feat('horn_of_legends')],
  ['hat_sun_crown', 'legendary', crate],
  ['hat_chrono_helm', 'legendary', crate],
  ['hat_curator_laurel', 'legendary', title('grand_curator')],
  ['hat_starborn_halo', 'legendary', road(5000), 'cosmic'],
];

const TOPS: W[] = [
  ['top_fur_wrap', 'common', capsule, 'stone'],
  ['top_linen_chiton', 'common', capsule, 'bronze'],
  ['top_peasant_tunic', 'common', road(300), 'medieval'],
  ['top_sailor_shirt', 'common', capsule, 'gunpowder'],
  ['top_work_overalls', 'common', capsule, 'industrial'],
  ['top_jumpsuit', 'common', capsule, 'modern'],
  ['top_track_jacket', 'common', capsule, 'modern'],
  ['top_cadet_suit', 'common', capsule, 'future'],
  ['top_space_poncho', 'common', capsule, 'cosmic'],
  ['top_scarf_sweater', 'common', road(2100)],
  ['top_apron', 'common', capsule],
  ['top_rain_slicker', 'common', capsule],
  ['top_fur_mantle', 'rare', chest('stone'), 'stone'],
  ['top_bronze_cuirass', 'rare', chest('bronze'), 'bronze'],
  ['top_surcoat', 'rare', chest('medieval'), 'medieval'],
  ['top_naval_coat', 'rare', chest('gunpowder'), 'gunpowder'],
  ['top_waistcoat', 'rare', chest('industrial'), 'industrial'],
  ['top_flight_jacket', 'rare', chest('modern'), 'modern'],
  ['top_hardlight_suit', 'rare', chest('future'), 'future'],
  ['top_star_cloak', 'rare', chest('cosmic'), 'cosmic'],
  ['top_chainmail', 'rare', road(1700), 'medieval'],
  ['top_ranger_cloak', 'rare', crate],
  ['top_dragon_scale', 'epic', feat('caveman_diplomacy')],
  ['top_admiral_coat', 'epic', feat('arrows_into_tomorrow'), 'gunpowder'],
  ['top_steam_armor', 'epic', road(2800), 'industrial'],
  ['top_nebula_cape', 'epic', capsule, 'cosmic'],
  ['top_mech_harness', 'epic', feat('no_walls'), 'future'],
  ['top_royal_robe', 'epic', crate, 'medieval'],
  ['top_titan_pauldrons', 'legendary', title('master_smith')],
  ['top_archivist_robe', 'legendary', title('archivist')],
  ['top_phoenix_mantle', 'legendary', crate],
  ['top_aeon_armor', 'legendary', crate],
];

const ACCESSORIES: W[] = [
  ['acc_bone_necklace', 'common', road(700), 'stone'],
  ['acc_eyepatch', 'common', capsule],
  ['acc_monocle', 'common', capsule, 'industrial'],
  ['acc_round_glasses', 'common', capsule],
  ['acc_red_scarf', 'common', capsule],
  ['acc_medal', 'common', capsule, 'modern'],
  ['acc_goggles', 'common', capsule, 'industrial'],
  ['acc_aviator_shades', 'rare', road(2500), 'modern'],
  ['acc_war_horn', 'rare', crate, 'medieval'],
  ['acc_compass_pendant', 'rare', capsule, 'gunpowder'],
  ['acc_cyber_eye', 'rare', capsule, 'future'],
  ['acc_gold_chain', 'rare', crate],
  ['acc_dragon_tooth', 'epic', feat('underdog')],
  ['acc_holo_monocle', 'epic', feat('humble_beginnings'), 'future'],
  ['acc_scout_spyglass', 'legendary', title('card_scout')],
  ['acc_comet_orbit', 'legendary', crate, 'cosmic'],
];

const BACKGROUNDS: W[] = [
  ['bg_cave', 'common', capsule, 'stone'],
  ['bg_temple', 'common', capsule, 'bronze'],
  ['bg_castle', 'common', capsule, 'medieval'],
  ['bg_harbor', 'common', capsule, 'gunpowder'],
  ['bg_foundry', 'common', capsule, 'industrial'],
  ['bg_city', 'common', capsule, 'modern'],
  ['bg_skyline', 'common', capsule, 'future'],
  ['bg_nebula', 'rare', road(3500), 'cosmic'],
  ['bg_sunset_dunes', 'rare', capsule],
  ['bg_aurora', 'rare', capsule],
  ['bg_volcano', 'rare', crate],
  ['bg_battle_flags', 'epic', road(4300)],
  ['bg_storm', 'epic', feat('back_from_the_brink')],
  ['bg_starfield', 'epic', feat('photo_finish')],
  ['bg_golden_sky', 'legendary', crate],
  ['bg_time_vortex', 'legendary', crate],
];

const wear = (slot: AvatarSlot, list: W[]): AvatarPartDef[] =>
  list.map(([id, rarity, source, age]) => ({ id, slot, rarity, source, nameKey: `cosmetic.avatar.${id}.name`, ...(age ? { age } : {}) }));

const WEARABLES: AvatarPartDef[] = [...wear('headwear', HEADWEAR), ...wear('top', TOPS), ...wear('accessory', ACCESSORIES), ...wear('background', BACKGROUNDS)];

const g = (
  face: string, eyes: string, brows: string, nose: string, mouth: string, hair: string, facialHair: string,
  headwear: string, top: string, accessory: string, background: string, skin: number, hairTint: number, eyesTint: number, cloth: number,
): AvatarLookDef => ({ look: { face, eyes, brows, nose, mouth, hair, facialHair, headwear, top, accessory, background }, tints: { skin, hair: hairTint, eyes: eyesTint, cloth } });

/** Each General's signature look: Grogg's mammoth hood, Kettle's brimmed helm, the Warden's visor (AUDIT #18). */
const GENERALS: Record<string, AvatarLookDef> = {
  grogg: g('face_square', 'eyes_round', 'brows_bushy', 'nose_round', 'mouth_grin', 'hair_wild', 'beard_full', 'hat_mammoth_hood', 'top_fur_wrap', 'acc_none', 'bg_cave', 3, 3, 0, 5),
  pip: g('face_round', 'eyes_wide', 'brows_raised', 'nose_button', 'mouth_smile', 'hair_topknot', 'beard_none', 'hat_bone_band', 'top_fur_wrap', 'acc_war_paint', 'bg_meadow', 1, 9, 3, 5),
  kettle: g('face_oval', 'eyes_sharp', 'brows_determined', 'nose_long', 'mouth_shout', 'hair_crop', 'beard_moustache', 'hat_ranger_hat', 'top_surcoat', 'acc_none', 'bg_ember', 2, 8, 2, 0),
  moss: g('face_long', 'eyes_sleepy', 'brows_bushy', 'nose_hook', 'mouth_flat', 'hair_long', 'beard_braided', 'hat_coif', 'top_chainmail', 'acc_none', 'bg_castle', 4, 10, 5, 6),
  ledger: g('face_heart', 'eyes_almond', 'brows_arched', 'nose_small', 'mouth_smirk', 'hair_sidepart', 'beard_chops', 'hat_tricorne', 'top_waistcoat', 'acc_monocle', 'bg_harbor', 0, 1, 1, 0),
  boomsworth: g('face_round', 'eyes_wide', 'brows_raised', 'nose_round', 'mouth_grin', 'hair_crop', 'beard_handlebar', 'hat_bicorne', 'top_naval_coat', 'acc_medal', 'bg_battle_flags', 5, 11, 0, 6),
  twins: g('face_oval', 'eyes_almond', 'brows_thin', 'nose_small', 'mouth_smile', 'hair_bob', 'beard_none', 'hat_none', 'top_flight_jacket', 'acc_aviator_shades', 'bg_city', 2, 0, 1, 5),
  twins_b: g('face_oval', 'eyes_bright', 'brows_determined', 'nose_small', 'mouth_grin', 'hair_buzz', 'beard_goatee', 'hat_aviator', 'top_flight_jacket', 'acc_none', 'bg_city', 4, 0, 1, 5),
  rook: g('face_square', 'eyes_sharp', 'brows_scarred', 'nose_wide', 'mouth_flat', 'hair_buzz', 'beard_stubble', 'hat_tank_goggles', 'top_jumpsuit', 'acc_none', 'bg_city', 6, 6, 1, 6),
  tempest: g('face_heart', 'eyes_starry', 'brows_arched', 'nose_button', 'mouth_smirk', 'hair_mohawk', 'beard_none', 'hat_holo_crown', 'top_hardlight_suit', 'acc_cyber_eye', 'bg_storm', 1, 9, 4, 6),
  warden: g('face_square', 'eyes_sharp', 'brows_determined', 'nose_wide', 'mouth_flat', 'hair_buzz', 'beard_none', 'hat_visor_band', 'top_titan_pauldrons', 'acc_none', 'bg_starfield', 7, 10, 5, 6),
  echo: g('face_round', 'eyes_round', 'brows_thin', 'nose_small', 'mouth_flat', 'hair_tiedback', 'beard_none', 'hat_visor_band', 'top_cadet_suit', 'acc_holo_monocle', 'bg_skyline', 3, 11, 4, 4),
};

export const avatar: AvatarTables = {
  slots: ['face', 'eyes', 'brows', 'nose', 'mouth', 'hair', 'facialHair', 'headwear', 'top', 'accessory', 'background'],
  parts: [...STARTERS, ...WEARABLES],
  tints: { skin: 8, hair: 12, eyes: 6, cloth: 8 },
  tintOf: { face: 'skin', hair: 'hair', brows: 'hair', facialHair: 'hair', eyes: 'eyes', top: 'cloth' },
  optional: ['facialHair', 'headwear', 'accessory'],
  generals: GENERALS,
};

/** The wearables as `avatar` collection items (key `avatar.<id>` in `cosmetics.owned`). */
export const avatarCollectionItems: CosmeticItemDef[] = WEARABLES.map((p) => ({
  id: p.id,
  collection: 'avatar',
  rarity: p.rarity as Rarity,
  source: p.source,
  art: `cosmetic.avatar.${p.id}`,
  nameKey: p.nameKey,
  slot: p.slot,
}));
