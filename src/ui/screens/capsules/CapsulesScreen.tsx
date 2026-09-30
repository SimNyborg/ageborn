/**
 * The Capsules tab (S8, ui-plan 2.2, 4.6): everything that is opened, in one place.
 *
 * Left: the stage with the best capsule large (its name and where it came from), "Odds" one tap away
 * (task 2.8: odds in 2 taps) and the one primary, Open (gold, bottom-right of the stage). Every
 * capsule can be opened now: the Sundial never blocks opening. Right: the shelf, one tile per capsule
 * or Wardrobe Crate with its name and source; tapping a tile opens that one. Under the shelf the
 * Sundial card (A6.3, 2026-09-30: the dial, "12 of 34 ready" and the local clock time of the next one,
 * never a countdown) and the other banks, each only after its first progress (2.6), each with its
 * A15.3 cap line ("Holds up to N. When full, it stops filling."). "Open all" (secondary) when 2 or
 * more capsules wait.
 *
 * A Sundial, Supply or Clay meter capsule shows its start tier and kind name until it is opened; a
 * fixed-tier capsule its tier, name and Legendary crests (the 2026-09-29 ladder, A10). The one-time
 * "Two new capsule tiers" card sits at the top of the shelf column and "The Sundial" card right under
 * the Sundial, each until closed.
 */
import './capsules.css';
import type { PendingCapsule, PendingCrate } from '@/contracts';
import { pendingCrests, pendingNameKey, tierCrests, visibleTier } from '../../components/capsuleLook';
import { LadderNotice } from '../../components/LadderNotice';
import { useState } from 'preact/hooks';
import { Button, IconButton } from '../../components/Button';
import { formatInt } from '../../components/format';
import { CapsuleIcon, CloseIcon, CrateIcon, InfoIcon, SundialIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { ClayMeter } from '../../components/Meters';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { CapsuleInfo } from '../home/parts';
import { chargesView, supplyView, trayCapsules } from '../model/progress';
import { featureOpen } from '../model/warPath';
import { SundialCard } from './SundialCard';

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
  const { save, content, t, router, services, locale, now } = useUi();
  const s = save.value;
  const [info, setInfo] = useState(false);
  const pending = trayCapsules(s, content);
  const items: ShelfItem[] = [...pending.map((c) => ({ kind: 'capsule' as const, c })), ...s.capsules.wardrobe.map((c) => ({ kind: 'crate' as const, c }))];
  const best = items[0] ?? null;
  const charges = chargesView(s, content, now());
  const supply = supplyView(s, content);
  const ladder = featureOpen(s, content, 'ladder');
  const clay = Math.min(s.capsules.clayMeter, content.capsules.clayMeterPips);

  const caps = content.capsules;
  const name = (x: ShelfItem): string => (x.kind === 'crate' ? t('ui.capsules.crate') : t(pendingNameKey(caps, x.c)));
  const shown = (x: ShelfItem): string => (x.kind === 'crate' ? 'crate' : visibleTier(caps, x.c));
  const source = (x: ShelfItem): string =>
    x.kind === 'crate' ? t(CRATE_FROM_KEY[x.c.source]) : x.c.scriptIndex !== null ? t('ui.capsules.starterSource') : t(FROM_KEY[x.c.kind]);
  const open = (x: ShelfItem) => (x.kind === 'crate' ? services.openWardrobe(x.c.id) : services.openCapsule(x.c.id));
  const icon = (x: ShelfItem, size: number) =>
    x.kind === 'crate' ? <CrateIcon size={size} /> : <CapsuleIcon tier={visibleTier(caps, x.c)} crests={pendingCrests(caps, x.c)} size={size} />;
  const notice = s.flags['notice.capsuleLadder'] === true;
  const noticeTiers = caps.tierOrder.map((tier) => ({ tier, crests: tierCrests(caps, tier) })).filter((x) => x.crests > 0);

  const sundialNotice = s.flags['notice.sundial'] === true;
  const sundialNoticeEl = (
    <SundialNotice hours={charges.hours} max={charges.max} supplyLeft={supply.moreMatches !== null} onClose={() => services.dismissNotice('sundial')} />
  );
  // The Supply Capsule retired into the Sundial (A15.4): its row shows only while old allowance is left.
  const banks = [
    supply.moreMatches !== null
      ? {
          id: 'supply',
          icon: <CapsuleIcon tier="bronze" size={28} />,
          label:
            supply.moreMatches === 1
              ? t('ui.capsules.supplyLegacyOne', { n: formatInt(supply.bank, locale) })
              : t('ui.capsules.supplyLegacy', { n: formatInt(supply.bank, locale), m: formatInt(supply.moreMatches, locale) }),
          note: null,
          cap: null,
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
                <span class={`caps-stage__drum caps-stage__drum--${shown(best)}`} key={best.c.id}>
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
                <Button kind="primary" size="l" pulse testid="open-one" icon={best.kind === 'crate' ? <CrateIcon size={24} /> : <CapsuleIcon tier={visibleTier(caps, best.c)} size={26} />} onClick={() => open(best)}>
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
          {/* The Sundial notice sits under the Sundial card (so the dial stays above the fold at 844x390);
              only without the card (Ladder not open yet) does it lead the column. */}
          {sundialNotice && !ladder ? sundialNoticeEl : null}
          {notice ? (
            <LadderNotice tiers={noticeTiers} legacy={services.legacySkillAeons()} onClose={() => services.dismissNotice('capsuleLadder')} />
          ) : null}
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
                      class={`caps-tile${i === 0 ? ' is-best' : ''} caps-tile--${shown(x)}`}
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

          {ladder || banks.length > 0 || clay > 0 ? (
            <section class="caps-banks" aria-label={t('ui.capsules.banks')}>
              {ladder ? <SundialCard save={s} content={content} t={t} locale={locale} now={now} /> : null}
              {sundialNotice && ladder ? sundialNoticeEl : null}
              {banks.map((b) => (
                <div key={b.id} class="caps-bank" data-testid={b.id}>
                  <span class="caps-bank__icon">{b.icon}</span>
                  <span class="caps-bank__text">
                    <b>{b.label}</b>
                    {b.note ? <span>{b.note}</span> : null}
                    {b.cap ? <small>{b.cap}</small> : null}
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

/**
 * The one-time "The Sundial" card (2026-09-30; DESIGN A6.3, B8 step 4): for saves that played before
 * the Sundial (save v10 sets `flags['notice.sundial']`). No timer, no expiry, no badge, never on Home;
 * closing it clears the flag.
 */
function SundialNotice(p: { hours: number; max: number; supplyLeft: boolean; onClose: () => void }) {
  const { t } = useUi();
  return (
    <section class="cap-notice ui-rm-own" data-testid="sundial-notice" aria-labelledby="sundial-notice-title">
      <header class="cap-notice__head">
        <span class="cap-notice__icons" aria-hidden="true">
          <SundialIcon size={40} class="sundial-glyph" />
        </span>
        <b id="sundial-notice-title" class="cap-notice__title">
          {t('ui.notice.sundial.title')}
        </b>
        <IconButton icon={<CloseIcon size={22} />} label={t('ui.common.close')} kind="tertiary" onClick={p.onClose} testid="sundial-notice-close" />
      </header>
      {/* The Supply sentence only for saves that still have allowance left (A15.3: say only what is true). */}
      <p class="cap-notice__body">{t(p.supplyLeft ? 'ui.notice.sundial.body' : 'ui.notice.sundial.bodyNoSupply', { h: p.hours, max: p.max })}</p>
    </section>
  );
}
