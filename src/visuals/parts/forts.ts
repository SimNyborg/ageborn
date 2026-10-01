/**
 * Fort icons (DESIGN A16.14.8): the kind glyphs (`icon.fort.wall|tower|camp|trap`), the pad marker
 * (`icon.fort.pad`) and the tray's stone frame (`ui.frame.fort`). White glyphs on a stone disc with a
 * team rim, readable at 14 px; the frame is a rounded stone square that never reads as a rarity frame.
 */
import { circle, ellipse, join, poly, rect, rrect } from '../svg';
import { part } from './registry';

const disc = { d: circle(0, 0, 9), zone: 'stone', line: 1.6, shade: false, light: false } as const;
const rim = { d: join(circle(0, 0, 9.6)), zone: 'team', line: 0, shade: false, light: false, alpha: 0.9 } as const;

const GLYPHS: Record<'wall' | 'tower' | 'camp' | 'trap', string> = {
  // crenellated wall
  wall: poly([-6.4, 5, -6.4, -2.6, -4.4, -2.6, -4.4, -5, -1.2, -5, -1.2, -2.6, 1.2, -2.6, 1.2, -5, 4.4, -5, 4.4, -2.6, 6.4, -2.6, 6.4, 5]),
  // a tower with a merloned top and a slit
  tower: join(poly([-4, 6, -3.2, -2.6, -5, -2.6, -5, -6, -2.6, -6, -2.6, -4.4, -0.8, -4.4, -0.8, -6, 0.8, -6, 0.8, -4.4, 2.6, -4.4, 2.6, -6, 5, -6, 5, -2.6, 3.2, -2.6, 4, 6])),
  // a tent with a pennant
  camp: join(poly([-6.6, 5.6, 0, -4.4, 6.6, 5.6]), poly([-0.5, -4.4, -0.5, -7.4, 3.6, -6.2, -0.1, -5.2])),
  // three spikes over a pit
  trap: join(poly([-5.6, 3, -3.8, -4.6, -2, 3]), poly([-1.8, 3, 0, -6, 1.8, 3]), poly([2, 3, 3.8, -4.6, 5.6, 3]), rrect(-7, 3, 14, 2.4, 1.2)),
};

for (const [k, d] of Object.entries(GLYPHS)) {
  part(`icon.fort.${k}`, [rim, disc, { d, zone: 'white', line: 0, shade: false, light: false }]);
}

part('icon.fort.pad', [
  { d: ellipse(0, 0, 14, 4.6), zone: 'team', line: 0, shade: false, light: false, alpha: 0.35 },
  { d: join(ellipse(0, 0, 14, 4.6)), zone: 'stone', line: 1.4, shade: false, light: false, alpha: 0.9 },
  { d: rect(-1.2, -9, 2.4, 9), zone: 'stone', line: 1, shade: false, light: false },
]);

part('ui.frame.fort', [
  { d: rrect(-24, -24, 48, 48, 9), zone: 'stone', line: 2.2 },
  { d: rrect(-19, -19, 38, 38, 6), zone: 'plate', line: 1.2, shade: false, light: false },
  { d: join(rect(-24, 15, 48, 2.2), rect(-24, -3, 6, 2), rect(18, 6, 6, 2), rect(-10, -24, 2, 5)), zone: 'iron', line: 0, shade: false, light: false, alpha: 0.6 },
]);
