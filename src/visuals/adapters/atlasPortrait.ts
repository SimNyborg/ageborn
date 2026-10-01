/**
 * Card portraits for units drawn with 3D sprite sheets (art director review fix 10): a still rendered
 * by the Blender pipeline (`art/blender/gen_portraits.py`) at 256 px, as a base image plus a grey team
 * layer, composited here on the same age plate and foil frame as the procedural portraits, with the
 * team layer tinted in the side's colour. `null` when the still is missing (the caller then draws the
 * procedural portrait).
 */
import type { AgeId, Foil } from '@/contracts/ids';
import { drawPortraitPlate, foilFrame } from '../portraits';
import { drawCloth2d, PORTRAIT_DRESS } from '../fortViews/fortDress';

/**
 * Units whose sheet is installed but whose card still is not rendered yet (`art/blender/gen_portraits.py`
 * needs the render frames). They keep the procedural portrait, so the game never requests a missing file.
 * `src/visuals/test/unitSheets.test.ts` fails once a still appears, so this list shrinks with the art.
 */
export const UNITS_WITHOUT_STILLS: ReadonlySet<string> = new Set(['riveter', 'sapper']);

/** `art/units/<age>/<slug>.json` → `art/portraits/<slug>` (no extension), or null for other sources. */
export function portraitStillBase(source: string): string | null {
  // forts (A16.14.8): `art/forts/<age>/<slug>.json` → `art/forts/<age>/<slug>.portrait`
  const f = /^(.*art\/forts\/[a-z]+\/[a-z0-9_]+)\.json$/.exec(source);
  if (f?.[1]) return `${f[1]}.portrait`;
  const m = /art\/units\/[a-z]+\/([a-z0-9_]+)\.json$/.exec(source);
  const slug = m?.[1];
  return slug !== undefined && !UNITS_WITHOUT_STILLS.has(slug) ? `art/portraits/${slug}` : null;
}

const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  let p = images.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(`portrait still "${url}" failed`));
      im.src = url;
    });
    p.catch(() => images.delete(url));
    images.set(url, p);
  }
  return p;
}

const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export interface StillPortraitOptions {
  /** URL of the still without extension (`<base>.png` and `<base>_team.png`). */
  url: string;
  age: AgeId | null;
  size: number;
  foil: Foil;
  teamColor: number;
  plate: boolean;
}

/** The fort slug of a still url (`.../forts/stone/palisade.portrait` → `palisade`), or null. */
function stillSlug(url: string): string | null {
  return /\/([a-z0-9_]+)\.portrait$/.exec(url)?.[1] ?? null;
}

export async function renderStillPortrait(o: StillPortraitOptions): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  let base: HTMLImageElement;
  let team: HTMLImageElement | null;
  try {
    base = await loadImage(`${o.url}.png`);
    team = await loadImage(`${o.url}_team.png`).catch(() => null);
  } catch {
    return null;
  }
  const { size } = o;
  const dress = PORTRAIT_DRESS[stillSlug(o.url) ?? ''] ?? null;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  if (o.plate) drawPortraitPlate(ctx, o.age, size);
  const inner = size * (o.foil === 'none' ? 0.92 : 0.8);
  const off = (size - inner) / 2;
  if (team) {
    // grey team layer x team colour (multiply), clipped back to the layer's own alpha
    const t = document.createElement('canvas');
    t.width = size;
    t.height = size;
    const tc = t.getContext('2d');
    if (tc) {
      tc.imageSmoothingQuality = 'high';
      tc.drawImage(team, off, off, inner, inner);
      tc.globalCompositeOperation = 'multiply';
      tc.fillStyle = css(dress ? dress.underlay : o.teamColor);
      tc.fillRect(0, 0, size, size);
      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(team, off, off, inner, inner);
      ctx.drawImage(t, 0, 0);
    }
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(base, off, off, inner, inner);
  // a fort whose team layer reads as a blob wears its team cloth on the card too (fortDress.ts)
  if (dress) drawCloth2d(ctx, off + dress.banner.x * inner, off + dress.banner.y * inner, dress.banner.w * inner, dress.banner.h * inner, o.teamColor);
  foilFrame(ctx, o.foil, size);
  return c.toDataURL('image/png');
}
