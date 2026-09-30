/**
 * The Fort placement's shared state (DESIGN A16.14.7, F2): the Fort button writes it while a fort is
 * in hand (dragged or tap-aimed) and the lane overlay (`FortLane.tsx`) draws the pads, the ghost and the
 * tower reach from it. A signal, so a pointer move re-renders only the button and the overlay.
 */
import type { CardId, FortKind } from '@/contracts';

export interface FortAim {
  /** `drag`: the fort follows the pointer; `tap`: aiming mode (tap a pad); `hint`: the one-time hint shows the pads. */
  mode: 'drag' | 'tap' | 'hint';
  card: CardId;
  kind: FortKind;
  /** The pad the ghost snaps to (a legal pad within 24 px), or null. */
  snap: number | null;
  /** The pointer, HUD-local CSS px (drag only). */
  pointer: { x: number; y: number } | null;
  /** What the pointer is over: a drop on the HUD bars cancels. */
  over: 'lane' | 'minimap' | 'hud' | 'off';
}

/** A placement the button just sent: the ghost contracts on `pad` and the dust rises there (MR-70b). */
export interface FortCommit {
  n: number;
  pad: number;
  kind: FortKind;
  card: CardId;
}

/** The ghost snaps to a legal pad within this many CSS px of the pointer (A16.14.7). */
export const FORT_SNAP_PX = 24;
/** A tap in aiming mode hits a pad within this many CSS px (a finger, not a cursor). */
export const FORT_TAP_PX = 40;
/** Near a screen edge while dragging, the camera scrolls (A17.6). */
export const FORT_EDGE_PX = 44;
/** Edge-scroll speed at the very edge, lu per second. */
export const FORT_EDGE_LU_S = 700;

/** Body width of a fort in lu by kind (A16.14.1: walls and camps large 48, towers medium 32, a trap's 60 lu patch). */
export function fortWidthLu(kind: FortKind): number {
  return kind === 'tower' ? 32 : kind === 'trap' ? 60 : 48;
}
