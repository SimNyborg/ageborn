/**
 * The Fort button (DESIGN A16.14.7, F2): one per battle, in the placement dock between the stance and
 * the powers, because it is dragged onto the lane like them and never trains anything.
 *
 * Face: a rounded square in a **stone frame** (never a rarity frame, so it never reads as a unit card)
 * with a pad plinth on its bottom edge; the fort's art; the kind glyph top-right; the cost chip top-left
 * (red with a filling gold underline while gold is short); a recharge ring round the square with the
 * seconds left; "2/2" while the alive cap is reached; the pop cost under the art; "Forts crumble" in
 * Siege.
 *
 * - **Drag** onto a pad (the shared drag of A18.9.2): on pick-up the pads the kind may use light up
 *   (`FortLane.tsx`; Field pads are not drawn for walls, towers and traps): green for safe, amber
 *   "Builds under fire", grey with the reason. The ghost snaps to a legal pad within 24 px with a small
 *   bump and a tick; near a screen edge the camera scrolls. Releasing on a legal pad places the fort
 *   (MR-70b: the ghost contracts, "−150" floats off the gold, the ring drains, the scaffold rises with
 *   dust); anywhere else, or over the HUD, it goes back and costs nothing.
 * - **Tap** starts aiming (the pads light up): tap a pad to place, tap the minimap to take the legal pad
 *   nearest that point, tap the button again or press Escape to cancel. **D** places on the most forward
 *   safe pad (`Hud.tsx` keys).
 * - **Long-press** (450 ms) or hover shows the tip: name, kind, cost, pop, the key numbers, the pads,
 *   "Heavies break it ×2", "Crumbles after 60 s" and the kind's traits.
 * - A denied press says why (MR-03): "Ready in 12 s", "Need 40 gold", "Army full", "2 forts up", "One
 *   camp at a time", "No clear pad", "Siege: forts crumble".
 * - The first time a fort is ready, once per player: the button breathes once and "Drag a wall onto a
 *   glowing pad" shows over the pads (the trophy-unlock hint of A16.14.6).
 */
import type { FortDef, FortKind } from '@/contracts';
import { createPortal } from 'preact/compat';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { FORT_KIND_KEY, FortArt, FortKindBadge } from '../components/FortGlyphs';
import { fortNumbers, fortTraits } from '../components/fortInfo';
import { haptic } from '../components/haptics';
import { animate, ease, reducedMotion } from '../components/motion';
import type { HudCtx } from './context';
import { FORT_EDGE_LU_S, FORT_EDGE_PX, FORT_SNAP_PX, FORT_TAP_PX, type FortAim, type FortCommit } from './fortAim';
import { CoinIcon } from './icons';
import { LONG_PRESS_MS, POWER_DRAG_PX, fortIntent, fortPadReasonKey, fortSlotView, fortSnapPad, fortStateReason, type FortSlotView } from './model';
import { minimapDropX } from './PowerButton';
import { ReasonTip } from './Reason';
import { MOTION_DUR } from '@/core/motion';
import './fort.css';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** The one-time "Drag a wall onto a glowing pad" hint (A16.14.6), remembered per player. */
const HINT_STORAGE = 'ageborn.hud.fortHint';
/** How long the hint stays (it also ends on the first pick-up). */
export const FORT_HINT_MS = 6500;
/** The ring drain and art dip of a placement (MR-70b). */
const PLACE_FX_MS = 420;

function hintSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(HINT_STORAGE) === '1';
  } catch {
    return false;
  }
}

function rememberHint(): void {
  try {
    globalThis.localStorage?.setItem(HINT_STORAGE, '1');
  } catch {
    // Storage blocked: the hint may show again next match.
  }
}

/** True when a client point is over the tray or the top bar: a drop there puts the fort back. */
function overHudBar(clientX: number, clientY: number, from: Element | null): boolean {
  const root = from?.closest('.hud') ?? null;
  if (!root) return false;
  for (const sel of ['.hud-tray', '.hud-top']) {
    const el = root.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return true;
  }
  return false;
}

/** The recharge ring: a 4 px arc round the rounded square (pathLength 100), `frac` of it filled. */
function FortRing(p: { frac: number; drainKey: number }) {
  const off = Math.max(0, Math.min(100, 100 - p.frac * 100));
  return (
    <svg class="hud-fort-ring" viewBox="0 0 64 64" aria-hidden="true" preserveAspectRatio="none">
      <rect class="hud-fort-ring-track" x="2.5" y="2.5" width="59" height="59" rx="15" pathLength="100" />
      <rect class="hud-fort-ring-fill" x="2.5" y="2.5" width="59" height="59" rx="15" pathLength="100" style={{ strokeDashoffset: off }} />
      {p.drainKey > 0 ? <rect key={p.drainKey} class="hud-fort-ring-drain" x="2.5" y="2.5" width="59" height="59" rx="15" pathLength="100" /> : null}
    </svg>
  );
}

function FortTip(p: { c: HudCtx; def: FortDef; cost: number }) {
  const { c, def } = p;
  const t = c.t;
  return (
    <div class="hud-fort-tip" role="tooltip" data-testid="hud-fort-tip">
      <div class="hud-fort-tip-name">
        <FortKindBadge kind={def.fortKind} size={20} />
        <span>{t(def.nameKey)}</span>
      </div>
      <div class="hud-fort-tip-line">
        {t(FORT_KIND_KEY[def.fortKind])} · {t(def.pads === 'any' ? 'hud.fort.pads.any' : 'hud.fort.pads.home')}
      </div>
      <div class="hud-fort-tip-row">
        <span class="hud-fort-tip-cost">
          <CoinIcon size={14} />
          {p.cost}
        </span>
        <span>
          {t('fort.stat.pop')} {def.pop}
        </span>
        {fortNumbers(c, def).map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <ul class="hud-fort-tip-traits">
        {fortTraits(def).map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
    </div>
  );
}

type Press = { id: number; x: number; y: number; wasAiming: boolean };
type Mode = 'idle' | 'pressed' | 'drag' | 'tap';

/**
 * The Fort slot in the dock; nothing when the loadout has no Fort card this age (or the slot is still
 * locked: the sim sees it empty, A16.14.6).
 */
export function FortButton(p: { c: HudCtx; powerAiming: boolean; onAiming: (on: boolean) => void; onSpend?: (n: number) => void }) {
  const v = fortSlotView(p.c.m);
  const def = v ? p.c.config.content.forts?.[v.f.card] : undefined;
  if (!v || !def) return null;
  return <FortSlot {...p} v={v} def={def} />;
}

function FortSlot(p: { c: HudCtx; v: FortSlotView; def: FortDef; powerAiming: boolean; onAiming: (on: boolean) => void; onSpend?: (n: number) => void }) {
  const { c, v, def } = p;
  const { m, t } = c;
  const kind: FortKind = def.fortKind;
  const fallbackAim = useMemo(() => signal<FortAim | null>(null), []);
  const fallbackCommit = useMemo(() => signal<FortCommit | null>(null), []);
  const aimSig = c.fortAim ?? fallbackAim;
  const commitSig = c.fortCommit ?? fallbackCommit;
  const aim = aimSig.value;
  const btn = useRef<HTMLButtonElement>(null);
  const mode = useRef<Mode>('idle');
  const press = useRef<Press | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const lastClient = useRef<{ x: number; y: number } | null>(null);
  const followWas = useRef(false);
  const [tip, setTip] = useState(false);
  const [hint, setHint] = useState(false);
  const [drain, setDrain] = useState(0);
  const [dip, setDip] = useState(false);
  const commitN = useRef(0);
  const live = useRef({ c, v, def });
  live.current = { c, v, def };
  const ready = v.state === 'ready' && m.phase !== 'ended';
  const aiming = aim !== null && aim.mode !== 'hint' && aim.card === def.id;

  const hudRoot = (): HTMLElement | null => (btn.current?.closest('.hud') as HTMLElement | null) ?? null;

  /** Where a legal pad is on screen (HUD-local px), or null when the view cannot say. */
  const padX = (i: number): number | null => {
    const pad = live.current.v.f.pads?.[i];
    const s = pad ? live.current.c.view?.laneScreen?.(pad.p) : null;
    return s ? s.x : null;
  };

  /** The pad under a client point: the minimap takes the nearest legal pad; the lane snaps within `px`. */
  const resolve = (clientX: number, clientY: number, px: number): { snap: number | null; over: FortAim['over'] } => {
    const { c: cc, v: vv } = live.current;
    const view = cc.view;
    const from = btn.current;
    const mapX = minimapDropX(clientX, clientY, from);
    if (mapX !== null && view?.pAtWorld) return { snap: fortSnapPad(vv.f, view.pAtWorld(mapX)), over: 'minimap' };
    if (overHudBar(clientX, clientY, from)) return { snap: null, over: 'hud' };
    const onLane = view?.flagPAt ? view.flagPAt(clientX, clientY) !== null : true;
    if (!onLane) return { snap: null, over: 'off' };
    const r = hudRoot()?.getBoundingClientRect();
    const x = clientX - (r?.left ?? 0);
    let best: number | null = null;
    let bestD = Infinity;
    for (const i of vv.legal) {
      const sx = padX(i);
      if (sx === null) continue;
      const d = Math.abs(sx - x);
      if (d <= px && d < bestD) {
        best = i;
        bestD = d;
      }
    }
    return { snap: best, over: 'lane' };
  };

  /** The reason key of the illegal usable pad nearest a tapped client x (within a finger's reach), or null. */
  const nearestBlocked = (clientX: number): string | null => {
    const { v: vv } = live.current;
    const r = hudRoot()?.getBoundingClientRect();
    const x = clientX - (r?.left ?? 0);
    let best: string | null = null;
    let bestD = Infinity;
    for (const i of vv.usable) {
      const pad = vv.f.pads?.[i];
      const sx = padX(i);
      if (!pad || pad.legal || sx === null) continue;
      const d = Math.abs(sx - x);
      if (d <= FORT_TAP_PX && d < bestD) {
        best = fortPadReasonKey(pad.reason);
        bestD = d;
      }
    }
    return best;
  };

  /** Brings the usable pads into view when some are off-screen (the camera eases there, A17.4). */
  const frame = (): void => {
    const { c: cc, v: vv } = live.current;
    const view = cc.view;
    const root = hudRoot();
    const mm = view?.minimap?.();
    if (!view || !root || !mm) return;
    const xs = vv.usable.map(padX).filter((x): x is number => x !== null);
    if (xs.length === 0) return;
    const w = root.clientWidth;
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    if (lo >= 24 && hi <= w - 24) return;
    const s = view.laneScreen?.(vv.f.pads?.[vv.usable[0]!]?.p ?? 0)?.scale ?? 1;
    const center = (mm.view.left + mm.view.right) / 2;
    view.cameraCommand?.({ t: 'center', x: center + ((lo + hi) / 2 - w / 2) / Math.max(0.01, s) });
  };

  const setAim = (next: FortAim | null): void => {
    const cur = aimSig.peek();
    if (next === null ? cur === null : cur !== null && cur.mode === next.mode && cur.snap === next.snap && cur.over === next.over && cur.pointer?.x === next.pointer?.x && cur.pointer?.y === next.pointer?.y) return;
    // First contact with a pad: a tick (the ghost bumps, `FortLane`).
    if (next && next.snap !== null && (cur?.snap ?? null) !== next.snap && next.mode === 'drag') haptic('tick');
    aimSig.value = next;
  };

  const begin = (m2: 'drag' | 'tap'): void => {
    const { c: cc } = live.current;
    mode.current = m2;
    setHint(false);
    setTip(false);
    rememberHint();
    // The camera stands still while a fort is in hand (pads never slide under the finger); it resumes
    // following the front afterwards if it was.
    const mm = cc.view?.minimap?.();
    followWas.current = mm?.following ?? false;
    if (mm && mm.following) cc.view?.cameraCommand?.({ t: 'scrub', x: (mm.view.left + mm.view.right) / 2 });
    cc.view?.cameraHold?.('powerDrag', true);
    p.onAiming(true);
    cc.audio?.play('ui_click');
    haptic('tick');
    setAim({ mode: m2, card: def.id, kind, snap: null, pointer: null, over: 'off' });
    frame();
  };

  const end = (): void => {
    if (mode.current === 'idle' && aimSig.peek() === null) return;
    mode.current = 'idle';
    press.current = null;
    lastClient.current = null;
    if (aimSig.peek()?.mode !== 'hint') aimSig.value = null;
    const view = live.current.c.view;
    view?.cameraHold?.('powerDrag', false);
    if (followWas.current) view?.cameraCommand?.({ t: 'front' });
    followWas.current = false;
    p.onAiming(false);
  };

  const cancel = (): void => {
    if (mode.current === 'drag' || mode.current === 'tap') live.current.c.audio?.play('ui_toggle');
    end();
  };

  /** Places on `pad`; the sim has the final word. Returns true when the command was sent. */
  const place = (pad: number): boolean => {
    const { c: cc } = live.current;
    const i = fortIntent(cc.m, cc.side, pad);
    cc.act(i);
    if (i.k !== 'command') {
      shake(btn.current);
      return false;
    }
    commitN.current += 1;
    commitSig.value = { n: commitN.current, pad, kind, card: def.id };
    cc.audio?.play('ui_confirm');
    haptic('thump');
    return true;
  };

  const clearPress = (): void => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  // A placement the sim accepted (the ring restarts, from a drop, a tap or the D key): the ring drains,
  // the art dips and the price floats off the gold (MR-70b).
  const lastLeft = useRef(v.f.leftMs ?? 0);
  const lastAlive = useRef(v.f.alive ?? 0);
  useEffect(() => {
    const left = v.f.leftMs ?? 0;
    const alive = v.f.alive ?? 0;
    const placed = (lastLeft.current <= 0 && left > 0) || alive > lastAlive.current;
    lastLeft.current = left;
    lastAlive.current = alive;
    if (!placed || c.readOnly) return undefined;
    setDrain((n) => n + 1);
    setDip(true);
    p.onSpend?.(v.f.cost);
    const id = setTimeout(() => setDip(false), PLACE_FX_MS);
    return () => clearTimeout(id);
  }, [v.f.leftMs, v.f.alive]);

  // The fort stops being placeable (placed, gold spent, Siege, the end) or a power is picked up: put back.
  useEffect(() => {
    if (!ready && (mode.current === 'drag' || mode.current === 'tap')) end();
  }, [ready]);
  useEffect(() => {
    if (p.powerAiming && (mode.current === 'drag' || mode.current === 'tap')) cancel();
  }, [p.powerAiming]);

  // Aiming by tap: a tap on the minimap takes the legal pad nearest that point (`Minimap.tsx` sends it).
  useEffect(() => {
    const root = hudRoot();
    if (!aiming || aim?.mode !== 'tap' || !root) return undefined;
    const onMap = (e: Event): void => {
      const x = (e as CustomEvent<{ x: number }>).detail?.x;
      const view = live.current.c.view;
      if (typeof x !== 'number' || !view?.pAtWorld) return;
      const pad = fortSnapPad(live.current.v.f, view.pAtWorld(x));
      if (pad === null) {
        live.current.c.act({ k: 'deny', target: 'fort', reason: { key: 'hud.deny.fortNoPad' } });
        return;
      }
      if (place(pad)) end();
    };
    root.addEventListener('hud-fort-map', onMap);
    return () => root.removeEventListener('hud-fort-map', onMap);
  }, [aiming, aim?.mode]);

  // Escape cancels (and never reaches the screen underneath).
  useEffect(() => {
    if (!aiming || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      cancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [aiming]);

  // Edge scroll while dragging (A17.6): near the left or right edge the camera moves under the finger and
  // the snap is re-read, so a still finger can reach a far Field pad.
  useEffect(() => {
    if (!aiming || aim?.mode !== 'drag' || typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    let last = performance.now();
    const step = (now: number): void => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(64, now - last);
      last = now;
      const pt = lastClient.current;
      const root = hudRoot();
      const view = live.current.c.view;
      const mm = view?.minimap?.();
      if (!pt || !root || !view || !mm) return;
      const r = root.getBoundingClientRect();
      const x = pt.x - r.left;
      const edge = x < FORT_EDGE_PX ? -(1 - x / FORT_EDGE_PX) : x > r.width - FORT_EDGE_PX ? 1 - (r.width - x) / FORT_EDGE_PX : 0;
      if (edge === 0 || aimSig.peek()?.over === 'hud') return;
      const center = (mm.view.left + mm.view.right) / 2;
      view.cameraCommand?.({ t: 'scrub', x: center + edge * FORT_EDGE_LU_S * (dt / 1000) });
      const res = resolve(pt.x, pt.y, FORT_SNAP_PX);
      const cur = aimSig.peek();
      if (cur) setAim({ ...cur, snap: res.snap, over: res.over });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [aiming, aim?.mode]);

  // A pinned tip closes on a tap anywhere else.
  useEffect(() => {
    if (!tip || typeof document === 'undefined') return undefined;
    const close = (e: PointerEvent): void => {
      if (btn.current && e.target instanceof Node && btn.current.contains(e.target)) return;
      setTip(false);
    };
    const id = setTimeout(() => setTip(false), 4000);
    document.addEventListener('pointerdown', close, true);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', close, true);
    };
  }, [tip]);

  // The one-time hint: the first time a fort is ready, the button breathes once and the pads glow.
  const hintsOn = c.hints !== false && !c.readOnly;
  useEffect(() => {
    if (!ready || !hintsOn || hintSeen() || mode.current !== 'idle') return undefined;
    rememberHint();
    setHint(true);
    if (aimSig.peek() === null) aimSig.value = { mode: 'hint', card: def.id, kind, snap: null, pointer: null, over: 'off' };
    const id = setTimeout(() => {
      setHint(false);
      if (aimSig.peek()?.mode === 'hint') aimSig.value = null;
    }, FORT_HINT_MS);
    return () => clearTimeout(id);
  }, [ready, hintsOn]);

  // Leaving (an evolve to an age without a Fort card, the end of the match) puts everything back.
  useEffect(
    () => () => {
      clearPress();
      if (aimSig.peek() !== null) aimSig.value = null;
      if (mode.current === 'drag' || mode.current === 'tap') {
        c.view?.cameraHold?.('powerDrag', false);
        p.onAiming(false);
      }
    },
    [],
  );

  const denyNow = (): void => {
    const why = fortStateReason(live.current.v);
    if (why) {
      c.act({ k: 'deny', target: 'fort', reason: why });
      shake(btn.current);
    }
  };

  const name = t(def.nameKey);
  const kindName = t(FORT_KIND_KEY[kind]);
  const recharging = v.state === 'recharging';
  const poor = v.state === 'poor';
  const stateText = ready ? t('hud.fort.stateReady') : (fortStateReasonText(c, v) ?? t('hud.fort.stateReady'));
  const root = aiming ? hudRoot() : null;
  const dragging = aiming && aim?.mode === 'drag';
  const overHud = dragging && aim?.over === 'hud';
  const team = c.colors?.me;

  return (
    <div class={cls('hud-fort-slot', ready && 'is-ready', aiming && 'is-aiming')} data-testid="hud-fort-slot" data-state={v.state}>
      <button
        ref={btn}
        class={cls(
          'hud-fort',
          `state-${v.state}`,
          ready && 'is-ready',
          aiming && 'is-aiming',
          dragging && 'is-lifted',
          dip && 'is-placed',
          tip && 'is-tip',
          hint && 'is-hint',
          c.denied('fort') && 'is-denied',
        )}
        data-testid="hud-fort"
        data-state={v.state}
        data-kind={kind}
        data-aim={aim?.mode ?? 'none'}
        aria-pressed={aiming}
        aria-label={t('hud.fort.buttonLabel', { name, kind: kindName, state: stateText })}
        disabled={c.readOnly}
        style={{ '--afford': poor ? Math.max(0, Math.min(1, m.me.gold / Math.max(1, v.f.cost))) : 1 }}
        onPointerDown={(e) => {
          if (c.readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          held.current = false;
          clearPress();
          press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, wasAiming: mode.current === 'tap' };
          if (mode.current === 'idle') mode.current = 'pressed';
          pressTimer.current = setTimeout(() => {
            pressTimer.current = null;
            if (mode.current !== 'pressed') return;
            held.current = true;
            setTip(true);
            live.current.c.audio?.play('ui_toggle');
            haptic('tick');
          }, LONG_PRESS_MS);
        }}
        onPointerMove={(e) => {
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId) return;
          lastClient.current = { x: e.clientX, y: e.clientY };
          if (mode.current !== 'drag') {
            if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < POWER_DRAG_PX) return;
            clearPress();
            if (held.current) {
              held.current = false;
              setTip(false);
            }
            if (!live.current.v || live.current.v.state !== 'ready' || live.current.v.legal.length === 0) return;
            begin('drag');
          }
          const r = hudRoot()?.getBoundingClientRect();
          const res = resolve(e.clientX, e.clientY, FORT_SNAP_PX);
          setAim({ mode: 'drag', card: def.id, kind, snap: res.snap, over: res.over, pointer: { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) } });
        }}
        onPointerUp={(e) => {
          clearPress();
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId) return;
          press.current = null;
          if (mode.current === 'drag') {
            const res = resolve(e.clientX, e.clientY, FORT_SNAP_PX);
            const snap = res.over === 'hud' ? null : (res.snap ?? (res.over === 'off' ? (aimSig.peek()?.snap ?? null) : null));
            if (snap !== null) place(snap);
            else live.current.c.audio?.play('ui_toggle');
            end();
            return;
          }
          if (held.current) {
            // A long-press showed the tip: the release neither aims nor places.
            held.current = false;
            if (mode.current === 'pressed') mode.current = 'idle';
            return;
          }
          if (pr.wasAiming) {
            // A second tap on the button puts the fort back.
            cancel();
            return;
          }
          mode.current = 'idle';
          if (fortStateReason(live.current.v)) {
            denyNow();
            return;
          }
          begin('tap');
        }}
        onPointerCancel={() => {
          clearPress();
          cancel();
        }}
        onClick={(e) => {
          // Keyboard (Tab focus, then Enter or Space): places like the D key.
          if (e.detail === 0) c.act(fortIntent(m, c.side));
        }}
      >
        <i class="hud-fort-frame" aria-hidden="true" />
        <span class="hud-fort-art">
          <FortArt kind={kind} age={def.age} size={c.compact ? 44 : 70} {...(team ? { banner: team } : {})} />
        </span>
        <FortRing frac={v.frac} drainKey={drain} />
        {recharging ? (
          <span class="hud-fort-secs" data-testid="hud-fort-secs">
            {v.secondsLeft}
          </span>
        ) : null}
        <span class={cls('hud-fort-cost', poor && 'is-poor')} data-testid="hud-fort-cost">
          <CoinIcon size={c.compact ? 11 : 14} />
          {v.f.cost}
          {poor ? <i class="hud-fort-cost-fill" /> : null}
        </span>
        <span class="hud-fort-kind" aria-hidden="true">
          <FortKindBadge kind={kind} size={c.compact ? 18 : 24} />
        </span>
        <span class="hud-fort-pop" aria-hidden="true">
          <PopGlyph />
          {v.f.pop ?? def.pop}
        </span>
        {(v.f.alive ?? 0) > 0 && v.state !== 'cap' ? (
          // How many forts stand: one pip per fort up to the cap (the cap itself says "2/2").
          <span class="hud-fort-pips" data-testid="hud-fort-count" aria-hidden="true">
            {Array.from({ length: v.f.max ?? 2 }, (_, i) => (
              <i key={i} class={i < (v.f.alive ?? 0) ? 'is-on' : ''} />
            ))}
          </span>
        ) : null}
        {v.state === 'cap' ? (
          <span class="hud-fort-cap" data-testid="hud-fort-cap" data-tag>
            {t('hud.fort.cap', { n: v.f.alive ?? 0, max: v.f.max ?? 2 })}
          </span>
        ) : null}
        <i class="hud-fort-plinth" aria-hidden="true" />
        {v.state === 'siege' ? (
          <span class="hud-fort-siege" data-tag>
            {t('hud.fort.siege')}
          </span>
        ) : null}
        {c.keys ? <kbd class="hud-key">{t('hud.key.d')}</kbd> : null}
      </button>
      <FortTip c={c} def={def} cost={v.f.cost} />
      <ReasonTip c={c} target="fort" align="right" />
      {hint && !aiming ? (
        <div class="hud-fort-chip is-hint" data-testid="hud-fort-hint" role="status">
          {t('tutorial.fort.hint')}
        </div>
      ) : null}
      {aiming && aim?.mode === 'tap' ? (
        <div class="hud-fort-chip" data-testid="hud-fort-aiming" role="status">
          {t('hud.fort.tapPad')}
          {kind === 'camp' ? <span class="hud-fort-chip-sub">{t('hud.fort.fieldToo')}</span> : null}
        </div>
      ) : null}
      {root && aiming && aim?.mode === 'tap'
        ? createPortal(
            <div
              class="hud-fort-catch"
              data-testid="hud-fort-catch"
              onPointerUp={(e) => {
                const res = resolve(e.clientX, e.clientY, FORT_TAP_PX);
                if (res.over === 'hud') return;
                if (res.snap !== null) {
                  if (place(res.snap)) end();
                  return;
                }
                // A tap on a blocked pad says why ("Enemy near", "Army first", "Taken").
                const blocked = res.over === 'lane' ? nearestBlocked(e.clientX) : null;
                if (blocked) {
                  c.act({ k: 'deny', target: 'fort', reason: { key: blocked } });
                  return;
                }
                // Not near a legal pad: the chip bumps so the eye finds it (the pads stay lit).
                const chip = btn.current?.parentElement?.querySelector('.hud-fort-chip');
                if (chip && !reducedMotion(chip)) animate(chip, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: MOTION_DUR.small, easing: ease('back'), fill: 'none' });
              }}
            />,
            root,
          )
        : null}
      {root && dragging && aim?.pointer
        ? createPortal(
            <div class={cls('hud-fort-token', overHud && 'is-cancel', aim.snap !== null && 'is-snapped')} data-testid="hud-fort-token" style={{ left: `${aim.pointer.x}px`, top: `${aim.pointer.y}px` }}>
              <span class="hud-fort-token-core">
                <FortArt kind={kind} age={def.age} size={40} {...(team ? { banner: team } : {})} />
              </span>
              <span class={cls('hud-fort-token-label', !overHud && 'is-info')} data-testid="hud-fort-token-label">
                {overHud ? (
                  t('hud.fort.cancel')
                ) : (
                  <>
                    <span>{aim.snap === null ? t('hud.fort.dragPad') : name}</span>
                    <span class="hud-fort-token-cost">
                      <CoinIcon size={13} />
                      {`−${v.f.cost}`}
                    </span>
                    {aim.snap !== null && v.f.pads?.[aim.snap]?.safe === false ? (
                      <span class="hud-fort-token-warn" data-testid="hud-fort-token-warn">
                        {t('hud.fort.underFire')}
                      </span>
                    ) : null}
                  </>
                )}
              </span>
            </div>,
            root,
          )
        : null}
    </div>
  );
}

/** The state line of the button's label ("Ready in 12 s", "Need 40 gold", ...), or null when ready. */
function fortStateReasonText(c: HudCtx, v: FortSlotView): string | null {
  const r = fortStateReason(v);
  return r ? c.t(r.key, r.params) : null;
}

/** A small soldier head: the army (pop) cost under the art. */
function PopGlyph() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
      <circle cx="6" cy="4" r="2.6" fill="currentColor" />
      <path d="M1.6 11.4c.4-3 2.2-4.4 4.4-4.4s4 1.4 4.4 4.4z" fill="currentColor" />
    </svg>
  );
}

/** MR-03: a ±4 px shake for two frames (the red flash is CSS, `is-denied`). */
function shake(el: Element | null): void {
  if (!el || reducedMotion(el)) return;
  animate(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], {
    duration: MOTION_DUR.small,
    easing: ease('out'),
    fill: 'none',
  });
}
