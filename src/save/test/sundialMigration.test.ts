/**
 * Save v10, the Sundial (DESIGN A6.3, A15.4, B8): no shape change; banked charges carry over one-for-one
 * as ready Sundial capsules; the one-time notice flag only for saves that have played.
 */
import { describe, expect, it } from 'vitest';
import { migrate, SAVE_VERSION, SAVE_VERSIONS } from '../migrations';
import { SUNDIAL_NOTICE_FLAG, SUNDIAL_RESTART_FLAG, v10 } from '../migrations/v10';
import { validateSaveDoc } from '../schema';
import { SAVE_FIXTURES } from './helpers';

type Doc = Record<string, unknown> & { v: number; matchesPlayed: number; flags: Record<string, boolean>; capsules: Record<string, unknown> };

const v9 = (): Doc => JSON.parse(JSON.stringify(SAVE_FIXTURES[9])) as Doc;
/** The chain up to this step (v10), so later steps (v11: forts) do not show in the diff. */
const TO_V10 = SAVE_VERSIONS.filter((x) => x.v <= 10);
/** Migrates a v10 doc to the current version and validates it there. */
const validLater = (doc: Doc): boolean => {
  const m = migrate(doc);
  return m.ok && m.to === SAVE_VERSION && validateSaveDoc(m.doc).ok;
};

describe('v9 → v10: the Sundial', () => {
  it('sets the notice for a save that has played, keeps every charge as a ready capsule, and validates', () => {
    const old = v9();
    expect(old.matchesPlayed).toBeGreaterThan(0);
    const m = migrate(old, { versions: TO_V10 });
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    const doc = m.doc as Doc;
    expect(doc.v).toBe(10);
    expect(doc.flags[SUNDIAL_NOTICE_FLAG]).toBe(true);
    expect(doc.capsules).toEqual(old.capsules);
    expect(validLater(doc)).toBe(true);
    // Only the flag and the version change.
    const { v: _a, flags: fa, ...restNew } = doc;
    const { v: _b, flags: fb, ...restOld } = old;
    expect(restNew).toEqual(restOld);
    expect({ ...fa, [SUNDIAL_NOTICE_FLAG]: undefined }).toEqual({ ...fb, [SUNDIAL_NOTICE_FLAG]: undefined });
  });

  it('never sets the notice for a save that has not played', () => {
    const fresh = { ...v9(), matchesPlayed: 0 };
    const doc = v10.up!(fresh) as Doc;
    expect(doc.v).toBe(10);
    expect(doc.flags[SUNDIAL_NOTICE_FLAG]).toBeUndefined();
  });

  it('marks only a save that was full at the old cap (28) to restart its period at the first tick', () => {
    const below = v9();
    const b = v10.up!({ ...below, capsules: { ...below.capsules, charges: 27 } }) as Doc;
    expect(b.flags[SUNDIAL_RESTART_FLAG]).toBeUndefined();
    const full = v9();
    const f = v10.up!({ ...full, capsules: { ...full.capsules, charges: 28 } }) as Doc;
    expect(f.flags[SUNDIAL_RESTART_FLAG]).toBe(true);
    expect(f.capsules['charges']).toBe(28);
    expect(validLater(f)).toBe(true);
  });

  it('is idempotent', () => {
    const once = v10.up!(v9()) as Doc;
    const twice = v10.up!(JSON.parse(JSON.stringify({ ...once, v: 9 }))) as Doc;
    expect(twice).toEqual(once);
  });
});
