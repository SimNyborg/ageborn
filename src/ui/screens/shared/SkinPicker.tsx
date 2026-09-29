/**
 * Skin picker for one card or base (A9 #9 "skin picker per card", A9 #11 skin carousel, A5.8):
 * the default look plus every skin for the target. Owned skins equip; unowned ones show their rarity
 * and, when craftable, the Dust price (A6.6). Crate-only skins (Crystal Spire) say so.
 */
import './shared.css';
import { rarityNameKey, skinLookKey, skinNameKey } from '@/content/keys';
import type { CardId, SkinId } from '@/contracts';
import { Button } from '../../components/Button';
import { CardArt } from '../../components/CardTile';
import { formatInt } from '../../components/format';
import { CheckIcon, DustIcon, LockIcon, RARITY_COLOR } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { useUi } from '../context';
import { cardDef, cardGlyph, skinsFor } from '../model/cards';
import { reasonKey } from '../model/reasons';

export function SkinOptions(p: { card: CardId; compact?: boolean }) {
  const { save, content, t, locale, services, toasts } = useUi();
  const s = save.value;
  const def = cardDef(content, p.card);
  if (!def) return null;
  const skins = skinsFor(content, p.card);
  const equipped = s.skins.equipped[p.card] ?? null;
  const options: { id: SkinId | null }[] = [{ id: null }, ...skins.map((k) => ({ id: k.id }))];
  return (
    <ul class={`skins${p.compact ? ' skins--compact' : ''}`} data-testid="skin-options">
      {options.map(({ id }) => {
        const skin = id ? content.skins[id]! : null;
        const owned = id === null || s.skins.owned.includes(id);
        const on = equipped === id;
        const price = skin && skin.craftable ? content.rarities.skins[skin.rarity].craftDust : null;
        return (
          <li
            key={id ?? 'default'}
            class={`skins__item${on ? ' is-on' : ''}${owned ? '' : ' is-locked'}`}
            style={{ '--frame': skin ? RARITY_COLOR[skin.rarity] : '#8a86ab' }}
            data-testid={`skin-${id ?? 'default'}`}
          >
            <span class="skins__art">
              <CardArt card={p.card} age={def.age} glyph={cardGlyph(def)} size={p.compact ? 72 : 96} skin={id} silhouette={!owned} />
              {!owned ? (
                <span class="skins__lock">
                  <LockIcon size={24} />
                </span>
              ) : null}
            </span>
            <span class="skins__name">{id ? t(skinNameKey(id)) : t('ui.skins.default')}</span>
            {skin ? (
              <span class="skins__rarity" data-tag="">
                {t(rarityNameKey(skin.rarity))}
              </span>
            ) : null}
            {skin && !p.compact ? <span class="skins__look">{t(skinLookKey(skin.id))}</span> : null}
            {on ? (
              <span class="skins__equipped">
                <CheckIcon size={18} /> {t('ui.skins.equipped')}
              </span>
            ) : owned ? (
              <Button size="sm" kind="progress" testid={`equip-${id ?? 'default'}`} onClick={() => services.equipSkin(p.card, id)}>
                {t('ui.skins.equip')}
              </Button>
            ) : price !== null ? (
              <Button
                size="sm"
                kind="secondary"
                icon={<DustIcon size={18} />}
                testid={`craft-${id}`}
                inert={s.currencies.dust < price}
                onClick={() => {
                  const r = services.craft(id!);
                  toasts.show(r.ok ? t('ui.skins.crafted') : t(reasonKey(r.reason)), { tone: r.ok ? 'good' : 'bad' });
                }}
              >
                {formatInt(price, locale)}
              </Button>
            ) : (
              <span class="skins__crateOnly">{t('ui.skins.notCraftable')}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SkinPicker(p: { card: CardId; onClose: () => void }) {
  const { content, t } = useUi();
  const def = cardDef(content, p.card);
  return (
    <Modal title={t('ui.skins.title', { name: def ? t(def.nameKey) : p.card })} onClose={p.onClose} size="lg" testid="skin-picker">
      <SkinOptions card={p.card} />
    </Modal>
  );
}
