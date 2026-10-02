/**
 * What a power card says about itself (DESIGN A2.9, A5.7; A2.9.10 dock tip, A2.9.10 Army tile and card
 * detail): its reach glyph, the cap ("Hits up to 5", "Your 8 frontmost units"), what it hits (ground,
 * air), a per-unit estimate against the age's L1 Infantry and Heavy Common (the family budgets of
 * A2.9.6, computed like the static per-power checks), and the family's counter line. Pure, shared by the
 * battle HUD and the Army screens; the words are i18n keys each caller maps.
 */
import type { CompiledContent, PowerDef, PowerFamily, UnitDef } from '@/contracts';

/** The 18 px reach glyph on a power button or tile (A2.9.10): house, flag, crosshair, banner, parachute. */
export type ReachGlyph = 'house' | 'flag' | 'crosshair' | 'banner' | 'parachute';

export function reachGlyph(def: Pick<PowerDef, 'reach' | 'effect'>): ReachGlyph {
  const k = def.effect.kind;
  if (k === 'strike') return 'crosshair';
  if (k === 'buffAll') return 'banner';
  if (k === 'paradrop') return 'parachute';
  if (def.reach === 'home') return 'house';
  return 'flag';
}

/**
 * The reach label key suffix (A2.9.4 "Player label"): home "Your half", front "Near your army",
 * fromFront "From your front" (charges and Suppress: no aim), anywhere, army "Your army", drop.
 */
export type ReachLabel = 'home' | 'front' | 'fromFront' | 'anywhere' | 'army' | 'drop' | 'lane';

export function reachLabel(def: Pick<PowerDef, 'reach' | 'effect'>): ReachLabel {
  const k = def.effect.kind;
  if (k === 'paradrop') return 'drop';
  if (k === 'stampede' || k === 'suppress') return 'fromFront';
  return def.reach;
}

/** The zone a power's aim covers (lu); 0 when it takes no aim or hits one unit. */
export function powerZoneOf(def: Pick<PowerDef, 'effect'>): number {
  const e = def.effect;
  switch (e.kind) {
    case 'barrage':
    case 'sweep':
    case 'field':
      return e.zone;
    case 'cloud':
      return e.width;
    case 'stampede':
      return e.distance;
    default:
      return 0;
  }
}

/** The cap as the player reads it: enemies hit (1-6), own units buffed (8), or none (drops, Suppress, clouds). */
export function powerCap(def: PowerDef): { n: number; own: boolean } | null {
  const e = def.effect;
  if (e.kind === 'buffAll') return { n: e.maxTargets, own: true };
  if (e.kind === 'strike') return { n: 1, own: false };
  if (e.kind === 'paradrop' || e.kind === 'suppress' || e.kind === 'cloud') return null;
  return def.maxTargets ? { n: def.maxTargets, own: false } : null;
}

/** Which targets a power's effect reaches (every power states air and ground, A2.9.6); null for own-unit effects. */
export function powerHits(def: PowerDef): { ground: boolean; air: boolean } | null {
  const e = def.effect;
  switch (e.kind) {
    case 'barrage':
      return { ground: e.hitsGround !== false, air: e.hitsAir };
    case 'sweep':
    case 'field':
    case 'strike':
      return { ground: true, air: e.hitsAir };
    case 'stampede':
      return { ground: true, air: false };
    case 'cloud':
      return { ground: true, air: true };
    default:
      return null;
  }
}

/** Damage one enemy takes at L1 if it stays for the whole effect (the family estimate of A2.9.6). */
export function perUnitDamage(def: PowerDef): number {
  const e = def.effect;
  switch (e.kind) {
    case 'barrage':
      // Coverage: count × 2 × radius ÷ zone hits per unit (an even spread over the zone).
      return e.zone > 0 ? Math.round((e.count * e.damage * 2 * e.radius) / e.zone) : 0;
    case 'sweep':
      return e.damage;
    case 'stampede':
      return e.damage * Math.min(e.runners, e.maxHitsPerEnemy);
    case 'field':
      return (e.damagePerPulse ?? 0) * Math.max(1, Math.trunc(e.durationMs / 500));
    case 'strike':
      return e.damage * e.shots;
    default:
      return 0;
  }
}

/** The age's L1 Infantry and Heavy Common (the per-unit yardsticks of A2.9.6), if the content has them. */
export function ageYardsticks(content: Pick<CompiledContent, 'units'>, age: string): { infantry: UnitDef | null; heavy: UnitDef | null } {
  const pick = (group: 'infantry' | 'heavy'): UnitDef | null =>
    Object.values(content.units).find((u) => !u.hidden && u.age === age && u.group === group && u.rarity === 'common') ?? null;
  return { infantry: pick('infantry'), heavy: pick('heavy') };
}

/** A unit's L1 hit points. */
function ehp(u: UnitDef): number {
  return u.hp;
}

/**
 * Per-unit estimate (A2.9.6): the share of an Infantry's and a Heavy's L1 HP one enemy loses if it
 * stays for the whole effect, whole percent (kills at ≥ 100). Null for powers without damage.
 */
export function perUnitShare(
  content: Pick<CompiledContent, 'units'>,
  def: PowerDef,
): {
  damage: number;
  infantryPct: number | null;
  heavyPct: number | null;
} | null {
  const damage = perUnitDamage(def);
  if (damage <= 0) return null;
  const y = ageYardsticks(content, def.age);
  const pct = (u: UnitDef | null) => (u && ehp(u) > 0 ? Math.round((damage * 100) / ehp(u)) : null);
  return { damage, infantryPct: pct(y.infantry), heavyPct: pct(y.heavy) };
}

/** Families that damage in an area (the ones a cap and the screen bound). */
export function areaFamily(f: PowerFamily): boolean {
  return f === 'bombard' || f === 'sweep' || f === 'charge' || f === 'frontBarrage';
}

/** Whole seconds of a power's reload. */
export function reloadSeconds(def: Pick<PowerDef, 'reloadMs'>): number {
  return Math.round(def.reloadMs / 1000);
}
