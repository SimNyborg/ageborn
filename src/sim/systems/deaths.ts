/**
 * B3 step 14, deaths (DESIGN A2.3 Gold, A2.4 XP, A5.1 bounties): bounties, XP, on-death effects
 * (rider summons, explosions) and `died` events. Passes repeat in id order until no new deaths, at most
 * 8 passes, then dead units are compacted out.
 *
 * - Kills by units, turrets and unit abilities pay the killer 50% of the victim's cost in gold and 70%
 *   in XP (A18.3.2-A18.3.3; Bounty Hunters and Forage research add to the gold); kills by powers and
 *   Last Stand pay 30% gold and no XP.
 * - Underdog: +50% gold and XP when the victim's card age is above the killer's current age, unless
 *   the killer's Evolve is available.
 * - The owner gets 50% of the cost in XP. Summoned units pay nothing either way.
 */
import { BP, MILLI } from '@/core';
import { damageBase, makeImpact } from '../damage';
import { emit } from '../events';
import { levelBp, scaleCenti, type UnitRules } from '../rules';
import { ageIdxOf, canEvolve, cardLevel, unitCost, type Ctx, type UnitRt } from '../state';
import { pOf } from '../geometry';
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
  if (u.fort) {
    fortDeath(ctx, u, r);
    return;
  }
  const side = ctx.s.sides[u.side];
  u.mode = 'dying';
  u.hp = 0;
  if (!u.summoned) side.pop -= Math.trunc(r.pop / r.squad);
  const kind = u.lastHitKind;
  const killerSide = u.lastHitSide;
  let gold = 0;
  let xp = 0;
  let loss = 0;
  if (!u.summoned) {
    // A squad member pays its share of the card cost (X0 M1).
    const cost = Math.trunc(unitCost(ctx, u.card) / r.squad);
    loss = Math.trunc((cost * ctx.econ.ownLossXpBp) / BP);
    if (kind !== null && killerSide !== u.side) {
      const byPower = kind === 'power' || kind === 'lastStand';
      // A18.5.4 Bounty Hunters raise the bounty rate; Forage pays more for kills in the killer's own half.
      const kfx = ctx.s.sides[killerSide].fx;
      gold = Math.trunc((cost * (byPower ? ctx.econ.powerKillGoldBp : ctx.econ.bountyGoldBp + kfx.bountyAddBp)) / BP);
      if (!byPower && kfx.forageBp > 0 && pOf(u.x, killerSide) <= ctx.econ.midLane) gold = Math.trunc((gold * (BP + kfx.forageBp)) / BP);
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
  gateFall(ctx, u);

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
    // Death explosions hit forts in their radius with the exploding unit's mods (A16.14.2).
    imp.forts = true;
    resolveImpact(ctx, imp);
  }
}

/**
 * A fort (or a scaffold) falls (A16.14.2, section 2.7): pop freed; the enemy that destroyed it gets 50% of
 * its cost in gold and 70% in XP (Bounty Hunters and Forage apply; +50% for the underdog when the fort's
 * age is above the killer's), the owner no loss XP. A decayed fort (`fortDecayed`) pays only when an enemy
 * hit it in the last 3 s. No death explosion, no falling gate; its camp's levies stay.
 */
function fortDeath(ctx: Ctx, u: UnitRt, r: UnitRules): void {
  const side = ctx.s.sides[u.side];
  const fr = r.fort;
  const f = ctx.econ.fort;
  u.mode = 'dying';
  u.hp = 0;
  side.pop -= r.pop;
  const kind = u.lastHitKind;
  const killerSide = u.lastHitSide;
  const credited = kind !== null && kind !== 'decay' && killerSide !== u.side;
  let gold = 0;
  let xp = 0;
  if (credited && fr && f) {
    const cost = fr.cost * MILLI;
    const kfx = ctx.s.sides[killerSide].fx;
    gold = Math.trunc((cost * (f.bountyGoldBp + kfx.bountyAddBp)) / BP);
    if (kfx.forageBp > 0 && pOf(u.x, killerSide) <= ctx.econ.midLane) gold = Math.trunc((gold * (BP + kfx.forageBp)) / BP);
    xp = Math.trunc((cost * f.bountyXpBp) / BP);
    if (fr.ageIdx > ageIdxOf(ctx, killerSide) && !canEvolve(ctx, killerSide)) {
      gold = Math.trunc((gold * (BP + ctx.econ.underdogBp)) / BP);
      xp = Math.trunc((xp * (BP + ctx.econ.underdogBp)) / BP);
    }
  }
  if (u.decayed) emit(ctx, credited ? { e: 'fortDecayed', id: u.id, creditedTo: killerSide } : { e: 'fortDecayed', id: u.id });
  emit(ctx, {
    e: 'died',
    id: u.id,
    side: u.side,
    card: u.card,
    killerId: credited ? u.lastHitId : null,
    killerCard: credited ? u.lastHitCard : null,
    killerKind: credited ? kind : u.decayed ? 'decay' : kind,
    killerSide: credited ? killerSide : null,
    bountyGold: gold,
    bountyXp: xp,
    x: u.x,
  });
  if (gold > 0) addGold(ctx, killerSide, gold, 'bounty', u.x);
  if (xp > 0) addXp(ctx, killerSide, xp, 'kill');
}

/**
 * The falling gate (A16.4 stall fix, `economy.gateFall`): in Overdrive and Siege, a unit killed by an
 * enemy unit, turret or ability within `gateFall.dist` of its own gate costs its base `hpBp` of its max
 * HP, dealt as base damage by the killer (Siege's base damage applies; the killer earns base-damage
 * XP). Summoned units and power or Last Stand kills never count. Off when `dist` is 0 and in the
 * tutorial format.
 */
function gateFall(ctx: Ctx, u: UnitRt): void {
  const fall = ctx.econ.gateFall;
  if (fall.dist <= 0 || fall.hpBp <= 0 || ctx.cfg.format === 'tutorial') return;
  if (ctx.s.phase !== 'overdrive' && ctx.s.phase !== 'siege') return;
  const kind = u.lastHitKind;
  if (u.summoned || kind === null || kind === 'power' || kind === 'lastStand') return;
  if (u.lastHitSide === u.side || pOf(u.x, u.side) > fall.dist) return;
  const imp = makeImpact(u.lastHitSide, u.lastHitId, u.lastHitCard ?? '');
  damageBase(ctx, u.side, imp, Math.trunc((u.maxHp * fall.hpBp) / BP));
}
