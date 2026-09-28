/**
 * Daily and weekly quests and the Codex Level rules (DESIGN A6.7).
 *
 * 3 new quests a day join a queue of up to 21 (the first 3 are active), 1 free reroll, at local
 * 04:00 (A6.7, A15.4); the War Chest counts counting wins (A15.5).
 * Skirmish matches count only for "Play 3 battles" and "Train 30 units".
 */
import type { QuestDef, QuestMetric, QuestReward, QuestTables } from './types';

const amber = (amount: number): QuestReward => ({ kind: 'amber', amount });

function quest(
  id: string,
  metric: QuestMetric,
  target: number,
  rewards: QuestReward[],
  extra: Partial<Pick<QuestDef, 'skirmishCounts' | 'requiresLegendary' | 'fromMatch' | 'beforeMsByFormat' | 'beforeMs' | 'minHits' | 'weight'>> = {},
): QuestDef {
  return {
    id,
    metric,
    target,
    rewards,
    skirmishCounts: extra.skirmishCounts ?? false,
    requiresLegendary: extra.requiresLegendary ?? false,
    fromMatch: extra.fromMatch ?? 1,
    ...(extra.beforeMsByFormat ? { beforeMsByFormat: extra.beforeMsByFormat } : {}),
    ...(extra.beforeMs !== undefined ? { beforeMs: extra.beforeMs } : {}),
    ...(extra.minHits !== undefined ? { minHits: extra.minHits } : {}),
    // A6.7, A15.4: skill and variety quests weigh 2; pure activity quests weigh 1
    weight: extra.weight ?? 2,
    nameKey: `quest.${id}.name`,
  };
}

export const quests: QuestTables = {
  // A6.7 daily pool, in table order
  daily: [
    quest('win_2', 'wins', 2, [amber(100)]),
    quest('play_3', 'battles', 3, [amber(100)], { skirmishCounts: true, weight: 1 }),
    quest('train_30', 'unitsTrained', 30, [amber(100)], { skirmishCounts: true, weight: 1 }),
    quest('evolve_6', 'evolves', 6, [amber(100)]),
    // Reach your format's final age before 2:20 (Short), 3:40 (Standard) or 5:00 (Full)
    quest('fast_final_age', 'fastFinalAge', 1, [amber(150)], {
      beforeMsByFormat: { short: 140000, standard: 220000, full: 300000 },
    }),
    quest('turret_kills_20', 'turretKills', 20, [amber(150)]),
    quest('win_no_treasury', 'winsWithoutTreasury', 1, [amber(150)]),
    quest('power_hits_5', 'powerMultiHit', 1, [amber(150)], { minHits: 5 }),
    quest('base_damage_15000', 'baseDamage', 15000, [amber(100)]),
    quest('aa_heavy_kills_5', 'heavyKillsByAA', 5, [amber(150)]),
    quest('win_with_legendary', 'winsWithLegendary', 1, [{ kind: 'dust', amount: 100 }], { requiresLegendary: true }),
    quest('fast_base_kill', 'fastBaseKill', 1, [amber(200)], { beforeMs: 360000 }),
    quest('win_after_last_stand', 'winsAfterLastStand', 1, [amber(200)], { fromMatch: 5 }),
    quest('upgrade_2', 'upgrades', 2, [amber(100)], { weight: 1 }),
    quest('daily_challenge_win', 'dailyChallengeWins', 1, [{ kind: 'ageCapsule' }]),
  ],
  // A15.5 War Chest (replaces "Win 15 battles"): 20 counting wins (`winsPerChest`, 15-25 after the
  // Phase 3 run) grant a Wardrobe Crate and an Age Capsule at once; the bar restarts at 0
  weekly: quest('war_chest', 'countingWins', 20, [{ kind: 'wardrobe' }, { kind: 'ageCapsule' }]),
  dailyCount: 3,
  freeRerolls: 1,
  // A15.4: 3 new quests join a queue of up to 21 at 04:00; the first 3 are active
  queueMax: 21,
  resetHour: 4,
  // A6.7 Codex Level: 15 points per level; 100 Amber every level; Silver Codex Capsule at 5, 15, 25 ...
  // alternating with a Wardrobe Crate at 10, 20, 30 ...
  codex: {
    pointsPerLevel: 15,
    amberPerLevel: 100,
    capsule: { firstLevel: 5, every: 10, tier: 'silver' },
    wardrobe: { firstLevel: 10, every: 10 },
  },
};
