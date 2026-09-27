/**
 * Modern Age parts (DESIGN A11 palette: olive, khaki, gunmetal, signal red-violet accent). Authored
 * in lu at infantry scale with pivots at joints and grips; hand-held weapons point up (-y) from the
 * grip. Team colour sits on scarves, armbands, roundels, stripes and flags.
 */
import { arcBand, blob, circle, ellipse, join, limb, ngon, poly, rect, rrect, star } from '../svg';
import { part } from './registry';
import { headLayers, hipsShape, torsoShape } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** Khaki tunic with webbing, a team armband-width chest panel and pockets. */
part('modern.torso.tunic', [
  { d: torsoShape(1.04), zone: 'cloth2' },
  { d: blob([-9.6, -7, -10.4, -16, -6, -21, 0, -22.4, 6, -21, 10, -15, 10.6, -7, 0, -8.6], 0.8), zone: 'team', banner: true },
  { d: join(limb(-6.6, -20, 1.2, 4, 1, 1.2), rrect(-10, -3.6, 21, 3, 1.4)), zone: 'leather', line: 1.6 },
  { d: join(rrect(2, -6, 6, 5, 1.2), rrect(-8, -6, 5, 5, 1.2)), zone: 'cloth2', line: 1.4, shade: false },
]);
/** Olive field jacket with a team scarf (Rifleman, Bazooka Trooper). */
part('modern.torso.jacket', [
  { d: torsoShape(1.04), zone: 'cloth' },
  { d: join(rrect(2, -14, 7, 6, 1.4), rrect(2, -6, 7, 5, 1.2)), zone: 'cloth', line: 1.4, shade: false },
  { d: join(limb(-7, -20, 1.2, 6, 2, 1.2), rrect(-10, -3.6, 21, 3, 1.4)), zone: 'leather', line: 1.6 },
  { d: blob([-7.4, -21, 0, -24, 8.4, -21.6, 8, -17, 2, -17.6, 4, -10, 0, -9, -1, -17, -7, -17], 0.7), zone: 'team', banner: true },
]);
/** Leather flight jacket (Radio Operator) with a team armband panel. */
part('modern.torso.radio', [
  { d: torsoShape(1.04), zone: 'cloth' },
  { d: blob([-10.4, -8, -10, -16, -6, -20, -2, -18, -3, -8], 0.7), zone: 'team', banner: true },
  { d: join(limb(-6, -20, 1.4, -6, 1, 1.4), rrect(-10, -3.6, 21, 3, 1.4)), zone: 'leather', line: 1.6 },
  { d: rrect(3, -14, 6, 8, 1.4), zone: 'cloth2', line: 1.4 },
]);
/** Upper arm with a team armband (every Modern soldier wears one). */
part('modern.arm.band', [
  { d: limb(0, 0, 4.4, 0, 8.6, 3.8), zone: 'sleeve' },
  { d: rrect(-4.6, 1.2, 9.2, 4.4, 1.6), zone: 'team', banner: true, line: 1.6 },
]);
part('modern.pelvis.trousers', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: rrect(-10, -4.8, 20.4, 3.2, 1.6), zone: 'leather', line: 2 },
  { d: rrect(4.6, -5, 3.6, 3.6, 0.8), zone: 'metal', line: 1, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Heads and headgear

part('modern.head.tommy', headLayers({ nose: 'round', brow: 'angry', mouth: 'teeth' }));
part('modern.head.rifle', headLayers({ nose: 'pointy', brow: 'calm', mouth: 'flat' }));
part('modern.head.bazooka', headLayers({ nose: 'big', brow: 'angry', mouth: 'grin', jaw: 1.6 }));
part('modern.head.radio', headLayers({ nose: 'button', brow: 'worried', mouth: 'o' }));

/** Brodie helmet: wide shallow dish (Trench Raider). */
part('modern.helmet.brodie', [
  { d: blob([-15, -18, -11, -22, -8, -28, 2, -30.6, 11, -27.6, 14, -22, 17, -18, 10, -16.4, 0, -16.8, -10, -16.4], 0.7), zone: 'cloth' },
  { d: blob([-10.6, -21, -8.6, -25.4, 11.6, -25.6, 13.6, -21], 0.5), zone: 'team', banner: true, line: 1.6 },
  { d: rrect(-15.6, -19.4, 33.2, 3, 1.5), zone: 'cloth3', line: 2 },
]);
/** Steel helmet with netting and a team band (Rifleman). */
part('modern.helmet.net', [
  { d: blob([-14, -12, -14.4, -21, -9, -28, 2, -30.6, 11, -27, 15, -20, 15.4, -14, 2, -16, -10, -12], 0.8), zone: 'cloth' },
  { d: join(poly([-10, -24, 10, -18, 10, -16.6, -10, -22.6]), poly([-12, -18, 8, -27, 9, -25.6, -11, -16.6]), poly([-4, -29, 12, -21, 12, -19.6, -4, -27.6])), zone: 'cloth3', line: 0, shade: false, light: false },
  { d: rrect(-14.6, -17.6, 30, 3.2, 1.6), zone: 'team', banner: true, line: 1.8 },
]);
/** Helmet with goggles pushed up (Bazooka Trooper). */
part('modern.helmet.goggles', [
  { d: blob([-13.6, -13, -14, -21, -9, -28, 2, -30.6, 11, -27, 15, -20, 15, -15, 2, -17, -10, -13], 0.8), zone: 'cloth' },
  { d: rrect(-14.2, -17.6, 29.6, 3.4, 1.6), zone: 'team', banner: true, line: 1.8 },
  { d: join(ellipse(2, -24, 4.4, 3.6), ellipse(10, -22, 3.8, 3.4)), zone: 'lens', line: 2 },
]);
/** Side cap and headphones (Radio Operator). */
part('modern.cap.radio', [
  { d: blob([-12, -19, -9, -26, 2, -28.6, 12, -25, 13, -20, 0, -21.6], 0.7), zone: 'cloth' },
  { d: arcBand(-1, -14, 12.4, 14.6, 200, 340), zone: 'metal2', line: 1.4 },
  { d: rrect(-6.6, -17.6, 6, 9, 2.6), zone: 'metal2', line: 1.8 },
]);
part('modern.scarf', [{ d: blob([-12, -2, -18, 2, -20, 10, -16, 9, -14, 4, -9, 3], 0.7), zone: 'team', banner: true, line: 2 }]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

/** Trench club: a short spiked cudgel. */
part('modern.club', [
  { d: limb(0, 5, 1.6, 0, -10, 2), zone: 'wood' },
  { d: blob([-4, -9, -4.6, -24, 0, -28, 4.6, -24, 4, -9], 0.7), zone: 'wood' },
  { d: join(rect(-4.6, -22, 9.2, 1.6), rect(-4.6, -15, 9.2, 1.6)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(poly([-4.6, -20, -8, -19, -4.6, -17]), poly([4.6, -20, 8, -19, 4.6, -17]), poly([-4.4, -13, -7.6, -12, -4.4, -10]), poly([4.4, -13, 7.6, -12, 4.4, -10])), zone: 'metal', line: 1 },
]);
/** Bolt-action rifle: the barrel points up from the grip at the stock's wrist. */
part('modern.rifle', [
  { d: blob([-2.6, 14, 2.4, 14, 3, 4, 2, -6, -1.2, -6, -2.4, 4], 0.6), zone: 'wood' },
  { d: rrect(-1, -38, 2, 34, 1), zone: 'metal2', line: 1.8 },
  { d: rrect(-1.6, -24, 3.2, 20, 1.4), zone: 'wood', line: 1.6 },
  { d: limb(2, -4, 0.7, 4.6, -1, 0.9), zone: 'metal2', line: 1.2 },
  { d: rrect(-1.6, -41, 3.2, 3.4, 1), zone: 'metal2', line: 1.2 },
]);
/** Bazooka: a long tube resting on the shoulder (grip in the middle, pointing up = forward). */
part('modern.bazooka', [
  { d: rrect(-3.4, -30, 6.8, 44, 3.4), zone: 'cloth' },
  { d: join(rect(-3.4, -24, 6.8, 5), rect(-3.4, 4, 6.8, 5)), zone: 'team', banner: true, line: 0, shade: false },
  { d: join(rrect(-4.2, -32, 8.4, 5, 2), rrect(-4.2, 10, 8.4, 5, 2)), zone: 'metal2', line: 2 },
  { d: join(rect(-3.4, -12, 6.8, 2), rect(-3.4, 0, 6.8, 2)), zone: 'accent', line: 0, shade: false, light: false },
  { d: join(rrect(2.4, -6, 5, 3, 1.2), rrect(3, -4, 2.6, 6, 1)), zone: 'metal2', line: 1.4 },
]);
/** Carbine (Radio Operator). */
part('modern.carbine', [
  { d: blob([-2.4, 10, 2.2, 10, 2.8, 2, 1.8, -5, -1, -5, -2.2, 2], 0.6), zone: 'wood' },
  { d: rrect(-1, -26, 2, 22, 1), zone: 'metal2', line: 1.6 },
  { d: rrect(-1.5, -16, 3, 12, 1.4), zone: 'wood', line: 1.4 },
]);
/** Radio backpack: the antenna is its own part on the `antenna` bone. */
part('modern.radio.pack', [
  { d: rrect(-7, -10, 13, 20, 2.4), zone: 'cloth3' },
  { d: rect(-7, -1, 13, 4), zone: 'team', banner: true, line: 1.2, shade: false },
  { d: join(rrect(-5, -7, 9, 5, 1.4)), zone: 'cloth', line: 1.4 },
  { d: join(circle(-2.4, 4, 1.8), circle(2.4, 4, 1.8)), zone: 'metal', line: 1, shade: false },
  { d: circle(3.4, -8, 1.2), zone: 'accent', line: 0.8, shade: false, light: false },
]);
part('modern.radio.antenna', [
  { d: limb(0, 0, 0.9, 0, -36, 0.6), zone: 'metal', line: 1.2 },
  { d: circle(0, -37, 1.8), zone: 'accent', line: 1, shade: false, light: false },
]);
part('modern.radio.handset', [
  { d: rrect(-1.8, -9, 3.6, 13, 1.6), zone: 'cloth3', line: 1.6 },
  { d: join(rrect(-3, -11, 6, 4, 1.6), rrect(-3, 2, 6, 4, 1.6)), zone: 'cloth3', line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Tankette (vehicle rig: hull, road wheels, tread teeth, turret, barrel)

part('modern.tank.tread', [
  { d: rrect(-30, -18, 60, 18, 9), zone: 'metal2' },
  { d: rrect(-26.6, -14.6, 53.2, 11.2, 5.6), zone: 'cloth3', line: 1.4, shade: false },
]);
/** Tread teeth: a strip that scrolls with the `treadTeeth` bone (wraps every 8 lu). */
part('modern.tank.teeth', [{ d: join(...[-20, -12, -4, 4, 12, 20].map((x) => rect(x, -1.4, 4, 2.8))), zone: 'metal', line: 0.8, shade: false, light: false }]);
part('modern.tank.roadwheel', [
  { d: circle(0, 0, 5.4), zone: 'cloth' },
  { d: circle(0, 0, 1.8), zone: 'metal2', line: 1, shade: false },
]);
part('modern.tank.hull', [
  { d: blob([-30, -16, -29, -34, -19, -44, 18, -44, 30, -30, 32, -16], 0.5), zone: 'cloth' },
  { d: join(circle(-22, -22, 1), circle(-11, -22, 1), circle(0, -22, 1), circle(11, -22, 1), circle(22, -22, 1)), zone: 'cloth3', line: 0, shade: false, light: false },
  { d: circle(-8, -30, 7.4), zone: 'team', banner: true, line: 1.8 },
  { d: circle(-8, -30, 3), zone: 'cloth2', line: 1, shade: false, light: false },
  { d: rrect(10, -41, 12, 4, 1.4), zone: 'cloth3', line: 1.4 },
]);
/** Turret (pivot on the hull roof), pointing +x. */
part('modern.tank.turret', [
  { d: blob([-16, 0, -14, -14, -6, -20, 10, -20, 17, -12, 18, 0], 0.5), zone: 'cloth' },
  { d: rrect(-12, -8, 22, 3.4, 1.2), zone: 'team', banner: true, line: 1.2, shade: false },
  { d: rrect(-8, -24, 12, 5, 2), zone: 'cloth3', line: 1.8 },
]);
part('modern.tank.gun', [
  { d: rrect(0, -2.6, 26, 5.2, 2), zone: 'cloth3' },
  { d: rrect(22, -3.6, 6, 7.2, 2), zone: 'metal2', line: 1.6 },
  { d: rrect(-2, -4, 6, 8, 2), zone: 'cloth', line: 1.6 },
]);
/** Commander bust in the hatch (helmet, team scarf). */
part('modern.tank.commander', [
  { d: blob([-7, 6, -8, -4, -5, -10, 6, -10, 8, -4, 7, 6], 0.7), zone: 'cloth2' },
  { d: blob([-6, -8, 0, -11, 7, -8, 6, -5, 0, -7, -5, -5], 0.7), zone: 'team', banner: true, line: 1.6 },
  { d: circle(1, -17, 7.4), zone: 'skin' },
  { d: blob([-8, -18, -7, -25, 1, -28, 9, -25, 10, -19, 1, -20.6], 0.7), zone: 'leather', line: 2 },
  { d: join(ellipse(2, -21, 3, 2.4), ellipse(7.4, -20.6, 2.6, 2.2)), zone: 'lens', line: 1.4, shade: false },
  { d: rrect(4, -14, 5, 1.4, 0.7), zone: 'mouth', line: 0, shade: false, light: false },
  { d: ellipse(9, -16.4, 1.8, 1.6), zone: 'skin', line: 1.4, light: false },
]);
part('modern.tank.antenna', [{ d: limb(0, 0, 0.8, -4, -34, 0.5), zone: 'metal', line: 1.2 }]);
part('modern.tank.flag', [
  { d: limb(0, 0, 0.9, 0, -30, 0.7), zone: 'metal', line: 1.4 },
  { d: blob([0, -30, 12, -28, 12, -21, 0, -20], 0.3), zone: 'team', banner: true, line: 1.8 },
]);

// ---------------------------------------------------------------------------------------------
// Behemoth Tank (a rhomboid landship with a top turret and a front MG sponson)

part('modern.behemoth.tracks', [
  { d: poly([-50, -14, -44, -6, -28, 0, 28, 0, 48, -8, 53, -30, 40, -58, -37, -58, -53, -34]), zone: 'metal2' },
  { d: poly([-44, -16, -37, -8, -26, -5, 26, -5, 42, -12, 46, -30, 37, -52, -33, -52, -46, -34]), zone: 'cloth3', line: 1.6, shade: false },
]);
part('modern.behemoth.teeth', [{ d: join(...[-32, -24, -16, -8, 0, 8, 16, 24, 32].map((x) => rect(x, -1.4, 4, 2.8))), zone: 'metal', line: 0.8, shade: false, light: false }]);
part('modern.behemoth.flag', [
  { d: limb(0, 0, 1, 0, -46, 0.8), zone: 'metal', line: 1.4 },
  { d: blob([0, -46, 16, -44, 16, -34, 0, -33], 0.3), zone: 'team', banner: true, line: 2 },
]);
part('modern.behemoth.hull', [
  { d: blob([-41, -18, -43, -44, -34, -62, 34, -62, 45, -44, 43, -18, 28, -12, -28, -12], 0.5), zone: 'cloth' },
  { d: join(rect(-40, -50, 84, 2.4), rect(-42, -26, 86, 2.4)), zone: 'cloth3', line: 0, shade: false, light: false },
  { d: join(...[-34, -20, -6, 8, 22, 36].map((x) => circle(x, -56, 1.2)), ...[-34, -20, -6, 8, 22, 36].map((x) => circle(x, -20, 1.2))), zone: 'cloth3', line: 0, shade: false, light: false },
  { d: join(circle(-18, -38, 9.6)), zone: 'team', banner: true, line: 2 },
  { d: join(rect(8, -44, 30, 4), rect(8, -34, 30, 4)), zone: 'team', banner: true, line: 1.6 },
  { d: join(circle(-18, -38, 4), rect(-40, -34, 12, 3), rect(-8, -34, 12, 3)), zone: 'cloth2', line: 1, shade: false, light: false },
]);
/** Raised casemate between the hull and the turret (pivot on the hull roof centre). */
part('modern.behemoth.deck', [
  { d: poly([-34, 0, -30, -36, 32, -36, 38, 0]), zone: 'cloth' },
  { d: join(rrect(-22, -26, 12, 7, 2), rrect(-4, -26, 12, 7, 2), rrect(14, -26, 12, 7, 2)), zone: 'dark', line: 1.6 },
  { d: rect(-32, -10, 68, 3), zone: 'team', banner: true, line: 1.2, shade: false },
  { d: join(...[-26, -12, 2, 16, 30].map((x) => circle(x, -4, 1.1))), zone: 'cloth3', line: 0, shade: false, light: false },
]);
part('modern.behemoth.sponson', [
  { d: blob([-12, -12, 6, -14, 12, -6, 10, 6, -10, 8, -14, -2], 0.6), zone: 'cloth' },
  { d: join(circle(-6, -2, 1), circle(4, -9, 1)), zone: 'cloth3', line: 0, shade: false, light: false },
]);
part('modern.behemoth.mgun', [{ d: rrect(0, -2, 16, 4, 1.6), zone: 'metal2', line: 1.6 }]);
part('modern.behemoth.turret', [
  { d: blob([-26, 0, -24, -16, -14, -26, 16, -26, 28, -16, 30, 0], 0.5), zone: 'cloth' },
  { d: rrect(-20, -12, 40, 4, 1.4), zone: 'team', banner: true, line: 1.4, shade: false },
  { d: rrect(-14, -32, 16, 7, 3), zone: 'cloth3', line: 1.8 },
]);
part('modern.behemoth.gun', [
  { d: rrect(0, -3.6, 52, 7.2, 3), zone: 'cloth3' },
  { d: rrect(46, -5, 10, 10, 2.4), zone: 'metal2', line: 1.8 },
  { d: rrect(-4, -6, 10, 12, 3), zone: 'cloth', line: 1.6 },
]);
part('modern.behemoth.stack', [
  { d: join(rrect(-3, -24, 6, 24, 2), rrect(5, -18, 5, 18, 2)), zone: 'metal2', line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Gyrocopter (flyer rig: body, rotor, prop, barrel)

part('modern.gyro.body', [
  { d: blob([-24, -4, -18, -12, 0, -14, 16, -12, 24, -6, 26, 2, 18, 8, -10, 8, -21, 4], 0.7), zone: 'cloth' },
  { d: blob([-27, -16, -21, -18, -18, -4, -24, -2], 0.6), zone: 'cloth' },
  { d: blob([-27, -16, -22, -17, -20.6, -8, -25, -7], 0.6), zone: 'team', banner: true, line: 1.6 },
  { d: circle(4, 0, 5.4), zone: 'team', banner: true, line: 1.6 },
  { d: circle(4, 0, 2.2), zone: 'cloth2', line: 0.8, shade: false, light: false },
  { d: join(limb(-4, 8, 1, -10, 16, 1), limb(14, 8, 1, 18, 16, 1), rrect(-16, 15, 40, 2.4, 1.2)), zone: 'metal2', line: 1.6 },
]);
part('modern.gyro.mast', [{ d: join(limb(0, 0, 1.4, 0, -18, 1.2), rrect(-3, -20, 6, 4, 1.6)), zone: 'metal2', line: 1.8 }]);
/** Rotor blades (spinRotor squashes them in x to fake the spin). */
part('modern.gyro.rotor', [{ d: join(rrect(-36, -1.4, 72, 2.8, 1.4)), zone: 'metal2', line: 1.4 }]);
part('modern.gyro.prop', [{ d: rrect(-1.4, -10, 2.8, 20, 1.4), zone: 'metal2', line: 1.2 }]);
part('modern.gyro.pilot', [
  { d: blob([-6, 4, -7, -6, -4, -10, 5, -10, 7, -6, 6, 4], 0.7), zone: 'leather' },
  { d: blob([-5, -8, 0, -11, 6, -8, 6, -5, 0, -7, -5, -5], 0.7), zone: 'team', banner: true, line: 1.4 },
  { d: blob([-6, -8, -14, -5, -18, -2, -14, -1, -8, -4], 0.6), zone: 'team', banner: true, line: 1.4 },
  { d: circle(1, -17, 6.8), zone: 'skin' },
  { d: blob([-7, -17, -6, -23, 1, -25.6, 8, -23, 8.6, -18, 1, -19.4], 0.7), zone: 'leather', line: 1.8 },
  { d: join(ellipse(3, -19.6, 2.6, 2.2), ellipse(7.4, -19.4, 2.2, 2)), zone: 'lens', line: 1.2, shade: false },
  { d: rrect(4, -13.4, 4, 1.3, 0.6), zone: 'mouth', line: 0, shade: false, light: false },
]);
part('modern.gyro.windshield', [{ d: poly([10, -12, 14, -20, 17, -20, 16, -11]), zone: 'glass', line: 1.4, alpha: 0.7, shade: false }]);
part('modern.gyro.gun', [
  { d: rrect(0, -1.6, 14, 3.2, 1.4), zone: 'metal2', line: 1.4 },
  { d: rrect(-2, -3, 6, 6, 1.6), zone: 'cloth3', line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Turrets (pivot at the mount point; see rigs/turret.ts)

part('modern.turret.sandbags', [
  { d: join(rrect(-20, -8, 14, 8, 4), rrect(-7, -8, 14, 8, 4), rrect(6, -8, 14, 8, 4), rrect(-14, -15, 14, 8, 4), rrect(0, -15, 14, 8, 4)), zone: 'sand' },
  { d: join(rect(-19, -4.6, 12, 1), rect(-6, -4.6, 12, 1), rect(7, -4.6, 12, 1)), zone: 'sand2', line: 0, shade: false, light: false },
]);
part('modern.turret.tripod', [{ d: join(limb(0, 0, 1.4, -8, 12, 1.2), limb(0, 0, 1.4, 8, 12, 1.2), limb(0, 0, 1.4, 0, 12, 1.2)), zone: 'metal2', line: 1.6 }]);
/** Machine gun with a water jacket and a shield (pivot at the cradle). */
part('modern.turret.mg', [
  { d: rrect(-10, -3.4, 30, 6.8, 3), zone: 'cloth3' },
  { d: rrect(4, -4.6, 14, 9.2, 3), zone: 'cloth', line: 1.8 },
  { d: rrect(18, -1.4, 6, 2.8, 1.2), zone: 'metal2', line: 1.2 },
  { d: blob([-2, -12, 4, -12, 4, 10, -2, 10], 0.6), zone: 'cloth', line: 1.8 },
  { d: rrect(-12, -2, 5, 7, 1.6), zone: 'cloth3', line: 1.4 },
]);
part('modern.turret.flakBase', [
  { d: poly([-18, 0, -14, -10, 14, -10, 18, 0]), zone: 'cloth' },
  { d: rrect(-10, -18, 20, 10, 3), zone: 'cloth3', line: 2 },
  { d: circle(0, -18, 4), zone: 'metal2', line: 1.6 },
]);
/** Twin flak barrels (pivot at the trunnion, pointing +x before the up-tilt). */
part('modern.turret.flak', [
  { d: join(rrect(-6, -6, 34, 4, 2), rrect(-6, 2, 34, 4, 2)), zone: 'cloth3' },
  { d: join(rrect(24, -7, 6, 6, 1.6), rrect(24, 1, 6, 6, 1.6)), zone: 'metal2', line: 1.4 },
  { d: blob([-10, -9, 6, -9, 8, 9, -10, 9], 0.6), zone: 'cloth', line: 2 },
  { d: circle(-2, 0, 3.4), zone: 'team', banner: true, line: 1.2 },
]);
part('modern.turret.howitzerBase', [
  { d: join(limb(-20, 0, 2, 4, -14, 2), limb(18, 0, 2, 4, -14, 2)), zone: 'cloth3' },
  { d: circle(-2, -6, 8), zone: 'cloth3' },
  { d: circle(-2, -6, 3), zone: 'metal2', line: 1.4, shade: false },
]);
part('modern.turret.howitzer', [
  { d: rrect(-10, -4.4, 46, 8.8, 3.6), zone: 'cloth' },
  { d: rrect(32, -5.4, 8, 10.8, 2.4), zone: 'cloth3', line: 1.6 },
  { d: blob([-8, -16, 2, -16, 4, 12, -8, 12], 0.6), zone: 'cloth', line: 2 },
  { d: rect(-6, -10, 8, 3), zone: 'team', banner: true, line: 1, shade: false },
]);
part('modern.turret.lightTower', [
  { d: join(limb(-10, 0, 1.6, -4, -26, 1.4), limb(10, 0, 1.6, 4, -26, 1.4), limb(-8, -9, 1.2, 8, -9, 1.2), limb(-6, -18, 1.2, 6, -18, 1.2)), zone: 'metal2' },
  { d: rrect(-12, -30, 24, 5, 2), zone: 'cloth3', line: 1.8 },
]);
/** Searchlight lamp with a sniper rifle strapped on (pivot at the yoke). */
part('modern.turret.searchlight', [
  { d: rrect(-9, -8, 16, 16, 4), zone: 'cloth3' },
  { d: ellipse(7, 0, 3.4, 8), zone: 'lamp', line: 1.8, shade: false },
  { d: join(rrect(-4, -14, 28, 2.6, 1.2), rrect(0, -18, 8, 3.4, 1.4)), zone: 'metal2', line: 1.4 },
  { d: rect(-9, -2, 16, 2.4), zone: 'team', banner: true, line: 0.8, shade: false, light: false },
]);
part('modern.turret.flag', [
  { d: limb(0, 0, 1, 0, -26, 0.9), zone: 'metal', line: 1.6 },
  { d: blob([0, -26, 13, -24, 13, -16, 0, -15], 0.3), zone: 'team', banner: true, line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Bunker (base.modern). Origin at the gate on the ground, extending back to x = -150.

part('modern.base.bunker', [
  { d: blob([-156, 0, -150, -70, -128, -110, -60, -124, -14, -104, -2, -60, 0, 0], 0.6), zone: 'concrete' },
  { d: join(rect(-140, -70, 120, 3), rect(-150, -30, 146, 3)), zone: 'concrete2', line: 0, shade: false, light: false },
  { d: join(rrect(-120, -86, 34, 8, 3), rrect(-66, -92, 34, 8, 3)), zone: 'dark', line: 2 },
]);
part('modern.base.tower', [
  { d: join(rect(-112, -190, 50, 80), rect(-118, -200, 62, 12)), zone: 'concrete' },
  { d: rrect(-104, -176, 34, 8, 3), zone: 'dark', line: 2 },
  { d: join(rect(-112, -150, 50, 3)), zone: 'concrete2', line: 0, shade: false, light: false },
]);
part('modern.base.camo', [
  { d: blob([-130, -112, -96, -128, -50, -128, -20, -106, -40, -100, -70, -116, -110, -114], 0.6), zone: 'cloth' },
  { d: join(circle(-104, -120, 4), circle(-76, -122, 5), circle(-48, -118, 4)), zone: 'cloth3', line: 0, shade: false, light: false },
]);
part('modern.base.door', [
  { d: rrect(-60, -44, 26, 44, 3), zone: 'metal2' },
  { d: join(rect(-58, -30, 22, 2), rect(-58, -14, 22, 2)), zone: 'metal', line: 0, shade: false, light: false },
  { d: rect(-62, -48, 30, 5), zone: 'concrete2', line: 2 },
]);
part('modern.base.sandbags', [
  { d: join(...[-30, -16, -2].map((x) => rrect(x, -10, 14, 10, 5)), ...[-23, -9].map((x) => rrect(x, -19, 14, 10, 5))), zone: 'sand' },
]);
part('modern.base.wire', [
  { d: join(...[-24, -12, 0, 12].map((x) => arcBand(x, -6, 5, 6.2, 0, 360))), zone: 'metal2', line: 0.8, shade: false, light: false },
  { d: join(limb(-30, 0, 1, -30, -14, 1), limb(20, 0, 1, 20, -14, 1)), zone: 'wood', line: 1.4 },
]);
part('modern.base.ledge', [
  { d: rrect(-22, -6, 42, 7, 2), zone: 'concrete' },
  { d: join(...[-20, -6, 8].map((x) => rrect(x, -13, 12, 8, 4))), zone: 'sand' },
  { d: join(poly([-16, 1, -10, 1, -13, 10]), poly([8, 1, 14, 1, 11, 10])), zone: 'concrete2', line: 2 },
]);
part('modern.base.mast', [
  { d: join(limb(0, 0, 1.6, 0, -80, 1), limb(-8, 0, 0.6, 0, -60, 0.6), limb(8, 0, 0.6, 0, -60, 0.6)), zone: 'metal2', line: 1.6 },
  { d: blob([0, -80, 24, -78, 24, -62, 0, -60], 0.3), zone: 'team', banner: true, line: 2.4 },
  { d: circle(0, -82, 2.4), zone: 'accent', line: 1, shade: false },
]);
part('modern.base.lamp', [
  { d: limb(0, 0, 1, 6, -6, 1), zone: 'metal2', line: 1.4 },
  { d: blob([2, -10, 12, -10, 12, -4, 2, -4], 0.6), zone: 'lamp', line: 1.6 },
]);
part('modern.base.crack1', [{ d: poly([-90, -120, -82, -100, -88, -82, -80, -66, -84, -64, -92, -82, -86, -100, -94, -118]), zone: 'dark', line: 0, shade: false, light: false }]);
part('modern.base.crack2', [
  { d: join(poly([-30, -100, -20, -80, -28, -56, -18, -38, -22, -36, -32, -56, -24, -80, -34, -98]), poly([-150, -60, -136, -46, -142, -24, -146, -24, -140, -44, -154, -56])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('modern.base.chunk', [{ d: rect(-118, -200, 16, 12), zone: 'concrete' }]);
part('modern.base.rubble', [
  { d: join(blob([-28, 0, -24, -10, -14, -12, -8, -4, -10, 0], 0.6), blob([-100, 0, -94, -8, -84, -7, -82, 0], 0.6), blob([-8, 0, -4, -6, 6, -5, 8, 0], 0.6)), zone: 'concrete2' },
]);
part('modern.base.treasury1', [
  { d: rrect(-12, -12, 24, 12, 2), zone: 'cloth' },
  { d: join(rect(-12, -8, 24, 1.6), rect(-2, -12, 4, 12)), zone: 'cloth3', line: 0, shade: false, light: false },
]);
part('modern.base.treasury2', [
  { d: join(rrect(-8, -22, 12, 22, 5), rrect(4, -18, 10, 18, 4)), zone: 'metal2' },
  { d: join(rect(-8, -16, 12, 2), rect(4, -12, 10, 2)), zone: 'accent', line: 0, shade: false, light: false },
]);
part('modern.base.treasury3', [
  { d: join(...[-12, 0, 12].map((x) => rrect(x - 5, -8, 10, 8, 1.4)), rrect(-6, -16, 10, 8, 1.4)), zone: 'coin' },
  { d: join(...[-12, 0, 12].map((x) => rect(x - 3, -5, 6, 1.4)), rect(-4, -13, 6, 1.4)), zone: 'coin2', line: 0, shade: false, light: false },
]);
part('modern.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);

// A tiny star used as the searchlight glint (kept as a separate part so skins can swap it).
part('modern.glint', [{ d: star(0, 0, 4, 1, 4, 0), zone: 'lamp', line: 0, shade: false, light: false }]);
// Octagon rivet plate (bunker details).
part('modern.plate', [{ d: ngon(0, 0, 8, 5), zone: 'concrete2', line: 1.6 }]);
