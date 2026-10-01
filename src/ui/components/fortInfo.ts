/**
 * Fort facts shared by the battle HUD's tip and Card detail (DESIGN A16.14.7): the key numbers and the
 * trait lines of a Fort card, as i18n keys and plain strings. Pure.
 */
import type { AgeId, CompiledContent, FortDef } from '@/contracts';

type T = (key: string, params?: Record<string, string | number>) => string;

/** The key numbers of a fort for the tip: HP, a tower's range, a camp's levies, a trap's charges. */
export function fortNumbers(c: { t: T }, def: FortDef): string[] {
  const t = c.t;
  const out: string[] = [];
  if (def.hp > 0) out.push(`${t('fort.stat.hp')} ${def.hp}`);
  if (def.attack) out.push(`${t('fort.stat.range')} ${def.attack.range}`);
  if (def.camp) {
    out.push(t('fort.stat.levyEvery', { s: Math.round(def.camp.everyMs / 1000) }));
    out.push(t('fort.stat.levyMax', { n: def.camp.maxAlive }));
  }
  if (def.trap) out.push(`${t('fort.stat.charges')} ${def.trap.charges}`);
  return out;
}

/** Whether the age has a Suppress power (Medieval, Future): only there does a tower list "Suppress silences it". */
export function ageHasSuppress(content: Pick<CompiledContent, 'powers'>, age: AgeId): boolean {
  return Object.values(content.powers).some((p) => p.age === age && p.effect.kind === 'suppress');
}

/**
 * The kind's trait lines (A16.14.7 tip), as `fort.trait.*` keys: cover, regen, Suppress (towers, in an
 * age that has it), levies or the trap's visibility first, then the shared lines (Heavies ×2, crumbling,
 * never hit by powers).
 */
export function fortTraits(def: FortDef, withSiege = false, suppress = true): string[] {
  const out: string[] = [];
  if (def.cover) out.push('fort.trait.cover');
  if (def.regen) out.push('fort.trait.regen');
  if (def.fortKind === 'tower' && suppress) out.push('fort.trait.silenced');
  if (def.fortKind === 'camp') out.push('fort.trait.levyMarch');
  if (def.fortKind === 'trap') out.push('fort.trait.trapVisible');
  if (def.fortKind !== 'trap') out.push('fort.trait.heavyX2');
  out.push('fort.trait.decay');
  if (withSiege) out.push('fort.trait.siege');
  out.push('fort.trait.powerImmune');
  return out;
}
