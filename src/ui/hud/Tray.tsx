/**
 * The HUD bottom tray (DESIGN A9.2; docs/ui-plan.md 4.7, 6.5). Actions along the bottom, under the
 * thumbs, left to right:
 *
 * 1. **Left cluster** (100 px on phones): the gold counter with its income on one line and the army
 *    counter ("Army 44/60") under it; a tap opens the War Council on the Economy track (A18.5.4).
 *    Under them, side by side, the round War Council button (`Council.tsx`, A18.5.7) and the round
 *    **Evolve** button with its XP ring (moved from the top bar to the left thumb, UA-05). Evolve
 *    glows when ready and breathes only when it is the one pulse (U11); after your evolve it stays dark
 *    for 2 s even with full XP (UA-07).
 * 2. **Six unit cards** (62 × 84 on 844 px phones, 56 × 76 below 820 px wide, 72 × 96 from 900 px,
 *    88 × 116 on desktops). Cost top-left, class icon top-right, the name in up to two lines at the
 *    bottom (never an ellipsis), a radial training fill, the queue badge, the key badge once keys are
 *    used. Affordable cards glow and rest (they never keep moving). Empty loadout slots show a quiet
 *    socket so the tray never jumps between ages.
 *    - **Train on release** (U10): a card trains when a press ends within 450 ms and moved less than
 *      8 px; the pressed look shows on `pointerdown` (U3). The long-press ring (MR-07) starts after
 *      150 ms; at 450 ms the card's tip opens instead and nothing trains. The tip shows class, counters
 *      and, while the card has a queue, "Cancel one" (the touch alternative to A2.12's right-click).
 *      Hover (desktop) opens the same tip after 350 ms. Keys train on keydown (`Hud.tsx`).
 *    - A train pops the card (MR-65) with a short flash and floats "-50" from the gold; a denied press
 *      flashes red, shakes and says why above the card (MR-03, MR-67).
 * 3. **Stance** (`Stance.tsx`): one 56 px button with a flyout (A18.4 as changed by ui-plan 2.9 #5).
 * 4. **The power dock** (`PowerButton.tsx`, A2.9.10): Home and Field, 64 px each on phones (96 on
 *    desktops), 6 px apart; drag onto the field (A18.9.2). Last Stand floats above the Home button only
 *    while armed (A2.11).
 *
 * Width check at 844 (A2.9.10): cluster 100 + 8 + cards 402 + 8 + stance 56 + 8 + dock 134 = 716 within
 * 750 (the reserved Fort space goes to the dock until forts ship); below 820 px 92 + 6 + 361 + 6 + 56 +
 * 6 + 117 = 644 within 686.
 */
import type { AgeId, HudCard, UnitDef } from '@/contracts';
import { Fragment } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MOTION_DUR, MOTION_TRANSFORM } from '@/core/motion';
import type { HudCtx } from './context';
import { counterClasses, isLegendaryUnit, unitClass } from '@/core/cardClass';
import { ClassIcon, CLASS_NAME_KEY } from '../components/ClassIcon';
import { animate, ease, reducedMotion, scaleOf } from '../components/motion';
import { haptic } from '../components/haptics';
import { CouncilButton } from './Council';
import type { CouncilView } from './council';
import { AgeGlyph, CoinIcon, HornIcon, RoleGlyph } from './icons';
import {
  LONG_PRESS_MS,
  TAP_SLOP_PX,
  affordFraction,
  ageIds,
  cancelIntent,
  cardTarget,
  evolveIntent,
  goldIntent,
  lastStandIntent,
  lastStandVisible,
  secondsUntilAffordable,
  trainIntent,
  type HudPulse,
} from './model';
import { PowerDock } from './PowerButton';
import { useFitLabel } from './fit';
import { ReasonTip } from './Reason';
import { StanceControl } from './Stance';
import { usePortrait } from './usePortrait';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** A number that floats up from an element ("-50" from the gold). */
export interface Float {
  id: number;
  text: string;
  kind: 'spend' | 'need';
  /** Card slot for card floats; -1 = the gold counter. */
  slot: number;
}

const FLOAT_MS = 900;
/** The tip a long-press pinned stays this long unless the player taps elsewhere first. */
const TIP_PIN_MS = 4000;

/** MR-03: a red flash and a ±4 px shake for two frames (the flash is CSS, `is-denied`). */
function shake(el: Element | null): void {
  if (!el || reducedMotion(el)) return;
  animate(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], {
    duration: MOTION_DUR.small,
    easing: ease('out'),
    fill: 'none',
  });
}

/** MR-65: on release the card pops to 1.06 and settles (120 ms, back). */
function popCard(el: Element | null, peak: number = MOTION_TRANSFORM.lift): void {
  if (!el || reducedMotion(el)) return;
  animate(el, [{ transform: `scale(${scaleOf(MOTION_TRANSFORM.pressScale)})` }, { transform: `scale(${scaleOf(peak)})`, offset: 0.45 }, { transform: 'scale(1)' }], {
    duration: MOTION_DUR.small,
    easing: ease('out'),
    fill: 'none',
  });
}

function GoldCounter(p: { c: HudCtx; goldRef: (el: HTMLElement | null) => void; bump: boolean; floats: Float[] }) {
  const { c } = p;
  const { m, t } = c;
  const full = m.me.pop >= m.me.popCap;
  return (
    <button
      ref={p.goldRef}
      class={cls('hud-gold', p.bump && 'is-bump', c.denied('gold') && 'is-denied')}
      data-testid="hud-gold"
      aria-label={t('hud.goldLabel', { n: m.me.gold })}
      disabled={c.readOnly}
      onClick={() => c.act(goldIntent(m))}
    >
      <span class="hud-gold-main">
        <CoinIcon size={c.compact ? 16 : 20} />
        <span class="hud-gold-value" data-testid="hud-gold-value">
          {m.me.gold}
        </span>
        <span class="hud-gold-rate">{t('hud.goldRate', { n: m.me.goldPerSec })}</span>
      </span>
      {m.me.stanceVisible ? (
        <span class={cls('hud-army-count', full && 'is-full', c.denied('army') && 'is-denied')} data-testid="hud-army" aria-label={t('hud.armyLabel')}>
          {t('hud.army', { pop: m.me.pop, cap: m.me.popCap })}
        </span>
      ) : null}
      {p.floats
        .filter((f) => f.slot === -1)
        .map((f) => (
          <span key={f.id} class={`hud-float hud-float-${f.kind}`} data-testid="hud-gold-float">
            {f.text}
          </span>
        ))}
    </button>
  );
}

/** What a card is (hover on desktop, a long-press on touch): class and counters as class icons. */
function CardInfo(p: { c: HudCtx; def: UnitDef; queued: number; pinned: boolean; onCancel: () => void }) {
  const { c, def } = p;
  const units = c.config.content.units;
  const klass = unitClass(def);
  const { strong, weak } = counterClasses(def.strongVs, def.weakVs, units, klass);
  const row = (key: 'hud.info.strongVs' | 'hud.info.weakVs', list: typeof strong, tone: string) =>
    list.length > 0 ? (
      <div class={cls('hud-card-info-vs', tone)} data-testid={tone === 'is-good' ? 'hud-info-strong' : 'hud-info-weak'}>
        <span class="hud-card-info-vs-label">{c.t(key)}</span>
        {list.map((k) => (
          <span key={k} class="hud-card-info-vs-item">
            <ClassIcon id={k} size={18} />
            {c.t(CLASS_NAME_KEY[k])}
          </span>
        ))}
      </div>
    ) : null;
  return (
    <div class="hud-card-info" role="tooltip" data-testid="hud-card-info">
      <div class="hud-card-info-name">
        <ClassIcon id={klass} size={22} />
        {c.t(def.nameKey)}
      </div>
      <div class="hud-card-info-role" data-testid="hud-info-class">
        {c.t(CLASS_NAME_KEY[klass])}
        {isLegendaryUnit(def) ? <span class="hud-card-info-legendary">{c.t(CLASS_NAME_KEY.legendary)}</span> : null}
      </div>
      <div class="hud-card-info-desc">{c.t(def.descKey)}</div>
      <div class="hud-card-info-stats">
        <span>{c.t('hud.info.hp', { n: def.hp })}</span>
        <span>{c.t('hud.info.cost', { n: def.cost })}</span>
      </div>
      {row('hud.info.strongVs', strong, 'is-good')}
      {row('hud.info.weakVs', weak, 'is-bad')}
      {p.pinned && p.queued > 0 && !c.readOnly ? (
        <button class="hud-card-info-cancel" data-testid="hud-card-cancel" onClick={p.onCancel}>
          {c.t('hud.tip.cancelOne', { n: p.queued })}
        </button>
      ) : null}
    </div>
  );
}

interface Press {
  id: number;
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout> | null;
  /** The long-press fired: the release opens nothing and trains nothing. */
  held: boolean;
}

function Card(p: { c: HudCtx; card: HudCard; floats: Float[]; onFloat: (f: Omit<Float, 'id'>) => void }) {
  const { c, card } = p;
  const { m, t } = c;
  const def = card.card ? c.config.content.units[card.card] : undefined;
  const url = usePortrait(c.portrait, card.card, card.foil, c.compact ? 72 : 88);
  const press = useRef<Press | null>(null);
  const [pressed, setPressed] = useState(false);
  // The tip: pinned by a long-press (touch) until a tap elsewhere; hover shows it through CSS.
  const [pinned, setPinned] = useState(false);
  // A card you are tapping to train is not a card you want explained: after a train the hover tip
  // stays away until the pointer leaves the card, so it never sits over the battlefield mid-fight.
  const [quiet, setQuiet] = useState(false);
  const [flash, setFlash] = useState(0);
  const self = useRef<HTMLButtonElement>(null);
  const slotEl = useRef<HTMLDivElement>(null);
  const nameEl = useRef<HTMLSpanElement>(null);
  const nameText = def ? t(def.nameKey) : '';
  // Names wrap between words and never take an ellipsis (U6); a word wider than the card ("Dreadnought"
  // on a 62 px card) is condensed horizontally to fit, never cut.
  const [fitSeq, setFitSeq] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const on = (): void => setFitSeq((n) => n + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useLayoutEffect(() => {
    const el = nameEl.current;
    const box = self.current;
    if (!el || !box) return;
    let widest = 0;
    for (const w of Array.from(el.children)) widest = Math.max(widest, (w as HTMLElement).offsetWidth);
    const avail = box.clientWidth - 4;
    el.style.setProperty('--fit', String(widest > avail && widest > 0 ? Math.max(0.7, avail / widest) : 1));
  }, [nameText, c.compact, fitSeq]);
  // The long press fires 450 ms later; it must read the model of that moment, not of the press.
  const latest = useRef(c);
  latest.current = c;
  useEffect(
    () => () => {
      if (press.current?.timer) clearTimeout(press.current.timer);
    },
    [],
  );
  // MR-66: a unit walked out, the radial fill closed: a small 1.05 pop.
  const trainedSeq = useRef(card.queued);
  useEffect(() => {
    if (card.queued < trainedSeq.current) popCard(self.current, 1050);
    trainedSeq.current = card.queued;
  }, [card.queued]);
  // A pinned tip closes on a tap anywhere else, or after a while.
  useEffect(() => {
    if (!pinned) return undefined;
    const close = (e: PointerEvent): void => {
      if (slotEl.current && e.target instanceof Node && slotEl.current.contains(e.target)) return;
      setPinned(false);
    };
    const id = setTimeout(() => setPinned(false), TIP_PIN_MS);
    document.addEventListener('pointerdown', close, true);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', close, true);
    };
  }, [pinned]);

  if (card.state === 'empty' || !card.card || !def) return <EmptySlot c={c} slot={card.slot} />;

  const endPress = (): void => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    press.current = null;
    setPressed(false);
  };
  const train = (el: HTMLElement): void => {
    const now = latest.current;
    const i = trainIntent(now.m, card.slot, now.side, now.config.content.economy.queueMax);
    now.act(i);
    if (i.k === 'command') {
      if (!quiet) setQuiet(true);
      popCard(el);
      setFlash((f) => f + 1);
      now.audio?.play('ui_click');
      haptic('tick');
      p.onFloat({ text: `-${card.cost}`, kind: 'spend', slot: -1 });
    } else if (i.k === 'deny') {
      shake(el);
    }
  };
  const name = t(def.nameKey);
  const fill = card.trainFillBp / 10000;
  const poor = card.state === 'unaffordable' && m.me.gold < card.cost;
  const waitS = poor ? secondsUntilAffordable(card.cost, m.me.gold, m.me.goldPerSec) : null;
  const afford = poor ? affordFraction(card.cost, m.me.gold) : 1;
  const klass = unitClass(def);
  return (
    <div ref={slotEl} class={cls('hud-card-slot', quiet && 'is-quiet', pinned && 'is-pinned')} onPointerLeave={() => setQuiet(false)}>
      <button
        ref={self}
        class={cls(
          'hud-card',
          `state-${card.state}`,
          card.foil !== 'none' && `foil-${card.foil}`,
          card.trainFillBp > 0 && 'is-training',
          pressed && 'is-pressed',
          c.denied(cardTarget(card.slot)) && 'is-denied',
        )}
        data-testid={`hud-card-${card.slot}`}
        data-state={card.state}
        aria-label={t('hud.cardLabel', { name, cost: card.cost })}
        disabled={c.readOnly}
        style={{ '--fill': fill, '--afford': afford }}
        onPointerDown={(e) => {
          if (c.readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
          if (press.current?.timer) clearTimeout(press.current.timer);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          const pr: Press = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: null, held: false };
          pr.timer = setTimeout(() => {
            pr.timer = null;
            pr.held = true;
            setPressed(false);
            setPinned(true);
            latest.current.audio?.play('ui_toggle');
            haptic('tick');
          }, LONG_PRESS_MS);
          press.current = pr;
          setPressed(true);
        }}
        onPointerMove={(e) => {
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId || pr.held) return;
          if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > TAP_SLOP_PX) endPress();
        }}
        onPointerUp={(e) => {
          const pr = press.current;
          if (!pr || pr.id !== e.pointerId) return;
          const held = pr.held;
          endPress();
          if (!held) train(e.currentTarget as HTMLElement);
        }}
        onPointerCancel={endPress}
        onClick={(e) => {
          // Pointer presses train on release above; a keyboard click (Tab focus, Enter) trains here.
          if (e.detail === 0) train(e.currentTarget as HTMLElement);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          endPress();
          c.act(cancelIntent(m, c.side, card.slot));
        }}
      >
        <span class="hud-card-art">{url ? <img src={url} alt="" draggable={false} /> : <RoleGlyph group={def.group} size={30} />}</span>
        {poor ? <i class="hud-card-afford" /> : null}
        <i class="hud-card-train" aria-hidden="true" />
        <span ref={nameEl} class="hud-card-name" data-clip-check data-tag>
          {name.split(' ').map((w, i) => (
            <Fragment key={i}>
              {i > 0 ? ' ' : null}
              <span>{w}</span>
            </Fragment>
          ))}
        </span>
        <span class="hud-card-cost">
          <CoinIcon size={c.compact ? 10 : 13} />
          {card.cost}
        </span>
        <span class="hud-card-class" data-testid={`hud-card-${card.slot}-class`} data-class={klass}>
          <ClassIcon id={klass} size={c.compact ? 16 : 22} title={t(CLASS_NAME_KEY[klass])} />
        </span>
        {waitS !== null && waitS > 0 ? (
          <span class={cls('hud-card-wait', card.queued > 0 && 'is-shifted')} data-testid={`hud-card-${card.slot}-wait`}>
            {t('hud.wait', { s: waitS })}
          </span>
        ) : null}
        {card.queued > 0 ? (
          <span key={`q${card.queued}`} class="hud-card-queue" data-testid={`hud-card-${card.slot}-queued`} aria-label={t('hud.queued', { n: card.queued })}>
            {card.queued}
          </span>
        ) : null}
        {card.state === 'armyFull' ? <span class="hud-card-tag">{t('hud.armyFull')}</span> : null}
        {card.state === 'legendaryInField' ? (
          // The short form fits the card; a press says it in full ("Legendary in field", MR-67).
          <span class="hud-card-tag is-legendary" title={t('hud.legendaryInField')}>
            {t('hud.inField')}
          </span>
        ) : null}
        {flash > 0 ? <i key={`f${flash}`} class="hud-card-flash" aria-hidden="true" /> : null}
        {pressed ? (
          <svg class="hud-card-hold" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="17" pathLength="100" />
          </svg>
        ) : null}
        {c.keys ? <kbd class="hud-key">{card.slot + 1}</kbd> : null}
      </button>
      <ReasonTip c={c} target={cardTarget(card.slot)} />
      {p.floats
        .filter((f) => f.slot === card.slot)
        .map((f) => (
          <span key={f.id} class={`hud-float hud-float-${f.kind}`}>
            {f.text}
          </span>
        ))}
      <div class={cls('hud-card-info-wrap', pinned && 'is-open')}>
        <CardInfo
          c={c}
          def={def}
          queued={card.queued}
          pinned={pinned}
          onCancel={() => {
            const now = latest.current;
            now.act(cancelIntent(now.m, now.side, card.slot));
            now.audio?.play('ui_toggle');
          }}
        />
      </div>
    </div>
  );
}

/** A loadout slot without a card: a quiet socket, so six slots always show and nothing jumps. */
function EmptySlot(p: { c: HudCtx; slot: number }) {
  return (
    <div class="hud-card-slot">
      <div class="hud-card is-empty" data-testid={`hud-card-${p.slot}-empty`} aria-hidden="true" />
    </div>
  );
}

/** The one padlock slot for a card the match unlocks later (match 1's scripted tray). */
function LockedSlot(p: { c: HudCtx }) {
  return (
    <div class="hud-card-slot">
      <div class="hud-card is-locked" data-testid="hud-card-locked" aria-label={p.c.t('hud.lockedSlot')}>
        <span class="hud-card-lock" />
      </div>
    </div>
  );
}

/**
 * The round Evolve button in the left cluster (ui-plan 4.7, UA-05): its ring fills with XP; ready, it
 * turns gold with a steady glow and shows the next age; it breathes only as the one pulse (U11).
 */
function EvolveButton(p: { c: HudCtx; nextAge: AgeId | undefined; rearming: boolean; pulse: boolean }) {
  const { c } = p;
  const { m, t } = c;
  const ready = m.me.evolveReady && !p.rearming && !m.me.ascending;
  const label = m.me.ascending ? t('hud.evolving') : ready ? t('hud.evolveReady') : t('hud.evolve');
  // The visible tag stays short ("Evolve" / "Evolve!"); the spinning ring says it is evolving.
  const tag = ready ? t('hud.evolveReady') : t('hud.evolve');
  const xp = p.rearming ? 0 : Math.max(0, Math.min(1, m.me.xpBp / 10000));
  const tagEl = useRef<HTMLSpanElement>(null);
  const btnEl = useRef<HTMLButtonElement>(null);
  useFitLabel(tagEl, () => (btnEl.current ? btnEl.current.clientWidth : 0), [tag, c.compact]);
  return (
    <div class="hud-evolve-wrap">
      <button
        ref={btnEl}
        class={cls('hud-evolve', ready && 'is-ready', p.pulse && ready && 'is-pulse', m.me.ascending && 'is-ascending', c.denied('evolve') && 'is-denied')}
        data-testid="hud-evolve"
        data-ready={ready}
        {...(p.pulse && ready ? { 'data-pulse': '' } : {})}
        aria-disabled={!ready}
        aria-label={label}
        disabled={c.readOnly}
        style={{ '--xp': xp }}
        onClick={(e) => {
          const i = evolveIntent(m, c.side, c.config, p.rearming);
          c.act(i);
          if (i.k === 'deny') shake(e.currentTarget);
          else if (i.k === 'command') haptic('thump');
        }}
      >
        <i class="hud-evolve-ring" />
        <span class="hud-evolve-disc">{p.nextAge ? <AgeGlyph age={p.nextAge} size={c.compact ? 24 : 30} /> : null}</span>
        <span class="hud-evolve-label" data-tag>
          <span ref={tagEl} class="hud-fit">
            {tag}
          </span>
        </span>
        {c.keys ? <kbd class="hud-key">E</kbd> : null}
      </button>
      <ReasonTip c={c} target="evolve" align="left" />
    </div>
  );
}

// The Age Power button and its drag / tap-to-aim targeting live in `PowerButton.tsx`.
export { MINIMAP_HIT_PX, minimapDropX } from './PowerButton';

/** Last Stand (A2.11): 56 px round, floating above the Home power only while armed. */
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
      <HornIcon size={c.compact ? 22 : 28} />
      <span class="hud-laststand-label" data-tag>
        {t('hud.lastStand')}
      </span>
      {c.keys ? <kbd class="hud-key">L</kbd> : null}
    </button>
  );
}

/** True while the match still has a scripted card unlock for this side ahead (match 1). */
export function hasPendingUnlock(c: HudCtx): boolean {
  const script = c.config.training?.script;
  if (!script) return false;
  const tick = Math.floor(c.m.clockMs / 50);
  return script.some((e) => e.side === c.side && e.unlockSlot !== undefined && e.tick > tick);
}

/** The War Council button's state, owned by `Hud.tsx` (the sheet lives there). */
export interface TrayCouncil {
  v: CouncilView;
  open: boolean;
  toggle: () => void;
  burst: number;
  stamp: number;
  btnRef: (el: HTMLElement | null) => void;
}

export function Tray(p: {
  c: HudCtx;
  goldRef: (el: HTMLElement | null) => void;
  goldBump: boolean;
  council?: TrayCouncil | null;
  /** A research spend to float from the gold counter ("-150"); a new `id` floats once. */
  spend?: { id: number; amount: number } | null;
  /** The 2 s after your own evolve (UA-07): Evolve stays dark. */
  evolveRearming: boolean;
  /** The one attention pulse (U11). */
  pulse: HudPulse;
  trayRef?: (el: HTMLElement | null) => void;
}) {
  const { c } = p;
  const [floats, setFloats] = useState<Float[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const set = timers.current;
    return () => {
      for (const id of set) clearTimeout(id);
    };
  }, []);
  const addFloat = (f: Omit<Float, 'id'>): void => {
    const id = nextId.current++;
    setFloats((list) => [...list.slice(-5), { ...f, id }]);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setFloats((list) => list.filter((x) => x.id !== id));
    }, FLOAT_MS);
    timers.current.add(timer);
  };
  const spendId = p.spend?.id ?? 0;
  useEffect(() => {
    if (p.spend) addFloat({ text: `-${p.spend.amount}`, kind: 'spend', slot: -1 });
    // One float per spend id.
  }, [spendId]);
  const ages = ageIds(c.config);
  const age = ages[c.m.me.ageIndex] ?? 'stone';
  const fmt = c.config.content.formats[c.config.format];
  const finalAge = !fmt || c.m.me.ageIndex >= fmt.ages.length - 1;
  // The scripted first match shows only its cards (and a padlock for the one to come); every other
  // match shows all six loadout slots, empty ones as quiet sockets.
  const scripted = c.config.training?.script !== undefined;
  const cards = scripted ? c.m.me.cards.filter((card) => card.state !== 'empty' && card.card) : c.m.me.cards;
  return (
    <div class="hud-tray" data-testid="hud-tray" ref={p.trayRef}>
      <div class="hud-cluster">
        <GoldCounter c={c} goldRef={p.goldRef} bump={p.goldBump} floats={floats} />
        <div class="hud-cluster-row">
          {p.council ? (
            <CouncilButton c={c} v={p.council.v} open={p.council.open} onToggle={p.council.toggle} burst={p.council.burst} stamp={p.council.stamp} btnRef={p.council.btnRef} />
          ) : (
            <span class="hud-cluster-gap" />
          )}
          {finalAge ? <span class="hud-cluster-gap" /> : <EvolveButton c={c} nextAge={ages[c.m.me.ageIndex + 1]} rearming={p.evolveRearming} pulse={p.pulse === 'evolve'} />}
        </div>
      </div>
      <div class="hud-cards-area">
        <div class="hud-cards">
          {cards.map((card, i) => (
            // Keyed by age: after an evolve the new cards flip in, one after another (MR-80).
            <div key={`${age}-${card.slot}`} class="hud-card-flip" style={{ '--i': i }}>
              <Card c={c} card={card} floats={floats} onFloat={addFloat} />
            </div>
          ))}
          {hasPendingUnlock(c) ? <LockedSlot c={c} /> : null}
        </div>
      </div>
      <StanceControl c={c} />
      <div class="hud-power-col">
        <LastStandButton c={c} />
        <PowerDock c={c} pulse={p.pulse === 'power'} onSpend={(n) => addFloat({ text: `-${n}`, kind: 'spend', slot: -1 })} />
      </div>
    </div>
  );
}
