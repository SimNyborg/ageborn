/** A mutable sim state over the real content for director and hint tests. */
import type { MatchConfig, SimEvent, SimState, UnitState } from '@/contracts';
import { content } from '@/content';
import { createSim } from '@/sim';
import { MATCH1_TRAYS, match1Loadouts, starterLoadout } from '../scripts';
import type { TickInput } from '../view';

export function config(o: Partial<MatchConfig> = {}): MatchConfig {
  const loadouts = match1Loadouts(content);
  const stone = starterLoadout(content, 'stone');
  // The player owns the Stone AA (Spear Hunter) and Support in slots 3-4 for the hint tests.
  loadouts.stone = { ...stone, units: [stone.units[0]!, stone.units[1]!, stone.units[2]!, 'spear_hunter', null] };
  return {
    seed: 1,
    format: 'short',
    content,
    sides: [
      { label: 'Player', isBot: false, loadouts, levels: {}, skins: {} },
      { label: 'AI · Test', isBot: true, loadouts: match1Loadouts(content), levels: {}, skins: {} },
    ],
    ...o,
  };
}

export class Harness {
  readonly state: SimState;
  readonly config: MatchConfig;
  private nextId = 100;

  constructor(cfg: MatchConfig = config()) {
    this.config = cfg;
    this.state = structuredClone(createSim(cfg).state) as SimState;
  }

  /** The input for the current tick with these events (stamped with the tick). */
  input(events: Omit<SimEvent, 'tick'>[] = []): TickInput {
    return {
      state: this.state,
      config: this.config,
      events: events.map((e) => ({ ...e, tick: this.state.tick }) as SimEvent),
      side: 0,
    };
  }

  /** Moves time on by `n` ticks. */
  advance(n = 1): void {
    this.state.tick += n;
  }

  gold(whole: number): void {
    this.state.sides[0].gold = whole * 1000;
  }

  addUnit(side: 0 | 1, card: string, x: number): UnitState {
    const u: UnitState = {
      id: this.nextId++, side, card, level: 1, x, prevX: x, hp: 10000, maxHp: 10000, shield: 0, innateShield: 0,
      mode: 'walk', attacks: [], statuses: [], air: false, summoned: false, timers: [], lastDamageTick: 0,
    };
    this.state.units.push(u);
    return u;
  }

  died(card: string, killerKind: 'unit' | 'turret' | 'power', killerCard: string | null): Omit<SimEvent, 'tick'> {
    return {
      e: 'died', id: this.nextId++, side: 0, card, killerId: null, killerCard, killerKind, killerSide: 1,
      bountyGold: 0, bountyXp: 0, x: 500_000,
    } as Omit<SimEvent, 'tick'>;
  }
}

export { MATCH1_TRAYS };
