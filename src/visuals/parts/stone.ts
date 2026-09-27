/**
 * Stone Age parts (DESIGN A11 palette: stone brown, moss, bone, ochre accent). Authored in lu at
 * infantry scale with pivots at joints and grips; weapons point up (-y) from the grip.
 */
import { blob, circle, ellipse, join, limb, poly, rrect } from '../svg';
import { part } from './registry';
import { headLayers } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** Bare barrel chest with a one-shoulder hide tunic (team colour) and a jagged hem. */
part('stone.torso.tunic', [
  { d: blob([-9, 2, -10.6, -8, -9.4, -17, -5.6, -21.6, 0.4, -23, 6.2, -21.6, 10, -16.6, 11, -7.6, 9.6, 2, 0.2, 3.6]), zone: 'skin' },
  {
    d: blob(
      [-10, 0.5, -10.4, -9, -8.8, -17.6, -4.2, -20.6, 3.6, -21.6, 7.8, -16, 10.6, -8, 10.4, 0.8, 8.2, 5.6, 5.8, 2.2, 3.4, 6.2, 0.6, 2.6, -2.2, 6.4, -4.8, 2.6, -7.4, 6],
      0.45,
    ),
    zone: 'team',
    banner: true,
  },
  { d: blob([-6.6, -20.8, -3.2, -22.4, 7.6, -9.2, 6.4, -6.8]), zone: 'fur', line: 2.4 },
]);

part('stone.pelvis.loin', [
  { d: blob([-9.2, -3.4, 9.2, -3.4, 9.8, 2.4, 6, 6.8, 3, 4, 0, 7.2, -3, 4, -6, 6.6, -9.8, 2.4], 0.6), zone: 'fur' },
  { d: rrect(-9.8, -4.6, 19.6, 3.4, 1.7), zone: 'rope', line: 2.4 },
]);

// ---------------------------------------------------------------------------------------------
// Heads, hair, hats

part('stone.head.brute', headLayers({ nose: 'big', brow: 'angry', mouth: 'teeth', jaw: 1.6 }));
part('stone.head.plain', headLayers({ nose: 'round', brow: 'calm', mouth: 'grin' }));
part('stone.head.hunter', headLayers({ nose: 'pointy', brow: 'angry', mouth: 'flat' }));
part('stone.head.elder', headLayers({ nose: 'big', brow: 'worried', mouth: 'o' }));

part('stone.hair.shaggy', [
  {
    d: blob(
      [-12.6, -10.6, -13.4, -18.4, -10.2, -24.8, -4.2, -28.4, 3.2, -28.6, 9.4, -26, 13.4, -20.6, 11.8, -18.8, 8.6, -21.6, 4.6, -20.4, 1.6, -22.2, -2.6, -20.2, -6.6, -18.8, -8.4, -14.2, -9.8, -9],
      0.8,
    ),
    zone: 'hair',
  },
  { d: join(limb(-4, -27.8, 1.4, 6.6, -31.6, 1.4), circle(-4.6, -27.2, 2.1), circle(-3.2, -29.4, 2), circle(7.4, -32.4, 2), circle(6.2, -30, 2)), zone: 'bone', line: 2 },
]);
part('stone.hair.topknot', [
  { d: blob([-12.4, -12, -11.4, -21.2, -4.6, -26.4, 4, -26.8, 10.6, -22.8, 12.4, -17.6, 8, -20.4, 1, -21.2, -5.6, -18.6, -9, -12.6]), zone: 'hair' },
  { d: ellipse(-2.4, -29.8, 4.6, 4.2), zone: 'hair' },
  { d: rrect(-5.6, -27.2, 6.4, 2.6, 1.3), zone: 'accent', line: 2 },
]);
part('stone.headband', [{ d: blob([-12.6, -16.6, 0.8, -21, 13, -17.4, 13, -14.2, 0.6, -17.6, -12.2, -13.4], 0.8), zone: 'team', banner: true, line: 2.6 }]);
part('stone.mask.skull', [
  { d: blob([-6, -26, 4, -28.4, 13.6, -23.4, 15.8, -13.6, 11.6, -8.6, 2, -9.6, -4, -13.6]), zone: 'bone' },
  { d: join(ellipse(5.2, -18, 2.6, 3), ellipse(11.2, -17.4, 2, 2.8)), zone: 'dark', line: 0, shade: false, light: false },
  { d: poly([3, -27.4, -1.6, -34, 6, -28.4]), zone: 'bone', line: 2 },
  { d: poly([9, -27, 11, -34.4, 12.6, -25.4]), zone: 'bone', line: 2 },
  { d: join(rrect(-7.6, -18, 3.4, 12, 1.6), rrect(-10.6, -17, 3, 10, 1.5)), zone: 'cloth2', line: 2 },
]);
part('stone.beard.grey', [
  { d: blob([2, -8.6, 12, -9.4, 13.4, -3.6, 9.6, 3.6, 4.4, 5.4, 0.4, 0.4], 0.8), zone: 'bone', line: 2.6 },
]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

part('stone.club', [
  { d: limb(0, 5, 2.2, 0, -12, 3.1), zone: 'wood' },
  { d: blob([-5.8, -11, -8, -19.8, -5.4, -28.4, 0.8, -31.4, 7.2, -27.6, 8.4, -19, 5.2, -10.4, 0, -8.6]), zone: 'wood' },
  { d: join(circle(-3.2, -22, 1.7), circle(3.2, -16.6, 1.4), circle(2.2, -26.4, 1.2), circle(-2.6, -14.6, 1)), zone: 'wood2', line: 0, shade: false, light: false },
]);
part('stone.sling', [
  { d: join(limb(0, 2, 1.1, -1, -14, 1.1)), zone: 'leather', line: 1.8 },
  { d: ellipse(-1.4, -16, 3.4, 2.6), zone: 'leather', line: 2 },
  { d: circle(-1.4, -17.4, 2.6), zone: 'stone', line: 2 },
]);
part('stone.spear', [
  { d: limb(0, 16, 1.7, 0, -30, 1.7), zone: 'wood' },
  { d: blob([0, -46, 4.4, -36.4, 2.4, -29.2, -2.4, -29.2, -4.4, -36.4], 0.5), zone: 'stone' },
  { d: join(rrect(-2.6, -31, 5.2, 3.6, 1.4)), zone: 'rope', line: 1.8 },
  { d: join(poly([2, -28, 6.6, -24, 5.4, -22.4, 1.8, -26])), zone: 'team', line: 1.6, banner: true },
]);
part('stone.drum', [
  { d: rrect(-9, -8, 18, 15, 3), zone: 'wood' },
  { d: ellipse(0, -8, 9, 3.6), zone: 'bone' },
  { d: join(poly([-9, -4, 9, 2, 9, 4, -9, -2]), poly([-9, 2, 9, -4, 9, -2, -9, 4])), zone: 'rope', line: 1.4, shade: false },
]);
part('stone.drumstick', [
  { d: limb(0, 4, 1.4, 0, -10, 1.4), zone: 'bone', line: 2 },
  { d: circle(0, -11.4, 2.8), zone: 'fur', line: 2 },
]);
part('stone.pouch', [{ d: blob([-4, -3, 4, -3, 5, 3, 0, 6, -5, 3]), zone: 'leather', line: 2.4 }]);
