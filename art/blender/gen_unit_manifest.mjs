#!/usr/bin/env node
/* global process, console */
/**
 * Writes `src/visuals/unitSheets.gen.ts`: a compact summary of every unit sheet installed in
 * `public/art/units/<age>/<slug>.json` (heights, anchors, clip timing), so the visual manifest
 * can point `unit.<slug>` at its sheet without bundling the sheet JSON (DESIGN B5, B16), and
 * `src/visuals/skinSheets.gen.ts`: the same summary for every troop skin rendered as a sheet
 * (`<slug>@<skinId>.json`, queue item 46, contract C3 below).
 *
 *   node art/blender/gen_unit_manifest.mjs          # regenerate after installing sheets
 *   node art/blender/gen_unit_manifest.mjs --check  # exit 1 when a file is stale
 *
 * Rerunnable and idempotent: the output depends only on the installed sheets (sorted), so a run after a
 * merge writes the same bytes on every machine. A malformed skin sheet (or aimed clip) fails the run with
 * the reason, so nothing half-valid reaches the game.
 *
 * The static muzzle anchor is the attack clip's per-frame `muzzle` at the impact frame (where the
 * projectile leaves), falling back to the sheet-wide `anchorsLu.muzzle`, then to chest height.
 *
 * Animation standard (ANIM_SPEC 2026-10-02, P4/P5): attack variants `attack_b` and `attack_c` and the
 * second attacker's `attack_alt` may live in the core sheet or in an extras sheet next to it
 * (`<slug>.x.json`, `<slug>.x.hd.json`, loaded lazily by the game). Their clips are listed with the
 * core clips (the core sheet wins on a name clash), and `meta.ageborn.gait` is copied when present.
 *
 * Aim data (queue item 44's art part, contract C2): a shot clip's `aimDeg`, `release` (`{ frame, atLu }`)
 * and `omni` are copied into its summary, and the aimed variants (`<clip>_up45`, `<clip>_up70`,
 * `<clip>_down`, with `aimOf: "<clip>"`, in the extras sheet) are listed like the other extras clips; an
 * aimed variant must keep its base clip's timing exactly.
 *
 * Skin sheets (contract C3): `<slug>@<skinId>[.x][.hd].{png,json}` next to the unit's own sheets, the same
 * format, clips, frame counts, step durations, impact frames and anchor keys, with `meta.ageborn.visualId =
 * "unit.<slug>@<skinId>"`, `skinOf = "unit.<slug>"`, `skin = "<skinId>"`, frame names prefixed
 * `<slug>@<skinId>_`, and an extras sheet with `extrasOf: "<slug>@<skinId>"` exactly when the unit has one.
 * A skin's card still is used when both `art/portraits/<slug>@<skinId>.png` and `_team.png` exist (`still`).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const UNITS = path.join(ROOT, 'public', 'art', 'units');
const PORTRAITS = path.join(ROOT, 'public', 'art', 'portraits');
const OUT = path.join(ROOT, 'src', 'visuals', 'unitSheets.gen.ts');
const SKIN_OUT = path.join(ROOT, 'src', 'visuals', 'skinSheets.gen.ts');
const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

const r1 = (v) => Math.round(v * 10) / 10;
const pt = (v) => [r1(v[0]), r1(v[1])];

const GAITS = ['biped', 'heavy', 'quad', 'rider', 'wheeled', 'tracked', 'walker', 'hover', 'fly'];
/** Clips an extras sheet may add (the game loads `<slug>.x.json` only for these and their aimed variants). */
const EXTRA_CLIPS = ['attack_b', 'attack_c', 'attack_alt'];
/** The shot clips that may have aimed variants (C2). */
const AIMED_BASES = ['attack', 'attack_b', 'attack_c', 'attack_alt'];
/** The aimed variants' suffixes (C2): about 45 and 70 degrees up, and down. */
export const AIM_SUFFIXES = ['up45', 'up70', 'down'];
/** Timing an aimed variant shares exactly with its base clip (C2). */
const AIMED_TIMING = ['durationMs', 'durationsMs', 'impactAt', 'impactStep', 'holdStep', 'frames'];

/** A skin id or unit slug: lower case, digits and underscores (`unit.<slug>@<skinId>`). */
const ID = /^[a-z0-9_]+$/;

/** True for the sheet JSON files that are not a core 1x sheet (HD copies, extras sheets). */
export function isCoreSheet(file) {
  return file.endsWith('.json') && !file.endsWith('.hd.json') && !file.endsWith('.x.json');
}

/** `bonker.json` → { slug: 'bonker', skin: null }; `bonker@pumpkin_head.json` → { slug: 'bonker', skin: 'pumpkin_head' }. */
export function sheetName(file) {
  const base = file.replace(/\.json$/, '');
  const at = base.indexOf('@');
  return at < 0 ? { slug: base, skin: null } : { slug: base.slice(0, at), skin: base.slice(at + 1) };
}

/** The base clip of an aimed variant (`attack_b_up45` → `attack_b`), else null. */
export function aimedBaseOf(name) {
  const m = /^(.+)_(up45|up70|down)$/.exec(name);
  return m && AIMED_BASES.includes(m[1]) ? m[1] : null;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Problems with the aim data of a sheet's clips (C2), core and extras together: an aimed variant that does not
 * name its base, has no aim, or does not keep its base clip's timing exactly; a release without a real point.
 */
export function aimProblems(clips, where) {
  const out = [];
  for (const [name, c] of Object.entries(clips)) {
    if (c.release !== undefined) {
      const r = c.release;
      const ok = r && typeof r === 'object' && !Array.isArray(r) && Number.isInteger(r.frame) && r.frame >= 0 && Array.isArray(r.atLu) && r.atLu.length === 2 && r.atLu.every(Number.isFinite);
      if (!ok) out.push(`${where} ${name}: release must be { frame, atLu: [x, y] }, got ${JSON.stringify(r)}`);
      else if (r.atLu[0] === 0 && r.atLu[1] === 0) out.push(`${where} ${name}: release.atLu is [0, 0] (leave it out when there is no real point)`);
    }
    if (c.aimDeg !== undefined && !Number.isFinite(c.aimDeg)) out.push(`${where} ${name}: aimDeg ${JSON.stringify(c.aimDeg)} is not a number`);
    const base = aimedBaseOf(name);
    if (c.aimOf === undefined && base === null) continue;
    if (base === null) {
      out.push(`${where} ${name}: aimOf "${c.aimOf}" on a clip that is not named <clip>_up45, _up70 or _down`);
      continue;
    }
    if (c.aimOf !== base) out.push(`${where} ${name}: aimOf must be "${base}", got ${JSON.stringify(c.aimOf)}`);
    if (!Number.isFinite(c.aimDeg)) out.push(`${where} ${name}: an aimed variant needs its aimDeg`);
    const b = clips[base];
    if (!b) {
      out.push(`${where} ${name}: its base clip "${base}" is not in the sheet`);
      continue;
    }
    for (const k of AIMED_TIMING) if (!same(c[k], b[k])) out.push(`${where} ${name}: ${k} ${JSON.stringify(c[k])} differs from ${base}'s ${JSON.stringify(b[k])}`);
    if ((c.sequence?.length ?? null) !== (b.sequence?.length ?? null)) out.push(`${where} ${name}: sequence length differs from ${base}'s`);
  }
  return out;
}

/** The clips of a core sheet and its extras sheet (the core sheet wins on a name clash). */
function allClips(json, extras) {
  const all = { ...(json.meta?.ageborn?.clips ?? {}) };
  if (extras) {
    // only the variant clips and their aimed versions count from an extras sheet (anything else there is ignored)
    for (const [name, c] of Object.entries(extras.meta?.ageborn?.clips ?? {})) if ((EXTRA_CLIPS.includes(name) || aimedBaseOf(name) !== null) && !all[name]) all[name] = c;
  }
  return all;
}

/** One clip's summary: timing, plus the aim data (C2) where the sheet writes it. */
function clipRow(c) {
  const out = { durationMs: c.durationMs ?? (c.durationsMs ?? []).reduce((a, b) => a + b, 0), loop: Boolean(c.loop) };
  if (c.impactAt !== undefined) out.impactAt = Math.round(c.impactAt * 10000) / 10000;
  if (c.aimOf !== undefined) out.aimOf = c.aimOf;
  if (c.aimDeg !== undefined) out.aimDeg = r1(c.aimDeg);
  if (c.release !== undefined) out.release = { frame: c.release.frame, atLu: pt(c.release.atLu) };
  if (c.omni === true) out.omni = true;
  return out;
}

export function summarize(json, age, slug, extras = null) {
  const m = json.meta?.ageborn;
  if (!m) throw new Error(`${age}/${slug}.json has no meta.ageborn`);
  if (extras && !extras.meta?.ageborn) throw new Error(`${age}/${slug}.x.json has no meta.ageborn`);
  const all = allClips(json, extras);
  const bad = aimProblems(all, `${age}/${slug}`);
  if (bad.length > 0) throw new Error(`malformed aim data:\n  ${bad.join('\n  ')}`);
  const clips = {};
  for (const [name, c] of Object.entries(all)) clips[name] = clipRow(c);
  const atk = m.clips.attack ?? {};
  const imp = atk.impactFrame ?? 0;
  const per = atk.anchorsLu ?? {};
  const at = (k) => (Array.isArray(per[k]) && Array.isArray(per[k][imp]) ? per[k][imp] : null);
  // melee units have no muzzle: keep the procedural convention (chest height, just in front)
  const muzzle = at('muzzle') ?? at('beam') ?? m.anchorsLu?.muzzle ?? [10, m.heightLu * 0.55];
  const row = {
    age,
    slug,
    visualId: m.visualId ?? `unit.${slug}`,
    heightLu: m.heightLu,
    pxPerLu: m.pxPerLu,
    anchorsLu: { head: pt(m.anchorsLu?.head ?? [0, m.heightLu]), hitCenter: pt(m.anchorsLu?.hitCenter ?? [0, m.heightLu * 0.5]), muzzle: pt(muzzle) },
    clips,
  };
  if (m.gait !== undefined) {
    if (!GAITS.includes(m.gait)) throw new Error(`${age}/${slug}.json: unknown gait "${m.gait}" (${GAITS.join(', ')})`);
    row.gait = m.gait;
  }
  return row;
}

/** The clip names of a sheet's animations, without the `_team` layers. */
function animNames(json) {
  return Object.keys(json?.animations ?? {})
    .filter((n) => !n.endsWith('_team'))
    .sort();
}

/** The per-frame anchor keys of every clip, as `clip:key` (sorted). */
function anchorKeys(json) {
  const out = [];
  for (const [name, c] of Object.entries(json?.meta?.ageborn?.clips ?? {})) for (const k of Object.keys(c.anchorsLu ?? {})) out.push(`${name}:${k}`);
  for (const k of Object.keys(json?.meta?.ageborn?.anchorsLu ?? {})) out.push(`sheet:${k}`);
  return out.sort();
}

/** The timing of every clip (the contract the sim's impact ticks rely on), by clip name. */
function timingOf(json) {
  const out = {};
  for (const [name, c] of Object.entries(json?.meta?.ageborn?.clips ?? {})) {
    out[name] = { frames: c.frames, durationMs: c.durationMs, durationsMs: c.durationsMs, impactAt: c.impactAt, impactFrame: c.impactFrame, impactStep: c.impactStep, holdStep: c.holdStep, holdLoop: c.holdLoop, loop: c.loop, sequence: c.sequence?.length };
  }
  return out;
}

/**
 * Problems with a skin sheet against its unit's own sheets (contract C3): names and ids, frame names, and the
 * same clips, frame counts, step durations, impact frames, anchor keys and extras as the unit. Each JSON may be
 * null when that file is not installed. `file` is the skin's core sheet name (`<slug>@<skinId>.json`).
 */
export function skinProblems(file, o) {
  const { slug, skin } = sheetName(file);
  const where = `skin sheet ${file}`;
  const out = [];
  if (!skin || !ID.test(slug) || !ID.test(skin)) return [`${where}: the name must be <slug>@<skinId>.json (lower case, digits, underscores)`];
  const s = o.skin?.meta?.ageborn;
  if (!s) return [`${where}: no meta.ageborn`];
  if (!o.unit?.meta?.ageborn) return [`${where}: the unit's own sheet ${slug}.json is not installed`];
  const id = `${slug}@${skin}`;
  if (s.visualId !== `unit.${id}`) out.push(`${where}: meta.ageborn.visualId must be "unit.${id}", got ${JSON.stringify(s.visualId)}`);
  if (s.skinOf !== `unit.${slug}`) out.push(`${where}: meta.ageborn.skinOf must be "unit.${slug}", got ${JSON.stringify(s.skinOf)}`);
  if (s.skin !== skin) out.push(`${where}: meta.ageborn.skin must be "${skin}", got ${JSON.stringify(s.skin)}`);
  const pairs = [
    ['', o.unit, o.skin],
    ['.x', o.unitX, o.skinX],
  ];
  for (const [suffix, unit, sk] of pairs) {
    const name = `${id}${suffix}.json`;
    if (!unit && !sk) continue;
    if (unit && !sk) {
      out.push(`${where}: the unit has ${slug}${suffix}.json, the skin has no ${name}`);
      continue;
    }
    if (!unit && sk) {
      out.push(`${where}: ${name} has no counterpart ${slug}${suffix}.json`);
      continue;
    }
    if (suffix === '.x' && sk.meta?.ageborn?.extrasOf !== id) out.push(`${where}: ${name} must say extrasOf "${id}", got ${JSON.stringify(sk.meta?.ageborn?.extrasOf)}`);
    for (const f of Object.keys(sk.frames ?? {})) if (!f.startsWith(`${id}_`)) out.push(`${where}: frame "${f}" in ${name} is not prefixed "${id}_"`);
    if (!same(animNames(sk), animNames(unit))) out.push(`${where}: ${name} has clips ${animNames(sk).join(', ')}, the unit ${animNames(unit).join(', ')}`);
    for (const a of Object.keys(unit.animations ?? {})) {
      const n = sk.animations?.[a]?.length;
      if (n !== undefined && n !== unit.animations[a].length) out.push(`${where}: ${name} ${a} has ${n} frames, the unit ${unit.animations[a].length}`);
    }
    const t = timingOf(unit);
    const u = timingOf(sk);
    if (!same(Object.keys(u).sort(), Object.keys(t).sort())) out.push(`${where}: ${name} has clip meta for ${Object.keys(u).sort().join(', ')}, the unit ${Object.keys(t).sort().join(', ')}`);
    for (const [clip, ti] of Object.entries(t)) if (u[clip] && !same(u[clip], ti)) out.push(`${where}: ${name} ${clip} timing ${JSON.stringify(u[clip])} differs from the unit's ${JSON.stringify(ti)}`);
    if (!same(anchorKeys(sk), anchorKeys(unit))) out.push(`${where}: ${name} anchor keys ${anchorKeys(sk).join(', ')} differ from the unit's ${anchorKeys(unit).join(', ')}`);
    if (sk.meta?.ageborn?.pxPerLu !== unit.meta?.ageborn?.pxPerLu || String(sk.meta?.scale) !== String(unit.meta?.scale)) out.push(`${where}: ${name} density (pxPerLu ${sk.meta?.ageborn?.pxPerLu}, scale ${sk.meta?.scale}) differs from the unit's`);
  }
  if (s.gait !== o.unit.meta.ageborn.gait) out.push(`${where}: gait ${JSON.stringify(s.gait)} differs from the unit's ${JSON.stringify(o.unit.meta.ageborn.gait)}`);
  if (s.heightLu !== o.unit.meta.ageborn.heightLu) out.push(`${where}: heightLu ${s.heightLu} differs from the unit's ${o.unit.meta.ageborn.heightLu}`);
  return out;
}

/** A skin sheet's summary row: the unit row's fields plus what it is a skin of and whether its card still is installed. */
export function summarizeSkin(file, age, o, still) {
  const bad = skinProblems(file, o);
  if (bad.length > 0) throw new Error(`malformed skin sheet:\n  ${bad.join('\n  ')}`);
  const { slug, skin } = sheetName(file);
  const row = summarize(o.skin, age, `${slug}@${skin}`, o.skinX ?? null);
  return { ...row, skinOf: `unit.${slug}`, skin, still: Boolean(still) };
}

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

/** Every installed sheet of `unitsDir` (`portraitsDir` for the skins' card stills): unit rows and skin rows. */
export function collect(unitsDir = UNITS, portraitsDir = PORTRAITS) {
  const rows = [];
  const skins = [];
  for (const age of AGES) {
    const dir = path.join(unitsDir, age);
    if (!existsSync(dir)) continue;
    // `<slug>.hd.json` is the same sheet at twice the density (picked at runtime on dense screens)
    // `<slug>.x.json` is the lazily loaded extras sheet (attack variants, P4; aimed variants, C2)
    for (const f of readdirSync(dir).filter(isCoreSheet).sort()) {
      const base = f.replace(/\.json$/, '');
      const need = (suffix) => {
        if (!existsSync(path.join(dir, `${base}${suffix}.png`))) throw new Error(`${age}/${base}${suffix}.json has no PNG`);
      };
      need('');
      for (const suffix of ['.hd', '.x', '.x.hd']) if (existsSync(path.join(dir, `${base}${suffix}.json`))) need(suffix);
      const { slug, skin } = sheetName(f);
      if (skin === null) {
        rows.push(summarize(readJson(path.join(dir, f)), age, slug, readJson(path.join(dir, `${slug}.x.json`))));
        continue;
      }
      const o = { unit: readJson(path.join(dir, `${slug}.json`)), unitX: readJson(path.join(dir, `${slug}.x.json`)), skin: readJson(path.join(dir, f)), skinX: readJson(path.join(dir, `${base}.x.json`)) };
      // the HD copies pair up as the 1x ones do (the runtime loads the HD file on dense screens)
      for (const suffix of ['.hd', '.x.hd']) {
        const u = existsSync(path.join(dir, `${slug}${suffix}.json`));
        const s = existsSync(path.join(dir, `${base}${suffix}.json`));
        if (u !== s) throw new Error(`malformed skin sheet:\n  skin sheet ${f}: ${u ? `the unit has ${slug}${suffix}.json, the skin has no ${base}${suffix}.json` : `${base}${suffix}.json has no counterpart ${slug}${suffix}.json`}`);
      }
      const still = existsSync(path.join(portraitsDir, `${base}.png`)) && existsSync(path.join(portraitsDir, `${base}_team.png`));
      skins.push(summarizeSkin(f, age, o, still));
    }
  }
  return { rows, skins };
}

export function render(rows) {
  const lines = rows.map((r) => `  ${JSON.stringify(r)},`);
  return [
    '// Generated by art/blender/gen_unit_manifest.mjs from public/art/units/**. Do not edit by hand.',
    "import type { UnitSheetSummary } from './manifest.units';",
    '',
    'export const UNIT_SHEETS: readonly UnitSheetSummary[] = [',
    ...lines,
    '];',
    '',
  ].join('\n');
}

export function renderSkins(skins) {
  const lines = skins.map((r) => `  ${JSON.stringify(r)},`);
  return [
    '// Generated by art/blender/gen_unit_manifest.mjs from public/art/units/**/<slug>@<skinId>.json (queue item 46). Do not edit by hand.',
    "import type { SkinSheetSummary } from './manifest.units';",
    '',
    '/** Troop skins rendered as sheets (contract C3): each draws in place of its unit\'s sheet. */',
    `export const SKIN_SHEETS: readonly SkinSheetSummary[] = [${lines.length > 0 ? '' : '];'}`,
    ...(lines.length > 0 ? [...lines, '];'] : []),
    '',
  ].join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { rows, skins } = collect();
  const outputs = [
    [OUT, render(rows)],
    [SKIN_OUT, renderSkins(skins)],
  ];
  if (process.argv.includes('--check')) {
    const stale = outputs.filter(([file, text]) => (existsSync(file) ? readFileSync(file, 'utf8') : '') !== text).map(([file]) => path.relative(ROOT, file));
    if (stale.length > 0) {
      console.error(`${stale.join(' and ')} ${stale.length > 1 ? 'are' : 'is'} stale: run node art/blender/gen_unit_manifest.mjs`);
      process.exit(1);
    }
    console.log(`unit sheet summaries are up to date (${rows.length} units, ${skins.length} skins)`);
  } else {
    for (const [file, text] of outputs) {
      if (existsSync(file) && readFileSync(file, 'utf8') === text) continue;
      writeFileSync(file, text);
      console.log(`wrote ${path.relative(ROOT, file)}`);
    }
    console.log(`${rows.length} unit sheets, ${skins.length} skin sheets`);
  }
}
