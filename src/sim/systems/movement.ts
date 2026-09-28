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
 * - Hold: units beyond 320 without a target walk back at 70% speed; at or below 320 they do not pass it.
 * - Open gate (A16.4 stall fix): while a side has no ground unit within `openGate.clear` of its own gate,
 *   the attackers close up at that gate as in the siege crowd, in every phase (see `gateOpen`).
 * - Siege forced march (A17.3): unit movement ×`siege.moveSpeedBp` (×1.2) while the phase is Siege; it applies
 *   to ground and air units (not to knockback, pulls, leaps, projectiles or power runners).
 * Air: ignore blocking; gunships stop for targets and obey stance; the bomber never stops, ignores Hold
 * and stops only at the enemy gate.
 */
import { BP } from '@/core';
import { isLeaping, isStunned, statusBp } from '../damage';
import { clampToLane, edgeDist, isAheadOrLevel, pOf, xOf } from '../geometry';
import type { UnitRules } from '../rules';
import { LANE, type Ctx, type UnitRt } from '../state';
import { alive, unitRules } from '../units';
import { gateOpen } from '../gate';
import { targetInRange } from './targeting';

interface Mover {
  u: UnitRt;
  r: UnitRules;
  p: number;
  want: number;
  newP: number;
  engaged: boolean;
}

export function movementSystem(ctx: Ctx): void {
  const units = ctx.s.units;
  const ground: [Mover[], Mover[]] = [[], []];
  const air: Mover[] = [];
  const all: Mover[] = [];
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i] as UnitRt;
    if (!alive(u)) continue;
    const r = unitRules(ctx, u);
    if (isLeaping(u)) {
      stepLeap(ctx, u, r);
      continue;
    }
    const m: Mover = { u, r, p: pOf(u.x, u.side), want: 0, newP: 0, engaged: false };
    all.push(m);
    if (u.air) air.push(m);
    else ground[u.side].push(m);
  }
  ground[0].sort(frontFirst);
  ground[1].sort(frontFirst);
  for (const m of all) computeWant(ctx, m, ground[m.u.side]);
  for (const side of [0, 1] as const) resolveGround(ctx, ground[side], ground[side === 0 ? 1 : 0]);
  for (const m of air) m.newP = m.p + m.want;
  for (const m of all) {
    const pMax = LANE - m.r.half;
    let p = m.newP;
    if (p > pMax) p = pMax;
    if (p < 0) p = 0;
    const moved = p - m.p;
    m.u.moved = moved;
    if (moved !== 0) m.u.x = xOf(p, m.u.side);
    m.u.mode = m.engaged ? 'attack' : moved < 0 ? 'retreat' : moved > 0 ? 'walk' : 'hold';
  }
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

/** Effective speed (mlu/tick): slow, speed buff (A2.7 statuses), then the Siege forced march (A17.3). */
function speedOf(ctx: Ctx, m: Mover): number {
  let v = m.r.speed;
  const slow = statusBp(m.u, 'slow');
  if (slow > 0) v = Math.trunc((v * (BP - (slow > BP ? BP : slow))) / BP);
  const buff = statusBp(m.u, 'speedBuff');
  if (buff > 0) v = Math.trunc((v * (BP + buff)) / BP);
  if (ctx.s.phase === 'siege') {
    const march = ctx.econ.siege.moveSpeedBp;
    if (march !== BP) v = Math.trunc((v * march) / BP);
  }
  return v;
}

function computeWant(ctx: Ctx, m: Mover, allies: readonly Mover[]): void {
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
  const st0 = u.attacks[0];
  if (st0 && (st0.impactTick !== 0 || targetInRange(ctx, u, r, 0))) {
    m.engaged = true;
    return;
  }
  let want = speed;
  const side = ctx.s.sides[u.side];
  if (side.stance === 'hold') {
    if (m.p > e.holdLine) {
      const back = Math.trunc((speed * e.holdRetreatSpeedBp) / BP);
      want = -(back < m.p - e.holdLine ? back : m.p - e.holdLine);
    } else {
      want = Math.min(want, e.holdLine - m.p);
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

/** Plans the ground moves of one side against the (pre-move) enemy ground units. */
function resolveGround(ctx: Ctx, mine: Mover[], foes: readonly Mover[]): void {
  const spacingBp = ctx.econ.spacingBp;
  const side = mine[0]?.u.side;
  const siegeCrowd = ctx.s.phase === 'siege' || (side !== undefined && gateOpen(ctx, side === 0 ? 1 : 0)) ? ctx.econ.siege.gateCrowd : 0;
  for (let i = 0; i < mine.length; i += 1) {
    const m = mine[i] as Mover;
    const { u, r } = m;
    if (m.want === 0) {
      m.newP = m.p;
      continue;
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
      continue;
    }
    // Enemy block: the nearest enemy ground unit ahead (or overlapping level), pre-move.
    let limit = m.want;
    for (const f of foes) {
      if (!isAheadOrLevel(u.side, u.x, f.u.x)) continue;
      const gap = edgeDist(u.x, r.half, f.u.x, f.r.half);
      const allowed = f.want > 0 ? gap >> 1 : gap;
      if (allowed < limit) limit = allowed;
    }
    // Ally caps, front to back with the planned positions of the allies ahead.
    let rank = 0;
    let nearest: Mover | null = null;
    for (let j = 0; j < i; j += 1) {
      const a = mine[j] as Mover;
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
    m.newP = m.p + (limit > 0 ? limit : 0);
  }
}
