/**
 * Wardrobe Crate views (DESIGN A10.1): the crate on the pedestal and the CS-style reel window.
 * The reel's motion comes from `reelMath` (quintic ease-out to a stop inside tile 45); this file
 * only draws it.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import type { ArtProvider, I18n } from '@/contracts';
import { clamp01, easeOutCubic } from './ease';
import { label } from './fx';
import { portraitTexture } from './cardFan';
import { RARITY_COLORS, ROOM, shade } from './palette';
import { tileAt, type ReelLayout } from './reelMath';
import { edgeFadeTexture } from './textures';
import type { CapsuleCatalog } from './types';

/** The Wardrobe Crate: a brass-cornered wooden chest with a hanger emblem. Origin: bottom centre. */
export class CrateView {
  readonly root = new Container();
  readonly lid = new Container();
  readonly box = new Container();

  constructor() {
    const wood = 0x8a5a33;
    const line = shade(wood, -0.6);
    const g = new Graphics();
    g.roundRect(-112, -150, 224, 150, 12).fill(wood).stroke({ width: 4, color: line });
    for (const y of [-112, -74, -36]) g.moveTo(-108, y).lineTo(108, y).stroke({ width: 3, color: shade(wood, -0.3) });
    g.roundRect(-104, -144, 14, 136, 7).fill({ color: 0xffffff, alpha: 0.12 });
    for (const [x, y, sx, sy] of [
      [-112, -150, 1, 1],
      [112, -150, -1, 1],
      [-112, 0, 1, -1],
      [112, 0, -1, -1],
    ] as const) {
      g.poly([x, y, x + 34 * sx, y, x + 34 * sx, y + 10 * sy, x + 10 * sx, y + 10 * sy, x + 10 * sx, y + 34 * sy, x, y + 34 * sy]).fill(ROOM.brass).stroke({ width: 2.5, color: ROOM.brassDark });
    }
    // Hanger emblem in a brass medallion.
    g.circle(0, -76, 34).fill(shade(wood, -0.35)).stroke({ width: 5, color: ROOM.brass });
    g.moveTo(-22, -64).lineTo(0, -80).lineTo(22, -64).lineTo(-22, -64).stroke({ width: 4, color: ROOM.brassLight, join: 'round' });
    g.moveTo(0, -80).lineTo(0, -88).arc(4, -90, 4, Math.PI, Math.PI * 1.9).stroke({ width: 3.5, color: ROOM.brassLight });
    this.box.addChild(g);
    const lg = new Graphics();
    lg.roundRect(-120, -26, 240, 30, 10).fill(shade(wood, -0.15)).stroke({ width: 4, color: line });
    lg.roundRect(-120, -16, 240, 10, 4).fill(ROOM.brass).stroke({ width: 2, color: ROOM.brassDark });
    lg.roundRect(-18, -6, 36, 20, 5).fill(ROOM.brass).stroke({ width: 2.5, color: ROOM.brassDark });
    this.lid.addChild(lg);
    this.lid.position.set(0, -150);
    this.root.addChild(this.box, this.lid);
  }
}

const WIN_W = 1040;
const WIN_H = 214;

/** The reel window with 50 tiles and the pointer. Origin: window centre. */
export class ReelView {
  readonly root = new Container();
  private readonly strip = new Container();
  private readonly tiles: Container[] = [];
  private readonly glows: Graphics[] = [];
  private lastUnder = -1;

  constructor(
    readonly layout: ReelLayout,
    art: ArtProvider,
    i18n: I18n,
    catalog: CapsuleCatalog,
  ) {
    const frame = new Graphics();
    frame.roundRect(-WIN_W / 2 - 14, -WIN_H / 2 - 14, WIN_W + 28, WIN_H + 28, 22).fill(ROOM.brassDark).stroke({ width: 4, color: shade(ROOM.brassDark, -0.5) });
    frame.roundRect(-WIN_W / 2 - 8, -WIN_H / 2 - 8, WIN_W + 16, WIN_H + 16, 18).fill(ROOM.brass);
    frame.roundRect(-WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H, 12).fill(0x120f1c);
    const mask = new Graphics().roundRect(-WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H, 12).fill(0xffffff);
    const inner = new Container();
    inner.addChild(this.strip, mask);
    inner.mask = mask;

    layout.tiles.forEach((tile, i) => {
      const c = new Container();
      const col = RARITY_COLORS[tile.rarity];
      const g = new Graphics();
      g.roundRect(0, -85, layout.tileW, 170, 12).fill(shade(col, -0.62)).stroke({ width: 3, color: shade(col, -0.2) });
      g.roundRect(4, -81, layout.tileW - 8, 118, 9).fill({ color: shade(col, -0.35), alpha: 0.9 });
      g.roundRect(0, 62, layout.tileW, 23, 0).fill(col);
      g.roundRect(0, 62, layout.tileW, 4, 0).fill({ color: 0xffffff, alpha: 0.35 });
      const glow = new Graphics().roundRect(-4, -89, layout.tileW + 8, 178, 14).stroke({ width: 6, color: col, alpha: 0.9 });
      glow.blendMode = 'add';
      glow.visible = false;
      const info = catalog.skin(tile.skin);
      const nm = label(i18n.t(info.nameKey), 14, 0xffffff, { outline: 3 });
      nm.position.set(layout.tileW / 2, 48);
      if (nm.width > layout.tileW - 12) nm.scale.set((layout.tileW - 12) / nm.width);
      const ph = new Container();
      ph.position.set(layout.tileW / 2, -22);
      const fallback = new Graphics().circle(0, 0, 34).fill(shade(col, -0.1)).stroke({ width: 3, color: shade(col, 0.4) });
      ph.addChild(fallback);
      c.addChild(g, ph, nm, glow);
      c.position.set(i * layout.pitch, 0);
      this.strip.addChild(c);
      this.tiles.push(c);
      this.glows.push(glow);
      void (async () => {
        try {
          const url = await art.portrait({ card: info.target, skin: tile.skin, size: 192 });
          const tex = await portraitTexture(url);
          if (!tex || c.destroyed) return;
          const s = new Sprite(tex);
          s.anchor.set(0.5);
          s.scale.set(Math.min(130 / tex.width, 110 / tex.height));
          ph.removeChildren();
          ph.addChild(s);
        } catch {
          // Keep the fallback disc.
        }
      })();
    });

    const fadeL = new Sprite(edgeFadeTexture(0x120f1c));
    fadeL.position.set(-WIN_W / 2, -WIN_H / 2);
    fadeL.width = 180;
    fadeL.height = WIN_H;
    const fadeR = new Sprite(edgeFadeTexture(0x120f1c));
    fadeR.width = 180;
    fadeR.height = WIN_H;
    // Mirrored: opaque at the right edge, extending leftwards.
    fadeR.scale.x *= -1;
    fadeR.position.set(WIN_W / 2, -WIN_H / 2);
    const pointer = new Graphics();
    pointer.rect(-1.5, -WIN_H / 2, 3, WIN_H).fill({ color: ROOM.brassLight, alpha: 0.9 });
    pointer.poly([-16, -WIN_H / 2 - 16, 16, -WIN_H / 2 - 16, 0, -WIN_H / 2 + 8]).fill(ROOM.brassLight).stroke({ width: 3, color: ROOM.brassDark });
    pointer.poly([-16, WIN_H / 2 + 16, 16, WIN_H / 2 + 16, 0, WIN_H / 2 - 8]).fill(ROOM.brassLight).stroke({ width: 3, color: ROOM.brassDark });
    this.root.addChild(frame, inner, fadeL, fadeR, pointer);
  }

  /** Puts strip position `pos` under the pointer (window centre). */
  setPos(pos: number): void {
    this.strip.x = -pos;
    const under = tileAt(this.layout, pos);
    if (under !== this.lastUnder) {
      const prev = this.glows[this.lastUnder];
      if (prev) prev.visible = false;
      const now = this.glows[under];
      if (now) now.visible = true;
      this.lastUnder = under;
    }
  }

  /** Dims every tile but the winner, 0..1. */
  focusWinner(u: number): void {
    const k = clamp01(u);
    this.tiles.forEach((t, i) => {
      t.alpha = i === this.layout.winnerIndex ? 1 : 1 - 0.7 * easeOutCubic(k);
    });
  }

  /** The winning tile's centre in this view's coordinates. */
  winnerCenter(): { x: number; y: number } {
    const t = this.tiles[this.layout.winnerIndex];
    return { x: (t?.x ?? 0) + this.layout.tileW / 2 + this.strip.x, y: 0 };
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
