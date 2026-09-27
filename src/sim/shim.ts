/**
 * Local compile shim (DESIGN C2/WP2): turns the raw Part A tables (`src/content/raw`, or the frozen
 * copy in `tests/fixtures/content`) into a `CompiledContent` in table units, until WP1's compiler
 * (`src/content/compile.ts`) is used everywhere. The sim may not import the content layer (B2), so the
 * input is typed structurally here; callers pass `raw` from `@/content/raw`.
 *
 * Output shape: every def exactly as in the raw tables (table units, see
 * docs/requests/wp2-content-units.md), ages completed with their visual and music ids, meta tables
 * `null`, empty counters, precompiled `ticks`, and `hash` = FNV-1a of the canonical JSON of the input.
 */
import type {
  AgeDef,
  AgeId,
  CardId,
  CompiledContent,
  EconomyRules,
  FormatDef,
  FormatId,
  PowerDef,
  TurretDef,
  UnitDef,
} from '@/contracts';
import { hashCanonical, msToTicks } from '@/core';

/** The subset of `RawContent` (src/content/raw/types.ts) the shim needs. */
export interface RawContentLike {
  ages: readonly { age: AgeId; units: readonly UnitDef[]; turrets: readonly TurretDef[] }[];
  powers: readonly PowerDef[];
  economy: EconomyRules;
  ageScale: Readonly<Record<AgeId, Pick<AgeDef, 'id' | 'index' | 'pBp' | 'baseHp' | 'xpToNext'>>>;
  formats: Readonly<Record<FormatId, FormatDef>>;
  /** Raw-only battle numbers; the shim reads the heal pulse (A2.7: 0.5 s). */
  battle?: { healPulseMs: number };
}

export function compileForSim(raw: RawContentLike): CompiledContent {
  const units: Record<CardId, UnitDef> = {};
  const turrets: Record<CardId, TurretDef> = {};
  for (const age of raw.ages) {
    for (const u of age.units) units[u.id] = u;
    for (const t of age.turrets) turrets[t.id] = t;
  }
  const powers: Record<CardId, PowerDef> = {};
  for (const p of raw.powers) powers[p.id] = p;
  const ages = {} as Record<AgeId, AgeDef>;
  for (const id of Object.keys(raw.ageScale).sort() as AgeId[]) {
    const a = raw.ageScale[id];
    ages[id] = {
      ...a,
      paletteId: `palette.${id}`,
      baseVisualId: `base.${id}`,
      backdropVisualId: `backdrop.${id}`,
      musicCue: `music.${id}`,
    };
  }
  const e = raw.economy;
  const content: CompiledContent = {
    hash: hashCanonical({
      ages: raw.ages,
      powers: raw.powers,
      economy: raw.economy,
      ageScale: raw.ageScale,
      formats: raw.formats,
      battle: raw.battle ?? null,
    }),
    ages,
    formats: { ...raw.formats },
    economy: e,
    units,
    turrets,
    powers,
    skins: {},
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
      powerCharge: msToTicks(e.powerChargeMs),
      turretBuild: msToTicks(e.turretBuildMs),
      turretSell: msToTicks(e.turretSellMs),
      stanceCooldown: msToTicks(e.stanceCooldownMs),
      retarget: msToTicks(e.retargetMs),
      healPulse: msToTicks(raw.battle?.healPulseMs ?? 500),
      firstHitIdle: msToTicks(e.firstHitIdleMs),
      lastStandCharge: msToTicks(e.lastStand.chargeMs),
    },
  };
  return Object.freeze(content);
}
