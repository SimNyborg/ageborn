import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { main } from '../sim-cli';

const tmp = mkdtempSync(path.join(tmpdir(), 'ageborn-cli-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('sim-cli', () => {
  it('prints help and rejects unknown commands', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await main(['help'])).toBe(0);
    expect(await main(['nope'])).toBe(2);
    expect(err.mock.calls[0]?.[0]).toMatch(/unknown command "nope"/);
    log.mockRestore();
    err.mockRestore();
  });

  it('writes reports for a tool run and gates on failed targets', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const dir = path.join(tmp, 'csv');
    expect(await main(['csv', 'export', '--dir', dir, '--out', tmp, '--raw', path.resolve(import.meta.dirname, '../../tests/fixtures/content')])).toBe(0);
    expect(existsSync(path.join(dir, 'units.csv'))).toBe(true);
    expect(existsSync(path.join(tmp, 'csv.md'))).toBe(true);
    expect(await main(['replay-verify', path.join(tmp, 'missing.json'), '--out', tmp]).catch((e: Error) => e.message)).toMatch(/ENOENT|no such file/);
    log.mockRestore();
  });

  it('validates flags', async () => {
    await expect(main(['balance', '--mode', 'huge'])).rejects.toThrow(/--mode/);
    await expect(main(['exploits', '--proxies', 'nope'])).rejects.toThrow(/unknown proxy/);
  });
});
