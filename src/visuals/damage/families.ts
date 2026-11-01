/**
 * The damage family of every unit sheet (design Appendix A, generated from the content dump plus the six summon
 * sheets). The bundle's own `family` wins (contract C1); this table answers for a unit whose bundle has not loaded or
 * has no entry, so every unit shows its stage from the first frame (the effects-only fallback, design option c).
 */
import type { DamageFamily } from './types';

const LIST: Readonly<Record<Exclude<DamageFamily, 'soldier'>, readonly string[]>> = {
  armoured: ['hide_shield', 'hoplite', 'phalangite', 'shield_bearer', 'footman', 'greatsword_knight', 'warhammer_sergeant', 'iron_mantlet', 'sandbag_carrier', 'barrier_trooper', 'photon_knight', 'star_legionnaire'],
  beast: ['cave_bear', 'cave_pup', 'hunting_wolves', 'sabertooth', 'tuskback', 'woolly_rhino', 'hydra', 'minotaur', 'lindworm', 'war_hound', 'moonlings', 'swarm_matron', 'swarmling'],
  rider: ['elk_chieftain', 'mammoth_matriarch', 'amazon_rider', 'war_elephant', 'destrier_knight', 'ursa_paladin', 'cuirassier', 'dragoon', 'hussar', 'dispatch_rider', 'hover_bike', 'star_leviathan', 'void_skimmer'],
  vehicle: ['scorpion', 'war_chariot', 'wooden_horse', 'battering_ram', 'mangonel_cart', 'siege_belfry', 'bronze_cannon', 'rocket_cart', 'armoured_car', 'armoured_train', 'land_dreadnought', 'steam_tractor', 'assault_gun', 'behemoth_tank', 'bulldozer', 'tankette', 'drone_carrier', 'particle_cannon', 'hover_tank'],
  flyer: ['balloon_admiral', 'dive_bomber', 'gyrocopter', 'sky_fortress', 'attack_drone', 'jetpack_trooper', 'repair_drone', 'mothership', 'star_fighter'],
  mech: ['bronze_colossus', 'clockwork_soldier', 'steam_golem', 'android_pair', 'chrono_titan', 'crab_mech', 'overload_android', 'walker_mech', 'asteroid_golem'],
  energy: ['holo_decoy', 'holo_projector', 'crystal_guard', 'gravity_sage', 'void_whisperer', 'warp_stalker'],
};

const BY_SLUG: ReadonlyMap<string, DamageFamily> = new Map(Object.entries(LIST).flatMap(([family, slugs]) => slugs.map((s) => [s, family as DamageFamily] as const)));

/** The sheet slug of a visual id or a sheet source: `unit.footman`, `unit.footman@skin`, `art/units/medieval/footman.json`. */
export function damageSlug(idOrSource: string): string {
  const m = /art\/units\/[a-z]+\/([a-z0-9_]+(?:@[a-z0-9_-]+)?)(?:\.x)?(?:\.hd)?\.json$/.exec(idOrSource);
  if (m?.[1]) return m[1];
  return idOrSource.replace(/^unit\./, '');
}

/** The family from the table (a skin answers as its unit), else a guess from the body: soldiers by default. */
export function fallbackFamily(slug: string, hint?: { air?: boolean; heightLu?: number }): DamageFamily {
  const base = slug.split('@')[0] ?? slug;
  const known = BY_SLUG.get(base);
  if (known) return known;
  if (hint?.air) return 'flyer';
  return 'soldier';
}

/**
 * Units whose body or main surface is wood when no spot says otherwise (the feel config's wooden victims, the wooden
 * engines and shields): their fallback burst throws splinters and their step sounds `dmg_splinter`.
 */
const WOODEN: ReadonlySet<string> = new Set(['hide_shield', 'footman', 'battering_ram', 'wooden_horse', 'siege_belfry', 'war_chariot', 'mangonel_cart', 'scorpion']);

export function woodenBody(slug: string): boolean {
  return WOODEN.has(slug.split('@')[0] ?? slug);
}

/** Every unit the table names (tests). */
export function familyTable(): ReadonlyMap<string, DamageFamily> {
  return BY_SLUG;
}
