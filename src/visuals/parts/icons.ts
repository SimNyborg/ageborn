/**
 * UI icons (DESIGN A14.1): Age Power medallions (`power.<slug>`, the HUD icon and cast root), age
 * icons (`icon.age.<age>`) and foil frames (`foil.<tier>`). Icons are DOM/UI art, so they are not
 * bound by the lane colour rule. Authored centred on (0, 0), about 40 lu across.
 */
import { arcBand, blob, circle, ellipse, join, limb, ngon, poly, rect, rrect, star } from '../svg';
import { part } from './registry';

export const ICON_ZONES: Readonly<Record<string, number>> = {
  plate: 0x3a3656,
  plate2: 0x2c2942,
  rim: 0xd9c89a,
  white: 0xfaf7ef,
  bone: 0xede3c8,
  stone: 0x9a9288,
  wood: 0x8a6d52,
  metal: 0xaab2ba,
  iron: 0x4a4f55,
  ember: 0xf2a65a,
  sky: 0x9fc3e6,
  smoke: 0xb9b4ae,
  mint: 0x3af0b4,
  magenta: 0xf03aa8,
  gold: 0xe6c45c,
  wine: 0x8e2a4a,
  olive: 0x62664a,
  canopy: 0xefe6cf,
  bronze: 0xb07a52,
  bronze2: 0x7d5238,
  silver: 0xc9ced6,
  silver2: 0x8c939c,
  holo: 0xd8c8f0,
  holo2: 0x9fe8e0,
  dark: 0x2a2530,
  sand: 0xcdbe9e,
  verdigris: 0x4f8f7f,
  sea: 0x7fb6c8,
  foam: 0xe8f4f2,
  brick: 0x8a6a63,
  copper: 0xb06a3b,
  coal: 0x2b2a2e,
  violet: 0x8e44c8,
  starwhite: 0xf2f0ff,
  void: 0x1e1830,
};

function medallion(id: string, symbol: { d: string; zone: string; line?: number }[]): void {
  part(id, [
    { d: circle(0, 0, 20), zone: 'plate', line: 3 },
    { d: arcBand(0, 0, 16.4, 18.6, 0, 360), zone: 'rim', line: 0, shade: false, light: false },
    ...symbol.map((s) => ({ ...s, line: s.line ?? 1.8 })),
  ]);
}

// Age Powers (A5.7)
medallion('power.stampede', [
  { d: blob([-8, -2, -6, -9, 0, -11, 6, -9, 8, -2, 5, 7, 0, 10, -5, 7], 0.8), zone: 'bone' },
  { d: join(blob([-7, -7, -14, -12, -15, -6, -11, -4], 0.7), blob([7, -7, 14, -12, 15, -6, 11, -4], 0.7)), zone: 'white' },
  { d: join(circle(-3, -2, 1.4), circle(3, -2, 1.4), ellipse(0, 5, 3, 1.8)), zone: 'dark', line: 0 },
]);
medallion('power.meteor_shower', [
  { d: poly([-12, -12, -2, -4, 4, -8, 12, 4, 6, 10, -4, 4]), zone: 'ember' },
  { d: blob([2, 0, 6, -4, 11, -2, 12, 4, 8, 9, 3, 7], 0.8), zone: 'stone' },
]);
medallion('power.arrow_storm', [
  ...[-8, 0, 8].map((x) => ({ d: join(limb(x - 4, -12, 0.9, x + 3, 7, 0.9), poly([x + 1, 5, x + 5, 12, x + 5, 4])), zone: 'white' })),
]);
medallion('power.royal_decree', [
  { d: rrect(-10, -11, 20, 22, 3), zone: 'canopy' },
  { d: join(rect(-6, -6, 12, 1.6), rect(-6, -2, 12, 1.6), rect(-6, 2, 8, 1.6)), zone: 'wood', line: 0 },
  { d: circle(6, 8, 4), zone: 'wine' },
]);
medallion('power.smoke_screen', [{ d: join(circle(-5, 2, 6), circle(4, 0, 7), circle(0, -5, 6), circle(7, 5, 5), circle(-9, 5, 4)), zone: 'smoke' }]);
medallion('power.broadside', [
  { d: limb(-10, 4, 4, 9, -3, 3), zone: 'iron' },
  { d: join(circle(-6, 7, 4), circle(2, 7, 4)), zone: 'wood' },
  { d: circle(13, -6, 2.6), zone: 'iron' },
]);
medallion('power.paratroopers', [
  { d: blob([-12, -2, -10, -10, 0, -13, 10, -10, 12, -2, 0, -4], 0.7), zone: 'canopy' },
  { d: join(limb(-11, -2, 0.5, -1, 8, 0.5), limb(11, -2, 0.5, 1, 8, 0.5)), zone: 'white', line: 0 },
  { d: join(circle(0, 8, 2.6), rrect(-2.4, 10, 4.8, 5, 1.5)), zone: 'olive' },
]);
medallion('power.carpet_bomber', [
  { d: blob([-13, 0, -8, -3, 10, -3, 14, 0, 10, 2, -10, 2], 0.6), zone: 'olive' },
  { d: poly([-3, -2, 4, -2, -1, 8, -6, 8]), zone: 'iron' },
  { d: join(circle(-4, 10, 1.6), circle(1, 12, 1.6), circle(6, 10, 1.6)), zone: 'iron' },
]);
medallion('power.orbital_lance', [
  { d: poly([-2.4, -12, 2.4, -12, 3.6, 12, -3.6, 12]), zone: 'mint' },
  { d: rect(-1, -12, 2, 24), zone: 'white', line: 0 },
  { d: join(rrect(-9, -15, 18, 5, 2), rect(-13, -14, 4, 3), rect(9, -14, 4, 3)), zone: 'metal' },
]);
medallion('power.nanite_surge', [{ d: join(ngon(0, 0, 6, 4.2), ngon(-7, -4, 6, 3.4), ngon(7, -4, 6, 3.4), ngon(0, 8, 6, 3.4), ngon(-7, 5, 6, 2.6), ngon(7, 5, 6, 2.6)), zone: 'mint' }]);

// Age icons (A2.4 XP bars show them)
medallion('icon.age.stone', [
  { d: limb(-6, 10, 1.8, 5, -8, 1.8), zone: 'wood' },
  { d: blob([2, -13, 11, -10, 10, -2, 3, -4], 0.6), zone: 'stone' },
]);
medallion('icon.age.medieval', [
  { d: join(rect(-10, -4, 20, 14), rect(-12, -10, 6, 20), rect(6, -10, 6, 20), rect(-3, -13, 6, 23)), zone: 'metal' },
  { d: rrect(-2.4, 3, 4.8, 7, 2.4), zone: 'dark', line: 0 },
]);
medallion('icon.age.gunpowder', [
  { d: blob([-12, 2, -6, -8, 6, -8, 12, 2, 0, 0], 0.5), zone: 'iron' },
  { d: rect(-12, 1, 24, 3), zone: 'gold', line: 1.2 },
  { d: circle(0, 9, 3), zone: 'iron' },
]);
medallion('icon.age.modern', [
  { d: blob([-12, 4, -10, -6, 0, -11, 10, -6, 12, 4], 0.7), zone: 'olive' },
  { d: rect(-13, 3, 26, 3), zone: 'olive' },
  { d: star(0, -3, 5, 1.6, 4), zone: 'white', line: 0 },
]);
medallion('icon.age.future', [
  { d: join(ellipse(0, 0, 13, 4.6), ellipse(0, 0, 4.6, 13)), zone: 'mint', line: 1.4 },
  { d: circle(0, 0, 3.6), zone: 'magenta' },
]);

// A17.12: the powers of the three new ages
medallion('power.tidal_wave', [
  { d: blob([-14, 8, -12, -2, -6, -10, 2, -12, 8, -8, 6, -4, 0, -5, -2, 0, 4, 2, 12, 2, 14, 8], 0.7), zone: 'sea' },
  { d: blob([-4, -9, 2, -12, 8, -8, 5, -7, 1, -9], 0.7), zone: 'foam', line: 1.2 },
]);
medallion('power.aegis', [
  { d: blob([-11, -11, 0, -14, 11, -11, 10, 2, 0, 13, -10, 2], 0.6), zone: 'bronze' },
  { d: blob([-7, -8, 0, -10, 7, -8, 6.4, 1, 0, 9, -6.4, 1], 0.6), zone: 'verdigris', line: 0 },
  { d: star(0, -1, 5, 1.8, 4.4), zone: 'gold', line: 1.2 },
]);
medallion('power.iron_horse', [
  { d: join(rrect(-13, -6, 20, 10, 2), rect(-3, -12, 10, 7), rect(-10, -13, 4, 8)), zone: 'iron' },
  { d: join(circle(-8, 7, 3.4), circle(1, 7, 3.4), circle(9, 6, 2.6)), zone: 'coal', line: 1.4 },
  { d: poly([7, 4, 14, 8, 7, 8]), zone: 'copper', line: 1 },
  { d: join(circle(-8, -17, 2.6), circle(-4, -19, 2)), zone: 'smoke', line: 1 },
]);
medallion('power.zeppelin_raid', [
  { d: ellipse(0, -4, 14, 6), zone: 'canopy' },
  { d: join(rect(-12, -5, 24, 1.4)), zone: 'smoke', line: 0 },
  { d: rrect(-4, 2, 8, 3.4, 1.4), zone: 'brick', line: 1.2 },
  { d: join(circle(-6, 9, 1.6), circle(0, 11, 1.6), circle(6, 9, 1.6)), zone: 'iron' },
]);
medallion('power.starfall', [
  { d: join(poly([-12, -12, -4, -6, -7, -4]), poly([-2, -13, 5, -6, 2, -4])), zone: 'violet', line: 1.2 },
  { d: star(6, 5, 5, 2.6, 7.4), zone: 'starwhite' },
  { d: star(-6, 3, 4, 1.4, 4, 0), zone: 'mint', line: 1.2 },
]);
medallion('power.warp_strike', [
  { d: ellipse(0, 2, 13, 8), zone: 'violet' },
  { d: ellipse(0, 2, 8, 4.6), zone: 'void', line: 0 },
  { d: join(poly([-2, -13, 2, -13, 1.2, 2, -1.2, 2]), poly([-5, -4, 5, -4, 4, -2, -4, -2])), zone: 'mint', line: 1.2 },
]);

// A17.12: the three new ages
medallion('icon.age.bronze', [
  { d: join(rect(-12, 4, 24, 6), rect(-9, -2, 18, 6), rect(-6, -8, 12, 6)), zone: 'sand' },
  { d: rrect(-2, 4, 4, 6, 1.6), zone: 'dark', line: 0 },
  { d: blob([-3, -8, -1, -14, 1, -11, 3, -15, 3, -8], 0.6), zone: 'ember', line: 1.2 },
]);
medallion('icon.age.industrial', [
  { d: join(rect(-11, -2, 14, 12), rect(5, -14, 6, 24)), zone: 'brick' },
  { d: join(rect(-9, 2, 3, 3), rect(-3, 2, 3, 3)), zone: 'dark', line: 0 },
  { d: circle(-4, -8, 5), zone: 'canopy', line: 1.4 },
  { d: join(limb(-4, -8, 0.5, -4, -11, 0.5), limb(-4, -8, 0.5, -2, -8, 0.5)), zone: 'dark', line: 0 },
  { d: join(circle(9, -17, 2.6), circle(12, -19, 2)), zone: 'smoke', line: 1 },
]);
medallion('icon.age.cosmic', [
  { d: circle(-1, 1, 8), zone: 'violet' },
  { d: arcBand(-1, 1, 11, 13, 200, 340), zone: 'starwhite', line: 1 },
  { d: arcBand(-1, 1, 11, 13, 20, 160), zone: 'starwhite', line: 1 },
  { d: star(10, -10, 4, 1, 3.6, 0), zone: 'mint', line: 0 },
]);

// A17.5 camera UI (the HUD draws its own DOM copies; these keep the ids in the manifest for the art)
part('icon.chevron', [{ d: poly([-6, -10, 6, 0, -6, 10, -2, 0]), zone: 'white', line: 2 }]);
part('icon.base_alert', [
  { d: join(rect(-10, -4, 20, 14), rect(-12, -10, 6, 20), rect(6, -10, 6, 20)), zone: 'stone', line: 2 },
  { d: poly([-1, -4, 2, 2, -2, 4, 1, 10]), zone: 'dark', line: 0 },
  { d: star(8, -12, 5, 1.6, 4.4), zone: 'ember', line: 1.2 },
]);
part('icon.follow', [
  { d: join(limb(-10, 10, 1.4, 8, -8, 1.2), limb(10, 10, 1.4, -8, -8, 1.2)), zone: 'metal', line: 1.8 },
  { d: join(rrect(-12, 6, 6, 3, 1.2), rrect(6, 6, 6, 3, 1.2)), zone: 'wood', line: 1.4 },
]);

/** Foil frames (card borders for portraits and trays). 100 lu square, 8 lu bars, no holes. */
function frame(id: string, zone: string, zone2: string): void {
  part(id, [
    { d: join(rrect(0, 0, 100, 9, 4), rrect(0, 91, 100, 9, 4), rrect(0, 0, 9, 100, 4), rrect(91, 0, 9, 100, 4)), zone, line: 2 },
    { d: join(star(4.5, 4.5, 4, 1.4, 3.6, 45), star(95.5, 4.5, 4, 1.4, 3.6, 45), star(4.5, 95.5, 4, 1.4, 3.6, 45), star(95.5, 95.5, 4, 1.4, 3.6, 45)), zone: zone2, line: 0, shade: false, light: false },
  ]);
}
frame('foil.bronze', 'bronze', 'bronze2');
frame('foil.silver', 'silver', 'silver2');
frame('foil.holo', 'holo', 'holo2');
