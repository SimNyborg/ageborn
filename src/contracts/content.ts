/**
 * Content definitions: units, turrets, powers, ages, formats, economy, skins
 * and the compiled content bundle (DESIGN B15 `content.ts`, B4, A5).
 *
 * Content is data: balance changes touch numbers, not rules (CLAUDE.md, DESIGN B4).
 * Tables live in `src/content/raw` (WP0) and are compiled by `src/content/compile.ts` (WP1).
 */
import type {
  AgeId,
  CardId,
  DmgType,
  EffectId,
  FormatId,
  MusicCueId,
  Rarity,
  RoleGroup,
  Role,
  SkinId,
  SkinRarity,
  SoundId,
  Tag,
  VisualId,
} from './ids';

/**
 * One damage modifier. The first mod in an attack's ordered list whose tag the target has
 * applies; otherwise ×1.0 (DESIGN A2.6).
 */
export interface DamageMod {
  vs: Tag;
  /** Multiplier in basis points (10,000 = ×1.0). */
  bp: number;
}

/** Target priority classes (DESIGN A2.7 Targeting). Default is `front`. */
export type TargetPriority = 'front' | 'armored' | 'backline' | 'air' | 'densest';

/** Status effect kinds (DESIGN A2.7 Status effects). */
export type StatusKind = 'stun' | 'slow' | 'mark' | 'shield' | 'regen' | 'damageBuff' | 'speedBuff' | 'attackSpeedBuff';

/**
 * A status to apply. Reapplying sets magnitude and expiry to the max of old and new (DESIGN A2.7).
 * `amount` carries shield pools and regen totals; `frozen` marks Time Stop stuns (visual flag only).
 */
export interface StatusApply {
  kind: StatusKind;
  magnitudeBp: number;
  durationMs: number;
  amount?: number;
  frozen?: boolean;
}

/**
 * One attack of a unit or turret (DESIGN A2.7 Attack cycle, A2.6 area rules, A5 tables, A14.2).
 *
 * - `windupPct` defaults: 40 melee, 50 ranged, 0 turret (A2.7).
 * - Every attack states `hitsGround` and `hitsAir` explicitly; melee never hits air (A2.6).
 * - Area counts (pierce, cleave, chain, maxTargets) include the primary target (A2.6).
 * - `maxTargets` defaults to `economy.areaMaxTargets` for area attacks (A2.6).
 * - `vsBaseDamage` replaces `damage` against bases (A2.7, Battering Ram).
 */
export interface AttackDef {
  damage: number;
  intervalMs: number;
  /** Default 40 melee / 50 ranged / 0 turret (DESIGN A2.7). */
  windupPct?: number;
  range: number;
  minRange?: number;
  hitsGround: boolean;
  hitsAir: boolean;
  /** Travelling projectile, or an instant effect that impacts on the next tick (DESIGN A2.7 Projectiles). */
  projectile?: { speed: number; arc?: boolean; visualId: VisualId } | { instant: true; effectId: EffectId };
  dmgType: DmgType;
  sfx: SoundId;
  splashRadius?: number;
  /** Counts include the primary target (DESIGN A2.6). */
  pierce?: { count: number; length: number };
  cleave?: { count: number; reach: number };
  chain?: { count: number; hop: number };
  line?: { fromGate: number };
  gateZone?: { radius: number };
  followBehind?: number;
  volley?: number;
  scatter?: number;
  /** Area default: `economy.areaMaxTargets` (DESIGN A2.6). */
  maxTargets?: number;
  mods?: DamageMod[];
  vsBaseDamage?: number;
  priority?: TargetPriority;
  onHit?: StatusApply[];
  drag?: { distance: number };
  pull?: { radius: number; fractionBp: number };
}

/** Unit abilities and traits (DESIGN A2.7, A5.2-A5.6). */
export type AbilityDef =
  /** First hit of each engagement (after ≥ 2 s idle); negative knockback pulls (DESIGN A2.7, A5.4 Corsair). */
  | { kind: 'firstHitBonus'; multBp: number; knockback: number; idleResetMs: number }
  /** Auras never stack; the strongest applies (DESIGN A2.7). */
  | { kind: 'aura'; radius: number; status: StatusApply }
  /** Heal pulses on a shared 10-tick grid; a unit takes only its largest heal per pulse (DESIGN A2.7 Heal). */
  | { kind: 'heal'; hpPerSec: number; radius: number; targets: number; pulseMs: number }
  | { kind: 'pounce'; searchRange: number; cooldownMs: number; leapMs: number; firstBiteBp: number }
  | { kind: 'riders'; count: number; attack: AttackDef; onDeathSpawn: CardId }
  | { kind: 'onDeathExplode'; damage: number; radius: number }
  | { kind: 'periodicShieldAura'; everyMs: number; radius: number; maxTargets: number; shield: number; durationMs: number }
  | { kind: 'callStrike'; everyMs: number; searchRange: number; delayMs: number; damage: number; radius: number; sideLockoutMs: number }
  | { kind: 'emp'; everyMs: number; triggerRadius: number; radius: number; stunMs: number }
  | { kind: 'timeStop'; everyMs: number; radius: number; freezeMs: number; legendaryFreezeMs: number }
  | { kind: 'innateShield'; amount: number; regenPerSec: number; delayMs: number }
  /** Shield Wall: less damage from attacks with range ≥ `minSourceRange` (DESIGN A5.3 Footman). */
  | { kind: 'resist'; minSourceRange: number; bp: number }
  /** Immune to knockback and to first-hit bonuses (DESIGN A2.7). */
  | { kind: 'brace' }
  /** Targets the base; attacks units only while blocked (DESIGN A5.3 Battering Ram). */
  | { kind: 'siegeOnly' }
  /** Never stops, ignores Hold, drops bombs within ±dropWindow (DESIGN A2.7 Air units). */
  | { kind: 'bomber'; dropWindow: number }
  /** Stays `behindFront` lu behind the frontmost non-follower; alone, at most p = soloMaxP (DESIGN A2.7). */
  | { kind: 'followSupport'; behindFront: number; soloMaxP: number };

/** A unit card (DESIGN A5.1-A5.6). Level scaling applies to HP, damage, heals and shields only (A5.1). */
export interface UnitDef {
  id: CardId;
  kind: 'unit';
  age: AgeId;
  rarity: Rarity;
  role: Role;
  group: RoleGroup;
  cost: number;
  trainMs: number;
  pop: number;
  hp: number;
  speed: number;
  /** Collision widths: small 24, medium 32, large 48, huge 80 lu (DESIGN A2.7). */
  size: 'small' | 'medium' | 'large' | 'huge';
  tags: Tag[];
  /** Only index 0 stops movement (DESIGN A2.7). */
  attacks: AttackDef[];
  abilities: AbilityDef[];
  visualId: VisualId;
  sfx: { spawn: SoundId; die: SoundId };
  nameKey: string;
  descKey: string;
  /** Derived from the counter matrix (DESIGN B4). */
  strongVs: CardId[];
  weakVs: CardId[];
  /** Hidden, non-collectable cards such as the Training Dummy (DESIGN A5.6). */
  hidden?: boolean;
}

/** A turret card. No Legendary turrets in v1 (DESIGN A2.8). Turrets are invulnerable and never target bases. */
export interface TurretDef {
  id: CardId;
  kind: 'turret';
  age: AgeId;
  rarity: Exclude<Rarity, 'legendary'>;
  cost: number;
  attack: AttackDef;
  visualId: VisualId;
  nameKey: string;
  descKey: string;
}

/** Age Power effects (DESIGN A2.9, A5.7). Powers hit units only, never bases or turrets. */
export type PowerEffect =
  /** Impact i lands at telegraphEnd + floor(i × durationTicks / count) (DESIGN A2.9 Barrage sequencing). */
  | {
      kind: 'barrage';
      count: number;
      durationMs: number;
      zone: number;
      damage: number;
      radius: number;
      jitter: number;
      hitsAir: boolean;
      pattern: 'even' | 'line';
    }
  | { kind: 'sweep'; zone: number; durationMs: number; damage: number; width: number; hitsAir: boolean }
  | {
      kind: 'stampede';
      runners: number;
      spacingMs: number;
      distance: number;
      speed: number;
      damage: number;
      knockback: number;
      maxHitsPerEnemy: number;
    }
  | { kind: 'buffAll'; statuses: StatusApply[] }
  | { kind: 'cloud'; width: number; durationMs: number; enemyMissBp: number; allyDamageBp: number }
  | { kind: 'paradrop'; card: CardId; count: number; beyondFront: number; fallbackP: number };

/** An Age Power (DESIGN A2.9, A5.7). Every power has a 1.0 s telegraph visible to both sides. */
export interface PowerDef {
  id: CardId;
  kind: 'power';
  age: AgeId;
  slot: 'default' | 'alternate';
  telegraphMs: number;
  effect: PowerEffect;
  visualId: VisualId;
  sfx: SoundId;
  nameKey: string;
  descKey: string;
}

/** An age (DESIGN A2.2, A2.4). Base max HP = 10,000 × P. `xpToNext` is null in the last age. */
export interface AgeDef {
  id: AgeId;
  index: number;
  /** Age power scale P in bp (DESIGN A2.2). */
  pBp: number;
  baseHp: number;
  xpToNext: number | null;
  paletteId: string;
  baseVisualId: VisualId;
  backdropVisualId: VisualId;
  musicCue: MusicCueId;
}

/** A match format (DESIGN A2.10). Null timers mean "none" (Tutorial). */
export interface FormatDef {
  id: FormatId;
  ages: AgeId[];
  overdriveMs: number | null;
  siegeMs: number | null;
  finalBellMs: number | null;
  retreatAfterMs: number | null;
  /** Tutorial thresholds 250 / 300 / 350 / 400 (DESIGN A2.10). */
  xpToNextOverride?: number[];
}

/**
 * All in-battle economy and rule constants (DESIGN A2.3 gold, A2.4 XP, A2.7 combat, A2.8 turrets,
 * A2.9 powers, A2.10 phases, A2.11 Last Stand). Percentages are bp; see B3 for integer units.
 */
export interface EconomyRules {
  startGold: number;
  passiveGoldPerSec: number;
  passiveXpPerSec: number;
  treasuryCosts: number[];
  treasuryMilliGoldPerSecPerLevel: number;
  mountCosts: number[];
  bountyGoldBp: number;
  bountyXpBp: number;
  powerKillGoldBp: number;
  powerKillXpBp: number;
  ownLossXpBp: number;
  underdogBp: number;
  baseDamageXpPerPct: number;
  xpCapBp: number;
  popCap: number;
  popByGroup: Record<RoleGroup, number>;
  queueMax: number;
  legendaryLimit: number;
  sellRefundBp: number;
  turretRangeCap: number;
  turretBuildMs: number;
  turretSellMs: number;
  ascendMs: number;
  evolveHealBp: number;
  vanguardCount: number;
  powerChargeMs: number;
  powerCarryCapBp: number;
  overchargeXp: number;
  overchargeBp: number;
  overdrive: { baseGoldBp: number; xpBp: number; powerBp: number };
  siege: { turretDamageBp: number; baseDamageBp: number; decayBpPerSec: number };
  lastStand: { thresholdBp: number; autoBp: number; radius: number; damagePerP: number; knockback: number; chargeMs: number };
  spawnP: number;
  holdLine: number;
  holdRetreatSpeedBp: number;
  leash: number;
  spacingBp: number;
  retargetMs: number;
  retargetCloserLu: number;
  rangedSelfDefenseLu: number;
  firstHitIdleMs: number;
  stanceCooldownMs: number;
  sizes: Record<'small' | 'medium' | 'large' | 'huge', number>;
  knockbackResistBp: Record<'small' | 'medium' | 'large' | 'huge', number>;
  areaSecondaryBp: number;
  areaMaxTargets: number;
  healLegendaryBp: number;
  legendaryPowerDamageBp: number;
  powerZoneClamp: [number, number];
  emoteCooldownMs: number;
  drawGapBp: number;
  levelStepBp: number;
  maxLevel: number;
}

/** A skin (DESIGN A5.8). Target is a card or a base (`base.<age>`); visual lives in the manifest (B5). */
export interface SkinDef {
  id: SkinId;
  target: CardId | `base.${AgeId}`;
  rarity: SkinRarity;
  visualId: VisualId;
  inCratePool: boolean;
  craftable: boolean;
  sfxOverrides?: Record<string, SoundId>;
  nameKey: string;
}

/** Durations precompiled to 50 ms ticks: `max(1, round(ms / 50))` (DESIGN B3, B4 Compilation). */
export interface CompiledTicks {
  ascend: number;
  powerCharge: number;
  turretBuild: number;
  turretSell: number;
  stanceCooldown: number;
  retarget: number;
  healPulse: number;
  firstHitIdle: number;
  lastStandCharge: number;
}

/**
 * The frozen, compiled content bundle (DESIGN B4 Compilation). `hash` is FNV-1a over canonical JSON
 * and is stamped into every replay (B3).
 *
 * The meta tables (`rarities`, `capsules`, `arenas`, ...) are `unknown` here; their concrete types live
 * in `src/content/*.ts` (WP1), because `contracts` may not import `content` (DESIGN B2).
 */
export interface CompiledContent {
  hash: string;
  ages: Record<AgeId, AgeDef>;
  formats: Record<FormatId, FormatDef>;
  economy: EconomyRules;
  units: Record<CardId, UnitDef>;
  turrets: Record<CardId, TurretDef>;
  powers: Record<CardId, PowerDef>;
  skins: Record<SkinId, SkinDef>;
  rarities: unknown;
  capsules: unknown;
  arenas: unknown;
  trophyRoad: unknown;
  generals: unknown;
  names: unknown;
  quests: unknown;
  dailyModifiers: unknown;
  /** Concrete types in content/*.ts. */
  cosmetics: unknown;
  /** Counter matrix M[a][b] (DESIGN B4 Counter matrix). */
  counters: Record<CardId, Record<CardId, number>>;
  ticks: CompiledTicks;
}
