/**
 * Modal and Sheet (docs/ui-plan.md 2.2, 3.6; MR-14, MR-16).
 *
 * - `Modal`: a small centred dialog that needs an answer (confirm a reset, Retreat). Scrim fades in,
 *   the panel pops 0.92 -> 1 with `back`, focus is trapped, Escape and a scrim tap cancel, focus
 *   returns on close. Escape is stopped here so the screen underneath does not also go back.
 * - `Sheet`: the panel. On compact screens a side panel from the right (58% wide, min 440, full
 *   height) with a grab handle, closed by x, a scrim tap, a swipe right (past 30% or a flick) or
 *   Escape; on regular screens centred up to 720 wide. Its primary sits in its own action bar,
 *   bottom-right. Never a sheet on a sheet (an info sheet excepted).
 */
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { MOTION_DUR } from '@/core/motion';
import { CloseIcon } from './icons';
import { focusables, trapTab } from './keys';
import { PortalContext, useKit } from './kit';
import { useId } from './Controls';
import { ActionBar, type ActionBarProps } from './Layout';
import { reducedMotion } from './motion';
import { pushBackHandler } from '../history';

export function Modal(p: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
  size?: 'sm' | 'md' | 'lg';
  testid?: string;
  tone?: 'default' | 'danger' | 'gold';
  icon?: ComponentChildren;
}) {
  const { t } = useKit();
  const portal = useContext(PortalContext);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId('modal-title');
  const onClose = useRef(p.onClose);
  onClose.current = p.onClose;

  useEffect(() => {
    const before = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    const root = panel.current;
    if (root) {
      const auto = root.querySelector<HTMLElement>('[data-autofocus]');
      (auto ?? focusables(root)[0] ?? root).focus();
    }
    return () => {
      if (before && typeof before.focus === 'function') before.focus();
    };
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      onClose.current();
      return;
    }
    if (panel.current) trapTab(e, panel.current);
  }

  const modal = (
    <div class="ui-modal" data-testid={p.testid ?? 'modal'} onKeyDown={onKeyDown}>
      <div class="ui-modal__backdrop" onClick={() => onClose.current()} />
      <div
        ref={panel}
        class={`ui-modal__panel ui-modal__panel--${p.size ?? 'md'} ui-modal__panel--${p.tone ?? 'default'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header class="ui-modal__head">
          {p.icon ? <span class="ui-modal__icon">{p.icon}</span> : null}
          <h2 class="ui-modal__title" id={titleId}>
            {p.title}
          </h2>
          <button type="button" class="ui-modal__close" aria-label={t('ui.common.close')} onClick={() => onClose.current()}>
            <CloseIcon size={22} />
          </button>
        </header>
        <div class="ui-modal__body">{p.children}</div>
        {p.footer ? <footer class="ui-modal__foot">{p.footer}</footer> : null}
      </div>
    </div>
  );
  return portal.current ? createPortal(modal, portal.current) : modal;
}

/**
 * The panel (S2a Level preview, S2b Modes, odds, S17 info). `onClose` runs after the exit motion
 * (200 ms; 150 with reduce motion), so callers just unmount it then.
 */
export function Sheet(p: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  actions?: ActionBarProps;
  icon?: ComponentChildren;
  testid?: string;
  /** Info panels (S17) may open over another sheet; they sit one layer higher. */
  info?: boolean;
  /** Receives the sheet's own close (with its exit motion), for a choice that closes it (the Modes chooser). */
  closeRef?: { current: (() => void) | null };
}) {
  const kit = useKit();
  const portal = useContext(PortalContext);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId('sheet-title');
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const onClose = useRef(p.onClose);
  onClose.current = p.onClose;
  const closingRef = useRef(false);

  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    kit.sound?.('ui_sheet');
    const ms = reducedMotion(root.current) ? MOTION_DUR.reduced : MOTION_DUR.mediumOut;
    setTimeout(() => onClose.current(), ms);
  }

  if (p.closeRef) p.closeRef.current = close;

  // The browser and Android back gesture close the sheet first (U7).
  useEffect(() => pushBackHandler(() => close()), []);

  useEffect(() => {
    kit.sound?.('ui_sheet');
    const before = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    const el = panel.current;
    if (el) {
      const auto = el.querySelector<HTMLElement>('[data-autofocus]');
      (auto ?? focusables(el)[0] ?? el).focus?.({ preventScroll: true });
    }
    return () => {
      if (before && typeof before.focus === 'function') before.focus();
    };
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }
    if (panel.current) trapTab(e, panel.current);
  }

  // Swipe right to close (compact side panel): follows the finger 1:1, closes past 30% or a flick.
  function onPointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.('button, input, select, textarea, [data-no-swipe]')) return;
    start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
  }
  function onPointerMove(e: PointerEvent) {
    const s0 = start.current;
    if (!s0 || s0.id !== e.pointerId) return;
    const dx = e.clientX - s0.x;
    const dy = e.clientY - s0.y;
    if (drag === null && Math.abs(dx) < 10) return;
    if (drag === null && Math.abs(dy) > Math.abs(dx)) {
      start.current = null;
      return;
    }
    setDrag(Math.max(0, dx));
  }
  function onPointerUp(e: PointerEvent) {
    const s0 = start.current;
    start.current = null;
    if (!s0 || drag === null) return;
    const w = panel.current?.getBoundingClientRect().width ?? 440;
    const speed = drag / Math.max(1, e.timeStamp - s0.t);
    if (drag > w * 0.3 || speed > 0.6) close();
    setDrag(null);
  }

  const sheet = (
    <div
      ref={root}
      class={`ui-sheet${closing ? ' is-closing' : ''}${drag !== null ? ' is-dragging' : ''}${p.info ? ' ui-sheet--info' : ''}`}
      data-testid={p.testid ?? 'sheet'}
      onKeyDown={onKeyDown}
    >
      <div class="ui-sheet__scrim" onClick={close} data-testid="sheet-scrim" />
      <div
        ref={panel}
        class="ui-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={drag !== null ? { '--drag': `${drag}px` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
      >
        <i class="ui-sheet__grab" aria-hidden="true" />
        <header class="ui-sheet__head">
          {p.icon ? <span class="ui-modal__icon">{p.icon}</span> : null}
          <h2 class="ui-sheet__title" id={titleId}>
            {p.title}
          </h2>
          <button type="button" class="ui-modal__close" aria-label={kit.t('ui.common.close')} onClick={close} data-testid="sheet-close">
            <CloseIcon size={22} />
          </button>
        </header>
        <div class="ui-sheet__body" data-scroll="">
          {p.children}
        </div>
        {p.actions ? <ActionBar {...p.actions} /> : null}
      </div>
    </div>
  );
  return portal.current ? createPortal(sheet, portal.current) : sheet;
}
