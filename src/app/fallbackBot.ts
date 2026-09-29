/**
 * A small stand-in `BotController` used until the AI Generals (WP3, `src/ai`) are wired in Phase 2,
 * and as the dev autopilot for non-tutorial matches.
 *
 * It follows the honesty rules of A7.1: it sees only the delayed `Observation` the session hands it,
 * issues ordinary commands for its own side, and gets no stat or information bonus. Its timing uses
 * the A7.3 decision interval and snapshot delay of its tier. It is deliberately simple (train what it
 * can afford, fill empty mounts, evolve when ready, fire the power into a crowd, fire Last Stand when
 * armed); the real utility AI (A7.2) replaces it.
 */
import type { BotController, BotProfile, CardId, Command, CompiledContent, CreateBot, Observation, Side } from '@/contracts';
import { randInt, seedSfc32, type Sfc32State } from '@/core';

/** A7.3 anchor rows: tier → [decision interval ms, snapshot delay ms]. Other tiers interpolate. */
const TIER_TIMING: readonly [number, number, number][] = [
  [0, 2000, 1000],
  [1, 1600, 900],
  [3, 1350, 770],
  [5, 1100, 640],
  [7, 850, 510],
  [10, 500, 300],
];

/** A7.3 decision interval and snapshot delay for `tier`, in ticks (numeric columns interpolate). */
export function tierTiming(tier: number): { intervalTicks: number; delayTicks: number } {
  const t = Math.max(0, Math.min(10, Math.trunc(tier)));
  let lo = TIER_TIMING[0]!;
  let hi = TIER_TIMING[TIER_TIMING.length - 1]!;
  for (let i = 0; i < TIER_TIMING.length - 1; i += 1) {
    const a = TIER_TIMING[i]!;
    const b = TIER_TIMING[i + 1]!;
    if (t >= a[0] && t <= b[0]) {
      lo = a;
      hi = b;
      break;
    }
  }
  const span = hi[0] - lo[0];
  const f = (x: number, y: number): number => (span === 0 ? x : x + ((y - x) * (t - lo[0])) / span);
  return {
    intervalTicks: Math.max(1, Math.round(f(lo[1], hi[1]) / 50)),
    // No bot reacts faster than 300 ms (A7.3).
    delayTicks: Math.max(6, Math.round(f(lo[2], hi[2]) / 50)),
  };
}

const PPM_FULL = 1_000_000;
/** Enemy units whose p (milli-lu from our gate) is below this count as "on our half". */
const OWN_HALF_MILLI = 700_000;
const EVOLVE_RETRY_TICKS = 100;

class FallbackBot implements BotController {
  readonly snapshotDelayTicks: number;
  private readonly interval: number;
  private readonly rng: Sfc32State;
  private nextDecision = 0;
  private lastEvolveTry = -EVOLVE_RETRY_TICKS;

  constructor(
    private readonly side: Side,
    private readonly content: CompiledContent,
    tier: number,
    seed: number,
  ) {
    const timing = tierTiming(tier);
    this.snapshotDelayTicks = timing.delayTicks;
    this.interval = timing.intervalTicks;
    this.rng = seedSfc32(`fallback:${seed}:${side}`);
  }

  onTick(obs: Observation): Command[] {
    if (obs.phase === 'ended' || obs.tick < this.nextDecision) return [];
    this.nextDecision = obs.tick + this.interval;
    const c = this.decide(obs);
    return c ? [c] : [];
  }

  private decide(obs: Observation): Command | null {
    const side = this.side;
    const me = obs.me;
    const gold = Math.floor(me.gold / 1000);
    if (me.lastStand === 'armed') return { t: 'lastStand', side };
    const foesNear = obs.units.filter((u) => u.side !== side && u.p < OWN_HALF_MILLI).length;
    // A2.9: the Home slot, when reloaded and affordable (the sim rejects a cast with nothing in range).
    const home = me.powers.home;
    if (home && home.ppm >= PPM_FULL && gold >= home.cost && foesNear >= 2) return { t: 'power', side, slot: 'home' };
    if (me.xpBp >= 10000 && obs.tick - this.lastEvolveTry >= EVOLVE_RETRY_TICKS) {
      this.lastEvolveTry = obs.tick;
      return { t: 'evolve', side };
    }
    const turret = this.turretCommand(obs, gold);
    if (turret) return turret;
    const affordable: { slot: number; card: CardId }[] = [];
    me.tray.forEach((card, slot) => {
      const def = card ? this.content.units[card] : undefined;
      if (card && def && def.cost <= gold) affordable.push({ slot, card });
    });
    if (affordable.length > 0 && me.queue.length < this.content.economy.queueMax) {
      const pick = affordable[randInt(this.rng, affordable.length)]!;
      return { t: 'train', side, slot: pick.slot as 0 | 1 | 2 | 3 | 4 };
    }
    return null;
  }

  private turretCommand(obs: Observation, gold: number): Command | null {
    const me = obs.me;
    const side = this.side;
    const empty = me.turrets.findIndex((t, i) => i < me.mountsOwned && t === null);
    if (empty < 0) return null;
    const options = me.turretCards
      .map((card, slot) => ({ card, slot, def: card ? this.content.turrets[card] : undefined }))
      .filter((o) => o.def && o.def.cost + 50 <= gold);
    if (options.length === 0) return null;
    const o = options[randInt(this.rng, options.length)]!;
    return { t: 'buildTurret', side, mount: empty as 0 | 1 | 2 | 3, slot: o.slot as 0 | 1 };
  }
}

/** Same signature as the real `createBot` (B10), so the app can swap them. */
export const createFallbackBot: CreateBot = (profile: BotProfile, side, seed, content) =>
  new FallbackBot(side, content, profile.tier, seed);
