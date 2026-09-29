/**
 * Card detail (A9 #11, ui-plan 4.4): the card idling on a lit stage; full stats with the next-level
 * preview (+5% per level, A6.6); hits, tags, damage mods; Strong vs / Weak vs (B4 counter matrix);
 * the description with its abilities; the skin carousel and the foil frames owned.
 *
 * UI-1 (fixes UA-03, UA-08): Upgrade lives in the fixed action bar, bottom-right, so it is visible
 * without scrolling at 844 x 340. It takes two taps (U10): the first turns it into "Confirm · price"
 * in place (MR-38b: the card lifts and charges, the green deltas brighten; a tap elsewhere cancels),
 * the second spends and plays the level-up ceremony on the card (MR-39: Amber flies in, the card
 * trembles, a burst and a shine, the level flips, the stat rows tick with green chips). Disabled,
 * the button keeps its place and says what is missing. Craft works the same way.
 */
import './cardDetail.css';
import { ageNameKey, foilNameKey, rarityNameKey, tagNameKey } from '@/content/keys';
import type { CardId, Foil } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { useConfirmSpend } from '../../components/confirm';
import { haptic } from '../../components/haptics';
import { fly, reducedMotion } from '../../components/motion';
import { CardArt, CardTile, type CardTileData } from '../../components/CardTile';
import { ClassChip, ClassIcon, CounterRows } from '../../components/ClassIcon';
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
  const kit = useUi();
  // MR-39 ceremony: 'charge' (300 ms: Amber flies in, the card trembles), then 'impact' (burst, the
  // level flips, the stat rows tick with green chips), then done. A tap on the stage skips it.
  const [cer, setCer] = useState<{ n: number; from: number; phase: 'charge' | 'impact' } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLSpanElement>(null);
  const craftRef = useRef<HTMLSpanElement>(null);
  const upgrade = useConfirmSpend({ onArm: () => kit.sound?.('ui_toggle') });
  const craft = useConfirmSpend({ onArm: () => kit.sound?.('ui_toggle') });
  const craftCopy = useConfirmSpend({ onArm: () => kit.sound?.('ui_toggle') });
  useEffect(() => {
    if (!cer) return;
    const reduced = reducedMotion(stageRef.current);
    const tm =
      cer.phase === 'charge'
        ? setTimeout(() => {
            setCer((c) => (c && c.n === cer.n ? { ...c, phase: 'impact' } : c));
            haptic('heavy');
            kit.sound?.('upgrade_slam');
          }, reduced ? 0 : 300)
        : setTimeout(() => setCer((c) => (c && c.n === cer.n ? null : c)), reduced ? 600 : 1170);
    return () => clearTimeout(tm);
  }, [cer?.n, cer?.phase]);
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
  const prevRows = cer && def.kind !== 'power' ? (def.kind === 'unit' ? unitStats(content, def, cer.from) : turretStats(content, def, cer.from)) : null;
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

  function doUpgrade(): boolean {
    const r = services.upgrade(id);
    if (r.ok) {
      setCer((c) => ({ n: (c?.n ?? 0) + 1, from: level, phase: 'charge' }));
      kit.sound?.('level_up');
      // Amber tokens fly from the Amber chip into the card (a reverse MR-21).
      const chip = typeof document !== 'undefined' ? document.querySelector('[data-testid="cd-amber"]') : null;
      const card = stageRef.current?.querySelector('.cd-stage__card');
      if (chip && card) fly(chip, card, { count: 5 });
      return true;
    }
    toasts.show(t(reasonKey(r.reason)), { tone: 'bad', anchor: upRef.current });
    return false;
  }

  function doCraft(anchor: HTMLElement | null): boolean {
    const r = services.craft(id);
    toasts.show(r.ok ? t('ui.card.crafted') : t(reasonKey(r.reason)), { tone: r.ok ? 'good' : 'bad', anchor });
    return r.ok;
  }

  /** Counter cards are shown as plain references: no NEW stamp or upgrade arrow of the player's own copy. */
  const counterTile = (ct: CardTileData): CardTileData => ({ ...ct, owned: true, isNew: false, upgradeReady: false });
  const frame = rarity ? RARITY_COLOR[rarity] : '#f2c14e';
  const amber = s.currencies.amber;
  const price = up?.cost?.amber ?? 0;
  const upReason = up && !up.affordable ? (!up.copiesReady ? t('ui.card.needMoreCopies', { n: formatInt((up.cost?.copies ?? 0) - up.copies, locale) }) : t('ui.card.needAmber', { n: formatInt(Math.max(0, price - amber), locale) })) : undefined;
  const craftReason = craftPrice !== null && s.currencies.dust < craftPrice ? t('ui.card.needDust', { n: formatInt(craftPrice - s.currencies.dust, locale) }) : undefined;

  let primary: preact.ComponentChildren = null;
  let secondary: preact.ComponentChildren = null;
  let tertiary: preact.ComponentChildren = null;
  if (def.kind === 'power') {
    tertiary = owned ? (
      <p class="cd-owned">
        <CheckIcon size={20} /> {t('ui.card.powerOwned')}
      </p>
    ) : (
      <p class="cd-owned">
        <RoadIcon size={22} /> {roadNode ? t('ui.card.powerFromRoad', { n: formatInt(roadNode.trophies, locale) }) : t('ui.card.notOwned')}
      </p>
    );
  } else if (!owned) {
    tertiary = <p class="cd-owned">{t('ui.card.craftUnlock')}</p>;
    primary = (
      <span ref={craftRef} class="cd-action">
        <Button
          kind="progress"
          size="l"
          primary
          icon={<DustIcon size={24} />}
          disabled={craftPrice === null || s.currencies.dust < craftPrice}
          reason={craftReason ?? t('ui.error.notEnoughDust')}
          testid="card-craft"
          class={craft.armed ? 'is-armed' : ''}
          onClick={() => craft.press(() => doCraft(craftRef.current))}
        >
          {craft.armed ? t('ui.card.confirmAction', { n: formatInt(craftPrice ?? 0, locale) }) : t('ui.card.craftAction', { n: formatInt(craftPrice ?? 0, locale) })}
        </Button>
      </span>
    );
    craft.ref.current = craftRef.current;
  } else if (up?.maxed) {
    tertiary = (
      <p class="cd-max" data-testid="card-max">
        {t('ui.card.maxLevel')}
      </p>
    );
  } else if (up) {
    upgrade.ref.current = upRef.current;
    craftCopy.ref.current = craftRef.current;
    primary = (
      <span ref={upRef} class="cd-action">
        <Button
          kind="progress"
          size="l"
          primary
          pulse={up.affordable && !upgrade.armed && !cer}
          disabled={!up.affordable || upgrade.cooling}
          reason={upgrade.cooling ? undefined : upReason}
          testid="card-upgrade-btn"
          class={upgrade.armed ? 'is-armed' : ''}
          icon={<AmberIcon size={24} />}
          onClick={() => upgrade.press(doUpgrade)}
          label={upgrade.armed ? t('ui.card.confirmAction', { n: formatInt(price, locale) }) : t('ui.card.upgradeAction', { n: formatInt(price, locale) })}
        >
          <span>{upgrade.armed ? t('ui.card.confirmAction', { n: formatInt(price, locale) }) : t('ui.card.upgradeAction', { n: formatInt(price, locale) })}</span>
          <small class="ui-btn__sub">
            {upReason && !upgrade.cooling
              ? upReason
              : upgrade.armed && price * 2 > amber
                ? t('ui.card.leaves', { n: formatInt(amber - price, locale) })
                : t('ui.card.levelStep', { a: level, b: level + 1 })}
          </small>
        </Button>
      </span>
    );
    secondary =
      craftPrice !== null ? (
        <span ref={craftRef} class="cd-action">
          <Button
            kind="secondary"
            size="m"
            icon={<DustIcon size={20} />}
            disabled={s.currencies.dust < craftPrice}
            reason={craftReason}
            testid="card-craft"
            class={craftCopy.armed ? 'is-armed' : ''}
            onClick={() => craftCopy.press(() => doCraft(craftRef.current))}
          >
            {craftCopy.armed ? t('ui.card.confirmAction', { n: formatInt(craftPrice, locale) }) : t('ui.card.craftCopyAction', { n: formatInt(craftPrice, locale) })}
          </Button>
        </span>
      ) : null;
  }
  const armed = upgrade.armed;
  return (
    <ScreenFrame
      id="cardDetail"
      title={tile.name}
      onBack={() => router.back()}
      subtitle={rarity ? <Pill tone="neutral">{t(rarityNameKey(rarity))}</Pill> : <Pill tone="gold">{t('ui.card.power')}</Pill>}
      right={
        <>
          <span data-testid="cd-amber">
            <CurrencyChip kind="amber" value={s.currencies.amber} compact />
          </span>
          <CurrencyChip kind="dust" value={s.currencies.dust} compact />
        </>
      }
      actions={{ primary, secondary, tertiary }}
    >
      <div class={`cd${armed ? ' is-armed' : ''}`} style={{ '--frame': frame }}>
        <div class="cd-left">
          <div
            ref={stageRef}
            class={`cd-stage${cer ? ` is-${cer.phase}` : ''}${armed ? ' is-armed' : ''}`}
            data-testid="card-stage"
            data-anim={cer ? '' : undefined}
            onClick={() => cer && setCer(null)}
          >
            <i class="cd-stage__spot" aria-hidden="true" />
            <div class="cd-stage__card">
              <span class="cd-stage__frame">
                <CardArt card={id} age={def.age} glyph={cardGlyph(def)} size={200} foil={tile.foil} skin={tile.skin} silhouette={!owned} />
              </span>
              {owned && def.kind !== 'power' ? (
                <span class="cd-stage__level" data-testid="card-level" key={`lv${level}-${cer?.phase === 'impact' ? cer.n : 0}`}>
                  {t('ui.card.level', { n: level })}
                </span>
              ) : null}
              {!owned ? (
                <span class="cd-stage__lock">
                  <LockIcon size={44} />
                </span>
              ) : null}
            </div>
            {cer?.phase === 'impact' ? (
              <>
                <i class="cd-stage__burst" aria-hidden="true" />
                <span class="cd-stage__hammer" aria-hidden="true">
                  <HammerIcon size={90} />
                </span>
                <span class="cd-stage__levelup" aria-hidden="true">
                  {t('ui.card.levelUp', { n: level })}
                </span>
              </>
            ) : null}
            <i class="cd-stage__floor" aria-hidden="true" />
            {tile.cls ? (
              <span class="cd-stage__class" aria-hidden="true">
                <ClassIcon id={tile.cls} size={52} />
              </span>
            ) : null}
          </div>
          <div class="cd-chips">
            {tile.cls ? <ClassChip id={tile.cls} legendary={tile.legendary} testid="card-class" /> : null}
            <Pill icon={<AgeGlyph age={def.age} size={18} />}>{t(ageNameKey(def.age))}</Pill>
            {/* The class chip is the player-facing kind; the raw role ("Siege heavy") read as a second, clashing class. */}
            {!tile.cls && def.kind === 'turret' ? <Pill tone="blue">{t('ui.warplan.slot.turret')}</Pill> : null}
            {!tile.cls && def.kind === 'power' ? <Pill tone="gold">{t('ui.warplan.slot.power')}</Pill> : null}
          </div>
          {owned && up && !up.maxed ? (
            <div class="cd-copies" data-testid="card-upgrade">
              <CopiesBar copies={up.copies} needed={up.cost?.copies ?? null} ready={up.copiesReady} />
            </div>
          ) : null}
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
                {rows.map((r, i) => {
                  const prev = prevRows?.find((x) => x.id === r.id);
                  const gain = cer?.phase === 'impact' && prev && typeof prev.value === 'number' && typeof r.value === 'number' ? r.value - prev.value : 0;
                  return (
                    <tr key={r.id} data-testid={`stat-${r.id}`} class={gain ? 'is-tick' : ''} style={gain ? { '--i': i } : undefined}>
                      <th scope="row">{t(STAT_KEYS[r.id])}</th>
                      <td class="ui-num">
                        {valueText(r, r.value)}
                        {gain > 0 ? <span class="cd-gain">{t('ui.card.nextDelta', { n: formatInt(gain, locale) })}</span> : null}
                      </td>
                      <td class="cd-next ui-num">
                        {owned && r.next !== null && typeof r.value === 'number' && r.next !== r.value
                          ? t('ui.card.nextDelta', { n: formatInt(r.next - r.value, locale) })
                          : ''}
                      </td>
                    </tr>
                  );
                })}
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
              <div class="cd-counter-classes" data-testid="counter-classes">
                <CounterRows strong={tile.strong ?? []} weak={tile.weak ?? []} size={26} />
              </div>
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
