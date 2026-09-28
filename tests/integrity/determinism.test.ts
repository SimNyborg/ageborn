/**
 * Determinism backstop (DESIGN B2 "Determinism lint", B3): the pure layers (`DETERMINISTIC_LAYERS` from
 * eslint.config.js: sim, ai, meta, core, content) must stay free of wall-clock time and unseeded
 * randomness, because replays, golden hashes and the balance tools depend on it.
 *
 * ESLint enforces the full rule set when it runs; this test makes `npm test` catch the two ways a leak
 * slips past it: a disable directive that switches the determinism or layer rules off, and the
 * high-risk calls themselves (`Math.random`, `Date`, `performance.now`, `crypto.getRandomValues`).
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import { layerOf, parse, productionFiles, rel, ROOT } from './helpers/source';

let DETERMINISTIC_LAYERS: string[] = [];

beforeAll(async () => {
  const mod = (await import(pathToFileURL(path.join(ROOT, 'eslint.config.js')).href)) as { DETERMINISTIC_LAYERS: string[] };
  DETERMINISTIC_LAYERS = mod.DETERMINISTIC_LAYERS;
});

/** Rules a directive in a pure layer may never switch off. */
const GUARDED_RULES = ['no-restricted-globals', 'no-restricted-properties', 'no-restricted-syntax', 'ageborn/layers'];

/** `eslint-disable` directives that turn off every rule or a guarded one. */
function badDirectives(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/eslint-disable(?:-next-line|-line)?(?=[\s*]|$)([^\n]*)/g)) {
    const rules = (m[1] ?? '').replace(/\*\/.*$/, '').split('--')[0]?.trim() ?? '';
    if (rules === '' || GUARDED_RULES.some((r) => rules.includes(r))) out.push(m[0].trim());
  }
  return out;
}

/** Calls that read the wall clock or unseeded randomness. */
function timeAndRandomness(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const line = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node): void => {
    if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
      const call = `${n.expression.text}.${n.name.text}`;
      if (/^(Math\.random|Date\.now|performance\.now|crypto\.getRandomValues|crypto\.randomUUID)$/.test(call)) out.push(`${line(n)}: ${call}`);
    }
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Date') out.push(`${line(n)}: new Date`);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function pureFiles(): string[] {
  return productionFiles().filter((f) => DETERMINISTIC_LAYERS.includes(layerOf(f) ?? ''));
}

describe('determinism of the pure layers (DESIGN B2, B3)', () => {
  it('the checks recognise what they must', () => {
    expect(badDirectives('// eslint-disable-next-line no-restricted-properties -- trig\nx')).toHaveLength(1);
    expect(badDirectives('/* eslint-disable */')).toHaveLength(1);
    expect(badDirectives('// eslint-disable-line ageborn/layers')).toHaveLength(1);
    expect(badDirectives('// eslint-disable-next-line @typescript-eslint/no-explicit-any')).toEqual([]);
    const sf = ts.createSourceFile('x.ts', 'const a = Math.random(); const b = Date.now(); const c = new Date(0); const d = Math.max(1, 2);', ts.ScriptTarget.ES2022, true);
    expect(timeAndRandomness(sf)).toEqual(['1: Math.random', '1: Date.now', '1: new Date']);
  });

  it('covers the layers DESIGN B2 names', () => {
    expect([...DETERMINISTIC_LAYERS].sort()).toEqual(['ai', 'content', 'core', 'meta', 'sim']);
    expect(pureFiles().length).toBeGreaterThan(30);
  });

  it('no disable directive switches off the determinism or layer rules', () => {
    const hits = pureFiles().flatMap((f) => badDirectives(parse(f).text).map((d) => `${rel(f)}: ${d}`));
    expect(hits).toEqual([]);
  });

  it('no production code in a pure layer reads the clock or unseeded randomness', () => {
    const hits = pureFiles().flatMap((f) => timeAndRandomness(parse(f)).map((h) => `${rel(f)}:${h}`));
    expect(hits).toEqual([]);
  });
});
