/**
 * Honest copy and no reel (DESIGN A15.3, A15.20; docs/requests/a15-wp12-tests.md).
 *
 * - No string file carries the forbidden pressure copy of A15.3 rule 4 ("we missed you", "last
 *   chance", and the two "away" lines A15 rewrote).
 * - The capsule show imports no `reel` module (the reel is gone, A15.3), and the platform does not
 *   offer a reel reveal.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { NonePlatform } from '../../src/platform';
import { parse, productionFiles, rel, SRC } from './helpers/source';

const FORBIDDEN = ["nothing is lost while you're away", 'everything waits for you', 'we missed you', 'last chance'];

function strings(value: unknown, out: string[]): void {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value !== null && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
}

describe('honest copy (A15.3)', () => {
  it('no string file uses the forbidden pressure copy', () => {
    const dir = path.join(SRC, 'i18n');
    const hits: string[] = [];
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      const all: string[] = [];
      strings(JSON.parse(readFileSync(path.join(dir, f), 'utf8')), all);
      for (const s of all) {
        const low = s.toLowerCase().replace(/’/g, "'");
        for (const bad of FORBIDDEN) if (low.includes(bad)) hits.push(`${f}: ${s}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('A15.3 strings', () => {
  const load = (f: string): Record<string, unknown> => JSON.parse(readFileSync(path.join(SRC, 'i18n', f), 'utf8')) as Record<string, unknown>;
  const at = (o: unknown, key: string): unknown => key.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), o);
  const HONEST = 'The result was decided when you earned this capsule. Tapping only reveals it.';

  it('every odds panel uses the one honesty line', () => {
    expect(at(load('ui.en.json'), 'ui.odds.honest')).toBe(HONEST);
    expect(at(load('capsule.en.json'), 'capsule.honesty')).toBe(HONEST);
  });

  it('the Supply Capsule is never called the Daily Capsule (A15.4)', () => {
    const all: string[] = [];
    for (const f of readdirSync(path.join(SRC, 'i18n')).filter((n) => n.endsWith('.json'))) strings(load(f), all);
    expect(all.filter((s) => /daily capsule/i.test(s))).toEqual([]);
    expect(at(load('content.en.json'), 'capsuleKind.daily.name')).toBe('Supply Capsule');
  });

  it('Echo of You carries the exact AI label', () => {
    expect(at(load('content.en.json'), 'general.echo.disclosure')).toBe('AI · Echo of You: an AI playing your War Plan');
  });

  it('no string claims something is free or that the game plays offline (Pillar 4)', () => {
    const all: string[] = [];
    for (const f of readdirSync(path.join(SRC, 'i18n')).filter((n) => n.endsWith('.json'))) strings(load(f), all);
    expect(all.filter((s) => /\bfree\b|\boffline\b/i.test(s))).toEqual([]);
    const html = readFileSync(path.join(SRC, '..', 'index.html'), 'utf8');
    expect(/\bfree\b|\boffline\b/i.test(html)).toBe(false);
  });
});

describe('no reel (A15.3)', () => {
  it('the capsule show imports no reel module', () => {
    const bad: string[] = [];
    for (const file of productionFiles().filter((f) => rel(f).startsWith('src/capsule/'))) {
      const sf = parse(file);
      for (const st of sf.statements) {
        const m = ts.isImportDeclaration(st) || ts.isExportDeclaration(st) ? st.moduleSpecifier : undefined;
        if (m && ts.isStringLiteral(m) && /(^|\/)reel/i.test(m.text)) bad.push(`${rel(file)} imports ${m.text}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the platform offers no reel reveal', () => {
    expect(new NonePlatform().features.reelReveal).toBe(false);
  });
});
