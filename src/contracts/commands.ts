/**
 * Player and bot commands (DESIGN B15 `commands.ts`, A2.12 controls, B3 Commands).
 *
 * Human and bot commands go through the same queue and are all recorded in the replay (DESIGN B3).
 * Invalid commands are ignored by the sim and emit `commandRejected` (DESIGN B3 step 1).
 */
import type { EmoteId, Side } from './ids';

export type Command =
  /** Train the card in tray slot 0-4; gold is paid on enqueue (DESIGN A2.7 Training). */
  | { t: 'train'; side: Side; slot: 0 | 1 | 2 | 3 | 4 }
  /** No slot = last item; with a slot, removes the last queued instance of that card, full refund (DESIGN A2.7). */
  | { t: 'cancelTrain'; side: Side; slot?: 0 | 1 | 2 | 3 | 4 }
  /** Build the loadout turret `slot` on an empty owned mount (DESIGN A2.8). */
  | { t: 'buildTurret'; side: Side; mount: 0 | 1 | 2 | 3; slot: 0 | 1 }
  /** Modernise an older-age turret: new price minus 50% of the old (DESIGN A2.8). */
  | { t: 'replaceTurret'; side: Side; mount: 0 | 1 | 2 | 3; slot: 0 | 1 }
  /** Sell: stops firing at once, 50% refund after 1 s (DESIGN A2.8). */
  | { t: 'sellTurret'; side: Side; mount: 0 | 1 | 2 | 3 }
  /** Buy the next mount: 150 / 350 / 700 (DESIGN A2.3). */
  | { t: 'buyMount'; side: Side }
  /** Treasury upgrade: 3 levels (DESIGN A2.3). */
  | { t: 'treasury'; side: Side }
  /** Evolve to the next age when XP ≥ threshold (DESIGN A2.4). */
  | { t: 'evolve'; side: Side }
  /** Own-side progress in lu; omitted = auto-aim (DESIGN A2.9 Casting). */
  | { t: 'power'; side: Side; p?: number }
  /** Stance toggle, 2 s cooldown (DESIGN A2.7 Stance). */
  | { t: 'stance'; side: Side; stance: 'charge' | 'hold' }
  /** Fire Last Stand while armed (DESIGN A2.11). */
  | { t: 'lastStand'; side: Side }
  | { t: 'emote'; side: Side; emote: EmoteId }
  /** Retreat counts as a loss (DESIGN A2.10). */
  | { t: 'retreat'; side: Side };

/**
 * A command stamped with its execution tick (`sim.tick + 1` offline) and a per-side sequence number.
 * Within a tick the sim applies commands sorted by (side, seq) (DESIGN B3).
 */
export type TimedCommand = Command & { tick: number; seq: number };
