/**
 * ANIM_SPEC render support (R1-R8): walk rate from the measured velocity, frame-locked feet, attack
 * variants with their impact on the sim tick, the hold-step warp, second-attacker routing, extras
 * sheets, cartoon spawn and hit motion, and the code-driven secondary motion. All visual: none of
 * this reads or changes sim state.
 */
import { Texture, type Container, type Sprite } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { UnitView, VisualDef } from '@/contracts/art';
import { AtlasAdapter, atlasVisualDef, inferGait, type AtlasData, type AtlasJson } from '../adapters/atlas';
import {
  attackCycle,
  attackTimeline,
  extrasSheetUrl,
  frameLockOffset,
  gaitWalkDurationMs,
  HOLD_LOOP_AFTER_MS,
  hitSquash,
  hoverBob,
  HOVER_AMP_LU,
  impactStepOf,
  leanTarget,
  LEAN_MAX_RAD,
  legacyGait,
  loopStepAt,
  mergeExtras,
  pickAttackVariant,
  spawnPop,
  SPAWN_POP,
  timelineImpactMs,
  timelineStepAt,
  walkDirection,
} from '../adapters/atlasMotion';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';

const sum = (a: readonly number[]): number => a.reduce((x, y) => x + y, 0);

describe('R1: walk rate from the measured velocity', () => {
  it('sizes the cycle by natural / |speed|, clamped to 0.33x-3x, and plays backward for a negative speed', () => {
    expect(gaitWalkDurationMs(500, 60, 60)).toBeCloseTo(500);
    expect(gaitWalkDurationMs(500, 60, 120)).toBeCloseTo(250);
    expect(gaitWalkDurationMs(500, 60, -60)).toBeCloseTo(500);
    expect(gaitWalkDurationMs(500, 60, 5)).toBeCloseTo(1500);
    expect(gaitWalkDurationMs(500, 60, 0)).toBeCloseTo(1500);
    expect(gaitWalkDurationMs(500, 60, 1000)).toBeCloseTo(165);
    expect(gaitWalkDurationMs(500, undefined, 90)).toBe(500);
    expect(walkDirection(40)).toBe(1);
    expect(walkDirection(-40)).toBe(-1);
  });
});

describe('R2: frame-locked root motion', () => {
  it('finds the step and the time since it began, forward and backward, wrapping the cycle', () => {
    const steps = [100, 100, 100, 100];
    expect(loopStepAt(steps, 400, 150)).toEqual({ step: 1, sinceMs: 50 });
    expect(loopStepAt(steps, 400, 150, -1)).toEqual({ step: 1, sinceMs: 50 });
    expect(loopStepAt(steps, 400, 130, -1)).toEqual({ step: 1, sinceMs: 70 });
    expect(loopStepAt(steps, 400, -50)).toEqual({ step: 3, sinceMs: 50 });
    // played at twice the authored rate
    expect(loopStepAt(steps, 200, 60)).toEqual({ step: 1, sinceMs: 10 });
  });

  it('is 0 at a frame start and -v*dt inside a frame', () => {
    expect(frameLockOffset(90, 0)).toBeCloseTo(0);
    expect(frameLockOffset(90, 50)).toBeCloseTo(-4.5);
    expect(frameLockOffset(-90, 50)).toBeCloseTo(4.5);
  });
});

describe('R4: attack variant cycle', () => {
  it('cycles [A, B, A, C] from an offset by unit id, and falls back to A', () => {
    const all = attackCycle(() => true);
    expect(all).toEqual(['attack', 'attack_b', 'attack', 'attack_c']);
    expect(attackCycle((a) => a === 'attack_b')).toEqual(['attack', 'attack_b']);
    expect(attackCycle((a) => a === 'attack_c')).toEqual(['attack', 'attack_c']);
    expect(attackCycle(() => false)).toEqual(['attack']);
    expect([0, 1, 2, 3, 4].map((n) => pickAttackVariant(all, 0, n))).toEqual(['attack', 'attack_b', 'attack', 'attack_c', 'attack']);
    // two units side by side do not swing in step
    expect(pickAttackVariant(all, 1, 0)).not.toBe(pickAttackVariant(all, 2, 0));
    expect(pickAttackVariant(all, 5, 2)).toBe(pickAttackVariant(all, 1, 2));
    expect(pickAttackVariant(['attack'], 7, 3)).toBe('attack');
    expect(pickAttackVariant(all, -3, 0)).toBe('attack_b');
  });
});

describe('R5: the hold step absorbs the wind-up', () => {
  // the Mammoth's attack: impact at step 6 (570 ms authored before it)
  const steps = [70, 90, 100, 200, 60, 50, 150, 90, 110, 100, 100, 110];
  const post = sum(steps.slice(6));

  it('finds the impact step from impactFrame or impactAt', () => {
    expect(impactStepOf(steps, 0.4634, 6)).toBe(6);
    expect(impactStepOf(steps, 0.4634)).toBe(6);
    expect(impactStepOf([100, 100, 100, 100], 0.5)).toBe(2);
    expect(impactStepOf(steps, null)).toBeNull();
  });

  it('maps a unique-frame impactFrame through sequence (review B2: Bonker C taps the same frames twice)', () => {
    // Bonker C: frames 0,1,0,1 tap, then 2 (hold), 3 (smear), 4 = the impact (A's frame 6), then the settle
    const d = [40, 45, 35, 40, 102, 28, 120, 60, 50, 70, 90];
    const seq = [0, 1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(impactStepOf(d, 0.4265, 4, seq)).toBe(6);
    // without impactAt: the explicit step, else the frame through the sequence
    expect(impactStepOf(d, null, 4, seq, 6)).toBe(6);
    expect(impactStepOf(d, null, 4, seq)).toBe(6);
    expect(sum(d.slice(0, 6))).toBe(290);
  });

  it.each([
    ['even warp, W > P', 1140, undefined, undefined],
    ['even warp, W < P', 300, undefined, undefined],
    ['hold, W = P', 570, 3, undefined],
    ['hold, W > P', 1000, 3, undefined],
    ['hold + holdLoop, W > P', 1400, 3, [4, 5] as const],
    ['hold, W slightly < P', 400, 3, undefined],
    ['hold, W far < P', 100, 3, undefined],
    ['hold, no wind-up', 0, 3, undefined],
  ])('%s: the impact step starts exactly at W and the recovery keeps its length', (_n, W, hold, loop) => {
    const tl = attackTimeline(steps, 6, W, hold, loop);
    expect(timelineImpactMs(tl, 6)).toBeCloseTo(W, 6);
    expect(sum(tl.map((s) => s.ms))).toBeCloseTo(W + post, 6);
    expect(timelineStepAt(tl, W - 0.01)).not.toBe(6);
    expect(timelineStepAt(tl, W + 0.01)).toBe(6);
    for (const s of tl) expect(s.ms).toBeGreaterThanOrEqual(0);
  });

  it('puts all the extra wind-up on the hold step; the smear and the other steps keep their length', () => {
    const tl = attackTimeline(steps, 6, 1000, 3);
    expect(tl.find((s) => s.step === 3)?.ms).toBeCloseTo(200 + 430);
    expect(tl.find((s) => s.step === 4)?.ms).toBe(60);
    // no holdStep: the old even warp stretches every step (the smear too)
    expect(attackTimeline(steps, 6, 1140).find((s) => s.step === 4)?.ms).toBeCloseTo(120);
  });

  it('loops the two holdLoop steps once the hold passes 200 ms', () => {
    const tl = attackTimeline(steps, 6, 1400, 3, [4, 5]);
    const holdIdx = tl.findIndex((s) => s.step === 3);
    expect(tl[holdIdx]?.ms).toBeCloseTo(HOLD_LOOP_AFTER_MS);
    const loopSegs = tl.slice(holdIdx + 1, tl.findIndex((s, i) => i > holdIdx && s.step === 4 && tl[i + 1]?.step === 5 && tl[i + 2]?.step === 6));
    expect(loopSegs.length).toBeGreaterThan(2);
    expect(new Set(loopSegs.map((s) => s.step))).toEqual(new Set([4, 5]));
    // a hold of 200 ms or less does not loop
    expect(HOLD_LOOP_AFTER_MS).toBe(200);
    expect(attackTimeline(steps, 6, 570, 3, [4, 5]).filter((s) => s.step === 4)).toHaveLength(1);
  });

  it('shrinks the hold first (to 40%), then the rest evenly', () => {
    const tl = attackTimeline(steps, 6, 450, 3);
    expect(tl.find((s) => s.step === 3)?.ms).toBeCloseTo(200 - 120);
    expect(tl.find((s) => s.step === 0)?.ms).toBeCloseTo(70 * ((370 - 0) / 370));
    const tl2 = attackTimeline(steps, 6, 400, 3);
    expect(tl2.find((s) => s.step === 3)?.ms).toBeCloseTo(80);
    expect(tl2.find((s) => s.step === 0)?.ms).toBeCloseTo(70 * (320 / 370));
  });
});

describe('R6: cartoon spawn pop and hit squash', () => {
  it('pops 0 -> peak -> 1; heavies slower with a smaller overshoot', () => {
    for (const m of ['light', 'medium', 'heavy'] as const) {
      const w = SPAWN_POP[m];
      expect(spawnPop(m, 0)).toBe(0);
      expect(spawnPop(m, w.ms * 0.6)).toBeCloseTo(w.peak);
      expect(spawnPop(m, w.ms)).toBe(1);
    }
    expect(SPAWN_POP.light.peak).toBeCloseTo(1.15);
    expect(SPAWN_POP.heavy.peak).toBeCloseTo(1.08);
    expect(SPAWN_POP.heavy.ms).toBeGreaterThan(SPAWN_POP.light.ms);
  });

  it('squashes 0.9/1.1 light, 0.97/1.03 heavy, out in 90 ms and back by 210 ms', () => {
    expect(hitSquash('light', 90)).toEqual({ sx: expect.closeTo(1.1, 6) as number, sy: expect.closeTo(0.9, 6) as number });
    expect(hitSquash('heavy', 90).sy).toBeCloseTo(0.97);
    expect(hitSquash('medium', 90).sy).toBeCloseTo(0.94);
    expect(hitSquash('light', 0)).toEqual({ sx: 1, sy: 1 });
    expect(hitSquash('light', 210)).toEqual({ sx: 1, sy: 1 });
  });
});

describe('R8: secondary motion helpers', () => {
  it('hover bob stays within its amplitude; lean is capped at 3 degrees, against acceleration on the ground', () => {
    let lo = 0;
    let hi = 0;
    for (let t = 0; t < 2000; t += 10) {
      lo = Math.min(lo, hoverBob(t, 1400, 0.3));
      hi = Math.max(hi, hoverBob(t, 1400, 0.3));
    }
    expect(hi).toBeCloseTo(HOVER_AMP_LU, 1);
    expect(lo).toBeCloseTo(-HOVER_AMP_LU, 1);
    expect(leanTarget(5000, false)).toBeCloseTo(-LEAN_MAX_RAD);
    expect(leanTarget(-5000, false)).toBeCloseTo(LEAN_MAX_RAD);
    // flyers flare the nose up on a stop (G8)
    expect(leanTarget(-5000, true)).toBeCloseTo(-LEAN_MAX_RAD);
    expect(leanTarget(0, false)).toBeCloseTo(0);
  });
});

describe('gaits of the shipped sheets (from the puppet until a sheet writes meta.ageborn.gait)', () => {
  it.each([
    ['unit.bonker', 'biped'],
    ['unit.mammoth_matriarch', 'quad'],
    ['unit.destrier_knight', 'rider'],
    ['unit.bronze_colossus', 'walker'],
    ['unit.scorpion', 'wheeled'],
    // a rider that pulls wheels rolls: no frame lock on its hull (review N3)
    ['unit.war_chariot', 'wheeled'],
    ['unit.balloon_admiral', 'fly'],
    ['unit.hover_tank', 'hover'],
  ])('%s walks as %s', (id, gait) => {
    const def = MANIFEST[id];
    if (!def) throw new Error(id);
    expect(inferGait(id, def)).toBe(gait);
  });

  it('maps families and keeps tall bipeds heavy', () => {
    expect(legacyGait('biped', 68)).toBe('biped');
    expect(legacyGait('biped', 120)).toBe('heavy');
    expect(legacyGait('vehicle', 90)).toBe('wheeled');
    expect(legacyGait('quadruped', 60, { air: true })).toBe('fly');
    expect(legacyGait(undefined, 60)).toBeNull();
  });
});

describe('P4: extras sheets', () => {
  it('names the extras sheet next to the core sheet', () => {
    expect(extrasSheetUrl('/ageborn/art/units/stone/bonker.json')).toBe('/ageborn/art/units/stone/bonker.x.json');
    expect(extrasSheetUrl('/ageborn/art/units/stone/bonker.hd.json')).toBe('/ageborn/art/units/stone/bonker.x.hd.json');
  });

  it('merges variant animations, reusing core frames by name; the core wins; a scale mismatch merges nothing', () => {
    const a0 = new Texture();
    const a1 = new Texture();
    const b0 = new Texture();
    const core = { animations: { attack: [a0, a1] }, clips: { attack: { impactAt: 0.5 } }, luPerUnit: 1, textures: { a0, a1 } };
    const x = {
      animations: {},
      clips: { attack_b: { impactAt: 0.5 }, attack: { impactAt: 0.9 } },
      luPerUnit: 1,
      textures: { b0 },
      frameNames: { attack_b: ['a0', 'b0', 'a1'], attack: ['b0'], attack_c: ['missing'] },
    };
    expect(mergeExtras(core, x)).toEqual(['attack_b']);
    expect(core.animations).toMatchObject({ attack_b: [a0, b0, a1], attack: [a0, a1] });
    expect(core.clips).toMatchObject({ attack: { impactAt: 0.5 }, attack_b: { impactAt: 0.5 } });
    const other = { animations: { attack: [a0] }, clips: {}, luPerUnit: 1 };
    expect(mergeExtras(other, { ...x, luPerUnit: 0.5 })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// The atlas unit view

const tex = (n: number): Texture[] => Array.from({ length: n }, () => new Texture());

interface TestSheet {
  data: AtlasData;
  anims: Record<string, Texture[]>;
}

function sheet(extra: Partial<Record<string, { n: number; meta: AtlasData['clips'][string] }>> = {}, o: { contacts?: boolean } = {}): TestSheet {
  const anims: Record<string, Texture[]> = { idle: tex(20), walk: tex(8), attack: tex(5), hit: tex(2), die: tex(3) };
  const clips: Record<string, AtlasData['clips'][string]> = {
    idle: { durationsMs: Array(20).fill(46) as number[], loop: true },
    walk: { durationsMs: Array(8).fill(62.5) as number[], loop: true, naturalSpeedLuPerS: 60, ...(o.contacts ? { contacts: [{ step: 0, atLu: 6 }, { step: 4, atLu: -6 }] } : {}) },
    attack: { durationsMs: [100, 100, 200, 100, 100], impactAt: 0.4, impactFrame: 3, anchorsLu: { muzzle: [[1, 1], [2, 2], [3, 3], [20, 30], [4, 4]] } },
    hit: { durationsMs: [100, 100] },
    die: { durationsMs: [100, 100, 100], hideUnitAtMs: 300 },
  };
  for (const [name, e] of Object.entries(extra)) {
    if (!e) continue;
    anims[name] = tex(e.n);
    clips[name] = e.meta;
  }
  return { data: { luPerUnit: 1, animations: anims, clips }, anims };
}

function view(id: string, s: TestSheet, side: 0 | 1 = 0): UnitView & Record<string, unknown> {
  const def = MANIFEST[id];
  if (!def) throw new Error(id);
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker });
  // keep the drawn height equal to the sheet's so the test reads sheet lu directly
  const d: VisualDef = { ...def, heightLu: def.heightLu };
  a.register(def.source, { ...s.data, heightLu: def.heightLu });
  return a.createUnit({ key: id, def: d, side, teamPreset: 'default', seed: 9 }) as UnitView & Record<string, unknown>;
}

const body = (v: UnitView): Container => v.root.children[1] as Container;
const shown = (v: UnitView): Texture => (body(v).children[1] as Sprite).texture;
const animOf = (s: TestSheet, t: Texture): string => Object.entries(s.anims).find(([, list]) => list.includes(t))?.[0] ?? '?';
const frameOf = (s: TestSheet, t: Texture): number => Object.values(s.anims).find((list) => list.includes(t))?.indexOf(t) ?? -1;

type Gaited = UnitView & {
  setGait(o: { speedLuPerS: number }): void;
  setIdentity(o: { id: number; seed: number }): void;
  playAlt(o: { impactAtMs?: number }): void;
  muzzleNow(i?: number): { x: number; y: number } | null;
  drainFootfalls(): number;
};

const pose = (x: number, facing: 1 | -1 = 1) => ({ x, y: 0, facing, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none' as const, roleGlyph: 'infantry' as const });

describe('atlas unit view: attack variants (R4, R5)', () => {
  const variants = () =>
    sheet({
      attack_b: { n: 5, meta: { durationsMs: [100, 100, 200, 100, 100], impactAt: 0.4, impactFrame: 3, holdStep: 2, muzzle: [24, 28] } },
      attack_c: { n: 5, meta: { durationsMs: [100, 100, 200, 100, 100], impactAt: 0.4, impactFrame: 3 } },
    });

  it('plays the per-unit cycle; two units with different ids start on different variants', () => {
    const s = variants();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setIdentity({ id: 0, seed: 1 });
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      v.play('attack', { impactAtMs: 400 });
      v.update(1);
      seen.push(animOf(s, shown(v)));
      v.update(1000);
    }
    expect(seen).toEqual(['attack', 'attack_b', 'attack', 'attack_c']);
    const w = view('unit.bonker', s) as unknown as Gaited;
    w.setIdentity({ id: 1, seed: 1 });
    w.play('attack', { impactAtMs: 400 });
    w.update(1);
    expect(animOf(s, shown(w))).toBe('attack_b');
  });

  it('sheets without variants always play A', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setIdentity({ id: 1, seed: 1 });
    for (let i = 0; i < 3; i++) {
      v.play('attack', { impactAtMs: 400 });
      v.update(1);
      expect(animOf(s, shown(v))).toBe('attack');
      v.update(1000);
    }
  });

  it('lands every variant impact frame exactly on the sim impact; the hold step absorbs a long wind-up', () => {
    const s = variants();
    for (const id of [0, 1, 3]) {
      const v = view('unit.bonker', s) as unknown as Gaited;
      v.setIdentity({ id, seed: 1 });
      v.play('attack', { impactAtMs: 700 });
      const anim = (v.update(699), animOf(s, shown(v)));
      expect(frameOf(s, shown(v))).toBe(2);
      v.update(2);
      expect(frameOf(s, shown(v))).toBe(3);
      expect(animOf(s, shown(v))).toBe(anim);
    }
    // with a hold step (B) the steps before the hold keep their authored length; the even warp (A) stretches them
    const b = view('unit.bonker', s) as unknown as Gaited;
    b.setIdentity({ id: 1, seed: 1 });
    b.play('attack', { impactAtMs: 700 });
    b.update(150);
    expect(frameOf(s, shown(b))).toBe(1);
    const a = view('unit.bonker', s) as unknown as Gaited;
    a.setIdentity({ id: 0, seed: 1 });
    a.play('attack', { impactAtMs: 700 });
    a.update(150);
    expect(frameOf(s, shown(a))).toBe(0);
  });

  it('starts projectiles at the playing variant muzzle (meta muzzle, else the impact-frame anchor)', () => {
    const s = variants();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setIdentity({ id: 0, seed: 1 });
    expect(v.muzzleNow(0)).toBeNull();
    v.play('attack', { impactAtMs: 400 });
    expect(v.muzzleNow(0)).toEqual({ x: 20, y: -30 });
    v.update(1000);
    v.play('attack', { impactAtMs: 400 });
    expect(v.muzzleNow(0)).toEqual({ x: 24, y: -28 });
  });
});

describe('atlas unit view: second attackers (R3)', () => {
  const alt = () => {
    const s = sheet({ attack_alt: { n: 4, meta: { durationsMs: [80, 80, 80, 80], impactAt: 0.5, impactFrame: 2, anchorsLu: { muzzle: [[0, 0], [0, 0], [12, 90], [0, 0]] } } } });
    (s.data.clips as Record<string, AtlasData['clips'][string]>)['walk'] = { ...s.data.clips['walk'], anchorsLu: { riderMuzzle: Array(8).fill([10, 80]) as [number, number][] } };
    return s;
  };

  it('plays attack_alt only while standing with no attack playing; never replaces an index-0 attack', () => {
    const s = alt();
    const v = view('unit.mammoth_matriarch', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 0 });
    v.playAlt({ impactAtMs: 160 });
    v.update(1);
    expect(animOf(s, shown(v))).toBe('attack_alt');
    expect(v.muzzleNow(1)).toEqual({ x: 12, y: -90 });
    v.update(1000);
    v.play('attack', { impactAtMs: 400 });
    v.update(1);
    v.playAlt({ impactAtMs: 160 });
    v.update(1);
    expect(animOf(s, shown(v))).toBe('attack');
  });

  it('keeps the gait running while walking and shows an accent at the rider anchor on the impact beat', () => {
    const s = alt();
    const v = view('unit.mammoth_matriarch', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    v.update(1);
    const overlay = v.root.children[2] as Container;
    const before = overlay.children.length;
    v.playAlt({ impactAtMs: 160 });
    v.update(100);
    expect(animOf(s, shown(v))).toBe('walk');
    expect(overlay.children.length).toBe(before);
    v.update(80);
    expect(overlay.children.length).toBeGreaterThan(before);
    expect(v.muzzleNow(1)).toEqual({ x: 10, y: -80 });
  });
});

describe('atlas unit view: walk (R1, R2, R8)', () => {
  it('locks the body where the unit stood when the frame began, then steps at each frame change', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    let x = 0;
    v.setPose(pose(x));
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    let t = 0;
    for (let k = 0; k < 30; k++) {
      x += 0.6;
      t += 10;
      v.setPose(pose(x));
      v.update(10);
      // review M3: the lock starts where the body is (t = 10), so the first frame steps less
      const since = t < 62.5 ? t - 10 : t % 62.5;
      expect(body(v).x).toBeCloseTo(-(60 * since) / 1000, 1);
    }
  });

  it('starts and ends the lock without a pop (review M3)', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    let x = 0;
    v.setPose(pose(x));
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    let last = body(v).x + x;
    for (let k = 0; k < 40; k++) {
      x += 0.6;
      v.setPose(pose(x));
      v.update(10);
      const drawn = body(v).x + x;
      // between frame changes the drawn body never moves backward; a frame change steps it forward
      expect(drawn).toBeGreaterThanOrEqual(last - 1e-6);
      last = drawn;
    }
    // the walk ends with the body behind the sim position: the planted body stays put and settles
    // slowly onto the standing unit's position, it does not snap
    v.setGait({ speedLuPerS: 0 });
    v.play('idle', { loop: true });
    const before = body(v).x;
    v.update(10);
    const jump = Math.abs(body(v).x - before);
    expect(jump).toBeLessThan(Math.max(0.05, Math.abs(before) * 0.05));
    for (let k = 0; k < 30; k++) v.update(100);
    expect(Math.abs(body(v).x)).toBeLessThan(0.06);
  });

  it('holds the body during an attack the sim already walks on, then catches up inside the walk (review M1/M3)', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    let x = 0;
    v.setPose(pose(x));
    v.setGait({ speedLuPerS: 0 });
    v.play('idle', { loop: true });
    v.play('attack', { impactAtMs: 400 });
    v.update(450);
    // the target dies: the sim moves the unit while the impact hold shows; the drawn body stays
    v.setGait({ speedLuPerS: 60 });
    const drawn0 = x + body(v).x;
    for (let k = 0; k < 4; k++) {
      x += 0.6;
      v.setPose(pose(x));
      v.update(10);
      if (animOf(s, shown(v)) === 'attack') expect(x + body(v).x).toBeCloseTo(drawn0, 6);
    }
    // the walk takes over: the drawn body never moves backward and the lag melts away
    v.play('walk', { loop: true });
    let last = x + body(v).x;
    for (let k = 0; k < 60; k++) {
      x += 0.6;
      v.setPose(pose(x));
      v.update(10);
      const d = x + body(v).x;
      expect(d).toBeGreaterThanOrEqual(last - 1e-6);
      expect(d - last).toBeLessThan(5);
      last = d;
    }
    expect(Math.abs(body(v).x)).toBeLessThan(4);
  });

  it('does not lock wheeled units', () => {
    const s = sheet();
    const v = view('unit.scorpion', s) as unknown as Gaited;
    v.setPose(pose(0));
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    for (let k = 1; k < 10; k++) {
      v.setPose(pose(k * 0.6));
      v.update(10);
      expect(Math.abs(body(v).x)).toBeLessThan(1e-6);
    }
  });

  it('plays the cycle backward for a negative velocity and at the velocity rate', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 120 });
    v.play('walk', { loop: true });
    v.update(70);
    expect(frameOf(s, shown(v))).toBe(2);
    const w = view('unit.bonker', s) as unknown as Gaited;
    w.setGait({ speedLuPerS: -60 });
    w.play('walk', { loop: true });
    w.update(30);
    expect(frameOf(s, shown(w))).toBe(7);
    w.update(70);
    expect(frameOf(s, shown(w))).toBe(6);
  });

  it('counts the footfalls of big units on contact steps', () => {
    const s = sheet({}, { contacts: true });
    const v = view('unit.mammoth_matriarch', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    // one cycle (500 ms): the contact on entering step 0, then step 4
    for (let k = 0; k < 98; k++) v.update(5);
    expect(v.drainFootfalls()).toBe(2);
    expect(v.drainFootfalls()).toBe(0);
    const small = view('unit.bonker', s) as unknown as Gaited;
    small.setGait({ speedLuPerS: 60 });
    small.play('walk', { loop: true });
    for (let k = 0; k < 100; k++) small.update(5);
    expect(small.drainFootfalls()).toBe(0);
  });

  it('bobs flyers in code (never stepped) and keeps ground units level at idle', () => {
    const s = sheet();
    const v = view('unit.balloon_admiral', s) as unknown as Gaited;
    const ys: number[] = [];
    for (let k = 0; k < 160; k++) {
      v.update(10);
      ys.push(body(v).y);
    }
    const range = Math.max(...ys) - Math.min(...ys);
    expect(range).toBeGreaterThan(HOVER_AMP_LU * 1.5);
    expect(range).toBeLessThanOrEqual(HOVER_AMP_LU * 2 + 1);
    const g = view('unit.bonker', s);
    g.update(500);
    expect(body(g).y).toBe(0);
  });
});

describe('atlas unit view: review fixes (B1, M1, M2, M4, N2, N4)', () => {
  it('B1: a spawn without spawn frames pops in code and never holds the body (the walk shows)', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 60 });
    v.play('spawn');
    v.play('walk', { loop: true });
    v.update(400);
    expect(animOf(s, shown(v))).toBe('walk');
    expect(body(v).scale.y).toBeCloseTo(1, 6);
  });

  it('B1: a one-shot that falls back to a loop clip plays once', () => {
    const def = atlasVisualDef({ animations: { idle: ['a'], walk: ['b'], attack: ['c'] }, meta: { ageborn: { heightLu: 60, pxPerLu: 1, clips: { idle: { loop: true }, walk: { loop: true }, attack: { impactAt: 0.5 } } } } }, 'x.json');
    expect(def.clips.spawn?.ref).toBe('idle');
    expect(def.clips.spawn?.loop).toBe(false);
    expect(def.clips.idle?.loop).toBe(true);
  });

  it('M1: after the impact hold a unit the sim walks on drops its follow-through for the walk', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 0 });
    v.play('walk', { loop: true });
    v.play('attack', { impactAtMs: 400 });
    v.update(405);
    expect(animOf(s, shown(v))).toBe('attack');
    // the target dies: the sim walks the unit on during the impact hold (impact step 3, 100 ms)
    v.setGait({ speedLuPerS: 60 });
    v.update(50);
    expect(animOf(s, shown(v))).toBe('attack');
    v.update(60);
    expect(animOf(s, shown(v))).toBe('walk');
  });

  it('M2: a hit taken while walking keeps the walk (the squash shows it); standing it plays the hit', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    v.play('hit');
    v.flash(60);
    v.update(30);
    expect(animOf(s, shown(v))).toBe('walk');
    expect(body(v).scale.y).toBeLessThan(1);
    v.setGait({ speedLuPerS: 0 });
    v.play('hit');
    v.update(10);
    expect(animOf(s, shown(v))).toBe('hit');
  });

  it('M4: a walk <-> idle switch cross-dissolves the outgoing frame over about 110 ms', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    const ghost = (): Sprite => body(v).children[3] as Sprite;
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    v.update(30);
    expect(ghost().visible).toBe(true);
    expect(animOf(s, ghost().texture)).toBe('idle');
    v.update(115);
    expect(ghost().visible).toBe(false);
    v.setGait({ speedLuPerS: 0 });
    v.play('idle', { loop: true });
    v.update(10);
    expect(ghost().visible).toBe(true);
    expect(animOf(s, ghost().texture)).toBe('walk');
    expect(ghost().alpha).toBeGreaterThan(0.5);
  });

  it('N2: a rider shot that started during the gore plays attack_alt when the gore ends with time left', () => {
    const s = sheet({ attack_alt: { n: 4, meta: { durationsMs: [80, 80, 80, 80], impactAt: 0.5, impactFrame: 2 } } });
    const v = view('unit.mammoth_matriarch', s) as unknown as Gaited;
    v.setGait({ speedLuPerS: 0 });
    v.play('attack', { impactAtMs: 200 });
    v.update(10);
    v.playAlt({ impactAtMs: 900 });
    v.update(10);
    expect(animOf(s, shown(v))).toBe('attack');
    v.update(400);
    expect(animOf(s, shown(v))).toBe('attack_alt');
    // a hit on the standing Mammoth does not cut the riders' throw short
    v.play('hit');
    v.update(5);
    expect(animOf(s, shown(v))).toBe('attack_alt');
    // little time left: only the accent
    const w = view('unit.mammoth_matriarch', s) as unknown as Gaited;
    w.setGait({ speedLuPerS: 0 });
    w.play('attack', { impactAtMs: 200 });
    w.playAlt({ impactAtMs: 450 });
    w.update(420);
    expect(animOf(s, shown(w))).not.toBe('attack_alt');
  });

  it('N4: a long retreat turns round and walks home forward; it turns back to face the enemy', () => {
    const s = sheet();
    const v = view('unit.bonker', s) as unknown as Gaited;
    v.setPose(pose(100));
    v.setGait({ speedLuPerS: -60 });
    v.play('walk', { loop: true });
    v.update(300);
    expect(body(v).scale.x).toBeGreaterThan(0);
    for (let k = 0; k < 60; k++) v.update(10);
    expect(body(v).scale.x).toBeLessThan(0);
    // walking forward now: the frames advance
    const f0 = frameOf(s, shown(v));
    v.update(70);
    expect((frameOf(s, shown(v)) - f0 + 8) % 8).toBe(1);
    v.setGait({ speedLuPerS: 0 });
    for (let k = 0; k < 40; k++) v.update(10);
    expect(body(v).scale.x).toBeGreaterThan(0);
  });
});

describe('atlas unit view: identity and cartoon motion (R6, R7)', () => {
  it('seeds per unit: the same seed draws the same idle phase, other seeds de-sync', () => {
    const s = sheet();
    const frames = (seed: number): number => {
      const v = view('unit.bonker', s) as unknown as Gaited;
      v.setIdentity({ id: 4, seed });
      v.update(0.001);
      return frameOf(s, shown(v));
    };
    expect(frames(11)).toBe(frames(11));
    const set = new Set([1, 2, 3, 4, 5, 6].map(frames));
    expect(set.size).toBeGreaterThan(2);
  });

  it('pops in on spawn (0 -> 1.15 -> 1) and squashes on a hit', () => {
    const s = sheet();
    const v = view('unit.bonker', s);
    v.play('spawn');
    v.update(1);
    expect(body(v).scale.y).toBeLessThan(0.1);
    v.update(131);
    expect(body(v).scale.y).toBeCloseTo(1.15, 1);
    v.update(200);
    expect(body(v).scale.y).toBeCloseTo(1, 6);
    v.flash(60);
    v.update(90);
    expect(body(v).scale.y).toBeCloseTo(0.9, 2);
    expect(Math.abs(body(v).scale.x)).toBeCloseTo(1.1, 2);
    v.update(200);
    expect(body(v).scale.y).toBeCloseTo(1, 6);
  });
});

describe('extras sheets in the adapter (P4)', () => {
  it('loads <slug>.x.json in the background when the manifest lists variants the core sheet lacks', async () => {
    const def0 = MANIFEST['unit.bonker'];
    if (!def0) throw new Error('bonker');
    const json: AtlasJson = {
      meta: {
        ageborn: {
          heightLu: 68,
          pxPerLu: 1.23,
          clips: { idle: { durationMs: 920, loop: true }, walk: { durationMs: 500, loop: true }, attack: { durationMs: 600, impactAt: 0.4 }, attack_b: { durationMs: 600, impactAt: 0.4 } },
        },
      },
    };
    const def = atlasVisualDef(json, def0.source);
    expect(def.clips['attack_b']).toMatchObject({ kind: 'atlas', ref: 'attack_b', durationMs: 600, loop: false });
    const core = sheet();
    const xb = tex(5);
    const urls: string[] = [];
    const art = createArtProvider({ warn: () => {} });
    const a = new AtlasAdapter({
      entries: () => [def],
      decor: art.procedural.baker,
      baseUrl: '/ageborn/',
      load: async (url) => {
        urls.push(url);
        if (url.endsWith('.x.json')) return { luPerUnit: 1, animations: { attack_b: xb }, clips: { attack_b: { durationsMs: [100, 100, 200, 100, 100], impactAt: 0.4 } } };
        return core.data;
      },
    });
    await a.extrasReady(def.source);
    expect(urls).toEqual(['/ageborn/art/units/stone/bonker.json', '/ageborn/art/units/stone/bonker.x.json']);
    expect(a.sheetFor(def.source)?.animations['attack_b']).toBe(xb);
    // a failed extras sheet keeps A
    const b = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker, baseUrl: '/ageborn/', load: async (url) => (url.endsWith('.x.json') ? Promise.reject(new Error('404')) : sheet().data) });
    const warn = console.warn;
    console.warn = () => {};
    await b.extrasReady(def.source);
    console.warn = warn;
    expect(b.sheetFor(def.source)?.animations['attack_b']).toBeUndefined();
  });
});
