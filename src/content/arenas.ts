/**
 * Arenas, ladder results and matchmaking constants (DESIGN A6.3, A6.8, A14.1 ground ids).
 * Tiers are 0-10 (0 = tier 0, 10 = tier X; A7.3).
 */
import type { ArenaTables } from './types';

export const arenas: ArenaTables = {
  // A6.3 arena table
  list: [
    {
      index: 1, id: 'tar_pits', trophies: 0, ladderFormats: ['short', 'standard', 'full', 'last'],
      // A17.13: the Short War ages
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder'], randomLegendaries: false,
      botTiers: [0, 2], botLevel: 1, botMaxRarity: 'rare', wardenChanceBp: 0,
      gateRewards: [{ kind: 'starterPlan' }, { kind: 'banner', banner: 'tar_pit' }],
      groundVisualId: 'ground.tar_pits', nameKey: 'arena.tar_pits.name',
    },
    {
      index: 2, id: 'frostfang', trophies: 150, ladderFormats: ['short', 'standard', 'full', 'last'],
      // A17.13: the Standard War ages
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern'], randomLegendaries: true,
      botTiers: [1, 3], botLevel: 2, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [
        { kind: 'ageUnlock', ages: ['industrial', 'modern'] },
        { kind: 'banner', banner: 'frostfang' },
        { kind: 'capsule', tier: 'silver' },
      ],
      groundVisualId: 'ground.frostfang', nameKey: 'arena.frostfang.name',
    },
    {
      index: 3, id: 'kingsmoat', trophies: 400, ladderFormats: ['short', 'standard', 'full', 'last'],
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'], randomLegendaries: true,
      botTiers: [2, 4], botLevel: 3, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [
        // A17.13: Gate 3 brings the Future and Cosmic Anti-armor Rares
        { kind: 'ageUnlock', ages: ['future', 'cosmic'] },
        { kind: 'banner', banner: 'moat' },
        { kind: 'capsule', tier: 'jade' },
        { kind: 'conquestUnlock' },
      ],
      groundVisualId: 'ground.kingsmoat', nameKey: 'arena.kingsmoat.name',
    },
    {
      index: 4, id: 'powder_bay', trophies: 800, ladderFormats: ['short', 'standard', 'full', 'last'],
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'], randomLegendaries: true,
      botTiers: [3, 5], botLevel: 4, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'harbor' }, { kind: 'capsule', tier: 'jade' }],
      groundVisualId: 'ground.powder_bay', nameKey: 'arena.powder_bay.name',
    },
    {
      index: 5, id: 'iron_front', trophies: 1300, ladderFormats: ['short', 'standard', 'full', 'last'],
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'], randomLegendaries: true,
      botTiers: [4, 6], botLevel: 5, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'barbed' }, { kind: 'capsule', tier: 'jade' }],
      groundVisualId: 'ground.iron_front', nameKey: 'arena.iron_front.name',
    },
    {
      index: 6, id: 'neon_harbor', trophies: 1900, ladderFormats: ['short', 'standard', 'full', 'last'],
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'], randomLegendaries: true,
      botTiers: [5, 7], botLevel: 6, botMaxRarity: 'epic', wardenChanceBp: 0,
      gateRewards: [{ kind: 'banner', banner: 'neon' }, { kind: 'capsule', tier: 'jade' }],
      groundVisualId: 'ground.neon_harbor', nameKey: 'arena.neon_harbor.name',
    },
    {
      index: 7, id: 'orbital_ring', trophies: 2600, ladderFormats: ['short', 'standard', 'full', 'last'],
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'], randomLegendaries: true,
      botTiers: [6, 8], botLevel: 7, botMaxRarity: 'epic', wardenChanceBp: 0,
      // A6.4 ladder 2026-09-29: Gate 7 gives a Gold Capsule (the old Aeon's contents)
      gateRewards: [{ kind: 'banner', banner: 'starfield' }, { kind: 'capsule', tier: 'gold' }],
      groundVisualId: 'ground.orbital_ring', nameKey: 'arena.orbital_ring.name',
    },
    {
      index: 8, id: 'chrono_rift', trophies: 3400, ladderFormats: ['short', 'standard', 'full', 'last'],
      dropAges: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'], randomLegendaries: true,
      // A7.4: The Warden appears in 1 of 5 Arena 8 ladder matches
      botTiers: [8, 10], botLevel: 8, botMaxRarity: 'epic', wardenChanceBp: 2000,
      gateRewards: [
        { kind: 'banner', banner: 'rift' },
        // A6.4 ladder 2026-09-29: Gate 8 gives a Platinum Capsule
        { kind: 'capsule', tier: 'platinum' },
        { kind: 'skin', skin: 'crystal_spire' },
        { kind: 'wardenJoins' },
      ],
      groundVisualId: 'ground.chrono_rift', nameKey: 'arena.chrono_rift.name',
    },
  ],
  ladder: {
    // A6.3 ladder results: the row for a match with no format (every ladder match has one since
    // 2026-10-03, so this is a fallback); the tutorial pays its Amber (A8).
    win: { trophies: 30, amber: 20, amberWithoutCharge: 40 },
    // A15.8 rewards by format. Owner decision 2026-10-03 ("ja, og uden ur skal også give trofæer"): from
    // 0 trophies (Arena 1; was 400) a longer war pays more per win, and Last Base Standing is ranked.
    // Medians then: Short 7:39, Medium 10:58, Long 15:21, No clock ~16:13. Amber keeps each row's old
    // Amber-to-trophy ratio (Short 20/26, Standard 27/31, Full and No clock 35/36), rounded.
    winByFormat: {
      fromTrophies: 0,
      formats: {
        short: { trophies: 30, amber: 23, amberWithoutCharge: 46 },
        standard: { trophies: 36, amber: 31, amberWithoutCharge: 62 },
        full: { trophies: 46, amber: 45, amberWithoutCharge: 90 },
        // A2.10.1 Last Base Standing: ranked like the timed lengths (unranked until 2026-10-03)
        last: { trophies: 48, amber: 47, amberWithoutCharge: 94 },
      },
    },
    loss: { trophies: -20, amber: 15, noLossBelowTrophies: 400 },
    draw: { trophies: 0, amber: 15 },
    lossProtection: { streak: 3, tierDrop: 1 },
    skirmishWinAmber: 5,
    // A6.8: Elo K = 32 from 1,000; tier rating = 800 + 100 × tier; tier = round((MMR − 870) / 100)
    mmr: { start: 1000, k: 32, tierRatingBase: 800, tierRatingStep: 100, tierOffset: 870, tierDivisor: 100 },
    maxTier: 10,
    // Owner feedback 2026-09-28: the Rookie AI handicap covers the two onboarding matches only (was 20).
    // MVP fix 2026-10-01 (bug hunt S1 #5, FTUE #4): new players lost match 2 vs Pip half the time. Measured
    // (scratch lab, 30-40 seeds, starter plan L1 vs Pip tier 0, Short War): random spam won 43% at 1,000,
    // 87-90% at 3,000-4,000 and 100% at 5,000 (median 5:02; power spam and "a few, then evolve" 100%).
    newPlayer: { matches: 2, mistakeBonusBp: 5000 },
    levelRollBp: { minus: 2500, zero: 5000, plus: 2500 },
    standardLevel: 7,
  },
};
