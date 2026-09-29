/**
 * The power dock (DESIGN A2.9.10, A9.2 tray item 4, A17.6; owner decision "Age Power targeting": drag
 * is the primary, taught interaction). Two round buttons: **Home** (left, shield frame, house glyph)
 * and **Field** (right, banner frame, flag glyph). Each slot costs gold and reloads on its own.
 *
 * Button anatomy: the power's icon; a 5 px reload arc (linear fill); while reloading the seconds left
 * in the centre over the icon at 40%; a cost chip top-left (coin + the effective cost, the unit-card
 * grammar), red with a thin gold underline filling toward the cost while gold is short; an 18 px reach
 * glyph bottom-right (house, flag, crosshair, banner, parachute); the slot's frame.
 *
 * States: reloading ("Ready in 12 s" on a press); reloaded but gold short (ring closed and dim, "Need
 * 40 gold"); castable (MR-69: a bright sweep round the ring, lifted 4 px, a steady glow and the grab
 * arrow; it breathes only when it holds the one pulse); a lockout (the lever: "Wait 3 s"). An empty or
 * locked slot is not drawn: its space stays a gap, so nothing jumps when it arrives.
 *
 * - **Drag** a castable power onto the lane (or the minimap). On pick-up the view washes the legal
 *   area in your colour ("Your half", "Near your army") and numbers the enemies the power may hit
 *   (1..N, nearest your gate first); the token says "Hits 4 of 5 · −100". Past the band the ghost
 *   sticks to its edge for 120 lu (a tick haptic on first contact); beyond that it turns red and
 *   hatched ("Only in your half") and a release puts the power back, with nothing paid.
 * - **Tap** enters aiming mode: the ghost appears over the enemies nearest your gate; tap the field to
 *   cast there, tap the button again (or Escape) to cancel. A power that picks its own spot (charges,
 *   drops, buffs, Suppress) casts on a drop or a field tap anywhere, and the ghost shows where it acts.
 * - **Long-press** (450 ms) or hover shows the tip: name, family, reach, cost, reload, the cap and the
 *   per-unit line. Keys: Space = Home, X = Field (auto-aimed); Enter on a focused button.
 * - **Cast committed** (MR-70b): the ghost contracts and fades, the gold floats "−100", the ring drains
 *   with a bright tail and the icon dips. The ready chime plays when a slot first becomes castable
 *   after its cast, at most once per 3 s across both slots.
 *
 * The input rules are the pure state machine in `powerAim.ts`; this component wires DOM events to it.
 */
import type { PowerDef, PowerSlot } from '@/contracts';
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import { haptic as hapticTier } from '../components/haptics';
import { ReachGlyphIcon, SlotGlyph } from '../components/PowerGlyphs';
import { perUnitShare, powerCap, reachGlyph, reachLabel, reloadSeconds } from '../components/powerInfo';
import type { HudCtx } from './context';
import { BoltIcon, CoinIcon } from './icons';
import { ReasonTip } from './Reason';
import { LONG_PRESS_MS, POWER_CHIME_GAP_MS, POWER_DRAG_PX, powerIntent, powerSlotView, powerTarget, type PowerSlotView } from './model';
import { AIM_IDLE, NO_AIM, aimActive, ghostOf, resolveAim, stepPowerAim, type AimTarget, type PowerAimEffect, type PowerAimEvent, type PowerAimState } from './powerAim';
import { usePortrait } from './usePortrait';

/**
 * For a power that picks its own spot, what a drop or field tap does (a drag or tap there casts it
 * wherever the pointer is, so the token says where it will act instead). Null for aimed powers.
 */
export function autoAimKey(kind: string | undefined): string | null {
  switch (kind) {
    case 'stampede':
      return 'hud.powerAim.auto.stampede';
    case 'paradrop':
      return 'hud.powerAim.auto.paradrop';
    case 'buffAll':
      return 'hud.powerAim.auto.buffAll';
    case 'suppress':
      return 'hud.powerAim.auto.suppress';
    default:
      return null;
  }
}

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** The minimap's hit area is at least this tall (A17.5), also for dropping a power on it. */
export const MINIMAP_HIT_PX = 32;

/**
 * World x under a client point when it is over the minimap strip (A17.6: a power can be dropped on
 * it), else null. The strip's canvas carries the world range it draws.
 */
export function minimapDropX(clientX: number, clientY: number, from: Element | null): number | null {
  const root = from?.closest('.hud') ?? null;
  const canvas = root?.querySelector<HTMLElement>('[data-minimap]') ?? null;
  if (!canvas) return null;
  const r = canvas.getBoundingClientRect();
  if (r.width <= 0) return null;
  const cy = r.top + r.height / 2;
  const half = Math.max(r.height, MINIMAP_HIT_PX) / 2;
  if (clientX < r.left || clientX > r.right || Math.abs(clientY - cy) > half) return null;
  const wl = Number(canvas.dataset['worldLeft'] ?? -180);
  const wr = Number(canvas.dataset['worldRight'] ?? 2180);
  return wl + ((clientX - r.left) / r.width) * (wr - wl);
}

/** True when a client point is over the tray or the top bar: a drop there puts the power back. */
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

/** The "drag onto the battlefield" hint shows once per player (it also counts as seen after a drag). */
const HINT_STORAGE = 'ageborn.hud.powerDragHint';
/** How long the hint stays up (the hand loops three times within it). */
export const POWER_HINT_MS = 7500;
/** The hint follows the ready burst by this long. */
const POWER_HINT_DELAY_MS = 700;
/** Checks for a free moment this many times (every `POWER_HINT_DELAY_MS`) before giving up. */
const POWER_HINT_TRIES = 12;
/** The ring drain and icon dip of a committed cast (MR-70b: 200 ms `out`; 70 / 140 ms `back`). */
const CAST_FX_MS = 360;

/** True while a tutorial bubble (A8 beat or adaptive hint) points at the power button. */
function tutorialOnPower(from: Element | null): boolean {
  const doc = from?.ownerDocument ?? globalThis.document;
  const bubble = doc?.querySelector<HTMLElement>('[data-testid="tutorial-bubble"]');
  const id = bubble?.dataset['prompt'] ?? '';
  return id === 'hint.powerReady' || id === 'm1.arrowStorm' || /power/i.test(id);
}

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

/** A pointing hand (the hint's drag demo). The fingertip is at (22, 3) of the 48 px box. */
function Hand() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <path
        d="M18.5 7a3.5 3.5 0 0 1 7 0v13.2l1.6-.4a3.6 3.6 0 0 1 4.3 2.3l2.3-.4a3.6 3.6 0 0 1 4.1 2.8l2.1-.2a3.4 3.4 0 0 1 3.6 3.4V35c0 6.1-4.9 11-11 11h-3.4a11 11 0 0 1-8.8-4.4l-6.6-8.9a3.6 3.6 0 0 1 5.4-4.7l2.4 2.3V7z"
        fill="#fff"
        stroke="#1b1330"
        stroke-width="2.6"
        stroke-linejoin="round"
      />
      <path d="M27 24v7M33.5 25.5v6M39.5 27.5v5" stroke="#1b1330" stroke-width="2" stroke-linecap="round" opacity="0.35" />
    </svg>
  );
}

/** The small "drag me" arrow on the ready button, pointing up and out toward the field. */
function GrabArrow() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path d="M6 18 L16 8 M9 7.5 h7.5 v7.5" fill="none" stroke="#1b1330" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** A 5 px reload arc as an SVG ring (pathLength 100): `frac` of it filled. */
function ReloadRing(p: { frac: number; drainKey: number }) {
  const off = Math.max(0, Math.min(100, 100 - p.frac * 100));
  return (
    <svg class="hud-pw-ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle class="hud-pw-ring-track" cx="32" cy="32" r="29" pathLength="100" />
      <circle class="hud-pw-ring-fill" cx="32" cy="32" r="29" pathLength="100" style={{ strokeDashoffset: off }} />
      {p.drainKey > 0 ? <circle key={p.drainKey} class="hud-pw-ring-drain" cx="32" cy="32" r="29" pathLength="100" /> : null}
    </svg>
  );
}

interface Pos {
  x: number;
  y: number;
}

/** The dock's tip (long-press or hover): name, slot, family and reach, cost and reload, the cap, the per-unit line. */
function PowerTip(p: { c: HudCtx; def: PowerDef; slot: PowerSlot; cost: number }) {
  const { c, def } = p;
  const cap = powerCap(def);
  const share = perUnitShare(c.config.content, def);
  return (
    <div class="hud-pw-tip" role="tooltip" data-testid={`hud-power-tip-${p.slot}`}>
      <div class="hud-pw-tip-name">
        <SlotGlyph slot={p.slot} size={18} />
        <span>{c.t(def.nameKey)}</span>
      </div>
      <div class="hud-pw-tip-line">
        {c.t(`hud.power.family.${def.family}`)} · {c.t(`hud.power.reach.${reachLabel(def)}`)}
      </div>
      <div class="hud-pw-tip-row">
        <span class="hud-pw-tip-cost">
          <CoinIcon size={14} />
          {p.cost}
        </span>
        <span>{c.t('hud.power.reload', { s: reloadSeconds(def) })}</span>
        {cap ? <span>{cap.own ? c.t('hud.power.hitsOwn', { n: cap.n }) : c.t('hud.power.hits', { n: cap.n })}</span> : null}
      </div>
      {share && share.infantryPct !== null && share.heavyPct !== null ? (
        <div class="hud-pw-tip-unit">
          {c.t('hud.power.perUnit', {
            i: share.infantryPct,
            h: share.heavyPct,
          })}
        </div>
      ) : null}
    </div>
  );
}

function PowerSlotButton(p: {
  c: HudCtx;
  slot: PowerSlot;
  v: PowerSlotView;
  pulse: boolean;
  /** The slot being aimed now (only one at a time): another slot's aim cancels this one. */
  active: PowerSlot | null;
  onActive: (slot: PowerSlot | null) => void;
  onSpend?: (amount: number) => void;
}) {
  const { c, slot, v } = p;
  const { m, t } = c;
  const castable = v.state === 'castable' && m.phase !== 'ended';
  const def = v.p ? c.config.content.powers[v.p.card] : undefined;
  const url = usePortrait(c.portrait, v.p?.card ?? null, 'none', 72);
  const btn = useRef<HTMLButtonElement>(null);
  const [st, setSt] = useState<PowerAimState>(AIM_IDLE);
  const stRef = useRef<PowerAimState>(st);
  const [pos, setPos] = useState<Pos | null>(null);
  const [hint, setHint] = useState(false);
  const [tip, setTip] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const edgeWas = useRef(false);
  // Latest values for handlers that outlive a render.
  const live = useRef({ c, castable, v, def });
  live.current = { c, castable, v, def };
  // Count the times it became castable, so the burst replays each time.
  const readySeq = useRef({ castable, n: 0 });
  if (castable && !readySeq.current.castable) readySeq.current.n += 1;
  readySeq.current.castable = castable;
  // MR-70b: a confirmed cast (the slot's reload restarts) drains the ring and dips the icon.
  const [castSeq, setCastSeq] = useState(0);
  const lastPpm = useRef(v.p?.ppm ?? 0);
  useEffect(() => {
    const now = v.p?.ppm ?? 0;
    const prev = lastPpm.current;
    lastPpm.current = now;
    if (v.p && prev >= 1_000_000 && now < prev && !c.readOnly) {
      setCastSeq((n) => n + 1);
      p.onSpend?.(v.p.cost);
    }
  }, [v.p?.ppm]);
  const [dip, setDip] = useState(0);
  useEffect(() => {
    if (castSeq === 0) return undefined;
    setDip(castSeq);
    const id = setTimeout(() => setDip(0), CAST_FX_MS);
    return () => clearTimeout(id);
  }, [castSeq]);

  const hudRoot = (): HTMLElement | null => (btn.current?.closest('.hud') as HTMLElement | null) ?? null;

  const labels = (d: PowerDef | undefined) => {
    const r = d?.reach;
    return {
      bandLabel: r === 'home' ? t('hud.powerAim.home') : r === 'front' && d && d.effect.kind !== 'stampede' && d.effect.kind !== 'suppress' ? t('hud.powerAim.front') : undefined,
      invalidLabel: r === 'home' ? t('hud.powerAim.onlyHome') : t('hud.powerAim.onlyFront'),
    };
  };

  /** What the pointer is over: the minimap (a drop target), the HUD bars (cancel), the lane or nothing. */
  const aimAt = (clientX: number, clientY: number): AimTarget => {
    const { c: cc } = live.current;
    const view = cc.view;
    if (!view) return NO_AIM;
    // Always tell the view where the pointer is: it edge-scrolls near the screen edges (A17.6).
    const lane = view.laneRawP ? view.laneRawP(clientX, clientY) : view.laneP(clientX, clientY);
    const from = btn.current;
    const reach = view.powerReach?.(slot) ?? null;
    const mapX = minimapDropX(clientX, clientY, from);
    if (mapX !== null && (view.pAtWorld || view.powerPAtWorld)) {
      // Show the spot being aimed at while the pointer is over the minimap.
      view.cameraCommand?.({ t: 'scrub', x: mapX });
      const raw = view.pAtWorld ? view.pAtWorld(mapX) : view.powerPAtWorld!(mapX);
      const r = resolveAim(raw, reach);
      return { p: r.p, over: 'minimap', inReach: r.inReach, edge: r.edge };
    }
    if (overHudBar(clientX, clientY, from)) return { p: null, over: 'hud' };
    if (lane === null) return NO_AIM;
    const r = resolveAim(lane, reach);
    return { p: r.p, over: 'lane', inReach: r.inReach, edge: r.edge };
  };

  /** Shows the ghost for a state (the view keeps it on the same lane point while edge-scrolling). */
  const syncGhost = (s: PowerAimState): void => {
    const { c: cc, def: d } = live.current;
    const view = cc.view;
    if (!view) return;
    if (s.s === 'idle') {
      view.previewPower(null, true, { slot });
      view.cameraHold?.('powerDrag', false);
      edgeWas.current = false;
      return;
    }
    if (s.s === 'pressed' && !s.wasAiming) return;
    const g = ghostOf(s);
    const aim = 'aim' in s ? s.aim : NO_AIM;
    const outOfReach = aim.inReach === false && aim.p !== null && aim.over !== 'hud';
    const edge = aim.edge === true && g.valid;
    // The magnetic edge's first contact: a tick haptic (the view plays the bump).
    if (edge && !edgeWas.current) hapticTier('tick');
    edgeWas.current = edge;
    view.previewPower(g.p, g.valid, {
      slot,
      invalid: g.valid ? undefined : outOfReach ? 'reach' : 'hud',
      edge,
      ...labels(d),
    });
  };

  const apply = (e: PowerAimEffect): void => {
    const { c: cc, castable: isReady } = live.current;
    switch (e.k) {
      case 'none':
        return;
      case 'pickup':
        setHint(false);
        setTip(false);
        rememberHint();
        p.onActive(slot);
        cc.audio?.play('ui_click');
        hapticTier('tick');
        return;
      case 'aim': {
        setHint(false);
        setTip(false);
        p.onActive(slot);
        cc.audio?.play('ui_click');
        const at = cc.view?.powerAimStart?.(slot) ?? null;
        dispatch({
          e: 'aimAt',
          aim: at === null ? NO_AIM : { p: at, over: 'lane' },
        });
        return;
      }
      case 'fire': {
        // `p` was resolved at the release point against the current camera, so a drag that edge-scrolled
        // under a still finger lands where the ghost is.
        const info = cc.view?.powerGhostInfo?.() ?? null;
        if (e.p !== undefined && info && info.locked === false) {
          // A strike dropped where no enemy can be locked: nothing is paid (A2.9.7 "No target").
          cc.act({
            k: 'deny',
            target: powerTarget(slot),
            reason: { key: 'hud.deny.powerNoTarget' },
          });
          hapticTier('deny');
          return;
        }
        const i = powerIntent(cc.m, cc.side, e.p, slot);
        if (i.k === 'command') cc.view?.powerCommit?.();
        cc.act(i);
        if (i.k === 'deny') hapticTier('deny');
        if (isReady && i.k === 'command') {
          rememberHint();
          // `power_cast` (MR-70b) once WP6 adds it; `ui_confirm` meanwhile.
          cc.audio?.play('ui_confirm');
          hapticTier('thump');
        }
        p.onActive(null);
        return;
      }
      case 'cancel':
        cc.audio?.play('ui_toggle');
        p.onActive(null);
        return;
    }
  };

  const dispatch = (ev: PowerAimEvent): void => {
    const prev = stRef.current;
    const r = stepPowerAim(prev, ev);
    stRef.current = r.state;
    setSt(r.state);
    if (r.state.s !== 'dragging') setPos(null);
    // A cast commits the ghost (it contracts) before the idle state hides it.
    if (r.effect.k === 'fire') {
      apply(r.effect);
      syncGhost(r.state);
      return;
    }
    syncGhost(r.state);
    apply(r.effect);
  };

  const local = (clientX: number, clientY: number): Pos => {
    const r = hudRoot()?.getBoundingClientRect();
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) };
  };

  const clearPress = (): void => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  // The power stops being castable (Space cast it, an evolve, gold spent, the end): anything in flight
  // is put back.
  useEffect(() => {
    if (!castable && stRef.current.s !== 'idle' && stRef.current.s !== 'pressed') dispatch({ e: 'cancel' });
  }, [castable]);

  // Another slot started aiming: this one puts its power back.
  useEffect(() => {
    if (p.active !== null && p.active !== slot && aimActive(stRef.current)) dispatch({ e: 'cancel' });
  }, [p.active]);

  // Escape cancels a drag or aiming mode (and never reaches the screen underneath).
  const active = aimActive(st);
  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      dispatch({ e: 'cancel' });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active]);

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

  // The first time a power is castable: the drag hint with the animated hand, once (Home only).
  const hintsOn = c.hints !== false && !c.readOnly && slot === 'home';
  useEffect(() => {
    if (!castable || !hintsOn || hintSeen()) return undefined;
    let hide: ReturnType<typeof setTimeout> | null = null;
    let tries = 0;
    const poll = setInterval(() => {
      tries += 1;
      if (tries > POWER_HINT_TRIES || stRef.current.s !== 'idle') {
        clearInterval(poll);
        return;
      }
      if (tutorialOnPower(btn.current)) return;
      clearInterval(poll);
      rememberHint();
      setHint(true);
      hide = setTimeout(() => setHint(false), POWER_HINT_MS);
    }, POWER_HINT_DELAY_MS);
    return () => {
      clearInterval(poll);
      if (hide) {
        clearTimeout(hide);
        setHint(false);
      }
    };
  }, [castable, hintsOn]);

  useEffect(
    () => () => {
      clearPress();
      if (aimActive(stRef.current)) {
        c.view?.previewPower(null, true, { slot });
        c.view?.cameraHold?.('powerDrag', false);
      }
    },
    [c.view],
  );

  if (!v.p || !def) {
    // An empty or locked slot: its space stays a gap (nothing jumps when it arrives).
    return <div class={cls('hud-pw-slot', `is-${slot}`, 'is-gap')} data-testid={`hud-power-gap-${slot}`} aria-hidden="true" />;
  }

  const dragging = st.s === 'dragging';
  const aiming = st.s === 'aiming' || (st.s === 'pressed' && st.wasAiming);
  const overHud = dragging && st.aim.over === 'hud';
  const outOfReach = (dragging || aiming) && 'aim' in st && st.aim.inReach === false && st.aim.p !== null;
  const autoKey = (dragging || aiming) && 'aimable' in st && !st.aimable ? autoAimKey(def.effect.kind) : null;
  const root = aiming || dragging ? hudRoot() : null;
  const cost = v.p.cost;
  const icon = (size: number) => (url ? <img src={url} alt="" draggable={false} /> : <BoltIcon size={size} />);
  const testid = slot === 'home' ? 'hud-power' : 'hud-power-field';
  const reloading = v.state === 'reloading';
  const poor = v.state === 'poor';
  const locked = v.state === 'lockout';
  const name = t(def.nameKey);
  const stateText = castable
    ? t('hud.power.stateReady')
    : reloading
      ? t('hud.deny.powerReload', { s: v.secondsLeft })
      : poor
        ? t('hud.deny.powerGold', { n: v.need })
        : t('hud.deny.powerLockout', { s: v.lockS });
  const slotName = t(`hud.power.slot.${slot}`);
  const info = dragging || aiming ? (c.view?.powerGhostInfo?.() ?? null) : null;
  const strike = def.effect.kind === 'strike';
  // Out of reach the ghost carries the label ("Only in your half") and the token turns red.
  const tokenLine = overHud
    ? t('hud.powerAim.cancel')
    : outOfReach
      ? null
      : autoKey
        ? t(autoKey)
        : strike
          ? info?.locked
            ? t('hud.powerAim.auto.strike')
            : t('hud.powerAim.noTarget')
          : info && info.eligible > 0
            ? t('hud.powerAim.hits', { n: info.covered, m: info.eligible })
            : null;

  return (
    <div
      class={cls('hud-pw-slot', `is-${slot}`, castable && 'is-ready', dragging && 'is-dragging', aiming && 'is-aiming')}
      data-testid={`hud-power-slot-${slot}`}
      data-state={v.state}
    >
      <button
        ref={btn}
        class={cls(
          'hud-power',
          'hud-pw',
          `hud-pw--${slot}`,
          `state-${v.state}`,
          castable && 'is-ready',
          p.pulse && castable && 'is-pulse',
          (aiming || dragging) && 'is-aiming',
          dragging && 'is-lifted',
          dip > 0 && 'is-cast',
          tip && 'is-tip',
          c.denied(powerTarget(slot)) && 'is-denied',
        )}
        data-testid={testid}
        data-ready={castable}
        data-slot={slot}
        data-state={v.state}
        {...(p.pulse && castable ? { 'data-pulse': '' } : {})}
        data-aim={st.s}
        aria-pressed={aiming}
        aria-label={aiming ? t('hud.powerAim.aimingLabel', { name }) : t('hud.power.label', { name, slot: slotName, state: stateText })}
        disabled={c.readOnly}
        style={{
          '--afford': poor ? Math.max(0, Math.min(1, m.me.gold / Math.max(1, cost))) : 1,
        }}
        onPointerDown={(e) => {
          if (c.readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          held.current = false;
          clearPress();
          pressTimer.current = setTimeout(() => {
            pressTimer.current = null;
            const s = stRef.current;
            if (s.s !== 'pressed' || s.wasAiming) return;
            held.current = true;
            setTip(true);
            live.current.c.audio?.play('ui_toggle');
            hapticTier('tick');
          }, LONG_PRESS_MS);
          dispatch({
            e: 'down',
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            ready: castable,
            aimable: c.view?.powerAimable(slot) ?? false,
          });
        }}
        onPointerMove={(e) => {
          const s = stRef.current;
          if ((s.s !== 'pressed' && s.s !== 'dragging') || s.id !== e.pointerId) return;
          // Only resolve the lane once the press is a drag (resolving holds the camera). A drag after a
          // long-press closes the tip and picks the power up as usual.
          if (s.s === 'pressed' && (!s.ready || Math.hypot(e.clientX - s.x, e.clientY - s.y) < POWER_DRAG_PX)) return;
          clearPress();
          if (held.current) {
            held.current = false;
            setTip(false);
          }
          dispatch({
            e: 'move',
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            aim: aimAt(e.clientX, e.clientY),
          });
          if (stRef.current.s === 'dragging') setPos(local(e.clientX, e.clientY));
        }}
        onPointerUp={(e) => {
          clearPress();
          const s = stRef.current;
          if ((s.s !== 'pressed' && s.s !== 'dragging') || s.id !== e.pointerId) return;
          if (held.current && s.s === 'pressed') {
            // A long-press showed the tip: the release neither aims nor casts.
            held.current = false;
            const r = stepPowerAim(s, { e: 'cancel' });
            stRef.current = r.state;
            setSt(r.state);
            return;
          }
          dispatch({
            e: 'up',
            id: e.pointerId,
            aim: s.s === 'dragging' ? aimAt(e.clientX, e.clientY) : NO_AIM,
          });
        }}
        onPointerCancel={() => {
          clearPress();
          dispatch({ e: 'cancel' });
        }}
        onClick={(e) => {
          // Pointer presses are handled above; a keyboard click (Tab focus, then Enter or Space) casts
          // with auto-aim, like the Space and X shortcuts.
          if (e.detail === 0) c.act(powerIntent(m, c.side, undefined, slot));
        }}
      >
        <i class="hud-pw-frame" aria-hidden="true" />
        <ReloadRing frac={v.frac} drainKey={dip} />
        <span class="hud-pw-core">{icon(c.compact ? 26 : 38)}</span>
        {castable ? <i key={`b${readySeq.current.n}`} class="hud-pw-burst" /> : null}
        {castable ? <i key={`s${readySeq.current.n}`} class="hud-pw-sweep" aria-hidden="true" /> : null}
        {reloading ? (
          <span class="hud-pw-secs" data-testid={`hud-power-secs-${slot}`}>
            {v.secondsLeft}
          </span>
        ) : null}
        {locked ? <i class="hud-pw-lock" aria-hidden="true" /> : null}
        <span class={cls('hud-pw-cost', poor && 'is-poor')} data-testid={`hud-power-cost-${slot}`}>
          <CoinIcon size={c.compact ? 11 : 14} />
          {cost}
          {poor ? <i class="hud-pw-cost-fill" /> : null}
        </span>
        <span class="hud-pw-reach" aria-hidden="true">
          <ReachGlyphIcon kind={reachGlyph(def)} size={c.compact ? 16 : 20} />
        </span>
        {castable && !aiming && !dragging ? (
          <i class="hud-power-grab" data-testid={slot === 'home' ? 'hud-power-grab' : 'hud-power-grab-field'}>
            <GrabArrow />
          </i>
        ) : null}
        {aiming ? <i class="hud-power-x" aria-hidden="true" /> : null}
        {c.keys ? <kbd class="hud-key">{slot === 'home' ? t('hud.key.space') : t('hud.key.x')}</kbd> : null}
      </button>
      <PowerTip c={c} def={def} slot={slot} cost={cost} />
      <ReasonTip c={c} target={powerTarget(slot)} align="right" />
      {hint && castable && st.s === 'idle' ? (
        <>
          <div class="hud-power-hint" data-testid="hud-power-hint" role="status">
            <span class="hud-power-hint-text">{t('hud.powerAim.hint')}</span>
          </div>
          <div class="hud-power-hand" data-testid="hud-power-hand" aria-hidden="true">
            <i class="hud-power-hand-ghost">{icon(22)}</i>
            <Hand />
          </div>
        </>
      ) : null}
      {aiming ? (
        <div class="hud-power-chip" data-testid="hud-power-aiming" role="status">
          {t('hud.powerAim.tapField')}
          {tokenLine ? <span class={cls('hud-power-chip-sub', outOfReach && 'is-bad')}>{tokenLine}</span> : null}
        </div>
      ) : null}
      {root && aiming
        ? createPortal(
            <div
              class="hud-power-catch"
              data-testid="hud-power-catch"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                dispatch({
                  e: 'fieldDown',
                  id: e.pointerId,
                  aim: aimAt(e.clientX, e.clientY),
                });
              }}
              onPointerMove={(e) =>
                dispatch({
                  e: 'fieldMove',
                  id: e.pointerId,
                  aim: aimAt(e.clientX, e.clientY),
                })
              }
              onPointerUp={(e) =>
                dispatch({
                  e: 'fieldUp',
                  id: e.pointerId,
                  aim: aimAt(e.clientX, e.clientY),
                })
              }
            />,
            root,
          )
        : null}
      {root && dragging && pos
        ? createPortal(
            <div
              class={cls('hud-power-token', (overHud || outOfReach) && 'is-cancel', !overHud && st.aim.over !== 'off' && 'is-on-lane')}
              data-testid="hud-power-token"
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            >
              <span class="hud-power-token-core">{icon(26)}</span>
              {tokenLine || (!overHud && !outOfReach) ? (
                <span class={cls('hud-power-token-label', !overHud && !outOfReach && 'is-info')} data-testid="hud-power-token-label">
                  {tokenLine ? <span>{tokenLine}</span> : null}
                  {!overHud && !outOfReach ? (
                    <span class="hud-power-token-cost">
                      <CoinIcon size={13} />
                      {t('hud.powerAim.cost', { n: cost })}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>,
            root,
          )
        : null}
    </div>
  );
}

/**
 * The dock: Home and Field side by side (A2.9.10). Only one slot aims at a time. Plays the ready chime
 * when a slot first becomes castable after its cast (at most once per 3 s across both slots).
 */
export function PowerDock(p: { c: HudCtx; pulse: boolean; onSpend?: (amount: number) => void }) {
  const { c } = p;
  const [active, setActive] = useState<PowerSlot | null>(null);
  const home = powerSlotView(c.m, 'home');
  const field = powerSlotView(c.m, 'field');
  const pulseSlot: PowerSlot | null = !p.pulse ? null : home.state === 'castable' ? 'home' : field.state === 'castable' ? 'field' : null;
  // The ready chime (MR-69 per slot): castable for the first time since the slot's last cast.
  const chime = useRef<{
    lastMs: number;
    armed: Record<PowerSlot, boolean>;
    was: Record<PowerSlot, boolean>;
  }>({
    lastMs: -Infinity,
    armed: { home: true, field: true },
    was: { home: home.state === 'castable', field: field.state === 'castable' },
  });
  const ended = c.m.phase === 'ended';
  useEffect(() => {
    const ch = chime.current;
    for (const v of [home, field]) {
      const now = v.state === 'castable' && !ended;
      if (v.state === 'reloading') ch.armed[v.slot] = true;
      if (now && !ch.was[v.slot] && ch.armed[v.slot] && !c.readOnly) {
        ch.armed[v.slot] = false;
        const t = typeof performance !== 'undefined' ? performance.now() : 0;
        if (t - ch.lastMs >= POWER_CHIME_GAP_MS) {
          ch.lastMs = t;
          c.audio?.play('power_ready');
        }
      }
      ch.was[v.slot] = now;
    }
  }, [home.state, field.state, ended]);
  const shown = home.state !== 'empty' || field.state !== 'empty';
  return (
    <div class={cls('hud-dock', !shown && 'is-empty')} data-testid="hud-dock">
      {(['home', 'field'] as const).map((slot) => (
        <PowerSlotButton
          key={slot}
          c={c}
          slot={slot}
          v={slot === 'home' ? home : field}
          pulse={pulseSlot === slot}
          active={active}
          onActive={setActive}
          {...(p.onSpend ? { onSpend: p.onSpend } : {})}
        />
      ))}
    </div>
  );
}
