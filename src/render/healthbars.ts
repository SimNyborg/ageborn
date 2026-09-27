/**
 * Health bars (DESIGN A11 Team readability): a bar appears only once a unit is damaged, in its team
 * colour, with a ghost segment that holds for 300 ms after each hit and then drains. Shields show as a
 * thin light strip over the bar.
 *
 * All bars are drawn by one `Graphics` per frame (one batched draw). Widths are in lu (they follow the
 * unit's size); thickness is constant in screen px.
 */
import { Graphics } from 'pixi.js';
import { shade, tint } from './teamColors';

export interface BarState {
  hpBp: number;
  ghostBp: number;
  holdMs: number;
  shieldBp: number;
  /** True once the unit has taken damage. */
  shown: boolean;
}

export function newBar(hpBp = 10000): BarState {
  return { hpBp, ghostBp: hpBp, holdMs: 0, shieldBp: 0, shown: hpBp < 10000 };
}

/**
 * Advances one bar. On a hit the ghost keeps the old value for `holdMs`, then drains to the current
 * HP over `drainMs` (a full bar's worth). Heals move both at once.
 */
export function stepBar(b: BarState, hpBp: number, shieldBp: number, dtMs: number, holdMs: number, drainMs: number): void {
  const hp = Math.max(0, Math.min(10000, hpBp));
  if (hp < b.hpBp) {
    b.ghostBp = Math.max(b.ghostBp, b.hpBp);
    b.holdMs = holdMs;
    b.shown = true;
  } else if (hp > b.hpBp) {
    b.ghostBp = Math.max(b.ghostBp, hp);
  }
  b.hpBp = hp;
  b.shieldBp = Math.max(0, shieldBp);
  if (b.holdMs > 0) {
    b.holdMs = Math.max(0, b.holdMs - dtMs);
  } else if (b.ghostBp > b.hpBp) {
    const rate = 10000 / Math.max(1, drainMs);
    b.ghostBp = Math.max(b.hpBp, b.ghostBp - rate * dtMs);
  }
  if (b.ghostBp < b.hpBp) b.ghostBp = b.hpBp;
  if (b.shieldBp > 0 && hp > 0) b.shown = true;
}

/** Bar width in lu for a unit of collision width `sizeLu`. */
export function barWidthLu(sizeLu: number): number {
  return Math.max(30, Math.min(84, sizeLu * 1.3));
}

export interface BarDraw {
  /** Centre x and top y in world lu. */
  x: number;
  y: number;
  widthLu: number;
  bar: BarState;
  color: number;
  alpha: number;
}

export const BAR_HEIGHT_PX = 5;

export class HealthBars {
  readonly root = new Graphics();

  constructor() {
    this.root.label = 'healthBars';
    this.root.eventMode = 'none';
  }

  /** Redraws every visible bar; `scale` is px per lu. */
  draw(bars: readonly BarDraw[], scale: number): void {
    const g = this.root;
    g.clear();
    const px = 1 / Math.max(0.0001, scale);
    const h = BAR_HEIGHT_PX * px;
    for (const d of bars) {
      if (!d.bar.shown || d.alpha <= 0.01) continue;
      const w = d.widthLu;
      const x0 = d.x - w / 2;
      const y0 = d.y;
      const o = px;
      // Frame and track.
      g.roundRect(x0 - o, y0 - o, w + 2 * o, h + 2 * o, 2 * px).fill({ color: 0x140e1f, alpha: 0.82 * d.alpha });
      const ghostW = (w * d.bar.ghostBp) / 10000;
      const hpW = (w * d.bar.hpBp) / 10000;
      if (ghostW > hpW) g.rect(x0 + hpW, y0, ghostW - hpW, h).fill({ color: 0xfff0d0, alpha: 0.9 * d.alpha });
      if (hpW > 0) {
        g.rect(x0, y0, hpW, h).fill({ color: d.color, alpha: d.alpha });
        g.rect(x0, y0, hpW, h * 0.4).fill({ color: tint(d.color, 0.45), alpha: d.alpha });
        g.rect(x0, y0 + h * 0.75, hpW, h * 0.25).fill({ color: shade(d.color, 0.3), alpha: d.alpha });
      }
      if (d.bar.shieldBp > 0) {
        const sw = Math.min(w, (w * d.bar.shieldBp) / 10000);
        g.rect(x0, y0 - 2.5 * px, sw, 2 * px).fill({ color: 0xc8f4ff, alpha: 0.95 * d.alpha });
      }
    }
  }

  destroy(): void {
    this.root.destroy();
  }
}
