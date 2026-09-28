/**
 * Sample HUD models covering every HUD state (DESIGN C2/WP5 DoD "the HUD renders every state"). Used
 * by the sandbox's HUD states page and by the tests; the game builds real models from the sim
 * (`render/hudModel.ts`).
 */
import type { AgeId, CardId, HudCard, HudModel, MatchConfig, Side } from '@/contracts';
import { ageIds } from './model';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };

/** A mid-match model for `side` in the config's first age, every card ready. */
export function sampleHudModel(config: Readonly<MatchConfig>, side: Side = 0, over: DeepPartial<HudModel> = {}): HudModel {
  const ages = ageIds(config);
  const ageIndex = over.me?.ageIndex ?? 0;
  const age: AgeId = ages[ageIndex] ?? 'stone';
  const lo = config.sides[side].loadouts[age];
  const fmt = config.content.formats[config.format];
  const eco = config.content.economy;
  const cards: HudCard[] = [0, 1, 2, 3, 4].map((slot) => {
    const card = lo?.units[slot] ?? null;
    const def = card ? config.content.units[card] : undefined;
    return { slot, card, cost: def?.cost ?? 0, queued: 0, trainFillBp: 0, state: card ? 'ready' : 'empty', foil: 'none' };
  });
  const base: HudModel = {
    clockMs: 95_000,
    phase: 'regulation',
    phaseMarks: { overdriveMs: fmt?.overdriveMs ?? null, siegeMs: fmt?.siegeMs ?? null, finalBellMs: fmt?.finalBellMs ?? null },
    me: {
      gold: 245,
      goldPerSec: 6,
      nextTreasuryCost: eco.treasuryCosts[0] ?? null,
      baseHpBp: 8600,
      ageIndex,
      xpBp: 5200,
      evolveReady: false,
      ascending: false,
      pop: 18,
      popCap: eco.popCap,
      stance: 'charge',
      stanceVisible: true,
      powerPpm: 640_000,
      power: lo?.power ?? '',
      lastStand: 'locked',
      lastStandManual: true,
      cards,
    },
    foe: {
      label: config.sides[side === 0 ? 1 : 0].label,
      isAI: true,
      baseHpBp: 7300,
      ageIndex: 0,
      xpBp: 6100,
      powerPpm: 420_000,
      lastStandArmed: false,
      scouted: [],
    },
    mounts: [0, 1, 2, 3].map((index) => ({ index, owned: index < 1, card: null, outdated: false, state: 'empty' as const })),
    speed: 1,
    paused: false,
    canRetreat: true,
  };
  return merge(base, over);
}

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    const cur = out[k];
    if (v !== undefined && v !== null && typeof v === 'object' && !Array.isArray(v) && cur !== null && typeof cur === 'object' && !Array.isArray(cur)) {
      out[k] = merge(cur, v as DeepPartial<typeof cur>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export interface HudSample {
  id: string;
  /** What the sample shows (dev page caption; not player-facing). */
  note: string;
  model: HudModel;
}

function withCards(m: HudModel, f: (c: HudCard) => Partial<HudCard>): HudModel {
  return { ...m, me: { ...m.me, cards: m.me.cards.map((c) => (c.card ? { ...c, ...f(c) } : c)) } };
}

/** First card of `group` in the side's loadout for `age`, if any. */
function firstOfGroup(config: Readonly<MatchConfig>, side: Side, age: AgeId, group: string): CardId | null {
  const lo = config.sides[side].loadouts[age];
  return lo?.units.find((c) => c !== null && config.content.units[c]?.group === group) ?? null;
}

/** One sample per HUD state (A9.2): card states, evolve, power, Last Stand, phases, mounts, end. */
export function hudSamples(config: Readonly<MatchConfig>, side: Side = 0): HudSample[] {
  const ages = ageIds(config);
  const fmt = config.content.formats[config.format];
  const lastAge = fmt ? ages.indexOf(fmt.ages[fmt.ages.length - 1] ?? 'stone') : 0;
  const s = (id: string, note: string, over: DeepPartial<HudModel> = {}): HudSample => ({ id, note, model: sampleHudModel(config, side, over) });

  // Show all five card states even with a short plan: empty slots borrow the first card (display only).
  const base = sampleHudModel(config, side, { me: { gold: 120, pop: 34 } });
  const filler = base.me.cards.find((c) => c.card !== null);
  const full: HudModel = filler ? { ...base, me: { ...base.me, cards: base.me.cards.map((c) => (c.card ? c : { ...filler, slot: c.slot })) } } : base;
  const cardStates = withCards(full, (c) => {
    switch (c.slot) {
      case 0:
        return { state: 'ready', queued: 2, trainFillBp: 6200, foil: 'bronze' };
      case 1:
        return { state: 'ready', foil: 'silver' };
      case 2:
        return { state: 'unaffordable', foil: 'holo' };
      case 3:
        return { state: 'armyFull', queued: 1, trainFillBp: 10000 };
      default:
        return { state: 'legendaryInField' };
    }
  });
  const legendary = firstOfGroup(config, side, ages[0] ?? 'stone', 'legendary');

  return [
    s('opening', 'Match start: 175 gold, Treasury affordable later, one free mount, nothing scouted', {
      clockMs: 2_000,
      me: { gold: 175, xpBp: 0, powerPpm: 20_000, pop: 0, baseHpBp: 10000 },
      foe: { baseHpBp: 10000, xpBp: 0, powerPpm: 20_000 },
      canRetreat: false,
    }),
    { id: 'cardStates', note: 'Card states: ready + queued + training fill (bronze foil), ready (silver), unaffordable (holo), ARMY FULL, LEGENDARY IN FIELD', model: cardStates },
    s('evolveReady', 'Evolve ready: steady glow, never flashing; Treasury affordable; power charged', {
      me: { xpBp: 10_000, evolveReady: true, gold: 420, powerPpm: 1_000_000 },
      foe: { scouted: legendary ? [legendary] : [] },
    }),
    s('ascending', 'Ascension in progress (Evolve shows "Evolving")', { me: { xpBp: 10_000, ascending: true } }),
    s('foeLastStand', 'Opponent Last Stand armed: horn on their medallion; their power ring full', {
      foe: { lastStandArmed: true, baseHpBp: 2100, powerPpm: 1_000_000, ageIndex: 1 },
    }),
    s('lastStandArmed', 'Your Last Stand armed (manual from match 5): button in the tray; low HP vignette', {
      me: { lastStand: 'armed', baseHpBp: 2200 },
    }),
    s('lastStandCharging', 'Your Last Stand charging (1 s)', { me: { lastStand: 'charging', baseHpBp: 1800 } }),
    s('lowHp', 'Low base HP (< 25%): red vignette pulse every 1.2 s; automatic Last Stand (first 4 matches)', {
      me: { baseHpBp: 1400, lastStand: 'armed', lastStandManual: false },
    }),
    s('overdrive', 'Overdrive: doubled base income, gold clock frame', {
      clockMs: (fmt?.overdriveMs ?? 300_000) + 12_000,
      phase: 'overdrive',
      me: { goldPerSec: 13.5, nextTreasuryCost: null, ageIndex: Math.min(1, lastAge) },
    }),
    s('siege', 'Siege: red clock frame, Hold stance, army full', {
      clockMs: (fmt?.siegeMs ?? 420_000) + 5_000,
      phase: 'siege',
      me: { stance: 'hold', pop: config.content.economy.popCap, ageIndex: lastAge },
    }),
    s('finalAge', 'Final age: Overcharge instead of Evolve', { me: { ageIndex: lastAge, xpBp: 4000 } }),
    s('tutorial', 'Tutorial: no clock, stance hidden, only two tray slots', {
      phaseMarks: { overdriveMs: null, siegeMs: null, finalBellMs: null },
      clockMs: 41_000,
      me: {
        stanceVisible: false,
        lastStandManual: false,
        cards: sampleHudModel(config, side).me.cards.map((c) => (c.slot < 2 ? c : { ...c, card: null, cost: 0, state: 'empty' as const })),
      },
      canRetreat: false,
    }),
    s('mounts', 'Mounts: an outdated turret, a turret being built, an empty owned mount, the next mount for sale', {
      me: { ageIndex: Math.min(1, lastAge), gold: 900 },
      mounts: [
        { index: 0, owned: true, card: config.sides[side].loadouts[ages[0] ?? 'stone']?.turrets[0] ?? null, outdated: true, state: 'active' },
        { index: 1, owned: true, card: config.sides[side].loadouts[ages[0] ?? 'stone']?.turrets[0] ?? null, outdated: false, state: 'building' },
        { index: 2, owned: true, card: null, outdated: false, state: 'empty' },
        { index: 3, owned: false, card: null, outdated: false, state: 'empty' },
      ],
    }),
    s('fast', 'Speed 2x and paused', { speed: 2, paused: true }),
    s('ended', 'Match over: the tray is disabled', { phase: 'ended', clockMs: 402_000, foe: { baseHpBp: 0 } }),
  ];
}
