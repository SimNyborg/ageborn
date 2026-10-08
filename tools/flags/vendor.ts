/**
 * Vendors the national flag designs (PLAN 2d, Track D): flag-icons 7.5.0 by Panayiotis Lipiridis (MIT),
 * read from its npm tarball. The tarball is fetched once into a scratch folder, never into the project
 * (no `package.json` or lockfile change):
 *
 *   npm pack flag-icons@7.5.0 --pack-destination <scratch>
 *   npx tsx tools/flags/vendor.ts <scratch>/flag-icons-7.5.0.tgz            # writes the files
 *   npx tsx tools/flags/vendor.ts <scratch>/flag-icons-7.5.0.tgz --check    # compares, exits 1 on a difference
 *
 * - **Pinned.** The tarball must be flag-icons 7.5.0 with the pinned sha512 integrity; nothing else is
 *   accepted. Nothing from it is executed: only the 4:3 SVGs and the licence are read.
 * - **Which flags.** Exactly the rows of `src/content/raw/nationalFlags.ts` (the 195 and the Other flags).
 * - **Safety.** An SVG with a script, an event handler, `foreignObject`, an embedded document or an
 *   external reference is refused (the files are served from the game's origin).
 * - **Minified without a dependency:** comments, metadata and whitespace go; the root gets its 640 x 480
 *   size (so every browser can draw it into a canvas). The design itself is untouched.
 * - **Outputs.**
 *   - `assets-src/flags/4x3/<code>.svg` and `assets-src/flags/LICENSE-flag-icons.txt`: the vendored source.
 *   - `public/art/flags/svg/<code>.svg`: the same files, served (the big view, the lane cloth, VS, Profile).
 *   - `public/art/flags/atlas-64.webp` and `atlas-128.webp`: every flag in 16 columns of 64 x 48 and
 *     128 x 96 cells (the Flag Atlas grid on DPR < 1.5 and ≥ 1.5), rasterised by Playwright's Chromium
 *     (a devDependency) and checked cell by cell (drawn, opaque enough, at least two colours).
 *   - `public/art/flags/atlas.json`: the cell of each code, the columns and the cell sizes.
 *   - `public/art/flags/LICENSE-flag-icons.txt`: the MIT notice, shipped with the copies.
 * - **Deterministic:** the same tarball (and the same Chromium) writes identical files.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { nationalFlagItems } from '../../src/content/raw/nationalFlags';

/** The one accepted source (PLAN 2d "Vendoring"). Re-vendoring a new release changes these on purpose. */
export const PINNED = {
  name: 'flag-icons',
  version: '7.5.0',
  integrity: 'sha512-kd+MNXviFIg5hijH766tt+3x76ele1AXlo4zDdCxIvqWZhKt4T83bOtxUOOMlTx/EcFdUMH5yvQgYlFh1EqqFg==',
  tarball: 'https://registry.npmjs.org/flag-icons/-/flag-icons-7.5.0.tgz',
} as const;

/** Atlas layout: 16 columns; 64 x 48 cells (1x) and 128 x 96 (2x); WebP quality. */
export const ATLAS = { cols: 16, sizes: [[64, 48, 0.8] as const, [128, 96, 0.78] as const] } as const;

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT_SRC = path.join(ROOT, 'assets-src', 'flags');
const OUT_PUBLIC = path.join(ROOT, 'public', 'art', 'flags');

/** The vendored file name of every national flag of the content (`gb-eng` for England), sorted. */
export function flagCodes(): string[] {
  return nationalFlagItems.map((x) => x.country ?? x.id.replace('_', '-')).sort();
}

/** The npm `integrity` string (sha512, base64) of a file's bytes. */
export function integrityOf(bytes: Uint8Array): string {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

/** The files of a (gzipped) tar archive: ustar names with their prefix, pax `path` records honoured. */
export function untar(tgz: Uint8Array): Map<string, Buffer> {
  const tar = gunzipSync(tgz);
  const files = new Map<string, Buffer>();
  const text = (b: Buffer, from: number, len: number): string => {
    const raw = b.subarray(from, from + len);
    const end = raw.indexOf(0);
    return raw.subarray(0, end < 0 ? raw.length : end).toString('utf8');
  };
  let off = 0;
  let paxPath: string | null = null;
  while (off + 512 <= tar.length) {
    const head = tar.subarray(off, off + 512);
    if (head.every((v) => v === 0)) break;
    const size = parseInt(text(head, 124, 12).trim() || '0', 8);
    const type = String.fromCharCode(head[156] ?? 48);
    const prefix = text(head, 345, 155);
    const name = paxPath ?? (prefix ? `${prefix}/${text(head, 0, 100)}` : text(head, 0, 100));
    const body = tar.subarray(off + 512, off + 512 + size);
    paxPath = null;
    if (type === 'x') {
      // pax extended header: "<len> path=<name>\n" records for the next entry
      for (const rec of body.toString('utf8').split('\n')) {
        const m = /^\d+ path=(.*)$/.exec(rec);
        if (m) paxPath = m[1] ?? null;
      }
    } else if (type === '0' || type === '\0') {
      files.set(name, Buffer.from(body));
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

/** Why an SVG may not be served from the game's origin, or null when it is safe. */
export function unsafeSvg(svg: string): string | null {
  const rules: [RegExp, string][] = [
    [/<script/i, 'script'],
    [/<foreignObject/i, 'foreignObject'],
    [/<(iframe|embed|object|image)\b/i, 'embedded document or image'],
    [/\son[a-z]+\s*=/i, 'event handler'],
    [/javascript:/i, 'javascript: URL'],
    [/(?:xlink:)?href\s*=\s*["'](?!#)/i, 'external reference'],
    [/url\((?!\s*["']?#)/i, 'external url()'],
    [/@import/i, '@import'],
  ];
  for (const [re, why] of rules) if (re.test(svg)) return why;
  if (!/^<svg[\s>]/.test(svg.trim())) return 'not an SVG document';
  return null;
}

/** Strips comments, metadata and whitespace (no dependency) and gives the root its 640 x 480 size. */
export function minifySvg(svg: string): string {
  let s = svg
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(metadata|title|desc)\b[\s\S]*?<\/\1>/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  if (!/^<svg[^>]*\swidth=/.test(s)) s = s.replace(/^<svg/, '<svg width="640" height="480"');
  return `${s}\n`;
}

/** The licence file shipped with the copies: a source line, then the package's MIT notice unchanged. */
export function licenceText(licence: string): string {
  return `National flag artwork: ${PINNED.name} ${PINNED.version} (${PINNED.tarball}), vendored by tools/flags/vendor.ts.\n\n${licence.trim()}\n`;
}

export interface AtlasCellCheck {
  code: string;
  /** Share of the cell's pixels that are opaque (alpha > 200). */
  cover: number;
  /** Distinct opaque colours seen (counted up to 3). */
  colors: number;
}

/** The in-page rasteriser (plain JavaScript, serialised into the page as text). */
const RASTER = `async (a) => {
  const imgs = await Promise.all(a.flags.map((f) => new Promise((ok, bad) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => bad(new Error('cannot draw ' + f.code));
    i.src = 'data:image/svg+xml;base64,' + f.b64;
  })));
  const out = [];
  for (const [w, h, q] of a.sizes) {
    const rows = Math.ceil(a.flags.length / a.cols);
    const c = document.createElement('canvas');
    c.width = a.cols * w;
    c.height = rows * h;
    const ctx = c.getContext('2d');
    imgs.forEach((img, i) => ctx.drawImage(img, (i % a.cols) * w, Math.floor(i / a.cols) * h, w, h));
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const cells = a.flags.map((f, i) => {
      const x0 = (i % a.cols) * w;
      const y0 = Math.floor(i / a.cols) * h;
      let opaque = 0;
      const colors = new Set();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = ((y0 + y) * c.width + x0 + x) * 4;
        if (data[k + 3] > 200) {
          opaque++;
          if (colors.size < 3) colors.add((data[k] << 16) | (data[k + 1] << 8) | data[k + 2]);
        }
      }
      return { code: f.code, cover: opaque / (w * h), colors: colors.size };
    });
    out.push({ w, h, url: c.toDataURL('image/webp', q), cells });
  }
  return out;
}`;

/** Rasterises the atlases in Playwright's Chromium (a devDependency; imported only when needed). */
async function rasterise(svgs: { code: string; svg: string }[]): Promise<{ w: number; h: number; webp: Buffer; cells: AtlasCellCheck[] }[]> {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await page.setContent('<!doctype html><html><body></body></html>');
    const arg = { cols: ATLAS.cols, sizes: ATLAS.sizes, flags: svgs.map((f) => ({ code: f.code, b64: Buffer.from(f.svg).toString('base64') })) };
    const res = (await page.evaluate(`(${RASTER})(${JSON.stringify(arg)})`)) as { w: number; h: number; url: string; cells: AtlasCellCheck[] }[];
    return res.map((r) => ({ w: r.w, h: r.h, cells: r.cells, webp: Buffer.from(r.url.slice(r.url.indexOf(',') + 1), 'base64') }));
  } finally {
    await browser.close();
  }
}

/** Every file the tool writes, by path relative to the repo root. */
export async function vendor(tgzPath: string, o: { atlas?: boolean } = {}): Promise<Map<string, Buffer>> {
  const bytes = readFileSync(tgzPath);
  const integrity = integrityOf(bytes);
  if (integrity !== PINNED.integrity) throw new Error(`integrity mismatch: got ${integrity}, pinned ${PINNED.integrity}`);
  const files = untar(bytes);
  const pkg = JSON.parse(files.get('package/package.json')?.toString('utf8') ?? '{}') as { name?: string; version?: string; license?: string };
  if (pkg.name !== PINNED.name || pkg.version !== PINNED.version || pkg.license !== 'MIT') throw new Error(`unexpected package ${pkg.name}@${pkg.version} (${pkg.license})`);
  const licence = files.get('package/LICENSE')?.toString('utf8');
  if (!licence || !/MIT License/.test(licence) || !/Panayiotis Lipiridis/.test(licence)) throw new Error('the MIT licence notice is missing');

  const out = new Map<string, Buffer>();
  const lic = Buffer.from(licenceText(licence));
  out.set('assets-src/flags/LICENSE-flag-icons.txt', lic);
  out.set('public/art/flags/LICENSE-flag-icons.txt', lic);

  const svgs: { code: string; svg: string }[] = [];
  for (const code of flagCodes()) {
    const raw = files.get(`package/flags/4x3/${code}.svg`)?.toString('utf8');
    if (raw === undefined) throw new Error(`flag-icons has no 4x3/${code}.svg`);
    const svg = minifySvg(raw);
    const why = unsafeSvg(svg);
    if (why) throw new Error(`${code}.svg refused: ${why}`);
    svgs.push({ code, svg });
    out.set(`assets-src/flags/4x3/${code}.svg`, Buffer.from(svg));
    out.set(`public/art/flags/svg/${code}.svg`, Buffer.from(svg));
  }

  if (o.atlas !== false) {
    const atlases = await rasterise(svgs);
    for (const a of atlases) {
      const bad = a.cells.filter((c) => c.cover < 0.2 || c.colors < 2);
      if (bad.length) throw new Error(`atlas ${a.w}: cells not drawn: ${bad.map((c) => `${c.code} (${Math.round(c.cover * 100)}%, ${c.colors} colours)`).join(', ')}`);
      out.set(`public/art/flags/atlas-${a.w}.webp`, a.webp);
    }
    const json = {
      source: `${PINNED.name} ${PINNED.version} (MIT)`,
      cols: ATLAS.cols,
      rows: Math.ceil(svgs.length / ATLAS.cols),
      sizes: Object.fromEntries(ATLAS.sizes.map(([w, h]) => [String(w), { file: `atlas-${w}.webp`, cell: [w, h] }])),
      cells: Object.fromEntries(svgs.map((f, i) => [f.code, i])),
    };
    out.set('public/art/flags/atlas.json', Buffer.from(`${JSON.stringify(json)}\n`));
  }
  return out;
}

/** Writes the files (and removes vendored SVGs no longer in the list), or compares them with `check`. */
export function writeOrCheck(files: Map<string, Buffer>, check: boolean): string[] {
  const diffs: string[] = [];
  for (const [rel, data] of files) {
    const p = path.join(ROOT, rel);
    const same = existsSync(p) && readFileSync(p).equals(data);
    if (same) continue;
    diffs.push(rel);
    if (!check) {
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, data);
    }
  }
  for (const dir of [path.join(OUT_SRC, '4x3'), path.join(OUT_PUBLIC, 'svg')]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const rel = path.relative(ROOT, path.join(dir, f)).split(path.sep).join('/');
      if (files.has(rel)) continue;
      diffs.push(`${rel} (stale)`);
      if (!check) rmSync(path.join(dir, f));
    }
  }
  return diffs;
}

async function main(argv: readonly string[]): Promise<number> {
  const check = argv.includes('--check');
  const tgz = argv.find((a) => !a.startsWith('--'));
  if (!tgz) {
    console.error('usage: npx tsx tools/flags/vendor.ts <flag-icons-7.5.0.tgz> [--check]');
    return 2;
  }
  const files = await vendor(tgz);
  const diffs = writeOrCheck(files, check);
  const size = (rel: string): string => `${((files.get(rel)?.length ?? 0) / 1024).toFixed(1)} KB`;
  console.log(`${PINNED.name} ${PINNED.version}: ${flagCodes().length} flags; atlas-64 ${size('public/art/flags/atlas-64.webp')}, atlas-128 ${size('public/art/flags/atlas-128.webp')}`);
  if (check) {
    if (diffs.length) console.error(`out of date: ${diffs.join(', ')}`);
    else console.log('up to date');
    return diffs.length ? 1 : 0;
  }
  console.log(diffs.length ? `wrote ${diffs.length} file(s)` : 'no change');
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    },
  );
}
