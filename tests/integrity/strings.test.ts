/**
 * String keys (DESIGN B13 Integrity, B4 Strings): every key used in code and content exists in the EN
 * files, keys are unique across files, EN strings are non-empty, and Danish files (v1.1) only use EN keys
 * with the same placeholders.
 *
 * Keys used in code are the first argument of any `t(...)` or `x.t(...)` call: string literals are
 * checked exactly; template literals (`age.${id}.name`) must match at least one EN key.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { buildTables, type StringTable } from '../../src/i18n';
import { parse, productionFiles, rel, SRC } from './helpers/source';

const I18N = path.join(SRC, 'i18n');

function stringFiles(locale: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of readdirSync(I18N).sort()) {
    if (f.endsWith(`.${locale}.json`)) out[`./${f}`] = JSON.parse(readFileSync(path.join(I18N, f), 'utf8'));
  }
  return out;
}

const duplicates: string[] = [];
const en: StringTable = buildTables(stringFiles('en'), (key, _loc, file) => duplicates.push(`${key} (${file})`)).en ?? {};
const enKeys = new Set(Object.keys(en));

interface KeyUse {
  where: string;
  key?: string;
  pattern?: RegExp;
  source: string;
}

const KEY_SHAPE = /^[A-Za-z][\w-]*(\.[\w-]+)+$/;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Key arguments of `t(...)` / `obj.t(...)` calls in production code (dev pages are exempt). */
function keyUses(): KeyUse[] {
  const uses: KeyUse[] = [];
  for (const file of productionFiles()) {
    if (rel(file).startsWith('src/dev/')) continue;
    const sf = parse(file);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const isT = (ts.isIdentifier(callee) && callee.text === 't') || (ts.isPropertyAccessExpression(callee) && callee.name.text === 't');
        const arg = node.arguments[0];
        if (isT && arg) {
          const where = `${rel(file)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
          if ((ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) && KEY_SHAPE.test(arg.text)) {
            uses.push({ where, key: arg.text, source: arg.getText(sf) });
          } else if (ts.isTemplateExpression(arg)) {
            const parts = [escapeRe(arg.head.text), ...arg.templateSpans.map((s) => `.+${escapeRe(s.literal.text)}`)];
            if (/\./.test(arg.head.text) || arg.templateSpans.some((s) => s.literal.text.includes('.'))) {
              uses.push({ where, pattern: new RegExp(`^${parts.join('')}$`), source: arg.getText(sf) });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return uses;
}

/**
 * Keys that reach `t()` indirectly: a literal or template under a `*Key` property in production code
 * (`{ labelKey: 'ui.home.play' }`, `nameKey: \`age.${id}.name\``). Dev pages, fixtures and the contract
 * fakes are exempt; values that are not key-shaped (`dayKey: '2026-01-01'`) are not string keys.
 */
/**
 * A17 raw age tables that are not wired into `src/content` yet: their EN strings arrive when they are
 * wired (the compiled-content check below then covers them). Remove an entry when its age is wired.
 */
const UNWIRED_RAW = new Set(['src/content/raw/bronze.ts', 'src/content/raw/industrial.ts', 'src/content/raw/cosmic.ts']);

function keyProperties(): KeyUse[] {
  const uses: KeyUse[] = [];
  for (const file of productionFiles()) {
    const r = rel(file);
    if (UNWIRED_RAW.has(r)) continue;
    if (r.startsWith('src/dev/') || r.includes('/dev/') || r.includes('/fixtures/') || r.startsWith('src/contracts/fakes/')) continue;
    const sf = parse(file);
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && /Key$/.test(node.name.getText(sf))) {
        const v = node.initializer;
        const where = `${r}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
        if ((ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) && KEY_SHAPE.test(v.text)) {
          uses.push({ where, key: v.text, source: node.getText(sf) });
        } else if (ts.isTemplateExpression(v) && (v.head.text.includes('.') || v.templateSpans.some((s) => s.literal.text.includes('.')))) {
          const parts = [escapeRe(v.head.text), ...v.templateSpans.map((s) => `.+${escapeRe(s.literal.text)}`)];
          uses.push({ where, pattern: new RegExp(`^${parts.join('')}$`), source: node.getText(sf) });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return uses;
}

/** Every string under a property whose name ends in `Key` (nameKey, descKey, messageKey ...). */
function contentKeys(value: unknown, trail: string, out: { where: string; key: string }[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => contentKeys(v, `${trail}[${i}]`, out));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) {
    if (/Key$/.test(k) && typeof v === 'string') out.push({ where: `${trail}.${k}`, key: v });
    else contentKeys(v, `${trail}.${k}`, out);
  }
}

describe('string keys (DESIGN B4 Strings)', () => {
  it('the EN files load and hold keys', () => {
    expect(enKeys.size).toBeGreaterThan(100);
  });

  it('no key is defined twice across the EN files', () => {
    expect(duplicates).toEqual([]);
  });

  it('every EN string is non-empty (ready for the v1.1 Danish files)', () => {
    expect(Object.entries(en).filter(([, v]) => v.trim() === '').map(([k]) => k)).toEqual([]);
  });

  const uses = keyUses();

  it('finds the key uses in code', () => {
    expect(uses.length).toBeGreaterThan(50);
  });

  it('every literal key used in code exists in the EN files', () => {
    const missing = uses.filter((u) => u.key !== undefined && !enKeys.has(u.key)).map((u) => `${u.where} ${u.source}`);
    expect(missing).toEqual([]);
  });

  it('every template key used in code matches at least one EN key', () => {
    const keys = [...enKeys];
    const missing = uses.filter((u) => u.pattern !== undefined && !keys.some((k) => u.pattern?.test(k))).map((u) => `${u.where} ${u.source}`);
    expect(missing).toEqual([]);
  });

  it('every `*Key` property in code names an EN key (keys that reach t() indirectly)', () => {
    const props = keyProperties();
    expect(props.length).toBeGreaterThan(50);
    const keys = [...enKeys];
    const missing = props
      .filter((u) => (u.key !== undefined ? !enKeys.has(u.key) : !keys.some((k) => u.pattern?.test(k))))
      .map((u) => `${u.where} ${u.source}`);
    expect(missing).toEqual([]);
  });

  it('every string key in the compiled content exists in the EN files', () => {
    const refs: { where: string; key: string }[] = [];
    contentKeys(content, 'content', refs);
    expect(refs.length).toBeGreaterThan(100);
    expect(refs.filter((r) => !enKeys.has(r.key)).map((r) => `${r.where} = ${r.key}`)).toEqual([]);
  });

  it('Danish files (v1.1) use only EN keys with the same placeholders', (ctx) => {
    const da = buildTables(stringFiles('da')).da ?? {};
    ctx.skip(Object.keys(da).length === 0, 'no *.da.json files yet (Danish arrives in v1.1)');
    const holes = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    const bad = Object.entries(da)
      .filter(([k, v]) => !enKeys.has(k) || holes(v) !== holes(en[k] ?? ''))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
