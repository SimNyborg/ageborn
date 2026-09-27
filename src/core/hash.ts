/**
 * FNV-1a 32-bit hashing (DESIGN B3 state hash, B4 contentHash, B8 save checksum).
 * Strings are hashed as UTF-8 bytes. Integers are hashed as 4 little-endian bytes.
 */

export const FNV_OFFSET = 0x811c9dc5;
export const FNV_PRIME = 0x01000193;

/** Incremental FNV-1a hasher. `value` is always an unsigned 32-bit integer. */
export class Fnv1a {
  private h: number = FNV_OFFSET;

  /** Feeds one byte (0-255). */
  byte(b: number): this {
    this.h = Math.imul(this.h ^ (b & 0xff), FNV_PRIME);
    return this;
  }

  /** Feeds a 32-bit integer as 4 little-endian bytes (signed or unsigned input). */
  int(n: number): this {
    const v = n | 0;
    this.byte(v);
    this.byte(v >>> 8);
    this.byte(v >>> 16);
    this.byte(v >>> 24);
    return this;
  }

  /** Feeds a boolean as one byte. */
  bool(b: boolean): this {
    return this.byte(b ? 1 : 0);
  }

  /** Feeds a string as UTF-8 bytes, followed by a 0 terminator so ("ab","c") differs from ("a","bc"). */
  str(s: string): this {
    utf8Each(s, (b) => this.byte(b));
    return this.byte(0);
  }

  /** The current hash as an unsigned 32-bit integer. */
  get value(): number {
    return this.h >>> 0;
  }
}

/** Calls `emit` for each UTF-8 byte of `s` (lone surrogates become U+FFFD). */
export function utf8Each(s: string, emit: (b: number) => void): void {
  for (let i = 0; i < s.length; i += 1) {
    let c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i += 1;
      } else c = 0xfffd;
    } else if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd;
    if (c < 0x80) emit(c);
    else if (c < 0x800) {
      emit(0xc0 | (c >> 6));
      emit(0x80 | (c & 63));
    } else if (c < 0x10000) {
      emit(0xe0 | (c >> 12));
      emit(0x80 | ((c >> 6) & 63));
      emit(0x80 | (c & 63));
    } else {
      emit(0xf0 | (c >> 18));
      emit(0x80 | ((c >> 12) & 63));
      emit(0x80 | ((c >> 6) & 63));
      emit(0x80 | (c & 63));
    }
  }
}

/** FNV-1a 32 of the UTF-8 bytes of `s` (no terminator; matches the standard test vectors). */
export function fnv1a32(s: string): number {
  let h = FNV_OFFSET;
  utf8Each(s, (b) => {
    h = Math.imul(h ^ b, FNV_PRIME);
  });
  return h >>> 0;
}

/** FNV-1a 32 of a byte array. */
export function fnv1a32Bytes(bytes: ArrayLike<number>): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i += 1) h = Math.imul(h ^ ((bytes[i] ?? 0) & 0xff), FNV_PRIME);
  return h >>> 0;
}

/** Formats an unsigned 32-bit hash as 8 lowercase hex digits. */
export function hashHex(h: number): string {
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Canonical JSON: object keys sorted, undefined properties dropped, no whitespace.
 * Use it for content hashes and save checksums so key order never changes a hash.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const s = JSON.stringify(value);
    return s === undefined ? 'null' : s;
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of Object.keys(obj).sort()) {
    const v = obj[k];
    if (v === undefined || typeof v === 'function') continue;
    parts.push(`${JSON.stringify(k)}:${canonicalJson(v)}`);
  }
  return `{${parts.join(',')}}`;
}

/** FNV-1a 32 of the canonical JSON of `value`, as 8 hex digits. */
export function hashCanonical(value: unknown): string {
  return hashHex(fnv1a32(canonicalJson(value)));
}
