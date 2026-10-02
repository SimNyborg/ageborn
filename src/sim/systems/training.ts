/**
 * B3 step 5, training (DESIGN A2.7 Training, Population cap).
 *
 * One shared queue of 5; gold is paid on enqueue. Training advances the first queued item that is not
 * finished; the timer pauses during Ascension. A finished item spawns at p = 20 if pop + unit pop ≤ 60,
 * otherwise it waits at 100% ("ARMY FULL") and the next item starts training. Each tick, finished items
 * spawn in queue order as soon as they fit.
 */
import type { CardId, Side } from '@/contracts';
import { emit } from '../events';
import { xOf } from '../geometry';
import { cardLevel, isAscending, type Ctx, type SideRt } from '../state';
import { spawnUnit } from '../units';

export function trainingSystem(ctx: Ctx): void {
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    if (s.queue.length === 0) continue;
    if (!isAscending(ctx, side)) {
      for (const item of s.queue) {
        if (item.progress >= item.total) continue;
        item.progress += 1;
        break;
      }
    }
    let changed = false;
    for (let i = 0; i < s.queue.length; ) {
      const item = s.queue[i];
      if (!item || item.progress < item.total) {
        i += 1;
        continue;
      }
      const r = ctx.rules.units[item.card];
      if (!r) {
        s.queue.splice(i, 1);
        changed = true;
        continue;
      }
      if (s.pop + r.pop > ctx.econ.popCap) {
        if (!item.waiting) {
          item.waiting = true;
          changed = true;
        }
        i += 1;
        continue;
      }
      s.queue.splice(i, 1);
      // A squad card spawns all its members at p 20 on the same tick (X0 M1; spawn overlap is legal, A2.7).
      for (let m = 0; m < r.squad; m += 1) spawnUnit(ctx, side, item.card, xOf(ctx.econ.spawnP, side), cardLevel(ctx, side, item.card), false);
      markPlayed(s, item.card);
      changed = true;
    }
    if (changed) emit(ctx, { e: 'queueChanged', side });
  }
}

/** Adds a card to the side's played list (the opponent's Scouted list, A3), once. */
export function markPlayed(s: SideRt, card: CardId): void {
  if (!s.played.includes(card)) s.played.push(card);
}

/** Legendary units alive or queued for a side (A2.7 Legendary limit). */
export function legendaryCount(ctx: Ctx, side: Side): number {
  let n = 0;
  for (const u of ctx.s.units) {
    if (u.side === side && u.hp > 0 && ctx.rules.unitList[u.ci]?.legendary) n += 1;
  }
  for (const q of ctx.s.sides[side].queue) if (ctx.rules.units[q.card]?.legendary) n += 1;
  return n;
}
