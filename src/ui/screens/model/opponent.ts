/**
 * Opponent presentation (A7.1 labeling, A7.4 Generals). Every opponent in v1 is an AI; screens show
 * the robot icon and "AI" chip next to every name built here, except the Ladder from Home's Battle,
 * whose bot is shown as the online player the simulated search found (`side.online`, owner decision
 * 2026-10-07): its name, avatar and the Player chip, never the AI chip or the General.
 */
import type { GeneralDef } from '@/content/types';
import type { Content } from '@/content/types';
import type { OnlinePlayer, OpponentSpec, SideConfig } from '@/contracts';
import type { Translate } from '../../components/kit';

/** The online player a side is shown as (owner decision 2026-10-07), or null for a labelled AI. */
export function onlineOf(o: { side?: Pick<SideConfig, 'online'> | undefined } | null | undefined): OnlinePlayer | null {
  return o?.side?.online ?? null;
}

/** True when a side carries the AI chip: every bot, unless it is shown as an online player. */
export function showsAiChip(side: Pick<SideConfig, 'isBot' | 'online'>): boolean {
  return side.isBot && !side.online;
}

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
 * The name to show: the online player's tag when the bot is shown as one; a General's name from the
 * content strings; otherwise `displayName`, translated
 * when it is a string key (meta may pass keys) and shown as is for procedural commanders, whose
 * names already carry the "AI · " prefix (A7.4).
 */
export function opponentName(o: Pick<OpponentSpec, 'generalId' | 'displayName'> & { side?: Pick<SideConfig, 'online'> }, content: Content, t: Translate): string {
  const online = onlineOf(o);
  if (online) return online.name;
  const g = generalOf(content, o.generalId);
  if (g) return t(g.nameKey);
  const translated = t(o.displayName);
  return translated !== o.displayName ? translated : o.displayName;
}
