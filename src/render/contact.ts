/**
 * Contact staging (queue item 38, A1): where melee units are drawn so that a blow reads as contact.
 *
 * The sim parks two engaged infantry 37-40 lu apart (centre to centre), while their impact frames reach
 * 60-105 lu from the feet and their bodies lunge 10-25 lu forward, so engaged pairs drew as one blob and
 * swung through, behind or short of each other (DIAGNOSIS P1). From the interpolated sim positions and each
 * unit's reach (read from its sheet), this module computes a view-only offset per unit:
 *
 * - **Stand-off.** An engaged melee attacker is drawn so that its impact-frame weapon tip lands in the front
 *   half of its victim's body (`depth`: 0 is the victim's front surface, 1 its centre line). A mutual pair
 *   splits the correction between both; a one-sided attacker moves alone. A unit is drawn at most
 *   `maxBackLu` back (away from its foe) and `maxForwardLu` forward of its sim x for contact.
 * - **Lunge compensation.** The share of the clip's authored lunge the view takes back during each impact
 *   window (larger in a mutual exchange, where both lunge at once), so the bodies do not meet.
 * - **Same-side spread.** A soft 1D relaxation keeps a side's drawn neighbours at least `spreadShare` of a
 *   body apart (less when they stand in different depth rows), at most `spreadMaxLu` per unit, and never
 *   reorders a side. Units in contact barely move; the others make room behind them.
 * - **Rows.** A mutual duel shares one depth row, duels near each other take different rows, the other
 *   front units interleave between the two sides instead of mirroring, back ranks spread over five rows.
 *   Rows are sticky: a unit keeps its row while that row stays free, so the front does not reshuffle.
 *
 * Deterministic and cheap (O(n log n) a frame): the battle view feeds it every frame and eases the result
 * (`springOffset`). Nothing here reaches the sim; the minimap and power zones keep the sim x. Its working memory
 * (typed arrays by a unit's index in the input, `Scratch`) is kept between frames, so a frame allocates little
 * beyond its result (PERF-A, 2026-10-24: about 2.2x less time than the first version, the same answers); the
 * answer depends only on the arguments, but `stage` is not re-entrant.
 */
import type { Side } from '@/contracts';
import { LANE_LU } from './layout';

/** A melee attack's reach at its impact frame, facing +x, in lu from the feet (U's `reach()`, INTERFACE A1). */
export interface Reach {
  /** The weapon tip (or the frame's front extent) at the impact frame. */
  tipLu: number;
  /** How far the body moves forward at the impact frame against idle. */
  lungeLu: number;
  /** The frame's front and back extents at idle (held weapons included). */
  frontLu: number;
  backLu: number;
  /** U's additions: the tip's height, and the team-colour layer at idle (the torso, the part that must not overlap). */
  tipYLu?: number;
  torsoFrontLu?: number;
  torsoBackLu?: number;
  /** The impact frame's front extent (painted bursts included) and where `tipLu` came from. */
  impactFrontLu?: number;
  tipFrom?: string;
}

export interface StageUnit {
  id: number;
  side: Side;
  /** Interpolated sim x (lu). */
  x: number;
  air: boolean;
  /** Walls, towers and camps: never moved and never spread; they may be a target. */
  fort?: boolean;
  /** Collision width (lu): small 24, medium 32, large 48, huge 80 (A2.7). */
  sizeLu: number;
  /** The unit it attacks in melee right now (attack 0 is melee, the target lives), else null. */
  target: number | null;
  /** The reach of its melee attack (null: not known yet, so no stand-off as an attacker). */
  reach: Reach | null;
  /** Its frame at idle (lu from the feet; held weapons included) and its torso, or null (from `sizeLu`). */
  body: StageBody | null;
  /** The sim tick its current (or last) melee swing lands on: two duelists landing together is a mirror exchange. */
  impactTick?: number;
  /**
   * Its melee attack's range (lu; attack 0, A2.7): with it a melee unit walking up to a foe takes its stand-off on the
   * approach (review A, S1), as the sim will stop it at `rangeLu` plus both half widths from the foe.
   */
  rangeLu?: number;
}

/** A unit's idle extents (lu from the feet): the frame (held weapons included) and the torso when known. */
export interface StageBody {
  front: number;
  back: number;
  torsoFront?: number;
  torsoBack?: number;
  /**
   * The frame in front of the torso is the body's own head, tusks or prow (a beast, a mount, a cart), not a weapon
   * held out in front (a greatsword, a pike): only then does a large body's surface reach toward its frame's front.
   */
  headLead?: boolean;
}

export interface ContactTuning {
  /** Where an attacker's tip lands in the victim's front half: 0 its front surface, 1 its centre line. */
  depth: number;
  /** The tip may land anywhere from `depthMin` to `depthMax` before a correction is made (no jitter). */
  depthMin: number;
  depthMax: number;
  /** Most a unit is drawn back (away from its foe) and forward (toward it) of its sim x for contact (lu). */
  maxBackLu: number;
  maxForwardLu: number;
  /** Lunge compensation share: a mutual exchange (both lunge at once) and a one-sided swing. */
  compMutual: number;
  compSingle: number;
  /** Same-side spread: least gap as a share of the two bodies' mean width; the cap per unit (lu). */
  spreadShare: number;
  spreadMaxLu: number;
  /** Two units this far apart in depth (lu) need no x gap at all; in between it shrinks linearly. */
  spreadRowLu: number;
  /** A body's width from its collision width when the sheet gives none (A11: within 1.4x). */
  bodyShare: number;
  /** The least torso front as a share of the collision width (when the sheet gives none or less). */
  torsoShare: number;
  /** Air between two torsos at the impact frame on top of their lunges (lu). */
  clearLu: number;
  /**
   * A mirror exchange (both swings land on the same tick, the sim's lockstep, DIAGNOSIS P3): both bodies lunge at
   * once and a deep swing carries the head about 1.6x the torso lunge forward, so the pair keeps room for the
   * heads (`mirrorLead` x lunge beyond the torso on each side) and may be drawn up to `mirrorMaxBackLu` back each.
   */
  mirrorLead: number;
  mirrorMaxBackLu: number;
  /** The total offset of a unit never exceeds this (lu). */
  maxTotalLu: number;
  /**
   * Big bodies (review A, S6): every clamp above and the spread cap grow with the collision width over a small unit's
   * (24 lu), up to `bulkMax` times, so two beasts 80 lu long can part; and a blow on a large or huge body may land in
   * its head or prow, `headShare` of the way from its torso front to its frame's front, instead of reaching past it.
   */
  bulkMax: number;
  headShare: number;
  /**
   * The approach (review A, S1): a melee unit walking up to a foe takes its stand-off before contact, as
   * `need x u^approachPower` of the stand-off it will need there, where `u` runs 0..1 over the last
   * `approachPower x need` lu of the closing. The drawn closing then slows smoothly to a stop exactly at contact
   * (its speed falls as 1 - u^(power-1)), so no pair walks into each other and steps back during its wind-up.
   */
  approachPower: number;
}

export const CONTACT_DEFAULTS: ContactTuning = {
  depth: 0.35,
  depthMin: 0.1,
  depthMax: 0.8,
  maxBackLu: 22,
  maxForwardLu: 12,
  compMutual: 0.45,
  compSingle: 0.25,
  spreadShare: 0.55,
  spreadMaxLu: 20,
  spreadRowLu: 50,
  bodyShare: 1.4,
  torsoShare: 0.4,
  clearLu: 4,
  mirrorLead: 0.8,
  mirrorMaxBackLu: 26,
  maxTotalLu: 34,
  bulkMax: 2.5,
  headShare: 0.5,
  approachPower: 3,
};

/** A small unit's collision width (A2.7): the clamps of bigger bodies grow from it (`bulkOf`). */
const SMALL_SIZE_LU = 24;
/** Large (48 lu) and huge (80 lu) bodies: their head or prow counts as body for a blow (`surfaceOf`). */
const LARGE_SIZE_LU = 48;

/** How many times a small unit's clamps a body gets (1 for infantry, 2 for a large beast, at most `bulkMax`). */
function bulkOf(u: StageUnit, t: ContactTuning): number {
  return clamp(u.sizeLu / SMALL_SIZE_LU, 1, Math.max(1, t.bulkMax));
}

/** Duels take these rows (lu, positive toward the viewer), nearest the lane's middle first. */
export const DUEL_ROWS = [0, -16, 16, -28, 26] as const;
/**
 * Every other front unit's row preference, per side, alternating behind and in front with the other side's
 * list mirrored, so the two fronts interleave instead of mirroring: a supporter never stands in one row with
 * a foe's supporter across the contact line (which reads as a duel that is not one).
 */
export const FRONT_ROWS: readonly [readonly number[], readonly number[]] = [
  [-12, 22, -24, 6, 12, -6, -30, 28, 0],
  [12, -22, 24, -6, -12, 6, 28, -30, 0],
];
/** Back ranks (beyond the front) spread over five rows by rank, each side its own interleaved pattern. */
export const BACK_ROWS5: readonly [readonly number[], readonly number[]] = [
  [0, -16, 12, -8, 18],
  [-6, 14, -14, 6, -22],
];
/** Siege crowd at the enemy gate (as `depth.ts`): seven rows, the later ones a little further back. */
export const CROWD_ROWS = [-20, 8, -6, 20, -26, 14, 0] as const;
export const CROWD_ZONE_LU = 90;
/** Air units fly this high (lu, negative = up) and alternate a little (decision WP5 "air altitude"). */
export const AIR_ROW_LU = -118;
/**
 * Units this close in x (lu) compete for rows: a side's own neighbours within 46 lu, the other side's within
 * 96 lu (across the contact line, where a shared row reads as a duel); this close in depth count as one row.
 */
const ROW_NEAR_LU = 46;
const ROW_NEAR_FOE_LU = 96;
const ROW_SAME_LU = 9;
/** A unit this many ranks or more back from its side's front uses the back-rank pattern. */
const FRONT_RANKS = 4;

export interface StagePair {
  a: number;
  b: number;
}

export interface StageResult {
  /** World offset (lu) per unit: drawn x = sim x + offset. Units without an entry are drawn at their sim x. */
  offset: Map<number, number>;
  /** The contact part of the offset alone (lu), for dev pages and tests. */
  contact: Map<number, number>;
  /** Target depth row (lu) per ground and air unit. */
  row: Map<number, number>;
  /** Units in melee contact (attackers with a stand-off, and their victims): drawn in front of idle units. */
  engaged: Set<number>;
  /** Lunge compensation share per engaged attacker (0..1). */
  comp: Map<number, number>;
  /** Mutual duels (lower id first). */
  pairs: StagePair[];
  /** Units walking up to a foe whose stand-off already eases in (S1); not engaged yet. */
  approach: Set<number>;
}

const facing = (side: Side): 1 | -1 => (side === 0 ? 1 : -1);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** The frame's idle extents (lu), from the sheet when known, else from the collision width. */
function bodyOf(u: StageUnit, t: ContactTuning): { front: number; back: number } {
  if (u.body && u.body.front > 0 && u.body.back > 0) return u.body;
  if (u.reach && u.reach.frontLu > 0 && u.reach.backLu > 0) return { front: u.reach.frontLu, back: u.reach.backLu };
  const half = (u.sizeLu * t.bodyShare) / 2;
  return { front: half, back: half };
}

/**
 * Where a unit's body begins in front of its feet (lu): the torso (the team-colour layer at idle) when the
 * sheet gives it, never less than `torsoShare` of the collision width and never past the frame's front (the
 * frame includes a held weapon, which is no target; a horse's barding is, which the torso covers). A large or huge
 * beast's, mount's or cart's head or prow is body too (`StageBody.headLead`; a Tuskback's head and tusks reach 55 lu
 * past its shoulder): its surface lies `headShare` of the way out to the frame's front, so a blow lands there instead
 * of the attacker's head standing inside it (review A, S6). A large biped's frame front is its weapon, so not there.
 */
function surfaceOf(u: StageUnit, t: ContactTuning): number {
  const frame = bodyOf(u, t).front;
  const torso = u.body?.torsoFront ?? u.reach?.torsoFrontLu;
  const least = u.sizeLu * t.torsoShare;
  const v = torso !== undefined && torso > 0 ? torso : u.sizeLu * 0.6;
  const s = clamp(v, least, Math.max(least, frame));
  // a large biped's frame front is the weapon it holds out (a greatsword knight's blade): its surface stays the torso
  return u.sizeLu >= LARGE_SIZE_LU && !u.fort && u.body?.headLead === true ? s + t.headShare * Math.max(0, frame - s) : s;
}

/**
 * The acceptable feet-to-feet separations of `a` hitting `v` (along a's facing): [lo, hi] and the ideal; `in0` where
 * the tip just meets the victim's front surface, `out` where it would leave through its back.
 */
interface Window {
  lo: number;
  hi: number;
  ideal: number;
  in0: number;
  out: number;
}

function window(a: StageUnit, v: StageUnit, comp: number, t: ContactTuning): Window {
  const r = a.reach as Reach;
  const tip = r.tipLu - comp * Math.max(0, r.lungeLu);
  const front = surfaceOf(v, t);
  const back = v.body?.torsoBack ?? v.reach?.torsoBackLu ?? front;
  // the tip lands `depth` of the way from the victim's front surface (separation tip + front) to its centre (tip)
  const at = (k: number): number => tip + (1 - k) * front;
  return { lo: at(t.depthMax), hi: at(t.depthMin), ideal: at(t.depth), in0: at(0), out: tip - Math.max(0, back) };
}

/** How far (lu) inside its victim the shorter weapon of a pair whose windows do not meet still lands. */
const INSIDE_LU = 2;

/**
 * The least separation at which the two bodies do not meet at the impact frame: both torsos, what is left of
 * the lunges (plus `lead` x lunge for heads that lead the torso, in a mirror exchange) and a little air.
 */
function bodyGap(a: StageUnit, v: StageUnit, compA: number, compV: number, mutual: boolean, t: ContactTuning, lead = 0): number {
  const res = (u: StageUnit, c: number): number => (u.reach ? Math.max(0, u.reach.lungeLu) * (1 - c + lead) : 0);
  return surfaceOf(a, t) + surfaceOf(v, t) + res(a, compA) + (mutual ? res(v, compV) : 0) + t.clearLu;
}

/** Two duelists whose swings land within a tick of each other: both lunge at once (DIAGNOSIS P3). */
function mirrored(a: StageUnit, b: StageUnit): boolean {
  return a.impactTick !== undefined && b.impactTick !== undefined && Math.abs(a.impactTick - b.impactTick) <= 1;
}

/**
 * Where to put a pair's separation: inside both windows when they overlap (the ideal of the overlap), else
 * halfway across the gap between them, but no further than keeps the shorter weapon inside its victim and no
 * closer than keeps the longer one from leaving through its victim's back; never closer than the bodies allow,
 * unless that would carry both tips short of the victims (a weapon that cannot reach without the bodies
 * touching: the art's limit). `lead` is the bodies' room with the heads of a mirror exchange (at least `body`):
 * it applies only as far as both weapons still reach.
 */
function jointSeparation(wa: Window, wb: Window, body: number, lead = body): number {
  const lo = Math.max(wa.lo, wb.lo);
  const hi = Math.min(wa.hi, wb.hi);
  let s: number;
  if (lo <= hi) s = clamp((wa.ideal + wb.ideal) / 2, lo, hi);
  else s = Math.max(Math.min((lo + hi) / 2, Math.min(wa.in0, wb.in0) - INSIDE_LU), Math.max(wa.out, wb.out));
  const reachMax = Math.max(wa.hi, wb.hi);
  const reachBoth = Math.min(wa.hi, wb.hi);
  return Math.max(s, Math.min(body, reachMax), Math.min(lead, reachBoth));
}

/** Moves a unit `back` lu away from its foe (negative: toward it), within the contact clamp. */
function backOffset(side: Side, back: number, t: ContactTuning, maxBack = t.maxBackLu, maxForward = t.maxForwardLu): number {
  return -facing(side) * clamp(back, -maxForward, maxBack);
}

/**
 * The staging's working memory (perf, PERF-A 2026-10-24): per unit, by its index in `stage`'s input, typed arrays kept
 * between frames and grown when a frame has more units, so a frame allocates little beyond its result. The result's
 * maps and sets are built at the end in the order the entries were first made. Not re-entrant: nothing in `stage` calls
 * back out.
 */
interface Scratch {
  cap: number;
  /** Contact offset (lu) and whether one was set. */
  cOff: Float64Array;
  cHas: Uint8Array;
  /** Lunge compensation and whether one was set. */
  comp: Float64Array;
  compHas: Uint8Array;
  eng: Uint8Array;
  appr: Uint8Array;
  /** Depth row and whether one was set. */
  row: Float64Array;
  rowHas: Uint8Array;
  /** Same-side spread (lu, world x; 0 for none). */
  spr: Float64Array;
  /** An attacker's target (index), -1 for none; attackers and the duel members done. */
  tgt: Int32Array;
  isAtt: Uint8Array;
  done: Uint8Array;
  /** The approach: the nearest foe ahead (index, -1 for none) and the units it has handled. */
  foe: Int32Array;
  adone: Uint8Array;
  /** A free victim's step back (from the last pass) and the step back asked in this pass. */
  vBack: Float64Array;
  vBackHas: Uint8Array;
  want: Float64Array;
  wantHas: Uint8Array;
  /** First-insertion orders of the result's maps and sets, and of a pass's asked step backs. */
  cOrd: Int32Array;
  compOrd: Int32Array;
  engOrd: Int32Array;
  apprOrd: Int32Array;
  rowOrd: Int32Array;
  wantOrd: Int32Array;
  /** Index lists: attackers (by id), one-sided attackers, each side's line (x ascending) and single file. */
  att: Int32Array;
  single: Int32Array;
  line0: Int32Array;
  line1: Int32Array;
  file0: Int32Array;
  file1: Int32Array;
  /** Rows: the crowd at a gate (unit and row), air units, the rest by importance (unit and rank), placed units. */
  crowdIx: Int32Array;
  crowdY: Float64Array;
  air: Int32Array;
  rest: Int32Array;
  restRank: Int32Array;
  px: Float64Array;
  py: Float64Array;
  pix: Int32Array;
  pside: Uint8Array;
}

function makeScratch(cap: number): Scratch {
  const f = (): Float64Array => new Float64Array(cap);
  const i = (): Int32Array => new Int32Array(cap);
  const u = (): Uint8Array => new Uint8Array(cap);
  return {
    cap,
    cOff: f(), cHas: u(), comp: f(), compHas: u(), eng: u(), appr: u(), row: f(), rowHas: u(), spr: f(),
    tgt: i(), isAtt: u(), done: u(), foe: i(), adone: u(), vBack: f(), vBackHas: u(), want: f(), wantHas: u(),
    cOrd: i(), compOrd: i(), engOrd: i(), apprOrd: i(), rowOrd: i(), wantOrd: i(),
    att: i(), single: i(), line0: i(), line1: i(), file0: i(), file1: i(),
    crowdIx: i(), crowdY: f(), air: i(), rest: i(), restRank: i(), px: f(), py: f(), pix: i(), pside: u(),
  };
}

let scratch = makeScratch(128);
/** Unit id to its index in this frame's input (kept between frames). */
const indexOf = new Map<number, number>();
/** The placed units of the rows by x bucket (kept between frames; the lists are emptied each frame). */
const rowBuckets = new Map<number, number[]>();

/** Sorts `n` unit indices by sim x ascending, ties by id: the order of `(a, b) => a.x - b.x || a.id - b.id`. */
function sortByX(ix: Int32Array, n: number, units: readonly StageUnit[]): void {
  if (n > 96) {
    // a long line: the library sort (an insertion sort is quadratic)
    const tmp = Array.from(ix.subarray(0, n));
    tmp.sort((a, b) => (units[a] as StageUnit).x - (units[b] as StageUnit).x || (units[a] as StageUnit).id - (units[b] as StageUnit).id);
    ix.set(tmp);
    return;
  }
  for (let i = 1; i < n; i++) {
    const k = ix[i] as number;
    const u = units[k] as StageUnit;
    const x = u.x;
    const id = u.id;
    let j = i - 1;
    while (j >= 0) {
      const w = units[ix[j] as number] as StageUnit;
      if (w.x > x || (w.x === x && w.id > id)) {
        ix[j + 1] = ix[j] as number;
        j--;
      } else break;
    }
    ix[j + 1] = k;
  }
}

/** Sorts `n` unit indices by id ascending (attackers, air units: a few). */
function sortById(ix: Int32Array, n: number, units: readonly StageUnit[]): void {
  for (let i = 1; i < n; i++) {
    const k = ix[i] as number;
    const id = (units[k] as StageUnit).id;
    let j = i - 1;
    while (j >= 0 && (units[ix[j] as number] as StageUnit).id > id) {
      ix[j + 1] = ix[j] as number;
      j--;
    }
    ix[j + 1] = k;
  }
}

/**
 * The staging of one frame. `prevRows` (the rows of the last frame) makes rows sticky; pass the result's
 * `row` map back in.
 */
export function stage(units: readonly StageUnit[], prevRows: ReadonlyMap<number, number> | null = null, tuning: Partial<ContactTuning> = {}): StageResult {
  const t: ContactTuning = { ...CONTACT_DEFAULTS, ...tuning };
  const n = units.length;
  if (scratch.cap < n) scratch = makeScratch(Math.max(n, scratch.cap * 2));
  const s = scratch;
  indexOf.clear();
  for (let i = 0; i < n; i++) {
    indexOf.set((units[i] as StageUnit).id, i);
    s.cHas[i] = 0;
    s.compHas[i] = 0;
    s.eng[i] = 0;
    s.appr[i] = 0;
    s.rowHas[i] = 0;
    s.spr[i] = 0;
    s.tgt[i] = -1;
    s.isAtt[i] = 0;
    s.done[i] = 0;
    s.foe[i] = -1;
    s.adone[i] = 0;
    s.vBackHas[i] = 0;
    s.wantHas[i] = 0;
  }
  let nC = 0;
  let nComp = 0;
  let nEng = 0;
  let nAppr = 0;
  const setContact = (i: number, v: number): void => {
    if (s.cHas[i] === 0) {
      s.cHas[i] = 1;
      s.cOrd[nC++] = i;
    }
    s.cOff[i] = v;
  };
  const setComp = (i: number, v: number): void => {
    if (s.compHas[i] === 0) {
      s.compHas[i] = 1;
      s.compOrd[nComp++] = i;
    }
    s.comp[i] = v;
  };
  const engage = (i: number): void => {
    if (s.eng[i] === 0) {
      s.eng[i] = 1;
      s.engOrd[nEng++] = i;
    }
  };
  const contactOf = (i: number): number => (s.cHas[i] === 1 ? (s.cOff[i] as number) : 0);
  const pairs: StagePair[] = [];

  // the attackers that can be staged: ground, a living ground target of the other side ahead of them, a reach
  let nAtt = 0;
  for (let i = 0; i < n; i++) {
    const u = units[i] as StageUnit;
    if (u.air || u.fort || u.target === null || !u.reach) continue;
    const vi = indexOf.get(u.target);
    if (vi === undefined) continue;
    const v = units[vi] as StageUnit;
    if (v.air || v.side === u.side) continue;
    if ((v.x - u.x) * facing(u.side) <= 0) continue;
    s.tgt[i] = vi;
    s.att[nAtt++] = i;
  }
  sortById(s.att, nAtt, units);
  for (let k = 0; k < nAtt; k++) s.isAtt[s.att[k] as number] = 1;

  // 1. mutual duels split their correction
  for (let k = 0; k < nAtt; k++) {
    const ai = s.att[k] as number;
    if (s.done[ai] === 1) continue;
    const bi = s.tgt[ai] as number;
    const a = units[ai] as StageUnit;
    const b = units[bi] as StageUnit;
    if (b.target !== a.id || s.isAtt[bi] === 0 || b.fort) continue;
    s.done[ai] = 1;
    s.done[bi] = 1;
    pairs.push({ a: Math.min(a.id, b.id), b: Math.max(a.id, b.id) });
    const sep = (b.x - a.x) * facing(a.side);
    const wa = window(a, b, t.compMutual, t);
    const wb = window(b, a, t.compMutual, t);
    const mirror = mirrored(a, b);
    const body = bodyGap(a, b, t.compMutual, t.compMutual, true, t);
    const lead = mirror ? bodyGap(a, b, t.compMutual, t.compMutual, true, t, t.mirrorLead) : body;
    // inside both windows already (and the bodies clear): no correction
    const fine = sep >= wa.lo && sep <= wa.hi && sep >= wb.lo && sep <= wb.hi && sep >= Math.max(body, Math.min(lead, Math.min(wa.hi, wb.hi)));
    const need = fine ? 0 : jointSeparation(wa, wb, body, lead) - sep;
    // each takes half within its own clamp (a big body's is larger, S6); what one cannot take, the other may
    const maxBack = mirror ? Math.max(t.maxBackLu, t.mirrorMaxBackLu) : t.maxBackLu;
    const [ha, hb] = splitNeed(need, bulkOf(a, t), bulkOf(b, t), maxBack, t.maxForwardLu);
    setContact(ai, backOffset(a.side, ha, t, maxBack * bulkOf(a, t), t.maxForwardLu * bulkOf(a, t)));
    setContact(bi, backOffset(b.side, hb, t, maxBack * bulkOf(b, t), t.maxForwardLu * bulkOf(b, t)));
    setComp(ai, t.compMutual);
    setComp(bi, t.compMutual);
    engage(ai);
    engage(bi);
  }

  // 2. one-sided attackers move against where their victim is drawn; a victim that fights nobody (it walks,
  //    stands, shoots) takes what the attacker's clamp leaves over. Two passes settle chains and shared victims.
  let nSingle = 0;
  for (let k = 0; k < nAtt; k++) {
    const ai = s.att[k] as number;
    if (s.done[ai] === 0) s.single[nSingle++] = ai;
  }
  for (let pass = 0; pass < 2; pass++) {
    let nWant = 0;
    for (let q = 0; q < nSingle; q++) {
      const ai = s.single[q] as number;
      const vi = s.tgt[ai] as number;
      const a = units[ai] as StageUnit;
      const v = units[vi] as StageUnit;
      const vc = contactOf(vi);
      const vx = v.x + vc;
      // separation from the attacker's sim x (its own offset is what we solve for)
      const sep = (vx - a.x) * facing(a.side);
      const w = window(a, v, t.compSingle, t);
      const body = bodyGap(a, v, t.compSingle, 0, false, t);
      let back = 0;
      if (sep < Math.max(w.lo, Math.min(body, w.hi)) || sep > w.hi) back = Math.max(w.ideal, Math.min(body, w.hi)) - sep;
      // a victim that stepped back from its own duel is followed that much further (a second spear on a busy mammoth)
      const follow = Math.max(0, vc * facing(a.side));
      const k = bulkOf(a, t);
      const took = clamp(back, -(t.maxForwardLu * k + follow), t.maxBackLu * k);
      setContact(ai, backOffset(a.side, took, t, t.maxBackLu * k, t.maxForwardLu * k + follow));
      setComp(ai, t.compSingle);
      engage(ai);
      engage(vi);
      const free = s.isAtt[vi] === 0 && !v.fort;
      if (free && took < back) {
        // the victim steps back (along the attacker's facing: away from it) by the rest, the largest asked
        const prev = s.vBackHas[vi] === 1 ? (s.vBack[vi] as number) : 0;
        const asked = s.wantHas[vi] === 1 ? (s.want[vi] as number) : 0;
        if (s.wantHas[vi] === 0) {
          s.wantHas[vi] = 1;
          s.wantOrd[nWant++] = vi;
        }
        s.want[vi] = Math.max(asked, prev + (back - took));
      }
    }
    for (let q = 0; q < nWant; q++) {
      const vi = s.wantOrd[q] as number;
      const v = units[vi] as StageUnit;
      s.wantHas[vi] = 0;
      const k = bulkOf(v, t);
      const b = clamp(s.want[vi] as number, 0, t.maxBackLu * k);
      s.vBack[vi] = b;
      s.vBackHas[vi] = 1;
      setContact(vi, backOffset(v.side, b, t, t.maxBackLu * k, t.maxForwardLu * k));
    }
  }

  // each side's ground units and forts by sim x (the approach's lines), and from them each side's ground units in the
  // sim's single file, p descending then id (the rows' ranks and the spread's order): one sort per side a frame
  let n0 = 0;
  let n1 = 0;
  for (let i = 0; i < n; i++) {
    const u = units[i] as StageUnit;
    if (u.air) continue;
    if (u.side === 0) s.line0[n0++] = i;
    else s.line1[n1++] = i;
  }
  sortByX(s.line0, n0, units);
  sortByX(s.line1, n1, units);
  // side 1 faces -x: its line is already its file; side 0's file is its line reversed, keeping units at one x in id order
  let nf1 = 0;
  for (let k = 0; k < n1; k++) {
    const i = s.line1[k] as number;
    if (!(units[i] as StageUnit).fort) s.file1[nf1++] = i;
  }
  let nf0 = 0;
  let hiK = n0 - 1;
  while (hiK >= 0) {
    const x = (units[s.line0[hiK] as number] as StageUnit).x;
    let loK = hiK;
    while (loK > 0 && (units[s.line0[loK - 1] as number] as StageUnit).x === x) loK--;
    for (let k = loK; k <= hiK; k++) {
      const i = s.line0[k] as number;
      if (!(units[i] as StageUnit).fort) s.file0[nf0++] = i;
    }
    hiK = loK - 1;
  }

  // 2b. the approach (S1): a melee unit walking up to the nearest foe ahead takes the stand-off it will need at contact
  //     before it gets there; a pair walking into each other shares its duel row already
  const approachPairs: StagePair[] = [];
  for (let i = 0; i < n; i++) {
    const u = units[i] as StageUnit;
    if (u.air || u.fort || !u.reach || u.rangeLu === undefined || u.target !== null || s.eng[i] === 1) continue;
    // first foe with x > u.x (facing +x), or last with x < u.x (facing -x)
    const foes = u.side === 0 ? s.line1 : s.line0;
    const nf = u.side === 0 ? n1 : n0;
    let lo = 0;
    let hi = nf;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((units[foes[mid] as number] as StageUnit).x <= u.x) lo = mid + 1;
      else hi = mid;
    }
    const fi = facing(u.side) === 1 ? (lo < nf ? (foes[lo] as number) : -1) : lo > 0 ? (foes[lo - 1] as number) : -1;
    if (fi >= 0 && ((units[fi] as StageUnit).x - u.x) * facing(u.side) > 0) s.foe[i] = fi;
  }
  const p = Math.max(1, t.approachPower);
  /** The eased share of `need` at sim separation `sep` for a contact at `c`. */
  const eased = (sep: number, c: number, need: number): number => {
    if (!(need > 0)) return 0;
    const span = p * need;
    return need * clamp((c + span - sep) / span, 0, 1) ** p;
  };
  const approach = (i: number): void => {
    if (s.appr[i] === 0) {
      s.appr[i] = 1;
      s.apprOrd[nAppr++] = i;
    }
  };
  for (let i = 0; i < n; i++) {
    const bi = s.foe[i] as number;
    if (bi < 0 || s.adone[i] === 1) continue;
    const a = units[i] as StageUnit;
    const b = units[bi] as StageUnit;
    const sep = (b.x - a.x) * facing(a.side);
    if (s.foe[bi] === i) {
      // two walking into each other: the duel they will fight, at the separation where the first of them stops
      s.adone[i] = 1;
      s.adone[bi] = 1;
      const c = Math.max(contactSep(a, b), contactSep(b, a));
      // the most both clamps can take: a pair further apart than its easing window for that stand-off needs none yet
      // (most walking units on a long lane: skip the windows)
      const cap = t.maxBackLu * (bulkOf(a, t) + bulkOf(b, t));
      if (sep >= c + p * cap) continue;
      const wa = window(a, b, t.compMutual, t);
      const wb = window(b, a, t.compMutual, t);
      const body = bodyGap(a, b, t.compMutual, t.compMutual, true, t);
      // inside the contact distance (the sim parks them this tick, often a few lu short of `c`) the duel's own
      // correction at the separation they have, so the duel starts on the stand-off the approach left (no step back)
      const at = Math.min(sep, c);
      const fine = at >= wa.lo && at <= wa.hi && at >= wb.lo && at <= wb.hi && at >= body;
      const full = Math.min(cap, fine ? 0 : jointSeparation(wa, wb, body, body) - at);
      const need = sep <= c ? Math.max(0, full) : eased(sep, c, full);
      if (need <= 0) continue;
      const [ha, hb] = splitNeed(need, bulkOf(a, t), bulkOf(b, t), t.maxBackLu, t.maxForwardLu);
      setContact(i, backOffset(a.side, ha, t, t.maxBackLu * bulkOf(a, t), 0));
      setContact(bi, backOffset(b.side, hb, t, t.maxBackLu * bulkOf(b, t), 0));
      approach(i);
      approach(bi);
      approachPairs.push({ a: Math.min(a.id, b.id), b: Math.max(a.id, b.id) });
      continue;
    }
    // walking up to a foe that fights or faces someone else: the one-sided stand-off against where it is drawn
    s.adone[i] = 1;
    const c = contactSep(a, b);
    if (sep >= c + p * t.maxBackLu * bulkOf(a, t)) continue;
    // the separation at contact against where the foe is drawn (inside `c`: the one it has, as the engaged solve sees it)
    const sc = Math.min(sep, c) + contactOf(bi) * facing(a.side);
    const w = window(a, b, t.compSingle, t);
    const body = bodyGap(a, b, t.compSingle, 0, false, t);
    let backC = 0;
    if (sc < Math.max(w.lo, Math.min(body, w.hi)) || sc > w.hi) backC = Math.max(w.ideal, Math.min(body, w.hi)) - sc;
    const capped = Math.min(backC, t.maxBackLu * bulkOf(a, t));
    const back = sep <= c ? Math.max(0, capped) : eased(sep, c, capped);
    if (back <= 0) continue;
    setContact(i, backOffset(a.side, back, t, t.maxBackLu * bulkOf(a, t), 0));
    approach(i);
  }

  // 3. rows (from the duels, the approaching duels and engagements), then the same-side spread with those rows
  const nRow = stageRows(units, approachPairs.length > 0 ? [...pairs, ...approachPairs] : pairs, prevRows, s, n, nf0, nf1);
  spreadSides(units, s, t, s.file0, nf0, 0);
  spreadSides(units, s, t, s.file1, nf1, 1);

  const offset = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const u = units[i] as StageUnit;
    if (u.air || u.fort) continue;
    const o = contactOf(i) + (s.spr[i] as number);
    const max = t.maxTotalLu * bulkOf(u, t);
    if (o !== 0) offset.set(u.id, clamp(o, -max, max));
  }
  const contact = new Map<number, number>();
  for (let q = 0; q < nC; q++) {
    const i = s.cOrd[q] as number;
    contact.set((units[i] as StageUnit).id, s.cOff[i] as number);
  }
  const comp = new Map<number, number>();
  for (let q = 0; q < nComp; q++) {
    const i = s.compOrd[q] as number;
    comp.set((units[i] as StageUnit).id, s.comp[i] as number);
  }
  const engaged = new Set<number>();
  for (let q = 0; q < nEng; q++) engaged.add((units[s.engOrd[q] as number] as StageUnit).id);
  const approachSet = new Set<number>();
  for (let q = 0; q < nAppr; q++) approachSet.add((units[s.apprOrd[q] as number] as StageUnit).id);
  const row = new Map<number, number>();
  for (let q = 0; q < nRow; q++) {
    const i = s.rowOrd[q] as number;
    row.set((units[i] as StageUnit).id, s.row[i] as number);
  }
  return { offset, contact, row, engaged, comp, pairs, approach: approachSet };
}

/** Where the sim will park `a` against `v` (lu, centre to centre): its melee range plus both half widths (A2.7). */
function contactSep(a: StageUnit, v: StageUnit): number {
  return (a.rangeLu ?? 0) + (a.sizeLu + v.sizeLu) / 2;
}

/**
 * A duel's correction `need` (lu, positive apart) split between its two members: half each, each within its own clamp
 * (`maxBack` / `maxForward` times its bulk, S6); what one member's clamp leaves over, the other takes within its own.
 */
function splitNeed(need: number, bulkA: number, bulkB: number, maxBack: number, maxForward: number): [number, number] {
  const lim = (k: number): number => (need >= 0 ? maxBack : maxForward) * k;
  const la = lim(bulkA);
  const lb = lim(bulkB);
  const half = Math.abs(need) / 2;
  let a = Math.min(half, la);
  let b = Math.min(half, lb);
  a = Math.min(la, a + (half - b));
  b = Math.min(lb, b + (half - Math.min(half, la)));
  const sgn = need >= 0 ? 1 : -1;
  return [a * sgn, b * sgn];
}

/** Pairs further apart than this in sim x (lu) never need spreading (bigger than any least gap). */
const SPREAD_WINDOW_LU = 70;

/** The spread's per-unit arrays, kept between frames and grown when a side has more units (no allocation a frame). */
let spreadArrays = { xf: new Float64Array(64), pos: new Float64Array(64), wid: new Float64Array(64), rw: new Float64Array(64), eng: new Uint8Array(64), sp: new Float64Array(64), bk: new Float64Array(64) };
function spreadScratch(n: number): typeof spreadArrays {
  if (spreadArrays.xf.length < n) {
    const m = Math.max(n, spreadArrays.xf.length * 2);
    spreadArrays = { xf: new Float64Array(m), pos: new Float64Array(m), wid: new Float64Array(m), rw: new Float64Array(m), eng: new Uint8Array(m), sp: new Float64Array(m), bk: new Float64Array(m) };
  }
  return spreadArrays;
}

/** The spread's pair list (unit indices and what each pair needs), kept between frames, grown to hold `n` pairs. */
let pairArrays = { pi: new Int32Array(256), pj: new Int32Array(256), need: new Float64Array(256), fa: new Float64Array(256), fb: new Float64Array(256), cap: new Float64Array(256) };
function spreadPairs(n: number): typeof pairArrays {
  if (pairArrays.pi.length < n) {
    const m = Math.max(n, pairArrays.pi.length * 2);
    const old = pairArrays;
    pairArrays = { pi: new Int32Array(m), pj: new Int32Array(m), need: new Float64Array(m), fa: new Float64Array(m), fb: new Float64Array(m), cap: new Float64Array(m) };
    // keep what was already written this frame
    pairArrays.pi.set(old.pi);
    pairArrays.pj.set(old.pj);
    pairArrays.need.set(old.need);
    pairArrays.fa.set(old.fa);
    pairArrays.fb.set(old.fb);
    pairArrays.cap.set(old.cap);
  }
  return pairArrays;
}

/**
 * The same-side spread of one side (lu per unit, world x, into `s.spr`). In the sim's single-file order (p descending,
 * then id: `file`, `n` units), every pair close enough to matter is pushed apart to its least gap: `spreadShare` of the
 * two bodies' mean width, less the further apart their depth rows are. A unit in contact hardly moves; a free unit ahead
 * steps forward a little and the unit behind makes room. A free unit never passes the unit ahead of it in the sim's
 * order (it would stand between duelists); two units in contact in rows far apart may overlap in x (a pike poking over a
 * club). Capped at `spreadMaxLu` per unit, times the bigger body's bulk (S6).
 */
function spreadSides(units: readonly StageUnit[], s: Scratch, t: ContactTuning, file: Int32Array, n: number, side: Side): void {
  const f = facing(side);
  if (n < 2) return;
  // per unit, in that order (arrays, not maps: this runs every frame for every unit): its sim position along the
  // facing (larger is nearer the enemy), its drawn position with the contact offset, its body width, its row and
  // whether it is in contact; `sp` is the spread being solved (scratch arrays kept between frames, `sp` zeroed)
  const { xf, pos, wid, rw, eng, sp, bk } = spreadScratch(n);
  for (let i = 0; i < n; i++) {
    const ui = file[i] as number;
    const u = units[ui] as StageUnit;
    xf[i] = u.x * f;
    pos[i] = (u.x + (s.cHas[ui] === 1 ? (s.cOff[ui] as number) : 0)) * f;
    const b = bodyOf(u, t);
    // the idle frame includes a held weapon; the body itself is never wider than its collision width allows
    wid[i] = Math.min(b.front + b.back, u.sizeLu * t.bodyShare);
    rw[i] = s.rowHas[ui] === 1 ? (s.row[ui] as number) : 0;
    eng[i] = s.eng[ui] as number;
    bk[i] = bulkOf(u, t);
    sp[i] = 0;
  }
  // the pairs close enough to matter, in order (i, then j), with what each needs: none of it changes over the passes
  // below, so it is worked out once (the same arithmetic as per pass before, so the same numbers)
  let m = 0;
  let pr = spreadPairs(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if ((xf[i] as number) - (xf[j] as number) > SPREAD_WINDOW_LU) break;
      const dy = Math.abs((rw[i] as number) - (rw[j] as number));
      // a row apart parts a small pair, never two beasts 130 lu long (S6): the depth that needs no gap grows with bulk
      const big = Math.max(bk[i] as number, bk[j] as number);
      const rowK = Math.max(0, 1 - dy / (t.spreadRowLu * big));
      const ei = eng[i] === 1;
      const ej = eng[j] === 1;
      // a free unit stays behind the one ahead of it; engaged units in rows far apart may cross
      const floor = ei && ej && rowK < 0.5 ? -Infinity : 0;
      if (m === pr.pi.length) pr = spreadPairs(m + 1);
      pr.pi[m] = i;
      pr.pj[m] = j;
      pr.need[m] = Math.max(floor, t.spreadShare * (((wid[i] as number) + (wid[j] as number)) / 2) * rowK);
      // a free unit ahead steps forward a little, the one behind steps back; contact holds its place. The cap grows
      // with the bigger of the two bodies (S6: a Bonker beside a Rhino may step further than beside a Bonker)
      pr.fa[m] = ei ? 0 : 0.5;
      pr.fb[m] = ej ? 0.35 : 1;
      pr.cap[m] = t.spreadMaxLu * big;
      m++;
    }
  }
  const { pi, pj, need: pneed, fa: pfa, fb: pfb, cap: pcap } = pr;
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (let q = 0; q < m; q++) {
      const i = pi[q] as number;
      const j = pj[q] as number;
      const need = pneed[q] as number;
      const sa = sp[i] as number;
      const sb = sp[j] as number;
      const gap = (pos[i] as number) + sa - ((pos[j] as number) + sb);
      if (gap >= need - 0.01) continue;
      const d = need - gap;
      const fa = pfa[q] as number;
      const fb = pfb[q] as number;
      const sum = fa + fb;
      const cap = pcap[q] as number;
      const na = clamp(sa + (d * fa) / sum, -cap, cap);
      const nb = clamp(sb - (d * fb) / sum, -cap, cap);
      if (Math.abs(na - sa) + Math.abs(nb - sb) > 0.01) moved = true;
      sp[i] = na;
      sp[j] = nb;
    }
    if (!moved) break;
  }
  // the order rule holds even where the cap stopped the spread: a free unit behind never draws ahead
  for (let i = 1; i < n; i++) {
    if (eng[i] === 1) continue;
    let ahead = Infinity;
    for (let k = i - 1; k >= 0; k--) {
      if ((xf[k] as number) - (xf[i] as number) > SPREAD_WINDOW_LU) break;
      ahead = Math.min(ahead, (pos[k] as number) + (sp[k] as number));
    }
    const over = (pos[i] as number) + (sp[i] as number) - ahead;
    if (over > 0) sp[i] = (sp[i] as number) - over;
  }
  for (let i = 0; i < n; i++) {
    const v = sp[i] as number;
    if (Math.abs(v) > 0.01) s.spr[file[i] as number] = v * f;
  }
}

/**
 * Depth rows (lu) for every unit (A2.1 Depth, rebuilt for A1), into `s.row` (first-set order in `s.rowOrd`; returns
 * how many). Air units fly at their altitude; the siege crowd at the enemy gate keeps its seven rows; a duel shares a
 * row; the other front units pick the first row of their side's preference that no unit near them uses (their last row
 * first, so rows are sticky); the back ranks spread over five rows by rank. `pairs` are by unit id.
 */
function stageRows(
  units: readonly StageUnit[],
  pairs: readonly StagePair[],
  prevRows: ReadonlyMap<number, number> | null,
  s: Scratch,
  n: number,
  nf0: number,
  nf1: number,
): number {
  let nRow = 0;
  let nPlaced = 0;
  const setRow = (i: number, y: number): void => {
    if (s.rowHas[i] === 0) {
      s.rowHas[i] = 1;
      s.rowOrd[nRow++] = i;
    }
    s.row[i] = y;
  };
  // the placed units by x in buckets as wide as the furthest check (a foe 96 lu off), so a check looks at three
  // buckets instead of every placed unit (the answer is the same: it only skips units too far away to count)
  for (const list of rowBuckets.values()) list.length = 0;
  const drawnX = (i: number): number => (units[i] as StageUnit).x + (s.cHas[i] === 1 ? (s.cOff[i] as number) : 0);
  /** No placed unit (but units `ex1`, `ex2`) near x in a row within `ROW_SAME_LU` of y: own side 46 lu, foes 96 lu. */
  const free = (x: number, y: number, side: Side, ex1: number, ex2 = ex1): boolean => {
    const b = Math.floor(x / ROW_NEAR_FOE_LU);
    for (let k = b - 1; k <= b + 1; k++) {
      const list = rowBuckets.get(k);
      if (!list) continue;
      for (let q = 0; q < list.length; q++) {
        const pl = list[q] as number;
        const ui = s.pix[pl] as number;
        if (ui === ex1 || ui === ex2) continue;
        if (Math.abs((s.py[pl] as number) - y) >= ROW_SAME_LU) continue;
        if (Math.abs((s.px[pl] as number) - x) < (s.pside[pl] === side ? ROW_NEAR_LU : ROW_NEAR_FOE_LU)) return false;
      }
    }
    return true;
  };
  const put = (i: number, y: number): void => {
    setRow(i, y);
    const x = drawnX(i);
    const k = Math.floor(x / ROW_NEAR_FOE_LU);
    let list = rowBuckets.get(k);
    if (!list) {
      list = [];
      rowBuckets.set(k, list);
    }
    list.push(nPlaced);
    s.px[nPlaced] = x;
    s.py[nPlaced] = y;
    s.pix[nPlaced] = i;
    s.pside[nPlaced] = (units[i] as StageUnit).side;
    nPlaced++;
  };

  // ranks in each side's single file (p descending, then id), as the sim orders them: a unit's index in its file
  let nCrowd = 0;
  for (const side of [0, 1] as const) {
    const file = side === 0 ? s.file0 : s.file1;
    const nf = side === 0 ? nf0 : nf1;
    let k = 0;
    for (let r = 0; r < nf; r++) {
      const i = file[r] as number;
      const u = units[i] as StageUnit;
      const p = side === 0 ? u.x : LANE_LU - u.x;
      if (r >= 3 && p >= LANE_LU - CROWD_ZONE_LU) {
        s.crowdIx[nCrowd] = i;
        s.crowdY[nCrowd] = crowdRowOf(k++);
        nCrowd++;
      }
    }
    let nAir = 0;
    for (let i = 0; i < n; i++) {
      const u = units[i] as StageUnit;
      if (u.side === side && u.air) s.air[nAir++] = i;
    }
    sortById(s.air, nAir, units);
    for (let r = 0; r < nAir; r++) setRow(s.air[r] as number, AIR_ROW_LU + (r % 2 === 0 ? 0 : -14));
  }
  for (let q = 0; q < nCrowd; q++) put(s.crowdIx[q] as number, s.crowdY[q] as number);

  // duels: sticky, else the first duel row free near them
  const duels = [...pairs].sort((pa, pb) => pa.a - pb.a);
  for (const d of duels) {
    const ai = indexOf.get(d.a);
    const bi = indexOf.get(d.b);
    if (ai === undefined || bi === undefined || s.rowHas[ai] === 1 || s.rowHas[bi] === 1) continue;
    const a = units[ai] as StageUnit;
    const b = units[bi] as StageUnit;
    const x = (drawnX(ai) + drawnX(bi)) / 2;
    const prevA = prevRows?.get(a.id);
    const prev = prevA === prevRows?.get(b.id) ? prevA : undefined;
    // a duel row must be free of both sides' units (either side's member checks its own side's distance); its last
    // row first (sticky), then the duel rows in order
    const ok = (r: number): boolean => free(x, r, a.side, ai, bi) && free(x, r, b.side, ai, bi);
    let y = 0;
    if (prev !== undefined && (DUEL_ROWS as readonly number[]).includes(prev) && ok(prev)) y = prev;
    else {
      for (const r of DUEL_ROWS) {
        if (ok(r)) {
          y = r;
          break;
        }
      }
    }
    put(ai, y);
    put(bi, y);
  }

  // the other units near a front, by importance: engaged first, then by rank, then by id. Taken from the files without
  // a sort: a rank holds at most one unit of each side
  let nRest = 0;
  const ranks = Math.max(nf0, nf1);
  for (let pass = 0; pass < 2; pass++) {
    const wantEngaged = pass === 0 ? 1 : 0;
    for (let r = 0; r < ranks; r++) {
      let a = r < nf0 ? (s.file0[r] as number) : -1;
      let b = r < nf1 ? (s.file1[r] as number) : -1;
      if (a >= 0 && b >= 0 && (units[b] as StageUnit).id < (units[a] as StageUnit).id) {
        const tmp = a;
        a = b;
        b = tmp;
      }
      if (a >= 0 && s.rowHas[a] === 0 && s.eng[a] === wantEngaged) {
        s.rest[nRest] = a;
        s.restRank[nRest] = r;
        nRest++;
      }
      if (b >= 0 && s.rowHas[b] === 0 && s.eng[b] === wantEngaged) {
        s.rest[nRest] = b;
        s.restRank[nRest] = r;
        nRest++;
      }
    }
  }
  for (let q = 0; q < nRest; q++) {
    const i = s.rest[q] as number;
    const r = s.restRank[q] as number;
    const u = units[i] as StageUnit;
    const x = drawnX(i);
    const prev = prevRows?.get(u.id);
    if (r >= FRONT_RANKS && s.eng[i] === 0) {
      // a back rank's own row by rank, unless a neighbour holds it (then its last row, then the pattern's next free
      // row from its own on)
      const pattern = BACK_ROWS5[u.side];
      const k = r % pattern.length;
      const own = pattern[k] ?? 0;
      let y = own;
      if (!free(x, own, u.side, i)) {
        if (prev !== undefined && prev !== own && pattern.includes(prev) && free(x, prev, u.side, i)) y = prev;
        else {
          for (let pi = 1; pi < pattern.length; pi++) {
            const c = pattern[(k + pi) % pattern.length] as number;
            if (free(x, c, u.side, i)) {
              y = c;
              break;
            }
          }
        }
      }
      put(i, y);
      continue;
    }
    // a front unit: its last row (sticky), else its side's preferred rows in order, else one by rank
    const pref = FRONT_ROWS[u.side];
    let y: number | undefined;
    if (prev !== undefined && pref.includes(prev) && free(x, prev, u.side, i)) y = prev;
    else {
      for (const c of pref) {
        if (free(x, c, u.side, i)) {
          y = c;
          break;
        }
      }
    }
    put(i, y ?? pref[r % pref.length] ?? 0);
  }
  for (let i = 0; i < n; i++) if ((units[i] as StageUnit).fort && s.rowHas[i] === 0) setRow(i, 0);
  return nRow;
}

/** The k-th crowd row at the enemy gate (as `depth.ts`). */
function crowdRowOf(k: number): number {
  const n = CROWD_ROWS.length;
  return Math.max(-34, (CROWD_ROWS[k % n] ?? 0) - 4 * Math.floor(k / n));
}

/** One easing state per unit: the drawn offset and its velocity (lu, lu/s). */
export interface OffsetState {
  x: number;
  v: number;
}

/**
 * Eases a drawn offset toward its target with a critically damped spring of half-life `halfLifeMs`, at most
 * `maxSpeed` lu/s, frame-rate independent (stable for any dt). Mutates and returns `s`.
 */
export function springOffset(s: OffsetState, target: number, halfLifeMs: number, dtMs: number, maxSpeed = Infinity): OffsetState {
  if (dtMs <= 0) return s;
  const dt = dtMs / 1000;
  const omega = 1.6783469900166612 / Math.max(0.001, halfLifeMs / 1000);
  const d = s.x - target;
  const e = Math.exp(-omega * dt);
  const k = s.v + omega * d;
  let nx = target + (d + k * dt) * e;
  let nv = (s.v - omega * k * dt) * e;
  const step = nx - s.x;
  const cap = maxSpeed * dt;
  if (Math.abs(step) > cap) {
    nx = s.x + Math.sign(step) * cap;
    nv = Math.sign(nv) * Math.min(Math.abs(nv), maxSpeed);
  }
  if (Math.abs(nx - target) < 0.02 && Math.abs(nv) < 0.5) {
    nx = target;
    nv = 0;
  }
  s.x = nx;
  s.v = nv;
  return s;
}
