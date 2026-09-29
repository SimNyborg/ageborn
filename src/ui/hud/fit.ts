/**
 * Fitting one-line HUD labels into their space without cutting them (U6: no truncation, no
 * ellipsis): a label wider than `avail` CSS px is condensed horizontally (down to 62%) with negative
 * margins so its layout box shrinks to match. The font size never drops below the budget (1.3).
 */
import { useLayoutEffect } from 'preact/hooks';

export const MIN_FIT = 0.62;

/** Condenses `el` (an inline-block) to `avail` px when it is wider; resets it otherwise. */
export function fitLabel(el: HTMLElement | null, avail: number): void {
  if (!el) return;
  el.style.removeProperty('--fit');
  el.style.removeProperty('--fit-m');
  const natural = el.offsetWidth;
  if (!(natural > avail) || natural <= 0 || avail <= 0) return;
  const k = Math.max(MIN_FIT, avail / natural);
  el.style.setProperty('--fit', String(k));
  el.style.setProperty('--fit-m', `${((natural * k - natural) / 2).toFixed(1)}px`);
}

/** Runs `fitLabel` after every render where `deps` change; `avail` reads the space at that moment. */
export function useFitLabel(ref: { current: HTMLElement | null }, avail: () => number, deps: readonly unknown[]): void {
  useLayoutEffect(() => {
    fitLabel(ref.current, avail());
    // `deps` are the label text and the size class.
  }, deps);
}
