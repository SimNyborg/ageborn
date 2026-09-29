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
import { createRouter, type Route, type Router } from '@/ui/router';
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
  { id: 'warPlan', label: 'War Plan', route: () => [{ id: 'home' }, { id: 'warPlan' }] },
  { id: 'collection', label: 'Collection', route: () => [{ id: 'home' }, { id: 'collection' }] },
  { id: 'collection-skins', label: 'Collection: skins', route: () => [{ id: 'home' }, { id: 'collection', tab: 'skins' }] },
  card('bonker'),
  card('pikeman'),
  card('friar'),
  card('mammoth_matriarch'),
  card('chrono_titan'),
  card('rock_tosser'),
  card('meteor_shower'),
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

function applyRoutes(router: Router, routes: Route[]) {
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
    const save = signal(fixtureSave(content, state));
    const router = createRouter({ id: 'home' });
    const services = createPreviewServices({ save, content, router, opponent: v.opponent });
    applyRoutes(router, v.route());
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
