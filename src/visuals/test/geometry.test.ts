/**
 * SVG path handling, the rasteriser and colour math (the base of the bake, the handoff sheets and
 * the art checks). DESIGN A11 colour rule constants are checked against the text of A11.
 */
import { describe, expect, it } from 'vitest';
import { darken, hueInTeamBand, rgbToHsv, SKIN_TONES, AGE_PALETTES, teamHueBands, violatesColorRule, TEAM_COLORS } from '../palette';
import { iou, maskArea, Raster } from '../raster';
import { blob, circle, ellipse, flatten, join, limb, matApply, matCompose, matInvert, matMul, mirrorX, normalizeWinding, parsePath, pathBounds, pathSignedArea, poly, rect, rrect, scale, star } from '../svg';

describe('svg', () => {
  it('parses absolute and relative commands, including S/T shorthands', () => {
    const cmds = parsePath('M0 0 l10 0 v10 H0 z M20 20 c5 0 10 5 10 10 s-5 10 -10 10 q-5 0 -5 -5 t5 -5 Z');
    expect(cmds.filter((c) => c.c === 'Z').length).toBe(2);
    expect(pathBounds(rect(0, 0, 10, 10))).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
    expect(() => parsePath('M0 0 A5 5 0 0 1 10 10')).toThrow();
  });
  it('helpers emit one winding so unions never cut holes', () => {
    for (const d of [circle(0, 0, 5), ellipse(0, 0, 5, 3), rrect(0, 0, 10, 6, 2), poly([0, 0, 0, 10, 10, 0]), blob([0, 0, 10, 0, 10, 10, 0, 10]), limb(0, 0, 3, 10, 10, 2), star(0, 0, 5, 2, 5)]) {
      expect(pathSignedArea(d)).toBeGreaterThan(0);
    }
    expect(pathSignedArea(normalizeWinding(mirrorX(poly([0, 0, 10, 0, 0, 10]))))).toBeGreaterThan(0);
  });
  it('circle area and bounds are right', () => {
    const polys = flatten(parsePath(circle(0, 0, 10)), undefined, 0.05);
    let a = 0;
    for (const p of polys) for (let i = 0; i < p.length; i++) {
      const u = p[i];
      const v = p[(i + 1) % p.length];
      if (u && v) a += u.x * v.y - v.x * u.y;
    }
    expect(Math.abs(a / 2)).toBeCloseTo(Math.PI * 100, 0);
    const b = pathBounds(scale(circle(0, 0, 10), 2));
    expect(b.maxX).toBeCloseTo(20);
  });
  it('matrices compose and invert', () => {
    const m = matMul(matCompose(10, 5, 30, 2, 1), matCompose(-3, 4, -45));
    const p = matApply(m, 3, 7);
    const back = matApply(matInvert(m), p.x, p.y);
    expect(back.x).toBeCloseTo(3, 6);
    expect(back.y).toBeCloseTo(7, 6);
    // positive rotation is clockwise on screen (y down): +x rotates toward +y
    const r = matApply(matCompose(0, 0, 90), 1, 0);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });
});

describe('raster', () => {
  it('fills with the nonzero rule and covers the expected area', () => {
    const r = new Raster({ minX: -12, minY: -12, maxX: 12, maxY: 12 }, 4);
    const m = r.coverFill(circle(0, 0, 10), [1, 0, 0, 1, 0, 0]);
    expect(maskArea(m) / 16).toBeCloseTo(Math.PI * 100, -1);
    const u = r.coverFill(join(circle(-3, 0, 6), circle(3, 0, 6)), [1, 0, 0, 1, 0, 0]);
    expect(maskArea(u)).toBeLessThan(2 * maskArea(r.coverFill(circle(0, 0, 6), [1, 0, 0, 1, 0, 0])));
  });
  it('strokes round-joined lines of the given width', () => {
    const r = new Raster({ minX: 0, minY: -5, maxX: 40, maxY: 5 }, 2);
    const s = r.coverStroke('M5 0L35 0', [1, 0, 0, 1, 0, 0], 4);
    expect(maskArea(s) / 4).toBeGreaterThan(30 * 4 * 0.9);
  });
  it('IoU of identical masks is 1 and of disjoint masks 0', () => {
    const r = new Raster({ minX: 0, minY: 0, maxX: 20, maxY: 10 }, 1);
    const a = r.coverFill(rect(0, 0, 10, 10), [1, 0, 0, 1, 0, 0]);
    const b = r.coverFill(rect(10, 0, 10, 10), [1, 0, 0, 1, 0, 0]);
    expect(iou(a, a)).toBe(1);
    expect(iou(a, b)).toBe(0);
  });
});

describe('colour (A11)', () => {
  it('the team hue bands are 350-81 and 182-254 degrees (±35° around every preset colour)', () => {
    const bands = teamHueBands();
    expect(bands.length).toBe(2);
    const warm = bands.find((b) => b.from > 300);
    const cool = bands.find((b) => b.from < 300);
    expect(warm?.from).toBeCloseTo(350, -0.5);
    expect(((warm?.from ?? 0) + (warm?.width ?? 0)) % 360).toBeCloseTo(81, -0.5);
    expect(cool?.from).toBeCloseTo(182, -0.5);
    expect((cool?.from ?? 0) + (cool?.width ?? 0)).toBeCloseTo(254, -0.5);
    expect(hueInTeamBand(20)).toBe(true);
    expect(hueInTeamBand(120)).toBe(false);
    expect(hueInTeamBand(300)).toBe(false);
  });
  it('presets use the A11 colours', () => {
    expect(TEAM_COLORS.default).toEqual([0x2f7df6, 0xf28a1e]);
    expect(TEAM_COLORS.blueYellow).toEqual([0x2f7df6, 0xf2c21e]);
    expect(TEAM_COLORS.highContrast).toEqual([0x1f5fd6, 0xff6a00]);
  });
  it('darkening keeps hue and saturation (so tinted grey reproduces the shade and outline rule)', () => {
    const c = 0x2f7df6;
    const a = rgbToHsv(c);
    const b = rgbToHsv(darken(c, 0.45));
    expect(b.h).toBeCloseTo(a.h, 0);
    expect(b.s).toBeCloseTo(a.s, 1);
    expect(b.v).toBeCloseTo(a.v * 0.55, 1);
  });
  it('skin tones and the large-area age colours never count against the rule', () => {
    for (const s of SKIN_TONES) expect(violatesColorRule(s)).toBe(false);
    for (const [age, p] of Object.entries(AGE_PALETTES)) for (const c of p.large) expect(violatesColorRule(c), `${age} ${c.toString(16)}`).toBe(false);
  });
  it('saturated team-band colours count; muted ones do not', () => {
    expect(violatesColorRule(0xf28a1e)).toBe(true);
    expect(violatesColorRule(0x29e3f5)).toBe(true);
    expect(violatesColorRule(0x8c7b68)).toBe(false);
    expect(violatesColorRule(0xf03aa8)).toBe(false);
  });
});
