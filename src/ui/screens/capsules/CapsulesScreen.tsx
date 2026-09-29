/**
 * The Capsules tab (S8, ui-plan 2.2, 4.6): everything that is opened, in one place.
 *
 * Left: the stage with the best capsule large (its name and where it came from), "Odds" one tap away
 * (task 2.8: odds in 2 taps) and the one primary, Open (gold, bottom-right of the stage). Every
 * capsule can be opened now: charges never block opening. Right: the shelf, one tile per capsule or
 * Wardrobe Crate with its name and source; tapping a tile opens that one. Under the shelf the banks,
 * each only after its first progress (2.6), each with its A15.3 cap line ("Holds up to N. When full,
 * it stops filling."). No timers. "Open all" (secondary) when 2 or more capsules wait.
 */
import './capsules.css';
import { capsuleTierNameKey } from '@/content/keys';
import type { PendingCapsule, PendingCrate } from '@/contracts';
import { useState } from 'preact/hooks';
import { Button, IconButton } from '../../components/Button';
import { formatInt } from '../../components/format';
import { CapsuleIcon, ClockIcon, CrateIcon, InfoIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { ClayMeter } from '../../components/Meters';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { CapsuleInfo } from '../home/parts';
import { bankRules, chargesView, supplyView, trayCapsules } from '../model/progress';
import { featureOpen } from '../model/warPath';

type ShelfItem = { kind: 'capsule'; c: PendingCapsule } | { kind: 'crate'; c: PendingCrate };

/** Where a capsule came from (4.6: "From level 4", "Supply Capsule"). */
const FROM_KEY: Readonly<Record<PendingCapsule['kind'], string>> = {
  win: 'ui.capsules.from.win',
  daily: 'ui.capsules.from.daily',
  road: 'ui.capsules.from.road',
  meter: 'ui.capsules.from.meter',
  age: 'ui.capsules.from.age',
  codex: 'ui.capsules.from.codex',
  conquest: 'ui.capsules.from.conquest',
  ageUnlock: 'ui.capsules.from.ageUnlock',
  warPath: 'ui.capsules.from.warPath',
};
const CRATE_FROM_KEY: Readonly<Record<PendingCrate['source'], string>> = {
  codex: 'ui.capsules.crateFrom.codex',
  weekly: 'ui.capsules.crateFrom.weekly',
  road: 'ui.capsules.crateFrom.road',
  aeon: 'ui.capsules.crateFrom.aeon',
  welcome: 'ui.capsules.crateFrom.welcome',
};

export function CapsulesScreen(_p: { route: RouteOf<'capsules'> }) {
  const { save, content, t, router, services, locale } = useUi();
  const s = save.value;
  const [info, setInfo] = useState(false);
  const pending = trayCapsules(s, content);
  const items: ShelfItem[] = [...pending.map((c) => ({ kind: 'capsule' as const, c })), ...s.capsules.wardrobe.map((c) => ({ kind: 'crate' as const, c }))];
  const best = items[0] ?? null;
  const rules = bankRules(content);
  const charges = chargesView(s, content, 0);
  const supply = supplyView(s, content);
  const ladder = featureOpen(s, content, 'ladder');
  const clay = Math.min(s.capsules.clayMeter, content.capsules.clayMeterPips);

  const name = (x: ShelfItem): string =>
    x.kind === 'crate' ? t('ui.capsules.crate') : x.c.scriptIndex !== null ? t('ui.capsules.starter') : t(capsuleTierNameKey(x.c.startTier));
  const source = (x: ShelfItem): string =>
    x.kind === 'crate' ? t(CRATE_FROM_KEY[x.c.source]) : x.c.scriptIndex !== null ? t('ui.capsules.starterSource') : t(FROM_KEY[x.c.kind]);
  const open = (x: ShelfItem) => (x.kind === 'crate' ? services.openWardrobe(x.c.id) : services.openCapsule(x.c.id));
  const icon = (x: ShelfItem, size: number) => (x.kind === 'crate' ? <CrateIcon size={size} /> : <CapsuleIcon tier={x.c.startTier} size={size} />);

  const banks = [
    ladder
      ? {
          id: 'charges',
          icon: <ClockIcon size={26} />,
          label: t('ui.home.charges', { n: formatInt(charges.charges, locale), max: formatInt(charges.max, locale) }),
          note: charges.free > 0 ? t('ui.home.freeCapsules', { n: charges.free }) : t('ui.capsules.chargesNote'),
          cap: t('ui.info.bankCap', { n: formatInt(rules.chargesMax, locale) }),
        }
      : null,
    supply.unlocked && supply.moreMatches !== null
      ? {
          id: 'supply',
          icon: <CapsuleIcon tier="bronze" size={28} />,
          label: supply.moreMatches === 1 ? t('ui.home.supplyMoreOne') : t('ui.home.supplyMore', { n: formatInt(supply.moreMatches, locale) }),
          note: null,
          cap: t('ui.info.bankCap', { n: formatInt(rules.supplyMax, locale) }),
        }
      : null,
  ].filter((b): b is NonNullable<typeof b> => b !== null);

  return (
    <ScreenFrame
      id="capsules"
      title={t('warPath.ui.capsulesTitle')}
      onBack={() => router.back()}
      right={<IconButton icon={<InfoIcon size={24} />} label={t('ui.capsules.odds')} onClick={() => setInfo(true)} testid="odds-open" />}
    >
      <div class={`caps${best ? '' : ' is-empty'}`} data-testid="capsules-tab">
        <section class="caps-stage" aria-label={best ? name(best) : t('ui.home.capsules')} data-testid="caps-stage">
          {best ? (
            <>
              <div class="caps-stage__hero">
                <span class="caps-stage__glow" aria-hidden="true" />
                <span class={`caps-stage__drum caps-stage__drum--${best.kind === 'crate' ? 'crate' : best.c.startTier}`} key={best.c.id}>
                  {icon(best, 128)}
                </span>
                <span class="caps-stage__name" data-clip-check="">
                  {name(best)}
                </span>
                <span class="caps-stage__source">{source(best)}</span>
              </div>
              <div class="caps-stage__actions">
                <Button kind="secondary" size="m" icon={<InfoIcon size={20} />} testid="odds-open-stage" onClick={() => setInfo(true)}>
                  {t('ui.capsules.odds')}
                </Button>
                <Button kind="primary" size="l" pulse testid="open-one" icon={best.kind === 'crate' ? <CrateIcon size={24} /> : <CapsuleIcon tier={best.c.startTier} size={26} />} onClick={() => open(best)}>
                  {t('ui.capsules.open')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div class="caps-stage__hero">
                <span class="caps-stage__drum is-empty" aria-hidden="true">
                  <CapsuleIcon tier="bronze" size={96} />
                </span>
                <span class="caps-stage__name">{t('ui.capsules.emptyTitle')}</span>
                <span class="caps-stage__source">{t('ui.home.noCapsules')}</span>
              </div>
              <div class="caps-stage__actions">
                <Button kind="secondary" size="m" icon={<InfoIcon size={20} />} testid="odds-open-stage" onClick={() => setInfo(true)}>
                  {t('ui.capsules.odds')}
                </Button>
              </div>
            </>
          )}
        </section>

        <div class="caps-side">
          {items.length > 1 ? (
            <section class="caps-shelf" aria-label={t('ui.capsules.shelf', { n: items.length })}>
              <header class="caps-shelf__head">
                <h2 class="caps-h">{t('ui.capsules.shelf', { n: items.length })}</h2>
                {pending.length > 1 ? (
                  <Button kind="secondary" size="s" testid="open-all" onClick={() => services.openAllCapsules()}>
                    {t('ui.capsules.openAll', { n: pending.length })}
                  </Button>
                ) : null}
              </header>
              <ul class="caps-shelf__list" data-testid="tray-drums">
                {items.map((x, i) => (
                  <li key={x.c.id} style={{ '--i': Math.min(i, 10) }}>
                    <button
                      type="button"
                      class={`caps-tile${i === 0 ? ' is-best' : ''}${x.kind === 'crate' ? ' caps-tile--crate' : ` caps-tile--${x.c.startTier}`}`}
                      data-testid={x.kind === 'crate' ? `crate-${x.c.id}` : `drum-${x.c.id}`}
                      aria-label={t('ui.home.openOne', { name: name(x) })}
                      onClick={() => open(x)}
                    >
                      <span class="caps-tile__icon">{icon(x, 44)}</span>
                      <span class="caps-tile__name">{name(x)}</span>
                      <span class="caps-tile__source">{source(x)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {banks.length > 0 || clay > 0 ? (
            <section class="caps-banks" aria-label={t('ui.capsules.banks')}>
              {banks.map((b) => (
                <div key={b.id} class="caps-bank" data-testid={b.id}>
                  <span class="caps-bank__icon">{b.icon}</span>
                  <span class="caps-bank__text">
                    <b>{b.label}</b>
                    {b.note ? <span>{b.note}</span> : null}
                    <small>{b.cap}</small>
                  </span>
                </div>
              ))}
              {clay > 0 ? (
                <div class="caps-bank caps-bank--clay" data-testid="clay">
                  <ClayMeter pips={clay} max={content.capsules.clayMeterPips} />
                  <span class="caps-bank__text">
                    <span>{t('ui.capsules.clayNote', { n: content.capsules.clayMeterPips })}</span>
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
      {info ? <CapsuleInfo onClose={() => setInfo(false)} /> : null}
    </ScreenFrame>
  );
}
