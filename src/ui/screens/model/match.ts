/**
 * Starting a match from the meta screens (A9 flow: Mode select, Conquest, Result "Next battle").
 *
 * A War Plan may have empty slots (A3), but a match needs the minimum to play in every age its format
 * uses: 3 units and 1 turret (A3 "Minimum to play"). The advisor's `error` findings are exactly those
 * blockers; warnings never block.
 */
import { ageNameKey } from '@/content/keys';
import type { Content } from '@/content/types';
import type { FormatId, PlanIssue } from '@/contracts';
import type { Translate } from '../../components/kit';
import type { MatchRequest } from '../../router';

/** The format a request plays, or null when the app builds it itself (the onboarding matches). */
export function requestFormat(req: MatchRequest, content: Content): FormatId | null {
  switch (req.mode) {
    case 'ladder':
      return req.format;
    case 'skirmish':
      return req.options.format;
    case 'daily':
      return content.dailyModifiers.challenge.format;
    case 'conquest':
      return content.generals.conquest.format;
    case 'tutorial':
      return null;
    case 'warPath':
      return content.warPath.levels[req.level]?.format ?? null;
  }
}

/** The findings that stop the plan from playing (A3: warnings never block). */
export function blockers(issues: readonly PlanIssue[]): PlanIssue[] {
  return issues.filter((i) => i.severity === 'error');
}

/**
 * The text of an advisor finding (`meta.validatePlan` message keys take `{age}`). A finding meta adds
 * later without a UI string falls back to a generic line instead of showing its key.
 */
export function planIssueText(i: PlanIssue, t: Translate): string {
  const age = t(ageNameKey(i.age));
  const msg = t(i.messageKey, { age });
  return msg === i.messageKey ? t('ui.advisor.generic', { age }) : msg;
}
