/**
 * The pieces of the Battle hub (Home, S2; owner decision 2026-09-30, ui-plan 2.3). Each reads only the
 * UI environment and the pure view models:
 *
 * - `HubProfile`: avatar, name and trophies (once the Ladder is open); opens Profile.
 * - `HubTopRight`: the Sundial mark (A6.3: the dial glyph alone, in colour while a capsule is ready,
 *   once the Ladder is open; no number; it opens the Capsules tab), the Amber and Dust chips (each once earned, with its first-seen
 *   caption, MR-28) and the gear.
 * - `ArenaTitle` and `TrophyBar`: the arena's name ribbon and the trophy progress to the next Trophy
 *   Road reward; the bar opens Trophy Road.
 * - The match plate over Battle lives in `plate.tsx` (and its online states in `online.tsx`).
 * - `CampaignCard`: the War Path, the offline side road (play offline, earn cards), with its region
 *   art, level and stars; opens the War Path screen.
 * - `CapsuleSlots`: four capsule slots, each opens its capsule with one tap (the Sundial never blocks).
 * - `UnlockPointer`: MR-40, a feature that just opened.
 */
import { arenaNameKey } from '@/content/keys';
import type { SaveDoc } from '@/contracts';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Avatar } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { CurrencyChip } from '../../components/Chips';
import { formatInt } from '../../components/format';
import { CapsuleIcon, CrateIcon, GearIcon, StarIcon, TrophyIcon } from '../../components/icons';
import { pendingCrests, pendingNameKey, visibleTier } from '../../components/capsuleLook';
import { useKit } from '../../components/kit';
import { useUi } from '../context';
import { arenaOf, roadProgress, trayCapsules } from '../model/progress';
import { currentLevelId, featureOpen, levelNameKey, mapRegions, playLevelId, regionNameKey, type HomeUnlock } from '../model/warPath';
import { RoadRewardView } from '../shared/RoadReward';
import { CurrencyInfo, SundialChip } from './parts';
import { REGION_THEMES, RegionFar, TREES } from '../warPath/regionArt';
import { BEARER_CARD, Grove } from '../warPath/propKit';
import { HeroPiece } from '../warPath/regionScenery';
import { SpriteStrip } from '../../components/SpriteStrip';
import type { AgeId } from '@/contracts';

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

/**
 * The currency caption still to show (MR-28): Amber first, then Dust, each once its chip is on Home.
 * Home queues its other first-seen captions (the plate's No clock caption) behind it (U8).
 */
export function pendingCurrencyCaption(s: SaveDoc): 'amber' | 'dust' | null {
  const showAmber = s.currencies.amber > 0 || s.warPath?.legacy;
  const showDust = s.currencies.dust > 0 || s.warPath?.legacy;
  return showAmber && !s.flags['ui-seen.amber'] ? 'amber' : showDust && !s.flags['ui-seen.dust'] ? 'dust' : null;
}

/** The currency chips (each once earned, with its first-seen caption, MR-28) and the gear. */
export function HubTopRight(p: { quiet: boolean }) {
  const { save, t, router, services, content } = useUi();
  const s = save.value;
  const [info, setInfo] = useState<'amber' | 'dust' | null>(null);
  const showAmber = s.currencies.amber > 0 || s.warPath?.legacy;
  const showDust = s.currencies.dust > 0 || s.warPath?.legacy;
  // One first-seen caption at a time, never over a ceremony (MR-28, U13).
  const caption = p.quiet ? null : pendingCurrencyCaption(s);
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
      {/* The Sundial mark (A6.3): the glyph alone, in colour while one is ready; no number, no time (A15.13). */}
      {featureOpen(s, content, 'ladder') ? <SundialChip /> : null}
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
    <div class="hub-arena" data-testid="home-arena" data-unlock-avoid="">
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
    <button type="button" class="hub-road" data-testid="home-trophies" data-unlock-avoid="" onClick={() => router.go({ id: 'trophyRoad' })} aria-label={`${t('ui.nav.trophyRoad')}. ${label}`}>
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
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// The campaign card (the War Path, the offline side road)
// ---------------------------------------------------------------------------------------------

/** The card's mid layer: the region's hills, a grove and its hero set piece (the War Path prop kit). */
function CampMid(p: { age: AgeId }) {
  const t = REGION_THEMES[p.age];
  return (
    <svg class="hub-camp__midart" viewBox="0 0 260 64" preserveAspectRatio="xMidYMax slice">
      <path d="M-10 44 Q40 30 90 38 T190 34 T270 38 V70 H-10Z" fill={t.patchDark} />
      <path d="M-10 48 Q50 38 110 46 T270 44 V70 H-10Z" fill={t.groundTop} />
      <path d="M20 44 Q50 38 80 42" stroke={t.patchLight} stroke-width="2" fill="none" opacity=".6" stroke-linecap="round" />
      <g transform="translate(206 47) scale(.42)">
        <HeroPiece age={p.age} t={t} />
      </g>
      <g transform="translate(34 46) scale(.5)">
        <Grove t={t} seed={7} n={6} kinds={TREES[p.age]} />
      </g>
    </svg>
  );
}

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
  const where = done
    ? t('ui.hub.campaignDone')
    : `${t('warPath.ui.levelOf', { region: t(regionNameKey(level.region)), n: level.index, max: region.to - region.from + 1 })}. ${t('ui.hub.campaignNext', { name: t(levelNameKey(id)) })}`;
  // A secondary card (Battle is Home's one primary, U1): slate chrome, the region picture and the
  // star count; the level and its reward wait on the map.
  return (
    <button
      type="button"
      class="hub-camp"
      data-testid="home-campaign"
      onClick={() => {
        kit.sound?.('ui_whoosh');
        router.go({ id: 'warPath' });
      }}
      aria-label={`${t('ui.hub.campaign')}. ${t('ui.hub.campaignSub')}. ${where}`}
    >
      <span class="hub-camp__art" aria-hidden="true">
        {/* UI art audit #8: three parallax layers (far sky and range, the region's hero set piece on
            its hills, the road with the node and the Standard Bearer) that pan at 1x / 1.2x / 1.5x when
            the card lifts on hover. */}
        <span class="hub-camp__layer hub-camp__far">
          <RegionFar age={level.region} w={260} h={120} horizon={74} />
        </span>
        <span class="hub-camp__layer hub-camp__mid">
          <CampMid age={level.region} />
        </span>
        <span class="hub-camp__layer hub-camp__near">
          <svg class="hub-camp__road" viewBox="0 0 260 64" preserveAspectRatio="xMidYMax slice">
            <path d="M-6 58 C40 36 74 64 116 46 S190 26 268 40" fill="none" stroke="#3a2c1c" stroke-width="11" stroke-linecap="round" opacity=".7" />
            <path d="M-6 58 C40 36 74 64 116 46 S190 26 268 40" fill="none" stroke="#d8c79a" stroke-width="7" stroke-linecap="round" />
            <path d="M-6 56.6 C40 34.6 74 62.6 116 44.6 S190 24.6 268 38.6" fill="none" stroke="#efe2bb" stroke-width="2.2" stroke-linecap="round" />
            <path d="M-6 58 C40 36 74 64 116 46" fill="none" stroke="#a8946a" stroke-width="1.4" stroke-dasharray="5 6" stroke-linecap="round" />
          </svg>
          <span class="hub-camp__node">{done ? <StarIcon size={14} filled /> : <b>{level.index}</b>}</span>
          <span class="hub-camp__bearer">
            <SpriteStrip card={BEARER_CARD} clip="idle" size={128} frameMs={150} class="hub-camp__strip" fallback={<i class="hub-camp__flag" />} />
          </span>
        </span>
        <i class="hub-camp__glint" />
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
        <span class="hub-camp__sub" data-clip-check="">
          {t('ui.hub.campaignSub')}
        </span>
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
 * `also` is a second feature that opened at the same moment (the War Path with the Ladder): it gets
 * its own ring and the line names both. The line never covers the elements marked
 * `data-unlock-avoid` (the trophy bar and the arena ribbon): it lifts above them.
 */
export function UnlockPointer(p: { feature: HomeUnlock; also?: HomeUnlock | null; onOpen(): void; onDone(): void }) {
  const { t } = useUi();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [alsoRect, setAlsoRect] = useState<DOMRect | null>(null);
  const [host, setHost] = useState<DOMRect | null>(null);
  const [lift, setLift] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const find = () => {
      const root = ref.current?.closest('.ui-root');
      const el = root?.querySelector<HTMLElement>(`[data-testid="${UNLOCK_TARGET[p.feature]}"]`);
      const also = p.also ? root?.querySelector<HTMLElement>(`[data-testid="${UNLOCK_TARGET[p.also]}"]`) : null;
      if (el && root) {
        setRect(el.getBoundingClientRect());
        setHost(root.getBoundingClientRect());
        setAlsoRect(also ? also.getBoundingClientRect() : null);
      }
    };
    find();
    const id = setTimeout(find, 350);
    const done = setTimeout(() => p.onDone(), p.also ? 7500 : 6000);
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
  }, [p.feature, p.also]);
  const box = rect && host ? { left: rect.left - host.left, top: rect.top - host.top, width: rect.width, height: rect.height } : null;
  const box2 = alsoRect && host ? { left: alsoRect.left - host.left, top: alsoRect.top - host.top, width: alsoRect.width, height: alsoRect.height } : null;
  // A tall target (the Campaign card) gets the line beside it; a tab or tile above or below.
  const beside = !!box && !!host && box.height > 90 && box.left + box.width + 320 < host.width;
  const above = !beside && !!box && !!host && box.top > host.height / 2;
  // Keep the line off the marked elements (the trophy bar): measured after it lands, then lifted.
  useLayoutEffect(() => {
    const line = lineRef.current;
    const root = ref.current?.closest('.ui-root');
    if (!line || !root || !box) return;
    const lr = line.getBoundingClientRect();
    let up = 0;
    // Lifted past one marked element, the line may land on the next one up (the arena ribbon above the
    // trophy bar, bug hunt 2026-10-01 #19), so the check repeats until the line is clear.
    const avoid = [...root.querySelectorAll<HTMLElement>('[data-unlock-avoid]')].map((el) => el.getBoundingClientRect());
    for (let pass = 0; pass < avoid.length + 1; pass += 1) {
      let moved = false;
      for (const r of avoid) {
        const hit = lr.left < r.right && lr.right > r.left && lr.top - up < r.bottom && lr.bottom - up > r.top;
        if (hit) {
          up = Math.max(up, lr.bottom - r.top + 8);
          moved = true;
        }
      }
      if (!moved) break;
    }
    if (up > 0) setLift((x) => x + up);
  }, [rect?.top, rect?.left, host?.width, host?.height]);
  const ring = (b: { left: number; top: number; width: number; height: number }, k: string) => (
    <>
      <span key={`d${k}`} class="wp-unlock__dim" style={{ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` }} aria-hidden="true" />
      <span key={`r${k}`} class="wp-unlock__ring" style={{ left: `${b.left + b.width / 2}px`, top: `${b.top + b.height / 2}px` }} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 60}deg` }} />
        ))}
      </span>
    </>
  );
  return (
    <div class="wp-unlock" ref={ref} data-testid={`unlock-${p.feature}`} data-feature={p.feature} data-also={p.also ?? undefined}>
      {box ? (
        <>
          {ring(box, 'a')}
          {box2 ? ring(box2, 'b') : null}
          <div
            ref={lineRef}
            class={`wp-unlock__line${above ? ' is-above' : ''}${beside ? ' is-beside' : ''}`}
            style={
              beside
                ? { left: `${box.left + box.width + 14}px`, top: `${box.top + box.height / 2 - lift}px` }
                : {
                    left: `${Math.max(12, Math.min((host?.width ?? 800) - 352, box.left + box.width / 2 - 150))}px`,
                    top: above ? `${box.top - 12 - lift}px` : `${box.top + box.height + 12 - lift}px`,
                  }
            }
            role="status"
          >
            <span class="wp-unlock__new" data-tag="">
              {t('warPath.ui.unlock.new')}
            </span>
            <span class="wp-unlock__text">{p.also ? t('warPath.ui.unlock.ladderCampaign') : t(`warPath.ui.unlock.${p.feature}`)}</span>
            <Button kind="secondary" size="s" testid="unlock-open" onClick={p.onOpen}>
              {t('warPath.ui.unlock.open')}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
