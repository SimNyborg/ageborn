/**
 * The onboarding's one forced upgrade (DESIGN A8 ~9:00: "One forced upgrade: Bonker to L2 (hammer
 * slam)", text "+5% HP and damage"; A6.6 "the upgrade itself is a reward moment").
 *
 * It shows once, right after capsule 2 (the onboarding step is Home), over the Home screen, and plays
 * the same moment as every later upgrade (ui-plan 6.6, MR-39): Card detail's stage with the Bonker on
 * its lane and the lg card over it, the HP and Damage rows with their green gains, and one green
 * Upgrade button (the one primary and pulse). The tap applies `meta.upgrade` and saves at once (B8);
 * then the card charges for 500 ms (the first upgrade's longer anticipation), the burst, hammer and
 * "Level 2" banner land, the level flips and the rows tick with "+N". A tap on the stage skips to the
 * end. "Continue" closes it; `flags['tutorial.firstUpgrade']` keeps it from showing again. If the
 * upgrade is not possible (an imported save, a card already upgraded) it never shows.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { SaveDoc } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import { upgradeBlocker, upgradeCost } from '@/meta';
import { asContent } from '@/content';
import { isMetaRules } from '../uiServices';
import { useApp } from './context';
import { Button } from '@/ui/components/Button';
import { formatInt } from '@/ui/components/format';
import { haptic } from '@/ui/components/haptics';
import { AmberIcon } from '@/ui/components/icons';
import { UiKitContext, type UiKit } from '@/ui/components/kit';
import { useBlockingOverlay } from '@/ui/components/overlay';
import { CardStage } from '@/ui/screens/cardDetail/CardStage';
import { cardDef, cardGlyph, cardTile, unitStats, type StatRow } from '@/ui/screens/model/cards';

export const FIRST_UPGRADE_FLAG = 'tutorial.firstUpgrade';
export const FIRST_UPGRADE_CARD = 'bonker';

/** True when the forced upgrade should show now. */
export function firstUpgradeDue(s: SaveDoc | null, step: string): boolean {
  if (!s || step !== 'home' || s.flags[FIRST_UPGRADE_FLAG]) return false;
  const e = s.collection[FIRST_UPGRADE_CARD];
  return !!e && e.level === 1 && s.tutorial.step >= 4;
}

/** 'offer', then the MR-39 beats ('charge', 'impact'), then 'done'. */
type Phase = 'offer' | 'charge' | 'impact' | 'done';

/** The first upgrade's anticipation is longer than the usual 300 ms (MR-39). */
const CHARGE_MS = MOTION_DUR.medium + MOTION_DUR.small - 20;
/** MR-39 after the charge: burst, hold, level flip, stat ticks and chips. */
const IMPACT_MS = MOTION_DUR.beatMax - MOTION_DUR.medium;

const ROWS: readonly StatRow['id'][] = ['hp', 'damage'];
const ROW_KEY: Partial<Record<StatRow['id'], string>> = {
  hp: 'app.upgrade.hp',
  damage: 'app.upgrade.damage',
};

export function FirstUpgrade() {
  const ui = useApp();
  const c = ui.controller;
  const save = c.save.value;
  const step = c.step.value;
  const route = c.route.value;
  const meta = ui.services.meta;
  const [phase, setPhase] = useState<Phase>('offer');
  const due = phase !== 'offer' || (route.id === 'title' && firstUpgradeDue(save, step));
  const content = ui.services.content;
  const typed = isMetaRules(meta) ? asContent(content) : null;
  const blocked = save && typed ? upgradeBlocker(save, FIRST_UPGRADE_CARD, typed) : 'noMeta';
  const reduce = save?.settings.reduceMotion ?? false;
  const kit: UiKit = useMemo(
    () => ({
      t: ui.t,
      locale: 'en',
      portrait: ui.art.portrait.bind(ui.art),
      reduceMotion: reduce,
      sound: (id: string) => ui.services.audio.play(id),
    }),
    [ui, reduce],
  );

  // A save that cannot take the upgrade never sees the step.
  useEffect(() => {
    if (phase === 'offer' && route.id === 'title' && firstUpgradeDue(save, step) && blocked !== null && save) {
      c.setSave({ ...save, flags: { ...save.flags, [FIRST_UPGRADE_FLAG]: true } });
    }
  }, [phase, route.id, save, step, blocked]);

  // MR-39's beats: the charge, then the impact (burst, hammer, level flip, rows), then rest.
  useEffect(() => {
    if (phase !== 'charge' && phase !== 'impact') return undefined;
    const quick = reduce || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const timer = setTimeout(
      () => {
        if (phase === 'charge') {
          setPhase('impact');
          haptic('heavy');
          ui.services.audio.play('upgrade_slam', { priority: 1 });
        } else setPhase('done');
      },
      phase === 'charge' ? (quick ? 0 : CHARGE_MS) : quick ? MOTION_DUR.beatMin : IMPACT_MS,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  const open = due && !!save && !!typed && isMetaRules(meta) && !(phase === 'offer' && blocked !== null);
  // Home under it drops its primary and pulse and holds its ceremonies until this closes (U1, U13).
  useBlockingOverlay(open);
  if (!open || !save || !typed || !isMetaRules(meta)) return null;
  const def = cardDef(typed, FIRST_UPGRADE_CARD);
  const tile = cardTile(save, typed, FIRST_UPGRADE_CARD, ui.t);
  if (!def || def.kind !== 'unit' || !tile) return null;
  const cost = upgradeCost(typed, FIRST_UPGRADE_CARD, 1);
  const level = tile.level;
  const offer = phase === 'offer';
  // Before the tap the rows show the next level's gain; after it, the gain the upgrade just made.
  const now = unitStats(typed, def, level).filter((r) => ROWS.includes(r.id));
  const before = offer ? null : unitStats(typed, def, level - 1);

  const upgrade = (): void => {
    const s = c.save.peek();
    if (!s) return;
    const r = meta.upgrade(s, FIRST_UPGRADE_CARD, content);
    if (!r.ok) {
      c.setSave({ ...s, flags: { ...s.flags, [FIRST_UPGRADE_FLAG]: true } });
      return;
    }
    c.setSave({ ...r.value, flags: { ...r.value.flags, [FIRST_UPGRADE_FLAG]: true } }, { immediate: true });
    ui.services.audio.play('level_up', { priority: 1 });
    setPhase('charge');
  };

  return (
    <UiKitContext.Provider value={kit}>
      <div
        class={`ui-root ab-upgrade ab-upgrade--${phase}`}
        data-testid="first-upgrade"
        data-phase={offer ? 'offer' : phase === 'done' ? 'done' : 'slam'}
        data-reduce-motion={reduce ? 'true' : undefined}
      >
        <div class="ab-upgrade-panel" role="dialog" aria-modal="true" aria-labelledby="ab-upgrade-title">
          <h2 class="ab-upgrade-title" id="ab-upgrade-title">
            {ui.t(offer ? 'tutorial.upgrade.title' : 'tutorial.upgrade.done')}
          </h2>
          <div class="ab-upgrade-body">
            <CardStage
              tile={tile}
              kind="unit"
              glyph={cardGlyph(def)}
              owned
              copies={null}
              ceremony={phase === 'charge' || phase === 'impact' ? { phase, n: 1 } : null}
              armed={offer}
              onSkip={() => setPhase('done')}
              testid="first-upgrade-stage"
              levelTestid="first-upgrade-level"
            />
            <div class="ab-upgrade-side">
              <ul class="ab-upgrade-rows" aria-label={ui.t('ui.card.stats')}>
                {now.map((r, i) => {
                  const prev = before?.find((x) => x.id === r.id);
                  const v = typeof r.value === 'number' ? r.value : 0;
                  const next = offer && typeof r.next === 'number' ? r.next - v : 0;
                  const gain = !offer && prev && typeof prev.value === 'number' ? v - prev.value : 0;
                  return (
                    <li key={r.id} class={`ab-upgrade-row${gain && phase !== 'charge' ? ' is-tick' : ''}`} style={{ '--i': i }}>
                      <span class="ab-upgrade-row__label">{ui.t(ROW_KEY[r.id]!)}</span>
                      <span class="ab-upgrade-row__value ui-num">
                        {formatInt(phase === 'charge' && prev && typeof prev.value === 'number' ? prev.value : v, 'en')}
                        {next > 0 ? <span class="ab-upgrade-row__next">{ui.t('ui.card.nextDelta', { n: formatInt(next, 'en') })}</span> : null}
                        {gain > 0 && phase !== 'charge' ? <span class="ab-upgrade-row__gain">{ui.t('ui.card.nextDelta', { n: formatInt(gain, 'en') })}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {offer ? (
                <p class="ab-upgrade-hint">{ui.t('tutorial.upgrade.gain')}</p>
              ) : (
                <p class={`ab-upgrade-gain${phase === 'charge' ? ' is-waiting' : ''}`} data-testid="first-upgrade-gain">
                  {ui.t('tutorial.upgrade.gain')}
                </p>
              )}
              <div class="ab-upgrade-actions">
                {offer ? (
                  <Button kind="progress" size="l" primary pulse testid="first-upgrade-go" icon={<AmberIcon size={24} />} onClick={upgrade}>
                    {cost ? ui.t('ui.card.upgradeAction', { n: formatInt(cost.amber, 'en') }) : ui.t('app.upgrade.go')}
                  </Button>
                ) : (
                  <Button kind="primary" size="l" pulse={phase === 'done'} testid="first-upgrade-continue" onClick={() => setPhase('offer')}>
                    {ui.t('app.next')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </UiKitContext.Provider>
  );
}
