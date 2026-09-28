import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { applyPatch, mergePatch } from '../lib/patch';

describe('content patches (B12 --patch, A16.4 step 1)', () => {
  it('deep-merges objects and replaces everything else', () => {
    const base = { a: 1, b: { c: 2, d: [1, 2] }, e: 'x' };
    expect(mergePatch(base, { b: { c: 5, d: [9] }, f: true })).toEqual({ a: 1, b: { c: 5, d: [9] }, e: 'x', f: true });
    expect(base.b.c).toBe(2);
  });

  it('patches the compiled content without touching the original, and tags the hash', () => {
    const patched = applyPatch(content, { economy: { siege: { moveSpeedBp: 15000 } } }, 'fast');
    expect(patched.economy.siege.moveSpeedBp).toBe(15000);
    expect(patched.economy.siege.turretDamageBp).toBe(content.economy.siege.turretDamageBp);
    expect(content.economy.siege.moveSpeedBp).toBe(12000);
    expect(patched.hash).toBe(`${content.hash}+fast`);
    expect(patched.units).toBe(content.units);
  });
});
