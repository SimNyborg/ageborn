/**
 * Forts for bots (DESIGN A16.14.7, spec section 9): which kinds a bot places, when and where, the push
 * gate's fort defence, and the Fort card a bot brings in each age. Bots place forts under the player's
 * rules only: the same `fort` command, the same pads, recharge, caps, pop and price, chosen from the
 * delayed observation (the pads' legal and safe flags are what the HUD shows a player, A16.14.2).
 *
 * | Kind | When (all inside the gold ledger: slot ready, gold ≥ price + the tier's gold float, a safe pad) | Pad |
 * |---|---|---|
 * | Wall, Tower, Trap | enemy ground value entering the bot's half (from 500 lu before mid-lane) ≥ 300 and ≥ 1.2 × the bot's own army in its half, and less than half of it Heavy, siege, artillery or Legendary (a fort in front of breakers feeds them) | the most forward safe Home pad (inside own cover; pad 160 when a short turret alone blocks the cover rule) |
 * | Camp | once per age stay after the opening, while Charging with 2+ trained units out | the most forward safe pad (Field when legal) |
 *
 * Tiers 0-I never place forts, II-IV walls and traps, V-X every kind; VII-X place none while banking for
 * a wave. A General's preferred kinds join the tier's list (Moss walls and traps, 2 alive whenever an
 * enemy army is on the lane; Kettle camps; Boomsworth towers; the Warden any), Ledger never places towers.
 * The mistake "place a wall in front of Heavies" is offered when only the breaker rule holds the bot back.
 *
 * The gold is planned in the brain's saving goals (`fortGoal`): a wave 900 lu short of mid-lane sets a
 * `fort` goal of price + gold float that outranks the counter goal, and a due camp sets one after the
 * income research goal, so trains that would spend the fort's gold wait instead of a bolt-on purchase.
 */
import type { AgeId, CardId, CompiledContent, FortKind } from '@/contracts';
import { BP, LANE_MLU, MILLI, padSafe, type PadContext } from '@/core';
import type { BotAction } from './actions';
import type { CardBook } from './book';
import { personalityFor, type Personality } from './personalities';
import { tierParams, type TierParams } from './tiers';
import type { SeenFort, SeenTrap, View } from './view';

/** Wall, Tower, Trap: enemy ground value in the bot's half at least this much (whole gold) ... */
export const FORT_THREAT_MIN = 300;
/** ... and at least 1.2 × the bot's own army in its half ... */
export const FORT_THREAT_RATIO_BP = 12000;
/** ... with breakers (Heavy, siege, artillery, Legendary) under half of it. */
export const FORT_BREAKER_SHARE_BP = 5000;
/** Moss's eager rule: an enemy army worth this much anywhere on the lane is reason enough. */
export const FORT_EAGER_ARMY = 300;
/** Camps need this many trained own units out (A16.14.7). */
export const CAMP_MIN_TRAINED = 2;
/** Push gate D (A16.14.7): enemy forts within this distance of their gate count ... */
export const FORT_GATE_ZONE = 500 * MILLI;
/** ... walls and towers at 2 × their price, camps and visible traps at 1 ×. */
export const FORT_D_STRONG = 2;
export const FORT_D_WEAK = 1;
/**
 * Walls, towers and traps go up while the wave is at most this far short of mid-lane (bot frame), before
 * it stands on or near the Home pads (then no pad is safe). 500 lu (was 300, fixer 2026-10-01): the bot
 * plans its wall about a wave earlier, so a safe pad still exists when it decides (bots almost never
 * placed forts in the one-age windows: 0.03-0.37 walls per match).
 */
export const FORT_APPROACH = 500 * MILLI;
/**
 * The ledger plan (A16.14.7 "inside the bot's gold ledger"): once a wave is this close to crossing
 * mid-lane and the slot is ready within 8 s, the bot saves the fort's price plus its gold float (trains
 * that would dip below it wait), so the gold is there when the wave comes into range of a pad (900 lu since
 * the planning window moved to 500 lu, fixer 2026-10-01). Measured
 * (2026-09-30, tier VII): with the goal at 300 lu and 3 s the bot held 0-50 gold in most decisions
 * where a wave met the value rule, and placed a wall in 1 of 6 Short matches.
 */
export const FORT_GOAL_APPROACH = 900 * MILLI;
export const FORT_GOAL_READY_TICKS = 160;
/** Scores (bp of score): a defensive fort outranks a stance change, below a power cast and Last Stand; a camp is a spare-gold move. */
export const FORT_SCORE = 16000;
// SCRATCH-EXPERIMENT (remove): variant switch
const FX: string = ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.['AGEBORN_FORTV']) ?? '';
const fx = (k: string): boolean => FX.split(',').includes(k);
export const CAMP_SCORE = 12000;

/** The kinds a bot at this tier with this personality places (A16.14.7). */
export function fortKindsFor(t: TierParams, P: Personality): FortKind[] {
  if (t.fortKinds.length === 0) return [];
  const out: FortKind[] = [...t.fortKinds];
  for (const k of P.fortPrefer) if (!out.includes(k)) out.push(k);
  return out.filter((k) => !P.fortNever.includes(k));
}

/**
 * The Fort card a bot brings in an age (A16.14.7, for the meta's bot plans): the first of the General's
 * preferred kinds the tier places and the source filter allows (`allowed`, A16.14.6), else the age's
 * wall; null when the tier places no forts or the age has no wall. Deterministic and pure.
 */
export function botFortCard(content: CompiledContent, age: AgeId, o: { generalId: string; tier: number; allowed?: (id: CardId) => boolean }): CardId | null {
  const kinds = fortKindsFor(tierParams(o.tier), personalityFor(content, o.generalId));
  if (kinds.length === 0) return null;
  const ids = Object.keys(content.forts ?? {}).sort();
  const of = (kind: FortKind): CardId | null => ids.find((id) => content.forts[id]?.age === age && content.forts[id]?.fortKind === kind) ?? null;
  const allowed = o.allowed ?? ((): boolean => true);
  const P = personalityFor(content, o.generalId);
  for (const k of P.fortPrefer) {
    if (!kinds.includes(k)) continue;
    const id = of(k);
    if (id && allowed(id)) return id;
  }
  return of('wall');
}

/** Push gate D from enemy forts and traps (A16.14.7), whole gold. `gateUnits` never counts forts. */
export function fortDefence(foeForts: readonly SeenFort[], foeTraps: readonly SeenTrap[]): number {
  let d = 0;
  const from = LANE_MLU - FORT_GATE_ZONE;
  for (const f of foeForts) {
    if (f.p < from) continue;
    d += f.value * (f.kind === 'camp' ? FORT_D_WEAK : FORT_D_STRONG);
  }
  for (const t of foeTraps) if (t.p >= from) d += t.value * FORT_D_WEAK;
  return d;
}

/** What the fort planner needs from the brain's decision. */
export interface FortPlanInput {
  book: CardBook;
  tier: TierParams;
  persona: Personality;
  /** The push gate says bank for a wave (A7.2). */
  banking: boolean;
  /** The active saving goal's amount (milli), or null. */
  goal: number | null;
  /** Defence pressure near the gate is urgent: a saving goal does not hold a fort back. */
  urgent: boolean;
  /** The opening (30 s) is over. */
  afterOpening: boolean;
  /** The age a camp was last placed in (once per age stay), or null. */
  campAge: number | null;
  /**
   * Tools only (A16.14.9 forced-placement rows): place on every recharge, paid from the ledger, whatever
   * the kind rules say: on the most forward safe pad (else the most rearward legal one), or the most
   * forward legal pad.
   */
  force?: 'safe' | 'any' | null;
}

/** The fort decision: the action with its score, plus the mistake alternative. */
export interface FortPlan {
  action: Extract<BotAction, { kind: 'fort' }> | null;
  score: number;
  /** "Place a wall in front of Heavies" (A16.14.7 mistake list), when only the breaker rule held it back. */
  inFrontOfHeavies: Extract<BotAction, { kind: 'fort' }> | null;
}

const NONE: FortPlan = { action: null, score: 0, inFrontOfHeavies: null };

/**
 * The most forward safe pad (index) of the given pad kinds, or null. Safe pads include the cover rule
 * (A16.14.2); when that rule alone leaves no pad, the rear Home pad may do (`rearPadFallback`).
 */
function forwardSafePad(v: View, book: CardBook, kinds: 'home' | 'any'): number | null {
  const slot = v.fort;
  if (!slot) return null;
  let best: number | null = null;
  slot.pads.forEach((p, i) => {
    if (!p.safe || !p.legal) return;
    if (kinds === 'home' && p.kind !== 'home') return;
    if (best === null || p.p > (slot.pads[best]?.p ?? 0)) best = i;
  });
  return best ?? rearPadFallback(v, book);
}

/**
 * The rear Home pad (index 0) when the cover rule alone makes every Home pad unsafe (A16.14.2). With no
 * turret built pad 160 counts as covered, but a built short-range turret (the Pitch Cauldron, 130 lu)
 * puts the cover limit below it, so a bot with only such a turret would never place a fort. The bot then
 * reads pad 160 as it would with no turret: legal, and every visible enemy ground unit needs the scaffold
 * time + 1 s to reach it at its card speed (public numbers only; slowed units are slower, so this errs safe).
 */
function rearPadFallback(v: View, book: CardBook): number | null {
  const slot = v.fort;
  const r = book.econ.fort;
  const pad = slot?.pads[0];
  if (!slot || !r || !pad || v.turretsBuilt === 0 || !pad.legal || pad.safe || pad.kind !== 'home') return null;
  if (slot.pads.some((p) => p.kind === 'home' && p.legal && p.safe)) return null;
  const sizes = book.content.economy.sizes;
  const enemies = v.foes.map((u) => {
    const def = book.content.units[u.card];
    return { id: u.id, p: u.p, half: Math.trunc(((def ? (sizes[def.size] ?? 0) : 0) * MILLI) / 2), air: u.air, speed: (u.def?.speed ?? 0) * MILLI };
  });
  const ctx: PadContext = { cardPads: slot.def.pads, size: slot.def.size, taken: [], enemies, own: [] };
  return padSafe(r, 0, ctx, null) ? 0 : null;
}

/** The forced pad (tools only): the most forward safe pad, else the most rearward legal one; or the most forward legal pad. */
function forcedPad(v: View, how: 'safe' | 'any'): number | null {
  const slot = v.fort;
  if (!slot) return null;
  const home = slot.def.pads === 'home';
  const ok = slot.pads.map((p) => p.legal && !(home && p.kind !== 'home'));
  let fwdSafe: number | null = null;
  let fwd: number | null = null;
  let back: number | null = null;
  slot.pads.forEach((p, i) => {
    if (!ok[i]) return;
    if (p.safe && (fwdSafe === null || p.p > (slot.pads[fwdSafe]?.p ?? 0))) fwdSafe = i;
    if (fwd === null || p.p > (slot.pads[fwd]?.p ?? 0)) fwd = i;
    if (back === null || p.p < (slot.pads[back]?.p ?? 0)) back = i;
  });
  return how === 'any' ? fwd : (fwdSafe ?? back);
}

/** Enemy ground value short of `limit` (bot frame), its breaker part, and the bot's own army in its half. */
function waveAt(v: View, mid: number, limit: number): { threat: number; breakers: number; own: number } {
  let threat = 0;
  let breakers = 0;
  for (const u of v.foes) {
    if (u.air || u.p >= limit) continue;
    threat += u.value;
    if (u.def?.breaker) breakers += u.value;
  }
  let own = 0;
  for (const u of v.mine) if (u.p < mid) own += u.value;
  return { threat, breakers, own };
}

/** A wave worth a wall, tower or trap (A16.14.7), before the breaker rule. */
function isWave(v: View, P: Personality, w: { threat: number; own: number }): boolean {
  if (P.fortEager) return w.threat >= Math.trunc(FORT_THREAT_MIN / 2) || v.foeArmy >= FORT_EAGER_ARMY;
  if (fx('charge') && v.obs.foe.stance !== 'charge') return false;
  if (fx('big') && w.threat * BP < FORT_THREAT_RATIO_BP * v.myArmy) return false;
  return w.threat >= FORT_THREAT_MIN && w.threat * BP >= FORT_THREAT_RATIO_BP * w.own;
}

/** Own trained units out (not summoned, not levies): the camp rule's "2+ trained units" (A16.14.7). */
function trainedOut(v: View): number {
  let n = 0;
  for (const u of v.mine) if (!u.summoned && !u.levy) n += 1;
  return n;
}

/** Is a camp due (A16.14.7)? After the opening, Charging with 2+ trained units out, once per age stay (Kettle: whenever none stands). */
function campDue(v: View, i: FortPlanInput): boolean {
  const repeat = i.persona.fortPrefer[0] === 'camp';
  return i.afterOpening && v.stance === 'charge' && (repeat || i.campAge !== v.ageIndex) && trainedOut(v) >= CAMP_MIN_TRAINED;
}

/**
 * The fort saving goal, or null (A16.14.7 "planned inside the bot's gold ledger"): the price plus the
 * tier's gold float (milli), with the slot ready within 3 s, room under the caps and a safe pad.
 * `defend` (walls, towers, traps: a wave, not of breakers, about to cross mid-lane) outranks the counter
 * goal; `camp` (a camp is due) comes after the income research goal.
 */
export function fortGoal(v: View, i: FortPlanInput): { amount: number; why: 'defend' | 'camp' } | null {
  const slot = v.fort;
  const r = i.book.econ.fort;
  if (!slot || !r || i.force || v.phase === 'siege' || v.phase === 'ended' || v.ageUncertain) return null;
  const kind = slot.def.kind;
  if (!fortKindsFor(i.tier, i.persona).includes(kind)) return null;
  if (fx('nogoal') && kind !== 'camp') return null;
  if (fx('nocampgoal') && kind === 'camp') return null;
  if (slot.readyIn > FORT_GOAL_READY_TICKS || slot.alive >= r.maxAlive || (kind === 'tower' && slot.towers >= r.maxTowers) || (kind === 'camp' && slot.campAlive)) return null;
  if (v.popCommitted + slot.def.pop > i.book.econ.popCap || (i.tier.fortNoBank && i.banking)) return null;
  const amount = slot.cost + i.tier.goldFloat * MILLI;
  if (kind === 'camp') return campDue(v, i) && forwardSafePad(v, i.book, 'any') !== null ? { amount, why: 'camp' } : null;
  const mid = i.book.econ.midLane;
  const w = waveAt(v, mid, mid + (fx('goal5') ? 500 * MILLI : fx('goal7') ? 700 * MILLI : FORT_GOAL_APPROACH));
  if (!isWave(v, i.persona, w) || w.breakers * BP >= FORT_BREAKER_SHARE_BP * Math.max(1, w.threat)) return null;
  if (forwardSafePad(v, i.book, 'home') === null) return null;
  return { amount, why: 'defend' };
}

/** Plans the bot's fort for this decision (A16.14.7). */
export function planFort(v: View, i: FortPlanInput): FortPlan {
  const slot = v.fort;
  const r = i.book.econ.fort;
  if (!slot || !r || !slot.ready || v.phase === 'siege' || v.phase === 'ended' || v.ageUncertain) return NONE;
  const kind = slot.def.kind;
  if (slot.alive >= r.maxAlive) return NONE;
  if (kind === 'tower' && slot.towers >= r.maxTowers) return NONE;
  if (kind === 'camp' && slot.campAlive) return NONE;
  if (v.popCommitted + slot.def.pop > i.book.econ.popCap) return NONE;
  if (i.force) {
    const pad = v.gold >= slot.cost ? forcedPad(v, i.force) : null;
    return pad === null
      ? NONE
      : {
          action: { kind: 'fort', pad, card: slot.card, cost: slot.cost },
          score: FORT_SCORE,
          inFrontOfHeavies: null,
        };
  }
  if (!fortKindsFor(i.tier, i.persona).includes(kind)) return NONE;
  // Inside the gold ledger: the price plus the tier's gold float, and a saving goal holds a fort back.
  if (v.gold < slot.cost + i.tier.goldFloat * MILLI) return NONE;
  if (i.goal !== null && v.gold - slot.cost < i.goal && !i.urgent) return NONE;
  if (i.tier.fortNoBank && i.banking) return NONE;
  const act = (pad: number): Extract<BotAction, { kind: 'fort' }> => ({
    kind: 'fort',
    pad,
    card: slot.card,
    cost: slot.cost,
  });

  if (kind === 'camp') {
    // Once per age stay (Kettle, whose kind it is, may keep one up), while Charging with 2+ trained units out.
    if (!campDue(v, i)) return NONE;
    const pad = forwardSafePad(v, i.book, 'any');
    return pad === null ? NONE : { action: act(pad), score: CAMP_SCORE, inFrontOfHeavies: null };
  }

  // Wall, Tower, Trap: a real wave entering the bot's half that outnumbers what it has there. The wave is
  // read from 500 lu before mid-lane, like the saving goal: a wave already deep in the half stands on
  // or near the Home pads, which are then unsafe (a scaffold there only feeds it), so waiting for the
  // whole wave to cross found a safe pad in under a third of the decisions that met the value rule.
  const mid = i.book.econ.midLane;
  const w = waveAt(v, mid, mid + (fx('close') ? 200 * MILLI : fx('close0') ? 0 : fx('close3') ? 300 * MILLI : FORT_APPROACH));
  if (!isWave(v, i.persona, w)) return NONE;
  const pad = forwardSafePad(v, i.book, 'home');
  if (pad === null) return NONE;
  // A fort in front of breakers feeds them (×2 damage, 50% bounty): only as a mistake.
  if (w.breakers * BP >= FORT_BREAKER_SHARE_BP * Math.max(1, w.threat)) return { action: null, score: 0, inFrontOfHeavies: act(pad) };
  return { action: act(pad), score: FORT_SCORE, inFrontOfHeavies: null };
}
