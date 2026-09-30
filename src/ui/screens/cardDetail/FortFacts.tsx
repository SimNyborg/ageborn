/**
 * A Fort card's facts on Card detail (DESIGN A16.14.7 "Card detail"): what it does in one line, a small
 * lane diagram of your half (your gate, the turret cover, the five pads with the kind's legal pads lit,
 * the fort to scale on its front Home pad and, for a tower, its reach from each Home pad, which never
 * passes p 560), the numbers (cost, pop, HP; a tower's shot; a camp's levy; a trap's charges), the
 * traits ("Crumbles after 60 s", "Heavies break it ×2", "Siege: forts crumble"), what it is strong and
 * weak against, the answer to it, and where it comes from.
 */
import type { Content } from '@/content/types';
import type { AgeId, FortDef, FortKind } from '@/contracts';
import { fortEconomyOf, towerRangeOnPad } from '@/core/fortPads';
import { Pill } from '../../components/Chips';
import { CLASS_NAME_KEY, ClassIcon } from '../../components/ClassIcon';
import { FORT_KIND_KEY, FortKindBadge } from '../../components/FortGlyphs';
import { fortTraits } from '../../components/fortInfo';
import { formatInt, formatSeconds } from '../../components/format';
import { CoinIcon } from '../../components/icons';
import type { UnitClass } from '@/core/cardClass';
import { AGE_SHORT_KEY } from '../model/plan';

type T = (key: string, params?: Record<string, string | number>) => string;

/** The kind's one-line role and its answer (A16.14.1 kind rows). */
const ROLE_KEY: Readonly<Record<FortKind, string>> = {
  wall: 'ui.fort.role.wall',
  tower: 'ui.fort.role.tower',
  camp: 'ui.fort.role.camp',
  trap: 'ui.fort.role.trap',
};

const ANSWER_KEY: Readonly<Record<FortKind, string>> = {
  wall: 'ui.fort.answer.wall',
  tower: 'ui.fort.answer.tower',
  camp: 'ui.fort.answer.camp',
  trap: 'ui.fort.answer.trap',
};

/** The diagram shows your half: 1,000 lu across 400 px (0.4 px per lu). */
const HALF = 1000;
const K = 400 / HALF;

/** The age's longest Common turret range (the cover a blocked wave stands in), lu. */
function coverOf(content: Content, age: AgeId): number {
  let best = 0;
  for (const id of content.order.turrets) {
    const d = content.turrets[id];
    if (d && d.age === age && d.rarity === 'common' && d.attack.range > best) best = d.attack.range;
  }
  return best;
}

/** Where a fort may stand: your half with the pads, the cover, the fort to scale and a tower's reach. */
export function FortLaneDiagram(p: { def: FortDef; content: Content; t: T }) {
  const { def, content, t } = p;
  const f = fortEconomyOf(content.economy);
  if (!f) return null;
  const x = (lu: number) => Math.round(lu * K * 10) / 10;
  const size = def.size === 'medium' ? content.economy.sizes.medium : def.size === 'large' ? content.economy.sizes.large : 60;
  const home = f.pads.slice(0, f.homePads);
  const front = home[home.length - 1] ?? 0;
  const cover = coverOf(content, def.age);
  const any = def.pads === 'any';
  const reach = def.attack ? home.map((pad) => ({ pad, r: towerRangeOnPad(def.attack!.range, pad, Math.trunc(size / 2), f.towerReachMaxP) })) : [];
  const label = t(any ? 'ui.fort.padsAny' : 'ui.fort.padsHome');
  return (
    <div class="cd-lane-wrap">
      <svg class="cd-lane cd-fortlane" viewBox="0 0 400 72" role="img" aria-label={label} data-testid="fort-lane">
        <rect class="cd-lane__ground" x="0" y="40" width="400" height="16" rx="3" />
        {cover > 0 ? <rect class="cd-fortlane__cover" x="0" y="36" width={x(cover)} height="24" rx="3" /> : null}
        {def.attack ? <line class="cd-fortlane__cap" x1={x(f.towerReachMaxP)} y1="6" x2={x(f.towerReachMaxP)} y2="62" /> : null}
        {reach.map((r, i) => (
          <g key={r.pad} class="cd-fortlane__reach">
            <line x1={x(r.pad)} y1={10 + i * 7} x2={x(r.pad + r.r)} y2={10 + i * 7} />
            <circle cx={x(r.pad + r.r)} cy={10 + i * 7} r="2.2" />
          </g>
        ))}
        {f.pads.map((pad, i) => {
          const field = i >= f.homePads;
          const lit = !field || any;
          return <ellipse key={pad} class={`cd-fortlane__pad${lit ? ' is-lit' : ''}${field ? ' is-field' : ''}`} cx={x(pad)} cy="48" rx="7" ry="3.4" />;
        })}
        <rect
          class={`cd-fortlane__fort is-${def.fortKind}`}
          x={x(front - size / 2)}
          y={def.fortKind === 'trap' ? 44 : def.fortKind === 'tower' ? 22 : 30}
          width={Math.max(3, x(size))}
          height={def.fortKind === 'trap' ? 6 : def.fortKind === 'tower' ? 24 : 16}
          rx="2"
        />
        <rect class="cd-lane__gate is-me" x="0" y="20" width="8" height="40" rx="2" />
        <line class="cd-lane__mid" x1="399" y1="10" x2="399" y2="66" />
      </svg>
      <span class="cd-lane__labels" aria-hidden="true">
        <span>{t('ui.power.laneYou')}</span>
        <span>{label}</span>
        <span>{t('ui.fort.mid')}</span>
      </span>
    </div>
  );
}

function Stat(p: { label: string; value: preact.ComponentChildren; testid?: string }) {
  return (
    <div class="cd-stat" data-testid={p.testid}>
      <span class="cd-stat__label">{p.label}</span>
      <span class="cd-stat__value ui-num">{p.value}</span>
    </div>
  );
}

/** Where a fort comes from (A16.14.6): the Fort slot's unlock set, its War Path level, its Road set. */
export function fortSourceText(def: FortDef, t: T, locale: string): string {
  const parts: string[] = [];
  if (def.source === 'starter' || def.source === 'unlock') parts.push(t('fort.source.unlock'));
  if (def.source === 'warPath' && def.warPathLevel !== undefined) parts.push(t('fort.source.warPath', { region: t(AGE_SHORT_KEY[def.age]), level: def.warPathLevel }));
  if (def.road !== undefined) parts.push(t('fort.source.road', { n: formatInt(def.road, locale) }));
  return parts.join(' · ');
}

export function FortFacts(p: { def: FortDef; content: Content; t: T; locale: string; strong: readonly UnitClass[]; weak: readonly UnitClass[] }) {
  const { def, content, t, locale } = p;
  const levy = def.camp ? content.units[def.camp.spawn] : undefined;
  const slow = def.trap?.statuses.find((s) => s.kind === 'slow');
  // The class legend is a floor (A18.9.1): Heavy beats Fort, so every fort that can be hit lists it.
  const weak: UnitClass[] = def.fortKind !== 'trap' && !p.weak.includes('heavy') ? ['heavy', ...p.weak] : [...p.weak];
  const row = (label: string, list: readonly UnitClass[], tone: 'good' | 'bad', testid: string) =>
    list.length ? (
      <div class={`cd-crow cd-crow--${tone}`} data-testid={testid}>
        <span class="cd-crow__label">{label}</span>
        <span class="cd-crow__icons">
          {list.map((c) => (
            <span key={c} class="cd-crow__cls">
              <ClassIcon id={c} size={24} />
              {t(CLASS_NAME_KEY[c])}
            </span>
          ))}
        </span>
      </div>
    ) : null;
  return (
    <section class="cd-power cd-fort" data-testid="fort-facts">
      <div class="cd-power__head">
        <span class="cd-fort__kind" data-testid="fort-kind">
          <FortKindBadge kind={def.fortKind} size={20} />
          {t(FORT_KIND_KEY[def.fortKind])}
        </span>
        <span class="cd-power__family">{t('class.fort')}</span>
      </div>
      <p class="cd-power__counters" data-testid="fort-role">
        {t(ROLE_KEY[def.fortKind])}
      </p>
      <section class="cd-counters" data-testid="counter-classes">
        {row(t('ui.card.strongVs'), p.strong, 'good', 'class-strong')}
        {row(t('ui.card.weakVs'), weak, 'bad', 'class-weak')}
        <span class="cd-crow__note">{t(ANSWER_KEY[def.fortKind])}</span>
      </section>
      <h3 class="cd-label">{t('ui.fort.where')}</h3>
      <FortLaneDiagram def={def} content={content} t={t} />
      <div class="cd-stats" data-testid="card-stats">
        <Stat
          label={t('ui.stat.cost')}
          testid="stat-fort-cost"
          value={
            <>
              <CoinIcon size={16} />
              {formatInt(def.cost, locale)}
            </>
          }
        />
        <Stat label={t('fort.stat.pop')} value={formatInt(def.pop, locale)} testid="stat-fort-pop" />
        {def.hp > 0 ? <Stat label={t('fort.stat.hp')} value={formatInt(def.hp, locale)} testid="stat-fort-hp" /> : null}
        {def.attack ? (
          <>
            <Stat label={t('ui.stat.damage')} value={formatInt(def.attack.damage, locale)} />
            <Stat label={t('ui.stat.interval')} value={t('ui.unit.seconds', { n: formatSeconds(def.attack.intervalMs, locale) })} />
            <Stat label={t('fort.stat.range')} value={t('ui.unit.lu', { n: formatInt(def.attack.range, locale) })} testid="stat-fort-range" />
          </>
        ) : null}
        {def.camp ? (
          <>
            <Stat label={t('ui.fort.levyEvery')} value={t('ui.unit.seconds', { n: formatSeconds(def.camp.everyMs, locale) })} />
            <Stat label={t('ui.fort.levyMax')} value={formatInt(def.camp.maxAlive, locale)} />
          </>
        ) : null}
        {def.trap ? (
          <>
            <Stat label={t('fort.stat.charges')} value={formatInt(def.trap.charges, locale)} testid="stat-fort-charges" />
            <Stat label={t('ui.stat.damage')} value={formatInt(def.trap.damage, locale)} />
            {def.trap.radius > 0 ? <Stat label={t('ui.stat.splash')} value={t('ui.unit.lu', { n: formatInt(def.trap.radius, locale) })} /> : null}
          </>
        ) : null}
      </div>
      {levy ? (
        <p class="cd-power__unit" data-testid="fort-levy">
          <b>{t(levy.nameKey)}</b> {t('ui.fort.levy', { hp: formatInt(levy.hp, locale), dmg: formatInt(levy.attacks[0]?.damage ?? 0, locale) })}
        </p>
      ) : null}
      {slow ? <p class="cd-power__unit">{t('ui.fort.slow', { pct: Math.round(slow.magnitudeBp / 100), s: formatSeconds(slow.durationMs, locale) })}</p> : null}
      <p class="cd-power__note">{t('ui.fort.level')}</p>
      <div class="cd-tags" data-testid="fort-traits">
        {fortTraits(def, true).map((k) => (
          <Pill key={k} tone={k === 'fort.trait.heavyX2' || k === 'fort.trait.decay' || k === 'fort.trait.siege' ? 'red' : 'neutral'}>
            {t(k)}
          </Pill>
        ))}
      </div>
      <p class="cd-power__source" data-testid="fort-source">
        {fortSourceText(def, t, locale)}
      </p>
    </section>
  );
}
