/**
 * The one card tile (docs/ui-plan.md 3.6 "Card tile", U4, U5): one anatomy at every size.
 * - A thin brushed-metal frame in the rarity colour (A10, only on cards) with the rarity gem at the
 *   bottom centre, so rarity reads by shape too (circle, rhombus, hexagon, star; A3).
 * - The art fills the card: the injected portrait (DESIGN B5) or a stylised age plate with the role
 *   glyph; a foil sheen for Bronze, Silver and Holo foils (A5.8).
 * - Cost top-left (coin and number), class icon top-right (A18.9.1), the level along the bottom
 *   ("Lv 4"), the name under the art (sm and up unless a screen hides it) and the class word.
 * - States: not owned (silhouette and padlock), equipped (a check badge on the bottom-left corner
 *   and a green underline), NEW (a tag; the frame wobbles once), upgrade ready (the green arrow; with
 *   `showCopies` the copies bar turns full and green), selected (lifted, e5), Legendary (a static
 *   sheen with one light pass when it appears).
 * - Hover (desktop, 350 ms) or long-press (touch, 450 ms) opens the tip with class and counters.
 */
import { rarityNameKey } from '@/content/keys';
import type { AgeId, CardId, Foil, FortKind, PowerSlot, Rarity, SkinId } from '@/contracts';
import type { CardClass, UnitClass } from '@/core/cardClass';
import type { ComponentChildren } from 'preact';
import { CardTip, CardTipBody, ClassIcon, CLASS_NAME_KEY, useCardTip } from './ClassIcon';
import { FORT_KIND_KEY, FORT_PORTRAITS, FortArt, FortKindBadge } from './FortGlyphs';
import { formatInt } from './format';
import './cardTile.css';
import { AGE_COLOR, ArrowUpIcon, CheckIcon, CoinIcon, LockIcon, RARITY_COLOR, RarityGem, RoleGlyph, type GlyphKind } from './icons';
import { useKit, usePortrait } from './kit';
import { CopiesBar } from './Meters';
import { ReachGlyphIcon, ReloadGlyph } from './PowerGlyphs';
import type { ReachGlyph } from './powerInfo';

export interface CardTileData {
  id: CardId;
  kind: 'unit' | 'turret' | 'power' | 'fort';
  name: string;
  age: AgeId;
  /** Powers have no rarity; they use the power frame. */
  rarity: Rarity | null;
  glyph: GlyphKind;
  owned: boolean;
  level: number;
  copies: number;
  /** Copies needed for the next level, or null at max level. */
  needed: number | null;
  upgradeReady: boolean;
  foil: Foil;
  isNew: boolean;
  skin: SkinId | null;
  /** Gold cost in battle (units and turrets). */
  cost: number | null;
  /** The card's class badge (owner feedback 2026-09-28); absent = no badge. */
  cls?: CardClass;
  /** Legendary units add a crown to the badge. */
  legendary?: boolean;
  /** Classes this unit beats / loses to (from the compiled `strongVs` / `weakVs`). */
  strong?: readonly UnitClass[];
  weak?: readonly UnitClass[];
  /**
   * A power card (A2.9.10 power tile): its slot, the reach glyph shown top-right where units show
   * their class, and the reload shown at the bottom ("⟳ 40 s").
   */
  power?: { slot: PowerSlot; reach: ReachGlyph; reloadS: number };
  /**
   * A Fort card (A16.14.7): its kind glyph shows top-right where units show their class, the kind's
   * name under the card, the pop it takes at the bottom, and the art is the kind's illustration.
   */
  fort?: { kind: FortKind; pop: number; pads: 'home' | 'any' };
}

export type CardTileSize = 'xs' | 'sm' | 'md' | 'lg';

/** A small soldier head: the pop a Fort card takes. */
function PopMark() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      <circle cx="6" cy="4" r="2.6" fill="currentColor" />
      <path d="M1.6 11.4c.4-3 2.2-4.4 4.4-4.4s4 1.4 4.4 4.4z" fill="currentColor" />
    </svg>
  );
}

const ART_PX: Record<CardTileSize, number> = { xs: 64, sm: 84, md: 112, lg: 160 };
const CLASS_PX: Record<CardTileSize, number> = { xs: 16, sm: 20, md: 24, lg: 30 };
const GEM_PX: Record<CardTileSize, number> = { xs: 12, sm: 16, md: 16, lg: 22 };

export function CardArt(p: {
  card: CardId;
  age: AgeId;
  glyph: GlyphKind;
  size: number;
  foil?: Foil;
  skin?: SkinId | null;
  silhouette?: boolean;
  class?: string;
  /** A Fort card: its kind's illustration until F3's fort portraits ship (`FORT_PORTRAITS`). */
  fortKind?: FortKind;
}) {
  // Silhouettes (unowned cards) use a plate-free portrait darkened by CSS; without a provider the
  // role glyph stands in (docs/requests/wp4-portrait-plate-contract.md).
  const fortArt = p.fortKind !== undefined && !FORT_PORTRAITS;
  const url = usePortrait(fortArt ? '' : p.card, { skin: p.skin ?? null, foil: 'none', size: Math.round(p.size * 2), plate: !p.silhouette });
  const age = AGE_COLOR[p.age];
  return (
    <span
      class={`ui-art${p.silhouette ? ' is-silhouette' : ''}${url ? ' has-portrait' : ''} ${p.class ?? ''}`}
      style={{ '--age-main': age.main, '--age-accent': age.accent, '--age-light': age.light }}
      data-art-age={p.age}
    >
      {url ? (
        <img class="ui-art__img" src={url} alt="" draggable={false} />
      ) : fortArt ? (
        <span class="ui-art__fallback ui-art__fort">
          <FortArt kind={p.fortKind!} age={p.age} size={Math.round(p.size * 0.9)} silhouette={p.silhouette} />
        </span>
      ) : (
        <span class="ui-art__fallback">
          <RoleGlyph kind={p.glyph} size={Math.round(p.size * 0.56)} color={p.silhouette ? '#1b1330' : age.light} />
        </span>
      )}
      {p.foil && p.foil !== 'none' ? <i class={`ui-foil ui-foil--${p.foil}`} /> : null}
    </span>
  );
}

export function CardTile(p: {
  card: CardTileData;
  size?: CardTileSize;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Shows the copies bar (collection) instead of the plain level badge only. */
  showCopies?: boolean;
  showCost?: boolean;
  /** Hides the level badge (opponent cards: their levels are not shown, A3 Scouted list). */
  hideLevel?: boolean;
  /** Extra content in the top-right corner (for example a remove button). */
  corner?: ComponentChildren;
  testid?: string;
  label?: string;
  grid?: boolean;
  /** Hover (desktop) / long-press (touch) tip with the class and counters. Default on for units. */
  tip?: boolean;
  /** In the player's army (ui-plan 3.6): a check badge and a green underline. */
  equipped?: boolean;
  /** The name under the art; default on from sm up (xs never). */
  showName?: boolean;
}) {
  const { t, locale } = useKit();
  const c = p.card;
  const size = p.size ?? 'md';
  const hasTip = (p.tip ?? true) && c.kind === 'unit' && !!c.cls;
  const tip = useCardTip(hasTip);
  const frame = c.rarity ? RARITY_COLOR[c.rarity] : '#f2c14e';
  const cls = [
    'ui-card',
    `ui-card--${size}`,
    `ui-card--${c.rarity ?? 'power'}`,
    c.owned ? '' : 'is-locked',
    p.selected ? 'is-selected' : '',
    c.upgradeReady ? 'is-ready' : '',
    c.foil !== 'none' ? `has-foil has-foil--${c.foil}` : '',
    p.onClick ? 'is-button' : '',
    p.equipped ? 'is-equipped' : '',
    c.isNew && c.owned ? 'is-new' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const levelText = c.owned && !p.hideLevel ? t('ui.card.level', { n: c.level }) : null;
  const aria =
    p.label ??
    [
      c.name,
      c.owned ? levelText : t('ui.card.notOwned'),
      c.cls ? t(CLASS_NAME_KEY[c.cls]) : null,
      c.rarity ? t(rarityNameKey(c.rarity)) : null,
      c.upgradeReady ? t('ui.card.upgradeReady') : null,
      p.equipped ? t('ui.card.inArmy') : null,
    ]
      .filter(Boolean)
      .join(', ');
  const named = size !== 'xs' && p.showName !== false;
  const body = (
    <>
      <span class="ui-card__frame" style={{ '--frame': frame }}>
        <CardArt card={c.id} age={c.age} glyph={c.glyph} size={ART_PX[size]} foil={c.foil} skin={c.skin} silhouette={!c.owned} {...(c.fort ? { fortKind: c.fort.kind } : {})} />
        <i class="ui-card__shade" aria-hidden="true" />
        {c.owned && size !== 'xs' && !p.hideLevel && c.kind !== 'power' && c.kind !== 'fort' ? <span class="ui-card__level">{levelText}</span> : null}
        {c.fort && size !== 'xs' ? (
          <span class="ui-card__pop" data-tag="" aria-hidden="true">
            <PopMark />
            {c.fort.pop}
          </span>
        ) : null}
        {p.showCost && c.cost !== null ? (
          <span class="ui-card__cost">
            <CoinIcon size={size === 'xs' ? 11 : 13} />
            {formatInt(c.cost, locale)}
          </span>
        ) : null}
        {c.rarity ? (
          <span class="ui-card__gem" aria-hidden="true">
            <RarityGem rarity={c.rarity} size={GEM_PX[size]} />
          </span>
        ) : null}
        {c.isNew && c.owned ? (
          <span class="ui-card__new" data-tag="">
            {t('ui.card.new')}
          </span>
        ) : null}
        {!c.owned ? (
          <span class="ui-card__lock">
            <LockIcon size={size === 'lg' ? 30 : size === 'xs' ? 16 : 22} />
          </span>
        ) : null}
        {c.upgradeReady && !p.showCopies ? (
          <span class="ui-card__ready" aria-hidden="true">
            <ArrowUpIcon size={size === 'xs' ? 14 : 18} />
          </span>
        ) : null}
        {p.corner ? <span class="ui-card__corner">{p.corner}</span> : null}
        {c.fort ? (
          <span class="ui-card__class ui-card__fortkind" data-testid={p.testid ? `${p.testid}-class` : undefined} data-class="fort" data-kind={c.fort.kind}>
            <FortKindBadge kind={c.fort.kind} size={CLASS_PX[size]} />
          </span>
        ) : c.power ? (
          <span class="ui-card__class ui-card__reach" data-testid={p.testid ? `${p.testid}-class` : undefined} data-class="power" data-reach={c.power.reach}>
            <ReachGlyphIcon kind={c.power.reach} size={CLASS_PX[size] - 4} />
          </span>
        ) : c.cls ? (
          <span class="ui-card__class" data-testid={p.testid ? `${p.testid}-class` : undefined} data-class={c.cls}>
            <ClassIcon id={c.cls} size={CLASS_PX[size]} />
            {c.legendary ? <ClassIcon id="legendary" size={Math.round(CLASS_PX[size] * 0.8)} class="ui-card__crown" /> : null}
          </span>
        ) : null}
        {c.power && size !== 'xs' ? (
          <span class="ui-card__reload" data-tag="">
            <ReloadGlyph size={size === 'lg' ? 14 : 11} />
            {t('ui.power.reloadShort', { s: c.power.reloadS })}
          </span>
        ) : null}
        {p.equipped ? (
          <span class="ui-card__equipped" aria-hidden="true">
            <CheckIcon size={size === 'xs' ? 12 : 14} />
          </span>
        ) : null}
        {c.rarity === 'legendary' ? <i class="ui-card__sheen" aria-hidden="true" /> : null}
      </span>
      {named ? (
        <span class="ui-card__name" data-clip-check="">
          {c.name}
        </span>
      ) : null}
      {c.fort && named ? (
        <span class="ui-card__classname" data-tag="" style={{ '--cls': 'var(--cls-fort)' }}>
          {t(FORT_KIND_KEY[c.fort.kind])}
        </span>
      ) : c.cls && named ? (
        <span class="ui-card__classname" data-tag="" style={{ '--cls': `var(--cls-${c.cls})` }}>
          {t(CLASS_NAME_KEY[c.cls])}
        </span>
      ) : null}
      {p.showCopies && c.owned && c.kind !== 'power' ? <CopiesBar copies={c.copies} needed={c.needed} ready={c.upgradeReady} /> : null}
    </>
  );
  const tipView =
    hasTip && tip.anchor && c.cls ? (
      <CardTip anchor={tip.anchor}>
        <CardTipBody name={c.name} cls={c.cls} legendary={c.legendary} strong={c.strong ?? []} weak={c.weak ?? []} />
      </CardTip>
    ) : null;
  if (!p.onClick) {
    return (
      <div class={cls} data-testid={p.testid} data-card={c.id} role="img" aria-label={aria} {...tip.handlers}>
        {body}
        {tipView}
      </div>
    );
  }
  return (
    <button
      {...tip.handlers}
      type="button"
      class={cls}
      data-testid={p.testid}
      data-card={c.id}
      data-grid-item={p.grid ? '' : undefined}
      aria-label={aria}
      aria-pressed={p.selected === undefined ? undefined : p.selected}
      disabled={p.disabled}
      onClick={() => p.onClick?.()}
    >
      {body}
      {tipView}
    </button>
  );
}
