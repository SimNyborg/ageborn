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
