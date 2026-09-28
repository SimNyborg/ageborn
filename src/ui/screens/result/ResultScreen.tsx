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
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { AiBadge } from '../../components/Chips';
import { formatClock, formatInt, formatSigned } from '../../components/format';
import {
  AmberIcon,
  CapsuleIcon,
  CheckIcon,
  CrownIcon,
  DustIcon,
  FlagIcon,
  HomeIcon,
  ReplayIcon,
  ScalesIcon,
  ShieldBrokenIcon,
  StarIcon,
  SwordsIcon,
  TowerIcon,
  TrophyIcon,
} from '../../components/icons';
import { useKit } from '../../components/kit';
import { ClayMeter, ProgressBar } from '../../components/Meters';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardTile } from '../model/cards';
import { opponentName } from '../model/opponent';
import { COUNT_UP_MS, earnedCapsule, REWARD_STEP_MS, resultKind, stagedRewards } from '../model/result';

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

export function ResultScreen(p: { route: RouteOf<'result'> }) {
  const { save, content, t, locale, router, services } = useUi();
  const info = p.route.info;
  const kind = resultKind(info.input);
  const rewards = stagedRewards(info.rewards);
  const reduce = save.value.settings.reduceMotion;
  const [shown, setShown] = useState(reduce ? rewards.length : 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only offer "Open capsule" while the earned capsule is still unopened in the tray.
  const earned = earnedCapsule(info.rewards);
  const capsule = earned !== null && save.value.capsules.pending.some((c) => c.id === earned) ? earned : null;
  const stats = info.input.stats;
  const opp = info.input.opponent;

  useEffect(() => {
    if (shown >= rewards.length) return;
    timer.current = setTimeout(() => setShown((n) => Math.min(rewards.length, n + 1)), shown === 0 ? REWARD_STEP_MS + 250 : REWARD_STEP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [shown, rewards.length]);

  const skipOne = () => setShown((n) => Math.min(rewards.length, n + 1));
  const done = shown >= rewards.length;
  const mvp = stats.mvpCard ? cardTile(save.value, content, stats.mvpCard, t) : null;

  function nextBattle() {
    const req = info.request;
    if (!req) {
      router.reset({ id: 'home' });
      router.go({ id: 'modeSelect' });
      return;
    }
    const opponent = services.prepareMatch(req);
    router.reset({ id: 'home' });
    router.go({ id: 'vs', request: req, opponent });
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
    <section class={`ui-screen result result--${kind}`} data-screen="result" data-result={kind} aria-labelledby="result-title">
      <div class="result__rays" aria-hidden="true" />
      {kind === 'win' ? <Confetti /> : null}
      <header class="result__banner">
        <span class="result__bannerIcon">
          <BannerIcon size={54} />
        </span>
        <h1 class="result__title" id="result-title" data-testid="result-title">
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
          aria-live="polite"
          onClick={skipOne}
        >
          <h2 class="result__h" id="result-rewards-title">
            {t('ui.result.rewards')}
          </h2>
          <ul class="result__list">
            {rewards.slice(0, shown).map((r, i) => (
              <Reward key={i} r={r} animate={!reduce} />
            ))}
          </ul>
          {!done ? (
            <button
              type="button"
              class="result__tap"
              data-testid="result-skip"
              onClick={(e) => {
                e.stopPropagation();
                setShown(rewards.length);
              }}
            >
              {t('ui.result.tapToSkip')}
            </button>
          ) : null}
        </section>
      </div>
      <footer class="result__actions">
        <Button variant="plain" size="md" icon={<HomeIcon size={24} />} testid="result-home" onClick={() => router.reset({ id: 'home' })}>
          {t('ui.result.home')}
        </Button>
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
            autofocus
            icon={<CapsuleIcon tier="silver" size={28} />}
            testid="result-open"
            onClick={() => services.openCapsule(capsule)}
          >
            {t('ui.result.openCapsule')}
          </Button>
        ) : null}
        <Button variant="gold" size="lg" autofocus={!capsule} icon={<SwordsIcon size={26} />} testid="result-next" onClick={nextBattle}>
          {t('ui.result.next')}
        </Button>
      </footer>
    </section>
  );
}
