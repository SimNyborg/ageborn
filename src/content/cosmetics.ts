/**
 * Profile cosmetics (DESIGN A5.8 "Other cosmetics", A6.1): 8 banners, 8 frames, 13 titles, 6 emotes,
 * and the cosmetic collections (A18.9.4): emotes, quotes, base and national flags, base skins,
 * decorations and battle backdrops (items in `raw/cosmetics.ts`). There is no text chat anywhere
 * (A5.8, A7.1): quotes are fixed lines. Cosmetics never change stats.
 */
import { collectionItems } from './raw/cosmetics';
import type { Cosmetics } from './types';

export const cosmetics: Cosmetics = {
  // A5.8: each banner is an arena gate reward; Tar Pit is given at the start (arena 1)
  banners: [
    { id: 'tar_pit', arena: 1, nameKey: 'banner.tar_pit.name' },
    { id: 'frostfang', arena: 2, nameKey: 'banner.frostfang.name' },
    { id: 'moat', arena: 3, nameKey: 'banner.moat.name' },
    { id: 'harbor', arena: 4, nameKey: 'banner.harbor.name' },
    { id: 'barbed', arena: 5, nameKey: 'banner.barbed.name' },
    { id: 'neon', arena: 6, nameKey: 'banner.neon.name' },
    { id: 'starfield', arena: 7, nameKey: 'banner.starfield.name' },
    { id: 'rift', arena: 8, nameKey: 'banner.rift.name' },
  ],
  // A5.8: frames at Codex Levels 5, 15, 25, 35, 45, 55, 65, 75 (names are ours; DESIGN gives none)
  frames: [
    { id: 'bark', codexLevel: 5, nameKey: 'frame.bark.name' },
    { id: 'bone', codexLevel: 15, nameKey: 'frame.bone.name' },
    { id: 'bronze', codexLevel: 25, nameKey: 'frame.bronze.name' },
    { id: 'iron', codexLevel: 35, nameKey: 'frame.iron.name' },
    { id: 'brass', codexLevel: 45, nameKey: 'frame.brass.name' },
    { id: 'steel', codexLevel: 55, nameKey: 'frame.steel.name' },
    { id: 'chrome', codexLevel: 65, nameKey: 'frame.chrome.name' },
    { id: 'aeon', codexLevel: 75, nameKey: 'frame.aeon.name' },
  ],
  // A5.8 title table, in order
  titles: [
    { id: 'recruit', unlock: { kind: 'start' }, nameKey: 'title.recruit.name' },
    { id: 'firestarter', unlock: { kind: 'firstWin' }, nameKey: 'title.firestarter.name' },
    // A18.3.4: "reach Cosmic" became "reach the last age of your window": the last age of a Full War
    { id: 'evolver', unlock: { kind: 'finalAgeBefore', format: 'full', ms: 1050000 }, nameKey: 'title.evolver.name' },
    { id: 'mammoth_tamer', unlock: { kind: 'ownCard', card: 'mammoth_matriarch' }, nameKey: 'title.mammoth_tamer.name' },
    { id: 'collector', unlock: { kind: 'codexLevel', level: 10 }, nameKey: 'title.collector.name' },
    { id: 'siege_scholar', unlock: { kind: 'arena', arena: 4 }, nameKey: 'title.siege_scholar.name' },
    { id: 'last_stander', unlock: { kind: 'winAfterLastStand' }, nameKey: 'title.last_stander.name' },
    // A18.3.4: Full War's final age (the 7th of its window) before 10:00
    { id: 'speedrunner', unlock: { kind: 'finalAgeBefore', format: 'full', ms: 600000 }, nameKey: 'title.speedrunner.name' },
    { id: 'veteran', unlock: { kind: 'wins', count: 100 }, nameKey: 'title.veteran.name' },
    { id: 'curator', unlock: { kind: 'codexLevel', level: 40 }, nameKey: 'title.curator.name' },
    { id: 'wardens_bane', unlock: { kind: 'beatGeneral', general: 'warden' }, nameKey: 'title.wardens_bane.name' },
    { id: 'conqueror', unlock: { kind: 'conquestStars', stars: 27 }, nameKey: 'title.conqueror.name' },
    { id: 'ageborn', unlock: { kind: 'arena', arena: 8 }, nameKey: 'title.ageborn.name' },
    // A15.10: four hidden feats give a title
    { id: 'the_stubborn', unlock: { kind: 'feat', feat: 'stubborn' }, nameKey: 'title.the_stubborn.name' },
    { id: 'photo_finisher', unlock: { kind: 'feat', feat: 'photo_finish' }, nameKey: 'title.photo_finisher.name' },
    { id: 'stone_cold', unlock: { kind: 'feat', feat: 'stone_cold' }, nameKey: 'title.stone_cold.name' },
    { id: 'keeper_of_ages', unlock: { kind: 'feat', feat: 'old_guard' }, nameKey: 'title.keeper_of_ages.name' },
  ],
  // A5.8 six emotes; A7.2 bots use only GG, Salute and Thumbs up
  emotes: [
    { id: 'laugh', botAllowed: false, nameKey: 'emote.laugh.name' },
    { id: 'salute', botAllowed: true, nameKey: 'emote.salute.name' },
    { id: 'cry', botAllowed: false, nameKey: 'emote.cry.name' },
    { id: 'angry', botAllowed: false, nameKey: 'emote.angry.name' },
    { id: 'thumbsUp', botAllowed: true, nameKey: 'emote.thumbsUp.name' },
    { id: 'gg', botAllowed: true, nameKey: 'emote.gg.name' },
  ],
  defaults: { banner: 'tar_pit', frame: 'none', title: 'recruit' },
  // A18.9.4 collections. Odds are disclosed on every capsule and crate screen (A15.3); only
  // `capsule` items drop from Time Capsules and only `crate` items from the Wardrobe Crate.
  collections: {
    items: collectionItems,
    drops: {
      // Script (onboarding) and Age Unlock capsules never hold a collection item.
      capsuleChanceBp: { clay: 800, bronze: 1200, silver: 2000, jade: 3500, gold: 6000, platinum: 8000, aeon: 10000 },
      // No Legendary item is in the capsule pool (Legendaries come from crates, feats and the road)
      capsuleRarityBp: { common: 6800, rare: 2600, epic: 600, legendary: 0 },
      // Every crate holds one item next to its skin
      crateRarityBp: { common: 0, rare: 7000, epic: 2500, legendary: 500 },
      // A duplicate only once every item of that pool and rarity is owned
      duplicateDust: { common: 5, rare: 20, epic: 60, legendary: 150 },
      craftDust: { common: 40, rare: 150, epic: 500, legendary: 1500 },
    },
    wheel: { emotes: 8, quotes: 4 },
    quoteCooldownMs: 8000,
    decorationAnchors: 3,
    defaults: {
      emotes: ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'],
      quotes: ['quote.glhf', 'quote.well_played', 'quote.nice_move', 'quote.so_close'],
      baseFlag: 'baseFlag.ember',
      // Never inferred from location: no national flag until the player picks one
      nationalFlag: null,
      decorations: ['decoration.fire_bowl', null, 'decoration.fern'],
      // Each age's own classic sky until the player picks a backdrop skin
      backdrop: null,
    },
  },
};
