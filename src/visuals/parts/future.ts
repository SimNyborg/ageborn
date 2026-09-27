/**
 * Future Age parts (DESIGN A11 palette: charcoal, magenta, mint, white, cyan accent). Authored in lu
 * at infantry scale with pivots at joints and grips; hand-held weapons point up (-y) from the grip.
 * Energy is magenta (blades, rails) or mint (glows, visors); cyan is in the team hue band, so it
 * only appears as small accents.
 */
import { arcBand, blob, circle, ellipse, join, limb, ngon, poly, rect, rrect, star, wedge } from '../svg';
import { part } from './registry';
import { headLayers, hipsShape, tabardShape, torsoShape } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** White armour over a charcoal suit, team chest plate and a mint glow seam. */
part('future.torso.armor', [
  { d: torsoShape(1.06), zone: 'cloth' },
  { d: blob([-9.6, -4, -10.4, -14, -7, -21, 1, -23, 8, -21, 11, -14, 10.6, -4, 0, -2], 0.8), zone: 'cloth2' },
  { d: blob([-4, -19, 6, -19.6, 9, -12, 7.4, -4, -2, -4, -5, -12], 0.7), zone: 'team', banner: true },
  { d: join(rrect(-1, -12, 7, 1.8, 0.9)), zone: 'glow', line: 0, shade: false, light: false },
  { d: blob([-10.6, -21, -3, -24.6, 2, -22, -2, -17, -9, -15], 0.7), zone: 'cloth2', line: 2 },
]);
/** Charcoal stealth suit with a team stripe and a mint seam (EMP Saboteur). */
part('future.torso.suit', [
  { d: torsoShape(1), zone: 'cloth' },
  { d: limb(-8, -20, 2.6, 9, -1, 2.6), zone: 'team', banner: true },
  { d: join(rrect(-10, -4, 20.6, 3, 1.4)), zone: 'leather', line: 1.6 },
  { d: join(circle(4, -12, 1.4), circle(-4, -8, 1.2)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('future.pelvis.armor', [
  { d: hipsShape(9.4), zone: 'cloth' },
  { d: rrect(-10, -5, 20.4, 3.8, 1.8), zone: 'cloth2', line: 2 },
  { d: rrect(3, -4.4, 4, 2.4, 1), zone: 'glow', line: 0, shade: false, light: false },
]);
part('future.pelvis.suit', [
  { d: hipsShape(9.2), zone: 'cloth' },
  { d: rrect(-10, -4.8, 20.4, 3.2, 1.6), zone: 'leather', line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Heads and headgear

part('future.head.plain', headLayers({ nose: 'round', brow: 'calm', mouth: 'flat' }));
part('future.head.grin', headLayers({ nose: 'pointy', brow: 'angry', mouth: 'grin' }));

/** Photon Knight helm: white dome, mint visor slit and a team crest fin. */
part('future.helmet.knight', [
  { d: blob([-8, -27, -4, -35, 6, -38, 4, -31, 0, -26], 0.6), zone: 'team', banner: true, line: 2.2 },
  { d: blob([-13.4, -4, -14, -18, -9, -27, 2, -29.6, 11.4, -26, 15.4, -17, 15.6, -7, 11, -1, 0, 0], 0.85), zone: 'cloth2' },
  { d: blob([2, -18, 15.6, -17, 16, -11, 3, -11.6], 0.6), zone: 'glow', line: 1.8, shade: false },
  { d: join(rect(-11, -9, 8, 1.6), rect(-10, -14, 6, 1.6)), zone: 'metal2', line: 0, shade: false, light: false },
]);
/** Trooper helmet with a wraparound mint visor. */
part('future.helmet.trooper', [
  { d: blob([-13.4, -8, -14, -19, -9, -27, 2, -29.6, 11.4, -26, 15.4, -18, 15, -9, 2, -12, -9, -6], 0.85), zone: 'cloth2' },
  { d: blob([-2, -19, 8, -21, 16, -17, 16.4, -11, 6, -11, -2, -13], 0.6), zone: 'glow', line: 1.8, shade: false },
  { d: rrect(-12, -26, 5, 12, 2.4), zone: 'team', banner: true, line: 1.6 },
]);
/** Rail Gunner helmet with a targeting eyepiece (magenta lens). */
part('future.helmet.rail', [
  { d: blob([-13.4, -8, -14, -19, -9, -27, 2, -29.6, 11.4, -26, 15.4, -18, 15, -12, 2, -15, -9, -6], 0.85), zone: 'cloth' },
  { d: rrect(-13, -21, 26, 4, 2), zone: 'team', banner: true, line: 1.6 },
  { d: join(limb(4, -17, 1, 12, -14, 1)), zone: 'metal2', line: 1.2 },
  { d: circle(12.4, -13.4, 3.2), zone: 'magenta', line: 1.6, shade: false },
]);
/** Saboteur hood with goggles. */
part('future.hood', [
  { d: blob([-14, -2, -15, -16, -11, -26, -1, -30, 9, -27, 14, -20, 13.6, -16, 6, -19, -1, -17, -5, -11, -5, -2], 0.9), zone: 'cloth' },
  { d: join(rrect(3, -18.6, 13, 6, 3)), zone: 'metal2', line: 1.8 },
  { d: join(ellipse(7, -15.6, 2.6, 2.2), ellipse(12.6, -15.6, 2.4, 2)), zone: 'magenta', line: 1, shade: false },
  { d: rrect(-15, -12, 4, 10, 2), zone: 'team', banner: true, line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

/** Photon blade: a white hilt and a magenta energy blade. */
part('future.photonblade', [
  { d: blob([-2.6, -6, 2.6, -6, 2.8, -30, 0, -35, -2.8, -30], 0.5), zone: 'magenta', line: 1.6, light: 'auto' },
  { d: rrect(-0.8, -30, 1.6, 22, 0.8), zone: 'white', line: 0, shade: false, light: false },
  { d: rrect(-5, -8, 10, 3, 1.4), zone: 'metal2', line: 1.6 },
  { d: rrect(-1.8, -6, 3.6, 10, 1.6), zone: 'cloth2', line: 1.6 },
]);
/** Plasma rifle: white body with a mint cell (barrel points up from the grip). */
part('future.plasmarifle', [
  { d: blob([-3, 10, 2.6, 10, 3.4, 0, 3, -10, -1, -10, -3, 0], 0.6), zone: 'cloth2' },
  { d: rrect(-2.2, -34, 4.4, 26, 2), zone: 'cloth2', line: 2 },
  { d: rrect(-1.2, -38, 2.4, 6, 1), zone: 'metal2', line: 1.4 },
  { d: rrect(-2.8, -22, 5.6, 7, 2), zone: 'glow', line: 1.4, shade: false },
  { d: rrect(2.2, -30, 3, 6, 1.2), zone: 'metal2', line: 1.2 },
]);
/** Rail gun: twin rails with a magenta core and a charging coil. */
part('future.railgun', [
  { d: blob([-3.2, 12, 2.8, 12, 3.6, 0, 3, -8, -1.4, -8, -3.2, 0], 0.6), zone: 'cloth' },
  { d: join(rrect(-3.4, -56, 2.4, 50, 1.2), rrect(1, -56, 2.4, 50, 1.2)), zone: 'metal', line: 1.8 },
  { d: rrect(-1.2, -52, 2.4, 42, 1.2), zone: 'magenta', line: 0, shade: false, light: false },
  { d: join(...[-46, -38, -30].map((y) => rrect(-4.6, y, 9.2, 3, 1.2))), zone: 'metal2', line: 1.2 },
  { d: rrect(-3.8, -18, 7.6, 10, 2.4), zone: 'cloth', line: 1.6 },
]);
part('future.capacitor', [
  { d: rrect(-7, -12, 12, 22, 3), zone: 'cloth2' },
  { d: join(rrect(-5, -8, 8, 3, 1.2), rrect(-5, -2, 8, 3, 1.2), rrect(-5, 4, 8, 3, 1.2)), zone: 'glow', line: 1, shade: false, light: false },
]);
/** Shock baton with a crackling magenta tip. */
part('future.baton', [
  { d: rrect(-1.6, -22, 3.2, 26, 1.6), zone: 'metal2' },
  { d: circle(0, -24, 3.4), zone: 'magenta', line: 1.4, shade: false },
  { d: star(0, -24, 5, 1.6, 5), zone: 'white', line: 0, alpha: 0.8, shade: false, light: false },
]);
/** The EMP device on the saboteur's back (animated by the `device` bone). */
part('future.emp.device', [
  { d: circle(0, 0, 9), zone: 'cloth2' },
  { d: arcBand(0, 0, 5, 7, 0, 360), zone: 'accent', line: 1, shade: false, light: false },
  { d: circle(0, 0, 3.4), zone: 'magenta', line: 1.2, shade: false },
  { d: join(rrect(-10.6, -2, 3, 4, 1), rrect(7.6, -2, 3, 4, 1)), zone: 'metal2', line: 1.2 },
]);

// ---------------------------------------------------------------------------------------------
// Walker Mech (walker rig: hull, legs with feet, arms)

part('future.mech.hull', [
  { d: blob([-22, 6, -24, -18, -16, -34, 10, -36, 24, -26, 26, -6, 16, 8, -12, 10], 0.8), zone: 'cloth2' },
  { d: blob([-4, -30, 12, -32, 22, -24, 22, -12, 4, -12, -2, -20], 0.7), zone: 'glass', line: 2.2, alpha: 0.9 },
  { d: blob([-22, -8, -8, -8, -6, 6, -20, 6], 0.6), zone: 'team', banner: true },
  { d: join(rect(-20, -16, 14, 2), circle(-14, -24, 2)), zone: 'glow', line: 0, shade: false, light: false },
  { d: rrect(-10, 4, 22, 6, 2.6), zone: 'metal2', line: 2 },
]);
/** The pilot seen through the canopy. */
part('future.mech.pilot', [
  { d: circle(0, 0, 6), zone: 'skin', line: 2 },
  { d: blob([-6, -1, -5, -6, 0, -8, 6, -6, 7, -2, 0, -3], 0.7), zone: 'cloth', line: 1.6 },
  { d: rrect(1, -2, 6, 2.4, 1.2), zone: 'glow', line: 0.8, shade: false, light: false },
]);
part('future.mech.thigh', [{ d: limb(0, 0, 6.4, 0, 20, 5), zone: 'metal2' }]);
part('future.mech.shin', [
  { d: limb(0, 0, 5.4, 0, 20, 4.4), zone: 'cloth2' },
  { d: rrect(-3, 6, 6, 3, 1.4), zone: 'glow', line: 0, shade: false, light: false },
]);
part('future.mech.foot', [{ d: blob([-9, 0, -7, -4, 7, -4, 13, 0, 12, 4, -9, 4], 0.6), zone: 'metal2' }]);
part('future.mech.upperarm', [{ d: limb(0, 0, 6, 0, 16, 5), zone: 'cloth2' }]);
/** Forearm with a big three-fingered claw (Walker Mech reach 60). */
part('future.mech.claw', [
  { d: limb(0, 0, 5, 0, 22, 6), zone: 'metal2' },
  { d: join(poly([-5, 22, -8, 32, -3, 30, -1, 24]), poly([5, 22, 8, 33, 3, 31, 1, 24]), poly([-1.4, 24, 0, 35, 1.4, 24])), zone: 'metal', line: 1.8 },
  { d: rrect(-5.4, 8, 10.8, 3, 1.4), zone: 'team', banner: true, line: 1.2, shade: false },
]);
part('future.mech.forearm', [
  { d: limb(0, 0, 4.6, 0, 16, 5), zone: 'metal2' },
  { d: circle(0, 18, 5), zone: 'metal2' },
]);

// ---------------------------------------------------------------------------------------------
// Repair Drone (flyer rig: body, rotor, rotorB, emitter)

part('future.drone.body', [
  { d: circle(0, 0, 11), zone: 'cloth2' },
  { d: arcBand(0, 0, 11, 12.4, 200, 340), zone: 'team', banner: true, line: 1.2 },
  { d: circle(4, 0, 5), zone: 'cloth', line: 1.8 },
  { d: circle(5, -0.6, 2.4), zone: 'glow', line: 0, shade: false, light: false },
  { d: join(rect(-11, 5, 22, 2)), zone: 'metal2', line: 0, shade: false, light: false },
]);
part('future.drone.pod', [
  { d: join(limb(0, 0, 1.4, 0, 8, 1.4)), zone: 'metal2', line: 1.4 },
  { d: rrect(-4, -2.4, 8, 4.8, 2.2), zone: 'cloth2', line: 1.6 },
]);
part('future.drone.blade', [{ d: rrect(-9, -1, 18, 2, 1), zone: 'metal2', line: 1 }]);
part('future.drone.emitter', [
  { d: blob([-4, -2, 4, -2, 3, 4, -3, 4], 0.6), zone: 'metal2', line: 1.6 },
  { d: circle(0, 4, 2.4), zone: 'glow', line: 1, shade: false },
]);

// ---------------------------------------------------------------------------------------------
// Chrono Titan (walker rig with a clock on the chest)

part('future.titan.hull', [
  { d: blob([-34, 10, -38, -30, -28, -58, 0, -66, 30, -58, 40, -30, 36, 10, 16, 20, -16, 20], 0.8), zone: 'cloth2' },
  { d: blob([-38, -30, -46, -46, -36, -62, -20, -60, -24, -44], 0.7), zone: 'team', banner: true },
  { d: blob([40, -30, 48, -46, 38, -62, 22, -60, 26, -44], 0.7), zone: 'team', banner: true },
  { d: join(rect(-30, 0, 62, 3), rect(-20, 8, 40, 2)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(circle(-28, -40, 2), circle(30, -40, 2)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('future.titan.head', [
  { d: blob([-12, 0, -13, -14, -6, -22, 8, -22, 14, -14, 13, 0], 0.7), zone: 'cloth2' },
  { d: rrect(-2, -14, 15, 5, 2.4), zone: 'magenta', line: 1.8, shade: false },
  { d: join(poly([-8, -22, -4, -30, 0, -22]), poly([2, -22, 6, -30, 10, -22])), zone: 'metal2', line: 1.6 },
]);
/** Clock face (pivot at its centre): the `clock` bone spins it for Time Stop. */
part('future.titan.clock', [
  { d: circle(0, 0, 17), zone: 'metal2' },
  { d: circle(0, 0, 13.6), zone: 'clockface', line: 1.6, shade: false },
  { d: join(...[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => rect(-0.8 + 11 * Math.cos((a * Math.PI) / 180), -0.8 + 11 * Math.sin((a * Math.PI) / 180), 1.6, 1.6))), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(limb(0, 0, 1.2, 0, -10, 0.8), limb(0, 0, 1.2, 7, 2, 0.8)), zone: 'magenta', line: 0.8, shade: false, light: false },
  { d: circle(0, 0, 2), zone: 'accent', line: 0.8, shade: false, light: false },
]);
part('future.titan.thigh', [{ d: limb(0, 0, 11, 0, 30, 9), zone: 'metal2' }]);
part('future.titan.shin', [
  { d: limb(0, 0, 10, 0, 30, 8), zone: 'cloth2' },
  { d: rrect(-4, 10, 8, 4, 2), zone: 'glow', line: 0, shade: false, light: false },
]);
part('future.titan.foot', [{ d: blob([-14, 0, -12, -6, 12, -6, 20, 0, 18, 6, -14, 6], 0.6), zone: 'metal2' }]);
part('future.titan.upperarm', [
  { d: limb(0, 0, 10, 0, 26, 8), zone: 'cloth2' },
  { d: circle(0, 0, 11), zone: 'metal2' },
]);
part('future.titan.fist', [
  { d: limb(0, 0, 8, 0, 24, 9), zone: 'metal2' },
  { d: rrect(-11, 22, 22, 18, 6), zone: 'cloth2' },
  { d: join(rect(-10, 30, 20, 1.6), rect(-10, 35, 20, 1.6)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: rrect(-8, 8, 16, 4, 1.8), zone: 'team', banner: true, line: 1.2, shade: false },
]);

// ---------------------------------------------------------------------------------------------
// Turrets (pivot at the mount point; see rigs/turret.ts)

part('future.turret.pylon', [
  { d: poly([-14, 0, -8, -22, 8, -22, 14, 0]), zone: 'cloth' },
  { d: rect(-10, -12, 20, 2), zone: 'glow', line: 0, shade: false, light: false },
  { d: rrect(-16, -3, 32, 5, 2.4), zone: 'metal2' },
]);
/** Pulse laser emitter head (pivot at the gimbal), lens toward +x. */
part('future.turret.laser', [
  { d: blob([-10, -7, 8, -8, 16, -4, 18, 0, 16, 4, 8, 8, -10, 7, -12, 0], 0.6), zone: 'cloth2' },
  { d: ellipse(17, 0, 2.6, 5.6), zone: 'glow', line: 1.6, shade: false },
  { d: rrect(-8, -3, 10, 2.6, 1.2), zone: 'team', banner: true, line: 1, shade: false },
]);
part('future.turret.coil', [
  { d: poly([-12, 0, -6, -30, 6, -30, 12, 0]), zone: 'cloth' },
  { d: join(ellipse(0, -8, 12, 3.4), ellipse(0, -17, 10, 3), ellipse(0, -26, 8, 2.6)), zone: 'metal', line: 1.8 },
  { d: circle(0, -37, 8), zone: 'magenta', line: 2, shade: false },
  { d: star(0, -37, 6, 3, 7), zone: 'white', line: 0, alpha: 0.6, shade: false, light: false },
  { d: rrect(-14, -3, 28, 5, 2.4), zone: 'metal2' },
  { d: rect(-6, -3, 12, 2), zone: 'team', banner: true, line: 0.8, shade: false, light: false },
]);
part('future.turret.mortarBase', [
  { d: blob([-16, 0, -14, -10, 14, -10, 16, 0], 0.5), zone: 'cloth' },
  { d: circle(0, -10, 6), zone: 'metal2', line: 2 },
]);
/** Plasma mortar tube (pivot at its base, pointing +x before the up-tilt). */
part('future.turret.mortar', [
  { d: rrect(-4, -6.4, 30, 12.8, 5), zone: 'cloth2' },
  { d: join(rect(4, -6.4, 2.4, 12.8), rect(12, -6.4, 2.4, 12.8)), zone: 'glow', line: 0, shade: false, light: false },
  { d: ellipse(26, 0, 2, 6), zone: 'magenta', line: 1.4, shade: false },
  { d: rect(18, -6.4, 4, 12.8), zone: 'team', banner: true, line: 1, shade: false },
]);
part('future.turret.ring', [
  { d: arcBand(0, -26, 16, 21, 0, 360), zone: 'cloth2' },
  { d: join(limb(-8, 0, 2.2, -13, -12, 2), limb(8, 0, 2.2, 13, -12, 2)), zone: 'metal2' },
  { d: rrect(-16, -3, 32, 5, 2.4), zone: 'cloth' },
  { d: join(...[0, 90, 180, 270].map((a) => circle(18.5 * Math.cos((a * Math.PI) / 180), -26 + 18.5 * Math.sin((a * Math.PI) / 180), 1.8))), zone: 'glow', line: 0, shade: false, light: false },
  { d: rect(-6, -3, 12, 2), zone: 'team', banner: true, line: 0.8, shade: false, light: false },
]);
/** The dark orb floating in the ring (pivot at the ring centre). */
part('future.turret.orb', [
  { d: circle(0, 0, 11), zone: 'void' },
  { d: wedge(0, 0, 11, 200, 260), zone: 'void2', line: 0, shade: false, light: false },
  { d: circle(-3, -3, 3), zone: 'lilac', line: 0, alpha: 0.8, shade: false, light: false },
]);
part('future.turret.flag', [
  { d: limb(0, 0, 1, 0, -26, 0.9), zone: 'metal', line: 1.6 },
  { d: blob([0, -26, 13, -24, 13, -16, 0, -15], 0.3), zone: 'team', banner: true, line: 2, alpha: 0.9 },
]);

// ---------------------------------------------------------------------------------------------
// Spire (base.future). Origin at the gate on the ground, extending back to x = -150.

part('future.base.spire', [
  { d: poly([-150, 0, -134, -220, -100, -300, -72, -220, -60, 0]), zone: 'cloth' },
  { d: poly([-124, -200, -100, -280, -84, -200, -90, -20, -116, -20]), zone: 'cloth2' },
  { d: join(rect(-110, -250, 20, 3), rect(-112, -180, 24, 3), rect(-114, -110, 28, 3), rect(-116, -40, 32, 3)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('future.base.wing', [
  { d: poly([-70, 0, -64, -150, -40, -176, -14, -150, -4, 0]), zone: 'cloth' },
  { d: poly([-58, -10, -54, -140, -40, -156, -26, -140, -16, -10]), zone: 'metal2' },
  { d: join(rrect(-50, -120, 20, 8, 3), rrect(-48, -80, 18, 8, 3)), zone: 'glow', line: 1.6 },
]);
part('future.base.gate', [
  { d: rrect(-54, -46, 32, 46, 6), zone: 'dark' },
  { d: join(rect(-54, -30, 32, 2), rect(-54, -14, 32, 2)), zone: 'glow', line: 0, alpha: 0.8, shade: false, light: false },
  { d: arcBand(-38, -30, 16, 20, 180, 360), zone: 'cloth2', line: 2 },
]);
part('future.base.antenna', [
  { d: join(limb(0, 0, 1.6, 0, -56, 1)), zone: 'metal', line: 1.6 },
  { d: circle(0, -58, 3.4), zone: 'magenta', line: 1.4, shade: false },
]);
part('future.base.holo', [
  { d: rrect(-2, -2, 4, 40, 2), zone: 'metal2', line: 1.6 },
  { d: blob([2, 0, 24, 2, 24, 26, 2, 24], 0.3), zone: 'team', banner: true, line: 1.4, alpha: 0.85 },
  { d: star(13, 13, 4, 2, 6, 45), zone: 'white', line: 0, alpha: 0.7, shade: false, light: false },
]);
part('future.base.ledge', [
  { d: rrect(-22, -5, 42, 6, 3), zone: 'cloth2' },
  { d: rect(-18, -1, 34, 2), zone: 'glow', line: 0, shade: false, light: false },
  { d: poly([-12, 1, 8, 1, -2, 10]), zone: 'metal2', line: 2 },
]);
part('future.base.light', [
  { d: limb(0, 0, 1, 0, -6, 1), zone: 'metal2', line: 1.2 },
  { d: circle(0, -9, 3.4), zone: 'glow', line: 1.4, shade: false },
]);
part('future.base.crack1', [{ d: poly([-104, -210, -96, -190, -102, -172, -94, -156, -98, -154, -106, -172, -100, -190, -108, -208]), zone: 'dark', line: 0, shade: false, light: false }]);
part('future.base.crack2', [
  { d: join(poly([-40, -140, -30, -116, -38, -90, -28, -70, -32, -68, -42, -90, -34, -116, -44, -138]), poly([-146, -80, -132, -66, -138, -44, -142, -44, -136, -64, -150, -76])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('future.base.chunk', [{ d: poly([-100, -300, -92, -282, -108, -282]), zone: 'cloth2' }]);
part('future.base.rubble', [
  { d: join(blob([-28, 0, -24, -10, -14, -12, -8, -4, -10, 0], 0.6), blob([-100, 0, -94, -8, -84, -7, -82, 0], 0.6), blob([-8, 0, -4, -6, 6, -5, 8, 0], 0.6)), zone: 'metal2' },
]);
part('future.base.treasury1', [{ d: join(ngon(-5, -6, 6, 5.4), ngon(5, -6, 6, 5.4)), zone: 'crystal', line: 1.8 }]);
part('future.base.treasury2', [
  { d: rrect(-10, -20, 20, 20, 4), zone: 'cloth2' },
  { d: rrect(-6, -16, 12, 12, 3), zone: 'glow', line: 1.4, shade: false },
]);
part('future.base.treasury3', [
  { d: poly([-14, 0, -8, -16, 0, -24, 8, -16, 14, 0]), zone: 'crystal' },
  { d: poly([-2, -20, 4, -12, -4, -6]), zone: 'white', line: 0, alpha: 0.7, shade: false, light: false },
]);
part('future.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);

/** Knight's armoured tabard skirt. */
part('future.skirt', [
  { d: blob([-9.6, -3, 9.6, -3, 10.6, 7, 0, 8.6, -10, 7], 0.6), zone: 'cloth2' },
  { d: blob([-4, -2, 6, -2, 7, 7, 1, 8, -4, 7], 0.6), zone: 'team', banner: true, line: 1.6 },
]);
/** Photon Knight's tabard layer, re-used by Pulse Trooper (keeps the team area readable). */
part('future.tabard', [{ d: tabardShape(0.9, 2), zone: 'team', banner: true, line: 1.8 }]);
