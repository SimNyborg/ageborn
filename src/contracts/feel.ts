/**
 * Game feel configuration (DESIGN B15 `feel.ts`, A12, B6 Event mapper).
 * Loaded from `render/feel.config.json` (WP5); rules are keyed by `SimEvent` kind or a derived key.
 */
import type { EffectId, SoundId } from './ids';

export interface FeelRule {
  hitstopLocalMs?: { victim: number; attacker: number };
  /** Global freezes are capped by `globalFreezeCapMs` per `globalFreezeWindowMs` (DESIGN A12, B6). */
  hitstopGlobalMs?: number;
  trauma?: number;
  flashMs?: number;
  flashColor?: number;
  particles?: { effectId: EffectId; count: number; priority: number }[];
  sound?: SoundId;
  duckDb?: number;
  duckMs?: number;
}

export interface FeelConfig {
  shake: { decayPerSec: number; noiseHz: number; maxOffsetPx: number; maxRotDeg: number };
  globalFreezeCapMs: number;
  globalFreezeWindowMs: number;
  heavyHitBp: number;
  damageNumbers: 'off' | 'important' | 'all';
  /** Lite 300 / High 1,500 style caps (DESIGN B6 Graphics presets). */
  particleCaps: { mobile: number; desktop: number };
  events: Record<string, FeelRule>;
}
