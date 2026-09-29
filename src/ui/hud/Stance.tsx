/**
 * The stance control (DESIGN A18.4.2 as changed by docs/ui-plan.md 2.9 #5 and 4.7): one 56 px button
 * showing the current stance's icon and name. Press-drag-release: the press opens a flyout of the
 * three stances stacked upward (48 px each, over the lane edge only for the gesture), slide to one and
 * release to choose it. A plain tap opens the flyout for a tap on an option; a second tap on the
 * button, a tap elsewhere or Escape closes it. S toggles Charge and Hold, Shift+S is Fall back
 * (`Hud.tsx`).
 *
 * A change is accepted at most once per 3 s: the button shows the wait as a sweep, and a choice made
 * too early is denied on the button with "Ready in 2s" (MR-03). MR-71: the options fan up (30 ms
 * stagger, 150 ms back), the chosen one snaps into the button, the flyout folds away. In Hold the
 * flag on the lane can be dragged (`HoldFlag.tsx`).
 */
import type { StanceMode } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import { MOTION_DUR } from '@/core/motion';
import { animate, ease, reducedMotion } from '../components/motion';
import { haptic } from '../components/haptics';
import type { HudCtx } from './context';
import { StanceGlyph } from './councilIcons';
import { TAP_SLOP_PX, stanceSetIntent } from './model';
import { ReasonTip } from './Reason';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** The stance cooldown (A18.4.2: `battle.stanceCooldownMs` 3,000). */
export const STANCE_COOLDOWN_MS = 3000;

export function stanceName(c: Pick<HudCtx, 't'>, s: StanceMode): string {
  switch (s) {
    case 'charge':
      return c.t('hud.stance.charge');
    case 'hold':
      return c.t('hud.stance.hold');
    case 'fallback':
      return c.t('hud.stance.fallback');
  }
}

function stanceHint(c: Pick<HudCtx, 't'>, s: StanceMode): string {
  switch (s) {
    case 'charge':
      return c.t('hud.stanceHint.charge');
    case 'hold':
      return c.t('hud.stanceHint.hold');
    case 'fallback':
      return c.t('hud.stanceHint.fallback');
  }
}

/** The flyout lists the stances bottom-up in this order, so Charge sits nearest the thumb. */
const FLYOUT: readonly StanceMode[] = ['charge', 'hold', 'fallback'];

/** The option under a client point while the button holds the pointer (press-drag-release). */
function optionAt(x: number, y: number): StanceMode | null {
  const doc = globalThis.document;
  const el = doc?.elementFromPoint?.(x, y);
  const opt = el?.closest?.('[data-stance-opt]') as HTMLElement | null | undefined;
  const s = opt?.dataset['stanceOpt'];
  return s === 'charge' || s === 'hold' || s === 'fallback' ? s : null;
}

export function StanceControl(p: { c: HudCtx }) {
  const { c } = p;
  const { m } = c;
  const wait = m.me.stanceWaitMs ?? 0;
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [hover, setHover] = useState<StanceMode | null>(null);
  const press = useRef<{ id: number; x: number; y: number; moved: boolean; wasOpen: boolean } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef(c);
  live.current = c;

  // MR-71: the chosen stance snaps into the button (sim-confirmed).
  const last = useRef(m.me.stance);
  useEffect(() => {
    if (last.current === m.me.stance) return;
    last.current = m.me.stance;
    const el = icon.current;
    if (el && !reducedMotion(el)) {
      animate(el, [{ transform: 'scale(0.6) translateY(-10px)', opacity: 0.4 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], {
        duration: MOTION_DUR.micro,
        easing: ease('back'),
        fill: 'none',
      });
    }
  }, [m.me.stance]);

  const close = (): void => {
    if (!open || closing) return;
    setClosing(true);
    setHover(null);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // MR-71: the flyout folds back in 120 ms.
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 120);
  };
  const show = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  };

  // A tap elsewhere or Escape closes the flyout.
  useEffect(() => {
    if (!open || closing) return undefined;
    const onDown = (e: PointerEvent): void => {
      if (wrap.current && e.target instanceof Node && wrap.current.contains(e.target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, closing]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const choose = (s: StanceMode): void => {
    const now = live.current;
    const i = stanceSetIntent(now.m, now.side, s);
    now.act(i);
    if (i.k === 'command') {
      now.audio?.play('ui_click');
      haptic('tick');
    }
    close();
  };

  // Progressive HUD (ui-plan 4.7): until the stance is taught its space stays an empty gap.
  if (!m.me.stanceVisible) return <span class="hud-stance-slot" aria-hidden="true" />;
  const cur = m.me.stance;
  return (
    <div ref={wrap} class={cls('hud-stance-slot', open && 'is-open')}>
      <button
        class={cls('hud-stance', `is-${cur}`, wait > 0 && 'is-waiting', open && !closing && 'is-open', c.denied('stance') && 'is-denied')}
        data-testid="hud-stance"
        data-stance={cur}
        aria-haspopup="true"
        aria-expanded={open && !closing}
        aria-label={c.t('hud.stanceButton', { stance: stanceName(c, cur) })}
        disabled={c.readOnly}
        style={{ '--wait': Math.min(1, wait / STANCE_COOLDOWN_MS) }}
        onPointerDown={(e) => {
          if (c.readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, wasOpen: open && !closing };
          c.audio?.play('ui_toggle');
          show();
        }}
        onPointerMove={(e) => {
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId) return;
          if (!pr.moved && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > TAP_SLOP_PX) pr.moved = true;
          if (pr.moved) setHover(optionAt(e.clientX, e.clientY));
        }}
        onPointerUp={(e) => {
          const pr = press.current;
          press.current = null;
          if (!pr || pr.id !== e.pointerId) return;
          const target = pr.moved ? optionAt(e.clientX, e.clientY) : null;
          setHover(null);
          if (target) choose(target);
          else if (pr.moved) close();
          // A tap on an open flyout's button closes it; a first tap leaves it open for a tap on an option.
          else if (pr.wasOpen) close();
        }}
        onPointerCancel={() => {
          press.current = null;
          setHover(null);
          close();
        }}
        onClick={(e) => {
          // Keyboard (Enter on the focused button): open or close.
          if (e.detail !== 0) return;
          if (open && !closing) close();
          else show();
        }}
      >
        <i class="hud-stance-wait" aria-hidden="true" />
        <span ref={icon} class="hud-stance-icon">
          <StanceGlyph mode={cur} size={c.compact ? 24 : 28} />
        </span>
        <span class="hud-stance-label" data-tag>
          {stanceName(c, cur)}
        </span>
        {c.keys ? <kbd class="hud-key">S</kbd> : null}
      </button>
      {open ? (
        <div class={cls('hud-stance-fly', closing && 'is-closing')} role="menu" data-testid="hud-stance-flyout">
          {FLYOUT.map((s, i) => (
            <button
              key={s}
              class={cls('hud-stance-opt', `seg-${s}`, s === cur && 'is-on', hover === s && 'is-hover')}
              style={{ '--i': i }}
              role="menuitemradio"
              aria-checked={s === cur}
              data-stance-opt={s}
              data-testid={`hud-stance-${s}`}
              onClick={() => choose(s)}
            >
              <span class="hud-stance-opt-icon">
                <StanceGlyph mode={s} size={24} />
              </span>
              <span class="hud-stance-opt-text">
                <b>{stanceName(c, s)}</b>
                <small>{stanceHint(c, s)}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <ReasonTip c={c} target="stance" />
    </div>
  );
}
