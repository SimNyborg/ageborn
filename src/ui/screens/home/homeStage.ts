/**
 * Home's live island in the UI (owner request 2026-10-16, queue item 37: "the troops standing on the rock
 * island on the front page move very unnaturally and not like in the game"; "the flags flap very stiffly"):
 * the island's troops play their real battle clips and its flags wave with the lane's cloth, on a small Pixi
 * layer over the island's SVG. The UI may not import render or Pixi (B2), so the app provides the mount
 * (render's `menuStages(art).home`, sharing the Customize previews' WebGL context) through this context, as
 * it provides the card showcase and the Customize diorama. Without one (tests, dev pages, no WebGL) and
 * under Reduce motion the island keeps its still troops and flags.
 *
 * The still island draws the same troops at the same size and place (review M S3): the live layer reports
 * each troop's drawn idle box (`onBoxes`), remembered here per card and skin (and on the device, so the next
 * visit's still matches from its first frame), and the still fits the troop's idle strip into that box.
 *
 * The request and handle mirror render's `HomeStageRequest` and `HomeStageHandle` (`render/showcase/home.ts`);
 * the app passes render's mount here, so the compiler holds the two shapes together.
 */
import type { CardId, CosmeticKey, Side, SkinId, TeamPreset } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import { signal } from '@preact/signals';
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

/** How far a troop's drawn idle pose reaches from its feet (lu on the island, at its drawn size): toward the opponent, behind, above. */
export interface HomeTroopBox {
  card: CardId;
  /** The troop's skin (a skin may be drawn another way and at another size than the card's own look). */
  skin?: SkinId | null;
  front: number;
  back: number;
  top: number;
}

export interface HomeStageRequest {
  troops: readonly HomeStageTroop[];
  poles: readonly HomeStagePole[];
  island: { width: number; height: number; center: number; ground: number; unitsPerLu: number };
  teamPreset: TeamPreset;
  lite: boolean;
  /** Graphics on Auto: the island takes Lite's pace once frames run long. */
  auto?: boolean;
  seed: number;
  /** Troops that may come next (the ranked opponent's while the search runs): loaded and ready off stage, not drawn. */
  preload?: readonly { card: CardId; skin?: SkinId | null }[];
  /** A ranked search or a launch is under way: a cold start waits. */
  hold?: boolean;
  onLive?: (live: boolean) => void;
  onBoxes?: (boxes: readonly HomeTroopBox[]) => void;
}

export interface HomeStageHandle {
  readonly ready: Promise<boolean>;
  update(patch: Partial<HomeStageRequest>): void;
  setVisible(on: boolean): void;
  destroy(o?: { now?: boolean }): void;
}

/** The mount; `warm()`: the shared app is already up (a return within its linger), so the island may start at once. */
export type HomeStageMount = ((host: HTMLElement, req: HomeStageRequest) => HomeStageHandle) & { warm?(): boolean };

export const HomeStageContext = createContext<HomeStageMount | null>(null);

// ---------------------------------------------------------------------------------------------
// The troops' drawn boxes (the still island's sizes)

const BOXES_KEY = 'ageborn.home.troopBoxes';

type BoxMap = Readonly<Record<string, Readonly<{ front: number; back: number; top: number }>>>;

const sane = (x: unknown, lo: number, hi: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;

function loadBoxes(): BoxMap {
  try {
    const raw = globalThis.localStorage?.getItem(BOXES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    const out: Record<string, { front: number; back: number; top: number }> = {};
    if (parsed && typeof parsed === 'object') {
      for (const [card, b] of Object.entries(parsed as Record<string, unknown>)) {
        const v = b as { front?: unknown; back?: unknown; top?: unknown } | null;
        if (v && sane(v.front, -40, 200) && sane(v.back, -40, 200) && sane(v.top, 4, 260)) out[card] = { front: v.front, back: v.back, top: v.top };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** The troops' drawn idle boxes the live island measured, by `boxKey` (the still island fits their strips into them). */
export const troopBoxes = signal<BoxMap>(loadBoxes());

/** Where a troop's box is kept: its card, or its card and skin (a skinned troop may stand at another size). */
export function boxKey(card: CardId, skin?: SkinId | null): string {
  return skin ? `${card}@${skin}` : card;
}

/** Remembers the boxes the live island measured (for this visit's still and the next visit's first frame). */
export function rememberBoxes(list: readonly HomeTroopBox[]): void {
  const prev = troopBoxes.peek();
  let next: Record<string, { front: number; back: number; top: number }> | null = null;
  const r1 = (x: number): number => Math.round(x * 10) / 10;
  for (const b of list) {
    if (!sane(b.front, -40, 200) || !sane(b.back, -40, 200) || !sane(b.top, 4, 260)) continue;
    const v = { front: r1(b.front), back: r1(b.back), top: r1(b.top) };
    const key = boxKey(b.card, b.skin);
    const old = prev[key];
    if (old && old.front === v.front && old.back === v.back && old.top === v.top) continue;
    next ??= { ...prev };
    // re-inserted last, so the cards seen most recently survive the trim below
    delete next[key];
    next[key] = v;
  }
  if (!next) return;
  // a small table: the cards seen last stay (a collection's worth at most)
  const keys = Object.keys(next);
  for (const k of keys.slice(0, Math.max(0, keys.length - 160))) delete next[k];
  troopBoxes.value = next;
  try {
    globalThis.localStorage?.setItem(BOXES_KEY, JSON.stringify(next));
  } catch {
    // a private window keeps them for this visit only
  }
}

// ---------------------------------------------------------------------------------------------
// The hook

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
 * How long after Home appears a cold live island may start (ms): after the island's entrance (`hd-in`,
 * 700 ms) and the screen's other first moves, then when the browser is idle (at most `IDLE_WAIT_MS` later).
 * Home's first paint never waits for it; the still troops stand until the live ones are drawn. A warm island
 * (the shared app still up, a return within its linger) starts at once.
 */
export const LIVE_AFTER_MS = MOTION_DUR.large + 500;
const IDLE_WAIT_MS = 1500;
/**
 * A cold start also waits while the still troops are on their way (`wait`; their strips are drawn off the main
 * thread on a first visit), at most this long after Home appears: the start-up's long task would otherwise hold
 * them back and leave the island empty for seconds (queue item 37, open item 1).
 */
export const STILL_WAIT_MS = 4000;
const STILL_POLL_MS = 100;
/** The app's "rotate your phone" cover (`app.css` `.ab-rotate`): the island under it pauses (review M N8). */
const ROTATE_QUERY = '(orientation: portrait) and (max-width: 700px)';

/**
 * Mounts the injected live island into `host` once Home has settled (null `req` or no mount: never; Reduce
 * motion passes null) and keeps it in step with `req`. Drawing pauses while `paused` (a sheet or panel over
 * Home), while the island is off screen, under the rotate cover and while the tab is hidden. `leaving` marks a
 * match start: the stage then lets go of its WebGL context at once instead of lingering. `wait` (the still
 * troops are on their way) holds a cold start back, at most `STILL_WAIT_MS`. Returns true while the live
 * island draws (false again while its context is lost: the still shows).
 */
export function useHomeStage(host: RefObject<HTMLElement>, req: HomeStageRequest | null, o: { paused: boolean; leaving: boolean; wait?: boolean }): boolean {
  const mount = useContext(HomeStageContext);
  const [live, setLive] = useState(false);
  const handle = useRef<HomeStageHandle | null>(null);
  const latest = useRef(req);
  latest.current = req;
  const leaving = useRef(o.leaving);
  leaving.current = o.leaving;
  const waiting = useRef(o.wait === true);
  waiting.current = o.wait === true;
  const seen = useRef({ box: true, page: true, upright: false, paused: o.paused });
  /** Re-applies the visibility (box on screen, tab shown, landscape, not paused) to the live island. */
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
    const rotate = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(ROTATE_QUERY) : null;
    s.upright = rotate?.matches ?? false;
    const apply = (): void => h?.setVisible(s.box && s.page && !s.upright && !s.paused);
    const onPage = (): void => {
      s.page = !document.hidden;
      apply();
    };
    const onRotate = (): void => {
      s.upright = rotate?.matches ?? false;
      apply();
    };
    applyRef.current = apply;
    const start = (): void => {
      const el = host.current;
      const r = latest.current;
      if (!alive || !el || !r) return;
      const mine: { h: HomeStageHandle | null } = { h: null };
      // the live layer may stop and start again (a lost context and its restore); the still shows meanwhile
      const onLive = (ok: boolean): void => {
        if (alive && handle.current === mine.h) setLive(ok);
      };
      try {
        h = mount(el, { ...r, onLive, onBoxes: rememberBoxes });
      } catch {
        return;
      }
      mine.h = h;
      handle.current = h;
      void h.ready.then(onLive).catch(() => undefined);
      if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver((es) => {
          s.box = es.some((e) => e.isIntersecting);
          apply();
        });
        io.observe(el);
      }
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onPage);
      rotate?.addEventListener?.('change', onRotate);
      apply();
    };
    // warm (the shared app is up: no WebGL start-up, the sheets are likely still in): at once (review M S3)
    const warm = mount.warm?.() === true;
    const since = Date.now();
    let poll: ReturnType<typeof setTimeout> | null = null;
    // cold: after Home's entrance, once the still troops are in (or `STILL_WAIT_MS` passed), when idle
    const cold = (): void => {
      poll = null;
      if (!alive) return;
      if (waiting.current && Date.now() - since < STILL_WAIT_MS) {
        poll = setTimeout(cold, STILL_POLL_MS);
        return;
      }
      idle = whenIdle(start, IDLE_WAIT_MS);
    };
    const timer = setTimeout(
      () => {
        if (warm) start();
        else cold();
      },
      warm ? 0 : LIVE_AFTER_MS,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
      if (poll) clearTimeout(poll);
      idle?.cancel();
      io?.disconnect();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onPage);
      rotate?.removeEventListener?.('change', onRotate);
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
  // every change (a deck switch, the opponent found, the team colours, Lite, a search's hold) reaches the
  // live island at once
  const key = req ? JSON.stringify(req) : '';
  useEffect(() => {
    if (!req || !handle.current) return;
    handle.current.update(req);
  }, [key]);
  return live;
}
