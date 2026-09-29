/**
 * The Customize screen's collection panels (DESIGN A18.9.4): base skins, flags, decorations, emotes
 * and quotes, each with its completion count ("12/40 found") and, for everything on the base, a live
 * mock-up of your base with the equipped flags, decorations and skin. Owned items equip with one tap;
 * locked ones say how they are earned and, for drop-pool items, offer Dust crafting. Nothing here can
 * be bought (A6.2).
 */
import { ageNameKey, capsuleTierShortKey, cosmeticCollectionKey, cosmeticNameKey, emoteNameKey, quoteTextKey, rarityNameKey } from '@/content/keys';
import type { CosmeticCollection, CosmeticItemDef } from '@/content/types';
import type { AgeId, BaseEmoteId, CosmeticLoadout } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { BaseLook, CosmeticImage } from '../../components/cosmeticArt';
import { CheckIcon, DustIcon, LockIcon, RARITY_COLOR } from '../../components/icons';
import { AgePicker } from '../../components/Tabs';
import { EmoteGlyph } from '../../hud/icons';
import { useUi } from '../context';
import { craftLocked, craftPrice, equippedOf, itemKey, itemsOf, ownedFirst, owns, progressOf, sourceHint } from '../model/cosmetics';
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
  const { toasts, t } = useUi();
  return (r: ActionResult, okText?: string) => {
    if (r.ok) {
      if (okText) toasts.show(okText, { tone: 'good' });
      return;
    }
    const key = `cosmetic.ui.reason.${r.reason}`;
    const text = t(key);
    toasts.show(text === key ? t('cosmetic.ui.reason.notOwned') : text, { tone: 'bad' });
  };
}

/** One collection item: art, name, rarity edge, and its state (equipped, equip, locked with source, craft). */
export function ItemTile(p: {
  item: CosmeticItemDef;
  on: boolean;
  onPick: () => void;
  /** Wide tiles show a quote's line. */
  wide?: boolean;
  art?: ComponentChildren;
  /** The owned state labels (default "Equipped" / "Equip"). */
  onLabel?: string;
  pickLabel?: string;
}) {
  const { save, content, t, services } = useUi();
  const act = useAct();
  const key = itemKey(p.item);
  const have = owns(save.value, content, key);
  const price = craftPrice(content, p.item);
  const locked = craftLocked(save.value, p.item);
  const src = sourceHint(p.item);
  // A tier's own set names its tier ("From Aeon Capsules. Craftable after your first.").
  const hint = p.item.source.kind === 'capsuleTier' ? { key: src.key, params: { tier: t(capsuleTierShortKey(p.item.source.tier)) } } : src;
  const rarity = p.item.rarity;
  return (
    <div
      class={`cos-tile cos-tile--${p.item.collection}${p.wide ? ' cos-tile--wide' : ''}${have ? '' : ' is-locked'}${p.on ? ' is-on' : ''}`}
      style={{ '--rar': RARITY_COLOR[rarity] }}
      data-testid={`item-${key}`}
    >
      <button
        type="button"
        class="cos-tile__hit"
        aria-pressed={p.on}
        aria-disabled={have ? undefined : 'true'}
        aria-label={`${t(p.item.nameKey)}. ${have ? (p.on ? t('cosmetic.ui.equipped') : (p.pickLabel ?? t('cosmetic.ui.equip'))) : t(hint.key, hint.params)}`}
        onClick={() => {
          if (have) p.onPick();
        }}
      >
        <span class="cos-tile__art">{p.art ?? <CosmeticImage item={key} animate={!save.value.settings.reduceMotion} />}</span>
        {p.wide && p.item.textKey ? <span class="cos-tile__quote">“{t(p.item.textKey)}”</span> : null}
        <span class="cos-tile__name">{t(p.item.nameKey)}</span>
        <span class="cos-tile__rarity" data-tag="">
          {t(rarityNameKey(rarity))}
        </span>
        {p.on ? (
          <span class="cos-tile__on" aria-hidden="true">
            <CheckIcon size={16} />
          </span>
        ) : null}
        {!have ? (
          <span class="cos-tile__lock" aria-hidden="true">
            <LockIcon size={18} />
          </span>
        ) : null}
      </button>
      {have ? (
        <span class={`cos-tile__state${p.on ? ' is-on' : ''}`} aria-hidden="true">
          {p.on ? (p.onLabel ?? t('cosmetic.ui.equipped')) : (p.pickLabel ?? t('cosmetic.ui.equip'))}
        </span>
      ) : null}
      {!have ? (
        <span class="cos-tile__how">
          <small>{t(hint.key, hint.params)}</small>
          {price !== null ? (
            <Button
              size="sm"
              kind="secondary"
              testid={`craft-${key}`}
              disabled={locked || save.value.currencies.dust < price}
              {...(locked ? { reason: t('cosmetic.ui.reason.locked') } : {})}
              onClick={() => act(services.craftCosmetic(key), t('cosmetic.ui.crafted'))}
            >
              <DustIcon size={16} /> {price}
            </Button>
          ) : null}
        </span>
      ) : null}
    </div>
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
  const { save, content, t } = useUi();
  const eq = { ...equippedOf(save.value, content), ...p.look };
  const skin = eq.baseSkins[p.age] ?? null;
  const reduce = save.value.settings.reduceMotion;
  const decorations = Array.from({ length: ANCHOR_COUNT }, (_, i) => eq.decorations[i] ?? null);
  return (
    <figure class={`cos-mock${reduce ? ' is-still' : ''}`} data-testid="base-mock" aria-label={t('cosmetic.ui.preview')}>
      <div class="cos-mock__sky" aria-hidden="true">
        <span class="cos-mock__cloud" />
        <span class="cos-mock__cloud cos-mock__cloud--b" />
      </div>
      <div class="cos-mock__ground" aria-hidden="true" />
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
            onClick={() => p.onAnchor?.(i)}
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
        <span class="cos-mock__cap" />
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
        <button type="button" class={`cos-tile cos-tile--plain${cur === null ? ' is-on' : ''}`} aria-pressed={cur === null} data-testid="base-default" onClick={() => equip(null)}>
          <span class="cos-tile__art">
            <BaseLook age={age} skin={null} />
          </span>
          <span class="cos-tile__name">{t('cosmetic.ui.defaultSkin')}</span>
          {cur === null ? (
            <span class="cos-tile__on" aria-hidden="true">
              <CheckIcon size={16} />
            </span>
          ) : null}
        </button>
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

export function FlagsPanel() {
  const { save, content, t, services } = useUi();
  const act = useAct();
  const eq = equippedOf(save.value, content);
  const age = useCurrentAge();
  const withUndo = useEquipWithUndo();
  const equip = (e: CosmeticEquipPatch) => act(services.equipCosmetic(e));
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase();
  const nations = ownedFirst(save.value, content, itemsOf(content, 'nationalFlag')).filter((x) => q === '' || t(x.nameKey).toLocaleLowerCase().includes(q));
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
        <Found collection="nationalFlag" />
      </div>
      <p class="cust-hint">{t('cosmetic.ui.nationalHint')}</p>
      <input
        class="cos-search"
        type="search"
        value={query}
        placeholder={t('cosmetic.ui.search')}
        aria-label={t('cosmetic.ui.search')}
        data-testid="national-search"
        onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
      />
      <div class="cos-grid cos-grid--flags">
        <button
          type="button"
          class={`cos-tile cos-tile--plain${eq.nationalFlag === null ? ' is-on' : ''}`}
          aria-pressed={eq.nationalFlag === null}
          data-testid="national-none"
          onClick={() => equip({ slot: 'nationalFlag', key: null })}
        >
          <span class="cos-tile__art cos-tile__art--none" aria-hidden="true" />
          <span class="cos-tile__name">{t('cosmetic.ui.noNational')}</span>
          {eq.nationalFlag === null ? (
            <span class="cos-tile__on" aria-hidden="true">
              <CheckIcon size={16} />
            </span>
          ) : null}
        </button>
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
        <button
          type="button"
          class={`cos-tile cos-tile--plain${cur === null ? ' is-on' : ''}`}
          aria-pressed={cur === null}
          data-testid="deco-none"
          onClick={() => act(services.equipCosmetic({ slot: 'decoration', anchor, key: null }))}
        >
          <span class="cos-tile__art cos-tile__art--none" aria-hidden="true" />
          <span class="cos-tile__name">{t('cosmetic.ui.emptySpot')}</span>
          {cur === null ? (
            <span class="cos-tile__on" aria-hidden="true">
              <CheckIcon size={16} />
            </span>
          ) : null}
        </button>
        {ownedFirst(save.value, content, itemsOf(content, 'decoration')).map((x) => (
          <ItemTile key={x.id} item={x} on={cur === itemKey(x)} onPick={() => withUndo({ slot: 'decoration', anchor, key: itemKey(x) }, { slot: 'decoration', anchor, key: cur }, t(x.nameKey))} />
        ))}
      </div>
    </MockLayout>
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
        <h3 class="cust-h">{t('cosmetic.ui.wheel')}</h3>
        <Found collection="emote" />
      </div>
      <p class="cust-hint">{t('cosmetic.ui.wheelHint', { n: eq.emotes.length, max })}</p>
      <h4 class="cos-sub">{t('cosmetic.ui.starters')}</h4>
      <div class="cos-grid cos-grid--emotes">
        {content.cosmetics.emotes.map((e) => {
          const on = eq.emotes.includes(e.id);
          return (
            <button key={e.id} type="button" class={`cos-tile cos-tile--plain cos-tile--emote${on ? ' is-on' : ''}`} aria-pressed={on} data-testid={`item-${e.id}`} onClick={() => toggle(e.id)}>
              <span class="cos-tile__art">
                <EmoteGlyph emote={e.id} size={40} />
              </span>
              <span class="cos-tile__name">{t(emoteNameKey(e.id))}</span>
              <span class={`cos-tile__state${on ? ' is-on' : ''}`} aria-hidden="true">
                {on ? t('cosmetic.ui.inWheel') : t('cosmetic.ui.add')}
              </span>
              {on ? (
                <span class="cos-tile__on" aria-hidden="true">
                  <CheckIcon size={16} />
                </span>
              ) : null}
            </button>
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

export function QuotesPanel() {
  const { save, content, t, services, toasts } = useUi();
  const act = useAct();
  const eq = equippedOf(save.value, content);
  const max = content.cosmetics.collections.wheel.quotes;
  const set = (keys: string[]) => act(services.equipCosmetic({ slot: 'quotes', keys }));
  const toggle = (k: string) => {
    if (eq.quotes.includes(k)) set(eq.quotes.filter((x) => x !== k));
    else if (eq.quotes.length >= max) toasts.show(t('cosmetic.ui.wheelFull'), { tone: 'bad' });
    else set([...eq.quotes, k]);
  };
  return (
    <MockLayout
      testid="cust-quotes"
      mock={
        <ol class="cos-quotes" data-testid="quote-wheel">
          {Array.from({ length: max }, (_, i) => eq.quotes[i] ?? null).map((k, i) =>
            k ? (
              <li key={k}>
                <button type="button" class="cos-quote" onClick={() => toggle(k)} aria-label={`${t('cosmetic.ui.remove')}: ${t(quoteTextKey(k.slice(6)))}`}>
                  “{t(quoteTextKey(k.slice(6)))}”
                </button>
              </li>
            ) : (
              <li key={`e${i}`} class="cos-quote is-empty" aria-hidden="true" />
            ),
          )}
        </ol>
      }
    >
      <div class="cos-head">
        <h3 class="cust-h">{t('cosmetic.ui.wheel')}</h3>
        <Found collection="quote" />
      </div>
      <p class="cust-hint">{t('cosmetic.ui.quoteHint', { n: eq.quotes.length, max })}</p>
      <div class="cos-grid cos-grid--quotes">
        {ownedFirst(save.value, content, itemsOf(content, 'quote')).map((x) => (
          <ItemTile key={x.id} item={x} wide on={eq.quotes.includes(itemKey(x))} onPick={() => toggle(itemKey(x))} onLabel={t('cosmetic.ui.inWheel')} pickLabel={t('cosmetic.ui.add')} />
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
      {(['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration'] as const).map((c) => (
        <Found key={c} collection={c} label />
      ))}
    </div>
  );
}
