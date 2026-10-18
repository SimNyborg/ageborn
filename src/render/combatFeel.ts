/**
 * Combat feel helpers (queue item 38, A2-A5): hit tiers, the numeric option codes the combat effect recipes read,
 * the victim's material and body size. Pure; the event mapper and the battle view share them.
 *
 * The effect contract passes options as numbers (`createEffect(id, o?: Record<string, number>)`), so the string
 * options of the INTERFACE recipes travel as these codes (agreed with track U, which keeps a copy of the table in
 * `src/visuals/effects/combat.ts`).
 */
import type { DmgType, UnitDef } from '@/contracts';

/** Hit size tier (queue item 38 INTERFACE): the hit's share of the victim's max HP, or the killing blow. */
export type HitTier = 'light' | 'medium' | 'heavy' | 'kill';

export const TIER_CODE: Readonly<Record<HitTier, number>> = { light: 0, medium: 1, heavy: 2, kill: 3 };
/** `fx.contact_spark` `kind`: the damage type, or the victim's material when it has one. */
export const SPARK_KIND_CODE = { blunt: 0, slash: 1, pierce: 2, bullet: 3, metal: 4, wood: 5, laser: 6, blast: 7 } as const;
/** `fx.stuck` `kind`. */
export const STUCK_KIND_CODE = { arrow: 0, javelin: 1 } as const;
/** `fx.land_dust` and `fx.ground_glow` `size`. */
export const SIZE_CODE = { s: 0, m: 1, l: 2 } as const;

export type Material = 'metal' | 'wood';
export type BodySize = 's' | 'm' | 'l';

export interface TierRules {
  /** A hit of at least this share of the victim's max HP (bp) is medium; under it light. */
  mediumBp: number;
  /** At least this share is heavy (A12: 15%). */
  heavyBp: number;
}

export const TIER_DEFAULTS: TierRules = { mediumBp: 800, heavyBp: 1500 };

/** The hit's share of the victim's max HP in bp (0 when unknown). Shield-absorbed damage counts: a blow is a blow. */
export function shareBp(damage: number, maxHp: number): number {
  if (!(maxHp > 0) || !(damage > 0)) return 0;
  return Math.floor((damage * 10000) / maxHp);
}

/** The tier of a hit: the killing blow, else by its share of the victim's max HP (light under 8%, heavy 15%+). */
export function hitTier(damage: number, maxHp: number, killed: boolean, t: TierRules = TIER_DEFAULTS): HitTier {
  if (killed) return 'kill';
  const s = shareBp(damage, maxHp);
  if (s >= t.heavyBp) return 'heavy';
  if (s >= t.mediumBp) return 'medium';
  return 'light';
}

/** The tier a killing blow would have had by its share alone (a death's fling or crumple, U's `dieWith`). */
export function blowTier(damage: number, maxHp: number, t: TierRules = TIER_DEFAULTS): Exclude<HitTier, 'kill'> {
  return hitTier(damage, maxHp, false, t) as Exclude<HitTier, 'kill'>;
}

export interface MaterialRules {
  /** Victims with any of these tags ring as metal (armour, machines). */
  metalTags: readonly string[];
  /** Cards that answer as wood whatever their tags (wooden shields, siege engines and bodies). */
  woodCards: readonly string[];
  /** Cards that answer as metal whatever their tags (bronze and iron shields). */
  metalCards?: readonly string[];
  /** Beasts: what they leave when they fall is fur, bone and pebbles, never a helmet (`fx.bits` `mat` 2). */
  beastCards?: readonly string[];
}

/** `fx.bits` `mat`: what a fallen unit is made of (track U: 0 soldier, 1 machine, 2 beast). */
export function bitsMat(def: UnitDef | undefined, rules: MaterialRules): number {
  if (!def) return 0;
  if (def.tags.includes('mech')) return 1;
  if (rules.beastCards?.includes(def.id)) return 2;
  return 0;
}

/** What a hit on this victim sounds and sparks like beyond its damage type: metal, wood, or nothing. */
export function materialOf(def: UnitDef | undefined, rules: MaterialRules): Material | null {
  if (!def) return null;
  if (rules.woodCards.includes(def.id)) return 'wood';
  if (rules.metalCards?.includes(def.id)) return 'metal';
  if (def.tags.some((t) => rules.metalTags.includes(t))) return 'metal';
  return null;
}

/** `fx.contact_spark` `kind` for a hit: the victim's material when it has one (not for lasers and blasts), else the damage type. */
export function sparkKind(dmg: DmgType, material: Material | null): number {
  if (material && dmg !== 'laser' && dmg !== 'blast') return SPARK_KIND_CODE[material];
  return SPARK_KIND_CODE[dmg];
}

/** A body's size class for falls and dust: Legendaries and huge bodies large, Heavies, Epics and large bodies medium. */
export function bodySizeOf(def: UnitDef | undefined): BodySize {
  if (!def) return 's';
  if (def.group === 'legendary' || def.size === 'huge') return 'l';
  if (def.group === 'heavy' || def.group === 'epic' || def.size === 'large') return 'm';
  return 's';
}

/** A heavy body (U's `dieWith` `heavy`): Heavies, Epics, Legendaries and large or huge bodies. */
export function heavyBody(def: UnitDef | undefined): boolean {
  return bodySizeOf(def) !== 's';
}

/** A 31-bit seed from match data (unit ids, ticks), so a replay draws the same pieces (never `Math.random`). */
export function matchSeed(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    let v = Math.trunc(p) | 0;
    for (let i = 0; i < 4; i++) {
      h ^= v & 0xff;
      h = Math.imul(h, 0x01000193);
      v >>>= 8;
    }
  }
  return (h >>> 1) & 0x3fffffff;
}

/** The hit-stop of a hit in ms ([attacker, victim]) by tier, longer for heavy hits and kills by the hit's share. */
export interface HitstopRules {
  melee: Readonly<Record<HitTier, readonly [number, number]>>;
  ranged: Readonly<Record<HitTier, readonly [number, number]>>;
  /** Heavy hits and kills: the victim's hit-stop grows from its base at `shareFromBp` to `shareMaxMs` at `shareToBp`. */
  shareFromBp: number;
  shareToBp: number;
  shareMaxMs: number;
}

export const HITSTOP_DEFAULTS: HitstopRules = {
  melee: { light: [35, 50], medium: [40, 55], heavy: [45, 70], kill: [50, 90] },
  ranged: { light: [0, 0], medium: [0, 0], heavy: [0, 60], kill: [0, 80] },
  shareFromBp: 1500,
  shareToBp: 5000,
  shareMaxMs: 110,
};

/** The combat block of the feel config's tuning (`tuning.combat`, queue item 38 A2-A6). */
export interface CombatTuning {
  tiers: TierRules;
  hitstop: HitstopRules;
  /** One directional kick per this many ms (the strongest of a burst wins). */
  kickGapMs: number;
  /** A sim knockback's drawn travel (ms, ease-out) and its hop height (lu) by distance: share of |dx|, clamped. */
  knockMs: number;
  knockLift: { share: number; minLu: number; maxLu: number };
  materials: MaterialRules;
  /** Deaths with weight (A4): how long the body lies and fades (U's `dieWith`), the slide along the blow per tier (lu). */
  death: { lieMs: number; fadeMs: number; slideLu: Readonly<Record<Exclude<HitTier, 'kill'>, number>>; heavySlideShare: number; slideMs: number; lingerMs: number };
  /** A5: the spark a plain blow shows at its contact point (an effective or resisted hit keeps its counter spark). */
  contactSpark?: { effectId: string };
  /** A5: projectiles that stick in what they hit (`fx.stuck` kinds) by their visual id. */
  stuck?: { arrow: readonly string[]; javelin: readonly string[] };
  /** A4: how many bits a fallen body leaves by its size class (`fx.bits` `count`). */
  bits?: Readonly<Record<BodySize, number>>;
}

export const COMBAT_DEFAULTS: CombatTuning = {
  tiers: TIER_DEFAULTS,
  hitstop: HITSTOP_DEFAULTS,
  kickGapMs: 120,
  knockMs: 220,
  knockLift: { share: 0.3, minLu: 6, maxLu: 14 },
  materials: { metalTags: ['armored', 'mech'], woodCards: [] },
  death: { lieMs: 2000, fadeMs: 600, slideLu: { light: 10, medium: 16, heavy: 24 }, heavySlideShare: 0.55, slideMs: 380, lingerMs: 4000 },
};

export function hitstopFor(tier: HitTier, melee: boolean, share: number, r: HitstopRules = HITSTOP_DEFAULTS): { attacker: number; victim: number } {
  const [attacker, victim] = (melee ? r.melee : r.ranged)[tier];
  if ((tier !== 'heavy' && tier !== 'kill') || victim <= 0) return { attacker, victim };
  const k = Math.max(0, Math.min(1, (share - r.shareFromBp) / Math.max(1, r.shareToBp - r.shareFromBp)));
  return { attacker, victim: Math.round(Math.max(victim, victim + (r.shareMaxMs - victim) * k)) };
}
