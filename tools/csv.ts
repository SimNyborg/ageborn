/**
 * Balance CSV round trip (DESIGN B4 Spreadsheets, B12 `content:csv -- export|import`).
 *
 * - `export` writes `units.csv`, `turrets.csv` and `powers.csv` (default `reports/csv/`) with one row
 *   per card and one column per numeric field (see `lib/rawSource.ts` for the column names). The
 *   identity columns (`id`, `age`, `rarity`, `role`, `group`, `slot`) are for reading only.
 * - `import` reads those files back and rewrites only the changed numbers in `src/content/raw/*.ts`,
 *   keeping formatting and comments. It refuses unknown cards, new or removed fields and non-numbers.
 *   `--dry-run` lists the changes without writing.
 *
 * Balance changes touch numbers, not rules (CLAUDE.md). After an import: run the tests, regenerate the
 * counter matrix (`npx tsx tools/counters.ts`) and log the change in `docs/balance-log.md` (Phase 3).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { content as gameContent } from '../src/content';
import { applyEdits, readRawCards, type Edit, type RawCard, type RawKind } from './lib/rawSource';
import { markdownTable, REPORTS_DIR, startReport, type Check, type Report } from './report';

export const RAW_DIR = path.resolve(import.meta.dirname, '..', 'src', 'content', 'raw');
export const CSV_DIR = path.join(REPORTS_DIR, 'csv');

const KINDS: readonly RawKind[] = ['unit', 'turret', 'power'];
const INFO_COLUMNS = ['age', 'rarity', 'role', 'group', 'slot'];

export function csvFileName(kind: RawKind): string {
  return `${kind}s.csv`;
}

// ---------------------------------------------------------------------------------------------
// CSV text.

function cell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;
}

/** RFC 4180 parsing: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

// ---------------------------------------------------------------------------------------------
// Export.

/** Numeric columns in first-seen order over the cards. */
export function numericColumns(cards: readonly RawCard[]): string[] {
  const seen = new Set<string>();
  const cols: string[] = [];
  for (const c of cards) {
    for (const l of c.leaves) {
      if (!seen.has(l.path)) {
        seen.add(l.path);
        cols.push(l.path);
      }
    }
  }
  return cols;
}

export function tableFor(cards: readonly RawCard[], kind: RawKind): string[][] {
  const mine = cards.filter((c) => c.kind === kind);
  const info = INFO_COLUMNS.filter((f) => mine.some((c) => c.info[f] !== undefined));
  const cols = numericColumns(mine);
  const rows: string[][] = [['id', ...info, ...cols]];
  for (const c of mine) {
    const byPath = new Map(c.leaves.map((l) => [l.path, l.value]));
    rows.push([c.id, ...info.map((f) => c.info[f] ?? ''), ...cols.map((p) => (byPath.has(p) ? String(byPath.get(p)) : ''))]);
  }
  return rows;
}

/** Cards in age order (content age index), keeping source order within an age. */
export function inAgeOrder(cards: readonly RawCard[]): RawCard[] {
  const index = (c: RawCard): number => {
    const age = c.info['age'];
    return age !== undefined && age in gameContent.ages ? gameContent.ages[age as keyof typeof gameContent.ages].index : Number.MAX_SAFE_INTEGER;
  };
  return cards.map((c, i) => ({ c, i })).sort((a, b) => index(a.c) - index(b.c) || a.i - b.i).map((x) => x.c);
}

export function exportCsv(rawDir: string = RAW_DIR, outDir: string = CSV_DIR): { files: string[]; cards: number } {
  const cards = inAgeOrder(readRawCards(rawDir));
  mkdirSync(outDir, { recursive: true });
  const files: string[] = [];
  for (const kind of KINDS) {
    const file = path.join(outDir, csvFileName(kind));
    writeFileSync(file, toCsv(tableFor(cards, kind)));
    files.push(file);
  }
  return { files, cards: cards.length };
}

// ---------------------------------------------------------------------------------------------
// Import.

export interface CsvChange {
  card: string;
  path: string;
  from: number;
  to: number;
  file: string;
}

export interface ImportPlan {
  changes: CsvChange[];
  errors: string[];
  edits: Edit[];
}

/** Compares CSV tables with the source and plans the literal edits. Pure: nothing is written. */
export function planImport(cards: readonly RawCard[], tables: Partial<Record<RawKind, string[][]>>): ImportPlan {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const changes: CsvChange[] = [];
  const errors: string[] = [];
  const edits: Edit[] = [];
  for (const kind of KINDS) {
    const table = tables[kind];
    if (!table || table.length === 0) continue;
    const header = table[0] as string[];
    const idCol = header.indexOf('id');
    if (idCol < 0) {
      errors.push(`${csvFileName(kind)}: no "id" column`);
      continue;
    }
    for (const [r, row] of table.slice(1).entries()) {
      const id = (row[idCol] ?? '').trim();
      if (id === '') continue;
      const card = byId.get(id);
      if (!card || card.kind !== kind) {
        errors.push(`${csvFileName(kind)} row ${r + 2}: unknown ${kind} "${id}"`);
        continue;
      }
      const leaves = new Map(card.leaves.map((l) => [l.path, l]));
      header.forEach((col, i) => {
        if (col === 'id' || INFO_COLUMNS.includes(col)) return;
        const raw = (row[i] ?? '').trim();
        const leaf = leaves.get(col);
        if (raw === '') {
          if (leaf) errors.push(`${id}.${col}: empty cell, but the source has ${leaf.value} (fields cannot be removed here)`);
          return;
        }
        const to = Number(raw);
        if (!Number.isFinite(to)) {
          errors.push(`${id}.${col}: "${raw}" is not a number`);
          return;
        }
        if (!leaf) {
          errors.push(`${id}.${col}: the source has no such number (new fields go into the TS file by hand)`);
          return;
        }
        if (to !== leaf.value) {
          changes.push({ card: id, path: col, from: leaf.value, to, file: card.file });
          edits.push({ file: card.file, start: leaf.start, end: leaf.end, text: String(to) });
        }
      });
    }
  }
  return { changes, errors, edits };
}

export function readCsvTables(dir: string = CSV_DIR): Partial<Record<RawKind, string[][]>> {
  const out: Partial<Record<RawKind, string[][]>> = {};
  for (const kind of KINDS) {
    const file = path.join(dir, csvFileName(kind));
    if (existsSync(file)) out[kind] = parseCsv(readFileSync(file, 'utf8'));
  }
  return out;
}

/** Imports the CSVs; writes the source files unless `dryRun` or when there are errors. */
export function importCsv(o: { rawDir?: string; csvDir?: string; dryRun?: boolean } = {}): ImportPlan & { written: string[] } {
  const rawDir = o.rawDir ?? RAW_DIR;
  const plan = planImport(readRawCards(rawDir), readCsvTables(o.csvDir ?? CSV_DIR));
  const written: string[] = [];
  if (!o.dryRun && plan.errors.length === 0) {
    const byFile = new Map<string, Edit[]>();
    for (const e of plan.edits) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
    for (const [file, edits] of byFile) {
      writeFileSync(file, applyEdits(readFileSync(file, 'utf8'), edits));
      written.push(file);
    }
  }
  return { ...plan, written };
}

// ---------------------------------------------------------------------------------------------
// Reports.

export interface CsvData {
  command: 'export' | 'import';
  files: string[];
  changes: CsvChange[];
  errors: string[];
}

export function runCsv(command: 'export' | 'import', o: { rawDir?: string; csvDir?: string; dryRun?: boolean } = {}): Report<CsvData> {
  const rep = startReport<CsvData>('csv', `Ageborn balance CSV ${command} (DESIGN B4)`, { command, rawDir: o.rawDir ?? RAW_DIR, csvDir: o.csvDir ?? CSV_DIR, dryRun: o.dryRun ?? false });
  if (command === 'export') {
    const r = exportCsv(o.rawDir, o.csvDir);
    const checks: Check[] = [{ id: 'csv.export', metric: 'Exported cards', target: 'every raw card', value: `${r.cards} cards in ${r.files.length} files`, verdict: r.cards > 0 ? 'pass' : 'fail' }];
    return rep.finish(checks, { command, files: r.files, changes: [], errors: [] });
  }
  const r = importCsv(o);
  const checks: Check[] = [
    {
      id: 'csv.import',
      metric: 'Imported changes',
      target: 'no errors',
      value: `${r.changes.length} changed numbers${o.dryRun ? ' (dry run)' : `, ${r.written.length} files written`}`,
      verdict: r.errors.length === 0 ? 'pass' : 'fail',
      ...(r.errors.length > 0 ? { note: `${r.errors.length} errors; nothing written` } : {}),
    },
  ];
  const notes = r.changes.length > 0 && !o.dryRun ? ['Run `npm test`, regenerate the counter matrix (`npx tsx tools/counters.ts`) and log the change in docs/balance-log.md.'] : [];
  return rep.finish(checks, { command, files: r.written, changes: r.changes, errors: r.errors }, notes);
}

export function csvSections(r: Report<CsvData>): string[] {
  const out: string[] = [];
  if (r.data.changes.length > 0) out.push('## Changes', '', markdownTable(['Card', 'Field', 'From', 'To'], r.data.changes.map((c) => [c.card, c.path, c.from, c.to])));
  if (r.data.errors.length > 0) out.push('## Errors', '', ...r.data.errors.map((e) => `- ${e}`));
  if (r.data.files.length > 0) out.push('## Files', '', ...r.data.files.map((f) => `- ${f}`));
  return out;
}
