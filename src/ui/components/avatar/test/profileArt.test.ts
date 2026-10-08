/**
 * The profile art redraw (PLAN 2a: frames, banners, titles; 2g C2 tone test): every frame is a material
 * ring with its own ornaments and cel bands, every banner an embroidered cloth, every title a ribbon by
 * how it is earned. The tone test parses the generated SVG: each part's outline is its fill's dark
 * (value ≤ 0.38, never black), each sizeable part has one shadow band, and no part has two highlights.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { bannerSvg, FRAME_COLORS, frameStyle, frameSvg, titleTier } from '../ProfileArt';

/** HSV value of a hex colour. */
function value(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return Math.max((n >> 16) & 255, (n >> 8) & 255, n & 255) / 255;
}

interface Part {
  outline: string | null;
  hl: number;
  sh: number;
  d: string;
}

/** The cel parts of an avatar-renderer SVG: a `data-part` group or single path, its bands and outline. */
function parts(svg: string): Part[] {
  const out: Part[] = [];
  const tags = [...svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)];
  for (let i = 0; i < tags.length; i += 1) {
    const [, close, name, attrs, self] = tags[i]!;
    if (close || !/data-part=""/.test(attrs!)) continue;
    const d = /\sd="([^"]+)"/.exec(attrs!)?.[1] ?? '';
    if (self) {
      out.push({ outline: /stroke="(#[0-9a-f]{6})"/.exec(attrs!)?.[1] ?? null, hl: 0, sh: 0, d });
      continue;
    }
    // a group: walk to its closing tag
    let depth = 1;
    const p: Part = { outline: null, hl: 0, sh: 0, d };
    for (let j = i + 1; j < tags.length && depth > 0; j += 1) {
      const [, c2, n2, a2, s2] = tags[j]!;
      if (n2 === name && !s2) depth += c2 ? -1 : 1;
      if (/data-hl=""/.test(a2!)) p.hl += 1;
      if (/data-sh=""/.test(a2!)) p.sh += 1;
      if (/data-outline=""/.test(a2!)) p.outline = /stroke="(#[0-9a-f]{6})"/.exec(a2!)?.[1] ?? null;
      if (!p.d) p.d = /\sd="([^"]+)"/.exec(a2!)?.[1] ?? '';
    }
    out.push(p);
  }
  return out;
}

/** A rough size of a path from its numbers (enough to tell a ring from a rivet). */
function span(d: string): number {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

function toneCheck(name: string, svg: string): void {
  const ps = parts(svg);
  expect(ps.length, name).toBeGreaterThan(0);
  for (const p of ps) {
    if (p.outline) {
      expect(p.outline, `${name} outline never black`).not.toBe('#000000');
      expect(value(p.outline), `${name} outline ${p.outline} value`).toBeLessThanOrEqual(0.385);
    }
    expect(p.hl, `${name} highlights`).toBeLessThanOrEqual(1);
    expect(p.sh, `${name} shadow bands`).toBeLessThanOrEqual(1);
  }
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
}

describe('profile frames (PLAN 2a "Profile frames")', () => {
  it('draws every Codex frame of the content as its own material ring', () => {
    const seen = new Set<string>();
    for (const f of content.cosmetics.frames) {
      const svg = frameSvg(f.id);
      expect(svg, f.id).not.toBeNull();
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 120 120">/);
      seen.add(svg!);
      expect(FRAME_COLORS[f.id], f.id).toBeDefined();
    }
    expect(seen.size).toBe(content.cosmetics.frames.length);
    expect(frameSvg('none')).toBeNull();
  });

  it('tone test: the ring has its cel bands, every outline is its fill’s dark, never black', () => {
    for (const f of content.cosmetics.frames) {
      const svg = frameSvg(f.id)!;
      toneCheck(f.id, svg);
      // the ring itself (the biggest part) carries the shadow band and the highlight
      const ring = parts(svg).sort((a, b) => span(b.d) - span(a.d))[0]!;
      expect(ring.sh, `${f.id} ring band`).toBe(1);
      expect(ring.hl, `${f.id} ring highlight`).toBe(1);
    }
  });

  it('glints (Chrome) and shimmers (Aeon) only in the live picture; reduce motion gets the still', () => {
    expect(frameSvg('chrome', true)).toContain('<animateTransform');
    expect(frameSvg('aeon', true)).toContain('<animateTransform');
    for (const f of content.cosmetics.frames) expect(frameSvg(f.id, false), f.id).not.toContain('<animate');
    expect(frameStyle('chrome')['--frame-art-live']).toMatch(/^url\("data:image\/svg\+xml/);
    expect(frameStyle('bark')['--frame-art-live']).toBeUndefined();
    expect(frameStyle('bark')['--frame-art']).toMatch(/^url\("data:image\/svg\+xml/);
  });
});

describe('banners (PLAN 2a "Banners")', () => {
  it('draws every banner as a woven cloth on a rod with an embroidered emblem and a fringe that sways', () => {
    for (const b of content.cosmetics.banners) {
      const svg = bannerSvg(b.id);
      toneCheck(b.id, svg);
      expect(svg, b.id).toContain('class="av-banner__cloth"');
      expect(svg, b.id).toContain('stroke-dasharray');
      // the cloth part has its shadow band
      expect(parts(svg).some((p) => p.sh === 1 && span(p.d) >= 30), b.id).toBe(true);
    }
  });

  it('never uses the reserved team blue or orange (ui-plan 3.2)', () => {
    for (const b of content.cosmetics.banners) {
      const svg = bannerSvg(b.id).toLowerCase();
      expect(svg, b.id).not.toContain('#2f7df6');
      expect(svg, b.id).not.toContain('#f28a1e');
    }
  });
});

describe('title ribbons by how they are earned (PLAN 2a "Titles")', () => {
  const tier = (id: string) => titleTier(content.cosmetics.titles.find((x) => x.id === id));

  it('keeps the basics parchment, seals the feats and gilds the grandest two', () => {
    expect(tier('recruit')).toBe('parchment');
    expect(tier('firestarter')).toBe('parchment');
    for (const id of ['the_stubborn', 'photo_finisher', 'stone_cold', 'keeper_of_ages']) expect(tier(id), id).toBe('seal');
    expect(tier('archivist')).toBe('leaf');
    expect(tier('grand_curator')).toBe('leaf');
  });

  it('caps the milestones in bronze, silver or gold by how far they reach', () => {
    expect(tier('collector')).toBe('bronze');
    expect(tier('siege_scholar')).toBe('bronze');
    expect(tier('veteran')).toBe('silver');
    expect(tier('curator')).toBe('silver');
    expect(tier('speedrunner')).toBe('gold');
    expect(tier('ageborn')).toBe('gold');
    expect(tier('conqueror')).toBe('gold');
    expect(tier('master_smith')).toBe('gold');
    for (const t of content.cosmetics.titles) expect(['parchment', 'bronze', 'silver', 'gold', 'seal', 'leaf'], t.id).toContain(titleTier(t));
  });
});
