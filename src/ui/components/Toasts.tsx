/**
 * Toasts (docs/ui-plan.md 3.6, MR-09; fixes UA-22 and UA-16): short, non-blocking messages. 44 tall,
 * at most 360 wide, 14 px. A toast shows **next to what caused it** when the caller passes an
 * `anchor` (the tapped element or its rect), else top-centre for global events. It stays 2.6 s, or
 * 4 s when it carries an Undo for a reversible action. At most 2 at once.
 *
 * Screens with many quick edits (Army, Customize) use one header Undo instead of a toast per edit.
 */
import { signal, type ReadonlySignal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MOTION_DUR } from '@/core/motion';
import { useKit } from './kit';

export type ToastTone = 'info' | 'good' | 'bad' | 'gold';

/** A viewport point the toast sits above (the centre-top of the source element). */
export interface ToastAnchor {
  x: number;
  y: number;
}

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
  icon?: ComponentChildren;
  anchor?: ToastAnchor;
  undo?: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  icon?: ComponentChildren;
  ms?: number;
  /** The element (or rect) that caused the toast; the toast appears just above it. */
  anchor?: Element | DOMRect | ToastAnchor | null;
  /** Makes the toast carry an Undo button that calls this (reversible actions, U10). */
  undo?: () => void;
}

export interface ToastStore {
  readonly list: ReadonlySignal<readonly Toast[]>;
  show(text: string, o?: ToastOptions): number;
  dismiss(id: number): void;
}

export const TOAST_MS = MOTION_DUR.toast;
export const TOAST_UNDO_MS = MOTION_DUR.toastUndo;
export const MAX_TOASTS = 2;

function anchorPoint(a: ToastOptions['anchor']): ToastAnchor | undefined {
  if (!a) return undefined;
  if ('x' in a && 'y' in a && !('width' in a)) return { x: a.x, y: a.y };
  const r = 'getBoundingClientRect' in a ? a.getBoundingClientRect() : (a as DOMRect);
  return { x: r.left + r.width / 2, y: r.top };
}

export function createToastStore(schedule: (fn: () => void, ms: number) => unknown = (fn, ms) => setTimeout(fn, ms)): ToastStore {
  const list = signal<readonly Toast[]>([]);
  let next = 1;
  const dismiss = (id: number) => {
    list.value = list.value.filter((x) => x.id !== id);
  };
  return {
    list,
    dismiss,
    show(text, o) {
      const id = next++;
      const toast: Toast = { id, text, tone: o?.tone ?? 'info' };
      if (o?.icon !== undefined) toast.icon = o.icon;
      const anchor = anchorPoint(o?.anchor);
      if (anchor) toast.anchor = anchor;
      if (o?.undo) toast.undo = o.undo;
      list.value = [...list.value, toast].slice(-MAX_TOASTS);
      schedule(() => dismiss(id), o?.ms ?? (o?.undo ? TOAST_UNDO_MS : TOAST_MS));
      return id;
    },
  };
}

export function ToastHost(p: { store: ToastStore }) {
  const items = p.store.list.value;
  const layer = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ left: number; top: number; width: number }>({ left: 0, top: 0, width: 0 });
  const anchored = items.filter((x) => x.anchor);
  useLayoutEffect(() => {
    const el = layer.current;
    if (!el || !anchored.length || typeof el.getBoundingClientRect !== 'function') return;
    const r = el.getBoundingClientRect();
    if (r.left !== origin.left || r.top !== origin.top || r.width !== origin.width) setOrigin({ left: r.left, top: r.top, width: r.width });
  }, [anchored.length]);
  return (
    <>
      <div class="ui-toasts" role="status" aria-live="polite" data-testid="toasts">
        {items
          .filter((x) => !x.anchor)
          .map((x) => (
            <ToastView key={x.id} toast={x} onDone={() => p.store.dismiss(x.id)} />
          ))}
      </div>
      <div class="ui-toasts__anchored" ref={layer} role="status" aria-live="polite">
        {anchored.map((x) => {
          const half = 180;
          const left = Math.max(half + 8, Math.min((origin.width || 10000) - half - 8, x.anchor!.x - origin.left));
          const top = Math.max(56, x.anchor!.y - origin.top - 8);
          return <ToastView key={x.id} toast={x} onDone={() => p.store.dismiss(x.id)} style={{ left: `${left}px`, top: `${top}px` }} />;
        })}
      </div>
    </>
  );
}

function ToastView(p: { toast: Toast; onDone: () => void; style?: Record<string, string> }) {
  const { t } = useKit();
  return (
    <div class={`ui-toast ui-toast--${p.toast.tone}${p.toast.anchor ? ' is-anchored' : ''}`} data-testid="toast" style={p.style}>
      {p.toast.icon ? <span class="ui-toast__icon">{p.toast.icon}</span> : null}
      <button type="button" class="ui-toast__text" onClick={p.onDone}>
        {p.toast.text}
      </button>
      {p.toast.undo ? (
        <button
          type="button"
          class="ui-toast__undo"
          data-testid="toast-undo"
          onClick={() => {
            p.toast.undo?.();
            p.onDone();
          }}
        >
          {t('ui.common.undo')}
        </button>
      ) : null}
    </div>
  );
}
