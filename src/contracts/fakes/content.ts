/**
 * Mini content set for tests and dev pages (DESIGN C2/WP0 task 5): 2 ages × 3 units.
 *
 * Stone: bonker, pebbler, tuskback. Medieval: footman, longbowman, destrier_knight.
 * Plus one turret and one default power per age so loadouts are complete.
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
  stampede: {
    id: 'stampede', kind: 'power', age: 'stone', slot: 'default', telegraphMs: 1000,
    effect: { kind: 'stampede', runners: 5, spacingMs: 400, distance: 500, speed: 400, damage: 50, knockback: 40, maxHitsPerEnemy: 3 },
    visualId: 'power.stampede', sfx: 'pw_stampede', nameKey: 'card.stampede.name', descKey: 'card.stampede.desc',
  },
  arrow_storm: {
    id: 'arrow_storm', kind: 'power', age: 'medieval', slot: 'default', telegraphMs: 1000,
    effect: { kind: 'barrage', count: 40, durationMs: 2500, zone: 450, damage: 40, radius: 20, jitter: 20, hitsAir: true, pattern: 'even' },
    visualId: 'power.arrow_storm', sfx: 'pw_arrows', nameKey: 'card.arrow_storm.name', descKey: 'card.arrow_storm.desc',
  },
};

function age(id: AgeId, index: number, pBp: number, xpToNext: number | null): AgeDef {
  return {
    id, index, pBp, baseHp: pBp, xpToNext, paletteId: `palette.${id}`,
    baseVisualId: `base.${id}`, backdropVisualId: `backdrop.${id}`, musicCue: `music.${id}`,
  };
}

/** DESIGN A2.2 (P, base HP) and A2.4 (thresholds). */
const ages: Record<AgeId, AgeDef> = {
  stone: age('stone', 0, 10000, 700),
  medieval: age('medieval', 1, 13500, 1000),
  gunpowder: age('gunpowder', 2, 18200, 1200),
  modern: age('modern', 3, 24600, 1500),
  future: age('future', 4, 33200, null),
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
  treasuryCosts: [200, 350, 550], treasuryMilliGoldPerSecPerLevel: 1500, mountCosts: [0, 150, 350, 700],
  bountyGoldBp: 6000, bountyXpBp: 10000, powerKillGoldBp: 3000, powerKillXpBp: 0,
  ownLossXpBp: 4000, underdogBp: 5000, baseDamageXpPerPct: 12, xpCapBp: 15000,
  popCap: 60,
  popByGroup: { infantry: 2, ranged: 3, antiArmor: 4, support: 4, heavy: 6, epic: 8, legendary: 14 },
  queueMax: 5, legendaryLimit: 1, sellRefundBp: 5000, turretRangeCap: 480, turretBuildMs: 1000, turretSellMs: 1000,
  ascendMs: 2500, evolveHealBp: 500, vanguardCount: 2,
  powerChargeMs: 50000, powerCarryCapBp: 5000, overchargeXp: 1200, overchargeBp: 2500,
  overdrive: { baseGoldBp: 20000, xpBp: 20000, powerBp: 12500 },
  siege: { turretDamageBp: 5000, baseDamageBp: 20000, decayBpPerSec: 50, moveSpeedBp: 12000, unitDamageTakenBp: 10000 }, marchSpeedBp: 12500,
  lastStand: { thresholdBp: 2500, autoBp: 1000, radius: 450, damagePerP: 200, knockback: 80, chargeMs: 1000 },
  spawnP: 20, holdLine: 320, holdRetreatSpeedBp: 7000, leash: 20, spacingBp: 3000,
  retargetMs: 1000, retargetCloserLu: 60, rangedSelfDefenseLu: 30, firstHitIdleMs: 2000,
  stanceCooldownMs: 2000,
  sizes: { small: 24, medium: 32, large: 48, huge: 80 },
  knockbackResistBp: { small: 0, medium: 0, large: 5000, huge: 5000 },
  areaSecondaryBp: 5000, areaMaxTargets: 4, healLegendaryBp: 5000, legendaryPowerDamageBp: 5000,
  powerZoneClamp: [150, 1850], emoteCooldownMs: 3000, drawGapBp: 50, levelStepBp: 500, maxLevel: 10,
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
    powerCharge: ticks(50000),
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
  stone: { units: ['bonker', 'pebbler', 'tuskback', null, null], turrets: ['rock_tosser', null], power: 'stampede' },
  medieval: {
    units: ['footman', 'longbowman', 'destrier_knight', null, null],
    turrets: ['crossbow_nest', null],
    power: 'arrow_storm',
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
