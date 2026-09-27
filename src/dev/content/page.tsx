/**
 * Dev page: content browser (WP1). Open with `?dev=1#content`.
 *
 * Shows the validation result (Valibot schema and cross-references, DESIGN B4), the content hash,
 * the card tables with their "Strong vs" / "Weak vs" hints, the counter matrix as a heatmap, a duel
 * inspector that re-runs any pair live, and the meta tables. Dev pages are exempt from the i18n rule.
 */
import { useMemo, useState } from 'preact/hooks';
import type { UnitDef } from '@/contracts/content';
import { content, counterFile, type Content } from '@/content';
import { duelUnitTable, duelPair, counterInputHash } from '@/content/counters/matrix';
import { raw } from '@/content/raw';
import { validateContent, validateRaw } from '@/content/schema';
import { i18n } from '@/i18n';

export const title = 'Content browser';

const page = {
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
  color: '#f4ecd8',
  background: '#1b1a2e',
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
  padding: '16px',
  boxSizing: 'border-box',
} as const;
const th = { textAlign: 'left', padding: '2px 8px', borderBottom: '1px solid #444', position: 'sticky', top: 0, background: '#1b1a2e' } as const;
const td = { padding: '2px 8px', borderBottom: '1px solid #2c2b44', whiteSpace: 'nowrap' } as const;
const tabButton = (active: boolean) =>
  ({
    marginRight: '6px',
    padding: '4px 10px',
    background: active ? '#f2c14e' : '#2c2b44',
    color: active ? '#1b1a2e' : '#f4ecd8',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  }) as const;

const TABS = ['summary', 'units', 'turrets', 'powers', 'counters', 'duel', 'meta'] as const;
type Tab = (typeof TABS)[number];

const name = (id: string): string => i18n.t(`card.${id}.name`);

function hits(u: UnitDef): string {
  const a = u.attacks[0];
  if (!a) return '-';
  return a.hitsGround && a.hitsAir ? 'G+A' : a.hitsAir ? 'A' : 'G';
}

/** Red (0) → grey (0.5) → green (1). */
function heat(m: number): string {
  const d = Math.abs(m - 0.5) * 2;
  const hue = m >= 0.5 ? 130 : 0;
  return `hsl(${hue} ${Math.round(d * 70)}% ${Math.round(22 + d * 18)}%)`;
}

function Summary({ c }: { c: Content }) {
  const issues = useMemo(() => [...validateRaw(raw), ...validateContent(c)], [c]);
  const stale = counterFile.inputHash !== counterInputHash(raw.ages.flatMap((t) => t.units), raw.economy, raw.battle);
  return (
    <div>
      <p>
        contentHash <b>{c.hash}</b> · {c.order.units.length} units (+{c.order.hiddenUnits.length} hidden) · {c.order.turrets.length} turrets ·{' '}
        {c.order.powers.length} powers · {c.order.skins.length} skins · {c.trophyRoad.nodes.length} road nodes · {c.generals.order.length} generals
      </p>
      <p>
        Counter matrix: engine {counterFile.engine}, input hash {counterFile.inputHash}{' '}
        {stale ? <b style={{ color: '#ff7a7a' }}>STALE: run npx tsx tools/counters.ts</b> : <span style={{ color: '#7ad97a' }}>up to date</span>}
      </p>
      <h3>Validation</h3>
      {issues.length === 0 ? (
        <p style={{ color: '#7ad97a' }} data-testid="content-valid">
          No issues: schema, cross-references, collection shape, road, capsules and counters all check out.
        </p>
      ) : (
        <ul style={{ color: '#ff7a7a' }} data-testid="content-issues">
          {issues.map((i) => (
            <li key={`${i.path}:${i.message}`}>
              {i.path}: {i.message}
            </li>
          ))}
        </ul>
      )}
      <h3>Ticks</h3>
      <pre>{JSON.stringify(c.ticks, null, 1)}</pre>
    </div>
  );
}

function Units({ c }: { c: Content }) {
  const ids = [...c.order.units, ...c.order.hiddenUnits];
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['age', 'card', 'rar', 'role', 'group', 'cost', 'pop', 'train', 'hp', 'dmg/int', 'range', 'speed', 'size', 'hits', 'tags', 'strong vs', 'weak vs'].map(
            (h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {ids.map((id) => {
          const u = c.units[id];
          if (!u) return null;
          const a = u.attacks[0];
          return (
            <tr key={id}>
              <td style={td}>{u.age}</td>
              <td style={td} title={i18n.t(u.descKey)}>
                {name(id)}
                {u.hidden ? ' (hidden)' : ''}
              </td>
              <td style={td}>{u.rarity}</td>
              <td style={td}>{u.role}</td>
              <td style={td}>{u.group}</td>
              <td style={td}>{u.cost}</td>
              <td style={td}>{u.pop}</td>
              <td style={td}>{u.trainMs / 1000}s</td>
              <td style={td}>{u.hp}</td>
              <td style={td}>{a ? `${a.damage} / ${a.intervalMs / 1000}s` : '-'}</td>
              <td style={td}>{a ? a.range : '-'}</td>
              <td style={td}>{u.speed}</td>
              <td style={td}>{u.size}</td>
              <td style={td}>{hits(u)}</td>
              <td style={td}>{u.tags.join(' ')}</td>
              <td style={td}>{u.strongVs.map(name).join(', ')}</td>
              <td style={td}>{u.weakVs.map(name).join(', ')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Turrets({ c }: { c: Content }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['age', 'turret', 'rar', 'cost', 'dmg/int', 'range', 'hits', 'extras'].map((h) => (
            <th key={h} style={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {c.order.turrets.map((id) => {
          const t = c.turrets[id];
          if (!t) return null;
          const { damage, intervalMs, range, hitsGround, hitsAir, ...rest } = t.attack;
          const extras = Object.entries(rest)
            .filter(([k]) => !['dmgType', 'sfx', 'windupPct', 'projectile'].includes(k))
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(' ');
          return (
            <tr key={id}>
              <td style={td}>{t.age}</td>
              <td style={td} title={i18n.t(t.descKey)}>
                {name(id)}
              </td>
              <td style={td}>{t.rarity}</td>
              <td style={td}>{t.cost}</td>
              <td style={td}>
                {damage} / {intervalMs / 1000}s
              </td>
              <td style={td}>{range}</td>
              <td style={td}>{hitsGround && hitsAir ? 'G+A' : hitsAir ? 'A' : 'G'}</td>
              <td style={td}>{extras}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Powers({ c }: { c: Content }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {c.order.powers.map((id) => {
          const p = c.powers[id];
          if (!p) return null;
          return (
            <tr key={id}>
              <td style={td}>{p.age}</td>
              <td style={td}>{p.slot}</td>
              <td style={td} title={i18n.t(p.descKey)}>
                {name(id)}
              </td>
              <td style={td}>{JSON.stringify(p.effect)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Counters({ c, onPick }: { c: Content; onPick: (a: string, b: string) => void }) {
  const ids = c.order.units;
  return (
    <div>
      <p>M[row][col]: green = row wins, red = row loses (equal-gold duels at L1, B4). Click a cell to inspect the duel.</p>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th} />
            {ids.map((b) => (
              <th key={b} style={{ ...th, writingMode: 'vertical-rl', fontWeight: 'normal', padding: '2px' }}>
                {name(b)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((a) => (
            <tr key={a}>
              <td style={td}>{name(a)}</td>
              {ids.map((b) => {
                const m = c.counters[a]?.[b] ?? 0.5;
                return (
                  <td
                    key={b}
                    title={`${name(a)} vs ${name(b)}: ${(m * 100).toFixed(1)}%`}
                    onClick={() => onPick(a, b)}
                    style={{ width: '14px', height: '14px', background: heat(m), cursor: 'pointer', border: '1px solid #1b1a2e' }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Duel({ c, pair, setPair }: { c: Content; pair: [string, string]; setPair: (p: [string, string]) => void }) {
  const [a, b] = pair;
  const result = useMemo(() => {
    const table = duelUnitTable(Object.values(c.units));
    return duelPair({ units: table, economy: c.economy, battle: c.battle }, a, b);
  }, [c, a, b]);
  const select = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)} style={{ fontFamily: 'inherit' }}>
      {c.order.units.map((id) => (
        <option key={id} value={id}>
          {name(id)}
        </option>
      ))}
    </select>
  );
  const m = c.counters[a]?.[b];
  return (
    <div>
      <p>
        {select(a, (v) => setPair([v, b]))} vs {select(b, (v) => setPair([a, v]))}
      </p>
      <p>
        Equal gold: {result.countA} × {name(a)} ({result.countA * (c.units[a]?.cost ?? 0)} gold) vs {result.countB} × {name(b)} (
        {result.countB * (c.units[b]?.cost ?? 0)} gold)
      </p>
      <p>
        HP left (average of both side assignments): {name(a)} {(result.hpLeftA / 100).toFixed(1)}% · {name(b)}{' '}
        {(result.hpLeftB / 100).toFixed(1)}% · {(result.ticks / 20).toFixed(1)} s
      </p>
      <p>
        M[{a}][{b}] = {m === undefined ? 'n/a' : `${(m * 100).toFixed(1)}%`} (0.5 + (hpLeft_a − hpLeft_b) / 2)
      </p>
    </div>
  );
}

function Meta({ c }: { c: Content }) {
  const blocks: [string, unknown][] = [
    ['capsules.tiers', c.capsules.tiers],
    ['capsules (odds, pity, charges, script)', { ...c.capsules, tiers: undefined, kinds: undefined }],
    ['arenas', c.arenas],
    ['trophyRoad', c.trophyRoad.nodes.map((n) => `${n.trophies}: ${n.rewards.map((r) => JSON.stringify(r)).join(' + ')}`)],
    ['generals', c.generals],
    ['quests', c.quests],
    ['dailyModifiers', c.dailyModifiers],
    ['rarities', c.rarities],
    ['cosmetics', c.cosmetics],
    ['names', c.names],
    ['economy', c.economy],
  ];
  return (
    <div>
      {blocks.map(([label, value]) => (
        <details key={label}>
          <summary style={{ cursor: 'pointer' }}>{label}</summary>
          <pre>{JSON.stringify(value, null, 1)}</pre>
        </details>
      ))}
    </div>
  );
}

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>('summary');
  const [pair, setPair] = useState<[string, string]>(['bonker', 'tuskback']);
  return (
    <div style={page} data-testid="dev-content">
      <h2 style={{ marginTop: 0 }}>Content browser</h2>
      <p>
        {TABS.map((t) => (
          <button key={t} type="button" style={tabButton(t === tab)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </p>
      {tab === 'summary' && <Summary c={content} />}
      {tab === 'units' && <Units c={content} />}
      {tab === 'turrets' && <Turrets c={content} />}
      {tab === 'powers' && <Powers c={content} />}
      {tab === 'counters' && (
        <Counters
          c={content}
          onPick={(a, b) => {
            setPair([a, b]);
            setTab('duel');
          }}
        />
      )}
      {tab === 'duel' && <Duel c={content} pair={pair} setPair={setPair} />}
      {tab === 'meta' && <Meta c={content} />}
    </div>
  );
}
