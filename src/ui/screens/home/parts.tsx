/**
 * The pieces of the Home screen (A9 #2). Each piece reads only the UI environment and the pure view
 * models, so a later illustrated village Home can reuse them as building pop-ups.
 */
import { arenaNameKey, capsuleKindNameKey, capsuleTierNameKey, questNameKey } from '@/content/keys';
import type { QuestReward } from '@/content/types';
import type { OpponentSpec } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { AiBadge, Badge, CurrencyChip } from '../../components/Chips';
import { formatCountdown, formatInt, tierNumeral } from '../../components/format';
import {
  AmberIcon,
  CalendarIcon,
  CapsuleIcon,
  CardsIcon,
  CastleIcon,
  CheckIcon,
  ClockIcon,
  CrateIcon,
  DustIcon,
  GearIcon,
  InfoIcon,
  LockIcon,
  RefreshIcon,
  RoadIcon,
  ScrollIcon,
  SwordsIcon,
  TrophyIcon,
} from '../../components/icons';
import { Panel } from '../../components/Layout';
import { ClayMeter, ProgressBar } from '../../components/Meters';
import { Modal } from '../../components/Modal';
import { OddsSheet } from '../../components/OddsSheet';
import { oddsModel } from '../../components/oddsModel';
import type { Route } from '../../router';
import { useUi } from '../context';
import { opponentName } from '../model/opponent';
import { arenaOf, chargesView, dailyCapsuleView, questViews, roadProgress, trayCapsules, unlocks, type QuestView } from '../model/progress';

export function ProfileChip() {
  const { save, content, t, locale, router } = useUi();
  const s = save.value;
  const arena = arenaOf(s, content);
  return (
    <button
      type="button"
      class="home-profile"
      data-testid="home-profile"
      onClick={() => router.go({ id: 'profile' })}
      aria-label={t('ui.home.openProfile')}
    >
      <Avatar spec={s.profile.avatar} size={52} />
      <span class="home-profile__text">
        <span class="home-profile__name">{s.profile.name}</span>
        <span class="home-profile__meta">
          <TrophyIcon size={18} />
          <b>{formatInt(s.trophies.current, locale)}</b>
          <span class="home-profile__arena">{t(arena.nameKey)}</span>
        </span>
      </span>
      <span class="home-profile__codex" title={t('ui.profile.codex')}>
        <span>{s.codexLevel}</span>
      </span>
    </button>
  );
}

export function TopRight() {
  const { save, t, router } = useUi();
  const s = save.value;
  return (
    <div class="home-top__right">
      <CurrencyChip kind="amber" value={s.currencies.amber} testid="chip-amber" />
      <CurrencyChip kind="dust" value={s.currencies.dust} testid="chip-dust" />
      <IconButton
        icon={<GearIcon size={30} />}
        label={t('ui.nav.settings')}
        onClick={() => router.go({ id: 'settings' })}
        testid="nav-settings"
      />
    </div>
  );
}

function rewardText(r: QuestReward, t: ReturnType<typeof useUi>['t'], locale: string): string {
  switch (r.kind) {
    case 'amber':
      return formatInt(r.amount, locale);
    case 'dust':
      return formatInt(r.amount, locale);
    case 'ageCapsule':
      return t(capsuleKindNameKey('age'));
    case 'wardrobe':
      return t('ui.reward.wardrobe');
  }
}

export function RewardIcon(p: { reward: QuestReward; size?: number }) {
  const s = p.size ?? 20;
  switch (p.reward.kind) {
    case 'amber':
      return <AmberIcon size={s} />;
    case 'dust':
      return <DustIcon size={s} />;
    case 'ageCapsule':
      return <CapsuleIcon tier="silver" size={s + 4} />;
    case 'wardrobe':
      return <CrateIcon size={s + 4} />;
  }
}

function QuestRow(p: { q: QuestView; rerollLeft: boolean }) {
  const { t, locale, services, toasts } = useUi();
  const q = p.q;
  const name = t(questNameKey(q.def.id), { n: formatInt(q.target, locale) });
  return (
    <li class={`home-quest${q.done ? ' is-done' : ''}${q.claimed ? ' is-claimed' : ''}`} data-testid={`quest-${q.slot}`}>
      <div class="home-quest__main">
        <span class="home-quest__name">{name}</span>
        <span class="home-quest__bar">
          <ProgressBar value={q.progress} max={q.target} tone={q.done ? 'green' : 'blue'} thin label={name} />
          <span class="home-quest__count">
            {t('ui.common.progress', { n: formatInt(q.progress, locale), max: formatInt(q.target, locale) })}
          </span>
        </span>
      </div>
      <span class="home-quest__reward">
        {q.def.rewards.map((r, i) => (
          <span key={i} class="home-quest__rw">
            <RewardIcon reward={r} size={18} />
            <b>{rewardText(r, t, locale)}</b>
          </span>
        ))}
      </span>
      {q.claimed ? (
        <span class="home-quest__check" aria-label={t('ui.quest.claimed')}>
          <CheckIcon size={24} />
        </span>
      ) : q.done ? (
        <Button
          variant="green"
          size="sm"
          testid={`quest-claim-${q.slot}`}
          onClick={() => {
            const r = services.claimQuest(q.slot);
            toasts.show(r.ok ? t('ui.quest.claimedToast') : t('ui.error.generic'), { tone: r.ok ? 'good' : 'bad' });
          }}
        >
          {t('ui.quest.claim')}
        </Button>
      ) : typeof q.slot === 'number' && p.rerollLeft ? (
        <IconButton
          icon={<RefreshIcon size={22} />}
          label={t('ui.quest.reroll')}
          variant="violet"
          testid={`quest-reroll-${q.slot}`}
          onClick={() => {
            const r = services.rerollQuest(q.slot as number);
            if (!r.ok) toasts.show(t('ui.error.generic'), { tone: 'bad' });
          }}
        />
      ) : (
        <span class="home-quest__spacer" />
      )}
    </li>
  );
}

export function QuestsPanel() {
  const { save, content, t } = useUi();
  const qv = questViews(save.value, content);
  return (
    <Panel
      title={t('ui.home.quests')}
      icon={<CalendarIcon size={24} />}
      class="home-quests"
      testid="home-quests"
      labelledBy="home-quests-title"
    >
      {qv.daily.length === 0 && !qv.weekly ? <p class="ui-muted">{t('ui.quest.none')}</p> : null}
      <ul class="home-quests__list">
        {qv.daily.map((q) => (
          <QuestRow key={String(q.slot)} q={q} rerollLeft={qv.rerollLeft} />
        ))}
      </ul>
      {qv.weekly ? (
        <>
          <h3 class="home-quests__weekly">{t('ui.home.weekly')}</h3>
          <ul class="home-quests__list">
            <QuestRow q={qv.weekly} rerollLeft={false} />
          </ul>
        </>
      ) : null}
      <p class="home-quests__hint">{qv.rerollLeft ? t('ui.quest.rerollHint') : t('ui.quest.rerollUsed')}</p>
    </Panel>
  );
}

export function CapsuleTray() {
  const { save, content, t, services, now, toasts } = useUi();
  const [odds, setOdds] = useState(false);
  const s = save.value;
  const pending = trayCapsules(s, content);
  const crates = s.capsules.wardrobe;
  const charges = chargesView(s, content, now());
  const daily = dailyCapsuleView(s, content, now());
  const arena = arenaOf(s, content);
  const best = pending[0];
  return (
    <Panel
      title={t('ui.home.capsules')}
      icon={<CapsuleIcon tier={best?.tier ?? 'bronze'} size={26} />}
      class="home-tray"
      testid="capsule-tray"
      labelledBy="home-tray-title"
      actions={<IconButton icon={<InfoIcon size={24} />} label={t('ui.odds.open')} onClick={() => setOdds(true)} testid="odds-open" />}
    >
      <div class="home-tray__drums" data-testid="tray-drums">
        {pending.length === 0 && crates.length === 0 ? <p class="home-tray__empty">{t('ui.home.noCapsules')}</p> : null}
        {pending.slice(0, 4).map((c, i) => (
          <button
            key={c.id}
            type="button"
            class={`home-drum home-drum--${c.tier}${i === 0 ? ' is-best' : ''}`}
            onClick={() => services.openCapsule(c.id)}
            aria-label={t('ui.home.openOne', { name: t(capsuleTierNameKey(c.tier)) })}
            data-testid={`drum-${c.id}`}
          >
            <CapsuleIcon tier={c.tier} size={i === 0 ? 64 : 46} />
          </button>
        ))}
        {pending.length > 4 ? <span class="home-tray__more">{t('ui.home.more', { n: pending.length - 4 })}</span> : null}
        {crates.slice(0, 2).map((c) => (
          <button
            key={c.id}
            type="button"
            class="home-drum home-drum--crate"
            onClick={() => services.openWardrobe(c.id)}
            aria-label={t('ui.home.openCrate')}
            data-testid={`crate-${c.id}`}
          >
            <CrateIcon size={46} />
          </button>
        ))}
      </div>
      {pending.length > 0 ? (
        <div class="home-tray__actions">
          <Button variant="gold" size="md" testid="open-one" onClick={() => best && services.openCapsule(best.id)}>
            {t('ui.home.open', { n: pending.length })}
          </Button>
          {pending.length > 1 ? (
            <Button variant="violet" size="md" testid="open-all" onClick={() => services.openAllCapsules()}>
              {t('ui.home.openAll')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div class="home-tray__rows">
        <div class="home-tray__row" data-testid="daily-capsule">
          <CapsuleIcon tier="bronze" size={30} />
          <span class="ui-grow">
            <b>{t('ui.home.daily')}</b>
            <small>
              {daily.bank > 0
                ? t('ui.home.dailyBank', { n: daily.bank, max: daily.max })
                : daily.nextInMs !== null
                  ? t('ui.home.dailyNext', { time: formatCountdown(daily.nextInMs, t) })
                  : t('ui.home.dailyLocked')}
            </small>
          </span>
          {daily.bank > 0 ? (
            <Button
              variant="green"
              size="sm"
              testid="daily-claim"
              onClick={() => {
                const r = services.claimDailyCapsule();
                if (!r.ok) toasts.show(t('ui.error.generic'), { tone: 'bad' });
              }}
            >
              {t('ui.home.claim')}
            </Button>
          ) : null}
        </div>
        <div class="home-tray__row" data-testid="charges">
          <span class="home-charge" aria-hidden="true">
            <ClockIcon size={26} />
          </span>
          <span class="ui-grow">
            <b>{t('ui.home.charges', { n: charges.charges, max: charges.max })}</b>
            <small>
              {charges.free > 0
                ? t('ui.home.freeCapsules', { n: charges.free })
                : charges.nextInMs !== null
                  ? t('ui.home.chargeNext', { time: formatCountdown(charges.nextInMs, t) })
                  : t('ui.home.chargesFull')}
            </small>
          </span>
        </div>
        <ClayMeter pips={Math.min(s.capsules.clayMeter, content.capsules.clayMeterPips)} max={content.capsules.clayMeterPips} />
      </div>
      {odds ? (
        <Modal title={t('ui.odds.title')} onClose={() => setOdds(false)} size="lg" testid="odds-modal" icon={<InfoIcon size={28} />}>
          <OddsSheet model={oddsModel(content.capsules, content.rarities, s, arena.randomLegendaries)} />
        </Modal>
      ) : null}
    </Panel>
  );
}

export function OpponentPreview(p: { opponent: OpponentSpec | null }) {
  const { t, content } = useUi();
  const o = p.opponent;
  if (!o) return null;
  const name = opponentName(o, content, t);
  return (
    <div class="home-opp" data-testid="home-opponent">
      <GeneralPortrait generalId={o.generalId} name={o.displayName} size={48} />
      <span class="home-opp__text">
        <span class="home-opp__label">{t('ui.home.nextOpponent')}</span>
        <span class="home-opp__name">{name}</span>
        <span class="home-opp__meta">
          <AiBadge size="sm" />
          <span>{t('ui.vs.tier', { tier: tierNumeral(o.tier) })}</span>
          {o.warmUp ? <span class="home-opp__warm">{t('ui.vs.warmUp')}</span> : null}
        </span>
      </span>
    </div>
  );
}

export function BattleButton() {
  const { t, router } = useUi();
  return (
    <button type="button" class="home-battle" data-testid="battle-button" data-autofocus="" onClick={() => router.go({ id: 'modeSelect' })}>
      <span class="home-battle__face">
        <span class="home-battle__icon">
          <SwordsIcon size={46} />
        </span>
        <span class="home-battle__text">{t('ui.home.battle')}</span>
        <i class="home-battle__shine" aria-hidden="true" />
      </span>
    </button>
  );
}

export function RoadBar() {
  const { save, content, t, locale, router } = useUi();
  const rp = roadProgress(save.value, content);
  const next = rp.next;
  return (
    <button
      type="button"
      class="home-road"
      data-testid="home-road"
      onClick={() => router.go({ id: 'trophyRoad' })}
      aria-label={t('ui.nav.trophyRoad')}
    >
      <span class="home-road__icon">
        <RoadIcon size={30} />
      </span>
      <span class="home-road__main">
        <span class="home-road__label">
          {next ? t('ui.home.roadNext', { n: formatInt(next.trophies, locale) }) : t('ui.home.roadDone')}
        </span>
        <ProgressBar value={rp.best - rp.from} max={next ? next.trophies - rp.from : 1} tone="gold" thin label={t('ui.nav.trophyRoad')} />
      </span>
      {rp.claimable > 0 ? <Badge tone="green">{rp.claimable}</Badge> : null}
    </button>
  );
}

export function ArenaBanner() {
  const { save, content, t } = useUi();
  const arena = arenaOf(save.value, content);
  return (
    <div class="home-arena" data-testid="home-arena">
      <span class="home-arena__num">{t('ui.home.arenaN', { n: arena.index })}</span>
      <span class="home-arena__name">{t(arenaNameKey(arena.id))}</span>
    </div>
  );
}

interface NavItem {
  route: Route;
  labelKey: string;
  icon: ComponentChildren;
  locked: boolean;
  lockKey: string;
  lockParams?: Record<string, string | number>;
  badge?: number;
}

export function HomeNav() {
  const { save, content, t, router, toasts } = useUi();
  const s = save.value;
  const u = unlocks(s, content);
  const ready = Object.keys(s.collection).filter((id) => {
    const e = s.collection[id]!;
    const def = content.units[id] ?? content.turrets[id];
    if (!def) return false;
    const need = content.rarities.cards[def.rarity].upgradeCopies[e.level - 1];
    return need !== undefined && e.copies >= need;
  }).length;
  const rp = roadProgress(s, content);
  const items: NavItem[] = [
    {
      route: { id: 'warPlan' },
      labelKey: 'ui.nav.warPlan',
      icon: <ScrollIcon size={34} />,
      locked: !u.warPlan,
      lockKey: 'ui.lock.afterMatches',
      lockParams: { n: 3 },
    },
    { route: { id: 'collection' }, labelKey: 'ui.nav.collection', icon: <CardsIcon size={34} />, locked: false, lockKey: '', badge: ready },
    {
      route: { id: 'trophyRoad' },
      labelKey: 'ui.nav.trophyRoad',
      icon: <RoadIcon size={34} />,
      locked: false,
      lockKey: '',
      badge: rp.claimable,
    },
    {
      route: { id: 'conquest' },
      labelKey: 'ui.nav.conquest',
      icon: <CastleIcon size={34} />,
      locked: !u.conquest,
      lockKey: 'ui.lock.arena',
      lockParams: { n: u.conquestArena },
    },
  ];
  return (
    <nav class="home-nav" aria-label={t('ui.nav.label')} data-testid="home-nav">
      {items.map((it) => (
        <button
          key={it.route.id}
          type="button"
          class={`home-nav__btn${it.locked ? ' is-locked' : ''}`}
          data-testid={`nav-${it.route.id}`}
          aria-disabled={it.locked ? 'true' : undefined}
          onClick={() => {
            if (it.locked) {
              toasts.show(t(it.lockKey, it.lockParams), { tone: 'info', icon: <LockIcon size={20} /> });
              return;
            }
            router.go(it.route);
          }}
        >
          <span class="home-nav__icon">
            {it.icon}
            {it.locked ? (
              <span class="home-nav__lock">
                <LockIcon size={20} />
              </span>
            ) : null}
            {it.badge ? (
              <span class="home-nav__badge">
                <Badge tone="green">{it.badge}</Badge>
              </span>
            ) : null}
          </span>
          <span class="home-nav__labels">
            <span class="home-nav__label">{t(it.labelKey)}</span>
            {it.locked ? <span class="home-nav__lockText">{t(it.lockKey, it.lockParams)}</span> : null}
          </span>
        </button>
      ))}
    </nav>
  );
}
