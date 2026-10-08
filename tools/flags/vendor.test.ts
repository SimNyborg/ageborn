/**
 * The national flag vendoring tool and its outputs (PLAN 2d "Vendoring", 2g Track D #1, #3, #4).
 * The pure parts run on synthetic input; the outputs are the files in `public/art/flags/` and
 * `assets-src/flags/` that `npx tsx tools/flags/vendor.ts <flag-icons-7.5.0.tgz>` wrote.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { nationalFlagItems } from '../../src/content/raw/nationalFlags';
import { VENDORED_FLAGS } from '../../src/visuals/cosmetics/nationalFlags';
import { flagCodes, integrityOf, licenceText, minifySvg, PATCHES, PINNED, unsafeSvg, untar } from './vendor';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PUB = path.join(ROOT, 'public', 'art', 'flags');
const SRC = path.join(ROOT, 'assets-src', 'flags');

/** A ustar archive (gzipped) of the given files, built by hand. */
function tgz(files: Record<string, string>): Buffer {
  const blocks: Buffer[] = [];
  for (const [name, body] of Object.entries(files)) {
    const head = Buffer.alloc(512);
    head.write(name, 0, 'utf8');
    head.write('0000644\0', 100);
    head.write(`${Buffer.byteLength(body).toString(8).padStart(11, '0')}\0`, 124);
    head.write('0', 156);
    head.write('ustar\0', 257);
    blocks.push(head, Buffer.from(body), Buffer.alloc((512 - (Buffer.byteLength(body) % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

describe('the vendoring tool', () => {
  it('pins flag-icons 7.5.0 by version and sha512 integrity', () => {
    expect(PINNED).toMatchObject({ name: 'flag-icons', version: '7.5.0' });
    expect(PINNED.integrity).toMatch(/^sha512-[A-Za-z0-9+/]{86}==$/);
    expect(integrityOf(Buffer.from('abc'))).toBe('sha512-3a81oZNherrMQXNJriBBMRLm+k6JqX6iCp7u5ktV05ohkpkqJ0/BqDa6PCOj/uu9RU1EI2Q86A4qmslPpUyknw==');
  });

  it('reads a tar archive', () => {
    const files = untar(tgz({ 'package/package.json': '{"name":"x"}', 'package/flags/4x3/dk.svg': '<svg/>' }));
    expect(files.get('package/package.json')?.toString()).toBe('{"name":"x"}');
    expect(files.get('package/flags/4x3/dk.svg')?.toString()).toBe('<svg/>');
  });

  it('refuses SVGs that could run or fetch anything', () => {
    const ok = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 640 480"><use xlink:href="#a"/><path fill="url(#g)" d="M0 0h1z"/></svg>';
    expect(unsafeSvg(ok)).toBeNull();
    expect(unsafeSvg('<svg><script>alert(1)</script></svg>')).toBe('script');
    expect(unsafeSvg('<svg><path onload="x()"/></svg>')).toBe('event handler');
    expect(unsafeSvg('<svg><foreignObject/></svg>')).toBe('foreignObject');
    expect(unsafeSvg('<svg><use href="https://evil.example/x.svg#a"/></svg>')).toBe('external reference');
    expect(unsafeSvg('<svg><image href="data:image/png;base64,AA"/></svg>')).toBe('embedded document or image');
    expect(unsafeSvg('<svg><path fill="url(https://evil.example/a)"/></svg>')).toBe('external url()');
    expect(unsafeSvg("<svg><path fill=\"url('#a')\"/></svg>")).toBeNull();
    expect(unsafeSvg('<html></html>')).toBe('not an SVG document');
  });

  it('minifies without touching the design and gives the root its size', () => {
    const raw = '<?xml version="1.0"?>\n<!-- c -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">\n  <metadata>m</metadata>\n  <path fill="#c8102e"\n    d="M0 0h640v480H0z"/>\n</svg>\n';
    expect(minifySvg(raw)).toBe('<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#c8102e" d="M0 0h640v480H0z"/></svg>\n');
    expect(minifySvg(minifySvg(raw))).toBe(minifySvg(raw));
  });

  it('vendors exactly the flags of the content', () => {
    expect(flagCodes()).toEqual(nationalFlagItems.map((x) => x.country).sort());
    expect(flagCodes()).toHaveLength(200);
    expect([...VENDORED_FLAGS].sort()).toEqual(nationalFlagItems.map((x) => x.id).sort());
  });

  it('patches Cabo Verde: its star ring 3/8 of the length from the hoist, the rest untouched (review 1)', () => {
    const src = '<svg width="640" height="480"><g transform="translate(115.7)scale(.94)"><path fill="#de3929" d="M0 0h1z"/><path fill="#ffce08" d="m131 399.2 6.6 20.4"/></g></svg>\n';
    const out = PATCHES['cv']!(src);
    expect(out).toContain('<path fill="#ffce08" transform="translate(-68.6)" d="m131 399.2 6.6 20.4"/>');
    expect(out.replace(' transform="translate(-68.6)"', '')).toBe(src);
    // the ring's centre (x 200.8 of the group, measured from the star path) lands at 3/8 of 640 px
    expect(115.7 + 0.94 * (200.8 - 68.6)).toBeCloseTo(0.375 * 640, 0);
    expect(() => PATCHES['cv']!('<svg/>')).toThrow(/no longer matches/);
    // the shipped file carries it
    expect(readFileSync(path.join(ROOT, 'public', 'art', 'flags', 'svg', 'cv.svg'), 'utf8')).toContain('transform="translate(-68.6)"');
  });

  it('licence: the MIT notice ships with the copies, with its source', () => {
    for (const dir of [PUB, SRC]) {
      const text = readFileSync(path.join(dir, 'LICENSE-flag-icons.txt'), 'utf8');
      expect(text).toContain('MIT License');
      expect(text).toContain('Copyright (c) 2013 Panayiotis Lipiridis');
      expect(text).toContain('Permission is hereby granted, free of charge');
      expect(text.startsWith(licenceText('x').split('\n')[0]!)).toBe(true);
    }
  });
});

describe('the vendored files', () => {
  const codes = flagCodes();

  it('every flag has its SVG, the same in the source and the served copy, safe and minified', () => {
    expect(readdirSync(path.join(PUB, 'svg')).sort()).toEqual(codes.map((c) => `${c}.svg`).sort());
    expect(readdirSync(path.join(SRC, '4x3')).sort()).toEqual(codes.map((c) => `${c}.svg`).sort());
    let gz = 0;
    let max = 0;
    for (const c of codes) {
      const served = readFileSync(path.join(PUB, 'svg', `${c}.svg`));
      expect(served.equals(readFileSync(path.join(SRC, '4x3', `${c}.svg`))), c).toBe(true);
      const svg = served.toString('utf8');
      expect(unsafeSvg(svg), c).toBeNull();
      expect(minifySvg(svg), c).toBe(svg);
      expect(svg, c).toMatch(/^<svg width="640" height="480" [^>]*viewBox="0 0 640 480"/);
      const n = gzipSync(served, { level: 9 }).length;
      gz += n;
      max = Math.max(max, n);
    }
    // PLAN 2d: about 2 KB gzipped on average; Serbia's arms are the largest (about 50 KB)
    expect(gz / codes.length).toBeLessThan(2.5 * 1024);
    expect(max).toBeLessThan(55 * 1024);
  });

  it('the atlases hold every flag in 16 columns within their budgets (PLAN 2g Track D #4)', () => {
    const atlas = JSON.parse(readFileSync(path.join(PUB, 'atlas.json'), 'utf8')) as { cols: number; rows: number; sizes: Record<string, { file: string; cell: number[] }>; cells: Record<string, number> };
    expect(atlas.cols).toBe(16);
    expect(atlas.rows).toBe(Math.ceil(codes.length / 16));
    expect(Object.keys(atlas.cells).sort()).toEqual([...codes].sort());
    expect(Object.values(atlas.cells).sort((a, b) => a - b)).toEqual(codes.map((_, i) => i));
    expect(atlas.sizes).toEqual({ '64': { file: 'atlas-64.webp', cell: [64, 48] }, '128': { file: 'atlas-128.webp', cell: [128, 96] } });
    const kb = (f: string) => statSync(path.join(PUB, f)).size / 1024;
    expect(kb('atlas-64.webp')).toBeLessThanOrEqual(80);
    expect(kb('atlas-128.webp')).toBeLessThanOrEqual(170);
    // a WebP (RIFF....WEBP) of the right width and height (VP8X canvas size)
    for (const [file, w, h] of [
      ['atlas-64.webp', 1024, 624],
      ['atlas-128.webp', 2048, 1248],
    ] as const) {
      const b = readFileSync(path.join(PUB, file));
      expect(b.toString('ascii', 0, 4)).toBe('RIFF');
      expect(b.toString('ascii', 8, 12)).toBe('WEBP');
      expect(b.toString('ascii', 12, 16)).toBe('VP8X');
      expect(1 + b.readUIntLE(24, 3)).toBe(w);
      expect(1 + b.readUIntLE(27, 3)).toBe(h);
    }
    expect(existsSync(path.join(PUB, 'LICENSE-flag-icons.txt'))).toBe(true);
  });
});
