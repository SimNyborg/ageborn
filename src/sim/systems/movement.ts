/**
 * B3 step 15, movement (DESIGN A2.7 Movement, Air units, Stance).
 *
 * Ground:
 * - A unit advances at its speed unless attack 0 has a valid target in range (or is mid-windup).
 * - It cannot move into the nearest enemy ground unit ahead (it stops at edge distance 0); an
 *   overlapping enemy blocks at distance 0. Movement never increases overlap with an enemy.
 * - Soft single file with a two-wide front: per side, units sorted by p descending, then id. The first
 *   capping ally ahead may be joined side by side (front rank); behind a second one a unit keeps
 *   (wA + wB) × 0.3 centre to centre. An ally caps a mover only when it is moving or its longest range
 *   is ≤ the mover's (overtaking: melee passes parked ranged units and artillery).
 * - Symmetric resolution: both sides' moves come from pre-move positions; when two facing units both
 *   advance, each gets at most floor(gap / 2) of the gap.
 * - followSupport units stay 60 lu behind the frontmost friendly non-follower ground unit (p ≤ 200 alone).
 * - Ranks (formation, SIM_VERSION 8.0.0; `economy.formation`, off when absent): a side's melee front is its
 *   frontmost ground unit whose first attack reaches < 100 lu (`RANK_FRONT`). A ranked unit (`RANK_RANKED`:
 *   a ranged ground unit, see `rankUnit` in rules.ts) keeps its place, a share of its range (± a variation
 *   fixed by its id) behind that front: it never advances past the place (a cap: it never walks back for
 *   it), and when it has a target in range but stands more than `closeUpLu` behind the place it steps up
 *   between shots (never during a windup, and only toward a target ahead). Melee walks through its own
 *   ranks. In Hold a ranked unit forms up its gap behind the flag. Off in Fall back and for a side with no
 *   melee on the lane (an all-ranged army plays as before). One pass per side: O(n) on top of the file.
 * - Stance (A18.4.2): Hold keeps units at the side's Hold flag (default 320, [320, 800]): units beyond it
 *   without a target walk back at 70% speed; units behind it do not pass it. Fall back walks units with
 *   no target back to p = 200 at full speed and holds them there. Engaged units keep fighting.
 * - Open gate (A16.4 stall fix, `economy.openGateLu`): while the defender has no ground unit within that
 *   distance of its own gate, the attackers close up at the gate as in the siege crowd, in every phase.
 * - Siege forced march (A17.3): unit movement ×`siege.moveSpeedBp` (×1.2) while the phase is Siege; it applies
 *   to ground and air units (not to knockback, pulls, leaps, projectiles or power runners).
 * Air: ignore blocking; gunships stop for targets and obey stance; the bomber never stops, ignores Hold
 * and stops only at the enemy gate.
 * Forts (A16.14.2): walls, towers and camps never move. A completed fort blocks enemy ground units like a
 * parked unit (a scaffold does not); own units walk through their own forts, which are outside every
 * formation (front rank, spacing, followSupport, the open gate test, the siege crowd). Levies always
 * march: they Charge whatever the stance (A16.14.3).
 */
import type { Side } from '@/contracts';
import { BP } from '@/core';
import { capSum, isLeaping, isStunned, statusBp } from '../damage';
import { clampToLane, distToEnemyGate, edgeDist, isAheadOrLevel, pOf, xOf } from '../geometry';
import { RANK_FRONT, RANK_RANKED, type UnitRules } from '../rules';
import { BASE_TARGET, LANE, type AttackRt, type Ctx, type UnitRt } from '../state';
import { alive, findUnit, unitRules } from '../units';
import { targetInRange } from './targeting';

interface Mover {
  u: UnitRt;
  r: UnitRules;
  p: number;
  want: number;
  newP: number;
  engaged: boolean;
  /** Ranks: a ranked unit's gap behind its melee front this tick (mlu), −1 when the ranks do not apply to it. */
  gap: number;
  /** Ranks: a ranked unit stepping up to its place between shots (it has a target in range). */
  firing: boolean;
}

export function movementSystem(ctx: Ctx): void {
  const units = ctx.s.units;
  const ground: [Mover[], Mover[]] = [[], []];
  const forts: [Mover[], Mover[]] = [[], []];
  const air: Mover[] = [];
  const all: Mover[] = [];
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i] as UnitRt;
    if (!alive(u)) continue;
    const r = unitRules(ctx, u);
    if (u.fort) {
      // Completed forts block the enemy; scaffolds do not. Forts never move.
      if (u.fort.done) forts[u.side].push({ u, r, p: pOf(u.x, u.side), want: 0, newP: pOf(u.x, u.side), engaged: false, gap: -1, firing: false });
      continue;
    }
    if (isLeaping(u)) {
      stepLeap(ctx, u, r);
      continue;
    }
    const m: Mover = { u, r, p: pOf(u.x, u.side), want: 0, newP: 0, engaged: false, gap: -1, firing: false };
    all.push(m);
    if (u.air) air.push(m);
    else ground[u.side].push(m);
  }
  ground[0].sort(frontFirst);
  ground[1].sort(frontFirst);
  const fronts: [number, number] = [meleeFront(ctx, ground[0], 0), meleeFront(ctx, ground[1], 1)];
  for (const m of all) computeWant(ctx, m, ground[m.u.side], fronts[m.u.side]);
  const open = openGates(ctx, ground);
  for (const side of [0, 1] as const) {
    const foe = side === 0 ? 1 : 0;
    const blockers = forts[foe].length > 0 ? [...ground[foe], ...forts[foe]] : ground[foe];
    resolveGround(ctx, ground[side], blockers, open[foe], fronts[side]);
  }
  for (const m of air) m.newP = m.p + m.want;
  for (const m of all) {
    const pMax = LANE - m.r.half;
    let p = m.newP;
    if (p > pMax) p = pMax;
    if (p < 0) p = 0;
    const moved = p - m.p;
    m.u.moved = moved;
    if (moved !== 0) m.u.x = xOf(p, m.u.side);
    m.u.mode = m.engaged ? 'attack' : moved < 0 ? 'retreat' : moved > 0 ? 'walk' : m.firing ? 'attack' : 'hold';
  }
}

/**
 * Ranks (A2.7): the pre-move p of a side's melee front, its frontmost `RANK_FRONT` ground unit (the list is
 * sorted front first), or −1 when the ranks are off for the side: no `economy.formation`, Fall back (its
 * retreat is unchanged, A18.4.2), or no melee unit on the lane (an all-ranged army plays as before).
 */
function meleeFront(ctx: Ctx, ground: readonly Mover[], side: Side): number {
  FRONT_WALKING[side] = false;
  if (!ctx.econ.formation || ctx.s.sides[side].stance === 'fallback') return -1;
  for (const m of ground)
    if (m.r.rank === RANK_FRONT) {
      FRONT_WALKING[side] = m.u.mode === 'walk';
      return m.p;
    }
  return -1;
}
/** TEMP EXPERIMENT (remove). */
const FRONT_WALKING: boolean[] = [false, false];

/**
 * A ranked unit's gap behind its melee front (mlu): its card's place (`UnitRules.rankGap`, a share of its
 * range) ± up to `formation.jitterBp` of it, fixed by the unit's id so a line never looks drilled.
 */
function rankGap(ctx: Ctx, u: UnitRt, r: UnitRules): number {
  const j = ctx.econ.formation?.jitterBp ?? 0;
  const g = r.rankGap;
  if (j <= 0 || g <= 0) return g;
  const bp = (mix32(u.id) % (j * 2 + 1)) - j;
  const out = g + Math.trunc((Math.trunc(g / 100) * bp) / 100);
  return out > 0 ? out : 0;
}

/** A 32-bit integer mix of a unit id (deterministic, `Math.imul` only, B3), as an unsigned value. */
function mix32(n: number): number {
  let h = Math.imul(n ^ 0x2545f491, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca77);
  h ^= h >>> 13;
  return h >>> 0;
}

/**
 * How far a closing ranked unit may step toward attack 0's target (mlu): the distance to it minus the
 * stand-off (`formation.standOffBp` of the attack's range); 0 when the target is behind the unit (it never
 * walks away from a foe behind it) or already within the stand-off.
 */
function standOffRoom(ctx: Ctx, u: UnitRt, r: UnitRules, st: AttackRt): number {
  const a = r.attacks[0];
  if (!a) return 0;
  const off = Math.trunc((Math.trunc(a.range / 100) * (ctx.econ.formation?.standOffBp ?? 0)) / 100);
  if (st.targetId === BASE_TARGET) return distToEnemyGate(u.side, u.x, r.half) - off;
  const t = findUnit(ctx, st.targetId);
  if (t === undefined || !isAheadOrLevel(u.side, u.x, t.x)) return 0;
  return edgeDist(u.x, r.half, t.x, unitRules(ctx, t).half) - off;
}

function frontFirst(a: Mover, b: Mover): number {
  return b.p - a.p || a.u.id - b.u.id;
}

function stepLeap(ctx: Ctx, u: UnitRt, r: UnitRules): void {
  const total = u.leapEnd - u.leapStart;
  const done = ctx.tick - u.leapStart;
  if (done >= total) {
    u.x = clampToLane(u.side, u.leapTo, r.half);
    u.leapEnd = 0;
    u.moved = 0;
    u.mode = 'attack';
    return;
  }
  const x = u.leapFrom + Math.trunc(((u.leapTo - u.leapFrom) * done) / total);
  u.moved = x - u.x;
  u.x = clampToLane(u.side, x, r.half);
  u.mode = 'leap';
}

/**
 * Effective speed (mlu/tick): research, side modifiers and War Horns with the speed buff (A2.7 statuses)
 * summed and capped (A18.2: +20%, a stronger timed buff keeps its own value), then slows, then the
 * Siege forced march (A17.3).
 */
function speedOf(ctx: Ctx, m: Mover): number {
  return unitSpeed(ctx, m.u, m.r);
}

/** A unit's effective speed now (mlu/tick; see `speedOf`). Also read by the fort safe-pad test (A16.14.1). */
export function unitSpeed(ctx: Ctx, u: UnitRt, r: UnitRules): number {
  let v = r.speed;
  const fx = u.fx;
  let fixed = fx ? fx.speedBp : 0;
  if (fx?.horns && !u.air && (r.levy || ctx.s.sides[u.side].stance === 'charge')) fixed += fx.horns.chargeSpeedBp;
  // A timed speed buff and an ally speed aura (Aulos Piper) never stack: the stronger applies.
  const timedSpeed = statusBp(u, 'speedBuff');
  const bonus = capSum(fixed, timedSpeed > u.auraSpeedBp ? timedSpeed : u.auraSpeedBp, ctx.econ.caps.speedBp);
  if (bonus !== 0) v = Math.trunc((v * (BP + bonus)) / BP);
  // Slows and snares (A2.9.6): the stronger applies, after the A18.2 caps.
  // A Dread aura's slow (Bronze wave M4) joins them: still only the strongest applies.
  const timedSlow = statusBp(u, 'slow');
  const slowBp = timedSlow > u.auraSlowBp ? timedSlow : u.auraSlowBp;
  const snareBp = statusBp(u, 'snare');
  const slow = slowBp > snareBp ? slowBp : snareBp;
  if (slow > 0) v = Math.trunc((v * (BP - (slow > BP ? BP : slow))) / BP);
  if (ctx.s.phase === 'siege') {
    const march = ctx.econ.siege.moveSpeedBp;
    if (march !== BP) v = Math.trunc((v * march) / BP);
  }
  return v;
}

function computeWant(ctx: Ctx, m: Mover, allies: readonly Mover[], meleeP: number): void {
  const { u, r } = m;
  m.want = 0;
  m.newP = m.p;
  if (isStunned(u)) return;
  const e = ctx.econ;
  const speed = speedOf(ctx, m);
  if (r.bomber) {
    m.want = speed;
    return;
  }
  const side = ctx.s.sides[u.side];
  const hold = side.stance === 'hold';
  // Ranks (A2.7): a ranked unit's gap and place behind its side's melee front (in Hold, behind the flag too).
  if (meleeP >= 0 && r.rank === RANK_RANKED) m.gap = rankGap(ctx, u, r);
  const st0 = u.attacks[0];
  if (st0 && (st0.impactTick !== 0 || targetInRange(ctx, u, r, 0))) {
    // A ranked unit firing from well behind its place steps up between shots: once it stands more than
    // `closeUp` behind it (or it was already walking up last tick) it walks on to its place. Never during a
    // windup, and only toward a target ahead of it (it never walks away from a foe behind it).
    const closeUp = e.formation ? e.formation.closeUp : 0;
    const behind = m.gap < 0 ? 0 : (hold && side.holdP < meleeP ? side.holdP : meleeP) - m.gap - m.p;
    const closing = closeUp > 0 && behind > 0 && (behind > closeUp || u.mode === 'walk');
    // TEMP EXPERIMENT (remove): FORM_CLOSE=bot|proxy limits the close-up to one kind of seat
    const only = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env['FORM_CLOSE'];
    const variant = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env['FORM_VARIANT'];
    const seatOk =
      (only === undefined || (only === 'bot') === ctx.cfg.sides[u.side].isBot) &&
      (variant === undefined || (side.stance === 'charge' && (variant === 'charge' || FRONT_WALKING[u.side] === true)));
    const room = closing && seatOk && st0.impactTick === 0 ? standOffRoom(ctx, u, r, st0) : 0;
    if (room <= 0) {
      m.engaged = true;
      return;
    }
    m.firing = true;
    m.want = room;
  }
  let want = m.firing && m.want < speed ? m.want : speed;
  // Levies always march (A16.14.3): they ignore Hold, Fall back and the Hold flag.
  if (side.stance !== 'charge' && !r.levy) {
    // A18.4.2: Hold at the side's flag (walk back at 70% speed); Fall back to p = 200 at full speed. A ranked
    // unit holds its own gap behind the flag (A2.7 Ranks).
    let line = hold ? side.holdP : e.fallbackP;
    if (hold && m.gap > 0) line = line > m.gap ? line - m.gap : 0;
    if (m.p > line) {
      const back = hold ? Math.trunc((speed * e.holdRetreatSpeedBp) / BP) : speed;
      want = -(back < m.p - line ? back : m.p - line);
    } else {
      want = Math.min(want, line - m.p);
    }
  }
  if (r.follow && want > 0) {
    let front = -1;
    for (const a of allies) {
      if (a.r.follow) continue;
      front = a.p;
      break;
    }
    const cap = front >= 0 ? front - r.follow.behind : r.follow.soloMax;
    want = cap - m.p < want ? Math.max(0, cap - m.p) : want;
  }
  m.want = want;
}

/**
 * Plans the ground moves of one side against the (pre-move) enemy ground units. `meleeP` is the side's
 * pre-move melee front for the ranks (−1: off); once the front unit is planned its new position is used.
 */
function resolveGround(ctx: Ctx, mine: Mover[], foes: readonly Mover[], foeGateOpen: boolean, meleeP: number): void {
  const spacingBp = ctx.econ.spacingBp;
  const siegeCrowd = ctx.s.phase === 'siege' || foeGateOpen ? ctx.econ.siege.gateCrowd : 0;
  const ranks = meleeP >= 0;
  let front = -1;
  for (let i = 0; i < mine.length; i += 1) {
    const m = mine[i] as Mover;
    planGround(ctx, mine, i, foes, siegeCrowd, spacingBp, ranks, front >= 0 ? front : meleeP);
    if (front < 0 && m.r.rank === RANK_FRONT) front = m.newP;
  }
}

/** One unit's planned move (see `resolveGround`); `front` is the side's melee front for the ranks. */
function planGround(ctx: Ctx, mine: readonly Mover[], i: number, foes: readonly Mover[], siegeCrowd: number, spacingBp: number, ranks: boolean, front: number): void {
  const m = mine[i] as Mover;
  const { u, r } = m;
  if (m.want === 0) {
    m.newP = m.p;
    return;
  }
  if (m.want < 0) {
    // Retreat: never back into an enemy that is behind.
    let gap = m.p;
    for (const f of foes) {
      if (isAheadOrLevel(u.side, u.x, f.u.x)) continue;
      const d = edgeDist(u.x, r.half, f.u.x, f.r.half);
      if (d < gap) gap = d;
    }
    m.newP = m.p + (m.want < -gap ? -gap : m.want);
    return;
  }
  // Enemy block: the nearest enemy ground unit ahead (or overlapping level), pre-move.
  let limit = m.want;
  for (const f of foes) {
    if (!isAheadOrLevel(u.side, u.x, f.u.x)) continue;
    const gap = edgeDist(u.x, r.half, f.u.x, f.r.half);
    const allowed = f.want > 0 ? gap >> 1 : gap;
    if (allowed < limit) limit = allowed;
  }
  // Ally caps, front to back with the planned positions of the allies ahead. Ranks (A2.7): melee walks
  // through its own ranks to reach the front, so reinforcements never queue behind the archers.
  const throughRanks = ranks && r.rank === RANK_FRONT;
  let rank = 0;
  let nearest: Mover | null = null;
  for (let j = 0; j < i; j += 1) {
    const a = mine[j] as Mover;
    if (throughRanks && a.r.rank === RANK_RANKED) continue;
    const moving = a.newP !== a.p;
    if (moving || a.r.maxRange <= r.maxRange) {
      rank += 1;
      nearest = a;
    }
  }
  if (nearest) {
    // The first `frontWidth` units stand side by side; in Siege the file also closes up at the enemy gate.
    const crowd = siegeCrowd > 0 && nearest.newP + nearest.r.half >= LANE - siegeCrowd;
    const cap = rank < ctx.econ.frontWidth || crowd ? nearest.newP : nearest.newP - Math.trunc(((r.width + nearest.r.width) * spacingBp) / BP);
    const room = cap - m.p;
    if (room < limit) limit = room;
  }
  // Ranks (A2.7): a ranked unit never advances past its place behind the melee front (a cap only: it never
  // walks back for it).
  if (m.gap >= 0) {
    const room = front - m.gap - m.p;
    if (room < limit) limit = room;
  }
  m.newP = m.p + (limit > 0 ? limit : 0);
}

/**
 * The open gate per side (A16.4 stall fix, `economy.openGateLu`): true while none of the side's ground
 * units (pre-move) stands within that distance of its own gate. Off when 0 and in the tutorial format.
 */
function openGates(ctx: Ctx, ground: readonly [Mover[], Mover[]]): [boolean, boolean] {
  const clear = ctx.econ.openGate;
  if (clear <= 0 || ctx.cfg.format === 'tutorial') return [false, false];
  const open = (list: readonly Mover[]): boolean => list.every((m) => m.p > clear);
  return [open(ground[0]), open(ground[1])];
}
