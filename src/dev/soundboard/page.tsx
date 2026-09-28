/**
 * Soundboard (`?dev=1#soundboard`, DESIGN A9 screen 16, C2/WP6 DoD "Soundboard plays every ID and cue").
 *
 * - Every A13 sound id, by group: click plays it through the real service (random variant, pitch and
 *   volume spread, voice limits); the numbered chips play one exact variant from the pre-rendered
 *   file sheet; "fx" plays the ZzFX fallback of that id; "copy" copies its ZzFX parameters.
 * - Every A14.3 music cue (the composed files, with the synthesized score while one loads), the three
 *   layers, the evolve key changes, ducking and the bus volumes; the file state of every sheet.
 * - Checks: every file fetched, decoded and measured (sheets, each sound's variants, music loops) and
 *   the 40-hit limiter test with the file hits; the ZzFX fallback render and its limiter test; the
 *   boot pre-render time; a live peak meter.
 *
 * Results are also on `window.__soundboard` for headless checks.
 */
import {
  BOOT_GROUPS,
  createWebAudioService,
  EVOLVE_TRANSPOSE_STEPS,
  MUSIC_CUES,
  MUSIC_FILES,
  sfxFiles,
  SOUND_GROUPS,
  sounds,
  type RenderStats,
  type SoundGroup,
  type WebAudioService,
} from '@/audio';
import type { Bus, MusicLayer, SoundId } from '@/contracts';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { checkCues, checkFiles, checkLimiter, checkSounds, dbfs, type CueCheck, type FileCheck, type FileSoundCheck, type LimiterCheck, type SoundCheck } from './checks';

export const title = 'Soundboard';

const page = {
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
  background: '#1b1a2e',
  color: '#f4ecd8',
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
  padding: '12px 16px 48px',
  boxSizing: 'border-box',
} as const;
const btn = { padding: '3px 8px', margin: '0 4px 4px 0', background: '#2c2b44', color: '#f4ecd8', border: '1px solid #4a4970', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' } as const;
const chip = { ...btn, padding: '1px 5px', margin: '0 2px 2px 0', fontSize: '11px' } as const;
const hot = { ...btn, background: '#f2c14e', color: '#1b1a2e', borderColor: '#f2c14e' } as const;
const section = { margin: '14px 0', padding: '10px 12px', border: '1px solid #33324f', background: '#201f36' } as const;
const good = { color: '#7ee787' } as const;
const bad = { color: '#ff7b72' } as const;

const GROUP_TITLES: Record<SoundGroup, string> = {
  ui: 'UI (boot)',
  battle: 'Battle, shared (boot)',
  stone: 'Stone (boot)',
  medieval: 'Medieval (lazy)',
  match: 'Match moments (lazy)',
  gunpowder: 'Gunpowder (lazy)',
  modern: 'Modern (lazy)',
  future: 'Future (lazy)',
  bronze: 'Bronze (boot)',
  industrial: 'Industrial (lazy)',
  cosmic: 'Cosmic (lazy)',
  capsule: 'Capsules (lazy)',
};

const BUSES: Bus[] = ['master', 'music', 'sfx', 'ui'];
const LAYERS: MusicLayer[] = ['intensity', 'overdrive', 'siege'];

interface Results {
  boot: RenderStats | null;
  sounds: SoundCheck[] | null;
  cues: CueCheck[] | null;
  limiter: LimiterCheck | null;
  files: FileCheck[] | null;
  fileSounds: FileSoundCheck[] | null;
  fileLimiter: LimiterCheck | null;
  played: SoundId[];
  /** Ids that played from the file sheet during "play all". */
  playedFromFile: SoundId[];
  cuesPlayed: string[];
  /** Cues whose composed file (not the fallback) was playing during "play all". */
  cuesFromFile: string[];
}

declare global {
  interface Window {
    __soundboard?: { service: WebAudioService; results: Results; runChecks: () => Promise<void>; playAll: () => Promise<void>; loadAllSheets: () => Promise<void> };
  }
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(0)} KB`;
const SFX_TOTAL = Object.values(sfxFiles.sheets).reduce((a, s) => a + s.bytes, 0);
const MUSIC_TOTAL = Object.values(MUSIC_FILES).reduce((a, f) => a + f.bytes, 0);

function copyVariant(id: SoundId, k: number): void {
  const d = sounds[id];
  if (!d || d.kind === 'file') return;
  const text = d.kind === 'zzfx' ? `zzfx(...${JSON.stringify(d.variants[k])})` : JSON.stringify(d.variants[k]);
  void navigator.clipboard?.writeText(text).catch(() => undefined);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export default function Soundboard() {
  const built = useMemo(() => createWebAudioService({ meter: true }), []);
  const svc = built.service;
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [evolves, setEvolves] = useState(0);
  const [layers, setLayers] = useState<Record<MusicLayer, number>>({ intensity: 0, overdrive: 0, siege: 0 });
  const [volumes, setVolumes] = useState<Record<Bus, number>>({ master: 1, music: 1, sfx: 1, ui: 1 });
  const peakHold = useRef({ peak: 0, clips: 0 });
  const results = useRef<Results>({
    boot: built.boot,
    sounds: null,
    cues: null,
    limiter: null,
    files: null,
    fileSounds: null,
    fileLimiter: null,
    played: [],
    playedFromFile: [],
    cuesPlayed: [],
    cuesFromFile: [],
  });

  useEffect(() => {
    const t = setInterval(() => {
      const p = svc.mixer?.peak() ?? 0;
      const h = peakHold.current;
      h.peak = Math.max(p, h.peak * 0.9);
      if (p >= 1) h.clips++;
      setTick((n) => n + 1);
    }, 100);
    return () => {
      clearInterval(t);
      svc.dispose();
    };
  }, [svc]);

  const unlock = async (): Promise<void> => {
    await svc.unlock();
    setRunning(svc.state === 'running');
  };

  const loadAllSheets = async (): Promise<void> => {
    await unlock();
    const files = svc.files;
    if (!files) return;
    await Promise.all(files.sheets().map((s) => files.loadSheet(s)));
  };

  const runChecks = async (): Promise<void> => {
    setBusy('Decoding and measuring every file, then rendering the ZzFX fallback offline…');
    try {
      const f = await checkFiles();
      results.current.files = f.files;
      results.current.fileSounds = f.sounds;
      results.current.fileLimiter = f.limiter;
      results.current.sounds = await checkSounds();
      results.current.cues = await checkCues();
      results.current.limiter = await checkLimiter();
    } finally {
      setBusy(null);
    }
  };

  const playAll = async (): Promise<void> => {
    await unlock();
    setBusy('Loading every sheet, then playing every sound id and every cue…');
    try {
      await loadAllSheets();
      for (const id of Object.keys(sounds)) {
        const before = svc.stats.started;
        svc.play(id, { priority: 100 });
        if (svc.stats.started > before) {
          results.current.played.push(id);
          if (svc.files?.clips(id)) results.current.playedFromFile.push(id);
        }
        await sleep(90);
      }
      for (const cue of MUSIC_CUES) {
        svc.music.setCue(cue, { fadeMs: 100 });
        const t0 = performance.now();
        // Give the file a moment to load and start (it falls back to the score meanwhile).
        while (performance.now() - t0 < 4000 && !svc.engine?.playing.some((p) => p.cue === cue && p.source === 'file')) await sleep(100);
        await sleep(600);
        const p = svc.engine?.playing.find((x) => x.cue === cue);
        if (p) results.current.cuesPlayed.push(cue);
        if (p?.source === 'file') results.current.cuesFromFile.push(cue);
      }
      svc.music.stop(300);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    window.__soundboard = { service: svc, results: results.current, runChecks, playAll, loadAllSheets };
  });

  const setLayer = (l: MusicLayer, v: number): void => {
    svc.music.setLayer(l, v);
    setLayers((s) => ({ ...s, [l]: v }));
  };
  const setVolume = (b: Bus, v: number): void => {
    svc.setBusVolume(b, v);
    setVolumes((s) => ({ ...s, [b]: v }));
  };
  const evolve = (): void => {
    const n = Math.min(EVOLVE_TRANSPOSE_STEPS.length, evolves + 1);
    const total = EVOLVE_TRANSPOSE_STEPS.slice(0, n).reduce((a, b) => a + b, 0);
    setEvolves(n);
    svc.music.transpose(total);
  };
  const resetKey = (): void => {
    setEvolves(0);
    svc.music.transpose(0);
  };
  const stress = (): void => {
    const ids = ['hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s'];
    for (let k = 0; k < 40; k++) svc.play(ids[k % ids.length]!);
  };

  const r = results.current;
  const byGroup = SOUND_GROUPS.map((g) => ({ g, ids: Object.keys(sounds).filter((id) => sounds[id]!.group === g) }));
  const now = svc.engine?.playing.find((p) => !p.fading);
  const soundFails = r.sounds?.filter((s) => !s.ok) ?? [];
  const cueFails = r.cues?.filter((c) => !c.ok) ?? [];
  const fileFails = r.files?.filter((f) => !f.ok) ?? [];
  const fileSoundFails = r.fileSounds?.filter((s) => !s.ok) ?? [];
  const sheetStates = svc.sheetStates();
  void tick;

  return (
    <div style={page} data-testid="soundboard">
      <h2 style={{ margin: '0 0 6px' }}>Soundboard</h2>
      <div>
        Audio:{' '}
        <b data-testid="audio-state" style={running ? good : bad}>
          {svc.state}
        </b>{' '}
        {!running && (
          <button style={hot} onClick={() => void unlock()} data-testid="unlock">
            Tap to enable audio
          </button>
        )}{' '}
        · voices {svc.stats.voices} · started {svc.stats.started} · dropped (gap {svc.stats.dropped.gap}, cap {svc.stats.dropped.idCap + svc.stats.dropped.totalCap}) · peak{' '}
        <span data-testid="peak">{dbfs(peakHold.current.peak)}</span> · clips <span data-testid="clips">{peakHold.current.clips}</span>
      </div>
      <div style={{ marginTop: '4px' }}>
        Boot pre-render ({BOOT_GROUPS.join(', ')}):{' '}
        <b data-testid="boot-ms" style={(r.boot?.ms ?? 0) < 300 ? good : bad}>
          {r.boot ? `${r.boot.ms.toFixed(0)} ms` : 'n/a'}
        </b>{' '}
        for {r.boot?.sounds ?? 0} sounds, {r.boot?.variants ?? 0} variants ({(((r.boot?.samples ?? 0) * 4) / 1e6).toFixed(1)} MB). Budget 300 ms (B16).
      </div>

      <div style={section}>
        <b>Buses</b>{' '}
        {BUSES.map((b) => (
          <label key={b} style={{ marginRight: '14px' }}>
            {b}{' '}
            <input type="range" min={0} max={1} step={0.05} value={volumes[b]} onInput={(e) => setVolume(b, Number((e.target as HTMLInputElement).value))} />
          </label>
        ))}
      </div>

      <div style={section}>
        <b>Music</b> · now:{' '}
        <span data-testid="music-now">
          {now
            ? now.source
              ? `${now.cue} (${now.source}${now.phase != null ? ` @ ${now.phase.toFixed(1)} s` : ''})`
              : `${now.cue} step ${now.step ?? '-'} @ ${now.bpm?.toFixed(0) ?? '-'} BPM (score)`
            : 'silent'}
        </span>{' '}
        · key +{svc.engine?.state.transpose ?? 0} (files carry their own key per age; the score fallback follows the key changes) · files {kb(MUSIC_TOTAL)}
        <div style={{ marginTop: '6px' }}>
          {MUSIC_CUES.map((cue) => (
            <button key={cue} style={svc.cue === cue ? hot : btn} data-testid={`cue-${cue}`} onClick={() => void unlock().then(() => svc.music.setCue(cue, { fadeMs: 600 }))}>
              {cue}
            </button>
          ))}
          <button style={btn} onClick={() => svc.music.stop(600)}>
            stop
          </button>
        </div>
        <div>
          {LAYERS.map((l) => (
            <label key={l} style={{ marginRight: '14px' }}>
              {l} {layers[l].toFixed(2)}{' '}
              <input type="range" min={0} max={1} step={0.05} value={layers[l]} onInput={(e) => setLayer(l, Number((e.target as HTMLInputElement).value))} />
            </label>
          ))}
        </div>
        <div>
          <button style={btn} onClick={evolve}>
            evolve key change (+{EVOLVE_TRANSPOSE_STEPS[Math.min(evolves, EVOLVE_TRANSPOSE_STEPS.length - 1)]}) [{evolves}/{EVOLVE_TRANSPOSE_STEPS.length}]
          </button>
          <button style={btn} onClick={resetKey}>
            reset key
          </button>
          <button style={btn} onClick={() => svc.music.duck(-6, 1500)}>
            duck -6 dB for 1.5 s
          </button>
        </div>
      </div>

      <div style={section}>
        <b>Files</b> · effects {kb(SFX_TOTAL)} in {Object.keys(sfxFiles.sheets).length} sheets ·{' '}
        <span data-testid="sheet-states">
          {Object.entries(sheetStates)
            .map(([k, v]) => `${k} ${v}`)
            .join(' · ')}
        </span>{' '}
        <button style={btn} onClick={() => void loadAllSheets()} data-testid="load-sheets">
          load every sheet
        </button>
        <div style={{ marginTop: '6px' }}>
          {Object.entries(MUSIC_FILES).map(([cue, f]) => (
            <span key={cue} style={{ marginRight: '12px', whiteSpace: 'nowrap' }}>
              {cue} {f.seconds.toFixed(1)} s {kb(f.bytes)}
            </span>
          ))}
        </div>
      </div>

      <div style={section}>
        <b>Checks</b>{' '}
        <button style={btn} disabled={busy !== null} onClick={() => void runChecks()} data-testid="run-checks">
          Render every id and cue offline + limiter test
        </button>
        <button style={btn} disabled={busy !== null} onClick={() => void playAll()} data-testid="play-all">
          Play every id and cue live
        </button>
        <button style={btn} onClick={() => void unlock().then(stress)} data-testid="stress">
          40 hits at once (live)
        </button>
        {busy && <div>{busy}</div>}
        {r.files && (
          <div data-testid="file-check" style={fileFails.length === 0 ? good : bad}>
            Files: {r.files.length - fileFails.length}/{r.files.length} decoded, audible and below full scale
            {fileFails.length > 0 && ` · failing: ${fileFails.map((f) => `${f.name}${f.error ? ` (${f.error})` : ''}`).join(', ')}`} · loudest{' '}
            {dbfs(Math.max(...r.files.map((f) => f.peak)))}
          </div>
        )}
        {r.fileSounds && (
          <div data-testid="file-sound-check" style={fileSoundFails.length === 0 ? good : bad}>
            File sounds: {r.fileSounds.length - fileSoundFails.length}/{r.fileSounds.length} ids, every variant audible and below full scale
            {fileSoundFails.length > 0 && ` · failing: ${fileSoundFails.map((s) => s.id).join(', ')}`}
          </div>
        )}
        {r.fileLimiter && (
          <div data-testid="file-limiter-check" style={r.fileLimiter.ok ? good : bad}>
            Limiter (file hits): {r.fileLimiter.hits} at once · raw {dbfs(r.fileLimiter.rawPeak)} · through the master chain {dbfs(r.fileLimiter.limitedPeak)} ·{' '}
            {r.fileLimiter.ok ? 'no clipping' : 'CLIPS'}
          </div>
        )}
        {r.sounds && (
          <div data-testid="sound-check" style={soundFails.length === 0 ? good : bad}>
            ZzFX fallback: {r.sounds.length - soundFails.length}/{r.sounds.length} audible and below full scale
            {soundFails.length > 0 && ` · failing: ${soundFails.map((s) => s.id).join(', ')}`} · loudest {dbfs(Math.max(...r.sounds.map((s) => s.peak)))}
          </div>
        )}
        {r.cues && (
          <div data-testid="cue-check" style={cueFails.length === 0 ? good : bad}>
            Score fallback cues: {r.cues.length - cueFails.length}/{r.cues.length} audible and below full scale ·{' '}
            {r.cues.map((c) => `${c.cue} ${dbfs(c.peak)}`).join(' · ')}
          </div>
        )}
        {r.limiter && (
          <div data-testid="limiter-check" style={r.limiter.ok ? good : bad}>
            Limiter (ZzFX hits): {r.limiter.hits} simultaneous hits · raw {dbfs(r.limiter.rawPeak)} ({r.limiter.rawPeak.toFixed(2)}) · through the master chain {dbfs(r.limiter.limitedPeak)} ({r.limiter.limitedPeak.toFixed(3)}) ·{' '}
            {r.limiter.ok ? 'no clipping' : 'CLIPS'}
          </div>
        )}
        {r.played.length > 0 && (
          <div data-testid="played">
            Live: {r.played.length}/{Object.keys(sounds).length} ids started ({r.playedFromFile.length} from files), {r.cuesPlayed.length}/{MUSIC_CUES.length} cues playing (
            {r.cuesFromFile.length} from files)
          </div>
        )}
      </div>

      {byGroup.map(({ g, ids }) => (
        <div key={g} style={section}>
          <b>{GROUP_TITLES[g]}</b> · {ids.length}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: '6px' }}>
            {ids.map((id) => (
              <span key={id} style={{ whiteSpace: 'nowrap' }}>
                <button style={btn} data-testid={`sound-${id}`} onClick={() => void unlock().then(() => svc.play(id))}>
                  {id}
                </button>
                {Array.from({ length: svc.variantCount(id) }, (_, k) => (
                  <button
                    key={k}
                    style={chip}
                    data-testid={`variant-${id}-${k}`}
                    title="play this file variant exactly"
                    onClick={() =>
                      void unlock()
                        .then(() => svc.files?.loadSheet(svc.files.sheetOf(id) ?? ''))
                        .then(() => svc.preview(id, k, { source: 'file' }))
                    }
                  >
                    {k + 1}
                  </button>
                ))}
                <button style={chip} title="play the ZzFX fallback" onClick={() => void unlock().then(() => svc.preview(id, 0, { source: 'zzfx' }))}>
                  fx
                </button>
                <button style={chip} title="copy the fallback's variant 1 as ZzFX parameters" onClick={() => copyVariant(id, 0)}>
                  copy
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
