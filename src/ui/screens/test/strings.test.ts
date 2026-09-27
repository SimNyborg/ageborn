/**
 * EN strings are complete (DESIGN C2/WP9 DoD): every `ui.*` key the UI source uses exists in
 * `src/i18n/ui.en.json`, every key in that file is used (the `ui.advisor.*` keys are the message
 * keys meta returns in `PlanIssue.messageKey`), and the file only holds `ui.*` keys.
 * UI code writes keys as whole string literals so this check can see them.
 */
import { flattenStrings } from '@/i18n';
import { describe, expect, it } from 'vitest';
import uiStrings from '../../../i18n/ui.en.json';

const sources = import.meta.glob<string>(['/src/ui/**/*.ts', '/src/ui/**/*.tsx', '!/src/ui/hud/**', '!/src/ui/**/test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const KEY = /['"`](ui\.[A-Za-z0-9_.]+)['"`]/g;

function usedKeys(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [file, src] of Object.entries(sources)) {
    for (const m of src.matchAll(KEY)) out.set(m[1]!, file);
  }
  return out;
}

describe('ui.en.json', () => {
  const table = flattenStrings(uiStrings);
  const used = usedKeys();

  it('scans the WP9 sources', () => {
    expect(Object.keys(sources)).toContain('/src/ui/router.ts');
    expect(Object.keys(sources).some((f) => f.includes('screens/home/'))).toBe(true);
    expect(Object.keys(sources).some((f) => f.includes('/hud/'))).toBe(false);
    expect(used.size).toBeGreaterThan(200);
  });

  it('has every key the UI uses', () => {
    const missing = [...used.keys()].filter((k) => !(k in table)).map((k) => `${k} (${used.get(k)})`);
    expect(missing).toEqual([]);
  });

  it('has no unused keys (advisor keys are for meta)', () => {
    const unused = Object.keys(table).filter((k) => !used.has(k) && !k.startsWith('ui.advisor.'));
    expect(unused).toEqual([]);
  });

  it('keeps every key under ui.*', () => {
    expect(Object.keys(table).every((k) => k.startsWith('ui.'))).toBe(true);
  });

  it('has no empty strings', () => {
    expect(Object.entries(table).filter(([, v]) => v.trim() === '')).toEqual([]);
  });
});
