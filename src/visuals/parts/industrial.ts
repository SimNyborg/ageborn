/**
 * Industrial Age parts (DESIGN A17.12 palette: iron, coal, smoke cream, muted brick, copper accent).
 * Steam, rivets, rail and the first electric light, roughly 1850-1915. Authored in lu at infantry
 * scale with pivots at joints and grips; hand-held weapons point up (-y) from the grip. Team colour
 * sits on bibs, coats, armbands, vests, pennants and the landship's roundel; copper stays an accent.
 */
import { arcBand, blob, circle, ellipse, join, limb, poly, rect, rrect, star } from '../svg';
import { part } from './registry';
import { headLayers, hipsShape, tabardShape, torsoShape } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** Cream work shirt under team overalls with a bib and brass buttons (Riveter). */
part('industrial.torso.overalls', [
  { d: torsoShape(1.04), zone: 'cloth2' },
  { d: blob([-7, -12, 7.6, -12, 9.6, -4, 9, 3, 0, 4, -8.6, 3, -9.4, -4], 0.6), zone: 'team', banner: true },
  { d: join(limb(-6, -20, 1.4, -5.4, -12, 1.4), limb(6.4, -20, 1.4, 6, -12, 1.4)), zone: 'team', banner: true, line: 1.6 },
  { d: join(circle(-4.6, -11, 1.2), circle(5.4, -11, 1.2)), zone: 'accent', line: 0.8, shade: false, light: false },
]);
part('industrial.pelvis.overalls', [{ d: hipsShape(9.6), zone: 'team', banner: true }]);

/** Long team greatcoat with a cream collar and a bandolier (Carbineer). */
part('industrial.torso.greatcoat', [
  { d: tabardShape(1.06, 6), zone: 'team', banner: true },
  { d: blob([-7, -22, 0, -24, 8, -21.6, 6, -17.6, 0, -19, -6, -17.6], 0.7), zone: 'cloth2' },
  { d: limb(-7, -20, 1.4, 7, 1, 1.4), zone: 'leather', line: 1.6 },
  { d: join(circle(4, -12, 0.9), circle(4.4, -7, 0.9), circle(4.4, -2, 0.9)), zone: 'accent', line: 0.7, shade: false, light: false },
]);
part('industrial.pelvis.coat', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: blob([-10.6, -4, 10.6, -4, 11, 9, 6, 11, 0, 9, -6, 11, -11, 9], 0.5), zone: 'team', banner: true },
]);

/** Iron-grey jacket with rolled sleeves and a team scarf (Harpoon Gunner, Flare Spotter). */
part('industrial.torso.jacket', [
  { d: torsoShape(1.04), zone: 'cloth' },
  { d: join(rrect(2, -14, 7, 5, 1.4), limb(-7, -20, 1.2, 6, 2, 1.2)), zone: 'leather', line: 1.4 },
  { d: blob([-8, -22, 0, -25, 8.6, -22, 8.4, -17, 2, -17.6, 5, -9, 1, -8, -1, -17, -7, -17], 0.7), zone: 'team', banner: true },
]);
part('industrial.pelvis.trousers', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: rrect(-10, -4.8, 20.4, 3.2, 1.6), zone: 'leather', line: 2 },
]);

/** Sapper's team vest over a cream shirt, a coil of fuse on the belt. */
part('industrial.torso.vest', [
  { d: torsoShape(1.04), zone: 'cloth2' },
  { d: blob([-9, -18, -2, -21, -1, 2, -9, 2], 0.6), zone: 'team', banner: true },
  { d: blob([3, -20, 9, -18, 10, 2, 3, 2], 0.6), zone: 'team', banner: true },
  { d: arcBand(4, 0, 2.4, 4, 0, 360), zone: 'rope', line: 1, shade: false, light: false },
]);

/** An upper arm with a team armband (Flare Spotter). */
part('industrial.arm.band', [
  { d: limb(0, 0, 3.8, 0, 8.8, 3.2), zone: 'sleeve' },
  { d: rrect(-4, 2.6, 8, 3.4, 1.2), zone: 'team', banner: true, line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Heads and headgear

part('industrial.head.worker', headLayers({ nose: 'big', brow: 'angry', mouth: 'flat', jaw: 1.4 }));
part('industrial.head.soldier', headLayers({ nose: 'round', brow: 'calm', mouth: 'flat' }));
part('industrial.head.scout', headLayers({ nose: 'pointy', brow: 'worried', mouth: 'o' }));
part('industrial.moustache', [{ d: blob([4, -6.4, 9, -8.6, 13.6, -7, 12, -5, 8.6, -6, 5.4, -4.6], 0.7), zone: 'hair', line: 1.4 }]);

/** Flat cap (Riveter). */
part('industrial.cap', [
  { d: blob([-12, -17, -10, -24, 0, -27.6, 10, -25, 16, -19, 18, -16.6, 8, -18, -2, -18.4], 0.7), zone: 'cloth' },
  { d: limb(-11, -18, 0.8, 14, -18.6, 0.8), zone: 'metal2', line: 0.8, shade: false, light: false },
]);

/** Brimmed campaign hat with a team band (Carbineer). */
part('industrial.hat.brim', [
  { d: blob([-15, -17, -10, -20, 12, -20, 17, -17, 11, -15, -10, -15], 0.6), zone: 'leather' },
  { d: blob([-10, -18, -9, -27, 0, -31, 9, -27, 10, -18], 0.7), zone: 'leather' },
  { d: rrect(-10.4, -21, 20.8, 3.2, 1.2), zone: 'team', banner: true, line: 1.4 },
]);

/** Leather cap with brass goggles pushed up (Harpoon Gunner). */
part('industrial.goggles', [
  { d: blob([-12.6, -12, -13, -20, -8, -27, 2, -29.6, 11, -26, 14, -19, 13, -15, 2, -17, -10, -12], 0.8), zone: 'leather' },
  { d: join(ellipse(1, -22, 4.2, 3.6), ellipse(9.4, -20.6, 3.6, 3.4)), zone: 'accent', line: 1.8 },
  { d: join(ellipse(1, -22, 2.4, 2), ellipse(9.4, -20.6, 2, 1.8)), zone: 'glass', line: 0, shade: false },
]);

/** Kepi with a team top (Flare Spotter). */
part('industrial.kepi', [
  { d: blob([-11, -17, -10, -28, 8, -30, 11, -18], 0.5), zone: 'team', banner: true },
  { d: blob([-12, -18, 12, -18, 18, -15, 10, -14.6, -12, -15.4], 0.5), zone: 'metal2', line: 1.8 },
]);

/** Sapper's leather helmet with ear flaps. */
part('industrial.helmet.sapper', [
  { d: blob([-13.4, -8, -14, -19, -9, -27, 2, -29.6, 11.4, -26, 15, -18, 14.6, -14, 2, -16, -8, -12, -8, -4], 0.85), zone: 'leather' },
  { d: rrect(-3, -30, 6, 4, 1.6), zone: 'metal', line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

/** An oversized monkey wrench (Riveter). */
part('industrial.wrench', [
  { d: rrect(-2.2, -28, 4.4, 36, 2), zone: 'metal' },
  { d: blob([-7, -30, -7, -40, -2, -42, -2, -34, 3, -34, 3, -42, 8, -40, 8, -30, 0, -26], 0.5), zone: 'metal' },
  { d: rrect(-2.8, -4, 5.6, 12, 2), zone: 'accent', line: 1.4, shade: false },
]);

/** Short lever-action carbine (Carbineer). */
part('industrial.carbine', [
  { d: blob([-2.4, 10, 2.2, 10, 2.8, 2, 1.8, -5, -1, -5, -2.2, 2], 0.6), zone: 'wood' },
  { d: rrect(-1, -28, 2, 24, 1), zone: 'metal2', line: 1.6 },
  { d: rrect(-1.6, -16, 3.2, 12, 1.4), zone: 'wood', line: 1.4 },
  { d: arcBand(2.4, 2, 2, 3.2, 270, 450), zone: 'metal', line: 0.8, shade: false, light: false },
]);

/** Shoulder harpoon gun with a barbed head (Harpoon Gunner; grip in the middle, pointing up). */
part('industrial.harpoongun', [
  { d: rrect(-3.4, -24, 6.8, 36, 3), zone: 'metal' },
  { d: join(rrect(-4.2, -6, 8.4, 4, 1.4), rrect(-4.2, 6, 8.4, 4, 1.4)), zone: 'accent', line: 1.2, shade: false },
  { d: limb(0, -24, 1, 0, -34, 1), zone: 'wood', line: 1.2 },
  { d: join(poly([-3.6, -34, 0, -44, 3.6, -34]), poly([-3.6, -34, -5.6, -30, -1.6, -32]), poly([3.6, -34, 5.6, -30, 1.6, -32])), zone: 'metal2', line: 1.2 },
]);

/** A coil of rope on the back. */
part('industrial.ropecoil', [
  { d: ellipse(0, 0, 7, 8.4), zone: 'rope' },
  { d: ellipse(0, 0, 3.6, 4.6), zone: 'leather', line: 1.4, shade: false },
]);

/** Flare pistol with a wide bore (Flare Spotter). */
part('industrial.flarepistol', [
  { d: blob([-2.4, 6, 2.4, 6, 2.8, -2, -2, -2], 0.6), zone: 'wood' },
  { d: rrect(-2.6, -16, 5.2, 15, 2.2), zone: 'metal2', line: 1.6 },
  { d: rrect(-3, -17.4, 6, 3, 1.2), zone: 'accent', line: 1, shade: false },
]);

/** Brass binoculars on a strap at the chest (Flare Spotter). */
part('industrial.binoculars', [
  { d: join(rrect(-5, -3, 4.4, 7, 1.6), rrect(0.6, -3, 4.4, 7, 1.6)), zone: 'metal2', line: 1.4 },
  { d: rect(-1, -1, 2, 3), zone: 'accent', line: 0.8, shade: false, light: false },
]);

/** A short pick (Sapper). */
part('industrial.pick', [
  { d: limb(0, 8, 1.4, 0, -22, 1.3), zone: 'wood' },
  { d: blob([-11, -22, -4, -27, 4, -27, 12, -23, 4, -24, -4, -24], 0.5), zone: 'metal', line: 1.8 },
]);

/** The striped charge box on the back with a lit fuse sparkle (Sapper). */
part('industrial.chargebox', [
  { d: rrect(-7, -11, 14, 20, 2), zone: 'wood' },
  { d: join(rect(-7, -7, 14, 3), rect(-7, 0, 14, 3)), zone: 'stripe', line: 0, shade: false, light: false },
  { d: limb(3, -11, 0.7, 7, -17, 0.7), zone: 'rope', line: 0.8, shade: false, light: false },
  { d: star(7.6, -18, 6, 1, 3.4), zone: 'glow', line: 0.8, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Steam Golem: a boiler-bellied iron walker with piston arms and a chimney (walker rig, 1x).

part('industrial.golem.hull', [
  { d: blob([-20, 6, -24, -14, -20, -34, -8, -42, 8, -42, 20, -34, 24, -14, 20, 6, 0, 10], 0.8), zone: 'metal' },
  { d: join(...[-16, -8, 0, 8, 16].map((x) => circle(x, -38, 1.2)), ...[-20, -20].map((x, i) => circle(x, -24 + i * 16, 1.2))), zone: 'metal2', line: 0, shade: false, light: false },
  { d: circle(4, -16, 8.6), zone: 'accent', line: 1.8 },
  { d: circle(4, -16, 6.2), zone: 'fire', line: 0, shade: false },
  { d: blob([-18, 0, 18, 0, 20, 10, -20, 10], 0.4), zone: 'team', banner: true },
]);
part('industrial.golem.chimney', [
  { d: rrect(-4, -24, 8, 26, 1.6), zone: 'metal2' },
  { d: rrect(-6, -28, 12, 5, 1.6), zone: 'metal', line: 2 },
]);
part('industrial.golem.head', [
  { d: rrect(-9, -14, 20, 16, 5), zone: 'metal' },
  { d: rrect(2, -10, 9, 5, 2.4), zone: 'glass', line: 1.6, shade: false },
  { d: circle(6, -7.6, 1.4), zone: 'fire', line: 0, shade: false, light: false },
]);
part('industrial.golem.thigh', [{ d: limb(0, 0, 7, 0, 18, 6), zone: 'metal2' }]);
part('industrial.golem.shin', [
  { d: limb(0, 0, 6, 0, 18, 5.4), zone: 'metal' },
  { d: rrect(-5, 4, 10, 3, 1.2), zone: 'accent', line: 1.2, shade: false },
]);
part('industrial.golem.foot', [{ d: blob([-9, 0, -6, -4, 8, -4, 14, 0, 12, 4, -9, 4], 0.6), zone: 'metal2' }]);
part('industrial.golem.upperarm', [
  { d: limb(0, 0, 6.6, 0, 16, 5.8), zone: 'metal2' },
  { d: circle(0, 0, 7), zone: 'metal', line: 2.2 },
]);
/** Piston forearm with a riveted ram fist. */
part('industrial.golem.fist', [
  { d: rrect(-3, 0, 6, 16, 1.6), zone: 'metal' },
  { d: rrect(-5, 12, 10, 8, 2), zone: 'metal2' },
  { d: rrect(-7, 18, 14, 10, 3), zone: 'metal' },
  { d: join(circle(-4, 23, 1), circle(4, 23, 1)), zone: 'accent', line: 0, shade: false, light: false },
]);
part('industrial.golem.flag', [
  { d: limb(0, 0, 1.2, 0, -32, 1.1), zone: 'metal2', line: 1.8 },
  { d: blob([0, -32, 16, -29, 10, -25, 16, -21, 0, -18], 0.3), zone: 'team', banner: true, line: 2.2 },
]);

// ---------------------------------------------------------------------------------------------
// Land Dreadnought: a rhomboid landship with full-length treads, two sponsons with visible gunners,
// a team roundel and a smokestack (vehicle rig, 1x; hull pivot on the ground line).

part('industrial.landship.tread', [
  { d: blob([-50, -2, -53, -26, -38, -64, 34, -64, 53, -30, 50, -2, 38, 4, -38, 4], 0.35), zone: 'metal2' },
  { d: join(...[-42, -28, -14, 0, 14, 28, 40].map((x) => rect(x, 0, 6, 3))), zone: 'metal', line: 0, shade: false, light: false },
]);
part('industrial.landship.teeth', [{ d: join(...[-44, -34, -24, -14, -4, 6, 16, 26, 36].map((x) => rect(x, 0, 4, 3))), zone: 'metal', line: 1 }]);
part('industrial.landship.roadwheel', [
  { d: circle(0, 0, 6), zone: 'metal' },
  { d: circle(0, 0, 2), zone: 'metal2', line: 1, shade: false, light: false },
]);
part('industrial.landship.hull', [
  { d: blob([-46, -8, -48, -28, -34, -58, 30, -58, 48, -30, 46, -8, 30, -4, -30, -4], 0.4), zone: 'cloth' },
  { d: join(...[-36, -24, -12, 0, 12, 24, 36].map((x) => circle(x, -52, 1.3)), ...[-36, -24, -12, 0, 12, 24, 36].map((x) => circle(x, -10, 1.3))), zone: 'metal2', line: 0, shade: false, light: false },
  { d: circle(-6, -32, 10.6), zone: 'cloth2', line: 2 },
  { d: circle(-6, -32, 7.4), zone: 'team', banner: true, line: 0 },
  { d: circle(-6, -32, 3), zone: 'cloth2', line: 0, shade: false, light: false },
]);
/** A side sponson with its gunner and a short gun (one on each side; the far one sits behind). */
part('industrial.landship.sponson', [
  { d: blob([-12, 0, -13, -14, -4, -20, 10, -18, 14, -8, 12, 2], 0.6), zone: 'cloth' },
  { d: rrect(10, -12, 16, 4, 1.6), zone: 'metal2', line: 1.6 },
  { d: circle(-2, -24, 5.6), zone: 'skin' },
  { d: blob([-8, -26, -5, -32, 3, -32, 5, -26], 0.6), zone: 'metal2', line: 1.6 },
  { d: rect(-8, -20, 12, 4), zone: 'team', banner: true, line: 1.2, shade: false },
]);
/** Commander's cupola and a riveted cab on top. */
part('industrial.landship.cab', [
  { d: rrect(-18, -26, 36, 28, 5), zone: 'cloth' },
  { d: join(rrect(-12, -20, 8, 5, 1.4), rrect(0, -20, 8, 5, 1.4)), zone: 'glass', line: 1.4, shade: false },
  { d: rrect(-20, -30, 40, 5, 2), zone: 'metal2', line: 2 },
]);
part('industrial.landship.gun', [
  { d: rrect(0, -3.4, 34, 6.8, 2.4), zone: 'metal2' },
  { d: rrect(30, -4.6, 7, 9.2, 2), zone: 'metal', line: 1.6 },
]);
part('industrial.landship.stack', [
  { d: rrect(-4.4, -44, 8.8, 46, 2), zone: 'metal2' },
  { d: rrect(-6.4, -48, 12.8, 6, 2), zone: 'accent', line: 1.6, shade: false },
]);
part('industrial.landship.flag', [
  { d: limb(0, 0, 1.6, 0, -84, 1.4), zone: 'metal2', line: 2 },
  { d: blob([0, -84, 26, -80, 18, -73, 26, -66, 0, -62], 0.3), zone: 'team', banner: true, line: 2.4 },
]);

// ---------------------------------------------------------------------------------------------
// Turrets (origin on the mount, facing right)

part('industrial.turret.tripod', [{ d: join(limb(0, -14, 1.6, -10, 0, 1.4), limb(0, -14, 1.6, 10, 0, 1.4), limb(0, -14, 1.6, 0, 0, 1.4)), zone: 'metal2', line: 1.8 }]);
/** Crank-fed multi-barrel gun (Gatling Gun; pivot at the cradle). */
part('industrial.turret.gatling', [
  { d: rrect(-8, -5, 16, 10, 3), zone: 'metal' },
  { d: join(rrect(6, -4.6, 22, 2.6, 1.2), rrect(6, -1.3, 24, 2.6, 1.2), rrect(6, 2, 22, 2.6, 1.2)), zone: 'metal2', line: 1.4 },
  { d: join(rrect(18, -5.6, 3, 11.2, 1.2)), zone: 'accent', line: 1.2, shade: false },
  { d: join(limb(-8, 0, 1, -14, 4, 1), circle(-14, 4, 1.8)), zone: 'wood', line: 1.2 },
  { d: rrect(-3, -12, 8, 8, 2), zone: 'metal2', line: 1.4 },
]);
/** Mortar Pit: a sandbag ring with a squat tube. */
part('industrial.turret.sandbags', [
  { d: join(rrect(-20, -8, 14, 8, 4), rrect(-7, -8, 14, 8, 4), rrect(6, -8, 14, 8, 4), rrect(-14, -15, 14, 8, 4), rrect(0, -15, 14, 8, 4)), zone: 'sand' },
  { d: rect(-12, -12, 10, 2.4), zone: 'team', banner: true, line: 0, shade: false },
]);
part('industrial.turret.tube', [
  { d: rrect(-5, -5, 22, 10, 4), zone: 'metal2' },
  { d: rrect(14, -6.4, 5, 12.8, 2), zone: 'metal', line: 1.6 },
]);
/** Boiler Mortar: a heavy mortar sitting on a riveted boiler with a steam vent. */
part('industrial.turret.boiler', [
  { d: rrect(-16, -20, 32, 20, 8), zone: 'metal' },
  { d: join(...[-10, -2, 6].map((x) => circle(x, -16, 1)), ...[-10, -2, 6].map((x) => circle(x, -4, 1))), zone: 'metal2', line: 0, shade: false, light: false },
  { d: circle(10, -10, 4), zone: 'fire', line: 1.4, shade: false },
  { d: join(rrect(-14, -26, 5, 8, 1.4)), zone: 'metal2', line: 1.2, shade: false },
]);
part('industrial.turret.heavyMortar', [
  { d: rrect(-6, -7, 30, 14, 5), zone: 'metal2' },
  { d: rrect(20, -8.4, 6, 16.8, 2.4), zone: 'metal', line: 1.8 },
  { d: rrect(4, -9, 5, 18, 1.6), zone: 'accent', line: 1.2, shade: false },
]);
/** Tesla Tower: an iron lattice coil tower with a sparking globe. */
part('industrial.turret.teslaTower', [
  { d: join(limb(-10, 0, 1.8, -3, -34, 1.4), limb(10, 0, 1.8, 3, -34, 1.4), limb(-8, -8, 0.8, 5, -24, 0.8), limb(8, -8, 0.8, -5, -24, 0.8)), zone: 'metal2', line: 1.6 },
  { d: join(...[0, 1, 2, 3, 4].map((i) => rrect(-5, -32 + i * 3.6, 10, 2, 1))), zone: 'metal', line: 1, shade: false },
  { d: rrect(-5.6, -33.6, 11.2, 2, 1), zone: 'accent', line: 0.8, shade: false, light: false },
]);
part('industrial.turret.globe', [
  { d: circle(0, 0, 7.6), zone: 'glass' },
  { d: star(0, 0, 6, 1.6, 6.4), zone: 'glow', line: 0, shade: false, light: false },
  { d: circle(-2, -2, 2), zone: 'white', line: 0, shade: false, light: false },
]);
part('industrial.turret.flag', [
  { d: limb(0, 0, 1.1, 0, -26, 1), zone: 'metal2', line: 1.6 },
  { d: blob([0, -26, 13, -24, 13, -16, 0, -15], 0.3), zone: 'team', banner: true, line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Foundry (base.industrial): brick works with a clock tower, a chimney and a gantry crane. Origin at
// the gate on the ground, extending back to x = -150.

part('industrial.base.works', [
  { d: join(rect(-156, -120, 150, 120), poly([-160, -118, -120, -150, -80, -118]), poly([-84, -118, -44, -150, -4, -118])), zone: 'brick' },
  { d: join(...[-140, -100, -60].map((x) => rrect(x, -104, 22, 26, 10)), ...[-128, -76].map((x) => rrect(x, -60, 22, 26, 10))), zone: 'glass', line: 2, shade: false },
  { d: join(rect(-156, -64, 150, 3), rect(-156, -24, 150, 3)), zone: 'stone2', line: 0, shade: false, light: false },
]);
part('industrial.base.tower', [
  { d: join(rect(-60, -250, 44, 132), poly([-66, -248, -38, -286, -10, -248])), zone: 'brick' },
  { d: circle(-38, -220, 13), zone: 'cloth2', line: 2.2 },
  { d: join(limb(-38, -220, 1, -38, -230, 1), limb(-38, -220, 1, -31, -218, 1)), zone: 'dark', line: 0, shade: false, light: false },
  { d: rect(-62, -196, 48, 4), zone: 'stone2', line: 1.6 },
]);
part('industrial.base.chimney', [
  { d: poly([-138, -120, -134, -300, -118, -300, -114, -120]), zone: 'brick' },
  { d: join(rect(-140, -300, 28, 8), rect(-138, -220, 24, 4)), zone: 'stone2', line: 1.8 },
]);
part('industrial.base.gantry', [
  { d: join(limb(-4, 0, 1.6, -4, -170, 1.6), limb(-24, 0, 1.6, -24, -170, 1.6), limb(-34, -170, 1.8, 20, -170, 1.8)), zone: 'metal2', line: 1.8 },
  { d: join(...[0, 1, 2, 3, 4, 5].map((i) => limb(-24, -i * 28, 0.6, -4, -(i + 1) * 28, 0.6))), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(limb(14, -170, 0.6, 14, -140, 0.6), rrect(10, -142, 8, 8, 2)), zone: 'accent', line: 1.2, shade: false },
]);
part('industrial.base.door', [
  { d: rrect(-54, -52, 32, 52, 14), zone: 'metal' },
  { d: join(rect(-54, -40, 32, 2), rect(-54, -24, 32, 2), rect(-39, -52, 2, 52)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: rect(-58, -58, 40, 6), zone: 'stone2', line: 2 },
]);
part('industrial.base.banner', [
  { d: join(blob([-150, -112, -128, -112, -128, -80, -139, -86, -150, -80], 0.3), blob([-96, -112, -76, -112, -76, -84, -86, -90, -96, -84], 0.3)), zone: 'team', banner: true, line: 2 },
]);
part('industrial.base.flag', [
  { d: limb(0, 0, 1.6, 0, -60, 1.4), zone: 'metal2', line: 2 },
  { d: blob([0, -60, 26, -56, 18, -49, 26, -42, 0, -38], 0.3), zone: 'team', banner: true, line: 2.4 },
]);
part('industrial.base.lamp', [
  { d: limb(0, 0, 1, 6, -6, 1), zone: 'metal2', line: 1.4 },
  { d: blob([2, -12, 11, -12, 11, -3, 2, -3], 0.6), zone: 'lamp', line: 1.6 },
]);
part('industrial.base.ledge', [
  { d: rrect(-20, -6, 40, 7, 2), zone: 'metal' },
  { d: join(poly([-14, 1, -8, 1, -11, 9]), poly([8, 1, 14, 1, 11, 9])), zone: 'metal2', line: 2 },
]);
part('industrial.base.crack1', [{ d: poly([-110, -110, -102, -92, -108, -76, -100, -64, -104, -62, -112, -76, -106, -92, -114, -108]), zone: 'dark', line: 0, shade: false, light: false }]);
part('industrial.base.crack2', [
  { d: join(poly([-46, -240, -36, -220, -44, -200, -34, -186, -38, -184, -48, -200, -40, -220, -50, -238]), poly([-150, -60, -136, -46, -142, -24, -146, -24, -140, -44, -154, -56])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('industrial.base.chunk', [{ d: rect(-134, -310, 16, 12), zone: 'brick' }]);
part('industrial.base.rubble', [
  { d: join(blob([-30, 0, -26, -10, -16, -12, -10, -4, -12, 0], 0.6), blob([-104, 0, -98, -8, -88, -7, -86, 0], 0.6), blob([-8, 0, -4, -6, 6, -5, 8, 0], 0.6)), zone: 'stone2' },
]);
/** Treasury: a crate of coal, then a steam mill wheel, then a strongbox of coin. */
part('industrial.base.treasury1', [
  { d: rrect(-10, -10, 20, 10, 1.6), zone: 'wood' },
  { d: blob([-9, -10, -6, -15, 0, -16, 6, -15, 9, -10], 0.7), zone: 'metal2', line: 1.4 },
]);
part('industrial.base.treasury2', [
  { d: circle(0, -14, 13), zone: 'wood' },
  { d: arcBand(0, -14, 9, 13, 0, 360), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(...[0, 45, 90, 135].map((a) => { const r = (a * Math.PI) / 180; return limb(-Math.cos(r) * 9, -14 - Math.sin(r) * 9, 0.8, Math.cos(r) * 9, -14 + Math.sin(r) * 9, 0.8); })), zone: 'wood2', line: 0, shade: false, light: false },
]);
part('industrial.base.treasury3', [
  { d: rrect(-10, -12, 20, 12, 2), zone: 'metal' },
  { d: join(rect(-10, -8, 20, 1.6), rrect(-2, -9, 4, 4, 1)), zone: 'accent', line: 0, shade: false, light: false },
  { d: join(circle(-5, -14, 2.4), circle(1, -15, 2.4), circle(6, -14, 2.4)), zone: 'coin', line: 1, shade: false },
]);
part('industrial.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);
