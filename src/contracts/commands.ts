/**
 * Player and bot commands (DESIGN B15 `commands.ts`, A2.12 controls, B3 Commands).
 *
 * Human and bot commands go through the same queue and are all recorded in the replay (DESIGN B3).
 * Invalid commands are ignored by the sim and emit `commandRejected` (DESIGN B3 step 1).
 */
import type { PowerSlot, ResearchClass, ResearchTrack } from './content';
import type { EmoteId, Side } from './ids';

/** A tray slot: 7 unit cards per loadout from owner request 2026-10-07 (DESIGN A18.9; 6 before, 5 before A18 phase 2). */
export type TraySlot = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A fort pad index: 0-2 Home pads, 3-4 Field pads (DESIGN A16.14.1, `economy.fort.pads`). */
export type FortPad = 0 | 1 | 2 | 3 | 4;

/** The three stances (DESIGN A18.4.2). */
export type StanceMode = 'charge' | 'hold' | 'fallback';

export type Command =
  /** Train the card in tray slot 0-6; gold is paid on enqueue (DESIGN A2.7 Training, A18.9 seven troops). */
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
  /**
   * Cast the power in `slot` (DESIGN A2.9.7). `p` is the own-side aim in lu, truncated to milli-lu and
   * clamped into the power's reach band; omitted = auto-aim. Powers without aim ignore `p`. The cost is
   * paid on acceptance. Rejections, in order: `badCommand`, `noPower`, `powerReloading`,
   * `powerLockout`, `powerOutOfReach`, `powerNoTarget`, `noGold`.
   */
  | { t: 'power'; side: Side; slot: PowerSlot; p?: number }
  /**
   * Stance and Hold flag (DESIGN A18.4.2): a mode change is accepted once per 3 s, a flag move once per
   * 1 s. `holdP` (own-side p in lu) moves the Hold flag; the sim clamps it to [320, 800] and snaps it to
   * 20 lu. Sent with the current mode it is a flag move only.
   */
  | { t: 'stance'; side: Side; mode: StanceMode; holdP?: number }
  /**
   * Place the current loadout's Fort card on own pad `pad` (index into `economy.fort.pads`, 0-4; DESIGN
   * A16.14.2). The cost is paid on acceptance, never refunded. Rejections, in order: `badCommand`,
   * `noFort`, `fortSiege`, `fortRecharge`, `fortMax`, `fortCampMax`, `fortPadKind`, `fortPadTaken`,
   * `fortPadEnemy`, `fortPadField`, `popFull`, `noGold`.
   */
  | { t: 'fort'; side: Side; pad: FortPad }
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
