/**
 * Daily Challenge modifiers and rules (DESIGN A9.1). One symmetric modifier per day, seeded by the
 * local date (`YYYYMMDD`, day starting 04:00); it is shown on the VS screen (A7.1).
 * Match configs name modifiers by id (`MatchConfig.modifiers`, B15); effects are data here.
 */
import type { DailyModifierDef, DailyModifierTables, ModifierEffect, ModifierId } from './types';

function mod(id: ModifierId, index: number, effect: ModifierEffect): DailyModifierDef {
  return { id, index, effect, nameKey: `modifier.${id}.name`, descKey: `modifier.${id}.desc` };
}

/** A9.1 table order. */
const LIST: DailyModifierDef[] = [
  // Passive gold ×1.5
  mod('gold_rush', 1, { kind: 'passiveGold', bp: 15000 }),
  // Unit HP ×0.7
  mod('glass_armies', 2, { kind: 'unitHp', bp: 7000 }),
  // Age Power charge ×2
  mod('power_hour', 3, { kind: 'powerCharge', bp: 20000 }),
  // XP thresholds ×0.7
  mod('fast_forward', 4, { kind: 'xpThreshold', bp: 7000 }),
  // Heavy and Legendary cost −30%
  mod('heavy_metal', 5, { kind: 'unitCost', groups: ['heavy', 'legendary'], bp: 7000 }),
  // Siege starts 1:15 earlier
  mod('sudden_siege', 6, { kind: 'siegeShift', ms: -75000 }),
];

export const dailyModifiers: DailyModifierTables = {
  order: LIST.map((m) => m.id),
  list: Object.fromEntries(LIST.map((m) => [m.id, m])) as Record<ModifierId, DailyModifierDef>,
  // A15.7 Daily Challenge 2.0: Standard War at L7; a banked reward (+1 a day, up to 7, a new save
  // starts with 1) pays an Age Capsule, other wins 20 Amber; Recruit II, Veteran V, Warlord VIII
  challenge: {
    format: 'standard',
    firstWinReward: 'ageCapsule',
    winAmber: 20,
    resetHour: 4,
    bankMax: 7,
    bankStart: 1,
    standardLevel: 7,
    difficulties: { recruit: 2, veteran: 5, warlord: 8 },
    generals: ['pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest'],
  },
};
