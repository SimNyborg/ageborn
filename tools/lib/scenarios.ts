/**
 * Deterministic single-scenario measurements for A2.14 targets that need no bots:
 *
 * - **Base time to kill**: a full army (60 pop) of same-age L1 Commons with no opposition needs 40-60 s
 *   to destroy a full same-age base. Measured on the real sim from the army's first base hit to the
 *   base's destruction. The defender trains nothing, owns no turrets and has Last Stand spent; the clock
 *   is off (`training.noClock`), so no phase multiplies base damage.
 * - **Power damage per unit in zone**: the A2.9 coverage estimate (count × 2 × radius / zone hits per
 *   unit) against the age's L1 Infantry and Heavy commons (reported).
 * - **Static per-power budgets by family** (A2.9.6, A2.9.12): Home bombards and sweeps 80-100% of I and
 *   20-30% of H per unit; front barrages and charges 60-95% and 15-27%; strikes 55-65% of H and never a
 *   kill on a full-HP same-age Heavy or non-Legendary Epic (Epics take `strikeEpicBp`); controls at least
 *   12 disabled unit-seconds per 100 gold at the cap with damage ≤ 45% of I (snares and pulls 30-40%);
 *   Flak ≤ 100% of its age's air Epic at the centre; buffs ≤ 70% of I in shields plus heals per target.
 *   Pulse counts use the sim's formula (max(1, duration ÷ 500)).
 *
 * The base scenario sets up state with the sim's dev helpers (src/sim/debug.ts), which is fine for a tool
 * and means the sim refuses to build a replay of it.
 */
import type { AgeId, CardId, CompiledContent, PowerDef, Side, UnitDef } from '../../src/contracts';
import { createSim } from '../../src/sim';
import { devClearLane, devSetXp, devSpawn, simCtx } from '../../src/sim/debug';
import { agesOf, baselinePlan, sideConfig, unitsOfAge } from './plans';

export interface BaseKillResult {
  age: AgeId;
  army: Record<CardId, number>;
  pop: number;
  /** Seconds from the first base hit to the base's destruction (the gated number). */
  seconds: number;
  /** Seconds from the army's spawn to the base's destruction (for reference). */
  fromSpawnSeconds: number;
  destroyed: boolean;
}

const TICKS_PER_SEC = 20;

function commonsOf(content: CompiledContent, age: AgeId): UnitDef[] {
  const us = unitsOfAge(content, age).filter((u) => u.rarity === 'common');
  const order = ['infantry', 'ranged', 'heavy'];
  return us.filter((u) => order.includes(u.group)).sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}

/** Fills `popCap` round-robin with the age's Infantry, Ranged and Heavy commons. */
export function commonArmy(content: CompiledContent, age: AgeId): UnitDef[] {
  const commons = commonsOf(content, age);
  const cap = content.economy.popCap;
  const army: UnitDef[] = [];
  let pop = 0;
  for (let guard = 0; guard < 1000 && commons.length > 0; guard += 1) {
    const u = commons[guard % commons.length] as UnitDef;
    if (pop + u.pop > cap) {
      if (commons.every((c) => pop + c.pop > cap)) break;
      continue;
    }
    army.push(u);
    pop += u.pop;
  }
  return army;
}

/** The static budget check of one power (A2.9.6). Families without a numeric budget always pass. */
export interface PowerBudget {
  power: CardId;
  family: PowerDef['family'];
  target: string;
  value: string;
  pass: boolean;
}

/** HP with the innate shield (the Photon Knight's counts as HP). */
function ehp(u: UnitDef): number {
  const shield = u.abilities.find((a) => a.kind === 'innateShield');
  return u.hp + (shield?.kind === 'innateShield' ? shield.amount : 0);
}

const pctOf = (a: number, b: number): number => Math.round((a * 100) / b);

export function powerBudget(content: CompiledContent, pw: PowerDef): PowerBudget {
  const e = pw.effect;
  const us = unitsOfAge(content, pw.age);
  const i = us.find((u) => u.group === 'infantry' && u.rarity === 'common');
  const h = us.find((u) => u.group === 'heavy' && u.rarity === 'common');
  const epics = us.filter((u) => u.rarity === 'epic');
  const epic = epics.find((u) => u.group === 'epic') ?? epics[0];
  const airEpic = epics.find((u) => u.tags.includes('air')) ?? epic;
  const out = (target: string, value: string, pass: boolean): PowerBudget => ({ power: pw.id, family: pw.family, target, value, pass });
  if (!i || !h) return out('-', 'no Infantry or Heavy common in the age', false);
  switch (pw.family) {
    case 'bombard':
    case 'sweep':
    case 'frontBarrage':
    case 'charge': {
      let perUnit = 0;
      if (e.kind === 'barrage') perUnit = (e.damage * e.count * 2 * e.radius) / e.zone;
      else if (e.kind === 'sweep') perUnit = e.damage;
      else if (e.kind === 'stampede') perUnit = e.damage * e.maxHitsPerEnemy;
      const home = pw.family === 'bombard' || pw.family === 'sweep';
      const [ilo, ihi, hlo, hhi] = home ? [80, 100, 20, 30] : [60, 95, 15, 27];
      const li = pctOf(perUnit, ehp(i));
      const hi = pctOf(perUnit, ehp(h));
      return out(`${ilo}-${ihi}% of ${i.id} / ${hlo}-${hhi}% of ${h.id}`, `${Math.round(perUnit)} HP: ${li}% / ${hi}%`, li >= ilo && li <= ihi && hi >= hlo && hi <= hhi);
    }
    case 'strike': {
      if (e.kind !== 'strike') break;
      const total = e.damage * e.shots;
      const pct = pctOf(total, ehp(h));
      const onEpic = epic ? Math.trunc((total * content.economy.power.strikeEpicBp) / 10_000) : 0;
      const epicOk = !epic || onEpic < ehp(epic);
      return out(`55-65% of ${h.id}; never kills a full ${h.id} or ${epic?.id ?? 'Epic'}`, `${total}: ${pct}%${epic ? `; ${epic.id} takes ${onEpic} of ${ehp(epic)}` : ''}`, pct >= 55 && pct <= 65 && total < ehp(h) && epicOk);
    }
    case 'snare':
    case 'pull':
    case 'stun': {
      if (e.kind !== 'field') break;
      const pulses = Math.max(1, Math.trunc(e.durationMs / 500));
      const cap = pw.maxTargets ?? 0;
      let ds = 0;
      for (const st of e.statuses ?? []) {
        if (st.kind === 'stun') ds += (cap * st.durationMs) / 1000;
        if (st.kind === 'snare') ds += (cap * (st.magnitudeBp / 10_000) * pulses * 500) / 1000;
      }
      const per100 = (ds * 100) / pw.cost;
      const dmgPct = ((e.damagePerPulse ?? 0) * pulses * 100) / ehp(i);
      const band = pw.family === 'stun' ? [0, 45] : [30, 40];
      return out(
        `≥ 12 disabled unit-s per 100 g; damage ${band[0]}-${band[1]}% of ${i.id}`,
        `${per100.toFixed(1)} unit-s per 100 g; damage ${Math.round(dmgPct)}%`,
        per100 >= 12 && Math.round(dmgPct) >= (band[0] as number) && dmgPct <= (band[1] as number) + 0.5,
      );
    }
    case 'flak': {
      if (e.kind !== 'barrage' || !airEpic) break;
      const centre = e.damage * e.count;
      return out(`≤ 100% of ${airEpic.id} at the centre`, `${centre} of ${ehp(airEpic)}: ${pctOf(centre, ehp(airEpic))}%`, centre <= ehp(airEpic));
    }
    case 'rally':
    case 'ward':
    case 'mend': {
      if (e.kind !== 'buffAll') break;
      let total = 0;
      let capsOk = true;
      const caps = content.economy.statCaps;
      for (const st of e.statuses) {
        if (st.kind === 'shield') total += st.amount ?? 0;
        if (st.kind === 'regen') total += (i.hp * st.magnitudeBp) / 10_000;
        if (st.kind === 'speedBuff' && st.magnitudeBp > caps.speedBp) capsOk = false;
        if (st.kind === 'attackSpeedBuff' && st.magnitudeBp > caps.attackSpeedBp) capsOk = false;
        if (st.kind === 'damageBuff' && st.magnitudeBp > caps.damageBp) capsOk = false;
      }
      const pct = pctOf(total, ehp(i));
      return out(`shields + heals ≤ 70% of ${i.id}; stats within the A18.2 caps; ≤ 8 units`, `${pct}%${capsOk ? '' : ', over a stat cap'}; ${e.maxTargets} units`, pct <= 70 && capsOk && e.maxTargets <= 8);
    }
    default:
      return out('no static budget (gated through its ±3 row)', '-', true);
  }
  return out('-', `effect ${e.kind} does not fit family ${pw.family}`, false);
}

/** Evolves `side` to `ageIndex` with the regular Evolve command (so the base rescales as in a match). */
function evolveTo(sim: ReturnType<typeof createSim>, side: Side, ageIndex: number): void {
  let seq = 0;
  for (let guard = 0; sim.state.sides[side].ageIndex < ageIndex && guard < 20; guard += 1) {
    devSetXp(sim, side, 100_000);
    seq += 1;
    sim.step([{ t: 'evolve', side, tick: sim.state.tick + 1, seq }]);
    for (let i = 0; i < 400 && sim.state.sides[side].ascendUntil > sim.state.tick; i += 1) sim.step([]);
    for (let i = 0; i < 5; i += 1) sim.step([]);
  }
}

export function baseTimeToKill(content: CompiledContent, age: AgeId, o: { maxSeconds?: number } = {}): BaseKillResult {
  const ages = agesOf(content);
  const ageIndex = ages.indexOf(age);
  const plan = baselinePlan(content);
  const sim = createSim({
    seed: 1,
    format: 'full',
    content,
    sides: [sideConfig(content, plan, { level: 1, label: 'Army', isBot: false }), sideConfig(content, plan, { level: 1, label: 'Base', isBot: false })],
    training: { noClock: true },
  });
  evolveTo(sim, 1, ageIndex);
  devClearLane(sim);
  // "No opposition": the defender's Last Stand is spent.
  simCtx(sim).s.sides[1].lastStand = 'used';

  // The column starts at the spawn point and extends forward at about the A2.7 spacing; the gated
  // number starts at the first base hit, so where the column starts does not matter.
  const army: Record<CardId, number> = {};
  let p = content.economy.spawnP;
  let pop = 0;
  for (const u of commonArmy(content, age)) {
    devSpawn(sim, 0, u.id, { p, level: 1 });
    army[u.id] = (army[u.id] ?? 0) + 1;
    pop += u.pop;
    p += Math.max(8, Math.trunc((content.economy.sizes[u.size] * content.economy.spacingBp) / 10_000));
  }

  const start = sim.state.tick;
  const limit = start + (o.maxSeconds ?? 240) * TICKS_PER_SEC;
  let firstHit: number | null = null;
  while (!sim.state.outcome && sim.state.tick < limit) {
    for (const e of sim.step([])) {
      if (firstHit === null && e.e === 'baseDamaged' && e.side === 1 && e.sourceId !== null) firstHit = e.tick;
    }
  }
  const end = sim.state.outcome ? sim.state.outcome.tick : sim.state.tick;
  const destroyed = sim.state.outcome?.reason === 'baseDestroyed' && sim.state.outcome.winner === 0;
  return {
    age,
    army,
    pop,
    seconds: destroyed && firstHit !== null ? (end - firstHit) / TICKS_PER_SEC : Number.NaN,
    fromSpawnSeconds: destroyed ? (end - start) / TICKS_PER_SEC : Number.NaN,
    destroyed,
  };
}

export interface PowerCoverage {
  power: CardId;
  age: AgeId;
  kind: PowerDef['effect']['kind'];
  /** Expected damage per enemy unit in the zone (whole HP, L1). */
  perUnit: number;
  light: CardId | null;
  lightPct: number;
  heavy: CardId | null;
  heavyPct: number;
}

/**
 * The A2.9 estimate for a damaging power; null for powers that deal no damage (buffs, clouds, drops).
 * Barrage: damage × count × 2 × radius / zone. Sweep: its damage once per unit. Stampede: damage × the
 * per-enemy hit cap.
 */
export function powerCoverage(content: CompiledContent, power: PowerDef): PowerCoverage | null {
  const fx = power.effect;
  let perUnit: number;
  if (fx.kind === 'barrage') perUnit = (fx.damage * fx.count * 2 * fx.radius) / fx.zone;
  else if (fx.kind === 'sweep') perUnit = fx.damage;
  else if (fx.kind === 'stampede') perUnit = fx.damage * fx.maxHitsPerEnemy;
  else return null;
  const commons = commonsOf(content, power.age);
  const light = commons.find((u) => u.group === 'infantry') ?? null;
  const heavy = commons.find((u) => u.group === 'heavy') ?? null;
  return {
    power: power.id,
    age: power.age,
    kind: fx.kind,
    perUnit,
    light: light?.id ?? null,
    lightPct: light ? (perUnit * 100) / light.hp : Number.NaN,
    heavy: heavy?.id ?? null,
    heavyPct: heavy ? (perUnit * 100) / heavy.hp : Number.NaN,
  };
}
