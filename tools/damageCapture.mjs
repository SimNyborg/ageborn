// Damage-stage captures (queue item 40): every listed unit at damage stages 0-3 in the art gallery at game scale
// (0.92 CSS px per lu: a phone's and a desktop's world scale, A17.7) at DPR 2, as the game composites it (marks, strip
// and stage tint on the unit's own sheet), with a x3 crop sheet per unit and a check of each composited frame:
//
// - team fill: the share of the silhouette that is team colour (A11: at least 18%). Each frame is drawn twice, with the
//   default team preset and with blueYellow (side 1: orange, then yellow); the pixels that differ are the team colour.
// - the colour rule: the share of the silhouette that is saturated (HSV s > 0.4) within 35 degrees of a team hue
//   without being team colour (A11: at most 10%).
// Both on the silhouette less its 2 px edge (edge pixels blend the team colour with the background). The sheet's own art
// sets stage 0 (skin tones count against the rule here, as in the pipeline's check); a damage stage fails when it
// takes the team fill under 18% or 3 points below stage 0, or raises the colour rule over 10% or 1 point above stage 0.
//
// Needs a running dev or preview server (`npm run dev`: `--base http://127.0.0.1:5173/`; a preview build:
// `--base http://127.0.0.1:4173/ageborn/`). `--bundles <dir>` serves `art/damage/<age>.json` from a folder (bundles not
// installed yet). Writes `<out>/<slug>.png` (stages 0-3, x3), `<out>/sheet.png` and `<out>/report.json`; exits 1 when a
// frame fails a check. Dev tool: not part of the build or the test suite.
//
// usage: node tools/damageCapture.mjs [--base URL] [--out DIR] [--bundles DIR] [--units age/slug,...] [--zoom 0.92]
/* global document, window, Image */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
/** One unit of every damage family (item 40 appendix A), two where the family's bodies differ much. */
const FAMILIES = [
  'stone/bonker', 'modern/rifleman', 'medieval/footman', 'bronze/hoplite', 'stone/cave_bear', 'medieval/war_hound',
  'medieval/destrier_knight', 'stone/elk_chieftain', 'bronze/war_chariot', 'modern/tankette', 'modern/gyrocopter',
  'modern/dive_bomber', 'future/walker_mech', 'industrial/steam_golem', 'cosmic/crystal_guard', 'future/holo_projector',
];
const base = arg('base', 'http://127.0.0.1:5173/');
const out = arg('out', 'out/damage-capture');
const bundles = arg('bundles', '');
const zoom = Number(arg('zoom', '0.92'));
const units = (arg('units', '') || FAMILIES.join(',')).split(',').map((s) => s.split('/'));
const PRESETS = ['default', 'blueYellow'];
const FILL_MIN = 0.18;
const RULE_MAX = 0.1;

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {});
const page = await browser.newPage({ viewport: { width: 900, height: 980 }, deviceScaleFactor: 2 });
if (bundles) {
  await page.route(/\/art\/damage\/([a-z]+)\.json$/, async (route) => {
    const age = /\/art\/damage\/([a-z]+)\.json$/.exec(route.request().url())[1];
    const f = path.join(bundles, `${age}.json`);
    if (fs.existsSync(f)) await route.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(f) });
    else await route.fulfill({ status: 404, body: '' });
  });
}

const HOST = '[data-testid="gallery-canvas-host"]';
let first = true;
/** The gallery canvas with one unit (side 1, idle, frozen at 600 ms) at a stage, as a PNG buffer. */
async function shot(age, slug, stage, preset) {
  // dfx=0: no emitters (smoke and sparks would change the unit's silhouette and pixels; they show in battles)
  const q = `section=units&age=${age}&only=${slug}&skins=0&sides=1&clip=idle&damage=${stage}&zoom=${zoom}&t=600&preset=${preset}&dfx=0`;
  if (first) {
    await page.goto(`${base}?dev=1#gallery/${q}`);
    first = false;
  } else {
    await page.evaluate(
      ([sel, h]) => {
        document.querySelector(sel)?.removeAttribute('data-ready');
        window.location.hash = h;
      },
      [HOST, `gallery/${q}`],
    );
  }
  await page.waitForSelector(`${HOST}[data-ready="1"]`, { timeout: 180000 });
  await page.waitForTimeout(400);
  return (await page.$('[data-testid="gallery-canvas"]')).screenshot();
}

/**
 * In the page: the checks and the x3 crops of one unit's eight frames (four stages, two presets). Returns the crop
 * row (a PNG data URL) and the per-stage numbers.
 */
async function analyse(frames) {
  return page.evaluate(async ({ frames, fillMin, ruleMax }) => {
    const load = async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      return { c, d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    };
    // the team hue bands: +-35 deg around every team colour of every preset (palette.ts teamHueBands)
    const TEAM = [0x2f7df6, 0xf28a1e, 0xf2c21e, 0x1f5fd6, 0xff6a00];
    const hsv = (r, g, b) => {
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const s = mx > 0 ? (mx - mn) / mx : 0;
      const dd = mx - mn || 1e-6;
      let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
      h *= 60;
      return [h < 0 ? h + 360 : h, s];
    };
    const hues = TEAM.map((c) => hsv((c >> 16) & 255, (c >> 8) & 255, c & 255)[0]);
    const inBand = (h) => hues.some((t) => Math.abs(((h - t + 540) % 360) - 180) <= 35);
    const stages = [];
    const crops = [];
    let box = null;
    const loaded = [];
    for (const f of frames) loaded.push({ a: await load(f.a), b: await load(f.b) });
    // the two flat backgrounds (canvas and cell panel): the two most common colours of the first frame
    const count = new Map();
    const d0 = loaded[0].a.d;
    for (let i = 0; i < d0.length; i += 4 * 7) {
      const k = (d0[i] << 16) | (d0[i + 1] << 8) | d0[i + 2];
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    const bgs = [...count.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]);
    for (const { a, b } of loaded) {
      const { w, h } = a;
      const sil = new Uint8Array(w * h);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        let s = 1;
        for (const bg of bgs) {
          const da = Math.abs(a.d[i] - bg[0]) + Math.abs(a.d[i + 1] - bg[1]) + Math.abs(a.d[i + 2] - bg[2]);
          const db = Math.abs(b.d[i] - bg[0]) + Math.abs(b.d[i + 1] - bg[1]) + Math.abs(b.d[i + 2] - bg[2]);
          if (da <= 30 && db <= 30) s = 0;
        }
        sil[p] = s;
      }
      // the unit is the biggest band of rows (the cell's label is a band under it)
      const prof = new Array(h).fill(0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) prof[y] += sil[y * w + x];
      let best = [0, 0];
      let bestN = -1;
      for (let y = 0; y < h; ) {
        if (prof[y] === 0) {
          y++;
          continue;
        }
        let e = y;
        let n = 0;
        while (e < h && prof[e] > 0) n += prof[e++];
        if (n > bestN) {
          bestN = n;
          best = [y, e];
        }
        y = e;
      }
      let n = 0;
      let team = 0;
      let bad = 0;
      let x0 = w;
      let x1 = 0;
      // the silhouette less its 2 px edge
      const inner = (x, y) => {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!sil[(y + dy) * w + x + dx]) return false;
        return true;
      };
      for (let y = Math.max(2, best[0]); y < Math.min(h - 2, best[1]); y++) {
        for (let x = 2; x < w - 2; x++) {
          const p = y * w + x;
          if (!sil[p]) continue;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          if (!inner(x, y)) continue;
          const i = p * 4;
          n++;
          const isTeam = Math.abs(a.d[i] - b.d[i]) + Math.abs(a.d[i + 1] - b.d[i + 1]) + Math.abs(a.d[i + 2] - b.d[i + 2]) > 12;
          if (isTeam) team++;
          else {
            const [hh, ss] = hsv(a.d[i] / 255, a.d[i + 1] / 255, a.d[i + 2] / 255);
            if (ss > 0.4 && inBand(hh)) bad++;
          }
        }
      }
      stages.push({ silhouette: n, teamFill: team / Math.max(1, n), colourRule: bad / Math.max(1, n) });
      const bx = [x0, best[0], x1, best[1]];
      box = box ? [Math.min(box[0], bx[0]), Math.min(box[1], bx[1]), Math.max(box[2], bx[2]), Math.max(box[3], bx[3])] : bx;
    }
    // x3 of game scale: DPR 2 frames enlarged 1.5 times (nearest), stage 0-3 side by side
    const pad = 8;
    const [bx0, by0, bx1, by1] = [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
    const cw = Math.round((bx1 - bx0) * 1.5);
    const ch = Math.round((by1 - by0) * 1.5);
    const row = document.createElement('canvas');
    row.width = cw * 4 + 18;
    row.height = ch;
    const rg = row.getContext('2d');
    rg.imageSmoothingEnabled = false;
    rg.fillStyle = '#28282f';
    rg.fillRect(0, 0, row.width, row.height);
    loaded.forEach(({ a }, i) => rg.drawImage(a.c, bx0, by0, bx1 - bx0, by1 - by0, i * (cw + 6), 0, cw, ch));
    crops.push(row.toDataURL('image/png'));
    const s0 = stages[0];
    const ok = stages.every((s, i) => i === 0 || ((s.colourRule <= ruleMax || s.colourRule <= s0.colourRule + 0.01) && (s.teamFill >= fillMin || s.teamFill >= s0.teamFill - 0.03)));
    return { stages, crop: crops[0], ok };
  }, { frames, fillMin: FILL_MIN, ruleMax: RULE_MAX });
}

const report = [];
const rows = [];
for (const [age, slug] of units) {
  const frames = [];
  for (let st = 0; st <= 3; st++) {
    const [a, b] = [await shot(age, slug, st, PRESETS[0]), await shot(age, slug, st, PRESETS[1])];
    frames.push({ a: a.toString('base64'), b: b.toString('base64') });
  }
  const r = await analyse(frames);
  const png = Buffer.from(r.crop.split(',')[1], 'base64');
  fs.writeFileSync(path.join(out, `${slug}.png`), png);
  rows.push(r.crop);
  report.push({ unit: `${age}/${slug}`, ok: r.ok, stages: r.stages.map((s, i) => ({ stage: i, teamFill: +s.teamFill.toFixed(4), colourRule: +s.colourRule.toFixed(4) })) });
  const s3 = r.stages[3];
  const pct = (v) => (v * 100).toFixed(1);
  console.log(`${(age + '/' + slug).padEnd(28)} ${r.ok ? 'ok  ' : 'FAIL'} team fill ${r.stages.map((s) => pct(s.teamFill)).join(' / ')} %  colour rule ${r.stages.map((s) => pct(s.colourRule)).join(' / ')} %  (stage 3: ${pct(s3.teamFill)} % team, ${pct(s3.colourRule)} % rule)`);
}
// the whole sheet: one row per unit
const sheet = await page.evaluate(async (urls) => {
  const imgs = await Promise.all(urls.map(async (u) => {
    const i = new Image();
    i.src = u;
    await i.decode();
    return i;
  }));
  const c = document.createElement('canvas');
  c.width = Math.max(...imgs.map((i) => i.width));
  c.height = imgs.reduce((h, i) => h + i.height + 6, 0);
  const g = c.getContext('2d');
  g.fillStyle = '#1e1e24';
  g.fillRect(0, 0, c.width, c.height);
  let y = 0;
  for (const i of imgs) {
    g.drawImage(i, 0, y);
    y += i.height + 6;
  }
  return c.toDataURL('image/png');
}, rows);
fs.writeFileSync(path.join(out, 'sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ zoom, dpr: 2, fillMin: FILL_MIN, ruleMax: RULE_MAX, units: report }, null, 1));
await browser.close();
const failed = report.filter((r) => !r.ok);
console.log(failed.length === 0 ? `all ${report.length} units pass` : `${failed.length} of ${report.length} fail: ${failed.map((r) => r.unit).join(', ')}`);
process.exit(failed.length === 0 ? 0 : 1);
