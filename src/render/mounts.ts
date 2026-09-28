/**
 * Turret mount interaction (DESIGN A2.8, A2.12, A9.2): mounts are tapped directly on the base in the
 * canvas; the build / Modernise / Sell picker is a DOM popover in the HUD. The view maps canvas pointer
 * events to mounts and draws the mount markers:
 *
 * - an empty owned mount shows a bobbing socket with a hammer (the tutorial's "the empty mount pulses"),
 * - the next buyable mount shows a "+" badge labelled "New slot · 150",
 * - mounts beyond that are hidden.
 */
import type { Pt, Side } from '@/contracts';
import { Container, Graphics, Text } from 'pixi.js';
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
  /** The player's whole gold (the "New slot" label lights up when affordable). */
  gold: number;
  color: number;
}

/**
 * A canvas-text label for words (the number font only has digits): the "New slot · 150" tag. The
 * text is rendered at 2x and scaled, so it stays crisp when the world is scaled down.
 */
export const textLabelFactory: LabelFactory = () => {
  const root = new Container();
  const text = new Text({
    text: '',
    resolution: 2,
    style: {
      fontFamily: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',
      fontSize: 15,
      fontWeight: '900',
      fill: 0xffffff,
      stroke: { color: 0x1b1330, width: 5, join: 'round' },
      letterSpacing: 0.3,
    },
  });
  text.anchor.set(0.5, 1);
  root.addChild(text);
  return {
    root,
    setText: (s) => {
      text.text = s;
    },
    setStyle: (color, sizePx) => {
      text.tint = color;
      if (text.style.fontSize !== sizePx) text.style.fontSize = sizePx;
    },
  };
};

/** Empty-mount socket diameter in CSS px (a 44 px tap target, audit #3). */
export const SOCKET_PX = 44;
/** Mounts sit about this far apart (lu); markers shrink to fit on small screens. */
export const MOUNT_GAP_LU = 46;
/** The "+" badge of the next buyable mount, in CSS px. */
export const BUY_BADGE_PX = 30;

/**
 * Mount markers, drawn in world space but sized in screen px so they read the same on every screen:
 *
 * - an empty owned mount is a 44 px socket (dark well, team rim, hammer and "+") that bobs gently and
 *   breathes, so it reads as "build here",
 * - the next buyable mount shows a gold "+" badge with a "New slot · 150" label (bright when
 *   affordable),
 * - mounts beyond that are hidden.
 */
export class MountMarkers {
  readonly root = new Container();
  private readonly g = new Graphics();
  private label: LabelNode | null = null;
  private labelText = '';
  private t = 0;

  constructor(
    private readonly labels?: LabelFactory,
    /** The next-mount label ("New slot · 150"); the app passes the translated text. */
    private readonly labelFor: (cost: number) => string = (cost) => String(cost),
  ) {
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
    // Sized in screen px, but never wider than the gap between two mounts (small phone screens).
    const size = Math.min(1, (MOUNT_GAP_LU * scale) / SOCKET_PX);
    const pulse = 0.5 + 0.5 * Math.sin(this.t / 260);
    const bob = Math.sin(this.t / 420) * 2.5 * px;
    s.points.forEach((p, i) => {
      if (i < s.mountsOwned && !s.occupied[i]) this.socket(p.x, p.y + bob, px * size, pulse, s.color);
    });
    const next = s.points[s.mountsOwned];
    if (next && s.nextCost !== null) {
      const affordable = s.gold >= s.nextCost;
      // A real option: affordable and every owned mount built. Only then it bobs, glows and says so.
      const offer = affordable && s.occupied.slice(0, s.mountsOwned).every(Boolean);
      const r = (BUY_BADGE_PX / 2) * px * Math.min(1, size * 1.25);
      const y = next.y + (offer ? bob : 0);
      g.circle(next.x, y + 2 * px, r + 2.5 * px).fill({ color: 0x1b1330, alpha: 0.9 });
      g.circle(next.x, y, r + 2.5 * px).fill({ color: 0x1b1330 });
      g.circle(next.x, y, r).fill({ color: offer ? 0xffd447 : 0xb9aecb, alpha: offer ? 1 : 0.8 });
      g.circle(next.x - r * 0.25, y - r * 0.3, r * 0.45).fill({ color: 0xffffff, alpha: 0.35 });
      const arm = r * 0.55;
      const thick = r * 0.22;
      g.roundRect(next.x - arm, y - thick / 2, arm * 2, thick, thick / 2).fill({ color: 0x3a2410 });
      g.roundRect(next.x - thick / 2, y - arm, thick, arm * 2, thick / 2).fill({ color: 0x3a2410 });
      if (offer) g.circle(next.x, y, r + (4 + 4 * pulse) * px).stroke({ color: 0xffd447, width: 2 * px, alpha: 0.35 + 0.4 * pulse });
      if (this.labels && !offer && this.label) this.label.root.visible = false;
      if (this.labels && offer) {
        if (!this.label) {
          this.label = this.labels();
          this.root.addChild(this.label.root);
        }
        const text = this.labelFor(s.nextCost);
        if (text !== this.labelText) {
          this.labelText = text;
          this.label.setText(text);
        }
        this.label.setStyle(0xffe08a, 15);
        this.label.root.visible = true;
        this.label.root.position.set(next.x, y - r - 12 * px);
        this.label.root.scale.set(px);
      }
    } else if (this.label) {
      this.label.root.visible = false;
    }
  }

  /** An empty mount: a 44 px socket with a hammer and a "+", breathing in the team colour. */
  private socket(x: number, y: number, px: number, pulse: number, color: number): void {
    const g = this.g;
    const r = (SOCKET_PX / 2) * px;
    g.circle(x, y, r + (5 + 5 * pulse) * px).fill({ color, alpha: 0.12 + 0.12 * pulse });
    g.circle(x, y + 2 * px, r).fill({ color: 0x0b0a1a, alpha: 0.55 });
    g.circle(x, y, r).fill({ color: 0x1b1330, alpha: 0.72 });
    g.circle(x, y, r).stroke({ color: tint(color, 0.35), width: 3.5 * px, alpha: 0.85 + 0.15 * pulse });
    g.circle(x, y, r - 5 * px).stroke({ color: 0xffffff, width: 1.5 * px, alpha: 0.18 });
    // Hammer: a tilted handle and head, left of centre.
    const hx = x - r * 0.18;
    const hy = y + r * 0.05;
    const c = Math.cos(-0.7);
    const sn = Math.sin(-0.7);
    const rot = (dx: number, dy: number): number[] => [hx + dx * c - dy * sn, hy + dx * sn + dy * c];
    const hl = r * 0.62;
    const hw = r * 0.13;
    g.poly([...rot(-hw, -hl * 0.1), ...rot(hw, -hl * 0.1), ...rot(hw, hl), ...rot(-hw, hl)]).fill({ color: 0xc9914f }).stroke({ color: 0x1b1330, width: 1.5 * px });
    const bw = r * 0.62;
    const bh = r * 0.32;
    g.poly([...rot(-bw / 2, -hl * 0.1 - bh), ...rot(bw / 2, -hl * 0.1 - bh), ...rot(bw / 2, -hl * 0.1), ...rot(-bw / 2, -hl * 0.1)]).fill({ color: 0xdfe6f5 }).stroke({ color: 0x1b1330, width: 1.5 * px });
    // "+" at the lower right, like a badge.
    const bx = x + r * 0.42;
    const by = y + r * 0.38;
    const br = r * 0.36;
    g.circle(bx, by, br + 1.5 * px).fill({ color: 0x1b1330 });
    g.circle(bx, by, br).fill({ color: 0xffd447 });
    const arm = br * 0.6;
    const th = br * 0.28;
    g.rect(bx - arm, by - th / 2, arm * 2, th).fill({ color: 0x3a2410 });
    g.rect(bx - th / 2, by - arm, th, arm * 2).fill({ color: 0x3a2410 });
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
