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
