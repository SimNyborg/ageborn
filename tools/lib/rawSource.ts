/**
 * Reads and patches the numbers of the raw content tables in their TypeScript source
 * (`src/content/raw/*.ts`, DESIGN B4), for the balance CSV round trip (`tools/csv.ts`).
 *
 * A card is an object literal with a string `id` and a `kind` of unit, turret or power. Its numeric
 * literals become dotted paths:
 *
 * - nested objects: `effect.damage`, `attacks.0.projectile.speed`
 * - arrays of objects with a string `kind` use the kind: `abilities.firstHitBonus.multBp`
 *   (a repeated kind gets `#2`, `#3`); other arrays use the index: `attacks.0.damage`
 *
 * Only literal numbers are exposed (shared references such as `mods: damageMods.blunt` are not), and
 * patching replaces exactly the literal's text, so the file's formatting and comments stay intact.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export type RawKind = 'unit' | 'turret' | 'power';

export interface NumberLeaf {
  path: string;
  value: number;
  /** Source span of the literal (including a leading minus). */
  start: number;
  end: number;
}

export interface RawCard {
  id: string;
  kind: RawKind;
  file: string;
  /** Identity fields for the CSV (age, rarity, role, slot). */
  info: Record<string, string>;
  leaves: NumberLeaf[];
}

const KINDS: readonly RawKind[] = ['unit', 'turret', 'power'];
const INFO_FIELDS = ['age', 'rarity', 'role', 'group', 'slot'];

function propName(p: ts.ObjectLiteralElementLike): string | null {
  if (!ts.isPropertyAssignment(p)) return null;
  const n = p.name;
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return n.text;
  return null;
}

function stringProp(o: ts.ObjectLiteralExpression, name: string): string | null {
  for (const p of o.properties) {
    if (propName(p) === name && ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)) return p.initializer.text;
  }
  return null;
}

function numberOf(e: ts.Expression): number | null {
  if (ts.isNumericLiteral(e)) return Number(e.text);
  if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(e.operand)) return -Number(e.operand.text);
  return null;
}

function collect(e: ts.Expression, prefix: string, sf: ts.SourceFile, out: NumberLeaf[]): void {
  const n = numberOf(e);
  if (n !== null) {
    out.push({ path: prefix, value: n, start: e.getStart(sf), end: e.getEnd() });
    return;
  }
  if (ts.isObjectLiteralExpression(e)) {
    for (const p of e.properties) {
      const name = propName(p);
      if (name === null || !ts.isPropertyAssignment(p)) continue;
      collect(p.initializer, prefix ? `${prefix}.${name}` : name, sf, out);
    }
    return;
  }
  if (ts.isArrayLiteralExpression(e)) {
    const seen = new Map<string, number>();
    e.elements.forEach((el, i) => {
      let key = String(i);
      if (ts.isObjectLiteralExpression(el)) {
        const kind = stringProp(el, 'kind');
        if (kind !== null) {
          const k = (seen.get(kind) ?? 0) + 1;
          seen.set(kind, k);
          key = k === 1 ? kind : `${kind}#${k}`;
        }
      }
      collect(el, `${prefix}.${key}`, sf, out);
    });
  }
}

/** Every card in one source file. */
export function cardsInSource(file: string, text: string): RawCard[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const cards: RawCard[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const id = stringProp(node, 'id');
      const kind = stringProp(node, 'kind') as RawKind | null;
      if (id !== null && kind !== null && KINDS.includes(kind)) {
        const info: Record<string, string> = {};
        for (const f of INFO_FIELDS) {
          const v = stringProp(node, f);
          if (v !== null) info[f] = v;
        }
        const leaves: NumberLeaf[] = [];
        collect(node, '', sf, leaves);
        cards.push({ id, kind, file, info, leaves });
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return cards;
}

/** The table files of a raw directory (tests and helpers excluded). */
export function rawFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'types.ts' && f !== 'index.ts')
    .sort()
    .map((f) => path.join(dir, f));
}

/** Every card in a raw directory, in file then source order. */
export function readRawCards(dir: string): RawCard[] {
  return rawFiles(dir).flatMap((f) => cardsInSource(f, readFileSync(f, 'utf8')));
}

export interface Edit {
  file: string;
  start: number;
  end: number;
  text: string;
}

/** Applies non-overlapping edits to a text (any order). */
export function applyEdits(text: string, edits: readonly Edit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = text;
  let limit = Number.POSITIVE_INFINITY;
  for (const e of sorted) {
    if (e.end > limit) throw new Error(`overlapping edits in ${e.file}`);
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    limit = e.start;
  }
  return out;
}
