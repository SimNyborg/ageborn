/**
 * Save version 13: seven troops per battle (owner request 2026-10-07; DESIGN A18.9, SIM_VERSION 7.4.0).
 *
 * - Every loadout of every War Plan (all presets, every age) gains a seventh unit slot. The save package
 *   may not read the content (B2), so the step adds an empty slot; `meta.fillNewTroopSlots` fills it once
 *   on the next load with the best owned eligible troop of that age not already in the loadout (or leaves
 *   it empty when there is none). A plan with an empty slot still plays (A3 needs 3 units).
 * - Nothing else changes; nothing is taken away. Replays keep their recorded loadouts.
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

/** Unit slots per loadout from v13 on (A18.9, owner request 2026-10-07). */
export const V13_UNIT_SLOTS = 7;

type Loadout = { units?: unknown };
type Doc = Record<string, unknown> & { v: number; warPlans?: { loadouts?: Record<string, Loadout> }[] };

function widen(l: Loadout): Loadout {
  if (!l || typeof l !== 'object') return l;
  const units = Array.isArray(l.units) ? [...(l.units as unknown[])] : [];
  while (units.length < V13_UNIT_SLOTS) units.push(null);
  return { ...l, units: units.slice(0, V13_UNIT_SLOTS) };
}

export const v13: SaveVersion = {
  v: 13,
  summary: 'Seven troops per battle: every War Plan loadout gets a seventh unit slot (A18.9)',
  up: (input) => {
    const doc = input as Doc;
    const warPlans = Array.isArray(doc.warPlans)
      ? doc.warPlans.map((p) => {
          if (!p || typeof p !== 'object') return p;
          const loadouts: Record<string, Loadout> = {};
          for (const [age, l] of Object.entries(p.loadouts ?? {})) loadouts[age] = widen(l);
          return { ...p, loadouts };
        })
      : doc.warPlans;
    return { ...doc, warPlans, v: 13 };
  },
};
