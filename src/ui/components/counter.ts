/**
 * What the Amber and Dust counters show while a collect moment drives them (queue item 48, `collect.ts`).
 * The save already holds a claim's new total when the moment starts, so a counter chip shows the moment's
 * count instead (null: the save's own value), and it counts up as the pieces land rather than jumping first.
 * Display only: nothing here is ever saved, and a counter's accessible name keeps the save's true value.
 */
import { signal } from '@preact/signals';

export type CurrencyKind = 'amber' | 'dust';

export const counterOverride = signal<Readonly<Record<CurrencyKind, number | null>>>({ amber: null, dust: null });

/** Sets (a number) or releases (null) what the counters of `kind` show. */
export function setCounterOverride(kind: CurrencyKind, v: number | null): void {
  if (counterOverride.peek()[kind] === v) return;
  counterOverride.value = { ...counterOverride.peek(), [kind]: v };
}

/** The value a counter of `kind` shows: the moment's count while one plays, else `saved`. */
export function counterValue(kind: CurrencyKind, saved: number): number {
  return counterOverride.value[kind] ?? saved;
}

/** Whether a moment drives the counters of `kind` right now. */
export function counterDriven(kind: CurrencyKind): boolean {
  return counterOverride.value[kind] !== null;
}
