/**
 * Frame-exact captures of the collect moment (queue item 48) for the dev pages that show one (`#currency`,
 * `#screens`). With `?dev=1&step=1` moments run on a manual clock that drives their animations, and
 * `window.__collectStep(ms)` moves it on, whatever the machine's load (the art round shares four cores);
 * `__collectPending()` counts the frames waiting for a step, `__collectRunning()` the moments playing.
 * `window.__collectSounds` logs every sound a moment plays with its time on that clock (or the page's), for a
 * capture's sound track.
 *
 * Dev pages are internal tools and are exempt from the i18n rule.
 */
import { collectsRunning, driveCollects, setCollectScheduler, setCollectSoundTap } from '@/ui/components/collect';

type DevWindow = Window & {
  __collectStep?: (ms: number) => number;
  __collectNow?: () => number;
  __collectSounds?: { id: string; pitchBp?: number; t: number }[];
  __collectPending?: () => number;
  __collectRunning?: () => number;
};

let installed = false;

export function installCollectCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const w = window as DevWindow;
  if (new URLSearchParams(window.location.search).get('step') === '1') {
    let now = 0;
    let next = 1;
    const queue = new Map<number, (t: number) => void>();
    setCollectScheduler({
      now: () => now,
      frame: (cb) => {
        queue.set(next, cb);
        return next++;
      },
      cancel: (id) => void queue.delete(id),
      drive: true,
    });
    w.__collectStep = (ms: number) => {
      now += ms;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb(now);
      driveCollects();
      return now;
    };
    w.__collectNow = () => now;
    // frame callbacks waiting for the next step (a moment that was asked for and has not started counts)
    w.__collectPending = () => queue.size;
  }
  w.__collectRunning = () => collectsRunning();
  setCollectSoundTap((id, o) => {
    (w.__collectSounds ??= []).push({ id, ...(o?.pitchBp ? { pitchBp: o.pitchBp } : {}), t: w.__collectNow ? w.__collectNow() : Math.round(performance.now()) });
  });
}
