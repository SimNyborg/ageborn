/**
 * Card tiles (A9 War Plan and Collection, A6.6 copies and levels, A5.8 foils):
 * - a rarity frame (A10 rarity colours, UI only) around the card art;
 * - the art: the injected portrait (DESIGN B5) or a stylised age plate with the role glyph;
 * - a foil sheen for Bronze, Silver and Holo foils;
 * - level badge, gold cost, NEW stamp, the copies bar and an "upgrade ready" arrow;
 * - unowned cards show as dark silhouettes with a lock (A9 #10).
 */
import { rarityNameKey } from '@/content/keys';
import type { AgeId, CardId, Foil, Rarity, SkinId } from '@/contracts';
import type { CardClass, UnitClass } from '@/core/cardClass';
import type { ComponentChildren } from 'preact';
import { CardTip, CardTipBody, ClassIcon, CLASS_NAME_KEY, useCardTip } from './ClassIcon';
import { formatInt } from './format';
import { AGE_COLOR, ArrowUpIcon, CoinIcon, LockIcon, RARITY_COLOR, RoleGlyph, type GlyphKind } from './icons';
import { useKit, usePortrait } from './kit';
import { CopiesBar } from './Meters';

export interface CardTileData {
  id: CardId;
  kind: 'unit' | 'turret' | 'power';
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
}

export type CardTileSize = 'xs' | 'sm' | 'md' | 'lg';

const ART_PX: Record<CardTileSize, number> = { xs: 56, sm: 72, md: 96, lg: 160 };
const CLASS_PX: Record<CardTileSize, number> = { xs: 18, sm: 22, md: 26, lg: 34 };

export function CardArt(p: {
  card: CardId;
  age: AgeId;
  glyph: GlyphKind;
  size: number;
  foil?: Foil;
  skin?: SkinId | null;
  silhouette?: boolean;
  class?: string;
}) {
  // Silhouettes (unowned cards) use a plate-free portrait darkened by CSS; without a provider the
  // role glyph stands in (docs/requests/wp4-portrait-plate-contract.md).
  const url = usePortrait(p.card, { skin: p.skin ?? null, foil: 'none', size: Math.round(p.size * 2), plate: !p.silhouette });
  const age = AGE_COLOR[p.age];
  return (
    <span
      class={`ui-art${p.silhouette ? ' is-silhouette' : ''}${url ? ' has-portrait' : ''} ${p.class ?? ''}`}
      style={{ '--age-main': age.main, '--age-accent': age.accent, '--age-light': age.light }}
      data-art-age={p.age}
    >
      {url ? (
        <img class="ui-art__img" src={url} alt="" draggable={false} />
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
    ]
      .filter(Boolean)
      .join(', ');
  const body = (
    <>
      <span class="ui-card__frame" style={{ '--frame': frame }}>
        <CardArt card={c.id} age={c.age} glyph={c.glyph} size={ART_PX[size]} foil={c.foil} skin={c.skin} silhouette={!c.owned} />
        {c.owned && size !== 'xs' && !p.hideLevel && c.kind !== 'power' ? <span class="ui-card__level">{levelText}</span> : null}
        {p.showCost && c.cost !== null ? (
          <span class="ui-card__cost">
            <CoinIcon size={size === 'xs' ? 12 : 15} />
            {formatInt(c.cost, locale)}
          </span>
        ) : null}
        {c.isNew && c.owned ? <span class="ui-card__new">{t('ui.card.new')}</span> : null}
        {!c.owned ? (
          <span class="ui-card__lock">
            <LockIcon size={size === 'lg' ? 30 : size === 'xs' ? 16 : 20} />
          </span>
        ) : null}
        {c.upgradeReady && !p.showCopies ? (
          <span class="ui-card__ready" aria-hidden="true">
            <ArrowUpIcon size={20} />
          </span>
        ) : null}
        {p.corner ? <span class="ui-card__corner">{p.corner}</span> : null}
        {c.cls ? (
          <span class="ui-card__class" data-testid={p.testid ? `${p.testid}-class` : undefined} data-class={c.cls}>
            <ClassIcon id={c.cls} size={CLASS_PX[size]} />
            {c.legendary ? <ClassIcon id="legendary" size={Math.round(CLASS_PX[size] * 0.8)} class="ui-card__crown" /> : null}
          </span>
        ) : null}
      </span>
      {size !== 'xs' ? <span class="ui-card__name">{c.name}</span> : null}
      {c.cls && size !== 'xs' ? (
        <span class="ui-card__classname" style={{ '--cls': `var(--cls-${c.cls})` }}>
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
      <div class={cls} data-testid={p.testid} role="img" aria-label={aria} {...tip.handlers}>
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
