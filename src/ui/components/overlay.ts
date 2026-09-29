/**
 * Blocking overlays the app shows over a screen (the onboarding's forced upgrade, the age dialog).
 * While one is open, the screen under it has no primary button and no pulse (U1, U11: exactly one of
 * each on screen), and Home holds its ceremonies until the overlay closes (U13: never two medium or
 * large moments at once).
 */
import { signal } from '@preact/signals';
import { useLayoutEffect } from 'preact/hooks';

/** How many blocking overlays are open now. */
export const blockingOverlays = signal(0);

/**
 * Counts this component as a blocking overlay while `active`. A layout effect, so the count is set
 * before the screen underneath runs its own effects in the same commit.
 */
export function useBlockingOverlay(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return undefined;
    blockingOverlays.value += 1;
    return () => {
      blockingOverlays.value -= 1;
    };
  }, [active]);
}
