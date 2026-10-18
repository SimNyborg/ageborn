/**
 * When the player last touched the page (review M S7). Creating the menus' shared WebGL app is one long
 * task (about 1.2 s with a 4x slower CPU and a software GPU), and a tap that lands in it is handled late:
 * Home's live island waits until the player has left the screen alone for a moment before it starts one.
 * Listens once, passively, in the capture phase; no DOM: always quiet.
 */

let last = Number.NEGATIVE_INFINITY;
let listening = false;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);

/** Starts listening (idempotent): the app calls it at boot, so the taps before Home's island loads count too. */
export function listen(): void {
  if (listening || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  listening = true;
  const mark = (): void => {
    last = now();
  };
  for (const type of ['pointerdown', 'pointerup', 'keydown', 'touchstart', 'wheel']) window.addEventListener(type, mark, { capture: true, passive: true });
}

/** Ms since the player's last input (infinite before any). */
export function sinceInput(): number {
  listen();
  return now() - last;
}

/**
 * Resolves once the player has left the page alone for `quietMs` and `held()` is false (a ranked search, a
 * launch), or with false as soon as `cancelled()` turns true. Polls at most every 200 ms.
 */
export function whenQuiet(quietMs: number, o: { held?: () => boolean; cancelled?: () => boolean } = {}): Promise<boolean> {
  listen();
  return new Promise((resolve) => {
    const check = (): void => {
      if (o.cancelled?.()) {
        resolve(false);
        return;
      }
      const left = quietMs - sinceInput();
      if (left <= 0 && !o.held?.()) {
        resolve(true);
        return;
      }
      setTimeout(check, Math.max(16, Math.min(200, left > 0 ? left : 200)));
    };
    check();
  });
}
