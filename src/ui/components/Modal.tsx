/**
 * Modal dialog: dims the screen, scales in, traps focus, closes on Escape or a backdrop tap, and
 * returns focus to where it was on close. Escape is stopped here so the screen underneath does not
 * also go back.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { CloseIcon } from './icons';
import { focusables, trapTab } from './keys';
import { useKit } from './kit';
import { useId } from './Controls';

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

  return (
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
}
