/**
 * Pre-rendering of the ZzFX sound manifest into sample buffers (DESIGN B7, B16 "Audio pre-render
 * < 300 ms at boot").
 *
 * Rendering needs no AudioContext, so the boot groups can render before the first user gesture; the
 * service copies the samples into AudioBuffers once the context exists. The rest render lazily, in idle
 * time or on first use.
 */
import type { SoundId } from '@/contracts';
import { SOUND_GROUPS, sounds as defaultSounds, type SoundDef, type SoundGroup } from './sounds';
import type { ZzfxNote } from './soundKit';
import { buildSamples, ZZFX_VOLUME, type ZzfxParams } from './vendor/zzfx';

export interface RenderedSound {
  id: SoundId;
  sampleRate: number;
  /** One sample buffer per variant (mono). */
  variants: Float32Array[];
}

export interface RenderStats {
  /** Wall time spent rendering, in ms. */
  ms: number;
  sounds: number;
  variants: number;
  samples: number;
}

/**
 * Render rate for the sound effects. 32 kHz (16 kHz bandwidth, the SNES rate) keeps the boot render
 * well inside the 300 ms budget (B16) and a quarter less memory than 44.1 kHz; the retro ZzFX sounds
 * have almost nothing above 16 kHz, and the browser resamples to the device rate on playback.
 */
export const SFX_SAMPLE_RATE = 32000;

export interface BankOptions {
  sampleRate?: number;
  /** Clock for the stats (ms). */
  now?: () => number;
}

/**
 * Runs every wave shape and feature of the ZzFX loop on a few samples, so the JIT compiles one version
 * of it that has seen all branches before the real renders start (it otherwise deoptimises on each new
 * shape, which roughly doubles a cold boot render). Takes a few ms.
 */
export function warmUpZzfx(sampleRate: number = SFX_SAMPLE_RATE): void {
  for (let rep = 0; rep < 3; rep++) {
    for (let shape = 0; shape <= 5; shape++) {
      renderParams([1, 0, 440, 0.001, 0.002, 0.002, shape, 1.5, 1, 0.1, 50, 0.001, 0.001, 0.5, 5, 0.02, 0.001, 0.8, 0.001, 0.5, -1000], sampleRate);
      renderParams([1, 0, 440, 0, 0.002, 0.002, shape, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1000], sampleRate);
      renderParams([1, 0, 440, 0, 0.002, 0.002, shape], sampleRate);
    }
  }
}

/** Renders one single-call variant. Randomness is 0 in the manifest, so this is reproducible. */
export function renderParams(params: ZzfxParams, sampleRate: number = SFX_SAMPLE_RATE): Float32Array {
  return buildSamples(params, { sampleRate, masterVolume: ZZFX_VOLUME, random: () => 0.5 });
}

/** Renders one layered variant: each note starts `atMs` in and the voices are summed. */
export function renderMix(notes: readonly ZzfxNote[], sampleRate: number = SFX_SAMPLE_RATE): Float32Array {
  const parts = notes.map((n) => ({ offset: Math.round((n.atMs * sampleRate) / 1000), samples: renderParams(n.params, sampleRate) }));
  const length = parts.reduce((m, p) => Math.max(m, p.offset + p.samples.length), 0);
  const out = new Float32Array(length);
  for (const p of parts) {
    const s = p.samples;
    for (let i = 0; i < s.length; i++) out[p.offset + i]! += s[i]!;
  }
  return out;
}

/** Renders every variant of a ZzFX definition; `null` for file sounds. */
export function renderDef(def: SoundDef, sampleRate: number = SFX_SAMPLE_RATE): Float32Array[] | null {
  switch (def.kind) {
    case 'zzfx':
      return def.variants.map((p) => renderParams(p, sampleRate));
    case 'zzfxMix':
      return def.variants.map((n) => renderMix(n, sampleRate));
    case 'file':
      return null;
  }
}

const defaultNow = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class SoundBank {
  readonly sampleRate: number;
  private readonly rendered = new Map<SoundId, RenderedSound>();
  private readonly now: () => number;
  private warmed = false;

  constructor(
    readonly manifest: Readonly<Record<SoundId, SoundDef>> = defaultSounds,
    o: BankOptions = {},
  ) {
    this.sampleRate = o.sampleRate ?? SFX_SAMPLE_RATE;
    this.now = o.now ?? defaultNow;
  }

  has(id: SoundId): boolean {
    return Object.hasOwn(this.manifest, id);
  }

  isRendered(id: SoundId): boolean {
    return this.rendered.has(id);
  }

  /** The rendered variants, rendering now when needed. Undefined for unknown ids and file sounds. */
  get(id: SoundId): RenderedSound | undefined {
    const done = this.rendered.get(id);
    if (done) return done;
    const def = this.has(id) ? this.manifest[id] : undefined;
    if (!def) return undefined;
    const variants = renderDef(def, this.sampleRate);
    if (!variants) return undefined;
    const r: RenderedSound = { id, sampleRate: this.sampleRate, variants };
    this.rendered.set(id, r);
    return r;
  }

  /** Drops the samples of a sound (after they were copied into AudioBuffers); `get` re-renders. */
  forget(id: SoundId): void {
    this.rendered.delete(id);
  }

  /** Ids of the given groups that are ZzFX sounds, in manifest order. */
  idsIn(groups: readonly SoundGroup[]): SoundId[] {
    const want = new Set(groups);
    return Object.keys(this.manifest).filter((id) => {
      const d = this.manifest[id];
      return d !== undefined && d.kind !== 'file' && want.has(d.group);
    });
  }

  /** Renders the given ids now (already rendered ones are skipped). */
  renderIds(ids: readonly SoundId[]): RenderStats {
    const t0 = this.now();
    if (!this.warmed && ids.length > 1) {
      warmUpZzfx(this.sampleRate);
      this.warmed = true;
    }
    const stats: RenderStats = { ms: 0, sounds: 0, variants: 0, samples: 0 };
    for (const id of ids) {
      if (this.rendered.has(id)) continue;
      const r = this.get(id);
      if (!r) continue;
      stats.sounds++;
      stats.variants += r.variants.length;
      for (const v of r.variants) stats.samples += v.length;
    }
    stats.ms = this.now() - t0;
    return stats;
  }

  /** Renders whole groups now. */
  renderGroups(groups: readonly SoundGroup[]): RenderStats {
    return this.renderIds(this.idsIn(groups));
  }

  /** ZzFX sounds not rendered yet, boot groups first. */
  pending(order: readonly SoundGroup[] = SOUND_GROUPS): SoundId[] {
    return this.idsIn(order).filter((id) => !this.rendered.has(id)).sort((a, b) => groupRank(this.manifest, a, order) - groupRank(this.manifest, b, order));
  }
}

function groupRank(m: Readonly<Record<SoundId, SoundDef>>, id: SoundId, order: readonly SoundGroup[]): number {
  const g = m[id]?.group;
  return g === undefined ? order.length : order.indexOf(g);
}
