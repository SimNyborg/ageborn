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
import { primeWarPathSeen } from '@/ui/screens/home/HomeScreen';
import { shellTabs, TAB_ROOTS } from '@/ui/screens/warPath/shell';
import type { SaveDoc } from '@/contracts';
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
}

/** A save on its very first launch (War Path level 1 next, nothing earned yet; ui-plan 2.6). */
function firstLaunch(s: SaveDoc): SaveDoc {
  return {
    ...s,
    currencies: { amber: 0, dust: 0 },
    matchesPlayed: 0,
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

const VARIANTS: Variant[] = [
  { id: 'home', label: 'Home', route: () => [{ id: 'home' }] },
  { id: 'home-first', label: 'Home: first launch', route: () => [{ id: 'home' }], save: firstLaunch },
  {
    id: 'home-unlock',
    label: 'Home: Army unlock (after L1)',
    route: () => [{ id: 'home' }],
    save: (s) => ({ ...firstLaunch(s), currencies: { amber: 60, dust: 0 }, matchesPlayed: 1, tutorial: { step: 2, hintsShown: {} }, warPath: { ...s.warPath, stars: { 'wp.stone.l01': 2 }, crowns: { 'wp.stone.l01': 2 }, legacy: false } }),
    prime: () => primeWarPathSeen({}),
  },
  { id: 'home-cleared', label: 'Home: level cleared (MR-41)', route: () => [{ id: 'home' }], prime: ceremony('wp.bronze.l06', 0) },
  {
    id: 'home-boss',
    label: 'Home: boss beaten (MR-42)',
    route: () => [{ id: 'home' }],
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
  { id: 'progress', label: 'Progress tab', route: () => [{ id: 'progress' }] },
  { id: 'modeSelect', label: 'Mode select', route: () => [{ id: 'home' }, { id: 'modeSelect' }] },
  vs('general'),
  vs('commander'),
  vs('warmUp'),
  vs('warden'),
  vs('grogg'),
  vs('daily'),
  vs('echo'),
  pause('early'),
  pause('late'),
  pause('skirmish'),
  pause('tutorial'),
  result('win'),
  result('loss'),
  result('draw'),
  result('conquest'),
  result('noCapsule'),
  result('warPath'),
  result('warPathLoss'),
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
  { id: 'collection', label: 'Collection', route: () => [{ id: 'home' }, { id: 'collection' }] },
  { id: 'collection-skins', label: 'Collection: skins', route: () => [{ id: 'home' }, { id: 'collection', tab: 'skins' }] },
  card('bonker'),
  card('pikeman'),
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
  ...(['troops', 'bases', 'flags', 'decorations', 'emotes', 'quotes', 'look'] as const).map(
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
    const base = fixtureSave(content, state);
    const initial = v.save ? v.save(base) : base;
    primeWarPathSeen(null);
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
