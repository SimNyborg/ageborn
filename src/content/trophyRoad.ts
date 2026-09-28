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
  // items (the Amber node pays the formula at its new place, 230 instead of 190)
  [550, [dust(100), capsule('silver')]],
  [600, [amber(220), dust(100)]],
  [650, [capsule('silver'), amber(230)]],
  [700, [amber(240)]],
  [750, [dust(100)]],
  [800, [gate(4)]],
  [850, [amber(270)]],
  [900, [capsule('silver')]],
  [950, [dust(100)]],
  [1000, [wardrobe]],
  // Base 1,000
  [1050, [amber(310)]],
  [1100, [dust(100)]],
  [1150, [capsule('silver')]],
  [1200, [amber(340)]],
  [1250, [dust(100)]],
  [1300, [gate(5)]],
  [1350, [amber(370)]],
  [1400, [capsule('silver')]],
  [1450, [dust(100)]],
  [1500, [capsule('jade')]],
  // Base 1,500
  [1550, [amber(410)]],
  [1600, [dust(400)]],
  [1650, [capsule('silver')]],
  [1700, [amber(440)]],
  [1750, [dust(400)]],
  [1800, [capsule('silver')]],
  [1850, [amber(470)]],
  [1900, [gate(6)]],
  [1950, [dust(400)]],
  [2000, [wardrobe]],
  // Base 2,000, +100 steps
  [2100, [amber(520)]],
  [2200, [capsule('jade')]],
  [2300, [dust(400)]],
  [2400, [amber(580)]],
  [2500, [capsule('jade')]],
  [2600, [gate(7)]],
  [2700, [amber(640)]],
  [2800, [dust(400)]],
  [2900, [capsule('jade')]],
  [3000, [wardrobe]],
  // Base 3,000
  [3100, [amber(720)]],
  [3200, [dust(400)]],
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
