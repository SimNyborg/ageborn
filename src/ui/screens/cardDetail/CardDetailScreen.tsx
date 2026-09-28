/**
 * Card detail (A9 #11): the card idling on a lit stage; full stats with the next-level preview
 * (+5% per level, A6.6); hits, tags, damage mods; Strong vs / Weak vs (B4 counter matrix); the
 * description with its abilities; Upgrade (copies + Amber) or Craft (Dust, unlocks an unowned card);
 * the skin carousel and the foil frames owned. The upgrade is a reward moment: hammer slam and
 * level pop (A6.6).
 */
import './cardDetail.css';
import { ageNameKey, foilNameKey, rarityNameKey, roleNameKey, tagNameKey } from '@/content/keys';
import type { CardId, Foil } from '@/contracts';
import { useEffect, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardArt, CardTile, type CardTileData } from '../../components/CardTile';
import { CurrencyChip, Pill } from '../../components/Chips';
import { formatDec, formatInt, formatSeconds } from '../../components/format';
import { AgeGlyph, AmberIcon, CheckIcon, DustIcon, HammerIcon, LockIcon, RARITY_COLOR, RoadIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { CopiesBar } from '../../components/Meters';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import {
  cardDef,
  cardGlyph,
  cardRarity,
  cardTile,
  hitsOf,
  isOwned,
  modsOf,
  turretStats,
  unitStats,
  upgradeState,
  type StatRow,
} from '../model/cards';
import { reasonKey } from '../model/reasons';
import { SkinOptions } from '../shared/SkinPicker';

const STAT_KEYS: Record<StatRow['id'], string> = {
  hp: 'ui.stat.hp',
  damage: 'ui.stat.damage',
  baseDamage: 'ui.stat.baseDamage',
  interval: 'ui.stat.interval',
  dps: 'ui.stat.dps',
  range: 'ui.stat.range',
  speed: 'ui.stat.speed',
  pop: 'ui.stat.pop',
  train: 'ui.stat.train',
  cost: 'ui.stat.cost',
  splash: 'ui.stat.splash',
};

const SIZE_KEYS: Record<'small' | 'medium' | 'large' | 'huge', string> = {
  small: 'ui.card.size.small',
  medium: 'ui.card.size.medium',
  large: 'ui.card.size.large',
  huge: 'ui.card.size.huge',
};

/** Melee reach is at most this many lu (A2.7: melee range 16-24 lu). */
const MELEE_MAX_LU = 30;

const FOILS: Exclude<Foil, 'none'>[] = ['bronze', 'silver', 'holo'];

export function CardDetailScreen(p: { route: RouteOf<'cardDetail'> }) {
  const { save, content, t, locale, router, services, toasts } = useUi();
  const s = save.value;
  const id: CardId = p.route.card;
  const def = cardDef(content, id);
  const [slam, setSlam] = useState(0);
  useEffect(() => {
    if (!slam) return;
    const tm = setTimeout(() => setSlam(0), 900);
    return () => clearTimeout(tm);
  }, [slam]);
  // Looking at a card clears its NEW badge.
  const isNew = s.collection[id]?.isNew === true;
  useEffect(() => {
    if (isNew) services.markSeen(id);
  }, [id, isNew]);
  if (!def) {
    return (
      <ScreenFrame id="cardDetail" title={t('ui.nav.collection')} onBack={() => router.back()}>
        <p>{t('ui.error.generic')}</p>
      </ScreenFrame>
    );
  }
  const tile = cardTile(s, content, id, t)!;
  const owned = isOwned(s, id, content);
  const rarity = cardRarity(def);
  const up = upgradeState(s, content, id);
  const level = tile.level;
  const rows = def.kind === 'unit' ? unitStats(content, def, level) : def.kind === 'turret' ? turretStats(content, def, level) : [];
  const hits = hitsOf(def);
  const mods = modsOf(def);
  const foilRank = content.rarities.foils[tile.foil].rank;
  const craftPrice = rarity ? content.rarities.cards[rarity].craftCopyDust : null;
  const roadNode =
    def.kind === 'power' ? content.trophyRoad.nodes.find((n) => n.rewards.some((r) => r.kind === 'power' && r.card === id)) : undefined;

  function valueText(r: StatRow, v: number | string): string {
    if (typeof v === 'string') return v;
    if (r.id === 'range' && v <= MELEE_MAX_LU) return t('ui.stat.melee');
    if (r.unit === 'ms') return t('ui.unit.seconds', { n: formatSeconds(v, locale) });
    if (r.unit === 'lu') return t('ui.unit.lu', { n: formatInt(v, locale) });
    if (r.unit === 'lus') return t('ui.unit.lus', { n: formatInt(v, locale) });
    return formatInt(v, locale);
  }

  function doUpgrade() {
    const r = services.upgrade(id);
    if (r.ok) {
      setSlam((n) => n + 1);
      toasts.show(t('ui.card.upgraded', { n: level + 1 }), { tone: 'gold', icon: <HammerIcon size={22} /> });
    } else {
      toasts.show(t(reasonKey(r.reason)), { tone: 'bad' });
    }
  }

  function doCraft() {
    const r = services.craft(id);
    toasts.show(r.ok ? t('ui.card.crafted') : t(reasonKey(r.reason)), { tone: r.ok ? 'good' : 'bad' });
  }

  /** Counter cards are shown as plain references: no NEW stamp or upgrade arrow of the player's own copy. */
  const counterTile = (ct: CardTileData): CardTileData => ({ ...ct, owned: true, isNew: false, upgradeReady: false });
  const frame = rarity ? RARITY_COLOR[rarity] : '#f2c14e';
  return (
    <ScreenFrame
      id="cardDetail"
      title={tile.name}
      onBack={() => router.back()}
      subtitle={rarity ? <Pill tone="neutral">{t(rarityNameKey(rarity))}</Pill> : <Pill tone="gold">{t('ui.card.power')}</Pill>}
      right={
        <>
          <CurrencyChip kind="amber" value={s.currencies.amber} compact />
          <CurrencyChip kind="dust" value={s.currencies.dust} compact />
        </>
      }
    >
      <div class="cd" style={{ '--frame': frame }}>
        <div class="cd-left">
          <div class={`cd-stage${slam ? ' is-slam' : ''}`} data-testid="card-stage" key={slam}>
            <i class="cd-stage__spot" aria-hidden="true" />
            <div class="cd-stage__card">
              <span class="cd-stage__frame">
                <CardArt card={id} age={def.age} glyph={cardGlyph(def)} size={200} foil={tile.foil} skin={tile.skin} silhouette={!owned} />
              </span>
              {owned && def.kind !== 'power' ? (
                <span class="cd-stage__level" data-testid="card-level">
                  {t('ui.card.level', { n: level })}
                </span>
              ) : null}
              {!owned ? (
                <span class="cd-stage__lock">
                  <LockIcon size={44} />
                </span>
              ) : null}
            </div>
            {slam ? (
              <span class="cd-stage__hammer" aria-hidden="true">
                <HammerIcon size={90} />
              </span>
            ) : null}
            <i class="cd-stage__floor" aria-hidden="true" />
          </div>
          <div class="cd-chips">
            <Pill icon={<AgeGlyph age={def.age} size={18} />}>{t(ageNameKey(def.age))}</Pill>
            {def.kind === 'unit' ? <Pill tone="blue">{t(roleNameKey(def.role))}</Pill> : null}
            {def.kind === 'turret' ? <Pill tone="blue">{t('ui.warplan.slot.turret')}</Pill> : null}
            {def.kind === 'power' ? <Pill tone="gold">{t('ui.warplan.slot.power')}</Pill> : null}
          </div>
          {def.kind !== 'power' ? (
            <div class="cd-foils" data-testid="card-foils">
              <span class="cd-label">{t('ui.card.foils')}</span>
              {FOILS.map((f) => {
                const has = owned && foilRank > 0 && content.rarities.foils[f].rank <= foilRank;
                return (
                  <span key={f} class={`cd-foil cd-foil--${f}${has ? ' is-on' : ''}`} title={t(foilNameKey(f))}>
                    {has ? <CheckIcon size={14} /> : null}
                    {t(foilNameKey(f))}
                  </span>
                );
              })}
            </div>
          ) : null}
          <p class="cd-desc">{t(def.descKey)}</p>
        </div>

        <div class="cd-right">
          {rows.length > 0 ? (
            <table class="cd-stats" data-testid="card-stats">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-testid={`stat-${r.id}`}>
                    <th scope="row">{t(STAT_KEYS[r.id])}</th>
                    <td class="ui-num">{valueText(r, r.value)}</td>
                    <td class="cd-next ui-num">
                      {owned && r.next !== null && typeof r.value === 'number' && r.next !== r.value
                        ? t('ui.card.nextDelta', { n: formatInt(r.next - r.value, locale) })
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {hits || mods.length > 0 || def.kind === 'unit' ? (
            <div class="cd-tags">
              {hits ? (
                <>
                  <Pill tone={hits.ground ? 'green' : 'neutral'}>{hits.ground ? t('ui.card.hitsGround') : t('ui.card.noGround')}</Pill>
                  <Pill tone={hits.air ? 'green' : 'neutral'}>{hits.air ? t('ui.card.hitsAir') : t('ui.card.noAir')}</Pill>
                </>
              ) : null}
              {def.kind === 'unit' ? <Pill>{t(SIZE_KEYS[def.size])}</Pill> : null}
              {def.kind === 'unit'
                ? def.tags
                    .filter((tag) => tag !== 'ground' && tag !== 'melee' && tag !== 'ranged')
                    .map((tag) => (
                      <Pill key={tag} tone="violet">
                        {t(tagNameKey(tag))}
                      </Pill>
                    ))
                : null}
              {mods.map((m) => (
                <Pill key={m.vs} tone={m.bp >= 10000 ? 'gold' : 'red'}>
                  {t('ui.card.mod', { x: formatDec(m.bp / 10000, m.bp % 1000 === 0 ? 1 : 2, locale), tag: t(tagNameKey(m.vs)) })}
                </Pill>
              ))}
            </div>
          ) : null}
          {def.kind === 'unit' && (def.strongVs.length > 0 || def.weakVs.length > 0) ? (
            <div class="cd-counters">
              <div class="cd-counter" data-testid="strong-vs">
                <span class="cd-label cd-label--good">{t('ui.card.strongVs')}</span>
                <div class="cd-counter__cards">
                  {def.strongVs.map((c) => {
                    const ct = cardTile(s, content, c, t);
                    return ct ? (
                      <CardTile
                        key={c}
                        card={counterTile(ct)}
                        size="xs"
                        hideLevel
                        onClick={() => router.replace({ id: 'cardDetail', card: c })}
                        label={ct.name}
                      />
                    ) : null;
                  })}
                </div>
              </div>
              <div class="cd-counter" data-testid="weak-vs">
                <span class="cd-label cd-label--bad">{t('ui.card.weakVs')}</span>
                <div class="cd-counter__cards">
                  {def.weakVs.map((c) => {
                    const ct = cardTile(s, content, c, t);
                    return ct ? (
                      <CardTile
                        key={c}
                        card={counterTile(ct)}
                        size="xs"
                        hideLevel
                        onClick={() => router.replace({ id: 'cardDetail', card: c })}
                        label={ct.name}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div class="cd-upgrade" data-testid="card-upgrade">
            {def.kind === 'power' ? (
              owned ? (
                <p class="cd-owned">
                  <CheckIcon size={20} /> {t('ui.card.powerOwned')}
                </p>
              ) : (
                <p class="cd-owned">
                  <RoadIcon size={22} />{' '}
                  {roadNode ? t('ui.card.powerFromRoad', { n: formatInt(roadNode.trophies, locale) }) : t('ui.card.notOwned')}
                </p>
              )
            ) : !owned ? (
              <>
                <p class="cd-owned">{t('ui.card.craftUnlock')}</p>
                <Button
                  variant="violet"
                  size="lg"
                  icon={<DustIcon size={24} />}
                  inert={craftPrice === null || s.currencies.dust < craftPrice}
                  testid="card-craft"
                  onClick={doCraft}
                >
                  {t('ui.card.craft', { n: formatInt(craftPrice ?? 0, locale) })}
                </Button>
              </>
            ) : up?.maxed ? (
              <p class="cd-max" data-testid="card-max">
                {t('ui.card.maxLevel')}
              </p>
            ) : up ? (
              <>
                <div class="cd-upgrade__bar">
                  <CopiesBar copies={up.copies} needed={up.cost?.copies ?? null} ready={up.copiesReady} />
                </div>
                <Button
                  variant={up.affordable ? 'green' : 'plain'}
                  size="lg"
                  inert={!up.affordable}
                  testid="card-upgrade-btn"
                  icon={<AmberIcon size={24} />}
                  onClick={doUpgrade}
                  label={t('ui.card.upgradeFor', { n: formatInt(up.cost?.amber ?? 0, locale) })}
                >
                  {t('ui.card.upgradeFor', { n: formatInt(up.cost?.amber ?? 0, locale) })}
                </Button>
                {!up.copiesReady ? (
                  <p class="cd-need">{t('ui.card.needCopies', { n: formatInt((up.cost?.copies ?? 0) - up.copies, locale) })}</p>
                ) : null}
                {up.copiesReady && !up.affordable ? <p class="cd-need">{t('ui.error.notEnoughAmber')}</p> : null}
                {owned && craftPrice !== null ? (
                  <Button
                    variant="violet"
                    size="sm"
                    icon={<DustIcon size={18} />}
                    inert={s.currencies.dust < craftPrice}
                    testid="card-craft"
                    onClick={doCraft}
                  >
                    {t('ui.card.craftCopy', { n: formatInt(craftPrice, locale) })}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>

          {def.kind !== 'power' && content.order.skins.some((k) => content.skins[k]!.target === id) ? (
            <div class="cd-skins">
              <span class="cd-label">{t('ui.card.skins')}</span>
              <SkinOptions card={id} compact />
            </div>
          ) : null}
        </div>
      </div>
    </ScreenFrame>
  );
}
