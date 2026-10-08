/**
 * The Ladder as online ranked play (owner decision 2026-10-07, DESIGN A7.1, A9 #2 and #21): "In the
 * opponent panel it should look like it is searching for an opponent, and after a few seconds it has
 * matched you with an opponent, and then you just play against an AI."
 *
 * Home's Battle starts a simulated matchmaking search in the match plate (the opponent panel):
 *
 * | Phase | Plate | Battle button | Diorama's far base |
 * |---|---|---|---|
 * | idle | a neutral silhouette, "Opponent · Online", "A player", the length picker and the win chip | Battle (gold, the one pulse) | a grey "?" |
 * | searching | a radar sweeping with pings, "Searching" and the time counting up, "Searching for an opponent…", the trophy window and the arena, connection bars, one tip | Cancel (slate, instant; Esc and back too) | fog with a scan beam |
 * | found | the player's avatar slams in with a light burst and sparks, "Opponent found!", their tag, the Player chip, flag, trophies, arena and bars | Battle (tap skips the beat) | their base drops in |
 *
 * The search lasts a natural 2-9 s, now and then a little longer ({@link searchDelayMs}; UI randomness
 * only, it never reaches the match). The opponent is picked when Battle is pressed (meta: the same bot,
 * tier and deck as before, shown as the generated player, `OpponentSpec.side.online`), so the found card,
 * VS, the battle, the Result and the replay all show the same player. After the found beat
 * ({@link FOUND_HOLD_MS}) VS follows. Reduce motion swaps the sweep, pings, slam and burst for fades and
 * glows; the timer still counts and the sounds still play (U14).
 */
import './ranked.css';
import type { FormatId, OpponentSpec } from '@/contracts';
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { Avatar } from '../../components/Avatar';
import { CosmeticImage } from '../../components/cosmeticArt';
import { formatInt } from '../../components/format';
import { SignalIcon, TrophyIcon } from '../../components/icons';
import { useUi } from '../context';
import { rankedWindow } from '../model/homeMode';
import { ladderWin } from '../model/progress';
import { onlineOf } from '../model/opponent';
import { clock, PlayerChip, TIPS } from './online';
import { lengthLine, PlateFrame } from './plate';

export type RankedPhase = 'idle' | 'searching' | 'found';

/** The found beat before VS (the slam, the burst, a moment to read the name). */
export const FOUND_HOLD_MS = 1500;
/** When the found card's slam lands (its sound and haptic): the `hub-slam` keyframes' impact. */
export const FOUND_IMPACT_MS = 210;

/**
 * How long the search runs: a natural 2-9 s, now and then a little longer (owner decision 2026-10-07:
 * "after a few seconds"). Seven in ten searches end within 2-5.5 s, two in ten within 5.5-9 s and the
 * rest within 9-12.5 s. UI randomness (`rand`, default `Math.random`), never the match's.
 */
export function searchDelayMs(rand: () => number = Math.random): number {
  const band = rand();
  const at = rand();
  if (band < 0.72) return Math.round(2000 + at * 3500);
  if (band < 0.94) return Math.round(5500 + at * 3500);
  return Math.round(9000 + at * 3500);
}

/**
 * Asks Home to start a search as soon as it shows (the Result's "Next battle" after a ranked match: a
 * real online game goes back into matchmaking, so the next opponent is found the same way). One shot.
 */
const pendingSearch = signal(false);
export function requestRankedSearch(): void {
  pendingSearch.value = true;
}
/** True once after {@link requestRankedSearch}; Home consumes it when it mounts. */
export function takeRankedSearch(): boolean {
  const v = pendingSearch.peek();
  pendingSearch.value = false;
  return v;
}

/** Set only by the dev screens page (`?dev=1#screens/home-search`): Home holds that phase, frozen. */
export const rankedPreview = signal<{ phase: 'searching' | 'found'; elapsedMs?: number } | null>(null);

let radarIds = 0;

/** The searching portrait: a radar screen with a sweeping beam, blips it lights and sonar pings. */
export function Radar() {
  const id = useMemo(() => `rr${(radarIds = (radarIds + 1) % 1e6)}`, []);
  return (
    <span class="hub-radar" aria-hidden="true">
      <i class="hub-radar__ping" />
      <i class="hub-radar__ping hub-radar__ping--b" />
      <svg class="hub-radar__screen" viewBox="0 0 56 56" width="56" height="56">
        <defs>
          <radialGradient id={`${id}-bg`} cx="0.42" cy="0.36" r="0.7">
            <stop offset="0" stop-color="#1f5a52" />
            <stop offset="1" stop-color="#0a1f22" />
          </radialGradient>
          <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" stop-color="#7dffd2" stop-opacity="0" />
            <stop offset="1" stop-color="#7dffd2" stop-opacity="0.75" />
          </linearGradient>
        </defs>
        <circle cx="28" cy="28" r="26" fill={`url(#${id}-bg)`} />
        <circle cx="28" cy="28" r="18" fill="none" stroke="#3fd6a6" stroke-width="1.2" opacity="0.45" />
        <circle cx="28" cy="28" r="9.5" fill="none" stroke="#3fd6a6" stroke-width="1.2" opacity="0.45" />
        <path d="M28 3V53M3 28H53" stroke="#3fd6a6" stroke-width="1" opacity="0.3" />
        <g class="hub-radar__sweep">
          <path d="M28 28L28 2A26 26 0 0 1 50.5 15Z" fill={`url(#${id}-beam)`} />
          <path d="M28 28L28 2" stroke="#c8ffec" stroke-width="1.6" stroke-linecap="round" />
        </g>
        <circle class="hub-radar__blip hub-radar__blip--a" cx="38" cy="15" r="2.3" />
        <circle class="hub-radar__blip hub-radar__blip--b" cx="41" cy="37" r="1.9" />
        <circle class="hub-radar__blip hub-radar__blip--c" cx="16" cy="40" r="2.1" />
        <circle cx="28" cy="28" r="2.6" fill="#e8fff6" />
        <circle cx="28" cy="28" r="26" fill="none" stroke="#0f1218" stroke-width="2.4" />
      </svg>
    </span>
  );
}

/** "940-1,100 · Arena 4": the trophy window the search pairs in. */
function SearchWindow() {
  const { t, save, content, locale } = useUi();
  const w = rankedWindow(save.value, content);
  return (
    <span class="hub-plate__chip hub-range" data-testid="ranked-window">
      <TrophyIcon size={16} />
      <b class="ui-num">{t('ui.ranked.window', { min: formatInt(w.min, locale), max: formatInt(w.max, locale) })}</b>
      <span class="hub-range__arena">{t('ui.home.arenaN', { n: w.arena })}</span>
    </span>
  );
}

/** Connection bars and the status word ("Online"). */
function Bars(p: { bars: 1 | 2 | 3; label?: boolean }) {
  const { t } = useUi();
  return (
    <span class="hub-bars" title={t('ui.online.vs.connection', { n: p.bars })} data-testid="ranked-bars">
      <SignalIcon size={18} bars={p.bars} />
      {p.label ? (
        <span class="hub-bars__text" data-tag="">
          {t('ui.ranked.online')}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The plate while searching and when the opponent is found. `elapsed` is the search time (counts up);
 * `deck` is the saved-deck switch, kept at the foot but inert (no deck change mid-search).
 */
export function RankedPlate(p: {
  phase: 'searching' | 'found';
  opponent: OpponentSpec;
  elapsed: number;
  format: FormatId;
  aside?: boolean | undefined;
  deck?: ComponentChildren;
}) {
  const { t, content, save, locale } = useUi();
  // What a win pays in this length (A15.8), as on the idle plate.
  const win = ladderWin(save.value, content, p.format).trophies;
  const foot = p.deck ? (
    <div class="hub-plate__inert" inert>
      {p.deck}
    </div>
  ) : null;
  if (p.phase === 'searching') {
    const tip = TIPS[Math.floor(p.elapsed / 6000) % TIPS.length]!;
    return (
      <PlateFrame
        state="ranked-search"
        swapKey="ranked-search"
        aside={p.aside}
        class="is-online is-searching is-ranked"
        portrait={<Radar />}
        over={
          <>
            {t('ui.ranked.searching')}
            <b class="hub-plate__tier is-time ui-num" data-testid="online-elapsed" role="timer" aria-label={t('ui.ranked.searchLabel', { time: clock(p.elapsed) })}>
              {clock(p.elapsed)}
            </b>
          </>
        }
        name={t('ui.ranked.searchingFor')}
        choice={
          <span class="hub-plate__row">
            <SearchWindow />
            <Bars bars={3} label />
          </span>
        }
        line={
          <span class="hub-plate__desc hub-plate__tip" key={tip}>
            {t(tip)}
          </span>
        }
        foot={foot}
        extra={
          <span class="hub-plate__scan" aria-hidden="true">
            <i />
          </span>
        }
      />
    );
  }
  const who = onlineOf(p.opponent);
  const name = who?.name ?? p.opponent.displayName;
  const flag = p.opponent.side.look?.nationalFlag ?? null;
  return (
    <PlateFrame
      state="ranked-found"
      swapKey="ranked-found"
      aside={p.aside}
      class="is-online is-found is-ranked"
      portrait={
        <span class="hub-slam">
          <i class="hub-slam__burst" aria-hidden="true" />
          {who ? <Avatar spec={who.avatar} size={44} label={name} /> : null}
          <i class="hub-slam__flash" aria-hidden="true" />
          <span class="hub-slam__sparks" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <i key={i} style={{ '--i': i }} />
            ))}
          </span>
        </span>
      }
      over={
        <span class="hub-plate__found" data-testid="ranked-found">
          {t('ui.ranked.found')}
        </span>
      }
      name={
        <span class="hub-plate__player" aria-label={t('ui.ranked.foundLabel', { name })}>
          {flag ? (
            <span class="hub-plate__flag" data-testid="ranked-flag">
              <CosmeticImage item={flag} animate={false} />
            </span>
          ) : null}
          <span class="hub-plate__tag" data-testid="ranked-name">
            {name}
          </span>
          <PlayerChip />
        </span>
      }
      choice={
        who ? (
          <span class="hub-plate__row">
            <span class="hub-plate__chip hub-range is-found" data-testid="ranked-trophies">
              <TrophyIcon size={16} />
              <b class="ui-num">{formatInt(who.trophies, locale)}</b>
              <span class="hub-range__arena">{t('ui.home.arenaN', { n: who.arena })}</span>
            </span>
            <Bars bars={who.bars} />
          </span>
        ) : null
      }
      line={
        <span class="hub-plate__desc has-win" data-testid="home-format-desc">
          <span>{lengthLine(content, t, p.format)}</span>
          {win > 0 ? (
            <span class="hub-plate__win" aria-label={t('ui.hub.winTrophies', { n: formatInt(win, locale) })}>
              +{formatInt(win, locale)}
              <TrophyIcon size={14} />
            </span>
          ) : null}
        </span>
      }
      foot={foot}
    />
  );
}
