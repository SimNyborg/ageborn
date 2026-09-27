/**
 * Chunky game buttons: a coloured face with a darker lip underneath that the button sinks into on
 * press, a dark outline and a top highlight (A11 style). Every button is a native `<button>` with a
 * touch target of at least 48 px (DESIGN C2/WP9), so keyboard and screen readers work unchanged.
 */
import type { ComponentChildren, JSX } from 'preact';

export type ButtonVariant = 'gold' | 'blue' | 'green' | 'red' | 'violet' | 'plain' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ComponentChildren;
  children?: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
  /** Keeps the button focusable and announced, but inert (for locked items that explain why). */
  inert?: boolean;
  class?: string;
  label?: string;
  title?: string;
  type?: 'button' | 'submit';
  testid?: string;
  autofocus?: boolean;
  pressed?: boolean;
  wide?: boolean;
  style?: JSX.CSSProperties;
}

export function Button(p: ButtonProps) {
  const cls = [
    'ui-btn',
    `ui-btn--${p.variant ?? 'blue'}`,
    `ui-btn--${p.size ?? 'md'}`,
    p.wide ? 'ui-btn--wide' : '',
    p.inert ? 'is-inert' : '',
    p.icon && !p.children ? 'ui-btn--icon-only' : '',
    p.class ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={p.type ?? 'button'}
      class={cls}
      disabled={p.disabled}
      aria-disabled={p.inert ? 'true' : undefined}
      aria-label={p.label}
      aria-pressed={p.pressed === undefined ? undefined : p.pressed}
      title={p.title}
      data-testid={p.testid}
      data-autofocus={p.autofocus ? '' : undefined}
      style={p.style}
      onClick={(e) => {
        if (p.inert || p.disabled) return;
        p.onClick?.(e);
      }}
    >
      <span class="ui-btn__face">
        {p.icon ? <span class="ui-btn__icon">{p.icon}</span> : null}
        {p.children !== undefined && p.children !== null ? <span class="ui-btn__text">{p.children}</span> : null}
      </span>
    </button>
  );
}

/** Round icon-only button (back, close, gear). Needs a label for screen readers. */
export function IconButton(p: {
  icon: ComponentChildren;
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  class?: string;
  testid?: string;
  badge?: ComponentChildren;
  autofocus?: boolean;
}) {
  return (
    <button
      type="button"
      class={`ui-iconbtn ui-iconbtn--${p.variant ?? 'plain'} ${p.class ?? ''}`}
      aria-label={p.label}
      title={p.label}
      data-testid={p.testid}
      data-autofocus={p.autofocus ? '' : undefined}
      onClick={() => p.onClick?.()}
    >
      <span class="ui-iconbtn__face">{p.icon}</span>
      {p.badge !== undefined && p.badge !== null && p.badge !== false ? <span class="ui-badge ui-iconbtn__badge">{p.badge}</span> : null}
    </button>
  );
}
