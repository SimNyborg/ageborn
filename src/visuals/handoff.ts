/**
 * Artist handoff sheets (DESIGN B5 Art gallery: "It exports the SVG part sources as handoff sheets
 * for artists or image generators").
 *
 * A sheet is one SVG document per visual:
 *  - the assembled rest pose, in the default team colour, with the ground line and anchors,
 *  - every part it uses, drawn alone at its pivot (a red cross), labelled with its id and bone,
 *  - the palette: every zone the visual uses with its hex colour (team zones marked).
 * Coordinates are lu (1 lu = `scale` px). A replacement drawing only has to keep the pivots and
 * the rough outline of each part; the rig, clips and timing stay as they are (B5 later tiers).
 */
import { drawPart, drawPuppet, partBounds, puppetBounds, type PartLookup } from './draw';
import { isTeamZone, resolveZone, TEAM_COLORS, toCss } from './palette';
import { slotId } from './pose';
import { fmt } from './svg';
import { SvgTarget } from './targets';
import type { PartDef, PuppetDef } from './types';

export interface SheetOptions {
  /** px per lu (default 3). */
  scale?: number;
  teamColor?: number;
  background?: string;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function text(x: number, y: number, s: string, size = 11, fill = '#2a2530', weight = 'normal'): string {
  return `<text x="${fmt(x)}" y="${fmt(y)}" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(s)}</text>`;
}

function cross(x: number, y: number): string {
  return `<path d="M${fmt(x - 5)} ${fmt(y)}H${fmt(x + 5)}M${fmt(x)} ${fmt(y - 5)}V${fmt(y + 5)}" stroke="#e0305a" stroke-width="1.2" fill="none"/>`;
}

/** The unique parts of a puppet in draw order, each with the bones it sits on. */
export function sheetParts(p: PuppetDef, parts: PartLookup): { part: PartDef; bones: string[]; slots: string[] }[] {
  const out = new Map<string, { part: PartDef; bones: string[]; slots: string[] }>();
  for (const s of [...p.slots].sort((a, b) => a.z - b.z)) {
    const part = parts(s.part);
    if (!part) continue;
    const e = out.get(part.id) ?? { part, bones: [], slots: [] };
    if (!e.bones.includes(s.bone)) e.bones.push(s.bone);
    e.slots.push(slotId(s));
    out.set(part.id, e);
  }
  return [...out.values()];
}

/** Every non-team zone the puppet's parts use, with its colour. */
export function sheetZones(p: PuppetDef, parts: PartLookup): { zone: string; color: number | null; team: boolean }[] {
  const zones = new Map<string, { zone: string; color: number | null; team: boolean }>();
  for (const { part } of sheetParts(p, parts)) {
    for (const l of part.layers) {
      if (zones.has(l.zone)) continue;
      zones.set(l.zone, { zone: l.zone, color: isTeamZone(l.zone) ? null : (resolveZone(p.palette, l.zone) ?? null), team: isTeamZone(l.zone) });
    }
  }
  return [...zones.values()].sort((a, b) => Number(b.team) - Number(a.team) || a.zone.localeCompare(b.zone));
}

/** Builds the handoff SVG for one visual. */
export function handoffSheet(p: PuppetDef, parts: PartLookup, o: SheetOptions = {}): string {
  const k = o.scale ?? 3;
  const team = o.teamColor ?? TEAM_COLORS.default[0];
  const pad = 24;
  const body: string[] = [];
  const defs: string[] = [];
  let y = pad;
  body.push(text(pad, y + 14, p.id, 18, '#2a2530', 'bold'));
  body.push(text(pad, y + 32, `rig ${p.rig} · height ${p.heightLu} lu · ${p.slots.length} slots · origin = feet (ground line), +x = facing, 1 lu = ${k} px`, 11, '#6a6272'));
  y += 48;

  // Assembled rest pose
  const pb = puppetBounds(p, parts);
  const w = (pb.maxX - pb.minX) * k;
  const h = (pb.maxY - pb.minY) * k;
  const ox = pad - pb.minX * k;
  const oy = y - pb.minY * k;
  const pose = new SvgTarget([k, 0, 0, k, ox, oy], 'pose');
  drawPuppet(p, pose, [1, 0, 0, 1, 0, 0], { parts, teamColor: team });
  defs.push(...pose.defs);
  body.push(`<path d="M${fmt(pad - 10)} ${fmt(oy)}H${fmt(pad + w + 10)}" stroke="#8a8292" stroke-dasharray="4 3" fill="none"/>`);
  body.push(...pose.body);
  for (const [name, a] of Object.entries(p.anchors)) {
    body.push(cross(ox + a.x * k, oy + a.y * k));
    body.push(text(ox + a.x * k + 6, oy + a.y * k - 4, name, 9, '#e0305a'));
  }
  let maxW = w + pad * 2;
  y += h + 36;

  // Palette legend
  body.push(text(pad, y, 'Zones', 13, '#2a2530', 'bold'));
  y += 10;
  let zx = pad;
  for (const z of sheetZones(p, parts)) {
    const fill = z.team ? toCss(team) : z.color === null ? '#ff00ff' : toCss(z.color);
    const label = z.team ? `${z.zone} (team tint)` : `${z.zone} ${z.color === null ? 'MISSING' : toCss(z.color)}`;
    const lw = 26 + label.length * 6.6;
    if (zx + lw > Math.max(maxW, 720)) {
      zx = pad;
      y += 22;
    }
    body.push(`<rect x="${fmt(zx)}" y="${fmt(y)}" width="16" height="16" rx="3" fill="${fill}" stroke="#2a2530" stroke-width="1"/>`);
    body.push(text(zx + 22, y + 12, label, 10));
    zx += lw + 12;
  }
  y += 40;

  // Parts, each at its pivot
  body.push(text(pad, y, 'Parts (pivot = red cross, pointing up = along the bone)', 13, '#2a2530', 'bold'));
  y += 16;
  let px = pad;
  let rowH = 0;
  const rowW = Math.max(maxW, 900);
  let index = 0;
  for (const { part, bones } of sheetParts(p, parts)) {
    const b = partBounds(part);
    const bw = Math.max(60, (b.maxX - b.minX) * k + 16);
    const bh = (b.maxY - b.minY) * k + 36;
    if (px + bw > rowW) {
      px = pad;
      y += rowH + 12;
      rowH = 0;
    }
    const cx = px + 8 - b.minX * k;
    const cy = y + 8 - b.minY * k;
    const t = new SvgTarget([k, 0, 0, k, cx, cy], `p${++index}_`);
    drawPart(part, t, [1, 0, 0, 1, 0, 0], { palette: p.palette, teamColor: team, group: 'all' });
    defs.push(...t.defs);
    body.push(`<rect x="${fmt(px)}" y="${fmt(y)}" width="${fmt(bw)}" height="${fmt(bh)}" rx="4" fill="#ffffff" fill-opacity="0.35" stroke="#c8c0b0"/>`);
    body.push(...t.body);
    body.push(cross(cx, cy));
    body.push(text(px + 4, y + bh - 16, part.id, 9));
    body.push(text(px + 4, y + bh - 5, `on ${bones.join(', ')}`, 8, '#6a6272'));
    px += bw + 12;
    rowH = Math.max(rowH, bh);
    maxW = Math.max(maxW, px);
  }
  y += rowH + pad;
  const width = Math.max(maxW, rowW) + pad;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(y)}" viewBox="0 0 ${fmt(width)} ${fmt(y)}">` +
    `<rect width="100%" height="100%" fill="${o.background ?? '#efe9dc'}"/><defs>${defs.join('')}</defs>${body.join('')}</svg>`
  );
}
