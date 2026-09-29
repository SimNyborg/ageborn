/**
 * The battle HUD model (DESIGN A9.2, B6 HUD, B15 `hud.ts`). Built from read-only sim state at 15 Hz
 * by the session and rendered by the Preact overlay in `ui/hud`.
 *
 * Units: gold and costs are whole gold, `goldPerSec` may have one decimal, XP and HP are bp
 * (`xpBp` is XP as bp of the current threshold, can exceed 10,000 up to the 1.5× cap; in the final age
 * of the format it is measured against the Overcharge amount), power charge is ppm, times are ms.
 */
import type { AgeId, CardId, CardState, Foil, HudCard, HudModel, HudResearch, MatchConfig, Observation, Side, SideState, SimState } from '@/contracts';
import { incomeMilliPerSec, matchMods, nextIncomePick, researchCost, type MatchMods } from '@/core';

/** HUD refresh rate (B6). */
export const HUD_HZ = 15;

export interface HudSource {
  readonly state: Readonly<SimState>;
  readonly config: Readonly<MatchConfig>;
  observe(side: Side): Observation;
}

export interface HudExtras {
  speed: 1 | 1.5 | 2;
  paused: boolean;
  /** Owned foils per card (from the save); default none. */
  foils?: Partial<Record<CardId, Foil>>;
}

const other = (s: Side): Side => (s === 0 ? 1 : 0);

/**
 * The match's ages in play order: `SideState.ageIndex` is a position in this list (A17.15 rule 4).
 * The format's own list (the tutorial skips ages); every age in index order when the format is unknown.
 */
export function ageOrder(config: Readonly<MatchConfig>): AgeId[] {
  const fmt = config.content.formats[config.format];
  if (fmt) return [...fmt.ages];
  return Object.values(config.content.ages)
    .sort((a, b) => a.index - b.index)
    .map((a) => a.id);
}

/** The match's Daily Challenge rule changes (A9.1), read exactly as the sim reads them. */
export function hudMods(config: Readonly<MatchConfig>): MatchMods {
  return matchMods(config.modifiers, config.content);
}

/**
 * XP needed to leave age `ageIndex` in this format, in whole XP (Fast Forward applied, as in the
 * sim); null in the format's final age.
 */
export function xpThreshold(config: Readonly<MatchConfig>, ageIndex: number): number | null {
  const fmt = config.content.formats[config.format];
  const ages = ageOrder(config);
  const age = ages[ageIndex];
  if (!age || !fmt) return null;
  const last = fmt.ages[fmt.ages.length - 1];
  if (age === last || ageIndex >= fmt.ages.length - 1) return null;
  const base = fmt.xpToNextOverride?.[ageIndex] ?? config.content.ages[age].xpToNext;
  if (base === null) return null;
  return Math.trunc((base * 1000 * hudMods(config).xpThresholdBp) / 10000) / 1000;
}

/** A unit card's price for this match (Heavy Metal applied, as in the sim), in whole gold. */
export function unitPrice(config: Readonly<MatchConfig>, card: CardId): number {
  const def = config.content.units[card];
  if (!def) return 0;
  return Math.trunc((def.cost * 1000 * (hudMods(config).costBp[def.group] ?? 10000)) / 10000) / 1000;
}

/** XP bar fill in bp: of the threshold, or of the Overcharge amount in the final age (A2.4). */
export function xpBarBp(config: Readonly<MatchConfig>, ageIndex: number, xpMilli: number): number {
  const need = xpThreshold(config, ageIndex) ?? config.content.economy.overchargeXp;
  if (!(need > 0)) return 0;
  return Math.max(0, Math.floor((xpMilli * 10000) / (need * 1000)));
}

/** True when `side` may evolve now (A2.4: XP ≥ threshold, not the final age, not ascending). */
export function canEvolve(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side): boolean {
  const s = state.sides[side];
  const need = xpThreshold(config, s.ageIndex);
  return need !== null && s.xp >= need * 1000 && s.ascendUntil <= state.tick && state.phase !== 'ended';
}

function hpBp(hp: number, max: number): number {
  return max > 0 ? Math.max(0, Math.floor((hp * 10000) / max)) : 0;
}

/** Base HP in bp as the sim's underdog rule reads it (truncated, never below 0). */
function simHpBp(s: Readonly<SideState>): number {
  if (s.baseMaxHp <= 0) return 0;
  return Math.trunc((Math.max(0, s.baseHp) * 10000) / s.baseMaxHp);
}

/**
 * The underdog research discount (A18.5.1), read exactly as the sim reads it: a lower age position
 * than the enemy's, or a base HP 20 or more points below theirs.
 */
export function researchDiscount(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side): boolean {
  const u = config.content.research.underdog;
  if (u.discountBp <= 0) return false;
  const me = state.sides[side];
  const foe = state.sides[other(side)];
  if (me.ageIndex < foe.ageIndex) return true;
  return u.baseGapBp > 0 && simHpBp(foe) - simHpBp(me) >= u.baseGapBp;
}

/** A side's War Council for the HUD (A18.5.7), from its observation view and the research timer. */
function hudResearch(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side, view: Observation['me']['research']): HudResearch {
  const r = state.sides[side].research;
  const busy = r.cur >= 0;
  return {
    owned: [...view.owned],
    current: view.current,
    progressBp: view.progressBp,
    leftMs: busy ? Math.max(0, (r.endTick - state.tick) * 50) : 0,
    ranksOpen: view.ranksOpen,
    discount: researchDiscount(state, config, side),
  };
}

/**
 * Tracks the tutorial tray (A8: `training.trays` restricts side 0's slots; scripted `unlockSlot` events
 * add a slot to the side's current age as they pass). Feed it every state you build from.
 */
export class TrayUnlocks {
  private readonly extra = new Map<AgeId, Set<number>>();
  private cursor = 0;

  constructor(private readonly config: Readonly<MatchConfig>) {}

  observe(state: Readonly<SimState>): void {
    const script = this.config.training?.script ?? [];
    const ages = ageOrder(this.config);
    while (this.cursor < script.length) {
      const ev = script[this.cursor];
      if (!ev || ev.tick > state.tick) break;
      this.cursor++;
      if (ev.unlockSlot === undefined) continue;
      const age = ages[state.sides[ev.side].ageIndex];
      if (!age) continue;
      let set = this.extra.get(age);
      if (!set) this.extra.set(age, (set = new Set()));
      set.add(ev.unlockSlot);
    }
  }

  /** True when tray slot `slot` is usable in `age` for `side`. */
  unlocked(side: Side, age: AgeId, slot: number): boolean {
    if (side !== 0) return true;
    const trays = this.config.training?.trays;
    const base = trays?.[age];
    if (!base) return true;
    return base.includes(slot) || (this.extra.get(age)?.has(slot) ?? false);
  }
}

function cardFor(
  state: Readonly<SimState>,
  config: Readonly<MatchConfig>,
  side: Side,
  slot: number,
  card: CardId | null,
  unlocked: boolean,
  foils: Partial<Record<CardId, Foil>>,
): HudCard {
  const def = card ? config.content.units[card] : undefined;
  const empty: HudCard = { slot, card: null, cost: 0, queued: 0, trainFillBp: 0, state: 'empty', foil: 'none' };
  if (!card || !def || !unlocked) return empty;
  const s = state.sides[side];
  const eco = config.content.economy;
  const queue = s.queue;
  const queued = queue.filter((q) => q.card === card).length;
  const waiting = queue.some((q) => q.card === card && q.waiting);
  const training = queue.find((q) => !q.waiting);
  let fill = 0;
  if (waiting) fill = 10000;
  else if (training && training.card === card && training.total > 0) fill = Math.min(10000, Math.floor((training.progress * 10000) / training.total));
  const cost = unitPrice(config, card);
  let st: CardState = 'ready';
  const legendary = def.group === 'legendary';
  const legendaryOut =
    legendary &&
    (queue.some((q) => q.group === 'legendary') ||
      state.units.some((u) => u.side === side && !u.summoned && config.content.units[u.card]?.group === 'legendary'));
  if (waiting) st = 'armyFull';
  else if (legendaryOut) st = 'legendaryInField';
  else if (s.gold < cost * 1000 || queue.length >= eco.queueMax || state.phase === 'ended') st = 'unaffordable';
  return { slot, card, cost, queued, trainFillBp: fill, state: st, foil: foils[card] ?? 'none' };
}

/** Builds the HUD model for `side` (the player is side 0; the replay viewer may show side 1). */
export function buildHudModel(src: HudSource, extras: HudExtras, side: Side = 0, tray?: TrayUnlocks): HudModel {
  const state = src.state;
  const config = src.config;
  const content = config.content;
  const eco = content.economy;
  const foeSide = other(side);
  const me = state.sides[side];
  const foe = state.sides[foeSide];
  const ages = ageOrder(config);
  const myAge = ages[me.ageIndex] ?? ages[0] ?? 'stone';
  const loadout = config.sides[side].loadouts[myAge];
  const fmt = content.formats[config.format];
  const noClock = config.training?.noClock === true;
  const clockMs = state.tick * 50;
  const doubled = state.phase === 'overdrive' || state.phase === 'siege';
  const mods = hudMods(config);
  const obs = src.observe(side);
  const obsMe = obs.me;
  // Economy research income is never doubled (A18.5.4, the Treasury before).
  const goldPerSec =
    (((eco.passiveGoldPerSec * mods.passiveGoldBp) / 10000) * (doubled ? eco.overdrive.baseGoldBp : 10000)) / 10000 +
    incomeMilliPerSec(content, obsMe.research.owned) / 1000;
  const incomePick = nextIncomePick(content, obsMe.research);
  const siegeMs = fmt?.siegeMs ?? null;
  const foils = extras.foils ?? {};
  const cards: HudCard[] = [];
  // Six troops per battle (A18.9).
  for (let slot = 0; slot < 6; slot++) {
    const card = loadout?.units[slot] ?? null;
    const unlocked = tray ? tray.unlocked(side, myAge, slot) : true;
    cards.push(cardFor(state, config, side, slot, card, unlocked, foils));
  }
  const retreatAfter = fmt?.retreatAfterMs ?? null;
  return {
    clockMs,
    phase: state.phase,
    phaseMarks: noClock
      ? { overdriveMs: null, siegeMs: null, finalBellMs: null }
      : { overdriveMs: fmt?.overdriveMs ?? null, siegeMs: siegeMs === null ? null : Math.max(50, siegeMs - mods.siegeEarlierMs), finalBellMs: fmt?.finalBellMs ?? null },
    me: {
      gold: Math.floor(me.gold / 1000),
      goldPerSec: Math.round(goldPerSec * 10) / 10,
      nextTreasuryCost: incomePick ? researchCost(content, incomePick) : null,
      nextIncome: incomePick ? { track: incomePick.track, rank: incomePick.rank, pick: incomePick.pick } : null,
      baseHpBp: hpBp(me.baseHp, me.baseMaxHp),
      ageIndex: me.ageIndex,
      xpBp: xpBarBp(config, me.ageIndex, me.xp),
      evolveReady: canEvolve(state, config, side),
      ascending: me.ascendUntil > state.tick,
      pop: me.pop,
      popCap: eco.popCap,
      stance: me.stance,
      stanceVisible: config.training?.stanceEnabled?.[side] ?? true,
      holdP: obsMe.holdP,
      stanceWaitMs: Math.max(0, (me.stanceReadyTick - state.tick) * 50),
      research: hudResearch(state, config, side, obsMe.research),
      powerPpm: me.powerPpm,
      power: loadout?.power ?? '',
      lastStand: me.lastStand,
      lastStandManual: config.training?.manualLastStand?.[side] ?? true,
      cards,
    },
    foe: {
      label: config.sides[foeSide].label,
      isAI: true,
      baseHpBp: hpBp(foe.baseHp, foe.baseMaxHp),
      ageIndex: foe.ageIndex,
      xpBp: xpBarBp(config, foe.ageIndex, foe.xp),
      powerPpm: foe.powerPpm,
      lastStandArmed: foe.lastStand === 'armed' || foe.lastStand === 'charging',
      scouted: [...obs.foe.scouted],
      research: hudResearch(state, config, foeSide, obs.foe.research),
      stance: obs.foe.stance,
    },
    mounts: [0, 1, 2, 3].map((index) => {
      const t = me.turrets[index] ?? null;
      const tAge = t ? content.ages[t.age] : undefined;
      return {
        index,
        owned: index < me.mountsOwned,
        card: t?.card ?? null,
        outdated: t !== null && tAge !== undefined && tAge.index < me.ageIndex,
        state: t ? t.state : 'empty',
      };
    }),
    speed: extras.speed,
    paused: extras.paused,
    canRetreat: !noClock && retreatAfter !== null && clockMs >= retreatAfter && state.phase !== 'ended',
  };
}

/**
 * Stateful helper for the session: keeps the tray unlocks and rebuilds the model at most at 15 Hz.
 * `update(nowMs)` returns a new model when one is due (or `force`), else null.
 */
export class HudModelBuilder {
  private readonly tray: TrayUnlocks;
  private lastMs = -Infinity;

  constructor(
    private readonly src: HudSource,
    private readonly side: Side = 0,
  ) {
    this.tray = new TrayUnlocks(src.config);
  }

  /** Call after every sim step so scripted unlocks are attributed to the right age. */
  afterStep(): void {
    this.tray.observe(this.src.state);
  }

  build(extras: HudExtras): HudModel {
    this.tray.observe(this.src.state);
    return buildHudModel(this.src, extras, this.side, this.tray);
  }

  update(nowMs: number, extras: HudExtras, force = false): HudModel | null {
    if (!force && nowMs - this.lastMs < 1000 / HUD_HZ) return null;
    this.lastMs = nowMs;
    return this.build(extras);
  }
}
