// FROZEN FIXTURE: a copy of src/content/raw/research.ts taken at the A18 contract bump (2026-09-28,
// SIM_VERSION 3.0.0), so the golden replays and rule tests exercise the War Council. Never edit it.

/**
 * The War Council (DESIGN A18.5): in-battle research in four tracks, one research slot, 1-of-2 picks
 * that differ in kind. Data only; the sim applies it (`sim/research.ts`) and the AI reads `aiHint`.
 *
 * v1 (A18.13 phase 3): Economy I-II, Defences I-II, Troops I-II for Infantry, Heavy, Anti-armor and
 * Support, Troops I for Ranged, Command I (28 picks). Ranged rank II (Fire Arrows, Pierce), every
 * rank III, Command II-III and the Air and Underground lines wait for v1.1 and their classes: v1 has
 * no damage-over-time status, so Fire Arrows moves with Pierce (A18.5.2 "Kinds").
 *
 * Units: gold, ms, lu and bp, like the other raw tables. Every pick's effect applies to own units of
 * its class spawned after it completes (A18.2 rule 2); turret, economy and command picks apply at once.
 */
import type { ResearchClass, ResearchEffect, ResearchPickDef, ResearchRules, ResearchTrack, ResearchAiHint } from '@/contracts/content';
import type { Role } from '@/contracts/ids';

function pick(
  track: ResearchTrack,
  group: ResearchClass | null,
  rank: 1 | 2 | 3,
  side: 0 | 1,
  slug: string,
  aiHint: ResearchAiHint,
  effects: ResearchEffect[],
): ResearchPickDef {
  const id = group ? `${track}.${group}.${slug}` : `${track}.${slug}`;
  return { id, track, group, rank, pick: side, effects, aiHint, visualId: `research.${id}`, nameKey: `research.${id}.name`, descKey: `research.${id}.desc` };
}

/** Mail (A18.5.2): each hit taken −N flat, N = 25% of that age's Infantry Common L1 damage. */
const MAIL: ResearchEffect = { kind: 'mail', ofInfantryDamageBp: 2500 };
const WEAPONS: ResearchEffect = { kind: 'unitStat', stat: 'damage', bp: 1000 };

/** Troops (A18.5.2): each class has its own line; rank I a stat choice, rank II an ability. */
const troops: ResearchPickDef[] = [
  // Infantry
  pick('troops', 'infantry', 1, 0, 'weapons', 'vsHeavy', [WEAPONS]),
  pick('troops', 'infantry', 1, 1, 'mail', 'vsSwarm', [MAIL]),
  pick('troops', 'infantry', 2, 0, 'shield_wall', 'vsRanged', [
    { kind: 'resist', minSourceRange: 100, bp: 2000 },
    { kind: 'unitStat', stat: 'speed', bp: -800 },
  ]),
  pick('troops', 'infantry', 2, 1, 'rush', 'push', [
    { kind: 'unitStat', stat: 'speed', bp: 1500 },
    { kind: 'firstHit', bp: 3000, knockback: 0 },
  ]),
  // Ranged (rank II Fire Arrows / Pierce: v1.1, see the module doc)
  pick('troops', 'ranged', 1, 0, 'weapons', 'vsSwarm', [WEAPONS]),
  pick('troops', 'ranged', 1, 1, 'long_draw', 'defend', [
    { kind: 'unitRange', lu: 30 },
    { kind: 'unitStat', stat: 'attackSpeed', bp: -800 },
  ]),
  // Heavy
  pick('troops', 'heavy', 1, 0, 'plating', 'vsSwarm', [{ kind: 'takenFrom', from: 'infantry', bp: 1500 }]),
  pick('troops', 'heavy', 1, 1, 'weapons', 'vsHeavy', [WEAPONS]),
  pick('troops', 'heavy', 2, 0, 'trample', 'push', [{ kind: 'firstHit', bp: 0, knockback: 30 }]),
  pick('troops', 'heavy', 2, 1, 'bulwark', 'vsRanged', [{ kind: 'aura', radius: 60, stat: 'guard', bp: 1000, behindOnly: true }]),
  // Anti-armor
  pick('troops', 'antiArmor', 1, 0, 'hunters', 'vsHeavy', [{ kind: 'damageVs', tags: ['armored'], bp: 1200 }]),
  pick('troops', 'antiArmor', 1, 1, 'lightfoot', 'push', [{ kind: 'unitStat', stat: 'speed', bp: 1200 }]),
  pick('troops', 'antiArmor', 2, 0, 'ambush', 'defend', [{ kind: 'firstHit', bp: 4000, knockback: 0, whileHolding: true }]),
  pick('troops', 'antiArmor', 2, 1, 'skirmish', 'vsSwarm', [{ kind: 'takenFrom', from: 'infantry', bp: 2000 }]),
  // Support
  pick('troops', 'support', 1, 0, 'field_care', 'busy', [{ kind: 'unitStat', stat: 'heal', bp: 2000 }]),
  pick('troops', 'support', 1, 1, 'mail', 'vsSwarm', [MAIL]),
  pick('troops', 'support', 2, 0, 'war_drums', 'push', [{ kind: 'aura', radius: 160, stat: 'attackSpeed', bp: 800 }]),
  pick('troops', 'support', 2, 1, 'rally', 'defend', [{ kind: 'aura', radius: 160, stat: 'guard', bp: 1000 }]),
];

/** Defences (A18.5.3): range only at rank I, so it cannot be stacked twice inside the Council. */
const defences: ResearchPickDef[] = [
  pick('defences', null, 1, 0, 'watchtowers', 'defend', [{ kind: 'turret', stat: 'range', value: 40 }]),
  pick('defences', null, 1, 1, 'quick_loaders', 'defend', [{ kind: 'turret', stat: 'attackSpeed', value: 1500 }]),
  pick('defences', null, 2, 0, 'engineers', 'quiet', [{ kind: 'modernise', priceBp: 5000, buildMs: 500 }]),
  pick('defences', null, 2, 1, 'arsenal', 'defend', [{ kind: 'turret', stat: 'damage', value: 1200 }]),
];

/** Economy (A18.5.4, replaces the Treasury): no second research slot anywhere, never doubled by Overdrive. */
const economy: ResearchPickDef[] = [
  pick('economy', null, 1, 0, 'granary', 'opener', [{ kind: 'income', milliGoldPerSec: 1500 }]),
  pick('economy', null, 1, 1, 'forage', 'defend', [{ kind: 'bounty', addBp: 0, bonusBp: 4000, ownHalfOnly: true }]),
  pick('economy', null, 2, 0, 'market', 'quiet', [{ kind: 'income', milliGoldPerSec: 2000 }]),
  pick('economy', null, 2, 1, 'bounty_hunters', 'busy', [{ kind: 'bounty', addBp: 1500, bonusBp: 0, ownHalfOnly: false }]),
];

/** Command (A18.5.5): rank I in v1; Survey Corps, Master Gunners, Reserve Charge and Last Stand Drill in v1.1. */
const command: ResearchPickDef[] = [
  pick('command', null, 1, 0, 'signal_fires', 'power', [{ kind: 'powerCharge', bp: 1500 }]),
  pick('command', null, 1, 1, 'war_horns', 'push', [{ kind: 'warHorns', chargeSpeedBp: 800, holdDamageBp: 1000, flagMaxP: 480, nearLu: 60 }]),
];

/**
 * The Troops class of every role (A18.5.2: Epics and Legendaries count in their base role's class).
 * Until the Air and Siege lines exist, skirmishers count as Infantry, artillery and air units as Ranged,
 * the battering ram and siege heavies as Heavy, and anti-mech units as Anti-armor (docs/decisions.md).
 */
const classOfRole: Record<Role, ResearchClass> = {
  infantry: 'infantry',
  skirmisher: 'infantry',
  ranged: 'ranged',
  artillery: 'ranged',
  airBomber: 'ranged',
  airGunship: 'ranged',
  heavy: 'heavy',
  siege: 'heavy',
  siegeHeavy: 'heavy',
  antiArmor: 'antiArmor',
  antiMech: 'antiArmor',
  support: 'support',
};

export const research: ResearchRules = {
  picks: [...economy, ...defences, ...troops, ...command],
  // A18.5: every rank I costs 150; rank II 300; rank III 500 (Troops) or 450 (the others)
  cost: { troops: [150, 300, 500], defences: [150, 300, 450], economy: [150, 300, 450], command: [150, 300, 450] },
  // A18.5.1: rank I 10 s, rank II 14 s, rank III 18 s
  timeMs: [10000, 14000, 18000],
  cancelRefundBp: 7500,
  // A18.5.1: −20% while the side is behind in age position or 20+ points of base HP
  underdog: { discountBp: 2000, baseGapBp: 2000 },
  // A18.5.1 rank unlocks by window length: position (0-based) of the age where each rank opens
  unlockAt: { '1': [0], '2': [0, 1], '3': [0, 1, 2], '4': [0, 1, 3], '5': [0, 1, 3], '7': [0, 2, 4] },
  classOfRole,
};
