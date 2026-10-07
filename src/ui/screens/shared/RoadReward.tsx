/**
 * One Trophy Road reward (A6.3): Amber, Dust, an alternate Age Power, a road capsule, a Wardrobe
 * Crate or an arena gate. Used by the Trophy Road nodes and, compact, by the Home road bar ("Trophy
 * Road bar with the next reward", A9 #2).
 */
import './shared.css';
import { capsuleTierNameKey } from '@/content/keys';
import type { RoadReward } from '@/content/types';
import { CardArt } from '../../components/CardTile';
import { tierCrests } from '../../components/capsuleLook';
import { formatInt } from '../../components/format';
import { AGE_COLOR, AmberIcon, CapsuleIcon, CastleIcon, CrateIcon, DustIcon } from '../../components/icons';
import { useUi } from '../context';
import { cardDef, cardGlyph } from '../model/cards';

export function RoadRewardView(p: { r: RoadReward; compact?: boolean }) {
  const { t, locale, content } = useUi();
  const r = p.r;
  const k = p.compact ? 0.7 : 1;
  const px = (n: number) => Math.round(n * k);
  const cls = `road-rw${p.compact ? ' road-rw--compact' : ''}`;
  switch (r.kind) {
    case 'amber':
      return (
        <span class={cls}>
          <AmberIcon size={px(30)} />
          <b>{formatInt(r.amount, locale)}</b>
        </span>
      );
    case 'dust':
      return (
        <span class={cls}>
          <DustIcon size={px(30)} />
          <b>{formatInt(r.amount, locale)}</b>
        </span>
      );
    case 'power': {
      const def = cardDef(content, r.card);
      return (
        <span class={`${cls} road-rw--power`}>
          <span class="road-rw__art road-rw__medal" style={def ? { '--medal': AGE_COLOR[def.age].main, '--medal-hi': AGE_COLOR[def.age].light } : undefined}>
            {def ? <CardArt card={r.card} age={def.age} glyph={cardGlyph(def)} size={px(44)} plate={false} /> : null}
          </span>
          {def ? <b>{t(def.nameKey)}</b> : null}
        </span>
      );
    }
    case 'capsule':
      return (
        <span class={cls}>
          <CapsuleIcon tier={r.tier} crests={tierCrests(content.capsules, r.tier)} size={px(36)} />
          <b>{t(capsuleTierNameKey(r.tier))}</b>
        </span>
      );
    case 'wardrobe':
      return (
        <span class={cls}>
          <CrateIcon size={px(36)} />
          <b>{t('ui.reward.wardrobe')}</b>
        </span>
      );
    case 'gate':
      return (
        <span class={cls}>
          <CastleIcon size={px(30)} />
          <b>{t('ui.road.gateN', { n: r.arena })}</b>
        </span>
      );
  }
}
