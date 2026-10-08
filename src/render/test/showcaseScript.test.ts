/**
 * The card detail showcase's script (owner request 2026-10-07): what each kind of card shows, in what
 * order, and when, read straight from the compiled content. Pure data: no Pixi, no sim.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import type { ShowcaseMove } from '@/contracts';
import {
  ALLY,
  arrivalMove,
  autoLoop,
  burstOf,
  DUMMY,
  DUMMY_CARD,
  flightMs,
  FOE_TURRET,
  HELPER,
  HERO,
  moveScript,
  planVisuals,
  SHOOTER,
  showcasePlan,
  shownRange,
  STRUCTURE,
  TURRET_SOURCE,
  variantIndex,
  windupMs,
  type Beat,
  type HeroArt,
  type ShowcasePlan,
} from '../showcase/script';

const plan = (card: string, art?: HeroArt): ShowcasePlan => {
  const p = showcasePlan(content, card, art);
  if (!p) throw new Error(`no plan for ${card}`);
  return p;
};
const troop = (card: string, art?: HeroArt) => {
  const p = plan(card, art);
  if (p.kind !== 'troop') throw new Error(`${card} is a ${p.kind}`);
  return p;
};
const beats = <K extends Beat['k']>(list: Beat[], k: K): Extract<Beat, { k: K }>[] => list.filter((b): b is Extract<Beat, { k: K }> => b.k === k);
const ART3: HeroArt = { attacks: ['attack', 'attack_b', 'attack_c'], alt: false };

describe('showcase timing follows the card', () => {
  it('uses the sim wind-up (interval ticks x pct / 100, whole ticks)', () => {
    expect(windupMs(1000, 40)).toBe(400);
    expect(windupMs(1500, 50)).toBe(750);
    expect(windupMs(1400, 50)).toBe(700);
    expect(windupMs(300, 50)).toBe(150);
  });

  it('flies projectiles at their speed over the stage distance, never under one tick', () => {
    expect(flightMs(65, 650)).toBe(100);
    expect(flightMs(10, 1500)).toBe(50);
    expect(flightMs(-130, 650)).toBe(200);
  });

  it('compresses ranges to the stage and gives fast attackers a short burst', () => {
    expect(shownRange(100)).toBe(44);
    expect(shownRange(230)).toBe(58);
    expect(shownRange(440)).toBe(72);
    expect(burstOf({ intervalMs: 300 })).toBe(5);
    expect(burstOf({ intervalMs: 600 })).toBe(3);
    expect(burstOf({ intervalMs: 1000 })).toBe(1);
  });

  it('is deterministic and keeps its beats in time order', () => {
    for (const card of ['bonker', 'longbowman', 'archer_tower', 'palisade', 'meteor_shower', 'paratroopers']) {
      const p = plan(card);
      for (const m of p.moves) {
        const a = moveScript(p, m, { dummyHits: 1 });
        expect(moveScript(p, m, { dummyHits: 1 })).toEqual(a);
        const at = a.beats.map((b) => b.at);
        expect(at).toEqual([...at].sort((x, y) => x - y));
        expect(a.ms).toBeGreaterThan(0);
      }
    }
  });
});

describe('troops', () => {
  it('a melee biped walks in, idles, swings at the dummy, takes its club, falls and loops', () => {
    const p = troop('bonker');
    expect(p.moves).toEqual(['walk', 'idle', 'attack', 'hit', 'ko']);
    expect(autoLoop(p)).toEqual(['idle', 'attack', 'hit', 'ko', 'walk']);
    expect(arrivalMove(p)).toBe('idle');
    expect(p.foe.by).toBe('dummy');
    expect(p.layout.heroX).toBeLessThan(0);
    expect(p.layout.spawnX).toBeLessThan(p.layout.heroX);
    const a = moveScript(p, 'attack');
    const start = beats(a.beats, 'attack')[0]!;
    expect(start).toMatchObject({ id: HERO, target: DUMMY, windupMs: 400, variant: 'attack' });
    // melee lands on the wind-up, no projectile
    expect(beats(a.beats, 'shot')).toEqual([]);
    expect(beats(a.beats, 'hit')[0]).toMatchObject({ at: 400, target: DUMMY, source: HERO, card: 'bonker' });
    const ko = moveScript(p, 'ko');
    expect(beats(ko.beats, 'attack')[0]).toMatchObject({ id: DUMMY, target: HERO });
    expect(beats(ko.beats, 'die')[0]).toMatchObject({ id: HERO, killer: DUMMY });
  });

  it('plays every attack variant the loaded sheet has, numbered for the caption', () => {
    const p = troop('bonker', ART3);
    expect(p.moves).toEqual(['walk', 'idle', 'attack', 'attack_b', 'attack_c', 'hit', 'ko']);
    expect(variantIndex(p, 'attack_b')).toEqual({ index: 2, of: 3 });
    expect(beats(moveScript(p, 'attack_c').beats, 'attack')[0]?.variant).toBe('attack_c');
  });

  it('a shooter stands off at its compressed range, fires its real projectile and is hit by an unseen marksman', () => {
    const p = troop('longbowman');
    expect(p.attack?.shot).toMatchObject({ visualId: 'proj.arrow', speed: 650, arc: false });
    expect(Math.abs(p.layout.heroX)).toBeGreaterThanOrEqual(shownRange(230));
    const a = moveScript(p, 'attack');
    const shot = beats(a.beats, 'shot')[0]!;
    expect(shot).toMatchObject({ from: HERO, target: DUMMY, visualId: 'proj.arrow', at: 700 });
    expect(beats(a.beats, 'hit')[0]?.at).toBe(700 + shot.travelMs);
    expect(p.foe.by).toBe('shot');
    const hit = moveScript(p, 'hit');
    expect(beats(hit.beats, 'shot')[0]).toMatchObject({ from: SHOOTER, target: HERO });
  });

  it('a long-range thrower lobs its shot in an arc', () => {
    const p = troop('atlatl_thrower');
    const shot = beats(moveScript(p, 'attack').beats, 'shot')[0]!;
    expect(shot.arc).toBe(true);
    expect(shot.visualId).toBe('proj.dart');
  });

  it('a pouncing beast steps back, leaps onto the dummy and lands a heavy bite', () => {
    const p = troop('sabertooth', ART3);
    expect(p.moves).toContain('ability');
    const s = moveScript(p, 'ability');
    const dash = beats(s.beats, 'dash')[0]!;
    expect(dash).toMatchObject({ id: HERO, toX: p.layout.heroX });
    expect(beats(s.beats, 'ability')[0]?.ability).toBe('pounce');
    expect(beats(s.beats, 'hit')[0]).toMatchObject({ at: dash.at + dash.ms, heavy: true, target: DUMMY });
  });

  it("a rider's second attacker gets its own move only when the sheet has attack_alt", () => {
    expect(troop('mammoth_matriarch', ART3).moves).not.toContain('attack_alt');
    const p = troop('mammoth_matriarch', { ...ART3, alt: true });
    expect(p.moves).toEqual(['walk', 'idle', 'attack', 'attack_b', 'attack_c', 'attack_alt', 'hit', 'ko']);
    expect(beats(moveScript(p, 'attack_alt').beats, 'attack')[0]).toMatchObject({ index: 1, id: HERO });
  });

  it('a flyer keeps its altitude, takes a shot instead of a club, and a fast gun fires a burst', () => {
    const p = troop('gyrocopter');
    expect(p.air).toBe(true);
    expect(p.layout.altitude).toBeGreaterThan(0);
    expect(p.foe.by).toBe('shot');
    const a = moveScript(p, 'attack');
    const starts = beats(a.beats, 'attack');
    expect(starts).toHaveLength(5);
    expect(starts.map((b) => b.at)).toEqual([0, 300, 600, 900, 1200]);
    expect(beats(a.beats, 'hit')).toHaveLength(5);
  });

  it('a squad shows the whole squad: every member walks in and swings, a beat apart', () => {
    const p = troop('hunting_wolves');
    expect(p.members).toBe(2);
    const walk = moveScript(p, 'walk');
    expect(beats(walk.beats, 'spawn').map((b) => b.id)).toEqual([HERO, HERO + 1]);
    const a = moveScript(p, 'attack');
    expect(beats(a.beats, 'attack').map((b) => [b.id, b.at])).toEqual([
      [HERO, 0],
      [HERO + 1, 110],
    ]);
    const ko = moveScript(p, 'ko');
    expect(beats(ko.beats, 'die').map((b) => b.id)).toEqual([HERO, HERO + 1]);
  });

  it('a summoner briefly calls its helper, which attacks and leaves', () => {
    const p = troop('beast_caller');
    expect(p.moves).toContain('summon');
    const s = moveScript(p, 'summon');
    expect(beats(s.beats, 'spawn')[0]).toMatchObject({ id: HELPER, summoner: HERO, side: 0, card: p.summon?.card });
    expect(beats(s.beats, 'attack')[0]?.id).toBe(HELPER);
    expect(beats(s.beats, 'vanish')[0]?.id).toBe(HELPER);
  });

  it('an innate shield shows its bubble, which a hit pops', () => {
    const p = troop('photon_knight');
    expect(p.shield).toBe(true);
    const hit = moveScript(p, 'hit');
    expect(beats(hit.beats, 'shield')[0]).toMatchObject({ id: HERO, bp: 0 });
  });

  it('leases the hero, its summon and the dummy', () => {
    const p = troop('beast_caller');
    const v = planVisuals(content, p);
    expect(v).toContain(content.units['beast_caller']!.visualId);
    expect(v).toContain(content.units[DUMMY_CARD]!.visualId);
    expect(v).toContain(content.units[p.summon!.card]!.visualId);
  });
});

describe('turrets, forts and powers', () => {
  it('a turret builds, then shoots a dummy marching in; the third volley knocks it out', () => {
    const p = plan('archer_tower');
    expect(p.kind).toBe('turret');
    expect(arrivalMove(p)).toBe('build');
    expect(autoLoop(p)).toEqual(['idle', 'fire', 'fire', 'fire']);
    const idle = moveScript(p, 'idle');
    expect(beats(idle.beats, 'spawn')[0]).toMatchObject({ id: DUMMY, side: 1 });
    expect(beats(idle.beats, 'walk')[0]?.toX).toBe(0);
    const f1 = moveScript(p, 'fire', { dummyHits: 0 });
    expect(beats(f1.beats, 'shot')[0]).toMatchObject({ from: TURRET_SOURCE, visualId: 'proj.arrow' });
    expect(beats(f1.beats, 'die')).toEqual([]);
    expect(beats(moveScript(p, 'fire', { dummyHits: 2 }).beats, 'die')[0]).toMatchObject({ id: DUMMY, killer: TURRET_SOURCE });
  });

  it('a fast gun fires a burst per volley and still drops the dummy on the third', () => {
    const p = plan('gatling_gun');
    const f = moveScript(p, 'fire', { dummyHits: 0 });
    expect(beats(f.beats, 'turret')).toHaveLength(5);
    expect(beats(f.beats, 'die')).toEqual([]);
    expect(beats(moveScript(p, 'fire', { dummyHits: 10 }).beats, 'die')).toHaveLength(1);
  });

  it('a wall is clubbed down a crumble stage at a time, falls and is rebuilt', () => {
    const p = plan('palisade');
    expect(p.kind === 'fort' && p.fortKind).toBe('wall');
    expect(autoLoop(p)).toEqual(['idle', 'hit', 'hit', 'ko', 'build']);
    const hp = (n: number) => beats(moveScript(p, 'hit', { structureHits: n }).beats, 'fort').find((b) => b.op === 'hp')?.hpBp;
    expect(hp(0)).toBe(6000);
    expect(hp(1)).toBe(3000);
    expect(beats(moveScript(p, 'ko').beats, 'die')[0]).toMatchObject({ id: STRUCTURE, killer: DUMMY });
    expect(beats(moveScript(p, 'build').beats, 'fort').map((b) => b.op)).toEqual(['place', 'built']);
  });

  it('a tower shoots its real shot; a camp sends its levy; a trap springs on the dummy', () => {
    const tower = plan('sling_perch');
    expect(tower.kind === 'fort' && tower.attack).toBeTruthy();
    expect(beats(moveScript(tower, 'fire').beats, 'attack')[0]).toMatchObject({ id: STRUCTURE, target: DUMMY });
    const camp = plan('war_camp');
    if (camp.kind !== 'fort') throw new Error('camp');
    const spawn = moveScript(camp, 'spawn');
    expect(beats(spawn.beats, 'spawn')[0]).toMatchObject({ id: HELPER, card: camp.levy?.card, from: STRUCTURE });
    expect(beats(spawn.beats, 'die')[0]).toMatchObject({ id: DUMMY, killer: HELPER });
    const trap = plan('spike_pit');
    expect(autoLoop(trap)).toEqual(['idle', 'trigger', 'build']);
    const t = moveScript(trap, 'trigger');
    expect(beats(t.beats, 'trap').map((b) => b.op)).toEqual(['trigger', 'spent']);
    expect(beats(t.beats, 'die')[0]?.id).toBe(DUMMY);
  });

  it('a bombard telegraphs its zone, then rains impacts that knock the dummies out', () => {
    const p = plan('meteor_shower');
    if (p.kind !== 'power') throw new Error('power');
    expect(p.targets).toHaveLength(3);
    const c = moveScript(p, 'cast');
    const tele = beats(c.beats, 'power').find((b) => b.op === 'telegraph')!;
    expect(tele).toMatchObject({ at: 0, zone: p.zone, ms: 1000 });
    const impacts = beats(c.beats, 'power').filter((b) => b.op === 'impact');
    expect(impacts.length).toBeGreaterThanOrEqual(3);
    expect(impacts.every((b) => b.at >= 1000)).toBe(true);
    expect(beats(c.beats, 'die').map((b) => b.id)).toEqual([DUMMY, DUMMY + 1, DUMMY + 2]);
  });

  it('a strike locks one target; a drop lands troops that take the dummy on; a buff lights own troops', () => {
    const strike = plan('hunters_spear');
    if (strike.kind !== 'power') throw new Error('power');
    expect(strike.targets).toEqual([0]);
    const s = moveScript(strike, 'cast');
    expect(beats(s.beats, 'power')[0]).toMatchObject({ op: 'telegraph', target: DUMMY, zone: 0 });
    expect(beats(s.beats, 'die')[0]?.id).toBe(DUMMY);

    const drop = plan('paratroopers');
    if (drop.kind !== 'power') throw new Error('power');
    const d = moveScript(drop, 'cast');
    expect(beats(d.beats, 'spawn').map((b) => b.id)).toEqual([HELPER, HELPER + 1, HELPER + 2]);
    expect(beats(d.beats, 'attack').every((b) => b.target === DUMMY)).toBe(true);
    expect(beats(d.beats, 'die')[0]).toMatchObject({ id: DUMMY });
    expect(beats(d.beats, 'vanish')).toHaveLength(3);

    const buff = plan('hunt_cry');
    if (buff.kind !== 'power') throw new Error('power');
    expect(buff.allies).not.toBeNull();
    const idle = moveScript(buff, 'idle');
    expect(beats(idle.beats, 'spawn').every((b) => b.side === 0 && b.id >= ALLY)).toBe(true);
  });

  it('a jammer silences an enemy turret that drops in first', () => {
    const p = plan('undermine');
    if (p.kind !== 'power') throw new Error('power');
    expect(p.foeTurret).not.toBeNull();
    expect(planVisuals(content, p)).toContain(p.foeTurret!.visualId);
    expect(beats(moveScript(p, 'idle').beats, 'foeTurret')[0]?.op).toBe('place');
    const c = moveScript(p, 'cast');
    expect(beats(c.beats, 'foeTurret')[0]).toMatchObject({ op: 'silence' });
    expect(FOE_TURRET).not.toBe(STRUCTURE);
  });

  it('every released card of the content has a show', () => {
    const ids = [...Object.keys(content.units).filter((id) => !content.units[id]!.hidden && !content.units[id]!.summon && !content.units[id]!.levy), ...Object.keys(content.turrets), ...Object.keys(content.forts), ...Object.keys(content.powers)];
    for (const id of ids) {
      const p = showcasePlan(content, id);
      expect(p, id).not.toBeNull();
      for (const m of p!.moves as readonly ShowcaseMove[]) expect(moveScript(p!, m).ms, `${id} ${m}`).toBeGreaterThan(0);
    }
  });
});
