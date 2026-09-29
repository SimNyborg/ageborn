/**
 * Haptics (docs/ui-plan.md 5.4): Android through `navigator.vibrate`; nothing on iOS Safari. One
 * helper so every screen, the HUD and the capsule stage feel the same:
 *
 * - tiers: `tick` 8 ms (primary press, card lift, slot snap, toggle), `thump` 18 ms (card place,
 *   stamps, star stamp, node drop), `deny` 12 ms (denied press), `heavy` [30, 30, 60] (upgrade
 *   impact, unlock crack, VS slam, victory banner);
 * - at most one vibration per 100 ms, none while the document is hidden;
 * - behind the Settings "Vibration" toggle (`setHapticsEnabled`, set by the ScreenHost from the
 *   save). Reduce motion does not turn haptics off; the vibration setting does.
 */

export type HapticTier = 'tick' | 'thump' | 'deny' | 'heavy';

export const HAPTIC_PATTERN: Readonly<Record<HapticTier, number | readonly number[]>> = {
  tick: 8,
  thump: 18,
  deny: 12,
  heavy: [30, 30, 60],
};

/** The minimum gap between two vibrations. */
export const HAPTIC_GAP_MS = 100;

let enabled = true;
let last = -Infinity;
let clock: () => number = () => (typeof performance !== 'undefined' ? performance.now() : 0);

/** The Settings "Vibration" toggle. */
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

/** Test hook: replace the clock and reset the throttle. */
export function resetHaptics(now?: () => number): void {
  last = -Infinity;
  if (now) clock = now;
}

/** Vibrates with the tier's pattern when allowed. Returns whether it vibrated. */
export function haptic(tier: HapticTier): boolean {
  if (!enabled) return false;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
  const now = clock();
  if (now - last < HAPTIC_GAP_MS) return false;
  last = now;
  try {
    const pattern = HAPTIC_PATTERN[tier];
    return navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    return false;
  }
}
