/**
 * The Age Capsule dialog (DESIGN A6.4): "all from one age picked in a dialog when granted". Shown
 * over whatever is on screen when the controller's `AgePicker` asks (a match end or a quest claim).
 * One button per drop-pool age; the suggested age (most cards not owned yet) is marked and focused.
 */
import { useEffect } from 'preact/hooks';
import { ageNameKey } from '@/content';
import { useApp } from './context';
import { Button } from '@/ui/components/Button';
import { useBlockingOverlay } from '@/ui/components/overlay';

export function AgeDialog() {
  const ui = useApp();
  const picker = ui.controller.agePicker;
  useEffect(() => picker.attach(), [picker]);
  const req = picker.request.value;
  useBlockingOverlay(!!req);
  // Focus the suggested age when the dialog opens (Enter picks it).
  useEffect(() => {
    if (!req || typeof document === 'undefined') return;
    document.querySelector<HTMLElement>(`[data-testid="age-pick-${req.suggested}"]`)?.focus();
  }, [req]);
  if (!req) return null;
  return (
    <div
      class="ab-scrim ab-age"
      data-testid="age-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          req.pick(req.suggested);
        }
      }}
    >
      <div class="ab-panel ab-age__panel" role="dialog" aria-modal="true" aria-labelledby="ab-age-title">
        <div class="ab-age__capsule" aria-hidden="true" />
        <h2 id="ab-age-title" class="ab-age__title">
          {ui.t('app.agePick.title')}
        </h2>
        <p class="ab-age__lead">{ui.t('app.agePick.lead')}</p>
        <div class="ab-age__list">
          {req.ages.map((age, i) => (
            <Button
              key={age}
              kind={age === req.suggested ? 'primary' : 'secondary'}
              size="l"
              wide
              class={`ab-age__btn ab-age__btn--${age}${age === req.suggested ? ' is-suggested' : ''}`}
              style={{ animationDelay: `${60 + i * 50}ms` }}
              testid={`age-pick-${age}`}
              autofocus={age === req.suggested}
              onClick={() => req.pick(age)}
            >
              <span class="ab-age__name">{ui.t(ageNameKey(age))}</span>
              {age === req.suggested ? <span class="ab-age__hint">{ui.t('app.agePick.suggested')}</span> : null}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
