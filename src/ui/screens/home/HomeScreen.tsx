/**
 * Home is the Battle hub (S2; owner decision 2026-09-30, ui-plan 2.3). The game's main point is the
 * 1v1 battle (the online 2-player mode later, the Ladder against labelled AI opponents today), so it
 * is the first thing a player sees and the one primary on Home. The War Path campaign is the offline
 * side road, one tap away on the Campaign card.
 *
 * - **Stage** (full bleed): the arena's sky and skyline (`ArenaScene`) with the arena diorama in the
 *   centre: your base and the AI's across the lane, the arena's landmark behind (`Diorama`). Under it
 *   the arena's name and the trophy bar to the next Trophy Road reward (once the Ladder is open).
 * - **Top bar**: the profile chip (trophies once the Ladder is open), the Amber and Dust chips, the gear.
 * - **Left**: the Campaign card (after the onboarding) and the four capsule slots (once Capsules open).
 * - **Right, over Battle**: the match plate (who Battle fights, with the AI badge and tier; the format
 *   picker from Arena 2) and **Battle** (gold, XL, bottom-right, the only primary and the one pulse),
 *   with **Modes** (slate) to its left once open. The five tabs are the shell's bottom bar.
 *
 * While the onboarding runs (A8), Battle starts its matches (the training match vs Old Grogg, then
 * match 2 vs Pip; both are War Path Stone L1 and L2). Afterwards it starts a Ladder match. Feature
 * unlocks play here (MR-40): the feature that just opened glows free of its padlock with one line and
 * "Open"; Battle stays lit and interrupts it.
 */
import './home.css';
import './hub.css';
import '../warPath/warPath.css';
import type { FormatId } from '@/contracts';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { SwordsIcon } from '../../components/icons';
import { useKit } from '../../components/kit';
import { blockingOverlays } from '../../components/overlay';
import type { RouteOf, TabId } from '../../router';
import { useUi } from '../context';
import { hudTeamColors } from '../../hud/model';
import { equippedOf, owns } from '../model/cosmetics';
import { formatAges } from '../model/plan';
import { arenaOf, unlocks } from '../model/progress';
import { featureOpen, onboardingDone, pendingUnlock, unlockFlag, type HomeUnlock } from '../model/warPath';
import { askFullscreen } from '../shared/fullscreen';
import { useMatchStarter } from '../shared/MatchStarter';
import { ModesSheet } from '../warPath/ModesSheet';
import { TAB_ROOTS } from '../warPath/shell';
import { ArenaScene } from './ArenaScene';
import { Diorama } from './Diorama';
import { ArenaTitle, CampaignCard, CapsuleSlots, HubProfile, HubTopRight, MatchPlate, TrophyBar, UnlockPointer } from './hub';

const UNLOCK_TAB: Readonly<Partial<Record<HomeUnlock, TabId>>> = { army: 'army', capsules: 'capsules', customize: 'customize', progress: 'progress' };

/** The ladder format Battle plays (remembered per save as a UI flag, like the Modes panel's last mode). */
const FORMAT_FLAG = 'ui-ladderFormat.';

/** The onboarding match Battle starts while it is due (A8): step 0 is match 1, step 2 is match 2. */
export function trainingDue(step: number): 1 | 2 | null {
  if (step >= 4) return null;
  return step < 2 ? 1 : 2;
}

export function HomeScreen(_p: { route: RouteOf<'home'> }) {
  const { save, content, t, router, services } = useUi();
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
  const u = unlocks(s, content);
  const formats = u.ladderFormats;
  const format: FormatId = formats.find((f) => s.flags[FORMAT_FLAG + f]) ?? formats[0] ?? 'short';
  const opponent = ladderOpen ? services.previewOpponent() : null;

  // The diorama shows both bases in the format's first age; yours wears your base skin (A18.9.4).
  const age = formatAges(content, format)[0] ?? content.order.ages[0]!;
  const eq = content.cosmetics.collections ? equippedOf(s, content) : null;
  const skin = eq?.baseSkins?.[age] ?? null;
  const mySkin = skin && owns(s, content, skin) ? skin : null;
  const foeSkin = opponent?.side.look?.baseSkins?.[age] ?? null;
  const teams = hudTeamColors(s.settings.teamPreset, 0);

  // ---- MR-40: a feature that just opened (never for a legacy save) ------------------------------
  const covered = blockingOverlays.value > 0;
  const [unlock, setUnlock] = useState<HomeUnlock | null>(null);
  // One new thing per return to Home (U8): at most one unlock moment per visit.
  const unlockShown = useRef(false);
  useEffect(() => {
    if (unlockShown.current || covered) return;
    const f = pendingUnlock(s, content);
    if (!f) return;
    unlockShown.current = true;
    services.setUiFlags({ [unlockFlag(f)]: true });
    setUnlock(f);
    kit.sound?.('ui_unlock');
  }, [s, covered]);

  // ---- Battle ---------------------------------------------------------------------------------
  const [modes, setModes] = useState(false);
  const [launching, setLaunching] = useState(false);
  const starter = useMatchStarter();

  function battle() {
    setUnlock(null);
    askFullscreen();
    const req = training ? ({ mode: 'tutorial', match: training } as const) : ({ mode: 'ladder', format } as const);
    // MR-15: Battle dips, the diorama leans in and the clash flares, then VS.
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

  // Keyboard (2.2): Space starts a battle on Home.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.defaultPrevented || modes) return;
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag)) return;
      e.preventDefault();
      battle();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const quiet = !!unlock || covered || !!pendingUnlock(s, content);
  const scene = useMemo(() => <ArenaScene arena={arena.id} />, [arena.id]);

  return (
    <section
      class={`ui-screen hub${launching ? ' is-launching' : ''}${armyOpen ? '' : ' is-first'}${ladderOpen ? ' is-ladder' : ' is-training'}`}
      data-screen="home"
      data-arena={arena.id}
      data-unlock={unlock ?? undefined}
      aria-label={t('ui.home.title')}
    >
      {scene}
      <div class="hub-stage">
        <Diorama arena={arena.id} age={age} mySkin={mySkin} foeSkin={foeSkin} teamMe={teams.me} teamFoe={teams.foe} launching={launching} />
        {ladderOpen ? (
          <div class="hub-stage__caption">
            <ArenaTitle />
            <TrophyBar />
          </div>
        ) : (
          <p class="hub-stage__start" data-testid="wp-start">
            {training === 1 ? t('ui.hub.start') : t('ui.hub.startNext')}
          </p>
        )}
      </div>

      <header class="wp-top hub-top">
        {armyOpen ? <HubProfile /> : <span />}
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
        <MatchPlate
          opponent={opponent}
          training={training}
          formats={formats}
          format={format}
          onFormat={(f) => services.setUiFlags(Object.fromEntries(formats.map((x) => [FORMAT_FLAG + x, x === f])))}
          aside={unlock === 'modes' || unlock === 'daily'}
        />
        <div class="wp-playRow">
          {modesOpen ? (
            <Button kind="secondary" size="xl" class="wp-modes" icon={<SwordsIcon size={24} />} testid="home-modes" onClick={() => setModes(true)}>
              {t('warPath.ui.modes')}
            </Button>
          ) : null}
          <Button
            kind="primary"
            size="xl"
            class="wp-play hub-battle"
            pulse={!modes && !covered}
            primary={!modes && !covered}
            testid="play"
            autofocus
            icon={<SwordsIcon size={30} />}
            onClick={(e) => {
              e.stopPropagation();
              battle();
            }}
          >
            {t('ui.home.battle')}
          </Button>
        </div>
      </div>

      {unlock ? (
        <UnlockPointer
          feature={unlock}
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

      {modes ? (
        <ModesSheet
          onClose={() => setModes(false)}
          onStart={(req) => {
            setModes(false);
            starter.start(req);
          }}
        />
      ) : null}
      {starter.dialog}
    </section>
  );
}
