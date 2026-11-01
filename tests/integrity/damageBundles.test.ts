/**
 * Damage bundles (queue item 40, item 38 B0; W0 COMMON C1, item40 appendix B): `public/art/damage/<age>.json`, written by
 * `art/blender/anchors_only.py --bundles` (no Cycles) and merged by every render's install.
 *
 * - every installed unit sheet has an entry in its age's bundle, and every entry belongs to an installed sheet
 *   (a skin's `<slug>@<skinId>` entry to its unit);
 * - an entry lists exactly the sheet's clips (core and extras) with one value per unique frame;
 * - the vocabulary and the shapes are C1's: family, spot kinds and materials, mark radius, rounding to 0.1 lu,
 *   integer degrees and percents, ordered boxes;
 * - the data agrees with the pixels: every head point lies inside its frame as packed and every torso box overlaps it;
 * - the eight representative units (one per family) carry 4-5 marks the camera sees, strips on team cloth, and every
 *   visible mark or strip lies on its frame.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const UNITS = path.join(ROOT, 'public/art/units');
const DAMAGE = path.join(ROOT, 'public/art/damage');

const FAMILIES = ['soldier', 'armoured', 'beast', 'rider', 'vehicle', 'flyer', 'mech', 'energy'];
const SURFACE_MATS = ['cloth', 'hide', 'metal', 'wood', 'stone', 'glass', 'energy'];
const EMIT_MEDIA = ['smoke', 'steam', 'spark', 'breath', 'motes'];
/** The eight representative units W0 authors spots for, one per family (DATA brief, step 2). */
const SPOTTED: Record<string, string> = {
  spear_hunter: 'soldier',
  hoplite: 'armoured',
  sabertooth: 'beast',
  destrier_knight: 'rider',
  armoured_car: 'vehicle',
  gyrocopter: 'flyer',
  steam_golem: 'mech',
  holo_projector: 'energy',
};

type Box = [number, number, number, number];
type SpotFrame = [number, number, number, number, number];
interface Spot { id: string; kind: string; mat: string; r: number; team?: boolean }
interface Entry {
  family: string;
  spots?: Spot[];
  clips?: Record<string, Record<string, SpotFrame[]>>;
  torso: Record<string, Box[]>;
  head: Record<string, [number, number][]>;
}
interface Bundle { v: number; units: Record<string, Entry> }
interface Frame { spriteSourceSize: { x: number; y: number; w: number; h: number } }
interface ClipMeta { frames: number; sequence: number[] }
interface Sheet {
  frames: Record<string, Frame>;
  animations: Record<string, string[]>;
  meta: { ageborn: { pxPerLu: number; feetPx: [number, number]; clips: Record<string, ClipMeta> } };
}

const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

/** Installed unit sheets: age -> slugs (core 1x JSON; HD copies, extras and skins left out). */
function installed(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const age of fs.readdirSync(UNITS).sort()) {
    const dir = path.join(UNITS, age);
    if (!fs.statSync(dir).isDirectory()) continue;
    out.set(age, fs.readdirSync(dir).filter((f) => /^[a-z0-9_]+\.json$/.test(f)).map((f) => f.slice(0, -5)).sort());
  }
  return out;
}

/** The HD core and extras sheets of a unit, merged: clips, frames and animations. */
function hdSheet(age: string, slug: string): { clips: Record<string, ClipMeta>; frames: Record<string, Frame>; anims: Record<string, string[]>; px: number; feet: [number, number] } {
  const core = readJson<Sheet>(path.join(UNITS, age, `${slug}.hd.json`));
  const clips = { ...core.meta.ageborn.clips };
  const frames = { ...core.frames };
  const anims = { ...core.animations };
  const xp = path.join(UNITS, age, `${slug}.x.hd.json`);
  if (fs.existsSync(xp)) {
    const x = readJson<Sheet>(xp);
    for (const [k, v] of Object.entries(x.meta.ageborn.clips)) if (!(k in clips)) clips[k] = v;
    Object.assign(frames, x.frames);
    for (const [k, v] of Object.entries(x.animations)) if (!(k in anims)) anims[k] = v;
  }
  return { clips, frames, anims, px: core.meta.ageborn.pxPerLu, feet: core.meta.ageborn.feetPx };
}

const tenth = (v: number): boolean => Number.isFinite(v) && Math.abs(v * 10 - Math.round(v * 10)) < 1e-6;

const sheets = installed();
const bundles = new Map<string, Bundle>();
for (const f of fs.existsSync(DAMAGE) ? fs.readdirSync(DAMAGE).filter((f) => f.endsWith('.json')) : []) {
  bundles.set(f.slice(0, -5), readJson<Bundle>(path.join(DAMAGE, f)));
}

describe('damage bundles (public/art/damage/<age>.json)', () => {
  it('one bundle per age with units, version 1', () => {
    expect([...bundles.keys()].sort()).toEqual([...sheets.keys()].sort());
    for (const [age, b] of bundles) {
      expect(b.v, age).toBe(1);
      expect(Object.keys(b.units).length, age).toBeGreaterThan(0);
    }
  });

  it('every installed unit sheet has an entry, and every entry has a sheet', () => {
    for (const [age, slugs] of sheets) {
      const units = bundles.get(age)?.units ?? {};
      expect(slugs.filter((s) => !(s in units)), `${age}: sheets without an entry`).toEqual([]);
      const stray = Object.keys(units).filter((k) => !slugs.includes(k.split('@')[0]!));
      expect(stray, `${age}: entries without a sheet`).toEqual([]);
    }
  });

  it('every entry is well formed (C1) and lists the sheet clips with one value per unique frame', () => {
    for (const [age, b] of bundles) {
      for (const [key, e] of Object.entries(b.units)) {
        const where = `${age}/${key}`;
        const sheet = hdSheet(age, key.split('@')[0]!);
        const clipNames = Object.keys(sheet.clips).sort();
        expect(FAMILIES, where).toContain(e.family);
        expect(Object.keys(e.torso).sort(), `${where} torso clips`).toEqual(clipNames);
        expect(Object.keys(e.head).sort(), `${where} head clips`).toEqual(clipNames);
        for (const clip of clipNames) {
          const n = sheet.clips[clip]!.frames;
          expect(e.torso[clip]!.length, `${where} torso.${clip}`).toBe(n);
          expect(e.head[clip]!.length, `${where} head.${clip}`).toBe(n);
          for (const t of e.torso[clip]!) {
            expect(t.length).toBe(4);
            expect(t.every(tenth), `${where} torso.${clip} ${t}`).toBe(true);
            expect(t[0] < t[2] && t[1] < t[3], `${where} torso.${clip} ${t}: x0 < x1, y0 < y1`).toBe(true);
          }
          for (const h of e.head[clip]!) expect(h.length === 2 && h.every(tenth), `${where} head.${clip} ${h}`).toBe(true);
        }
        expect(e.spots === undefined, `${where}: spots and clips come together`).toBe(e.clips === undefined);
        if (!e.spots || !e.clips) continue;
        const ids = e.spots.map((s) => s.id);
        expect(new Set(ids).size, `${where} spot ids unique`).toBe(ids.length);
        for (const s of e.spots) {
          expect(['mark', 'strip', 'emit'], `${where} ${s.id}`).toContain(s.kind);
          expect(s.kind === 'emit' ? EMIT_MEDIA : SURFACE_MATS, `${where} ${s.id} mat`).toContain(s.mat);
          expect(s.r, `${where} ${s.id} r`).toBeGreaterThan(0);
          if (s.kind === 'mark') expect(s.r, `${where} ${s.id}: a mark's patch is at least 5 lu`).toBeGreaterThanOrEqual(5);
          if (s.team !== undefined) expect(s.team).toBe(true);
        }
        expect(Object.keys(e.clips).sort(), `${where} spot clips`).toEqual(clipNames);
        for (const clip of clipNames) {
          expect(Object.keys(e.clips[clip]!).sort(), `${where} clips.${clip}`).toEqual([...ids].sort());
          for (const id of ids) {
            const frs = e.clips[clip]![id]!;
            expect(frs.length, `${where} clips.${clip}.${id}`).toBe(sheet.clips[clip]!.frames);
            for (const [x, y, rot, scale, vis] of frs) {
              expect(tenth(x) && tenth(y), `${where} ${clip}.${id} position`).toBe(true);
              expect(Number.isInteger(rot) && rot >= -180 && rot <= 180, `${where} ${clip}.${id} rot ${rot}`).toBe(true);
              expect(Number.isInteger(scale) && scale > 0 && scale < 400, `${where} ${clip}.${id} scale ${scale}`).toBe(true);
              expect(Number.isInteger(vis) && vis >= 0 && vis <= 100, `${where} ${clip}.${id} vis ${vis}`).toBe(true);
            }
          }
        }
      }
    }
  });

  it('every head lies inside its frame as packed, and every torso box overlaps it', () => {
    const bad: string[] = [];
    for (const [age, b] of bundles) {
      for (const [key, e] of Object.entries(b.units)) {
        const sheet = hdSheet(age, key.split('@')[0]!);
        for (const [clip, meta] of Object.entries(sheet.clips)) {
          const names = sheet.anims[clip] ?? [];
          const teams = sheet.anims[`${clip}_team`] ?? [];
          for (let i = 0; i < meta.frames; i++) {
            const step = meta.sequence.indexOf(i);
            const box = frameBoxLu(sheet, [names[step], teams[step]]);
            if (!box) continue;
            const [hx, hy] = e.head[clip]![i]!;
            const m = 2;
            if (hx < box[0] - m || hx > box[2] + m || hy < box[1] - m || hy > box[3] + m) bad.push(`${age}/${key} ${clip}[${i}] head (${hx}, ${hy}) outside ${box.map((v) => v.toFixed(1))}`);
            const [x0, y0, x1, y1] = e.torso[clip]![i]!;
            if (x1 < box[0] || x0 > box[2] || y1 < box[1] || y0 > box[3]) bad.push(`${age}/${key} ${clip}[${i}] torso outside the frame`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  }, 60_000);

  it('the eight representative units carry spots for their family: 4-5 marks the camera sees, strips on team cloth', () => {
    const fams = new Set<string>();
    const bad: string[] = [];
    for (const [slug, family] of Object.entries(SPOTTED)) {
      const age = [...bundles.keys()].find((a) => bundles.get(a)!.units[slug] !== undefined);
      const e = age === undefined ? undefined : bundles.get(age)!.units[slug];
      expect(e?.spots, `${slug}: spots`).toBeDefined();
      if (!e?.spots || !e.clips || age === undefined) continue;
      expect(e.family, slug).toBe(family);
      fams.add(e.family);
      const marks = e.spots.filter((s) => s.kind === 'mark');
      expect(marks.length, `${slug}: 4-5 marks`).toBeGreaterThanOrEqual(4);
      expect(marks.length, `${slug}: 4-5 marks`).toBeLessThanOrEqual(5);
      for (const s of e.spots.filter((x) => x.kind === 'strip')) expect(s.team, `${slug} ${s.id}: strips hang from team cloth`).toBe(true);
      // a mark sits where the camera sees it: its median visibility over idle, walk and attack is at least 50%
      for (const s of marks) {
        const vis = ['idle', 'walk', 'attack'].flatMap((c) => (e.clips![c]?.[s.id] ?? []).map((f) => f[4])).sort((a, b) => a - b);
        const median = vis[Math.floor(vis.length / 2)] ?? 0;
        if (median < 50) bad.push(`${slug} ${s.id}: median visibility ${median}% over idle, walk and attack`);
      }
      // a visible mark or strip lies on its frame as packed
      const sheet = hdSheet(age, slug);
      for (const [clip, meta] of Object.entries(sheet.clips)) {
        const names = sheet.anims[clip] ?? [];
        const teams = sheet.anims[`${clip}_team`] ?? [];
        for (let i = 0; i < meta.frames; i++) {
          const box = frameBoxLu(sheet, [names[meta.sequence.indexOf(i)], teams[meta.sequence.indexOf(i)]]);
          if (!box) continue;
          for (const s of e.spots) {
            if (s.kind === 'emit') continue;
            const [x, y, , , vis] = e.clips[clip]![s.id]![i]!;
            if (vis > 0 && (x < box[0] - 2 || x > box[2] + 2 || y < box[1] - 2 || y > box[3] + 2)) bad.push(`${slug} ${clip}[${i}] ${s.id} (${x}, ${y}) off the frame`);
          }
        }
      }
    }
    expect([...fams].sort()).toEqual([...FAMILIES].sort());
    expect(bad).toEqual([]);
  });
});

/** A packed frame's trim (base and team frames together) in lu from the feet, y up; null for an empty frame. */
function frameBoxLu(sheet: { frames: Record<string, Frame>; px: number; feet: [number, number] }, names: (string | undefined)[]): Box | null {
  let box: Box | null = null;
  for (const n of names) {
    const f = n ? sheet.frames[n] : undefined;
    if (!f) continue;
    const s = f.spriteSourceSize;
    if (s.w <= 1 && s.h <= 1) continue;
    const b: Box = [(s.x - sheet.feet[0]) / sheet.px, (sheet.feet[1] - s.y - s.h) / sheet.px, (s.x + s.w - sheet.feet[0]) / sheet.px, (sheet.feet[1] - s.y) / sheet.px];
    box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
  }
  return box;
}
