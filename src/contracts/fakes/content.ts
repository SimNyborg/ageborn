/**
 * Mini content set for tests and dev pages (DESIGN C2/WP0 task 5): 2 ages × 3 units.
 *
 * Stone: bonker, pebbler, tuskback. Medieval: footman, longbowman, destrier_knight.
 * Plus one turret and the starter powers per age so loadouts are complete.
 *
 * Values are the DESIGN A5.2/A5.3 table values in table units (lu, ms, whole HP, gold), not the
 * compiled integer units of B3/B4. The shape is exactly `CompiledContent`; this set is for UI,
 * render, audio and wiring tests, never for balance. The real content comes from WP1's compiler.
 *
 * `ages` and `formats` must be total records by type, so all five `AgeDef`s exist, but every fake
 * format only spans Stone and Medieval, and only those two ages have cards.
 */
import type {
  AgeDef,
  AttackDef,
  CompiledContent,
  EconomyRules,
  FormatDef,
  PowerDef,
  ResearchPickDef,
  ResearchRules,
  TurretDef,
  UnitDef,
} from '../content';
import type { AgeId, CardId, FormatId } from '../ids';
import type { Loadout, SideConfig } from '../sim';

/** The two ages that have cards in the fake set. */
export const FAKE_AGES: readonly AgeId[] = ['stone', 'medieval'];

/** Infantry melee "Blunt" (DESIGN A2.6). Heavies carry no mods. */
const BLUNT_MODS: AttackDef['mods'] = [{ vs: 'armored', bp: 7000 }];

function unit(
  u: Omit<UnitDef, 'kind' | 'visualId' | 'nameKey' | 'descKey' | 'strongVs' | 'weakVs' | 'abilities' | 'sfx'> &
    Partial<Pick<UnitDef, 'abilities' | 'sfx'>>,
): UnitDef {
  return {
    kind: 'unit',
    visualId: `unit.${u.id}`,
    nameKey: `card.${u.id}.name`,
    descKey: `card.${u.id}.desc`,
    strongVs: [],
    weakVs: [],
    abilities: [],
    sfx: { spawn: 'spawn_pop', die: 'die_bio' },
    ...u,
  };
}

const units: Record<CardId, UnitDef> = {
  bonker: unit({
    id: 'bonker', age: 'stone', rarity: 'common', role: 'infantry', group: 'infantry',
    cost: 50, trainMs: 1500, pop: 2, hp: 160, speed: 70, size: 'small', tags: ['light', 'bio', 'melee', 'ground'],
    attacks: [{ damage: 20, intervalMs: 1000, range: 16, hitsGround: true, hitsAir: false, dmgType: 'blunt', sfx: 'swing_whoosh', mods: BLUNT_MODS }],
  }),
  pebbler: unit({
    id: 'pebbler', age: 'stone', rarity: 'common', role: 'ranged', group: 'ranged',
    cost: 75, trainMs: 2000, pop: 3, hp: 95, speed: 65, size: 'small', tags: ['light', 'bio', 'ranged', 'ground'],
    attacks: [{
      damage: 18, intervalMs: 1400, range: 200, hitsGround: true, hitsAir: true, dmgType: 'blunt', sfx: 'shot_sling',
      projectile: { speed: 500, visualId: 'proj.rock' }, chain: { count: 2, hop: 40 },
    }],
  }),
  tuskback: unit({
    id: 'tuskback', age: 'stone', rarity: 'common', role: 'heavy', group: 'heavy',
    cost: 150, trainMs: 4000, pop: 6, hp: 560, speed: 55, size: 'large', tags: ['armored', 'bio', 'melee', 'ground'],
    attacks: [{ damage: 42, intervalMs: 1500, range: 16, hitsGround: true, hitsAir: false, dmgType: 'blunt', sfx: 'swing_whoosh' }],
    abilities: [{ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }],
    sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
  }),
  footman: unit({
    id: 'footman', age: 'medieval', rarity: 'common', role: 'infantry', group: 'infantry',
    cost: 50, trainMs: 1500, pop: 2, hp: 216, speed: 70, size: 'small', tags: ['light', 'bio', 'melee', 'ground'],
    attacks: [{ damage: 27, intervalMs: 1000, range: 16, hitsGround: true, hitsAir: false, dmgType: 'slash', sfx: 'swing_whoosh', mods: BLUNT_MODS }],
    abilities: [{ kind: 'resist', minSourceRange: 100, bp: 2500 }],
  }),
  longbowman: unit({
    id: 'longbowman', age: 'medieval', rarity: 'common', role: 'ranged', group: 'ranged',
    cost: 75, trainMs: 2000, pop: 3, hp: 128, speed: 65, size: 'small', tags: ['light', 'bio', 'ranged', 'ground'],
    attacks: [{
      damage: 24, intervalMs: 1400, range: 230, hitsGround: true, hitsAir: true, dmgType: 'pierce', sfx: 'shot_bow',
      projectile: { speed: 650, visualId: 'proj.arrow' },
    }],
  }),
  destrier_knight: unit({
    id: 'destrier_knight', age: 'medieval', rarity: 'common', role: 'heavy', group: 'heavy',
    cost: 150, trainMs: 4000, pop: 6, hp: 756, speed: 60, size: 'large', tags: ['armored', 'bio', 'melee', 'ground'],
    attacks: [{ damage: 57, intervalMs: 1500, range: 16, hitsGround: true, hitsAir: false, dmgType: 'pierce', sfx: 'swing_whoosh' }],
    abilities: [{ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }],
    sfx: { spawn: 'spawn_heavy', die: 'die_bio' },
  }),
};

const turrets: Record<CardId, TurretDef> = {
  rock_tosser: {
    id: 'rock_tosser', kind: 'turret', age: 'stone', rarity: 'common', cost: 150,
    attack: {
      damage: 30, intervalMs: 1500, windupPct: 0, range: 360, hitsGround: true, hitsAir: true, dmgType: 'blunt',
      sfx: 'shot_catapult', projectile: { speed: 450, arc: true, visualId: 'proj.boulder' },
    },
    visualId: 'turret.rock_tosser', nameKey: 'card.rock_tosser.name', descKey: 'card.rock_tosser.desc',
  },
  crossbow_nest: {
    id: 'crossbow_nest', kind: 'turret', age: 'medieval', rarity: 'common', cost: 150,
    attack: {
      damage: 40, intervalMs: 1500, windupPct: 0, range: 380, hitsGround: true, hitsAir: true, dmgType: 'pierce',
      sfx: 'shot_crossbow', projectile: { speed: 650, visualId: 'proj.bolt' },
    },
    visualId: 'turret.crossbow_nest', nameKey: 'card.crossbow_nest.name', descKey: 'card.crossbow_nest.desc',
  },
};

const powers: Record<CardId, PowerDef> = {
  rockslide: {
    id: 'rockslide', kind: 'power', age: 'stone', slot: 'home', reach: 'home', family: 'sweep', rarity: 'common', source: 'starter',
    cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 6,
    effect: { kind: 'sweep', zone: 450, durationMs: 1500, damage: 130, width: 40, hitsAir: false },
    visualId: 'power.rockslide', sfx: 'pw_rockslide', nameKey: 'card.rockslide.name', descKey: 'card.rockslide.desc',
  },
  stampede: {
    id: 'stampede', kind: 'power', age: 'stone', slot: 'field', reach: 'front', family: 'charge', rarity: 'common', source: 'starter',
    cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 6,
    effect: { kind: 'stampede', runners: 5, spacingMs: 400, distance: 500, speed: 400, damage: 50, knockback: 40, maxHitsPerEnemy: 3 },
    visualId: 'power.stampede', sfx: 'pw_stampede', nameKey: 'card.stampede.name', descKey: 'card.stampede.desc',
  },
  arrow_storm: {
    id: 'arrow_storm', kind: 'power', age: 'medieval', slot: 'home', reach: 'home', family: 'bombard', rarity: 'common', source: 'starter',
    cost: 100, reloadMs: 40000, telegraphMs: 1000, maxTargets: 5,
    effect: { kind: 'barrage', count: 40, durationMs: 2500, zone: 450, damage: 50, radius: 20, jitter: 20, hitsAir: true, pattern: 'even' },
    visualId: 'power.arrow_storm', sfx: 'pw_arrows', nameKey: 'card.arrow_storm.name', descKey: 'card.arrow_storm.desc',
  },
};

function age(id: AgeId, index: number, pBp: number, xpToNext: number | null): AgeDef {
  return {
    id, index, pBp, baseHp: pBp, xpToNext, paletteId: `palette.${id}`,
    baseVisualId: `base.${id}`, backdropVisualId: `backdrop.${id}`, musicCue: `music.${id}`,
  };
}

/** DESIGN A17.8 (P, base HP, thresholds; eight ages). */
const ages: Record<AgeId, AgeDef> = {
  stone: age('stone', 0, 10000, 550),
  bronze: age('bronze', 1, 11600, 500),
  medieval: age('medieval', 2, 13500, 900),
  gunpowder: age('gunpowder', 3, 18200, 700),
  industrial: age('industrial', 4, 21200, 800),
  modern: age('modern', 5, 24600, 1200),
  future: age('future', 6, 33200, 1300),
  cosmic: age('cosmic', 7, 44800, null),
};

function format(id: FormatId, overdriveMs: number | null, siegeMs: number | null, finalBellMs: number | null): FormatDef {
  return { id, ages: [...FAKE_AGES], overdriveMs, siegeMs, finalBellMs, retreatAfterMs: finalBellMs === null ? null : 60000 };
}

/** DESIGN A2.10 timers; ages cut to the fake set. */
const formats: Record<FormatId, FormatDef> = {
  tutorial: { ...format('tutorial', null, null, null), xpToNextOverride: [250] },
  short: format('short', 210000, 270000, 360000),
  standard: format('standard', 270000, 360000, 450000),
  full: format('full', 330000, 450000, 570000),
};

/** DESIGN A2.3, A2.4, A2.7-A2.11 values. `emoteCooldownMs` is not in DESIGN; 3 s is a fake value. */
export const fakeEconomy: EconomyRules = {
  startGold: 175, passiveGoldPerSec: 6, passiveXpPerSec: 4,
  mountCosts: [0, 150, 350, 700],
  bountyGoldBp: 6000, bountyXpBp: 10000, powerKillGoldBp: 3000, powerKillXpBp: 0,
  ownLossXpBp: 4000, underdogBp: 5000, baseDamageXpPerPct: 12, xpCapBp: 15000,
  popCap: 60,
  popByGroup: { infantry: 2, ranged: 3, antiArmor: 4, support: 4, heavy: 6, epic: 8, legendary: 14 },
  queueMax: 5, legendaryLimit: 1, sellRefundBp: 5000, turretRangeCap: 480, turretRangeHardCapLu: 560, turretBuildMs: 1000, turretSellMs: 1000,
  ascendMs: 2500, evolveHealBp: 500, vanguardCount: 2,
  powerCarryCapBp: 7500, overchargeXp: 1200, overchargeBp: 2500,
  overdrive: { baseGoldBp: 20000, xpBp: 20000, powerBp: 10000 },
  power: {
    startBp: 2500, emptyReloadMs: 40000, homeLineP: 1000, frontReachLu: 150, frontFloorP: 480, frontRank: 1,
    strikePickLu: 80, strikeEpicBp: 5000, legendaryControlBp: 5000, lockMs: 0,
  },
  siege: { turretDamageBp: 5000, baseDamageBp: 20000, decayBpPerSec: 50, moveSpeedBp: 12000, gateCrowdLu: 60 }, marchSpeedBp: 12500, frontWidth: 3,
  lastStand: { thresholdBp: 2500, autoBp: 1000, radius: 450, damagePerP: 200, knockback: 80, chargeMs: 1000 },
  spawnP: 20, holdLine: 320, holdRetreatSpeedBp: 7000, leash: 20, spacingBp: 3000,
  retargetMs: 1000, retargetCloserLu: 60, rangedSelfDefenseLu: 30, firstHitIdleMs: 2000,
  stanceCooldownMs: 2000,
  holdFlag: { minP: 320, maxP: 800, snapLu: 20, moveCooldownMs: 1000 }, fallbackP: 200,
  statCaps: { damageBp: 3500, takenBp: 3500, hpBp: 3000, attackSpeedBp: 2500, speedBp: 2000, rangeLu: 60 },
  sizes: { small: 24, medium: 32, large: 48, huge: 80 },
  knockbackResistBp: { small: 0, medium: 0, large: 5000, huge: 5000 },
  areaSecondaryBp: 5000, areaMaxTargets: 4, healLegendaryBp: 5000, legendaryPowerDamageBp: 5000,
  powerZoneClamp: [150, 1850], emoteCooldownMs: 3000, drawGapBp: 50, levelStepBp: 500, maxLevel: 10,
};

/** A small War Council (DESIGN A18.5.4): the Economy track only, enough for HUD and AI fakes. */
function econPick(rank: 1 | 2, pick: 0 | 1, slug: string, effects: ResearchPickDef['effects']): ResearchPickDef {
  const id = `economy.${slug}`;
  return { id, track: 'economy', group: null, rank, pick, effects, aiHint: 'opener', visualId: `research.${id}`, nameKey: `research.${id}.name`, descKey: `research.${id}.desc` };
}
export const fakeResearch: ResearchRules = {
  picks: [
    econPick(1, 0, 'granary', [{ kind: 'income', milliGoldPerSec: 1500 }]),
    econPick(1, 1, 'forage', [{ kind: 'bounty', addBp: 0, bonusBp: 4000, ownHalfOnly: true }]),
    econPick(2, 0, 'market', [{ kind: 'income', milliGoldPerSec: 2000 }]),
    econPick(2, 1, 'bounty_hunters', [{ kind: 'bounty', addBp: 1500, bonusBp: 0, ownHalfOnly: false }]),
  ],
  cost: { troops: [150, 300, 500], defences: [150, 300, 450], economy: [150, 300, 450], command: [150, 300, 450] },
  timeMs: [10000, 14000, 18000],
  cancelRefundBp: 7500,
  underdog: { discountBp: 2000, baseGapBp: 2000 },
  unlockAt: { '1': [0], '2': [0, 1], '3': [0, 1, 2] },
  classOfRole: {
    infantry: 'infantry', skirmisher: 'infantry', ranged: 'ranged', artillery: 'ranged', airBomber: 'ranged', airGunship: 'ranged',
    heavy: 'heavy', siege: 'heavy', siegeHeavy: 'heavy', antiArmor: 'antiArmor', antiMech: 'antiArmor', support: 'support',
  },
};

/** `max(1, round(ms / 50))` (DESIGN B3). */
function ticks(ms: number): number {
  return Math.max(1, Math.round(ms / 50));
}

/** The frozen fake bundle. */
export const fakeContent: CompiledContent = deepFreeze({
  hash: 'fake-content-v1',
  ages,
  formats,
  economy: fakeEconomy,
  units,
  turrets,
  powers,
  research: fakeResearch,
  skins: {
    pumpkin_head: {
      id: 'pumpkin_head', target: 'bonker', rarity: 'rare', visualId: 'unit.bonker@pumpkin_head',
      inCratePool: true, craftable: true, nameKey: 'skin.pumpkin_head.name',
    },
  },
  rarities: null,
  capsules: null,
  arenas: null,
  trophyRoad: null,
  generals: null,
  names: null,
  quests: null,
  dailyModifiers: null,
  cosmetics: null,
  counters: {},
  ticks: {
    ascend: ticks(2500),
    turretBuild: ticks(1000),
    turretSell: ticks(1000),
    stanceCooldown: ticks(2000),
    retarget: ticks(1000),
    healPulse: ticks(500),
    firstHitIdle: ticks(2000),
    lastStandCharge: ticks(1000),
  },
});

/** A complete fake loadout per fake age. */
export const fakeLoadouts: Record<'stone' | 'medieval', Loadout> = {
  stone: {
    units: ['bonker', 'pebbler', 'tuskback', null, null, null],
    turrets: ['rock_tosser', null],
    powers: { home: 'rockslide', field: 'stampede' },
  },
  medieval: {
    units: ['footman', 'longbowman', 'destrier_knight', null, null, null],
    turrets: ['crossbow_nest', null],
    powers: { home: 'arrow_storm', field: null },
  },
};

/** A side config using the fake loadouts at level 1. Pass `isBot: true` for the AI side. */
export function fakeSideConfig(o: { label?: string; isBot?: boolean } = {}): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(units), ...Object.keys(turrets)]) levels[id] = 1;
  return {
    label: o.label ?? (o.isBot ? 'AI Grogg' : 'Player'),
    isBot: o.isBot ?? false,
    loadouts: { stone: fakeLoadouts.stone, medieval: fakeLoadouts.medieval },
    levels,
    skins: {},
  };
}

function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}
