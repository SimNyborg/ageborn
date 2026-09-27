import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { bool, int, list, parseArgs, str } from '../lib/args';
import { ciWithinCheck, exitCode, fmtClock, maxCheck, rangeCheck, requireSamples, startReport, writeReport } from '../report';

const tmp = mkdtempSync(path.join(tmpdir(), 'ageborn-report-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('checks', () => {
  const show = (v: number): string => String(v);

  it('range and max checks judge the point estimate', () => {
    expect(rangeCheck('a', 'm', 5, 1, 9, { target: 't', show }).verdict).toBe('pass');
    expect(rangeCheck('a', 'm', 10, 1, 9, { target: 't', show }).verdict).toBe('fail');
    expect(rangeCheck('a', 'm', Number.NaN, 1, 9, { target: 't', show }).verdict).toBe('fail');
    expect(maxCheck('a', 'm', 55, 55, { target: 't', show }).verdict).toBe('pass');
  });

  it('a CI check passes only when the whole interval lies within the bound', () => {
    expect(ciWithinCheck('c', 'm', { value: 1, lo: -2, hi: 2.9, n: 1000 }, 3).verdict).toBe('pass');
    const wide = ciWithinCheck('c', 'm', { value: 1, lo: -4, hi: 6, n: 50 }, 3);
    expect(wide.verdict).toBe('fail');
    expect(wide.note).toMatch(/CI too wide/);
    expect(ciWithinCheck('c', 'm', { value: 5, lo: 4, hi: 6, n: 1000 }, 3).note).toBeUndefined();
  });

  it('small samples cannot pass', () => {
    const c = rangeCheck('a', 'm', 5, 1, 9, { target: 't', show });
    expect(requireSamples(c, 10).verdict).toBe('fail');
    expect(requireSamples(c, 30).verdict).toBe('pass');
  });

  it('the gate fails only on failed checks and only when on', () => {
    const pass = rangeCheck('a', 'm', 5, 1, 9, { target: 't', show });
    const fail = rangeCheck('b', 'm', 50, 1, 9, { target: 't', show });
    expect(exitCode([pass], true)).toBe(0);
    expect(exitCode([pass, fail], true)).toBe(1);
    expect(exitCode([pass, fail], false)).toBe(0);
  });

  it('formats clock times', () => {
    expect(fmtClock(420)).toBe('7:00');
    expect(fmtClock(65.4)).toBe('1:05');
    expect(fmtClock(Number.NaN)).toBe('-');
  });
});

describe('writeReport', () => {
  it('writes JSON and markdown with the checks first', () => {
    const r = startReport<{ x: number }>('unit-test', 'Unit test report', { a: 1, b: 'two' }).finish(
      [rangeCheck('a', 'Metric A', 5, 1, 9, { target: '1-9', show: String })],
      { x: 42 },
      ['a note'],
    );
    const files = writeReport(r, ['## Extra', '', 'body'], tmp);
    const json = JSON.parse(readFileSync(files.json, 'utf8')) as typeof r;
    expect(json.tool).toBe('unit-test');
    expect(json.data.x).toBe(42);
    const md = readFileSync(files.md, 'utf8');
    expect(md).toContain('# Unit test report');
    expect(md).toContain('| PASS | Metric A | 1-9 | 5 |');
    expect(md).toContain('- a note');
    expect(md.indexOf('## Checks')).toBeLessThan(md.indexOf('## Extra'));
  });
});

describe('parseArgs', () => {
  it('parses flags, values, negations and positionals', () => {
    const a = parseArgs(['file.json', '--mode', 'full', '--workers=4', '--no-gate', '--dry-run', '--cards', 'a,b', 'dir']);
    expect(a.positional).toEqual(['file.json', 'dir']);
    expect(str(a, 'mode', 'smoke')).toBe('full');
    expect(int(a, 'workers', 1)).toBe(4);
    expect(bool(a, 'gate', true)).toBe(false);
    expect(bool(a, 'dry-run', false)).toBe(true);
    expect(list(a, 'cards')).toEqual(['a', 'b']);
    expect(() => int(parseArgs(['--workers', 'x']), 'workers', 1)).toThrow(/integer/);
  });
});
