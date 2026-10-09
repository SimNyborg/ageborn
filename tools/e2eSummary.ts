/**
 * One line per e2e failure at the end of CI's log (2026-10-08): the GitHub reporter's annotations stop
 * after the first ten errors and the full log is too long to read, so the e2e job prints this summary
 * from Playwright's JSON report (`playwright.config.ts` writes it in CI).
 *
 *   npx tsx tools/e2eSummary.ts test-results/e2e-results.json
 *
 * Lines: `FAIL  [project] file:line › title › … — first line of the error`, then the flaky ones. Always
 * exits 0: the test step itself fails the job.
 */
import { existsSync, readFileSync } from 'node:fs';

interface JsonResult {
  status: string;
  retry: number;
  error?: { message?: string };
  errors?: { message?: string }[];
}
interface JsonTest {
  projectName: string;
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  results: JsonResult[];
}
interface JsonSpec {
  title: string;
  file: string;
  line: number;
  tests: JsonTest[];
}
interface JsonSuite {
  title: string;
  file?: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}
export interface JsonReport {
  suites: JsonSuite[];
  stats?: { expected?: number; unexpected?: number; flaky?: number; skipped?: number };
}

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;

/** The first meaningful line of a result's error, without colour codes, at most 220 characters. */
function firstLine(r: JsonResult | undefined): string {
  const msg = r?.error?.message ?? r?.errors?.find((e) => e.message)?.message ?? '';
  const line =
    msg
      .replace(ANSI, '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l !== '') ?? '(no error message)';
  return line.length > 220 ? `${line.slice(0, 217)}...` : line;
}

/** The summary lines of a Playwright JSON report: a count line, then one line per failed and flaky test. */
export function summarize(report: JsonReport): string[] {
  const fail: string[] = [];
  const flaky: string[] = [];
  const walk = (s: JsonSuite, path: string[]): void => {
    const titles = s.title && !s.title.endsWith('.ts') ? [...path, s.title] : path;
    for (const spec of s.specs ?? []) {
      for (const t of spec.tests) {
        if (t.status !== 'unexpected' && t.status !== 'flaky') continue;
        const name = `[${t.projectName}] ${spec.file}:${spec.line} › ${[...titles, spec.title].join(' › ')}`;
        if (t.status === 'unexpected') fail.push(`FAIL  ${name} — ${firstLine(t.results.find((r) => r.status !== 'passed' && r.status !== 'skipped'))}`);
        else flaky.push(`FLAKY ${name} — ${firstLine(t.results.find((r) => r.status !== 'passed'))}`);
      }
    }
    for (const c of s.suites ?? []) walk(c, titles);
  };
  for (const s of report.suites) walk(s, []);
  const st = report.stats ?? {};
  const head = `E2E summary: ${st.expected ?? 0} passed, ${st.unexpected ?? 0} failed, ${st.flaky ?? 0} flaky, ${st.skipped ?? 0} skipped`;
  return [head, ...fail.sort(), ...flaky.sort()];
}

function main(): void {
  const file = process.argv[2] ?? 'test-results/e2e-results.json';
  if (!existsSync(file)) {
    console.log(`E2E summary: no report at ${file} (the run stopped before the tests finished)`);
    return;
  }
  try {
    for (const l of summarize(JSON.parse(readFileSync(file, 'utf8')) as JsonReport)) console.log(l);
  } catch (e) {
    console.log(`E2E summary: the report at ${file} could not be read (${String(e)})`);
  }
}

if (process.argv[1]?.endsWith('e2eSummary.ts')) main();
