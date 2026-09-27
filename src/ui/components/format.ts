/**
 * Number, time and tier formatting for the UI. Words come from i18n; digits and separators come from
 * `Intl` for the current locale, so the Danish files in v1.1 need no code change.
 */
import type { Translate } from './kit';

const numberFormats = new Map<string, Intl.NumberFormat>();

function nf(locale: string, digits: number): Intl.NumberFormat {
  const key = `${locale}|${digits}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
    numberFormats.set(key, f);
  }
  return f;
}

/** 12345 → "12,345" (EN). */
export function formatInt(n: number, locale = 'en'): string {
  return nf(locale, 0).format(Math.round(n));
}

/** Fixed decimals: formatDec(3.4, 1) → "3.4". */
export function formatDec(n: number, digits: number, locale = 'en'): string {
  return nf(locale, digits).format(n);
}

/** Signed integer: +30, −20, 0. Uses a real minus sign. */
export function formatSigned(n: number, locale = 'en'): string {
  if (n > 0) return `+${formatInt(n, locale)}`;
  if (n < 0) return `−${formatInt(-n, locale)}`;
  return formatInt(0, locale);
}

/** Match clock: 125000 → "2:05". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** AI tiers are written 0, I … X (A7.3). */
export function tierNumeral(tier: number): string {
  return ROMAN[Math.max(0, Math.min(10, Math.round(tier)))] ?? String(tier);
}

/**
 * A countdown such as "3h 12m", "12m 5s" or "2d 4h", using the `ui.time.*` keys.
 * Never negative; below one second it reads "0s".
 */
export function formatCountdown(ms: number, t: Translate): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return t('ui.time.dh', { d, h });
  if (h > 0) return t('ui.time.hm', { h, m });
  if (m > 0) return t('ui.time.ms', { m, s: sec });
  return t('ui.time.s', { s: sec });
}

/** Seconds with one decimal for stats: 1400 ms → "1.4". */
export function formatSeconds(ms: number, locale = 'en'): string {
  return formatDec(ms / 1000, ms % 1000 === 0 ? 0 : ms % 100 === 0 ? 1 : 2, locale);
}
