/**
 * Result (A9 #7, ui-plan 4.9): one design for every mode, the onboarding matches included (the app
 * renders its onboarding variant with {@link ResultLayout}). Left: the Victory, Defeat or Draw banner
 * and the recap (MVP card, time, units trained and killed, base damage). Right: the rewards staged
 * one at a time (each skippable with a tap) and one summary row. The fixed action bar holds the one
 * primary bottom-right, in the same spot as Home's Play, chosen by {@link resultActions}: Continue,
 * Try again, Next battle, Open capsule or Home; the next battle is always at most one tap away.
 */
import './result.css';
import { arenaNameKey, questNameKey, titleNameKey } from '@/content/keys';
import type { Content, QuestDef } from '@/content/types';
import type { CapsuleTier, MatchStats, RewardStep } from '@/contracts';
import { goalMet, goalText, levelNameKey } from '../model/warPath';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { ActionBar, type ActionBarProps } from '../../components/Layout';
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
import { pendingCrests, pendingNameKey, visibleTier } from '../../components/capsuleLook';
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
  resultActions,
  type ResultActions,
  type ResultActionId,
  type ResultProgress,
  type ResultStage,
} from '../model/result';
import { RoadRewardView } from '../shared/RoadReward';
import { useMatchStarter } from '../shared/MatchStarter';

const BANNER_KEYS = { win: 'ui.result.victory', loss: 'ui.result.defeat', draw: 'ui.result.draw' } as const;

/**
 * The War Path level badge on the Result (4.9, 2.7 "a star stamps onto the level badge"): the level's
 * number and name, its three sockets with the best stars, the new ones stamping in one by one
 * (MR-41 timing, 200 ms apart), and the ★★ goal with whether this match met it.
 */
function LevelBadge(p: { level: string; rewards: readonly RewardStep[]; stats: MatchStats; won: boolean; difficulty: string }) {
  const { t, content, save } = useUi();
  const kit = useKit();
  return <LevelBadgeView content={content} t={t} sound={kit.sound} best={save.peek().warPath?.stars[p.level] ?? 0} level={p.level} rewards={p.rewards} stats={p.stats} won={p.won} />;
}

/**
 * The level badge without the screen context, so the app's onboarding Result (levels 1 and 2) shows
 * the same badge (4.9: one Result design for every mode).
 */
export function LevelBadgeView(p: {
  content: Content;
  t: (k: string, p?: Record<string, string | number>) => string;
  sound?: ((id: string) => void) | undefined;
  best: number;
  level: string;
  rewards: readonly RewardStep[];
  stats: MatchStats;
  won: boolean;
}) {
  const { t, content, best } = p;
  const level = content.warPath.levels[p.level];
  const fresh = p.rewards.filter((r): r is Extract<RewardStep, { kind: 'pathStar' }> => r.kind === 'pathStar').map((r) => r.star);
  const first = fresh.length ? Math.min(...fresh) : best + 1;
  useEffect(() => {
    if (!fresh.length) return;
    const ids = fresh.map((_, i) => setTimeout(() => p.sound?.('star_stamp'), 700 + i * 200));
    return () => ids.forEach(clearTimeout);
  }, []);
  if (!level) return null;
  const goal = goalText(level.goal2);
  const met = p.won && goalMet(level.goal2, p.stats);
  return (
    <div class="result-level" data-testid="result-level" data-stars={best}>
      <span class="result-level__disc" aria-hidden="true">
        {level.index}
      </span>
      <span class="result-level__main">
        <span class="result-level__name">{t(levelNameKey(level.id))}</span>
        <span class="result-level__stars" aria-label={t('warPath.ui.stars', { n: best, max: 3 })}>
          {[1, 2, 3].map((k) => (
            <i key={k} class={`result-level__star${k <= best ? ' is-on' : ''}${k >= first && fresh.includes(k as 1 | 2 | 3) ? ' is-new' : ''}`} style={{ animationDelay: `${600 + (k - first) * 200}ms` }}>
              <StarIcon size={26} filled={k <= best} />
            </i>
          ))}
        </span>
        <span class={`result-level__goal${met ? ' is-met' : ''}`}>
          {met ? <CheckIcon size={16} /> : null} {t(goal.key, goal.params)}
        </span>
      </span>
    </div>
  );
}

/**
 * Results whose capsule was opened from the Result. When the capsule summary closes, the Result
 * does not come back: it continues its own path at once (ui-plan 2.5, "the summary never returns
 * to the Result").
 */
const OPENED_HERE = new WeakSet<object>();

/** The Result's path after its capsule: what the summary's primary does and says (2.5, 4.9). */
export function resultPathAfterCapsule(info: { input: { mode: string; outcome: { winner: 0 | 1 | null }; mySide: 0 | 1 }; daily?: unknown; card?: unknown; endedHour?: number }): ResultActionId {
  const outcome = info.input.outcome.winner === null ? 'draw' : info.input.outcome.winner === info.input.mySide ? 'win' : 'loss';
  const a = resultActions({
    mode: info.input.mode,
    outcome,
    capsule: true,
    daily: !!info.daily,
    stop: !!info.card || (info.endedHour !== undefined && isNight(info.endedHour)),
    replay: false,
  });
  return a.secondary.find((x) => x === 'continue' || x === 'next' || x === 'tryAgain') ?? 'home';
}

/** The i18n key of a Result action's label. */
export function resultActionKey(id: ResultActionId): string {
  return RESULT_ACTION_KEY[id];
}

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
          icon={cap ? <CapsuleIcon tier={visibleTier(content.capsules, cap)} crests={pendingCrests(content.capsules, cap)} size={44} /> : <CapsuleIcon tier="bronze" size={44} />}
          label={cap ? t(pendingNameKey(content.capsules, cap)) : t('ui.result.capsule')}
          value={<CheckIcon size={26} />}
        />
      );
    }
    case 'crate':
      return (
        <RewardRow testid="reward-crate" icon={<CrateIcon size={40} />} label={t('ui.result.chestCrate')} value={<CheckIcon size={26} />} />
      );
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
    case 'pathStar':
      return (
        <RewardRow testid={`reward-pathstar-${r.star}`} icon={<StarIcon size={34} />} label={t('warPath.ui.starGot', { n: r.star })} value={<CheckIcon size={26} />} tone="good" />
      );
    case 'card': {
      // A18.7.8: a named card from a War Path first clear (MR-44).
      const tile = cardTile(save.value, content, r.card, t);
      const def = content.units[r.card] ?? content.turrets[r.card];
      const name = def ? t(def.nameKey) : r.card;
      return (
        <RewardRow
          testid="reward-card"
          icon={tile ? <CardTile card={tile} size="xs" /> : <StarIcon size={34} />}
          label={r.copies > 0 ? t('warPath.ui.cardCopy', { name }) : t('warPath.ui.cardNew', { name })}
          tone="good"
        />
      );
    }
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
        ? g.done
          ? t('ui.result.progress.warChestDone')
          : t('ui.result.progress.warChest', { n: formatInt(g.value, locale), max: formatInt(g.max, locale) })
        : t('ui.result.progress.conquest', { n: formatInt(g.value, locale), max: formatInt(g.max, locale) });
  const icon = g.kind === 'road' ? <RoadIcon size={32} /> : g.kind === 'warChest' ? <CrateIcon size={34} /> : <StarIcon size={32} />;
  if (g.kind === 'warPath') {
    const wl = t('warPath.ui.progressStars', { region: t(`warPath.region.${g.region ?? 'stone'}`), n: formatInt(g.value, locale), max: formatInt(g.max, locale) });
    return (
      <RewardRow testid="reward-progress-warPath" icon={icon} label={wl} tone="gold">
        <ProgressBar value={g.value} max={g.max} tone="gold" label={wl} />
      </RewardRow>
    );
  }
  return (
    <RewardRow testid={`reward-progress-${g.kind}`} icon={icon} label={label} tone={g.done ? 'good' : 'gold'}>
      <ProgressBar value={g.value} max={g.max} tone={g.done ? 'green' : 'gold'} label={label} />
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
  const { t, locale, content, save } = useUi();
  const r = p.r;
  switch (r.kind) {
    case 'capsule': {
      // A second capsule (Supply, a War Chest Age Capsule, a Conquest milestone): never hidden.
      const cap = save.value.capsules.pending.find((c) => c.id === r.capsuleId);
      return (
        <span class="result-sum__chip is-done" data-testid="sum-capsule">
          <CapsuleIcon tier={cap ? visibleTier(content.capsules, cap) : 'bronze'} crests={cap ? pendingCrests(content.capsules, cap) : 0} size={18} />{' '}
          {cap ? t(pendingNameKey(content.capsules, cap)) : t('ui.result.capsule')}
        </span>
      );
    }
    case 'crate':
      return (
        <span class="result-sum__chip is-done" data-testid="sum-crate">
          <CrateIcon size={18} /> {t('ui.result.crate')}
        </span>
      );
    case 'clayPip':
      return (
        <span class="result-sum__chip" data-testid="sum-clay">
          <CapsuleIcon tier="clay" size={18} /> {`${formatInt(Math.min(r.meter, content.capsules.clayMeterPips), locale)}/${formatInt(content.capsules.clayMeterPips, locale)}`}
        </span>
      );
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
      // The title's own name, never a row of identical "New title!" chips (review).
      return (
        <span class="result-sum__chip is-done">
          <CrownIcon size={16} /> {t(titleNameKey(r.title))}
        </span>
      );
    case 'star':
      return (
        <span class="result-sum__chip is-done">
          <StarIcon size={16} /> {r.star}
        </span>
      );
    case 'card':
      return (
        <span class="result-sum__chip is-done" data-testid="sum-card">
          <StarIcon size={16} /> {t('warPath.ui.newCard')}
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
  // Several titles at once read as one chip ("3 new titles"); the open list names each.
  const titles = p.steps.filter((r) => r.kind === 'title').length;
  const chips = titles > 1 ? p.steps.filter((r) => r.kind !== 'title') : p.steps;
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
          {chips.map((r, i) => (
            <SummaryChip key={i} r={r} />
          ))}
          {titles > 1 ? (
            <span class="result-sum__chip is-done" data-testid="sum-titles">
              <CrownIcon size={16} /> {t('ui.result.newTitles', { n: titles })}
            </span>
          ) : null}
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
function StopCard(p: { card: ResultCard; onNext: () => void; onDismiss: () => void }) {
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
      {/* Home is the action bar's primary while a card shows; the card only adds its own options. */}
      {c.kind !== 'wrap' ? (
        <div class="result-card__actions">
          {c.kind === 'tilt' && c.watchIndex !== null ? (
            <Button kind="secondary" size="s" icon={<ReplayIcon size={20} />} testid="result-card-watch" onClick={() => services.watchReplay(c.watchIndex!)}>
              {t('ui.result.watch')}
            </Button>
          ) : null}
          {c.kind === 'break' ? (
            <Button kind="secondary" size="s" testid="result-card-keep" onClick={p.onDismiss}>
              {t('ui.result.keepPlaying')}
            </Button>
          ) : (
            <Button kind="secondary" size="s" icon={<SwordsIcon size={20} />} testid="result-card-next" onClick={p.onNext}>
              {t('ui.result.warmUp')}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ResultScreen(p: { route: RouteOf<'result'> }) {
  const { save, content, t, locale, router, services, toasts } = useUi();
  const info = p.route.info;
  const kind = resultKind(info.input);
  // The plan is fixed when the screen opens (the save moves on while it is up).
  const pathLevel = info.input.warPath?.level ?? (info.rewards.find((r) => r.kind === 'pathStar') as { level?: string } | undefined)?.level ?? null;
  const plan = useMemo(() => resultPlan(info.rewards, save.peek(), content, { mode: info.input.mode, level: pathLevel }), [info, content, save]);
  const stages = plan.stages;
  const reduce = save.value.settings.reduceMotion;
  const [shown, setShown] = useState(reduce ? stages.length : 0);
  const [cardOpen, setCardOpen] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only offer "Open capsule" while the earned capsule is still unopened in the tray.
  const earned = earnedCapsule(info.rewards);
  const capsule = earned !== null && save.value.capsules.pending.some((c) => c.id === earned) ? earned : null;
  const earnedCap = capsule !== null ? save.value.capsules.pending.find((c) => c.id === capsule) : undefined;
  const capsuleTier: CapsuleTier = earnedCap ? visibleTier(content.capsules, earnedCap) : 'silver';
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
      lost: kind === 'loss',
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

  // Back from the capsule summary: continue the Result's path instead of showing it again.
  const after = OPENED_HERE.has(info) && capsule === null ? resultPathAfterCapsule(info) : null;
  useEffect(() => {
    if (!after) return;
    OPENED_HERE.delete(info);
    if (after === 'next' || after === 'tryAgain') nextBattle();
    else if (after === 'continue') {
      router.reset({ id: 'home' });
      if (info.input.mode === 'conquest') router.go({ id: 'conquest' });
    } else router.reset({ id: 'home' });
  }, [after]);

  const actions = resultActions({
    mode: info.input.mode,
    outcome: kind,
    capsule: capsule !== null,
    daily: !!info.daily,
    stop: homePrimary,
    replay: info.replayIndex !== null,
    tryEasy: info.input.mode === 'warPath' && (save.value.warPath?.lossStreak ?? 0) >= content.warPath.tryEasyAfter && info.input.warPath?.difficulty !== 'easy',
  });
  const run: Record<ResultActionId, () => void> = {
    continue: () => {
      router.reset({ id: 'home' });
      if (info.input.mode === 'conquest') router.go({ id: 'conquest' });
    },
    openCapsule: () => {
      if (!capsule) return;
      OPENED_HERE.add(info);
      services.openCapsule(capsule);
    },
    tryAgain: nextBattle,
    tryEasy: () => {
      const req = info.request;
      services.setWarPathDifficulty('easy');
      if (req && req.mode === 'warPath') starter.start({ ...req, difficulty: 'easy' }, { resetToHome: true });
      else nextBattle();
    },
    next: nextBattle,
    home: () => router.reset({ id: 'home' }),
    copy: copyDaily,
    replay: () => info.replayIndex !== null && services.watchReplay(info.replayIndex),
  };

  // Leaving for the next step: draw nothing for the frame before the effect runs.
  if (after) return <section class="ui-screen result" data-screen="result" aria-hidden="true" />;
  return (
    <ResultLayout
      kind={kind}
      title={t(BANNER_KEYS[kind])}
      badge={pathLevel ? <LevelBadge level={pathLevel} rewards={info.rewards} stats={stats} won={kind === 'win'} difficulty={info.input.warPath?.difficulty ?? 'normal'} /> : null}
      vs={
        <>
          {t('ui.result.vs', { name: opponentName(opp, content, t) })} <AiBadge size="sm" />
        </>
      }
      recap={
        <section class="result__recap" aria-labelledby="result-recap-title" data-testid="result-recap">
          <h2 class="result__h" id="result-recap-title">
            {t('ui.result.recap')}
          </h2>
          <div class="result__recapBody">
            {mvp ? (
              <div class="result__mvp" data-testid="result-mvp">
                <span class="result__mvpLabel">{t('ui.result.mvp')}</span>
                <CardTile card={mvp} size="md" />
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
      }
      rewards={
        <section
          class="result__rewards"
          aria-labelledby="result-rewards-title"
          data-testid="result-rewards"
          data-stages={stages.length}
          data-scroll=""
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
          {card ? <StopCard card={card} onNext={nextBattle} onDismiss={() => setCardOpen(false)} /> : null}
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
      }
      actions={resultBar(actions, run, t, done, {}, capsuleTier)}
    >
      {starter.dialog}
    </ResultLayout>
  );
}

/** Test ids of the actions (kept from the earlier Result, so specs and tools keep working). */
export const RESULT_ACTION_TESTID: Readonly<Record<ResultActionId, string>> = {
  continue: 'result-continue',
  openCapsule: 'result-open',
  tryAgain: 'result-again',
  tryEasy: 'result-try-easy',
  next: 'result-next',
  home: 'result-home',
  copy: 'result-copy',
  replay: 'result-replay',
};

const RESULT_ACTION_KEY: Readonly<Record<ResultActionId, string>> = {
  continue: 'ui.result.continue',
  openCapsule: 'ui.result.openCapsule',
  tryAgain: 'ui.result.tryAgain',
  tryEasy: 'warPath.ui.tryEasy',
  next: 'ui.result.next',
  home: 'ui.result.home',
  copy: 'ui.result.copy',
  replay: 'ui.result.replay',
};

function actionIcon(id: ResultActionId, size: number, capsuleTier: CapsuleTier): ComponentChildren {
  switch (id) {
    case 'continue':
      return <RoadIcon size={size} />;
    case 'openCapsule':
      return <CapsuleIcon tier={capsuleTier} size={size + 2} />;
    case 'tryAgain':
    case 'tryEasy':
    case 'next':
      return <SwordsIcon size={size} />;
    case 'home':
      return <HomeIcon size={size} />;
    case 'copy':
      return <CopyIcon size={size} />;
    case 'replay':
      return <ReplayIcon size={size} />;
  }
}

/**
 * Builds the Result action bar from the action table: the primary (gold, size L, bottom-right, the
 * pulse once the rewards are in), secondaries (slate) and the tertiary Watch replay. The app's
 * onboarding Result passes its own handlers and test ids.
 */
export function resultBar(
  a: ResultActions,
  run: Partial<Record<ResultActionId, () => void>>,
  t: (k: string, p?: Record<string, string | number>) => string,
  settled: boolean,
  testids: Partial<Record<ResultActionId, string>> = {},
  /** The tier Open capsule shows: the capsule's visible tier (a Win Capsule's start tier, never its rolled one). */
  capsuleTier: CapsuleTier = 'silver',
): ActionBarProps {
  const id = (x: ResultActionId) => testids[x] ?? RESULT_ACTION_TESTID[x];
  return {
    primary: (
      <Button kind="primary" size="l" icon={actionIcon(a.primary, 26, capsuleTier)} testid={id(a.primary)} autofocus pulse={settled} onClick={() => run[a.primary]?.()}>
        {t(RESULT_ACTION_KEY[a.primary])}
      </Button>
    ),
    secondary: a.secondary.length ? (
      <>
        {a.secondary.map((x) => (
          <Button key={x} kind="secondary" size="m" icon={actionIcon(x, 22, capsuleTier)} testid={id(x)} onClick={() => run[x]?.()}>
            {t(RESULT_ACTION_KEY[x])}
          </Button>
        ))}
      </>
    ) : null,
    tertiary: a.tertiary.length ? (
      <>
        {a.tertiary.map((x) => (
          <Button key={x} kind="tertiary" size="m" icon={actionIcon(x, 22, capsuleTier)} testid={id(x)} onClick={() => run[x]?.()}>
            {t(RESULT_ACTION_KEY[x])}
          </Button>
        ))}
      </>
    ) : null,
  };
}

/**
 * The Result frame shared by every mode and the app's onboarding variant: rays and confetti behind,
 * the banner and recap on the left, the rewards on the right, the fixed action bar at the bottom.
 */
export function ResultLayout(p: {
  kind: 'win' | 'loss' | 'draw';
  title: string;
  vs?: ComponentChildren;
  recap?: ComponentChildren;
  rewards: ComponentChildren;
  actions: ActionBarProps;
  children?: ComponentChildren;
  onTap?: () => void;
  /** The War Path level badge whose stars stamp in (4.9, MR-94). */
  badge?: ComponentChildren;
}) {
  const BannerIcon = p.kind === 'win' ? CrownIcon : p.kind === 'loss' ? ShieldBrokenIcon : ScalesIcon;
  return (
    <section
      class={`ui-screen result result--${p.kind}`}
      data-screen="result"
      data-testid="result"
      data-result={p.kind}
      aria-labelledby="result-title"
      onClick={p.onTap}
    >
      <div class="result__rays" aria-hidden="true" />
      {p.kind === 'win' ? <Confetti /> : null}
      <div class="result__body">
        <div class="result__left">
          <header class="result__banner">
            <span class="result__bannerIcon">
              <BannerIcon size={44} />
            </span>
            <h1 class="result__title" id="result-title" data-testid="result-title" data-outcome={p.kind}>
              {p.title}
            </h1>
            {p.vs ? <p class="result__vs">{p.vs}</p> : null}
          </header>
          {p.badge}
          {p.recap}
        </div>
        <div class="result__right">{p.rewards}</div>
      </div>
      <div class="result__bar" onClick={(e) => e.stopPropagation()}>
        <ActionBar {...p.actions} testid="result-actions" />
      </div>
      {p.children}
    </section>
  );
}
