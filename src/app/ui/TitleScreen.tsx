/**
 * The start screen (DESIGN A8 0:00, C3 Checkpoint A/B). "The title screen is the live battlefield":
 * the next onboarding match (or, after onboarding, the training match vs Old Grogg) is already built
 * and rendered behind it, so one tap starts it.
 *
 * A new player sees one big "Play" button and nothing else (A8 0:00: "No menu ... before the first
 * win"). Quick Battle only appears once onboarding is done and no Home is mounted (the Phase 2a
 * shell and dev builds), with formats that say how long they take ("Short · up to 6 min"). WP9's
 * Home replaces this in Phase 2b. Every opponent keeps its AI chip, its tier and its disclosures,
 * such as the Rookie AI line (A7.1, A15.3). Quick Battle has the difficulty picker (Easy to Legendary,
 * each an AI tier; owner feedback 2026-09-28), so its bot never gets the Rookie mistakes.
 */
import { useState } from 'preact/hooks';
import type { Difficulty } from '@/content';
import type { FormatId } from '@/contracts';
import { tierNumeral } from '@/ui/components/format';
import { GearIcon } from '@/ui/components/icons';
import { Wordmark } from '@/ui/components/Wordmark';
import { QUICK_BATTLE_GENERAL } from '../controller';
import { difficultyTable } from '../matchSetup';
import { displayName } from '../names';
import { useApp } from './context';
import { Button, IconButton } from '@/ui/components/Button';

/** The game's name is a brand, not translatable UI copy. */
export const GAME_NAME = 'Ageborn';

const QUICK_FORMATS: readonly FormatId[] = ['short', 'standard', 'full'];

/** Whole minutes a format can last at most (its Final Bell), or null without one. */
export function formatMinutes(finalBellMs: number | null | undefined): number | null {
  return finalBellMs ? Math.round(finalBellMs / 60_000) : null;
}

export interface TitleScreenProps {
  /** Opens Settings (import, For parents, About, the break reminder), also during onboarding (A15.6). */
  onSettings?: () => void;
  /** A save problem to show as a banner (B8: "Save could not be read. Import a backup?"). */
  notice?: { messageKey: string; kind?: string } | null;
  onDismissNotice?: () => void;
}

export function TitleScreen(p: TitleScreenProps = {}) {
  const ui = useApp();
  const c = ui.controller;
  const r = c.route.value;
  const battle = r.id === 'title' ? r.battle : null;
  const [format, setFormat] = useState<FormatId>('short');
  const diffs = difficultyTable(ui.services.content);
  const [difficulty, setDifficulty] = useState<Difficulty>(diffs.default);
  const replays = c.replays.value;
  const opponent = battle?.setup.opponent;
  const waitingIsTraining = battle?.setup.brain.kind === 'grogg';
  // During onboarding (A8: match 1, capsule 1, match 2, capsule 2) the next onboarding match is the
  // one obvious Play button; Quick Battle stays a small secondary choice.
  const newPlayer = c.step.value !== 'home';
  const formats = ui.services.content.formats;

  const quickCard = (
    <div class={`ab-card${newPlayer ? ' ab-card--quiet ab-card--col' : ''}`} data-testid="quick-panel">
      <div class="ui-seg ab-formats" role="radiogroup" aria-label={ui.t('app.formatPick')}>
          {QUICK_FORMATS.map((f) => {
            const min = formatMinutes(formats[f]?.finalBellMs);
            return (
              <button
                key={f}
                type="button"
                class={`ui-seg__opt ab-format${f === format ? ' is-on' : ''}`}
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
      <div class="ui-seg ab-formats" role="radiogroup" aria-label={ui.t('ui.difficulty.label')} data-testid="quick-difficulty">
        {diffs.order.map((d) => (
          <button
            key={d}
            type="button"
            class={`ui-seg__opt ab-format${d === difficulty ? ' is-on' : ''}`}
            role="radio"
            aria-checked={d === difficulty}
            data-testid={`difficulty-${d}`}
            onClick={() => setDifficulty(d)}
          >
            <span class="ab-format-name">{ui.t(`ui.difficulty.${d}`)}</span>
            <span class="ab-format-len">{ui.t('app.vsTier', { tier: tierNumeral(diffs.tiers[d]) })}</span>
          </button>
        ))}
      </div>
      <Button kind={newPlayer ? 'secondary' : 'primary'} size={newPlayer ? 's' : 'l'} testid="quick-battle" onClick={() => c.quickBattle(format, difficulty)}>
        {ui.t('app.quickBattle')}
      </Button>
      <div class="ab-row">
        <span class="ab-chip">
          {ui.t('app.vs')} {ui.t(`general.${QUICK_BATTLE_GENERAL}.name`)}
        </span>
        <span class="ab-chip ab-chip--ai" data-testid="quick-ai-chip">
          {ui.t('app.aiChip')}
        </span>
        <span class="ab-chip ab-chip--soft" data-testid="quick-tier">
          {ui.t('app.vsTier', { tier: tierNumeral(diffs.tiers[difficulty]) })}
        </span>
      </div>
    </div>
  );

  const playCard =
    battle && opponent ? (
      <div class={`ab-card${newPlayer ? ' ab-card--hero' : ' ab-card--quiet'}`} data-testid="training-panel">
        <Button kind={newPlayer ? 'primary' : 'secondary'} size={newPlayer ? 'xl' : 'm'} pulse={newPlayer} testid="play" class={newPlayer ? 'ab-hero' : ''} onClick={() => c.play()}>
          {newPlayer ? ui.t('app.play') : waitingIsTraining ? ui.t('app.trainingMatch') : ui.t('app.play')}
        </Button>
        <div class="ab-row">
          <span class="ab-chip">
            {ui.t('app.vs')} {displayName(opponent.displayName, ui.services.i18n)}
          </span>
          <span class="ab-chip ab-chip--ai" data-testid="title-ai-chip">
            {ui.t('app.aiChip')}
          </span>
          {waitingIsTraining ? null : (
            <span class="ab-chip ab-chip--soft" data-testid="title-tier">
              {ui.t('app.vsTier', { tier: tierNumeral(opponent.tier) })}
            </span>
          )}
          {waitingIsTraining && opponent.disclosures.length === 0 ? <span class="ab-chip ab-chip--soft">{ui.t('app.trainingMatch')}</span> : null}
          {opponent.disclosures.map((k) => (
            <span class="ab-chip" key={k}>
              {ui.t(k)}
            </span>
          ))}
        </div>
        {!waitingIsTraining && !newPlayer ? (
          <Button kind="secondary" size="s" testid="training" onClick={() => c.training()}>
            {ui.t('app.trainingMatch')}
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <div class={`ab-title${newPlayer ? ' ab-title--new' : ''}`} data-testid="title">
      {p.onSettings ? (
        <IconButton class="ab-gear" testid="title-settings" label={ui.t('ui.nav.settings')} icon={<GearIcon size={26} />} onClick={p.onSettings} />
      ) : null}
      {p.notice ? (
        <div class="ab-notice" role="alert" data-testid="save-notice">
          <span class="ab-notice__text">{ui.t(p.notice.messageKey)}</span>
          {p.notice.kind === 'unreadable' && p.onSettings ? (
            <Button kind="secondary" size="s" testid="save-notice-import" onClick={p.onSettings}>
              {ui.t('ui.settings.import')}
            </Button>
          ) : null}
          {p.onDismissNotice ? (
            <Button kind="tertiary" size="s" testid="save-notice-close" onClick={p.onDismissNotice}>
              {ui.t('ui.common.close')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <h1 class="ab-logo" style={{ WebkitTextStroke: '0', textShadow: 'none' }}>
        {/* The logo lockup (UI art audit #19); the h1 keeps the name for assistive tech through the SVG label. */}
        <Wordmark text={GAME_NAME} height={88} class="ab-logo__mark" />
      </h1>
      {newPlayer ? (
        playCard
      ) : (
        <>
          {quickCard}
          {playCard}
        </>
      )}
      {replays.length > 0 && !newPlayer ? (
        <div class="ab-replays">
          {replays
            .slice(-3)
            .reverse()
            .map((rep, i) => (
              <Button key={`${rep.seed}-${i}`} kind="tertiary" size="s" testid="title-replay" onClick={() => c.watchReplay(rep)}>
                {ui.t('app.watchReplay')} · {displayName(rep.sides[1].label, ui.services.i18n)} · {ui.t('app.aiChip')}
              </Button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
