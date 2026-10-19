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
 *
 * Per-power presets (A12 "Power lands: per-power preset"): every `powerImpact` plays
 * `power.fx.<powerId>` if present, else `power.fx.<effect kind>`; the first impact of a cast also plays
 * `power.fx.<powerId>.first`, else `power.fx.<effect kind>.first`. The mapper supplies the size options
 * from the power's data (radius, zone, width, distance, duration), so the config only picks effects.
 */
import type { FeelConfig, FeelRule } from '@/contracts';
import { CLASH_DEFAULTS, type ClashRules } from './clash';
import { COMBAT_DEFAULTS, type CombatTuning } from './combatFeel';
import type { ContactTuning } from './contact';
import raw from './feel.config.json';

/** Where a rule's flash goes: the victim unit, the whole screen, the struck base, or nowhere. */
export type FlashTarget = 'victim' | 'screen' | 'base' | 'none';

/** A rule's particle; `at` puts it somewhere else on the event's unit than the rule's anchor (queue item 38). */
export interface FeelParticle {
  effectId: string;
  count: number;
  priority: number;
  at?: 'feet' | 'hit' | 'head';
}

/** A feel rule with the render-only fields. */
export interface FeelRuleExt extends FeelRule {
  particles?: FeelParticle[];
  /** Extra sound layers played with `sound` on the same frame (a kill accent, a material). */
  sounds?: string[];
  /** The rule's sounds play this much softer or louder (dB; a knocked-back body's landing, queue item 38 A7). */
  soundVolumeDb?: number;
  /** A directional screen kick (px at shake 1) along the event's direction, at most one per `kickGapMs` (A3). */
  kickPx?: number;
  flashTarget?: FlashTarget;
  /** Peak alpha of a screen flash (0..1). */
  flashAlpha?: number;
  /** The rule's trauma applies at most once per this many ms (base hits: 500, A12). */
  traumaGapMs?: number;
  /** Pixel jitter on the frozen victim during local hitstop (heavy hits: 1-2 px, A12). */
  jitterPx?: number;
  /** View-only slow motion after the rule (base destroyed: from the break, easing back over `easeMs`, A12). */
  slowMo?: { scale: number; ms: number; easeMs?: number };
  /**
   * Slow motion of the whole match, sim clock included (queue item 38 A8: a Legendary's fall), where the host scales
   * its clock by the view's `simTimeScale` (offline matches and replays); never live, never with Reduce motion.
   */
  simSlowMo?: { scale: number; ms: number; easeMs?: number };
  /** Global freeze exempt from the rolling cap (base destroyed, A12). */
  globalExempt?: boolean;
  /**
   * Where the rule's particles go: at the event's anchor (default), or one on every live unit of the
   * event's side, following it (`sideUnits`: Royal Decree, Nanite Surge).
   */
  fxTarget?: 'anchor' | 'sideUnits';
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
  /**
   * Length of the "shield up" bubble pop. The lasting bubble is the art's, drawn from
   * `UnitPose.shieldBp` (B5), so the effect only marks the moment the shield lands.
   */
  shieldPopMs: number;
  /**
   * The destroyed base's collapse (A12): the beats used when the art does not report its own
   * (`breakMs`, `landMs`, game ms from the end), when the debris rattle and the stinger follow the
   * break, the camera's push zoom and punch, and each age's sound material (`base_break_<material>`).
   */
  baseCollapse: {
    breakMs: number;
    landMs: number;
    debrisDelayMs: number;
    stingerDelayMs: number;
    pushZoom: number;
    punchZoom: number;
    punchMs: number;
    materials: Record<string, string>;
  };
  /** Contact staging (queue item 38 A1, `contact.ts`): stand-off, lunge compensation and same-side spread. */
  contact?: Partial<ContactTuning>;
  /** Hit tiers, hit-stop, kicks, knockback, materials and deaths (queue item 38 A2-A4, `combatFeel.ts`). */
  combat?: Partial<CombatTuning>;
  /** The clash moment and the wide-screen lean-in (queue item 38 A6, `clash.ts`). */
  clash?: Partial<ClashRules>;
}

/** The combat tuning with its defaults filled in. */
export function combatTuning(c: RenderFeelConfig): CombatTuning {
  return { ...COMBAT_DEFAULTS, ...(c.tuning.combat ?? {}) };
}

/** The clash rules with their defaults filled in. */
export function clashRules(c: RenderFeelConfig): ClashRules {
  return { ...CLASH_DEFAULTS, ...(c.tuning.clash ?? {}) };
}

/** The full render feel config: the contract plus the render-only extensions. */
export interface RenderFeelConfig extends FeelConfig {
  events: Record<string, FeelRuleExt>;
  tuning: FeelTuning;
}

/** The shipped config, as loaded from `feel.config.json`. Treat as read-only; clone before editing. */
export const defaultFeelConfig: RenderFeelConfig = raw as unknown as RenderFeelConfig;

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
  const bc = c.tuning.baseCollapse;
  nonNeg(bc.breakMs, 'tuning.baseCollapse.breakMs');
  nonNeg(bc.debrisDelayMs, 'tuning.baseCollapse.debrisDelayMs');
  nonNeg(bc.stingerDelayMs, 'tuning.baseCollapse.stingerDelayMs');
  nonNeg(bc.punchMs, 'tuning.baseCollapse.punchMs');
  if (!(bc.landMs > bc.breakMs)) out.push('tuning.baseCollapse.landMs must come after breakMs');
  if (!(bc.pushZoom >= 1 && bc.pushZoom <= 2)) out.push('tuning.baseCollapse.pushZoom must be in 1..2');
  if (!(bc.punchZoom >= 0 && bc.punchZoom <= 0.2)) out.push('tuning.baseCollapse.punchZoom must be in 0..0.2');
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
    if (r.slowMo?.easeMs !== undefined && !(r.slowMo.easeMs >= 0 && r.slowMo.easeMs <= r.slowMo.ms)) out.push(`${key}.slowMo.easeMs must be in 0..ms`);
    if (r.simSlowMo && !(r.simSlowMo.scale >= 0.25 && r.simSlowMo.scale <= 1)) out.push(`${key}.simSlowMo.scale must be in [0.25, 1]`);
    if (r.simSlowMo && !(r.simSlowMo.ms > 0 && r.simSlowMo.ms <= 1500)) out.push(`${key}.simSlowMo.ms must be in (0, 1500]`);
    if (r.simSlowMo?.easeMs !== undefined && !(r.simSlowMo.easeMs >= 0 && r.simSlowMo.easeMs <= r.simSlowMo.ms)) out.push(`${key}.simSlowMo.easeMs must be in 0..ms`);
    nonNeg(r.kickPx, `${key}.kickPx`);
    if (r.fxTarget !== undefined && !['anchor', 'sideUnits'].includes(r.fxTarget)) out.push(`${key}.fxTarget is unknown`);
  }
  return out;
}
