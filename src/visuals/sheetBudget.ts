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
 * Pure and deterministic; presentation only: the sim never sees any of this.
 */
import { UNIT_SHEET_PIXELS } from './unitSheetPixels.gen';

export type SheetDensity = 'hd' | 'sd';

/** Priority ranks of a held sheet (lower is more important). */
export const SHEET_RANK = { field: 0, soon: 1, deck: 2, next: 3 } as const;

/**
 * Decoded unit sheet memory a battle may plan with, HD and 1x copies together (bytes). The rest of a war's
 * decoded images (the baked parts, turret, base and fort sheets, the backdrop scenes) stays under about
 * 150 MB, so a war keeps under 560 MB, a margin under the 600 MB budget (`tests/e2e/memory.spec.ts`).
 */
export const UNIT_SHEET_BUDGET_BYTES = 320_000_000;

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
   * Its 1x copy is loaded now. Raised to HD, that copy stays until the HD copy has loaded (a unit is never
   * left without art), so the raise costs the whole HD copy meanwhile: the plan counts it so.
   */
  sdResident?: boolean;
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

/**
 * The density of every wanted sheet: an HD copy units on the lane draw keeps HD, every other sheet starts at
 * 1x, then HD goes out by priority while the total (HD and 1x copies) stays within `budgetBytes`. A rank whose
 * sheet did not fit still lets its smaller sheets in, but no lower rank gets HD after it. Duplicate sources
 * count once, at their best rank.
 */
export function planSheetDensities(wants: readonly SheetWant[], budgetBytes: number): Map<string, SheetDensity> {
  const best = new Map<string, SheetWant>();
  for (const w of wants) {
    const had = best.get(w.source);
    if (!had || byPriority(w, had) < 0) best.set(w.source, { ...w, hdDrawn: w.hdDrawn === true || had?.hdDrawn === true });
    else if (w.hdDrawn) had.hdDrawn = true;
  }
  const list = [...best.values()].sort(byPriority);
  const plan = new Map<string, SheetDensity>();
  let total = 0;
  for (const w of list) {
    plan.set(w.source, w.hdDrawn ? 'hd' : 'sd');
    total += w.hdDrawn ? w.hdBytes : w.sdBytes;
  }
  let blocked = Infinity;
  for (const w of list) {
    if (w.hdDrawn) continue;
    if (w.rank > blocked) break;
    // a 1x copy in memory stays until the HD copy has loaded (unless that is in memory too)
    const extra = w.sdResident && !w.hdResident ? w.hdBytes : Math.max(0, w.hdBytes - w.sdBytes);
    if (total + extra <= budgetBytes) {
      plan.set(w.source, 'hd');
      total += extra;
    } else blocked = w.rank;
  }
  return plan;
}

/** The planned total (bytes) of a plan over its wants: HD where planned HD, else 1x. */
export function plannedBytes(wants: readonly SheetWant[], plan: ReadonlyMap<string, SheetDensity>): number {
  const seen = new Set<string>();
  let total = 0;
  for (const w of wants) {
    if (seen.has(w.source)) continue;
    seen.add(w.source);
    total += plan.get(w.source) === 'hd' ? w.hdBytes : w.sdBytes;
  }
  return total;
}
