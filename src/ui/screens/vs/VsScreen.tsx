/**
 * VS (A9 #4): your card against the AI General's card for 2 s, skippable. Discloses everything the
 * honesty rules ask for (A7.1): the AI badge and "AI General", tier, levels ("Plan Lv 3.4 vs Lv 3"),
 * format, the personality line, Daily Challenge modifiers, warm-up (A6.3) and boss or training
 * disclosures (A7.4). Then the app starts the battle.
 */
import './vs.css';
import { formatNameKey, modifierDescKey, modifierNameKey } from '@/content/keys';
import { useEffect, useRef } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { AiBadge, Pill } from '../../components/Chips';
import { formatDec, formatInt, tierNumeral } from '../../components/format';
import { TrophyIcon } from '../../components/icons';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { generalOf, opponentName, personalityOf } from '../model/opponent';
import { activePlan, formatAges, planAvgLevel } from '../model/plan';

/** A9 #4: the VS screen shows for 2 s. */
export const VS_MS = 2000;

/** Mode chips; the Tutorial format already reads "Training", so it has none. */
const MODE_KEYS = {
  ladder: 'ui.vs.mode.ladder',
  conquest: 'ui.vs.mode.conquest',
  skirmish: 'ui.vs.mode.skirmish',
  daily: 'ui.vs.mode.daily',
} as const;

export function VsScreen(p: { route: RouteOf<'vs'> }) {
  const { save, content, t, locale, services } = useUi();
  const { opponent: o, request } = p.route;
  const s = save.value;
  const started = useRef(false);
  const begin = () => {
    if (started.current) return;
    started.current = true;
    services.beginBattle(request, o);
  };
  const beginRef = useRef(begin);
  beginRef.current = begin;

  useEffect(() => {
    const id = setTimeout(() => beginRef.current(), VS_MS);
    return () => clearTimeout(id);
  }, []);

  const general = generalOf(content, o.generalId);
  const persona = personalityOf(o, content);
  const plan = activePlan(s, content).plan;
  // Daily Challenge and Skirmish "Standard levels" put every card on both sides at the same level
  // (A9.1, A6.8), so the player's side shows that level, not the owned levels.
  const std = o.standardLevels === true;
  const avg = std ? o.level : planAvgLevel(s, content, plan, formatAges(content, o.format));
  const name = opponentName(o, content, t);

  return (
    <section
      class="ui-screen vs"
      data-screen="vs"
      aria-labelledby="vs-title"
      onClick={begin}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          begin();
        }
      }}
    >
      <h1 id="vs-title" class="ui-sr">
        {t('ui.vs.title', { name })}
      </h1>
      <div class="vs__half vs__half--me">
        <div class="vs__card vs__card--me" data-testid="vs-me">
          <Avatar spec={s.profile.avatar} size={120} frameColor="var(--ui-team-me)" />
          <span class="vs__name">{s.profile.name}</span>
          <span class="vs__row">
            <TrophyIcon size={20} />
            {formatInt(s.trophies.current, locale)}
          </span>
          <span class="vs__level" data-testid="vs-plan-level">
            {avg === null ? t('ui.vs.planLevelNone') : t('ui.vs.planLevel', { n: formatDec(avg, 1, locale) })}
          </span>
        </div>
      </div>
      <div class="vs__half vs__half--foe">
        <div class="vs__card vs__card--foe" data-testid="vs-foe">
          <GeneralPortrait generalId={o.generalId} name={o.displayName} size={120} />
          <AiBadge general />
          <span class="vs__name">{name}</span>
          <span class="vs__row">
            {general?.scripted ? null : <Pill tone="violet">{t('ui.vs.tier', { tier: tierNumeral(o.tier) })}</Pill>}
            <span class="vs__level" data-testid="vs-ai-level">
              {t('ui.vs.aiLevel', { n: o.level })}
            </span>
          </span>
          {persona ? <span class="vs__personality">{t(persona.personalityKey)}</span> : null}
          {general ? (
            <q class="vs__line" data-testid="vs-line">
              {t(general.lineKey)}
            </q>
          ) : null}
          <span class="vs__rules">{t('ui.ai.sameRules')}</span>
        </div>
      </div>
      <div class="vs__emblem" aria-hidden="true">
        <span>{t('ui.vs.vs')}</span>
      </div>
      <footer class="vs__strip">
        <div class="vs__chips">
          {request.mode === 'tutorial' ? null : <Pill tone="blue">{t(MODE_KEYS[request.mode])}</Pill>}
          <Pill tone="gold">{t(formatNameKey(o.format))}</Pill>
          {std ? (
            <Pill tone="green" testid="vs-standard">
              {t('ui.vs.standardLevels', { n: o.level })}
            </Pill>
          ) : null}
          {o.warmUp ? (
            <Pill tone="green" testid="vs-warmup">
              {t('ui.vs.warmUp')}
            </Pill>
          ) : null}
          {o.modifiers.map((m) => (
            <span key={m} class="vs__mod" data-testid={`vs-mod-${m}`}>
              <b>{t(modifierNameKey(m))}</b> {t(modifierDescKey(m))}
            </span>
          ))}
        </div>
        {o.disclosures.length > 0 ? (
          <ul class="vs__disclosures" data-testid="vs-disclosures">
            {o.disclosures.map((d) => (
              <li key={d}>{t(d)}</li>
            ))}
          </ul>
        ) : null}
        <div class="vs__skip">
          <span>{t('ui.vs.skip')}</span>
          <i class="vs__timer" style={{ animationDuration: `${VS_MS}ms` }} />
        </div>
      </footer>
      <button type="button" class="ui-sr" data-autofocus="" onClick={begin}>
        {t('ui.vs.skip')}
      </button>
    </section>
  );
}
