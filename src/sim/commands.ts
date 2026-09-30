/**
 * B3 step 1: apply this tick's commands, sorted by (side, seq), then this tick's training script events
 * (DESIGN B3, B15 `commands.ts`, A2.12 controls, A2.7 Training, A2.8 Turrets, A2.4 Evolve).
 *
 * Invalid commands are ignored and emit `commandRejected` with a reason code:
 * `badCommand`, `emptySlot`, `lockedSlot`, `queueFull`, `legendaryLimit`, `noGold`, `nothingToCancel`,
 * `badMount`, `mountLocked`, `mountBusy`, `mountEmpty`, `notOutdated`, `maxMounts`,
 * `finalAge`, `ascending`, `notEnoughXp`, the power reasons (`noPower`, `powerReloading`, `powerLockout`,
 * `powerOutOfReach`, `powerNoTarget`, `noGold`; A2.9.7), `stanceLocked`, `sameStance`,
 * `stanceCooldown`, `flagCooldown`, `lastStandAuto`, `lastStandNotArmed`, `emoteCooldown`, `retreatLocked`,
 * the War Council reasons in `research.ts` (A18.5.1), and the fort reasons (A16.14.2, `systems/forts.ts`):
 * `noFort`, `fortSiege`, `fortRecharge`, `fortMax`, `fortCampMax`, `fortPadKind`, `fortPadTaken`,
 * `fortPadEnemy`, `fortPadField`, `popFull`, `noGold`.
 */
import type { Command, Side, TimedCommand, TrainingEvent } from '@/contracts';
import { BP, MILLI, PPM, isPowerSlot, slotIndex } from '@/core';
import { emit } from './events';
import {
  ageOf,
  canEvolve,
  cardLevel,
  isAscending,
  isFinalAge,
  loadoutOf,
  unitCost,
  NEVER,
  NO_TARGET,
  type Ctx,
  type SideRt,
  type TurretRt,
} from './state';
import { cancelResearch, startResearch } from './research';
import { addPower } from './systems/economy';
import { startLastStand } from './systems/laststand';
import { placeFort } from './systems/forts';
import { castPower } from './systems/powers';
import { legendaryCount, markPlayed } from './systems/training';

/** Orders commands for one tick: side, then seq (stable). */
export function sortCommands(cmds: readonly TimedCommand[]): TimedCommand[] {
  return [...cmds].sort((a, b) => a.side - b.side || a.seq - b.seq);
}

export function applyCommands(ctx: Ctx, cmds: readonly TimedCommand[]): void {
  for (const c of cmds) {
    if (c.side !== 0 && c.side !== 1) continue;
    const reason = applyCommand(ctx, c);
    if (reason === null) continue;
    if (c.t === 'power' && (c.slot === 'home' || c.slot === 'field')) {
      emit(ctx, { e: 'commandRejected', side: c.side, t: c.t, reason, slot: c.slot });
    } else emit(ctx, { e: 'commandRejected', side: c.side, t: c.t, reason });
  }
}


const isSlot = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < max;

/** Tray slots per loadout (A18.9: six troops). */
export const TRAY_SLOTS = 6;

/** Clamps a Hold flag p (lu) to the flag range and snaps it to the flag step (A18.4.2), in mlu. */
export function clampHoldP(ctx: Ctx, holdP: number): number {
  const e = ctx.econ;
  const want = Math.trunc(holdP * MILLI);
  const c = want < e.holdMin ? e.holdMin : want > e.holdMax ? e.holdMax : want;
  if (e.holdSnap <= 0) return c;
  const snapped = e.holdMin + Math.trunc((c - e.holdMin + (e.holdSnap >> 1)) / e.holdSnap) * e.holdSnap;
  return snapped > e.holdMax ? e.holdMax : snapped;
}

/** A command may not touch the marked turret of a `target` victory (A18.7.3). */
function markedMount(s: SideRt, mount: number): boolean {
  return s.markMount >= 0 && s.markMount === mount && s.markHp !== 0;
}

function freshAttack(): TurretRt['attack'] {
  return { targetId: NO_TARGET, impactTick: 0, nextAttackTick: 0, lastAttackTick: NEVER, retargetTick: 0, firstHit: false, bite: false };
}

/** Applies one command. Returns a rejection reason, or null when applied. */
export function applyCommand(ctx: Ctx, c: Command): string | null {
  const side: Side = c.side;
  const s = ctx.s.sides[side];
  const e = ctx.econ;
  switch (c.t) {
    case 'train': {
      if (!isSlot(c.slot, TRAY_SLOTS)) return 'badCommand';
      const card = loadoutOf(ctx, side)?.units[c.slot] ?? null;
      const r = card ? ctx.rules.units[card] : undefined;
      if (!card || !r) return 'emptySlot';
      const tray = s.trays?.[ageOf(ctx, side)];
      if (tray && !tray.includes(c.slot)) return 'lockedSlot';
      if (s.queue.length >= e.queueMax) return 'queueFull';
      if (r.legendary && legendaryCount(ctx, side) >= e.legendaryLimit) return 'legendaryLimit';
      const cost = unitCost(ctx, card);
      if (s.gold < cost) return 'noGold';
      s.gold -= cost;
      s.queue.push({ card, group: r.group, progress: 0, total: r.trainTicks, waiting: false, paid: cost });
      emit(ctx, { e: 'queueChanged', side });
      return null;
    }
    case 'cancelTrain': {
      let idx = s.queue.length - 1;
      if (c.slot !== undefined) {
        if (!isSlot(c.slot, TRAY_SLOTS)) return 'badCommand';
        const card = loadoutOf(ctx, side)?.units[c.slot] ?? null;
        idx = -1;
        for (let i = s.queue.length - 1; i >= 0; i -= 1) {
          if (s.queue[i]?.card === card) {
            idx = i;
            break;
          }
        }
      }
      const item = idx >= 0 ? s.queue[idx] : undefined;
      if (!item) return 'nothingToCancel';
      s.queue.splice(idx, 1);
      s.gold += item.paid;
      emit(ctx, { e: 'queueChanged', side });
      return null;
    }
    case 'buildTurret': {
      if (!isSlot(c.mount, e.mountCount) || !isSlot(c.slot, 2)) return 'badCommand';
      if (c.mount >= s.mountsOwned) return 'mountLocked';
      if (s.turrets[c.mount]) return 'mountBusy';
      const card = loadoutOf(ctx, side)?.turrets[c.slot] ?? null;
      const tr = card ? ctx.rules.turrets[card] : undefined;
      if (!card || !tr) return 'emptySlot';
      const cost = tr.cost * MILLI;
      if (s.gold < cost) return 'noGold';
      s.gold -= cost;
      s.turrets[c.mount] = {
        card,
        age: tr.age,
        level: cardLevel(ctx, side, card),
        state: 'building',
        readyTick: ctx.tick + e.turretBuildTicks,
        attack: freshAttack(),
      };
      markPlayed(s, card);
      emit(ctx, { e: 'turretBuildStart', side, mount: c.mount, card });
      return null;
    }
    case 'replaceTurret': {
      if (!isSlot(c.mount, e.mountCount) || !isSlot(c.slot, 2)) return 'badCommand';
      const t = s.turrets[c.mount];
      if (!t) return 'mountEmpty';
      if (markedMount(s, c.mount)) return 'mountLocked';
      if (t.state !== 'active') return 'mountBusy';
      const old = ctx.rules.turrets[t.card];
      if (!old || old.ageIdx >= ctx.rules.ageIdx[ageOf(ctx, side)]) return 'notOutdated';
      const card = loadoutOf(ctx, side)?.turrets[c.slot] ?? null;
      const tr = card ? ctx.rules.turrets[card] : undefined;
      if (!card || !tr) return 'emptySlot';
      // Modernise: the new price minus 50% of the old turret's price (A2.3, A2.8); Engineers halve it
      // and build in 0.5 s (A18.5.3).
      const credit = Math.trunc((old.cost * MILLI * e.moderniseCreditBp) / BP);
      const price = Math.trunc((Math.max(0, tr.cost * MILLI - credit) * s.fx.moderniseBp) / BP);
      if (s.gold < price) return 'noGold';
      s.gold -= price;
      s.turrets[c.mount] = {
        card,
        age: tr.age,
        level: cardLevel(ctx, side, card),
        state: 'replacing',
        readyTick: ctx.tick + (s.fx.moderniseTicks > 0 ? s.fx.moderniseTicks : e.turretBuildTicks),
        attack: freshAttack(),
      };
      markPlayed(s, card);
      emit(ctx, { e: 'turretReplaced', side, mount: c.mount, card });
      return null;
    }
    case 'sellTurret': {
      if (!isSlot(c.mount, e.mountCount)) return 'badCommand';
      const t = s.turrets[c.mount];
      if (!t) return 'mountEmpty';
      if (markedMount(s, c.mount)) return 'mountLocked';
      if (t.state !== 'active') return 'mountBusy';
      t.state = 'selling';
      t.readyTick = ctx.tick + e.turretSellTicks;
      emit(ctx, { e: 'turretSold', side, mount: c.mount, card: t.card });
      return null;
    }
    case 'buyMount': {
      if (s.mountsOwned >= e.mountCount) return 'maxMounts';
      const cost = e.mountCosts[s.mountsOwned] ?? 0;
      if (s.gold < cost) return 'noGold';
      s.gold -= cost;
      const mount = s.mountsOwned;
      s.mountsOwned += 1;
      emit(ctx, { e: 'mountBought', side, mount });
      return null;
    }
    case 'research':
      return startResearch(ctx, side, c);
    case 'researchCancel':
      return cancelResearch(ctx, side);
    case 'evolve': {
      if (isFinalAge(ctx, side)) return 'finalAge';
      if (isAscending(ctx, side)) return 'ascending';
      if (!canEvolve(ctx, side)) return 'notEnoughXp';
      s.ascendUntil = ctx.tick + e.ascendTicks;
      emit(ctx, { e: 'ascendStart', side, age: ctx.fmt.ages[s.ageIndex + 1] ?? ageOf(ctx, side) });
      return null;
    }
    case 'power':
      return castPower(ctx, side, c.slot, c.p);
    case 'stance': {
      // A18.4.2: three stances; a mode change at most once per 3 s, a flag move at most once per 1 s.
      if (!ctx.stanceEnabled[side]) return 'stanceLocked';
      if (c.mode !== 'charge' && c.mode !== 'hold' && c.mode !== 'fallback') return 'badCommand';
      if (c.holdP !== undefined && (typeof c.holdP !== 'number' || !Number.isFinite(c.holdP))) return 'badCommand';
      const flag = c.holdP === undefined ? s.holdP : clampHoldP(ctx, c.holdP);
      if (c.mode === s.stance) {
        // Same mode: a Hold flag move while holding, else nothing to do.
        if (c.mode !== 'hold' || flag === s.holdP) return 'sameStance';
        if (ctx.tick < s.flagReadyTick) return 'flagCooldown';
        s.holdP = flag;
        s.flagReadyTick = ctx.tick + e.flagMoveTicks;
        emit(ctx, { e: 'stanceChanged', side, stance: s.stance, holdP: Math.trunc(s.holdP / MILLI) });
        return null;
      }
      if (ctx.tick < s.stanceReadyTick) return 'stanceCooldown';
      s.stance = c.mode;
      s.stanceReadyTick = ctx.tick + e.stanceCooldownTicks;
      if (flag !== s.holdP) {
        s.holdP = flag;
        s.flagReadyTick = ctx.tick + e.flagMoveTicks;
      }
      emit(ctx, { e: 'stanceChanged', side, stance: s.stance, holdP: Math.trunc(s.holdP / MILLI) });
      return null;
    }
    case 'fort':
      return placeFort(ctx, side, c.pad);
    case 'lastStand': {
      if (!ctx.manualLastStand[side]) return 'lastStandAuto';
      if (s.lastStand !== 'armed') return 'lastStandNotArmed';
      startLastStand(ctx, side);
      return null;
    }
    case 'emote': {
      // Starter emotes, collected emotes and fixed quotes the content lists (A18.9.4); nothing else
      if (typeof c.emote !== 'string' || !ctx.rules.emotes.has(c.emote)) return 'badCommand';
      if (ctx.tick < s.emoteReadyTick) return 'emoteCooldown';
      s.emoteReadyTick = ctx.tick + e.emoteCooldownTicks;
      emit(ctx, { e: 'emote', side, emote: c.emote });
      return null;
    }
    case 'retreat': {
      if (ctx.retreatTick === null || ctx.tick < ctx.retreatTick) return 'retreatLocked';
      s.retreated = true;
      return null;
    }
    default:
      return 'badCommand';
  }
}

/** Applies the training script events due this tick (tutorial, DESIGN A8, B3 step 1). */
export function applyScript(ctx: Ctx): void {
  const script = ctx.script;
  while (ctx.scriptCursor < script.length) {
    const ev = script[ctx.scriptCursor] as TrainingEvent;
    if (ev.tick > ctx.tick) break;
    ctx.scriptCursor += 1;
    applyTrainingEvent(ctx, ev);
  }
}

function applyTrainingEvent(ctx: Ctx, ev: TrainingEvent): void {
  if (ev.side !== 0 && ev.side !== 1) return;
  const s = ctx.s.sides[ev.side];
  if (ev.grantGold !== undefined && ev.grantGold > 0) s.gold += Math.trunc(ev.grantGold * MILLI);
  if (ev.unlockSlot !== undefined && s.trays) {
    const age = ageOf(ctx, ev.side);
    const tray = s.trays[age];
    if (tray && !tray.includes(ev.unlockSlot)) {
      tray.push(ev.unlockSlot);
      tray.sort((a, b) => a - b);
    }
  }
  const set = ev.setPowerPpm;
  if (set !== undefined && isPowerSlot(set.slot) && typeof set.ppm === 'number' && Number.isFinite(set.ppm)) {
    const i = slotIndex(set.slot);
    const v = Math.max(0, Math.min(PPM, Math.trunc(set.ppm)));
    if (v >= PPM) addPower(ctx, ev.side, set.slot, PPM - s.powerPpm[i]);
    else {
      s.powerPpm[i] = v;
      s.powerRem[i] = 0;
    }
  }
}
