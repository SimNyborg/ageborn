/**
 * Base skins (DESIGN A18.9.4; PLAN 2c, owner request 2026-10-08 "more base skins that are not just a
 * recolour"). Data only; owned by Track B.
 *
 * - A base skin is a full model of one age's base (`age` is required): the manifest entry
 *   `base.<age>@<id>` with the sheet `art/bases/skins/<id>.json`. The item id is the skin id.
 * - Until a skin's model passes review it draws the standard base with its tint and particles
 *   (`BASE_SKINS` in `src/visuals/cosmetics/baseSkins.ts`), so the owners of the 10 rows below see no
 *   regression. They came from `raw/cosmetics.ts` unchanged (same ids, sources and rarities).
 * - Crystal Spire (Legendary, the Arena 8 gate reward) stays a troop-system skin (`content/skins.ts`,
 *   target `base.future`; owner decision 2026-10-08) and shows in the same grid; one equip per age
 *   across both systems.
 * - A new row ships with `released: false` until its model is in.
 */
import type { CosmeticItemDef } from '../types';

export const baseSkinItems: CosmeticItemDef[] = [
  { id: 'frost_cave', collection: 'baseSkin', rarity: 'rare', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.frost_cave', nameKey: 'cosmetic.baseSkin.frost_cave.name', age: 'stone' },
  { id: 'mossy_den', collection: 'baseSkin', rarity: 'rare', source: { kind: 'road', trophies: 700 }, art: 'cosmetic.baseSkin.mossy_den', nameKey: 'cosmetic.baseSkin.mossy_den.name', age: 'stone' },
  { id: 'gilded_ziggurat', collection: 'baseSkin', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.gilded_ziggurat', nameKey: 'cosmetic.baseSkin.gilded_ziggurat.name', age: 'bronze' },
  { id: 'rose_keep', collection: 'baseSkin', rarity: 'rare', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.rose_keep', nameKey: 'cosmetic.baseSkin.rose_keep.name', age: 'medieval' },
  { id: 'snowy_keep', collection: 'baseSkin', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.snowy_keep', nameKey: 'cosmetic.baseSkin.snowy_keep.name', age: 'medieval' },
  { id: 'coral_fort', collection: 'baseSkin', rarity: 'rare', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.coral_fort', nameKey: 'cosmetic.baseSkin.coral_fort.name', age: 'gunpowder' },
  { id: 'copper_foundry', collection: 'baseSkin', rarity: 'rare', source: { kind: 'road', trophies: 1800 }, art: 'cosmetic.baseSkin.copper_foundry', nameKey: 'cosmetic.baseSkin.copper_foundry.name', age: 'industrial' },
  { id: 'desert_bunker', collection: 'baseSkin', rarity: 'rare', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.desert_bunker', nameKey: 'cosmetic.baseSkin.desert_bunker.name', age: 'modern' },
  { id: 'midnight_neon', collection: 'baseSkin', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.midnight_neon', nameKey: 'cosmetic.baseSkin.midnight_neon.name', age: 'future' },
  { id: 'nebula_ark', collection: 'baseSkin', rarity: 'legendary', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.nebula_ark', nameKey: 'cosmetic.baseSkin.nebula_ark.name', age: 'cosmic' },
  // round 3 (PLAN 2c, 2e): the 13 new models (each shipped `released: false` until its model passed review; all released)
  { id: 'mammoth_bone_lodge', collection: 'baseSkin', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.mammoth_bone_lodge', nameKey: 'cosmetic.baseSkin.mammoth_bone_lodge.name', age: 'stone' },
  { id: 'acropolis_temple', collection: 'baseSkin', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.baseSkin.acropolis_temple', nameKey: 'cosmetic.baseSkin.acropolis_temple.name', age: 'bronze' },
  { id: 'windmill_redoubt', collection: 'baseSkin', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.baseSkin.windmill_redoubt', nameKey: 'cosmetic.baseSkin.windmill_redoubt.name', age: 'gunpowder' },
  { id: 'rail_depot', collection: 'baseSkin', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.baseSkin.rail_depot', nameKey: 'cosmetic.baseSkin.rail_depot.name', age: 'industrial' },
  { id: 'jungle_outpost', collection: 'baseSkin', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.baseSkin.jungle_outpost', nameKey: 'cosmetic.baseSkin.jungle_outpost.name', age: 'modern' },
  { id: 'bio_dome_arcology', collection: 'baseSkin', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.baseSkin.bio_dome_arcology', nameKey: 'cosmetic.baseSkin.bio_dome_arcology.name', age: 'future' },
  { id: 'asteroid_citadel', collection: 'baseSkin', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.baseSkin.asteroid_citadel', nameKey: 'cosmetic.baseSkin.asteroid_citadel.name', age: 'cosmic' },
  { id: 'galleon_bastion', collection: 'baseSkin', rarity: 'epic', source: { kind: 'road', trophies: 2600 }, art: 'cosmetic.baseSkin.galleon_bastion', nameKey: 'cosmetic.baseSkin.galleon_bastion.name', age: 'gunpowder' },
  { id: 'arctic_radar_station', collection: 'baseSkin', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.arctic_radar_station', nameKey: 'cosmetic.baseSkin.arctic_radar_station.name', age: 'modern' },
  { id: 'clocktower_works', collection: 'baseSkin', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.clocktower_works', nameKey: 'cosmetic.baseSkin.clocktower_works.name', age: 'industrial' },
  { id: 'colossus_lighthouse', collection: 'baseSkin', rarity: 'legendary', source: { kind: 'crate' }, art: 'cosmetic.baseSkin.colossus_lighthouse', nameKey: 'cosmetic.baseSkin.colossus_lighthouse.name', age: 'bronze' },
  { id: 'solar_sail_ark', collection: 'baseSkin', rarity: 'epic', source: { kind: 'road', trophies: 3900 }, art: 'cosmetic.baseSkin.solar_sail_ark', nameKey: 'cosmetic.baseSkin.solar_sail_ark.name', age: 'cosmic' },
  { id: 'wyrm_coil_keep', collection: 'baseSkin', rarity: 'legendary', source: { kind: 'road', trophies: 4800 }, art: 'cosmetic.baseSkin.wyrm_coil_keep', nameKey: 'cosmetic.baseSkin.wyrm_coil_keep.name', age: 'medieval' },
];
