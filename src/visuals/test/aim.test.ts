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
import { aimedBulge, classicBulge, launchOf, MAX_BULGE_LU, MAX_LAUNCH_DEG, MAX_PEAK_LU, MAX_RISE_SHARE } from '../effects/flight';
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
    expect(leanPolicyOf(null, null).maxDeg).toBe(0);
    // the brief's 10 to 15 degrees: a held pitch still reads as the same craft (review of item 44, B1)
    for (const g of Object.keys(LEAN_BY_GAIT) as (keyof typeof LEAN_BY_GAIT)[]) expect(LEAN_BY_GAIT[g].maxDeg, g).toBeLessThanOrEqual(15);
    expect(LEAN_BY_GAIT.fly.maxDeg).toBe(15);
    expect(LEAN_BY_GAIT.hover.maxDeg).toBeLessThanOrEqual(12);
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

  it('a lob never peaks higher than MAX_PEAK_LU above the ground (a phone shows about 240 lu under the HUD)', () => {
    // the path's highest point over the ground, from a muzzle `y0` lu up to a target `y1` lu up, `dx` across
    const top = (dx: number, y0: number, y1: number, deg: number) => {
      const h = aimedBulge(dx, y1 - y0, deg, Math.max(y0, y1));
      let hi = -Infinity;
      for (let u = 0; u <= 1; u += 1 / 4000) hi = Math.max(hi, y0 + (y1 - y0) * u + 4 * h * u * (1 - u));
      return hi;
    };
    // Trench Mortar lobs at 360 to 430 lu, barrel 60 to 63 degrees, muzzle about 30 lu up (review of item 44, S1)
    for (const dx of [300, 360, 430, 520]) for (const deg of [55, 60, 63]) expect(top(dx, 30, 20, deg), `${dx} ${deg}`).toBeLessThanOrEqual(MAX_PEAK_LU + 0.05);
    expect(top(430, 30, 20, 63)).toBeCloseTo(MAX_PEAK_LU, 1);
    // a short lob under the cap keeps its launch, and a bomb from a plane still drops level
    expect(launchOf(200, 0, aimedBulge(200, 0, 38, 40))).toBeCloseTo(38, 6);
    expect(launchOf(40, -88, aimedBulge(40, -88, 0, 118))).toBeCloseTo(0, 6);
    // both ends above the cap: no climb at all (a level arrival, or the drop)
    expect(top(200, 230, 210, 45)).toBeCloseTo(230, 1);
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
  const tm = (t: number) => ({ t, impactAtMs: 400 });

  it('holds the lean while aimed, through the release and between attacks; only a start from upright anticipates', () => {
    expect(aimLeanGoal(10, true, tm(20), false)).toBeCloseTo(-10 * ANTICIPATION_LEAN_SHARE, 6);
    expect(aimLeanGoal(10, true, tm(200), false)).toBe(10);
    expect(aimLeanGoal(10, true, tm(450), false)).toBe(10);
    // after the release and between attacks: still held (the review of item 44, B1: no rocking)
    expect(aimLeanGoal(10, true, tm(900), false)).toBe(10);
    expect(aimLeanGoal(10, true, null, false)).toBe(10);
    // an attack that starts already leaning does not dip the other way
    expect(aimLeanGoal(10, false, tm(20), false)).toBe(10);
    // the aim ended: stand up
    expect(aimLeanGoal(0, true, tm(20), false)).toBe(0);
    // reduce motion: no anticipation
    expect(aimLeanGoal(10, true, tm(20), true)).toBe(10);
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

  it('leans toward its target through the attack, the muzzle and the weapon with it, and stands up when the aim ends', () => {
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
    // still aimed after the attack: the lean holds
    for (let t = 0; t < 1500; t += 16) v.update(16);
    expect((-bodyOf(v).rotation * 180) / Math.PI).toBeCloseTo(10, 1);
    // the aim ends: upright again
    v.aimLean(0);
    for (let t = 0; t < 1500; t += 16) v.update(16);
    expect(bodyOf(v).rotation).toBeCloseTo(0, 6);
  });

  it('firing again and again at one target holds the lean with no upright frame and no second counter-lean (no rocking)', () => {
    const v = view('art/units/medieval/longbowman.json', sheet());
    const leans: number[] = [];
    for (let shot = 0; shot < 4; shot++) {
      v.play('attack', { impactAtMs: 300, variant: 'attack_b' } as never);
      // the battle view asks every frame while it aims, through the attack and the gap to the next
      for (let t = 0; t < 700; t += 16) {
        v.aimLean(10);
        v.update(16);
        leans.push((-bodyOf(v).rotation * 180) / Math.PI);
      }
    }
    // after the first lean-in, every frame of every later shot stays near the held lean
    const later = leans.slice(44);
    expect(Math.min(...later)).toBeGreaterThan(9);
    expect(Math.max(...later)).toBeLessThan(11.2);
    // between attacks the weapon counts as aimed as in the last shot (not the next variant's pose)
    expect(v.aimNow(0)?.drawnDeg).toBe(2);
  });

  it('a stun stands the body up, and a death keeps the lean in the fall', () => {
    const v = view('art/units/medieval/longbowman.json', sheet());
    v.play('attack', { impactAtMs: 300, variant: 'attack' } as never);
    for (let t = 0; t < 400; t += 16) {
      v.aimLean(10);
      v.update(16);
    }
    v.setPose({ x: 100, y: 0, facing: 1, hpBp: 10000, shieldBp: 0, stunned: true, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'ranged' });
    for (let t = 0; t < 1200; t += 16) {
      v.aimLean(10);
      v.update(16);
    }
    expect(bodyOf(v).rotation).toBeCloseTo(0, 6);
    const d = view('art/units/medieval/longbowman.json', sheet());
    d.play('attack', { impactAtMs: 300, variant: 'attack' } as never);
    for (let t = 0; t < 400; t += 16) {
      d.aimLean(10);
      d.update(16);
    }
    const held = d.aimNow(0)?.leanDeg ?? 0;
    expect(held).toBeGreaterThan(8);
    d.play('die');
    for (let t = 0; t < 400; t += 16) d.update(16);
    // the death fall turns the body its own way, and the aim lean stays in it: no 130 ms spring back to upright
    expect(d.aimNow(0)?.leanDeg).toBe(held);
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

  it('a unit the battle view does not aim never leans', () => {
    const v = view('art/units/medieval/longbowman.json', sheet());
    v.play('attack', { impactAtMs: 300 });
    for (let t = 0; t < 300; t += 16) v.update(16);
    expect(bodyOf(v).rotation).toBe(0);
  });
});

describe('the atlas projectile view', () => {
  it('turns along its path and never flies upside down: a leftward flight is mirrored, not turned half round', () => {
    const source = 'art/fx/proj_test.json';
    const def: VisualDef = { kind: 'atlas', source, anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: 0 }, muzzle: { x: 0, y: 0 }, hitCenter: { x: 0, y: 0 } }, heightLu: 10, team: { kind: 'none' }, clips: {} } as unknown as VisualDef;
    const art = createArtProvider({ warn: () => {} });
    const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker });
    a.register(source, { luPerUnit: 1, animations: { play: [frame(20, 6)] }, clips: { play: { durationsMs: [100], loop: true } }, heightLu: 10 } as unknown as AtlasData);
    const e = a.createProjectile({ key: 'proj.test', def, side: 1, teamPreset: 'default' } as never) as AimedEffect;
    const body = e.root.children[0] as Container;
    // rightward, level: no turn
    e.fly({ x: 0, y: -30 }, { x: 200, y: -30 }, 400, false);
    expect(body.scale.x).toBeGreaterThan(0);
    expect(body.rotation).toBeCloseTo(0, 6);
    // leftward, level: mirrored, not turned
    e.fly({ x: 200, y: -30 }, { x: 0, y: -30 }, 400, false);
    expect(body.scale.x).toBeLessThan(0);
    expect(body.rotation).toBeCloseTo(0, 6);
    // leftward and climbing (a ballistic shot along a weapon raised 30 degrees): the mirrored nose turns up
    e.flyAimed({ x: 200, y: -30 }, { x: 0, y: -30 }, 400, { launchDeg: 30, path: 'ballistic' });
    expect(body.scale.x).toBeLessThan(0);
    expect((body.rotation * 180) / Math.PI).toBeCloseTo(30, 4);
    e.destroy();
  });
});
