/**
 * Toasts: short, non-blocking messages ("Upgraded!", "Not enough Amber"). A store holds them in a
 * signal; the host renders them in a polite live region at the top centre, each for ~2.6 s.
 */
import { signal, type ReadonlySignal } from '@preact/signals';
import type { ComponentChildren } from 'preact';

export type ToastTone = 'info' | 'good' | 'bad' | 'gold';

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
  icon?: ComponentChildren;
}

export interface ToastStore {
  readonly list: ReadonlySignal<readonly Toast[]>;
  show(text: string, o?: { tone?: ToastTone; icon?: ComponentChildren; ms?: number }): number;
  dismiss(id: number): void;
}

export const TOAST_MS = 2600;
export const MAX_TOASTS = 3;

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
      list.value = [...list.value, toast].slice(-MAX_TOASTS);
      schedule(() => dismiss(id), o?.ms ?? TOAST_MS);
      return id;
    },
  };
}

export function ToastHost(p: { store: ToastStore }) {
  const items = p.store.list.value;
  return (
    <div class="ui-toasts" role="status" aria-live="polite" data-testid="toasts">
      {items.map((x) => (
        <ToastView key={x.id} toast={x} onDone={() => p.store.dismiss(x.id)} />
      ))}
    </div>
  );
}

function ToastView(p: { toast: Toast; onDone: () => void }) {
  return (
    <button type="button" class={`ui-toast ui-toast--${p.toast.tone}`} onClick={p.onDone} data-testid="toast">
      {p.toast.icon ? <span class="ui-toast__icon">{p.toast.icon}</span> : null}
      <span>{p.toast.text}</span>
    </button>
  );
}
