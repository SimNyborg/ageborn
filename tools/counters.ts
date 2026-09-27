/**
 * Counter-matrix generator (DESIGN B4 Counter matrix): runs equal-gold 1v1 duels of every
 * collectable unit pair at L1 on a flat lane and writes `src/content/generated/counters.json`.
 *
 *   npx tsx tools/counters.ts           regenerate the file
 *   npx tsx tools/counters.ts --check   exit 1 when the file is stale (inputs changed)
 *   npx tsx tools/counters.ts --report  print the matrix summary (strongest and weakest matchups)
 *
 * The file is stale when the hash of the duel inputs (units, economy, battle rules, duel engine
 * version) differs from the one stored in it; `src/content/test/counters.test.ts` fails in CI then.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildCounterFile, counterInputHash, parseCounterFile } from '../src/content/counters/matrix';
import { raw } from '../src/content/raw';

const FILE = path.resolve(import.meta.dirname, '..', 'src', 'content', 'generated', 'counters.json');

const allUnits = raw.ages.flatMap((t) => t.units);
const units = allUnits.filter((u) => !u.hidden);
const expectedHash = counterInputHash(allUnits, raw.economy, raw.battle);

function readCurrent(): ReturnType<typeof parseCounterFile> | null {
  try {
    return parseCounterFile(JSON.parse(readFileSync(FILE, 'utf8')));
  } catch {
    return null;
  }
}

/** Stable, reviewable JSON: one matrix row per line. */
function serialize(file: ReturnType<typeof buildCounterFile>): string {
  const rows = file.units.map((a) => `    ${JSON.stringify(a)}: ${JSON.stringify(file.matrixBp[a])}`);
  return [
    '{',
    `  "format": ${file.format},`,
    `  "engine": ${file.engine},`,
    `  "inputHash": ${JSON.stringify(file.inputHash)},`,
    `  "units": ${JSON.stringify(file.units)},`,
    '  "matrixBp": {',
    rows.join(',\n'),
    '  }',
    '}',
    '',
  ].join('\n');
}

function report(file: ReturnType<typeof parseCounterFile>): void {
  const pct = (bp: number): string => `${(bp / 100).toFixed(1)}%`;
  console.log(`counters: ${file.units.length} units, engine ${file.engine}, hash ${file.inputHash}`);
  for (const a of file.units) {
    const row = file.matrixBp[a] ?? {};
    const others = file.units.filter((b) => b !== a).map((b) => ({ b, m: row[b] ?? 5000 }));
    others.sort((x, y) => y.m - x.m);
    const top = others.slice(0, 3).map((o) => `${o.b} ${pct(o.m)}`).join(', ');
    const bottom = others.slice(-3).reverse().map((o) => `${o.b} ${pct(o.m)}`).join(', ');
    console.log(`${a.padEnd(20)} beats: ${top}\n${''.padEnd(20)} loses: ${bottom}`);
  }
}

const args = new Set(process.argv.slice(2));
const current = readCurrent();

if (args.has('--check')) {
  if (!current || current.inputHash !== expectedHash) {
    console.error(`counters.json is stale (file ${current?.inputHash ?? 'missing'}, inputs ${expectedHash}). Run: npx tsx tools/counters.ts`);
    process.exit(1);
  }
  console.log(`counters.json is up to date (${expectedHash}).`);
} else if (args.has('--report')) {
  if (!current) {
    console.error('counters.json is missing or malformed.');
    process.exit(1);
  }
  report(current);
} else {
  const started = Date.now();
  let lastPct = -1;
  const file = buildCounterFile({ units, allUnits, economy: raw.economy, battle: raw.battle }, (done, total) => {
    const pct = Math.floor((done * 100) / total);
    if (pct % 10 === 0 && pct !== lastPct) {
      lastPct = pct;
      process.stdout.write(`\rcounters: ${pct}%`);
    }
  });
  writeFileSync(FILE, serialize(file));
  const pairs = (file.units.length * (file.units.length - 1)) / 2;
  console.log(`\ncounters: wrote ${path.relative(process.cwd(), FILE)} (${pairs} pairs in ${Date.now() - started} ms)`);
}
