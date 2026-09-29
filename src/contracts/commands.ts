/**
 * Player and bot commands (DESIGN B15 `commands.ts`, A2.12 controls, B3 Commands).
 *
 * Human and bot commands go through the same queue and are all recorded in the replay (DESIGN B3).
 * Invalid commands are ignored by the sim and emit `commandRejected` (DESIGN B3 step 1).
 */
import type { ResearchClass, ResearchTrack } from './content';
import type { EmoteId, Side } from './ids';

/** A tray slot: 6 unit cards per loadout from A18 phase 2 (DESIGN A18.9; was 5). */
export type TraySlot = 0 | 1 | 2 | 3 | 4 | 5;

/** The three stances (DESIGN A18.4.2). */
export type StanceMode = 'charge' | 'hold' | 'fallback';

export type Command =
  /** Train the card in tray slot 0-5; gold is paid on enqueue (DESIGN A2.7 Training, A18.9 six troops). */
  | { t: 'train'; side: Side; slot: TraySlot }
  /** No slot = last item; with a slot, removes the last queued instance of that card, full refund (DESIGN A2.7). */
  | { t: 'cancelTrain'; side: Side; slot?: TraySlot }
  /** Build the loadout turret `slot` on an empty owned mount (DESIGN A2.8). */
  | { t: 'buildTurret'; side: Side; mount: 0 | 1 | 2 | 3; slot: 0 | 1 }
  /** Modernise an older-age turret: new price minus 50% of the old (DESIGN A2.8). */
  | { t: 'replaceTurret'; side: Side; mount: 0 | 1 | 2 | 3; slot: 0 | 1 }
  /** Sell: stops firing at once, 50% refund after 1 s (DESIGN A2.8). */
  | { t: 'sellTurret'; side: Side; mount: 0 | 1 | 2 | 3 }
  /** Buy the next mount: 150 / 350 / 700 (DESIGN A2.3). */
  | { t: 'buyMount'; side: Side }
  /**
   * Start a War Council research item in the one research slot (DESIGN A18.5.1; replaces `treasury`).
   * `group` names the class line of the Troops track and is ignored by the other tracks; `pick` is
   * 0 (pick A) or 1 (pick B) of the rank's pair. Gold is paid at the start.
   */
  | { t: 'research'; side: Side; track: ResearchTrack; group?: ResearchClass; rank: 1 | 2 | 3; pick: 0 | 1 }
  /** Cancel the research in progress: 75% refund (DESIGN A18.5.1). */
  | { t: 'researchCancel'; side: Side }
  /** Evolve to the next age when XP ≥ threshold (DESIGN A2.4). */
  | { t: 'evolve'; side: Side }
  /** Own-side progress in lu; omitted = auto-aim (DESIGN A2.9 Casting). */
  | { t: 'power'; side: Side; p?: number }
  /**
   * Stance and Hold flag (DESIGN A18.4.2): a mode change is accepted once per 3 s, a flag move once per
   * 1 s. `holdP` (own-side p in lu) moves the Hold flag; the sim clamps it to [320, 800] and snaps it to
   * 20 lu. Sent with the current mode it is a flag move only.
   */
  | { t: 'stance'; side: Side; mode: StanceMode; holdP?: number }
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
