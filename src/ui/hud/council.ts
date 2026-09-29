/**
 * The War Council as the HUD shows it (DESIGN A18.5, A18.5.7): pure rules, unit-tested without a DOM.
 *
 * The Council has four tracks. Economy, Defences and Command are one line each; Troops is one line per
 * class. A line's next item is the pair of picks at the rank after its highest owned rank; the two
 * picks of a rank exclude each other. Research runs in one slot. The sim is the authority
 * (`sim/research.ts`); these rules only decide what the sheet shows and which presses it sends.
 */
import type { AgeId, Command, HudModel, HudResearch, MatchConfig, ResearchClass, ResearchPickDef, ResearchTrack, Side } from '@/contracts';
import { rankOpensAt, researchCommand } from '@/core';
import type { HudIntent } from './model';
import { ageIds } from './model';

/** The track order on the sheet (A18.5: Troops, Defences, Economy, Command). */
export const TRACKS: readonly ResearchTrack[] = ['troops', 'defences', 'economy', 'command'];
/** The Troops class lines, in the order the class legend uses. */
export const TROOP_CLASSES: readonly ResearchClass[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support'];

/**
 * What one pick card shows:
 * - `ready`: can start now; `poor`: needs more gold; `busy`: the slot is in use;
 * - `researching`: this pick is in the slot; `owned`; `excluded`: its pair partner is owned;
 * - `locked`: the rank has not opened in this window yet (`opensAt` says when, if ever).
 */
export type PickState = 'ready' | 'poor' | 'busy' | 'researching' | 'owned' | 'excluded' | 'locked';

export interface CouncilPick {
  def: ResearchPickDef;
  state: PickState;
  /** Price now in whole gold (underdog discount applied). */
  price: number;
  /** List price in whole gold. */
  listPrice: number;
  timeMs: number;
  /** The age where this pick's rank opens, when `locked` (null: never in this window). */
  opensAt: AgeId | null;
}

/** One research line: a track, or a Troops class. */
export interface CouncilLine {
  key: string;
  track: ResearchTrack;
  group: ResearchClass | null;
  /** Ranks owned in this line (0..3). */
  ownedRanks: number;
  /** Ranks that exist in v1 content for this line. */
  maxRank: number;
  /** The rank of `pair`, or null when the line is complete. */
  nextRank: 1 | 2 | 3 | null;
  /** The next rank's two picks (A first), or null when the line is complete. */
  pair: [CouncilPick, CouncilPick] | null;
  /** The owned picks of this line, in rank order. */
  owned: ResearchPickDef[];
  /** Troops: the current tray has a unit of this class (A18.5.2 "Not in this tray"). */
  inTray: boolean;
  /** Any pick of `pair` can start right now. */
  ready: boolean;
}

export interface CouncilView {
  lines: CouncilLine[];
  /** The pick in the slot, with progress. */
  current: { def: ResearchPickDef; progressBp: number; leftMs: number; line: string } | null;
  discount: boolean;
  discountBp: number;
  /** Something can start now (the button's dot). */
  anyReady: boolean;
  /** Research exists in this window at all (a 0-rank window or the tutorial hides the button). */
  enabled: boolean;
  /** Share of the price a cancel refunds (75%). */
  cancelRefundBp: number;
}

/** The line key of a pick: the track, or `troops.<class>`. */
export function lineKey(p: Pick<ResearchPickDef, 'track' | 'group'>): string {
  return p.track === 'troops' && p.group ? `troops.${p.group}` : p.track;
}

/** Research of the HUD's own side, or an idle, closed Council for models without one. */
export function myResearch(m: HudModel): HudResearch {
  return m.me.research ?? { owned: [], current: null, progressBp: 0, leftMs: 0, ranksOpen: 0, discount: false };
}

/** Price in whole gold after the underdog discount (rounded down, as the sim does). */
export function discounted(list: number, discount: boolean, discountBp: number): number {
  if (!discount || discountBp <= 0) return list;
  return Math.trunc((list * 1000 * (10000 - discountBp)) / 10000) / 1000;
}

/** The classes the side's current tray holds (Epics and Legendaries count by their base role). */
export function trayClasses(config: Readonly<MatchConfig>, side: Side, ageIndex: number): Set<ResearchClass> {
  const age = ageIds(config)[ageIndex];
  const lo = age ? config.sides[side].loadouts[age] : undefined;
  const out = new Set<ResearchClass>();
  for (const card of lo?.units ?? []) {
    const def = card ? config.content.units[card] : undefined;
    if (def) out.add(config.content.research.classOfRole[def.role]);
  }
  return out;
}

/** Builds the Council view for the HUD's own side. */
export function councilView(m: HudModel, config: Readonly<MatchConfig>, side: Side): CouncilView {
  const rules = config.content.research;
  const r = myResearch(m);
  const owned = new Set(r.owned);
  const ages = ageIds(config);
  const windowLen = config.content.formats[config.format]?.ages.length ?? ages.length;
  const tray = trayClasses(config, side, m.me.ageIndex);
  const ended = m.phase === 'ended';
  const byId = new Map(rules.picks.map((p) => [p.id, p]));

  const keys: { key: string; track: ResearchTrack; group: ResearchClass | null }[] = [];
  for (const track of TRACKS) {
    if (track === 'troops') {
      for (const g of TROOP_CLASSES) if (rules.picks.some((p) => p.track === 'troops' && p.group === g)) keys.push({ key: `troops.${g}`, track, group: g });
    } else if (rules.picks.some((p) => p.track === track)) keys.push({ key: track, track, group: null });
  }

  const pickView = (def: ResearchPickDef, pairOwned: boolean): CouncilPick => {
    const listPrice = rules.cost[def.track][def.rank - 1] ?? 0;
    const price = discounted(listPrice, r.discount, rules.underdog.discountBp);
    const timeMs = rules.timeMs[def.rank - 1] ?? 0;
    let state: PickState;
    let opensAt: AgeId | null = null;
    if (owned.has(def.id)) state = 'owned';
    else if (pairOwned) state = 'excluded';
    else if (r.current === def.id) state = 'researching';
    else if (def.rank > r.ranksOpen) {
      state = 'locked';
      const at = rankOpensAt(config.content, def.rank, windowLen);
      opensAt = at === null ? null : (ages[at] ?? null);
    } else if (r.current !== null || ended) state = 'busy';
    else if (m.me.gold < price) state = 'poor';
    else state = 'ready';
    return { def, state, price, listPrice, timeMs, opensAt };
  };

  const lines: CouncilLine[] = keys.map(({ key, track, group }) => {
    const mine = rules.picks.filter((p) => lineKey(p) === key);
    const maxRank = mine.reduce((a, p) => Math.max(a, p.rank), 0);
    const ownedPicks = mine.filter((p) => owned.has(p.id)).sort((a, b) => a.rank - b.rank);
    const ownedRanks = ownedPicks.reduce((a, p) => Math.max(a, p.rank), 0);
    const next = ownedRanks + 1;
    const pairDefs = mine.filter((p) => p.rank === next).sort((a, b) => a.pick - b.pick);
    let pair: [CouncilPick, CouncilPick] | null = null;
    const a = pairDefs[0];
    const b = pairDefs[1];
    if (a && b) pair = [pickView(a, false), pickView(b, false)];
    return {
      key,
      track,
      group,
      ownedRanks,
      maxRank,
      nextRank: pair ? (next as 1 | 2 | 3) : null,
      pair,
      owned: ownedPicks,
      inTray: group === null || tray.has(group),
      ready: pair !== null && pair.some((x) => x.state === 'ready'),
    };
  });

  const curDef = r.current ? byId.get(r.current) : undefined;
  return {
    lines,
    current: curDef ? { def: curDef, progressBp: r.progressBp, leftMs: r.leftMs, line: lineKey(curDef) } : null,
    discount: r.discount,
    discountBp: rules.underdog.discountBp,
    anyReady: lines.some((l) => l.ready),
    enabled: rules.picks.length > 0 && m.me.research !== undefined && r.ranksOpen > 0,
    cancelRefundBp: rules.cancelRefundBp,
  };
}

/** A pick's line in a view. */
export function lineOf(v: CouncilView, key: string): CouncilLine | undefined {
  return v.lines.find((l) => l.key === key);
}

/** The Troops lines in a view. */
export function troopLines(v: CouncilView): CouncilLine[] {
  return v.lines.filter((l) => l.track === 'troops');
}

/**
 * The press on a pick card that confirms it (the second tap, A15 U14: a spend takes two taps). A pick
 * the HUD can already tell cannot start is denied on the Council button.
 */
export function researchIntent(pick: CouncilPick, side: Side): HudIntent {
  if (pick.state !== 'ready') return { k: 'deny', target: 'council' };
  return { k: 'command', cmd: researchCommand(side, pick.def), target: 'council' };
}

/** Cancel the research in the slot (75% refund). */
export function cancelResearchIntent(v: CouncilView, side: Side): HudIntent {
  if (!v.current) return { k: 'deny', target: 'council' };
  const c: Command = { t: 'researchCancel', side };
  return { k: 'command', cmd: c, target: 'council' };
}

/** Whole seconds, rounded up, for "6 s" labels. */
export function secondsLeft(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}
