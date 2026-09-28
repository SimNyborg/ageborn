/**
 * Clip playback (DESIGN A11 clip contract, B5 "The sim owns timing"): the impact warp lands the
 * authored impact exactly on the sim's impact time, loops loop, die holds, hitstop freezes, and the
 * walk cycle follows the ground distance.
 */
import { describe, expect, it } from 'vitest';
import { Animator, clipU, ease, sampleTrack, type ClipResolver } from '../animator';
import { getClip } from '../clips';
import { legAngle, strideFor, type ProcContext } from '../clips/procedural';
import { puppetById } from '../library';
import { MANIFEST } from '../manifest';
import { clipResolver, procContext } from '../adapters/procedural/shared';
import type { ClipDef } from '../types';

const ctx: ProcContext = { bones: new Set(['root', 'spin', 'pelvis', 'torso', 'armF', 'legF', 'legB', 'eyes', 'handF']), heightLu: 68, legLu: 16, legDeg: 25, strideLu: 27, speedLuPerSec: 70, wheelRadiusLu: 10, air: false, twirlBone: 'handF' };

function resolverFor(clips: ClipDef[]): ClipResolver {
  const m = new Map(clips.map((c) => [c.id, c]));
  return (name) => {
    const c = m.get(name);
    return c ? { clip: c, durationMs: c.durationMs, loop: c.loop } : undefined;
  };
}

const attack: ClipDef = { id: 'attack', durationMs: 600, loop: false, impactAt: 0.5, tracks: { armF: [{ t: 0, r: 0 }, { t: 0.5, r: -90 }, { t: 1, r: 0 }] } };
const idle: ClipDef = { id: 'idle', durationMs: 1000, loop: true, tracks: { torso: [{ t: 0, r: 0 }, { t: 0.5, r: 10 }, { t: 1, r: 0 }] } };
const walk: ClipDef = { id: 'walk', durationMs: 500, loop: true, tracks: {}, proc: ['walkBiped'] };
const die: ClipDef = { id: 'die', durationMs: 800, loop: false, tracks: { root: [{ t: 0 }, { t: 1, x: -30 }] }, alpha: [{ t: 0, v: 1 }, { t: 1, v: 0 }] };
const hit: ClipDef = { id: 'hit', durationMs: 160, loop: false, tracks: { root: [{ t: 0 }, { t: 0.5, x: -5 }, { t: 1 }] } };

describe('easing and sampling', () => {
  it('eases between 0 and 1', () => {
    for (const e of ['linear', 'in', 'out', 'inOut', 'outBack'] as const) {
      expect(ease(e, 0)).toBeCloseTo(0);
      expect(ease(e, 1)).toBeCloseTo(1);
    }
    expect(ease('step', 0.99)).toBe(0);
  });
  it('samples keyframes with neutral defaults', () => {
    expect(sampleTrack([{ t: 0, r: 0 }, { t: 1, r: 10 }], 0.5).r).toBeCloseTo(5);
    expect(sampleTrack([{ t: 0 }, { t: 1, sx: 2 }], 0.5).sx).toBeCloseTo(1.5);
    expect(sampleTrack([], 0.3)).toEqual({ r: 0, x: 0, y: 0, sx: 1, sy: 1 });
  });
});

describe('impact warp (B5)', () => {
  it('lands the authored impact exactly at impactAtMs, whatever the windup', () => {
    for (const impactAtMs of [120, 300, 450, 900]) {
      const u = clipU({ t: impactAtMs, durationMs: impactAtMs + 300, impactAtMs, loop: false, clip: attack });
      expect(u).toBeCloseTo(0.5, 6);
    }
  });
  it('keeps the recovery length after a moved impact', () => {
    const a = new Animator(resolverFor([idle, attack]), ctx, 1);
    a.play('attack', { impactAtMs: 900 });
    a.update(900);
    expect(a.sample().get('armF')?.r).toBeCloseTo(-90, 3);
    a.update(299);
    expect(a.state.action).toBe('attack');
    a.update(2);
    expect(a.state.action).toBe(null);
    expect(a.state.base).toBe('idle');
  });
  it('real attack clips time-scale the same way (every unit)', () => {
    for (const [id, def] of Object.entries(MANIFEST)) {
      if (!id.startsWith('unit.')) continue;
      const clip = getClip(def.clips['attack']?.ref ?? '');
      expect(clip?.impactAt, id).toBeDefined();
      const u = clipU({ t: 350, durationMs: 700, impactAtMs: 350, loop: false, clip: clip as ClipDef });
      expect(u, id).toBeCloseTo(clip?.impactAt ?? 0, 6);
    }
  });
});

describe('layers', () => {
  it('loops the base clip', () => {
    const a = new Animator(resolverFor([idle]), ctx, 1);
    a.update(500);
    expect(a.sample().get('torso')?.r).toBeCloseTo(10, 3);
    a.update(1000);
    expect(a.sample().get('torso')?.r).toBeCloseTo(10, 3);
  });
  it('die holds its last frame and reports finished; nothing else plays afterwards', () => {
    const a = new Animator(resolverFor([idle, die, attack]), ctx, 1);
    a.play('die');
    a.update(400);
    expect(a.finished).toBe(false);
    a.update(500);
    expect(a.finished).toBe(true);
    a.sample();
    expect(a.alpha).toBeCloseTo(0, 3);
    a.play('attack');
    expect(a.state.action).toBe('die');
  });
  it('hit recoil is additive on top of the action', () => {
    const a = new Animator(resolverFor([idle, attack, hit]), ctx, 1);
    a.play('attack');
    a.play('hit');
    a.update(80);
    expect(a.sample().get('root')?.x).toBeCloseTo(-5, 3);
    expect(a.state.action).toBe('attack');
  });
  it('hitstop freezes time', () => {
    const a = new Animator(resolverFor([idle, attack]), ctx, 1);
    a.play('attack');
    a.update(100);
    const before = a.sample().get('armF')?.r;
    a.freeze(60);
    expect(a.frozen).toBe(true);
    a.update(50);
    expect(a.sample().get('armF')?.r).toBeCloseTo(before ?? 0, 6);
    a.update(20);
    expect(a.frozen).toBe(false);
  });
  it('spawn pops from scale ~0 to 1.15 and back to 1 over 180 ms, starting at once (A11)', () => {
    const def = MANIFEST['unit.bonker'];
    expect(def).toBeDefined();
    if (!def) return;
    const a = new Animator(clipResolver(def), ctx, 1);
    a.play('spawn');
    a.update(0);
    expect(a.sample().get('root')?.sx ?? 1).toBeLessThan(0.1);
    let peak = 0;
    for (let t = 0; t < 180; t += 5) {
      a.update(5);
      peak = Math.max(peak, a.sample().get('root')?.sx ?? 1);
    }
    expect(peak).toBeGreaterThanOrEqual(1.1);
    expect(peak).toBeLessThanOrEqual(1.16);
    a.update(20);
    expect(a.sample().get('root')?.sx ?? 1).toBeCloseTo(1, 6);
    expect(a.state.action).toBe(null);
  });
  it('a turret build drops in from above at once (A11 turret clips)', () => {
    const def = MANIFEST['turret.rock_tosser'];
    expect(def).toBeDefined();
    if (!def) return;
    const a = new Animator(clipResolver(def), ctx, 1);
    a.play('build');
    a.update(0);
    expect(a.sample().get('root')?.y ?? 0).toBeLessThan(-60);
  });
  it('unknown clips are ignored', () => {
    const a = new Animator(resolverFor([idle]), ctx, 1);
    expect(a.play('nope')).toBe(false);
  });
});

describe('walk cycle (A12: no foot sliding)', () => {
  it('advances with ground distance, one cycle per stride', () => {
    const a = new Animator(resolverFor([idle, walk]), ctx, 1);
    a.play('walk');
    a.moved(ctx.strideLu / 4);
    a.update(16);
    const quarter = a.sample().get('legF')?.r;
    a.moved((ctx.strideLu * 3) / 4);
    a.update(16);
    const full = a.sample().get('legF')?.r;
    expect(quarter).toBeCloseTo(legAngle(0.25, 25).angle, 3);
    expect(full).toBeCloseTo(legAngle(0, 25).angle, 3);
  });
  it('a planted foot sweeps the stride linearly (stance half of the cycle)', () => {
    const a0 = legAngle(0, 25).angle;
    const a1 = legAngle(0.25, 25).angle;
    const a2 = legAngle(0.5 - 1e-9, 25).angle;
    expect(a1 - a0).toBeCloseTo(a2 - a1, 3);
    expect(strideFor(16, 25)).toBeCloseTo(4 * 16 * Math.sin((25 * Math.PI) / 180), 6);
  });
});

describe('real puppets', () => {
  it('every unit samples every clip without NaNs', () => {
    for (const [id, def] of Object.entries(MANIFEST)) {
      if (!id.startsWith('unit.')) continue;
      const p = puppetById(def.source);
      expect(p, id).toBeDefined();
      if (!p) continue;
      const a = new Animator(clipResolver(def), procContext(p), 7);
      for (const clip of ['spawn', 'idle', 'walk', 'attack', 'hit', 'stun', 'die', 'victory', 'ability']) {
        const b = new Animator(clipResolver(def), procContext(p), 7);
        expect(b.play(clip), `${id} ${clip}`).toBe(true);
        for (let t = 0; t < 1200; t += 100) {
          b.update(100);
          for (const [bone, d] of b.sample()) for (const v of Object.values(d)) expect(Number.isFinite(v), `${id} ${clip} ${bone}`).toBe(true);
        }
      }
      a.update(16);
    }
  }, 30000);
});
