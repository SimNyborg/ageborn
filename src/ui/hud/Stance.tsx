/**
 * The three-stance control (DESIGN A18.4.2): Charge (crossed swords), Hold (flag) and Fall back
 * (shield), one segment each, above the tray on the right. S toggles Charge and Hold, Shift+S is Fall
 * back. A change is accepted at most once per 3 s: while the wait runs the segments show a short fill,
 * and a press too early is denied on the control. The chosen segment's thumb slides to it with a small
 * overshoot. In Hold the flag on the lane can be dragged (`HoldFlag.tsx`).
 */
import type { StanceMode } from '@/contracts';
import { useEffect, useRef } from 'preact/hooks';
import type { HudCtx } from './context';
import { StanceGlyph } from './councilIcons';
import { STANCES, stanceSetIntent } from './model';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** The stance cooldown (A18.4.2: `battle.stanceCooldownMs` 3,000). */
export const STANCE_COOLDOWN_MS = 3000;

function stanceName(c: HudCtx, s: StanceMode): string {
  switch (s) {
    case 'charge':
      return c.t('hud.stance.charge');
    case 'hold':
      return c.t('hud.stance.hold');
    case 'fallback':
      return c.t('hud.stance.fallback');
  }
}

function stanceHint(c: HudCtx, s: StanceMode): string {
  switch (s) {
    case 'charge':
      return c.t('hud.stanceHint.charge');
    case 'hold':
      return c.t('hud.stanceHint.hold');
    case 'fallback':
      return c.t('hud.stanceHint.fallback');
  }
}

export function StanceControl(p: { c: HudCtx }) {
  const { c } = p;
  const { m } = c;
  const idx = Math.max(0, STANCES.indexOf(m.me.stance));
  const wait = m.me.stanceWaitMs ?? 0;
  const thumb = useRef<HTMLElement | null>(null);
  const last = useRef(m.me.stance);
  // The thumb lands with a squash when the stance changes (sim-confirmed).
  useEffect(() => {
    if (last.current === m.me.stance) return;
    last.current = m.me.stance;
    const el = thumb.current;
    if (el && typeof el.animate === 'function') {
      el.animate([{ scale: '1 1' }, { scale: '1.12 0.86', offset: 0.55 }, { scale: '0.97 1.04', offset: 0.8 }, { scale: '1 1' }], { duration: 300, easing: 'ease-out' });
    }
  }, [m.me.stance]);
  if (!m.me.stanceVisible) return null;
  return (
    <div
      class={cls('hud-stances', `is-${m.me.stance}`, wait > 0 && 'is-waiting', c.denied('stance') && 'is-denied')}
      role="radiogroup"
      aria-label={c.t('hud.stanceLabel', { stance: stanceName(c, m.me.stance) })}
      data-testid="hud-stance"
      data-stance={m.me.stance}
      style={{ '--idx': idx, '--wait': Math.min(1, wait / STANCE_COOLDOWN_MS) }}
    >
      <i
        class="hud-stances-thumb"
        ref={(el) => {
          thumb.current = el;
        }}
      />
      {STANCES.map((s) => {
        const on = s === m.me.stance;
        return (
          <button
            key={s}
            class={cls('hud-stance-seg', `seg-${s}`, on && 'is-on')}
            role="radio"
            aria-checked={on}
            aria-label={`${stanceName(c, s)}: ${stanceHint(c, s)}`}
            title={stanceHint(c, s)}
            data-testid={`hud-stance-${s}`}
            disabled={c.readOnly}
            onClick={() => c.act(stanceSetIntent(m, c.side, s))}
          >
            <StanceGlyph mode={s} size={c.compact ? 20 : 22} />
            <span class="hud-stance-name">{stanceName(c, s)}</span>
          </button>
        );
      })}
      {wait > 0 ? <i class="hud-stances-wait" aria-hidden="true" /> : null}
      {c.keys ? <kbd class="hud-key">S</kbd> : null}
    </div>
  );
}
