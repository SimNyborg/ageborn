/**
 * Bundle size gate (DESIGN B16). Run after `npm run build`.
 *
 * Initial download = index.html + the entry script + every modulepreload chunk + stylesheets
 * referenced from dist/index.html, measured gzipped. Fails when it exceeds 3 MB.
 * Also reports the total gzipped size of dist (budget 8 MB, warning only).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const INITIAL_LIMIT = 3 * 1024 * 1024;
const TOTAL_BUDGET = 8 * 1024 * 1024;
const BASE = '/ageborn/';

function gz(file: string): number {
  return gzipSync(readFileSync(file), { level: 9 }).length;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function kb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

const indexFile = path.join(DIST, 'index.html');
if (!existsSync(indexFile)) {
  console.error('size: dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const html = readFileSync(indexFile, 'utf8');
const refs = new Set<string>();
for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"[^>]*>/g)) {
  const tag = m[0];
  const url = m[1] ?? '';
  if (/^[a-z]+:\/\//i.test(url) || url.startsWith('data:')) continue;
  const isScript = tag.startsWith('<script');
  const isPreload = /rel="modulepreload"/.test(tag);
  const isStyle = /rel="stylesheet"/.test(tag);
  if (isScript || isPreload || isStyle) refs.add(url);
}

let initial = gz(indexFile);
const rows: string[] = [`  index.html  ${kb(initial)}`];
for (const url of refs) {
  const rel = url.startsWith(BASE) ? url.slice(BASE.length) : url.replace(/^\.?\//, '');
  const file = path.join(DIST, rel);
  if (!existsSync(file)) {
    console.error(`size: referenced file missing: ${url}`);
    process.exit(1);
  }
  const s = gz(file);
  initial += s;
  rows.push(`  ${rel}  ${kb(s)}`);
}

const total = walk(DIST)
  .filter((f) => !f.endsWith('.map'))
  .reduce((sum, f) => sum + gz(f), 0);

console.log('Initial download (gzip):');
console.log(rows.join('\n'));
console.log(`Initial total: ${kb(initial)} (limit ${kb(INITIAL_LIMIT)}, target 1536.0 KB)`);
console.log(`Dist total (gzip, no source maps): ${kb(total)} (budget ${kb(TOTAL_BUDGET)})`);

if (total > TOTAL_BUDGET) console.warn('size: WARNING total download exceeds the 8 MB budget (DESIGN B16).');
if (initial > INITIAL_LIMIT) {
  console.error('size: FAIL initial chunk exceeds 3 MB gzipped (DESIGN B16).');
  process.exit(1);
}
console.log('size: OK');
