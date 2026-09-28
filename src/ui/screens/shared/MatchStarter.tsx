/**
 * Starts a match from any meta screen (A9 flow: Mode select, the Conquest board, Result "Next
 * battle"): checks that the active War Plan can play the request's format (A3 "Minimum to play"),
 * asks the app for the opponent (`prepareMatch`, A6.8) and shows VS. When the plan cannot play, a
 * dialog lists what is missing and opens the War Plan at the first problem age.
 */
import './shared.css';
import { formatNameKey } from '@/content/keys';
import type { FormatId, PlanIssue } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { ScrollIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import type { MatchRequest } from '../../router';
import { useUi } from '../context';
import { blockers, planIssueText, requestFormat } from '../model/match';
import { activePlan } from '../model/plan';

export interface MatchStarter {
  /** Starts `req`; false (and the dialog opens) when the War Plan cannot play it. */
  start(req: MatchRequest, o?: { resetToHome?: boolean }): boolean;
  /** The "War Plan not ready" dialog, or null. Render it once in the screen. */
  dialog: ComponentChildren;
}

export function useMatchStarter(): MatchStarter {
  const { save, content, t, router, services } = useUi();
  const [blocked, setBlocked] = useState<{ format: FormatId; issues: PlanIssue[] } | null>(null);

  function start(req: MatchRequest, o?: { resetToHome?: boolean }): boolean {
    const format = requestFormat(req, content);
    if (format) {
      const issues = blockers(services.validatePlan(activePlan(save.value, content).plan, format));
      if (issues.length > 0) {
        setBlocked({ format, issues });
        return false;
      }
    }
    const opponent = services.prepareMatch(req);
    if (o?.resetToHome) router.reset({ id: 'home' });
    router.go({ id: 'vs', request: req, opponent });
    return true;
  }

  const dialog = blocked ? (
    <Modal
      title={t('ui.warplan.blockedTitle')}
      tone="danger"
      size="sm"
      onClose={() => setBlocked(null)}
      testid="plan-blocked"
      footer={
        <Button
          variant="green"
          icon={<ScrollIcon size={22} />}
          autofocus
          testid="plan-blocked-fix"
          onClick={() => {
            const age = blocked.issues[0]?.age;
            setBlocked(null);
            router.go({ id: 'warPlan', ...(age ? { age } : {}) });
          }}
        >
          {t('ui.warplan.blockedFix')}
        </Button>
      }
    >
      <p>{t('ui.warplan.blockedBody', { format: t(formatNameKey(blocked.format)) })}</p>
      <ul class="plan-blocked__list">
        {blocked.issues.map((i) => (
          <li key={`${i.age}-${i.code}`}>{planIssueText(i, t)}</li>
        ))}
      </ul>
    </Modal>
  ) : null;

  return { start, dialog };
}
