/**
 * Customize's big preview (PLAN 2a "Backdrop and base-skin previews", ui-plan 4.5 PreviewStage): your
 * half of the lane with the age's scene and your sky, your base with its flags and decorations.
 *
 * - **Live.** When the app provides a diorama (`DioramaContext`, render's `dioramaMount`, Track B), a
 *   small Pixi stage draws it with ambient motion, weather and two idle turrets. It mounts after the
 *   screen's entrance when the browser is idle, pauses off screen and while the tab is hidden, and is
 *   destroyed with the panel (its GPU context and leased sheets go with it).
 * - **Still.** Until the stage reports `ready` (and for good without one: tests, no WebGL, the diorama not
 *   built yet) the still picture shows: the scene's painted still under your sky, the sky's weather
 *   (never snow over space), your base model (`BaseLook`), the pole with your flags and the decorations.
 *   The live stage cross-fades in over it, so the picture never blinks.
 *
 * Try-ons reach both at once: a scene, a sky or a base skin tapped in the grid shows here without being
 * equipped (U10: seeing what you can earn is honest and motivating).
 *
 * Flags and Decorations (round 3) use the same stage: the base model with its flags and the Blender
 * decorations, as in battle. The Decorations tab lays its three spots as tap targets over the live stage
 * at Track B's anchors (`anchorsPx()`, `spots.ts`); the Flags tab marks the pole. The still (with its own
 * spots and pole mark) stays until the stage is live, when it cannot start, and under Reduce motion.
 */
import { ageNameKey, cosmeticNameKey } from '@/content/keys';
import type { AgeId, CosmeticLoadout, DioramaHandle, DioramaRequest, SaveDoc, SideLook, SkinId } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BackdropLook, BaseLook, ClothItem, CosmeticImage } from '../../components/cosmeticArt';
import { useDiorama } from '../../components/diorama';
import { useUi } from '../context';
import { equippedOf, findItem } from '../model/cosmetics';
import { spotTargets, type StageBox } from './spots';

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

/**
 * The base skin each age shows, as the battle resolves it (`render/battleView.ts baseSkinsOf`): the
 * troop-system skin of a base (Crystal Spire) wins, else the cosmetic base skin of that age; art skin
 * ids (no `baseSkin.` prefix). `shown` overrides one age (a tile tried on): a `baseSkin.<id>` or
 * `skin.<id>` key, or null for the standard base.
 */
export function stageBaseSkins(save: SaveDoc, look: CosmeticLoadout, ages: readonly AgeId[], shown?: { age: AgeId; key: string | null }): Partial<Record<AgeId, SkinId>> {
  const out: Partial<Record<AgeId, SkinId>> = {};
  for (const age of ages) {
    const troop = save.skins.equipped[`base.${age}`];
    const cos = look.baseSkins[age];
    const id = troop ? troop : cos ? cos.slice('baseSkin.'.length) : null;
    if (id) out[age] = id;
  }
  if (shown) {
    const k = shown.key;
    if (k === null) delete out[shown.age];
    else out[shown.age] = k.slice(k.indexOf('.') + 1);
  }
  return out;
}

/** The cosmetic key of the base skin an age shows (`baseSkin.<id>`, the troop skin as `baseSkin.<skin id>`), or null. */
export function shownBaseKey(save: SaveDoc, look: CosmeticLoadout, age: AgeId): string | null {
  const troop = save.skins.equipped[`base.${age}`];
  if (troop) return `baseSkin.${troop}`;
  return look.baseSkins[age] ?? null;
}

/**
 * The live stage's handle with Track B's duck-typed anchors (round 3): where the side's three decoration
 * spots and its flag pole stand, in CSS px of the host, and a callback when a resize moves them.
 */
type AnchoredHandle = DioramaHandle & { anchorsPx?: () => StageBox[]; onAnchorsChange?: (cb: () => void) => () => void };

/** What the live stage reports: whether it draws, and where its spots and pole are (null without anchors). */
export interface DioramaStageState {
  live: boolean;
  /** The three decoration spots in anchor order, then the pole (Track B's `anchorsPx()`). */
  anchors: StageBox[] | null;
}

/**
 * Mounts the injected diorama into `host` once the panel has settled (null `req` or no mount: never) and
 * keeps it in step with `req`. `live` is true while the live stage draws (the still can fade out).
 */
export function useDioramaStage(host: RefObject<HTMLElement>, req: DioramaRequest | null): DioramaStageState {
  const mount = useDiorama();
  const [live, setLive] = useState(false);
  const [anchors, setAnchors] = useState<StageBox[] | null>(null);
  const handle = useRef<DioramaHandle | null>(null);
  const latest = useRef(req);
  latest.current = req;
  const on = !!mount && req !== null;
  useEffect(() => {
    if (!mount || !on) return undefined;
    let alive = true;
    let h: DioramaHandle | null = null;
    let idle: IdleHandle | null = null;
    let io: IntersectionObserver | null = null;
    let offAnchors: (() => void) | null = null;
    const seen = { box: true, page: typeof document === 'undefined' || !document.hidden };
    const apply = (): void => h?.setVisible(seen.box && seen.page);
    const onPage = (): void => {
      seen.page = !document.hidden;
      apply();
    };
    const start = (): void => {
      const el = host.current;
      const r = latest.current;
      if (!alive || !el || !r) return;
      try {
        h = mount(el, r);
      } catch {
        return;
      }
      handle.current = h;
      const mine = h;
      void mine.ready
        .then((ok) => {
          if (alive && handle.current === mine) setLive(ok);
        })
        .catch(() => undefined);
      // the spots and the pole (Track B, duck-typed): read now, and again whenever a resize moves them
      const ext = mine as AnchoredHandle;
      if (typeof ext.anchorsPx === 'function') {
        const read = (): void => {
          if (alive && handle.current === mine) setAnchors(ext.anchorsPx?.() ?? null);
        };
        read();
        offAnchors = ext.onAnchorsChange?.(read) ?? null;
      }
      // paused off screen (a scrolled phone panel) and while the tab is hidden
      if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver((es) => {
          seen.box = es.some((e) => e.isIntersecting);
          apply();
        });
        io.observe(el);
      }
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onPage);
      apply();
    };
    // after the panel's entrance (MR-12) and when the browser is idle: the screen never waits for it
    const timer = setTimeout(() => {
      idle = whenIdle(start, 700);
    }, MOTION_DUR.medium + 60);
    return () => {
      alive = false;
      clearTimeout(timer);
      idle?.cancel();
      io?.disconnect();
      offAnchors?.();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onPage);
      h?.destroy();
      handle.current = null;
      setLive(false);
      setAnchors(null);
    };
  }, [mount, on]);
  // every change (age, try-on, crumble, settings) reaches the live stage at once
  const key = req ? JSON.stringify(req) : '';
  useEffect(() => {
    if (!req || !handle.current) return;
    const { side: _side, ...patch } = req;
    void _side;
    handle.current.update(patch);
  }, [key]);
  return { live, anchors };
}

/**
 * The decoration spots as tap targets over the live stage (round 3, item 5): at least 44 px each, laid
 * out by `spotTargets`. A target sits on its prop (the prop shows through its ring) where it covers that
 * prop alone; the others are callouts above the props that show what their spot holds, with a leader
 * down to it (on a phone the props stand 14-37 px apart). The picked spot is ringed in gold, an empty one
 * dashed with a "+", and every prop's footprint is marked on the ground. A tap picks the spot the next
 * decoration goes to (the panel's heading names it).
 */
function StageSpots(p: { anchors: StageBox[]; host: RefObject<HTMLElement>; decorations: readonly (string | null)[]; picked: number; onPick: (i: number) => void }) {
  const { t, sound } = useUi();
  const el = p.host.current;
  const w = el?.clientWidth ?? 0;
  const h = el?.clientHeight ?? 0;
  const targets = spotTargets(p.anchors.slice(0, ANCHOR_COUNT), w, h);
  const press = (e: Event, on: boolean): void => {
    const b = e.currentTarget as HTMLElement | null;
    if (!b) return;
    if (on) b.setAttribute('data-pressed', '');
    else b.removeAttribute('data-pressed');
  };
  return (
    <div class="cos-marks" data-testid="stage-spots">
      <svg class="cos-marks__lines" viewBox={`0 0 ${Math.max(1, w)} ${Math.max(1, h)}`} aria-hidden="true" focusable="false">
        {targets.map((g, i) => (
          <g key={i} class={p.picked === i ? 'is-picked' : undefined}>
            <ellipse class="cos-marks__foot" cx={g.footX} cy={g.groundY} rx={g.footW / 2} ry={Math.max(2.5, g.footW * 0.16)} />
            {g.leader ? <line class="cos-marks__leader" x1={g.x + g.w / 2} y1={g.y + g.h} x2={g.footX} y2={g.propTop} /> : null}
          </g>
        ))}
      </svg>
      {targets.map((g, i) => {
        const k = p.decorations[i] ?? null;
        return (
          <button
            key={`${i}|${k ?? ''}`}
            type="button"
            class={`cos-spot${p.picked === i ? ' is-picked' : ''}${k ? '' : ' is-empty'}${g.raised ? ' is-raised' : ''}`}
            style={{ left: `${g.x}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${g.h}px` }}
            aria-pressed={p.picked === i}
            aria-label={`${t(`cosmetic.ui.anchor.${i}`)}: ${k ? t(cosmeticNameKey('decoration', k.slice('decoration.'.length))) : t('cosmetic.ui.emptySpot')}`}
            data-testid={`anchor-${i}`}
            data-spot={i}
            onPointerDown={(e) => {
              if (e.button === undefined || e.button === 0) press(e, true);
            }}
            onPointerUp={(e) => press(e, false)}
            onPointerCancel={(e) => press(e, false)}
            onPointerLeave={(e) => press(e, false)}
            onClick={() => {
              sound?.('ui_toggle');
              p.onPick(i);
            }}
          >
            {/* a callout shows what its spot holds (the prop itself stands below, at the leader's end) */}
            {k ? g.raised ? <CosmeticImage item={k} class="cos-spot__art" /> : null : <span class="cos-spot__plus" aria-hidden="true">+</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The flag pole marked on the live stage (round 3, item 5; the Flags tab): a dashed gold outline about the
 * pole and its flags. It pings once whenever a flag changes (`ping`), pointing the eye to the cloth
 * changing on the stage.
 */
function PoleMark(p: { box: StageBox; ping: string }) {
  const b = p.box;
  return (
    <div class="cos-marks" aria-hidden="true">
      <span
        key={p.ping}
        class="cos-polemark"
        data-testid="stage-pole"
        style={{ left: `${Math.round(b.x - 5)}px`, top: `${Math.round(b.y - 5)}px`, width: `${Math.round(b.w + 10)}px`, height: `${Math.round(b.h + 8)}px` }}
      />
    </div>
  );
}

const ANCHOR_COUNT = 3;

/**
 * Your base as the lane shows it (A18.9.4), the still picture: the age's scene under your sky (both may
 * be tried on) with the sky's weather, the keep in the age's base skin (the troop-system skin too), the
 * pole with the base flag and the national flag, and the three decoration spots. In the Decorations tab
 * the spots are buttons that choose where the next decoration goes.
 */
export function BaseMock(p: { age: AgeId; look?: Partial<CosmeticLoadout>; skinKey?: string | null; anchor?: number; onAnchor?: (i: number) => void; caption?: string; weather?: boolean; markPole?: boolean }) {
  const { save, content, t, sound } = useUi();
  const eq = { ...equippedOf(save.value, content), ...p.look };
  const skin = p.skinKey !== undefined ? p.skinKey : shownBaseKey(save.value, eq, p.age);
  const reduce = save.value.settings.reduceMotion;
  const decorations = Array.from({ length: ANCHOR_COUNT }, (_, i) => eq.decorations[i] ?? null);
  const scene = eq.scenes[p.age] ?? null;
  return (
    <figure class={`cos-mock${reduce ? ' is-still' : ''}`} data-testid="base-mock" aria-label={t('cosmetic.ui.preview')}>
      {/* The age's scene under your sky (AUDIT #12, PLAN 2b), as the lane paints it, then a cel-shaded
          ground strip with a contact shadow under the keep. The sky's weather moves over it (space
          scenes get motes, never snow). */}
      <div class="cos-mock__sky" aria-hidden="true">
        <BackdropLook skin={eq.backdrop ?? null} scene={scene} age={p.age} animate={!!p.weather && !reduce} weather={!!p.weather} testid="backdrop-look" />
      </div>
      <div class="cos-mock__ground" aria-hidden="true">
        <span class="cos-mock__tufts" />
      </div>
      <span class="cos-mock__shadow" aria-hidden="true" />
      {/* keyed by age and skin, so a change re-runs the entrance (the equip feedback) */}
      <div class="cos-mock__keep" key={`${p.age}|${skin ?? ''}`} aria-hidden="true">
        <BaseLook age={p.age} skin={skin} animate={!reduce} testid="base-mock-keep" />
        {skin ? <span class="cos-mock__gleam" /> : null}
      </div>
      {decorations.map((k, i) => {
        const inner = k ? (
          <span class="cos-mock__deco-art" key={k}>
            <CosmeticImage item={k} />
          </span>
        ) : p.onAnchor ? (
          <span class="cos-mock__plus">+</span>
        ) : null;
        const cls = `cos-mock__deco cos-mock__deco--${i}${p.anchor === i ? ' is-picked' : ''}${k ? '' : ' is-empty'}`;
        return p.onAnchor ? (
          <button
            key={i}
            type="button"
            class={cls}
            aria-pressed={p.anchor === i}
            aria-label={`${t(`cosmetic.ui.anchor.${i}`)}: ${k ? t(cosmeticNameKey('decoration', k.slice(11))) : t('cosmetic.ui.emptySpot')}`}
            data-testid={`anchor-${i}`}
            onClick={() => {
              sound?.('ui_toggle');
              p.onAnchor?.(i);
            }}
          >
            {inner}
          </button>
        ) : (
          <span key={i} class={cls} aria-hidden="true">
            {inner}
          </span>
        );
      })}
      <div class={`cos-mock__pole${p.markPole ? ' is-marked' : ''}`} aria-hidden="true">
        {/* the Flags tab marks the pole, on the still as on the live stage (round 3) */}
        {p.markPole ? <span class="cos-mock__polemark" data-testid="still-pole" /> : null}
        {/* the finial of the base flag's rarity (PLAN 2a: a wooden knob, a brass ball, a spear tip, a star) */}
        <span class={`cos-mock__cap cos-mock__cap--${(eq.baseFlag ? findItem(content, eq.baseFlag)?.rarity : undefined) ?? 'common'}`} key={`cap-${eq.baseFlag ?? ''}`} />
        {eq.baseFlag ? (
          <span class="cos-mock__flag cos-mock__flag--base" key={eq.baseFlag}>
            {/* the flags wave like the lane's cloth (queue item 37) */}
            <ClothItem item={eq.baseFlag} widthPx={64} />
          </span>
        ) : null}
        {eq.nationalFlag ? (
          <span class="cos-mock__flag cos-mock__flag--nation" key={eq.nationalFlag}>
            <ClothItem item={eq.nationalFlag} widthPx={52} />
          </span>
        ) : null}
      </div>
      <figcaption class="cos-mock__caption">{p.caption ?? `${t('cosmetic.ui.preview')} · ${t(ageNameKey(p.age))}`}</figcaption>
    </figure>
  );
}

export interface PreviewStageProps {
  age: AgeId;
  /** Try-ons over the equipped look (a scene, a sky or a base skin key for `age`). */
  look?: Partial<CosmeticLoadout>;
  /** The base skin shown for `age` (`baseSkin.<id>`, the troop skin too), or null for the standard base; absent: the equipped one. */
  baseSkin?: string | null;
  /** Crumble stage of the live stage (the Bases tab's Damage toggle). */
  crumble?: 0 | 1 | 2 | 3;
  /** Overlays on top of the stage (the name plate). */
  children?: ComponentChildren;
  /** Overlays that depend on the live stage (the Damage toggle: only the live stage crumbles). */
  overlay?: (live: boolean) => ComponentChildren;
  testid: string;
  /** The caption in the top-left corner. */
  caption?: string;
  /**
   * The Decorations tab: the three spots as tap targets, over the live stage at Track B's anchors (round 3),
   * and the still's own spots until it is live.
   */
  spots?: { picked: number; onPick: (i: number) => void };
  /** The Flags tab: the pole marked (on the still, then on the live stage); `poleKey` changes ping it. */
  pole?: boolean;
  poleKey?: string;
  /** The still only, never the live stage (the Flags and Decorations tabs under Reduce motion). */
  stillOnly?: boolean;
}

/** The big preview: the live diorama when there is one, the still until then (see the module note). */
export function PreviewStage(p: PreviewStageProps) {
  const { save, content } = useUi();
  const s = save.value;
  const eq = { ...equippedOf(s, content), ...p.look };
  const skinKey = p.baseSkin !== undefined ? p.baseSkin : shownBaseKey(s, eq, p.age);
  const host = useRef<HTMLDivElement>(null);
  const sideLook: SideLook = { baseFlag: eq.baseFlag, nationalFlag: eq.nationalFlag, baseSkins: eq.baseSkins, decorations: eq.decorations, backdrop: eq.backdrop, scenes: eq.scenes };
  const req: DioramaRequest = {
    age: p.age,
    side: 0,
    look: sideLook,
    scene: eq.scenes[p.age] ?? null,
    sky: eq.backdrop ?? null,
    baseSkins: stageBaseSkins(s, eq, content.order.ages, { age: p.age, key: skinKey }),
    crumble: p.crumble ?? 0,
    teamPreset: s.settings.teamPreset,
    reduceMotion: s.settings.reduceMotion,
    lite: s.settings.graphics === 'lite',
  };
  const { live, anchors } = useDioramaStage(host, p.stillOnly ? null : req);
  // the still keeps its own spots and pole mark until the live stage takes over with Track B's anchors
  const liveSpots = live && !!anchors && anchors.length >= ANCHOR_COUNT;
  const pole = anchors?.[ANCHOR_COUNT] ?? null;
  return (
    <div class={`cos-stage${live ? ' is-live' : ''}`} data-testid={p.testid} data-live={live ? 'true' : 'false'} data-age={p.age}>
      <div class="cos-stage__still" aria-hidden={live ? 'true' : undefined}>
        <BaseMock
          age={p.age}
          {...(p.look ? { look: p.look } : {})}
          skinKey={skinKey}
          weather
          {...(p.caption ? { caption: p.caption } : {})}
          {...(p.spots && !liveSpots ? { anchor: p.spots.picked, onAnchor: p.spots.onPick } : {})}
          markPole={!!p.pole && !(live && pole)}
        />
      </div>
      <div class="cos-stage__live" ref={host} aria-hidden="true" />
      {live && p.caption ? <span class="cos-mock__caption cos-stage__caption">{p.caption}</span> : null}
      {liveSpots && anchors && p.spots ? <StageSpots anchors={anchors} host={host} decorations={Array.from({ length: ANCHOR_COUNT }, (_, i) => eq.decorations[i] ?? null)} picked={p.spots.picked} onPick={p.spots.onPick} /> : null}
      {live && pole && p.pole ? <PoleMark box={pole} ping={p.poleKey ?? ''} /> : null}
      {p.children}
      {p.overlay?.(live)}
    </div>
  );
}
