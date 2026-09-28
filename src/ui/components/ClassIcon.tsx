/**
 * Card class icons (owner feedback 2026-09-28 "card class and counters visible", DESIGN A2.6):
 * a coloured badge with a distinct white glyph per class (shape first, colour second), a short
 * label chip, Strong vs / Weak vs rows, the War Plan counter legend and the hover / long-press
 * card tip. The shapes come from `core/cardClass.ts`, so the capsule show draws the same icons.
 */
import './classIcon.css';
import { CLASS_COLOR, CLASS_GLYPH, COUNTER_LEGEND, type CardClass, type ClassGlyphId, type UnitClass } from '@/core/cardClass';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { OUTLINE } from './icons';
import { PortalContext, useKit, type Translate } from './kit';

/** Short labels (whole literals so the strings test can see them). */
export const CLASS_NAME_KEY: Readonly<Record<ClassGlyphId, string>> = {
  infantry: 'ui.class.infantry',
  ranged: 'ui.class.ranged',
  heavy: 'ui.class.heavy',
  antiArmor: 'ui.class.antiArmor',
  siege: 'ui.class.siege',
  support: 'ui.class.support',
  air: 'ui.class.air',
  legendary: 'ui.class.legendary',
  turret: 'ui.class.turret',
  power: 'ui.class.power',
};

const NOTE_KEY: Readonly<Record<string, string>> = {
  armor: 'ui.class.legend.armor',
  pierce: 'ui.class.legend.pierce',
  swarm: 'ui.class.legend.swarm',
  melee: 'ui.class.legend.melee',
  shootDown: 'ui.class.legend.shootDown',
  splash: 'ui.class.legend.splash',
};

const GLYPH_FILL = '#FFF8E8';

/** The glyph alone (no badge), for inline use on coloured backgrounds. */
export function ClassGlyph(p: { id: ClassGlyphId; size?: number; color?: string }) {
  const s = p.size ?? 20;
  const c = p.color ?? GLYPH_FILL;
  return (
    <svg class="ui-class-glyph" viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" focusable="false">
      {CLASS_GLYPH[p.id].map((g, i) => (
        <path
          key={i}
          d={g.d}
          fill={g.fill === 'glyph' ? c : g.fill === 'ink' ? OUTLINE : 'none'}
          stroke={g.stroke ? (g.strokeGlyph ? c : OUTLINE) : undefined}
          stroke-width={g.stroke ? g.stroke / 10 : undefined}
          stroke-linecap="round"
          stroke-linejoin="round"
          transform={g.transform}
        />
      ))}
    </svg>
  );
}

/**
 * The class badge: a round, cel-shaded disc in the class colour with a dark rim, a top highlight
 * and the glyph. Decorative unless `title` is given.
 */
export function ClassIcon(p: { id: ClassGlyphId; size?: number; title?: string; class?: string }) {
  const s = p.size ?? 22;
  const col = CLASS_COLOR[p.id];
  return (
    <span
      class={`ui-class-icon ui-class-icon--${p.id} ${p.class ?? ''}`}
      style={{ width: `${s}px`, height: `${s}px`, '--cls-main': col.main, '--cls-dark': col.dark }}
      data-class={p.id}
      role={p.title ? 'img' : undefined}
      aria-label={p.title}
      aria-hidden={p.title ? undefined : 'true'}
      title={p.title}
    >
      <ClassGlyph id={p.id} size={Math.round(s * 0.74)} />
    </span>
  );
}

/** Badge plus short label ("Heavy"). Legendary units add a crown badge. */
export function ClassChip(p: { id: CardClass; legendary?: boolean; size?: 'sm' | 'md'; testid?: string }) {
  const { t } = useKit();
  const px = p.size === 'sm' ? 16 : 22;
  return (
    <span class={`ui-class-chip ui-class-chip--${p.size ?? 'md'}`} data-testid={p.testid} data-class={p.id} style={{ '--cls-main': CLASS_COLOR[p.id].main }}>
      <ClassIcon id={p.id} size={px} />
      <span class="ui-class-chip__label">{t(CLASS_NAME_KEY[p.id])}</span>
      {p.legendary ? <ClassIcon id="legendary" size={px} title={t(CLASS_NAME_KEY.legendary)} /> : null}
    </span>
  );
}

/** A row of class icons with labels (Strong vs / Weak vs). */
export function ClassList(p: { classes: readonly UnitClass[]; size?: number; labels?: boolean; testid?: string }) {
  const { t } = useKit();
  return (
    <span class="ui-class-list" data-testid={p.testid}>
      {p.classes.map((c) =>
        p.labels === false ? (
          <ClassIcon key={c} id={c} size={p.size ?? 22} title={t(CLASS_NAME_KEY[c])} />
        ) : (
          <span key={c} class="ui-class-list__item" data-class={c}>
            <ClassIcon id={c} size={p.size ?? 22} />
            <span>{t(CLASS_NAME_KEY[c])}</span>
          </span>
        ),
      )}
    </span>
  );
}

/** Strong vs / Weak vs block (card detail and the card tip). */
export function CounterRows(p: { strong: readonly UnitClass[]; weak: readonly UnitClass[]; size?: number; labels?: boolean }) {
  const { t } = useKit();
  return (
    <div class="ui-counters">
      {p.strong.length > 0 ? (
        <div class="ui-counters__row ui-counters__row--good" data-testid="class-strong">
          <span class="ui-counters__label">{t('ui.card.strongVs')}</span>
          <ClassList classes={p.strong} size={p.size} labels={p.labels} />
        </div>
      ) : null}
      {p.weak.length > 0 ? (
        <div class="ui-counters__row ui-counters__row--bad" data-testid="class-weak">
          <span class="ui-counters__label">{t('ui.card.weakVs')}</span>
          <ClassList classes={p.weak} size={p.size} labels={p.labels} />
        </div>
      ) : null}
    </div>
  );
}

function Arrow() {
  return (
    <svg class="ui-legend__arrow" viewBox="0 0 24 12" width="22" height="11" aria-hidden="true">
      <path d="M2 6h16" stroke={OUTLINE} stroke-width="4" stroke-linecap="round" />
      <path d="M2 6h16" stroke="#FFF8E8" stroke-width="2" stroke-linecap="round" />
      <path d="M16 1.5 22.5 6 16 10.5z" fill="#FFF8E8" stroke={OUTLINE} stroke-width="1.4" stroke-linejoin="round" />
    </svg>
  );
}

/**
 * The War Plan counter legend: the A2.6 triangle (Heavy beats Infantry beats Anti-armor beats
 * Heavy) drawn as three badges on a ring of arrows, and the side notes (Air, Ranged, Siege).
 */
export function CounterLegend(p: { compact?: boolean }) {
  const { t } = useKit();
  const tri = COUNTER_LEGEND.slice(0, 3);
  const notes = COUNTER_LEGEND.slice(3);
  const name = (c: ClassGlyphId) => t(CLASS_NAME_KEY[c]);
  // Triangle corners (percent of the box): Heavy top, Infantry bottom right, Anti-armor bottom left.
  const at: Record<string, [number, number]> = { heavy: [50, 16], infantry: [84, 80], antiArmor: [16, 80] };
  return (
    <section class={`ui-legend${p.compact ? ' is-compact' : ''}`} data-testid="counter-legend" aria-label={t('ui.class.legend.title')}>
      <h3 class="ui-legend__title">{t('ui.class.legend.title')}</h3>
      <div class="ui-legend__body">
        <div class="ui-legend__tri" role="img" aria-label={tri.map((r) => t('ui.class.legend.beats', { a: name(r.a), b: name(r.b) })).join('. ')}>
          <svg class="ui-legend__ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="ui-legend-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto">
                <path d="M0 0 10 5 0 10z" fill="#FFF8E8" stroke={OUTLINE} stroke-width="1.2" />
              </marker>
            </defs>
            {/* heavy -> infantry, infantry -> antiArmor, antiArmor -> heavy (clockwise) */}
            <path d="M60 28 L76 62" class="ui-legend__edge" marker-end="url(#ui-legend-head)" />
            <path d="M70 82 L30 82" class="ui-legend__edge" marker-end="url(#ui-legend-head)" />
            <path d="M24 62 L40 28" class="ui-legend__edge" marker-end="url(#ui-legend-head)" />
          </svg>
          {(['heavy', 'infantry', 'antiArmor'] as const).map((c) => (
            <span key={c} class="ui-legend__node" style={{ left: `${at[c]![0]}%`, top: `${at[c]![1]}%` }}>
              <ClassIcon id={c} size={p.compact ? 26 : 32} />
              <span class="ui-legend__name">{name(c)}</span>
            </span>
          ))}
        </div>
        <ul class="ui-legend__notes">
          {tri.concat(notes).map((r) => (
            <li key={`${r.a}-${r.b}`} class="ui-legend__row" data-testid={`legend-${r.a}-${r.b}`}>
              <ClassIcon id={r.a} size={20} />
              <Arrow />
              <ClassIcon id={r.b} size={20} />
              <span class="ui-legend__text">
                <b>{t('ui.class.legend.beats', { a: name(r.a), b: name(r.b) })}</b> {t(NOTE_KEY[r.note]!)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Hover (desktop) / long-press (touch) card tip
// ---------------------------------------------------------------------------------------------

export const TIP_HOVER_MS = 350;
export const TIP_PRESS_MS = 450;

export interface TipAnchor {
  x: number;
  top: number;
  bottom: number;
}

/**
 * Opens a tip after a short hover (mouse) or a long press (touch or pen). A long press swallows the
 * click that follows, so it never also picks the card. `handlers` go on the card element.
 */
export function useCardTip(enabled: boolean) {
  const [anchor, setAnchor] = useState<TipAnchor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swallow = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  useEffect(() => {
    if (!anchor) return undefined;
    const close = () => setAnchor(null);
    const id = setTimeout(close, 4000);
    window.addEventListener('scroll', close, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener('scroll', close, true);
    };
  }, [anchor]);
  const openFor = (el: Element) => {
    const r = el.getBoundingClientRect();
    setAnchor({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  };
  if (!enabled) return { anchor: null, close: () => undefined, handlers: {} };
  return {
    anchor,
    close: () => setAnchor(null),
    handlers: {
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        const el = e.currentTarget as Element;
        clear();
        timer.current = setTimeout(() => openFor(el), TIP_HOVER_MS);
      },
      onPointerLeave: (e: PointerEvent) => {
        clear();
        if (e.pointerType === 'mouse') setAnchor(null);
      },
      onPointerDown: (e: PointerEvent) => {
        if (e.pointerType === 'mouse') {
          clear();
          setAnchor(null);
          return;
        }
        swallow.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        const el = e.currentTarget as Element;
        clear();
        timer.current = setTimeout(() => {
          swallow.current = true;
          openFor(el);
        }, TIP_PRESS_MS);
      },
      onPointerMove: (e: PointerEvent) => {
        if (timer.current && e.pointerType !== 'mouse' && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
      },
      onPointerUp: () => clear(),
      onPointerCancel: () => clear(),
      onContextMenu: (e: Event) => {
        // The browser's long-press menu would cover the tip on touch.
        if (swallow.current || timer.current) e.preventDefault();
      },
      onClickCapture: (e: Event) => {
        if (swallow.current) {
          swallow.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}

/** The floating tip: fixed to the viewport, above the card (below it near the top edge). */
export function CardTip(p: { anchor: TipAnchor; children: ComponentChildren; testid?: string }) {
  const portal = useContext(PortalContext);
  const w = 236;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const left = Math.max(8, Math.min(vw - w - 8, p.anchor.x - w / 2));
  const below = p.anchor.top < 170;
  const style = below ? { left: `${left}px`, top: `${p.anchor.bottom + 8}px`, width: `${w}px` } : { left: `${left}px`, bottom: `${window.innerHeight - p.anchor.top + 8}px`, width: `${w}px` };
  const tip = (
    <div class={`ui-card-tip${below ? ' is-below' : ''}`} role="tooltip" data-testid={p.testid ?? 'card-tip'} style={style}>
      {p.children}
    </div>
  );
  return portal.current ? createPortal(tip, portal.current) : tip;
}

/** Tip body for a card: name, class chip, Strong vs / Weak vs. */
export function CardTipBody(p: { name: string; cls: CardClass; legendary?: boolean; strong: readonly UnitClass[]; weak: readonly UnitClass[] }) {
  return (
    <>
      <div class="ui-card-tip__name">{p.name}</div>
      <ClassChip id={p.cls} legendary={p.legendary} size="sm" />
      <CounterRows strong={p.strong} weak={p.weak} size={20} />
    </>
  );
}

/** Translates a class for aria text. */
export function className(t: Translate, c: ClassGlyphId): string {
  return t(CLASS_NAME_KEY[c]);
}
