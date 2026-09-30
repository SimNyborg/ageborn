/**
 * Save version 11: the Fort slot (DESIGN A16.14.6, spec section 6; owner request 2026-09-29 "a class of
 * fixed structures on the lane"). Additive and idempotent; nothing is removed.
 *
 * 1. Every loadout of every War Plan preset gains `fort: null` (an existing `fort` is kept), and the save
 *    gains `fortsOwned: []`.
 * 2. `flags['fort.slot']` (the Fort slot unlock) is set when War Path Bronze L4 is cleared or best
 *    trophies ≥ 400 (Arena 3). With the flag, the 8 walls and the Stone set (War Camp, Spike Pit, Sling
 *    Perch) are granted and every empty Fort slot of every age in every preset gets its age's wall.
 * 3. With the flag, the forts of every cleared Bronze-to-Cosmic War Path L4 (camp), L6 (trap) and L8
 *    (tower), and of every claimed fort-set Trophy Road node (2,200 Bronze ... 3,200 Cosmic), are
 *    granted. A card granted by both sources is added once and pays 60 Amber once (the rule for powers).
 *    Without the flag nothing is granted: no fort reward is shown before the unlock (A16.14.6); meta
 *    grants the pending sources when the slot opens.
 *
 * The card ids are frozen here on purpose: the save package may not read the content (DESIGN B2).
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

/** The Fort slot unlock flag (meta reads the same key: `META_FLAGS.fortSlot`). */
export const FORT_SLOT_FLAG = 'fort.slot';

/** The War Path level and the trophies that open the Fort slot (A16.14.6). */
const UNLOCK_LEVEL = 'wp.bronze.l04';
const UNLOCK_TROPHIES = 400;

/** Each age's wall (the starter, A16.14.4). */
const WALLS: Readonly<Record<string, string>> = {
  stone: 'palisade',
  bronze: 'cyclopean_wall',
  medieval: 'shield_barricade',
  gunpowder: 'gabion_wall',
  industrial: 'trench_parapet',
  modern: 'sandbag_bunker',
  future: 'hardlight_barrier',
  cosmic: 'void_rampart',
};

/** The Stone Camp, Trap and Tower, granted with the unlock (A16.14.6). */
const STONE_SET = ['war_camp', 'spike_pit', 'sling_perch'];

/** Per region: [camp (L4), trap (L6), tower (L8)] and its Road fort-set node (A16.14.4, A16.14.6). */
const REGION_FORTS: readonly (readonly [string, readonly [string, string, string], number])[] = [
  ['bronze', ['muster_tents', 'hidden_stakes', 'pyrgos_tower'], 2200],
  ['medieval', ['levy_camp', 'wolf_pits', 'longbow_tower'], 2300],
  ['gunpowder', ['militia_muster', 'powder_keg', 'musket_redoubt'], 2500],
  ['industrial', ['recruiting_depot', 'tripwire_charge', 'sniper_nest'], 2700],
  ['modern', ['forward_base', 'minefield', 'pillbox'], 2900],
  ['future', ['clone_bay', 'grav_mire', 'sentry_pylon'], 3100],
  ['cosmic', ['warp_barracks', 'void_mine', 'ion_spire'], 3200],
];

/** The War Path levels whose first clear grants a region's camp, trap and tower. */
const LEVELS = [4, 6, 8] as const;

/** Amber paid instead of a fort the save already gets from the other source (the power rule, A2.9.8). */
const OWNED_FORT_AMBER = 60;

const levelId = (region: string, level: number): string => `wp.${region}.l${level < 10 ? `0${level}` : `${level}`}`;

type Doc = Record<string, unknown> & {
  v: number;
  warPlans?: { name?: unknown; loadouts?: Record<string, unknown> }[];
  fortsOwned?: unknown;
  currencies?: { amber?: unknown; dust?: unknown };
  trophies?: { best?: unknown; roadClaimed?: unknown };
  warPath?: { stars?: unknown };
  flags?: Record<string, boolean>;
};

/** A loadout with a Fort slot: `fort` kept when present, else `fill` (the age's wall with the flag) or null. */
function withFort(raw: unknown, fill: string | null): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const l = raw as Record<string, unknown>;
  const cur = typeof l.fort === 'string' ? l.fort : null;
  return { ...l, fort: cur ?? fill };
}

export const v11: SaveVersion = {
  v: 11,
  summary: 'The Fort slot (A16.14): loadouts get fort, fortsOwned; the unlock at Bronze L4 or 400 trophies grants the walls and the Stone set',
  up: (input) => {
    const doc = input as Doc;
    const stars = doc.warPath && typeof doc.warPath.stars === 'object' && doc.warPath.stars !== null ? (doc.warPath.stars as Record<string, unknown>) : {};
    const cleared = (id: string): boolean => typeof stars[id] === 'number' && (stars[id] as number) > 0;
    const best = typeof doc.trophies?.best === 'number' ? doc.trophies.best : 0;
    const flags = doc.flags && typeof doc.flags === 'object' ? doc.flags : {};
    const open = flags[FORT_SLOT_FLAG] === true || cleared(UNLOCK_LEVEL) || best >= UNLOCK_TROPHIES;
    if (Array.isArray(doc.warPlans)) {
      doc.warPlans = doc.warPlans.map((plan) => {
        const old = plan.loadouts ?? {};
        const loadouts: Record<string, unknown> = {};
        for (const age of Object.keys(old)) loadouts[age] = withFort(old[age], open ? (WALLS[age] ?? null) : null);
        return { ...plan, loadouts };
      });
    }
    const owned: string[] = Array.isArray(doc.fortsOwned) ? (doc.fortsOwned as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    let amber = 0;
    if (open) {
      doc.flags = { ...flags, [FORT_SLOT_FLAG]: true };
      const had = new Set(owned);
      const grant = (id: string): void => {
        if (!owned.includes(id)) owned.push(id);
      };
      for (const age of Object.keys(WALLS)) grant(WALLS[age] as string);
      for (const id of STONE_SET) grant(id);
      const claimed = Array.isArray(doc.trophies?.roadClaimed) ? (doc.trophies.roadClaimed as unknown[]) : [];
      for (const [region, cards, node] of REGION_FORTS) {
        const byRoad = claimed.includes(node);
        LEVELS.forEach((level, i) => {
          const card = cards[i] as string;
          const byWarPath = cleared(levelId(region, level));
          if (!byWarPath && !byRoad) return;
          if (had.has(card)) return;
          grant(card);
          if (byWarPath && byRoad) amber += OWNED_FORT_AMBER;
        });
      }
    }
    doc.fortsOwned = owned;
    if (amber > 0 && doc.currencies && typeof doc.currencies.amber === 'number') {
      doc.currencies = { ...doc.currencies, amber: doc.currencies.amber + amber };
    }
    return { ...doc, v: 11 };
  },
};
