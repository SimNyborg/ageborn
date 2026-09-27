/**
 * Battle sources for the sandbox and feel pages (dev only): the canned fake stream (C2/WP5 Phase 1),
 * a real-sim match on the real content, and a stress scene for the B16 budgets (80 units, turrets on
 * both sides). The bot seats use WP3's AI Generals when that module loads (fed a delayed observation,
 * like the session will), else a small dev autoplayer.
 *
 * Dev pages are internal tools: they may read full sim state and use the sim's debug helpers.
 */
import type {
  AgeId,
  BotController,
  BotProfile,
  CardId,
  Command,
  CompiledContent,
  CreateBot,
  FormatId,
  Loadout,
  MatchConfig,
  Observation,
  Side,
  SideConfig,
  Sim,
  TimedCommand,
} from '@/contracts';
import { content as realContent } from '@/content';
import { FakeSim, fakeMatchConfig } from '@/contracts/fakes/sim';
import { RingBuffer, mulberry32, type CosmeticRng } from '@/core';
import { ageOrder, canEvolve } from '@/render';
import { createSim } from '@/sim';
import { devPlaceTurret, devSetGold, devSpawn } from '@/sim/debug';

export type SourceKind = 'fake' | 'real' | 'stress';

export interface BattleSource {
  readonly kind: SourceKind;
  readonly sim: Sim;
  /** True when the source has nothing more to play (fake stream drained or match over). */
  done(): boolean;
  /** One fixed step: stamps the human commands, adds bot commands, steps the sim. */
  step(human: readonly Command[]): ReturnType<Sim['step']>;
}

const AGES: readonly AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

/** A showcase plan per age: Infantry, Ranged and Heavy commons, then an Epic and the Legendary when present. */
export function showcaseLoadout(c: CompiledContent, age: AgeId): Loadout {
  const units = Object.values(c.units).filter((u) => u.age === age && !u.hidden);
  const pick = (f: (u: (typeof units)[number]) => boolean): CardId | null => units.find(f)?.id ?? null;
  const chosen = [
    pick((u) => u.group === 'infantry' && u.rarity === 'common'),
    pick((u) => u.group === 'ranged' && u.rarity === 'common'),
    pick((u) => u.group === 'heavy' && u.rarity === 'common'),
    pick((u) => u.group === 'epic') ?? pick((u) => u.group === 'antiArmor'),
    pick((u) => u.group === 'legendary') ?? pick((u) => u.group === 'support'),
  ];
  const turrets = Object.values(c.turrets).filter((t) => t.age === age);
  const power = Object.values(c.powers).find((p) => p.age === age && p.slot === 'default') ?? Object.values(c.powers).find((p) => p.age === age);
  return { units: chosen, turrets: [turrets[0]?.id ?? null, turrets[1]?.id ?? null], power: power?.id ?? '' };
}

function sideConfig(c: CompiledContent, label: string, isBot: boolean, level: number): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(c.units), ...Object.keys(c.turrets)]) levels[id] = level;
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of AGES) loadouts[age] = showcaseLoadout(c, age);
  return { label, isBot, loadouts, levels, skins: {} };
}

export function realMatchConfig(format: FormatId, seed: number): MatchConfig {
  return {
    seed,
    format,
    content: realContent,
    // The opponent is always an AI and labeled so (A7.1).
    sides: [sideConfig(realContent, 'Sandbox', false, 3), sideConfig(realContent, 'AI Sandbox General', true, 3)],
  };
}

/** Something that plays one side: returns this tick's commands. */
export interface Seat {
  commands(sim: Sim): Command[];
}

/**
 * A WP3 AI General in a seat, fed like the session feeds bots (B6, B10): every tick the observation
 * goes into a ring and the bot decides on the one from `snapshotDelayTicks` ago.
 */
class AiSeat implements Seat {
  private readonly ring: RingBuffer<Observation>;

  constructor(
    private readonly bot: BotController,
    private readonly side: Side,
  ) {
    this.ring = new RingBuffer<Observation>(Math.max(1, Math.trunc(bot.snapshotDelayTicks)) + 1);
  }

  commands(sim: Sim): Command[] {
    this.ring.push(sim.observe(this.side));
    const obs = this.ring.at(this.bot.snapshotDelayTicks);
    return obs ? this.bot.onTick(obs).filter((c) => c.side === this.side) : [];
  }
}

type AiModule = {
  createBot?: CreateBot;
  botProfile?: (content: CompiledContent, o: { generalId: string; tier: number }) => BotProfile;
};
const aiModules = import.meta.glob<AiModule>('../../ai/index.ts');

/** Makes AI seats from WP3's module when it is present; null when it is not (the autoplayer stands in). */
export type AiKit = (side: Side, seed: number, content: CompiledContent) => Seat;

export async function loadAiKit(generalId = 'pip', tier = 4): Promise<AiKit | null> {
  try {
    const load = Object.values(aiModules)[0];
    const mod = load ? await load() : undefined;
    const { createBot, botProfile } = mod ?? {};
    if (!createBot || !botProfile) return null;
    return (side, seed, content) => new AiSeat(createBot(botProfile(content, { generalId, tier }), side, seed, content), side);
  } catch (e) {
    console.warn('[sandbox] AI module failed, using the dev autoplayer', e);
    return null;
  }
}

/**
 * A tiny rule-based player for dev pages. It reads the full state (dev only; real bots see a delayed
 * observation) and plays a plausible match: trains, evolves, builds and modernises turrets, buys
 * mounts and Treasury, casts the power and fires Last Stand.
 */
export class DevAutoplayer implements Seat {
  private readonly rng: CosmeticRng;
  private wait = 0;

  constructor(
    readonly side: Side,
    seed: number,
    private readonly everyTicks = 6,
  ) {
    this.rng = mulberry32(seed * 7919 + side * 104729 + 17);
  }

  commands(sim: Sim): Command[] {
    const st = sim.state;
    if (st.outcome) return [];
    if (this.wait > 0) {
      this.wait--;
      return [];
    }
    this.wait = this.everyTicks + this.rng.int(this.everyTicks);
    const cfg = sim.config;
    const side = this.side;
    const me = st.sides[side];
    const foe = st.sides[side === 0 ? 1 : 0];
    const ages = ageOrder(cfg);
    const age = ages[me.ageIndex] ?? 'stone';
    const lo = cfg.sides[side].loadouts[age];
    const eco = cfg.content.economy;
    const gold = me.gold / 1000;
    const out: Command[] = [];

    if (canEvolve(st, cfg, side)) return [{ t: 'evolve', side }];
    if (me.lastStand === 'armed') out.push({ t: 'lastStand', side });
    if (me.powerPpm >= 1_000_000 && st.units.some((u) => u.side !== side)) out.push({ t: 'power', side });

    // Turrets: modernise outdated ones, fill a free mount, buy a second mount.
    const turretCard = (slot: 0 | 1): CardId | null => lo?.turrets[slot] ?? null;
    const outdated = me.turrets.findIndex((t) => t !== null && t.state === 'active' && (cfg.content.ages[t.age]?.index ?? 0) < me.ageIndex);
    const free = me.turrets.findIndex((t, i) => t === null && i < me.mountsOwned);
    const slot = this.rng.int(2) as 0 | 1;
    const tCard = turretCard(slot) ?? turretCard(0);
    const tCost = tCard ? (cfg.content.turrets[tCard]?.cost ?? 9999) : 9999;
    if (outdated >= 0 && tCard && gold > tCost && this.rng.next() < 0.5) {
      out.push({ t: 'replaceTurret', side, mount: outdated as 0 | 1 | 2 | 3, slot: tCard === turretCard(slot) ? slot : 0 });
    } else if (free >= 0 && tCard && gold > tCost + 80 && st.tick > 300 && this.rng.next() < 0.35) {
      out.push({ t: 'buildTurret', side, mount: free as 0 | 1 | 2 | 3, slot: tCard === turretCard(slot) ? slot : 0 });
    } else if (me.mountsOwned < 3 && gold > (eco.mountCosts[me.mountsOwned] ?? 9999) + 250 && this.rng.next() < 0.15) {
      out.push({ t: 'buyMount', side });
    } else if (me.treasury < 2 && gold > (eco.treasuryCosts[me.treasury] ?? 9999) + 150 && st.tick > 400 && this.rng.next() < 0.2) {
      out.push({ t: 'treasury', side });
    }

    // Training: keep the queue busy with what we can afford, heavier picks when rich.
    if (me.queue.length < 3 && lo) {
      const options = lo.units
        .map((card, i) => ({ card, i, cost: card ? (cfg.content.units[card]?.cost ?? 0) : 0 }))
        .filter((o) => o.card !== null && o.cost <= gold);
      if (options.length > 0) {
        const pick = options[this.rng.int(options.length)];
        if (pick) out.push({ t: 'train', side, slot: pick.i as 0 | 1 | 2 | 3 | 4 });
      }
    }
    if (foe.baseHp < foe.baseMaxHp * 0.3 && me.stance === 'hold') out.push({ t: 'stance', side, stance: 'charge' });
    if (this.rng.next() < 0.004) out.push({ t: 'emote', side, emote: this.rng.next() < 0.5 ? 'thumbsUp' : 'laugh' });
    return out;
  }
}

class Stamper {
  private readonly seq: [number, number] = [0, 0];

  stamp(sim: Sim, cmds: readonly Command[]): TimedCommand[] {
    const tick = sim.state.tick + 1;
    return cmds.map((c) => ({ ...c, tick, seq: ++this.seq[c.side] }));
  }
}

class FakeSource implements BattleSource {
  readonly kind = 'fake';
  readonly sim = new FakeSim({ config: fakeMatchConfig(1) });
  private readonly stamper = new Stamper();

  done(): boolean {
    return this.sim.done;
  }

  step(human: readonly Command[]): ReturnType<Sim['step']> {
    return this.sim.step(this.stamper.stamp(this.sim, human));
  }
}

class RealSource implements BattleSource {
  readonly sim: Sim;
  private readonly bots: Seat[];
  private readonly stamper = new Stamper();

  constructor(
    readonly kind: SourceKind,
    format: FormatId,
    seed: number,
    autoplayMe: boolean,
    ai: AiKit | null,
  ) {
    this.sim = createSim(realMatchConfig(format, seed));
    const seat = (side: Side): Seat => (ai ? ai(side, seed + side, this.sim.config.content) : new DevAutoplayer(side, seed));
    this.bots = [seat(1)];
    if (autoplayMe) this.bots.push(seat(0));
    if (kind === 'stress') this.setupStress();
  }

  /** 80 units (40 a side) spread over the lane, all four mounts with turrets, plenty of gold. */
  private setupStress(): void {
    const c = this.sim.config.content;
    const ages = ageOrder(this.sim.config);
    for (const side of [0, 1] as const) {
      const lo = this.sim.config.sides[side].loadouts[ages[0] ?? 'stone'];
      const cards = (lo?.units ?? []).filter((x): x is CardId => x !== null && c.units[x]?.group !== 'legendary');
      for (let i = 0; i < 40; i++) {
        const card = cards[i % cards.length];
        if (card) devSpawn(this.sim, side, card, { p: 60 + ((i * 37) % 480) });
      }
      const turret = lo?.turrets[0];
      if (turret) for (let m = 0; m < 4; m++) devPlaceTurret(this.sim, side, m, turret);
      devSetGold(this.sim, side, 3000);
    }
  }

  done(): boolean {
    return this.sim.state.outcome !== null;
  }

  step(human: readonly Command[]): ReturnType<Sim['step']> {
    const cmds: Command[] = [...human];
    for (const b of this.bots) cmds.push(...b.commands(this.sim));
    return this.sim.step(this.stamper.stamp(this.sim, cmds));
  }
}

export interface SourceOptions {
  kind: SourceKind;
  format: FormatId;
  seed: number;
  /** Let the bot play your side too (bot vs bot). */
  autoplayMe: boolean;
  /** WP3 AI Generals for the bot seats; null uses the dev autoplayer. */
  ai: AiKit | null;
}

export function createSource(o: SourceOptions): BattleSource {
  if (o.kind === 'fake') return new FakeSource();
  return new RealSource(o.kind, o.format, o.seed, o.autoplayMe, o.ai);
}
