/**
 * The reason a press was denied, popped next to its control (docs/ui-plan.md 4.7 "Denied presses say
 * why", MR-03: 220 ms in, a 1.5 s hold, 160 ms out; MR-67 on tray cards): "Need 40 gold", "Army full",
 * "Legendary in field", "Queue full", "Ready in 2s". `Hud.tsx` keeps the text per target.
 */
import type { HudCtx } from './context';
import type { DenyTarget } from './model';

export function ReasonTip(p: { c: HudCtx; target: DenyTarget; align?: 'center' | 'left' | 'right' }) {
  const r = p.c.reason(p.target);
  if (!r) return null;
  return (
    <span key={r.id} class={`hud-reason${p.align && p.align !== 'center' ? ` is-${p.align}` : ''}`} role="status" data-testid={`hud-reason-${p.target}`}>
      {r.text}
    </span>
  );
}
