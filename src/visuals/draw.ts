/**
 * Backend-agnostic drawing of parts and puppets (DESIGN A11 style rules in one place).
 *
 * A part is painted layer by layer: fill with the two-tone cel shade, an optional stripe pattern,
 * one highlight, then the outline (fill darkened 45%). The same routine drives the canvas bake,
 * portraits, the handoff SVG sheets and the Node rasteriser, so every consumer agrees pixel for
 * pixel on shapes and colours.
 *
 * Layer groups split a part for the team tint (DESIGN B5 Team colour contract): `under` (non-team
 * layers below the team layers), `team` (team layers baked in grey, tinted at runtime), `over`
 * (layers above plus the team layers' highlights) and `white` (the silhouette used for hit flashes).
 */
import { darken, isTeamZone, resolveZone, TEAM_ZONE_GREY, type Palette } from './palette';
import { boneWorld, DEFAULT_STATE, slotLocal, slotsInOrder, slotVisible, type DeltaLookup, type PuppetState } from './pose';
import { STYLE } from './style';
import { ellipse, matMul, move, pathBounds, rect, type Bounds, type Mat } from './svg';
import type { LayerDef, PartDef, PuppetDef } from './types';

export interface PaintTag {
  team: boolean;
}

/** A drawing backend: canvas 2D, the rasteriser, or an SVG writer. */
export interface DrawTarget {
  fill(d: string, m: Mat, color: number, alpha: number, clip: { d: string; m: Mat } | null, tag: PaintTag): void;
  stroke(d: string, m: Mat, width: number, color: number, alpha: number, tag: PaintTag): void;
}

export type LayerGroup = 'all' | 'under' | 'team' | 'over' | 'white';

export interface PaintOptions {
  palette: Palette;
  /** Real team colour, or null to paint team layers in grey for a runtime tint. */
  teamColor: number | null;
  group: LayerGroup;
  /** Darken everything by this share (far limbs). */
  tone?: number;
  /** Stripe banner-type team layers (high-contrast opponent). */
  stripes?: boolean;
  /** Missing zones paint in this colour (magenta, so gaps are obvious). */
  missing?: number;
}

const MISSING = 0xff00ff;
const TEAM2_DARKEN = 1 - (TEAM_ZONE_GREY['team2'] ?? 0xc4c4c4) / 0xffffff;

export interface PartSplit {
  under: LayerDef[];
  team: LayerDef[];
  over: LayerDef[];
}

/** Splits a part's layers around its (contiguous) team layers. */
export function splitLayers(part: PartDef): PartSplit {
  const first = part.layers.findIndex((l) => isTeamZone(l.zone));
  if (first < 0) return { under: [...part.layers], team: [], over: [] };
  let last = first;
  for (let i = first; i < part.layers.length; i++) if (isTeamZone(part.layers[i]?.zone ?? '')) last = i;
  return {
    under: part.layers.slice(0, first),
    team: part.layers.slice(first, last + 1),
    over: part.layers.slice(last + 1),
  };
}

/** True when the part's team layers are contiguous (a requirement of the three-sprite split). */
export function teamLayersContiguous(part: PartDef): boolean {
  const s = splitLayers(part);
  return s.team.every((l) => isTeamZone(l.zone));
}

export function layerColor(l: LayerDef, o: PaintOptions): number {
  let c: number;
  if (isTeamZone(l.zone)) {
    if (o.teamColor === null) c = TEAM_ZONE_GREY[l.zone] ?? 0xffffff;
    else c = l.zone === 'team2' ? darken(o.teamColor, TEAM2_DARKEN) : o.teamColor;
  } else {
    c = resolveZone(o.palette, l.zone) ?? o.missing ?? MISSING;
  }
  return o.tone ? darken(c, o.tone) : c;
}

function shortSide(b: Bounds): number {
  return Math.min(b.maxX - b.minX, b.maxY - b.minY);
}

/** The automatic highlight: a soft ellipse in the upper-left of the shape (clipped to it). */
export function autoHighlight(b: Bounds): string {
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  return ellipse(b.minX + w * 0.34, b.minY + h * 0.27, Math.max(1, w * 0.2), Math.max(0.8, h * 0.11));
}

/** Diagonal stripes covering a bounds (clipped to the layer when painted). */
export function stripesPath(b: Bounds, spacing = 7, width = 3): string {
  const out: string[] = [];
  const h = b.maxY - b.minY;
  for (let x = b.minX - h; x < b.maxX; x += spacing) {
    out.push(`M${x} ${b.maxY}L${x + width} ${b.maxY}L${x + width + h} ${b.minY}L${x + h} ${b.minY}Z`);
  }
  return out.join('');
}

function paintLayer(l: LayerDef, t: DrawTarget, m: Mat, o: PaintOptions, withHighlight: boolean, onlyHighlight: boolean): void {
  const team = isTeamZone(l.zone);
  const tag: PaintTag = { team };
  const alpha = l.alpha ?? 1;
  const b = pathBounds(l.d);
  const short = shortSide(b);
  const lineW = l.line ?? STYLE.outlineLu;
  if (o.group === 'white') {
    t.fill(l.d, m, 0xffffff, 1, null, tag);
    if (lineW > 0) t.stroke(l.d, m, lineW, 0xffffff, 1, tag);
    return;
  }
  const c = layerColor(l, o);
  if (!onlyHighlight) {
    const shade = l.shade ?? 'auto';
    if (shade === 'auto' && short >= STYLE.autoShadeMinLu) {
      const off = Math.max(STYLE.shadeOffsetMinLu, Math.min(STYLE.shadeOffsetMaxLu, short * STYLE.shadeOffsetFrac));
      t.fill(l.d, m, darken(c, STYLE.shadePct), alpha, null, tag);
      t.fill(move(l.d, -off * 0.55, -off), m, c, alpha, { d: l.d, m }, tag);
    } else {
      t.fill(l.d, m, c, alpha, null, tag);
      if (typeof shade === 'string' && shade !== 'auto') t.fill(shade, m, darken(c, STYLE.shadePct), alpha, { d: l.d, m }, tag);
    }
    if (team && l.banner && o.stripes) t.fill(stripesPath(b), m, darken(c, 0.34), alpha, { d: l.d, m }, tag);
  }
  if (withHighlight) {
    const light = l.light ?? 'auto';
    const hd = light === 'auto' ? (short >= STYLE.autoShadeMinLu ? autoHighlight(b) : null) : light === false ? null : light;
    if (hd !== null) t.fill(hd, m, 0xffffff, STYLE.highlightAlpha * alpha, { d: l.d, m }, { team: false });
  }
  if (!onlyHighlight && lineW > 0) t.stroke(l.d, m, lineW, darken(c, STYLE.outlinePct), alpha, tag);
}

/** Paints one part (or one group of it) at matrix `m`. */
export function drawPart(part: PartDef, t: DrawTarget, m: Mat, o: PaintOptions): void {
  const split = splitLayers(part);
  switch (o.group) {
    case 'all':
    case 'white':
      for (const l of part.layers) paintLayer(l, t, m, o, true, false);
      return;
    case 'under':
      for (const l of split.team.length ? split.under : part.layers) paintLayer(l, t, m, o, true, false);
      return;
    case 'team':
      for (const l of split.team) paintLayer(l, t, m, o, false, false);
      return;
    case 'over':
      for (const l of split.team) paintLayer(l, t, m, o, true, true);
      for (const l of split.over) paintLayer(l, t, m, o, true, false);
      return;
  }
}

const partBoundsCache = new WeakMap<PartDef, Bounds>();

/** Part bounds in part-local lu, including outlines. */
export function partBounds(part: PartDef): Bounds {
  const hit = partBoundsCache.get(part);
  if (hit) return hit;
  let b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const l of part.layers) {
    const lb = pathBounds(l.d);
    const pad = (l.line ?? STYLE.outlineLu) / 2;
    b = {
      minX: Math.min(b.minX, lb.minX - pad),
      minY: Math.min(b.minY, lb.minY - pad),
      maxX: Math.max(b.maxX, lb.maxX + pad),
      maxY: Math.max(b.maxY, lb.maxY + pad),
    };
  }
  if (b.minX === Infinity) b = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  partBoundsCache.set(part, b);
  return b;
}

export type PartLookup = (id: string) => PartDef | undefined;

export interface PuppetPaintOptions {
  parts: PartLookup;
  teamColor: number | null;
  stripes?: boolean;
  group?: LayerGroup;
  deltas?: DeltaLookup;
  state?: PuppetState;
  /** Skip slots (e.g. weapons for the body-width check). */
  filter?: (slotTag: string | undefined) => boolean;
}

/** Paints a whole puppet at matrix `m` (puppet space: origin at the feet). */
export function drawPuppet(p: PuppetDef, t: DrawTarget, m: Mat, o: PuppetPaintOptions): void {
  const world = boneWorld(p.bones, o.deltas);
  const st = o.state ?? DEFAULT_STATE;
  for (const s of slotsInOrder(p)) {
    if (!slotVisible(s.when, st)) continue;
    if (o.filter && !o.filter(s.tag)) continue;
    const part = o.parts(s.part);
    const bone = world.get(s.bone);
    if (!part || !bone) continue;
    drawPart(part, t, matMul(m, matMul(bone, slotLocal(s))), {
      palette: p.palette,
      teamColor: o.teamColor,
      group: o.group ?? 'all',
      stripes: o.stripes,
      tone: s.tone === 'back' ? STYLE.backTonePct : undefined,
    });
  }
}

/** Bounds of a posed puppet (rest pose unless deltas are given), including outlines. */
export function puppetBounds(p: PuppetDef, parts: PartLookup, deltas?: DeltaLookup, filter?: (tag: string | undefined) => boolean, state: PuppetState = DEFAULT_STATE): Bounds {
  const world = boneWorld(p.bones, deltas);
  let b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const s of p.slots) {
    if (!slotVisible(s.when, state)) continue;
    if (filter && !filter(s.tag)) continue;
    const part = parts(s.part);
    const bone = world.get(s.bone);
    if (!part || !bone) continue;
    const pb = partBounds(part);
    const m = matMul(bone, slotLocal(s));
    for (const [x, y] of [
      [pb.minX, pb.minY],
      [pb.maxX, pb.minY],
      [pb.minX, pb.maxY],
      [pb.maxX, pb.maxY],
    ] as const) {
      const px = m[0] * x + m[2] * y + m[4];
      const py = m[1] * x + m[3] * y + m[5];
      b = { minX: Math.min(b.minX, px), minY: Math.min(b.minY, py), maxX: Math.max(b.maxX, px), maxY: Math.max(b.maxY, py) };
    }
  }
  if (b.minX === Infinity) b = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return b;
}

/** A full-bounds rectangle path (handy for backgrounds in sheets). */
export function boundsRect(b: Bounds): string {
  return rect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
}
