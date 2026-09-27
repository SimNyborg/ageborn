/**
 * B3 step 14, deaths (DESIGN A2.3 Gold, A2.4 XP, A5.1 bounties): bounties, XP, on-death effects
 * (rider summons, explosions) and `died` events. Passes repeat in id order until no new deaths, at most
 * 8 passes, then dead units are compacted out.
 *
 * - Kills by units, turrets and unit abilities pay the killer 60% of the victim's cost in gold and 100%
 *   in XP; kills by powers and Last Stand pay 30% gold and no XP.
 * - Underdog: +50% gold and XP when the victim's card age is above the killer's current age, unless
 *   the killer's Evolve is available.
 * - The owner gets 40% of the cost in XP. Summoned units pay nothing either way.
 */
import { BP } from '@/core';
import { makeImpact } from '../damage';
import { emit } from '../events';
import { levelBp, scaleCenti } from '../rules';
import { ageIdxOf, canEvolve, cardLevel, unitCost, type Ctx, type UnitRt } from '../state';
import { spawnUnit, unitRules } from '../units';
import { addGold, addXp } from './economy';
import { resolveImpact } from './impacts';

const MAX_PASSES = 8;

export function deathSystem(ctx: Ctx): void {
  const units = ctx.s.units;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let any = false;
    // Snapshot the length: units summoned by a death are handled in a later pass.
    const n = units.length;
    for (let i = 0; i < n; i += 1) {
      const u = units[i] as UnitRt;
      if (u.hp > 0 || u.mode === 'dying') continue;
      any = true;
      processDeath(ctx, u);
    }
    if (!any) break;
  }
  // Compaction (B3: removals compact at the end of the step).
  let w = 0;
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i] as UnitRt;
    if (u.mode === 'dying') continue;
    units[w] = u;
    w += 1;
  }
  units.length = w;
}

function processDeath(ctx: Ctx, u: UnitRt): void {
  const r = unitRules(ctx, u);
  const side = ctx.s.sides[u.side];
  u.mode = 'dying';
  u.hp = 0;
  if (!u.summoned) side.pop -= r.pop;
  const kind = u.lastHitKind;
  const killerSide = u.lastHitSide;
  let gold = 0;
  let xp = 0;
  let loss = 0;
  if (!u.summoned) {
    const cost = unitCost(ctx, u.card);
    loss = Math.trunc((cost * ctx.econ.ownLossXpBp) / BP);
    if (kind !== null && killerSide !== u.side) {
      const byPower = kind === 'power' || kind === 'lastStand';
      gold = Math.trunc((cost * (byPower ? ctx.econ.powerKillGoldBp : ctx.econ.bountyGoldBp)) / BP);
      xp = Math.trunc((cost * (byPower ? ctx.econ.powerKillXpBp : ctx.econ.bountyXpBp)) / BP);
      if (r.ageIdx > ageIdxOf(ctx, killerSide) && !canEvolve(ctx, killerSide)) {
        gold = Math.trunc((gold * (BP + ctx.econ.underdogBp)) / BP);
        xp = Math.trunc((xp * (BP + ctx.econ.underdogBp)) / BP);
      }
    }
  }
  const byPowerKill = kind === 'power' || kind === 'lastStand';
  emit(ctx, {
    e: 'died',
    id: u.id,
    side: u.side,
    card: u.card,
    killerId: kind === null || byPowerKill ? null : u.lastHitId,
    killerCard: kind === null ? null : u.lastHitCard,
    killerKind: kind,
    killerSide: kind === null ? null : killerSide,
    bountyGold: gold,
    bountyXp: xp,
    x: u.x,
  });
  if (gold > 0) addGold(ctx, killerSide, gold, 'bounty', u.x);
  if (xp > 0) addXp(ctx, killerSide, xp, 'kill');
  if (loss > 0) addXp(ctx, u.side, loss, 'loss');

  // On-death effects.
  if (r.riders) {
    const level = cardLevel(ctx, u.side, r.riders.spawn);
    for (let i = 0; i < r.riders.count; i += 1) spawnUnit(ctx, u.side, r.riders.spawn, u.x, level, true);
  }
  if (r.deathExplode) {
    // Balloon Admiral crash (A5.4): splash on ground enemies, exempt from the area rule.
    emit(ctx, { e: 'abilityUsed', id: u.id, ability: 'onDeathExplode', x: u.x });
    const imp = makeImpact(u.side, u.id, u.card);
    imp.sourceKind = 'ability';
    imp.dmgType = 'blast';
    imp.dmg = scaleCenti(r.deathExplode.damage, levelBp(ctx.econ, u.level));
    imp.area = 'blast';
    imp.radius = r.deathExplode.radius;
    imp.hitsGround = true;
    imp.hitsAir = false;
    imp.x = u.x;
    imp.srcX = u.x;
    resolveImpact(ctx, imp);
  }
}
