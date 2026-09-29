/**
 * Save version 7: two typed power slots per age (DESIGN A2.9.1, A2.9.8; owner request 2026-09-29
 * "powers cost gold, reload, more powers, own-half limits"). Nothing owned is lost (A15.1).
 *
 * 1. Every stored loadout's `power` becomes `powers: { home, field }`: the stored id goes into the
 *    slot its card now belongs to, and the other slot gets that age's starter for that slot. An id this
 *    step does not know leaves both slots on the age's starters.
 * 2. `flags['power.field']` (the Field slot unlock) is set for every save that has played a match, has
 *    cleared War Path Stone L5, or has best trophies ≥ 150: eight built powers move to the Field slot,
 *    so a player who has played keeps the power they know in battle.
 * 3. `powersOwned` keeps every id and gains the 8 new starters, every War Path power whose reward level
 *    the save has first-cleared, and the new power item of every already claimed Trophy Road node ≥ 550
 *    (`trophies.roadClaimed` stores whole node values, so a claimed node would never offer it). A power
 *    granted by both sources here is added once and the second grant pays 60 Amber, once.
 *
 * The step is idempotent: a loadout that already has `powers` is kept, and a power already owned is
 * neither added nor paid again. The card ids are frozen here on purpose: the save package may not read
 * the content (DESIGN B2). Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

type Id = string | null;
type Slot = 'home' | 'field';

/** The flag the Field slot unlock sets (meta reads it; A2.9.1). */
export const POWER_FIELD_FLAG = 'power.field';

/** Each age's starters by slot (A5.7). */
const STARTERS: Readonly<Record<string, { home: string; field: string }>> = {
  stone: { home: 'rockslide', field: 'stampede' },
  bronze: { home: 'tidal_wave', field: 'chariot_rush' },
  medieval: { home: 'arrow_storm', field: 'knights_charge' },
  gunpowder: { home: 'volley_fire', field: 'smoke_screen' },
  industrial: { home: 'gun_line', field: 'iron_horse' },
  modern: { home: 'strafing_run', field: 'paratroopers' },
  future: { home: 'orbital_lance', field: 'drone_swarm' },
  cosmic: { home: 'starfall', field: 'comet_run' },
};

/** The slot of every power that existed before this version (the 16 built powers, A5.7). */
const OLD_SLOT: Readonly<Record<string, Slot>> = {
  stampede: 'field',
  meteor_shower: 'home',
  tidal_wave: 'home',
  aegis: 'field',
  arrow_storm: 'home',
  royal_decree: 'field',
  smoke_screen: 'field',
  broadside: 'home',
  iron_horse: 'field',
  zeppelin_raid: 'home',
  paratroopers: 'field',
  carpet_bomber: 'home',
  orbital_lance: 'home',
  nanite_surge: 'field',
  starfall: 'home',
  warp_strike: 'field',
};

/** The 8 new starters, owned from the first launch (A2.9.8). */
const NEW_STARTERS = ['rockslide', 'chariot_rush', 'knights_charge', 'volley_fire', 'gun_line', 'strafing_run', 'drone_swarm', 'comet_run'];

/** War Path powers: [region, level, power, Trophy Road fallback node] (A2.9.8). */
const WAR_PATH_POWERS: readonly (readonly [string, number, string, number])[] = [
  ['stone', 5, 'sticky_tar', 550],
  ['stone', 7, 'hunt_cry', 600],
  ['stone', 9, 'hunters_spear', 650],
  ['bronze', 5, 'zeus_bolts', 700],
  ['bronze', 7, 'apollo_arrow', 750],
  ['bronze', 9, 'medusa_gaze', 850],
  ['medieval', 5, 'caltrops', 900],
  ['medieval', 7, 'undermine', 950],
  ['medieval', 9, 'boiling_oil', 1050],
  ['gunpowder', 5, 'boarding_nets', 1100],
  ['gunpowder', 7, 'horse_artillery', 1150],
  ['gunpowder', 9, 'sharpshooter', 1200],
  ['industrial', 5, 'barbed_wire', 1250],
  ['industrial', 7, 'railway_gun', 1350],
  ['industrial', 9, 'field_hospital', 1400],
  ['modern', 5, 'aa_screen', 1450],
  ['modern', 7, 'tank_rush', 1550],
  ['modern', 9, 'sniper_team', 1600],
  ['future', 5, 'point_defense', 1650],
  ['future', 7, 'emp_blackout', 1700],
  ['future', 9, 'stasis_field', 1750],
  ['cosmic', 5, 'singularity', 1800],
  ['cosmic', 7, 'ion_cannon', 1850],
  ['cosmic', 9, 'solar_flare', 1950],
];

/** Amber paid instead of a power the save already gets from the other source (A2.9.8). */
const OWNED_POWER_AMBER = 60;
/** The Field slot unlocks at the Gate 2 node (A2.9.1). */
const FIELD_TROPHIES = 150;
const FIELD_LEVEL = 'wp.stone.l05';

const levelId = (region: string, level: number): string => `wp.${region}.l${level < 10 ? `0${level}` : `${level}`}`;

type Doc = Record<string, unknown> & {
  v: number;
  warPlans?: { name?: unknown; loadouts?: Record<string, unknown> }[];
  powersOwned?: unknown[];
  currencies?: { amber?: unknown; dust?: unknown };
  trophies?: { best?: unknown; roadClaimed?: unknown };
  warPath?: { stars?: unknown };
  matchesPlayed?: unknown;
  flags?: Record<string, boolean>;
};

/** A stored loadout in the new shape (A2.9.1). */
function slotted(age: string, raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const l = raw as Record<string, unknown>;
  if (l.powers !== undefined && l.power === undefined) return l;
  const st = STARTERS[age];
  const old = typeof l.power === 'string' ? l.power : null;
  const slot = old !== null ? OLD_SLOT[old] : undefined;
  let home: Id = st ? st.home : null;
  let field: Id = st ? st.field : null;
  if (old !== null && slot === 'home') home = old;
  if (old !== null && slot === 'field') field = old;
  const next: Record<string, unknown> = { ...l, powers: { home, field } };
  delete next.power;
  return next;
}

export const v7: SaveVersion = {
  v: 7,
  summary: 'Two power slots per age (A2.9): loadouts get Home and Field; the new starters, cleared War Path and claimed road powers are granted',
  up: (input) => {
    const doc = input as Doc;
    if (Array.isArray(doc.warPlans)) {
      doc.warPlans = doc.warPlans.map((plan) => {
        const old = plan.loadouts ?? {};
        const loadouts: Record<string, unknown> = {};
        for (const age of Object.keys(old)) loadouts[age] = slotted(age, old[age]);
        return { ...plan, loadouts };
      });
    }
    const owned: unknown[] = Array.isArray(doc.powersOwned) ? [...doc.powersOwned] : [];
    const had = new Set(owned.filter((x): x is string => typeof x === 'string'));
    const grant = (id: string): void => {
      if (!owned.includes(id)) owned.push(id);
    };
    for (const id of NEW_STARTERS) grant(id);
    const stars = doc.warPath && typeof doc.warPath.stars === 'object' && doc.warPath.stars !== null ? (doc.warPath.stars as Record<string, unknown>) : {};
    const claimed = Array.isArray(doc.trophies?.roadClaimed) ? (doc.trophies.roadClaimed as unknown[]) : [];
    let amber = 0;
    for (const [region, level, power, node] of WAR_PATH_POWERS) {
      const byWarPath = typeof stars[levelId(region, level)] === 'number' && (stars[levelId(region, level)] as number) > 0;
      const byRoad = claimed.includes(node);
      if (!byWarPath && !byRoad) continue;
      if (had.has(power)) continue;
      grant(power);
      if (byWarPath && byRoad) amber += OWNED_POWER_AMBER;
    }
    doc.powersOwned = owned;
    if (amber > 0 && doc.currencies && typeof doc.currencies.amber === 'number') {
      doc.currencies = { ...doc.currencies, amber: doc.currencies.amber + amber };
    }
    const played = typeof doc.matchesPlayed === 'number' && doc.matchesPlayed >= 1;
    const best = typeof doc.trophies?.best === 'number' ? doc.trophies.best : 0;
    const clearedL5 = typeof stars[FIELD_LEVEL] === 'number' && (stars[FIELD_LEVEL] as number) > 0;
    if (played || best >= FIELD_TROPHIES || clearedL5) {
      doc.flags = { ...(doc.flags ?? {}), [POWER_FIELD_FLAG]: true };
    }
    return { ...doc, v: 7 };
  },
};
