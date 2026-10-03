/**
 * Sprite parts for particles, status overlays and projectiles (DESIGN A12 VFX list, A14.1).
 *
 * Particles are centred on their origin; projectiles point along +x (the flight direction). Colours
 * follow the colour rule (A11): hot colours are pale (cream, peach) with at most a small saturated
 * accent, and energy effects use mint, magenta and lilac rather than cyan or orange.
 */
import { part } from '../parts/registry';
// The power rework's props and energies (registered alongside these parts).
import './powerSprites';
import { arcBand, blob, circle, ellipse, join, limb, ngon, poly, rect, rotate, rrect, star, wedge } from '../svg';

/** Effect zone colours (resolved through this palette for every effect and projectile). */
export const FX_ZONES: Readonly<Record<string, number>> = {
  white: 0xffffff,
  dust: 0xd9cfbd,
  dust2: 0xb9ad98,
  smoke: 0x8e8984,
  smoke2: 0x6c6864,
  spark: 0xfff6e2,
  hot: 0xf29a3a,
  flash: 0xfff1d2,
  ember: 0xf0cda0,
  star: 0xfff1b8,
  stone: 0x9a9288,
  stone2: 0x77716a,
  wood: 0x7a6552,
  wood2: 0x5e4d3f,
  metal: 0x8d9398,
  metal2: 0x4a4f55,
  iron: 0x3e3b3a,
  dark: 0x2f2b2a,
  bone: 0xede3c8,
  feather: 0xf2efe6,
  beak: 0xe39a3c,
  heal: 0x5fe0a8,
  mint: 0x3af0b4,
  magenta: 0xf03aa8,
  lilac: 0xc9b8f0,
  void: 0x7a5aa8,
  void2: 0x4a3668,
  mark: 0xe04c9a,
  pitch: 0x3a342e,
  tongue: 0xd98fa8,
  gold: 0xe6c45c,
  coin2: 0xb89235,
  xp: 0xe7dcff,
  hive: 0xcdb98a,
  shell: 0x6f735c,
  paper: 0xe8dfc8,
  canopy: 0xede6d6,
  plane: 0x62664a,
  plane2: 0x3a3f45,
  rust: 0x8e2a4a,
  red: 0xb0306a,
  rope: 0xb5a58a,
  shadow: 0x000000,
  // A17.12
  sea: 0xa9d2da,
  foam: 0xeef8f6,
  bronze: 0xb09c78,
  bronze2: 0x7a6c54,
  flare: 0xf8e0f0,
  ion: 0x3fe0b0,
  violet: 0xb49ae0,
  crystal: 0xe0d6fa,
  engine: 0x5b6168,
  engine2: 0x2b2a2e,
  canvas: 0xdcd6c8,
};

// ---------------------------------------------------------------------------------------------
// Particles

part('fx.p.dust', [{ d: join(circle(0, 0, 5), circle(4.4, -1.6, 3.8), circle(-4, -1.2, 3.6), circle(0.6, -4, 3.8)), zone: 'dust', line: 0 }]);
part('fx.p.smoke', [{ d: join(circle(0, 0, 6), circle(5, -2, 4.6), circle(-5, -1.4, 4.4), circle(0.8, -5, 4.8)), zone: 'smoke', line: 0, alpha: 0.9 }]);
part('fx.p.spark', [{ d: poly([-5, 0, 0, -1.3, 7, 0, 0, 1.3]), zone: 'spark', line: 0, shade: false, light: false }]);
part('fx.p.sparkHot', [{ d: poly([-4, 0, 0, -1.2, 6, 0, 0, 1.2]), zone: 'hot', line: 0, shade: false, light: false }]);
part('fx.p.star', [{ d: star(0, 0, 5, 2.4, 5.6), zone: 'star', line: 1.2, shade: false, light: false }]);
part('fx.p.coin', [
  { d: circle(0, 0, 4.2), zone: 'gold', line: 1.2, light: false },
  { d: rrect(-0.9, -2.4, 1.8, 4.8, 0.9), zone: 'coin2', line: 0, shade: false, light: false },
]);
part('fx.p.chunk', [{ d: poly([-3.6, -2.4, 1.2, -3.6, 4, 0.4, 0.8, 3.4, -3.2, 2]), zone: 'stone', line: 1.2 }]);
part('fx.p.chunkWood', [{ d: poly([-4, -1.4, 4, -2, 4.6, 1, -3.6, 1.6]), zone: 'wood', line: 1.2 }]);
part('fx.p.glow', [
  { d: circle(0, 0, 10), zone: 'white', line: 0, alpha: 0.14, shade: false, light: false },
  { d: circle(0, 0, 7), zone: 'white', line: 0, alpha: 0.18, shade: false, light: false },
  { d: circle(0, 0, 4), zone: 'white', line: 0, alpha: 0.3, shade: false, light: false },
]);
part('fx.p.ring', [{ d: arcBand(0, 0, 8.4, 10, 0, 360), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.ringThick', [{ d: arcBand(0, 0, 6.4, 10, 0, 360), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.disc', [{ d: circle(0, 0, 10), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.bubble', [
  { d: circle(0, 0, 10), zone: 'white', line: 0, alpha: 0.22, shade: false, light: false },
  { d: arcBand(0, 0, 8.3, 10, 0, 360), zone: 'white', line: 0, alpha: 0.8, shade: false, light: false },
  { d: arcBand(0, 0, 6.4, 7.6, 200, 260), zone: 'white', line: 0, alpha: 0.8, shade: false, light: false },
]);
part('fx.p.plus', [{ d: join(rrect(-1.6, -5, 3.2, 10, 1), rrect(-5, -1.6, 10, 3.2, 1)), zone: 'heal', line: 1.4, shade: false }]);
part('fx.p.reticle', [
  { d: arcBand(0, 0, 7, 8.6, 0, 360), zone: 'mark', line: 0, shade: false, light: false },
  { d: join(rect(-1, -12, 2, 5), rect(-1, 7, 2, 5), rect(-12, -1, 5, 2), rect(7, -1, 5, 2)), zone: 'mark', line: 0, shade: false, light: false },
  { d: circle(0, 0, 1.6), zone: 'mark', line: 0, shade: false, light: false },
]);
part('fx.p.clock', [
  { d: circle(0, 0, 10), zone: 'lilac', line: 0, alpha: 0.35, shade: false, light: false },
  { d: arcBand(0, 0, 8.8, 10, 0, 360), zone: 'white', line: 0, shade: false, light: false },
  {
    d: join(...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => rotate(rrect(-0.5, -8.4, 1, i % 3 === 0 ? 2.6 : 1.4, 0.4), i * 30))),
    zone: 'white',
    line: 0,
    shade: false,
    light: false,
  },
  { d: join(rrect(-0.8, -6.6, 1.6, 7, 0.8), rotate(rrect(-0.7, -4.6, 1.4, 5, 0.7), 110)), zone: 'white', line: 0, shade: false, light: false },
]);
part('fx.p.swirl', [
  { d: join(arcBand(0, 0, 6, 8, 0, 120), arcBand(0, 0, 6, 8, 180, 300)), zone: 'void', line: 0, shade: false, light: false },
  { d: join(arcBand(0, 0, 2.6, 4, 60, 180), arcBand(0, 0, 2.6, 4, 240, 360)), zone: 'lilac', line: 0, shade: false, light: false },
]);
part('fx.p.bolt', [{ d: poly([-8, -1, -2, -3, 0, 0, 6, -2, 8, 0, 2, 2.6, 0, 0.4, -6, 2.4]), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.flash', [
  { d: star(0, 0, 7, 4, 10, 0), zone: 'flash', line: 0, shade: false, light: false },
  { d: circle(0, 0, 4.2), zone: 'white', line: 0, shade: false, light: false },
]);
part('fx.p.beam', [{ d: rrect(0, -2, 10, 4, 2), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.drop', [{ d: blob([0, -4, 2.6, 0, 1.6, 3, -1.6, 3, -2.6, 0], 0.8), zone: 'pitch', line: 1, light: false }]);
part('fx.p.snow', [{ d: circle(0, 0, 1.6), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.ember', [{ d: circle(0, 0, 1.4), zone: 'ember', line: 0, shade: false, light: false }]);
part('fx.p.nanite', [{ d: ngon(0, 0, 6, 2.2), zone: 'mint', line: 0.8, shade: false, light: false }]);
part('fx.p.xp', [{ d: star(0, 0, 4, 1.2, 4.6, 0), zone: 'xp', line: 0, shade: false, light: false }]);
part('fx.p.confetti', [{ d: rect(-2, -1, 4, 2), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.slash', [{ d: arcBand(0, 0, 9, 12, 200, 330), zone: 'spark', line: 0, shade: false, light: false }]);
part('fx.p.scorch', [{ d: blob([-6, 0, -3, -2.4, 4, -2, 7, 0, 3, 2.2, -4, 2], 0.8), zone: 'dark', line: 0, alpha: 0.6, shade: false, light: false }]);
part('fx.p.cloud', [
  {
    d: join(ellipse(0, 0, 14, 7), ellipse(-10, 2, 9, 6), ellipse(11, 2, 9, 5.6), ellipse(-3, -5, 8, 6), ellipse(6, -4, 7, 5)),
    zone: 'smoke',
    line: 0,
    alpha: 0.85,
  },
]);
part('fx.p.zone', [{ d: rect(-50, -3, 100, 6), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.zoneEdge', [{ d: rect(-1.5, -40, 3, 40), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.pillar', [{ d: poly([-8, 0, -5, -200, 5, -200, 8, 0]), zone: 'white', line: 0, alpha: 0.85, shade: false, light: false }]);
part('fx.p.arrowFall', [
  { d: limb(-10, 0, 0.8, 7, 0, 0.8), zone: 'wood', line: 0.8, shade: false, light: false },
  { d: poly([7, -2, 12, 0, 7, 2]), zone: 'metal', line: 0.8, shade: false, light: false },
  { d: join(poly([-10, 0, -13, -2.6, -8, -0.4]), poly([-10, 0, -13, 2.6, -8, 0.4])), zone: 'feather', line: 0.6, shade: false, light: false },
]);
part('fx.p.parachute', [
  { d: blob([-14, 0, -12, -9, 0, -13, 12, -9, 14, 0, 7, -2, 0, 0, -7, -2], 0.7), zone: 'canopy', line: 1.6 },
  { d: join(limb(-13, 0, 0.4, -1, 18, 0.4), limb(13, 0, 0.4, 1, 18, 0.4), limb(0, 0, 0.4, 0, 18, 0.4)), zone: 'rope', line: 0, shade: false, light: false },
  { d: join(circle(0, 20, 3), rrect(-3, 22, 6, 8, 2)), zone: 'plane', line: 1.2 },
]);
part('fx.p.plane', [
  { d: blob([-26, -2, -18, -6, 16, -6, 26, -2, 24, 3, -22, 3], 0.6), zone: 'plane', line: 2 },
  { d: poly([-6, -2, 6, -2, -2, 12, -10, 12]), zone: 'plane2', line: 1.6 },
  { d: poly([-24, -3, -20, -12, -15, -12, -16, -3]), zone: 'plane2', line: 1.6 },
  { d: ellipse(20, -4, 3, 2), zone: 'metal', line: 1.2, shade: false },
]);
part('fx.p.aurochs', [
  {
    d: blob([-20, -2, -16, -14, -2, -18, 12, -16, 18, -10, 26, -12, 30, -6, 26, 0, 18, 2, 14, 12, 10, 12, 8, 4, -8, 4, -10, 12, -14, 12, -16, 4], 0.6),
    zone: 'white',
    line: 1.6,
    alpha: 0.72,
  },
  { d: join(blob([18, -12, 16, -20, 20, -24, 22, -18], 0.6), blob([22, -12, 24, -20, 28, -22, 26, -14], 0.6)), zone: 'bone', line: 1.4, alpha: 0.8 },
]);
part('fx.p.meteor', [
  { d: blob([-6, -1, -3, -6, 4, -6, 7, 0, 3, 6, -4, 5], 0.8), zone: 'stone2', line: 1.6 },
  { d: join(circle(-1, -1, 1.6), circle(3, 2, 1.2)), zone: 'ember', line: 0, shade: false, light: false },
]);
part('fx.p.frame', [{ d: join(rect(0, 0, 100, 4), rect(0, 96, 100, 4), rect(0, 0, 4, 100), rect(96, 0, 4, 100)), zone: 'white', line: 0, shade: false, light: false }]);
part('fx.p.vignette', [
  {
    d: join(
      poly([0, 0, 100, 0, 100, 10, 0, 10]),
      poly([0, 90, 100, 90, 100, 100, 0, 100]),
      poly([0, 0, 10, 0, 10, 100, 0, 100]),
      poly([90, 0, 100, 0, 100, 100, 90, 100]),
    ),
    zone: 'white',
    line: 0,
    shade: false,
    light: false,
    alpha: 0.6,
  },
]);
part('fx.p.wedge', [{ d: wedge(0, 0, 10, -20, 20), zone: 'white', line: 0, shade: false, light: false }]);

// ---------------------------------------------------------------------------------------------
// Projectiles (pointing +x)

part('proj.rock', [{ d: blob([-3.6, 0, -2, -3, 2.4, -3.2, 3.8, 0.2, 1.6, 3.2, -2.4, 2.8], 0.8), zone: 'stone', line: 1.6 }]);
part('proj.boulder', [
  { d: blob([-7, 0, -4.6, -6, 2, -7.2, 7, -3, 6.4, 4, 0, 7, -5.6, 4.4], 0.8), zone: 'stone', line: 2 },
  { d: join(poly([-2, -4, 1, -1, -1, 2]), poly([2, 1, 5, 2, 3, 4])), zone: 'stone2', line: 0, shade: false, light: false },
]);
part('proj.bee', [
  { d: ellipse(0, 0, 4, 2.8), zone: 'hive', line: 1.2 },
  { d: join(rect(-1.8, -2.6, 1.3, 5.2), rect(0.8, -2.6, 1.3, 5.2)), zone: 'dark', line: 0, shade: false, light: false },
  { d: join(ellipse(-1, -3.8, 2.2, 1.5), ellipse(1.4, -3.6, 2, 1.4)), zone: 'white', line: 1, alpha: 0.9, shade: false, light: false },
  { d: poly([-4, 0, -6.4, -0.6, -6.4, 0.6]), zone: 'dark', line: 0, shade: false, light: false },
]);
part('proj.log', [
  { d: rrect(-12, -6, 24, 12, 6), zone: 'wood', line: 2 },
  { d: ellipse(11, 0, 3.2, 5.6), zone: 'wood2', line: 1.6 },
  { d: arcBand(11, 0, 1.2, 2, 0, 360), zone: 'wood', line: 0, shade: false, light: false },
]);
// Stone wave (CONTENT_PLAN 5.1): the Bolas Thrower's three-ball bolas, the Atlatl dart, the Herbalist's herb
// puff and the Quill Porcupine's quill
part('proj.bolas', [
  { d: join(limb(0, 0, 0.6, -6, -4, 0.6), limb(0, 0, 0.6, 6, -3, 0.6), limb(0, 0, 0.6, 0, 6, 0.6)), zone: 'wood', line: 0.8 },
  { d: join(ellipse(-6, -4, 2.6, 2.6), ellipse(6, -3, 2.6, 2.6), ellipse(0, 6, 2.6, 2.6)), zone: 'bone', line: 1.2 },
]);
part('proj.dart', [
  { d: limb(-14, 0, 0.9, 9, 0, 0.8), zone: 'wood', line: 1 },
  { d: poly([8, -2.2, 14, 0, 8, 2.2]), zone: 'stone', line: 1 },
  { d: join(poly([-14, 0, -17.6, -3, -11, -0.6]), poly([-14, 0, -17.6, 3, -11, 0.6])), zone: 'feather', line: 0.8, shade: false, light: false },
]);
part('proj.herb', [
  { d: join(ellipse(0, 0, 3.4, 3.0), ellipse(-3, -1.4, 2.2, 2.0), ellipse(2.6, 1.6, 2.0, 1.8)), zone: 'heal', line: 0.8, alpha: 0.85 },
  { d: join(ellipse(-1, -1, 1.0, 1.0), ellipse(1.6, 0.4, 0.8, 0.8)), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.quill', [
  { d: limb(-7, 0, 0.8, 5, 0, 0.4), zone: 'bone', line: 0.9 },
  { d: poly([4, -0.8, 8, 0, 4, 0.8]), zone: 'dark', line: 0.6 },
]);
// Snowball Pebbler skin: a snowball the size of the pebble it replaces (clarity parity, A5.8).
part('proj.snowball', [
  { d: circle(0, 0, 3.6), zone: 'white', line: 1.4 },
  { d: join(circle(-1.2, -1.2, 1.1), circle(1.4, 1, 0.6)), zone: 'lilac', line: 0, alpha: 0.5, shade: false, light: false },
]);
// Bronze wave (CONTENT_PLAN 5.2): the Discus Thrower's discus (spun flat, seen edge-on), the Net
// Caster's weighted net and the Aulos Piper's note (a particle of fx.note_pop)
part('proj.discus', [
  { d: ellipse(0, 0, 6, 2.6), zone: 'bronze', line: 1.4 },
  { d: ellipse(-0.4, -0.7, 3.4, 1.0), zone: 'bone', line: 0, shade: false, light: false },
]);
part('proj.net', [
  { d: blob([-7, -5, 0, -7.5, 7, -4, 7.5, 3, 0, 7, -6.5, 4], 0.8), zone: 'rope', line: 1.2, alpha: 0.5 },
  { d: join(limb(-6, -4, 0.5, 6, 4, 0.5), limb(-6, 4, 0.5, 6, -4, 0.5), limb(0, -7, 0.5, 0, 7, 0.5), limb(-7, 0, 0.5, 7, 0, 0.5)), zone: 'rope', line: 0.6 },
  { d: join(circle(-7, -5, 1.4), circle(7, -4, 1.4), circle(7.5, 3, 1.4), circle(-6.5, 4, 1.4)), zone: 'stone', line: 0.8 },
]);
part('fx.p.note', [
  { d: join(ellipse(-2, 4, 2.8, 2.1), rect(0.2, -6, 1.3, 10.4), poly([1.5, -6, 6, -3.4, 6, -1.4, 1.5, -3.6])), zone: 'white', line: 1.2, shade: false },
]);
// Medieval wave (CONTENT_PLAN 5.3): the Yeoman Archer's long arrow, the Herald's trumpet note, the
// Alchemist's corked vial and the Springald's spear bolt
part('proj.longarrow', [
  { d: limb(-16, 0, 0.9, 10, 0, 0.9), zone: 'wood', line: 1 },
  { d: poly([9, -2.6, 16, 0, 9, 2.6]), zone: 'metal', line: 1 },
  { d: join(poly([-16, 0, -20, -3.4, -12, -0.6]), poly([-16, 0, -20, 3.4, -12, 0.6])), zone: 'feather', line: 0.8, shade: false, light: false },
]);
part('proj.note', [
  { d: join(ellipse(-2.4, 4.4, 3.2, 2.4), rect(0.2, -6.6, 1.5, 11.2), poly([1.7, -6.6, 6.6, -3.8, 6.6, -1.6, 1.7, -4])), zone: 'bone', line: 1.3 },
]);
part('proj.vial', [
  { d: blob([-3.4, 0, -2.6, -3.6, 2.6, -3.6, 3.4, 0, 2.4, 3.6, -2.4, 3.6], 0.9), zone: 'mint', line: 1.3, alpha: 0.9 },
  { d: rrect(-1.4, -6.4, 2.8, 3, 0.8), zone: 'wood', line: 0.9 },
  { d: ellipse(-1.2, -0.8, 0.9, 1.4), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.spear_bolt', [
  { d: limb(-14, 0, 1.5, 8, 0, 1.4), zone: 'wood', line: 1.3 },
  { d: poly([7, -3.4, 16, 0, 7, 3.4]), zone: 'metal', line: 1.3 },
  { d: join(poly([-14, 0, -17.4, -3.4, -10, -0.8]), poly([-14, 0, -17.4, 3.4, -10, 0.8])), zone: 'canvas', line: 0.9, shade: false, light: false },
]);
part('proj.arrow', [
  { d: limb(-12, 0, 0.9, 8, 0, 0.9), zone: 'wood', line: 1 },
  { d: poly([7, -2.4, 13, 0, 7, 2.4]), zone: 'metal', line: 1 },
  { d: join(poly([-12, 0, -15.4, -3, -9, -0.6]), poly([-12, 0, -15.4, 3, -9, 0.6])), zone: 'feather', line: 0.8, shade: false, light: false },
]);
part('proj.bolt', [
  { d: limb(-8, 0, 1.3, 5, 0, 1.3), zone: 'wood', line: 1.2 },
  { d: poly([4, -2.8, 10, 0, 4, 2.8]), zone: 'metal', line: 1.2 },
  { d: join(poly([-8, 0, -10.4, -2.6, -6, -0.6]), poly([-8, 0, -10.4, 2.6, -6, 0.6])), zone: 'feather', line: 0.8, shade: false, light: false },
]);
part('proj.goose', [
  { d: blob([-9, 1, -6, -4, 2, -4, 6, -1, 4, 4, -4, 5], 0.8), zone: 'feather', line: 1.6 },
  { d: limb(3, -2, 2.4, 9, -7, 2), zone: 'feather', line: 1.6 },
  { d: poly([10, -8.4, 15, -6.4, 10, -5]), zone: 'beak', line: 1, shade: false, light: false },
  { d: circle(9.4, -8.2, 0.9), zone: 'dark', line: 0, shade: false, light: false },
  { d: blob([-6, 0, -2, -7, 3, -2], 0.7), zone: 'feather', line: 1.4 },
]);
part('proj.musket', [
  { d: poly([-9, -0.6, 0, -1.4, 0, 1.4, -9, 0.6]), zone: 'spark', line: 0, alpha: 0.7, shade: false, light: false },
  { d: circle(0, 0, 1.8), zone: 'iron', line: 0.8, shade: false, light: false },
]);
part('proj.lob', [
  { d: circle(0, 0, 4), zone: 'iron', line: 1.6, light: false },
  { d: rrect(-1, -6.4, 2, 3, 0.8), zone: 'metal', line: 0.8, shade: false, light: false },
  { d: star(0.6, -7.6, 4, 0.8, 2.4, 0), zone: 'flash', line: 0, shade: false, light: false },
]);
part('proj.cannonball', [{ d: circle(0, 0, 5), zone: 'iron', line: 1.8 }]);
// Gunpowder wave (CONTENT_PLAN 5.4): the coehorn's iron shell with a lit fuse
part('proj.mortar_shell', [
  { d: circle(0, 0, 4.6), zone: 'iron', line: 1.7 },
  { d: rrect(-1, -7, 2, 3, 0.8), zone: 'metal', line: 0.8, shade: false, light: false },
  { d: star(0.4, -8.2, 4, 0.8, 2.6, 0), zone: 'flash', line: 0, shade: false, light: false },
]);
part('proj.grapeshot', [{ d: join(circle(0, 0, 2), circle(-3, -2.4, 1.8), circle(-3.4, 2.2, 1.8), circle(2.6, -2.6, 1.6), circle(2.4, 2.6, 1.6)), zone: 'iron', line: 1 }]);
part('proj.rocket', [
  { d: blob([-6, -2.4, 4, -2.4, 9, 0, 4, 2.4, -6, 2.4], 0.4), zone: 'paper', line: 1.4 },
  { d: poly([4, -2.4, 9, 0, 4, 2.4]), zone: 'rust', line: 1.2, shade: false, light: false },
  { d: limb(-18, 0.6, 0.6, -6, 0.6, 0.6), zone: 'wood', line: 0.6, shade: false, light: false },
  { d: poly([-6, -1.6, -11, 0, -6, 1.6]), zone: 'flash', line: 0, shade: false, light: false },
]);
part('proj.chainshot', [
  { d: join(circle(-6, 0, 3.4), circle(6, 0, 3.4)), zone: 'iron', line: 1.4 },
  { d: join(ellipse(-2, 0, 1.4, 1), ellipse(0, 0, 1.4, 1), ellipse(2, 0, 1.4, 1)), zone: 'metal', line: 0.8, shade: false, light: false },
]);
part('proj.bomb', [
  { d: blob([-7, 0, -4, -3.6, 5, -3, 8, 0, 5, 3, -4, 3.6], 0.8), zone: 'iron', line: 1.6 },
  { d: join(poly([-7, 0, -11, -4, -9, 0]), poly([-7, 0, -11, 4, -9, 0])), zone: 'metal', line: 1, shade: false, light: false },
]);
part('proj.bullet', [
  { d: poly([-12, -0.5, 0, -1.1, 0, 1.1, -12, 0.5]), zone: 'spark', line: 0, alpha: 0.8, shade: false, light: false },
  { d: ellipse(0.6, 0, 2, 1.1), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.shell', [
  { d: blob([-5, -2.6, 3, -2.6, 7, 0, 3, 2.6, -5, 2.6], 0.4), zone: 'shell', line: 1.4 },
  { d: poly([3, -2.6, 7, 0, 3, 2.6]), zone: 'paper', line: 1, shade: false, light: false },
]);
part('proj.flak', [{ d: join(blob([-3, -1.8, 2, -1.8, 4.4, 0, 2, 1.8, -3, 1.8], 0.4)), zone: 'metal', line: 1.2 }]);
part('proj.plasma', [
  { d: ellipse(-3, 0, 8, 2.8), zone: 'magenta', line: 0, alpha: 0.55, shade: false, light: false },
  { d: ellipse(0, 0, 4, 2.2), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.plasma_mortar', [
  { d: circle(0, 0, 7), zone: 'magenta', line: 0, alpha: 0.5, shade: false, light: false },
  { d: circle(0, 0, 4.4), zone: 'lilac', line: 0, shade: false, light: false },
  { d: circle(-1, -1, 2), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.gravity_orb', [
  { d: circle(0, 0, 6.4), zone: 'void2', line: 1.6 },
  { d: join(arcBand(0, 0, 3, 4.4, 0, 140), arcBand(0, 0, 3, 4.4, 180, 320)), zone: 'lilac', line: 0, shade: false, light: false },
]);

// A17.12 projectiles
part('proj.javelin', [
  { d: limb(-16, 0, 0.9, 10, 0, 0.8), zone: 'wood', line: 1 },
  { d: poly([9, -2.2, 17, 0, 9, 2.2]), zone: 'bronze', line: 1 },
  { d: rrect(-6, -1.2, 4, 2.4, 0.8), zone: 'rope', line: 0, shade: false, light: false },
]);
part('proj.scorpion_bolt', [
  { d: limb(-12, 0, 1.6, 7, 0, 1.6), zone: 'wood', line: 1.4 },
  { d: poly([6, -3.4, 14, 0, 6, 3.4]), zone: 'bronze', line: 1.4 },
  { d: join(poly([-12, 0, -16, -4, -8, -1]), poly([-12, 0, -16, 4, -8, 1])), zone: 'paper', line: 0.8, shade: false, light: false },
]);
part('proj.harpoon', [
  { d: limb(-12, 0, 1.2, 8, 0, 1.2), zone: 'metal', line: 1.2 },
  { d: join(poly([7, -3, 15, 0, 7, 3]), poly([6, -1, 3, -4.4, 5, -1]), poly([6, 1, 3, 4.4, 5, 1])), zone: 'metal2', line: 1 },
  { d: limb(-20, 1.6, 0.5, -12, 0, 0.5), zone: 'rope', line: 0, shade: false, light: false },
]);
part('proj.flare', [
  { d: circle(0, 0, 5), zone: 'flare', line: 0, alpha: 0.6, shade: false, light: false },
  { d: circle(0, 0, 2.6), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.ion', [
  { d: ellipse(-3, 0, 8, 2.4), zone: 'ion', line: 0, alpha: 0.6, shade: false, light: false },
  { d: ellipse(0, 0, 3.6, 1.8), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.starburst', [
  { d: star(0, 0, 4, 1.6, 5.4, 0), zone: 'violet', line: 0, alpha: 0.8, shade: false, light: false },
  { d: circle(0, 0, 1.8), zone: 'white', line: 0, shade: false, light: false },
]);
part('proj.star_shard', [
  { d: poly([-9, 0, -2, -3.4, 8, 0, -2, 3.4]), zone: 'crystal', line: 1.2 },
  { d: poly([-4, 0, 0, -1.4, 5, 0, 0, 1.4]), zone: 'white', line: 0, shade: false, light: false },
]);

// A17.12 power and ability sprites
/** A curling wave, crest to the right (Tidal Wave), 60 lu wide and 40 lu tall from the ground. */
part('fx.p.wave', [
  { d: blob([-30, 0, -26, -16, -8, -34, 12, -40, 26, -30, 28, -18, 18, -24, 10, -18, 20, -4, 30, 0], 0.7), zone: 'sea', line: 1.6, alpha: 0.85 },
  { d: blob([4, -36, 18, -38, 27, -28, 20, -30, 12, -30], 0.7), zone: 'foam', line: 0, shade: false },
  { d: join(circle(-18, -10, 2), circle(-8, -22, 1.6), circle(-22, -4, 1.4)), zone: 'foam', line: 0, shade: false, light: false },
]);
/** A runaway armoured engine (Iron Horse), facing right, 36 lu long from the ground. */
part('fx.p.engine', [
  { d: join(rrect(-18, -20, 26, 14, 3), rect(4, -30, 10, 12), rect(-14, -32, 6, 12)), zone: 'engine' },
  { d: poly([12, -8, 20, -2, 12, -2]), zone: 'bronze', line: 1.2 },
  { d: join(circle(-12, -4, 4.4), circle(-1, -4, 4.4), circle(10, -4, 3.4)), zone: 'engine2', line: 1.6 },
  { d: rrect(-15, -28, 12, 3, 1.2), zone: 'canvas', line: 1, shade: false },
]);
/** A zeppelin in profile, nose right (Zeppelin Raid). */
part('fx.p.zeppelin', [
  { d: ellipse(0, 0, 30, 9), zone: 'canvas', line: 1.8 },
  { d: join(rect(-26, -1, 52, 1.4), rect(-12, -8, 1.4, 16), rect(8, -8, 1.4, 16)), zone: 'dust2', line: 0, shade: false, light: false },
  { d: join(poly([-28, -2, -36, -9, -32, 0]), poly([-28, 2, -36, 9, -32, 0])), zone: 'canvas', line: 1.4 },
  { d: rrect(-6, 8, 14, 4, 1.6), zone: 'engine', line: 1.4 },
]);
/** A warp portal seen edge-on (Warp Strike, Warp Stalker blink). */
part('fx.p.portal', [
  { d: ellipse(0, 0, 10, 24), zone: 'violet', line: 1.4, alpha: 0.85 },
  { d: ellipse(0, 0, 5, 17), zone: 'void2', line: 0, shade: false, light: false },
  { d: ellipse(-1, -4, 1.6, 6), zone: 'white', line: 0, alpha: 0.7, shade: false, light: false },
]);
/** A bronze shield sigil (Aegis). */
part('fx.p.aegis', [
  { d: blob([-8, -9, 0, -11, 8, -9, 7, 2, 0, 10, -7, 2], 0.6), zone: 'bronze', line: 1.4, alpha: 0.9 },
  { d: star(0, -1, 5, 1.4, 3.6), zone: 'white', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Explosion and rubble parts (art review: lobed fireballs, rounded shaded chunks)

/**
 * One fireball lobe, cel-shaded like the 3D art: a darker warm-brown rim, a pale warm body offset up
 * and left toward the light, and a white-hot core. The rim stays under 40% saturation (A11 colour
 * rule); the lobes overlap in random sizes to build an irregular fireball.
 */
part('fx.p.fireLobe', [
  { d: blob([-10, 1, -8, -6, -2, -10, 5, -9, 10, -3, 9, 5, 3, 9, -5, 9], 0.9), zone: '#9C7A62', line: 0, shade: false, light: false },
  { d: blob([-8.4, -0.4, -6.6, -6.2, -1.6, -8.8, 4.2, -7.6, 7.6, -2.6, 6.4, 3.8, 1.2, 6.4, -5.2, 5.4], 0.9), zone: '#F2D7B0', line: 0, shade: false, light: false },
  { d: ellipse(-2.2, -2.6, 4.6, 3.8), zone: '#FFF8EC', line: 0, shade: false, light: false },
]);
/** The same lobe cooling to smoke: grey-brown rim, dusty body, no hot core. */
part('fx.p.smokeLobe', [
  { d: blob([-10, 1, -8, -6, -2, -10, 5, -9, 10, -3, 9, 5, 3, 9, -5, 9], 0.9), zone: '#7E766C', line: 0, shade: false, light: false },
  { d: blob([-8.4, -0.4, -6.6, -6.2, -1.6, -8.8, 4.2, -7.6, 7.6, -2.6, 6.4, 3.8, 1.2, 6.4, -5.2, 5.4], 0.9), zone: '#A9A196', line: 0, shade: false, light: false },
]);
/** Rounded rubble chunks (tinted per use): a lit top, a shaded underside and an outline. */
part('fx.p.rock', [{ d: blob([-5, 1, -4, -3, 0, -4.6, 4, -3.4, 5.4, 0.6, 3, 3.6, -2, 3.8], 0.85), zone: 'white', line: 1.1 }]);
part('fx.p.rock2', [{ d: blob([-4, 0, -2.6, -3.4, 2, -3.8, 4.6, -1, 3.6, 2.8, -1.4, 3.2], 0.85), zone: 'white', line: 1.1 }]);
