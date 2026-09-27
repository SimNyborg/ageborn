/**
 * Skin parts (DESIGN A5.8): overlays and replacement parts for the 12 v1 skins. A replacement keeps
 * the outline of the part it replaces (the silhouette test holds every skin to IoU >= 0.85 against
 * its base visual) and never touches team-colour layers.
 */
import { blob, circle, ellipse, join, limb, poly, rect, rrect, star } from '../svg';
import { pawLeg } from './medieval';
import { part } from './registry';

// ---------------------------------------------------------------------------------------------
// Pumpkin Head (Bonker): a carved gourd helmet over the head and hair

part('skin.pumpkin.gourd', [
  { d: blob([-13.6, -12, -12.6, -24, -6, -31, 2, -32.4, 10, -30.6, 15, -24, 15.6, -12, 11, -2.6, 2, -0.6, -8, -2.4], 0.9), zone: 'gourd' },
  { d: join(limb(-4, -30, 0.7, -6, -4, 0.7), limb(6, -30.6, 0.7, 7.6, -3, 0.7)), zone: 'gourd2', line: 0, shade: false, light: false },
  { d: join(poly([2, -20, 6.6, -14, 1, -14]), poly([9, -20, 13.6, -15, 8.4, -14])), zone: 'dark', line: 1.2, shade: false, light: false },
  { d: join(poly([3, -18, 5, -15, 2.4, -15]), poly([10, -18, 12, -15.6, 9.4, -15.4])), zone: 'candle', line: 0, shade: false, light: false },
  { d: poly([1, -9, 4, -6.6, 6, -9, 8, -6.4, 10.4, -9, 13.4, -7.6, 11, -4.6, 3, -4.6]), zone: 'dark', line: 1.2, shade: false, light: false },
  { d: blob([-1.4, -31, -2, -37, 1, -39, 2.4, -32], 0.6), zone: 'stem', line: 1.8 },
]);

// ---------------------------------------------------------------------------------------------
// Woolly Tuskback: a shaggy coat over the flanks (the team blanket on the back stays clear)

part('skin.woolly.coat', [
  {
    d: blob([-22, -6, -16, -9, -8, -6, 0, -9, 8, -7, 16, -10, 22, -8, 24, 2, 20, 13, 14, 17, 9, 21, 3, 17, -3, 21, -9, 17, -15, 20, -19, 12, -23, 5], 0.8),
    zone: 'wool',
  },
  { d: join(circle(-16, -7, 3.4), circle(-6, -7.6, 3.4), circle(4, -8, 3.4), circle(14, -9, 3.4)), zone: 'wool', line: 2.2 },
  { d: join(limb(-14, 2, 0.8, -12, 12, 0.8), limb(-4, 2, 0.8, -3, 14, 0.8), limb(6, 1, 0.8, 7, 13, 0.8), limb(16, 0, 0.8, 15, 10, 0.8)), zone: 'wool2', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Frost Matriarch: ice tusks (same outline as the bone tusks)

part('skin.frost.tusk', [
  { d: blob([0, 0, 6, 10, 18, 18, 32, 14, 40, 2, 36, 0, 30, 9, 18, 11, 8, 4, 4, -4], 0.7), zone: 'ice', line: 3 },
  { d: join(poly([12, 9, 16, 12, 20, 10.6, 16, 10]), poly([26, 11, 30, 9, 33, 5, 29, 8])), zone: 'white', line: 0, alpha: 0.8, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Tin Can (Footman): a dented bucket over the head

part('skin.tin_can.bucket', [
  { d: blob([-13.6, -1, -14.4, -20, -12.6, -30.6, 1, -32.6, 14, -30.6, 15.6, -20, 15, -1, 1, 1], 0.5), zone: 'tin' },
  { d: rrect(1, -18.6, 13.6, 3, 1.4), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(ellipse(-6, -24, 3, 2), ellipse(8, -7, 2.4, 1.6)), zone: 'tin2', line: 0, shade: false, light: false },
  { d: join(rect(-14, -28, 29, 1.6), rect(-14.4, -6, 29.4, 1.6)), zone: 'tin2', line: 0, shade: false, light: false },
  { d: limb(-13, -26, 0.8, -8, -38, 0.8), zone: 'tin2', line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Panda Paladin: black legs, black ears and eye patches, and a bamboo banner

pawLeg('skin.panda.leg.front', 50, 13, 10, 'fur2');
pawLeg('skin.panda.leg.back', 50, 15, 10, 'fur2');
part('skin.panda.head', [
  { d: blob([-12, -12, -6, -30, 10, -38, 26, -34, 38, -22, 46, -12, 44, -2, 30, 6, 12, 10, -4, 8, -12, 0], 0.9), zone: 'fur' },
  { d: join(circle(-1, -32, 7.4), circle(14, -37, 6.6)), zone: 'fur2' },
  { d: blob([22, -26, 30, -28, 34, -20, 30, -14, 22, -18], 0.7), zone: 'fur2', line: 0, shade: false, light: false },
  { d: blob([28, -16, 42, -20, 50, -12, 48, -4, 36, -2, 28, -6], 0.8), zone: 'snout', line: 2.4 },
  { d: ellipse(48, -13, 3, 2.6), zone: 'dark', line: 1.2, shade: false, light: false },
]);
part('skin.panda.banner', [
  { d: limb(0, 20, 1.8, 0, -70, 1.6), zone: 'bamboo', line: 2.2 },
  { d: join(rect(-2, -52, 4, 1.8), rect(-2, -30, 4, 1.8), rect(-2, -8, 4, 1.8)), zone: 'bamboo2', line: 0, shade: false, light: false },
  { d: blob([0, -70, -22, -68, -18, -58, -22, -48, 0, -46], 0.3), zone: 'silk', line: 2.2 },
  { d: join(limb(-14, -64, 0.8, -6, -54, 0.8), limb(-6, -64, 0.8, -14, -54, 0.8)), zone: 'bamboo2', line: 0, shade: false, light: false },
  { d: join(blob([1, -40, 9, -44, 13, -40, 6, -38], 0.6), blob([-1, -22, -9, -26, -13, -22, -6, -20], 0.6)), zone: 'bamboo', line: 1.4 },
]);

// ---------------------------------------------------------------------------------------------
// Toy Soldier (Fusilier): a wind-up key on the back (twirls as the idle flourish)

part('skin.toy.key', [
  { d: rrect(-10, -1.2, 10, 2.4, 1.2), zone: 'brass', line: 1.4 },
  { d: join(ellipse(-12, -4, 3, 4), ellipse(-12, 4, 3, 4)), zone: 'brass', line: 1.6 },
  { d: join(circle(-12, -4, 1.2), circle(-12, 4, 1.2)), zone: 'dark', line: 0, shade: false, light: false },
]);
part('skin.toy.cheeks', [{ d: circle(8.6, -8, 2.2), zone: 'cheek', line: 0, alpha: 0.8, shade: false, light: false }]);

// ---------------------------------------------------------------------------------------------
// Arctic Rifleman: a fur collar

part('skin.arctic.collar', [{ d: blob([-9, -20, -4, -24.6, 3, -24.6, 9, -21, 7, -17, 0, -19, -7, -17], 0.7), zone: 'wool', line: 2 }]);

// ---------------------------------------------------------------------------------------------
// Shark Mouth (Gyrocopter): nose art

part('skin.shark.nose', [
  { d: blob([16, 1, 24, -1, 30, 1, 28, 6, 20, 7, 14, 5], 0.6), zone: 'mouth', line: 1.2, shade: false, light: false },
  { d: poly([16, 1.4, 18, 4, 20, 1, 22, 4, 24, 0.6, 26, 3.6, 28, 1.4, 28, 2.8, 16, 3]), zone: 'white', line: 0.8, shade: false, light: false },
  { d: poly([16, 6.4, 18, 4.4, 20, 6.8, 22, 4.6, 24, 6.8, 26, 5, 27, 6, 18, 7]), zone: 'white', line: 0.8, shade: false, light: false },
  { d: circle(20, -5, 2.2), zone: 'white', line: 1, shade: false, light: false },
  { d: circle(20.6, -5, 1.1), zone: 'dark', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Synthwave (Photon Knight): a neon grid visor on the same helm outline

part('skin.synthwave.helm', [
  { d: blob([-8, -27, -4, -35, 6, -38, 4, -31, 0, -26], 0.6), zone: 'team', banner: true, line: 2.2 },
  { d: blob([-13.4, -4, -14, -18, -9, -27, 2, -29.6, 11.4, -26, 15.4, -17, 15.6, -7, 11, -1, 0, 0], 0.85), zone: 'cloth2' },
  { d: blob([0, -20, 15.6, -18.6, 16, -9, 1, -9.6], 0.6), zone: 'dark', line: 1.8, shade: false },
  { d: join(rect(1, -17, 15, 0.9), rect(1, -14, 15, 0.9), rect(1, -11.4, 15, 0.9)), zone: 'magenta', line: 0, shade: false, light: false },
  { d: join(rect(4, -19.6, 0.9, 10), rect(8, -19.4, 0.9, 10), rect(12, -19, 0.9, 10)), zone: 'mint', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Kaiju Walker: dinosaur-head plating over the canopy and dorsal plates

part('skin.kaiju.head', [
  { d: blob([-8, -34, 6, -38, 20, -34, 28, -26, 27, -18, 18, -20, 8, -22, -2, -26], 0.8), zone: 'plate' },
  { d: join(poly([16, -20, 18, -15, 20, -20]), poly([21, -19.6, 23, -15, 25, -19]), poly([11, -21, 13, -16.6, 15, -21])), zone: 'white', line: 1, shade: false },
  { d: circle(16, -29, 2.4), zone: 'eyeglow', line: 1, shade: false, light: false },
  { d: poly([10, -32, 18, -33, 14, -30.6]), zone: 'dark', line: 0, shade: false, light: false },
]);
part('skin.kaiju.spikes', [
  { d: join(poly([-20, -30, -28, -26, -22, -22]), poly([-22, -18, -30, -13, -23, -10]), poly([-23, -6, -30, -1, -23, 2])), zone: 'plate', line: 2 },
]);

// ---------------------------------------------------------------------------------------------
// Crystal Spire (base.future): faceted glass and prism glints

part('skin.crystal.facets', [
  { d: join(poly([-134, -220, -112, -250, -124, -200]), poly([-86, -250, -72, -220, -84, -200]), poly([-120, -140, -104, -170, -110, -110]), poly([-60, -120, -44, -150, -50, -90])), zone: 'white', line: 0, alpha: 0.45, shade: false, light: false },
]);
part('skin.crystal.glints', [
  { d: join(star(-100, -280, 4, 1.6, 7, 45), star(-120, -190, 4, 1.4, 6, 0), star(-48, -130, 4, 1.4, 6, 45), star(-80, -90, 4, 1.2, 5, 0)), zone: 'white', line: 0, alpha: 0.9, shade: false, light: false },
]);
