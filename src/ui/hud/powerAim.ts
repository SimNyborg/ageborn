/**
 * The Age Power input state machine (DESIGN A2.9 Casting, A2.12, A17.6; owner decision "Age Power
 * targeting"). Pure: the power button feeds it pointer and key events, it answers with the next state
 * and one effect for the button to carry out (preview, sound, command).
 *
 * - **Drag is the primary interaction.** Pressing the ready button and moving past `POWER_DRAG_PX`
 *   picks the power up; releasing over the lane (or the minimap) fires it there. Releasing over the
 *   HUD, a cancelled pointer or Escape puts it back.
 * - **A tap enters aiming mode** (the ghost appears at the front) instead of firing blind: a tap on the
 *   field fires there, a second tap on the button (or Escape) cancels. A drag from the button while
 *   aiming picks it up as usual.
 * - A power that picks its own spot (Stampede, Paratroopers, Royal Decree, ...) works the same way,
 *   but a drop or a field tap anywhere on the lane casts it without an aim (the ghost shows where it
 *   will act). A press on a power that is not ready asks for the (denied) command, so the button
 *   shakes as before. The keyboard (Space, Enter on the focused button) auto-aims.
 */
import type { PowerReach } from '@/contracts';
import { POWER_DRAG_PX } from './model';

/** What the pointer is over. `minimap` counts as the lane (A17.6: a power can be dropped on it). */
export type AimOver = 'lane' | 'minimap' | 'hud' | 'off';

export interface AimTarget {
  /** Own-side progress p (lu), resolved against the reach band; null when the pointer is not over the lane. */
  p: number | null;
  over: AimOver;
  /**
   * False when the point is beyond the power's reach (A2.9.4: "Only in your half"): the ghost turns red
   * and hatched, and a drop there puts the power back. Absent = within reach.
   */
  inReach?: boolean;
  /** The aim sticks to the band's edge (the magnetic edge, A2.9.10 step 3). */
  edge?: boolean;
}

export const NO_AIM: AimTarget = { p: null, over: 'off' };

/** A drop here fires the power. */
export function aimValid(a: AimTarget): boolean {
  return a.p !== null && (a.over === 'lane' || a.over === 'minimap') && a.inReach !== false;
}

/**
 * Past the band's far edge the ghost sticks to the edge for this much overshoot (lu) and stays valid
 * (A2.9.10 step 3, the magnetic edge); beyond it the aim is out of reach.
 */
export const EDGE_STICK_LU = 120;

/** The A2.1 aim clamp: a zone centre is never nearer a gate than this (lu). */
export const LANE_AIM_MIN = 150;
export const LANE_AIM_MAX = 1850;

/** Where a slot's power may land now (from the view: the band follows your front live). */
export interface AimBand {
  reach: PowerReach;
  /** Legal zone centres [min, max], own-side lu; null for powers that take no aim (the whole lane casts). */
  band: readonly [number, number] | null;
}

/**
 * Resolves a raw lane point (own-side lu) against a reach band (A2.9.4, A2.9.10): inside the band it is
 * used as it is; below it (toward your gate) it clamps; up to `EDGE_STICK_LU` past the far edge it
 * sticks to the edge and stays valid; beyond that it is out of reach (the ghost shows where the pointer
 * is, red). Powers without an aim (charges, drops, buffs, Suppress) are valid anywhere on the lane.
 */
export function resolveAim(raw: number, b: AimBand | null): { p: number; inReach: boolean; edge: boolean } {
  const lane = Math.round(Math.min(LANE_AIM_MAX, Math.max(LANE_AIM_MIN, raw)));
  const band = b?.band ?? null;
  if (!band) return { p: lane, inReach: true, edge: false };
  const [min, max] = band;
  if (raw <= min) return { p: Math.round(min), inReach: true, edge: false };
  if (raw <= max) return { p: Math.round(raw), inReach: true, edge: false };
  if (raw <= max + EDGE_STICK_LU) return { p: Math.round(max), inReach: true, edge: true };
  return { p: lane, inReach: false, edge: false };
}

export type PowerAimState =
  | { s: 'idle' }
  /** A press on the button that has not moved far enough to be a drag yet. */
  | { s: 'pressed'; id: number; x: number; y: number; ready: boolean; aimable: boolean; wasAiming: boolean; aim: AimTarget }
  /** The power follows the pointer. `last` is the last lane point, kept for the ghost while over the HUD. */
  | { s: 'dragging'; id: number; aimable: boolean; aim: AimTarget; last: number | null }
  /** Tap-to-aim: the ghost waits on the field; `field` is the pointer pressed on the field, if any. */
  | { s: 'aiming'; aimable: boolean; aim: AimTarget; field: number | null };

export type PowerAimEvent =
  | { e: 'down'; id: number; x: number; y: number; ready: boolean; aimable: boolean }
  | { e: 'move'; id: number; x: number; y: number; aim: AimTarget }
  | { e: 'up'; id: number; aim: AimTarget }
  /** Pointer events on the field while aiming (a mouse hover moves the ghost too). */
  | { e: 'fieldDown'; id: number; aim: AimTarget }
  | { e: 'fieldMove'; id: number; aim: AimTarget }
  | { e: 'fieldUp'; id: number; aim: AimTarget }
  /** Where the ghost starts in aiming mode (the front), set right after the `aim` effect. */
  | { e: 'aimAt'; aim: AimTarget }
  /** Escape, a cancelled pointer, the power no longer ready, the match ended. */
  | { e: 'cancel' };

export type PowerAimEffect =
  | { k: 'none' }
  /** The power was picked up (sound, haptic). */
  | { k: 'pickup' }
  /** Aiming mode started: show the ghost at the front. */
  | { k: 'aim' }
  /** Issue the power command; `p` undefined = auto-aim (the sim's `densest` scan). */
  | { k: 'fire'; p?: number }
  /** A drag or aiming mode ended without a cast. */
  | { k: 'cancel' };

export interface PowerAimStep {
  state: PowerAimState;
  effect: PowerAimEffect;
}

export const AIM_IDLE: PowerAimState = { s: 'idle' };
const NONE: PowerAimEffect = { k: 'none' };

function stay(state: PowerAimState): PowerAimStep {
  return { state, effect: NONE };
}

/** True while the ghost (or the dragged power) is out and Escape should cancel it. */
export function aimActive(s: PowerAimState): boolean {
  return s.s === 'dragging' || s.s === 'aiming' || (s.s === 'pressed' && s.wasAiming);
}

/** The p the ghost shows and whether a drop there would fire (null p = no ghost). */
export function ghostOf(s: PowerAimState): { p: number | null; valid: boolean } {
  switch (s.s) {
    case 'dragging':
      // Out of reach: the ghost follows the pointer, red (A2.9.10 step 4); over the HUD it stays at the
      // last lane point, red ("Release to cancel").
      if (s.aim.p !== null && s.aim.inReach === false && s.aim.over !== 'hud' && s.aim.over !== 'off') return { p: s.aim.p, valid: false };
      return aimValid(s.aim) ? { p: s.aim.p, valid: true } : { p: s.last, valid: false };
    case 'aiming':
      return { p: s.aim.p, valid: aimValid(s.aim) };
    case 'pressed':
      return s.wasAiming ? { p: s.aim.p, valid: aimValid(s.aim) } : { p: null, valid: false };
    default:
      return { p: null, valid: false };
  }
}

export function stepPowerAim(s: PowerAimState, ev: PowerAimEvent): PowerAimStep {
  switch (ev.e) {
    case 'down':
      // A second finger while one is already down is ignored.
      if (s.s === 'pressed' || s.s === 'dragging') return stay(s);
      return stay({ s: 'pressed', id: ev.id, x: ev.x, y: ev.y, ready: ev.ready, aimable: ev.aimable, wasAiming: s.s === 'aiming', aim: s.s === 'aiming' ? s.aim : NO_AIM });

    case 'move':
      if (s.s === 'pressed' && s.id === ev.id) {
        if (!s.ready || Math.hypot(ev.x - s.x, ev.y - s.y) < POWER_DRAG_PX) return stay(s);
        const last = aimValid(ev.aim) ? ev.aim.p : null;
        return { state: { s: 'dragging', id: ev.id, aimable: s.aimable, aim: ev.aim, last }, effect: { k: 'pickup' } };
      }
      if (s.s === 'dragging' && s.id === ev.id) return stay({ ...s, aim: ev.aim, last: aimValid(ev.aim) ? ev.aim.p : s.last });
      return stay(s);

    case 'up':
      if (s.s === 'pressed' && s.id === ev.id) {
        // A second tap on the button while aiming puts the power back.
        if (s.wasAiming) return { state: AIM_IDLE, effect: { k: 'cancel' } };
        if (s.ready) return { state: { s: 'aiming', aimable: s.aimable, aim: NO_AIM, field: null }, effect: { k: 'aim' } };
        // Not ready: the plain command, which the model denies (the button shakes).
        return { state: AIM_IDLE, effect: { k: 'fire' } };
      }
      if (s.s === 'dragging' && s.id === ev.id) {
        const aim = ev.aim.over === 'off' && s.aim.over !== 'off' ? s.aim : ev.aim;
        if (!aimValid(aim)) return { state: AIM_IDLE, effect: { k: 'cancel' } };
        return { state: AIM_IDLE, effect: s.aimable && aim.p !== null ? { k: 'fire', p: aim.p } : { k: 'fire' } };
      }
      return stay(s);

    case 'aimAt':
      if (s.s !== 'aiming') return stay(s);
      return stay({ ...s, aim: ev.aim });

    case 'fieldDown':
      if (s.s !== 'aiming') return stay(s);
      return stay({ ...s, field: ev.id, aim: ev.aim.over === 'off' ? s.aim : ev.aim });

    case 'fieldMove':
      if (s.s !== 'aiming') return stay(s);
      // Off the lane (the pointer left the band) the ghost stays where it was.
      if (ev.aim.over === 'off') return stay(s);
      return stay({ ...s, aim: ev.aim });

    case 'fieldUp': {
      if (s.s !== 'aiming' || s.field !== ev.id) return stay(s);
      const aim = ev.aim.over === 'off' ? s.aim : ev.aim;
      if (!aimValid(aim) || aim.p === null) return stay({ ...s, field: null });
      return { state: AIM_IDLE, effect: s.aimable ? { k: 'fire', p: aim.p } : { k: 'fire' } };
    }

    case 'cancel':
      if (s.s === 'idle') return stay(s);
      return { state: AIM_IDLE, effect: aimActive(s) ? { k: 'cancel' } : NONE };
  }
}
