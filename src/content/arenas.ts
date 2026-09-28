/**
 * Arenas, ladder results and matchmaking constants (DESIGN A6.3, A6.8, A14.1 ground ids).
 * Tiers are 0-10 (0 = tier 0, 10 = tier X; A7.3).
 */
import type { ArenaTables } from './types';

export const arenas: ArenaTables = {
  // A6.3 arena table
  list: [
    {
      index: 1, id: 'tar_pits', trophies: 0, ladderFormats: ['short'],
      dropAges: ['stone', 'medieval', 'gunpowder'], randomLegendaries: false,
      botTiers: [0, 2], botLevel: 1, botMaxRarity: 'rare', wardenChanceBp: 0,
      gateRewards: [{ kind: 'starterPlan' }, { kind: 'banner', banner: 'tar_pit' }],
      groundVisualId: 'ground.tar_pits', nameKey: 'arena.tar_pits.name',
    },
    {
      index: 2, id: 'frostfang', trophies: 150, ladderFormats: ['short', 'standard'],
      dropAges: ['stone', 'medieval', 'gunpowder', 'modern'], randomLegendaries: true,
      botTiers: [1, 3], botLevel: 2, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [
        { kind: 'ageUnlock', ages: ['modern', 'future'] },
        { kind: 'banner', banner: 'frostfang' },
        { kind: 'capsule', tier: 'silver' },
      ],
      groundVisualId: 'ground.frostfang', nameKey: 'arena.frostfang.name',
    },
    {
      index: 3, id: 'kingsmoat', trophies: 400, ladderFormats: ['short', 'standard', 'full'],
      dropAges: ['stone', 'medieval', 'gunpowder', 'modern', 'future'], randomLegendaries: true,
      botTiers: [2, 4], botLevel: 3, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'moat' }, { kind: 'capsule', tier: 'jade' }, { kind: 'conquestUnlock' }],
      groundVisualId: 'ground.kingsmoat', nameKey: 'arena.kingsmoat.name',
    },
    {
      index: 4, id: 'powder_bay', trophies: 800, ladderFormats: ['short', 'standard', 'full'],
      dropAges: ['stone', 'medieval', 'gunpowder', 'modern', 'future'], randomLegendaries: true,
      botTiers: [3, 5], botLevel: 4, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'harbor' }, { kind: 'capsule', tier: 'jade' }],
      groundVisualId: 'ground.powder_bay', nameKey: 'arena.powder_bay.name',
    },
    {
      index: 5, id: 'iron_front', trophies: 1300, ladderFormats: ['short', 'standard', 'full'],
      dropAges: ['stone', 'medieval', 'gunpowder', 'modern', 'future'], randomLegendaries: true,
      botTiers: [4, 6], botLevel: 5, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'barbed' }, { kind: 'capsule', tier: 'jade' }],
      groundVisualId: 'ground.iron_front', nameKey: 'arena.iron_front.name',
    },
    {
      index: 6, id: 'neon_harbor', trophies: 1900, ladderFormats: ['short', 'standard', 'full'],
      dropAges: ['stone', 'medieval', 'gunpowder', 'modern', 'future'], randomLegendaries: true,
      botTiers: [5, 7], botLevel: 6, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'neon' }, { kind: 'capsule', tier: 'jade' }],
      groundVisualId: 'ground.neon_harbor', nameKey: 'arena.neon_harbor.name',
    },
    {
      index: 7, id: 'orbital_ring', trophies: 2600, ladderFormats: ['short', 'standard', 'full'],
      dropAges: ['stone', 'medieval', 'gunpowder', 'modern', 'future'], randomLegendaries: true,
      botTiers: [6, 8], botLevel: 7, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'starfield' }, { kind: 'capsule', tier: 'aeon' }],
      groundVisualId: 'ground.orbital_ring', nameKey: 'arena.orbital_ring.name',
    },
    {
      index: 8, id: 'chrono_rift', trophies: 3400, ladderFormats: ['short', 'standard', 'full'],
      dropAges: ['stone', 'medieval', 'gunpowder', 'modern', 'future'], randomLegendaries: true,
      // A7.4: The Warden appears in 1 of 5 Arena 8 ladder matches
      botTiers: [8, 10], botLevel: 8, botMaxRarity: 'epic', wardenChanceBp: 2000,
      gateRewards: [
        { kind: 'banner', banner: 'rift' },
        { kind: 'capsule', tier: 'aeon' },
        { kind: 'skin', skin: 'crystal_spire' },
        { kind: 'wardenJoins' },
      ],
      groundVisualId: 'ground.chrono_rift', nameKey: 'arena.chrono_rift.name',
    },
  ],
  ladder: {
    // A6.3 ladder results
    win: { trophies: 30, amber: 20, amberWithoutCharge: 40 },
    // A15.8 rewards by format from 400 trophies (Arena 3): equal reward per minute
    winByFormat: {
      fromTrophies: 400,
      formats: {
        short: { trophies: 26, amber: 20, amberWithoutCharge: 40 },
        standard: { trophies: 30, amber: 25, amberWithoutCharge: 50 },
        full: { trophies: 34, amber: 30, amberWithoutCharge: 60 },
      },
    },
    loss: { trophies: -20, amber: 15, noLossBelowTrophies: 400 },
    draw: { trophies: 0, amber: 15 },
    lossProtection: { streak: 3, tierDrop: 1 },
    skirmishWinAmber: 5,
    // A6.8: Elo K = 32 from 1,000; tier rating = 800 + 100 × tier; tier = round((MMR − 870) / 100)
    mmr: { start: 1000, k: 32, tierRatingBase: 800, tierRatingStep: 100, tierOffset: 870, tierDivisor: 100 },
    maxTier: 10,
    newPlayer: { matches: 20, mistakeBonusBp: 1000 },
    levelRollBp: { minus: 2500, zero: 5000, plus: 2500 },
    standardLevel: 7,
  },
};
