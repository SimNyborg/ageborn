/**
 * A power card's facts on Card detail (A2.9.10 "Card detail for a power"): a small lane diagram (both
 * gates, the mid line, the reach band tinted and the zone to scale), then cost, reload, warning time,
 * the cap ("Hits up to 5", "Your 8 frontmost units") and the per-enemy line, ground and air, what it
 * counters, and where it comes from.
 */
import type { Content } from '@/content/types';
import type { PowerDef } from '@/contracts';
import { Pill } from '../../components/Chips';
import { formatInt, formatSeconds } from '../../components/format';
import { CoinIcon } from '../../components/icons';
import { ReachGlyphIcon, ReloadGlyph, SlotGlyph } from '../../components/PowerGlyphs';
import { perUnitShare, powerCap, powerHits, powerZoneOf, reachGlyph, reachLabel } from '../../components/powerInfo';
import { POWER_COUNTERS_KEY, POWER_FAMILY_KEY, POWER_REACH_KEY, POWER_REACH_WHY_KEY, POWER_SLOT_LONG_KEY, powerSourceText } from '../model/powerText';

type T = (key: string, params?: Record<string, string | number>) => string;

const LANE = 2000;
/** A2.9.4 in lu: the Home line, the Front floor and reach (the diagram's shapes, not the sim's rules). */
const HOME_LINE = 1000;
const FRONT_FLOOR = 480;
const FRONT_REACH = 150;

/**
 * The lane diagram (viewBox 400 × 64: 0.2 px per lu): your gate left, theirs right, the mid line, the
 * reach band washed in your colour, and the zone drawn to scale at the band's far edge.
 */
export function PowerLane(p: { def: PowerDef; t: T }) {
  const { def, t } = p;
  const k = 400 / LANE;
  const zone = powerZoneOf(def);
  const kind = def.effect.kind;
  let band: [number, number] | null = null;
  let zoneAt: number | null = null;
  let movable = false;
  if (def.reach === 'home') {
    band = [0, HOME_LINE];
    zoneAt = HOME_LINE - zone / 2;
  } else if (def.reach === 'front' && kind !== 'stampede' && kind !== 'suppress') {
    band = [0, FRONT_FLOOR + FRONT_REACH + zone / 2];
    zoneAt = FRONT_FLOOR + FRONT_REACH;
    movable = true;
  } else if (kind === 'stampede') {
    band = [FRONT_FLOOR, FRONT_FLOOR + zone];
    movable = true;
  } else if (kind === 'suppress') {
    band = [LANE - 480, LANE];
  } else if (kind === 'strike') {
    band = [150, LANE - 150];
  } else if (kind === 'paradrop') {
    band = [1250, 1470];
  } else if (kind === 'buffAll') {
    band = [260, 620];
  }
  const x = (lu: number) => Math.round(lu * k * 10) / 10;
  return (
    <div class="cd-lane-wrap">
      <svg class="cd-lane" viewBox="0 0 400 64" role="img" aria-label={t(POWER_REACH_WHY_KEY[reachLabel(def)])} data-testid="power-lane">
        <rect class="cd-lane__ground" x="0" y="34" width="400" height="16" rx="3" />
        {band ? (
          <rect class={`cd-lane__band${kind === 'suppress' || kind === 'paradrop' ? ' is-foe' : ''}`} x={x(band[0])} y="18" width={x(band[1]) - x(band[0])} height="32" rx="3" />
        ) : null}
        {band && movable ? (
          <line class="cd-lane__edge is-moving" x1={x(band[1])} y1="14" x2={x(band[1])} y2="54" />
        ) : band && def.reach === 'home' ? (
          <line class="cd-lane__edge" x1={x(band[1])} y1="14" x2={x(band[1])} y2="54" />
        ) : null}
        {zoneAt !== null && zone > 0 ? <rect class="cd-lane__zone" x={x(zoneAt - zone / 2)} y="28" width={x(zone)} height="16" rx="8" /> : null}
        {kind === 'strike' ? <circle class="cd-lane__zone" cx={x(1500)} cy="36" r="7" /> : null}
        <line class="cd-lane__mid" x1="200" y1="10" x2="200" y2="58" />
        <rect class="cd-lane__gate is-me" x="0" y="14" width="10" height="40" rx="2" />
        <rect class="cd-lane__gate is-foe" x="390" y="14" width="10" height="40" rx="2" />
      </svg>
      <span class="cd-lane__labels" aria-hidden="true">
        <span>{t('ui.power.laneYou')}</span>
        <span>{t('ui.power.laneThem')}</span>
      </span>
    </div>
  );
}

export function PowerFacts(p: { def: PowerDef; content: Content; t: T; locale: string }) {
  const { def, t, locale } = p;
  const cap = powerCap(def);
  const share = perUnitShare(p.content, def);
  const hits = powerHits(def);
  const label = reachLabel(def);
  const strikeDmg = def.effect.kind === 'strike' ? def.effect.damage * def.effect.shots : null;
  return (
    <section class="cd-power" data-testid="power-facts">
      <div class="cd-power__head">
        <span class={`cd-power__slot is-${def.slot}`} data-testid="power-slot">
          <SlotGlyph slot={def.slot} size={18} />
          {t(POWER_SLOT_LONG_KEY[def.slot])}
        </span>
        <span class="cd-power__family">{t(POWER_FAMILY_KEY[def.family])}</span>
        <span class="cd-power__reach">
          <ReachGlyphIcon kind={reachGlyph(def)} size={18} />
          {t(POWER_REACH_KEY[label])}
        </span>
      </div>
      <h3 class="cd-label">{t('ui.power.where')}</h3>
      <PowerLane def={def} t={t} />
      <p class="cd-power__why">{t(POWER_REACH_WHY_KEY[label])}</p>
      <div class="cd-stats">
        <div class="cd-stat" data-testid="stat-power-cost">
          <span class="cd-stat__label">{t('ui.power.cost')}</span>
          <span class="cd-stat__value ui-num">
            <CoinIcon size={16} />
            {formatInt(def.cost, locale)}
          </span>
        </div>
        <div class="cd-stat" data-testid="stat-power-reload">
          <span class="cd-stat__label">{t('ui.power.reload')}</span>
          <span class="cd-stat__value ui-num">
            <ReloadGlyph size={14} />
            {t('ui.unit.seconds', { n: formatSeconds(def.reloadMs, locale) })}
          </span>
        </div>
        <div class="cd-stat">
          <span class="cd-stat__label">{t('ui.power.telegraph')}</span>
          <span class="cd-stat__value ui-num">
            {t('ui.unit.seconds', {
              n: formatSeconds(def.telegraphMs, locale),
            })}
          </span>
        </div>
        {cap ? (
          <div class="cd-stat" data-testid="stat-power-cap">
            <span class="cd-stat__label">{t('ui.power.targets')}</span>
            <span class="cd-stat__value">{cap.own ? t('ui.power.hitsOwn', { n: cap.n }) : t('ui.power.hits', { n: cap.n })}</span>
          </div>
        ) : null}
      </div>
      {share && share.infantryPct !== null && share.heavyPct !== null && strikeDmg === null ? (
        <p class="cd-power__unit" data-testid="power-per-unit">
          <b>{t('ui.power.perUnit')}</b>{' '}
          {t('ui.power.perUnitValue', {
            i: share.infantryPct,
            h: share.heavyPct,
          })}
        </p>
      ) : strikeDmg !== null ? (
        <p class="cd-power__unit" data-testid="power-per-unit">
          <b>{t('ui.power.perUnit')}</b> {t('ui.power.strikeValue', { n: formatInt(strikeDmg, locale) })}
        </p>
      ) : null}
      {cap && !cap.own && cap.n > 1 ? <p class="cd-power__note">{t('ui.power.hitsNote')}</p> : null}
      <div class="cd-tags">
        {hits ? (
          <>
            <Pill tone={hits.ground ? 'green' : 'neutral'}>{hits.ground ? t('ui.card.hitsGround') : t('ui.card.noGround')}</Pill>
            <Pill tone={hits.air ? 'green' : 'neutral'}>{hits.air ? t('ui.card.hitsAir') : t('ui.card.noAir')}</Pill>
          </>
        ) : null}
      </div>
      <p class="cd-power__counters" data-testid="power-counters">
        {t(POWER_COUNTERS_KEY[def.family])}
      </p>
      <p class="cd-power__source" data-testid="power-source">
        {powerSourceText(def, t)}
      </p>
    </section>
  );
}
