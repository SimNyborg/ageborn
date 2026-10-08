/**
 * Save v14 (PLAN 2e "Save migration v14"; owner requests 2026-10-08, items 20 and 21): the scene per age
 * (`cosmetics.equipped.scenes`, `{}` = every age on its classic scene) and one base skin per age across
 * both skin systems (a troop-system base skin, Crystal Spire, wins a double equip; nothing is taken away).
 */
import { describe, expect, it } from 'vitest';
import type { ReplayDoc, SaveDoc } from '@/contracts';
import { preMigrationBackupKey, SLOT_KEYS } from '../defaults';
import { migrate, SAVE_VERSION } from '../migrations';
import { v14 } from '../migrations/v14';
import { validateReplay } from '../replaySchema';
import { validateSaveDoc } from '../schema';
import { decodeSlot, encodeEnvelope } from '../slots';
import { currentFixture, goldenReplays, makeStore, SAVE_FIXTURES, v1Fixture } from './helpers';

type Doc = SaveDoc & Record<string, unknown>;
const v13 = (): Doc => JSON.parse(JSON.stringify(SAVE_FIXTURES[13])) as Doc;
const up = (d: unknown): Doc => v14.up!(JSON.parse(JSON.stringify(d))) as Doc;

describe('save v14: scenes per age (PLAN 2b)', () => {
  it('the frozen v13 fixture gains the classic scenes and changes nothing else', () => {
    const before = v13();
    const after = up(before);
    expect(after.v).toBe(14);
    expect(after.cosmetics.equipped.scenes).toEqual({});
    const { scenes: _s, ...rest } = after.cosmetics.equipped;
    expect(rest).toEqual(before.cosmetics.equipped);
    expect({ ...after, v: 13, cosmetics: undefined }).toEqual({ ...before, cosmetics: undefined });
    expect(after.cosmetics.owned).toEqual(before.cosmetics.owned);
    // the legacy national flag (now bought with Dust) stays owned and flown (PLAN 2g Track D #9)
    expect(after.cosmetics.owned).toContain('nationalFlag.dk');
    expect(after.cosmetics.equipped.nationalFlag).toBe('nationalFlag.dk');
    // the backdrop stays: it is shown as the Sky for every age
    expect(after.cosmetics.equipped.backdrop).toBe(before.cosmetics.equipped.backdrop);
  });

  it('migrates the v13 fixture through the real chain and validates; the frozen v14 fixture is that result', () => {
    const m = migrate(v13());
    expect(m).toMatchObject({ ok: true, from: 13, to: SAVE_VERSION });
    if (!m.ok) return;
    const r = validateSaveDoc(m.doc);
    expect(r.ok ? 'ok' : r.issues).toBe('ok');
    expect(m.doc).toEqual(SAVE_FIXTURES[14]);
    expect(currentFixture().v).toBe(SAVE_VERSION);
  });

  it('is idempotent and keeps scenes a doc already has (a re-run)', () => {
    const once = up(v13());
    expect(up(once)).toEqual(once);
    const doc = v13();
    (doc.cosmetics.equipped as unknown as Record<string, unknown>)['scenes'] = { stone: 'scene.glacier_valley' };
    expect(up(doc).cosmetics.equipped.scenes).toEqual({ stone: 'scene.glacier_valley' });
    // odd shapes pass through to the schema
    expect((v14.up!({ v: 13 }) as Doc).v).toBe(14);
    expect((v14.up!({ v: 13, cosmetics: { owned: [], equipped: null } }) as Doc).cosmetics.equipped).toBeNull();
    const broken = up({ ...v13(), cosmetics: { owned: [], equipped: { ...v13().cosmetics.equipped, scenes: ['scene.x'] } } });
    expect(broken.cosmetics.equipped.scenes).toEqual({});
  });

  it('a save from v1 reaches v14 with the classic scenes', () => {
    const m = migrate(v1Fixture());
    expect(m).toMatchObject({ ok: true, from: 1, to: SAVE_VERSION });
    if (!m.ok) return;
    expect(validateSaveDoc(m.doc).ok).toBe(true);
    expect((m.doc as SaveDoc).cosmetics.equipped.scenes).toEqual({});
  });

  it('the schema requires the scenes from v14 on and checks their ages, not their keys', () => {
    const doc = currentFixture();
    expect(validateSaveDoc(doc).ok).toBe(true);
    const missing = JSON.parse(JSON.stringify(doc)) as Doc;
    delete (missing.cosmetics.equipped as Partial<SaveDoc['cosmetics']['equipped']>).scenes;
    expect(validateSaveDoc(missing).ok).toBe(false);
    const known = { ...doc, cosmetics: { ...doc.cosmetics, equipped: { ...doc.cosmetics.equipped, scenes: { stone: 'scene.not_in_any_content' } } } };
    expect(validateSaveDoc(known).ok).toBe(true);
    const badAge = { ...doc, cosmetics: { ...doc.cosmetics, equipped: { ...doc.cosmetics.equipped, scenes: { atlantis: 'scene.x' } } } };
    expect(validateSaveDoc(badAge).ok).toBe(false);
  });

  it('loading a v13 slot keeps a pre-v14 backup of it', async () => {
    const { store, storage } = makeStore();
    const old = v13();
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(old), 13, 100));
    const doc = await store.load();
    expect(doc?.v).toBe(SAVE_VERSION);
    expect(doc?.cosmetics.equipped.scenes).toEqual({});
    const pre = decodeSlot('A', storage.getItem(preMigrationBackupKey(14)));
    expect(pre.ok && pre.doc).toEqual(old);
  });
});

describe('save v14: one base skin per age (PLAN 2c)', () => {
  const doubled = (): Doc => {
    const d = v13();
    d.skins = { owned: [...d.skins.owned, 'crystal_spire'], equipped: { ...d.skins.equipped, 'base.future': 'crystal_spire' } };
    d.cosmetics = {
      owned: [...d.cosmetics.owned, 'baseSkin.midnight_neon'],
      equipped: { ...d.cosmetics.equipped, baseSkins: { stone: 'baseSkin.frost_cave', future: 'baseSkin.midnight_neon' } },
    };
    return d;
  };

  it('Crystal Spire and a cosmetic Future skin: the cosmetic equip goes, both stay owned', () => {
    const before = doubled();
    const after = up(before);
    expect(after.skins).toEqual(before.skins);
    expect(after.skins.equipped['base.future']).toBe('crystal_spire');
    expect(after.cosmetics.equipped.baseSkins).toEqual({ stone: 'baseSkin.frost_cave' });
    expect(after.cosmetics.owned).toEqual(before.cosmetics.owned);
    expect(after.cosmetics.owned).toContain('baseSkin.midnight_neon');
    const m = migrate(before);
    expect(m.ok && validateSaveDoc(m.doc).ok).toBe(true);
    expect(up(after)).toEqual(after);
  });

  it('keeps a cosmetic base skin when that base wears no troop skin', () => {
    const d = v13();
    d.cosmetics = { ...d.cosmetics, equipped: { ...d.cosmetics.equipped, baseSkins: { future: 'baseSkin.midnight_neon' } } };
    d.skins = { ...d.skins, equipped: { ...d.skins.equipped, bonker: 'pumpkin_head' } };
    expect(up(d).cosmetics.equipped.baseSkins).toEqual({ future: 'baseSkin.midnight_neon' });
  });
});

describe('replays (PLAN 2e: the optional SideLook.scenes)', () => {
  it('keeps the scenes a side showed; replays recorded before (none) stay valid', () => {
    const [base] = goldenReplays();
    expect(base).toBeTruthy();
    if (!base) return;
    const look = { baseFlag: 'baseFlag.ember', scenes: { stone: 'scene.glacier_valley', medieval: 'scene.misty_moor' } };
    const r: ReplayDoc = { ...base, sides: [{ ...base.sides[0], look }, base.sides[1]] };
    const res = validateReplay(r);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.sides[0].look?.scenes).toEqual(look.scenes);
    expect(validateReplay(base).ok).toBe(true);
    const bad: ReplayDoc = { ...base, sides: [{ ...base.sides[0], look: { scenes: { atlantis: 'scene.x' } as never } }, base.sides[1]] };
    const kept = validateReplay(bad);
    // unknown ages are stripped (presentation only), never a reason to drop the replay
    expect(kept.ok && kept.value.sides[0].look?.scenes).toEqual({});
  });
});
