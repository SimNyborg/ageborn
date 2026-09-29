/**
 * The minimap strip and the off-screen badges (DESIGN A17.5, A17.6).
 *
 * **Minimap strip** (replaces the front-line strip under the match clock): the whole world, x -180 to
 * 2,180, drawn on a small canvas from the view's interpolated positions. Back to front: territory
 * (your colour from your gate to your front, theirs from theirs, neutral between), turret-cover
 * brackets 480 lu from each gate while that side owns a turret, the bases (age medallion in team colour
 * with an HP ring; red flash when hit, gold flash on an evolve the camera did not show), unit dots (your
 * units circles, theirs diamonds; bigger for Heavies and Epics, a white ring for Legendaries; air above
 * ground), the fronts (2 px ticks), power telegraphs and zones (pulsing segments in the caster's colour),
 * and the camera window (white rounded rectangle, 15% fill). A tap centres the camera there (300 ms), a
 * drag scrubs it 1:1; a power dragged from the tray can be dropped on it.
 *
 * The base button (house) sits at its left end, with a hammer badge while an owned mount is empty and
 * the cheapest loadout turret is affordable; the front button (crossed swords) at its right end, with a
 * soft "Follow" outline while the camera is Manual.
 *
 * **Edge badges**: round 44 px badges with a chevron at the left or right edge of the lane band, at 35%
 * of its height, up to 3 per edge (newest on top, 12 px apart): base under attack, power incoming (a
 * countdown ring during the telegraph), enemy Legendary. A tap jumps the camera there.
 */
import type { AgeId } from '@/contracts';
import type { HudMinimap } from './bridge';
import type { HudCtx } from './context';
import { useEffect, useRef, useState } from 'preact/hooks';
import { AgeGlyph, BaseAlertIcon, BoltIcon, ChevronIcon, CrownIcon, HammerIcon, HouseIcon, SwordsIcon } from './icons';
import { mountMenu } from './model';
import { usePortrait } from './usePortrait';

/** Redraw rate of the strip (A17.5 asks for at least 10 Hz; 30 Hz keeps the camera window smooth). */
export const MINIMAP_FRAME_MS = 33;
/** Badges refresh at 10 Hz. */
export const BADGE_FRAME_MS = 100;
/** A tap on the strip moves at most this far before it becomes a scrub. */
const SCRUB_START_PX = 6;
/** Base flashes: red for 1 s when hit (at most once per 2 s), gold for 1.2 s on an unseen evolve. */
const HIT_FLASH_MS = 1000;
const EVOLVE_FLASH_MS = 1200;

/** Strip x (px) of world x for a strip `width` px wide. */
export function minimapX(x: number, m: Pick<HudMinimap, 'worldLeft' | 'worldRight'>, width: number): number {
  return ((x - m.worldLeft) / Math.max(1, m.worldRight - m.worldLeft)) * width;
}

/** World x of strip x (px). */
export function minimapWorldX(px: number, m: Pick<HudMinimap, 'worldLeft' | 'worldRight'>, width: number): number {
  const t = Math.max(0, Math.min(1, px / Math.max(1, width)));
  return m.worldLeft + t * (m.worldRight - m.worldLeft);
}

/** True when an owned mount is empty and the cheapest loadout turret is affordable (the hammer badge, A17.6). */
export function hammerBadge(c: Pick<HudCtx, 'm' | 'config' | 'side'>): boolean {
  if (c.m.phase === 'ended') return false;
  return c.m.mounts.some((mm) => mm.owned && mm.state === 'empty' && mountMenu(c.m, c.config, c.side, mm.index).build.some((o) => o.affordable));
}

function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function withAlpha(color: string, a: number): string {
  // Colours come from CSS as #rrggbb (the HUD's team colour table).
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m?.[1]) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** Draws one frame of the strip (A17.5 content, back to front). `t` is a clock in ms for pulses. */
export function drawMinimap(
  g: CanvasRenderingContext2D,
  m: HudMinimap,
  w: number,
  h: number,
  colors: { me: string; foe: string },
  t: number,
  big: boolean,
  /** Your Hold flag (A18.4.2), own-side p in lu, or null when not holding. */
  flagP: number | null = null,
): void {
  g.clearRect(0, 0, w, h);
  const X = (x: number): number => minimapX(x, m, w);
  const col = (side: 0 | 1): string => (side === m.mySide ? colors.me : colors.foe);
  const leftGate = X(0);
  const rightGate = X(m.lane);
  const groundY = h * 0.66;
  const airY = h * 0.27;

  // 1. Territory: side 0 from its gate to its front, side 1 likewise; neutral between.
  const f0 = m.fronts[0];
  const f1 = m.fronts[1];
  const grad0 = g.createLinearGradient(0, 0, 0, h);
  grad0.addColorStop(0, withAlpha(col(0), 0.78));
  grad0.addColorStop(1, withAlpha(col(0), 0.5));
  const grad1 = g.createLinearGradient(0, 0, 0, h);
  grad1.addColorStop(0, withAlpha(col(1), 0.78));
  grad1.addColorStop(1, withAlpha(col(1), 0.5));
  g.fillStyle = grad0;
  g.fillRect(0, 0, f0 !== null ? X(f0) : leftGate, h);
  g.fillStyle = grad1;
  const r1 = f1 !== null ? X(f1) : rightGate;
  g.fillRect(r1, 0, w - r1, h);
  // A soft glow where the fronts meet.
  if (f0 !== null && f1 !== null && f1 - f0 < 60) {
    const cx = X((f0 + f1) / 2);
    const glow = g.createRadialGradient(cx, h / 2, 0, cx, h / 2, h * 1.2);
    glow.addColorStop(0, 'rgba(255, 244, 200, 0.75)');
    glow.addColorStop(1, 'rgba(255, 244, 200, 0)');
    g.fillStyle = glow;
    g.fillRect(cx - h * 1.2, 0, h * 2.4, h);
  }

  // 2. Turret cover brackets: 480 lu from each gate while that side owns a turret.
  for (const side of [0, 1] as const) {
    if (!m.cover[side]) continue;
    const gx = side === 0 ? leftGate : rightGate;
    const bx = X(side === 0 ? m.coverLu : m.lane - m.coverLu);
    g.fillStyle = withAlpha(col(side), 0.16);
    g.fillRect(Math.min(gx, bx), h - 3, Math.abs(bx - gx), 3);
    g.strokeStyle = withAlpha(col(side), 0.95);
    g.lineWidth = 1.5;
    g.beginPath();
    const dir = side === 0 ? -1 : 1;
    g.moveTo(bx + dir * 3, 1.5);
    g.lineTo(bx, 1.5);
    g.lineTo(bx, h - 1.5);
    g.lineTo(bx + dir * 3, h - 1.5);
    g.stroke();
  }

  // Gate lines.
  g.fillStyle = 'rgba(27, 19, 48, 0.55)';
  g.fillRect(leftGate - 0.5, 0, 1, h);
  g.fillRect(rightGate - 0.5, 0, 1, h);

  // 6. Power telegraphs and zones (under the dots so the units stay readable).
  const pulse = 0.5 + 0.5 * Math.sin(t / 110);
  for (const z of m.zones) {
    const half = Math.max(10, z.width / 2);
    const x0 = X(z.x - half);
    const x1 = X(z.x + half);
    const a = z.kind === 'preview' ? 0.55 : z.kind === 'telegraph' ? 0.3 + 0.35 * pulse : 0.28;
    g.fillStyle = withAlpha(col(z.side), a);
    roundRect(g, x0, 1, Math.max(3, x1 - x0), h - 2, 3);
    g.fill();
    g.strokeStyle = z.kind === 'preview' ? '#ffffff' : withAlpha('#fff4c8', 0.5 + 0.4 * pulse);
    g.lineWidth = z.kind === 'preview' ? 1.6 : 1;
    g.stroke();
  }

  // 5. Fronts: a 2 px tick in team colour (under the dots, so the frontmost unit stays visible).
  for (const side of [0, 1] as const) {
    const fx = m.fronts[side];
    if (fx === null) continue;
    const x = X(fx);
    g.fillStyle = 'rgba(255, 250, 235, 0.55)';
    g.fillRect(x - 2, 0, 4, h);
    g.fillStyle = col(side);
    g.fillRect(x - 1, 0, 2, h);
  }

  // 4. Units: yours circles, theirs diamonds; air on a row above the ground row.
  const sizes = big ? [4, 5, 7] : [3, 4, 6];
  for (const u of m.units) {
    const x = X(u.x);
    const y = u.air ? airY : groundY;
    const d = sizes[u.size] ?? 3;
    const r = d / 2;
    g.fillStyle = col(u.side);
    g.strokeStyle = 'rgba(20, 12, 36, 0.9)';
    g.lineWidth = 1;
    g.beginPath();
    if (u.side === m.mySide) {
      g.arc(x, y, r + 0.3, 0, Math.PI * 2);
    } else {
      const q = r + 0.8;
      g.moveTo(x, y - q);
      g.lineTo(x + q, y);
      g.lineTo(x, y + q);
      g.lineTo(x - q, y);
      g.closePath();
    }
    g.fill();
    g.stroke();
    if (u.size === 2) {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, r + 2, 0, Math.PI * 2);
      g.stroke();
    }
  }

  // The Hold flag: a small pennant on a pole in your colour (A18.4.2).
  if (flagP !== null) {
    const fx = X(m.mySide === 0 ? flagP : m.lane - flagP);
    const dir = m.mySide === 0 ? 1 : -1;
    g.strokeStyle = 'rgba(20, 12, 36, 0.95)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(fx, h - 1);
    g.lineTo(fx, 1);
    g.stroke();
    g.strokeStyle = '#fff8e8';
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = colors.me;
    g.strokeStyle = 'rgba(20, 12, 36, 0.95)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(fx, 1);
    g.lineTo(fx + dir * Math.max(6, h * 0.45), 1 + h * 0.2);
    g.lineTo(fx, 1 + h * 0.42);
    g.closePath();
    g.fill();
    g.stroke();
  }

  // 7. The camera window.
  const vx0 = X(m.view.left);
  const vx1 = X(m.view.right);
  roundRect(g, vx0 + 1, 1, Math.max(4, vx1 - vx0 - 2), h - 2, Math.min(5, h / 3));
  g.fillStyle = 'rgba(255, 255, 255, 0.15)';
  g.fill();
  g.strokeStyle = 'rgba(20, 12, 36, 0.6)';
  g.lineWidth = 3.5;
  g.stroke();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;
  g.stroke();
}

interface StripUi {
  following: boolean;
  autoCamera: boolean;
  hp: [number, number];
  hit: [boolean, boolean];
  evolve: [boolean, boolean];
  ages: [AgeId, AgeId];
}

function stripUi(m: HudMinimap): StripUi {
  const flash = (ago: number | null, ms: number): boolean => ago !== null && ago <= ms;
  return {
    following: m.following,
    autoCamera: m.autoCamera,
    hp: [m.bases[0].hpBp, m.bases[1].hpBp],
    hit: [flash(m.bases[0].hitAgoMs, HIT_FLASH_MS), flash(m.bases[1].hitAgoMs, HIT_FLASH_MS)],
    evolve: [flash(m.bases[0].evolveAgoMs, EVOLVE_FLASH_MS), flash(m.bases[1].evolveAgoMs, EVOLVE_FLASH_MS)],
    ages: [m.bases[0].age, m.bases[1].age],
  };
}

function sameUi(a: StripUi | null, b: StripUi): boolean {
  if (!a) return false;
  return (
    a.following === b.following &&
    a.autoCamera === b.autoCamera &&
    Math.round(a.hp[0] / 100) === Math.round(b.hp[0] / 100) &&
    Math.round(a.hp[1] / 100) === Math.round(b.hp[1] / 100) &&
    a.hit[0] === b.hit[0] &&
    a.hit[1] === b.hit[1] &&
    a.evolve[0] === b.evolve[0] &&
    a.evolve[1] === b.evolve[1] &&
    a.ages[0] === b.ages[0] &&
    a.ages[1] === b.ages[1]
  );
}

function BaseCap(p: { side: 0 | 1; mine: boolean; ui: StripUi; label: string }) {
  const { side, ui } = p;
  return (
    <span
      class={`hud-mm-base hud-mm-base-${side === 0 ? 'l' : 'r'} is-${p.mine ? 'me' : 'foe'}${ui.hit[side] ? ' is-hit' : ''}${ui.evolve[side] ? ' is-evolve' : ''}`}
      style={{ '--hp': ui.hp[side] / 10000 }}
      data-testid={`hud-mm-base-${p.mine ? 'me' : 'foe'}`}
      role="img"
      aria-label={p.label}
    >
      <span class="hud-mm-base-core">
        <AgeGlyph age={ui.ages[side]} size={12} />
      </span>
    </span>
  );
}

export function Minimap(p: { c: HudCtx }) {
  const { c } = p;
  const view = c.view;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ui, setUi] = useState<StripUi | null>(null);
  const uiRef = useRef<StripUi | null>(null);
  const snap = useRef<HudMinimap | null>(null);
  const press = useRef<{ id: number; x: number; scrub: boolean; grab: number } | null>(null);
  // The Hold flag for the strip, read by the draw loop.
  const flag = useRef<number | null>(null);
  flag.current = c.m.me.stance === 'hold' && c.m.me.holdP !== undefined && c.m.phase !== 'ended' ? c.m.me.holdP : null;

  useEffect(() => {
    if (!view?.minimap) return undefined;
    let raf = 0;
    let last = -Infinity;
    const frame = (now: number): void => {
      raf = requestAnimationFrame(frame);
      if (now - last < MINIMAP_FRAME_MS) return;
      last = now;
      const m = view.minimap?.() ?? null;
      snap.current = m;
      const el = canvas.current;
      if (!m || !el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (el.width !== bw || el.height !== bh) {
        el.width = bw;
        el.height = bh;
      }
      const g = el.getContext('2d');
      if (g) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawMinimap(g, m, w, h, { me: cssVar(el, '--hud-me', '#3b82f6'), foe: cssVar(el, '--hud-foe', '#f97316') }, now, h >= 20, flag.current);
      }
      const next = stripUi(m);
      if (!sameUi(uiRef.current, next)) {
        uiRef.current = next;
        setUi(next);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  if (!view?.minimap) return null;
  const m = snap.current;
  const worldAt = (clientX: number): number | null => {
    const el = canvas.current;
    const mm = snap.current;
    if (!el || !mm) return null;
    const r = el.getBoundingClientRect();
    return minimapWorldX(clientX - r.left, mm, r.width);
  };
  const hammer = hammerBadge(c);
  const following = ui?.following ?? true;
  const mySide = c.side;
  const foeSide = mySide === 0 ? 1 : 0;

  return (
    <div class={`hud-minimap${following ? ' is-following' : ' is-manual'}`} data-testid="hud-minimap" data-following={following}>
      <button
        class="hud-mm-btn hud-mm-home"
        data-testid="hud-mm-home"
        aria-label={c.t('hud.camera.base')}
        title={c.t('hud.camera.base')}
        onClick={() => {
          c.audio?.play('ui_click');
          view.cameraCommand?.({ t: 'base' });
        }}
      >
        <HouseIcon size={c.compact ? 18 : 21} />
        {hammer ? (
          <span class={`hud-mm-hammer${c.pulse === 'mount' ? ' is-pulse' : ''}`} data-testid="hud-mm-hammer" {...(c.pulse === 'mount' ? { 'data-pulse': '' } : {})}>
            <HammerIcon size={c.compact ? 11 : 13} />
          </span>
        ) : null}
        {c.keys ? <kbd class="hud-key">H</kbd> : null}
      </button>
      <div
        class="hud-mm-strip"
        data-testid="hud-minimap-strip"
        role="group"
        aria-label={c.t('hud.camera.map')}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          const x = worldAt(e.clientX);
          const mm = snap.current;
          if (x === null || !mm) return;
          const inside = x >= mm.view.left && x <= mm.view.right;
          press.current = { id: e.pointerId, x: e.clientX, scrub: false, grab: inside ? (mm.view.left + mm.view.right) / 2 - x : 0 };
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          view.cameraHold?.('minimap', true);
        }}
        onPointerMove={(e) => {
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId) return;
          if (!pr.scrub && Math.abs(e.clientX - pr.x) < SCRUB_START_PX) return;
          pr.scrub = true;
          const x = worldAt(e.clientX);
          if (x !== null) view.cameraCommand?.({ t: 'scrub', x: x + pr.grab });
        }}
        onPointerUp={(e) => {
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId) return;
          press.current = null;
          view.cameraHold?.('minimap', false);
          if (pr.scrub) return;
          const x = worldAt(e.clientX);
          if (x !== null) {
            c.audio?.play('ui_click');
            view.cameraCommand?.({ t: 'center', x });
          }
        }}
        onPointerCancel={() => {
          press.current = null;
          view.cameraHold?.('minimap', false);
        }}
      >
        <canvas ref={canvas} class="hud-mm-canvas" data-minimap="1" data-world-left={m?.worldLeft ?? -180} data-world-right={m?.worldRight ?? 2180} />
        {ui ? (
          <>
            <BaseCap side={0} mine={mySide === 0} ui={ui} label={c.t(mySide === 0 ? 'hud.camera.yourBase' : 'hud.camera.theirBase')} />
            <BaseCap side={1} mine={mySide === 1} ui={ui} label={c.t(mySide === 1 ? 'hud.camera.yourBase' : 'hud.camera.theirBase')} />
          </>
        ) : null}
      </div>
      <button
        class={`hud-mm-btn hud-mm-front${following ? '' : ' is-manual'}`}
        data-testid="hud-mm-front"
        data-foe={foeSide}
        aria-label={c.t('hud.camera.follow')}
        title={c.t('hud.camera.follow')}
        aria-pressed={following}
        onClick={() => {
          c.audio?.play('ui_click');
          view.cameraCommand?.({ t: 'front' });
        }}
      >
        <SwordsIcon size={c.compact ? 18 : 21} />
        {following ? null : <span class="hud-mm-follow">{c.t('hud.camera.followShort')}</span>}
        {c.keys ? <kbd class="hud-key">J</kbd> : null}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Off-screen badges
// ---------------------------------------------------------------------------------------------

/** Badge size and spacing (A17.5). */
export const BADGE_PX = 44;
export const BADGE_GAP_PX = 12;

function BadgeIcon(p: { c: HudCtx; kind: 'base' | 'power' | 'legendary'; card: string | undefined }) {
  const url = usePortrait(p.c.portrait, p.kind === 'base' ? null : (p.card ?? null), 'none', 40);
  if (url) return <img src={url} alt="" draggable={false} />;
  if (p.kind === 'base') return <BaseAlertIcon size={26} />;
  if (p.kind === 'legendary') return <CrownIcon size={24} />;
  return <BoltIcon size={24} />;
}

export function EdgeBadges(p: { c: HudCtx }) {
  const { c } = p;
  const view = c.view;
  const [snap, setSnap] = useState<Pick<HudMinimap, 'badges' | 'band' | 'mySide'> | null>(null);
  const key = useRef('');
  useEffect(() => {
    if (!view?.minimap) return undefined;
    const tick = (): void => {
      const m = view.minimap?.() ?? null;
      if (!m) return;
      const k = m.badges.map((b) => `${b.id}:${b.edge}:${b.countdown === null ? '-' : Math.round(b.countdown * 20)}`).join('|') + `@${Math.round(m.band.y)}:${Math.round(m.band.h)}`;
      if (k === key.current) return;
      key.current = k;
      setSnap({ badges: m.badges, band: m.band, mySide: m.mySide });
    };
    tick();
    const id = setInterval(tick, BADGE_FRAME_MS);
    return () => clearInterval(id);
  }, [view]);
  if (!snap || snap.badges.length === 0 || c.m.phase === 'ended') return null;
  const top = snap.band.y + snap.band.h * 0.35 - BADGE_PX / 2;
  const count = { left: 0, right: 0 };
  return (
    <div class="hud-badges" data-testid="hud-badges">
      {snap.badges.map((b) => {
        const i = count[b.edge]++;
        const team = b.side === snap.mySide ? 'me' : 'foe';
        const label = c.t(`hud.badge.${b.kind}`);
        return (
          <button
            key={b.id}
            class={`hud-badge hud-badge-${b.edge} hud-badge-${b.kind} is-${team}${b.countdown !== null ? ' is-counting' : ''}`}
            data-testid={`hud-badge-${b.kind}`}
            data-edge={b.edge}
            style={{ top: `${top + i * (BADGE_PX + BADGE_GAP_PX)}px`, '--countdown': b.countdown ?? 0 }}
            aria-label={label}
            title={label}
            onClick={() => {
              c.audio?.play('ui_click');
              view?.cameraCommand?.({ t: 'center', x: b.x });
            }}
          >
            <i class="hud-badge-ring" />
            <span class="hud-badge-core">
              <BadgeIcon c={c} kind={b.kind} card={b.card} />
            </span>
            <span class="hud-badge-chevron">
              <ChevronIcon size={16} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
