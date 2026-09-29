/**
 * The Hold flag's grip (DESIGN A18.4.2): while you Hold, the view draws your flag on the lane and the
 * HUD lays a 56 px grip over it. Drag it along the lane to move where your line holds (p 320-800,
 * 20 lu steps; the view shows a ghost flag, the allowed range and a dotted path). A tap on the grip is
 * the tap alternative (A15 U13): arrow buttons appear beside the flag for a few seconds and move it
 * one step of 40 lu toward or away from the enemy. The sim accepts a flag move at most once per 1 s.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { FLAG_MAX_P, FLAG_MIN_P, POWER_DRAG_PX, flagIntent, snapFlagP } from './model';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** How far one arrow tap moves the flag, lu. */
export const FLAG_NUDGE_LU = 40;
const NUDGE_SHOW_MS = 3500;
const FLAG_HINT_KEY = 'ageborn.hud.flagHint';

function hintSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(FLAG_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberHint(): void {
  try {
    globalThis.localStorage?.setItem(FLAG_HINT_KEY, '1');
  } catch {
    // Storage blocked: the hint shows again next match.
  }
}

function Arrow(p: { left: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d={p.left ? 'M15 4.5 7.5 12l7.5 7.5' : 'M9 4.5l7.5 7.5L9 19.5'} fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

interface Pt3 {
  x: number;
  y: number;
  top: number;
}

export function FlagGrip(p: { c: HudCtx }) {
  const { c } = p;
  const view = c.view;
  const holding = c.m.me.stanceVisible && c.m.me.stance === 'hold' && c.m.phase !== 'ended' && !c.readOnly && c.m.me.holdP !== undefined;
  const [pt, setPt] = useState<Pt3 | null>(null);
  const [dragP, setDragP] = useState<number | null>(null);
  const [nudge, setNudge] = useState(false);
  const [hint, setHint] = useState(() => !hintSeen());
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const live = useRef(c);
  live.current = c;

  // Follow the flag on screen (the camera moves under it).
  useEffect(() => {
    if (!holding || !view?.holdFlagScreen) {
      setPt(null);
      return undefined;
    }
    let raf = 0;
    const frame = (): void => {
      raf = requestAnimationFrame(frame);
      const q = view.holdFlagScreen?.() ?? null;
      setPt((cur) => {
        if (!q) return null;
        if (cur && Math.abs(cur.x - q.x) < 0.5 && Math.abs(cur.y - q.y) < 0.5 && Math.abs(cur.top - q.top) < 0.5) return cur;
        return q;
      });
    };
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame);
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    };
  }, [holding, view]);

  useEffect(() => {
    if (!nudge) return undefined;
    const id = setTimeout(() => setNudge(false), NUDGE_SHOW_MS);
    return () => clearTimeout(id);
  }, [nudge, c.m.me.holdP]);

  // Leaving Hold ends a drag.
  useEffect(() => {
    if (holding) return;
    if (press.current) view?.previewHoldFlag?.(null);
    press.current = null;
    setDragP(null);
    setNudge(false);
  }, [holding, view]);

  if (!holding || !pt || !view?.flagPAt) return null;
  const flagP = c.m.me.holdP ?? FLAG_MIN_P;
  const w = 56;
  const h = Math.max(64, pt.y - pt.top + 18);

  const move = (to: number): void => {
    const now = live.current;
    now.act(flagIntent(now.m, now.side, to));
    now.audio?.play('prop_drop');
  };

  const dir = c.side === 0 ? 1 : -1;
  return (
    <div class="hud-flag" style={{ left: `${pt.x}px`, top: `${pt.top - 10}px` }}>
      <button
        class={cls('hud-flag-grip', dragP !== null && 'is-dragging', c.denied('flag') && 'is-denied')}
        data-testid="hud-flag-grip"
        aria-label={c.t('hud.flag.label')}
        style={{ width: `${w}px`, height: `${h}px`, marginLeft: `${-w / 2}px` }}
        onPointerDown={(e) => {
          if (e.button !== undefined && e.button > 0) return;
          press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Synthetic pointers cannot be captured.
          }
          c.audio?.play('ui_click');
        }}
        onPointerMove={(e) => {
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId) return;
          if (!pr.moved && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < POWER_DRAG_PX) return;
          pr.moved = true;
          const raw = view.flagPAt?.(e.clientX, e.clientY) ?? null;
          const q = raw === null ? null : snapFlagP(raw);
          setDragP(q);
          view.previewHoldFlag?.(q);
        }}
        onPointerUp={(e) => {
          const pr = press.current;
          press.current = null;
          if (!pr || pr.id !== e.pointerId) return;
          view.previewHoldFlag?.(null);
          const q = dragP;
          setDragP(null);
          if (hint) {
            rememberHint();
            setHint(false);
          }
          if (!pr.moved) {
            setNudge((n) => !n);
            return;
          }
          if (q !== null && q !== flagP) move(q);
        }}
        onPointerCancel={() => {
          press.current = null;
          view.previewHoldFlag?.(null);
          setDragP(null);
        }}
      >
        <span class="hud-flag-handle" aria-hidden="true">
          <svg viewBox="0 0 24 12" width="30" height="15">
            <path d="M8 1.5 2 6l6 4.5M16 1.5 22 6l-6 4.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>
      {dragP !== null ? <span class="hud-flag-p">{c.t('hud.flag.distance', { n: dragP })}</span> : null}
      {hint && dragP === null ? <span class="hud-flag-hint">{c.t('hud.flag.hint')}</span> : null}
      {nudge && dragP === null ? (
        <>
          <button
            class="hud-flag-nudge is-back"
            data-testid="hud-flag-back"
            aria-label={c.t('hud.flag.back')}
            style={{ transform: `translateX(${dir > 0 ? -64 : 16}px)` }}
            disabled={flagP <= FLAG_MIN_P}
            onClick={() => move(snapFlagP(flagP - FLAG_NUDGE_LU))}
          >
            <Arrow left={dir > 0} />
          </button>
          <button
            class="hud-flag-nudge is-fwd"
            data-testid="hud-flag-forward"
            aria-label={c.t('hud.flag.forward')}
            style={{ transform: `translateX(${dir > 0 ? 16 : -64}px)` }}
            disabled={flagP >= FLAG_MAX_P}
            onClick={() => move(snapFlagP(flagP + FLAG_NUDGE_LU))}
          >
            <Arrow left={dir < 0} />
          </button>
        </>
      ) : null}
    </div>
  );
}
