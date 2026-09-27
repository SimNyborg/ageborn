/**
 * Old Grogg's scripted brain (DESIGN A7.4, A8, B10): "The Grogg tutorial brain is scripted from
 * `tutorial/scripts.ts` data through the same command API."
 *
 * Grogg is a `BotController` like every AI General: he sees only the `Observation` the session hands
 * him and issues ordinary train commands for his own side. He sends Training Dummies (and one
 * Tuskback at 0:40), never evolves, never builds turrets and never fires his power. The script grants
 * his gold, so the sends do not depend on his economy.
 */
import type { BotController, Command, Observation, Side } from '@/contracts';
import { GROGG_SCRIPT, type GroggScript } from './scripts';

export class GroggBrain implements BotController {
  /** Scripted by tick, so there is nothing to delay. */
  readonly snapshotDelayTicks = 0;
  private cursor = 0;

  constructor(
    private readonly side: Side = 1,
    private readonly script: GroggScript = GROGG_SCRIPT,
  ) {}

  onTick(obs: Observation): Command[] {
    if (obs.phase === 'ended') return [];
    const out: Command[] = [];
    const alive = obs.units.filter((u) => u.side === this.side).length;
    while (this.cursor < this.script.sends.length) {
      const send = this.script.sends[this.cursor]!;
      if (send.tick > obs.tick) break;
      this.cursor += 1;
      // Skip (do not queue up) sends while the lane already holds enough of his units.
      if (alive + out.length >= this.script.maxAlive && send.slot === 0) continue;
      out.push({ t: 'train', side: this.side, slot: send.slot });
    }
    return out;
  }
}

export function createGroggBrain(side: Side = 1, script: GroggScript = GROGG_SCRIPT): GroggBrain {
  return new GroggBrain(side, script);
}
