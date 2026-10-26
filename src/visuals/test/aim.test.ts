/**
 * Queue item 44: ranged weapons that point where they shoot (visuals side). The drawn-aim table, the aimed flight of
 * both projectile views, the lean spring and the atlas view's aim hooks. Presentation only: none of this reads or
 * changes sim state, and every path lands where and when the sim's shot does.
 */
import { Rectangle, Texture, type Container, type Sprite } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { EffectView, UnitView, VisualDef } from '@/contracts/art';
import { content } from '@/content';
import { AtlasAdapter, type AtlasData } from '../adapters/atlas';
import { aimLeanGoal, angleThroughBody, ANTICIPATION_LEAN_SHARE, clampLean, stepLeanSpring, throughBody } from '../adapters/atlasAim';
import { aimedBulge, classicBulge, launchOf, MAX_BULGE_LU, MAX_LAUNCH_DEG, MAX_RISE_SHARE } from '../effects/flight';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';
import { LEAN_BY_GAIT, leanPolicyOf, UNIT_AIM, unitAimFor, unitAimKey } from '../unitAim';
import { UNIT_SHEETS } from '../unitSheets.gen';

// ---------------------------------------------------------------------------------------------
// The table

const sheetByKey = new Map(UNIT_SHEETS.map((s) => [`${s.age}/${s.slug}`, s]));

/** Every unit with a sheet whose attack (or riders') fires a projectile or an instant effect, and the clips that fire it. */
function rangedSheets(): { key: string; card: string; clips: string[] }[] {
  const out: { key: string; card: string; clips: string[] }[] = [];
  for (const u of Object.values(content.units)) {
    const s = UNIT_SHEETS.find((x) => x.visualId === u.visualId);
    if (!s) continue;
    const clips: string[] = [];
    if (u.attacks[0]?.projectile) clips.push(...['attack', 'attack_b', 'attack_c'].filter((c) => s.clips[c]));
    const riders = u.abilities.some((a) => a.kind === 'riders' && a.attack.projectile);
    if ((u.attacks.slice(1).some((a) => a.projectile) || riders) && s.clips['attack_alt']) clips.push('attack_alt');
    if (clips.length) out.push({ key: `${s.age}/${s.slug}`, card: u.id, clips });
  }
  return out;
}

describe('the drawn-aim table (unitAim.ts)', () => {
  it('has an entry for every ranged unit sheet, for every attack clip that fires', () => {
    const ranged = rangedSheets();
    expect(ranged.length).toBeGreaterThan(80);
    for (const r of ranged) {
      const e = UNIT_AIM[r.key];
      expect(e, r.key).toBeDefined();
      for (const c of r.clips) expect(e?.clips[c], `${r.key} ${c}`).toBeDefined();
    }
  });

  it('names only installed sheets and their clips, with sane angles and release points inside the frame', () => {
    for (const [key, e] of Object.entries(UNIT_AIM)) {
      const s = sheetByKey.get(key);
      expect(s, key).toBeDefined();
      if (!s) continue;
      for (const [clip, a] of Object.entries(e.clips)) {
        expect(s.clips[clip], `${key} ${clip}`).toBeDefined();
        if (!a) continue;
        expect(a.deg, `${key} ${clip}`).toBeGreaterThanOrEqual(-60);
        expect(a.deg, `${key} ${clip}`).toBeLessThanOrEqual(90);
        if (a.release) {
          expect(Math.abs(a.release[0]), `${key} ${clip}`).toBeLessThan(s.heightLu * 1.5);
          expect(a.release[1], `${key} ${clip}`).toBeGreaterThan(0);
          expect(a.release[1], `${key} ${clip}`).toBeLessThan(s.heightLu * 1.2);
        }
      }
    }
  });

  it('marks the emitters without a direction (drums, sound rings, breath, orbs) and only them', () => {
    const omni = Object.entries(UNIT_AIM).filter(([, e]) => Object.values(e.clips).some((c) => c?.omni)).map(([k]) => k);
    for (const k of ['stone/drum_shaman', 'bronze/aulos_piper', 'medieval/lindworm', 'cosmic/mothership', 'cosmic/star_leviathan']) expect(omni).toContain(k);
    for (const k of ['medieval/longbowman', 'gunpowder/fusilier', 'modern/rifleman']) expect(omni).not.toContain(k);
  });

  it('finds an entry from any copy of a sheet, and a lean policy for every body type', () => {
    expect(unitAimKey('art/units/medieval/longbowman.json')).toBe('medieval/longbowman');
    expect(unitAimKey('art/units/medieval/longbowman.hd.json')).toBe('medieval/longbowman');
    expect(unitAimKey('art/units/medieval/longbowman.x.json')).toBe('medieval/longbowman');
    expect(unitAimKey('art/turrets/medieval/crossbow_nest.json')).toBeNull();
    expect(unitAimFor('art/units/medieval/longbowman.json')?.clips['attack']?.deg).toBe(38);
    expect(unitAimFor('art/units/stone/bonker.json')).toBeNull();
    expect(leanPolicyOf(null, 'biped')).toEqual(LEAN_BY_GAIT.biped);
    expect(leanPolicyOf(null, 'wheeled').maxDeg).toBe(0);
    expect(leanPolicyOf(null, 'fly').pivot).toBe('centre');
    expect(leanPolicyOf(null, null).maxDeg).toBe(0);
    // a crew standing beside its mortar does not tilt the mortar
    expect(leanPolicyOf(UNIT_AIM['industrial/trench_mortar'] ?? null, 'biped').maxDeg).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Aimed paths

describe('aimed paths (effects/flight.ts)', () => {
  it('a bulge makes the path leave at the asked angle, and never curves the path upward', () => {
    for (const [dx, dyUp, deg] of [
      [200, 0, 38],
      [215, -25, 38],
      [150, -108, 19],
      [300, 30, 31],
      [380, 10, 60],
    ] as const) {
      const h = aimedBulge(dx, dyUp, deg);
      if (h < MAX_BULGE_LU) expect(launchOf(dx, dyUp, h), `${dx} ${dyUp} ${deg}`).toBeCloseTo(deg, 6);
    }
    // a weapon at or below the line: straight
    expect(aimedBulge(200, 10, 0)).toBe(0);
    expect(aimedBulge(200, 0, -10)).toBe(0);
    // a level launch at a target below: the gravity drop (it leaves level)
    const drop = aimedBulge(100, -60, 0);
    expect(drop).toBeCloseTo(15, 6);
    expect(launchOf(100, -60, drop)).toBeCloseTo(0, 6);
  });

  it('caps the steepest launch, the highest bulge and the climb, and keeps the classic arc for shots without an aim', () => {
    // the launch is capped first (89 → 70 degrees, here at a target high above) ...
    expect(aimedBulge(100, 200, 89)).toBeCloseTo(aimedBulge(100, 200, MAX_LAUNCH_DEG), 9);
    expect(launchOf(100, 200, aimedBulge(100, 200, 89))).toBeCloseTo(MAX_LAUNCH_DEG, 6);
    expect(aimedBulge(2000, 0, 70)).toBe(MAX_BULGE_LU);
    // ... and a steep lob climbs at most half its distance over the higher end (a flare pistol fired straight up)
    const peak = (dx: number, dyUp: number, h: number) => {
      let top = -Infinity;
      for (let u = 0; u <= 1; u += 1 / 4000) top = Math.max(top, dyUp * u + 4 * h * u * (1 - u));
      return top - Math.max(0, dyUp);
    };
    for (const [dx, dyUp, binds] of [
      [100, 0, true],
      [180, -40, true],
      [300, 0, true],
      // a target well above: the 70 degree launch binds before the climb does
      [150, 60, false],
    ] as const) {
      const h = aimedBulge(dx, dyUp, 89);
      if (binds) expect(peak(dx, dyUp, h), `${dx} ${dyUp}`).toBeCloseTo(MAX_RISE_SHARE * dx, 1);
      else expect(peak(dx, dyUp, h), `${dx} ${dyUp}`).toBeLessThan(MAX_RISE_SHARE * dx);
      expect(launchOf(dx, dyUp, h)).toBeLessThanOrEqual(MAX_LAUNCH_DEG + 1e-9);
    }
    expect(launchOf(100, 0, aimedBulge(100, 0, 89))).toBeCloseTo((Math.atan(2) * 180) / Math.PI, 6);
    // a gentler lob and the bomb's drop stay as asked
    expect(launchOf(200, 0, aimedBulge(200, 0, 38))).toBeCloseTo(38, 6);
    expect(launchOf(40, -88, aimedBulge(40, -88, 0))).toBeCloseTo(0, 6);
    expect(classicBulge(50)).toBe(28);
    expect(classicBulge(300)).toBeCloseTo(96, 6);
    expect(classicBulge(1000)).toBe(170);
  });
});

type AimedEffect = EffectView & { flyAimed(from: { x: number; y: number }, to: { x: number; y: number }, ms: number, o: { launchDeg: number; path: 'ballistic' | 'straight' }): void };

/** The flying sprite of a procedural projectile (its layer's last child). */
const flying = (e: EffectView): Sprite => {
  const layer = e.root.children[0] as Container;
  return layer.children[layer.children.length - 1] as Sprite;
};

describe('the procedural projectile view flies aimed', () => {
  const art = createArtProvider({ warn: () => {} });

  it('leaves along the weapon, lands where and when the sim says, and points along its path', () => {
    const e = art.createProjectile('proj.arrow', 0) as AimedEffect;
    e.flyAimed({ x: 0, y: -50 }, { x: 200, y: -30 }, 400, { launchDeg: 38, path: 'ballistic' });
    const s = flying(e);
    expect((-s.rotation * 180) / Math.PI).toBeCloseTo(38, 4);
    e.update(200);
    // mid flight: above the straight line, still climbing or level
    expect(e.root.y + s.y).toBeLessThan(-40);
    e.update(199);
    // x runs linearly in time (399 of 400 ms)
    expect(e.root.x + s.x).toBeCloseTo(199.5, 6);
    e.update(1);
    // lands exactly on the target at the sim's time, heading down
    expect(e.root.x + s.x).toBeCloseTo(200, 6);
    expect(e.root.y + s.y).toBeCloseTo(-30, 6);
    expect(s.rotation).toBeGreaterThan(0);
    e.destroy();
  });

  it('a straight path and a weapon below its target fly straight; a rolling log always rolls', () => {
    const e = art.createProjectile('proj.bullet', 0) as AimedEffect;
    e.flyAimed({ x: 0, y: -50 }, { x: 200, y: -30 }, 200, { launchDeg: 5, path: 'straight' });
    const s = flying(e);
    expect(s.rotation).toBeCloseTo(Math.atan2(20, 200), 6);
    e.update(100);
    expect(e.root.y + s.y).toBeCloseTo(-40, 6);
    e.destroy();
    const b = art.createProjectile('proj.bolt', 0) as AimedEffect;
    b.flyAimed({ x: 0, y: -30 }, { x: 200, y: -30 }, 200, { launchDeg: -6, path: 'ballistic' });
    b.update(100);
    expect(b.root.y + flying(b).y).toBeCloseTo(-30, 6);
    b.destroy();
  });

  it('a bomb from a plane drops: it leaves level and lands on its target', () => {
    const e = art.createProjectile('proj.bomb', 1) as AimedEffect;
    e.flyAimed({ x: 500, y: -118 }, { x: 460, y: -30 }, 400, { launchDeg: 0, path: 'ballistic' });
    const s = flying(e);
    expect(Math.abs(Math.sin(s.rotation))).toBeLessThan(1e-6);
    e.update(400);
    expect(e.root.x + s.x).toBeCloseTo(460, 6);
    expect(e.root.y + s.y).toBeCloseTo(-30, 6);
    e.destroy();
  });
});

// ---------------------------------------------------------------------------------------------
// The lean

describe('the aim lean (atlasAim.ts)', () => {
  const tm = (t: number) => ({ t, impactAtMs: 400, releaseMs: 520 });

  it('anticipates a little the other way, holds the lean through the release, then stands up', () => {
    expect(aimLeanGoal(10, tm(20), false)).toBeCloseTo(-10 * ANTICIPATION_LEAN_SHARE, 6);
    expect(aimLeanGoal(10, tm(200), false)).toBe(10);
    expect(aimLeanGoal(10, tm(450), false)).toBe(10);
    expect(aimLeanGoal(10, tm(600), false)).toBe(0);
    expect(aimLeanGoal(10, null, false)).toBe(0);
    // reduce motion: no anticipation
    expect(aimLeanGoal(10, tm(20), true)).toBe(10);
  });

  it('springs toward the goal with a small follow-through, critically damped under reduce motion', () => {
    const s = { x: 0, v: 0 };
    let peak = 0;
    for (let t = 0; t < 1000; t += 16) {
      stepLeanSpring(s, 10, 16, false);
      peak = Math.max(peak, s.x);
    }
    expect(s.x).toBeCloseTo(10, 1);
    expect(peak).toBeGreaterThan(10);
    expect(peak).toBeLessThan(11.5);
    const r = { x: 0, v: 0 };
    let rp = 0;
    for (let t = 0; t < 1000; t += 16) {
      stepLeanSpring(r, 10, 16, true);
      rp = Math.max(rp, r.x);
    }
    expect(rp).toBeLessThanOrEqual(10.0001);
    // back upright, it settles exactly
    for (let t = 0; t < 2000; t += 16) stepLeanSpring(s, 0, 16, false);
    expect(s).toEqual({ x: 0, v: 0 });
  });

  it('clamps by the body, halved under reduce motion', () => {
    expect(clampLean(30, 14, false)).toBe(14);
    expect(clampLean(-30, 14, true)).toBe(-7);
    expect(clampLean(5, 0, false)).toBe(0);
    expect(clampLean(Number.NaN, 14, false)).toBe(0);
  });

  it('carries points and weapon angles through the body transform for both facings', () => {
    const up10 = (10 * Math.PI) / 180;
    // facing right, leaned 10 degrees back (a counter-clockwise turn on screen is a negative Pixi rotation)
    const r = throughBody({ x: 0, y: 0, rotation: -up10, sx: 1, sy: 1 }, { x: 30, y: 0 }, { x: 0, y: 0 });
    expect(r.x).toBeCloseTo(30 * Math.cos(up10), 6);
    expect(r.y).toBeCloseTo(-30 * Math.sin(up10), 6);
    expect(angleThroughBody({ x: 0, y: 0, rotation: -up10, sx: 1, sy: 1 }, 20, 1)).toBeCloseTo(30, 6);
    // facing left (sx = -1), the same lean is a positive rotation
    expect(angleThroughBody({ x: 0, y: 0, rotation: up10, sx: -1, sy: 1 }, 20, -1)).toBeCloseTo(30, 6);
    const l = throughBody({ x: 5, y: 0, rotation: 0, sx: -1, sy: 1 }, { x: 30, y: -40 }, { x: 0, y: 0 });
    expect(l).toEqual({ x: -25, y: -40 });
  });
});

// ---------------------------------------------------------------------------------------------
// The atlas view's hooks

const frame = (w: number, h: number): Texture => new Texture({ orig: new Rectangle(0, 0, w, h), trim: new Rectangle(0, 0, w, h), defaultAnchor: { x: 0.5, y: 1 } });

function sheet(extra: Record<string, unknown> = {}): AtlasData {
  const f = () => [frame(80, 80), frame(80, 80), frame(80, 80), frame(80, 80)];
  return {
    luPerUnit: 1,
    animations: { idle: f(), walk: f(), attack: f(), attack_b: f(), hit: f(), die: f() },
    clips: {
      idle: { durationsMs: [200, 200, 200, 200], loop: true },
      walk: { durationsMs: [150, 150, 150, 150], loop: true, naturalSpeedLuPerS: 60 },
      attack: { durationsMs: [100, 200, 100, 200], impactAt: 0.5, impactStep: 2, holdStep: 1, muzzle: [30, 40], ...extra },
      attack_b: { durationsMs: [100, 200, 100, 200], impactAt: 0.5, impactStep: 2, holdStep: 1, muzzle: [32, 30] },
      hit: { durationsMs: [100, 100, 100, 100] },
      die: { durationsMs: [100, 100, 100, 100], hideUnitAtMs: 400 },
    },
    heightLu: 68,
    gait: 'biped',
  } as unknown as AtlasData;
}

type AimHooks = UnitView & {
  aimInfo(): { variants: { anim: string; deg: number; omni: boolean }[]; next: string | null; maxLeanDeg: number } | null;
  aimLean(deg: number): void;
  aimNow(i?: number): { x: number; y: number; deg: number; drawnDeg: number; leanDeg: number; omni: boolean } | null;
  muzzleNow(i?: number): { x: number; y: number } | null;
  setIdentity(o: { id: number; seed: number }): void;
  setMotion(m: { reduce: boolean; lite: boolean }): void;
  setGait(o: { speedLuPerS: number }): void;
};

function view(source: string, s: AtlasData, side: 0 | 1 = 0, gait = 'biped'): AimHooks {
  const base = MANIFEST['unit.bonker'];
  if (!base) throw new Error('bonker');
  const def: VisualDef = { ...base, source, heightLu: 68, events: { attack: { impactAt: 0.5 } } };
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker });
  a.register(source, { ...s, heightLu: 68, gait } as AtlasData);
  const v = a.createUnit({ key: 'unit.bonker', def, side, teamPreset: 'default', seed: 3 }) as unknown as AimHooks;
  v.setIdentity({ id: 2, seed: 3 });
  v.setPose({ x: 100, y: 0, facing: side === 0 ? 1 : -1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'ranged' });
  v.setGait({ speedLuPerS: 0 });
  return v;
}

const bodyOf = (v: UnitView): Container => v.root.children[1] as Container;

describe('the atlas view aims (aimInfo, aimLean, aimNow)', () => {
  it('reports the drawn aim of its loaded variants from the table, and its lean from its body type', () => {
    const v = view('art/units/medieval/longbowman.json', sheet());
    const info = v.aimInfo();
    expect(info?.variants).toEqual([
      { anim: 'attack', deg: 38, omni: false },
      { anim: 'attack_b', deg: 2, omni: false },
    ]);
    expect(info?.maxLeanDeg).toBe(LEAN_BY_GAIT.biped.maxDeg);
    v.setMotion({ reduce: true, lite: false });
    expect(v.aimInfo()?.maxLeanDeg).toBe(LEAN_BY_GAIT.biped.maxDeg / 2);
    // a sheet without an entry aims level
    expect(view('art/units/stone/bonker.json', sheet()).aimInfo()?.variants.map((x) => x.deg)).toEqual([0, 0]);
  });

  it('a sheet that writes its own aim wins over the table', () => {
    const v = view('art/units/medieval/longbowman.json', sheet({ aimDeg: 20, release: [10, 50] }));
    expect(v.aimInfo()?.variants[0]?.deg).toBe(20);
    v.play('attack', { impactAtMs: 300, variant: 'attack' } as never);
    expect(v.muzzleNow(0)).toEqual({ x: 10, y: -50 });
  });

  it('a clip whose impact frame shows the follow-through releases where the table says', () => {
    const v = view('art/units/bronze/javelineer.json', sheet());
    v.play('attack', { impactAtMs: 300, variant: 'attack' } as never);
    expect(v.muzzleNow(0)).toEqual({ x: 50, y: -34 });
  });

  it('leans toward its target through the attack, the muzzle and the weapon with it, and stands up after', () => {
    const v = view('art/units/medieval/longbowman.json', sheet());
    v.play('attack', { impactAtMs: 300, variant: 'attack' } as never);
    v.aimLean(10);
    v.update(16);
    // the anticipation dips the other way first
    expect(bodyOf(v).rotation).toBeGreaterThan(0);
    for (let t = 0; t < 280; t += 16) v.update(16);
    const r = bodyOf(v).rotation;
    expect((-r * 180) / Math.PI).toBeGreaterThan(8);
    expect((-r * 180) / Math.PI).toBeLessThan(12);
    const now = v.aimNow(0);
    expect(now?.drawnDeg).toBe(38);
    expect(now?.deg).toBeCloseTo(38 + (-r * 180) / Math.PI, 4);
    expect(now?.leanDeg).toBeCloseTo((-r * 180) / Math.PI, 4);
    // the muzzle turned with the body about the feet
    const m = v.muzzleNow(0) ?? { x: 0, y: 0 };
    const c = Math.cos(r);
    const s = Math.sin(r);
    expect(now?.x).toBeCloseTo(bodyOf(v).x + m.x * c - m.y * s, 4);
    expect(now?.y).toBeCloseTo(bodyOf(v).y + m.x * s + m.y * c, 4);
    for (let t = 0; t < 1500; t += 16) v.update(16);
    expect(bodyOf(v).rotation).toBeCloseTo(0, 6);
  });

  it('facing left, the same lean turns the other way and still raises the weapon', () => {
    const v = view('art/units/medieval/longbowman.json', sheet(), 1);
    v.play('attack', { impactAtMs: 300, variant: 'attack' } as never);
    v.aimLean(10);
    for (let t = 0; t < 300; t += 16) v.update(16);
    expect(bodyOf(v).rotation).toBeGreaterThan(0.1);
    expect(v.aimNow(0)?.deg).toBeGreaterThan(45);
  });

  it('wheels and tracks never lean, and the lean is clamped by the body and halved under reduce motion', () => {
    const cart = view('art/units/gunpowder/rocket_cart.json', sheet(), 0, 'wheeled');
    cart.play('attack', { impactAtMs: 300 });
    cart.aimLean(10);
    for (let t = 0; t < 300; t += 16) cart.update(16);
    expect(bodyOf(cart).rotation).toBe(0);
    const v = view('art/units/medieval/longbowman.json', sheet());
    v.setMotion({ reduce: true, lite: false });
    v.play('attack', { impactAtMs: 300, variant: 'attack' } as never);
    v.aimLean(40);
    for (let t = 0; t < 300; t += 16) v.update(16);
    expect((-bodyOf(v).rotation * 180) / Math.PI).toBeCloseTo(LEAN_BY_GAIT.biped.maxDeg / 2, 0);
  });

  it('a new attack aims afresh, and a unit that is not attacking does not lean', () => {
    const v = view('art/units/medieval/longbowman.json', sheet());
    v.aimLean(10);
    for (let t = 0; t < 300; t += 16) v.update(16);
    expect(bodyOf(v).rotation).toBe(0);
    v.play('attack', { impactAtMs: 300 });
    for (let t = 0; t < 300; t += 16) v.update(16);
    expect(bodyOf(v).rotation).toBe(0);
  });
});
