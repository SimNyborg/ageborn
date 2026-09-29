/**
 * Formats as age windows (DESIGN A18.3.4): a format is an open key into `content.formats`. Meta reads
 * the window of a format, its family (rewards, labels and ladder tables are keyed by the family) and
 * the key of a window that starts in a later age (Quick Battle and Skirmish start eras, Era of the Week).
 */
import type { AgeId, FormatId, FormatKind, NamedFormatId } from '@/contracts';
import type { Content } from '@/content';

/** The ages a format plays, in order ([] for an unknown key). */
export function formatAges(t: Content, format: FormatId): AgeId[] {
  return t.formats[format]?.ages ?? [];
}

/** The family of a format: `tutorial`, `short`, `standard`, `full`, or `window` for the 1, 2 and 4-age windows. */
export function formatKind(t: Content, format: FormatId): FormatKind {
  const f = t.formats[format];
  if (f?.kind) return f.kind;
  return format === 'tutorial' || format === 'short' || format === 'standard' || format === 'full' ? format : 'window';
}

/**
 * The named format whose rewards and trophies a format pays (A15.8): its own family, or for a shorter
 * window the named format of the nearest length (1-3 ages: Short; 4-5: Standard; longer: Full).
 */
export function rewardFormat(t: Content, format: FormatId): NamedFormatId {
  const k = formatKind(t, format);
  if (k !== 'window') return k;
  const n = formatAges(t, format).length;
  return n <= 3 ? 'short' : n <= 5 ? 'standard' : 'full';
}

/**
 * The key of the window of a named format's length that starts at `start` (A18.3.4), or null when the
 * content has no such window (it would run past the last age). `short` from Stone is `short`; from
 * Bronze `short.bronze`.
 */
export function windowOf(t: Content, kind: Exclude<NamedFormatId, 'tutorial'>, start: AgeId): FormatId | null {
  const key = start === 'stone' ? kind : `${kind}.${start}`;
  return t.formats[key] ? key : null;
}
