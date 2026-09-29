/**
 * Back handling for the browser and Android back gesture (docs/ui-plan.md 2.2, U7).
 *
 * - `backHandlers`: a stack of "close me" handlers. Sheets, info panels and other things that are
 *   not router entries register while open, so Esc-like backs close the topmost one first.
 * - `bindHistory`: keeps one trap entry in `window.history`. Every browser back (the button, the
 *   Android gesture, an iOS edge swipe) pops the trap; the binding then runs one app back (the top
 *   back handler, else `onBack`, typically the router: close, go back, or pause in battle) and
 *   re-arms the trap. At the Home root `onBack` returns false: the first back shows "Press back
 *   again to leave" (`onLeaveWarning`, 2 s) and re-arms; only a second back within 2 s leaves.
 *
 * `history` and time are injected, so the logic is unit-tested without a browser.
 */

export type BackHandler = () => void;

const handlers: BackHandler[] = [];

/** Registers a handler (topmost first); returns its removal. */
export function pushBackHandler(fn: BackHandler): () => void {
  handlers.push(fn);
  return () => {
    const i = handlers.lastIndexOf(fn);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/** Runs the topmost back handler; false when there is none. */
export function runBackHandler(): boolean {
  const fn = handlers[handlers.length - 1];
  if (!fn) return false;
  fn();
  return true;
}

/** Test hook. */
export function clearBackHandlers(): void {
  handlers.length = 0;
}

/** The window pieces the binding needs. */
export interface HistoryHost {
  history: Pick<History, 'pushState' | 'replaceState' | 'back' | 'state'>;
  addEventListener(type: 'popstate', fn: (e: PopStateEvent) => void): void;
  removeEventListener(type: 'popstate', fn: (e: PopStateEvent) => void): void;
}

export interface HistoryBindingOptions {
  host: HistoryHost;
  /** One app back (router back, pause in battle). Returns false at the root (Home). */
  onBack: () => boolean;
  /** Shows "Press back again to leave" (the toast). */
  onLeaveWarning: () => void;
  /** The leave window after the warning (2 s). */
  leaveWindowMs?: number;
  now?: () => number;
}

const TRAP = { agebornTrap: true };
/** The toast text key for the first back at the root (2.2). */
export const LEAVE_AGAIN_KEY = 'ui.nav.leaveAgain';
export const LEAVE_WINDOW_MS = 2000;

/** Binds the back trap; returns the unbind. */
export function bindHistory(o: HistoryBindingOptions): () => void {
  const now = o.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : 0));
  const windowMs = o.leaveWindowMs ?? LEAVE_WINDOW_MS;
  let warnedAt = -Infinity;
  let leaving = false;
  const arm = () => o.host.history.pushState(TRAP, '');
  const isTrap = (s: unknown) => !!s && typeof s === 'object' && (s as { agebornTrap?: boolean }).agebornTrap === true;
  if (!isTrap(o.host.history.state)) arm();
  const onPop = () => {
    if (leaving) return;
    if (runBackHandler() || o.onBack()) {
      arm();
      return;
    }
    const t = now();
    if (t - warnedAt <= windowMs) {
      // Second back within the window: really leave.
      leaving = true;
      o.host.history.back();
      return;
    }
    warnedAt = t;
    o.onLeaveWarning();
    arm();
  };
  o.host.addEventListener('popstate', onPop);
  return () => o.host.removeEventListener('popstate', onPop);
}
