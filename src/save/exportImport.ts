/**
 * Save export and import (DESIGN B8 Export/import): JSON → fflate deflate (zlib container) →
 * base64url, behind a short versioned prefix, as a code the player can copy, plus the same code as a
 * `.ageborn` file. Import decodes, checks integrity, migrates and validates, so an old code always
 * loads into a newer build.
 *
 * Code format `ageborn1.<base64url>`: `1` is the code format (not the save version, which lives in
 * the JSON). The zlib Adler-32 is verified, so a mistyped or truncated code is always rejected.
 */
import { strFromU8, strToU8, unzlibSync, zlibSync } from 'fflate';
import type { SaveDoc } from '@/contracts';
import { decodeBase64Url, encodeBase64Url } from './base64url';
import { SAVE_FILE_EXTENSION } from './defaults';
import { migrate, type MigrateFailure, type SaveVersion } from './migrations';
import { validateSaveDoc } from './schema';

export const EXPORT_CODE_PREFIX = 'ageborn1.';

/** Longest code accepted (characters, whitespace removed); a real save is a few KB. */
export const MAX_CODE_LENGTH = 1_000_000;

/** Largest uncompressed save accepted (bytes); guards against decompression bombs. */
export const MAX_SAVE_JSON_BYTES = 4 * 1024 * 1024;

export type ImportFailure =
  /** Nothing pasted. */
  | 'empty'
  /** Not an Ageborn save code (wrong prefix or not base64). */
  | 'notACode'
  /** Damaged: fails to decompress, checksum mismatch, not JSON, or too large. */
  | 'corrupt'
  /** Valid JSON but not a save, or a failed migration. */
  | MigrateFailure
  /** A save that fails the schema after migration. */
  | 'invalid';

export type ImportResult =
  | { ok: true; value: SaveDoc; fromVersion: number }
  | { ok: false; reason: ImportFailure; detail?: string };

/** The Adler-32 of `data` (RFC 1950). */
export function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  const MOD = 65521;
  // 5552 is the largest block for which b cannot overflow 2^53 before the modulo.
  for (let i = 0; i < data.length; ) {
    const end = Math.min(i + 5552, data.length);
    for (; i < end; i += 1) {
      a += data[i]!;
      b += a;
    }
    a %= MOD;
    b %= MOD;
  }
  return ((b << 16) | a) >>> 0;
}

/** Encodes any JSON value as a save code. */
export function encodeSaveCode(doc: unknown): string {
  const packed = zlibSync(strToU8(JSON.stringify(doc)), { level: 9 });
  return EXPORT_CODE_PREFIX + encodeBase64Url(packed);
}

/** Removes whitespace and line breaks that chat apps and e-mail add to long codes. */
export function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '');
}

/**
 * Decodes a save code into its JSON value without migrating or validating it. Plain JSON (text that
 * starts with `{`) is accepted too, for backups made by hand and for the dev page.
 */
export function decodeSaveCode(code: string): { ok: true; json: unknown } | { ok: false; reason: 'empty' | 'notACode' | 'corrupt'; detail?: string } {
  const text = normalizeCode(code);
  if (text === '') return { ok: false, reason: 'empty' };
  if (text.length > MAX_CODE_LENGTH) return { ok: false, reason: 'corrupt', detail: 'too long' };
  if (text.startsWith('{')) {
    try {
      // Parse the original text (spaces inside names matter); `trim` also drops a byte-order mark.
      return { ok: true, json: JSON.parse(code.trim()) as unknown };
    } catch {
      return { ok: false, reason: 'corrupt', detail: 'not JSON' };
    }
  }
  if (text.slice(0, EXPORT_CODE_PREFIX.length).toLowerCase() !== EXPORT_CODE_PREFIX) return { ok: false, reason: 'notACode' };
  const bytes = decodeBase64Url(text.slice(EXPORT_CODE_PREFIX.length));
  if (!bytes) return { ok: false, reason: 'notACode', detail: 'not base64url' };
  if (bytes.length < 6) return { ok: false, reason: 'corrupt', detail: 'too short' };
  let raw: Uint8Array;
  try {
    raw = unzlibSync(bytes, { out: new Uint8Array(MAX_SAVE_JSON_BYTES) });
  } catch (e) {
    return { ok: false, reason: 'corrupt', detail: `inflate: ${String(e)}` };
  }
  if (raw.length >= MAX_SAVE_JSON_BYTES) return { ok: false, reason: 'corrupt', detail: 'too large' };
  const n = bytes.length;
  const stored = ((bytes[n - 4]! << 24) | (bytes[n - 3]! << 16) | (bytes[n - 2]! << 8) | bytes[n - 1]!) >>> 0;
  if (adler32(raw) !== stored) return { ok: false, reason: 'corrupt', detail: 'checksum' };
  try {
    return { ok: true, json: JSON.parse(strFromU8(raw)) as unknown };
  } catch {
    return { ok: false, reason: 'corrupt', detail: 'not JSON' };
  }
}

export interface ImportOptions {
  /** Version chain (tests); default `SAVE_VERSIONS`. */
  versions?: readonly SaveVersion[];
}

/** Migrates and validates a decoded save value (DESIGN B8: import validates and migrates). */
export function importSaveValue(json: unknown, o: ImportOptions = {}): ImportResult {
  const migrated = migrate(json, { versions: o.versions });
  if (!migrated.ok) return { ok: false, reason: migrated.reason, detail: migrated.detail };
  const valid = validateSaveDoc(migrated.doc, migrated.to);
  if (!valid.ok) return { ok: false, reason: 'invalid', detail: valid.issues.join('; ') };
  return { ok: true, value: valid.value, fromVersion: migrated.from };
}

/** Decodes, migrates and validates a pasted code or the text of a `.ageborn` file. */
export function importSaveCode(code: string, o: ImportOptions = {}): ImportResult {
  const decoded = decodeSaveCode(code);
  if (!decoded.ok) return { ok: false, reason: decoded.reason, detail: decoded.detail };
  return importSaveValue(decoded.json, o);
}

/** A save file ready to download (the browser helper turns it into a Blob). */
export interface SaveFile {
  name: string;
  mime: string;
  text: string;
}

function datePart(nowMs: number): string {
  // The UTC calendar date is fine for a file name.
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** The `.ageborn` file: the export code on one line, so a file and a pasted code import the same way. */
export function saveFileFor(doc: SaveDoc, nowMs: number): SaveFile {
  return { name: `ageborn-${datePart(nowMs)}${SAVE_FILE_EXTENSION}`, mime: 'text/plain', text: `${encodeSaveCode(doc)}\n` };
}
