/**
 * Daily and weekly quests and the Codex Level rules (DESIGN A6.7).
 *
 * 3 daily quests with 1 free reroll, banking up to 6 unclaimed; reset at local 04:00 (A6.3).
 * Skirmish matches count only for "Play 3 battles" and "Train 30 units".
 */
import type { QuestDef, QuestMetric, QuestReward, QuestTables } from './types';

const amber = (amount: number): QuestReward => ({ kind: 'amber', amount });

function quest(
  id: string,
  metric: QuestMetric,
  target: number,
  rewards: QuestReward[],
  extra: Partial<Pick<QuestDef, 'skirmishCounts' | 'requiresLegendary' | 'fromMatch' | 'beforeMsByFormat' | 'beforeMs' | 'minHits'>> = {},
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
    nameKey: `quest.${id}.name`,
  };
}

export const quests: QuestTables = {
  // A6.7 daily pool, in table order
  daily: [
    quest('win_2', 'wins', 2, [amber(100)]),
    quest('play_3', 'battles', 3, [amber(100)], { skirmishCounts: true }),
    quest('train_30', 'unitsTrained', 30, [amber(100)], { skirmishCounts: true }),
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
    quest('upgrade_2', 'upgrades', 2, [amber(100)]),
    quest('daily_challenge_win', 'dailyChallengeWins', 1, [{ kind: 'ageCapsule' }]),
  ],
  // A6.7 weekly: "Win 15 battles" gives a Wardrobe Crate and an Age Capsule
  weekly: quest('weekly_win_15', 'wins', 15, [{ kind: 'wardrobe' }, { kind: 'ageCapsule' }]),
  dailyCount: 3,
  freeRerolls: 1,
  bankMax: 6,
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
