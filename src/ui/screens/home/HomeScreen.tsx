/**
 * Home is the Battle hub (S2; owner decision 2026-09-30, ui-plan 2.3), laid out as the lobby of a
 * 2-player online game (owner request 2026-10-01; spec "online-first Battle hub"). The game's main
 * point is the 1v1 battle (online later, the Ladder against labelled AI opponents today), so it is the
 * first thing a player sees and Battle is the one primary on Home. The War Path campaign is the
 * offline side road, one tap away on its card.
 *
 * - **Stage** (full bleed): the arena's sky and skyline (`ArenaScene`) with the arena diorama in the
 *   centre: your base and the opponent's across the lane, the arena's landmark behind (`Diorama`).
 *   Under it the arena's name and the trophy bar to the next Trophy Road reward (once the Ladder is open).
 * - **Top bar**: the profile chip (trophies once the Ladder is open), the Sundial mark, the Amber and
 *   Dust chips, the gear.
 * - **Left**: the War Path card (after the onboarding) and the four capsule slots (once Capsules open).
 * - **Right, over Battle**: the match plate, the lobby card that always shows exactly what Battle will
 *   do (`plate.tsx`: who you fight, with the AI chip in the AI modes; the one choice the mode needs,
 *   like the battle length; one line), and **Battle** (gold, XL, bottom-right, the only primary and the
 *   one pulse), with the **mode switcher** to its left once open (3 wins). The switcher shows the mode
 *   Battle plays ("Ranked · Online", "Quick · vs AI"); its panel selects a mode and never starts one.
 *   The five tabs are the shell's bottom bar.
 *
 * **The Ladder is online ranked play** (owner decision 2026-10-07, `ranked.tsx`): Battle starts a
 * simulated matchmaking search in the plate (a radar, the time counting up, the trophy window; Battle
 * becomes Cancel), and after a natural 2-9 s the plate slams in the found player (their tag, avatar,
 * flag, trophies, arena and the Player chip); then VS. The match is the same Ladder match against the
 * AI bot matchmaking picked; only its presentation is the found player.
 *
 * While the onboarding runs (A8), Battle starts its matches (the training match vs Old Grogg, then
 * match 2 vs Pip; both are War Path Stone L1 and L2). Feature unlocks play here (MR-40).
 *
 * Real online play (Friend Duel at M2, Online Battle at M4) has its plate states, search, room and VS
 * in `online.tsx`; they render only in the dev mock (`onlineMock`) until they work (spec 1.8).
 */
import './home.css';
import './hub.css';
import '../warPath/warPath.css';
import './lobby.css';
import type { AgeId, CardId, FormatId, Loadout, OpponentSpec } from '@/contracts';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Wordmark } from '../../components/Wordmark';
import { Button } from '../../components/Button';
import { haptic } from '../../components/haptics';
import { SwordsIcon } from '../../components/icons';
import { useKit } from '../../components/kit';
import { fly } from '../../components/motion';
import { blockingOverlays } from '../../components/overlay';
import { pushBackHandler } from '../../history';
import type { MatchRequest, RouteOf, TabId } from '../../router';
import { useUi } from '../context';
import { hudTeamColors } from '../../hud/model';
import { equippedOf, owns } from '../model/cosmetics';
import { battleRequest, homeMode, homeModeFlags, ladderFormat, ladderFormatFlags, quickGeneralFor, skirmishSetup, untimed, type HomeMode } from '../model/homeMode';
import { decksOpen, formatAges, reachedAges } from '../model/plan';
import { arenaOf, lastDifficulty } from '../model/progress';
import { featureOpen, firstUpgradePending, pendingUnlock, unlockFlag, type HomeUnlock } from '../model/warPath';
import { askFullscreen } from '../shared/fullscreen';
import { useMatchStarter } from '../shared/MatchStarter';
import { DeckSwitch, deckHintDue } from '../shared/Decks';
import { ModesSheet } from '../warPath/ModesSheet';
import { TAB_ROOTS } from '../warPath/shell';
import { ArenaScene } from './ArenaScene';
import { Diorama, type FoeLook } from './Diorama';
import { ArenaTitle, CampaignCard, CapsuleSlots, HubProfile, HubTopRight, pendingCurrencyCaption, TrophyBar, UnlockPointer } from './hub';
import { JoinPanel, onlineLengths, onlineMock, OnlinePlate, OnlineVs, RoomPanel, useElapsed, type OnlineState } from './online';
import { LAST_SEEN, MatchPlate } from './plate';
import { FOUND_HOLD_MS, FOUND_IMPACT_MS, RankedPlate, rankedPreview, searchDelayMs, takeRankedSearch, type RankedPhase } from './ranked';
import { FriendSoonChip, ModeSwitcher, type SwitcherMode } from './switcher';

/** The ranked Ladder's search (owner decision 2026-10-07): the prepared match it reveals, and its phase. */
type Ranked = { phase: 'idle' } | { phase: Exclude<RankedPhase, 'idle'>; req: MatchRequest; opponent: OpponentSpec; frozen?: boolean; elapsedMs?: number };

const UNLOCK_TAB: Readonly<Partial<Record<HomeUnlock, TabId>>> = { army: 'army', capsules: 'capsules', customize: 'customize', progress: 'progress' };

/** The onboarding match Battle starts while it is due (A8): step 0 is match 1, step 2 is match 2. */
export function trainingDue(step: number): 1 | 2 | null {
  if (step >= 4) return null;
  return step < 2 ? 1 : 2;
}

/** The last age of `ages` that the player has reached (else the first of `ages`). */
function dioramaAge(ages: readonly AgeId[], reached: readonly AgeId[]): AgeId | undefined {
  return [...ages].reverse().find((a) => reached.includes(a)) ?? ages[0];
}

/** A loadout's first two troops (the ones that walk out first). */
function frontline(l: Loadout | undefined): CardId[] {
  return (l?.units ?? []).filter((c): c is CardId => !!c).slice(0, 2);
}

export function HomeScreen(_p: { route: RouteOf<'home'> }) {
  const { save, content, t, router, services, toasts } = useUi();
  const kit = useKit();
  const s = save.value;
  const reduce = s.settings.reduceMotion;

  // Home is the Battle tab's root (2.2); a reset to Home after a flow keeps the tab shell.
  useLayoutEffect(() => {
    if (router.tab.peek() !== 'battle' && router.stack.peek().length === 1) router.adoptTab('battle');
  }, []);

  const training = trainingDue(s.tutorial.step);
  const ladderOpen = featureOpen(s, content, 'ladder') && !training;
  const campaignOpen = featureOpen(s, content, 'campaign');
  const capsulesOpen = featureOpen(s, content, 'capsules');
  const modesOpen = featureOpen(s, content, 'modes');
  const armyOpen = featureOpen(s, content, 'army');
  const arena = arenaOf(s, content);

  // ---- The mode Battle plays (the switcher), and the dev-only online mock -----------------------
  const mock = onlineMock.value;
  const aiMode: HomeMode = training || !modesOpen ? 'ladder' : homeMode(s, content);
  const [mockMode, setMockMode] = useState<SwitcherMode | null>(mock ? mock.mode : null);
  const onlineMode = mock && (mockMode === 'online' || mockMode === 'friend') && !training ? mockMode : null;
  const mode: SwitcherMode = onlineMode ?? aiMode;
  const format = ladderFormat(s, content);
  const [onlineFormat, setOnlineFormat] = useState<FormatId>('short');
  // The Ladder is online ranked play (owner decision 2026-10-07): its opponent is unknown until the
  // search finds one, so nothing is previewed (the AI modes show their General on the plate).
  const rankedOn = ladderOpen && mode === 'ladder';

  // ---- The ranked Ladder's simulated search (ranked.tsx): idle → searching → found → VS ----------
  const [ranked, setRanked] = useState<Ranked>({ phase: 'idle' });
  const rankedRef = useRef(ranked);
  rankedRef.current = ranked;
  const rankedBusy = ranked.phase !== 'idle';
  const rankedElapsed = useElapsed(ranked.phase === 'searching' && !ranked.frozen, ranked.phase === 'idle' ? 0 : (ranked.elapsedMs ?? 0));
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (leaving.current) clearTimeout(leaving.current);
  }, []);

  // ---- Online flow (mock): search counts up, the AI is offered after 25 s, Found, VS ------------
  const [ostate, setOstate] = useState<OnlineState>(mock?.state ?? 'idle');
  const [room, setRoom] = useState<'host' | 'join' | null>(mock?.room ?? null);
  const [vs, setVs] = useState(!!mock?.vs);
  const searching = !!onlineMode && ostate === 'searching';
  const elapsed = useElapsed(searching, mock?.elapsedMs ?? 0);
  useEffect(() => {
    if (!searching || !mock || mock.foundAfterMs === null || mock.foundAfterMs === undefined) return;
    if (elapsed < mock.foundAfterMs) return;
    // MR-122 / MR-123: the fog clears, the plate flashes the player for 0.6 s, then VS.
    setOstate('found');
    kit.sound?.('ui_confirm');
    const id = setTimeout(() => setVs(true), 600);
    return () => clearTimeout(id);
  }, [searching, elapsed]);
  // Esc and back cancel a search (1.5); while searching the tab bar dims and does not respond.
  useEffect(() => {
    if (!searching) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOstate('idle');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searching]);

  // The diorama shows both bases in the furthest age of the war's window you have reached (the age
  // the war builds up to); yours wears your base skin (A18.9.4).
  const playFormat: FormatId = onlineMode
    ? onlineFormat
    : mode === 'quick'
      ? 'short'
      : mode === 'daily'
        ? content.dailyModifiers.challenge.format
        : mode === 'skirmish'
          ? (skirmishSetup(s, content)?.format ?? format)
          : format;
  const age = dioramaAge(formatAges(content, playFormat), reachedAges(s, content)) ?? content.order.ages[0]!;
  const eq = content.cosmetics.collections ? equippedOf(s, content) : null;
  const skin = eq?.baseSkins?.[age] ?? null;
  const mySkin = skin && owns(s, content, skin) ? skin : null;
  // The ranked Ladder's found player: their base look and frontline drop in when the search ends.
  const found = ranked.phase === 'found' ? ranked.opponent : null;
  const foeSkin = found?.side.look?.baseSkins?.[age] ?? null;
  const teams = hudTeamColors(s.settings.teamPreset, 0);
  // Each side's frontline troops in the lane: your active War Plan's, and the opponent's own plan (the
  // training General's during the onboarding, the Quick or Skirmish General's in those modes, the found
  // player's once the ranked search has found one).
  const plan = s.warPlans[s.activePlan] ?? s.warPlans[0];
  const mine = frontline(plan?.loadouts[age]);
  const trainingGeneral = training ? content.warPath.levels[content.warPath.order[training - 1]!]?.general : undefined;
  const modeGeneral = mode === 'quick' ? quickGeneralFor(content, lastDifficulty(s, content)) : mode === 'skirmish' ? skirmishSetup(s, content)?.generalId : undefined;
  const planGeneral = trainingGeneral ?? modeGeneral;
  const generalPlan = planGeneral ? content.generals.list[planGeneral as keyof typeof content.generals.list]?.warPlan : null;
  const foeUnits = frontline(found ? found.side.loadouts[age] : generalPlan?.[age]);
  const foe = foeUnits.length > 0 ? foeUnits : mine;
  // Online (the ranked Ladder, and the mock's modes) the far base is a "?" until a player is found; it
  // fogs while searching and drops in once found (spec 1.6, MR-121, MR-122).
  const foeLook: FoeLook = onlineMode
    ? ostate === 'found'
      ? 'found'
      : searching
        ? 'searching'
        : 'unknown'
    : rankedOn
      ? ranked.phase === 'found'
        ? 'found'
        : ranked.phase === 'searching'
          ? 'searching'
          : 'unknown'
      : 'ai';

  // ---- MR-40: a feature that just opened (never for a legacy save) ------------------------------
  const covered = blockingOverlays.value > 0;
  // An app overlay on top, or the onboarding's forced first upgrade still to come, holds the unlock
  // moment until it has closed, so the moment is never used up underneath it (U8, U13).
  const held = covered || firstUpgradePending(s);
  const [unlock, setUnlock] = useState<HomeUnlock | null>(null);
  /** A second feature that opened at the same time and shares the moment (the Ladder with the War Path). */
  const [unlockAlso, setUnlockAlso] = useState<HomeUnlock | null>(null);
  // One new thing per return to Home (U8): at most one unlock moment per visit.
  const unlockShown = useRef(false);
  useEffect(() => {
    if (unlockShown.current || held) return;
    const f = pendingUnlock(s, content);
    if (!f) return;
    unlockShown.current = true;
    // The Ladder and the War Path both arrive when the onboarding ends: one combined moment.
    const also: HomeUnlock | null = f === 'ladder' && featureOpen(s, content, 'campaign') && !s.flags[unlockFlag('campaign')] ? 'campaign' : null;
    services.setUiFlags({ [unlockFlag(f)]: true, ...(also ? { [unlockFlag(also)]: true } : {}) });
    setUnlock(f);
    setUnlockAlso(also);
    kit.sound?.('ui_unlock');
  }, [s, held]);

  // ---- Battle ---------------------------------------------------------------------------------
  const [modes, setModes] = useState(false);
  /** The card the Modes panel opens on (the Friend Duel chip opens it on Friend Duel's note). */
  const [modesFocus, setModesFocus] = useState<SwitcherMode | null>(null);
  const [launching, setLaunching] = useState(false);
  const starter = useMatchStarter();

  /** MR-15: Battle dips, the diorama leans in and the clash flares, then VS (an AI match never searches). */
  function launch(req: MatchRequest) {
    setUnlock(null);
    askFullscreen();
    if (reduce) {
      starter.start(req);
      return;
    }
    setLaunching(true);
    kit.sound?.('ui_whoosh');
    setTimeout(() => {
      if (!starter.start(req)) setLaunching(false);
    }, 220);
  }

  // ---- The ranked Ladder (owner decision 2026-10-07): the simulated search, then VS --------------

  /**
   * Battle on the ranked Ladder: the War Plan is checked and the match prepared now (the opponent is
   * fixed by the match seed), then the plate searches until it "finds" that opponent.
   */
  function startSearch() {
    const req: MatchRequest = { mode: 'ladder', format: ladderFormat(s, content), online: true };
    const opponent = starter.prepare(req);
    if (!opponent) return;
    setUnlock(null);
    askFullscreen();
    kit.sound?.('ui_click');
    haptic('tick');
    setRanked({ phase: 'searching', req, opponent });
  }

  /** Cancel: instant, nothing lost (Battle as Cancel, Esc, back). */
  function cancelSearch() {
    if (rankedRef.current.phase !== 'searching') return;
    kit.sound?.('ui_toggle');
    setRanked({ phase: 'idle' });
  }

  /** The found beat is over (or tapped through): MR-15's dip and whoosh, then VS with the found player. */
  function toVs() {
    const r = rankedRef.current;
    if (r.phase !== 'found' || leaving.current) return;
    const show = () => starter.show(r.req, r.opponent);
    if (reduce) {
      leaving.current = setTimeout(show, 0);
      return;
    }
    setLaunching(true);
    kit.sound?.('ui_whoosh');
    leaving.current = setTimeout(show, 220);
  }

  // The search runs a natural 2-9 s (UI randomness), then the plate finds the prepared opponent.
  useEffect(() => {
    if (ranked.phase !== 'searching' || ranked.frozen) return;
    const id = setTimeout(() => setRanked((r) => (r.phase === 'searching' ? { ...r, phase: 'found' } : r)), searchDelayMs());
    return () => clearTimeout(id);
  }, [ranked.phase]);
  // Esc and the browser or Android back cancel a search; once found the match is on (back waits).
  useEffect(() => {
    if (!rankedBusy) return;
    return pushBackHandler(() => cancelSearch());
  }, [rankedBusy]);
  // MR-128: the found card slams in; its impact sounds and thumps, the shine rings out, then VS.
  useEffect(() => {
    if (ranked.phase !== 'found') return;
    const impact = setTimeout(
      () => {
        kit.sound?.('ui_stamp');
        haptic('thump');
      },
      reduce ? 0 : FOUND_IMPACT_MS,
    );
    const shine = setTimeout(() => kit.sound?.('ui_unlock'), reduce ? 60 : FOUND_IMPACT_MS + 90);
    const go = ranked.frozen ? null : setTimeout(toVs, FOUND_HOLD_MS);
    return () => {
      clearTimeout(impact);
      clearTimeout(shine);
      if (go) clearTimeout(go);
    };
  }, [ranked.phase]);
  // The Result's "Next battle" after a ranked match goes straight back into the search (the request is
  // consumed on every mount, so it never fires later); the dev screens page can hold a phase.
  useEffect(() => {
    const again = takeRankedSearch();
    if (!rankedOn) return;
    const preview = rankedPreview.peek();
    if (preview) {
      const req: MatchRequest = { mode: 'ladder', format, online: true };
      setRanked({ phase: preview.phase, req, opponent: services.prepareMatch(req), frozen: true, elapsedMs: preview.elapsedMs ?? 0 });
      return;
    }
    if (again) startSearch();
  }, []);

  function battle() {
    if (onlineMode) {
      if (onlineMode === 'friend') {
        setRoom('host');
        return;
      }
      if (ostate === 'searching') setOstate('idle');
      else if (ostate === 'idle') {
        kit.sound?.('ui_click');
        setOstate('searching');
      }
      return;
    }
    if (rankedOn) {
      if (ranked.phase === 'searching') cancelSearch();
      else if (ranked.phase === 'found') toVs();
      else startSearch();
      return;
    }
    launch(training ? { mode: 'tutorial', match: training } : battleRequest(s, content, s.settings.defaultSpeed));
  }

  /** The labelled AI choice (after 25 s of searching, or when online is not available): the Ladder vs AI. */
  function playAi() {
    setOstate('idle');
    setMockMode('ladder');
    services.setUiFlags(homeModeFlags('ladder'));
    launch({ mode: 'ladder', format: ladderFormat(s, content) });
  }

  // Keyboard (2.2): Space starts a battle on Home.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.defaultPrevented || modes || room || vs) return;
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag)) return;
      e.preventDefault();
      battle();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  /** MR-120: the picked card's icon arcs into the switcher tile; the plate cross-fades. */
  const switcherRef = useRef<HTMLDivElement>(null);
  function select(m: SwitcherMode, icon: Element | null) {
    kit.sound?.('ui_toggle');
    setMockMode(m);
    if (m === 'online' || m === 'friend') setOstate(mock?.state === 'searching' || mock?.state === 'found' ? 'idle' : (mock?.state ?? 'idle'));
    else services.setUiFlags(homeModeFlags(m));
    const tile = switcherRef.current?.querySelector('.hub-switch');
    if (icon && tile && !reduce) {
      const from = icon.getBoundingClientRect();
      const token = () => {
        const el = document.createElement('span');
        el.setAttribute('class', 'hub-fly');
        if (typeof icon.cloneNode === 'function') el.appendChild(icon.cloneNode(true));
        return el;
      };
      fly(from, tile, { token });
    }
  }

  const unavailable = !!onlineMode && (ostate === 'noConnection' || ostate === 'full' || ostate === 'update');
  // While a search runs (the ranked Ladder's, or the mock's) Battle is Cancel: slate, same place, no pulse.
  const cancel = searching || ranked.phase === 'searching';
  const battleLabel = onlineMode === 'friend' ? t('ui.hub.createRoom') : cancel ? t('ui.online.cancel') : t('ui.home.battle');
  const quiet = !!unlock || held || !!pendingUnlock(s, content);
  const scene = useMemo(() => <ArenaScene arena={arena.id} />, [arena.id]);
  const overlay = modes || !!room || vs;
  const unavailableKey = ostate === 'noConnection' ? 'ui.online.noConnection' : ostate === 'full' ? 'ui.online.full' : 'ui.online.update';

  return (
    <section
      class={`ui-screen hub${launching ? ' is-launching' : ''}${armyOpen ? '' : ' is-first'}${ladderOpen ? ' is-ladder' : ' is-training'}${searching || rankedBusy ? ' is-searching' : ''}${ranked.phase === 'found' ? ' is-found' : ''}`}
      data-screen="home"
      data-arena={arena.id}
      data-mode={mode}
      data-unlock={unlock ?? undefined}
      aria-label={t('ui.home.title')}
    >
      {scene}
      <div class="hub-stage">
        <Diorama
          arena={arena.id}
          age={age}
          mySkin={mySkin}
          foeSkin={foeLook === 'ai' || found ? foeSkin : null}
          teamMe={teams.me}
          teamFoe={teams.foe}
          mine={mine}
          foe={foeLook === 'ai' || foeLook === 'found' ? foe : []}
          foeLook={foeLook}
          launching={launching}
        />
        {ladderOpen ? (
          <div class="hub-stage__caption">
            <ArenaTitle />
            <TrophyBar />
          </div>
        ) : unlock ? null : (
          // The hint steps aside while an unlock moment shows, so its line never covers it.
          <p class="hub-stage__start" data-testid="wp-start">
            {training === 1 ? t('ui.hub.start') : t('ui.hub.startNext')}
          </p>
        )}
      </div>

      <header class="wp-top hub-top">
        {/* Before the profile chip arrives, the game's name brands the first screen (FTUE audit 2026-10-01). */}
        {armyOpen ? (
          <HubProfile />
        ) : (
          <span class="hub-wordmark" data-testid="home-wordmark">
            <Wordmark text={t('ui.home.gameName')} height={44} />
          </span>
        )}
        <span />
        <HubTopRight quiet={quiet} />
      </header>

      {campaignOpen || capsulesOpen ? (
        <aside class="hub-left">
          {campaignOpen ? <CampaignCard /> : null}
          {capsulesOpen ? <CapsuleSlots /> : null}
        </aside>
      ) : null}

      <div class="wp-dock hub-dock">
        {onlineMode && mock ? (
          <OnlinePlate
            mock={{ ...mock, mode: onlineMode }}
            state={ostate}
            elapsed={elapsed}
            format={onlineLengths(onlineMode).includes(onlineFormat) ? onlineFormat : 'short'}
            onFormat={setOnlineFormat}
            onAi={playAi}
            onJoin={() => setRoom('join')}
            aside={unlock === 'modes' || unlock === 'daily'}
          />
        ) : rankedOn && ranked.phase !== 'idle' ? (
          <RankedPlate
            phase={ranked.phase}
            opponent={ranked.opponent}
            elapsed={rankedElapsed}
            format={ranked.req.mode === 'ladder' ? ranked.req.format : format}
            aside={unlock === 'modes' || unlock === 'daily'}
            deck={decksOpen(s) ? <DeckSwitch variant="plate" testid="home-decks" /> : null}
          />
        ) : (
          <MatchPlate
            mode={aiMode}
            training={training}
            format={format}
            onFormat={(f) => services.setUiFlags(ladderFormatFlags(content, f))}
            onSkirmish={() => router.go({ id: 'modeSelect', focus: 'skirmish' })}
            aside={unlock === 'modes' || unlock === 'daily'}
            // The No clock caption queues behind a currency caption already on screen (one at a time, U8).
            quiet={quiet || pendingCurrencyCaption(s) !== null}
            // The saved decks, next to Battle (owner request 2026-10-07); their one-time hint waits
            // until no unlock moment or caption is on screen (the No clock caption included, U8).
            deck={
              decksOpen(s) && !training ? (
                <DeckSwitch
                  variant="plate"
                  testid="home-decks"
                  hint={!quiet && pendingCurrencyCaption(s) === null && !(untimed(content, format) && !s.flags[LAST_SEEN]) && deckHintDue(s.flags)}
                />
              ) : null
            }
          />
        )}
        <div class="wp-playRow" ref={switcherRef}>
          {/* The friend entry, shown as coming later (owner decision 2026-10-01); gone once the mock's Friend Duel works. */}
          {modesOpen && !training && !mock ? (
            <FriendSoonChip
              onOpen={() => {
                setModesFocus('friend');
                setModes(true);
              }}
            />
          ) : null}
          {modesOpen && !training ? (
            <ModeSwitcher
              mode={mode}
              onOpen={() => {
                setModesFocus(null);
                setModes(true);
              }}
              disabled={searching || rankedBusy}
              reason={t('ui.online.searching')}
            />
          ) : null}
          <Button
            kind={cancel ? 'secondary' : 'primary'}
            size="xl"
            class={`wp-play hub-battle${cancel ? ' is-cancel' : ''}`}
            pulse={!overlay && !covered && !cancel && !unavailable && ranked.phase === 'idle'}
            primary={!overlay && !covered && !cancel}
            testid="play"
            autofocus
            disabled={unavailable}
            reason={unavailable ? t('ui.online.battleBlocked', { reason: t(unavailableKey) }) : undefined}
            icon={cancel ? null : <SwordsIcon size={36} hero />}
            onClick={(e) => {
              e.stopPropagation();
              battle();
            }}
          >
            {battleLabel}
          </Button>
        </div>
      </div>

      {unlock ? (
        <UnlockPointer
          feature={unlock}
          also={unlockAlso}
          onOpen={() => {
            const f = unlock;
            const tab = UNLOCK_TAB[f];
            setUnlock(null);
            if (tab) router.switchTab(tab, TAB_ROOTS[tab]);
            else if (f === 'campaign') router.go({ id: 'warPath' });
            else if (f === 'ladder') router.go({ id: 'trophyRoad' });
            else setModes(true);
          }}
          onDone={() => setUnlock(null)}
        />
      ) : null}

      {modes ? <ModesSheet selected={mode} online={!!mock} focus={modesFocus} onSelect={select} onClose={() => setModes(false)} /> : null}
      {room === 'host' && mock ? <RoomPanel mock={mock} format={onlineFormat} onFormat={setOnlineFormat} onClose={() => setRoom(null)} /> : null}
      {room === 'join' ? <JoinPanel onClose={() => setRoom(null)} /> : null}
      {vs && mock ? (
        <OnlineVs
          mock={mock}
          format={onlineFormat}
          frozen={!!mock.vs}
          onDone={() => {
            // The mock has no battle to start: back to the idle lobby.
            setVs(false);
            setOstate('idle');
            toasts.show(t('ui.online.found'), { tone: 'info' });
          }}
        />
      ) : null}
      {starter.dialog}
    </section>
  );
}
