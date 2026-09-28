/**
 * The card class badge in the capsule show (owner feedback 2026-09-28 "card class and counters
 * visible"): the same disc and glyph as the UI's `ClassIcon`, drawn with Pixi from the shared path
 * data in `core/cardClass.ts`, so a revealed card says at once what it is.
 */
import { CLASS_COLOR, CLASS_GLYPH, type ClassGlyphId } from '@/core/cardClass';
import { Container, Graphics } from 'pixi.js';

const INK = '#1b1330';
const GLYPH = '#FFF8E8';

/** Class labels (the UI's `ui.class.*` strings). */
export const CLASS_KEY: Readonly<Record<ClassGlyphId, string>> = {
  infantry: 'ui.class.infantry',
  ranged: 'ui.class.ranged',
  heavy: 'ui.class.heavy',
  antiArmor: 'ui.class.antiArmor',
  siege: 'ui.class.siege',
  support: 'ui.class.support',
  air: 'ui.class.air',
  legendary: 'ui.class.legendary',
  turret: 'ui.class.turret',
  power: 'ui.class.power',
};

function hex(c: string): number {
  return parseInt(c.slice(1), 16);
}

/** The glyph as one SVG document (24 × 24 view box). */
export function classGlyphSvg(id: ClassGlyphId): string {
  const parts = CLASS_GLYPH[id]
    .map((g) => {
      const fill = g.fill === 'glyph' ? GLYPH : g.fill === 'ink' ? INK : 'none';
      const stroke = g.stroke
        ? ` stroke="${g.strokeGlyph ? GLYPH : INK}" stroke-width="${g.stroke / 10}" stroke-linecap="round" stroke-linejoin="round"`
        : '';
      const tf = g.transform ? ` transform="${g.transform}"` : '';
      return `<path d="${g.d}" fill="${fill}"${stroke}${tf}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${parts}</svg>`;
}

/** A class badge of `radius` px, centred on its origin. */
export function classBadge(id: ClassGlyphId, radius: number): Container {
  const root = new Container();
  const col = CLASS_COLOR[id];
  const disc = new Graphics()
    .circle(0, radius * 0.12, radius)
    .fill(hex(INK))
    .circle(0, 0, radius)
    .fill(hex(col.main))
    .stroke({ width: Math.max(2, radius * 0.16), color: hex(INK) });
  disc.circle(0, radius * 0.35, radius * 0.7).fill({ color: hex(col.dark), alpha: 0.35 });
  disc.circle(-radius * 0.34, -radius * 0.44, radius * 0.22).fill({ color: 0xffffff, alpha: 0.5 });
  root.addChild(disc);
  try {
    const glyph = new Graphics().svg(classGlyphSvg(id));
    const s = (radius * 1.5) / 24;
    glyph.scale.set(s);
    glyph.position.set(-12 * s, -12 * s);
    root.addChild(glyph);
  } catch {
    // A glyph that fails to parse leaves the plain disc; the reveal must never break.
  }
  return root;
}
