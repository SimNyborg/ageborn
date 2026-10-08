/**
 * Save v8 (DESIGN A18.9.4 "Backdrops", owner request 2026-09-30): `cosmetics.equipped.backdrop`.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { migrate, SAVE_VERSION } from '../migrations';
import { v8 } from '../migrations/v8';
import { validateSaveDoc } from '../schema';
import { currentFixture, SAVE_FIXTURES } from './helpers';

describe('v7 → v8: the battle backdrop skin', () => {
  it('adds the classic sky (null) and changes nothing else', () => {
    const old = JSON.parse(JSON.stringify(SAVE_FIXTURES[7])) as SaveDoc;
    const m = migrate(old);
    if (!m.ok) throw new Error(m.reason);
    const doc = m.doc as SaveDoc;
    expect(doc.v).toBe(SAVE_VERSION);
    expect(doc.cosmetics.equipped.backdrop).toBeNull();
    expect(doc.cosmetics.owned).toEqual(old.cosmetics.owned);
    // (v14 then adds the scenes, every age on its classic one)
    const { backdrop: _b, scenes: _s, ...rest } = doc.cosmetics.equipped;
    expect(_s).toEqual({});
    expect(rest).toEqual(old.cosmetics.equipped);
    expect(validateSaveDoc(doc).ok).toBe(true);
  });

  it('keeps a backdrop that is already there (a re-run is harmless)', () => {
    const doc = JSON.parse(JSON.stringify(SAVE_FIXTURES[7])) as Record<string, unknown> & { cosmetics: { equipped: Record<string, unknown> } };
    doc.cosmetics.equipped['backdrop'] = 'backdrop.eclipse';
    const out = v8.up!(doc) as SaveDoc;
    expect(out.v).toBe(8);
    expect(out.cosmetics.equipped.backdrop).toBe('backdrop.eclipse');
  });

  it('the schema requires the field from v8 on', () => {
    const doc = currentFixture();
    expect(validateSaveDoc(doc).ok).toBe(true);
    delete (doc.cosmetics.equipped as Partial<SaveDoc['cosmetics']['equipped']>).backdrop;
    expect(validateSaveDoc(doc).ok).toBe(false);
  });
});
