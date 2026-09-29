/**
 * Bot actions: what the brain can choose (DESIGN A7.2 action table), and their commands (B15).
 * Costs are milli-gold. Power aim `p` is own-side progress in whole lu, as the `power` command wants.
 */
import type { CardId, Command, EmoteId, ResearchPickDef, Side, StanceMode, TraySlot } from '@/contracts';
import { researchCommand } from '@/core';

export type BotAction =
  | { kind: 'train'; slot: number; card: CardId; cost: number }
  | { kind: 'build'; mount: number; slot: number; card: CardId; cost: number }
  | { kind: 'mount'; cost: number }
  | { kind: 'modernise'; mount: number; slot: number; card: CardId; cost: number }
  /** A War Council research item (A18.5; the Economy income picks replaced the Treasury). */
  | { kind: 'research'; pick: ResearchPickDef; cost: number }
  | { kind: 'evolve' }
  | { kind: 'power'; p: number | null }
  /** A stance change; a change to Hold may also place the flag (`holdP`, whole lu, A18.4.2). */
  | { kind: 'stance'; stance: StanceMode; holdP?: number }
  /** Moves the Hold flag while Holding (A18.4.2: at most once per 1 s, no stance cooldown). */
  | { kind: 'flag'; holdP: number }
  | { kind: 'lastStand' }
  | { kind: 'emote'; emote: EmoteId };

type Mount = 0 | 1 | 2 | 3;
type Slot2 = 0 | 1;

/** The command for an action. */
export function toCommand(a: BotAction, side: Side): Command {
  switch (a.kind) {
    case 'train':
      return { t: 'train', side, slot: a.slot as TraySlot };
    case 'build':
      return { t: 'buildTurret', side, mount: a.mount as Mount, slot: a.slot as Slot2 };
    case 'mount':
      return { t: 'buyMount', side };
    case 'modernise':
      return { t: 'replaceTurret', side, mount: a.mount as Mount, slot: a.slot as Slot2 };
    case 'research':
      return researchCommand(side, a.pick);
    case 'evolve':
      return { t: 'evolve', side };
    case 'power':
      return a.p === null ? { t: 'power', side } : { t: 'power', side, p: a.p };
    case 'stance':
      return a.holdP === undefined ? { t: 'stance', side, mode: a.stance } : { t: 'stance', side, mode: a.stance, holdP: a.holdP };
    case 'flag':
      return { t: 'stance', side, mode: 'hold', holdP: a.holdP };
    case 'lastStand':
      return { t: 'lastStand', side };
    case 'emote':
      return { t: 'emote', side, emote: a.emote };
  }
}

/** Gold an action spends, milli. */
export function actionCost(a: BotAction): number {
  switch (a.kind) {
    case 'train':
    case 'build':
    case 'mount':
    case 'modernise':
    case 'research':
      return a.cost;
    default:
      return 0;
  }
}

/** A short label for logs and the dev viewer. */
export function describeAction(a: BotAction | null): string {
  if (!a) return 'wait';
  switch (a.kind) {
    case 'train':
      return `train ${a.card}`;
    case 'build':
      return `build ${a.card} on mount ${a.mount + 1}`;
    case 'mount':
      return 'buy mount';
    case 'modernise':
      return `modernise mount ${a.mount + 1} to ${a.card}`;
    case 'research':
      return `research ${a.pick.id}`;
    case 'evolve':
      return 'evolve';
    case 'power':
      return a.p === null ? 'power (auto)' : `power at p ${a.p}`;
    case 'stance':
      return a.holdP === undefined ? `stance ${a.stance}` : `stance ${a.stance} flag ${a.holdP}`;
    case 'flag':
      return `flag ${a.holdP}`;
    case 'lastStand':
      return 'last stand';
    case 'emote':
      return `emote ${a.emote}`;
  }
}
