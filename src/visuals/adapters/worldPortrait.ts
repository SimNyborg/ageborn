/**
 * Card and menu portraits for the 3D world art (UI art audit #1 and #2): bases and turrets are drawn
 * from their Blender sheets (`art/bases/<age>.json`, `art/turrets/<age>/<slug>.json`) instead of the
 * old procedural puppets, so Home's diorama, Customize, the Army and Album cards, the Trophy Road and
 * the capsule show all show the same stone, wood and metal as the lane.
 *
 * A portrait composites the sheet's resting frames in the sheet's shared source space (every frame of
 * a world sheet has the same `sourceSize` and anchor), each one over its grey `_team` twin tinted in
 * the side's colour (the lane's "tint-underlay" rule):
 * - bases: the back flag, the body at crumble stage 0, then the front flag;
 * - turrets: the mount, then the head at rest (`idle_00`).
 *
 * The union of the drawn frames is fitted into the square, standing on its bottom edge (bases, no
 * plate) or centred on the age plate with the foil frame (turret cards). Pure canvas 2D: the sheet
 * JSON is fetched and its PNG decoded as an image, so the menus never need Pixi. `null` when the sheet
 * cannot be read (the caller then draws the procedural portrait).
 */
import type { AgeId, Foil } from '@/contracts/ids';
import { drawPortraitPlate, foilFrame } from '../portraits';

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SheetFrame {
  frame: FrameRect;
  rotated?: boolean;
  spriteSourceSize: FrameRect;
  sourceSize: { w: number; h: number };
}

interface SheetJson {
  frames: Record<string, SheetFrame>;
  animations: Record<string, string[]>;
  meta: { image: string; ageborn?: { kind?: 'turret' | 'base'; flags?: { clip: string; z: 'front' | 'back' }[] } };
}

interface LoadedSheet {
  json: SheetJson;
  image: HTMLImageElement;
}

const sheets = new Map<string, Promise<LoadedSheet | null>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`world sheet image "${url}" failed`));
    im.src = url;
  });
}

/** Loads a world sheet's JSON and PNG once (a failure is retried on the next request). */
export function loadWorldSheet(url: string): Promise<LoadedSheet | null> {
  let p = sheets.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = (await res.json()) as SheetJson;
        const image = await loadImage(new URL(json.meta.image, new URL(url, location.href)).href);
        return { json, image };
      } catch {
        return null;
      }
    })();
    void p.then((s) => {
      if (!s) sheets.delete(url);
    });
    sheets.set(url, p);
  }
  return p;
}

/** The frame names a portrait draws, back to front (each followed by its `_team` twin when present). */
export function worldPortraitFrames(json: Pick<SheetJson, 'animations' | 'meta'>): string[] {
  const first = (clip: string): string | null => json.animations[clip]?.[0] ?? null;
  const out: string[] = [];
  const push = (f: string | null): void => {
    if (f) out.push(f);
  };
  if (json.meta.ageborn?.kind === 'turret' || json.animations['mount']) {
    push(first('mount'));
    push(first('idle'));
    return out;
  }
  const flags = json.meta.ageborn?.flags ?? [];
  for (const f of flags) if (f.z === 'back') push(first(f.clip));
  push(first('body'));
  for (const f of flags) if (f.z !== 'back') push(first(f.clip));
  return out;
}

const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export interface WorldPortraitOptions {
  /** Absolute or base-relative URL of the sheet JSON. */
  url: string;
  age: AgeId | null;
  size: number;
  foil: Foil;
  teamColor: number;
  plate: boolean;
}

export async function renderWorldPortrait(o: WorldPortraitOptions): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const sheet = await loadWorldSheet(o.url);
  if (!sheet) return null;
  const names = worldPortraitFrames(sheet.json);
  const frames = names.map((n) => ({ base: sheet.json.frames[n], team: sheet.json.frames[`${n}_team`] })).filter((f): f is { base: SheetFrame; team: SheetFrame | undefined } => f.base !== undefined);
  if (frames.length === 0) return null;
  // union of the drawn frames in the shared source space
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const f of frames) {
    const s = f.base.spriteSourceSize;
    x0 = Math.min(x0, s.x);
    y0 = Math.min(y0, s.y);
    x1 = Math.max(x1, s.x + s.w);
    y1 = Math.max(y1, s.y + s.h);
  }
  const { size } = o;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  if (o.plate) drawPortraitPlate(ctx, o.age, size);
  const inner = size * (o.plate ? (o.foil === 'none' ? 0.8 : 0.7) : 0.96);
  const k = Math.min(inner / (x1 - x0), inner / (y1 - y0));
  const ox = size / 2 - ((x0 + x1) / 2) * k;
  // bases stand on the bottom edge; turret cards sit a touch low on their plate
  const oy = o.plate ? size / 2 - ((y0 + y1) / 2) * k + size * 0.04 : size - size * 0.02 - y1 * k;
  const blit = (target: CanvasRenderingContext2D, f: SheetFrame): void => {
    const r = f.frame;
    const s = f.spriteSourceSize;
    if (f.rotated) {
      // rotated frames are stored 90° clockwise in the atlas
      target.save();
      target.translate(ox + s.x * k, oy + (s.y + s.h) * k);
      target.rotate(-Math.PI / 2);
      target.drawImage(sheet.image, r.x, r.y, r.h, r.w, 0, 0, s.h * k, s.w * k);
      target.restore();
      return;
    }
    target.drawImage(sheet.image, r.x, r.y, r.w, r.h, ox + s.x * k, oy + s.y * k, s.w * k, s.h * k);
  };
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const tint = document.createElement('canvas');
  tint.width = size;
  tint.height = size;
  const tc = tint.getContext('2d');
  for (const f of frames) {
    if (f.team && tc) {
      // grey team layer x team colour (multiply), clipped back to the layer's own alpha
      tc.globalCompositeOperation = 'source-over';
      tc.clearRect(0, 0, size, size);
      tc.imageSmoothingQuality = 'high';
      blit(tc, f.team);
      tc.globalCompositeOperation = 'multiply';
      tc.fillStyle = css(o.teamColor);
      tc.fillRect(0, 0, size, size);
      tc.globalCompositeOperation = 'destination-in';
      blit(tc, f.team);
      ctx.drawImage(tint, 0, 0);
    }
    blit(ctx, f.base);
  }
  if (o.plate) foilFrame(ctx, o.foil, size);
  return c.toDataURL('image/png');
}
