/**
 * Drawn aim of the ranged attack clips (queue item 44): which way each unit sheet's weapon points when its shot
 * leaves, where the shot leaves when the sheet's impact-frame muzzle sits off the weapon or the hand, and how far the
 * shooter may lean toward its target. Visual data, read from the installed sheets (Track W, 2026-10-26: the release
 * frame of every attack variant; bows on their hold frame, since the arrow is gone on the impact frame). The render
 * layer reaches it only through the unit view (`AtlasUnitView` `aimInfo` / `aimNow`, duck-typed like `muzzleNow`), so
 * swapping art never needs a code change, and a sheet that writes `aimDeg` / `release` per attack clip
 * (`meta.ageborn.clips`) wins over this table.
 *
 * Angles are degrees above the unit's facing direction on screen (the sheets face right; up is positive). Release
 * points are lu from the feet, x forward and y up, like the sheets' anchors.
 */
import type { UnitGait } from './adapters/atlasMotion';

/** One attack clip's drawn aim. */
export interface ClipAim {
  /** Degrees above the facing direction the weapon points when the shot leaves. */
  deg: number;
  /** Where the shot leaves (lu from the feet, x forward, y up), when the impact-frame muzzle sits off the weapon. */
  release?: readonly [number, number];
  /** An emitter without a direction (a drum, sound rings, a breath cone, an orb between the hands): no lean, no aimed path. */
  omni?: boolean;
}

/**
 * How far a shooter may lean toward its target. The body turns about the point the view already turns it about: the
 * feet for walkers (they stay planted), the middle for flyers and hover units (`place()`, `hovers(gait)`).
 */
export interface LeanPolicy {
  /** The most it leans toward a target (degrees; halved under Reduce motion). */
  maxDeg: number;
}

export interface UnitAim {
  clips: Readonly<Partial<Record<string, ClipAim>>>;
  /** Overrides the body type's lean (a crew standing beside its mortar does not tilt the mortar). */
  lean?: LeanPolicy;
}

/**
 * The lean a body type allows. Bipeds lean from the feet (a hip-fire musket comes level, a bow lifts toward a flyer);
 * heavies and walkers a little less; flyers and hover units pitch about their middle (no feet to keep planted), as far
 * as a held pitch still reads as the same craft (the review of item 44: 24 degrees was too much for the Gyrocopter;
 * steeper shots down are the art round's down-aimed clips); riders, beasts, wheels and tracks do not lean (lifting
 * wheels or hooves off the ground reads wrong).
 */
export const LEAN_BY_GAIT: Readonly<Record<UnitGait, LeanPolicy>> = {
  biped: { maxDeg: 14 },
  heavy: { maxDeg: 8 },
  walker: { maxDeg: 6 },
  quad: { maxDeg: 0 },
  rider: { maxDeg: 0 },
  wheeled: { maxDeg: 0 },
  tracked: { maxDeg: 0 },
  hover: { maxDeg: 12 },
  fly: { maxDeg: 15 },
};

/** Sheets without an entry, and attack clips a sheet's entry leaves out, aim level (most guns, bows and throws are drawn level). */
export const DEFAULT_CLIP_AIM: ClipAim = { deg: 0 };

/** Per unit sheet (`<age>/<slug>`, the file under `public/art/units/`), per attack clip. */
export const UNIT_AIM: Readonly<Record<string, UnitAim>> = {
  // impact muzzle (11,16) on the belly; the arm is forward at chest height
  'stone/atlatl_thrower': { clips: { attack: { deg: 40, release: [30, 38] }, attack_b: { deg: 55, release: [14, 46] } } },
  // impact muzzle (34,10) at the knees after the follow-through; the bolas leaves the hand at chest height
  'stone/bolas_thrower': { clips: { attack: { deg: 5, release: [33, 20] }, attack_b: { deg: 10, release: [34, 12] } } },
  'stone/boulder_hurler': { clips: { attack: { deg: 5 }, attack_b: { deg: 0 } } },
  'stone/drum_shaman': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'stone/herbalist': { clips: { attack: { deg: 15 }, attack_b: { deg: 10 } } },
  'stone/mammoth_matriarch': { clips: { attack_alt: { deg: -20 } } },
  'stone/pebbler': { clips: { attack: { deg: 20 }, attack_b: { deg: 5 } } },
  'stone/rockfall_shaman': { clips: { attack: { deg: 2 }, attack_b: { deg: 10 } } },
  'bronze/aulos_piper': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'bronze/belly_bowman': { clips: { attack: { deg: 6 }, attack_b: { deg: 0 } } },
  'bronze/cretan_archer': { clips: { attack: { deg: 44 }, attack_b: { deg: 45 } } },
  'bronze/discus_thrower': { clips: { attack: { deg: 5 }, attack_b: { deg: 5 } } },
  // impact muzzle (58,12) in empty air near the ground; the javelin was last drawn level at chest height
  'bronze/javelineer': { clips: { attack: { deg: 0, release: [50, 34] }, attack_b: { deg: 0, release: [52, 35] } } },
  'bronze/rhodian_slingers': { clips: { attack: { deg: 10 }, attack_b: { deg: 0 } } },
  'bronze/scorpion': { clips: { attack: { deg: 3 }, attack_b: { deg: 5 } } },
  'bronze/standard_bearer': { clips: { attack: { deg: 5 }, attack_b: { deg: 0 } } },
  'bronze/tragic_chorus': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'medieval/alchemist': { clips: { attack: { deg: 10 }, attack_b: { deg: 15 } } },
  'medieval/crossbowman': { clips: { attack: { deg: -4 }, attack_b: { deg: -4 } } },
  'medieval/friar': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'medieval/herald': { clips: { attack: { deg: 0 }, attack_b: { deg: 48 } } },
  'medieval/lindworm': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true }, attack_c: { deg: 0, omni: true } } },
  'medieval/longbowman': { clips: { attack: { deg: 38 }, attack_b: { deg: 2 } } },
  'medieval/mangonel_cart': { clips: { attack: { deg: 50 }, attack_b: { deg: 50 } } },
  'medieval/siege_belfry': { clips: { attack_alt: { deg: -10 } } },
  'medieval/yeoman_archer': { clips: { attack: { deg: 45 }, attack_b: { deg: 6 } } },
  'gunpowder/bagpiper': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'gunpowder/balloon_admiral': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'gunpowder/blunderbuss': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  // barrel 12 held, 36 at the recoil frame the ball leaves on
  'gunpowder/bronze_cannon': { clips: { attack: { deg: 36 }, attack_b: { deg: 39 } } },
  'gunpowder/coehorn_crew': { clips: { attack: { deg: 55 }, attack_b: { deg: 55 } }, lean: { maxDeg: 0 } },
  'gunpowder/dragoon': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'gunpowder/drummer_boy': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'gunpowder/field_surgeon': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'gunpowder/fusilier': { clips: { attack: { deg: -9 }, attack_b: { deg: 0 } } },
  'gunpowder/grenadier': { clips: { attack: { deg: 50 }, attack_b: { deg: 55 } } },
  'gunpowder/mesmerist': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'gunpowder/rocket_cart': { clips: { attack: { deg: 31 }, attack_b: { deg: 31 } } },
  'gunpowder/voltigeurs': { clips: { attack: { deg: -11 }, attack_b: { deg: -13 } } },
  'gunpowder/wall_gunner': { clips: { attack: { deg: -9 }, attack_b: { deg: 0 } } },
  'industrial/armoured_car': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'industrial/armoured_train': { clips: { attack: { deg: 2 }, attack_b: { deg: 15 }, attack_alt: { deg: 0 } } },
  'industrial/bandmaster': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'industrial/bomb_bowler': { clips: { attack: { deg: 50 }, attack_b: { deg: 45 } } },
  'industrial/carbineer': { clips: { attack: { deg: 0 }, attack_b: { deg: -2 } } },
  'industrial/flare_spotter': { clips: { attack: { deg: 88 }, attack_b: { deg: 0 } } },
  'industrial/harpoon_gunner': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'industrial/land_dreadnought': { clips: { attack: { deg: 0 }, attack_b: { deg: 19 }, attack_alt: { deg: 0 } } },
  'industrial/spark_scientist': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'industrial/trench_mortar': { clips: { attack: { deg: 60 }, attack_b: { deg: 63 } }, lean: { maxDeg: 0 } },
  'modern/assault_gun': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/bazooka_trooper': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/behemoth_tank': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/combat_medic': { clips: { attack: { deg: 0 }, attack_b: { deg: -5 } } },
  'modern/dive_bomber': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/ghillie_sniper': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/gyrocopter': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/mortar_team': { clips: { attack: { deg: 60 }, attack_b: { deg: 63 } }, lean: { maxDeg: 0 } },
  'modern/radio_operator': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/rifle_grenadier': { clips: { attack: { deg: 62 }, attack_b: { deg: 73 } } },
  'modern/rifleman': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/sky_fortress': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 }, attack_alt: { deg: 0 } } },
  'modern/smg_squad': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'modern/tankette': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'future/arc_lobber': { clips: { attack: { deg: 36 }, attack_b: { deg: 54 } } },
  'future/attack_drone': { clips: { attack: { deg: -35 }, attack_b: { deg: -30 } } },
  'future/drone_carrier': { clips: { attack: { deg: 2 }, attack_b: { deg: 23 } } },
  'future/holo_projector': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'future/jetpack_trooper': { clips: { attack: { deg: 0 }, attack_b: { deg: -29 } } },
  'future/needle_gunner': { clips: { attack: { deg: 0 }, attack_b: { deg: -3 } } },
  'future/overclock_engineer': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'future/particle_cannon': { clips: { attack: { deg: 0 }, attack_b: { deg: 5 } } },
  'future/pulse_trooper': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 }, attack_c: { deg: 0 } } },
  'future/rail_gunner': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'cosmic/antimatter_rifler': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'cosmic/bio_weaver': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'cosmic/gravity_sage': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'cosmic/hover_tank': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'cosmic/ion_ranger': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 }, attack_c: { deg: 0 } } },
  'cosmic/moonlings': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'cosmic/mothership': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
  'cosmic/nova_thrower': { clips: { attack: { deg: 45 }, attack_b: { deg: 50 } } },
  'cosmic/star_fighter': { clips: { attack: { deg: -25 }, attack_b: { deg: -15 } } },
  'cosmic/star_leviathan': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true }, attack_c: { deg: 0, omni: true }, attack_alt: { deg: 0 } } },
  'cosmic/star_mortar': { clips: { attack: { deg: 36 }, attack_b: { deg: 54 } } },
  'cosmic/starwarden': { clips: { attack: { deg: 40 }, attack_b: { deg: 0 } } },
  'cosmic/swarm_matron': { clips: { attack: { deg: 0 }, attack_b: { deg: 0 } } },
  'cosmic/void_whisperer': { clips: { attack: { deg: 0, omni: true }, attack_b: { deg: 0, omni: true } } },
};

/** `art/units/<age>/<slug>.json` (or its `.hd` / `.x` copies) to the table key `<age>/<slug>`, else null. */
export function unitAimKey(source: string): string | null {
  const m = /art\/units\/([a-z]+)\/([a-z0-9_]+?)(?:\.x)?(?:\.hd)?\.json(?:$|[?#])/.exec(source);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** The table entry of a unit sheet, or null (a sheet without one aims level and leans by its body type). */
export function unitAimFor(source: string): UnitAim | null {
  const key = unitAimKey(source);
  return key ? (UNIT_AIM[key] ?? null) : null;
}

const NO_LEAN: LeanPolicy = { maxDeg: 0 };

/** The lean a unit may take: its entry's override, else its body type's (none without a body type). */
export function leanPolicyOf(aim: UnitAim | null, gait: UnitGait | null): LeanPolicy {
  return aim?.lean ?? (gait ? LEAN_BY_GAIT[gait] : NO_LEAN);
}
