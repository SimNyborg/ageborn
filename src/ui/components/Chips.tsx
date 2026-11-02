/**
 * Small labels: currency chips (A6.2: Amber, Dust, trophies, charges), the AI badge (A7.1) and pills.
 * Currency values animate with a short pop when they change (skipped under reduce motion).
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { counterDriven, counterValue } from './counter';
import { formatInt } from './format';
import { AmberIcon, DustIcon, RobotIcon, TrophyIcon } from './icons';
import { useKit } from './kit';

export type Currency = 'amber' | 'dust' | 'trophies';

const CURRENCY_LABEL: Record<Currency, string> = {
  amber: 'ui.currency.amber',
  dust: 'ui.currency.dust',
  trophies: 'ui.currency.trophies',
};

export function CurrencyIcon(p: { kind: Currency; size?: number }) {
  if (p.kind === 'amber') return <AmberIcon size={p.size} />;
  if (p.kind === 'dust') return <DustIcon size={p.size} />;
  return <TrophyIcon size={p.size} />;
}

/**
 * A currency counter chip. Numbers pop briefly when they change. An Amber or Dust chip is a collect target
 * (`data-currency-counter`, queue item 48): while a collect moment plays it shows the moment's count, which
 * the moment pulses itself; its accessible name always gives the save's true value.
 */
export function CurrencyChip(p: { kind: Currency; value: number; testid?: string; compact?: boolean }) {
  const { t, locale } = useKit();
  const wallet = p.kind === 'trophies' ? null : p.kind;
  const shown = wallet ? counterValue(wallet, p.value) : p.value;
  const driven = wallet ? counterDriven(wallet) : false;
  const prev = useRef(shown);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (prev.current === shown) return;
    prev.current = shown;
    if (driven) return;
    setPop(true);
    const id = setTimeout(() => setPop(false), 350);
    return () => clearTimeout(id);
  }, [shown]);
  const label = t(CURRENCY_LABEL[p.kind]);
  return (
    <span
      class={`ui-chip ui-chip--${p.kind}${pop ? ' is-pop' : ''}${p.compact ? ' ui-chip--compact' : ''}`}
      data-testid={p.testid}
      data-currency-counter={wallet ?? undefined}
      title={label}
    >
      <span class="ui-chip__icon">
        <CurrencyIcon kind={p.kind} size={p.compact ? 22 : 26} />
      </span>
      <span class="ui-chip__value" aria-label={`${label}: ${formatInt(p.value, locale)}`}>
        {formatInt(shown, locale)}
      </span>
    </span>
  );
}

/**
 * The AI label shown on every bot nameplate (DESIGN A7.1): a robot icon and an "AI" chip.
 * `general` adds the words "AI General" (VS screen, Conquest board).
 */
export function AiBadge(p: { general?: boolean; size?: 'sm' | 'md' }) {
  const { t } = useKit();
  return (
    <span class={`ui-ai ui-ai--${p.size ?? 'md'}`} data-testid="ai-badge">
      <RobotIcon size={p.size === 'sm' ? 16 : 20} />
      {/* One label, not "AI" beside "AI General" (A7.1 asks for the AI label once, plainly). */}
      <span class="ui-ai__chip" data-tag="">
        {p.general ? t('ui.ai.general') : t('ui.ai.chip')}
      </span>
    </span>
  );
}

export type PillTone = 'neutral' | 'gold' | 'green' | 'red' | 'blue' | 'violet';

export function Pill(p: { tone?: PillTone; icon?: ComponentChildren; children: ComponentChildren; testid?: string; title?: string }) {
  return (
    <span class={`ui-pill ui-pill--${p.tone ?? 'neutral'}`} data-testid={p.testid} title={p.title}>
      {p.icon ? <span class="ui-pill__icon">{p.icon}</span> : null}
      <span>{p.children}</span>
    </span>
  );
}

/** Red notification dot with an optional count. */
export function Badge(p: { children?: ComponentChildren; tone?: 'red' | 'green' | 'gold' }) {
  return <span class={`ui-badge ui-badge--${p.tone ?? 'red'}`}>{p.children}</span>;
}
