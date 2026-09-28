import { describe, expect, it } from 'vitest';
import { checksum } from '../checksum';
import { SLOT_KEYS } from '../defaults';
import { decodeSlot, encodeEnvelope, newestFirst, otherSlot, readSlots } from '../slots';
import { MemoryStorage } from '../storage';

describe('checksum (FNV-1a 32 of the payload)', () => {
  it('matches the standard FNV-1a test vectors', () => {
    expect(checksum('')).toBe(0x811c9dc5);
    expect(checksum('a')).toBe(0xe40c292c);
    expect(checksum('foobar')).toBe(0xbf9cf968);
  });

  it('hashes UTF-8 bytes, so non-ASCII names are covered', () => {
    expect(checksum('Høvding')).not.toBe(checksum('Hovding'));
  });
});

describe('slot envelopes', () => {
  const payload = JSON.stringify({ v: 1, name: 'Chief-4821' });

  it('round-trip { v, writtenAt, checksum, payload }', () => {
    const text = encodeEnvelope(payload, 1, 1234);
    expect(JSON.parse(text)).toEqual({ v: 1, writtenAt: 1234, checksum: checksum(payload), payload });
    const r = decodeSlot('A', text);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc).toEqual({ v: 1, name: 'Chief-4821' });
      expect(r.envelope.writtenAt).toBe(1234);
    }
  });

  it('reports a missing slot', () => {
    expect(decodeSlot('B', null)).toMatchObject({ ok: false, defect: 'missing' });
  });

  it('reports unparsable text or a wrong shape as corrupt', () => {
    expect(decodeSlot('A', '{"v":1,"writ')).toMatchObject({ ok: false, defect: 'corrupt' });
    expect(decodeSlot('A', '[1,2,3]')).toMatchObject({ ok: false, defect: 'corrupt' });
    expect(decodeSlot('A', JSON.stringify({ v: 1, writtenAt: 1, checksum: 1, payload: 5 }))).toMatchObject({ ok: false, defect: 'corrupt' });
  });

  it('reports any change to the payload as a checksum failure', () => {
    const env = JSON.parse(encodeEnvelope(payload, 1, 1)) as { payload: string };
    env.payload = env.payload.replace('4821', '4822');
    expect(decodeSlot('A', JSON.stringify(env))).toMatchObject({ ok: false, defect: 'checksum' });
  });

  it('orders valid slots newest first, slot A first on a tie', () => {
    const s = new MemoryStorage();
    s.setItem(SLOT_KEYS.A, encodeEnvelope(payload, 1, 10));
    s.setItem(SLOT_KEYS.B, encodeEnvelope(payload, 1, 20));
    expect(newestFirst(readSlots(s)).map((r) => r.slot)).toEqual(['B', 'A']);
    s.setItem(SLOT_KEYS.B, encodeEnvelope(payload, 1, 10));
    expect(newestFirst(readSlots(s)).map((r) => r.slot)).toEqual(['A', 'B']);
    s.setItem(SLOT_KEYS.A, 'garbage');
    expect(newestFirst(readSlots(s)).map((r) => r.slot)).toEqual(['B']);
  });

  it('treats a storage that throws on read as empty', () => {
    const throwing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {}, removeItem: () => {} };
    expect(readSlots(throwing).map((r) => (r.ok ? 'ok' : r.defect))).toEqual(['missing', 'missing']);
  });

  it('alternates A and B', () => {
    expect(otherSlot('A')).toBe('B');
    expect(otherSlot('B')).toBe('A');
  });
});
