/**
 * The battle HUD (DESIGN A9.2, B6 HUD): a Preact DOM overlay over the battle canvas, fed by the
 * `HudModel` signal the session updates at 15 Hz.
 *
 * - Top bar (12% of the height) and bottom tray (24%); nothing persistent covers the lane band between
 *   them. Only the Scouted drop-down (on request) and the mount popover (after a mount tap) may briefly
 *   overlap it.
 * - Every press goes through the pure rules in `model.ts`: a press the HUD can already tell is invalid
 *   gets the denied feedback (red flash, 2-frame shake, `ui_deny`); everything else becomes a command
 *   for `issue` and the sim has the final word. A command the sim rejects flashes the element that sent
 *   it (the view plays `ui_deny`).
 * - Keyboard controls from A2.12 (1-5, Backspace, Q/W, B, T, E, Space, S, L, P, F; P pauses, never Esc).
 * - View events: mount taps open the popover (Shift sells, the "+" mount buys), emotes show bubbles,
 *   evolves show a banner on that side's XP bar, coins bump the gold counter, and power drag targeting
 *   previews the zone on the canvas.
 * - Low base HP (< 25%) pulses a red vignette every 1.2 s.
 *
 * The HUD root must cover the same box as the battle canvas, so view-local coordinates (mount taps,
 * coin targets) are HUD-local coordinates too.
 */
import type { AudioService, Command, HudModel, MatchConfig, Side, TeamPreset } from '@/contracts';
import { t as i18nT } from '@/i18n';
import { Signal, type ReadonlySignal } from '@preact/signals';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { HudViewBridge, HudViewEvent } from './bridge';
import type { HudCtx, Translate } from './context';
import { MountPopover, type MountPopoverState } from './MountPopover';
import {
  BANNER_MS,
  BUBBLE_MS,
  BlockedWatch,
  DENY_MS,
  phaseBanner,
  buyMountIntent,
  denyTargetFor,
  hudTeamColors,
  keyIntent,
  lowHp,
  nextSpeed,
  sellIntent,
  type DenyTarget,
  type HudIntent,
} from './model';
import { TopBar, type Banner, type Bubble } from './TopBar';
import { Tray } from './Tray';
import type { PortraitFn } from './usePortrait';
import './hud.css';

/** Screens at least this wide use the 88 px cards; narrower ones 72 px (A9.2). */
export const WIDE_HUD_PX = 900;
/** How long the gold counter bumps after coins fly in. */
const GOLD_BUMP_MS = 320;

export interface HudProps {
  /** The HUD model: the session's 15 Hz signal (`BattleSession.hud`), or a plain model. */
  model: ReadonlySignal<HudModel> | HudModel;
  config: Readonly<MatchConfig>;
  /** The side this HUD shows and controls. Default 0 (the player). */
  side?: Side;
  /** Sends a command (`BattleSession.issue`). */
  issue?: (cmd: Command) => void;
  /** The pause button and the P key. The app pauses the session and shows the Pause screen. */
  onPause?: () => void;
  /** The speed button and the F key, with the next speed (1x → 1.5x → 2x → 1x). */
  onSpeed?: (speed: 1 | 1.5 | 2) => void;
  /** The battle view (mount taps, power drag targeting, coin and XP targets). */
  view?: HudViewBridge;
  /** Card portraits (the app wraps `ArtProvider.portrait`). */
  portrait?: PortraitFn;
  audio?: Pick<AudioService, 'play'>;
  /** Defaults to the app-wide i18n. */
  t?: Translate;
  /** Keyboard shortcuts (A2.12). Default true. */
  keyboard?: boolean;
  /** Shows everything and accepts no input (replay viewer, dev state gallery). */
  readOnly?: boolean;
  /** Shows the pause and speed buttons. Default true (the replay viewer has its own). */
  controls?: boolean;
  /** Colourblind presets change the team colours (A11). */
  teamPreset?: TeamPreset;
  /** Forces the narrow (72 px card) layout; by default it follows the HUD's own width. */
  compact?: boolean;
  /** The "Scouted (n)" chip; the app hides it for new players (audit #11). Default true. */
  scouted?: boolean;
  /** Keyboard hint badges from the start (the dev state gallery). By default they appear after the first key press. */
  showKeys?: boolean;
  /**
   * The "Blocked at their gate" callout (audit #7). Default true. The app turns it off in the
   * onboarding matches, whose scripted beats own the on-screen text (A8).
   */
  callouts?: boolean;
}

/** Remembers that this player uses the keyboard, so the hint badges show from then on. */
const KEYS_STORAGE = 'ageborn.hud.keys';
let keysUsedThisSession = false;

function keysUsedBefore(): boolean {
  if (keysUsedThisSession) return true;
  try {
    return globalThis.localStorage?.getItem(KEYS_STORAGE) === '1';
  } catch {
    return false;
  }
}

function rememberKeysUsed(): void {
  keysUsedThisSession = true;
  try {
    globalThis.localStorage?.setItem(KEYS_STORAGE, '1');
  } catch {
    // Storage blocked: the badges still show for this session.
  }
}

/** A big centred moment: "Medieval Age!", "Overdrive! Gold ×2", the blocked-at-the-gate callout. */
interface Moment {
  id: number;
  kind: 'evolve' | 'phase' | 'blocked';
  title: string;
  sub?: string;
}

const MOMENT_MS: Record<Moment['kind'], number> = { evolve: 2400, phase: 2600, blocked: 4200 };

function isSignal(model: ReadonlySignal<HudModel> | HudModel): model is ReadonlySignal<HudModel> {
  return model instanceof Signal;
}

function readModel(model: ReadonlySignal<HudModel> | HudModel): HudModel {
  // Reading `.value` inside render subscribes this component to the signal.
  return isSignal(model) ? model.value : model;
}

function center(el: HTMLElement | null, root: HTMLElement): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const o = root.getBoundingClientRect();
  return { x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top };
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function useTimedList<T extends { id: number }>(ms: number): [T[], (item: Omit<T, 'id'>) => void] {
  const [items, setItems] = useState<T[]>([]);
  const next = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const set = timers.current;
    return () => {
      for (const id of set) clearTimeout(id);
    };
  }, []);
  const add = useCallback(
    (item: Omit<T, 'id'>) => {
      const id = next.current++;
      setItems((list) => [...list.slice(-3), { ...item, id } as T]);
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setItems((list) => list.filter((x) => x.id !== id));
      }, ms);
      timers.current.add(timer);
    },
    [ms],
  );
  return [items, add];
}

export function Hud(props: HudProps) {
  const m = readModel(props.model);
  const side: Side = props.side ?? 0;
  const t = props.t ?? i18nT;
  const readOnly = props.readOnly === true;
  const keyboard = props.keyboard !== false && !readOnly;
  const { config, view, audio } = props;

  const root = useRef<HTMLDivElement>(null);
  const goldEl = useRef<HTMLElement | null>(null);
  const xpEl = useRef<HTMLElement | null>(null);
  const [wide, setWide] = useState(true);
  const compact = props.compact ?? !wide;

  // Latest values for listeners registered once.
  const live = useRef({ m, props, side });
  live.current = { m, props, side };

  // Denied-press feedback per element.
  const [denies, setDenies] = useState<Partial<Record<DenyTarget, number>>>({});
  const denySeq = useRef(0);
  const flash = useCallback((target: DenyTarget) => {
    const id = ++denySeq.current;
    setDenies((d) => ({ ...d, [target]: id }));
    setTimeout(() => setDenies((d) => (d[target] === id ? { ...d, [target]: undefined } : d)), DENY_MS);
  }, []);
  const lastTarget = useRef<Partial<Record<Command['t'], DenyTarget>>>({});

  const [bubbles, addBubble] = useTimedList<Bubble>(BUBBLE_MS);
  const [banners, addBanner] = useTimedList<Banner>(BANNER_MS);
  const [goldBump, setGoldBump] = useState(false);
  const [popover, setPopover] = useState<MountPopoverState | null>(null);
  const closePopover = useCallback(() => setPopover(null), []);
  const [hits, setHits] = useState<[number, number]>([0, 0]);
  const [keys, setKeys] = useState(() => props.showKeys === true || keysUsedBefore());
  const [moment, setMoment] = useState<Moment | null>(null);
  const momentSeq = useRef(0);
  const momentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMoment = useCallback((mo: Omit<Moment, 'id'>) => {
    const id = ++momentSeq.current;
    setMoment({ ...mo, id });
    if (momentTimer.current) clearTimeout(momentTimer.current);
    momentTimer.current = setTimeout(() => setMoment((cur) => (cur?.id === id ? null : cur)), MOMENT_MS[mo.kind]);
  }, []);
  useEffect(
    () => () => {
      if (momentTimer.current) clearTimeout(momentTimer.current);
    },
    [],
  );

  const act = useCallback(
    (i: HudIntent) => {
      const { m: cur, props: p } = live.current;
      switch (i.k) {
        case 'none':
          return;
        case 'pause':
          p.onPause?.();
          return;
        case 'speed':
          p.onSpeed?.(nextSpeed(cur.speed));
          return;
        case 'deny':
          if (p.readOnly) return;
          flash(i.target);
          p.audio?.play('ui_deny');
          return;
        case 'command':
          if (p.readOnly || cur.phase === 'ended') return;
          lastTarget.current[i.cmd.t] = i.target;
          p.issue?.(i.cmd);
          return;
      }
    },
    [flash],
  );

  // View events.
  useEffect(() => {
    if (!view) return undefined;
    return view.on((ev: HudViewEvent) => {
      const { m: cur, props: p, side: me } = live.current;
      switch (ev.t) {
        case 'mountTap':
          if (p.readOnly || cur.phase === 'ended') return;
          if (ev.kind === 'buy') act(buyMountIntent(cur, p.config, me));
          else if (ev.shift) act(sellIntent(cur, me, ev.mount));
          else setPopover({ mount: ev.mount, x: ev.screen.x, y: ev.screen.y });
          return;
        case 'denied': {
          const target = lastTarget.current[ev.command] ?? denyTargetFor(ev.command);
          if (target) flash(target);
          return;
        }
        case 'emote':
          addBubble({ side: ev.side, emote: ev.emote });
          return;
        case 'evolved':
          addBanner({ side: ev.side, age: ev.age });
          // Your evolve is a moment: a big centred banner over the push-in and the pillar of light.
          if (ev.side === me) {
            const tr = p.t ?? i18nT;
            showMoment({ kind: 'evolve', title: tr('hud.ageReached', { age: tr(`age.${ev.age}.name`) }), sub: tr('hud.newUnits') });
          }
          return;
        case 'baseHit':
          setHits((h) => (ev.side === 0 ? [h[0] + 1, h[1]] : [h[0], h[1] + 1]));
          return;
        case 'trained':
          return;
        case 'coins':
          setGoldBump(true);
          setTimeout(() => setGoldBump(false), GOLD_BUMP_MS);
          return;
        case 'matchEnded':
          setPopover(null);
          return;
        case 'ascending':
        case 'lastStandArmed':
          return;
      }
    });
  }, [view, act, flash, addBubble, addBanner, showMoment]);

  // Keyboard (A2.12).
  useEffect(() => {
    if (!keyboard) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return;
      // A keyboard-focused button keeps its native Space / Enter.
      if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) return;
      const { m: cur, props: p, side: me } = live.current;
      const i = keyIntent(e.key, cur, p.config, me);
      if (i.k === 'none') return;
      e.preventDefault();
      if (!keysUsedThisSession) {
        rememberKeysUsed();
        setKeys(true);
      }
      act(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard, act]);

  // Width (card size) and the screen points coins and XP sparkles fly to.
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const measure = (): void => {
      setWide(el.clientWidth >= WIDE_HUD_PX);
      view?.setHudAnchors({ gold: center(goldEl.current, el), xp: center(xpEl.current, el) });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view, compact]);

  useEffect(() => {
    if (m.phase === 'ended') setPopover(null);
  }, [m.phase]);

  // A phase that starts gets a banner that says what it means ("Overdrive! Gold ×2", audit #24).
  const lastPhase = useRef(m.phase);
  useEffect(() => {
    if (m.phase === lastPhase.current) return;
    lastPhase.current = m.phase;
    const b = phaseBanner(m.phase);
    if (b) showMoment({ kind: 'phase', title: t(b.title), sub: t(b.sub) });
  }, [m.phase, t, showMoment]);

  // Where the fighting is, and the "blocked at their gate" callout (audit #7).
  const front = view?.frontLine?.() ?? null;
  const blocked = useRef(new BlockedWatch());
  useEffect(() => {
    if (readOnly || m.paused || props.callouts === false) return;
    if (blocked.current.update(m.clockMs, front, m.foe.baseHpBp, m.phase === 'ended')) showMoment({ kind: 'blocked', title: t('hud.blocked') });
    // `front` is read fresh with every model (15 Hz).
  }, [m, readOnly, t, showMoment, props.callouts]);

  const ctx: HudCtx = {
    m,
    config,
    side,
    t,
    act,
    denied: (target) => denies[target] !== undefined,
    portrait: props.portrait,
    view,
    audio,
    compact,
    readOnly,
    keys: keys && !readOnly,
  };

  const colors = useMemo(() => hudTeamColors(props.teamPreset ?? 'default', side), [props.teamPreset, side]);
  const style = { '--hud-me': colors.me, '--hud-foe': colors.foe };

  return (
    <div
      ref={root}
      class={`hud${compact ? ' is-compact' : ''}${m.phase === 'ended' ? ' is-ended' : ''}${m.paused ? ' is-paused' : ''}${readOnly ? ' is-readonly' : ''}`}
      data-testid="hud"
      data-phase={m.phase}
      style={style}
      // Mouse presses must not move focus onto HUD buttons, or Space would press the focused button
      // instead of casting the power (keyboard focus through Tab still works).
      onMouseDown={(e) => e.preventDefault()}
    >
      <div class={`hud-vignette${lowHp(m) ? ' is-on' : ''}`} data-testid="hud-vignette" data-on={lowHp(m)} />
      <TopBar
        c={ctx}
        bubbles={bubbles}
        banners={banners}
        xpRef={(el) => {
          xpEl.current = el;
        }}
        controls={props.controls !== false}
        onPause={() => act({ k: 'pause' })}
        onSpeed={() => act({ k: 'speed' })}
        hits={hits}
        front={front}
        scouted={props.scouted !== false}
      />
      {moment ? (
        <div key={moment.id} class={`hud-moment hud-moment-${moment.kind}`} data-testid={`hud-moment-${moment.kind}`} role="status">
          <div class="hud-moment-title">{moment.title}</div>
          {moment.sub ? <div class="hud-moment-sub">{moment.sub}</div> : null}
        </div>
      ) : null}
      <Tray
        c={ctx}
        goldRef={(el) => {
          goldEl.current = el;
        }}
        goldBump={goldBump}
      />
      {popover && !readOnly ? <MountPopover c={ctx} at={popover} onClose={closePopover} /> : null}
    </div>
  );
}
