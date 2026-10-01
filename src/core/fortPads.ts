/**
 * Fort pads, placement legality, safe pads, tower reach and the deny order (DESIGN A16.14.1-A16.14.2),
 * shared by the sim, the AI, the HUD and the tools so every layer agrees on where a fort may go. Pure
 * integer helpers, like `powerReach.ts` for powers.
 *
 * Positions are own-frame p (measured from the placing side's gate) in one consistent unit per call:
 * the sim and the AI use milli-lu, the HUD may use lu. {@link fortPadRules} builds the rules in that unit.
 */
import type { EconomyRules, FortEconomyRules } from '@/contracts';
import { BP, MILLI, TICKS_PER_SECOND, msToTicks } from './fixed';
import { frontP, type FrontCandidate } from './powerReach';

/**
 * Whether battles send each side's Fort card (A16.14.6, F1 compatibility). F1 keeps it off: `meta` sends
 * `fort: null` for both sides until the HUD's Fort button ships in F2, which turns it on and lets the
 * match rule follow the `fort.slot` flag (and the Daily always plays it).
 */
export const FORT_SLOT_IN_BATTLE = true;

/** DESIGN A16.14 values (spec section 13). Content without `economy.fort` has no forts at all. */
export const DEFAULT_FORT_ECONOMY: Readonly<FortEconomyRules> = {
  pads: [160, 230, 300, 640, 820],
  homePads: 3,
  padClearLu: 120,
  fieldBehindLu: 100,
  fieldFrontRank: 2,
  maxAlive: 2,
  maxCamps: 1,
  maxTowers: 2,
  rechargeMs: 25000,
  firstReadyMs: 20000,
  scaffoldMs: 5000,
  scaffoldHpBp: 5000,
  safeMarginMs: 1000,
  decayStartMs: 60000,
  decayBpPerSec: 100,
  siegeDecayBp: 20000,
  decayCreditMs: 3000,
  siegeTakenBp: 20000,
  rangedTakenBp: 5000,
  rangedMinLu: 100,
  structureBp: 20000,
  bountyGoldBp: 5000,
  bountyXpBp: 7000,
  towerReachMaxP: 560,
  contactLu: 60,
  contactMax: 5,
  wallHpBp: 10000,
  towerHpBp: 5000,
  campHpBp: 6000,
  towerDamageBp: 15000,
  levyHpBp: 4000,
  levyDamageBp: 4000,
  levyAiValueBp: 1600,
};

/** The content's fort rules, or null when the content has no forts (`economy.fort` absent). */
export function fortEconomyOf(e: EconomyRules | undefined): FortEconomyRules | null {
  const o = (e as { fort?: Partial<FortEconomyRules> } | undefined)?.fort;
  if (!o || typeof o !== 'object') return null;
  const d = DEFAULT_FORT_ECONOMY;
  const out = { ...d, pads: [...d.pads] } as FortEconomyRules;
  for (const k of Object.keys(d) as (keyof FortEconomyRules)[]) {
    if (k === 'pads') continue;
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) (out as unknown as Record<string, number>)[k] = Math.trunc(v);
  }
  if (Array.isArray(o.pads) && o.pads.every((p) => typeof p === 'number' && Number.isFinite(p) && p > 0)) out.pads = o.pads.map((p) => Math.trunc(p));
  if (out.homePads > out.pads.length) out.homePads = out.pads.length;
  return out;
}

/** Fort pad rules in one position unit (lu × `scale`); times in ticks. */
export interface FortPadRules {
  /** Pad centres, own-frame p. */
  pads: number[];
  homePads: number;
  padClear: number;
  fieldBehind: number;
  fieldFrontRank: number;
  maxAlive: number;
  maxCamps: number;
  maxTowers: number;
  scaffoldTicks: number;
  safeMarginTicks: number;
  towerReachMax: number;
  /** Half-width of a fort body by size (medium 16, large 24 lu at scale 1). */
  halfMedium: number;
  halfLarge: number;
  /** The blocked front must stand this far inside cover (the 12 lu of a small unit's half-width, A16.14.1). */
  coverMargin: number;
}

/**
 * Builds the pad rules from the content economy; `scale` 1,000 gives milli-lu (the sim, the AI), 1 gives
 * lu (the HUD). `scaffoldMs` overrides the scaffold time (Engineers research, A16.14.5). Null without forts.
 */
export function fortPadRules(e: EconomyRules, scale: number = MILLI, scaffoldMs?: number): FortPadRules | null {
  const f = fortEconomyOf(e);
  if (!f) return null;
  const size = (e as { sizes?: Record<string, number> }).sizes;
  const medium = size?.medium ?? 32;
  const large = size?.large ?? 48;
  const small = size?.small ?? 24;
  return {
    pads: f.pads.map((p) => p * scale),
    homePads: f.homePads,
    padClear: f.padClearLu * scale,
    fieldBehind: f.fieldBehindLu * scale,
    fieldFrontRank: f.fieldFrontRank,
    maxAlive: f.maxAlive,
    maxCamps: f.maxCamps,
    maxTowers: f.maxTowers,
    scaffoldTicks: msToTicks(scaffoldMs !== undefined && scaffoldMs > 0 ? scaffoldMs : f.scaffoldMs),
    safeMarginTicks: msToTicks(f.safeMarginMs),
    towerReachMax: f.towerReachMaxP * scale,
    halfMedium: Math.trunc((medium * scale) / 2),
    halfLarge: Math.trunc((large * scale) / 2),
    coverMargin: Math.trunc((small * scale) / 2),
  };
}

export type FortPadKind = 'home' | 'field';

/** Is pad `i` a Home pad or a Field pad? */
export function padKind(r: FortPadRules, i: number): FortPadKind {
  return i < r.homePads ? 'home' : 'field';
}

/** Half-width of a fort body of this size (0 for a trap). */
export function fortHalf(r: FortPadRules, size: 'medium' | 'large' | null): number {
  return size === 'medium' ? r.halfMedium : size === 'large' ? r.halfLarge : 0;
}

/**
 * A tower's range on a pad (A16.14.1 cover invariant): min(card range, reachMax − pad − half-width), so
 * its far reach never passes own-frame p 560. All in one unit; never below 0.
 */
export function towerRangeOnPad(cardRange: number, padP: number, half: number, reachMax: number): number {
  const cap = reachMax - padP - half;
  const r = cardRange < cap ? cardRange : cap;
  return r > 0 ? r : 0;
}

/** An enemy unit as the pad rules see it: own-frame centre p of the placer, body half-width, speed per second. */
export interface PadEnemy {
  id: number;
  p: number;
  half: number;
  air: boolean;
  burrowed?: boolean;
  /** Current speed in position units per second (units standing still: their card speed). */
  speed: number;
}

/** What a placement check needs about the placing side (own frame, one unit). */
export interface PadContext {
  /** The card's pad kinds (`FortDef.pads`) and body size. */
  cardPads: 'home' | 'any';
  size: 'medium' | 'large' | null;
  /** Pads held by own live forts, scaffolds or traps. */
  taken: readonly number[];
  /** Enemy units (every enemy unit; air and burrowed are ignored here). */
  enemies: readonly PadEnemy[];
  /** Own units for the Field-pad front (living, own frame; `structure` marks forts). */
  own: readonly FrontCandidate[];
}

/** Why pad `i` is illegal for this card now (A16.14.2, rules 1-4 in order), or null when it is legal. */
export function padDenyReason(r: FortPadRules, i: number, c: PadContext): 'fortPadKind' | 'fortPadTaken' | 'fortPadEnemy' | 'fortPadField' | null {
  const p = r.pads[i];
  if (p === undefined) return 'fortPadKind';
  const kind = padKind(r, i);
  if (kind === 'field' && c.cardPads !== 'any') return 'fortPadKind';
  if (c.taken.includes(i)) return 'fortPadTaken';
  for (const e of c.enemies) {
    if (e.air || e.burrowed) continue;
    const d = e.p > p ? e.p - p : p - e.p;
    if (d <= r.padClear) return 'fortPadEnemy';
  }
  if (kind === 'field') {
    const f = frontP(c.own, r.fieldFrontRank);
    if (f === null || f < p + r.fieldBehind) return 'fortPadField';
  }
  return null;
}

/** Is pad `i` legal for this card now? */
export function padLegal(r: FortPadRules, i: number, c: PadContext): boolean {
  return padDenyReason(r, i, c) === null;
}

/** Every legal pad index, in pad order. */
export function legalPads(r: FortPadRules, c: PadContext): number[] {
  const out: number[] = [];
  for (let i = 0; i < r.pads.length; i += 1) if (padLegal(r, i, c)) out.push(i);
  return out;
}

/**
 * Is a legal pad safe (AI and Key D only, A16.14.2)? Every enemy ground unit needs at least scaffold time
 * + the safe margin to reach the fort's footprint: edge distance × 20 ÷ speed ≥ scaffold + margin ticks.
 * A Home pad is also safe only inside own cover: pad p ≤ `coverLimitP` (the longest own built turret
 * range − 24 − 12 lu); with no turret (`coverLimitP` null) only the first pad counts.
 */
export function padSafe(r: FortPadRules, i: number, c: PadContext, coverLimitP: number | null): boolean {
  if (!padLegal(r, i, c)) return false;
  const p = r.pads[i] as number;
  if (padKind(r, i) === 'home') {
    if (coverLimitP === null ? i !== 0 : p > coverLimitP) return false;
  }
  const half = fortHalf(r, c.size);
  const need = r.scaffoldTicks + r.safeMarginTicks;
  for (const e of c.enemies) {
    if (e.air || e.burrowed) continue;
    const gap = (e.p > p ? e.p - p : p - e.p) - half - e.half;
    const edge = gap > 0 ? gap : 0;
    if (e.speed <= 0) continue;
    if (edge * TICKS_PER_SECOND < need * e.speed) return false;
  }
  return true;
}

/** Every safe pad index, in pad order. */
export function safePads(r: FortPadRules, c: PadContext, coverLimitP: number | null): number[] {
  const out: number[] = [];
  for (let i = 0; i < r.pads.length; i += 1) if (padSafe(r, i, c, coverLimitP)) out.push(i);
  return out;
}

/**
 * Key D and the AI (A16.14.7): the most forward safe pad the card may use; else the most rearward legal
 * pad; null when no pad is legal.
 */
export function mostForwardSafePad(r: FortPadRules, c: PadContext, coverLimitP: number | null): number | null {
  const safe = safePads(r, c, coverLimitP);
  let best: number | null = null;
  for (const i of safe) if (best === null || (r.pads[i] as number) > (r.pads[best] as number)) best = i;
  if (best !== null) return best;
  const legal = legalPads(r, c);
  let back: number | null = null;
  for (const i of legal) if (back === null || (r.pads[i] as number) < (r.pads[back] as number)) back = i;
  return back;
}

/** The cover limit of a side (A16.14.2): its longest built turret range − 24 − 12 lu, or null with no turret. */
export function coverLimitP(r: FortPadRules, longestTurretRange: number | null): number | null {
  if (longestTurretRange === null || longestTurretRange <= 0) return null;
  return longestTurretRange - r.halfLarge - r.coverMargin;
}

/** Everything the deny order reads (A16.14.2), in one unit; `pad` is the requested pad index. */
export interface FortDenyInput {
  pad: number;
  /** A Fort card in the current loadout (a locked slot arrives empty). */
  hasCard: boolean;
  siege: boolean;
  /** Ticks until the slot is recharged (≤ 0 = ready). */
  readyTicks: number;
  kind: 'wall' | 'tower' | 'camp' | 'trap';
  aliveForts: number;
  aliveTowers: number;
  campAlive: boolean;
  pop: number;
  fortPop: number;
  popCap: number;
  gold: number;
  cost: number;
  ctx: PadContext;
}

/**
 * The first reason a `fort` command is rejected, in the A16.14.2 order: `badCommand` → `noFort` →
 * `fortSiege` → `fortRecharge` → `fortMax` → `fortCampMax` → `fortPadKind` → `fortPadTaken` →
 * `fortPadEnemy` → `fortPadField` → `popFull` → `noGold`; null when it would be accepted.
 */
export function fortDenyReason(r: FortPadRules | null, o: FortDenyInput): string | null {
  if (!Number.isInteger(o.pad) || o.pad < 0 || (r !== null && o.pad >= r.pads.length)) return 'badCommand';
  if (!r || !o.hasCard) return 'noFort';
  if (o.siege) return 'fortSiege';
  if (o.readyTicks > 0) return 'fortRecharge';
  if (o.aliveForts >= r.maxAlive) return 'fortMax';
  if (o.kind === 'tower' && o.aliveTowers >= r.maxTowers) return 'fortMax';
  if (o.kind === 'camp' && o.campAlive) return 'fortCampMax';
  const pad = padDenyReason(r, o.pad, o.ctx);
  if (pad) return pad;
  if (o.pop + o.fortPop > o.popCap) return 'popFull';
  if (o.gold < o.cost) return 'noGold';
  return null;
}

/** Ticks of a fort duration in ms (the sim's `max(1, round(ms / 50))`, B3). */
export function fortTicks(ms: number): number {
  return msToTicks(ms);
}

/** One decay step's loss, rounded up so a fort never outlives its decay budget: ceil(maxHp × bp ÷ 10,000). */
export function decayLoss(maxHp: number, bp: number): number {
  if (bp <= 0 || maxHp <= 0) return 0;
  return Math.trunc((maxHp * bp + BP - 1) / BP);
}
