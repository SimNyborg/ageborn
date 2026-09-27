/**
 * Report writing for the headless tools (DESIGN B12, C2/WP12 DoD: "all tools run and produce reports
 * under reports/"). Every tool writes `reports/<tool>.json` (machine-readable, stable field names) and
 * `reports/<tool>.md` (a human summary with the target checks first). `reports/` is git-ignored.
 *
 * A check compares one metric with its DESIGN target (A2.14, A6.9, C4). The gate (exit code) fails when
 * any check fails, unless the tool runs with `--no-gate`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Estimate } from './lib/stats';

export type Verdict = 'pass' | 'fail' | 'skipped' | 'info';

export interface Check {
  /** Stable id, for example `mirror.full.medianLength`. */
  id: string;
  /** What is measured. */
  metric: string;
  /** The DESIGN target in words, for example "7:00 ± 30 s". */
  target: string;
  /** The measured value in words. */
  value: string;
  verdict: Verdict;
  note?: string;
}

export interface Report<T = unknown> {
  tool: string;
  title: string;
  createdAt: string;
  durationMs: number;
  params: Record<string, unknown>;
  checks: Check[];
  notes: string[];
  data: T;
}

export const REPORTS_DIR = path.resolve(import.meta.dirname, '..', 'reports');

// ---------------------------------------------------------------------------------------------
// Formatting.

/** Seconds as m:ss (NaN → "-"). */
export function fmtClock(sec: number): string {
  if (!Number.isFinite(sec)) return '-';
  const s = Math.round(sec);
  const sign = s < 0 ? '-' : '';
  const a = Math.abs(s);
  return `${sign}${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`;
}

export function fmtNum(x: number, digits = 1): string {
  return Number.isFinite(x) ? x.toFixed(digits) : '-';
}

export function fmtPct(x: number, digits = 1): string {
  return Number.isFinite(x) ? `${x.toFixed(digits)}%` : '-';
}

/** "12.3 [9.1, 15.5]" */
export function fmtEstimate(e: Estimate, digits = 1, unit = ''): string {
  if (!Number.isFinite(e.value)) return '-';
  return `${e.value.toFixed(digits)}${unit} [${e.lo.toFixed(digits)}, ${e.hi.toFixed(digits)}]`;
}

export function markdownTable(headers: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  const esc = (v: string | number): string => String(v).replace(/\|/g, '\\|');
  const out = [`| ${headers.map(esc).join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
  for (const r of rows) out.push(`| ${r.map(esc).join(' | ')} |`);
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Checks.

/** Point estimate inside [lo, hi] (inclusive). NaN (not measured) fails. */
export function rangeCheck(
  id: string,
  metric: string,
  value: number,
  lo: number,
  hi: number,
  o: { target: string; show: (v: number) => string; note?: string },
): Check {
  const ok = Number.isFinite(value) && value >= lo && value <= hi;
  return { id, metric, target: o.target, value: o.show(value), verdict: ok ? 'pass' : 'fail', ...(o.note ? { note: o.note } : {}) };
}

/** Point estimate at most `max`. */
export function maxCheck(id: string, metric: string, value: number, max: number, o: { target: string; show: (v: number) => string; note?: string }): Check {
  return rangeCheck(id, metric, value, Number.NEGATIVE_INFINITY, max, o);
}

/**
 * The 95% confidence interval lies within ±bound (DESIGN A2.14 per-card win-rate delta). When the point
 * estimate is inside but the interval is not, the note says the run needs more matches.
 */
export function ciWithinCheck(id: string, metric: string, e: Estimate, bound: number): Check {
  const ok = Number.isFinite(e.value) && e.lo >= -bound && e.hi <= bound;
  const check: Check = {
    id,
    metric,
    target: `95% CI within ±${bound} points`,
    value: fmtEstimate(e, 1, ' pts'),
    verdict: ok ? 'pass' : 'fail',
  };
  if (!ok && Number.isFinite(e.value) && Math.abs(e.value) <= bound) check.note = `CI too wide for ${e.n} pairs; run more matches`;
  return check;
}

/** Fewer samples than this cannot pass a statistical target (a CI from a handful of matches means nothing). */
export const MIN_SAMPLES = 30;

/** Fails a passing check whose sample is below `min`, with a note saying why. */
export function requireSamples(c: Check, n: number, min: number = MIN_SAMPLES): Check {
  if (n >= min || c.verdict !== 'pass') return c;
  return { ...c, verdict: 'fail', note: `only ${n} samples (need ≥ ${min} to judge)` };
}

/** Fails when any match crashed (the sim or a controller threw); the note shows the first error. */
export function crashCheck(id: string, results: readonly { error?: string; tag: string }[]): Check {
  const crashed = results.filter((r) => r.error !== undefined);
  const first = crashed[0];
  return {
    id,
    metric: 'Matches that crashed',
    target: '0',
    value: `${crashed.length} of ${results.length}`,
    verdict: crashed.length === 0 ? 'pass' : 'fail',
    ...(first ? { note: `${first.tag}: ${(first.error ?? '').split('\n')[0] ?? ''}` } : {}),
  };
}

export function infoCheck(id: string, metric: string, value: string, note?: string): Check {
  return { id, metric, target: 'reported, not gated', value, verdict: 'info', ...(note ? { note } : {}) };
}

export function skippedCheck(id: string, metric: string, target: string, reason: string): Check {
  return { id, metric, target, value: '-', verdict: 'skipped', note: reason };
}

export function countVerdicts(checks: readonly Check[]): Record<Verdict, number> {
  const c: Record<Verdict, number> = { pass: 0, fail: 0, skipped: 0, info: 0 };
  for (const x of checks) c[x.verdict] += 1;
  return c;
}

/** 1 when the gate is on and a check failed, else 0. */
export function exitCode(checks: readonly Check[], gate: boolean): number {
  return gate && checks.some((c) => c.verdict === 'fail') ? 1 : 0;
}

const MARK: Record<Verdict, string> = { pass: 'PASS', fail: 'FAIL', skipped: 'SKIP', info: 'info' };

export function checksMarkdown(checks: readonly Check[]): string {
  if (checks.length === 0) return '_No checks._';
  return markdownTable(
    ['', 'Check', 'Target', 'Value', 'Note'],
    checks.map((c) => [MARK[c.verdict], c.metric, c.target, c.value, c.note ?? '']),
  );
}

// ---------------------------------------------------------------------------------------------
// Writing.

export interface WrittenReport {
  json: string;
  md: string;
}

/** Writes `<dir>/<tool>.json` and `<dir>/<tool>.md`; `sections` are extra markdown blocks after the checks. */
export function writeReport(report: Report, sections: readonly string[] = [], dir: string = REPORTS_DIR): WrittenReport {
  mkdirSync(dir, { recursive: true });
  const json = path.join(dir, `${report.tool}.json`);
  const md = path.join(dir, `${report.tool}.md`);
  writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`);
  const v = countVerdicts(report.checks);
  const lines = [
    `# ${report.title}`,
    '',
    `Generated ${report.createdAt} in ${(report.durationMs / 1000).toFixed(1)} s by \`tools/${report.tool}\`.`,
    '',
    `**Checks:** ${v.pass} pass, ${v.fail} fail, ${v.skipped} skipped, ${v.info} info.`,
    '',
    '## Parameters',
    '',
    markdownTable(
      ['Parameter', 'Value'],
      Object.entries(report.params).map(([k, val]) => [k, typeof val === 'string' ? val : JSON.stringify(val)]),
    ),
    '',
    '## Checks',
    '',
    checksMarkdown(report.checks),
    '',
  ];
  if (report.notes.length > 0) lines.push('## Notes', '', ...report.notes.map((n) => `- ${n}`), '');
  for (const s of sections) lines.push(s, '');
  writeFileSync(md, lines.join('\n'));
  return { json, md };
}

/** One console line per check plus the summary; returns the text for tests. */
export function printChecks(report: Report, log: (line: string) => void = console.log): void {
  for (const c of report.checks) {
    log(`  ${MARK[c.verdict].padEnd(4)} ${c.metric}: ${c.value} (target ${c.target})${c.note ? ` - ${c.note}` : ''}`);
  }
  const v = countVerdicts(report.checks);
  log(`${report.tool}: ${v.pass} pass, ${v.fail} fail, ${v.skipped} skipped, ${v.info} info`);
}

/** A report skeleton with timing filled in by `finish`. */
export function startReport<T>(tool: string, title: string, params: Record<string, unknown>): { finish(checks: Check[], data: T, notes?: string[]): Report<T> } {
  const started = Date.now();
  return {
    finish(checks, data, notes = []) {
      return { tool, title, createdAt: new Date(started).toISOString(), durationMs: Date.now() - started, params, checks, notes, data };
    },
  };
}
