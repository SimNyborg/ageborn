/**
 * Event emission (DESIGN B15 `events.ts`). Systems push event bodies; `emit` stamps the current tick.
 * `sim.step()` returns the events of that tick in emission order, which follows the B3 pipeline.
 */
import type { SimEvent } from '@/contracts';
import type { Ctx } from './state';

/** A `SimEvent` without its `tick` (distributes over the union). */
export type EventBody = SimEvent extends infer E ? (E extends SimEvent ? Omit<E, 'tick'> : never) : never;

export function emit(ctx: Ctx, body: EventBody): void {
  ctx.ev.push({ ...body, tick: ctx.tick } as SimEvent);
}
