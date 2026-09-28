/**
 * Save version 2: eight ages (DESIGN A17.13). Bronze, Industrial and Cosmic join the game.
 *
 * - Every stored War Plan gains a Bronze, an Industrial and a Cosmic loadout: that age's three starter
 *   Commons, both Common turrets and the default power (the starter kit of A3, A17.13).
 * - The collection gains the 15 new starter Commons at L1 (not new, no copies, no foil) and
 *   `powersOwned` the 3 new default powers. Nothing already owned changes (A15.1).
 *
 * The card ids are frozen here on purpose: a migration describes the step from v1 to v2 as it was
 * shipped, and the save package may not read the content (DESIGN B2). Never edit this step; a later
 * change needs a new version.
 */
import type { SaveVersion } from './types';

type Id = string | null;
interface LoadoutV2 {
  units: Id[];
  turrets: Id[];
  power: string;
}

/** The starter loadout of each new age (A17.9-A17.11 Commons, both Common turrets, default power). */
const NEW_AGES: Readonly<Record<'bronze' | 'industrial' | 'cosmic', { units: [string, string, string]; turrets: [string, string]; power: string }>> = {
  bronze: { units: ['hoplite', 'javelineer', 'war_chariot'], turrets: ['archer_tower', 'sun_mirror'], power: 'tidal_wave' },
  industrial: { units: ['riveter', 'carbineer', 'steam_golem'], turrets: ['gatling_gun', 'mortar_pit'], power: 'iron_horse' },
  cosmic: { units: ['star_legionnaire', 'ion_ranger', 'hover_tank'], turrets: ['ion_turret', 'starburst_gun'], power: 'starfall' },
};

/** Loadout key order of a v2 War Plan: the eight ages from Stone to Cosmic (A17.8). */
const AGE_ORDER = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'] as const;

function starterLoadout(age: keyof typeof NEW_AGES): LoadoutV2 {
  const a = NEW_AGES[age];
  return { units: [...a.units, null, null], turrets: [...a.turrets], power: a.power };
}

type Doc = Record<string, unknown> & {
  v: number;
  warPlans?: { name?: unknown; loadouts?: Record<string, unknown> }[];
  collection?: Record<string, unknown>;
  powersOwned?: unknown[];
};

export const v2: SaveVersion = {
  v: 2,
  summary: 'Eight ages (A17.13): Bronze, Industrial and Cosmic loadouts in every War Plan; their starter Commons and default powers.',
  up: (input) => {
    const doc = input as Doc;
    if (Array.isArray(doc.warPlans)) {
      doc.warPlans = doc.warPlans.map((plan) => {
        const old = plan.loadouts ?? {};
        const loadouts: Record<string, unknown> = {};
        for (const age of AGE_ORDER) {
          if (old[age] !== undefined) loadouts[age] = old[age];
          else if (age === 'bronze' || age === 'industrial' || age === 'cosmic') loadouts[age] = starterLoadout(age);
        }
        // Keep anything unexpected rather than dropping it; the schema decides whether it is valid.
        for (const k of Object.keys(old)) if (!(k in loadouts)) loadouts[k] = old[k];
        return { ...plan, loadouts };
      });
    }
    if (doc.collection && typeof doc.collection === 'object') {
      for (const age of Object.values(NEW_AGES)) {
        for (const id of [...age.units, ...age.turrets]) {
          if (doc.collection[id] === undefined) doc.collection[id] = { level: 1, copies: 0, isNew: false, foil: 'none' };
        }
      }
    }
    if (Array.isArray(doc.powersOwned)) {
      for (const age of Object.values(NEW_AGES)) if (!doc.powersOwned.includes(age.power)) doc.powersOwned.push(age.power);
    }
    return { ...doc, v: 2 };
  },
};
