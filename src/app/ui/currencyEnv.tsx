/**
 * Amber and Dust for the capsule layer (queue item 48): the capsule show and its summary may not import the
 * UI (B2), so the app hands them the UI's currency icons ({@link CurrencyContext}), so a capsule's Amber
 * looks like the Amber of every other screen.
 */
import type { CurrencyEnv } from '@/capsule/summary';
import { AmberIcon, DustIcon } from '@/ui/components/icons';

export interface CurrencyEnvDeps {
  /** Plays the collect moment for amounts the summary shows (the app's shared collect moment). */
  collect?: CurrencyEnv['collect'];
}

export function currencyEnv(d: CurrencyEnvDeps = {}): CurrencyEnv {
  return {
    icon: (kind, size, shine) => (kind === 'dust' ? <DustIcon size={size} shine={shine} /> : <AmberIcon size={size} shine={shine} />),
    ...(d.collect ? { collect: d.collect } : {}),
  };
}
