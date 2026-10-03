/**
 * The arena from which each content-wave card drops (X0, CONTENT_PLAN 6): a meta table outside the sim
 * hash. A card from a later wave joins Time Capsules, Age Capsules and Dust crafting only once both its
 * age drops in the player's arena (A6.3) and its rarity is unlocked: new Commons from Arena 2, Rares from
 * Arena 3, Epics from Arena 4, Legendaries from Arena 5. Cards not listed (the original 88) keep their
 * arenas (from Arena 1 wherever their age drops). Bots use only cards a player at that point could own.
 * Data only; a test checks that every card of an expanded age outside the starter kit and the original
 * roster is listed.
 */
import type { CardId, Rarity } from '@/contracts/ids';

/** The arena (1-based) that first drops a new card of each rarity. */
export const NEW_CARD_ARENA: Readonly<Record<Rarity, number>> = { common: 2, rare: 3, epic: 4, legendary: 5 };

const C = NEW_CARD_ARENA.common;
const R = NEW_CARD_ARENA.rare;
const E = NEW_CARD_ARENA.epic;
const L = NEW_CARD_ARENA.legendary;

export const cardArena: Readonly<Record<CardId, number>> = {
  // W1 Stone (2026-10-02)
  hunting_wolves: C,
  hide_shield: C,
  torch_runner: C,
  bolas_thrower: C,
  woolly_rhino: C,
  quill_porcupine: C,
  atlatl_thrower: R,
  boulder_hurler: R,
  herbalist: R,
  pelt_rager: R,
  sapling_sling: R,
  beast_caller: E,
  cave_bear: E,
  rockfall_shaman: E,
  elk_chieftain: L,
  // W2 Bronze (2026-10-03)
  shield_bearer: C,
  thracian_raider: C,
  rhodian_slingers: C,
  discus_thrower: C,
  war_elephant: C,
  net_caster: C,
  cretan_archer: R,
  belly_bowman: R,
  aulos_piper: R,
  tragic_chorus: R,
  polybolos: R,
  wooden_horse: E,
  amazon_rider: E,
  minotaur: E,
  hydra: L,
  // W3 Medieval (2026-10-03)
  squire_pair: C,
  flailman: C,
  brigand: C,
  crossbowman: C,
  greatsword_knight: C,
  springald: C,
  yeoman_archer: R,
  warhammer_sergeant: R,
  herald: R,
  kennel_master: R,
  grapple_crane: R,
  mangonel_cart: E,
  siege_belfry: E,
  alchemist: E,
  lindworm: L,
  // W4 Gunpowder (2026-10-03)
  highlander: C,
  powder_monkey: C,
  voltigeurs: C,
  blunderbuss: C,
  dragoon: C,
  carronade: C,
  coehorn_crew: R,
  wall_gunner: R,
  drummer_boy: R,
  bagpiper: R,
  sea_mortar: R,
  rocket_cart: E,
  hussar: E,
  mesmerist: E,
  grand_marshal: L,
  // W5 Industrial (2026-10-03)
  coal_miners: C,
  iron_mantlet: C,
  dispatch_rider: C,
  bomb_bowler: C,
  steam_tractor: C,
  rivet_spitter: C,
  trench_mortar: R,
  steam_driller: R,
  bandmaster: R,
  clockwork_tinker: R,
  steam_hammer: R,
  armoured_car: E,
  alpine_climber: E,
  spark_scientist: E,
  armoured_train: L,
  // W6 Modern (2026-10-03)
  commando: C,
  sandbag_carrier: C,
  smg_squad: C,
  rifle_grenadier: C,
  assault_gun: C,
  anti_tank_gun: C,
  mortar_team: R,
  sticky_bomber: R,
  combat_medic: R,
  bulldog_sergeant: R,
  rocket_battery: R,
  dive_bomber: E,
  bulldozer: E,
  ghillie_sniper: E,
  sky_fortress: L,  // W7 Future (2026-10-03); the Future age first drops in Arena 3, so its Commons arrive there
  android_pair: C,
  barrier_trooper: C,
  hover_bike: C,
  needle_gunner: C,
  crab_mech: C,
  cryo_pod: C,
  arc_lobber: R,
  plasma_lancer: R,
  overclock_engineer: R,
  holo_projector: R,
  tractor_beam: R,
  jetpack_trooper: E,
  particle_cannon: E,
  overload_android: E,
  drone_carrier: L,
};
