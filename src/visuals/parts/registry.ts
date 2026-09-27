/**
 * The part registry: every procedural part, keyed by id (`<age>.<name>` or `shared.<name>`).
 *
 * Size variants: parts are authored at infantry scale; `sized(id, k)` returns the id of a copy with
 * every path scaled by k but the outline width unchanged, so a 120 lu heavy keeps the same 3.7 lu
 * outline as a 68 lu footman (DESIGN A11). Variants are created lazily on first lookup.
 */
import { scale } from '../svg';
import type { LayerDef, PartDef } from '../types';

const PARTS = new Map<string, PartDef>();

/** Registers a part and returns its id. Ids are unique. */
export function part(id: string, layers: LayerDef[]): string {
  if (PARTS.has(id)) throw new Error(`Duplicate part id "${id}"`);
  if (layers.length === 0) throw new Error(`Part "${id}" has no layers`);
  PARTS.set(id, { id, layers });
  return id;
}

function scaleOpt(v: LayerDef['shade'], k: number): LayerDef['shade'] {
  return typeof v === 'string' && v !== 'auto' ? scale(v, k) : v;
}

export function getPart(id: string): PartDef | undefined {
  const hit = PARTS.get(id);
  if (hit) return hit;
  const m = /^(.*)\*([0-9.]+)$/.exec(id);
  if (!m || m[1] === undefined || m[2] === undefined) return undefined;
  const base = getPart(m[1]);
  if (!base) return undefined;
  const k = Number(m[2]);
  const p: PartDef = {
    id,
    layers: base.layers.map((l) => ({ ...l, d: scale(l.d, k), shade: scaleOpt(l.shade, k), light: scaleOpt(l.light, k) })),
  };
  PARTS.set(id, p);
  return p;
}

/** Id of `id` scaled by k (k rounded to 3 decimals; k = 1 returns `id`). */
export function sized(id: string, k: number): string {
  const r = Math.round(k * 1000) / 1000;
  return r === 1 ? id : `${id}*${r}`;
}

/** All registered parts (authored parts and the size variants created so far). */
export function allParts(): PartDef[] {
  return [...PARTS.values()];
}

/** Authored parts only (no size variants). */
export function authoredParts(): PartDef[] {
  return [...PARTS.values()].filter((p) => !p.id.includes('*'));
}
