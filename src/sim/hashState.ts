/**
 * FNV-1a 32-bit state hash (DESIGN B3 step 17, Replays). Every 20 ticks the hash goes into
 * `state.hashes`; a replay stores them and its final hash so verification can find the first
 * divergent second. The hash covers every field that can influence a later tick.
 */
import { Fnv1a } from '@/core';
import type { SimStateRt } from './state';

export function hashState(s: SimStateRt): number {
  const h = new Fnv1a();
  h.int(s.tick).str(s.phase).int(s.nextId);
  for (const v of s.rng) h.int(v);
  if (s.outcome) h.int(s.outcome.winner ?? -1).str(s.outcome.reason).int(s.outcome.tick);
  for (const side of s.sides) {
    h.int(side.gold).int(side.xp).int(side.ageIndex).int(side.ascendUntil).int(side.pop).int(side.treasury);
    h.int(side.mountsOwned).int(side.powerPpm).str(side.stance).int(side.stanceReadyTick).int(side.holdP).int(side.flagReadyTick);
    // A18.5.1: the owned picks (as a bitmask per 30 picks), the item in progress and its end tick.
    const r = side.research;
    let mask = 0;
    let base = 0;
    for (const i of [...r.owned].sort((a, b) => a - b)) {
      while (i >= base + 30) {
        h.int(mask);
        mask = 0;
        base += 30;
      }
      mask |= 1 << (i - base);
    }
    h.int(mask).int(r.cur).int(r.endTick).int(r.paid).int(side.markHp);
    h.int(side.baseHp).int(side.baseMaxHp).str(side.lastStand).bool(side.retreated).int(side.callStrikeReadyTick);
    h.int(side.emoteReadyTick).int(side.lastStandFireTick).int(side.played.length);
    h.int(side.queue.length);
    for (const q of side.queue) h.str(q.card).int(q.progress).int(q.total).bool(q.waiting).int(q.paid);
    for (const t of side.turrets) {
      if (!t) {
        h.int(-1);
        continue;
      }
      h.str(t.card).int(t.level).str(t.state).int(t.readyTick);
      h.int(t.attack.targetId).int(t.attack.nextAttackTick).int(t.attack.lastAttackTick);
    }
  }
  h.int(s.units.length);
  for (const u of s.units) {
    h.int(u.id).int(u.side).str(u.card).int(u.level).int(u.x).int(u.hp).int(u.maxHp);
    h.int(u.shield).int(u.innateShield).str(u.mode).bool(u.summoned).int(u.lastDamageTick).int(u.leapEnd);
    h.int(u.lastEngagedTick).int(u.picks.length);
    for (const i of u.picks) h.int(i);
    for (const a of u.attacks) {
      h.int(a.targetId).int(a.impactTick).int(a.nextAttackTick).int(a.lastAttackTick).int(a.retargetTick);
      h.bool(a.firstHit).bool(a.bite);
    }
    for (const st of u.statuses) h.str(st.kind).int(st.magnitudeBp).int(st.untilTick).int(st.amount);
    for (const t of u.timers) h.int(t);
  }
  h.int(s.projectiles.length);
  for (const p of s.projectiles) h.int(p.pid).int(p.x).int(p.toX).int(p.impactTick).int(p.targetId).bool(p.miss);
  h.int(s.casts.length);
  for (const c of s.casts) h.int(c.castId).int(c.x).int(c.nextIndex).int(c.hitIds.length).bool(c.applied);
  return h.value;
}
