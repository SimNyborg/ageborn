/**
 * The Flag Atlas (PLAN 2d, owner requests 2026-10-08 items 19/19b): every national flag, bought with
 * Dust at one price, browsed by region with a search, with region rewards that are earned and never
 * sold. Owned by Track D; reached from Customize › Flags and the Profile's flag (route `flagAtlas`,
 * `{ flag?, region? }`), lazy-loaded by `ScreenHost` as its own chunk.
 *
 * - **Layout.** Header: Back, the title, the count ("37/195") and the Dust chip. A bar with the search
 *   (accents, aliases and ISO codes; results as you type, from every region) and the region chips with
 *   their counts. The grid: a section per region with its count, bar and reward. The detail: a sheet
 *   from the right over a third of the screen on phones (the grid stays usable beside it, so it is never
 *   a panel on a panel), docked on the right on wide screens.
 * - **One primary** in the detail: Claim (the save's first flag, no Dust), Buy · 500 (two taps, the
 *   first shows the balance after), Need N more (explains where Dust comes from), Fly this flag (gold),
 *   or Flying ✓. A purchase cannot be undone; the two taps and the 600 ms re-arm guard it (U14).
 * - **After a purchase** the Dust rolls down, the flag unfurls with a stamp, the tile pops and the region
 *   bar ticks; a completed region (or all 195) reveals its reward card (pre-decided, nothing random).
 * - **Honest.** Every unowned flag shows its price; nothing is timed, random or sold for money. No string
 *   claims anything is "free" (the copy review's Pillar 4): the first flag "costs no Dust".
 * - **Motion** uses the tokens; reduce motion stills the cloth and turns the moves into fades.
 * Strings live in `src/i18n/flags.en.json` (`cosmetic.flagAtlas.*`, regions `cosmetic.flagRegion.*`).
 */
import './flagAtlas.css';
import { countDuration } from '@/core/motion';
import { flagRegionNameKey, titleNameKey } from '@/content/keys';
import type { FlagRegion } from '@/content/types';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Button, IconButton } from '../../components/Button';
import { useConfirmSpend } from '../../components/confirm';
import { CosmeticImage, useCosmeticImage, useFlagAtlasReady } from '../../components/cosmeticArt';
import { formatInt } from '../../components/format';
import { haptic } from '../../components/haptics';
import { CheckIcon, CloseIcon, DustIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { findItem } from '../model/cosmetics';
import { atlasAction, atlasFlags, atlasSections, newRewards, type AtlasFlag, type RegionFilter } from './model';
import type { FlagAtlasInfo } from './types';
import { WavingFlag } from './WavingFlag';

/** The reward reveal waits for the purchase moment to land (the unfurl settles in about 0.8 s). */
const REVEAL_AFTER_MS = 850;

/** The OS preference for reduced motion. */
function osReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** The game's or the OS's "reduce motion" (the cloth then stands still). */
function useStill(): boolean {
  const { save } = useUi();
  return save.value.settings.reduceMotion || osReducedMotion();
}

function GlobeGlyph(p: { size?: number }) {
  const s = p.size ?? 18;
  return (
    <svg class="fa-globe" viewBox="0 0 24 24" width={s} height={s} aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" fill="#3f8fc4" stroke="#19394e" stroke-width="1.8" />
      <path d="M7.2 6.4c1.8.4 2.4 1.6 1.6 2.8-.9 1.3.6 2.3 2 2.1 1.6-.2 2 1.6 1 2.9-.8 1 .2 2.6 1.4 3.4M14.8 4.6c-.6 1.3.4 2.2 1.7 2.1 1.6-.1 2.6 1 2.3 2.6" fill="none" stroke="#7fa04a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M6.4 8.6a7 7 0 0 1 5-4.4" fill="none" stroke="#e8f7ff" stroke-width="1.4" stroke-linecap="round" opacity="0.8" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="2.6" />
      <path d="M15.2 15.2l5 5" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

/** A number that rolls to its new value (MR-20: `out` easing over the count token for the change), then bumps. */
function useRolling(value: number, still: boolean): { shown: number; bump: boolean } {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (shown === value) return undefined;
    if (still || typeof requestAnimationFrame !== 'function') {
      setShown(value);
      return undefined;
    }
    const from = shown;
    const t0 = performance.now();
    const dur = countDuration(value - from);
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const step = (now: number): void => {
      const k = Math.min(1, (now - t0) / dur);
      setShown(Math.round(from + (value - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        setBump(true);
        timer = setTimeout(() => setBump(false), 260);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      setShown(value);
    };
  }, [value]);
  return { shown, bump };
}

/** The Dust chip of the header; its number rolls to a new balance instead of jumping. */
function DustCounter(p: { value: number; still: boolean }) {
  const { t, locale } = useUi();
  const { shown, bump } = useRolling(p.value, p.still);
  return (
    <span class={`ui-chip ui-chip--dust ui-chip--compact fa-dust${bump ? ' is-pop' : ''}`} data-testid="atlas-dust" title={t('ui.currency.dust')}>
      <span class="ui-chip__icon">
        <DustIcon size={22} />
      </span>
      <span class="ui-chip__value ui-num" aria-label={`${t('ui.currency.dust')}: ${formatInt(p.value, locale)}`}>
        {formatInt(shown, locale)}
      </span>
    </span>
  );
}

/** A thin progress bar (owned of total) for chips and section heads. */
function Bar(p: { owned: number; total: number; done?: boolean }) {
  const pct = p.total > 0 ? Math.round((p.owned * 100) / p.total) : 0;
  return (
    <span class={`fa-bar${p.done ? ' is-done' : ''}`} aria-hidden="true">
      <i style={{ transform: `scaleX(${pct / 100})` }} />
    </span>
  );
}

/** Flags that are not rectangles (Nepal's double pennon): the cloth's fold bands and edge would show on the clear parts. */
const SHAPED = new Set(['np']);

/** A name that needs the smaller type and a third line on a tile ("Saint Vincent and the Grenadines", "Liechtenstein"). */
function longName(name: string): boolean {
  return name.length > 15 || name.split(/[\s-]+/).some((w) => w.length > 9);
}

function FlagTile(p: { flag: AtlasFlag; url: string | null; pending: boolean; selected: boolean; price: number; pop: boolean; index: number; onPick: (el: HTMLElement) => void }) {
  const { t, locale } = useUi();
  const f = p.flag;
  const name = t(f.item.nameKey);
  const shortKey = `cosmetic.nationalFlag.${f.item.id}.short`;
  const short = t(shortKey);
  const label = short === shortKey ? name : short;
  const state = f.equipped ? t('cosmetic.flagAtlas.flying') : f.owned ? t('cosmetic.flagAtlas.owned') : p.price > 0 ? t('cosmetic.flagAtlas.buy', { n: formatInt(p.price, locale) }) : t('cosmetic.flagAtlas.claim');
  return (
    <button
      type="button"
      class={`fa-tile${f.owned ? ' is-owned' : ''}${f.equipped ? ' is-flying' : ''}${p.selected ? ' is-selected' : ''}${p.pop ? ' is-pop' : ''}`}
      style={`--i:${Math.min(p.index, 24)}`}
      data-testid={`flag-${f.item.id}`}
      data-owned={f.owned ? '' : undefined}
      aria-pressed={p.selected}
      aria-label={`${name}, ${state}`}
      onClick={(e) => p.onPick(e.currentTarget as HTMLElement)}
    >
      <span class={`fa-tile__cloth${p.pending ? ' is-pending' : ''}${SHAPED.has(f.item.id) ? ' is-shaped' : ''}`}>
        {p.url ? <img src={p.url} alt="" draggable={false} loading="lazy" decoding="async" /> : null}
      </span>
      <span class={`fa-tile__name${longName(label) ? ' is-long' : ''}`} data-clip-check="">
        {label}
      </span>
      {!f.owned && p.price > 0 ? (
        <span class="fa-tile__price ui-num" aria-hidden="true">
          <DustIcon size={13} />
          {formatInt(p.price, locale)}
        </span>
      ) : null}
      {f.equipped ? (
        <span class="fa-tile__check" aria-hidden="true">
          <CheckIcon size={14} />
        </span>
      ) : null}
    </button>
  );
}

/** A region's reward as a small base flag picture on the team colour, with its state. */
function RewardThumb(p: { reward: string; owned: boolean; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span class={`fa-reward fa-reward--${p.size ?? 'sm'}${p.owned ? ' is-owned' : ''}`} aria-hidden="true">
      <CosmeticImage item={p.reward} team={0x2f7df6} animate={false} />
      {p.owned ? (
        <span class="fa-reward__check">
          <CheckIcon size={12} />
        </span>
      ) : null}
    </span>
  );
}

function SectionHead(p: { region: FlagRegion; atlas: FlagAtlasInfo }) {
  const { t, locale, content } = useUi();
  const info = p.atlas.regions.find((r) => r.region === p.region);
  if (!info) return null;
  const done = info.total > 0 && info.owned >= info.total;
  const reward = info.reward ? findItem(content, info.reward) : undefined;
  return (
    <header class={`fa-sec__head${done ? ' is-done' : ''}`} data-testid={`atlas-head-${p.region}`}>
      <h2 class="fa-sec__title">{t(flagRegionNameKey(p.region))}</h2>
      <span class="fa-sec__count ui-num">{t('ui.common.progress', { n: formatInt(info.owned, locale), max: formatInt(info.total, locale) })}</span>
      <Bar owned={info.owned} total={info.total} done={done} />
      {reward && info.reward ? (
        <span class="fa-sec__reward" data-testid={`atlas-reward-${p.region}`}>
          <RewardThumb reward={info.reward} owned={info.rewardOwned} />
          <span class="fa-sec__reward-text">{info.rewardOwned ? t('cosmetic.flagAtlas.rewardOwned', { reward: t(reward.nameKey) }) : t(reward.nameKey)}</span>
        </span>
      ) : p.region === 'other' ? (
        <span class="fa-sec__note">{t('cosmetic.flagAtlas.otherNote', { n: formatInt(p.atlas.world?.count ?? p.atlas.total, locale) })}</span>
      ) : null}
    </header>
  );
}

/** The detail of the chosen flag: the waving flag, its name and region, its region's progress and the one primary. */
function FlagDetail(p: {
  flag: AtlasFlag;
  atlas: FlagAtlasInfo;
  dust: number;
  still: boolean;
  unfurl: number;
  onBuy: () => boolean;
  onFly: () => void;
  onClose: () => void;
}) {
  const { t, locale, content, sound } = useUi();
  const art = useCosmeticImage();
  const f = p.flag;
  const name = t(f.item.nameKey);
  const action = atlasAction(f, p.atlas.price, p.dust);
  const [help, setHelp] = useState(false);
  const btnRef = useRef<HTMLSpanElement | null>(null);
  const spend = useConfirmSpend({ onArm: () => sound?.('ui_toggle') });
  spend.ref.current = btnRef.current;
  useEffect(() => {
    setHelp(false);
    spend.disarm();
  }, [f.key]);
  const info = p.atlas.regions.find((r) => r.region === f.region);
  const reward = info?.reward ? findItem(content, info.reward) : undefined;
  const big = art ? art(f.key, { size: 'big' }) : null;

  let primary: ComponentChildren;
  switch (action.kind) {
    case 'flying':
      primary = (
        <span class="fa-flying" data-testid="atlas-flying">
          <CheckIcon size={22} /> {t('cosmetic.flagAtlas.flying')}
        </span>
      );
      break;
    case 'fly':
      primary = (
        <Button kind="primary" size="l" wide testid="atlas-fly" onClick={() => p.onFly()}>
          {t('cosmetic.flagAtlas.fly')}
        </Button>
      );
      break;
    case 'need':
      primary = (
        <Button
          kind="progress"
          size="l"
          wide
          disabled
          onDenied={() => setHelp(true)}
          icon={<DustIcon size={22} />}
          testid="atlas-need"
        >
          {t('cosmetic.flagAtlas.need', { n: formatInt(action.missing, locale) })}
        </Button>
      );
      break;
    case 'claim':
    case 'buy': {
      const claim = action.kind === 'claim';
      primary = (
        <span ref={btnRef} class="fa-action">
          <Button
            kind={claim ? 'primary' : 'progress'}
            size="l"
            wide
            primary
            disabled={spend.cooling}
            class={spend.armed ? 'is-armed' : ''}
            icon={claim ? undefined : <DustIcon size={22} />}
            testid={claim ? 'atlas-claim' : 'atlas-buy'}
            sound={null}
            onClick={() => spend.press(p.onBuy)}
          >
            <span key={spend.armed ? 'armed' : 'idle'}>
              {claim
                ? spend.armed
                  ? t('cosmetic.flagAtlas.confirmClaim')
                  : t('cosmetic.flagAtlas.claim')
                : spend.armed
                  ? t('cosmetic.flagAtlas.confirm', { n: formatInt(action.price, locale) })
                  : t('cosmetic.flagAtlas.buy', { n: formatInt(action.price, locale) })}
            </span>
            <small class="ui-btn__sub">
              {claim ? (
                spend.armed ? (
                  t('cosmetic.flagAtlas.confirmClaimSub', { n: formatInt(content.cosmetics.collections.drops.flagDust, locale) })
                ) : (
                  t('cosmetic.flagAtlas.claimSub')
                )
              ) : (
                <span class="fa-after ui-num">
                  <DustIcon size={13} /> {formatInt(p.dust, locale)} → <DustIcon size={13} /> {formatInt(action.after, locale)}
                </span>
              )}
            </small>
          </Button>
        </span>
      );
      break;
    }
  }

  return (
    <div class={`fa-detail${help ? ' has-help' : ''}`} data-testid="atlas-detail" data-flag={f.key} data-action={action.kind}>
      <div class="fa-detail__stage">
        <WavingFlag src={big} still={p.still} unfurl={p.unfurl} label={name} testid="atlas-big-flag" />
      </div>
      <div class="fa-detail__text">
        <h2 class="fa-detail__name" data-clip-check="">
          {name}
        </h2>
        <p class="fa-detail__meta">
          <span>{t(flagRegionNameKey(f.region))}</span>
          {f.equipped ? null : f.owned ? (
            <span class="fa-detail__owned">
              <CheckIcon size={14} /> {t('cosmetic.flagAtlas.owned')}
            </span>
          ) : null}
        </p>
        {info && info.region !== 'other' ? (
          <p class="fa-detail__region">
            <Bar owned={info.owned} total={info.total} done={info.owned >= info.total} />
            <span class="ui-num">{t('ui.common.progress', { n: formatInt(info.owned, locale), max: formatInt(info.total, locale) })}</span>
            {reward && info.reward ? <RewardThumb reward={info.reward} owned={info.rewardOwned} /> : null}
          </p>
        ) : null}
      </div>
      {help ? (
        <p class="fa-detail__help" role="status" data-testid="atlas-dust-help">
          <DustIcon size={16} /> {t('cosmetic.flagAtlas.dustHelp')}
        </p>
      ) : null}
      <div class="fa-detail__action">{primary}</div>
      {reward && info?.reward ? (
        <div class={`fa-detail__reward${info.rewardOwned ? ' is-owned' : ''}`} data-testid="atlas-detail-reward">
          <RewardThumb reward={info.reward} owned={info.rewardOwned} size="md" />
          <span class="fa-detail__reward-text">
            <small>{t('cosmetic.flagAtlas.regionReward')}</small>
            <b>{t(reward.nameKey)}</b>
            <em>
              {info.rewardOwned
                ? t('cosmetic.flagAtlas.rewardEarned')
                : t('cosmetic.flagAtlas.regionRewardHow', { n: formatInt(info.total, locale), region: t(flagRegionNameKey(f.region)) })}
            </em>
          </span>
        </div>
      ) : null}
      <IconButton icon={<CloseIcon size={22} />} label={t('ui.common.close')} onClick={p.onClose} testid="atlas-close" class="fa-detail__close" />
    </div>
  );
}

/** The completed region's (or all 195 flags') reward card, revealed after the purchase that earned it. */
function RewardReveal(p: { item: { kind: 'region'; region: FlagRegion; reward: string } | { kind: 'world'; reward: string | null; title: string | null }; count: number; onDone: () => void }) {
  const { t, locale, content } = useUi();
  const it = p.item;
  const reward = it.reward ? findItem(content, it.reward) : undefined;
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      class="fa-reveal"
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fa-reveal-title"
      data-testid="atlas-reveal"
      onClick={p.onDone}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          p.onDone();
        }
      }}
    >
      <div class="fa-reveal__card">
        <span class="fa-reveal__rays" aria-hidden="true" />
        <h2 class="fa-reveal__title" id="fa-reveal-title">
          {it.kind === 'region' ? t('cosmetic.flagAtlas.regionDone', { region: t(flagRegionNameKey(it.region)) }) : t('cosmetic.flagAtlas.worldDone', { n: formatInt(p.count, locale) })}
        </h2>
        {it.reward ? <RewardThumb reward={it.reward} owned={false} size="lg" /> : null}
        {reward ? (
          <p class="fa-reveal__line">
            <small>{t('cosmetic.flagAtlas.rewardNew')}</small>
            <b>{t(reward.nameKey)}</b>
          </p>
        ) : null}
        {it.kind === 'world' && it.title ? (
          <p class="fa-reveal__line">
            <small>{t('cosmetic.flagAtlas.titleNew')}</small>
            <b>{t(titleNameKey(it.title))}</b>
          </p>
        ) : null}
        <span class="fa-reveal__tap">{t('cosmetic.flagAtlas.tapToContinue')}</span>
      </div>
    </div>
  );
}

export function FlagAtlasScreen(p: { route: RouteOf<'flagAtlas'> }) {
  const { t, locale, router, services, save, content, sound, toasts } = useUi();
  const art = useCosmeticImage();
  // the grid waits for the one flag atlas (soft placeholders meanwhile), then shows its cells
  const ready = useFlagAtlasReady(art);
  const still = useStill();
  const s = save.value;
  const atlas = services.flagAtlasProgress();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RegionFilter>(p.route.region ?? 'all');
  const [selected, setSelected] = useState<string | null>(p.route.flag ?? null);
  const [pop, setPop] = useState<string | null>(null);
  const [unfurl, setUnfurl] = useState(0);
  const [reveals, setReveals] = useState<ReturnType<typeof newRewards>>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The "… is flying · Undo" toast, closed when another flag is picked (review 1: it covered the detail). */
  const flyToast = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );
  const searching = query.trim() !== '';
  const keys = useMemo(() => services.searchFlags(query), [query, services]);
  const flags = atlasFlags(s, content, keys, atlas.equipped);
  const sections = atlasSections(flags, atlas, filter, searching);
  const chosen = selected ? (atlasFlags(s, content, [selected], atlas.equipped)[0] ?? null) : null;

  // a flag or a region passed in (the Profile's flag, Customize): bring it into view once
  useEffect(() => {
    if (p.route.flag) {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-testid="flag-${p.route.flag.slice('nationalFlag.'.length)}"]`);
      el?.scrollIntoView?.({ block: 'center' });
    }
    if (p.route.region) {
      const chip = scrollRef.current?.parentElement?.querySelector<HTMLElement>(`[data-testid="atlas-chip-${p.route.region}"]`);
      chip?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
    }
  }, []);

  // The active region chip stays in view (review 1: on phones the sheet's opening narrows the chip row and
  // left the active chip half cut off): after a region is picked, and once the sheet has opened or closed.
  const chipsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const row = chipsRef.current;
    if (!row || typeof window === 'undefined') return undefined;
    const reveal = (): void => {
      const chip = row.querySelector<HTMLElement>('.fa-chip.is-on');
      if (!chip || typeof row.scrollTo !== 'function') return;
      const fade = 32; // the row's right edge fades out over 28 px
      const box = row.getBoundingClientRect();
      const c = chip.getBoundingClientRect();
      const left = c.left - box.left + row.scrollLeft;
      const right = left + c.width;
      const want = right > row.scrollLeft + row.clientWidth - fade ? right - row.clientWidth + fade : left < row.scrollLeft ? Math.max(0, left - 8) : null;
      if (want !== null) row.scrollTo({ left: want, behavior: still ? 'auto' : 'smooth' });
    };
    // the sheet's opening animates the row's width (medium duration): measure after it settles
    const id = setTimeout(reveal, still ? 0 : 320);
    return () => clearTimeout(id);
  }, [filter, !!chosen]);

  // Escape closes the sheet before the screen
  useEffect(() => {
    if (!selected || typeof document === 'undefined') return undefined;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || reveals.length > 0) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected(null);
    };
    document.addEventListener('keydown', key, true);
    return () => document.removeEventListener('keydown', key, true);
  }, [selected, reveals.length]);

  // the Undo toast belongs to the flag it flew: picking another flag (or closing the sheet) closes it
  useEffect(() => {
    if (flyToast.current === null) return;
    toasts.dismiss(flyToast.current);
    flyToast.current = null;
  }, [selected]);

  const pick = (f: AtlasFlag): void => {
    if (selected === f.key) return;
    sound?.(selected ? 'ui_click' : 'ui_sheet');
    setSelected(f.key);
  };

  const buy = (): boolean => {
    if (!chosen) return false;
    const before = services.flagAtlasProgress();
    const r = services.buyNationalFlag(chosen.key);
    if (!r.ok) {
      sound?.('ui_deny');
      toasts.show(t('cosmetic.flagAtlas.needReason'), { tone: 'bad' });
      return false;
    }
    sound?.('ui_stamp');
    haptic('thump');
    setPop(chosen.key);
    setUnfurl((n) => n + 1);
    const won = newRewards(before, services.flagAtlasProgress());
    if (won.length > 0) {
      // the purchase lands first (the unfurl, the stamp, the Dust roll), then the reward: medium moments
      // queue and never overlap (ui-plan 5.3)
      const show = (): void => {
        setReveals(won);
        sound?.('ui_unlock');
      };
      if (still || typeof setTimeout !== 'function' || typeof requestAnimationFrame !== 'function') show();
      else revealTimer.current = setTimeout(show, REVEAL_AFTER_MS);
    }
    return true;
  };

  const fly = (): void => {
    if (!chosen) return;
    const before = atlas.equipped;
    const r = services.equipCosmetic({ slot: 'nationalFlag', key: chosen.key });
    if (!r.ok) {
      sound?.('ui_deny');
      return;
    }
    sound?.('ui_stamp');
    setPop(chosen.key);
    setUnfurl((n) => n + 1);
    // in the screen's usual toast place (as every Customize equip), never over the detail's name,
    // region and progress (review 1); the "Flying" state in the detail is the feedback at the button
    if (flyToast.current !== null) toasts.dismiss(flyToast.current);
    flyToast.current = toasts.show(t('cosmetic.flagAtlas.flyingToast', { name: t(chosen.item.nameKey) }), {
      tone: 'good',
      undo: () => {
        services.equipCosmetic({ slot: 'nationalFlag', key: before });
      },
    });
  };

  // the pop on a bought or flown tile plays once
  useEffect(() => {
    if (!pop) return undefined;
    const id = setTimeout(() => setPop(null), 700);
    return () => clearTimeout(id);
  }, [pop, unfurl]);

  const allDone = atlas.total > 0 && atlas.owned >= atlas.total;
  let index = 0;

  return (
    <ScreenFrame
      id="flagAtlas"
      title={t('cosmetic.flagAtlas.title')}
      onBack={() => router.back()}
      class={`fa-screen${chosen ? ' fa-screen--sheet' : ''}`}
      subtitle={
        <span class={`fa-count${allDone ? ' is-done' : ''}`} data-testid="atlas-count">
          <GlobeGlyph size={18} />
          <span class="ui-num">{t('ui.common.progress', { n: formatInt(atlas.owned, locale), max: formatInt(atlas.total, locale) })}</span>
        </span>
      }
      right={<DustCounter value={s.currencies.dust} still={still} />}
    >
      <div class={`fa${chosen ? ' has-sheet' : ''}${ready ? ' is-ready' : ''}`} data-testid="flag-atlas" data-flag={chosen?.key ?? ''} data-region={filter}>
        <div class="fa-main">
          <div class="fa-tools">
            <label class={`fa-search${searching ? ' is-on' : ''}`}>
              <SearchGlyph />
              <input
                type="search"
                class="fa-search__input"
                value={query}
                placeholder={t('cosmetic.flagAtlas.search')}
                aria-label={t('cosmetic.flagAtlas.searchLabel')}
                autocomplete="off"
                spellcheck={false}
                data-testid="atlas-search"
                onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && query) {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuery('');
                  }
                }}
              />
              {query ? (
                <button
                  type="button"
                  class="fa-search__clear"
                  aria-label={t('cosmetic.flagAtlas.clearSearch')}
                  data-testid="atlas-search-clear"
                  onClick={() => {
                    setQuery('');
                    sound?.('ui_click');
                  }}
                >
                  <CloseIcon size={18} />
                </button>
              ) : null}
            </label>
            <div class="fa-chips" ref={chipsRef} role="group" aria-label={t('cosmetic.flagAtlas.title')}>
              {(['all', ...atlas.regions.map((r) => r.region)] as RegionFilter[]).map((r) => {
                const info = r === 'all' ? { owned: atlas.owned, total: atlas.total } : atlas.regions.find((x) => x.region === r)!;
                const on = filter === r && !searching;
                const done = info.total > 0 && info.owned >= info.total;
                return (
                  <button
                    key={r}
                    type="button"
                    class={`fa-chip${on ? ' is-on' : ''}${done ? ' is-done' : ''}`}
                    aria-pressed={on}
                    data-testid={`atlas-chip-${r}`}
                    onClick={() => {
                      setFilter(r);
                      setQuery('');
                      sound?.('ui_tab');
                      scrollRef.current?.scrollTo?.({ top: 0 });
                    }}
                  >
                    <span class="fa-chip__name">{r === 'all' ? t('cosmetic.flagAtlas.all') : t(flagRegionNameKey(r))}</span>
                    <span class="fa-chip__count ui-num">{done ? <CheckIcon size={13} /> : null}{t('ui.common.progress', { n: formatInt(info.owned, locale), max: formatInt(info.total, locale) })}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div class="fa-scroll" ref={scrollRef} data-scroll="">
            {atlas.price === 0 && !searching ? (
              <p class="fa-first" data-testid="atlas-first">
                <span class="fa-first__flag" aria-hidden="true" />
                {t('cosmetic.flagAtlas.firstFlag')}
              </p>
            ) : null}
            {searching && flags.length > 0 ? (
              <p class="fa-results" data-testid="atlas-results">
                {t('cosmetic.flagAtlas.results', { n: formatInt(flags.length, locale) })}
              </p>
            ) : null}
            {sections.map((sec) => (
              <section class="fa-sec" key={sec.region ?? 'results'} data-testid={`atlas-sec-${sec.region ?? 'results'}`}>
                {sec.region ? <SectionHead region={sec.region} atlas={atlas} /> : null}
                <div class="fa-grid">
                  {sec.flags.map((f) => (
                    <FlagTile
                      key={f.key}
                      flag={f}
                      index={index++}
                      url={ready && art ? art(f.key, { size: 'tile' }) : null}
                      pending={!ready}
                      selected={chosen?.key === f.key}
                      price={atlas.price}
                      pop={pop === f.key}
                      onPick={() => pick(f)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {flags.length === 0 ? (
              <div class="fa-empty" data-testid="atlas-empty">
                <GlobeGlyph size={40} />
                <p>{t('cosmetic.flagAtlas.noResults', { q: query.trim() })}</p>
                <small>{t('cosmetic.flagAtlas.noResultsHint')}</small>
              </div>
            ) : null}
            {!searching && atlas.world?.reward ? <WorldReward atlas={atlas} /> : null}
          </div>
        </div>
        <aside class={`fa-sheet${chosen ? ' is-open' : ''}`} aria-label={t('cosmetic.flagAtlas.detail')} data-testid="atlas-sheet">
          {chosen ? (
            <FlagDetail flag={chosen} atlas={atlas} dust={s.currencies.dust} still={still} unfurl={unfurl} onBuy={buy} onFly={fly} onClose={() => setSelected(null)} />
          ) : (
            <div class="fa-detail fa-detail--idle" data-testid="atlas-idle">
              <GlobeGlyph size={56} />
              <p>{t('cosmetic.flagAtlas.pick')}</p>
              <small>{t('cosmetic.flagAtlas.price', { n: formatInt(content.cosmetics.collections.drops.flagDust, locale) })}</small>
            </div>
          )}
        </aside>
      </div>
      {reveals[0] ? <RewardReveal item={reveals[0]} count={atlas.world?.count ?? atlas.total} onDone={() => setReveals((r) => r.slice(1))} /> : null}
    </ScreenFrame>
  );
}

/** The reward for all 195 flags, at the foot of the grid: the World Compass and the World Ambassador title. */
function WorldReward(p: { atlas: FlagAtlasInfo }) {
  const { t, locale, content } = useUi();
  const w = p.atlas.world;
  if (!w?.reward) return null;
  const item = findItem(content, w.reward);
  return (
    <div class={`fa-world${w.rewardOwned ? ' is-owned' : ''}`} data-testid="atlas-world">
      <RewardThumb reward={w.reward} owned={w.rewardOwned} size="lg" />
      <p>
        {t('cosmetic.flagAtlas.worldReward', {
          n: formatInt(w.count, locale),
          reward: item ? t(item.nameKey) : '',
          title: w.title ? t(titleNameKey(w.title)) : '',
        })}
      </p>
      <span class="ui-num">{t('ui.common.progress', { n: formatInt(p.atlas.owned, locale), max: formatInt(w.count, locale) })}</span>
    </div>
  );
}
