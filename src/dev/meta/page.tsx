/**
 * Dev page: meta rules sandbox (WP7). Open with `?dev=1#meta`.
 *
 * Drives a save through the real meta rules (`src/meta`) with a controllable clock: play matches in
 * every mode, grant and open capsules and crates (the pre-rolled contents, climbs and pity before and
 * after), upgrade and craft, claim quests, the Daily Capsule and Trophy Road nodes, check War Plans
 * with the advisor, preview opponents, and run a quick drop-rate sample. Nothing is persisted. Dev
 * pages are exempt from the i18n rule.
 */
import { useMemo, useState } from 'preact/hooks';
import type { CapsuleReveal, FormatId, MatchResultInput, OpponentSpec, PendingCapsule, RewardStep, SaveDoc, WardrobeReveal } from '@/contracts';
import { content } from '@/content';
import { i18n } from '@/i18n';
import { bagLeft, claimableRoadNodes, createMeta, ladderTier, nextChargeInMs, upgradeBlocker, upgradeCost, type LocalClock } from '@/meta';

export const title = 'Meta rules';

const meta = createMeta(content);
const C = meta.content;
const HOUR = 3_600_000;

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
const box = { border: '1px solid #3a3960', borderRadius: '6px', padding: '8px 10px', margin: '0 0 10px' } as const;
const btn = { margin: '2px 4px 2px 0', padding: '3px 8px', background: '#2c2b44', color: '#f4ecd8', border: '1px solid #4a4970', cursor: 'pointer', fontFamily: 'inherit' } as const;
const td = { padding: '1px 8px', borderBottom: '1px solid #2c2b44', whiteSpace: 'nowrap' } as const;
const RARITY_COLOR: Record<string, string> = { common: '#B8C0CC', rare: '#22B8CF', epic: '#A855F7', legendary: '#F5B82E' };

const name = (id: string): string => (i18n.has(`card.${id}.name`) ? i18n.t(`card.${id}.name`) : i18n.has(`skin.${id}.name`) ? i18n.t(`skin.${id}.name`) : id);
const t = (key: string): string => (i18n.has(key) ? i18n.t(key) : key);

function clockAt(now: number): LocalClock {
  return { now: () => now, offsetMs: (x) => -new Date(x).getTimezoneOffset() * 60_000 };
}

function stepText(r: RewardStep): string {
  switch (r.kind) {
    case 'trophies':
      return `trophies ${r.delta >= 0 ? '+' : ''}${r.delta}`;
    case 'amber':
      return `+${r.amount} Amber`;
    case 'dust':
      return `+${r.amount} Dust`;
    case 'capsule':
      return `capsule ${r.capsuleId}`;
    case 'clayPip':
      return `Clay pip ${r.meter}/3`;
    case 'codex':
      return `Codex +${r.points}${r.levelUp ? ' (level up)' : ''}`;
    case 'quest':
      return `quest ${r.questId} ${r.progress}${r.done ? ' done' : ''}`;
    case 'star':
      return `star ${r.star} vs ${r.generalId}`;
    case 'arena':
      return `arena ${r.arenaIndex + 1}`;
    case 'title':
      return `title ${r.title}`;
  }
}

function stats(win: boolean): MatchResultInput['stats'] {
  return {
    trained: 32,
    kills: 30,
    turretKills: 8,
    evolves: 3,
    reachedFinalAgeAtMs: 200_000,
    powerMaxHits: 5,
    baseDamage: 9000,
    heavyKillsByAA: 2,
    usedTreasury: !win,
    usedLastStand: false,
    ownBaseHpBpAtEnd: win ? 6000 : 0,
    durationMs: 330_000,
    mvpCard: null,
  };
}

type Reveal = { kind: 'capsule'; r: CapsuleReveal } | { kind: 'crate'; r: WardrobeReveal };

export default function MetaPage() {
  const [seed, setSeed] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const [save, setSave] = useState<SaveDoc>(() => meta.newSave(content, clockAt(now), 1));
  const [log, setLog] = useState<string[]>([]);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [mode, setMode] = useState<MatchResultInput['mode']>('ladder');
  const [format, setFormat] = useState<FormatId>('short');
  const [sample, setSample] = useState<string | null>(null);
  const clock = useMemo(() => clockAt(now), [now]);
  const note = (s: string): void => setLog((l) => [s, ...l].slice(0, 40));
  const apply = (next: SaveDoc, msg: string): void => {
    setSave(next);
    note(msg);
  };
  const result = (label: string, r: { ok: true; value: SaveDoc } | { ok: false; reason: string }): void => {
    if (r.ok) apply(r.value, label);
    else note(`${label}: ${r.reason}`);
  };

  const opponent: OpponentSpec | null = useMemo(() => {
    try {
      return meta.pickOpponent(save, mode, content, clock, { format, conquestGeneral: 'pip', skirmish: { generalId: 'echo', tier: 3, format, standardLevels: false } });
    } catch {
      return null;
    }
  }, [save, mode, format, clock]);

  const play = (res: 'win' | 'loss' | 'draw'): void => {
    if (!opponent) return;
    const winner = res === 'win' ? 0 : res === 'loss' ? 1 : null;
    const r = meta.applyMatchResult(
      save,
      { mode, mySide: 0, opponent, stats: stats(res === 'win'), outcome: { winner, reason: res === 'draw' ? 'finalBell' : 'baseDestroyed', tick: 6600, baseHpBp: [6000, 0] } },
      content,
      clock,
    );
    apply(r.save, `${mode} ${res} vs ${t(opponent.displayName)}: ${r.rewards.map(stepText).join(', ') || 'nothing'}`);
  };

  const openCapsule = (p: PendingCapsule): void => {
    const o = meta.openCapsule(save, p.id);
    setReveal({ kind: 'capsule', r: o.reveal });
    apply(o.save, `opened ${p.kind} ${p.tier}`);
  };

  const runSample = (): void => {
    let s: SaveDoc = { ...meta.newSave(content, clock, seed + 1000), arenaIndex: C.arenas.list.length - 1, scriptStep: C.capsules.script.length };
    const tiers: Record<string, number> = {};
    const rar: Record<string, number> = {};
    const foils: Record<string, number> = {};
    for (let i = 0; i < 10000; i += 1) {
      s = meta.grantCapsule(s, 'win', content, clock);
      const o = meta.openCapsule(s, s.capsules.pending[s.capsules.pending.length - 1]!.id);
      s = o.save;
      const cap = o.reveal.capsule;
      tiers[cap.tier] = (tiers[cap.tier] ?? 0) + 1;
      for (const st of cap.contents.stacks) {
        rar[st.rarity] = (rar[st.rarity] ?? 0) + 1;
        foils[st.foil] = (foils[st.foil] ?? 0) + 1;
      }
    }
    const fmt = (o: Record<string, number>): string => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ');
    setSample(`10,000 Win Capsules — tiers: ${fmt(tiers)}\nstacks: ${fmt(rar)}\nfoils: ${fmt(foils)}`);
  };

  const arena = C.arenas.list[save.arenaIndex]!;
  const left = bagLeft(save.capsules.bag, C.capsules);
  const nextCharge = nextChargeInMs(save, C, now);
  const plan = save.warPlans[save.activePlan] ?? save.warPlans[0]!;
  const cards = [...C.order.units, ...C.order.turrets];

  return (
    <div style={page} data-testid="dev-meta">
      <h2 style={{ margin: '0 0 8px' }}>Meta rules sandbox</h2>
      <div style={box}>
        seed <input type="number" value={seed} style={{ width: '60px' }} onInput={(e) => setSeed(Number((e.target as HTMLInputElement).value) || 1)} />
        <button style={btn} onClick={() => { setReveal(null); apply(meta.newSave(content, clock, seed), `new save (seed ${seed})`); }}>New save</button>
        <span style={{ marginLeft: '12px' }}>clock {new Date(now).toLocaleString()}</span>
        {[1, 6, 24, 24 * 7].map((h) => (
          <button key={h} style={btn} onClick={() => setNow(now + h * HOUR)}>+{h < 24 ? `${h} h` : `${h / 24} d`}</button>
        ))}
        <button style={btn} onClick={() => apply(meta.tickTimers(save, clock), 'tick timers')}>Tick timers</button>
        <button style={btn} onClick={() => result('claim Daily Capsule', meta.claimDailyCapsule(save, content, clock))}>Claim Daily</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) minmax(360px, 1fr)', gap: '10px' }}>
        <div>
          <div style={box} data-testid="meta-status">
            <b>{save.profile.name}</b> · {t(arena.nameKey)} (arena {arena.index}) · trophies {save.trophies.current} (best {save.trophies.best})<br />
            Amber {save.currencies.amber} · Dust {save.currencies.dust} · Codex Lv {save.codexLevel} ({save.codexPoints} pts)<br />
            charges {save.capsules.charges}/12{nextCharge !== null ? ` (next in ${Math.ceil(nextCharge / 60000)} min)` : ''} · free {save.capsules.freeCapsulesLeft} · Clay meter {save.capsules.clayMeter}/3 · Daily bank {save.capsules.dailyBank}
            {save.capsules.dailyNextAt ? ` (next ${new Date(save.capsules.dailyNextAt).toLocaleString()})` : ''}<br />
            bag left: {Object.entries(left).map(([k, v]) => `${k} ${v}`).join(' · ')}<br />
            pity: Epic {save.pity.sinceEpic} · Legendary {save.pity.sinceLegendary} · new card {save.pity.sinceNewCard} · opened {save.pity.opened} · crates {save.pity.wardrobeSinceEpic}/{save.pity.wardrobeSinceLegendary}
            <br />
            MMR {save.mmr} → ladder tier {ladderTier(save.mmr, arena, C.arenas.ladder)} · loss streak {save.lossStreak} · matches {save.matchesPlayed} · script step {save.scriptStep}
          </div>

          <div style={box}>
            <b>Play</b>{' '}
            <select value={mode} onChange={(e) => setMode((e.target as HTMLSelectElement).value as MatchResultInput['mode'])}>
              {['tutorial', 'ladder', 'daily', 'conquest', 'skirmish'].map((m) => <option key={m}>{m}</option>)}
            </select>{' '}
            <select value={format} onChange={(e) => setFormat((e.target as HTMLSelectElement).value as FormatId)}>
              {['short', 'standard', 'full'].map((f) => <option key={f}>{f}</option>)}
            </select>
            {(['win', 'loss', 'draw'] as const).map((r) => <button key={r} style={btn} onClick={() => play(r)}>{r}</button>)}
            {opponent ? (
              <div data-testid="meta-opponent">
                vs <b>{t(opponent.displayName)}</b> [AI] ({opponent.generalId}) · tier {opponent.tier} · Lv {opponent.level} · {opponent.format}
                {opponent.warmUp ? ' · Warm-up match' : ''}
                {opponent.modifiers.length ? ` · ${opponent.modifiers.join(', ')}` : ''}
                {opponent.disclosures.length ? ` · ${opponent.disclosures.map(t).join(' ')}` : ''}
              </div>
            ) : null}
          </div>

          <div style={box}>
            <b>Capsules</b>{' '}
            {(['win', 'daily', 'meter', 'age', 'codex'] as const).map((k) => (
              <button key={k} style={btn} onClick={() => apply(meta.grantCapsule(save, k, content, clock), `grant ${k}`)}>+{k}</button>
            ))}
            <button style={btn} onClick={() => apply(meta.grantWardrobe(save, 'road', content, clock), 'grant crate')}>+crate</button>
            {save.capsules.pending.map((p) => (
              <div key={p.id}>
                <button style={btn} onClick={() => openCapsule(p)}>Open</button> {p.kind} {p.startTier}→{p.tier}
                {p.scriptIndex !== null ? ` (script ${p.scriptIndex})` : ''}
                {p.age ? ` ${p.age}` : ''}
              </div>
            ))}
            {save.capsules.wardrobe.map((c) => (
              <div key={c.id}>
                <button
                  style={btn}
                  onClick={() => {
                    const o = meta.openWardrobe(save, c.id);
                    setReveal({ kind: 'crate', r: o.reveal });
                    apply(o.save, `opened crate`);
                  }}
                >
                  Open
                </button>{' '}
                Wardrobe Crate ({c.source})
              </div>
            ))}
          </div>

          {reveal ? (
            <div style={box} data-testid="meta-reveal">
              {reveal.kind === 'capsule' ? (
                <>
                  <b>{reveal.r.capsule.tier}</b> ({reveal.r.climbs} climbs: {reveal.r.strikeClimbs.map((x) => (x ? '▲' : '·')).join('')}) · +{reveal.r.capsule.contents.amber} Amber
                  {reveal.r.capsule.contents.dust ? ` · +${reveal.r.capsule.contents.dust} Dust` : ''}
                  {reveal.r.capsule.contents.skin ? ` · skin ${name(reveal.r.capsule.contents.skin)}` : ''}
                  {reveal.r.capsule.contents.stacks.map((st) => (
                    <div key={st.card} style={{ color: RARITY_COLOR[st.rarity] }}>
                      {name(st.card)} ×{st.copies} {st.isNew ? 'NEW ' : ''}
                      {st.foil !== 'none' ? `${st.foil} foil ` : ''}
                      {st.dust ? `→ ${st.dust} Dust` : ''}
                    </div>
                  ))}
                  pity before E{reveal.r.pityBefore.sinceEpic}/L{reveal.r.pityBefore.sinceLegendary}/N{reveal.r.pityBefore.sinceNewCard} → after E{reveal.r.pityAfter.sinceEpic}/L
                  {reveal.r.pityAfter.sinceLegendary}/N{reveal.r.pityAfter.sinceNewCard}
                  {reveal.r.firstLegendaryReveal.length ? ` · first Legendary: ${reveal.r.firstLegendaryReveal.map(name).join(', ')}` : ''}
                </>
              ) : (
                <>
                  <b>{name(reveal.r.crate.skin)}</b> ({reveal.r.crate.rarity}){reveal.r.crate.duplicateDust ? ` duplicate → ${reveal.r.crate.duplicateDust} Dust` : ''}
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    reel: {reveal.r.reelTiles.map((s, i) => (i === reveal.r.winnerIndex ? `[${s}]` : s)).slice(40, 50).join(' ')} · stop {reveal.r.stopOffsetBp} bp
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div style={box}>
            <b>Quests</b>{' '}
            {save.quests.daily.map((q, i) => (
              <div key={`${q.id}-${i}`}>
                {q.id} {q.progress}{q.claimed ? ' (claimed)' : ''}
                <button style={btn} onClick={() => result(`claim ${q.id}`, meta.claimQuest(save, i, content, clock))}>claim</button>
                <button style={btn} onClick={() => result(`reroll ${q.id}`, meta.rerollQuest(save, i, content))}>reroll</button>
              </div>
            ))}
            <div>
              weekly {save.quests.weekly.id} {save.quests.weekly.progress}
              <button style={btn} onClick={() => result('claim weekly', meta.claimQuest(save, 'weekly', content, clock))}>claim</button>
            </div>
          </div>

          <div style={box}>
            <b>Trophy Road</b>{' '}
            {claimableRoadNodes(save, C).map((n) => (
              <button key={n} style={btn} onClick={() => result(`road ${n}`, meta.claimRoadNode(save, n, content, clock))}>{n}</button>
            ))}
            <button style={btn} onClick={() => apply({ ...save, trophies: { ...save.trophies, current: save.trophies.current + 200, best: Math.max(save.trophies.best, save.trophies.current + 200) } }, '+200 trophies (dev)')}>
              +200 trophies (dev)
            </button>
          </div>

          <div style={box}>
            <b>War Plan</b>{' '}
            <button style={btn} onClick={() => { const r = meta.setWarPlan(save, save.activePlan, meta.autoFill(save, content)); result('auto-fill', r); }}>Auto-fill</button>
            {(['short', 'standard', 'full'] as const).map((f) => (
              <div key={f}>
                {f}: {meta.validatePlan(plan, save, content, f).map((i) => `${i.age} ${i.severity} ${i.code}`).join(' · ') || 'no issues'}
              </div>
            ))}
          </div>

          <div style={box}>
            <b>Drop sample</b> <button style={btn} onClick={runSample}>Open 10,000</button>
            {sample ? <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{sample}</pre> : null}
          </div>
        </div>

        <div>
          <div style={box}>
            <b>Log</b>
            {log.map((l, i) => <div key={i} style={{ opacity: i === 0 ? 1 : 0.7 }}>{l}</div>)}
          </div>
          <div style={box}>
            <b>Collection</b>
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {cards.map((id) => {
                  const e = save.collection[id];
                  const r = (C.units[id] ?? C.turrets[id])!.rarity;
                  const cost = e ? upgradeCost(C, id, e.level) : null;
                  const blocked = upgradeBlocker(save, id, C);
                  return (
                    <tr key={id} style={{ opacity: e ? 1 : 0.4 }}>
                      <td style={{ ...td, color: RARITY_COLOR[r] }}>{name(id)}</td>
                      <td style={td}>{e ? `L${e.level}` : '-'}</td>
                      <td style={td}>{e ? `${e.copies}${cost ? `/${cost.copies}` : ''}` : ''}</td>
                      <td style={td}>{e && e.foil !== 'none' ? e.foil : ''}</td>
                      <td style={td}>
                        {e ? (
                          <button style={btn} disabled={blocked !== null} title={blocked ?? ''} onClick={() => result(`upgrade ${id}`, meta.upgrade(save, id, content))}>
                            up{cost ? ` ${cost.amber}A` : ''}
                          </button>
                        ) : null}
                        <button style={btn} onClick={() => result(`craft ${id}`, meta.craft(save, id, content))}>craft</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
