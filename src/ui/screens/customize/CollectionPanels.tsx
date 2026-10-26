/**
 * The Customize screen's collection panels (DESIGN A18.9.4): base skins, flags, decorations, emotes
 * and quotes, each with its completion count ("12/40 found") and, for everything on the base, a live
 * mock-up of your base with the equipped flags, decorations and skin. Owned items equip with one tap;
 * locked ones say how they are earned and, for drop-pool items, offer Dust crafting. Nothing here can
 * be bought (A6.2).
 */
import { ageNameKey, cosmeticCollectionKey, cosmeticNameKey, emoteNameKey, quoteTextKey, rarityNameKey, sceneClassicNameKey, skinNameKey } from '@/content/keys';
import type { CosmeticCollection, CosmeticItemDef, CosmeticSource } from '@/content/types';
import type { AgeId, BaseEmoteId, Rarity, SkinDef } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { useConfirmSpend } from '../../components/confirm';
import { AvatarLookView, resolveLook, type ResolvedLook } from '../../components/Avatar';
import { BackdropLook, BaseThumb, ClothItem, CosmeticImage, FlagTileImage, QuoteBubble, SceneThumb, useCosmeticImage, useFlagAtlasReady, type BubbleTail } from '../../components/cosmeticArt';
import { formatInt } from '../../components/format';
import { AGE_COLOR, AgeGlyph, CapsuleIcon, CheckIcon, ChevronIcon, CrateIcon, CrownIcon, DustIcon, FlagIcon, GlobeIcon, LockIcon, RARITY_COLOR, RarityGem, StarIcon, TrophyIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { Tabs } from '../../components/Tabs';
import { useUi } from '../context';
import { craftLocked, craftPrice, equippedOf, findItem, itemKey, itemsOf, ownedFirst, owns, progressOf, sourceText } from '../model/cosmetics';
import { playLevelId } from '../model/warPath';
import type { ActionResult, CosmeticEquipPatch } from '../services';
import { DamageToggle, type CrumbleStage } from './DamageToggle';
import { EmoteFace, EmoteStage, WheelEmote } from './EmotePreview';
import { freshAge, freshAges, freshKeysOfAge, useFresh } from './fresh';
import { BaseMock, PreviewStage, shownBaseKey } from './PreviewStage';

export { BaseMock };

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

/**
 * The age tabs of a collection that shows one age at a time (base skins, scenes; `AGE_PAGED`): the shared
 * age picker's tabs, plus the NEW dot on every age whose page holds NEW items. Opening an age page marks only
 * that page's items seen (review 3b: a NEW scene on an age nobody opened was marked seen with its tab).
 */
function FreshAgePicker(p: { collection: 'baseSkin' | 'scene'; ages: readonly AgeId[]; value: AgeId; onChange: (a: AgeId) => void; testid: string; idPrefix: string }) {
  const { save, content, services, t } = useUi();
  useEffect(() => {
    const keys = freshKeysOfAge(save.peek(), content, p.collection, p.value);
    if (keys.length > 0) services.markCosmeticsSeen(keys);
  }, [p.value]);
  const fresh = freshAges(save.value, content, p.collection);
  return (
    <Tabs
      label={t('ui.age.picker')}
      compact
      variant="age"
      value={p.value}
      onChange={p.onChange}
      testid={p.testid}
      idPrefix={p.idPrefix}
      items={p.ages.map((a) => ({
        value: a,
        label: t(ageNameKey(a)),
        icon: (
          <span class="ui-agechip" style={{ '--age': AGE_COLOR[a].accent }}>
            <AgeGlyph age={a} size={26} />
          </span>
        ),
        badge: fresh.has(a) ? <i class="cust-newdot" role="img" aria-label={t('cosmetic.ui.newItems')} data-testid={`age-new-${a}`} /> : undefined,
        testid: `age-tab-${a}`,
      }))}
    />
  );
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
  /** Ownership when the item is not a collection item (a troop-system base skin: Crystal Spire). */
  owned?: boolean;
  /** NEW until seen (save v15 `cosmetics.fresh`): a pip on the card; by default the screen's list says. */
  fresh?: boolean;
}) {
  const { save, content, t, sound } = useUi();
  const key = itemKey(p.item);
  const have = p.owned ?? owns(save.value, content, key);
  const freshSet = useFresh();
  const isFresh = p.fresh ?? freshSet.has(key);
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
          // a locked card answers the tap with how it is earned; where there is a preview the first tap
          // tries it on and a second tap (while it is tried on) opens how it is earned and the craft
          sound?.('ui_toggle');
          if (!p.onPreview || p.trying) setInfo(true);
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
          {isFresh && have ? (
            <span class="cos-tile__new" data-tag="" data-testid={`new-${key}`}>
              {t('cosmetic.ui.new')}
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
function PlainCard(p: { on: boolean; testid: string; name: string; onClick: () => void; children?: ComponentChildren; none?: boolean; extra?: string; state?: string | undefined; foot?: string; trying?: boolean }) {
  const pop = usePop(p.on);
  return (
    <button
      type="button"
      class={`cos-tile cos-tile--plain cos-card cos-card--plain${p.extra ? ` ${p.extra}` : ''}${p.on ? ' is-on' : ''}${p.trying ? ' is-trying' : ''}`}
      aria-pressed={p.on || !!p.trying}
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
        ) : p.foot ? (
          <span class="cos-card__rarity" data-tag="" aria-hidden="true">
            {p.foot}
          </span>
        ) : null}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Layout: the preview column and the list
// ---------------------------------------------------------------------------------------------

/**
 * The two-column layout: the preview left (sticky while the list scrolls), the items right. On desktop
 * the preview column is wide enough for a 16:9 stage, and `info` fills the rest of it with what the
 * stage shows (the desktop layout pass: the column under the preview was empty).
 */
function MockLayout(p: { mock: ComponentChildren; info?: ComponentChildren; children: ComponentChildren; testid: string; wide?: boolean }) {
  return (
    <div class={`cos-split${p.wide ? ' cos-split--wide' : ''}`} data-testid={p.testid}>
      <div class="cos-split__mock">
        {p.mock}
        {p.info ? <div class="cos-split__info">{p.info}</div> : null}
      </div>
      <div class="cos-split__list">{p.children}</div>
    </div>
  );
}

/** One line of the preview's info card: what shows, its rarity, and whether it is equipped, tried on or how it is earned. */
export interface StageInfoRow {
  label: string;
  name: string;
  rarity?: Rarity | null;
  state: 'equipped' | 'trying' | 'owned' | 'locked';
  /** How a locked one is earned (its source icon and text). */
  source?: CosmeticSource | null;
  how?: string;
  testid?: string;
  /** The row of the spot picked on the stage (the Decorations tab). */
  picked?: boolean;
}

/** The preview's info card (desktop and tall screens): one row per thing the stage shows. */
function StageInfo(p: { rows: StageInfoRow[]; children?: ComponentChildren }) {
  const { t } = useUi();
  return (
    <div class="cos-stinfo" data-testid="stage-info">
      {p.rows.map((r) => (
        <div key={r.testid ?? r.label} class={`cos-stinfo__row is-${r.state}${r.picked ? ' is-picked' : ''}`} data-testid={r.testid}>
          <span class="cos-stinfo__gem" aria-hidden="true">
            {r.rarity ? <RarityGem rarity={r.rarity} size={18} /> : <span class="cos-stinfo__dot" />}
          </span>
          <span class="cos-stinfo__text">
            <small>{r.label}</small>
            <b data-clip-check="">{r.name}</b>
          </span>
          {r.state === 'equipped' ? (
            <span class="cos-stinfo__state is-on">{t('cosmetic.ui.equipped')}</span>
          ) : r.state === 'trying' ? (
            <span class="cos-stinfo__state is-trying">{t('cosmetic.ui.tryingOn')}</span>
          ) : r.state === 'locked' && r.source ? (
            <span class="cos-stinfo__how" title={r.how}>
              <SourceIcon source={r.source} size={16} />
              <span>{r.how}</span>
            </span>
          ) : null}
        </div>
      ))}
      {p.children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------------------------

/** A troop-system base skin (Crystal Spire, A5.8) as a collection item, so it sits in the same grid (PLAN 2f interface 7). */
function troopSkinItem(content: ReturnType<typeof useUi>['content'], k: SkinDef): CosmeticItemDef {
  const age = k.target.slice('base.'.length) as AgeId;
  const gate = content.arenas.list.find((a) => a.gateRewards.some((r) => r.kind === 'skin' && r.skin === k.id));
  const source: CosmeticSource = gate ? { kind: 'arena', arena: gate.index } : { kind: 'crate' };
  return { id: k.id, collection: 'baseSkin', rarity: k.rarity, source, art: k.visualId, nameKey: skinNameKey(k.id), age };
}

/**
 * Base skins per age (PLAN 2c, 2f interface 7): the standard base, the age's skins and the troop-system
 * skin of that base (Crystal Spire, Future) in one grid; one skin per age across both systems. The
 * preview is the live diorama (Track B) once it is ready, with a Damage toggle that steps the model
 * through its crumble stages; a tap on a locked skin tries it on.
 */
export function BasesPanel() {
  const { save, content, t, services, toasts, sound } = useUi();
  const s = save.value;
  const act = useAct();
  const ages = content.order.ages;
  const now = useCurrentAge();
  // a NEW base skin opens its age (save v15), else the age the player plays now
  const fresh = useFresh();
  const [age, setAge] = useState<AgeId>(() => freshAge(fresh, content, 'baseSkin') ?? now);
  const [tryOn, setTryOn] = useState<{ age: AgeId; key: string | null } | null>(null);
  const [crumble, setCrumble] = useState<CrumbleStage>(0);
  const eq = equippedOf(s, content);
  const reduce = s.settings.reduceMotion;
  const cur = shownBaseKey(s, eq, age);
  const shown = tryOn && tryOn.age === age ? tryOn.key : cur;
  const items = itemsOf(content, 'baseSkin').filter((x) => x.age === age);
  const troop = content.order.skins
    .map((id) => content.skins[id])
    .filter((k): k is SkinDef => !!k && k.target === `base.${age}` && k.released !== false);
  const troopItems = troop.map((k) => troopSkinItem(content, k));
  const ownsTroop = (id: string) => s.skins.owned.includes(id);
  const all = [...items, ...troopItems];
  const ownedAll = [...items.filter((x) => owns(s, content, itemKey(x))), ...troopItems.filter((x) => ownsTroop(x.id))];
  const list = [...ownedAll, ...all.filter((x) => !ownedAll.includes(x))];
  const isTroop = (x: CosmeticItemDef) => troopItems.includes(x);
  // the whole set: every age's cosmetic skins plus the troop-system base skins
  const allTroop = content.order.skins.map((id) => content.skins[id]).filter((k): k is SkinDef => !!k && k.target.startsWith('base.') && k.released !== false);
  const setOwned = progressOf(s, content, 'baseSkin').owned + allTroop.filter((k) => ownsTroop(k.id)).length;
  const setTotal = progressOf(s, content, 'baseSkin').total + allTroop.length;
  const withUndo = useEquipWithUndo();
  const troopNow = s.skins.equipped[`base.${age}`] ?? null;
  const equipStandard = () => {
    setTryOn(null);
    if (cur === null) return;
    // both systems: the cosmetic skin and the troop skin of this base
    if (troopNow) services.equipSkin(`base.${age}`, null);
    if (eq.baseSkins[age]) act(services.equipCosmetic({ slot: 'baseSkin', age, key: null }));
    else sound?.('ui_stamp');
  };
  const equipTroop = (x: CosmeticItemDef) => {
    if (troopNow === x.id) return;
    const before = { troop: troopNow, cosmetic: eq.baseSkins[age] ?? null };
    services.equipSkin(`base.${age}`, x.id);
    sound?.('ui_stamp');
    toasts.show(t('cosmetic.ui.equippedName', { name: t(x.nameKey) }), {
      tone: 'good',
      undo: () => {
        services.equipSkin(`base.${age}`, before.troop);
        if (before.cosmetic) services.equipCosmetic({ slot: 'baseSkin', age, key: before.cosmetic });
      },
    });
  };
  const shownItem = shown ? (items.find((x) => itemKey(x) === shown) ?? troopItems.find((x) => `baseSkin.${x.id}` === shown)) : undefined;
  const shownOwned = shownItem ? (isTroop(shownItem) ? ownsTroop(shownItem.id) : owns(s, content, itemKey(shownItem))) : true;
  const info: StageInfoRow = {
    label: t('cosmetic.ui.baseSkinOf', { age: t(ageNameKey(age)) }),
    name: shownItem ? t(shownItem.nameKey) : t('cosmetic.ui.defaultSkin'),
    rarity: shownItem?.rarity ?? null,
    state: shown !== cur ? 'trying' : shownOwned ? 'equipped' : 'locked',
    source: shownItem && !shownOwned ? shownItem.source : null,
    how: shownItem && !shownOwned ? sourceText(t, shownItem) : '',
    testid: 'stage-info-base',
  };
  const stage = (
    <PreviewStage
      age={age}
      baseSkin={shown}
      crumble={crumble}
      caption={`${t('cosmetic.ui.preview')} · ${t(ageNameKey(age))}`}
      testid="base-stage"
      // only the live base crumbles: the toggle comes with the live stage (round 3: an icon with four pips)
      overlay={(live) => (live ? <DamageToggle crumble={crumble} onStep={setCrumble} /> : null)}
    />
  );
  return (
    <MockLayout testid="cust-bases" wide mock={stage} info={<StageInfo rows={[info]} />}>
      <FreshAgePicker collection="baseSkin" ages={ages} value={age} onChange={(a) => { setAge(a); setCrumble(0); }} testid="cust-age" idPrefix="cust-age" />
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.baseSkinOf', { age: t(ageNameKey(age)) })}</h3>
        <FoundCount n={setOwned} max={setTotal} testid="found-baseSkin" />
      </div>
      <div class="cos-grid cos-grid--skins" data-testid="cust-base-skins">
        <PlainCard on={cur === null} trying={shown === null && cur !== null} testid="base-default" name={t('cosmetic.ui.defaultSkin')} onClick={equipStandard} extra="cos-tile--baseSkin">
          {/* keyed by age: a new age's base never shows the last age's picture for a frame */}
          <BaseThumb key={age} age={age} skin={null} />
        </PlainCard>
        {list.map((x) => {
          const troopSkin = isTroop(x);
          const key = troopSkin ? `baseSkin.${x.id}` : itemKey(x);
          const have = troopSkin ? ownsTroop(x.id) : owns(s, content, key);
          return (
            <ItemTile
              key={key}
              item={x}
              {...(troopSkin ? { owned: have } : {})}
              on={cur === key}
              trying={shown === key && cur !== key}
              onPreview={() => setTryOn(have ? null : { age, key })}
              onPick={() => {
                if (troopSkin) equipTroop(x);
                else if (cur !== key) withUndo({ slot: 'baseSkin', age, key }, { slot: 'baseSkin', age, key: eq.baseSkins[age] ?? null }, t(x.nameKey));
              }}
              art={<BaseThumb age={age} skin={key} animate={!reduce} />}
              // the info panel of a locked skin shows the same model, bigger (review 1, blocker 1)
              bigArt={() => <BaseThumb age={age} skin={key} animate={!reduce} />}
            />
          );
        })}
      </div>
    </MockLayout>
  );
}

/** "12/40 found" with a bar, for a count the content collections alone do not give (the base skins with Crystal Spire). */
function FoundCount(p: { n: number; max: number; testid: string }) {
  const { t } = useUi();
  const pct = p.max > 0 ? Math.round((p.n / p.max) * 100) : 0;
  return (
    <span class="cos-found" data-testid={p.testid}>
      <span class="cos-found__text">{t('cosmetic.ui.found', { n: p.n, max: p.max })}</span>
      <span class="cos-found__bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

/**
 * Backdrops per age (owner item 20, PLAN 2b, 2f interface 7): "Scene · <Age>" (the age's classic scene
 * plus its released scenes; a tap equips for that age) and "Sky · all ages" (the ten skies plus the
 * scene's own daylight, equipped once for every age). The preview shows the combination (the live
 * diorama once Track B's stage is ready, the painted still until then); a tap on a locked scene or sky
 * tries it on, an owned one is equipped at once with Undo.
 */
export function BackdropsPanel() {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const act = useAct();
  const now = useCurrentAge();
  // a NEW scene opens its age (save v15), else the age the player plays now
  const fresh = useFresh();
  const [age, setAge] = useState<AgeId>(() => freshAge(fresh, content, 'scene') ?? now);
  const eq = equippedOf(s, content);
  const curScene = eq.scenes[age] ?? null;
  const curSky = eq.backdrop ?? null;
  const [tryScene, setTryScene] = useState<{ age: AgeId; key: string | null } | null>(null);
  const [trySky, setTrySky] = useState<string | null | undefined>(undefined);
  const shownScene = tryScene && tryScene.age === age ? tryScene.key : curScene;
  const shownSky = trySky !== undefined ? trySky : curSky;
  const scenes = ownedFirst(s, content, itemsOf(content, 'scene').filter((x) => x.age === age));
  const skies = ownedFirst(s, content, itemsOf(content, 'backdrop'));
  const sceneItem = shownScene ? findItem(content, shownScene) : undefined;
  const skyItem = shownSky ? findItem(content, shownSky) : undefined;
  const withUndo = useEquipWithUndo();
  const ownsKey = (k: string | null) => k === null || owns(s, content, k);
  const scenesNow: Partial<Record<AgeId, string>> = { ...eq.scenes };
  if (shownScene) scenesNow[age] = shownScene;
  else delete scenesNow[age];
  const sceneName = sceneItem ? t(sceneItem.nameKey) : t(sceneClassicNameKey(age));
  const skyName = skyItem ? t(skyItem.nameKey) : t('cosmetic.ui.skyClassic');
  const rows: StageInfoRow[] = [
    {
      label: t('cosmetic.ui.sceneFor', { age: t(ageNameKey(age)) }),
      name: sceneName,
      rarity: sceneItem?.rarity ?? null,
      state: shownScene !== curScene ? 'trying' : ownsKey(shownScene) ? 'equipped' : 'locked',
      testid: 'stage-info-scene',
    },
    {
      label: t('cosmetic.ui.skyAll'),
      name: skyName,
      rarity: skyItem?.rarity ?? null,
      state: shownSky !== curSky ? 'trying' : ownsKey(shownSky) ? 'equipped' : 'locked',
      testid: 'stage-info-sky',
    },
  ];
  for (const [r, x, k] of [
    [rows[0]!, sceneItem, shownScene],
    [rows[1]!, skyItem, shownSky],
  ] as const) {
    if (x && !ownsKey(k)) {
      r.source = x.source;
      r.how = sourceText(t, x);
    }
  }
  const stage = (
    <PreviewStage age={age} look={{ scenes: scenesNow, backdrop: shownSky }} caption={t('cosmetic.ui.backdropPreview', { age: t(ageNameKey(age)) })} testid="backdrop-mock">
      <span class={`cos-stage__plate${shownScene !== curScene || shownSky !== curSky ? ' is-trying' : ''}`} data-testid="backdrop-name">
        <b>{sceneName}</b>
        <span>{skyName}</span>
        {shownScene !== curScene || shownSky !== curSky ? <small data-tag="">{t('cosmetic.ui.tryingOn')}</small> : null}
      </span>
    </PreviewStage>
  );
  return (
    <MockLayout testid="cust-backdrops" wide mock={stage} info={<StageInfo rows={rows} />}>
      <FreshAgePicker collection="scene" ages={content.order.ages} value={age} onChange={setAge} testid="cust-bd-age" idPrefix="cust-bd-age" />
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.sceneFor', { age: t(ageNameKey(age)) })}</h3>
        {/* no count while no scene is out yet (each ships once its art is in) */}
        {progressOf(s, content, 'scene').total > 0 ? <Found collection="scene" /> : null}
      </div>
      <div class="cos-grid cos-grid--backdrops" data-testid="scene-grid">
        <PlainCard
          on={curScene === null}
          trying={shownScene === null && curScene !== null}
          testid="scene-classic"
          extra="cos-tile--backdrop"
          name={t(sceneClassicNameKey(age))}
          foot={t('cosmetic.ui.sceneClassic')}
          onClick={() => {
            setTryScene(null);
            if (curScene !== null) withUndo({ slot: 'scene', age, key: null }, { slot: 'scene', age, key: curScene }, t(sceneClassicNameKey(age)));
          }}
        >
          <SceneThumb key={age} scene={null} age={age} />
        </PlainCard>
        {scenes.map((x) => (
          <ItemTile
            key={x.id}
            item={x}
            on={curScene === itemKey(x)}
            onPreview={() => setTryScene(owns(s, content, itemKey(x)) ? null : { age, key: itemKey(x) })}
            trying={shownScene === itemKey(x) && curScene !== itemKey(x)}
            onPick={() => {
              if (curScene !== itemKey(x)) withUndo({ slot: 'scene', age, key: itemKey(x) }, { slot: 'scene', age, key: curScene }, t(x.nameKey));
            }}
            art={<SceneThumb scene={itemKey(x)} age={age} />}
            bigArt={() => <SceneThumb scene={itemKey(x)} age={age} />}
          />
        ))}
      </div>
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.skyAll')}</h3>
        <Found collection="backdrop" />
      </div>
      <div class="cos-grid cos-grid--backdrops" data-testid="sky-grid">
        <PlainCard
          on={curSky === null}
          trying={shownSky === null && curSky !== null}
          testid="backdrop-classic"
          extra="cos-tile--backdrop"
          name={t('cosmetic.ui.skyClassic')}
          onClick={() => {
            setTrySky(undefined);
            if (curSky !== null) act(services.equipCosmetic({ slot: 'backdrop', key: null }));
          }}
        >
          <BackdropLook skin={null} scene={shownScene} age={age} animate={false} thumb />
        </PlainCard>
        {skies.map((x) => (
          <ItemTile
            key={x.id}
            item={x}
            on={curSky === itemKey(x)}
            onPreview={() => setTrySky(owns(s, content, itemKey(x)) ? undefined : itemKey(x))}
            trying={shownSky === itemKey(x) && curSky !== itemKey(x)}
            onPick={() => {
              if (curSky !== itemKey(x)) withUndo({ slot: 'backdrop', key: itemKey(x) }, { slot: 'backdrop', key: curSky }, t(x.nameKey));
            }}
            art={<BackdropLook skin={itemKey(x)} scene={shownScene} age={age} animate={false} thumb />}
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
        {/* the flag you fly, waving like the lane's cloth (queue item 37) */}
        {p.equipped ? <ClothItem item={p.equipped} widthPx={54} /> : null}
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
  // their tiles wait for the one flag atlas instead of downloading every flag's SVG (review 1)
  const atlasReady = useFlagAtlasReady(useCosmeticImage());
  const baseFlag = eq.baseFlag ? findItem(content, eq.baseFlag) : undefined;
  const nation = eq.nationalFlag ? findItem(content, eq.nationalFlag) : undefined;
  const rows: StageInfoRow[] = [
    { label: t('cosmetic.ui.baseFlag'), name: baseFlag ? t(baseFlag.nameKey) : t('cosmetic.ui.noBaseFlag'), rarity: baseFlag?.rarity ?? null, state: baseFlag ? 'equipped' : 'owned', testid: 'stage-info-baseFlag' },
    { label: t('cosmetic.ui.nationalFlag'), name: nation ? t(nation.nameKey) : t('cosmetic.ui.noNational'), state: nation ? 'equipped' : 'owned', testid: 'stage-info-nation' },
  ];
  // the live stage: your base flying the flags as in battle, the pole marked; it pings when a flag changes
  const stage = (
    <PreviewStage
      age={age}
      pole
      poleKey={`${eq.baseFlag ?? ''}|${eq.nationalFlag ?? ''}`}
      stillOnly={save.value.settings.reduceMotion}
      caption={`${t('cosmetic.ui.preview')} · ${t(ageNameKey(age))}`}
      testid="flag-stage"
    />
  );
  return (
    <MockLayout testid="cust-flags" wide mock={stage} info={<StageInfo rows={rows} />}>
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
          <ItemTile
            key={x.id}
            item={x}
            on={eq.nationalFlag === itemKey(x)}
            onPick={() => withUndo({ slot: 'nationalFlag', key: itemKey(x) }, { slot: 'nationalFlag', key: eq.nationalFlag }, t(x.nameKey))}
            art={<FlagTileImage item={itemKey(x)} ready={atlasReady} />}
          />
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
  // one row per spot on the desktop info card, the picked one marked
  const rows: StageInfoRow[] = [0, 1, 2].map((i) => {
    const k = eq.decorations[i] ?? null;
    const x = k ? findItem(content, k) : undefined;
    return { label: t(`cosmetic.ui.anchor.${i}`), name: x ? t(x.nameKey) : t('cosmetic.ui.emptySpot'), rarity: x?.rarity ?? null, state: 'owned', picked: i === anchor, testid: `stage-info-spot-${i}` };
  });
  // the live stage: your base with its Blender decorations as in battle, the three spots as tap targets
  const stage = (
    <PreviewStage
      age={age}
      spots={{ picked: anchor, onPick: setAnchor }}
      stillOnly={save.value.settings.reduceMotion}
      caption={`${t('cosmetic.ui.preview')} · ${t(ageNameKey(age))}`}
      testid="deco-stage"
    />
  );
  return (
    <MockLayout testid="cust-decorations" wide mock={stage} info={<StageInfo rows={rows} />}>
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

/**
 * The emote wheel preview: up to `max` slots around a hub that shows your General (the starter emotes
 * are your General performing them; a tap on a slot takes it out).
 */
function Wheel(p: { keys: readonly string[]; max: number; onRemove: (k: string) => void }) {
  const { save, content, t } = useUi();
  const slots = Array.from({ length: p.max }, (_, i) => p.keys[i] ?? null);
  return (
    <div class="cos-wheel" data-testid="emote-wheel" aria-label={t('cosmetic.ui.wheel')}>
      <span class="cos-wheel__hub" aria-hidden="true">
        <AvatarLookView look={resolveLook(save.value.profile.avatar)} size={72} crop="head" />
      </span>
      {slots.map((k, i) => {
        const a = (i / p.max) * Math.PI * 2 - Math.PI / 2;
        const style = { left: `${50 + Math.cos(a) * 37}%`, top: `${50 + Math.sin(a) * 37}%` };
        if (!k) return <span key={`e${i}`} class="cos-wheel__slot is-empty" style={style} aria-hidden="true" />;
        const starter = content.cosmetics.emotes.some((e) => e.id === k);
        const label = starter ? t(emoteNameKey(k as BaseEmoteId)) : t(cosmeticNameKey('emote', k.slice(6)));
        return (
          <button key={k} type="button" class={`cos-wheel__slot${starter ? ' is-head' : ''}`} style={style} aria-label={`${t('cosmetic.ui.remove')}: ${label}`} data-testid={`wheel-${k}`} onClick={() => p.onRemove(k)}>
            <WheelEmote emote={k} size={44} />
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
  // the emote the stage under the wheel plays: the last one picked, else the wheel's first
  const [last, setLast] = useState<string | null>(null);
  const set = (keys: string[]) => act(services.equipCosmetic({ slot: 'emotes', keys }));
  const toggle = (k: string) => {
    setLast(k);
    if (eq.emotes.includes(k)) set(eq.emotes.filter((x) => x !== k));
    else if (eq.emotes.length >= max) toasts.show(t('cosmetic.ui.wheelFull'), { tone: 'bad' });
    else set([...eq.emotes, k]);
  };
  return (
    <MockLayout
      testid="cust-emotes"
      mock={<Wheel keys={eq.emotes} max={max} onRemove={(k) => set(eq.emotes.filter((x) => x !== k))} />}
      info={<EmoteStage emote={last ?? eq.emotes[0] ?? null} />}
    >
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
            <PlainCard key={e.id} on={on} testid={`item-${e.id}`} extra="cos-tile--emote cos-tile--head" name={t(emoteNameKey(e.id))} state={on ? t('cosmetic.ui.inWheel') : undefined} onClick={() => toggle(e.id)}>
              <EmoteFace emote={e.id} size={64} />
            </PlainCard>
          );
        })}
      </div>
      <h4 class="cos-sub">{t('cosmetic.ui.collected')}</h4>
      <div class="cos-grid cos-grid--emotes">
        {ownedFirst(save.value, content, itemsOf(content, 'emote')).map((x) => (
          <ItemTile
            key={x.id}
            item={x}
            on={eq.emotes.includes(itemKey(x))}
            onPick={() => toggle(itemKey(x))}
            onLabel={t('cosmetic.ui.inWheel')}
            pickLabel={t('cosmetic.ui.add')}
          />
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
