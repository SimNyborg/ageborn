/**
 * The roster shape per age (X0, CONTENT_PLAN 2-3): how many collectable units of each rarity, turrets of
 * each rarity, powers per slot and forts per kind each age holds. The schema reads these numbers instead
 * of a hard-coded 7 / 4 / 6 / 4, so each content wave (and later seasons) only edits this table.
 *
 * An age before its wave keeps the A17.13 shape (7 units: 3 C / 2 R / 1 E / 1 L; 4 turrets: 2 C / 1 R /
 * 1 E; 6 powers: 3 Home / 3 Field; 4 forts: one of each kind). An age after its wave holds 20 units
 * (8 C / 6 R / 4 E / 2 L), 6 turrets (3 C / 2 R / 1 E), 8 powers (4 Home / 4 Field) and 6 forts (two
 * variants of two kinds). Data only.
 */
import type { AgeId } from '@/contracts/ids';
import type { AgeRosterShape, RosterShape } from './types';

/** The A17.13 shape of an age before its content wave. */
const BEFORE: AgeRosterShape = {
  units: { common: 3, rare: 2, epic: 1, legendary: 1 },
  turrets: { common: 2, rare: 1, epic: 1 },
  powers: { home: 3, field: 3 },
  forts: { wall: 1, tower: 1, camp: 1, trap: 1 },
};

/** The shape after the wave, with that age's two fort variants (`forts` names the doubled kinds). */
function after(forts: AgeRosterShape['forts']): AgeRosterShape {
  return {
    units: { common: 8, rare: 6, epic: 4, legendary: 2 },
    turrets: { common: 3, rare: 2, epic: 1 },
    powers: { home: 4, field: 4 },
    forts,
  };
}

const shape: Record<AgeId, AgeRosterShape> = {
  // W1 (2026-10-02): Thorn Hedge (cheap wall) and Bone Watchtower (lob tower)
  stone: after({ wall: 2, tower: 2, camp: 1, trap: 1 }),
  bronze: BEFORE,
  medieval: BEFORE,
  gunpowder: BEFORE,
  industrial: BEFORE,
  modern: BEFORE,
  future: BEFORE,
  cosmic: BEFORE,
};

export const rosterShape: RosterShape = shape;
