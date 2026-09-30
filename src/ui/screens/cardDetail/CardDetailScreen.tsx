/**
 * Card detail (S11, docs/ui-plan.md 4.4, 6.6): understand a card and upgrade it.
 *
 * - **One hero** (left): a lane stage in the card's age where the unit stands and moves (idle, a
 *   wind-up and a strike on a 3 s loop; a turret recoils, a power glows), with the lg card over its
 *   bottom-left corner and the level and copies beside it.
 * - **Right** (scrolls on its own): Strong vs / Weak vs as class icons plus one plain sentence (the
 *   owner's request), then the stats with the next level's green deltas, traits, the description,
 *   skins, the card-by-card counters and foils. A power shows its slot, a lane diagram of where it
 *   lands, cost, reload, the cap, the per-enemy line, what it counters and its source (A2.9.10).
 * - **Action bar** (never scrolls, UA-03): Show odds (tertiary); Craft copy and Use (or the "In
 *   army" pill) as secondaries; Upgrade as the one primary when it is possible. Disabled, Upgrade
 *   keeps its place and says what is missing (U1, U3).
 * - **Upgrade in two taps** (U10, MR-38b): the first tap shows "Confirm · price" in place, lifts the
 *   card and lights the green deltas; a tap elsewhere cancels. The second spends and plays MR-39 on
 *   the card (Amber flies in, the card trembles, a burst and a shine, the level flips, the stat rows
 *   tick with green chips; a tap on the stage skips it). It re-arms only after 600 ms (UA-08).
 *   Army's "Upgrade" opens this screen already in the confirm state (`route.upgrade`).
 */
import './cardDetail.css';
import { ageNameKey, foilNameKey, rarityNameKey, tagNameKey } from '@/content/keys';
import type { CardId, Foil } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { useConfirmSpend } from '../../components/confirm';
import { haptic } from '../../components/haptics';
import { fly, reducedMotion } from '../../components/motion';
import { CardTile, type CardTileData } from '../../components/CardTile';
import { CLASS_NAME_KEY, ClassChip, ClassIcon, counterNoteKey } from '../../components/ClassIcon';
import { CurrencyChip, Pill } from '../../components/Chips';
import { formatDec, formatInt, formatSeconds } from '../../components/format';
import { AgeGlyph, AmberIcon, CheckIcon, DustIcon, RarityGem, RoadIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { Sheet } from '../../components/Modal';
import { OddsSheet } from '../../components/OddsSheet';
import { oddsModel } from '../../components/oddsModel';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardDef, cardGlyph, cardRarity, cardTile, hitsOf, isOwned, modsOf, turretStats, unitStats, upgradeState, type StatRow } from '../model/cards';
import { activePlan, AGE_SHORT_KEY, assignCard, equipSlot, fieldSlotLockKeys, fieldSlotOpen, fortSlotOpen, normalizeLoadout, slotOfCard } from '../model/plan';
import { powerSourceText } from '../model/powerText';
import { PowerFacts } from './PowerFacts';
import { FortFacts, fortSourceText } from './FortFacts';
import { arenaOf } from '../model/progress';
import { reasonKey } from '../model/reasons';
import { SkinOptions } from '../shared/SkinPicker';
import { CardStage } from './CardStage';

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

/** MR-39 after the 300 ms charge: burst, hold, level flip, stat ticks and chips (1,470 ms in all). */
const IMPACT_MS = MOTION_DUR.beatMax - MOTION_DUR.medium;

export function CardDetailScreen(p: { route: RouteOf<'cardDetail'> }) {
  const { save, content, t, locale, router, services, toasts } = useUi();
  const s = save.value;
  const id: CardId = p.route.card;
  const def = cardDef(content, id);
  const kit = useUi();
  // MR-39 ceremony: 'charge' (300 ms: Amber flies in, the card trembles), then 'impact' (burst, the
  // level flips, the stat rows tick with green chips), then done. A tap on the stage skips it.
  const [cer, setCer] = useState<{
    n: number;
    from: number;
    phase: 'charge' | 'impact';
  } | null>(null);
  const [odds, setOdds] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLSpanElement>(null);
  const craftRef = useRef<HTMLSpanElement>(null);
  const useBtnRef = useRef<HTMLSpanElement>(null);
  const upgrade = useConfirmSpend({ onArm: () => kit.sound?.('ui_toggle') });
  const craft = useConfirmSpend({ onArm: () => kit.sound?.('ui_toggle') });
  const craftCopy = useConfirmSpend({ onArm: () => kit.sound?.('ui_toggle') });
  useEffect(() => {
    if (!cer) return;
    const reduced = reducedMotion(stageRef.current);
    const tm =
      cer.phase === 'charge'
        ? setTimeout(
            () => {
              setCer((c) => (c && c.n === cer.n ? { ...c, phase: 'impact' } : c));
              haptic('heavy');
              kit.sound?.('upgrade_slam');
            },
            reduced ? 0 : MOTION_DUR.medium,
          )
        : setTimeout(() => setCer((c) => (c && c.n === cer.n ? null : c)), reduced ? MOTION_DUR.beatMin : IMPACT_MS);
    return () => clearTimeout(tm);
  }, [cer?.n, cer?.phase]);
  // Looking at a card clears its NEW badge.
  const isNew = s.collection[id]?.isNew === true;
  useEffect(() => {
    if (isNew) services.markSeen(id);
  }, [id, isNew]);
  // Army's "Upgrade" opens the screen with the upgrade already in its confirm state (4.2).
  const up0 = def ? upgradeState(s, content, id) : null;
  useEffect(() => {
    if (p.route.upgrade && up0?.affordable && !upgrade.armed) upgrade.press(() => false);
  }, []);
  if (!def) {
    return (
      <ScreenFrame id="cardDetail" title={t('ui.army.title')} onBack={() => router.back()}>
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
  const prevRows = cer && def.kind === 'unit' ? unitStats(content, def, cer.from) : cer && def.kind === 'turret' ? turretStats(content, def, cer.from) : null;
  const hits = hitsOf(def);
  const mods = modsOf(def);
  const foilRank = content.rarities.foils[tile.foil].rank;
  const craftPrice = rarity ? content.rarities.cards[rarity].craftCopyDust : null;
  const { index: planIndex, plan } = activePlan(s, content);
  const loadout = normalizeLoadout(plan.loadouts[def.age] ?? { units: [], turrets: [], powers: { home: null, field: null } });
  const inArmy = slotOfCard(loadout, id) !== null;
  // A Field power waits for its slot (A2.9.1), a fort for the Fort slot (A16.14.6): no Use until it opens.
  const slotLocked = (def.kind === 'power' && def.slot === 'field' && !fieldSlotOpen(s)) || (def.kind === 'fort' && !fortSlotOpen(s));

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
    toasts.show(r.ok ? t('ui.card.crafted') : t(reasonKey(r.reason)), {
      tone: r.ok ? 'good' : 'bad',
      anchor,
    });
    return r.ok;
  }

  /** "Use": the A3 "Equip now" rule in the card's age of the army in use, with Undo (U10). */
  function doUse() {
    const slot = equipSlot(s, content, loadout, id);
    if (!slot || !def) return;
    const before = plan;
    services.setWarPlan(planIndex, {
      ...plan,
      loadouts: {
        ...plan.loadouts,
        [def.age]: assignCard(content, loadout, slot, id),
      },
    });
    kit.sound?.('card_place');
    haptic('thump');
    toasts.show(t('ui.card.usedIn', { age: t(ageNameKey(def.age)) }), {
      tone: 'good',
      anchor: useBtnRef.current,
      undo: () => services.setWarPlan(planIndex, before),
    });
  }

  /** Counter cards are shown as plain references: no NEW stamp or upgrade arrow of the player's own copy. */
  const counterTile = (ct: CardTileData): CardTileData => ({
    ...ct,
    owned: true,
    isNew: false,
    upgradeReady: false,
  });
  const amber = s.currencies.amber;
  const price = up?.cost?.amber ?? 0;
  const upReason =
    up && !up.affordable
      ? !up.copiesReady
        ? t('ui.card.needMoreCopies', {
            n: formatInt((up.cost?.copies ?? 0) - up.copies, locale),
          })
        : t('ui.card.needAmber', {
            n: formatInt(Math.max(0, price - amber), locale),
          })
      : undefined;
  const craftReason =
    craftPrice !== null && s.currencies.dust < craftPrice
      ? t('ui.card.needDust', {
          n: formatInt(craftPrice - s.currencies.dust, locale),
        })
      : undefined;

  let primary: preact.ComponentChildren = null;
  const secondary: preact.ComponentChildren[] = [];
  let tertiary: preact.ComponentChildren = null;
  if (def.kind !== 'power' && def.kind !== 'fort') {
    tertiary = (
      <Button kind="tertiary" size="s" testid="card-odds" onClick={() => setOdds(true)}>
        {t('ui.card.showOdds')}
      </Button>
    );
  }
  if (def.kind === 'power') {
    tertiary = owned ? (
      <p class="cd-owned">
        <CheckIcon size={20} /> {slotLocked ? t(fieldSlotLockKeys(s).line) : t('ui.card.powerOwned')}
      </p>
    ) : (
      <p class="cd-owned" data-testid="power-source-bar">
        <RoadIcon size={22} /> {def.source === 'road' && def.road !== undefined ? t('ui.card.powerFromRoad', { n: formatInt(def.road, locale) }) : powerSourceText(def, t)}
      </p>
    );
  } else if (def.kind === 'fort') {
    // Forts have no copies, levels or Dust (A16.14.6): only where they come from, or the slot's lock.
    tertiary = owned ? (
      <p class="cd-owned" data-testid="fort-owned">
        <CheckIcon size={20} /> {slotLocked ? t('army.fortSlot.locked') : t('ui.fort.owned')}
      </p>
    ) : (
      <p class="cd-owned" data-testid="fort-source-bar">
        <RoadIcon size={22} /> {fortSourceText(def, t, locale)}
      </p>
    );
  } else if (!owned) {
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
          <span>
            {craft.armed
              ? t('ui.card.confirmAction', {
                  n: formatInt(craftPrice ?? 0, locale),
                })
              : t('ui.card.craftAction', {
                  n: formatInt(craftPrice ?? 0, locale),
                })}
          </span>
          <small class="ui-btn__sub">{t('ui.card.craftUnlock')}</small>
        </Button>
      </span>
    );
    craft.ref.current = craftRef.current;
  } else if (up?.maxed) {
    primary = (
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
          <span key={upgrade.armed ? 'armed' : 'idle'}>
            {upgrade.armed ? t('ui.card.confirmAction', { n: formatInt(price, locale) }) : t('ui.card.upgradeAction', { n: formatInt(price, locale) })}
          </span>
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
    if (craftPrice !== null) {
      secondary.push(
        <span ref={craftRef} class="cd-action" key="craft">
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
            {craftCopy.armed
              ? t('ui.card.confirmAction', { n: formatInt(craftPrice, locale) })
              : t('ui.card.craftCopyAction', {
                  n: formatInt(craftPrice, locale),
                })}
          </Button>
        </span>,
      );
    }
  }
  if (owned && !slotLocked) {
    secondary.push(
      inArmy ? (
        <span class="cd-inarmy" data-testid="card-in-army" key="use">
          <CheckIcon size={18} /> {t('ui.card.inArmy')}
        </span>
      ) : (
        <span ref={useBtnRef} class="cd-action" key="use">
          <Button kind="secondary" size="m" testid="card-use" sound={null} onClick={doUse}>
            {t('ui.card.use')}
          </Button>
        </span>
      ),
    );
  }

  const armed = upgrade.armed;
  const myCls = tile.cls;
  const strongNote = myCls && tile.strong?.length ? tile.strong.map((c) => counterNoteKey(myCls, c)).find(Boolean) : null;
  const weakNote = myCls && tile.weak?.length ? tile.weak.map((c) => counterNoteKey(c, myCls)).find(Boolean) : null;

  return (
    <ScreenFrame
      id="cardDetail"
      title={tile.name}
      onBack={() => router.back()}
      subtitle={
        <span class="cd-sub">
          {tile.cls ? <ClassChip id={tile.cls} legendary={tile.legendary} size="sm" testid="card-class" /> : null}
          <span class="cd-sub__pill">
            <AgeGlyph age={def.age} size={16} />
            {t(AGE_SHORT_KEY[def.age])}
          </span>
          {rarity ? (
            <span class="cd-sub__pill" data-rarity={rarity}>
              <RarityGem rarity={rarity} size={16} />
              {t(rarityNameKey(rarity))}
            </span>
          ) : null}
        </span>
      }
      right={
        <>
          <span data-testid="cd-amber">
            <CurrencyChip kind="amber" value={s.currencies.amber} compact />
          </span>
          <CurrencyChip kind="dust" value={s.currencies.dust} compact />
        </>
      }
      actions={{
        primary,
        secondary: secondary.length ? <>{secondary}</> : null,
        tertiary,
      }}
    >
      <div
        class={`cd${armed ? ' is-armed' : ''}`}
        style={{
          '--frame': tile.rarity ? `var(--ui-${tile.rarity})` : '#c9a15a',
        }}
      >
        <div class="cd-left">
          <CardStage
            stageRef={stageRef}
            tile={tile}
            kind={def.kind}
            glyph={cardGlyph(def)}
            {...(def.kind === 'fort' ? { fortKind: def.fortKind } : {})}
            owned={owned}
            copies={owned && up && !up.maxed ? { copies: up.copies, needed: up.cost?.copies ?? null, ready: up.copiesReady } : null}
            ceremony={cer ? { phase: cer.phase, n: cer.n } : null}
            armed={armed}
            onSkip={() => setCer(null)}
          />
        </div>

        <div class="cd-right" data-scroll="">
          {def.kind === 'power' ? <PowerFacts def={def} content={content} t={t} locale={locale} /> : null}
          {def.kind === 'fort' ? <FortFacts def={def} content={content} t={t} locale={locale} strong={tile.strong ?? []} weak={tile.weak ?? []} /> : null}
          {def.kind === 'unit' && ((tile.strong?.length ?? 0) > 0 || (tile.weak?.length ?? 0) > 0) ? (
            <section class="cd-counters" data-testid="counter-classes">
              {tile.strong?.length ? (
                <div class="cd-crow cd-crow--good" data-testid="class-strong">
                  <span class="cd-crow__label">{t('ui.card.strongVs')}</span>
                  <span class="cd-crow__icons">
                    {tile.strong.map((c) => (
                      <span key={c} class="cd-crow__cls">
                        <ClassIcon id={c} size={24} />
                        {t(CLASS_NAME_KEY[c])}
                      </span>
                    ))}
                  </span>
                  {strongNote ? <span class="cd-crow__note">{t(strongNote)}</span> : null}
                </div>
              ) : null}
              {tile.weak?.length ? (
                <div class="cd-crow cd-crow--bad" data-testid="class-weak">
                  <span class="cd-crow__label">{t('ui.card.weakVs')}</span>
                  <span class="cd-crow__icons">
                    {tile.weak.map((c) => (
                      <span key={c} class="cd-crow__cls">
                        <ClassIcon id={c} size={24} />
                        {t(CLASS_NAME_KEY[c])}
                      </span>
                    ))}
                  </span>
                  {weakNote ? <span class="cd-crow__note">{t(weakNote)}</span> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {rows.length > 0 ? (
            <section class="cd-stats" data-testid="card-stats" aria-label={t('ui.card.stats')}>
              {rows.map((r, i) => {
                const prev = prevRows?.find((x) => x.id === r.id);
                const gain = cer?.phase === 'impact' && prev && typeof prev.value === 'number' && typeof r.value === 'number' ? r.value - prev.value : 0;
                const delta = owned && r.next !== null && typeof r.value === 'number' && r.next !== r.value ? r.next - r.value : 0;
                return (
                  <div
                    key={r.id}
                    class={`cd-stat${gain ? ' is-tick' : ''}${delta ? ' has-delta' : ''}`}
                    data-testid={`stat-${r.id}`}
                    style={gain ? { '--i': i } : undefined}
                  >
                    <span class="cd-stat__label">{t(STAT_KEYS[r.id])}</span>
                    <span class="cd-stat__value ui-num">
                      {valueText(r, r.value)}
                      {gain > 0 ? (
                        <span class="cd-gain">
                          {t('ui.card.nextDelta', {
                            n: formatInt(gain, locale),
                          })}
                        </span>
                      ) : null}
                      {delta ? (
                        <span class="cd-next">
                          {t('ui.card.nextDelta', {
                            n: formatInt(delta, locale),
                          })}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </section>
          ) : null}

          {hits || mods.length > 0 || def.kind === 'unit' ? (
            <div class="cd-tags" aria-label={t('ui.card.traits')}>
              {hits ? (
                <>
                  <Pill tone={hits.ground ? 'green' : 'neutral'}>{hits.ground ? t('ui.card.hitsGround') : t('ui.card.noGround')}</Pill>
                  <Pill tone={hits.air ? 'green' : 'neutral'}>{hits.air ? t('ui.card.hitsAir') : t('ui.card.noAir')}</Pill>
                </>
              ) : null}
              {def.kind === 'unit' ? <Pill>{t(SIZE_KEYS[def.size])}</Pill> : null}
              {def.kind === 'unit'
                ? def.tags.filter((tag) => tag !== 'ground' && tag !== 'melee' && tag !== 'ranged').map((tag) => <Pill key={tag}>{t(tagNameKey(tag))}</Pill>)
                : null}
              {mods.map((m) => (
                <Pill key={m.vs} tone={m.bp >= 10000 ? 'gold' : 'red'}>
                  {t('ui.card.mod', {
                    x: formatDec(m.bp / 10000, m.bp % 1000 === 0 ? 1 : 2, locale),
                    tag: t(tagNameKey(m.vs)),
                  })}
                </Pill>
              ))}
            </div>
          ) : null}

          <p class="cd-desc">{t(def.descKey)}</p>

          {def.kind !== 'power' && def.kind !== 'fort' && content.order.skins.some((k) => content.skins[k]!.target === id) ? (
            <div class="cd-skins">
              <h3 class="cd-label">{t('ui.card.skins')}</h3>
              <SkinOptions card={id} compact />
            </div>
          ) : null}

          {def.kind === 'unit' && (def.strongVs.length > 0 || def.weakVs.length > 0) ? (
            <div class="cd-cards">
              <h3 class="cd-label">{t('ui.card.counterCards')}</h3>
              <div class="cd-counters-cards">
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
            </div>
          ) : null}

          {def.kind !== 'power' && def.kind !== 'fort' ? (
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
        </div>
      </div>
      {odds ? (
        <Sheet title={t('ui.card.oddsTitle')} onClose={() => setOdds(false)} testid="card-odds-sheet">
          <OddsSheet model={oddsModel(content.capsules, content.rarities, s, arenaOf(s, content).randomLegendaries, content.cosmetics.collections)} />
        </Sheet>
      ) : null}
    </ScreenFrame>
  );
}
