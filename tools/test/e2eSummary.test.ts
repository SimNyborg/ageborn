/** The CI e2e summary (tools/e2eSummary.ts): one line per failed and flaky test, colour codes stripped. */
import { describe, expect, it } from 'vitest';
import { summarize, type JsonReport } from '../e2eSummary';

describe('e2e summary', () => {
  it('prints the counts, then one line per failure and per flaky test', () => {
    const report: JsonReport = {
      stats: { expected: 10, unexpected: 1, flaky: 1, skipped: 2 },
      suites: [
        {
          title: 'hud.spec.ts',
          file: 'hud.spec.ts',
          suites: [
            {
              title: 'Battle HUD',
              specs: [
                {
                  title: 'fits at 844 x 390',
                  file: 'hud.spec.ts',
                  line: 112,
                  tests: [
                    { projectName: 'chromium', status: 'expected', results: [{ status: 'passed', retry: 0, duration: 4000 }] },
                    {
                      projectName: 'webkit',
                      status: 'unexpected',
                      results: [
                        { status: 'failed', retry: 0, duration: 30_000, error: { message: '\u001b[31mError: expect(received).toEqual(expected)\u001b[39m\n\nmore' } },
                        { status: 'failed', retry: 1, error: { message: 'Error: again' } },
                      ],
                    },
                  ],
                },
                {
                  title: 'stance buttons',
                  file: 'hud.spec.ts',
                  line: 210,
                  tests: [{ projectName: 'webkit', status: 'flaky', results: [{ status: 'timedOut', retry: 0, duration: 90_000, errors: [{ message: 'Test timeout of 30000ms exceeded.' }] }, { status: 'passed', retry: 1 }] }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(summarize(report)).toEqual([
      'E2E summary: 10 passed, 1 failed, 1 flaky, 2 skipped',
      'time [chromium]: 1 tests, 0.1 min in all, median 4.0 s, p90 4.0 s, slowest 4.0 s',
      'time [webkit]: 2 tests, 2.0 min in all, median 90.0 s, p90 90.0 s, slowest 90.0 s',
      'FAIL  [webkit] hud.spec.ts:112 › Battle HUD › fits at 844 x 390 — Error: expect(received).toEqual(expected)',
      'FLAKY [webkit] hud.spec.ts:210 › Battle HUD › stance buttons — Test timeout of 30000ms exceeded.',
    ]);
  });
});
