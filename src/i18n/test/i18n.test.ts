import { describe, expect, it } from 'vitest';
import { buildTables, createI18n, flattenStrings, i18n, interpolate } from '../index';

describe('i18n', () => {
  const tables = {
    en: { 'home.play': 'Play', 'road.trophies': '{n} trophies', 'only.en': 'English only' },
    da: { 'home.play': 'Spil', 'road.trophies': '{n} pokaler' },
  };

  it('looks up the current locale and falls back to EN', () => {
    const s = createI18n(tables);
    expect(s.locale).toBe('en');
    expect(s.t('home.play')).toBe('Play');
    s.setLocale('da');
    expect(s.locale).toBe('da');
    expect(s.t('home.play')).toBe('Spil');
    expect(s.t('only.en')).toBe('English only');
    expect(s.has('only.en')).toBe(true);
  });

  it('returns the key for missing strings', () => {
    const s = createI18n(tables);
    expect(s.t('nope.missing')).toBe('nope.missing');
    expect(s.has('nope.missing')).toBe(false);
  });

  it('interpolates params', () => {
    const s = createI18n(tables, 'da');
    expect(s.t('road.trophies', { n: 5 })).toBe('5 pokaler');
    expect(interpolate('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('notifies listeners on locale change', () => {
    const s = createI18n(tables);
    const seen: string[] = [];
    const off = s.onChange((l) => seen.push(l));
    s.setLocale('da');
    s.setLocale('da');
    off();
    s.setLocale('en');
    expect(seen).toEqual(['da']);
  });

  it('flattens nested files and reports duplicates', () => {
    expect(flattenStrings({ a: { b: 'x', c: { d: 'y' } }, n: 1 })).toEqual({ 'a.b': 'x', 'a.c.d': 'y' });
    const dups: string[] = [];
    const t = buildTables(
      {
        './hud.en.json': { default: { hud: { gold: 'Gold' } } },
        './ui.en.json': { default: { 'hud.gold': 'Other' } },
        './ui.da.json': { default: { hud: { gold: 'Guld' } } },
        './notes.json': { default: { x: 'ignored' } },
      },
      (key) => dups.push(key),
    );
    expect(t.en).toEqual({ 'hud.gold': 'Gold' });
    expect(t.da).toEqual({ 'hud.gold': 'Guld' });
    expect(dups).toEqual(['hud.gold']);
  });

  it('exposes a default instance', () => {
    expect(i18n.locale).toBe('en');
    expect(typeof i18n.t('any.key')).toBe('string');
  });
});
