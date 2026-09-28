/**
 * The HUD bottom tray (DESIGN A9.2, 24% of the height), left to right:
 *
 * 1. Gold counter with income per second and the next Treasury cost; tapping it buys Treasury.
 * 2. Five unit cards (88 px targets on screens >= 900 px wide, 72 px below). Each shows its cost, the
 *    queue count, the radial training fill, the affordable glow, the foil frame and the "ARMY FULL" /
 *    "LEGENDARY IN FIELD" states. Tap trains; right-click or a long press cancels the last queued
 *    instance (A2.12).
 * 3. Army counter ("Army 44/60") and the stance flag (from match 4).
 * 4. The large round Age Power button with its charge ring: tap = auto-aim, drag = place (A2.9).
 * 5. The Last Stand button, only while armed and from match 5 (A2.11).
 */
import type { HudCard } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { BoltIcon, ChargeFlagIcon, CoinIcon, HoldShieldIcon, HornIcon, RoleGlyph } from './icons';
import {
  LONG_PRESS_MS,
  POWER_DRAG_PX,
  cancelIntent,
  cardTarget,
  lastStandIntent,
  lastStandVisible,
  powerFraction,
  powerIntent,
  stanceIntent,
  trainIntent,
  treasuryIntent,
} from './model';
import { usePortrait } from './usePortrait';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function GoldCounter(p: { c: HudCtx; goldRef: (el: HTMLElement | null) => void; bump: boolean }) {
  const { c } = p;
  const { m, t } = c;
  const cost = m.me.nextTreasuryCost;
  const affordable = cost !== null && m.me.gold >= cost;
  return (
    <button
      ref={p.goldRef}
      class={cls('hud-gold', affordable && 'can-buy', p.bump && 'is-bump', c.denied('gold') && 'is-denied')}
      data-testid="hud-gold"
      aria-label={cost !== null ? t('hud.treasuryBuy', { cost }) : t('hud.treasuryMax')}
      disabled={c.readOnly}
      onClick={() => c.act(treasuryIntent(m, c.side))}
    >
      <span class="hud-gold-main">
        <CoinIcon size={c.compact ? 20 : 26} />
        <span class="hud-gold-value" data-testid="hud-gold-value">
          {m.me.gold}
        </span>
      </span>
      <span class="hud-gold-rate">{t('hud.goldRate', { n: m.me.goldPerSec })}</span>
      <span class="hud-gold-treasury">{cost !== null ? t('hud.treasury', { cost }) : t('hud.treasuryMax')}</span>
      {c.compact ? null : <kbd class="hud-key">T</kbd>}
    </button>
  );
}

function Card(p: { c: HudCtx; card: HudCard }) {
  const { c, card } = p;
  const { m, t } = c;
  const def = card.card ? c.config.content.units[card.card] : undefined;
  const size = c.compact ? 72 : 88;
  const url = usePortrait(c.portrait, card.card, card.foil, size);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number; fired: boolean }>({ timer: null, x: 0, y: 0, fired: false });
  // The long press fires 450 ms later; it must read the model of that moment, not of the press.
  const latest = useRef(c);
  latest.current = c;
  useEffect(
    () => () => {
      if (press.current.timer) clearTimeout(press.current.timer);
    },
    [],
  );

  if (card.state === 'empty' || !card.card || !def) {
    return (
      <div class="hud-card is-empty" data-testid={`hud-card-${card.slot}`} data-state="empty" aria-label={t('hud.emptySlot')}>
        <span class="hud-card-lock" />
      </div>
    );
  }

  const endPress = (): void => {
    if (press.current.timer) clearTimeout(press.current.timer);
    press.current.timer = null;
  };
  const name = t(def.nameKey);
  const fill = card.trainFillBp / 10000;
  return (
    <button
      class={cls(
        'hud-card',
        `state-${card.state}`,
        card.foil !== 'none' && `foil-${card.foil}`,
        card.trainFillBp > 0 && 'is-training',
        c.denied(cardTarget(card.slot)) && 'is-denied',
      )}
      data-testid={`hud-card-${card.slot}`}
      data-state={card.state}
      aria-label={t('hud.cardLabel', { name, cost: card.cost })}
      disabled={c.readOnly}
      style={{ '--fill': fill }}
      onClick={() => {
        if (press.current.fired) {
          press.current.fired = false;
          return;
        }
        c.act(trainIntent(m, card.slot, c.side));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        c.act(cancelIntent(m, c.side, card.slot));
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        press.current.fired = false;
        press.current.x = e.clientX;
        press.current.y = e.clientY;
        endPress();
        press.current.timer = setTimeout(() => {
          press.current.timer = null;
          press.current.fired = true;
          const now = latest.current;
          now.act(cancelIntent(now.m, now.side, card.slot));
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        if (press.current.timer && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > POWER_DRAG_PX) endPress();
      }}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={endPress}
    >
      <span class="hud-card-art">{url ? <img src={url} alt="" draggable={false} /> : <RoleGlyph group={def.group} size={size * 0.5} />}</span>
      <i class="hud-card-fill" />
      <span class="hud-card-cost">
        <CoinIcon size={13} />
        {card.cost}
      </span>
      {card.queued > 0 ? (
        <span class="hud-card-queue" data-testid={`hud-card-${card.slot}-queued`} aria-label={t('hud.queued', { n: card.queued })}>
          {card.queued}
        </span>
      ) : null}
      {card.state === 'armyFull' ? <span class="hud-card-tag">{t('hud.armyFull')}</span> : null}
      {card.state === 'legendaryInField' ? <span class="hud-card-tag is-legendary">{t('hud.legendaryInField')}</span> : null}
      {c.compact ? null : <kbd class="hud-key">{card.slot + 1}</kbd>}
    </button>
  );
}

function Army(p: { c: HudCtx }) {
  const { c } = p;
  const { m, t } = c;
  const full = m.me.pop >= m.me.popCap;
  return (
    <div class={cls('hud-army', c.denied('army') && 'is-denied')} data-testid="hud-army">
      <span class={cls('hud-army-count', full && 'is-full')}>{t('hud.army', { pop: m.me.pop, cap: m.me.popCap })}</span>
      {m.me.stanceVisible ? (
        <button
          class={cls('hud-stance', `stance-${m.me.stance}`, c.denied('stance') && 'is-denied')}
          data-testid="hud-stance"
          data-stance={m.me.stance}
          aria-label={t('hud.stanceLabel', { stance: t(`hud.stance.${m.me.stance}`) })}
          disabled={c.readOnly}
          onClick={() => c.act(stanceIntent(m, c.side))}
        >
          {m.me.stance === 'charge' ? <ChargeFlagIcon size={20} /> : <HoldShieldIcon size={20} />}
          <span>{t(`hud.stance.${m.me.stance}`)}</span>
          {c.compact ? null : <kbd class="hud-key">S</kbd>}
        </button>
      ) : null}
    </div>
  );
}

interface Drag {
  id: number;
  x: number;
  y: number;
  dragging: boolean;
  p: number | null;
}

function PowerButton(p: { c: HudCtx }) {
  const { c } = p;
  const { m, t } = c;
  const charge = powerFraction(m.me.powerPpm);
  const ready = charge >= 1 && m.phase !== 'ended';
  const def = c.config.content.powers[m.me.power];
  const url = usePortrait(c.portrait, m.me.power || null, 'none', 72);
  const drag = useRef<Drag | null>(null);
  const [aiming, setAiming] = useState(false);

  const stop = (): void => {
    if (drag.current?.dragging) c.view?.previewPower(null);
    drag.current = null;
    setAiming(false);
  };
  useEffect(() => () => c.view?.previewPower(null), [c.view]);

  return (
    <button
      class={cls('hud-power', ready && 'is-ready', aiming && 'is-aiming', c.denied('power') && 'is-denied')}
      data-testid="hud-power"
      data-ready={ready}
      aria-label={def ? t('hud.powerLabel', { name: t(def.nameKey), pct: Math.floor(charge * 100) }) : t('hud.power')}
      disabled={c.readOnly}
      style={{ '--charge': charge }}
      onPointerDown={(e) => {
        if (c.readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false, p: null };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (!d.dragging) {
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < POWER_DRAG_PX) return;
          // Only a charged, aimable power can be placed; others keep the tap (auto-aim) meaning.
          if (!ready || !c.view?.powerAimable()) return;
          d.dragging = true;
          setAiming(true);
        }
        d.p = c.view?.laneP(e.clientX, e.clientY) ?? null;
        c.view?.previewPower(d.p);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const placed = d.dragging;
        const at = d.p;
        stop();
        if (!placed) c.act(powerIntent(m, c.side));
        // A drag released off the lane is a cancel.
        else if (at !== null) c.act(powerIntent(m, c.side, at));
      }}
      onPointerCancel={stop}
      onClick={(e) => {
        // Pointer presses are handled above; a keyboard click (Tab focus, then Enter or Space) casts
        // with auto-aim, like the Space shortcut.
        if (e.detail === 0) c.act(powerIntent(m, c.side));
      }}
    >
      <i class="hud-power-ring" />
      <span class="hud-power-core">{url ? <img src={url} alt="" draggable={false} /> : <BoltIcon size={c.compact ? 30 : 38} />}</span>
      {c.compact ? null : <kbd class="hud-key">␣</kbd>}
    </button>
  );
}

function LastStandButton(p: { c: HudCtx }) {
  const { c } = p;
  const { m, t } = c;
  if (!lastStandVisible(m)) return null;
  const charging = m.me.lastStand === 'charging';
  return (
    <button
      class={cls('hud-laststand', charging && 'is-charging', c.denied('lastStand') && 'is-denied')}
      data-testid="hud-laststand"
      data-state={m.me.lastStand}
      aria-label={t('hud.lastStand')}
      disabled={c.readOnly}
      onClick={() => c.act(lastStandIntent(m, c.side))}
    >
      <HornIcon size={c.compact ? 24 : 30} />
      <span>{t('hud.lastStand')}</span>
      {c.compact ? null : <kbd class="hud-key">L</kbd>}
    </button>
  );
}

export function Tray(p: { c: HudCtx; goldRef: (el: HTMLElement | null) => void; goldBump: boolean }) {
  const { c } = p;
  return (
    <div class="hud-tray" data-testid="hud-tray">
      <GoldCounter c={c} goldRef={p.goldRef} bump={p.goldBump} />
      <div class="hud-cards">
        {c.m.me.cards.map((card) => (
          <Card key={card.slot} c={c} card={card} />
        ))}
      </div>
      <Army c={c} />
      <PowerButton c={c} />
      <LastStandButton c={c} />
    </div>
  );
}
