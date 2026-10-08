/**
 * Collection (A9 #10), now the Card Album (owner request 2026-09-30): the Cards tab is a long scroll
 * like a Pokedex, grouped by age with sticky age headers and completion bars, every card numbered,
 * owned in colour and missing as a "?" silhouette with its source (`CardDex`); a Skins tab; the Feats
 * tab; crafting with Dust from the card detail and the skin tiles (A6.6).
 */
import './collection.css';
import { ageNameKey, rarityNameKey, skinNameKey } from '@/content/keys';
import type { AgeId, SkinDef } from '@/contracts';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardArt } from '../../components/CardTile';
import { CurrencyChip, Pill } from '../../components/Chips';
import { formatInt } from '../../components/format';
import { CardsIcon, CheckIcon, DustIcon, LockIcon, RARITY_COLOR, StarIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { Tabs } from '../../components/Tabs';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { FeatMedal } from './FeatMedal';
import { CompletionStrip } from '../customize/CollectionPanels';
import { cardDef, cardGlyph } from '../model/cards';
import { featViews } from '../model/collection';
import { CardDex } from './CardDex';
import { reasonKey } from '../model/reasons';

/**
 * One skin (Customize › Troops and Bases, the album's Skins tab). Owner request 2026-10-07: no Equip
 * button; an owned tile is the button and equips on tap (stamp, the tile pops, a toast with Undo, U10),
 * and only the equipped skin says "Equipped" (with the check). A locked skin shows its Dust price, or
 * "Crate only" when it cannot be crafted.
 */
export function SkinTile(p: { skin: SkinDef }) {
  const { save, content, t, locale, services, toasts, sound } = useUi();
  const s = save.value;
  const k = p.skin;
  const owned = s.skins.owned.includes(k.id);
  const target = cardDef(content, k.target);
  const equipped = s.skins.equipped[k.target] === k.id;
  const price = k.craftable ? content.rarities.skins[k.rarity].craftDust : null;
  const baseAge = k.target.startsWith('base.') ? (k.target.slice(5) as AgeId) : null;
  const name = t(skinNameKey(k.id));
  const equip = () => {
    if (!owned || equipped) return;
    const before = s.skins.equipped[k.target] ?? null;
    services.equipSkin(k.target, k.id);
    sound?.('ui_stamp');
    toasts.show(t('cosmetic.ui.equippedName', { name }), { tone: 'good', undo: () => services.equipSkin(k.target, before) });
  };
  const face = (
    <>
      <span class="col-skin__art">
        <CardArt
          card={k.target}
          age={target?.age ?? baseAge ?? 'stone'}
          glyph={target ? cardGlyph(target) : 'heavy'}
          size={96}
          skin={k.id}
          silhouette={!owned}
        />
        {!owned ? (
          <span class="col-skin__lock">
            <LockIcon size={26} />
          </span>
        ) : equipped ? (
          <span class="col-skin__check" aria-hidden="true">
            <CheckIcon size={16} />
          </span>
        ) : null}
      </span>
      <span class="col-skin__name">{name}</span>
      <span class="col-skin__target">
        {target ? t(target.nameKey) : baseAge ? t('ui.skins.baseOf', { age: t(ageNameKey(baseAge)) }) : k.target}
      </span>
      <span class="col-skin__rarity" data-tag="">
        {t(rarityNameKey(k.rarity))}
      </span>
    </>
  );
  return (
    <div class={`col-skin${owned ? ' is-owned' : ' is-locked'}${equipped ? ' is-on' : ''}`} style={{ '--frame': RARITY_COLOR[k.rarity] }} data-testid={`skin-tile-${k.id}`}>
      {owned ? (
        <button
          type="button"
          class="col-skin__hit"
          aria-pressed={equipped}
          aria-label={`${name}. ${equipped ? t('ui.skins.equipped') : t('ui.skins.equip')}`}
          data-testid={`equip-${k.id}`}
          onClick={equip}
        >
          {face}
        </button>
      ) : (
        face
      )}
      {owned ? (
        equipped ? (
          <span class="col-skin__on" data-testid={`skin-on-${k.id}`}>
            {t('ui.skins.equipped')}
          </span>
        ) : null
      ) : price !== null ? (
        <Button
          size="sm"
          kind="secondary"
          icon={<DustIcon size={18} />}
          inert={s.currencies.dust < price}
          testid={`craft-${k.id}`}
          onClick={() => {
            const r = services.craft(k.id);
            toasts.show(r.ok ? t('ui.skins.crafted') : t(reasonKey(r.reason)), { tone: r.ok ? 'good' : 'bad' });
          }}
        >
          {formatInt(price, locale)}
        </Button>
      ) : (
        <span class="col-skin__crate">{t('ui.skins.notCraftable')}</span>
      )}
    </div>
  );
}

/**
 * The Feats tab (A15.10): 12 hidden feats, each "???" and a riddle until found; "Show hint" reveals
 * the plain rule (stored in `flags['featHint.<id>']`). Found feats show their name and reward.
 */
function FeatsPanel() {
  const { save, content, t, services } = useUi();
  const s = save.value;
  const views = featViews(s, content);
  const found = views.filter((v) => v.found).length;
  return (
    <div class="col-feats-wrap">
      <p class="col-feats__count" data-testid="feats-count">
        {t('ui.feats.found', { n: found, max: views.length })}
      </p>
      <ul class="col-feats" data-testid="col-feats">
        {views.map((v) => (
          <li key={v.id} class={`col-feat${v.found ? ' is-found' : ''}`} data-testid={`feat-${v.id}`}>
            <span class="col-feat__badge" aria-hidden="true">
              <FeatMedal id={v.id} found={v.found} />
            </span>
            <span class="col-feat__text">
              <b class="col-feat__name">{v.found ? t(v.nameKey) : t('ui.feats.unknown')}</b>
              <span class="col-feat__riddle">{t(v.riddleKey)}</span>
              {v.found || v.hinted ? <span class="col-feat__hint">{t(v.hintKey)}</span> : null}
              {/* The reward and the hint button share the last row, so the riddle never runs under it. */}
              <span class="col-feat__foot">
                <span class="col-feat__reward">
                  <DustIcon size={16} /> {v.dust}
                  {v.title ? <span class="col-feat__title">{t('ui.feats.plusTitle')}</span> : null}
                </span>
                {!v.found && !v.hinted ? (
                  <Button kind="secondary" size="sm" testid={`feat-hint-${v.id}`} onClick={() => services.showFeatHint(v.id)}>
                    {t('ui.feats.showHint')}
                  </Button>
                ) : null}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CollectionScreen(p: { route: RouteOf<'collection'> }) {
  const { save, content, t, router } = useUi();
  const s = save.value;
  const [tab, setTab] = useState<'cards' | 'skins' | 'feats'>(p.route.tab ?? 'cards');
  const foils = Object.values(s.collection).filter((e) => e.foil !== 'none').length;
  const skins = content.order.skins.map((id) => content.skins[id]!);

  return (
    <ScreenFrame
      id="collection"
      title={t('ui.dex.title')}
      onBack={() => router.back()}
      subtitle={
        <span class="col-sub">
          <Pill tone="violet">{foils === 1 ? t('ui.collection.foilsOne') : t('ui.collection.foils', { n: foils })}</Pill>
        </span>
      }
      right={<CurrencyChip kind="dust" value={s.currencies.dust} compact testid="chip-dust" />}
    >
      <div class="col">
        <Tabs
          label={t('ui.nav.collection')}
          value={tab}
          onChange={setTab}
          variant="folder"
          idPrefix="col"
          items={[
            { value: 'cards', label: t('ui.collection.cards'), icon: <CardsIcon size={22} />, testid: 'tab-cards' },
            { value: 'skins', label: t('ui.collection.skins'), testid: 'tab-skins' },
            { value: 'feats', label: t('ui.feats.tab'), icon: <StarIcon size={20} />, testid: 'tab-feats' },
          ]}
        />
        <div class="col-panel" role="tabpanel" id="col-panel" aria-labelledby={`col-tab-${tab}`}>
          {tab === 'cards' ? (
            <CardDex age={p.route.age} own={p.route.own} />
          ) : tab === 'skins' ? (
            <>
              {/* A18.9.4: completion of every cosmetic collection; Customize equips them */}
              <div class="col-cosmetics">
                <CompletionStrip />
                <Button size="sm" kind="secondary" testid="open-customize" onClick={() => router.go({ id: 'customize', tab: 'flags' })}>
                  {t('ui.nav.customize')}
                </Button>
              </div>
              <div class="col-skins" data-testid="col-skins">
                {skins.map((k) => (
                  <SkinTile key={k.id} skin={k} />
                ))}
              </div>
            </>
          ) : (
            <FeatsPanel />
          )}
        </div>
      </div>
    </ScreenFrame>
  );
}
