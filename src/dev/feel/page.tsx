/**
 * Feel tuner (`?dev=1#feel`, DESIGN A12: "All values live in `src/render/feel.config.json` and can be
 * tuned live from the dev feel panel").
 *
 * A running battle on the left; on the right every number of the feel config, applied live, plus
 * buttons that fire single A12 events (hits, deaths, power, evolve, Last Stand, base destroyed, ...)
 * into the view so one rule can be judged at a time. Edits persist in this browser; "Copy JSON" puts
 * the config on the clipboard for pasting into `src/render/feel.config.json`.
 */
import type { AgeId, Side, SimEvent } from '@/contracts';
import { DEFAULT_VIEW_SETTINGS, ageOrder, cloneFeelConfig, defaultFeelConfig, validateFeelConfig, type RenderFeelConfig } from '@/render';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { BattleStage, type ArtKind, type StageApi, type StageOptions, type StageStats } from '../sandbox/viewBattle';
import type { SourceKind } from '../sandbox/viewSources';

export const title = 'Feel tuner';

const STORE_KEY = 'ageborn.dev.feel';

const page = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  background: '#1b1a2e',
  color: '#f4ecd8',
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
} as const;
const btn = { padding: '3px 8px', margin: '0 4px 4px 0', background: '#2c2b44', color: '#f4ecd8', border: '1px solid #4a4970', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' } as const;
const num = { width: '64px', background: '#11101f', color: '#f4ecd8', border: '1px solid #4a4970', fontFamily: 'inherit', fontSize: '12px' } as const;

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function loadStored(): RenderFeelConfig {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RenderFeelConfig;
      if (validateFeelConfig(parsed).length === 0) return parsed;
    }
  } catch {
    // Private mode or broken data: start from the file.
  }
  return cloneFeelConfig(defaultFeelConfig);
}

function setPath(root: RenderFeelConfig, path: (string | number)[], value: Json): RenderFeelConfig {
  const next = cloneFeelConfig(root);
  let cur = next as unknown as Record<string | number, Json>;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i] as string] as unknown as Record<string | number, Json>;
  cur[path[path.length - 1] as string] = value;
  return next;
}

/** A generic editor: numbers get inputs, strings text fields, objects nest. */
function Field(p: { name: string; value: Json; path: (string | number)[]; onSet: (path: (string | number)[], v: Json) => void; depth: number }) {
  const { name, value, path } = p;
  if (typeof value === 'number') {
    return (
      <label style={{ display: 'inline-flex', gap: '4px', marginRight: '10px', whiteSpace: 'nowrap' }}>
        {name}
        <input style={num} type="number" step="any" value={value} onChange={(e) => p.onSet(path, Number((e.target as HTMLInputElement).value))} />
      </label>
    );
  }
  if (typeof value === 'string') {
    return (
      <label style={{ display: 'inline-flex', gap: '4px', marginRight: '10px' }}>
        {name}
        <input style={{ ...num, width: '130px' }} value={value} onChange={(e) => p.onSet(path, (e.target as HTMLInputElement).value)} />
      </label>
    );
  }
  if (typeof value === 'boolean') {
    return (
      <label style={{ marginRight: '10px' }}>
        <input type="checkbox" checked={value} onChange={(e) => p.onSet(path, (e.target as HTMLInputElement).checked)} /> {name}
      </label>
    );
  }
  if (value === null) return null;
  const entries: [string, Json][] = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  const inner = entries.map(([k, v]) => <Field key={k} name={k} value={v} path={[...path, Array.isArray(value) ? Number(k) : k]} onSet={p.onSet} depth={p.depth + 1} />);
  if (p.depth === 0) return <div>{inner}</div>;
  return (
    <div style={{ margin: '2px 0 2px 10px', padding: '2px 6px', borderLeft: '1px solid #3a3960' }}>
      <div style={{ color: '#f2c14e' }}>{name}</div>
      {inner}
    </div>
  );
}

/** Synthetic events for the trigger buttons, built around live units of the running stage. */
function trigger(api: StageApi, kind: string): void {
  const st = api.source.sim.state;
  const tick = st.tick;
  const units = st.units;
  const pick = (side: Side | null) => {
    const list = units.filter((u) => side === null || u.side === side);
    return list[Math.floor(Math.random() * list.length)];
  };
  const foe = pick(1) ?? pick(null);
  const mine = pick(0) ?? pick(null);
  const ages = ageOrder(api.source.sim.config);
  const nextAge = (side: Side): AgeId => ages[Math.min(ages.length - 1, st.sides[side].ageIndex + 1)] ?? 'medieval';
  const powerOf = (side: Side): string => api.source.sim.config.sides[side].loadouts[ages[st.sides[side].ageIndex] ?? 'stone']?.powers.home ?? '';
  const hit = (heavy: boolean, modBp: number, dmg: number): SimEvent[] =>
    foe
      ? [
          {
            tick,
            e: 'hit',
            targetId: foe.id,
            sourceId: mine?.id ?? 0,
            sourceCard: mine?.card ?? '',
            castId: null,
            sourceKind: 'unit',
            damage: dmg,
            shieldAbsorbed: 0,
            heavy,
            modBp,
            x: foe.x,
            dmgType: 'slash',
          },
        ]
      : [];
  const death = (u: typeof foe, killerSide: Side): SimEvent[] =>
    u
      ? [
          {
            tick,
            e: 'died',
            id: u.id,
            side: u.side,
            card: u.card,
            killerId: null,
            killerCard: null,
            killerKind: 'unit',
            killerSide,
            bountyGold: 45_000,
            bountyXp: 30_000,
            x: u.x,
          },
          { tick, e: 'goldEarned', side: killerSide, amount: 45_000, reason: 'bounty', x: u.x },
        ]
      : [];
  const later = (ms: number, evs: SimEvent[]) => setTimeout(() => api.inject(evs), ms);
  switch (kind) {
    case 'light hit':
      api.inject(hit(false, 10000, 1500));
      return;
    case 'heavy hit':
      api.inject(hit(true, 10000, 9000));
      return;
    case 'effective hit':
      api.inject(hit(false, 15000, 2500));
      return;
    case 'resisted hit':
      api.inject(hit(false, 7000, 800));
      return;
    case 'kill (coins)':
      api.inject(death(foe, 0));
      return;
    case 'your unit dies':
      api.inject(death(mine, 1));
      return;
    case 'turret shot':
      api.inject([{ tick, e: 'turretFired', side: 0, mount: 0, targetId: foe?.id ?? 0 }]);
      return;
    case 'base hit':
      // An attacker id: `sourceId: null` is Siege decay, which only crumbles quietly.
      api.inject([{ tick, e: 'baseDamaged', side: 1, sourceId: mine?.id ?? 1, damage: 6000, hp: st.sides[1].baseHp, maxHp: st.sides[1].baseMaxHp }]);
      return;
    case 'power': {
      // The whole cast, roughly as the sim plays it: telegraph, then every impact of the pattern.
      const x = foe?.x ?? 700_000;
      const power = powerOf(0);
      const fx = api.source.sim.config.content.powers[power]?.effect;
      const zone = fx === undefined ? 400 : 'zone' in fx ? fx.zone : fx.kind === 'cloud' ? fx.width : fx.kind === 'stampede' ? fx.distance : 0;
      // Sim units: x and zone in milli-lu (B3).
      api.inject([{ tick, e: 'powerTelegraph', side: 0, slot: 'home', power, castId: 999, x, zone: zone * 1000, cost: 0, targetId: -1, telegraphMs: 1000 }]);
      const spread = fx?.kind === 'barrage' || fx?.kind === 'sweep';
      const impacts = fx?.kind === 'barrage' ? fx.count : fx?.kind === 'stampede' ? fx.runners : fx?.kind === 'sweep' ? Math.round(fx.durationMs / 50) : 1;
      const spanMs = spread ? fx.durationMs : fx?.kind === 'stampede' ? fx.spacingMs * impacts : 0;
      for (let i = 0; i < impacts; i++) {
        const at = spread ? x - (zone * 1000) / 2 + Math.round(((i + 0.5) * zone * 1000) / impacts) : x;
        later(1000 + Math.round((i * spanMs) / impacts), [{ tick, e: 'powerImpact', side: 0, power, castId: 999, x: at, index: i }]);
      }
      return;
    }
    case 'evolve (you)':
      api.inject([{ tick, e: 'ascendStart', side: 0, age: nextAge(0) }]);
      later(2500, [{ tick, e: 'ageUp', side: 0, age: nextAge(0) }]);
      return;
    case 'evolve (AI)':
      api.inject([{ tick, e: 'ascendStart', side: 1, age: nextAge(1) }]);
      later(2500, [{ tick, e: 'ageUp', side: 1, age: nextAge(1) }]);
      return;
    case 'Last Stand':
      api.inject([
        { tick, e: 'lastStandArmed', side: 0 },
        { tick, e: 'lastStandCharge', side: 0 },
      ]);
      later(1000, [{ tick, e: 'lastStandFire', side: 0 }]);
      return;
    case 'Overdrive':
      api.inject([{ tick, e: 'phaseChanged', phase: 'overdrive' }]);
      return;
    case 'Siege':
      api.inject([{ tick, e: 'phaseChanged', phase: 'siege' }]);
      return;
    case 'AI emote':
      api.inject([{ tick, e: 'emote', side: 1, emote: 'gg' }]);
      return;
    case 'denied':
      api.inject([{ tick, e: 'commandRejected', side: 0, t: 'train', reason: 'gold' }]);
      return;
    case 'base destroyed (ends)':
      api.inject([{ tick, e: 'matchEnded', result: { winner: 0, reason: 'baseDestroyed', tick, baseHpBp: [8000, 0] } }]);
      return;
  }
}

const TRIGGERS = [
  'light hit',
  'heavy hit',
  'effective hit',
  'resisted hit',
  'kill (coins)',
  'your unit dies',
  'turret shot',
  'base hit',
  'power',
  'evolve (you)',
  'evolve (AI)',
  'Last Stand',
  'Overdrive',
  'Siege',
  'AI emote',
  'denied',
  'base destroyed (ends)',
];

export default function FeelPage() {
  const [feel, setFeel] = useState<RenderFeelConfig>(loadStored);
  const [api, setApi] = useState<StageApi | null>(null);
  const [stats, setStats] = useState<StageStats | null>(null);
  const [source, setSource] = useState<SourceKind>('real');
  const [art, setArt] = useState<ArtKind>('fake');
  const [runKey, setRunKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const problems = useMemo(() => validateFeelConfig(feel), [feel]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(feel));
    } catch {
      // Storage may be unavailable; tuning still works for this session.
    }
  }, [feel]);

  const options: StageOptions = {
    source,
    art,
    opponent: 'autoplayer',
    format: 'full',
    seed: 7,
    autoplayMe: true,
    settings: { ...DEFAULT_VIEW_SETTINGS, damageNumbers: feel.damageNumbers },
    speed: 1,
    paused: false,
    loop: true,
    feel,
  };
  const onSet = (path: (string | number)[], v: Json) => setFeel((f) => setPath(f, path, v));
  const { events, tuning, ...globals } = feel;

  return (
    <div style={page} data-testid="feel-page">
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid #3a3960', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <b>Feel tuner</b>
          <select value={source} onChange={(e) => setSource((e.target as HTMLSelectElement).value as SourceKind)}>
            <option value="real">real sim, bot vs bot</option>
            <option value="fake">fake event stream</option>
            <option value="stress">stress: 80 units</option>
          </select>
          <select value={art} onChange={(e) => setArt((e.target as HTMLSelectElement).value as ArtKind)}>
            <option value="fake">fake art</option>
            <option value="procedural">procedural art (WP4)</option>
          </select>
          <button style={btn} onClick={() => setRunKey((k) => k + 1)}>
            restart
          </button>
          <span>{stats ? `${stats.fps.toFixed(0)} fps · trauma ${stats.view.trauma.toFixed(2)} · freeze ${Math.round(stats.view.freezeUsedMs)} ms / 3 s` : ''}</span>
          <a href="?dev=1#sandbox" style={{ color: '#f2c14e' }}>
            sandbox
          </a>
        </div>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <BattleStage options={options} runKey={runKey} onApi={setApi} onStats={setStats} />
        </div>
      </div>
      <div style={{ width: '440px', flex: 'none', overflow: 'auto', padding: '8px 10px', borderLeft: '1px solid #3a3960' }}>
        <h3 style={{ margin: '0 0 6px' }}>Fire one event</h3>
        <div>
          {TRIGGERS.map((k) => (
            <button key={k} style={btn} disabled={!api} onClick={() => api && trigger(api, k)} data-testid={`feel-trigger-${k.replace(/\W+/g, '-')}`}>
              {k}
            </button>
          ))}
        </div>
        <div style={{ margin: '8px 0' }}>
          <button
            style={btn}
            onClick={() => {
              void navigator.clipboard?.writeText(`${JSON.stringify(feel, null, 2)}\n`).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? 'copied' : 'copy JSON'}
          </button>
          <button style={btn} onClick={() => setFeel(cloneFeelConfig(defaultFeelConfig))}>
            reset to file
          </button>
        </div>
        {problems.length > 0 ? (
          <div style={{ color: '#ff8a7a' }} data-testid="feel-problems">
            {problems.map((p) => (
              <div key={p}>{p}</div>
            ))}
          </div>
        ) : null}
        <h3 style={{ margin: '10px 0 4px' }}>Global</h3>
        <Field name="" value={globals as unknown as Json} path={[]} onSet={onSet} depth={0} />
        <h3 style={{ margin: '10px 0 4px' }}>Tuning</h3>
        <Field name="" value={tuning as unknown as Json} path={['tuning']} onSet={onSet} depth={0} />
        <h3 style={{ margin: '10px 0 4px' }}>Events (A12 table)</h3>
        {Object.entries(events).map(([key, rule]) => (
          <details key={key} style={{ marginBottom: '2px' }}>
            <summary style={{ cursor: 'pointer' }}>{key}</summary>
            <Field name={key} value={rule as unknown as Json} path={['events', key]} onSet={onSet} depth={1} />
          </details>
        ))}
      </div>
    </div>
  );
}
