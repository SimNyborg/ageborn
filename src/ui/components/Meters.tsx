/**
 * Bars and meters: a generic progress bar, the card copies bar (A6.6, A10 step 7), the Clay meter
 * (A6.3: a 3-pip bar that turns into a Clay capsule) and star rows (A6.10 Conquest).
 */
import type { ComponentChildren } from 'preact';
import { formatInt } from './format';
import { ArrowUpIcon, CapsuleIcon, StarIcon } from './icons';
import { useKit } from './kit';

export type BarTone = 'gold' | 'green' | 'blue' | 'violet' | 'amber' | 'red';

export function ProgressBar(p: {
  value: number;
  max: number;
  tone?: BarTone;
  label?: string;
  children?: ComponentChildren;
  testid?: string;
  thin?: boolean;
}) {
  const frac = p.max > 0 ? Math.max(0, Math.min(1, p.value / p.max)) : 0;
  return (
    <div
      class={`ui-bar ui-bar--${p.tone ?? 'gold'}${p.thin ? ' ui-bar--thin' : ''}`}
      role="progressbar"
      aria-label={p.label}
      aria-valuemin={0}
      aria-valuemax={p.max}
      aria-valuenow={Math.min(p.value, p.max)}
      data-testid={p.testid}
    >
      <i class="ui-bar__fill" style={{ width: `${frac * 100}%` }} />
      {p.children !== undefined ? <span class="ui-bar__text">{p.children}</span> : null}
    </div>
  );
}

/**
 * Copies toward the next level ("3/4"). When enough copies are owned it turns green with an arrow
 * ("UPGRADE READY" is shown by the card tile). At max level it shows "MAX".
 */
export function CopiesBar(p: { copies: number; needed: number | null; ready: boolean }) {
  const { t, locale } = useKit();
  if (p.needed === null) {
    return (
      <div class="ui-copies is-max" data-testid="copies-bar">
        <i class="ui-copies__fill" style={{ width: '100%' }} />
        <span class="ui-copies__text">{t('ui.card.max')}</span>
      </div>
    );
  }
  const frac = p.needed > 0 ? Math.min(1, p.copies / p.needed) : 1;
  return (
    <div
      class={`ui-copies${p.ready ? ' is-ready' : ''}`}
      data-testid="copies-bar"
      role="progressbar"
      aria-label={t('ui.card.copies')}
      aria-valuemin={0}
      aria-valuemax={p.needed}
      aria-valuenow={Math.min(p.copies, p.needed)}
    >
      <i class="ui-copies__fill" style={{ width: `${frac * 100}%` }} />
      {p.ready ? (
        <span class="ui-copies__arrow">
          <ArrowUpIcon size={14} />
        </span>
      ) : null}
      <span class="ui-copies__text">{t('ui.card.copiesOf', { n: formatInt(p.copies, locale), need: formatInt(p.needed, locale) })}</span>
    </div>
  );
}

/** The Clay meter: `pips` of `max` filled; full makes a Clay capsule (A6.3). */
export function ClayMeter(p: { pips: number; max: number }) {
  const { t } = useKit();
  const pips = Array.from({ length: p.max }, (_, i) => i < p.pips);
  return (
    <div
      class="ui-clay"
      data-testid="clay-meter"
      role="meter"
      aria-label={t('ui.clay.label')}
      aria-valuemin={0}
      aria-valuemax={p.max}
      aria-valuenow={p.pips}
    >
      <span class="ui-clay__cap">
        <CapsuleIcon tier="clay" size={30} />
      </span>
      <span class="ui-clay__pips">
        {pips.map((on, i) => (
          <i key={i} class={`ui-clay__pip${on ? ' is-on' : ''}`} />
        ))}
      </span>
      <span class="ui-clay__text">{t('ui.clay.progress', { n: p.pips, max: p.max })}</span>
    </div>
  );
}

export function Stars(p: { earned: readonly boolean[]; size?: number; label?: string }) {
  return (
    <span class="ui-stars" role="img" aria-label={p.label}>
      {p.earned.map((on, i) => (
        <span key={i} class={`ui-stars__star${on ? ' is-on' : ''}`}>
          <StarIcon filled={on} size={p.size ?? 20} />
        </span>
      ))}
    </span>
  );
}
