/**
 * The onboarding autopilot (DESIGN B13 e2e: "tutorial match 1 on autopilot (`?dev=1&autopilot=1`
 * issues scripted commands)"). It plays the player's side the way a quick new player follows the
 * prompts, through the same command API and from the same `Observation` a bot gets:
 *
 * - train the unlocked tray cards whenever affordable (keeping a mix of melee and ranged),
 * - build the first turret once the script grants its gold, evolve when the XP bar is full,
 * - drag the Age Power onto the densest enemy group, buy Treasury and a second mount when asked.
 *
 * The retiming run (`test/retime.test.ts`) uses it to measure the A8 beat times.
 */
import type { BotController, Command, CompiledContent, Observation, Side } from '@/contracts';
import { nextIncomePick, researchCommand, researchCost } from '@/core';

export interface AutopilotOptions {
  side?: Side;
  /** Reaction delay in ticks (a person needs ~0.5 s). */
  delayTicks?: number;
  /** Build the first turret from this tick on (match 1: when the script grants its gold). */
  turretFromTick?: number;
  /** Do not evolve past this age index (the format's last age). */
  maxAgeIndex?: number;
  /** Buy Treasury (match 2 teaches it). */
  treasury?: boolean;
  /** Buy a second mount from this age index on (match 2 teaches it in Medieval). */
  secondMountFromAge?: number | null;
  /** Ticks between decisions (a new player taps about every 1.5-2 s). */
  decideEveryTicks?: number;
  /** First action not before this tick (the first tap lands at ~0:03, A8). */
  startTick?: number;
}

const PPM_FULL = 1_000_000;
/** Where the power lands when no enemy is on the field (own-side p, lu). */
const POWER_DEFAULT_P = 700;

export class TutorialAutopilot implements BotController {
  readonly snapshotDelayTicks: number;
  private readonly side: Side;
  private readonly o: Required<Omit<AutopilotOptions, 'side' | 'delayTicks'>>;
  private nextDecision = 0;
  private lastTrainedSlot = -1;

  constructor(
    private readonly content: CompiledContent,
    o: AutopilotOptions = {},
  ) {
    this.side = o.side ?? 0;
    this.snapshotDelayTicks = o.delayTicks ?? 10;
    this.o = {
      turretFromTick: o.turretFromTick ?? 0,
      maxAgeIndex: o.maxAgeIndex ?? 4,
      treasury: o.treasury ?? false,
      secondMountFromAge: o.secondMountFromAge ?? null,
      decideEveryTicks: Math.max(1, o.decideEveryTicks ?? 10),
      startTick: o.startTick ?? 0,
    };
  }

  onTick(obs: Observation): Command[] {
    if (obs.phase === 'ended' || obs.tick < this.nextDecision || obs.tick < this.o.startTick) return [];
    this.nextDecision = obs.tick + this.o.decideEveryTicks;
    const c = this.decide(obs);
    return c ? [c] : [];
  }

  private decide(obs: Observation): Command | null {
    const side = this.side;
    const me = obs.me;
    const gold = Math.floor(me.gold / 1000);
    if (me.lastStand === 'armed') return { t: 'lastStand', side };
    // A ready power goes first: the prompt asks for it, and the evolve would halve its charge.
    const aim = this.powerAim(obs);
    const home = me.powers.home;
    if (home && home.ppm >= PPM_FULL && gold >= home.cost && aim !== null) return { t: 'power', side, slot: 'home', p: aim };
    if (me.xpBp >= 10000 && me.ageIndex < this.o.maxAgeIndex) return { t: 'evolve', side };
    const turretCard = me.turretCards[0] ?? null;
    const turretCost = turretCard ? (this.content.turrets[turretCard]?.cost ?? Infinity) : Infinity;
    if (obs.tick >= this.o.turretFromTick && me.turrets[0] === null && me.mountsOwned > 0 && gold >= turretCost) {
      return { t: 'buildTurret', side, mount: 0, slot: 0 };
    }
    // The Treasury is the Economy track's income research now (A18.5.4): the first pick is Granary.
    const income = nextIncomePick(this.content, me.research);
    if (this.o.treasury && me.treasury === 0 && income && gold >= researchCost(this.content, income)) return researchCommand(side, income);
    const mountCost = this.content.economy.mountCosts[me.mountsOwned];
    if (
      this.o.secondMountFromAge !== null &&
      me.ageIndex >= this.o.secondMountFromAge &&
      me.mountsOwned === 1 &&
      mountCost !== undefined &&
      gold >= mountCost
    ) {
      return { t: 'buyMount', side };
    }
    return this.train(obs, gold);
  }

  /** The own-side p (lu) of the densest enemy group, or the default spot when the lane is empty. */
  private powerAim(obs: Observation): number | null {
    const foes = obs.units.filter((u) => u.side !== this.side && !u.air).map((u) => u.p);
    if (foes.length === 0) return POWER_DEFAULT_P;
    let best = foes[0]!;
    let bestCount = 0;
    for (const p of foes) {
      const n = foes.filter((q) => Math.abs(q - p) <= 150_000).length;
      if (n > bestCount) {
        bestCount = n;
        best = p;
      }
    }
    return Math.round(best / 1000);
  }

  private train(obs: Observation, gold: number): Command | null {
    const me = obs.me;
    if (me.queue.length >= 3) return null;
    const slots = me.tray
      .map((card, slot) => ({ card, slot, def: card ? this.content.units[card] : undefined }))
      .filter((s) => s.card !== null && s.def !== undefined);
    if (slots.length === 0) return null;
    // Alternate between the unlocked cards so melee and ranged mix (a front line with support behind).
    const start = slots.findIndex((s) => s.slot > this.lastTrainedSlot);
    const ordered = start < 0 ? slots : [...slots.slice(start), ...slots.slice(0, start)];
    const pick = ordered[0]!;
    if ((pick.def?.cost ?? Infinity) > gold) return null;
    this.lastTrainedSlot = pick.slot;
    return { t: 'train', side: this.side, slot: pick.slot as 0 | 1 | 2 | 3 | 4 };
  }
}

export function createTutorialAutopilot(content: CompiledContent, o?: AutopilotOptions): TutorialAutopilot {
  return new TutorialAutopilot(content, o);
}
