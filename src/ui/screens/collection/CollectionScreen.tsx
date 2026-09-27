/**
 * Collection (A9 #10): a grid filterable by age, role and rarity, with an owned / missing toggle;
 * silhouettes for unowned cards; copies bars and foil frames per card; a Skins tab; crafting with
 * Dust from the card detail and the skin tiles (A6.6).
 */
import './collection.css';
import { ageNameKey, rarityNameKey, roleNameKey, skinNameKey } from '@/content/keys';
import type { AgeId, CardId, Rarity, Role, SkinDef } from '@/contracts';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardArt, CardTile } from '../../components/CardTile';
import { CurrencyChip, Pill } from '../../components/Chips';
import { Segmented } from '../../components/Controls';
import { formatInt } from '../../components/format';
import { AgeGlyph, BoltIcon, CardsIcon, CheckIcon, DustIcon, LockIcon, RARITY_COLOR, RarityGem, TowerIcon } from '../../components/icons';
import { onGridKeyDown } from '../../components/keys';
import { Empty, ScreenFrame } from '../../components/Layout';
import { Tabs } from '../../components/Tabs';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardDef, cardGlyph, cardTile, collectionProgress, isOwned } from '../model/cards';

type AgeFilter = 'all' | AgeId;
type RarityFilter = 'all' | Rarity;
type Ownership = 'all' | 'owned' | 'missing';
/** Role filter: a unit role, or all turrets, or all powers. */
type RoleFilter = 'all' | Role | 'turret' | 'power';

export interface CollectionFilter {
  age: AgeFilter;
  rarity: RarityFilter;
  role: RoleFilter;
  own: Ownership;
}

/** Cards matching the filter in display order: units, turrets, powers (DESIGN table order). */
export function filterCards(save: Parameters<typeof isOwned>[0], content: Parameters<typeof isOwned>[2], f: CollectionFilter): CardId[] {
  const ids = [...content.order.units, ...content.order.turrets, ...content.order.powers];
  return ids.filter((id) => {
    const def = cardDef(content, id);
    if (!def) return false;
    if (f.age !== 'all' && def.age !== f.age) return false;
    if (f.rarity !== 'all' && (def.kind === 'power' || def.rarity !== f.rarity)) return false;
    if (f.role !== 'all') {
      if (f.role === 'turret' || f.role === 'power') {
        if (def.kind !== f.role) return false;
      } else if (def.kind !== 'unit' || def.role !== f.role) return false;
    }
    const owned = isOwned(save, id, content);
    if (f.own === 'owned' && !owned) return false;
    if (f.own === 'missing' && owned) return false;
    return true;
  });
}

function SkinTile(p: { skin: SkinDef }) {
  const { save, content, t, locale, services, toasts } = useUi();
  const s = save.value;
  const k = p.skin;
  const owned = s.skins.owned.includes(k.id);
  const target = cardDef(content, k.target);
  const equipped = s.skins.equipped[k.target] === k.id;
  const price = k.craftable ? content.rarities.skins[k.rarity].craftDust : null;
  const baseAge = k.target.startsWith('base.') ? (k.target.slice(5) as AgeId) : null;
  return (
    <div class={`col-skin${owned ? '' : ' is-locked'}`} style={{ '--frame': RARITY_COLOR[k.rarity] }} data-testid={`skin-tile-${k.id}`}>
      <span class="col-skin__art">
        <CardArt card={k.target} age={target?.age ?? baseAge ?? 'stone'} glyph={target ? cardGlyph(target) : 'heavy'} size={96} skin={k.id} silhouette={!owned} />
        {!owned ? (
          <span class="col-skin__lock">
            <LockIcon size={26} />
          </span>
        ) : null}
      </span>
      <span class="col-skin__name">{t(skinNameKey(k.id))}</span>
      <span class="col-skin__target">{target ? t(target.nameKey) : baseAge ? t('ui.skins.baseOf', { age: t(ageNameKey(baseAge)) }) : k.target}</span>
      <span class="col-skin__rarity">{t(rarityNameKey(k.rarity))}</span>
      {owned ? (
        equipped ? (
          <span class="col-skin__on">
            <CheckIcon size={18} /> {t('ui.skins.equipped')}
          </span>
        ) : (
          <Button size="sm" variant="blue" onClick={() => services.equipSkin(k.target, k.id)} testid={`equip-${k.id}`}>
            {t('ui.skins.equip')}
          </Button>
        )
      ) : price !== null ? (
        <Button
          size="sm"
          variant="violet"
          icon={<DustIcon size={18} />}
          inert={s.currencies.dust < price}
          testid={`craft-${k.id}`}
          onClick={() => {
            const r = services.craft(k.id);
            toasts.show(r.ok ? t('ui.skins.crafted') : t('ui.error.notEnoughDust'), { tone: r.ok ? 'good' : 'bad' });
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

export function CollectionScreen(p: { route: RouteOf<'collection'> }) {
  const { save, content, t, router } = useUi();
  const s = save.value;
  const [tab, setTab] = useState<'cards' | 'skins'>(p.route.tab ?? 'cards');
  const [f, setF] = useState<CollectionFilter>({ age: 'all', rarity: 'all', role: 'all', own: 'all' });
  const prog = collectionProgress(s, content);
  const foils = Object.values(s.collection).filter((e) => e.foil !== 'none').length;
  const roles = [...new Set(content.order.units.map((id) => content.units[id]!.role))];
  const cards = filterCards(s, content, f);
  const skins = content.order.skins.map((id) => content.skins[id]!);
  const set = (patch: Partial<CollectionFilter>) => setF({ ...f, ...patch });

  return (
    <ScreenFrame
      id="collection"
      title={t('ui.nav.collection')}
      onBack={() => router.back()}
      subtitle={
        <span class="col-sub">
          <Pill tone="blue" icon={<CardsIcon size={16} />}>
            {t('ui.collection.progress', { n: prog.owned, max: prog.total })}
          </Pill>
          <Pill tone="violet">{t('ui.collection.foils', { n: foils })}</Pill>
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
          ]}
        />
        <div class="col-panel" role="tabpanel" id="col-panel" aria-labelledby={`col-tab-${tab}`}>
          {tab === 'cards' ? (
            <>
              <div class="col-filters" data-testid="filters">
                <Segmented<AgeFilter>
                  label={t('ui.collection.filterAge')}
                  value={f.age}
                  onChange={(age) => set({ age })}
                  size="sm"
                  testid="filter-age"
                  options={[
                    { value: 'all', label: t('ui.collection.all') },
                    ...content.order.ages.map((a) => ({ value: a, label: t(ageNameKey(a)), icon: <AgeGlyph age={a} size={20} /> })),
                  ]}
                />
                <Segmented<RarityFilter>
                  label={t('ui.collection.filterRarity')}
                  value={f.rarity}
                  onChange={(rarity) => set({ rarity })}
                  size="sm"
                  testid="filter-rarity"
                  options={[
                    { value: 'all', label: t('ui.collection.all') },
                    ...content.rarities.order.map((r) => ({ value: r, label: t(rarityNameKey(r)), icon: <RarityGem rarity={r} size={16} /> })),
                  ]}
                />
                <label class="col-select">
                  <span class="ui-sr">{t('ui.collection.filterRole')}</span>
                  <select value={f.role} onChange={(e) => set({ role: (e.currentTarget as HTMLSelectElement).value as RoleFilter })} data-testid="filter-role">
                    <option value="all">{t('ui.collection.allRoles')}</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {t(roleNameKey(r))}
                      </option>
                    ))}
                    <option value="turret">{t('ui.warplan.turrets')}</option>
                    <option value="power">{t('ui.warplan.powers')}</option>
                  </select>
                </label>
                <Segmented<Ownership>
                  label={t('ui.collection.filterOwned')}
                  value={f.own}
                  onChange={(own) => set({ own })}
                  size="sm"
                  testid="filter-owned"
                  options={[
                    { value: 'all', label: t('ui.collection.all') },
                    { value: 'owned', label: t('ui.collection.owned') },
                    { value: 'missing', label: t('ui.collection.missing') },
                  ]}
                />
              </div>
              {cards.length === 0 ? (
                <Empty>{t('ui.collection.none')}</Empty>
              ) : (
                <div class="ui-cardgrid col-grid" onKeyDown={onGridKeyDown} data-testid="col-grid">
                  {cards.map((id) => {
                    const tile = cardTile(s, content, id, t)!;
                    return (
                      <CardTile
                        key={id}
                        card={tile}
                        size="md"
                        showCopies
                        grid
                        testid={`card-${id}`}
                        onClick={() => router.go({ id: 'cardDetail', card: id })}
                        corner={tile.kind === 'turret' ? <span class="col-kind"><TowerIcon size={18} /></span> : tile.kind === 'power' ? <span class="col-kind"><BoltIcon size={18} /></span> : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div class="col-skins" data-testid="col-skins">
              {skins.map((k) => (
                <SkinTile key={k.id} skin={k} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreenFrame>
  );
}
