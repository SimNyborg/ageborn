/**
 * Age Power targeting and zone display (DESIGN A2.9 Casting, B6 HUD "power drag targeting").
 *
 * - Tap = auto-aim (the sim's `densest` scan); drag = place. The HUD reports the pointer, the view
 *   converts it to own-side progress p, clamped to the power zone band p ∈ [150, 1,050].
 * - While dragging (or aiming after a tap), a large ghost of the power's area follows the pointer at
 *   world scale: team colour when a drop there fires, red when it would cancel (over the HUD). The
 *   enemy units it would hit get a gold ring and a chevron.
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

/** How the drag ghost decorates its area: falling strikes, a sweeping line or a drifting cloud. */
export type GhostStyle = 'barrage' | 'sweep' | 'cloud' | 'plain';

export function ghostStyle(def: PowerDef | undefined): GhostStyle {
  const k = def?.effect.kind;
  // A stampede reads as a charge sweeping across its run.
  if (k === 'stampede') return 'sweep';
  return k === 'barrage' || k === 'sweep' || k === 'cloud' ? k : 'plain';
}

/** A unit the dragged power would hit: world x, depth y and its size (lu). */
export interface GhostTarget {
  x: number;
  y: number;
  size: number;
}

/** Whether a unit at `x` (size `size`) is inside a zone of `width` centred on `cx` (lu). */
export function inZone(x: number, size: number, cx: number, width: number): boolean {
  return Math.abs(x - cx) <= width / 2 + size * 0.25;
}

interface Ghost {
  x: number;
  width: number;
  color: number;
  valid: boolean;
  style: GhostStyle;
  /** +1 when the caster's units walk toward +x. */
  dir: 1 | -1;
  /** Real ms since the ghost appeared (the pop-in) and since it last changed validity. */
  ageMs: number;
  flipMs: number;
}

/** The colour an invalid drop shows (a drop there cancels). */
export const GHOST_INVALID = 0xe0525a;
/** The ring under units the power would hit. */
export const GHOST_TARGET = 0xffd447;
/** Height of the ghost's light curtain (lu): tall enough to read at a glance on a phone. */
const CURTAIN_LU = 170;

/** Draws active telegraphs and the drag ghost on the ground (one Graphics). */
export class ZoneOverlay {
  readonly root = new Graphics();
  private zones: Zone[] = [];
  private ghost: Ghost | null = null;
  private targets: GhostTarget[] = [];
  private t = 0;
  private rt = 0;

  constructor() {
    this.root.label = 'zones';
    this.root.eventMode = 'none';
  }

  telegraph(x: number, width: number, color: number, ms: number): void {
    this.zones.push({ x, width, color, leftMs: ms, totalMs: ms, preview: false });
  }

  /**
   * Shows the drag ghost of the power's area centred on world x. `valid` false tints it as a cancel
   * (the pointer is over the HUD). The ghost pops in when it first appears.
   */
  showPreview(x: number, width: number, color: number, o: { valid?: boolean; style?: GhostStyle; dir?: 1 | -1 } = {}): void {
    const valid = o.valid !== false;
    const g = this.ghost;
    this.ghost = {
      x,
      width,
      color,
      valid,
      style: o.style ?? g?.style ?? 'plain',
      dir: o.dir ?? g?.dir ?? 1,
      ageMs: g?.ageMs ?? 0,
      flipMs: g && g.valid !== valid ? 0 : (g?.flipMs ?? 1000),
    };
  }

  hidePreview(): void {
    this.ghost = null;
    this.targets = [];
  }

  /** Units the ghost would hit (highlighted with a ring and a chevron); only drawn while valid. */
  setTargets(t: readonly GhostTarget[]): void {
    this.targets = t.slice();
  }

  get previewing(): boolean {
    return this.ghost !== null;
  }

  /** The ghost's centre x (lu), validity and highlighted unit count, for tests and the dev hooks. */
  get preview(): { x: number; width: number; valid: boolean; targets: number } | null {
    const g = this.ghost;
    return g ? { x: g.x, width: g.width, valid: g.valid, targets: g.valid ? this.targets.length : 0 } : null;
  }

  get activeCount(): number {
    return this.zones.length;
  }

  /** `dtMs` is game time; `scale` px per lu; `realMs` wall time (the ghost animates while paused). */
  update(dtMs: number, scale: number, realMs: number = dtMs): void {
    this.t += dtMs;
    this.rt += realMs;
    for (const z of this.zones) z.leftMs -= dtMs;
    this.zones = this.zones.filter((z) => z.leftMs > 0);
    if (this.ghost) {
      this.ghost.ageMs += realMs;
      this.ghost.flipMs += realMs;
    }
    const g = this.root;
    g.clear();
    const px = 1 / Math.max(0.0001, scale);
    for (const z of this.zones) this.drawZone(g, z, px);
    if (this.ghost) this.drawGhost(g, this.ghost, px);
  }

  clear(): void {
    this.zones = [];
    this.ghost = null;
    this.targets = [];
    this.root.clear();
  }

  private drawZone(g: Graphics, z: Zone, px: number): void {
    const half = z.width / 2;
    const depth = 26;
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 90);
    const fade = Math.min(1, z.leftMs / 180) * Math.min(1, (z.totalMs - z.leftMs + 60) / 120);
    const fillA = (0.12 + 0.1 * pulse) * fade;
    const lineA = (0.55 + 0.4 * pulse) * fade;
    const light = tint(z.color, 0.35);
    g.ellipse(z.x, 0, half, depth).fill({ color: z.color, alpha: fillA });
    g.ellipse(z.x, 0, half, depth).stroke({ color: light, width: 3 * px, alpha: lineA });
    g.ellipse(z.x, 0, half * 0.62, depth * 0.62).stroke({ color: light, width: 1.5 * px, alpha: lineA * 0.6 });
    // Centre marker and edge posts.
    g.moveTo(z.x, -8).lineTo(z.x, 8).stroke({ color: 0xffffff, width: 2 * px, alpha: lineA * 0.8 });
    for (const sx of [-1, 1]) {
      g.moveTo(z.x + sx * half, 0).lineTo(z.x + sx * half, -34).stroke({ color: light, width: 3 * px, alpha: lineA * 0.8 });
    }
  }

  /**
   * The drag ghost at world scale: a glowing ground disc with marching dashes, a light curtain rising
   * over the whole area, edge pillars, the power's motif (falling strikes, a sweeping line, drifting
   * puffs) and a bobbing drop arrow. Units it would hit get a gold ring and a chevron. Invalid: red,
   * no motif, a cross instead of the arrow.
   */
  private drawGhost(g: Graphics, z: Ghost, px: number): void {
    const t = this.rt;
    // Pop in (overshoot) when it appears; a quick squash when it turns valid or invalid.
    const pop = Math.min(1, z.ageMs / 180);
    const flip = Math.min(1, z.flipMs / 160);
    const s = (1 - Math.pow(1 - pop, 3)) * (1 + 0.08 * Math.sin(pop * Math.PI)) * (1 + 0.06 * Math.sin(flip * Math.PI));
    const half = (z.width / 2) * s;
    const depth = 36 * s;
    const color = z.valid ? z.color : GHOST_INVALID;
    const light = tint(color, 0.45);
    const glow = tint(color, 0.7);
    const breathe = 0.5 + 0.5 * Math.sin(t / 220);
    const x = z.x;

    // Light curtain: stacked bands fading upward, brighter at the ground.
    const bands = 7;
    for (let i = 0; i < bands; i++) {
      const y0 = -(CURTAIN_LU * s * i) / bands;
      const h = (CURTAIN_LU * s) / bands;
      const a = (z.valid ? 0.16 : 0.12) * Math.pow(1 - i / bands, 1.6) * (0.85 + 0.15 * breathe);
      g.rect(x - half, y0 - h, half * 2, h).fill({ color, alpha: a });
    }
    // Ground disc: soft outer glow, fill, bright rim, inner ring.
    g.ellipse(x, 0, half + 10 * px, depth + 6 * px).fill({ color: glow, alpha: 0.12 + 0.08 * breathe });
    g.ellipse(x, 0, half, depth).fill({ color, alpha: z.valid ? 0.32 : 0.26 });
    g.ellipse(x, 0, half * 0.66, depth * 0.66).fill({ color: glow, alpha: 0.1 });
    g.ellipse(x, 0, half, depth).stroke({ color: 0x1b1330, width: 6 * px, alpha: 0.35 });
    // Marching dashes around the rim (clockwise when valid, still when invalid).
    const dashes = Math.max(14, Math.round(half / 14));
    const phase = z.valid ? (t / 900) % 1 : 0;
    for (let i = 0; i < dashes; i++) {
      const a0 = ((i + phase) / dashes) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / dashes / 1.9;
      const steps = 4;
      g.moveTo(x + Math.cos(a0) * half, Math.sin(a0) * depth);
      for (let k = 1; k <= steps; k++) {
        const a = a0 + ((a1 - a0) * k) / steps;
        g.lineTo(x + Math.cos(a) * half, Math.sin(a) * depth);
      }
    }
    g.stroke({ color: light, width: 3.5 * px, alpha: 0.95 });
    g.ellipse(x, 0, half * 0.66, depth * 0.66).stroke({ color: light, width: 1.5 * px, alpha: 0.55 });

    // Edge pillars with a bright cap.
    for (const sx of [-1, 1]) {
      const ex = x + sx * half;
      g.moveTo(ex, 0)
        .lineTo(ex, -CURTAIN_LU * s * 0.72)
        .stroke({ color: glow, width: 7 * px, alpha: 0.22 });
      g.moveTo(ex, 0)
        .lineTo(ex, -CURTAIN_LU * s * 0.72)
        .stroke({ color: light, width: 2.5 * px, alpha: 0.9 });
      g.circle(ex, -CURTAIN_LU * s * 0.72, 4 * px).fill({ color: 0xffffff, alpha: 0.9 });
    }

    if (z.valid) this.drawMotif(g, z, half, px, t);

    // Units it would hit: a pulsing gold ring on the ground and a chevron over the head.
    if (z.valid) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 140);
      for (const u of this.targets) {
        const r = Math.max(16, u.size * 0.55) * (1 + 0.08 * pulse);
        g.ellipse(u.x, u.y, r + 4 * px, r * 0.38 + 3 * px).stroke({ color: 0x1b1330, width: 5 * px, alpha: 0.5 });
        g.ellipse(u.x, u.y, r, r * 0.38).stroke({ color: GHOST_TARGET, width: 3 * px, alpha: 0.95 });
        const hy = u.y - Math.max(40, u.size * 1.35) - 10 - 6 * pulse;
        const cw = 9;
        g.poly([u.x - cw, hy - 10, u.x + cw, hy - 10, u.x, hy]).fill({ color: GHOST_TARGET, alpha: 1 });
        g.poly([u.x - cw, hy - 10, u.x + cw, hy - 10, u.x, hy]).stroke({ color: 0x1b1330, width: 2 * px, alpha: 0.9 });
      }
    }

    // Centre: a bobbing drop arrow (valid) or a cross (invalid).
    const top = -CURTAIN_LU * s - 14;
    if (z.valid) {
      const bob = 8 * Math.sin(t / 180);
      const ay = top + bob;
      const arrow = [x - 16, ay - 22, x + 16, ay - 22, x + 16, ay - 4, x + 28, ay - 4, x, ay + 22, x - 28, ay - 4, x - 16, ay - 4];
      g.poly(arrow).fill({ color: 0xffffff, alpha: 0.97 });
      g.poly(arrow).stroke({ color, width: 3 * px, alpha: 1 });
      g.moveTo(x, ay + 26)
        .lineTo(x, -6)
        .stroke({ color: 0xffffff, width: 2 * px, alpha: 0.5 });
    } else {
      const c = 16;
      const cy = top;
      g.circle(x, cy, 26).fill({ color: 0x1b1330, alpha: 0.75 });
      g.circle(x, cy, 26).stroke({ color: light, width: 3 * px, alpha: 1 });
      g.moveTo(x - c * 0.6, cy - c * 0.6)
        .lineTo(x + c * 0.6, cy + c * 0.6)
        .moveTo(x + c * 0.6, cy - c * 0.6)
        .lineTo(x - c * 0.6, cy + c * 0.6)
        .stroke({ color: 0xffffff, width: 5 * px, alpha: 1 });
    }
  }

  /** The power's motif inside the ghost, looping on wall time. */
  private drawMotif(g: Graphics, z: Ghost, half: number, px: number, t: number): void {
    const x = z.x;
    const white = 0xffffff;
    switch (z.style) {
      case 'barrage': {
        // Strikes falling in a staggered loop, each ending in a small impact ring.
        const n = Math.max(4, Math.min(9, Math.round(half / 40)));
        for (let i = 0; i < n; i++) {
          const k = ((t / 700 + i * 0.37) % 1 + 1) % 1;
          const sx = x - half + ((i + 0.5) / n) * half * 2;
          const y = -CURTAIN_LU * 0.95 + k * CURTAIN_LU * 0.95;
          const len = 26;
          g.moveTo(sx + 6, y - len)
            .lineTo(sx, y)
            .stroke({ color: white, width: 3 * px, alpha: 0.55 * (1 - k * 0.4) });
          g.circle(sx, y, 3.5).fill({ color: white, alpha: 0.85 });
          if (k > 0.82) {
            const r = 6 + (k - 0.82) * 90;
            g.ellipse(sx, 0, r, r * 0.35).stroke({ color: white, width: 2 * px, alpha: (1 - k) * 4 });
          }
        }
        return;
      }
      case 'sweep': {
        // A bright line sweeping across the zone in the casting direction, with trailing chevrons.
        const k = (t / 1100) % 1;
        const from = x - z.dir * half;
        const lx = from + z.dir * k * half * 2;
        g.moveTo(lx, 8)
          .lineTo(lx, -CURTAIN_LU * 0.6)
          .stroke({ color: white, width: 4 * px, alpha: 0.8 * Math.sin(k * Math.PI) });
        for (let i = 1; i <= 3; i++) {
          const cx = lx - z.dir * i * 22;
          if ((cx - (x - half)) * (cx - (x + half)) > 0) continue;
          const a = 0.6 - i * 0.15;
          g.moveTo(cx - z.dir * 8, -60)
            .lineTo(cx + z.dir * 4, -46)
            .lineTo(cx - z.dir * 8, -32)
            .stroke({ color: white, width: 3 * px, alpha: a * Math.sin(k * Math.PI) });
        }
        return;
      }
      case 'cloud': {
        // Soft puffs drifting and breathing over the zone.
        const n = Math.max(4, Math.round(half / 45));
        for (let i = 0; i < n; i++) {
          const sx = x - half * 0.85 + ((i + 0.5) / n) * half * 1.7 + 10 * Math.sin(t / 900 + i);
          const sy = -48 - 18 * Math.sin(t / 700 + i * 1.7);
          const r = 24 + 6 * Math.sin(t / 500 + i * 2.1);
          g.circle(sx, sy, r).fill({ color: white, alpha: 0.16 });
          g.circle(sx - r * 0.3, sy - r * 0.3, r * 0.45).fill({ color: white, alpha: 0.14 });
        }
        return;
      }
      default:
        return;
    }
  }
}
