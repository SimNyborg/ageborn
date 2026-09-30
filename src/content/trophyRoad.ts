/**
 * The 60-node Trophy Road (DESIGN A6.3): every 50 trophies from 50 to 2,000, then every 100 from
 * 2,100 to 4,000. "Gate N" gives that arena's gate rewards (`arenas.ts`). Road capsules have a fixed
 * tier and no climb. Amber nodes pay 100 + 20 × (trophies / 100); the table values are kept as
 * written and a test checks them against the formula.
 */
import type { CardId, CapsuleTier } from '@/contracts/ids';
import { mulDiv } from '@/core/fixed';
import type { RoadReward, TrophyRoad } from './types';

const amber = (amount: number): RoadReward => ({ kind: 'amber', amount });
const dust = (amount: number): RoadReward => ({ kind: 'dust', amount });
const power = (card: CardId): RoadReward => ({ kind: 'power', card });
const capsule = (tier: CapsuleTier): RoadReward => ({ kind: 'capsule', tier });
const gate = (arena: number): RoadReward => ({ kind: 'gate', arena });
/** A region's fort set (A16.14.6): its Camp, Trap and Tower, the Trophy Road fallback of War Path L4, L6 and L8. */
const forts = (camp: CardId, trap: CardId, tower: CardId): RoadReward[] => [
  { kind: 'fort', card: camp },
  { kind: 'fort', card: trap },
  { kind: 'fort', card: tower },
];
const wardrobe: RoadReward = { kind: 'wardrobe' };

/** DESIGN A6.3 road tables, one row per line: [trophies, rewards]. */
const ROWS: readonly [number, RoadReward[]][] = [
  // Base 0, +50 steps. A17.13: each alternate power unlocks near the arena that brings its age
  [50, [amber(110)]],
  [100, [power('meteor_shower')]],
  [150, [gate(2)]],
  [200, [power('aegis')]],
  [250, [power('royal_decree')]],
  [300, [power('broadside')]],
  [350, [power('zeppelin_raid')]],
  [400, [gate(3), power('carpet_bomber')]],
  [450, [power('nanite_surge')]],
  [500, [power('warp_strike')]],
  // Base 500. A17.13: the displaced Silver Capsule, 100 Dust and Amber node join 550-650 as second
  // items (the Amber node pays the formula at its new place, 230 instead of 190). A2.9.8: from 550 to
  // 1,950 each node except the gates, the Wardrobe nodes and 1,500 also grants one War Path power (the
  // fallback for ladder players; whichever source comes first grants it, the other pays 60 Amber)
  [550, [dust(100), capsule('silver'), power('sticky_tar')]],
  [600, [amber(220), dust(100), power('hunt_cry')]],
  [650, [capsule('silver'), amber(230), power('hunters_spear')]],
  [700, [amber(240), power('zeus_bolts')]],
  [750, [dust(100), power('apollo_arrow')]],
  [800, [gate(4)]],
  [850, [amber(270), power('medusa_gaze')]],
  [900, [capsule('silver'), power('caltrops')]],
  [950, [dust(100), power('undermine')]],
  [1000, [wardrobe]],
  // Base 1,000
  [1050, [amber(310), power('boiling_oil')]],
  [1100, [dust(100), power('boarding_nets')]],
  [1150, [capsule('silver'), power('horse_artillery')]],
  [1200, [amber(340), power('sharpshooter')]],
  [1250, [dust(100), power('barbed_wire')]],
  [1300, [gate(5)]],
  [1350, [amber(370), power('railway_gun')]],
  [1400, [capsule('silver'), power('field_hospital')]],
  [1450, [dust(100), power('aa_screen')]],
  [1500, [capsule('jade')]],
  // Base 1,500
  [1550, [amber(410), power('tank_rush')]],
  [1600, [dust(400), power('sniper_team')]],
  [1650, [capsule('silver'), power('point_defense')]],
  [1700, [amber(440), power('emp_blackout')]],
  [1750, [dust(400), power('stasis_field')]],
  [1800, [capsule('silver'), power('singularity')]],
  [1850, [amber(470), power('ion_cannon')]],
  [1900, [gate(6)]],
  [1950, [dust(400), power('solar_flare')]],
  [2000, [wardrobe]],
  // Base 2,000, +100 steps. A16.14.6: one fort set per region (its Camp, Trap and Tower) on plain nodes
  // from 2,200 to 3,200, the fallback of War Path L4, L6 and L8 (whichever comes first grants, the other pays 60 Amber)
  [2100, [amber(520)]],
  [2200, [capsule('jade'), ...forts('muster_tents', 'hidden_stakes', 'pyrgos_tower')]],
  [2300, [dust(400), ...forts('levy_camp', 'wolf_pits', 'longbow_tower')]],
  [2400, [amber(580)]],
  [2500, [capsule('jade'), ...forts('militia_muster', 'powder_keg', 'musket_redoubt')]],
  [2600, [gate(7)]],
  [2700, [amber(640), ...forts('recruiting_depot', 'tripwire_charge', 'sniper_nest')]],
  [2800, [dust(400)]],
  [2900, [capsule('jade'), ...forts('forward_base', 'minefield', 'pillbox')]],
  [3000, [wardrobe]],
  // Base 3,000
  [3100, [amber(720), ...forts('clone_bay', 'grav_mire', 'sentry_pylon')]],
  [3200, [dust(400), ...forts('warp_barracks', 'void_mine', 'ion_spire')]],
  [3300, [capsule('jade')]],
  [3400, [gate(8)]],
  [3500, [amber(800)]],
  [3600, [dust(400)]],
  [3700, [capsule('jade')]],
  [3800, [amber(860)]],
  [3900, [dust(400)]],
  [4000, [capsule('aeon')]],
];

export const trophyRoad: TrophyRoad = {
  nodes: ROWS.map(([trophies, rewards], index) => ({ index, trophies, rewards })),
  amberFormula: { base: 100, perHundred: 20 },
};

/**
 * Amber paid by an Amber node at `trophies` (A6.3): base + perHundred × trophies / 100, truncated so
 * the result is always an integer (exact for every node on the road, which sit on multiples of 50).
 */
export function roadAmber(road: TrophyRoad, trophies: number): number {
  return road.amberFormula.base + mulDiv(road.amberFormula.perHundred, trophies, 100);
}
