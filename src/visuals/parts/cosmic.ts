/**
 * Cosmic Age parts (DESIGN A17.12 palette: void, nebula violet, star white, mint accent). Space opera
 * beyond the Future: star legions, warp, motherships. Authored in lu at infantry scale with pivots at
 * joints and grips; hand-held weapons point up (-y) from the grip. Nebula violet (276°) sits outside the
 * blue team band and mint is the energy accent, so the colour rule holds (A11); team colour sits on
 * chest plates, crests, cloaks' edges, hull stripes and pennants.
 */
import { arcBand, blob, circle, ellipse, join, limb, ngon, poly, rect, rrect, star } from '../svg';
import { part } from './registry';
import { headLayers, hipsShape, tabardShape, torsoShape } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** Star-white armour plates over a void suit with a team chest plate (Legionnaire, Ranger, Halberdier). */
part('cosmic.torso.armor', [
  { d: torsoShape(1.06), zone: 'cloth' },
  { d: blob([-8.6, -20, 0, -23, 8.6, -20, 9.4, -9, 7, -2, -7, -2, -9.4, -9], 0.7), zone: 'cloth3' },
  { d: blob([-5, -17, 5.6, -17, 6, -9, 0.4, -5, -5, -9], 0.6), zone: 'team', banner: true },
  { d: rrect(-9.6, -2.6, 20, 3, 1.4), zone: 'glow', line: 1.4, shade: false },
]);
part('cosmic.pelvis.armor', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: blob([-9.6, -3, 9.6, -3, 10.6, 6, 0, 8, -10, 6], 0.6), zone: 'cloth3' },
  { d: blob([-3, -2, 7, -2, 7.6, 7, 2, 8.6, -3.4, 7], 0.6), zone: 'team', banner: true, line: 1.6 },
]);

/** Starwarden's robe: a void robe with a team stole and mint trim. */
part('cosmic.torso.robe', [
  { d: torsoShape(1.1), zone: 'robe' },
  { d: tabardShape(0.7, 4), zone: 'team', banner: true },
  { d: join(rect(-2, -22, 1.6, 26), rect(3, -22, 1.6, 26)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('cosmic.pelvis.robe', [
  { d: blob([-10.6, -4, 10.6, -4, 12.4, 12, 8, 15, 0, 14, -8, 15, -12, 12], 0.7), zone: 'robe' },
  { d: blob([-3, -3, 4, -3, 5, 14, -4, 14], 0.4), zone: 'team', banner: true },
]);

/** Warp Stalker's lean suit under a hooded cloak (the cloak is its own part behind the body). */
part('cosmic.torso.stalker', [
  { d: torsoShape(0.98), zone: 'cloth' },
  { d: limb(-7, -20, 3.4, 8, 1, 3), zone: 'team', banner: true },
  { d: join(circle(4, -12, 1.2), circle(0, -6, 1.2)), zone: 'glow', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Heads and headgear

part('cosmic.head.plain', headLayers({ nose: 'round', brow: 'calm', mouth: 'flat' }));
part('cosmic.head.sage', headLayers({ nose: 'big', brow: 'calm', mouth: 'grin' }));

/** Sleek helmet with a mint visor and a team crest stripe (Star Legionnaire). */
part('cosmic.helmet.visor', [
  { d: blob([-13.6, -6, -14.2, -19, -9, -28, 2, -31, 11.6, -27, 15.6, -18, 15.2, -8, 8, -4, -8, -2], 0.85), zone: 'cloth3' },
  { d: blob([0, -20, 9, -22, 16, -17, 16, -11, 6, -11, 0, -13], 0.6), zone: 'glow', line: 1.8, shade: false },
  { d: blob([-12, -24, -2, -32, 4, -31, -6, -22], 0.6), zone: 'team', banner: true, line: 1.6 },
]);
/** Ranger's helmet with a long eyepiece. */
part('cosmic.helmet.ranger', [
  { d: blob([-13.4, -8, -14, -19, -9, -27, 2, -29.6, 11.4, -26, 15.4, -18, 15, -12, 2, -15, -9, -6], 0.85), zone: 'cloth3' },
  { d: rrect(4, -19, 14, 5, 2.2), zone: 'metal2', line: 1.6 },
  { d: circle(16, -16.6, 2.2), zone: 'glow', line: 1.2, shade: false },
  { d: rrect(-13, -22, 26, 3.4, 1.6), zone: 'team', banner: true, line: 1.4 },
]);
/** Halberdier's heavy helm with a violet fin. */
part('cosmic.helmet.fin', [
  { d: blob([-8, -26, -16, -34, -10, -38, 2, -32], 0.6), zone: 'cloth2', line: 2 },
  { d: blob([-13.4, -4, -14, -19, -9, -28, 2, -30.6, 11.6, -27, 15.4, -18, 15, -6, 10, -3, 4, -12, -4, -12, -8, -4], 0.85), zone: 'cloth3' },
  { d: rrect(4, -13, 11, 3, 1.4), zone: 'glow', line: 1.2, shade: false },
  { d: rrect(-13.6, -20, 12, 3, 1.4), zone: 'team', banner: true, line: 1.2 },
]);
/** Starwarden's deep hood with a mint circlet. */
part('cosmic.hood.warden', [
  { d: blob([-14, -2, -15, -16, -11, -26, -1, -31, 9, -28, 14, -20, 13.6, -16, 6, -19, -1, -17, -5, -11, -5, -2], 0.9), zone: 'robe' },
  { d: arcBand(3, -12, 11, 12.6, 210, 330), zone: 'glow', line: 0.8, shade: false, light: false },
]);
/** Warp Stalker's pointed hood hiding the face, two mint eyes. */
part('cosmic.hood.stalker', [
  { d: blob([-14, 0, -16, -16, -12, -30, -6, -38, 2, -30, 12, -24, 15, -14, 13, -4, 4, 0], 0.8), zone: 'cloth' },
  { d: blob([2, -20, 12, -20, 13, -8, 2, -8], 0.6), zone: 'void', line: 1.4, shade: false },
  { d: join(ellipse(6, -14, 1.6, 1.1), ellipse(10.4, -14, 1.4, 1)), zone: 'glow', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

/** Energy blade: a white core in a mint glow over a short hilt (Star Legionnaire). */
part('cosmic.energyblade', [
  { d: rrect(-2, -34, 4, 30, 2), zone: 'glow', alpha: 0.9 },
  { d: rrect(-0.8, -32, 1.6, 26, 0.8), zone: 'white', line: 0, shade: false, light: false },
  { d: rrect(-5, -6, 10, 3, 1.4), zone: 'metal2', line: 1.6 },
  { d: rrect(-1.6, -4, 3.2, 9, 1.4), zone: 'metal', line: 1.4 },
]);
/** Deflector disc on the forearm: a star-white ring around a mint field. */
part('cosmic.deflector', [
  { d: ellipse(0, 0, 5, 11), zone: 'metal' },
  { d: ellipse(0.6, 0, 3, 8), zone: 'glow', line: 0, alpha: 0.8, shade: false },
  { d: rrect(-5.6, -2, 3.4, 4, 1.2), zone: 'team', banner: true, line: 1 },
]);
/** Ion rifle: a long barrel with glowing coil rings (Ion Ranger). */
part('cosmic.ionrifle', [
  { d: blob([-3, 10, 2.6, 10, 3.4, 0, 3, -8, -1, -8, -3, 0], 0.6), zone: 'cloth3' },
  { d: rrect(-1.8, -42, 3.6, 36, 1.6), zone: 'metal2', line: 1.8 },
  { d: join(...[-36, -29, -22, -15].map((y) => rrect(-3.4, y, 6.8, 3, 1.4))), zone: 'glow', line: 1.2, shade: false },
  { d: rrect(2.4, -10, 3, 6, 1.2), zone: 'metal2', line: 1.2 },
]);
/** Graviton halberd: a long haft, an axe blade and a floating gravity orb in the head. */
part('cosmic.halberd', [
  { d: limb(0, 22, 1.5, 0, -62, 1.3), zone: 'metal2' },
  { d: blob([-1, -50, -12, -47, -9, -42, -13, -36, -1, -38], 0.3), zone: 'team', banner: true, line: 1.6 },
  { d: blob([0, -64, 12, -70, 16, -60, 12, -50, 0, -54], 0.6), zone: 'metal' },
  { d: poly([-2, -62, 0, -76, 2, -62]), zone: 'metal', line: 1.4 },
  { d: circle(-7, -64, 4.4), zone: 'cloth2', line: 1.6 },
  { d: circle(-8, -65.4, 1.6), zone: 'white', line: 0, shade: false, light: false },
]);
/** Beacon staff: a tall staff holding a floating beacon crystal (Starwarden). */
part('cosmic.beaconstaff', [
  { d: limb(0, 18, 1.4, 0, -44, 1.2), zone: 'metal2' },
  { d: arcBand(0, -52, 5.6, 7.4, 200, 340), zone: 'metal', line: 1.2 },
  { d: ngon(0, -56, 4, 5.4, 0), zone: 'glow', line: 1.6, shade: false },
  { d: circle(-1, -57.6, 1.4), zone: 'white', line: 0, shade: false, light: false },
]);
/** A starry-lined cloak flowing behind the body (Warp Stalker). */
part('cosmic.cloak', [
  { d: blob([-4, -22, -10, -18, -14, 0, -15, 22, -8, 26, -1, 10, 2, -12], 0.7), zone: 'cloth' },
  { d: blob([-5, -16, -9, -10, -12, 8, -12, 20, -8, 22, -4, 6], 0.7), zone: 'team', banner: true, line: 0 },
  { d: join(star(-13, 4, 4, 0.6, 2, 0), star(-9, 14, 4, 0.5, 1.6, 0), star(-15, 16, 4, 0.5, 1.4, 0)), zone: 'white', line: 0, shade: false, light: false },
]);
/** Warp Stalker's twin wrist blades. */
part('cosmic.claw', [
  { d: rrect(-2.4, -6, 4.8, 10, 2), zone: 'metal2' },
  { d: join(poly([-2, -6, -1, -24, 1, -6]), poly([1, -6, 4, -20, 3, -6])), zone: 'glow', line: 1.2, shade: false },
]);

// ---------------------------------------------------------------------------------------------
// Hover Tank: a low wedge hull on glowing hover pads, no wheels (vehicle rig, 1x).

part('cosmic.hover.hull', [
  { d: blob([-31, 0, -29, -16, -16, -24, 20, -22, 34, -8, 32, 2, 18, 6, -22, 6], 0.5), zone: 'cloth3' },
  { d: blob([-26, -8, 27, -8, 30, -2, -27, -2], 0.4), zone: 'team', banner: true },
  { d: join(rect(-16, -20, 30, 2), rect(-24, -14, 44, 1.6)), zone: 'metal2', line: 0, shade: false, light: false },
]);
part('cosmic.hover.pad', [
  { d: rrect(-12, -3, 24, 6, 3), zone: 'metal2' },
  { d: ellipse(0, 5, 10, 2.6), zone: 'glow', line: 0, alpha: 0.85, shade: false },
]);
part('cosmic.hover.turret', [
  { d: blob([-14, 0, -12, -12, 4, -16, 16, -10, 18, 0], 0.5), zone: 'metal' },
  { d: rrect(-4, -12, 12, 4, 2), zone: 'glow', line: 1.2, shade: false },
]);
part('cosmic.hover.gun', [
  { d: rrect(0, -3, 28, 6, 2.4), zone: 'metal2' },
  { d: join(rrect(12, -4.2, 3, 8.4, 1.2), rrect(20, -4.2, 3, 8.4, 1.2)), zone: 'glow', line: 1, shade: false },
  { d: rrect(26, -4, 6, 8, 2), zone: 'metal', line: 1.6 },
]);
part('cosmic.hover.flag', [
  { d: limb(0, 0, 1, 0, -52, 0.9), zone: 'metal', line: 1.6 },
  { d: blob([0, -52, 15, -49, 15, -39, 0, -38], 0.3), zone: 'team', banner: true, line: 2, alpha: 0.9 },
]);

// ---------------------------------------------------------------------------------------------
// Mothership: a huge disc ship with a tractor ring, launch bays and team hull stripes (flyer rig,
// origin at its lowest point).

part('cosmic.mother.disc', [
  { d: ellipse(0, 0, 53, 15), zone: 'metal' },
  { d: join(rrect(-50, -3.4, 100, 5, 2.4)), zone: 'team', banner: true, line: 1.4 },
  { d: join(...[-36, -18, 0, 18, 36].map((x) => rrect(x - 4.4, 5, 8.8, 4, 1.6))), zone: 'glow', line: 1, shade: false },
  { d: join(...[-44, -28, 28, 44].map((x) => circle(x, -7, 1.4))), zone: 'metal2', line: 0, shade: false, light: false },
]);
part('cosmic.mother.dome', [
  { d: blob([-30, 0, -26, -14, -10, -24, 10, -24, 26, -14, 30, 0], 0.7), zone: 'cloth3' },
  { d: blob([-14, -6, -10, -16, 4, -18, 12, -12, 10, -6], 0.7), zone: 'glass', line: 1.6, shade: false },
  { d: join(circle(-20, -6, 1.6), circle(20, -6, 1.6)), zone: 'glow', line: 0.8, shade: false, light: false },
]);
part('cosmic.mother.ring', [
  { d: ellipse(0, 0, 20, 6), zone: 'metal2' },
  { d: arcBand(0, 0, 10, 16, 0, 360), zone: 'glow', line: 0, alpha: 0.8, shade: false, light: false },
]);
part('cosmic.mother.pennant', [
  { d: limb(0, 0, 1.2, 0, -44, 1), zone: 'metal2', line: 1.6 },
  { d: blob([0, -44, 16, -41, 10, -37, 16, -33, 0, -30], 0.3), zone: 'team', banner: true, line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Turrets (origin on the mount, facing right)

part('cosmic.turret.pylon', [
  { d: blob([-12, 0, -8, -20, 8, -20, 12, 0], 0.4), zone: 'cloth3' },
  { d: rrect(-10, -8, 20, 3, 1.4), zone: 'glow', line: 1, shade: false },
]);
/** Ion Turret: a compact emitter (pivot at its hinge). */
part('cosmic.turret.ion', [
  { d: rrect(-8, -6, 20, 12, 5), zone: 'metal' },
  { d: rrect(10, -3, 10, 6, 2.4), zone: 'metal2', line: 1.6 },
  { d: circle(20, 0, 3), zone: 'glow', line: 1.2, shade: false },
]);
/** Starburst Gun: a fan of short barrels. */
part('cosmic.turret.starburst', [
  { d: rrect(-8, -8, 16, 16, 5), zone: 'metal' },
  { d: join(limb(4, 0, 1.8, 22, -8, 1.6), limb(4, 0, 1.8, 24, 0, 1.6), limb(4, 0, 1.8, 22, 8, 1.6)), zone: 'metal2', line: 1.6 },
  { d: join(circle(22, -8, 2), circle(24, 0, 2), circle(22, 8, 2)), zone: 'glow', line: 1, shade: false },
]);
/** Starfall Battery: a shard launcher on a dish. */
part('cosmic.turret.dish', [
  { d: blob([-16, -6, -8, -14, 8, -14, 16, -6, 12, 0, -12, 0], 0.6), zone: 'cloth3' },
  { d: rrect(-14, -5, 28, 2.6, 1.2), zone: 'team', banner: true, line: 0, shade: false },
]);
part('cosmic.turret.launcher', [
  { d: rrect(-4, -5, 24, 10, 3), zone: 'metal2' },
  { d: join(poly([16, -4, 26, 0, 16, 4])), zone: 'cloth2', line: 1.4 },
  { d: rrect(4, -6, 4, 12, 1.4), zone: 'glow', line: 1, shade: false },
]);
/** Tachyon Lance: a long prism barrel. */
part('cosmic.turret.lance', [
  { d: rrect(-10, -5, 18, 10, 4), zone: 'metal' },
  { d: poly([6, -4, 40, -1.6, 40, 1.6, 6, 4]), zone: 'crystal', line: 1.6 },
  { d: rect(8, -0.8, 30, 1.6), zone: 'white', line: 0, shade: false, light: false },
]);
part('cosmic.turret.flag', [
  { d: limb(0, 0, 1, 0, -26, 0.9), zone: 'metal', line: 1.6 },
  { d: blob([0, -26, 13, -24, 13, -16, 0, -15], 0.3), zone: 'team', banner: true, line: 2, alpha: 0.9 },
]);

// ---------------------------------------------------------------------------------------------
// Star Ark (base.cosmic): a grounded starship hull with a landing ring. Origin at the gate on the
// ground, extending back to x = -150.

part('cosmic.base.hull', [
  { d: blob([-160, -10, -156, -140, -130, -230, -90, -280, -60, -270, -30, -200, -6, -90, 0, -10], 0.6), zone: 'cloth3' },
  { d: join(rect(-150, -120, 138, 3), rect(-140, -180, 104, 3)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(...[-120, -90, -60].map((x) => rrect(x, -160, 18, 10, 4))), zone: 'glow', line: 1.6, shade: false },
]);
part('cosmic.base.fin', [
  { d: poly([-100, -270, -126, -320, -112, -318, -80, -276]), zone: 'metal' },
  { d: poly([-104, -290, -118, -314, -112, -313, -96, -288]), zone: 'team', banner: true, line: 1.4 },
]);
part('cosmic.base.ring', [
  { d: ellipse(-80, -6, 84, 10), zone: 'metal2' },
  { d: arcBand(-80, -6, 70, 80, 180, 360), zone: 'glow', line: 0, alpha: 0.7, shade: false, light: false },
]);
part('cosmic.base.gate', [
  { d: rrect(-56, -54, 34, 54, 14), zone: 'void' },
  { d: rrect(-52, -50, 26, 46, 11), zone: 'glow', line: 0, alpha: 0.5, shade: false },
  { d: rect(-60, -60, 42, 6), zone: 'metal', line: 2 },
]);
part('cosmic.base.banner', [
  { d: join(blob([-146, -116, -126, -116, -126, -84, -136, -90, -146, -84], 0.3), blob([-110, -176, -92, -176, -92, -150, -101, -155, -110, -150], 0.3)), zone: 'team', banner: true, line: 2 },
]);
part('cosmic.base.flag', [
  { d: limb(0, 0, 1.4, 0, -60, 1.2), zone: 'metal', line: 2 },
  { d: blob([0, -60, 26, -56, 18, -49, 26, -42, 0, -38], 0.3), zone: 'team', banner: true, line: 2.4, alpha: 0.9 },
]);
part('cosmic.base.light', [
  { d: circle(0, 0, 4.6), zone: 'glow', line: 1.4, shade: false },
  { d: circle(-1, -1, 1.6), zone: 'white', line: 0, shade: false, light: false },
]);
part('cosmic.base.ledge', [
  { d: rrect(-20, -6, 40, 7, 3), zone: 'metal' },
  { d: rect(-18, -2, 36, 1.6), zone: 'glow', line: 0, shade: false, light: false },
  { d: join(poly([-14, 1, -8, 1, -11, 9]), poly([8, 1, 14, 1, 11, 9])), zone: 'metal2', line: 2 },
]);
part('cosmic.base.crack1', [{ d: poly([-120, -110, -112, -92, -118, -76, -110, -64, -114, -62, -122, -76, -116, -92, -124, -108]), zone: 'dark', line: 0, shade: false, light: false }]);
part('cosmic.base.crack2', [
  { d: join(poly([-70, -250, -60, -230, -68, -210, -58, -196, -62, -194, -72, -210, -64, -230, -74, -248]), poly([-150, -60, -136, -46, -142, -24, -146, -24, -140, -44, -154, -56])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('cosmic.base.chunk', [{ d: poly([-112, -318, -100, -330, -92, -316]), zone: 'metal' }]);
part('cosmic.base.rubble', [
  { d: join(blob([-30, 0, -26, -10, -16, -12, -10, -4, -12, 0], 0.6), blob([-104, 0, -98, -8, -88, -7, -86, 0], 0.6), blob([-8, 0, -4, -6, 6, -5, 8, 0], 0.6)), zone: 'metal2' },
]);
/** Treasury: an ore crystal, a cargo pod, then the star forge. */
part('cosmic.base.treasury1', [{ d: join(poly([-6, 0, -4, -14, 0, -18, 4, -12, 6, 0]), poly([4, 0, 8, -8, 10, 0])), zone: 'crystal', line: 1.6 }]);
part('cosmic.base.treasury2', [
  { d: rrect(-12, -14, 24, 14, 5), zone: 'metal' },
  { d: rect(-12, -9, 24, 2), zone: 'glow', line: 0, shade: false, light: false },
]);
part('cosmic.base.treasury3', [
  { d: blob([-12, 0, -10, -18, 0, -24, 10, -18, 12, 0], 0.6), zone: 'metal2' },
  { d: circle(0, -12, 5.4), zone: 'glow', line: 1.4, shade: false },
  { d: star(0, -12, 4, 1.4, 4.4, 0), zone: 'white', line: 0, shade: false, light: false },
]);
part('cosmic.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);

// ---------------------------------------------------------------------------------------------
// W8 Cosmic wave (CONTENT_PLAN 5.8): procedural fallbacks for the new cards (the 3D sheets replace them).

part('cosmic.crystalfist', [
  { d: blob([-6, 2, -7, -6, -2, -12, 6, -11, 8, -4, 5, 3], 0.4), zone: 'crystal', line: 1.6 },
  { d: blob([-2, -8, 2, -10, 4, -6, 0, -4], 0.4), zone: 'white', line: 0, shade: false, light: false },
]);
part('cosmic.crystalslab', [
  { d: poly([-6, -16, 6, -18, 8, 10, -4, 14]), zone: 'crystal', line: 1.8 },
  { d: poly([-4, -12, 5, -13, 6, 7, -3, 10]), zone: 'team', banner: true, line: 0 },
  { d: star(1, -2, 5, 1.2, 3.2, 0), zone: 'white', line: 0, shade: false, light: false },
]);
part('cosmic.board', [
  { d: rrect(-24, -3, 48, 5, 2.4), zone: 'cloth2' },
  { d: rrect(-18, -3, 36, 2, 1), zone: 'team', banner: true, line: 0 },
  { d: join(ellipse(-12, 3, 5, 1.6), ellipse(12, 3, 5, 1.6)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('cosmic.orb', [
  { d: circle(0, -4, 4.6), zone: 'glow', line: 1.4, shade: false },
  { d: circle(-1.2, -5.4, 1.6), zone: 'white', line: 0, shade: false, light: false },
]);
part('cosmic.cannon', [
  { d: rrect(-4, -4, 34, 7, 3), zone: 'cloth2' },
  { d: rrect(2, -5, 14, 9, 3), zone: 'team', banner: true, line: 1.4 },
  { d: circle(6, -7, 3), zone: 'glow', line: 1, shade: false },
]);
part('cosmic.mortar', [
  { d: poly([-4, -4, 22, -6, 26, -9, 26, 6, 22, 4, -4, 4]), zone: 'cloth3' },
  { d: rect(4, -5, 3, 10), zone: 'team', banner: true, line: 0 },
  { d: join(rect(10, -5, 1.4, 10), rect(14, -5, 1.4, 10)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('cosmic.bug.body', [
  { d: ellipse(-14, -6, 15, 12), zone: 'team', banner: true },
  { d: ellipse(6, -4, 13, 8), zone: 'cloth2' },
  { d: join(circle(-18, -8, 2), circle(-10, -2, 1.6)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('cosmic.bug.leg', [{ d: join(limb(0, 0, 1.6, 6, -10, 1.4), limb(6, -10, 1.4, 10, 14, 1)), zone: 'cloth2', line: 1.4 }]);
part('cosmic.bug.head', [
  { d: ellipse(4, -2, 8, 7), zone: 'cloth2' },
  { d: ellipse(8, -3, 4, 3.4), zone: 'void', line: 1, shade: false },
  { d: join(poly([10, 2, 15, 6, 11, 5]), poly([8, 3, 12, 8, 8, 6])), zone: 'cloth3', line: 1 },
]);
part('cosmic.whale.body', [
  { d: blob([-70, -6, -50, -22, -10, -34, 30, -30, 54, -14, 56, 4, 30, 14, -20, 14, -60, 6], 0.6), zone: 'cloth2' },
  { d: blob([-40, 6, 0, 12, 40, 6, 50, 0, 30, 10, -30, 12], 0.5), zone: 'cloth3' },
  { d: blob([-30, -32, 0, -38, 10, -30, -20, -26], 0.5), zone: 'team', banner: true, line: 1.4 },
  { d: blob([-90, -24, -70, -8, -90, 8, -80, -8], 0.4), zone: 'team', banner: true, line: 1.6 },
]);
part('cosmic.whale.fin', [{ d: poly([0, 0, -10, 10, -26, 22, -30, 18, -14, 4]), zone: 'team', banner: true, line: 1.6 }]);
part('cosmic.whale.rider', [
  { d: ellipse(0, -6, 4, 5), zone: 'team', banner: true },
  { d: circle(1, -15, 5.4), zone: 'glass', line: 1.4 },
  { d: limb(-1, -20, 0.7, -3, -26, 0.6), zone: 'glow', line: 0.8, shade: false },
]);
part('cosmic.fighter.body', [
  { d: blob([-22, -3, -14, -12, 10, -12, 24, -3, 12, 7, -18, 6], 0.6), zone: 'cloth3' },
  { d: poly([-6, -2, -16, -14, -22, -14, -14, -2]), zone: 'team', banner: true, line: 1.4 },
  { d: blob([-8, 0, 6, 0, 2, 8, -10, 6], 0.5), zone: 'team', banner: true, line: 1.4 },
  { d: ellipse(4, -8, 6, 3.4), zone: 'glass', line: 1.2, shade: false },
  { d: poly([-22, -1, -27, -2, -27, 1.5, -22, 1.5]), zone: 'white', line: 0, shade: false, light: false },
]);
part('cosmic.rock.body', [
  { d: blob([-16, 0, -18, -18, -10, -30, 8, -32, 18, -20, 16, 0], 0.4), zone: 'metal2' },
  { d: blob([-8, -26, 8, -26, 10, -12, -6, -12], 0.5), zone: 'team', banner: true, line: 1.4 },
  { d: join(limb(4, -6, 0.8, 8, -14, 0.6), limb(-10, -10, 0.8, -6, -18, 0.6)), zone: 'glow', line: 0, shade: false, light: false },
]);
part('cosmic.turret.shards', [
  { d: join(poly([-8, 4, -6, -10, -2, 4]), poly([-2, 4, 2, -14, 6, 4]), poly([4, 4, 10, -8, 12, 4])), zone: 'crystal', line: 1.6 },
  { d: rrect(-10, 2, 24, 5, 2), zone: 'metal2' },
]);
part('cosmic.turret.horizon', [
  { d: ellipse(0, -8, 16, 8), zone: 'void', line: 1.8 },
  { d: arcBand(0, -8, 9, 13, 0, 360), zone: 'glow', line: 0, alpha: 0.8, shade: false, light: false },
  { d: rrect(-14, -2, 28, 4, 2), zone: 'team', banner: true, line: 0 },
]);
