/**
 * The pieces of the Battle hub (Home, S2; owner decision 2026-09-30, ui-plan 2.3). Each reads only the
 * UI environment and the pure view models:
 *
 * - `HubProfile`: avatar, name and trophies (once the Ladder is open); opens Profile.
 * - `HubTopRight`: the Amber and Dust chips (each once earned, with its first-seen caption, MR-28) and
 *   the gear.
 * - `ArenaTitle` and `TrophyBar`: the arena's name ribbon and the trophy progress to the next Trophy
 *   Road reward; the bar opens Trophy Road.
 * - `MatchPlate`: who the Battle button fights (the General's portrait with the AI badge, tier) and
 *   the format picker, sitting over Battle like the War Path's level plate. It is the slot where the
 *   online opponent will show once online play exists (A18.10); until then every opponent is an AI.
 * - `CampaignCard`: the War Path, the offline side road (play offline, earn cards), with its region
 *   art, level and stars; opens the War Path screen.
 * - `CapsuleSlots`: four capsule slots, each opens its capsule with one tap (charges never block).
 * - `UnlockPointer`: MR-40, a feature that just opened.
 */
import { arenaNameKey } from '@/content/keys';
import type { FormatId, OpponentSpec } from '@/contracts';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { AiBadge, CurrencyChip } from '../../components/Chips';
import { Segmented } from '../../components/Controls';
import { formatInt, tierNumeral } from '../../components/format';
import { AmberIcon, CapsuleIcon, CardsIcon, CrateIcon, GearIcon, StarIcon, TrophyIcon } from '../../components/icons';
import { pendingCrests, pendingNameKey, visibleTier } from '../../components/capsuleLook';
import { useKit } from '../../components/kit';
import { useUi } from '../context';
import { opponentName } from '../model/opponent';
import { arenaOf, roadProgress, trayCapsules } from '../model/progress';
import { currentLevelId, featureOpen, levelNameKey, mapRegions, playLevelId, progressOf, regionNameKey, type HomeUnlock } from '../model/warPath';
import { RoadRewardView } from '../shared/RoadReward';
import { CurrencyInfo } from './parts';
import { RegionFar } from '../warPath/regionArt';

// ---------------------------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------------------------

export function HubProfile() {
  const { save, content, t, router, locale } = useUi();
  const s = save.value;
  return (
    <button type="button" class="wp-profile" data-testid="home-profile" onClick={() => router.go({ id: 'profile' })} aria-label={t('ui.home.openProfile')}>
      <Avatar spec={s.profile.avatar} size={32} />
      <span class="wp-profile__name" data-clip-check="">
        {s.profile.name}
      </span>
      {featureOpen(s, content, 'ladder') ? (
        <span class="wp-profile__trophies">
          <TrophyIcon size={16} />
          <b class="ui-num">{formatInt(s.trophies.current, locale)}</b>
        </span>
      ) : null}
    </button>
  );
}

/** The currency chips (each once earned, with its first-seen caption, MR-28) and the gear. */
export function HubTopRight(p: { quiet: boolean }) {
  const { save, t, router, services } = useUi();
  const s = save.value;
  const [info, setInfo] = useState<'amber' | 'dust' | null>(null);
  const showAmber = s.currencies.amber > 0 || s.warPath?.legacy;
  const showDust = s.currencies.dust > 0 || s.warPath?.legacy;
  // One first-seen caption at a time, never over a ceremony (MR-28, U13).
  const caption = p.quiet ? null : showAmber && !s.flags['ui-seen.amber'] ? 'amber' : showDust && !s.flags['ui-seen.dust'] ? 'dust' : null;
  const [shown, setShown] = useState<'amber' | 'dust' | null>(null);
  // The caption counts as seen once it has shown in full; a ceremony or unlock that starts meanwhile
  // hides it, and it comes back afterwards (never two new things at once, U8).
  useEffect(() => {
    if (!caption) {
      setShown(null);
      return;
    }
    setShown(caption);
    const id = setTimeout(() => {
      setShown(null);
      services.setUiFlags({ [`ui-seen.${caption}`]: true });
    }, 4000);
    return () => clearTimeout(id);
  }, [caption]);
  return (
    <div class="wp-top__right">
      {showAmber ? (
        <button type="button" class="wp-chip" onClick={() => setInfo('amber')} aria-label={t('ui.currency.amber')} data-testid="home-amber">
          <CurrencyChip kind="amber" value={s.currencies.amber} testid="chip-amber" />
          {shown === 'amber' ? (
            <span class="wp-caption" role="note" data-testid="caption-amber">
              {t('warPath.ui.captionAmber')}
            </span>
          ) : null}
        </button>
      ) : null}
      {showDust ? (
        <button type="button" class="wp-chip" onClick={() => setInfo('dust')} aria-label={t('ui.currency.dust')} data-testid="home-dust">
          <CurrencyChip kind="dust" value={s.currencies.dust} testid="chip-dust" />
          {shown === 'dust' ? (
            <span class="wp-caption" role="note" data-testid="caption-dust">
              {t('warPath.ui.captionDust')}
            </span>
          ) : null}
        </button>
      ) : null}
      {info ? <CurrencyInfo kind={info} onClose={() => setInfo(null)} /> : null}
      <IconButton icon={<GearIcon size={28} />} label={t('ui.nav.settings')} onClick={() => router.go({ id: 'settings' })} testid="nav-settings" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Arena and trophies
// ---------------------------------------------------------------------------------------------

export function ArenaTitle() {
  const { save, content, t } = useUi();
  const arena = arenaOf(save.value, content);
  return (
    <div class="hub-arena" data-testid="home-arena">
      <span class="hub-arena__num" data-tag="">
        {t('ui.home.arenaN', { n: arena.index })}
      </span>
      <span class="hub-arena__name" data-clip-check="">
        {t(arenaNameKey(arena.id))}
      </span>
    </div>
  );
}

/** Trophies and the way to the next Trophy Road reward; opens Trophy Road (Progress). */
export function TrophyBar() {
  const { save, content, t, locale, router } = useUi();
  const rp = roadProgress(save.value, content);
  const next = rp.next;
  const span = next ? Math.max(1, next.trophies - rp.from) : 1;
  const pct = next ? Math.max(0, Math.min(100, ((rp.best - rp.from) / span) * 100)) : 100;
  const label = next ? t('ui.hub.roadNext', { n: formatInt(next.trophies, locale) }) : t('ui.home.roadDone');
  return (
    <button type="button" class="hub-road" data-testid="home-trophies" onClick={() => router.go({ id: 'trophyRoad' })} aria-label={`${t('ui.nav.trophyRoad')}. ${label}`}>
      <span class="hub-road__cup" aria-hidden="true">
        <TrophyIcon size={26} />
      </span>
      <span class="hub-road__main">
        <span class="hub-road__row">
          <b class="hub-road__now ui-num" data-testid="home-trophy-count">
            {formatInt(rp.trophies, locale)}
          </b>
          <span class="hub-road__label">{label}</span>
        </span>
        <span class="hub-road__bar" aria-hidden="true">
          <i class="hub-road__fill" style={{ transform: `scaleX(${(pct / 100).toFixed(3)})` }} />
          <i class="hub-road__shine" />
        </span>
      </span>
      {next ? (
        <span class="hub-road__reward" data-testid="home-road-next">
          {next.rewards.slice(0, 2).map((r, i) => (
            <RoadRewardView key={i} r={r} compact />
          ))}
        </span>
      ) : null}
      {rp.claimable > 0 ? (
        <span class="ui-badge ui-badge--green hub-road__badge" data-badge="ready">
          {rp.claimable}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// The match plate (who Battle fights, and the format)
// ---------------------------------------------------------------------------------------------

export function MatchPlate(p: {
  opponent: OpponentSpec | null;
  /** The onboarding match Battle starts while it is due (A8), else null. */
  training: 1 | 2 | null;
  formats: readonly FormatId[];
  format: FormatId;
  onFormat(f: FormatId): void;
  aside?: boolean;
}) {
  const { t, content } = useUi();
  const o = p.opponent;
  // Onboarding: the level's General (Old Grogg, then Pip), labelled AI like every bot (A7.1).
  const trainingGeneral = p.training ? content.warPath.levels[content.warPath.order[p.training - 1]!]?.general : undefined;
  const generalId = o?.generalId ?? trainingGeneral ?? null;
  const g = generalId ? content.generals.list[generalId as keyof typeof content.generals.list] : undefined;
  const name = o ? opponentName(o, content, t) : g ? t(g.nameKey) : '';
  return (
    <div class={`hub-plate${p.aside ? ' is-away' : ''}`} data-testid="home-opponent">
      <div class="hub-plate__who">
        <span class="hub-plate__portrait">
          {generalId ? <GeneralPortrait generalId={generalId} size={44} label={name} /> : null}
          <span class="hub-plate__ai">
            <AiBadge size="sm" />
          </span>
        </span>
        <span class="hub-plate__text">
          <span class="hub-plate__over">
            {p.training ? t('ui.hub.training') : t('ui.home.nextOpponent')}
            {o ? (
              <span class="hub-plate__tier" data-testid="home-opponent-tier">
                {t('ui.vs.tier', { tier: tierNumeral(o.tier) })}
              </span>
            ) : null}
          </span>
          <span class="hub-plate__name" data-clip-check="">
            {name}
          </span>
        </span>
      </div>
      {!p.training && p.formats.length > 1 ? (
        <div class="hub-plate__format">
          <Segmented
            label={t('ui.mode.format')}
            value={p.format}
            onChange={p.onFormat}
            options={p.formats.map((f) => ({ value: f, label: t(`ui.hub.format.${f}`) }))}
            testid="home-format"
            size="sm"
          />
        </div>
      ) : null}
      {!p.training ? (
        <span class="hub-plate__desc" data-testid="home-format-desc">
          {t(`format.${p.format}.name`)} · {t(`format.${p.format}.desc`)}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The campaign card (the War Path, the offline side road)
// ---------------------------------------------------------------------------------------------

export function CampaignCard() {
  const { save, content, t, router, locale } = useUi();
  const kit = useKit();
  const s = save.value;
  const regions = mapRegions(s, content);
  const id = playLevelId(s, content);
  const level = content.warPath.levels[id]!;
  const region = regions.find((r) => r.age === level.region)!;
  const done = currentLevelId(s, content) === null;
  const stars = regions.reduce((n, r) => n + r.stars, 0);
  const max = regions.reduce((n, r) => n + r.max, 0);
  const wp = progressOf(s);
  const firstClear = !(wp.stars[id] ?? 0);
  return (
    <button
      type="button"
      class="hub-camp"
      data-testid="home-campaign"
      onClick={() => {
        kit.sound?.('ui_whoosh');
        router.go({ id: 'warPath' });
      }}
      aria-label={`${t('ui.hub.campaign')}. ${t('ui.hub.campaignSub')}. ${t('warPath.ui.levelOf', { region: t(regionNameKey(level.region)), n: level.index, max: region.to - region.from + 1 })}`}
    >
      <span class="hub-camp__art" aria-hidden="true">
        <RegionFar age={level.region} w={240} h={120} horizon={70} />
        <svg class="hub-camp__road" viewBox="0 0 240 64" preserveAspectRatio="none">
          <path d="M-4 52 C40 30 70 60 110 40 S180 18 244 34" fill="none" stroke="#0f1218" stroke-width="9" stroke-linecap="round" opacity=".55" />
          <path d="M-4 52 C40 30 70 60 110 40 S180 18 244 34" fill="none" stroke="#d8c79a" stroke-width="5" stroke-linecap="round" />
          <path d="M-4 52 C40 30 70 60 110 40" fill="none" stroke="#ffe39a" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round" />
        </svg>
        <span class="hub-camp__node">
          <b>{level.index}</b>
        </span>
        <span class="hub-camp__flag" />
      </span>
      <span class="hub-camp__body">
        <span class="hub-camp__head">
          <span class="hub-camp__title">{t('ui.hub.campaign')}</span>
          <span class="hub-camp__stars" data-testid="home-campaign-stars">
            <StarIcon size={14} filled />
            <b class="ui-num">{formatInt(stars, locale)}</b>
            <small>/{formatInt(max, locale)}</small>
          </span>
        </span>
        <span class="hub-camp__sub">{t('ui.hub.campaignSub')}</span>
        <span class="hub-camp__level" data-clip-check="">
          {done
            ? t('ui.hub.campaignDone')
            : t('ui.hub.campaignNext', { n: level.index, name: t(levelNameKey(id)) })}
        </span>
        {firstClear && !done && (level.reward.amber > 0 || level.reward.card) ? (
          <span class="hub-camp__reward">
            {level.reward.card ? <CardsIcon size={14} /> : null}
            {level.reward.amber > 0 ? (
              <>
                <AmberIcon size={14} />
                <b class="ui-num">{formatInt(level.reward.amber, locale)}</b>
              </>
            ) : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Capsule slots
// ---------------------------------------------------------------------------------------------

export const SLOTS = 4;

export function CapsuleSlots() {
  const { save, content, t, services, router } = useUi();
  const s = save.value;
  const caps = trayCapsules(s, content);
  const crates = s.capsules.wardrobe;
  const items = [...caps.map((c) => ({ kind: 'capsule' as const, c })), ...crates.map((c) => ({ kind: 'crate' as const, c }))];
  const extra = Math.max(0, items.length - SLOTS);
  const shown = items.slice(0, extra > 0 ? SLOTS - 1 : SLOTS);
  return (
    <div class="hub-slots" role="group" aria-label={t('ui.home.capsules')} data-testid="capsule-tray">
      {Array.from({ length: SLOTS }, (_, i) => {
        const it = shown[i];
        if (it) {
          const tier = it.kind === 'capsule' ? visibleTier(content.capsules, it.c) : null;
          const name = it.kind === 'capsule' ? t(pendingNameKey(content.capsules, it.c)) : t('ui.capsules.crate');
          return (
            <button
              key={it.c.id}
              type="button"
              class={`hub-slot is-full${tier ? ` hub-slot--${tier}` : ' hub-slot--crate'}`}
              style={{ '--i': i }}
              data-testid={it.kind === 'capsule' ? `drum-${it.c.id}` : `crate-${it.c.id}`}
              aria-label={t('ui.home.openOne', { name })}
              onClick={() => (it.kind === 'capsule' ? services.openCapsule(it.c.id) : services.openWardrobe(it.c.id))}
            >
              <span class="hub-slot__drum">
                {it.kind === 'capsule' ? <CapsuleIcon tier={tier!} crests={pendingCrests(content.capsules, it.c)} size={40} /> : <CrateIcon size={38} />}
              </span>
            </button>
          );
        }
        if (i === SLOTS - 1 && extra > 0)
          return (
            <button key="more" type="button" class="hub-slot is-more" data-testid="tray-more" aria-label={t('ui.nav.capsules')} onClick={() => router.switchTab('capsules', { id: 'capsules' })}>
              <b class="ui-num">{t('ui.home.more', { n: extra + 1 })}</b>
            </button>
          );
        return (
          <span key={`e${i}`} class="hub-slot is-empty" aria-hidden="true">
            <CapsuleIcon tier="bronze" size={30} />
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// MR-40: the feature that just opened
// ---------------------------------------------------------------------------------------------

export const UNLOCK_TARGET: Readonly<Record<HomeUnlock, string>> = {
  army: 'tab-army',
  capsules: 'tab-capsules',
  modes: 'home-modes',
  customize: 'tab-customize',
  progress: 'tab-progress',
  ladder: 'home-trophies',
  daily: 'home-modes',
  campaign: 'home-campaign',
};

/**
 * MR-40: the feature that just opened. The rest of Home dims for a moment (Battle stays lit and
 * pressable), a ring bursts its padlock around the tab or tile, and one line with "Open" (secondary)
 * points at it. Taps elsewhere go through to Home; it folds away by itself after a few seconds.
 */
export function UnlockPointer(p: { feature: HomeUnlock; onOpen(): void; onDone(): void }) {
  const { t } = useUi();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [host, setHost] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const find = () => {
      const root = ref.current?.closest('.ui-root');
      const el = root?.querySelector<HTMLElement>(`[data-testid="${UNLOCK_TARGET[p.feature]}"]`);
      if (el && root) {
        setRect(el.getBoundingClientRect());
        setHost(root.getBoundingClientRect());
      }
    };
    find();
    const id = setTimeout(find, 350);
    const done = setTimeout(() => p.onDone(), 6000);
    // A tap anywhere else goes through and folds the pointer away, so a locked tab's own hint or a
    // panel never stacks on top of it.
    const onDown = (e: Event) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt?.closest?.('.wp-unlock__line')) return;
      p.onDone();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      clearTimeout(id);
      clearTimeout(done);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [p.feature]);
  const box = rect && host ? { left: rect.left - host.left, top: rect.top - host.top, width: rect.width, height: rect.height } : null;
  // A tall target (the Campaign card) gets the line beside it; a tab or tile above or below.
  const beside = !!box && !!host && box.height > 90 && box.left + box.width + 320 < host.width;
  const above = !beside && !!box && !!host && box.top > host.height / 2;
  return (
    <div class="wp-unlock" ref={ref} data-testid={`unlock-${p.feature}`} data-feature={p.feature}>
      {box ? (
        <>
          <span class="wp-unlock__dim" style={{ left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` }} aria-hidden="true" />
          <span class="wp-unlock__ring" style={{ left: `${box.left + box.width / 2}px`, top: `${box.top + box.height / 2}px` }} aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 60}deg` }} />
            ))}
          </span>
          <div
            class={`wp-unlock__line${above ? ' is-above' : ''}${beside ? ' is-beside' : ''}`}
            style={
              beside
                ? { left: `${box.left + box.width + 14}px`, top: `${box.top + box.height / 2}px` }
                : {
                    left: `${Math.max(12, Math.min((host?.width ?? 800) - 312, box.left + box.width / 2 - 150))}px`,
                    top: above ? `${box.top - 12}px` : `${box.top + box.height + 12}px`,
                  }
            }
            role="status"
          >
            <span class="wp-unlock__new" data-tag="">
              {t('warPath.ui.unlock.new')}
            </span>
            <span class="wp-unlock__text">{t(`warPath.ui.unlock.${p.feature}`)}</span>
            <Button kind="secondary" size="s" testid="unlock-open" onClick={p.onOpen}>
              {t('warPath.ui.unlock.open')}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
