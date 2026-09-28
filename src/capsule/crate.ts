/**
 * The Wardrobe Crate on the pedestal (DESIGN A10, A15.3). The crate is revealed with the card flip;
 * there is no reel.
 */
import { Container, Graphics } from 'pixi.js';
import { ROOM, shade } from './palette';

/** The Wardrobe Crate: a brass-cornered wooden chest with a hanger emblem. Origin: bottom centre. */
export class CrateView {
  readonly root = new Container();
  readonly lid = new Container();
  readonly box = new Container();
  /** Warm light leaking from the seams while the crate rattles open (additive, 0 alpha at rest). */
  readonly glow = new Graphics();

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
    // Seams: the lid line and the plank gaps, drawn as soft bright strokes.
    for (const [y, w] of [
      [-150, 7],
      [-112, 3],
      [-74, 3],
      [-36, 3],
    ] as const) {
      this.glow.moveTo(-104, y).lineTo(104, y).stroke({ width: w * 3, color: 0xffd98a, alpha: 0.35 });
      this.glow.moveTo(-100, y).lineTo(100, y).stroke({ width: w, color: 0xfff4d6, alpha: 0.95 });
    }
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.root.addChild(this.box, this.glow, this.lid);
  }
}
