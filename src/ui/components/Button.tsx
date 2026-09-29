/**
 * The one Button (docs/ui-plan.md 3.6, U1, U3, U5, MR-01 to MR-06). Five kinds by the colour
 * grammar and five sizes:
 *
 * - kinds: `primary` (gold, go: Play, Continue, Open, Claim), `progress` (green, spend or progress:
 *   Upgrade, Equip, confirm), `secondary` (slate, neutral and navigation), `tertiary` (text only:
 *   Watch replay, Show odds, Skip), `destructive` (red: Retreat, Reset, Sell);
 * - sizes: `xl` (Home Play only), `l` (the primary in an action bar), `m` (secondary and row actions),
 *   `s` (rare inline actions; 36 visual in a 44 hit box), `icon` (40 visual in a 48 hit box).
 *
 * Behaviour every button shares, so screens get it for free:
 * - the pressed look lands on `pointerdown` in the same frame (`data-pressed`), the action fires on
 *   release inside the button (a native click), and the face settles through a small overshoot;
 * - a disabled button with a `reason` stays tappable: the tap shakes it, flashes a red edge and pops
 *   the reason next to it (U3: "disabled controls explain why on tap");
 * - `data-primary` (an enabled primary), `data-pulse` (the one attention pulse, U11) and
 *   `data-clip-check` (the label) are set here for the budget checks (ui-plan 1.3);
 * - sounds (`ui_click`, `ui_deny`) go through the kit's optional `sound` hook and haptics through
 *   `haptics.ts` (a tick on primary presses only, 5.4).
 */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { haptic } from './haptics';
import { useKit } from './kit';

export type ButtonKind = 'primary' | 'progress' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'xl' | 'l' | 'm' | 's' | 'icon';

/** @deprecated Pre-UI-0 colour names; mapped onto the kinds (gold = primary, green = progress,
 *  red = destructive, ghost = tertiary, everything else = secondary). Use `kind`. */
export type ButtonVariant = 'gold' | 'green' | 'red' | 'plain' | 'ghost' | 'blue' | 'violet';
/** @deprecated Pre-UI-0 size names (sm and md map to m, lg to l). */
export type LegacyButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_KIND: Readonly<Record<ButtonVariant, ButtonKind>> = {
  gold: 'primary',
  green: 'progress',
  red: 'destructive',
  ghost: 'tertiary',
  plain: 'secondary',
  blue: 'secondary',
  violet: 'secondary',
};

const LEGACY_SIZE: Readonly<Record<LegacyButtonSize, ButtonSize>> = { sm: 'm', md: 'm', lg: 'l' };

export function buttonKind(p: { kind?: ButtonKind; variant?: ButtonVariant }): ButtonKind {
  return p.kind ?? (p.variant ? VARIANT_KIND[p.variant] : 'secondary');
}

export function buttonSize(size: ButtonSize | LegacyButtonSize | undefined): ButtonSize {
  if (!size) return 'm';
  return (LEGACY_SIZE as Record<string, ButtonSize>)[size] ?? (size as ButtonSize);
}

export interface ButtonProps {
  kind?: ButtonKind;
  /** @deprecated Use `kind`. */
  variant?: ButtonVariant;
  size?: ButtonSize | LegacyButtonSize;
  icon?: ComponentChildren;
  children?: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
  /** Disabled. With a `reason` it stays tappable and explains itself (U3). */
  disabled?: boolean;
  /** Why the button is disabled, in at most 4 words ("Need 2 more copies"). */
  reason?: string;
  /** Called when a disabled button with a reason is tapped (after the reason shows). */
  onDenied?: () => void;
  /** @deprecated Keeps the button focusable and announced, but inert. Use `disabled` + `reason`. */
  inert?: boolean;
  /** The one attention pulse on this screen (MR-05, U11). Ignored while disabled. */
  pulse?: boolean;
  /**
   * Marks the screen's one emphasised action (`data-primary`, U1). Gold primaries are marked by
   * default; set true on a green progress button that is the screen's main action (Upgrade, Equip),
   * or false to keep a gold button out of the count (a Claim in a list row).
   */
  primary?: boolean;
  /** A spinner replaces the icon; the width stays. */
  loading?: boolean;
  /** MR-06: a check pops over the label while true. */
  done?: boolean;
  class?: string;
  label?: string;
  title?: string;
  type?: 'button' | 'submit';
  testid?: string;
  autofocus?: boolean;
  pressed?: boolean;
  wide?: boolean;
  style?: JSX.CSSProperties;
  /** Sound on release (default `ui_click`; `null` for none, when the screen plays its own). */
  sound?: string | null;
}

function setAttr(el: EventTarget | null, name: string, on: boolean): void {
  const e = el as HTMLElement | null;
  if (!e || typeof e.setAttribute !== 'function') return;
  if (on) e.setAttribute(name, '');
  else e.removeAttribute(name);
}

export function Button(p: ButtonProps) {
  const kit = useKit();
  const kind = buttonKind(p);
  const size = buttonSize(p.size);
  // Pre-UI-0 sizes keep their old free width, so screens not yet rebuilt do not reflow.
  const legacy = p.size === 'sm' || p.size === 'md' || p.size === 'lg';
  const blocked = !!p.disabled || !!p.inert;
  // A disabled button that can explain itself stays enabled for the pointer (aria-disabled).
  const explains = blocked && (!!p.reason || !!p.onDenied || !!p.inert);
  const [reason, setReason] = useState<{ text: string; n: number } | null>(null);
  const [denied, setDenied] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const cls = [
    'ui-btn',
    `ui-btn--${kind}`,
    `ui-btn--${size}`,
    p.wide ? 'ui-btn--wide' : '',
    legacy ? 'ui-btn--free' : '',
    p.inert ? 'is-inert' : '',
    p.icon && (p.children === undefined || p.children === null) ? 'ui-btn--icon-only' : '',
    denied ? 'is-denied' : '',
    p.class ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // The one emphasised action (U1): a gold primary unless opted out, or any kind marked `primary`
  // (a green Upgrade that is the screen's main action).
  const isPrimary = !blocked && (p.primary === true || (kind === 'primary' && p.primary !== false));

  function deny() {
    kit.sound?.('ui_deny');
    haptic('deny');
    if (p.reason) setReason((r) => ({ text: p.reason!, n: (r?.n ?? 0) + 1 }));
    setDenied((n) => n + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDenied(0);
      setReason(null);
    }, 1900);
    p.onDenied?.();
  }

  return (
    <button
      type={p.type ?? 'button'}
      class={cls}
      disabled={blocked && !explains}
      aria-disabled={blocked ? 'true' : undefined}
      aria-label={p.label}
      aria-pressed={p.pressed === undefined ? undefined : p.pressed}
      aria-busy={p.loading ? 'true' : undefined}
      title={p.title}
      data-testid={p.testid}
      data-autofocus={p.autofocus ? '' : undefined}
      data-primary={isPrimary ? '' : undefined}
      data-pulse={p.pulse && !blocked ? '' : undefined}
      data-kind={kind}
      style={p.style}
      onPointerDown={(e) => {
        if (blocked || (e.button !== undefined && e.button !== 0)) return;
        setAttr(e.currentTarget, 'data-released', false);
        setAttr(e.currentTarget, 'data-pressed', true);
        if (kind === 'primary') haptic('tick');
      }}
      onPointerUp={(e) => {
        if (blocked) return;
        setAttr(e.currentTarget, 'data-pressed', false);
        setAttr(e.currentTarget, 'data-released', true);
      }}
      onPointerCancel={(e) => setAttr(e.currentTarget, 'data-pressed', false)}
      onPointerLeave={(e) => setAttr(e.currentTarget, 'data-pressed', false)}
      onAnimationEnd={(e) => {
        if ((e as AnimationEvent).animationName === 'ui-btn-release') setAttr(e.currentTarget, 'data-released', false);
      }}
      onClick={(e) => {
        if (blocked) {
          e.preventDefault();
          deny();
          return;
        }
        if (p.sound !== null) kit.sound?.(p.sound ?? 'ui_click');
        p.onClick?.(e);
      }}
    >
      <span class="ui-btn__face">
        {p.loading ? (
          <span class="ui-btn__icon" aria-hidden="true">
            <i class="ui-btn__spin" />
          </span>
        ) : p.icon ? (
          <span class="ui-btn__icon">{p.icon}</span>
        ) : null}
        {p.children !== undefined && p.children !== null ? (
          <span class="ui-btn__text" data-clip-check="">
            {p.children}
          </span>
        ) : null}
        {p.done ? (
          <span class="ui-btn__done" aria-hidden="true">
            <CheckGlyph />
          </span>
        ) : null}
      </span>
      {reason ? (
        <span class="ui-btn__reason" role="status" key={reason.n} data-testid={p.testid ? `${p.testid}-reason` : undefined}>
          {reason.text}
        </span>
      ) : null}
    </button>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/**
 * Icon-only button (back, close, gear, info, pause): the `icon` size of {@link Button}, 40 visual
 * in a 48 hit box, slate by default. Needs a label for screen readers.
 */
export function IconButton(p: {
  icon: ComponentChildren;
  label: string;
  onClick?: () => void;
  kind?: ButtonKind;
  /** @deprecated Use `kind`. */
  variant?: ButtonVariant;
  class?: string;
  testid?: string;
  badge?: ComponentChildren;
  autofocus?: boolean;
  disabled?: boolean;
  reason?: string;
}) {
  const kind = p.kind ?? (p.variant ? VARIANT_KIND[p.variant] : 'secondary');
  return (
    <span class={`ui-iconbtn ${p.class ?? ''}`}>
      <Button
        kind={kind}
        size="icon"
        icon={p.icon}
        label={p.label}
        title={p.label}
        testid={p.testid}
        autofocus={p.autofocus}
        disabled={p.disabled}
        reason={p.reason}
        primary={false}
        onClick={() => p.onClick?.()}
      />
      {p.badge !== undefined && p.badge !== null && p.badge !== false ? <span class="ui-badge ui-iconbtn__badge">{p.badge}</span> : null}
    </span>
  );
}
