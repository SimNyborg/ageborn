/**
 * Pure HUD logic (DESIGN A9.2, A2.12): what a press or a key means for the current `HudModel`, the
 * turret mount menu, clock and timeline values. The Preact components stay thin and these rules are
 * unit-tested without a DOM.
 *
 * A press the HUD can already tell is invalid becomes a `deny` intent (red flash, 2-frame shake,
 * `ui_deny`, A9.2) instead of a command; everything else is sent and the sim has the final word.
 */
import type { AgeId, CardId, Command, HudModel, MatchConfig, Side, StanceMode, TeamPreset } from '@/contracts';
import { matchMods } from '@/core';

/** Elements that can show the denied-press feedback. */
export type DenyTarget =
  | 'card0'
  | 'card1'
  | 'card2'
  | 'card3'
  | 'card4'
  | 'card5'
  | 'gold'
  | 'evolve'
  | 'power'
  | 'stance'
  | 'lastStand'
  | 'mounts'
  | 'army'
  | 'emote'
  | 'council'
  | 'flag';

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

/** Six troops per battle (A18.9). */
type Slot = 0 | 1 | 2 | 3 | 4 | 5;
type Mount = 0 | 1 | 2 | 3;

export function cardTarget(slot: number): DenyTarget {
  return `card${Math.max(0, Math.min(5, slot)) as Slot}`;
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

/** Tap = auto-aim (no p); a drag passes the placed p (A2.9). */
export function powerIntent(m: HudModel, side: Side, p?: number): HudIntent {
  if (m.phase === 'ended') return deny('power');
  if (m.me.powerPpm < PPM_FULL) return deny('power', { key: 'hud.deny.power', params: { pct: Math.floor(powerFraction(m.me.powerPpm) * 100) } });
  return cmd(p === undefined ? { t: 'power', side } : { t: 'power', side, p }, 'power');
}

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
export function simDenyReason(reason: string, m: HudModel, slot?: number): DenyReason | null {
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
 * A press on a stance segment (A18.4.2). The sim accepts a change at most once per 3 s; a press the HUD
 * can see is too early is denied on the control (a short fill shows the wait).
 */
export function stanceSetIntent(m: HudModel, side: Side, mode: StanceMode): HudIntent {
  if (!m.me.stanceVisible || m.phase === 'ended') return NONE;
  if (mode === m.me.stance) return NONE;
  const wait = m.me.stanceWaitMs ?? 0;
  if (wait > 0) return deny('stance', { key: 'hud.deny.stanceWait', params: { s: Math.max(1, Math.ceil(wait / 1000)) } });
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
  if (m.me.stance !== 'hold' && (m.me.stanceWaitMs ?? 0) > 0) return deny('flag');
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
 * Escape closes the Council; G opens and closes it; S and Shift+S set the stance; T is free.
 */
export function keyIntent(key: string, m: HudModel, config: Readonly<MatchConfig>, side: Side, shift = false, rearming = false): HudIntent {
  if (m.phase === 'ended') return NONE;
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k >= '1' && k <= '6') return trainIntent(m, Number(k) - 1, side, config.content.economy.queueMax);
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
      return powerIntent(m, side);
    case 's':
      return stanceIntent(m, side, shift);
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
    case 'retreat':
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
  marks: { at: number; kind: 'overdrive' | 'siege' }[];
  /** Seconds until the next phase, or null. */
  nextPhase: { kind: 'overdrive' | 'siege' | 'finalBell'; inMs: number } | null;
}

export function clockView(m: HudModel): ClockView {
  const { overdriveMs, siegeMs, finalBellMs } = m.phaseMarks;
  if (finalBellMs === null) return { text: formatClock(m.clockMs), countdown: false, progress: null, marks: [], nextPhase: null };
  const marks: ClockView['marks'] = [];
  if (overdriveMs !== null) marks.push({ at: overdriveMs / finalBellMs, kind: 'overdrive' });
  if (siegeMs !== null) marks.push({ at: siegeMs / finalBellMs, kind: 'siege' });
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
export function phaseBanner(phase: HudModel['phase']): { title: string; sub: string } | null {
  if (phase === 'overdrive') return { title: 'hud.banner.overdrive', sub: 'hud.banner.overdriveSub' };
  if (phase === 'siege') return { title: 'hud.banner.siege', sub: 'hud.banner.siegeSub' };
  return null;
}
