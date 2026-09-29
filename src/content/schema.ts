/**
 * Content validation (DESIGN B4 Validation). Runs in tests and at dev boot, never in production
 * (`index.ts` does not import this module, so Valibot stays out of the shipped bundle).
 *
 * Two layers:
 * 1. Structural Valibot schemas for every table: exact keys (strict objects), integer numbers, enums,
 *    and explicit `hitsGround` / `hitsAir` on every attack.
 * 2. Semantic checks: unique ids, cross-references (skin → card, loadout → age, power → age, road →
 *    power, gate → arena ...), the A5.1 collection shape and per-age slots, group-derived pop and
 *    train times, the counter matrix, and the capsule, road and ladder tables.
 *
 * Visual, effect and sound ids are checked against the manifests in `tests/integrity` (WP12, B4).
 */
import * as v from 'valibot';
import type { AttackDef, UnitDef } from '@/contracts/content';
import type { AgeId, CardId, Rarity, RoleGroup } from '@/contracts/ids';
import { BP, LANE_MLU, MILLI } from '@/core/fixed';
import { skinnedVisualId } from '@/core/ids';
import { AGE_ORDER } from './ages';
import type { RawContent } from './raw/types';
import { roadAmber } from './trophyRoad';
import type { Content } from './types';

// ---------------------------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------------------------

const int = v.pipe(v.number(), v.integer());
const nonNeg = v.pipe(v.number(), v.integer(), v.minValue(0));
const pos = v.pipe(v.number(), v.integer(), v.minValue(1));
const bp = nonNeg;
const pct = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100));
const id = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9_]*$/, 'ids are lower snake_case'));
const key = v.pipe(v.string(), v.regex(/^[a-zA-Z][\w.]*$/, 'i18n keys are dot paths'));
const visual = v.pipe(v.string(), v.regex(/^[a-z]+\.[\w@.]+$/, 'visual ids look like "unit.bonker"'));
const sound = v.pipe(v.string(), v.minLength(1));

const AGE = v.picklist(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic']);
const RARITY = v.picklist(['common', 'rare', 'epic', 'legendary']);
const SKIN_RARITY = v.picklist(['rare', 'epic', 'legendary']);
const FORMAT = v.picklist(['tutorial', 'short', 'standard', 'full']);
/** Any content format key (A18.3.4: named formats and windows such as `short.bronze`, `w2.medieval`). */
const FORMAT_KEY = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9]*(\.[a-z]+)?$/, 'format keys look like "short" or "w2.bronze"'));
const FORMAT_KIND = v.picklist(['tutorial', 'short', 'standard', 'full', 'window']);
const TIER = v.picklist(['clay', 'bronze', 'silver', 'jade', 'aeon']);
const FOIL = v.picklist(['none', 'bronze', 'silver', 'holo']);
const TAG = v.picklist(['light', 'armored', 'bio', 'mech', 'ground', 'air', 'legendary', 'support', 'ranged', 'melee']);
const ROLE = v.picklist([
  'infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'skirmisher', 'siege', 'artillery', 'airBomber', 'airGunship', 'antiMech', 'siegeHeavy',
]);
const GROUP = v.picklist(['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary']);
const DMG = v.picklist(['blunt', 'slash', 'pierce', 'bullet', 'laser', 'blast']);
const SIZE = v.picklist(['small', 'medium', 'large', 'huge']);
const STATUS = v.picklist(['stun', 'slow', 'mark', 'shield', 'regen', 'damageBuff', 'speedBuff', 'attackSpeedBuff']);
const PRIORITY = v.picklist(['front', 'armored', 'backline', 'air', 'densest']);
const CAPSULE_KIND = v.picklist(['win', 'daily', 'road', 'meter', 'age', 'codex', 'conquest', 'ageUnlock']);
const EMOTE = v.picklist(['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg']);
const GENERAL = v.picklist(['grogg', 'pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest', 'warden', 'echo']);
const DIFFICULTY = v.picklist(['easy', 'normal', 'hard', 'expert', 'legendary']);

function byKeys<T extends v.GenericSchema>(keys: readonly string[], value: T) {
  return v.strictObject(Object.fromEntries(keys.map((k) => [k, value])) as Record<string, T>);
}
const perRarity = <T extends v.GenericSchema>(s: T) => byKeys(['common', 'rare', 'epic', 'legendary'], s);
const perTier = <T extends v.GenericSchema>(s: T) => byKeys(['clay', 'bronze', 'silver', 'jade', 'aeon'], s);
const perSize = <T extends v.GenericSchema>(s: T) => byKeys(['small', 'medium', 'large', 'huge'], s);
const perGroup = <T extends v.GenericSchema>(s: T) =>
  byKeys(['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'], s);
const perAge = <T extends v.GenericSchema>(s: T) => byKeys(AGE_ORDER, s);

// ---------------------------------------------------------------------------------------------
// Battle tables (B15 content.ts)
// ---------------------------------------------------------------------------------------------

const StatusApplyS = v.strictObject({
  kind: STATUS,
  magnitudeBp: bp,
  durationMs: nonNeg,
  amount: v.optional(nonNeg),
  frozen: v.optional(v.boolean()),
});

export const AttackSchema = v.strictObject({
  damage: nonNeg,
  intervalMs: pos,
  windupPct: v.optional(pct),
  range: nonNeg,
  minRange: v.optional(nonNeg),
  // B4: every attack states hitsGround and hitsAir explicitly.
  hitsGround: v.boolean(),
  hitsAir: v.boolean(),
  projectile: v.optional(
    v.union([
      v.strictObject({ speed: pos, arc: v.optional(v.boolean()), visualId: visual }),
      v.strictObject({ instant: v.literal(true), effectId: visual }),
    ]),
  ),
  dmgType: DMG,
  sfx: sound,
  splashRadius: v.optional(pos),
  pierce: v.optional(v.strictObject({ count: pos, length: pos })),
  cleave: v.optional(v.strictObject({ count: pos, reach: pos })),
  chain: v.optional(v.strictObject({ count: pos, hop: pos })),
  line: v.optional(v.strictObject({ fromGate: pos })),
  gateZone: v.optional(v.strictObject({ radius: pos })),
  followBehind: v.optional(pos),
  volley: v.optional(pos),
  scatter: v.optional(nonNeg),
  maxTargets: v.optional(pos),
  mods: v.optional(v.array(v.strictObject({ vs: TAG, bp }))),
  vsBaseDamage: v.optional(nonNeg),
  priority: v.optional(PRIORITY),
  onHit: v.optional(v.array(StatusApplyS)),
  drag: v.optional(v.strictObject({ distance: pos })),
  pull: v.optional(v.strictObject({ radius: pos, fractionBp: bp })),
});

export const AbilitySchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('firstHitBonus'), multBp: bp, knockback: int, idleResetMs: pos }),
  v.strictObject({ kind: v.literal('aura'), radius: pos, status: StatusApplyS }),
  v.strictObject({ kind: v.literal('heal'), hpPerSec: pos, radius: pos, targets: pos, pulseMs: pos }),
  v.strictObject({ kind: v.literal('pounce'), searchRange: pos, cooldownMs: pos, leapMs: pos, firstBiteBp: bp }),
  v.strictObject({ kind: v.literal('riders'), count: pos, attack: AttackSchema, onDeathSpawn: id }),
  v.strictObject({ kind: v.literal('onDeathExplode'), damage: pos, radius: pos }),
  v.strictObject({
    kind: v.literal('periodicShieldAura'), everyMs: pos, radius: pos, maxTargets: pos, shield: pos, durationMs: pos,
  }),
  v.strictObject({
    kind: v.literal('callStrike'), everyMs: pos, searchRange: pos, delayMs: pos, damage: pos, radius: pos, sideLockoutMs: nonNeg,
  }),
  v.strictObject({ kind: v.literal('emp'), everyMs: pos, triggerRadius: pos, radius: pos, stunMs: pos }),
  v.strictObject({ kind: v.literal('timeStop'), everyMs: pos, radius: pos, freezeMs: pos, legendaryFreezeMs: pos }),
  v.strictObject({ kind: v.literal('innateShield'), amount: pos, regenPerSec: nonNeg, delayMs: nonNeg }),
  v.strictObject({ kind: v.literal('resist'), minSourceRange: nonNeg, bp }),
  v.strictObject({ kind: v.literal('brace') }),
  v.strictObject({ kind: v.literal('siegeOnly') }),
  v.strictObject({ kind: v.literal('bomber'), dropWindow: pos }),
  v.strictObject({ kind: v.literal('followSupport'), behindFront: nonNeg, soloMaxP: pos }),
]);

export const UnitSchema = v.strictObject({
  id,
  kind: v.literal('unit'),
  age: AGE,
  rarity: RARITY,
  role: ROLE,
  group: GROUP,
  cost: pos,
  trainMs: pos,
  pop: pos,
  hp: pos,
  speed: pos,
  size: SIZE,
  tags: v.array(TAG),
  attacks: v.array(AttackSchema),
  abilities: v.array(AbilitySchema),
  visualId: visual,
  sfx: v.strictObject({ spawn: sound, die: sound }),
  nameKey: key,
  descKey: key,
  strongVs: v.array(id),
  weakVs: v.array(id),
  hidden: v.optional(v.boolean()),
});

export const TurretSchema = v.strictObject({
  id,
  kind: v.literal('turret'),
  age: AGE,
  rarity: v.picklist(['common', 'rare', 'epic']),
  cost: pos,
  attack: AttackSchema,
  visualId: visual,
  nameKey: key,
  descKey: key,
});

const PowerEffectSchema = v.variant('kind', [
  v.strictObject({
    kind: v.literal('barrage'), count: pos, durationMs: pos, zone: pos, damage: pos, radius: pos, jitter: nonNeg,
    hitsAir: v.boolean(), pattern: v.picklist(['even', 'line']),
  }),
  v.strictObject({ kind: v.literal('sweep'), zone: pos, durationMs: pos, damage: pos, width: pos, hitsAir: v.boolean() }),
  v.strictObject({
    kind: v.literal('stampede'), runners: pos, spacingMs: pos, distance: pos, speed: pos, damage: pos, knockback: nonNeg,
    maxHitsPerEnemy: pos,
  }),
  v.strictObject({ kind: v.literal('buffAll'), statuses: v.array(StatusApplyS) }),
  v.strictObject({ kind: v.literal('cloud'), width: pos, durationMs: pos, enemyMissBp: bp, allyDamageBp: bp }),
  v.strictObject({ kind: v.literal('paradrop'), card: id, count: pos, beyondFront: pos, fallbackP: pos }),
]);

export const PowerSchema = v.strictObject({
  id,
  kind: v.literal('power'),
  age: AGE,
  slot: v.picklist(['default', 'alternate']),
  telegraphMs: pos,
  effect: PowerEffectSchema,
  visualId: visual,
  sfx: sound,
  nameKey: key,
  descKey: key,
});

const AgeSchema = v.strictObject({
  id: AGE,
  index: nonNeg,
  pBp: pos,
  baseHp: pos,
  xpToNext: v.nullable(pos),
  paletteId: v.string(),
  baseVisualId: visual,
  backdropVisualId: visual,
  musicCue: v.string(),
});

const FormatSchema = v.strictObject({
  id: FORMAT_KEY,
  kind: v.optional(FORMAT_KIND),
  ages: v.array(AGE),
  overdriveMs: v.nullable(pos),
  siegeMs: v.nullable(pos),
  finalBellMs: v.nullable(pos),
  retreatAfterMs: v.nullable(pos),
  xpToNextOverride: v.optional(v.array(pos)),
});

const EconomySchema = v.strictObject({
  startGold: nonNeg, passiveGoldPerSec: nonNeg, passiveXpPerSec: nonNeg,
  mountCosts: v.array(nonNeg),
  bountyGoldBp: bp, bountyXpBp: bp, powerKillGoldBp: bp, powerKillXpBp: bp,
  ownLossXpBp: bp, underdogBp: bp, baseDamageXpPerPct: nonNeg, xpCapBp: bp,
  popCap: pos, popByGroup: perGroup(pos), queueMax: pos, legendaryLimit: pos,
  sellRefundBp: bp, turretRangeCap: pos, turretRangeHardCapLu: pos, turretBuildMs: pos, turretSellMs: pos,
  ascendMs: pos, evolveHealBp: bp, vanguardCount: nonNeg,
  powerChargeMs: pos, powerCarryCapBp: bp, overchargeXp: pos, overchargeBp: bp,
  overdrive: v.strictObject({ baseGoldBp: bp, xpBp: bp, powerBp: bp }),
  siege: v.strictObject({ turretDamageBp: bp, baseDamageBp: bp, decayBpPerSec: bp, moveSpeedBp: pos, gateCrowdLu: nonNeg }),
  marchSpeedBp: pos, frontWidth: pos,
  gateFall: v.optional(v.strictObject({ lu: nonNeg, hpBp: bp })),
  openGateLu: v.optional(nonNeg),
  lastStand: v.strictObject({ thresholdBp: bp, autoBp: bp, radius: pos, damagePerP: pos, knockback: nonNeg, chargeMs: pos }),
  spawnP: nonNeg, holdLine: pos, holdRetreatSpeedBp: bp, leash: nonNeg, spacingBp: bp,
  retargetMs: pos, retargetCloserLu: nonNeg, rangedSelfDefenseLu: nonNeg, firstHitIdleMs: pos,
  stanceCooldownMs: pos, sizes: perSize(pos), knockbackResistBp: perSize(bp),
  holdFlag: v.strictObject({ minP: pos, maxP: pos, snapLu: pos, moveCooldownMs: pos }),
  fallbackP: pos,
  statCaps: v.strictObject({ damageBp: bp, takenBp: bp, hpBp: bp, attackSpeedBp: bp, speedBp: bp, rangeLu: nonNeg }),
  areaSecondaryBp: bp, areaMaxTargets: pos, healLegendaryBp: bp, legendaryPowerDamageBp: bp,
  powerZoneClamp: v.tuple([nonNeg, pos]), emoteCooldownMs: pos, drawGapBp: bp, levelStepBp: bp, maxLevel: pos,
});

// War Council (A18.5)
const RESEARCH_TRACK = v.picklist(['troops', 'defences', 'economy', 'command']);
const RESEARCH_CLASS = v.picklist(['infantry', 'ranged', 'heavy', 'antiArmor', 'support']);
const sbp = int;
const ResearchEffectSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('unitStat'), stat: v.picklist(['damage', 'hp', 'speed', 'attackSpeed', 'heal']), bp: sbp }),
  v.strictObject({ kind: v.literal('unitRange'), lu: pos }),
  v.strictObject({ kind: v.literal('damageVs'), tags: v.array(TAG), bp: pos }),
  v.strictObject({ kind: v.literal('mail'), ofInfantryDamageBp: pos }),
  v.strictObject({ kind: v.literal('resist'), minSourceRange: nonNeg, bp: pos }),
  v.strictObject({ kind: v.literal('takenFrom'), from: RESEARCH_CLASS, bp: pos }),
  v.strictObject({ kind: v.literal('firstHit'), bp: nonNeg, knockback: nonNeg, whileHolding: v.optional(v.boolean()) }),
  v.strictObject({ kind: v.literal('aura'), radius: pos, stat: v.picklist(['attackSpeed', 'guard']), bp: pos, behindOnly: v.optional(v.boolean()) }),
  v.strictObject({ kind: v.literal('turret'), stat: v.picklist(['range', 'attackSpeed', 'damage']), value: pos }),
  v.strictObject({ kind: v.literal('modernise'), priceBp: bp, buildMs: pos }),
  v.strictObject({ kind: v.literal('income'), milliGoldPerSec: pos }),
  v.strictObject({ kind: v.literal('bounty'), addBp: nonNeg, bonusBp: nonNeg, ownHalfOnly: v.boolean() }),
  v.strictObject({ kind: v.literal('powerCharge'), bp: pos }),
  v.strictObject({ kind: v.literal('warHorns'), chargeSpeedBp: nonNeg, holdDamageBp: nonNeg, flagMaxP: pos, nearLu: pos }),
]);
const ResearchPickSchema = v.strictObject({
  id: v.pipe(v.string(), v.regex(/^[a-z]+(\.[a-zA-Z]+)?\.[a-z_]+$/, 'research ids look like "economy.granary" or "troops.infantry.mail"')),
  track: RESEARCH_TRACK,
  group: v.nullable(RESEARCH_CLASS),
  rank: v.picklist([1, 2, 3]),
  pick: v.picklist([0, 1]),
  effects: v.pipe(v.array(ResearchEffectSchema), v.minLength(1)),
  aiHint: v.picklist(['opener', 'vsSwarm', 'vsHeavy', 'vsRanged', 'defend', 'push', 'busy', 'quiet', 'power']),
  visualId: v.optional(visual),
  nameKey: key,
  descKey: key,
});
export const ResearchSchema = v.strictObject({
  picks: v.array(ResearchPickSchema),
  cost: byKeys(['troops', 'defences', 'economy', 'command'], v.array(pos)),
  timeMs: v.array(pos),
  cancelRefundBp: bp,
  underdog: v.strictObject({ discountBp: bp, baseGapBp: bp }),
  unlockAt: v.record(v.pipe(v.string(), v.regex(/^[1-9]$/)), v.array(nonNeg)),
  classOfRole: byKeys(['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'skirmisher', 'siege', 'artillery', 'airBomber', 'airGunship', 'antiMech', 'siegeHeavy'], RESEARCH_CLASS),
});

const SkinSchema = v.strictObject({
  id,
  target: v.string(),
  rarity: SKIN_RARITY,
  visualId: visual,
  inCratePool: v.boolean(),
  craftable: v.boolean(),
  sfxOverrides: v.optional(v.record(v.string(), sound)),
  nameKey: key,
});

const TicksSchema = v.strictObject({
  ascend: pos, powerCharge: pos, turretBuild: pos, turretSell: pos, stanceCooldown: pos,
  retarget: pos, healPulse: pos, firstHitIdle: pos, lastStandCharge: pos,
});

// ---------------------------------------------------------------------------------------------
// Meta tables (content/types.ts)
// ---------------------------------------------------------------------------------------------

const RaritiesSchema = v.strictObject({
  order: v.array(RARITY),
  cards: perRarity(
    v.strictObject({
      id: RARITY, index: nonNeg, upgradeCopies: v.array(pos), codexPoints: pos, dustPerExtraCopy: pos, craftCopyDust: pos, nameKey: key,
    }),
  ),
  upgradeAmber: v.array(pos),
  skinOrder: v.array(SKIN_RARITY),
  skins: byKeys(
    ['rare', 'epic', 'legendary'],
    v.strictObject({ id: SKIN_RARITY, crateOddsBp: bp, duplicateDust: pos, craftDust: pos, nameKey: key }),
  ),
  foilOrder: v.array(FOIL),
  foils: byKeys(['none', 'bronze', 'silver', 'holo'], v.strictObject({ id: FOIL, rank: nonNeg, rollBp: bp, nameKey: key })),
  levelTrims: v.array(v.strictObject({ trim: v.picklist(['bronze', 'silver', 'gold']), fromLevel: pos, visualId: visual })),
});

const CapsulesSchema = v.strictObject({
  tierOrder: v.array(TIER),
  tiers: perTier(
    v.strictObject({
      id: TIER, index: nonNeg, stacks: pos, copies: perRarity(pos), guaranteed: v.array(RARITY), rareToLegendaryBp: bp,
      legendaryUnownedFirst: v.boolean(), skinChanceBp: bp, bonusDust: nonNeg, amber: pos, expectedCopiesCenti: pos, nameKey: key,
    }),
  ),
  stackRollBp: perRarity(bp),
  bag: perTier(nonNeg),
  dailyOddsBp: perTier(bp),
  unownedWeight: pos,
  pity: v.strictObject({
    epicEvery: pos, legendaryFreeUntil: pos, legendaryStepBp: bp, legendaryGuaranteeAt: pos, newCardEvery: pos,
    wardrobeEpicEvery: pos, wardrobeLegendaryEvery: pos,
  }),
  charges: v.strictObject({ start: nonNeg, max: pos, regenMs: pos, freeCapsules: nonNeg }),
  clayMeterPips: pos,
  daily: v.strictObject({ firstAfterCapsule: pos, bankMax: pos }),
  supply: v.strictObject({ matchesPerCapsule: pos, allowanceMax: pos }),
  resetHour: v.pipe(int, v.minValue(0), v.maxValue(23)),
  kinds: byKeys(
    ['win', 'daily', 'road', 'meter', 'age', 'codex', 'conquest', 'ageUnlock'],
    v.strictObject({ kind: CAPSULE_KIND, climbFrom: v.nullable(TIER), countsForPity: v.boolean(), nameKey: key }),
  ),
  ageCapsule: v.strictObject({ stacks: pos, copiesTier: TIER, guaranteed: v.array(RARITY) }),
  codexCapsuleTier: TIER,
  ageUnlock: v.strictObject({ rareCopies: pos, commonCopies: pos }),
  script: v.array(
    v.strictObject({ capsule: pos, tier: TIER, cards: v.array(id), randomUnownedEpic: v.boolean(), fullWalkout: v.boolean() }),
  ),
  wardrobe: v.strictObject({ noDuplicateUntilAllOwned: v.boolean() }),
});

const GateRewardSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('starterPlan') }),
  v.strictObject({ kind: v.literal('banner'), banner: id }),
  v.strictObject({ kind: v.literal('capsule'), tier: TIER }),
  v.strictObject({ kind: v.literal('ageUnlock'), ages: v.array(AGE) }),
  v.strictObject({ kind: v.literal('conquestUnlock') }),
  v.strictObject({ kind: v.literal('skin'), skin: id }),
  v.strictObject({ kind: v.literal('wardenJoins') }),
]);

const ArenasSchema = v.strictObject({
  list: v.array(
    v.strictObject({
      index: pos,
      id: v.picklist(['tar_pits', 'frostfang', 'kingsmoat', 'powder_bay', 'iron_front', 'neon_harbor', 'orbital_ring', 'chrono_rift']),
      trophies: nonNeg,
      ladderFormats: v.array(FORMAT),
      dropAges: v.array(AGE),
      randomLegendaries: v.boolean(),
      botTiers: v.tuple([nonNeg, nonNeg]),
      botLevel: pos,
      botMaxRarity: v.picklist(['common', 'rare', 'epic']),
      wardenChanceBp: bp,
      gateRewards: v.array(GateRewardSchema),
      groundVisualId: visual,
      nameKey: key,
    }),
  ),
  ladder: v.strictObject({
    win: v.strictObject({ trophies: int, amber: nonNeg, amberWithoutCharge: nonNeg }),
    winByFormat: v.strictObject({
      fromTrophies: nonNeg,
      formats: v.partial(byKeys(['tutorial', 'short', 'standard', 'full'], v.strictObject({ trophies: int, amber: nonNeg, amberWithoutCharge: nonNeg }))),
    }),
    loss: v.strictObject({ trophies: int, amber: nonNeg, noLossBelowTrophies: nonNeg }),
    draw: v.strictObject({ trophies: int, amber: nonNeg }),
    lossProtection: v.strictObject({ streak: pos, tierDrop: pos }),
    skirmishWinAmber: nonNeg,
    mmr: v.strictObject({ start: pos, k: pos, tierRatingBase: pos, tierRatingStep: pos, tierOffset: pos, tierDivisor: pos }),
    maxTier: pos,
    newPlayer: v.strictObject({ matches: pos, mistakeBonusBp: bp }),
    levelRollBp: v.strictObject({ minus: bp, zero: bp, plus: bp }),
    standardLevel: pos,
  }),
});

const RoadRewardSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('amber'), amount: pos }),
  v.strictObject({ kind: v.literal('dust'), amount: pos }),
  v.strictObject({ kind: v.literal('power'), card: id }),
  v.strictObject({ kind: v.literal('capsule'), tier: TIER }),
  v.strictObject({ kind: v.literal('wardrobe') }),
  v.strictObject({ kind: v.literal('gate'), arena: pos }),
]);

const TrophyRoadSchema = v.strictObject({
  nodes: v.array(v.strictObject({ index: nonNeg, trophies: pos, rewards: v.array(RoadRewardSchema) })),
  amberFormula: v.strictObject({ base: pos, perHundred: pos }),
});

const LoadoutSchema = v.strictObject({
  units: v.pipe(v.array(v.nullable(id)), v.length(5)),
  turrets: v.pipe(v.array(v.nullable(id)), v.length(2)),
  power: id,
});

const GeneralsSchema = v.strictObject({
  order: v.array(GENERAL),
  list: byKeys(
    ['grogg', 'pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest', 'warden', 'echo'],
    v.strictObject({
      id: GENERAL,
      personality: v.picklist([
        'tutorial', 'balanced', 'rusher', 'turtle', 'greedy', 'artillery', 'counters', 'counterPicker', 'powerTiming', 'boss', 'mirror',
      ]),
      tiers: v.nullable(v.tuple([nonNeg, nonNeg])),
      weights: v.strictObject({
        aggr: pct, turret: pct, economy: pct, greed: pct, patience: pct, legendary: pct, hold: pct,
      }),
      scripted: v.boolean(),
      mirror: v.boolean(),
      warPlan: v.nullable(v.partial(perAge(LoadoutSchema))),
      legendaryLevel: v.nullable(pos),
      counterWeightBp: bp,
      baseStartBp: bp,
      neverEvolves: v.boolean(),
      signatureCards: v.array(id),
      portraits: pos,
      disclosureKeys: v.array(key),
      nameKey: key,
      personalityKey: key,
      signatureKey: key,
      lineKey: key,
    }),
  ),
  conquest: v.strictObject({
    unlockArena: pos,
    format: FORMAT,
    board: v.array(v.strictObject({ general: GENERAL, tier: nonNeg, level: pos })),
    stars: v.array(
      v.strictObject({
        star: v.picklist([1, 2, 3]),
        condition: v.variant('kind', [
          v.strictObject({ kind: v.literal('win') }),
          v.strictObject({ kind: v.literal('winBaseAbove'), bp }),
          v.strictObject({ kind: v.literal('winBefore'), ms: pos }),
        ]),
        reward: v.variant('kind', [
          v.strictObject({ kind: v.literal('amber'), amount: pos }),
          v.strictObject({ kind: v.literal('dust'), amount: pos }),
          v.strictObject({ kind: v.literal('ageCapsule') }),
        ]),
      }),
    ),
    milestones: v.array(v.strictObject({ stars: pos, capsule: TIER, title: v.nullable(id) })),
  }),
  commanderPersonalities: v.array(GENERAL),
  difficulty: v.strictObject({
    order: v.array(DIFFICULTY),
    tiers: byKeys(['easy', 'normal', 'hard', 'expert', 'legendary'], nonNeg),
    default: DIFFICULTY,
  }),
});

const NamesSchema = v.strictObject({
  aiPrefix: v.pipe(v.string(), v.startsWith('AI')),
  commanderFirst: v.strictObject({ start: v.array(v.string()), end: v.array(v.string()) }),
  commanderLast: v.strictObject({ start: v.array(v.string()), end: v.array(v.string()) }),
  player: v.strictObject({ prefixes: v.array(v.string()), digits: pos }),
});

const QuestRewardSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('amber'), amount: pos }),
  v.strictObject({ kind: v.literal('dust'), amount: pos }),
  v.strictObject({ kind: v.literal('ageCapsule') }),
  v.strictObject({ kind: v.literal('wardrobe') }),
]);

const QuestSchema = v.strictObject({
  id,
  metric: v.picklist([
    'wins', 'battles', 'unitsTrained', 'evolves', 'fastFinalAge', 'turretKills', 'winsWithoutTreasury', 'powerMultiHit', 'baseDamage',
    'heavyKillsByAA', 'winsWithLegendary', 'fastBaseKill', 'winsAfterLastStand', 'upgrades', 'dailyChallengeWins', 'countingWins',
  ]),
  target: pos,
  rewards: v.array(QuestRewardSchema),
  skirmishCounts: v.boolean(),
  requiresLegendary: v.boolean(),
  fromMatch: pos,
  beforeMsByFormat: v.optional(v.partial(byKeys(['tutorial', 'short', 'standard', 'full'], pos))),
  beforeMs: v.optional(pos),
  minHits: v.optional(pos),
  weight: pos,
  nameKey: key,
});

const QuestsSchema = v.strictObject({
  daily: v.array(QuestSchema),
  weekly: QuestSchema,
  dailyCount: pos,
  freeRerolls: nonNeg,
  queueMax: pos,
  resetHour: v.pipe(int, v.minValue(0), v.maxValue(23)),
  codex: v.strictObject({
    pointsPerLevel: pos,
    amberPerLevel: pos,
    capsule: v.strictObject({ firstLevel: pos, every: pos, tier: TIER }),
    wardrobe: v.strictObject({ firstLevel: pos, every: pos }),
  }),
});

const DailyModifiersSchema = v.strictObject({
  order: v.array(id),
  list: v.record(
    id,
    v.strictObject({
      id,
      index: pos,
      effect: v.variant('kind', [
        v.strictObject({ kind: v.literal('passiveGold'), bp }),
        v.strictObject({ kind: v.literal('unitHp'), bp }),
        v.strictObject({ kind: v.literal('powerCharge'), bp }),
        v.strictObject({ kind: v.literal('xpThreshold'), bp }),
        v.strictObject({ kind: v.literal('unitCost'), groups: v.array(GROUP), bp }),
        v.strictObject({ kind: v.literal('siegeShift'), ms: int }),
      ]),
      nameKey: key,
      descKey: key,
    }),
  ),
  challenge: v.strictObject({
    format: FORMAT,
    firstWinReward: v.literal('ageCapsule'),
    winAmber: pos,
    resetHour: nonNeg,
    bankMax: pos,
    bankStart: nonNeg,
    standardLevel: pos,
    difficulties: v.strictObject({ recruit: nonNeg, veteran: nonNeg, warlord: nonNeg }),
    generals: v.array(GENERAL),
  }),
});

const TitleUnlockSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('start') }),
  v.strictObject({ kind: v.literal('firstWin') }),
  v.strictObject({ kind: v.literal('reachAge'), age: AGE }),
  v.strictObject({ kind: v.literal('ownCard'), card: id }),
  v.strictObject({ kind: v.literal('codexLevel'), level: pos }),
  v.strictObject({ kind: v.literal('arena'), arena: pos }),
  v.strictObject({ kind: v.literal('winAfterLastStand') }),
  v.strictObject({ kind: v.literal('finalAgeBefore'), format: FORMAT, ms: pos }),
  v.strictObject({ kind: v.literal('wins'), count: pos }),
  v.strictObject({ kind: v.literal('beatGeneral'), general: GENERAL }),
  v.strictObject({ kind: v.literal('conquestStars'), stars: pos }),
  v.strictObject({ kind: v.literal('feat'), feat: id }),
]);

const FeatPredicateSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('crossAgeKill'), killerAge: AGE, victimAge: AGE }),
  v.strictObject({ kind: v.literal('castKills'), power: id, victimAges: v.array(AGE), min: pos }),
  v.strictObject({ kind: v.literal('winMaxAge'), formats: v.array(FORMAT), maxAge: AGE }),
  v.strictObject({ kind: v.literal('winNoTurret'), formats: v.array(FORMAT) }),
  v.strictObject({ kind: v.literal('winFinalBellMargin'), maxMarginBp: bp }),
  v.strictObject({ kind: v.literal('lastStandKills'), min: pos }),
  v.strictObject({ kind: v.literal('reachAgeBefore'), age: AGE, beforeMs: pos, formats: v.array(FORMAT) }),
  v.strictObject({ kind: v.literal('winAfterAgesBehind'), ages: pos }),
  v.strictObject({ kind: v.literal('winCommonsOnly'), formats: v.array(FORMAT) }),
  v.strictObject({ kind: v.literal('winAfterBaseBelow'), belowBp: bp }),
  v.strictObject({ kind: v.literal('finalBaseBlow'), unitAge: AGE, baseAge: AGE }),
  v.strictObject({ kind: v.literal('agesAlive'), ages: pos }),
]);

const FeatsSchema = v.strictObject({
  order: v.array(id),
  list: v.record(
    id,
    v.strictObject({ id, predicate: FeatPredicateSchema, dust: pos, title: v.nullable(id), obscure: v.boolean(), nameKey: key, riddleKey: key, hintKey: key }),
  ),
});

const COLLECTION = v.picklist(['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration']);
const CosmeticSourceSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('start') }),
  v.strictObject({ kind: v.literal('capsule') }),
  v.strictObject({ kind: v.literal('crate') }),
  v.strictObject({ kind: v.literal('road'), trophies: pos }),
  v.strictObject({ kind: v.literal('feat'), feat: id }),
  v.strictObject({ kind: v.literal('arena'), arena: pos }),
  v.strictObject({ kind: v.literal('codexLevel'), level: pos }),
  v.strictObject({ kind: v.literal('warPath') }),
]);
const CosmeticItemSchema = v.strictObject({
  id,
  collection: COLLECTION,
  rarity: RARITY,
  source: CosmeticSourceSchema,
  art: v.pipe(v.string(), v.regex(/^cosmetic\.[a-zA-Z]+\.[a-z0-9_]+$/, 'art ids look like "cosmetic.nationalFlag.dk"')),
  nameKey: key,
  textKey: v.optional(key),
  theme: v.optional(v.union([AGE, v.literal('general')])),
  age: v.optional(AGE),
  kind: v.optional(v.picklist(['statue', 'banner', 'brazier', 'trophy', 'plant'])),
  country: v.optional(v.pipe(v.string(), v.regex(/^[a-z]{2}(-[a-z]{3})?$/, 'ISO 3166 codes'))),
});
const cosmeticKey = v.pipe(v.string(), v.regex(/^[a-zA-Z]+\.[a-z0-9_]+$/, 'cosmetic keys look like "baseFlag.ember"'));
const CollectionsSchema = v.strictObject({
  items: v.array(CosmeticItemSchema),
  drops: v.strictObject({
    capsuleChanceBp: perTier(bp),
    capsuleRarityBp: perRarity(bp),
    crateRarityBp: perRarity(bp),
    duplicateDust: perRarity(nonNeg),
    craftDust: perRarity(pos),
  }),
  wheel: v.strictObject({ emotes: pos, quotes: pos }),
  quoteCooldownMs: nonNeg,
  decorationAnchors: pos,
  defaults: v.strictObject({
    emotes: v.array(v.union([EMOTE, cosmeticKey])),
    quotes: v.array(cosmeticKey),
    baseFlag: v.nullable(cosmeticKey),
    nationalFlag: v.nullable(cosmeticKey),
    decorations: v.array(v.nullable(cosmeticKey)),
  }),
});

const CosmeticsSchema = v.strictObject({
  banners: v.array(v.strictObject({ id, arena: pos, nameKey: key })),
  frames: v.array(v.strictObject({ id, codexLevel: pos, nameKey: key })),
  titles: v.array(v.strictObject({ id, unlock: TitleUnlockSchema, nameKey: key })),
  emotes: v.array(v.strictObject({ id: EMOTE, botAllowed: v.boolean(), nameKey: key })),
  defaults: v.strictObject({ banner: id, frame: id, title: id }),
  collections: CollectionsSchema,
});

const IntAttackSchema = v.strictObject({
  damage: nonNeg, vsBaseDamage: v.nullable(nonNeg), intervalTicks: pos, windupTicks: nonNeg, range: nonNeg, minRange: nonNeg,
  projectileSpeed: v.nullable(pos), instant: v.boolean(),
});

const IntegerTablesSchema = v.strictObject({
  units: v.record(
    id,
    v.strictObject({
      hp: pos, speed: pos, width: pos, trainTicks: pos, pop: pos, cost: pos,
      bounty: v.strictObject({ gold: nonNeg, xp: nonNeg, lossXp: nonNeg, powerGold: nonNeg }),
      attacks: v.array(IntAttackSchema),
    }),
  ),
  turrets: v.record(id, v.strictObject({ cost: pos, sellRefund: nonNeg, attack: IntAttackSchema })),
  baseHp: perAge(pos),
  xpToNext: perAge(v.nullable(pos)),
});

const BattleSchema = v.strictObject({
  laneLength: pos, baseDepth: pos, cameraMargin: nonNeg, midLane: pos,
  windupPct: v.strictObject({ melee: pct, ranged: pct, turret: pct }),
  trainMsByGroup: perGroup(pos),
  braceKnockbackResistBp: bp, airKnockbackResistBp: bp, markDamageBp: bp, healPulseMs: pos, moderniseCreditBp: bp,
  finalAgeXpCap: pos, siegeDecayStepMs: pos, stampedeFallbackP: pos,
  projectileSpeed: v.strictObject({
    rock: pos, arrow: pos, musket: pos, bullet: pos, shell: pos, rocket: pos, arc: pos, plasma: pos,
  }),
});

/** The whole compiled bundle. */
export const ContentSchema = v.strictObject({
  hash: v.pipe(v.string(), v.regex(/^[0-9a-f]{8}$/)),
  ages: perAge(AgeSchema),
  formats: v.record(FORMAT_KEY, FormatSchema),
  economy: EconomySchema,
  units: v.record(id, UnitSchema),
  turrets: v.record(id, TurretSchema),
  powers: v.record(id, PowerSchema),
  skins: v.record(id, SkinSchema),
  research: ResearchSchema,
  rarities: RaritiesSchema,
  capsules: CapsulesSchema,
  arenas: ArenasSchema,
  trophyRoad: TrophyRoadSchema,
  generals: GeneralsSchema,
  names: NamesSchema,
  quests: QuestsSchema,
  dailyModifiers: DailyModifiersSchema,
  cosmetics: CosmeticsSchema,
  feats: FeatsSchema,
  counters: v.record(id, v.record(id, v.pipe(v.number(), v.minValue(0), v.maxValue(1)))),
  ticks: TicksSchema,
  int: IntegerTablesSchema,
  order: v.strictObject({
    ages: v.array(AGE), formats: v.array(FORMAT), units: v.array(id), hiddenUnits: v.array(id), turrets: v.array(id),
    powers: v.array(id), skins: v.array(id),
  }),
  battle: BattleSchema,
});

// ---------------------------------------------------------------------------------------------
// Semantic checks
// ---------------------------------------------------------------------------------------------

/** One validation finding. `path` is a dot path into the content. */
export interface ContentIssue {
  path: string;
  message: string;
}

/** Collects issues; `check(cond, path, message)` records one when `cond` is false. */
class Issues {
  readonly list: ContentIssue[] = [];
  check(cond: boolean, path: string, message: string): void {
    if (!cond) this.list.push({ path, message });
  }
}

function recordIds(issues: Issues, name: string, rec: Record<string, { id: string }>): void {
  for (const k of Object.keys(rec)) issues.check(rec[k]?.id === k, `${name}.${k}`, `key and id differ ("${rec[k]?.id}")`);
}

function unique(issues: Issues, path: string, ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const x of ids) {
    issues.check(!seen.has(x), path, `duplicate id "${x}"`);
    seen.add(x);
  }
}

function checkAttack(issues: Issues, path: string, a: AttackDef, c: Content): void {
  // A2.6: melee attacks never hit air.
  if (a.projectile === undefined) issues.check(!a.hitsAir, path, 'melee attacks never hit air (A2.6)');
  issues.check(a.hitsGround || a.hitsAir || a.damage === 0, path, 'an attack that deals damage must hit ground or air');
  if (a.minRange !== undefined) issues.check(a.minRange < a.range, path, 'minRange must be below range');
  for (const m of a.mods ?? []) issues.check(m.bp > 0, `${path}.mods`, 'mods must be positive');
  if (a.pierce) issues.check(a.pierce.count >= 2, `${path}.pierce`, 'pierce counts include the primary (≥ 2)');
  if (a.cleave) issues.check(a.cleave.count >= 2, `${path}.cleave`, 'cleave counts include the primary (≥ 2)');
  if (a.chain) issues.check(a.chain.count >= 2, `${path}.chain`, 'chain counts include the primary (≥ 2)');
  void c;
}

function checkCards(issues: Issues, c: Content): void {
  recordIds(issues, 'units', c.units);
  recordIds(issues, 'turrets', c.turrets);
  recordIds(issues, 'powers', c.powers);
  recordIds(issues, 'skins', c.skins);
  unique(issues, 'cards', [...Object.keys(c.units), ...Object.keys(c.turrets), ...Object.keys(c.powers)]);

  for (const u of Object.values(c.units)) {
    const p = `units.${u.id}`;
    issues.check(u.age in c.ages, p, `unknown age "${u.age}"`);
    issues.check(u.pop === c.economy.popByGroup[u.group], p, 'pop must follow the role group (A2.7)');
    issues.check(u.trainMs === c.battle.trainMsByGroup[u.group], p, 'train time must follow the role group (A2.7)');
    issues.check(u.tags.includes('air') !== u.tags.includes('ground'), p, 'a unit is exactly one of ground or air');
    issues.check(u.visualId === `unit.${u.id}`, p, 'visualId must be unit.<slug> (A14.1)');
    issues.check(u.nameKey === `card.${u.id}.name` && u.descKey === `card.${u.id}.desc`, p, 'string keys must be card.<slug>.name/desc');
    issues.check(new Set(u.tags).size === u.tags.length, p, 'duplicate tag');
    issues.check((u.rarity === 'legendary') === u.tags.includes('legendary'), p, 'the legendary tag marks exactly the Legendary cards');
    u.attacks.forEach((a, i) => checkAttack(issues, `${p}.attacks.${i}`, a, c));
    for (const ab of u.abilities) {
      if (ab.kind === 'riders') {
        checkAttack(issues, `${p}.riders`, ab.attack, c);
        issues.check(c.units[ab.onDeathSpawn] !== undefined, p, `riders spawn unknown unit "${ab.onDeathSpawn}"`);
      }
    }
    for (const x of [...u.strongVs, ...u.weakVs]) issues.check(c.units[x] !== undefined, p, `strongVs/weakVs names unknown unit "${x}"`);
  }
  for (const t of Object.values(c.turrets)) {
    const p = `turrets.${t.id}`;
    issues.check(t.age in c.ages, p, `unknown age "${t.age}"`);
    issues.check(t.attack.range <= c.economy.turretRangeCap, p, 'turret range is capped (A2.8)');
    issues.check(t.visualId === `turret.${t.id}`, p, 'visualId must be turret.<slug> (A14.1)');
    issues.check(t.nameKey === `card.${t.id}.name` && t.descKey === `card.${t.id}.desc`, p, 'string keys must be card.<slug>.name/desc');
    checkAttack(issues, `${p}.attack`, t.attack, c);
  }
  for (const pw of Object.values(c.powers)) {
    const p = `powers.${pw.id}`;
    issues.check(pw.age in c.ages, p, `unknown age "${pw.age}"`);
    issues.check(pw.visualId === `power.${pw.id}`, p, 'visualId must be power.<slug> (A14.1)');
    if (pw.effect.kind === 'paradrop') {
      const drop = c.units[pw.effect.card];
      issues.check(drop !== undefined && drop.age === pw.age, p, 'Paratroopers drop a unit of the power\'s age');
    }
  }
  for (const s of Object.values(c.skins)) {
    const p = `skins.${s.id}`;
    const base = /^base\.(\w+)$/.exec(s.target);
    if (base) {
      issues.check(base[1] !== undefined && base[1] in c.ages, p, `unknown base target "${s.target}"`);
      issues.check(s.visualId === skinnedVisualId(s.target, s.id), p, 'skin visualId must be <target visual>@<skin> (A14.1)');
    } else {
      issues.check(c.units[s.target] !== undefined, p, `unknown skin target "${s.target}"`);
      issues.check(s.visualId === skinnedVisualId(`unit.${s.target}`, s.id), p, 'skin visualId must be <target visual>@<skin> (A14.1)');
    }
    issues.check(s.craftable === s.inCratePool, p, 'crate skins are craftable; others are not (A5.8)');
  }
}

/** A5.1 collection shape and the per-age slots (A5.2-A5.7). */
function checkCollection(issues: Issues, c: Content): void {
  const units = c.order.units.map((x) => c.units[x] as UnitDef);
  const turrets = c.order.turrets.map((x) => c.turrets[x]);
  // A17.13: 8 ages of 7 units, 4 turrets and 2 powers each.
  issues.check(units.length === 56, 'order.units', `56 collectable units (A17.13), found ${units.length}`);
  issues.check(turrets.length === 32, 'order.turrets', `32 turrets (A17.13), found ${turrets.length}`);
  issues.check(c.order.powers.length === 16, 'order.powers', `16 Age Powers (A17.13), found ${c.order.powers.length}`);
  issues.check(c.order.skins.length === 12, 'order.skins', `12 skins (A5.8), found ${c.order.skins.length}`);
  const count = (r: Rarity): number => [...units, ...turrets].filter((x) => x?.rarity === r).length;
  const want: Record<Rarity, number> = { common: 40, rare: 24, epic: 16, legendary: 8 };
  for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
    issues.check(count(r) === want[r], 'collection', `${want[r]} ${r} cards (A17.13), found ${count(r)}`);
  }
  for (const age of AGE_ORDER) {
    const us = units.filter((u) => u.age === age);
    const groups = (g: RoleGroup): number => us.filter((u) => u.group === g).length;
    issues.check(us.length === 7, `ages.${age}`, '7 units per age (A5)');
    issues.check(us.filter((u) => u.rarity === 'common').length === 3, `ages.${age}`, '3 Common units per age (A3)');
    issues.check(groups('infantry') === 1 && groups('ranged') === 1 && groups('heavy') === 1, `ages.${age}`, 'one Infantry, Ranged and Heavy Common');
    issues.check(groups('antiArmor') === 1 && groups('support') === 1, `ages.${age}`, 'an Anti-armor Rare and a Support Rare (A3)');
    issues.check(groups('epic') === 1 && groups('legendary') === 1, `ages.${age}`, 'one Epic and one Legendary unit');
    const ts = turrets.filter((t) => t?.age === age);
    issues.check(ts.length === 4, `ages.${age}`, '4 turrets per age (A5)');
    issues.check(ts.filter((t) => t?.rarity === 'common').length === 2, `ages.${age}`, '2 Common turrets per age (A3)');
    const ps = Object.values(c.powers).filter((p) => p.age === age);
    issues.check(ps.filter((p) => p.slot === 'default').length === 1, `ages.${age}`, 'one default Age Power (A2.9)');
    issues.check(ps.filter((p) => p.slot === 'alternate').length === 1, `ages.${age}`, 'one alternate Age Power (A2.9)');
  }
  const skins = Object.values(c.skins);
  for (const r of ['rare', 'epic', 'legendary'] as const) {
    issues.check(skins.filter((s) => s.rarity === r).length === 4, 'skins', `4 ${r} skins (A5.8)`);
  }
  issues.check(skins.filter((s) => s.inCratePool).length === 11, 'skins', 'the crate pool holds 11 skins (A5.8)');
}

/** War Council (A18.5): pairs of exclusive picks, a rank I for every line, prices and times for every rank used. */
function checkResearch(issues: Issues, c: Content): void {
  const r = c.research;
  const seen = new Set<string>();
  for (const p of r.picks) {
    const path = `research.${p.id}`;
    issues.check(!seen.has(p.id), path, 'research ids are unique');
    seen.add(p.id);
    issues.check((p.track === 'troops') === (p.group !== null), path, 'only Troops picks name a class line');
    issues.check((r.cost[p.track][p.rank - 1] ?? 0) > 0, path, 'the rank has a price');
    issues.check((r.timeMs[p.rank - 1] ?? 0) > 0, path, 'the rank has a research time');
    const pair = r.picks.filter((q) => q.track === p.track && q.group === p.group && q.rank === p.rank);
    issues.check(pair.length === 2 && pair[0]?.pick !== pair[1]?.pick, path, 'every rank is a pair of picks A and B (A18.5)');
    if (p.rank > 1) {
      issues.check(
        r.picks.some((q) => q.track === p.track && q.group === p.group && q.rank === p.rank - 1),
        path,
        'the rank below exists',
      );
    }
    const a = r.picks.find((q) => q !== p && q.track === p.track && q.group === p.group && q.rank === p.rank);
    if (a) issues.check(JSON.stringify(a.effects) !== JSON.stringify(p.effects), path, 'the two picks of a pair differ (A18.2 rule 3)');
  }
  // A18.5.4: every rank-I price is 150 g in every track
  for (const t of ['troops', 'defences', 'economy', 'command'] as const) issues.check(r.cost[t][0] === 150, `research.cost.${t}`, 'rank I costs 150 (A18.5.4)');
  issues.check(r.picks.length === 0 || r.unlockAt['1']?.[0] === 0, 'research.unlockAt', 'rank I opens from the start');
}

function checkAgesAndFormats(issues: Issues, c: Content): void {
  AGE_ORDER.forEach((age, i) => {
    const a = c.ages[age];
    issues.check(a.index === i, `ages.${age}`, 'index follows age order');
    issues.check(a.baseHp === a.pBp, `ages.${age}`, 'base max HP = 10,000 × P (A2.2)');
    issues.check((a.xpToNext === null) === (i === AGE_ORDER.length - 1), `ages.${age}`, 'only the last age has no threshold');
  });
  for (const [key, f] of Object.entries(c.formats)) {
    const idx = f.ages.map((a) => AGE_ORDER.indexOf(a));
    issues.check(f.id === key, `formats.${key}`, 'a format is stored under its id');
    // A17.15 rule 4 / A18.3.4: ages in increasing order; every format but the tutorial is a window of
    // consecutive ages (it may start in a later age).
    issues.check(idx.length > 0 && idx.every((x, i) => x >= 0 && (i === 0 || x > (idx[i - 1] as number))), `formats.${key}`, 'a format lists ages in increasing order');
    if (f.id === 'tutorial') issues.check(idx[0] === 0, `formats.${key}`, 'the tutorial starts in the Stone Age');
    else issues.check(idx.every((x, i) => x === (idx[0] as number) + i), `formats.${key}`, 'a format is a window of consecutive ages (A18.3.4)');
    if (f.xpToNextOverride) {
      issues.check(f.xpToNextOverride.length === f.ages.length - 1, `formats.${key}`, 'one override per evolve');
    }
    if (f.kind === 'short') issues.check(f.ages.length === 3, `formats.${key}`, 'Short War is 3 ages (A18.3.4)');
    if (f.kind === 'standard') issues.check(f.ages.length === 5, `formats.${key}`, 'Standard War is 5 ages (A18.3.4)');
    if (f.kind === 'full') issues.check(f.ages.length === 7, `formats.${key}`, 'Full War is 7 ages (A18.3.4)');
    const t = [f.overdriveMs, f.siegeMs, f.finalBellMs].filter((x): x is number => x !== null);
    issues.check(t.every((x, i) => i === 0 || x > (t[i - 1] as number)), `formats.${key}`, 'phases are in order');
  }
  for (const named of ['tutorial', 'short', 'standard', 'full']) issues.check(c.formats[named] !== undefined, `formats.${named}`, 'the named formats exist');
  checkResearch(issues, c);
  issues.check(c.economy.mountCosts.length === 4 && c.economy.mountCosts[0] === 0, 'economy.mountCosts', '4 mounts, the first free (A2.3)');
  // A17.15: the lane lives in core (`LANE_MLU`); the content's lane numbers must follow it.
  const lane = c.battle.laneLength;
  issues.check(lane * MILLI === LANE_MLU, 'battle.laneLength', `lane length matches core LANE_MLU (${LANE_MLU / MILLI} lu)`);
  issues.check(c.battle.midLane * 2 === lane, 'battle.midLane', 'mid-lane is L / 2 (A17.3)');
  issues.check(c.economy.powerZoneClamp[1] === lane - c.economy.powerZoneClamp[0], 'economy.powerZoneClamp', 'power zone clamp is [150, L − 150] (A17.3)');
}

function loadoutCards(l: { units: (CardId | null)[]; turrets: (CardId | null)[]; power: CardId }): CardId[] {
  return [...l.units, ...l.turrets, l.power].filter((x): x is CardId => x !== null);
}

function checkGenerals(issues: Issues, c: Content): void {
  const g = c.generals;
  recordIds(issues, 'generals.list', g.list);
  unique(issues, 'generals.order', g.order);
  issues.check(g.order.length === Object.keys(g.list).length, 'generals.order', 'order lists every General');
  for (const gen of Object.values(g.list)) {
    const p = `generals.${gen.id}`;
    if (gen.tiers) issues.check(gen.tiers[0] <= gen.tiers[1] && gen.tiers[1] <= c.arenas.ladder.maxTier, p, 'tier range');
    issues.check(gen.mirror === (gen.warPlan === null), p, 'only the mirror has no War Plan');
    for (const x of gen.signatureCards) issues.check(c.units[x] !== undefined || c.turrets[x] !== undefined, p, `unknown signature card "${x}"`);
    if (!gen.warPlan) continue;
    for (const age of Object.keys(gen.warPlan) as AgeId[]) {
      const l = gen.warPlan[age];
      if (!l) continue;
      const lp = `${p}.warPlan.${age}`;
      unique(issues, lp, loadoutCards(l));
      for (const u of l.units) {
        if (u === null) continue;
        const def = c.units[u];
        issues.check(def !== undefined && def.age === age, lp, `"${u}" is not a unit of this age (A3)`);
        issues.check(!def?.hidden || gen.scripted, lp, `"${u}" is hidden; only scripted Generals use it`);
        // A6.8: only The Warden fields Legendaries of its own.
        issues.check(def?.rarity !== 'legendary' || gen.legendaryLevel !== null, lp, `"${u}": only The Warden brings Legendaries (A6.8)`);
      }
      for (const t of l.turrets) {
        if (t === null) continue;
        issues.check(c.turrets[t]?.age === age, lp, `"${t}" is not a turret of this age (A3)`);
      }
      issues.check(c.powers[l.power]?.age === age, lp, `"${l.power}" is not a power of this age (A3)`);
      if (!gen.scripted) {
        // A3 minimum to play: 3 units and 1 turret per age.
        issues.check(l.units.filter((x) => x !== null).length >= 3, lp, 'at least 3 units (A3)');
        issues.check(l.turrets.filter((x) => x !== null).length >= 1, lp, 'at least 1 turret (A3)');
      }
    }
    if (!gen.scripted) {
      for (const age of AGE_ORDER) issues.check(gen.warPlan[age] !== undefined, p, `War Plan has no ${age} loadout`);
    }
  }
  const board = g.conquest.board;
  issues.check(board.length === 9, 'generals.conquest.board', '9 Generals on the Conquest board (A6.10)');
  unique(issues, 'generals.conquest.board', board.map((b) => b.general));
  for (const b of board) {
    const gen = g.list[b.general];
    issues.check(gen !== undefined && !gen.scripted && !gen.mirror, 'generals.conquest.board', `"${b.general}" cannot be on the board`);
    // A6.10's fixed Conquest tier is one of the General's own tiers (A7.4).
    if (gen?.tiers) {
      issues.check(
        b.tier >= gen.tiers[0] && b.tier <= gen.tiers[1],
        'generals.conquest.board',
        `"${b.general}" plays Conquest at tier ${b.tier}, outside its tiers ${gen.tiers[0]}-${gen.tiers[1]}`,
      );
    }
  }
  for (const m of g.conquest.milestones) {
    if (m.title) issues.check(c.cosmetics.titles.some((t) => t.id === m.title), 'generals.conquest.milestones', `unknown title "${m.title}"`);
  }
  issues.check(g.conquest.milestones.at(-1)?.stars === board.length * 3, 'generals.conquest.milestones', 'the last milestone needs every star');
  for (const x of g.commanderPersonalities) issues.check(g.list[x] !== undefined, 'generals.commanderPersonalities', `unknown General "${x}"`);
  // Owner feedback 2026-09-28: five difficulties, each an AI tier, rising, within the ladder's tiers.
  const d = g.difficulty;
  unique(issues, 'generals.difficulty.order', d.order);
  issues.check(d.order.length === Object.keys(d.tiers).length, 'generals.difficulty.order', 'order lists every difficulty');
  issues.check(d.order.includes(d.default), 'generals.difficulty.default', 'default is a listed difficulty');
  d.order.forEach((k, i) => {
    const tier = d.tiers[k];
    issues.check(tier <= c.arenas.ladder.maxTier, `generals.difficulty.tiers.${k}`, 'tier within the ladder tiers');
    if (i > 0) issues.check(tier > d.tiers[d.order[i - 1]!], `generals.difficulty.tiers.${k}`, 'tiers rise with difficulty');
  });
}

function checkMeta(issues: Issues, c: Content): void {
  // Rarities (A6.6)
  for (const r of c.rarities.order) {
    issues.check(c.rarities.cards[r].upgradeCopies.length === c.economy.maxLevel - 1, `rarities.${r}`, 'one copy cost per level-up');
  }
  issues.check(c.rarities.upgradeAmber.length === c.economy.maxLevel - 1, 'rarities.upgradeAmber', 'one Amber cost per level-up');
  issues.check(
    c.rarities.skinOrder.reduce((s, r) => s + c.rarities.skins[r].crateOddsBp, 0) === BP,
    'rarities.skins',
    'Wardrobe odds sum to 100%',
  );
  // Capsules (A6.4)
  const cap = c.capsules;
  const sum = (r: Record<string, number>): number => Object.values(r).reduce((a, b) => a + b, 0);
  issues.check(sum(cap.bag) === 100, 'capsules.bag', 'the bag holds 100 capsules');
  issues.check(sum(cap.dailyOddsBp) === BP, 'capsules.dailyOddsBp', 'Daily odds sum to 100%');
  issues.check(sum(cap.stackRollBp) === BP, 'capsules.stackRollBp', 'stack rarity odds sum to 100%');
  cap.tierOrder.forEach((t, i) => {
    const tier = cap.tiers[t];
    issues.check(tier.index === i, `capsules.tiers.${t}`, 'index follows tier order');
    issues.check(tier.guaranteed.length <= tier.stacks, `capsules.tiers.${t}`, 'more guarantees than stacks');
  });
  cap.script.forEach((s, i) => {
    const p = `capsules.script.${i}`;
    issues.check(s.capsule === i + 1, p, 'script capsules are numbered 1..n');
    issues.check(s.cards.length + (s.randomUnownedEpic ? 1 : 0) <= cap.tiers[s.tier].stacks, p, 'more scripted cards than stacks');
    for (const x of s.cards) {
      const card = c.units[x] ?? c.turrets[x];
      issues.check(card !== undefined, p, `unknown card "${x}"`);
      // A6.5 reveals scripted cards as NEW, so none may be in the starter kit (every Common, A3).
      issues.check(card === undefined || card.rarity !== 'common', p, `"${x}" is a starter Common, so it cannot be NEW`);
    }
  });
  // A3: each age's Anti-armor Rare arrives by script or by an Age Unlock Capsule at an arena gate.
  const unlockAges = new Set(c.arenas.list.flatMap((a) => a.gateRewards.flatMap((r) => (r.kind === 'ageUnlock' ? r.ages : []))));
  const scripted = new Set(cap.script.flatMap((s) => s.cards));
  for (const age of AGE_ORDER) {
    const aa = c.order.units.map((x) => c.units[x]).find((u) => u?.age === age && u.group === 'antiArmor');
    if (!aa) continue;
    issues.check(scripted.has(aa.id) || unlockAges.has(age), `capsules.script`, `"${aa.id}" (the ${age} Anti-armor Rare) never arrives (A3)`);
  }
  // Arenas (A6.3)
  const list = c.arenas.list;
  list.forEach((a, i) => {
    const p = `arenas.${a.id}`;
    issues.check(a.index === i + 1, p, 'arenas are numbered 1..n');
    issues.check(i === 0 ? a.trophies === 0 : a.trophies > (list[i - 1]?.trophies ?? 0), p, 'gates rise with trophies');
    issues.check(a.botTiers[0] <= a.botTiers[1] && a.botTiers[1] <= c.arenas.ladder.maxTier, p, 'bot tier range');
    issues.check(a.groundVisualId === `ground.${a.id}`, p, 'ground visual is ground.<arena> (A14.1)');
    for (const f of a.ladderFormats) issues.check(f !== 'tutorial', p, 'the tutorial is not a ladder format');
    for (const r of a.gateRewards) {
      if (r.kind === 'banner') issues.check(c.cosmetics.banners.some((b) => b.id === r.banner), p, `unknown banner "${r.banner}"`);
      if (r.kind === 'skin') issues.check(c.skins[r.skin] !== undefined, p, `unknown skin "${r.skin}"`);
    }
  });
  const lr = c.arenas.ladder.levelRollBp;
  issues.check(lr.minus + lr.zero + lr.plus === BP, 'arenas.ladder.levelRollBp', 'level roll odds sum to 100%');
  // Trophy Road (A6.3)
  const nodes = c.trophyRoad.nodes;
  issues.check(nodes.length === 60, 'trophyRoad', `60 nodes (A6.3), found ${nodes.length}`);
  nodes.forEach((n, i) => {
    const p = `trophyRoad.${n.trophies}`;
    issues.check(n.index === i, p, 'index follows road order');
    issues.check(n.trophies === (i < 40 ? 50 * (i + 1) : 2000 + 100 * (i - 39)), p, 'every 50 to 2,000, then every 100 to 4,000');
    issues.check(n.rewards.length > 0, p, 'a node gives something');
    for (const r of n.rewards) {
      if (r.kind === 'amber') issues.check(r.amount === roadAmber(c.trophyRoad, n.trophies), p, 'Amber = 100 + 20 × trophies / 100');
      if (r.kind === 'power') issues.check(c.powers[r.card]?.slot === 'alternate', p, `"${r.card}" is not an alternate power`);
      if (r.kind === 'gate') issues.check(list[r.arena - 1]?.trophies === n.trophies, p, `gate ${r.arena} sits at its arena's trophies`);
    }
  });
  for (const a of list.slice(1)) {
    const gates = nodes.filter((n) => n.rewards.some((r) => r.kind === 'gate' && r.arena === a.index));
    issues.check(gates.length === 1, `arenas.${a.id}`, 'each arena after the first has one gate node');
  }
  const alternates = Object.values(c.powers).filter((p) => p.slot === 'alternate').map((p) => p.id);
  for (const alt of alternates) {
    issues.check(nodes.some((n) => n.rewards.some((r) => r.kind === 'power' && r.card === alt)), 'trophyRoad', `no node gives "${alt}"`);
  }
  // Quests (A6.7)
  unique(issues, 'quests', [...c.quests.daily.map((q) => q.id), c.quests.weekly.id]);
  for (const q of c.quests.daily) {
    if (q.metric === 'fastFinalAge') issues.check(q.beforeMsByFormat !== undefined, `quests.${q.id}`, 'needs beforeMsByFormat');
    if (q.metric === 'fastBaseKill') issues.check(q.beforeMs !== undefined, `quests.${q.id}`, 'needs beforeMs');
    if (q.metric === 'powerMultiHit') issues.check(q.minHits !== undefined, `quests.${q.id}`, 'needs minHits');
  }
  // Daily modifiers (A9.1)
  const mods = c.dailyModifiers;
  recordIds(issues, 'dailyModifiers.list', mods.list);
  issues.check(mods.order.length === 6 && Object.keys(mods.list).length === 6, 'dailyModifiers', '6 daily modifiers (A9.1)');
  mods.order.forEach((m, i) => issues.check(mods.list[m as keyof typeof mods.list]?.index === i + 1, `dailyModifiers.${m}`, 'numbered 1..6'));
  // Cosmetics (A5.8)
  const cos = c.cosmetics;
  unique(issues, 'cosmetics.banners', cos.banners.map((b) => b.id));
  unique(issues, 'cosmetics.frames', cos.frames.map((f) => f.id));
  unique(issues, 'cosmetics.titles', cos.titles.map((t) => t.id));
  unique(issues, 'cosmetics.emotes', cos.emotes.map((e) => e.id));
  issues.check(cos.banners.length === 8 && cos.frames.length === 8, 'cosmetics', '8 banners and 8 frames (A5.8)');
  issues.check(cos.titles.length === 17 && cos.emotes.length === 6, 'cosmetics', '13 titles plus 4 feat titles and 6 emotes (A5.8, A15.10)');
  issues.check(c.feats.order.length === 12, 'feats', '12 hidden feats (A15.10)');
  for (const t of cos.titles) {
    if (t.unlock.kind === 'feat') issues.check(c.feats.list[t.unlock.feat] !== undefined, `cosmetics.titles.${t.id}`, `unknown feat "${t.unlock.feat}"`);
  }
  for (const id of c.feats.order) {
    const title = c.feats.list[id]?.title;
    if (title) issues.check(cos.titles.some((x) => x.id === title), `feats.${id}`, `unknown title "${title}"`);
  }
  for (const b of cos.banners) issues.check(list[b.arena - 1] !== undefined, `cosmetics.banners.${b.id}`, 'unknown arena');
  for (const t of cos.titles) {
    const u = t.unlock;
    const p = `cosmetics.titles.${t.id}`;
    if (u.kind === 'ownCard') issues.check(c.units[u.card] !== undefined, p, `unknown card "${u.card}"`);
    if (u.kind === 'arena') issues.check(list[u.arena - 1] !== undefined, p, `unknown arena ${u.arena}`);
    if (u.kind === 'beatGeneral') issues.check(c.generals.list[u.general] !== undefined, p, `unknown General "${u.general}"`);
  }
  issues.check(cos.banners.some((b) => b.id === cos.defaults.banner), 'cosmetics.defaults', 'default banner exists');
  issues.check(cos.titles.some((t) => t.id === cos.defaults.title), 'cosmetics.defaults', 'default title exists');
  issues.check(
    cos.emotes.filter((e) => e.botAllowed).map((e) => e.id).sort().join() === 'gg,salute,thumbsUp',
    'cosmetics.emotes',
    'bots use only GG, Salute and Thumbs up (A7.2)',
  );
  checkCollections(issues, c);
}

/** The A18.9.4 collections: unique ids, sources that exist, odds that add up and pools that are not empty. */
function checkCollections(issues: Issues, c: Content): void {
  const col = c.cosmetics.collections;
  const items = col.items;
  unique(issues, 'cosmetics.collections.items', items.map((x) => `${x.collection}.${x.id}`));
  const keys = new Set(items.map((x) => `${x.collection}.${x.id}`));
  const roadTrophies = new Set(c.trophyRoad.nodes.map((n) => n.trophies));
  for (const x of items) {
    const p = `cosmetics.collections.${x.collection}.${x.id}`;
    issues.check(x.art === `cosmetic.${x.collection}.${x.id}`, p, 'art id is cosmetic.<collection>.<id> (A14.4)');
    issues.check(x.nameKey === `cosmetic.${x.collection}.${x.id}.name`, p, 'name key is cosmetic.<collection>.<id>.name');
    issues.check((x.collection === 'quote') === (x.textKey === `cosmetic.quote.${x.id}.text`), p, 'quotes (and only quotes) have a text key');
    issues.check((x.collection === 'emote') === (x.theme !== undefined), p, 'emotes (and only emotes) have a theme');
    issues.check((x.collection === 'baseSkin') === (x.age !== undefined), p, 'base skins (and only base skins) have an age');
    issues.check((x.collection === 'decoration') === (x.kind !== undefined), p, 'decorations (and only decorations) have a kind');
    issues.check((x.collection === 'nationalFlag') === (x.country !== undefined), p, 'national flags (and only national flags) have a country');
    const s = x.source;
    if (s.kind === 'road') issues.check(roadTrophies.has(s.trophies), p, `no Trophy Road node at ${s.trophies}`);
    if (s.kind === 'feat') issues.check(c.feats.list[s.feat] !== undefined, p, `unknown feat "${s.feat}"`);
    if (s.kind === 'arena') issues.check(c.arenas.list[s.arena - 1] !== undefined, p, `unknown arena ${s.arena}`);
  }
  const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
  issues.check(sum(col.drops.capsuleRarityBp) === 10000, 'cosmetics.collections.drops', 'capsule rarity odds sum to 100%');
  issues.check(sum(col.drops.crateRarityBp) === 10000, 'cosmetics.collections.drops', 'crate rarity odds sum to 100%');
  for (const [pool, odds] of [
    ['capsule', col.drops.capsuleRarityBp],
    ['crate', col.drops.crateRarityBp],
  ] as const) {
    for (const [rarity, bpv] of Object.entries(odds)) {
      if (bpv > 0) {
        issues.check(
          items.some((x) => x.source.kind === pool && x.rarity === rarity),
          'cosmetics.collections.drops',
          `the ${pool} pool has ${rarity} odds but no ${rarity} item`,
        );
      }
    }
  }
  const d = col.defaults;
  const starter = (k: string | null) => k === null || items.some((x) => `${x.collection}.${x.id}` === k && x.source.kind === 'start');
  const baseEmotes = new Set<string>(c.cosmetics.emotes.map((e) => e.id));
  issues.check(d.emotes.length <= col.wheel.emotes && d.quotes.length <= col.wheel.quotes, 'cosmetics.collections.defaults', 'the default wheel fits');
  issues.check(d.emotes.every((e) => baseEmotes.has(e) || (keys.has(e) && starter(e))), 'cosmetics.collections.defaults', 'default emotes are starters');
  issues.check(d.quotes.every((q) => q.startsWith('quote.') && starter(q)), 'cosmetics.collections.defaults', 'default quotes are starters');
  issues.check(starter(d.baseFlag) && (d.baseFlag === null || d.baseFlag.startsWith('baseFlag.')), 'cosmetics.collections.defaults', 'the default base flag is a starter');
  issues.check(d.nationalFlag === null, 'cosmetics.collections.defaults', 'no national flag by default (never inferred from location)');
  issues.check(d.decorations.length === col.decorationAnchors, 'cosmetics.collections.defaults', 'one default per decoration anchor');
  issues.check(d.decorations.every((k) => starter(k) && (k === null || k.startsWith('decoration.'))), 'cosmetics.collections.defaults', 'default decorations are starters');
}

function checkCounters(issues: Issues, c: Content): void {
  for (const a of c.order.units) {
    const row = c.counters[a];
    issues.check(row !== undefined, `counters.${a}`, 'missing counter row; run `npx tsx tools/counters.ts`');
    if (!row) continue;
    for (const b of c.order.units) {
      const m = row[b];
      issues.check(m !== undefined, `counters.${a}.${b}`, 'missing counter entry');
      if (m === undefined) continue;
      const back = c.counters[b]?.[a];
      if (back !== undefined) {
        issues.check(Math.round(m * BP) + Math.round(back * BP) === BP, `counters.${a}.${b}`, 'M[a][b] + M[b][a] = 1');
      }
    }
    issues.check(Math.round((row[a] ?? 0) * BP) === BP / 2, `counters.${a}.${a}`, 'a mirror duel is even');
  }
}

/** Every issue in a compiled content bundle: structure (Valibot) first, then semantics. */
export function validateContent(c: Content): ContentIssue[] {
  const parsed = v.safeParse(ContentSchema, c);
  if (!parsed.success) {
    return parsed.issues.map((i) => ({ path: v.getDotPath(i) ?? '(root)', message: i.message }));
  }
  const issues = new Issues();
  checkCards(issues, c);
  checkCollection(issues, c);
  checkAgesAndFormats(issues, c);
  checkGenerals(issues, c);
  checkMeta(issues, c);
  checkCounters(issues, c);
  return issues.list;
}

/**
 * Checks the raw tables where the compiler derives values: the raw `pop` and `trainMs` must already
 * match the role-group tables, so a typo in a raw row is reported instead of silently overridden.
 */
export function validateRaw(raw: RawContent): ContentIssue[] {
  const issues = new Issues();
  for (const t of raw.ages) {
    for (const u of t.units) {
      issues.check(u.pop === raw.economy.popByGroup[u.group], `raw.${u.id}.pop`, `pop ${u.pop} ≠ group value ${raw.economy.popByGroup[u.group]}`);
      issues.check(
        u.trainMs === raw.battle.trainMsByGroup[u.group],
        `raw.${u.id}.trainMs`,
        `trainMs ${u.trainMs} ≠ group value ${raw.battle.trainMsByGroup[u.group]}`,
      );
      issues.check(u.age === t.age, `raw.${u.id}.age`, `listed under ${t.age}`);
    }
    for (const x of t.turrets) issues.check(x.age === t.age, `raw.${x.id}.age`, `listed under ${t.age}`);
  }
  return issues.list;
}

/** Throws with every issue listed (for dev boot and tools). */
export function assertValidContent(c: Content): void {
  const issues = validateContent(c);
  if (issues.length > 0) {
    throw new Error(`Content has ${issues.length} issue(s):\n${issues.map((i) => `- ${i.path}: ${i.message}`).join('\n')}`);
  }
}
