/**
 * Opponent presentation (A7.1 labeling, A7.4 Generals). Every opponent in v1 is an AI; screens show
 * the robot icon and "AI" chip next to every name built here.
 */
import type { GeneralDef } from '@/content/types';
import type { Content } from '@/content/types';
import type { OpponentSpec } from '@/contracts';
import type { Translate } from '../../components/kit';

export function generalOf(content: Content, generalId: string): GeneralDef | null {
  return (content.generals.list as Record<string, GeneralDef | undefined>)[generalId] ?? null;
}

/**
 * The General whose personality an opponent plays (A7.4): the General itself, or for a procedural AI
 * Commander (`generalId` = `commander:<general>:<favourite card>`, as meta builds it) the General whose
 * personality it copies. Null when neither is known.
 */
export function personalityOf(o: Pick<OpponentSpec, 'generalId'>, content: Content): GeneralDef | null {
  const own = generalOf(content, o.generalId);
  if (own) return own;
  const parts = o.generalId.split(':');
  return parts.length >= 2 && parts[1] ? generalOf(content, parts[1]) : null;
}

/**
 * The name to show: a General's name from the content strings; otherwise `displayName`, translated
 * when it is a string key (meta may pass keys) and shown as is for procedural commanders, whose
 * names already carry the "AI · " prefix (A7.4).
 */
export function opponentName(o: Pick<OpponentSpec, 'generalId' | 'displayName'>, content: Content, t: Translate): string {
  const g = generalOf(content, o.generalId);
  if (g) return t(g.nameKey);
  const translated = t(o.displayName);
  return translated !== o.displayName ? translated : o.displayName;
}
