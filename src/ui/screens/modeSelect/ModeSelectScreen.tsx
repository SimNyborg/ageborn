/**
 * Mode select (A9 #3): Ladder (format picker from Arena 2), Conquest (from Arena 3), Skirmish (from
 * match 4: General or Echo, tier 0-X, format, speed, "Standard levels"; 5 Amber per win) and the
 * Daily Challenge (A9.1). Starting a mode asks the app for the opponent and shows VS.
 */
import './modeSelect.css';
import { ageNameKey, formatNameKey, modifierDescKey, modifierNameKey } from '@/content/keys';
import type { DailyDifficulty, GeneralId } from '@/content/types';
import type { AgeId, FormatId } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { GeneralPortrait } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { AiBadge, Pill } from '../../components/Chips';
import { Segmented, Slider, Toggle } from '../../components/Controls';
import { formatInt, formatSigned, tierNumeral } from '../../components/format';
import { AmberIcon, CalendarIcon, CapsuleIcon, CastleIcon, LockIcon, StarIcon, SwordsIcon, TrophyIcon } from '../../components/icons';
import { ScreenFrame } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import type { MatchRequest, RouteOf } from '../../router';
import { useUi } from '../context';
import { agesAwaitingAntiArmor } from '../model/plan';
import {
  chargesView,
  conquestView,
  DAILY_DIFFICULTIES,
  defaultDailyDifficulty,
  ladderWin,
  unlocks,
  WAR_PLAN_UNLOCK_MATCHES,
} from '../model/progress';
import { useMatchStarter } from '../shared/MatchStarter';

const SPEEDS = [1, 1.5, 2] as const;
const ALL_FORMATS: FormatId[] = ['short', 'standard', 'full'];

function ModeCard(p: {
  id: string;
  tone: 'blue' | 'red' | 'green' | 'gold';
  icon: ComponentChildren;
  title: string;
  desc: string;
  locked?: string | null;
  children?: ComponentChildren;
  action: ComponentChildren;
}) {
  return (
    <article
      class={`mode-card mode-card--${p.tone}${p.locked ? ' is-locked' : ''}`}
      data-testid={`mode-${p.id}`}
      aria-labelledby={`mode-${p.id}-title`}
    >
      <header class="mode-card__head">
        <span class="mode-card__art" aria-hidden="true">
          {p.icon}
        </span>
        <h2 class="mode-card__title" id={`mode-${p.id}-title`}>
          {p.title}
        </h2>
      </header>
      <div class="mode-card__body">
        <p class="mode-card__desc">{p.desc}</p>
        {p.children}
      </div>
      <footer class="mode-card__foot">
        {p.locked ? (
          <span class="mode-card__lock">
            <LockIcon size={22} />
            {p.locked}
          </span>
        ) : (
          p.action
        )}
      </footer>
    </article>
  );
}

function SkirmishSetup(p: { onStart: (req: MatchRequest) => void; onClose: () => void }) {
  const { content, save, t } = useUi();
  const s = save.value;
  const generals = content.generals.order.filter((g) => !content.generals.list[g].scripted);
  const [general, setGeneral] = useState<GeneralId>('pip');
  const [tier, setTier] = useState(3);
  const [format, setFormat] = useState<FormatId>('short');
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(s.settings.defaultSpeed);
  const [standard, setStandard] = useState(false);
  const shortAges: AgeId[] = agesAwaitingAntiArmor(s, content, format);
  const g = content.generals.list[general];
  return (
    <Modal
      title={t('ui.mode.skirmish.setup')}
      onClose={p.onClose}
      size="lg"
      testid="skirmish-setup"
      footer={
        <Button
          variant="green"
          size="lg"
          testid="skirmish-start"
          icon={<SwordsIcon size={26} />}
          onClick={() => p.onStart({ mode: 'skirmish', options: { generalId: general, tier, format, standardLevels: standard }, speed })}
        >
          {t('ui.mode.start')}
        </Button>
      }
    >
      <div class="skirmish">
        <div class="skirmish__generals" role="radiogroup" aria-label={t('ui.mode.skirmish.general')}>
          {generals.map((id) => {
            const on = id === general;
            const def = content.generals.list[id];
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                class={`skirmish__gen${on ? ' is-on' : ''}`}
                onClick={() => setGeneral(id)}
                data-testid={`skirmish-general-${id}`}
              >
                <span class="skirmish__portrait">
                  <GeneralPortrait generalId={id} size={56} />
                  <span class="skirmish__ai">
                    <AiBadge size="sm" />
                  </span>
                </span>
                <span class="skirmish__genname">{t(def.nameKey)}</span>
              </button>
            );
          })}
        </div>
        <div class="skirmish__opts">
          <div class="skirmish__who">
            <AiBadge general />
            <b>{t(g.nameKey)}</b>
            <span class="ui-muted">{t(g.personalityKey)}</span>
          </div>
          {g.mirror ? <p class="skirmish__note">{t('ui.mode.skirmish.echo')}</p> : null}
          <Slider
            label={t('ui.mode.skirmish.tier')}
            value={tier}
            min={0}
            max={content.arenas.ladder.maxTier}
            step={1}
            onChange={setTier}
            format={(v) => tierNumeral(v)}
            testid="skirmish-tier"
          />
          <div class="skirmish__row">
            <span class="skirmish__label">{t('ui.mode.format')}</span>
            <Segmented
              label={t('ui.mode.format')}
              value={format}
              onChange={setFormat}
              options={ALL_FORMATS.map((f) => ({ value: f, label: t(formatNameKey(f)) }))}
              size="sm"
            />
          </div>
          <div class="skirmish__row">
            <span class="skirmish__label">{t('ui.mode.speed')}</span>
            <Segmented
              label={t('ui.mode.speed')}
              value={speed}
              onChange={setSpeed}
              options={SPEEDS.map((v) => ({ value: v, label: t('ui.speed.x', { n: v }) }))}
              size="sm"
            />
          </div>
          <Toggle
            label={t('ui.mode.skirmish.standardLevels')}
            hint={t('ui.mode.skirmish.standardLevelsHint', { n: content.arenas.ladder.standardLevel })}
            checked={standard}
            onChange={setStandard}
            testid="skirmish-standard"
          />
          <p class="skirmish__reward">
            <AmberIcon size={18} /> {t('ui.mode.skirmish.reward', { n: content.arenas.ladder.skirmishWinAmber })}
          </p>
          {shortAges.map((a) => (
            <p key={a} class="skirmish__note" data-testid={`skirmish-note-${a}`}>
              {t('ui.mode.skirmish.threeUnits', { age: t(ageNameKey(a)) })}
            </p>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function ModeSelectScreen(p: { route: RouteOf<'modeSelect'> }) {
  const { save, content, t, locale, router, services, now } = useUi();
  const s = save.value;
  const u = unlocks(s, content);
  const [format, setFormat] = useState<FormatId>(u.ladderFormats[u.ladderFormats.length - 1] ?? 'short');
  const [skirmish, setSkirmish] = useState(p.route.focus === 'skirmish' && u.skirmish);
  const charges = chargesView(s, content, now());
  const conquest = conquestView(s, content);
  const modifier = services.dailyModifier();
  const challenge = content.dailyModifiers.challenge;
  const wonToday = s.daily.bank <= 0;
  const [difficulty, setDifficulty] = useState<DailyDifficulty>(() => defaultDailyDifficulty(s, content));
  const win = ladderWin(s, content, format);

  const starter = useMatchStarter();

  function start(req: MatchRequest) {
    setSkirmish(false);
    starter.start(req);
  }

  return (
    <ScreenFrame id="modeSelect" title={t('ui.mode.title')} onBack={() => router.back()}>
      <div class="modes">
        <ModeCard
          id="ladder"
          tone="blue"
          icon={<TrophyIcon size={64} />}
          title={t('ui.mode.ladder.title')}
          desc={t('ui.mode.ladder.desc')}
          action={
            <Button
              variant="gold"
              size="lg"
              wide
              testid="ladder-start"
              autofocus
              icon={<SwordsIcon size={26} />}
              onClick={() => start({ mode: 'ladder', format })}
            >
              {t('ui.home.battle')}
            </Button>
          }
        >
          {u.formatPicker ? (
            <Segmented
              label={t('ui.mode.format')}
              value={format}
              onChange={setFormat}
              options={u.ladderFormats.map((f) => ({ value: f, label: t(formatNameKey(f)) }))}
              testid="ladder-format"
              size="sm"
            />
          ) : (
            <Pill tone="blue">{t(formatNameKey(format))}</Pill>
          )}
          <p class="mode-card__reward" data-testid="ladder-reward" key={format}>
            <span class="mode-card__rewardLabel">{t('ui.mode.ladder.winPays')}</span>
            <span class="mode-card__rewardItem">
              <TrophyIcon size={18} /> {formatSigned(win.trophies, locale)}
            </span>
            <span class="mode-card__rewardItem">
              <AmberIcon size={18} /> {formatSigned(win.amber, locale)}
            </span>
          </p>
          <p class="mode-card__meta">
            <CapsuleIcon tier="bronze" size={20} />
            {charges.free > 0
              ? t('ui.home.freeCapsules', { n: charges.free })
              : t('ui.home.charges', { n: charges.charges, max: charges.max })}
          </p>
          <p class="mode-card__help">{t('ui.mode.ladder.help')}</p>
        </ModeCard>

        <ModeCard
          id="conquest"
          tone="red"
          icon={<CastleIcon size={64} />}
          title={t('ui.mode.conquest.title')}
          desc={t('ui.mode.conquest.desc')}
          locked={u.conquest ? null : t('ui.lock.arena', { n: u.conquestArena })}
          action={
            <Button variant="red" size="lg" wide testid="conquest-open" onClick={() => router.go({ id: 'conquest' })}>
              {t('ui.mode.conquest.open')}
            </Button>
          }
        >
          <p class="mode-card__meta">
            <StarIcon size={20} />
            {t('ui.conquest.starsOf', { n: conquest.totalStars, max: conquest.maxStars })}
          </p>
          <p class="mode-card__help">{t('ui.mode.conquest.rules')}</p>
        </ModeCard>

        <ModeCard
          id="skirmish"
          tone="green"
          icon={<SwordsIcon size={64} />}
          title={t('ui.mode.skirmish.title')}
          desc={t('ui.mode.skirmish.desc')}
          locked={u.skirmish ? null : t('ui.lock.afterMatches', { n: WAR_PLAN_UNLOCK_MATCHES })}
          action={
            <Button variant="green" size="lg" wide testid="skirmish-open" onClick={() => setSkirmish(true)}>
              {t('ui.mode.skirmish.setup')}
            </Button>
          }
        >
          <p class="mode-card__meta">
            <AmberIcon size={20} />
            {t('ui.mode.skirmish.reward', { n: content.arenas.ladder.skirmishWinAmber })}
          </p>
          <p class="mode-card__help">{t('ui.mode.skirmish.help')}</p>
        </ModeCard>

        <ModeCard
          id="daily"
          tone="gold"
          icon={<CalendarIcon size={64} />}
          title={t('ui.mode.daily.title')}
          desc={t('ui.mode.daily.desc', { format: t(formatNameKey(challenge.format)) })}
          action={
            <Button variant="gold" size="lg" wide testid="daily-start" onClick={() => start({ mode: 'daily', difficulty })}>
              {t('ui.mode.play')}
            </Button>
          }
        >
          <Segmented
            label={t('ui.mode.daily.difficulty')}
            value={difficulty}
            onChange={setDifficulty}
            options={DAILY_DIFFICULTIES.map((d) => ({
              value: d,
              label: t(`ui.mode.daily.${d}`),
              hint: t('ui.vs.tier', { tier: tierNumeral(challenge.difficulties[d]) }),
            }))}
            testid="daily-difficulty"
            size="sm"
          />
          {modifier ? (
            <div class="mode-card__mod" data-testid="daily-modifier">
              <b>{t(modifierNameKey(modifier))}</b>
              <span>{t(modifierDescKey(modifier))}</span>
            </div>
          ) : null}
          <p class="mode-card__meta">
            {wonToday ? <AmberIcon size={20} /> : <CapsuleIcon tier="silver" size={22} />}
            {wonToday
              ? t('ui.mode.daily.wonToday', { n: formatInt(challenge.winAmber, locale) })
              : t('ui.mode.daily.bankReady', { n: formatInt(s.daily.bank, locale) })}
          </p>
          <p class="mode-card__help">{t('ui.mode.daily.rules')}</p>
        </ModeCard>
      </div>
      {skirmish ? <SkirmishSetup onStart={start} onClose={() => setSkirmish(false)} /> : null}
      {starter.dialog}
    </ScreenFrame>
  );
}
