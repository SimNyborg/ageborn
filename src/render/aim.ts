/**
 * Queue item 44: ranged weapons that point where they shoot. Pure aim maths for the battle view (presentation only:
 * the sim decides only `arc` and the travel time, and every shot still lands where and when the sim says).
 *
 * A shot's path starts along the drawn weapon. The shooter's view reports the angle its weapon is drawn at (degrees
 * above the facing direction on screen) and how far its body may lean; the battle view leans it toward the line to
 * the target and picks the path:
 * - **direct** shots (bullets, lasers, beams, fast plasma) fly straight, so the shooter leans until the barrel points
 *   down the line (as far as its body allows; the rest is the art round's);
 * - **ballistic** shots (arrows, bolts, javelins, rocks, shells, rockets, flares, lobs, bombs) fly a parabola that
 *   leaves along the weapon when it points above the target, and straight when it points at or below it, so only a
 *   weapon drawn below the line makes the shooter lean (up);
 * - **arc** shots (the sim's `arc`) are ballistic and keep at least `ARC_MIN_LOFT_DEG` over the line, so they still
 *   read as lobbed over the front.
 * An attack variant the shot cannot match (a level pose for an arc, a raised staff at a unit in front) gives way to
 * the variant that fits best; otherwise the view's own variant cycle plays.
 */
import type { AttackDef, Pt, UnitDef } from '@/contracts';

export type ShotKind = 'direct' | 'ballistic' | 'arc';
export type ShotPath = 'straight' | 'ballistic';

/** A travelling shot at least this fast (lu/s) flies flat enough to count as direct (bullets 1500, lasers 1800). */
export const DIRECT_MIN_SPEED = 1400;
/** An arc leaves at least this far over the line to its target (deg), so it reads as lobbed. */
export const ARC_MIN_LOFT_DEG = 30;
/** An arc whose weapon ends up flatter still leaves at least this far over the line (deg). */
export const ARC_FLOOR_DEG = 8;
/**
 * The steepest launch an aimed path takes (deg; matches the views' `MAX_LAUNCH_DEG`): a steeper weapon (a flare pistol
 * fired straight up) would need a path far longer than the sim's flight time allows, and its peak would leave a phone's
 * view, so such a variant gives way to one that fits.
 */
export const MAX_LAUNCH_DEG = 70;
/** Leans smaller than this (deg) are not worth a tilt. */
export const LEAN_DEADBAND_DEG = 1.5;
/** A variant whose shortfall is within this (deg) still plays in its turn. */
export const VARIANT_SLACK_DEG = 3;
/** And another variant must fit at least this much better (deg) to take its turn. */
export const VARIANT_GAIN_DEG = 4;
/** A target less than this far in front of the muzzle (lu) gets no aimed path (it is right under or behind the weapon). */
export const MIN_AIM_DX_LU = 8;

/** How an attack's shot flies, from its content (null for melee). */
export function shotKindOf(atk: AttackDef | undefined): ShotKind | null {
  const p = atk?.projectile;
  if (!atk || !p) return null;
  if ('instant' in p) return 'direct';
  if (p.arc === true) return 'arc';
  if (atk.dmgType === 'bullet' || atk.dmgType === 'laser' || p.speed >= DIRECT_MIN_SPEED) return 'direct';
  return 'ballistic';
}

/** The angle (deg above the facing direction) of the line from `from` to `to`, screen y down; null when the target is not in front. */
export function lineDeg(from: Pt, to: Pt, facing: 1 | -1): number | null {
  return lineDegXY(from.x, from.y, to.x, to.y, facing);
}

/** `lineDeg` on plain numbers (no allocation, for the per-frame aim). */
export function lineDegXY(fx: number, fy: number, tx: number, ty: number, facing: 1 | -1): number | null {
  const dx = (tx - fx) * facing;
  if (!(dx >= MIN_AIM_DX_LU)) return null;
  return (Math.atan2(fy - ty, dx) * 180) / Math.PI;
}

/**
 * The lean (deg, aim up positive) that turns a weapon drawn at `drawnDeg` toward a shot whose line to the target is
 * `lineAt`, at most `maxLean` either way.
 */
export function leanFor(kind: ShotKind, lineAt: number, drawnDeg: number, maxLean: number): number {
  if (!(maxLean > 0)) return 0;
  let want: number;
  if (kind === 'direct') want = lineAt - drawnDeg;
  else if (kind === 'ballistic') want = Math.max(0, lineAt - drawnDeg);
  else want = Math.max(0, lineAt + ARC_MIN_LOFT_DEG - drawnDeg);
  if (Math.abs(want) < LEAN_DEADBAND_DEG) return 0;
  return Math.max(-maxLean, Math.min(maxLean, want));
}

/**
 * The path of a shot whose weapon points `launchDeg` (drawn and leaned, deg above the facing direction) at a target
 * `lineAt` away: straight for direct shots and for a weapon at or below the line; else a parabola leaving at the
 * weapon's angle (an arc keeps at least a little loft).
 */
export function pathFor(kind: ShotKind, lineAt: number, launchDeg: number): { path: ShotPath; launchDeg: number } {
  if (kind === 'direct') return { path: 'straight', launchDeg: lineAt };
  if (kind === 'arc') return { path: 'ballistic', launchDeg: Math.min(MAX_LAUNCH_DEG, Math.max(launchDeg, lineAt + ARC_FLOOR_DEG)) };
  if (launchDeg > lineAt + 0.5) return { path: 'ballistic', launchDeg: Math.min(MAX_LAUNCH_DEG, launchDeg) };
  return { path: 'straight', launchDeg: lineAt };
}

/**
 * How far (deg) a variant drawn at `deg` falls short of what the shot needs after the lean; 0 when it can start it. A
 * ballistic or arc shot leans only up (`leanFor`), so a weapon drawn steeper than any path takes stays too steep.
 */
export function variantShortfall(kind: ShotKind, lineAt: number, deg: number, maxLean: number): number {
  const lean = Math.max(0, maxLean);
  if (kind === 'direct') return Math.max(0, Math.abs(lineAt - deg) - lean);
  const need = kind === 'arc' ? lineAt + ARC_MIN_LOFT_DEG : lineAt;
  return Math.max(0, need - lean - deg, deg - MAX_LAUNCH_DEG);
}

export interface AimVariant {
  anim: string;
  deg: number;
  omni: boolean;
}

/**
 * The attack variant to play for this shot: null keeps the view's own cycle (its next variant can start the shot, or
 * no other fits clearly better); else the variant that fits best.
 */
export function pickAimVariant(variants: readonly AimVariant[], next: string | null, kind: ShotKind, lineAt: number, maxLean: number): string | null {
  if (!next || variants.length < 2) return null;
  const cur = variants.find((v) => v.anim === next);
  if (!cur || cur.omni) return null;
  const short = variantShortfall(kind, lineAt, cur.deg, maxLean);
  if (short <= VARIANT_SLACK_DEG) return null;
  let best: AimVariant | null = null;
  let bestShort = short;
  for (const v of variants) {
    if (v.omni || v.anim === next) continue;
    const s = variantShortfall(kind, lineAt, v.deg, maxLean);
    if (s < bestShort) {
      best = v;
      bestShort = s;
    }
  }
  return best && bestShort + VARIANT_GAIN_DEG <= short ? best.anim : null;
}

/** The attack behind a shot of `attackIndex`: the unit's own, else (past them) its riders' (ANIM_SPEC R3). */
export function attackAt(def: UnitDef | undefined, attackIndex: number): AttackDef | undefined {
  if (!def) return undefined;
  if (attackIndex < def.attacks.length) return def.attacks[attackIndex];
  for (const ab of def.abilities) if (ab.kind === 'riders') return ab.attack;
  return undefined;
}

/** Is `visualId` the shot of this attack (its projectile or instant effect)? A call strike's shell is not. */
export function firesVisual(atk: AttackDef | undefined, visualId: string): boolean {
  const p = atk?.projectile;
  return p !== undefined && ('instant' in p ? p.effectId === visualId : p.visualId === visualId);
}

/** A unit view that can say which way its weapon points now (the atlas unit view's `aimNow`, duck-typed). */
export interface AimSource {
  aimNow?(attackIndex?: number): { deg: number; omni: boolean } | null;
}

/**
 * The aimed flight of a shot from `from` to `to`: leaving along the shooter's drawn weapon (`pathFor`), or null to
 * keep the view's own flight (a view without `aimNow`, an emitter without a direction, a shot that is not the
 * attack's own, a target not in front).
 */
export function aimedPath(view: unknown, atk: AttackDef | undefined, visualId: string, attackIndex: number, from: Pt, to: Pt, facing: 1 | -1): { launchDeg: number; path: ShotPath } | null {
  if (!firesVisual(atk, visualId)) return null;
  const kind = shotKindOf(atk);
  const now = (view as AimSource | null | undefined)?.aimNow?.(attackIndex);
  if (!kind || !now || now.omni) return null;
  const lineAt = lineDeg(from, to, facing);
  return lineAt === null ? null : pathFor(kind, lineAt, now.deg);
}
