/**
 * Home's live island in the UI (owner request 2026-10-16, queue item 37: "the troops standing on the rock
 * island on the front page move very unnaturally and not like in the game"; "the flags flap very stiffly"):
 * the island's troops play their real battle clips and its flags wave with the lane's cloth, on a small Pixi
 * layer over the island's SVG. The UI may not import render or Pixi (B2), so the app provides the mount
 * (render's `menuStages(art).home`, sharing the Customize previews' WebGL context) through this context, as
 * it provides the card showcase and the Customize diorama. Without one (tests, dev pages, no WebGL) and
 * under Reduce motion the island keeps its still troops and flags.
 *
 * The request and handle mirror render's `HomeStageRequest` and `HomeStageHandle` (`render/showcase/home.ts`);
 * the app passes render's mount here, so the compiler holds the two shapes together.
 */
import type { CardId, CosmeticKey, Side, SkinId, SoundId, TeamPreset } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import { createContext, type RefObject } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';

export interface HomeStageTroop {
  side: Side;
  slot: 0 | 1;
  card: CardId;
  skin?: SkinId | null;
  /** The troop's spot on the island picture (its SVG units). */
  x: number;
  y: number;
}

export interface HomeStagePole {
  side: Side;
  x: number;
  y: number;
  height: number;
  baseFlag: CosmeticKey | null;
  nationalFlag: CosmeticKey | null;
  grey?: boolean;
}

export interface HomeStageRequest {
  troops: readonly HomeStageTroop[];
  poles: readonly HomeStagePole[];
  island: { width: number; height: number; center: number; ground: number; unitsPerLu: number };
  teamPreset: TeamPreset;
  lite: boolean;
  seed: number;
  sound?: (id: SoundId, o?: { pitchBp?: number; volumeDb?: number }) => void;
  /** Troops that may come next (the ranked opponent's while the search runs): loaded, not drawn. */
  preload?: readonly { card: CardId; skin?: SkinId | null }[];
}

export interface HomeStageHandle {
  readonly ready: Promise<boolean>;
  update(patch: Partial<HomeStageRequest>): void;
  setVisible(on: boolean): void;
  destroy(o?: { now?: boolean }): void;
}

export type HomeStageMount = (host: HTMLElement, req: HomeStageRequest) => HomeStageHandle;

export const HomeStageContext = createContext<HomeStageMount | null>(null);

type IdleHandle = { cancel(): void };

function whenIdle(cb: () => void, timeoutMs: number): IdleHandle {
  const w = typeof window !== 'undefined' ? (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void }) : null;
  if (w?.requestIdleCallback) {
    const h = w.requestIdleCallback(cb, { timeout: timeoutMs });
    return { cancel: () => w.cancelIdleCallback?.(h) };
  }
  const h = setTimeout(cb, 0);
  return { cancel: () => clearTimeout(h) };
}

/**
 * How long after Home appears the live island may start (ms): after the island's entrance (`hd-in`,
 * 700 ms) and the screen's other first moves, then when the browser is idle (at most `IDLE_WAIT_MS` later).
 * Home's first paint never waits for it; the still troops stand until the live ones are drawn.
 */
export const LIVE_AFTER_MS = MOTION_DUR.large + 500;
const IDLE_WAIT_MS = 1500;

/**
 * Mounts the injected live island into `host` once Home has settled (null `req` or no mount: never; Reduce
 * motion passes null) and keeps it in step with `req`. Drawing pauses while `paused` (a sheet or panel over
 * Home), while the island is off screen and while the tab is hidden. `leaving` marks a match start: the stage
 * then lets go of its WebGL context at once instead of lingering. Returns true while the live island draws.
 */
export function useHomeStage(host: RefObject<HTMLElement>, req: HomeStageRequest | null, o: { paused: boolean; leaving: boolean }): boolean {
  const mount = useContext(HomeStageContext);
  const [live, setLive] = useState(false);
  const handle = useRef<HomeStageHandle | null>(null);
  const latest = useRef(req);
  latest.current = req;
  const leaving = useRef(o.leaving);
  leaving.current = o.leaving;
  const seen = useRef({ box: true, page: true, paused: o.paused });
  /** Re-applies the visibility (box on screen, tab shown, not paused) to the live island. */
  const applyRef = useRef<(() => void) | null>(null);
  const on = !!mount && req !== null;
  useEffect(() => {
    if (!mount || !on) return undefined;
    let alive = true;
    let h: HomeStageHandle | null = null;
    let idle: IdleHandle | null = null;
    let io: IntersectionObserver | null = null;
    const s = seen.current;
    s.page = typeof document === 'undefined' || !document.hidden;
    const apply = (): void => h?.setVisible(s.box && s.page && !s.paused);
    const onPage = (): void => {
      s.page = !document.hidden;
      apply();
    };
    applyRef.current = apply;
    const start = (): void => {
      const el = host.current;
      const r = latest.current;
      if (!alive || !el || !r) return;
      try {
        h = mount(el, r);
      } catch {
        return;
      }
      handle.current = h;
      const mine = h;
      void mine.ready
        .then((ok) => {
          if (alive && handle.current === mine) setLive(ok);
        })
        .catch(() => undefined);
      if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver((es) => {
          s.box = es.some((e) => e.isIntersecting);
          apply();
        });
        io.observe(el);
      }
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onPage);
      apply();
    };
    const timer = setTimeout(() => {
      idle = whenIdle(start, IDLE_WAIT_MS);
    }, LIVE_AFTER_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
      idle?.cancel();
      io?.disconnect();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onPage);
      // leaving for a match: the shared context goes now, so the battle's textures never meet it
      h?.destroy({ now: leaving.current });
      handle.current = null;
      applyRef.current = null;
      setLive(false);
    };
  }, [mount, on]);
  // a sheet over Home (or the launch) pauses the drawing; the island resumes where it was
  useEffect(() => {
    seen.current.paused = o.paused;
    applyRef.current?.();
  }, [o.paused]);
  // every change (a deck switch, the opponent found, the team colours, Lite) reaches the live island at once
  const key = req ? JSON.stringify({ ...req, sound: undefined }) : '';
  useEffect(() => {
    if (!req || !handle.current) return;
    handle.current.update(req);
  }, [key]);
  return live;
}
