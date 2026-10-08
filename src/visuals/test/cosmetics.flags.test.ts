/**
 * Base flags (DESIGN A18.9.4; PLAN 2a "Base flags"): emblems on the team colour, cut as swallowtail
 * banners, drawn in `cosmetics/flags.ts`. Owned by Track C (national flags: `cosmetics.nationalFlags.test.ts`).
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { baseFlagDesign, cosmeticSvg, hasCosmeticArt } from '../cosmetics/art';
import { BANNER_OUTLINE, BASE_FLAG_EMBLEMS, BASE_FLAGS, baseFlagTier, FLAG_H, flagFringe, flagPole } from '../cosmetics/flags';
import { celRamp, hexValue, pathBounds, shapesToSvg, type CelShape, type Shape } from '../cosmetics/shapes';

const baseFlags = content.cosmetics.collections.items.filter((x) => x.collection === 'baseFlag' && x.released !== false);

describe('base flags', () => {
  it('draws every released base flag of the content', () => {
    expect(baseFlags.length).toBeGreaterThanOrEqual(15);
    for (const x of baseFlags) expect(hasCosmeticArt('baseFlag', x.id), x.id).toBe(true);
  });

  it('paints base flags in the team colour', () => {
    expect(cosmeticSvg('baseFlag.ember', { team: 0x2f7df6 })).toContain('#2f7df6');
    expect(cosmeticSvg('baseFlag.ember', { team: 0xf28a1e })).toContain('#f28a1e');
  });

  it('cuts every base flag as a swallowtail banner', () => {
    for (const id of Object.keys(BASE_FLAGS)) expect(baseFlagDesign(id)?.outline, id).toBe(BANNER_OUTLINE);
    expect(baseFlagDesign('nowhere')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// The redraw to the art sheet (PLAN 2a "Base flags", 2g C2 tone test, C3 silhouettes)
// ---------------------------------------------------------------------------------------------

/** Every cel part of a shape list (groups opened), with whether it is marked low detail. */
function celParts(shapes: readonly Shape[]): CelShape[] {
  const out: CelShape[] = [];
  for (const s of shapes) {
    if ('clip' in s) out.push(...celParts(s.shapes));
    else if ('cel' in s) out.push(s);
  }
  return out;
}

const OUTLINE = /stroke="(#[0-9a-f]{6})"[^>]*data-outline=""/;

describe('the base flags follow the art sheet (AUDIT §3.1)', () => {
  const designs = Object.keys(BASE_FLAGS);

  it('gives each design the finish of its rarity (Common plain to Legendary gold fringe and star)', () => {
    for (const id of designs) {
      const item = baseFlags.find((x) => x.id === id);
      expect(item, id).toBeDefined();
      expect(baseFlagTier(id), id).toBe(item!.rarity);
    }
  });

  it('tone test: every part outline is its fill × 0.40 (value ≤ 0.38, never black), one shadow band on every sizeable part, at most one highlight', () => {
    let matched = 0;
    let total = 0;
    const missing: string[] = [];
    for (const id of designs) {
      for (const part of celParts([...BASE_FLAG_EMBLEMS[id]!, ...flagPole(baseFlagTier(id)!), ...flagFringe(baseFlagTier(id)!)])) {
        const svg = shapesToSvg([part], { team: 0x2f7df6 });
        const fill = /data-fill="(#[0-9a-f]{6})"/.exec(svg)?.[1];
        expect(fill, `${id} fill`).toBeDefined();
        const line = OUTLINE.exec(svg)?.[1];
        if ((part.ln ?? 1.2) > 0) {
          expect(line, `${id} outline`).toBeDefined();
          expect(line, `${id} outline is never black`).not.toBe('#000000');
          expect(hexValue(line!), `${id} outline ${line} value`).toBeLessThanOrEqual(0.385);
          total += 1;
          if (line === celRamp(fill!, part.mat ?? 'matte').line) matched += 1;
        }
        expect((svg.match(/data-hl=""/g) ?? []).length, `${id} highlights`).toBeLessThanOrEqual(1);
        const b = pathBounds(part.d);
        const big = (b.x1 - b.x0) * (b.y1 - b.y0) >= 30 && !part.lo;
        if (big && (svg.match(/data-sh=""/g) ?? []).length !== 1) missing.push(`${id} ${part.cel} ${part.d.slice(0, 28)}`);
      }
    }
    expect(missing, 'sizeable parts without their shadow band').toEqual([]);
    // a few accents take a deliberate dark of their own (a hub's gold rim on the cloth); the rest match
    expect(matched / total).toBeGreaterThan(0.85);
  });

  it('outlines the cloth in the team colour’s own dark, never the old fixed ink', () => {
    for (const id of designs) {
      for (const team of [0x2f7df6, 0xf28a1e]) {
        const svg = cosmeticSvg(`baseFlag.${id}`, { team })!;
        expect(svg, id).not.toContain('#1b1330');
        const line = /stroke="(#[0-9a-f]{6})"[^>]*data-flag-outline=""/.exec(svg)?.[1];
        expect(line, id).toBe(celRamp(`#${team.toString(16).padStart(6, '0')}`, 'cloth').line);
      }
    }
  });

  it('draws every emblem big (55-75% of the cloth height) and inside the cloth, clear of the sleeve and the notch', () => {
    for (const id of designs) {
      let y0 = Infinity;
      let y1 = -Infinity;
      let x0 = Infinity;
      let x1 = -Infinity;
      for (const s of BASE_FLAG_EMBLEMS[id]!) {
        if ('glow' in s || 'clip' in s || s.lo) continue;
        const b = pathBounds(s.d);
        y0 = Math.min(y0, b.y0);
        y1 = Math.max(y1, b.y1);
        x0 = Math.min(x0, b.x0);
        x1 = Math.max(x1, b.x1);
      }
      const share = (y1 - y0) / FLAG_H;
      expect(share, `${id} height share`).toBeGreaterThanOrEqual(0.55);
      expect(share, `${id} height share`).toBeLessThanOrEqual(0.75);
      expect(x0, `${id} clear of the sleeve`).toBeGreaterThanOrEqual(6);
      expect(x1, `${id} clear of the notch`).toBeLessThanOrEqual(50);
      expect(y0, id).toBeGreaterThanOrEqual(3.5);
      expect(y1, id).toBeLessThanOrEqual(37);
    }
  });

  it('gives the Wyvern a head with horns, a bat wing and a curled tail, and the Phoenix flame-feather wings and a crest', () => {
    // silhouette parts by colour: the wyvern's green body, gold wing and horns; the phoenix's red, orange and gold feathers
    const fills = (id: string) => celParts(BASE_FLAG_EMBLEMS[id]!).map((p) => p.cel);
    expect(fills('wyvern').filter((f) => f === '#4f9c52').length).toBeGreaterThanOrEqual(4);
    expect(fills('wyvern')).toContain('#f6c23e');
    expect(fills('phoenix').filter((f) => f === '#dc4a30').length).toBeGreaterThanOrEqual(4);
    expect(fills('phoenix')).toContain('#ff8a2c');
  });

  it('keeps low-detail strokes out of art drawn under 48 px', () => {
    const full = shapesToSvg(BASE_FLAGS.wyvern!, { team: 0x2f7df6 });
    const low = shapesToSvg(BASE_FLAGS.wyvern!, { team: 0x2f7df6 }, { low: true });
    expect(low.length).toBeLessThan(full.length);
  });
});
