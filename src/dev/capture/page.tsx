/**
 * Capture (`?dev=1#capture`): renders a battle frame-exactly for trailers and screenshots. Dev only.
 *
 * Nothing runs by itself: no ticker, no wall clock. A script (Playwright) calls `window.__capture.step()`
 * and each call advances the real sim and the battle view by one fixed frame (default 1/30 s) and draws
 * it, so a capture never drops a frame however slow the machine is. The sim is the game's own (same
 * seed, same battle every time); only the presentation differs from the game:
 *
 * - **Camera.** A scripted director (`director.ts`) replaces the battle camera: follow the fight with a
 *   zoom that fits it, frame an x range, track a unit, frame a base, cut or ease between shots. It runs
 *   in output time, so it keeps its pace in slow motion.
 * - **Slow motion.** `setTimeScale(s, rampMs)` scales the game time per frame (sim and view together).
 * - **Clean picture.** No HUD (`hud=minimal` draws two base bars), no mount markers or Hold flag, no coins
 *   flying to a missing HUD (`coins=1` keeps them); `bars=0` hides the unit health bars, `numbers=`
 *   sets the damage numbers (off, important, all).
 * - **Sound and events.** Every sound and music call of the view and every sim event is recorded with
 *   its frame (`drainSounds`, `drainEvents`), so the game's own audio files can be mixed in sync later.
 *
 * URL options: `left=<age>&right=<age>` (each side's age at the start), `format=` (a game format;
 * default `capture.all`, all eight ages and no clock), `seed=`, `bots=0|1|2|left` (AI Generals on no
 * seat, side 1, both, or side 0), `level=1-10`, `deck0=` / `deck1=` (comma-separated cards), `scenes=best|game`,
 * `scene=` / `foeScene=` (a scene id per side), `sky=` (a sky id), `arena=` (a ground), `fps=`, `hud=`,
 * `bars=`, `numbers=`, `coins=`, `shake=0..1`, `bg=` (canvas colour, hex). The canvas fills the
 * window; render at the device scale factor you want (DPR 2 picks the HD unit sheets).
 *
 * Dev pages are exempt from the i18n rule.
 */
import type { AgeId, ArtProvider, CardId, Command, PowerSlot, Side, Sim, TimedCommand } from '@/contracts';
import { BattleView, DEFAULT_VIEW_SETTINGS, FixedStepClock, type ViewSettings } from '@/render';
import { baseCenterX } from '@/render/layout';
import { DIORAMA_GROUND } from '@/render/showcase/diorama';
import { createSim } from '@/sim';
import { devClearLane, devPlaceFort, devPlaceTurret, devSetBaseBp, devSetGold, devSetPower, devSetXp, devSpawn } from '@/sim/debug';
import { createArtProvider } from '@/visuals';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DevAutoplayer, loadAiKit, type Seat } from '../sandbox/viewSources';
import { CameraDirector, framingTransform, type Framing, type SceneSample, type Shot } from './director';
import { EventLog, RecordingAudio, type EventCall, type FrameClock, type SoundCall } from './recorder';
import { captureMatchConfig, evolveToAges, formatAges, optionsFromQuery, type CaptureOptions } from './scenario';

export const title = 'Capture (frame-exact trailer renders)';

/** World x range the camera may show (the battle camera's world: behind both bases). */
const WORLD = { left: -180, right: 2180 } as const;

/** Per-frame snapshot a script reads back. */
export interface CaptureState {
  frame: number;
  /** Output time at the end of the last frame (ms). */
  t: number;
  tick: number;
  timeScale: number;
  outcome: Sim['state']['outcome'];
  camera: Framing & { scale: number; tx: number; ty: number };
  sides: {
    age: AgeId;
    ageIndex: number;
    baseHpBp: number;
    gold: number;
    xp: number;
    units: number;
    ascending: boolean;
  }[];
  fronts: { left: number | null; right: number | null };
}

export interface CaptureUnit {
  id: number;
  side: Side;
  card: CardId;
  /** World x (lu, interpolated as drawn). */
  x: number;
  hpBp: number;
  /** Screen position of the unit's feet (CSS px). */
  sx: number;
  sy: number;
  mode: string;
}

interface Opts extends CaptureOptions {
  fps: number;
  hud: 'none' | 'minimal';
  bars: boolean;
  numbers: ViewSettings['damageNumbers'];
  coins: boolean;
  shake: number;
  arena: string | null;
  bg: number;
}

function pageOptions(search: string): Opts {
  const q = new URLSearchParams(search);
  const fps = Number(q.get('fps'));
  const shake = Number(q.get('shake'));
  const numbers = q.get('numbers');
  const bg = q.get('bg');
  return {
    ...optionsFromQuery(search),
    fps: Number.isFinite(fps) && fps >= 1 && fps <= 120 ? fps : 30,
    hud: q.get('hud') === 'minimal' ? 'minimal' : 'none',
    bars: q.get('bars') !== '0',
    numbers: numbers === 'off' || numbers === 'all' ? numbers : 'important',
    coins: q.get('coins') === '1',
    shake: Number.isFinite(shake) && q.get('shake') !== null ? Math.max(0, Math.min(1, shake)) : 1,
    arena: q.get('arena'),
    bg: bg && /^[0-9a-f]{6}$/i.test(bg) ? parseInt(bg, 16) : 0x1b1a2e,
  };
}

/** Stamps commands for the next tick, as the session does. */
class Stamper {
  private readonly seq: [number, number] = [0, 0];

  stamp(sim: Sim, cmds: readonly Command[]): TimedCommand[] {
    const tick = sim.state.tick + 1;
    return cmds.map((c) => ({ ...c, tick, seq: ++this.seq[c.side] }));
  }
}

/** Resolves when no new network resource has finished for `quietMs` (or after `maxMs`). */
async function networkIdle(quietMs = 1500, maxMs = 30_000): Promise<void> {
  const t0 = performance.now();
  let last = performance.getEntriesByType('resource').length;
  let since = performance.now();
  while (performance.now() - t0 < maxMs) {
    await new Promise((r) => setTimeout(r, 100));
    const n = performance.getEntriesByType('resource').length;
    if (n !== last) {
      last = n;
      since = performance.now();
    } else if (performance.now() - since >= quietMs) {
      return;
    }
  }
}

async function withTimeout<T>(p: Promise<T> | null, ms: number): Promise<void> {
  if (!p) return;
  await Promise.race([p.then(() => undefined).catch(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]);
}

/** The two base bars of `hud=minimal`: each side's age and base health, in its team colour. */
class MinimalHud {
  readonly root = new Container();
  private readonly g = new Graphics();
  private readonly labels: [Text, Text];

  constructor() {
    const style = { fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif", fontSize: 18, fontWeight: '800' as const, fill: 0xffffff, stroke: { color: 0x1b1a2e, width: 4 } };
    this.labels = [new Text({ text: '', style }), new Text({ text: '', style: { ...style, align: 'right' as const } })];
    this.root.addChild(this.g, ...this.labels);
  }

  draw(width: number, sides: CaptureState['sides']): void {
    const g = this.g;
    g.clear();
    const pad = 14;
    const barW = Math.min(260, width * 0.36);
    const colors = [0x3d8bff, 0xff8a2a];
    sides.forEach((s, i) => {
      const x = i === 0 ? pad : width - pad - barW;
      g.roundRect(x - 2, 30, barW + 4, 14, 7).fill({ color: 0x1b1a2e, alpha: 0.85 });
      const w = (barW * Math.max(0, Math.min(10_000, s.baseHpBp))) / 10_000;
      if (w > 0) g.roundRect(i === 0 ? x : x + barW - w, 32, w, 10, 5).fill({ color: colors[i] ?? 0xffffff });
      const label = this.labels[i as 0 | 1];
      label.text = `${s.age.toUpperCase()} AGE`;
      label.y = 6;
      label.x = i === 0 ? x : x + barW - label.width;
    });
  }
}

interface World {
  app: Application;
  sim: Sim;
  view: BattleView;
  art: ArtProvider;
  audio: RecordingAudio;
  events: EventLog;
  clock: FixedStepClock;
  stamper: Stamper;
  director: CameraDirector;
  seats: [Seat | null, Seat | null];
  pending: Command[];
  fc: FrameClock;
  opts: Opts;
  width: number;
  height: number;
  frame: number;
  outMs: number;
  frameMs: number;
  timeScale: number;
  ramp: { from: number; to: number; t: number; ms: number } | null;
  hud: MinimalHud | null;
  hold: { set(v: readonly { visualId: string }[]): Promise<void>; release(): void } | null;
  held: Set<CardId>;
  holdReady: Promise<void> | null;
  lastXform: { scale: number; x: number; y: number };
}

/** The scene the director looks at: fronts, units (as drawn) and bases. */
function sample(w: World, alpha: number): SceneSample {
  const units: { id: number; side: 0 | 1; x: number }[] = [];
  let left: number | null = null;
  let right: number | null = null;
  for (const u of w.sim.state.units) {
    if (u.mode === 'dying' || u.hp <= 0 || u.fort) continue;
    const x = (u.prevX + (u.x - u.prevX) * alpha) / 1000;
    units.push({ id: u.id, side: u.side, x });
    if (u.side === 0) left = left === null ? x : Math.max(left, x);
    else right = right === null ? x : Math.min(right, x);
  }
  return { fronts: { left, right }, units, bases: [baseCenterX(0), baseCenterX(1)] };
}

function stateOf(w: World): CaptureState {
  const st = w.sim.state;
  const order = formatAges(w.sim.config);
  const f = w.director.framing;
  const s = sample(w, 1);
  return {
    frame: w.frame,
    t: w.outMs,
    tick: st.tick,
    timeScale: w.timeScale,
    outcome: st.outcome,
    camera: { ...f, scale: w.lastXform.scale, tx: w.lastXform.x, ty: w.lastXform.y },
    sides: ([0, 1] as const).map((side) => {
      const sd = st.sides[side];
      return {
        age: order[sd.ageIndex] ?? 'stone',
        ageIndex: sd.ageIndex,
        baseHpBp: sd.baseMaxHp > 0 ? Math.round((sd.baseHp * 10_000) / sd.baseMaxHp) : 0,
        gold: Math.floor(sd.gold / 1000),
        xp: Math.floor(sd.xp / 1000),
        units: st.units.filter((u) => u.side === side && u.mode !== 'dying' && !u.fort).length,
        ascending: sd.ascendUntil > st.tick,
      };
    }),
    fronts: s.fronts,
  };
}

/** Advances one frame of `frameMs` output time; draws it when `draw`. */
function advance(w: World, draw: boolean): void {
  if (w.ramp) {
    const r = w.ramp;
    r.t += w.frameMs;
    const k = Math.min(1, r.t / Math.max(1, r.ms));
    const e = k * k * (3 - 2 * k);
    w.timeScale = r.from + (r.to - r.from) * e;
    if (k >= 1) w.ramp = null;
  }
  const gameMs = w.frameMs * w.timeScale;
  // sounds and events of this frame are stamped with its end time
  w.fc.frame = w.frame;
  w.fc.t = w.outMs + w.frameMs;
  const ended = w.sim.state.outcome !== null;
  w.clock.add(gameMs, 1, w.view.simFrozen || ended);
  while (!w.view.simFrozen && w.sim.state.outcome === null && w.clock.consume()) {
    const cmds = w.pending;
    w.pending = [];
    for (const seat of w.seats) if (seat) cmds.push(...seat.commands(w.sim));
    const evs = w.sim.step(w.stamper.stamp(w.sim, cmds));
    w.events.add(w.sim.state.tick, evs);
    w.view.onEvents(evs);
  }
  const f = w.director.update(w.frameMs, sample(w, w.clock.alpha));
  const xf = framingTransform(f, w.width, w.height);
  w.lastXform = xf;
  // keep the battle camera's own idea of the view in step (culling, badges and alerts read it)
  const cam = w.view.camera;
  cam.centerX = f.x;
  cam.zoom = xf.scale / Math.max(0.0001, cam.layout.scale);
  w.view.render(w.clock.alpha, gameMs);
  if (w.hud) w.hud.draw(w.width, stateOf(w).sides);
  if (draw) w.app.renderer.render(w.app.stage);
  w.frame++;
  w.outMs += w.frameMs;
}

/** Replaces the view camera's transform with the director's (keeping the base-break punch). */
function takeCamera(w: World): void {
  const cam = w.view.camera;
  cam.autoCamera = false;
  cam.mode = 'manual';
  cam.resize(w.width, w.height);
  const own = cam as unknown as { transform: () => { scale: number; x: number; y: number } };
  own.transform = () => {
    const t = w.lastXform;
    const k = cam.punchScale;
    if (k === 1) return t;
    // the punch scales about the ground under the screen centre
    const fx = (w.width / 2 - t.x) / t.scale;
    const sx = w.width / 2;
    return { scale: t.scale * k, x: sx - fx * t.scale * k, y: t.y };
  };
}

/** Hides presentation meant for a player's HUD: flying coins and XP (unless `coins`). */
function quietView(view: BattleView, opts: Opts): void {
  if (opts.coins) return;
  const v = view as unknown as { exec?: (a: { a: string }) => void };
  const exec = v.exec;
  if (typeof exec !== 'function') return;
  v.exec = function (this: unknown, a: { a: string }) {
    if (a.a === 'fxFly') return;
    exec.call(view, a);
  };
}

/** Starts loading every age's backdrop scene for both halves, so an evolve never waits for its scene. */
function prefetchScenes(view: BattleView, ages: readonly AgeId[]): void {
  const bd = (view as unknown as { backdrop?: { prefetchAge?: (side: Side, age: AgeId) => void } }).backdrop;
  if (typeof bd?.prefetchAge !== 'function') return;
  for (const side of [0, 1] as const) for (const a of ages) bd.prefetchAge(side, a);
}

function cardsVisuals(w: World, cards: Iterable<CardId>): { visualId: string }[] {
  const out: { visualId: string }[] = [];
  for (const c of cards) {
    const v = w.sim.config.content.units[c]?.visualId;
    if (v) out.push({ visualId: v });
  }
  return out;
}

/** Holds the unit sheets of these cards (on top of what the view holds) and returns when they are in. */
function holdCards(w: World, cards: Iterable<CardId>): Promise<void> {
  let grew = false;
  for (const c of cards) {
    if (!w.held.has(c) && w.sim.config.content.units[c]) {
      w.held.add(c);
      grew = true;
      // what the card leaves behind or calls in is drawn too
      for (const ab of w.sim.config.content.units[c]?.abilities ?? []) {
        if (ab.kind === 'summon') w.held.add(ab.card);
        else if (ab.kind === 'riders') w.held.add(ab.onDeathSpawn);
      }
    }
  }
  if (grew && w.hold) w.holdReady = w.hold.set(cardsVisuals(w, w.held));
  return w.holdReady ?? Promise.resolve();
}

export interface CaptureApi {
  version: 1;
  ready: boolean;
  /** Resolves once the art is in and the stage has settled (call before the first step). */
  whenReady(): Promise<CaptureState>;
  info(): { width: number; height: number; dpr: number; fps: number; seed: number; format: string; ages: AgeId[]; options: Opts };
  setFps(fps: number): void;
  /** Slow motion: game time per output time, eased over `rampMs` (0 = at once). */
  setTimeScale(s: number, rampMs?: number): void;
  /** Advances `n` frames and draws the last; resolves once the art the frame needs is in. */
  step(n?: number): Promise<CaptureState>;
  /** Fast-forwards `ms` of game time in 50 ms frames without drawing (the camera follows along). */
  skip(ms: number): CaptureState;
  /** The last drawn frame as a data URL (`image/jpeg`, `image/png` or `image/webp`). */
  snap(type?: string, quality?: number): string;
  camera(shot: Shot): void;
  state(): CaptureState;
  units(filter?: { side?: Side; cards?: CardId[]; ids?: number[] }): CaptureUnit[];
  drainEvents(): EventCall[];
  drainSounds(): SoundCall[];
  /** Holds unit sheets ahead of a spawn (a spawn holds its card too); resolves when loaded. */
  hold(cards: CardId[]): Promise<void>;
  /** Queues a command for the next tick (evolve, train, power, stance ...). */
  issue(cmd: Command): void;
  bots(on: [boolean, boolean]): Promise<void>;
  dev: {
    spawn(side: Side, card: CardId, p: number, level?: number): number;
    gold(side: Side, n: number): void;
    xp(side: Side, n: number): void;
    /** Tops XP up to the threshold and queues Evolve. */
    evolve(side: Side): void;
    baseBp(side: Side, bp: number): void;
    turret(side: Side, mount: number, card: CardId): void;
    fort(side: Side, card: CardId, o?: { pad?: number; done?: boolean }): number;
    power(side: Side, slot?: PowerSlot): void;
    clear(): void;
  };
}

export default function CapturePage() {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('starting…');

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const opts = pageOptions(window.location.search);
    let disposed = false;
    const app = new Application();
    let world: World | null = null;

    void (async () => {
      const width = Math.max(64, el.clientWidth);
      const height = Math.max(64, el.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      await app.init({ width, height, background: opts.bg, antialias: true, preference: 'webgl', resolution: dpr, autoDensity: true, autoStart: false, preserveDrawingBuffer: true });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      app.ticker.stop();
      app.canvas.setAttribute('data-testid', 'capture-canvas');
      app.canvas.style.display = 'block';
      el.appendChild(app.canvas);

      const config = captureMatchConfig(opts);
      const sim = createSim(config);
      const stamper = new Stamper();
      const fc: FrameClock = { frame: 0, t: 0 };
      // the setup (evolving each side to its age) runs headless before anything is drawn
      evolveToAges(sim, opts.ages, (cmds) => {
        sim.step(stamper.stamp(sim, cmds));
      });
      const ages = formatAges(config);
      const art = createArtProvider({ quality: 'high', dpr, hdDpr: dpr, worldPxPerLu: 1.25, unitSheets: 'match', teamPreset: 'default', warn: () => undefined });
      setStatus('loading art…');
      await art.preload([...new Set([...ages])]);
      const audio = new RecordingAudio(fc);
      const events = new EventLog(fc);
      const settings: ViewSettings = { ...DEFAULT_VIEW_SETTINGS, graphics: 'high', damageNumbers: opts.numbers, shake: opts.shake, autoCamera: false, edgeScroll: false, mutedEmotes: true };
      const view = new BattleView({
        sim,
        art,
        audio,
        settings,
        spectator: true,
        arena: opts.arena ?? DIORAMA_GROUND[opts.ages[0]] ?? 'tar_pits',
        seed: opts.seed,
      });
      view.resize(width, height);
      app.stage.addChild(view.root);
      if (!opts.bars) view.layers.bars.visible = false;
      quietView(view, opts);
      prefetchScenes(view, ages);
      const mid = (baseCenterX(0) + baseCenterX(1)) / 2;
      const director = new CameraDirector({ x: mid, w: 900, ground: 0.78 }, WORLD);
      const aiKit = opts.bots.some(Boolean) ? await loadAiKit() : null;
      const seatFor = (side: Side): Seat => (aiKit ? aiKit(side, opts.seed + side, config.content) : new DevAutoplayer(side, opts.seed));
      const hud = opts.hud === 'minimal' ? new MinimalHud() : null;
      if (hud) app.stage.addChild(hud.root);
      const hold = (art as ArtProvider & { holdArt?: () => World['hold'] }).holdArt?.() ?? null;
      const w: World = {
        app,
        sim,
        view,
        art,
        audio,
        events,
        clock: new FixedStepClock(),
        stamper,
        director,
        seats: [opts.bots[0] ? seatFor(0) : null, opts.bots[1] ? seatFor(1) : null],
        pending: [],
        fc,
        opts,
        width,
        height,
        frame: 0,
        outMs: 0,
        frameMs: 1000 / opts.fps,
        timeScale: 1,
        ramp: null,
        hud,
        hold,
        held: new Set(),
        holdReady: null,
        lastXform: framingTransform(director.framing, width, height),
      };
      world = w;
      takeCamera(w);
      // the decks of both sides' current ages are held from the start
      const deckCards = ([0, 1] as const).flatMap((side) => config.sides[side].loadouts[opts.ages[side]]?.units.filter((c): c is CardId => c !== null) ?? []);
      void holdCards(w, deckCards);

      let readyState: Promise<CaptureState> | null = null;
      const settle = async (): Promise<CaptureState> => {
        // one quiet frame starts every load (scenes, grounds, base models); then wait for the art and the
        // network, and run a second of frames without the sim so cross-fades finish before frame 0
        w.audio.enabled = false;
        w.events.enabled = false;
        w.view.render(0, 0);
        await withTimeout(w.holdReady, 60_000);
        await withTimeout(w.view.artReady(), 60_000);
        await networkIdle();
        for (let i = 0; i < 40; i++) {
          w.director.update(w.frameMs, sample(w, 0));
          w.lastXform = framingTransform(w.director.framing, w.width, w.height);
          w.view.render(0, w.frameMs);
        }
        w.app.renderer.render(w.app.stage);
        w.audio.drain();
        w.events.drain();
        w.audio.enabled = true;
        w.events.enabled = true;
        api.ready = true;
        setStatus('ready');
        return stateOf(w);
      };

      const api: CaptureApi = {
        version: 1,
        ready: false,
        whenReady: () => (readyState ??= settle()),
        info: () => ({ width: w.width, height: w.height, dpr, fps: 1000 / w.frameMs, seed: opts.seed, format: config.format, ages, options: opts }),
        setFps: (fps) => {
          if (fps >= 1 && fps <= 240) w.frameMs = 1000 / fps;
        },
        setTimeScale: (s, rampMs = 0) => {
          const to = Math.max(0.02, Math.min(8, s));
          if (rampMs > 0) w.ramp = { from: w.timeScale, to, t: 0, ms: rampMs };
          else {
            w.ramp = null;
            w.timeScale = to;
          }
        },
        step: async (n = 1) => {
          for (let i = 0; i < n; i++) {
            const last = i === n - 1;
            if (last) {
              // never draw a unit before its sheet is in
              await withTimeout(w.holdReady, 30_000);
              await withTimeout(w.view.artReady(), 30_000);
            }
            advance(w, last);
          }
          return stateOf(w);
        },
        skip: (ms) => {
          // skipped time is not part of the video: the frame count and output clock stay where they
          // were, and its sounds and events are dropped
          const keep = { frameMs: w.frameMs, timeScale: w.timeScale, frame: w.frame, outMs: w.outMs, ramp: w.ramp };
          w.frameMs = 50;
          w.timeScale = 1;
          w.ramp = null;
          w.audio.enabled = false;
          w.events.enabled = false;
          for (let t = 0; t < ms; t += 50) advance(w, false);
          w.audio.enabled = true;
          w.events.enabled = true;
          Object.assign(w, keep);
          return stateOf(w);
        },
        snap: (type = 'image/jpeg', quality = 0.95) => w.app.canvas.toDataURL(type, quality),
        camera: (shot) => w.director.setShot(shot),
        state: () => stateOf(w),
        units: (filter = {}) => {
          const xf = w.lastXform;
          return w.sim.state.units
            .filter((u) => (filter.side === undefined || u.side === filter.side) && (!filter.cards || filter.cards.includes(u.card)) && (!filter.ids || filter.ids.includes(u.id)))
            .map((u) => {
              const x = (u.prevX + (u.x - u.prevX) * w.clock.alpha) / 1000;
              return { id: u.id, side: u.side, card: u.card, x, hpBp: u.maxHp > 0 ? Math.round((u.hp * 10_000) / u.maxHp) : 0, sx: xf.x + x * xf.scale, sy: xf.y, mode: u.mode };
            });
        },
        drainEvents: () => w.events.drain(),
        drainSounds: () => w.audio.drain(),
        hold: (cards) => holdCards(w, cards),
        issue: (cmd) => {
          w.pending.push(cmd);
        },
        bots: async (on) => {
          const kit = on.some(Boolean) && !aiKit ? await loadAiKit() : aiKit;
          const make = (side: Side): Seat => (kit ? kit(side, opts.seed + side, config.content) : new DevAutoplayer(side, opts.seed));
          w.seats = [on[0] ? (w.seats[0] ?? make(0)) : null, on[1] ? (w.seats[1] ?? make(1)) : null];
        },
        dev: {
          spawn: (side, card, p, level) => {
            void holdCards(w, [card]);
            return devSpawn(sim, side, card, level === undefined ? { p } : { p, level }).id;
          },
          gold: (side, n) => devSetGold(sim, side, n),
          xp: (side, n) => devSetXp(sim, side, n),
          evolve: (side) => {
            const st = sim.state.sides[side];
            const need = config.content.formats[config.format]?.xpToNextOverride?.[st.ageIndex] ?? config.content.ages[ages[st.ageIndex] ?? 'stone']?.xpToNext ?? 1000;
            devSetXp(sim, side, (need ?? 1000) + 1);
            const next = ages[st.ageIndex + 1];
            if (next) void holdCards(w, config.sides[side].loadouts[next]?.units.filter((c): c is CardId => c !== null) ?? []);
            w.pending.push({ t: 'evolve', side });
          },
          baseBp: (side, bp) => devSetBaseBp(sim, side, bp),
          turret: (side, mount, card) => devPlaceTurret(sim, side, mount, card),
          fort: (side, card, o = {}) => devPlaceFort(sim, side, card, o),
          power: (side, slot = 'home') => {
            devSetPower(sim, side, 1_000_000, slot);
            w.pending.push({ t: 'power', side, slot });
          },
          clear: () => devClearLane(sim),
        },
      };
      (window as unknown as { __capture?: CaptureApi }).__capture = api;
      setStatus('stage up; call __capture.whenReady()');
    })().catch((e: unknown) => {
      console.error('[capture] failed to start', e);
      setStatus(`failed: ${String(e)}`);
    });

    return () => {
      disposed = true;
      (window as unknown as { __capture?: CaptureApi }).__capture = undefined;
      if (world) {
        world.hold?.release();
        world.view.destroy();
      }
      try {
        app.destroy(true, { children: true });
      } catch {
        // not initialised yet
      }
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      <div data-testid="capture-status" data-status={status} style={{ display: 'none' }}>
        {status}
      </div>
    </div>
  );
}
