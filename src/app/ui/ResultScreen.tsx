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
  return (
    <div class="ab-scrim" data-testid="result" onClick={() => stager.tap()}>
      <div class="ab-panel">
        <h2 class={won ? 'ab-win' : 'ab-loss'} data-testid="result-title" data-outcome={draw ? 'draw' : won ? 'win' : 'loss'}>
          {title}
        </h2>
        <div class="ab-row">
          <span class="ab-chip">{displayName(input.opponent.displayName, ui.services.i18n)}</span>
          <span class="ab-chip ab-chip--ai">{ui.t('app.aiChip')}</span>
        </div>
        <div class="ab-stats">
          <span>{ui.t('app.stats.trained', { n: input.stats.trained })}</span>
          <span>{ui.t('app.stats.kills', { n: input.stats.kills })}</span>
          <span>{ui.t('app.stats.baseDamage', { n: input.stats.baseDamage })}</span>
          <span>{ui.t('app.stats.time', { time: clock(input.stats.durationMs) })}</span>
        </div>
        <div class="ab-rewards" data-testid="result-rewards">
          {rewards.slice(0, revealed).map((r, i) => (
            <div class="ab-reward" key={i}>
              {rewardText(ui.t, r)}
            </div>
          ))}
          {!stager.done ? <span class="ab-muted">{ui.t('app.tapToSkip')}</span> : null}
        </div>
        <div class="ab-row" onClick={(e) => e.stopPropagation()}>
          {retry ? (
            <button class={`ab-btn ${next ? 'ab-btn--plain' : 'ab-btn--gold'}`} data-testid="retry" onClick={() => c.retry()}>
              {ui.t('app.retry')}
            </button>
          ) : null}
          {next ? (
            <button class="ab-btn ab-btn--gold" data-testid="next" onClick={() => c.next()}>
              {ui.t('app.next')}
            </button>
          ) : null}
          {!onboarding ? (
            <button class="ab-btn ab-btn--gold" data-testid="play-again" onClick={() => c.playAgain()}>
              {ui.t('app.playAgain')}
            </button>
          ) : null}
          <button class="ab-btn ab-btn--plain" data-testid="watch-replay" onClick={() => c.watchReplay(replay)}>
            {ui.t('app.watchReplay')}
          </button>
          {!onboarding ? (
            <button class="ab-btn ab-btn--plain" data-testid="home" onClick={() => c.home()}>
              {ui.t('app.home')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
