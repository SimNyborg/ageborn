/**
 * The pieces of the Home screen (A9 #2). Each piece reads only the UI environment and the pure view
 * models, so a later illustrated village Home can reuse them as building pop-ups.
 */
import { arenaNameKey, capsuleKindNameKey, questNameKey } from '@/content/keys';
import type { QuestReward } from '@/content/types';
import type { OpponentSpec } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { AiBadge, Badge, CurrencyChip } from '../../components/Chips';
import { formatInt, tierNumeral } from '../../components/format';
import {
  AmberIcon,
  BrushIcon,
  CalendarIcon,
  CapsuleIcon,
  CardsIcon,
  CastleIcon,
  CheckIcon,
  CrateIcon,
  DustIcon,
  GearIcon,
  InfoIcon,
  LockIcon,
  RefreshIcon,
  RoadIcon,
  ScrollIcon,
  SundialIcon,
  SwordsIcon,
  TrophyIcon,
} from '../../components/icons';
import { pendingCrests, pendingNameKey, visibleTier } from '../../components/capsuleLook';
import { Panel } from '../../components/Layout';
import { ClayMeter, ProgressBar } from '../../components/Meters';
import { Modal } from '../../components/Modal';
import { OddsSheet } from '../../components/OddsSheet';
import { oddsModel } from '../../components/oddsModel';
import type { Route } from '../../router';
import { useUi } from '../context';
import { opponentName } from '../model/opponent';
import {
  arenaOf,
  bankRules,
  match2Next,
  pointerDue,
  pointerFlag,
  POINTER_KEYS,
  chargesView,
  questViews,
  roadProgress,
  supplyView,
  trayCapsules,
  unlocks,
  warChestView,
  type PointerEntry,
  type QuestView,
} from '../model/progress';
import { useMatchStarter } from '../shared/MatchStarter';
import { RoadRewardView } from '../shared/RoadReward';
import { QuestGlyph, WarChestArt } from '../progress/ProgressArt';

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

/** The Amber and Dust info panels (A15.3): what it is for, and that it can't be bought. */
export function CurrencyInfo(p: { kind: 'amber' | 'dust'; onClose: () => void }) {
  const { t } = useUi();
  const amber = p.kind === 'amber';
  return (
    <Modal
      title={t(amber ? 'ui.currency.amber' : 'ui.currency.dust')}
      onClose={p.onClose}
      size="sm"
      testid={`currency-info-${p.kind}`}
      icon={amber ? <AmberIcon size={28} /> : <DustIcon size={28} />}
    >
      <p class="home-info__use">{t(amber ? 'ui.currency.amberUse' : 'ui.currency.dustUse')}</p>
      <p class="home-info__kept">{t(amber ? 'ui.currency.amberInfo' : 'ui.currency.dustInfo')}</p>
    </Modal>
  );
}

export function TopRight() {
  const { save, t, router } = useUi();
  const [info, setInfo] = useState<'amber' | 'dust' | null>(null);
  const s = save.value;
  return (
    <div class="home-top__right">
      <button type="button" class="home-chipBtn" onClick={() => setInfo('amber')} aria-label={t('ui.currency.amber')}>
        <CurrencyChip kind="amber" value={s.currencies.amber} testid="chip-amber" />
      </button>
      <button type="button" class="home-chipBtn" onClick={() => setInfo('dust')} aria-label={t('ui.currency.dust')}>
        <CurrencyChip kind="dust" value={s.currencies.dust} testid="chip-dust" />
      </button>
      {info ? <CurrencyInfo kind={info} onClose={() => setInfo(null)} /> : null}
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
      <span class="home-quest__icon" aria-hidden="true">
        <QuestGlyph stat={q.def.metric} size={26} />
      </span>
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
          kind="primary"
          primary={false}
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
          kind="secondary"
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
      <WarChestBar />
      <p class="home-quests__hint">
        {t('ui.quest.queueLine')} {qv.rerollLeft ? t('ui.quest.rerollHint') : t('ui.quest.rerollUsed')}
      </p>
    </Panel>
  );
}

/**
 * The War Chest (A15.5), where the weekly quest line was: "War Chest 13/20". Counting wins fill it;
 * at 20 it opens by itself (a Wardrobe Crate and an Age Capsule) and starts again. Never reset.
 */
export function WarChestBar() {
  const { save, content, t, locale } = useUi();
  const w = warChestView(save.value, content);
  const label = t('ui.home.warChest', { n: formatInt(w.wins, locale), max: formatInt(w.of, locale) });
  return (
    <div class="home-chest" data-testid="war-chest" title={t('ui.home.warChestHint')}>
      <span class="home-chest__icon" aria-hidden="true">
        <WarChestArt fillBp={Math.round((w.wins * 10000) / Math.max(1, w.of))} size={40} />
      </span>
      <span class="home-chest__main">
        <span class="home-chest__row">
          <b class="home-chest__label">{label}</b>
          <span class="home-chest__rewards">
            <CrateIcon size={20} />
            <CapsuleIcon tier="silver" size={22} />
          </span>
        </span>
        <ProgressBar value={w.wins} max={w.of} tone="gold" thin label={label} />
        <small class="home-chest__hint">{t('ui.home.warChestHint')}</small>
      </span>
    </div>
  );
}

/** The capsule info panel (A15.3): each bank's rule and cap, then the odds. No countdowns. */
export function CapsuleInfo(p: { onClose: () => void }) {
  const { save, content, t, locale } = useUi();
  const s = save.value;
  const r = bankRules(content);
  const arena = arenaOf(s, content);
  const hours = Math.max(1, Math.round(r.chargeRegenMs / 3_600_000));
  const supply = supplyView(s, content);
  const cap = (n: number) => t('ui.info.bankCap', { n: formatInt(n, locale) });
  const rows: { id: string; icon: ComponentChildren; title: string; body: string; cap?: string }[] = [
    { id: 'charges', icon: <SundialIcon size={28} />, title: t('ui.info.charges'), body: t('ui.info.chargesRule', { h: hours }), cap: cap(r.chargesMax) },
    // The Supply Capsule retired into the Sundial (2026-09-30, A15.4): shown only while old allowance is left.
    ...(supply.moreMatches !== null
      ? [{ id: 'supply', icon: <CapsuleIcon tier="bronze" size={28} />, title: t('ui.home.supply'), body: t('ui.info.supplyRule', { n: r.supplyEvery }) }]
      : []),
    { id: 'daily', icon: <CalendarIcon size={26} />, title: t('ui.info.daily'), body: t('ui.info.dailyRule'), cap: cap(r.dailyRewardsMax) },
    { id: 'clay', icon: <CapsuleIcon tier="clay" size={28} />, title: t('ui.clay.label'), body: t('ui.info.clayRule', { n: content.capsules.clayMeterPips }) },
  ];
  return (
    <Modal title={t('ui.info.title')} onClose={p.onClose} size="lg" testid="odds-modal" icon={<InfoIcon size={28} />}>
      {/* The odds first (task 2.8: odds in 2 taps, no scrolling), then how each bank fills. */}
      <h3 class="home-info__h">{t('ui.odds.title')}</h3>
      <OddsSheet model={oddsModel(content.capsules, content.rarities, s, arena.randomLegendaries, content.cosmetics.collections)} />
      <h3 class="home-info__h">{t('ui.info.banksTitle')}</h3>
      <ul class="home-info" data-testid="capsule-info">
        {rows.map((row) => (
          <li key={row.id} class="home-info__row" data-testid={`info-${row.id}`}>
            <span class="home-info__icon">{row.icon}</span>
            <span class="home-info__text">
              <b>{row.title}</b>
              <span>{row.body}</span>
              {row.cap ? <small>{row.cap}</small> : null}
            </span>
          </li>
        ))}
      </ul>
      <p class="home-info__kept">{t('ui.info.kept')}</p>
      <p class="home-info__rookie">{t('ui.info.rookie')}</p>
    </Modal>
  );
}

export function CapsuleTray(p: { sheet?: boolean } = {}) {
  const { save, content, t, services, locale, now } = useUi();
  const [info, setInfo] = useState(false);
  const s = save.value;
  const pending = trayCapsules(s, content);
  const crates = s.capsules.wardrobe;
  const charges = chargesView(s, content, now());
  const supply = supplyView(s, content);
  const best = pending[0];
  return (
    <Panel
      {...(p.sheet ? {} : { title: t('ui.home.capsules'), icon: <CapsuleIcon tier={best ? visibleTier(content.capsules, best) : 'bronze'} size={26} /> })}
      class={`home-tray${p.sheet ? ' home-tray--sheet' : ''}`}
      testid="capsule-tray"
      labelledBy="home-tray-title"
      actions={<IconButton icon={<InfoIcon size={24} />} label={t('ui.info.title')} onClick={() => setInfo(true)} testid="odds-open" />}
    >
      <div class="home-tray__drums" data-testid="tray-drums">
        {pending.length === 0 && crates.length === 0 ? <p class="home-tray__empty">{t('ui.home.noCapsules')}</p> : null}
        {pending.slice(0, 4).map((c, i) => (
          <button
            key={c.id}
            type="button"
            class={`home-drum home-drum--${visibleTier(content.capsules, c)}${i === 0 ? ' is-best' : ''}`}
            onClick={() => services.openCapsule(c.id)}
            aria-label={t('ui.home.openOne', { name: t(pendingNameKey(content.capsules, c)) })}
            data-testid={`drum-${c.id}`}
          >
            <CapsuleIcon tier={visibleTier(content.capsules, c)} crests={pendingCrests(content.capsules, c)} size={i === 0 ? 64 : 46} />
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
      {pending.length === 0 && crates[0] ? (
        <div class="home-tray__actions">
          <Button kind="secondary" size="md" testid="open-crate" icon={<CrateIcon size={22} />} onClick={() => services.openWardrobe(crates[0]!.id)}>
            {t('ui.home.openCrate')}
          </Button>
        </div>
      ) : null}
      {pending.length > 0 ? (
        <div class="home-tray__actions">
          <Button kind="primary" size="md" testid="open-one" onClick={() => best && services.openCapsule(best.id)}>
            {t('ui.home.open', { n: pending.length })}
          </Button>
          {pending.length > 1 ? (
            <Button kind="secondary" size="md" testid="open-all" onClick={() => services.openAllCapsules()}>
              {t('ui.home.openAll')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div class="home-tray__rows">
        {supply.moreMatches !== null ? (
          <div class="home-tray__row" data-testid="supply">
            <CapsuleIcon tier="bronze" size={30} />
            <span class="ui-grow">
              <b>
                {supply.moreMatches === 1
                  ? t('ui.capsules.supplyLegacyOne', { n: formatInt(supply.bank, locale) })
                  : t('ui.capsules.supplyLegacy', { n: formatInt(supply.bank, locale), m: formatInt(supply.moreMatches, locale) })}
              </b>
            </span>
          </div>
        ) : null}
        <div class={`home-tray__row${charges.charges > 0 ? ' is-ready' : ''}`} data-testid="charges">
          <span class="home-charge" aria-hidden="true">
            <SundialIcon size={28} dim={charges.charges === 0} />
          </span>
          <span class="ui-grow">
            <b>{t('ui.home.charges', { n: formatInt(charges.charges, locale), max: formatInt(charges.max, locale) })}</b>
            {charges.free > 0 ? <small>{t('ui.home.freeCapsules', { n: charges.free })}</small> : null}
          </span>
        </div>
        <ClayMeter pips={Math.min(s.capsules.clayMeter, content.capsules.clayMeterPips)} max={content.capsules.clayMeterPips} />
      </div>
      {info ? <CapsuleInfo onClose={() => setInfo(false)} /> : null}
    </Panel>
  );
}

/**
 * Home's Sundial mark (DESIGN A6.3, A15.13; 2026-09-30): the dial glyph alone, in colour while a
 * capsule is ready and grey when none is. No number (a "34/34" would read as a backlog and a pull
 * cue, A15.13), no glow, no time, no countdown and no motion loop on Home; tapping it opens the
 * Capsules tab, where the Sundial card shows "n of 34 ready" and when the next one is ready.
 */
export function SundialChip() {
  const { save, content, t, router, now, sound } = useUi();
  const ready = chargesView(save.value, content, now()).charges > 0;
  // The glyph lighting up while Home is open answers with a soft chime (audit 2026-10-01); never on
  // the first draw, so opening Home is not a nudge.
  const was = useRef(ready);
  useEffect(() => {
    if (ready && !was.current) sound?.('glyph_light');
    was.current = ready;
  }, [ready]);
  return (
    <button
      type="button"
      class={`wp-chip hub-sundial${ready ? ' is-ready' : ' is-dim'}`}
      data-testid="home-sundial"
      aria-label={t(ready ? 'ui.home.sundialReadyAria' : 'ui.home.sundialEmptyAria')}
      onClick={() => router.switchTab('capsules', { id: 'capsules' })}
    >
      <span class="ui-chip hub-sundial__chip">
        <span class="ui-chip__icon">
          <SundialIcon size={28} dim={!ready} />
        </span>
      </span>
    </button>
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

/**
 * The big Battle button: Mode select, or, while onboarding match 2 is next, that match vs Pip
 * (owner feedback 2026-09-28: Home is the hub from right after the training match and capsule 1).
 */
export function BattleButton() {
  const { t, router, save, content } = useUi();
  const starter = useMatchStarter();
  const suggested = match2Next(save.value);
  // Onboarding match 2 is always vs Pip (A8); the name comes from the content, not from meta.
  const pip = suggested ? content.generals.list['pip' as keyof typeof content.generals.list] : undefined;
  return (
    <>
    <button
      type="button"
      class={`home-battle${suggested ? ' is-suggested' : ''}`}
      data-testid="battle-button"
      data-autofocus=""
      onClick={() => (suggested ? starter.start({ mode: 'tutorial', match: 2 }) : router.go({ id: 'modeSelect' }))}
    >
      <span class="home-battle__face">
        <span class="home-battle__icon">
          <SwordsIcon size={46} />
        </span>
        <span class="home-battle__text">{t('ui.home.battle')}</span>
        <i class="home-battle__shine" aria-hidden="true" />
      </span>
    </button>
    {pip ? (
      <span class="home-battle__next" data-testid="battle-suggested">
        {t('ui.home.suggested', { name: t(pip.nameKey) })}
        <AiBadge size="sm" />
      </span>
    ) : null}
    {starter.dialog}
    </>
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
        <span class="home-road__row">
          <span class="home-road__label">
            {next ? t('ui.home.roadNext', { n: formatInt(next.trophies, locale) }) : t('ui.home.roadDone')}
          </span>
          {next ? (
            <span class="home-road__next" data-testid="home-road-next">
              {next.rewards.map((r, i) => (
                <RoadRewardView key={i} r={r} compact />
              ))}
            </span>
          ) : null}
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
  id: string;
  /** Where the entry goes; null for the Capsules entry, which opens the tray sheet. */
  route: Route | null;
  /** The first-time pointer shown on this entry (once). */
  pointer?: PointerEntry;
  labelKey: string;
  icon: ComponentChildren;
  locked: boolean;
  lockKey: string;
  lockParams?: Record<string, string | number>;
  badge?: number;
}

/** The Capsules entry's sheet: the same tray as on Home's right side, for small screens too. */
function CapsulesSheet(p: { onClose: () => void }) {
  const { t } = useUi();
  return (
    <Modal title={t('ui.nav.capsules')} onClose={p.onClose} size="md" testid="capsules-sheet" icon={<CapsuleIcon tier="silver" size={28} />}>
      <CapsuleTray sheet />
    </Modal>
  );
}

/**
 * Home's entries (owner feedback 2026-09-28): War Plan, Collection, Capsules, Customize, Trophy Road
 * and Conquest, always visible, with a short first-time pointer on one new entry at a time.
 */
export function HomeNav() {
  const { save, content, t, router, toasts, services } = useUi();
  const [sheet, setSheet] = useState(false);
  const s = save.value;
  const u = unlocks(s, content);
  const capsuleCount = s.capsules.pending.length + s.capsules.wardrobe.length;
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
      id: 'warPlan',
      route: { id: 'warPlan' },
      pointer: 'warPlan',
      labelKey: 'ui.nav.warPlan',
      icon: <ScrollIcon size={34} />,
      locked: !u.warPlan,
      lockKey: 'ui.lock.afterTraining',
    },
    {
      id: 'collection',
      route: { id: 'collection' },
      pointer: 'collection',
      labelKey: 'ui.nav.collection',
      icon: <CardsIcon size={34} />,
      locked: false,
      lockKey: '',
      badge: ready,
    },
    {
      id: 'capsules',
      route: null,
      pointer: 'capsules',
      labelKey: 'ui.nav.capsules',
      icon: <CapsuleIcon tier="silver" size={34} />,
      locked: false,
      lockKey: '',
      badge: capsuleCount,
    },
    {
      id: 'customize',
      route: { id: 'customize' },
      pointer: 'customize',
      labelKey: 'ui.nav.customize',
      icon: <BrushIcon size={34} />,
      locked: !u.warPlan,
      lockKey: 'ui.lock.afterTraining',
    },
    {
      id: 'trophyRoad',
      route: { id: 'trophyRoad' },
      pointer: 'trophyRoad',
      labelKey: 'ui.nav.trophyRoad',
      icon: <RoadIcon size={34} />,
      locked: false,
      lockKey: '',
      badge: rp.claimable,
    },
    {
      id: 'conquest',
      route: { id: 'conquest' },
      labelKey: 'ui.nav.conquest',
      icon: <CastleIcon size={34} />,
      locked: !u.conquest,
      lockKey: 'ui.lock.arena',
      lockParams: { n: u.conquestArena },
    },
  ];
  // One pointer at a time, in this order, on an open entry the player has not opened yet.
  const pointer = items.find((it) => it.pointer && !it.locked && pointerDue(s, it.pointer))?.pointer ?? null;
  return (
    <nav class="home-nav" aria-label={t('ui.nav.label')} data-testid="home-nav">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          class={`home-nav__btn${it.locked ? ' is-locked' : ''}${it.pointer && it.pointer === pointer ? ' has-pointer' : ''}`}
          data-testid={`nav-${it.id}`}
          aria-disabled={it.locked ? 'true' : undefined}
          onClick={() => {
            if (it.locked) {
              toasts.show(t(it.lockKey, it.lockParams), { tone: 'info', icon: <LockIcon size={20} /> });
              return;
            }
            if (it.pointer && pointerDue(s, it.pointer)) services.setUiFlags({ [pointerFlag(it.pointer)]: true });
            if (it.route) router.go(it.route);
            else setSheet(true);
          }}
        >
          {it.pointer && it.pointer === pointer ? (
            <span class="home-nav__pointer" role="note" data-testid={`pointer-${it.pointer}`}>
              {t(POINTER_KEYS[it.pointer])}
            </span>
          ) : null}
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
      {sheet ? <CapsulesSheet onClose={() => setSheet(false)} /> : null}
    </nav>
  );
}
