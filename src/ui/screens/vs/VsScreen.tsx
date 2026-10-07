/**
 * VS (A9 #4): your card against the AI General's card for 2 s, skippable. Discloses everything the
 * honesty rules ask for (A7.1): the AI badge and "AI General", tier, levels ("Plan Lv 3.4 vs Lv 3"),
 * format, the personality line, Daily Challenge modifiers, warm-up (A6.3) and boss or training
 * disclosures (A7.4). Then the app starts the battle.
 */
import './vs.css';
import { modifierDescKey, modifierNameKey } from '@/content/keys';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Avatar, GeneralPortrait } from '../../components/Avatar';
import { BannerArt } from '../../components/avatar/ProfileArt';
import { AiBadge, Pill } from '../../components/Chips';
import { BackdropLook, BaseLook, LookFlags } from '../../components/cosmeticArt';
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
/** When the slam sound starts (the CSS `vs-slam` runs 260-780 ms and peaks near 450 ms). */
const VS_SLAM_SOUND_MS = 300;
/** Both Generals turn determined on the slam (AUDIT §4: the mood swaps on the impact). */
const VS_MOOD_MS = 460;

/**
 * The VS shield (AUDIT #10): an embossed steel heater shield split in both team colours, with two
 * crossed swords behind it and the VS lettering on top. It slams in, holds 60 ms and kicks up dust.
 */
function VsShield(p: { label: string }) {
  return (
    <div class="vs__emblem" aria-hidden="true">
      <svg class="vs__shield" viewBox="0 0 120 132">
        <g class="vs__blades">
          <path d="M14 10L22 6L92 104L86 110Z" fill="#c7d0da" stroke="#505357" stroke-width="3" stroke-linejoin="round" />
          <path d="M106 10L98 6L28 104L34 110Z" fill="#c7d0da" stroke="#505357" stroke-width="3" stroke-linejoin="round" />
          <path d="M17 9.4L21 7.4L87 99" stroke="#e9ecf0" stroke-width="2" fill="none" stroke-linecap="round" />
          <path d="M103 9.4L99 7.4L33 99" stroke="#e9ecf0" stroke-width="2" fill="none" stroke-linecap="round" />
          <path d="M76 100L98 118M44 100L22 118" stroke="#5d4717" stroke-width="10" stroke-linecap="round" />
          <path d="M76 100L98 118M44 100L22 118" stroke="#e8b23a" stroke-width="6" stroke-linecap="round" />
          <path d="M70 108L88 94M50 108L32 94" stroke="#5d4717" stroke-width="7" stroke-linecap="round" />
          <path d="M70 108L88 94M50 108L32 94" stroke="#c9a227" stroke-width="3.6" stroke-linecap="round" />
          <circle cx="101" cy="121" r="6" fill="#e8b23a" stroke="#5d4717" stroke-width="2.6" />
          <circle cx="19" cy="121" r="6" fill="#e8b23a" stroke="#5d4717" stroke-width="2.6" />
        </g>
        <path d="M60 18L100 28V64C100 92 82 108 60 118C38 108 20 92 20 64V28Z" fill="#81878e" stroke="#2a2c30" stroke-width="4" stroke-linejoin="round" />
        <path d="M60 25L93 33.6V64C93 87.6 78 101.6 60 110.6Z" fill="var(--ui-team-foe)" />
        <path d="M60 25L27 33.6V64C27 87.6 42 101.6 60 110.6Z" fill="var(--ui-team-me)" />
        <path d="M60 25L93 33.6V64C93 87.6 78 101.6 60 110.6C42 101.6 27 87.6 27 64V33.6ZM60 25L93 33.6V58C93 82 78 95 60 104C42 95 27 82 27 58V33.6Z" fill-rule="evenodd" fill="rgb(0 0 0 / .28)" />
        <path d="M30 36L60 28.4L90 36" stroke="rgb(255 255 255 / .55)" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M60 25V110.6" stroke="#2a2c30" stroke-width="2.4" />
        <circle cx="34" cy="36" r="2.2" fill="#e9ecf0" />
        <circle cx="86" cy="36" r="2.2" fill="#e9ecf0" />
        <circle cx="60" cy="104" r="2.2" fill="#e9ecf0" />
      </svg>
      <span class="vs__vs">{p.label}</span>
      <i class="vs__dust vs__dust--a" />
      <i class="vs__dust vs__dust--b" />
      <i class="vs__dust vs__dust--c" />
      <i class="vs__dust vs__dust--d" />
    </div>
  );
}

/** "No clock · Siege rises every 2½ min from 14:30 · Crumble from 22:00" (A2.10.1), from the format's steps. */
function lastBaseRow(steps: readonly { atMs: number; crumbleBpPerSec: number }[], t: (k: string, p?: Record<string, string | number>) => string): string {
  const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const crumble = steps.find((x) => x.crumbleBpPerSec > 0);
  const every = steps.length > 1 ? minutesText(steps[1]!.atMs - steps[0]!.atMs) : '';
  return t('ui.vs.lastRow', { every, from: clock(steps[0]?.atMs ?? 0), crumble: clock(crumble?.atMs ?? 0) });
}

/** "Siege from 6:30: the side fighting in its own half crumbles" (the timed Siege rope, A2.10.2). */
function ropeRow(steps: readonly { atMs: number }[], t: (k: string, p?: Record<string, string | number>) => string): string {
  const ms = steps[0]?.atMs ?? 0;
  return t('ui.vs.ropeRow', { from: `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` });
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
  const { save, content, t, locale, services, sound } = useUi();
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

  const [clash, setClash] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => beginRef.current(), VS_MS);
    const mood = setTimeout(() => setClash(true), VS_MOOD_MS);
    // The plates slide in on a whoosh and meet on a slam (audit 2026-10-01: the VS was silent). The
    // slam sound has its own 150 ms run-in, timed so its impact lands with the CSS `vs-slam` peak.
    sound?.('ui_whoosh');
    const slam = setTimeout(() => sound?.('vs_slam'), VS_SLAM_SOUND_MS);
    return () => {
      clearTimeout(id);
      clearTimeout(slam);
      clearTimeout(mood);
    };
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
        {/* Each side stands in its own half of the lane: its sky (your backdrop skin, or the age's
            classic sky), its ground and its base (AUDIT #10). */}
        <span class="vs__backdrop" {...(backdrop ? { 'data-testid': 'vs-backdrop', 'data-skin': backdrop } : {})}>
          <BackdropLook skin={backdrop} age={firstAge} animate={!s.settings.reduceMotion} />
        </span>
        <span class="vs__ground" aria-hidden="true" />
        <span class="vs__base vs__base--me" aria-hidden="true">
          <BaseLook age={firstAge} skin={mine(eq?.baseSkins[firstAge])} animate={false} />
        </span>
        <div class="vs__card vs__card--me" data-testid="vs-me">
          <span class="vs__bust">
            <BannerArt id={s.profile.banner} width={186} class="vs__banner" />
            <Avatar spec={s.profile.avatar} size={150} crop="bust" mood={clash ? 'determined' : 'neutral'} frameColor="var(--ui-team-me)" />
          </span>
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
        <span class="vs__backdrop vs__backdrop--foe">
          <BackdropLook skin={null} age={firstAge} animate={false} />
        </span>
        <span class="vs__ground" aria-hidden="true" />
        <span class="vs__base vs__base--foe" aria-hidden="true">
          <BaseLook age={firstAge} skin={foeLook?.baseSkins?.[firstAge] ?? null} animate={false} side={1} />
        </span>
        <div class="vs__card vs__card--foe" data-testid="vs-foe">
          <span class="vs__bust">
            <GeneralPortrait generalId={o.generalId} name={o.displayName} size={150} crop="bust" mood={clash ? 'determined' : 'neutral'} />
          </span>
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
      <VsShield label={t('ui.vs.vs')} />
      <footer class="vs__strip">
        <div class="vs__chips">
          {request.mode === 'tutorial' ? null : <Pill tone="blue">{t(request.mode === 'skirmish' && request.quick ? 'ui.vs.mode.quick' : MODE_KEYS[request.mode])}</Pill>}
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
          {content.formats[o.format]?.escalation && content.formats[o.format]?.finalBellMs === null ? (
            <span class="vs__mod" data-testid="vs-last">
              <b>{t('ui.lastBase.title')}</b> {lastBaseRow(content.formats[o.format]!.escalation!, t)}
            </span>
          ) : content.formats[o.format]?.escalation ? (
            <span class="vs__mod" data-testid="vs-rope">
              <b>{t('ui.vs.ropeTitle')}</b> {ropeRow(content.formats[o.format]!.escalation!, t)}
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
