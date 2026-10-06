/**
 * The test profile dialog (owner request 2026-10-06), shown only when the page was opened with
 * `?tester=1`. Pick a profile, confirm that it replaces this browser's progress, and the profile is
 * written through the normal save store; the page then reloads into Home without `tester=1`. Cancel
 * just drops the flag from the URL. Players never see it: nothing in the game links here.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { validateSaveDoc } from '@/save';
import { Button } from '@/ui/components/Button';
import { CapsuleIcon, CrownIcon, InfoIcon, ScrollIcon } from '@/ui/components/icons';
import { useBlockingOverlay } from '@/ui/components/overlay';
import { TESTER_PROFILE_FLAG, testerRequested, testerSave, urlWithoutTester, type TesterProfile } from '../tester';
import { useApp } from './context';

type Step = { id: 'pick' } | { id: 'confirm'; kind: TesterProfile } | { id: 'working'; kind: TesterProfile } | { id: 'failed' };

/** Leaves the URL without `tester=1` (no reload). */
function dropFlag(): void {
  try {
    window.history.replaceState(window.history.state, '', urlWithoutTester(window.location.href));
  } catch {
    // A sandboxed frame may refuse; the flag then stays until the next visit, which is harmless.
  }
}

export function TesterDialog() {
  const ui = useApp();
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && testerRequested(window.location.search));
  const [step, setStep] = useState<Step>({ id: 'pick' });
  const panel = useRef<HTMLDivElement>(null);
  useBlockingOverlay(open);

  // Focus the step's first choice (Enter picks it, Tab stays inside the dialog).
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('[data-autofocus], .ui-btn')?.focus();
  }, [open, step.id]);

  if (!open) return null;
  const t = ui.t;

  function cancel(): void {
    dropFlag();
    setOpen(false);
  }

  async function apply(kind: TesterProfile): Promise<void> {
    setStep({ id: 'working', kind });
    const { services, controller } = ui;
    try {
      const now = services.clock.now();
      const save = testerSave(kind, services.content, services.clock, now >>> 0);
      if (!validateSaveDoc(save).ok) throw new Error('invalid test profile');
      controller.setSave(save);
      await services.saveStore.save(save, { immediate: true });
      // Read it back: the reload must find exactly this profile.
      const back = await services.saveStore.load();
      if (!back || back.flags[TESTER_PROFILE_FLAG] !== true || back.createdAt !== save.createdAt) throw new Error('test profile not stored');
      services.eventLog.record('tester', kind, {});
      window.location.replace(urlWithoutTester(window.location.href));
    } catch (e) {
      console.warn('[tester] could not apply the test profile', e);
      setStep({ id: 'failed' });
    }
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (step.id === 'confirm' || step.id === 'failed') setStep({ id: 'pick' });
      else if (step.id === 'pick') cancel();
      return;
    }
    if (e.key === 'Tab' && panel.current) {
      const els = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      if (els.length === 0) return;
      const first = els[0]!;
      const last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const option = (kind: TesterProfile, i: number) => {
    const everything = kind === 'everything';
    return (
      <Button
        key={kind}
        kind={everything ? 'primary' : 'secondary'}
        size="l"
        wide
        class={`ab-tester__opt ab-tester__opt--${kind}`}
        style={{ animationDelay: `${80 + i * 60}ms` }}
        testid={`tester-${kind}`}
        autofocus={everything}
        icon={everything ? <CrownIcon size={30} /> : <ScrollIcon size={30} />}
        onClick={() => setStep({ id: 'confirm', kind })}
      >
        <span class="ab-tester__name">{t(everything ? 'tester.everything.name' : 'tester.mid.name')}</span>
        <span class="ab-tester__desc">{t(everything ? 'tester.everything.desc' : 'tester.mid.desc')}</span>
      </Button>
    );
  };

  return (
    <div class="ab-scrim ab-tester" data-testid="tester-dialog" onKeyDown={onKeyDown}>
      <div
        ref={panel}
        class={`ab-panel ab-tester__panel is-${step.id}`}
        role={step.id === 'confirm' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="ab-tester-title"
        aria-describedby="ab-tester-lead"
      >
        {step.id === 'pick' ? (
          <>
            <header class="ab-tester__head">
              <span class="ab-tester__emblem" aria-hidden="true">
                <CapsuleIcon tier="aeon" size={44} />
              </span>
              <div class="ab-tester__titles">
                <h2 id="ab-tester-title" class="ab-tester__title">
                  {t('tester.title')}
                </h2>
                <span class="ab-tester__badge">{t('tester.badge')}</span>
              </div>
            </header>
            <p id="ab-tester-lead" class="ab-tester__lead">
              {t('tester.lead')}
            </p>
            <div class="ab-tester__list">{(['everything', 'midGame'] as const).map(option)}</div>
            <Button kind="tertiary" size="m" class="ab-tester__cancel" testid="tester-cancel" onClick={cancel}>
              {t('tester.cancel')}
            </Button>
          </>
        ) : step.id === 'failed' ? (
          <>
            <h2 id="ab-tester-title" class="ab-tester__title">
              {t('tester.title')}
            </h2>
            <p id="ab-tester-lead" class="ab-tester__lead ab-tester__lead--bad" data-testid="tester-failed">
              {t('tester.failed')}
            </p>
            <div class="ab-tester__row">
              <Button kind="secondary" size="m" testid="tester-back" onClick={() => setStep({ id: 'pick' })}>
                {t('tester.confirm.back')}
              </Button>
              <Button kind="tertiary" size="m" testid="tester-cancel" onClick={cancel}>
                {t('tester.cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <span class="ab-tester__warn" aria-hidden="true">
              <InfoIcon size={34} />
            </span>
            <h2 id="ab-tester-title" class="ab-tester__title">
              {t('tester.confirm.title')}
            </h2>
            <p class="ab-tester__picked">{t(step.kind === 'everything' ? 'tester.everything.name' : 'tester.mid.name')}</p>
            <p id="ab-tester-lead" class="ab-tester__lead" data-testid="tester-confirm-text">
              {t('tester.confirm.text')}
            </p>
            <div class="ab-tester__row">
              <Button
                kind="secondary"
                size="l"
                testid="tester-back"
                disabled={step.id === 'working'}
                onClick={() => setStep({ id: 'pick' })}
              >
                {t('tester.confirm.back')}
              </Button>
              <Button
                kind="destructive"
                size="l"
                primary
                testid="tester-confirm"
                loading={step.id === 'working'}
                disabled={step.id === 'working'}
                onClick={() => void apply(step.kind)}
              >
                {step.id === 'working' ? t('tester.loading') : t('tester.confirm.go')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
