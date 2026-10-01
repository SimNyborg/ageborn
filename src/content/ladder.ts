/**
 * Format families and the ladder win row (DESIGN A15.8, A18.3.4, A2.10.1): pure lookups over the
 * compiled content, shared by `meta` (which pays the rewards) and `ui` (which shows them), so the two
 * can never disagree.
 */
import type { FormatId, FormatKind, NamedFormatId, SaveDoc } from '@/contracts';
import type { Content, LadderWin } from './types';

/**
 * The family of a format: `tutorial`, `short`, `standard`, `full`, `untimed` (Last Base Standing,
 * A2.10.1), or `window` for the 1, 2 and 4-age windows.
 */
export function formatKind(t: Pick<Content, 'formats'>, format: FormatId): FormatKind {
  const f = t.formats[format];
  if (f?.kind) return f.kind;
  if (format === 'last') return 'untimed';
  return format === 'tutorial' || format === 'short' || format === 'standard' || format === 'full' ? format : 'window';
}

/**
 * The named format whose rewards and trophies a format pays (A15.8): its own family (`last` for an
 * untimed war, A2.10.1), or for a shorter window the named format of the nearest length (1-3 ages:
 * Short; 4-5: Standard; longer: Full).
 */
export function rewardFormat(t: Pick<Content, 'formats'>, format: FormatId): NamedFormatId {
  const k = formatKind(t, format);
  if (k === 'untimed') return 'last';
  if (k !== 'window') return k;
  const n = t.formats[format]?.ages.length ?? 0;
  return n <= 3 ? 'short' : n <= 5 ? 'standard' : 'full';
}

/**
 * The ladder win reward for a format (A15.8): from 400 trophies each format pays its own row; below
 * that every format pays A6.3's. An unranked length (Last Base Standing, A2.10.1) pays its own row at
 * every trophy count. With no format, A6.3's row.
 */
export function ladderWinFor(s: Pick<SaveDoc, 'trophies'>, t: Content, format?: FormatId): LadderWin {
  const l = t.arenas.ladder;
  if (!format) return l.win;
  // A window pays the row of its family (A18.3.4: `short.bronze` pays Short War's).
  const row = l.winByFormat.formats[rewardFormat(t, format)];
  if (row?.unranked) return row;
  if (s.trophies.current < l.winByFormat.fromTrophies) return l.win;
  return row ?? l.win;
}

/** True when a format moves no trophies (A2.10.1: Last Base Standing is unranked). */
export function isUnranked(t: Content, format?: FormatId): boolean {
  return format !== undefined && t.arenas.ladder.winByFormat.formats[rewardFormat(t, format)]?.unranked === true;
}
