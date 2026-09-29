/**
 * War Plan validation and the deck advisor (DESIGN A3).
 *
 * Errors (the plan cannot be played in this format): a loadout needs at least 3 units and 1 turret
 * in every age the format uses; every card must be owned, from that age, and in one slot only; the
 * power must be an owned power of that age. Warnings never block: "Stone has no anti-armor",
 * "Modern cannot hit air" (from Gunpowder on, no air-hitting unit or turret), "Medieval has only 3
 * units", "No splash anywhere: swarms will hurt" (no area attack in any unit or turret of the plan).
 *
 * Findings name only the ages the format uses. Message keys are WP9's `ui.advisor.*` strings, read
 * with `{ age }` (docs/requests/wp9-advisor-keys.md).
 */
import type { AgeId, AttackDef, CardId, FormatId, PlanIssue, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { cardDef, isOwned } from './tables';

export type WarPlan = SaveDoc['warPlans'][number];

export type PlanIssueCode =
  | 'badShape'
  | 'unknownCard'
  | 'wrongAge'
  | 'notOwned'
  | 'duplicate'
  | 'badPower'
  | 'tooFewUnits'
  | 'noTurret'
  | 'onlyThreeUnits'
  | 'noAntiArmor'
  | 'noAir'
  | 'noSplash';

/** Minimum units and turrets per age used by the format (A3 "Minimum to play"). */
export const MIN_UNITS = 3;
export const MIN_TURRETS = 1;
/** Loadout shape (B15 `Loadout`: 6 unit slots from A18.9, and 2 turret slots). */
export const UNIT_SLOTS = 6;
export const TURRET_SLOTS = 2;

function issue(age: AgeId, severity: PlanIssue['severity'], code: PlanIssueCode): PlanIssue {
  return { age, severity, code, messageKey: `ui.advisor.${code}` };
}

/** Every attack a card makes, riders included. */
export function attacksOf(t: Content, id: CardId): AttackDef[] {
  const u = t.units[id];
  if (u) return [...u.attacks, ...u.abilities.flatMap((a) => (a.kind === 'riders' ? [a.attack] : []))];
  const tu = t.turrets[id];
  return tu ? [tu.attack] : [];
}

export function hitsAir(t: Content, id: CardId): boolean {
  return attacksOf(t, id).some((a) => a.hitsAir);
}

/** An attack that hits more than one enemy: splash, cleave, chain, pierce, lines and gate zones. */
export function hasAreaAttack(t: Content, id: CardId): boolean {
  return attacksOf(t, id).some(
    (a) => (a.splashRadius ?? 0) > 0 || !!a.cleave || !!a.chain || !!a.pierce || !!a.line || !!a.gateZone || a.followBehind !== undefined,
  );
}

/** Findings for one War Plan in one format (A3). */
export function validatePlan(plan: WarPlan, s: SaveDoc, t: Content, format: FormatId): PlanIssue[] {
  const ages = t.formats[format]?.ages ?? [];
  const out: PlanIssue[] = [];
  let splash = false;
  for (const age of ages) {
    const l = plan.loadouts[age];
    if (!l) {
      out.push(issue(age, 'error', 'tooFewUnits'), issue(age, 'error', 'noTurret'));
      continue;
    }
    if (l.units.length !== UNIT_SLOTS || l.turrets.length !== TURRET_SLOTS) out.push(issue(age, 'error', 'badShape'));
    const units = l.units.filter((c): c is CardId => c !== null);
    const turrets = l.turrets.filter((c): c is CardId => c !== null);
    const seen = new Set<CardId>();
    const bad = new Set<PlanIssueCode>();
    for (const [id, kind] of [...units.map((u) => [u, 'unit'] as const), ...turrets.map((u) => [u, 'turret'] as const)]) {
      const def = cardDef(t, id);
      if (!def || def.kind !== kind || (def.kind === 'unit' && def.hidden)) bad.add('unknownCard');
      else if (def.age !== age) bad.add('wrongAge');
      else if (!isOwned(s, id)) bad.add('notOwned');
      if (seen.has(id)) bad.add('duplicate');
      seen.add(id);
    }
    const power = t.powers[l.power];
    if (!power || power.age !== age || !s.powersOwned.includes(l.power)) bad.add('badPower');
    for (const code of bad) out.push(issue(age, 'error', code));
    if (units.length < MIN_UNITS) out.push(issue(age, 'error', 'tooFewUnits'));
    if (turrets.length < MIN_TURRETS) out.push(issue(age, 'error', 'noTurret'));
    if (units.length === MIN_UNITS) out.push(issue(age, 'warning', 'onlyThreeUnits'));
    if (!units.some((id) => t.units[id]?.group === 'antiArmor')) out.push(issue(age, 'warning', 'noAntiArmor'));
    const airAge = t.ages[age].index >= t.ages.gunpowder.index;
    if (airAge && ![...units, ...turrets].some((id) => hitsAir(t, id))) out.push(issue(age, 'warning', 'noAir'));
    if ([...units, ...turrets].some((id) => hasAreaAttack(t, id))) splash = true;
  }
  const first = ages[0];
  if (first && !splash) out.push(issue(first, 'warning', 'noSplash'));
  return out;
}

/** True when the plan has no errors in this format (warnings allowed). */
export function isPlayable(plan: WarPlan, s: SaveDoc, t: Content, format: FormatId): boolean {
  return !validatePlan(plan, s, t, format).some((i) => i.severity === 'error');
}
