/**
 * Base decorations (DESIGN A18.9.4; PLAN 2a "Decorations"): every released decoration has art, the SVG is
 * well formed, and (round 3) every one is a Blender prop: its sheet keeps the prop contract (a `body` frame, a
 * 4-frame `loop` where it moves, `_team` twins where it has team parts, its meta) within its size budget, the
 * HD thumbnail atlas holds a cell for each within 90 KB, and the lane's dressing loads only the equipped props,
 * shows the SVG bake until one arrives and cross-fades it in, plays the loop by render time (held under Reduce
 * motion) and mirrors for side 1 (banners keep the one wind). Owned by Track B.
 */
import { Rectangle, Texture, type Container, type Sprite } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { cosmeticImageUrl, hasCosmeticArt } from '../cosmetics/art';
import { BaseDressing, PROP_FADE_MS, type DecorationProps } from '../cosmetics/dressing';
import { decorationArtUrl, decorationSvg, hasDecorationArt, hasDecorationProp } from '../cosmetics/decorations';
import { decorationSheetSource, WORLD_DECORATIONS } from '../manifest.world';
import { isDecorationSource, isWorldSource, worldSourceAge, type WorldMeta, type WorldSheet } from '../adapters/worldAtlas';

const decorations = content.cosmetics.collections.items.filter((x) => x.collection === 'decoration' && x.released !== false);

describe('decorations', () => {
  it('draws every released decoration of the content', () => {
    expect(decorations.length).toBeGreaterThanOrEqual(20);
    for (const x of decorations) expect(hasDecorationArt(x.id) && hasCosmeticArt('decoration', x.id), x.id).toBe(true);
  });

  it('gives a well-formed SVG in the 48 x 64 box (the stand-in while a prop streams in)', () => {
    for (const x of decorations) expect(decorationSvg(x.id, { team: 0x2f7df6 }), x.id).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 48 64">/);
  });

  it('gives the screens the SVG until the props\' HD pictures are in (never without a browser)', () => {
    expect(decorationArtUrl('fern')).toBeNull();
    expect(decorationArtUrl('fern', { hd: true })).toBeNull();
    expect(cosmeticImageUrl('decoration.fern', { hd: true })).toMatch(/^data:image\/svg\+xml/);
  });
});

// -------------------------------------------------------------------------------------------------
// The props (round 3)

interface SheetFrame {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  anchor: { x: number; y: number };
}
interface SheetFile {
  frames: Record<string, SheetFrame>;
  animations: Record<string, string[]>;
  meta: { image: string; scale: string; size: { w: number; h: number }; ageborn: WorldMeta & { visualId: string; id: string; clips: Record<string, { durationsMs: number[]; loop: boolean }> } };
}

const SHEETS = import.meta.glob<SheetFile>('/public/art/cosmetics/decorations/*.json', { eager: true, import: 'default' });
const PNGS = import.meta.glob<string>('/public/art/cosmetics/decorations/*.png', { eager: true, query: '?inline', import: 'default' });
const WEBP = import.meta.glob<string>('/public/art/cosmetics/decorations/*.webp', { eager: true, query: '?inline', import: 'default' });
const bytesOf = (dataUrl: string | undefined): number => (dataUrl ? atob(dataUrl.slice(dataUrl.indexOf(',') + 1)).length : -1);
const sheetOf = (id: string): SheetFile | undefined => SHEETS[`/public/${decorationSheetSource(id)}`];
const TEAM_KINDS = new Set(['knight_statue', 'astro_statue', 'hide_banner', 'royal_standard', 'regiment_colors', 'neon_banner', 'mammoth_tusks', 'knight_helm', 'shield_rack']);

describe('decoration props: one Blender prop per decoration (the release gate)', () => {
  it('lists every released decoration as a prop, and nothing else', () => {
    expect([...WORLD_DECORATIONS].sort()).toEqual(decorations.map((x) => x.id).sort());
    for (const x of decorations) expect(hasDecorationProp(x.id), x.id).toBe(true);
  });

  it('keeps the prop contract: a body frame, a 4-frame loop where it moves, team twins where it has team parts, its meta', () => {
    for (const x of decorations) {
      const s = sheetOf(x.id);
      expect(s, x.id).toBeDefined();
      const m = s!.meta.ageborn;
      expect(m.kind, x.id).toBe('decoration');
      expect(m.id).toBe(x.id);
      expect(m.visualId).toBe(`decoration.${x.id}`);
      // the base pipeline's shipped scale: 1.23 px per lu
      expect(m.pxPerLu, x.id).toBeCloseTo(1.23, 2);
      expect(s!.animations['body']?.length, x.id).toBe(1);
      const loop = s!.animations['loop'];
      if (loop) {
        expect(loop.length, x.id).toBe(4);
        expect(m.clips['loop']?.loop, x.id).toBe(true);
        expect(m.clips['loop']?.durationsMs.length).toBe(4);
      }
      // every frame name is the prop's own (no clash in Pixi's texture cache)
      for (const name of Object.keys(s!.frames)) expect(name.startsWith(`deco_${x.id}_`), name).toBe(true);
      // team twins exactly where the design has team parts (a banner, a shield, a plume, a badge)
      const team = Object.keys(s!.frames).some((n) => n.endsWith('_team') && s!.frames[n]!.frame.w > 1);
      expect(team, `${x.id} team parts`).toBe(TEAM_KINDS.has(x.id));
      expect([null, 'sway', 'flicker', 'pulse', 'glint']).toContain(m.motion ?? null);
      if (m.glowLu) expect(m.glowLu.color, x.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // banners keep the lane's one wind on both sides; everything else turns to face the lane
      expect(m.mirror, x.id).toBe(x.kind !== 'banner');
      // moving parts: banners sway in their cloth loop, braziers and the plasma ball flicker in theirs
      if (x.kind === 'banner') expect(loop, x.id).toBeDefined();
      if (m.motion === 'flicker' && x.id !== 'gas_lamp') expect(loop, x.id).toBeDefined();
    }
  });

  it('stands about 55 lu tall and fits its spot (the two back spots are 46 lu apart)', () => {
    for (const x of decorations) {
      const s = sheetOf(x.id)!;
      const ppl = s.meta.ageborn.pxPerLu;
      let x0 = Infinity;
      let x1 = -Infinity;
      let top = 0;
      for (const [name, f] of Object.entries(s.frames)) {
        if (f.frame.w <= 1 || !(name.includes('_body_') || name.includes('_loop_'))) continue;
        const ax = f.anchor.x * f.sourceSize.w;
        const ay = f.anchor.y * f.sourceSize.h;
        x0 = Math.min(x0, (f.spriteSourceSize.x - ax) / ppl);
        x1 = Math.max(x1, (f.spriteSourceSize.x + f.spriteSourceSize.w - ax) / ppl);
        top = Math.max(top, (ay - f.spriteSourceSize.y) / ppl);
      }
      expect(top, `${x.id} height`).toBeGreaterThan(36);
      expect(top, `${x.id} height`).toBeLessThan(76);
      expect(x1 - x0, `${x.id} width`).toBeLessThan(52);
    }
  });

  it('stays in its budget: a few KB a prop, the HD thumbnail atlas at most 90 KB with a cell for every prop', () => {
    let total = 0;
    for (const x of decorations) {
      const png = bytesOf(PNGS[`/public/art/cosmetics/decorations/${sheetOf(x.id)!.meta.image}`]);
      expect(png, x.id).toBeGreaterThan(0);
      expect(png, `${x.id} sheet`).toBeLessThanOrEqual(8 * 1024);
      total += png;
    }
    expect(total).toBeLessThan(24 * 8 * 1024);
    const thumbs = SHEETS['/public/art/cosmetics/decorations/thumbs.json'] as unknown as { image: string; pxPerLu: number; cells: Record<string, [number, number, number, number]> };
    expect(thumbs).toBeDefined();
    expect(thumbs.pxPerLu).toBeCloseTo(2.46, 2);
    expect(Object.keys(thumbs.cells).sort()).toEqual(decorations.map((x) => x.id).sort());
    const webp = bytesOf(WEBP[`/public/art/cosmetics/decorations/${thumbs.image}`]);
    expect(webp, 'thumbs budget 90 KB').toBeLessThanOrEqual(90 * 1024);
    expect(webp).toBeGreaterThan(0);
    for (const [id, [x, y, w, h]] of Object.entries(thumbs.cells)) {
      expect(x >= 0 && y >= 0 && w > 20 && h > 40, id).toBe(true);
    }
  });

  it('loads lazily: a prop sheet belongs to no age, so no boot or age preload fetches it', () => {
    for (const id of WORLD_DECORATIONS) {
      const src = decorationSheetSource(id);
      expect(isDecorationSource(src)).toBe(true);
      expect(isWorldSource(src)).toBe(true);
      expect(worldSourceAge(src)).toBeNull();
    }
    expect(isDecorationSource('art/cosmetics/decorations/thumbs.json')).toBe(false);
    expect(isDecorationSource('art/bases/skins/rose_keep.json')).toBe(false);
  });
});

// -------------------------------------------------------------------------------------------------
// The dressing with props

const tex = (w = 40, h = 60): Texture => new Texture({ orig: new Rectangle(0, 0, w, h), defaultAnchor: { x: 0.5, y: 0.9 } });

function fakeProp(id: string, o: { loop?: boolean; team?: boolean; mirror?: boolean; motion?: WorldMeta['motion']; glow?: boolean } = {}): WorldSheet {
  const body = [tex()];
  const animations: Record<string, Texture[]> = { body, body_team: [o.team ? tex() : tex(1, 1)] };
  if (o.loop) {
    animations['loop'] = [tex(), tex(), tex(), tex()];
    animations['loop_team'] = [tex(1, 1), tex(1, 1), tex(1, 1), tex(1, 1)];
  }
  return {
    animations,
    luPerUnit: 1,
    meta: {
      heightLu: 52,
      pxPerLu: 1.23,
      id,
      kind: 'decoration',
      motion: o.motion ?? null,
      mirror: o.mirror ?? true,
      shadowLu: 15,
      ...(o.glow ? { glowLu: { x: -4, y: 36, r: 16, color: '#FFA040' } } : {}),
      clips: o.loop ? { loop: { durationsMs: [120, 120, 120, 120], loop: true } } : {},
    },
  };
}

/** Prop sheets the test hands over: `loaded` are in at once, the rest resolve when `arrive(id)` is called. */
function fakeProps(sheets: Record<string, WorldSheet>, loaded: string[] = []) {
  const asked: string[] = [];
  const waiting = new Map<string, (s: WorldSheet | null) => void>();
  const have = new Set(loaded);
  const props: DecorationProps = {
    has: (id) => id in sheets,
    get: (id) => (have.has(id) ? sheets[id] : undefined),
    ensure: (id) => {
      asked.push(id);
      if (have.has(id)) return Promise.resolve(sheets[id]!);
      return new Promise((r) => waiting.set(id, r));
    },
  };
  return {
    props,
    asked,
    arrive: async (id: string) => {
      have.add(id);
      waiting.get(id)?.(sheets[id]!);
      for (let i = 0; i < 4; i++) await Promise.resolve();
    },
  };
}

const propRoot = (d: BaseDressing, id: string): Container => d.root.children.find((c) => c.label === `decoration.${id}`) as Container;
const modelOf = (c: Container): Container | undefined => c.children.find((k) => k.label?.endsWith('.prop')) as Container | undefined;

describe('the dressing draws the equipped props (round 3)', () => {
  const sheets = {
    fire_bowl: fakeProp('fire_bowl', { loop: true, motion: 'flicker', glow: true }),
    fern: fakeProp('fern', { motion: 'sway' }),
    royal_standard: fakeProp('royal_standard', { loop: true, team: true, mirror: false }),
    lion_statue: fakeProp('lion_statue'),
  };
  const look = { decorations: ['decoration.fire_bowl', 'decoration.royal_standard', 'decoration.fern'] };

  it('asks for the equipped props only, shows the SVG until each arrives, then cross-fades it in', async () => {
    const f = fakeProps(sheets);
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, props: f.props, canvas: () => null });
    expect([...f.asked].sort()).toEqual(['fern', 'fire_bowl', 'royal_standard']);
    const bowl = propRoot(d, 'fire_bowl');
    expect(modelOf(bowl)).toBeUndefined();
    expect(bowl.children.length).toBeGreaterThan(0);
    await f.arrive('fire_bowl');
    const model = modelOf(bowl)!;
    expect(model).toBeDefined();
    // the model fades in over the SVG (never a pop), then the SVG goes
    expect(model.alpha).toBe(0);
    // (the dressing steps at most 100 ms a frame)
    for (let t = 0; t < PROP_FADE_MS / 2; t += 40) d.update(40);
    expect(model.alpha).toBeGreaterThan(0);
    expect(model.alpha).toBeLessThan(1);
    for (let t = 0; t < PROP_FADE_MS; t += 40) d.update(40);
    expect(model.alpha).toBe(1);
    // the SVG container is gone: only the model, the light and nothing else of the stand-in
    expect(bowl.children.filter((c) => c !== model && !(c.blendMode === 'add')).length).toBe(0);
    d.destroy();
  });

  it('shows a prop that is in already at once, with no SVG', () => {
    const f = fakeProps(sheets, ['fire_bowl', 'fern', 'royal_standard']);
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, props: f.props, canvas: () => null });
    const bowl = propRoot(d, 'fire_bowl');
    expect(modelOf(bowl)?.alpha).toBe(1);
    d.destroy();
  });

  it('plays the loop by render time and holds its first frame under Reduce motion', () => {
    const f = fakeProps(sheets, ['fire_bowl', 'fern', 'royal_standard']);
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, props: f.props, canvas: () => null, seed: 3 });
    const frames = sheets.fire_bowl.animations['loop']!;
    const loopSprite = (): Sprite => (modelOf(propRoot(d, 'fire_bowl'))!.children[1] as Container).children.find((s) => frames.includes((s as Sprite).texture)) as Sprite;
    const seen = new Set<Texture>();
    for (let i = 0; i < 12; i++) {
      d.update(60);
      seen.add(loopSprite().texture);
    }
    expect(seen.size).toBeGreaterThan(2);
    d.setMotion({ reduce: true, lite: false });
    for (let i = 0; i < 6; i++) {
      d.update(60);
      expect(loopSprite().texture).toBe(frames[0]);
    }
    d.destroy();
  });

  it('mirrors a prop for side 1 (it faces the lane) but never a banner (the one wind), its light too', () => {
    const f = fakeProps(sheets, ['fire_bowl', 'fern', 'royal_standard']);
    const d0 = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, props: f.props, canvas: () => null });
    const d1 = new BaseDressing({ age: 'stone', side: 1, look, team: 0xf28a1e, props: f.props, canvas: () => null });
    const art = (d: BaseDressing, id: string): Container => modelOf(propRoot(d, id))!.children[1] as Container;
    expect(art(d0, 'fire_bowl').scale.x).toBe(1);
    expect(art(d1, 'fire_bowl').scale.x).toBe(-1);
    expect(art(d1, 'royal_standard').scale.x).toBe(1);
    // the glow from the meta: x mirrored with the prop, y up
    const glow = (d: BaseDressing): Container => propRoot(d, 'fire_bowl').children.find((c) => c.blendMode === 'add') as Container;
    expect(glow(d0).x).toBeCloseTo(-4, 5);
    expect(glow(d1).x).toBeCloseTo(4, 5);
    expect(glow(d0).y).toBeCloseTo(-36, 5);
    // the team twin takes the side's colour
    const team = (d: BaseDressing): Sprite => art(d, 'royal_standard').children[0] as Sprite;
    expect(team(d1).tint).toBe(0xf28a1e);
    d0.destroy();
    d1.destroy();
  });

  it('keeps the SVG bakes without a prop loader (a forced procedural tier, tests)', () => {
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, canvas: () => null });
    expect(modelOf(propRoot(d, 'fire_bowl'))).toBeUndefined();
    d.update(500);
    d.destroy();
  });

  it('topples the props in the collapse and lets go of a prop arriving after it was destroyed', async () => {
    const f = fakeProps(sheets, ['fern']);
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, props: f.props, canvas: () => null });
    d.collapseAt(0);
    for (let i = 0; i < 20; i++) d.update(50);
    expect(propRoot(d, 'fern').rotation).not.toBe(0);
    expect(propRoot(d, 'fern').alpha).toBeLessThan(0.5);
    d.destroy();
    await f.arrive('fire_bowl');
  });
});
