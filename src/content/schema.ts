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
import type { AttackDef, FortKind, PowerDef, PowerEffect, PowerFamily, UnitDef } from '@/contracts/content';
import type { AgeId, CardId, Rarity, RoleGroup } from '@/contracts/ids';
import type { Loadout } from '@/contracts/sim';
import { BP, LANE_MLU, MILLI } from '@/core/fixed';
import { skinnedVisualId } from '@/core/ids';
import { AGE_ORDER } from './ages';
import type { RawContent } from './raw/types';
import { isReleased } from './release';
import { roadAmber } from './trophyRoad';
import type { AgeRosterShape, Content } from './types';

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
const FORMAT = v.picklist(['tutorial', 'short', 'standard', 'full', 'last']);
/** Any content format key (A18.3.4: named formats and windows such as `short.bronze`, `w2.medieval`). */
const FORMAT_KEY = v.pipe(v.string(), v.regex(/^[a-z][a-z0-9]*(\.[a-z]+)?$/, 'format keys look like "short" or "w2.bronze"'));
const FORMAT_KIND = v.picklist(['tutorial', 'short', 'standard', 'full', 'untimed', 'window']);
const TIER = v.picklist(['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon']);
const FOIL = v.picklist(['none', 'bronze', 'silver', 'holo']);
const TAG = v.picklist(['light', 'armored', 'bio', 'mech', 'ground', 'air', 'legendary', 'support', 'ranged', 'melee', 'structure']);
const ROLE = v.picklist([
  'infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'skirmisher', 'siege', 'artillery', 'airBomber', 'airGunship', 'antiMech', 'siegeHeavy', 'fort',
]);
const GROUP = v.picklist(['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary', 'fort']);
const DMG = v.picklist(['blunt', 'slash', 'pierce', 'bullet', 'laser', 'blast']);
const SIZE = v.picklist(['small', 'medium', 'large', 'huge']);
const STATUS = v.picklist(['stun', 'slow', 'snare', 'mark', 'shield', 'regen', 'damageBuff', 'speedBuff', 'attackSpeedBuff']);
const PRIORITY = v.picklist(['front', 'armored', 'backline', 'air', 'densest']);
const CAPSULE_KIND = v.picklist(['win', 'daily', 'road', 'meter', 'age', 'codex', 'conquest', 'ageUnlock', 'warPath']);
const EMOTE = v.picklist(['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg']);
const GENERAL = v.picklist(['grogg', 'pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest', 'warden', 'echo']);
const DIFFICULTY = v.picklist(['easy', 'normal', 'hard', 'expert', 'legendary']);

function byKeys<T extends v.GenericSchema>(keys: readonly string[], value: T) {
  return v.strictObject(Object.fromEntries(keys.map((k) => [k, value])) as Record<string, T>);
}
const perRarity = <T extends v.GenericSchema>(s: T) => byKeys(['common', 'rare', 'epic', 'legendary'], s);
const perTier = <T extends v.GenericSchema>(s: T) => byKeys(['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon'], s);
const perSize = <T extends v.GenericSchema>(s: T) => byKeys(['small', 'medium', 'large', 'huge'], s);
const perGroup = <T extends v.GenericSchema>(s: T) =>
  byKeys(['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary', 'fort'], s);
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
  v.strictObject({ kind: v.literal('aura'), radius: pos, status: StatusApplyS, foe: v.optional(v.boolean()) }),
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
  v.strictObject({ kind: v.literal('timeStop'), everyMs: pos, radius: pos, freezeMs: pos, legendaryFreezeMs: pos, frozen: v.optional(v.boolean()) }),
  // X0 M2 Frenzy and M3 Summoner
  v.strictObject({ kind: v.literal('frenzy'), belowHpBp: bp, damageBp: bp, attackSpeedBp: bp }),
  v.strictObject({ kind: v.literal('summon'), card: id, firstMs: pos, everyMs: pos, maxAlive: pos }),
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
  // A16.14: levies cost 0; fort twins have no train time and speed 0 (semantic checks keep every other card positive)
  cost: nonNeg,
  trainMs: nonNeg,
  pop: pos,
  hp: pos,
  speed: nonNeg,
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
  fort: v.optional(v.strictObject({ kind: v.picklist(['wall', 'tower', 'camp']) })),
  levy: v.optional(v.boolean()),
  aiValue: v.optional(nonNeg),
  // X0: M3 summons, M1 squads and the starter flag
  summon: v.optional(v.boolean()),
  squad: v.optional(v.strictObject({ count: v.picklist([2, 3]) })),
  starter: v.optional(v.boolean()),
  // The release gate (`release.ts`): false hides the card from players and bots until its art ships.
  released: v.optional(v.boolean()),
});

/** A Fort card (A16.14.8). */
export const FortSchema = v.strictObject({
  id,
  kind: v.literal('fort'),
  age: AGE,
  rarity: v.picklist(['common', 'rare', 'epic']),
  fortKind: v.picklist(['wall', 'tower', 'camp', 'trap']),
  source: v.picklist(['starter', 'unlock', 'warPath']),
  road: v.optional(pos),
  warPathLevel: v.optional(pos),
  warPathSide: v.optional(v.picklist([1, 2])),
  warPathStars: v.optional(pos),
  cost: pos,
  pop: pos,
  hp: nonNeg,
  size: v.nullable(v.picklist(['medium', 'large'])),
  pads: v.picklist(['home', 'any']),
  attack: v.optional(AttackSchema),
  camp: v.optional(v.strictObject({ spawn: id, everyMs: pos, firstMs: pos, maxAlive: pos })),
  trap: v.optional(
    v.strictObject({
      charges: pos, triggerLu: pos, betweenMs: pos, armMs: pos, lifeMs: pos, damage: pos, radius: nonNeg, maxTargets: pos,
      statuses: v.array(StatusApplyS),
    }),
  ),
  cover: v.optional(v.strictObject({ behindLu: pos, rangedTakenBp: bp })),
  regen: v.optional(v.strictObject({ bpPerSec: pos, delayMs: nonNeg })),
  visualId: visual,
  sfx: v.strictObject({ place: sound, complete: sound, die: sound }),
  nameKey: key,
  descKey: key,
  strongVs: v.array(id),
  weakVs: v.array(id),
  // The release gate (`release.ts`): false hides the card from players and bots until its art ships.
  released: v.optional(v.boolean()),
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
  starter: v.optional(v.boolean()),
  // The release gate (`release.ts`): false hides the card from players and bots until its art ships.
  released: v.optional(v.boolean()),
});

const PowerEffectSchema = v.variant('kind', [
  v.strictObject({
    kind: v.literal('barrage'), count: pos, durationMs: pos, zone: pos, damage: pos, radius: pos, jitter: nonNeg,
    hitsAir: v.boolean(), hitsGround: v.optional(v.boolean()), pattern: v.picklist(['even', 'line']),
  }),
  v.strictObject({ kind: v.literal('sweep'), zone: pos, durationMs: pos, damage: pos, width: pos, hitsAir: v.boolean() }),
  v.strictObject({
    kind: v.literal('stampede'), runners: pos, spacingMs: pos, distance: pos, speed: pos, damage: pos, knockback: nonNeg,
    maxHitsPerEnemy: pos,
  }),
  v.strictObject({ kind: v.literal('buffAll'), statuses: v.array(StatusApplyS), maxTargets: pos }),
  v.strictObject({ kind: v.literal('cloud'), width: pos, durationMs: pos, enemyMissBp: bp, allyDamageBp: bp }),
  v.strictObject({ kind: v.literal('paradrop'), card: id, count: pos, beyondFront: pos, fallbackP: pos }),
  v.strictObject({
    kind: v.literal('field'), zone: pos, durationMs: nonNeg, hitsAir: v.boolean(), statuses: v.optional(v.array(StatusApplyS)),
    damagePerPulse: v.optional(nonNeg), pullBp: v.optional(bp),
  }),
  v.strictObject({ kind: v.literal('strike'), shots: pos, intervalMs: nonNeg, damage: pos, hitsAir: v.boolean() }),
  v.strictObject({ kind: v.literal('suppress'), durationMs: pos }),
]);

export const PowerSchema = v.strictObject({
  id,
  kind: v.literal('power'),
  age: AGE,
  slot: v.picklist(['home', 'field']),
  reach: v.picklist(['home', 'front', 'anywhere', 'army', 'lane']),
  family: v.picklist([
    'bombard', 'sweep', 'snare', 'pull', 'stun', 'flak', 'charge', 'frontBarrage', 'strike', 'suppress', 'rally', 'ward', 'mend', 'cloud', 'drop',
    'volley', 'signal',
  ]),
  rarity: v.picklist(['common', 'rare', 'epic']),
  source: v.picklist(['starter', 'road', 'warPath']),
  road: v.optional(pos),
  warPathLevel: v.optional(pos),
  warPathSide: v.optional(v.picklist([1, 2])),
  cost: pos,
  reloadMs: pos,
  telegraphMs: pos,
  maxTargets: v.optional(pos),
  aiValueBp: v.optional(bp),
  effect: PowerEffectSchema,
  visualId: visual,
  sfx: sound,
  nameKey: key,
  descKey: key,
  // The release gate (`release.ts`): false hides the card from players and bots until its art ships.
  released: v.optional(v.boolean()),
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
  // A2.10.1 Last Base Standing: the Siege steps and the latest end
  escalation: v.optional(v.array(v.strictObject({ atMs: pos, baseDamageBp: bp, turretDamageBp: bp, crumbleBpPerSec: bp }))),
  endByMs: v.optional(pos),
});

const EconomySchema = v.strictObject({
  startGold: nonNeg, passiveGoldPerSec: nonNeg, passiveXpPerSec: nonNeg,
  mountCosts: v.array(nonNeg),
  bountyGoldBp: bp, bountyXpBp: bp, powerKillGoldBp: bp, powerKillXpBp: bp,
  ownLossXpBp: bp, underdogBp: bp, baseDamageXpPerPct: nonNeg, xpCapBp: bp,
  popCap: pos, popByGroup: perGroup(pos), queueMax: pos, legendaryLimit: pos,
  sellRefundBp: bp, turretRangeCap: pos, turretRangeHardCapLu: pos, turretBuildMs: pos, turretSellMs: pos,
  ascendMs: pos, evolveHealBp: bp, vanguardCount: nonNeg,
  powerCarryCapBp: bp, overchargeXp: pos, overchargeBp: bp,
  overdrive: v.strictObject({ baseGoldBp: bp, xpBp: bp, powerBp: bp }),
  power: v.strictObject({
    startBp: bp, emptyReloadMs: pos, homeLineP: pos, frontReachLu: nonNeg, frontFloorP: nonNeg, frontRank: pos,
    strikePickLu: pos, strikeEpicBp: bp, legendaryControlBp: bp, lockMs: nonNeg,
  }),
  siege: v.strictObject({ turretDamageBp: bp, baseDamageBp: bp, decayBpPerSec: bp, moveSpeedBp: pos, gateCrowdLu: nonNeg, ropeDeadBandLu: v.optional(nonNeg) }),
  fort: v.optional(
    v.strictObject({
      pads: v.array(pos), homePads: pos, padClearLu: nonNeg, fieldBehindLu: nonNeg, fieldFrontRank: pos,
      maxAlive: pos, maxCamps: pos, maxTowers: pos, rechargeMs: pos, firstReadyMs: nonNeg, scaffoldMs: pos, scaffoldHpBp: bp,
      safeMarginMs: nonNeg, decayStartMs: nonNeg, decayBpPerSec: bp, siegeDecayBp: bp, decayCreditMs: nonNeg,
      siegeTakenBp: bp, rangedTakenBp: bp, rangedMinLu: nonNeg, structureBp: bp, bountyGoldBp: bp, bountyXpBp: bp,
      towerReachMaxP: pos, contactLu: nonNeg, contactMax: pos, wallHpBp: bp, towerHpBp: bp, campHpBp: bp, towerDamageBp: bp,
      levyHpBp: bp, levyDamageBp: bp, levyAiValueBp: bp,
    }),
  ),
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
  v.strictObject({ kind: v.literal('fortScaffold'), ms: pos }),
  v.strictObject({ kind: v.literal('income'), milliGoldPerSec: pos }),
  v.strictObject({ kind: v.literal('bounty'), addBp: nonNeg, bonusBp: nonNeg, ownHalfOnly: v.boolean() }),
  v.strictObject({ kind: v.literal('powerReload'), bp: pos }),
  v.strictObject({ kind: v.literal('powerCost'), bp: pos }),
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
  // The release gate (`release.ts`): false hides the card from players and bots until its art ships.
  released: v.optional(v.boolean()),
});

const TicksSchema = v.strictObject({
  ascend: pos, turretBuild: pos, turretSell: pos, stanceCooldown: pos,
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
      legendaryUnownedFirst: v.boolean(), skinChanceBp: bp, skinMinRarity: SKIN_RARITY, extraLegendaryCopies: pos,
      exclusiveItems: v.boolean(), bonusDust: nonNeg, amber: pos, expectedCopiesCenti: pos, nameKey: key,
    }),
  ),
  allAges: v.strictObject({
    fromArena: pos,
    ageCapsuleStacks: pos,
    tiers: perTier(v.strictObject({ stacks: pos, copies: perRarity(pos), amber: pos, expectedCopiesCenti: pos })),
  }),
  stackRollBp: perRarity(bp),
  bag: perTier(nonNeg),
  dailyOddsBp: perTier(bp),
  summitAbove: TIER,
  legendaryCatchUp: v.boolean(),
  exclusiveCompleteDust: nonNeg,
  exclusiveCraftDust: pos,
  unownedWeight: pos,
  pity: v.strictObject({
    epicEvery: pos, legendaryFreeUntil: pos, legendaryStepBp: bp, legendaryGuaranteeAt: pos, newCardEvery: pos,
    wardrobeEpicEvery: pos, wardrobeLegendaryEvery: pos,
  }),
  charges: v.strictObject({ start: nonNeg, max: pos, regenMs: pos, freeCapsules: nonNeg }),
  clayMeterPips: pos,
  daily: v.strictObject({ firstAfterCapsule: pos, bankMax: pos }),
  supply: v.strictObject({ matchesPerCapsule: pos, allowanceMax: pos, accrues: v.boolean() }),
  resetHour: v.pipe(int, v.minValue(0), v.maxValue(23)),
  kinds: byKeys(
    ['win', 'daily', 'road', 'meter', 'age', 'codex', 'conquest', 'ageUnlock', 'warPath'],
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
      formats: v.partial(byKeys(['tutorial', 'short', 'standard', 'full', 'last'], v.strictObject({ trophies: int, amber: nonNeg, amberWithoutCharge: nonNeg }))),
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
  v.strictObject({ kind: v.literal('fort'), card: id }),
]);

const TrophyRoadSchema = v.strictObject({
  nodes: v.array(v.strictObject({ index: nonNeg, trophies: pos, rewards: v.array(RoadRewardSchema) })),
  amberFormula: v.strictObject({ base: pos, perHundred: pos }),
});

const LoadoutSchema = v.strictObject({
  // Five troop slots, or six (A18.9; the paused content expansion gives some Generals a sixth Stone troop).
  units: v.pipe(v.array(v.nullable(id)), v.minLength(5), v.maxLength(6)),
  turrets: v.pipe(v.array(v.nullable(id)), v.length(2)),
  powers: v.strictObject({ home: v.nullable(id), field: v.nullable(id) }),
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
        v.strictObject({ kind: v.literal('powers'), reloadBp: bp, costBp: bp }),
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
  v.strictObject({ kind: v.literal('cardsOwned'), count: pos }),
  v.strictObject({ kind: v.literal('albumComplete') }),
  v.strictObject({ kind: v.literal('cardsMaxed'), count: pos }),
  v.strictObject({ kind: v.literal('collectionMaxed') }),
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

const COLLECTION = v.picklist(['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop']);
const CosmeticSourceSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('start') }),
  v.strictObject({ kind: v.literal('capsule') }),
  v.strictObject({ kind: v.literal('crate') }),
  v.strictObject({ kind: v.literal('road'), trophies: pos }),
  v.strictObject({ kind: v.literal('feat'), feat: id }),
  v.strictObject({ kind: v.literal('arena'), arena: pos }),
  v.strictObject({ kind: v.literal('codexLevel'), level: pos }),
  v.strictObject({ kind: v.literal('warPath') }),
  v.strictObject({ kind: v.literal('capsuleTier'), tier: TIER }),
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
    backdrop: v.nullable(cosmeticKey),
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
      hp: pos, speed: pos, width: pos, trainTicks: pos, pop: pos, cost: nonNeg,
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
  // `fort` 0: the fort twins are placed, never trained (A16.14.8)
  trainMsByGroup: perGroup(nonNeg),
  braceKnockbackResistBp: bp, airKnockbackResistBp: bp, markDamageBp: bp, healPulseMs: pos, moderniseCreditBp: bp,
  finalAgeXpCap: pos, siegeDecayStepMs: pos, stampedeFallbackP: pos,
  projectileSpeed: v.strictObject({
    rock: pos, arrow: pos, musket: pos, bullet: pos, shell: pos, rocket: pos, arc: pos, plasma: pos,
  }),
});

/** The War Path (A18.7, ui-plan 6.4). */
const WP_DIFFICULTY = v.picklist(['easy', 'normal', 'hard', 'expert', 'legendary']);
const StarGoalSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('baseAbove'), bp }),
  v.strictObject({ kind: v.literal('winBefore'), ms: pos }),
  v.strictObject({ kind: v.literal('noLastStand') }),
  v.strictObject({ kind: v.literal('noEconomy') }),
  v.strictObject({ kind: v.literal('powerHits'), n: pos }),
]);
const WarPathSchema = v.strictObject({
  regions: v.array(v.strictObject({ age: AGE, baseTier: nonNeg, levels: v.array(v.string()), sides: v.optional(v.array(v.string())) })),
  levels: v.record(
    v.pipe(v.string(), v.regex(/^wp\.[a-z]+\.(l\d\d|s\d)$/)),
    v.strictObject({
      id: v.string(),
      region: AGE,
      index: pos,
      role: v.picklist(['intro', 'practice', 'mix', 'feature', 'lieutenant', 'relief', 'ramp', 'puzzle', 'spike', 'boss', 'side']),
      format: FORMAT_KEY,
      general: id,
      tierOffset: int,
      botLevel: pos,
      modifiers: v.array(id),
      goal2: StarGoalSchema,
      teaches: v.nullable(v.string()),
      reward: v.strictObject({ amber: nonNeg, capsule: v.nullable(TIER), card: v.nullable(id) }),
      boss: v.nullable(v.strictObject({ baseHpBp: bp, extraTurret: id })),
      onboarding: v.nullable(v.picklist([1, 2])),
      side: v.optional(v.strictObject({ n: v.picklist([1, 2]), after: pos })),
    }),
  ),
  order: v.array(v.string()),
  difficulty: v.strictObject({
    order: v.array(WP_DIFFICULTY),
    tierOffset: v.strictObject({ easy: int, normal: int, hard: int, expert: int, legendary: int }),
    legendaryTier: nonNeg,
    default: WP_DIFFICULTY,
  }),
  threeStarFrom: WP_DIFFICULTY,
  tryEasyAfter: pos,
  unlocks: v.strictObject({ army: pos, capsules: pos, modes: pos, customize: pos, progress: pos, ladder: pos, daily: pos }),
  goalsFromLevel: pos,
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
  forts: v.record(id, FortSchema),
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
  warPath: WarPathSchema,
  rosterShape: perAge(
    v.strictObject({
      units: v.strictObject({ common: pos, rare: pos, epic: pos, legendary: pos }),
      turrets: v.strictObject({ common: pos, rare: pos, epic: pos }),
      powers: v.strictObject({ home: pos, field: pos }),
      forts: v.strictObject({ wall: pos, tower: pos, camp: pos, trap: pos }),
    }),
  ),
  cardArena: v.record(id, pos),
  counters: v.record(id, v.record(id, v.pipe(v.number(), v.minValue(0), v.maxValue(1)))),
  ticks: TicksSchema,
  int: IntegerTablesSchema,
  order: v.strictObject({
    ages: v.array(AGE), formats: v.array(FORMAT), units: v.array(id), hiddenUnits: v.array(id), turrets: v.array(id),
    powers: v.array(id), forts: v.array(id), fortUnits: v.array(id), skins: v.array(id), unreleased: v.array(id),
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

/** The long-range Common turret of an age (the 150-gold Common, A16.14.1) and its range, lu. */
function longCommonRange(c: Content, age: AgeId): number {
  let best = 0;
  for (const t of Object.values(c.turrets)) if (t.age === age && t.rarity === 'common' && t.cost === 150 && t.attack.range > best) best = t.attack.range;
  return best;
}

/**
 * Fort cards (A16.14.1-A16.14.4, A16.14.8): one Wall, Tower, Camp and Trap per age with the wall as the
 * starter, costs and pop by kind, the twin and levy cards they need, the trap budget, the tower reach
 * clamp and the cover invariant (the blocked front stands inside every age's long-range Common turret).
 */
function checkForts(issues: Issues, c: Content): void {
  recordIds(issues, 'forts', c.forts);
  const f = c.economy.fort;
  const list = Object.values(c.forts);
  if (!f) {
    issues.check(list.length === 0, 'forts', 'fort cards need economy.fort (A16.14)');
    return;
  }
  issues.check(f.homePads >= 1 && f.homePads <= f.pads.length, 'economy.fort.homePads', 'Home pads are the first pads');
  issues.check(f.pads.every((p, i) => i === 0 || p > (f.pads[i - 1] as number)), 'economy.fort.pads', 'pads in increasing p');
  const lastHome = f.pads[f.homePads - 1] ?? 0;
  const halfLarge = Math.trunc(c.economy.sizes.large / 2);
  const halfSmall = Math.trunc(c.economy.sizes.small / 2);
  const halfMedium = Math.trunc(c.economy.sizes.medium / 2);
  issues.check(f.towerReachMaxP === c.economy.turretRangeHardCapLu, 'economy.fort.towerReachMaxP', 'tower reach stops at the turret hard cap (A16.14.1)');
  const costOf: Record<string, number> = { wall: 125, trap: 100, camp: 150, tower: 150 };
  for (const x of list) {
    const p = `forts.${x.id}`;
    issues.check(x.age in c.ages, p, `unknown age "${x.age}"`);
    issues.check(x.visualId === `fort.${x.id}`, p, 'visualId must be fort.<slug> (A16.14.8)');
    issues.check(x.nameKey === `card.${x.id}.name` && x.descKey === `card.${x.id}.desc`, p, 'string keys must be card.<slug>.name/desc');
    // X0 fort variants: granted by a side node or a star milestone, with a Road set tile (4,100-5,000).
    const variant = x.warPathSide !== undefined || x.warPathStars !== undefined;
    issues.check(
      x.cost === costOf[x.fortKind] || (x.fortKind === 'wall' && (x.cover !== undefined || variant) && x.cost === 175) || (x.fortKind === 'wall' && variant && x.cost === 100),
      p,
      'fort costs by kind: Wall 125 (Bunker, cover or heavy wall 175, cheap wall 100), Trap 100, Camp 150, Tower 150 (A16.14.1, X0)',
    );
    issues.check(x.pop === (x.fortKind === 'trap' ? 3 : 6), p, 'fort pop: 6, a Trap 3 (A16.14.1)');
    issues.check(x.size === (x.fortKind === 'tower' ? 'medium' : x.fortKind === 'trap' ? null : 'large'), p, 'towers medium, walls and camps large, traps no body');
    issues.check(x.pads === (x.fortKind === 'camp' ? 'any' : 'home'), p, 'only camps may use Field pads (A16.14.1)');
    issues.check(x.rarity === (x.fortKind === 'wall' ? 'common' : x.fortKind === 'tower' ? 'epic' : 'rare'), p, 'Walls Common, Camps and Traps Rare, Towers Epic');
    if (variant) {
      issues.check(x.source === 'warPath' && x.warPathLevel === undefined && (x.warPathSide === 2 || (x.warPathStars ?? 0) > 0), p, 'a fort variant comes from side node s2 or a star milestone (X0)');
      issues.check(x.road !== undefined && x.road >= 4100 && x.road <= 5000, p, 'a fort variant has a Road set tile 4,100-5,000 (X0)');
    } else if (x.fortKind === 'wall') issues.check(x.source === 'starter' && x.warPathLevel === undefined, p, 'walls are starter cards (A16.14.6)');
    else if (x.age === 'stone') issues.check(x.source === 'unlock', p, 'the Stone Camp, Trap and Tower come with the unlock (A16.14.6)');
    else {
      const lvl = x.fortKind === 'camp' ? 4 : x.fortKind === 'trap' ? 6 : 8;
      issues.check(x.source === 'warPath' && x.warPathLevel === lvl && x.road !== undefined && x.road >= 2200 && x.road <= 3200, p, 'Camp L4, Trap L6, Tower L8 with a Road fort set 2,200-3,200 (A16.14.6)');
    }
    const twin = c.units[x.id];
    if (x.fortKind === 'trap') {
      issues.check(twin === undefined, p, 'traps have no twin unit (they live in SimState.traps)');
      const t = x.trap;
      issues.check(t !== undefined && x.hp === 0, p, 'a trap has trap data and no HP');
      if (t) {
        const inf = Object.values(c.units).find((u) => u.age === x.age && u.group === 'infantry' && u.rarity === 'common' && !u.hidden);
        const total = t.charges * t.damage;
        const control = t.statuses.length > 0;
        const i = inf?.hp ?? 0;
        // A16.14.3 trap budget: 0.6-1.2 × the age's L1 Infantry HP over all charges (a control trap may go below)
        issues.check(total * BP <= i * 12000 && (control || total * BP >= i * 6000), p, `trap budget: ${total} vs Infantry HP ${i}`);
        issues.check(t.radius <= 60, p, 'trap splash radius ≤ 60 (A16.14.3)');
        issues.check(t.maxTargets <= c.economy.areaMaxTargets, p, 'traps use the A2.6 area rule');
        for (const st of t.statuses) issues.check(st.kind === 'slow' && st.magnitudeBp <= 6000 && st.durationMs <= 3000, p, 'traps only slow, ≤ 60% for ≤ 3 s (A16.14.3)');
      }
    } else {
      issues.check(twin !== undefined && twin.fort?.kind === x.fortKind && twin.hp === x.hp && twin.cost === x.cost && twin.pop === x.pop, p, 'walls, towers and camps have a matching hidden twin unit (A16.14.8)');
      issues.check(x.hp > 0, p, 'a fort has HP');
    }
    if (x.fortKind === 'tower') {
      const a = x.attack;
      // X0 tower variants may lob a small splash (≤ 30) or chain to 2 (the plan's lob and chain towers).
      const area = variant ? (a?.splashRadius ?? 0) <= 30 && (a?.chain?.count ?? 0) <= 2 : !a?.splashRadius && !a?.chain;
      issues.check(a !== undefined && a.hitsGround && (a.windupPct ?? 0) === 0 && area && !a.pierce && !a.cleave, p, 'a tower has one single-target attack with 0% windup (variants: a small splash or a chain) (A16.14.3, X0)');
      if (a) {
        for (let i = 0; i < f.homePads; i += 1) {
          const pad = f.pads[i] as number;
          const range = Math.min(a.range, f.towerReachMaxP - pad - halfMedium);
          issues.check(pad + halfMedium + range <= f.towerReachMaxP, p, 'tower reach never passes own-frame p 560 (A16.14.1)');
        }
      }
    } else issues.check(x.attack === undefined, p, 'only towers attack');
    if (x.fortKind === 'camp') {
      const levy = x.camp ? c.units[x.camp.spawn] : undefined;
      issues.check(levy !== undefined && levy.levy === true && levy.age === x.age && levy.group === 'infantry', p, 'a camp sends a levy of its age (A16.14.3)');
    } else issues.check(x.camp === undefined, p, 'only camps spawn');
  }
  for (const age of AGE_ORDER) {
    const kinds = list.filter((x) => x.age === age).map((x) => x.fortKind);
    const want = c.rosterShape[age].forts;
    const n = (k: FortKind): number => kinds.filter((x) => x === k).length;
    if (list.length > 0) issues.check(n('wall') === want.wall && n('tower') === want.tower && n('camp') === want.camp && n('trap') === want.trap, `forts.${age}`, 'forts per kind follow the roster shape (A16.14.4, X0)');
    if (list.length > 0) issues.check(list.filter((x) => x.age === age && x.fortKind === 'wall' && x.source === 'starter').length === 1, `forts.${age}`, 'one starter wall per age (A16.14.6)');
    // A16.14.1 cover invariant: a large fort on the last Home pad stops a small attacker inside the long-range Common turret's reach.
    const long = longCommonRange(c, age);
    if (long > 0) issues.check(lastHome + halfLarge + halfSmall <= long, `forts.${age}`, `the blocked front (${lastHome + halfLarge + halfSmall}) stands inside the long-range Common turret (${long}) (A16.14.1)`);
  }
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
    // A16.14.8: a fort's hidden twin shares its fort's visual (`fort.<slug>`)
    issues.check(u.visualId === (u.fort ? `fort.${u.id}` : `unit.${u.id}`), p, 'visualId must be unit.<slug> (fort twins: fort.<slug>) (A14.1)');
    if (u.fort) {
      issues.check(u.hidden === true && u.role === 'fort' && u.group === 'fort' && u.speed === 0, p, 'a fort twin is hidden, role and group fort, speed 0 (A16.14.8)');
      issues.check(c.forts[u.id] !== undefined && c.forts[u.id]?.fortKind === u.fort.kind, p, 'a fort twin has the id and kind of its fort card (A16.14.8)');
    } else {
      issues.check(u.role !== 'fort' && u.group !== 'fort', p, 'only fort twins use the fort role and group');
      issues.check(u.speed > 0 && u.trainMs > 0, p, 'units move and train (A2.7)');
      const free = u.levy === true || u.summon === true;
      issues.check(free ? u.cost === 0 && u.hidden === true && (u.aiValue ?? 0) > 0 : u.cost > 0, p, 'cards cost gold; a levy or summon costs 0 and carries an AI value (A16.14.3, X0 M3)');
      issues.check(!(u.levy === true && u.summon === true), p, 'a card is a levy or a summon, not both');
      // X0 M1: a squad's group pop splits evenly over its members.
      if (u.squad) issues.check(u.pop % u.squad.count === 0 && u.cost % u.squad.count === 0, p, 'a squad card\'s pop and cost divide evenly by its count (X0 M1)');
      if (u.squad) issues.check(u.group === 'infantry' || u.group === 'ranged', p, 'squads are Infantry or Ranged cards (X0 M1)');
      if (u.starter) issues.check(!u.hidden && (u.rarity === 'common' || (u.rarity === 'rare' && u.group === 'antiArmor')), p, 'starters are Commons and the Anti-heavy Rare (X0)');
    }
    issues.check(u.nameKey === `card.${u.id}.name` && u.descKey === `card.${u.id}.desc`, p, 'string keys must be card.<slug>.name/desc');
    issues.check(new Set(u.tags).size === u.tags.length, p, 'duplicate tag');
    issues.check((u.rarity === 'legendary') === u.tags.includes('legendary'), p, 'the legendary tag marks exactly the Legendary cards');
    u.attacks.forEach((a, i) => checkAttack(issues, `${p}.attacks.${i}`, a, c));
    for (const ab of u.abilities) {
      if (ab.kind === 'riders') {
        checkAttack(issues, `${p}.riders`, ab.attack, c);
        issues.check(c.units[ab.onDeathSpawn] !== undefined, p, `riders spawn unknown unit "${ab.onDeathSpawn}"`);
      }
      if (ab.kind === 'summon') {
        const sm = c.units[ab.card];
        issues.check(sm !== undefined && sm.summon === true && sm.age === u.age, p, `"${ab.card}" is not a summon card of this age (X0 M3)`);
        issues.check(ab.maxAlive >= 1 && ab.maxAlive <= 3, p, 'a summoner keeps 1-3 summons alive (X0 M3)');
      }
      if (ab.kind === 'frenzy') {
        // X0 M2 inside the A18.2 caps: at most +35% damage and +25% attack speed.
        issues.check(ab.damageBp <= 3500 && ab.attackSpeedBp <= 2500 && ab.belowHpBp > 0 && ab.belowHpBp < BP, p, 'frenzy: below a line under 100%, at most +35% damage and +25% attack speed (X0 M2)');
      }
    }
    for (const x of [...u.strongVs, ...u.weakVs]) issues.check(c.units[x] !== undefined, p, `strongVs/weakVs names unknown unit "${x}"`);
  }
  for (const t of Object.values(c.turrets)) {
    const p = `turrets.${t.id}`;
    if (t.starter) issues.check(t.rarity === 'common', p, 'starter turrets are Commons (X0)');
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
    checkPower(issues, p, pw);
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

/**
 * A5.1 collection shape and the per-age slots (A5.2-A5.7), read from the X0 roster shape (`rosterShape`):
 * per age the units by rarity, turrets by rarity and powers by slot; the totals are their sums. Every age
 * keeps its four starters (an Infantry, Ranged and Heavy Common and the Anti-heavy Rare) and two starter
 * Common turrets; Epic and Legendary units sit in their own role groups.
 */
function checkCollection(issues: Issues, c: Content): void {
  // The roster shape counts every card, released or not (the release gate only hides cards, `release.ts`).
  const unreleased = c.order.unreleased;
  const units = [...c.order.units, ...unreleased.filter((x) => c.units[x] !== undefined && c.units[x].hidden !== true)].map((x) => c.units[x] as UnitDef);
  const turrets = [...c.order.turrets, ...unreleased.filter((x) => c.turrets[x] !== undefined)].map((x) => c.turrets[x]);
  const powerCount = c.order.powers.length + unreleased.filter((x) => c.powers[x] !== undefined).length;
  const shape = c.rosterShape;
  const total = (f: (a: AgeId) => number): number => AGE_ORDER.reduce((n, a) => n + f(a), 0);
  const want: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const age of AGE_ORDER) {
    const s = shape[age];
    for (const r of ['common', 'rare', 'epic', 'legendary'] as const) want[r] += s.units[r] + (r === 'legendary' ? 0 : s.turrets[r]);
  }
  const wantUnits = total((a) => shape[a].units.common + shape[a].units.rare + shape[a].units.epic + shape[a].units.legendary);
  const wantTurrets = total((a) => shape[a].turrets.common + shape[a].turrets.rare + shape[a].turrets.epic);
  const wantPowers = total((a) => shape[a].powers.home + shape[a].powers.field);
  issues.check(units.length === wantUnits, 'order.units', `${wantUnits} collectable units (rosterShape), found ${units.length}`);
  issues.check(turrets.length === wantTurrets, 'order.turrets', `${wantTurrets} turrets (rosterShape), found ${turrets.length}`);
  issues.check(powerCount === wantPowers, 'order.powers', `${wantPowers} Age Powers (rosterShape), found ${powerCount}`);
  const count = (r: Rarity): number => [...units, ...turrets].filter((x) => x?.rarity === r).length;
  for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
    issues.check(count(r) === want[r], 'collection', `${want[r]} ${r} cards (rosterShape), found ${count(r)}`);
  }
  for (const age of AGE_ORDER) {
    const s = shape[age];
    const p = `ages.${age}`;
    const us = units.filter((u) => u.age === age);
    const of = (r: Rarity): UnitDef[] => us.filter((u) => u.rarity === r);
    for (const r of ['common', 'rare', 'epic', 'legendary'] as const) issues.check(of(r).length === s.units[r], p, `${s.units[r]} ${r} units (rosterShape)`);
    issues.check(of('common').every((u) => ['infantry', 'ranged', 'heavy'].includes(u.group)), p, 'Commons are Infantry, Ranged or Heavy (A3)');
    issues.check(of('rare').every((u) => ['infantry', 'ranged', 'heavy', 'antiArmor', 'support'].includes(u.group)), p, 'Rares sit in a class group (A3)');
    issues.check(of('epic').every((u) => u.group === 'epic') && of('legendary').every((u) => u.group === 'legendary'), p, 'Epic and Legendary units use their own groups');
    const starters = us.filter((u) => u.starter === true);
    const st = (g: RoleGroup, r: Rarity): number => starters.filter((u) => u.group === g && u.rarity === r).length;
    issues.check(starters.length === 4 && st('infantry', 'common') === 1 && st('ranged', 'common') === 1 && st('heavy', 'common') === 1 && st('antiArmor', 'rare') === 1, p, 'four starters: an Infantry, Ranged and Heavy Common and the Anti-heavy Rare (A3, X0)');
    issues.check(us.some((u) => u.group === 'support' && u.rarity === 'rare'), p, 'a Support Rare (A3)');
    const ts = turrets.filter((t) => t?.age === age);
    const tr = (r: 'common' | 'rare' | 'epic'): number => ts.filter((t) => t?.rarity === r).length;
    issues.check(tr('common') === s.turrets.common && tr('rare') === s.turrets.rare && tr('epic') === s.turrets.epic, p, `${s.turrets.common} / ${s.turrets.rare} / ${s.turrets.epic} turrets by rarity (rosterShape)`);
    issues.check(ts.filter((t) => t?.starter === true).length === 2, p, 'two starter Common turrets (A3, X0)');
    checkAgePowers(issues, p, Object.values(c.powers).filter((x) => x.age === age), s.powers);
  }
  // X0: a content-wave card drops from the arena that unlocks its rarity (`cardArena`).
  for (const [card, arena] of Object.entries(c.cardArena)) {
    const def = c.units[card] ?? c.turrets[card];
    issues.check(def !== undefined && !(c.units[card]?.hidden ?? false), `cardArena.${card}`, 'names a collectable unit or turret');
    issues.check(def?.starter !== true, `cardArena.${card}`, 'starter cards are owned from the start');
    issues.check(arena >= 1 && arena <= c.arenas.list.length, `cardArena.${card}`, 'names an arena');
  }
  const skins = Object.values(c.skins);
  for (const r of ['rare', 'epic', 'legendary'] as const) {
    issues.check(skins.filter((s) => s.rarity === r).length >= 4, 'skins', `at least 4 ${r} skins (A5.8)`);
  }
  issues.check(skins.filter((s) => s.inCratePool).length >= 11, 'skins', 'the crate pool holds at least the 11 v1 skins (A5.8)');
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

/**
 * Last Base Standing (A2.10.1): an `untimed` format is 7 ages with Siege steps and no Final Bell; the
 * first step starts at `siegeMs`, steps are in time order, multipliers never weaken a step, a Crumble
 * step exists, and `endByMs` is the bound {@link escalationEndMs} derives from the steps.
 * The Siege rope of the timed formats (A2.10.2): Short, Medium and Long War may carry Siege steps too,
 * with the same order rules, a rope from the first step, their Final Bell after the last step, and no
 * `endByMs` (the Bell ends them). Other windows keep today's Siege.
 */
function checkEscalation(issues: Issues, key: string, f: Content['formats'][string]): void {
  const p = `formats.${key}`;
  const steps = f.escalation;
  if (f.kind === 'untimed') {
    issues.check(f.ages.length === 7, p, 'Last Base Standing is 7 ages (A2.10.1)');
    issues.check(steps !== undefined && steps.length > 0, p, 'an untimed format has Siege steps (A2.10.1)');
  }
  if (!steps) {
    issues.check(f.endByMs === undefined, p, 'endByMs belongs to a format with Siege steps');
    return;
  }
  const timed = f.kind === 'short' || f.kind === 'standard' || f.kind === 'full';
  issues.check(f.kind === 'untimed' || timed, p, 'Siege steps belong to Last Base Standing or a Short, Medium or Long War (A2.10.1, A2.10.2)');
  issues.check(steps.length > 0 && f.siegeMs === steps[0]?.atMs, p, 'the first Siege step starts at siegeMs');
  steps.forEach((x, i) => {
    const prev = steps[i - 1];
    if (!prev) return;
    issues.check(x.atMs > prev.atMs, p, 'Siege steps are in time order');
    issues.check(x.baseDamageBp >= prev.baseDamageBp && x.turretDamageBp <= prev.turretDamageBp && x.crumbleBpPerSec >= prev.crumbleBpPerSec, p, 'a later Siege step is never milder');
  });
  if (timed) {
    issues.check(f.finalBellMs !== null && steps.every((x) => x.atMs < (f.finalBellMs as number)), p, 'a timed format keeps its Final Bell after its last Siege step (A2.10.2)');
    issues.check((steps[0]?.crumbleBpPerSec ?? 0) > 0, p, 'a timed Siege rope runs from Siege (A2.10.2)');
    issues.check(f.endByMs === undefined, p, 'endByMs belongs to Last Base Standing (the Final Bell ends a timed war)');
    return;
  }
  issues.check(f.finalBellMs === null, p, 'a format with Siege steps has no Final Bell (A2.10.1)');
  const end = escalationEndMs(steps);
  issues.check(end !== null, p, 'a Crumble step guarantees an end (A2.10.1)');
  issues.check(f.endByMs === end, p, `endByMs is derived from the steps (${end ?? 'none'})`);
}

/**
 * The latest end of a war with these Siege steps (A2.10.1), in ms, or null when no step crumbles. The
 * rope takes at least one side every second, so the two bases' combined HP falls by at least the step's
 * rate (bp per second) from two full bases; a base has fallen by the time the combined HP reaches 0.
 */
export function escalationEndMs(steps: readonly { atMs: number; crumbleBpPerSec: number }[]): number | null {
  const first = steps.findIndex((x) => x.crumbleBpPerSec > 0);
  if (first < 0) return null;
  let combined = 2 * 10000;
  let ms = (steps[first] as { atMs: number }).atMs;
  for (let i = first; i < steps.length; i += 1) {
    const rate = (steps[i] as { crumbleBpPerSec: number }).crumbleBpPerSec;
    const until = steps[i + 1]?.atMs ?? Number.POSITIVE_INFINITY;
    const secs = Math.ceil(combined / rate);
    if (ms + secs * 1000 <= until) return ms + secs * 1000;
    const span = Math.trunc((until - ms) / 1000);
    combined -= span * rate;
    ms = until;
  }
  return null;
}

function checkAgesAndFormats(issues: Issues, c: Content): void {
  AGE_ORDER.forEach((age, i) => {
    const a = c.ages[age];
    issues.check(a.index === i, `ages.${age}`, 'index follows age order');
    // Base max HP is the same multiple of P in every age (A2.2): 8,000 × P since the MVP balance pass,
    // 10,000 × P in the frozen fixture.
    const ref = c.ages[AGE_ORDER[0] as AgeId];
    issues.check(a.baseHp * ref.pBp === ref.baseHp * a.pBp && a.baseHp <= a.pBp, `ages.${age}`, 'base max HP = k × P in every age, k ≤ 10,000 (A2.2)');
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
    checkEscalation(issues, key, f);
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

function loadoutCards(l: { units: (CardId | null)[]; turrets: (CardId | null)[]; powers: { home: CardId | null; field: CardId | null } }): CardId[] {
  return [...l.units, ...l.turrets, l.powers.home, l.powers.field].filter((x): x is CardId => x !== null);
}

/** Families per slot (A5.7 role template). */
const HOME_FAMILIES: readonly PowerFamily[] = ['bombard', 'sweep', 'snare', 'pull', 'stun', 'flak'];
const FIELD_FAMILIES: readonly PowerFamily[] = ['charge', 'frontBarrage', 'strike', 'suppress', 'rally', 'ward', 'mend', 'cloud', 'drop', 'volley', 'signal'];
/** Kinds whose effect damages or controls enemy units: `maxTargets` required (A2.9.5). */
const CAPPED_KINDS: readonly PowerEffect['kind'][] = ['barrage', 'sweep', 'stampede', 'field', 'buffAll', 'strike'];

/** Area damage (A2.9.4 content rule): a barrage with a cap ≥ 2, a sweep, a charge, or a damaging field. */
function isAreaDamage(pw: PowerDef): boolean {
  const fx = pw.effect;
  if (fx.kind === 'barrage') return (pw.maxTargets ?? 0) >= 2;
  if (fx.kind === 'sweep' || fx.kind === 'stampede') return true;
  if (fx.kind === 'field') return (fx.damagePerPulse ?? 0) > 0;
  return false;
}

/** One power's slot, reach, cap and family rules (A2.9.1, A2.9.4-A2.9.6, A5.7). */
function checkPower(issues: Issues, p: string, pw: PowerDef): void {
  const fx = pw.effect;
  issues.check(pw.nameKey === `card.${pw.id}.name` && pw.descKey === `card.${pw.id}.desc`, p, 'string keys must be card.<slug>.name/desc');
  issues.check((pw.slot === 'home' ? HOME_FAMILIES : FIELD_FAMILIES).includes(pw.family), p, `family "${pw.family}" does not fit the ${pw.slot} slot (A5.7)`);
  if (pw.slot === 'home') issues.check(pw.reach === 'home', p, 'every Home power has reach home (A2.9.1)');
  else issues.check(pw.reach !== 'home', p, 'a Field power reaches front, anywhere, army or the whole lane (A2.9.1)');
  if (isAreaDamage(pw)) issues.check(pw.reach === 'home' || pw.reach === 'front' || pw.reach === 'lane', p, 'area damage is never "anywhere" (A2.9.4)');
  if (pw.reach === 'anywhere') issues.check(fx.kind === 'strike' || fx.kind === 'paradrop', p, '"anywhere" is only for strikes and drops (A2.9.4)');
  if (pw.reach === 'army') issues.check(fx.kind === 'buffAll', p, 'army reach is for buffs (A2.9.4)');
  if (fx.kind === 'buffAll') issues.check(pw.reach === 'army', p, 'buffs reach your army (A2.9.4)');
  if (pw.reach === 'home' && 'zone' in fx) issues.check(fx.zone <= 850, p, 'a Home zone is at most 850 lu (A2.9.4)');
  if (CAPPED_KINDS.includes(fx.kind)) {
    const cap = pw.maxTargets ?? 0;
    issues.check(cap >= 1, p, `${fx.kind} needs maxTargets (A2.9.5)`);
    if (fx.kind === 'buffAll') issues.check(fx.maxTargets === cap && cap <= 8, p, 'a buff affects at most 8 own units; effect and card caps agree (A2.9.5)');
    else if (fx.kind === 'strike') issues.check(cap === 1, p, 'a strike has maxTargets 1 (A2.9.7)');
    else issues.check(cap <= (pw.reach === 'lane' ? 8 : 6), p, 'a cast affects at most 6 enemy units (8 for a whole-lane power) (A2.9.5, A2.9.4)');
  }
  if (fx.kind === 'cloud') issues.check((pw.maxTargets ?? 0) >= 1 && (pw.maxTargets ?? 0) <= 8, p, 'the cloud\'s ally bonus reaches at most 8 own units (A2.9.5)');
  if (fx.kind === 'stampede') issues.check(pw.reach === 'front', p, 'charges run from your front (A2.9.4)');
  if (fx.kind === 'suppress') issues.check(pw.reach === 'front' && pw.family === 'suppress', p, 'Suppress reaches from your front (A2.9.4)');
  if (fx.kind === 'strike') issues.check(pw.reach === 'anywhere' && pw.family === 'strike', p, 'strikes reach anywhere (A2.9.4)');
  if (fx.kind === 'paradrop') issues.check(pw.reach === 'anywhere' && pw.family === 'drop', p, 'drops land anywhere (A2.9.4)');
  if (pw.family === 'flak') issues.check(fx.kind === 'barrage' && fx.hitsAir && fx.hitsGround === false, p, 'Flak is an air-only barrage (A2.9.7)');
  if (pw.source === 'starter') issues.check(pw.rarity === 'common' && pw.road === undefined && pw.warPathLevel === undefined, p, 'starters are Common and have no source node (A2.9.8)');
  if (pw.source === 'road') issues.check(pw.rarity === 'rare' && pw.road !== undefined && pw.road <= 500 && pw.warPathLevel === undefined, p, 'Road powers are Rare, on nodes 100-500 (A2.9.8)');
  if (pw.source === 'warPath') {
    const lvl = pw.warPathLevel ?? 0;
    if (pw.warPathSide !== undefined) {
      // X0: the region's side node s1 grants its new Home control (Epic).
      issues.check(pw.warPathLevel === undefined && pw.warPathSide === 1 && pw.slot === 'home' && pw.rarity === 'epic', p, 'the side node s1 power is an Epic Home power without a level (X0)');
    } else {
      issues.check([3, 5, 7, 9].includes(lvl), p, 'War Path powers come from levels 3, 5, 7 and 9 (A2.9.8, H7)');
      issues.check(pw.rarity === (lvl === 3 || lvl === 5 ? 'rare' : 'epic'), p, 'War Path L3 and L5 powers are Rare, L7 and L9 Epic (A5.7)');
      issues.check((lvl === 3) === (pw.reach === 'lane'), p, 'the L3 power is the region\'s whole-lane power (H7)');
    }
    issues.check(pw.road !== undefined && pw.road >= 550, p, 'War Path powers have a Trophy Road fallback node ≥ 550 (A2.9.8)');
  } else issues.check(pw.warPathSide === undefined, p, 'only War Path powers name a side node');
  if (pw.reach === 'lane') {
    // A2.9.4 lane budget: a one-pulse field over the whole lane, cap ≤ 8, cost ≤ 75, light statuses only.
    issues.check(pw.slot === 'field' && (pw.family === 'volley' || pw.family === 'signal'), p, 'lane powers are Field volleys or signals (H7)');
    issues.check(fx.kind === 'field' && fx.durationMs <= 500 && (fx.pullBp ?? 0) === 0, p, 'a lane power is one pulse with no pull (A2.9.4)');
    issues.check((pw.maxTargets ?? 0) >= 1 && (pw.maxTargets ?? 0) <= 8 && pw.cost <= 75, p, 'lane budget: cap ≤ 8, cost ≤ 75 (A2.9.4)');
    if (fx.kind === 'field') {
      for (const st of fx.statuses ?? []) {
        issues.check((st.kind === 'snare' && st.magnitudeBp <= 3000 && st.durationMs <= 3000) || (st.kind === 'mark' && st.durationMs <= 6000), p, 'lane statuses: at most a 30% snare for 3 s or a mark for 6 s (A2.9.4)');
      }
    }
  }
  if (pw.family === 'volley' || pw.family === 'signal') issues.check(pw.reach === 'lane', p, 'volleys and signals reach the whole lane (H7)');
  // A strike hits one unit for a pinned 55-65% of the Heavy (A2.9.6), so its levers are price and reload
  // (MVP balance pass 2026-10-01: strikes at 75 gold and 25-30 s lost 5-20 points to their slot's starter).
  const strike = pw.effect.kind === 'strike';
  // Whole-lane powers (H7): 50-75 gold, 25 s.
  const cheap = strike || pw.reach === 'lane';
  issues.check(pw.cost >= (cheap ? 50 : 75) && pw.cost <= 150, p, 'a power costs 75-150 gold, a strike or whole-lane power 50-150 (A2.9.2, H7)');
  issues.check(pw.reloadMs >= (strike ? 15000 : 25000) && pw.reloadMs <= 60000, p, 'a power reloads in 25-60 s, a strike in 15-60 s (A2.9.3)');
  issues.check(pw.telegraphMs >= 500 && pw.telegraphMs <= 2000, p, 'a telegraph lasts 0.5-2.0 s (A2.9.6)');
}

/**
 * A5.7 role template per age, from the roster shape: 6 powers (3 Home and 3 Field) before the age's
 * content wave, 8 (4 and 4) after it. One starter per slot, 1 Road power, the rest War Path (levels 5, 7
 * and 9; after the wave also the L3 lane power and the side node s1 Home control). Home: a bombard, a
 * sweep and one control (two after the wave); Field: an assault, a precision or siege tool, a support
 * and (after the wave) one whole-lane power (H7).
 */
function checkAgePowers(issues: Issues, p: string, ps: readonly PowerDef[], shape: AgeRosterShape['powers']): void {
  const home = ps.filter((x) => x.slot === 'home');
  const field = ps.filter((x) => x.slot === 'field');
  const wave = shape.home === 4 && shape.field === 4;
  issues.check(home.length === shape.home && field.length === shape.field, p, `${shape.home} Home and ${shape.field} Field Age Powers (rosterShape, A5.7)`);
  issues.check(home.filter((x) => x.source === 'starter').length === 1, p, 'one Home starter (A2.9.8)');
  issues.check(field.filter((x) => x.source === 'starter').length === 1, p, 'one Field starter (A2.9.8)');
  issues.check(ps.filter((x) => x.source === 'road').length === 1, p, 'one Trophy Road power (A2.9.8)');
  const wp = ps.filter((x) => x.source === 'warPath');
  issues.check(wp.length === ps.length - 3, p, 'every other power comes from the War Path (A2.9.8)');
  const levels = wp.map((x) => (x.warPathSide !== undefined ? `s${x.warPathSide}` : String(x.warPathLevel))).sort();
  issues.check(levels.join() === (wave ? '3,5,7,9,s1' : '5,7,9'), p, wave ? 'War Path powers at levels 3, 5, 7 and 9 and side node s1 (A2.9.8, X0)' : 'War Path powers at levels 5, 7 and 9 (A2.9.8)');
  const has = (list: readonly PowerDef[], fams: readonly PowerFamily[]): number => list.filter((x) => fams.includes(x.family)).length;
  // Home: a bombard and a sweep (one of each family), and a control (Flak in an air age); two after the wave.
  issues.check(has(home, ['bombard']) >= 1 && has(home, ['sweep']) >= 1, p, 'Home: a bombard and a sweep (A5.7)');
  issues.check(has(home, ['snare', 'pull', 'stun', 'flak']) === (wave ? 2 : 1), p, wave ? 'Home: two controls (X0)' : 'Home: one control (Flak in an air age) (A5.7)');
  const starterHome = home.find((x) => x.source === 'starter');
  issues.check(starterHome !== undefined && isAreaDamage(starterHome), p, 'the Home starter is an area damage power (A5.7)');
  // Field: an assault, a precision or siege tool, a support, and (after the wave) a whole-lane power.
  issues.check(has(field, ['charge', 'frontBarrage']) === 1, p, 'Field: one assault (charge or front barrage) (A5.7)');
  issues.check(has(field, ['strike', 'suppress']) === 1, p, 'Field: one precision or siege tool (strike or Suppress) (A5.7)');
  issues.check(has(field, ['rally', 'ward', 'mend', 'cloud', 'drop']) === 1, p, 'Field: one support (buff, cloud or drop) (A5.7)');
  issues.check(has(field, ['volley', 'signal']) === (wave ? 1 : 0), p, wave ? 'Field: one whole-lane power (H7)' : 'no whole-lane power before the age\'s wave');
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
      const l: Loadout | undefined = gen.warPlan[age];
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
      for (const slot of ['home', 'field'] as const) {
        const pw: CardId | null = l.powers[slot];
        if (pw === null) continue;
        issues.check(c.powers[pw]?.age === age, lp, `"${pw}" is not a power of this age (A3)`);
        issues.check(c.powers[pw]?.slot === slot, lp, `"${pw}" does not fit the ${slot} slot (A2.9.1)`);
      }
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
  // The bag size is the sum of its counts (A6.4: 200), never a separate constant.
  issues.check(sum(cap.bag) > 0, 'capsules.bag', 'the bag holds capsules');
  issues.check(sum(cap.dailyOddsBp) === BP, 'capsules.dailyOddsBp', 'Daily odds sum to 100%');
  issues.check(sum(cap.stackRollBp) === BP, 'capsules.stackRollBp', 'stack rarity odds sum to 100%');
  cap.tierOrder.forEach((t, i) => {
    const tier = cap.tiers[t];
    issues.check(tier.index === i, `capsules.tiers.${t}`, 'index follows tier order');
    issues.check(tier.guaranteed.length <= tier.stacks, `capsules.tiers.${t}`, 'more guarantees than stacks');
    issues.check(tier.id === t, `capsules.tiers.${t}`, 'id matches its key');
    issues.check(
      tier.extraLegendaryCopies >= 1 && tier.extraLegendaryCopies <= tier.copies.legendary,
      `capsules.tiers.${t}`,
      'extraLegendaryCopies is 1..copies.legendary',
    );
  });
  // The all-ages table (A6.4, content re-tune 2026-10-04): never smaller than the base table, room for
  // every guarantee, and every column rises (or stays) going up the ladder.
  const wide = cap.allAges;
  issues.check(wide.fromArena >= 2 && wide.fromArena <= c.arenas.list.length, 'capsules.allAges.fromArena', 'is an arena after the first');
  issues.check(wide.ageCapsuleStacks >= cap.ageCapsule.stacks && wide.ageCapsuleStacks >= cap.ageCapsule.guaranteed.length, 'capsules.allAges.ageCapsuleStacks', 'not below the base Age Capsule');
  cap.tierOrder.forEach((t, i) => {
    const w = wide.tiers[t];
    const base = cap.tiers[t];
    const p = `capsules.allAges.tiers.${t}`;
    issues.check(w.stacks >= base.stacks && w.stacks >= base.guaranteed.length, p, 'stacks not below the base tier');
    issues.check(w.amber >= base.amber, p, 'Amber not below the base tier');
    issues.check((['common', 'rare', 'epic', 'legendary'] as const).every((r) => w.copies[r] >= base.copies[r]), p, 'copies not below the base tier');
    issues.check(base.extraLegendaryCopies <= w.copies.legendary, p, 'extraLegendaryCopies is 1..copies.legendary');
    const prevTier = i > 0 ? cap.tierOrder[i - 1] : undefined;
    const prev = prevTier ? wide.tiers[prevTier] : null;
    if (prev) {
      issues.check(w.stacks >= prev.stacks && w.amber >= prev.amber, p, 'stacks and Amber rise up the ladder');
      issues.check((['common', 'rare', 'epic', 'legendary'] as const).every((r) => w.copies[r] >= prev.copies[r]), p, 'copies rise up the ladder');
    }
  });
  issues.check(new Set(cap.tierOrder).size === cap.tierOrder.length && cap.tierOrder.length === Object.keys(cap.tiers).length, 'capsules.tierOrder', 'lists every tier once');
  issues.check(cap.tierOrder.includes(cap.summitAbove), 'capsules.summitAbove', 'is a tier of the ladder');
  cap.script.forEach((s, i) => {
    const p = `capsules.script.${i}`;
    issues.check(s.capsule === i + 1, p, 'script capsules are numbered 1..n');
    issues.check(s.cards.length + (s.randomUnownedEpic ? 1 : 0) <= cap.tiers[s.tier].stacks, p, 'more scripted cards than stacks');
    for (const x of s.cards) {
      const card = c.units[x] ?? c.turrets[x];
      issues.check(card !== undefined, p, `unknown card "${x}"`);
      // A6.5 reveals scripted cards as NEW, so none may be in the starter kit (every Common and each
      // age's Anti-heavy Rare, A3).
      issues.check(card === undefined || card.starter !== true, p, `"${x}" is a starter card, so it cannot be NEW`);
    }
  });
  // A3: each age's Support Rare arrives by script or by an Age Unlock Capsule at an arena gate (the
  // Anti-heavy Rares are in the starter kit since owner feedback 2026-09-29).
  const unlockAges = new Set(c.arenas.list.flatMap((a) => a.gateRewards.flatMap((r) => (r.kind === 'ageUnlock' ? r.ages : []))));
  const scripted = new Set(cap.script.flatMap((s) => s.cards));
  for (const age of AGE_ORDER) {
    const support = c.order.units.map((x) => c.units[x]).find((u) => u?.age === age && u.group === 'support' && u.rarity === 'rare');
    if (!support) continue;
    issues.check(scripted.has(support.id) || unlockAges.has(age), `capsules.script`, `"${support.id}" (the ${age} Support Rare) never arrives (A3)`);
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
  issues.check(nodes.length === 60 || nodes.length === 70, 'trophyRoad', `60 nodes (A6.3; 70 with the X0 extension to 5,000), found ${nodes.length}`);
  nodes.forEach((n, i) => {
    const p = `trophyRoad.${n.trophies}`;
    issues.check(n.index === i, p, 'index follows road order');
    issues.check(n.trophies === (i < 40 ? 50 * (i + 1) : 2000 + 100 * (i - 39)), p, 'every 50 to 2,000, then every 100 to 4,000 (5,000 with X0)');
    issues.check(n.rewards.length > 0, p, 'a node gives something');
    for (const r of n.rewards) {
      if (r.kind === 'amber') issues.check(r.amount === roadAmber(c.trophyRoad, n.trophies), p, 'Amber = 100 + 20 × trophies / 100');
      if (r.kind === 'power') {
        const pw = c.powers[r.card];
        issues.check(pw !== undefined && pw.road === n.trophies, p, `"${r.card}" names another road node (A2.9.8)`);
        if (n.trophies <= 500) issues.check(pw?.source === 'road', p, `"${r.card}" is not a Trophy Road power (A2.9.8)`);
        else issues.check(pw?.source === 'warPath', p, `"${r.card}" is not a War Path power (the fallback items, A2.9.8)`);
      }
      if (r.kind === 'gate') issues.check(list[r.arena - 1]?.trophies === n.trophies, p, `gate ${r.arena} sits at its arena's trophies`);
    }
  });
  for (const a of list.slice(1)) {
    const gates = nodes.filter((n) => n.rewards.some((r) => r.kind === 'gate' && r.arena === a.index));
    issues.check(gates.length === 1, `arenas.${a.id}`, 'each arena after the first has one gate node');
  }
  // An unreleased power's road node is gated out at compile time (`gate.ts`).
  const roadPowers = Object.values(c.powers).filter((p) => p.road !== undefined && isReleased(c, p.id)).map((p) => p.id);
  for (const pw of roadPowers) {
    const n = nodes.filter((x) => x.rewards.some((r) => r.kind === 'power' && r.card === pw)).length;
    issues.check(n === 1, 'trophyRoad', `one node gives "${pw}", found ${n}`);
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
  issues.check(cos.titles.length === 21 && cos.emotes.length === 6, 'cosmetics', '13 titles, 4 collection titles, 4 feat titles and 6 emotes (A5.8, A15.10)');
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
  checkForts(issues, c);
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
