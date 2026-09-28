/**
 * Capsule test bench (WP10, DESIGN A9 screen 16 "capsule test bench", C2/WP10 DoD).
 *
 * Plays every bench case: each tier and start tier, fixed tiers, first-time and repeat Legendaries,
 * a NEW Epic, each foil, Dust, a bonus skin, the onboarding script, a 10-capsule "Open all" and the
 * Wardrobe reel with the flag on and off. Shows the plan checks (time limits, back-loaded climb),
 * the live step and a sound log. URL: `?dev=1#capsuleBench/<caseId>`; add `&art=fake` to the query
 * for the fake art provider. Dev pages are exempt from the i18n rule.
 */
import { Application } from 'pixi.js';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ArtProvider } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { content } from '@/content';
import {
  CapsuleScreen,
  WardrobeScreen,
  checkPlan,
  createCatalog,
  longestUnskippableMs,
  nominalDurationMs,
  planOpenAll,
  planWardrobeShow,
  type Cue,
  type RunnerState,
  type ShowPlan,
  type ShowStep,
} from '@/capsule';
import { asContent } from '@/content';
import { BENCH_CASES, type BenchCase } from './cases';

export const title = 'Capsule bench';

const catalog = createCatalog(content);
const pityRules = asContent(content).capsules.pity;

function caseFromHash(): string {
  const part = decodeURIComponent(window.location.hash.replace(/^#/, '')).split('/')[1];
  return part && BENCH_CASES.some((c) => c.id === part) ? part : (BENCH_CASES[0]?.id ?? '');
}

function planFor(c: BenchCase): ShowPlan {
  if (c.crate) return planWardrobeShow(c.crate, { catalog });
  return planOpenAll(c.reveals ?? [], { catalog, quickReveal: c.quickReveal === true, ...(c.progress ? { progress: c.progress } : {}) });
}

async function makeArt(kind: 'real' | 'fake'): Promise<ArtProvider> {
  if (kind === 'fake') return new FakeArtProvider();
  try {
    const v = await import('@/visuals');
    const art = v.createArtProvider({ warn: () => undefined });
    await art.preload(['stone', 'medieval', 'gunpowder', 'modern', 'future']);
    return art;
  } catch (e) {
    console.warn('[capsuleBench] real visuals failed, using the fake provider', e);
    return new FakeArtProvider();
  }
}

const S = {
  root: { position: 'absolute', inset: 0, display: 'flex', background: '#0d0b16', color: '#f4ecd8', fontFamily: 'system-ui, sans-serif' },
  side: { width: '290px', flex: 'none', overflowY: 'auto', padding: '10px 12px', boxSizing: 'border-box', borderRight: '2px solid #2c2442', fontSize: '12px' },
  stage: { position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden' },
  group: { margin: '10px 0 4px', color: '#f2c14e', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' },
  btn: { display: 'block', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', background: 'transparent', border: 'none', padding: '3px 6px', borderRadius: '6px', cursor: 'pointer' },
  sel: { background: '#3a2f58' },
  row: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', margin: '4px 0' },
  small: { font: 'inherit', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid #7a5f18', background: '#241d36', color: 'inherit', cursor: 'pointer' },
  on: { background: '#7a5f18' },
  log: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '10px', lineHeight: 1.35, maxHeight: '220px', overflowY: 'auto', background: '#14121f', padding: '6px', borderRadius: '6px' },
  ok: { color: '#4ade80' },
  bad: { color: '#ff6a6a' },
} as const;

export default function CapsuleBench() {
  const [caseId, setCaseId] = useState(caseFromHash());
  const [artKind, setArtKind] = useState<'real' | 'fake'>(new URLSearchParams(window.location.search).get('art') === 'fake' ? 'fake' : 'real');
  const [art, setArt] = useState<ArtProvider | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [state, setState] = useState<RunnerState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const host = useRef<HTMLDivElement>(null);
  const audio = useMemo(() => new FakeAudio(), []);
  const t0 = useRef(performance.now());

  const bench = BENCH_CASES.find((c) => c.id === caseId) ?? BENCH_CASES[0];
  const plan = useMemo(() => (bench ? planFor(bench) : null), [bench]);
  const issues = useMemo(() => (plan ? checkPlan(plan) : []), [plan]);

  useEffect(() => {
    const onHash = () => setCaseId(caseFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let live = true;
    setArt(null);
    void makeArt(artKind).then((a) => live && setArt(a));
    return () => {
      live = false;
    };
  }, [artKind]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let destroyed = false;
    const a = new Application();
    void a
      .init({ resizeTo: el, background: 0x0d0b16, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' })
      .then(() => {
        if (destroyed) {
          a.destroy(true);
          return;
        }
        a.canvas.setAttribute('data-testid', 'capsule-bench-canvas');
        a.canvas.style.position = 'absolute';
        a.canvas.style.inset = '0';
        el.prepend(a.canvas);
        // Frame-exact stepping for screenshots and slow machines: `__capsuleBench.advance(ms)`
        // stops the ticker and advances the show in 60 fps frames; `resume()` goes live again.
        let virtual = -1;
        (window as unknown as { __capsuleBench?: object }).__capsuleBench = {
          advance(ms: number) {
            if (virtual < 0) {
              a.ticker.stop();
              virtual = a.ticker.lastTime;
            }
            const end = virtual + ms;
            while (virtual < end) {
              virtual = Math.min(end, virtual + 1000 / 60);
              // Only the last frame is drawn; the others just advance the show.
              a.stage.visible = virtual >= end;
              a.ticker.update(virtual);
            }
            a.stage.visible = true;
          },
          resume() {
            virtual = -1;
            a.ticker.start();
          },
          /** The canvas as a PNG data URL (no DOM overlay); cheaper than a page screenshot. */
          snap(): string {
            a.renderer.render(a.stage);
            return a.canvas.toDataURL('image/png');
          },
        };
        setApp(a);
      });
    return () => {
      destroyed = true;
      setApp(null);
      try {
        a.destroy(true, { children: true });
      } catch {
        // Not initialised yet.
      }
    };
  }, []);

  useEffect(() => {
    if (app) app.ticker.speed = speed;
  }, [app, speed]);

  const choose = (id: string) => {
    window.location.hash = `capsuleBench/${id}`;
    setCaseId(id);
    setRunKey((k) => k + 1);
    setLog([]);
    t0.current = performance.now();
  };
  const replay = () => {
    setRunKey((k) => k + 1);
    setLog([]);
    t0.current = performance.now();
  };
  const note = (s: string) => setLog((l) => [...l.slice(-199), `${((performance.now() - t0.current) / 1000).toFixed(2)}s ${s}`]);
  const onCue = (c: Cue, s: ShowStep) => note(`♪ ${c.sound}${c.pitchBp ? ` @${(c.pitchBp / 10000).toFixed(2)}` : ''} (${s.id})`);

  const groups = [...new Set(BENCH_CASES.map((c) => c.group))];
  const strikes = plan?.steps.flatMap((s) => (s.kind === 'strike' ? [s.climb ? 'C' : '·'] : [])) ?? [];
  const common = {
    audio,
    catalog,
    pityRules,
    settings: { reduceMotion, vibrate: false, teamPreset: 'default' as const, quickReveal: bench?.quickReveal === true },
    playMusic: false,
    onCue,
    onState: (s: RunnerState) => {
      setState(s);
      note(`→ ${s.kind} [${s.phase}]${s.holding ? ' ▶▶' : ''}`);
    },
    onDone: () => note('Done'),
    onEquip: (card: string) => note(`Equip now: ${card}`),
    onEquipSkin: (skin: string) => note(`Equip skin: ${skin}`),
    onUpgrade: (card: string) => note(`Upgrade: ${card}`),
    onOpenNext: () => note('Open next'),
    onShowOdds: () => note('Odds'),
    pendingCount: 2,
  };

  return (
    <div style={S.root} data-testid="capsule-bench">
      <div style={S.side}>
        <div style={{ fontWeight: 900, fontSize: '15px' }}>Capsule bench</div>
        <div style={S.row}>
          <button style={{ ...S.small, ...(artKind === 'real' ? S.on : {}) }} onClick={() => setArtKind('real')}>
            Real art
          </button>
          <button style={{ ...S.small, ...(artKind === 'fake' ? S.on : {}) }} onClick={() => setArtKind('fake')}>
            Fake art
          </button>
          <button style={{ ...S.small, ...(reduceMotion ? S.on : {}) }} onClick={() => (setReduceMotion((v) => !v), replay())}>
            Reduce motion
          </button>
        </div>
        <div style={S.row}>
          Speed
          {[0.25, 0.5, 1, 2].map((v) => (
            <button key={v} style={{ ...S.small, ...(speed === v ? S.on : {}) }} onClick={() => setSpeed(v)}>
              {v}×
            </button>
          ))}
          <button style={S.small} onClick={replay} data-testid="bench-replay">
            ⟲ Replay
          </button>
        </div>
        {groups.map((g) => (
          <div key={g}>
            <div style={S.group}>{g}</div>
            {BENCH_CASES.filter((c) => c.group === g).map((c) => (
              <button key={c.id} style={{ ...S.btn, ...(c.id === caseId ? S.sel : {}) }} onClick={() => choose(c.id)} data-testid={`bench-case-${c.id}`}>
                {c.title}
              </button>
            ))}
          </div>
        ))}
        <div style={S.group}>Checks</div>
        {plan ? (
          <div data-testid="bench-checks">
            <div style={issues.length === 0 ? S.ok : S.bad}>{issues.length === 0 ? '✓ every step within its A10 limit' : issues.map((i) => `✗ ${i}`).join('\n')}</div>
            {strikes.length > 0 ? <div style={S.ok}>✓ strikes {strikes.join(' ')} (climbs last)</div> : null}
            <div>nominal {(nominalDurationMs(plan) / 1000).toFixed(1)} s · longest unskippable {(longestUnskippableMs(plan) / 1000).toFixed(1)} s</div>
            {plan.issues.length > 0 ? <div style={S.bad}>data: {plan.issues.join('; ')}</div> : null}
            <div>
              step: {state ? `${state.kind} (${state.phase})` : '-'} {state?.canSkip ? '· skip' : ''} {state?.canFastForward ? '· ff' : ''}
            </div>
          </div>
        ) : null}
        <div style={S.group}>Log</div>
        <div style={S.log} data-testid="bench-log">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <p style={{ opacity: 0.7 }}>Tap the stage to strike or hurry, hold to fast-forward, Esc to skip.</p>
        <a style={{ color: '#9fc3ff' }} href="?dev=1">
          All dev pages
        </a>
      </div>
      <div style={S.stage} ref={host} data-testid="capsule-bench-stage">
        {app && art && bench ? (
          bench.crate ? (
            <WardrobeScreen key={`${bench.id}-${runKey}-${artKind}`} {...common} pixi={app} art={art} reveal={bench.crate} {...(bench.pity ? { pity: bench.pity } : {})} />
          ) : (
            <CapsuleScreen key={`${bench.id}-${runKey}-${artKind}`} {...common} pixi={app} art={art} reveals={bench.reveals ?? []} {...(bench.progress ? { progress: bench.progress } : {})} />
          )
        ) : (
          <div style={{ padding: '20px' }}>Loading art…</div>
        )}
      </div>
    </div>
  );
}
