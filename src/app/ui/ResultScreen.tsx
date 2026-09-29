/**
 * The onboarding Result (DESIGN A9 #7, A8; ui-plan 4.9 "one Result design for every mode"): the app
 * keeps its controller logic (Next, Retry, Play again) but draws WP9's Result design through
 * `ResultLayout` and `resultBar`: the banner, a short recap, the rewards staged one at a time (each
 * tap skips to the next) and the fixed action bar with one primary bottom-right. A lost onboarding
 * match offers Retry (A8). The opponent keeps its AI badge (A7.1, C5 #38).
 */
import { useEffect, useMemo } from 'preact/hooks';
import { resultActions, type ResultActionId } from '@/ui/screens/model/result';
import { LevelBadgeView, ResultLayout, resultBar } from '@/ui/screens/result/ResultScreen';
import { AiBadge } from '@/ui/components/Chips';
import { formatClock, formatInt } from '@/ui/components/format';
import { AmberIcon, CapsuleIcon, CheckIcon, CrateIcon, CrownIcon, DustIcon, FlagIcon, StarIcon, SwordsIcon, TrophyIcon } from '@/ui/components/icons';
import { UiKitContext, type UiKit } from '@/ui/components/kit';
import { asContent } from '@/content';
import { isMetaRules } from '../uiServices';
import type { RewardStep } from '@/contracts';
import type { ResultState } from '../controller';
import { RewardStager } from '../flow';
import { displayName } from '../names';
import { lossTipKey } from '../trickle';
import { useApp } from './context';
import { UI_SOUND_FALLBACK } from './MetaHost';
import { titleNameKey } from '@/content';

type T = (k: string, p?: Record<string, string | number>) => string;

/** The chip of one reward step: an icon kind and its text (names through i18n, never raw ids). */
export type RewardIconKind = 'amber' | 'dust' | 'capsule' | 'crate' | 'trophy' | 'title' | 'star' | 'feat' | 'plain';

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
      return { icon: 'crate', text: t('app.reward.crate') };
    case 'clayPip':
      return { icon: 'plain', text: t('app.reward.clayPip', { meter: r.meter }) };
    case 'codex':
      return { icon: 'plain', text: t('app.reward.codex', { points: r.points }) };
    case 'quest':
      // Quest progress lives on Home; the onboarding Result keeps to what the player just earned.
      return null;
    case 'star':
      return { icon: 'star', text: t('app.reward.star', { star: r.star }) };
    case 'pathStar':
      // The level badge stamps these in (4.9); a row per star would repeat it.
      return null;
    case 'card':
      return { icon: 'plain', text: t('app.reward.card', { name: t(`card.${r.card}.name`) }) };
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

/** The shared UI icons, so the onboarding rewards look like every other Result (4.9). */
function RewardIcon(p: { kind: RewardIconKind }) {
  switch (p.kind) {
    case 'amber':
      return <AmberIcon size={30} />;
    case 'dust':
      return <DustIcon size={30} />;
    case 'capsule':
      return <CapsuleIcon tier="bronze" size={36} />;
    case 'crate':
      return <CrateIcon size={32} />;
    case 'trophy':
      return <TrophyIcon size={30} />;
    case 'title':
      return <CrownIcon size={30} />;
    case 'star':
      return <StarIcon size={30} />;
    case 'feat':
      return <StarIcon size={30} />;
    default:
      return <CheckIcon size={24} />;
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
  // 4.9: the same level badge as every War Path Result (levels 1 and 2 are the onboarding matches).
  const pathLevel = input.warPath?.level ?? (rewards.find((r) => r.kind === 'pathStar') as { level?: string } | undefined)?.level ?? null;
  const typed = isMetaRules(ui.services.meta) ? asContent(ui.services.content) : null;
  const best = pathLevel ? (c.save.value?.warPath?.stars[pathLevel] ?? 0) : 0;
  const reduce = ui.controller.save.value?.settings.reduceMotion ?? false;
  const kit: UiKit = useMemo(
    () => ({ t: ui.t, locale: 'en', portrait: ui.art.portrait.bind(ui.art), reduceMotion: reduce, sound: (id: string) => ui.services.audio.play(UI_SOUND_FALLBACK[id] ?? id) }),
    [ui, reduce],
  );
  const recap = [
    { id: 'time', icon: <FlagIcon size={22} />, label: ui.t('ui.result.time'), value: formatClock(input.stats.durationMs) },
    { id: 'trained', icon: <SwordsIcon size={22} />, label: ui.t('ui.result.trained'), value: formatInt(input.stats.trained, 'en') },
    { id: 'kills', icon: <CrownIcon size={22} />, label: ui.t('ui.result.kills'), value: formatInt(input.stats.kills, 'en') },
  ];
  return (
    <UiKitContext.Provider value={kit}>
      <div class="ui-root ab-result-host" data-reduce-motion={reduce ? 'true' : 'false'}>
        <ResultLayout
          kind={kind}
          title={title}
          onTap={() => stager.tap()}
          badge={
            pathLevel && typed ? (
              <LevelBadgeView content={typed} t={ui.t} sound={kit.sound} best={best} level={pathLevel} rewards={rewards} stats={input.stats} won={won} />
            ) : null
          }
          vs={
            <>
              <span data-testid="result-line">{line}</span> <AiBadge size="sm" />
            </>
          }
          recap={
            <section class="result__recap" data-testid="result-recap">
              <h2 class="result__h">{ui.t('ui.result.recap')}</h2>
              <ul class="result__stats">
                {recap.map((r) => (
                  <li key={r.id} data-testid={`recap-${r.id}`}>
                    <span class="result__statIcon">{r.icon}</span>
                    <span class="ui-grow">{r.label}</span>
                    <b class="ui-num">{r.value}</b>
                  </li>
                ))}
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
              <h2 class="result__h">{ui.t('ui.result.rewards')}</h2>
              <ul class="result__list">
                {shown.slice(0, revealed).map(({ r, chip }, i) => (
                  <li class={`result-reward result-reward--${chip.icon === 'amber' || chip.icon === 'dust' ? 'good' : 'gold'}`} key={i} data-testid="result-reward" data-kind={r.kind}>
                    <span class="result-reward__icon">
                      <RewardIcon kind={chip.icon} />
                    </span>
                    <span class="result-reward__main">
                      <span class="result-reward__label">{chip.text}</span>
                    </span>
                    <span class="result-reward__value">
                      <CheckIcon size={22} />
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
    </UiKitContext.Provider>
  );
}
