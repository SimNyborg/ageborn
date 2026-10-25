/**
 * Base skins of the cosmetic collections (DESIGN A18.9.4): a restyle of one age's base with the same
 * size, silhouette and mounts. The lane shows it as a body tint (the team layer keeps its colour, A11),
 * a trim colour on the flag poles and an ambient layer of particles (snow, embers, petals ...).
 * Tints are strong enough to tell a skin from the standard base at lane size (reviewed 2026-09-29).
 *
 * Owned by Track B (PLAN 2c: base skins as real models). A skin with a model (`WORLD_BASE_SKINS`,
 * `base.<age>@<id>`, sheet `art/bases/skins/<id>.json`) shows as itself in the lane, on VS and Home;
 * its model loads lazily, and its `BASE_SKINS` tint stays as the stand-in while the sheet streams in.
 * C0 (2026-10-08) moved the skin's code-drawn keep and layers here from `art.ts`, which routes
 * `baseSkin.*` to this module, and added `baseSkinThumbUrl`: the model's pre-rendered thumbnail from one
 * atlas for every model (`art/bases/skins/thumbs.webp`, art/blender/world/base_thumbs.py), loaded on the
 * first ask.
 */
import { WORLD_BASE_SKINS } from '../manifest.world';
import { circle, hex, INK, poly, rect, shade, shapesToSvg, star, type Paints, type Shape } from './shapes';

/** The preview team colour (side 0 blue, A11). */
const TEAM = 0x2f7df6;

/** Ambient particle kinds: the tint skins' fields, plus the models' own mist, rain, smoke and steam (round 2). */
export type SkinParticles =
  | 'snow'
  | 'fireflies'
  | 'glints'
  | 'petals'
  | 'embers'
  | 'dust'
  | 'stars'
  | 'mist'
  | 'rain'
  | 'smoke'
  | 'steam'
  // round 3: birds gliding past a skin model (the Jungle Outpost's birds, the harbour skins' gulls) and smoke
  // rings puffed by a sleeping dragon (the Wyrm-Coil Keep)
  | 'birds'
  | 'rings';

export interface BaseSkinArt {
  /** Multiplied into the base body (never the team layer). */
  tint: number;
  /** Pole caps and trim. */
  trim: number;
  particles: SkinParticles;
  particleColor: number;
}

export const BASE_SKINS: Readonly<Record<string, BaseSkinArt>> = {
  frost_cave: { tint: 0xb4d4ff, trim: 0x9fd8ff, particles: 'snow', particleColor: 0xffffff },
  mossy_den: { tint: 0xb4d894, trim: 0x7fc26a, particles: 'fireflies', particleColor: 0xdcff7a },
  gilded_ziggurat: { tint: 0xffd978, trim: 0xffcf3a, particles: 'glints', particleColor: 0xfff2b0 },
  rose_keep: { tint: 0xffb4c6, trim: 0xff8fb0, particles: 'petals', particleColor: 0xff9ab8 },
  snowy_keep: { tint: 0xd8e6ff, trim: 0xbfe3ff, particles: 'snow', particleColor: 0xffffff },
  coral_fort: { tint: 0xffb296, trim: 0xff8a6a, particles: 'glints', particleColor: 0xffe2d2 },
  copper_foundry: { tint: 0xffa46e, trim: 0xd9824b, particles: 'embers', particleColor: 0xffa040 },
  desert_bunker: { tint: 0xeccd86, trim: 0xd9b36a, particles: 'dust', particleColor: 0xe8d4a4 },
  // magenta and mint, never cyan beside the team blue (PLAN 2c); the model's own glints take the mint
  midnight_neon: { tint: 0x8c92ff, trim: 0xf03aa8, particles: 'glints', particleColor: 0x3af0b4 },
  nebula_ark: { tint: 0xc8a4ff, trim: 0xbda8ff, particles: 'stars', particleColor: 0xffffff },
};

/** True when the visuals can draw `baseSkin.<id>` (its model, or its tint on the standard base). */
export function hasBaseSkinArt(id: string): boolean {
  return BASE_SKINS[id] !== undefined || hasBaseSkinModel(id);
}

/** True when `baseSkin.<id>` has a real model (`base.<age>@<id>`, PLAN 2c), not only a tint. */
export function hasBaseSkinModel(id: string): boolean {
  return WORLD_BASE_SKINS[id] !== undefined;
}

/**
 * Where a Legendary model's white aura shines in its base picture when it is not round the whole body (Colossus
 * Lighthouse's raised torch): centre and radius as fractions of the square picture's side (the base portrait, plate
 * off, standing on the bottom edge; side 0: the screens mirror x for side 1). Measured from the sheet's
 * `meta.ageborn.auraLu` and the portrait's framing (`basePortraitSpot`; a test holds the two equal). Null for every
 * other skin: the screens keep the upright ellipse about the body.
 */
const AURA_SPOTS: Readonly<Record<string, { x: number; y: number; r: number }>> = {
  colossus_lighthouse: { x: 0.446, y: 0.045, r: 0.134 },
};

export function baseSkinAuraSpot(id: string): { x: number; y: number; r: number } | null {
  return AURA_SPOTS[id] ?? null;
}

/** The base skin's lane look (tint, trim, particles) for a `baseSkin.<id>` key, or null (no key, or a model without a tint). */
export function baseSkinArt(key: string | null | undefined): BaseSkinArt | null {
  if (!key || !key.startsWith('baseSkin.')) return null;
  return BASE_SKINS[key.slice('baseSkin.'.length)] ?? null;
}

/** The standard base (no skin) in the Customize mock-up. */
const STANDARD_BASE = { tint: 0xffffff, trim: 0xc9a227, particles: 'dust', particleColor: 0xd9cdb8 } as const;

/** Multiplies two colours (a tint over the base's stone, as the lane's sprite tint does). */
function mul(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A small keep in the skin's colours with its ambient particles, for tiles and the base mock-up. */
function baseSkinShapes(id: string): Shape[] | null {
  const plain = id === 'default';
  const s = plain ? STANDARD_BASE : BASE_SKINS[id];
  if (!s) return null;
  const stone = mul(0xe2d6bf, plain ? 0xffffff : s.tint);
  const wall = hex(stone);
  const side = hex(shade(stone, -0.16));
  const dark = hex(shade(stone, -0.4));
  const hi = hex(shade(stone, 0.45));
  const trim = hex(s.trim);
  const trimDark = hex(shade(s.trim, -0.3));
  const O = { stroke: INK, width: 1.3 };
  const crenels = (x0: number, x1: number, y: number, w = 3.2): Shape[] => {
    const out: Shape[] = [];
    for (let x = x0; x + w <= x1 + 0.01; x += w * 2) out.push(rect(x, y - 3, w, 3.2, wall, O));
    return out;
  };
  const bricks = (x0: number, x1: number, y0: number, y1: number): Shape[] => {
    const out: Shape[] = [];
    for (let y = y0 + 4; y < y1 - 1; y += 4.5) out.push({ d: `M${x0 + 1} ${y}H${x1 - 1}`, stroke: dark, width: 0.5, alpha: 0.45 });
    return out;
  };
  const dots: Shape[] = [];
  for (let i = 0; i < (plain ? 0 : 7); i += 1) {
    const x = 6 + ((i * 37) % 52);
    const y = 4 + ((i * 23) % 24);
    dots.push(s.particles === 'glints' || s.particles === 'stars' ? star(x, y, 2, hex(s.particleColor), { n: 4, ri: 0.6 }) : circle(x, y, 1.1, hex(s.particleColor), { alpha: 0.9 }));
  }
  return [
    // side towers with conical roofs in the skin's trim
    rect(5, 16, 11, 30, side, O),
    ...bricks(5, 16, 16, 46),
    poly([3.5, 16.5, 10.5, 5, 17.5, 16.5], trim, O),
    poly([10.5, 5, 17.5, 16.5, 12, 16.5], trimDark, { alpha: 0.6 }),
    rect(48, 16, 11, 30, side, O),
    ...bricks(48, 59, 16, 46),
    poly([46.5, 16.5, 53.5, 5, 60.5, 16.5], trim, O),
    poly([53.5, 5, 60.5, 16.5, 55, 16.5], trimDark, { alpha: 0.6 }),
    // curtain wall
    rect(14, 22, 36, 24, wall, O),
    ...bricks(14, 50, 22, 46),
    ...crenels(14.6, 22, 22),
    ...crenels(42, 49.4, 22),
    // the keep
    rect(23, 9, 18, 37, wall, O),
    rect(34, 10, 6.4, 35.4, dark, { alpha: 0.22 }),
    ...bricks(23, 41, 9, 46),
    ...crenels(23.4, 41, 9, 3),
    rect(24.5, 10.5, 1.6, 33, hi, { alpha: 0.7 }),
    // windows with warm light, and the gate
    { d: 'M29 20v-3a3 3 0 0 1 6 0v3z', fill: '#ffd27a', stroke: INK, width: 1 },
    rect(9, 24, 3, 4.4, '#ffd27a', { stroke: INK, width: 0.9 }),
    rect(52, 24, 3, 4.4, '#ffd27a', { stroke: INK, width: 0.9 }),
    { d: 'M27.5 46v-8a4.5 4.5 0 0 1 9 0v8z', fill: '#4a3424', stroke: INK, width: 1.2 },
    { d: 'M30.5 46v-9M33.5 46v-9', stroke: '#2e2016', width: 0.7 },
    // the team banner on the keep
    { d: 'M29 24h6v7l-3-1.6-3 1.6z', fill: 'team', stroke: INK, width: 1 },
    rect(29, 24, 6, 1.4, trim),
    // footing
    rect(3, 45.2, 58, 2.4, trim, O),
    ...dots,
  ];
}

const f1 = (v: number): string => (Math.round(v * 10) / 10).toString();

/** A four-point glint at x, y (radius r) that flashes every `dur` s from `begin` s (still and faint without motion). */
function glintSvg(x: number, y: number, r: number, color: string, dur: number, begin: number, animate: boolean): string {
  const q = r * 0.22;
  const d = `M${f1(x)} ${f1(y - r)}L${f1(x + q)} ${f1(y - q)}L${f1(x + r)} ${f1(y)}L${f1(x + q)} ${f1(y + q)}L${f1(x)} ${f1(y + r)}L${f1(x - q)} ${f1(y + q)}L${f1(x - r)} ${f1(y)}L${f1(x - q)} ${f1(y - q)}Z`;
  if (!animate) return `<path d="${d}" fill="${color}" opacity="0.7"/>`;
  return `<path d="${d}" fill="${color}" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.55;.7;.85;1" dur="${dur}s" begin="-${f1(begin)}s" repeatCount="indefinite"/></path>`;
}

/**
 * The menu pictures' life for the models with a prop loop (round 3, PLAN 2c): the fx layer over the model's
 * portrait (`BaseLook` on VS, Home and in Customize; Track C draws the Legendary aura under it) shows what the
 * lane's loop shows. Crystal Spire: glints flash on its ring of shards while two sparks circle with them.
 * Nebula Ark: soft wisps of nebula swirl round the hull (gone while they pass behind it) under twinkling stars.
 * Positions are in the portrait's 100 x 100 box (the model stands on its bottom edge, 96% of its height; laid
 * out from the installed sheets). Still under Reduce motion: the glints and wisps rest, faint.
 */
function modelFxSvg(id: string, animate: boolean): string | null {
  const parts: string[] = [];
  if (id === 'crystal_spire') {
    const white = '#ffffff';
    const lilac = '#f4eeff';
    // the ring of shards round the top of the great crystal (centre 45.5, 36), and the tip's point
    [
      [33.5, 34.5, 3.2, 2.9, 0.2],
      [52, 32.2, 2.8, 3.4, 1.4],
      [58, 38.5, 2.6, 2.6, 0.9],
      [41, 40.2, 2.4, 3.1, 2.2],
      [45, 7.5, 2.8, 4.4, 3.0],
    ].forEach(([x, y, r, dur, b]) => parts.push(glintSvg(x!, y!, r!, white, dur!, b!, animate)));
    // facets of the spire catching the light lower down
    [
      [36, 52, 2.4, 3.6, 0.6],
      [56, 60, 2.2, 4.2, 2.6],
      [33, 72, 2.0, 3.8, 1.8],
    ].forEach(([x, y, r, dur, b]) => parts.push(glintSvg(x!, y!, r!, lilac, dur!, b!, animate)));
    // two sparks circling with the shards (the ring's ellipse), each hidden while it passes behind the crystal
    const orbit = 'M59 36A13.5 4 0 1 1 32 36A13.5 4 0 1 1 59 36Z';
    for (const [b, r] of [
      [0, 1.3],
      [1.3, 1.0],
    ] as const) {
      if (!animate) continue;
      parts.push(
        `<circle r="${r}" fill="${white}"><animateMotion path="${orbit}" dur="2.6s" begin="-${b}s" repeatCount="indefinite"/>` +
          `<animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;.45;.5;.95;1" dur="2.6s" begin="-${b}s" repeatCount="indefinite"/></circle>`,
      );
    }
  } else if (id === 'nebula_ark') {
    // wisps swirling round the hull (centre x 45, the hull about 15 wide each side), at three heights
    parts.push(
      '<defs><radialGradient id="nw"><stop offset="0" stop-color="#e6d4ff" stop-opacity="0.85"/>' +
        '<stop offset="0.5" stop-color="#b98be4" stop-opacity="0.5"/><stop offset="1" stop-color="#9a5fd2" stop-opacity="0"/></radialGradient></defs>',
    );
    [
      [72, 19, 6.5, 0],
      [55, 17, 5.6, 1.9],
      [38, 14, 5.0, 3.6],
    ].forEach(([y, rx, dur, b], i) => {
      const left = 45 - rx!;
      const right = 45 + rx!;
      const w = 7 - i;
      if (!animate) {
        parts.push(`<ellipse cx="${f1(45 - rx! * 0.4)}" cy="${f1(y! + 1.5)}" rx="${w}" ry="2.4" fill="url(#nw)" opacity="0.7"/>`);
        return;
      }
      // the front half sweeps left to right a little lower (nearer), then the wisp is behind the hull
      const path = `M${f1(left)} ${f1(y!)}Q45 ${f1(y! + 5)} ${f1(right)} ${f1(y!)}Q45 ${f1(y! - 4)} ${f1(left)} ${f1(y!)}Z`;
      parts.push(
        `<ellipse rx="${w}" ry="2.4" fill="url(#nw)"><animateMotion path="${path}" dur="${dur}s" begin="-${f1(b!)}s" repeatCount="indefinite"/>` +
          `<animate attributeName="opacity" values="0;0.9;0.9;0;0" keyTimes="0;.1;.42;.5;1" dur="${dur}s" begin="-${f1(b!)}s" repeatCount="indefinite"/></ellipse>`,
      );
    });
    [
      [33, 30, 2.0, 3.1, 0.3],
      [58, 26, 1.8, 2.7, 1.2],
      [30, 62, 1.8, 3.4, 2.0],
      [61, 66, 2.0, 2.9, 0.8],
      [47, 18, 1.6, 3.7, 2.6],
    ].forEach(([x, y, r, dur, b]) => parts.push(glintSvg(x!, y!, r!, '#ffffff', dur!, b!, animate)));
  } else {
    return null;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${parts.join('')}</svg>`;
}

/**
 * A base skin's tint swatch or its particle layer (see {@link CosmeticSvgOptions.layer}). The
 * particles move like the lane's: snow and petals fall, embers and fireflies rise, dust drifts,
 * glints and stars twinkle; still when `animate` is off (Reduce motion). A model with a prop loop
 * (Crystal Spire, Nebula Ark) has its own layer instead (`modelFxSvg`, round 3).
 */
export function baseSkinLayerSvg(id: string, layer: 'tint' | 'fx', animate: boolean): string | null {
  if (layer === 'fx') {
    const own = modelFxSvg(id, animate);
    if (own) return own;
  }
  const s = BASE_SKINS[id];
  if (!s) return null;
  if (layer === 'tint') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="none"><rect width="10" height="10" fill="${hex(s.tint)}"/></svg>`;
  const color = hex(s.particleColor);
  const twinkle = s.particles === 'glints' || s.particles === 'stars';
  const parts: string[] = [];
  for (let i = 0; i < 14; i += 1) {
    const x = 6 + ((i * 41) % 88);
    const y = 6 + ((i * 29) % 84);
    const dur = 2.6 + ((i * 7) % 10) / 4;
    const begin = `begin="-${((i * 13) % 20) / 4}s" dur="${dur}s" repeatCount="indefinite"`;
    const shape = twinkle
      ? shapesToSvg([star(x, y, s.particles === 'stars' ? 2.6 : 2.2, color, { n: 4, ri: 0.7 })], { team: TEAM })
      : `<ellipse cx="${x}" cy="${y}" rx="${s.particles === 'petals' ? 1.9 : 1.3}" ry="${s.particles === 'petals' ? 1.1 : 1.3}" fill="${color}"/>`;
    if (!animate) {
      parts.push(`<g opacity="0.85">${shape}</g>`);
      continue;
    }
    const drift =
      s.particles === 'snow' || s.particles === 'petals'
        ? `<animateTransform attributeName="transform" type="translate" values="0 -18;${i % 2 ? 4 : -4} 18" ${begin}/>`
        : s.particles === 'embers' || s.particles === 'fireflies'
          ? `<animateTransform attributeName="transform" type="translate" values="0 16;${i % 2 ? 3 : -3} -16" ${begin}/>`
          : s.particles === 'dust'
            ? `<animateTransform attributeName="transform" type="translate" values="-10 2;10 -2" ${begin}/>`
            : '';
    const fade = `<animate attributeName="opacity" values="0;0.95;0" keyTimes="0;.5;1" ${begin}/>`;
    parts.push(`<g opacity="0">${shape}${drift}${fade}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${parts.join('')}</svg>`;
}

/** The skin's code-drawn keep as SVG (`default` is the standard base), or null. */
export function baseSkinSvg(id: string, p: Paints): string | null {
  const shapes = baseSkinShapes(id);
  return shapes ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48">${shapesToSvg(shapes, p)}</svg>` : null;
}

/** The thumbnail atlas's layout (`art/bases/skins/thumbs.json`): the cell size and each model's cell. */
interface ThumbAtlas {
  image: string;
  cell: number;
  cells: Record<string, [number, number]>;
}

/** Each model's thumbnail as an object URL (one small picture per cell), once the atlas has loaded. */
const thumbUrls = new Map<string, string>();
let thumbLoad: Promise<void> | null = null;
let thumbRetryAt = 0;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => void (typeof im.decode === 'function' ? im.decode().catch(() => undefined) : Promise.resolve()).then(() => resolve(im));
    im.onerror = () => reject(new Error(`image ${url} failed to load`));
    im.src = url;
  });
}

/**
 * Loads the atlas once (lazily: only a screen that shows a base skin tile asks) and cuts it into one
 * picture per model; the atlas image itself is dropped afterwards. A failure (offline) is retried 10 s
 * later; meanwhile the tiles keep their stand-in.
 */
function loadThumbs(): void {
  if (thumbLoad || typeof document === 'undefined' || typeof fetch !== 'function' || Date.now() < thumbRetryAt) return;
  const dir = `${(import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'}art/bases/skins/`;
  thumbLoad = (async () => {
    const res = await fetch(`${dir}thumbs.json`);
    if (!res.ok) throw new Error(`thumbs.json: ${res.status}`);
    const atlas = (await res.json()) as ThumbAtlas;
    const img = await loadImage(`${dir}${atlas.image}`);
    const n = atlas.cell;
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no 2D canvas');
    for (const [id, [col, row]] of Object.entries(atlas.cells)) {
      ctx.clearRect(0, 0, n, n);
      ctx.drawImage(img, col * n, row * n, n, n, 0, 0, n, n);
      // WebP where the browser encodes it (Safari writes PNG): a few KB a cell
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.9));
      if (blob && !thumbUrls.has(id)) thumbUrls.set(id, URL.createObjectURL(blob));
    }
  })().catch(() => {
    thumbLoad = null;
    thumbRetryAt = Date.now() + 10_000;
  });
}

/**
 * The skin model's pre-rendered thumbnail (PLAN 2c "Thumbnails": the model on a strip of its age's classic
 * scene, a cell of `art/bases/skins/thumbs.webp`), for the Customize tiles and the capsule and crate
 * summary. The first ask starts loading the atlas; null until it is in (the tiles then show the model's
 * portrait over the scene thumbnail, `BaseThumb`, which asks again), and for ids without a model.
 */
export function baseSkinThumbUrl(id: string): string | null {
  const hit = thumbUrls.get(id);
  if (hit) return hit;
  loadThumbs();
  return null;
}
