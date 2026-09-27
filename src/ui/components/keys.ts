/**
 * Keyboard navigation helpers (DESIGN C2/WP9 DoD: keyboard navigation works).
 *
 * The UI uses native buttons and inputs everywhere, so Tab, Shift+Tab, Enter and Space work by
 * default. On top of that:
 * - tab lists, age pickers and segmented controls use a roving tab index with the arrow keys,
 *   Home and End (WAI-ARIA tabs / radio group pattern);
 * - card grids move focus with the arrow keys (`gridNextIndex`);
 * - modals trap focus and close on Escape; screens go back on Escape (see ScreenHost).
 */

export type Orientation = 'horizontal' | 'vertical' | 'both';

/**
 * The next index in a one-dimensional list for a key press, wrapping at the ends, or null when the
 * key is not a navigation key for this orientation.
 */
export function rovingNextIndex(key: string, index: number, count: number, orientation: Orientation = 'horizontal'): number | null {
  if (count <= 0) return null;
  const prevKeys = orientation === 'vertical' ? ['ArrowUp'] : orientation === 'horizontal' ? ['ArrowLeft'] : ['ArrowLeft', 'ArrowUp'];
  const nextKeys = orientation === 'vertical' ? ['ArrowDown'] : orientation === 'horizontal' ? ['ArrowRight'] : ['ArrowRight', 'ArrowDown'];
  if (prevKeys.includes(key)) return (index - 1 + count) % count;
  if (nextKeys.includes(key)) return (index + 1) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/**
 * The next index in a grid of `cols` columns (row-major), clamped to the grid (no wrapping), or null
 * when the key is not an arrow, Home or End key.
 */
export function gridNextIndex(key: string, index: number, count: number, cols: number): number | null {
  if (count <= 0) return null;
  const c = Math.max(1, cols);
  switch (key) {
    case 'ArrowLeft':
      return Math.max(0, index - 1);
    case 'ArrowRight':
      return Math.min(count - 1, index + 1);
    case 'ArrowUp':
      return index - c >= 0 ? index - c : index;
    case 'ArrowDown':
      return index + c < count ? index + c : index;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** Counts the columns of a laid-out grid from its children's top offsets (1 when unknown). */
export function columnsOf(items: readonly { offsetTop: number }[]): number {
  if (items.length === 0) return 1;
  const top = items[0]!.offsetTop;
  let n = 0;
  for (const it of items) {
    if (it.offsetTop !== top) break;
    n++;
  }
  return Math.max(1, n);
}

/**
 * Keydown handler for a container of focusable grid items (marked `data-grid-item`): moves focus
 * with the arrow keys. Attach to the grid element's `onKeyDown`.
 */
export function onGridKeyDown(e: KeyboardEvent): void {
  const container = e.currentTarget as HTMLElement | null;
  if (!container) return;
  const items = Array.from(container.querySelectorAll<HTMLElement>('[data-grid-item]'));
  const index = items.findIndex((el) => el === document.activeElement || el.contains(document.activeElement));
  if (index < 0) return;
  const next = gridNextIndex(e.key, index, items.length, columnsOf(items));
  if (next === null || next === index) return;
  e.preventDefault();
  items[next]!.focus();
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focusable descendants in DOM order. */
export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/**
 * Keeps Tab inside `root` (for modals). Returns true when it moved focus itself.
 */
export function trapTab(e: KeyboardEvent, root: HTMLElement): boolean {
  if (e.key !== 'Tab') return false;
  const list = focusables(root);
  if (list.length === 0) {
    e.preventDefault();
    return true;
  }
  const first = list[0]!;
  const last = list[list.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
    return true;
  }
  if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
    return true;
  }
  return false;
}
