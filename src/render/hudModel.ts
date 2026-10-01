/**
 * The battle HUD model (DESIGN A9.2, B6 HUD, B15 `hud.ts`). Built from read-only sim state at 15 Hz
 * by the session and rendered by the Preact overlay in `ui/hud`.
 *
 * Units: gold and costs are whole gold, `goldPerSec` may have one decimal, XP and HP are bp
 * (`xpBp` is XP as bp of the current threshold, can exceed 10,000 up to the 1.5× cap; in the final age
 * of the format it is measured against the Overcharge amount), power charge is ppm, times are ms.
 */
import type {
  AgeId,
  CardId,
  CardState,
  CompiledContent,
  Foil,
  HudCard,
  HudFort,
  HudLaneFort,
  HudModel,
  HudPowerSlot,
  HudResearch,
  MatchConfig,
  Observation,
  PowerSlot,
  RoleGroup,
  Side,
  SideState,
  SimState,
} from '@/contracts';
import { heavyThreat } from '@/core/cardClass';
import { fortEconomyOf, incomeMilliPerSec, LANE_MLU, matchMods, msToTicks, nextIncomePick, reloadTicksLeft, researchCost, slotIndex, type MatchMods } from '@/core';

/**
 * One power slot for the dock (A2.9.10): effective cost and reload from the observation, seconds left
 * with the sim's own integer reload formula (core `reloadTicksLeft`).
 */
function hudPower(content: CompiledContent, state: Readonly<SimState>, side: Side, obsMe: Observation['me'], slot: PowerSlot): HudPowerSlot | null {
  const o = obsMe.powers[slot];
  const def = o ? content.powers[o.card] : undefined;
  if (!o || !def) return null;
  const i = slotIndex(slot);
  const s = state.sides[side];
  const ticks = reloadTicksLeft(o.ppm, s.powerRem[i] ?? 0, o.rateBp, msToTicks(def.reloadMs));
  const fx = def.effect;
  const zone = fx.kind === 'barrage' || fx.kind === 'sweep' || fx.kind === 'field' ? fx.zone : fx.kind === 'cloud' ? fx.width : fx.kind === 'stampede' ? fx.distance : 0;
  const lock = s.powerLockoutUntil > state.tick ? s.powerLockoutUntil * 50 : 0;
  return {
    slot,
    card: o.card,
    ppm: o.ppm,
    cost: o.cost,
    affordable: Math.floor(obsMe.gold / 1000) >= o.cost,
    secondsLeft: Math.ceil((ticks * 50) / 1000),
    reloadMs: o.reloadMs,
    reach: def.reach,
    family: def.family,
    maxTargets: fx.kind === 'buffAll' ? fx.maxTargets : (def.maxTargets ?? 0),
    zone,
    lockoutUntilMs: lock,
    slotLocked: false,
  };
}

/** A side's fort scaffold time now, ms: Engineers (a `fortScaffold` research effect) or the economy's (A16.14.5). */
function scaffoldMsOf(content: CompiledContent, owned: readonly string[], base: number): number {
  let best = base;
  for (const id of owned) {
    const pick = content.research.picks.find((x) => x.id === id);
    for (const fx of pick?.effects ?? []) if (fx.kind === 'fortScaffold' && fx.ms > 0 && fx.ms < best) best = fx.ms;
  }
  return best;
}

/**
 * My Fort button (A16.14.7, F2): the slot's card, price, recharge, caps and every pad as the rules see
 * it now, from the observation; the enemy's public ring. Null without a Fort card (a locked slot arrives
 * empty, A16.14.6).
 */
function hudFort(state: Readonly<SimState>, content: CompiledContent, obs: Observation): HudFort | null {
  const f = fortEconomyOf(content.economy);
  const o = obs.me.fort;
  const def = o ? content.forts?.[o.card] : undefined;
  if (!f || !o || !def) return null;
  const foe = obs.foe.fort;
  // The sim's fortMax rule (core fortDenyReason): 2 forts up, or a tower card with `maxTowers` towers up.
  let towers = 0;
  if (def.fortKind === 'tower') for (const u of state.units) if (u.side === obs.side && u.fort?.kind === 'tower' && u.hp > 0 && u.mode !== 'dying') towers += 1;
  return {
    card: o.card,
    cost: o.cost,
    affordable: Math.floor(obs.me.gold / 1000) >= o.cost,
    secondsLeft: Math.ceil((o.readyTicks * 50) / 1000),
    cap: o.alive >= f.maxAlive || (def.fortKind === 'tower' && towers >= f.maxTowers),
    slotLocked: false,
    siege: state.phase === 'siege',
    foeRing: foe ? { card: foe.card, secondsLeft: Math.ceil((foe.readyTicks * 50) / 1000) } : null,
    kind: def.fortKind,
    pop: def.pop,
    alive: o.alive,
    max: f.maxAlive,
    campAlive: o.campAlive,
    rechargeMs: f.rechargeMs,
    leftMs: o.readyTicks * 50,
    pads: o.pads.map((pad) => ({ ...pad })),
    scaffoldMs: scaffoldMsOf(content, obs.me.research.owned, f.scaffoldMs),
  };
}

/**
 * Forts and traps of both sides for the HUD's lane tags (A16.14.7 "On the lane"), `p` from `side`'s gate
 * in lu: scaffold (or arming) progress, decay, a silenced tower, a trap's charges.
 */
function laneFortsOf(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side, obs: Observation): HudLaneFort[] {
  const content = config.content;
  const f = fortEconomyOf(content.economy);
  if (!f) return [];
  const tick = state.tick;
  // Research is public (A18.5.1), so both sides' scaffold times come from this side's observation.
  const mine = msToTicks(scaffoldMsOf(content, obs.me.research.owned, f.scaffoldMs));
  const theirs = msToTicks(scaffoldMsOf(content, obs.foe.research.owned, f.scaffoldMs));
  const scaffold: [number, number] = side === 0 ? [mine, theirs] : [theirs, mine];
  const pOf = (x: number): number => Math.round((side === 0 ? x : LANE_MLU - x) / 1000);
  const out: HudLaneFort[] = [];
  for (const u of state.units) {
    const fs = u.fort;
    if (!fs || u.hp <= 0 || u.mode === 'dying') continue;
    const total = scaffold[u.side];
    const left = fs.doneTick - tick;
    const buildBp = fs.done || total <= 0 ? 10000 : Math.max(0, Math.min(9999, Math.floor(((total - Math.max(0, left)) * 10000) / total)));
    out.push({
      id: u.id,
      mine: u.side === side,
      card: u.card,
      kind: fs.kind,
      p: pOf(u.x),
      hpBp: u.maxHp > 0 ? Math.max(0, Math.floor((u.hp * 10000) / u.maxHp)) : 0,
      buildBp,
      decaying: fs.done && (state.phase === 'siege' || tick > fs.decayFromTick),
      silenced: fs.silencedUntilTick > tick,
    });
  }
  for (const tr of state.traps ?? []) {
    const def = content.forts?.[tr.card]?.trap;
    const arm = def ? msToTicks(def.armMs) : 0;
    const left = tr.armTick - tick;
    out.push({
      id: tr.id,
      mine: tr.side === side,
      card: tr.card,
      kind: 'trap',
      // A trap's p is its owner's own-frame p (milli-lu).
      p: pOf(tr.side === 0 ? tr.p : LANE_MLU - tr.p),
      hpBp: 10000,
      buildBp: left <= 0 || arm <= 0 ? 10000 : Math.max(0, Math.min(9999, Math.floor(((arm - left) * 10000) / arm))),
      decaying: false,
      silenced: false,
      charges: tr.charges,
    });
  }
  return out;
}

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
  // A9.2 counter hint: the enemy's units on the lane, by role group and card value.
  const foeUnits: { group: RoleGroup; value: number }[] = [];
  for (const u of state.units) {
    const d = u.side === foeSide && u.hp > 0 ? content.units[u.card] : undefined;
    if (d) foeUnits.push({ group: d.group, value: d.cost });
  }
  const threat = heavyThreat(foeUnits);
  const cards: HudCard[] = [];
  // Six troops per battle (A18.9).
  for (let slot = 0; slot < 6; slot++) {
    const card = loadout?.units[slot] ?? null;
    const unlocked = tray ? tray.unlocked(side, myAge, slot) : true;
    const hc = cardFor(state, config, side, slot, card, unlocked, foils);
    if (threat && hc.card && content.units[hc.card]?.group === 'antiArmor') hc.beatsHeavy = true;
    cards.push(hc);
  }
  const retreatAfter = fmt?.retreatAfterMs ?? null;
  return {
    clockMs,
    phase: state.phase,
    phaseMarks: noClock
      ? { overdriveMs: null, siegeMs: null, finalBellMs: null }
      : { overdriveMs: fmt?.overdriveMs ?? null, siegeMs: siegeMs === null ? null : Math.max(50, siegeMs - mods.siegeEarlierMs), finalBellMs: fmt?.finalBellMs ?? null },
    // Last Base Standing (A2.10.1): the public step schedule and who crumbles, by Side (L3).
    ...(obs.escalation
      ? {
          escalation: {
            step: obs.escalation.step,
            steps: obs.escalation.steps.length,
            atMs: obs.escalation.steps.map((x) => x.tick * 50),
            crumbling: [obs.escalation.crumbling[0], obs.escalation.crumbling[1]] as [boolean, boolean],
          },
        }
      : {}),
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
      // P1 compatibility (A2.9.13): the single power button shows the Home slot.
      powerPpm: me.powerPpm[0],
      power: loadout?.powers.home ?? '',
      powers: { home: hudPower(content, state, side, obsMe, 'home'), field: hudPower(content, state, side, obsMe, 'field') },
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
      powerPpm: foe.powerPpm[0],
      powers: { home: obs.foe.powers.home, field: obs.foe.powers.field },
      lastStandArmed: foe.lastStand === 'armed' || foe.lastStand === 'charging',
      scouted: [...obs.foe.scouted],
      research: hudResearch(state, config, foeSide, obs.foe.research),
      stance: obs.foe.stance,
      heavyThreat: threat,
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
    fort: hudFort(state, content, obs),
    laneForts: laneFortsOf(state, config, side, obs),
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
