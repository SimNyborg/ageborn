/**
 * The counter term f_counter(c) (DESIGN A7.2):
 *
 *   f_counter(c) = Σ M[c][e] · V(e) / Σ V(e)
 *
 * over enemy units within 500 lu of the bot's front (all enemies if none), limited to the first
 * *counter depth* enemies by p (nearest the bot's gate first). M is the compile-time counter matrix
 * (B4). With no enemies it is 0.5, unless the tier remembers composition (A7.3), in which case the
 * enemy cards seen recently stand in. A tier that predicts the next enemy age blends in the Commons of
 * the foe's next age once the foe is close to evolving.
 *
 * Enemy forts (A16.14.7 "answering forts") join the sample at 2 × their price with the structure row
 * of the card book (Heavy, siege, artillery and Legendary ×2; other range ≥ 100 ×0.5; air flies over
 * walls and camps), because the equal-gold counter matrix cannot value them. Levies never enter it.
 *
 * Every value is in bp (10,000 = 1).
 */
import type { CardId } from '@/contracts';
import { BP, MILLI } from '@/core';
import { counterBp, type CardBook, type UnitCard } from './book';
import type { RememberedCard } from './memory';
import type { SeenUnit } from './view';

/** "within 500 lu of the bot's front". */
export const COUNTER_RADIUS = 500 * MILLI;
/** Foe XP (bp of threshold) from which a predicting bot starts planning for the foe's next age. */
export const PREDICT_FROM_XP_BP = 8500;
/** Weight of the predicted next age in the blended counter term, bp. */
export const PREDICT_BLEND_BP = 3000;

/** A value-weighted enemy sample: card and weight (V × copies). A fort card reads the structure row. */
export interface CounterSample {
  card: CardId;
  weight: number;
}

/** A fort counts as an enemy worth 2 × its price in the counter term (A16.14.7). */
export const FORT_COUNTER_WEIGHT = 2;

/** M[c][e] in bp, or the structure row when `e` is a fort card (A16.14.7). */
function counterCell(book: CardBook, card: CardId, target: CardId): number {
  const fort = book.forts[target];
  if (fort) {
    const u = book.units[card];
    return u ? (fort.kind === 'tower' ? u.vsTowerBp : u.vsStructureBp) : BP / 2;
  }
  return counterBp(book, card, target);
}

/**
 * The enemies the counter term considers (A7.2): within 500 lu of the bot's front (the bot's own gate
 * when it has no ground units), else all enemies; sorted by p, nearest the bot's gate first, and cut
 * to `depth` units.
 */
export function counterTargets(foes: readonly SeenUnit[], myFront: number | null, depth: number): SeenUnit[] {
  const front = myFront ?? 0;
  // Summons are never counter targets (A16.14.3): a free levy, drop or rider says nothing about the
  // enemy's plan.
  const real = foes.filter((u) => !u.summoned && !u.levy);
  let near = real.filter((u) => (u.p > front ? u.p - front : front - u.p) <= COUNTER_RADIUS);
  if (near.length === 0) near = [...real];
  near.sort((a, b) => a.p - b.p || a.id - b.id);
  return depth > 0 ? near.slice(0, depth) : near;
}

/** f_counter over a weighted sample, bp; 5,000 for an empty sample. */
export function counterScore(book: CardBook, card: CardId, sample: readonly CounterSample[]): number {
  let num = 0;
  let den = 0;
  for (const s of sample) {
    if (s.weight <= 0) continue;
    num += counterCell(book, card, s.card) * s.weight;
    den += s.weight;
  }
  return den > 0 ? Math.trunc(num / den) : BP / 2;
}

export function sampleOfUnits(units: readonly SeenUnit[]): CounterSample[] {
  return units.map((u) => ({ card: u.card, weight: Math.max(1, u.value) }));
}

/** Enemy forts as counter samples: 2 × price each (A16.14.7). */
export function sampleOfForts(forts: readonly { card: CardId; value: number }[]): CounterSample[] {
  return forts.map((f) => ({ card: f.card, weight: Math.max(1, f.value * FORT_COUNTER_WEIGHT) }));
}

export function sampleOfMemory(mem: readonly RememberedCard[], book: CardBook): CounterSample[] {
  return mem.map((r) => ({ card: r.card, weight: Math.max(1, (book.units[r.card]?.value ?? 0) * r.count) }));
}

/** The Commons of an age, equally weighted by value: what a foe typically fields right after evolving. */
export function sampleOfAge(pool: readonly UnitCard[]): CounterSample[] {
  return pool.filter((u) => !u.legendary && u.group !== 'epic').map((u) => ({ card: u.id, weight: u.value }));
}

export interface CounterContext {
  book: CardBook;
  /** The current-situation sample (visible enemies, or memory). Empty = unknown. */
  now: CounterSample[];
  /** The predicted next-age sample, or null. */
  next: CounterSample[] | null;
}

/** f_counter(c) in bp for the context. */
export function fCounter(ctx: CounterContext, card: CardId): number {
  const cur = counterScore(ctx.book, card, ctx.now);
  if (!ctx.next || ctx.next.length === 0) return cur;
  const nxt = counterScore(ctx.book, card, ctx.next);
  return Math.trunc((cur * (BP - PREDICT_BLEND_BP) + nxt * PREDICT_BLEND_BP) / BP);
}
