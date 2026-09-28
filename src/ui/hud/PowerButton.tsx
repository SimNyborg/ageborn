/**
 * The Age Power button and its targeting (DESIGN A2.9 Casting, A2.12, A9.2 tray item 4, A17.6; owner
 * decision "Age Power targeting": drag is the primary, taught interaction).
 *
 * - **Ready** the button lifts, glows, bobs and wears a small drag arrow; it is grabbable (cursor
 *   `grab`). The first time a player's power is ready a hint says "Drag onto the battlefield!" while
 *   an animated hand shows the drag (once, remembered in localStorage; not in the onboarding matches).
 * - **Drag**: the power leaves the button and a token follows the pointer; on the field a large ghost
 *   of the power's area follows it at world scale (the view draws it, with the enemy units it would
 *   hit highlighted), the lane edge-scrolls near the screen edges, the minimap is a drop target, and
 *   the HUD or Escape cancels (the ghost turns red and says "Release to cancel"). A drop confirms with
 *   a sound and a light haptic.
 * - **Tap** enters aiming mode: the ghost appears at the front; tap the field to fire there, tap the
 *   button again (or Escape) to cancel. A power that ignores the aim fires on a tap.
 * - The keyboard (Space, Enter on the focused button) auto-aims.
 *
 * The input rules are the pure state machine in `powerAim.ts`; this component only wires DOM events
 * to it and carries out its effects. Sim commands are unchanged (`power` with or without `p`).
 */
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { BoltIcon } from './icons';
import { POWER_DRAG_PX, powerFraction, powerIntent } from './model';
import { AIM_IDLE, NO_AIM, aimActive, ghostOf, stepPowerAim, type AimTarget, type PowerAimEffect, type PowerAimEvent, type PowerAimState } from './powerAim';
import { usePortrait } from './usePortrait';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** The minimap's hit area is at least this tall (A17.5), also for dropping a power on it. */
export const MINIMAP_HIT_PX = 32;

/**
 * World x under a client point when it is over the minimap strip (A17.6: a power can be dropped on
 * it), else null. The strip's canvas carries the world range it draws.
 */
export function minimapDropX(clientX: number, clientY: number, from: Element | null): number | null {
  const root = from?.closest('.hud') ?? null;
  const canvas = root?.querySelector<HTMLElement>('[data-minimap]') ?? null;
  if (!canvas) return null;
  const r = canvas.getBoundingClientRect();
  if (r.width <= 0) return null;
  const cy = r.top + r.height / 2;
  const half = Math.max(r.height, MINIMAP_HIT_PX) / 2;
  if (clientX < r.left || clientX > r.right || Math.abs(clientY - cy) > half) return null;
  const wl = Number(canvas.dataset['worldLeft'] ?? -180);
  const wr = Number(canvas.dataset['worldRight'] ?? 2180);
  return wl + ((clientX - r.left) / r.width) * (wr - wl);
}

/** True when a client point is over the tray or the top bar: a drop there puts the power back. */
function overHudBar(clientX: number, clientY: number, from: Element | null): boolean {
  const root = from?.closest('.hud') ?? null;
  if (!root) return false;
  for (const sel of ['.hud-tray', '.hud-top']) {
    const el = root.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true;
  }
  return false;
}

/** The "drag onto the battlefield" hint shows once per player (it also counts as seen after a drag). */
const HINT_STORAGE = 'ageborn.hud.powerDragHint';
/** How long the hint stays up (the hand loops three times within it). */
export const POWER_HINT_MS = 7500;

function hintSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(HINT_STORAGE) === '1';
  } catch {
    return false;
  }
}

function rememberHint(): void {
  try {
    globalThis.localStorage?.setItem(HINT_STORAGE, '1');
  } catch {
    // Storage blocked: the hint may show again next match.
  }
}

/** A light tap of the phone's motor on a drop (ignored where unsupported). */
function haptic(ms: number): void {
  try {
    const nav = globalThis.navigator as (Navigator & { vibrate?: (p: number) => boolean }) | undefined;
    nav?.vibrate?.(ms);
  } catch {
    // Some browsers throw without a user gesture.
  }
}

/** A pointing hand (the hint's drag demo). The fingertip is at (22, 3) of the 48 px box. */
function Hand() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <path
        d="M18.5 7a3.5 3.5 0 0 1 7 0v13.2l1.6-.4a3.6 3.6 0 0 1 4.3 2.3l2.3-.4a3.6 3.6 0 0 1 4.1 2.8l2.1-.2a3.4 3.4 0 0 1 3.6 3.4V35c0 6.1-4.9 11-11 11h-3.4a11 11 0 0 1-8.8-4.4l-6.6-8.9a3.6 3.6 0 0 1 5.4-4.7l2.4 2.3V7z"
        fill="#fff"
        stroke="#1b1330"
        stroke-width="2.6"
        stroke-linejoin="round"
      />
      <path d="M27 24v7M33.5 25.5v6M39.5 27.5v5" stroke="#1b1330" stroke-width="2" stroke-linecap="round" opacity="0.35" />
    </svg>
  );
}

/** The small "drag me" arrow on the ready button, pointing up and out toward the field. */
function GrabArrow() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path d="M6 18 L16 8 M9 7.5 h7.5 v7.5" fill="none" stroke="#1b1330" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

interface Pos {
  x: number;
  y: number;
}

export function PowerButton(p: { c: HudCtx }) {
  const { c } = p;
  const { m, t } = c;
  const charge = powerFraction(m.me.powerPpm);
  const ready = charge >= 1 && m.phase !== 'ended';
  const def = c.config.content.powers[m.me.power];
  const url = usePortrait(c.portrait, m.me.power || null, 'none', 72);
  const btn = useRef<HTMLButtonElement>(null);
  const [st, setSt] = useState<PowerAimState>(AIM_IDLE);
  const stRef = useRef<PowerAimState>(st);
  /** The token that follows the pointer while dragging (HUD-local px). */
  const [pos, setPos] = useState<Pos | null>(null);
  const [hint, setHint] = useState(false);
  // Latest values for handlers that outlive a render.
  const live = useRef({ c, ready });
  live.current = { c, ready };
  // Count the times it became ready, so the burst replays each time.
  const readySeq = useRef({ ready, n: 0 });
  if (ready && !readySeq.current.ready) readySeq.current.n += 1;
  readySeq.current.ready = ready;

  const hudRoot = (): HTMLElement | null => (btn.current?.closest('.hud') as HTMLElement | null) ?? null;

  /** What the pointer is over: the minimap (a drop target), the HUD bars (cancel), the lane or nothing. */
  const aimAt = (clientX: number, clientY: number): AimTarget => {
    const { c: cc } = live.current;
    const view = cc.view;
    if (!view) return NO_AIM;
    // Always tell the view where the pointer is: it edge-scrolls near the screen edges (A17.6).
    const lane = view.laneP(clientX, clientY);
    const from = btn.current;
    const mapX = minimapDropX(clientX, clientY, from);
    if (mapX !== null && view.powerPAtWorld) {
      // Show the spot being aimed at while the pointer is over the minimap.
      view.cameraCommand?.({ t: 'scrub', x: mapX });
      return { p: view.powerPAtWorld(mapX), over: 'minimap' };
    }
    if (overHudBar(clientX, clientY, from)) return { p: null, over: 'hud' };
    return lane === null ? NO_AIM : { p: lane, over: 'lane' };
  };

  /** Shows the ghost for a state (the view keeps it on the same lane point while edge-scrolling). */
  const syncGhost = (s: PowerAimState): void => {
    const view = live.current.c.view;
    if (!view) return;
    if (s.s === 'idle') {
      view.previewPower(null);
      view.cameraHold?.('powerDrag', false);
      return;
    }
    if (s.s === 'pressed' && !s.wasAiming) return;
    const g = ghostOf(s);
    view.previewPower(g.p, g.valid);
  };

  const apply = (e: PowerAimEffect, prev: PowerAimState): void => {
    const { c: cc, ready: isReady } = live.current;
    switch (e.k) {
      case 'none':
        return;
      case 'pickup':
        setHint(false);
        rememberHint();
        cc.audio?.play('ui_click');
        haptic(8);
        return;
      case 'aim': {
        setHint(false);
        cc.audio?.play('ui_click');
        const at = cc.view?.powerAimStart?.() ?? null;
        dispatch({ e: 'aimAt', aim: at === null ? NO_AIM : { p: at, over: 'lane' } });
        return;
      }
      case 'fire': {
        // The preview may have moved under a still finger while the camera edge-scrolled.
        const fromView = prev.s === 'dragging' || prev.s === 'aiming' ? (cc.view?.previewedP?.() ?? null) : null;
        const at = e.p === undefined ? undefined : (fromView ?? e.p);
        cc.act(powerIntent(cc.m, cc.side, at));
        if (isReady) {
          rememberHint();
          cc.audio?.play('ui_confirm');
          haptic(18);
        }
        return;
      }
      case 'cancel':
        cc.audio?.play('ui_toggle');
        return;
    }
  };

  const dispatch = (ev: PowerAimEvent): void => {
    const prev = stRef.current;
    const r = stepPowerAim(prev, ev);
    stRef.current = r.state;
    setSt(r.state);
    if (r.state.s !== 'dragging') setPos(null);
    syncGhost(r.state);
    apply(r.effect, prev);
  };

  const local = (clientX: number, clientY: number): Pos => {
    const r = hudRoot()?.getBoundingClientRect();
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) };
  };

  // The power stops being ready (Space cast it, an evolve, the end): anything in flight is put back.
  useEffect(() => {
    if (!ready && stRef.current.s !== 'idle') dispatch({ e: 'cancel' });
  }, [ready]);

  // Escape cancels a drag or aiming mode (and never reaches the screen underneath).
  const active = aimActive(st);
  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      dispatch({ e: 'cancel' });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active]);

  // The first time the power is ready: the drag hint with the animated hand, once.
  const hintsOn = c.hints !== false && !c.readOnly;
  useEffect(() => {
    if (!ready || !hintsOn || stRef.current.s !== 'idle' || hintSeen()) return undefined;
    rememberHint();
    setHint(true);
    const id = setTimeout(() => setHint(false), POWER_HINT_MS);
    return () => clearTimeout(id);
  }, [ready, hintsOn]);

  useEffect(
    () => () => {
      c.view?.previewPower(null);
      c.view?.cameraHold?.('powerDrag', false);
    },
    [c.view],
  );

  const dragging = st.s === 'dragging';
  const aiming = st.s === 'aiming' || (st.s === 'pressed' && st.wasAiming);
  const overHud = dragging && st.aim.over === 'hud';
  const root = aiming || dragging ? hudRoot() : null;
  const icon = (size: number) => (url ? <img src={url} alt="" draggable={false} /> : <BoltIcon size={size} />);

  return (
    <div class={cls('hud-power-wrap', ready && 'is-ready', dragging && 'is-dragging', aiming && 'is-aiming')}>
      <button
        ref={btn}
        class={cls('hud-power', ready && 'is-ready', (aiming || dragging) && 'is-aiming', dragging && 'is-lifted', c.denied('power') && 'is-denied')}
        data-testid="hud-power"
        data-ready={ready}
        data-aim={st.s}
        aria-pressed={aiming}
        aria-label={def ? (aiming ? t('hud.powerAim.aimingLabel', { name: t(def.nameKey) }) : t('hud.powerLabel', { name: t(def.nameKey), pct: Math.floor(charge * 100) })) : t('hud.power')}
        disabled={c.readOnly}
        style={{ '--charge': charge }}
        onPointerDown={(e) => {
          if (c.readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          dispatch({ e: 'down', id: e.pointerId, x: e.clientX, y: e.clientY, ready, aimable: c.view?.powerAimable() ?? false });
        }}
        onPointerMove={(e) => {
          const s = stRef.current;
          if ((s.s !== 'pressed' && s.s !== 'dragging') || s.id !== e.pointerId) return;
          // Only resolve the lane once the press is a drag (resolving holds the camera).
          if (s.s === 'pressed' && (!s.ready || Math.hypot(e.clientX - s.x, e.clientY - s.y) < POWER_DRAG_PX)) return;
          dispatch({ e: 'move', id: e.pointerId, x: e.clientX, y: e.clientY, aim: aimAt(e.clientX, e.clientY) });
          if (stRef.current.s === 'dragging') setPos(local(e.clientX, e.clientY));
        }}
        onPointerUp={(e) => {
          const s = stRef.current;
          if ((s.s !== 'pressed' && s.s !== 'dragging') || s.id !== e.pointerId) return;
          dispatch({ e: 'up', id: e.pointerId, aim: s.s === 'dragging' ? aimAt(e.clientX, e.clientY) : NO_AIM });
        }}
        onPointerCancel={() => dispatch({ e: 'cancel' })}
        onClick={(e) => {
          // Pointer presses are handled above; a keyboard click (Tab focus, then Enter or Space) casts
          // with auto-aim, like the Space shortcut.
          if (e.detail === 0) c.act(powerIntent(m, c.side));
        }}
      >
        <i class="hud-power-ring" />
        <span class="hud-power-core">{icon(c.compact ? 30 : 38)}</span>
        {ready ? <i key={readySeq.current.n} class="hud-power-burst" /> : null}
        {ready && !aiming ? <span class="hud-power-ready">{t('hud.ready')}</span> : null}
        {ready && !aiming && !dragging ? (
          <i class="hud-power-grab" data-testid="hud-power-grab">
            <GrabArrow />
          </i>
        ) : null}
        {aiming ? <i class="hud-power-x" aria-hidden="true" /> : null}
        {c.keys ? <kbd class="hud-key">{t('hud.key.space')}</kbd> : null}
      </button>
      {def ? <span class="hud-power-name">{t(def.nameKey)}</span> : null}
      {hint && ready && st.s === 'idle' ? (
        <div class="hud-power-hint" data-testid="hud-power-hint" role="status">
          <span class="hud-power-hint-text">{t('hud.powerAim.hint')}</span>
          <div class="hud-power-hand" aria-hidden="true">
            <i class="hud-power-hand-ghost">{icon(22)}</i>
            <Hand />
          </div>
        </div>
      ) : null}
      {aiming ? (
        <div class="hud-power-chip" data-testid="hud-power-aiming" role="status">
          {t('hud.powerAim.tapField')}
        </div>
      ) : null}
      {root && aiming
        ? createPortal(
            <div
              class="hud-power-catch"
              data-testid="hud-power-catch"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                dispatch({ e: 'fieldDown', id: e.pointerId, aim: aimAt(e.clientX, e.clientY) });
              }}
              onPointerMove={(e) => dispatch({ e: 'fieldMove', id: e.pointerId, aim: aimAt(e.clientX, e.clientY) })}
              onPointerUp={(e) => dispatch({ e: 'fieldUp', id: e.pointerId, aim: aimAt(e.clientX, e.clientY) })}
            />,
            root,
          )
        : null}
      {root && dragging && pos
        ? createPortal(
            <div class={cls('hud-power-token', overHud && 'is-cancel')} data-testid="hud-power-token" style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
              <span class="hud-power-token-core">{icon(26)}</span>
              {overHud ? <span class="hud-power-token-label">{t('hud.powerAim.cancel')}</span> : null}
            </div>,
            root,
          )
        : null}
    </div>
  );
}
