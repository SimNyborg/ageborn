/**
 * Save version 9: every age's Anti-heavy Rare joins the starter kit (DESIGN A3, A2.6; owner feedback
 * 2026-09-29 "Heavy is very strong; we need a class that counters it", build phase H3).
 *
 * - Each of the eight Anti-heavy Rares (the Anti-armor role) the save does not own is granted at L1
 *   with no copies and the NEW flag, so the Collection points the player at them. A card the save
 *   already owns keeps its level, copies, foil and NEW flag.
 * - Each War Plan gets its age's Anti-heavy card in the first empty unit slot of that age's loadout,
 *   unless the loadout already holds it. A card is never replaced; a full loadout stays as it is.
 * - Additive and idempotent: a re-run changes nothing. A missing or broken collection, plan or
 *   loadout is left to the schema (this step never invents a whole structure).
 *
 * The card ids are frozen here on purpose: a migration describes the content of its day.
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

/** The Anti-heavy Rare of each age, as of save version 9. */
export const V9_ANTI_HEAVY: Readonly<Record<string, string>> = {
  stone: 'spear_hunter',
  bronze: 'phalangite',
  medieval: 'pikeman',
  gunpowder: 'grenadier',
  industrial: 'harpoon_gunner',
  modern: 'bazooka_trooper',
  future: 'rail_gunner',
  cosmic: 'graviton_halberdier',
};

type Loadout = Record<string, unknown> & { units?: unknown };
type Plan = Record<string, unknown> & { loadouts?: unknown };
type Doc = Record<string, unknown> & { v: number; collection?: unknown; warPlans?: unknown };

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** The loadout with the card in its first empty unit slot (unchanged when present or full). */
function withCard(l: Loadout, card: string): Loadout {
  const units = l.units;
  if (!Array.isArray(units) || units.includes(card)) return l;
  const i = units.indexOf(null);
  if (i < 0) return l;
  const next = [...units];
  next[i] = card;
  return { ...l, units: next };
}

export const v9: SaveVersion = {
  v: 9,
  summary: 'Anti-heavy Rares in the starter kit: grant each at L1 and slot it into an empty unit slot of its age (A3)',
  up: (input) => {
    const doc = input as Doc;
    if (isRecord(doc.collection)) {
      const collection = { ...doc.collection };
      for (const card of Object.values(V9_ANTI_HEAVY)) {
        const e = collection[card];
        const owned = isRecord(e) && typeof e['level'] === 'number' && e['level'] >= 1;
        if (!owned) collection[card] = { level: 1, copies: 0, isNew: true, foil: 'none' };
      }
      doc.collection = collection;
    }
    if (Array.isArray(doc.warPlans)) {
      doc.warPlans = doc.warPlans.map((p: unknown) => {
        if (!isRecord(p) || !isRecord((p as Plan).loadouts)) return p;
        const loadouts = { ...((p as Plan).loadouts as Record<string, unknown>) };
        for (const [age, card] of Object.entries(V9_ANTI_HEAVY)) {
          const l = loadouts[age];
          if (isRecord(l)) loadouts[age] = withCard(l as Loadout, card);
        }
        return { ...p, loadouts };
      });
    }
    return { ...doc, v: 9 };
  },
};
