/**
 * The avatar renderer (AUDIT §6.4): stacks the parts of a look in the fixed layer order and writes one
 * SVG string. Every filled part gets the art sheet's cel shading from its own outline: a hard shadow
 * band on the lower edge, a highlight sliver near the top and a colour-matched outline (fill × 0.40),
 * never black. Ids carry a `§` placeholder that the component swaps for a unique prefix, so the string
 * is cached per look and still safe to show many times on one page.
 */
import type { AvatarSlot } from '@/contracts';
import { mix, ramp, shade, type Material, type Ramp } from './color';
import { movePath } from './path';
import { TINTS } from './palette';
import { LAYERS, type Layer, type PartArt, type PartLibrary, type Shape, type Tone } from './types';

export type AvatarMood = 'neutral' | 'cheer' | 'determined' | 'wry';
/** `chest` frames the neck and chest (creator tiles for necklaces, scarves and medals). */
export type AvatarCrop = 'head' | 'bust' | 'face' | 'chest';

export interface ResolvedLook {
  parts: Partial<Record<AvatarSlot, string>>;
  tints: { skin: number; hair: number; eyes: number; cloth: number };
}

export interface RenderOptions {
  crop: AvatarCrop;
  detail: 'low' | 'full';
  mood?: AvatarMood;
  /** Idle motion classes (blink, bob, sways); Reduce motion keeps only the blink (AUDIT §4). */
  motion: boolean;
  /** Only the background plate, or only the figure (two-face portraits compose them). */
  part?: 'all' | 'bg' | 'figure';
}

/** Slot order inside one layer. */
const SLOT_ORDER: AvatarSlot[] = ['background', 'top', 'face', 'facialHair', 'mouth', 'nose', 'eyes', 'brows', 'accessory', 'hair', 'headwear'];

/**
 * Moods override the eyes and mouth (and, for "determined", the brows), and never change the saved
 * look (AUDIT §6.4). Determined after a loss is a set jaw under brows angled down, not a grin.
 */
const MOODS: Record<Exclude<AvatarMood, 'neutral'>, { eyes: string; mouth: string; brows?: string }> = {
  cheer: { eyes: 'eyes_happy', mouth: 'mouth_laugh' },
  determined: { eyes: 'eyes_sharp', mouth: 'mouth_flat', brows: 'brows_determined' },
  wry: { eyes: 'eyes_tired', mouth: 'mouth_smirk' },
};

export const VIEWBOX: Record<AvatarCrop, string> = { bust: '0 0 120 120', head: '13 5 94 94', face: '27 30 66 66', chest: '25 56 70 70' };

const DEFAULT_MAT: Partial<Record<Tone, Material>> = { skin: 'skin', hair: 'hair', cloth: 'cloth', clothDark: 'cloth', clothLight: 'cloth' };

interface Ctx {
  look: ResolvedLook;
  low: boolean;
  defs: string[];
  n: number;
  faceClip: string | null;
  /** Id prefix after `§` (several markups in one SVG never share an id). */
  p?: string;
}

function toneHex(t: Tone, look: ResolvedLook): string {
  switch (t) {
    case 'skin':
      return TINTS.skin[look.tints.skin] ?? TINTS.skin[0];
    case 'skinDark':
      return shade(TINTS.skin[look.tints.skin] ?? TINTS.skin[0], 0.62, -8, 1.25);
    case 'hair':
      return TINTS.hair[look.tints.hair] ?? TINTS.hair[0];
    case 'eyes':
      return TINTS.eyes[look.tints.eyes] ?? TINTS.eyes[0];
    case 'eyesDark':
      return mix(TINTS.eyes[look.tints.eyes] ?? TINTS.eyes[0], '#1a1210', 0.62);
    case 'cloth':
      return TINTS.cloth[look.tints.cloth] ?? TINTS.cloth[0];
    case 'clothDark':
      return shade(TINTS.cloth[look.tints.cloth] ?? TINTS.cloth[0], 0.7);
    case 'clothLight':
      return mix(TINTS.cloth[look.tints.cloth] ?? TINTS.cloth[0], '#ffffff', 0.35);
    case 'mouth':
      return '#7a2a26';
    case 'ink':
      return '#3a2620';
    case 'white':
      return '#fbf8f2';
    default:
      return t;
  }
}

function rampOf(s: Shape, ctx: Ctx): Ramp {
  return ramp(toneHex(s.c, ctx.look), s.m ?? DEFAULT_MAT[s.c] ?? 'matte');
}

function lineColour(s: Shape, r: Ramp, ctx: Ctx): string {
  if (!s.lc || s.lc === 'line') return r.line;
  if (s.lc === 'inner') return r.inner;
  return toneHex(s.lc, ctx.look);
}

function gradFill(s: Shape, ctx: Ctx): string {
  const g = s.grad!;
  const id = `§${ctx.p ?? ''}g${ctx.n++}`;
  const stops = g.stops.map(([o, t, op]) => `<stop offset="${o}" stop-color="${toneHex(t, ctx.look)}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`).join('');
  if (g.kind === 'radial') {
    ctx.defs.push(`<radialGradient id="${id}" cx="${g.cx ?? 0.5}" cy="${g.cy ?? 0.4}" r="${g.r ?? 0.7}">${stops}</radialGradient>`);
  } else {
    const a = ((g.angle ?? 90) * Math.PI) / 180;
    const x = Math.cos(a) / 2;
    const y = Math.sin(a) / 2;
    ctx.defs.push(`<linearGradient id="${id}" x1="${0.5 - x}" y1="${0.5 - y}" x2="${0.5 + x}" y2="${0.5 + y}">${stops}</linearGradient>`);
  }
  return `url(#${id})`;
}

function shapeSvg(s: Shape, ctx: Ctx): string {
  if (ctx.low && s.lo) return '';
  const op = s.op !== undefined ? ` opacity="${s.op}"` : '';
  const cls = s.fx ? ` class="${s.fx}"` : '';
  const r = rampOf(s, ctx);
  if (s.st) {
    const col = s.lc === 'inner' ? r.inner : s.lc === 'line' ? r.line : s.lc ? toneHex(s.lc, ctx.look) : toneHex(s.c, ctx.look);
    return `<path d="${s.d}" fill="none" stroke="${col}" stroke-width="${s.ln ?? 2.4}" stroke-linecap="round" stroke-linejoin="round"${op}${cls}/>`;
  }
  const fill = s.grad ? gradFill(s, ctx) : r.fill;
  const ln = s.ln ?? 3.5;
  const stroke = ln > 0 ? ` stroke="${lineColour(s, r, ctx)}" stroke-width="${ctx.low ? ln * 1.15 : ln}" stroke-linejoin="round"` : '';
  let out = '';
  if (s.cast && ctx.faceClip) {
    const skin = ramp(toneHex('skin', ctx.look), 'skin');
    out += `<path d="${movePath(s.d, 0, s.cast)}" fill="${skin.shadow}" opacity=".75" clip-path="url(#${ctx.faceClip})"/>`;
  }
  const sh = s.sh ?? 0;
  const hl = s.hl ?? 0;
  // `data-part`, `data-hl`, `data-sh` and `data-outline` mark the cel structure for the tone test (PLAN 2g)
  if (sh === 0 && hl === 0) return `${out}<path d="${s.d}" fill="${fill}"${stroke}${op}${cls} data-part=""/>`;
  const id = `§${ctx.p ?? ''}c${ctx.n++}`;
  ctx.defs.push(`<clipPath id="${id}"><path d="${s.d}"/></clipPath>`);
  let inner = '';
  if (hl > 0) inner += `<path d="${s.d}${movePath(s.d, hl * 0.5, hl)}" fill-rule="evenodd" fill="${r.hl}" data-hl=""/>`;
  if (sh > 0) inner += `<path d="${s.d}${movePath(s.d, 0, -sh)}" fill-rule="evenodd" fill="${r.shadow}" data-sh=""/>`;
  out += `<g${op}${cls} data-part=""><path d="${s.d}" fill="${fill}"/><g clip-path="url(#${id})">${inner}</g>`;
  if (ln > 0) out += `<path d="${s.d}" fill="none"${stroke} data-outline=""/>`;
  return `${out}</g>`;
}

/** The part ids drawn for a look and mood, after the headwear rules. */
function partsFor(look: ResolvedLook, mood: AvatarMood | undefined): Partial<Record<AvatarSlot, string>> {
  const p = { ...look.parts };
  if (mood && mood !== 'neutral') {
    p.eyes = MOODS[mood].eyes;
    p.mouth = MOODS[mood].mouth;
    const brows = MOODS[mood].brows;
    if (brows && p.brows !== 'brows_uni' && p.brows !== 'brows_scarred') p.brows = brows;
  }
  return p;
}

const FALLBACK_CAPPED: Partial<Record<Layer, Shape[]>> = {
  hairFront: [
    {
      d: 'M30 42C29 47 29.5 53 32 58L36.5 56.5C35.5 51 36 46 38 42ZM90 42C91 47 90.5 53 88 58L83.5 56.5C84.5 51 84 46 82 42Z',
      c: 'hair',
      sh: 3,
      ln: 2.6,
    },
  ],
};

/** A look with the first tint of every slot, for free shapes that use no tint. */
const PLAIN_LOOK: ResolvedLook = { parts: {}, tints: { skin: 0, hair: 0, eyes: 0, cloth: 0 } };

/**
 * Free shapes (the Result's victory props, overlays and stage art) drawn with exactly the parts' own
 * shading: the cel shadow band, the highlight sliver and the colour-matched outline. Tones resolve
 * against `look`, so a hand takes the General's skin tone; ids carry the `§` placeholder like
 * {@link avatarSvg}.
 */
export function shapesSvg(shapes: readonly Shape[], viewBox: string, look: ResolvedLook = PLAIN_LOOK, detail: 'low' | 'full' = 'full'): string {
  const ctx: Ctx = { look, low: detail === 'low', defs: [], n: 0, faceClip: null };
  const body = shapes.map((s) => shapeSvg(s, ctx)).join('');
  return `<svg class="av-svg" viewBox="${viewBox}" width="100%" height="100%" aria-hidden="true" focusable="false"><defs>${ctx.defs.join('')}</defs>${body}</svg>`;
}

/**
 * Free shapes as SVG markup without the `<svg>` wrapper (the profile frames and banners compose groups
 * of them): the defs (clip paths, gradients) and the body. Ids carry `§` plus `prefix`, so groups built
 * with different prefixes can share one SVG; swap `§` for a unique string before use.
 */
export function shapesMarkup(shapes: readonly Shape[], prefix = '', look: ResolvedLook = PLAIN_LOOK, detail: 'low' | 'full' = 'full'): { defs: string; body: string } {
  const ctx: Ctx = { look, low: detail === 'low', defs: [], n: 0, faceClip: null, p: prefix };
  const body = shapes.map((s) => shapeSvg(s, ctx)).join('');
  return { defs: ctx.defs.join(''), body };
}

/** Writes the SVG for a look. Unknown part ids are skipped (a wearable whose art is still loading). */
export function avatarSvg(look: ResolvedLook, lib: PartLibrary, o: RenderOptions): string {
  const ctx: Ctx = { look, low: o.detail === 'low', defs: [], n: 0, faceClip: null };
  const ids = partsFor(look, o.mood);
  const art: Partial<Record<AvatarSlot, PartArt>> = {};
  for (const slot of SLOT_ORDER) {
    const id = ids[slot];
    const a = id ? lib[id] : undefined;
    if (a) art[slot] = a;
  }
  const hat = art.headwear;
  const skin = ramp(toneHex('skin', look), 'skin');
  const faceShape = art.face?.layers.face?.[0];
  if (faceShape) {
    ctx.faceClip = '§face';
    ctx.defs.push(`<clipPath id="§face"><path d="${faceShape.d}"/></clipPath>`);
  }
  const body: string[] = [];
  let bg = '';
  let aura = false;
  for (const slot of SLOT_ORDER) if (art[slot]?.aura) aura = true;
  for (const layer of LAYERS) {
    let chunk = '';
    if (layer === 'neck') {
      chunk += `<path d="M50 70V89C53 93.5 67 93.5 70 89V70Z" fill="${skin.shadow}" stroke="${skin.line}" stroke-width="3" stroke-linejoin="round"/>`;
      chunk += `<path d="M51.5 84C55 87 65 87 68.5 84" fill="none" stroke="${skin.fill}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
    }
    for (const slot of SLOT_ORDER) {
      const a = art[slot];
      if (!a) continue;
      let shapes = a.layers[layer];
      if (slot === 'hair' && hat?.capsHair && (layer === 'hairFront' || layer === 'hairBack')) {
        if (layer === 'hairFront') shapes = (a.capped ?? FALLBACK_CAPPED).hairFront;
        if (layer === 'hairBack' && hat.hidesHairBack) shapes = undefined;
      }
      if (slot === 'face' && layer === 'ears' && hat?.hidesEars) shapes = undefined;
      if (slot === 'brows' && hat?.hidesBrows) shapes = undefined;
      if (!shapes) continue;
      for (const s of shapes) chunk += shapeSvg(s, ctx);
    }
    if (!chunk) continue;
    if (layer === 'bg') {
      bg = chunk;
      if (aura) bg += `<circle cx="60" cy="62" r="50" fill="url(#§aura)" class="av-aura"/>`;
      continue;
    }
    body.push(layer === 'eyes' ? `<g class="av-eyes">${chunk}</g>` : chunk);
  }
  if (aura) {
    ctx.defs.push(
      `<radialGradient id="§aura" cx=".5" cy=".5" r=".5"><stop offset=".45" stop-color="#fff" stop-opacity=".8"/><stop offset=".75" stop-color="#fff6d8" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    );
  }
  const cls = `av-svg${o.motion ? ' av-svg--live' : ''}`;
  const part = o.part ?? 'all';
  const back = part === 'figure' ? '' : bg;
  const front = part === 'bg' ? '' : `<g class="av-bob">${body.join('')}</g>`;
  return `<svg class="${cls}" viewBox="${VIEWBOX[o.crop]}" width="100%" height="100%" aria-hidden="true" focusable="false"><defs>${ctx.defs.join('')}</defs>${back}${front}</svg>`;
}
