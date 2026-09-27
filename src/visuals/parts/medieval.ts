/**
 * Medieval Age parts (DESIGN A11 palette: slate, wine, parchment, gold accent). Authored in lu at
 * infantry scale with pivots at joints and grips; hand-held weapons point up (-y) from the grip.
 * Team colour sits on the big readable areas: tabards, shield faces, plumes, caparisons, banners.
 */
import { arcBand, blob, circle, ellipse, join, limb, poly, rect, rrect, star } from '../svg';
import { part } from './registry';
import { headLayers, hipsShape, tabardShape, torsoShape } from './shared';

// ---------------------------------------------------------------------------------------------
// Bodies

/** Mail shirt under a team tabard with a parchment cross (Footman). */
part('medieval.torso.tabard', [
  { d: torsoShape(1.04), zone: 'metal2' },
  { d: tabardShape(1, 4.6), zone: 'team', banner: true },
  { d: join(rrect(1.6, -17.6, 3.2, 15, 1.2), rrect(-3.4, -12.4, 12.6, 3.2, 1.2)), zone: 'cloth3', line: 1.6, shade: false },
]);

/** Leather jerkin with a team tunic (Longbowman). */
part('medieval.torso.jerkin', [
  { d: torsoShape(0.96), zone: 'leather' },
  { d: blob([-8.4, 1.6, -9.4, -8, -7.6, -15.4, 7.8, -15.4, 9.8, -8, 9.2, 3.4, 0, 4.4], 0.8), zone: 'team', banner: true },
  { d: rrect(-9.6, -3.4, 20, 3, 1.4), zone: 'leather', line: 2 },
  { d: limb(-7, -20, 1.3, 8, -2, 1.3), zone: 'leather', line: 1.8 },
]);

/** Quilted gambeson with a team sash (Pikeman). */
part('medieval.torso.gambeson', [
  { d: torsoShape(1.06), zone: 'cloth3' },
  { d: join(rect(-8, -13.6, 18, 1.4), rect(-9, -8.6, 20, 1.4), rect(-8.6, -3.6, 19, 1.4)), zone: 'cloth3', line: 0, shade: false, light: false },
  { d: limb(-7.4, -21, 4, 8.6, 1, 4), zone: 'team', banner: true },
]);

/** Friar's habit with a team scapular and a rope belt. */
part('medieval.torso.habit', [
  { d: torsoShape(1.1), zone: 'robe' },
  { d: blob([0, -21.6, 8, -18.6, 11, -8, 10.8, 4.4, 2, 4.8, 0, -8, -2, -18], 0.8), zone: 'team', banner: true },
  { d: rrect(-10.6, -4, 22, 2.8, 1.4), zone: 'rope', line: 1.8 },
  { d: blob([-6.6, -23.4, 4, -24.6, 9.4, -20, 6, -17.6, -2, -18.6, -8, -17.6], 0.7), zone: 'robe' },
]);

/** Plate breastplate under a team surcoat (knights and paladins). */
part('medieval.torso.plate', [
  { d: torsoShape(1.08), zone: 'metal' },
  { d: tabardShape(1.02, 4.4), zone: 'team', banner: true },
  { d: join(poly([-1, -18, 7, -18, 3, -10])), zone: 'accent', line: 1.4, shade: false },
  { d: blob([-9, -22, 0, -24.4, 8.6, -21, 6, -18, 0, -19.6, -7, -18], 0.7), zone: 'metal' },
]);

part('medieval.pelvis.tabard', [
  { d: hipsShape(9.4), zone: 'pants' },
  { d: blob([-9.4, -3.4, 9.4, -3.4, 10.4, 6.2, 0.4, 7.6, -9.8, 6.2], 0.6), zone: 'team', banner: true },
  { d: rrect(-10, -4.8, 20.4, 3.2, 1.6), zone: 'leather', line: 2 },
  { d: rrect(4.6, -5.2, 3.6, 4, 1), zone: 'accent', line: 1.2, shade: false, light: false },
]);
part('medieval.pelvis.hose', [
  { d: hipsShape(9.2), zone: 'pants' },
  { d: rrect(-9.8, -4.8, 20, 3.2, 1.6), zone: 'leather', line: 2 },
]);
part('medieval.pelvis.robe', [
  { d: blob([-10.6, -4, 10.6, -4, 12.4, 10, 8, 13, 0, 12, -8, 13, -12, 10], 0.7), zone: 'robe' },
  { d: join(limb(-4, -2, 1, -5, 12, 1.2), limb(-1.6, -2, 1, -1.2, 9, 1.2)), zone: 'rope', line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Heads and headgear

part('medieval.head.soldier', headLayers({ nose: 'round', brow: 'angry', mouth: 'flat' }));
part('medieval.head.archer', headLayers({ nose: 'pointy', brow: 'calm', mouth: 'flat' }));
part('medieval.head.friar', headLayers({ nose: 'button', brow: 'calm', mouth: 'grin', jaw: 1.2 }));
part('medieval.head.knight', headLayers({ nose: 'round', brow: 'angry', mouth: 'frown', jaw: 1.4 }));

/** Kettle helmet with a nasal guard (Footman). */
part('medieval.helm.nasal', [
  { d: blob([-13.2, -15, -12.6, -21.6, -8.4, -27, 1, -29.4, 10.4, -26.6, 14.4, -20, 14.6, -16.8, 1, -17.6, -12, -14], 0.8), zone: 'metal' },
  { d: rrect(-13.8, -19.6, 29, 3.6, 1.8), zone: 'metal2', line: 2.4 },
  { d: rrect(10.4, -18.4, 3.4, 10.4, 1.7), zone: 'metal2', line: 2.2 },
  { d: circle(1, -29.6, 2), zone: 'metal2', line: 1.6, shade: false },
]);

/** Team hood with a liripipe tail and a feather (Longbowman). */
part('medieval.hood', [
  { d: blob([-12, -21, -16, -16, -18, -7, -15.6, -5.6, -13.4, -11, -11, -13], 0.7), zone: 'team', banner: true },
  {
    d: blob([-13.6, -4, -14.6, -16, -11, -25, -2, -29.6, 8, -27.6, 13.4, -21, 13.4, -17.6, 7, -20.6, 0, -19.6, -4.4, -14, -5, -4], 0.9),
    zone: 'team',
    banner: true,
  },
  { d: blob([-5, -27, -12, -35, -15, -40, -10, -37, -3, -29.4], 0.6), zone: 'feather', line: 1.8 },
]);

/** Morion with a comb crest (Pikeman). */
part('medieval.helm.morion', [
  { d: blob([-19, -13.6, -12.6, -18.4, -10, -25, -3, -29, 6, -28, 11.6, -23, 13.6, -18.4, 20, -13.6, 14, -14.4, 0, -17, -13, -14.4], 0.7), zone: 'metal' },
  { d: blob([-6, -27.6, -3, -34.4, 3.6, -34.6, 7, -27.4], 0.7), zone: 'metal2', line: 2.2 },
  { d: circle(-8, -18.6, 1.4), zone: 'accent', line: 1, shade: false, light: false },
]);

/** Tonsure: a ring of hair around the bald crown (Friar). */
part('medieval.tonsure', [
  { d: blob([-11.8, -9, -12.8, -16, -10.8, -21.6, -7.4, -23.6, -8.2, -19, -9, -14, -8.6, -9.6], 0.8), zone: 'hair', line: 2.2 },
  { d: blob([-7.8, -23.4, -1, -25.8, 6, -25.2, 10.8, -21.8, 7, -21.8, 0, -22.6, -5, -21.2], 0.8), zone: 'hair', line: 2 },
]);
/** A team cowl lying on the shoulders behind the head (Friar). */
part('medieval.cowl', [{ d: blob([-6, 2, -14, -1, -17.6, -9, -15, -17, -9, -16, -6, -9, -2, -2], 0.8), zone: 'team', banner: true }]);

/** Great helm with a team plume (Destrier Knight). */
part('medieval.helm.great', [
  { d: blob([-8, -25, -2, -33, -10, -40, -18, -38, -17, -31, -12, -27], 0.7), zone: 'team', banner: true },
  { d: rrect(-13, -29.6, 27.6, 29, 7), zone: 'metal' },
  { d: rrect(2.6, -19.6, 12, 2.6, 1.3), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(circle(9, -11, 0.9), circle(12, -11, 0.9), circle(9, -8, 0.9), circle(12, -8, 0.9)), zone: 'dark', line: 0, shade: false, light: false },
  { d: rrect(0, -29, 3, 27, 1.5), zone: 'accent', line: 1.4, shade: false, light: false },
]);

/** Crowned bascinet with a team plume (Ursa Paladin). */
part('medieval.helm.paladin', [
  { d: blob([-6, -27, 0, -38, -8, -48, -16, -46, -14, -36, -10, -29], 0.7), zone: 'team', banner: true },
  { d: blob([-13, -3, -13.8, -18, -9, -28, 2, -31, 11.4, -27, 15.6, -18, 16, -8, 12, -1, 2, 0], 0.8), zone: 'metal' },
  { d: blob([4, -20, 15.6, -18.4, 16.2, -9, 5, -8.6], 0.6), zone: 'metal2', line: 2 },
  { d: join(rect(6, -16, 9, 1.4), rect(6, -13, 9, 1.4)), zone: 'dark', line: 0, shade: false, light: false },
  { d: poly([-12, -26.6, -9, -33, -5, -28.6, 0, -34.6, 5, -29.6, 9.6, -33.6, 11.6, -26.4, 0, -28.4]), zone: 'accent', line: 1.6, shade: false },
]);

// ---------------------------------------------------------------------------------------------
// Weapons and held items (pivot at the grip, pointing up)

part('medieval.sword', [
  { d: poly([-2.4, -5, 2.4, -5, 2.4, -24, 0, -29, -2.4, -24]), zone: 'metal' },
  { d: rrect(-6.4, -7.4, 12.8, 3, 1.5), zone: 'metal2', line: 2 },
  { d: rrect(-1.6, -5, 3.2, 8.6, 1.6), zone: 'leather', line: 1.8 },
  { d: circle(0, 4.4, 2.2), zone: 'accent', line: 1.4, shade: false },
]);

/** Kite shield: team face, iron rim, gold boss. Pivot at the grip (shield centre). */
part('medieval.shield.kite', [
  { d: blob([-9.6, -12.4, 0, -15.4, 9.6, -12.4, 8.8, 1.6, 0, 15, -8.8, 1.6], 0.72), zone: 'metal2' },
  { d: blob([-7.4, -11, 0, -13.4, 7.4, -11, 6.8, 1.2, 0, 11.8, -6.8, 1.2], 0.72), zone: 'team', banner: true, line: 0 },
  { d: join(rrect(-1.4, -12.8, 2.8, 23.6, 1.2), rrect(-7, -5.4, 14, 2.8, 1.2)), zone: 'cloth3', line: 1.4, shade: false },
  { d: circle(0, -4, 2.6), zone: 'accent', line: 1.4, shade: false },
]);

/** Longbow standing upright with the belly toward +x; the string is two separate halves. */
part('medieval.longbow', [
  { d: blob([-2, -27, 2.6, -19, 5, -7, 5.2, 7, 2.6, 19, -2, 27, -3.6, 25.6, 0.4, 18, 2.4, 7, 2.4, -7, 0.4, -18, -3.6, -25.6], 0.55), zone: 'wood' },
  { d: rrect(1.2, -4.4, 5, 8.8, 2), zone: 'leather', line: 1.6 },
]);
/** Half a bow string: from its tip (pivot) down 26 lu to the nock. */
part('medieval.bowstring', [{ d: limb(0, 0, 0.55, 0, 26, 0.55), zone: 'rope', line: 1 }]);
part('medieval.arrow', [
  { d: limb(0, 4, 0.9, 0, -30, 0.9), zone: 'wood', line: 1.6 },
  { d: poly([-2.4, -29, 0, -35, 2.4, -29]), zone: 'metal', line: 1.4 },
  { d: join(poly([0, 1, -3, 5, -3, 8, 0, 5]), poly([0, 1, 3, 5, 3, 8, 0, 5])), zone: 'feather', line: 1.2 },
]);
part('medieval.quiver', [
  { d: rrect(-4.4, -12, 8.8, 22, 3), zone: 'leather' },
  { d: join(limb(-2, -12, 0.9, -3, -18, 0.9), limb(0.6, -12, 0.9, 0.6, -19, 0.9), limb(3, -12, 0.9, 4, -17, 0.9)), zone: 'wood', line: 1.4 },
  { d: join(poly([-5, -18, -3, -22, -1, -18]), poly([-1.4, -19, 0.6, -23, 2.6, -19]), poly([2, -17, 4, -21, 6, -17])), zone: 'feather', line: 1.2 },
  { d: rect(-4.4, -9, 8.8, 2.4), zone: 'accent', line: 1, shade: false, light: false },
]);

/** Pike: a 96 lu ash shaft with a steel head (reach 70). */
part('medieval.pike', [
  { d: limb(0, 22, 1.7, 0, -66, 1.5), zone: 'wood' },
  { d: blob([0, -80, 3.4, -69, 2, -63, -2, -63, -3.4, -69], 0.5), zone: 'metal' },
  { d: rrect(-2.6, -64.4, 5.2, 4, 1.4), zone: 'metal2', line: 1.6 },
]);

/** Jousting lance with a vamplate and a team pennon (Destrier Knight). */
part('medieval.lance', [
  { d: poly([-2.2, 10, 2.2, 10, 1, -58, 0, -64, -1, -58]), zone: 'wood' },
  { d: join(rect(-2, -8, 4, 2.4), rect(-1.8, -20, 3.6, 2.4), rect(-1.6, -32, 3.2, 2.4), rect(-1.3, -44, 2.6, 2.4)), zone: 'cloth3', line: 0, shade: false, light: false },
  { d: blob([-7, -2, 0, -7, 7, -2, 4, 1, -4, 1], 0.6), zone: 'metal' },
  { d: blob([1, -56, 13, -52, 8, -49, 13, -45, 1, -42], 0.3), zone: 'team', banner: true, line: 2 },
]);
part('medieval.shield.heater', [
  { d: blob([-9, -11, 9, -11, 8.4, 3, 0, 12, -8.4, 3], 0.6), zone: 'metal2' },
  { d: blob([-7, -9.2, 7, -9.2, 6.6, 2.4, 0, 9.6, -6.6, 2.4], 0.6), zone: 'team', banner: true, line: 0 },
  { d: star(0, -1.6, 5, 1.8, 4.2), zone: 'accent', line: 1.2, shade: false },
]);

/** Friar's walking staff with a little bell. */
part('medieval.staff', [
  { d: limb(0, 24, 1.6, 0, -30, 1.6), zone: 'wood', line: 2.4 },
  { d: blob([-4, -30, 0, -38, 4, -30, 5.4, -25, -5.4, -25], 0.6), zone: 'accent', line: 1.8 },
  { d: rrect(-4.6, -27.6, 9.2, 2.4, 1.2), zone: 'rope', line: 1.4, shade: false },
]);
part('medieval.loaf', [
  { d: blob([-4.4, -1, -3, -4.4, 2.6, -4.4, 4.6, -1, 3.6, 3, -3.6, 3], 0.8), zone: 'bread', line: 1.8 },
  { d: join(rect(-2.6, -3.6, 1, 3), rect(0, -4, 1, 3)), zone: 'bread2', line: 0, shade: false, light: false },
]);

/** Paladin's greatsword. */
part('medieval.greatsword', [
  { d: poly([-3, -6, 3, -6, 3.4, -42, 0, -48, -3.4, -42]), zone: 'metal' },
  { d: rrect(-0.8, -40, 1.6, 32, 0.8), zone: 'metal2', line: 0, shade: false, light: false },
  { d: blob([-9.6, -8.6, 0, -9.6, 9.6, -8.6, 9, -5.6, 0, -6.4, -9, -5.6], 0.6), zone: 'accent', line: 1.8 },
  { d: rrect(-1.8, -6, 3.6, 12, 1.8), zone: 'leather', line: 1.8 },
  { d: circle(0, 7.6, 2.6), zone: 'accent', line: 1.4, shade: false },
]);

// ---------------------------------------------------------------------------------------------
// Horse (Destrier Knight mount): pivots per the quadruped rig

function hoofLeg(id: string, len: number, r1: number, r2: number): void {
  part(id, [
    { d: join(limb(0, 0, r1, 0, len * 0.55, r2 + 0.6), limb(0, len * 0.55, r2 + 0.4, 0.6, len - 4, r2)), zone: 'fur' },
    { d: rrect(-r2 - 0.8, len - 5, r2 * 2 + 2.6, 5, 1.6), zone: 'hoof', line: 2.2 },
  ]);
}
hoofLeg('medieval.horse.leg.front', 32, 4.6, 3.2);
hoofLeg('medieval.horse.leg.back', 32, 6, 3.2);

part('medieval.horse.body', [{ d: blob([-21, -1, -19, -11, -9, -14.6, 7, -15, 16, -11.6, 21, -3, 19, 8, 9, 12, -9, 12, -18, 8], 0.9), zone: 'fur' }]);
/** Caparison: the team cloth draped over the horse, with a scalloped hem and two gold roundels. */
part('medieval.horse.caparison', [
  {
    d: blob([-22, -4, -18, -13, -7, -16.6, 7, -17, 16, -13, 22, -4, 21, 12, 16.6, 16, 11, 13, 6, 17, 1, 13, -4, 17, -9, 13, -14, 17, -19, 13, -23, 12], 0.8),
    zone: 'team',
    banner: true,
  },
  { d: join(circle(-9, 1, 3.2), circle(7, 1, 3.2)), zone: 'accent', line: 1.4, shade: false },
  { d: join(star(-9, 1, 4, 1, 2.2, 0), star(7, 1, 4, 1, 2.2, 0)), zone: 'cloth3', line: 0, shade: false, light: false },
]);
part('medieval.horse.saddle', [{ d: blob([-9, -1, -7, -6, 6, -6, 9, -3, 7, 1, -7, 1], 0.7), zone: 'leather', line: 2.4 }]);
/** Neck and head in one part (pivot at the base of the neck); the head is carried high and short. */
part('medieval.horse.head', [
  { d: join(limb(0, 2, 8, 4, -19, 6.4), blob([-2, -24, 4, -31, 13, -31, 21, -25, 24, -18, 20, -14, 11, -16, 4, -13], 0.8)), zone: 'fur' },
  { d: join(poly([2, -28, 3, -38, 8, -30]), poly([6, -30, 8.6, -39, 11.6, -30])), zone: 'fur' },
  { d: ellipse(21.6, -17.6, 3.4, 3.8), zone: 'snout', line: 2 },
  { d: circle(23, -18.6, 0.9), zone: 'dark', line: 0, shade: false, light: false },
  { d: blob([-3, -26, -9, -16, -10, -4, -6, 3, -2, -6, -1, -16, 2, -24], 0.7), zone: 'hair', line: 2.4 },
]);
/** Chanfron (face armour) with a team crest. */
part('medieval.horse.chanfron', [
  { d: blob([4, -31, 13, -31.4, 21.6, -24.4, 20, -21, 12, -24, 5, -26], 0.7), zone: 'metal', line: 2.2 },
  { d: blob([5, -31, 4, -38, 8, -42, 9, -33], 0.6), zone: 'team', banner: true, line: 1.8 },
]);
part('medieval.horse.tail', [{ d: blob([0, 0, -5, 2, -8, 10, -8, 22, -4, 25, -3, 14, 0, 6], 0.7), zone: 'hair', line: 2.4 }]);

// ---------------------------------------------------------------------------------------------
// Armoured bear (Ursa Paladin mount)

/** A bear's leg (also used by the Panda Paladin skin with a darker zone). */
export function pawLeg(id: string, len: number, r1: number, r2: number, zone = 'fur'): void {
  part(id, [
    { d: limb(0, 0, r1, 0, len - r2, r2), zone },
    { d: blob([-r2 - 1, len - 5, r2 + 5, len - 5, r2 + 6, len, -r2 - 1.6, len], 0.6), zone, line: 2.6 },
    { d: join(poly([r2 + 2, len - 4, r2 + 6, len - 1, r2 + 2, len - 1]), poly([r2 - 1.4, len - 4, r2 + 2.4, len - 1, r2 - 1.4, len - 1])), zone: 'bone', line: 1.2 },
  ]);
}
pawLeg('medieval.bear.leg.front', 50, 13, 10);
pawLeg('medieval.bear.leg.back', 50, 15, 10);

part('medieval.bear.body', [
  { d: blob([-44, 2, -40, -22, -22, -38, 4, -44, 28, -38, 40, -20, 42, 4, 32, 24, 10, 32, -18, 32, -36, 22], 0.9), zone: 'fur' },
  { d: blob([-34, 14, -10, 26, 20, 24, 32, 12, 26, 28, -20, 30], 0.8), zone: 'fur2', line: 0, shade: false, light: false },
  { d: join(poly([34, 6, 38, 14, 40, 4]), poly([28, 14, 32, 22, 35, 12]), poly([-40, 6, -38, 16, -34, 8])), zone: 'fur2', line: 0, shade: false, light: false },
]);
/** Barding: a team saddle cloth with gold roundels and an iron back plate. */
part('medieval.bear.barding', [
  { d: blob([-32, -30, -12, -43, 12, -43, 28, -32, 30, -10, 22, 4, 12, 0, 2, 6, -8, 0, -18, 6, -28, 0, -34, -10], 0.8), zone: 'team', banner: true },
  { d: blob([-16, -40, -2, -47, 12, -45, 20, -38, 8, -34, -10, -34], 0.7), zone: 'metal', line: 2.4 },
  { d: join(circle(-20, -14, 3.6), circle(0, -12, 3.6), circle(18, -14, 3.6)), zone: 'accent', line: 1.4, shade: false },
  { d: join(star(-20, -14, 4, 1.1, 2.7, 0), star(0, -12, 4, 1.1, 2.7, 0), star(18, -14, 4, 1.1, 2.7, 0)), zone: 'cloth3', line: 0, shade: false, light: false },
]);
/** Big round bear head (pivot at the neck), with a muzzle toward +x. */
part('medieval.bear.head', [
  { d: blob([-12, -12, -6, -30, 10, -38, 26, -34, 38, -22, 46, -12, 44, -2, 30, 6, 12, 10, -4, 8, -12, 0], 0.9), zone: 'fur' },
  { d: join(circle(-1, -32, 7.4), circle(14, -37, 6.6)), zone: 'fur' },
  { d: join(circle(-0.4, -32, 3.6), circle(14.2, -37, 3.2)), zone: 'fur2', line: 0, shade: false, light: false },
  { d: blob([28, -16, 42, -20, 50, -12, 48, -4, 36, -2, 28, -6], 0.8), zone: 'snout', line: 2.4 },
  { d: ellipse(48, -13, 3, 2.6), zone: 'dark', line: 1.2, shade: false, light: false },
]);
part('medieval.bear.jaw', [
  { d: blob([14, 2, 32, -2, 44, 0, 42, 8, 26, 12, 12, 10], 0.8), zone: 'fur2' },
  { d: join(poly([34, -1, 36, 4, 38, -1]), poly([26, 0, 28, 5, 30, 0])), zone: 'bone', line: 1.2 },
]);
/** Bear helm plate over the brow. */
part('medieval.bear.helm', [
  { d: blob([2, -34, 18, -38, 34, -30, 40, -20, 30, -20, 16, -26, 4, -24], 0.7), zone: 'metal', line: 2.6 },
  { d: blob([12, -36, 14, -45, 19, -47, 18, -36], 0.6), zone: 'accent', line: 1.8, shade: false },
]);
part('medieval.bear.tail', [{ d: blob([0, 0, -8, -2, -10, 4, -4, 6], 0.8), zone: 'fur', line: 2.4 }]);
part('medieval.bear.saddle', [
  { d: blob([-16, -2, -13, -9, 10, -9, 16, -4, 12, 2, -12, 2], 0.7), zone: 'leather', line: 2.6 },
  { d: rrect(-15, -9.6, 4, 7, 2), zone: 'wood', line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Battering Ram (vehicle rig: hull, wheels, log)

part('medieval.ram.hull', [
  { d: join(limb(-28, -8, 2.6, -25, -58, 2.4), limb(22, -8, 2.6, 19, -58, 2.4), limb(-28, -20, 2, 22, -20, 2)), zone: 'wood' },
  { d: blob([-34, -52, -3, -84, 28, -52, 26, -46, -3, -70, -31, -46], 0.6), zone: 'hide' },
  { d: poly([-30, -52, -3, -78, 24, -52, 20, -48, -3, -70, -26, -48]), zone: 'team', banner: true, line: 1.6 },
  { d: join(limb(-18, -60, 0.9, -18, -48, 0.9), limb(12, -60, 0.9, 12, -48, 0.9)), zone: 'rope', line: 1.6 },
  { d: join(rect(-30, -52, 56, 2), rect(-24, -44, 44, 1.6)), zone: 'wood2', line: 0, shade: false, light: false },
]);
part('medieval.ram.banner', [
  { d: limb(0, 0, 1.4, 0, -26, 1.4), zone: 'wood', line: 2.2 },
  { d: blob([0, -26, 16, -23, 10, -19, 16, -15, 0, -13], 0.3), zone: 'team', banner: true, line: 2.4 },
]);
/** The ram log with an iron ram's head (pivot at the log centre, pointing +x). */
part('medieval.ram.log', [
  { d: rrect(-38, -6, 66, 12, 6), zone: 'wood' },
  { d: join(arcBand(-26, 0, 3, 4.4, 0, 360), rect(-12, -6, 2, 12), rect(6, -6, 2, 12)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: blob([24, -8, 34, -9, 42, -5, 44, 1, 40, 7, 30, 8, 24, 7], 0.7), zone: 'metal' },
  { d: blob([30, -8, 26, -16, 32, -20, 38, -16, 37, -10, 33, -12], 0.7), zone: 'metal2', line: 2.4 },
  { d: circle(38.6, -2.6, 1.4), zone: 'dark', line: 0, shade: false, light: false },
]);
part('medieval.ram.chains', [{ d: join(limb(-20, 0, 0.9, -20, -30, 0.9), limb(14, 0, 0.9, 14, -30, 0.9)), zone: 'metal2', line: 1.6 }]);
part('medieval.ram.wheel', [
  { d: circle(0, 0, 11), zone: 'wood' },
  { d: arcBand(0, 0, 7, 8.6, 0, 360), zone: 'wood2', line: 0, shade: false, light: false },
  { d: join(rect(-8, -1, 16, 2), rect(-1, -8, 2, 16)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: circle(0, 0, 2.6), zone: 'metal2', line: 1.4, shade: false },
]);

// ---------------------------------------------------------------------------------------------
// Turrets (pivot at the mount point; see rigs/turret.ts)

part('medieval.turret.nest', [
  { d: poly([-18, 0, -15, -16, 15, -16, 18, 0]), zone: 'wood' },
  { d: join(rect(-17, -11, 34, 2), rect(-17.6, -5, 35, 2)), zone: 'wood2', line: 0, shade: false, light: false },
  { d: rrect(-19, -19, 38, 5, 2.4), zone: 'wood2' },
]);
part('medieval.turret.nestShield', [
  { d: blob([-8, -16, 8, -16, 7, 2, 0, 8, -7, 2], 0.6), zone: 'team', banner: true },
  { d: circle(0, -5, 2.6), zone: 'accent', line: 1.4, shade: false },
]);
/** Arbalest: stock along +x with a steel bow (pivot at the swivel). */
part('medieval.turret.crossbow', [
  { d: rrect(-12, -3, 30, 6, 3), zone: 'wood' },
  { d: blob([12, -16, 16, -8, 17, 0, 16, 8, 12, 16, 10.6, 15, 13.6, 8, 14.6, 0, 13.6, -8, 10.6, -15], 0.6), zone: 'metal' },
  { d: join(limb(11, -15.6, 0.5, 0, 0, 0.5), limb(11, 15.6, 0.5, 0, 0, 0.5)), zone: 'rope', line: 1 },
  { d: limb(-2, 0, 1, 20, 0, 1), zone: 'wood2', line: 1.4 },
  { d: poly([20, -2.2, 25, 0, 20, 2.2]), zone: 'metal', line: 1.2 },
]);

part('medieval.turret.bracket', [
  { d: join(limb(-14, 0, 3, -14, -34, 2.6), limb(-14, -32, 2.4, 10, -32, 2.4)), zone: 'wood' },
  { d: limb(-14, -14, 1.8, 2, -31, 1.8), zone: 'wood2', line: 2.2 },
  { d: rrect(-20, -3, 16, 5, 2.4), zone: 'stone' },
  { d: limb(6, -32, 0.8, 6, -26, 0.8), zone: 'metal2', line: 1.6 },
]);
/** The pitch cauldron hanging on the bracket (pivot at the hook). */
part('medieval.turret.cauldron', [
  { d: blob([-11, 2, -10, 12, -4, 17, 4, 17, 10, 12, 11, 2], 0.8), zone: 'metal2' },
  { d: ellipse(0, 2, 11.6, 3.4), zone: 'pitch', line: 2.2, shade: false },
  { d: arcBand(0, 2, 11, 13, 190, 350), zone: 'metal2', line: 1.6, shade: false, light: false },
  { d: join(circle(-3, 1.4, 1.4), circle(4, 2.6, 1)), zone: 'white', line: 0, alpha: 0.5, shade: false, light: false },
]);
part('medieval.turret.fire', [
  { d: blob([-6, 0, -5, -6, -2, -12, 0, -7, 2, -13, 5, -6, 6, 0], 0.6), zone: 'fire', line: 1.6 },
  { d: blob([-2, 0, 0, -6, 2, 0], 0.6), zone: 'white', line: 0, alpha: 0.7, shade: false, light: false },
  { d: join(limb(-8, 1, 1.4, 8, -1, 1.4), limb(-8, -1, 1.4, 8, 1, 1.4)), zone: 'wood2', line: 1.4 },
]);

/** Trebuchet A-frame (pivot at the mount point, axle at (0, -40)). */
part('medieval.turret.trebFrame', [
  { d: join(limb(-20, 0, 2.6, 0, -40, 2.4), limb(18, 0, 2.6, 0, -40, 2.4), limb(-13, -16, 1.8, 12, -16, 1.8)), zone: 'wood' },
  { d: rrect(-24, -4, 48, 6, 3), zone: 'wood2' },
  { d: circle(0, -40, 3.4), zone: 'metal2', line: 1.8 },
]);
/** Throwing arm: long end toward -x (the sling), counterweight on the short +x end. */
part('medieval.turret.trebArm', [
  { d: limb(-40, 0, 1.8, 14, 0, 2.6), zone: 'wood' },
  { d: rrect(8, 2, 14, 14, 3), zone: 'wood2' },
  { d: join(rect(8, 6, 14, 1.4), rect(8, 11, 14, 1.4)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: join(limb(-40, 0, 0.6, -44, 10, 0.6), limb(-40, 0, 0.6, -36, 10, 0.6)), zone: 'rope', line: 1.2 },
  { d: blob([-45, 10, -35, 10, -36, 14, -44, 14], 0.6), zone: 'leather', line: 1.6 },
  { d: circle(-40, 9, 4.4), zone: 'stone' },
]);
part('medieval.turret.flag', [
  { d: limb(0, 0, 1.3, 0, -26, 1.3), zone: 'wood', line: 2.2 },
  { d: blob([0, -26, 12, -23, 12, -15, 6, -17, 0, -14], 0.3), zone: 'team', banner: true, line: 2.2 },
]);

part('medieval.turret.ballistaBase', [
  { d: join(limb(-14, 0, 2.4, 0, -20, 2.4), limb(14, 0, 2.4, 0, -20, 2.4)), zone: 'wood' },
  { d: rrect(-18, -4, 36, 6, 3), zone: 'wood2' },
  { d: circle(0, -20, 3.2), zone: 'metal2', line: 1.8 },
]);
/** Honk Ballista: bow arms and a slider with an indignant goose (pivot at the swivel). */
part('medieval.turret.ballista', [
  { d: rrect(-16, -3.4, 36, 6.8, 3), zone: 'wood' },
  { d: blob([10, -24, 15, -12, 16, 0, 15, 12, 10, 24, 8, 23, 12, 12, 13, 0, 12, -12, 8, -23], 0.6), zone: 'wood2' },
  { d: join(limb(9, -23.4, 0.5, -8, 0, 0.5), limb(9, 23.4, 0.5, -8, 0, 0.5)), zone: 'rope', line: 1 },
  { d: join(rrect(8, -26, 5, 4, 1.4), rrect(8, 22, 5, 4, 1.4)), zone: 'metal2', line: 1.4 },
]);
part('medieval.turret.goose', [
  { d: blob([-10, -2, -6, -8, 4, -8, 10, -4, 9, 2, 0, 4, -8, 3], 0.8), zone: 'feather' },
  { d: limb(6, -5, 2.4, 13, -16, 2.2), zone: 'feather', line: 2.2 },
  { d: circle(14, -17, 3.6), zone: 'feather' },
  { d: poly([16.6, -18.6, 23, -16.4, 16.8, -15]), zone: 'beak', line: 1.4 },
  { d: circle(15, -18.4, 1.1), zone: 'dark', line: 0, shade: false, light: false },
  { d: poly([12.4, -21, 16.6, -19.4, 12.6, -18.8]), zone: 'dark', line: 0, shade: false, light: false },
  { d: blob([-8, -3, -2, -6, 3, -4, -2, 0], 0.7), zone: 'feather2', line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// The Keep (base.medieval). Origin at the gate on the ground, extending back to x = -150.

part('medieval.base.tower', [
  { d: join(rect(-150, -236, 62, 236), rect(-154, -250, 70, 18)), zone: 'stone' },
  { d: join(rect(-154, -262, 12, 14), rect(-136, -262, 12, 14), rect(-118, -262, 12, 14), rect(-100, -262, 12, 14)), zone: 'stone' },
  { d: join(rect(-130, -204, 8, 16), rect(-130, -140, 8, 16)), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(rect(-148, -60, 20, 3), rect(-140, -120, 22, 3), rect(-146, -176, 18, 3), rect(-110, -90, 18, 3), rect(-120, -30, 20, 3)), zone: 'stone2', line: 0, shade: false, light: false },
]);
part('medieval.base.roof', [{ d: poly([-158, -262, -119, -318, -80, -262]), zone: 'cloth2' }]);
part('medieval.base.wall', [
  { d: join(rect(-94, -170, 92, 170), rect(-98, -182, 100, 14)), zone: 'stone' },
  { d: join(rect(-98, -194, 12, 14), rect(-80, -194, 12, 14), rect(-62, -194, 12, 14), rect(-44, -194, 12, 14), rect(-26, -194, 12, 14), rect(-10, -194, 12, 14)), zone: 'stone' },
  { d: join(rect(-86, -40, 22, 3), rect(-60, -80, 26, 3), rect(-90, -120, 20, 3), rect(-40, -140, 22, 3), rect(-30, -26, 16, 3)), zone: 'stone2', line: 0, shade: false, light: false },
]);
part('medieval.base.gate', [
  { d: blob([-72, 0, -72, -44, -66, -60, -54, -66, -42, -60, -36, -44, -36, 0], 0.6), zone: 'dark' },
  { d: join(rect(-68, -54, 2.6, 54), rect(-60, -62, 2.6, 62), rect(-52, -64, 2.6, 64), rect(-44, -60, 2.6, 60), rect(-72, -40, 36, 2.6), rect(-72, -20, 36, 2.6)), zone: 'metal2', line: 1.2, shade: false },
  { d: arcBand(-54, -42, 18, 23, 180, 360), zone: 'stone2', line: 2 },
]);
part('medieval.base.window', [{ d: blob([-5, 8, -5, -4, 0, -9, 5, -4, 5, 8], 0.6), zone: 'glow', line: 2.2 }]);
part('medieval.base.ledge', [
  { d: rrect(-22, -6, 42, 7, 2), zone: 'stone' },
  { d: join(rect(-22, -12, 7, 7), rect(-9, -12, 7, 7), rect(4, -12, 7, 7)), zone: 'stone' },
  { d: join(poly([-18, 1, -12, 1, -15, 10]), poly([8, 1, 14, 1, 11, 10])), zone: 'stone2', line: 2 },
]);
part('medieval.base.banner', [
  { d: limb(0, 0, 1.6, 0, -50, 1.6), zone: 'wood', line: 2.2 },
  { d: blob([0, -50, 24, -46, 20, -39, 24, -32, 0, -28], 0.3), zone: 'team', banner: true, line: 2.6 },
  { d: star(9, -39, 5, 2, 4.4), zone: 'accent', line: 1.4, shade: false },
]);
part('medieval.base.hanging', [
  { d: rect(-12, -2, 24, 3), zone: 'wood', line: 2 },
  { d: blob([-10, 0, 10, 0, 10, 36, 0, 30, -10, 36], 0.3), zone: 'team', banner: true, line: 2.6 },
  { d: join(poly([0, 6, 5, 13, 0, 20, -5, 13])), zone: 'accent', line: 1.4, shade: false },
]);
part('medieval.base.torch', [
  { d: limb(0, 0, 1.6, 0, -14, 2), zone: 'metal2', line: 2 },
  { d: blob([-4, -14, -3, -22, 0, -28, 3, -22, 4, -14], 0.6), zone: 'fire', line: 1.6 },
  { d: blob([-1.6, -15, 0, -22, 1.6, -15], 0.6), zone: 'white', line: 0, alpha: 0.8, shade: false, light: false },
]);
part('medieval.base.crack1', [{ d: poly([-130, -230, -122, -210, -128, -190, -120, -172, -124, -170, -132, -190, -126, -210, -134, -228]), zone: 'dark', line: 0, shade: false, light: false }]);
part('medieval.base.crack2', [
  { d: join(poly([-30, -160, -20, -136, -28, -110, -18, -90, -22, -88, -32, -110, -24, -136, -34, -158]), poly([-146, -100, -132, -86, -138, -64, -142, -64, -136, -84, -150, -96])), zone: 'dark', line: 0, shade: false, light: false },
]);
part('medieval.base.chunk', [{ d: join(rect(-26, -194, 12, 14), rect(-10, -194, 12, 14)), zone: 'stone' }]);
part('medieval.base.rubble', [
  { d: join(blob([-26, 0, -22, -10, -12, -12, -6, -4, -8, 0], 0.6), blob([-100, 0, -94, -8, -84, -7, -82, 0], 0.6), blob([-8, 0, -4, -6, 6, -5, 8, 0], 0.6)), zone: 'stone2' },
]);
part('medieval.base.treasury1', [
  { d: rrect(-12, -12, 24, 12, 2), zone: 'wood' },
  { d: blob([-12, -12, -8, -18, 8, -18, 12, -12], 0.7), zone: 'wood' },
  { d: join(rect(-12, -9, 24, 2), rect(-2, -18, 4, 18)), zone: 'metal2', line: 0, shade: false, light: false },
  { d: rrect(-2.4, -12, 4.8, 4, 1), zone: 'accent', line: 1.2, shade: false },
]);
part('medieval.base.treasury2', [
  { d: join(blob([-8, 0, -9, -10, -6, -16, 6, -16, 9, -10, 8, 0], 0.7), blob([6, 0, 5, -8, 8, -12, 16, -12, 18, -6, 17, 0], 0.7)), zone: 'sack' },
  { d: join(rect(-6, -18, 12, 3), rect(8, -14, 8, 2.4)), zone: 'rope', line: 1.4 },
]);
part('medieval.base.treasury3', [
  { d: blob([-16, 0, -12, -6, -4, -10, 4, -10, 12, -6, 16, 0], 0.7), zone: 'accent' },
  { d: join(circle(-6, -8, 2.2), circle(2, -9, 2.2), circle(8, -6, 2), circle(-1, -5, 2)), zone: 'coin', line: 1, shade: false, light: false },
]);
part('medieval.base.smoke', [{ d: join(circle(0, 0, 10), circle(10, -8, 8), circle(-8, -12, 7), circle(4, -20, 9)), zone: 'smoke', alpha: 0.75, line: 0, light: false }]);
