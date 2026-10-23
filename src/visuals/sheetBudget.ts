/**
 * The unit sheet memory governor (iPhone memory, 2026-10-18).
 *
 * A battle holds the unit sheets both armies can draw (`render/matchArt.ts`). With big collections that
 * set outgrew the 600 MB decoded budget at DPR 2: the test profile's Standard War peaked at 645-718 MB and
 * two full decks with no card in common at 836 MB, almost all of it HD unit sheets (each side's current age
 * and, near an evolve, its next age, at up to 92 MB a unit). iOS closes a Safari tab that holds too much.
 *
 * The governor gives every sheet a battle holds one of two densities: HD (2.46 px per lu, what dense screens
 * draw) or its 1x copy (1.23 px per lu, a quarter of the memory). Every held sheet has at least its 1x copy,
 * so no unit ever waits for art or shows a stand-in; HD goes to the sheets that matter most, by rank, while
 * the total stays within `UNIT_SHEET_BUDGET_BYTES`:
 *
 * 0. `field`: units on the lane now.
 * 1. `soon`: what appears within seconds: the training queues, what units on the lane summon or drop, the
 *    Vanguard and the queue's conversions during an Ascension, a deck's paradrops and levies.
 * 2. `deck`: the rest of each side's current age.
 * 3. `next`: a side's next age once its evolve is near.
 *
 * A normal deck fits whole (a new player's war never leaves HD). A queued card's HD loads during its
 * training, so a big deck's units still walk out in HD; a unit that walks out on its 1x copy switches to HD
 * as soon as that has loaded (`AtlasAdapter.upgradeViews`). Ties go to the sheet already in HD (no back and
 * forth), then to the smaller sheet (more units in HD for the same memory), then by name (deterministic).
 * A lower rank never takes HD that a higher rank could not get. An HD copy that units on the lane draw stays
 * in memory anyway (a view never loses its sheet), so it keeps HD and counts first.
 *
 * Every copy change costs a load and a GPU upload (tens of ms on an iPhone for a big sheet), so a sheet does
 * not change copy for every small change of rank (review S1, 2026-10-18): an HD copy whose load is in flight
 * or whose step down to 1x is not confirmed yet stays (`hdKeep`, counted like a drawn copy), and an HD copy
 * that got HD or was drawn within `HD_HOLD_MS` keeps it before any other sheet but the lane's gets HD, as long as
 * the plan stays within the budget (`hdRecent`; review 2 S-b: the lane comes first). The provider confirms a step
 * down to 1x only when a plan `DEMOTE_CONFIRM_MS` later still wants it. A sheet held as optional (the next age's
 * deck before its side's Ascension) loads only where its HD copy fits and otherwise has no copy (`none`): it
 * cannot be drawn before a hold asks for it again, so it never loads 1x first and HD a moment later. A sheet held
 * `noRaise` (its side has left its age, or is leaving it and no unit of it stands on the lane) that is on its 1x
 * copy stays there: its units are about to be gone, and an HD load for them would be one more load and upload
 * near the evolve.
 *
 * Cards of an age their side is leaving or has left are `leaving` (review 2 S-b, 2026-10-23). A card stepped down
 * at its side's hand-over and trained once more walks out on its 1x copy and may stand through the evolve's
 * camera push, so on the lane it is raised at once; there its HD copy (and that of every unit of such an age on
 * the lane) may take up to `LEAVING_LANE_BYTES` above the budget (`leavingAllowance`). Without that room the raise
 * stepped one of the next deck's fresh copies down, which then loaded twice more (its 1x copy before the evolve,
 * its HD copy after it); keeping room free under the budget instead left more of every next deck on its 1x copy
 * at each hand-over. The units it covers are gone within a minute of their side's age-up.
 *
 * Pure and deterministic; presentation only: the sim never sees any of this.
 */
import { UNIT_SHEET_PIXELS } from './unitSheetPixels.gen';

/** A held sheet's copy: HD, 1x, or none yet (an optional sheet that does not fit in HD). */
export type SheetDensity = 'hd' | 'sd' | 'none';

/** Priority ranks of a held sheet (lower is more important). */
export const SHEET_RANK = { field: 0, soon: 1, deck: 2, next: 3 } as const;

/**
 * A sheet whose HD copy loaded, or whose HD copy units last drew, this recently (real ms) keeps HD within the
 * budget before any other sheet gets it (review S1: a unit fielded every half minute went HD → 1x → HD).
 */
export const HD_HOLD_MS = 30_000;

/** A step down from HD to 1x happens only when a plan this long (real ms) after the first one still wants it. */
export const DEMOTE_CONFIRM_MS = 1_000;

/**
 * Decoded unit sheet memory a battle may plan with, HD and 1x copies together (bytes). The rest of a war's
 * decoded images (the baked parts, turret, base and fort sheets, the backdrop scenes) stays under about
 * 150 MB, so a war keeps under 560 MB, a margin under the 600 MB budget (`tests/e2e/memory.spec.ts`), also with
 * the leaving units' room above it (`LEAVING_LANE_BYTES`).
 */
export const UNIT_SHEET_BUDGET_BYTES = 320_000_000;

/**
 * Room above the budget for the HD copies of units on the lane of an age their side is leaving or has left
 * (bytes; `SheetWant.leaving`, the provider's plans, `planSheetDensities`' `leavingAllowance`; review 2 S-b). What
 * their HD copies take over their 1x copies counts here first, so a unit that walks out on its 1x copy (a card
 * stepped down at its side's hand-over, then trained once more) gets its HD copy at once without stepping another
 * copy down, and the rest of the plan keeps the whole budget. About two typical units' HD copies; for the few
 * moments a war has such units on the lane.
 */
export const LEAVING_LANE_BYTES = 24_000_000;

/** One sheet a battle holds. */
export interface SheetWant {
  /** The unit sheet source (`art/units/<age>/<slug>.json`). */
  source: string;
  /** Its best rank over everything that holds it ({@link SHEET_RANK}). */
  rank: number;
  /** Decoded bytes of its HD copy and of its 1x copy (core and extras sheets). */
  hdBytes: number;
  sdBytes: number;
  /** Its HD copy is loaded now: kept ahead of equal ranks, so a sheet does not flip back and forth. */
  hdResident?: boolean;
  /**
   * Units on the lane draw its HD copy now, so that copy stays in memory whatever the plan says (a view never
   * loses its sheet): it keeps HD and counts first, since a 1x copy next to it would only add memory.
   */
  hdDrawn?: boolean;
  /**
   * Its HD copy stays this plan whatever else wants the memory: its load is in flight (dropping it would waste
   * the decode under way and still upload it), or its step down to 1x is not confirmed yet. Counted like a
   * drawn copy.
   */
  hdKeep?: boolean;
  /**
   * Its HD copy is in memory and loaded, or was drawn, within `HD_HOLD_MS`: it keeps HD before any other sheet but
   * the lane's gets it while the plan stays within the budget. Only up to the deck rank: a side handing over to its
   * next age ranks its current deck `next`, and that lets go.
   */
  hdRecent?: boolean;
  /**
   * Its 1x copy is loaded now. Raised to HD, that copy stays until the HD copy has loaded (a unit is never
   * left without art), so the raise costs the whole HD copy meanwhile: the plan counts it so.
   */
  sdResident?: boolean;
  /**
   * Nothing can draw it before it is held again without this (the next age's deck before its side's Ascension):
   * it gets its HD copy where that fits and otherwise no copy (`none`), unless its 1x copy is in already.
   */
  optional?: boolean;
  /**
   * Its side is leaving its age (or has left it): with its 1x copy in and no HD copy, it stays at 1x whatever
   * room there is (no HD load for units about to be gone).
   */
  noRaise?: boolean;
  /**
   * Its units belong to an age their side is leaving or has left (every holder says so): on the lane, what its HD
   * copy takes over its 1x copy counts against the leaving units' room above the budget first
   * ({@link LEAVING_LANE_BYTES}; review 2 S-b).
   */
  leaving?: boolean;
  /**
   * Nothing draws it for a while yet (the next age's deck during its side's hand-over): while copies the plan is
   * leaving still take their memory, its load waits without a copy (`holdBackNewHd`) rather than loading 1x first.
   */
  canWait?: boolean;
}

/** Decoded bytes of a unit sheet's HD and 1x copies (core and extras), or null for an unknown source. */
export function unitSheetBytes(source: string): { hd: number; sd: number } | null {
  const m = /art\/units\/([a-z]+)\/([a-z0-9_]+)\.json$/.exec(source);
  const px = m ? UNIT_SHEET_PIXELS[`${m[1]}/${m[2]}`] : undefined;
  if (!px) return null;
  return { hd: (px[0] + px[1]) * 4, sd: (px[2] + px[3]) * 4 };
}

/** What an unknown sheet is planned at (a new unit before the table is regenerated): the median unit's. */
export const UNKNOWN_SHEET_BYTES = { hd: 11_000_000, sd: 2_900_000 } as const;

function byPriority(a: SheetWant, b: SheetWant): number {
  return a.rank - b.rank || Number(b.hdResident === true) - Number(a.hdResident === true) || a.hdBytes - b.hdBytes || (a.source < b.source ? -1 : a.source > b.source ? 1 : 0);
}

/** True when a sheet keeps HD this plan whatever it says: units draw its HD copy, or it is kept (`hdKeep`). */
function pinned(w: SheetWant): boolean {
  return w.hdDrawn === true || w.hdKeep === true;
}

/** True when a sheet may go without a copy this plan: optional, not pinned, and no 1x copy in. */
function mayGoWithout(w: SheetWant): boolean {
  return w.optional === true && !pinned(w) && w.sdResident !== true;
}

/** True when a sheet stays on its 1x copy this plan: `noRaise`, its 1x copy in, no HD copy in, not pinned. */
function staysSd(w: SheetWant): boolean {
  return w.noRaise === true && w.sdResident === true && w.hdResident !== true && !pinned(w);
}

/** Wanted sheets once each, at their best rank (pinned or recent if any want is; optional, noRaise and leaving only if all are), by priority. */
function mergedWants(wants: readonly SheetWant[]): SheetWant[] {
  const best = new Map<string, SheetWant>();
  for (const w of wants) {
    const had = best.get(w.source);
    if (!had) {
      best.set(w.source, { ...w });
      continue;
    }
    const merged = { ...(byPriority(w, had) < 0 ? w : had) };
    merged.hdDrawn = w.hdDrawn === true || had.hdDrawn === true;
    merged.hdKeep = w.hdKeep === true || had.hdKeep === true;
    merged.hdRecent = w.hdRecent === true || had.hdRecent === true;
    merged.optional = w.optional === true && had.optional === true;
    merged.noRaise = w.noRaise === true && had.noRaise === true;
    merged.leaving = w.leaving === true && had.leaving === true;
    best.set(w.source, merged);
  }
  return [...best.values()].sort(byPriority);
}

/**
 * What a sheet planned HD takes over a plan that keeps it at 1x (or without a copy): a 1x copy in memory stays
 * until the HD copy has loaded (unless that is in memory too), and a sheet with no copy yet takes its whole HD
 * copy; a pinned HD copy takes what it holds over its 1x copy.
 */
function extraOf(w: SheetWant): number {
  if (pinned(w)) return Math.max(0, w.hdBytes - w.sdBytes);
  return mayGoWithout(w) || (w.sdResident && !w.hdResident) ? w.hdBytes : Math.max(0, w.hdBytes - w.sdBytes);
}

/** True when a sheet's HD copy counts against the leaving units' room: units of an age their side leaves stand on the lane. */
function goingLane(w: SheetWant): boolean {
  return w.leaving === true && w.rank === SHEET_RANK.field;
}

/**
 * The room above the budget a plan's leaving lane sheets take (bytes, at most `allowance`): what their HD copies
 * take over their 1x copies ({@link LEAVING_LANE_BYTES}). The provider holds new loads back against the budget plus
 * this (`holdBackNewHd`).
 */
export function leavingRoom(wants: readonly SheetWant[], plan: ReadonlyMap<string, SheetDensity>, allowance: number): number {
  let taken = 0;
  for (const w of mergedWants(wants)) if (goingLane(w) && plan.get(w.source) === 'hd') taken += extraOf(w);
  return Math.min(Math.max(0, allowance), taken);
}

/**
 * The density of every wanted sheet: an HD copy units on the lane draw (or one kept, `hdKeep`) keeps HD, every
 * other sheet starts at 1x (an optional one at no copy); then the lane's sheets get HD, then recent HD copies
 * (`hdRecent`, up to the deck rank) keep HD and the rest gets HD by priority, all within `budgetBytes` plus the room
 * the leaving lane sheets take above it (`leaving`, up to `leavingAllowance`, {@link LEAVING_LANE_BYTES}; default 0).
 * A rank whose sheet did not fit still lets its smaller sheets in, but no lower rank gets HD after it. An optional
 * sheet left without HD is `none`; a `noRaise` sheet on its 1x copy stays at 1x (and blocks nothing). Duplicate
 * sources count once, at their best rank (pinned or recent if any of them is; optional, noRaise and leaving only
 * if all of them are).
 */
export function planSheetDensities(wants: readonly SheetWant[], budgetBytes: number, o: { leavingAllowance?: number } = {}): Map<string, SheetDensity> {
  const list = mergedWants(wants);
  const plan = new Map<string, SheetDensity>();
  let total = 0;
  for (const w of list) {
    plan.set(w.source, pinned(w) ? 'hd' : mayGoWithout(w) ? 'none' : 'sd');
    total += pinned(w) ? w.hdBytes : mayGoWithout(w) ? 0 : w.sdBytes;
  }
  // the leaving units' HD copies on the lane take the room above the budget first (review 2 S-b)
  const allowance = Math.max(0, o.leavingAllowance ?? 0);
  let going = 0;
  for (const w of list) if (goingLane(w) && pinned(w)) going += extraOf(w);
  // the lane comes first (review 2 S-b): a sheet units draw on the lane gets HD before a recent copy of a lower rank
  // keeps it; in a hand-over the next deck's fresh HD copies held the room while two units on the lane stayed on
  // their 1x copy through the evolve's camera push
  for (const w of list) {
    if (w.rank !== SHEET_RANK.field || plan.get(w.source) === 'hd' || staysSd(w)) continue;
    const extra = extraOf(w);
    if (total + extra > budgetBytes + Math.min(allowance, going + (goingLane(w) ? extra : 0))) continue;
    plan.set(w.source, 'hd');
    total += extra;
    if (goingLane(w)) going += extra;
  }
  const limit = budgetBytes + Math.min(allowance, going);
  for (const w of list) {
    if (pinned(w) || plan.get(w.source) === 'hd' || w.hdRecent !== true || w.rank > SHEET_RANK.deck || staysSd(w)) continue;
    const extra = extraOf(w);
    if (total + extra > limit) continue;
    plan.set(w.source, 'hd');
    total += extra;
  }
  let blocked = Infinity;
  for (const w of list) {
    if (plan.get(w.source) === 'hd' || staysSd(w)) continue;
    if (w.rank > blocked) break;
    const extra = extraOf(w);
    if (total + extra <= limit) {
      plan.set(w.source, 'hd');
      total += extra;
    } else blocked = w.rank;
  }
  return plan;
}

/** The planned total (bytes) of a plan over its wants: HD where planned HD, nothing where none, else 1x. */
export function plannedBytes(wants: readonly SheetWant[], plan: ReadonlyMap<string, SheetDensity>): number {
  const seen = new Set<string>();
  let total = 0;
  for (const w of wants) {
    if (seen.has(w.source)) continue;
    seen.add(w.source);
    const d = plan.get(w.source);
    total += d === 'hd' ? w.hdBytes : d === 'none' ? 0 : w.sdBytes;
  }
  return total;
}

/**
 * Decoded bytes a plan holds in memory while it settles: both copies of a sheet moving between them (a copy goes
 * only once the other can draw), so an HD copy stepping down still counts until its 1x copy is in, and a 1x copy
 * stepping up until its HD copy is.
 */
export function settlingBytes(wants: readonly SheetWant[], plan: ReadonlyMap<string, SheetDensity>): number {
  const seen = new Set<string>();
  let total = 0;
  for (const w of wants) {
    if (seen.has(w.source)) continue;
    seen.add(w.source);
    const d = plan.get(w.source);
    const hd = d === 'hd' || w.hdResident === true || w.hdDrawn === true;
    const sd = d === 'sd' || (w.sdResident === true && !(d === 'hd' && w.hdResident === true));
    total += (hd ? w.hdBytes : 0) + (sd ? w.sdBytes : 0);
  }
  return total;
}

/**
 * Holds back new loads while the copies a plan is leaving still take their memory (2026-10-18): an HD copy
 * planned 1x stays until its 1x copy is in, so a plan that hands that room to new HD copies at once holds both
 * for a moment (a side's hand-over: its current deck stepping down while the next deck's HD copies load went
 * 130 MB over the budget in a fast-forwarded war).
 * - While `settlingBytes` is over `budgetBytes`, the lowest-ranked new HD loads (`isNew(source, 'hd')`: planned HD
 *   with no HD copy on the way) wait: a sheet with its 1x copy in keeps it, an optional one (or one that
 *   `canWait`) gets no copy yet, any other one its 1x copy.
 * - While copies are stepping down (`settling`, e.g. a step down still waiting for its confirmation), a sheet that
 *   can wait gets no new 1x copy either: the room it waits for is coming, and a 1x copy now would be followed by
 *   the HD copy a moment later.
 * A plan once those copies have gone lets them in (the caller plans again). Changes `plan` in place; returns the
 * sources held back.
 */
export function holdBackNewHd(
  wants: readonly SheetWant[],
  plan: Map<string, SheetDensity>,
  budgetBytes: number,
  isNew: (source: string, density: 'hd' | 'sd') => boolean,
  settling = false,
): string[] {
  const seen = new Set<string>();
  const unique: SheetWant[] = [];
  for (const w of wants) {
    if (seen.has(w.source)) continue;
    seen.add(w.source);
    unique.push(w);
  }
  const waits = (w: SheetWant): boolean => (w.optional === true || w.canWait === true) && w.sdResident !== true && !pinned(w);
  const held: string[] = [];
  let total = settlingBytes(unique, plan);
  if (settling || total > budgetBytes) {
    for (const w of unique) {
      if (plan.get(w.source) !== 'sd' || !waits(w) || !isNew(w.source, 'sd')) continue;
      plan.set(w.source, 'none');
      total -= w.sdBytes;
      held.push(w.source);
    }
  }
  if (total <= budgetBytes) return held;
  const fresh = unique.filter((w) => plan.get(w.source) === 'hd' && w.hdResident !== true && !pinned(w) && isNew(w.source, 'hd'));
  fresh.sort(byPriority).reverse();
  for (const w of fresh) {
    if (total <= budgetBytes) break;
    const to: SheetDensity = w.sdResident === true ? 'sd' : waits(w) ? 'none' : 'sd';
    // planned HD it counted its HD copy (and a 1x copy in); now only the 1x copy (or nothing)
    total -= w.hdBytes + (w.sdResident === true ? w.sdBytes : 0);
    total += to === 'sd' ? w.sdBytes : 0;
    plan.set(w.source, to);
    held.push(w.source);
  }
  return held;
}
