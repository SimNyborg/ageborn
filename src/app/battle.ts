/**
 * Starts a battle from a `MatchSetup` (DESIGN B11 BattleSession): creates the sim, the opponent's
 * brain, the optional dev autopilot, the session, the tutorial director and the event-log hooks.
 * The view is created by the caller's factory (the battle screen owns the Pixi canvas), so this
 * module runs headless in tests and dev tools.
 */
import { signal, type ReadonlySignal } from '@preact/signals';
import type { BotController, CompiledContent, SaveDoc, Side, Sim } from '@/contracts';
import { fnv1a32 } from '@/core';
import { createGroggBrain, createTutorialAutopilot, MATCH1_TURRET_GRANT_TICK, TutorialDirector, type TutorialPrompt } from '@/tutorial';
import { createFallbackBot } from './fallbackBot';
import type { MatchSetup } from './matchSetup';
import type { Services } from './services';
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
  dispose(): void;
}

/** A7.2: "The bot RNG is seeded from hash(matchSeed, side)". */
export function botSeed(matchSeed: number, side: Side): number {
  return fnv1a32(`${matchSeed}:${side}`);
}

/** The opponent's controller for a setup: Old Grogg's script or an AI General. */
export function opponentController(services: Pick<Services, 'createBot'>, setup: MatchSetup, content: CompiledContent): BotController {
  if (setup.brain.kind === 'grogg') return createGroggBrain(1);
  return services.createBot(setup.brain.profile, 1, botSeed(setup.config.seed, 1), content);
}

/** The dev autopilot for the player's side. */
export function autopilotController(setup: MatchSetup, content: CompiledContent): BotController {
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
  return createFallbackBot({ generalId: 'autopilot', tier: 5, mistakeBonusBp: 0, weights: { aggr: 50, turret: 50, economy: 50, greed: 50, patience: 50, legendary: 50, hold: 50 }, openings: [] }, 0, botSeed(setup.config.seed, 0), content);
}

export function createBattle(services: Services, setup: MatchSetup, o: BattleOptions): BattleHandle {
  const content = setup.config.content;
  const sim = services.sim.createSim(setup.config);
  const bots: SessionBot[] = [{ side: 1, controller: opponentController(services, setup, content) }];
  if (o.autopilot) bots.push({ side: 0, controller: autopilotController(setup, content) });
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
  session.onTick((events, s) => director.update({ state: s.state, config: s.config, events, side: 0 }));
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
    dispose() {
      unsubscribePrompt();
      session.dispose();
    },
  };
}
