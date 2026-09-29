/**
 * The onboarding's one forced upgrade (DESIGN A8 ~9:00: "One forced upgrade: Bonker to L2 (hammer
 * slam)", text "+5% HP and damage"; A6.6 "the upgrade itself is a reward moment").
 *
 * It shows once, right after capsule 2 (the onboarding step is Home), over the Home screen: the
 * Bonker card, its level and its cost, and one gold Upgrade button. The tap applies `meta.upgrade`
 * and saves at once (B8), then plays the hammer slam, the level count-up and the stat bars growing.
 * "Continue" closes it; `flags['tutorial.firstUpgrade']` keeps it from showing again. If the
 * upgrade is not possible (an imported save, a card already upgraded) it never shows.
 */
import { useEffect, useState } from 'preact/hooks';
import type { SaveDoc } from '@/contracts';
import { upgradeBlocker, upgradeCost } from '@/meta';
import { asContent } from '@/content';
import { isMetaRules } from '../uiServices';
import { useApp } from './context';
import { Button } from '@/ui/components/Button';

export const FIRST_UPGRADE_FLAG = 'tutorial.firstUpgrade';
export const FIRST_UPGRADE_CARD = 'bonker';

/** True when the forced upgrade should show now. */
export function firstUpgradeDue(s: SaveDoc | null, step: string): boolean {
  if (!s || step !== 'home' || s.flags[FIRST_UPGRADE_FLAG]) return false;
  const e = s.collection[FIRST_UPGRADE_CARD];
  return !!e && e.level === 1 && s.tutorial.step >= 4;
}

type Phase = 'offer' | 'slam' | 'done';

export function FirstUpgrade() {
  const ui = useApp();
  const c = ui.controller;
  const save = c.save.value;
  const step = c.step.value;
  const route = c.route.value;
  const meta = ui.services.meta;
  const [phase, setPhase] = useState<Phase>('offer');
  const [portrait, setPortrait] = useState<string | null>(null);
  const due = phase !== 'offer' || (route.id === 'title' && firstUpgradeDue(save, step));
  const content = ui.services.content;
  const typed = isMetaRules(meta) ? asContent(content) : null;
  const blocked = save && typed ? upgradeBlocker(save, FIRST_UPGRADE_CARD, typed) : 'noMeta';

  useEffect(() => {
    if (!due) return;
    let live = true;
    void ui.portrait(FIRST_UPGRADE_CARD, 'none', 200).then((url) => {
      if (live) setPortrait(url);
    });
    return () => {
      live = false;
    };
  }, [due]);

  // A save that cannot take the upgrade never sees the step.
  useEffect(() => {
    if (phase === 'offer' && route.id === 'title' && firstUpgradeDue(save, step) && blocked !== null && save) {
      c.setSave({ ...save, flags: { ...save.flags, [FIRST_UPGRADE_FLAG]: true } });
    }
  }, [phase, route.id, save, step, blocked]);

  useEffect(() => {
    if (phase !== 'slam') return;
    const timer = setTimeout(() => setPhase('done'), 900);
    return () => clearTimeout(timer);
  }, [phase]);

  if (!due || !save || !typed || !isMetaRules(meta) || (phase === 'offer' && blocked !== null)) return null;
  const cost = upgradeCost(typed, FIRST_UPGRADE_CARD, 1);
  const level = phase === 'offer' ? 1 : 2;

  const upgrade = (): void => {
    const s = c.save.peek();
    if (!s) return;
    const r = meta.upgrade(s, FIRST_UPGRADE_CARD, content);
    if (!r.ok) {
      c.setSave({ ...s, flags: { ...s.flags, [FIRST_UPGRADE_FLAG]: true } });
      return;
    }
    c.setSave({ ...r.value, flags: { ...r.value.flags, [FIRST_UPGRADE_FLAG]: true } }, { immediate: true });
    ui.services.audio.play('upgrade_slam', { priority: 1 });
    setPhase('slam');
  };

  return (
    <div class={`ab-scrim ab-upgrade ab-upgrade--${phase}`} data-testid="first-upgrade" data-phase={phase}>
      <div class="ab-panel ab-upgrade-panel">
        <h2 class="ab-upgrade-title">{ui.t(phase === 'offer' ? 'tutorial.upgrade.title' : 'tutorial.upgrade.done')}</h2>
        <div class="ab-upgrade-card">
          <div class="ab-upgrade-portrait">{portrait ? <img src={portrait} alt="" width={200} height={200} /> : null}</div>
          <span class="ab-upgrade-name">{ui.t(`card.${FIRST_UPGRADE_CARD}.name`)}</span>
          <span class="ab-upgrade-level" key={level} data-testid="first-upgrade-level">
            {ui.t('app.upgrade.level', { level })}
          </span>
          {phase !== 'offer' ? (
            <svg class="ab-upgrade-hammer" viewBox="0 0 64 64" width="96" height="96" aria-hidden="true">
              <rect x="28" y="22" width="8" height="38" rx="3" fill="#8a5a2b" stroke="#3a220c" stroke-width="2.5" />
              <rect x="10" y="6" width="44" height="20" rx="5" fill="#b9c3d6" stroke="#2a3246" stroke-width="3" />
              <rect x="14" y="9" width="36" height="5" rx="2" fill="#eef3ff" opacity="0.8" />
            </svg>
          ) : null}
        </div>
        <div class="ab-upgrade-bars" aria-hidden="true">
          <div class="ab-upgrade-bar">
            <span>{ui.t('app.upgrade.hp')}</span>
            <i style={{ width: phase === 'offer' ? '62%' : '66%' }} />
          </div>
          <div class="ab-upgrade-bar">
            <span>{ui.t('app.upgrade.damage')}</span>
            <i style={{ width: phase === 'offer' ? '55%' : '59%' }} />
          </div>
        </div>
        {phase === 'offer' ? (
          <Button kind="progress" size="xl" primary pulse testid="first-upgrade-go" onClick={upgrade}>
            {ui.t('app.upgrade.go')}
            {cost ? <span class="ab-upgrade-cost">{ui.t('app.reward.amber', { amount: cost.amber }).replace('+', '')}</span> : null}
          </Button>
        ) : (
          <>
            <p class="ab-upgrade-gain" data-testid="first-upgrade-gain">
              {ui.t('tutorial.upgrade.gain')}
            </p>
            <Button kind="primary" size="l" testid="first-upgrade-continue" disabled={phase === 'slam'} onClick={() => setPhase('offer')}>
              {ui.t('app.next')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
