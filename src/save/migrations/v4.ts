/**
 * Save version 4: six troops per battle (DESIGN A18.9, A18.11; SIM_VERSION 3.0.0).
 *
 * - Every War Plan loadout gains a sixth unit slot. The save package may not read the content (B2), so
 *   the step adds an empty slot; `meta.fillNewTroopSlots` fills it from the owned cards of that age on
 *   the next load (a plan with an empty slot still plays: A3 needs 3 units).
 * - Nothing else changes: the Treasury was never saved, and replays keep their result cards (D8).
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

/** Unit slots per loadout from v4 on (A18.9). */
export const V4_UNIT_SLOTS = 6;

type Loadout = { units?: unknown };
type Doc = Record<string, unknown> & { v: number; warPlans?: { loadouts?: Record<string, Loadout> }[] };

function widen(l: Loadout): Loadout {
  const units = Array.isArray(l.units) ? [...(l.units as unknown[])] : [];
  while (units.length < V4_UNIT_SLOTS) units.push(null);
  return { ...l, units: units.slice(0, V4_UNIT_SLOTS) };
}

export const v4: SaveVersion = {
  v: 4,
  summary: 'Six troops per battle: every War Plan loadout gets a sixth unit slot (A18.9)',
  up: (input) => {
    const doc = input as Doc;
    const warPlans = Array.isArray(doc.warPlans)
      ? doc.warPlans.map((p) => {
          const loadouts: Record<string, Loadout> = {};
          for (const [age, l] of Object.entries(p.loadouts ?? {})) loadouts[age] = widen(l);
          return { ...p, loadouts };
        })
      : doc.warPlans;
    return { ...doc, warPlans, v: 4 };
  },
};
