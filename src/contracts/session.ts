/**
 * Battle session (DESIGN B15 `session.ts`, B11, B6 loop). Implemented by WP11 in `src/app/session.ts`.
 *
 * Builds the `MatchConfig`, creates the sim, bots, observation rings, view and HUD model, runs the
 * fixed-step loop, records the replay, and on end hands the result to meta (DESIGN B11).
 * The signal type is a type-only `import()`, so this module has no runtime imports (B2).
 */
import type { Command } from './commands';
import type { HudModel } from './hud';
import type { MatchResultInput } from './meta';
import type { ReplayDoc } from './sim';

export interface BattleSession {
  start(): void;
  pause(): void;
  resume(): void;
  /** 1x / 1.5x / 2x (DESIGN A2.12). */
  setSpeed(s: 1 | 1.5 | 2): void;
  /** Stamped with `sim.tick + 1` and a seq by the session (DESIGN B3 Commands). */
  issue(c: Command): void;
  /** Updated at 15 Hz (DESIGN B6 HUD). */
  readonly hud: import('@preact/signals').ReadonlySignal<HudModel>;
  onEnd(cb: (r: MatchResultInput, replay: ReplayDoc) => void): void;
  dispose(): void;
}
