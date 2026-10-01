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
  FormatKind,
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

/**
 * Status effect kinds (DESIGN A2.7 Status effects). `slow` lowers move speed only; `snare` lowers move
 * speed and attack speed × (1 − s) (A2.9.6, power controls); both apply after the A18.2 caps.
 */
export type StatusKind = 'stun' | 'slow' | 'snare' | 'mark' | 'shield' | 'regen' | 'damageBuff' | 'speedBuff' | 'attackSpeedBuff';

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
  /**
   * A fort's hidden twin (A16.14.8): the compiler turns every wall, tower and camp `FortDef` into a hidden
   * unit with the same id (`role` and `group` `fort`, speed 0), so every `content.units[card]` lookup
   * resolves. The sim runs the fort rules on units whose card carries this.
   */
  fort?: { kind: Exclude<FortKind, 'trap'> };
  /**
   * A camp's Levy (A16.14.3): a hidden summon cloned from its age's Infantry Common with 40% HP and damage,
   * cost 0 (no pop, no bounty, no power auto-aim value). Always marches; ranks last in every power cap.
   */
  levy?: boolean;
  /** The value AI threat estimates use when `cost` is 0 (a levy: 16% of the Infantry cost). */
  aiValue?: number;
}

/** The four fort kinds (DESIGN A16.14.1). */
export type FortKind = 'wall' | 'tower' | 'camp' | 'trap';

/**
 * How a fort is owned (A16.14.6): `starter` (the 8 walls, granted when the Fort slot unlocks), `unlock`
 * (the Stone Camp, Trap and Tower, granted with the walls), `warPath` (a Bronze-to-Cosmic L4, L6 or L8 first
 * clear, with a Trophy Road fort-set fallback). Never in capsules.
 */
export type FortSource = 'starter' | 'unlock' | 'warPath';

/**
 * A Fort card (DESIGN A16.14): a stationary card placed on a pad. Walls, towers and camps also exist as a
 * hidden twin in `CompiledContent.units` (same id); traps live in `SimState.traps`. HP, damage and trap
 * damage are L1 values, scaled by the placing loadout's multiplier (no card levels, no copies, no Dust).
 */
export interface FortDef {
  id: CardId;
  kind: 'fort';
  age: AgeId;
  rarity: Exclude<Rarity, 'legendary'>;
  fortKind: FortKind;
  source: FortSource;
  /** The Trophy Road node of its fort set (the fallback of a War Path fort, A16.14.6). */
  road?: number;
  /** The War Path level (4, 6 or 8, in the fort's own region) whose first clear grants it. */
  warPathLevel?: number;
  /** Whole gold, flat across ages (Wall 125, Bunker 175, Trap 75, Camp and Tower 150). */
  cost: number;
  /** Pop used while alive, scaffolds included (6; a Trap 3). */
  pop: number;
  /** Max HP at L1 (0 for traps, which cannot be targeted). */
  hp: number;
  /** Collision size: towers medium, walls and camps large, traps none. */
  size: 'medium' | 'large' | null;
  /** Pads the card may use: `home` (walls, towers, traps) or `any` (camps). */
  pads: 'home' | 'any';
  /** A tower's one attack (the age's Ranged Common × 1.5 damage, range clamped by pad). */
  attack?: AttackDef;
  /** A camp: its levy card, first spawn after completion, then every `everyMs` while fewer than `maxAlive` of its levies live. */
  camp?: { spawn: CardId; everyMs: number; firstMs: number; maxAlive: number };
  /**
   * A trap: fires on an enemy ground unit whose centre comes within `triggerLu` (1 s between charges);
   * each charge hits the nearest such unit plus its area (at most `maxTargets`, secondaries 50%).
   */
  trap?: {
    charges: number;
    triggerLu: number;
    betweenMs: number;
    armMs: number;
    lifeMs: number;
    damage: number;
    radius: number;
    maxTargets: number;
    statuses: StatusApply[];
  };
  /** Sandbag Bunker: own ground units within `behindLu` behind it take `rangedTakenBp` less from attacks with range ≥ 100. */
  cover?: { behindLu: number; rangedTakenBp: number };
  /** Hardlight Barrier: `bpPerSec` of max HP per second after `delayMs` without damage, until its decay starts. */
  regen?: { bpPerSec: number; delayMs: number };
  visualId: VisualId;
  sfx: { place: SoundId; complete: SoundId; die: SoundId };
  nameKey: string;
  descKey: string;
  /** Per-age class hints (A16.14.1 kind rows). */
  strongVs: CardId[];
  weakVs: CardId[];
}

/**
 * The fort rules (DESIGN A16.14.2, spec section 13), in table units. Positions are own-frame p (lu from
 * the own gate). Optional in `EconomyRules` so content that predates forts still compiles (no forts).
 */
export interface FortEconomyRules {
  /** Pads, own-frame p in lu: the first `homePads` are Home pads (inside turret cover), the rest Field pads. */
  pads: number[];
  homePads: number;
  /** A pad is illegal while an enemy ground unit's centre is within this many lu. */
  padClearLu: number;
  /** A Field pad needs the own front at rank `fieldFrontRank` at p ≥ pad + this. */
  fieldBehindLu: number;
  fieldFrontRank: number;
  /** At most this many forts alive per side (scaffolds and traps count), camps and towers separately. */
  maxAlive: number;
  maxCamps: number;
  maxTowers: number;
  /** The shared slot recharge after each placement, and the first ready time (ms from match start). */
  rechargeMs: number;
  firstReadyMs: number;
  /** A new fort is a scaffold for this long at `scaffoldHpBp` of its max HP. */
  scaffoldMs: number;
  scaffoldHpBp: number;
  /** Safe pads (AI and Key D): the nearest enemy needs scaffold time + this to arrive. */
  safeMarginMs: number;
  /** Decay: from this long after completion, `decayBpPerSec` of max HP per second; in Siege `siegeDecayBp` (×2 = 2%/s). */
  decayStartMs: number;
  decayBpPerSec: number;
  siegeDecayBp: number;
  /** A decaying fort counts as destroyed by an enemy that hit it within this long. */
  decayCreditMs: number;
  /** Damage taken ×2 in Siege; ×0.5 from other attacks with compiled range ≥ `rangedMinLu`; ×2 structure mod. */
  siegeTakenBp: number;
  rangedTakenBp: number;
  rangedMinLu: number;
  structureBp: number;
  /** Bounty paid for a destroyed fort, bp of its cost (the unit rates). */
  bountyGoldBp: number;
  bountyXpBp: number;
  /** A tower's far reach never passes this own-frame p (= `turretRangeHardCapLu`). */
  towerReachMaxP: number;
  /** Contact rule: up to `contactMax` blocked enemies within `contactLu` behind the blocked front may attack a fort. */
  contactLu: number;
  contactMax: number;
  /** Kind stats from the age baselines (A16.14.3): HP bp of the Heavy Common, tower damage bp of the Ranged Common. */
  wallHpBp: number;
  towerHpBp: number;
  campHpBp: number;
  towerDamageBp: number;
  /** Levies: HP and damage bp of the Infantry Common; `aiValueBp` of its cost. */
  levyHpBp: number;
  levyDamageBp: number;
  levyAiValueBp: number;
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

/**
 * Age Power effects (DESIGN A2.9, A5.7). Powers hit units only, never bases, turrets or forts. Every
 * damaging or controlling effect is bounded by `PowerDef.maxTargets` and the screen (A2.9.5).
 */
export type PowerEffect =
  /**
   * Impact i lands at telegraphEnd + floor(i × durationTicks / count) (DESIGN A2.9.6 Barrage sequencing).
   * `hitsGround` defaults to true; false = air only (Flak).
   */
  | {
      kind: 'barrage';
      count: number;
      durationMs: number;
      zone: number;
      damage: number;
      radius: number;
      jitter: number;
      hitsAir: boolean;
      hitsGround?: boolean;
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
  /** Own units: at most `maxTargets` (8) of the caster's frontmost units (A2.9.5). */
  | { kind: 'buffAll'; statuses: StatusApply[]; maxTargets: number }
  | { kind: 'cloud'; width: number; durationMs: number; enemyMissBp: number; allyDamageBp: number }
  | { kind: 'paradrop'; card: CardId; count: number; beyondFront: number; fallbackP: number }
  /**
   * A ground field (A2.9.7): pulse k lands at telegraphEnd + 10k ticks, max(1, durationMs ÷ 500) pulses.
   * Each pulse hits the eligible enemies whose centre is within zone / 2 of the cast centre: damage,
   * then statuses; the first pulse also pulls `pullBp` of the distance to the centre. Hits ground
   * units always and air units when `hitsAir`.
   */
  | { kind: 'field'; zone: number; durationMs: number; hitsAir: boolean; statuses?: StatusApply[]; damagePerPulse?: number; pullBp?: number }
  /** A homing strike on one locked target (A2.9.7): shot i lands at telegraphEnd + i × interval. */
  | { kind: 'strike'; shots: number; intervalMs: number; damage: number; hitsAir: boolean }
  /** Every enemy mount starts no turret attack for `durationMs` (A2.9.7). No damage. */
  | { kind: 'suppress'; durationMs: number };

/** The two typed power slots of an age loadout (DESIGN A2.9.1); index 0 is Home, 1 Field in per-slot arrays. */
export type PowerSlot = 'home' | 'field';

/**
 * Where a power may act (DESIGN A2.9.4): `home` your half, `front` near your army, `anywhere` the whole
 * lane (strikes and drops only), `army` your own units (no aim).
 */
export type PowerReach = 'home' | 'front' | 'anywhere' | 'army';

/** Power families (DESIGN A5.7 role template); each has its own budget (A2.9.6). */
export type PowerFamily =
  | 'bombard'
  | 'sweep'
  | 'snare'
  | 'pull'
  | 'stun'
  | 'flak'
  | 'charge'
  | 'frontBarrage'
  | 'strike'
  | 'suppress'
  | 'rally'
  | 'ward'
  | 'mend'
  | 'cloud'
  | 'drop';

/** Power rarity marks the source and the specialisation, never raw power (A3 sidegrades). */
export type PowerRarity = 'common' | 'rare' | 'epic';

/** How a power is owned (DESIGN A2.9.8): the starter kit, a Trophy Road node, or a War Path first clear. */
export type PowerSource = 'starter' | 'road' | 'warPath';

/** An Age Power (DESIGN A2.9, A5.7). */
export interface PowerDef {
  id: CardId;
  kind: 'power';
  age: AgeId;
  /** The loadout slot this power fits (A2.9.1). */
  slot: PowerSlot;
  reach: PowerReach;
  family: PowerFamily;
  rarity: PowerRarity;
  source: PowerSource;
  /**
   * Trophy Road node that grants it: the node of a Road power, the fallback node of a War Path power
   * (A2.9.8). Absent for starters.
   */
  road?: number;
  /** War Path level (in the power's own region, `age`) whose first clear grants it (A2.9.8). */
  warPathLevel?: number;
  /** Whole gold per cast, flat across ages (A2.9.2). */
  cost: number;
  /** Reload after a cast, ms (A2.9.3). */
  reloadMs: number;
  /** Telegraph visible to both sides, ms: 0.5-2.0 s by family (A2.9.6). */
  telegraphMs: number;
  /**
   * The cap (A2.9.5): the most distinct enemy units one cast affects (1-6) for damaging and controlling
   * effects; the most own units for buffs (8) and the cloud's ally bonus (8). Required for barrage,
   * sweep, stampede, field and buffAll.
   */
  maxTargets?: number;
  /** AI value weight of controls and buffs, bp of the affected card cost (A2.9.9). */
  aiValueBp?: number;
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

/**
 * A match format: a window of consecutive ages with its clocks (DESIGN A2.10, A18.3.4). Null timers
 * mean "none" (Tutorial). `xpToNextOverride` holds the thresholds by position in the window (A18.3.2).
 */
export interface FormatDef {
  id: FormatId;
  /** The family (rewards, labels): tutorial, short (3 ages), standard (5), full (7) or a shorter window. */
  kind?: FormatKind;
  ages: AgeId[];
  overdriveMs: number | null;
  siegeMs: number | null;
  finalBellMs: number | null;
  retreatAfterMs: number | null;
  /** XP to leave each position of the window (A18.3.2: 700, 1,250, 1,350, ...; tutorial 610 / 580 / 390 / 900). */
  xpToNextOverride?: number[];
  /**
   * Last Base Standing (A2.10.1): the Siege steps of a war with no Final Bell, in time order. The first
   * entry is Siege I and starts at `siegeMs`; `finalBellMs` is then null. In a format with steps the
   * symmetric Siege decay is off, and base and turret damage in Siege read the current step's values.
   * A step with `crumbleBpPerSec` > 0 runs the Crumble rope. Absent in every timed format.
   */
  escalation?: EscalationStep[];
  /**
   * The latest end of a format with escalation (A2.10.1): by this time a base has fallen, whatever the
   * players do (derived from the steps by a content test; the online relay caps a room at this + 2 min).
   */
  endByMs?: number;
}

/** One Siege step of Last Base Standing (A2.10.1). Multipliers in bp (10,000 = ×1). */
export interface EscalationStep {
  atMs: number;
  /** Base damage from attacks in this step (Siege I 20,000 = ×2, as `economy.siege.baseDamageBp`). */
  baseDamageBp: number;
  /** Turret and field tower damage in this step (Siege I 5,000 = ×0.5). */
  turretDamageBp: number;
  /** The Crumble rope: bp of base max HP per second on the side whose half holds the fight (0 = none). */
  crumbleBpPerSec: number;
}

/**
 * All in-battle economy and rule constants (DESIGN A2.3 gold, A2.4 XP, A2.7 combat, A2.8 turrets,
 * A2.9 powers, A2.10 phases, A2.11 Last Stand). Percentages are bp; see B3 for integer units.
 */
export interface EconomyRules {
  startGold: number;
  passiveGoldPerSec: number;
  passiveXpPerSec: number;
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
  /** Range cap on a turret card, lu from the own gate (A2.8: 480). */
  turretRangeCap: number;
  /** Hard cap on turret range with research, relics and modifiers, lu from the own gate (A18.2: 560). */
  turretRangeHardCapLu: number;
  turretBuildMs: number;
  turretSellMs: number;
  ascendMs: number;
  evolveHealBp: number;
  vanguardCount: number;
  /** Each power slot's progress at an evolve becomes min(progress, this) (A2.9.3: 7,500). */
  powerCarryCapBp: number;
  overchargeXp: number;
  overchargeBp: number;
  /** `powerBp` scales power reload in Overdrive and Siege (A2.9.3: 10,000, no bonus; a lever). */
  overdrive: { baseGoldBp: number; xpBp: number; powerBp: number };
  /** Age Power rules and data levers (DESIGN A2.9.3-A2.9.6). */
  power: PowerEconomyRules;
  /** The Fort class (DESIGN A16.14); absent in content that predates forts (no fort can be placed). */
  fort?: FortEconomyRules;
  /**
   * Siege (A2.10). `moveSpeedBp` is the forced march (A17.3: unit movement ×1.2 while in Siege);
   * `gateCrowdLu` the siege crowd (A16.4 step 2): in Siege a unit may stand level with the ally ahead of it
   * once that ally is within this distance of the enemy gate, so an army at the gate hits the base with
   * every unit instead of queuing in single file (0 = off).
   */
  siege: {
    turretDamageBp: number;
    baseDamageBp: number;
    decayBpPerSec: number;
    moveSpeedBp: number;
    gateCrowdLu: number;
    /**
     * The Crumble rope's dead band (A2.10.1: 40 lu): when the two fronts are within this distance both
     * sides crumble; otherwise only the side behind. Absent in content that predates Last Base Standing.
     */
    ropeDeadBandLu?: number;
  };
  /**
   * The falling gate (A16.4 stall fix, A17 step 1): in Overdrive and Siege, a unit killed by an enemy
   * unit, turret or ability within `lu` of its own gate costs its base `hpBp` of the unit's max HP (as
   * base damage from the killer: Siege's base damage applies and the killer earns base-damage XP).
   * Spawn-camping a beaten side ends the match instead of feeding it bounties. Missing or `lu` 0 = off.
   */
  gateFall?: { lu: number; hpBp: number };
  /**
   * The open gate (A16.4 stall fix, A17 step 1): while a side has no living ground unit within
   * `clearLu` of its own gate, attackers close up at that gate as in the siege crowd
   * (`siege.gateCrowdLu`) in every phase, so an unopposed army hits the base with every unit.
   * Missing or 0 = off.
   */
  openGateLu?: number;
  /** Unit walking speed multiplier applied once at compile time (A17.2: 12,500 = ×1.25). */
  marchSpeedBp: number;
  /** Units per side that may fight side by side at the front before the single file starts (A2.7; A16.4 L4: 3). */
  frontWidth: number;
  lastStand: { thresholdBp: number; autoBp: number; radius: number; damagePerP: number; knockback: number; chargeMs: number };
  spawnP: number;
  holdLine: number;
  holdRetreatSpeedBp: number;
  leash: number;
  spacingBp: number;
  retargetMs: number;
  retargetCloserLu: number;
  rangedSelfDefenseLu: number;
  /**
   * Engagement freshness (A18.4.2): a unit is fresh after this long with no target in range; a fresh
   * unit's next hit is the first hit of an engagement (4,000 from A18; 2,000 before, "without attacking").
   */
  firstHitIdleMs: number;
  /** A stance change is accepted at most once per this long (A18.4.2: 3,000). */
  stanceCooldownMs: number;
  /** The Hold flag (A18.4.2): default p, allowed range [min, max] in lu, snap step, flag move cooldown. */
  holdFlag: { minP: number; maxP: number; snapLu: number; moveCooldownMs: number };
  /** Fall back (A18.4.2): units with no target walk back to this p (lu) and hold there. */
  fallbackP: number;
  /**
   * Hard stacking caps (A18.2 rule 4), all sources summed in bp: damage dealt, damage taken (a floor:
   * no unit takes less than 100% − `takenBp` of a hit), max HP, attack speed, move speed, unit range (lu).
   */
  statCaps: { damageBp: number; takenBp: number; hpBp: number; attackSpeedBp: number; speedBp: number; rangeLu: number };
  sizes: Record<'small' | 'medium' | 'large' | 'huge', number>;
  knockbackResistBp: Record<'small' | 'medium' | 'large' | 'huge', number>;
  areaSecondaryBp: number;
  areaMaxTargets: number;
  healLegendaryBp: number;
  legendaryPowerDamageBp: number;
  /** The lane clamp of every power aim, p in lu (A2.1: [150, 1,850]). */
  powerZoneClamp: [number, number];
  emoteCooldownMs: number;
  drawGapBp: number;
  levelStepBp: number;
  maxLevel: number;
}

/** Age Power rules and data levers (DESIGN A2.9.3-A2.9.6, A2.9.12 levers). Positions in lu. */
export interface PowerEconomyRules {
  /** Every slot's progress at match start, bp (2,500). */
  startBp: number;
  /** Reload of an empty slot, which still accrues and carries (40,000 ms). */
  emptyReloadMs: number;
  /** The Home line: Home powers touch only enemies with own-frame p ≤ this (1,000, inclusive). */
  homeLineP: number;
  /** Front reach beyond the front F (150). */
  frontReachLu: number;
  /** F never counts below this for Front reach (480, the turret cover edge). */
  frontFloorP: number;
  /** F is the p of the `frontRank`-th frontmost trained ground unit (1; lever 2). */
  frontRank: number;
  /** A manual strike picks among eligible enemies within this of the aim (80). */
  strikePickLu: number;
  /** Epics take this share of strike damage (5,000). */
  strikeEpicBp: number;
  /** Legendaries take this share of a power's stun, snare, slow and mark duration and pull distance (5,000). */
  legendaryControlBp: number;
  /** Optional shared lockout after a cast, ms (0 = off; a lever). */
  lockMs: number;
}

/** Roles with a Troops class (every role but the fort twins, A16.14.5). */
export type ResearchRole = Exclude<Role, 'fort'>;

/** The four War Council tracks (DESIGN A18.5). */
export type ResearchTrack = 'troops' | 'defences' | 'economy' | 'command';

/**
 * A Troops research line (DESIGN A18.5.2): bought per class; Epics and Legendaries count in their base
 * role's class (`ResearchRules.classOfRole`). Air and Underground lines join with their classes (A18.9).
 */
export type ResearchClass = 'infantry' | 'ranged' | 'heavy' | 'antiArmor' | 'support';

/**
 * What a research pick does (DESIGN A18.5.2-A18.5.5). Unit effects apply to own units of the pick's
 * class spawned after it completes, never to units already on the lane (A18.2 rule 2); turret, economy
 * and command effects apply at once. All sums are clamped to `economy.statCaps` (A18.2 rule 4).
 */
export type ResearchEffect =
  /** A unit stat in bp: damage dealt, max HP, move speed, attack speed, or heals and shields given. */
  | { kind: 'unitStat'; stat: 'damage' | 'hp' | 'speed' | 'attackSpeed' | 'heal'; bp: number }
  /** Unit attack range (ranged attacks only), lu. */
  | { kind: 'unitRange'; lu: number }
  /** Extra damage against targets with any of these tags (Hunters: armored). */
  | { kind: 'damageVs'; tags: Tag[]; bp: number }
  /** Mail: each hit taken −N flat, N = `ofInfantryDamageBp` of the unit's age's Infantry Common L1 damage; a hit never drops below 1. */
  | { kind: 'mail'; ofInfantryDamageBp: number }
  /** Less damage taken from attacks with range ≥ `minSourceRange` lu (Shield Wall, as the `resist` ability). */
  | { kind: 'resist'; minSourceRange: number; bp: number }
  /** Less damage taken from units of a class (Plating, Skirmish: Infantry). */
  | { kind: 'takenFrom'; from: ResearchClass; bp: number }
  /** First hit of each engagement (A18.4.2 freshness): +bp damage and knockback (lu); `whileHolding` only in Hold. */
  | { kind: 'firstHit'; bp: number; knockback: number; whileHolding?: boolean }
  /** An aura on allies within `radius` lu (never stacking with itself): attack speed or less damage taken; `behindOnly` = allies behind the source. */
  | { kind: 'aura'; radius: number; stat: 'attackSpeed' | 'guard'; bp: number; behindOnly?: boolean }
  /** Own turrets, at once: range (lu, hard cap `turretRangeHardCapLu`), attack speed or damage (bp). */
  | { kind: 'turret'; stat: 'range' | 'attackSpeed' | 'damage'; value: number }
  /** Modernise price × `priceBp` and build time `buildMs` (Engineers). */
  | { kind: 'modernise'; priceBp: number; buildMs: number }
  /** Fort scaffolds complete in `ms` instead of `economy.fort.scaffoldMs` (Engineers, A16.14.5). */
  | { kind: 'fortScaffold'; ms: number }
  /** Economy income, milli-gold per second; never doubled by Overdrive (A18.5.4). */
  | { kind: 'income'; milliGoldPerSec: number }
  /** Kill bounty: `addBp` to the bounty rate, or ×(1 + `bonusBp`) for kills made in your own half (p ≤ L / 2). */
  | { kind: 'bounty'; addBp: number; bonusBp: number; ownHalfOnly: boolean }
  /** Age Power reload rate +bp (Signal Fires; rate bonuses add, A2.9.3). */
  | { kind: 'powerReload'; bp: number }
  /** Age Power price −bp (Quartermasters, v1.1; cost modifiers multiply, A2.9.2). */
  | { kind: 'powerCost'; bp: number }
  /**
   * War Horns: while Charging, own ground units +`chargeSpeedBp` speed; while Holding with the flag at
   * p ≤ `flagMaxP`, own units within `nearLu` of the flag deal +`holdDamageBp` damage.
   */
  | { kind: 'warHorns'; chargeSpeedBp: number; holdDamageBp: number; flagMaxP: number; nearLu: number };

/** How the AI reads a pick (A18.5.8 tiers II-IV pick by hint; higher tiers score counters). */
export type ResearchAiHint = 'opener' | 'vsSwarm' | 'vsHeavy' | 'vsRanged' | 'defend' | 'push' | 'busy' | 'quiet' | 'power';

/** One research pick: 1 of 2 at a rank of a track (and class line for Troops) (DESIGN A18.5). */
export interface ResearchPickDef {
  /** Stable id, e.g. `economy.granary`, `troops.infantry.mail`. */
  id: string;
  track: ResearchTrack;
  /** The class line for Troops; null for the other tracks. */
  group: ResearchClass | null;
  rank: 1 | 2 | 3;
  /** 0 = pick A, 1 = pick B; the two picks of a rank exclude each other. */
  pick: 0 | 1;
  effects: ResearchEffect[];
  aiHint: ResearchAiHint;
  /**
   * Badge art (A18.5.7; per-age looks later through the manifest). Optional until WP4 draws the
   * Council badges (docs/requests/wp4-council-badges.md): Troops picks use their class icon, the
   * others have none yet and the HUD shows the track's own mark.
   */
  visualId?: VisualId;
  nameKey: string;
  descKey: string;
}

/** The War Council tables (DESIGN A18.5.1): picks, prices, times and the rules around them. */
export interface ResearchRules {
  picks: ResearchPickDef[];
  /** Gold per rank (index 0 = rank I) per track. */
  cost: Record<ResearchTrack, number[]>;
  /** Research time per rank, ms (10 / 14 / 18 s). */
  timeMs: number[];
  /** Cancel refunds this share of the price paid (75%). */
  cancelRefundBp: number;
  /** −20% for a side behind in age position or 20+ points of base HP when it starts research. */
  underdog: { discountBp: number; baseGapBp: number };
  /**
   * Window position (0-based) at which each rank unlocks, by window length (key: length as a string);
   * a missing rank never unlocks in that window (A18.5.1 table). Lengths without a row use the longest
   * row not longer than them.
   */
  unlockAt: Record<string, number[]>;
  /**
   * The Troops class of each card role (Epics and Legendaries count in their base role's class). Fort twins
   * (`fort`) have no class: no research of any track touches forts or towers (A16.14.5).
   */
  classOfRole: Record<ResearchRole, ResearchClass>;
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
  /**
   * Fort cards (DESIGN A16.14): walls, towers, camps and traps. Walls, towers and camps also have a hidden
   * twin in `units` under the same id. Content that predates forts has an empty record.
   */
  forts: Record<CardId, FortDef>;
  skins: Record<SkinId, SkinDef>;
  /** The War Council (DESIGN A18.5). */
  research: ResearchRules;
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
