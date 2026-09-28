/**
 * Bronze Age parts (DESIGN A17.12 palette: sandstone, verdigris, dusk plum, polished bronze accent).
 * Authored in lu at infantry scale with pivots at joints and grips; hand-held weapons point up (-y)
 * from the grip. Team colour sits on the big readable areas: shield faces, crests, skirts, banners and
 * the chariot's side panel. Bronze armour uses the muted `metal` zones (under 40% saturation), and the
 * polished `accent` stays a small highlight, so the colour rule holds (A11).
 */
import { arcBand, blob, circle, ellipse, join, limb, poly, rect, rrect, star } from '../svg';
import { part } from './registry';
import { headLayers, hipsShape, torsoShape } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** Linen cuirass (linothorax) over a team chiton (Hoplite, Javelineer). */
part('bronze.torso.linen', [
  { d: torsoShape(1.02), zone: 'team', banner: true },
  { d: blob([-8.6, -19.6, 0, -22.6, 8.6, -19.6, 9.6, -6, 8.4, 0.6, 0, 1.6, -8.2, 0.6, -9.4, -6], 0.8), zone: 'linen' },
  { d: join(rect(-8.4, -8, 17.6, 1.6), rect(-8.8, -3.6, 18.2, 1.6)), zone: 'linen2', line: 0, shade: false, light: false },
  { d: join(circle(-4, -16.6, 1.4), circle(5, -16.6, 1.4)), zone: 'accent', line: 0.9, shade: false, light: false },
]);

/** Bronze muscle cuirass with a team sash (Phalangite, Standard Bearer). */
part('bronze.torso.cuirass', [
  { d: torsoShape(1.06), zone: 'metal' },
  { d: join(arcBand(-1.6, -13, 3.6, 4.6, 200, 330), arcBand(5.4, -13, 3.6, 4.6, 200, 330)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: limb(-7.6, -21, 3.6, 8.6, 0.6, 3.6), zone: 'team', banner: true },
  { d: circle(0.6, -8, 1.6), zone: 'accent', line: 0.9, shade: false, light: false },
]);

/** Pteruges: a skirt of leather strips with team tips. */
part('bronze.pelvis.pteruges', [
  { d: hipsShape(9.6), zone: 'pants' },
  { d: blob([-10.4, -3.6, 10.4, -3.6, 11.4, 7.8, -11, 7.8], 0.4), zone: 'team', banner: true },
  { d: join(...[-8, -4, 0, 4, 8].map((x) => rect(x - 0.6, -2.6, 1.2, 10))), zone: 'leather', line: 0, shade: false, light: false },
  { d: rrect(-10.6, -5, 21.6, 3.4, 1.6), zone: 'leather', line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Heads and headgear

part('bronze.head.warrior', headLayers({ nose: 'pointy', brow: 'angry', mouth: 'flat', jaw: 1 }));
part('bronze.head.young', headLayers({ nose: 'round', brow: 'calm', mouth: 'grin' }));

/** Crested helmet with cheek guards and a tall team crest (Hoplite). */
part('bronze.helm.crested', [
  { d: blob([-16, -26, -10, -38, 2, -42, 14, -37, 17, -30, 8, -33, 0, -33, -8, -30], 0.7), zone: 'team', banner: true },
  { d: blob([-13.4, -6, -14, -19, -9, -28, 2, -30.4, 11.6, -27, 15.2, -19, 15, -14, 10.6, -13, 9.4, -3.6, 5, -3.6, 5.6, -15, -1, -16.6, -6, -12, -8, -4], 0.8), zone: 'metal' },
  { d: rrect(-2, -32.4, 5, 5, 1.6), zone: 'metal2', line: 1.6 },
  { d: limb(6.6, -19, 0.8, 13.6, -19.4, 0.8), zone: 'accent', line: 0.8, shade: false, light: false },
]);

/** Tall pointed helmet with a small team plume (Phalangite). */
part('bronze.helm.tall', [
  { d: blob([-4, -33, -10, -39, -4, -43, 3, -38], 0.6), zone: 'team', banner: true, line: 2 },
  { d: blob([-13.2, -10, -13.6, -20, -8, -30, 0, -36, 9, -30, 14.6, -20, 15, -12, 2, -15, -9, -10], 0.8), zone: 'metal' },
  { d: rrect(-13.8, -18.4, 29.4, 3.4, 1.6), zone: 'metal2', line: 1.8 },
]);

/** Team headband with a knot (Javelineer). */
part('bronze.headband', [
  { d: rrect(-12.6, -20.6, 26, 4, 2), zone: 'team', banner: true, line: 1.8 },
  { d: blob([-12, -19, -18, -22, -19, -15, -13, -16], 0.6), zone: 'team', banner: true, line: 1.6 },
  { d: blob([-11, -21, -9, -27, 1, -29.4, 11, -26, 12.4, -21, 2, -22.6], 0.8), zone: 'hair', line: 2 },
]);

/** Laurel wreath on curly hair (Standard Bearer). */
part('bronze.laurel', [
  { d: blob([-11.6, -18, -9.6, -26, 1, -29.6, 11, -26.6, 12.8, -19, 3, -21, -5, -20], 0.8), zone: 'hair', line: 2 },
  { d: join(...[-9, -5, -1, 3, 7].map((x, i) => ellipse(x, -24.4 + Math.abs(i - 2) * 1.2, 2.4, 1.3))), zone: 'leaf', line: 1, shade: false },
]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

/** Round hoplon: team face, bronze rim, a verdigris boss. Pivot at the grip (shield centre). */
part('bronze.shield.round', [
  { d: circle(0, 0, 14.6), zone: 'metal' },
  { d: circle(0, 0, 11.4), zone: 'team', banner: true, line: 0 },
  { d: arcBand(0, 0, 4.6, 7.4, 0, 360), zone: 'cloth2', line: 0, shade: false, light: false },
  { d: circle(0, 0, 3.2), zone: 'accent', line: 1.2, shade: false },
]);

/** A smaller round shield strapped to the arm (Phalangite). */
part('bronze.shield.small', [
  { d: circle(0, 0, 10), zone: 'metal' },
  { d: circle(0, 0, 7.6), zone: 'team', banner: true, line: 0 },
  { d: star(0, 0, 8, 1.2, 4, 0), zone: 'metal2', line: 0, shade: false, light: false },
]);

/** Short thrusting spear (Hoplite). */
part('bronze.spear', [
  { d: limb(0, 14, 1.5, 0, -34, 1.4), zone: 'wood' },
  { d: blob([0, -46, 3, -38, 1.8, -33, -1.8, -33, -3, -38], 0.5), zone: 'metal' },
  { d: rrect(-1.8, -34.4, 3.6, 2.6, 1), zone: 'accent', line: 1, shade: false, light: false },
]);

/** The sarissa: a very long pike, so its reach reads at a glance (Phalangite). */
part('bronze.sarissa', [
  { d: limb(0, 30, 1.5, 0, -72, 1.3), zone: 'wood' },
  { d: blob([0, -86, 3.2, -76, 1.8, -70, -1.8, -70, -3.2, -76], 0.5), zone: 'metal' },
  { d: join(rrect(-2, -30, 4, 3, 1), rrect(-2, -72, 4, 3, 1), rrect(-2.2, 26, 4.4, 5, 1.4)), zone: 'metal2', line: 1.2 },
]);

/** A javelin held for the throw (Javelineer, Standard Bearer). */
part('bronze.javelin', [
  { d: limb(0, 16, 1.1, 0, -30, 1), zone: 'wood' },
  { d: poly([-2.2, -30, 0, -38, 2.2, -30]), zone: 'metal', line: 1.4 },
  { d: rrect(-1.6, 2, 3.2, 5, 1), zone: 'leather', line: 1, shade: false },
]);

/** A bundle of javelins in a team quiver on the back. */
part('bronze.javelins', [
  { d: join(limb(-2, 10, 0.9, -8, -24, 0.9), limb(1, 10, 0.9, -3, -26, 0.9), limb(4, 10, 0.9, 2, -24, 0.9)), zone: 'wood', line: 1.4 },
  { d: join(poly([-10, -24, -8.6, -30, -6.4, -24]), poly([-5, -26, -3.4, -32, -1.4, -26]), poly([0, -24, 2, -30, 3.6, -24])), zone: 'metal', line: 1.2 },
  { d: rrect(-5, -6, 11, 16, 3), zone: 'team', banner: true, line: 2 },
]);

/** Eagle standard: a tall pole with a team banner under a bronze eagle (Standard Bearer, far hand). */
part('bronze.standard.banner', [
  { d: limb(0, 14, 1.4, 0, -74, 1.2), zone: 'wood' },
  { d: rect(-1.2, -66, 18, 2), zone: 'wood', line: 1.4 },
  { d: blob([0.6, -64, 17, -64, 17, -40, 12, -44, 8.6, -38, 4.4, -44, 0.6, -40], 0.3), zone: 'team', banner: true, line: 2.2 },
  { d: join(circle(8.8, -54, 3.4)), zone: 'accent', line: 1.2, shade: false },
  { d: blob([-9, -80, -3, -76, 0, -82, 3, -76, 9, -80, 5, -73, 2, -72, 0, -75, -2, -72, -5, -73], 0.6), zone: 'metal' },
]);

/** A small frame drum at the hip (Standard Bearer). */
part('bronze.drum', [
  { d: ellipse(0, 0, 6.6, 7.4), zone: 'wood' },
  { d: ellipse(1.4, 0, 5, 6.2), zone: 'hide', line: 1.4 },
  { d: join(circle(-3, -4, 0.9), circle(-3.6, 1, 0.9), circle(-2.6, 5, 0.9)), zone: 'accent', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// War Chariot: a stocky horse pulling a two-wheeled cart (rider rig: the horse is the mount, the
// charioteer stands in the cart behind it).

function hoofLeg(id: string, len: number, r1: number, r2: number): void {
  part(id, [
    { d: join(limb(0, 0, r1, 0, len * 0.55, r2 + 0.6), limb(0, len * 0.55, r2 + 0.4, 0.6, len - 4, r2)), zone: 'fur' },
    { d: rrect(-r2 - 0.8, len - 5, r2 * 2 + 2.6, 5, 1.6), zone: 'hoof', line: 2.2 },
  ]);
}
hoofLeg('bronze.horse.leg.front', 28, 4.8, 3.3);
hoofLeg('bronze.horse.leg.back', 28, 6.2, 3.3);
part('bronze.horse.body', [{ d: blob([-20, -1, -18, -11, -8, -14.6, 7, -15, 16, -11.6, 21, -3, 19, 8, 9, 12, -9, 12, -18, 8], 0.9), zone: 'fur' }]);
/** Harness with a team breast collar and bronze bosses. */
part('bronze.horse.harness', [
  { d: join(limb(14, -12, 2.2, 20, 4, 2.4), limb(-6, -14, 1.6, 14, -8, 1.6)), zone: 'team', banner: true, line: 1.8 },
  { d: join(circle(17.6, -3, 2.2), circle(4, -11.6, 1.8)), zone: 'accent', line: 1, shade: false, light: false },
]);
/** The cart: a wicker-and-bronze box with a team side panel, the shaft to the horse. Behind the horse. */
part('bronze.chariot.cart', [
  { d: limb(0, 2, 1.8, 30, -2, 1.6), zone: 'wood' },
  { d: blob([-26, 4, -24, -22, -18, -26, -6, -24, 2, -16, 2, 4], 0.4), zone: 'metal' },
  { d: blob([-23, 1, -21.6, -19, -17, -22, -8, -20, -1.4, -13, -1.4, 1], 0.4), zone: 'team', banner: true, line: 0 },
  { d: join(rect(-24, -24.6, 22, 2)), zone: 'metal2', line: 1.4, shade: false },
  { d: star(-12, -9, 6, 2, 4.4), zone: 'accent', line: 1, shade: false },
]);
/** Scythed wheel: spokes, a bronze tyre and a blade on the hub. */
part('bronze.chariot.wheel', [
  { d: circle(0, 0, 11), zone: 'wood' },
  { d: arcBand(0, 0, 8.4, 11, 0, 360), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(...[0, 45, 90, 135].map((a) => { const r = (a * Math.PI) / 180; return limb(-Math.cos(r) * 8, -Math.sin(r) * 8, 0.8, Math.cos(r) * 8, Math.sin(r) * 8, 0.8); })), zone: 'wood2', line: 0, shade: false, light: false },
  { d: join(circle(0, 0, 2.6), poly([2, -1.2, 16, 0, 2, 1.2])), zone: 'metal', line: 1.2 },
]);
/** The chariot's team pennant on a short pole (A11 heavy cue). */
part('bronze.chariot.pennant', [
  { d: limb(0, 0, 1, 0, -30, 0.9), zone: 'wood', line: 1.6 },
  { d: blob([0, -30, 15, -27, 9, -24, 15, -20, 0, -18], 0.3), zone: 'team', banner: true, line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Scorpion: a wheeled torsion bolt-thrower with a crew member cranking (vehicle rig).

part('bronze.scorpion.frame', [
  { d: join(limb(-22, -4, 2.4, 14, -4, 2.4), limb(-14, -4, 2, -4, -26, 2), limb(6, -4, 2, -4, -26, 2)), zone: 'wood' },
  { d: rrect(-8, -30, 10, 8, 2), zone: 'metal2', line: 1.8 },
]);
part('bronze.scorpion.wheel', [
  { d: circle(0, 0, 7.6), zone: 'wood' },
  { d: arcBand(0, 0, 5.6, 7.6, 0, 360), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(limb(-5, 0, 0.7, 5, 0, 0.7), limb(0, -5, 0.7, 0, 5, 0.7), circle(0, 0, 1.6)), zone: 'wood2', line: 0, shade: false, light: false },
]);
/** The bow arms and stock, pointing +x (pivot on the frame's head). */
part('bronze.scorpion.bow', [
  { d: rrect(-16, -2.6, 38, 5.2, 2), zone: 'wood' },
  { d: join(blob([6, -2, 3, -12, 0, -18, -2, -16, 1, -8, 2, -2], 0.6), blob([6, 2, 3, 12, 0, 18, -2, 16, 1, 8, 2, 2], 0.6)), zone: 'metal' },
  { d: join(limb(-1, -17, 0.5, -12, 0, 0.5), limb(-1, 17, 0.5, -12, 0, 0.5)), zone: 'rope', line: 0.6, shade: false, light: false },
  { d: join(rrect(2, -4.4, 6, 8.8, 2)), zone: 'team', banner: true, line: 1.6 },
  { d: poly([12, -1.4, 26, 0, 12, 1.4]), zone: 'metal', line: 1 },
]);
/** The crewman at the crank: a team tunic, a round cap, working the winch. */
part('bronze.scorpion.crew', [
  { d: limb(0, 8, 5.6, 0, -8, 6.4), zone: 'team', banner: true },
  { d: circle(1.6, -18, 7.4), zone: 'skin' },
  { d: blob([-6, -21, -3, -27, 4, -27.6, 8.6, -22, 1, -23], 0.7), zone: 'metal', line: 1.8 },
  { d: circle(6.4, -18.6, 1.1), zone: 'pupil', line: 0, shade: false, light: false },
  { d: limb(3, -4, 2, 10, 4, 2), zone: 'skin', line: 1.8 },
]);
part('bronze.scorpion.flag', [
  { d: limb(0, 0, 1, 0, -44, 0.9), zone: 'wood', line: 1.6 },
  { d: blob([0, -44, 14, -42, 14, -33, 0, -32], 0.3), zone: 'team', banner: true, line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Bronze Colossus: a huge bronze statue with a team sash and crest, glowing white-hot seams (walker
// rig). Authored at 1x for a 200 lu figure; hull pivot at the hips.

part('bronze.colossus.hull', [
  { d: blob([-30, 8, -34, -24, -28, -52, -12, -62, 12, -62, 28, -52, 34, -24, 30, 8, 0, 14], 0.8), zone: 'metal' },
  { d: join(arcBand(-6, -36, 10, 12, 200, 330), arcBand(12, -36, 10, 12, 200, 330)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: blob([-26, 6, 26, 6, 30, 22, -30, 22], 0.4), zone: 'team', banner: true },
  { d: limb(-24, -54, 6, 26, 2, 6), zone: 'team', banner: true },
  { d: join(limb(-2, -20, 1.2, 4, -4, 1.2), limb(4, -4, 1.2, -1, 8, 1.2), limb(18, -14, 1, 22, -2, 1)), zone: 'glow', line: 0, shade: false, light: false },
  { d: join(...[-20, -10, 0, 10, 20].map((x) => rect(x - 1, 8, 2, 13))), zone: 'metal2', line: 0, shade: false, light: false },
]);
part('bronze.colossus.head', [
  { d: blob([-18, -30, -12, -46, 2, -52, 16, -46, 20, -36, 10, -40, 0, -40, -10, -36], 0.7), zone: 'team', banner: true },
  { d: blob([-14, 0, -16, -18, -11, -30, 2, -34, 14, -30, 18, -18, 17, -4, 10, 2, 0, 3], 0.8), zone: 'metal' },
  { d: rrect(2, -20, 15, 4, 2), zone: 'glow', line: 1.4, shade: false },
  { d: limb(10, -12, 0.8, 10, -2, 0.8), zone: 'metal2', line: 0, shade: false, light: false },
]);
part('bronze.colossus.thigh', [{ d: limb(0, 0, 11, 0, 30, 9), zone: 'metal' }]);
part('bronze.colossus.shin', [
  { d: limb(0, 0, 9, 0, 30, 7.6), zone: 'metal' },
  { d: limb(0, 4, 1, 1.6, 16, 1), zone: 'glow', line: 0, shade: false, light: false },
]);
part('bronze.colossus.foot', [{ d: blob([-12, 0, -8, -6, 10, -6, 20, 0, 18, 6, -12, 6], 0.6), zone: 'metal2' }]);
part('bronze.colossus.upperarm', [
  { d: limb(0, 0, 10, 0, 26, 8.4), zone: 'metal' },
  { d: circle(0, 0, 11), zone: 'metal2', line: 2.4 },
]);
part('bronze.colossus.fist', [
  { d: limb(0, 0, 8.4, 0, 22, 7.6), zone: 'metal' },
  { d: blob([-9, 20, -7, 30, 2, 34, 10, 30, 11, 20, 2, 17], 0.8), zone: 'metal' },
  { d: rrect(-10, 8, 20, 4, 2), zone: 'accent', line: 1.4, shade: false },
]);
part('bronze.colossus.flag', [
  { d: limb(0, 0, 1.6, 0, -46, 1.4), zone: 'wood', line: 2 },
  { d: blob([0, -46, 22, -42, 14, -36, 22, -30, 0, -26], 0.3), zone: 'team', banner: true, line: 2.4 },
]);

// ---------------------------------------------------------------------------------------------
// Turrets (origin on the mount, facing right; pivot bones aim)

/** Archer Tower: a timber tower with a team banner; the archer is a separate part. */
part('bronze.turret.tower', [
  { d: join(limb(-12, 0, 2.2, -8, -34, 2), limb(12, 0, 2.2, 8, -34, 2), limb(-11, -4, 1.2, 9, -26, 1.2), limb(11, -4, 1.2, -9, -26, 1.2)), zone: 'wood' },
  { d: rrect(-14, -40, 28, 8, 2), zone: 'wood2' },
  { d: blob([-4, -34, 6, -34, 6, -20, 1, -24, -4, -20], 0.3), zone: 'team', banner: true, line: 1.6 },
]);
part('bronze.turret.archer', [
  { d: rrect(-5, -10, 10, 12, 3), zone: 'team', banner: true },
  { d: circle(1, -15, 5.4), zone: 'skin' },
  { d: blob([-5, -17, -2, -22, 5, -22, 7, -17, 1, -18], 0.7), zone: 'metal', line: 1.6 },
  { d: join(arcBand(6, -6, 9, 10.4, 280, 440)), zone: 'wood', line: 1.2 },
]);
/** Sun Mirror: a bronze dish on a tripod; the dish turns on the pivot. */
part('bronze.turret.tripod', [{ d: join(limb(0, -16, 1.6, -10, 0, 1.4), limb(0, -16, 1.6, 10, 0, 1.4), limb(0, -16, 1.6, 0, 0, 1.4)), zone: 'wood', line: 1.8 }]);
part('bronze.turret.dish', [
  { d: blob([-4, -15, 3, -16, 6, -8, 6, 8, 3, 16, -4, 15, -1, 0], 0.7), zone: 'metal' },
  { d: blob([0, -12, 4, -12, 5, 0, 4, 12, 0, 12, 2, 0], 0.7), zone: 'glow', line: 0, shade: false },
  { d: rrect(-8, -2.6, 8, 5.2, 2), zone: 'metal2', line: 1.6 },
]);
/** Onager: a torsion frame and its throwing arm (the arm swings on the pivot). */
part('bronze.turret.onagerFrame', [
  { d: join(rrect(-20, -8, 40, 8, 3), limb(-14, -6, 2.4, -4, -24, 2.2), limb(10, -6, 2.4, -2, -24, 2.2)), zone: 'wood' },
  { d: rrect(-8, -26, 12, 7, 2), zone: 'rope', line: 1.6 },
  { d: join(circle(-12, 0, 5), circle(12, 0, 5)), zone: 'wood2', line: 1.8 },
]);
part('bronze.turret.onagerArm', [
  { d: limb(0, 0, 2.6, 0, -30, 2), zone: 'wood' },
  { d: blob([-6, -30, -5, -38, 5, -38, 6, -30, 0, -28], 0.7), zone: 'rope', line: 1.8 },
]);
/** Gorgon Bust: a stone head with snake hair on a plinth; the eyes glow on fire. */
part('bronze.turret.plinth', [
  { d: join(rrect(-14, -12, 28, 12, 2), rrect(-11, -16, 22, 5, 1.6)), zone: 'stone' },
  { d: rect(-12, -8, 24, 2), zone: 'team', banner: true, line: 0, shade: false },
]);
part('bronze.turret.gorgon', [
  { d: join(...[-12, -8, -3, 3, 8, 12].map((x, i) => limb(x * 0.6, -14, 1.8, x, -26 - (i % 2) * 4, 1.4))), zone: 'cloth2', line: 1.8 },
  { d: blob([-11, 2, -12, -12, -6, -20, 4, -20, 11, -12, 12, 0, 6, 6, -4, 6], 0.8), zone: 'stone' },
  { d: join(ellipse(2, -8, 2.4, 1.6), ellipse(8, -8, 2, 1.4)), zone: 'glow', line: 0.8, shade: false },
  { d: blob([4, -2, 10, -2, 8, 1, 5, 1], 0.6), zone: 'stone2', line: 1, shade: false, light: false },
]);
part('bronze.turret.flag', [
  { d: limb(0, 0, 1.2, 0, -26, 1.1), zone: 'wood', line: 1.8 },
  { d: blob([0, -26, 12, -23, 12, -15, 6, -17, 0, -14], 0.3), zone: 'team', banner: true, line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Ziggurat (base.bronze): stepped stone with bronze doors and braziers. Origin at the gate on the
// ground, extending back to x = -150.

part('bronze.base.steps', [
  {
    d: join(rect(-156, -64, 156, 64), rect(-146, -126, 134, 64), rect(-138, -186, 110, 62), rect(-124, -240, 78, 56)),
    zone: 'stone',
  },
  { d: join(rect(-156, -66, 156, 4), rect(-146, -128, 134, 4), rect(-138, -188, 110, 4)), zone: 'stone2', line: 0, shade: false, light: false },
  { d: join(...[-140, -110, -80, -50, -20].map((x) => rect(x, -40, 3, 30)), ...[-130, -96, -62, -30].map((x) => rect(x, -104, 3, 30))), zone: 'stone2', line: 0, shade: false, light: false },
]);
part('bronze.base.shrine', [
  { d: join(rect(-112, -276, 54, 38), poly([-118, -274, -85, -298, -52, -274])), zone: 'sand' },
  { d: rrect(-94, -268, 18, 26, 8), zone: 'dark', line: 2 },
  { d: join(rect(-116, -276, 62, 3)), zone: 'accent', line: 1.2, shade: false },
]);
part('bronze.base.door', [
  { d: rrect(-52, -50, 32, 50, 14), zone: 'metal' },
  { d: join(rect(-37, -48, 2, 48)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(circle(-44, -26, 2), circle(-28, -26, 2)), zone: 'accent', line: 1, shade: false },
  { d: rect(-56, -56, 40, 6), zone: 'stone2', line: 2 },
]);
/** Hanging team banners on the lowest step. */
part('bronze.base.banner', [
  { d: join(blob([-144, -60, -124, -60, -124, -30, -134, -36, -144, -30], 0.3), blob([-104, -122, -86, -122, -86, -96, -95, -101, -104, -96], 0.3)), zone: 'team', banner: true, line: 2 },
]);
part('bronze.base.flag', [
  { d: limb(0, 0, 1.6, 0, -60, 1.4), zone: 'wood', line: 2 },
  { d: blob([0, -60, 26, -56, 18, -49, 26, -42, 0, -38], 0.3), zone: 'team', banner: true, line: 2.4 },
]);
part('bronze.base.brazier', [
  { d: join(limb(-4, 0, 1, -2, -8, 1), limb(4, 0, 1, 2, -8, 1)), zone: 'metal2', line: 1.4 },
  { d: blob([-7, -8, 7, -8, 5, -13, -5, -13], 0.5), zone: 'metal', line: 1.6 },
  { d: blob([-4, -13, -2, -21, 0, -17, 2, -23, 4, -13], 0.6), zone: 'fire', line: 1.2, shade: false },
]);
part('bronze.base.ledge', [
  { d: rrect(-20, -6, 40, 7, 2), zone: 'stone2' },
  { d: join(poly([-14, 1, -8, 1, -11, 9]), poly([8, 1, 14, 1, 11, 9])), zone: 'stone2', line: 2 },
]);
part('bronze.base.crack1', [{ d: poly([-120, -110, -112, -92, -118, -76, -110, -64, -114, -62, -122, -76, -116, -92, -124, -108]), zone: 'dark', line: 0, shade: false, light: false }]);
part('bronze.base.crack2', [
  { d: join(poly([-60, -180, -50, -160, -58, -140, -48, -126, -52, -124, -62, -140, -54, -160, -64, -178]), poly([-150, -50, -136, -36, -142, -14, -146, -14, -140, -34, -154, -46])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('bronze.base.chunk', [{ d: rect(-124, -242, 22, 14), zone: 'stone' }]);
part('bronze.base.rubble', [
  { d: join(blob([-30, 0, -26, -10, -16, -12, -10, -4, -12, 0], 0.6), blob([-104, 0, -98, -8, -88, -7, -86, 0], 0.6), blob([-8, 0, -4, -6, 6, -5, 8, 0], 0.6)), zone: 'stone2' },
]);
/** Treasury: a granary jar, then sacks, then a trade barge with a sail. */
part('bronze.base.treasury1', [
  { d: blob([-8, 0, -10, -12, -6, -20, 6, -20, 10, -12, 8, 0], 0.7), zone: 'clay' },
  { d: rect(-9, -12, 18, 2), zone: 'cloth2', line: 0, shade: false, light: false },
]);
part('bronze.base.treasury2', [
  { d: join(rrect(-10, -14, 12, 14, 5), rrect(2, -12, 10, 12, 4)), zone: 'sand' },
  { d: join(rect(-8, -11, 8, 1.6), rect(4, -9, 6, 1.6)), zone: 'rope', line: 0, shade: false, light: false },
]);
part('bronze.base.treasury3', [
  { d: blob([-22, -6, 22, -6, 16, 4, -16, 4], 0.4), zone: 'wood' },
  { d: limb(0, -6, 1, 0, -34, 1), zone: 'wood2', line: 1.4 },
  { d: blob([1, -34, 16, -28, 16, -12, 1, -10], 0.4), zone: 'linen', line: 1.8 },
  { d: join(circle(-12, -9, 2.4), circle(-6, -9, 2.4)), zone: 'coin', line: 1, shade: false },
]);
part('bronze.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);
