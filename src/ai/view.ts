/**
 * The bot's picture of the match at decision time: the delayed observation plus its own pending
 * commands (ledger.ts), with the derived quantities the A7.2 scoring terms use. Positions are own-side
 * progress p in milli-lu (the observation's frame); money is milli-gold; card values are whole gold.
 */
import type { AgeId, BotProfile, CardId, Observation, PowerDef, Side } from '@/contracts';
import { PPM } from '@/core';
import type { CardBook, UnitCard } from './book';
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
  air: boolean;
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
  ageIndex: number;
  age: AgeId | null;
  /** Evolve is legal as far as the bot can tell (A2.4). */
  evolveReady: boolean;
  queue: CardId[];
  /** Pop of units alive plus queued (A2.7). */
  popCommitted: number;
  treasury: number;
  mountsOwned: number;
  /** Turret per mount after pending builds: card and age index. */
  turrets: ({ card: CardId; ageIndex: number } | null)[];
  turretsBuilt: number;
  /** Mount is building or modernising. */
  mountBusy: boolean[];
  powerReady: boolean;
  power: PowerDef | undefined;
  stance: 'charge' | 'hold';
  stanceReady: boolean;
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
  return { id: u.id, card: u.card, def, value: def?.value ?? 0, p: u.p, hp: u.hp, air: u.air };
}

/** Builds the decision-time view from a delayed observation and the ledger. */
export function buildView(obs: Observation, now: number, book: CardBook, ledger: Ledger): View {
  const me = obs.me;
  const pending = ledger.pending();
  let gold = me.gold - ledger.pendingGold();
  if (gold < 0) gold = 0;
  const queue = [...me.queue, ...ledger.pendingTrains()];
  let treasury = me.treasury;
  let mountsOwned = me.mountsOwned;
  let powerUsed = false;
  let stance = me.stance;
  const turrets = me.turrets.map((t) => (t ? { card: t.card, ageIndex: book.turrets[t.card]?.ageIndex ?? 0 } : null));
  for (const p of pending) {
    const a = p.action;
    if (a.kind === 'treasury') treasury += 1;
    else if (a.kind === 'mount') mountsOwned += 1;
    else if (a.kind === 'power') powerUsed = true;
    else if (a.kind === 'stance') stance = a.stance;
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
  const age = book.ageOrder[me.ageIndex] ?? null;
  const ageUncertain = ledger.ageUncertain(now);
  return {
    now,
    side: obs.side,
    phase: obs.phase,
    obs,
    gold,
    ageIndex: me.ageIndex,
    age,
    evolveReady: evolveVisible(obs) && ledger.evolve === null && !ledger.finalAge,
    queue,
    popCommitted,
    treasury,
    mountsOwned,
    turrets,
    turretsBuilt: turrets.filter((t) => t !== null).length,
    mountBusy: ledger.mountBusyUntil.map((t) => now < t),
    powerReady: me.powerPpm >= PPM && !powerUsed && !ageUncertain && book.powers[me.power] !== undefined,
    power: book.powers[me.power],
    stance,
    stanceReady: ledger.stanceEnabled && now >= ledger.stanceReadyTick,
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
