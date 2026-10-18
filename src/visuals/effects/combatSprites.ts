/**
 * Sprite parts of the combat effects (queue item 38, Phase A4/A5): the "bits" a fallen soldier leaves on the
 * ground for a few seconds (a helmet or hat, a weapon shard, a cloth scrap, a pebble, per age material), and the
 * arrow and javelin shafts that stick in a body.
 *
 * Drawn like the other effect parts (cel shading, one highlight, outlines in the fill darkened), centred on their
 * origin, upright as they would lie. Colours follow the colour rule (A11): the ages' muted materials, saturated
 * colour only in the energy accents of Future and Cosmic; cloth scraps are white and tinted with the fallen
 * soldier's team colour at runtime. No blood, ever.
 */
import { part } from '../parts/registry';
import { arcBand, blob, circle, ellipse, join, limb, poly, rrect, star } from '../svg';

// ---------------------------------------------------------------------------------------------
// Headgear (one per fallen soldier at most)

/** Medieval: a steel kettle hat, dome and brim. */
part('fx.bit.helmKettle', [
  { d: ellipse(0, 2.2, 7.6, 1.7), zone: '#7E848A', line: 1 },
  { d: blob([-5, 2.2, -4.6, -2.4, -1.8, -5, 1.8, -5, 4.6, -2.4, 5, 2.2], 0.9), zone: '#A3A9AE', line: 1 },
]);
/** Bronze: a crested bronze helmet with cheek guards, the crest in the age's wine. */
part('fx.bit.helmBronze', [
  { d: blob([-6, -5, -3, -9, 3, -9.6, 6.6, -6.2, 4.4, -5.2, -1, -6.8], 0.8), zone: '#8E2A4A', line: 1 },
  { d: blob([-5, 3.4, -5.4, -1.8, -3, -5.4, 2, -5.6, 5, -2.6, 5.2, 3.4, 2, 3.6, 1, 0.8, -1.2, 0.8, -2, 3.6], 0.85), zone: '#B09C78', line: 1 },
]);
/** Gunpowder: a dark felt tricorn with a muted brass band. */
part('fx.bit.hatTricorn', [
  { d: blob([-7.4, 2, -6.2, -1.2, -3, -2, -2.2, -5, 2.2, -5, 3, -2, 6.2, -1.2, 7.4, 2, 0, 3.2], 0.8), zone: '#34302C', line: 1 },
  { d: rrect(-6.4, 0.4, 12.8, 1.3, 0.6), zone: '#B5A577', line: 0, shade: false, light: false },
]);
/** Industrial (Great War): a shallow steel dish helmet in khaki grey. */
part('fx.bit.helmBrodie', [
  { d: ellipse(0, 1.6, 8.2, 1.9), zone: '#6E705C', line: 1 },
  { d: blob([-4.6, 1.6, -3.6, -2.4, 0, -3.8, 3.6, -2.4, 4.6, 1.6], 0.9), zone: '#7E8068', line: 1 },
]);
/** Modern: a rounded olive steel helmet with its strap. */
part('fx.bit.helmM1', [
  { d: blob([-6.2, 2.4, -6.2, -1.4, -3.8, -5, 0, -5.9, 3.8, -5, 6.2, -1.4, 6.2, 2.4], 0.95), zone: '#62664A', line: 1 },
  { d: join(limb(-5.4, 2.4, 0.5, -2, 4.2, 0.5), limb(5.4, 2.4, 0.5, 2, 4.2, 0.5)), zone: '#3A3F45', line: 0, shade: false, light: false },
]);
/** Future: a charcoal visor plate with a mint strip. */
part('fx.bit.visor', [
  { d: rrect(-6.2, -3.2, 12.4, 6.4, 2.6), zone: '#2E323A', line: 1 },
  { d: rrect(-4.6, -1, 9.2, 2, 1), zone: '#3AF0B4', line: 0, shade: false, light: false },
]);
/** Cosmic: a lilac crystal shard with a pale facet. */
part('fx.bit.crystal', [
  { d: poly([-2.4, -6.4, 2.2, -5.2, 3.2, 1.2, 0, 6.2, -3.2, 2]), zone: '#C9B8F0', line: 0.9 },
  { d: poly([-1, -4.6, 1.2, -3.8, 1, 0.8, -1.4, 1.4]), zone: '#F1ECFF', line: 0, shade: false, light: false },
]);
/** Stone: a bone (club wrap, necklace), knobbed at both ends. */
part('fx.bit.bone', [
  { d: blob([-6, -2.4, -4.4, -2.9, -3.3, -1.2, 3.3, -1.2, 4.4, -2.9, 6, -2.4, 6.3, 0, 6, 2.4, 4.4, 2.9, 3.3, 1.2, -3.3, 1.2, -4.4, 2.9, -6, 2.4, -6.3, 0], 0.75), zone: '#EDE3C8', line: 0.9 },
]);

// ---------------------------------------------------------------------------------------------
// Weapon shards and debris

part('fx.bit.shardSteel', [{ d: poly([-5, -1.4, 4, -1, 6.2, 0, 4, 1, -5, 1.4, -4, 0]), zone: '#C4C9CE', line: 0.8 }]);
part('fx.bit.shardBronze', [{ d: poly([-5, -1.5, 4, -1.1, 6, 0, 4, 1.1, -5, 1.5, -4, 0]), zone: '#B09C78', line: 0.8 }]);
part('fx.bit.splinter', [{ d: poly([-5.4, -1, 3, -1.7, 5.6, 0, 3, 1.3, -5.4, 1.1, -4.4, 0]), zone: '#8A705A', line: 0.8 }]);
part('fx.bit.plate', [{ d: poly([-4.2, -3, 3, -3.6, 4.6, 1, -1, 3.6, -4.6, 1.6]), zone: '#E6EAEE', line: 0.9 }]);
part('fx.bit.plateCosmic', [
  { d: poly([-4.4, -3, 3.2, -3.6, 4.8, 1.2, -1, 3.6, -4.8, 1.4]), zone: '#33264C', line: 0.9 },
  { d: poly([-2.6, -1.4, 1.8, -1.8, 2.6, 0.2]), zone: '#C9B8F0', line: 0, shade: false, light: false },
]);
part('fx.bit.cog', [
  { d: star(0, 0, 8, 3.1, 4.4, -90), zone: '#8D9398', line: 0.9 },
  { d: circle(0, 0, 1.4), zone: '#4A4F55', line: 0, shade: false, light: false },
]);
part('fx.bit.casing', [
  { d: rrect(-1.3, -3.6, 2.6, 7.2, 1), zone: '#B5A577', line: 0.7 },
  { d: rrect(-1.3, 2.4, 2.6, 1.2, 0.5), zone: '#8E8462', line: 0, shade: false, light: false },
]);
part('fx.bit.chip', [
  { d: rrect(-2.8, -2.2, 5.6, 4.4, 0.8), zone: '#2B2A2E', line: 0.8 },
  { d: circle(0.6, -0.4, 1), zone: '#3AF0B4', line: 0, shade: false, light: false },
]);
part('fx.bit.button', [{ d: circle(0, 0, 1.8), zone: '#B5A577', line: 0.7 }]);
part('fx.bit.pebble', [{ d: blob([-2.6, 0, -1.8, -2, 1.2, -2.2, 2.6, -0.2, 1.6, 1.8, -1.6, 1.8], 0.85), zone: '#8E867C', line: 0.8 }]);
part('fx.bit.mote', [{ d: star(0, 0, 4, 1, 3, 0), zone: '#E7DCFF', line: 0, shade: false, light: false }]);

// ---------------------------------------------------------------------------------------------
// Cloth (white: tinted with the team colour, or a neutral linen without one)

part('fx.bit.cloth', [{ d: blob([-5, -2, -1, -3.6, 4, -2.4, 5.2, 1.6, 1, 3, -4.2, 2.2], 0.7), zone: 'white', line: 1 }]);
part('fx.bit.fur', [
  { d: blob([-5.2, -1.6, -2, -3.4, 2, -3, 5, -1, 4.4, 2.2, 0, 3, -4.6, 2.2], 0.7), zone: '#75604F', line: 1 },
  { d: join(arcBand(-2.4, -2.6, 0.6, 1.4, 180, 330), arcBand(1.6, -2.4, 0.6, 1.4, 190, 340)), zone: '#9A8670', line: 0, shade: false, light: false },
]);

// ---------------------------------------------------------------------------------------------
// Stuck shafts: the head is buried at the origin, the shaft runs back along -x

part('fx.p.stuckArrow', [
  { d: limb(-15, 0, 0.8, 0, 0, 0.8), zone: 'wood', line: 0.9 },
  { d: join(poly([-15, 0, -18.6, -3, -12, -0.7]), poly([-15, 0, -18.6, 3, -12, 0.7])), zone: 'feather', line: 0.7, shade: false, light: false },
]);
part('fx.p.stuckJavelin', [
  { d: limb(-24, 0, 1, 0, 0, 0.9), zone: 'wood', line: 1 },
  { d: rrect(-12, -1.3, 4.4, 2.6, 0.9), zone: 'rope', line: 0, shade: false, light: false },
]);
