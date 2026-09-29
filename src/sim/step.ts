/**
 * The tick pipeline (DESIGN B3). The steps MUST run in this order.
 */
import type { SimEvent, TimedCommand } from '@/contracts';
import { applyCommands, applyScript } from './commands';
import { hashState } from './hashState';
import { researchSystem } from './research';
import { buildSpatial } from './spatial';
import type { Ctx } from './state';
import { abilitySystem } from './systems/abilities';
import { ascendSystem } from './systems/ascend';
import { clockSystem } from './systems/clock';
import { combatSystem } from './systems/combat';
import { deathSystem } from './systems/deaths';
import { economySystem } from './systems/economy';
import { impactSystem } from './systems/impacts';
import { lastStandSystem } from './systems/laststand';
import { movementSystem } from './systems/movement';
import { powerSystem } from './systems/powers';
import { projectileSystem } from './systems/projectiles';
import { statusSystem } from './systems/status';
import { trainingSystem } from './systems/training';
import { turretFireSystem, turretTimerSystem } from './systems/turrets';
import { winSystem } from './systems/win';

/** Hash cadence (B3 step 17): every 20 ticks. */
export const HASH_EVERY = 20;

/** Runs one 50 ms tick with this tick's commands (already sorted by side, seq). Returns its events. */
export function stepTick(ctx: Ctx, cmds: readonly TimedCommand[]): SimEvent[] {
  const s = ctx.s;
  if (s.outcome) return [];
  ctx.tick = s.tick + 1;
  s.tick = ctx.tick;
  ctx.ev = [];
  // Interpolation bookkeeping: prevX is the position at the end of the previous tick (B3 step 17, B6).
  for (const u of s.units) u.prevX = u.x;

  applyCommands(ctx, cmds); //                1. commands, then the training script
  applyScript(ctx);
  clockSystem(ctx); //                        2. clock and phase, Siege decay
  economySystem(ctx); //                      3. passive gold and XP, XP cap, Overcharge, power charge
  ascendSystem(ctx); //                       4. Ascension (queue conversion, Vanguard), turret timers,
  turretTimerSystem(ctx); //                     War Council research completion (A18.5.1)
  researchSystem(ctx);
  trainingSystem(ctx); //                     5. training and spawns
  statusSystem(ctx); //                       6. statuses, regen, innate shields, auras
  buildSpatial(ctx); //                          (index for the range queries of steps 7-9)
  abilitySystem(ctx); //                      7. heals, Roar, EMP, Time Stop, pounce, called strikes
  combatSystem(ctx); //                       8. unit attack state machines (collect)
  turretFireSystem(ctx); //                   9. turrets, mount order, side 0 then 1 (collect)
  projectileSystem(ctx); //                  10. projectiles advance; arrivals add impacts
  powerSystem(ctx); //                       11. power casts: telegraphs, due impacts
  lastStandSystem(ctx); //                   12. Last Stand arming, charge, blast
  impactSystem(ctx); //                      13. impact resolution, then knockback and pulls
  deathSystem(ctx); //                       14. deaths, bounties, on-death effects, compaction
  movementSystem(ctx); //                    15. movement
  winSystem(ctx); //                         16. win check
  if (s.tick % HASH_EVERY === 0) s.hashes.push(hashState(s)); // 17. state hash
  return ctx.ev;
}
