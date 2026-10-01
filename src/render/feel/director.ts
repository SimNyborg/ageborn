/**
 * The feel director (DESIGN A12, B6): owns the screen-level juice and the audio side of the event
 * mapper's actions. It applies the player's settings (shake slider, reduce motion, hitstop on/off),
 * the global freeze cap, throttles repeated sounds and trauma, climbs the coin pitch on multi-kills,
 * and drives the music intensity layer from a view-side estimate that decays 0.2/s (A13).
 */
import type { AudioService, MusicCueId, MusicLayer, SoundId } from '@/contracts';
import type { RenderFeelConfig } from '../feelConfig';
import type { Gap } from '../types';
import { ScreenFlash } from './flash';
import { GlobalFreeze, SlowMotion, scaleHitstop, type HitstopSettings } from './hitstop';
import { Shake } from './shake';

export interface DirectorSettings extends HitstopSettings {
  shake: number;
}

interface Delayed {
  atMs: number;
  id: SoundId;
  pan: number;
  pitchBp?: number;
  volumeDb?: number;
  priority: number;
  gap: Gap | undefined;
}

export class FeelDirector {
  readonly shake: Shake;
  readonly flash = new ScreenFlash();
  readonly freeze: GlobalFreeze;
  readonly slowMo = new SlowMotion();
  /** Real (wall-clock) view time in ms. */
  nowMs = 0;
  /** Music intensity estimate, 0..1. */
  intensity = 0;
  private settings: DirectorSettings = { hitstop: true, reduceMotion: false, shake: 1 };
  private readonly lastAt = new Map<string, number>();
  private readonly climbs = new Map<string, { at: number; n: number }>();
  private delayed: Delayed[] = [];
  private gameMs = 0;
  private sentIntensity = -1;
  private sinceIntensityPush = 0;

  constructor(
    private feel: RenderFeelConfig,
    private readonly audio: AudioService,
    seed = 1,
  ) {
    this.shake = new Shake(feel.shake, seed, feel.tuning.kickPx, feel.tuning.kickDecayMs);
    this.freeze = new GlobalFreeze(feel.globalFreezeCapMs, feel.globalFreezeWindowMs);
  }

  setFeel(feel: RenderFeelConfig): void {
    this.feel = feel;
    this.shake.config = feel.shake;
    this.shake.kickPx = feel.tuning.kickPx;
    this.shake.kickDecayMs = feel.tuning.kickDecayMs;
    this.freeze.capMs = feel.globalFreezeCapMs;
    this.freeze.windowMs = feel.globalFreezeWindowMs;
    this.applySettings(this.settings);
  }

  applySettings(s: DirectorSettings): void {
    this.settings = { ...s };
    const rm = this.feel.tuning.reduceMotion;
    this.shake.multiplier = Math.max(0, s.shake) * (s.reduceMotion ? rm.shake : 1);
    this.flash.softness = s.reduceMotion ? rm.flash : 1;
  }

  /** A local hitstop duration after settings (0 when hitstop is off). */
  hitstopMs(ms: number): number {
    return scaleHitstop(ms, this.settings, this.feel.tuning.reduceMotion.hitstop);
  }

  /** Requests a global freeze (subject to the cap unless exempt). Returns the ms granted. */
  requestFreeze(ms: number, exempt: boolean): number {
    return this.freeze.request(this.hitstopMs(ms), this.nowMs, exempt);
  }

  startSlowMo(scale: number, ms: number): void {
    if (this.settings.reduceMotion) return;
    this.slowMo.start(scale, ms);
  }

  /** True when the key's gap has not elapsed yet (and records the use otherwise). */
  private gated(gap: Gap | undefined): boolean {
    if (!gap) return false;
    const last = this.lastAt.get(gap.key);
    if (last !== undefined && this.nowMs - last < gap.gapMs) return true;
    this.lastAt.set(gap.key, this.nowMs);
    return false;
  }

  addTrauma(amount: number, dir?: { x: number; y: number }, gap?: Gap): void {
    if (this.gated(gap)) return;
    this.shake.add(amount, dir);
  }

  screenFlash(ms: number, color: number, alpha: number): void {
    this.flash.trigger(ms, color, alpha);
  }

  /** Plays (or schedules, in game time) a sound. `pan` in -1..1. */
  sound(id: SoundId, o: { delayMs?: number; gap?: Gap; climb?: string; pan?: number; priority?: number; pitchBp?: number; volumeDb?: number } = {}): void {
    if (o.delayMs && o.delayMs > 0) {
      // The throttle applies when the sound actually plays.
      this.delayed.push({
        atMs: this.gameMs + o.delayMs,
        id,
        pan: o.pan ?? 0,
        priority: o.priority ?? 0,
        gap: o.gap,
        ...(o.pitchBp !== undefined ? { pitchBp: o.pitchBp } : {}),
        ...(o.volumeDb !== undefined ? { volumeDb: o.volumeDb } : {}),
      });
      return;
    }
    if (this.gated(o.gap)) return;
    let pitchBp: number | undefined = o.pitchBp;
    if (o.climb) {
      const t = this.feel.tuning;
      const prev = this.climbs.get(o.climb);
      const n = prev && this.nowMs - prev.at <= t.coinComboMs ? prev.n + 1 : 0;
      this.climbs.set(o.climb, { at: this.nowMs, n });
      pitchBp = 10000 + Math.min(t.coinPitchMaxBp, n * t.coinPitchStepBp);
    }
    const opts: { pitchBp?: number; pan?: number; priority?: number; volumeDb?: number } = {};
    if (pitchBp !== undefined) opts.pitchBp = pitchBp;
    if (o.volumeDb !== undefined && o.volumeDb !== 0) opts.volumeDb = o.volumeDb;
    if (o.pan !== undefined && o.pan !== 0) opts.pan = Math.max(-1, Math.min(1, o.pan));
    if (o.priority !== undefined) opts.priority = o.priority;
    this.audio.play(id, Object.keys(opts).length > 0 ? opts : undefined);
  }

  duck(db: number, ms: number): void {
    this.audio.music.duck(db, ms);
  }

  musicCue(cue: MusicCueId, fadeMs: number): void {
    this.audio.music.setCue(cue, { fadeMs });
  }

  transpose(semitones: number): void {
    this.audio.music.transpose(semitones);
  }

  musicLayer(layer: MusicLayer, v: number): void {
    this.audio.music.setLayer(layer, v);
  }

  addIntensity(amount: number): void {
    this.intensity = Math.min(1, this.intensity + Math.max(0, amount));
  }

  get frozen(): boolean {
    return this.freeze.frozen;
  }

  /**
   * Advances real time (shake, flash, freeze, slow motion, intensity) and game time (delayed sounds).
   * Call once per frame; `gameDtMs` is 0 while frozen or paused.
   */
  update(realDtMs: number, gameDtMs: number): void {
    const dt = Math.max(0, realDtMs);
    this.nowMs += dt;
    this.gameMs += Math.max(0, gameDtMs);
    this.freeze.update(dt);
    this.slowMo.update(dt);
    this.shake.update(dt);
    this.flash.update(dt);
    if (this.delayed.length > 0) {
      const due = this.delayed.filter((d) => d.atMs <= this.gameMs);
      if (due.length > 0) {
        this.delayed = this.delayed.filter((d) => d.atMs > this.gameMs);
        for (const d of due)
          this.sound(d.id, {
            pan: d.pan,
            priority: d.priority,
            ...(d.gap ? { gap: d.gap } : {}),
            ...(d.pitchBp !== undefined ? { pitchBp: d.pitchBp } : {}),
            ...(d.volumeDb !== undefined ? { volumeDb: d.volumeDb } : {}),
          });
      }
    }
    const it = this.feel.tuning.intensity;
    this.intensity = Math.max(0, this.intensity - (it.decayPerSec * dt) / 1000);
    this.sinceIntensityPush += dt;
    if (this.sinceIntensityPush >= 1000 / Math.max(0.1, it.pushHz)) {
      this.sinceIntensityPush = 0;
      const v = Math.round(this.intensity * 100) / 100;
      if (Math.abs(v - this.sentIntensity) >= 0.02) {
        this.sentIntensity = v;
        this.audio.music.setLayer('intensity', v);
      }
    }
  }

  reset(): void {
    this.shake.reset();
    this.freeze.reset();
    this.slowMo.reset();
    this.delayed = [];
    this.intensity = 0;
  }

  destroy(): void {
    this.flash.destroy();
  }
}
