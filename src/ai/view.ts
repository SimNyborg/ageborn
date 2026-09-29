/**
 * The bot's picture of the match at decision time: the delayed observation plus its own pending
 * commands (ledger.ts), with the derived quantities the A7.2 scoring terms use. Positions are own-side
 * progress p in milli-lu (the observation's frame); money is milli-gold; card values are whole gold.
 */
import type { AgeId, BotProfile, CardId, Observation, PowerDef, PowerSlot, ResearchView, Side, StanceMode } from '@/contracts';
import { BP, MILLI, PPM, frontP } from '@/core';
import type { CardBook, PowerInfo, UnitCard } from './book';
import type { Ledger } from './ledger';
import { evolveVisible } from './memory';

export interface SeenUnit {
  id: number;
  card: CardId;
  /** The card's book entry; undefined for cards the book does not know. */
  def: UnitCard | undefined;
  /** Card value V in whole gold (A7.2). */
  value: number;
  p: number;
  hp: number;
  /** HP plus shields (centi), what a power's damage must get through. */
  hpTotal: number;
  maxHp: number;
  air: boolean;
  /** Summoned (drops, Vanguard, riders): never the power front F (A2.9.4). */
  summoned: boolean;
  level: number;
}

/**
 * One of the bot's power slots as it can use it now (A2.9.1-A2.9.3): the equipped power, its effective
 * cost (milli-gold) and whether it is reloaded and affordable after pending commands.
 */
export interface PowerSlotView {
  slot: PowerSlot;
  info: PowerInfo;
  /** Effective cost, milli-gold. */
  cost: number;
  ppm: number;
  reloaded: boolean;
  affordable: boolean;
}

export interface TraySlot {
  slot: number;
  card: UnitCard;
}

export interface View {
  /** Estimated current tick: observation tick + snapshot delay. */
  now: number;
  side: Side;
  phase: Observation['phase'];
  obs: Observation;
  /** Own gold after pending commands, milli. */
  gold: number;
  /** The current age in `book.ageOrder` (the window position plus where the window starts, A18.3.4). */
  ageIndex: number;
  age: AgeId | null;
  /** Evolve is legal as far as the bot can tell (A2.4). */
  evolveReady: boolean;
  queue: CardId[];
  /** Pop of units alive plus queued (A2.7). */
  popCommitted: number;
  /** Economy research picks owned or pending (the Treasury level before A18.5.4). */
  treasury: number;
  /** The War Council as seen (A18.5.1), with a pending research counted as in progress. */
  research: ResearchView;
  mountsOwned: number;
  /** Turret per mount after pending builds: card and age index. */
  turrets: ({ card: CardId; ageIndex: number } | null)[];
  turretsBuilt: number;
  /** Mount is building or modernising. */
  mountBusy: boolean[];
  /** A power slot is reloaded and affordable (A2.9.2-A2.9.3); `powerSlot` is it (Home first). */
  powerReady: boolean;
  powerSlot: PowerSlot | null;
  power: PowerDef | undefined;
  /** Both equipped slots (Home first), empty ones left out; no slot while a cast is pending or the age is uncertain. */
  powerSlots: PowerSlotView[];
  /** The power front F (A2.9.4): the frontmost trained, landed ground unit, or null. */
  powerFront: number | null;
  /** The second front unit's p (A2.9.4 `frontRank` 2), or null. */
  powerFront2: number | null;
  /** The bot's loadout multiplier estimate, bp: the average level multiplier of its own units on the lane. */
  levelBp: number;
  stance: StanceMode;
  stanceReady: boolean;
  /** The Hold flag after pending commands, own-side p in milli-lu (A18.4.2), and whether it may move now. */
  holdP: number;
  flagReady: boolean;
  baseHpBp: number;
  lastStandArmed: boolean;
  tray: TraySlot[];
  turretCards: (CardId | null)[];
  /** A Legendary is alive or queued on the bot's side (A2.7 limit). */
  legendaryInField: boolean;
  ageUncertain: boolean;
  mine: SeenUnit[];
  foes: SeenUnit[];
  myArmy: number;
  foeArmy: number;
  /** p of the bot's frontmost ground unit, or null without ground units. */
  myFront: number | null;
  /** p (bot frame) of the foe ground unit nearest the bot's gate, or null. */
  foeFront: number | null;
}

function seen(book: CardBook, u: Observation['units'][number]): SeenUnit {
  const def = book.units[u.card];
  return { id: u.id, card: u.card, def, value: def?.value ?? 0, p: u.p, hp: u.hp, hpTotal: u.hp + u.shield, maxHp: u.maxHp, air: u.air, summoned: u.summoned, level: u.level };
}

/** Level multiplier in bp (A5.1): 10,000 + step × (L − 1), L in 1..max. */
export function levelMultBp(book: CardBook, level: number): number {
  const l = Math.max(1, Math.min(book.econ.maxLevel, Math.trunc(level)));
  return BP + book.econ.levelStepBp * (l - 1);
}

/** Builds the decision-time view from a delayed observation and the ledger. */
export function buildView(obs: Observation, now: number, book: CardBook, ledger: Ledger): View {
  const me = obs.me;
  const pending = ledger.pending();
  let gold = me.gold - ledger.pendingGold();
  if (gold < 0) gold = 0;
  const queue = [...me.queue, ...ledger.pendingTrains()];
  let treasury = me.treasury;
  let research: ResearchView = me.research;
  let mountsOwned = me.mountsOwned;
  const pendingSlots = new Set<PowerSlot>();
  let stance = me.stance;
  let holdP = me.holdP * MILLI;
  const turrets = me.turrets.map((t) => (t ? { card: t.card, ageIndex: book.turrets[t.card]?.ageIndex ?? 0 } : null));
  for (const p of pending) {
    const a = p.action;
    if (a.kind === 'research') {
      if (a.pick.track === 'economy') treasury += 1;
      research = { ...research, current: a.pick.id, progressBp: 0 };
    }
    else if (a.kind === 'mount') mountsOwned += 1;
    else if (a.kind === 'power') pendingSlots.add(a.slot ?? 'home');
    else if (a.kind === 'stance') {
      stance = a.stance;
      if (a.holdP !== undefined) holdP = a.holdP * MILLI;
    } else if (a.kind === 'flag') holdP = a.holdP * MILLI;
    else if (a.kind === 'build' || a.kind === 'modernise') turrets[a.mount] = { card: a.card, ageIndex: book.turrets[a.card]?.ageIndex ?? 0 };
  }
  while (turrets.length < book.econ.mountCount) turrets.push(null);

  const mine: SeenUnit[] = [];
  const foes: SeenUnit[] = [];
  let myArmy = 0;
  let foeArmy = 0;
  let myFront: number | null = null;
  let foeFront: number | null = null;
  let legendaryInField = false;
  for (const u of obs.units) {
    if (u.hp <= 0) continue;
    const s = seen(book, u);
    if (u.side === obs.side) {
      mine.push(s);
      myArmy += s.value;
      if (!u.air && (myFront === null || u.p > myFront)) myFront = u.p;
      if (s.def?.legendary) legendaryInField = true;
    } else {
      foes.push(s);
      foeArmy += s.value;
      if (!u.air && (foeFront === null || u.p < foeFront)) foeFront = u.p;
    }
  }
  let popCommitted = me.pop;
  for (const c of queue) {
    const d = book.units[c];
    popCommitted += d?.pop ?? 0;
    if (d?.legendary) legendaryInField = true;
  }

  const tray: TraySlot[] = [];
  me.tray.forEach((c, slot) => {
    const card = c ? book.units[c] : undefined;
    if (card) tray.push({ slot, card });
  });
  const age = obs.ages?.[me.ageIndex] ?? book.ageOrder[me.ageIndex] ?? null;
  const ageIndex = age ? Math.max(0, book.ageOrder.indexOf(age)) : me.ageIndex;
  const ageUncertain = ledger.ageUncertain(now);
  // A2.9.2-A2.9.3: a slot can be cast when it is reloaded and its effective cost is affordable.
  const slotReady = (slot: PowerSlot): boolean => {
    const o = me.powers[slot];
    return o !== null && o.ppm >= PPM && gold >= o.cost * MILLI && book.powers[o.card] !== undefined;
  };
  const blocked = pendingSlots.size > 0 || ageUncertain || me.powerLockoutUntil > now;
  const powerSlot: PowerSlot | null = blocked ? null : slotReady('home') ? 'home' : slotReady('field') ? 'field' : null;
  const powerSlots: PowerSlotView[] = [];
  if (!blocked) {
    for (const slot of ['home', 'field'] as const) {
      const o = me.powers[slot];
      const info = o ? book.powerInfo[o.card] : undefined;
      if (!o || !info) continue;
      powerSlots.push({ slot, info, cost: o.cost * MILLI, ppm: o.ppm, reloaded: o.ppm >= PPM, affordable: gold >= o.cost * MILLI });
    }
  }
  // The loadout multiplier (A2.9.6) from the levels of the bot's own trained units.
  let lvlSum = 0;
  let lvlN = 0;
  for (const u of mine) {
    if (u.summoned) continue;
    lvlSum += levelMultBp(book, u.level);
    lvlN += 1;
  }
  const own = obs.units.filter((u) => u.side === obs.side && u.hp > 0).map((u) => ({ id: u.id, p: u.p, air: u.air, summoned: u.summoned }));
  return {
    now,
    side: obs.side,
    phase: obs.phase,
    obs,
    gold,
    ageIndex,
    age,
    evolveReady: evolveVisible(obs) && ledger.evolve === null && !ledger.finalAge,
    queue,
    popCommitted,
    treasury,
    research,
    mountsOwned,
    turrets,
    turretsBuilt: turrets.filter((t) => t !== null).length,
    mountBusy: ledger.mountBusyUntil.map((t) => now < t),
    powerReady: powerSlot !== null,
    powerSlot,
    power: powerSlot ? book.powers[me.powers[powerSlot]?.card ?? ''] : undefined,
    powerSlots,
    powerFront: frontP(own, book.econ.powerReach.frontRank),
    powerFront2: frontP(own, book.econ.powerReach.frontRank + 1),
    levelBp: lvlN > 0 ? Math.trunc(lvlSum / lvlN) : BP,
    stance,
    stanceReady: ledger.stanceEnabled && now >= ledger.stanceReadyTick,
    holdP,
    flagReady: ledger.stanceEnabled && now >= ledger.flagReadyTick,
    baseHpBp: me.baseHpBp,
    lastStandArmed: me.lastStand === 'armed' && ledger.lastStandManual && !ledger.has('lastStand'),
    tray,
    turretCards: [...me.turretCards],
    legendaryInField,
    ageUncertain,
    mine,
    foes,
    myArmy,
    foeArmy,
    myFront,
    foeFront,
  };
}

/** Summed enemy value within [lo, hi] (bot frame, milli-lu), optionally ground only. */
export function foeValueIn(v: View, lo: number, hi: number, groundOnly = false): number {
  let sum = 0;
  for (const u of v.foes) if (u.p >= lo && u.p <= hi && !(groundOnly && u.air)) sum += u.value;
  return sum;
}

/** Weight multipliers m = 0.5 + w / 100 in bp for every personality weight (A7.2). */
export type WeightsBp = Record<keyof BotProfile['weights'], number>;
