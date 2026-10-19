/**
 * Save v16 (queue item 39, the narrator voice): `settings.volume.voice`, the narrator's own bus, and
 * `settings.narrator`, its switch. Older saves get the defaults every new save has (voice 1, narrator on).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { DEFAULT_SETTINGS, preMigrationBackupKey, SLOT_KEYS } from '../defaults';
import { migrate, SAVE_VERSION } from '../migrations';
import { v16, V16_VOICE_DEFAULT } from '../migrations/v16';
import { validateSaveDoc } from '../schema';
import { decodeSlot, encodeEnvelope } from '../slots';
import { currentFixture, makeStore, SAVE_FIXTURES, v1Fixture } from './helpers';

type Doc = SaveDoc & Record<string, unknown>;
const v15 = (): Doc => JSON.parse(JSON.stringify(SAVE_FIXTURES[15])) as Doc;
const up = (d: unknown): Doc => v16.up!(JSON.parse(JSON.stringify(d))) as Doc;

describe('save v16: the narrator voice', () => {
  it('the frozen v15 fixture gains the voice volume and the switch, and nothing else changes', () => {
    const before = v15();
    const after = up(before);
    expect(after.v).toBe(16);
    expect(after.settings.volume).toEqual({ ...before.settings.volume, voice: V16_VOICE_DEFAULT });
    expect(V16_VOICE_DEFAULT).toBe(DEFAULT_SETTINGS.volume.voice);
    expect(after.settings.narrator).toBe(true);
    // the player's own mix stays as it was (the fixture's master 0.8, music 0.45, menus 0.6)
    expect(after.settings.volume.master).toBe(before.settings.volume.master);
    expect(after.settings.volume.ui).toBe(before.settings.volume.ui);
    expect({ ...after, v: 15, settings: undefined }).toEqual({ ...before, settings: undefined });
    const { volume: _a, narrator: _n, ...restAfter } = after.settings;
    const { volume: _b, ...restBefore } = before.settings;
    expect(restAfter).toEqual(restBefore);
  });

  it('migrates the v15 fixture through the real chain and validates; the frozen v16 fixture is that result with the voice turned down', () => {
    const m = migrate(v15());
    expect(m).toMatchObject({ ok: true, from: 15, to: SAVE_VERSION });
    if (!m.ok) return;
    const r = validateSaveDoc(m.doc);
    expect(r.ok ? 'ok' : r.issues).toBe('ok');
    const doc = m.doc as SaveDoc;
    expect(doc.settings.volume.voice).toBe(1);
    // the frozen fixture: the player turned the narrator down to 80% and has heard the first-victory line
    expect({
      ...doc,
      settings: { ...doc.settings, volume: { ...doc.settings.volume, voice: 0.8 } },
      flags: { ...doc.flags, 'narrator.firstVictory': true },
    }).toEqual(SAVE_FIXTURES[16]);
    expect(currentFixture().v).toBe(SAVE_VERSION);
  });

  it('is idempotent and keeps a value a doc already has (a re-run); a broken value becomes the default', () => {
    const once = up(v15());
    expect(up(once)).toEqual(once);
    const kept = v15();
    (kept.settings.volume as unknown as Record<string, unknown>)['voice'] = 0.35;
    (kept.settings as unknown as Record<string, unknown>)['narrator'] = false;
    expect(up(kept).settings.volume.voice).toBe(0.35);
    expect(up(kept).settings.narrator).toBe(false);
    for (const bad of [2, -0.5, 'loud', null, true]) {
      const doc = v15();
      (doc.settings.volume as unknown as Record<string, unknown>)['voice'] = bad;
      (doc.settings as unknown as Record<string, unknown>)['narrator'] = 'yes';
      expect(up(doc).settings.volume.voice).toBe(1);
      expect(up(doc).settings.narrator).toBe(true);
    }
  });

  it('leaves a missing or broken settings or volume to the schema', () => {
    expect((v16.up!({ v: 15 }) as Doc).v).toBe(16);
    expect((v16.up!({ v: 15 }) as Doc).settings).toBeUndefined();
    expect((v16.up!({ v: 15, settings: null }) as Doc).settings).toBeNull();
    const noVolume = v16.up!({ v: 15, settings: { graphics: 'auto', volume: 'loud' } }) as unknown as { settings: Record<string, unknown> };
    expect(noVolume.settings['volume']).toBe('loud');
    expect(noVolume.settings['narrator']).toBe(true);
  });

  it('a save from v1 reaches v16 with the narrator on at full voice volume', () => {
    const m = migrate(v1Fixture());
    expect(m).toMatchObject({ ok: true, from: 1, to: SAVE_VERSION });
    if (!m.ok) return;
    expect(validateSaveDoc(m.doc).ok).toBe(true);
    const doc = m.doc as SaveDoc;
    expect(doc.settings.volume.voice).toBe(1);
    expect(doc.settings.narrator).toBe(true);
  });

  it('the schema fills a missing or invalid voice volume and switch with the defaults', () => {
    const doc = currentFixture();
    expect(validateSaveDoc(doc).ok).toBe(true);
    const none = JSON.parse(JSON.stringify(doc)) as Doc;
    delete (none.settings.volume as Partial<Record<string, number>>)['voice'];
    delete none.settings.narrator;
    const r = validateSaveDoc(none);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.settings.volume.voice).toBe(1);
    const bad = JSON.parse(JSON.stringify(doc)) as Doc;
    (bad.settings.volume as unknown as Record<string, unknown>)['voice'] = 7;
    (bad.settings as unknown as Record<string, unknown>)['narrator'] = 'on';
    const rb = validateSaveDoc(bad);
    expect(rb.ok).toBe(true);
    if (rb.ok) {
      expect(rb.value.settings.volume.voice).toBe(1);
      expect(rb.value.settings.narrator).toBe(true);
    }
  });

  it('loading a v15 slot keeps a pre-v16 backup of it', async () => {
    const { store, storage } = makeStore();
    const old = v15();
    storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify(old), 15, 100));
    const doc = await store.load();
    expect(doc?.v).toBe(SAVE_VERSION);
    expect(doc?.settings.volume.voice).toBe(1);
    expect(doc?.settings.narrator).toBe(true);
    const pre = decodeSlot('A', storage.getItem(preMigrationBackupKey(16)));
    expect(pre.ok && pre.doc).toEqual(old);
  });
});
