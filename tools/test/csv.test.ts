import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { csvFileName, exportCsv, importCsv, parseCsv, planImport, readCsvTables, toCsv } from '../csv';
import { applyEdits, cardsInSource, readRawCards } from '../lib/rawSource';

const FIXTURE = path.resolve(import.meta.dirname, '../../tests/fixtures/content');
const root = mkdtempSync(path.join(tmpdir(), 'ageborn-csv-'));
const raw = path.join(root, 'raw');
const csv = path.join(root, 'csv');
afterAll(() => rmSync(root, { recursive: true, force: true }));

beforeEach(() => {
  rmSync(raw, { recursive: true, force: true });
  rmSync(csv, { recursive: true, force: true });
  cpSync(FIXTURE, raw, { recursive: true });
});

/** Sets one cell of a CSV file. */
function setCell(kind: 'unit' | 'turret' | 'power', id: string, col: string, value: string): void {
  const file = path.join(csv, csvFileName(kind));
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const header = rows[0] as string[];
  const row = rows.find((r) => r[0] === id) as string[];
  row[header.indexOf(col)] = value;
  writeFileSync(file, toCsv(rows));
}

describe('CSV text', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [
      ['a', 'b,c', 'say "hi"'],
      ['multi\nline', '', '3'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
    expect(parseCsv('x,y\r\n1,2\r\n')).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ]);
  });
});

describe('raw source reading', () => {
  it('finds every card with dotted numeric paths', () => {
    const cards = readRawCards(raw);
    const kinds = new Set(cards.map((c) => c.kind));
    expect(kinds).toEqual(new Set(['unit', 'turret', 'power']));
    const bonker = cards.find((c) => c.id === 'bonker');
    expect(bonker?.leaves.find((l) => l.path === 'hp')?.value).toBe(160);
    expect(bonker?.leaves.find((l) => l.path === 'attacks.0.damage')?.value).toBe(20);
    expect(cards.find((c) => c.id === 'tuskback')?.leaves.find((l) => l.path === 'abilities.firstHitBonus.multBp')?.value).toBe(20000);
    expect(cards.find((c) => c.id === 'meteor_shower')?.leaves.find((l) => l.path === 'effect.count')?.value).toBe(14);
  });

  it('reads negative literals and applies edits without touching the rest', () => {
    const src = "const x = { id: 'a', kind: 'unit', knockback: -20, hp: 5 }; // keep\n";
    const [card] = cardsInSource('x.ts', src);
    const kb = card?.leaves.find((l) => l.path === 'knockback');
    expect(kb?.value).toBe(-20);
    const out = applyEdits(src, [{ file: 'x.ts', start: kb?.start ?? 0, end: kb?.end ?? 0, text: '-25' }]);
    expect(out).toBe("const x = { id: 'a', kind: 'unit', knockback: -25, hp: 5 }; // keep\n");
  });
});

describe('export and import (DESIGN B4 Spreadsheets)', () => {
  it('an unchanged export imports as no change', () => {
    const r = exportCsv(raw, csv);
    expect(r.cards).toBeGreaterThan(60);
    const plan = importCsv({ rawDir: raw, csvDir: csv });
    expect(plan.errors).toEqual([]);
    expect(plan.changes).toEqual([]);
    expect(plan.written).toEqual([]);
  });

  it('writes exactly the changed number back into the TS source', () => {
    exportCsv(raw, csv);
    const before = readFileSync(path.join(raw, 'stone.ts'), 'utf8');
    setCell('unit', 'bonker', 'hp', '161');
    setCell('power', 'meteor_shower', 'effect.damage', '55');
    const r = importCsv({ rawDir: raw, csvDir: csv });
    expect(r.errors).toEqual([]);
    expect(r.changes.map((c) => [c.card, c.path, c.from, c.to])).toEqual([
      ['bonker', 'hp', 160, 161],
      ['meteor_shower', 'effect.damage', 50, 55],
    ]);
    const after = readFileSync(path.join(raw, 'stone.ts'), 'utf8');
    expect(after.split('\n').filter((l, i) => l !== before.split('\n')[i])).toEqual([
      "      cost: 50, trainMs: 1500, pop: 2, hp: 161, speed: 70, size: 'small',",
    ]);
    expect(readRawCards(raw).find((c) => c.id === 'bonker')?.leaves.find((l) => l.path === 'hp')?.value).toBe(161);
  });

  it('a dry run writes nothing', () => {
    exportCsv(raw, csv);
    setCell('turret', 'rock_tosser', 'cost', '160');
    const r = importCsv({ rawDir: raw, csvDir: csv, dryRun: true });
    expect(r.changes).toHaveLength(1);
    expect(r.written).toEqual([]);
    expect(readRawCards(raw).find((c) => c.id === 'rock_tosser')?.leaves.find((l) => l.path === 'cost')?.value).toBe(150);
  });

  it('refuses unknown cards, non-numbers, new and removed fields, and then writes nothing', () => {
    exportCsv(raw, csv);
    setCell('unit', 'bonker', 'hp', 'lots');
    setCell('unit', 'pebbler', 'hp', '');
    setCell('unit', 'bonker', 'attacks.0.projectile.speed', '500');
    const tables = readCsvTables(csv);
    (tables.unit as string[][]).push(['ghost', ...Array((tables.unit?.[0]?.length ?? 1) - 1).fill('')]);
    const plan = planImport(readRawCards(raw), tables);
    expect(plan.errors.map((e) => e.split(':')[0])).toEqual(expect.arrayContaining(['bonker.hp', 'pebbler.hp', 'bonker.attacks.0.projectile.speed']));
    expect(plan.errors.some((e) => /units\.csv row \d+: unknown unit "ghost"/.test(e))).toBe(true);
    const r = importCsv({ rawDir: raw, csvDir: csv });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.written).toEqual([]);
  });
});
