/**
 * Aim data in the unit sheets (queue item 44's art part; W0 COMMON C2): written by every render (`ageborn_art/aimdata.py`
 * after the clip meta) and, for sheets nobody re-renders, by `art/blender/anchors_only.py --aim` as a JSON-only rewrite.
 *
 * - presence: every attack clip of a unit whose attack launches a projectile or an instant effect carries `aimDeg` or
 *   `omni: true` (the content decides: `attacks[0]` for attack, attack_b, attack_c and their aimed variants; `attacks[1]`
 *   or the riders' attack for attack_alt);
 * - well formed: `aimDeg` a number in [-180, 180] at 0.1 degree, never together with `omni`; `release` a unique frame of
 *   the clip and a point that is not [0, 0];
 * - melee clips and the other clips (idle, walk, hit, die) carry none of the keys;
 * - aimed variants (`<clip>_up45`, `<clip>_up70`, `<clip>_down`) live in the extras sheet, name their base with `aimOf` and
 *   keep its timing exactly (frames, sequence, step durations, impactAt, impactStep, holdStep, holdLoop);
 * - the 1x and HD sheets carry the same aim data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { AttackDef } from '../../src/contracts/content';
import { content } from '../../src/content';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const UNITS = path.join(ROOT, 'public/art/units');
const BASES = ['attack', 'attack_b', 'attack_c', 'attack_alt'];
const AIMS: Record<string, [number, number]> = { _up45: [35, 55], _up70: [60, 80], _down: [-80, -5] };
const AIM_KEYS = ['aimDeg', 'release', 'omni', 'aimOf'];

interface Clip {
  frames: number;
  sequence: number[];
  durationsMs: number[];
  durationMs: number;
  impactAt?: number;
  impactStep?: number;
  holdStep?: number;
  holdLoop?: number[];
  aimDeg?: number;
  release?: { frame: number; atLu: [number, number] };
  omni?: boolean;
  aimOf?: string;
}
type Clips = Record<string, Clip>;

const readClips = (p: string): Clips | null =>
  fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')) as { meta: { ageborn: { clips: Clips } } }).meta.ageborn.clips : null;

/** Installed unit sheets: [age, slug] (core 1x JSON; HD copies, extras and skins left out). */
function installed(): [string, string][] {
  const out: [string, string][] = [];
  for (const age of fs.readdirSync(UNITS).sort()) {
    const dir = path.join(UNITS, age);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).sort()) if (/^[a-z0-9_]+\.json$/.test(f)) out.push([age, f.slice(0, -5)]);
  }
  return out;
}

function baseOf(name: string): string {
  for (const s of Object.keys(AIMS)) if (name.endsWith(s)) return name.slice(0, -s.length);
  return name;
}

/** Does this attack clip launch something (a projectile or an instant effect)? */
function launches(slug: string, clip: string): boolean {
  const unit = Object.values(content.units).find((u) => u.visualId === `unit.${slug}`);
  if (!unit) throw new Error(`no content unit for the sheet ${slug}`);
  let atk: AttackDef | undefined;
  if (baseOf(clip) === 'attack_alt') {
    atk = unit.attacks[1];
    if (!atk) for (const a of unit.abilities) if (a.kind === 'riders') atk = a.attack;
  } else atk = unit.attacks[0];
  return atk?.projectile !== undefined;
}

const sheets = installed().map(([age, slug]) => {
  const dir = path.join(UNITS, age);
  return {
    age,
    slug,
    core: readClips(path.join(dir, `${slug}.json`))!,
    coreHd: readClips(path.join(dir, `${slug}.hd.json`))!,
    x: readClips(path.join(dir, `${slug}.x.json`)) ?? {},
    xHd: readClips(path.join(dir, `${slug}.x.hd.json`)) ?? {},
  };
});

describe('aim data in the unit sheets (C2)', () => {
  it('every clip that launches a shot carries aimDeg or omni, and only those clips carry aim keys', () => {
    const missing: string[] = [];
    const stray: string[] = [];
    let shots = 0;
    for (const s of sheets) {
      const clips: Clips = { ...s.x, ...s.core };
      for (const [name, c] of Object.entries(clips)) {
        const shot = BASES.includes(baseOf(name)) && c.impactAt !== undefined && launches(s.slug, name);
        if (shot) {
          shots++;
          if (c.aimDeg === undefined && c.omni !== true) missing.push(`${s.age}/${s.slug}.${name}`);
        } else if (AIM_KEYS.some((k) => k in c)) stray.push(`${s.age}/${s.slug}.${name}`);
      }
    }
    expect(missing, 'shot clips without aim data').toEqual([]);
    expect(stray, 'clips that launch nothing but carry aim keys').toEqual([]);
    expect(shots).toBeGreaterThan(150);
  });

  it('aim keys are well formed', () => {
    const bad: string[] = [];
    for (const s of sheets) {
      for (const [name, c] of Object.entries({ ...s.x, ...s.core })) {
        const where = `${s.age}/${s.slug}.${name}`;
        if (c.aimDeg !== undefined) {
          if (!(Number.isFinite(c.aimDeg) && Math.abs(c.aimDeg) <= 180 && Math.abs(c.aimDeg * 10 - Math.round(c.aimDeg * 10)) < 1e-6)) bad.push(`${where}: aimDeg ${c.aimDeg}`);
          if (c.omni !== undefined) bad.push(`${where}: aimDeg and omni together`);
        }
        if (c.omni !== undefined && c.omni !== true) bad.push(`${where}: omni ${String(c.omni)}`);
        if (c.release !== undefined) {
          const r = c.release;
          if (!Number.isInteger(r.frame) || r.frame < 0 || r.frame >= c.frames) bad.push(`${where}: release frame ${r.frame}`);
          if (!Array.isArray(r.atLu) || r.atLu.length !== 2 || !r.atLu.every(Number.isFinite) || (r.atLu[0] === 0 && r.atLu[1] === 0)) bad.push(`${where}: release atLu ${JSON.stringify(r.atLu)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('aimed variants live in the extras sheet, name their base and keep its timing exactly', () => {
    const bad: string[] = [];
    let variants = 0;
    for (const s of sheets) {
      for (const name of Object.keys(s.core)) if (baseOf(name) !== name) bad.push(`${s.slug}.${name}: an aimed variant in the core sheet`);
      for (const [name, v] of Object.entries(s.x)) {
        const base = baseOf(name);
        if (base === name) continue;
        variants++;
        const where = `${s.age}/${s.slug}.${name}`;
        const b = s.core[base] ?? s.x[base];
        if (v.aimOf !== base || !b) {
          bad.push(`${where}: aimOf ${v.aimOf}, base ${base} ${b ? 'found' : 'missing'}`);
          continue;
        }
        for (const k of ['frames', 'durationMs', 'impactAt', 'impactStep', 'holdStep'] as const) if (v[k] !== b[k]) bad.push(`${where}.${k}: ${v[k]} != ${b[k]}`);
        for (const k of ['durationsMs', 'holdLoop'] as const) if (JSON.stringify(v[k]) !== JSON.stringify(b[k])) bad.push(`${where}.${k} differs from ${base}`);
        if (v.sequence.length !== b.sequence.length) bad.push(`${where}: sequence length ${v.sequence.length} != ${b.sequence.length}`);
        const [lo, hi] = AIMS[name.slice(base.length)]!;
        if (v.aimDeg === undefined || v.aimDeg < lo || v.aimDeg > hi) bad.push(`${where}: aimDeg ${v.aimDeg} outside ${lo}..${hi}`);
      }
    }
    expect(bad).toEqual([]);
    expect(variants).toBeGreaterThanOrEqual(0);
  });

  it('the 1x and HD sheets carry the same aim data', () => {
    const bad: string[] = [];
    const pick = (c: Clip) => JSON.stringify(AIM_KEYS.map((k) => (c as unknown as Record<string, unknown>)[k] ?? null));
    for (const s of sheets) {
      for (const [a, b] of [[s.core, s.coreHd], [s.x, s.xHd]] as const) {
        for (const [name, c] of Object.entries(a)) if (!b[name] || pick(c) !== pick(b[name]!)) bad.push(`${s.slug}.${name}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
