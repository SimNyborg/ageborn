/**
 * Observation projection (DESIGN B15 `observation.ts`, A7.1 honesty rules).
 *
 * A bot sees what a human could see: the lane, both bases, turrets, both ages and XP percentages, all
 * four power reload rings (the enemy's cards only once cast), visible telegraphs, the opponent's stance, Treasury level and Last Stand state,
 * the Scouted list, and its own gold, queue and tray. Never the opponent's gold, queue or War Plan.
 * Units: positions `p` in milli-lu from the observer's gate; gold in milli-gold (B3 units).
 */
import type { Observation, PowerSlot, ResearchView, Side } from '@/contracts';
import { MILLI, effectiveReloadMs, slotIndex } from '@/core';
import { pOf } from './geometry';
import { ranksOpen, researchProgressBp } from './research';
import { baseHpBp, loadoutOf, other, slotPower, xpBp, type Ctx, type SideRt } from './state';
import { powerCost, powerRateBp } from './systems/powers';

/** My power slot (A2.9.3): the effective cost and reload the sim applies. */
function myPower(ctx: Ctx, side: Side, slot: PowerSlot): Observation['me']['powers']['home'] {
  const id = slotPower(ctx, side, slot);
  const pr = id ? ctx.rules.powers[id] : undefined;
  if (!pr) return null;
  const rateBp = powerRateBp(ctx, side);
  return {
    card: pr.id,
    ppm: ctx.s.sides[side].powerPpm[slotIndex(slot)],
    cost: powerCost(ctx, side, pr),
    reloadMs: effectiveReloadMs(pr.def.reloadMs, rateBp),
    rateBp,
  };
}

/** The opponent's slot (A2.9.7): the ring is public; the card only once scouted (cast). */
function foePower(ctx: Ctx, side: Side, slot: PowerSlot): Observation['foe']['powers']['home'] {
  const id = slotPower(ctx, side, slot);
  if (!id) return null;
  const s = ctx.s.sides[side];
  return { card: s.played.includes(id) ? id : null, ppm: s.powerPpm[slotIndex(slot)] };
}

/** A side's War Council as both players see it (A18.5.1: research is public). */
function researchView(ctx: Ctx, side: Side): ResearchView {
  const r = ctx.s.sides[side].research;
  const picks = ctx.rules.research.picks;
  return {
    owned: r.owned.map((i) => picks[i]?.id ?? ''),
    current: r.cur >= 0 ? (picks[r.cur]?.id ?? null) : null,
    progressBp: researchProgressBp(ctx, side),
    ranksOpen: ranksOpen(ctx, side),
  };
}

/** The six tray slots (A18.9): a shorter loadout plays as empty slots; tutorial trays hide locked slots. */
function trayOf(units: readonly (string | null)[] | undefined, tray: readonly number[] | undefined): Observation['me']['tray'] {
  const out: Observation['me']['tray'] = [];
  for (let i = 0; i < 6; i += 1) {
    const c = units?.[i] ?? null;
    out.push(c && (!tray || tray.includes(i)) ? c : null);
  }
  return out;
}

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
    ages: [...ctx.fmt.ages],
    me: {
      gold: me.gold,
      xpBp: xpBp(ctx, side),
      ageIndex: me.ageIndex,
      queue: me.queue.map((q) => q.card),
      pop: me.pop,
      treasury: me.treasury,
      mountsOwned: me.mountsOwned,
      turrets: turretsOf(me),
      powers: { home: myPower(ctx, side, 'home'), field: myPower(ctx, side, 'field') },
      powerLockoutUntil: me.powerLockoutUntil,
      stance: me.stance,
      holdP: Math.trunc(me.holdP / MILLI),
      research: researchView(ctx, side),
      baseHpBp: baseHpBp(me),
      lastStand: me.lastStand,
      tray: trayOf(lo?.units, tray),
      turretCards: lo ? [...lo.turrets] : [null, null],
    },
    foe: {
      ageIndex: foe.ageIndex,
      xpBp: xpBp(ctx, foeSide),
      powers: { home: foePower(ctx, foeSide, 'home'), field: foePower(ctx, foeSide, 'field') },
      turrets: turretsOf(foe),
      baseHpBp: baseHpBp(foe),
      stance: foe.stance,
      holdP: Math.trunc(foe.holdP / MILLI),
      research: researchView(ctx, foeSide),
      treasury: foe.treasury,
      lastStand: foe.lastStand,
      scouted: [...foe.played],
    },
    telegraphs: s.casts
      .filter((c) => s.tick < c.telegraphEnd)
      .map((c) => ({ side: c.side, slot: c.slot, power: c.power, p: pOf(c.x, side), zone: c.zone, impactTick: c.telegraphEnd, targetId: c.targetId })),
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
      summoned: u.summoned,
    })),
  };
}
