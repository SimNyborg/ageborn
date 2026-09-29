/**
 * What a power aimed at a point would do (DESIGN A2.9.4-A2.9.7, A2.9.10 targeting): the reach band the
 * zone centre may take, the eligible enemies (the screen: the first `maxTargets` nearest your gate in
 * the reach area, numbered 1..N), which of them the zone covers, the enemies in the zone that the cap
 * or the hard mask leave untouched, and a strike's lock. It uses the same pure helpers as the sim
 * (`core/powerReach.ts`), so the ghost's promise matches the cast. Positions are own-side lu.
 *
 * The pips are a prediction: units move, and barrage jitter can change who is hit (A2.9.5).
 */
import type { EconomyRules, PowerDef } from "@/contracts";
import {
  capCompare,
  clampToBand,
  eligibleIds,
  frontP,
  powerReachRules,
  reachAreaMax,
  reachBand,
  strikePick,
  type PowerReachRules,
} from "@/core/powerReach";

/** A unit as the preview sees it: `p` in the caster's own frame (lu). */
export interface PreviewUnit {
  id: number;
  /** True for the caster's own units. */
  own: boolean;
  p: number;
  air: boolean;
  summoned: boolean;
  leaping: boolean;
  /** Card cost (strike tie-break). */
  cost: number;
  /** Body half-width, lu (charges touch a body overlapping the run). */
  half: number;
}

/** Past the band's far edge an aim sticks to the edge for this much overshoot (lu), A2.9.10 step 3. */
export const EDGE_STICK_LU = 120;
/** The A2.1 aim clamp. */
const AIM_MIN = 150;
const AIM_MAX = 1850;

/** The zone width a power's aim covers (lu): 0 for powers that take no aim or target one unit. */
export function powerZoneWidth(def: PowerDef): number {
  const e = def.effect;
  switch (e.kind) {
    case "barrage":
    case "sweep":
    case "field":
      return e.zone;
    case "cloud":
      return e.width;
    default:
      return 0;
  }
}

/** Whether the player places this power (area powers and strikes); the rest act without an aim. */
export function powerTakesAim(def: PowerDef): boolean {
  const k = def.effect.kind;
  return (
    k === "barrage" ||
    k === "sweep" ||
    k === "field" ||
    k === "cloud" ||
    k === "strike"
  );
}

/** Reach rules in lu. */
export function reachRulesLu(e: EconomyRules): PowerReachRules {
  return powerReachRules(e, 1);
}

/** The caster's front F (A2.9.4) from its own units. */
export function previewFront(
  units: readonly PreviewUnit[],
  rules: PowerReachRules,
): number | null {
  return frontP(
    units
      .filter((u) => u.own)
      .map((u) => ({
        id: u.id,
        p: u.p,
        air: u.air,
        summoned: u.summoned,
        leaping: u.leaping,
      })),
    rules.frontRank,
  );
}

/** The legal zone centres now [min, max] (own-side lu), or null for powers that take no aim. */
export function previewBand(
  def: PowerDef,
  front: number | null,
  rules: PowerReachRules,
): [number, number] | null {
  if (!powerTakesAim(def)) return null;
  if (def.effect.kind === "strike") return [rules.zoneMin, rules.zoneMax];
  return reachBand(def.reach, powerZoneWidth(def), front, rules);
}

/**
 * Resolves a raw aim against the band (A2.9.10): inside it as it is, below it clamped, up to
 * `EDGE_STICK_LU` past the far edge stuck to the edge (valid), beyond that out of reach.
 */
export function resolveAim(
  raw: number,
  band: readonly [number, number] | null,
): { p: number; inReach: boolean; edge: boolean } {
  const lane = Math.round(Math.min(AIM_MAX, Math.max(AIM_MIN, raw)));
  if (!band) return { p: lane, inReach: true, edge: false };
  if (raw <= band[0])
    return { p: Math.round(band[0]), inReach: true, edge: false };
  if (raw <= band[1]) return { p: Math.round(raw), inReach: true, edge: false };
  if (raw <= band[1] + EDGE_STICK_LU)
    return { p: Math.round(band[1]), inReach: true, edge: true };
  return { p: lane, inReach: false, edge: false };
}

/** Which enemies an effect may touch (A2.9.6: every power states air and ground). */
function touches(def: PowerDef, air: boolean): boolean {
  const fx = def.effect;
  switch (fx.kind) {
    case "barrage":
      return air ? fx.hitsAir : fx.hitsGround !== false;
    case "sweep":
    case "field":
    case "strike":
      return air ? fx.hitsAir : true;
    case "stampede":
      return !air;
    case "cloud":
      return true;
    default:
      return false;
  }
}

export interface PreviewTargets {
  /** Eligible enemy ids in cap order: pip k is `eligible[k - 1]`. */
  eligible: number[];
  /** Eligible ids the zone (or the run) covers now. */
  covered: Set<number>;
  /** Enemies inside the zone that the cap or the hard mask leave untouched ("not hit"). */
  notHit: number[];
  /** A strike's locked unit (the eligible enemy nearest the aim within the pick range), else null. */
  lock: number | null;
  /** The reach area's far bound (own-side lu): the Home line for Home powers. */
  areaMax: number;
  /** The run of a charge [from, to] (own-side lu), else null. */
  run: [number, number] | null;
}

/**
 * The prediction for a power aimed at `aimP` (own-side lu; ignored by powers without an aim). `front`
 * is the caster's F. Buffs, drops and Suppress touch no enemy: empty lists.
 */
export function previewTargets(
  def: PowerDef,
  units: readonly PreviewUnit[],
  aimP: number,
  front: number | null,
  rules: PowerReachRules,
  fallbackP = 200,
): PreviewTargets {
  const fx = def.effect;
  const empty: PreviewTargets = {
    eligible: [],
    covered: new Set(),
    notHit: [],
    lock: null,
    areaMax: rules.lane,
    run: null,
  };
  const enemies = units.filter((u) => !u.own && touches(def, u.air));
  if (fx.kind === "strike") {
    const cands = enemies.map((u) => ({
      id: u.id,
      p: u.p,
      cost: u.cost,
      hp: 1,
      epic: false,
      legendary: false,
    }));
    const lock = strikePick(
      cands,
      clampToBand(aimP, [rules.zoneMin, rules.zoneMax]),
      rules.strikePick,
    );
    return {
      ...empty,
      eligible: lock === null ? [] : [lock],
      covered: new Set(lock === null ? [] : [lock]),
      lock,
    };
  }
  if (fx.kind === "stampede") {
    const start = front ?? fallbackP;
    const run: [number, number] = [start, start + fx.distance];
    const inArea = enemies.filter(
      (u) => u.p + u.half >= run[0] && u.p - u.half <= run[1],
    );
    const elig = eligibleIds(inArea, def.maxTargets ?? inArea.length, []);
    const eligible = inArea
      .filter((u) => elig.has(u.id))
      .sort(capCompare)
      .map((u) => u.id);
    return {
      ...empty,
      eligible,
      covered: new Set(eligible),
      notHit: inArea.filter((u) => !elig.has(u.id)).map((u) => u.id),
      run,
    };
  }
  if (
    fx.kind !== "barrage" &&
    fx.kind !== "sweep" &&
    fx.kind !== "field" &&
    fx.kind !== "cloud"
  )
    return empty;
  const zone = powerZoneWidth(def);
  const band = reachBand(def.reach, zone, front, rules) ?? [
    rules.zoneMin,
    rules.zoneMax,
  ];
  const areaMax = reachAreaMax(def.reach, zone, band, rules);
  const half = zone / 2;
  const inZone = (u: PreviewUnit): boolean => Math.abs(u.p - aimP) <= half;
  if (fx.kind === "cloud") {
    const covered = enemies.filter(inZone).map((u) => u.id);
    return { ...empty, eligible: covered, covered: new Set(covered), areaMax };
  }
  const inArea = enemies.filter((u) => u.p >= 0 && u.p <= areaMax);
  const cap = def.maxTargets ?? inArea.length;
  const elig = eligibleIds(inArea, cap, []);
  const eligible = inArea
    .filter((u) => elig.has(u.id))
    .sort(capCompare)
    .map((u) => u.id);
  const covered = new Set(
    inArea.filter((u) => elig.has(u.id) && inZone(u)).map((u) => u.id),
  );
  const notHit = enemies
    .filter((u) => inZone(u) && !covered.has(u.id))
    .map((u) => u.id);
  return { eligible, covered, notHit, lock: null, areaMax, run: null };
}
