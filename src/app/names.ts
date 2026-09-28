/**
 * Display names that may be string keys (DESIGN B4 Strings, A7.4). Meta gives a named General's
 * name as its key (`general.pip.name`) and a procedural AI Commander's as a literal ("AI · Brakka
 * Stonejaw"), so every screen and the HUD nameplate go through `displayName`.
 */
import type { I18n } from '@/contracts';

export function displayName(label: string, i18n: Pick<I18n, 't' | 'has'>): string {
  return label !== '' && i18n.has(label) ? i18n.t(label) : label;
}
