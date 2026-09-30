/**
 * The War Path campaign (S2c, ui-plan 4.1; owner decision 2026-09-30). Home is the 1v1 Battle hub;
 * the War Path is its offline side road: a sub-screen of the Battle tab, opened from Home's Campaign
 * card. The map is the screen; everything else is a thin frame around it:
 *
 * - **Top bar** (transparent over the map with a scrim): Back (top-left, U7), the region and level
 *   ("Bronze Age · Level 7 of 10"), the campaign's star total.
 * - **Map** (`WarPathMap`): themed regions, the winding road, the nodes (battle, elite, treasure,
 *   story, boss), the banner-bearer; a node opens the Level preview.
 * - **Level plate** above Play: the General with the AI badge, the level name and the first-clear
 *   reward (the best stars once beaten). It steps aside while the player pans.
 * - **Play** (gold, XL, bottom-right, the only primary and the one pulse): the next level, one tap.
 *
 * Ceremonies (U12, U13; Play or a tap finishes them at once): MR-41 level complete (stars stamp in,
 * the road draws to the next node, it bursts free of its padlock and drops in, the banner-bearer
 * marches), MR-42 for a boss (the gate opens, the camera pans into the new region, its name drops).
 * Feature unlocks (MR-40) play on Home, where the features live.
 */
import '../home/home.css';
import '../home/hub.css';
import './warPath.css';
import type { WarPathDifficulty } from '@/contracts';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { GeneralPortrait } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { AiBadge } from '../../components/Chips';
import { formatInt } from '../../components/format';
import { haptic } from '../../components/haptics';
import { AmberIcon, BackIcon, CapsuleIcon, CardsIcon, StarIcon, SwordsIcon } from '../../components/icons';
import { tierCrests } from '../../components/capsuleLook';
import { useKit } from '../../components/kit';
import { blockingOverlays } from '../../components/overlay';
import type { MatchRequest, RouteOf } from '../../router';
import { useUi } from '../context';
import { levelNameKey, mapNodes, mapRegions, playLevelId, playTarget, progressOf, regionNameKey, type MapNode } from '../model/warPath';
import { askFullscreen } from '../shared/fullscreen';
import { useMatchStarter } from '../shared/MatchStarter';
import { LevelSheet } from './LevelSheet';
import { WarPathMap, type MapShow, type WarPathMapHandle } from './WarPathMap';

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
const T_DROP = 420;
const T_REGION = 1900;

export function WarPathScreen(_p: { route: RouteOf<'warPath'> }) {
  const { save, content, t, router, locale } = useUi();
  const kit = useKit();
  const s = save.value;
  const wp = progressOf(s);
  const reduce = s.settings.reduceMotion;

  const nodes = useMemo(() => mapNodes(s, content), [wp, content]);
  const regions = useMemo(() => mapRegions(s, content), [wp, content]);
  const order = content.warPath.order;
  const playId = playLevelId(s, content);
  const playIndex = order.indexOf(playId);
  const playNode = nodes[playIndex]!;
  const totalStars = regions.reduce((n, r) => n + r.stars, 0);
  const maxStars = regions.reduce((n, r) => n + r.max, 0);

  // ---- ceremonies -----------------------------------------------------------------------------
  const [cer] = useState<Ceremony | null>(() =>
    takeCeremony(wp.stars, order, content.warPath.levels, (age) => content.warPath.regions.findIndex((r) => r.age === age)),
  );
  const [phase, setPhase] = useState<Phase>(cer ? 'focus' : 'done');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const map = useRef<WarPathMapHandle | null>(null);

  // An app overlay on top (the first forced upgrade, the age dialog) holds the ceremony and takes the
  // primary and pulse away until it closes (U1, U11, U13).
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

  // ---- panels and play --------------------------------------------------------------------------
  const [sheet, setSheet] = useState<MapNode | null>(null);
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

  // Keyboard (2.2): Space starts the next level.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.defaultPrevented || sheet) return;
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
      class={`ui-screen wp-home wp-screen${ceremonyOn ? ' is-ceremony' : ''}${launching ? ' is-launching' : ''}`}
      data-screen="warPath"
      aria-labelledby="warPath-title"
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
        <span class="wp-top__left">
          <IconButton icon={<BackIcon size={26} />} label={t('ui.common.back')} onClick={() => router.back()} kind="secondary" testid="back" class="wp-top__back" />
          <h1 id="warPath-title" class="wp-top__title">
            {t('ui.hub.campaign')}
          </h1>
        </span>
        <span class="wp-top__label" data-testid="home-level-label">
          <span class="wp-top__long" data-clip-check="">
            {regionLabel}
          </span>
          <span class="wp-top__short" data-clip-check="">
            {t('warPath.ui.levelOf', { region: t(`warPath.regionShort.${next.region}`), n: next.index, max: region.levels.length })}
          </span>
        </span>
        <span class="wp-top__right">
          <span class="wp-starTotal" data-testid="wp-star-total" aria-label={t('warPath.ui.stars', { n: totalStars, max: maxStars })}>
            <StarIcon size={20} filled />
            <b class="ui-num">{formatInt(totalStars, locale)}</b>
            <small>/{formatInt(maxStars, locale)}</small>
          </span>
        </span>
      </header>

      {phase === 'region' && cer?.region !== null && cer ? (
        <div class="wp-regionDrop" data-testid="wp-region-drop" aria-live="polite">
          <span class="wp-regionDrop__over">{t('warPath.ui.regionOpen')}</span>
          <span class="wp-regionDrop__name">{t(regionNameKey(content.warPath.regions[cer.region]!.age))}</span>
        </div>
      ) : null}

      <div class="wp-dock" ref={dockRef}>
        <button
          type="button"
          class={`wp-plate${panning ? ' is-aside' : ''}`}
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
        <div class="wp-playRow">
          <Button
            kind="primary"
            size="xl"
            class="wp-play"
            pulse={!ceremonyOn && !sheet && !covered}
            primary={!sheet && !covered}
            testid="wp-play"
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
      {starter.dialog}
    </section>
  );
}
