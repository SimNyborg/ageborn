/**
 * The result (DESIGN A9 #7): Victory / Defeat / Draw, a short recap, the rewards staged one at a
 * time (each tap skips to the next), and Next / Play again, Watch replay, Home. A lost onboarding
 * match offers Retry (A8). The opponent keeps its AI badge (A7.1, C5 #38). WP9's Result screen takes
 * over in Phase 2.
 */
import { useEffect, useMemo } from 'preact/hooks';
import type { RewardStep } from '@/contracts';
import type { ResultState } from '../controller';
import { RewardStager } from '../flow';
import { displayName } from '../names';
import { lossTipKey } from '../trickle';
import { useApp } from './context';

function rewardText(t: (k: string, p?: Record<string, string | number>) => string, r: RewardStep): string {
  switch (r.kind) {
    case 'trophies':
      return t('app.reward.trophies', { delta: r.delta > 0 ? `+${r.delta}` : `${r.delta}` });
    case 'amber':
      return t('app.reward.amber', { amount: r.amount });
    case 'dust':
      return t('app.reward.dust', { amount: r.amount });
    case 'capsule':
      return t('app.reward.capsule');
    case 'clayPip':
      return t('app.reward.clayPip', { meter: r.meter });
    case 'codex':
      return t('app.reward.codex', { points: r.points });
    case 'quest':
      return t('app.reward.quest', { progress: r.progress });
    case 'star':
      return t('app.reward.star', { star: r.star });
    case 'arena':
      return t('app.reward.arena');
    case 'title':
      return t('app.reward.title', { title: r.title });
    default:
      return '';
  }
}

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The one-line story of the match (audit #16): "You toppled Old Grogg in 1:57". */
export function resultLine(t: (k: string, p?: Record<string, string | number>) => string, won: boolean, draw: boolean, reason: string, name: string, time: string): string {
  if (draw) return t('app.drawLine', { time });
  if (reason === 'finalBell') return won ? t('app.bellWin', { time }) : t('app.bellLoss', { name, time });
  return won ? t('app.toppled', { name, time }) : t('app.fell', { name, time });
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M3.5 11.5 12 4l8.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 10.5V20h4.5v-5h3v5H18v-9.5" fill="currentColor" stroke="#1b1330" stroke-width="1.4" stroke-linejoin="round" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
      <path d="M19.5 3.5v5h-5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
      <path d="M10 9v6l5-3z" fill="currentColor" />
    </svg>
  );
}

export function ResultScreen(p: { result: ResultState }) {
  const ui = useApp();
  const c = ui.controller;
  const { input, rewards, setup, replay } = p.result;
  const stager = useMemo(() => new RewardStager(rewards), [rewards]);
  const revealed = stager.revealed.value;
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const tick = (now: number): void => {
      stager.update(now - last);
      last = now;
      if (!stager.done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stager]);

  const won = input.outcome.winner === input.mySide;
  const draw = input.outcome.winner === null;
  const title = draw ? ui.t('app.draw') : won ? ui.t('app.victory') : ui.t('app.defeat');
  const step = c.step.value;
  const onboarding = setup.mode === 'tutorial' && step !== 'home';
  // A8: a lost onboarding match offers a retry. After match 1 the retry is the only way on.
  const retry = onboarding && c.canRetry(p.result);
  const next = onboarding && step !== 'match1';
  const name = displayName(input.opponent.displayName, ui.services.i18n);
  // A16.6: one loss tip when the trickle detector fired.
  const tip = lossTipKey({ won, draw, trickled: p.result.battle?.trickle.fired ?? false });
  const line = resultLine(ui.t, won, draw, input.outcome.reason, name, clock(input.stats.durationMs));
  // One main action (gold) and one second; replay and home are small icon buttons.
  const primary = next ? 'next' : retry ? 'retry' : 'again';
  return (
    <div class={`ab-scrim ab-result ab-result--${draw ? 'draw' : won ? 'win' : 'loss'}`} data-testid="result" onClick={() => stager.tap()}>
      <div class="ab-result-rays" aria-hidden="true" />
      <div class="ab-result-banner">
        <h2 class={won ? 'ab-win' : 'ab-loss'} data-testid="result-title" data-outcome={draw ? 'draw' : won ? 'win' : 'loss'}>
          {title}
        </h2>
      </div>
      <div class="ab-panel ab-result-panel">
        <p class="ab-result-line" data-testid="result-line">
          {line}
        </p>
        <div class="ab-row ab-result-vs">
          <span class="ab-chip">
            {ui.t('app.vs')} {name}
          </span>
          <span class="ab-chip ab-chip--ai">{ui.t('app.aiChip')}</span>
        </div>
        <div class="ab-stats">
          <span>{ui.t('app.stats.trained', { n: input.stats.trained })}</span>
          <span>{ui.t('app.stats.kills', { n: input.stats.kills })}</span>
        </div>
        {tip ? (
          <p class="ab-result-tip" data-testid="result-tip">
            {ui.t(tip)}
          </p>
        ) : null}
        {rewards.length > 0 ? (
          <div class="ab-rewards" data-testid="result-rewards">
            {rewards.slice(0, revealed).map((r, i) => (
              <div class="ab-reward" key={i}>
                {rewardText(ui.t, r)}
              </div>
            ))}
            {!stager.done ? <span class="ab-muted">{ui.t('app.tapToSkip')}</span> : null}
          </div>
        ) : (
          <div data-testid="result-rewards" hidden />
        )}
        <div class="ab-row ab-result-actions" onClick={(e) => e.stopPropagation()}>
          {retry ? (
            <button class={`ab-btn ${primary === 'retry' ? 'ab-btn--gold ab-btn--wide' : 'ab-btn--plain'}`} data-testid="retry" onClick={() => c.retry()}>
              {ui.t('app.retry')}
            </button>
          ) : null}
          {next ? (
            <button class="ab-btn ab-btn--gold ab-btn--wide" data-testid="next" onClick={() => c.next()}>
              {ui.t('app.next')}
            </button>
          ) : null}
          {!retry ? (
            <button class={`ab-btn ${primary === 'again' ? 'ab-btn--gold ab-btn--wide' : 'ab-btn--plain'}`} data-testid="play-again" onClick={() => c.playAgain()}>
              {ui.t('app.playAgain')}
            </button>
          ) : null}
          <button class="ab-btn ab-btn--plain ab-btn--icon" data-testid="watch-replay" aria-label={ui.t('app.watchReplay')} title={ui.t('app.watchReplay')} onClick={() => c.watchReplay(replay)}>
            <ReplayIcon />
          </button>
          <button class="ab-btn ab-btn--plain ab-btn--icon" data-testid="home" aria-label={ui.t('app.home')} title={ui.t('app.home')} onClick={() => c.home()}>
            <HomeIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
