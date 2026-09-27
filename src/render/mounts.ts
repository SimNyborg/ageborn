/**
 * Turret mount interaction (DESIGN A2.8, A2.12, A9.2): mounts are tapped directly on the base in the
 * canvas; the build / Modernise / Sell picker is a DOM popover in the HUD. The view maps canvas pointer
 * events to mounts and draws the mount markers:
 *
 * - an empty owned mount shows a soft pulsing ring (the tutorial's "the empty mount pulses"),
 * - the next buyable mount shows a "+" badge with its price,
 * - mounts beyond that are hidden.
 */
import type { Pt, Side } from '@/contracts';
import { Container, Graphics } from 'pixi.js';
import type { LabelFactory, LabelNode } from './feel/numbers';
import { tint } from './teamColors';

/** Minimum tap radius around a mount, in lu and in screen px (the larger wins). */
export const MOUNT_TAP_LU = 24;
export const MOUNT_TAP_PX = 26;

/** Transforms a base's local mount points to world points (the base root is mirrored for side 1). */
export function mountWorldPoints(local: readonly Pt[], baseX: number, baseY: number, scaleX: number): Pt[] {
  return local.map((p) => ({ x: baseX + p.x * scaleX, y: baseY + p.y }));
}

/** Index of the mount under world point `at`, or null. `radius` in lu. */
export function hitTestMount(points: readonly Pt[], at: Pt, radius: number): number | null {
  let best: number | null = null;
  let bestD = radius * radius;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) continue;
    const d = (p.x - at.x) ** 2 + (p.y - at.y) ** 2;
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export type MountTapKind = 'mount' | 'buy';

/** What a tap on mount `index` means for its owner: an owned mount, the next buyable one, or nothing. */
export function mountTapKind(index: number, mountsOwned: number): MountTapKind | null {
  if (index < mountsOwned) return 'mount';
  if (index === mountsOwned) return 'buy';
  return null;
}

export interface MountMarkerState {
  points: Pt[];
  mountsOwned: number;
  /** Per mount: true when a turret (or a build) is on it. */
  occupied: boolean[];
  /** Price of the next mount, or null when all are owned. */
  nextCost: number | null;
  color: number;
}

export class MountMarkers {
  readonly root = new Container();
  private readonly g = new Graphics();
  private label: LabelNode | null = null;
  private t = 0;

  constructor(private readonly labels?: LabelFactory) {
    this.root.label = 'mountMarkers';
    this.root.eventMode = 'none';
    this.root.addChild(this.g);
  }

  update(dtMs: number, scale: number, s: MountMarkerState | null): void {
    this.t += dtMs;
    const g = this.g;
    g.clear();
    if (!s) {
      if (this.label) this.label.root.visible = false;
      return;
    }
    const px = 1 / Math.max(0.0001, scale);
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 260);
    s.points.forEach((p, i) => {
      if (i < s.mountsOwned && !s.occupied[i]) {
        const r = 11 + 3 * pulse;
        g.circle(p.x, p.y, r).fill({ color: s.color, alpha: 0.18 + 0.12 * pulse });
        g.circle(p.x, p.y, r).stroke({ color: tint(s.color, 0.5), width: 2.5 * px, alpha: 0.65 + 0.3 * pulse });
      }
    });
    const next = s.points[s.mountsOwned];
    if (next && s.nextCost !== null) {
      const r = 10;
      g.circle(next.x, next.y, r + 2 * px).fill({ color: 0x1b1428, alpha: 0.75 });
      g.circle(next.x, next.y, r).fill({ color: 0xffd447, alpha: 0.95 });
      g.rect(next.x - 5.5, next.y - 1.6, 11, 3.2).fill({ color: 0x3a2410 });
      g.rect(next.x - 1.6, next.y - 5.5, 3.2, 11).fill({ color: 0x3a2410 });
      if (this.labels) {
        if (!this.label) {
          this.label = this.labels();
          this.label.setStyle(0xffe08a, 14);
          this.root.addChild(this.label.root);
        }
        this.label.root.visible = true;
        this.label.setText(String(s.nextCost));
        this.label.root.position.set(next.x, next.y - r - 3);
        this.label.root.scale.set(px);
      }
    } else if (this.label) {
      this.label.root.visible = false;
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/** A tap that the view reports to the HUD. `screen` is in CSS px relative to the canvas. */
export interface MountTap {
  side: Side;
  mount: number;
  kind: MountTapKind;
  screen: Pt;
  shift: boolean;
}
