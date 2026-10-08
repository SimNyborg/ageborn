/**
 * Base skins and the base dressing (DESIGN A18.9.4; PLAN 2c): every released base skin has art (its model,
 * or its tint fallback until the model ships), the Customize preview's tint and particle layers, the model
 * thumbnail hook, and the dressing that seats the flags and decorations in their anchors (mirrored for
 * side 1), restyles the base and cleans up.
 *
 * Base skins as real models (PLAN 2c "Constraints for every model"): every model sheet keeps the standard
 * base's contract (4 crumble frames with team twins, flag loops, Treasury, the shared mounts with their
 * trackers within 0.5 lu), its footprint and height band within 5% of the standard base, the dressing
 * anchors clear, at least the standard's team-pixel share minus 3 points, unique frame names and its size
 * budget; the provider resolves each age's own skin through an evolve, loads a model lazily with the tint
 * standing in, and the collapse uses the model's own topple data. Owned by Track B.
 */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import type { BaseView, VisualDef } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { content } from '@/content';
import { PartBaker } from '../bake';
import { cosmeticImageUrl, cosmeticSvg, hasCosmeticArt } from '../cosmetics/art';
import { baseSkinArt, baseSkinThumbUrl, BASE_SKINS, hasBaseSkinArt, hasBaseSkinModel } from '../cosmetics/baseSkins';
import { BaseDressing, DRESSING_ANCHORS } from '../cosmetics/dressing';
import { MANIFEST } from '../manifest';
import { BASE_COLLAPSE_MS, baseSheetSource, baseSkinCollapseSource, baseSkinSheetSource, WORLD_BASE_MOUNTS_LU, WORLD_BASE_SKIN_KITS, WORLD_BASE_SKINS } from '../manifest.world';
import { createArtProvider } from '../provider';
import { AtlasBaseView } from '../adapters/world/atlasBaseView';
import { collapseProfile, collapseProfileFor } from '../adapters/world/collapse/profiles';
import { isBaseSkinSource, isWorldSource, WorldAtlas, worldSourceAge, type WorldMeta, type WorldSheet } from '../adapters/worldAtlas';

const FROST = BASE_SKINS.frost_cave!.tint;
const ROSE = BASE_SKINS.rose_keep!.tint;
const skins = content.cosmetics.collections.items.filter((x) => x.collection === 'baseSkin' && x.released !== false);

function fakeBase(): BaseView & { tints: (number | null)[] } {
  const tints: (number | null)[] = [];
  return {
    root: new Container(),
    tints,
    mountPoints: () => [],
    setCrumble: () => {},
    setTreasury: () => {},
    morphTo: () => {},
    lastStandGlow: () => {},
    hit: () => {},
    collapse: () => {},
    update: () => {},
    destroy: () => {},
    setSkinTint: (t: number | null) => tints.push(t),
  } as BaseView & { tints: (number | null)[]; setSkinTint: (t: number | null) => void };
}

describe('base skins', () => {
  it('draws every released base skin of the content', () => {
    for (const x of skins) expect(hasBaseSkinArt(x.id) && hasCosmeticArt('baseSkin', x.id), x.id).toBe(true);
  });

  it('reads the lane look from a baseSkin key only', () => {
    expect(baseSkinArt('baseSkin.frost_cave')).toBe(BASE_SKINS.frost_cave);
    expect(baseSkinArt('decoration.fern')).toBeNull();
    expect(baseSkinArt(null)).toBeNull();
  });

  it('has no pre-rendered thumbnail until the model atlas is in', () => {
    expect(baseSkinThumbUrl('frost_cave')).toBeNull();
  });
});

describe('the base skin of every age (createBase `skins`, save v14)', () => {
  it('each age resolves its own skin through an evolve; a skin without a model draws the plain base silently', () => {
    const warn = vi.fn();
    const art = createArtProvider({ warn, dpr: 1 });
    // Stone wears a cosmetic skin still on its tint (no model yet), Future the troop-system Crystal Spire
    const b = art.createBase({ age: 'stone', skins: { stone: 'frost_cave', future: 'crystal_spire' }, side: 0, teamPreset: 'default' });
    expect(b.root.label).toBe('base.stone');
    b.morphTo('future', 1800);
    for (let t = 0; t < 1900; t += 50) b.update(50);
    expect(b.root.label).toBe('base.future@crystal_spire');
    b.destroy();
    // `skins[age]` wins over the older single `skin`
    const c = art.createBase({ age: 'future', skin: 'crystal_spire', skins: { future: 'midnight_neon' }, side: 1, teamPreset: 'default' });
    expect(c.root.label).toBe('base.future');
    c.destroy();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('base skin layers for the Customize preview', () => {
  it('gives a tint swatch and a particle layer for base skins only, still under Reduce motion', () => {
    const tint = cosmeticSvg('baseSkin.frost_cave', { layer: 'tint' })!;
    expect(tint).toContain(`#${FROST.toString(16).padStart(6, '0')}`);
    expect(cosmeticSvg('baseSkin.frost_cave', { layer: 'fx' })).toContain('<animate');
    expect(cosmeticSvg('baseSkin.frost_cave', { layer: 'fx', animate: false })).not.toContain('<animate');
    expect(cosmeticSvg('nationalFlag.dk', { layer: 'tint' })).toBeNull();
    expect(cosmeticImageUrl('baseSkin.frost_cave', { layer: 'tint' })).not.toBe(cosmeticImageUrl('baseSkin.frost_cave'));
  });
});

describe('base dressing (A18.9.4)', () => {
  const look = {
    baseFlag: 'baseFlag.mammoth',
    nationalFlag: 'nationalFlag.dk',
    baseSkins: { stone: 'baseSkin.frost_cave', medieval: 'baseSkin.rose_keep' },
    decorations: ['decoration.lion_statue', null, 'decoration.fire_bowl'],
  };

  it('attaches to the base and seats the pole and decorations in their anchors', () => {
    const base = fakeBase();
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    expect(base.root.children).toContain(d.root);
    const xs = d.root.children.map((c) => Math.round(c.position.x));
    expect(xs).toContain(DRESSING_ANCHORS.pole);
    expect(xs).toContain(DRESSING_ANCHORS.decorations[0]);
    expect(xs).toContain(DRESSING_ANCHORS.decorations[2]);
    expect(xs).not.toContain(DRESSING_ANCHORS.decorations[1]);
    // the base skin tints the body at once
    expect(base.tints).toEqual([FROST]);
  });

  it('mirrors the anchors for side 1', () => {
    const d = new BaseDressing({ age: 'stone', side: 1, look, team: 0xf28a1e });
    const xs = d.root.children.map((c) => Math.round(c.position.x));
    expect(xs).toContain(-DRESSING_ANCHORS.pole);
    expect(xs).toContain(-DRESSING_ANCHORS.decorations[0]);
  });

  it('switches the skin on an evolve half-way through the morph, and clears it for an age without one', () => {
    const base = fakeBase();
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    d.setAge('medieval', 1000);
    d.update(100);
    expect(base.tints).toEqual([FROST]);
    for (let i = 0; i < 6; i += 1) d.update(100);
    expect(base.tints).toEqual([FROST, ROSE]);
    d.setAge('gunpowder', 0);
    d.update(16);
    expect(base.tints[base.tints.length - 1]).toBeNull();
  });

  it('keeps no pole without flags, topples on collapse and survives the base destroying it first', () => {
    const base = fakeBase();
    const bare = new BaseDressing({ age: 'stone', side: 0, look: { decorations: [] }, team: 0x2f7df6, base });
    expect(bare.root.children.filter((c) => Math.round(c.position.x) === DRESSING_ANCHORS.pole)).toHaveLength(0);
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    d.hit();
    d.collapse();
    for (let i = 0; i < 12; i += 1) d.update(100);
    expect(d.root.children.every((c) => c.alpha <= 0.01 || c.children.length === 0)).toBe(true);
    base.root.destroy({ children: true });
    expect(() => d.destroy()).not.toThrow();
    expect(() => bare.destroy()).not.toThrow();
  });

  it('honours Reduce motion: no particles', () => {
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6 });
    d.setMotion({ reduce: true, lite: false });
    for (let i = 0; i < 5; i += 1) d.update(50);
    const motes = d.root.children[d.root.children.length - 1]!;
    expect(motes.children.length).toBe(0);
    d.setMotion({ reduce: false, lite: false });
    d.update(50);
    expect(motes.children.length).toBeGreaterThan(0);
  });
});


// ---------------------------------------------------------------------------------------------------
// Base skins as real models (PLAN 2c)

interface SheetFrame {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  anchor: { x: number; y: number };
}
interface SheetFile {
  frames: Record<string, SheetFrame>;
  animations: Record<string, string[]>;
  meta: { image: string; scale: string; ageborn: WorldMeta & { visualId: string; skin?: string; age?: AgeId } };
}

const PUBLIC = fileURLToPath(new URL('../../../public/', import.meta.url));
const readSheet = (source: string): SheetFile => JSON.parse(readFileSync(`${PUBLIC}${source}`, 'utf8')) as SheetFile;

/** A small PNG decoder for the 8-bit sheets (indexed with tRNS, or RGBA): RGBA bytes. */
function decodePng(path: string): { w: number; h: number; px: Uint8Array } {
  const b = readFileSync(path);
  let o = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  let plte: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const kind = b.toString('ascii', o + 4, o + 8);
    const data = b.subarray(o + 8, o + 8 + len);
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`${path}: only 8-bit, non-interlaced PNGs`);
      type = data[9]!;
    } else if (kind === 'PLTE') plte = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const bpp = type === 3 ? 1 : type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error(`${path}: colour type ${type}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const rows = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= bpp ? rows[y * stride + x - bpp]! : 0;
      const up = y > 0 ? rows[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? rows[(y - 1) * stride + x - bpp]! : 0;
      let p = 0;
      if (f === 1) p = a;
      else if (f === 2) p = up;
      else if (f === 3) p = (a + up) >> 1;
      else if (f === 4) {
        const q = a + up - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - up);
        const pc = Math.abs(q - c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      rows[y * stride + x] = (v + p) & 255;
    }
  }
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    if (type === 3) {
      const k = rows[i]!;
      px[i * 4] = plte![k * 3]!;
      px[i * 4 + 1] = plte![k * 3 + 1]!;
      px[i * 4 + 2] = plte![k * 3 + 2]!;
      px[i * 4 + 3] = trns && k < trns.length ? trns[k]! : 255;
    } else if (type === 6) {
      px.set(rows.subarray(i * 4, i * 4 + 4), i * 4);
    } else {
      px.set(rows.subarray(i * 3, i * 3 + 3), i * 4);
      px[i * 4 + 3] = 255;
    }
  }
  return { w, h, px };
}

/**
 * A body frame's silhouette in base lu (x toward the lane, y up): its bounds, the team-pixel share (team
 * twin showing through the frame's holes) and the opaque height of a few columns.
 */
function bodyStats(source: string, stage = 0): { x0: number; x1: number; top: number; team: number; columnTop: (xLu: number) => number } {
  const s = readSheet(source);
  const img = decodePng(`${PUBLIC}${source.replace(/[^/]+$/, '')}${s.meta.image}`);
  const ppl = s.meta.ageborn.pxPerLu;
  const name = s.animations['body']![stage]!;
  const tname = s.animations['body_team']![stage]!;
  const f = s.frames[name]!;
  const tf = s.frames[tname]!;
  const W = f.sourceSize.w;
  const H = f.sourceSize.h;
  const ax = f.anchor.x * W;
  const ay = f.anchor.y * H;
  const alpha = (fr: SheetFrame, x: number, y: number): number => {
    const lx = x - fr.spriteSourceSize.x;
    const ly = y - fr.spriteSourceSize.y;
    if (lx < 0 || ly < 0 || lx >= fr.frame.w || ly >= fr.frame.h) return 0;
    return img.px[((fr.frame.y + ly) * img.w + fr.frame.x + lx) * 4 + 3]!;
  };
  let sil = 0;
  let team = 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  const tops = new Map<number, number>();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = alpha(f, x, y) > 127;
      const t = alpha(tf, x, y) > 127;
      if (!a && !t) continue;
      sil++;
      if (t && !a) team++;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x + 1);
      y0 = Math.min(y0, y);
      if (!tops.has(x)) tops.set(x, y);
    }
  }
  return {
    x0: (x0 - ax) / ppl,
    x1: (x1 - ax) / ppl,
    top: (ay - y0) / ppl,
    team: (100 * team) / Math.max(1, sil),
    // the highest opaque pixel of the columns around xLu (±3 lu), in lu above the feet; 0 when clear
    columnTop: (xLu: number) => {
      let best = 0;
      for (let x = Math.round(ax + (xLu - 3) * ppl); x <= Math.round(ax + (xLu + 3) * ppl); x++) {
        const y = tops.get(x);
        if (y !== undefined) best = Math.max(best, (ay - y) / ppl);
      }
      return best;
    },
  };
}

const MODELS = Object.entries(WORLD_BASE_SKINS) as [string, AgeId][];

describe('base skin models: the standard base contract (PLAN 2c)', () => {
  it('has at least one model, each a released base skin of its own age (or Crystal Spire), lazily loaded', () => {
    expect(MODELS.length).toBeGreaterThan(0);
    for (const [skin, age] of MODELS) {
      const item = content.cosmetics.collections.items.find((x) => x.collection === 'baseSkin' && x.id === skin);
      expect(item?.age, skin).toBe(age);
      expect(hasBaseSkinModel(skin) && hasBaseSkinArt(skin), skin).toBe(true);
      const src = baseSkinSheetSource(skin);
      expect(MANIFEST[`base.${age}@${skin}`]?.source, skin).toBe(src);
      // a world sheet, but never in its age's preload
      expect(isBaseSkinSource(src) && isWorldSource(src)).toBe(true);
      expect(worldSourceAge(src)).toBeNull();
    }
  });

  it.each(MODELS)('%s: crumble stages, team twins, flags, Treasury, the shared mounts and unique frame names', (skin, age) => {
    const s = readSheet(baseSkinSheetSource(skin));
    const std = readSheet(baseSheetSource(age));
    const m = s.meta.ageborn;
    expect(m.visualId).toBe(`base.${age}@${skin}`);
    expect(m.skin).toBe(skin);
    expect(m.age).toBe(age);
    expect(s.animations['body']).toHaveLength(4);
    expect(s.animations['body_team']).toHaveLength(4);
    expect(s.animations['treasury']).toHaveLength(3);
    // the same flag clips and crumble rules as the standard base
    expect((m.flags ?? []).map((f) => [f.clip, f.crumbleMax, f.z])).toEqual((std.meta.ageborn.flags ?? []).map((f) => [f.clip, f.crumbleMax, f.z]));
    for (const f of m.flags ?? []) expect(s.animations[f.clip]?.length, f.clip).toBe(4);
    expect(m.mountsLu).toEqual(WORLD_BASE_MOUNTS_LU.map(([x, y]) => [x, y]));
    // every crumble frame's mount trackers sit on the modelled platforms, within 0.5 lu
    const tracked = m.clips['body']?.anchorsLu ?? {};
    WORLD_BASE_MOUNTS_LU.forEach(([x, y], i) => {
      const t = tracked[`mount${i}`] ?? [];
      expect(t).toHaveLength(4);
      for (const [tx, ty] of t) {
        expect(Math.abs(tx - x), `mount${i} x`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(ty - y), `mount${i} y`).toBeLessThanOrEqual(0.5);
      }
    });
    // frame names never collide with the age's own sheet in Pixi's texture cache
    for (const names of Object.values(s.animations)) for (const n of names) expect(n.startsWith(`${skin}_`), n).toBe(true);
    expect(statSync(`${PUBLIC}art/bases/skins/${s.meta.image}`).size, 'sheet budget 70 KB').toBeLessThanOrEqual(70 * 1024);
  });

  it.each(MODELS)('%s: footprint and height band within 5%% of the standard base, dressing anchors clear, team share', (skin, age) => {
    const std = bodyStats(baseSheetSource(age));
    const own = bodyStats(baseSkinSheetSource(skin));
    const width = (st: { x0: number; x1: number }) => st.x1 - st.x0;
    expect(Math.abs(width(own) - width(std)) / width(std), 'width').toBeLessThanOrEqual(0.05);
    expect(Math.abs(own.top - std.top) / std.top, 'height band').toBeLessThanOrEqual(0.05);
    expect(Math.abs(own.x1 - std.x1), 'gate edge (lu)').toBeLessThanOrEqual(std.x1 * 0.05 + 2);
    // the decoration beside the gate (+20) and the flag pole (+44) stay clear of the model
    for (const x of [DRESSING_ANCHORS.decorations[2], DRESSING_ANCHORS.pole]) {
      expect(own.columnTop(x), `column at ${x} lu`).toBeLessThanOrEqual(std.columnTop(x) + 4);
    }
    // large team areas: at least the standard base's team-pixel share minus 3 points
    for (const stage of [0, 3]) expect(bodyStats(baseSkinSheetSource(skin), stage).team, `team share, crumble ${stage}`).toBeGreaterThanOrEqual(bodyStats(baseSheetSource(age), stage).team - 3);
  });
});

describe('base skin models: their own collapse kits', () => {
  it('lists a kit only for models, as the model entry\'s collapse clip, with its pieces, heaps and rag', () => {
    for (const skin of WORLD_BASE_SKIN_KITS) {
      const age = WORLD_BASE_SKINS[skin];
      expect(age, skin).toBeDefined();
      expect(MANIFEST[`base.${age}@${skin}`]?.clips['collapse'], skin).toEqual({ kind: 'atlas', ref: baseSkinCollapseSource(skin), durationMs: BASE_COLLAPSE_MS, loop: false });
      const kit = readSheet(baseSkinCollapseSource(skin));
      const m = kit.meta.ageborn as WorldMeta & { kind?: string; skin?: string };
      expect(m.kind).toBe('baseCollapseKit');
      expect(m.skin).toBe(skin);
      expect(kit.animations['piece']).toHaveLength(8);
      expect(kit.animations['heap']).toHaveLength(2);
      expect(kit.animations['rag']).toHaveLength(1);
      expect(kit.animations['rag_team']).toHaveLength(1);
      for (const names of Object.values(kit.animations)) for (const n of names) expect(n.startsWith(`${skin}_kit_`), n).toBe(true);
      expect(statSync(`${PUBLIC}art/bases/skins/${kit.meta.image}`).size, 'kit budget 15 KB').toBeLessThanOrEqual(15 * 1024);
    }
    // a model without its own kit falls back to its age's
    for (const [skin, age] of MODELS) if (!WORLD_BASE_SKIN_KITS.includes(skin)) expect(MANIFEST[`base.${age}@${skin}`]?.clips['collapse']?.ref).toBe(`art/bases/${age}.collapse.json`);
  });
});

// a world sheet stand-in for the view tests (frames are empty textures)
function fakeSheet(meta: Partial<WorldMeta> = {}): WorldSheet {
  const frames = (n: number): Texture[] => Array.from({ length: n }, () => Texture.EMPTY);
  return {
    animations: { body: frames(4), body_team: frames(4), treasury: frames(3), treasury_team: frames(3) },
    luPerUnit: 1,
    meta: { heightLu: 330, widthLu: 180, pxPerLu: 1, mountsLu: WORLD_BASE_MOUNTS_LU.map(([x, y]) => [x, y] as [number, number]), clips: {}, ...meta },
  };
}

const baseDef = (source: string): VisualDef => ({
  kind: 'atlas',
  source,
  anchors: { feet: { x: 0, y: 0 }, head: { x: -90, y: -330 }, muzzle: { x: 0, y: -150 }, hitCenter: { x: -72, y: -148 } },
  heightLu: 330,
  team: { kind: 'mask', maskTextures: ['_team'] },
  clips: {},
  events: { attack: { impactAt: 0.1 } },
});

describe('base skin models in the lane (lazy, per age, tint stand-in)', () => {
  // a manifest with one test model per age the evolve passes through
  const skinSrc = (id: string): string => `art/bases/skins/${id}.json`;
  const manifest: Record<string, VisualDef> = {
    ...MANIFEST,
    'base.stone': baseDef('art/bases/stone.json'),
    'base.bronze': baseDef('art/bases/bronze.json'),
    'base.medieval': baseDef('art/bases/medieval.json'),
    'base.bronze@test_gold': baseDef(skinSrc('test_gold')),
    'base.medieval@rose_keep': baseDef(skinSrc('rose_keep')),
  };
  const make = (o: { loaded: string[]; skins: Partial<Record<AgeId, string>>; age?: AgeId }) => {
    const art = createArtProvider({ manifest, dpr: 1, warn: () => {} });
    for (const src of ['art/bases/stone.json', 'art/bases/bronze.json', 'art/bases/medieval.json', ...o.loaded]) {
      const skin = /skins\/([a-z_]+)\.json/.exec(src)?.[1];
      art.atlas.world.register(src, fakeSheet(skin ? { skin, rubbleColors: ['#C8A098'], collapseMaterial: 'iron' } : {}));
    }
    const view = art.createBase({ age: o.age ?? 'stone', skins: o.skins, side: 0, teamPreset: 'default' });
    return { art, view: view as AtlasBaseView };
  };
  const evolve = (v: BaseView, age: AgeId): void => {
    v.morphTo(age, 1800);
    for (let t = 0; t < 3200; t += 50) v.update(50);
  };

  it('a Stone base with a Bronze skin shows it after the evolve, and the next age shows its own', () => {
    const { view } = make({ loaded: [skinSrc('test_gold'), skinSrc('rose_keep')], skins: { bronze: 'test_gold', medieval: 'rose_keep' } });
    expect(view).toBeInstanceOf(AtlasBaseView);
    expect(view.sheetSource).toBe('art/bases/stone.json');
    evolve(view, 'bronze');
    expect(view.sheetSource).toBe(skinSrc('test_gold'));
    expect(view.skinModel()).toBe('test_gold');
    evolve(view, 'medieval');
    expect(view.sheetSource).toBe(skinSrc('rose_keep'));
    view.destroy();
  });

  it('loads a model lazily: the tinted standard base stands in, then the model swaps in untinted', () => {
    const { art, view } = make({ loaded: [], skins: { medieval: 'rose_keep' }, age: 'medieval' });
    expect(view.sheetSource).toBe('art/bases/medieval.json');
    view.setSkinTint(BASE_SKINS.rose_keep!.tint);
    expect(view.skinModel()).toBeNull();
    view.update(16);
    expect(view.sheetSource).toBe('art/bases/medieval.json');
    // the sheet arrives
    art.atlas.world.register(skinSrc('rose_keep'), fakeSheet({ skin: 'rose_keep', ambientLu: [{ kind: 'petals', x: -150, y: 200, r: 12, rate: 1 }] }));
    view.update(16);
    expect(view.sheetSource).toBe(skinSrc('rose_keep'));
    expect(view.skinModel()).toBe('rose_keep');
    expect(view.ambientSpots()).toHaveLength(1);
    // the model blooms in over the old body and settles
    for (let t = 0; t < 600; t += 16) view.update(16);
    expect(view.debug.fx).toBeGreaterThanOrEqual(0);
    view.destroy();
  });

  it('an evolve into a skinned age never waits for its model: the standard base assembles, the model follows', () => {
    const { art, view } = make({ loaded: [], skins: { bronze: 'test_gold' } });
    evolve(view, 'bronze');
    expect(view.sheetSource).toBe('art/bases/bronze.json');
    art.atlas.world.register(skinSrc('test_gold'), fakeSheet({ skin: 'test_gold' }));
    view.update(16);
    expect(view.sheetSource).toBe(skinSrc('test_gold'));
    view.destroy();
  });

  it('collapses a model with its own topple joints, material and rubble colours', () => {
    const topple = [{ x0: -170, x1: -80, y0: 140, dir: 1 as const, delayMs: 0, push: 1, sinkLu: 30 }];
    const p = collapseProfileFor('medieval', { topple, collapseMaterial: 'energy', rubbleColors: ['#C8A098', 'bad'], dustColor: '#C9B2AA' });
    expect(p.topple).toEqual(topple);
    expect(p.material).toBe('energy');
    expect(p.colors.rubble).toEqual([0xc8a098]);
    expect(p.colors.dust).toBe(0xc9b2aa);
    expect(collapseProfileFor('medieval', {})).toBe(collapseProfile('medieval'));
    const { view } = make({ loaded: [skinSrc('rose_keep')], skins: { medieval: 'rose_keep' }, age: 'medieval' });
    view.setCrumble(3);
    view.update(16);
    expect(view.collapseWith({ seed: 7 }).material).toBe('iron');
    view.destroy();
  });

  it('the view ignores the old tint on a model', () => {
    const world = new WorldAtlas(() => '', async () => fakeSheet());
    world.register(skinSrc('rose_keep'), fakeSheet({ skin: 'rose_keep' }));
    const v = new AtlasBaseView({ age: 'medieval', side: 0, teamColor: 0x2f7df6, decor: new PartBaker({ pxPerLu: 1, canvasFactory: () => null }), seed: 1, world, sourceFor: () => skinSrc('rose_keep'), def: baseDef(skinSrc('rose_keep')) });
    v.setSkinTint(0xffb4c6);
    const tinted: number[] = [];
    v.root.children.forEach(function walk(c) {
      if ('tint' in c && typeof (c as { tint: unknown }).tint === 'number' && (c as { tint: number }).tint === 0xffb4c6) tinted.push(1);
      c.children?.forEach(walk);
    });
    expect(tinted).toHaveLength(0);
    v.destroy();
  });
});

describe('the dressing with a skin model', () => {
  const look = { baseSkins: { medieval: 'baseSkin.rose_keep' }, decorations: [] };
  const modelBase = (model: string | null, spots: { kind: string; x: number; y: number; r: number; rate: number }[]) => {
    const b = fakeBase() as BaseView & { tints: (number | null)[]; skinModel: () => string | null; ambientSpots: () => typeof spots };
    b.skinModel = () => model;
    b.ambientSpots = () => spots;
    return b;
  };

  it('turns the field of motes off and starts the model\'s own ambient from its spots', () => {
    const base = modelBase('rose_keep', [{ kind: 'petals', x: -150, y: 200, r: 10, rate: 1 }]);
    const d = new BaseDressing({ age: 'medieval', side: 0, look, team: 0x2f7df6, base });
    for (let i = 0; i < 4; i += 1) d.update(50);
    const motes = d.root.children[d.root.children.length - 1]!;
    expect(motes.children.length).toBeGreaterThan(0);
    expect(motes.children.length).toBeLessThanOrEqual(10);
    // every mote starts around the spot (it falls from there)
    for (const m of motes.children) {
      expect(m.position.x).toBeGreaterThan(-175);
      expect(m.position.x).toBeLessThan(-125);
      expect(-m.position.y).toBeLessThan(215);
    }
    d.destroy();
  });

  it('keeps the old tint and field of motes while the model is still loading', () => {
    const base = modelBase(null, []);
    const d = new BaseDressing({ age: 'medieval', side: 0, look, team: 0x2f7df6, base });
    d.update(50);
    expect(base.tints).toEqual([ROSE]);
    const motes = d.root.children[d.root.children.length - 1]!;
    expect(motes.children.length).toBe(14);
    d.destroy();
  });
});
