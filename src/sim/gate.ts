/** The open gate (A16.4 stall fix, `economy.openGate`), shared by movement and base damage. */
import { pOf } from './geometry';
import type { Ctx, UnitRt } from './state';
import { alive } from './units';

/**
 * True while `side` has an open gate (A16.4 stall fix, `economy.openGate`): none of its living ground
 * units stands within `openGate.clear` of its own gate. Off (always false) when `clear` is 0 and in
 * the unclocked training match. Computed once per tick from the current positions and cached in the
 * context (never carried in the state, so a restored state computes the same answer).
 */
export function gateOpen(ctx: Ctx, side: 0 | 1): boolean {
  const clear = ctx.econ.openGate.clear;
  if (clear <= 0 || ctx.cfg.training?.noClock === true) return false;
  if (ctx.gateOpenTick !== ctx.tick) {
    const open: [boolean, boolean] = [true, true];
    const units = ctx.s.units;
    for (let i = 0; i < units.length; i += 1) {
      const u = units[i] as UnitRt;
      if (u.air || !alive(u)) continue;
      if (pOf(u.x, u.side) <= clear) open[u.side] = false;
    }
    ctx.gateOpen = open;
    ctx.gateOpenTick = ctx.tick;
  }
  return ctx.gateOpen[side];
}
