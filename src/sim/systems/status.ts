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
import type { UnitRules } from '../rules';
import type { Ctx, UnitRt } from '../state';
import { alive, unitRules } from '../units';

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
    u.auraGuardBp = 0;
  }
  // Unit auras.
  for (let i = 0; i < units.length; i += 1) {
    const src = units[i] as UnitRt;
    if (!alive(src)) continue;
    const r = unitRules(ctx, src);
    if (!r.aura) continue;
    const aura = r.aura;
    for (let j = 0; j < units.length; j += 1) {
      const u = units[j] as UnitRt;
      if (u === src || u.side !== src.side || !alive(u)) continue;
      const ur = ctx.rules.unitList[u.ci] as UnitRules;
      if (edgeDist(src.x, r.half, u.x, ur.half) > aura.radius) continue;
      if (aura.status.kind === 'attackSpeedBuff' && aura.status.magnitudeBp > u.auraAttackSpeedBp) {
        u.auraAttackSpeedBp = aura.status.magnitudeBp;
      } else if (aura.status.kind === 'damageBuff' && aura.status.magnitudeBp > u.auraDamageBp) {
        u.auraDamageBp = aura.status.magnitudeBp;
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
      if (u === src || u.side !== src.side || !alive(u)) continue;
      if (aura.behindOnly && pOf(u.x, u.side) > srcP) continue;
      const ur = ctx.rules.unitList[u.ci] as UnitRules;
      if (edgeDist(src.x, r.half, u.x, ur.half) > aura.radius) continue;
      if (aura.stat === 'attackSpeed') {
        if (aura.bp > u.auraAttackSpeedBp) u.auraAttackSpeedBp = aura.bp;
      } else if (aura.bp > u.auraGuardBp) u.auraGuardBp = aura.bp;
    }
  }
  // Smoke Screen: the caster's units inside the cloud deal +20% damage (A5.7).
  for (const c of ctx.s.casts) {
    if (tick < c.telegraphEnd || tick > c.endTick) continue;
    const pr = ctx.rules.powers[c.power];
    if (!pr || pr.effect.kind !== 'cloud') continue;
    const fx = pr.effect;
    for (let j = 0; j < units.length; j += 1) {
      const u = units[j] as UnitRt;
      if (u.side !== c.side || !alive(u)) continue;
      if (centreDist(c.x, u.x) <= fx.halfWidth && fx.allyDamageBp > u.auraDamageBp) u.auraDamageBp = fx.allyDamageBp;
    }
  }
}
