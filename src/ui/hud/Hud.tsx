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
 * - Keyboard controls from A2.12 and A18 (1-6, Backspace, Q/W, B, G, E, Space, S, Shift+S, L, P, F; P
 *   pauses, never Esc; Esc closes the War Council).
 * - The War Council (A18.5.7, `Council.tsx`): its button sits in the tray, its sheet slides up over
 *   the tray; a started pick's badge flies into the button and a finished one pops a card above it.
 * - The Hold flag's drag grip over the lane (A18.4.2, `HoldFlag.tsx`).
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
import { CouncilSheet, DoneCard, FlyBadge, type CouncilDone, type CouncilFly } from './Council';
import { councilView, researchIntent, type CouncilPick } from './council';
import { FlagGrip } from './HoldFlag';
import type { EmoteWheel, HudCtx, Translate } from './context';
import { EdgeBadges } from './Minimap';
import { MountPopover, type MountPopoverState } from './MountPopover';
import {
  BANNER_MS,
  BUBBLE_MS,
  BlockedWatch,
  DENY_MS,
  EVOLVE_REARM_MS,
  REASON_MS,
  phaseBanner,
  buyMountIntent,
  denyTargetFor,
  hudPulse,
  hudTeamColors,
  keyIntent,
  lowHp,
  nextSpeed,
  pulseSlot,
  sellIntent,
  simDenyReason,
  powerSlotOf,
  type DenyReason,
  type DenyTarget,
  type HudIntent,
} from './model';
import { hammerBadge } from './Minimap';
import { haptic } from '../components/haptics';
import { TopBar, type Banner, type Bubble } from './TopBar';
import { Tray } from './Tray';
import type { PortraitFn } from './usePortrait';
import './hud.css';

/** Screens at least this wide (and not phone-short) use the desktop HUD sizes (ui-plan 4.7). */
export const WIDE_HUD_PX = 900;
/** Screens shorter than this are phones (A17.7): the 44 px top band and the 94 px tray. */
export const PHONE_HUD_PX = 500;
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
  /** The player's equipped emotes and quotes (A18.9.4). Default: the six starter emotes, no quotes. */
  emoteWheel?: EmoteWheel;
  /** Opens the War Council sheet at mount (the dev state gallery): null = the overview, a line key = its picks. */
  councilOpen?: string | null;
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
/** The War Council sheet leaves in 130 ms (0.7 × its 180 ms entrance, A15 motion rules). */
const SHEET_EXIT_MS = 130;
/** The research-complete card stays this long (a tap skips it). */
const DONE_MS = 2600;

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
  // Why the last denied press on each target was denied (MR-03), shown next to it for 1.5 s.
  const [reasons, setReasons] = useState<Partial<Record<DenyTarget, { id: number; text: string }>>>({});
  const say = useCallback((target: DenyTarget, reason: DenyReason) => {
    const id = ++denySeq.current;
    const tr = live.current.props.t ?? i18nT;
    setReasons((r) => ({ ...r, [target]: { id, text: tr(reason.key, reason.params) } }));
    setTimeout(() => setReasons((r) => (r[target]?.id === id ? { ...r, [target]: undefined } : r)), REASON_MS);
  }, []);
  // UA-07: after your evolve the Evolve button stays dark for 2 s, so a double tap never evolves twice.
  const [rearming, setRearming] = useState(false);
  const rearmRef = useRef(false);
  rearmRef.current = rearming;
  const rearmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bubbles, addBubble] = useTimedList<Bubble>(BUBBLE_MS);
  const [banners, addBanner] = useTimedList<Banner>(BANNER_MS);
  const [goldBump, setGoldBump] = useState(false);
  const [popover, setPopover] = useState<MountPopoverState | null>(null);
  const closePopover = useCallback(() => setPopover(null), []);
  const [hits, setHits] = useState<[number, number]>([0, 0]);
  const [keys, setKeys] = useState(() => props.showKeys === true || keysUsedBefore());
  const [moment, setMoment] = useState<Moment | null>(null);
  // War Council: the sheet (open, which line), its exit, the flying badge, the completion card.
  const [council, setCouncil] = useState<{ open: boolean; line: string | null; closing: boolean }>(() => ({
    open: props.councilOpen !== undefined,
    line: props.councilOpen ?? null,
    closing: false,
  }));
  const councilRef = useRef(council);
  councilRef.current = council;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const councilBtn = useRef<HTMLElement | null>(null);
  const [flies, setFlies] = useState<CouncilFly[]>([]);
  const flySeq = useRef(0);
  const [done, setDone] = useState<CouncilDone | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [burst, setBurst] = useState(0);
  const [stamp, setStamp] = useState(0);
  const [spend, setSpend] = useState<{ id: number; amount: number } | null>(null);
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

  const closeCouncil = useCallback(() => {
    if (!councilRef.current.open || councilRef.current.closing) return;
    setCouncil((c) => ({ ...c, closing: true }));
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setCouncil({ open: false, line: null, closing: false }), SHEET_EXIT_MS);
  }, []);

  const openCouncil = useCallback((line: string | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setCouncil({ open: true, line, closing: false });
  }, []);

  const act = useCallback(
    (i: HudIntent) => {
      const { m: cur, props: p } = live.current;
      switch (i.k) {
        case 'none':
          return;
        case 'council': {
          if (cur.phase === 'ended' || !cur.me.research) return;
          const st = councilRef.current;
          if (st.open && !st.closing && (i.line === undefined || st.line === i.line)) closeCouncil();
          else openCouncil(i.line ?? null);
          return;
        }
        case 'close':
          closeCouncil();
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
          if (i.reason) say(i.target, i.reason);
          p.audio?.play('ui_deny');
          haptic('deny');
          return;
        case 'command':
          if (p.readOnly || cur.phase === 'ended') return;
          lastTarget.current[i.cmd.t] = i.target;
          p.issue?.(i.cmd);
          return;
      }
    },
    [flash, say, closeCouncil, openCouncil],
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
          if (!target) return;
          flash(target);
          const slot = /^card(\d)$/.exec(target);
          const why = simDenyReason(ev.reason, cur, slot ? Number(slot[1]) : undefined, powerSlotOf(target) ?? undefined);
          if (why) say(target, why);
          haptic('deny');
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
            setRearming(true);
            if (rearmTimer.current) clearTimeout(rearmTimer.current);
            rearmTimer.current = setTimeout(() => setRearming(false), EVOLVE_REARM_MS);
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
  }, [view, act, flash, say, addBubble, addBanner, showMoment]);

  // Keyboard (A2.12).
  useEffect(() => {
    if (!keyboard) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return;
      // A keyboard-focused button keeps its native Space / Enter.
      if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) return;
      const { m: cur, props: p, side: me } = live.current;
      const i = keyIntent(e.key, cur, p.config, me, e.shiftKey, rearmRef.current);
      if (i.k === 'none') return;
      // Escape belongs to the screen underneath unless the Council is open.
      if (i.k === 'close' && !councilRef.current.open) return;
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

  // Size class, the screen points coins and XP sparkles fly to, and the HUD's insets: the camera keeps
  // the ground line and the units' HP pips inside the band between the top band (with the minimap)
  // and the tray (ui-plan 3.1 world framing).
  const topEl = useRef<HTMLElement | null>(null);
  const trayEl = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const measure = (): void => {
      setWide(el.clientWidth >= WIDE_HUD_PX && el.clientHeight >= PHONE_HUD_PX);
      view?.setHudAnchors({ gold: center(goldEl.current, el), xp: center(xpEl.current, el) });
      if (view?.setHudInsets) {
        const o = el.getBoundingClientRect();
        const mm = el.querySelector<HTMLElement>('.hud-mm-strip');
        const topBottom = Math.max(topEl.current ? topEl.current.getBoundingClientRect().bottom : o.top, mm ? mm.getBoundingClientRect().bottom : o.top) - o.top;
        const trayTop = trayEl.current ? trayEl.current.getBoundingClientRect().top - o.top : o.height;
        if (topBottom > 0 && trayTop > topBottom) view.setHudInsets({ top: Math.round(topBottom), bottom: Math.round(o.height - trayTop) });
      }
    };
    measure();
    // The minimap mounts a frame after the view is attached.
    const late = setTimeout(measure, 250);
    if (typeof ResizeObserver === 'undefined') return () => clearTimeout(late);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      clearTimeout(late);
      ro.disconnect();
    };
  }, [view, compact]);

  useEffect(() => {
    if (m.phase === 'ended') {
      setPopover(null);
      closeCouncil();
    }
  }, [m.phase, closeCouncil]);

  // Research completion (A18.5.7): the button bursts, a card with the badge pops above it, a stinger.
  const owned = m.me.research?.owned;
  const ownedCount = useRef(owned?.length ?? 0);
  useEffect(() => {
    const n = owned?.length ?? 0;
    if (n > ownedCount.current && owned) {
      const id = owned[n - 1];
      if (id && !readOnly) {
        setBurst((b) => b + 1);
        setDone({ id: n, pick: id });
        audio?.play('level_up');
        if (doneTimer.current) clearTimeout(doneTimer.current);
        doneTimer.current = setTimeout(() => setDone(null), DONE_MS);
      }
    }
    ownedCount.current = n;
  }, [owned?.length, readOnly, audio]);
  useEffect(
    () => () => {
      if (doneTimer.current) clearTimeout(doneTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (rearmTimer.current) clearTimeout(rearmTimer.current);
    },
    [],
  );

  // A17.6: while the mount popover is open the auto camera holds, the popover stays on its mount as
  // the camera moves, and it closes once its mount scrolls off-screen.
  const popMount = popover?.mount ?? null;
  useEffect(() => {
    if (popMount === null || !view) return undefined;
    view.cameraHold?.('popover', true);
    let raf = 0;
    const follow = (): void => {
      raf = requestAnimationFrame(follow);
      const p = view.mountScreenPoint?.(popMount);
      const w = root.current?.clientWidth ?? 0;
      if (!p) return;
      if (p.x < 0 || (w > 0 && p.x > w)) {
        setPopover(null);
        return;
      }
      setPopover((cur) => (cur && cur.mount === popMount && (Math.abs(cur.x - p.x) > 0.5 || Math.abs(cur.y - p.y) > 0.5) ? { ...cur, x: p.x, y: p.y } : cur));
    };
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(follow);
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      view.cameraHold?.('popover', false);
    };
  }, [popMount, view]);

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

  // The one attention pulse (U11, ui-plan 4.7): a tutorial target first (the app marks the battle layer
  // with `data-tut`), then Evolve, then the Age Power, then a new turret mount.
  const tutorial = !!root.current?.closest<HTMLElement>('[data-tut]')?.dataset['tut'];
  const pulseBase = { m, config, side };
  const pulse = readOnly
    ? null
    : hudPulse({
        tutorial,
        evolve: m.me.evolveReady && !rearming && !m.me.ascending && m.phase !== 'ended',
        power: pulseSlot(m) !== null,
        mount: hammerBadge(pulseBase),
      });

  const ctx: HudCtx = {
    m,
    config,
    side,
    t,
    act,
    denied: (target) => denies[target] !== undefined,
    reason: (target) => reasons[target] ?? null,
    pulse,
    portrait: props.portrait,
    view,
    audio,
    compact,
    ...(props.emoteWheel ? { wheel: props.emoteWheel } : {}),
    readOnly,
    keys: keys && !readOnly,
    // One thing at a time: the power hint waits while the War Council sheet is open.
    hints: props.callouts !== false && !readOnly && !council.open,
  };

  const colors = useMemo(() => hudTeamColors(props.teamPreset ?? 'default', side), [props.teamPreset, side]);
  // Reduce motion (U14): the app root carries the Settings switch; the HUD mirrors it onto its own root
  // so its CSS and the motion helpers (`reducedMotion(el)`) see it.
  const rmHost = root.current?.parentElement?.closest('[data-reduce-motion]') ?? null;
  const reduceMotion = rmHost !== null && rmHost.getAttribute('data-reduce-motion') !== 'false';

  // The War Council (A18.5.7). The first match (no clock) keeps it off the tray; the gold tap still opens it.
  const cv = m.me.research ? councilView(m, config, side) : null;
  const councilOn = cv !== null && cv.enabled && config.training?.noClock !== true;
  const startPick = (pick: CouncilPick, from: HTMLElement): void => {
    const i = researchIntent(pick, side);
    act(i);
    if (i.k !== 'command') return;
    audio?.play('turret_upgrade');
    setSpend({ id: ++flySeq.current, amount: pick.price });
    const rootEl = root.current;
    const a = rootEl ? center(from.querySelector<HTMLElement>('.hud-pick-badge') ?? from, rootEl) : null;
    const b = rootEl ? center(councilBtn.current, rootEl) : null;
    if (a && b) {
      const id = flySeq.current;
      setFlies((f) => [...f.slice(-2), { id, pick: pick.def.id, from: a, to: b }]);
    } else setStamp((s) => s + 1);
    closeCouncil();
  };
  const style = { '--hud-me': colors.me, '--hud-foe': colors.foe };

  return (
    <div
      ref={root}
      class={`hud${compact ? ' is-compact' : ''}${m.phase === 'ended' ? ' is-ended' : ''}${m.paused ? ' is-paused' : ''}${readOnly ? ' is-readonly' : ''}`}
      data-testid="hud"
      data-phase={m.phase}
      data-reduce-motion={reduceMotion ? 'true' : 'false'}
      style={style}
      // Mouse presses must not move focus onto HUD buttons, or Space would press the focused button
      // instead of casting the power (keyboard focus through Tab still works).
      onMouseDown={(e) => e.preventDefault()}
    >
      <div class={`hud-vignette${lowHp(m) ? ' is-on' : ''}`} data-testid="hud-vignette" data-on={lowHp(m)} />
      <TopBar
        c={ctx}
        topRef={(el) => {
          topEl.current = el;
        }}
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
        trayRef={(el) => {
          trayEl.current = el;
        }}
        evolveRearming={rearming}
        pulse={pulse}
        goldRef={(el) => {
          goldEl.current = el;
        }}
        goldBump={goldBump}
        spend={spend}
        council={
          councilOn && cv
            ? {
                v: cv,
                open: council.open && !council.closing,
                toggle: () => act({ k: 'council' }),
                burst,
                stamp,
                btnRef: (el) => {
                  councilBtn.current = el;
                },
              }
            : null
        }
      />
      {council.open && cv && (!readOnly || props.councilOpen !== undefined) ? (
        <CouncilSheet
          c={ctx}
          v={cv}
          line={council.line}
          onLine={(line) => setCouncil((cur) => ({ ...cur, line }))}
          onClose={closeCouncil}
          onStart={startPick}
          closing={council.closing}
        />
      ) : null}
      {flies.map((f) => (
        <FlyBadge
          key={f.id}
          c={ctx}
          fly={f}
          onDone={(id) => {
            setFlies((list) => list.filter((x) => x.id !== id));
            setStamp((s) => s + 1);
          }}
        />
      ))}
      {done && councilOn ? <DoneCard c={ctx} done={done} onSkip={() => setDone(null)} /> : null}
      <FlagGrip c={ctx} />
      {popover && !readOnly ? <MountPopover c={ctx} at={popover} onClose={closePopover} /> : null}
      <EdgeBadges c={ctx} />
    </div>
  );
}
