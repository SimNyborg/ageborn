/**
 * The save system's player-facing messages (DESIGN B8 Durability and Load order step 5, C2/WP8 DoD:
 * "quota errors are caught with a user-facing message").
 *
 * The save layer cannot import i18n (B2), so its notices carry keys. Until the integration lead adds
 * the string file requested in `docs/requests/wp8-strings.md`, the request itself must hold EN text for
 * every key; once any save key is in `src/i18n`, all of them must be.
 */
import { describe, expect, it } from 'vitest';
import { flattenStrings, stringTables } from '@/i18n';
import { IMPORT_MESSAGE_KEYS, SAVE_MESSAGE_KEYS } from '../notices';

const KEYS = [...new Set([...Object.values(SAVE_MESSAGE_KEYS), ...Object.values(IMPORT_MESSAGE_KEYS)])].sort();

const request = Object.values(
  import.meta.glob<string>('../../../docs/requests/wp8-strings.md', { query: '?raw', import: 'default', eager: true }),
)[0];

/** EN text per key: from `src/i18n` once the file landed, else from the pending request. */
function englishStrings(): { source: string; strings: Record<string, string> } {
  const en = stringTables.en ?? {};
  if (KEYS.some((k) => k in en)) return { source: 'src/i18n', strings: en };
  if (request === undefined) return { source: 'nowhere', strings: {} };
  const json = /```json\n([\s\S]*?)\n```/.exec(request)?.[1];
  return { source: 'docs/requests/wp8-strings.md', strings: json ? flattenStrings(JSON.parse(json)) : {} };
}

describe('save messages have EN text', () => {
  const { source, strings } = englishStrings();

  it('for every notice and import message key', () => {
    expect({ source, missing: KEYS.filter((k) => !/\p{L}/u.test(strings[k] ?? '')) }).toEqual({ source, missing: [] });
  });

  it('the unreadable banner uses the DESIGN B8 wording', () => {
    expect(strings[SAVE_MESSAGE_KEYS.unreadable]).toBe('Save could not be read. Import a backup?');
  });
});
