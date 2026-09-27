/**
 * Age Power targeting and zone display (DESIGN A2.9 Casting, B6 HUD "power drag targeting").
 *
 * - Tap = auto-aim (the sim's `densest` scan); drag = place. The HUD reports the pointer, the view
 *   converts it to own-side progress p, clamped to the power zone band p ∈ [150, 1,050].
 * - While dragging, a canvas overlay shows the zone in your team colour.
 * - Every cast shows a 1.0 s telegraph to both sides: a pulsing zone outline in the caster's team
 *   colour (drawn here; the art adds its `fx.telegraph_zone` decoration).
 */
import type { PowerDef } from '@/contracts';
import { Graphics } from 'pixi.js';
import { tint } from './teamColors';

/** Pointer travel (CSS px) that turns a press on the power button into a drag. */
export const DRAG_THRESHOLD_PX = 12;

/**
 * Width in lu of the area a power covers when aimed, or null when the power ignores the aim
 * (Stampede starts at your front, Royal Decree and Nanite Surge affect all your units, Paratroopers
 * land beyond the enemy front; decisions WP2 "abilities and powers").
 */
export function powerZoneLu(def: PowerDef | undefined): number | null {
  if (!def) return null;
  const e = def.effect;
  switch (e.kind) {
    case 'barrage':
    case 'sweep':
      return e.zone;
    case 'cloud':
      return e.width;
    default:
      return null;
  }
}

/** Clamps own-side progress p (lu) to the power zone band. */
export function clampPowerP(p: number, band: readonly [number, number]): number {
  return Math.round(Math.min(band[1], Math.max(band[0], p)));
}

interface Zone {
  /** Centre world x (lu). */
  x: number;
  width: number;
  color: number;
  leftMs: number;
  totalMs: number;
  preview: boolean;
}

/** Draws active telegraphs and the drag preview on the ground (one Graphics). */
export class ZoneOverlay {
  readonly root = new Graphics();
  private zones: Zone[] = [];
  private preview: Zone | null = null;
  private t = 0;

  constructor() {
    this.root.label = 'zones';
    this.root.eventMode = 'none';
  }

  telegraph(x: number, width: number, color: number, ms: number): void {
    this.zones.push({ x, width, color, leftMs: ms, totalMs: ms, preview: false });
  }

  showPreview(x: number, width: number, color: number): void {
    this.preview = { x, width, color, leftMs: 1, totalMs: 1, preview: true };
  }

  hidePreview(): void {
    this.preview = null;
  }

  get previewing(): boolean {
    return this.preview !== null;
  }

  get activeCount(): number {
    return this.zones.length;
  }

  /** `dtMs` is game time; `scale` px per lu. */
  update(dtMs: number, scale: number): void {
    this.t += dtMs;
    for (const z of this.zones) z.leftMs -= dtMs;
    this.zones = this.zones.filter((z) => z.leftMs > 0);
    const g = this.root;
    g.clear();
    const px = 1 / Math.max(0.0001, scale);
    for (const z of this.zones) this.drawZone(g, z, px);
    if (this.preview) this.drawZone(g, this.preview, px);
  }

  clear(): void {
    this.zones = [];
    this.preview = null;
    this.root.clear();
  }

  private drawZone(g: Graphics, z: Zone, px: number): void {
    const half = z.width / 2;
    const depth = 26;
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 90);
    const fade = z.preview ? 1 : Math.min(1, z.leftMs / 180) * Math.min(1, (z.totalMs - z.leftMs + 60) / 120);
    const fillA = (z.preview ? 0.22 : 0.12 + 0.1 * pulse) * fade;
    const lineA = (z.preview ? 0.95 : 0.55 + 0.4 * pulse) * fade;
    const light = tint(z.color, 0.35);
    g.ellipse(z.x, 0, half, depth).fill({ color: z.color, alpha: fillA });
    g.ellipse(z.x, 0, half, depth).stroke({ color: light, width: 3 * px, alpha: lineA });
    g.ellipse(z.x, 0, half * 0.62, depth * 0.62).stroke({ color: light, width: 1.5 * px, alpha: lineA * 0.6 });
    // Centre marker and edge posts.
    g.moveTo(z.x, -8).lineTo(z.x, 8).stroke({ color: 0xffffff, width: 2 * px, alpha: lineA * 0.8 });
    for (const sx of [-1, 1]) {
      g.moveTo(z.x + sx * half, 0).lineTo(z.x + sx * half, -34).stroke({ color: light, width: 3 * px, alpha: lineA * 0.8 });
    }
    if (z.preview) {
      // Arrow above the centre so the drop point reads at a glance.
      g.poly([z.x - 12, -58, z.x + 12, -58, z.x, -40]).fill({ color: 0xffffff, alpha: 0.95 });
      g.poly([z.x - 12, -58, z.x + 12, -58, z.x, -40]).stroke({ color: z.color, width: 2 * px, alpha: 1 });
    }
  }
}
