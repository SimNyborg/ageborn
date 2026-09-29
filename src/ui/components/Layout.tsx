/**
 * Screen layout pieces (docs/ui-plan.md 3.1, 3.6):
 * - `ScreenFrame`: the screen template: a fixed header (Back top-left, title, right-side slot such
 *   as currency chips), a content area that scrolls on its own, and an optional fixed `ActionBar`
 *   (primary bottom-right). Header and action bar never scroll away (fixes UA-03). Heights come
 *   from the tokens: header 44 / 40 short / 56 regular, action bar 64 / 56 / 80.
 * - `ActionBar`: tertiary at the left edge, secondary left of the primary, primary at the right.
 * - `Panel`: a slate surface for grouped content.
 * - `RotateOverlay`: "Rotate your device" shown in portrait (A2.1, C5 #44), CSS-driven so it needs
 *   no resize listener.
 */
import type { ComponentChildren } from 'preact';
import { IconButton } from './Button';
import { BackIcon } from './icons';
import { useKit } from './kit';

export function ScreenFrame(p: {
  id: string;
  title: string;
  onBack?: () => void;
  right?: ComponentChildren;
  children: ComponentChildren;
  theme?: string;
  subtitle?: ComponentChildren;
  class?: string;
  /** The fixed action bar at the bottom (the screen's primary lives here, bottom-right). */
  actions?: ActionBarProps;
}) {
  const { t } = useKit();
  return (
    <section
      class={`ui-screen ui-screen--${p.id}${p.actions ? ' ui-screen--has-bar' : ''} ${p.class ?? ''}`}
      data-screen={p.id}
      data-theme={p.theme}
      aria-labelledby={`${p.id}-title`}
    >
      <header class="ui-screen__head">
        {p.onBack ? (
          <IconButton
            icon={<BackIcon size={26} />}
            label={t('ui.common.back')}
            onClick={p.onBack}
            kind="secondary"
            testid="back"
            class="ui-screen__back"
          />
        ) : null}
        <div class="ui-screen__titles">
          <h1 class="ui-screen__title" id={`${p.id}-title`}>
            {p.title}
          </h1>
          {p.subtitle ? <div class="ui-screen__subtitle">{p.subtitle}</div> : null}
        </div>
        <div class="ui-screen__right">{p.right}</div>
      </header>
      <div class="ui-screen__body" data-scroll="">
        {p.children}
      </div>
      {p.actions ? <ActionBar {...p.actions} /> : null}
    </section>
  );
}

export interface ActionBarProps {
  /** The one primary (a `Button` of kind primary or progress, size l), at the right edge. */
  primary?: ComponentChildren;
  /** Secondary actions, left of the primary. */
  secondary?: ComponentChildren;
  /** Tertiary actions (text buttons) or a note, at the left edge. */
  tertiary?: ComponentChildren;
  testid?: string;
  class?: string;
}

/** The fixed action bar of sub-screens, panels and sheets (3.6). */
export function ActionBar(p: ActionBarProps) {
  return (
    <footer class={`ui-actionbar ${p.class ?? ''}`} data-testid={p.testid ?? 'action-bar'}>
      <div class="ui-actionbar__tertiary">{p.tertiary}</div>
      <div class="ui-actionbar__spacer" />
      {p.secondary ? <div class="ui-actionbar__secondary">{p.secondary}</div> : null}
      {p.primary ? <div class="ui-actionbar__primary">{p.primary}</div> : null}
    </footer>
  );
}

export function Panel(p: {
  title?: ComponentChildren;
  icon?: ComponentChildren;
  children: ComponentChildren;
  class?: string;
  tone?: 'default' | 'dark' | 'gold' | 'glass';
  testid?: string;
  actions?: ComponentChildren;
  labelledBy?: string;
}) {
  return (
    <section class={`ui-panel ui-panel--${p.tone ?? 'default'} ${p.class ?? ''}`} data-testid={p.testid} aria-labelledby={p.labelledBy}>
      {p.title ? (
        <header class="ui-panel__head">
          {p.icon ? <span class="ui-panel__icon">{p.icon}</span> : null}
          <h2 class="ui-panel__title" id={p.labelledBy}>
            {p.title}
          </h2>
          {p.actions ? <div class="ui-panel__actions">{p.actions}</div> : null}
        </header>
      ) : null}
      <div class="ui-panel__body">{p.children}</div>
    </section>
  );
}

export function RotateOverlay() {
  const { t } = useKit();
  return (
    <div class="ui-rotate" data-testid="rotate-overlay" role="alert" aria-live="assertive">
      <div class="ui-rotate__phone" aria-hidden="true">
        <i />
      </div>
      <p class="ui-rotate__text">{t('ui.rotate.text')}</p>
    </div>
  );
}

/** A short empty-state message. */
export function Empty(p: { children: ComponentChildren; icon?: ComponentChildren }) {
  return (
    <div class="ui-empty">
      {p.icon ? <span class="ui-empty__icon">{p.icon}</span> : null}
      <p>{p.children}</p>
    </div>
  );
}
