import fc from 'fast-check';
import { strToU8, zlibSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { decodeBase64Url, encodeBase64Url } from '../base64url';
import {
  adler32,
  decodeSaveCode,
  encodeSaveCode,
  EXPORT_CODE_PREFIX,
  importSaveCode,
  MAX_SAVE_JSON_BYTES,
  saveFileFor,
} from '../exportImport';
import { IMPORT_MESSAGE_KEYS } from '../notices';
import { makeStore, v1Fixture } from './helpers';
import frozenV1Code from './fixtures/v1.code.txt?raw';

describe('base64url (RFC 4648 §5, no padding)', () => {
  const enc = (s: string) => encodeBase64Url(strToU8(s));

  it('matches the RFC 4648 test vectors', () => {
    expect(['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar'].map(enc)).toEqual(['', 'Zg', 'Zm8', 'Zm9v', 'Zm9vYg', 'Zm9vYmE', 'Zm9vYmFy']);
  });

  it('uses - and _ and accepts + / and = padding when decoding', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf]);
    expect(encodeBase64Url(bytes)).toBe('-_-_');
    expect(decodeBase64Url('+/+/')).toEqual(bytes);
    expect(decodeBase64Url('Zm8=')).toEqual(strToU8('fo'));
  });

  it('rejects impossible input', () => {
    expect(decodeBase64Url('Zm9v!')).toBeNull();
    expect(decodeBase64Url('Z')).toBeNull();
    expect(decodeBase64Url('Zmé')).toBeNull();
  });

  it('round-trips any bytes', () => {
    fc.assert(fc.property(fc.uint8Array({ maxLength: 300 }), (bytes) => {
      expect(decodeBase64Url(encodeBase64Url(bytes))).toEqual(bytes);
    }));
  });
});

describe('Adler-32', () => {
  it('matches the known vectors', () => {
    expect(adler32(new Uint8Array(0))).toBe(1);
    expect(adler32(strToU8('Wikipedia'))).toBe(0x11e60398);
    // Long input exercises the block-wise modulo.
    expect(adler32(new Uint8Array(100_000).fill(255))).toBe(0x149a302c);
  });
});

describe('export codes (DESIGN B8 Export/import)', () => {
  it('round-trip a save exactly', () => {
    const doc = v1Fixture();
    const code = encodeSaveCode(doc);
    expect(code.startsWith(EXPORT_CODE_PREFIX)).toBe(true);
    expect(code.slice(EXPORT_CODE_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(JSON.stringify(doc).length / 2); // deflate pays off
    expect(importSaveCode(code)).toEqual({ ok: true, value: doc, fromVersion: 1 });
  });

  it('the frozen v1 code imports in this build (codes stay valid across releases)', () => {
    expect(importSaveCode(frozenV1Code)).toEqual({ ok: true, value: v1Fixture(), fromVersion: 1 });
  });

  it('survives line breaks, spaces and a capitalised prefix from copy and paste', () => {
    const code = encodeSaveCode(v1Fixture());
    const mangled = ` ${code.slice(0, 9).toUpperCase()}\n${code.slice(9, 50)}\r\n  ${code.slice(50)}\n`;
    expect(importSaveCode(mangled).ok).toBe(true);
  });

  it('accepts a plain JSON save (hand-made backups, the dev page)', () => {
    const r = importSaveCode(JSON.stringify(v1Fixture(), null, 2));
    expect(r).toEqual({ ok: true, value: v1Fixture(), fromVersion: 1 });
  });

  it('rejects damaged or foreign codes with a reason and a message key', () => {
    const code = encodeSaveCode(v1Fixture());
    const flip = (i: number) => code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1);
    const cases: [string, string][] = [
      ['', 'empty'],
      ['   \n', 'empty'],
      ['hello there', 'notACode'],
      ['ageborn1.***', 'notACode'],
      [code.slice(0, 40), 'corrupt'],
      [code.slice(0, -3), 'corrupt'],
      [flip(Math.floor(code.length / 2)), 'corrupt'],
      [flip(code.length - 2), 'corrupt'],
      ['{"v":1,', 'corrupt'],
      [encodeSaveCode([1, 2, 3]), 'notASave'],
      [encodeSaveCode({ ...v1Fixture(), v: 42 }), 'tooNew'],
      [encodeSaveCode({ ...v1Fixture(), warPlans: [] }), 'invalid'],
    ];
    for (const [input, reason] of cases) {
      const r = importSaveCode(input);
      expect({ input: input.slice(0, 20), reason: r.ok ? 'ok' : r.reason }).toEqual({ input: input.slice(0, 20), reason });
      if (!r.ok) expect(IMPORT_MESSAGE_KEYS[r.reason]).toMatch(/^save\.import\./);
    }
  });

  it('refuses decompression bombs', () => {
    const huge = `{"v":1,"pad":"${'a'.repeat(MAX_SAVE_JSON_BYTES)}"}`;
    const code = EXPORT_CODE_PREFIX + encodeBase64Url(zlibSync(strToU8(huge), { level: 9 }));
    expect(code.length).toBeLessThan(20_000);
    expect(decodeSaveCode(code)).toMatchObject({ ok: false, reason: 'corrupt', detail: 'too large' });
  });
});

describe('.ageborn files', () => {
  it('hold the export code on one line under a dated name', () => {
    const f = saveFileFor(v1Fixture(), Date.UTC(2026, 8, 27, 12));
    expect(f.name).toBe('ageborn-2026-09-27.ageborn');
    expect(f.mime).toBe('text/plain');
    expect(f.text).toBe(`${encodeSaveCode(v1Fixture())}\n`);
  });

  it('import through the store like a pasted code', () => {
    const { store } = makeStore();
    const file = store.exportFile(v1Fixture());
    expect(file.name).toMatch(/^ageborn-\d{4}-\d{2}-\d{2}\.ageborn$/);
    expect(store.importFile(file.text)).toEqual({ ok: true, value: v1Fixture(), fromVersion: 1 });
    expect(store.importCode(store.exportCode(v1Fixture()))).toMatchObject({ ok: true });
  });

  it('importing stores nothing by itself', () => {
    const { store, storage } = makeStore();
    store.importCode(store.exportCode(v1Fixture()));
    expect(storage.length).toBe(0);
  });
});
