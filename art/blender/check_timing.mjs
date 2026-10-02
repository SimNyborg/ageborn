#!/usr/bin/env node
/* global process, console */
/**
 * Timing guard for re-rendered unit sheets (art director plan 2026-09-30, tool T7).
 *
 * Compares every clip's `durationMs` and the attack `impactAt` in src/visuals/unitSheets.gen.ts
 * with the same file at a git ref (default HEAD) and fails on any change: the sim owns timing,
 * so new art may add or remove frames but never change a clip's length or its impact point.
 *
 * It also reads every unit sheet JSON (core and extras) and fails when an attack clip's impact step
 * (`impactStep`, else `impactFrame` mapped through `sequence`) does not start at `impactAt`, or when
 * `holdStep` / `holdLoop` are not steps before the impact (review B2, 2026-10-02: `impactFrame` is a
 * unique-frame index, so it is only a step when `sequence` plays the frames in order).
 *
 *   node art/blender/check_timing.mjs            # against HEAD
 *   node art/blender/check_timing.mjs <ref>      # against another commit or branch
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
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
    // ANIM_SPEC 2.0 rule 1: the walk has no fixed length (it follows from the gait, and the runtime
    // plays it at the sim's measured speed), so only a missing walk clip is an error
    if (clip === 'walk' && cur.clips.walk) continue;
    const n = cur.clips[clip];
    if (!n) {
      errors.push(`${slug}.${clip}: clip missing`);
      continue;
    }
    if (n.durationMs !== c.durationMs) errors.push(`${slug}.${clip}: durationMs ${c.durationMs} -> ${n.durationMs}`);
    if (c.impactAt !== undefined && n.impactAt !== c.impactAt) errors.push(`${slug}.${clip}: impactAt ${c.impactAt} -> ${n.impactAt}`);
  }
}
// ANIM_SPEC 2.0/P5: attack variants share A's contract (same length and impact point, so the same
// pre-impact sum), checked on every unit, old or new.
for (const [slug, cur] of now) {
  const a = cur.clips.attack;
  if (!a) continue;
  for (const v of ['attack_b', 'attack_c']) {
    const c = cur.clips[v];
    if (!c) continue;
    if (c.durationMs !== a.durationMs) errors.push(`${slug}.${v}: durationMs ${c.durationMs} differs from attack ${a.durationMs}`);
    if (c.impactAt !== a.impactAt) errors.push(`${slug}.${v}: impactAt ${c.impactAt} differs from attack ${a.impactAt}`);
  }
}
// Sheet meta: the impact step must start exactly at impactAt (the moment the runtime warps onto the sim hit)
const UNITS = path.join(ROOT, 'public/art/units');
let sheets = 0;
for (const age of readdirSync(UNITS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  for (const file of readdirSync(path.join(UNITS, age)).filter((f) => f.endsWith('.json'))) {
    const clips = JSON.parse(readFileSync(path.join(UNITS, age, file), 'utf8')).meta?.ageborn?.clips ?? {};
    sheets++;
    for (const [name, c] of Object.entries(clips)) {
      if (c.impactAt === undefined || !Array.isArray(c.durationsMs)) continue;
      const d = c.durationsMs;
      const total = d.reduce((a, b) => a + b, 0);
      const seq = Array.isArray(c.sequence) ? c.sequence : null;
      const where = `${age}/${file} ${name}`;
      let step = c.impactStep;
      if (step === undefined && c.impactFrame !== undefined) step = seq ? seq.indexOf(c.impactFrame) : c.impactFrame;
      if (step === undefined) continue;
      if (!Number.isInteger(step) || step <= 0 || step >= d.length) {
        errors.push(`${where}: impact step ${step} out of range (impactFrame ${c.impactFrame})`);
        continue;
      }
      if (c.impactStep !== undefined && c.impactFrame !== undefined && seq && seq[c.impactStep] !== c.impactFrame) errors.push(`${where}: impactStep ${c.impactStep} plays frame ${seq[c.impactStep]}, not impactFrame ${c.impactFrame}`);
      const pre = d.slice(0, step).reduce((a, b) => a + b, 0);
      if (Math.abs(pre - c.impactAt * total) > 0.5) errors.push(`${where}: the impact step ${step} starts at ${pre} ms, impactAt says ${(c.impactAt * total).toFixed(1)} ms`);
      if (c.holdStep !== undefined && !(Number.isInteger(c.holdStep) && c.holdStep >= 0 && c.holdStep < step)) errors.push(`${where}: holdStep ${c.holdStep} is not a step before the impact step ${step}`);
      if (c.holdLoop !== undefined && !(Array.isArray(c.holdLoop) && c.holdLoop.length === 2 && c.holdLoop.every((s) => Number.isInteger(s) && s >= 0 && s < step))) errors.push(`${where}: holdLoop ${JSON.stringify(c.holdLoop)} must be two steps before the impact step ${step}`);
    }
  }
}
if (errors.length) {
  console.error(`timing changed against ${ref}:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`timing unchanged against ${ref} (${before.size} units); impact steps agree with impactAt in ${sheets} sheets`);
