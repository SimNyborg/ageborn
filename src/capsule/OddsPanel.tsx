/**
 * The odds panel over the capsule show (DESIGN A6.4, A6.5, A15.3, C5 #27). It always leads with the
 * honesty line; for scripted Starter Capsules 1-5 it says "Set contents" instead of bag odds. The
 * published odds, the bag state and the live pity counters come from the app as `children` (WP9's
 * odds sheet, built from the same tables the meta rolls with), so the show owns no odds tables.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { I18n } from '@/contracts';
import css from './capsule.module.css';

export interface OddsPanelProps {
  i18n: I18n;
  /** Every capsule on screen is a scripted Starter Capsule (A6.5): show "Set contents". */
  scripted: boolean;
  onClose: () => void;
  /** The odds sheet (bag state, tier contents, pity counters). */
  children?: ComponentChildren;
}

export function OddsPanel(p: OddsPanelProps) {
  const t = (k: string) => p.i18n.t(k);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  const stop = (e: Event) => e.stopPropagation();
  return (
    <div
      class={css.oddsWrap}
      onPointerDown={stop}
      onPointerUp={stop}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') p.onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) p.onClose();
      }}
      data-testid="capsule-odds"
    >
      <div class={css.oddsPanel} role="dialog" aria-modal="true" aria-label={t('capsule.odds.title')}>
        <div class={css.oddsHead}>
          <h2 class={css.summaryTitle}>{t('capsule.odds.title')}</h2>
          <button ref={close} class={css.btn} type="button" onClick={() => p.onClose()} data-testid="capsule-odds-close">
            {t('capsule.odds.close')}
          </button>
        </div>
        <p class={css.oddsHonesty} data-testid="capsule-odds-honesty">
          {t('capsule.honesty')}
        </p>
        {p.scripted ? (
          <div class={css.oddsSet} data-testid="capsule-odds-set">
            <h3>{t('capsule.odds.setContents')}</h3>
            <p>{t('capsule.odds.setContentsBody')}</p>
          </div>
        ) : (
          <div class={css.oddsBody}>{p.children}</div>
        )}
      </div>
    </div>
  );
}
