/**
 * Save version 9: every age's Anti-heavy Rare joins the starter kit (DESIGN A3, A2.6; owner feedback
 * 2026-09-29 "Heavy is very strong; we need a class that counters it", build phase H3).
 *
 * - Each of the eight Anti-heavy Rares (the Anti-armor role) the save does not own is granted at L1
 *   with no copies and the NEW flag, so the Collection points the player at them. A card the save
 *   already owns keeps its level, copies, foil and NEW flag.
 * - Each War Plan gets its age's Anti-heavy card in the first empty unit slot of that age's loadout,
 *   unless the loadout already holds it. A card is never replaced; a full loadout stays as it is.
 * - An unopened onboarding capsule 1 or 2 (rolled before this version) still holds the old scripted
 *   Anti-heavy cards, which the save now owns, so it would open with no NEW card and the player would
 *   never get the scripted Support Rares: those stacks become the new script's cards (same rarity,
 *   copies, foil and dust), NEW when the save does not own them (review 2026-09-30).
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

/** Onboarding capsules 1 and 2 before and as of save version 9 (content `capsules.script`). */
export const V9_SCRIPT_SWAP: Readonly<Record<string, string>> = {
  spear_hunter: 'drum_shaman',
  phalangite: 'standard_bearer',
  pikeman: 'friar',
  grenadier: 'field_surgeon',
};

type Loadout = Record<string, unknown> & { units?: unknown };
type Plan = Record<string, unknown> & { loadouts?: unknown };
type Doc = Record<string, unknown> & { v: number; collection?: unknown; warPlans?: unknown; capsules?: unknown };

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
    if (isRecord(doc.capsules) && Array.isArray(doc.capsules['pending'])) {
      const owns = (card: string): boolean => {
        const e = isRecord(doc.collection) ? doc.collection[card] : undefined;
        return isRecord(e) && typeof e['level'] === 'number' && e['level'] >= 1;
      };
      const pending = (doc.capsules['pending'] as unknown[]).map((c) => {
        if (!isRecord(c) || (c['scriptIndex'] !== 1 && c['scriptIndex'] !== 2) || !isRecord(c['contents'])) return c;
        const contents = c['contents'];
        const stacks = contents['stacks'];
        if (!Array.isArray(stacks)) return c;
        const present = new Set(stacks.map((st) => (isRecord(st) ? st['card'] : null)));
        let changed = false;
        const next = stacks.map((st) => {
          if (!isRecord(st) || typeof st['card'] !== 'string') return st;
          const to = V9_SCRIPT_SWAP[st['card']];
          if (!to || present.has(to)) return st;
          changed = true;
          return { ...st, card: to, isNew: !owns(to) };
        });
        return changed ? { ...c, contents: { ...contents, stacks: next } } : c;
      });
      doc.capsules = { ...doc.capsules, pending };
    }
    return { ...doc, v: 9 };
  },
};
