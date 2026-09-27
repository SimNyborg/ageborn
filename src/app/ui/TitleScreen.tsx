/**
 * The title (DESIGN A8 0:00): "the title screen is the live battlefield with one Play button". The
 * next onboarding match is already built and rendered behind it, so one tap starts it. Before the
 * first win there is no menu (A8); once onboarding is done (Phase 1: until WP9's Home is wired) the
 * title offers Quick Battle with a format picker and the replays of this session.
 */
import { useState } from 'preact/hooks';
import type { FormatId } from '@/contracts';
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

  return (
    <div class="ab-title" data-testid="title">
      <h1 class="ab-logo">{GAME_NAME}</h1>
      {battle && opponent ? (
        <>
          <div class="ab-row">
            <span class="ab-chip">{opponent.displayName}</span>
            <span class="ab-chip ab-chip--ai" data-testid="title-ai-chip">
              {ui.t('app.aiChip')}
            </span>
            {opponent.disclosures.map((k) => (
              <span class="ab-chip" key={k}>
                {ui.t(k)}
              </span>
            ))}
          </div>
          <button class="ab-btn ab-btn--gold ab-btn--big" data-testid="play" onClick={() => c.play()}>
            {ui.t('app.play')}
          </button>
        </>
      ) : (
        <>
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
          <span class="ab-muted">
            {ui.t(`general.kettle.name`)} · {ui.t('app.aiGeneral')} · {ui.t('app.vsTier', { tier: 'III' })}
          </span>
          {replays.length > 0 ? (
            <div class="ab-replays">
              {replays
                .slice(-5)
                .reverse()
                .map((rep, i) => (
                  <button key={`${rep.seed}-${i}`} class="ab-btn ab-btn--plain ab-btn--small" data-testid="title-replay" onClick={() => c.watchReplay(rep)}>
                    {ui.t('app.watchReplay')} · {rep.sides[1].label} · {ui.t('app.aiChip')}
                  </button>
                ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
