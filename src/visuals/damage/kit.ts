/**
 * The damage kit v1 (queue item 40, design 4a "The damage kit"): procedural parts drawn in the A11 style like the combat
 * bits, baked at runtime into a small part page in idle time after a battle's first hit (no download). Swappable: a
 * Blender-rendered kit can replace any part by id.
 *
 * - Marks, `dmg.<mat>.<mark><n>`: centred on their origin, about 8 lu across (the runtime scales each to 6-9 lu on its
 *   spot). Colour-neutral so they read on every material and team preset (design 3.3, A11 colour rule): near-black
 *   cores (#2B2420 at 80-90%), pale rims and highlights (#F4EBD8 at 55-75%), soot at 35-60%. Crack lines at least 1.8 lu
 *   wide. Bold enough for game scale: the first mock-up's marks under 5 lu vanished on a phone.
 * - Strips, `dmg.strip.*`: hang down from their origin (the tear's top). Cloth strips are white and take the unit's team
 *   colour dulled 30% toward dust at runtime (like the death bits' cloth scrap); cables and ropes keep their own tones.
 * - Burst and emitter particles, `fx.p.dmg*`: baked with the boot particles like every `fx.p` part.
 * No blood, no red; nothing here is ever drawn on faces or skin (the spots decide where marks go).
 */
import { part } from '../parts/registry';
import { blob, circle, ellipse, join, limb, poly, rrect } from '../svg';

const CORE = '#2B2420';
const DEEP = '#4A3F37';
const RIM = '#F4EBD8';
const FRESH_WOOD = '#D9C29C';
const FRESH_STONE = '#E4DCCD';
const CHAR = '#3A3330';
const MINT_PALE = '#DDF7EC';

/** A crack: a jagged polyline of round-jointed segments, `w0` lu wide at its start thinning to `w1` at its tip. */
function crack(pts: readonly number[], w0: number, w1: number): string {
  const n = pts.length / 2 - 1;
  const segs: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = w0 + ((w1 - w0) * i) / n;
    const b = w0 + ((w1 - w0) * (i + 1)) / n;
    segs.push(limb(pts[2 * i] ?? 0, pts[2 * i + 1] ?? 0, a / 2, pts[2 * i + 2] ?? 0, pts[2 * i + 3] ?? 0, b / 2));
  }
  return join(...segs);
}

/** The same polyline moved by (dx, dy): a crack's lit edge drawn under it. */
function shift(pts: readonly number[], dx: number, dy: number): number[] {
  return pts.map((v, i) => v + (i % 2 === 0 ? dx : dy));
}

const flat = { line: 0, shade: false, light: false } as const;

// ---------------------------------------------------------------------------------------------
// Cloth: soot, tears, a shot hole

part('dmg.cloth.soot1', [
  { d: blob([-4.6, 0.4, -3.4, -2.8, 0.4, -3.6, 3.8, -2.2, 4.8, 0.8, 2.6, 3.2, -1.2, 3.4, -4, 2.4], 0.9), zone: CORE, alpha: 0.36, ...flat },
  { d: blob([-2.4, 0.2, -1.4, -1.8, 1.2, -1.9, 2.6, 0, 1.4, 1.8, -1.2, 1.9], 0.9), zone: CORE, alpha: 0.32, ...flat },
  { d: join(circle(4.2, -3.4, 0.7), circle(-4.4, -2.6, 0.55), circle(3.4, 3.6, 0.5)), zone: CORE, alpha: 0.4, ...flat },
]);
part('dmg.cloth.soot2', [
  { d: blob([-5.2, 1.6, -4, -0.8, -0.6, -2.6, 3.6, -3.4, 5.2, -2, 3.8, 0.4, 0.4, 2, -3, 3], 0.9), zone: CORE, alpha: 0.4, ...flat },
  { d: blob([-2.6, 0.8, 0.2, -1.2, 3.2, -2, 2.6, -0.4, -0.2, 1.2], 0.9), zone: CORE, alpha: 0.3, ...flat },
]);
part('dmg.cloth.tear1', [
  // the frayed pale lip under the gash, then the gash (a dark ragged slit) and two loose threads
  { d: poly([-4.8, 0.2, -3, 1.6, -1.6, 0.8, 0, 2.2, 1.6, 1, 3.2, 2, 4.8, 0.4, 3.4, 0.6, 1.6, -0.2, 0, 1, -1.6, -0.4, -3, 0.6]), zone: RIM, alpha: 0.72, ...flat },
  { d: poly([-4.6, -0.4, -3, -1.8, -1.8, -0.8, -0.4, -2.4, 1, -1, 2.6, -2, 4.6, -0.2, 3, 0.4, 1.6, -0.2, 0, 1.2, -1.6, 0, -3, 0.8]), zone: CORE, alpha: 0.9, ...flat },
  { d: join(limb(-0.4, 1.2, 0.35, -0.9, 3.4, 0.3), limb(2.6, 0.8, 0.35, 3.4, 2.8, 0.3)), zone: RIM, alpha: 0.65, ...flat },
]);
part('dmg.cloth.tear2', [
  // an L-shaped rip with its flap folded down (the flap shows the cloth's lit back)
  { d: poly([-4.2, -3.8, -2.6, -3.4, -2.2, 0.6, 3.8, 0.8, 4.2, 2.4, -3.8, 2.2]), zone: CORE, alpha: 0.88, ...flat },
  { d: poly([-2.2, 0.6, 3.8, 0.8, 1.6, 3.8, -1.6, 4.4]), zone: RIM, alpha: 0.7, ...flat },
  { d: limb(-2.2, 0.6, 0.45, 3.8, 0.8, 0.45), zone: DEEP, alpha: 0.7, ...flat },
]);
part('dmg.cloth.hole1', [
  { d: blob([-3.8, 0, -2.6, -2.8, 0.4, -3.6, 3.2, -2.4, 3.8, 0.6, 2, 3.2, -1.2, 3.4, -3.4, 2], 0.9), zone: CORE, alpha: 0.34, ...flat },
  { d: poly([-2, -0.6, -1.2, -1.8, 0.2, -1.4, 1.6, -2, 2, -0.4, 1.4, 1.4, -0.2, 2, -1.6, 1.2]), zone: CORE, alpha: 0.92, ...flat },
  { d: join(limb(-2.6, -1.4, 0.3, -1.6, -0.8, 0.3), limb(1.8, 1.8, 0.3, 2.8, 2.4, 0.3), limb(1.2, -2.2, 0.3, 1.8, -3.2, 0.25)), zone: RIM, alpha: 0.7, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Hide and fur: pale scuffs, dust, a torn edge (never soot: a beast's coat is its skin)

const scratch = (x1: number, y1: number, x2: number, y2: number, w: number): string => limb(x1, y1, w / 2, x2, y2, w / 4);
part('dmg.hide.scuff1', [
  { d: join(scratch(-3.6, -2.8, 3.4, -0.4, 1.6), scratch(-3.8, -0.4, 3.2, 1.8, 1.6), scratch(-3.2, 2, 2.6, 3.8, 1.4)), zone: DEEP, alpha: 0.45, ...flat },
  { d: join(scratch(-3.8, -3.3, 3.2, -0.9, 1.3), scratch(-4, -0.9, 3, 1.3, 1.3), scratch(-3.4, 1.5, 2.4, 3.3, 1.1)), zone: RIM, alpha: 0.75, ...flat },
]);
part('dmg.hide.scuff2', [
  { d: blob([-4.4, 0.6, -2.4, -2.6, 1.6, -3, 4.4, -0.6, 3.2, 2.6, -1, 3.2], 0.9), zone: RIM, alpha: 0.3, ...flat },
  { d: join(scratch(-3.6, 2.4, 3, -2.8, 1.5), scratch(-1.8, 3.2, 3.8, -0.6, 1.3)), zone: RIM, alpha: 0.75, ...flat },
]);
part('dmg.hide.dust1', [
  { d: blob([-5, 0.8, -3.6, -2.8, 0, -3.4, 4, -2.4, 5, 0.8, 2.4, 3.4, -1.6, 3.2], 0.9), zone: '#E8DCC2', alpha: 0.5, ...flat },
  { d: join(circle(-2.4, -0.6, 0.8), circle(1.2, 1, 0.7), circle(2.8, -1.6, 0.6), circle(-0.6, 2.2, 0.6)), zone: '#B9AD98', alpha: 0.6, ...flat },
]);
part('dmg.hide.tear1', [
  { d: poly([-4.4, -1.8, -2.2, -0.6, 0.4, -2, 2.6, -0.4, 4.6, -1.4, 3.2, 1.2, 0.8, 0.6, -1.6, 1.8, -3.6, 0.6]), zone: CORE, alpha: 0.85, ...flat },
  { d: poly([-3.6, 0.6, -1.6, 1.8, 0.8, 0.6, 3.2, 1.2, 2.2, 3.4, -0.4, 2.6, -2.6, 3.4]), zone: RIM, alpha: 0.6, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Metal: dents, a scratch, a crack, bullet holes, a missing plate, soot

part('dmg.metal.dent1', [
  // a round dent: its rim in shadow above (the light comes from the top), lit below, a crease in the middle
  { d: ellipse(0, 0, 4.4, 3.6), zone: CORE, alpha: 0.28, ...flat },
  { d: blob([-4.2, 0.4, -3.4, -2.4, 0, -3.6, 3.4, -2.4, 4.2, 0.4, 2.4, -1, 0, -1.6, -2.4, -1], 0.9), zone: CORE, alpha: 0.78, ...flat },
  { d: blob([-3.6, 1, -1.6, 2.6, 0, 3, 1.6, 2.6, 3.6, 1, 2, 1.8, 0, 2.1, -2, 1.8], 0.9), zone: RIM, alpha: 0.72, ...flat },
]);
part('dmg.metal.dent2', [
  { d: ellipse(0.4, 0.2, 4.8, 3), zone: CORE, alpha: 0.26, ...flat },
  { d: blob([-4.6, -0.2, -3, -2.4, 1, -3, 4.4, -1.6, 5, 0.2, 2.2, -0.8, -1.6, -0.6], 0.9), zone: CORE, alpha: 0.8, ...flat },
  { d: blob([-3.8, 1.2, -1, 2.6, 2.6, 2.4, 4.6, 0.8, 2.4, 1.4, -0.8, 1.6], 0.9), zone: RIM, alpha: 0.7, ...flat },
  { d: limb(-2, 0.4, 0.5, 2.6, 0.6, 0.4), zone: CORE, alpha: 0.6, ...flat },
]);
part('dmg.metal.scratch1', [
  { d: join(scratch(-4.4, -1.6, 4.2, -3.2, 1.7), scratch(-4.2, 1.2, 4.4, -0.6, 1.7), scratch(-3, 3.6, 3, 2.2, 1.5)), zone: CORE, alpha: 0.55, ...flat },
  { d: join(scratch(-4.4, -2.2, 4.2, -3.8, 1.1), scratch(-4.2, 0.6, 4.4, -1.2, 1.1), scratch(-3, 3, 3, 1.6, 1)), zone: RIM, alpha: 0.78, ...flat },
]);
const METAL_CRACK = [-4.6, -2.4, -2.2, -1, -1, 1, 1.4, 0.4, 3, 2.4, 4.8, 2];
const METAL_BRANCH = [-1, 1, -1.6, 3.6];
part('dmg.metal.crack1', [
  { d: join(crack(shift(METAL_CRACK, 0.5, 0.7), 2.1, 1.2), crack(shift(METAL_BRANCH, 0.5, 0.6), 1.6, 1)), zone: RIM, alpha: 0.6, ...flat },
  { d: join(crack(METAL_CRACK, 2, 1.1), crack(METAL_BRANCH, 1.6, 0.9)), zone: CORE, alpha: 0.9, ...flat },
]);
/** A bullet hole: a soot ring, the torn metal lip (pale petals) and the black core. */
function holeAt(x: number, y: number, r: number): { soot: string; lip: string; core: string } {
  const petals: number[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const rr = r * (i % 2 === 0 ? 1.75 : 1.35);
    petals.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  return { soot: circle(x, y, r * 2.4), lip: poly(petals), core: circle(x, y, r) };
}
const H1 = holeAt(0, 0, 1.6);
part('dmg.metal.hole1', [
  { d: H1.soot, zone: CORE, alpha: 0.3, ...flat },
  { d: H1.lip, zone: RIM, alpha: 0.72, ...flat },
  { d: H1.core, zone: CORE, alpha: 0.92, ...flat },
]);
const H2 = [holeAt(-2.2, -1.2, 1.15), holeAt(2.2, -0.4, 1.05), holeAt(-0.2, 2.4, 1.1)];
part('dmg.metal.hole2', [
  { d: join(...H2.map((h) => h.soot)), zone: CORE, alpha: 0.24, ...flat },
  { d: join(...H2.map((h) => h.lip)), zone: RIM, alpha: 0.72, ...flat },
  { d: join(...H2.map((h) => h.core)), zone: CORE, alpha: 0.92, ...flat },
]);
part('dmg.metal.plate1', [
  // a missing plate: the dark hole, the frame's ribs inside, a bent lip on top and four rivets left in the rim
  { d: rrect(-4.8, -3.8, 9.6, 7.6, 0.8), zone: RIM, alpha: 0.6, ...flat },
  { d: rrect(-4, -3, 8, 6.2, 0.6), zone: CORE, alpha: 0.9, ...flat },
  { d: join(rrect(-1.6, -3, 1.1, 6.2, 0.3), rrect(1.6, -3, 1.1, 6.2, 0.3)), zone: '#6B625A', alpha: 0.85, ...flat },
  { d: poly([-4.8, -3.8, -1, -3.8, -2.2, -2.6, -4, -2.4]), zone: RIM, alpha: 0.75, ...flat },
  { d: join(circle(-4.3, 3.3, 0.6), circle(4.3, 3.3, 0.6), circle(4.3, -3.3, 0.6)), zone: RIM, alpha: 0.85, ...flat },
]);
part('dmg.metal.soot1', [
  { d: blob([-5, 0.6, -3.8, -3, 0.2, -3.8, 4, -2.6, 5, 0.6, 2.8, 3.4, -1.4, 3.6, -4.2, 2.6], 0.9), zone: CORE, alpha: 0.4, ...flat },
  { d: blob([-2.8, 0.4, -1.6, -1.8, 1.4, -2, 3, 0.2, 1.6, 2, -1.4, 2], 0.9), zone: CORE, alpha: 0.36, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Wood: a split, splinters, a hole, a chip, char

const WOOD_SPLIT = [-4.8, -0.6, -2.4, 0.2, -0.6, -0.6, 1.4, 0.4, 3.2, -0.2, 4.8, 0.6];
part('dmg.wood.crack1', [
  { d: crack(shift(WOOD_SPLIT, 0.2, 0.8), 2.2, 1.3), zone: RIM, alpha: 0.55, ...flat },
  { d: crack(WOOD_SPLIT, 2.2, 1.2), zone: CORE, alpha: 0.9, ...flat },
  { d: join(poly([-2.4, 0.2, -1.4, -2.6, -1, 0]), poly([1.4, 0.4, 2.8, 2.8, 2, 0.6])), zone: FRESH_WOOD, alpha: 0.95, line: 0.5, shade: false, light: false },
]);
part('dmg.wood.splinter1', [
  // a gouge with pale fresh splinters sticking out of it
  { d: blob([-3.6, 0, -2.4, -2.2, 0.6, -2.6, 3.4, -1.2, 3.8, 0.8, 1.6, 2.4, -1.6, 2.2], 0.9), zone: CORE, alpha: 0.85, ...flat },
  { d: join(poly([-1.6, -1.4, -4.8, -3.8, -0.6, -2.2]), poly([1.4, -1.6, 2.2, -4.6, 2.6, -1.6]), poly([2.4, 1.2, 5.2, 2.6, 2.2, 2]), poly([-2.2, 1.4, -4.4, 3.6, -1.2, 2])), zone: FRESH_WOOD, alpha: 1, line: 0.5, shade: false, light: false },
]);
part('dmg.wood.splinter2', [
  // a plank broken across: a zigzag gap with splinter tips on both lips
  { d: poly([-4.8, -1.6, -3, -0.2, -1.6, -1.8, 0, 0, 1.4, -1.6, 3, 0, 4.8, -1.4, 4.8, 1.4, 3, 2.6, 1.4, 1.2, 0, 2.8, -1.6, 1.2, -3, 2.8, -4.8, 1.4]), zone: CORE, alpha: 0.88, ...flat },
  { d: join(poly([-3, -0.2, -2.4, -3.2, -1.6, -1.8]), poly([1.4, -1.6, 2.2, -3.8, 3, 0]), poly([0, 2.8, 0.8, 4.6, 1.4, 1.2])), zone: FRESH_WOOD, alpha: 1, line: 0.5, shade: false, light: false },
]);
part('dmg.wood.hole1', [
  { d: poly([-3, 0, -2.4, -2.6, -0.4, -1.8, 0.8, -3.4, 2.2, -1.6, 3.6, -0.6, 2.4, 1.2, 3, 3, 0.6, 2.2, -1, 3.4, -1.8, 1.6, -3.6, 2]), zone: FRESH_WOOD, alpha: 0.95, line: 0.5, shade: false, light: false },
  { d: blob([-1.8, 0, -1.2, -1.6, 0.6, -1.6, 1.8, 0.2, 0.8, 1.6, -1, 1.4], 0.9), zone: CORE, alpha: 0.92, ...flat },
]);
part('dmg.wood.chip1', [
  { d: poly([-4.4, -2.4, 0.6, -3.4, 3.8, -1.4, 4, 1.6, 1, 0.8, -1.4, 2.6, -3.6, 1]), zone: FRESH_WOOD, alpha: 0.95, line: 0.6, shade: false, light: false },
  { d: join(limb(-3.2, -1.4, 0.4, 2.8, -1.8, 0.35), limb(-2.4, 0.6, 0.35, 2.6, 0, 0.3)), zone: '#9C8466', alpha: 0.8, ...flat },
]);
part('dmg.wood.char1', [
  { d: blob([-5, 0.8, -3.6, -3, 0.6, -3.6, 4.2, -2, 4.8, 1.2, 2, 3.4, -1.8, 3.2], 0.9), zone: CHAR, alpha: 0.6, ...flat },
  { d: join(crack([-3, -0.4, -0.6, 0.4, 2.6, -0.8], 1.3, 0.8), crack([-0.6, 0.4, 0.2, 2.6], 1.1, 0.7)), zone: CORE, alpha: 0.85, ...flat },
  { d: join(circle(-2.6, -1.8, 0.55), circle(2.8, 1.6, 0.5)), zone: '#8E8178', alpha: 0.7, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Stone, crystal and bone: chips, a crack, a shatter

part('dmg.stone.chip1', [
  { d: poly([-4, -1, -1.6, -3.6, 2.6, -3, 3.8, 0.2, 1.2, 1.4, -1.4, 3, -3.6, 1.6]), zone: FRESH_STONE, alpha: 0.95, line: 0.7, shade: false, light: false },
  { d: poly([-1.6, -3.6, 2.6, -3, 1.2, -1.2, -1, -1.4]), zone: '#FBF7EF', alpha: 0.9, ...flat },
]);
part('dmg.stone.chip2', [
  { d: poly([-4.6, -2, -1.8, -3.2, -0.6, -0.6, -2.8, 1.2, -4.4, 0.4]), zone: FRESH_STONE, alpha: 0.95, line: 0.7, shade: false, light: false },
  { d: poly([0.8, 0.6, 3.6, -0.4, 4.4, 2.4, 2.2, 3.8, 0.4, 2.8]), zone: FRESH_STONE, alpha: 0.95, line: 0.7, shade: false, light: false },
]);
const STONE_CRACK = [-4.4, -3, -2, -1.2, -2.4, 0.8, 0.4, 1.4, 1.6, 3.4];
const STONE_BRANCH = [0.4, 1.4, 3, -0.2, 4.6, 0.6];
part('dmg.stone.crack1', [
  { d: join(crack(shift(STONE_CRACK, 0.6, 0.6), 2.1, 1.2), crack(shift(STONE_BRANCH, 0.6, 0.6), 1.6, 1)), zone: RIM, alpha: 0.6, ...flat },
  { d: join(crack(STONE_CRACK, 2, 1.1), crack(STONE_BRANCH, 1.6, 0.9)), zone: CORE, alpha: 0.9, ...flat },
]);
const SHATTER_RAYS: readonly number[][] = [
  [0, 0, -2.6, -1.2, -4.6, -2.8],
  [0, 0, 1, -2.6, 0.8, -4.6],
  [0, 0, 2.8, -0.4, 4.6, 0.8],
  [0, 0, 1.4, 2.4, 2.8, 4.2],
  [0, 0, -2, 1.8, -3.6, 3.6],
];
part('dmg.stone.shatter1', [
  { d: join(...SHATTER_RAYS.map((p) => crack(shift(p, 0.5, 0.5), 1.8, 0.9))), zone: RIM, alpha: 0.55, ...flat },
  { d: join(...SHATTER_RAYS.map((p) => crack(p, 1.8, 0.9)), circle(0, 0, 1.6)), zone: CORE, alpha: 0.9, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Glass and visors: star cracks and a shatter (pale lines with a dark under-edge: they read on dark visors and on light glass)

const GLASS_RAYS: readonly number[][] = [
  [0, 0, -2.2, -1.6, -4.6, -2.2],
  [0, 0, 0.6, -2.4, 2, -4.2],
  [0, 0, 2.6, 0.4, 4.6, -0.6],
  [0, 0, 0.8, 2.2, 1.4, 4.4],
  [0, 0, -2.4, 1.6, -4.4, 2.6],
];
part('dmg.glass.crack1', [
  { d: join(...GLASS_RAYS.map((p) => crack(shift(p, 0.4, 0.5), 1.6, 0.8))), zone: CORE, alpha: 0.7, ...flat },
  { d: join(...GLASS_RAYS.map((p) => crack(p, 1.4, 0.7)), circle(0, 0, 1.3)), zone: RIM, alpha: 0.85, ...flat },
]);
const GLASS_LONG = [-4.6, 2.4, -1.8, 0.6, 0.2, 1, 2.6, -1.4, 4.6, -2.6];
part('dmg.glass.crack2', [
  { d: join(crack(shift(GLASS_LONG, 0.4, 0.5), 1.7, 0.9), crack(shift([0.2, 1, 1.4, 3.4], 0.4, 0.5), 1.3, 0.8)), zone: CORE, alpha: 0.7, ...flat },
  { d: join(crack(GLASS_LONG, 1.5, 0.8), crack([0.2, 1, 1.4, 3.4], 1.2, 0.7)), zone: RIM, alpha: 0.85, ...flat },
]);
part('dmg.glass.shatter1', [
  { d: join(...GLASS_RAYS.map((p) => crack(p, 1.4, 0.7))), zone: RIM, alpha: 0.8, ...flat },
  { d: poly([-1.8, -0.6, -0.8, -1.8, 0.8, -1.4, 2, -0.2, 1.2, 1.6, -0.6, 1.8, -1.6, 0.8]), zone: CORE, alpha: 0.9, ...flat },
  { d: poly([-0.8, -1.8, 0.8, -1.4, 0.2, -0.8]), zone: RIM, alpha: 0.75, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Energy bodies: cracks that let a pale glow out, a shatter (pale mint and white only: no saturated colour)

const ENERGY_CRACK = [-4.4, -2, -1.8, -0.4, -0.4, -2, 1.8, 0.2, 4.4, -0.8];
part('dmg.energy.crack1', [
  { d: crack(ENERGY_CRACK, 2.6, 1.6), zone: CORE, alpha: 0.75, ...flat },
  { d: crack(ENERGY_CRACK, 1.3, 0.7), zone: MINT_PALE, alpha: 0.95, ...flat },
]);
const ENERGY_CRACK2 = [-3.6, 3, -1.2, 0.6, 0.8, 1.2, 2.2, -1.4, 3.8, -3.4];
part('dmg.energy.crack2', [
  { d: join(crack(ENERGY_CRACK2, 2.6, 1.6), crack([0.8, 1.2, 3.4, 2.4], 2, 1.3)), zone: CORE, alpha: 0.75, ...flat },
  { d: join(crack(ENERGY_CRACK2, 1.3, 0.7), crack([0.8, 1.2, 3.4, 2.4], 1, 0.6)), zone: MINT_PALE, alpha: 0.95, ...flat },
]);
part('dmg.energy.shatter1', [
  { d: join(...SHATTER_RAYS.map((p) => crack(p, 2.4, 1.4))), zone: CORE, alpha: 0.7, ...flat },
  { d: join(...SHATTER_RAYS.map((p) => crack(p, 1.1, 0.6)), circle(0, 0, 1.3)), zone: MINT_PALE, alpha: 0.95, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Hanging strips: they hang down from the origin (the tear's top); cloth is white (team tint at runtime)

part('dmg.strip.cloth1', [
  { d: poly([-1.6, 0, 1.4, 0, 1.8, 4, 1.2, 8, 2, 11.6, 0.6, 10.4, 0, 12.6, -0.8, 10.2, -1.6, 11.8, -1.2, 7, -2, 3.4]), zone: 'white', line: 0.8, shade: false, light: false },
  { d: poly([0.2, 0.4, 1.2, 0.6, 1.2, 8.6, 0.4, 9.6]), zone: '#B9B9B9', alpha: 0.85, ...flat },
]);
part('dmg.strip.cloth2', [
  { d: poly([-2.6, 0, 2.2, 0, 2.6, 3.6, 1.8, 7.4, 2.4, 9.6, 1, 8.8, 0.2, 10.4, -0.8, 8.6, -2.2, 9.6, -1.8, 6, -2.8, 2.8]), zone: 'white', line: 0.8, shade: false, light: false },
  { d: poly([-2.6, 0.2, -0.8, 0.4, -1, 6.4, -2, 7.4]), zone: '#B9B9B9', alpha: 0.85, ...flat },
]);
part('dmg.strip.cloth3', [
  { d: join(poly([-1.8, 0, -0.4, 0, -0.6, 6, -1, 9.4, -1.6, 7.6, -2.2, 4]), poly([0.4, 0, 1.6, 0, 2.2, 3.6, 1.8, 7.2, 1.2, 6, 0.6, 3.4])), zone: 'white', line: 0.8, shade: false, light: false },
]);
part('dmg.strip.cable1', [
  { d: join(limb(-1, 0, 0.7, -1.8, 9, 0.6), limb(1, 0, 0.6, 2, 7.4, 0.55)), zone: '#3E3B3A', line: 0.5, shade: false, light: false },
  { d: join(circle(-1.8, 9.4, 0.9), circle(2, 7.8, 0.8)), zone: '#C7BFB4', line: 0.4, shade: false, light: false },
]);
part('dmg.strip.rope1', [
  { d: limb(0, 0, 0.9, 0.6, 10.4, 0.8), zone: '#B5A07C', line: 0.6, shade: false, light: false },
  { d: join(limb(-0.6, 2.4, 0.3, 0.7, 3.4, 0.3), limb(-0.4, 5.6, 0.3, 0.9, 6.6, 0.3), limb(-0.2, 8.6, 0.3, 1.1, 9.4, 0.3)), zone: '#7E6E55', alpha: 0.8, ...flat },
]);

// ---------------------------------------------------------------------------------------------
// Burst and emitter particles (`fx.p`: baked with the boot particles)

/** A pale flame tongue: brown rim, peach body, cream core (under 40% saturation, like the explosion lobes). */
part('fx.p.dmgFlame', [
  { d: blob([0, -9, 2.6, -4.6, 4.2, -0.6, 3.4, 2.8, 0, 4.2, -3.4, 2.8, -4.2, -0.6, -2.4, -4], 0.85), zone: '#A07E66', line: 0, shade: false, light: false },
  { d: blob([0.4, -7, 2.2, -3.6, 3.2, 0, 2.4, 2.4, 0, 3.2, -2.4, 2.4, -3, -0.2, -1.4, -3.4], 0.85), zone: '#F2D7B0', line: 0, shade: false, light: false },
  { d: blob([0.2, -3.6, 1.4, -1.4, 1.6, 1, 0, 2, -1.6, 1, -1.2, -1.4], 0.85), zone: '#FFF8EC', line: 0, shade: false, light: false },
]);
/** A curl of thread or fibre (cloth bursts; white, tinted). */
part('fx.p.dmgThread', [{ d: join(limb(-3, 1, 0.45, -0.6, -1, 0.45), limb(-0.6, -1, 0.45, 1.6, 0.6, 0.4), limb(1.6, 0.6, 0.4, 3.2, -0.8, 0.35)), zone: 'white', line: 0.5, shade: false, light: false }]);
/** A bent scrap of plate (metal bursts; white, tinted grey). */
part('fx.p.dmgPlate', [{ d: poly([-3, -2, 2.2, -2.6, 3.4, 0.4, 0.6, 2.6, -2.6, 1.6]), zone: 'white', line: 0.8 }]);
/** A tuft of fur (hide bursts; white, tinted with the coat's dust tone). */
part('fx.p.dmgTuft', [{ d: blob([-3, 0.6, -2, -1.4, 0, -2, 2.4, -1.2, 3.2, 0.6, 1, 1.4, -1.4, 1.6], 0.75), zone: 'white', line: 0.6, shade: false, light: false }]);
/** A crystal or stone flake (energy and stone bursts; white, tinted). */
part('fx.p.dmgFlake', [{ d: poly([-1.6, -3, 1.8, -1.6, 1.2, 2.8, -1.8, 1.6]), zone: 'white', line: 0.6, shade: false, light: false }]);
/** A short mint arc (an energy body's crackle; pale). */
part('fx.p.dmgArc', [{ d: crack([-4, 0.6, -1.6, -1.2, 0.4, 0.8, 2.4, -0.8, 4, 0.4], 1.1, 0.6), zone: MINT_PALE, line: 0, shade: false, light: false }]);

/** Every part the kit draws on units (the warm-up bakes these; the colour-rule test rasterises them). */
export const DAMAGE_STRIP_PARTS: readonly string[] = ['dmg.strip.cloth1', 'dmg.strip.cloth2', 'dmg.strip.cloth3', 'dmg.strip.cable1', 'dmg.strip.rope1'];
export const DAMAGE_FX_PARTS: readonly string[] = ['fx.p.dmgFlame', 'fx.p.dmgThread', 'fx.p.dmgPlate', 'fx.p.dmgTuft', 'fx.p.dmgFlake', 'fx.p.dmgArc'];
