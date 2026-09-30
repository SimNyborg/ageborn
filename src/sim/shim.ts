/**
 * Local compile shim (DESIGN C2/WP2): turns the raw Part A tables (`src/content/raw`, or the frozen
 * copy in `tests/fixtures/content`) into a `CompiledContent` in table units, until WP1's compiler
 * (`src/content/compile.ts`) is used everywhere. The sim may not import the content layer (B2), so the
 * input is typed structurally here; callers pass `raw` from `@/content/raw`.
 *
 * Output shape: every def exactly as in the raw tables (table units, see
 * docs/requests/wp2-content-units.md), ages completed with their visual and music ids, meta tables
 * `null` (so daily modifiers use the sim's A9.1 defaults, `modifiers.ts`), empty counters, precompiled
 * `ticks`, the raw `battle` table passed through as an extra `battle` field (as WP1's content has it,
 * read by `rules.ts` `battleOf`), and `hash` = FNV-1a of the canonical JSON of the input.
 */
import type {
  AgeDef,
  AgeId,
  CardId,
  CompiledContent,
  EconomyRules,
  FormatDef,
  FormatId,
  FortDef,
  PowerDef,
  ResearchRules,
  TurretDef,
  UnitDef,
} from '@/contracts';
import { addStructureMods, compileForts, fortEconomyOf, hashCanonical, msToTicks, type FortSpec } from '@/core';
import type { BattleRulesLike } from './rules';

/** The subset of `RawContent` (src/content/raw/types.ts) the shim needs. */
export interface RawContentLike {
  /** `forts` (A16.14.4): the raw fort tables; absent in raw copies that predate forts. */
  ages: readonly { age: AgeId; units: readonly UnitDef[]; turrets: readonly TurretDef[]; forts?: readonly FortSpec[] }[];
  powers: readonly PowerDef[];
  economy: EconomyRules;
  ageScale: Readonly<Partial<Record<AgeId, Pick<AgeDef, 'id' | 'index' | 'pBp' | 'baseHp' | 'xpToNext'>>>>;
  formats: Readonly<Record<FormatId, FormatDef>>;
  /** Raw-only battle numbers (`RawBattleRules`): the heal pulse (A2.7: 0.5 s) and the {@link BattleRulesLike} fields. */
  battle?: Partial<BattleRulesLike> & { healPulseMs?: number };
  /** The War Council (A18.5); absent in raw copies that predate it (no picks). */
  research?: ResearchRules;
}

/** No War Council: every `research` command is rejected (content that predates A18). */
const NO_RESEARCH: ResearchRules = {
  picks: [],
  cost: { troops: [], defences: [], economy: [], command: [] },
  timeMs: [],
  cancelRefundBp: 0,
  underdog: { discountBp: 0, baseGapBp: 0 },
  unlockAt: {},
  classOfRole: {
    infantry: 'infantry',
    skirmisher: 'infantry',
    ranged: 'ranged',
    artillery: 'ranged',
    airBomber: 'ranged',
    airGunship: 'ranged',
    heavy: 'heavy',
    siege: 'heavy',
    siegeHeavy: 'heavy',
    antiArmor: 'antiArmor',
    antiMech: 'antiArmor',
    support: 'support',
  },
};

export function compileForSim(raw: RawContentLike): CompiledContent {
  const units: Record<CardId, UnitDef> = {};
  const turrets: Record<CardId, TurretDef> = {};
  const forts: Record<CardId, FortDef> = {};
  // A16.14: the same fort compilation as WP1's compiler (`core/forts.ts`): structure mods, twins, levies.
  const fortRules = fortEconomyOf(raw.economy);
  const tableUnits = raw.ages.flatMap((a) => a.units);
  const withMods = fortRules ? addStructureMods(tableUnits, fortRules.structureBp) : tableUnits;
  for (const u of withMods) units[u.id] = u;
  for (const age of raw.ages) for (const t of age.turrets) turrets[t.id] = t;
  const specs = raw.ages.flatMap((a) => a.forts ?? []);
  if (fortRules && specs.length > 0) {
    const built = compileForts(specs, withMods, fortRules);
    for (const l of built.levies) units[l.id] = l;
    for (const t of built.twins) units[t.id] = t;
    for (const f of built.forts) forts[f.id] = f;
  }
  const powers: Record<CardId, PowerDef> = {};
  for (const p of raw.powers) powers[p.id] = p;
  const ages = {} as Record<AgeId, AgeDef>;
  for (const id of Object.keys(raw.ageScale).sort() as AgeId[]) {
    const a = raw.ageScale[id];
    if (!a) continue;
    ages[id] = {
      ...a,
      paletteId: `palette.${id}`,
      baseVisualId: `base.${id}`,
      backdropVisualId: `backdrop.${id}`,
      musicCue: `music.${id}`,
    };
  }
  const e = raw.economy;
  const content: CompiledContent & { battle?: RawContentLike['battle'] } = {
    hash: hashCanonical({
      ages: raw.ages,
      powers: raw.powers,
      economy: raw.economy,
      ageScale: raw.ageScale,
      formats: raw.formats,
      battle: raw.battle ?? null,
      research: raw.research ?? null,
    }),
    ages,
    formats: { ...raw.formats },
    economy: e,
    units,
    turrets,
    powers,
    forts,
    skins: {},
    research: raw.research ?? NO_RESEARCH,
    rarities: null,
    capsules: null,
    arenas: null,
    trophyRoad: null,
    generals: null,
    names: null,
    quests: null,
    dailyModifiers: null,
    cosmetics: null,
    counters: {},
    ticks: {
      ascend: msToTicks(e.ascendMs),
      turretBuild: msToTicks(e.turretBuildMs),
      turretSell: msToTicks(e.turretSellMs),
      stanceCooldown: msToTicks(e.stanceCooldownMs),
      retarget: msToTicks(e.retargetMs),
      healPulse: msToTicks(raw.battle?.healPulseMs ?? 500),
      firstHitIdle: msToTicks(e.firstHitIdleMs),
      lastStandCharge: msToTicks(e.lastStand.chargeMs),
    },
  };
  if (raw.battle) content.battle = raw.battle;
  return Object.freeze(content);
}
