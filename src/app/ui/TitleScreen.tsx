/**
 * The start screen (DESIGN A8 0:00, C3 Checkpoint A/B). "The title screen is the live battlefield":
 * the next onboarding match (or, after onboarding, the training match vs Old Grogg) is already built
 * and rendered behind it, so one tap starts it. Phase 2a also offers Quick Battle with a format
 * picker (Short War by default, vs a tier III AI General). WP9's Home replaces this in Phase 2b.
 * Every opponent keeps its AI chip (A7.1).
 */
import { useState } from 'preact/hooks';
import { tierLabel } from '@/ai';
import type { FormatId } from '@/contracts';
import { QUICK_BATTLE_GENERAL, QUICK_BATTLE_TIER } from '../controller';
import { displayName } from '../names';
import { useApp } from './context';

/** The game's name is a brand, not translatable UI copy. */
export const GAME_NAME = 'Ageborn';

const QUICK_FORMATS: readonly FormatId[] = ['short', 'standard', 'full'];

export function TitleScreen() {
  const ui = useApp();
  const c = ui.controller;
  const r = c.route.value;
  const battle = r.id === 'title' ? r.battle : null;
  const [format, setFormat] = useState<FormatId>('short');
  const replays = c.replays.value;
  const opponent = battle?.setup.opponent;
  const waitingIsTraining = battle?.setup.brain.kind === 'grogg';

  return (
    <div class="ab-title" data-testid="title">
      <h1 class="ab-logo">{GAME_NAME}</h1>
      <div class="ab-card" data-testid="quick-panel">
        <div class="ab-row" role="radiogroup">
          {QUICK_FORMATS.map((f) => (
            <button
              key={f}
              class={`ab-btn ab-btn--plain ab-btn--small${f === format ? ' is-on' : ''}`}
              role="radio"
              aria-checked={f === format}
              data-testid={`format-${f}`}
              onClick={() => setFormat(f)}
            >
              {ui.t(`format.${f}.name`)}
            </button>
          ))}
        </div>
        <button class="ab-btn ab-btn--gold ab-btn--big" data-testid="quick-battle" onClick={() => c.quickBattle(format)}>
          {ui.t('app.quickBattle')}
        </button>
        <div class="ab-row">
          <span class="ab-chip">{ui.t(`general.${QUICK_BATTLE_GENERAL}.name`)}</span>
          <span class="ab-chip ab-chip--ai" data-testid="quick-ai-chip">
            {ui.t('app.aiChip')}
          </span>
          <span class="ab-chip">
            {ui.t('app.aiGeneral')} · {ui.t('app.vsTier', { tier: tierLabel(QUICK_BATTLE_TIER) })}
          </span>
        </div>
      </div>
      {battle && opponent ? (
        <div class="ab-card ab-card--quiet" data-testid="training-panel">
          <button class="ab-btn ab-btn--plain" data-testid="play" onClick={() => c.play()}>
            {waitingIsTraining ? ui.t('app.trainingMatch') : ui.t('app.play')}
          </button>
          <div class="ab-row">
            <span class="ab-chip">{displayName(opponent.displayName, ui.services.i18n)}</span>
            <span class="ab-chip ab-chip--ai" data-testid="title-ai-chip">
              {ui.t('app.aiChip')}
            </span>
            {opponent.disclosures.map((k) => (
              <span class="ab-chip" key={k}>
                {ui.t(k)}
              </span>
            ))}
          </div>
          {!waitingIsTraining ? (
            <button class="ab-btn ab-btn--plain ab-btn--small" data-testid="training" onClick={() => c.training()}>
              {ui.t('app.trainingMatch')}
            </button>
          ) : null}
        </div>
      ) : null}
      {replays.length > 0 ? (
        <div class="ab-replays">
          {replays
            .slice(-3)
            .reverse()
            .map((rep, i) => (
              <button key={`${rep.seed}-${i}`} class="ab-btn ab-btn--plain ab-btn--small" data-testid="title-replay" onClick={() => c.watchReplay(rep)}>
                {ui.t('app.watchReplay')} · {displayName(rep.sides[1].label, ui.services.i18n)} · {ui.t('app.aiChip')}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
