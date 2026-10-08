/**
 * The live showcase on the Card detail stage (ui-plan 4.4; owner request 2026-10-07: "see the soldier
 * move completely naturally and show off its attacks"). The app injects the stage (`ShowcaseContext`,
 * render's `showcaseMount`); this hook mounts it into the stage lazily and keeps it in step with the
 * page:
 *
 * - **Lazy.** It mounts after the screen's entrance (MR-12) when the browser is idle; the stage leases
 *   the card's sheet and goes live only once it has loaded, so the still portrait stays until then and
 *   the screen never waits for art. Leaving the screen (or another card) destroys the stage, which
 *   frees its GPU context and releases the sheet.
 * - **In step.** A skin change (the page's skin picker), the level, ownership (silhouette), the team
 *   preset, Reduce motion, Lite graphics and the sound hook reach the live stage at once.
 * - **Controls.** A tap on the stage plays the next move (the ceremony's skip comes first); the caption
 *   names the move and is a button too; play/pause toggles the loop. Reduce motion idles until asked.
 */
import type { CardId, CompiledContent, ShowcaseHandle, ShowcaseMove, ShowcaseRequest, ShowcaseState, SkinId, TeamPreset } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useKit, type Translate } from '../../components/kit';
import { useShowcase } from '../../components/showcase';

export interface CardShowcaseOptions {
  card: CardId;
  skin: SkinId | null;
  level: number;
  silhouette: boolean;
  teamPreset: TeamPreset;
  lite: boolean;
  content?: CompiledContent;
  /** False keeps the still (no stage). */
  enabled: boolean;
}

export interface CardShowcase {
  /** The live stage's state, or null while the still shows. */
  state: ShowcaseState | null;
  /** How far the controls row starts from the stage's left edge, px (0: at its padding). */
  inset: number;
  next(): void;
  toggle(): void;
  celebrate(): void;
}

/** The ground line of the stage (share of its height): the units stand on the ground strip's lip. */
export const SHOWCASE_GROUND_Y = 0.72;

/** Where the floor is free of the lg card (fractions of the stage box), measured from the DOM. */
export function showcaseFrame(stage: HTMLElement | null): NonNullable<ShowcaseRequest['frame']> {
  const fb = { groundY: SHOWCASE_GROUND_Y, coverRight: 0, coverTop: 1 };
  if (!stage || typeof stage.getBoundingClientRect !== 'function') return fb;
  const r = stage.getBoundingClientRect();
  const el = stage.querySelector('.cd-stage__card');
  const card = el?.getBoundingClientRect();
  if (!el || !card || !(r.width > 0) || !(r.height > 0) || !(card.width > 0)) return fb;
  // the class badge and the crown stick out past the card's corner: the floor starts after them
  let right = card.right;
  for (const b of el.querySelectorAll('.ui-card__class, .ui-card__crown')) right = Math.max(right, b.getBoundingClientRect().right);
  return { groundY: SHOWCASE_GROUND_Y, coverRight: Math.min(0.7, Math.max(0, (right - r.left + 4) / r.width)), coverTop: Math.min(1, Math.max(0, (card.top - r.top) / r.height)) };
}

/** The controls row (the caption and play/pause) fills this much of the stage's top, px. */
const CONTROLS_ROW_PX = 60;

/**
 * Where the controls row starts (px from the stage's left): on a stage so short that the lg card
 * reaches into the row, past the card and its role badge, so the caption never covers the cost.
 */
export function controlsInset(stage: HTMLElement | null): number {
  if (!stage || typeof stage.getBoundingClientRect !== 'function') return 0;
  const r = stage.getBoundingClientRect();
  const card = stage.querySelector('.cd-stage__card')?.getBoundingClientRect();
  if (!card || !(card.width > 0) || card.top - r.top >= CONTROLS_ROW_PX) return 0;
  return Math.max(0, Math.round(card.right - r.left + 14));
}

type IdleHandle = { cancel(): void };

function whenIdle(cb: () => void, timeoutMs: number): IdleHandle {
  const w = typeof window !== 'undefined' ? (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void }) : null;
  if (w?.requestIdleCallback) {
    const h = w.requestIdleCallback(cb, { timeout: timeoutMs });
    return { cancel: () => w.cancelIdleCallback?.(h) };
  }
  const h = setTimeout(cb, 0);
  return { cancel: () => clearTimeout(h) };
}

/** Mounts the injected showcase into `host` once the screen has settled; null without one. */
export function useCardShowcase(stage: RefObject<HTMLElement>, host: RefObject<HTMLElement>, o: CardShowcaseOptions): CardShowcase {
  const mount = useShowcase();
  const kit = useKit();
  const [state, setState] = useState<ShowcaseState | null>(null);
  const [inset, setInset] = useState(0);
  const handle = useRef<ShowcaseHandle | null>(null);
  const live = useRef({ o, kit });
  live.current = { o, kit };

  useEffect(() => {
    if (!mount || !o.enabled) return undefined;
    let alive = true;
    let h: ShowcaseHandle | null = null;
    let idle: IdleHandle | null = null;
    const start = (): void => {
      const el = host.current;
      if (!alive || !el) return;
      const { o: cur, kit: k } = live.current;
      try {
        h = mount(el, {
          card: cur.card,
          skin: cur.skin,
          level: cur.level,
          silhouette: cur.silhouette,
          teamPreset: cur.teamPreset,
          reduceMotion: k.reduceMotion,
          lite: cur.lite,
          ...(cur.content ? { content: cur.content } : {}),
          ...(k.sound ? { sound: k.sound } : {}),
          frame: showcaseFrame(stage.current),
        });
      } catch {
        return;
      }
      handle.current = h;
      const mine = h;
      mine.subscribe((s) => {
        if (alive && handle.current === mine) setState(s.live ? s : null);
      });
      void mine.ready.then((ok) => {
        if (alive && handle.current === mine) setState(ok ? mine.state() : null);
      });
    };
    // after the entrance (MR-12) and when the browser is idle: the screen never waits for the stage
    const timer = setTimeout(() => {
      idle = whenIdle(start, 600);
    }, MOTION_DUR.medium + 60);
    return () => {
      alive = false;
      clearTimeout(timer);
      idle?.cancel();
      h?.destroy();
      handle.current = null;
      setState(null);
    };
  }, [mount, o.card, o.enabled, o.content]);

  // the page's changes reach the live stage at once
  useEffect(() => {
    handle.current?.update({ skin: o.skin, level: o.level, silhouette: o.silhouette, teamPreset: o.teamPreset, lite: o.lite });
  }, [o.skin, o.level, o.silhouette, o.teamPreset, o.lite]);
  useEffect(() => {
    handle.current?.update({ reduceMotion: kit.reduceMotion, ...(kit.sound ? { sound: kit.sound } : {}) });
  }, [kit.reduceMotion, kit.sound]);

  // the card's corner moves with the layout (rotation, a resize): keep the floor and the controls clear of it
  useEffect(() => {
    const el = stage.current;
    if (!el || state === null) return undefined;
    const measure = (): void => {
      handle.current?.update({ frame: showcaseFrame(el) });
      setInset(controlsInset(el));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state !== null]);

  return {
    state,
    inset,
    next: () => handle.current?.play(),
    toggle: () => {
      const h = handle.current;
      if (h) h.setAuto(!h.state().auto);
    },
    celebrate: () => handle.current?.celebrate(),
  };
}

/** The i18n key of a move's caption (attack variants read "Attack 2/3", an ability its own name). */
export function moveLabel(t: Translate, s: ShowcaseState): string {
  if ((s.move === 'attack' || s.move === 'attack_b' || s.move === 'attack_c') && s.of > 1) return t('ui.card.showcase.attackOf', { n: s.index, of: s.of });
  const ability = s.move === 'ability' && s.ability ? ABILITY_KEYS[s.ability] : undefined;
  if (ability) return t(ability);
  return t(MOVE_KEYS[s.move]);
}

/** The specials a showcase names (whole keys, so the strings check sees them). */
const ABILITY_KEYS: Record<string, string> = {
  pounce: 'ui.card.showcase.ability.pounce',
  callStrike: 'ui.card.showcase.ability.callStrike',
  timeStop: 'ui.card.showcase.ability.timeStop',
  emp: 'ui.card.showcase.ability.emp',
  periodicShieldAura: 'ui.card.showcase.ability.periodicShieldAura',
  roar: 'ui.card.showcase.ability.roar',
};

const MOVE_KEYS: Record<ShowcaseMove, string> = {
  idle: 'ui.card.showcase.move.idle',
  walk: 'ui.card.showcase.move.walk',
  attack: 'ui.card.showcase.move.attack',
  attack_b: 'ui.card.showcase.move.attack',
  attack_c: 'ui.card.showcase.move.attack',
  attack_alt: 'ui.card.showcase.move.attack_alt',
  ability: 'ui.card.showcase.move.ability',
  summon: 'ui.card.showcase.move.summon',
  hit: 'ui.card.showcase.move.hit',
  ko: 'ui.card.showcase.move.ko',
  build: 'ui.card.showcase.move.build',
  fire: 'ui.card.showcase.move.fire',
  spawn: 'ui.card.showcase.move.spawn',
  trigger: 'ui.card.showcase.move.trigger',
  cast: 'ui.card.showcase.move.cast',
};

/** The move caption (a button: the next move) and the play/pause toggle, over the live stage. */
export function ShowcaseControls(p: { state: ShowcaseState; inset?: number; onNext: () => void; onToggle: () => void }) {
  const { t } = useKit();
  const label = moveLabel(t, p.state);
  const auto = p.state.auto;
  return (
    <div class="cd-show" style={p.inset ? { left: `${p.inset}px` } : undefined} onClick={(e) => e.stopPropagation()}>
      <button type="button" class="cd-show__move" data-testid="showcase-next" data-move={p.state.move} aria-label={t('ui.card.showcase.next', { move: label })} onClick={p.onNext}>
        <span class="cd-show__label" key={`${p.state.move}${p.state.index}`}>
          {label}
        </span>
        <svg class="cd-show__chev" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        class="cd-show__play"
        data-testid="showcase-play"
        aria-pressed={auto ? 'true' : 'false'}
        aria-label={auto ? t('ui.card.showcase.pause') : t('ui.card.showcase.play')}
        onClick={p.onToggle}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          {auto ? (
            <g fill="currentColor">
              <rect x="5" y="4" width="3.4" height="12" rx="1.2" />
              <rect x="11.6" y="4" width="3.4" height="12" rx="1.2" />
            </g>
          ) : (
            <path d="M6.5 4.2v11.6a.8.8 0 0 0 1.2.7l9.1-5.8a.8.8 0 0 0 0-1.4L7.7 3.5a.8.8 0 0 0-1.2.7Z" fill="currentColor" />
          )}
        </svg>
      </button>
    </div>
  );
}
