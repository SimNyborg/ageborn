/**
 * Save fixtures for the meta screens (DESIGN C2/WP9 DoD: every screen renders with the fake save in
 * the states new player, mid-game and maxed). Built on the WP0 fake save (`fakeSaveDoc`) with card
 * ids from the real content, so the screens show real cards. Test and dev-page use only; production
 * code never imports this folder.
 */
import type { Content } from '@/content/types';
import type { AgeId, CardId, Foil, Loadout, PendingCapsule, QuestSlot, SaveDoc } from '@/contracts';
import { FAKE_EPOCH_MS } from '@/contracts/fakes/clock';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';

export type FixtureState = 'new' | 'mid' | 'maxed';
export const FIXTURE_STATES: readonly FixtureState[] = ['new', 'mid', 'maxed'];

/** "Now" for every fixture: 2026-01-01 14:00 local-ish, 10 h after the fake epoch's 04:00 reset. */
export const FIXTURE_NOW = FAKE_EPOCH_MS + 10 * 3600 * 1000;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

type Entry = SaveDoc['collection'][string];

function entry(level: number, copies = 0, foil: Foil = 'none', isNew = false): Entry {
  return { level, copies, foil, isNew };
}

function byAge(content: Content, age: AgeId) {
  return {
    units: content.order.units.filter((id) => content.units[id]!.age === age),
    turrets: content.order.turrets.filter((id) => content.turrets[id]!.age === age),
    powers: content.order.powers.filter((id) => content.powers[id]!.age === age),
  };
}

/** The age's starter power of a slot (A2.9.8: by `source`, never by slot name). */
function starterPower(content: Content, age: AgeId, slot: 'home' | 'field'): CardId {
  return content.order.powers.find((id) => content.powers[id]!.age === age && content.powers[id]!.slot === slot && content.powers[id]!.source === 'starter')!;
}

function loadout(units: (CardId | null)[], turrets: (CardId | null)[], powers: Loadout['powers']): Loadout {
  return {
    units: Array.from({ length: 7 }, (_, i) => units[i] ?? null),
    turrets: Array.from({ length: 2 }, (_, i) => turrets[i] ?? null),
    powers,
  };
}

/** A plan per age from owned cards: commons, then rares, epics and Legendaries as owned. */
function planFrom(
  content: Content,
  collection: SaveDoc['collection'],
  name: string,
  pick: (ids: CardId[]) => CardId[] = (x) => x,
): SaveDoc['warPlans'][number] {
  const loadouts = {} as Record<AgeId, Loadout>;
  for (const age of content.order.ages) {
    const a = byAge(content, age);
    const units = pick(a.units.filter((id) => collection[id])).slice(0, 6);
    const turrets = a.turrets.filter((id) => collection[id]).slice(0, 2);
    loadouts[age] = loadout(units, turrets, { home: starterPower(content, age, 'home'), field: starterPower(content, age, 'field') });
  }
  return { name, loadouts };
}

function quests(ids: [string, number, boolean][], weekly: [number, boolean]): SaveDoc['quests'] {
  const daily: QuestSlot[] = ids.map(([id, progress, claimed]) => ({ id, progress, claimed }));
  return {
    daily,
    rerollUsed: false,
    dayKey: '2026-01-01',
    weekly: { id: 'weekly_win_15', progress: weekly[0], claimed: weekly[1] },
    weekKey: '2026-W01',
  };
}

function capsule(
  id: string,
  kind: PendingCapsule['kind'],
  tier: PendingCapsule['tier'],
  startTier: PendingCapsule['tier'],
  age: AgeId | null = null,
): PendingCapsule {
  return {
    id,
    kind,
    tier,
    startTier,
    scriptIndex: null,
    age,
    contents: { stacks: [], amber: 0, dust: 0, skin: null },
    createdAt: FIXTURE_NOW - HOUR,
  };
}

/**
 * New player: Home has just appeared after the A8 onboarding (matches 1-2, capsules 1-2 opened,
 * the forced Bonker upgrade done). War Plan and Skirmish are still locked (A3).
 */
/** War Path progress with the first `beaten` levels beaten (A18.7); `stars(i)` per level. */
function warPathFixture(content: Content, beaten: number, stars: (i: number) => number, legacy = false): Pick<SaveDoc, 'warPath' | 'flags'> {
  const out: SaveDoc['warPath'] = { path: 'normal', stars: {}, crowns: {}, relics: [], difficulty: 'normal', lossStreak: 0, legacy };
  content.warPath.order.slice(0, beaten).forEach((id, i) => {
    out.stars[id] = stars(i);
    out.crowns[id] = stars(i) === 3 ? 3 : 2;
  });
  // The unlock ceremonies of what is already open have played (ui-plan 2.6).
  const flags: Record<string, boolean> = {};
  for (const [f, lv] of Object.entries(content.warPath.unlocks)) if (legacy || beaten >= lv) flags[`ui-unlock.${f}`] = true;
  // The Campaign card joins Home with the end of the onboarding (owner decision 2026-09-30).
  if (legacy || beaten >= 2) flags['ui-unlock.campaign'] = true;
  if (beaten > 0 || legacy) {
    flags['ui-seen.amber'] = true;
    flags['ui-seen.dust'] = true;
  }
  // A2.9.1: the Field power slot opens with the first clear of War Path Stone L5 (meta's `power.field`).
  if (beaten >= 5 || legacy) flags['power.field'] = true;
  return { warPath: out, flags };
}

export function newPlayerSave(content: Content): SaveDoc {
  const collection: SaveDoc['collection'] = {};
  for (const age of content.order.ages) {
    const a = byAge(content, age);
    for (const id of [...a.units, ...a.turrets]) {
      const def = content.units[id] ?? content.turrets[id];
      if (def?.rarity === 'common') collection[id] = entry(1, 0);
    }
  }
  collection['bonker'] = entry(2, 1);
  collection['pebbler'] = entry(1, 2);
  collection['spear_hunter'] = entry(1, 0);
  // A17.13: onboarding capsule 1 also brings the Phalangite
  collection['phalangite'] = entry(1, 0);
  collection['pikeman'] = entry(1, 0, 'none', true);
  collection['grenadier'] = entry(1, 0, 'none', true);
  const powersOwned = content.order.powers.filter((id) => content.powers[id]!.source === 'starter');
  return fakeSaveDoc({
    createdAt: FIXTURE_NOW - 12 * 60 * 1000,
    profile: { name: 'Chief-4821', avatar: { seed: 4821, parts: {} }, banner: 'tar_pit', frame: 'none', title: 'recruit' },
    currencies: { amber: 180, dust: 0 },
    trophies: { current: 0, best: 0, roadClaimed: [] },
    arenaIndex: 0,
    collection,
    powersOwned,
    skins: { owned: [], equipped: {} },
    warPlans: [planFrom(content, collection, 'A')],
    activePlan: 0,
    capsules: {
      pending: [],
      charges: 12,
      chargesUpdatedAt: FIXTURE_NOW,
      freeCapsulesLeft: 8,
      clayMeter: 0,
      dailyBank: 1,
      dailyNextAt: FIXTURE_NOW + 14 * HOUR,
      bag: [],
      bagSize: 0,
      wardrobe: [],
    },
    pity: { sinceEpic: 2, sinceLegendary: 2, sinceNewCard: 0, opened: 2, wardrobeSinceEpic: 0, wardrobeSinceLegendary: 0 },
    scriptStep: 2,
    quests: quests(
      [
        ['win_2', 0, false],
        ['play_3', 0, false],
        ['train_30', 12, false],
      ],
      [2, false],
    ),
    codexPoints: 1,
    codexLevel: 1,
    mmr: 1000,
    lossStreak: 0,
    matchesPlayed: 2,
    stats: {
      matches: 2,
      wins: 2,
      losses: 0,
      draws: 0,
      winsByTier: [1],
      lossesByTier: [],
      trainedByCard: { bonker: 18, pebbler: 9, footman: 4 },
      fastestWinMs: 181000,
      futureReached: 1,
    },
    tutorial: { step: 12, hintsShown: {} },
    lastExportAt: null,
    // War Path Stone L1 and L2 beaten (the onboarding matches); L3 is next.
    ...warPathFixture(content, 2, (i) => (i === 0 ? 2 : 1)),
  });
}

/** Mid-game: Arena 4 (Powder Bay), about three weeks in, a mixed collection with some foils. */
export function midGameSave(content: Content): SaveDoc {
  const collection: SaveDoc['collection'] = {};
  const levels: Record<string, [number, number, Foil?]> = {
    // commons [level, copies, foil]
    bonker: [7, 20, 'silver'],
    pebbler: [6, 14, 'holo'],
    tuskback: [6, 3],
    footman: [6, 12, 'bronze'],
    longbowman: [6, 9],
    destrier_knight: [5, 8],
    corsair: [5, 4],
    fusilier: [6, 13],
    cuirassier: [5, 2],
    trench_raider: [4, 5],
    rifleman: [5, 9],
    tankette: [4, 1],
    photon_knight: [3, 3],
    pulse_trooper: [4, 2],
    walker_mech: [3, 0],
    // A17 ages (save v2 added their starter Commons, A17.13)
    hoplite: [5, 6],
    javelineer: [5, 4],
    war_chariot: [4, 2],
    riveter: [4, 3],
    carbineer: [4, 5],
    steam_golem: [3, 1],
    star_legionnaire: [2, 1],
    ion_ranger: [2, 2],
    hover_tank: [2, 0],
    // rares
    spear_hunter: [5, 6],
    drum_shaman: [4, 3],
    pikeman: [5, 11],
    friar: [3, 4],
    grenadier: [4, 2],
    field_surgeon: [3, 1],
    bazooka_trooper: [3, 2],
    rail_gunner: [2, 1],
    radio_operator: [2, 0],
    phalangite: [4, 3],
    standard_bearer: [2, 0],
    harpoon_gunner: [2, 1],
    graviton_halberdier: [1, 0],
    // epics
    sabertooth: [3, 2, 'bronze'],
    battering_ram: [2, 1],
    bronze_cannon: [2, 0],
    gyrocopter: [1, 1],
    // legendaries
    mammoth_matriarch: [2, 0, 'bronze'],
    // turrets
    rock_tosser: [5, 6],
    angry_beehive: [4, 3],
    log_roller: [3, 2],
    crossbow_nest: [5, 5],
    pitch_cauldron: [4, 2],
    trebuchet: [3, 1],
    swivel_gun: [4, 3],
    grapeshot_gun: [4, 1],
    mg_nest: [3, 4],
    flak_gun: [3, 2],
    howitzer: [2, 0],
    pulse_laser: [2, 1],
    arc_coil: [2, 0],
    grumpy_toad: [2, 1],
    archer_tower: [4, 2],
    sun_mirror: [3, 1],
    gatling_gun: [3, 2],
    mortar_pit: [3, 1],
    ion_turret: [2, 0],
    starburst_gun: [1, 1],
  };
  for (const id of Object.keys(levels)) {
    if (!content.units[id] && !content.turrets[id]) continue;
    const [level, copies, foil] = levels[id]!;
    collection[id] = entry(level, copies, foil ?? 'none', id === 'gyrocopter');
  }
  const powersOwned = [...content.order.powers];
  const roadClaimed = content.trophyRoad.nodes.filter((n) => n.trophies <= 900).map((n) => n.trophies);
  const rush = planFrom(content, collection, 'Rush');
  const turtle = planFrom(content, collection, 'Turtle', (ids) => [...ids].reverse());
  const air = planFrom(content, collection, 'Air');
  return fakeSaveDoc({
    createdAt: FIXTURE_NOW - 23 * DAY,
    profile: { name: 'Warlord-0457', avatar: { seed: 457, parts: { hat: 1 } }, banner: 'harbor', frame: 'bark', title: 'evolver' },
    currencies: { amber: 3450, dust: 820 },
    trophies: { current: 1020, best: 1080, roadClaimed },
    arenaIndex: 3,
    collection,
    powersOwned,
    skins: { owned: ['pumpkin_head', 'tin_can', 'woolly_tuskback'], equipped: { bonker: 'pumpkin_head' } },
    cosmetics: {
      owned: [
        'tar_pit', 'frostfang', 'moat', 'harbor',
        'nationalFlag.dk', 'nationalFlag.se', 'nationalFlag.gb_eng', 'nationalFlag.us', 'nationalFlag.de', 'nationalFlag.jp',
        'baseFlag.mammoth', 'baseFlag.oak', 'baseFlag.lightning',
        'emote.clap', 'emote.heart', 'emote.bonk', 'emote.robo_dance',
        'quote.charge', 'quote.plot_twist', 'quote.respect', 'quote.one_more_wave',
        'baseSkin.frost_cave', 'baseSkin.rose_keep',
        'backdrop.golden_dusk', 'backdrop.winterfall', 'backdrop.thunderstorm',
        'decoration.stone_idol', 'decoration.lion_statue', 'decoration.iron_brazier', 'decoration.olive_tree', 'decoration.golden_cup',
      ],
      equipped: {
        emotes: ['laugh', 'salute', 'thumbsUp', 'gg', 'emote.clap', 'emote.heart', 'emote.bonk', 'emote.robo_dance'],
        quotes: ['quote.glhf', 'quote.well_played', 'quote.charge', 'quote.plot_twist'],
        baseFlag: 'baseFlag.mammoth',
        nationalFlag: 'nationalFlag.dk',
        baseSkins: { stone: 'baseSkin.frost_cave', medieval: 'baseSkin.rose_keep' },
        decorations: ['decoration.lion_statue', 'decoration.iron_brazier', 'decoration.olive_tree'],
        backdrop: null,
      },
    },
    warPlans: [rush, turtle, air],
    activePlan: 0,
    capsules: {
      pending: [
        capsule('cap-mid-1', 'win', 'silver', 'clay'),
        capsule('cap-mid-2', 'win', 'bronze', 'clay'),
        capsule('cap-mid-3', 'daily', 'bronze', 'bronze'),
        capsule('cap-mid-4', 'meter', 'clay', 'clay'),
        capsule('cap-mid-5', 'road', 'jade', 'jade'),
      ],
      charges: 5,
      chargesUpdatedAt: FIXTURE_NOW - 2 * HOUR,
      freeCapsulesLeft: 0,
      clayMeter: 1,
      dailyBank: 1,
      dailyNextAt: FIXTURE_NOW + 14 * HOUR,
      // A 200-slot bag in progress (the 2026-09-29 ladder: tier indices 0-6, Clay to Aeon)
      bag: [...Array(36).fill(0), ...Array(52).fill(1), ...Array(28).fill(2), ...Array(10).fill(3), ...Array(3).fill(4), ...Array(1).fill(5), ...Array(1).fill(6)],
      bagSize: 200,
      wardrobe: [
        { id: 'crate-mid-1', source: 'road', skin: 'arctic_rifleman', rarity: 'rare', duplicateDust: 0, createdAt: FIXTURE_NOW - DAY },
      ],
    },
    pity: { sinceEpic: 6, sinceLegendary: 28, sinceNewCard: 2, opened: 57, wardrobeSinceEpic: 1, wardrobeSinceLegendary: 1 },
    scriptStep: 5,
    quests: {
      ...quests(
        [
          ['win_2', 2, false],
          ['train_30', 18, false],
          ['turret_kills_20', 20, true],
        ],
        [9, false],
      ),
    },
    codexPoints: 7,
    codexLevel: 18,
    mmr: 1240,
    lossStreak: 1,
    matchesPlayed: 96,
    conquest: {
      stars: { pip: [true, true, true], kettle: [true, true, false], moss: [true, false, false] },
      milestonesClaimed: [],
    },
    stats: {
      matches: 96,
      wins: 58,
      losses: 35,
      draws: 3,
      winsByTier: [5, 10, 14, 16, 9, 4],
      lossesByTier: [1, 3, 8, 11, 9, 3],
      trainedByCard: { bonker: 820, footman: 610, fusilier: 540, pebbler: 480, pikeman: 300 },
      fastestWinMs: 312000,
      futureReached: 21,
    },
    tutorial: { step: 99, hintsShown: {} },
    lastExportAt: FIXTURE_NOW - 9 * DAY,
    // The Stone region and Bronze L1-L6 beaten, mixed stars; Bronze L7 is next.
    ...warPathFixture(content, 16, (i) => [3, 2, 3, 1, 2, 3, 2, 2, 1, 3, 2, 3, 1, 2, 3, 2][i] ?? 1),
  });
}

/** Maxed: everything owned at level 10 with Holo foils, the road and Conquest finished. */
export function maxedSave(content: Content): SaveDoc {
  const collection: SaveDoc['collection'] = {};
  for (const id of [...content.order.units, ...content.order.turrets]) collection[id] = entry(10, 0, 'holo');
  // The 2026-09-29 ladder: the fixed-tier capsules show their tier (a road Aeon, a Gate 8 Platinum, a
  // War Path Gold); the Win Capsules keep their rolled tiers hidden behind their Clay start tier.
  const fixed = { 0: ['road', 'aeon'], 1: ['road', 'platinum'], 2: ['warPath', 'gold'] } as const;
  const pending: PendingCapsule[] = Array.from({ length: 10 }, (_, i) => {
    const f = fixed[i as keyof typeof fixed];
    const rolled = (['aeon', 'platinum', 'gold', 'bronze', 'bronze', 'clay', 'silver', 'jade', 'clay', 'gold'] as const)[i]!;
    return capsule(`cap-max-${i + 1}`, f ? f[0] : 'win', f ? f[1] : rolled, f ? f[1] : 'clay');
  });
  const stars: SaveDoc['conquest']['stars'] = {};
  for (const b of content.generals.conquest.board) stars[b.general] = [true, true, true];
  const plan = planFrom(content, collection, 'Legends', (ids) => [...ids].reverse());
  return fakeSaveDoc({
    createdAt: FIXTURE_NOW - 190 * DAY,
    profile: { name: 'Marshal-9001', avatar: { seed: 9001, parts: { hat: 4 } }, banner: 'rift', frame: 'aeon', title: 'ageborn' },
    currencies: { amber: 48920, dust: 12400 },
    // best covers the whole road, also after a content wave lengthens it
    trophies: { current: 4210, best: Math.max(4380, ...content.trophyRoad.nodes.map((n) => n.trophies)), roadClaimed: content.trophyRoad.nodes.map((n) => n.trophies) },
    arenaIndex: content.arenas.list.length - 1,
    collection,
    powersOwned: [...content.order.powers],
    skins: {
      owned: [...content.order.skins],
      equipped: { bonker: 'pumpkin_head', mammoth_matriarch: 'frost_matriarch', 'base.future': 'crystal_spire' },
    },
    cosmetics: {
      owned: [...content.cosmetics.banners.map((b) => b.id), ...content.cosmetics.collections.items.map((x) => `${x.collection}.${x.id}`)],
      equipped: {
        emotes: ['gg', 'salute', 'emote.supernova', 'emote.party', 'emote.cannon_confetti', 'emote.orbit_heart', 'emote.cool_shades', 'emote.heart'],
        quotes: ['quote.honour', 'quote.legendary', 'quote.to_the_stars', 'quote.gg_wp'],
        baseFlag: 'baseFlag.phoenix',
        nationalFlag: 'nationalFlag.gb_eng',
        baseSkins: { future: 'baseSkin.midnight_neon', cosmic: 'baseSkin.nebula_ark' },
        decorations: ['decoration.star_trophy', 'decoration.plasma_brazier', 'decoration.astro_statue'],
        backdrop: 'backdrop.northern_lights',
      },
    },
    warPlans: [plan, planFrom(content, collection, 'Classic'), planFrom(content, collection, 'Air')],
    activePlan: 0,
    capsules: {
      pending,
      charges: 12,
      chargesUpdatedAt: FIXTURE_NOW - 30 * HOUR,
      freeCapsulesLeft: 0,
      clayMeter: 1,
      dailyBank: 3,
      dailyNextAt: null,
      bag: [],
      bagSize: 0,
      wardrobe: [],
    },
    pity: { sinceEpic: 0, sinceLegendary: 12, sinceNewCard: 0, opened: 812, wardrobeSinceEpic: 3, wardrobeSinceLegendary: 7 },
    scriptStep: 5,
    quests: {
      ...quests(
        [
          ['win_2', 2, true],
          ['evolve_6', 6, true],
          ['fast_base_kill', 1, true],
        ],
        [15, true],
      ),
      rerollUsed: true,
    },
    codexPoints: 0,
    codexLevel: 81,
    mmr: 1880,
    lossStreak: 0,
    matchesPlayed: 1422,
    conquest: { stars, milestonesClaimed: content.generals.conquest.milestones.map((m) => m.stars) },
    stats: {
      matches: 1422,
      wins: 910,
      losses: 480,
      draws: 32,
      winsByTier: [20, 40, 60, 80, 90, 110, 120, 130, 120, 90, 50],
      lossesByTier: [2, 6, 15, 22, 34, 50, 62, 70, 80, 79, 60],
      trainedByCard: { chrono_titan: 2100, bonker: 9000, photon_knight: 9400 },
      fastestWinMs: 201000,
      futureReached: 640,
    },
    tutorial: { step: 99, hintsShown: {} },
    lastExportAt: FIXTURE_NOW - 2 * DAY,
    ...warPathFixture(content, content.warPath.order.length, () => 3, true),
  });
}

export function fixtureSave(content: Content, state: FixtureState): SaveDoc {
  if (state === 'new') return newPlayerSave(content);
  if (state === 'mid') return midGameSave(content);
  return maxedSave(content);
}
