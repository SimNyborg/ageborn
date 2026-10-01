/**
 * Formats as age windows (DESIGN A18.3.4): a format is an open key into `content.formats`. Meta reads
 * the window of a format, its family (rewards, labels and ladder tables are keyed by the family) and
 * the key of a window that starts in a later age (Quick Battle and Skirmish start eras, Era of the Week).
 */
import type { AgeId, FormatId, NamedFormatId } from '@/contracts';
import type { Content } from '@/content';

/** The ages a format plays, in order ([] for an unknown key). */
export function formatAges(t: Content, format: FormatId): AgeId[] {
  return t.formats[format]?.ages ?? [];
}

/** The family of a format and the named format it pays (shared with the UI through content). */
export { formatKind, rewardFormat } from '@/content/ladder';

/**
 * The key of the window of a named format's length that starts at `start` (A18.3.4), or null when the
 * content has no such window (it would run past the last age). `short` from Stone is `short`; from
 * Bronze `short.bronze`; Last Base Standing from Bronze `last.bronze` (A2.10.1).
 */
export function windowOf(t: Content, kind: Exclude<NamedFormatId, 'tutorial'>, start: AgeId): FormatId | null {
  const key = start === 'stone' ? kind : `${kind}.${start}`;
  return t.formats[key] ? key : null;
}
