/**
 * The A7.2 scoring terms. Every term is clamped to [0, 1] and expressed in bp (10,000 = 1); personality
 * multipliers m = 0.5 + w / 100 are bp too. Money is milli-gold, card values whole gold, positions
 * milli-lu in the bot's frame.
 *
 * | Term | Definition (A7.2) |
 * |---|---|
 * | f_push | 0.5 + (myArmy − foeArmy) / (2 × max(myArmy, foeArmy, 300)) |
 * | f_role(c) | 1 / (1 + own alive units in c's role group) |
 * | f_save(c) | 1 when a saving goal is active and gold − cost(c) would drop below it |
 * | f_pressure | enemy value within 480 lu of own gate / 400 |
 * | f_spare | (gold − cost) / 300 |
 */
import type { PowerSlot } from '@/contracts';
import {
  BP,
  MILLI,
  clamp,
  damageValue,
  eligibleIds,
  randInt,
  reachAreaMax,
  reachBand,
  strikeRank,
  suppressLegal,
  type PowerReachRules,
  type Sfc32State,
  type StrikeCandidate,
} from '@/core';
import type { PowerInfo } from './book';
import type { SeenUnit, View } from './view';

/** Truncated product of two bp values. */
export function mulBp(a: number, b: number): number {
  return Math.trunc((a * b) / BP);
}

export function clampBp(v: number): number {
  return clamp(v, 0, BP);
}

/** f_push, bp. */
export function fPush(myArmy: number, foeArmy: number): number {
  const den = 2 * Math.max(myArmy, foeArmy, 300);
  return clampBp(BP / 2 + Math.trunc(((myArmy - foeArmy) * BP) / den));
}

/** f_role for a group that already has `n` own units, bp. */
export function fRole(n: number): number {
  return Math.trunc(BP / (1 + Math.max(0, n)));
}

/** "enemy value within 480 lu of own gate". */
export const PRESSURE_RADIUS = 480 * MILLI;

/** f_pressure from the enemy value near the gate (whole gold), bp. */
export function fPressure(valueNearGate: number): number {
  return clampBp(Math.trunc((valueNearGate * BP) / 400));
}

/** f_spare for spending `cost` out of `gold` (both milli), bp. */
export function fSpare(gold: number, cost: number): number {
  return clampBp(Math.trunc(((gold - cost) * BP) / (300 * MILLI)));
}

/** A7.2 train score coefficients, bp of score. */
export const TRAIN = {
  counter: 10000,
  push: 6000,
  role: 4000,
  legendary: 3000,
  banking: 3000,
  save: 8000,
} as const;

/** Other A7.2 action scores and factors, bp of score. */
export const SCORE = {
  mount: 8000,
  modernise: 8000,
  evolve: 12000,
  /**
   * A cast that clears its ROI bar (A2.9.9). Its value is gone in seconds and the gold is already
   * counted against the bar, so it outranks every other action but Last Stand: trains wait one decision,
   * and Evolve waits too (the new age's slot would keep at most 75% of its progress, A2.9.3).
   */
  power: 19000,
  lastStand: 20000,
  stance: 15000,
  /** A Hold flag move (A18.4.2): below a stance change, above training. */
  flag: 14000,
  /** While a saving goal is active, candidates below this wait (a train paused by f_save lands below it). */
  savingBar: 5000,
} as const;

/** "range ≥ 250" (A7.2 banking preference). */
export const BANKING_RANGE = 250 * MILLI;

/**
 * A power slot's best use now (DESIGN A2.9.9 `powerOption`): where to aim, the value in milli-gold,
 * and the covered eligible targets. Aim `p` is milli-lu in the bot's frame (null = no aim).
 */
export interface PowerOption {
  slot: PowerSlot;
  info: PowerInfo;
  p: number | null;
  /** A strike's chosen target (A2.9.7), else null. */
  targetId: number | null;
  /** A2.9.9 value, milli-gold. */
  value: number;
  /** Card value (whole gold) of the eligible enemies the cast covers (bait discipline, mistakes). */
  covered: number;
  /** How many eligible enemies it covers. */
  count: number;
}

/** What `powerOption` needs besides the view (all public or the bot's own). */
export interface PowerContext {
  reach: PowerReachRules;
  /** Own-frame p where the own turret cover ends (480 lu), milli-lu. */
  turretCover: number;
  legendaryPowerDamageBp: number;
  strikeEpicBp: number;
  /** Strike aim: choose among the best k targets (A2.9.9). */
  strikeK: number;
  rng: Sfc32State | null;
}

/** A strike target within its range plus this of an own unit is fighting and stands still. */
const STRIKE_ENGAGED_SLACK = 40 * MILLI;
/** Strikes skip targets below this share of their HP, and need this many hittable enemies on the lane. */
const STRIKE_HEALTHY_BP = 2500;
const STRIKE_MIN_FOES = 2;
/** A manual strike aim needs another hittable enemy this close to its target (inside the 80 lu pick). */
const STRIKE_BACKUP = 60 * MILLI;
/** Stampede's start without a power front (A2.9.4 `battle.stampedeFallbackP`, p 200). */
const STAMPEDE_FALLBACK = 200 * MILLI;
/** "×1.25 when the target is within p ≤ 480 of the bot's gate" (A2.9.9). */
const NEAR_GATE_BP = 12500;
/** Controls and buffs count units within 300 lu of the other side (A2.9.9 "engaged"). */
const ENGAGED = 300 * MILLI;
/**
 * A drop is worth 1.2 × its card value with an enemy ranged or support unit this close behind the enemy
 * front, else 0.6. P1 calibration: the A2.9.9 starting weights (0.8 / 0.4) put the best drop at ROI
 * 12,000 (Paratroopers) and 10,700 (Warp Strike), so no tier from VI up ever cast one; the summoned
 * units fight like trained ones, so their card value is the floor of what they are worth on a soft target.
 */
const DROP_NEAR = 300 * MILLI;
const DROP_GOOD_BP = 12000;
const DROP_POOR_BP = 6000;
/** Suppress: needs 2+ enemy turrets; values 0.5 × the own army within 600 lu of the enemy gate. */
const SUPPRESS_MIN_TURRETS = 2;
const SUPPRESS_REACH = 600 * MILLI;
const SUPPRESS_BP = 5000;
/** The cloud counts 150 gold per enemy turret whose range covers it. */
const CLOUD_TURRET_VALUE = 150;
/** Units with at least this range count as ranged for the cloud and the drop (A2.9.9; melee reach ≤ 60 lu). */
const RANGED_RANGE = 100 * MILLI;

/** Expected power damage on one target, centi-HP (A2.9.6 Legendary and Epic rules, not stacked). */
function expectedDamage(u: SeenUnit, info: PowerInfo, levelBp: number, c: PowerContext): number {
  let d = Math.trunc((info.perUnit * 100 * levelBp) / BP);
  if (u.def?.legendary) d = Math.trunc((d * c.legendaryPowerDamageBp) / BP);
  else if (info.def.effect.kind === 'strike' && u.def?.epic) d = Math.trunc((d * c.strikeEpicBp) / BP);
  return d;
}

/** TEMP experiment knob (removed before hand-off). */
export const POWER_EXP = { chipEngagedPerMille: 400, engagedOnly: false };

/** A2.9.9 damage value of one target, milli-gold: kill-weighted, ×1.25 near the own gate. */
export function targetValue(u: SeenUnit, info: PowerInfo, levelBp: number, c: PowerContext, v0?: View): number {
  const dmg = expectedDamage(u, info, levelBp, c);
  let v = damageValue(u.value, dmg, u.hpTotal);
  if (v0 && dmg < u.hpTotal && POWER_EXP.chipEngagedPerMille !== 400 && engaged(u, v0, c.turretCover)) v = Math.trunc((POWER_EXP.chipEngagedPerMille * u.value * dmg) / u.hpTotal);
  return u.p <= c.turretCover ? mulBp(v, NEAR_GATE_BP) : v;
}

/** Can this power touch that enemy (air or ground as the effect says)? */
function hittable(u: SeenUnit, info: PowerInfo): boolean {
  return u.air ? info.hitsAir : info.hitsGround;
}

/** The bot is near this enemy: an own unit within 300 lu, or inside the own turret cover with a turret up. */
function engaged(u: SeenUnit, v: View, cover: number): boolean {
  if (u.p <= cover && v.turretsBuilt > 0) return true;
  return v.mine.some((m) => (m.p > u.p ? m.p - u.p : u.p - m.p) <= ENGAGED);
}

/**
 * The best option for one slot (A2.9.9 steps 1-2): area powers scan their legal band in 10 lu steps
 * over the eligible enemies (the cap and the screen, A2.9.5), strikes rank targets by value and pick
 * among the tier's best k, and the no-aim kinds (charges, buffs, drops, Suppress) value what they act on.
 */
export function powerOption(v: View, slot: PowerSlot, info: PowerInfo, c: PowerContext): PowerOption {
  const def = info.def;
  const fx = def.effect;
  const r = c.reach;
  const none: PowerOption = { slot, info, p: null, targetId: null, value: 0, covered: 0, count: 0 };
  const lvl = v.levelBp;
  switch (fx.kind) {
    case 'barrage':
    case 'sweep':
    case 'field':
    case 'cloud': {
      const band = reachBand(def.reach, info.zone, v.powerFront, r) ?? ([r.zoneMin, r.zoneMax] as [number, number]);
      const areaMax = reachAreaMax(def.reach, info.zone, band, r);
      const half = Math.trunc(info.zone / 2);
      if (fx.kind === 'cloud') {
        // (enemy ranged value in the cloud + 150 per enemy turret whose range covers it) × 4,000 bp.
        const turrets = v.obs.foe.turrets.filter((x) => x !== null).length;
        let best = none;
        for (let p = band[0]; p <= band[1]; p += r.scanStep) {
          let ranged = 0;
          for (const u of v.foes) if ((u.def?.range ?? 0) >= RANGED_RANGE && (u.p > p ? u.p - p : p - u.p) <= half) ranged += u.value;
          const covered = p + half >= r.lane - c.turretCover ? turrets : 0;
          const value = Math.trunc(((ranged + CLOUD_TURRET_VALUE * covered) * MILLI * info.aiValueBp) / BP);
          if (value > best.value) best = { ...none, p, value, covered: ranged, count: 0 };
        }
        return best;
      }
      const inArea = v.foes.filter((u) => hittable(u, info) && u.p <= areaMax);
      const elig = eligibleIds(inArea, info.cap > 0 ? info.cap : inArea.length, []);
      const cands = inArea.filter((u) => elig.has(u.id));
      // Per-target value: kill-weighted damage, or for controls the A2.9.9 weight on engaged targets.
      const worth = cands.map((u) => (info.control ? (engaged(u, v, c.turretCover) ? Math.trunc((u.value * MILLI * info.aiValueBp) / BP) : 0) : targetValue(u, info, lvl, c, v)));
      let best = none;
      for (let p = band[0]; p <= band[1]; p += r.scanStep) {
        let value = 0;
        let covered = 0;
        let count = 0;
        cands.forEach((u, i) => {
          if ((u.p > p ? u.p - p : p - u.p) > half) return;
          value += worth[i] as number;
          covered += u.value;
          count += 1;
        });
        if (value > best.value) best = { ...none, p, value, covered, count };
      }
      return best;
    }
    case 'stampede': {
      // The run from F (or p 200), `distance` long; its eligible enemies are the first N in cap order.
      const start = v.powerFront ?? STAMPEDE_FALLBACK;
      const end = start + info.zone;
      const inRun = v.foes.filter((u) => !u.air && u.p >= start && u.p <= end);
      const elig = eligibleIds(inRun, info.cap > 0 ? info.cap : inRun.length, []);
      let value = 0;
      let covered = 0;
      let count = 0;
      for (const u of inRun) {
        if (!elig.has(u.id)) continue;
        value += targetValue(u, info, lvl, c, v);
        covered += u.value;
        count += 1;
      }
      return { ...none, value, covered, count };
    }
    case 'strike': {
      // A strike is only worth its price on a target that will still be there when the shot lands: units
      // under a quarter of their HP are left to whatever is already killing them, and with fewer than two
      // enemies on the lane the lock could find nobody (A2.9.7 `powerNoTarget`) after the observation delay.
      const hittables = v.foes.filter((u) => hittable(u, info));
      if (hittables.length < STRIKE_MIN_FOES) return none;
      const cands: StrikeCandidate[] = [];
      const byId = new Map<number, SeenUnit>();
      for (const u of hittables) {
        if (u.hpTotal * BP < u.maxHp * STRIKE_HEALTHY_BP) continue;
        byId.set(u.id, u);
        cands.push({ id: u.id, p: u.p, cost: u.value, hp: u.hpTotal, epic: u.def?.epic === true, legendary: u.def?.legendary === true });
      }
      const total = Math.trunc((info.perUnit * 100 * lvl) / BP);
      const ranked = strikeRank(cands, total, c.strikeEpicBp, c.legendaryPowerDamageBp);
      if (ranked.length === 0) return none;
      // A2.9.9: the tier's aim error is a choice among its best k targets, never a positional offset.
      const k = Math.min(ranked.length, Math.max(1, c.strikeK));
      const pickIdx = k > 1 && c.rng ? randInt(c.rng, k) : 0;
      const u = byId.get((ranked[pickIdx] as StrikeCandidate).id) as SeenUnit;
      const value = targetValue(u, info, lvl, c);
      // The lock goes where the bot aims (the manual pick: the enemy nearest the aim). A fighting ground
      // target stands still, so its delayed position still holds; for a moving or flying one the bot uses
      // the auto-aim ranking instead, the lock a hurried tap would give.
      const fighting = !u.air && v.mine.some((m) => (m.p > u.p ? m.p - u.p : u.p - m.p) <= (u.def?.range ?? 0) + STRIKE_ENGAGED_SLACK);
      // An aim is clamped into the lane's power clamp (A2.1), so a target at a gate is locked by auto-aim;
      // and the aim needs a second enemy near the target, so the lock still finds someone if the target
      // falls during the observation delay.
      const aimable = u.p >= r.zoneMin && u.p <= r.zoneMax;
      const backed = hittables.some((o) => o.id !== u.id && (o.p > u.p ? o.p - u.p : u.p - o.p) <= STRIKE_BACKUP);
      if (!fighting || !aimable || !backed) {
        const b = byId.get((ranked[0] as StrikeCandidate).id) as SeenUnit;
        return { ...none, targetId: b.id, value: targetValue(b, info, lvl, c), covered: b.value, count: 1 };
      }
      return { ...none, p: u.p, targetId: u.id, value, covered: u.value, count: 1 };
    }
    case 'suppress': {
      // Legal only while F ≥ 1,370 (A2.9.4): the bot also wants its second front unit there, so the loss
      // of one runner during the observation delay cannot turn the cast into `powerOutOfReach`.
      const turrets = v.obs.foe.turrets.filter((x) => x !== null).length;
      if (!suppressLegal(v.powerFront, r) || !suppressLegal(v.powerFront2, r) || turrets < SUPPRESS_MIN_TURRETS) return none;
      let army = 0;
      for (const u of v.mine) if (u.p >= r.lane - SUPPRESS_REACH) army += u.value;
      return { ...none, value: Math.trunc((army * MILLI * SUPPRESS_BP) / BP) };
    }
    case 'buffAll': {
      // The 8 frontmost own units (ties to the lower id) that are within 300 lu of an enemy.
      const front = [...v.mine].sort((a, b) => b.p - a.p || a.id - b.id).slice(0, fx.maxTargets);
      let value = 0;
      let count = 0;
      for (const m of front) {
        if (!v.foes.some((u) => (u.p > m.p ? u.p - m.p : m.p - u.p) <= ENGAGED)) continue;
        value += Math.trunc((m.value * MILLI * info.aiValueBp) / BP);
        count += 1;
      }
      return { ...none, value, count };
    }
    case 'paradrop': {
      const worth = info.dropValue;
      const f = v.foeFront;
      const soft = f !== null && v.foes.some((u) => u.p >= f && u.p <= f + DROP_NEAR && ((u.def?.range ?? 0) >= RANGED_RANGE || u.def?.group === 'support'));
      return { ...none, value: Math.trunc((worth * MILLI * (soft ? DROP_GOOD_BP : DROP_POOR_BP)) / BP) };
    }
  }
}
