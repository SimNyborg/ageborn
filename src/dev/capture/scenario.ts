/**
 * Match setup for the capture page (dev only): the match config from the URL options, the 8-age window
 * that lets each side start in any age, and the headless setup that brings each side to its age.
 *
 * Presentation tooling: everything here builds an ordinary `MatchConfig` and drives the real sim through
 * its commands and the sim's debug helpers (`sim/debug.ts`, as the sandbox does), so the battle that
 * gets rendered is the game's own deterministic simulation.
 */
import type { AgeId, CardId, CompiledContent, FormatDef, FormatId, Loadout, MatchConfig, Side, SideConfig, SideLook, Sim } from '@/contracts';
import { content as realContent } from '@/content';
import { createSim } from '@/sim';
import { devClearLane, devSetXp } from '@/sim/debug';

/**
 * The default plan per age, as the sandbox's showcase loadout: the Infantry, Ranged and Heavy Commons,
 * then an Epic and the Legendary, the age's first two turrets, its starter powers and its wall. (Kept
 * here rather than imported, so this module also runs outside Vite: the studio's scouting runs the same
 * setup headlessly in Node.)
 */
export function defaultLoadout(c: CompiledContent, age: AgeId): Loadout {
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
  const starter = (slot: 'home' | 'field') => Object.values(c.powers).find((p) => p.age === age && p.slot === slot && p.source === 'starter')?.id ?? null;
  const fort = Object.values(c.forts ?? {}).find((f) => f.age === age && f.fortKind === 'wall')?.id ?? null;
  return { units: chosen, turrets: [turrets[0]?.id ?? null, turrets[1]?.id ?? null], powers: { home: starter('home'), field: starter('field') }, fort };
}

export const AGES: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

/** The window of all eight ages with no clock (the capture page's own format; the game has no 8-age war). */
export const CAPTURE_FORMAT: FormatId = 'capture.all';

/**
 * The Blender scene per age where the age's classic look is the older painted backdrop (released scenes
 * with art; Bronze, Industrial and Cosmic show their Blender scene by default).
 */
export const BEST_SCENES: Readonly<Partial<Record<AgeId, string>>> = {
  stone: 'glacier_valley',
  medieval: 'misty_moor',
  gunpowder: 'treasure_cove',
  modern: 'desert_airbase',
  future: 'skyway_metropolis',
};

export interface CaptureOptions {
  /** A game format, or `capture.all` (every age, no clock). */
  format: FormatId;
  seed: number;
  /** The age each side is in when the capture starts (evolved to during setup). */
  ages: readonly [AgeId, AgeId];
  /** Which seats an AI plays. */
  bots: readonly [boolean, boolean];
  /** Card level of every card on both sides. */
  level: number;
  /** Cards to field per side (each goes into its own age's loadout); null keeps the showcase loadout. */
  decks: readonly [readonly CardId[] | null, readonly CardId[] | null];
  /** `best` dresses each age in its Blender scene; `game` keeps the classic look. */
  scenes: 'best' | 'game';
  /** Extra scene per side (`scene.<id>` without the prefix), on top of `scenes`. */
  scene: readonly [string | null, string | null];
  /** A sky (backdrop skin id without the `backdrop.` prefix) for both halves. */
  sky: string | null;
}

export const DEFAULT_OPTIONS: CaptureOptions = {
  format: CAPTURE_FORMAT,
  seed: 1,
  ages: ['stone', 'stone'],
  bots: [false, false],
  level: 3,
  decks: [null, null],
  scenes: 'best',
  scene: [null, null],
  sky: null,
};

function isAge(v: string | null): v is AgeId {
  return v !== null && (AGES as readonly string[]).includes(v);
}

/** Reads the capture options from a URL query (`?left=stone&right=cosmic&bots=2&seed=4 ...`). */
export function optionsFromQuery(search: string, c: CompiledContent = realContent): CaptureOptions {
  const q = new URLSearchParams(search);
  const o: CaptureOptions = { ...DEFAULT_OPTIONS };
  const format = q.get('format');
  if (format && (format === CAPTURE_FORMAT || c.formats[format])) o.format = format;
  const seed = Number(q.get('seed'));
  if (Number.isInteger(seed) && seed > 0) o.seed = seed;
  const ages = captureContent(c).formats[o.format]?.ages ?? AGES;
  const left = q.get('left');
  const right = q.get('right');
  const first = ages[0] ?? 'stone';
  o.ages = [isAge(left) && ages.includes(left) ? left : first, isAge(right) && ages.includes(right) ? right : first];
  const bots = q.get('bots');
  o.bots = bots === '2' ? [true, true] : bots === '1' ? [false, true] : bots === 'left' ? [true, false] : [false, false];
  const level = Number(q.get('level'));
  if (Number.isInteger(level) && level >= 1 && level <= 10) o.level = level;
  const deck = (k: string): CardId[] | null => {
    const v = q.get(k);
    if (!v) return null;
    const cards = v.split(',').filter((id) => c.units[id] || c.turrets[id] || c.powers[id] || (c.forts ?? {})[id]);
    return cards.length > 0 ? cards : null;
  };
  o.decks = [deck('deck0'), deck('deck1')];
  o.scenes = q.get('scenes') === 'game' ? 'game' : 'best';
  o.scene = [q.get('scene'), q.get('foeScene')];
  o.sky = q.get('sky');
  return o;
}

let cached: { base: CompiledContent; out: CompiledContent } | null = null;

/** The real content plus the capture window of every age (`capture.all`). */
export function captureContent(base: CompiledContent = realContent): CompiledContent {
  if (cached?.base === base) return cached.out;
  const thresholds = AGES.slice(0, -1).map((a) => base.ages[a]?.xpToNext ?? 1000);
  const all: FormatDef = {
    id: CAPTURE_FORMAT,
    kind: 'untimed',
    ages: [...AGES],
    overdriveMs: null,
    siegeMs: null,
    finalBellMs: null,
    retreatAfterMs: 0,
    xpToNextOverride: thresholds.map((t) => (t > 0 ? t : 1000)),
  };
  const out: CompiledContent = { ...base, formats: { ...base.formats, [CAPTURE_FORMAT]: all } };
  cached = { base, out };
  return out;
}

/** A side's loadouts: the showcase plan per age, with the deck's cards moved into their own ages first. */
export function loadoutsFor(c: CompiledContent, deck: readonly CardId[] | null): Partial<Record<AgeId, Loadout>> {
  const out: Partial<Record<AgeId, Loadout>> = {};
  for (const age of AGES) out[age] = defaultLoadout(c, age);
  if (!deck) return out;
  const units: Partial<Record<AgeId, CardId[]>> = {};
  for (const id of deck) {
    const u = c.units[id];
    if (u) (units[u.age] ??= []).push(id);
    const t = c.turrets[id];
    const lo = t ? out[t.age] : undefined;
    if (t && lo) lo.turrets = [id, lo.turrets[0] === id ? (lo.turrets[1] ?? null) : (lo.turrets[0] ?? null)];
    const p = c.powers[id];
    const plo = p ? out[p.age] : undefined;
    if (p && plo) plo.powers = { ...plo.powers, [p.slot]: id };
  }
  for (const [age, ids] of Object.entries(units) as [AgeId, CardId[]][]) {
    const lo = out[age];
    if (!lo) continue;
    // the deck's troops first, then the showcase troops that are not in it, seven slots in all
    const rest = lo.units.filter((x): x is CardId => x !== null && !ids.includes(x));
    lo.units = [...ids, ...rest].slice(0, 7);
  }
  return out;
}

function lookFor(o: CaptureOptions, side: Side, c: CompiledContent): SideLook {
  const scenes: Partial<Record<AgeId, string>> = {};
  if (o.scenes === 'best') for (const [age, id] of Object.entries(BEST_SCENES) as [AgeId, string][]) scenes[age] = `scene.${id}`;
  const extra = o.scene[side];
  const items = (c.cosmetics as { collections?: { items?: readonly { collection: string; id: string; age?: AgeId }[] } }).collections?.items ?? [];
  const age = extra ? items.find((x) => x.collection === 'scene' && x.id === extra)?.age : undefined;
  if (extra && age) scenes[age] = `scene.${extra}`;
  return { scenes, ...(o.sky ? { backdrop: `backdrop.${o.sky}` } : {}) };
}

function sideConfig(o: CaptureOptions, side: Side, c: CompiledContent): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(c.units), ...Object.keys(c.turrets)]) levels[id] = o.level;
  return {
    label: side === 0 ? 'Capture Blue' : 'Capture Orange',
    isBot: o.bots[side],
    loadouts: loadoutsFor(c, o.decks[side]),
    levels,
    skins: {},
    look: lookFor(o, side, c),
  };
}

export function captureMatchConfig(o: CaptureOptions): MatchConfig {
  const c = captureContent();
  return { seed: o.seed, format: o.format, content: c, sides: [sideConfig(o, 0, c), sideConfig(o, 1, c)] };
}

/** The ages of the match's format, in order. */
export function formatAges(config: Readonly<MatchConfig>): AgeId[] {
  return [...(config.content.formats[config.format]?.ages ?? AGES)];
}

/**
 * Brings each side to its starting age before anything is drawn: XP to the threshold, the Evolve command,
 * then the 2.5 s Ascension, once per age. The Vanguards the Ascensions spawn are cleared afterwards, so
 * the capture starts on an empty lane in the chosen ages. Returns the ticks it ran.
 */
export function evolveToAges(sim: Sim, ages: readonly [AgeId, AgeId], step: (cmds: { t: 'evolve'; side: Side }[]) => void): number {
  const order = formatAges(sim.config);
  const want = [order.indexOf(ages[0]), order.indexOf(ages[1])] as const;
  const thresholds = sim.config.content.formats[sim.config.format]?.xpToNextOverride ?? [];
  let ticks = 0;
  for (let guard = 0; guard < 40; guard++) {
    const st = sim.state;
    const todo: { t: 'evolve'; side: Side }[] = [];
    for (const side of [0, 1] as const) {
      const s = st.sides[side];
      if (s.ageIndex < (want[side] ?? 0) && s.ascendUntil <= st.tick) {
        const age = order[s.ageIndex];
        const need = thresholds[s.ageIndex] ?? (age ? sim.config.content.ages[age]?.xpToNext : null) ?? 1000;
        devSetXp(sim, side, need + 1);
        todo.push({ t: 'evolve', side });
      }
    }
    if (todo.length === 0) break;
    // one tick runs the Evolve commands, then the 2.5 s Ascension (50 ticks) plays out
    step(todo);
    ticks++;
    for (let i = 0; i < 52 && !sim.state.outcome; i++) {
      step([]);
      ticks++;
    }
  }
  devClearLane(sim);
  return ticks;
}

/** A fresh sim for the options (the setup in `evolveToAges` is the caller's next step). */
export function createCaptureSim(o: CaptureOptions): Sim {
  return createSim(captureMatchConfig(o));
}
