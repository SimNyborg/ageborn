/**
 * No hard-coded UI strings (DESIGN B13 Integrity, CLAUDE.md "Strings go through i18n").
 *
 * Scans the layers that put text in front of players (ui, capsule, app, tutorial, render) for text that
 * does not come from `t(...)`:
 *
 * - JSX text with a letter in it (`<b>Play</b>`) or a string literal as a JSX child (`{'Play'}`);
 * - user-visible JSX attributes with literal text (`title`, `alt`, `placeholder`, `label`, `aria-*`);
 * - Pixi text: `new Text('...')` and `text: '...'` in object literals.
 *
 * Dev pages are internal tools and exempt (docs/decisions.md WP0), wherever a package keeps them:
 * `src/dev/**` and `src/<layer>/dev/**`. Test files and dev fixtures are exempt too. Text without letters
 * (numbers, symbols), single key glyphs (`Q`, `1`) and the brand name are allowed.
 */
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { layerOf, parse, productionFiles, rel } from './helpers/source';

const UI_LAYERS = ['ui', 'capsule', 'app', 'tutorial', 'render'];
const TEXT_ATTRIBUTES = new Set(['title', 'alt', 'placeholder', 'label', 'aria-label', 'aria-description', 'aria-placeholder', 'aria-valuetext', 'aria-roledescription']);
/** The game's name is a brand constant, not a string key (docs/decisions.md WP0). */
const ALLOWED_TEXT = new Set(['Ageborn']);
const LETTER = /\p{L}/u;

function isUiText(s: string): boolean {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t === '' || !LETTER.test(t)) return false;
  if (ALLOWED_TEXT.has(t)) return false;
  // A single key glyph such as "Q" or "E" on a keyboard hint.
  if (/^[A-Z0-9]$/.test(t)) return false;
  return true;
}

interface Finding {
  where: string;
  text: string;
  kind: string;
}

function scanSource(file: string, sf: ts.SourceFile = parse(file)): Finding[] {
  const out: Finding[] = [];
  const at = (n: ts.Node): string => `${rel(file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
  const literal = (e: ts.Node | undefined): string | null =>
    e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : null;
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && isUiText(node.text)) out.push({ where: at(node), text: node.text.trim(), kind: 'jsx text' });
    if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const s = literal(node.expression);
      if (s !== null && isUiText(s)) out.push({ where: at(node), text: s, kind: 'jsx child literal' });
    }
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      if (TEXT_ATTRIBUTES.has(name)) {
        const init = node.initializer;
        const s = init && ts.isJsxExpression(init) ? literal(init.expression) : literal(init);
        if (s !== null && isUiText(s)) out.push({ where: at(node), text: s, kind: `attribute ${name}` });
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && /^(Text|BitmapText|HTMLText)$/.test(node.expression.text)) {
      const s = literal(node.arguments?.[0]);
      if (s !== null && isUiText(s)) out.push({ where: at(node), text: s, kind: `new ${node.expression.text}` });
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(sf) === 'text') {
      const s = literal(node.initializer);
      if (s !== null && isUiText(s)) out.push({ where: at(node), text: s, kind: 'text property' });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function uiFiles(): string[] {
  return productionFiles().filter((f) => {
    const layer = layerOf(f);
    const r = rel(f);
    return layer !== null && UI_LAYERS.includes(layer) && !r.includes('/fixtures/') && !r.includes('/dev/');
  });
}

describe('no hard-coded UI strings', () => {
  it('the scanner finds each kind of hard-coded text', () => {
    const src = [
      'export const A = () => <div title="Open menu">Play now {"Retreat"} {t("ui.ok")} 3 × 2 <kbd>Q</kbd> Ageborn</div>;',
      'const s = new Text("VICTORY"); const o = { text: "Legendary!" }; const ok = { text: "+25" };',
    ].join('\n');
    const sf = ts.createSourceFile('x.tsx', src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    const found = scanSource(path.resolve('src/ui/x.tsx'), sf).map((f) => `${f.kind}: ${f.text}`);
    expect(found).toEqual(['attribute title: Open menu', 'jsx text: Play now', 'jsx child literal: Retreat', 'new Text: VICTORY', 'text property: Legendary!']);
  });

  it('player-facing layers use i18n for every visible string', () => {
    const files = uiFiles();
    expect(files.length).toBeGreaterThan(10);
    const findings = files.flatMap((f) => scanSource(f)).map((f) => `${f.where} (${f.kind}): ${JSON.stringify(f.text)}`);
    expect(findings).toEqual([]);
  });
});
