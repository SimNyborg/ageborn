/**
 * IDs (DESIGN B13 Integrity, A14, B4 Validation, B5): card ids are unique slugs; every visual, effect,
 * sound and music-cue id used by content (and by the feel config) resolves in its manifest; and every id
 * DESIGN lists in A13, A14.1 and A14.3 has a manifest entry.
 *
 * The manifests belong to other packages: visuals (WP4, `src/visuals/manifest.ts`), sounds and music
 * (WP6, `src/audio/sounds.ts`, `src/audio/music.ts`). A check whose manifest does not exist yet skips
 * with the reason instead of failing.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { ROOT, SRC } from './helpers/source';

type Manifest = Record<string, unknown>;

interface Loaded {
  manifest: Manifest | null;
  reason: string;
}

/** Imports `file` and returns its first exported object that has `probe` as a key. */
async function manifestFrom(file: string, probe: string, owner: string): Promise<Loaded> {
  const abs = path.join(SRC, file);
  if (!existsSync(abs)) return { manifest: null, reason: `src/${file} does not exist yet (${owner})` };
  try {
    const mod = (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
    for (const v of Object.values(mod)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && probe in v) return { manifest: v as Manifest, reason: '' };
    }
    return { manifest: null, reason: `src/${file} exports no manifest object with "${probe}" (${owner})` };
  } catch (e) {
    return { manifest: null, reason: `loading src/${file} failed: ${String(e)}` };
  }
}

let visuals: Loaded;
let sounds: Loaded;
let music: Loaded;

beforeAll(async () => {
  [visuals, sounds, music] = await Promise.all([
    manifestFrom('visuals/manifest.ts', 'unit.bonker', 'WP4 visuals'),
    manifestFrom('audio/sounds.ts', 'ui_click', 'WP6 audio'),
    manifestFrom('audio/music.ts', 'music.menu', 'WP6 audio'),
  ]);
}, 60_000);

// ---------------------------------------------------------------------------------------------
// Ids used by content and config.

interface Ref {
  where: string;
  id: string;
}

/** Walks a value and collects string ids under properties accepted by `pick`. */
function collect(value: unknown, trail: string, pick: (key: string, v: unknown) => string[] | null, out: Ref[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collect(v, `${trail}[${i}]`, pick, out));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) {
    const ids = pick(k, v);
    if (ids) for (const id of ids) out.push({ where: `${trail}.${k}`, id });
    else collect(v, `${trail}.${k}`, pick, out);
  }
}

const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v !== null && typeof v === 'object' ? Object.values(v).filter((x): x is string => typeof x === 'string') : []);

function visualRefs(): Ref[] {
  const out: Ref[] = [];
  collect(content, 'content', (k, v) => (/^(visualId|\w+VisualId|effectId)$/.test(k) && typeof v === 'string' ? [v] : null), out);
  return out;
}

function soundRefs(): Ref[] {
  const out: Ref[] = [];
  collect({ units: content.units, turrets: content.turrets, powers: content.powers, skins: content.skins }, 'content', (k, v) => (k === 'sfx' || k === 'sfxOverrides' ? strings(v) : null), out);
  return out;
}

function feelRefs(): { effects: Ref[]; sounds: Ref[] } {
  const feel = JSON.parse(readFileSync(path.join(SRC, 'render', 'feel.config.json'), 'utf8')) as Record<string, unknown>;
  const effects: Ref[] = [];
  const snd: Ref[] = [];
  collect(feel, 'feel', (k, v) => (k === 'effectId' && typeof v === 'string' ? [v] : null), effects);
  collect(feel, 'feel', (k, v) => (/^(sound|sounds)$/.test(k) ? (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : strings(v)) : null), snd);
  const gaps = (feel['tuning'] as { soundGapMs?: Record<string, number> } | undefined)?.soundGapMs ?? {};
  for (const id of Object.keys(gaps)) snd.push({ where: 'feel.tuning.soundGapMs', id });
  // `$name` ids are placeholders the event mapper resolves per event (docs/decisions.md WP5).
  const real = (r: Ref): boolean => !r.id.startsWith('$');
  return { effects: effects.filter(real), sounds: snd.filter(real) };
}

// ---------------------------------------------------------------------------------------------
// Ids DESIGN lists (A13, A14.1, A14.3).

const DESIGN = readFileSync(path.join(ROOT, 'docs', 'DESIGN.md'), 'utf8');

function section(from: string, to: string): string {
  const a = DESIGN.indexOf(from);
  const b = DESIGN.indexOf(to, a + from.length);
  if (a < 0 || b < 0) throw new Error(`DESIGN.md section "${from}" not found`);
  return DESIGN.slice(a, b);
}

const ticks = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1] as string);

/** A14.1: explicit ids plus the `<slug>`, `<age>`, `<arena>` and `<group>` patterns expanded from content. */
function designVisualIds(): string[] {
  const text = section('### A14.1 Visual and effect IDs', '### A14.2');
  const explicit = ticks(text).filter((t) => !t.includes('<') && /^[a-z]+\.[\w.@]+$/.test(t));
  const ages = Object.keys(content.ages);
  const arenas = (content.arenas as { list: { id: string }[] }).list.map((a) => a.id);
  const groups = [...new Set(Object.values(content.units).map((u) => u.group))];
  const expanded = [
    ...Object.values(content.units).filter((u) => !u.hidden).map((u) => `unit.${u.id}`),
    ...Object.keys(content.turrets).map((id) => `turret.${id}`),
    ...Object.keys(content.powers).map((id) => `power.${id}`),
    ...Object.values(content.skins).map((s) => s.visualId),
    ...ages.flatMap((a) => [`base.${a}`, `backdrop.${a}`, `icon.age.${a}`]),
    ...arenas.map((a) => `ground.${a}`),
    ...groups.map((g) => `icon.role.${g}`),
  ];
  return [...new Set([...explicit, ...expanded])].sort();
}

/** A13 sound ids; `evolve_fanfare_stone/medieval/...` expands to one id per suffix. */
function designSoundIds(): string[] {
  const text = section('## A13. Audio: SFX and music', '**Mixer:**');
  const ids: string[] = [];
  for (const t of ticks(text)) {
    const [first, ...rest] = t.split('/');
    if (!first || !/^[a-z][a-z0-9_]*$/.test(first)) continue;
    ids.push(first);
    const stem = first.slice(0, first.lastIndexOf('_') + 1);
    for (const r of rest) ids.push(stem + r);
  }
  return [...new Set(ids)].sort();
}

function designMusicIds(): string[] {
  return ticks(section('### A14.3 Music cues', '# Part B')).filter((t) => /^(music|stinger)\.\w+$/.test(t));
}

// ---------------------------------------------------------------------------------------------

describe('card and skin ids', () => {
  const kinds = { units: content.units, turrets: content.turrets, powers: content.powers, skins: content.skins } as const;

  it('are slugs equal to their record key', () => {
    for (const [kind, rec] of Object.entries(kinds)) {
      for (const [key, def] of Object.entries(rec)) {
        expect(def.id, `${kind}.${key}`).toBe(key);
        expect(key, `${kind}.${key}`).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    }
  });

  it('are unique across units, turrets and powers', () => {
    const all = [...Object.keys(content.units), ...Object.keys(content.turrets), ...Object.keys(content.powers)];
    expect(all.filter((id, i) => all.indexOf(id) !== i)).toEqual([]);
  });

  it('follow the A14.1 visual id conventions', () => {
    // A16.14.8: a fort's hidden twin draws as `fort.<id>`; levies are units.
    for (const u of Object.values(content.units)) expect(u.visualId).toBe(u.fort ? `fort.${u.id}` : `unit.${u.id}`);
    for (const t of Object.values(content.turrets)) expect(t.visualId).toBe(`turret.${t.id}`);
    for (const p of Object.values(content.powers)) expect(p.visualId).toBe(`power.${p.id}`);
    for (const a of Object.values(content.ages)) {
      expect(a.baseVisualId).toBe(`base.${a.id}`);
      expect(a.backdropVisualId).toBe(`backdrop.${a.id}`);
    }
    for (const s of Object.values(content.skins)) {
      const target = s.target.startsWith('base.') ? s.target : (content.units[s.target]?.visualId ?? content.turrets[s.target]?.visualId);
      expect(s.visualId, s.id).toBe(`${target}@${s.id}`);
    }
  });

  it('card references between cards resolve', () => {
    for (const u of Object.values(content.units)) {
      for (const ab of u.abilities) if (ab.kind === 'riders') expect(content.units[ab.onDeathSpawn], `${u.id} riders`).toBeDefined();
      for (const c of [...u.strongVs, ...u.weakVs]) expect(content.units[c], `${u.id} strong/weak ${c}`).toBeDefined();
    }
    for (const p of Object.values(content.powers)) if (p.effect.kind === 'paradrop') expect(content.units[p.effect.card], p.id).toBeDefined();
  });
});

describe('visual and effect ids (B5 manifest)', () => {
  it('every content visualId and effectId resolves', (ctx) => {
    ctx.skip(!visuals.manifest, visuals.reason);
    const refs = visualRefs();
    expect(refs.length).toBeGreaterThan(80);
    expect(refs.filter((r) => !(r.id in (visuals.manifest as Manifest))).map((r) => `${r.where} = ${r.id}`)).toEqual([]);
  });

  it('every effect id in the feel config resolves', (ctx) => {
    ctx.skip(!visuals.manifest, visuals.reason);
    const refs = feelRefs().effects;
    expect(refs.length).toBeGreaterThan(5);
    expect(refs.filter((r) => !(r.id in (visuals.manifest as Manifest))).map((r) => `${r.where} = ${r.id}`)).toEqual([]);
  });

  it('every id listed in A14.1 has a manifest entry', (ctx) => {
    ctx.skip(!visuals.manifest, visuals.reason);
    const ids = designVisualIds();
    expect(ids.length).toBeGreaterThan(150);
    expect(ids.filter((id) => !(id in (visuals.manifest as Manifest)))).toEqual([]);
  });
});

describe('sound ids (A13, B7 manifest)', () => {
  it('parses the A13 list', () => {
    const ids = designSoundIds();
    expect(ids).toContain('ui_click');
    expect(ids).toContain('evolve_fanfare_future');
    expect(ids.length).toBeGreaterThan(100);
  });

  it('every content sound id is an A13 id', () => {
    const a13 = new Set(designSoundIds());
    expect(soundRefs().filter((r) => !a13.has(r.id)).map((r) => `${r.where} = ${r.id}`)).toEqual([]);
  });

  it('every content sound id resolves in the sound manifest', (ctx) => {
    ctx.skip(!sounds.manifest, sounds.reason);
    expect(soundRefs().filter((r) => !(r.id in (sounds.manifest as Manifest))).map((r) => `${r.where} = ${r.id}`)).toEqual([]);
  });

  it('every sound id in the feel config resolves', (ctx) => {
    ctx.skip(!sounds.manifest, sounds.reason);
    expect(feelRefs().sounds.filter((r) => !(r.id in (sounds.manifest as Manifest))).map((r) => `${r.where} = ${r.id}`)).toEqual([]);
  });

  it('every id listed in A13 has a manifest entry', (ctx) => {
    ctx.skip(!sounds.manifest, sounds.reason);
    expect(designSoundIds().filter((id) => !(id in (sounds.manifest as Manifest)))).toEqual([]);
  });
});

describe('music cue ids (A14.3)', () => {
  it('every age music cue is an A14.3 cue', () => {
    const cues = designMusicIds();
    expect(cues).toContain('music.menu');
    for (const a of Object.values(content.ages)) expect(cues, a.id).toContain(a.musicCue);
  });

  it('every A14.3 cue resolves in the music manifest', (ctx) => {
    ctx.skip(!music.manifest, music.reason);
    expect(designMusicIds().filter((id) => !(id in (music.manifest as Manifest)))).toEqual([]);
  });
});
