/**
 * The card detail showcase's script (ui-plan 4.4, owner request 2026-10-07: "see the soldier move
 * completely naturally and show off its attacks"): which moves a card shows, where its actors stand
 * and what happens when, as plain data the stage plays. Pure and deterministic over the compiled
 * content, so tests can read a card's whole show without Pixi.
 *
 * Presentation only. The numbers come from the card (the sim wind-up of each attack, projectile
 * speeds, ground speed, the squad size, the summon card, a camp's levy, a power's telegraph), ranges
 * are compressed to fit a small stage, and nothing here ever reaches the sim. The stage turns the
 * beats into the same `SimEvent` shapes a battle emits and runs them through the battle's event
 * mapper, so sparks, sounds, hit-stop and deaths follow `feel.config.json` exactly as in a match.
 *
 * World units are lu; x grows toward the enemy (right), y is 0 on the ground and negative upward.
 */
import type {
  AbilityDef,
  AttackDef,
  CardId,
  CompiledContent,
  DmgType,
  EffectId,
  FortDef,
  FortKind,
  PowerDef,
  ShowcaseMove,
  Side,
  TurretDef,
  UnitDef,
  VisualId,
} from '@/contracts';

// ---------------------------------------------------------------------------------------------
// Actors (their ids double as the unit ids the event mapper sees)

/** The showcased unit; squad members are HERO, HERO + 1, HERO + 2. */
export const HERO = 1;
/** The sparring dummy (the Training Dummy); powers use DUMMY .. DUMMY + 2. */
export const DUMMY = 11;
/** An unseen enemy marksman off the right edge (ranged and air units take their hit from it). */
export const SHOOTER = 15;
/** A summon, a camp's levy or a paradrop; HELPER .. HELPER + 3. */
export const HELPER = 21;
/** Friendly troops a buff power lights up; ALLY .. ALLY + 2. */
export const ALLY = 25;
/** The showcased turret, fort or trap. */
export const STRUCTURE = 31;
/** The enemy turret a Suppress power jams. */
export const FOE_TURRET = 35;
/** The event mapper's id of a turret on side 0's mount 0 (`decodeTurretSource`). */
export const TURRET_SOURCE = -10;

/** The Training Dummy (a hidden Stone card with idle, walk, attack, hit and a KO). */
export const DUMMY_CARD = 'training_dummy';

const TICK_MS = 50;
/** How far a dummy walks in from beyond the right edge, lu (it comes into view at once). */
const ENTER_LU = 80;

// ---------------------------------------------------------------------------------------------
// Plans

/** What the hero's art can show; known once its sheet has loaded (procedural art: A only). */
export interface HeroArt {
  /** Attack variants that have loaded, A first (`attack`, `attack_b`, `attack_c`). */
  attacks: readonly string[];
  /** The sheet has the second attacker's own `attack_alt` clip. */
  alt: boolean;
  /**
   * How far the drawn poses reach from the feet (lu): the hero's idle front (toward the dummy) and back,
   * how far its attack's impact frame reaches, and the dummy's front.
   */
  extent?: { heroFront: number; heroBack: number; heroImpact: number | null; dummyFront: number };
}

/**
 * At rest a weapon held forward may cross the dummy's front by this much (lu); closer reads as a
 * brawl, further as a miss. The blow itself always reaches (see `troopPlan`).
 */
const REST_OVERLAP_LU = 8;

/** One attack as the show plays it. */
export interface AttackShow {
  /** 0 for the body, 1 for a second attacker (riders, sponsons). */
  index: number;
  windupMs: number;
  intervalMs: number;
  dmgType: DmgType;
  /** null: melee. */
  shot: { visualId: VisualId; speed: number; arc: boolean } | { instant: EffectId } | null;
  heavy: boolean;
}

export interface TroopPlan {
  kind: 'troop';
  card: CardId;
  visualId: VisualId;
  /** Squad size (1-3). */
  members: number;
  air: boolean;
  /** null: no attack of its own (a healing drone). */
  attack: AttackShow | null;
  /** Riders and sponsons (`attack_alt`), when the sheet has the clip. */
  alt: AttackShow | null;
  /** The variants the attack moves play, in order. */
  variants: readonly string[];
  /** The one ability the special move shows, if any. */
  ability: AbilityDef | null;
  summon: { card: CardId; attack: AttackShow | null } | null;
  heals: boolean;
  shield: boolean;
  explodes: { radius: number } | null;
  groundSpeed: number;
  sizeLu: number;
  /** Who hits the hero back: the dummy's club (melee ground units) or an enemy shot. */
  foe: { by: 'dummy'; attack: AttackShow } | { by: 'shot'; card: CardId; attack: AttackShow };
  layout: { heroX: number; spawnX: number; dummyX: number; altitude: number; helperX: number; members: { dx: number; dy: number }[] };
  moves: readonly ShowcaseMove[];
}

export interface TurretPlan {
  kind: 'turret';
  card: CardId;
  visualId: VisualId;
  attack: AttackShow;
  layout: { turretX: number; dummyX: number };
  moves: readonly ShowcaseMove[];
}

export interface FortPlan {
  kind: 'fort';
  card: CardId;
  visualId: VisualId;
  fortKind: FortKind;
  /** A tower's shot. */
  attack: AttackShow | null;
  levy: { card: CardId; attack: AttackShow | null } | null;
  trap: { blast: boolean; statusMs: number; status: 'stun' | 'snare' | 'slow' | null } | null;
  layout: { fortX: number; dummyX: number };
  moves: readonly ShowcaseMove[];
}

export interface PowerPlan {
  kind: 'power';
  card: CardId;
  def: PowerDef;
  /** The zone the show plays in (a real zone compressed to the stage), lu. */
  zone: number;
  /** Where the targets stand: dummies, or own troops for a buff. */
  targets: readonly number[];
  allies: { card: CardId } | null;
  /** A drop: who lands (left of the dummy) and how they attack it. */
  paradrop: { card: CardId; count: number; attack: AttackShow | null } | null;
  /** Suppress: the enemy turret it jams (the age's first turret, on the right). */
  foeTurret: { card: CardId; visualId: VisualId; x: number } | null;
  layout: { centerX: number };
  moves: readonly ShowcaseMove[];
}

export type ShowcasePlan = TroopPlan | TurretPlan | FortPlan | PowerPlan;

/** The sim's wind-up: round(interval ticks × pct / 100) ticks (sim/systems/combat.ts). */
export function windupMs(intervalMs: number, pct: number): number {
  const interval = Math.max(1, Math.floor((intervalMs + TICK_MS / 2) / TICK_MS));
  return Math.round((interval * pct) / 100) * TICK_MS;
}

function attackShow(a: AttackDef, index: number, o: { turret?: boolean; heavy?: boolean } = {}): AttackShow {
  const p = a.projectile;
  const pct = a.windupPct ?? (o.turret ? 0 : p ? 50 : 40);
  const shot: AttackShow['shot'] = !p ? null : 'instant' in p ? { instant: p.effectId } : { visualId: p.visualId, speed: Math.max(60, p.speed), arc: p.arc === true };
  return { index, windupMs: windupMs(a.intervalMs, pct), intervalMs: a.intervalMs, dmgType: a.dmgType, shot, heavy: o.heavy === true || a.dmgType === 'blast' };
}

/** Hits that land heavy in the show: Heavy, Legendary and siege bodies, and every blast. */
function heavyBody(u: UnitDef): boolean {
  return u.group === 'heavy' || u.group === 'legendary' || u.role === 'siege' || u.role === 'siegeHeavy' || u.role === 'artillery';
}

/** The specials worth a move of their own, in order of preference. */
const SHOWN_ABILITIES: readonly AbilityDef['kind'][] = ['pounce', 'callStrike', 'timeStop', 'emp', 'periodicShieldAura'];

/** A card's first ranged Common of an age (the unseen marksman's look and sound). */
function marksmanOf(content: CompiledContent, age: string): UnitDef | undefined {
  const all = Object.values(content.units).filter((u) => u.age === age && !u.hidden && !u.summon && !u.levy && u.released !== false);
  const shoots = (u: UnitDef): boolean => {
    const p = u.attacks[0]?.projectile;
    return p !== undefined && !('instant' in p);
  };
  return all.find((u) => u.role === 'ranged' && u.rarity === 'common' && shoots(u)) ?? all.find(shoots);
}

/**
 * A ranged attack stands this far off its target in the show, lu: the real range compressed hard, so
 * the shooter stays big on a phone stage while its shot still crosses open ground.
 */
export function shownRange(range: number): number {
  return Math.min(84, Math.max(56, Math.round(range * 0.3)));
}

/**
 * Shots per attack move: a fast attacker (a gatling, a gunship, a needle gun) fires a short burst at
 * its real rhythm, since one shot of a 300 ms attack reads as a twitch; everything else attacks once.
 */
export function burstOf(a: Pick<AttackShow, 'intervalMs'>): number {
  return a.intervalMs < 700 ? Math.min(5, Math.max(2, Math.round(1500 / Math.max(1, a.intervalMs)))) : 1;
}

/**
 * The show of a unit card. `art` is what the loaded sheet can show (attack variants, `attack_alt`);
 * without it only attack A plays.
 */
export function troopPlan(content: CompiledContent, def: UnitDef, art?: HeroArt): TroopPlan {
  const sizes = content.economy.sizes;
  const sizeLu = sizes[def.size] ?? 24;
  const dummy = content.units[DUMMY_CARD];
  const dummySize = dummy ? (sizes[dummy.size] ?? 24) : 24;
  const a0 = def.attacks[0];
  const heavy = heavyBody(def);
  const attack = a0 ? attackShow(a0, 0, { heavy }) : null;
  const riders = def.abilities.find((a): a is Extract<AbilityDef, { kind: 'riders' }> => a.kind === 'riders');
  const alt = riders && art?.alt ? attackShow(riders.attack, 1) : null;
  const air = def.tags.includes('air');
  const ability = SHOWN_ABILITIES.map((k) => def.abilities.find((a) => a.kind === k)).find((a): a is AbilityDef => a !== undefined) ?? null;
  const sum = def.abilities.find((a): a is Extract<AbilityDef, { kind: 'summon' }> => a.kind === 'summon');
  const sumDef = sum ? content.units[sum.card] : undefined;
  const boom = def.abilities.find((a): a is Extract<AbilityDef, { kind: 'onDeathExplode' }> => a.kind === 'onDeathExplode');
  const groundSpeed = Math.max(30, Math.round((def.speed * (content.economy.marchSpeedBp ?? 10000)) / 10000));
  const melee = a0 !== undefined && !a0.projectile;
  // where the hero fights: a melee unit at its reach (edge to edge, as the sim spaces units), a
  // shooter at its range compressed to the stage
  const reach = a0 ? (melee ? Math.min(70, Math.max(10, a0.range)) : shownRange(a0.range)) : 60;
  // centre to centre: the sim's spacing (half widths plus reach), and never closer than the drawn
  // bodies (sprites are up to 1.4x their collision width) with a little air between them
  const ext = art?.extent;
  // drawn spacing: the idle poses just touching, never so far that the impact frame falls short
  const rest = ext ? ext.heroFront + ext.dummyFront - REST_OVERLAP_LU : 0.95 * (sizeLu * 0.75 + dummySize * 0.85) + 22;
  // a shooter never stands in the dummy (its shot needs a little air), however big its body
  const drawn = !melee && a0 ? (ext ? ext.heroFront + ext.dummyFront + 14 : rest) : ext && ext.heroImpact !== null ? Math.min(rest, ext.heroImpact + ext.dummyFront * 0.5) : rest;
  const heroX = -Math.max(sizeLu / 2 + dummySize / 2 + reach, drawn);
  const walkLu = Math.min(170, Math.max(90, Math.round(groundSpeed * 1.5)));
  const members = def.squad?.count ?? 1;
  const rows = [
    { dx: 0, dy: 0 },
    { dx: -Math.round(sizeLu * 0.55), dy: 12 },
    { dx: -Math.round(sizeLu * 0.95), dy: -12 },
  ];
  // the dummy swings back at melee ground units; ranged, air and long-reach units take an enemy shot
  const dummyAtk = dummy?.attacks[0];
  const marks = marksmanOf(content, def.age);
  const marksAtk = marks?.attacks[0];
  const foe: TroopPlan['foe'] =
    melee && !air && reach <= 30 && dummyAtk
      ? { by: 'dummy', attack: attackShow(dummyAtk, 0) }
      : { by: 'shot', card: marks?.id ?? DUMMY_CARD, attack: marksAtk ? attackShow(marksAtk, 0) : { index: 0, windupMs: 0, intervalMs: 1400, dmgType: 'blunt', shot: { visualId: 'proj.rock', speed: 500, arc: false }, heavy: false } };
  const variants = attack ? (art?.attacks.length ? art.attacks.filter((v) => v === 'attack' || v === 'attack_b' || v === 'attack_c') : ['attack']) : [];
  const plan: TroopPlan = {
    kind: 'troop',
    card: def.id,
    visualId: def.visualId,
    members,
    air,
    attack,
    alt,
    variants: variants.length ? variants : attack ? ['attack'] : [],
    ability,
    summon: sum && sumDef ? { card: sum.card, attack: sumDef.attacks[0] ? attackShow(sumDef.attacks[0], 0) : null } : null,
    heals: def.abilities.some((a) => a.kind === 'heal'),
    shield: def.abilities.some((a) => a.kind === 'innateShield'),
    explodes: boom ? { radius: boom.radius } : null,
    groundSpeed,
    sizeLu,
    foe,
    layout: {
      heroX,
      spawnX: heroX - walkLu,
      dummyX: 0,
      // flyers keep the battle's height above the lane, compressed for the stage
      altitude: air ? 70 : 0,
      helperX: heroX + sizeLu / 2 + 14,
      members: rows.slice(0, members),
    },
    moves: [],
  };
  plan.moves = troopMoves(plan);
  return plan;
}

/** A troop's moves in cycle order: walk in, idle, each attack variant, the specials, a hit, a KO. */
export function troopMoves(p: TroopPlan): ShowcaseMove[] {
  const out: ShowcaseMove[] = ['walk', 'idle'];
  for (const v of p.variants) out.push(v as ShowcaseMove);
  if (p.alt) out.push('attack_alt');
  if (p.ability) out.push('ability');
  if (p.summon) out.push('summon');
  out.push('hit', 'ko');
  return out;
}

export function turretPlan(def: TurretDef): TurretPlan {
  const attack = attackShow(def.attack, 0, { turret: true, heavy: def.attack.dmgType === 'blast' });
  return { kind: 'turret', card: def.id, visualId: def.visualId, attack, layout: { turretX: -100, dummyX: 0 }, moves: ['build', 'idle', 'fire'] };
}

export function fortPlan(content: CompiledContent, def: FortDef): FortPlan {
  const twin = content.units[def.id];
  const shot = def.attack ?? twin?.attacks[0];
  const levyDef = def.camp ? content.units[def.camp.spawn] : undefined;
  const statuses = def.trap?.statuses ?? [];
  const st = statuses.find((s) => s.kind === 'stun' || s.kind === 'snare' || s.kind === 'slow');
  const moves: ShowcaseMove[] =
    def.fortKind === 'wall' ? ['build', 'idle', 'hit', 'ko'] : def.fortKind === 'tower' ? ['build', 'idle', 'fire'] : def.fortKind === 'camp' ? ['build', 'idle', 'spawn'] : ['build', 'idle', 'trigger'];
  return {
    kind: 'fort',
    card: def.id,
    visualId: def.visualId,
    fortKind: def.fortKind,
    attack: def.fortKind === 'tower' && shot ? attackShow(shot, 0) : null,
    levy: def.camp ? { card: def.camp.spawn, attack: levyDef?.attacks[0] ? attackShow(levyDef.attacks[0], 0) : null } : null,
    trap: def.trap ? { blast: def.trap.radius > 0, statusMs: Math.min(1500, st?.durationMs ?? 0), status: st ? (st.kind as 'stun' | 'snare' | 'slow') : null } : null,
    // a tower shoots across a short field, a camp's levy marches a few steps, a wall is clubbed face to face
    layout: { fortX: def.fortKind === 'trap' ? -40 : def.fortKind === 'tower' ? -100 : -120, dummyX: def.fortKind === 'wall' ? -120 + 44 : 0 },
    moves,
  };
}

/** The widest zone a power plays in on the stage, lu (real zones are 160-2,000 lu). */
export const POWER_ZONE_MAX = 180;

export function powerPlan(content: CompiledContent, def: PowerDef): PowerPlan {
  const e = def.effect;
  const real = e.kind === 'barrage' || e.kind === 'sweep' || e.kind === 'field' ? e.zone : e.kind === 'cloud' ? e.width : e.kind === 'stampede' ? e.distance : 200;
  // a strike, a drop and a jammer play on a short field (one target), the rest over a compressed zone
  const single = e.kind === 'strike' || e.kind === 'paradrop' || e.kind === 'suppress';
  const zone = single ? 140 : Math.min(POWER_ZONE_MAX, Math.max(120, real));
  const buff = e.kind === 'buffAll';
  const ally = buff ? Object.values(content.units).find((u) => u.age === def.age && u.role === 'infantry' && u.rarity === 'common' && !u.hidden && u.released !== false) : undefined;
  const drop = e.kind === 'paradrop' ? content.units[e.card] : undefined;
  const turret = e.kind === 'suppress' ? Object.values(content.turrets).find((t) => t.age === def.age && t.released !== false) : undefined;
  const side = Math.round(zone * 0.3);
  const spots = e.kind === 'strike' ? [0] : e.kind === 'suppress' ? [] : drop ? [side] : [-side, 0, side];
  return {
    kind: 'power',
    card: def.id,
    def,
    zone,
    targets: spots,
    allies: ally ? { card: ally.id } : null,
    paradrop: e.kind === 'paradrop' && drop ? { card: drop.id, count: Math.min(3, e.count), attack: drop.attacks[0] ? attackShow(drop.attacks[0], 0) : null } : null,
    foeTurret: turret ? { card: turret.id, visualId: turret.visualId, x: Math.round(zone * 0.18) } : null,
    layout: { centerX: 0 },
    moves: ['idle', 'cast'],
  };
}

/** The show of any card, or null for a card the content does not know. */
export function showcasePlan(content: CompiledContent, card: CardId, art?: HeroArt): ShowcasePlan | null {
  const u = content.units[card];
  const f = content.forts[card];
  if (f) return fortPlan(content, f);
  if (u && !u.fort) return troopPlan(content, u, art);
  const t = content.turrets[card];
  if (t) return turretPlan(t);
  const p = content.powers[card];
  if (p) return powerPlan(content, p);
  return null;
}

/** The visuals a plan draws (the stage leases their sheets before it goes live). */
export function planVisuals(content: CompiledContent, plan: ShowcasePlan): VisualId[] {
  const v = (card: CardId | undefined): VisualId | undefined => (card ? (content.units[card]?.visualId ?? undefined) : undefined);
  const out: (VisualId | undefined)[] = [v(DUMMY_CARD)];
  if (plan.kind === 'troop') out.push(plan.visualId, v(plan.summon?.card));
  else if (plan.kind === 'turret') out.push(plan.visualId);
  else if (plan.kind === 'fort') out.push(plan.visualId, v(plan.levy?.card));
  else out.push(v(plan.allies?.card), v(plan.paradrop?.card), plan.foeTurret?.visualId);
  return [...new Set(out.filter((x): x is VisualId => typeof x === 'string'))];
}

// ---------------------------------------------------------------------------------------------
// Beats

export type KillerKindLike = 'unit' | 'turret' | 'power' | 'ability';

/** One timed step of a move. `at` is ms from the move's start. */
export type Beat =
  | { at: number; k: 'spawn'; id: number; card: CardId; side: Side; x: number; y?: number; pop: boolean; summoner?: number; from?: number }
  /** Fades an actor out with a dust poof (a summon or levy leaving). */
  | { at: number; k: 'vanish'; id: number }
  | { at: number; k: 'walk'; id: number; toX: number; speed: number }
  | { at: number; k: 'dash'; id: number; toX: number; ms: number; lift: number }
  | { at: number; k: 'attack'; id: number; target: number; windupMs: number; index: number; variant?: string }
  | { at: number; k: 'shot'; from: number; target: number; index: number; visualId: string; travelMs: number; arc: boolean }
  | { at: number; k: 'hit'; target: number; source: number; card: CardId; dmgType: DmgType; heavy: boolean; by: KillerKindLike; castId?: number }
  | { at: number; k: 'die'; id: number; killer: number | null }
  | { at: number; k: 'ability'; id: number; ability: AbilityDef['kind']; x?: number }
  | { at: number; k: 'heal'; id: number }
  | { at: number; k: 'status'; id: number; status: 'stun' | 'snare' | 'slow' | 'shield'; ms: number; frozen: boolean }
  /** The shield bubble of `UnitPose.shieldBp` (innate shields, shield auras). */
  | { at: number; k: 'shield'; id: number; bp: number }
  | { at: number; k: 'turret'; op: 'build' | 'built' | 'fire'; target?: number }
  | { at: number; k: 'fort'; op: 'place' | 'built' | 'hp'; hpBp?: number; scaffoldMs?: number }
  | { at: number; k: 'trap'; op: 'armed' | 'trigger' | 'spent' }
  | { at: number; k: 'power'; op: 'telegraph'; x: number; zone: number; ms: number; target?: number }
  | { at: number; k: 'power'; op: 'impact'; x: number; index: number }
  /** Suppress's enemy turret: dropped onto its spot, or jammed for `ms`. */
  | { at: number; k: 'foeTurret'; op: 'place' | 'silence'; ms?: number };

export interface MoveScript {
  move: ShowcaseMove;
  beats: Beat[];
  /** When the move is over and the next may start, ms. */
  ms: number;
}

/** What the stage knows when a move starts. */
export interface MoveContext {
  /** The very first move after the stage went live (a longer idle). */
  first?: boolean;
  /** Hits the current dummy has taken (turrets and towers knock it out on the third volley). */
  dummyHits?: number;
  /** Blows the standing wall has taken (each knocks a crumble stage off). */
  structureHits?: number;
}

/** Projectile flight time, ms (the sim's travel at the projectile's speed over the stage distance). */
export function flightMs(distLu: number, speed: number): number {
  return Math.max(TICK_MS, Math.round((Math.abs(distLu) / Math.max(1, speed)) * 1000));
}

/** Recovery after an impact before the next move, ms (the follow-through, at most the attack's rhythm). */
function recoverMs(a: AttackShow): number {
  return Math.min(900, Math.max(420, a.intervalMs - a.windupMs));
}

/** The beats of one attack from `from` at `target` (distance `dist` lu), starting at `t0`. */
function attackBeats(a: AttackShow, from: number, target: number, card: CardId, dist: number, t0: number, o: { variant?: string; by?: KillerKindLike; skipStart?: boolean } = {}): { beats: Beat[]; impact: number; end: number } {
  const beats: Beat[] = [];
  if (!o.skipStart) beats.push({ at: t0, k: 'attack', id: from, target, windupMs: a.windupMs, index: a.index, ...(o.variant ? { variant: o.variant } : {}) });
  const fire = t0 + a.windupMs;
  let impact = fire;
  if (a.shot) {
    const travel = 'instant' in a.shot ? TICK_MS : flightMs(dist, a.shot.speed);
    const visualId = 'instant' in a.shot ? a.shot.instant : a.shot.visualId;
    beats.push({ at: fire, k: 'shot', from, target, index: a.index, visualId, travelMs: travel, arc: 'instant' in a.shot ? false : a.shot.arc });
    impact = fire + travel;
  }
  beats.push({ at: impact, k: 'hit', target, source: from, card, dmgType: a.dmgType, heavy: a.heavy, by: o.by ?? 'unit' });
  return { beats, impact, end: impact + recoverMs(a) };
}

/** Squad members' ids. */
export function memberIds(p: TroopPlan): number[] {
  return Array.from({ length: p.members }, (_, i) => HERO + i);
}

/** Where a member stands at the fight position (x, y). */
export function memberSpot(p: TroopPlan, i: number): { x: number; y: number } {
  const r = p.layout.members[i] ?? { dx: 0, dy: 0 };
  return { x: p.layout.heroX + r.dx, y: r.dy - p.layout.altitude };
}

const STAGGER_MS = 110;

function troopMove(p: TroopPlan, move: ShowcaseMove, ctx: MoveContext): MoveScript {
  const ids = memberIds(p);
  const beats: Beat[] = [];
  let ms = 0;
  const dist = Math.abs(p.layout.dummyX - p.layout.heroX);
  switch (move) {
    case 'idle':
      return { move, beats, ms: ctx.first ? 1700 : 1000 };
    case 'walk': {
      // the next soldier arrives as in a battle: the spawn pop off to the left, then the walk in
      ids.forEach((id, i) => {
        const at = memberSpot(p, i);
        const t = i * 90;
        beats.push({ at: t, k: 'spawn', id, card: p.card, side: 0, x: p.layout.spawnX + (at.x - p.layout.heroX), y: at.y, pop: true });
        if (p.shield) beats.push({ at: t, k: 'shield', id, bp: 10000 });
        beats.push({ at: t + 160, k: 'walk', id, toX: at.x, speed: p.groundSpeed });
      });
      const walkMs = flightMs(p.layout.heroX - p.layout.spawnX, p.groundSpeed);
      return { move, beats, ms: (ids.length - 1) * 90 + 160 + walkMs + 380 };
    }
    case 'attack':
    case 'attack_b':
    case 'attack_c': {
      const a = p.attack;
      if (!a) return { move, beats, ms: 600 };
      const n = burstOf(a);
      ids.forEach((id, i) => {
        for (let k = 0; k < n; k++) {
          const r = attackBeats(a, id, DUMMY, p.card, dist - (p.layout.members[i]?.dx ?? 0), i * STAGGER_MS + k * a.intervalMs, { variant: move });
          beats.push(...r.beats);
          ms = Math.max(ms, r.end);
        }
      });
      return { move, beats, ms: ms + 180 };
    }
    case 'attack_alt': {
      const a = p.alt;
      if (!a) return { move, beats, ms: 400 };
      const n = burstOf(a);
      for (let k = 0; k < n; k++) {
        const r = attackBeats(a, HERO, DUMMY, p.card, dist, k * a.intervalMs);
        beats.push(...r.beats);
        ms = Math.max(ms, r.end);
      }
      return { move, beats, ms: ms + 200 };
    }
    case 'ability':
      return abilityMove(p, ctx, dist);
    case 'summon': {
      const s = p.summon;
      if (!s) return { move, beats, ms: 400 };
      const x = p.layout.helperX;
      beats.push({ at: 0, k: 'spawn', id: HELPER, card: s.card, side: 0, x, y: 10, pop: true, summoner: HERO });
      let t = 520;
      if (s.attack) {
        const r = attackBeats(s.attack, HELPER, DUMMY, s.card, Math.abs(p.layout.dummyX - x), t);
        beats.push(...r.beats);
        t = r.impact + 520;
      }
      beats.push({ at: t, k: 'vanish', id: HELPER });
      return { move, beats, ms: t + 450 };
    }
    case 'hit': {
      const f = foeBeats(p, ids[0] ?? HERO, false, 0);
      beats.push(...f.beats);
      ms = f.impact + 650;
      if (p.shield) beats.push({ at: f.impact, k: 'shield', id: ids[0] ?? HERO, bp: 0 });
      if (p.heals) {
        beats.push({ at: f.impact + 520, k: 'heal', id: ids[0] ?? HERO });
        ms = f.impact + 1250;
      }
      return { move, beats, ms };
    }
    case 'ko': {
      const f = foeBeats(p, ids[0] ?? HERO, true, 0);
      beats.push(...f.beats);
      ids.forEach((id, i) => {
        if (p.shield) beats.push({ at: f.impact, k: 'shield', id, bp: 0 });
        if (i > 0) beats.push({ at: f.impact + i * 120, k: 'hit', target: id, source: f.source, card: f.card, dmgType: f.dmg, heavy: true, by: 'unit' });
        beats.push({ at: f.impact + i * 120 + 1, k: 'die', id, killer: f.source });
      });
      let end = f.impact + (ids.length - 1) * 120 + 1500;
      if (p.explodes) {
        beats.push({ at: f.impact + 180, k: 'ability', id: HERO, ability: 'onDeathExplode', x: p.layout.heroX });
        if (Math.abs(p.layout.dummyX - p.layout.heroX) <= p.explodes.radius + 40) {
          beats.push({ at: f.impact + 200, k: 'hit', target: DUMMY, source: HERO, card: p.card, dmgType: 'blast', heavy: true, by: 'ability' });
        }
        end += 300;
      }
      return { move, beats, ms: end };
    }
    default:
      return { move, beats, ms: 500 };
  }
}

/** The hero's hit (or KO): the dummy's club for melee units, an unseen marksman's shot otherwise. */
function foeBeats(p: TroopPlan, target: number, heavy: boolean, t0: number): { beats: Beat[]; impact: number; source: number; card: CardId; dmg: DmgType } {
  if (p.foe.by === 'dummy') {
    const a = { ...p.foe.attack, heavy };
    const r = attackBeats(a, DUMMY, target, DUMMY_CARD, 0, t0);
    return { beats: r.beats, impact: r.impact, source: DUMMY, card: DUMMY_CARD, dmg: a.dmgType };
  }
  const a = p.foe.attack;
  const shot = a.shot && !('instant' in a.shot) ? a.shot : { visualId: 'proj.rock', speed: 500, arc: false };
  // the marksman stands beyond the right edge; its shot crosses the stage
  const travel = flightMs(ENTER_LU + Math.abs(p.layout.heroX), shot.speed);
  const beats: Beat[] = [
    { at: t0, k: 'shot', from: SHOOTER, target, index: 0, visualId: shot.visualId, travelMs: travel, arc: shot.arc },
    { at: t0 + travel, k: 'hit', target, source: SHOOTER, card: p.foe.card, dmgType: a.dmgType, heavy, by: 'unit' },
  ];
  return { beats, impact: t0 + travel, source: SHOOTER, card: p.foe.card, dmg: a.dmgType };
}

function abilityMove(p: TroopPlan, _ctx: MoveContext, dist: number): MoveScript {
  const ab = p.ability;
  const beats: Beat[] = [];
  if (!ab) return { move: 'ability', beats, ms: 400 };
  switch (ab.kind) {
    case 'pounce': {
      // a step back, then the leap onto the dummy and the first bite (heavy)
      const back = p.layout.heroX - 60;
      beats.push({ at: 0, k: 'walk', id: HERO, toX: back, speed: p.groundSpeed });
      const t = flightMs(60, p.groundSpeed) + 160;
      const leap = Math.min(700, Math.max(250, ab.leapMs));
      beats.push({ at: t, k: 'ability', id: HERO, ability: 'pounce', x: back });
      beats.push({ at: t, k: 'dash', id: HERO, toX: p.layout.heroX, ms: leap, lift: 26 });
      beats.push({ at: t + leap, k: 'hit', target: DUMMY, source: HERO, card: p.card, dmgType: p.attack?.dmgType ?? 'slash', heavy: true, by: 'unit' });
      return { move: 'ability', beats, ms: t + leap + 800 };
    }
    case 'callStrike': {
      const delay = Math.min(1400, Math.max(500, ab.delayMs));
      beats.push({ at: 0, k: 'ability', id: HERO, ability: 'callStrike', x: p.layout.dummyX });
      beats.push({ at: delay, k: 'hit', target: DUMMY, source: HERO, card: p.card, dmgType: 'blast', heavy: true, by: 'ability' });
      return { move: 'ability', beats, ms: delay + 900 };
    }
    case 'timeStop':
    case 'emp': {
      const frozen = ab.kind === 'timeStop' ? ab.frozen !== false : false;
      const stun = Math.min(1600, ab.kind === 'timeStop' ? ab.freezeMs : ab.stunMs);
      beats.push({ at: 0, k: 'ability', id: HERO, ability: ab.kind });
      if (dist <= ab.radius + 80) beats.push({ at: 120, k: 'status', id: DUMMY, status: 'stun', ms: stun, frozen });
      return { move: 'ability', beats, ms: 120 + stun + 400 };
    }
    case 'periodicShieldAura': {
      beats.push({ at: 0, k: 'ability', id: HERO, ability: 'periodicShieldAura' });
      beats.push({ at: 80, k: 'status', id: HERO, status: 'shield', ms: 1400, frozen: false });
      beats.push({ at: 80, k: 'shield', id: HERO, bp: 10000 });
      beats.push({ at: 1500, k: 'shield', id: HERO, bp: 0 });
      return { move: 'ability', beats, ms: 1900 };
    }
    default:
      return { move: 'ability', beats, ms: 400 };
  }
}

function turretMove(p: TurretPlan, move: ShowcaseMove, ctx: MoveContext): MoveScript {
  const beats: Beat[] = [];
  switch (move) {
    case 'build':
      beats.push({ at: 0, k: 'turret', op: 'build' }, { at: 1000, k: 'turret', op: 'built' });
      return { move, beats, ms: 1500 };
    case 'idle': {
      // a dummy marches in from beyond the right edge; the turret tracks it
      const from = p.layout.dummyX + ENTER_LU;
      beats.push({ at: 0, k: 'spawn', id: DUMMY, card: DUMMY_CARD, side: 1, x: from, pop: false });
      beats.push({ at: 60, k: 'walk', id: DUMMY, toX: p.layout.dummyX, speed: 62 });
      return { move, beats, ms: 60 + flightMs(ENTER_LU, 62) + (ctx.first ? 700 : 300) };
    }
    case 'fire': {
      // one shot (a burst for a fast gun) at the real rhythm; the third volley knocks the dummy out
      const a = p.attack;
      const n = burstOf(a);
      const dist = Math.abs(p.layout.dummyX - p.layout.turretX);
      const travel = !a.shot ? 0 : 'instant' in a.shot ? TICK_MS : flightMs(dist, a.shot.speed);
      for (let k = 0; k < n; k++) {
        const t = k * a.intervalMs;
        beats.push({ at: t, k: 'turret', op: 'fire', target: DUMMY });
        if (a.shot) beats.push({ at: t, k: 'shot', from: TURRET_SOURCE, target: DUMMY, index: 0, visualId: 'instant' in a.shot ? a.shot.instant : a.shot.visualId, travelMs: travel, arc: 'instant' in a.shot ? false : a.shot.arc });
        beats.push({ at: t + travel, k: 'hit', target: DUMMY, source: TURRET_SOURCE, card: p.card, dmgType: a.dmgType, heavy: a.heavy, by: 'turret' });
      }
      const last = (n - 1) * a.intervalMs + travel;
      const ko = Math.floor((ctx.dummyHits ?? 0) / n) + 1 >= 3;
      if (ko) beats.push({ at: last + 1, k: 'die', id: DUMMY, killer: TURRET_SOURCE });
      return { move, beats, ms: Math.max(last + (ko ? 1300 : 450), (n - 1) * a.intervalMs + Math.min(1800, Math.max(650, a.intervalMs))) };
    }
    default:
      return { move, beats, ms: 500 };
  }
}

function fortMove(p: FortPlan, move: ShowcaseMove, ctx: MoveContext): MoveScript {
  const beats: Beat[] = [];
  const enter = (stopX: number, speed = 62): number => {
    beats.push({ at: 0, k: 'spawn', id: DUMMY, card: DUMMY_CARD, side: 1, x: stopX + ENTER_LU, pop: false });
    beats.push({ at: 60, k: 'walk', id: DUMMY, toX: stopX, speed });
    return 60 + flightMs(ENTER_LU, speed);
  };
  switch (move) {
    case 'build': {
      if (p.fortKind === 'trap') {
        beats.push({ at: 0, k: 'fort', op: 'place', scaffoldMs: 900 }, { at: 900, k: 'trap', op: 'armed' });
        return { move, beats, ms: 1500 };
      }
      beats.push({ at: 0, k: 'fort', op: 'place', scaffoldMs: 1100 }, { at: 1100, k: 'fort', op: 'built' });
      // a dummy still at a fallen wall backs off while it rises again (the idle brings it back)
      if (p.fortKind === 'wall') beats.push({ at: 0, k: 'walk', id: DUMMY, toX: p.layout.dummyX + 44, speed: 80 });
      return { move, beats, ms: 1900 };
    }
    case 'idle': {
      if (p.fortKind === 'trap') {
        // the dummy walks in onto the trap; the trigger move springs it
        return { move, beats, ms: enter(p.layout.fortX + 4) + 120 };
      }
      const t = enter(p.layout.dummyX);
      return { move, beats, ms: t + (ctx.first ? 600 : 250) };
    }
    case 'hit': {
      // the dummy clubs the wall; each blow knocks a crumble stage off (66%, 33%)
      const d = ctx.structureHits ?? 0;
      beats.push({ at: 0, k: 'attack', id: DUMMY, target: STRUCTURE, windupMs: 400, index: 0 });
      beats.push({ at: 400, k: 'hit', target: STRUCTURE, source: DUMMY, card: DUMMY_CARD, dmgType: 'blunt', heavy: false, by: 'unit' });
      beats.push({ at: 400, k: 'fort', op: 'hp', hpBp: Math.max(1500, 6000 - d * 3000) });
      return { move, beats, ms: 1150 };
    }
    case 'ko': {
      beats.push({ at: 0, k: 'attack', id: DUMMY, target: STRUCTURE, windupMs: 400, index: 0 });
      beats.push({ at: 400, k: 'hit', target: STRUCTURE, source: DUMMY, card: DUMMY_CARD, dmgType: 'blunt', heavy: true, by: 'unit' });
      beats.push({ at: 401, k: 'die', id: STRUCTURE, killer: DUMMY });
      return { move, beats, ms: 2300 };
    }
    case 'fire': {
      const a = p.attack;
      if (!a) return { move, beats, ms: 500 };
      const dist = Math.abs(p.layout.dummyX - p.layout.fortX);
      const n = burstOf(a);
      let impact = 0;
      for (let k = 0; k < n; k++) {
        const r = attackBeats(a, STRUCTURE, DUMMY, p.card, dist, k * a.intervalMs);
        beats.push(...r.beats);
        impact = r.impact;
      }
      const ko = Math.floor((ctx.dummyHits ?? 0) / n) + 1 >= 3;
      if (ko) beats.push({ at: impact + 1, k: 'die', id: DUMMY, killer: STRUCTURE });
      return { move, beats, ms: Math.max(impact + (ko ? 1300 : 500), (n - 1) * a.intervalMs + Math.min(1800, Math.max(700, a.intervalMs))) };
    }
    case 'spawn': {
      // the camp's door opens and a levy marches out to meet the dummy
      const lv = p.levy;
      if (!lv) return { move, beats, ms: 500 };
      const x0 = p.layout.fortX + 30;
      beats.push({ at: 0, k: 'spawn', id: HELPER, card: lv.card, side: 0, x: x0, y: 8, pop: true, from: STRUCTURE });
      const meet = p.layout.dummyX - 40;
      beats.push({ at: 300, k: 'walk', id: HELPER, toX: meet, speed: 80 });
      let t = 300 + flightMs(meet - x0, 80) + 150;
      if (lv.attack) {
        for (let i = 0; i < 2; i++) {
          const r = attackBeats(lv.attack, HELPER, DUMMY, lv.card, 40, t);
          beats.push(...r.beats);
          t = r.end;
        }
        beats.push({ at: t - recoverMs(lv.attack) + 1, k: 'die', id: DUMMY, killer: HELPER });
      }
      beats.push({ at: t + 500, k: 'vanish', id: HELPER });
      return { move, beats, ms: t + 950 };
    }
    case 'trigger': {
      const tr = p.trap;
      beats.push({ at: 0, k: 'trap', op: 'trigger' });
      beats.push({ at: 0, k: 'hit', target: DUMMY, source: STRUCTURE, card: p.card, dmgType: tr?.blast ? 'blast' : 'pierce', heavy: tr?.blast === true, by: 'unit' });
      if (tr?.status && !tr.blast) beats.push({ at: 10, k: 'status', id: DUMMY, status: tr.status, ms: Math.max(600, tr.statusMs), frozen: false });
      beats.push({ at: 600, k: 'trap', op: 'spent' });
      beats.push({ at: tr?.blast ? 1 : 700, k: 'die', id: DUMMY, killer: STRUCTURE });
      return { move, beats, ms: 2100 };
    }
    default:
      return { move, beats, ms: 500 };
  }
}

function powerMove(p: PowerPlan, move: ShowcaseMove, ctx: MoveContext): MoveScript {
  const beats: Beat[] = [];
  const def = p.def;
  const e = def.effect;
  const c = p.layout.centerX;
  const buff = e.kind === 'buffAll';
  const ids = p.targets.map((_, i) => (buff ? ALLY : DUMMY) + i);
  if (move === 'idle') {
    // the targets take their places: dummies march in from the right, own troops from the left
    p.targets.forEach((x, i) => {
      const id = ids[i] ?? DUMMY;
      const from = buff ? c - ENTER_LU - 60 + x : c + ENTER_LU + x;
      beats.push({ at: i * 140, k: 'spawn', id, card: buff ? (p.allies?.card ?? DUMMY_CARD) : DUMMY_CARD, side: buff ? 0 : 1, x: from, pop: false });
      beats.push({ at: i * 140 + 40, k: 'walk', id, toX: c + x, speed: buff ? 85 : 70 });
    });
    // a jammer's target: an enemy turret drops onto its spot
    if (p.foeTurret) beats.push({ at: 0, k: 'foeTurret', op: 'place' });
    const walk = p.targets.length ? (p.targets.length - 1) * 140 + 40 + flightMs(buff ? ENTER_LU + 60 : ENTER_LU, buff ? 85 : 70) : 1100;
    return { move, beats, ms: walk + (ctx.first ? 500 : 250) };
  }
  if (move !== 'cast') return { move, beats, ms: 400 };
  const tele = Math.min(1500, Math.max(600, def.telegraphMs));
  const strikeTarget = e.kind === 'strike' ? ids[0] : undefined;
  // a drop marks its landing ground; strikes, buffs and jammers mark their targets instead of a zone
  const dropX = c - Math.round(p.zone * 0.28);
  const teleX = e.kind === 'paradrop' ? dropX : c;
  const teleZone = e.kind === 'paradrop' ? 70 : e.kind === 'strike' || e.kind === 'buffAll' || e.kind === 'suppress' ? 0 : p.zone;
  beats.push({ at: 0, k: 'power', op: 'telegraph', x: teleX, zone: teleZone, ms: tele, ...(strikeTarget !== undefined ? { target: strikeTarget } : {}) });
  let end = tele;
  const hitAll = (at: number, heavy: boolean, xs?: number[]): void => {
    ids.forEach((id, i) => {
      const x = c + (p.targets[i] ?? 0);
      if (xs && !xs.some((ix) => Math.abs(ix - x) <= 40)) return;
      beats.push({ at, k: 'hit', target: id, source: -1, card: p.card, dmgType: 'blast', heavy, by: 'power', castId: 1 });
    });
  };
  const koAll = (at: number): void => ids.forEach((id, i) => beats.push({ at: at + i * 90 + 1, k: 'die', id, killer: -1 }));
  switch (e.kind) {
    case 'barrage': {
      const n = Math.min(10, Math.max(3, Math.round((e.count * p.zone) / Math.max(1, e.zone))));
      const span = Math.min(1800, Math.max(500, e.durationMs));
      for (let i = 0; i < n; i++) {
        const x = c - p.zone / 2 + ((i + 0.5) * p.zone) / n;
        const at = tele + Math.floor((i * span) / n);
        beats.push({ at, k: 'power', op: 'impact', x, index: i });
        hitAll(at, false, [x]);
      }
      end = tele + span;
      koAll(end);
      end += 1400;
      break;
    }
    case 'sweep': {
      const span = Math.min(1600, Math.max(600, e.durationMs));
      beats.push({ at: tele, k: 'power', op: 'impact', x: c, index: 0 });
      ids.forEach((id, i) => {
        const at = tele + Math.floor((((p.targets[i] ?? 0) + p.zone / 2) / p.zone) * span);
        beats.push({ at, k: 'hit', target: id, source: -1, card: p.card, dmgType: 'blast', heavy: false, by: 'power', castId: 1 });
      });
      end = tele + span;
      koAll(end);
      end += 1400;
      break;
    }
    case 'stampede': {
      const runners = Math.min(3, e.runners);
      const gap = Math.min(500, e.spacingMs);
      for (let r = 0; r < runners; r++) beats.push({ at: tele + r * gap, k: 'power', op: 'impact', x: c - p.zone / 2, index: r });
      ids.forEach((id, i) => {
        const at = tele + flightMs((p.targets[i] ?? 0) + p.zone / 2, e.speed);
        beats.push({ at, k: 'hit', target: id, source: -1, card: p.card, dmgType: 'blunt', heavy: true, by: 'power', castId: 1 });
      });
      end = tele + flightMs(p.zone, e.speed) + (runners - 1) * gap;
      koAll(end);
      end += 1400;
      break;
    }
    case 'field': {
      beats.push({ at: tele, k: 'power', op: 'impact', x: c, index: 0 });
      const dmg = (e.damagePerPulse ?? 0) > 0;
      const st = e.statuses?.find((s) => s.kind === 'stun' || s.kind === 'snare' || s.kind === 'slow');
      ids.forEach((id) => {
        if (dmg) beats.push({ at: tele + 30, k: 'hit', target: id, source: -1, card: p.card, dmgType: 'blast', heavy: false, by: 'power', castId: 1 });
        if (st) beats.push({ at: tele + 40, k: 'status', id, status: st.kind as 'stun' | 'snare' | 'slow', ms: Math.min(1800, st.durationMs), frozen: st.frozen === true });
      });
      end = tele + Math.min(1800, Math.max(900, e.durationMs || 900));
      if (dmg && !st) koAll(tele + 400);
      end += 900;
      break;
    }
    case 'strike': {
      const shots = Math.min(3, Math.max(1, e.shots));
      for (let i = 0; i < shots; i++) {
        const at = tele + i * Math.max(200, e.intervalMs);
        beats.push({ at, k: 'power', op: 'impact', x: c, index: i });
        if (strikeTarget !== undefined) beats.push({ at, k: 'hit', target: strikeTarget, source: -1, card: p.card, dmgType: 'pierce', heavy: true, by: 'power', castId: 1 });
      }
      end = tele + (shots - 1) * Math.max(200, e.intervalMs);
      if (strikeTarget !== undefined) beats.push({ at: end + 1, k: 'die', id: strikeTarget, killer: -1 });
      end += 1500;
      break;
    }
    case 'suppress': {
      // the burst at the enemy turret, then it is jammed for a while (no shots, sparks over it)
      const x = c + (p.foeTurret?.x ?? 0);
      const ms = Math.min(2200, Math.max(1200, e.durationMs));
      beats.push({ at: tele, k: 'power', op: 'impact', x, index: 0 });
      beats.push({ at: tele + 150, k: 'foeTurret', op: 'silence', ms });
      end = tele + 150 + ms + 500;
      break;
    }
    case 'buffAll':
    case 'cloud': {
      beats.push({ at: tele, k: 'power', op: 'impact', x: c, index: 0 });
      end = tele + 2200;
      break;
    }
    case 'paradrop': {
      // the troops float down left of the dummy, land, and take it on (a shot, or a few steps and a blow)
      const pd = p.paradrop;
      const dummyX = c + (p.targets[0] ?? 0);
      beats.push({ at: tele, k: 'power', op: 'impact', x: dropX, index: 0 });
      end = tele + 2900;
      if (pd) {
        let last = 0;
        for (let i = 0; i < pd.count; i++) {
          const id = HELPER + i;
          const x = dropX + Math.round((i - (pd.count - 1) / 2) * 30);
          const landed = tele + 450 + i * 160;
          beats.push({ at: landed, k: 'spawn', id, card: pd.card, side: 0, x, y: i % 2 === 0 ? 6 : -6, pop: true });
          const a = pd.attack;
          if (!a || ids[0] === undefined) continue;
          let t = landed + 520;
          let from = x;
          if (!a.shot) {
            from = dummyX - 30 - i * 8;
            beats.push({ at: t, k: 'walk', id, toX: from, speed: 90 });
            t += flightMs(from - x, 90) + 80;
          }
          const r = attackBeats(a, id, ids[0], pd.card, Math.abs(dummyX - from), t);
          beats.push(...r.beats);
          last = Math.max(last, r.impact);
        }
        if (last > 0 && ids[0] !== undefined) beats.push({ at: last + 1, k: 'die', id: ids[0], killer: HELPER });
        end = Math.max(end, last + 900);
        for (let i = 0; i < pd.count; i++) beats.push({ at: end + i * 80, k: 'vanish', id: HELPER + i });
        end += pd.count * 80 + 450;
      }
      break;
    }
  }
  return { move, beats: beats.sort((a, b) => a.at - b.at), ms: end };
}

/** The beats of one move of a plan. */
export function moveScript(plan: ShowcasePlan, move: ShowcaseMove, ctx: MoveContext = {}): MoveScript {
  const s = plan.kind === 'troop' ? troopMove(plan, move, ctx) : plan.kind === 'turret' ? turretMove(plan, move, ctx) : plan.kind === 'fort' ? fortMove(plan, move, ctx) : powerMove(plan, move, ctx);
  return { ...s, beats: [...s.beats].sort((a, b) => a.at - b.at) };
}

/**
 * The show loop: the order moves play in by themselves. A troop idles, attacks with every variant,
 * shows its specials, takes a hit, is knocked out and the next one walks in; a turret or tower fires
 * at a dummy marching in until the third shot drops it; a wall takes blows until it falls and is
 * rebuilt; a camp sends out its levy; a trap is set and sprung; a power is cast on a few dummies.
 */
export function autoLoop(plan: ShowcasePlan): ShowcaseMove[] {
  switch (plan.kind) {
    case 'troop': {
      const m = plan.moves;
      const i = m.indexOf('idle');
      return [...m.slice(i), ...m.slice(0, i)];
    }
    case 'turret':
      return ['idle', 'fire', 'fire', 'fire'];
    case 'fort':
      if (plan.fortKind === 'wall') return ['idle', 'hit', 'hit', 'ko', 'build'];
      if (plan.fortKind === 'tower') return ['idle', 'fire', 'fire', 'fire'];
      if (plan.fortKind === 'camp') return ['idle', 'spawn'];
      return ['idle', 'trigger', 'build'];
    case 'power':
      return ['idle', 'cast'];
  }
}

/** The move that opens the show when the live stage first appears (the arrival). */
export function arrivalMove(plan: ShowcasePlan): ShowcaseMove {
  return plan.kind === 'troop' ? 'idle' : plan.kind === 'power' ? 'idle' : 'build';
}

/** 1-based number of an attack variant among the plan's variants, and how many there are. */
export function variantIndex(plan: ShowcasePlan, move: ShowcaseMove): { index: number; of: number } {
  if (plan.kind !== 'troop') return { index: 0, of: 0 };
  const i = plan.variants.indexOf(move);
  return i < 0 ? { index: 0, of: 0 } : { index: i + 1, of: plan.variants.length };
}
