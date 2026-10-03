/**
 * Stone Age parts (DESIGN A11 palette: stone brown, moss, bone, ochre accent). Authored in lu at
 * infantry scale with pivots at joints and grips; hand-held weapons point up (-y) from the grip.
 */
import { arcBand, blob, circle, ellipse, join, limb, poly, rect, rotate, rrect } from '../svg';
import { part } from './registry';
import { headLayers } from './shared';

// ---------------------------------------------------------------------------------------------
// Cave folk bodies

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

/** Slimmer tunic with a bone necklace (hunters and slingers). */
part('stone.torso.hunter', [
  { d: blob([-8, 2, -9.4, -8, -8.4, -17, -5, -21.4, 0.4, -22.6, 5.6, -21.4, 8.8, -16.6, 9.6, -7.6, 8.4, 2, 0.2, 3.2]), zone: 'skin' },
  {
    d: blob([-9, 0.6, -9.2, -9, -7.6, -15.6, 7.4, -15.6, 9.2, -8, 9.2, 1, 7.2, 5, 4.6, 1.8, 2, 5.4, -0.6, 1.8, -3.4, 5.4, -6, 1.8, -7.8, 5], 0.45),
    zone: 'team',
    banner: true,
  },
  { d: join(poly([-6.4, -16.6, 7, -16.6, 5.6, -14.8, -5, -14.8])), zone: 'fur', line: 2 },
  { d: join(poly([-2, -21, 0, -15.6, 2, -21]), poly([2.8, -20.6, 4.4, -15.4, 5.8, -20]), poly([-5.4, -20, -4, -15.2, -2.6, -20.6])), zone: 'bone', line: 1.4 },
]);

/** Hooded fur cloak for the shaman. */
part('stone.torso.shaman', [
  { d: blob([-9.6, 3, -10.8, -8, -9, -17.6, -4.8, -22, 1, -23, 6.6, -21.4, 10.2, -16, 11, -6, 10, 3.4, 0, 5]), zone: 'fur' },
  { d: blob([-7, 3, -6.8, -9, -3.6, -16, 4.2, -16.4, 7.8, -9.4, 8.4, 3.4, 4, 7, 0.6, 3.6, -3.2, 7], 0.6), zone: 'team', banner: true },
  { d: join(circle(-1, -14.6, 1.8), circle(3.4, -13, 1.8), circle(6.8, -10, 1.6)), zone: 'accent', line: 1.3 },
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
part('stone.hair.feather', [
  { d: blob([-12.4, -11, -11.8, -20.6, -5, -26, 3.6, -26.6, 10.2, -23, 12.2, -18, 7.2, -20.6, 0, -20.6, -6, -18, -9.6, -12]), zone: 'hair' },
  { d: rrect(-12.6, -19.6, 25.8, 3.4, 1.7), zone: 'team', banner: true, line: 2.4 },
  { d: blob([-9, -18, -14, -30, -12, -36, -8, -30, -6.6, -19], 0.7), zone: 'bone', line: 2 },
]);
part('stone.mask.skull', [
  { d: join(rrect(-11, -18, 3.4, 16, 1.7), rrect(-13.8, -16.6, 3, 13, 1.5)), zone: 'hair', line: 2 },
  { d: blob([-6, -26, 4, -28.4, 13.6, -23.4, 15.8, -13.6, 11.6, -8.6, 2, -9.6, -4, -13.6]), zone: 'bone' },
  { d: join(ellipse(5.2, -18, 2.6, 3), ellipse(11.2, -17.4, 2, 2.8)), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(blob([2, -27, -3, -32, -8, -40, -4, -40, 0, -34, 5.4, -28.4], 0.6), blob([9.6, -26, 12, -33, 10.6, -41, 14, -39.4, 14.6, -32, 12.6, -25], 0.6)), zone: 'bone', line: 2 },
]);
part('stone.beard.grey', [{ d: blob([2, -8.6, 12, -9.4, 13.4, -3.6, 9.6, 3.6, 4.4, 5.4, 0.4, 0.4], 0.8), zone: 'bone', line: 2.6 }]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

part('stone.club', [
  { d: limb(0, 5, 2.2, 0, -12, 3.1), zone: 'wood' },
  { d: blob([-5.8, -11, -8, -19.8, -5.4, -28.4, 0.8, -31.4, 7.2, -27.6, 8.4, -19, 5.2, -10.4, 0, -8.6]), zone: 'wood' },
  { d: join(circle(-3.2, -22, 1.7), circle(3.2, -16.6, 1.4), circle(2.2, -26.4, 1.2), circle(-2.6, -14.6, 1)), zone: 'wood2', line: 0, shade: false, light: false },
]);
part('stone.sling', [
  { d: join(limb(0, 2, 1.1, -1, -14, 1.1)), zone: 'leather', line: 1.8 },
  { d: ellipse(-1.4, -16, 3.6, 2.8), zone: 'leather', line: 2 },
  { d: circle(-1.4, -17.4, 2.8), zone: 'stone', line: 2 },
]);
part('stone.spear', [
  { d: limb(0, 18, 1.8, 0, -30, 1.8), zone: 'wood' },
  { d: blob([0, -48, 4.8, -37, 2.6, -29.6, -2.6, -29.6, -4.8, -37], 0.5), zone: 'stone' },
  { d: rrect(-2.8, -31.4, 5.6, 3.8, 1.4), zone: 'rope', line: 1.8 },
  { d: poly([2, -27.6, 8.4, -23.4, 2.2, -21.4]), zone: 'team', line: 1.6, banner: true },
]);
part('stone.drum', [
  { d: rrect(-9, -8, 18, 15, 3), zone: 'wood' },
  { d: ellipse(0, -8, 9, 3.6), zone: 'bone' },
  { d: join(poly([-9, -4, 9, 2, 9, 4, -9, -2]), poly([-9, 2, 9, -4, 9, -2, -9, 4])), zone: 'rope', line: 1.4, shade: false },
]);
part('stone.drumstick', [
  { d: limb(0, 4, 1.4, 0, -10, 1.4), zone: 'bone', line: 2 },
  { d: circle(0, -11.6, 3), zone: 'fur', line: 2 },
]);
part('stone.pouch', [{ d: blob([-4, -3, 4, -3, 5, 3, 0, 6, -5, 3]), zone: 'leather', line: 2.4 }]);
part('stone.pennant', [
  { d: limb(0, 0, 1.3, 0, -30, 1.3), zone: 'wood', line: 2.2 },
  { d: blob([0, -30, 14, -26, 9, -22, 13, -18, 0, -16], 0.3), zone: 'team', banner: true, line: 2.4 },
]);

// ---------------------------------------------------------------------------------------------
// Beasts: Tuskback (boar), Sabertooth, Mammoth

/** Chunky single-segment leg: pivot at the hip, sole at `len`. */
function beastLeg(id: string, len: number, r1: number, r2: number, zone: string, foot: 'hoof' | 'paw' | 'pillar'): string {
  const layers = [{ d: limb(0, 0, r1, 0, len - r2, r2), zone }];
  if (foot === 'hoof') layers.push({ d: rrect(-r2 - 0.4, len - 5, r2 * 2 + 1.6, 5, 1.6), zone: 'dark' });
  if (foot === 'paw') layers.push({ d: ellipse(r2 * 0.35, len - r2 * 0.6, r2 * 1.3, r2 * 0.75), zone });
  if (foot === 'pillar') layers.push({ d: join(ellipse(-r2 * 0.4, len - 1.8, 2.4, 1.6), ellipse(r2 * 0.25, len - 1.4, 2.4, 1.6), ellipse(r2 * 0.85, len - 1.8, 2.2, 1.5)), zone: 'bone' });
  return part(id, layers.map((l, i) => (i === 0 ? l : { ...l, line: 2.4 })));
}

beastLeg('stone.boar.leg.front', 30, 7.4, 5.6, 'fur', 'hoof');
beastLeg('stone.boar.leg.back', 30, 8.6, 5.6, 'fur', 'hoof');

part('stone.boar.body', [
  { d: blob([-23, -2, -20, -17, -9, -26, 7, -26, 19, -18, 24, -4, 21, 12, 9, 21, -8, 21, -20, 12]), zone: 'fur' },
  { d: blob([-16, 8, 0, 16, 16, 8, 10, 19, -10, 19], 0.8), zone: 'fur2', line: 0, shade: false, light: false },
  { d: blob([-15, -19, -3, -27.6, 11, -26, 17, -15, 12, -6, -2, -9, -14, -7], 0.8), zone: 'team', banner: true },
  { d: join(poly([-14, -8, -12, -3, -10, -8]), poly([-6, -9, -4, -4, -2, -9]), poly([2, -8, 4, -3, 6, -8]), poly([10, -7, 12, -2, 14, -7])), zone: 'team2', line: 1.4 },
]);
part('stone.boar.crest', [{ d: poly([-21, -12, -19, -22, -15, -17, -12, -28, -7, -20, -3, -30, 1, -22, 6, -31, 8, -23, 14, -27, 13, -19, 18, -20, 15, -12]), zone: 'hair' }]);
part('stone.boar.head', [
  { d: blob([-6, -12, 4, -17, 15, -13, 24, -6, 28, 1, 25, 7, 14, 9, 2, 8, -6, 3]), zone: 'fur' },
  { d: poly([0, -14, 2.4, -26, 10, -15]), zone: 'fur2' },
  { d: ellipse(27.6, 1.6, 3.8, 5), zone: 'snout' },
  { d: join(ellipse(28.2, 0, 0.9, 1.3), ellipse(28.4, 3.4, 0.9, 1.3)), zone: 'dark', line: 0, shade: false, light: false },
  { d: poly([10, -10, 19.4, -8.4, 19, -6.6, 10.6, -7.8]), zone: 'hair', line: 0, shade: false, light: false },
]);
part('stone.boar.jaw', [
  { d: blob([2, 4, 14, 5, 22, 7, 18, 12, 6, 11, 0, 8]), zone: 'fur2' },
  { d: blob([16, 6, 21, 1, 24, -9, 21.6, -11.4, 19.4, -3, 14, 4.6], 0.7), zone: 'bone', line: 2.4 },
]);
part('stone.boar.tail', [{ d: blob([0, 0, -6, -4, -9, 0, -6.4, 2, -4, -1], 0.8), zone: 'fur2', line: 2 }]);

beastLeg('stone.cat.leg.front', 22, 5.2, 4, 'fur', 'paw');
beastLeg('stone.cat.leg.back', 22, 6.6, 4, 'fur', 'paw');
part('stone.cat.body', [
  { d: blob([-18, -2, -15, -11, -4, -14, 8, -13, 16, -8, 18, 2, 13, 10, 0, 11, -14, 9]), zone: 'fur' },
  { d: blob([-12, 6, 0, 10, 12, 6, 8, 10, -8, 10], 0.8), zone: 'bone', line: 0, shade: false, light: false },
  { d: join(poly([-10, -12, -7, -4, -5, -12]), poly([-2, -13, 0, -5, 2, -13]), poly([6, -12, 7, -5, 9, -11])), zone: 'fur2', line: 0, shade: false, light: false },
  { d: blob([-13, -10, -2, -15.6, 9, -12, 7, -3, -4, -3, -12, -3], 0.7), zone: 'team', banner: true, line: 2.6 },
]);
part('stone.cat.head', [
  { d: blob([-4, -8, 3, -12, 11, -11, 17, -5, 19, 1, 15, 5, 6, 6, -2, 4, -5, -1]), zone: 'fur' },
  { d: join(poly([-1, -9, 0, -17, 6, -11]), poly([6, -11, 9, -17.6, 11.6, -10])), zone: 'fur' },
  { d: ellipse(16.6, 0.6, 3.2, 2.6), zone: 'bone', line: 2 },
  { d: circle(18.6, -0.6, 1.3), zone: 'dark', line: 0, shade: false, light: false },
  { d: poly([7, -7.8, 14.8, -6.4, 14.4, -4.8, 7.2, -6]), zone: 'hair', line: 0, shade: false, light: false },
]);
part('stone.cat.jaw', [
  { d: blob([2, 3, 12, 3.4, 16, 5.6, 12, 8.6, 3, 8], 0.8), zone: 'fur2' },
  { d: join(blob([12, 2, 15, 2, 14.4, 13, 13, 16, 12.2, 12], 0.6), blob([7, 2.6, 9.6, 2.6, 9, 9.6, 7.8, 11, 7.4, 8], 0.6)), zone: 'bone', line: 2 },
]);
part('stone.cat.tail', [{ d: blob([0, 0, -8, -6, -15, -12, -18, -10, -12, -4, -3, 3], 0.8), zone: 'fur', line: 2.6 }]);

beastLeg('stone.mammoth.leg.front', 56, 15, 13, 'fur', 'pillar');
beastLeg('stone.mammoth.leg.back', 56, 16, 13, 'fur', 'pillar');
part('stone.mammoth.body', [
  { d: blob([-50, 4, -48, -24, -34, -46, -8, -56, 20, -54, 42, -38, 50, -12, 46, 16, 28, 34, 0, 38, -28, 34, -44, 22]), zone: 'fur' },
  { d: join(poly([-44, 18, -40, 32, -36, 20, -30, 36, -26, 22, -18, 38, -14, 24, -6, 40, 0, 26, 8, 40, 12, 26, 20, 38, 24, 24, 32, 32, 34, 20]), poly([-48, -4, -54, 4, -46, 6])), zone: 'fur2', line: 2.6 },
  { d: blob([-36, -40, -14, -52, 14, -52, 32, -40, 36, -22, 14, -18, -12, -18, -34, -22], 0.6), zone: 'team', banner: true },
  { d: join(poly([-32, -24, -28, -14, -24, -24]), poly([-18, -20, -14, -10, -10, -20]), poly([-4, -19, 0, -9, 4, -19]), poly([10, -20, 14, -10, 18, -20]), poly([24, -22, 28, -12, 32, -22])), zone: 'accent', line: 1.6 },
]);
part('stone.mammoth.howdah', [
  { d: rrect(-30, -18, 50, 20, 5), zone: 'wood' },
  { d: join(rect(-30, -12, 50, 3), rect(-30, -4, 50, 3)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: join(limb(-26, -18, 1.8, -28, -40, 1.8), limb(16, -18, 1.8, 18, -40, 1.8)), zone: 'wood', line: 2.4 },
  { d: blob([-28, -40, -6, -44, 18, -40, 14, -34, -6, -37, -26, -34], 0.6), zone: 'hair' },
]);
part('stone.mammoth.head', [
  { d: blob([-10, -30, 4, -40, 20, -38, 32, -24, 36, -6, 30, 10, 16, 16, 0, 12, -10, 0]), zone: 'fur' },
  { d: blob([-6, -34, 4, -46, 16, -44, 22, -36, 12, -34, 2, -32], 0.7), zone: 'hair' },
  { d: blob([-6, -18, -16, -24, -20, -10, -14, 4, -4, 2], 0.7), zone: 'fur2' },
  { d: poly([14, -22, 28, -19, 27.4, -16.6, 14.6, -19]), zone: 'hair', line: 0, shade: false, light: false },
]);
part('stone.mammoth.trunk', [
  { d: blob([-4, -4, 6, -6, 10, 10, 10, 26, 16, 36, 12, 42, 4, 34, 2, 18, -4, 6], 0.8), zone: 'fur' },
  { d: join(rect(0, 12, 10, 1.6), rect(1, 20, 10, 1.6), rect(3, 28, 9, 1.6)), zone: 'fur2', line: 0, shade: false, light: false },
]);
part('stone.mammoth.tusk', [{ d: blob([0, 0, 6, 10, 18, 18, 32, 14, 40, 2, 36, 0, 30, 9, 18, 11, 8, 4, 4, -4], 0.7), zone: 'bone', line: 3 }]);
part('stone.mammoth.tail', [{ d: blob([0, 0, -6, 8, -8, 20, -4, 24, -2, 12, 3, 4], 0.7), zone: 'fur2', line: 2.4 }]);
/** A small slinger bust riding in the howdah. */
part('stone.mammoth.rider', [
  { d: blob([-7, 2, -8, -8, -5, -14, 5, -14, 8, -8, 7, 2], 0.7), zone: 'team', banner: true },
  { d: circle(1, -21, 8.6), zone: 'skin' },
  { d: blob([-8.6, -21, -7, -29, 0, -31.6, 7.6, -28.6, 9.4, -23, 4, -26.4, -3, -25, -6, -19]), zone: 'hair' },
  { d: join(ellipse(4.4, -21.6, 1.9, 2.4), ellipse(8.2, -21.8, 1.5, 2.1)), zone: 'eye', line: 1, shade: false, light: false },
  { d: join(circle(5.1, -21.2, 1.1), circle(8.7, -21.4, 0.9)), zone: 'pupil', line: 0, shade: false, light: false },
  { d: ellipse(9.4, -18.4, 1.8, 1.6), zone: 'skin', line: 1.6, light: false },
  { d: join(limb(6, -8, 2.4, 12, -22, 2), circle(12.4, -23.6, 2.8)), zone: 'skin', line: 2.2 },
]);

// ---------------------------------------------------------------------------------------------
// Training Dummy (tutorial only)

part('stone.dummy.torso', [
  { d: blob([-9, 2, -10, -9, -8, -18, -3, -22, 4, -22, 9, -18, 10.6, -8, 9.4, 2, 0, 4]), zone: 'straw' },
  { d: join(poly([-9, -6, 9.8, -9, 10, -6.6, -9, -3.6]), poly([-9, -14, 9.4, -16.4, 9.2, -14, -8.6, -11.6])), zone: 'rope', line: 1.4, shade: false },
  { d: circle(3, -11, 7), zone: 'bone', line: 2 },
  { d: circle(3, -11, 4.8), zone: 'team', line: 1.4, shade: false, light: false, banner: true },
  { d: circle(3, -11, 1.2), zone: 'bone', line: 0, shade: false, light: false },
]);
part('stone.dummy.head', [
  { d: blob([-10.4, -8, -9.6, -19.6, -2, -25, 7, -24, 12.4, -16.6, 12, -6, 6, -0.6, -4, -0.6]), zone: 'sack' },
  { d: join(poly([2.4, -16.4, 7.4, -11, 6.4, -10, 1.4, -15.4]), poly([6.4, -16.4, 7.4, -15.4, 2.4, -10, 1.4, -11])), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(poly([8.2, -15.6, 11.8, -12, 11.2, -11.2, 7.6, -14.8]), poly([11.2, -15.6, 11.8, -14.8, 8.2, -11.2, 7.6, -12])), zone: 'dark', line: 0, shade: false, light: false },
  { d: blob([3, -6.4, 7, -5, 11, -6.4, 10.4, -5, 7, -3.8, 3.4, -5], 0.6), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(poly([-2, -24, -6, -31, -1, -26]), poly([2, -25, 2, -33, 5, -25.6]), poly([6, -24.6, 10, -31, 9, -23])), zone: 'straw', line: 1.8 },
]);
part('stone.dummy.scarf', [{ d: blob([-10, -3, 11, -4, 12, 4, 3, 4, -1, 16, -7, 15, -4, 4, -10, 4], 0.5), zone: 'team', banner: true, line: 2.6 }]);
part('stone.dummy.sword', [
  { d: limb(0, 4, 1.8, 0, -4, 1.8), zone: 'wood2', line: 2 },
  { d: rrect(-5, -6, 10, 3, 1.4), zone: 'wood2', line: 2 },
  { d: blob([-2.6, -6, 2.6, -6, 2.6, -24, 0, -28, -2.6, -24], 0.4), zone: 'wood' },
]);
part('stone.dummy.post', [{ d: join(limb(0, 0, 2.6, 0, 16, 2.2), rrect(-7, 14, 14, 3, 1.5)), zone: 'wood', line: 2.6 }]);

// ---------------------------------------------------------------------------------------------
// Turrets (pivot at the mount point; see rigs/turret.ts)

part('stone.turret.frame', [
  { d: poly([-18, 0, -14, -18, 14, -18, 18, 0]), zone: 'wood' },
  { d: join(limb(-14, -2, 2.4, 12, -16, 2.4), limb(14, -2, 2.4, -12, -16, 2.4)), zone: 'wood2', line: 2.2 },
  { d: rrect(-20, -3, 40, 5, 2.4), zone: 'stone' },
  { d: circle(0, -20, 5), zone: 'rope', line: 2.4 },
]);
part('stone.turret.catapultArm', [
  { d: limb(0, 0, 3, -30, -2, 2.4), zone: 'wood' },
  { d: blob([-40, -8, -32, -12, -25, -8, -25, 2, -33, 6, -40, 2], 0.7), zone: 'leather' },
  { d: circle(-33, -4, 5.4), zone: 'stone' },
]);
part('stone.turret.flag', [
  { d: limb(0, 0, 1.3, 0, -26, 1.3), zone: 'wood', line: 2.2 },
  { d: blob([0, -26, 12, -23, 8, -20, 12, -16, 0, -14], 0.3), zone: 'team', banner: true, line: 2.2 },
]);
part('stone.turret.stump', [
  { d: blob([-15, 0, -13, -18, -8, -22, 8, -22, 13, -18, 15, 0], 0.5), zone: 'wood' },
  { d: ellipse(0, -21, 10, 3.4), zone: 'wood2', shade: false },
  { d: join(arcBand(0, -21, 4.6, 5.8, 200, 340), arcBand(0, -21, 1.6, 2.6, 200, 340)), zone: 'wood', line: 0, shade: false, light: false },
]);
part('stone.turret.hive', [
  { d: blob([-15, -2, -16, -16, -11, -28, 0, -34, 11, -28, 16, -16, 15, -2, 0, 2]), zone: 'hive' },
  { d: join(rect(-15, -9, 30, 2.2), rect(-15.4, -17, 31, 2.2), rect(-12, -25, 24, 2.2)), zone: 'hive2', line: 0, shade: false, light: false },
  { d: ellipse(4, -10, 5, 4), zone: 'dark', line: 2 },
  { d: join(poly([-7, -22, -1, -19, -1.6, -17.6, -7.4, -20.4]), poly([7, -22, 1.4, -19, 2, -17.6, 7.4, -20.4])), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(ellipse(-4, -16.2, 2, 2), ellipse(4, -16.2, 2, 2)), zone: 'eye', line: 1.2, shade: false, light: false },
]);
part('stone.turret.bee', [
  { d: ellipse(0, 0, 3.4, 2.4), zone: 'hive', line: 1.2 },
  { d: rect(-0.8, -2.2, 1.6, 4.4), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(ellipse(-1, -3.4, 2, 1.4), ellipse(1.4, -3.2, 1.8, 1.3)), zone: 'white', line: 1, alpha: 0.9, shade: false, light: false },
]);
part('stone.turret.ramp', [
  { d: poly([-20, 0, -20, -8, 18, -26, 22, -26, 22, 0]), zone: 'wood' },
  { d: join(limb(-16, -4, 1.4, 18, -21, 1.4), limb(-8, -2, 1.4, 20, -15, 1.4)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: rrect(-22, -3, 46, 5, 2.4), zone: 'stone' },
]);
part('stone.turret.log', [
  { d: rrect(-14, -6, 28, 12, 6), zone: 'wood' },
  { d: ellipse(14, 0, 3.4, 6), zone: 'wood2' },
  { d: join(arcBand(14, 0, 1.2, 2, 0, 360)), zone: 'wood', line: 0, shade: false, light: false },
]);
part('stone.turret.toad', [
  { d: blob([-16, -2, -17, -14, -10, -22, 2, -24, 13, -20, 18, -12, 16, -2, 0, 1]), zone: 'toad' },
  { d: blob([-10, -2, 0, -9, 12, -5, 12, -1, 0, 0], 0.7), zone: 'bone', line: 0, shade: false, light: false },
  { d: join(circle(-5, -23, 5), circle(7, -24, 5.4)), zone: 'toad' },
  { d: join(circle(-4.4, -23.4, 3), circle(7.8, -24.6, 3.3)), zone: 'eye', line: 1.2, shade: false, light: false },
  { d: join(circle(-3.4, -23, 1.6), circle(9, -24.2, 1.8)), zone: 'pupil', line: 0, shade: false, light: false },
  { d: join(poly([-8.4, -27, -1, -25.6, -1, -24.2, -8.4, -25.4]), poly([3, -26.6, 12.4, -28.6, 12.6, -27, 3, -25.2])), zone: 'toad2', line: 0, shade: false, light: false },
  { d: join(circle(-12, -12, 1.6), circle(-6, -8, 1.3), circle(10, -14, 1.4)), zone: 'toad2', line: 0, shade: false, light: false },
]);
part('stone.turret.toadMouth', [{ d: blob([0, -2, 14, -3.4, 17, -1, 14, 2, 0, 1], 0.6), zone: 'toad2', line: 2 }]);

// ---------------------------------------------------------------------------------------------
// Cave Hold (base.stone). Origin at the gate on the ground, extending back to x = -150.

part('stone.base.rock', [
  { d: blob([-150, 0, -152, -60, -140, -130, -118, -190, -88, -222, -52, -230, -22, -210, -8, -160, -4, -90, 0, 0], 0.7), zone: 'stone' },
  { d: blob([-140, -20, -132, -90, -108, -150, -90, -120, -110, -70, -122, -20], 0.7), zone: 'stone2', line: 0, shade: false, light: false },
  { d: blob([-70, -200, -44, -214, -28, -180, -40, -150, -64, -166], 0.7), zone: 'stone2', line: 0, shade: false, light: false },
  { d: blob([-120, -176, -96, -212, -60, -228, -28, -216, -16, -196, -44, -200, -80, -196, -104, -176], 0.7), zone: 'moss', line: 2.6 },
]);
part('stone.base.cave', [
  { d: blob([-112, 0, -114, -40, -96, -70, -66, -74, -46, -52, -40, 0], 0.7), zone: 'dark' },
  { d: blob([-100, 0, -98, -32, -84, -50, -66, -52, -54, -34, -54, 0], 0.7), zone: 'fire' },
  { d: join(blob([-86, 0, -84, -14, -76, -28, -70, -16, -66, 0], 0.6)), zone: 'white', line: 0, alpha: 0.7, shade: false, light: false },
]);
part('stone.base.palisade', [
  {
    d: join(
      poly([-40, 0, -40, -46, -36, -54, -32, -46, -32, 0]),
      poly([-30, 0, -30, -52, -26, -60, -22, -52, -22, 0]),
      poly([-20, 0, -20, -48, -16, -56, -12, -48, -12, 0]),
      poly([-10, 0, -10, -54, -6, -62, -2, -54, -2, 0]),
    ),
    zone: 'wood',
  },
  { d: join(rect(-42, -34, 42, 4), rect(-42, -16, 42, 4)), zone: 'rope', line: 2 },
]);
part('stone.base.ledge', [
  { d: blob([-20, 0, -18, -6, 12, -8, 18, -4, 16, 2, -16, 4], 0.6), zone: 'stone' },
  { d: join(limb(-12, 2, 2, -16, 16, 1.6), limb(8, 2, 2, 4, 16, 1.6)), zone: 'wood', line: 2.2 },
]);
part('stone.base.skull', [
  { d: blob([-6, 0, -7, -8, 0, -12, 7, -8, 6, 0, 3, 3, -3, 3]), zone: 'bone', line: 2.4 },
  { d: join(circle(-2.6, -5.6, 1.8), circle(2.8, -5.6, 1.8), rect(-2, 0, 4, 1.4)), zone: 'dark', line: 0, shade: false, light: false },
]);
part('stone.base.torch', [
  { d: limb(0, 0, 1.6, 0, -18, 2), zone: 'wood', line: 2 },
  { d: blob([-4, -18, -3, -26, 0, -32, 3, -26, 4, -18], 0.6), zone: 'fire', line: 1.6 },
  { d: blob([-1.6, -19, 0, -26, 1.6, -19], 0.6), zone: 'white', line: 0, alpha: 0.8, shade: false, light: false },
]);
part('stone.base.banner', [
  { d: limb(0, 0, 1.6, 0, -44, 1.6), zone: 'wood', line: 2.2 },
  { d: blob([0, -44, 22, -40, 16, -34, 22, -28, 0, -24], 0.3), zone: 'team', banner: true, line: 2.6 },
  { d: circle(8, -34, 3.6), zone: 'bone', line: 1.6, shade: false },
]);
part('stone.base.crack1', [{ d: join(poly([-90, -150, -80, -130, -84, -110, -78, -96, -82, -94, -88, -112, -84, -130, -94, -148])), zone: 'dark', line: 0, shade: false, light: false }]);
part('stone.base.crack2', [
  { d: join(poly([-40, -120, -30, -100, -36, -80, -28, -64, -32, -62, -40, -80, -34, -100, -44, -118]), poly([-130, -70, -118, -60, -122, -44, -126, -44, -122, -58, -134, -66])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('stone.base.chunk', [{ d: blob([-60, -228, -40, -232, -26, -212, -46, -206], 0.6), zone: 'stone' }]);
part('stone.base.rubble', [
  { d: join(blob([-30, 0, -26, -10, -16, -12, -10, -4, -12, 0], 0.6), blob([-58, 0, -52, -8, -44, -6, -42, 0], 0.6), blob([-8, 0, -4, -6, 4, -5, 6, 0], 0.6)), zone: 'stone2' },
]);
part('stone.base.treasury1', [
  { d: blob([-12, 0, -13, -10, 0, -14, 13, -10, 12, 0], 0.6), zone: 'wood' },
  { d: join(circle(-5, -14, 3.4), circle(1, -16, 3.4), circle(6, -13, 3.2), circle(-1, -12, 3)), zone: 'berry', line: 1.6 },
]);
part('stone.base.treasury2', [
  { d: join(limb(-12, 0, 1.4, -10, -24, 1.4), limb(12, 0, 1.4, 10, -24, 1.4), limb(-11, -22, 1.2, 11, -22, 1.2)), zone: 'wood', line: 2 },
  { d: join(rrect(-8, -22, 4, 14, 2), rrect(-1, -22, 4, 16, 2), rrect(6, -22, 4, 12, 2)), zone: 'meat', line: 1.6 },
]);
part('stone.base.treasury3', [
  { d: poly([-20, 0, 0, -34, 20, 0]), zone: 'fur' },
  { d: join(poly([-20, 0, -10, -16, -4, 0]), poly([4, 0, 10, -16, 20, 0])), zone: 'fur2', line: 0, shade: false, light: false },
  { d: poly([-5, 0, 0, -12, 5, 0]), zone: 'dark', line: 2 },
  { d: join(limb(-3, -30, 1.2, -8, -40, 1.2), limb(3, -30, 1.2, 8, -40, 1.2)), zone: 'wood', line: 2 },
]);
part('stone.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);

// X0 Stone wave: a team-dyed hide blanket and collar for the procedural wolves and pup (A11 team share).
// Body-local like stone.cat.body (size it with the body).
part('stone.wolf.collar', [
  { d: blob([-15, -8, -12, -14, -2, -16.4, 8, -15, 12, -10, 9, 1, 0, 3, -10, 2, -15, -2], 0.8), zone: 'team', banner: true, line: 2 },
  { d: rotate(rrect(10.6, -12, 6.4, 19, 3), -14), zone: 'team', banner: true, line: 2 },
  { d: join(circle(-9, -1.2, 1.4), circle(-2, 0.6, 1.4), circle(5, -0.4, 1.4)), zone: 'bone', line: 0.8 },
]);
// X0 Stone wave: the Elk Chieftain's broad antlers (head-local, like stone.cat.head).
part('stone.elk.antlers', [
  {
    d: join(
      limb(2, -10, 1.8, -4, -26, 1.4), limb(-3, -20, 1.2, -12, -26, 0.9), limb(-4, -26, 1.3, -1, -38, 0.8), limb(-4, -26, 1.1, -11, -36, 0.7),
      limb(8, -11, 1.7, 12, -27, 1.3), limb(11, -20, 1.1, 19, -26, 0.8), limb(12, -27, 1.2, 9, -38, 0.7), limb(12, -27, 1, 18, -35, 0.6),
    ),
    zone: 'bone',
    line: 1.8,
  },
]);
/** A team leg wrap for the procedural wolves and pup (leg-local, origin at the hip). */
part('stone.wolf.legband', [{ d: rrect(-5.6, 5, 11.2, 7, 2.4), zone: 'team', line: 1.6 }]);
