/**
 * The collect moment (queue item 48, ui-plan MR-20, MR-20b and MR-21): Amber and Dust that feel precious.
 *
 * Earning: the source pops with a short anticipation, the pieces burst out of it, hang a beat and fly on eased
 * arcs with a light trail to the currency's counter (the screen's own top-bar chip, or a wallet chip that drops
 * in at the top right where Home keeps it), where each lands with a pulse and a small squash; the counter
 * counts up with a tick per landing and ends on a chime, and a "+N" shows the exact amount. Bigger amounts send
 * more pieces (capped) and land bigger. Dust, the rarer one, is richer and slower: glittering star motes that
 * twinkle as they fly and shed sparkles, a longer trail and a deeper chime. Spending plays a short reverse:
 * pieces leave the counter for what was bought while it counts down.
 *
 * Rules it keeps:
 * - Presentation only: it never touches the save or an amount. It starts after the save holds the change and
 *   shows exactly that change (A15: what was earned, after it was earned); the counter ends on the true total.
 * - Never blocks: the layer takes no input; any tap or Enter, Space or Escape finishes every running moment
 *   (U12), and the tap still reaches what it was meant for.
 * - At most {@link COLLECT_MAX_MS} per moment (ui-plan 5.3 small class, the owner's 1.2 s).
 * - Reduce motion: no flight; the source and the counter glow, the counter counts, the "+N" fades (5.6).
 * - Smooth on a phone: pieces, trails and sparkles are a few dozen absolutely placed elements moved by Web
 *   Animations on `transform` and `opacity` only (composited), drawn from cached image URLs.
 *
 * The timeline is a pure plan ({@link planCollect}, tested); {@link collectCurrency} plays it in the DOM.
 */
import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
import { MOTION_DUR, MOTION_EASE } from '@/core/motion';
import { setCounterOverride as setOverride, type CurrencyKind } from './counter';
import { formatInt } from './format';
import { AmberIcon, DustIcon, sparklePath } from './icons';
import { useKit } from './kit';
import { bezier, ease, reducedMotion, type MotionHandle } from './motion';
import './collect.css';

export type { CurrencyKind };
export type CollectMode = 'earn' | 'spend';

/** The longest a moment may last, from its start to its last sparkle. */
export const COLLECT_MAX_MS = 1200;

/**
 * The moment's sound ids (the `currency` group on the UI bus: `tools/audio/sfx/sounds_currency.py` renders them,
 * `src/audio/sounds.ts` has ZzFX fallbacks): the pickup as the pieces burst out, a tick per landing (each a
 * semitone higher), the chime as the count ends, and the spend.
 */
export const COLLECT_SOUND = {
  amber: { pickup: 'amber_pickup', tick: 'amber_tick', chime: 'amber_chime', spend: 'amber_spend' },
  dust: { pickup: 'dust_pickup', tick: 'dust_tick', chime: 'dust_chime', spend: 'dust_spend' },
} as const;

// ---------------------------------------------------------------------------------------------
// The plan (pure)
// ---------------------------------------------------------------------------------------------

export interface CollectPlanInput {
  kind: CurrencyKind;
  mode: CollectMode;
  /** The exact amount earned or spent (positive). */
  amount: number;
  /** The counter's value before the change. */
  before: number;
  reduce: boolean;
  /** Where the pieces start and where they end, in the layer's px (earn: source to counter; spend: counter to target). */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** A UI-only seed for the jitter (ui-plan 5.2 `fly`), so a moment looks the same every time. */
  seed: number;
}

/** One flying piece: its times (ms from the moment's start) and its path. */
export interface PiecePlan {
  /** It appears and bursts out of the source. */
  launch: number;
  /** The burst ends and it hangs (Dust drifts) until `flight`. */
  burstEnd: number;
  /** It sets off for the counter. */
  flight: number;
  /** It lands. */
  land: number;
  /** The burst offset from the source, px. */
  bx: number;
  by: number;
  /** How far the arc bows out of the straight line, as a share of its length (signed). */
  bow: number;
  /** Its size factor and its turn over the whole flight, degrees. */
  scale: number;
  spin: number;
}

export interface CollectPlan {
  kind: CurrencyKind;
  mode: CollectMode;
  amount: number;
  before: number;
  after: number;
  reduce: boolean;
  /** 0 to 3 by the size of the change (the count-up tokens: <= 10, <= 100, <= 1,000, more). */
  tier: 0 | 1 | 2 | 3;
  pieces: PiecePlan[];
  /** The source's dip before the burst (earn), ms. */
  anticipation: number;
  /** The counter's value at each step; the last one is `after`, exactly. */
  counts: { at: number; value: number }[];
  /** Pickup, ticks and the chime (or the spend whoosh), at their times. */
  sounds: { at: number; id: string; pitchBp?: number }[];
  /** The counter's landings: a pulse each, the last one bigger (`peak`, thousandths). */
  landings: { at: number; last: boolean }[];
  peak: number;
  /** The "+N" label: shown from `labelIn`, gone at `labelOut` + its fade. */
  labelIn: number;
  labelOut: number;
  /** When everything is over. */
  end: number;
}

const EARN = {
  amber: { anticipation: 90, burst: 170, hover: 0, flight: 420, staggerStep: 34, staggerMax: 150, tail: 260, spread: [26, 52] as const },
  dust: { anticipation: 110, burst: 210, hover: 40, flight: 470, staggerStep: 40, staggerMax: 160, tail: 210, spread: [30, 62] as const },
} as const;
const SPEND = { delay: 40, flight: 320, stagger: 40, count: 300, labelOut: 520 } as const;
const TICK_GAP = 45;
/** A source closer than this to the screen's top bursts downwards (px). */
const BURST_ROOM = 72;
const FADE = MOTION_DUR.reduced;

export function collectTier(amount: number): 0 | 1 | 2 | 3 {
  const a = Math.abs(amount);
  return a <= 10 ? 0 : a <= 100 ? 1 : a <= 1000 ? 2 : 3;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Pieces for an amount: more for more (log scale), capped; Dust sends more, smaller motes. */
export function pieceCount(kind: CurrencyKind, mode: CollectMode, amount: number): number {
  const lg = Math.log10(Math.max(0, amount) + 1);
  if (mode === 'spend') return clamp(Math.round(2.5 + 1.3 * lg), 3, 7);
  return kind === 'amber' ? clamp(Math.round(3 + 2.25 * lg), 3, 12) : clamp(Math.round(4 + 2.4 * lg), 4, 14);
}

/** A small xorshift generator: the jitter is seeded, never `Math.random`. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Semitones to a pitch in basis points of the recorded rate (10000 = as recorded). */
function pitchBp(semis: number): number {
  return Math.round(10000 * 2 ** (semis / 12));
}

/** Count steps from `from` to `to` at the given times, proportional to how many have landed; the last is exact. */
function steps(from: number, to: number, times: readonly number[]): { at: number; value: number }[] {
  const n = times.length;
  return times.map((at, i) => ({ at, value: i === n - 1 ? to : from + Math.round(((to - from) * (i + 1)) / n) }));
}

/** Ticks on the given times, at least {@link TICK_GAP} apart (A13's retrigger gap), the pitch rising a step each. */
function ticks(id: string, times: readonly number[], maxTicks: number, startSemis = 0): { at: number; id: string; pitchBp: number }[] {
  const out: { at: number; id: string; pitchBp: number }[] = [];
  let last = -Infinity;
  for (const at of times) {
    if (out.length >= maxTicks) break;
    if (at - last < TICK_GAP) continue;
    out.push({ at, id, pitchBp: pitchBp(Math.min(12, startSemis + out.length)) });
    last = at;
  }
  return out;
}

/** The whole moment as times and numbers, before anything is drawn. */
export function planCollect(i: CollectPlanInput): CollectPlan {
  const amount = Math.max(0, Math.round(i.amount));
  const after = i.mode === 'earn' ? i.before + amount : i.before - amount;
  const tier = collectTier(amount);
  const base = { kind: i.kind, mode: i.mode, amount, before: i.before, after, reduce: i.reduce, tier, peak: 1100 + 50 * tier };
  const rand = rng(i.seed);
  const snd = COLLECT_SOUND[i.kind];

  if (i.reduce) {
    // 5.6: no flight; a glow, the count (kept) and the "+N", with the same sounds
    const start = i.mode === 'earn' ? 120 : 40;
    const dur = Math.min(i.mode === 'earn' ? 600 : SPEND.count, Math.max(MOTION_DUR.countS, i.mode === 'earn' ? 400 + 60 * tier : SPEND.count));
    const k = Math.max(1, Math.min(i.mode === 'earn' ? 6 : 3, amount));
    const times = Array.from({ length: k }, (_, j) => start + Math.round((dur * (j + 1)) / k));
    const countEnd = start + dur;
    const sounds =
      i.mode === 'earn'
        ? [{ at: 0, id: snd.pickup }, ...ticks(snd.tick, times.slice(0, -1), 5), { at: countEnd, id: snd.chime }]
        : [{ at: 0, id: snd.spend }];
    return {
      ...base,
      pieces: [],
      anticipation: 0,
      counts: steps(i.before, after, times),
      sounds,
      landings: [{ at: start, last: true }],
      labelIn: start,
      labelOut: countEnd + 260,
      end: countEnd + 260 + FADE,
    };
  }

  if (i.mode === 'spend') {
    const n = pieceCount(i.kind, 'spend', amount);
    const pieces: PiecePlan[] = [];
    for (let j = 0; j < n; j++) {
      const launch = SPEND.delay + j * SPEND.stagger;
      pieces.push({
        launch,
        burstEnd: launch,
        flight: launch,
        land: launch + SPEND.flight + Math.round((rand() - 0.5) * 40),
        bx: 0,
        by: 0,
        bow: (0.18 + rand() * 0.16) * (j % 2 ? -1 : 1),
        scale: 0.92 + rand() * 0.2,
        spin: (rand() - 0.5) * 160,
      });
    }
    const count = Array.from({ length: 6 }, (_, j) => SPEND.delay + Math.round((SPEND.count * (j + 1)) / 6));
    const lastLand = Math.max(...pieces.map((p) => p.land));
    return {
      ...base,
      pieces,
      anticipation: 0,
      counts: steps(i.before, after, count),
      sounds: [{ at: SPEND.delay, id: snd.spend }],
      landings: [{ at: 0, last: true }],
      labelIn: SPEND.delay,
      labelOut: SPEND.labelOut,
      // the arrival's ring and flash in what was bought end 240 ms after the last piece
      end: Math.max(lastLand + 250, SPEND.labelOut + FADE),
    };
  }

  // Earning: anticipation, burst, a beat, the staggered flights, the landings and the chime
  const k = EARN[i.kind];
  const n = pieceCount(i.kind, 'earn', amount);
  const step = n > 1 ? Math.min(k.staggerStep, k.staggerMax / (n - 1)) : 0;
  const maxLand = COLLECT_MAX_MS - k.tail;
  // The burst fans out upwards (downwards from a source by the screen's top, where there is no room above),
  // leaning away from the counter's side, so the arcs read as a toss into the counter.
  const toward = Math.atan2(i.to.y - i.from.y, i.to.x - i.from.x);
  const away = toward + Math.PI;
  const open = i.from.y < BURST_ROOM ? Math.PI / 2 : -Math.PI / 2;
  const centre = Math.atan2(Math.sin(open) * 0.8 + Math.sin(away) * 0.2, Math.cos(open) * 0.8 + Math.cos(away) * 0.2);
  const pieces: PiecePlan[] = [];
  for (let j = 0; j < n; j++) {
    const launch = k.anticipation + Math.round(rand() * 24);
    const burstEnd = k.anticipation + k.burst;
    const flight = burstEnd + k.hover + Math.round(j * step);
    const land = Math.min(maxLand, flight + k.flight + Math.round((rand() - 0.5) * 50));
    const fan = (j / Math.max(1, n - 1) - 0.5) * 1.9 + (rand() - 0.5) * 0.4;
    const a = centre + fan;
    const dist = (k.spread[0] + rand() * (k.spread[1] - k.spread[0])) * (1 + 0.1 * tier);
    pieces.push({
      launch,
      burstEnd,
      flight,
      land,
      bx: Math.cos(a) * dist,
      by: Math.sin(a) * dist * 0.85,
      bow: (0.2 + rand() * 0.18) * (rand() < 0.5 ? -1 : 1),
      scale: (i.kind === 'amber' ? 0.86 : 0.7) + rand() * 0.28 + 0.04 * tier,
      spin: (i.kind === 'amber' ? 50 + rand() * 90 : 120 + rand() * 160) * (rand() < 0.5 ? -1 : 1),
    });
  }
  const lands = pieces.map((p) => p.land).sort((a, b) => a - b);
  const lastLand = lands[lands.length - 1]!;
  return {
    ...base,
    pieces,
    anticipation: k.anticipation,
    counts: steps(i.before, after, lands),
    sounds: [{ at: k.anticipation, id: snd.pickup }, ...ticks(snd.tick, lands.slice(0, -1), 10), { at: lastLand + 30, id: snd.chime }],
    landings: lands.map((at, j) => ({ at, last: j === lands.length - 1 })),
    labelIn: lands[0]!,
    labelOut: lastLand + 90,
    end: Math.min(COLLECT_MAX_MS, lastLand + k.tail),
  };
}

// ---------------------------------------------------------------------------------------------
// The art: cached image URLs of the icons, the Dust motes and the glints
// ---------------------------------------------------------------------------------------------

const art = new Map<string, string>();

function svgUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** The currency's icon as an image URL (rendered once with the UI's own icon component). */
function iconUrl(kind: CurrencyKind, size: number): string {
  const key = `icon|${kind}|${size}`;
  const hit = art.get(key);
  if (hit) return hit;
  let url = '';
  try {
    const host = document.createElement('div');
    render(h(kind === 'amber' ? AmberIcon : DustIcon, { size }), host);
    const svg = host.querySelector('svg');
    if (svg) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.removeAttribute('class');
      url = svgUrl(typeof XMLSerializer === 'function' ? new XMLSerializer().serializeToString(svg) : svg.outerHTML);
    }
    render(null, host);
  } catch {
    url = '';
  }
  art.set(key, url);
  return url;
}

/** A Dust mote: a four-pointed star, white at the heart, violet at the tips, in its own soft light. */
function moteUrl(tint: 'violet' | 'pink' | 'cyan'): string {
  const key = `mote|${tint}`;
  const hit = art.get(key);
  if (hit) return hit;
  const rim = tint === 'pink' ? '#ffb8ee' : tint === 'cyan' ? '#a8efff' : '#c9adff';
  const ink = '#3a2290';
  const url = svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
      `<defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#fff"/><stop offset="1" stop-color="${rim}"/></radialGradient>` +
      `<radialGradient id="h"><stop offset="0" stop-color="${rim}" stop-opacity="0.85"/><stop offset="1" stop-color="${rim}" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="16" cy="16" r="15" fill="url(#h)"/>` +
      `<path d="${sparklePath(16, 16, 9.5, 12, 0.22)}" fill="url(#g)" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<path d="${sparklePath(16, 16, 3, 3.8, 0.3)}" fill="#fff"/></svg>`,
  );
  art.set(key, url);
  return url;
}

/** A small glint: the sparkle Dust sheds as it flies and both currencies throw on the final landing. */
function glintUrl(color: string): string {
  const key = `glint|${color}`;
  const hit = art.get(key);
  if (hit) return hit;
  const url = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="${sparklePath(8, 8, 7.5, 7.5, 0.18)}" fill="${color}"/></svg>`);
  art.set(key, url);
  return url;
}

const PIECE_PX = { amber: 28, dust: 24 } as const;
const SPARK_COLORS = { amber: ['#fff4c8', '#ffc94a'], dust: ['#ffd2f6', '#bff4ff', '#efe6ff'] } as const;
const GLINT_COLORS = ['#ffd6f6', '#f3ecff'] as const;

/**
 * The art as bitmaps at the screen's pixel density, once primed: an SVG image is painted on the main thread the
 * first time it shows (a long frame on a slow phone as a dozen pieces appear), a decoded bitmap is not.
 */
const bitmaps = new Map<string, string>();

function bitmap(url: string, css: number): string {
  return bitmaps.get(`${css}|${url}`) ?? url;
}

/** A canvas as a PNG URL, or '' where the browser will not give one (a tainted canvas). */
function pngOf(canvas: HTMLCanvasElement): string {
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

function rasterize(url: string, css: number): Promise<void> {
  const key = `${css}|${url}`;
  if (!url || bitmaps.has(key) || typeof Image !== 'function') return Promise.resolve();
  const im = new Image();
  im.src = url;
  const ready = typeof im.decode === 'function' ? im.decode() : Promise.reject(new Error('no decode'));
  return ready.then(
    () => {
      const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? Math.min(3, window.devicePixelRatio) : 1;
      // room for the pieces' largest scale (about 1.4 with the burst's pop) without blur
      const px = Math.ceil(css * dpr * 1.4);
      const canvas = document.createElement('canvas');
      canvas.width = px;
      canvas.height = px;
      const g = canvas.getContext('2d');
      if (!g) return;
      g.drawImage(im, 0, 0, px, px);
      const out = pngOf(canvas);
      if (!out) return;
      bitmaps.set(key, out);
      const warm = new Image();
      warm.src = out;
      warm.decode?.().catch(() => undefined);
    },
    () => undefined,
  );
}

let primed: Promise<void> | null = null;

/**
 * Draws, rasterizes and decodes the moment's pictures ahead (the app does it after boot, a screen that can play a
 * moment when it first shows), so no moment pays for them in its first frames. Safe to call again.
 */
export function primeCollectArt(): Promise<void> {
  if (primed) return primed;
  if (typeof document === 'undefined' || typeof Image !== 'function') return Promise.resolve();
  const jobs: [string, number][] = [
    [iconUrl('amber', PIECE_PX.amber), PIECE_PX.amber],
    [iconUrl('amber', 26), 26],
    [iconUrl('dust', 26), 26],
    [moteUrl('violet'), PIECE_PX.dust],
    [moteUrl('pink'), PIECE_PX.dust],
    [moteUrl('cyan'), PIECE_PX.dust],
    ...[...SPARK_COLORS.amber, ...SPARK_COLORS.dust].map((col): [string, number] => [glintUrl(col), 10]),
    ...GLINT_COLORS.map((col): [string, number] => [glintUrl(col), 12]),
  ];
  primed = Promise.all(jobs.map(([u, css]) => rasterize(u, css))).then(() => undefined);
  return primed;
}

/** Primes the art soon, off the current task (a screen's first render must not pay for it). */
function primeSoon(): void {
  if (primed || typeof window === 'undefined') return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(() => void primeCollectArt(), { timeout: 1000 });
  else setTimeout(() => void primeCollectArt(), 50);
}

// ---------------------------------------------------------------------------------------------
// Playing a plan in the DOM
// ---------------------------------------------------------------------------------------------

export interface CollectOptions {
  kind: CurrencyKind;
  /** The exact amount earned or spent. Zero or less plays nothing. */
  amount: number;
  /**
   * Earn: where the pieces burst from (the reward on screen). Spend: what the pieces fly into (the card being
   * upgraded, the flag being bought). Several sources share the pieces.
   */
  from: Element | DOMRect | readonly (Element | DOMRect)[];
  /** The wallet after the change (the save's value): the counter ends on it. */
  total: number;
  mode?: CollectMode;
  /** The UI root to play in; default the closest `.ui-root` or `.ab-root` of `from`, else the page. */
  root?: HTMLElement | null;
  /** The UI sound hook (`kit.sound`). */
  sound?: ((id: string, o?: { pitchBp?: number }) => void) | undefined;
  /** The player's Reduce motion setting; the OS preference and the root's `data-reduce-motion` also count. */
  reduce?: boolean;
  locale?: string;
  /** Waits this long before starting (for a source still landing). */
  delay?: number;
  seed?: number;
  /** The counter label for the wallet chip's accessible name ("Amber"). */
  label?: string;
  /** Called once when the last piece arrives (spend: the purchase may react). */
  onArrive?: () => void;
}

interface Scheduler {
  now(): number;
  frame(cb: (t: number) => void): number;
  cancel(id: number): void;
  /**
   * Dev captures only: the browser does not play the moment's animations; each frame sets every one to the
   * scheduler's time, so a capture steps a moment frame by frame whatever the machine's load.
   */
  drive?: boolean;
}

const browserScheduler: Scheduler = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  frame: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

let scheduler: Scheduler | null = null;

/** Test and capture hook: drive moments with a fake clock and frame queue (null restores the browser's). */
export function setCollectScheduler(s: Scheduler | null): void {
  scheduler = s;
}

type SoundHook = (id: string, o?: { pitchBp?: number }) => void;

let soundTap: SoundHook | null = null;

/** Capture hook: hears every sound a moment plays, as it plays (a dev capture logs them for its sound track). */
export function setCollectSoundTap(f: SoundHook | null): void {
  soundTap = f;
}

/** Animations a driving scheduler sets by hand: each with the scheduler time it was made at. */
const driven: { a: Animation; t0: number }[] = [];

/** Starts a Web Animation; under a driving scheduler it is paused and set by {@link driveCollects}. */
function anim(target: Element, kf: Keyframe[], opts: KeyframeAnimationOptions): Animation | null {
  if (typeof (target as HTMLElement).animate !== 'function') return null;
  const a = (target as HTMLElement).animate(kf, opts);
  const s = scheduler;
  if (s?.drive) {
    a.pause();
    a.currentTime = 0;
    driven.push({ a, t0: s.now() });
  }
  return a;
}

/** A driving scheduler's frame: every moment animation to the scheduler's time (dev captures). */
export function driveCollects(): void {
  const s = scheduler;
  if (!s?.drive) return;
  const now = s.now();
  for (let i = driven.length - 1; i >= 0; i--) {
    const d = driven[i]!;
    try {
      const target = (d.a.effect as KeyframeEffect | null)?.target;
      // a cancelled animation of a removed piece must not come back
      if (d.a.playState === 'idle' || (target && !target.isConnected)) {
        driven.splice(i, 1);
        continue;
      }
      const t = Math.max(0, now - d.t0);
      const endTime = Number(d.a.effect?.getComputedTiming().endTime ?? 0);
      if (t >= endTime) {
        // finished as in the browser: its fill holds, and its `finished` promise runs (the wallet chip leaves)
        d.a.finish();
        driven.splice(i, 1);
      } else d.a.currentTime = t;
    } catch {
      driven.splice(i, 1);
    }
  }
}

/**
 * Runs `cb` after `ms` and returns its cancel: on a driving scheduler's clock (a capture steps it, so a delayed
 * Dust and the wallet chip's exit land on the same frame every time), else on a timer.
 */
function later(ms: number, cb: () => void): () => void {
  const s = scheduler;
  if (s?.drive) {
    const until = s.now() + ms;
    let live = true;
    let id = 0;
    const poll = (): void => {
      if (!live) return;
      if (s.now() >= until) cb();
      else id = s.frame(poll);
    };
    id = s.frame(poll);
    return () => {
      live = false;
      s.cancel(id);
    };
  }
  const id = setTimeout(cb, ms);
  return () => clearTimeout(id);
}

function sched(): Scheduler | null {
  if (scheduler) return scheduler;
  return typeof requestAnimationFrame === 'function' ? browserScheduler : null;
}

interface Running {
  kind: CurrencyKind;
  finish(): void;
}

const running = new Set<Running>();

function onSkipKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') finishAllCollects();
}

function onSkipPointer(): void {
  finishAllCollects();
}

function listen(on: boolean): void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  if (on) {
    window.addEventListener('pointerdown', onSkipPointer, { capture: true, passive: true });
    window.addEventListener('keydown', onSkipKey, true);
  } else {
    window.removeEventListener('pointerdown', onSkipPointer, { capture: true });
    window.removeEventListener('keydown', onSkipKey, true);
  }
}

/** Jumps every running moment to its end state (a tap, a key, or a screen that leaves). */
export function finishAllCollects(): void {
  for (const r of [...running]) r.finish();
}

/** How many moments are playing (tests and the dev lab). */
export function collectsRunning(): number {
  return running.size;
}

function rectOf(x: Element | DOMRect): DOMRect {
  return 'getBoundingClientRect' in x ? x.getBoundingClientRect() : x;
}

function centre(r: DOMRect, base: DOMRect): { x: number; y: number } {
  return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
}

function rootOf(o: CollectOptions): HTMLElement | null {
  if (o.root) return o.root;
  const list = Array.isArray(o.from) ? o.from : [o.from];
  for (const f of list) {
    const el = f as Element;
    if (el && typeof el.closest === 'function') {
      const r = el.closest('.ui-root, .ab-root');
      if (r) return r as HTMLElement;
    }
  }
  if (typeof document === 'undefined') return null;
  return (document.querySelector('.ui-root') as HTMLElement | null) ?? document.body;
}

/** A counter chip of `kind` the player can see in `root` (not covered, not scrolled away). */
export function visibleCounter(root: HTMLElement, kind: CurrencyKind): HTMLElement | null {
  const list = root.querySelectorAll(`[data-currency-counter="${kind}"]`);
  const box = root.getBoundingClientRect();
  for (const node of Array.from(list)) {
    const el = node as HTMLElement;
    if (el.closest('.ui-collect')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom) continue;
    const doc = el.ownerDocument;
    if (doc && typeof doc.elementFromPoint === 'function') {
      const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) continue;
    }
    return el;
  }
  return null;
}

// DOM helpers kept to the subset the UI tests' small DOM has (`screens/test/dom.ts`): attributes, children, text.
function el(tag: string, cls: string, parent?: HTMLElement): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.setAttribute('class', cls);
  if (parent) parent.appendChild(e);
  return e;
}

function hasClass(e: Element, cls: string): boolean {
  return ` ${e.getAttribute('class') ?? ''} `.includes(` ${cls} `);
}

function setText(e: Element, text: string): void {
  while (e.firstChild) e.removeChild(e.firstChild);
  e.appendChild(document.createTextNode(text));
}

function detach(e: Element): void {
  e.parentNode?.removeChild(e);
}

/** The moment layer: one per root, above the screens and toasts, never taking input. */
function layerOf(root: HTMLElement): HTMLElement {
  for (const c of Array.from(root.children)) if (hasClass(c, 'ui-collect')) return c as HTMLElement;
  const l = el('div', 'ui-collect', root);
  l.setAttribute('aria-hidden', 'true');
  l.setAttribute('data-testid', 'collect-layer');
  return l;
}

interface Wallet {
  chip: HTMLElement;
  icon: HTMLElement;
  value: HTMLElement;
  users: number;
  leave: (() => void) | null;
}

const wallets = new WeakMap<HTMLElement, Map<CurrencyKind, Wallet>>();

/**
 * The wallet bar of a layer: a slot per currency in Home's order (Amber, then Dust), each as wide as a counter,
 * so a chip that drops in later never moves one already there (its pieces are flying to where it stands).
 */
function walletBar(layer: HTMLElement): HTMLElement {
  for (const c of Array.from(layer.children)) if (hasClass(c, 'ui-collect__wallet')) return c as HTMLElement;
  const bar = el('div', 'ui-collect__wallet', layer);
  for (const kind of ['amber', 'dust'] as const) el('span', `ui-collect__slot ui-collect__slot--${kind}`, bar).setAttribute('data-slot', kind);
  return bar;
}

/**
 * The wallet chip of `kind`: a counter like Home's that drops in at the top right of a screen that has none,
 * for the moment, and leaves after it.
 */
function walletChip(layer: HTMLElement, kind: CurrencyKind, value: string, label: string, reduce: boolean): Wallet {
  let byKind = wallets.get(layer);
  if (!byKind) {
    byKind = new Map();
    wallets.set(layer, byKind);
  }
  const had = byKind.get(kind);
  if (had && had.chip.parentNode) {
    had.leave?.();
    had.leave = null;
    had.users++;
    return had;
  }
  const bar = walletBar(layer);
  const slot = Array.from(bar.children).find((c) => c.getAttribute('data-slot') === kind) as HTMLElement | undefined;
  const chip = el('span', `ui-chip ui-chip--${kind} ui-collect__chip ui-collect__chip--${kind}`, slot ?? bar);
  chip.setAttribute('data-testid', `collect-wallet-${kind}`);
  chip.setAttribute('role', 'status');
  chip.setAttribute('aria-label', label);
  const icon = el('span', 'ui-chip__icon', chip);
  const img = el('img', '', icon) as HTMLImageElement;
  img.alt = '';
  img.width = 26;
  img.height = 26;
  img.src = bitmap(iconUrl(kind, 26), 26);
  const v = el('span', 'ui-chip__value ui-num', chip);
  setText(v, value);
  const w: Wallet = { chip, icon, value: v, users: 1, leave: null };
  byKind.set(kind, w);
  anim(chip, reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-14px) scale(0.86)' }, { opacity: 1, transform: 'none' }], {
    duration: reduce ? FADE : MOTION_DUR.small,
    easing: ease('enter'),
  });
  return w;
}

function releaseWallet(layer: HTMLElement, kind: CurrencyKind, hold: number, reduce: boolean): void {
  const w = wallets.get(layer)?.get(kind);
  if (!w) return;
  w.users--;
  if (w.users > 0) return;
  w.leave?.();
  w.leave = later(hold, () => {
    if (w.users > 0) return;
    wallets.get(layer)?.delete(kind);
    const gone = () => {
      detach(w.chip);
      // the bar goes with its last chip
      const bar = layer.querySelector('.ui-collect__wallet');
      if (bar && !bar.querySelector('.ui-collect__chip')) detach(bar);
    };
    const a = anim(w.chip, reduce ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px) scale(0.9)' }], {
      duration: reduce ? FADE : MOTION_DUR.smallOut,
      easing: ease('exit'),
      fill: 'forwards',
    });
    if (a) a.finished.then(gone, gone);
    else gone();
  });
}

/**
 * Where an element of the wallet bar stands once its drop-in has settled, in viewport px: the bar's box (it never
 * moves) plus the element's layout offsets inside it, which no running transform changes.
 */
function settledRect(e: HTMLElement, bar: HTMLElement): DOMRect {
  const b = bar.getBoundingClientRect();
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = e;
  while (n && n !== bar) {
    x += n.offsetLeft || 0;
    y += n.offsetTop || 0;
    n = n.offsetParent as HTMLElement | null;
  }
  const w = e.offsetWidth || 0;
  const h = e.offsetHeight || 0;
  if (n !== bar || (!w && !h)) return e.getBoundingClientRect();
  return { left: b.left + x, top: b.top + y, width: w, height: h, right: b.left + x + w, bottom: b.top + y + h, x: b.left + x, y: b.top + y, toJSON: () => ({}) } as DOMRect;
}

const CURVE = {
  out: bezier(...(MOTION_EASE.out.map((n) => n / 1000) as [number, number, number, number])),
  standard: bezier(...(MOTION_EASE.standard.map((n) => n / 1000) as [number, number, number, number])),
};

type Pt = { x: number; y: number };

/**
 * The control point of a piece's arc from `a` to `b`. Earning: the piece first keeps going the way the burst
 * threw it, then turns into the counter (a toss, so the pieces fan out and converge). Spending: the arc bows
 * up the screen by `bow` of its length, or, for a negative bow, a little the other way. The point is kept
 * inside the layer, and a quadratic arc stays within its three points, so no piece leaves the screen.
 */
function controlPoint(a: Pt, b: Pt, pc: PiecePlan, mode: CollectMode, w: number, h: number): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let c: Pt;
  if (mode === 'earn') {
    const bl = Math.hypot(pc.bx, pc.by);
    const ux = bl > 0.5 ? pc.bx / bl : 0;
    const uy = bl > 0.5 ? pc.by / bl : -1;
    const k = len * (0.28 + 0.5 * Math.abs(pc.bow));
    c = { x: a.x + dx * 0.3 + ux * k, y: a.y + dy * 0.3 + uy * k };
  } else {
    let nx = -dy / len;
    let ny = dx / len;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const k = len * pc.bow * (pc.bow < 0 ? 0.6 : 1);
    c = { x: (a.x + b.x) / 2 + nx * k, y: (a.y + b.y) / 2 + ny * k };
  }
  return { x: clamp(c.x, 6, Math.max(6, w - 6)), y: clamp(c.y, 6, Math.max(6, h - 6)) };
}

/** The point at `u` (0 to 1) on the quadratic arc from `a` over `c` to `b`. */
function quad(a: Pt, c: Pt, b: Pt, u: number): Pt {
  const v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y };
}

interface Sample {
  t: number;
  p: Pt;
  s: number;
  r: number;
  o: number;
}

/** A piece's path over its life, sampled for its keyframes (times in ms from the moment's start; `w` x `h` the layer). */
function pieceSamples(pc: PiecePlan, from: Pt, to: Pt, kind: CurrencyKind, mode: CollectMode, w: number, h: number): Sample[] {
  const out: Sample[] = [];
  const s = pc.scale;
  if (mode === 'spend') {
    const c = controlPoint(from, to, pc, mode, w, h);
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const e = CURVE.standard(u);
      out.push({ t: pc.flight + (pc.land - pc.flight) * u, p: quad(from, c, to, e), s: s * (u < 0.15 ? 0.5 + u * 3.4 : 1 - 0.45 * e), r: pc.spin * e, o: u < 0.08 ? u / 0.08 : u > 0.9 ? (1 - u) / 0.1 : 1 });
    }
    return out;
  }
  // the burst stays inside the layer (a reward by the screen's edge bursts along it)
  const edge = 18;
  const bx = w > 2 * edge ? clamp(from.x + pc.bx, edge, w - edge) - from.x : pc.bx;
  const by = h > 2 * edge ? clamp(from.y + pc.by, edge, h - edge) - from.y : pc.by;
  const burstTo = { x: from.x + bx, y: from.y + by };
  // the burst: out of the source and decelerating, popping to size (0.35 -> 1.08 -> 1)
  for (let k = 0; k <= 5; k++) {
    const u = k / 5;
    const e = CURVE.out(u);
    const pop = u < 0.7 ? 0.35 + (1.08 - 0.35) * (u / 0.7) : 1.08 - 0.08 * ((u - 0.7) / 0.3);
    out.push({ t: pc.launch + (pc.burstEnd - pc.launch) * u, p: { x: from.x + bx * e, y: from.y + by * e }, s: s * pop, r: pc.spin * 0.25 * e, o: Math.min(1, u * 3) });
  }
  // the beat: it hangs (Dust drifts up a little, turning)
  if (pc.flight > pc.burstEnd) {
    const lift = kind === 'dust' ? -5 : -2;
    out.push({ t: pc.flight, p: { x: burstTo.x, y: burstTo.y + lift }, s, r: pc.spin * 0.3, o: 1 });
  }
  const start = pc.flight > pc.burstEnd ? { x: burstTo.x, y: burstTo.y + (kind === 'dust' ? -5 : -2) } : burstTo;
  const c = controlPoint(start, to, { ...pc, bx, by }, mode, w, h);
  // the flight: drawn into the counter on its arc, speeding up all the way (it sets off at once, so it never
  // seems to hang) and shrinking as it goes in
  const N = 14;
  for (let k = 1; k <= N; k++) {
    const u = k / N;
    const e = u ** 1.7;
    const twinkle = kind === 'dust' ? 1 + 0.18 * Math.sin(u * Math.PI * 5) : 1;
    out.push({
      t: pc.flight + (pc.land - pc.flight) * u,
      p: quad(start, c, to, e),
      s: s * (1 - 0.42 * e) * twinkle,
      r: pc.spin * (0.3 + 0.7 * e),
      o: u > 0.93 ? Math.max(0, (1 - u) / 0.07) : 1,
    });
  }
  return out;
}

function frames(samples: readonly Sample[], t0: number, t1: number): Keyframe[] {
  const span = Math.max(1, t1 - t0);
  return samples.map((x) => ({
    offset: Math.max(0, Math.min(1, (x.t - t0) / span)),
    transform: `translate(${x.p.x.toFixed(1)}px, ${x.p.y.toFixed(1)}px) rotate(${x.r.toFixed(1)}deg) scale(${x.s.toFixed(3)})`,
    opacity: Number(x.o.toFixed(3)),
  }));
}

/** The light trail behind a piece in flight: a streak along its velocity, longer the faster it goes. */
function trailFrames(samples: readonly Sample[], from: number, t0: number, t1: number, maxLen: number): Keyframe[] {
  const fl = samples.filter((x) => x.t >= from);
  const span = Math.max(1, t1 - t0);
  const out: Keyframe[] = [];
  let ang = 0;
  for (let k = 0; k < fl.length; k++) {
    const a = fl[Math.max(0, k - 1)]!;
    const b = fl[Math.min(fl.length - 1, k + 1)]!;
    const dx = b.p.x - a.p.x;
    const dy = b.p.y - a.p.y;
    const dt = Math.max(1, b.t - a.t);
    const speed = Math.hypot(dx, dy) / dt;
    if (Math.hypot(dx, dy) > 0.5) {
      let next = (Math.atan2(dy, dx) * 180) / Math.PI;
      while (next - ang > 180) next -= 360;
      while (next - ang < -180) next += 360;
      ang = next;
    }
    const len = Math.max(0.04, Math.min(1, (speed * 18) / maxLen));
    const x = fl[k]!;
    const u = (x.t - from) / Math.max(1, t1 - from);
    out.push({
      offset: Math.max(0, Math.min(1, (x.t - t0) / span)),
      transform: `translate(${x.p.x.toFixed(1)}px, ${x.p.y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg) scaleX(${len.toFixed(3)})`,
      opacity: Number((u < 0.15 ? u / 0.15 : u > 0.9 ? Math.max(0, (1 - u) / 0.1) : 1).toFixed(3)) * 0.9,
    });
  }
  if (out.length && (out[0]!.offset as number) > 0) out.unshift({ ...out[0]!, offset: 0, opacity: 0 });
  return out;
}

/** The moment that last took each counter: only it may hand the counter back to the save. */
const owner: Record<CurrencyKind, object | null> = { amber: null, dust: null };

/**
 * Hands a counter back to the save's value. In a browser it waits a task, so a moment chained on this one's
 * end (a spend, then what it paid back) takes the counter over without the save's total flashing between.
 */
function release(kind: CurrencyKind, who: object, defer: boolean): void {
  const go = () => {
    if (owner[kind] !== who) return;
    owner[kind] = null;
    setOverride(kind, null);
  };
  if (defer && typeof setTimeout === 'function') setTimeout(go, 0);
  else go();
}

/**
 * Plays the collect moment (or, with `mode: 'spend'`, its short reverse). Call it after the save holds the
 * change, with the save's new total; it never changes the save. Returns a handle whose `finish()` jumps to
 * the end state.
 */
export function collectCurrency(o: CollectOptions): MotionHandle {
  const amount = Math.max(0, Math.round(o.amount));
  const mode = o.mode ?? 'earn';
  const kind = o.kind;
  const before = mode === 'earn' ? o.total - amount : o.total + amount;
  if (amount <= 0) return { done: Promise.resolve(), finish() {}, cancel() {} };
  // The counter holds the old value from this moment on (the save already has the new one).
  for (const r of [...running]) if (r.kind === kind) r.finish();
  owner[kind] = o;
  setOverride(kind, Math.max(0, before));
  let resolve: () => void = () => {};
  const done = new Promise<void>((r) => (resolve = r));
  const s = sched();
  const root = typeof document !== 'undefined' ? rootOf(o) : null;
  // Where the sources are now: a claim re-renders its row (a claimed quest, a road node) before the moment's
  // first frame, and may take the reward away; the moment then starts from where it was.
  const sources = (Array.isArray(o.from) ? o.from : [o.from]).filter(Boolean) as (Element | DOMRect)[];
  const snap = root ? sources.map(rectOf) : [];
  let ended = false;
  let cleanup: ((skipped: boolean) => void) | null = null;
  let frameId = 0;
  let cancelDelay: (() => void) | null = null;
  // the wallet chip this moment holds (set below, once there is a page to show it in)
  let wallet: Wallet | null = null;
  let letWalletGo = (_skipped: boolean): void => {};

  const me: Running = {
    kind,
    finish: () => end(true),
  };
  const end = (skipped: boolean): void => {
    if (ended) return;
    ended = true;
    cancelDelay?.();
    if (s && frameId) s.cancel(frameId);
    if (cleanup) cleanup(skipped);
    else if (wallet) {
      // finished before its first frame (a tap in its delay): the wallet shows the true total, then goes
      setText(wallet.value, formatInt(Math.max(0, o.total), o.locale ?? 'en'));
      letWalletGo(skipped);
    }
    release(kind, o, !!s);
    running.delete(me);
    if (!running.size) listen(false);
    resolve();
  };
  running.add(me);
  if (running.size === 1) listen(true);
  if (!s || !root || typeof document === 'undefined') {
    // No browser (tests, a renderer-less shell): the end state at once; the chime still marks it.
    const id = mode === 'earn' ? COLLECT_SOUND[kind].chime : COLLECT_SOUND[kind].spend;
    o.sound?.(id);
    soundTap?.(id);
    end(false);
    return { done, finish: () => end(true), cancel: () => end(true) };
  }

  // The counter it flies to, chosen now: the screen's own chip, or the wallet chip, which drops in at once, so
  // Amber and Dust asked for together (Dust a beat later) share a wallet whose chips never move under a flight.
  const reduce = o.reduce === true || reducedMotion(root);
  const layer = layerOf(root);
  const label = o.label ?? kind;
  const locale = o.locale ?? 'en';
  const chip = visibleCounter(root, kind);
  wallet = chip ? null : walletChip(layer, kind, formatInt(Math.max(0, before), locale), label, reduce);
  let walletHeld = wallet !== null;
  letWalletGo = (skipped: boolean): void => {
    if (!walletHeld) return;
    walletHeld = false;
    releaseWallet(layer, kind, skipped ? 420 : 360, reduce);
  };
  const held = wallet;

  // It starts a frame later than asked: the frame that asks (a claim's tap, the Result's timer) has already
  // placed the wallet chip and read the layout, and the moment's own setup then gets a frame of its own.
  const start = (): void => {
    if (ended) return;
    frameId = s.frame(() => {
      if (ended) return;
      frameId = s.frame(() => {
        if (ended) return;
        cleanup = play();
      });
    });
  };

  const play = (): ((skipped: boolean) => void) => {
    const base = layer.getBoundingClientRect();
    const srcRects = sources.map((src, i) => {
      if ('getBoundingClientRect' in src && (src as Element).isConnected !== false) {
        const r = src.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) return r;
      }
      return snap[i] ?? rectOf(src);
    });
    const counterEl = chip ?? held!.chip;
    const iconEl = (counterEl.querySelector('.ui-chip__icon') as HTMLElement | null) ?? counterEl;
    const valueEl = (counterEl.querySelector('.ui-chip__value') as HTMLElement | null) ?? counterEl;
    // the wallet chip may still be dropping in: aim at where it settles
    const bar = held ? (layer.querySelector('.ui-collect__wallet') as HTMLElement | null) : null;
    const counterRect = bar ? settledRect(counterEl, bar) : counterEl.getBoundingClientRect();
    const iconRect = bar ? settledRect(iconEl, bar) : iconEl.getBoundingClientRect();
    const target = iconRect.width > 0 ? centre(iconRect, base) : centre(counterRect, base);
    const src0 = srcRects[0] ? centre(srcRects[0], base) : target;
    const plan = planCollect({
      kind,
      mode,
      amount,
      before: Math.max(0, before),
      reduce,
      from: mode === 'earn' ? src0 : target,
      to: mode === 'earn' ? target : src0,
      seed: o.seed ?? amount * 7919 + (kind === 'dust' ? 104729 : 0) + Math.round(src0.x) * 31,
    });
    const group = el('div', `ui-collect__moment ui-collect--${kind} ui-collect--${mode}`, layer);
    group.setAttribute('data-testid', `collect-${kind}`);
    group.setAttribute('data-mode', mode);
    const anims: Animation[] = [];
    // effects made in a later frame (Dust's sparkles, the landing) give their delays from the moment's start:
    // `fxAt` is the moment's time when they are made
    let fxAt = 0;
    const add = (target: Element, kf: Keyframe[], opts: KeyframeAnimationOptions): Animation | null => {
      if (typeof (target as HTMLElement).animate !== 'function') return null;
      const a = anim(target, kf, { fill: 'both', ...opts, delay: Math.max(0, Number(opts.delay ?? 0) - fxAt) });
      if (!a) return null;
      anims.push(a);
      return a;
    };
    const writeCount = (v: number): void => {
      if (chip) setOverride(kind, v);
      else setText(valueEl, formatInt(v, locale));
    };

    // The source: a dip and a pop before the burst (earn); a glow under Reduce motion
    if (mode === 'earn') {
      for (const src of sources) {
        if (!('getBoundingClientRect' in src)) continue;
        if (reduce) add(src, [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 300, easing: ease('out'), fill: 'none' });
        else
          add(
            src,
            [
              { transform: 'scale(1)' },
              { transform: 'scale(0.9)', offset: 0.32, easing: ease('anticipate') },
              { transform: 'scale(1.12)', offset: 0.6 },
              { transform: 'scale(1)' },
            ],
            { duration: plan.anticipation + 190, easing: 'linear', fill: 'none' },
          );
      }
    }

    // The pieces and their trails (made now: the burst starts in 90 ms)
    const px = PIECE_PX[kind];
    const pieceUrl = kind === 'amber' ? bitmap(iconUrl('amber', px), px) : '';
    const dustTints = ['violet', 'violet', 'pink', 'violet', 'cyan'] as const;
    const paths: Sample[][] = [];
    plan.pieces.forEach((pc, j) => {
      const srcRect = srcRects[j % Math.max(1, srcRects.length)];
      const srcPt = srcRect ? centre(srcRect, base) : src0;
      const a = mode === 'earn' ? srcPt : target;
      const b = mode === 'earn' ? target : srcPt;
      const samples = pieceSamples(pc, a, b, kind, mode, base.width, base.height);
      paths.push(samples);
      const t0 = samples[0]!.t;
      const t1 = samples[samples.length - 1]!.t;
      const piece = el('i', 'ui-collect__piece', group);
      piece.style.setProperty('--s', `${px}px`);
      const img = el('img', '', piece) as HTMLImageElement;
      img.alt = '';
      img.src = kind === 'amber' ? pieceUrl : bitmap(moteUrl(dustTints[j % dustTints.length]!), px);
      add(piece, frames(samples, t0, t1), { duration: t1 - t0, delay: t0, easing: 'linear' });
    });
    // their light trails, made in the next frame (they show only once the pieces set off, at 260 ms or later)
    const buildTrails = (): void => {
      plan.pieces.forEach((pc, j) => {
        const samples = paths[j]!;
        const t0 = samples[0]!.t;
        const t1 = samples[samples.length - 1]!.t;
        const trail = el('i', 'ui-collect__trail', group);
        add(trail, trailFrames(samples, pc.flight, t0, t1, kind === 'dust' ? 84 : 70), { duration: t1 - t0, delay: t0, easing: 'linear' });
      });
    };

    // Dust's shed sparkles: made as the motes set off (a later frame, so the first one stays light)
    const buildGlints = (): void => {
      plan.pieces.forEach((pc, j) => {
        const samples = paths[j]!;
        for (const at of [0.38, 0.7]) {
          const sm = samples.find((x) => x.t >= pc.flight + (pc.land - pc.flight) * at) ?? samples[samples.length - 1]!;
          const g = el('i', 'ui-collect__glint', group);
          const gx = sm.p.x + (j % 2 ? 5 : -5);
          const gy = sm.p.y + 4;
          const gi = el('img', '', g) as HTMLImageElement;
          gi.alt = '';
          gi.src = bitmap(glintUrl(GLINT_COLORS[j % 3 === 0 ? 0 : 1]), 12);
          add(
            g,
            [
              { transform: `translate(${gx}px, ${gy}px) scale(0.2) rotate(0deg)`, opacity: 0 },
              { transform: `translate(${gx}px, ${gy + 3}px) scale(1) rotate(45deg)`, opacity: 1, offset: 0.35 },
              { transform: `translate(${gx}px, ${gy + 8}px) scale(0.15) rotate(90deg)`, opacity: 0 },
            ],
            { duration: 380, delay: sm.t, easing: ease('out') },
          );
        }
      });
    };

    // The "+N" (or "−N") under the counter, as a small badge so it reads over any screen
    const delta = el('span', `ui-collect__delta ui-collect__delta--${mode}`, group);
    delta.setAttribute('data-testid', `collect-delta-${kind}`);
    setText(delta, `${mode === 'earn' ? '+' : '−'}${formatInt(amount, locale)}`);
    const cb = counterRect;
    delta.style.left = `${(cb.left + cb.width / 2 - base.left).toFixed(1)}px`;
    delta.style.top = `${(cb.bottom - base.top + 4).toFixed(1)}px`;
    add(
      delta,
      reduce
        ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
        : [
            { opacity: 0, transform: 'translate(-50%, 6px) scale(0.6)' },
            { opacity: 1, transform: 'translate(-50%, 0) scale(1.12)', offset: 0.18 },
            { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.32 },
            { opacity: 1, transform: 'translate(-50%, -4px) scale(1)', offset: 0.8 },
            { opacity: 0, transform: 'translate(-50%, -12px) scale(1)' },
          ],
      { duration: plan.labelOut + FADE - plan.labelIn, delay: plan.labelIn, easing: 'linear' },
    );

    // Landing effects, made shortly before the first landing: a ring per landing (every other one when many
    // land), the last one bigger with sparks and a glow; a spend's ring and flash where the pieces arrive
    const ringAt = (at: number, big: boolean, where: Pt = target): void => {
      const ring = el('i', `ui-collect__ring${big ? ' is-big' : ''}`, group);
      ring.style.left = `${where.x.toFixed(1)}px`;
      ring.style.top = `${where.y.toFixed(1)}px`;
      add(
        ring,
        reduce
          ? [{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }]
          : [
              { transform: 'scale(0.45)', opacity: 0.95 },
              { transform: `scale(${big ? 1.5 + 0.15 * plan.tier : 1.15})`, opacity: 0 },
            ],
        // `forwards`: a ring waiting for its landing must not show its first frame on the counter meanwhile
        { duration: reduce ? 420 : big ? 420 : 300, delay: at, easing: ease('out'), fill: 'forwards' },
      );
    };
    const lastAt = plan.landings[plan.landings.length - 1]?.at ?? 0;
    const arrive = plan.pieces.length ? Math.max(...plan.pieces.map((p) => p.land)) : 0;
    const buildLanding = (): void => {
      const many = plan.landings.length > 7;
      plan.landings.forEach((l, j) => {
        if (l.last || !many || j % 2 === 0) ringAt(l.at, l.last);
      });
      if (mode === 'spend' && plan.pieces.length) {
        ringAt(arrive - 40, false, src0);
        const flash = el('i', 'ui-collect__glow', group);
        flash.style.left = `${src0.x.toFixed(1)}px`;
        flash.style.top = `${src0.y.toFixed(1)}px`;
        add(flash, [{ opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { opacity: 0 }], { duration: 300, delay: arrive - 60, easing: ease('out'), fill: 'forwards' });
      }
      if (mode !== 'earn') return;
      const glow = el('i', 'ui-collect__glow', group);
      glow.style.left = `${target.x.toFixed(1)}px`;
      glow.style.top = `${target.y.toFixed(1)}px`;
      add(glow, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: (reduce ? 500 : 360) + 40 * plan.tier, delay: reduce ? plan.labelIn : lastAt - 40, easing: ease('out') });
      if (reduce) return;
      const colors = SPARK_COLORS[kind];
      const sparks = 6 + 2 * plan.tier;
      for (let k = 0; k < sparks; k++) {
        const sp = el('i', 'ui-collect__spark', group);
        const sp2 = el('img', '', sp) as HTMLImageElement;
        sp2.alt = '';
        sp2.src = bitmap(glintUrl(colors[k % colors.length]!), 10);
        const ang = (k / sparks) * Math.PI * 2 + 0.4;
        const d = 18 + 6 * plan.tier + (k % 2) * 8;
        const x0 = target.x;
        const y0 = target.y;
        add(
          sp,
          [
            { transform: `translate(${x0}px, ${y0}px) scale(0.4)`, opacity: 1 },
            { transform: `translate(${(x0 + Math.cos(ang) * d).toFixed(1)}px, ${(y0 + Math.sin(ang) * d).toFixed(1)}px) scale(1) rotate(60deg)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${(x0 + Math.cos(ang) * d * 1.25).toFixed(1)}px, ${(y0 + Math.sin(ang) * d * 1.25 + 4).toFixed(1)}px) scale(0.2) rotate(110deg)`, opacity: 0 },
          ],
          { duration: kind === 'dust' ? 460 : 360, delay: lastAt, easing: ease('out'), fill: 'forwards' },
        );
      }
    };
    let trailsAt = plan.pieces.length ? 0 : Infinity;
    let glintsAt = kind === 'dust' && mode === 'earn' && plan.pieces.length ? Math.min(...plan.pieces.map((p) => p.flight)) - 40 : Infinity;
    let landingAt = Math.max(0, (mode === 'spend' ? arrive - 40 : (plan.landings[0]?.at ?? 0)) - 150);
    const buildDue = (t: number): void => {
      if (t >= trailsAt) {
        trailsAt = Infinity;
        fxAt = t;
        buildTrails();
        fxAt = 0;
      }
      if (t >= glintsAt) {
        glintsAt = Infinity;
        fxAt = t;
        buildGlints();
        fxAt = 0;
      }
      if (t >= landingAt) {
        landingAt = Infinity;
        fxAt = t;
        buildLanding();
        fxAt = 0;
      }
    };

    // The timeline: counts, pulses and sounds, on one frame loop
    const t0 = s.now();
    let ci = 0;
    let si = 0;
    let li = 0;
    let arrived = false;
    const iconOrigin = iconEl.style.transformOrigin;
    iconEl.style.transformOrigin = '50% 62%';
    // a landing squashes the icon; when pieces land close together it keeps squashing rather than restarting
    // each time (a buzz), so a new small pulse waits until the last one is mostly through
    let pulsedAt = -Infinity;
    const pulse = (last: boolean, at: number): void => {
      if (reduce) return;
      if (!last && at - pulsedAt < 110) return;
      pulsedAt = at;
      const p = plan.peak / 1000;
      add(
        iconEl,
        last
          ? [
              { transform: 'scale(1)' },
              { transform: `scale(${(p * 1.06).toFixed(3)}, ${(p * 0.84).toFixed(3)})`, offset: 0.22 },
              { transform: `scale(${(0.94).toFixed(3)}, ${(1.08).toFixed(3)})`, offset: 0.55 },
              { transform: 'scale(1.02, 0.99)', offset: 0.8 },
              { transform: 'scale(1)' },
            ]
          : [{ transform: 'scale(1)' }, { transform: 'scale(1.13, 0.9)', offset: 0.35 }, { transform: 'scale(0.98, 1.03)', offset: 0.7 }, { transform: 'scale(1)' }],
        { duration: last ? 340 : 170, easing: 'linear', fill: 'none' },
      );
      if (last) add(valueEl, [{ transform: 'scale(1)' }, { transform: 'scale(1.15)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: MOTION_DUR.small, easing: ease('back'), fill: 'none' });
    };
    if (mode === 'spend' && !reduce) {
      add(iconEl, [{ transform: 'scale(1)' }, { transform: 'scale(0.86)', offset: 0.35 }, { transform: 'scale(1.06)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 220, easing: 'linear', fill: 'none' });
    }
    const tick = (now: number): void => {
      if (ended) return;
      driveCollects();
      const t = now - t0;
      buildDue(t);
      while (ci < plan.counts.length && plan.counts[ci]!.at <= t) writeCount(plan.counts[ci++]!.value);
      while (li < plan.landings.length && plan.landings[li]!.at <= t) {
        const l = plan.landings[li++]!;
        if (mode === 'earn') pulse(l.last, l.at);
      }
      while (si < plan.sounds.length && plan.sounds[si]!.at <= t) {
        const x = plan.sounds[si++]!;
        // a sound long overdue (a hidden tab) is dropped, except the closing chime
        if (t - x.at < 150 || si === plan.sounds.length) {
          const opts = x.pitchBp ? { pitchBp: x.pitchBp } : undefined;
          o.sound?.(x.id, opts);
          soundTap?.(x.id, opts);
        }
      }
      if (!arrived && mode === 'spend' && plan.pieces.length && t >= Math.max(...plan.pieces.map((p) => p.land))) {
        arrived = true;
        o.onArrive?.();
      }
      if (t >= plan.end) {
        end(false);
        return;
      }
      frameId = s.frame(tick);
    };
    frameId = s.frame(tick);

    return (skipped: boolean) => {
      for (const a of anims) {
        try {
          a.cancel();
        } catch {
          /* gone */
        }
      }
      detach(group);
      iconEl.style.transformOrigin = iconOrigin;
      writeCount(plan.after);
      if (skipped) {
        if (!arrived && mode === 'spend') o.onArrive?.();
        if (!reduce) anim(iconEl, [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 140, easing: ease('out') });
      }
      letWalletGo(skipped);
    };
  };

  if (o.delay && o.delay > 0) cancelDelay = later(o.delay, start);
  else start();
  return { done, finish: () => end(true), cancel: () => end(true) };
}

/** What a screen passes; the hook fills in the UI kit's sound, locale, Reduce motion and the counter's name. */
export type CollectCall = Omit<CollectOptions, 'sound' | 'locale' | 'label'> & Partial<Pick<CollectOptions, 'sound' | 'locale' | 'label'>>;

/**
 * {@link collectCurrency} bound to the UI kit (its sound hook, locale, Reduce motion and strings). A screen that
 * uses it primes the moment's pictures soon after it first shows, long before its first moment.
 */
export function useCollect(): (o: CollectCall) => MotionHandle {
  const kit = useKit();
  useEffect(() => primeSoon(), []);
  return (o) =>
    collectCurrency({
      sound: kit.sound,
      locale: kit.locale,
      label: kit.t(o.kind === 'amber' ? 'ui.currency.amber' : 'ui.currency.dust'),
      ...o,
      reduce: o.reduce === true || kit.reduceMotion,
    });
}
