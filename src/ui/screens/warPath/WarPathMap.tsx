/**
 * The War Path map (ui-plan 4.1, MR-18, MR-41, MR-42, MR-48, MR-49): a horizontal road through one
 * landscape per age, left to right, with the level nodes on it.
 *
 * - DOM plus SVG, so nodes are real buttons (keyboard, screen reader, the budget test).
 * - Layout is measured: node spacing 120 (compact) / 160 (regular); the road winds through the band
 *   between the top bar and the level plate, so the plate and the bottom row never cover a node.
 * - Pan: drag 1:1 with inertia and a rubber band at the ends (no pan starts within 20 px of the
 *   screen edges, 2.2), the mouse wheel, and the arrow keys. The far layer moves at half speed.
 * - A tap on empty ground scatters a few birds (MR-49). Far-ahead nodes fade into mist; bosses stay
 *   visible. The banner-bearer stands on the current node. "Back to my level" appears at the edge
 *   nearer the current node when it leaves the view.
 * - The level-complete ceremony (MR-41 with MR-48, and MR-42 for a boss) is driven by the parent
 *   through `show` (what the map draws while it plays) and `phase`.
 */
import type { AgeId } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { GeneralPortrait } from '../../components/Avatar';
import { CrownIcon, LockIcon, StarIcon } from '../../components/icons';
import { useKit } from '../../components/kit';
import { useUi } from '../context';
import { levelNameKey, regionNameKey, type MapNode, type MapRegion } from '../model/warPath';
import { REGION_THEMES, RegionFar, RegionGround } from './regionArt';
import { BossLair, Chest, EliteCrest, Foreground, Lantern, Scroll, UnlockBurst } from './mapDeco';
import { StartCamp } from './regionScenery';

/** The map's geometry at a size. */
export interface MapLayout {
  w: number;
  h: number;
  spacing: number;
  node: number;
  boss: number;
  /** Node centres in world px. */
  pts: { x: number; y: number }[];
  /** Region spans in world px (left edge of the first node's slot to the right edge of the last). */
  spans: { start: number; end: number }[];
  worldW: number;
  horizon: number;
  /** The top bar's bottom edge: nothing tall in the far layer reaches above it. */
  top: number;
  yMin: number;
  yMax: number;
}

/** Parallax factor of the far layer. */
const FAR = 0.5;
/** Region art overlap for the soft seams (px). */
const SEAM = 160;
/** Nodes further than this ahead of the current one fade into mist. */
const MIST_AHEAD = 4;

export function mapLayout(o: { w: number; h: number; top: number; bottom: number; regions: readonly MapRegion[]; count: number }): MapLayout {
  const regular = o.h > 480;
  const spacing = regular ? 160 : 120;
  const node = regular ? 72 : 56;
  const boss = regular ? 96 : 72;
  const gap = spacing * 0.6;
  // The road runs through the band between the top bar and the plate (4.1 "upper 60%").
  const top = o.top + node * 0.5 + 10;
  const bottom = Math.max(top + 20, o.h - o.bottom - node * 0.5 - 22);
  // The road winds through most of the band (on tall screens it keeps a strip of sky and skyline
  // above it), so it never reads as a flat line.
  const amp = Math.min((bottom - top) / 2, node * 2.2);
  const mid = bottom - amp;
  const yMin = mid - amp;
  const yMax = mid + amp;
  const pts: { x: number; y: number }[] = [];
  const spans: { start: number; end: number }[] = [];
  // The first node sits a little in from the left (the start camp fills the lead-in).
  let x = Math.max(o.w * 0.34, spacing);
  for (const r of o.regions) {
    const start = x - spacing / 2;
    for (let i = r.from; i <= r.to; i++) {
      const k = i - r.from;
      // A gentle double wave per region, so the road winds but never doubles back.
      const y = mid + amp * (0.72 * Math.sin(k * 0.95 + r.from * 0.37) + 0.28 * Math.sin(k * 2.1 + 1.3));
      pts.push({ x, y });
      x += spacing;
    }
    spans.push({ start, end: x - spacing / 2 });
    x += gap;
  }
  const worldW = x - gap + Math.max(o.w * 0.55, spacing);
  const horizon = Math.max(o.top + 40, yMin - node * 0.9);
  return { w: o.w, h: o.h, spacing, node, boss, pts, spans, worldW, horizon, top: o.top, yMin, yMax };
}

/** A smooth path through points (Catmull-Rom as cubic Béziers). */
function smooth(pts: readonly { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  let d = `M${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** The road's y at world x (linear between node centres; good enough to keep props off the road). */
function roadYAt(pts: readonly { x: number; y: number }[], x: number): number {
  if (pts.length === 0) return 0;
  if (x <= pts[0]!.x) return pts[0]!.y;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / Math.max(1, b.x - a.x);
  }
  return pts[pts.length - 1]!.y;
}

/** What the map draws while a ceremony plays (the parent holds the real save). */
export interface MapShow {
  /** Stars shown per level id (overrides the save while stamping). */
  stars?: Record<string, number>;
  /** A level drawn locked although it is open (before it drops in). */
  hideOpen?: string | null;
  /** The node index the banner-bearer stands on. */
  bearer?: number;
  /** The level whose stars stamp in now, and from which star. */
  stamp?: { id: string; from: number } | null;
  /** The node that drops in now. */
  drop?: string | null;
  /** The road segment that draws itself now (from node index). */
  draw?: number | null;
  /** A region whose gate swings open now. */
  gate?: number | null;
}

export interface WarPathMapHandle {
  /** Pans so node `i` sits at 45% of the width. */
  panTo(i: number, ms?: number): void;
}

interface Props {
  nodes: readonly MapNode[];
  /** X0 side nodes: each hangs off the main node at its `i`, drawn above the road on a dashed path. */
  sides?: readonly MapNode[];
  regions: readonly MapRegion[];
  /** The node the banner-bearer and "Back to my level" point at. */
  current: number;
  /** Reserved space: the top bar, and the plate plus the bottom row. */
  insets: { top: number; bottom: number };
  show?: MapShow;
  onNode(node: MapNode, el: HTMLElement): void;
  /** True while the player pans (the level plate steps aside). */
  onPanning?(on: boolean): void;
  /** True while the current node is off the view ("Back to my level" shows; the plate steps aside). */
  onAway?(on: boolean): void;
  handle?: (h: WarPathMapHandle) => void;
  testid?: string;
}

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function WarPathMap(p: Props) {
  const { t } = useKit();
  const { save } = useUi();
  const reduce = save.value.settings.reduceMotion;
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [scroll, setScroll] = useState(0);
  const scrollRef = useRef(0);
  const anim = useRef<number | null>(null);
  const drag = useRef<{ id: number; x0: number; s0: number; moved: boolean; last: number; lastT: number; v: number } | null>(null);
  const justDragged = useRef(false);
  const [birds, setBirds] = useState<{ id: number; x: number; y: number }[]>([]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      // Layout size, not the painted box: a screen's enter transform must not shrink the map.
      const r = { width: el.clientWidth || el.getBoundingClientRect().width, height: el.clientHeight || el.getBoundingClientRect().height };
      if (r.width > 0 && r.height > 0) setSize((s) => (s && s.w === Math.round(r.width) && s.h === Math.round(r.height) ? s : { w: Math.round(r.width), h: Math.round(r.height) }));
      // Nothing measured yet (hidden, or a DOM without layout): lay out for the reference phone.
      else setSize((s) => s ?? { w: 844, h: 390 });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => (size ? mapLayout({ w: size.w, h: size.h, top: p.insets.top, bottom: p.insets.bottom, regions: p.regions, count: p.nodes.length }) : null),
    [size?.w, size?.h, p.insets.top, p.insets.bottom, p.regions, p.nodes.length],
  );

  const maxScroll = layout ? Math.max(0, layout.worldW - layout.w) : 0;
  const clamp = (s: number) => Math.max(0, Math.min(maxScroll, s));
  const target = (i: number) => (layout ? clamp((layout.pts[i]?.x ?? 0) - layout.w * 0.45) : 0);

  function set(s: number) {
    scrollRef.current = s;
    setScroll(s);
  }
  function stop() {
    if (anim.current !== null) cancelAnimationFrame(anim.current);
    anim.current = null;
  }
  function animateTo(to: number, ms: number) {
    stop();
    const from = scrollRef.current;
    if (reduce || ms <= 0 || Math.abs(to - from) < 1) {
      set(to);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      set(from + (to - from) * ease(k));
      anim.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  }

  // Open centred on the current node (4.1: at about 45% of the width).
  const placed = useRef(false);
  useLayoutEffect(() => {
    if (!layout) return;
    if (!placed.current) {
      placed.current = true;
      set(target(p.current));
    } else set(clamp(scrollRef.current));
  }, [layout]);

  useEffect(() => {
    p.handle?.({ panTo: (i, ms = 400) => animateTo(target(i), ms) });
  });
  useEffect(() => () => stop(), []);

  // Inertia and the rubber band after a drag (friction 0.95 per frame).
  function fling(v0: number) {
    stop();
    let v = v0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(48, now - last) / 16.67;
      last = now;
      let s = scrollRef.current + v * dt;
      v *= 0.95 ** dt;
      if (s < 0 || s > maxScroll) {
        const edge = s < 0 ? 0 : maxScroll;
        s = edge + (s - edge) * 0.8 ** dt;
        v *= 0.6 ** dt;
        if (Math.abs(s - edge) < 0.5 && Math.abs(v) < 0.5) {
          set(edge);
          anim.current = null;
          p.onPanning?.(false);
          return;
        }
      } else if (Math.abs(v) < 0.3) {
        set(s);
        anim.current = null;
        p.onPanning?.(false);
        return;
      }
      set(s);
      anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }

  function onPointerDown(e: PointerEvent) {
    const el = root.current;
    if (!el || e.button > 0) return;
    const r = el.getBoundingClientRect();
    // iOS edge swipe is a history back: no pan starts within 20 px of the screen edges (2.2).
    if (e.clientX - r.left < 20 || r.right - e.clientX < 20) return;
    stop();
    drag.current = { id: e.pointerId, x0: e.clientX, s0: scrollRef.current, moved: false, last: e.clientX, lastT: e.timeStamp, v: 0 };
  }
  function onPointerMove(e: PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 8) return;
      d.moved = true;
      root.current?.setPointerCapture?.(e.pointerId);
      p.onPanning?.(true);
    }
    const raw = d.s0 - dx;
    // Rubber band 30% past the ends.
    const s = raw < 0 ? raw * 0.3 : raw > maxScroll ? maxScroll + (raw - maxScroll) * 0.3 : raw;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = ((d.last - e.clientX) / dt) * 16.67 * 0.8 + d.v * 0.2;
    d.last = e.clientX;
    d.lastT = e.timeStamp;
    set(s);
  }
  function onPointerUp(e: PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
      fling(reduce ? 0 : d.v);
      if (reduce) {
        set(clamp(scrollRef.current));
        p.onPanning?.(false);
      }
    }
  }
  function onWheel(e: WheelEvent) {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!dx) return;
    e.preventDefault();
    stop();
    set(clamp(scrollRef.current + dx));
  }
  function onKeyDown(e: KeyboardEvent) {
    if (!layout || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    animateTo(clamp(scrollRef.current + (e.key === 'ArrowRight' ? 1 : -1) * layout.spacing * 2), 220);
  }
  function onClickCapture(e: MouseEvent) {
    if (justDragged.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }
  // MR-49: a tap on empty ground scatters a few birds.
  function onGroundClick(e: MouseEvent) {
    if (reduce) return;
    const el = root.current;
    if (!el || (e.target as HTMLElement).closest('button')) return;
    const r = el.getBoundingClientRect();
    const id = Math.round(e.timeStamp);
    setBirds((b) => [...b.slice(-2), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setBirds((b) => b.filter((x) => x.id !== id)), 900);
  }

  const cur = layout?.pts[p.current];
  const curScreen = cur ? cur.x - scroll : 0;
  const away = !!layout && !!cur && (curScreen < 24 || curScreen > layout.w - 24);
  const awayLeft = away && curScreen < 24;
  const show = p.show ?? {};
  useEffect(() => {
    p.onAway?.(away);
  }, [away]);

  return (
    <div
      ref={root}
      class={`wp-map${away ? ' is-away' : ''}`}
      data-testid={p.testid ?? 'wp-map'}
      role="region"
      aria-label={t('warPath.ui.mapLabel')}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onClickCapture={onClickCapture}
      onClick={onGroundClick}
      data-scroll-x={Math.round(scroll)}
    >
      {layout ? (
        <>
          <FarLayer layout={layout} regions={p.regions} scroll={scroll} />
          <div class="wp-world" style={{ width: `${layout.worldW}px`, transform: `translate3d(${(-scroll).toFixed(1)}px,0,0)` }}>
            <GroundLayer layout={layout} regions={p.regions} scroll={scroll} />
            <Road layout={layout} nodes={p.nodes} regions={p.regions} show={show} />
            <RoadDeco layout={layout} nodes={p.nodes} scroll={scroll} />
            <Gates layout={layout} regions={p.regions} show={show} scroll={scroll} />
            {p.sides && p.sides.length > 0 ? <SidePaths layout={layout} sides={p.sides} /> : null}
            {p.nodes.map((n) => {
              const pt = layout.pts[n.i]!;
              if (pt.x - scroll < -200 || pt.x - scroll > layout.w + 200) return null;
              return <Node key={n.level.id} n={n} layout={layout} show={show} onTap={p.onNode} />;
            })}
            {(p.sides ?? []).map((n) => {
              const pt = sidePoint(layout, n);
              if (!pt || pt.x - scroll < -200 || pt.x - scroll > layout.w + 200) return null;
              return <Node key={n.level.id} n={n} layout={layout} show={show} onTap={p.onNode} at={pt} />;
            })}
            {layout.pts[show.bearer ?? p.current] ? <Bearer at={layout.pts[show.bearer ?? p.current]!} size={layout.node} /> : null}
          </div>
          <ForegroundLayer layout={layout} regions={p.regions} scroll={scroll} />
          <div class="wp-flocks" aria-hidden="true">
            {[0, 1].map((k) => (
              <span key={k} class={`wp-flock wp-flock--${k}`}>
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            ))}
          </div>
          <div class="wp-map__shade" aria-hidden="true" />
          {birds.map((b) => (
            <span key={b.id} class="wp-birds" style={{ left: `${b.x}px`, top: `${b.y}px` }} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ))}
          {away ? (
            <button
              type="button"
              class={`wp-back ${awayLeft ? 'wp-back--left' : 'wp-back--right'}`}
              // In the plate's row (the plate steps aside while away), clear of the nodes and the top bar.
              style={{ top: `${Math.round(layout.h - p.insets.bottom + 6)}px` }}
              data-testid="wp-back-mine"
              aria-label={t('warPath.ui.backMineLabel')}
              onClick={(e) => {
                e.stopPropagation();
                animateTo(target(p.current), 400);
              }}
            >
              {awayLeft ? <Arrow dir="left" /> : null}
              <span>{t('warPath.ui.backMine', { n: p.nodes[p.current]?.level.index ?? 1 })}</span>
              {awayLeft ? null : <Arrow dir="right" />}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Arrow(p: { dir: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d={p.dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** The far layer: each region's sky and skyline, moving at half speed (A17.7 style parallax). */
function FarLayer(p: { layout: MapLayout; regions: readonly MapRegion[]; scroll: number }) {
  const L = p.layout;
  return (
    <div class="wp-far" style={{ transform: `translate3d(${(-p.scroll * FAR).toFixed(1)}px,0,0)` }} aria-hidden="true">
      {p.regions.map((r, i) => {
        const span = L.spans[i]!;
        const c = (span.start + span.end) / 2;
        const wf = Math.ceil((span.end - span.start) * FAR + L.w * (1 - FAR) + SEAM + (i === 0 || i === p.regions.length - 1 ? L.w : 0));
        const left = Math.floor(FAR * c + (1 - FAR) * (L.w / 2) - wf / 2);
        // Only regions near the view are drawn.
        const screenL = left - p.scroll * FAR;
        if (screenL > L.w + 50 || screenL + wf < -50) return null;
        return (
          <div key={r.age} class={`wp-band${i === 0 ? ' is-first' : ''}${i === p.regions.length - 1 ? ' is-last' : ''}`} style={{ left: `${left}px`, width: `${wf}px` }}>
            <RegionFarMemo age={r.age} w={wf} h={L.h} horizon={L.horizon} ceiling={L.top + 6} />
          </div>
        );
      })}
    </div>
  );
}

const farCache = new Map<string, ComponentChildren>();
function RegionFarMemo(p: { age: AgeId; w: number; h: number; horizon: number; ceiling: number }) {
  const key = `${p.age}|${p.w}|${p.h}|${Math.round(p.horizon)}|${Math.round(p.ceiling)}`;
  let v = farCache.get(key);
  if (!v) {
    v = <RegionFar age={p.age} w={p.w} h={p.h} horizon={p.horizon} ceiling={p.ceiling} />;
    if (farCache.size > 40) farCache.clear();
    farCache.set(key, v);
  }
  return <>{v}</>;
}

const groundCache = new Map<string, ComponentChildren>();
function GroundLayer(p: { layout: MapLayout; regions: readonly MapRegion[]; scroll: number }) {
  const L = p.layout;
  return (
    <div class="wp-ground" aria-hidden="true">
      {p.regions.map((r, i) => {
        const span = L.spans[i]!;
        const first = i === 0;
        const last = i === p.regions.length - 1;
        const left = Math.floor(first ? 0 : span.start - L.spacing * 0.3 - SEAM / 2);
        const right = Math.ceil(last ? L.worldW : span.end + L.spacing * 0.3 + SEAM / 2);
        if (left - p.scroll > L.w + 50 || right - p.scroll < -50) return null;
        const w = right - left;
        const key = `${r.age}|${w}|${L.h}|${left}`;
        let art = groundCache.get(key);
        if (!art) {
          art = (
            <RegionGround
              age={r.age}
              w={w}
              h={L.h}
              horizon={L.horizon}
              roadY={(x) => roadYAt(L.pts, x + left)}
              clear={L.node * 0.62}
              bottomClear={0}
            />
          );
          if (groundCache.size > 40) groundCache.clear();
          groundCache.set(key, art);
        }
        return (
          <div key={r.age} class={`wp-band${first ? ' is-first' : ''}${last ? ' is-last' : ''}`} style={{ left: `${left}px`, width: `${w}px` }}>
            {art}
          </div>
        );
      })}
    </div>
  );
}

/** The road: per region in its colours, lit up to the current node, dotted beyond. */
function Road(p: { layout: MapLayout; nodes: readonly MapNode[]; regions: readonly MapRegion[]; show: MapShow }) {
  const L = p.layout;
  const lastBeaten = p.nodes.reduce((m, n) => (n.state === 'beaten' ? n.i : m), -1);
  const hide = p.show.hideOpen ? (p.nodes.find((n) => n.level.id === p.show.hideOpen)?.i ?? null) : null;
  // The lit road runs to the current node; while a ceremony hides it, to the level just beaten.
  const litEnd = hide !== null ? hide - 1 : Math.min(lastBeaten + 1, L.pts.length - 1);
  // The road comes in from the left edge, past the start camp, to level 1.
  const p0 = L.pts[0];
  const lead = p0 ? [{ x: -L.spacing * 0.5, y: p0.y + L.node * 0.55 }, { x: p0.x - L.spacing * 0.75, y: p0.y + L.node * 0.35 }] : [];
  return (
    <svg class="wp-road" width={L.worldW} height={L.h} aria-hidden="true">
      {p.regions.map((r, ri) => {
        const th = REGION_THEMES[r.age];
        const to = Math.min(r.to + 1, L.pts.length - 1);
        const seg = ri === 0 ? [...lead, ...L.pts.slice(r.from, to + 1)] : L.pts.slice(r.from, to + 1);
        const d = smooth(seg);
        return (
          <g key={r.age}>
            {/* worn, trodden shoulders: the road's edges are not a clean line */}
            <path d={d} class="wp-road__wear" style={{ stroke: th.roadEdge }} />
            <path d={d} class="wp-road__shadow" />
            <path d={d} class="wp-road__edge" style={{ stroke: th.roadEdge }} />
            <path d={d} class="wp-road__bed" style={{ stroke: th.road }} />
            <path d={d} class="wp-road__dots" />
          </g>
        );
      })}
      {litEnd > 0 ? <path d={smooth(L.pts.slice(0, litEnd + 1))} class="wp-road__lit" /> : null}
      {p.show.draw !== null && p.show.draw !== undefined && L.pts[p.show.draw + 1] ? (
        <path d={smooth([L.pts[p.show.draw]!, L.pts[p.show.draw + 1]!])} class="wp-road__lit wp-road__lit--draw" pathLength={100} />
      ) : null}
    </svg>
  );
}

/** The margin a pinned region name keeps from the view's left edge (px). */
const LABEL_PIN = 14;

/**
 * Region gates on the road and the region banners (4.1: "a gate arch stands on the road"). A region's
 * name rides along the view's left edge while its region fills the view (so it never hangs half off
 * the screen), then leaves with the region.
 */
function Gates(p: { layout: MapLayout; regions: readonly MapRegion[]; show: MapShow; scroll: number }) {
  const { t } = useKit();
  const L = p.layout;
  const widths = useRef<Record<string, number>>({});
  return (
    <>
      {p.regions.map((r, i) => {
        const first = L.pts[r.from]!;
        const prev = i > 0 ? L.pts[r.from - 1]! : null;
        const gx = prev ? (prev.x + first.x) / 2 : null;
        const gy = prev ? (prev.y + first.y) / 2 : 0;
        const open = i === 0 || p.regions[i - 1]!.done;
        const lw = widths.current[r.age] ?? 180;
        const natural = gx ?? first.x - L.spacing * 1.2;
        const span = L.spans[i]!;
        // The label's centre: its own spot, or pinned to the view's left edge while the region is there.
        const cx = Math.max(natural, Math.min(p.scroll + LABEL_PIN + lw / 2, span.end - lw / 2 - 12));
        return (
          <div key={r.age}>
            {gx !== null ? (
              <div
                class={`wp-gate${open ? ' is-open' : ''}${p.show.gate === i ? ' is-opening' : ''}`}
                style={{ left: `${gx}px`, top: `${gy}px`, '--gate-accent': REGION_THEMES[r.age].accent }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 80 90" width={L.node * 1.25} height={L.node * 1.4}>
                  <path d="M6 88 V30 Q40 -6 74 30 V88 H60 V38 Q40 14 20 38 V88 Z" fill="#4b4238" stroke="#1b1712" stroke-width="3" />
                  <path d="M6 88 V30 Q40 -6 74 30 V40 Q40 4 6 40 Z" fill="#7a6a56" />
                  <g class="wp-gate__bars">
                    {[26, 34, 42, 50].map((x) => (
                      <path key={x} d={`M${x} 34 V88`} stroke="#2a241e" stroke-width="3" />
                    ))}
                  </g>
                  <path class="wp-gate__flag" d="M40 4 V-14 M40 -14 h14 l-4 5 l4 5 h-14" stroke="#1b1712" stroke-width="2" fill="var(--gate-accent)" />
                </svg>
              </div>
            ) : null}
            <div
              class={`wp-regionName${r.done ? ' is-done' : ''}${gx === null ? ' is-start' : ''}${cx > natural + 1 ? ' is-pinned' : ''}`}
              ref={(el) => {
                if (el && el.offsetWidth > 0) widths.current[r.age] = el.offsetWidth;
              }}
              style={{
                left: `${cx.toFixed(1)}px`,
                top: `${Math.max(L.yMin - L.node * 0.2, gx === null ? first.y - L.node * 1.1 : Math.min(first.y, prev!.y) - L.node * 1.55)}px`,
              }}
              data-testid={`wp-region-${r.age}`}
            >
              <span class="wp-regionName__text" data-clip-check="">{t(regionNameKey(r.age))}</span>
              <span class="wp-regionName__stars">
                <StarIcon size={14} />
                {r.stars}/{r.max}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** A node: a disc (normal), a shield (Hard), or the boss banner with its General (4.1 table). */
/**
 * X0: where a side node sits: above its parent node and a little ahead (the second side node of a region
 * hangs off L8, the first off L5), so it reads as a branch off the road.
 */
function sidePoint(L: MapLayout, n: MapNode): { x: number; y: number } | null {
  const pt = L.pts[n.i];
  if (!pt) return null;
  const up = Math.max(L.node * 1.35, 64);
  return { x: pt.x + L.spacing * 0.42, y: Math.max(L.node * 0.75, pt.y - up) };
}

/** X0: the dashed branch path from each side node's parent to the side node. */
function SidePaths(p: { layout: MapLayout; sides: readonly MapNode[] }) {
  const L = p.layout;
  return (
    <svg class="wp-sidepaths" width={L.worldW} height={L.h} aria-hidden="true">
      {p.sides.map((n) => {
        const a = L.pts[n.i];
        const b = sidePoint(L, n);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2 - L.spacing * 0.08;
        const d = `M${a.x.toFixed(1)},${(a.y - L.node * 0.3).toFixed(1)} Q${mx.toFixed(1)},${((a.y + b.y) / 2).toFixed(1)} ${b.x.toFixed(1)},${(b.y + L.node * 0.32).toFixed(1)}`;
        return <path key={n.level.id} d={d} class={`wp-sidepath${n.state === 'locked' ? ' is-locked' : ''}`} />;
      })}
    </svg>
  );
}

function Node(p: { n: MapNode; layout: MapLayout; show: MapShow; onTap: Props['onNode']; at?: { x: number; y: number } }) {
  const { t } = useKit();
  const n = p.n;
  const L = p.layout;
  const pt = p.at ?? L.pts[n.i]!;
  const side = n.kind === 'side';
  const boss = n.kind === 'boss';
  const hard = n.kind === 'elite';
  const hidden = p.show.hideOpen === n.level.id;
  const state = hidden ? 'locked' : n.state;
  const stars = p.show.stars?.[n.level.id] ?? n.stars;
  const stamp = p.show.stamp && p.show.stamp.id === n.level.id ? p.show.stamp.from : null;
  const size = boss ? L.boss : side ? Math.round(L.node * 0.82) : L.node;
  const mist = state === 'locked' && n.ahead > MIST_AHEAD && !boss;
  const name = t(levelNameKey(n.level.id));
  const stateText =
    state === 'beaten' ? t('warPath.ui.stateBeaten', { stars }) : state === 'current' ? t('warPath.ui.stateCurrent') : t('warPath.ui.stateLocked');
  return (
    <button
      type="button"
      class={`wp-node wp-node--${state} wp-node--k-${n.kind}${boss ? ' wp-node--boss' : ''}${hard ? ' wp-node--hard' : ''}${side ? ' wp-node--side' : ''}${mist ? ' is-mist' : ''}${p.show.drop === n.level.id ? ' is-dropping' : ''}`}
      data-kind={n.kind}
      style={{ left: `${pt.x - size / 2}px`, top: `${pt.y - size / 2}px`, width: `${size}px`, height: `${size}px`, '--wp-accent': REGION_THEMES[n.level.region].accent }}
      data-testid={`wp-node-${n.level.id}`}
      data-state={state}
      aria-label={side ? t('warPath.ui.sideLabel', { name, state: stateText }) : t('warPath.ui.nodeLabel', { n: n.level.index, name, state: stateText })}
      aria-current={state === 'current' ? 'step' : undefined}
      onClick={(e) => {
        e.stopPropagation();
        p.onTap(n, e.currentTarget as HTMLElement);
      }}
    >
      {boss ? <BossLair size={size} lit={state !== 'locked'} /> : null}
      {hard ? <EliteCrest size={size} /> : null}
      {state === 'current' ? (
        <>
          <i class="wp-node__plinth" aria-hidden="true" />
          <i class="wp-node__ring" aria-hidden="true" />
          <i class="wp-node__ring wp-node__ring--2" aria-hidden="true" />
          <i class={`wp-node__marker${hard || boss ? ' is-high' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M4 7h16l-8 11z" fill="#ffd466" stroke="#1b140d" stroke-width="2" stroke-linejoin="round" />
              <path d="M7 8.5h9" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7" />
            </svg>
          </i>
        </>
      ) : null}
      {n.kind === 'treasure' ? <Chest open={state === 'beaten'} /> : null}
      {n.kind === 'story' && state !== 'beaten' ? <Scroll /> : null}
      {p.show.drop === n.level.id ? <UnlockBurst /> : null}
      <span class="wp-node__face">
        {boss ? (
          <span class="wp-node__portrait">
            <GeneralPortrait generalId={n.level.general} size={Math.round(size * 0.74)} />
          </span>
        ) : (
          <span class="wp-node__num">{side ? <SideGlyph /> : n.level.index}</span>
        )}
        {state === 'locked' ? (
          <span class="wp-node__lock" aria-hidden="true">
            <LockIcon size={boss ? 22 : 18} />
          </span>
        ) : null}
      </span>
      {boss ? <span class="wp-node__tag wp-node__tag--boss" data-tag="">{t('warPath.ui.boss')}</span> : null}
      {hard ? <span class="wp-node__tag" data-tag="">{t('warPath.ui.hard')}</span> : null}
      {n.crown > 0 && state === 'beaten' ? (
        <span class={`wp-node__crown wp-node__crown--${n.crown}`} aria-hidden="true">
          <CrownIcon size={16} />
        </span>
      ) : null}
      {state === 'beaten' || stamp !== null ? (
        <span class="wp-node__stars" aria-hidden="true">
          {[1, 2, 3].map((k) => (
            <i
              key={k}
              class={`wp-star${k <= stars ? ' is-on' : ''}${stamp !== null && k > stamp && k <= stars ? ' is-stamp' : ''}`}
              style={stamp !== null && k > stamp ? { animationDelay: `${(k - stamp - 1) * 200}ms` } : undefined}
            >
              <StarIcon size={size > 60 ? 18 : 15} filled={k <= stars} />
            </i>
          ))}
        </span>
      ) : null}
    </button>
  );
}

/** X0: the side-node glyph: a small forked path sign. */
function SideGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 21V9" stroke="#1b140d" stroke-width="3" stroke-linecap="round" />
      <path d="M12 9L6 4M12 9l6-5" stroke="#1b140d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 21V9" stroke="#fff3d6" stroke-width="1.4" stroke-linecap="round" />
      <path d="M12 9L6 4M12 9l6-5" stroke="#fff3d6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** The player's banner-bearer on the current node (MR-48): a small figure with the team banner. */
function Bearer(p: { at: { x: number; y: number }; size: number }) {
  const s = p.size / 56;
  return (
    <div class="wp-bearer" style={{ transform: `translate3d(${(p.at.x - p.size * 0.5 - 30 * s).toFixed(1)}px, ${(p.at.y - 52 * s).toFixed(1)}px, 0) scale(${s.toFixed(2)})` }} data-testid="wp-bearer" aria-hidden="true">
      <svg viewBox="0 0 40 64" width="40" height="64">
        <ellipse cx="18" cy="61" rx="11" ry="3" fill="#000" opacity=".35" />
        <g class="wp-bearer__body">
          <path d="M14 60 L16 44 M22 60 L20 44" stroke="#2a2118" stroke-width="4" stroke-linecap="round" />
          <path d="M11 44 Q10 30 18 28 Q26 30 25 44 Z" fill="#6b4a2c" stroke="#1b140d" stroke-width="1.5" />
          <path d="M12 34 h12" stroke="#c9a15a" stroke-width="2" />
          <circle cx="18" cy="23" r="6" fill="#e8b98e" stroke="#1b140d" stroke-width="1.5" />
          <path d="M12 21 Q18 13 24 21 Z" fill="#8a6a48" stroke="#1b140d" stroke-width="1.2" />
          <path d="M27 60 V6" stroke="#3b2a1e" stroke-width="2.6" stroke-linecap="round" />
          <path d="M25 34 L27 34" stroke="#e8b98e" stroke-width="4" stroke-linecap="round" />
          <path class="wp-bearer__flag" d="M27 7 H40 L36 13 L40 19 H27 Z" fill="var(--ui-team-me)" stroke="#0f1218" stroke-width="1.2" />
        </g>
      </svg>
    </div>
  );
}

/** Parallax factor of the foreground layer (faster than the road: it is nearer). */
const NEAR = 1.3;

/**
 * The near layer (owner decision 2026-09-30): dark silhouettes of the region's plants and rocks along
 * the bottom edge, moving faster than the road, so the map reads in depth. Never over the road band.
 */
function ForegroundLayer(p: { layout: MapLayout; regions: readonly MapRegion[]; scroll: number }) {
  const L = p.layout;
  return (
    <div class="wp-near" style={{ transform: `translate3d(${(-p.scroll * NEAR).toFixed(1)}px,0,0)` }} aria-hidden="true">
      {p.regions.map((r, i) => {
        const span = L.spans[i]!;
        const left = Math.floor(span.start * NEAR);
        const w = Math.ceil((span.end - span.start) * NEAR);
        const screenL = left - p.scroll * NEAR;
        if (screenL > L.w + 60 || screenL + w < -60) return null;
        return (
          <div key={r.age} class="wp-near__band" style={{ left: `${left}px`, width: `${w}px` }}>
            <Foreground age={r.age} w={w} h={Math.max(40, Math.min(90, L.h - L.yMax - L.node * 0.8))} />
          </div>
        );
      })}
    </div>
  );
}

/** Lanterns along the road, one between each pair of nodes: lit on the way walked, dark ahead. */
function RoadDeco(p: { layout: MapLayout; nodes: readonly MapNode[]; scroll: number }) {
  const L = p.layout;
  const lastBeaten = p.nodes.reduce((m, n) => (n.state === 'beaten' ? n.i : m), -1);
  // The start camp beside the road's lead-in, before level 1.
  const p0 = L.pts[0];
  const camp = p0 ? { x: p0.x - L.spacing * 1.2, y: Math.min(L.h - 8, p0.y + L.node * 1.25) } : null;
  return (
    <svg class="wp-deco" width={L.worldW} height={L.h} aria-hidden="true">
      {camp && camp.x > 70 && camp.x - p.scroll < L.w + 120 ? <StartCamp x={camp.x} y={camp.y} s={L.node / 64} t={REGION_THEMES[p.nodes[0]!.level.region]} /> : null}
      {p.nodes.slice(0, -1).map((n) => {
        const a = L.pts[n.i]!;
        const b = L.pts[n.i + 1]!;
        if (b.x - p.scroll < -80 || a.x - p.scroll > L.w + 80) return null;
        if (p.nodes[n.i + 1]!.level.region !== n.level.region) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        // Beside the road, on the side away from the slope's inside.
        const up = n.i % 2 === 0;
        const y = up ? my - L.node * 0.42 : my + L.node * 0.5;
        return <Lantern key={n.level.id} x={mx} y={y} age={n.level.region} lit={n.i <= lastBeaten} s={L.node / 56} />;
      })}
    </svg>
  );
}
