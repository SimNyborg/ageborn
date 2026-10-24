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
 * Pure and cheap (O(n log n) a frame): the battle view feeds it every frame and eases the result
 * (`springOffset`). Nothing here reaches the sim; the minimap and power zones keep the sim x.
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
 * The staging of one frame. `prevRows` (the rows of the last frame) makes rows sticky; pass the result's
 * `row` map back in.
 */
export function stage(units: readonly StageUnit[], prevRows: ReadonlyMap<number, number> | null = null, tuning: Partial<ContactTuning> = {}): StageResult {
  const t: ContactTuning = { ...CONTACT_DEFAULTS, ...tuning };
  const byId = new Map<number, StageUnit>();
  for (const u of units) byId.set(u.id, u);
  const contact = new Map<number, number>();
  const comp = new Map<number, number>();
  const engaged = new Set<number>();
  const pairs: StagePair[] = [];

  // the attackers that can be staged: ground, a living ground target of the other side ahead of them, a reach
  const attackers: StageUnit[] = [];
  for (const u of units) {
    if (u.air || u.fort || u.target === null || !u.reach) continue;
    const v = byId.get(u.target);
    if (!v || v.air || v.side === u.side) continue;
    if ((v.x - u.x) * facing(u.side) <= 0) continue;
    attackers.push(u);
  }
  attackers.sort((a, b) => a.id - b.id);
  const isAttacker = new Set(attackers.map((u) => u.id));

  // 1. mutual duels split their correction
  const done = new Set<number>();
  for (const a of attackers) {
    if (done.has(a.id)) continue;
    const b = byId.get(a.target as number) as StageUnit;
    if (b.target !== a.id || !isAttacker.has(b.id) || b.fort) continue;
    done.add(a.id);
    done.add(b.id);
    pairs.push({ a: Math.min(a.id, b.id), b: Math.max(a.id, b.id) });
    const s = (b.x - a.x) * facing(a.side);
    const wa = window(a, b, t.compMutual, t);
    const wb = window(b, a, t.compMutual, t);
    const mirror = mirrored(a, b);
    const body = bodyGap(a, b, t.compMutual, t.compMutual, true, t);
    const lead = mirror ? bodyGap(a, b, t.compMutual, t.compMutual, true, t, t.mirrorLead) : body;
    // inside both windows already (and the bodies clear): no correction
    const fine = s >= wa.lo && s <= wa.hi && s >= wb.lo && s <= wb.hi && s >= Math.max(body, Math.min(lead, Math.min(wa.hi, wb.hi)));
    const need = fine ? 0 : jointSeparation(wa, wb, body, lead) - s;
    // each takes half within its own clamp (a big body's is larger, S6); what one cannot take, the other may
    const maxBack = mirror ? Math.max(t.maxBackLu, t.mirrorMaxBackLu) : t.maxBackLu;
    const [ha, hb] = splitNeed(need, bulkOf(a, t), bulkOf(b, t), maxBack, t.maxForwardLu);
    contact.set(a.id, backOffset(a.side, ha, t, maxBack * bulkOf(a, t), t.maxForwardLu * bulkOf(a, t)));
    contact.set(b.id, backOffset(b.side, hb, t, maxBack * bulkOf(b, t), t.maxForwardLu * bulkOf(b, t)));
    comp.set(a.id, t.compMutual);
    comp.set(b.id, t.compMutual);
    engaged.add(a.id);
    engaged.add(b.id);
  }

  // 2. one-sided attackers move against where their victim is drawn; a victim that fights nobody (it walks,
  //    stands, shoots) takes what the attacker's clamp leaves over. Two passes settle chains and shared victims.
  const single = attackers.filter((a) => !done.has(a.id));
  const victimBack = new Map<number, number>();
  for (let pass = 0; pass < 2; pass++) {
    const wantVictim = new Map<number, number>();
    for (const a of single) {
      const v = byId.get(a.target as number) as StageUnit;
      const vx = v.x + (contact.get(v.id) ?? 0);
      // separation from the attacker's sim x (its own offset is what we solve for)
      const s = (vx - a.x) * facing(a.side);
      const w = window(a, v, t.compSingle, t);
      const body = bodyGap(a, v, t.compSingle, 0, false, t);
      let back = 0;
      if (s < Math.max(w.lo, Math.min(body, w.hi)) || s > w.hi) back = Math.max(w.ideal, Math.min(body, w.hi)) - s;
      // a victim that stepped back from its own duel is followed that much further (a second spear on a busy mammoth)
      const follow = Math.max(0, (contact.get(v.id) ?? 0) * facing(a.side));
      const k = bulkOf(a, t);
      const took = clamp(back, -(t.maxForwardLu * k + follow), t.maxBackLu * k);
      contact.set(a.id, backOffset(a.side, took, t, t.maxBackLu * k, t.maxForwardLu * k + follow));
      comp.set(a.id, t.compSingle);
      engaged.add(a.id);
      engaged.add(v.id);
      const free = !isAttacker.has(v.id) && !v.fort;
      if (free && took < back) {
        // the victim steps back (along the attacker's facing: away from it) by the rest, the largest asked
        const prev = victimBack.get(v.id) ?? 0;
        wantVictim.set(v.id, Math.max(wantVictim.get(v.id) ?? 0, prev + (back - took)));
      }
    }
    for (const [id, back] of wantVictim) {
      const v = byId.get(id) as StageUnit;
      const k = bulkOf(v, t);
      const b = clamp(back, 0, t.maxBackLu * k);
      victimBack.set(id, b);
      contact.set(id, backOffset(v.side, b, t, t.maxBackLu * k, t.maxForwardLu * k));
    }
  }

  // 2b. the approach (S1): a melee unit walking up to the nearest foe ahead takes the stand-off it will need at contact
  //     before it gets there; a pair walking into each other shares its duel row already
  const { approach, approachPairs } = stageApproach(units, engaged, contact, t);

  // 3. rows (from the duels, the approaching duels and engagements), then the same-side spread with those rows
  const row = stageRows(units, approachPairs.length > 0 ? [...pairs, ...approachPairs] : pairs, engaged, contact, prevRows);
  const spread = spreadSides(units, contact, row, engaged, t);

  const offset = new Map<number, number>();
  for (const u of units) {
    if (u.air || u.fort) continue;
    const o = (contact.get(u.id) ?? 0) + (spread.get(u.id) ?? 0);
    const max = t.maxTotalLu * bulkOf(u, t);
    if (o !== 0) offset.set(u.id, clamp(o, -max, max));
  }
  return { offset, contact, row, engaged, comp, pairs, approach };
}

/** Where the sim will park `a` against `v` (lu, centre to centre): its melee range plus both half widths (A2.7). */
function contactSep(a: StageUnit, v: StageUnit): number {
  return (a.rangeLu ?? 0) + (a.sizeLu + v.sizeLu) / 2;
}

/**
 * The approach (S1). Every melee unit not yet engaged that walks toward the nearest foe ahead of it (a ground unit or
 * a fort of the other side, by sim x) eases in the stand-off it will need when the sim parks it at contact: `need x
 * u^p`, `u` running 0..1 over the last `p x need` lu of the closing (`approachPower` = p). A pair walking into each other
 * takes the duel solution (its windows, bodies and clamps, split as a duel); a unit walking up to a foe that fights or
 * faces someone else takes the one-sided solution against where that foe is drawn. Never toward the foe (no pull).
 */
function stageApproach(
  units: readonly StageUnit[],
  engaged: ReadonlySet<number>,
  contact: Map<number, number>,
  t: ContactTuning,
): { approach: Set<number>; approachPairs: StagePair[] } {
  const approach = new Set<number>();
  const approachPairs: StagePair[] = [];
  // each side's ground units and forts by sim x, for the nearest foe ahead (O(n log n))
  const lines: [StageUnit[], StageUnit[]] = [[], []];
  for (const u of units) if (!u.air) lines[u.side].push(u);
  for (const l of lines) l.sort((a, b) => a.x - b.x || a.id - b.id);
  const foeAhead = (u: StageUnit): StageUnit | null => {
    const foes = lines[u.side === 0 ? 1 : 0];
    // first foe with x > u.x (facing +x), or last with x < u.x (facing -x)
    let lo = 0;
    let hi = foes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((foes[mid] as StageUnit).x <= u.x) lo = mid + 1;
      else hi = mid;
    }
    return facing(u.side) === 1 ? (foes[lo] ?? null) : (foes[lo - 1] ?? null);
  };
  const foeOf = new Map<number, StageUnit>();
  for (const u of units) {
    if (u.air || u.fort || !u.reach || u.rangeLu === undefined || u.target !== null || engaged.has(u.id)) continue;
    const foe = foeAhead(u);
    if (foe && (foe.x - u.x) * facing(u.side) > 0) foeOf.set(u.id, foe);
  }
  const p = Math.max(1, t.approachPower);
  /** The eased share of `need` at sim separation `s` for a contact at `c`. */
  const eased = (s: number, c: number, need: number): number => {
    if (!(need > 0)) return 0;
    const span = p * need;
    return need * clamp((c + span - s) / span, 0, 1) ** p;
  };
  const done = new Set<number>();
  for (const u of units) {
    const b = foeOf.get(u.id);
    if (!b || done.has(u.id)) continue;
    const a = u;
    const s = (b.x - a.x) * facing(a.side);
    if (foeOf.get(b.id) === a) {
      // two walking into each other: the duel they will fight, at the separation where the first of them stops
      done.add(a.id);
      done.add(b.id);
      const c = Math.max(contactSep(a, b), contactSep(b, a));
      // the most both clamps can take: a pair further apart than its easing window for that stand-off needs none yet
      // (most walking units on a long lane: skip the windows)
      const cap = t.maxBackLu * (bulkOf(a, t) + bulkOf(b, t));
      if (s >= c + p * cap) continue;
      const wa = window(a, b, t.compMutual, t);
      const wb = window(b, a, t.compMutual, t);
      const body = bodyGap(a, b, t.compMutual, t.compMutual, true, t);
      // inside the contact distance (the sim parks them this tick, often a few lu short of `c`) the duel's own
      // correction at the separation they have, so the duel starts on the stand-off the approach left (no step back)
      const at = Math.min(s, c);
      const fine = at >= wa.lo && at <= wa.hi && at >= wb.lo && at <= wb.hi && at >= body;
      const full = Math.min(cap, fine ? 0 : jointSeparation(wa, wb, body, body) - at);
      const need = s <= c ? Math.max(0, full) : eased(s, c, full);
      if (need <= 0) continue;
      const [ha, hb] = splitNeed(need, bulkOf(a, t), bulkOf(b, t), t.maxBackLu, t.maxForwardLu);
      contact.set(a.id, backOffset(a.side, ha, t, t.maxBackLu * bulkOf(a, t), 0));
      contact.set(b.id, backOffset(b.side, hb, t, t.maxBackLu * bulkOf(b, t), 0));
      approach.add(a.id);
      approach.add(b.id);
      approachPairs.push({ a: Math.min(a.id, b.id), b: Math.max(a.id, b.id) });
      continue;
    }
    // walking up to a foe that fights or faces someone else: the one-sided stand-off against where it is drawn
    done.add(a.id);
    const c = contactSep(a, b);
    if (s >= c + p * t.maxBackLu * bulkOf(a, t)) continue;
    // the separation at contact against where the foe is drawn (inside `c`: the one it has, as the engaged solve sees it)
    const sc = Math.min(s, c) + (contact.get(b.id) ?? 0) * facing(a.side);
    const w = window(a, b, t.compSingle, t);
    const body = bodyGap(a, b, t.compSingle, 0, false, t);
    let backC = 0;
    if (sc < Math.max(w.lo, Math.min(body, w.hi)) || sc > w.hi) backC = Math.max(w.ideal, Math.min(body, w.hi)) - sc;
    const capped = Math.min(backC, t.maxBackLu * bulkOf(a, t));
    const back = s <= c ? Math.max(0, capped) : eased(s, c, capped);
    if (back <= 0) continue;
    contact.set(a.id, backOffset(a.side, back, t, t.maxBackLu * bulkOf(a, t), 0));
    approach.add(a.id);
  }
  return { approach, approachPairs };
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

/**
 * The same-side spread (lu per unit, world x). Per side, in the sim's single-file order (p descending, then
 * id), every pair close enough to matter is pushed apart to its least gap: `spreadShare` of the two bodies'
 * mean width, less the further apart their depth rows are. A unit in contact hardly moves; a free unit ahead
 * steps forward a little and the unit behind makes room. A free unit never passes the unit ahead of it in the
 * sim's order (it would stand between duelists); two units in contact in rows far apart may overlap in x
 * (a pike poking over a club). Capped at `spreadMaxLu` per unit, times the bigger body's bulk (S6).
 */
function spreadSides(units: readonly StageUnit[], contact: ReadonlyMap<number, number>, row: ReadonlyMap<number, number>, engaged: ReadonlySet<number>, t: ContactTuning): Map<number, number> {
  const out = new Map<number, number>();
  for (const side of [0, 1] as const) {
    const f = facing(side);
    const list = units.filter((u) => u.side === side && !u.air && !u.fort);
    const n = list.length;
    if (n < 2) continue;
    list.sort((a, b) => f * (b.x - a.x) || a.id - b.id);
    // per unit, in that order (arrays, not maps: this runs every frame for every unit): its sim position along the
    // facing (larger is nearer the enemy), its drawn position with the contact offset, its body width, its row and
    // whether it is in contact; `sp` is the spread being solved
    const xf = new Float64Array(n);
    const pos = new Float64Array(n);
    const wid = new Float64Array(n);
    const rw = new Float64Array(n);
    const eng = new Uint8Array(n);
    const sp = new Float64Array(n);
    const bk = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const u = list[i] as StageUnit;
      xf[i] = u.x * f;
      pos[i] = (u.x + (contact.get(u.id) ?? 0)) * f;
      const b = bodyOf(u, t);
      // the idle frame includes a held weapon; the body itself is never wider than its collision width allows
      wid[i] = Math.min(b.front + b.back, u.sizeLu * t.bodyShare);
      rw[i] = row.get(u.id) ?? 0;
      eng[i] = engaged.has(u.id) ? 1 : 0;
      bk[i] = bulkOf(u, t);
    }
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
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
          const need = Math.max(floor, t.spreadShare * (((wid[i] as number) + (wid[j] as number)) / 2) * rowK);
          const sa = sp[i] as number;
          const sb = sp[j] as number;
          const gap = (pos[i] as number) + sa - ((pos[j] as number) + sb);
          if (gap >= need - 0.01) continue;
          const d = need - gap;
          // a free unit ahead steps forward a little, the one behind steps back; contact holds its place. The cap grows
          // with the bigger of the two bodies (S6: a Bonker beside a Rhino may step further than beside a Bonker)
          const fa = ei ? 0 : 0.5;
          const fb = ej ? 0.35 : 1;
          const sum = fa + fb;
          const cap = t.spreadMaxLu * big;
          const na = clamp(sa + (d * fa) / sum, -cap, cap);
          const nb = clamp(sb - (d * fb) / sum, -cap, cap);
          if (Math.abs(na - sa) + Math.abs(nb - sb) > 0.01) moved = true;
          sp[i] = na;
          sp[j] = nb;
        }
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
      const s = sp[i] as number;
      if (Math.abs(s) > 0.01) out.set((list[i] as StageUnit).id, s * f);
    }
  }
  return out;
}

/**
 * Depth rows (lu) for every unit (A2.1 Depth, rebuilt for A1). Air units fly at their altitude; the siege
 * crowd at the enemy gate keeps its seven rows; a duel shares a row; the other front units pick the first
 * row of their side's preference that no unit near them uses (their last row first, so rows are sticky);
 * the back ranks spread over five rows by rank.
 */
export function stageRows(
  units: readonly StageUnit[],
  pairs: readonly StagePair[],
  engaged: ReadonlySet<number>,
  contact: ReadonlyMap<number, number>,
  prevRows: ReadonlyMap<number, number> | null,
): Map<number, number> {
  const out = new Map<number, number>();
  // the units placed so far (parallel arrays: this runs every frame for every unit, without allocations per check)
  const px: number[] = [];
  const py: number[] = [];
  const pid: number[] = [];
  const pside: Side[] = [];
  // the placed units by x in buckets as wide as the furthest check (a foe 96 lu off), so a check looks at three
  // buckets instead of every placed unit (the answer is the same: it only skips units too far away to count)
  const buckets = new Map<number, number[]>();
  const bucketOf = (x: number): number => Math.floor(x / ROW_NEAR_FOE_LU);
  const drawnX = (u: StageUnit): number => u.x + (contact.get(u.id) ?? 0);
  /** No placed unit (but `ex1`, `ex2`) near x in a row within `ROW_SAME_LU` of y: own side 46 lu, foes 96 lu. */
  const free = (x: number, y: number, side: Side, ex1: number, ex2 = ex1): boolean => {
    const b = bucketOf(x);
    for (let k = b - 1; k <= b + 1; k++) {
      const list = buckets.get(k);
      if (!list) continue;
      for (const i of list) {
        const id = pid[i] as number;
        if (id === ex1 || id === ex2) continue;
        if (Math.abs((py[i] as number) - y) >= ROW_SAME_LU) continue;
        if (Math.abs((px[i] as number) - x) < (pside[i] === side ? ROW_NEAR_LU : ROW_NEAR_FOE_LU)) return false;
      }
    }
    return true;
  };
  const put = (u: StageUnit, y: number): void => {
    out.set(u.id, y);
    const x = drawnX(u);
    const k = bucketOf(x);
    const list = buckets.get(k);
    if (list) list.push(px.length);
    else buckets.set(k, [px.length]);
    px.push(x);
    py.push(y);
    pid.push(u.id);
    pside.push(u.side);
  };
  const byId = new Map(units.map((u) => [u.id, u]));

  // ranks in each side's single file (p descending, then id), as the sim orders them
  const rank = new Map<number, number>();
  const crowd = new Map<number, number>();
  for (const side of [0, 1] as const) {
    const f = facing(side);
    const ground = units.filter((u) => u.side === side && !u.air && !u.fort).sort((a, b) => f * (b.x - a.x) || a.id - b.id);
    let k = 0;
    ground.forEach((u, r) => {
      rank.set(u.id, r);
      const p = side === 0 ? u.x : LANE_LU - u.x;
      if (r >= 3 && p >= LANE_LU - CROWD_ZONE_LU) crowd.set(u.id, crowdRowOf(k++));
    });
    const air = units.filter((u) => u.side === side && u.air).sort((a, b) => a.id - b.id);
    air.forEach((u, r) => out.set(u.id, AIR_ROW_LU + (r % 2 === 0 ? 0 : -14)));
  }
  for (const [id, y] of crowd) {
    const u = byId.get(id);
    if (u) put(u, y);
  }

  // duels: sticky, else the first duel row free near them
  const duels = [...pairs].sort((p, q) => p.a - q.a);
  for (const d of duels) {
    const a = byId.get(d.a);
    const b = byId.get(d.b);
    if (!a || !b || out.has(a.id) || out.has(b.id)) continue;
    const x = (drawnX(a) + drawnX(b)) / 2;
    const prev = prevRows?.get(a.id) === prevRows?.get(b.id) ? prevRows?.get(a.id) : undefined;
    // a duel row must be free of both sides' units (either side's member checks its own side's distance); its last
    // row first (sticky), then the duel rows in order
    const ok = (r: number): boolean => free(x, r, a.side, a.id, b.id) && free(x, r, b.side, a.id, b.id);
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
    put(a, y);
    put(b, y);
  }

  // the other units near a front, by importance: engaged first, then by rank
  const rest = units
    .filter((u) => !u.air && !u.fort && !out.has(u.id))
    .sort((a, b) => Number(engaged.has(b.id)) - Number(engaged.has(a.id)) || (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0) || a.id - b.id);
  for (const u of rest) {
    const r = rank.get(u.id) ?? 0;
    const x = drawnX(u);
    const prev = prevRows?.get(u.id);
    if (r >= FRONT_RANKS && !engaged.has(u.id)) {
      // a back rank's own row by rank, unless a neighbour holds it (then its last row, then the pattern's next free
      // row from its own on)
      const pattern = BACK_ROWS5[u.side];
      const k = r % pattern.length;
      const own = pattern[k] ?? 0;
      let y = own;
      if (!free(x, own, u.side, u.id)) {
        if (prev !== undefined && prev !== own && pattern.includes(prev) && free(x, prev, u.side, u.id)) y = prev;
        else {
          for (let i = 1; i < pattern.length; i++) {
            const c = pattern[(k + i) % pattern.length] as number;
            if (free(x, c, u.side, u.id)) {
              y = c;
              break;
            }
          }
        }
      }
      put(u, y);
      continue;
    }
    // a front unit: its last row (sticky), else its side's preferred rows in order, else one by rank
    const pref = FRONT_ROWS[u.side];
    let y: number | undefined;
    if (prev !== undefined && pref.includes(prev) && free(x, prev, u.side, u.id)) y = prev;
    else {
      for (const c of pref) {
        if (free(x, c, u.side, u.id)) {
          y = c;
          break;
        }
      }
    }
    put(u, y ?? pref[r % pref.length] ?? 0);
  }
  for (const u of units) if (u.fort && !out.has(u.id)) out.set(u.id, 0);
  return out;
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
