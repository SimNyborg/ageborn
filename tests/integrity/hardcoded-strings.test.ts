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

/**
 * DOM properties that put text on screen when assigned (`el.textContent = 'Play'`). Pixi's `label` is a
 * debug name, not screen text.
 */
const TEXT_PROPERTIES = /^(textContent|innerText|innerHTML|title|placeholder|alt|ariaLabel)$/;

/**
 * The texts an expression can evaluate to: literals, both branches of `a ? 'x' : 'y'`, the operands of
 * `||`, `??`, `&&` and `+`, and the static parts of a template (`\`Wave ${n}\`` gives "Wave …").
 */
function texts(e: ts.Node | undefined): string[] {
  if (!e) return [];
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
  if (ts.isTemplateExpression(e)) return [e.head.text + e.templateSpans.map((s) => `…${s.literal.text}`).join('')];
  if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)) return texts(e.expression);
  if (ts.isConditionalExpression(e)) return [...texts(e.whenTrue), ...texts(e.whenFalse)];
  if (ts.isBinaryExpression(e)) {
    const op = e.operatorToken.kind;
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.PlusToken) return [...texts(e.left), ...texts(e.right)];
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return texts(e.right);
  }
  return [];
}

function scanSource(file: string, sf: ts.SourceFile = parse(file)): Finding[] {
  const out: Finding[] = [];
  const at = (n: ts.Node): string => `${rel(file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
  const report = (n: ts.Node, e: ts.Node | undefined, kind: string): void => {
    for (const s of texts(e)) if (isUiText(s)) out.push({ where: at(n), text: s.trim(), kind });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && isUiText(node.text)) out.push({ where: at(node), text: node.text.trim(), kind: 'jsx text' });
    if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      report(node, node.expression, 'jsx child literal');
    }
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      if (TEXT_ATTRIBUTES.has(name)) {
        const init = node.initializer;
        report(node, init && ts.isJsxExpression(init) ? init.expression : init, `attribute ${name}`);
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && /^(Text|BitmapText|HTMLText)$/.test(node.expression.text)) {
      report(node, node.arguments?.[0], `new ${node.expression.text}`);
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(sf) === 'text') report(node, node.initializer, 'text property');
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && TEXT_PROPERTIES.test(node.left.name.text)) {
      report(node, node.right, `assignment ${node.left.name.text}`);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'setAttribute') {
      const [name, value] = node.arguments;
      if (name && ts.isStringLiteral(name) && TEXT_ATTRIBUTES.has(name.text)) report(node, value, `setAttribute ${name.text}`);
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

  it('the scanner sees text in conditionals, templates and DOM assignments', () => {
    const src = [
      'export const B = ({ w, n }: { w: boolean; n: number }) => (',
      '  <p aria-label={w ? "Victory" : t("ui.defeat")}>{w && "You won"}{`Wave ${n}`}{`${n}/${n}`}{n > 1 ? "×" : ""}</p>',
      ');',
      'el.textContent = "Loading"; el.textContent = String(n); el.setAttribute("title", "Menu"); el.setAttribute("class", "big box");',
    ].join('\n');
    const sf = ts.createSourceFile('y.tsx', src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    const found = scanSource(path.resolve('src/ui/y.tsx'), sf).map((f) => `${f.kind}: ${f.text}`);
    expect(found).toEqual(['attribute aria-label: Victory', 'jsx child literal: You won', 'jsx child literal: Wave …', 'assignment textContent: Loading', 'setAttribute title: Menu']);
  });

  it('player-facing layers use i18n for every visible string', () => {
    const files = uiFiles();
    expect(files.length).toBeGreaterThan(10);
    const findings = files.flatMap((f) => scanSource(f)).map((f) => `${f.where} (${f.kind}): ${JSON.stringify(f.text)}`);
    expect(findings).toEqual([]);
  }, 30_000);
});
