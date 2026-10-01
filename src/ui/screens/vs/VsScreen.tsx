/**
 * VS (A9 #4): your card against the AI General's card for 2 s, skippable. Discloses everything the
 * honesty rules ask for (A7.1): the AI badge and "AI General", tier, levels ("Plan Lv 3.4 vs Lv 3"),
 * format, the personality line, Daily Challenge modifiers, warm-up (A6.3) and boss or training
 * disclosures (A7.4). Then the app starts the battle.
 */
import './vs.css';
import { modifierDescKey, modifierNameKey } from '@/content/keys';
import { useEffect, useRef } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { AiBadge, Pill } from '../../components/Chips';
import { BackdropLook, LookFlags } from '../../components/cosmeticArt';
import { formatDec, formatInt, tierNumeral } from '../../components/format';
import { TrophyIcon } from '../../components/icons';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { hudTeamColors } from '../../hud/model';
import { equippedOf, owns } from '../model/cosmetics';
import { generalOf, opponentName, personalityOf } from '../model/opponent';
import { activePlan, formatAges, formatName, planAvgLevel } from '../model/plan';
import { featureOpen, levelNameKey } from '../model/warPath';
import { minutesText } from '../model/homeMode';

/** A9 #4: the VS screen shows for 2 s. */
export const VS_MS = 2000;

/** "No clock · Siege rises every 2½ min from 14:30 · Crumble from 22:00" (A2.10.1), from the format's steps. */
function lastBaseRow(steps: readonly { atMs: number; crumbleBpPerSec: number }[], t: (k: string, p?: Record<string, string | number>) => string): string {
  const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const crumble = steps.find((x) => x.crumbleBpPerSec > 0);
  const every = steps.length > 1 ? minutesText(steps[1]!.atMs - steps[0]!.atMs) : '';
  return t('ui.vs.lastRow', { every, from: clock(steps[0]?.atMs ?? 0), crumble: clock(crumble?.atMs ?? 0) });
}

/** Mode chips; the Tutorial format already reads "Training", so it has none. */
const MODE_KEYS = {
  ladder: 'ui.vs.mode.ladder',
  conquest: 'ui.vs.mode.conquest',
  skirmish: 'ui.vs.mode.skirmish',
  daily: 'ui.vs.mode.daily',
  warPath: 'ui.vs.mode.warPath',
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
  // A18.9.4: both sides' flags, in their team colours (only owned items for the player)
  const teams = hudTeamColors(s.settings.teamPreset, 0);
  const hex = (c: string) => Number.parseInt(c.replace('#', ''), 16);
  const eq = content.cosmetics.collections ? equippedOf(s, content) : null;
  const mine = (k: string | null | undefined) => (k && owns(s, content, k) ? k : null);
  const foeLook = o.side.look;
  const tutorial = request.mode === 'tutorial';
  // Your backdrop skin behind your half, in the age the battle opens with (review 11); the AI's half
  // keeps its team colours, as its half of the lane keeps the classic sky.
  const backdrop = eq ? mine(eq.backdrop) : null;
  const firstAge = formatAges(content, o.format)[0] ?? 'stone';

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
      <div class={`vs__half vs__half--me${backdrop ? ' has-backdrop' : ''}`}>
        {backdrop ? (
          <span class="vs__backdrop" data-testid="vs-backdrop" data-skin={backdrop}>
            <BackdropLook skin={backdrop} age={firstAge} animate={!s.settings.reduceMotion} />
          </span>
        ) : null}
        <div class="vs__card vs__card--me" data-testid="vs-me">
          <Avatar spec={s.profile.avatar} size={120} frameColor="var(--ui-team-me)" />
          <span class="vs__name">{s.profile.name}</span>
          {/* 2.6: trophies only once the Ladder is open; no plan level in the scripted first matches. */}
          {featureOpen(s, content, 'ladder') ? (
            <span class="vs__row">
              <TrophyIcon size={20} />
              {formatInt(s.trophies.current, locale)}
            </span>
          ) : null}
          {tutorial ? null : (
            <span class="vs__level" data-testid="vs-plan-level">
              {avg === null ? t('ui.vs.planLevelNone') : t('ui.vs.planLevel', { n: formatDec(avg, 1, locale) })}
            </span>
          )}
          {eq ? <LookFlags baseFlag={mine(eq.baseFlag)} nationalFlag={mine(eq.nationalFlag)} team={hex(teams.me)} testid="vs-flags-me" still={s.settings.reduceMotion} large /> : null}
        </div>
      </div>
      <div class="vs__half vs__half--foe">
        <div class="vs__card vs__card--foe" data-testid="vs-foe">
          <GeneralPortrait generalId={o.generalId} name={o.displayName} size={120} />
          <AiBadge general />
          <span class="vs__name">{name}</span>
          <span class="vs__row">
            {general?.scripted ? null : <Pill tone="violet">{t('ui.vs.tier', { tier: tierNumeral(o.tier) })}</Pill>}
            {tutorial ? null : (
              <span class="vs__level" data-testid="vs-ai-level">
                {t('ui.vs.aiLevel', { n: o.level })}
              </span>
            )}
          </span>
          {persona ? <span class="vs__personality">{t(persona.personalityKey)}</span> : null}
          {general ? (
            <q class="vs__line" data-testid="vs-line">
              {t(general.lineKey)}
            </q>
          ) : null}
          <span class="vs__rules">{t('ui.ai.sameRules')}</span>
          {foeLook ? <LookFlags baseFlag={foeLook.baseFlag} nationalFlag={foeLook.nationalFlag} team={hex(teams.foe)} testid="vs-flags-foe" still={s.settings.reduceMotion} large /> : null}
        </div>
      </div>
      <div class="vs__emblem" aria-hidden="true">
        <span>{t('ui.vs.vs')}</span>
      </div>
      <footer class="vs__strip">
        <div class="vs__chips">
          {request.mode === 'tutorial' ? null : <Pill tone="blue">{t(MODE_KEYS[request.mode])}</Pill>}
          {request.mode === 'warPath' && content.warPath.levels[request.level] ? (
            <Pill tone="gold" testid="vs-level">
              {t('ui.vs.level', { n: content.warPath.levels[request.level]!.index, name: t(levelNameKey(request.level)) })}
            </Pill>
          ) : (
            <Pill tone="gold" testid="vs-format">
              {formatName(content, t, o.format)}
            </Pill>
          )}
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
          {content.formats[o.format]?.escalation ? (
            <span class="vs__mod" data-testid="vs-last">
              <b>{t('ui.lastBase.title')}</b> {lastBaseRow(content.formats[o.format]!.escalation!, t)}
            </span>
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
