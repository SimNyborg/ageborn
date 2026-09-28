/**
 * The HUD bottom tray (DESIGN A9.2, 24% of the height), left to right:
 *
 * 1. Gold counter with income per second and the next income upgrade ("+Income · 200", the
 *    Treasury); tapping it buys it. Spending floats "-50" up from it; coins landing pop it.
 * 2. The unit cards (88 px targets on screens >= 900 px wide, 72 px below). Each shows its name
 *    ribbon and role icon, its cost, a gold queue badge, the training fill rising from the bottom, the
 *    affordable glow, the foil frame and the "ARMY FULL" / "LEGENDARY IN FIELD" states. A card you
 *    cannot afford yet fills up toward affordable and says when ("4s"); tapping it shakes it and
 *    floats "Need 23". Tap trains (the card squashes and pops); right-click or a long press cancels
 *    the last queued instance (A2.12). Empty slots are hidden; a match that unlocks a card later
 *    shows one padlock slot. Hovering a card (desktop) or its "i" corner (touch) shows what it is.
 *    After an evolve the cards flip over to the new age's units.
 * 3. Army counter and the stance flag (from match 4).
 * 4. The large round Age Power button with its charge ring and name (`PowerButton.tsx`): drag it
 *    onto the battlefield to place it; a tap starts aiming mode (A2.9, owner decision "Age Power
 *    targeting"). When full it bursts, lifts, bobs and says "READY".
 * 5. The Last Stand button, only while armed and from match 5 (A2.11).
 */
import type { HudCard, UnitDef } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { counterClasses, isLegendaryUnit, unitClass } from '@/core/cardClass';
import { ClassIcon, CLASS_NAME_KEY } from '../components/ClassIcon';
import { ChargeFlagIcon, CoinIcon, HoldShieldIcon, HornIcon, RoleGlyph } from './icons';
import {
  LONG_PRESS_MS,
  POWER_DRAG_PX,
  affordFraction,
  ageIds,
  cancelIntent,
  cardTarget,
  lastStandIntent,
  lastStandVisible,
  secondsUntilAffordable,
  stanceIntent,
  trainIntent,
  treasuryIntent,
} from './model';
import { PowerButton } from './PowerButton';
import { usePortrait } from './usePortrait';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** A number that floats up from an element ("-50" from the gold, "Need 23" over a card). */
export interface Float {
  id: number;
  text: string;
  kind: 'spend' | 'need';
  /** Card slot for "need" floats; -1 = the gold counter. */
  slot: number;
}

const FLOAT_MS = 900;
const TAP_FRAMES: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(0.92)', offset: 0.3 }, { transform: 'scale(1.05)', offset: 0.65 }, { transform: 'scale(1)' }];
const DENY_FRAMES: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px) rotate(-2deg)' },
  { transform: 'translateX(6px) rotate(2deg)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(3px)' },
  { transform: 'translateX(0)' },
];

function kick(el: Element | null, frames: Keyframe[], ms: number): void {
  if (el && typeof (el as HTMLElement).animate === 'function') (el as HTMLElement).animate(frames, { duration: ms, easing: 'ease-out' });
}

function GoldCounter(p: { c: HudCtx; goldRef: (el: HTMLElement | null) => void; bump: boolean; floats: Float[] }) {
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
        <CoinIcon size={c.compact ? 22 : 28} />
        <span class="hud-gold-value" data-testid="hud-gold-value">
          {m.me.gold}
        </span>
      </span>
      <span class="hud-gold-rate">{t('hud.goldRate', { n: m.me.goldPerSec })}</span>
      <span class="hud-gold-treasury">{cost !== null ? t('hud.treasury', { cost }) : t('hud.treasuryMax')}</span>
      {p.floats
        .filter((f) => f.slot === -1)
        .map((f) => (
          <span key={f.id} class={`hud-float hud-float-${f.kind}`} data-testid="hud-gold-float">
            {f.text}
          </span>
        ))}
      {c.keys ? <kbd class="hud-key">T</kbd> : null}
    </button>
  );
}

/** What a card is (hover on desktop, the "i" corner on touch): class, counters as class icons. */
function CardInfo(p: { c: HudCtx; def: UnitDef }) {
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
    </div>
  );
}

function Card(p: { c: HudCtx; card: HudCard; floats: Float[]; onFloat: (f: Omit<Float, 'id'>) => void }) {
  const { c, card } = p;
  const { m, t } = c;
  const def = card.card ? c.config.content.units[card.card] : undefined;
  const size = c.compact ? 72 : 88;
  const url = usePortrait(c.portrait, card.card, card.foil, size);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number; fired: boolean }>({ timer: null, x: 0, y: 0, fired: false });
  const [info, setInfo] = useState(false);
  // A card you are tapping to train is not a card you want explained: after a tap the hover info
  // stays away until the pointer leaves the card, so it never sits over the battlefield mid-fight.
  const [quiet, setQuiet] = useState(false);
  const self = useRef<HTMLButtonElement>(null);
  // The long press fires 450 ms later; it must read the model of that moment, not of the press.
  const latest = useRef(c);
  latest.current = c;
  useEffect(
    () => () => {
      if (press.current.timer) clearTimeout(press.current.timer);
    },
    [],
  );
  // A just-trained unit walked out: the card gives a small pop.
  const trainedSeq = useRef(card.queued);
  useEffect(() => {
    if (card.queued < trainedSeq.current) kick(self.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], 220);
    trainedSeq.current = card.queued;
  }, [card.queued]);
  useEffect(() => {
    if (!info) return undefined;
    const id = setTimeout(() => setInfo(false), 3500);
    return () => clearTimeout(id);
  }, [info]);

  if (card.state === 'empty' || !card.card || !def) return null;

  const endPress = (): void => {
    if (press.current.timer) clearTimeout(press.current.timer);
    press.current.timer = null;
  };
  const name = t(def.nameKey);
  const fill = card.trainFillBp / 10000;
  const waitS = card.state === 'unaffordable' ? secondsUntilAffordable(card.cost, m.me.gold, m.me.goldPerSec) : null;
  const afford = card.state === 'unaffordable' ? affordFraction(card.cost, m.me.gold) : 1;
  const poor = card.state === 'unaffordable' && m.me.gold < card.cost;
  return (
    <div class={cls('hud-card-slot', quiet && 'is-quiet')} onPointerLeave={() => setQuiet(false)}>
      <button
        ref={self}
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
        style={{ '--fill': fill, '--afford': afford }}
        onClick={(e) => {
          if (!quiet) setQuiet(true);
          if (press.current.fired) {
            press.current.fired = false;
            return;
          }
          const i = trainIntent(m, card.slot, c.side);
          c.act(i);
          if (i.k === 'command') {
            kick(e.currentTarget, TAP_FRAMES, 240);
            p.onFloat({ text: `-${card.cost}`, kind: 'spend', slot: -1 });
          } else if (i.k === 'deny') {
            kick(e.currentTarget, DENY_FRAMES, 300);
            if (poor) p.onFloat({ text: t('hud.need', { n: card.cost - m.me.gold }), kind: 'need', slot: card.slot });
          }
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
        <span class="hud-card-class" data-testid={`hud-card-${card.slot}-class`} data-class={unitClass(def)}>
          <ClassIcon id={unitClass(def)} size={c.compact ? 19 : 22} />
        </span>
        {card.state === 'unaffordable' && poor ? <i class="hud-card-afford" /> : null}
        <i class="hud-card-fill" />
        <span class="hud-card-name">
          <span class="hud-card-name-text">{name}</span>
        </span>
        <span class="hud-card-cost">
          <CoinIcon size={13} />
          {card.cost}
        </span>
        {waitS !== null && waitS > 0 && poor ? (
          <span class={cls('hud-card-wait', card.queued > 0 && 'is-shifted')} data-testid={`hud-card-${card.slot}-wait`}>
            {t('hud.wait', { s: waitS })}
          </span>
        ) : null}
        {card.queued > 0 ? (
          <span key={card.queued} class="hud-card-queue" data-testid={`hud-card-${card.slot}-queued`} aria-label={t('hud.queued', { n: card.queued })}>
            {card.queued}
          </span>
        ) : null}
        {card.state === 'armyFull' ? <span class="hud-card-tag">{t('hud.armyFull')}</span> : null}
        {card.state === 'legendaryInField' ? <span class="hud-card-tag is-legendary">{t('hud.legendaryInField')}</span> : null}
        {c.keys ? <kbd class="hud-key">{card.slot + 1}</kbd> : null}
      </button>
      {c.readOnly ? null : (
        <button
          class="hud-card-i"
          data-testid={`hud-card-${card.slot}-info`}
          aria-label={t('hud.info.label', { name })}
          aria-expanded={info}
          onClick={() => setInfo(!info)}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <circle cx="10" cy="5" r="2.2" fill="currentColor" />
            <rect x="8" y="8.5" width="4" height="9" rx="1.6" fill="currentColor" />
          </svg>
        </button>
      )}
      {p.floats
        .filter((f) => f.slot === card.slot)
        .map((f) => (
          <span key={f.id} class={`hud-float hud-float-${f.kind}`}>
            {f.text}
          </span>
        ))}
      <div class={cls('hud-card-info-wrap', info && 'is-open')}>
        <CardInfo c={c} def={def} />
      </div>
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

function Army(p: { c: HudCtx }) {
  const { c } = p;
  const { m, t } = c;
  const full = m.me.pop >= m.me.popCap;
  return (
    <div class={cls('hud-army', c.denied('army') && 'is-denied')} data-testid="hud-army">
      <span class={cls('hud-army-count', full && 'is-full')} title={t('hud.armyLabel')} aria-label={t('hud.armyLabel')}>
        <RoleGlyph group="infantry" size={16} />
        {t('hud.army', { pop: m.me.pop, cap: m.me.popCap })}
      </span>
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
          {c.keys ? <kbd class="hud-key">S</kbd> : null}
        </button>
      ) : null}
    </div>
  );
}

// The Age Power button and its drag / tap-to-aim targeting live in `PowerButton.tsx`.
export { MINIMAP_HIT_PX, minimapDropX } from './PowerButton';

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

export function Tray(p: { c: HudCtx; goldRef: (el: HTMLElement | null) => void; goldBump: boolean }) {
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
  const age = ageIds(c.config)[c.m.me.ageIndex] ?? 'stone';
  const cards = c.m.me.cards.filter((card) => card.state !== 'empty' && card.card);
  return (
    <div class="hud-tray" data-testid="hud-tray">
      <GoldCounter c={c} goldRef={p.goldRef} bump={p.goldBump} floats={floats} />
      <div class="hud-cards">
        {cards.map((card, i) => (
          // Keyed by age: after an evolve the new cards flip in, one after another.
          <div key={`${age}-${card.slot}`} class="hud-card-flip" style={{ '--i': i }}>
            <Card c={c} card={card} floats={floats} onFloat={addFloat} />
          </div>
        ))}
        {hasPendingUnlock(c) ? <LockedSlot c={c} /> : null}
      </div>
      <Army c={c} />
      <PowerButton c={c} />
      <LastStandButton c={c} />
    </div>
  );
}
