/**
 * Gunpowder Age parts (DESIGN A11 palette: bottle green, cream, dark wood, brass accent). Authored in
 * lu at infantry scale with pivots at joints and grips; hand-held weapons point up (-y) from the grip.
 * Bronze and brass are muted (aged metal) on large areas so they stay under the colour rule; the
 * bright brass accent is kept to buttons, bands and trims.
 */
import { arcBand, blob, circle, ellipse, join, limb, poly, rect, rrect, star } from '../svg';
import { part } from './registry';
import { headLayers, hipsShape, tabardShape, torsoShape } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** Cream shirt, open green waistcoat and a team sash across the chest (Corsair). */
part('gunpowder.torso.pirate', [
  { d: torsoShape(1.04), zone: 'cloth2' },
  { d: join(poly([-2.4, -21.6, 3.6, -20.4, 6.2, -9, 2, -6.4, 1, -14]), poly([-10.4, -8, -8.6, -17.6, -4.6, -21, -3.6, -12, -6, 2.4, -9.6, 1.6])), zone: 'cloth' },
  { d: join(rect(-8, -16, 16, 1.4), rect(-9, -11, 18, 1.4), rect(-9.4, -6, 19, 1.4)), zone: 'cloth2', line: 0, shade: false, light: false },
  { d: limb(-8.6, -18, 3.6, 8.8, -2, 3.6), zone: 'team', banner: true },
]);

/** Team coat with cream facings and crossbelts (Fusilier, Grenadier). */
part('gunpowder.torso.coat', [
  { d: tabardShape(1.04, 6), zone: 'team', banner: true },
  { d: blob([2, -21, 7.6, -18.6, 9.6, -10, 9.4, 1, 5.6, 1.4, 4.6, -10, 2, -17], 0.7), zone: 'cloth2' },
  { d: join(limb(-7, -20, 1.4, 7, 1, 1.4), limb(7, -20, 1.4, -6, 1, 1.4)), zone: 'cloth2', line: 1.6 },
  { d: join(circle(7, -14, 1), circle(7.4, -9, 1), circle(7.4, -4, 1), circle(0, -9.6, 1.6)), zone: 'accent', line: 0.8, shade: false, light: false },
]);

/** Surgeon: team coat under a cream apron. */
part('gunpowder.torso.surgeon', [
  { d: tabardShape(1.04, 6), zone: 'team', banner: true },
  { d: blob([1, -20, 8, -18, 10.4, -8, 10.4, 5, 3, 5.4, 1.6, -8], 0.7), zone: 'apron' },
  { d: limb(1.6, -20.4, 0.7, 7.6, -18, 0.7), zone: 'rope', line: 1.2 },
  { d: join(rrect(4.6, -12, 1.8, 6, 0.6), rrect(2.6, -10, 6, 1.8, 0.6)), zone: 'mark', line: 0, shade: false, light: false },
]);

/** Cuirass (breastplate) over a team coat (Cuirassier). */
part('gunpowder.torso.cuirass', [
  { d: tabardShape(1.04, 5), zone: 'team', banner: true },
  { d: blob([-8, -3, -9.4, -12, -7, -19.6, 2, -21.6, 9, -18, 10.6, -9, 9, -3, 0, -1.6], 0.8), zone: 'metal' },
  { d: join(circle(-5, -15, 0.9), circle(6, -15, 0.9), circle(-6, -5, 0.9), circle(7, -5, 0.9)), zone: 'accent', line: 0, shade: false, light: false },
]);

part('gunpowder.pelvis.sash', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: rrect(-10.2, -5, 20.6, 4.4, 2), zone: 'team', banner: true, line: 2 },
  { d: blob([-9, -2, -12, 4, -10, 9, -7, 3], 0.6), zone: 'team', banner: true, line: 1.8 },
]);
part('gunpowder.pelvis.breeches', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: rrect(-10, -4.8, 20.4, 3.2, 1.6), zone: 'leather', line: 2 },
  { d: rrect(4, -5, 3.4, 3.8, 0.8), zone: 'accent', line: 1, shade: false, light: false },
]);
part('gunpowder.pelvis.coat', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: blob([-10, -4, -12.4, 8, -9, 12, -5, 6, -4, -2], 0.7), zone: 'team', banner: true },
  { d: rrect(-10, -4.8, 20.4, 3.2, 1.6), zone: 'cloth2', line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Heads and headgear

part('gunpowder.head.pirate', headLayers({ nose: 'big', brow: 'angry', mouth: 'teeth', jaw: 1.4 }));
part('gunpowder.head.soldier', headLayers({ nose: 'round', brow: 'calm', mouth: 'flat' }));
part('gunpowder.head.grenadier', headLayers({ nose: 'pointy', brow: 'angry', mouth: 'grin' }));
part('gunpowder.head.doctor', headLayers({ nose: 'big', brow: 'worried', mouth: 'o' }));
part('gunpowder.head.admiral', headLayers({ nose: 'round', brow: 'angry', mouth: 'frown', jaw: 1 }));

/** Team bandana with trailing knot and a gold earring (Corsair). */
part('gunpowder.bandana', [
  { d: blob([-12, -16, -16, -11, -17, -5, -14, -6, -13, -11], 0.7), zone: 'team', banner: true, line: 2.2 },
  { d: blob([-12.6, -13.6, -11.6, -22, -4, -27, 5, -27, 11.6, -22.6, 13.6, -17.6, 6, -18.6, -2, -18, -9, -13], 0.8), zone: 'team', banner: true },
  { d: join(circle(-2, -24, 1.1), circle(4, -23.6, 1.1), circle(-6, -19, 1.1)), zone: 'cloth2', line: 0, shade: false, light: false },
]);
part('gunpowder.eyepatch', [
  { d: limb(-10, -19, 0.7, 12.4, -8.6, 0.7), zone: 'dark', line: 0.8, shade: false, light: false },
  { d: ellipse(7.2, -13, 3, 3.4), zone: 'dark', line: 1.2, shade: false, light: false },
]);
part('gunpowder.earring', [{ d: arcBand(-3.8, -5.6, 1.4, 2.4, 0, 360), zone: 'accent', line: 0.8, shade: false, light: false }]);

/** Tricorne hat with a brass-trimmed brim (Fusilier, Field Surgeon). */
part('gunpowder.tricorne', [
  { d: blob([-15, -18, -10, -28, 0, -31, 9, -28, 16, -18, 9, -21, 0, -20, -8, -21], 0.7), zone: 'hat' },
  { d: join(limb(-14.6, -18.4, 1.1, -9, -21, 1.1), limb(9, -21, 1.1, 15.6, -18.4, 1.1)), zone: 'accent', line: 1, shade: false, light: false },
  { d: circle(10, -22.6, 2.2), zone: 'team', banner: true, line: 1.4, shade: false },
]);
/** Bicorne with a team cockade (Balloon Admiral). */
part('gunpowder.bicorne', [
  { d: blob([-19, -20, -12, -27, 0, -31, 12, -27, 19, -20, 10, -22, 0, -21, -10, -22], 0.7), zone: 'hat' },
  { d: limb(-17, -20.6, 1, 17, -20.6, 1), zone: 'accent', line: 1, shade: false, light: false },
  { d: circle(3, -26, 3), zone: 'team', banner: true, line: 1.4, shade: false },
]);
/** Grenadier mitre cap: a tall front plate in team colour with a brass badge. */
part('gunpowder.mitre', [
  { d: blob([-12.6, -16, -11, -30, -4, -44, 2, -46, 6, -40, 12, -18, 0, -18.6], 0.7), zone: 'team', banner: true },
  { d: blob([0.6, -40, 5, -41, 11, -19, 6, -19], 0.6), zone: 'cloth2', line: 1.6 },
  { d: star(5.6, -29, 6, 1.6, 3.4), zone: 'accent', line: 1.2, shade: false },
  { d: circle(1.6, -46, 2.4), zone: 'cloth2', line: 1.4 },
]);
/** Cuirassier helmet with a crest and a team horsehair plume. */
part('gunpowder.helmet.crest', [
  { d: blob([-4, -30, -10, -30, -18, -24, -22, -14, -18, -12, -12, -22], 0.6), zone: 'team', banner: true },
  { d: blob([-12.4, -12, -12, -22, -6, -28, 2, -29.4, 9.6, -26, 13.6, -18, 14, -13, 1, -15, -10, -11], 0.8), zone: 'metal' },
  { d: blob([-6, -28.6, -2, -33, 6, -33, 10, -27], 0.7), zone: 'accent', line: 1.8, shade: false },
  { d: rrect(-12.6, -17.4, 27.4, 3, 1.4), zone: 'metal2', line: 2 },
]);
part('gunpowder.hair.queue', [
  { d: blob([-12, -8, -13, -17, -9.6, -23.6, -2, -26, 6, -25, 11.6, -21, 12.6, -16, 6, -19, -2, -19, -7, -14, -8, -8], 0.8), zone: 'hair' },
  { d: limb(-12, -12, 2.2, -15, -3, 1.6), zone: 'hair', line: 2 },
]);
part('gunpowder.moustache', [{ d: blob([6, -8.6, 10, -9.4, 14, -8, 15.6, -5.6, 12, -6.6, 9, -6], 0.7), zone: 'hair', line: 1.6 }]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

part('gunpowder.cutlass', [
  { d: blob([-2, -4, 2.4, -4, 5, -14, 6.2, -24, 3.6, -30, 2.4, -24, -0.4, -14], 0.6), zone: 'metal' },
  { d: arcBand(0, -1.4, 4, 5.6, 110, 250), zone: 'accent', line: 1.4, shade: false },
  { d: rrect(-1.6, -4, 3.2, 8, 1.6), zone: 'leather', line: 1.8 },
]);
/** Boarding hook on a coil of rope (held in the back hand; thrown in the ability). */
part('gunpowder.hook', [
  { d: arcBand(0, 2, 3.6, 5.6, 0, 360), zone: 'rope', line: 1.4 },
  { d: join(limb(0, -3, 1.1, 0, -12, 1.1), arcBand(4, -12, 3, 5, 180, 360), poly([8.6, -12, 10, -7, 6.6, -11])), zone: 'metal', line: 1.6 },
]);
/** Flintlock musket: long barrel pointing up from the grip at the stock's wrist. */
part('gunpowder.musket', [
  { d: blob([-2.6, 14, 2.2, 14, 3, 4, 2, -8, -1.2, -8, -2.4, 4], 0.6), zone: 'wood' },
  { d: rrect(-1.1, -44, 2.2, 38, 1.1), zone: 'metal2', line: 1.8 },
  { d: rrect(-1.6, -30, 3.2, 26, 1.4), zone: 'wood', line: 1.6 },
  { d: join(rect(-1.8, -26, 3.6, 1.4), rect(-1.8, -14, 3.6, 1.4)), zone: 'accent', line: 0, shade: false, light: false },
  { d: poly([2.2, -2, 5, -4, 4.6, 0]), zone: 'metal2', line: 1.2 },
]);
part('gunpowder.pistol', [
  { d: blob([-1.6, 4, 2, 4, 3, -2, 0.6, -2], 0.6), zone: 'wood', line: 1.6 },
  { d: rrect(-0.8, -12, 2, 11, 1), zone: 'metal2', line: 1.4 },
  { d: rect(-1, -3, 2.4, 1.2), zone: 'accent', line: 0, shade: false, light: false },
]);
/** A grenade with a lit fuse (held in the throwing hand). */
part('gunpowder.grenade', [
  { d: circle(0, -4, 4.6), zone: 'iron', line: 2 },
  { d: rrect(-1.2, -10, 2.4, 2.4, 0.8), zone: 'metal2', line: 1 },
  { d: limb(0, -10, 0.5, 2, -13, 0.5), zone: 'rope', line: 0.8 },
  { d: star(2.4, -13.6, 5, 0.8, 2), zone: 'spark', line: 0.8, shade: false, light: false },
]);
part('gunpowder.medbag', [
  { d: rrect(-6, -2, 12, 9, 2.4), zone: 'leather' },
  { d: blob([-5, -2, -3, -5, 3, -5, 5, -2], 0.7), zone: 'leather', line: 1.6 },
  { d: join(rrect(-0.9, 0, 1.8, 5.6, 0.5), rrect(-2.8, 1.9, 5.6, 1.8, 0.5)), zone: 'apron', line: 0, shade: false, light: false },
]);
part('gunpowder.sabre', [
  { d: blob([-1.6, -4, 2, -4, 3.2, -18, 2.4, -34, 0, -40, -0.6, -34, 0.4, -18], 0.6), zone: 'metal' },
  { d: arcBand(0.2, -1.6, 4.4, 5.8, 100, 260), zone: 'accent', line: 1.4, shade: false },
  { d: rrect(-1.5, -4, 3, 8, 1.5), zone: 'leather', line: 1.6 },
]);
part('gunpowder.telescope', [
  { d: join(rrect(-1.8, -14, 3.6, 14, 1.4), rrect(-1.4, -20, 2.8, 7, 1.2)), zone: 'metal2', line: 1.6 },
  { d: join(rect(-1.9, -12, 3.8, 1.4), rect(-1.9, -4, 3.8, 1.4)), zone: 'accent', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Cuirassier's horse extras (the horse parts are shared with the Medieval set)

/** Shabraque: a team saddle cloth with a brass-trimmed edge. */
part('gunpowder.horse.shabraque', [
  { d: blob([-14, -15, 8, -16, 12, -12, 12, 6, 6, 10, -12, 10, -16, 4], 0.7), zone: 'team', banner: true },
  { d: join(rect(-14, 5, 25, 1.6), rect(10, -12, 1.6, 17)), zone: 'accent', line: 0, shade: false, light: false },
]);
part('gunpowder.horse.bridle', [
  { d: join(limb(8, -26, 0.8, 22, -18, 0.8), limb(18, -30, 0.8, 20, -16, 0.8)), zone: 'leather', line: 1.4 },
  { d: circle(21.4, -17.4, 1.4), zone: 'accent', line: 0.8, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Bronze Cannon (vehicle rig: hull = carriage, wheel, barrel) and its gunner

part('gunpowder.cannon.carriage', [
  { d: poly([-30, -6, -26, -12, 8, -24, 14, -22, 12, -14, -24, -2]), zone: 'wood' },
  { d: join(rect(-16, -12, 2, 8), rect(-4, -18, 2, 8)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: rrect(-32, -7, 8, 7, 2), zone: 'wood2', line: 2 },
  { d: blob([-2, -24, 6, -30, 14, -28, 14, -20, 4, -18], 0.7), zone: 'wood' },
]);
/** Barrel (pivot at the trunnion), aged bronze with brass bands, pointing +x. */
part('gunpowder.cannon.barrel', [
  { d: blob([-16, -5, -12, -7.6, 26, -5.4, 30, -6.4, 30, 6.4, 26, 5.4, -12, 7.6, -16, 5], 0.6), zone: 'bronze' },
  { d: circle(-18, 0, 3.6), zone: 'bronze', line: 2 },
  { d: join(rect(-8, -7.4, 3, 14.8), rect(12, -6.4, 2.6, 12.8), rect(25, -6, 2.4, 12)), zone: 'accent', line: 0, shade: false, light: false },
  { d: ellipse(30, 0, 1.6, 4.6), zone: 'dark', line: 1, shade: false, light: false },
]);
part('gunpowder.cannon.wheel', [
  { d: circle(0, 0, 14), zone: 'wood' },
  { d: arcBand(0, 0, 9.6, 11.4, 0, 360), zone: 'wood2', line: 0, shade: false, light: false },
  { d: join(rect(-10, -1, 20, 2), rect(-1, -10, 2, 20), poly([-7.4, -6, -6, -7.4, 7.4, 6, 6, 7.4]), poly([6, -7.4, 7.4, -6, -6, 7.4, -7.4, 6])), zone: 'wood2', line: 0, shade: false, light: false },
  { d: circle(0, 0, 3.2), zone: 'metal2', line: 1.4, shade: false },
  { d: arcBand(0, 0, 13.4, 15, 0, 360), zone: 'metal2', line: 1.2, shade: false, light: false },
]);
/** Gunner bust behind the cannon, with a rammer. */
part('gunpowder.cannon.gunner', [
  { d: limb(10, 4, 1.2, 14, -34, 1.2), zone: 'wood', line: 1.8 },
  { d: rrect(10.4, -38, 7.6, 5, 2), zone: 'fur', line: 1.6 },
  { d: blob([-8, 6, -9, -8, -6, -15, 6, -15, 9, -8, 8, 6], 0.7), zone: 'team', banner: true },
  { d: join(limb(-6, -14, 1.2, 6, 4, 1.2)), zone: 'cloth2', line: 1.4 },
  { d: circle(1, -23, 8.4), zone: 'skin' },
  { d: blob([-9, -24, -8, -31, 0, -34, 8, -31, 10, -25, 4, -28, -3, -27], 0.7), zone: 'hat' },
  { d: join(ellipse(4.2, -23.6, 1.8, 2.3), ellipse(7.8, -23.6, 1.5, 2)), zone: 'eye', line: 1, shade: false, light: false },
  { d: join(circle(4.9, -23.2, 1.05), circle(8.3, -23.2, 0.9)), zone: 'pupil', line: 0, shade: false, light: false },
  { d: blob([6, -19.4, 10.6, -20, 12.4, -17, 9, -17.6], 0.7), zone: 'hair', line: 1.2 },
  { d: join(limb(4, -10, 2.4, 13, -12, 2), circle(13.4, -12.4, 2.6)), zone: 'skin', line: 2 },
]);
part('gunpowder.cannon.pennant', [
  { d: limb(0, 0, 1.2, 0, -24, 1.2), zone: 'wood', line: 2 },
  { d: blob([0, -24, 13, -21, 8, -18, 13, -14, 0, -12], 0.3), zone: 'team', banner: true, line: 2.2 },
]);

// ---------------------------------------------------------------------------------------------
// Balloon Admiral (flyer rig: body = balloon, gondola, hatch)

/** Envelope with team gores and cream panels (pivot at the envelope's bottom centre). */
part('gunpowder.balloon.envelope', [
  { d: blob([0, 0, -26, -10, -44, -40, -46, -76, -30, -104, 0, -114, 30, -104, 46, -76, 44, -40, 26, -10], 0.9), zone: 'cloth2' },
  {
    d: join(
      blob([0, 0, -14, -8, -22, -40, -22, -80, -12, -110, 0, -114, -6, -84, -8, -40], 0.7),
      blob([0, 0, 12, -8, 22, -40, 24, -80, 16, -108, 6, -113, 12, -80, 10, -40], 0.7),
      blob([-30, -18, -40, -40, -44, -70, -38, -94, -34, -70, -32, -40], 0.7),
      blob([30, -18, 38, -40, 42, -70, 36, -94, 34, -70, 32, -40], 0.7),
    ),
    zone: 'team',
    banner: true,
    line: 0,
  },
  { d: join(rect(-40, -60, 80, 2.4), rect(-44, -76, 88, 2)), zone: 'accent', line: 0, shade: false, light: false },
]);
part('gunpowder.balloon.ropes', [
  { d: join(limb(-24, -12, 0.7, -16, 16, 0.7), limb(24, -12, 0.7, 16, 16, 0.7), limb(-8, -2, 0.7, -6, 16, 0.7), limb(8, -2, 0.7, 6, 16, 0.7)), zone: 'rope', line: 1.2 },
]);
/** Gondola (pivot at its top centre). */
part('gunpowder.balloon.gondola', [
  { d: blob([-22, 0, 22, 0, 20, 18, 12, 24, -12, 24, -20, 18], 0.6), zone: 'wood' },
  { d: join(rect(-21, 6, 42, 1.6), rect(-20, 13, 40, 1.6)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: rrect(-23, -2, 46, 4, 2), zone: 'wood2', line: 2 },
  { d: join(circle(-12, 9, 2.4), circle(12, 9, 2.4)), zone: 'accent', line: 1, shade: false, light: false },
]);
part('gunpowder.balloon.hatch', [{ d: rrect(-8, 0, 16, 3, 1.4), zone: 'wood2', line: 1.6 }]);
part('gunpowder.balloon.bomb', [
  { d: circle(0, 6, 4.6), zone: 'iron', line: 1.8 },
  { d: rrect(-1, 0, 2, 2.4, 0.6), zone: 'metal2', line: 0.8 },
]);
/** The Admiral in the gondola: bicorne, epaulettes, telescope. */
part('gunpowder.balloon.admiral', [
  { d: blob([-9, 8, -10, -6, -6, -13, 7, -13, 10, -6, 9, 8], 0.7), zone: 'team', banner: true },
  { d: join(blob([-10, -12, -6, -15, -2, -12, -6, -9], 0.6), blob([2, -12, 7, -15, 11, -12, 7, -9], 0.6)), zone: 'accent', line: 1.2 },
  { d: join(limb(3, -12, 0.8, 2, 8, 0.8)), zone: 'cloth2', line: 1.2 },
  { d: circle(1, -22, 9), zone: 'skin' },
  { d: blob([-15, -26, -9, -33, 1, -36, 11, -33, 16, -26, 9, -28, 1, -27, -8, -28], 0.7), zone: 'hat' },
  { d: circle(3, -32, 2.6), zone: 'accent', line: 1.2, shade: false },
  { d: join(ellipse(4.6, -22.6, 1.8, 2.3), ellipse(8.4, -22.6, 1.5, 2)), zone: 'eye', line: 1, shade: false, light: false },
  { d: join(circle(5.3, -22.2, 1.05), circle(8.9, -22.2, 0.9)), zone: 'pupil', line: 0, shade: false, light: false },
  { d: blob([3, -17.6, 8, -18.4, 13, -17, 14, -15, 10, -16, 6, -15.6], 0.7), zone: 'hair', line: 1.2 },
  { d: poly([2.4, -26.6, 10.6, -25.4, 10.4, -24, 2.6, -25]), zone: 'hair', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Turrets (pivot at the mount point; see rigs/turret.ts)

part('gunpowder.turret.post', [
  { d: join(limb(0, 0, 3.4, 0, -20, 3)), zone: 'wood' },
  { d: rrect(-16, -3, 32, 5, 2.4), zone: 'stone' },
  { d: rrect(-6, -24, 12, 6, 2), zone: 'metal2', line: 2 },
]);
/** Swivel gun: short barrel on a yoke, pointing +x (pivot at the yoke pin). */
part('gunpowder.turret.swivel', [
  { d: rrect(-12, -3.6, 30, 7.2, 3), zone: 'metal2' },
  { d: join(rect(-4, -4, 2.4, 8), rect(10, -4, 2.4, 8)), zone: 'accent', line: 0, shade: false, light: false },
  { d: limb(-12, 0, 1.4, -20, 4, 1.4), zone: 'wood', line: 1.8 },
  { d: arcBand(0, 0, 4.6, 6.4, 20, 160), zone: 'metal2', line: 1.4 },
]);
part('gunpowder.turret.gabion', [
  { d: rrect(-18, -16, 20, 16, 4), zone: 'wicker' },
  { d: join(rect(-17, -12, 18, 1.4), rect(-17, -7, 18, 1.4), rect(-17, -3, 18, 1.4)), zone: 'wicker2', line: 0, shade: false, light: false },
]);
part('gunpowder.turret.sled', [
  { d: poly([-18, 0, -16, -12, 14, -14, 18, 0]), zone: 'wood' },
  { d: join(circle(-10, -2, 4), circle(10, -2, 4)), zone: 'wood2', line: 2 },
]);
/** Grapeshot gun: short fat barrel with a flared mouth. */
part('gunpowder.turret.grapeshot', [
  { d: blob([-12, -6, 10, -5, 16, -8.6, 18, 0, 16, 8.6, 10, 5, -12, 6, -15, 0], 0.6), zone: 'bronze' },
  { d: join(rect(-4, -6, 2.4, 12), rect(6, -5.4, 2.4, 10.8)), zone: 'accent', line: 0, shade: false, light: false },
  { d: ellipse(18, 0, 1.6, 7), zone: 'dark', line: 1, shade: false, light: false },
]);
/** Congreve rack: a frame of four rockets (pivot at the frame hinge, rockets pointing +x). */
part('gunpowder.turret.rackFrame', [
  { d: join(limb(-14, 0, 2.2, -8, -26, 2), limb(12, 0, 2.2, 4, -26, 2), limb(-11, -12, 1.6, 8, -12, 1.6)), zone: 'wood' },
  { d: rrect(-18, -3, 36, 5, 2.4), zone: 'wood2' },
]);
part('gunpowder.turret.rockets', [
  { d: rrect(-16, -12, 34, 22, 2), zone: 'wood2' },
  ...[-7.6, -2.6, 2.4, 7.4].map((y) => ({ d: join(rrect(-12, y - 1.8, 26, 3.6, 1.8), poly([14, y - 1.8, 19, y, 14, y + 1.8])), zone: 'rocket', line: 1.4 })),
  { d: join(rect(-2, -12, 2, 22), rect(8, -12, 2, 22)), zone: 'accent', line: 0, shade: false, light: false },
]);
/** Chainshot cannon: long naval gun on a truck carriage. */
part('gunpowder.turret.truck', [
  { d: poly([-18, -2, -16, -14, 16, -14, 18, -2]), zone: 'wood' },
  { d: join(circle(-11, -2, 4.4), circle(11, -2, 4.4)), zone: 'wood2', line: 2 },
  { d: rect(-16, -10, 32, 1.6), zone: 'wood2', line: 0, shade: false, light: false },
]);
part('gunpowder.turret.longgun', [
  { d: blob([-16, -5.6, 30, -4, 34, -5.4, 34, 5.4, 30, 4, -16, 5.6, -20, 0], 0.6), zone: 'iron' },
  { d: join(rect(-6, -5.4, 2.4, 10.8), rect(14, -4.6, 2.4, 9.2)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(limb(20, -9, 0.7, 34, -9, 0.7), circle(18, -9, 2.2), circle(36, -9, 2.2)), zone: 'iron', line: 1.2 },
]);
part('gunpowder.turret.flag', [
  { d: limb(0, 0, 1.3, 0, -26, 1.3), zone: 'wood', line: 2.2 },
  { d: blob([0, -26, 13, -26, 13, -15, 0, -15], 0.3), zone: 'team', banner: true, line: 2.2 },
  { d: join(rect(0, -21.6, 13, 2.2), rect(5.4, -26, 2.2, 11)), zone: 'cloth2', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Star Fort (base.gunpowder). Origin at the gate on the ground, extending back to x = -150.

part('gunpowder.base.rampart', [
  { d: poly([-160, 0, -150, -120, -110, -134, -60, -134, -24, -120, -4, 0]), zone: 'stone' },
  { d: poly([-150, -120, -110, -134, -60, -134, -24, -120, -26, -112, -60, -124, -110, -124, -148, -112]), zone: 'grass' },
  { d: join(rect(-140, -90, 100, 3), rect(-146, -50, 128, 3), rect(-150, -20, 140, 3)), zone: 'stone2', line: 0, shade: false, light: false },
]);
part('gunpowder.base.keep', [
  { d: join(rrect(-120, -206, 70, 78, 3), poly([-126, -206, -85, -236, -44, -206])), zone: 'plaster' },
  { d: poly([-128, -204, -85, -240, -42, -204, -48, -200, -85, -228, -122, -200]), zone: 'roof' },
  { d: join(rrect(-110, -186, 10, 16, 5), rrect(-90, -186, 10, 16, 5), rrect(-70, -186, 10, 16, 5)), zone: 'glow', line: 2 },
  { d: join(rect(-120, -150, 70, 3)), zone: 'wood2', line: 0, shade: false, light: false },
]);
part('gunpowder.base.gate', [
  { d: blob([-66, 0, -66, -40, -58, -52, -46, -52, -38, -40, -38, 0], 0.6), zone: 'dark' },
  { d: join(rect(-64, -40, 24, 40)), zone: 'wood', line: 2 },
  { d: join(rect(-64, -30, 24, 2), rect(-64, -14, 24, 2), rect(-53, -40, 2, 40)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: arcBand(-52, -40, 14, 18, 180, 360), zone: 'stone2', line: 2 },
]);
part('gunpowder.base.embrasure', [
  { d: rrect(-14, -8, 28, 12, 3), zone: 'stone2' },
  { d: rrect(-6, -5, 12, 7, 2), zone: 'dark', line: 1.4 },
]);
part('gunpowder.base.cannon', [
  { d: blob([-6, -3.4, 18, -2.6, 20, -3.4, 20, 3.4, 18, 2.6, -6, 3.4], 0.6), zone: 'iron', line: 2 },
]);
part('gunpowder.base.ledge', [
  { d: rrect(-22, -6, 42, 8, 2), zone: 'stone' },
  { d: join(limb(-16, 2, 2, -12, 14, 1.6), limb(12, 2, 2, 8, 14, 1.6)), zone: 'wood', line: 2 },
  { d: join(circle(-18, -9, 4), circle(16, -9, 4)), zone: 'wicker', line: 2 },
]);
part('gunpowder.base.flag', [
  { d: limb(0, 0, 1.7, 0, -64, 1.6), zone: 'wood', line: 2.4 },
  { d: blob([0, -64, 30, -64, 30, -42, 0, -42], 0.3), zone: 'team', banner: true, line: 2.6 },
  { d: join(rect(0, -55, 30, 4), rect(11, -64, 4, 22)), zone: 'cloth2', line: 0, shade: false, light: false },
  { d: circle(0, -66, 2.4), zone: 'accent', line: 1.2, shade: false },
]);
part('gunpowder.base.lantern', [
  { d: limb(0, 0, 1.2, 0, -8, 1.2), zone: 'metal2', line: 1.6 },
  { d: rrect(-3.6, -16, 7.2, 9, 2), zone: 'glow', line: 1.8 },
  { d: poly([-4.6, -16, 0, -20, 4.6, -16]), zone: 'metal2', line: 1.4 },
]);
part('gunpowder.base.crack1', [{ d: poly([-100, -130, -92, -110, -98, -92, -90, -76, -94, -74, -102, -92, -96, -110, -104, -128]), zone: 'dark', line: 0, shade: false, light: false }]);
part('gunpowder.base.crack2', [
  { d: join(poly([-40, -118, -30, -96, -38, -70, -28, -52, -32, -50, -42, -70, -34, -96, -44, -116]), poly([-150, -80, -136, -66, -142, -44, -146, -44, -140, -64, -154, -76])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('gunpowder.base.chunk', [{ d: poly([-50, -206, -44, -206, -44, -180, -50, -180]), zone: 'plaster' }]);
part('gunpowder.base.rubble', [
  { d: join(blob([-28, 0, -24, -10, -14, -12, -8, -4, -10, 0], 0.6), blob([-100, 0, -94, -8, -84, -7, -82, 0], 0.6), blob([-8, 0, -4, -6, 6, -5, 8, 0], 0.6)), zone: 'stone2' },
]);
part('gunpowder.base.treasury1', [
  { d: join(circle(-6, -5, 5), circle(4, -5, 5), circle(-1, -13, 5)), zone: 'iron', line: 2 },
]);
part('gunpowder.base.treasury2', [
  { d: rrect(-10, -18, 20, 18, 4), zone: 'wood' },
  { d: join(rect(-10, -14, 20, 2), rect(-10, -5, 20, 2)), zone: 'metal2', line: 0, shade: false, light: false },
]);
part('gunpowder.base.treasury3', [
  { d: rrect(-14, -12, 28, 12, 2), zone: 'wood2' },
  { d: blob([-13, -12, -8, -18, 8, -18, 13, -12], 0.7), zone: 'accent' },
  { d: join(circle(-5, -16, 1.8), circle(3, -17, 1.8), circle(8, -14, 1.6)), zone: 'coin', line: 0.8, shade: false, light: false },
]);
part('gunpowder.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);
