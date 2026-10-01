/**
 * Spawn sandbox (`?dev=1#sandbox`, DESIGN A9 screen 16, C2/WP5): three tabs.
 *
 * - Battle: the battle view and HUD on the fake event stream with fake art (the C2/WP5 Phase 1 DoD),
 *   a real-sim match you can play against a WP3 AI General or the dev autoplayer (or watch bot vs
 *   bot), with fake or procedural (WP4) art, or the B16 stress
 *   scene (80 units). Settings, speed and pause, and live counters: fps, frame time, draw calls,
 *   particles, freeze budget.
 * - HUD states: every HUD state side by side (C2/WP5 DoD).
 * - Sim: WP2's sim panel (spawn any card on either side and step; docs/requests/wp2-sandbox-page.md).
 *
 * `#sandbox/battle`, `#sandbox/hud` and `#sandbox/sim` open a tab directly;
 * `?source=real&art=procedural&opponent=ai&autoplay=1` preselects the battle options; `&stage=1` shows
 * only the battle (no bars or panel) for screenshots at a device size, `&format=standard` picks the
 * format. Browser checks reach the running stage through `window.__sandbox` and the dev cheats through
 * `window.__sandboxDev` (gold, power reload, spawns, a lane clear).
 */
import type { FormatId } from '@/contracts';
import { DEFAULT_VIEW_SETTINGS, type ViewSettings } from '@/render';
import { useEffect, useState } from 'preact/hooks';
import type { CardId, PowerSlot, Side } from '@/contracts';
import { devClearLane, devPlaceFort, devPlaceTurret, devSetGold, devSetPower, devSpawn } from '@/sim/debug';
import { SimPanel } from './simPanel';
import { BattleStage, type ArtKind, type OpponentKind, type StageApi, type StageOptions, type StageStats } from './viewBattle';
import { HudStates } from './viewHudStates';
import type { SourceKind } from './viewSources';

export const title = 'Spawn sandbox';

type Tab = 'battle' | 'hud' | 'sim';

const page = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#1b1a2e',
  color: '#f4ecd8',
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
} as const;
const bar = { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '6px 10px', borderBottom: '1px solid #3a3960' } as const;
const btn = (on = false) =>
  ({
    padding: '3px 9px',
    background: on ? '#f2c14e' : '#2c2b44',
    color: on ? '#1b1a2e' : '#f4ecd8',
    border: '1px solid #4a4970',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '12px',
  }) as const;

function tabFromHash(): Tab {
  const sub = window.location.hash.split('/')[1];
  return sub === 'hud' || sub === 'sim' ? sub : 'battle';
}

function param<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const v = new URLSearchParams(window.location.search).get(name);
  return (allowed as readonly string[]).includes(v ?? '') ? (v as T) : fallback;
}

function Stats(p: { s: StageStats | null }) {
  const s = p.s;
  if (!s) return <div>starting…</div>;
  const v = s.view;
  const row = (k: string, val: string | number, bad = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: bad ? '#ff8a7a' : undefined }}>
      <span>{k}</span>
      <b>{val}</b>
    </div>
  );
  const budget = v.preset === 'lite' ? 40 : 80;
  return (
    <div data-testid="sandbox-stats" data-fps={s.fps.toFixed(1)} data-cpu={s.cpuMs.toFixed(2)} data-draws={s.drawCalls}>
      {row('fps', s.fps.toFixed(1), s.fps < 55)}
      {row('frame ms (avg / worst)', `${s.frameMs.toFixed(1)} / ${s.worstFrameMs.toFixed(1)}`)}
      {row('cpu ms per frame', s.cpuMs.toFixed(2), s.cpuMs > 8)}
      {row('  of which sim / view', `${s.simMs.toFixed(2)} / ${s.viewMs.toFixed(2)}`)}
      {row(`draw calls (≤ ${budget})`, s.drawCalls, s.drawCalls > budget)}
      {row('sim tick', s.tick)}
      {row('units', v.units)}
      {row('projectiles', v.projectiles)}
      {row('particles / cap', `${v.particles} / ${v.particleCap}`)}
      {row('particles dropped', v.dropped)}
      {row('numbers', v.numbers)}
      {row('trauma', v.trauma.toFixed(2))}
      {row('global freeze used (3 s)', `${Math.round(v.freezeUsedMs)} ms`)}
      {row('preset', v.preset)}
      {row('seam x', v.seam.toFixed(0))}
      {row('zoom', v.zoom.toFixed(2))}
      {row('art', s.artNote)}
    </div>
  );
}

function SettingsBox(p: { s: ViewSettings; set: (s: ViewSettings) => void }) {
  const { s, set } = p;
  const sel = <K extends keyof ViewSettings>(k: K, options: readonly ViewSettings[K][]) => (
    <label style={{ display: 'block' }}>
      {k}{' '}
      <select value={String(s[k])} onChange={(e) => set({ ...s, [k]: options.find((o) => String(o) === (e.target as HTMLSelectElement).value) ?? s[k] })}>
        {options.map((o) => (
          <option key={String(o)} value={String(o)}>
            {String(o)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div>
      {sel('graphics', ['auto', 'high', 'lite'])}
      {sel('damageNumbers', ['off', 'important', 'all'])}
      {sel('teamPreset', ['default', 'blueYellow', 'highContrast'])}
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.reduceMotion} onChange={(e) => set({ ...s, reduceMotion: (e.target as HTMLInputElement).checked })} /> reduce motion
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.hitstop} onChange={(e) => set({ ...s, hitstop: (e.target as HTMLInputElement).checked })} /> hitstop
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.mutedEmotes} onChange={(e) => set({ ...s, mutedEmotes: (e.target as HTMLInputElement).checked })} /> mute AI emotes
      </label>
      <label style={{ display: 'block' }}>
        shake {s.shake.toFixed(2)}{' '}
        <input type="range" min={0} max={1} step={0.05} value={s.shake} onInput={(e) => set({ ...s, shake: Number((e.target as HTMLInputElement).value) })} />
      </label>
    </div>
  );
}

function SoundLog(p: { api: StageApi | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  const played = p.api?.audio.played().slice(-14).reverse() ?? [];
  return (
    <div>
      {played.map((id, i) => (
        <div key={`${i}-${id}`} style={{ opacity: 1 - i / 16 }}>
          {id}
        </div>
      ))}
    </div>
  );
}

function BattleTab(p: { bare?: boolean }) {
  const [source, setSource] = useState<SourceKind>(() => param('source', ['fake', 'real', 'stress'] as const, 'fake'));
  const [art, setArt] = useState<ArtKind>(() => param('art', ['fake', 'procedural'] as const, 'fake'));
  const [opponent, setOpponent] = useState<OpponentKind>(() => param('opponent', ['ai', 'autoplayer'] as const, 'ai'));
  const [format, setFormat] = useState<FormatId>(() => param('format', ['full', 'standard', 'short', 'tutorial'] as const, 'full'));
  const [seed, setSeed] = useState(1);
  const [autoplayMe, setAutoplayMe] = useState(() => param('autoplay', ['1', '0'] as const, '0') === '1');
  const [settings, setSettings] = useState<ViewSettings>({ ...DEFAULT_VIEW_SETTINGS });
  // `&speed=2` starts fast (browser checks that wait for a recharge, e.g. the Fort slot's first 20 s).
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(() => Number(param('speed', ['1', '1.5', '2'] as const, '1')) as 1 | 1.5 | 2);
  const [paused, setPaused] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [stats, setStats] = useState<StageStats | null>(null);
  const [api, setApi] = useState<StageApi | null>(null);
  const [panel, setPanel] = useState(true);

  const options: StageOptions = { source, art, opponent, format, seed, autoplayMe, settings, speed, paused, loop: true };
  // Browser checks (Playwright) reach the running stage through this dev-only handle.
  useEffect(() => {
    (window as unknown as { __sandbox?: StageApi | null }).__sandbox = api;
    const sim = api?.source.sim;
    (window as unknown as { __sandboxDev?: unknown }).__sandboxDev = sim
      ? {
          gold: (side: Side, n: number) => devSetGold(sim, side, n),
          power: (side: Side, ppm: number, slot?: PowerSlot) => devSetPower(sim, side, ppm, slot),
          spawn: (side: Side, card: CardId, p: number) => devSpawn(sim, side, card, { p }).id,
          clear: () => devClearLane(sim),
          /** Places an active turret on a mount (power effect checks: Suppress needs enemy turrets). */
          turret: (side: Side, mount: number, card: CardId) => devPlaceTurret(sim, side, mount, card),
          /** Puts powers in a side's current loadout (every age), for trying a power in the sandbox. */
          powers: (side: Side, home: CardId | null, field: CardId | null) => {
            for (const lo of Object.values(sim.config.sides[side].loadouts)) if (lo) (lo as { powers: { home: CardId | null; field: CardId | null } }).powers = { home, field };
          },
          pause: (on: boolean) => setPaused(on),
          /** Places a fort (or trap) for a side on a pad (A16.14), for the Fort HUD checks. */
          fort: (side: Side, card: CardId, o: { pad?: number; done?: boolean } = {}) => devPlaceFort(sim, side, card, o),
        }
      : null;
  }, [api]);
  if (p.bare) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <BattleStage options={options} runKey={runKey} onApi={setApi} onStats={setStats} onPause={() => setPaused((v) => !v)} onSpeed={setSpeed} />
      </div>
    );
  }
  return (
    <>
      <div style={bar}>
        <label>
          source{' '}
          <select data-testid="sandbox-source" value={source} onChange={(e) => setSource((e.target as HTMLSelectElement).value as SourceKind)}>
            <option value="fake">fake event stream</option>
            <option value="real">real sim (you vs a bot)</option>
            <option value="stress">stress: 80 units</option>
          </select>
        </label>
        <label>
          art{' '}
          <select data-testid="sandbox-art" value={art} onChange={(e) => setArt((e.target as HTMLSelectElement).value as ArtKind)}>
            <option value="fake">fake rectangles</option>
            <option value="procedural">procedural (WP4)</option>
          </select>
        </label>
        {source !== 'fake' ? (
          <>
            <label>
              bot{' '}
              <select data-testid="sandbox-opponent" value={opponent} onChange={(e) => setOpponent((e.target as HTMLSelectElement).value as OpponentKind)}>
                <option value="ai">AI General (WP3)</option>
                <option value="autoplayer">dev autoplayer</option>
              </select>
            </label>
            <label>
              format{' '}
              <select value={format} onChange={(e) => setFormat((e.target as HTMLSelectElement).value as FormatId)}>
                {(['full', 'standard', 'short', 'tutorial'] as const).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label>
              seed <input type="number" style={{ width: '60px' }} value={seed} onInput={(e) => setSeed(Number((e.target as HTMLInputElement).value) || 1)} />
            </label>
            <label>
              <input type="checkbox" checked={autoplayMe} onChange={(e) => setAutoplayMe((e.target as HTMLInputElement).checked)} /> autoplay my side
            </label>
          </>
        ) : null}
        <button style={btn()} onClick={() => setRunKey((k) => k + 1)} data-testid="sandbox-restart">
          restart
        </button>
        <button style={btn(paused)} onClick={() => setPaused(!paused)}>
          {paused ? 'resume' : 'pause'}
        </button>
        {([1, 1.5, 2] as const).map((s) => (
          <button key={s} style={btn(speed === s)} onClick={() => setSpeed(s)}>
            {s}x
          </button>
        ))}
        <button style={btn(panel)} onClick={() => setPanel(!panel)}>
          panel
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <BattleStage
            options={options}
            runKey={runKey}
            onApi={setApi}
            onStats={setStats}
            onPause={() => setPaused((v) => !v)}
            onSpeed={setSpeed}
          />
        </div>
        {panel ? (
          <div style={{ width: '250px', padding: '8px 10px', borderLeft: '1px solid #3a3960', overflow: 'auto', flex: 'none' }}>
            <h3 style={{ margin: '0 0 6px' }}>Counters</h3>
            <Stats s={stats} />
            <h3 style={{ margin: '12px 0 6px' }}>Settings</h3>
            <SettingsBox s={settings} set={setSettings} />
            <h3 style={{ margin: '12px 0 6px' }}>Sounds (newest first)</h3>
            <SoundLog api={api} />
            <p style={{ color: '#9d98b8' }}>
              Keys: 1-5 train, Backspace cancel, Q/W turrets, B mount, T Treasury, E evolve, Space power, S stance, L Last Stand, P pause, F speed. Drag the
              power button onto the lane to place it; tap a mount on your base.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function Sandbox() {
  const [tab, setTab] = useState<Tab>(tabFromHash());
  const bare = new URLSearchParams(window.location.search).get('stage') === '1';
  useEffect(() => {
    const on = () => setTab(tabFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (t: Tab) => {
    window.location.hash = `sandbox/${t}`;
    setTab(t);
  };
  if (bare) return <BattleTab bare />;
  return (
    <div style={page} data-testid="sandbox-page">
      <div style={bar}>
        <b>Sandbox</b>
        <button style={btn(tab === 'battle')} onClick={() => go('battle')} data-testid="sandbox-tab-battle">
          battle view
        </button>
        <button style={btn(tab === 'hud')} onClick={() => go('hud')} data-testid="sandbox-tab-hud">
          HUD states
        </button>
        <button style={btn(tab === 'sim')} onClick={() => go('sim')} data-testid="sandbox-tab-sim">
          sim panel (WP2)
        </button>
        <a href="?dev=1#feel" style={{ color: '#f2c14e' }}>
          feel tuner
        </a>
        <a href="?dev=1" style={{ color: '#9fc3ff' }}>
          all dev pages
        </a>
      </div>
      {tab === 'battle' ? <BattleTab /> : null}
      {tab === 'hud' ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <HudStates />
        </div>
      ) : null}
      {tab === 'sim' ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <SimPanel />
        </div>
      ) : null}
    </div>
  );
}
