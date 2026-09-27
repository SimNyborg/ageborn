/**
 * Screen layout pieces:
 * - `ScreenFrame`: the standard screen with a header (back button, title, right-side slot such as
 *   currency chips) and a body, laid out for landscape phones up to desktop (A2.1: v1 is landscape).
 * - `Panel`: the framed wooden-and-ink panel used for grouped content.
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
}) {
  const { t } = useKit();
  return (
    <section
      class={`ui-screen ui-screen--${p.id} ${p.class ?? ''}`}
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
            variant="blue"
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
      <div class="ui-screen__body">{p.children}</div>
    </section>
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
