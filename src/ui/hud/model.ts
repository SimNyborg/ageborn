/**
 * Pure HUD logic (DESIGN A9.2, A2.12): what a press or a key means for the current `HudModel`, the
 * turret mount menu, clock and timeline values. The Preact components stay thin and these rules are
 * unit-tested without a DOM.
 *
 * A press the HUD can already tell is invalid becomes a `deny` intent (red flash, 2-frame shake,
 * `ui_deny`, A9.2) instead of a command; everything else is sent and the sim has the final word.
 */
import type { AgeId, CardId, Command, HudFort, HudFortPad, HudModel, HudPowerSlot, MatchConfig, PowerSlot, Side, StanceMode, TeamPreset } from '@/contracts';
import { matchMods } from '@/core';

/** Elements that can show the denied-press feedback. */
export type DenyTarget =
  | 'card0'
  | 'card1'
  | 'card2'
  | 'card3'
  | 'card4'
  | 'card5'
  | 'card6'
  | 'gold'
  | 'evolve'
  | 'power'
  | 'powerField'
  | 'stance'
  | 'lastStand'
  | 'mounts'
  | 'army'
  | 'emote'
  | 'council'
  | 'flag'
  | 'fort';

/**
 * Why a press was denied, as an i18n key and its params (ui-plan 4.7, MR-03, MR-67): the label pops
 * next to the control ("Need 40 gold", "Army full", "Legendary in field", "Queue full").
 */
export interface DenyReason {
  key: string;
  params?: Record<string, string | number>;
}

export type HudIntent =
  | { k: 'command'; cmd: Command; target: DenyTarget }
  | { k: 'deny'; target: DenyTarget; reason?: DenyReason }
  | { k: 'pause' }
  | { k: 'speed' }
  /** Opens or closes the War Council sheet (G, the Council button); `line` opens a line's picks. */
  | { k: 'council'; line?: string }
  /** Closes whatever the HUD has open (Escape). */
  | { k: 'close' }
  | { k: 'none' };

const NONE: HudIntent = { k: 'none' };
const PPM_FULL = 1_000_000;

/** Pointer travel (CSS px) that turns a press on the power button into a drag (A2.9: tap = auto-aim, drag = place). */
export const POWER_DRAG_PX = 12;
/**
 * A press this long on a tray card opens its tip and never trains (ui-plan 4.7 "train on release",
 * U10: a long-press never spends). The tip offers "Cancel one" when the card has a queue (A2.12's
 * cancel keeps its right-click and Backspace).
 */
export const LONG_PRESS_MS = 450;
/** The long-press ring (MR-07) starts this long after the press, so a quick tap never shows it. */
export const PRESS_RING_DELAY_MS = 150;
/** A card press that travels further than this (CSS px) is not a tap and never trains (ui-plan 4.7). */
export const TAP_SLOP_PX = 8;
/** After your evolve the Evolve button stays dark this long, even with full XP (UA-07, MR-80). */
export const EVOLVE_REARM_MS = 2000;
/** How long a deny reason label holds next to its control (MR-03: 220 in, 1.5 s hold, 160 out). */
export const REASON_MS = 1880;
/** How long the denied-press feedback shows (red flash; the 2-frame shake runs inside it, A9.2). */
export const DENY_MS = 280;
/** Emote bubbles and evolve banners stay this long. */
export const BUBBLE_MS = 2200;
export const BANNER_MS = 2600;

/** Seven troops per battle (A18.9, owner request 2026-10-07). */
type Slot = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Mount = 0 | 1 | 2 | 3;

export function cardTarget(slot: number): DenyTarget {
  return `card${Math.max(0, Math.min(6, slot)) as Slot}`;
}

function cmd(c: Command, target: DenyTarget): HudIntent {
  return { k: 'command', cmd: c, target };
}

function deny(target: DenyTarget, reason?: DenyReason): HudIntent {
  return reason ? { k: 'deny', target, reason } : { k: 'deny', target };
}

/** Items waiting in (or running at the head of) the training queue: the sum of the cards' queues. */
export function queueLength(m: HudModel): number {
  return m.me.cards.reduce((n, c) => n + (c.card ? c.queued : 0), 0);
}

/**
 * Tap on a tray card (A2.12: tap = train). "ARMY FULL" only means an instance of this card waits for
 * room (A2.7); queueing another is still legal, so the command goes to the sim, which rejects it
 * (and the card flashes) only when gold or the queue runs out.
 */
export function trainIntent(m: HudModel, slot: number, side: Side, queueMax?: number): HudIntent {
  const c = m.me.cards[slot];
  if (!c || c.state === 'empty' || !c.card) return NONE;
  const target = cardTarget(slot);
  // The sim's order (A2.7): the queue, the Legendary limit, then the gold.
  if (queueMax !== undefined && queueLength(m) >= queueMax) return deny(target, { key: 'hud.deny.queueFull' });
  if (c.state === 'legendaryInField') return deny(target, { key: 'hud.deny.legendary' });
  if (c.state !== 'ready' && c.state !== 'armyFull') {
    return m.me.gold < c.cost ? deny(target, { key: 'hud.deny.gold', params: { n: c.cost - m.me.gold } }) : deny(target);
  }
  return cmd({ t: 'train', side, slot: slot as Slot }, cardTarget(slot));
}

/** Right-click / long-press on a card cancels its last queued instance; Backspace (no slot) the last item. */
export function cancelIntent(m: HudModel, side: Side, slot?: number): HudIntent {
  if (slot === undefined) {
    const any = m.me.cards.some((c) => c.queued > 0);
    return any ? cmd({ t: 'cancelTrain', side }, 'army') : deny('army');
  }
  const c = m.me.cards[slot];
  if (!c || c.queued <= 0) return c && c.card ? deny(cardTarget(slot)) : NONE;
  return cmd({ t: 'cancelTrain', side, slot: slot as Slot }, cardTarget(slot));
}

/**
 * The gold counter's tap opens the War Council on the Economy track (A18.5.4: the Treasury became
 * the Economy research; A18.5.7: a spend takes two taps, so the tap no longer buys by itself).
 */
export function goldIntent(m: HudModel): HudIntent {
  if (m.phase === 'ended' || !m.me.research) return NONE;
  return { k: 'council', line: 'economy' };
}

/**
 * Evolve (A2.4). `config` lets a denied press say how much XP is missing; `rearming` is the 2 s after
 * your own evolve when the button stays dark (UA-07), so a double tap never evolves twice.
 */
export function evolveIntent(m: HudModel, side: Side, config?: Readonly<MatchConfig>, rearming = false): HudIntent {
  if (m.me.evolveReady && !rearming && !m.me.ascending) return cmd({ t: 'evolve', side }, 'evolve');
  if (m.me.ascending || rearming) return deny('evolve', { key: 'hud.deny.evolving' });
  const xp = config ? xpProgress(m, config) : null;
  if (!xp) return deny('evolve', config ? { key: 'hud.finalAge' } : undefined);
  return deny('evolve', { key: 'hud.deny.xp', params: { n: Math.max(1, xp.need - xp.xp) } });
}

/** The deny target of a power slot: `power` is the Home button (the tutorial points at it), `powerField` the Field one. */
export function powerTarget(slot: PowerSlot): DenyTarget {
  return slot === 'home' ? 'power' : 'powerField';
}

/** The power slot a deny target belongs to, or null. */
export function powerSlotOf(target: DenyTarget): PowerSlot | null {
  return target === 'power' ? 'home' : target === 'powerField' ? 'field' : null;
}

/**
 * How a dock button looks (A2.9.10, ui-plan 4.7 "States"): reloading (ring filling, seconds shown), a
 * lockout (the lever), reloaded but gold short (ring closed and dim, the cost chip red), castable
 * (MR-69), or no power in the slot (not drawn: its space stays a gap).
 */
export type PowerSlotState = 'empty' | 'reloading' | 'lockout' | 'poor' | 'castable';

export interface PowerSlotView {
  slot: PowerSlot;
  /** The slot as the HUD model has it; null when the slot is empty (or locked by progression). */
  p: HudPowerSlot | null;
  state: PowerSlotState;
  /** Reload progress 0..1. */
  frac: number;
  /** Whole seconds until reloaded (the sim's own formula), 0 when reloaded. */
  secondsLeft: number;
  /** Gold still missing for the cast (0 when affordable). */
  need: number;
  /** Whole seconds left on a lockout (0 when none). */
  lockS: number;
}

/**
 * Both slots of the dock. Older models (tests, the P1 adapter) carry only `power` / `powerPpm`: they
 * read as a Home slot without a price.
 */
export function powerSlotData(m: HudModel, slot: PowerSlot): HudPowerSlot | null {
  if (m.me.powers) return m.me.powers[slot] ?? null;
  if (slot !== 'home' || !m.me.power) return null;
  const ppm = m.me.powerPpm;
  return {
    slot: 'home',
    card: m.me.power,
    ppm,
    cost: 0,
    affordable: true,
    secondsLeft: 0,
    reloadMs: 0,
    reach: 'anywhere',
    family: 'bombard',
    maxTargets: 0,
    zone: 0,
    lockoutUntilMs: 0,
    slotLocked: false,
  };
}

export function powerSlotView(m: HudModel, slot: PowerSlot): PowerSlotView {
  const p = powerSlotData(m, slot);
  if (!p || p.slotLocked) return { slot, p: null, state: 'empty', frac: 0, secondsLeft: 0, need: 0, lockS: 0 };
  const frac = powerFraction(p.ppm);
  const need = p.affordable ? 0 : Math.max(1, p.cost - m.me.gold);
  const lockS = p.lockoutUntilMs > m.clockMs ? Math.max(1, Math.ceil((p.lockoutUntilMs - m.clockMs) / 1000)) : 0;
  const secondsLeft = frac >= 1 ? 0 : Math.max(1, p.secondsLeft);
  const state: PowerSlotState = frac < 1 ? 'reloading' : lockS > 0 ? 'lockout' : !p.affordable ? 'poor' : 'castable';
  return { slot, p, state, frac, secondsLeft, need, lockS };
}

/** Castable now: reloaded, affordable, no lockout, match running. */
export function powerCastable(m: HudModel, slot: PowerSlot): boolean {
  return m.phase !== 'ended' && powerSlotView(m, slot).state === 'castable';
}

/** The slot that holds the one power pulse (U11: the first castable slot, Home before Field), or null. */
export function pulseSlot(m: HudModel): PowerSlot | null {
  if (powerCastable(m, 'home')) return 'home';
  if (powerCastable(m, 'field')) return 'field';
  return null;
}

/**
 * A press, a drop or a key on a power slot (A2.9.10). Tap = aiming mode and keys auto-aim (no p); a
 * drag passes the placed p. What the HUD can already see is denied with its reason (MR-03): "Ready in
 * 12 s", "Wait 3 s", "Need 40 gold". The sim has the last word on the rest (no target, out of reach).
 * A slot without a power (not drawn) does nothing.
 */
export function powerIntent(m: HudModel, side: Side, p?: number, slot: PowerSlot = 'home'): HudIntent {
  const target = powerTarget(slot);
  if (m.phase === 'ended') return deny(target);
  const v = powerSlotView(m, slot);
  switch (v.state) {
    case 'empty':
      return NONE;
    case 'reloading':
      return deny(target, { key: 'hud.deny.powerReload', params: { s: v.secondsLeft } });
    case 'lockout':
      return deny(target, { key: 'hud.deny.powerLockout', params: { s: v.lockS } });
    case 'poor':
      return deny(target, { key: 'hud.deny.powerGold', params: { n: v.need } });
    case 'castable':
      return cmd(p === undefined ? { t: 'power', side, slot } : { t: 'power', side, slot, p }, target);
  }
}

/**
 * Whether the power `power_ready` chime may play for a slot (MR-69 as changed by A2.9.10): when a slot
 * becomes castable for the first time since its last cast, at most once per 3 s across both slots.
 */
export const POWER_CHIME_GAP_MS = 3000;

/**
 * The one attention pulse (U11, ui-plan 4.7): a tutorial target, then Evolve, then the Age Power,
 * then a new turret mount. The others rest in a steady "ready" glow.
 */
export type HudPulse = 'tutorial' | 'evolve' | 'power' | 'mount' | null;

export function hudPulse(s: { tutorial: boolean; evolve: boolean; power: boolean; mount: boolean }): HudPulse {
  if (s.tutorial) return 'tutorial';
  if (s.evolve) return 'evolve';
  if (s.power) return 'power';
  if (s.mount) return 'mount';
  return null;
}

/**
 * The deny label for a command the sim rejected (the view's `denied` event carries the sim's
 * reason), or null when the HUD has nothing useful to add to the flash.
 */
export function simDenyReason(reason: string, m: HudModel, slot?: number, power?: PowerSlot, fort = false): DenyReason | null {
  if (fort) return fortReasonOf(reason, m);
  if (power) {
    const v = powerSlotView(m, power);
    switch (reason) {
      case 'powerReloading':
      case 'powerNotReady':
        return { key: 'hud.deny.powerReload', params: { s: Math.max(1, v.secondsLeft) } };
      case 'powerLockout':
        return { key: 'hud.deny.powerLockout', params: { s: Math.max(1, v.lockS) } };
      case 'powerNoTarget':
        return { key: 'hud.deny.powerNoTarget' };
      case 'powerOutOfReach':
        return { key: 'hud.deny.powerOutOfReach' };
      case 'noGold':
        return v.p && v.p.cost > m.me.gold ? { key: 'hud.deny.powerGold', params: { n: v.p.cost - m.me.gold } } : { key: 'hud.deny.noGold' };
      case 'noPower':
        return { key: 'hud.deny.powerEmpty' };
      default:
        break;
    }
  }
  switch (reason) {
    case 'queueFull':
      return { key: 'hud.deny.queueFull' };
    case 'legendaryLimit':
      return { key: 'hud.deny.legendary' };
    case 'noGold': {
      const c = slot === undefined ? undefined : m.me.cards[slot];
      return c && c.cost > m.me.gold ? { key: 'hud.deny.gold', params: { n: c.cost - m.me.gold } } : { key: 'hud.deny.noGold' };
    }
    case 'stanceCooldown':
    case 'flagCooldown':
      return { key: 'hud.deny.wait' };
    case 'ascending':
      return { key: 'hud.deny.evolving' };
    default:
      return null;
  }
}

/** The three stances in control order (A18.4.2). */
export const STANCES: readonly StanceMode[] = ['charge', 'hold', 'fallback'];

/**
 * A press on a stance segment (A18.4.2). A stance switches at once (owner decision 2026-10-07: no
 * cooldown); a change the sim still refuses comes back as `simDenyReason`.
 */
export function stanceSetIntent(m: HudModel, side: Side, mode: StanceMode): HudIntent {
  if (!m.me.stanceVisible || m.phase === 'ended') return NONE;
  if (mode === m.me.stance) return NONE;
  return cmd({ t: 'stance', side, mode }, 'stance');
}

/** S toggles Charge and Hold (from Fall back it goes to Charge); Shift+S is Fall back (A18.4.2). */
export function stanceIntent(m: HudModel, side: Side, shift = false): HudIntent {
  if (!m.me.stanceVisible) return NONE;
  if (shift) return stanceSetIntent(m, side, 'fallback');
  return stanceSetIntent(m, side, m.me.stance === 'charge' ? 'hold' : 'charge');
}

/** The Hold flag's range and snap (A18.4.2: p in [320, 800], 20 lu steps). */
export const FLAG_MIN_P = 320;
export const FLAG_MAX_P = 800;
export const FLAG_SNAP = 20;

/** Clamps and snaps a flag p as the sim does. */
export function snapFlagP(p: number): number {
  const c = Math.max(FLAG_MIN_P, Math.min(FLAG_MAX_P, p));
  return Math.max(FLAG_MIN_P, Math.min(FLAG_MAX_P, Math.round(c / FLAG_SNAP) * FLAG_SNAP));
}

/** Drops the Hold flag at `p` (own-side lu): Hold there. From Charge or Fall back it also switches to Hold. */
export function flagIntent(m: HudModel, side: Side, p: number): HudIntent {
  if (!m.me.stanceVisible || m.phase === 'ended') return NONE;
  const holdP = snapFlagP(p);
  if (m.me.stance === 'hold' && holdP === m.me.holdP) return NONE;
  return cmd({ t: 'stance', side, mode: 'hold', holdP }, 'flag');
}

/** The manual Last Stand button exists only when armed and from match 5 (A2.11, A8). */
export function lastStandVisible(m: HudModel): boolean {
  return m.me.lastStandManual && (m.me.lastStand === 'armed' || m.me.lastStand === 'charging');
}

export function lastStandIntent(m: HudModel, side: Side): HudIntent {
  if (!m.me.lastStandManual) return NONE;
  return m.me.lastStand === 'armed' ? cmd({ t: 'lastStand', side }, 'lastStand') : deny('lastStand');
}

/** Speed cycles 1x → 1.5x → 2x → 1x (A2.12). */
export function nextSpeed(s: 1 | 1.5 | 2): 1 | 1.5 | 2 {
  return s === 1 ? 1.5 : s === 1.5 ? 2 : 1;
}

/**
 * The match's ages in play order: `ageIndex` is a position in this list (A17.15 rule 4). The format's
 * own list (the tutorial skips ages); every age in index order when the format is unknown.
 */
export function ageIds(config: Readonly<MatchConfig>): AgeId[] {
  const fmt = config.content.formats[config.format];
  if (fmt) return [...fmt.ages];
  return Object.values(config.content.ages)
    .sort((a, b) => a.index - b.index)
    .map((a) => a.id);
}

/** The loadout turret cards (2 slots) of `side` for the HUD's current age. */
export function turretSlots(m: HudModel, config: Readonly<MatchConfig>, side: Side): (CardId | null)[] {
  const age = ageIds(config)[m.me.ageIndex];
  const lo = age ? config.sides[side].loadouts[age] : undefined;
  return [lo?.turrets[0] ?? null, lo?.turrets[1] ?? null];
}

export interface TurretOption {
  slot: 0 | 1;
  card: CardId;
  cost: number;
  affordable: boolean;
}

export interface MountMenu {
  mount: number;
  status: 'empty' | 'occupied' | 'busy' | 'locked';
  card: CardId | null;
  outdated: boolean;
  /** Build options on an empty mount. */
  build: TurretOption[];
  /** Modernise options on an outdated turret: new price minus 50% of the old (A2.8). */
  modernise: TurretOption[];
  /** Sell refund (50% of the turret's cost), or null when it cannot be sold now. */
  sellRefund: number | null;
}

/** The popover content for a tap on mount `mount` (A2.8, A2.12). */
export function mountMenu(m: HudModel, config: Readonly<MatchConfig>, side: Side, mount: number): MountMenu {
  const mm = m.mounts[mount];
  const eco = config.content.economy;
  const turrets = config.content.turrets;
  const empty: MountMenu = { mount, status: 'locked', card: null, outdated: false, build: [], modernise: [], sellRefund: null };
  if (!mm || !mm.owned) return empty;
  const slots = turretSlots(m, config, side);
  const options = (priceOf: (cost: number) => number): TurretOption[] =>
    slots.flatMap((card, i) => {
      const def = card ? turrets[card] : undefined;
      if (!card || !def) return [];
      const cost = priceOf(def.cost);
      return [{ slot: i as 0 | 1, card, cost, affordable: m.me.gold >= cost }];
    });
  if (mm.state === 'empty' || mm.card === null) return { ...empty, status: 'empty', build: options((c) => c) };
  const oldCost = turrets[mm.card]?.cost ?? 0;
  const refund = Math.floor((oldCost * eco.sellRefundBp) / 10000);
  if (mm.state !== 'active') return { ...empty, status: 'busy', card: mm.card, outdated: mm.outdated };
  return {
    mount,
    status: 'occupied',
    card: mm.card,
    outdated: mm.outdated,
    build: [],
    modernise: mm.outdated ? options((c) => Math.max(0, c - refund)).filter((o) => o.card !== mm.card) : [],
    sellRefund: refund,
  };
}

/** Price of the next mount, or null when all four are owned (A2.3: 150 / 350 / 700). */
export function nextMountCost(m: HudModel, config: Readonly<MatchConfig>): number | null {
  const owned = m.mounts.filter((x) => x.owned).length;
  if (owned >= m.mounts.length) return null;
  return config.content.economy.mountCosts[owned] ?? null;
}

export function buyMountIntent(m: HudModel, config: Readonly<MatchConfig>, side: Side): HudIntent {
  const cost = nextMountCost(m, config);
  if (cost === null || m.me.gold < cost) return deny('mounts');
  return cmd({ t: 'buyMount', side }, 'mounts');
}

export function buildIntent(m: HudModel, side: Side, mount: number, o: TurretOption): HudIntent {
  if (!o.affordable) return deny('mounts');
  return cmd({ t: 'buildTurret', side, mount: mount as Mount, slot: o.slot }, 'mounts');
}

export function moderniseIntent(m: HudModel, side: Side, mount: number, o: TurretOption): HudIntent {
  if (!o.affordable) return deny('mounts');
  return cmd({ t: 'replaceTurret', side, mount: mount as Mount, slot: o.slot }, 'mounts');
}

export function sellIntent(m: HudModel, side: Side, mount: number): HudIntent {
  const mm = m.mounts[mount];
  if (!mm || mm.state !== 'active') return deny('mounts');
  return cmd({ t: 'sellTurret', side, mount: mount as Mount }, 'mounts');
}

/**
 * Q / W: build loadout turret `slot` on the next free mount, or modernise the oldest outdated turret
 * when no mount is free (A2.12).
 */
export function quickTurretIntent(m: HudModel, config: Readonly<MatchConfig>, side: Side, slot: 0 | 1): HudIntent {
  const free = m.mounts.find((x) => x.owned && x.state === 'empty');
  if (free) {
    const opt = mountMenu(m, config, side, free.index).build.find((o) => o.slot === slot);
    return opt ? buildIntent(m, side, free.index, opt) : deny('mounts');
  }
  const ages = config.content.ages;
  const outdated = m.mounts
    .filter((x) => x.outdated && x.state === 'active' && x.card)
    .sort((a, b) => (ages[config.content.turrets[a.card ?? '']?.age ?? 'stone']?.index ?? 0) - (ages[config.content.turrets[b.card ?? '']?.age ?? 'stone']?.index ?? 0) || a.index - b.index);
  const oldest = outdated[0];
  if (!oldest) return deny('mounts');
  const opt = mountMenu(m, config, side, oldest.index).modernise.find((o) => o.slot === slot);
  return opt ? moderniseIntent(m, side, oldest.index, opt) : deny('mounts');
}

/**
 * Keyboard controls (A2.12, A18.4.2, A18.5.7). `key` is `KeyboardEvent.key`. P pauses (never Esc);
 * Escape closes the Council; G opens and closes it; S and Shift+S set the stance; Space casts the Home
 * power and X the Field power, both auto-aimed (A2.9.10); D places the fort on the most forward safe
 * pad (A16.14.7); T is free.
 */
export function keyIntent(key: string, m: HudModel, config: Readonly<MatchConfig>, side: Side, shift = false, rearming = false): HudIntent {
  if (m.phase === 'ended') return NONE;
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k >= '1' && k <= '7') return trainIntent(m, Number(k) - 1, side, config.content.economy.queueMax);
  switch (k) {
    case 'Backspace':
      return cancelIntent(m, side);
    case 'q':
      return quickTurretIntent(m, config, side, 0);
    case 'w':
      return quickTurretIntent(m, config, side, 1);
    case 'b':
      return buyMountIntent(m, config, side);
    case 'g':
      return m.me.research ? { k: 'council' } : NONE;
    case 'Escape':
      return { k: 'close' };
    case 'e':
      return evolveIntent(m, side, config, rearming);
    case ' ':
      return powerIntent(m, side, undefined, 'home');
    case 'x':
      return powerIntent(m, side, undefined, 'field');
    case 's':
      return stanceIntent(m, side, shift);
    case 'd':
      return fortIntent(m, side);
    case 'l':
      return lastStandIntent(m, side);
    case 'p':
      return { k: 'pause' };
    case 'f':
      return { k: 'speed' };
    default:
      return NONE;
  }
}

/**
 * Where the denied-press feedback goes when the sim rejects a command (DESIGN A9.2). The HUD
 * remembers the element that issued each command type and prefers that; this is the fallback.
 */
export function denyTargetFor(t: Command['t']): DenyTarget | null {
  switch (t) {
    case 'train':
    case 'cancelTrain':
      return 'army';
    case 'buildTurret':
    case 'replaceTurret':
    case 'sellTurret':
    case 'buyMount':
      return 'mounts';
    case 'research':
    case 'researchCancel':
      return 'council';
    case 'evolve':
      return 'evolve';
    case 'power':
      return 'power';
    case 'stance':
      return 'stance';
    case 'lastStand':
      return 'lastStand';
    case 'emote':
      return 'emote';
    case 'fort':
      return 'fort';
    case 'retreat':
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// The Fort button (DESIGN A16.14.7, F2): one slot per age, dragged onto a pad like a power. Pure rules;
// `FortButton.tsx` wires the pointer and `FortLane.tsx` draws the pads.
// ---------------------------------------------------------------------------------------------

/**
 * How the Fort button looks: recharging (ring filling, seconds shown), gold short (ring closed, cost chip
 * red), the alive cap ("2/2"), one camp at a time, the army full, Siege ("forts crumble"), or ready.
 */
export type FortSlotState = 'siege' | 'recharging' | 'cap' | 'campCap' | 'pop' | 'poor' | 'ready';

export interface FortSlotView {
  f: HudFort;
  state: FortSlotState;
  /** Recharge progress 0..1 (1 = ready). */
  frac: number;
  /** Whole seconds until recharged (0 when ready). */
  secondsLeft: number;
  /** Gold still missing (0 when affordable). */
  need: number;
  /** Pads this card may use (walls, towers, traps: Home only; camps: any), by index. */
  usable: number[];
  /** Usable pads that are legal now. */
  legal: number[];
}

/** Pads a fort of `kind` may use (A16.14.2 rule 1): walls, towers and traps Home pads only. */
export function fortUsablePads(f: HudFort): number[] {
  const pads = f.pads ?? [];
  const any = f.kind === 'camp';
  return pads.flatMap((pad, i) => (any || pad.kind === 'home' ? [i] : []));
}

/** The Fort slot's view, or null when the loadout has no Fort card this age (or the slot is locked). */
export function fortSlotView(m: HudModel): FortSlotView | null {
  const f = m.fort;
  if (!f || f.slotLocked) return null;
  const recharge = Math.max(1, f.rechargeMs ?? 25_000);
  const left = f.leftMs ?? f.secondsLeft * 1000;
  const frac = left <= 0 ? 1 : Math.max(0, Math.min(0.999, 1 - left / recharge));
  const secondsLeft = left <= 0 ? 0 : Math.max(1, f.secondsLeft);
  const need = f.affordable ? 0 : Math.max(1, f.cost - m.me.gold);
  const usable = fortUsablePads(f);
  const legal = usable.filter((i) => f.pads?.[i]?.legal === true);
  const pop = f.pop ?? 6;
  // The sim's order (A16.14.2): Siege, recharge, the caps, then (after the pad) the army and the gold.
  const state: FortSlotState = f.siege
    ? 'siege'
    : secondsLeft > 0
      ? 'recharging'
      : f.cap
        ? 'cap'
        : f.kind === 'camp' && f.campAlive
          ? 'campCap'
          : m.me.pop + pop > m.me.popCap
            ? 'pop'
            : !f.affordable
              ? 'poor'
              : 'ready';
  return { f, state, frac, secondsLeft, need, usable, legal };
}

/** Why the Fort button cannot start a placement now (MR-03), or null when it can. */
export function fortStateReason(v: FortSlotView): DenyReason | null {
  switch (v.state) {
    case 'siege':
      return { key: 'hud.deny.fortSiege' };
    case 'recharging':
      return { key: 'hud.deny.fortRecharge', params: { s: v.secondsLeft } };
    case 'cap':
      return { key: 'hud.deny.fortMax', params: { n: v.f.max ?? 2 } };
    case 'campCap':
      return { key: 'hud.deny.fortCampMax' };
    case 'pop':
      return { key: 'hud.deny.fortPop' };
    case 'poor':
      return { key: 'hud.deny.fortGold', params: { n: v.need } };
    case 'ready':
      return v.legal.length === 0 ? { key: 'hud.deny.fortNoPad' } : null;
  }
}

/** The short label of an illegal pad (A16.14.7: "Enemy near", "Army first", "Taken", "Camps only"). */
export function fortPadReasonKey(reason: string | null): string | null {
  switch (reason) {
    case null:
      return null;
    case 'fortPadEnemy':
      return 'hud.deny.fortEnemyNear';
    case 'fortPadField':
      return 'hud.deny.fortArmyFirst';
    case 'fortPadTaken':
      return 'hud.deny.fortTaken';
    case 'fortPadKind':
      return 'hud.deny.fortPadKind';
    default:
      return 'hud.deny.fortNoPad';
  }
}

/**
 * How a pad reads while a fort is aimed (A16.14.7): legal and safe (a green ring), legal but the enemy
 * can reach it before the scaffold completes (amber, "Builds under fire"), or illegal (grey, the reason).
 */
export type FortPadLook = 'safe' | 'underFire' | 'blocked';

export function fortPadLook(pad: HudFortPad): FortPadLook {
  return !pad.legal ? 'blocked' : pad.safe ? 'safe' : 'underFire';
}

/**
 * Key D and the AI's pad (A16.14.7, core `mostForwardSafePad`): the most forward safe pad the card may
 * use, else the most rearward legal one; null when no pad is legal.
 */
export function fortKeyPad(f: HudFort): number | null {
  const pads = f.pads ?? [];
  const usable = fortUsablePads(f);
  let best: number | null = null;
  for (const i of usable) if (pads[i]!.legal && pads[i]!.safe && (best === null || pads[i]!.p > pads[best]!.p)) best = i;
  if (best !== null) return best;
  for (const i of usable) if (pads[i]!.legal && (best === null || pads[i]!.p < pads[best]!.p)) best = i;
  return best;
}

/**
 * The legal pad nearest own-side `p` (lu) within `maxLu` (the drag snap: 24 px on screen), or null.
 * Ties go to the rearward pad.
 */
export function fortSnapPad(f: HudFort, p: number, maxLu: number = Infinity): number | null {
  const pads = f.pads ?? [];
  let best: number | null = null;
  let bestD = Infinity;
  for (const i of fortUsablePads(f)) {
    const pad = pads[i]!;
    if (!pad.legal) continue;
    const d = Math.abs(pad.p - p);
    if (d <= maxLu && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/**
 * A fort placement (a drop or a tap on `pad`; Key D without a pad picks {@link fortKeyPad}). What the HUD
 * can already see is denied with its reason (MR-03); the sim has the final word on the rest.
 */
export function fortIntent(m: HudModel, side: Side, pad?: number): HudIntent {
  if (m.phase === 'ended') return NONE;
  const v = fortSlotView(m);
  if (!v) return m.fort === undefined ? NONE : deny('fort', { key: 'hud.deny.fortEmpty' });
  const why = fortStateReason(v);
  if (why) return deny('fort', why);
  const at = pad ?? fortKeyPad(v.f);
  if (at === null) return deny('fort', { key: 'hud.deny.fortNoPad' });
  const target = v.f.pads?.[at];
  if (!target) return deny('fort', { key: 'hud.deny.fortNoPad' });
  if (!v.usable.includes(at)) return deny('fort', { key: 'hud.deny.fortPadKind' });
  if (!target.legal) return deny('fort', { key: fortPadReasonKey(target.reason) ?? 'hud.deny.fortNoPad' });
  return cmd({ t: 'fort', side, pad: at as 0 | 1 | 2 | 3 | 4 }, 'fort');
}

/** The deny label for a `fort` command the sim rejected (its reason codes, A16.14.2). */
export function fortReasonOf(reason: string, m: HudModel): DenyReason | null {
  const v = fortSlotView(m);
  switch (reason) {
    case 'noFort':
      return { key: 'hud.deny.fortEmpty' };
    case 'fortSiege':
      return { key: 'hud.deny.fortSiege' };
    case 'fortRecharge':
      return { key: 'hud.deny.fortRecharge', params: { s: Math.max(1, v?.secondsLeft ?? 1) } };
    case 'fortMax':
      return { key: 'hud.deny.fortMax', params: { n: m.fort?.max ?? 2 } };
    case 'fortCampMax':
      return { key: 'hud.deny.fortCampMax' };
    case 'fortPadKind':
    case 'fortPadTaken':
    case 'fortPadEnemy':
    case 'fortPadField':
      return { key: fortPadReasonKey(reason)! };
    case 'popFull':
      return { key: 'hud.deny.fortPop' };
    case 'noGold':
      return { key: 'hud.deny.fortGold', params: { n: Math.max(1, v?.need ?? 1) } };
    default:
      return null;
  }
}

/** m:ss for a non-negative duration. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface ClockView {
  /** Big clock text: time left to the Final Bell, or elapsed time when there is none. */
  text: string;
  countdown: boolean;
  /** 0..1 along the timeline, null without a Final Bell. */
  progress: number | null;
  /** `rope` marks a later step of the Siege rope (A2.10.2), where crumbling speeds up. */
  marks: { at: number; kind: 'overdrive' | 'siege' | 'rope' }[];
  /** Seconds until the next phase, or null. */
  nextPhase: { kind: 'overdrive' | 'siege' | 'finalBell'; inMs: number } | null;
}

export function clockView(m: HudModel): ClockView {
  const { overdriveMs, siegeMs, finalBellMs } = m.phaseMarks;
  if (finalBellMs === null) return { text: formatClock(m.clockMs), countdown: false, progress: null, marks: [], nextPhase: null };
  const marks: ClockView['marks'] = [];
  if (overdriveMs !== null) marks.push({ at: overdriveMs / finalBellMs, kind: 'overdrive' });
  if (siegeMs !== null) marks.push({ at: siegeMs / finalBellMs, kind: 'siege' });
  for (const at of m.escalation?.atMs.slice(1) ?? []) if (at < finalBellMs) marks.push({ at: at / finalBellMs, kind: 'rope' });
  const upcoming = (
    [
      ['overdrive', overdriveMs],
      ['siege', siegeMs],
      ['finalBell', finalBellMs],
    ] as const
  ).find(([, at]) => at !== null && at > m.clockMs);
  return {
    text: formatClock(finalBellMs - m.clockMs),
    countdown: true,
    progress: Math.min(1, m.clockMs / finalBellMs),
    marks,
    nextPhase: upcoming && upcoming[1] !== null ? { kind: upcoming[0], inMs: upcoming[1] - m.clockMs } : null,
  };
}

/** One pip of the Last Base Standing escalation meter (A2.10.1, A9.2). */
export interface EscalationPip {
  /** `overdrive`, then the Siege steps `s1`-`s3`, then the Crumble steps `c1`, `c2`. */
  key: string;
  atMs: number;
  /** `overdrive` (gold), `siege` (red) or `crumble` (stone, cracked). */
  tone: 'overdrive' | 'siege' | 'crumble';
  reached: boolean;
  /** The schedule line's values: base damage ×, turret damage −%, crumble % of base health a second. */
  base: number;
  turretCut: number;
  crumblePct: number;
}

export interface EscalationView {
  /** The clock counts up (no countdown anywhere, A2.10.1). */
  text: string;
  pips: EscalationPip[];
  /** The name key of the step in force (`hud.esc.step.*`; "No clock" before Overdrive). */
  stepKey: string;
  /** Crumbling now, for this HUD's side and the opponent's. */
  crumbling: { me: boolean; foe: boolean };
}

/**
 * The escalation meter of a war with no Final Bell (Last Base Standing): 6 pips (Overdrive, Siege I-III,
 * Crumble I-II) from the format's public steps; null in a timed format (its rope is {@link ropeView}).
 */
export function escalationView(m: HudModel, config: Readonly<MatchConfig>, side: Side): EscalationView | null {
  const e = m.escalation;
  if (!e || m.phaseMarks.finalBellMs !== null) return null;
  const steps = config.content.formats[config.format]?.escalation ?? [];
  const pips: EscalationPip[] = [];
  const od = m.phaseMarks.overdriveMs;
  if (od !== null) pips.push({ key: 'overdrive', atMs: od, tone: 'overdrive', reached: m.clockMs >= od, base: 1, turretCut: 0, crumblePct: 0 });
  let siege = 0;
  let crumble = 0;
  e.atMs.forEach((at, i) => {
    const d = steps[i];
    const isCrumble = (d?.crumbleBpPerSec ?? 0) > 0;
    const key = isCrumble ? `c${++crumble}` : `s${++siege}`;
    pips.push({
      key,
      atMs: at,
      tone: isCrumble ? 'crumble' : 'siege',
      reached: e.step > i,
      base: (d?.baseDamageBp ?? 10000) / 10000,
      turretCut: Math.round(100 - (d?.turretDamageBp ?? 10000) / 100),
      crumblePct: (d?.crumbleBpPerSec ?? 0) / 100,
    });
  });
  const current = [...pips].reverse().find((p) => p.reached);
  const foe: Side = side === 0 ? 1 : 0;
  return {
    text: formatClock(Math.floor(m.clockMs / 1000) * 1000),
    pips,
    stepKey: `hud.esc.step.${current ? current.key : 'regulation'}`,
    crumbling: { me: e.crumbling[side], foe: e.crumbling[foe] },
  };
}

/** One row of the Siege rope schedule of a timed war (A2.10.2): Overdrive, the rope steps, the Final Bell. */
export interface RopeRow {
  /** `overdrive`, `r1` (Siege), `r2`... (the rope tightens), `bell`. */
  key: string;
  atMs: number;
  reached: boolean;
  /** Base damage × and turret damage −% in the step (rope rows only). */
  base: number;
  turretCut: number;
  /** % of base health a second the side in its own half loses (rope rows only). */
  crumblePct: number;
}

export interface RopeView {
  /** The step in force: 0 before Siege, 1 = Siege, 2 = the rope tightened... */
  step: number;
  /** The phase tag's key while Siege runs (`hud.rope.step.r1` "Siege", `r2` "Siege II"); null before Siege. */
  stepKey: string | null;
  rows: RopeRow[];
  /** Crumbling now, for this HUD's side and the opponent's. */
  crumbling: { me: boolean; foe: boolean };
}

/**
 * The Siege rope of a Short, Medium or Long War (A2.10.2): the countdown and timeline stay; this adds who
 * crumbles now, the phase tag of a tightened rope and the schedule a tap on the clock drops down. Null
 * without Siege steps and in Last Base Standing (see {@link escalationView}).
 */
export function ropeView(m: HudModel, config: Readonly<MatchConfig>, side: Side): RopeView | null {
  const e = m.escalation;
  const bell = m.phaseMarks.finalBellMs;
  if (!e || bell === null) return null;
  const steps = config.content.formats[config.format]?.escalation ?? [];
  const rows: RopeRow[] = [];
  const od = m.phaseMarks.overdriveMs;
  if (od !== null) rows.push({ key: 'overdrive', atMs: od, reached: m.clockMs >= od, base: 1, turretCut: 0, crumblePct: 0 });
  e.atMs.forEach((at, i) => {
    const d = steps[i];
    rows.push({
      key: `r${i + 1}`,
      atMs: at,
      reached: e.step > i,
      base: (d?.baseDamageBp ?? 10000) / 10000,
      turretCut: Math.round(100 - (d?.turretDamageBp ?? 10000) / 100),
      crumblePct: (d?.crumbleBpPerSec ?? 0) / 100,
    });
  });
  rows.push({ key: 'bell', atMs: bell, reached: m.clockMs >= bell, base: 1, turretCut: 0, crumblePct: 0 });
  const foe: Side = side === 0 ? 1 : 0;
  return {
    step: e.step,
    stepKey: e.step > 0 ? `hud.rope.step.r${Math.min(e.step, 2)}` : null,
    rows,
    crumbling: { me: e.crumbling[side], foe: e.crumbling[foe] },
  };
}

/** Power charge 0..1. */
export function powerFraction(ppm: number): number {
  return Math.max(0, Math.min(1, ppm / PPM_FULL));
}

/** Low base HP (< 25%) shows the red vignette pulse (A9.2). */
export function lowHp(m: HudModel): boolean {
  return m.me.baseHpBp < 2500 && m.phase !== 'ended';
}

/**
 * Team colours per preset (DESIGN A11 Team readability): side 0 blue, side 1 orange, plus the two
 * colourblind presets. `ui` may not import `render` or `visuals` (B2), so the HUD keeps its copy.
 */
export const HUD_TEAM_COLORS: Record<TeamPreset, readonly [string, string]> = {
  default: ['#2F7DF6', '#F28A1E'],
  blueYellow: ['#2F7DF6', '#F2C21E'],
  highContrast: ['#1F5FD6', '#FF6A00'],
};

/** The HUD's own ("me") and the opponent's colour for the side this HUD shows. */
export function hudTeamColors(preset: TeamPreset, side: Side): { me: string; foe: string } {
  const [a, b] = HUD_TEAM_COLORS[preset];
  return side === 0 ? { me: a, foe: b } : { me: b, foe: a };
}

// ---------------------------------------------------------------------------------------------
// Readability helpers (usability audit): XP numbers, "affordable in 4s", the front-line strip,
// the blocked-at-the-gate callout and phase banners. Pure, so they are unit-tested without a DOM.
// ---------------------------------------------------------------------------------------------

/**
 * XP needed to leave age `ageIndex` in this match, in whole XP (Fast Forward applied, as in the
 * sim); null in the format's final age.
 */
export function xpNeeded(config: Readonly<MatchConfig>, ageIndex: number): number | null {
  const content = config.content;
  const fmt = content.formats[config.format];
  const age = ageIds(config)[ageIndex];
  if (!fmt || !age || ageIndex >= fmt.ages.length - 1) return null;
  const base = fmt.xpToNextOverride?.[ageIndex] ?? content.ages[age]?.xpToNext ?? null;
  if (base === null) return null;
  return Math.trunc((base * matchMods(config.modifiers, content).xpThresholdBp) / 10000);
}

/** "XP 180/250" values for your bar, or null in the final age. */
export function xpProgress(m: HudModel, config: Readonly<MatchConfig>): { xp: number; need: number } | null {
  const need = xpNeeded(config, m.me.ageIndex);
  if (need === null) return null;
  return { xp: Math.min(need, Math.floor((m.me.xpBp * need) / 10000)), need };
}

/**
 * Whole seconds until `cost` is affordable at the current income (rounded up), 0 when it already is,
 * or null without income. Kills and Treasury change it; it is an estimate for the card's countdown.
 */
export function secondsUntilAffordable(cost: number, gold: number, goldPerSec: number): number | null {
  if (gold >= cost) return 0;
  if (goldPerSec <= 0) return null;
  return Math.ceil((cost - gold) / goldPerSec);
}

/** 0..1: how close a card is to affordable (the grey card's fill). */
export function affordFraction(cost: number, gold: number): number {
  if (cost <= 0) return 1;
  return Math.max(0, Math.min(1, gold / cost));
}

/**
 * Where the fighting is, seen from your side: `mine` is your front unit's progress from your gate
 * (0) to theirs (1), `theirs` their front unit's, both null without units. The strip shows your
 * colour from the left up to your front and theirs from the right down to their front; the clash
 * point is between them.
 */
export interface FrontLine {
  mine: number | null;
  theirs: number | null;
}

export interface FrontStrip {
  /** Width of your colour from the left, 0..1. */
  mine: number;
  /** Width of their colour from the right, 0..1. */
  theirs: number;
  /** The clash marker, 0..1 from your gate. */
  clash: number;
}

export function frontStrip(f: FrontLine | null): FrontStrip {
  const mine = f?.mine ?? null;
  const theirs = f?.theirs ?? null;
  const a = mine === null ? 0.08 : Math.max(0.04, Math.min(1, mine));
  const b = theirs === null ? 0.92 : Math.max(0, Math.min(0.96, theirs));
  const clash = mine !== null && theirs !== null ? (Math.min(a, b) + Math.max(a, b)) / 2 : mine !== null ? a : theirs !== null ? b : 0.5;
  return { mine: a, theirs: 1 - b, clash: Math.max(0, Math.min(1, clash)) };
}

/** Your units count as "at their gate" beyond this progress. */
export const AT_GATE = 0.92;
/** How long they must stand there without hurting the base before the callout shows. */
export const BLOCKED_MS = 5000;
/** The callout shows at most once per this long. */
export const BLOCKED_GAP_MS = 45_000;

/**
 * "Blocked at their gate: Evolve or use power." (at most 8 words, A8) (audit #7): your front has stood at their gate
 * for 5 s while their base took no damage. Feed it every HUD model (15 Hz); `update` returns true on
 * the model where the callout should appear.
 */
export class BlockedWatch {
  private since: number | null = null;
  private hp = -1;
  private lastShown = -Infinity;

  update(clockMs: number, front: FrontLine | null, foeBaseHpBp: number, ended: boolean): boolean {
    const atGate = !ended && front?.mine !== null && front?.mine !== undefined && front.mine >= AT_GATE;
    if (!atGate || foeBaseHpBp < this.hp) {
      this.since = atGate ? clockMs : null;
      this.hp = foeBaseHpBp;
      return false;
    }
    this.hp = foeBaseHpBp;
    if (this.since === null) this.since = clockMs;
    if (clockMs - this.since >= BLOCKED_MS && clockMs - this.lastShown >= BLOCKED_GAP_MS) {
      this.lastShown = clockMs;
      this.since = clockMs;
      return true;
    }
    return false;
  }
}

/** The phase banner for a phase that just started (audit #24), as i18n keys. */
export function phaseBanner(phase: HudModel['phase'], rope = false): { title: string; sub: string } | null {
  if (phase === 'overdrive') return { title: 'hud.banner.overdrive', sub: 'hud.banner.overdriveSub' };
  // A2.10.2: with the Siege rope only the side fighting in its own half crumbles.
  if (phase === 'siege') return { title: 'hud.banner.siege', sub: rope ? 'hud.banner.siegeRopeSub' : 'hud.banner.siegeSub' };
  return null;
}
