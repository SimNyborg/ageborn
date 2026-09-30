#!/usr/bin/env node
/* global process, console */
/**
 * Timing guard for re-rendered unit sheets (art director plan 2026-09-30, tool T7).
 *
 * Compares every clip's `durationMs` and the attack `impactAt` in src/visuals/unitSheets.gen.ts
 * with the same file at a git ref (default HEAD) and fails on any change: the sim owns timing,
 * so new art may add or remove frames but never change a clip's length or its impact point.
 *
 *   node art/blender/check_timing.mjs            # against HEAD
 *   node art/blender/check_timing.mjs <ref>      # against another commit or branch
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = 'src/visuals/unitSheets.gen.ts';
const ref = process.argv[2] ?? 'HEAD';

function parse(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(\{.*\}),\s*$/);
    if (!m) continue;
    const row = JSON.parse(m[1]);
    out.set(row.slug, row);
  }
  return out;
}

const now = parse(readFileSync(path.join(ROOT, FILE), 'utf8'));
const before = parse(execFileSync('git', ['show', `${ref}:${FILE}`], { cwd: ROOT, encoding: 'utf8' }));
const errors = [];
for (const [slug, old] of before) {
  const cur = now.get(slug);
  if (!cur) {
    errors.push(`${slug}: missing`);
    continue;
  }
  for (const [clip, c] of Object.entries(old.clips)) {
    const n = cur.clips[clip];
    if (!n) {
      errors.push(`${slug}.${clip}: clip missing`);
      continue;
    }
    if (n.durationMs !== c.durationMs) errors.push(`${slug}.${clip}: durationMs ${c.durationMs} -> ${n.durationMs}`);
    if (c.impactAt !== undefined && n.impactAt !== c.impactAt) errors.push(`${slug}.${clip}: impactAt ${c.impactAt} -> ${n.impactAt}`);
  }
}
if (errors.length) {
  console.error(`timing changed against ${ref}:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`timing unchanged against ${ref} (${before.size} units)`);
