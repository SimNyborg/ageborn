/**
 * The start screen (DESIGN A8 0:00, C3 Checkpoint A/B). "The title screen is the live battlefield":
 * the next onboarding match (or, after onboarding, the training match vs Old Grogg) is already built
 * and rendered behind it, so one tap starts it.
 *
 * A new player sees one big "Play" button that starts the training match (audit #10); Quick Battle
 * stays a small secondary button until the training match is won. After that Quick Battle gets the
 * big card, with formats that say how long they take ("Short · up to 6 min") and an opponent line a
 * normal player understands. WP9's Home replaces this in Phase 2b. Every opponent keeps its AI chip
 * (A7.1).
 */
import { useState } from 'preact/hooks';
import type { FormatId } from '@/contracts';
import { QUICK_BATTLE_GENERAL } from '../controller';
import { displayName } from '../names';
import { useApp } from './context';

/** The game's name is a brand, not translatable UI copy. */
export const GAME_NAME = 'Ageborn';

const QUICK_FORMATS: readonly FormatId[] = ['short', 'standard', 'full'];

/** Whole minutes a format can last at most (its Final Bell), or null without one. */
export function formatMinutes(finalBellMs: number | null | undefined): number | null {
  return finalBellMs ? Math.round(finalBellMs / 60_000) : null;
}

export function TitleScreen() {
  const ui = useApp();
  const c = ui.controller;
  const r = c.route.value;
  const battle = r.id === 'title' ? r.battle : null;
  const [format, setFormat] = useState<FormatId>('short');
  const replays = c.replays.value;
  const opponent = battle?.setup.opponent;
  const waitingIsTraining = battle?.setup.brain.kind === 'grogg';
  // A new player has not won the training match yet: one obvious Play button.
  const newPlayer = c.step.value === 'match1';
  const formats = ui.services.content.formats;

  const quickCard = (
    <div class={`ab-card${newPlayer ? ' ab-card--quiet ab-card--col' : ''}`} data-testid="quick-panel">
      <div class="ab-row ab-formats" role="radiogroup" aria-label={ui.t('app.formatPick')}>
          {QUICK_FORMATS.map((f) => {
            const min = formatMinutes(formats[f]?.finalBellMs);
            return (
              <button
                key={f}
                class={`ab-btn ab-btn--plain ab-btn--small ab-format${f === format ? ' is-on' : ''}`}
                role="radio"
                aria-checked={f === format}
                data-testid={`format-${f}`}
                onClick={() => setFormat(f)}
              >
                <span class="ab-format-name">{ui.t(`format.${f}.name`)}</span>
                {min !== null ? <span class="ab-format-len">{ui.t('app.upToMin', { min })}</span> : null}
              </button>
            );
          })}
      </div>
      <button
        class={`ab-btn ${newPlayer ? 'ab-btn--plain ab-btn--small' : 'ab-btn--gold ab-btn--big'}`}
        data-testid="quick-battle"
        onClick={() => c.quickBattle(format)}
      >
        {ui.t('app.quickBattle')}
      </button>
      <div class="ab-row">
        <span class="ab-chip">
          {ui.t('app.vs')} {ui.t(`general.${QUICK_BATTLE_GENERAL}.name`)}
        </span>
        <span class="ab-chip ab-chip--ai" data-testid="quick-ai-chip">
          {ui.t('app.aiChip')}
        </span>
        {newPlayer ? null : <span class="ab-chip ab-chip--soft">{ui.t('app.difficultyNormal')}</span>}
      </div>
    </div>
  );

  const playCard =
    battle && opponent ? (
      <div class={`ab-card${newPlayer ? ' ab-card--hero' : ' ab-card--quiet'}`} data-testid="training-panel">
        <button class={`ab-btn ${newPlayer ? 'ab-btn--gold ab-btn--big ab-btn--hero' : 'ab-btn--plain'}`} data-testid="play" onClick={() => c.play()}>
          {newPlayer ? ui.t('app.play') : waitingIsTraining ? ui.t('app.trainingMatch') : ui.t('app.play')}
        </button>
        <div class="ab-row">
          <span class="ab-chip">
            {ui.t('app.vs')} {displayName(opponent.displayName, ui.services.i18n)}
          </span>
          <span class="ab-chip ab-chip--ai" data-testid="title-ai-chip">
            {ui.t('app.aiChip')}
          </span>
          {waitingIsTraining && opponent.disclosures.length === 0 ? <span class="ab-chip ab-chip--soft">{ui.t('app.trainingMatch')}</span> : null}
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
    ) : null;

  return (
    <div class={`ab-title${newPlayer ? ' ab-title--new' : ''}`} data-testid="title">
      <h1 class="ab-logo">{GAME_NAME}</h1>
      {newPlayer ? (
        <>
          {playCard}
          {quickCard}
        </>
      ) : (
        <>
          {quickCard}
          {playCard}
        </>
      )}
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
