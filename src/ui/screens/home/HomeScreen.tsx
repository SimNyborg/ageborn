/**
 * Home is the War Path map (S2, ui-plan 2.3, 4.1, 6.4). The map is the screen; everything else is a
 * thin frame around it:
 *
 * - **Top bar** (transparent over the map with a scrim): the profile chip, the region and level
 *   ("Stone Age · Level 4 of 10"), the Amber and Dust chips once earned (tap = info, first-seen
 *   caption), the gear.
 * - **Map** (`WarPathMap`): the road, the nodes, the banner-bearer; a node opens the Level preview.
 * - **Level plate** above Play: the General with the AI badge, the level name and the first-clear
 *   reward (the best stars once beaten). It steps aside while the player pans.
 * - **Play** (gold, XL, bottom-right, the only primary and the one pulse): always the next War Path
 *   level, one tap (U2). **Modes** (slate) left of it once open (level 3). The five tabs are the
 *   shell's bottom bar (`ScreenHost` shell), hidden on the first launch.
 *
 * Ceremonies (U12, U13; Play or a tap finishes them at once): MR-41 level complete (stars stamp in,
 * the road draws to the next node, it drops in, the banner-bearer marches), MR-42 for a boss (the
 * gate opens, the camera pans into the new region, its name drops), then MR-40 for a feature that
 * just opened (the tab or tile glows free of its padlock with one line and "Open").
 */
import './home.css';
import '../warPath/warPath.css';
import type { WarPathUnlock } from '@/content/types';
import type { WarPathDifficulty } from '@/contracts';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { AiBadge, CurrencyChip } from '../../components/Chips';
import { formatInt } from '../../components/format';
import { haptic } from '../../components/haptics';
import { AmberIcon, CapsuleIcon, CardsIcon, GearIcon, StarIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
import { tierCrests } from '../../components/capsuleLook';
import { useKit } from '../../components/kit';
import { blockingOverlays } from '../../components/overlay';
import type { MatchRequest, RouteOf, TabId } from '../../router';
import { useUi } from '../context';
import {
  currentLevelId,
  featureOpen,
  levelNameKey,
  mapNodes,
  mapRegions,
  pendingUnlock,
  playLevelId,
  playTarget,
  progressOf,
  regionNameKey,
  unlockFlag,
  type MapNode,
} from '../model/warPath';
import { useMatchStarter } from '../shared/MatchStarter';
import { LevelSheet } from '../warPath/LevelSheet';
import { ModesSheet } from '../warPath/ModesSheet';
import { TAB_ROOTS } from '../warPath/shell';
import { WarPathMap, type MapShow, type WarPathMapHandle } from '../warPath/WarPathMap';
import { CurrencyInfo } from './parts';

// ---------------------------------------------------------------------------------------------
// Ceremony bookkeeping: what the map showed last (session memory; a reload shows no ceremony)
// ---------------------------------------------------------------------------------------------

let seenStars: Record<string, number> | null = null;

/** Sets what the map last showed (dev pages and tests prime a ceremony with it; null forgets). */
export function primeWarPathSeen(stars: Record<string, number> | null): void {
  seenStars = stars ? { ...stars } : null;
}

interface Ceremony {
  id: string;
  i: number;
  from: number;
  to: number;
  /** First clear: the road draws on and the next node drops in. */
  clear: boolean;
  next: string | null;
  /** A boss: the next region opens (MR-42). */
  region: number | null;
}

function takeCeremony(stars: Record<string, number>, order: readonly string[], levels: Record<string, { role: string; region: string }>, regionIndex: (age: string) => number): Ceremony | null {
  if (!seenStars) {
    seenStars = { ...stars };
    return null;
  }
  const prev = seenStars;
  seenStars = { ...stars };
  const id = order.find((x) => (stars[x] ?? 0) > (prev[x] ?? 0));
  if (!id) return null;
  const i = order.indexOf(id);
  const clear = !(prev[id] ?? 0);
  const next = order[i + 1] ?? null;
  const lv = levels[id]!;
  const ri = regionIndex(lv.region);
  return { id, i, from: prev[id] ?? 0, to: stars[id] ?? 0, clear, next: clear ? next : null, region: clear && lv.role === 'boss' && next ? ri + 1 : null };
}

type Phase = 'focus' | 'stamp' | 'draw' | 'drop' | 'region' | 'done';

/** MR-41 / MR-42 timings (ms). */
const T_FOCUS = 300;
const T_STAR = 200;
const T_STAMP_HOLD = 220;
const T_DRAW = 450;
const T_DROP = 300;
const T_REGION = 1900;

// ---------------------------------------------------------------------------------------------

const UNLOCK_TARGET: Readonly<Record<WarPathUnlock, string>> = {
  army: 'tab-army',
  capsules: 'tab-capsules',
  modes: 'home-modes',
  customize: 'tab-customize',
  progress: 'tab-progress',
  ladder: 'home-modes',
  daily: 'home-modes',
};

const UNLOCK_TAB: Readonly<Partial<Record<WarPathUnlock, TabId>>> = { army: 'army', capsules: 'capsules', customize: 'customize', progress: 'progress' };

/** Android: the first Play of a session asks for full screen (ui-plan 3.1); failures are silent. */
let fullscreenAsked = false;
function askFullscreen(): void {
  if (fullscreenAsked || typeof document === 'undefined') return;
  fullscreenAsked = true;
  try {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (!coarse || ios || document.fullscreenElement) return;
    const p = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    void p
      ?.then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
      .catch(() => undefined);
  } catch {
    /* not allowed here */
  }
}

export function HomeScreen(_p: { route: RouteOf<'home'> }) {
  const { save, content, t, router, services, locale } = useUi();
  const kit = useKit();
  const s = save.value;
  const wp = progressOf(s);
  const reduce = s.settings.reduceMotion;

  // The map is the War Path tab's root (2.2); a reset to Home after a flow keeps the tab shell.
  useLayoutEffect(() => {
    if (router.tab.peek() !== 'warPath' && router.stack.peek().length === 1) router.adoptTab('warPath');
  }, []);

  const nodes = useMemo(() => mapNodes(s, content), [wp, content]);
  const regions = useMemo(() => mapRegions(s, content), [wp, content]);
  const order = content.warPath.order;
  const playId = playLevelId(s, content);
  const playIndex = order.indexOf(playId);
  const playNode = nodes[playIndex]!;
  const firstLaunch = currentLevelId(s, content) === order[0] && !wp.legacy;
  const armyOpen = featureOpen(s, content, 'army');
  const modesOpen = featureOpen(s, content, 'modes');

  // ---- ceremonies -----------------------------------------------------------------------------
  const [cer] = useState<Ceremony | null>(() =>
    takeCeremony(wp.stars, order, content.warPath.levels, (age) => content.warPath.regions.findIndex((r) => r.age === age)),
  );
  const [phase, setPhase] = useState<Phase>(cer ? 'focus' : 'done');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const map = useRef<WarPathMapHandle | null>(null);

  // An app overlay on top (the first forced upgrade, the age dialog) holds every Home moment and
  // takes Home's primary and pulse away until it closes (U1, U11, U13).
  const covered = blockingOverlays.value > 0;
  const started = useRef(false);
  useEffect(() => {
    if (!cer || covered || started.current) return;
    started.current = true;
    if (reduce) {
      // U14: the stars fade in and the road appears whole, without movement.
      setPhase('stamp');
      timers.current.push(setTimeout(() => setPhase('done'), 600));
      return;
    }
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    let tm = 0;
    map.current?.panTo(cer.i, T_FOCUS);
    tm += T_FOCUS;
    at(tm, () => {
      setPhase('stamp');
      for (let k = cer.from + 1; k <= cer.to; k++) {
        const d = (k - cer.from - 1) * T_STAR;
        at(tm + d + 140, () => {
          kit.sound?.('star_stamp');
          haptic('tick');
        });
      }
    });
    tm += (cer.to - cer.from - 1) * T_STAR + T_STAMP_HOLD + 160;
    if (cer.clear && cer.next) {
      at(tm, () => {
        setPhase('draw');
        kit.sound?.('path_draw');
        map.current?.panTo(cer.i + 1, T_DRAW);
      });
      tm += T_DRAW;
      at(tm, () => {
        setPhase('drop');
        kit.sound?.('node_drop');
        haptic('thump');
      });
      tm += T_DROP;
      if (cer.region !== null) {
        at(tm, () => {
          setPhase('region');
          kit.sound?.('region_open');
          haptic('heavy');
        });
        tm += T_REGION;
      }
    }
    at(tm, () => setPhase('done'));
  }, [covered]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function finishCeremony() {
    if (phase === 'done') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('done');
    map.current?.panTo(playIndex, 0);
  }

  const show: MapShow = useMemo(() => {
    if (!cer || phase === 'done') return {};
    const next = cer.next;
    const beforeDrop = phase === 'focus' || phase === 'stamp' || phase === 'draw';
    return {
      stars: phase === 'focus' ? { [cer.id]: cer.from } : {},
      stamp: phase === 'stamp' ? { id: cer.id, from: cer.from } : null,
      hideOpen: next && beforeDrop ? next : null,
      bearer: phase === 'focus' || phase === 'stamp' ? cer.i : next ? cer.i + 1 : cer.i,
      draw: phase === 'draw' ? cer.i : null,
      drop: phase === 'drop' ? next : null,
      gate: phase === 'region' ? cer.region : null,
    };
  }, [cer, phase]);
  const ceremonyOn = !!cer && phase !== 'done';

  // MR-40: a feature that just opened (after the level ceremony; never for a legacy save).
  const [unlock, setUnlock] = useState<WarPathUnlock | null>(null);
  useEffect(() => {
    if (ceremonyOn || unlock || covered) return;
    const f = pendingUnlock(s, content);
    if (!f) return;
    services.setUiFlags({ [unlockFlag(f)]: true });
    setUnlock(f);
    kit.sound?.('ui_unlock');
  }, [ceremonyOn, wp, covered]);

  // ---- panels and play --------------------------------------------------------------------------
  const [sheet, setSheet] = useState<MapNode | null>(null);
  const [modes, setModes] = useState(false);
  const [panning, setPanning] = useState(false);
  const [launching, setLaunching] = useState(false);
  const starter = useMatchStarter();
  // The road stays between the top bar and the plate (4.1): measure both.
  const topRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState({ top: 44, bottom: 150 });
  useLayoutEffect(() => {
    const measure = () => {
      const top = topRef.current?.getBoundingClientRect();
      const dock = dockRef.current?.getBoundingClientRect();
      const host = dockRef.current?.closest('.ui-screen')?.getBoundingClientRect();
      if (!top || !dock || !host) return;
      const next = { top: Math.round(top.bottom - host.top), bottom: Math.round(host.bottom - dock.top) };
      setInsets((x) => (x.top === next.top && x.bottom === next.bottom ? x : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    if (dockRef.current) ro.observe(dockRef.current);
    if (topRef.current) ro.observe(topRef.current);
    return () => ro.disconnect();
  }, []);

  function requestFor(levelId: string, difficulty: WarPathDifficulty): MatchRequest {
    const target = playTarget(s, content, levelId);
    return target.kind === 'tutorial' ? { mode: 'tutorial', match: target.match } : { mode: 'warPath', level: levelId, difficulty };
  }

  function play(levelId: string, difficulty: WarPathDifficulty = wp.difficulty) {
    finishCeremony();
    setUnlock(null);
    askFullscreen();
    const req = requestFor(levelId, difficulty);
    // MR-15: Play dips and the map leans into the node, then VS.
    if (reduce) {
      starter.start(req);
      return;
    }
    setLaunching(true);
    setTimeout(() => {
      if (!starter.start(req)) setLaunching(false);
    }, 180);
  }

  const next = content.warPath.levels[playId]!;
  const g = content.generals.list[next.general];
  const region = content.warPath.regions.find((r) => r.age === next.region)!;
  const regionLabel = t('warPath.ui.levelOf', { region: t(regionNameKey(next.region)), n: next.index, max: region.levels.length });

  // Keyboard (2.2): Space starts the next level on Home.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.defaultPrevented || sheet || modes) return;
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag)) return;
      e.preventDefault();
      play(playId);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <section
      class={`ui-screen wp-home${ceremonyOn ? ' is-ceremony' : ''}${launching ? ' is-launching' : ''}${armyOpen ? '' : ' is-first'}`}
      data-screen="home"
      data-unlock={unlock ?? undefined}
      aria-label={t('ui.home.title')}
      onClick={ceremonyOn ? finishCeremony : undefined}
    >
      <WarPathMap
        nodes={nodes}
        regions={regions}
        current={playIndex}
        insets={insets}
        show={show}
        handle={(h) => (map.current = h)}
        onPanning={setPanning}
        onNode={(n) => {
          if (ceremonyOn) {
            finishCeremony();
            return;
          }
          kit.sound?.('ui_whoosh');
          setSheet(n);
        }}
      />

      <header class="wp-top" ref={topRef}>
        {armyOpen ? <ProfileChip /> : <span />}
        <span class="wp-top__label" data-testid="home-level-label">
          <span class="wp-top__long" data-clip-check="">
            {regionLabel}
          </span>
          <span class="wp-top__short" data-clip-check="">
            {t('warPath.ui.levelOf', { region: t(`warPath.regionShort.${next.region}`), n: next.index, max: region.levels.length })}
          </span>
        </span>
        {/* One new thing at a time (U8, U13): the first-seen captions wait for the unlock moment. */}
        <TopRight quiet={ceremonyOn || !!unlock || covered || !!pendingUnlock(s, content)} />
      </header>

      {phase === 'region' && cer?.region !== null && cer ? (
        <div class="wp-regionDrop" data-testid="wp-region-drop" aria-live="polite">
          <span class="wp-regionDrop__over">{t('warPath.ui.regionOpen')}</span>
          <span class="wp-regionDrop__name">{t(regionNameKey(content.warPath.regions[cer.region]!.age))}</span>
        </div>
      ) : null}

      <div class="wp-dock" ref={dockRef}>
        {firstLaunch ? (
          <p class="wp-start" data-testid="wp-start">
            {t('warPath.ui.start')}
          </p>
        ) : (
          <button
            type="button"
            class={`wp-plate${unlock ? ' is-away' : panning ? ' is-aside' : ''}`}
            data-testid="level-plate"
            key={playId}
            onClick={() => setSheet(playNode)}
            aria-label={t(levelNameKey(playId))}
          >
            <span class="wp-plate__portrait">
              <GeneralPortrait generalId={next.general} size={40} label={g ? t(g.nameKey) : next.general} />
              <span class="wp-plate__ai">
                <AiBadge size="sm" />
              </span>
            </span>
            <span class="wp-plate__text">
              <span class="wp-plate__name" data-clip-check="">
                {t(levelNameKey(playId))}
              </span>
              <span class="wp-plate__reward">
                {playNode.stars > 0 ? (
                  <>
                    {t('warPath.ui.bestStars')}{' '}
                    {[1, 2, 3].map((k) => (
                      <i key={k} class={`wp-plate__star${k <= playNode.stars ? ' is-on' : ''}`}>
                        <StarIcon size={14} filled={k <= playNode.stars} />
                      </i>
                    ))}
                  </>
                ) : (
                  <>
                    {t('warPath.ui.firstClear')}
                    {next.reward.amber > 0 ? (
                      <b class="ui-num">
                        <AmberIcon size={16} /> {formatInt(next.reward.amber, locale)}
                      </b>
                    ) : null}
                    {next.reward.capsule ? <CapsuleIcon tier={next.reward.capsule} crests={tierCrests(content.capsules, next.reward.capsule)} size={20} /> : null}
                    {next.reward.card ? <CardsIcon size={16} /> : null}
                    {next.reward.amber === 0 && !next.reward.capsule && !next.reward.card ? <CapsuleIcon tier="bronze" size={20} /> : null}
                  </>
                )}
              </span>
            </span>
          </button>
        )}
        <div class="wp-playRow">
          {modesOpen ? (
            <Button kind="secondary" size="xl" class="wp-modes" icon={<SwordsIcon size={24} />} testid="home-modes" onClick={() => setModes(true)}>
              {t('warPath.ui.modes')}
            </Button>
          ) : null}
          <Button
            kind="primary"
            size="xl"
            class="wp-play"
            pulse={!ceremonyOn && !sheet && !modes && !covered}
            primary={!sheet && !modes && !covered}
            testid="play"
            autofocus
            icon={<SwordsIcon size={28} />}
            onClick={(e) => {
              e.stopPropagation();
              play(playId);
            }}
          >
            {t('warPath.ui.play', { n: next.index })}
          </Button>
        </div>
      </div>

      {unlock ? (
        <UnlockPointer
          feature={unlock}
          onOpen={() => {
            const tab = UNLOCK_TAB[unlock];
            setUnlock(null);
            if (tab) router.switchTab(tab, TAB_ROOTS[tab]);
            else setModes(true);
          }}
          onDone={() => setUnlock(null)}
        />
      ) : null}

      {sheet ? (
        <LevelSheet
          node={nodes[sheet.i] ?? sheet}
          current={playNode}
          onClose={() => setSheet(null)}
          onPlay={(d) => {
            const id = sheet.level.id;
            setSheet(null);
            play(id, d);
          }}
          onGoMine={() => {
            setSheet(null);
            map.current?.panTo(playIndex, 400);
          }}
        />
      ) : null}
      {modes ? (
        <ModesSheet
          onClose={() => setModes(false)}
          onStart={(req) => {
            setModes(false);
            starter.start(req);
          }}
        />
      ) : null}
      {starter.dialog}
    </section>
  );
}

function ProfileChip() {
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
function TopRight(p: { quiet: boolean }) {
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

/**
 * MR-40: the feature that just opened. The rest of Home dims for a moment (Play stays lit and
 * pressable), a ring bursts its padlock around the tab or tile, and one line with "Open" (secondary)
 * points at it. Taps elsewhere go through to Home; it folds away by itself after a few seconds.
 */
function UnlockPointer(p: { feature: WarPathUnlock; onOpen(): void; onDone(): void }) {
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
  const above = !!box && !!host && box.top > host.height / 2;
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
            class={`wp-unlock__line${above ? ' is-above' : ''}`}
            style={{ left: `${Math.max(12, Math.min((host?.width ?? 800) - 312, box.left + box.width / 2 - 150))}px`, top: above ? `${box.top - 12}px` : `${box.top + box.height + 12}px` }}
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
