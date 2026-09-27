/**
 * Source scanning for the integrity tests (DESIGN B13 Integrity): lists the `src` files, parses them
 * with the TypeScript compiler API, resolves import specifiers to files and layers, and classifies test
 * files exactly like `eslint.config.js` does.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
export const SRC = path.join(ROOT, 'src');

/** Repo-relative POSIX path. */
export function rel(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

/** Every file under `dir` (recursive) with one of `exts`. */
export function walk(dir: string, exts: readonly string[] = ['.ts', '.tsx']): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e)) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** The test-file globs of eslint.config.js: exempt from layer and determinism rules. */
export function isTestFile(file: string): boolean {
  const r = rel(file);
  return /\.test\.tsx?$/.test(r) || /\.bench\.ts$/.test(r) || /(^|\/)test\//.test(r) || /(^|\/)__tests__\//.test(r);
}

/** The src layer of a file (first folder under src), or null for files outside or directly in src. */
export function layerOf(file: string): string | null {
  const r = path.relative(SRC, file);
  if (r.startsWith('..') || path.isAbsolute(r)) return null;
  const parts = r.split(path.sep);
  return parts.length > 1 ? (parts[0] as string) : null;
}

const parsed = new Map<string, ts.SourceFile>();

export function parse(file: string): ts.SourceFile {
  let sf = parsed.get(file);
  if (!sf) {
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true, kind);
    parsed.set(file, sf);
  }
  return sf;
}

export type ImportKind = 'static' | 'type' | 'dynamic' | 'glob';

export interface ImportRef {
  from: string;
  spec: string;
  kind: ImportKind;
  line: number;
}

function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

/** Glob patterns of `import.meta.glob(...)`: the path before the first wildcard. */
function globBases(arg: ts.Expression): string[] {
  const one = (e: ts.Expression): string | null => (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) ? e.text : null);
  const pats = ts.isArrayLiteralExpression(arg) ? arg.elements.map((e) => one(e as ts.Expression)) : [one(arg)];
  return pats
    .filter((p): p is string => p !== null && !p.startsWith('!'))
    .map((p) => {
      const cut = p.search(/[*?{[]/);
      const base = cut >= 0 ? p.slice(0, cut) : p;
      return base.endsWith('/') || cut < 0 ? base : path.posix.dirname(base) + '/';
    });
}

/**
 * Every import of a file: static imports and re-exports (type-only ones marked `type`), dynamic
 * `import()` and `import.meta.glob`. Type-level `import('x')` annotations are skipped, as in the
 * ESLint layer rule (contracts use them for Pixi view types).
 */
export function importsOf(file: string): ImportRef[] {
  const sf = parse(file);
  const out: ImportRef[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      // Only `import type` is erased: under verbatimModuleSyntax `import { type A }` keeps the module.
      const typeOnly = node.importClause?.isTypeOnly === true;
      out.push({ from: file, spec: node.moduleSpecifier.text, kind: typeOnly ? 'type' : 'static', line: lineOf(sf, node) });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push({ from: file, spec: node.moduleSpecifier.text, kind: node.isTypeOnly ? 'type' : 'static', line: lineOf(sf, node) });
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const a = node.arguments[0];
        if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) out.push({ from: file, spec: a.text, kind: 'dynamic', line: lineOf(sf, node) });
      } else if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'glob' && node.expression.expression.getText(sf) === 'import.meta') {
        const a = node.arguments[0];
        if (a) for (const base of globBases(a)) out.push({ from: file, spec: base, kind: 'glob', line: lineOf(sf, node) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const EXTS = ['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx'];

/** Resolves a specifier to an absolute path (file or, for globs, folder); null for packages. */
export function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const e of EXTS) {
    const p = base + e;
    if (existsSync(p) && (e === '' ? statSync(p).isFile() || spec.endsWith('/') : true)) return p;
  }
  return base;
}

/** The npm package of a bare specifier (`@scope/name` or `name`). */
export function packageOf(spec: string): string {
  return spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : (spec.split('/')[0] as string);
}

/** Every production source file of src (tests excluded). */
export function productionFiles(): string[] {
  return walk(SRC).filter((f) => !isTestFile(f));
}
