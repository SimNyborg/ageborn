/**
 * The feel configuration (DESIGN A12, B6 Event mapper): every juice number lives in
 * `feel.config.json` and can be tuned live from the dev feel page (`?dev=1#feel`).
 *
 * The file satisfies the frozen `FeelConfig` contract and adds render-only fields: a few extra rule
 * fields (`flashTarget`, `flashAlpha`, `traumaGapMs`, `jitterPx`, `slowMo`, `globalExempt`) and a
 * `tuning` block for the numbers A12 states outside its table (ghost segment delay, number spread,
 * music intensity decay, camera follow, seam drift, ...).
 *
 * Rule keys are event keys chosen by the event mapper (`hit.light`, `death.heavy`, `power.impact`, ...).
 * Placeholders in `effectId` and `sound` are resolved per event by the mapper: `$spark` (hit spark by
 * damage type, or the effective spark / resisted puff), `$hitSound`, `$attackSound`, `$dieSound`,
 * `$spawnSound`, `$powerSound` and `$fanfare` (see `eventMapper.ts`).
 */
import type { FeelConfig, FeelRule } from '@/contracts';
import raw from './feel.config.json';

/** Where a rule's flash goes: the victim unit, the whole screen, the struck base, or nowhere. */
export type FlashTarget = 'victim' | 'screen' | 'base' | 'none';

/** A feel rule with the render-only fields. */
export interface FeelRuleExt extends FeelRule {
  flashTarget?: FlashTarget;
  /** Peak alpha of a screen flash (0..1). */
  flashAlpha?: number;
  /** The rule's trauma applies at most once per this many ms (base hits: 500, A12). */
  traumaGapMs?: number;
  /** Pixel jitter on the frozen victim during local hitstop (heavy hits: 1-2 px, A12). */
  jitterPx?: number;
  /** View-only slow motion after the rule (base destroyed: 0.3x for 1.2 s, A12). */
  slowMo?: { scale: number; ms: number };
  /** Global freeze exempt from the rolling cap (base destroyed, A12). */
  globalExempt?: boolean;
}

export interface FeelTuning {
  kickPx: number;
  kickDecayMs: number;
  ghostHoldMs: number;
  ghostDrainMs: number;
  numberSpreadPx: [number, number];
  numberLifeMs: number;
  numberRisePx: number;
  numberMergeMs: number;
  goldLifeMs: number;
  coinTravelMs: number;
  coinStaggerMs: number;
  xpTravelMs: number;
  coinSoundGapMs: number;
  coinComboMs: number;
  coinPitchStepBp: number;
  coinPitchMaxBp: number;
  soundGapMs: Record<string, number>;
  intensity: {
    decayPerSec: number;
    hit: number;
    heavy: number;
    death: number;
    power: number;
    baseHit: number;
    evolve: number;
    pushHz: number;
  };
  reduceMotion: { shake: number; hitstop: number; flash: number };
  seamMaxLuPerSec: number;
  cameraFollowK: number;
  maxZoom: number;
  rowEaseLuPerSec: number;
  deathLingerMs: number;
  turretSellMs: number;
  telegraphMs: number;
  cheerMs: number;
  mechExplodeOneIn: number;
}

/** The full render feel config: the contract plus the render-only extensions. */
export interface RenderFeelConfig extends FeelConfig {
  events: Record<string, FeelRuleExt>;
  tuning: FeelTuning;
}

/** The shipped config, as loaded from `feel.config.json`. Treat as read-only; clone before editing. */
export const defaultFeelConfig: RenderFeelConfig = raw as RenderFeelConfig;

/** A deep copy, for live tuning. */
export function cloneFeelConfig(c: RenderFeelConfig = defaultFeelConfig): RenderFeelConfig {
  return JSON.parse(JSON.stringify(c)) as RenderFeelConfig;
}

/** The rule for `key`, or an empty rule. */
export function feelRule(c: RenderFeelConfig, key: string): FeelRuleExt {
  return c.events[key] ?? EMPTY_RULE;
}

const EMPTY_RULE: FeelRuleExt = Object.freeze({});

/**
 * Checks a config for obvious mistakes (negative durations, alpha out of range, unknown flash targets).
 * Returns a list of problems; empty when the config is fine. Used by tests and the dev feel page.
 */
export function validateFeelConfig(c: RenderFeelConfig): string[] {
  const out: string[] = [];
  const nonNeg = (v: number | undefined, path: string): void => {
    if (v !== undefined && !(Number.isFinite(v) && v >= 0)) out.push(`${path} must be a number >= 0`);
  };
  nonNeg(c.globalFreezeCapMs, 'globalFreezeCapMs');
  nonNeg(c.globalFreezeWindowMs, 'globalFreezeWindowMs');
  nonNeg(c.shake.decayPerSec, 'shake.decayPerSec');
  nonNeg(c.shake.maxOffsetPx, 'shake.maxOffsetPx');
  nonNeg(c.shake.maxRotDeg, 'shake.maxRotDeg');
  if (!(c.shake.noiseHz > 0)) out.push('shake.noiseHz must be > 0');
  if (!['off', 'important', 'all'].includes(c.damageNumbers)) out.push('damageNumbers must be off, important or all');
  for (const [key, r] of Object.entries(c.events)) {
    nonNeg(r.hitstopGlobalMs, `${key}.hitstopGlobalMs`);
    nonNeg(r.hitstopLocalMs?.victim, `${key}.hitstopLocalMs.victim`);
    nonNeg(r.hitstopLocalMs?.attacker, `${key}.hitstopLocalMs.attacker`);
    nonNeg(r.flashMs, `${key}.flashMs`);
    nonNeg(r.trauma, `${key}.trauma`);
    nonNeg(r.traumaGapMs, `${key}.traumaGapMs`);
    if (r.flashAlpha !== undefined && !(r.flashAlpha >= 0 && r.flashAlpha <= 1)) out.push(`${key}.flashAlpha must be in 0..1`);
    if (r.flashTarget !== undefined && !['victim', 'screen', 'base', 'none'].includes(r.flashTarget)) {
      out.push(`${key}.flashTarget is unknown`);
    }
    for (const p of r.particles ?? []) {
      if (!p.effectId) out.push(`${key}.particles: effectId missing`);
      if (!(Number.isInteger(p.count) && p.count >= 0)) out.push(`${key}.particles[${p.effectId}].count must be an integer >= 0`);
    }
    if (r.slowMo && !(r.slowMo.scale > 0 && r.slowMo.scale <= 1)) out.push(`${key}.slowMo.scale must be in (0, 1]`);
  }
  return out;
}
