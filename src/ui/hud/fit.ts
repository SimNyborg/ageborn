/**
 * Fitting one-line HUD labels into their space without cutting them (U6: no truncation, no
 * ellipsis): a label wider than `avail` CSS px is condensed horizontally (down to 62%) with negative
 * margins so its layout box shrinks to match. The font size never drops below the budget (1.3).
 */
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

export const MIN_FIT = 0.62;

/**
 * Condenses `el` (an inline-block) to `avail` px when it is wider; resets it otherwise. Returns false
 * when even the most condensed label is wider than `avail` (the caller may pick a shorter label).
 */
export function fitLabel(el: HTMLElement | null, avail: number): boolean {
  if (!el) return true;
  el.style.removeProperty('--fit');
  el.style.removeProperty('--fit-m');
  const natural = el.offsetWidth;
  if (!(natural > avail) || natural <= 0 || avail <= 0) return true;
  const k = Math.max(MIN_FIT, avail / natural);
  el.style.setProperty('--fit', String(k));
  el.style.setProperty('--fit-m', `${((natural * k - natural) / 2).toFixed(1)}px`);
  return natural * MIN_FIT <= avail + 0.5;
}

/**
 * Runs `fitLabel` after every render where `deps` change, and again whenever the label's box changes
 * size (research rings, chips or a rotation can take space after the first render, which left a
 * name cut on phones). `avail` reads the space at that moment, after the old fit is cleared.
 */
export function useFitLabel(
  ref: { current: HTMLElement | null },
  avail: () => number,
  deps: readonly unknown[],
  onFit?: (fits: boolean) => void,
): void {
  const run = (): void => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty('--fit');
    el.style.removeProperty('--fit-m');
    const fits = fitLabel(el, avail());
    onFit?.(fits);
  };
  // The observer always runs the latest render's closure (its label, space and callback).
  const latest = useRef(run);
  latest.current = run;
  useLayoutEffect(() => {
    run();
    // `deps` are the label text and the size class.
  }, deps);
  useEffect(() => {
    const box = ref.current?.parentElement;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    let last = -1;
    const ro = new ResizeObserver(() => {
      // The box of a shrink-wrapped label follows the fit itself; refit only when the space changed.
      const w = box.parentElement?.clientWidth ?? box.clientWidth;
      if (w === last) return;
      last = w;
      latest.current();
    });
    ro.observe(box);
    if (box.parentElement) ro.observe(box.parentElement);
    return () => ro.disconnect();
  }, []);
}
