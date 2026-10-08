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

export const sceneItems: CosmeticItemDef[] = [];
