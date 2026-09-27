/**
 * Counter duels (DESIGN B4 Counter matrix): equal-gold 1v1 group duels of two unit cards at L1 on a
 * flat lane (no bases, turrets, powers or phases).
 *
 * This is a compact, deterministic duel model that follows the A2.7 combat rules closely enough to
 * rank matchups for the bot's f_counter term (A7.2) and the "Strong vs" / "Weak vs" hints (A2.6).
 * It is NOT the battle simulation: balance is judged only by the real sim (A2.14, B12). When the sim
 * offers a duel harness the generator can switch engines (see docs/requests/wp1-counter-duel-harness.md).
 *
 * Duel-only simplifications (kept deliberately small):
 * - No bases: a unit with nothing in range walks toward the nearest enemy its first attack can hit
 *   (either direction), else forward; so air units and the ground units they fly over keep fighting.
 * - The bomber hovers over the nearest ground enemy instead of flying on to the enemy gate.
 * - Targets are re-picked at every attack start by the A2.7 priority classes (no 1 s stickiness).
 * - Everything is at L1, both sides always Charge, and no RNG is involved.
 *
 * Integer units as in B3: milli-lu positions, centi-HP, ticks of 50 ms, bp multipliers.
 * Bump {@link DUEL_ENGINE_VERSION} whenever a rule here changes, so `counters.json` reads as stale.
 */
import type { AbilityDef, AttackDef, EconomyRules, StatusApply, UnitDef } from '@/contracts/content';
import type { CardId, Tag } from '@/contracts/ids';
import { BP, CENTI, MILLI, TICK_MS, msToTicks } from '@/core/fixed';
import type { RawBattleRules } from '../raw/types';

/** Bump when the duel rules change (the counter file then reads as stale). */
export const DUEL_ENGINE_VERSION = 1;

/** Duel setup constants: equal-gold budgets and time limits. */
export const DUEL_RULES = {
  /** Both sides spend between these amounts of gold. */
  budgetMin: 450,
  budgetMax: 1100,
  /** Preferred army value (a typical mid-game clash). */
  budgetTarget: 700,
  maxCount: 30,
  /** 90 s. */
  maxTicks: 1800,
  /** A duel with no movement, attack or damage for 10 s is over. */
  idleTicks: 200,
} as const;

/** Duel result for one side assignment. */
export interface DuelOutcome {
  /** HP left on each side as a share of that side's starting HP, bp (summons count, capped at 10,000). */
  hpLeftBp: [number, number];
  ticks: number;
}

/** Everything a duel reads from content. */
export interface DuelContent {
  units: Record<CardId, UnitDef>;
  economy: EconomyRules;
  battle: RawBattleRules;
}

/**
 * Unit counts that make both armies cost (nearly) the same: both budgets in
 * [budgetMin, budgetMax], smallest relative gold gap first, then closest to budgetTarget, then fewest units.
 */
export function duelCounts(costA: number, costB: number): [number, number] {
  let best: [number, number] = [1, 1];
  let bestKey: [number, number, number] = [Number.MAX_SAFE_INTEGER, 0, 0];
  for (let na = 1; na <= DUEL_RULES.maxCount; na += 1) {
    const ga = na * costA;
    if (ga < DUEL_RULES.budgetMin || ga > DUEL_RULES.budgetMax) continue;
    for (let nb = 1; nb <= DUEL_RULES.maxCount; nb += 1) {
      const gb = nb * costB;
      if (gb < DUEL_RULES.budgetMin || gb > DUEL_RULES.budgetMax) continue;
      const gapBp = Math.trunc((Math.abs(ga - gb) * BP) / Math.max(ga, gb));
      const offTarget = Math.abs(ga + gb - 2 * DUEL_RULES.budgetTarget);
      const key: [number, number, number] = [gapBp, offTarget, na + nb];
      if (key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
        bestKey = key;
        best = [na, nb];
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------------------------

const LANE = 1200 * MILLI;
const NO_TICK = -1;

interface AttackRt {
  def: AttackDef;
  baseInterval: number;
  windupPct: number;
  /** Secondary attacks (index > 0, riders) never stop movement (A2.7). */
  primary: boolean;
  nextTick: number;
  impactTick: number;
  targetId: number;
  firstHitMultBp: number;
  knockback: number;
  biteBp: number;
}

interface Fighter {
  id: number;
  side: 0 | 1;
  def: UnitDef;
  x: number;
  w: number;
  hp: number;
  maxHp: number;
  speed: number;
  air: boolean;
  alive: boolean;
  summoned: boolean;
  attacks: AttackRt[];
  maxRange: number;
  follower: { behind: number; soloMax: number } | null;
  resist: { minRange: number; bp: number } | null;
  brace: boolean;
  knockResistBp: number;
  shield: number;
  shieldUntil: number;
  innate: number;
  innateMax: number;
  innateRegenPerTick: number;
  innateDelay: number;
  lastDamagedTick: number;
  stunUntil: number;
  slowBp: number;
  slowUntil: number;
  markBp: number;
  markUntil: number;
  auraAttackSpeedBp: number;
  lastAttackStart: number;
  firstHit: { multBp: number; knockback: number; idleTicks: number } | null;
  abilityNext: number[];
  leapUntil: number;
  leapTargetId: number;
  leapTargetX: number;
}

interface Impact {
  tick: number;
  side: 0 | 1;
  def: AttackDef;
  targetId: number;
  /** Centre of a splash, fixed at fire time (A2.7 Projectiles). */
  aimX: number | null;
  firstHitMultBp: number;
  knockback: number;
  biteBp: number;
}

interface Knock {
  target: Fighter;
  /** Lu; negative pulls toward the attacker. */
  amount: number;
  /** +1 or −1: the direction away from the attacker, in world x. */
  away: 1 | -1;
}

function hasTag(f: Fighter, tag: Tag): boolean {
  return f.def.tags.includes(tag);
}

function edge(a: Fighter, b: Fighter): number {
  return Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2);
}

function facing(f: Fighter): 1 | -1 {
  return f.side === 0 ? 1 : -1;
}

function canHit(def: AttackDef, t: Fighter): boolean {
  return t.air ? def.hitsAir : def.hitsGround;
}

function applyBp(v: number, bp: number): number {
  return Math.trunc((v * bp) / BP);
}

// ---------------------------------------------------------------------------------------------
// The duel
// ---------------------------------------------------------------------------------------------

/** Runs one duel: `countL` × `left` on side 0 against `countR` × `right` on side 1. */
export function runDuel(c: DuelContent, left: CardId, right: CardId, countL: number, countR: number): DuelOutcome {
  return new Duel(c).run(left, right, countL, countR);
}

class Duel {
  private fighters: Fighter[] = [];
  private nextId = 1;
  private tick = 0;
  private impacts: Impact[] = [];
  private strikeLockout: [number, number] = [0, 0];
  private active = false;
  private readonly startHp: [number, number] = [0, 0];

  constructor(private readonly c: DuelContent) {}

  run(left: CardId, right: CardId, countL: number, countR: number): DuelOutcome {
    this.place(left, 0, countL);
    this.place(right, 1, countR);
    let idle = 0;
    for (this.tick = 0; this.tick < DUEL_RULES.maxTicks; this.tick += 1) {
      this.active = false;
      this.statuses();
      this.abilities();
      this.attacks();
      this.resolveImpacts();
      this.deaths();
      this.movement();
      if (this.aliveCount(0) === 0 || this.aliveCount(1) === 0) {
        this.tick += 1;
        break;
      }
      idle = this.active ? 0 : idle + 1;
      if (idle >= DUEL_RULES.idleTicks) {
        this.tick += 1;
        break;
      }
    }
    return { hpLeftBp: [this.hpLeftBp(0), this.hpLeftBp(1)], ticks: this.tick };
  }

  // --- setup --------------------------------------------------------------------------------

  private place(card: CardId, side: 0 | 1, count: number): void {
    const def = this.c.units[card];
    if (!def) throw new Error(`duel: unknown unit "${card}"`);
    const w = this.c.economy.sizes[def.size] * MILLI;
    const gap = Math.trunc((2 * w * this.c.economy.spacingBp) / BP);
    let p = this.c.economy.spawnP * MILLI;
    for (let i = 0; i < count; i += 1) {
      // A2.7 soft single file: the first two share the front, then each keeps (wA + wB) × 0.3 behind.
      if (i >= 2) p -= gap;
      const f = this.spawn(def, side, side === 0 ? p : LANE - p, false);
      this.startHp[side] += f.maxHp;
    }
  }

  private spawn(def: UnitDef, side: 0 | 1, x: number, summoned: boolean): Fighter {
    const e = this.c.economy;
    const air = def.tags.includes('air');
    const brace = def.abilities.some((a) => a.kind === 'brace');
    const attacks: AttackRt[] = def.attacks.map((a, i) => this.attackRt(a, i === 0));
    for (const ab of def.abilities) {
      if (ab.kind === 'riders') for (let i = 0; i < ab.count; i += 1) attacks.push(this.attackRt(ab.attack, false));
    }
    const shield = def.abilities.find((a): a is Extract<AbilityDef, { kind: 'innateShield' }> => a.kind === 'innateShield');
    const follow = def.abilities.find((a): a is Extract<AbilityDef, { kind: 'followSupport' }> => a.kind === 'followSupport');
    const resist = def.abilities.find((a): a is Extract<AbilityDef, { kind: 'resist' }> => a.kind === 'resist');
    const firstHit = def.abilities.find((a): a is Extract<AbilityDef, { kind: 'firstHitBonus' }> => a.kind === 'firstHitBonus');
    const f: Fighter = {
      id: this.nextId,
      side,
      def,
      x,
      w: e.sizes[def.size] * MILLI,
      hp: def.hp * CENTI,
      maxHp: def.hp * CENTI,
      // lu/s → milli-lu per tick
      speed: (def.speed * MILLI * TICK_MS) / 1000,
      air,
      alive: true,
      summoned,
      attacks,
      maxRange: def.attacks.reduce((m, a) => Math.max(m, a.range * MILLI), 0),
      follower: follow ? { behind: follow.behindFront * MILLI, soloMax: follow.soloMaxP * MILLI } : null,
      resist: resist ? { minRange: resist.minSourceRange, bp: resist.bp } : null,
      brace,
      knockResistBp: brace ? this.c.battle.braceKnockbackResistBp : air ? this.c.battle.airKnockbackResistBp : e.knockbackResistBp[def.size],
      shield: 0,
      shieldUntil: 0,
      innate: shield ? shield.amount * CENTI : 0,
      innateMax: shield ? shield.amount * CENTI : 0,
      innateRegenPerTick: shield ? (shield.regenPerSec * CENTI * TICK_MS) / 1000 : 0,
      innateDelay: shield ? msToTicks(shield.delayMs) : 0,
      lastDamagedTick: NO_TICK,
      stunUntil: 0,
      slowBp: 0,
      slowUntil: 0,
      markBp: 0,
      markUntil: 0,
      auraAttackSpeedBp: 0,
      lastAttackStart: -1000000,
      firstHit: firstHit ? { multBp: firstHit.multBp, knockback: firstHit.knockback, idleTicks: msToTicks(firstHit.idleResetMs) } : null,
      // Periodic abilities are ready at spawn (A2.7).
      abilityNext: def.abilities.map(() => 0),
      leapUntil: NO_TICK,
      leapTargetId: -1,
      leapTargetX: 0,
    };
    this.nextId += 1;
    this.fighters.push(f);
    return f;
  }

  private attackRt(def: AttackDef, primary: boolean): AttackRt {
    const melee = def.projectile === undefined;
    const windupPct = def.windupPct ?? (melee ? this.c.battle.windupPct.melee : this.c.battle.windupPct.ranged);
    return {
      def,
      baseInterval: msToTicks(def.intervalMs),
      windupPct,
      primary,
      nextTick: 0,
      impactTick: NO_TICK,
      targetId: -1,
      firstHitMultBp: 0,
      knockback: 0,
      biteBp: 0,
    };
  }

  // --- queries ------------------------------------------------------------------------------

  private get(id: number): Fighter | undefined {
    return this.fighters.find((f) => f.id === id && f.alive);
  }

  private enemies(f: Fighter): Fighter[] {
    return this.fighters.filter((e) => e.alive && e.side !== f.side);
  }

  private allies(f: Fighter): Fighter[] {
    return this.fighters.filter((a) => a.alive && a.side === f.side && a.id !== f.id);
  }

  private aliveCount(side: 0 | 1): number {
    let n = 0;
    for (const f of this.fighters) if (f.alive && f.side === side) n += 1;
    return n;
  }

  private hpLeftBp(side: 0 | 1): number {
    let hp = 0;
    for (const f of this.fighters) if (f.alive && f.side === side) hp += f.hp;
    const start = this.startHp[side];
    return start === 0 ? 0 : Math.min(BP, Math.trunc((hp * BP) / start));
  }

  private leaping(f: Fighter): boolean {
    return f.leapUntil !== NO_TICK && this.tick < f.leapUntil;
  }

  private stunned(f: Fighter): boolean {
    return this.tick < f.stunUntil;
  }

  private siegeOnly(f: Fighter): boolean {
    return f.def.abilities.some((a) => a.kind === 'siegeOnly');
  }

  private bomber(f: Fighter): Extract<AbilityDef, { kind: 'bomber' }> | undefined {
    return f.def.abilities.find((a): a is Extract<AbilityDef, { kind: 'bomber' }> => a.kind === 'bomber');
  }

  /** The nearest enemy ground unit in the direction `dir` (overlapping counts as blocking at 0). */
  private blockerAhead(f: Fighter, dir: 1 | -1): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const e of this.fighters) {
      if (!e.alive || e.side === f.side || e.air || this.leaping(e)) continue;
      const overlap = Math.abs(e.x - f.x) < (e.w + f.w) / 2;
      if (!overlap && (e.x - f.x) * dir <= 0) continue;
      const d = edge(f, e);
      if (d < bestD || (d === bestD && best !== null && e.id < best.id)) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  /** Priority class of a candidate (A2.7 Targeting): 1 when it matches the attack's priority. */
  private priorityClass(def: AttackDef, t: Fighter): number {
    switch (def.priority ?? 'front') {
      case 'armored':
        return hasTag(t, 'armored') || hasTag(t, 'mech') ? 1 : 0;
      case 'backline':
        return hasTag(t, 'ranged') || hasTag(t, 'support') ? 1 : 0;
      case 'air':
        return t.air ? 1 : 0;
      default:
        return 0;
    }
  }

  /** The best valid target for `rt` right now, or null (A2.7 Targeting). */
  private pickTarget(f: Fighter, rt: AttackRt): Fighter | null {
    const def = rt.def;
    const melee = def.projectile === undefined;
    const bomber = this.bomber(f);
    if (bomber) {
      // Bombs drop on ground enemies within ±dropWindow of the bomber's x (A2.7 Air units).
      let best: Fighter | null = null;
      for (const e of this.enemies(f)) {
        if (e.air || this.leaping(e)) continue;
        const d = Math.abs(e.x - f.x);
        if (d > bomber.dropWindow * MILLI) continue;
        if (!best || d < Math.abs(best.x - f.x) || (d === Math.abs(best.x - f.x) && e.id < best.id)) best = e;
      }
      return best;
    }
    if (rt.primary && this.siegeOnly(f)) {
      // siegeOnly: attacks units only while blocked (A5.3 Battering Ram).
      const b = this.blockerAhead(f, facing(f));
      return b && edge(f, b) === 0 ? b : null;
    }
    let best: Fighter | null = null;
    let bestClass = -1;
    let bestD = 0;
    const range = def.range * MILLI;
    const minRange = (def.minRange ?? 0) * MILLI;
    for (const e of this.enemies(f)) {
      if (!canHit(def, e)) continue;
      if (melee && this.leaping(e)) continue;
      const d = edge(f, e);
      if (d > range || d < minRange) continue;
      const cls = this.priorityClass(def, e);
      if (!best || cls > bestClass || (cls === bestClass && (d < bestD || (d === bestD && e.id < best.id)))) {
        best = e;
        bestClass = cls;
        bestD = d;
      }
    }
    return best;
  }

  // --- tick phases --------------------------------------------------------------------------

  /** B3 step 6: expire statuses, regenerate innate shields, recompute auras. */
  private statuses(): void {
    for (const f of this.fighters) {
      if (!f.alive) continue;
      if (this.tick >= f.shieldUntil) f.shield = 0;
      if (this.tick >= f.slowUntil) f.slowBp = 0;
      if (this.tick >= f.markUntil) f.markBp = 0;
      if (f.innateMax > 0 && f.innate < f.innateMax && this.tick - f.lastDamagedTick >= f.innateDelay) {
        f.innate = Math.min(f.innateMax, f.innate + f.innateRegenPerTick);
      }
      // Auras never stack: the strongest applies (A2.7).
      let best = 0;
      for (const a of this.allies(f)) {
        for (const ab of a.def.abilities) {
          if (ab.kind === 'aura' && ab.status.kind === 'attackSpeedBuff' && edge(a, f) <= ab.radius * MILLI) {
            best = Math.max(best, ab.status.magnitudeBp);
          }
        }
      }
      f.auraAttackSpeedBp = best;
    }
  }

  /**
   * B3 step 7: heals, Roar, called strikes, EMP, Time Stop, pounce. Every trigger reads the state from
   * before this step; heals and stuns are applied together afterwards, so id order (and with it the
   * side) never decides who acts first.
   */
  private abilities(): void {
    for (const f of this.fighters) if (f.alive && f.leapUntil === this.tick) this.land(f);
    const heals = new Map<number, number>();
    const stuns: [Fighter, number][] = [];
    for (const f of [...this.fighters]) {
      if (!f.alive || this.leaping(f) || this.stunned(f)) continue;
      f.def.abilities.forEach((ab, i) => {
        const ready = this.tick >= (f.abilityNext[i] ?? 0);
        switch (ab.kind) {
          case 'heal': {
            const pulse = msToTicks(ab.pulseMs);
            if (this.tick % pulse !== 0) break;
            const pool = Math.trunc((ab.hpPerSec * CENTI * ab.pulseMs) / 1000);
            const hurt = this.allies(f)
              .filter((a) => a.hp < a.maxHp && edge(a, f) <= ab.radius * MILLI)
              .sort((a, b) => Math.trunc((a.hp * BP) / a.maxHp) - Math.trunc((b.hp * BP) / b.maxHp) || a.id - b.id)
              .slice(0, ab.targets);
            if (hurt.length === 0) break;
            const share = Math.trunc(pool / hurt.length);
            // A unit receives only its single largest heal per pulse (A2.7).
            for (const a of hurt) heals.set(a.id, Math.max(heals.get(a.id) ?? 0, share));
            break;
          }
          case 'periodicShieldAura': {
            if (!ready || !this.hasPrimaryTarget(f)) break;
            const near = this.allies(f)
              .filter((a) => edge(a, f) <= ab.radius * MILLI)
              .sort((a, b) => edge(a, f) - edge(b, f) || a.id - b.id)
              .slice(0, ab.maxTargets);
            for (const a of near) {
              a.shield = Math.max(a.shield, ab.shield * CENTI);
              a.shieldUntil = Math.max(a.shieldUntil, this.tick + msToTicks(ab.durationMs));
            }
            f.abilityNext[i] = this.tick + msToTicks(ab.everyMs);
            this.active = true;
            break;
          }
          case 'callStrike': {
            if (!ready || this.tick < this.strikeLockout[f.side]) break;
            let target: Fighter | null = null;
            for (const e of this.enemies(f)) {
              if (e.air || edge(f, e) > ab.searchRange * MILLI) continue;
              if (!target || edge(f, e) < edge(f, target) || (edge(f, e) === edge(f, target) && e.id < target.id)) target = e;
            }
            if (!target) break;
            this.impacts.push({
              tick: this.tick + msToTicks(ab.delayMs),
              side: f.side,
              def: { damage: ab.damage, intervalMs: ab.everyMs, range: 0, hitsGround: true, hitsAir: false, dmgType: 'blast', sfx: '', splashRadius: ab.radius },
              targetId: target.id,
              aimX: target.x,
              firstHitMultBp: 0,
              knockback: 0,
              biteBp: 0,
            });
            f.abilityNext[i] = this.tick + msToTicks(ab.everyMs);
            this.strikeLockout[f.side] = this.tick + msToTicks(ab.sideLockoutMs);
            this.active = true;
            break;
          }
          case 'emp': {
            if (!ready) break;
            const foes = this.enemies(f);
            if (!foes.some((e) => edge(f, e) <= ab.triggerRadius * MILLI)) break;
            for (const e of foes) {
              if (edge(f, e) > ab.radius * MILLI) continue;
              e.shield = 0;
              e.innate = 0;
              e.lastDamagedTick = this.tick;
              if (hasTag(e, 'mech')) stuns.push([e, msToTicks(ab.stunMs)]);
            }
            f.abilityNext[i] = this.tick + msToTicks(ab.everyMs);
            this.active = true;
            break;
          }
          case 'timeStop': {
            if (!ready) break;
            const foes = this.enemies(f).filter((e) => edge(f, e) <= ab.radius * MILLI);
            if (foes.length === 0) break;
            for (const e of foes) stuns.push([e, msToTicks(hasTag(e, 'legendary') ? ab.legendaryFreezeMs : ab.freezeMs)]);
            f.abilityNext[i] = this.tick + msToTicks(ab.everyMs);
            this.active = true;
            break;
          }
          case 'pounce': {
            if (!ready) break;
            const blocker = this.blockerAhead(f, facing(f));
            if (!blocker || edge(f, blocker) > 0) break;
            let target: Fighter | null = null;
            for (const e of this.enemies(f)) {
              if (e.air || e.id === blocker.id) continue;
              if (!hasTag(e, 'ranged') && !hasTag(e, 'support')) continue;
              if ((e.x - blocker.x) * facing(f) <= 0 || edge(blocker, e) > ab.searchRange * MILLI) continue;
              if (!target || edge(f, e) < edge(f, target) || (edge(f, e) === edge(f, target) && e.id < target.id)) target = e;
            }
            // No target: no leap and no cooldown (A5.2).
            if (!target) break;
            f.leapUntil = this.tick + msToTicks(ab.leapMs);
            f.leapTargetId = target.id;
            f.leapTargetX = target.x;
            for (const rt of f.attacks) {
              rt.impactTick = NO_TICK;
              if (rt.primary) rt.biteBp = ab.firstBiteBp;
            }
            f.abilityNext[i] = this.tick + msToTicks(ab.cooldownMs);
            this.active = true;
            break;
          }
          default:
            break;
        }
      });
    }
    for (const [e, ticks] of stuns) this.stun(e, ticks);
    for (const [id, amount] of heals) {
      const a = this.get(id);
      if (!a) continue;
      const got = hasTag(a, 'legendary') ? applyBp(amount, this.c.economy.healLegendaryBp) : amount;
      a.hp = Math.min(a.maxHp, a.hp + got);
    }
  }

  /** Pounce landing: at the target's centre − (wT + wS) / 2 on the near side (A5.2). */
  private land(f: Fighter): void {
    const t = this.get(f.leapTargetId);
    const tx = t ? t.x : f.leapTargetX;
    const tw = t ? t.w : f.w;
    f.x = tx - facing(f) * Math.trunc((tw + f.w) / 2);
    f.leapUntil = NO_TICK;
    this.active = true;
  }

  private stun(f: Fighter, ticks: number): void {
    f.stunUntil = Math.max(f.stunUntil, this.tick + ticks);
    // A stun cancels a pending windup; the cooldown stays spent (A2.7).
    for (const rt of f.attacks) rt.impactTick = NO_TICK;
  }

  private hasPrimaryTarget(f: Fighter): boolean {
    const rt = f.attacks.find((a) => a.primary);
    return rt !== undefined && this.pickTarget(f, rt) !== null;
  }

  /** B3 step 8: attack state machines in id order (A2.7 Attack cycle). */
  private attacks(): void {
    for (const f of this.fighters) {
      if (!f.alive || this.leaping(f) || this.stunned(f)) continue;
      for (const rt of f.attacks) {
        if (rt.impactTick === this.tick) {
          rt.impactTick = NO_TICK;
          this.fire(f, rt);
        }
        if (rt.impactTick !== NO_TICK || this.tick < rt.nextTick) continue;
        const target = this.pickTarget(f, rt);
        if (!target) continue;
        const interval = Math.max(1, Math.round((rt.baseInterval * BP) / (BP + f.auraAttackSpeedBp)));
        const windup = Math.round((interval * rt.windupPct) / 100);
        rt.targetId = target.id;
        rt.nextTick = this.tick + interval;
        rt.firstHitMultBp = 0;
        rt.knockback = 0;
        if (rt.primary && f.firstHit && this.tick - f.lastAttackStart >= f.firstHit.idleTicks) {
          rt.firstHitMultBp = f.firstHit.multBp;
          rt.knockback = f.firstHit.knockback;
        }
        if (rt.primary) f.lastAttackStart = this.tick;
        this.active = true;
        if (windup === 0) this.fire(f, rt);
        else rt.impactTick = this.tick + windup;
      }
    }
  }

  /** Windup over: melee impacts now, projectiles fly, instant effects land next tick (A2.7). */
  private fire(f: Fighter, rt: AttackRt): void {
    const t = this.get(rt.targetId);
    const def = rt.def;
    // Whiff when the target died, became unhittable or left range plus the leash (A2.7).
    if (!t || !canHit(def, t) || (this.bomber(f) === undefined && edge(f, t) > (def.range + this.c.economy.leash) * MILLI)) {
      rt.biteBp = 0;
      return;
    }
    let tick = this.tick;
    const p = def.projectile;
    if (p && 'instant' in p) tick += 1;
    else if (p) {
      const perTick = (p.speed * MILLI * TICK_MS) / 1000;
      tick += Math.max(1, Math.ceil(edge(f, t) / perTick));
    }
    this.impacts.push({
      tick,
      side: f.side,
      def,
      targetId: t.id,
      aimX: def.splashRadius !== undefined && p ? t.x : null,
      firstHitMultBp: rt.firstHitMultBp,
      knockback: rt.knockback,
      biteBp: rt.biteBp,
    });
    rt.biteBp = 0;
  }

  /** B3 step 13: collect every impact due this tick, apply damage, then knockback and pulls. */
  private resolveImpacts(): void {
    const due = this.impacts.filter((i) => i.tick === this.tick);
    if (due.length === 0) return;
    this.impacts = this.impacts.filter((i) => i.tick !== this.tick);
    const knocks: Knock[] = [];
    for (const imp of due) {
      const hits = this.hitsOf(imp);
      hits.forEach((t, n) => {
        this.damage(imp, t, n === 0);
        if (n === 0 && imp.knockback !== 0 && !t.brace) knocks.push({ target: t, amount: imp.knockback, away: imp.side === 0 ? 1 : -1 });
      });
    }
    for (const k of knocks) {
      if (!k.target.alive || k.target.hp <= 0) continue;
      const moved = Math.trunc((k.amount * MILLI * (BP - k.target.knockResistBp)) / BP);
      if (moved === 0) continue;
      k.target.x += k.away * moved;
      // Knockback cancels a pending windup (A2.7).
      if (k.amount > 0) for (const rt of k.target.attacks) rt.impactTick = NO_TICK;
    }
  }

  /** The units an impact hits, primary first (A2.6 Area attacks, A2.7 Projectiles). */
  private hitsOf(imp: Impact): Fighter[] {
    const def = imp.def;
    const valid = (e: Fighter): boolean => e.alive && e.side !== imp.side && canHit(def, e);
    const away: 1 | -1 = imp.side === 0 ? 1 : -1;
    const primaryTarget = this.get(imp.targetId);
    if (def.splashRadius !== undefined) {
      const centre = imp.aimX ?? primaryTarget?.x;
      if (centre === undefined) return [];
      const r = def.splashRadius * MILLI;
      const inside = this.fighters
        .filter((e) => valid(e) && Math.abs(e.x - centre) <= r)
        .sort((a, b) => Math.abs(a.x - centre) - Math.abs(b.x - centre) || a.id - b.id);
      return inside.slice(0, def.maxTargets ?? this.c.economy.areaMaxTargets);
    }
    if (!primaryTarget || !valid(primaryTarget)) return [];
    const hits = [primaryTarget];
    const behind = (reach: number, count: number): Fighter[] =>
      this.fighters
        .filter((e) => valid(e) && e.id !== primaryTarget.id && (e.x - primaryTarget.x) * away >= 0)
        .filter((e) => Math.abs(e.x - primaryTarget.x) <= reach * MILLI)
        .sort((a, b) => Math.abs(a.x - primaryTarget.x) - Math.abs(b.x - primaryTarget.x) || a.id - b.id)
        .slice(0, count - 1);
    if (def.cleave) hits.push(...behind(def.cleave.reach, def.cleave.count));
    else if (def.pierce) hits.push(...behind(def.pierce.length, def.pierce.count));
    else if (def.chain) {
      let prev = primaryTarget;
      while (hits.length < def.chain.count) {
        let next: Fighter | null = null;
        for (const e of this.fighters) {
          if (!valid(e) || hits.includes(e) || Math.abs(e.x - prev.x) > def.chain.hop * MILLI) continue;
          if (!next || Math.abs(e.x - prev.x) < Math.abs(next.x - prev.x) || (Math.abs(e.x - prev.x) === Math.abs(next.x - prev.x) && e.id < next.id)) next = e;
        }
        if (!next) break;
        hits.push(next);
        prev = next;
      }
    }
    return hits;
  }

  /** The A2.7 damage pipeline at L1 (steps 1-8 without buffs, phases or powers), then shields and HP. */
  private damage(imp: Impact, t: Fighter, primary: boolean): void {
    const def = imp.def;
    let v = def.damage * CENTI;
    // First-hit bonus and first bite; Brace units ignore attackers' first-hit bonuses (A2.7).
    if (primary && imp.firstHitMultBp > 0 && !t.brace) v = applyBp(v, imp.firstHitMultBp);
    if (primary && imp.biteBp > 0) v = applyBp(v, imp.biteBp);
    const mod = def.mods?.find((m) => hasTag(t, m.vs));
    if (mod) v = applyBp(v, mod.bp);
    if (!primary) v = applyBp(v, this.c.economy.areaSecondaryBp);
    if (t.resist && def.range >= t.resist.minRange) v = applyBp(v, BP - t.resist.bp);
    if (this.tick < t.markUntil) v = applyBp(v, this.c.battle.markDamageBp);
    v = Math.max(v, CENTI);
    this.absorb(t, v);
    for (const s of def.onHit ?? []) this.applyStatus(t, s);
  }

  private absorb(t: Fighter, amount: number): void {
    let v = amount;
    const fromShield = Math.min(t.shield, v);
    t.shield -= fromShield;
    v -= fromShield;
    const fromInnate = Math.min(t.innate, v);
    t.innate -= fromInnate;
    v -= fromInnate;
    t.hp -= v;
    t.lastDamagedTick = this.tick;
    this.active = true;
  }

  private applyStatus(t: Fighter, s: StatusApply): void {
    const until = this.tick + msToTicks(s.durationMs);
    // Reapplying sets magnitude and expiry to the max of old and new (A2.7).
    if (s.kind === 'slow') {
      t.slowBp = Math.max(t.slowBp, s.magnitudeBp);
      t.slowUntil = Math.max(t.slowUntil, until);
    } else if (s.kind === 'mark') {
      t.markBp = Math.max(t.markBp, s.magnitudeBp);
      t.markUntil = Math.max(t.markUntil, until);
    } else if (s.kind === 'stun') {
      this.stun(t, msToTicks(s.durationMs));
    }
  }

  /** B3 step 14: deaths, death explosions and rider summons, repeated until stable (≤ 8 passes). */
  private deaths(): void {
    for (let pass = 0; pass < 8; pass += 1) {
      const dead = this.fighters.filter((f) => f.alive && f.hp <= 0);
      if (dead.length === 0) return;
      for (const f of dead) {
        f.alive = false;
        f.hp = 0;
        for (const ab of f.def.abilities) {
          if (ab.kind === 'onDeathExplode') {
            // Death explosions are exempt from the area rule (A2.6).
            for (const e of this.enemies(f)) {
              if (!e.air && Math.abs(e.x - f.x) <= ab.radius * MILLI) this.absorb(e, Math.max(CENTI, ab.damage * CENTI));
            }
          } else if (ab.kind === 'riders') {
            const spawn = this.c.units[ab.onDeathSpawn];
            if (spawn) for (let i = 0; i < ab.count; i += 1) this.spawn(spawn, f.side, f.x, true);
          }
        }
      }
      this.active = true;
    }
  }

  /** B3 step 15: symmetric movement (A2.7), with the duel's seek rule. */
  private movement(): void {
    interface Intent {
      f: Fighter;
      dir: 1 | -1;
      step: number;
    }
    const intents = new Map<number, Intent>();
    for (const f of this.fighters) {
      if (!f.alive || this.leaping(f) || this.stunned(f)) continue;
      const bomber = this.bomber(f);
      const slow = this.tick < f.slowUntil ? f.slowBp : 0;
      const speed = applyBp(f.speed, BP - slow);
      if (bomber) {
        // Duel-only: hover over the nearest ground enemy.
        const target = this.nearestAttackable(f);
        if (!target) intents.set(f.id, { f, dir: facing(f), step: speed });
        else {
          const dx = target.x - f.x;
          intents.set(f.id, { f, dir: dx >= 0 ? 1 : -1, step: Math.min(speed, Math.abs(dx)) });
        }
        continue;
      }
      if (this.hasPrimaryTarget(f)) {
        intents.set(f.id, { f, dir: facing(f), step: 0 });
        continue;
      }
      const target = this.nearestAttackable(f);
      const dir: 1 | -1 = target && (target.x - f.x) * facing(f) < 0 ? (facing(f) === 1 ? -1 : 1) : facing(f);
      intents.set(f.id, { f, dir, step: speed });
    }

    const newX = new Map<number, number>();
    for (const side of [0, 1] as const) {
      // Rank order: p descending, then id ascending (A2.7 soft single file).
      const ranked = this.fighters
        .filter((f) => f.alive && f.side === side)
        .sort((a, b) => this.p(b) - this.p(a) || a.id - b.id);
      const moved: { f: Fighter; p: number; moving: boolean }[] = [];
      for (const f of ranked) {
        const it = intents.get(f.id);
        let step = it ? it.step : 0;
        const dir = it ? it.dir : facing(f);
        const forward = dir === facing(f);
        if (step > 0 && !f.air) {
          // Never move into the nearest enemy ground unit in the way; two closing fronts split the gap.
          const blocker = this.blockerAhead(f, dir);
          if (blocker) {
            const gap = edge(f, blocker);
            const other = intents.get(blocker.id);
            const closing = other !== undefined && other.step > 0 && other.dir === -dir;
            step = Math.min(step, closing ? Math.floor(gap / 2) : gap);
          }
        }
        if (step > 0 && forward && !f.air) {
          // Ally caps apply against an ally ahead that is moving or does not outrange the mover.
          const rank = moved.filter((m) => !m.f.air).length;
          for (let k = moved.length - 1; k >= 0; k -= 1) {
            const ahead = moved[k];
            if (!ahead || ahead.f.air) continue;
            if (!ahead.moving && ahead.f.maxRange > f.maxRange) continue;
            const cap = rank <= 1 ? ahead.p : ahead.p - Math.trunc(((ahead.f.w + f.w) * this.c.economy.spacingBp) / BP);
            step = Math.max(0, Math.min(step, cap - this.p(f)));
            break;
          }
        }
        if (step > 0 && forward && f.follower) {
          // Support followers stay behind the frontmost friendly non-follower ground unit (A2.7).
          let front: number | null = null;
          for (const m of moved) if (!m.f.air && !m.f.follower) front = front === null ? m.p : Math.max(front, m.p);
          if (front === null) {
            for (const a of this.allies(f)) if (!a.air && !a.follower) front = front === null ? this.p(a) : Math.max(front, this.p(a));
          }
          const cap = front === null ? f.follower.soloMax : front - f.follower.behind;
          step = Math.max(0, Math.min(step, cap - this.p(f)));
        }
        step = Math.min(step, forward ? LANE - this.p(f) : this.p(f) + LANE);
        const p = this.p(f) + (forward ? step : -step);
        moved.push({ f, p, moving: step > 0 });
        if (step > 0) {
          newX.set(f.id, side === 0 ? p : LANE - p);
          this.active = true;
        }
      }
    }
    for (const [id, x] of newX) {
      const f = this.fighters.find((g) => g.id === id);
      if (f) f.x = x;
    }
  }

  /** Progress from the fighter's own gate, in milli-lu (A2.1). */
  private p(f: Fighter): number {
    return f.side === 0 ? f.x : LANE - f.x;
  }

  /** The nearest enemy the fighter's first attack can hit, by centre distance, or null. */
  private nearestAttackable(f: Fighter): Fighter | null {
    const rt = f.attacks.find((a) => a.primary);
    if (!rt) return null;
    let best: Fighter | null = null;
    for (const e of this.enemies(f)) {
      if (!canHit(rt.def, e)) continue;
      const d = Math.abs(e.x - f.x);
      if (!best || d < Math.abs(best.x - f.x) || (d === Math.abs(best.x - f.x) && e.id < best.id)) best = e;
    }
    return best;
  }
}
