/**
 * Amber and Dust for the capsule layer (queue item 48): the capsule show and its summary may not import the
 * UI (B2), so the app hands them the UI's currency icons and its collect moment ({@link CurrencyContext}): a
 * capsule's Amber looks like the Amber of every other screen, and the summary's totals fly into the wallet.
 */
import type { CurrencyEnv } from '@/capsule/summary';
import type { SaveDoc } from '@/contracts';
import { collectCurrency } from '@/ui/components/collect';
import { AmberIcon, DustIcon } from '@/ui/components/icons';

export interface CurrencyEnvDeps {
  /** The save after the opening (it already holds the capsule's Amber and Dust). */
  save?: () => SaveDoc | null;
  /** The audio service's `play` for the moment's pickup, ticks and chime. */
  sound?: (id: string, o?: { pitchBp?: number }) => void;
  t?: (key: string) => string;
  /** Where the moment plays (default: the summary's own UI root); the capsule bench passes its stage. */
  root?: () => HTMLElement | null;
}

export function currencyEnv(d: CurrencyEnvDeps = {}): CurrencyEnv {
  return {
    icon: (kind, size, shine) => (kind === 'dust' ? <DustIcon size={size} shine={shine} /> : <AmberIcon size={size} shine={shine} />),
    ...(d.save
      ? {
          collect: (items) => {
            const s = d.save?.();
            if (!s) return;
            items.forEach((it, i) =>
              collectCurrency({
                kind: it.kind,
                amount: it.amount,
                from: it.from,
                total: s.currencies[it.kind],
                sound: d.sound,
                reduce: s.settings.reduceMotion,
                locale: 'en',
                ...(d.t ? { label: d.t(`ui.currency.${it.kind}`) } : {}),
                ...(d.root ? { root: d.root() } : {}),
                // Dust follows Amber a beat later, so the two flights read as two
                delay: i * 260,
              }),
            );
          },
        }
      : {}),
  };
}
