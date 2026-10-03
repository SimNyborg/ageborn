/**
 * Meta UI screen gallery (WP9, `?dev=1#screens`): every WP9 screen in the fixture states new player,
 * mid-game and maxed (DESIGN C2/WP9 DoD), at common landscape sizes, with preview services that
 * make the buttons do something locally. Real content, real strings, real portraits from the
 * visuals provider.
 *
 * Deep links for screenshots: `?dev=1#screens/<variant>/<state>/<viewport>`, for example
 * `#screens/home/mid/844x390` or `#screens/result-win/new/1280x720`.
 *
 * Dev pages are internal tools and are exempt from the i18n rule.
 */
import { content } from '@/content';
import { i18n } from '@/i18n';
import { createRouter, type Route, type Router, type TabId } from '@/ui/router';
import {
  fixtureOpponent,
  fixturePause,
  fixtureRequest,
  fixtureResult,
  type OpponentFixture,
  type ResultFixture,
} from '@/ui/screens/fixtures/matches';
import { FIXTURE_NOW, FIXTURE_STATES, fixtureSave, type FixtureState } from '@/ui/screens/fixtures/saves';
import { createPreviewServices } from '@/ui/screens/fixtures/services';
import { ScreenHost } from '@/ui/screens/ScreenHost';
import { primeWarPathSeen } from '@/ui/screens/warPath/WarPathScreen';
import { onlineMock, type OnlineMock } from '@/ui/screens/home/online';
import { shellTabs, TAB_ROOTS } from '@/ui/screens/warPath/shell';
import type { SaveDoc } from '@/contracts';
import { setFortSlotPreview } from '@/ui/screens/model/plan';
import { CosmeticArtContext } from '@/ui/components/cosmeticArt';
import { createArtProvider } from '@/visuals';
import { cosmeticImageUrl } from '@/visuals/cosmetics/art';
import { signal } from '@preact/signals';
import { useEffect, useMemo, useState } from 'preact/hooks';

export const title = 'Meta UI screens (WP9)';

interface Variant {
  id: string;
  label: string;
  route: () => Route[];
  opponent?: OpponentFixture;
  /** Changes the fixture save (War Path first launch, ceremonies). */
  save?: (s: SaveDoc) => SaveDoc;
  /** Runs before the screens mount (primes the War Path ceremony). */
  prime?: (s: SaveDoc) => void;
  /** Opens the routes inside this tab of the shell (the tab bar shows). */
  tab?: TabId;
  /** Shows the Fort slot before battles play it (A16.14.7 preview, `setFortSlotPreview`). */
  forts?: boolean;
}

/**
 * A save with the Fort slot open (A16.14.6): the 8 walls and the Stone set owned, every age's wall in
 * the slot, plus the Bronze camp and trap from War Path; `fort: null` in Stone for the empty slot.
 */
function withForts(s: SaveDoc, o: { empty?: boolean; locked?: boolean; camp?: boolean } = {}): SaveDoc {
  const forts = content.order.forts ?? [];
  const wall = (age: string) => forts.find((id) => content.forts?.[id]?.age === age && content.forts?.[id]?.fortKind === 'wall') ?? null;
  const owned = forts.filter((id) => {
    const f = content.forts?.[id];
    return !!f && (f.fortKind === 'wall' || f.age === 'stone' || (f.age === 'bronze' && f.fortKind !== 'tower'));
  });
  const plans = s.warPlans.map((plan) => ({
    ...plan,
    loadouts: Object.fromEntries(
      Object.entries(plan.loadouts).map(([age, l]) => [age, { ...l, fort: o.locked || (o.empty && age === 'stone') ? null : o.camp && age === 'stone' ? 'war_camp' : wall(age) }]),
    ) as typeof plan.loadouts,
  }));
  return { ...s, fortsOwned: o.locked ? [] : owned, flags: { ...s.flags, 'fort.slot': !o.locked }, warPlans: plans };
}

/** A save on its very first launch (War Path level 1 next, nothing earned yet; ui-plan 2.6). */
function firstLaunch(s: SaveDoc): SaveDoc {
  return {
    ...s,
    currencies: { amber: 0, dust: 0 },
    matchesPlayed: 0,
    stats: { ...s.stats, wins: 0, losses: 0, matches: 0 },
    trophies: { ...s.trophies, current: 0, best: 0 },
    tutorial: { step: 0, hintsShown: {} },
    warPath: { ...s.warPath, stars: {}, crowns: {}, legacy: false },
    flags: {},
  };
}

/** The level just beaten is shown as not yet celebrated, so Home plays MR-41 (and MR-42 for a boss). */
function ceremony(level: string, before: number) {
  return (s: SaveDoc) => {
    const stars = { ...s.warPath.stars };
    if (before > 0) stars[level] = before;
    else delete stars[level];
    primeWarPathSeen(stars);
  };
}

/** A save at a trophy count (and its arena), with the Home flags patched (the mode switcher). */
function homeAt(trophies: number, flags: Record<string, boolean> = {}) {
  return (s: SaveDoc): SaveDoc => {
    const idx = Math.max(0, content.arenas.list.filter((a) => a.trophies <= trophies).length - 1);
    return { ...s, trophies: { ...s.trophies, current: trophies, best: Math.max(trophies, s.trophies.best) }, arenaIndex: idx, flags: { ...s.flags, ...flags } };
  };
}

/**
 * The online mock (spec "online-first Battle hub" 1.8): the plate, search, room and VS of online play,
 * shown only here until M2/M4 work. The player Ana is a made-up person for the screenshots.
 */
const ANA = { name: 'Ana', avatar: { seed: 4242, parts: {} }, trophies: 1180, arena: 4, bars: 3 as const };
function online(id: string, label: string, o: Partial<OnlineMock>): Variant {
  return {
    id,
    label: `Home online (mock): ${label}`,
    route: () => [{ id: 'home' }],
    prime: () => {
      onlineMock.value = { mode: 'online', state: 'idle', foe: ANA, code: 'K7MPQ4', foundAfterMs: 6000, ...o };
    },
  };
}

const HOME_MODES: Variant[] = [
  { id: 'home-a1', label: 'Home: Ladder at Arena 1 (every length open)', route: () => [{ id: 'home' }], save: homeAt(80) },
  { id: 'home-a2', label: 'Home: Ladder at Arena 2 (every length open)', route: () => [{ id: 'home' }], save: homeAt(220) },
  { id: 'home-last', label: 'Home: Last Base Standing picked (first time)', route: () => [{ id: 'home' }], save: homeAt(1020, { 'ui-ladderFormat.last': true }) },
  { id: 'home-quick', label: 'Home: Quick Battle selected', route: () => [{ id: 'home' }], save: homeAt(1020, { 'ui-homeMode.quick': true }) },
  { id: 'home-daily', label: 'Home: Daily selected', route: () => [{ id: 'home' }], save: homeAt(1020, { 'ui-homeMode.daily': true }) },
  {
    id: 'home-skirmish',
    label: 'Home: Skirmish selected (last setup)',
    route: () => [{ id: 'home' }],
    save: homeAt(1020, { 'ui-homeMode.skirmish': true, 'ui-skirmish.set': true, 'ui-skirmish.g.boomsworth': true, 'ui-skirmish.f.full': true }),
  },
  online('home-online', 'idle', {}),
  online('home-online-search', 'searching 0:12', { state: 'searching', elapsedMs: 12_000, foundAfterMs: null }),
  online('home-online-wait', 'searching past 25 s (AI choice)', { state: 'searching', elapsedMs: 27_000, foundAfterMs: null }),
  online('home-online-found', 'found', { state: 'found' }),
  online('home-online-noconn', 'no connection', { state: 'noConnection' }),
  online('home-online-full', 'online full', { state: 'full' }),
  online('home-online-update', 'update needed', { state: 'update' }),
  online('home-friend', 'Friend Duel', { mode: 'friend' }),
  online('home-room', 'Friend Duel room (waiting)', { mode: 'friend', room: 'host' }),
  online('home-room-joined', 'Friend Duel room (friend joined)', { mode: 'friend', room: 'host', friendJoined: true }),
  online('home-join', 'Friend Duel: enter a code', { mode: 'friend', room: 'join' }),
  online('vs-online', 'VS between two players', { state: 'found', vs: true }),
];

const vs = (o: OpponentFixture): Variant => ({
  id: `vs-${o}`,
  label: `VS: ${o}`,
  route: () => [{ id: 'home' }, { id: 'vs', request: fixtureRequest(o), opponent: fixtureOpponent(content, o) }],
});
const result = (r: ResultFixture): Variant => ({
  id: `result-${r}`,
  label: `Result: ${r}`,
  route: () => [{ id: 'home' }, { id: 'result', info: fixtureResult(content, r) }],
});
const pause = (w: 'early' | 'late' | 'skirmish' | 'tutorial'): Variant => ({
  id: `pause-${w}`,
  label: `Pause: ${w}`,
  route: () => [
    { id: 'battle', request: fixtureRequest('general'), opponent: fixtureOpponent(content, 'general') },
    { id: 'pause', info: fixturePause(w) },
  ],
});
const card = (id: string): Variant => ({
  id: `card-${id}`,
  label: `Card: ${id}`,
  route: () => [{ id: 'home' }, { id: 'collection' }, { id: 'cardDetail', card: id }],
});

/** A Fort card's detail with the Fort slot open (A16.14.7). */
const fortCard = (id: string): Variant => ({ ...card(id), forts: true, save: (s) => withForts(s) });

const VARIANTS: Variant[] = [
  { id: 'home', label: 'Home', route: () => [{ id: 'home' }] },
  { id: 'home-first', label: 'Home: first launch', route: () => [{ id: 'home' }], save: firstLaunch },
  ...HOME_MODES,
  {
    id: 'home-unlock',
    label: 'Home: Army unlock (after L1)',
    route: () => [{ id: 'home' }],
    save: (s) => ({ ...firstLaunch(s), currencies: { amber: 60, dust: 0 }, matchesPlayed: 1, stats: { ...s.stats, wins: 1, losses: 0, matches: 1 }, tutorial: { step: 2, hintsShown: {} }, warPath: { ...s.warPath, stars: { 'wp.stone.l01': 2 }, crowns: { 'wp.stone.l01': 2 }, legacy: false } }),
    prime: () => primeWarPathSeen({}),
  },
  {
    id: 'home-campaign',
    label: 'Home: Campaign unlock (after onboarding)',
    route: () => [{ id: 'home' }],
    save: (s) => ({
      ...firstLaunch(s),
      currencies: { amber: 60, dust: 0 },
      matchesPlayed: 2,
      tutorial: { step: 4, hintsShown: {} },
      stats: { ...s.stats, wins: 2, losses: 0, matches: 2 },
      trophies: { ...s.trophies, current: 0, best: 0 },
      warPath: { ...s.warPath, stars: { 'wp.stone.l01': 2, 'wp.stone.l02': 1 }, crowns: {}, legacy: false },
      flags: { 'ui-unlock.army': true, 'ui-unlock.ladder': true, 'ui-unlock.capsules': true },
    }),
  },
  { id: 'warPath', label: 'War Path map', route: () => [{ id: 'home' }, { id: 'warPath' }] },
  { id: 'home-cleared', label: 'War Path: level cleared (MR-41)', route: () => [{ id: 'home' }, { id: 'warPath' }], prime: ceremony('wp.bronze.l06', 0) },
  {
    id: 'home-boss',
    label: 'War Path: boss beaten (MR-42)',
    route: () => [{ id: 'home' }, { id: 'warPath' }],
    save: (s) => ({ ...s, warPath: { ...s.warPath, stars: Object.fromEntries(content.warPath.order.slice(0, 20).map((id) => [id, 2])) } }),
    prime: ceremony('wp.bronze.l10', 0),
  },
  { id: 'capsules', label: 'Capsules tab', route: () => [{ id: 'capsules' }] },
  {
    // The 2026-09-29 ladder notice for a veteran: one closable card, plus one skill Aeon granted again.
    id: 'capsules-ladder',
    label: 'Capsules tab: ladder notice',
    route: () => [{ id: 'capsules' }],
    // The granted skill Aeon sits on the shelf (a fixed-tier road Aeon), as the real grant leaves it.
    save: (s) => {
      const like = s.capsules.pending[0];
      const aeon = like ? [{ ...like, id: 'fixture-legacy-aeon', kind: 'road' as const, tier: 'aeon' as const, startTier: 'aeon' as const, scriptIndex: null }] : [];
      return {
        ...s,
        capsules: { ...s.capsules, pending: [...aeon, ...s.capsules.pending] },
        flags: { ...s.flags, 'notice.capsuleLadder': true, 'capsule.legacySkillAeon.road': true },
      };
    },
  },
  {
    // The Sundial (2026-09-30): the one-time notice for a save that played before it.
    id: 'capsules-sundial',
    label: 'Capsules tab: Sundial notice',
    route: () => [{ id: 'capsules' }],
    save: (s) => ({ ...s, flags: { ...s.flags, 'notice.sundial': true } }),
  },
  {
    // The Sundial empty, the old Supply allowance used up, nothing on the shelf.
    id: 'capsules-sundial-empty',
    label: 'Capsules tab: Sundial empty',
    route: () => [{ id: 'capsules' }],
    save: (s) => ({ ...s, capsules: { ...s.capsules, pending: [], wardrobe: [], charges: 0, freeCapsulesLeft: 0, dailyBank: 0, clayMeter: 1, chargesUpdatedAt: FIXTURE_NOW - 2 * 3_600_000 } }),
  },
  {
    // The Sundial full (34): it has stopped filling.
    id: 'capsules-sundial-full',
    label: 'Capsules tab: Sundial full',
    route: () => [{ id: 'capsules' }],
    save: (s) => ({ ...s, capsules: { ...s.capsules, charges: 34, freeCapsulesLeft: 0, dailyBank: 0 } }),
  },
  { id: 'progress', label: 'Progress tab', route: () => [{ id: 'progress' }] },
  { id: 'modeSelect', label: 'Mode select', route: () => [{ id: 'home' }, { id: 'modeSelect' }] },
  vs('general'),
  vs('commander'),
  vs('warmUp'),
  vs('warden'),
  vs('grogg'),
  vs('daily'),
  vs('echo'),
  {
    // A18.9.4 backdrop skins: your equipped backdrop behind your half of VS (review 11)
    ...vs('general'),
    id: 'vs-backdrop',
    label: 'VS: your backdrop (Winterfall)',
    save: (s) => ({ ...s, cosmetics: { ...s.cosmetics, owned: [...new Set([...s.cosmetics.owned, 'backdrop.winterfall'])], equipped: { ...s.cosmetics.equipped, backdrop: 'backdrop.winterfall' } } }),
  },
  pause('early'),
  pause('late'),
  pause('skirmish'),
  pause('tutorial'),
  result('win'),
  result('loss'),
  {
    id: 'result-heavyGap',
    label: 'Result: loss with the Anti-heavy tip (A9.2)',
    route: () => [{ id: 'home' }, { id: 'result', info: { ...fixtureResult(content, 'loss'), tipKey: 'app.tip.heavyGap', tipCard: 'pikeman', tipAge: 'medieval' } }],
  },
  result('draw'),
  result('lastWin'),
  result('conquest'),
  result('noCapsule'),
  result('warPath'),
  result('warPathLoss'),
  result('retreat'),
  { id: 'warPlan', label: 'War Plan', route: () => [{ id: 'home' }, { id: 'warPlan' }] },
  { id: 'army', label: 'Army tab', tab: 'army', route: () => [{ id: 'warPlan' }] },
  { id: 'army-bronze', label: 'Army tab: Bronze', tab: 'army', route: () => [{ id: 'warPlan', age: 'bronze' }] },
  {
    id: 'army-warn',
    label: 'Army tab: advice and a gap',
    tab: 'army',
    route: () => [{ id: 'warPlan', age: 'stone' }],
    save: (s) => {
      const plan = s.warPlans[s.activePlan]!;
      const stone = plan.loadouts.stone;
      const next = { ...plan, loadouts: { ...plan.loadouts, stone: { ...stone, units: stone.units.map((u, i) => (i >= 3 ? null : u)), turrets: [stone.turrets[0] ?? null, null] } } };
      return { ...s, warPlans: s.warPlans.map((p, i) => (i === s.activePlan ? next : p)) };
    },
  },
  { id: 'army-first', label: 'Army tab: new player', tab: 'army', route: () => [{ id: 'warPlan' }], save: (s) => ({ ...s, flags: { ...s.flags, 'ui-seen.army': false } }) },
  {
    // A2.9.10: the Field power slot before War Path Stone L5 (or 150 trophies): a padlock and its unlock line.
    id: 'army-field-locked',
    label: 'Army tab: Field slot locked',
    tab: 'army',
    route: () => [{ id: 'warPlan', age: 'stone' }],
    save: (s) => ({ ...s, flags: { ...s.flags, 'power.field': false } }),
  },
  // A16.14.7: the Fort slot in the Army band (open with the wall, empty, locked) and a fort's card detail.
  { id: 'army-fort', label: 'Army tab: Fort slot', tab: 'army', forts: true, route: () => [{ id: 'warPlan', age: 'bronze' }], save: (s) => withForts(s) },
  { id: 'army-fort-empty', label: 'Army tab: Fort slot empty', tab: 'army', forts: true, route: () => [{ id: 'warPlan', age: 'stone' }], save: (s) => withForts(s, { empty: true }) },
  { id: 'army-fort-camp', label: 'Army tab: a Camp in the Fort slot', tab: 'army', forts: true, route: () => [{ id: 'warPlan', age: 'stone' }], save: (s) => withForts(s, { camp: true }) },
  { id: 'army-fort-locked', label: 'Army tab: Fort slot locked', tab: 'army', forts: true, route: () => [{ id: 'warPlan', age: 'stone' }], save: (s) => withForts(s, { locked: true }) },
  fortCard('palisade'),
  fortCard('sling_perch'),
  fortCard('war_camp'),
  fortCard('spike_pit'),
  fortCard('muster_tents'),
  fortCard('ion_spire'),
  { id: 'collection', label: 'Collection', route: () => [{ id: 'home' }, { id: 'collection' }] },
  { id: 'collection-skins', label: 'Collection: skins', route: () => [{ id: 'home' }, { id: 'collection', tab: 'skins' }] },
  card('bonker'),
  card('pikeman'),
  // Anti-heavy (owner feedback 2026-09-29): the counter pair, Strong vs Heavy / Weak vs Anti-heavy.
  card('spear_hunter'),
  card('tuskback'),
  card('friar'),
  card('mammoth_matriarch'),
  card('chrono_titan'),
  card('rock_tosser'),
  card('meteor_shower'),
  card('rockslide'),
  card('horse_artillery'),
  card('hunters_spear'),
  card('undermine'),
  { id: 'trophyRoad', label: 'Trophy Road', route: () => [{ id: 'home' }, { id: 'trophyRoad' }] },
  { id: 'profile', label: 'Profile', route: () => [{ id: 'home' }, { id: 'profile' }] },
  { id: 'settings', label: 'Settings', route: () => [{ id: 'home' }, { id: 'settings' }] },
  { id: 'conquest', label: 'Conquest', route: () => [{ id: 'home' }, { id: 'conquest' }] },
  ...(['troops', 'bases', 'backdrops', 'flags', 'decorations', 'emotes', 'quotes', 'look'] as const).map(
    (tab): Variant => ({ id: `customize-${tab}`, label: `Customize: ${tab}`, route: () => [{ id: 'home' }, { id: 'customize', tab }] }),
  ),
];

const VIEWPORTS = ['fill', '1280x720', '1920x1080', '844x390', '667x375', '1024x768', '390x844'] as const;

function parseHash(): { variant: string; state: FixtureState; viewport: string } {
  const parts = decodeURIComponent(window.location.hash.replace(/^#/, '')).split('/');
  const state = (FIXTURE_STATES as readonly string[]).includes(parts[2] ?? '') ? (parts[2] as FixtureState) : 'mid';
  return { variant: parts[1] || 'home', state, viewport: parts[3] || 'fill' };
}

function applyRoutes(router: Router, routes: Route[], tab?: TabId) {
  if (tab) router.switchTab(tab, routes[0]!);
  router.reset(routes[0]!);
  for (const r of routes.slice(1)) router.go(r);
}

const art = createArtProvider({ quality: 'high' });

const bar: Record<string, string | number> = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  padding: '6px 10px',
  background: '#0d0b1c',
  color: '#f4ecd8',
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
  flexWrap: 'wrap',
};

export default function ScreensPage() {
  const initial = parseHash();
  const [variant, setVariant] = useState(initial.variant);
  const [state, setState] = useState<FixtureState>(initial.state);
  const [viewport, setViewport] = useState(initial.viewport);
  const [portraits, setPortraits] = useState(true);
  const [epoch, setEpoch] = useState(0);

  const v = VARIANTS.find((x) => x.id === variant) ?? VARIANTS[0]!;
  const env = useMemo(() => {
    setFortSlotPreview(v.forts === true);
    const base = fixtureSave(content, state);
    const initial = v.save ? v.save(base) : base;
    primeWarPathSeen(null);
    onlineMock.value = null;
    v.prime?.(initial);
    const save = signal(initial);
    const router = createRouter({ id: 'home' });
    const services = createPreviewServices({ save, content, router, opponent: v.opponent });
    applyRoutes(router, v.route(), v.tab);
    return {
      save,
      content,
      t: (k: string, p?: Record<string, string | number>) => i18n.t(k, p),
      locale: 'en',
      now: () => FIXTURE_NOW,
      router,
      services,
      portrait: portraits ? art.portrait.bind(art) : null,
    };
  }, [variant, state, portraits, epoch]);

  useEffect(() => {
    const hash = `#screens/${variant}/${state}/${viewport}`;
    if (window.location.hash !== hash) history.replaceState(null, '', `${window.location.search}${hash}`);
  }, [variant, state, viewport]);

  const [w, h] = viewport === 'fill' ? [0, 0] : viewport.split('x').map(Number);
  const frame: Record<string, string | number> =
    viewport === 'fill'
      ? { position: 'relative', flex: 1 }
      : { position: 'relative', width: `${w}px`, height: `${h}px`, margin: '12px auto', outline: '2px solid #333', flex: 'none' };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#050410', overflow: 'auto' }}>
      <div style={bar} data-testid="screens-toolbar">
        <b>WP9 screens</b>
        {/* Owner report 2026-10-01: a shared screens link was taken for the game (the mock Battle never starts a match). */}
        <span style={{ color: '#ffb347', fontWeight: 700 }} data-testid="screens-mock-note">
          Preview with fake data: no real battles here.
        </span>
        <a href="./" style={{ color: '#7fd1ff', fontWeight: 700 }} data-testid="screens-play-link">
          Play the real game
        </a>
        <select value={variant} onChange={(e) => setVariant((e.currentTarget as HTMLSelectElement).value)} data-testid="variant">
          {VARIANTS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        {FIXTURE_STATES.map((s) => (
          <button key={s} onClick={() => setState(s)} style={{ fontWeight: s === state ? 900 : 400 }} data-testid={`state-${s}`}>
            {s}
          </button>
        ))}
        <select value={viewport} onChange={(e) => setViewport((e.currentTarget as HTMLSelectElement).value)}>
          {VIEWPORTS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={portraits} onChange={() => setPortraits(!portraits)} /> portraits
        </label>
        <button onClick={() => setEpoch(epoch + 1)}>reset</button>
      </div>
      <div style={frame} key={`${variant}|${state}|${portraits}|${epoch}`}>
        <CosmeticArtContext.Provider value={cosmeticImageUrl}>
          <ScreenHost
            env={env}
            shell={{ tabs: shellTabs(env.save.value, content), roots: TAB_ROOTS }}
          slots={{
            battle: () => (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(#2b2946 0 62%, #5b4430 62%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff8',
                  font: '900 28px system-ui',
                }}
              >
                battle (WP5/WP11)
              </div>
            ),
          }}
          />
        </CosmeticArtContext.Provider>
      </div>
    </div>
  );
}
