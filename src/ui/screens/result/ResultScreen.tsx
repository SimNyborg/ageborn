/**
 * Result (A9 #7): Victory, Defeat or Draw banner; the recap (units trained and killed, base damage,
 * turret kills, evolves, time, MVP card); rewards staged one at a time (trophies tick, Amber, capsule
 * or Clay pip, Codex points, quest progress, stars), each skippable with a tap; then Next battle,
 * Watch replay, Home, and "Open capsule" when one was earned (A9 flow).
 */
import './result.css';
import { arenaNameKey, capsuleKindNameKey, questNameKey, titleNameKey } from '@/content/keys';
import type { QuestDef } from '@/content/types';
import type { RewardStep } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { AiBadge } from '../../components/Chips';
import { formatClock, formatInt, formatSigned } from '../../components/format';
import {
  AmberIcon,
  CapsuleIcon,
  CheckIcon,
  CopyIcon,
  CrateIcon,
  CrownIcon,
  DustIcon,
  FlagIcon,
  HomeIcon,
  InfoIcon,
  ReplayIcon,
  RoadIcon,
  ScalesIcon,
  ShieldBrokenIcon,
  StarIcon,
  SwordsIcon,
  TowerIcon,
  TrophyIcon,
} from '../../components/icons';
import { useKit } from '../../components/kit';
import { ClayMeter, ProgressBar } from '../../components/Meters';
import type { ResultCard, RouteOf } from '../../router';
import { useUi } from '../context';
import { cardTile } from '../model/cards';
import { opponentName } from '../model/opponent';
import { roadProgress } from '../model/progress';
import {
  COUNT_UP_MS,
  dailyResultLine,
  earnedCapsule,
  isNight,
  resultKind,
  resultPlan,
  REWARD_STEP_MS,
  type ResultProgress,
  type ResultStage,
} from '../model/result';
import { RoadRewardView } from '../shared/RoadReward';
import { useMatchStarter } from '../shared/MatchStarter';

const BANNER_KEYS = { win: 'ui.result.victory', loss: 'ui.result.defeat', draw: 'ui.result.draw' } as const;

/** Counts from `from` to `to` over `ms` once `active`. */
function useCountUp(from: number, to: number, ms: number, active: boolean): number {
  const [v, setV] = useState(active ? from : to);
  useEffect(() => {
    if (!active || from === to) {
      setV(to);
      return;
    }
    const steps = Math.max(1, Math.round(ms / 33));
    let i = 0;
    const id = setInterval(() => {
      i++;
      setV(Math.round(from + ((to - from) * i) / steps));
      if (i >= steps) clearInterval(id);
    }, ms / steps);
    return () => clearInterval(id);
  }, [from, to, ms, active]);
  return v;
}

function RewardRow(p: {
  icon: ComponentChildren;
  label: string;
  value?: ComponentChildren;
  tone?: 'good' | 'bad' | 'gold';
  children?: ComponentChildren;
  testid: string;
}) {
  return (
    <li class={`result-reward result-reward--${p.tone ?? 'gold'}`} data-testid={p.testid}>
      <span class="result-reward__icon">{p.icon}</span>
      <span class="result-reward__main">
        <span class="result-reward__label">{p.label}</span>
        {p.children}
      </span>
      {p.value !== undefined ? <span class="result-reward__value">{p.value}</span> : null}
    </li>
  );
}

function TrophyReward(p: { delta: number; total: number; animate: boolean }) {
  const { t, locale } = useKit();
  const shown = useCountUp(p.total - p.delta, p.total, COUNT_UP_MS, p.animate);
  return (
    <RewardRow
      testid="reward-trophies"
      icon={<TrophyIcon size={34} />}
      label={t('ui.currency.trophies')}
      tone={p.delta > 0 ? 'good' : p.delta < 0 ? 'bad' : 'gold'}
      value={formatSigned(p.delta, locale)}
    >
      <span class="result-reward__sub ui-num">{formatInt(shown, locale)}</span>
    </RewardRow>
  );
}

function Reward(p: { r: RewardStep; animate: boolean }) {
  const { t, locale, content, save } = useUi();
  const r = p.r;
  switch (r.kind) {
    case 'trophies':
      return <TrophyReward delta={r.delta} total={save.value.trophies.current} animate={p.animate} />;
    case 'amber':
      return (
        <RewardRow
          testid="reward-amber"
          icon={<AmberIcon size={34} />}
          label={t('ui.currency.amber')}
          value={formatSigned(r.amount, locale)}
          tone="good"
        />
      );
    case 'dust':
      return (
        <RewardRow
          testid="reward-dust"
          icon={<DustIcon size={34} />}
          label={t('ui.currency.dust')}
          value={formatSigned(r.amount, locale)}
          tone="good"
        />
      );
    case 'capsule': {
      const cap = save.value.capsules.pending.find((c) => c.id === r.capsuleId);
      return (
        <RewardRow
          testid="reward-capsule"
          icon={<CapsuleIcon tier={cap?.tier ?? 'bronze'} size={44} />}
          label={cap ? t(capsuleKindNameKey(cap.kind)) : t('ui.result.capsule')}
          value={<CheckIcon size={26} />}
        />
      );
    }
    case 'clayPip': {
      const max = content.capsules.clayMeterPips;
      const pips = Math.min(r.meter, max);
      return (
        <RewardRow
          testid="reward-clay"
          icon={<CapsuleIcon tier="clay" size={40} />}
          label={pips >= max ? t('ui.result.clayFull') : t('ui.clay.label')}
        >
          <ClayMeter pips={pips} max={max} />
        </RewardRow>
      );
    }
    case 'codex':
      return (
        <RewardRow
          testid="reward-codex"
          icon={<StarIcon size={34} />}
          label={r.levelUp ? t('ui.result.codexUp') : t('ui.profile.codex')}
          value={t('ui.result.codexPoints', { n: formatInt(r.points, locale) })}
          tone="good"
        />
      );
    case 'quest': {
      const def: QuestDef | undefined =
        content.quests.daily.find((q) => q.id === r.questId) ??
        (content.quests.weekly.id === r.questId ? content.quests.weekly : undefined);
      const target = def?.target ?? 1;
      const name = def ? t(questNameKey(def.id), { n: formatInt(target, locale) }) : r.questId;
      return (
        <RewardRow
          testid={`reward-quest-${r.questId}`}
          icon={<FlagIcon size={30} />}
          label={name}
          value={r.done ? <CheckIcon size={26} /> : undefined}
          tone={r.done ? 'good' : 'gold'}
        >
          <ProgressBar value={Math.min(r.progress, target)} max={target} tone={r.done ? 'green' : 'blue'} thin label={name} />
        </RewardRow>
      );
    }
    case 'star': {
      const g = content.generals.list[r.generalId as 'pip'];
      return (
        <RewardRow
          testid={`reward-star-${r.star}`}
          icon={<StarIcon size={36} />}
          label={t('ui.result.star', { n: r.star, name: g ? t(g.nameKey) : r.generalId })}
          value={<CheckIcon size={26} />}
          tone="good"
        />
      );
    }
    case 'arena': {
      const arena = content.arenas.list[r.arenaIndex] ?? content.arenas.list.find((a) => a.index === r.arenaIndex);
      return (
        <RewardRow testid="reward-arena" icon={<CrownIcon size={36} />} label={t('ui.result.newArena')} tone="good">
          <span class="result-reward__sub">{arena ? t(arenaNameKey(arena.id)) : ''}</span>
        </RewardRow>
      );
    }
    case 'title':
      return (
        <RewardRow testid="reward-title" icon={<CrownIcon size={36} />} label={t('ui.result.newTitle')} tone="good">
          <span class="result-reward__sub">{t(titleNameKey(r.title))}</span>
        </RewardRow>
      );
  }
}

const CONFETTI_COLORS = ['#ffcf3a', '#3b8cff', '#3cc46b', '#ef5a4a', '#a855f7', '#22b8cf'];

/** A short burst of confetti for a victory (off under reduce motion via the theme). */
function Confetti() {
  return (
    <div class="result__confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${((i * 53) % 900) / 1000}s`,
            animationDuration: `${2.2 + ((i * 29) % 12) / 10}s`,
            '--spin': `${(i % 2 ? 1 : -1) * (240 + ((i * 47) % 360))}deg`,
            '--drift': `${((i * 61) % 80) - 40}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Step 3: the one progress bar closest to done (A15.13). */
function ProgressStage(p: { progress: ResultProgress }) {
  const { t, locale } = useKit();
  const g = p.progress;
  const label =
    g.kind === 'road'
      ? t('ui.result.progress.road', { n: formatInt(g.next ?? g.max, locale) })
      : g.kind === 'warChest'
        ? t('ui.result.progress.warChest', { n: formatInt(g.value, locale), max: formatInt(g.max, locale) })
        : t('ui.result.progress.conquest', { n: formatInt(g.value, locale), max: formatInt(g.max, locale) });
  const icon = g.kind === 'road' ? <RoadIcon size={32} /> : g.kind === 'warChest' ? <CrateIcon size={34} /> : <StarIcon size={32} />;
  return (
    <RewardRow testid={`reward-progress-${g.kind}`} icon={icon} label={label}>
      <ProgressBar value={g.value} max={g.max} tone="gold" label={label} />
    </RewardRow>
  );
}

function FeatStage(p: { featId: string }) {
  const { t, content, locale } = useUi();
  const def = content.feats.list[p.featId];
  return (
    <RewardRow
      testid={`reward-feat-${p.featId}`}
      icon={<StarIcon size={36} />}
      label={t('ui.result.featFound', { name: def ? t(def.nameKey) : p.featId })}
      value={
        def ? (
          <span class="result-reward__dust">
            <DustIcon size={22} /> {formatSigned(def.dust, locale)}
          </span>
        ) : undefined
      }
      tone="good"
    />
  );
}

function Stage(p: { stage: ResultStage; animate: boolean }) {
  const st = p.stage;
  switch (st.kind) {
    case 'trophies':
    case 'main':
      return <Reward r={st.step} animate={p.animate} />;
    case 'progress':
      return <ProgressStage progress={st.progress} />;
    case 'feat':
      return <FeatStage featId={st.featId} />;
  }
}

/** A compact chip for the summary row. */
function SummaryChip(p: { r: RewardStep }) {
  const { t, locale, content } = useUi();
  const r = p.r;
  switch (r.kind) {
    case 'amber':
      return (
        <span class="result-sum__chip">
          <AmberIcon size={18} /> {formatSigned(r.amount, locale)}
        </span>
      );
    case 'dust':
      return (
        <span class="result-sum__chip">
          <DustIcon size={18} /> {formatSigned(r.amount, locale)}
        </span>
      );
    case 'codex':
      return (
        <span class="result-sum__chip">
          <StarIcon size={18} /> {t('ui.result.codexPoints', { n: formatInt(r.points, locale) })}
        </span>
      );
    case 'quest': {
      const def = content.quests.daily.find((q) => q.id === r.questId) ?? (content.quests.weekly.id === r.questId ? content.quests.weekly : undefined);
      return (
        <span class={`result-sum__chip${r.done ? ' is-done' : ''}`}>
          <FlagIcon size={16} /> {r.done ? <CheckIcon size={16} /> : `${formatInt(Math.min(r.progress, def?.target ?? r.progress), locale)}/${formatInt(def?.target ?? 1, locale)}`}
        </span>
      );
    }
    case 'arena':
      return (
        <span class="result-sum__chip is-done">
          <CrownIcon size={16} /> {t('ui.result.newArena')}
        </span>
      );
    case 'title':
      return (
        <span class="result-sum__chip is-done">
          <CrownIcon size={16} /> {t('ui.result.newTitle')}
        </span>
      );
    case 'star':
      return (
        <span class="result-sum__chip is-done">
          <StarIcon size={16} /> {r.star}
        </span>
      );
    default:
      return null;
  }
}

/** Everything that is not a staged step, in one row that expands on tap (A15.13). */
function SummaryRow(p: { steps: RewardStep[]; tipKey: string | null }) {
  const { t } = useUi();
  const [open, setOpen] = useState(false);
  if (p.steps.length === 0 && !p.tipKey) return null;
  return (
    <div class={`result-sum${open ? ' is-open' : ''}`} data-testid="result-summary">
      <button
        type="button"
        class="result-sum__row"
        aria-expanded={open}
        data-testid="result-summary-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span class="result-sum__label">{t('ui.result.alsoEarned')}</span>
        <span class="result-sum__chips">
          {p.steps.map((r, i) => (
            <SummaryChip key={i} r={r} />
          ))}
        </span>
        <span class="result-sum__caret" aria-hidden="true" />
      </button>
      {open ? (
        <ul class="result__list result-sum__list">
          {p.steps.map((r, i) => (
            <Reward key={i} r={r} animate={false} />
          ))}
          {p.tipKey ? (
            <li class="result-sum__tip" data-testid="result-tip">
              <InfoIcon size={20} /> {t(p.tipKey)}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** The stopping cards (A15.6): tilt, break or wrap. Never blocks input or advances by itself. */
function StopCard(p: { card: ResultCard; onHome: () => void; onNext: () => void; onDismiss: () => void }) {
  const { t, locale, services, save, content } = useUi();
  const c = p.card;
  const next = c.kind === 'wrap' ? roadProgress(save.value, content).next : null;
  return (
    <div class={`result-card result-card--${c.kind}`} data-testid={`result-card-${c.kind}`} role="note">
      {c.kind === 'tilt' ? <p class="result-card__text">{t('ui.result.tilt')}</p> : null}
      {c.kind === 'break' ? <p class="result-card__text">{t('ui.result.break')}</p> : null}
      {c.kind === 'wrap' ? (
        <>
          <p class="result-card__title">{t('ui.result.wrapTitle')}</p>
          <p class="result-card__text">
            {t('ui.result.wrapSummary', { wins: formatInt(c.wins, locale), losses: formatInt(c.losses, locale), cards: formatInt(c.newCards, locale) })}
          </p>
          {c.chargesOut ? <p class="result-card__text">{t('ui.result.wrapCharges')}</p> : null}
          {next ? (
            <p class="result-card__next">
              {t('ui.result.wrapNext')}{' '}
              {next.rewards.map((r, i) => (
                <RoadRewardView key={i} r={r} compact />
              ))}
            </p>
          ) : null}
        </>
      ) : null}
      <div class="result-card__actions">
        <Button variant="gold" size="md" icon={<HomeIcon size={22} />} testid="result-card-home" autofocus onClick={p.onHome}>
          {t('ui.result.home')}
        </Button>
        {c.kind === 'tilt' && c.watchIndex !== null ? (
          <Button variant="blue" size="md" icon={<ReplayIcon size={22} />} testid="result-card-watch" onClick={() => services.watchReplay(c.watchIndex!)}>
            {t('ui.result.watch')}
          </Button>
        ) : null}
        {c.kind === 'break' ? (
          <Button variant="plain" size="md" testid="result-card-keep" onClick={p.onDismiss}>
            {t('ui.result.keepPlaying')}
          </Button>
        ) : (
          <Button variant="plain" size="md" icon={<SwordsIcon size={22} />} testid="result-card-next" onClick={p.onNext}>
            {c.kind === 'tilt' ? t('ui.result.warmUp') : t('ui.result.next')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ResultScreen(p: { route: RouteOf<'result'> }) {
  const { save, content, t, locale, router, services, toasts } = useUi();
  const info = p.route.info;
  const kind = resultKind(info.input);
  // The plan is fixed when the screen opens (the save moves on while it is up).
  const plan = useMemo(() => resultPlan(info.rewards, save.peek(), content, { mode: info.input.mode }), [info, content, save]);
  const stages = plan.stages;
  const reduce = save.value.settings.reduceMotion;
  const [shown, setShown] = useState(reduce ? stages.length : 0);
  const [cardOpen, setCardOpen] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only offer "Open capsule" while the earned capsule is still unopened in the tray.
  const earned = earnedCapsule(info.rewards);
  const capsule = earned !== null && save.value.capsules.pending.some((c) => c.id === earned) ? earned : null;
  const stats = info.input.stats;
  const opp = info.input.opponent;
  const night = info.endedHour !== undefined && isNight(info.endedHour);

  useEffect(() => {
    if (shown >= stages.length) return;
    timer.current = setTimeout(() => setShown((n) => Math.min(stages.length, n + 1)), shown === 0 ? REWARD_STEP_MS + 250 : REWARD_STEP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [shown, stages.length]);

  const skipOne = () => setShown((n) => Math.min(stages.length, n + 1));
  const done = shown >= stages.length;
  const mvp = stats.mvpCard ? cardTile(save.value, content, stats.mvpCard, t) : null;
  const card = done && cardOpen ? (info.card ?? null) : null;
  // A card or the night line makes Home the primary button (A15.6).
  const homePrimary = night || !!info.card;

  const starter = useMatchStarter();

  function nextBattle() {
    const req = info.request;
    if (!req) {
      router.reset({ id: 'home' });
      router.go({ id: 'modeSelect' });
      return;
    }
    starter.start(req, { resetToHome: true });
  }

  function copyDaily() {
    const d = info.daily;
    if (!d) return;
    const line = dailyResultLine({
      dateKey: d.dateKey,
      modifier: d.modifier,
      difficulty: d.difficulty,
      outcome: t(kind === 'win' ? 'ui.result.outcomeWon' : kind === 'loss' ? 'ui.result.outcomeLost' : 'ui.result.outcomeDraw'),
      time: formatClock(stats.durationMs),
      basePercent: stats.ownBaseHpBpAtEnd / 100,
      t,
    });
    const ok = () => toasts.show(t('ui.result.copied'), { tone: 'good' });
    const fail = () => toasts.show(line, { tone: 'info' });
    try {
      const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
      if (clip) void clip.writeText(line).then(ok, fail);
      else fail();
    } catch {
      fail();
    }
  }

  const BannerIcon = kind === 'win' ? CrownIcon : kind === 'loss' ? ShieldBrokenIcon : ScalesIcon;
  const recap: { id: string; icon: ComponentChildren; label: string; value: string }[] = [
    { id: 'time', icon: <FlagIcon size={22} />, label: t('ui.result.time'), value: formatClock(stats.durationMs) },
    { id: 'trained', icon: <SwordsIcon size={22} />, label: t('ui.result.trained'), value: formatInt(stats.trained, locale) },
    { id: 'kills', icon: <CrownIcon size={22} />, label: t('ui.result.kills'), value: formatInt(stats.kills, locale) },
    { id: 'turretKills', icon: <TowerIcon size={22} />, label: t('ui.result.turretKills'), value: formatInt(stats.turretKills, locale) },
    {
      id: 'baseDamage',
      icon: <ShieldBrokenIcon size={22} />,
      label: t('ui.result.baseDamage'),
      value: formatInt(stats.baseDamage, locale),
    },
    { id: 'evolves', icon: <StarIcon size={22} />, label: t('ui.result.evolves'), value: formatInt(stats.evolves, locale) },
  ];

  return (
    <section class={`ui-screen result result--${kind}`} data-screen="result" data-testid="result" data-result={kind} aria-labelledby="result-title">
      <div class="result__rays" aria-hidden="true" />
      {kind === 'win' ? <Confetti /> : null}
      <header class="result__banner">
        <span class="result__bannerIcon">
          <BannerIcon size={54} />
        </span>
        <h1 class="result__title" id="result-title" data-testid="result-title" data-outcome={kind}>
          {t(BANNER_KEYS[kind])}
        </h1>
        <p class="result__vs">
          {t('ui.result.vs', { name: opponentName(opp, content, t) })} <AiBadge size="sm" />
        </p>
      </header>
      <div class="result__grid">
        <section class="result__recap" aria-labelledby="result-recap-title" data-testid="result-recap">
          <h2 class="result__h" id="result-recap-title">
            {t('ui.result.recap')}
          </h2>
          <div class="result__recapBody">
            {mvp ? (
              <div class="result__mvp" data-testid="result-mvp">
                <span class="result__mvpLabel">{t('ui.result.mvp')}</span>
                <CardTile card={mvp} size="lg" />
              </div>
            ) : null}
            <ul class="result__stats">
              {recap.map((r) => (
                <li key={r.id} data-testid={`recap-${r.id}`}>
                  <span class="result__statIcon">{r.icon}</span>
                  <span class="ui-grow">{r.label}</span>
                  <b class="ui-num">{r.value}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section
          class="result__rewards"
          aria-labelledby="result-rewards-title"
          data-testid="result-rewards"
          data-stages={stages.length}
          aria-live="polite"
          onClick={skipOne}
        >
          <h2 class="result__h" id="result-rewards-title">
            {t('ui.result.rewards')}
          </h2>
          <ul class="result__list">
            {stages.slice(0, shown).map((st, i) => (
              <Stage key={i} stage={st} animate={!reduce} />
            ))}
          </ul>
          {done ? <SummaryRow steps={plan.summary} tipKey={info.tipKey ?? null} /> : null}
          {done && night ? (
            <p class="result__night" data-testid="result-night">
              {t('ui.result.night')}
            </p>
          ) : null}
          {card ? (
            <StopCard card={card} onHome={() => router.reset({ id: 'home' })} onNext={nextBattle} onDismiss={() => setCardOpen(false)} />
          ) : null}
          {!done ? (
            <button
              type="button"
              class="result__tap"
              data-testid="result-skip"
              onClick={(e) => {
                e.stopPropagation();
                setShown(stages.length);
              }}
            >
              {t('ui.result.tapToSkip')}
            </button>
          ) : null}
        </section>
      </div>
      <footer class="result__actions">
        <Button
          variant={homePrimary ? 'gold' : 'plain'}
          size={homePrimary ? 'lg' : 'md'}
          icon={<HomeIcon size={24} />}
          testid="result-home"
          autofocus={homePrimary}
          onClick={() => router.reset({ id: 'home' })}
        >
          {t('ui.result.home')}
        </Button>
        {info.daily ? (
          <Button variant="plain" size="md" icon={<CopyIcon size={22} />} testid="result-copy" onClick={copyDaily}>
            {t('ui.result.copy')}
          </Button>
        ) : null}
        {info.replayIndex !== null ? (
          <Button
            variant="blue"
            size="md"
            icon={<ReplayIcon size={24} />}
            testid="result-replay"
            onClick={() => services.watchReplay(info.replayIndex!)}
          >
            {t('ui.result.replay')}
          </Button>
        ) : null}
        {capsule ? (
          <Button
            variant="violet"
            size="lg"
            autofocus={!homePrimary}
            icon={<CapsuleIcon tier="silver" size={28} />}
            testid="result-open"
            onClick={() => services.openCapsule(capsule)}
          >
            {t('ui.result.openCapsule')}
          </Button>
        ) : null}
        <Button
          variant={homePrimary ? 'plain' : 'gold'}
          size={homePrimary ? 'md' : 'lg'}
          autofocus={!capsule && !homePrimary}
          icon={<SwordsIcon size={26} />}
          testid="result-next"
          onClick={nextBattle}
        >
          {t('ui.result.next')}
        </Button>
      </footer>
      {starter.dialog}
    </section>
  );
}
