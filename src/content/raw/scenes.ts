/**
 * Scenes (PLAN 2b, owner request 2026-10-08 "choose and win a different background for every age").
 * Data only; owned by Track A.
 *
 * - A scene is the scenery of one age (`age` is required), equipped per age:
 *   `cosmetics.equipped.scenes[age] = 'scene.<id>'`. Each age's classic scene is free, owned by
 *   everyone and not an item. Two new scenes per age (16 in all): Rare from the Time Capsule pool,
 *   Epic from the Wardrobe Crate, the Time Capsule or the Trophy Road (PLAN 2e "Rarities and sources").
 * - The sky (the `backdrop` collection) re-grades whichever scene shows; scenes are authored in
 *   neutral daylight so any scene works with any sky.
 * - A row ships with `released: false` until its layers, thumbnail and size budget are in.
 *
 * Row shape: `{ id, collection: 'scene', rarity, source, art: 'cosmetic.scene.<id>',
 * nameKey: 'cosmetic.scene.<id>.name', age, released: false }`.
 */
import type { CosmeticItemDef } from '../types';

export const sceneItems: CosmeticItemDef[] = [
  // Two scenes per age (PLAN 2b "The 24 scenes"); each ships (released) once its art is in, from round 2.
  { id: 'glacier_valley', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.glacier_valley', nameKey: 'cosmetic.scene.glacier_valley.name', age: 'stone', released: false },
  { id: 'sabre_savanna', collection: 'scene', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.scene.sabre_savanna', nameKey: 'cosmetic.scene.sabre_savanna.name', age: 'stone', released: false },
  { id: 'aegean_harbour', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.aegean_harbour', nameKey: 'cosmetic.scene.aegean_harbour.name', age: 'bronze', released: false },
  { id: 'bronze_city_siege', collection: 'scene', rarity: 'epic', source: { kind: 'road', trophies: 2300 }, art: 'cosmetic.scene.bronze_city_siege', nameKey: 'cosmetic.scene.bronze_city_siege.name', age: 'bronze', released: false },
  { id: 'misty_moor', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.misty_moor', nameKey: 'cosmetic.scene.misty_moor.name', age: 'medieval', released: false },
  { id: 'harbour_town', collection: 'scene', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.scene.harbour_town', nameKey: 'cosmetic.scene.harbour_town.name', age: 'medieval', released: false },
  { id: 'treasure_cove', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.treasure_cove', nameKey: 'cosmetic.scene.treasure_cove.name', age: 'gunpowder', released: false },
  { id: 'windmill_polder', collection: 'scene', rarity: 'epic', source: { kind: 'capsule' }, art: 'cosmetic.scene.windmill_polder', nameKey: 'cosmetic.scene.windmill_polder.name', age: 'gunpowder', released: false },
  { id: 'viaduct_gorge', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.viaduct_gorge', nameKey: 'cosmetic.scene.viaduct_gorge.name', age: 'industrial', released: false },
  { id: 'zeppelin_docks', collection: 'scene', rarity: 'epic', source: { kind: 'road', trophies: 3300 }, art: 'cosmetic.scene.zeppelin_docks', nameKey: 'cosmetic.scene.zeppelin_docks.name', age: 'industrial', released: false },
  { id: 'desert_airbase', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.desert_airbase', nameKey: 'cosmetic.scene.desert_airbase.name', age: 'modern', released: false },
  { id: 'monsoon_river', collection: 'scene', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.scene.monsoon_river', nameKey: 'cosmetic.scene.monsoon_river.name', age: 'modern', released: false },
  { id: 'skyway_metropolis', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.skyway_metropolis', nameKey: 'cosmetic.scene.skyway_metropolis.name', age: 'future', released: false },
  { id: 'terraformed_gardens', collection: 'scene', rarity: 'epic', source: { kind: 'capsule' }, art: 'cosmetic.scene.terraformed_gardens', nameKey: 'cosmetic.scene.terraformed_gardens.name', age: 'future', released: false },
  { id: 'ringed_giant', collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: 'cosmetic.scene.ringed_giant', nameKey: 'cosmetic.scene.ringed_giant.name', age: 'cosmic', released: false },
  { id: 'nebula_shipyard', collection: 'scene', rarity: 'epic', source: { kind: 'crate' }, art: 'cosmetic.scene.nebula_shipyard', nameKey: 'cosmetic.scene.nebula_shipyard.name', age: 'cosmic', released: false },
];
