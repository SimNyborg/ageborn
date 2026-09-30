/**
 * Statistics for the headless tools (DESIGN B12, A2.14): medians and quantiles, confidence intervals for
 * win rates (paired mirrored seeds and plain proportions), and the chi-square test used by `drops`.
 *
 * Tools run in Node and may use floats; everything here is a pure function of its inputs.
 */

/** z for a two-sided 95% interval. */
export const Z95 = 1.959963984540054;

/** Sorted copy (ascending), numbers only. */
function sorted(xs: readonly number[]): number[] {
  return [...xs].sort((a, b) => a - b);
}

/** Linear-interpolated quantile (q in [0, 1]); NaN for an empty list. */
export function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return Number.NaN;
  const s = sorted(xs);
  const pos = (s.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = s[lo] as number;
  const b = s[hi] as number;
  return a + (b - a) * (pos - lo);
}

export function median(xs: readonly number[]): number {
  return quantile(xs, 0.5);
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/** Sample standard deviation (n − 1); 0 for fewer than two values. */
export function stdev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let ss = 0;
  for (const x of xs) ss += (x - m) * (x - m);
  return Math.sqrt(ss / (xs.length - 1));
}

/** Share of values inside [lo, hi]; NaN for an empty list. */
export function shareWithin(xs: readonly number[], lo: number, hi: number): number {
  if (xs.length === 0) return Number.NaN;
  return xs.filter((x) => x >= lo && x <= hi).length / xs.length;
}

/** A point estimate with a 95% confidence interval, in the same unit as `value`. */
export interface Estimate {
  value: number;
  lo: number;
  hi: number;
  n: number;
}

/**
 * Win-rate delta in points (score − 50) from mirrored pairs: each entry is the mean score of one seed's
 * two matches (the test plan on side 0, then on side 1), with win 1, draw 0.5, loss 0. The pairs are
 * independent, so the interval uses the pair-level spread (DESIGN A2.14: "the 95% confidence interval
 * lies within ±3 points").
 */
export function pairedDelta(pairScores: readonly number[]): Estimate {
  const n = pairScores.length;
  if (n === 0) return { value: Number.NaN, lo: Number.NaN, hi: Number.NaN, n };
  const m = mean(pairScores);
  const se = stdev(pairScores) / Math.sqrt(n);
  const value = (m - 0.5) * 100;
  return { value, lo: value - Z95 * se * 100, hi: value + Z95 * se * 100, n };
}

/**
 * The mean of paired differences in points (×100) with a normal 95% interval: one difference per seed,
 * for example a test plan's score minus a control plan's score against the same opponent (A2.9.12
 * situational power rows).
 */
export function meanDiff(diffs: readonly number[]): Estimate {
  const n = diffs.length;
  if (n === 0) return { value: Number.NaN, lo: Number.NaN, hi: Number.NaN, n };
  const m = mean(diffs);
  const se = stdev(diffs) / Math.sqrt(n);
  const value = m * 100;
  return { value, lo: value - Z95 * se * 100, hi: value + Z95 * se * 100, n };
}

/**
 * A proportion in percent with a Wilson 95% interval. `successes` may be fractional (draws count half).
 */
export function proportion(successes: number, n: number): Estimate {
  if (n <= 0) return { value: Number.NaN, lo: Number.NaN, hi: Number.NaN, n: 0 };
  const p = successes / n;
  const z2 = Z95 * Z95;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (Z95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { value: (successes * 100) / n, lo: Math.max(0, centre - half) * 100, hi: Math.min(1, centre + half) * 100, n };
}

// ---------------------------------------------------------------------------------------------
// Chi-square goodness of fit.

/** ln Γ(x) for x > 0 (Lanczos, g = 7, n = 9). */
export function lnGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const xx = x - 1;
  let a = c[0] as number;
  const t = xx + 7.5;
  for (let i = 1; i < 9; i += 1) a += (c[i] as number) / (xx + i);
  return 0.5 * Math.log(2 * Math.PI) + (xx + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized upper incomplete gamma Q(a, x) = Γ(a, x) / Γ(a) (Numerical Recipes gser / gcf). */
export function gammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) return Number.NaN;
  if (x === 0) return 1;
  const gln = lnGamma(a);
  if (x < a + 1) {
    // Series for P, then Q = 1 − P.
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 1000; n += 1) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return Math.max(0, 1 - sum * Math.exp(-x + a * Math.log(x) - gln));
  }
  // Continued fraction for Q (modified Lentz).
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.min(1, Math.exp(-x + a * Math.log(x) - gln) * h);
}

export interface ChiSquare {
  stat: number;
  df: number;
  /** Upper-tail p-value; the published odds pass when p > 0.01 (DESIGN C4.5). */
  p: number;
  n: number;
  observed: number[];
  expected: number[];
}

/**
 * Pearson chi-square goodness of fit of `observed` counts against category probabilities `probs`
 * (any positive scale; normalised here). Categories with probability 0 must have 0 observations,
 * otherwise p = 0.
 */
export function chiSquare(observed: readonly number[], probs: readonly number[]): ChiSquare {
  if (observed.length !== probs.length) throw new Error('chiSquare: observed and probs differ in length');
  const n = observed.reduce((s, x) => s + x, 0);
  const total = probs.reduce((s, x) => s + x, 0);
  const expected = probs.map((p) => (total > 0 ? (n * p) / total : 0));
  let stat = 0;
  let df = -1;
  let impossible = false;
  for (let i = 0; i < observed.length; i += 1) {
    const e = expected[i] as number;
    const o = observed[i] as number;
    if (e === 0) {
      if (o > 0) impossible = true;
      continue;
    }
    df += 1;
    stat += ((o - e) * (o - e)) / e;
  }
  const p = impossible ? 0 : df <= 0 ? 1 : gammaQ(df / 2, stat / 2);
  return { stat, df: Math.max(0, df), p, n, observed: [...observed], expected };
}

/** Longest run of consecutive `false` values (for pity gaps: "at least one X every N"). */
export function longestRun(flags: readonly boolean[]): number {
  let best = 0;
  let cur = 0;
  for (const f of flags) {
    cur = f ? 0 : cur + 1;
    if (cur > best) best = cur;
  }
  return best;
}
