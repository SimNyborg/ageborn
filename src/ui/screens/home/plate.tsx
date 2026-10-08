/**
 * The match plate over Battle (DESIGN A9 #2; spec "online-first Battle hub" 1.4, 2026-10-01): the
 * lobby card. It always shows **exactly what Battle will do**, in one state per situation, as three
 * rows in the same 244 / 340 px box: who you fight (the AI General with the AI chip and tier), the one
 * choice the mode needs, and one line.
 *
 * | State | Opponent row | Choice row | Line |
 * |---|---|---|---|
 * | P1 Training | the onboarding General, AI | none | none |
 * | P2 Ladder, one length | the next AI General (`previewOpponent`) | none | "Short War · 3 ages · up to 8½ min" |
 * | P3 Ladder, several lengths (every arena since 2026-10-03) | as P2 | the length picker (Short, Medium, Long, No clock; locked ones name their arena) | "3 ages · up to 8½ min · win +30 🏆" |
 * | P4 Last Base Standing | as P2 | as P3, No clock lit | "7 ages · no clock · win +48 🏆" and an info button; a first-time caption (queued behind a currency caption) |
 * | P5 Quick Battle | the Quick General for the difficulty | a difficulty stepper | "Short War · 5 Amber per win" |
 * | P6 Daily | today's challenge, AI, its tier | Recruit / Veteran / Warlord | "Today: <modifier> · Medium War" |
 * | P7 Skirmish | the set-up General, AI | the summary and Change | the reward |
 *
 * Under the line, once the saved decks are open (right after the onboarding), the deck switch: the deck
 * Battle plays, one tap away (owner request 2026-10-07; `shared/Decks.tsx`).
 *
 * The online states (P8-P14) live in `online.tsx` and show only in the dev mock until they work.
 * A mode change cross-fades the plate's body (MR-120).
 */
import { formatNameKey, modifierNameKey } from '@/content/keys';
import type { Difficulty } from '@/content/types';
import type { FormatId, OpponentSpec } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { GeneralPortrait } from '../../components/Avatar';
import { Button, IconButton } from '../../components/Button';
import { AiBadge } from '../../components/Chips';
import { Segmented } from '../../components/Controls';
import { formatInt, tierNumeral, withoutAiPrefix } from '../../components/format';
import { CalendarIcon, ChevronIcon, InfoIcon, LastBaseIcon, LockIcon, TrophyIcon } from '../../components/icons';
import { rovingNextIndex } from '../../components/keys';
import { Modal } from '../../components/Modal';
import { useUi } from '../context';
import { opponentName } from '../model/opponent';
import { formatAges, formatName } from '../model/plan';
import { DAILY_DIFFICULTIES, DIFFICULTY_NAME_KEYS, difficultyFlags, ladderWin, lastDifficulty, unlocks } from '../model/progress';
import {
  dailyDifficulty,
  dailyDifficultyFlags,
  type HomeMode,
  lengthOptions,
  type LengthOption,
  minutesText,
  quickGeneralFor,
  skirmishSetup,
  untimed,
} from '../model/homeMode';

/** Short labels for the length picker (whole literals, so the strings check sees them). */
const LEN_KEY: Readonly<Record<string, string>> = {
  short: 'ui.hub.format.short',
  standard: 'ui.hub.format.standard',
  full: 'ui.hub.format.full',
  last: 'ui.hub.format.last',
};
const DAILY_KEY: Readonly<Record<string, string>> = { recruit: 'ui.mode.daily.recruit', veteran: 'ui.mode.daily.veteran', warlord: 'ui.mode.daily.warlord' };
/** The No clock caption's first-seen flag (Home's deck hint waits while it is due, one caption at a time, U8). */
export const LAST_SEEN = 'ui-seen.lastBase';

/** "3 ages · up to 8½ min" or "7 ages · no clock" (one line; the win chip and the info panel say the rest). */
export function lengthLine(content: ReturnType<typeof useUi>['content'], t: ReturnType<typeof useUi>['t'], f: FormatId): string {
  const def = content.formats[f];
  const ages = formatAges(content, f).length;
  if (!def || untimed(content, f)) return t('ui.hub.lineUntimed', { ages });
  return t('ui.hub.lineTimed', { ages, min: minutesText(def.finalBellMs ?? 0) });
}

// ---------------------------------------------------------------------------------------------
// The plate frame
// ---------------------------------------------------------------------------------------------

/** The plate's three rows. `portrait` is the opponent well (a General's portrait or a glyph). */
export function PlateFrame(p: {
  state: string;
  portrait: ComponentChildren;
  /** The AI chip under the portrait: every bot surface carries it (A7.1). */
  ai?: boolean;
  over: ComponentChildren;
  name: ComponentChildren;
  choice?: ComponentChildren;
  line?: ComponentChildren;
  aside?: boolean;
  /** Re-runs the body's cross-fade when it changes (MR-120). */
  swapKey: string;
  extra?: ComponentChildren;
  /** The saved-deck switch at the plate's foot, next to Battle (owner request 2026-10-07). */
  foot?: ComponentChildren;
  class?: string;
}) {
  return (
    <div class={`hub-plate${p.aside ? ' is-away' : ''}${p.class ? ` ${p.class}` : ''}`} data-testid="home-opponent" data-state={p.state}>
      <div class="hub-plate__body" key={p.swapKey}>
        <div class="hub-plate__who">
          <span class="hub-plate__portrait">
            {p.portrait}
            {p.ai ? (
              <span class="hub-plate__ai">
                <AiBadge size="sm" />
              </span>
            ) : null}
          </span>
          <span class="hub-plate__text">
            <span class="hub-plate__over" data-tag="">
              {p.over}
            </span>
            <span class="hub-plate__name" data-clip-check="">
              {/* The AI chip under the portrait is the label here, so a procedural name drops its "AI · " prefix (bug hunt #14). */}
              {p.ai && typeof p.name === 'string' ? withoutAiPrefix(p.name) : p.name}
            </span>
          </span>
        </div>
        {p.choice ? <div class="hub-plate__format">{p.choice}</div> : null}
        {p.line ? p.line : null}
        {p.foot ? <div class="hub-plate__foot">{p.foot}</div> : null}
      </div>
      {p.extra}
    </div>
  );
}

function Portrait(p: { generalId: string | null; label: string }) {
  return p.generalId ? <GeneralPortrait generalId={p.generalId} size={44} label={p.label} /> : <span class="hub-plate__glyph" />;
}

function TierPill(p: { tier: number; testid?: string }) {
  const { t } = useUi();
  return (
    <span class="hub-plate__tier" data-testid={p.testid}>
      {t('ui.vs.tier', { tier: tierNumeral(p.tier) })}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// The length picker (A2.10: Short, Medium, Long, No clock)
// ---------------------------------------------------------------------------------------------

/**
 * Four segments, each ≥ 48 px. A locked length keeps its place with a padlock and says on tap which
 * arena opens it (U12). On a phone plate (< 300 px) the fourth segment stacks the cracked-tower glyph
 * over "No clock" in small type; from 300 px they sit side by side (container query in lobby.css).
 */
export function LengthPicker(p: { value: FormatId; options: readonly LengthOption[]; onChange(f: FormatId): void; testid?: string }) {
  const { t, content, toasts, locale } = useUi();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const open = p.options.map((o, i) => (o.open ? i : -1)).filter((i) => i >= 0);
  const current = p.options.findIndex((o) => o.format === p.value);
  function pick(o: LengthOption, el?: Element | null) {
    if (o.open) {
      p.onChange(o.format);
      return;
    }
    const at = o.opensAt;
    if (at)
      toasts.show(t('ui.hub.lengthLocked', { name: formatName(content, t, o.format), n: at.arena, trophies: formatInt(at.trophies, locale) }), {
        tone: 'info',
        icon: <LockIcon size={20} />,
        // Over the tapped length, not over the currency chips at the top (bug hunt 2026-10-01 #29).
        ...(el ? { anchor: el } : {}),
      });
  }
  function onKey(e: KeyboardEvent, i: number) {
    const pos = open.indexOf(i);
    const next = rovingNextIndex(e.key, pos < 0 ? 0 : pos, open.length, 'both');
    if (next === null) return;
    e.preventDefault();
    const target = open[next]!;
    p.onChange(p.options[target]!.format);
    refs.current[target]?.focus();
  }
  return (
    <div class="ui-seg ui-seg--sm hub-len" role="radiogroup" aria-label={t('ui.hub.lengths')} data-testid={p.testid}>
      {p.options.map((o, i) => {
        const on = o.format === p.value;
        const last = untimed(content, o.format);
        const label = t(LEN_KEY[o.format] ?? formatNameKey(o.format));
        return (
          <button
            key={o.format}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={o.open ? undefined : 'true'}
            aria-label={last ? t('ui.hub.lastAria') : label}
            tabIndex={i === (current >= 0 ? current : (open[0] ?? 0)) ? 0 : -1}
            class={`ui-seg__opt hub-len__opt${on ? ' is-on' : ''}${o.open ? '' : ' is-locked'}${last ? ' is-last' : ''}`}
            data-format={o.format}
            onClick={(e) => pick(o, e.currentTarget)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {last ? (
              <span class="hub-len__glyph">
                <LastBaseIcon size={20} />
              </span>
            ) : null}
            {/* 11 px on phones, so it is tagged (the budget allows 11 px tags). */}
            <span class={last ? 'hub-len__lbl' : undefined} data-tag={last ? '' : undefined}>
              {label}
            </span>
            {o.open ? null : (
              <span class="hub-len__lock" aria-hidden="true">
                <LockIcon size={13} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The Last Base Standing info panel (S17): the rule in plain words, the rewards, the void rule. */
export function LastBaseInfo(p: { onClose(): void }) {
  const { t, content, save, locale } = useUi();
  // Ranked since 2026-10-03: the numbers come from the same rule meta pays (A15.8).
  const win = ladderWin(save.value, content, 'last');
  const loss = content.arenas.ladder.loss;
  const f = content.formats['last'];
  const steps = f?.escalation ?? [];
  const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const every = steps.length > 1 ? minutesText(steps[1]!.atMs - steps[0]!.atMs) : '2½';
  const crumble = steps.find((s) => s.crumbleBpPerSec > 0);
  return (
    <Modal title={t('ui.lastBase.title')} onClose={p.onClose} size="sm" testid="last-info" icon={<LastBaseIcon size={28} />}>
      <ul class="hub-lastInfo">
        <li>{t('ui.lastBase.what')}</li>
        <li>{t('ui.lastBase.siege', { from: clock(steps[0]?.atMs ?? 0), every })}</li>
        <li>{t('ui.lastBase.crumble', { crumble: clock(crumble?.atMs ?? 0), end: minutesText(f?.endByMs ?? 0) })}</li>
        <li>
          {t('ui.lastBase.rewards', {
            trophies: formatInt(win.trophies, locale),
            amber: formatInt(win.amber, locale),
            loss: formatInt(Math.abs(loss.trophies), locale),
            from: formatInt(loss.noLossBelowTrophies, locale),
          })}
        </li>
      </ul>
      <p class="hub-lastInfo__warn">{t('ui.lastBase.closing')}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// The plate in each AI mode
// ---------------------------------------------------------------------------------------------

export function MatchPlate(p: {
  mode: HomeMode;
  opponent: OpponentSpec | null;
  /** The onboarding match Battle starts while it is due (A8), else null. */
  training: 1 | 2 | null;
  format: FormatId;
  onFormat(f: FormatId): void;
  /** Opens the Skirmish setup (P7's Change). */
  onSkirmish(): void;
  aside?: boolean;
  /** Holds the first-seen caption (an unlock moment or a ceremony is on screen, U8). */
  quiet?: boolean;
  /** The saved-deck switch for the plate's foot (owner request 2026-10-07), once decks are open. */
  deck?: ComponentChildren;
}) {
  if (p.training) return <TrainingPlate training={p.training} aside={p.aside} />;
  switch (p.mode) {
    case 'quick':
      return <QuickPlate aside={p.aside} deck={p.deck} />;
    case 'daily':
      return <DailyPlate aside={p.aside} deck={p.deck} />;
    case 'skirmish':
      return <SkirmishPlate aside={p.aside} onChange={p.onSkirmish} deck={p.deck} />;
    default:
      return <LadderPlate {...p} />;
  }
}

function TrainingPlate(p: { training: 1 | 2; aside?: boolean | undefined }) {
  const { t, content } = useUi();
  // Onboarding: the level's General (Old Grogg, then Pip), labelled AI like every bot (A7.1).
  const generalId = content.warPath.levels[content.warPath.order[p.training - 1]!]?.general ?? null;
  const g = generalId ? content.generals.list[generalId as keyof typeof content.generals.list] : undefined;
  const name = g ? t(g.nameKey) : '';
  return (
    <PlateFrame state="training" swapKey="training" aside={p.aside} ai portrait={<Portrait generalId={generalId} label={name} />} over={t('ui.hub.training')} name={name} />
  );
}

function LadderPlate(p: { opponent: OpponentSpec | null; format: FormatId; onFormat(f: FormatId): void; aside?: boolean | undefined; quiet?: boolean | undefined; deck?: ComponentChildren }) {
  const { t, content, save, services, locale } = useUi();
  const s = save.value;
  const o = p.opponent;
  const g = o ? content.generals.list[o.generalId as keyof typeof content.generals.list] : undefined;
  const name = o ? opponentName(o, content, t) : g ? t(g.nameKey) : '';
  const options = lengthOptions(s, content);
  const picker = unlocks(s, content).ladderFormats.length > 1;
  const last = untimed(content, p.format);
  const win = ladderWin(s, content, p.format);
  const [info, setInfo] = useState(false);
  // P4: the first time No clock is picked, one caption says what it means (MR-28), once.
  const [caption, setCaption] = useState(false);
  useEffect(() => {
    if (!last || p.quiet || s.flags[LAST_SEEN]) return;
    setCaption(true);
    const id = setTimeout(() => {
      setCaption(false);
      services.setUiFlags({ [LAST_SEEN]: true });
    }, 5000);
    return () => clearTimeout(id);
  }, [last, p.quiet]);
  // What a win pays here (A15.8), in every length since 2026-10-03 (No clock is ranked too).
  const showWin = picker && win.trophies > 0;
  const winChip = showWin ? (
    <span class="hub-plate__win" data-testid="home-format-win" title={t('ui.hub.winTrophies', { n: formatInt(win.trophies, locale) })} aria-label={t('ui.hub.winTrophies', { n: formatInt(win.trophies, locale) })}>
      +{formatInt(win.trophies, locale)}
      <TrophyIcon size={14} />
    </span>
  ) : null;
  const line = last ? (
    <span class="hub-plate__line">
      <span class={`hub-plate__desc${showWin ? ' has-win' : ''}`} data-testid="home-format-desc">
        <span>{lengthLine(content, t, p.format)}</span>
        {winChip}
      </span>
      <IconButton icon={<InfoIcon size={22} />} label={t('ui.hub.lastInfo')} kind="tertiary" class="hub-plate__info" testid="home-last-info" onClick={() => setInfo(true)} />
    </span>
  ) : (
    <span class={`hub-plate__desc${showWin ? ' has-win' : ''}`} data-testid="home-format-desc">
      <span>{picker ? lengthLine(content, t, p.format) : `${formatName(content, t, p.format)} · ${lengthLine(content, t, p.format)}`}</span>
      {winChip}
    </span>
  );
  return (
    <PlateFrame
      state={last ? 'ladder-last' : picker ? 'ladder' : 'ladder-one'}
      swapKey="ladder"
      aside={p.aside}
      ai
      portrait={<Portrait generalId={o?.generalId ?? null} label={name} />}
      over={
        <>
          {t('ui.hub.opponent')}
          {o ? <TierPill tier={o.tier} testid="home-opponent-tier" /> : null}
        </>
      }
      name={name}
      choice={picker ? <LengthPicker value={p.format} options={options} onChange={p.onFormat} testid="home-format" /> : null}
      line={line}
      foot={p.deck}
      extra={
        <>
          {caption ? (
            <span class="hub-plate__caption wp-caption" role="note" data-testid="caption-last">
              {t('ui.hub.lastCaption', { end: minutesText(content.formats[p.format]?.endByMs ?? 0) })}
            </span>
          ) : null}
          {info ? <LastBaseInfo onClose={() => setInfo(false)} /> : null}
        </>
      }
    />
  );
}

/** P5: the Quick Battle General for the difficulty; a stepper picks the difficulty. */
function QuickPlate(p: { aside?: boolean | undefined; deck?: ComponentChildren }) {
  const { t, content, save, services, locale } = useUi();
  const d = lastDifficulty(save.value, content);
  const order = content.generals.difficulty.order;
  const gid = quickGeneralFor(content, d);
  const tier = content.generals.difficulty.tiers[d];
  const name = t(content.generals.list[gid].nameKey);
  const step = (dir: -1 | 1) => {
    const i = order.indexOf(d) + dir;
    const next = order[i] as Difficulty | undefined;
    if (next) services.setUiFlags(difficultyFlags(next, content));
  };
  const i = order.indexOf(d);
  return (
    <PlateFrame
      state="quick"
      swapKey="quick"
      aside={p.aside}
      ai
      portrait={<Portrait generalId={gid} label={name} />}
      over={
        <>
          {t('ui.hub.opponent')}
          <TierPill tier={tier} testid="home-opponent-tier" />
        </>
      }
      name={name}
      choice={
        <div class="hub-step" role="group" aria-label={t('ui.hub.difficulty')} data-testid="home-difficulty">
          <IconButton icon={<ChevronIcon size={22} left />} label={t('ui.hub.easier')} disabled={i <= 0} reason={t(DIFFICULTY_NAME_KEYS[d])} testid="home-diff-prev" onClick={() => step(-1)} />
          <span class="hub-step__value" aria-live="polite" key={d}>
            <b>{t(DIFFICULTY_NAME_KEYS[d])}</b>
          </span>
          <IconButton icon={<ChevronIcon size={22} />} label={t('ui.hub.harder')} disabled={i >= order.length - 1} reason={t(DIFFICULTY_NAME_KEYS[d])} testid="home-diff-next" onClick={() => step(1)} />
        </div>
      }
      line={
        <span class="hub-plate__desc" data-testid="home-format-desc">
          {t('ui.hub.quickLine', { n: formatInt(content.arenas.ladder.skirmishWinAmber, locale) })}
        </span>
      }
      foot={p.deck}
    />
  );
}

/** P6: today's Daily Challenge; Recruit / Veteran / Warlord on the plate. */
function DailyPlate(p: { aside?: boolean | undefined; deck?: ComponentChildren }) {
  const { t, content, save, services, locale } = useUi();
  const s = save.value;
  const d = dailyDifficulty(s, content);
  const ch = content.dailyModifiers.challenge;
  const modifier = services.dailyModifier();
  const done = s.daily.bank <= 0;
  // Bug hunt 2026-10-01 #22: the plate names today's AI General, as the VS screen does.
  const foe = useMemo(() => services.previewDaily?.(d) ?? null, [s, d]);
  const foeName = foe ? opponentName(foe, content, t) : null;
  return (
    <PlateFrame
      state="daily"
      swapKey="daily"
      aside={p.aside}
      ai
      portrait={
        foe ? (
          <Portrait generalId={foe.generalId} label={foeName ?? ''} />
        ) : (
          <span class="hub-plate__glyph is-daily">
            <CalendarIcon size={30} />
          </span>
        )
      }
      over={
        <>
          {foeName ? t('ui.hub.opponent') : t('ui.ai.general')}
          <TierPill tier={ch.difficulties[d]} testid="home-opponent-tier" />
        </>
      }
      name={foeName ?? t('ui.mode.daily.title')}
      choice={
        <Segmented
          label={t('ui.mode.daily.difficulty')}
          value={d}
          onChange={(v) => services.setUiFlags(dailyDifficultyFlags(v))}
          options={DAILY_DIFFICULTIES.map((x) => ({ value: x, label: t(DAILY_KEY[x]!) }))}
          testid="home-daily-difficulty"
          size="sm"
        />
      }
      line={
        <span class="hub-plate__desc" data-testid="home-format-desc">
          {done
            ? t('ui.hub.dailyDone', { n: formatInt(ch.winAmber, locale) })
            : t('ui.hub.dailyLine', { modifier: modifier ? t(modifierNameKey(modifier)) : '', format: t(formatNameKey(ch.format)) })}
        </span>
      }
      foot={p.deck}
    />
  );
}

/** P7: the last Skirmish setup, with Change (opens the setup, S2d). */
function SkirmishPlate(p: { aside?: boolean | undefined; onChange(): void; deck?: ComponentChildren }) {
  const { t, content, save, locale } = useUi();
  const k = skirmishSetup(save.value, content);
  if (!k) return null;
  const echo = k.generalId === 'echo';
  const g = echo ? undefined : content.generals.list[k.generalId as keyof typeof content.generals.list];
  const name = echo ? t('ui.mode.skirmish.echo') : g ? t(g.nameKey) : '';
  const tier = content.generals.difficulty.tiers[k.difficulty];
  return (
    <PlateFrame
      state="skirmish"
      swapKey="skirmish"
      aside={p.aside}
      ai
      portrait={<Portrait generalId={echo ? null : k.generalId} label={name} />}
      over={
        <>
          {t('ui.vs.mode.skirmish')}
          <TierPill tier={tier} testid="home-opponent-tier" />
        </>
      }
      name={name}
      choice={
        <div class="hub-sum">
          <span class="hub-sum__text" data-clip-check="">
            {t('ui.hub.skirmishLine', { difficulty: t(DIFFICULTY_NAME_KEYS[k.difficulty]), format: formatName(content, t, k.format) })}
          </span>
          <Button kind="secondary" size="s" testid="home-skirmish-change" onClick={p.onChange}>
            {t('ui.hub.change')}
          </Button>
        </div>
      }
      line={
        <span class="hub-plate__desc" data-testid="home-format-desc">
          {k.standardLevels
            ? t('ui.hub.skirmishStd', { n: content.arenas.ladder.standardLevel })
            : t('ui.mode.skirmish.reward', { n: formatInt(content.arenas.ladder.skirmishWinAmber, locale) })}
        </span>
      }
      foot={p.deck}
    />
  );
}
