/**
 * Sprite parts for the power rework's effects (DESIGN A2.9, A5.7, A12): the new powers' props and
 * energies, per age. Centred on their origin unless noted; runners and projectiles face +x (the effect
 * mirrors them by `dir`). Colour rule (A11): warm and blue tones stay pale (HSV saturation under 40%);
 * saturated colour appears only as small accents or in the mint, magenta and lilac energy hues.
 */
import { part } from '../parts/registry';
import { arcBand, blob, circle, ellipse, join, limb, poly, rect, rotate, rrect, star } from '../svg';

// ---------------------------------------------------------------------------------------------
// Shared: ground decals, glints, locks and cues

/** A flat ground ring (a zone edge seen in perspective), 100 lu wide; tinted per use. */
part('fx.p.groundRing', [{ d: join(arcBand(0, 0, 44, 50, 0, 360)), zone: 'white', line: 0, shade: false, light: false }]);
/** A soft ground disc, 100 lu wide, for zone washes; tinted per use. */
part('fx.p.groundDisc', [
  { d: circle(0, 0, 50), zone: 'white', line: 0, alpha: 0.35, shade: false, light: false },
  { d: circle(0, 0, 38), zone: 'white', line: 0, alpha: 0.35, shade: false, light: false },
]);
/** A four-point glint (a scope or blade catching the light). */
part('fx.p.glint', [
  { d: star(0, 0, 4, 1.2, 12, 0), zone: 'white', line: 0, shade: false, light: false },
  { d: star(0, 0, 4, 0.8, 6, 45), zone: 'white', line: 0, alpha: 0.8, shade: false, light: false },
  { d: circle(0, 0, 2.2), zone: 'white', line: 0, shade: false, light: false },
]);
/** A lock-on reticle: an open ring with four inward ticks. */
part('fx.p.lock', [
  { d: join(arcBand(0, 0, 8, 9.6, 20, 70), arcBand(0, 0, 8, 9.6, 110, 160), arcBand(0, 0, 8, 9.6, 200, 250), arcBand(0, 0, 8, 9.6, 290, 340)), zone: 'white', line: 0, shade: false, light: false },
  { d: join(rect(-0.7, -12.5, 1.4, 5), rect(-0.7, 7.5, 1.4, 5), rect(-12.5, -0.7, 5, 1.4), rect(7.5, -0.7, 5, 1.4)), zone: 'white', line: 0, shade: false, light: false },
]);
/** A jammed-gear mark (Suppress): a gear crossed by a bar. */
part('fx.p.jam', [
  { d: join(star(0, 0, 8, 6.4, 8.4, 0), circle(0, 0, 6.6)), zone: '#E8E4F2', line: 1.2, shade: false },
  { d: circle(0, 0, 2.6), zone: '#4A3668', line: 0, shade: false, light: false },
  { d: rotate(rrect(-11, -1.6, 22, 3.2, 1.6), -40), zone: '#F03AA8', line: 1, shade: false, light: false },
]);
/** A thin vertical streak (a signal flare rising, a beam from the sky); 10 lu wide, 100 lu tall above the origin. */
part('fx.p.streak', [
  { d: poly([-5, 0, -1.5, -100, 1.5, -100, 5, 0]), zone: 'white', line: 0, alpha: 0.5, shade: false, light: false },
  { d: poly([-2, 0, -0.6, -100, 0.6, -100, 2, 0]), zone: 'white', line: 0, shade: false, light: false },
]);
/** A ground shadow, 100 lu wide (something falling from the sky). */
part('fx.p.shadow', [{ d: ellipse(0, 0, 50, 7), zone: '#000000', line: 0, alpha: 0.6, shade: false, light: false }]);
/** A small team pennant on a pole (tinted with the team colour), pole foot at the origin. */
part('fx.p.pennant', [{ d: join(rect(-0.8, -30, 1.6, 30), poly([0.8, -30, 16, -26, 0.8, -21])), zone: 'white', line: 0.8, shade: false, light: false }]);

// ---------------------------------------------------------------------------------------------
// Stone

/** Rockslide: a rough slab of rock tumbling along (tinted per use). */
part('fx.p.slab', [
  { d: blob([-11, 2, -9, -7, -2, -11, 7, -9, 12, -2, 10, 7, 1, 10, -8, 8], 0.75), zone: '#8C7B68', line: 1.6 },
  { d: join(poly([-4, -6, 0, -2, -2, 2]), poly([4, 1, 8, 3, 5, 6])), zone: '#6E6254', line: 0, shade: false, light: false },
]);
/** Sticky Tar: a glossy pitch pool (100 lu wide, flat), with a highlight streak and bubbles. */
part('fx.p.tarPool', [
  { d: blob([-50, 0, -44, -4.4, -26, -6, -4, -5, 18, -6.6, 40, -4.6, 50, 0, 42, 4.6, 20, 6, -6, 5.2, -30, 6, -46, 3.6], 0.8), zone: '#2B2622', line: 1.4, shade: false },
  { d: join(ellipse(-18, -2.4, 12, 1.2), ellipse(16, -3, 8, 1), ellipse(34, -1.2, 4, 0.7)), zone: '#8E857B', line: 0, alpha: 0.7, shade: false, light: false },
  { d: join(circle(-30, -1, 1.6), circle(6, 1, 1.2), circle(26, 0, 1.4)), zone: '#4A423B', line: 0.5, shade: false, light: false },
]);
/** A tar bubble about to pop. */
part('fx.p.tarBubble', [
  { d: circle(0, 0, 4), zone: '#332D28', line: 0.8, shade: false },
  { d: ellipse(-1.2, -1.6, 1.4, 0.9), zone: '#9A9187', line: 0, shade: false, light: false },
]);
/** Tangle Vines: one thorny tendril curling up from the ground (origin at its root, ~24 lu tall, faces +x). */
part('fx.p.vine', [
  {
    d: join(
      limb(0, 0, 2.4, 1.5, -8, 2),
      limb(1.5, -8, 2, -1.5, -15, 1.6),
      limb(-1.5, -15, 1.6, 2.5, -21, 1.2),
      limb(2.5, -21, 1.2, 6.5, -22.5, 0.8),
      limb(6.5, -22.5, 0.8, 7.5, -19.5, 0.6),
    ),
    zone: '#4E8A3A',
    line: 1.1,
  },
  { d: join(poly([2.8, -5, 6.4, -6.4, 3.2, -3.2]), poly([-2.4, -12, -6, -13.6, -2.6, -10.2]), poly([0.6, -18, 3.6, -20.6, 1.2, -16.4])), zone: '#2F5A26', line: 0.6, shade: false },
  { d: join(blob([2.6, -9.6, 7.6, -12.6, 10.6, -11, 6.8, -8.2], 0.8), blob([-2, -16.4, -7.6, -18.6, -9.6, -16.4, -5, -14.6], 0.8)), zone: '#7FBF52', line: 0.8 },
  { d: join(limb(0.4, -1, 0.6, 0.8, -7, 0.4), limb(0, -9, 0.5, -1, -14, 0.3)), zone: '#A8DC7E', line: 0, shade: false, light: false, alpha: 0.8 },
]);
/** Tangle Vines: a single leaf blowing off the tangle. */
part('fx.p.leaf', [
  { d: blob([-4, 0, -1.6, -2.6, 3.4, -2, 4.6, 0, 1.6, 2.2, -2.4, 1.8], 0.8), zone: '#7FBF52', line: 0.7 },
  { d: limb(-3.6, 0, 0.35, 3.8, -0.2, 0.2), zone: '#3F6E30', line: 0, shade: false, light: false },
]);
/** Tangle Vines: the matted root bed on the ground, 100 lu wide (sized with the zone). */
part('fx.p.vineMat', [
  { d: blob([-50, 0, -40, -3.6, -20, -4.4, 0, -3.4, 22, -4.6, 42, -3.2, 50, 0, 40, 3.6, 18, 4.2, -4, 3.6, -26, 4.4, -44, 3], 0.8), zone: '#3C5A2C', line: 1.2, shade: false },
  {
    d: join(...[-40, -24, -8, 8, 24, 38].map((x, i) => limb(x - 7, i % 2 ? -1.6 : 1.2, 0.9, x + 7, i % 2 ? 1.4 : -1.8, 0.7))),
    zone: '#5E8F42',
    line: 0,
    shade: false,
    light: false,
  },
  { d: join(...[-34, -14, 4, 20, 34].map((x) => circle(x, -0.4, 1.1))), zone: '#9FD06E', line: 0, shade: false, light: false, alpha: 0.85 },
]);
/** Hunt Cry: three raking claw marks in bone white. */
part('fx.p.claw', [
  {
    d: join(
      blob([-8, 8, -9, 0, -6, -9, -5, -9, -6, 0, -5, 8], 0.7),
      blob([-1, 10, -2, 0, 1, -11, 2, -11, 1, 0, 2, 10], 0.7),
      blob([6, 8, 5, 0, 8, -9, 9, -9, 8, 0, 9, 8], 0.7),
    ),
    zone: '#EDE3C8',
    line: 1.1,
    shade: false,
  },
]);
/** Hunter's Spear: a long wooden spear with a knapped flint head and a sinew binding, point +x. */
part('fx.p.spear', [
  { d: limb(-30, 0, 1.3, 14, 0, 1.1), zone: '#7A6552', line: 1 },
  { d: blob([13, -3.4, 20, -2.6, 26, 0, 20, 2.6, 13, 3.4], 0.6), zone: '#9A9288', line: 1 },
  { d: join(poly([16, -1.6, 19, -0.4, 16, 0.4]), poly([19, 0.8, 22, 0.2, 20, 1.8])), zone: '#77716A', line: 0, shade: false, light: false },
  { d: rrect(9, -1.9, 5, 3.8, 1), zone: '#C9B48E', line: 0.6, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Bronze Age: Hellas

/** Zeus's Bolts: a jagged lightning bolt from 300 lu up to the ground (origin at the strike point). */
part('fx.p.lightning', [
  { d: poly([-2, -300, 16, -240, 2, -232, 22, -160, 6, -152, 18, -80, 2, -74, 8, 0, -8, -80, 4, -86, -12, -160, 6, -168, -16, -236, -2, -244, -18, -300]), zone: '#E7DCFF', line: 0, alpha: 0.45, shade: false, light: false },
  { d: poly([-1, -300, 10, -240, -1, -234, 14, -160, 1, -154, 10, -80, -1, -76, 3, 0, -4, -80, 6, -86, -6, -160, 7, -166, -10, -236, 2, -244, -9, -300]), zone: '#FFFFFF', line: 0, shade: false, light: false },
]);
/** A storm cloud, 100 lu wide (dark, cool grey). */
part('fx.p.stormCloud', [
  // a towering, bumpy thunderhead: dark belly, billowing crown, lit rims
  { d: join(ellipse(0, 2, 46, 10), circle(-32, -6, 14), circle(-16, -14, 17), circle(4, -20, 19), circle(24, -12, 16), circle(38, -3, 11), circle(-42, 1, 8)), zone: '#6A6676', line: 1.4, alpha: 0.97 },
  { d: join(ellipse(0, 5, 42, 6), ellipse(-20, 4, 16, 5), ellipse(22, 4, 16, 5)), zone: '#46434F', line: 0, alpha: 0.9, shade: false, light: false },
  { d: join(ellipse(-18, -24, 9, 4), ellipse(4, -32, 11, 4.5), ellipse(24, -22, 8, 3.5), ellipse(-34, -14, 6, 3)), zone: '#B4B0C0', line: 0, alpha: 0.85, shade: false, light: false },
]);
/** Medusa's Gaze: the Gorgon's eye with serpent locks, 36 lu wide. */
part('fx.p.gorgonEye', [
  {
    d: join(
      ...[-60, -30, 0, 30, 60].map((a) => rotate(blob([-1.6, -10, 1.6, -10, 2.4, -16, 0, -22, -2.6, -17], 0.9), a)),
      ...[150, 180, 210].map((a) => rotate(blob([-1.4, -10, 1.4, -10, 2, -15, 0, -19, -2.2, -15], 0.9), a)),
    ),
    zone: '#8FA37E',
    line: 1,
  },
  { d: blob([-18, 0, -8, -8, 0, -9, 8, -8, 18, 0, 8, 8, 0, 9, -8, 8], 0.55), zone: '#EFEBDD', line: 1.4 },
  { d: circle(0, 0, 6.4), zone: '#9FBF8A', line: 1, shade: false },
  { d: ellipse(0, 0, 1.6, 5.4), zone: '#2A2A26', line: 0, shade: false, light: false },
  { d: circle(-2.2, -2.4, 1.4), zone: '#FFFFFF', line: 0, shade: false, light: false },
]);
/** A crack of petrified ground, 100 lu wide (stone grey). */
part('fx.p.petrify', [
  { d: join(poly([-50, 0, -30, -1.2, -18, 1, 0, -0.8, 14, 1.4, 34, -0.6, 50, 0, 34, 1.4, 14, 2.6, 0, 0.8, -18, 2.4, -30, 0.6])), zone: '#6F6A63', line: 0, alpha: 0.9, shade: false, light: false },
  { d: join(poly([-24, 0, -20, -5, -18, -4.6, -21, 0.4]), poly([8, 0, 12, -6, 14, -5.4, 10, 0.6]), poly([28, 0, 25, 4, 27, 4.4, 30, 0.4])), zone: '#6F6A63', line: 0, shade: false, light: false },
]);
/** Chariot Rush: a two-horse bronze chariot with a driver, facing +x, 64 lu long, wheels on the ground. */
part('fx.p.chariot', [
  // far horse
  { d: blob([4, -30, 10, -38, 26, -38, 34, -44, 40, -42, 38, -34, 32, -30, 30, -18, 26, -8, 24, -18, 12, -18, 8, -8, 4, -18], 0.7), zone: '#6E6254', line: 1.4 },
  // near horse
  { d: blob([0, -26, 6, -34, 22, -34, 30, -40, 36, -38, 34, -30, 28, -26, 26, -14, 22, -2, 20, -14, 8, -14, 4, -2, 0, -14], 0.7), zone: '#8C7B68', line: 1.6 },
  { d: blob([28, -40, 31, -48, 34, -42], 0.6), zone: '#EDE3C8', line: 1, shade: false },
  // car and driver
  { d: poly([-22, -26, -4, -26, 0, -18, -24, -18]), zone: '#B09C78', line: 1.6 },
  { d: join(limb(-2, -20, 1, 8, -24, 1)), zone: '#7A6552', line: 0.8, shade: false, light: false },
  { d: join(blob([-18, -26, -16, -40, -10, -42, -8, -26], 0.6), circle(-12, -46, 4)), zone: '#C9BBA2', line: 1.2 },
  { d: blob([-16, -48, -12, -54, -6, -50, -12, -47], 0.6), zone: '#B09C78', line: 1, shade: false },
  // wheel
  { d: arcBand(-14, -9, 6.4, 9, 0, 360), zone: '#7A6C54', line: 1.2, shade: false },
  { d: join(rotate(rect(-14.6, -17, 1.2, 16), 0), limb(-21, -9, 0.6, -7, -9, 0.6)), zone: '#7A6C54', line: 0, shade: false, light: false },
]);
/** Apollo's Arrow: a long golden arrow, point +x. */
part('fx.p.goldArrow', [
  { d: limb(-28, 0, 1.1, 16, 0, 1.1), zone: '#E9DDBE', line: 0.8 },
  { d: poly([14, -3.6, 26, 0, 14, 3.6]), zone: '#F7EFD8', line: 0.8 },
  { d: join(poly([-28, 0, -34, -4.2, -23, -0.6]), poly([-28, 0, -34, 4.2, -23, 0.6])), zone: '#FFFFFF', line: 0.6, shade: false, light: false },
]);
/** A sunburst of rays (Apollo's light), 20 lu wide. */
part('fx.p.sunburst', [
  { d: star(0, 0, 12, 3, 10, 0), zone: '#FFF6E0', line: 0, alpha: 0.8, shade: false, light: false },
  { d: circle(0, 0, 4), zone: '#FFFFFF', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Medieval

/** Caltrops: a four-spiked iron star lying on the ground. */
part('fx.p.caltrop', [
  { d: join(poly([0, -7, 1.4, -1, -1.4, -1]), poly([-6, 2.6, -1, 0.2, -0.4, 1.8]), poly([6, 2.6, 1, 0.2, 0.4, 1.8]), poly([0, 3.4, 1.2, 0, -1.2, 0])), zone: '#4A4F55', line: 0.8, shade: false },
  { d: circle(0, 0.2, 1.6), zone: '#8D9398', line: 0, shade: false, light: false },
]);
/** Boiling Oil: a surge of dark hot oil, crest +x, 60 lu wide and 34 lu tall from the ground. */
part('fx.p.oilWave', [
  { d: blob([-30, 0, -26, -10, -10, -26, 10, -34, 24, -26, 26, -16, 16, -20, 10, -14, 20, -4, 30, 0], 0.7), zone: '#4E443A', line: 1.4, alpha: 0.95 },
  { d: blob([2, -30, 16, -32, 24, -24, 16, -26, 8, -26], 0.7), zone: '#A89A84', line: 0, shade: false },
  { d: join(circle(-16, -8, 1.8), circle(-6, -18, 1.4), circle(-22, -3, 1.2)), zone: '#D8C8A8', line: 0, shade: false, light: false },
]);
/** A drop of hot oil. */
part('fx.p.oilDrop', [{ d: blob([0, -4, 2.4, 0, 1.4, 2.8, -1.4, 2.8, -2.4, 0], 0.8), zone: '#5A4E42', line: 0.8, light: false }]);
/** Knights' Charge: a mounted knight with a couched lance, facing +x, 70 lu long, hooves on the ground. */
part('fx.p.knight', [
  // horse (caparisoned, pale parchment cloth with a slate trim)
  { d: blob([-24, -30, -18, -40, 10, -42, 22, -48, 30, -46, 32, -38, 24, -32, 22, -20, 26, -6, 22, 0, 16, -16, 0, -18, -10, -16, -14, 0, -20, -4, -18, -20], 0.7), zone: '#9A9288', line: 1.6 },
  { d: blob([-22, -30, -16, -42, 12, -42, 18, -30, 10, -20, -14, -20], 0.6), zone: '#E8DFC8', line: 1.2 },
  { d: rect(-22, -24, 38, 3), zone: '#6B7682', line: 0, shade: false, light: false },
  // rider
  { d: blob([-8, -40, -6, -58, 4, -60, 6, -42], 0.6), zone: '#8D9398', line: 1.4 },
  { d: join(rrect(-5, -72, 10, 12, 4), rect(-1, -76, 2, 4)), zone: '#8D9398', line: 1.4 },
  { d: rect(-3, -68, 8, 1.6), zone: '#2F2B2A', line: 0, shade: false, light: false },
  // shield and lance
  { d: blob([-10, -54, 0, -56, 0, -44, -5, -38, -10, -44], 0.6), zone: '#6B7682', line: 1.2 },
  { d: limb(-10, -50, 1.2, 46, -44, 0.8), zone: '#7A6552', line: 0.8 },
  { d: poly([44, -46.4, 52, -44, 44, -41.8]), zone: '#8D9398', line: 0.8, shade: false },
]);
/** Undermine: a timber prop snapping (props of a sapper's tunnel). */
part('fx.p.timber', [
  { d: rrect(-12, -2.4, 24, 4.8, 1.2), zone: '#7A6552', line: 1.1 },
  { d: join(rect(-8, -0.4, 6, 0.8), rect(3, -1, 5, 0.8)), zone: '#5E4D3F', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Age of Muskets

/** A musket's pan-and-muzzle flash seen side-on, pointing +x. */
part('fx.p.muzzleFlash', [
  { d: poly([0, 0, 8, -5, 6, -1.4, 18, 0, 6, 1.4, 8, 5]), zone: '#FFF1D2', line: 0, shade: false, light: false },
  { d: circle(2, 0, 3), zone: '#FFFFFF', line: 0, shade: false, light: false },
]);
/** Boarding Nets: a tarred rope net thrown over the zone (100 lu wide, a low dome), with lead weights. */
part('fx.p.net', [
  {
    d: join(
      ...[-40, -28, -16, -4, 8, 20, 32].map((x) => limb(x - 8, 0, 1.1, x + 14, -22, 1.1)),
      ...[-32, -20, -8, 4, 16, 28, 40].map((x) => limb(x + 8, 0, 1.1, x - 14, -22, 1.1)),
      limb(-44, 0, 1.4, -20, -22, 1.4),
      limb(20, -22, 1.4, 44, 0, 1.4),
      limb(-20, -22, 1.4, 20, -22, 1.4),
    ),
    zone: '#A8966F',
    line: 0.7,
    shade: false,
    light: false,
  },
  { d: join(circle(-44, 0, 2.4), circle(-22, 0.6, 2.2), circle(0, 1, 2.2), circle(22, 0.6, 2.2), circle(44, 0, 2.4)), zone: '#4A4F55', line: 0.8, shade: false },
]);
/** A grapnel hook, point +x. */
part('fx.p.grapnel', [
  { d: join(limb(-6, 0, 1, 4, 0, 1), limb(4, 0, 0.9, 7, -4, 0.7), limb(4, 0, 0.9, 7, 4, 0.7)), zone: '#4A4F55', line: 0.8 },
  { d: limb(-22, 1, 0.5, -6, 0, 0.5), zone: '#B5A58A', line: 0, shade: false, light: false },
]);
/** A clod of earth thrown up by a cannon shot (tinted per use). */
part('fx.p.clod', [{ d: blob([-3, 0, -2, -2.6, 1.6, -3, 3.4, -0.4, 2, 2.4, -2, 2.2], 0.8), zone: '#6E5A48', line: 0.9 }]);

// ---------------------------------------------------------------------------------------------
// Great War

/** Barbed Wire: one coil of barbed wire on the ground, 24 lu wide. */
part('fx.p.wireCoil', [
  { d: join(...[-8, -2, 4].map((x) => arcBand(x, -8, 6.2, 7.9, 0, 360))), zone: '#6E7378', line: 0.4, shade: false, light: false },
  { d: join(...[-14, -9, -4, 1, 6, 11].map((x) => rotate(rect(x - 0.5, -17, 1, 3.4), 30))), zone: '#3E4247', line: 0, shade: false, light: false },
  { d: join(...[-6, 0, 6].map((x) => arcBand(x, -8.6, 6.6, 7.2, 200, 300))), zone: '#C9CED2', line: 0, shade: false, light: false },
]);
/** A wooden picket for the wire. */
part('fx.p.picket', [
  { d: poly([-1.6, 0, -1.6, -18, 0, -21, 1.6, -18, 1.6, 0]), zone: '#7A6552', line: 0.9 },
  { d: rect(-1.6, -12, 3.2, 1.2), zone: '#4A4F55', line: 0, shade: false, light: false },
]);
/** Railway Gun: a long pointed heavy shell, nose +x. */
part('fx.p.bigShell', [
  { d: blob([-12, -4, 6, -4, 16, 0, 6, 4, -12, 4], 0.4), zone: '#6F735C', line: 1.4 },
  { d: join(rect(-10, -4, 2, 8), rect(-5, -4, 1.4, 8)), zone: '#B09C78', line: 0, shade: false, light: false },
]);
/** Field Hospital: a rolled bandage unrolling (white). */
part('fx.p.bandage', [
  { d: join(circle(-6, 0, 4), rrect(-6, -2, 16, 4, 1.2)), zone: '#F4F1EA', line: 1 },
  { d: arcBand(-6, 0, 1.4, 2.4, 0, 360), zone: '#C9C2B4', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Modern

/** Strafing Run: a single-engine fighter in profile, nose +x, 50 lu long. */
part('fx.p.fighter', [
  { d: blob([-24, -2, -20, -5, 10, -6, 20, -4, 25, 0, 20, 4, -20, 3], 0.6), zone: '#62664A', line: 1.6 },
  { d: poly([-20, -3, -26, -12, -22, -12, -14, -3]), zone: '#3A3F45', line: 1.2 },
  { d: poly([-4, 1, 8, 1, 2, 9, -8, 9]), zone: '#3A3F45', line: 1.2 },
  { d: blob([4, -5, 8, -9, 14, -8, 14, -5], 0.6), zone: '#B8C4C8', line: 1, shade: false },
  { d: ellipse(26, 0, 1.2, 8), zone: '#DCD6C8', line: 0, alpha: 0.5, shade: false, light: false },
  { d: rect(-6, -3, 3, 3), zone: '#B0306A', line: 0, shade: false, light: false },
]);
/** Tank Rush: a medium tank, gun +x, 58 lu long, treads on the ground. */
part('fx.p.tank', [
  { d: rrect(-28, -12, 54, 12, 6), zone: '#3A3F45', line: 1.6 },
  { d: join(...[-22, -13, -4, 5, 14, 22].map((x) => circle(x, -6, 3.6))), zone: '#62664A', line: 1, shade: false },
  { d: poly([-26, -12, -22, -22, 22, -22, 28, -12]), zone: '#62664A', line: 1.6 },
  { d: blob([-12, -22, -8, -32, 8, -32, 12, -22], 0.6), zone: '#6E7354', line: 1.4 },
  { d: rrect(10, -29, 30, 3.6, 1.4), zone: '#3A3F45', line: 1.2 },
  { d: rect(-18, -20, 5, 3), zone: '#B8A67A', line: 0, shade: false, light: false },
]);
/** Point Defense micro-missile, nose +x. */
part('fx.p.microMissile', [
  { d: blob([-5, -1.3, 3, -1.3, 6, 0, 3, 1.3, -5, 1.3], 0.4), zone: '#E8E4F2', line: 0.7 },
  { d: join(poly([-5, -1.3, -7, -3, -4, -1.3]), poly([-5, 1.3, -7, 3, -4, 1.3])), zone: '#3AF0B4', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Future

/** Stasis Field: a hexagon-cell dome, 100 lu wide and 60 lu tall, open at the ground. */
part('fx.p.hexDome', [
  { d: blob([-50, 0, -46, -22, -30, -48, 0, -60, 30, -48, 46, -22, 50, 0], 0.8), zone: '#C9F7E4', line: 0, alpha: 0.28, shade: false, light: false },
  {
    d: join(
      ...[
        [-30, -14], [-10, -14], [10, -14], [30, -14],
        [-20, -30], [0, -30], [20, -30],
        [-10, -46], [10, -46],
      ].map(([x, y]) => arcBand(x as number, y as number, 7, 8.2, 0, 360)),
    ),
    zone: '#3AF0B4',
    line: 0,
    alpha: 0.7,
    shade: false,
    light: false,
  },
  { d: arcBand(0, 60, 58, 61, 204, 336), zone: '#FFFFFF', line: 0, alpha: 0.9, shade: false, light: false },
]);
/** A crystal shard (stasis shattering, comet ice). */
part('fx.p.shard', [
  { d: poly([-2, 0, 0, -6, 2.4, -1, 0.6, 4]), zone: '#E0D6FA', line: 0.6, shade: false },
  { d: poly([0, -5, 1.4, -1.4, 0.2, 0]), zone: '#FFFFFF', line: 0, shade: false, light: false },
]);
/** Drone Swarm: a small quad-rotor drone with mint running lights. */
part('fx.p.drone', [
  { d: join(rrect(-6, -2, 12, 4, 2), limb(-10, -3, 0.6, 10, -3, 0.6)), zone: '#3A3D46', line: 1 },
  { d: join(ellipse(-10, -4.4, 4.4, 0.9), ellipse(10, -4.4, 4.4, 0.9)), zone: '#DCD8E4', line: 0, alpha: 0.7, shade: false, light: false },
  { d: join(circle(-3, 0, 1.1), circle(3, 0, 1.1)), zone: '#3AF0B4', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Cosmic

/** Singularity: the dark core, 20 lu wide. */
part('fx.p.voidCore', [
  { d: circle(0, 0, 10), zone: '#1E1630', line: 0, shade: false, light: false },
  { d: arcBand(0, 0, 9, 10.6, 0, 360), zone: '#E7DCFF', line: 0, shade: false, light: false },
]);
/** The accretion disc seen at a low angle, 60 lu wide (lilac and violet bands). */
part('fx.p.accretion', [
  { d: arcBand(0, 0, 18, 30, 0, 360), zone: '#7A5AA8', line: 0, alpha: 0.75, shade: false, light: false },
  { d: join(arcBand(0, 0, 14, 19, 200, 340), arcBand(0, 0, 22, 25, 20, 160)), zone: '#E7DCFF', line: 0, shade: false, light: false },
]);
/** Comet Run: an icy comet head with a streaming tail, head at the origin, facing +x, 60 lu long. */
part('fx.p.comet', [
  { d: blob([6, 0, -8, -7, -34, -5, -56, -1, -34, 3, -8, 7], 0.8), zone: '#C9B8F0', line: 0, alpha: 0.55, shade: false, light: false },
  { d: blob([6, 0, -6, -4, -26, -2, -40, 0, -26, 2, -6, 4], 0.8), zone: '#E7DCFF', line: 0, alpha: 0.8, shade: false, light: false },
  { d: blob([-6, -6, 2, -8, 9, -3, 8, 4, 0, 7, -6, 4], 0.8), zone: '#E0D6FA', line: 1.2 },
  { d: ellipse(-1, -2.4, 3, 2), zone: '#FFFFFF', line: 0, shade: false, light: false },
]);
/** Solar Flare: a looping arc of plasma rising from the ground, 60 lu wide and 70 lu tall. */
part('fx.p.flareArc', [
  { d: arcBand(0, 0, 22, 34, 180, 360), zone: '#FFE9D6', line: 0, alpha: 0.55, shade: false, light: false },
  { d: arcBand(0, 0, 26, 30, 185, 355), zone: '#FFFFFF', line: 0, shade: false, light: false },
]);
