/**
 * Bot actions: what the brain can choose (DESIGN A7.2 action table), and their commands (B15).
 * Costs are milli-gold. Power aim `p` is own-side progress in whole lu, as the `power` command wants.
 */
import type { CardId, Command, EmoteId, Side } from '@/contracts';

export type BotAction =
  | { kind: 'train'; slot: number; card: CardId; cost: number }
  | { kind: 'build'; mount: number; slot: number; card: CardId; cost: number }
  | { kind: 'mount'; cost: number }
  | { kind: 'modernise'; mount: number; slot: number; card: CardId; cost: number }
  | { kind: 'treasury'; cost: number }
  | { kind: 'evolve' }
  | { kind: 'power'; p: number | null }
  | { kind: 'stance'; stance: 'charge' | 'hold' }
  | { kind: 'lastStand' }
  | { kind: 'emote'; emote: EmoteId };

type Slot5 = 0 | 1 | 2 | 3 | 4;
type Mount = 0 | 1 | 2 | 3;
type Slot2 = 0 | 1;

/** The command for an action. */
export function toCommand(a: BotAction, side: Side): Command {
  switch (a.kind) {
    case 'train':
      return { t: 'train', side, slot: a.slot as Slot5 };
    case 'build':
      return { t: 'buildTurret', side, mount: a.mount as Mount, slot: a.slot as Slot2 };
    case 'mount':
      return { t: 'buyMount', side };
    case 'modernise':
      return { t: 'replaceTurret', side, mount: a.mount as Mount, slot: a.slot as Slot2 };
    case 'treasury':
      return { t: 'treasury', side };
    case 'evolve':
      return { t: 'evolve', side };
    case 'power':
      return a.p === null ? { t: 'power', side } : { t: 'power', side, p: a.p };
    case 'stance':
      return { t: 'stance', side, stance: a.stance };
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
    case 'treasury':
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
    case 'treasury':
      return 'treasury';
    case 'evolve':
      return 'evolve';
    case 'power':
      return a.p === null ? 'power (auto)' : `power at p ${a.p}`;
    case 'stance':
      return `stance ${a.stance}`;
    case 'lastStand':
      return 'last stand';
    case 'emote':
      return `emote ${a.emote}`;
  }
}
