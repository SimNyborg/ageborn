/**
 * Portraits for the DOM UI (DESIGN B5): a puppet's rest pose rendered straight from its SVG path data
 * onto an offscreen canvas (crisp at any size), on an age-tinted plate, with an optional foil frame
 * (bronze, silver, holo; A5.8). Returns a PNG data URL; the provider caches by (card, skin, size).
 */
import type { Foil } from '@/contracts/ids';
import { drawPart, drawPuppet, puppetBounds } from './draw';
import { ICON_ZONES } from './parts/icons';
import { getPart } from './parts/registry';
import { AGE_PALETTES, BACKDROP_PALETTES, darken, lighten, mix, toCss } from './palette';
import { CanvasTarget } from './targets';
import type { PuppetDef } from './types';

export interface PortraitOptions {
  puppet: PuppetDef;
  size: number;
  foil: Foil;
  teamColor: number;
  /** Crop to the upper body for tall visuals (cards), or fit the whole visual (icons). */
  fit?: 'full' | 'bust';
}

type Ctx = CanvasRenderingContext2D;

function plate(ctx: Ctx, p: PuppetDef, size: number): void {
  const pal = p.age ? BACKDROP_PALETTES[p.age] : BACKDROP_PALETTES.medieval;
  const g = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
  g.addColorStop(0, toCss(lighten(pal.skyBottom, 0.2)));
  g.addColorStop(0.6, toCss(mix(pal.skyTop, pal.mid, 0.35)));
  g.addColorStop(1, toCss(darken(pal.mid, 0.25)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // ground ellipse
  ctx.fillStyle = toCss(darken(pal.near, 0.1), 0.55);
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.9, size * 0.42, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.age) {
    const accent = AGE_PALETTES[p.age].accent;
    ctx.strokeStyle = toCss(accent, 0.25);
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.46, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function foilFrame(ctx: Ctx, foil: Foil, size: number): void {
  if (foil === 'none') return;
  const part = getPart(`foil.${foil}`);
  if (!part) return;
  const k = size / 100;
  const t = new CanvasTarget(ctx, [k, 0, 0, k, 0, 0]);
  drawPart(part, t, [1, 0, 0, 1, 0, 0], { palette: ICON_ZONES, teamColor: null, group: 'all' });
  // sheen: a diagonal light band over the frame bars (holo gets a rainbow)
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.beginPath();
  ctx.rect(0, 0, 100, 9);
  ctx.rect(0, 91, 100, 9);
  ctx.rect(0, 0, 9, 100);
  ctx.rect(91, 0, 9, 100);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 100, 100);
  if (foil === 'holo') {
    const hues = [300, 220, 160, 60, 20, 300];
    hues.forEach((h, i) => g.addColorStop(i / (hues.length - 1), `hsla(${h}, 80%, 72%, 0.55)`));
  } else {
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.42, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.58, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 100, 100);
  ctx.restore();
}

/** Draws a portrait into a canvas context of `size` x `size` px. */
export function drawPortrait(ctx: Ctx, o: PortraitOptions): void {
  const { puppet: p, size } = o;
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  const isIcon = p.kind === 'sprite';
  if (!isIcon) plate(ctx, p, size);
  const b = puppetBounds(p, getPart);
  const inner = size * (o.foil === 'none' ? 0.9 : 0.8);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const bust = (o.fit ?? 'full') === 'bust' && h > w * 1.3;
  const visH = bust ? h * 0.72 : h;
  const k = Math.min(inner / w, inner / visH);
  const cx = (b.minX + b.maxX) / 2;
  const top = b.minY;
  const ox = size / 2 - cx * k;
  const oy = isIcon ? size / 2 - ((b.minY + b.maxY) / 2) * k : (size - inner) / 2 + (inner - visH * k) - top * k + (bust ? 0 : -size * 0.02);
  drawPuppet(p, new CanvasTarget(ctx, [k, 0, 0, k, ox, oy]), [1, 0, 0, 1, 0, 0], { parts: getPart, teamColor: o.teamColor });
  ctx.restore();
  foilFrame(ctx, o.foil, size);
}

export function renderPortrait(o: PortraitOptions): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = o.size;
  c.height = o.size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  drawPortrait(ctx, o);
  return c.toDataURL('image/png');
}
