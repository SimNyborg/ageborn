/**
 * The "Your army, your plan" prompt (DESIGN A8, row "After match 3: War Plan screen and Skirmish
 * unlock, with a prompt to review the Stone loadout"). It shows once on Home after match 3: the
 * title, one line, "Open War Plan" (straight to the Stone loadout) and "Later".
 * `flags['tutorial.warPlanPrompt']` keeps it from showing again.
 */
import type { SaveDoc } from '@/contracts';
import { WAR_PLAN_PROMPT_KEY } from '@/tutorial';
import { WAR_PLAN_UNLOCK_MATCHES } from '@/ui/screens';
import type { MetaUi } from '../metaUi';
import { useApp } from './context';
import { firstUpgradeDue } from './FirstUpgrade';

export const WAR_PLAN_PROMPT_FLAG = 'tutorial.warPlanPrompt';

/** True when the prompt should show on Home now. */
export function warPlanPromptDue(s: SaveDoc | null, step: string): boolean {
  return !!s && step === 'home' && s.matchesPlayed >= WAR_PLAN_UNLOCK_MATCHES && !s.flags[WAR_PLAN_PROMPT_FLAG] && !firstUpgradeDue(s, step);
}

export function WarPlanPrompt(p: { meta: MetaUi }) {
  const ui = useApp();
  const c = ui.controller;
  const save = c.save.value;
  const onHome = c.route.value.id === 'title' && p.meta.router.current.value.id === 'home';
  if (!onHome || !warPlanPromptDue(save, c.step.value)) return null;
  const close = (open: boolean): void => {
    const s = c.save.peek();
    if (s) c.setSave({ ...s, flags: { ...s.flags, [WAR_PLAN_PROMPT_FLAG]: true } });
    if (open) p.meta.router.go({ id: 'warPlan', age: 'stone' });
  };
  return (
    <div class="ab-scrim ab-plan-prompt" data-testid="war-plan-prompt">
      <div class="ab-panel ab-plan-prompt__panel" role="dialog" aria-modal="true" aria-labelledby="ab-plan-prompt-title">
        <div class="ab-plan-prompt__flag" aria-hidden="true" />
        <h2 id="ab-plan-prompt-title" class="ab-plan-prompt__title">
          {ui.t(WAR_PLAN_PROMPT_KEY)}
        </h2>
        <p class="ab-plan-prompt__text">{ui.t('tutorial.home.warPlanBody')}</p>
        <div class="ab-row">
          <button type="button" class="ab-btn ab-btn--gold" data-testid="war-plan-prompt-open" autofocus onClick={() => close(true)}>
            {ui.t('tutorial.home.warPlanOpen')}
          </button>
          <button type="button" class="ab-btn ab-btn--plain" data-testid="war-plan-prompt-later" onClick={() => close(false)}>
            {ui.t('tutorial.home.later')}
          </button>
        </div>
      </div>
    </div>
  );
}
