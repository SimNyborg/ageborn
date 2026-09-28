/**
 * Starts a battle from a `MatchSetup` (DESIGN B11 BattleSession): creates the sim, the opponent's
 * brain, the optional dev autopilot, the session, the tutorial director and the event-log hooks.
 * The view is created by the caller's factory (the battle screen owns the Pixi canvas), so this
 * module runs headless in tests and dev tools.
 */
import { signal, type ReadonlySignal, type Signal } from '@preact/signals';
import { BALANCED_BRAIN_ID, botProfile } from '@/ai';
import type { BotController, BotProfile, CompiledContent, SaveDoc, Side, Sim } from '@/contracts';
import { fnv1a32 } from '@/core';
import { createGroggBrain, createTutorialAutopilot, MATCH1_TURRET_GRANT_TICK, TutorialDirector, type TutorialPrompt } from '@/tutorial';
import { createFallbackBot } from './fallbackBot';
import type { MatchSetup } from './matchSetup';
import type { Services } from './services';
import { TrickleDetector } from './trickle';
import { BattleSessionImpl, type BattleSpeed, type FrameScheduler, type SessionBot, type SessionView, type VisibilitySource } from './session';

export interface BattleOptions {
  save: SaveDoc | null;
  /** Builds the view for the new sim (null or omitted = headless). */
  createView?: (sim: Sim) => SessionView | null;
  scheduler?: FrameScheduler | null;
  visibility?: VisibilitySource | null;
  /** Dev autopilot plays the player's side (`?dev=1&autopilot=1`, B13). */
  autopilot?: boolean;
  speed?: BattleSpeed;
  /** Adaptive hints (A8) on; default true for real players. */
  hints?: boolean;
}

export interface BattleHandle {
  readonly setup: MatchSetup;
  readonly session: BattleSessionImpl;
  readonly director: TutorialDirector;
  /** The tutorial prompt on screen. */
  readonly prompt: ReadonlySignal<TutorialPrompt | null>;
  /** "3-2-1 Fight!" before the start: 3, 2, 1, 0 = "Fight!", -1 = none (the controller runs it). */
  readonly countdown: Signal<number>;
  /** A16.6: the player's "trickle" pattern; after a loss where it fired, the Result shows the wave tip. */
  readonly trickle: TrickleDetector;
  dispose(): void;
}

/** A7.2: "The bot RNG is seeded from hash(matchSeed, side)". */
export function botSeed(matchSeed: number, side: Side): number {
  return fnv1a32(`${matchSeed}:${side}`);
}

/** Tells a bot profile which controls the match locks for its side (WP3 request: no wasted commands). */
function withTrainingLocks(profile: BotProfile, setup: MatchSetup, side: Side): BotProfile {
  const t = setup.config.training;
  const stanceLocked = t?.stanceEnabled ? !t.stanceEnabled[side] : false;
  const autoLastStand = t?.manualLastStand ? !t.manualLastStand[side] : false;
  // WP3's rule tokens (`src/ai/openings.ts`), as `botProfile({ stanceLocked, autoLastStand })` adds them.
  const rules = [...(stanceLocked ? ['rule:noStance'] : []), ...(autoLastStand ? ['rule:autoLastStand'] : [])].filter((r) => !profile.openings.includes(r));
  return rules.length === 0 ? profile : { ...profile, openings: [...profile.openings, ...rules] };
}

/** The opponent's controller for a setup: Old Grogg's script or an AI General. */
export function opponentController(services: Pick<Services, 'createBot'>, setup: MatchSetup, content: CompiledContent): BotController {
  if (setup.brain.kind === 'grogg') return createGroggBrain(1);
  return services.createBot(withTrainingLocks(setup.brain.profile, setup, 1), 1, botSeed(setup.config.seed, 1), content);
}

/** The dev autopilot's tier outside the tutorial: a strong Balanced brain (A2.14) plays for you. */
export const AUTOPILOT_TIER = 5;

/**
 * The dev autopilot for the player's side (`?dev=1&autopilot=1`, B13): the tutorial autopilot in
 * onboarding matches, else the real AI (WP3's Balanced brain at tier V), which uses every control
 * (train, turrets, Modernise, evolve, powers, stance, Last Stand). With `?bots=fallback` the simple
 * stand-in plays instead.
 */
export function autopilotController(setup: MatchSetup, content: CompiledContent, services?: Pick<Services, 'createBot' | 'choice'>): BotController {
  const lastAge = Math.max(0, (content.formats[setup.config.format]?.ages.length ?? 1) - 1);
  if (setup.mode === 'tutorial') {
    return createTutorialAutopilot(content, {
      side: 0,
      turretFromTick: setup.matchNumber === 1 ? MATCH1_TURRET_GRANT_TICK : 0,
      maxAgeIndex: lastAge,
      treasury: setup.matchNumber === 2,
      secondMountFromAge: setup.matchNumber === 2 ? 1 : null,
    });
  }
  const seed = botSeed(setup.config.seed, 0);
  if (services && services.choice.bots === 'real' && hasGenerals(content)) {
    const profile = botProfile(content, { generalId: BALANCED_BRAIN_ID, tier: AUTOPILOT_TIER });
    return services.createBot(withTrainingLocks(profile, setup, 0), 0, seed, content);
  }
  return createFallbackBot({ generalId: 'autopilot', tier: AUTOPILOT_TIER, mistakeBonusBp: 0, weights: { aggr: 50, turret: 50, economy: 50, greed: 50, patience: 50, legendary: 50, hold: 50 }, openings: [] }, 0, seed, content);
}

/** The real content has General tables; the fake content does not (the fallback bot plays there). */
function hasGenerals(content: CompiledContent): boolean {
  return (content as { generals?: unknown }).generals != null;
}

export function createBattle(services: Services, setup: MatchSetup, o: BattleOptions): BattleHandle {
  const content = setup.config.content;
  const sim = services.sim.createSim(setup.config);
  const bots: SessionBot[] = [{ side: 1, controller: opponentController(services, setup, content) }];
  if (o.autopilot) bots.push({ side: 0, controller: autopilotController(setup, content, services) });
  const log = services.eventLog;
  const director = new TutorialDirector(setup.script, {
    side: 0,
    adaptive: o.hints ?? true,
    shown: o.save?.tutorial.hintsShown ?? {},
    onLog: (e) => log.record(e.kind, e.id, { tick: e.tick, match: setup.matchNumber }),
  });
  const prompt = signal<TutorialPrompt | null>(null);
  const unsubscribePrompt = director.subscribe((p) => {
    prompt.value = p;
  });
  const foils: Record<string, 'none' | 'bronze' | 'silver' | 'holo'> = {};
  for (const [card, entry] of Object.entries(o.save?.collection ?? {})) foils[card] = entry.foil;
  const session = new BattleSessionImpl({
    sim,
    mode: setup.mode,
    opponent: setup.opponent,
    mySide: 0,
    bots,
    view: o.createView?.(sim) ?? null,
    scheduler: o.scheduler ?? null,
    visibility: o.visibility ?? null,
    platform: services.platform,
    speed: o.speed ?? o.save?.settings.defaultSpeed ?? 1,
    simVersion: services.sim.simVersion,
    foils,
  });
  const trickle = new TrickleDetector(content, 0);
  session.onTick((events, s) => {
    director.update({ state: s.state, config: s.config, events, side: 0 });
    if (trickle.update(events, s.state)) log.record('trickle', `match${setup.matchNumber}`, { tick: s.state.tick });
  });
  log.record('matchStart', `match${setup.matchNumber}`, { mode: setup.mode, format: setup.config.format, opponent: setup.opponent.generalId, tier: setup.opponent.tier });
  session.onEnd((r) => {
    log.record('matchEnd', `match${setup.matchNumber}`, {
      winner: r.outcome.winner,
      reason: r.outcome.reason,
      ms: r.stats.durationMs,
    });
  });
  return {
    setup,
    session,
    director,
    prompt,
    countdown: signal(-1),
    trickle,
    dispose() {
      unsubscribePrompt();
      session.dispose();
    },
  };
}
