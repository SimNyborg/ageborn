/**
 * Shared parts used by every age: biped limbs, hands, feet, heads, eyes, and small UI glyphs
 * (role glyphs, level trims, the horn icon). Colours come from semantic zones that each puppet's
 * palette fills in:
 *
 *   skin, hair, eye, pupil, mouth, cheek    faces
 *   sleeve, forearm, glove                  arms
 *   pants, shin, boot                       legs
 *   team, team2                             team colour (tinted at runtime)
 *
 * Pivots: an upper limb's pivot is its shoulder or hip, a lower limb's is its elbow or knee, a head's
 * is the neck, the eyes' pivot is the centre of the near eye.
 */
import type { RoleGroup } from '@/contracts/ids';
import { blob, circle, ellipse, join, limb, poly, rrect, star } from '../svg';
import type { LayerDef } from '../types';
import { part } from './registry';

// ---------------------------------------------------------------------------------------------
// Limbs (infantry scale; rigs scale them with `sized`)

part('shared.arm.upper', [{ d: limb(0, 0, 4.4, 0, 8.6, 3.8), zone: 'sleeve' }]);
part('shared.arm.lower', [{ d: limb(0, 0, 3.8, 0, 7.6, 3.4), zone: 'forearm' }]);
part('shared.hand', [{ d: blob([-3.4, -1.6, 0, -3.6, 3.6, -1.4, 3.8, 2.2, 0.6, 4.2, -3.2, 2.6]), zone: 'glove', light: false }]);
part('shared.hand.open', [
  { d: blob([-3.2, -2, 0.4, -3.8, 4.6, -3.4, 5.6, -0.6, 3.8, 3.8, -0.6, 4.4, -3.6, 2]), zone: 'glove', light: false },
]);
part('shared.leg.upper', [{ d: limb(0, 0, 5, 0, 7.6, 4.5), zone: 'pants' }]);
part('shared.leg.lower', [
  { d: limb(0, 0, 4.5, 0, 4.4, 4.2), zone: 'shin' },
  { d: blob([-4.6, 3.2, 2.8, 2.6, 7.6, 4.2, 8.6, 6.8, 6.2, 8.2, -4.2, 8.2, -5.2, 6]), zone: 'boot' },
]);
/** Bare feet (Stone Age). */
part('shared.leg.lower.bare', [
  { d: limb(0, 0, 4.5, 0, 4.4, 4.1), zone: 'shin' },
  { d: blob([-4.2, 3.4, 2.4, 3.2, 7.2, 4.8, 8.2, 7.2, 5.4, 8.2, -3.8, 8.2, -4.9, 6.2]), zone: 'skin' },
]);

// ---------------------------------------------------------------------------------------------
// Heads: pivot at the neck, skull centre at (0.5, -12.5), radius about 12.6.

export interface HeadOptions {
  nose?: 'round' | 'pointy' | 'button' | 'big';
  brow?: 'angry' | 'calm' | 'worried' | 'none';
  mouth?: 'grin' | 'frown' | 'o' | 'flat' | 'teeth' | 'none';
  ear?: boolean;
  /** Extra width at the jaw (tough guys). */
  jaw?: number;
  skinZone?: string;
}

/** The layers of a cartoon head (skull, ear, nose, mouth, brow). Hats and hair are added by callers. */
export function headLayers(o: HeadOptions = {}): LayerDef[] {
  const skin = o.skinZone ?? 'skin';
  const jaw = o.jaw ?? 0;
  const L: LayerDef[] = [
    {
      d: blob([
        -11.6, -13.2, -9.2, -21.8, 0.8, -25.4, 10.2, -21.6, 13.2, -12.6, 11.6 + jaw * 0.6, -4.4, 5.2 + jaw, -0.2, -3.8 - jaw * 0.3, -0.4, -10.4, -5.4,
      ]),
      zone: skin,
    },
  ];
  if (o.ear !== false) L.push({ d: ellipse(-3.8, -11.2, 3.3, 4.1), zone: skin, light: false, line: 2.6 });
  switch (o.nose ?? 'round') {
    case 'round':
      L.push({ d: blob([9.6, -13.2, 14.4, -12.6, 15.4, -9.2, 12.6, -7, 9.2, -8.4]), zone: skin, light: false, line: 2.6 });
      break;
    case 'big':
      L.push({ d: blob([9, -14.4, 15.2, -13.6, 17.4, -9.6, 14, -6.4, 9.2, -8]), zone: skin, light: false, line: 2.6 });
      break;
    case 'pointy':
      L.push({ d: poly([10.4, -14.2, 16.6, -9.2, 10.8, -8.2]), zone: skin, light: false, line: 2.4 });
      break;
    case 'button':
      L.push({ d: circle(12.6, -10.4, 2.3), zone: skin, light: false, line: 2.2 });
      break;
  }
  switch (o.mouth ?? 'flat') {
    case 'grin':
      L.push({ d: blob([5.2, -5.6, 11.6, -6.2, 10.4, -3.2, 6.8, -3.2]), zone: 'mouth', line: 0, shade: false, light: false });
      L.push({ d: poly([6.4, -5.5, 10.4, -5.9, 10, -4.8, 6.6, -4.6]), zone: 'eye', line: 0, shade: false, light: false });
      break;
    case 'teeth':
      L.push({ d: blob([4.8, -6.2, 11.8, -6.8, 11, -2.8, 6, -2.8]), zone: 'mouth', line: 0, shade: false, light: false });
      L.push({ d: poly([5.6, -6, 11.2, -6.5, 11, -5, 5.8, -4.6]), zone: 'eye', line: 0, shade: false, light: false });
      break;
    case 'frown':
      L.push({ d: blob([5.6, -3.6, 8.4, -5, 11.2, -4.2, 10.8, -3.2, 8.4, -3.8, 6, -2.6]), zone: 'mouth', line: 0, shade: false, light: false });
      break;
    case 'o':
      L.push({ d: ellipse(8.6, -4.4, 1.8, 2.2), zone: 'mouth', line: 0, shade: false, light: false });
      break;
    case 'flat':
      L.push({ d: rrect(5.6, -5, 5.6, 1.5, 0.75), zone: 'mouth', line: 0, shade: false, light: false });
      break;
    case 'none':
      break;
  }
  switch (o.brow ?? 'calm') {
    case 'angry':
      L.push({ d: poly([1.2, -21, 11.8, -17.8, 11.4, -16, 1.8, -18.6]), zone: 'hair', line: 0, shade: false, light: false });
      break;
    case 'worried':
      L.push({ d: poly([1.6, -18.6, 11.4, -20.4, 11.6, -18.8, 2, -17]), zone: 'hair', line: 0, shade: false, light: false });
      break;
    case 'calm':
      L.push({ d: blob([1.6, -19.4, 6.6, -20.8, 11.4, -19.8, 11.2, -18.6, 6.6, -19.4, 1.8, -18]), zone: 'hair', line: 0, shade: false, light: false });
      break;
    case 'none':
      break;
  }
  return L;
}

/** Eyes on the `eyes` bone (near eye centred at 0, 0; the far eye sits toward the facing side). */
function eyeLayers(lid: 'none' | 'angry' | 'sleepy'): LayerDef[] {
  const L: LayerDef[] = [
    { d: ellipse(0, 0, 3.1, 3.9), zone: 'eye', line: 1.5, shade: false, light: false },
    { d: ellipse(6.6, -0.2, 2.5, 3.5), zone: 'eye', line: 1.5, shade: false, light: false },
    { d: circle(1.2, 0.7, 1.8), zone: 'pupil', line: 0, shade: false, light: false },
    { d: circle(7.4, 0.5, 1.45), zone: 'pupil', line: 0, shade: false, light: false },
    { d: join(circle(1.8, -0.2, 0.6), circle(7.9, -0.3, 0.5)), zone: 'white', line: 0, shade: false, light: false },
  ];
  if (lid === 'angry') L.push({ d: poly([-4, -4.8, 10, -4.6, 10, -1.6, 4, -2.2, -4, -3.4]), zone: 'skin', line: 0, shade: false, light: false });
  if (lid === 'sleepy') L.push({ d: poly([-4, -4.8, 10, -4.8, 10, -0.6, -4, -0.8]), zone: 'skin', line: 0, shade: false, light: false });
  return L;
}

part('shared.eyes', eyeLayers('none'));
part('shared.eyes.angry', eyeLayers('angry'));
part('shared.eyes.sleepy', eyeLayers('sleepy'));
/** Beady animal eyes (one visible eye). */
part('shared.eyes.beast', [
  { d: ellipse(0, 0, 2.6, 2.9), zone: 'eye', line: 1.4, shade: false, light: false },
  { d: circle(0.8, 0.4, 1.6), zone: 'pupil', line: 0, shade: false, light: false },
  { d: circle(1.3, -0.3, 0.5), zone: 'white', line: 0, shade: false, light: false },
  { d: poly([-3.4, -3.6, 3.6, -2.2, 3.6, -0.6, -3.4, -1.6]), zone: 'fur', line: 0, shade: false, light: false },
]);
/** Visor slit for machines and masked units. */
part('shared.eyes.visor', [{ d: rrect(-3, -2, 11, 3.6, 1.8), zone: 'glow', line: 1.4, shade: false, light: false }]);

// ---------------------------------------------------------------------------------------------
// Ground ring and glyphs (drawn under units; DESIGN A11 redundant team cues)

/** Side 0 ring: a flattened circle. Side 1 ring: a flattened diamond. */
part('shared.ring.circle', [{ d: join(ellipse(0, 0, 17, 6.4)), zone: 'team', line: 0, shade: false, light: false, alpha: 0.85 }]);
part('shared.ring.circle.inner', [{ d: ellipse(0, 0, 12.4, 4.2), zone: 'shadow', line: 0, shade: false, light: false, alpha: 0.35 }]);
part('shared.ring.diamond', [{ d: poly([-19, 0, 0, -7.2, 19, 0, 0, 7.2]), zone: 'team', line: 0, shade: false, light: false, alpha: 0.85 }]);
part('shared.ring.diamond.inner', [{ d: poly([-13.2, 0, 0, -4.6, 13.2, 0, 0, 4.6]), zone: 'shadow', line: 0, shade: false, light: false, alpha: 0.35 }]);
part('shared.shadow', [{ d: ellipse(0, 0, 18, 5), zone: 'shadow', line: 0, shade: false, light: false, alpha: 0.22 }]);

/**
 * Role glyphs (icon.role.<group>): 14.6 lu tall (12 px at 720p), white on a team disc.
 * Shapes: infantry fist-sword, ranged arrow, heavy shield, anti-armor spike, support cross,
 * epic star, legendary crown.
 */
const GLYPHS: Record<RoleGroup, string> = {
  infantry: join(poly([-1.2, -5.6, 1.2, -5.6, 1.2, 2, -1.2, 2]), rrect(-3.6, 1.6, 7.2, 1.8, 0.6), rrect(-1, 3.2, 2, 2.6, 0.6)),
  ranged: join(poly([-5.2, 4.6, 3, -3.6, 1.2, -5.2, 5.6, -5.6, 5.2, -1.2, 3.6, -3, -4.6, 5.2])),
  heavy: blob([-5, -5, 0, -6.2, 5, -5, 4.6, 1.4, 0, 6, -4.6, 1.4], 0.7),
  antiArmor: join(poly([0, -6.4, 2.6, 0, 0, 6.4, -2.6, 0]), poly([-5.6, -0.8, 5.6, -0.8, 5.6, 0.8, -5.6, 0.8])),
  support: join(rrect(-1.7, -5.6, 3.4, 11.2, 0.8), rrect(-5.6, -1.7, 11.2, 3.4, 0.8)),
  epic: star(0, 0.4, 5, 2.6, 6.2),
  legendary: poly([-6, 4.4, -6, -3.4, -3, -0.4, 0, -5.4, 3, -0.4, 6, -3.4, 6, 4.4]),
};

export const ROLE_GROUPS: readonly RoleGroup[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'];

for (const g of ROLE_GROUPS) {
  part(`icon.role.${g}`, [
    { d: circle(0, 0, 8.6), zone: 'team', line: 1.6, shade: false, light: false },
    { d: GLYPHS[g], zone: 'white', line: 0, shade: false, light: false },
  ]);
}

/** Level trims (bronze, silver, gold chevrons) beside the role glyph. */
for (const [name, n] of [
  ['bronze', 1],
  ['silver', 2],
  ['gold', 3],
] as const) {
  const shapes: string[] = [];
  for (let i = 0; i < n; i++) shapes.push(poly([-4.4, -1.6 + i * 3.4, 0, -4 + i * 3.4, 4.4, -1.6 + i * 3.4, 4.4, 0.6 + i * 3.4, 0, -1.8 + i * 3.4, -4.4, 0.6 + i * 3.4]));
  part(`trim.${name}`, [{ d: join(...shapes), zone: `trim_${name}`, line: 1.3, shade: false, light: false }]);
}

/** The Last Stand horn icon (icon.horn). */
part('icon.horn', [
  { d: blob([-9, 4, -6, -1, 2, -5, 9, -9, 11, -6, 8, 2, 0, 6, -7, 7]), zone: 'bone', line: 2.2 },
  { d: blob([7.4, -9.4, 12, -10.4, 12.4, -5.4, 9.4, -4.8]), zone: 'metal', line: 2 },
  { d: rrect(-4, -1.6, 2.6, 7, 1), zone: 'metal', line: 1.6, shade: false, light: false },
]);

/** The Modernise arrow shown over outdated turrets (A2.4, A11 turret clips). */
part('icon.modernise', [
  { d: poly([0, -11, 9, -1.4, 3.4, -1.4, 3.4, 8, -3.4, 8, -3.4, -1.4, -9, -1.4]), zone: 'star', line: 2 },
  { d: poly([0, -6.4, 4.6, -2.4, -4.6, -2.4]), zone: 'white', line: 0, shade: false, light: false },
]);
