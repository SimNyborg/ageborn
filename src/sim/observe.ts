/**
 * Observation projection (DESIGN B15 `observation.ts`, A7.1 honesty rules).
 *
 * A bot sees what a human could see: the lane, both bases, turrets, both ages and XP percentages, both
 * power charge rings, visible telegraphs, the opponent's stance, Treasury level and Last Stand state,
 * the Scouted list, and its own gold, queue and tray. Never the opponent's gold, queue or War Plan.
 * Units: positions `p` in milli-lu from the observer's gate; gold in milli-gold (B3 units).
 */
import type { Observation, Side } from '@/contracts';
import { pOf } from './geometry';
import { baseHpBp, loadoutOf, other, xpBp, type Ctx, type SideRt } from './state';

function turretsOf(s: SideRt): Observation['me']['turrets'] {
  return s.turrets.map((t) => (t ? { card: t.card, age: t.age } : null));
}

export function observe(ctx: Ctx, side: Side): Observation {
  const s = ctx.s;
  const me = s.sides[side];
  const foeSide = other(side);
  const foe = s.sides[foeSide];
  const lo = loadoutOf(ctx, side);
  const tray = me.trays?.[ctx.fmt.ages[me.ageIndex] ?? 'stone'];
  return {
    tick: s.tick,
    side,
    phase: s.phase,
    me: {
      gold: me.gold,
      xpBp: xpBp(ctx, side),
      ageIndex: me.ageIndex,
      queue: me.queue.map((q) => q.card),
      pop: me.pop,
      treasury: me.treasury,
      mountsOwned: me.mountsOwned,
      turrets: turretsOf(me),
      powerPpm: me.powerPpm,
      stance: me.stance,
      baseHpBp: baseHpBp(me),
      lastStand: me.lastStand,
      tray: lo ? lo.units.map((c, i) => (c && (!tray || tray.includes(i)) ? c : null)) : [null, null, null, null, null],
      turretCards: lo ? [...lo.turrets] : [null, null],
      power: lo ? lo.power : '',
    },
    foe: {
      ageIndex: foe.ageIndex,
      xpBp: xpBp(ctx, foeSide),
      powerPpm: foe.powerPpm,
      turrets: turretsOf(foe),
      baseHpBp: baseHpBp(foe),
      stance: foe.stance,
      treasury: foe.treasury,
      lastStand: foe.lastStand,
      scouted: [...foe.played],
    },
    telegraphs: s.casts
      .filter((c) => s.tick < c.telegraphEnd)
      .map((c) => ({ side: c.side, power: c.power, p: pOf(c.x, side), zone: c.zone, impactTick: c.telegraphEnd })),
    units: s.units.map((u) => ({
      id: u.id,
      side: u.side,
      card: u.card,
      level: u.level,
      p: pOf(u.x, side),
      hp: u.hp,
      maxHp: u.maxHp,
      shield: u.shield + u.innateShield,
      air: u.air,
    })),
  };
}
