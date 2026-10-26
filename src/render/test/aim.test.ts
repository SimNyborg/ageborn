/**
 * Queue item 44: the aim maths of ranged shots (presentation only; the sim decides only `arc` and the travel time).
 */
import type { AttackDef } from '@/contracts';
import { content } from '@/content';
import { describe, expect, it } from 'vitest';
import { ARC_MIN_LOFT_DEG, leanFor, lineDeg, MAX_LAUNCH_DEG, pathFor, pickAimVariant, shotKindOf, variantShortfall, type AimVariant } from '../aim';

const atk = (o: Partial<AttackDef>): AttackDef =>
  ({ damage: 10, intervalMs: 1000, range: 200, hitsGround: true, hitsAir: false, dmgType: 'pierce', sfx: 'shot_bow', ...o }) as AttackDef;

describe('shot kinds', () => {
  it('sorts attacks into direct, ballistic and arc shots; melee has none', () => {
    expect(shotKindOf(atk({ projectile: { speed: 1500, visualId: 'proj.bullet' }, dmgType: 'bullet' }))).toBe('direct');
    expect(shotKindOf(atk({ projectile: { speed: 1800, visualId: 'proj.plasma' }, dmgType: 'blast' }))).toBe('direct');
    expect(shotKindOf(atk({ projectile: { instant: true, effectId: 'fx.beam_laser' }, dmgType: 'laser' }))).toBe('direct');
    expect(shotKindOf(atk({ projectile: { speed: 1200, visualId: 'proj.moon_pellet' }, dmgType: 'laser' }))).toBe('direct');
    expect(shotKindOf(atk({ projectile: { speed: 650, visualId: 'proj.arrow' } }))).toBe('ballistic');
    expect(shotKindOf(atk({ projectile: { speed: 1200, visualId: 'proj.shell' }, dmgType: 'blast' }))).toBe('ballistic');
    expect(shotKindOf(atk({ projectile: { speed: 300, arc: true, visualId: 'proj.arrow_arc' } }))).toBe('arc');
    expect(shotKindOf(atk({}))).toBeNull();
    expect(shotKindOf(undefined)).toBeNull();
  });

  it('every ranged attack in the content has a kind, and every attack with `arc` is an arc shot', () => {
    let n = 0;
    for (const u of Object.values(content.units)) {
      for (const a of u.attacks) {
        if (!a.projectile) continue;
        n++;
        const k = shotKindOf(a);
        expect(k, u.id).not.toBeNull();
        if ('arc' in a.projectile && a.projectile.arc) expect(k, u.id).toBe('arc');
      }
    }
    expect(n).toBeGreaterThan(90);
  });
});

describe('the line to a target', () => {
  it('measures degrees above the facing direction, screen y down, and gives up on targets behind or under the weapon', () => {
    expect(lineDeg({ x: 0, y: -30 }, { x: 100, y: -30 }, 1)).toBeCloseTo(0, 6);
    expect(lineDeg({ x: 0, y: -30 }, { x: 100, y: -130 }, 1)).toBeCloseTo(45, 6);
    expect(lineDeg({ x: 500, y: -30 }, { x: 400, y: 70 }, -1)).toBeCloseTo(-45, 6);
    expect(lineDeg({ x: 0, y: -30 }, { x: -100, y: -30 }, 1)).toBeNull();
    expect(lineDeg({ x: 0, y: -30 }, { x: 3, y: -30 }, 1)).toBeNull();
  });
});

describe('the lean toward a target', () => {
  it('a direct shot leans until the barrel points down the line, as far as the body allows', () => {
    // a hip-fire musket drawn 9 degrees down at a target 7 degrees up
    expect(leanFor('direct', 7, -9, 14)).toBe(14);
    expect(leanFor('direct', 7, -9, 20)).toBe(16);
    // a helicopter's level gun at a ground unit below
    expect(leanFor('direct', -32, 0, 20)).toBe(-20);
    // close enough: no tilt for a degree
    expect(leanFor('direct', 1, 0, 14)).toBe(0);
    // a body that may not lean (wheels, tracks, riders)
    expect(leanFor('direct', 30, 0, 0)).toBe(0);
  });

  it('a ballistic shot leans only up, when the weapon points below its target; an arc keeps its loft', () => {
    // a crossbow drawn 4 degrees down at a target 2 degrees up: leans up 6
    expect(leanFor('ballistic', 2, -4, 14)).toBe(6);
    // a bow raised over its target: no lean, the path arcs instead
    expect(leanFor('ballistic', -5, 38, 14)).toBe(0);
    // an arc from a weapon flatter than line + loft leans up toward it
    expect(leanFor('arc', 0, 20, 14)).toBe(ARC_MIN_LOFT_DEG - 20);
    expect(leanFor('arc', 0, 45, 14)).toBe(0);
  });
});

describe('the path', () => {
  it('direct shots fly straight down the line', () => {
    expect(pathFor('direct', -12, 5)).toEqual({ path: 'straight', launchDeg: -12 });
  });

  it('a ballistic shot leaves along a weapon above the line and flies straight from one at or below it', () => {
    expect(pathFor('ballistic', -7, 38)).toEqual({ path: 'ballistic', launchDeg: 38 });
    expect(pathFor('ballistic', 2, 2)).toEqual({ path: 'straight', launchDeg: 2 });
    expect(pathFor('ballistic', 2, -6)).toEqual({ path: 'straight', launchDeg: 2 });
    // a tank's level gun at a target below: the shell drops onto it
    expect(pathFor('ballistic', -21, 0)).toEqual({ path: 'ballistic', launchDeg: 0 });
    // never steeper than the views take
    expect(pathFor('ballistic', 0, 88).launchDeg).toBe(MAX_LAUNCH_DEG);
  });

  it('an arc always arcs, along its weapon, with a little loft from a flat one', () => {
    expect(pathFor('arc', 0, 45)).toEqual({ path: 'ballistic', launchDeg: 45 });
    expect(pathFor('arc', 0, 2).launchDeg).toBeGreaterThan(2);
    expect(pathFor('arc', 10, 75).launchDeg).toBe(MAX_LAUNCH_DEG);
  });
});

describe('the attack variant for a shot', () => {
  const yeoman: AimVariant[] = [
    { anim: 'attack', deg: 45, omni: false },
    { anim: 'attack_b', deg: 6, omni: false },
  ];
  const longbow: AimVariant[] = [
    { anim: 'attack', deg: 38, omni: false },
    { anim: 'attack_b', deg: 2, omni: false },
  ];

  it('keeps the view own cycle while its next variant can start the shot', () => {
    expect(pickAimVariant(longbow, 'attack_b', 'ballistic', 0, 14)).toBeNull();
    expect(pickAimVariant(longbow, 'attack', 'ballistic', 0, 14)).toBeNull();
    expect(pickAimVariant(yeoman, 'attack', 'arc', 0, 14)).toBeNull();
  });

  it('an arc never plays from a level pose: the raised variant takes its turn', () => {
    expect(variantShortfall('arc', 0, 6, 14)).toBeGreaterThan(5);
    expect(pickAimVariant(yeoman, 'attack_b', 'arc', 0, 14)).toBe('attack');
  });

  it('a level bow at a flyer gives way to the raised one; a raised staff at a unit in front to the level one', () => {
    expect(pickAimVariant(longbow, 'attack_b', 'ballistic', 30, 14)).toBe('attack');
    const staff: AimVariant[] = [
      { anim: 'attack', deg: 40, omni: false },
      { anim: 'attack_b', deg: 0, omni: false },
    ];
    expect(pickAimVariant(staff, 'attack', 'direct', -6, 14)).toBe('attack_b');
    expect(pickAimVariant(staff, 'attack', 'direct', 30, 14)).toBeNull();
  });

  it('a weapon steeper than any path (a flare pistol fired straight up) gives way to one that fits', () => {
    const flare: AimVariant[] = [
      { anim: 'attack', deg: 88, omni: false },
      { anim: 'attack_b', deg: 0, omni: false },
    ];
    expect(pickAimVariant(flare, 'attack', 'ballistic', -8, 14)).toBe('attack_b');
  });

  it('emitters without a direction and single-variant sheets keep their cycle', () => {
    expect(pickAimVariant([{ anim: 'attack', deg: 0, omni: true }, { anim: 'attack_b', deg: 0, omni: true }], 'attack', 'direct', 40, 14)).toBeNull();
    expect(pickAimVariant([{ anim: 'attack', deg: 40, omni: false }], 'attack', 'direct', -20, 14)).toBeNull();
    expect(pickAimVariant(longbow, null, 'ballistic', 30, 14)).toBeNull();
  });
});
