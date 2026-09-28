/**
 * C2/WP6 DoD "Pre-render < 300 ms for boot sets" (B16 "Audio pre-render < 300 ms at boot").
 *
 * The timing test renders the boot groups in a fresh bank, cold, as boot does (Node runs the same V8
 * as Chrome). It measures CPU time rather than wall time, so other test files running in parallel on
 * a busy machine do not count against it; the soundboard shows the wall time in the browser. The
 * work-size test is the machine-independent guard against the boot set growing.
 */
import { describe, expect, it } from 'vitest';
import { SFX_SAMPLE_RATE, SoundBank } from '../bank';
import { BOOT_GROUPS, SOUND_IDS, sounds } from '../sounds';
import type { ZzfxParams } from '../vendor/zzfx';
import { zzfxLength } from '../vendor/zzfx';

type CpuUsage = () => { user: number; system: number };
const cpuUsage = (globalThis as { process?: { cpuUsage?: CpuUsage } }).process?.cpuUsage;

/** CPU ms spent in `fn` (wall ms where CPU time is not available). */
function cpuMs(fn: () => void): number {
  if (cpuUsage) {
    const a = cpuUsage();
    fn();
    const b = cpuUsage();
    return (b.user - a.user + (b.system - a.system)) / 1000;
  }
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

const BUDGET_MS = 300;

describe('boot pre-render budget', () => {
  it(`renders the boot groups in under ${BUDGET_MS} ms`, { retry: 2 }, () => {
    const bank = new SoundBank();
    let rendered = 0;
    const ms = cpuMs(() => {
      rendered = bank.renderGroups(BOOT_GROUPS).sounds;
    });
    expect(rendered).toBeGreaterThan(40);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('keeps the boot work small enough for a slow phone', () => {
    // Samples ZzFX generates for the boot groups (layers counted separately).
    let generated = 0;
    for (const id of SOUND_IDS) {
      const d = sounds[id]!;
      if (!BOOT_GROUPS.includes(d.group)) continue;
      const lists: ZzfxParams[] = d.kind === 'zzfx' ? d.variants : d.kind === 'zzfxMix' ? d.variants.flat().map((n) => n.params) : [];
      for (const p of lists) generated += zzfxLength(p, SFX_SAMPLE_RATE);
    }
    // At a pessimistic 80 ns per sample (a mid-range phone, about 3x a desktop) this stays in budget.
    expect((generated * 80) / 1e6).toBeLessThan(BUDGET_MS);
  });
});
