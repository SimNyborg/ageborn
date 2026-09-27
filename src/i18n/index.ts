/**
 * i18n loader with EN fallback (DESIGN B4 Strings, B15 i18n.ts).
 *
 * String files live next to this module as `<namespace>.<locale>.json`, for example
 * `ui.en.json`, `hud.en.json`, `content.en.json`. They are discovered with `import.meta.glob`, so
 * adding a file needs no registry edit. Nested objects are flattened with dots:
 * `{ "home": { "play": "Play" } }` in any file gives the key `home.play`.
 * Keys are global across files; each work package prefixes its own keys to avoid clashes.
 *
 * Lookup order: current locale, then EN, then the key itself (so a missing string is visible).
 * Parameters use `{name}` placeholders: `t('road.trophies', { n: 5 })` with "{n} trophies".
 */
import type { I18n, Locale } from '@/contracts';

export type { I18n, Locale };

/** A flat key -> string table for one locale. */
export type StringTable = Record<string, string>;

/** Tables per locale. EN is the fallback and should be complete. */
export type StringTables = Partial<Record<Locale, StringTable>>;

export const LOCALES: readonly Locale[] = ['en', 'da'];
export const FALLBACK_LOCALE: Locale = 'en';

/** Extended I18n with a change listener, for UI code that re-renders on locale change. */
export interface I18nService extends I18n {
  /** Subscribes to locale changes. Returns an unsubscribe function. */
  onChange(listener: (locale: Locale) => void): () => void;
  /** Every key known in the fallback locale (for integrity tests). */
  keys(): string[];
}

function isLocale(s: string): s is Locale {
  return (LOCALES as readonly string[]).includes(s);
}

/** Flattens nested JSON objects into dot keys. Non-string leaves are ignored. */
export function flattenStrings(obj: unknown, prefix = '', out: StringTable = {}): StringTable {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const k of Object.keys(obj).sort()) {
    const v = (obj as Record<string, unknown>)[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (v !== null && typeof v === 'object') flattenStrings(v, key, out);
  }
  return out;
}

/** Replaces `{name}` placeholders. Unknown placeholders are left as they are. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : String(v);
  });
}

/** Creates an I18n over explicit tables (pure; used by tests and headless tools). */
export function createI18n(tables: StringTables, locale: Locale = FALLBACK_LOCALE): I18nService {
  let current: Locale = locale;
  const listeners = new Set<(l: Locale) => void>();
  const lookup = (key: string): string | undefined =>
    tables[current]?.[key] ?? tables[FALLBACK_LOCALE]?.[key];
  return {
    get locale() {
      return current;
    },
    setLocale(l: Locale) {
      if (l === current) return;
      current = l;
      for (const fn of listeners) fn(l);
    },
    t(key, params) {
      return interpolate(lookup(key) ?? key, params);
    },
    has(key) {
      return lookup(key) !== undefined;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    keys() {
      return Object.keys(tables[FALLBACK_LOCALE] ?? {}).sort();
    },
  };
}

/**
 * Builds tables from modules keyed by file path (`./ui.en.json` -> namespace ui, locale en).
 * Files whose name does not end in a known locale are ignored. Later files never override
 * earlier keys silently: duplicates are reported through `onDuplicate`.
 */
export function buildTables(
  files: Record<string, unknown>,
  onDuplicate?: (key: string, locale: Locale, file: string) => void,
): StringTables {
  const tables: StringTables = {};
  for (const path of Object.keys(files).sort()) {
    const m = /([^/]+)\.([a-z]{2})\.json$/.exec(path);
    const loc = m?.[2];
    if (!loc || !isLocale(loc)) continue;
    const mod = files[path];
    const data = mod !== null && typeof mod === 'object' && 'default' in mod ? (mod as { default: unknown }).default : mod;
    const table = (tables[loc] ??= {});
    const flat = flattenStrings(data);
    for (const key of Object.keys(flat)) {
      if (key in table) onDuplicate?.(key, loc, path);
      else table[key] = flat[key] as string;
    }
  }
  return tables;
}

const files = import.meta.glob<unknown>('./*.*.json', { eager: true });

/** All string tables found in `src/i18n`. */
export const stringTables: StringTables = buildTables(files, (key, loc, file) => {
  if (import.meta.env.DEV) console.warn(`[i18n] duplicate key "${key}" (${loc}) in ${file}`);
});

/** The app-wide I18n instance, starting in EN. The app sets the saved locale at boot. */
export const i18n: I18nService = createI18n(stringTables, FALLBACK_LOCALE);

/** Shorthand for `i18n.t`. */
export const t = (key: string, params?: Record<string, string | number>): string => i18n.t(key, params);
