/**
 * The stance control (DESIGN A18.4.2; owner request 2026-09-30): three direct buttons, left to
 * right Fall back, Hold and Charge, so a stance is one tap away. The current one is lit. S toggles
 * Charge and Hold, Shift+S is Fall back (`Hud.tsx`).
 *
 * A change is accepted at most once per 3 s: the button shows the wait as a sweep, and a choice made
 * too early is denied with "Ready in 2s" (MR-03). The chosen icon pops (MR-71). In Hold the flag on
 * the lane can be dragged (`HoldFlag.tsx`).
 */
import type { StanceMode } from '@/contracts';
import { useEffect, useRef } from 'preact/hooks';
import { MOTION_DUR } from '@/core/motion';
import { animate, ease, reducedMotion } from '../components/motion';
import { haptic } from '../components/haptics';
import type { HudCtx } from './context';
import { StanceGlyph } from './councilIcons';
import { stanceSetIntent } from './model';
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

/** Owner request 2026-09-30: three direct buttons, left to right Fall back, Hold, Charge. */
const ORDER: readonly StanceMode[] = ['fallback', 'hold', 'charge'];

export function StanceControl(p: { c: HudCtx }) {
  const { c } = p;
  const { m } = c;
  const wait = m.me.stanceWaitMs ?? 0;
  const icon = useRef<HTMLSpanElement>(null);
  const live = useRef(c);
  live.current = c;

  // MR-71: the chosen stance pops in its button (sim-confirmed).
  const last = useRef(m.me.stance);
  useEffect(() => {
    if (last.current === m.me.stance) return;
    last.current = m.me.stance;
    const el = icon.current;
    if (el && !reducedMotion(el)) {
      animate(el, [{ transform: 'scale(0.7)', opacity: 0.5 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], {
        duration: MOTION_DUR.micro,
        easing: ease('back'),
        fill: 'none',
      });
    }
  }, [m.me.stance]);

  const choose = (s: StanceMode): void => {
    const now = live.current;
    if (s === now.m.me.stance) return;
    const i = stanceSetIntent(now.m, now.side, s);
    now.act(i);
    if (i.k === 'command') {
      now.audio?.play('ui_click');
      haptic('tick');
    }
  };

  // Progressive HUD (ui-plan 4.7): until the stance is taught its space stays an empty gap.
  if (!m.me.stanceVisible) return <span class="hud-stance-slot" aria-hidden="true" />;
  const cur = m.me.stance;
  return (
    <div
      class={cls('hud-stance-slot', 'hud-stance-seg', wait > 0 && 'is-waiting', c.denied('stance') && 'is-denied')}
      role="radiogroup"
      aria-label={c.t('hud.stanceButton', { stance: stanceName(c, cur) })}
      data-testid="hud-stance"
      data-stance={cur}
      style={{ '--wait': Math.min(1, wait / STANCE_COOLDOWN_MS) }}
    >
      {ORDER.map((s) => (
        <button
          key={s}
          class={cls('hud-stance-btn', `seg-${s}`, s === cur && 'is-on')}
          role="radio"
          aria-checked={s === cur}
          title={`${stanceName(c, s)}: ${stanceHint(c, s)}`}
          aria-label={stanceName(c, s)}
          disabled={c.readOnly}
          data-testid={`hud-stance-${s}`}
          onPointerDown={(e) => {
            if (c.readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
            e.preventDefault();
            choose(s);
          }}
          onClick={(e) => {
            // Keyboard (Enter or Space on the focused button).
            if (e.detail === 0) choose(s);
          }}
        >
          {s === cur ? <i class="hud-stance-wait" aria-hidden="true" /> : null}
          <span ref={s === cur ? icon : undefined} class="hud-stance-icon">
            <StanceGlyph mode={s} size={c.compact ? 20 : 24} />
          </span>
          <span class="hud-stance-label" data-tag>
            {c.t(`hud.stanceShort.${s}`)}
          </span>
        </button>
      ))}
      <ReasonTip c={c} target="stance" />
    </div>
  );
}
