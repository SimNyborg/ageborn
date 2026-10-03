/**
 * B3 step 6, statuses (DESIGN A2.7 Status effects): expire, tick regen, innate shield regen and
 * recompute auras.
 *
 * - Timed statuses keep one entry per kind (reapplying takes the max magnitude and expiry).
 * - Regen heals its total evenly over its duration, pulsing on the shared heal grid.
 * - Innate shields (Photon Knight) regenerate after the delay without damage.
 * - Auras (Drum Shaman attack speed, Smoke Screen ally damage, the War Council's War Drums, Rally and
 *   Bulwark) are recomputed every tick and never stack: the strongest applies. Auras affect allies,
 *   not the source itself.
 */
import { edgeDist, centreDist, pOf } from '../geometry';
import { healUnit } from '../damage';
import { emit } from '../events';
import type { UnitRules } from '../rules';
import type { Ctx, UnitRt } from '../state';
import { alive, unitRules } from '../units';
import { fortStatusSystem } from './forts';

export function statusSystem(ctx: Ctx): void {
  const tick = ctx.tick;
  const pulse = ctx.econ.healPulseTicks;
  const onGrid = tick % pulse === 0;
  const units = ctx.s.units;
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i] as UnitRt;
    if (!alive(u)) continue;
    // Expire.
    if (u.statuses.length > 0) {
      let w = 0;
      for (let k = 0; k < u.statuses.length; k += 1) {
        const st = u.statuses[k];
        if (!st) continue;
        if (st.untilTick <= tick) {
          if (st.kind === 'shield') u.shield = 0;
          continue;
        }
        if (st.kind === 'regen' && onGrid && st.amount > 0) {
          // amount = total heal; spread evenly over the remaining pulses.
          const pulsesLeft = Math.max(1, Math.trunc((st.untilTick - tick + pulse - 1) / pulse));
          const part = Math.trunc(st.amount / pulsesLeft);
          st.amount -= part;
          healUnit(ctx, u, part);
        }
        u.statuses[w] = st;
        w += 1;
      }
      u.statuses.length = w;
    }
    // Innate shield regen.
    if (u.innateMax > 0 && u.innateShield < u.innateMax) {
      const r = unitRules(ctx, u);
      if (r.innate && tick - u.lastDamageTick >= r.innate.delayTicks) {
        u.innateShield = Math.min(u.innateMax, u.innateShield + u.innateRegen);
      }
    }
    u.auraAttackSpeedBp = 0;
    u.auraDamageBp = 0;
    u.auraSpeedBp = 0;
    u.auraSlowBp = 0;
    u.auraMarkBp = 0;
    u.auraGuardBp = 0;
  }
  // Unit auras.
  for (let i = 0; i < units.length; i += 1) {
    const src = units[i] as UnitRt;
    if (!alive(src)) continue;
    const r = unitRules(ctx, src);
    if (!r.aura) continue;
    const aura = r.aura;
    if (aura.foe) {
      dreadAura(ctx, src, r, onGrid);
      continue;
    }
    for (let j = 0; j < units.length; j += 1) {
      const u = units[j] as UnitRt;
      // Forts ignore every aura (A16.14.2).
      if (u === src || u.side !== src.side || !alive(u) || u.fort) continue;
      const ur = ctx.rules.unitList[u.ci] as UnitRules;
      if (edgeDist(src.x, r.half, u.x, ur.half) > aura.radius) continue;
      const m = aura.status.magnitudeBp;
      if (aura.status.kind === 'attackSpeedBuff' && m > u.auraAttackSpeedBp) {
        u.auraAttackSpeedBp = m;
      } else if (aura.status.kind === 'damageBuff' && m > u.auraDamageBp) {
        u.auraDamageBp = m;
      } else if (aura.status.kind === 'speedBuff' && m > u.auraSpeedBp) {
        u.auraSpeedBp = m;
      }
    }
  }
  // Research auras (A18.5.2): War Drums (attack speed), Rally and Bulwark (less damage taken; Bulwark
  // only for allies behind the source). They never stack: the strongest applies.
  for (let i = 0; i < units.length; i += 1) {
    const src = units[i] as UnitRt;
    const aura = src.fx?.aura;
    if (!aura || !alive(src)) continue;
    const r = unitRules(ctx, src);
    const srcP = pOf(src.x, src.side);
    for (let j = 0; j < units.length; j += 1) {
      const u = units[j] as UnitRt;
      if (u === src || u.side !== src.side || !alive(u) || u.fort) continue;
      if (aura.behindOnly && pOf(u.x, u.side) > srcP) continue;
      const ur = ctx.rules.unitList[u.ci] as UnitRules;
      if (edgeDist(src.x, r.half, u.x, ur.half) > aura.radius) continue;
      if (aura.stat === 'attackSpeed') {
        if (aura.bp > u.auraAttackSpeedBp) u.auraAttackSpeedBp = aura.bp;
      } else if (aura.bp > u.auraGuardBp) u.auraGuardBp = aura.bp;
    }
  }
  // Smoke Screen: up to 8 of the caster's units inside the cloud, frontmost first (re-picked every
  // tick), deal +20% damage (A5.7, A2.9.5).
  for (const c of ctx.s.casts) {
    if (tick < c.telegraphEnd || tick > c.endTick) continue;
    const pr = ctx.rules.powers[c.power];
    if (!pr || pr.effect.kind !== 'cloud') continue;
    const fx = pr.effect;
    const inside: UnitRt[] = [];
    for (let j = 0; j < units.length; j += 1) {
      const u = units[j] as UnitRt;
      if (u.side !== c.side || !alive(u) || u.fort) continue;
      if (centreDist(c.x, u.x) <= fx.halfWidth) inside.push(u);
    }
    // Frontmost first; levies rank last in every cap (A16.14.3, `capRank`).
    const rank = (u: UnitRt): number => (unitRules(ctx, u).levy ? 1 : 0);
    inside.sort((a, b) => rank(a) - rank(b) || pOf(b.x, c.side) - pOf(a.x, c.side) || a.id - b.id);
    const n = inside.length < fx.allyMax ? inside.length : fx.allyMax;
    for (let j = 0; j < n; j += 1) {
      const u = inside[j] as UnitRt;
      if (fx.allyDamageBp > u.auraDamageBp) u.auraDamageBp = fx.allyDamageBp;
    }
  }
  // Forts: the Hardlight regen and the Sandbag cover (A16.14.3).
  fortStatusSystem(ctx);
}

/**
 * A Dread aura (Bronze wave M4, `aura.foe`): enemy ground units within the radius are slowed (or marked)
 * while inside it; air units, forts and the dead are not. The strongest aura applies (they never stack),
 * and a slow takes the stronger of the aura and any timed slow or snare (`unitSpeed`). On every heal-grid
 * pulse the victims also get a short `statusApplied` event so the view shows the slow mark (events are
 * not hashed; the per-tick fields are recomputed from positions, so they are not hashed either).
 */
function dreadAura(ctx: Ctx, src: UnitRt, r: UnitRules, onGrid: boolean): void {
  const aura = r.aura;
  if (!aura) return;
  const units = ctx.s.units;
  const m = aura.status.magnitudeBp;
  const mark = aura.status.kind === 'mark';
  if (!mark && aura.status.kind !== 'slow') return;
  for (let j = 0; j < units.length; j += 1) {
    const u = units[j] as UnitRt;
    if (u.side === src.side || !alive(u) || u.fort || u.air) continue;
    const ur = ctx.rules.unitList[u.ci] as UnitRules;
    if (edgeDist(src.x, r.half, u.x, ur.half) > aura.radius) continue;
    if (mark) {
      if (m > u.auraMarkBp) u.auraMarkBp = m;
    } else if (m > u.auraSlowBp) u.auraSlowBp = m;
    if (onGrid) emit(ctx, { e: 'statusApplied', id: u.id, kind: aura.status.kind, ms: ctx.econ.healPulseTicks * 100, frozen: false });
  }
}
