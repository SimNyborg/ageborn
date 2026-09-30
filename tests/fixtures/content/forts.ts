// FROZEN FIXTURE (SIM_VERSION 5.0.0 contract bump, 2026-09-30): the fort tables of DESIGN A16.14.4 for
// Stone, Medieval and Gunpowder, one of each kind per age, as literal data (not built with src/content/raw/fortKit).
// Golden replays compile this content. Never edit it; re-baseline only with a deliberate golden re-record.
import type { FortSpec } from '@/core/forts';

const STRUCTURE_SFX = { place: 'turret_build', complete: 'spawn_heavy', die: 'base_hit' };
const TRAP_SFX = { place: 'turret_build', complete: 'spawn_pop', die: 'base_hit' };
const CAMP = { everyMs: 8000, firstMs: 2000, maxAlive: 2 };
const TRAP = { triggerLu: 30, betweenMs: 1000, armMs: 2000, lifeMs: 120000 };

function keys(id: string): { visualId: string; nameKey: string; descKey: string } {
  return { visualId: `fort.${id}`, nameKey: `card.${id}.name`, descKey: `card.${id}.desc` };
}

export const stoneForts: readonly FortSpec[] = [
  { id: 'palisade', age: 'stone', rarity: 'common', fortKind: 'wall', source: 'starter', cost: 125, pop: 6, sfx: { ...STRUCTURE_SFX }, ...keys('palisade') },
  { id: 'sling_perch', age: 'stone', rarity: 'epic', fortKind: 'tower', source: 'unlock', cost: 150, pop: 6, sfx: { ...STRUCTURE_SFX }, ...keys('sling_perch') },
  {
    id: 'war_camp', age: 'stone', rarity: 'rare', fortKind: 'camp', source: 'unlock', cost: 150, pop: 6,
    camp: { levy: 'cave_youth', ...CAMP }, sfx: { ...STRUCTURE_SFX }, ...keys('war_camp'),
  },
  {
    id: 'spike_pit', age: 'stone', rarity: 'rare', fortKind: 'trap', source: 'unlock', cost: 75, pop: 3,
    trap: { charges: 3, ...TRAP, damage: 40, radius: 0, maxTargets: 1, statuses: [{ kind: 'slow', magnitudeBp: 4000, durationMs: 2000 }] },
    sfx: { ...TRAP_SFX }, ...keys('spike_pit'),
  },
];

export const medievalForts: readonly FortSpec[] = [
  { id: 'shield_barricade', age: 'medieval', rarity: 'common', fortKind: 'wall', source: 'starter', cost: 125, pop: 6, sfx: { ...STRUCTURE_SFX }, ...keys('shield_barricade') },
  {
    id: 'longbow_tower', age: 'medieval', rarity: 'epic', fortKind: 'tower', source: 'warPath', warPathLevel: 8, road: 2300, cost: 150, pop: 6,
    sfx: { ...STRUCTURE_SFX }, ...keys('longbow_tower'),
  },
  {
    id: 'levy_camp', age: 'medieval', rarity: 'rare', fortKind: 'camp', source: 'warPath', warPathLevel: 4, road: 2300, cost: 150, pop: 6,
    camp: { levy: 'peasant_levy', ...CAMP }, sfx: { ...STRUCTURE_SFX }, ...keys('levy_camp'),
  },
  {
    id: 'wolf_pits', age: 'medieval', rarity: 'rare', fortKind: 'trap', source: 'warPath', warPathLevel: 6, road: 2300, cost: 75, pop: 3,
    trap: { charges: 3, ...TRAP, damage: 54, radius: 0, maxTargets: 1, statuses: [{ kind: 'slow', magnitudeBp: 5000, durationMs: 3000 }] },
    sfx: { ...TRAP_SFX }, ...keys('wolf_pits'),
  },
];

export const gunpowderForts: readonly FortSpec[] = [
  { id: 'gabion_wall', age: 'gunpowder', rarity: 'common', fortKind: 'wall', source: 'starter', cost: 125, pop: 6, sfx: { ...STRUCTURE_SFX }, ...keys('gabion_wall') },
  {
    id: 'musket_redoubt', age: 'gunpowder', rarity: 'epic', fortKind: 'tower', source: 'warPath', warPathLevel: 8, road: 2500, cost: 150, pop: 6,
    sfx: { ...STRUCTURE_SFX }, ...keys('musket_redoubt'),
  },
  {
    id: 'militia_muster', age: 'gunpowder', rarity: 'rare', fortKind: 'camp', source: 'warPath', warPathLevel: 4, road: 2500, cost: 150, pop: 6,
    camp: { levy: 'militiaman', ...CAMP }, sfx: { ...STRUCTURE_SFX }, ...keys('militia_muster'),
  },
  {
    id: 'powder_keg', age: 'gunpowder', rarity: 'rare', fortKind: 'trap', source: 'warPath', warPathLevel: 6, road: 2500, cost: 75, pop: 3,
    trap: { charges: 1, ...TRAP, damage: 330, radius: 60, maxTargets: 4, statuses: [] },
    sfx: { ...TRAP_SFX }, ...keys('powder_keg'),
  },
];
