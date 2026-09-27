import { describe, expect, it } from 'vitest';
import { canonicalJson, Fnv1a, fnv1a32, fnv1a32Bytes, hashCanonical, hashHex } from '../hash';

describe('FNV-1a 32', () => {
  // Standard test vectors (Fowler/Noll/Vo reference suite).
  it.each([
    ['', 0x811c9dc5],
    ['a', 0xe40c292c],
    ['b', 0xe70c2de5],
    ['foobar', 0xbf9cf968],
    ['chongo was here!\n', 0xd49930d5],
  ])('fnv1a32(%j)', (input, expected) => {
    expect(fnv1a32(input)).toBe(expected);
  });

  it('hashes strings as UTF-8', () => {
    expect(fnv1a32('é')).toBe(fnv1a32Bytes([0xc3, 0xa9]));
    expect(fnv1a32('\u{1F600}')).toBe(fnv1a32Bytes([0xf0, 0x9f, 0x98, 0x80]));
  });

  it('incremental hasher matches the one-shot hash on bytes', () => {
    const h = new Fnv1a();
    for (const b of [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]) h.byte(b);
    expect(h.value).toBe(0xbf9cf968);
  });

  it('int() feeds 4 little-endian bytes', () => {
    expect(new Fnv1a().int(0x04030201).value).toBe(fnv1a32Bytes([1, 2, 3, 4]));
    expect(new Fnv1a().int(-1).value).toBe(fnv1a32Bytes([255, 255, 255, 255]));
  });

  it('str() is terminated so boundaries matter', () => {
    expect(new Fnv1a().str('ab').str('c').value).not.toBe(new Fnv1a().str('a').str('bc').value);
  });

  it('hashHex pads to 8 digits', () => {
    expect(hashHex(0x1)).toBe('00000001');
    expect(hashHex(0xbf9cf968)).toBe('bf9cf968');
  });
});

describe('canonicalJson', () => {
  it('sorts keys and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: [1, { d: undefined, c: 'x' }] })).toBe('{"a":[1,{"c":"x"}],"b":1}');
  });

  it('is independent of key order', () => {
    expect(hashCanonical({ x: 1, y: 2 })).toBe(hashCanonical({ y: 2, x: 1 }));
    expect(hashCanonical({ x: 1, y: 2 })).not.toBe(hashCanonical({ x: 2, y: 1 }));
  });
});
