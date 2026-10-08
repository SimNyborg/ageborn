/**
 * The Customize screen's collection panels (DESIGN A18.9.4): base skins, flags, decorations, emotes
 * and quotes, each with its completion count ("12/40 found") and, for everything on the base, a live
 * mock-up of your base with the equipped flags, decorations and skin. Owned items equip with one tap;
 * locked ones say how they are earned and, for drop-pool items, offer Dust crafting. Nothing here can
 * be bought (A6.2).
 */
import { ageNameKey, cosmeticCollectionKey, cosmeticNameKey, emoteNameKey, quoteTextKey, rarityNameKey } from '@/content/keys';
import type { CosmeticCollection, CosmeticItemDef, CosmeticSource } from '@/content/types';
import type { AgeId, BaseEmoteId, CosmeticLoadout, Rarity } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { useConfirmSpend } from '../../components/confirm';
import { AvatarLookView, resolveLook, type ResolvedLook } from '../../components/Avatar';
import { BackdropLook, BaseLook, CosmeticImage, QuoteBubble, type BubbleTail } from '../../components/cosmeticArt';
import { formatInt } from '../../components/format';
import { CapsuleIcon, CheckIcon, ChevronIcon, CrateIcon, CrownIcon, DustIcon, FlagIcon, GlobeIcon, LockIcon, RARITY_COLOR, RarityGem, StarIcon, TrophyIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { AgePicker } from '../../components/Tabs';
import { EmoteGlyph } from '../../hud/icons';
import { useUi } from '../context';
import { craftLocked, craftPrice, equippedOf, findItem, itemKey, itemsOf, ownedFirst, owns, progressOf, sourceText } from '../model/cosmetics';
import { playLevelId } from '../model/warPath';
import type { ActionResult, CosmeticEquipPatch } from '../services';

// ---------------------------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------------------------

/** "12/40 found" with a small progress bar. */
export function Found(p: { collection: CosmeticCollection; label?: boolean }) {
  const { save, content, t } = useUi();
  const g = progressOf(save.value, content, p.collection);
  const pct = g.total > 0 ? Math.round((g.owned / g.total) * 100) : 0;
  return (
    <span class="cos-found" data-testid={`found-${p.collection}`}>
      {p.label ? <b>{t(cosmeticCollectionKey(p.collection))}</b> : null}
      <span class="cos-found__text">{t('cosmetic.ui.found', { n: g.owned, max: g.total })}</span>
      <span class="cos-found__bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

/**
 * Equips at once and offers Undo (U10: reversible changes are instant with Undo): the tile shows the
 * new state where the finger is, and a short toast carries the Undo back to what was worn before.
 */
function useEquipWithUndo() {
  const { services, toasts, t } = useUi();
  const act = useAct();
  return (patch: CosmeticEquipPatch, before: CosmeticEquipPatch, name: string) => {
    const r = services.equipCosmetic(patch);
    act(r);
    if (r.ok) toasts.show(t('cosmetic.ui.equippedName', { name }), { tone: 'good', undo: () => act(services.equipCosmetic(before)) });
  };
}

/** The age the player plays now (the base mock-ups show it, not always the Stone Age). */
function useCurrentAge(): AgeId {
  const { save, content } = useUi();
  const level = content.warPath?.levels[playLevelId(save.value, content)];
  return level?.region ?? content.order.ages[0] ?? 'stone';
}

/** Shows a toast for an action's result (known reasons have their own line). */
function useAct() {
  const { toasts, t, sound } = useUi();
  return (r: ActionResult, okText?: string) => {
    // Every equip, remove and craft is heard (audit 2026-10-01: these taps were silent): a stamp when
    // it took, the deny knock when it did not.
    sound?.(r.ok ? 'ui_stamp' : 'ui_deny');
    if (r.ok) {
      if (okText) toasts.show(okText, { tone: 'good' });
      return;
    }
    const key = `cosmetic.ui.reason.${r.reason}`;
    const text = t(key);
    toasts.show(text === key ? t('cosmetic.ui.reason.notOwned') : text, { tone: 'bad' });
  };
}

/**
 * A counter that grows each time `on` turns true while the tile is shown (not on its first render):
 * the key that replays the equip pop and the rarity sparkle (PLAN 2a: equip feedback).
 */
function usePop(on: boolean): number {
  const was = useRef(on);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (on && !was.current) setN((x) => x + 1);
    was.current = on;
  }, [on]);
  return n;
}

/** The icon of how an item is earned (PLAN 2a: capsule drum, crate, road cup, feat medal, War Path flag, Dust spark). */
export function SourceIcon(p: { source: CosmeticSource; size?: number }) {
  const size = p.size ?? 16;
  const s = p.source;
  switch (s.kind) {
    case 'capsule':
      return <CapsuleIcon tier="silver" size={size} />;
    case 'capsuleTier':
      return <CapsuleIcon tier={s.tier} size={size} />;
    case 'crate':
      return <CrateIcon size={size} />;
    case 'road':
    case 'arena':
      return <TrophyIcon size={size} />;
    case 'feat':
      return <StarIcon filled size={size} />;
    case 'warPath':
    case 'warPathBoss':
    case 'warPathStars':
      return <FlagIcon size={size} />;
    case 'title':
    case 'codexLevel':
      return <CrownIcon size={size} />;
    case 'dust':
      return <DustIcon size={size} />;
    case 'flagRegion':
    case 'flagsOwned':
      return <GlobeIcon size={size} />;
    case 'start':
      return null;
  }
}

/** The short label beside the source icon: a number when there is one (the Dust price, trophies, a level). */
function sourceShort(s: CosmeticSource, price: number | null, locale: string): string | null {
  if (price !== null) return formatInt(price, locale);
  switch (s.kind) {
    case 'road':
      return formatInt(s.trophies, locale);
    case 'codexLevel':
      return String(s.level);
    case 'flagsOwned':
      return String(s.count);
    default:
      return null;
  }
}

/** A locked item's source chip on its card: the source icon and its number (a Dust spark before a craft price). */
function SourceChip(p: { item: CosmeticItemDef; price: number | null }) {
  const { locale } = useUi();
  const short = sourceShort(p.item.source, p.price, locale);
  return (
    <span class="cos-card__chip" data-tag="" aria-hidden="true">
      <SourceIcon source={p.item.source} size={15} />
      {p.price !== null ? <DustIcon size={13} /> : null}
      {short !== null ? <b class="ui-num">{short}</b> : null}
    </span>
  );
}

/** The rarity plate class of a card (PLAN 2a: slate, teal steel, violet enamel, gold filigree). */
export const plateClass = (rarity: Rarity): string => `cos-card cos-card--${rarity}`;

/**
 * One collection item as a card (PLAN 2a "Item cards"): a rarity plate (Common chiselled slate, Rare
 * teal steel with rivets, Epic violet enamel with gem studs, Legendary gold filigree with scrolls and a
 * slow sheen), the art in a recessed window, the rarity gem, and a name that wraps and never clips.
 *
 * - Owned: a tap equips it (owner request 2026-10-07, no Equip button); the art pops with a rarity
 *   sparkle (Rare and up) and only the chosen card says "Equipped" (or "In wheel") with the check.
 * - Locked: the art desaturated and darker, a lock badge and a source chip (icon and number); a tap
 *   opens the item's info panel, which says how it is earned and crafts it with two taps (U14).
 *   Panels with a live preview also try it on (ui-plan 4.5, MR-60).
 */
export function ItemTile(p: {
  item: CosmeticItemDef;
  on: boolean;
  onPick: () => void;
  /** Wide tiles show a quote's line. */
  wide?: boolean;
  art?: ComponentChildren;
  /** The info panel's bigger picture (default: the item's art). */
  bigArt?: () => ComponentChildren;
  /** The owned state labels (default "Equipped" / "Equip"). */
  onLabel?: string;
  pickLabel?: string;
  /** Called on every tap, owned or not: try the item on in the preview (ui-plan 4.5, MR-60). */
  onPreview?: () => void;
  /** Shown in the preview right now without being equipped (a locked item tried on): a gold ring. */
  trying?: boolean;
}) {
  const { save, content, t, sound } = useUi();
  const key = itemKey(p.item);
  const have = owns(save.value, content, key);
  const price = craftPrice(content, p.item, save.value);
  const reduce = save.value.settings.reduceMotion;
  // A tier's own set names its tier ("From Aeon Capsules. Craftable after your first.").
  const hintText = sourceText(t, p.item);
  const rarity = p.item.rarity;
  // National flags show no rarity (PLAN 2d: one price for all; the data's rarity stays hidden)
  const rated = p.item.collection !== 'nationalFlag';
  const pop = usePop(p.on);
  const [info, setInfo] = useState(false);
  return (
    <div
      class={`cos-tile ${rated ? plateClass(rarity) : 'cos-card cos-card--plain'} cos-tile--${p.item.collection}${p.wide ? ' cos-tile--wide' : ''}${have ? '' : ' is-locked'}${p.on ? ' is-on' : ''}${p.onPreview ? ' is-previewable' : ''}${p.trying ? ' is-trying' : ''}`}
      style={{ '--rar': RARITY_COLOR[rarity] }}
      data-testid={`item-${key}`}
      data-rarity={rarity}
    >
      <button
        type="button"
        class="cos-tile__hit"
        aria-pressed={p.on || !!p.trying}
        aria-label={`${t(p.item.nameKey)}. ${rated ? `${t(rarityNameKey(rarity))}. ` : ''}${have ? (p.on ? (p.onLabel ?? t('cosmetic.ui.equipped')) : (p.pickLabel ?? t('cosmetic.ui.equip'))) : `${p.onPreview ? `${t('cosmetic.ui.tryOn')}. ` : ''}${hintText}`}`}
        title={have ? undefined : hintText}
        onClick={() => {
          p.onPreview?.();
          if (have) {
            p.onPick();
            return;
          }
          // a locked card answers the tap with how it is earned (and a try-on where there is a preview)
          sound?.('ui_toggle');
          if (!p.onPreview) setInfo(true);
        }}
      >
        <span class="cos-card__window">
          <span class={`cos-tile__art${pop ? ' is-pop' : ''}`} key={pop}>
            {p.art ?? <CosmeticImage item={key} animate={!reduce} {...(p.item.collection === 'nationalFlag' ? { size: 'tile' as const } : {})} />}
          </span>
          {rated ? (
            <span class="cos-card__gem" aria-hidden="true">
              <RarityGem rarity={rarity} size={16} />
            </span>
          ) : null}
          {p.on ? (
            <span class="cos-tile__on" aria-hidden="true">
              <CheckIcon size={14} />
            </span>
          ) : null}
          {!have ? (
            <span class="cos-tile__lock" aria-hidden="true">
              <LockIcon size={14} />
            </span>
          ) : null}
          {p.trying ? (
            <span class="cos-tile__trying" data-tag="" data-testid={`trying-${key}`}>
              {t('cosmetic.ui.tryingOn')}
            </span>
          ) : null}
        </span>
        <span class="cos-tile__name" data-clip-check="">
          {t(p.item.nameKey)}
        </span>
        <span class="cos-card__foot">
          {/* Owner request 2026-10-07: no Equip button; only the chosen card says so ("Equipped" or "In wheel"). */}
          {have && p.on ? (
            <span class="cos-tile__state is-on" aria-hidden="true" data-testid={`state-${key}`}>
              {p.onLabel ?? t('cosmetic.ui.equipped')}
            </span>
          ) : null}
          {!have ? <SourceChip item={p.item} price={price} /> : null}
          {have && !p.on && rated ? (
            <span class="cos-card__rarity" data-tag="" aria-hidden="true">
              {t(rarityNameKey(rarity))}
            </span>
          ) : null}
        </span>
      </button>
      {pop > 0 && rated && rarity !== 'common' && !reduce ? <span class={`cos-card__spark cos-card__spark--${rarity}`} key={`s${pop}`} aria-hidden="true" /> : null}
      {info ? <ItemInfo item={p.item} art={p.bigArt ?? (() => <CosmeticImage item={key} animate={!reduce} pole={p.item.collection === 'baseFlag'} />)} onClose={() => setInfo(false)} /> : null}
    </div>
  );
}

/**
 * A locked item's info panel (PLAN 2a: "a tap shows how to earn it"): the item big on its rarity plate,
 * its rarity and collection, how it is earned, and, for drop-pool items, a two-tap craft (U14: the first
 * tap shows the price and the Dust after, the second crafts; nothing is sold for money).
 */
function ItemInfo(p: { item: CosmeticItemDef; art: () => ComponentChildren; onClose: () => void }) {
  const { save, content, t, services, locale, sound } = useUi();
  const act = useAct();
  const key = itemKey(p.item);
  const price = craftPrice(content, p.item, save.value);
  const lockedCraft = craftLocked(save.value, p.item);
  const dust = save.value.currencies.dust;
  const craft = useConfirmSpend({ onArm: () => sound?.('ui_toggle') });
  const short = price !== null ? Math.max(0, price - dust) : 0;
  const footer =
    price !== null ? (
      <span
        ref={(el) => {
          craft.ref.current = el;
        }}
        class="cos-info__action"
      >
        <Button
          kind="progress"
          size="m"
          icon={<DustIcon size={20} />}
          disabled={lockedCraft || short > 0}
          reason={lockedCraft ? t('cosmetic.ui.reason.locked') : t('cosmetic.ui.needDust', { n: formatInt(short, locale) })}
          testid={`craft-${key}`}
          class={craft.armed ? 'is-armed' : ''}
          onClick={() =>
            craft.press(() => {
              const r = services.craftCosmetic(key);
              act(r, t('cosmetic.ui.crafted'));
              if (r.ok) p.onClose();
              return r.ok;
            })
          }
        >
          <span>{craft.armed ? t('cosmetic.ui.craftConfirm', { n: formatInt(price, locale) }) : t('cosmetic.ui.craftFor', { n: formatInt(price, locale) })}</span>
        </Button>
      </span>
    ) : null;
  return (
    <Modal title={t(p.item.nameKey)} onClose={p.onClose} size="sm" testid="item-info" icon={<RarityGem rarity={p.item.rarity} size={24} />} footer={footer}>
      <div class="cos-info" data-testid={`info-${key}`}>
        <div class={`${plateClass(p.item.rarity)} cos-info__card cos-tile--${p.item.collection}`}>
          <span class="cos-card__window">
            <span class="cos-tile__art">{p.art()}</span>
          </span>
        </div>
        <div class="cos-info__text">
          <p class="cos-info__kind">
            <b style={{ color: RARITY_COLOR[p.item.rarity] }}>{t(rarityNameKey(p.item.rarity))}</b> · {t(`cosmetic.ui.kind.${p.item.collection}`)}
          </p>
          <p class="cos-info__how" data-testid="info-source">
            <SourceIcon source={p.item.source} size={22} />
            <span>{sourceText(t, p.item)}</span>
          </p>
          {price !== null && craft.armed ? (
            <p class="cos-info__after ui-num" data-testid="info-after">
              <DustIcon size={16} /> {formatInt(dust, locale)} → {formatInt(dust - price, locale)}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

/**
 * A card that is not a collection item (the standard base, "No national flag", an empty spot, the
 * starter emotes, the classic skies): the same card on a neutral plate, without a rarity gem.
 */
function PlainCard(p: { on: boolean; testid: string; name: string; onClick: () => void; children?: ComponentChildren; none?: boolean; extra?: string; state?: string | undefined }) {
  const pop = usePop(p.on);
  return (
    <button
      type="button"
      class={`cos-tile cos-tile--plain cos-card cos-card--plain${p.extra ? ` ${p.extra}` : ''}${p.on ? ' is-on' : ''}`}
      aria-pressed={p.on}
      data-testid={p.testid}
      onClick={p.onClick}
    >
      <span class="cos-card__window">
        {p.none ? (
          <span class="cos-tile__art cos-tile__art--none" aria-hidden="true" />
        ) : (
          <span class={`cos-tile__art${pop ? ' is-pop' : ''}`} key={pop}>
            {p.children}
          </span>
        )}
        {p.on ? (
          <span class="cos-tile__on" aria-hidden="true">
            <CheckIcon size={14} />
          </span>
        ) : null}
      </span>
      <span class="cos-tile__name" data-clip-check="">
        {p.name}
      </span>
      <span class="cos-card__foot">
        {p.state ? (
          <span class="cos-tile__state is-on" aria-hidden="true">
            {p.state}
          </span>
        ) : null}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// The base mock-up
// ---------------------------------------------------------------------------------------------

const ANCHOR_COUNT = 3;

/**
 * Your base as the lane shows it (A18.9.4): the keep in the chosen age's skin, the pole with the base
 * flag and the national flag, and the three decoration spots. In the Decorations tab the spots are
 * buttons that choose where the next decoration goes.
 */
export function BaseMock(p: { age: AgeId; look?: Partial<CosmeticLoadout>; anchor?: number; onAnchor?: (i: number) => void }) {
  const { save, content, t, sound } = useUi();
  const eq = { ...equippedOf(save.value, content), ...p.look };
  const skin = eq.baseSkins[p.age] ?? null;
  const reduce = save.value.settings.reduceMotion;
  const decorations = Array.from({ length: ANCHOR_COUNT }, (_, i) => eq.decorations[i] ?? null);
  return (
    <figure class={`cos-mock${reduce ? ' is-still' : ''}`} data-testid="base-mock" aria-label={t('cosmetic.ui.preview')}>
      {/* The age's own sky and far layers (your backdrop skin when one is on), as the lane shows them
          (AUDIT #12), then a cel-shaded ground strip with a contact shadow under the keep. */}
      <div class="cos-mock__sky" aria-hidden="true">
        <BackdropLook skin={eq.backdrop ?? null} age={p.age} animate={false} />
      </div>
      <div class="cos-mock__ground" aria-hidden="true">
        <span class="cos-mock__tufts" />
      </div>
      <span class="cos-mock__shadow" aria-hidden="true" />
      {/* keyed by age and skin, so a change re-runs the entrance (the equip feedback) */}
      <div class="cos-mock__keep" key={`${p.age}|${skin ?? ''}`} aria-hidden="true">
        <BaseLook age={p.age} skin={skin} animate={!reduce} testid="base-mock-keep" />
        {skin ? <span class="cos-mock__gleam" /> : null}
      </div>
      {decorations.map((k, i) => {
        const inner = k ? (
          <span class="cos-mock__deco-art" key={k}>
            <CosmeticImage item={k} />
          </span>
        ) : p.onAnchor ? (
          <span class="cos-mock__plus">+</span>
        ) : null;
        const cls = `cos-mock__deco cos-mock__deco--${i}${p.anchor === i ? ' is-picked' : ''}${k ? '' : ' is-empty'}`;
        return p.onAnchor ? (
          <button
            key={i}
            type="button"
            class={cls}
            aria-pressed={p.anchor === i}
            aria-label={`${t(`cosmetic.ui.anchor.${i}`)}: ${k ? t(cosmeticNameKey('decoration', k.slice(11))) : t('cosmetic.ui.emptySpot')}`}
            data-testid={`anchor-${i}`}
            onClick={() => {
              sound?.('ui_toggle');
              p.onAnchor?.(i);
            }}
          >
            {inner}
          </button>
        ) : (
          <span key={i} class={cls} aria-hidden="true">
            {inner}
          </span>
        );
      })}
      <div class="cos-mock__pole" aria-hidden="true">
        {/* the finial of the base flag's rarity (PLAN 2a: a wooden knob, a brass ball, a spear tip, a star) */}
        <span class={`cos-mock__cap cos-mock__cap--${(eq.baseFlag ? findItem(content, eq.baseFlag)?.rarity : undefined) ?? 'common'}`} key={`cap-${eq.baseFlag ?? ''}`} />
        {eq.baseFlag ? (
          <span class="cos-mock__flag cos-mock__flag--base" key={eq.baseFlag}>
            <CosmeticImage item={eq.baseFlag} />
          </span>
        ) : null}
        {eq.nationalFlag ? (
          <span class="cos-mock__flag cos-mock__flag--nation" key={eq.nationalFlag}>
            <CosmeticImage item={eq.nationalFlag} />
          </span>
        ) : null}
      </div>
      <figcaption class="cos-mock__caption">
        {t('cosmetic.ui.preview')} · {t(ageNameKey(p.age))}
      </figcaption>
    </figure>
  );
}

function MockLayout(p: { mock: ComponentChildren; children: ComponentChildren; testid: string }) {
  return (
    <div class="cos-split" data-testid={p.testid}>
      <div class="cos-split__mock">{p.mock}</div>
      <div class="cos-split__list">{p.children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------------------------

export function BasesPanel(p: { extra?: (age: AgeId) => ComponentChildren }) {
  const { save, content, t, services } = useUi();
  const act = useAct();
  const ages = content.order.ages;
  const now = useCurrentAge();
  const [age, setAge] = useState<AgeId>(now);
  const eq = equippedOf(save.value, content);
  const cur = eq.baseSkins[age] ?? null;
  const items = itemsOf(content, 'baseSkin').filter((x) => x.age === age);
  const withUndo = useEquipWithUndo();
  const equip = (key: string | null, name?: string) =>
    key === null || !name ? act(services.equipCosmetic({ slot: 'baseSkin', age, key })) : withUndo({ slot: 'baseSkin', age, key }, { slot: 'baseSkin', age, key: cur }, name);
  return (
    <MockLayout testid="cust-bases" mock={<BaseMock age={age} />}>
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.baseSkin')}</h3>
        <Found collection="baseSkin" />
      </div>
      <AgePicker ages={ages} value={age} onChange={setAge} compact testid="cust-age" idPrefix="cust-age" />
      <div class="cos-grid cos-grid--skins">
        <PlainCard on={cur === null} testid="base-default" name={t('cosmetic.ui.defaultSkin')} onClick={() => equip(null)}>
          <BaseLook age={age} skin={null} />
        </PlainCard>
        {ownedFirst(save.value, content, items).map((x) => (
          <ItemTile
            key={x.id}
            item={x}
            on={cur === itemKey(x)}
            onPick={() => equip(itemKey(x), t(x.nameKey))}
            art={<BaseLook age={age} skin={itemKey(x)} animate={!save.value.settings.reduceMotion} />}
          />
        ))}
      </div>
      {p.extra ? p.extra(age) : null}
    </MockLayout>
  );
}

/**
 * Battle backdrops (A18.9.4 "Backdrops", owner request 2026-09-30): one skin for your half of the
 * battlefield in every age. The preview is the lane's own painting of your half with the theme's
 * weather moving over it and your base in front; the age chips switch which age it shows. Tapping any
 * tile tries it on (locked ones too: seeing what you can earn is honest and motivating); an owned one
 * is equipped at once with Undo.
 */
export function BackdropsPanel() {
  const { save, content, t, services } = useUi();
  const act = useAct();
  const now = useCurrentAge();
  const [age, setAge] = useState<AgeId>(now);
  const eq = equippedOf(save.value, content);
  const cur = eq.backdrop ?? null;
  const [tryOn, setTryOn] = useState<string | null | undefined>(undefined);
  const shown = tryOn !== undefined ? tryOn : cur;
  const reduce = save.value.settings.reduceMotion;
  const items = ownedFirst(save.value, content, itemsOf(content, 'backdrop'));
  const shownItem = shown ? items.find((x) => itemKey(x) === shown) : undefined;
  const trying = shown !== cur;
  const withUndo = useEquipWithUndo();
  const mock = (
    <figure class={`cos-bdmock${reduce ? ' is-still' : ''}`} data-testid="backdrop-mock" aria-label={t('cosmetic.ui.backdropPreview', { age: t(ageNameKey(age)) })}>
      <span class="cos-bdmock__stage" key={`${age}|${shown ?? ''}`}>
        <BackdropLook skin={shown} age={age} animate={!reduce} testid="backdrop-look" />
      </span>
      <span class="cos-bdmock__base" aria-hidden="true">
        <BaseLook age={age} skin={eq.baseSkins[age] ?? null} />
      </span>
      <figcaption class="cos-mock__caption">{t('cosmetic.ui.backdropPreview', { age: t(ageNameKey(age)) })}</figcaption>
      <span class={`cos-bdmock__name${trying ? ' is-trying' : ''}`} data-testid="backdrop-name">
        {shownItem ? t(shownItem.nameKey) : t('cosmetic.ui.backdropClassic')}
        {trying ? <small data-tag="">{t('cosmetic.ui.tryingOn')}</small> : null}
      </span>
    </figure>
  );
  return (
    <MockLayout testid="cust-backdrops" mock={mock}>
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.backdrop')}</h3>
        <Found collection="backdrop" />
      </div>
      <AgePicker ages={content.order.ages} value={age} onChange={setAge} compact testid="cust-bd-age" idPrefix="cust-bd-age" />
      <div class="cos-grid cos-grid--backdrops">
        <PlainCard
          on={cur === null}
          testid="backdrop-classic"
          extra="cos-tile--backdrop"
          name={t('cosmetic.ui.backdropClassic')}
          onClick={() => {
            setTryOn(undefined);
            if (cur !== null) act(services.equipCosmetic({ slot: 'backdrop', key: null }));
          }}
        >
          <BackdropLook skin={null} age={age} animate={false} thumb />
        </PlainCard>
        {items.map((x) => (
          <ItemTile
            key={x.id}
            item={x}
            on={cur === itemKey(x)}
            onPreview={() => setTryOn(owns(save.value, content, itemKey(x)) ? undefined : itemKey(x))}
            trying={trying && shown === itemKey(x)}
            onPick={() => {
              if (cur !== itemKey(x)) withUndo({ slot: 'backdrop', key: itemKey(x) }, { slot: 'backdrop', key: cur }, t(x.nameKey));
            }}
            art={<BackdropLook skin={itemKey(x)} age={age} animate={false} thumb />}
          />
        ))}
      </div>
    </MockLayout>
  );
}

/**
 * The way into the Flag Atlas (PLAN 2d, route `flagAtlas`): a card with the flag you fly (a globe when
 * none), "Flag Atlas" and your count of the 195. Every national flag is browsed and bought there, so
 * this tab keeps only the flags you own. While a save owns none, its first flag costs no Dust, and the
 * card says so without the word the copy review bans.
 */
function AtlasCard(p: { equipped: string | null }) {
  const { t, services, router, sound } = useUi();
  const atlas = services.flagAtlasProgress();
  return (
    <button
      type="button"
      class="cos-atlas"
      data-testid="open-flag-atlas"
      aria-label={`${t('cosmetic.ui.atlas')}. ${t('cosmetic.ui.atlasCount', { n: atlas.owned, max: atlas.total })}${atlas.price === 0 ? `. ${t('cosmetic.ui.atlasFirst')}` : ''}`}
      onClick={() => {
        sound?.('ui_tab');
        router.go({ id: 'flagAtlas' });
      }}
    >
      <span class="cos-atlas__globe" aria-hidden="true">
        <GlobeIcon size={30} />
      </span>
      <span class={`cos-atlas__flag${p.equipped ? '' : ' is-none'}`} aria-hidden="true">
        {p.equipped ? <CosmeticImage item={p.equipped} /> : null}
      </span>
      <span class="cos-atlas__text">
        <b>{t('cosmetic.ui.atlas')}</b>
        <span class="cos-atlas__count ui-num" data-testid="open-flag-atlas-count">
          {atlas.owned}/{atlas.total}
        </span>
        {atlas.price === 0 ? (
          <span class="cos-atlas__first" data-testid="open-flag-atlas-first">
            {t('cosmetic.ui.atlasFirst')}
          </span>
        ) : null}
      </span>
      <span class="cos-atlas__go" aria-hidden="true">
        <ChevronIcon size={22} />
      </span>
    </button>
  );
}

export function FlagsPanel() {
  const { save, content, t, services } = useUi();
  const act = useAct();
  const eq = equippedOf(save.value, content);
  const age = useCurrentAge();
  const withUndo = useEquipWithUndo();
  const equip = (e: CosmeticEquipPatch) => act(services.equipCosmetic(e));
  // Only the flags you own: the Atlas is the one place to browse and buy the rest (U3: one home each).
  const nations = itemsOf(content, 'nationalFlag').filter((x) => owns(save.value, content, itemKey(x)));
  return (
    <MockLayout testid="cust-flags" mock={<BaseMock age={age} />}>
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.baseFlag')}</h3>
        <Found collection="baseFlag" />
      </div>
      <div class="cos-grid cos-grid--flags">
        {ownedFirst(save.value, content, itemsOf(content, 'baseFlag')).map((x) => (
          <ItemTile key={x.id} item={x} on={eq.baseFlag === itemKey(x)} onPick={() => withUndo({ slot: 'baseFlag', key: itemKey(x) }, { slot: 'baseFlag', key: eq.baseFlag }, t(x.nameKey))} />
        ))}
      </div>
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.nationalFlag')}</h3>
      </div>
      <AtlasCard equipped={eq.nationalFlag} />
      <div class="cos-grid cos-grid--flags" data-testid="owned-national">
        <PlainCard on={eq.nationalFlag === null} testid="national-none" name={t('cosmetic.ui.noNational')} none onClick={() => equip({ slot: 'nationalFlag', key: null })} />
        {nations.map((x) => (
          <ItemTile key={x.id} item={x} on={eq.nationalFlag === itemKey(x)} onPick={() => withUndo({ slot: 'nationalFlag', key: itemKey(x) }, { slot: 'nationalFlag', key: eq.nationalFlag }, t(x.nameKey))} />
        ))}
      </div>
    </MockLayout>
  );
}

export function DecorationsPanel() {
  const { save, content, t, services } = useUi();
  const act = useAct();
  const [anchor, setAnchor] = useState(0);
  const eq = equippedOf(save.value, content);
  const cur = eq.decorations[anchor] ?? null;
  const age = useCurrentAge();
  const withUndo = useEquipWithUndo();
  return (
    <MockLayout testid="cust-decorations" mock={<BaseMock age={age} anchor={anchor} onAnchor={setAnchor} />}>
      <div class="cos-head">
        <h3 class="cust-h">{t(`cosmetic.ui.anchor.${anchor}`)}</h3>
        <Found collection="decoration" />
      </div>
      <p class="cust-hint">{t('cosmetic.ui.anchors')}</p>
      <div class="cos-grid cos-grid--decos">
        <PlainCard on={cur === null} testid="deco-none" name={t('cosmetic.ui.emptySpot')} none onClick={() => act(services.equipCosmetic({ slot: 'decoration', anchor, key: null }))} />
        {ownedFirst(save.value, content, itemsOf(content, 'decoration')).map((x) => (
          <ItemTile key={x.id} item={x} on={cur === itemKey(x)} onPick={() => withUndo({ slot: 'decoration', anchor, key: itemKey(x) }, { slot: 'decoration', anchor, key: cur }, t(x.nameKey))} />
        ))}
      </div>
    </MockLayout>
  );
}

/** How full a wheel is, as a number beside its heading ("6/8"; owner request 2026-10-07: numbers, not hint lines). */
function WheelCount(p: { n: number; max: number; testid: string }) {
  const { t } = useUi();
  return (
    <span class={`cos-wheelcount ui-num${p.n >= p.max ? ' is-full' : ''}`} data-testid={p.testid} aria-label={t('cosmetic.ui.wheelSlots', { n: p.n, max: p.max })}>
      {p.n}/{p.max}
    </span>
  );
}

/** The emote wheel preview: up to `max` slots around a hub. */
function Wheel(p: { keys: readonly string[]; max: number; onRemove: (k: string) => void }) {
  const { save, content, t } = useUi();
  const reduce = save.value.settings.reduceMotion;
  const slots = Array.from({ length: p.max }, (_, i) => p.keys[i] ?? null);
  return (
    <div class="cos-wheel" data-testid="emote-wheel" aria-label={t('cosmetic.ui.wheel')}>
      <span class="cos-wheel__hub" aria-hidden="true" />
      {slots.map((k, i) => {
        const a = (i / p.max) * Math.PI * 2 - Math.PI / 2;
        const style = { left: `${50 + Math.cos(a) * 37}%`, top: `${50 + Math.sin(a) * 37}%` };
        if (!k) return <span key={`e${i}`} class="cos-wheel__slot is-empty" style={style} aria-hidden="true" />;
        const starter = content.cosmetics.emotes.some((e) => e.id === k);
        const label = starter ? t(emoteNameKey(k as BaseEmoteId)) : t(cosmeticNameKey('emote', k.slice(6)));
        return (
          <button key={k} type="button" class="cos-wheel__slot" style={style} aria-label={`${t('cosmetic.ui.remove')}: ${label}`} data-testid={`wheel-${k}`} onClick={() => p.onRemove(k)}>
            {starter ? <EmoteGlyph emote={k as BaseEmoteId} size={34} /> : <CosmeticImage item={k} animate={!reduce} />}
          </button>
        );
      })}
    </div>
  );
}

export function EmotesPanel() {
  const { save, content, t, services, toasts } = useUi();
  const act = useAct();
  const eq = equippedOf(save.value, content);
  const max = content.cosmetics.collections.wheel.emotes;
  const set = (keys: string[]) => act(services.equipCosmetic({ slot: 'emotes', keys }));
  const toggle = (k: string) => {
    if (eq.emotes.includes(k)) set(eq.emotes.filter((x) => x !== k));
    else if (eq.emotes.length >= max) toasts.show(t('cosmetic.ui.wheelFull'), { tone: 'bad' });
    else set([...eq.emotes, k]);
  };
  return (
    <MockLayout testid="cust-emotes" mock={<Wheel keys={eq.emotes} max={max} onRemove={(k) => set(eq.emotes.filter((x) => x !== k))} />}>
      <div class="cos-head">
        <h3 class="cust-h">
          {t('cosmetic.ui.wheel')} <WheelCount n={eq.emotes.length} max={max} testid="emote-count" />
        </h3>
        <Found collection="emote" />
      </div>
      <h4 class="cos-sub">{t('cosmetic.ui.starters')}</h4>
      <div class="cos-grid cos-grid--emotes">
        {content.cosmetics.emotes.map((e) => {
          const on = eq.emotes.includes(e.id);
          return (
            <PlainCard key={e.id} on={on} testid={`item-${e.id}`} extra="cos-tile--emote" name={t(emoteNameKey(e.id))} state={on ? t('cosmetic.ui.inWheel') : undefined} onClick={() => toggle(e.id)}>
              <EmoteGlyph emote={e.id} size={40} />
            </PlainCard>
          );
        })}
      </div>
      <h4 class="cos-sub">{t('cosmetic.ui.collected')}</h4>
      <div class="cos-grid cos-grid--emotes">
        {ownedFirst(save.value, content, itemsOf(content, 'emote')).map((x) => (
          <ItemTile key={x.id} item={x} on={eq.emotes.includes(itemKey(x))} onPick={() => toggle(itemKey(x))} onLabel={t('cosmetic.ui.inWheel')} pickLabel={t('cosmetic.ui.add')} />
        ))}
      </div>
    </MockLayout>
  );
}

/**
 * The quote wheel as the battle shows it (PLAN 2a "Quotes"): your General's bust with the four lines
 * around it in the battle bubble, each tail toward the bust; a tap on a line takes it out of the wheel,
 * an empty slot is a dashed bubble.
 */
function QuoteWheel(p: { keys: readonly string[]; max: number; look: ResolvedLook; onRemove: (k: string) => void }) {
  const { content, t } = useUi();
  const tails: BubbleTail[] = ['br', 'bl', 'tr', 'tl'];
  return (
    <div class="cos-qwheel" data-testid="quote-wheel" aria-label={t('cosmetic.ui.wheel')}>
      <span class="cos-qwheel__bust" aria-hidden="true">
        <AvatarLookView look={p.look} size={112} crop="bust" />
      </span>
      {Array.from({ length: p.max }, (_, i) => p.keys[i] ?? null).map((k, i) => {
        const tail = tails[i % tails.length]!;
        if (!k) {
          return (
            <span key={`e${i}`} class={`cos-qwheel__slot cos-qwheel__slot--${i} is-empty`} aria-hidden="true">
              <span class={`cos-qb cos-qb--sm cos-qb--tail-${tail} cos-qb--empty`}>
                <span class="cos-qb__body">+</span>
              </span>
            </span>
          );
        }
        const item = findItem(content, k);
        const line = t(quoteTextKey(k.slice(6)));
        return (
          <button key={k} type="button" class={`cos-qwheel__slot cos-qwheel__slot--${i}`} onClick={() => p.onRemove(k)} aria-label={`${t('cosmetic.ui.remove')}: ${line}`} data-testid={`qwheel-${k}`}>
            <QuoteBubble text={line} rarity={item?.rarity ?? 'common'} tail={tail} small pop />
          </button>
        );
      })}
    </div>
  );
}

export function QuotesPanel() {
  const { save, content, t, services, toasts } = useUi();
  const act = useAct();
  const eq = equippedOf(save.value, content);
  const max = content.cosmetics.collections.wheel.quotes;
  const look = resolveLook(save.value.profile.avatar);
  const set = (keys: string[]) => act(services.equipCosmetic({ slot: 'quotes', keys }));
  const toggle = (k: string) => {
    if (eq.quotes.includes(k)) set(eq.quotes.filter((x) => x !== k));
    else if (eq.quotes.length >= max) toasts.show(t('cosmetic.ui.wheelFull'), { tone: 'bad' });
    else set([...eq.quotes, k]);
  };
  // each tile shows its line in the battle bubble with your General's head (PLAN 2a)
  const bubble = (x: CosmeticItemDef) => <QuoteBubble text={x.textKey ? t(x.textKey) : t(x.nameKey)} rarity={x.rarity} head={<AvatarLookView look={look} size={34} crop="head" detail="low" />} />;
  return (
    <MockLayout testid="cust-quotes" mock={<QuoteWheel keys={eq.quotes} max={max} look={look} onRemove={(k) => set(eq.quotes.filter((x) => x !== k))} />}>
      <div class="cos-head">
        <h3 class="cust-h">
          {t('cosmetic.ui.wheel')} <WheelCount n={eq.quotes.length} max={max} testid="quote-count" />
        </h3>
        <Found collection="quote" />
      </div>
      <div class="cos-grid cos-grid--quotes">
        {ownedFirst(save.value, content, itemsOf(content, 'quote')).map((x) => (
          <ItemTile key={x.id} item={x} wide on={eq.quotes.includes(itemKey(x))} onPick={() => toggle(itemKey(x))} onLabel={t('cosmetic.ui.inWheel')} pickLabel={t('cosmetic.ui.add')} art={bubble(x)} bigArt={() => bubble(x)} />
        ))}
      </div>
    </MockLayout>
  );
}

/** Every collection's completion in one strip (Collection and Customize headers). */
export function CompletionStrip() {
  const { t } = useUi();
  return (
    <div class="cos-strip" data-testid="cosmetic-completion" aria-label={t('cosmetic.ui.collectionsTitle')}>
      {(['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop'] as const).map((c) => (
        <Found key={c} collection={c} label />
      ))}
    </div>
  );
}
