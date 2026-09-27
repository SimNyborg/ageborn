/**
 * The event mapper (DESIGN B6 Event mapper, A12, A14.2): turns the sim's `SimEvent`s into primitive
 * view actions using the `feel.config.json` rules: clips, flashes, hitstop, trauma, particles,
 * numbers, sounds and music. It is pure apart from a little per-match memory (crumble stage, evolve
 * count, cosmetic RNG), so the whole A12 table is testable without Pixi.
 *
 * Settings (hitstop off, reduce motion, shake slider, damage-number mode) are applied by the view when
 * it executes the actions, so the mapper output does not depend on them.
 */
import type { AttackDef, CardId, CompiledContent, DmgType, EffectId, SimEvent, Side, SoundId, UnitDef } from '@/contracts';
import type { CosmeticRng } from '@/core';
import { feelRule, type FeelRuleExt, type RenderFeelConfig } from './feelConfig';
import { BASE_DEPTH_LU, LANE_LU, MILLI_LU, gateX } from './layout';
import { BACKDROP_WIPE_MS } from './seam';
import type { Anchor, ViewAction } from './types';

/** What the mapper needs to know about a live unit. */
export interface UnitInfo {
  side: Side;
  card: CardId;
  /** World x in lu. */
  x: number;
}

/** Turret source ids (WP2 convention, docs/decisions.md WP2 "source ids"): -10 - (side × 4 + mount). */
export const TURRET_SOURCE_BASE = -10;
export const POWER_SOURCE_ID = -1;
export const LAST_STAND_SOURCE_ID = -2;

export function decodeTurretSource(id: number): { side: Side; mount: number } | null {
  if (id > TURRET_SOURCE_BASE) return null;
  const k = TURRET_SOURCE_BASE - id;
  const side = Math.floor(k / 4);
  if (side !== 0 && side !== 1) return null;
  return { side, mount: k % 4 };
}

/** Hit spark by damage type (A14.1). */
export const SPARK_BY_DMG: Record<DmgType, EffectId> = {
  blunt: 'fx.spark_blunt',
  slash: 'fx.spark_slash',
  pierce: 'fx.spark_pierce',
  bullet: 'fx.spark_bullet',
  laser: 'fx.scorch_laser',
  blast: 'fx.blast',
};

/** A modifier at or above ×1.5 is "effective", at or below ×0.75 "resisted" (A11 Counter feedback). */
export const EFFECTIVE_BP = 15000;
export const RESISTED_BP = 7500;

export function sparkFor(dmg: DmgType, modBp: number): EffectId {
  if (modBp >= EFFECTIVE_BP) return 'fx.spark_effective';
  if (modBp <= RESISTED_BP) return 'fx.puff_resisted';
  return SPARK_BY_DMG[dmg];
}

/** Hit sound: `hit_<dmgType>`, `explosion_s` for blast, `hit_effective` for effective hits (A12, A14.2). */
export function hitSoundFor(dmg: DmgType, modBp: number): SoundId {
  if (modBp >= EFFECTIVE_BP) return 'hit_effective';
  if (dmg === 'blast') return 'explosion_s';
  return `hit_${dmg}`;
}

/** Spawn sound: the card's own, else the A14.2 default by role group. */
export function spawnSoundFor(def: UnitDef | undefined): SoundId {
  if (def?.sfx.spawn) return def.sfx.spawn;
  if (!def) return 'spawn_pop';
  if (def.group === 'legendary') return 'spawn_legendary';
  if (def.group === 'heavy' || def.group === 'epic') return 'spawn_heavy';
  return 'spawn_pop';
}

/** Death sound: the card's own, else `die_mech` for the mech tag and `die_bio` otherwise (A14.2). */
export function dieSoundFor(def: UnitDef | undefined): SoundId {
  if (def?.sfx.die) return def.sfx.die;
  return def?.tags.includes('mech') ? 'die_mech' : 'die_bio';
}

/** The attack at `index`: the unit's own attacks, then rider attacks (B15 `UnitState.attacks`). */
export function attackOf(def: UnitDef | undefined, index: number): AttackDef | undefined {
  if (!def) return undefined;
  const own = def.attacks[index];
  if (own) return own;
  const riders = def.abilities.find((a) => a.kind === 'riders');
  return riders && riders.kind === 'riders' ? riders.attack : undefined;
}

/** Semitones added by each own evolve, in turn (A13 Key changes: +2, +2, +1, +1). */
export const TRANSPOSE_STEPS = [2, 2, 1, 1] as const;

/** Total transposition after `n` own evolves. */
export function transposeAfter(n: number): number {
  let t = 0;
  for (let i = 0; i < n; i++) t += TRANSPOSE_STEPS[Math.min(i, TRANSPOSE_STEPS.length - 1)] ?? 1;
  return t;
}

/** Base crumble stage for an HP fraction: 1 at ≤ 75%, 2 at ≤ 50%, 3 at ≤ 25% (A11 Bases). */
export function crumbleStage(hp: number, maxHp: number): 0 | 1 | 2 | 3 {
  if (maxHp <= 0) return 0;
  const bp = (hp * 10000) / maxHp;
  if (bp <= 2500) return 3;
  if (bp <= 5000) return 2;
  if (bp <= 7500) return 1;
  return 0;
}

/** Number of coins that fly to the counter for a bounty (1-4, A12 Unit death). */
export function coinCount(bountyMilliGold: number): number {
  return Math.max(1, Math.min(4, Math.round(bountyMilliGold / 1000 / 25)));
}

interface Subs {
  spark?: EffectId;
  hitSound?: SoundId;
  attackSound?: SoundId;
  dieSound?: SoundId;
  spawnSound?: SoundId;
  powerSound?: SoundId;
  fanfare?: SoundId;
}

interface RuleTarget {
  at: Anchor;
  victim?: number;
  attacker?: number;
  base?: Side;
  dir?: { x: number; y: number };
  subs?: Subs;
  opts?: Record<string, number>;
  spreadLu?: number;
  gapKey?: string;
}

function resolve(s: string, subs: Subs | undefined): string | null {
  if (!s.startsWith('$')) return s;
  const v = subs?.[s.slice(1) as keyof Subs];
  return v ?? null;
}

const other = (s: Side): Side => (s === 0 ? 1 : 0);

export interface MapperOptions {
  content: CompiledContent;
  feel: RenderFeelConfig;
  mySide: Side;
  rng: CosmeticRng;
}

export class EventMapper {
  feel: RenderFeelConfig;
  private readonly content: CompiledContent;
  private readonly mySide: Side;
  private readonly rng: CosmeticRng;
  private crumble: [number, number] = [0, 0];
  private evolves: [number, number] = [0, 0];

  constructor(o: MapperOptions) {
    this.content = o.content;
    this.feel = o.feel;
    this.mySide = o.mySide;
    this.rng = o.rng;
  }

  /** Maps one tick's (or several ticks') events. `unit` looks up live units by id. */
  map(events: readonly SimEvent[], unit: (id: number) => UnitInfo | undefined): ViewAction[] {
    const out: ViewAction[] = [];
    const diedNow = new Set<number>();
    for (const ev of events) if (ev.e === 'died') diedNow.add(ev.id);
    for (const ev of events) this.one(ev, unit, diedNow, out);
    return out;
  }

  /** Expands a feel rule into primitive actions. */
  rule(key: string, t: RuleTarget, out: ViewAction[]): void {
    const r: FeelRuleExt = feelRule(this.feel, key);
    if (r.hitstopLocalMs) {
      if (t.victim !== undefined && r.hitstopLocalMs.victim > 0) {
        out.push({ a: 'unitFreeze', id: t.victim, ms: r.hitstopLocalMs.victim, ...(r.jitterPx ? { jitterPx: r.jitterPx } : {}) });
      }
      if (t.attacker !== undefined && t.attacker > 0 && r.hitstopLocalMs.attacker > 0) {
        out.push({ a: 'unitFreeze', id: t.attacker, ms: r.hitstopLocalMs.attacker });
      }
    }
    if (r.hitstopGlobalMs && r.hitstopGlobalMs > 0) out.push({ a: 'freeze', ms: r.hitstopGlobalMs, exempt: r.globalExempt === true });
    if (r.slowMo) out.push({ a: 'slowMo', scale: r.slowMo.scale, ms: r.slowMo.ms });
    if (r.trauma && r.trauma > 0) {
      out.push({
        a: 'trauma',
        amount: r.trauma,
        ...(t.dir ? { dir: t.dir } : {}),
        ...(r.traumaGapMs ? { gap: { key: `${key}:${t.gapKey ?? ''}`, gapMs: r.traumaGapMs } } : {}),
      });
    }
    if (r.flashMs && r.flashMs > 0) {
      const target = r.flashTarget ?? (t.victim !== undefined ? 'victim' : 'screen');
      if (target === 'victim' && t.victim !== undefined) out.push({ a: 'unitFlash', id: t.victim, ms: r.flashMs, ...(r.flashColor !== undefined ? { color: r.flashColor } : {}) });
      else if (target === 'screen') out.push({ a: 'screenFlash', ms: r.flashMs, color: r.flashColor ?? 0xffffff, alpha: r.flashAlpha ?? 0.8 });
      else if (target === 'base' && t.base !== undefined) out.push({ a: 'baseFlash', side: t.base, ms: r.flashMs });
    }
    for (const p of r.particles ?? []) {
      const id = resolve(p.effectId, t.subs);
      if (!id || p.count <= 0) continue;
      out.push({
        a: 'fx',
        effectId: id,
        at: t.at,
        count: p.count,
        priority: p.priority,
        ...(t.spreadLu !== undefined ? { spreadLu: t.spreadLu } : p.count > 1 ? { spreadLu: 10 } : {}),
        ...(t.opts ? { opts: t.opts } : {}),
      });
    }
    if (r.sound) {
      const id = resolve(r.sound, t.subs);
      const gapMs = id ? this.feel.tuning.soundGapMs[id] : undefined;
      if (id) out.push({ a: 'sound', id, ...(gapMs ? { gap: { key: id, gapMs } } : {}) });
    }
    if (r.duckDb !== undefined && r.duckMs !== undefined && r.duckMs > 0) out.push({ a: 'duck', db: r.duckDb, ms: r.duckMs });
  }

  private one(ev: SimEvent, unit: (id: number) => UnitInfo | undefined, diedNow: Set<number>, out: ViewAction[]): void {
    const C = this.content;
    const tun = this.feel.tuning;
    switch (ev.e) {
      case 'unitSpawned': {
        const def = C.units[ev.card];
        out.push({ a: 'unitSpawn', id: ev.id, side: ev.side, card: ev.card, x: ev.x / MILLI_LU, summoned: ev.summoned, level: ev.level });
        out.push({ a: 'unitClip', id: ev.id, clip: 'spawn' });
        this.rule('unit.spawn', { at: { k: 'unit', id: ev.id, part: 'feet' }, subs: { spawnSound: spawnSoundFor(def) } }, out);
        return;
      }
      case 'attackStarted': {
        const windupMs = ev.windupTicks * 50;
        out.push({ a: 'unitClip', id: ev.id, clip: 'attack', impactAtMs: windupMs });
        const u = unit(ev.id);
        const atk = attackOf(u ? C.units[u.card] : undefined, ev.attackIndex);
        if (atk && !atk.projectile) {
          // Melee: the swing sound lands just before the impact frame.
          const r = feelRule(this.feel, 'attack.melee');
          const id = r.sound ? resolve(r.sound, { attackSound: atk.sfx }) : null;
          if (id) out.push({ a: 'sound', id, delayMs: Math.max(0, windupMs - 80) });
        }
        return;
      }
      case 'projectileFired': {
        const turret = decodeTurretSource(ev.from);
        const src = ev.from > 0 ? unit(ev.from) : undefined;
        const side = turret ? turret.side : (src?.side ?? null);
        let arc = false;
        let sound: SoundId | undefined;
        if (turret) {
          const tDef = C.turrets[this.turretOn(turret.side, turret.mount) ?? ''];
          const p = tDef?.attack.projectile;
          arc = p !== undefined && 'arc' in p && p.arc === true;
        } else if (src) {
          const def = C.units[src.card];
          const atk = def ? this.attackByVisual(def, ev.visualId) : undefined;
          const p = atk?.projectile;
          arc = p !== undefined && 'arc' in p && p.arc === true;
          sound = atk?.sfx;
        }
        out.push({
          a: 'projectile',
          pid: ev.pid,
          from: ev.from,
          side,
          targetId: ev.targetId,
          toX: ev.toX / MILLI_LU,
          travelMs: ev.travelTicks * 50,
          visualId: ev.visualId,
          arc,
        });
        if (sound) this.rule('projectile.fire', { at: { k: 'unit', id: ev.from, part: 'hit' }, subs: { attackSound: sound } }, out);
        return;
      }
      case 'hit': {
        const victim = unit(ev.targetId);
        const x = ev.x / MILLI_LU;
        const at: Anchor = victim ? { k: 'unit', id: ev.targetId, part: 'hit' } : { k: 'world', x, y: -30 };
        const src = ev.sourceId > 0 ? unit(ev.sourceId) : undefined;
        const turret = decodeTurretSource(ev.sourceId);
        const fromX = src ? src.x : turret ? gateX(turret.side) : undefined;
        const dir = fromX !== undefined ? { x: Math.sign(x - fromX) || 1, y: 0 } : undefined;
        const subs: Subs = { spark: sparkFor(ev.dmgType, ev.modBp), hitSound: hitSoundFor(ev.dmgType, ev.modBp) };
        this.rule(ev.heavy ? 'hit.heavy' : 'hit.light', {
          at,
          victim: ev.targetId,
          ...(ev.sourceId > 0 ? { attacker: ev.sourceId } : {}),
          ...(dir ? { dir } : {}),
          subs,
          spreadLu: 6,
        }, out);
        if (victim) out.push({ a: 'unitClip', id: ev.targetId, clip: 'hit' });
        const power = ev.sourceKind === 'power' || ev.sourceKind === 'lastStand';
        const ownTurretKill = turret !== null && turret.side === this.mySide && diedNow.has(ev.targetId);
        const kind = power ? 'power' : ownTurretKill ? 'kill' : 'damage';
        const key = power ? `c${ev.castId ?? ev.sourceId}:${ev.targetId}` : `${ev.sourceId}:${ev.targetId}`;
        out.push({ a: 'number', kind, value: ev.damage / 100, at, important: power || ownTurretKill, key });
        out.push({ a: 'intensity', amount: ev.heavy ? tun.intensity.heavy : tun.intensity.hit });
        return;
      }
      case 'healed': {
        this.rule('heal', { at: { k: 'unit', id: ev.id, part: 'head' } }, out);
        out.push({ a: 'number', kind: 'heal', value: ev.amount / 100, at: { k: 'unit', id: ev.id, part: 'head' }, important: false, key: `h${ev.id}` });
        return;
      }
      case 'statusApplied': {
        const at: Anchor = { k: 'unit', id: ev.id, part: 'head' };
        if (ev.kind === 'stun') {
          out.push({ a: 'unitClip', id: ev.id, clip: 'stun' });
          this.rule(ev.frozen ? 'status.frozen' : 'status.stun', { at, opts: { ms: ev.ms } }, out);
        } else if (ev.kind === 'shield') {
          this.rule('status.shield', { at: { k: 'unit', id: ev.id, part: 'hit' }, opts: { ms: ev.ms } }, out);
        } else if (ev.kind === 'mark') {
          this.rule('status.mark', { at, opts: { ms: ev.ms } }, out);
        }
        return;
      }
      case 'knockback':
        return;
      case 'abilityUsed': {
        out.push({ a: 'unitClip', id: ev.id, clip: 'ability' });
        const at: Anchor = ev.ability === 'callStrike' || ev.ability === 'pounce' ? { k: 'world', x: ev.x / MILLI_LU, y: 0 } : { k: 'unit', id: ev.id, part: 'hit' };
        this.rule(`ability.${ev.ability}`, { at }, out);
        return;
      }
      case 'died': {
        const def = C.units[ev.card];
        const at: Anchor = { k: 'unit', id: ev.id, part: 'hit' };
        out.push({ a: 'unitDie', id: ev.id });
        const g = def?.group;
        const key = g === 'legendary' ? 'death.legendary' : g === 'heavy' || g === 'epic' ? 'death.heavy' : 'death.unit';
        const killer = ev.killerId !== null && ev.killerId > 0 ? ev.killerId : undefined;
        this.rule(key, { at, victim: ev.id, ...(killer !== undefined ? { attacker: killer } : {}), subs: { dieSound: dieSoundFor(def) } }, out);
        if (def?.tags.includes('mech')) {
          this.rule('death.mech', { at, victim: ev.id }, out);
          const oneIn = Math.max(1, Math.round(tun.mechExplodeOneIn));
          if (this.rng.int(oneIn) === 0) this.rule('death.mech.explode', { at }, out);
        }
        if (ev.killerSide === this.mySide && ev.side !== this.mySide) {
          if (ev.bountyGold > 0) {
            const coins = feelRule(this.feel, 'death.coins').particles?.[0];
            if (coins) out.push({ a: 'fxFly', effectId: coins.effectId, from: at, to: 'gold', count: coinCount(ev.bountyGold), priority: coins.priority });
            out.push({ a: 'view', ev: { t: 'coins', count: coinCount(ev.bountyGold) } });
          }
          if (ev.bountyXp > 0) {
            const xp = feelRule(this.feel, 'xp.kill').particles?.[0];
            if (xp) out.push({ a: 'fxFly', effectId: xp.effectId, from: at, to: 'xp', count: xp.count, priority: xp.priority });
          }
        }
        out.push({ a: 'intensity', amount: tun.intensity.death });
        return;
      }
      case 'turretBuildStart':
        this.setTurretCard(ev.side, ev.mount, ev.card);
        out.push({ a: 'turret', side: ev.side, mount: ev.mount, op: 'buildStart', card: ev.card });
        this.rule('turret.build', { at: { k: 'mount', side: ev.side, mount: ev.mount } }, out);
        return;
      case 'turretBuilt':
        this.setTurretCard(ev.side, ev.mount, ev.card);
        out.push({ a: 'turret', side: ev.side, mount: ev.mount, op: 'built', card: ev.card });
        return;
      case 'turretSold':
        out.push({ a: 'turret', side: ev.side, mount: ev.mount, op: 'sell', card: ev.card });
        this.rule('turret.sell', { at: { k: 'mount', side: ev.side, mount: ev.mount } }, out);
        return;
      case 'turretReplaced':
        this.setTurretCard(ev.side, ev.mount, ev.card);
        out.push({ a: 'turret', side: ev.side, mount: ev.mount, op: 'replace', card: ev.card });
        this.rule('turret.modernise', { at: { k: 'mount', side: ev.side, mount: ev.mount } }, out);
        return;
      case 'turretFired': {
        const card = this.turretOn(ev.side, ev.mount);
        out.push({ a: 'turret', side: ev.side, mount: ev.mount, op: 'fire', card: card ?? '', targetId: ev.targetId });
        const sfx = card ? C.turrets[card]?.attack.sfx : undefined;
        this.rule('turret.fire', { at: { k: 'mount', side: ev.side, mount: ev.mount }, subs: sfx ? { attackSound: sfx } : {}, spreadLu: 4, opts: { side: ev.side } }, out);
        return;
      }
      case 'baseDamaged': {
        out.push({ a: 'base', side: ev.side, op: 'hit' });
        const dir = { x: ev.side === 0 ? -1 : 1, y: 0 };
        this.rule('base.hit', { at: { k: 'base', side: ev.side, part: 'front' }, base: ev.side, dir, gapKey: String(ev.side), spreadLu: 18 }, out);
        out.push({ a: 'number', kind: 'base', value: ev.damage / 100, at: { k: 'base', side: ev.side, part: 'front' }, important: true, key: `base${ev.side}` });
        const stage = crumbleStage(ev.hp, ev.maxHp);
        if (stage > this.crumble[ev.side]) {
          this.crumble[ev.side] = stage;
          this.rule('base.crumble', { at: { k: 'base', side: ev.side, part: 'center' }, spreadLu: 40 }, out);
        } else if (stage < this.crumble[ev.side]) {
          this.crumble[ev.side] = stage;
        }
        out.push({ a: 'intensity', amount: tun.intensity.baseHit });
        return;
      }
      case 'goldEarned': {
        if (ev.reason !== 'bounty' || ev.side !== this.mySide) return;
        const x = ev.x !== undefined ? ev.x / MILLI_LU : gateX(other(ev.side));
        out.push({ a: 'number', kind: 'gold', value: ev.amount / 1000, at: { k: 'world', x, y: -70 }, important: true });
        const r = feelRule(this.feel, 'death.coins');
        if (r.sound) out.push({ a: 'sound', id: r.sound, gap: { key: 'coin', gapMs: tun.coinSoundGapMs }, climb: 'coin' });
        return;
      }
      case 'xpEarned':
      case 'queueChanged':
      case 'queueConverted':
        return;
      case 'mountBought':
        this.rule('mount.buy', { at: { k: 'mount', side: ev.side, mount: ev.mount } }, out);
        return;
      case 'treasuryUp':
        out.push({ a: 'baseTreasury', side: ev.side, level: ev.level });
        this.rule('treasury.up', { at: { k: 'base', side: ev.side, part: 'center' } }, out);
        return;
      case 'ascendStart': {
        const own = ev.side === this.mySide;
        out.push({ a: 'fx', effectId: 'fx.evolve_pillar', at: { k: 'base', side: ev.side, part: 'center' }, count: 1, priority: 4, opts: { phase: 0, ms: this.content.economy.ascendMs, small: own ? 0 : 1 } });
        this.rule(own ? 'evolve.start.own' : 'evolve.start.enemy', { at: { k: 'base', side: ev.side, part: 'center' } }, out);
        out.push({ a: 'view', ev: { t: 'ascending', side: ev.side, age: ev.age } });
        return;
      }
      case 'ageUp': {
        const own = ev.side === this.mySide;
        const at: Anchor = { k: 'base', side: ev.side, part: 'center' };
        this.evolves[ev.side] += 1;
        if (own) {
          this.rule('evolve.own', { at, subs: { fanfare: `evolve_fanfare_${ev.age}` }, opts: { phase: 1, age: this.content.ages[ev.age]?.index ?? 0 } }, out);
          out.push({ a: 'cheer', side: ev.side });
          const cue = this.content.ages[ev.age]?.musicCue;
          if (cue) out.push({ a: 'musicCue', cue, fadeMs: 600 });
          out.push({ a: 'musicTranspose', semitones: transposeAfter(this.evolves[ev.side]) });
          out.push({ a: 'intensity', amount: tun.intensity.evolve });
        } else {
          this.rule('evolve.enemy', { at, opts: { phase: 1, small: 1, age: this.content.ages[ev.age]?.index ?? 0 } }, out);
        }
        out.push({ a: 'baseMorph', side: ev.side, age: ev.age, ms: 1800 });
        out.push({ a: 'backdropWipe', side: ev.side, age: ev.age, ms: BACKDROP_WIPE_MS });
        out.push({ a: 'view', ev: { t: 'evolved', side: ev.side, age: ev.age } });
        return;
      }
      case 'powerReady':
        if (ev.side === this.mySide) this.rule('power.ready', { at: { k: 'base', side: ev.side, part: 'top' } }, out);
        return;
      case 'powerTelegraph':
        // `zone` is milli-lu like every sim position (B3; WP2 emits `zone: 500_000` for 500 lu).
        out.push({ a: 'telegraph', side: ev.side, castId: ev.castId, power: ev.power, x: ev.x / MILLI_LU, zone: ev.zone / MILLI_LU, ms: this.content.powers[ev.power]?.telegraphMs ?? tun.telegraphMs });
        this.rule('power.telegraph', { at: { k: 'world', x: ev.x / MILLI_LU, y: 0 } }, out);
        return;
      case 'powerImpact': {
        const x = ev.x / MILLI_LU;
        out.push({ a: 'powerFx', side: ev.side, power: ev.power, castId: ev.castId, x, index: ev.index });
        if (ev.index === 0) {
          this.rule('power.impact', { at: { k: 'world', x, y: 0 }, subs: { powerSound: this.content.powers[ev.power]?.sfx ?? 'power_telegraph' } }, out);
          out.push({ a: 'intensity', amount: tun.intensity.power });
        } else {
          this.rule('power.impact.more', { at: { k: 'world', x, y: 0 } }, out);
        }
        return;
      }
      case 'stanceChanged':
        if (ev.side === this.mySide) this.rule('stance', { at: { k: 'base', side: ev.side, part: 'top' } }, out);
        return;
      case 'lastStandArmed':
        out.push({ a: 'baseGlow', side: ev.side, on: true });
        this.rule('lastStand.armed', { at: { k: 'base', side: ev.side, part: 'top' } }, out);
        out.push({ a: 'view', ev: { t: 'lastStandArmed', side: ev.side } });
        return;
      case 'lastStandCharge':
        out.push({ a: 'baseGlow', side: ev.side, on: true });
        this.rule('lastStand.charge', { at: { k: 'base', side: ev.side, part: 'top' } }, out);
        return;
      case 'lastStandFire':
        out.push({ a: 'baseGlow', side: ev.side, on: false });
        this.rule('lastStand.fire', {
          at: { k: 'world', x: gateX(ev.side), y: -20 },
          opts: { side: ev.side, radius: this.content.economy.lastStand.radius },
        }, out);
        return;
      case 'phaseChanged':
        out.push({ a: 'phase', phase: ev.phase });
        this.rule(`phase.${ev.phase}`, { at: { k: 'world', x: LANE_LU / 2, y: -80 } }, out);
        if (ev.phase === 'overdrive') out.push({ a: 'musicLayer', layer: 'overdrive', v: 1 });
        if (ev.phase === 'siege') out.push({ a: 'musicLayer', layer: 'siege', v: 1 });
        return;
      case 'emote':
        out.push({ a: 'view', ev: { t: 'emote', side: ev.side, emote: ev.emote } });
        this.rule('emote', { at: { k: 'base', side: ev.side, part: 'top' } }, out);
        return;
      case 'commandRejected':
        if (ev.side !== this.mySide) return;
        this.rule('deny', { at: { k: 'base', side: ev.side, part: 'top' } }, out);
        out.push({ a: 'view', ev: { t: 'denied', command: ev.t, reason: ev.reason } });
        return;
      case 'matchEnded': {
        const r = ev.result;
        const destroyed = r.reason === 'baseDestroyed' || r.reason === 'bothDestroyed';
        if (destroyed) {
          const losers: Side[] = r.reason === 'bothDestroyed' || r.winner === null ? [0, 1] : [other(r.winner)];
          for (const s of losers) {
            out.push({ a: 'base', side: s, op: 'collapse' });
            this.rule('base.destroyed', { at: { k: 'base', side: s, part: 'center' }, spreadLu: BASE_DEPTH_LU / 2, opts: { side: s } }, out);
          }
        }
        if (r.winner !== null) out.push({ a: 'cheer', side: r.winner });
        const cue = r.winner === null ? null : r.winner === this.mySide ? 'stinger.victory' : 'stinger.defeat';
        if (cue) out.push({ a: 'musicCue', cue, fadeMs: 300 });
        out.push({ a: 'view', ev: { t: 'matchEnded', outcome: r } });
        return;
      }
      default: {
        const never: never = ev;
        void never;
      }
    }
  }

  private attackByVisual(def: UnitDef, visualId: string): AttackDef | undefined {
    const all = [...def.attacks];
    for (const a of def.abilities) if (a.kind === 'riders') all.push(a.attack);
    return (
      all.find((a) => a.projectile !== undefined && (('visualId' in a.projectile && a.projectile.visualId === visualId) || ('effectId' in a.projectile && a.projectile.effectId === visualId))) ??
      undefined
    );
  }

  /** Latest known turret card per mount, fed by the view from sim state. */
  private turretCards = new Map<string, CardId>();

  /** Records which card sits on a mount (the view calls this from state each frame). */
  setTurretCard(side: Side, mount: number, card: CardId | null): void {
    const k = `${side}:${mount}`;
    if (card) this.turretCards.set(k, card);
    else this.turretCards.delete(k);
  }

  private turretOn(side: Side, mount: number): CardId | undefined {
    return this.turretCards.get(`${side}:${mount}`);
  }
}
