/**
 * Save v15 (round 2 of the Customize build, PLAN 2a "NEW until seen"): `cosmetics.fresh`, the collection
 * items that came from a capsule, a crate or a reward and have not been shown in Customize yet. It starts
 * empty, so nothing a player already owned suddenly says NEW.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { preMigrationBackupKey, SLOT_KEYS } from '../defaults';
import { migrate, SAVE_VERSION } from '../migrations';
import { v15 } from '../migrations/v15';
import { validateSaveDoc } from '../schema';
import { decodeSlot, encodeEnvelope } from '../slots';
import { currentFixture, makeStore, SAVE_FIXTURES, v1Fixture } from './helpers';

type Doc = SaveDoc & Record<string, unknown>;
const v14 = (): Doc => JSON.parse(JSON.stringify(SAVE_FIXTURES[14])) as Doc;
const up = (d: unknown): Doc => v15.up!(JSON.parse(JSON.stringify(d))) as Doc;

describe('save v15: the NEW pip list', () => {
  it('the frozen v14 fixture gains an empty list and changes nothing else', () => {
    const before = v14();
    const after = up(before);
    expect(after.v).toBe(15);
    expect(after.cosmetics.fresh).toEqual([]);
    expect(after.cosmetics.owned).toEqual(before.cosmetics.owned);
    expect(after.cosmetics.equipped).toEqual(before.cosmetics.equipped);
    expect({ ...after, v: 14, cosmetics: undefined }).toEqual({ ...before, cosmetics: undefined });
  });

  it('migrates the v14 fixture through the real chain and validates; the frozen v15 fixture is that result with one item waiting', () => {
    const m = migrate(v14());
    expect(m).toMatchObject({ ok: true, from: 14, to: SAVE_VERSION });
    if (!m.ok) return;
    const r = validateSaveDoc(m.doc);
    expect(r.ok ? 'ok' : r.issues).toBe('ok');
    const doc = m.doc as SaveDoc;
    // the frozen fixture: a capsule's emote not yet seen in Customize (it is owned)
    expect({ ...doc, cosmetics: { ...doc.cosmetics, fresh: ['emote.clap'] } }).toEqual(SAVE_FIXTURES[15]);
    expect(doc.cosmetics.owned).toContain('emote.clap');
    expect(currentFixture().v).toBe(SAVE_VERSION);
  });

  it('is idempotent and keeps a list a doc already has (a re-run); odd shapes pass to the schema', () => {
    const once = up(v14());
    expect(up(once)).toEqual(once);
    const doc = v14();
    (doc.cosmetics as unknown as Record<string, unknown>)['fresh'] = ['scene.glacier_valley', 7, 'emote.clap'];
    expect(up(doc).cosmetics.fresh).toEqual(['scene.glacier_valley', 'emote.clap']);
    const odd = v14();
    (odd.cosmetics as unknown as Record<string, unknown>)['fresh'] = 'emote.clap';
    expect(up(odd).cosmetics.fresh).toEqual([]);
    expect((v15.up!({ v: 14 }) as Doc).v).toBe(15);
    expect((v15.up!({ v: 14, cosmetics: null }) as Doc).cosmetics).toBeNull();
  });

  it('a save from v1 reaches v15 with nothing NEW', () => {
    const m = migrate(v1Fixture());
    expect(m).toMatchObject({ ok: true, from: 1, to: SAVE_VERSION });
    if (!m.ok) return;
    expect(validateSaveDoc(m.doc).ok).toBe(true);
    expect((m.doc as SaveDoc).cosmetics.fresh).toEqual([]);
  });

  it('the schema takes the list or none (a new save), never anything but strings', () => {
    const doc = currentFixture();
    expect(validateSaveDoc(doc).ok).toBe(true);
    const none = JSON.parse(JSON.stringify(doc)) as Doc;
    delete none.cosmetics.fresh;
    expect(validateSaveDoc(none).ok).toBe(true);
    const bad = { ...doc, cosmetics: { ...doc.cosmetics, fresh: [3] } };
    expect(validateSaveDoc(bad).ok).toBe(false);
  });

  it('loading a v14 slot keeps a pre-v15 backup of it', async () => {
    const { store, storage } = makeStore();
    const old = v14();
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(old), 14, 100));
    const doc = await store.load();
    expect(doc?.v).toBe(SAVE_VERSION);
    expect(doc?.cosmetics.fresh).toEqual([]);
    const pre = decodeSlot('A', storage.getItem(preMigrationBackupKey(15)));
    expect(pre.ok && pre.doc).toEqual(old);
  });
});
