/**
 * The onboarding Result (DESIGN A9 #7, A8; ui-plan 4.9 "one Result design for every mode"): the app
 * keeps its controller logic (Next, Retry, Play again) but draws WP9's Result design through
 * `ResultLayout` and `resultBar`: the banner, a short recap, the rewards staged one at a time (each
 * tap skips to the next) and the fixed action bar with one primary bottom-right. A lost onboarding
 * match offers Retry (A8). The opponent keeps its AI badge (A7.1, C5 #38).
 */
import { useEffect, useMemo } from 'preact/hooks';
import { resultActions, type ResultActionId } from '@/ui/screens/model/result';
import { ResultLayout, resultBar } from '@/ui/screens/result/ResultScreen';
import type { RewardStep } from '@/contracts';
import type { ResultState } from '../controller';
import { RewardStager } from '../flow';
import { displayName } from '../names';
import { lossTipKey } from '../trickle';
import { useApp } from './context';
import { titleNameKey } from '@/content';

type T = (k: string, p?: Record<string, string | number>) => string;

/** The chip of one reward step: an icon kind and its text (names through i18n, never raw ids). */
export type RewardIconKind = 'amber' | 'dust' | 'capsule' | 'trophy' | 'title' | 'star' | 'feat' | 'plain';

export function rewardChip(t: T, r: RewardStep, o: { starter?: boolean } = {}): { icon: RewardIconKind; text: string } | null {
  switch (r.kind) {
    case 'trophies':
      return { icon: 'trophy', text: t('app.reward.trophies', { delta: r.delta > 0 ? `+${r.delta}` : `${r.delta}` }) };
    case 'amber':
      return { icon: 'amber', text: t('app.reward.amber', { amount: r.amount }) };
    case 'dust':
      return { icon: 'dust', text: t('app.reward.dust', { amount: r.amount }) };
    case 'capsule':
      return { icon: 'capsule', text: t(o.starter ? 'app.reward.starterCapsule' : 'app.reward.capsule') };
    case 'crate':
      return { icon: 'plain', text: t('app.reward.crate') };
    case 'clayPip':
      return { icon: 'plain', text: t('app.reward.clayPip', { meter: r.meter }) };
    case 'codex':
      return { icon: 'plain', text: t('app.reward.codex', { points: r.points }) };
    case 'quest':
      // Quest progress lives on Home; the onboarding Result keeps to what the player just earned.
      return null;
    case 'star':
      return { icon: 'star', text: t('app.reward.star', { star: r.star }) };
    case 'arena':
      return { icon: 'trophy', text: t('app.reward.arena') };
    case 'title':
      return { icon: 'title', text: t('app.reward.title', { title: t(titleNameKey(r.title)) }) };
    case 'feat':
      return { icon: 'feat', text: t('app.reward.feat', { name: t(`feat.${r.featId}.name`) }) };
    default:
      return null;
  }
}

function RewardIcon(p: { kind: RewardIconKind }) {
  switch (p.kind) {
    case 'amber':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 2.5 19.5 8 17 19 12 21.5 7 19 4.5 8z" fill="#f2a93b" stroke="#6b3a0c" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M12 2.5 12 21.5M4.5 8 19.5 8" stroke="#ffd98a" stroke-width="1.2" opacity="0.7" />
          <path d="M8 7.5 10.5 5" stroke="#fff4d6" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      );
    case 'dust':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 3 14 10 21 12 14 14 12 21 10 14 3 12 10 10z" fill="#9fd8ff" stroke="#23456b" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      );
    case 'capsule':
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <rect x="5" y="4" width="14" height="17" rx="6" fill="#c9854a" stroke="#4a2410" stroke-width="1.6" />
          <rect x="4" y="11" width="16" height="3.4" rx="1.4" fill="#ffd257" stroke="#4a2410" stroke-width="1.3" />
          <circle cx="12" cy="12.7" r="2.2" fill="#fff3c4" stroke="#4a2410" stroke-width="1.1" />
          <path d="M8 7.5c1-1.5 2.2-2 3.5-2" stroke="#ffe3b8" stroke-width="1.6" stroke-linecap="round" fill="none" />
        </svg>
      );
    case 'trophy':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#ffc93c" stroke="#5a3a00" stroke-width="1.6" />
          <path d="M9.5 18h5l1 3h-7z" fill="#ffc93c" stroke="#5a3a00" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M12 14v4" stroke="#5a3a00" stroke-width="2" />
        </svg>
      );
    case 'title':
    case 'feat':
    case 'star':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 2.8 14.7 8.6 21 9.2 16.2 13.4 17.7 19.6 12 16.4 6.3 19.6 7.8 13.4 3 9.2 9.3 8.6z" fill={p.kind === 'feat' ? '#c89bff' : '#ffd84a'} stroke="#3a2a00" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      );
    default:
      return null;
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

export function ResultScreen(p: { result: ResultState }) {
  const ui = useApp();
  const c = ui.controller;
  const { input, rewards, setup, replay } = p.result;
  // A15.3: scripted capsules 1-5 are "Starter Capsules" with set contents.
  const starterIds = useMemo(() => new Set((c.save.peek()?.capsules.pending ?? []).filter((x) => x.scriptIndex !== null).map((x) => x.id)), [rewards]);
  // Only steps with a chip are staged, so hidden steps never hold up "Tap to skip".
  const shown = useMemo(
    () =>
      rewards
        .map((r) => ({ r, chip: rewardChip(ui.t, r, { starter: r.kind === 'capsule' && starterIds.has(r.capsuleId) }) }))
        .filter((x): x is { r: RewardStep; chip: NonNullable<ReturnType<typeof rewardChip>> } => x.chip !== null),
    [rewards, starterIds],
  );
  const stager = useMemo(() => new RewardStager(shown.map((x) => x.r)), [shown]);
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
  // One main action (gold). During onboarding that is Next (a capsule waits) or Retry; nothing
  // competes with it (A8, A9 #7). Outside onboarding: Play again, Watch replay and Home, all labeled.
  const kind = draw ? 'draw' : won ? 'win' : 'loss';
  const capsule = next && rewards.some((r) => r.kind === 'capsule');
  const actions = onboarding
    ? resultActions({ mode: 'tutorial', outcome: kind, capsule, daily: false, stop: false, replay: false, onboarding: true, canRetry: retry })
    : { primary: 'next' as ResultActionId, secondary: ['home' as ResultActionId], tertiary: ['replay' as ResultActionId] };
  // After match 1 a loss has only Retry (A8); Next is the capsule step or the next match.
  if (onboarding && !next && !retry) actions.primary = 'continue';
  const run: Partial<Record<ResultActionId, () => void>> = onboarding
    ? { openCapsule: () => c.next(), continue: () => (next ? c.next() : c.home()), tryAgain: () => c.retry() }
    : { next: () => c.playAgain(), home: () => c.home(), replay: () => c.watchReplay(replay) };
  const bar = resultBar(actions, run, ui.t, stager.done, {
    openCapsule: 'next',
    continue: 'next',
    tryAgain: 'retry',
    next: 'play-again',
    home: 'home',
    replay: 'watch-replay',
  });
  return (
    <div class="ui-root ab-result-host" data-reduce-motion={ui.controller.save.value?.settings.reduceMotion ? 'true' : 'false'}>
      <ResultLayout
        kind={kind}
        title={title}
        onTap={() => stager.tap()}
        vs={
          <>
            <span data-testid="result-line">{line}</span>
            <span class="ui-ai">
              <span class="ui-ai__chip">{ui.t('app.aiChip')}</span>
            </span>
          </>
        }
        recap={
          <section class="result__recap" data-testid="result-recap">
            <ul class="result__stats">
              <li>
                <span class="ui-grow">{ui.t('app.stats.trained', { n: input.stats.trained })}</span>
              </li>
              <li>
                <span class="ui-grow">{ui.t('app.stats.kills', { n: input.stats.kills })}</span>
              </li>
            </ul>
            {tip ? (
              <p class="result-sum__tip" data-testid="result-tip">
                {ui.t(tip)}
              </p>
            ) : null}
          </section>
        }
        rewards={
          <section class="result__rewards" data-testid="result-rewards" hidden={shown.length === 0}>
            <ul class="result__list">
              {shown.slice(0, revealed).map(({ r, chip }, i) => (
                <li class={`result-reward result-reward--${chip.icon}`} key={i} data-testid="result-reward" data-kind={r.kind}>
                  <span class="result-reward__icon">
                    <RewardIcon kind={chip.icon} />
                  </span>
                  <span class="result-reward__main">
                    <span class="result-reward__label">{chip.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!stager.done ? <span class="result__tap">{ui.t('app.tapToSkip')}</span> : null}
          </section>
        }
        actions={bar}
      />
    </div>
  );
}
