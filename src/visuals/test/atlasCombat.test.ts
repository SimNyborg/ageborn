/**
 * Combat staging of the atlas unit view (queue item 38, Phase A): the reach read from the sheet, the presentation
 * offset outside the frame lock, and the lunge compensation. Visual only: none of this reads or changes sim state.
 */
import { Rectangle, Texture, type Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { UnitView, VisualDef } from '@/contracts/art';
import { AtlasAdapter, type AtlasData } from '../adapters/atlas';
import { airShape, compFromStep, computeReach, deathFade, deathGroundMs, deathLanding, deathStyle, HIT_TIERS, idleBody, jitterRecovery, lungeCompLu, lungeCurve, meleeTipAt, REACTION, reactionShape, recoveryScale, strikeTip, textureBox, type Reach, type ReachSheet } from '../adapters/atlasCombat';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';

/** A sheet frame: `w` x `h` source, trimmed to [tx, tx + tw] x [ty, ty + th], feet anchor at (ax, ay) (texture units). */
const frame = (w: number, h: number, tx: number, ty: number, tw: number, th: number, ax = 0.5, ay = 1): Texture =>
  new Texture({ orig: new Rectangle(0, 0, w, h), trim: new Rectangle(tx, ty, tw, th), defaultAnchor: { x: ax, y: ay } });

/** A body whose box centre sits `cx` texture units in front of the feet (100 x 100 source, feet at the bottom middle). */
const at = (cx: number, halfW = 15, top = 60): Texture => frame(100, 100, 50 + cx - halfW, 100 - top, halfW * 2, top);

describe('textureBox', () => {
  it('measures the trimmed box from the feet anchor, x forward and y up', () => {
    expect(textureBox(frame(100, 80, 30, 10, 50, 70, 0.4, 1))).toEqual({ x0: -10, x1: 40, y0: 0, y1: 70 });
    expect(textureBox(undefined)).toBeNull();
  });
});

describe('strike tip (A1)', () => {
  const anchors = { muzzle: [[90, 50], [90, 50], [90, 50]] as [number, number][], clubHead: [[10, 60], [40, 30], [55, 5]] as [number, number][] };

  it('takes the furthest-forward tip tracker of the impact frame and never a muzzle', () => {
    expect(meleeTipAt(anchors, 2)).toEqual({ name: 'clubHead', x: 55, y: 5 });
    expect(strikeTip({ anchorsLu: anchors }, 2, 68)).toEqual({ x: 55, y: 5, from: 'impact' });
  });

  it('a toss on the impact frame (the tip high and well behind the strike) takes the strike frames furthest tip', () => {
    const rhino = { holdStep: 1, anchorsLu: { hornTip: [[80, 50], [60, 20], [78, 28], [27, 84]] as [number, number][] } };
    expect(strikeTip(rhino, 3, 100)).toEqual({ x: 78, y: 28, from: 'strike' });
    // a high tip that the strike never passed by much stays (an overhead blow that lands high)
    const high = { holdStep: 1, anchorsLu: { swordTip: [[0, 0], [0, 0], [60, 70], [55, 72]] as [number, number][] } };
    expect(strikeTip(high, 3, 100)).toEqual({ x: 55, y: 72, from: 'impact' });
  });

  it('ranged clips answer with the muzzle; clips with neither give null', () => {
    expect(strikeTip({ anchorsLu: { muzzle: [[0, 0], [12, 40]] } }, 1, 68)).toEqual({ x: 12, y: 40, from: 'muzzle' });
    expect(strikeTip({ muzzle: [30, 44] }, 1, 68)).toEqual({ x: 30, y: 44, from: 'muzzle' });
    expect(strikeTip({}, 1, 68)).toBeNull();
  });
});

/** A small sheet: idle with the body at 0, an attack that winds back, lunges 12 forward on its impact step and returns. */
function fixture(): ReachSheet & AtlasData {
  const idle = [at(0), at(0)];
  const idleTeam = [at(0, 8, 40), at(0, 8, 40)];
  const attack = [at(0), at(-6), at(-6), at(8), at(12, 15, 50), at(4), at(0)];
  const attackTeam = [at(0, 8, 40), at(-6, 8, 40), at(-6, 8, 40), at(8, 8, 40), at(12, 8, 30), at(4, 8, 40), at(0, 8, 40)];
  const anims: Record<string, Texture[]> = { idle, idle_team: idleTeam, attack, attack_team: attackTeam, walk: [at(0), at(0)], hit: [at(-4), at(-2)], die: [at(0), at(-10), at(-20)] };
  return {
    luPerUnit: 1,
    animations: anims,
    clips: {
      idle: { durationsMs: [500, 500], loop: true },
      walk: { durationsMs: [300, 300], loop: true, naturalSpeedLuPerS: 60 },
      attack: {
        durationsMs: [50, 50, 100, 40, 120, 60, 80],
        impactAt: 0.48,
        holdStep: 2,
        anchorsLu: { clubHead: [[10, 50], [-20, 60], [-30, 60], [30, 40], [44, 20], [36, 30], [20, 45]] },
      },
      hit: { durationsMs: [100, 100] },
      die: { durationsMs: [100, 100, 100], hideUnitAtMs: 300 },
    },
    heightLu: 68,
  };
}

describe('reach and lunge from a sheet (A1)', () => {
  it('reads the tip of the impact step, the lunge of the team layer and the idle extents', () => {
    const s = fixture();
    // impactAt 0.48 of 500 ms = 240 ms: the step starting there is step 4
    const r = computeReach(s, 'attack', 'idle', 0.48, 1, 1) as Reach;
    expect(r.tipLu).toBe(44);
    expect(r.tipYLu).toBe(20);
    expect(r.lungeLu).toBe(12);
    expect(r.frontLu).toBe(15);
    expect(r.backLu).toBe(15);
    expect(r.torsoFrontLu).toBe(8);
    expect(r.impactFrontLu).toBe(27);
    expect(r.tipFrom).toBe('impact');
    // screen lu: a sheet at 2 lu per texture unit, an entry drawn at half height (hk 0.5)
    const half = computeReach(s, 'attack', 'idle', 0.48, 0.5, 0.5) as Reach;
    expect(half.tipLu).toBe(22);
    expect(half.lungeLu).toBe(6);
  });

  it('a clip without tip trackers reaches as far as its impact frame', () => {
    const s = fixture();
    (s.clips as Record<string, unknown>)['attack'] = { durationsMs: [50, 50, 100, 40, 120, 60, 80], impactAt: 0.48 };
    const r = computeReach(s, 'attack', 'idle', 0.48, 1, 1) as Reach;
    expect(r.tipLu).toBe(27);
    expect(r.tipFrom).toBe('extent');
  });

  it('compensates only from the step after the hold, and only forward lunge', () => {
    const s = fixture();
    const idle = idleBody(s, 'idle');
    expect(idle).not.toBeNull();
    const curve = lungeCurve(s, 'attack', idle as NonNullable<typeof idle>);
    expect(curve).toEqual([0, -6, -6, 8, 12, 4, 0]);
    const from = compFromStep(s.clips['attack'], 4);
    expect(from).toBe(3);
    expect([0, 1, 2, 3, 4, 5, 6].map((st) => lungeCompLu(curve, st, from, 0.5, 1))).toEqual([0, 0, 0, 4, 6, 2, 0]);
    // no hold step: two steps before the impact
    expect(compFromStep({}, 4)).toBe(2);
    expect(lungeCompLu(curve, 4, from, 0, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// The shipped sheets (the survey of all 167 is in the Phase A report; these pin a few known values)

/** The pinned sheets' JSON (core and extras), read as text. */
const SHEETS = import.meta.glob<string>('/public/art/units/{stone/bonker,medieval/footman,stone/woolly_rhino,modern/rifleman}{,.x}.json', { query: '?raw', import: 'default', eager: true });

interface SheetJson {
  frames: Record<string, { spriteSourceSize: { x: number; y: number; w: number; h: number }; sourceSize: { w: number; h: number }; anchor?: { x: number; y: number } }>;
  animations: Record<string, string[]>;
  meta: { scale: string | number; ageborn: { heightLu: number; pxPerLu: number; clips: Record<string, unknown> } };
}

/** A shipped sheet as the runtime sees it (texture units = px / meta.scale), core and extras merged. */
function shipped(path: string): ReachSheet & { luPerUnit: number; impactAt: number } {
  const anims: Record<string, Texture[]> = {};
  const clips: Record<string, unknown> = {};
  let core: SheetJson | null = null;
  for (const file of [`${path}.json`, `${path}.x.json`]) {
    const raw = SHEETS[`/public/art/units/${file}`];
    if (raw === undefined) continue;
    const j = JSON.parse(raw) as SheetJson;
    core ??= j;
    const sc = Number(j.meta.scale) || 1;
    for (const [name, list] of Object.entries(j.animations)) {
      if (anims[name]) continue;
      anims[name] = list.map((n) => {
        const f = j.frames[n] ?? core?.frames[n];
        if (!f) return Texture.EMPTY;
        const s = f.spriteSourceSize;
        return frame(f.sourceSize.w / sc, f.sourceSize.h / sc, s.x / sc, s.y / sc, s.w / sc, s.h / sc, f.anchor?.x ?? 0.5, f.anchor?.y ?? 1);
      });
    }
    for (const [k, v] of Object.entries(j.meta.ageborn.clips)) clips[k] ??= v;
  }
  if (!core) throw new Error(path);
  const m = core.meta.ageborn;
  return { animations: anims, clips: clips as ReachSheet['clips'], heightLu: m.heightLu, luPerUnit: Number(core.meta.scale) / m.pxPerLu, impactAt: (clips['attack'] as { impactAt: number }).impactAt };
}

describe('reach on the shipped sheets (A1)', () => {
  const reachOf = (path: string, clip = 'attack'): Reach => {
    const s = shipped(path);
    const r = computeReach(s, clip, 'idle', clip === 'attack' ? s.impactAt : ((s.clips[clip]?.impactAt ?? s.impactAt) as number), s.luPerUnit, 1);
    if (!r) throw new Error(path);
    return r;
  };

  it('Bonker: the club head lands 67 lu out, the torso lunges about 13 lu', () => {
    const r = reachOf('stone/bonker');
    expect(r.tipLu).toBeCloseTo(67.2, 1);
    expect(r.tipFrom).toBe('impact');
    expect(r.lungeLu).toBeGreaterThan(10);
    expect(r.lungeLu).toBeLessThan(15);
    expect(r.frontLu).toBeGreaterThan(50);
    expect(r.backLu).toBeGreaterThan(10);
  });

  it('Footman: the sword tip lands about 91 lu out (the overshoot B1 re-renders)', () => {
    expect(reachOf('medieval/footman').tipLu).toBeCloseTo(90.7, 1);
  });

  it('Woolly Rhino: the impact frame tosses the horn up; the gore before it is the contact', () => {
    const r = reachOf('stone/woolly_rhino');
    expect(r.tipFrom).toBe('strike');
    expect(r.tipLu).toBeCloseTo(77.5, 1);
  });

  it('every variant of the Bonker has a reach, and ranged units reach to their muzzle', () => {
    for (const clip of ['attack_b', 'attack_c']) expect(reachOf('stone/bonker', clip).tipLu).toBeGreaterThan(40);
    expect(reachOf('modern/rifleman').tipFrom).toBe('muzzle');
  });
});

// ---------------------------------------------------------------------------------------------
// The view

function view(s: AtlasData, side: 0 | 1 = 0, quality?: 'high' | 'lite'): UnitView & Record<string, unknown> {
  const def = MANIFEST['unit.bonker'];
  if (!def) throw new Error('bonker');
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker, ...(quality ? { quality } : {}) });
  const d: VisualDef = { ...def, heightLu: 68, events: { attack: { impactAt: 0.48 } } };
  a.register(def.source, { ...s, heightLu: 68 });
  return a.createUnit({ key: 'unit.bonker', def: d, side, teamPreset: 'default', seed: 9 }) as UnitView & Record<string, unknown>;
}

type Combat = UnitView & {
  reach(clip?: string): Reach | null;
  setOffsetX(lu: number): void;
  setLungeComp(share: number): void;
  setGait(o: { speedLuPerS: number }): void;
};

const pose = (x: number, facing: 1 | -1 = 1) => ({ x, y: 0, facing, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none' as const, roleGlyph: 'infantry' as const });
const body = (v: UnitView): Container => v.root.children[1] as Container;

describe('the atlas view as a CombatView (A1)', () => {
  it('answers reach for the main attack by default and while a variant that has not loaded is asked for', () => {
    const v = view(fixture()) as unknown as Combat;
    const r = v.reach();
    expect(r?.tipLu).toBe(44);
    expect(v.reach('attack_c')).toEqual(r);
    expect(v.reach('attack')).toBe(r);
  });

  it('between swings it answers for the variant the next attack will play, so the approach stages for it (review A, S1)', () => {
    const base = fixture();
    const a = base.clips['attack'] as unknown as Record<string, unknown> & { anchorsLu: { clubHead: number[][] } };
    // attack_b: the same frames, but its club lands 60 lu out at its impact step (attack's 44)
    const s = {
      ...base,
      animations: { ...base.animations, attack_b: base.animations['attack'] ?? [], attack_b_team: base.animations['attack_team'] ?? [] },
      clips: { ...base.clips, attack_b: { ...a, anchorsLu: { clubHead: a.anchorsLu.clubHead.map((p, i) => (i === 4 ? [60, 20] : p)) } } },
    } as unknown as ReturnType<typeof fixture>;
    const v = view(s) as unknown as Combat & { setIdentity(o: { id: number; seed: number }): void };
    // id 1: the cycle [attack, attack_b] starts at attack_b
    v.setIdentity({ id: 1, seed: 3 });
    v.setPose(pose(0));
    expect(v.reach()?.tipLu).toBe(60);
    v.play('attack', { impactAtMs: 240 });
    v.update(100);
    // while it swings: the variant playing
    expect(v.reach()?.tipLu).toBe(60);
    // the swing over: the next one, plain attack
    v.update(1000);
    expect(v.reach()?.tipLu).toBe(44);
    expect(v.reach('attack_b')?.tipLu).toBe(60);
  });

  it('setOffsetX moves the whole figure (ring and shadow too) outside the frame lock', () => {
    const v = view(fixture()) as unknown as Combat;
    v.setPose(pose(100));
    v.setGait({ speedLuPerS: 0 });
    v.play('idle', { loop: true });
    v.update(16);
    const bx = body(v).x;
    v.setOffsetX(14);
    expect(v.root.x).toBe(114);
    v.setPose(pose(100));
    v.update(16);
    expect(v.root.x).toBe(114);
    // the frame lock did not see the offset as motion: the body holds its place in the root
    expect(body(v).x).toBeCloseTo(bx, 6);
    v.setOffsetX(Number.NaN);
    expect(v.root.x).toBe(100);
  });

  it('setLungeComp steps the figure back on the strike steps by a share of the authored lunge, never on the wind-up', () => {
    const v = view(fixture()) as unknown as Combat;
    v.setPose(pose(0));
    v.setGait({ speedLuPerS: 0 });
    v.setLungeComp(0.5);
    v.play('attack', { impactAtMs: 240 });
    // wind-up (steps 0-2): no offset
    v.update(120);
    expect(body(v).x).toBeCloseTo(0, 6);
    // the strike step after the hold (200-240 ms): lunge 8 at share 0.5 -> 4 lu back along the facing
    v.update(90);
    expect(body(v).x).toBeCloseTo(-4, 6);
    // the impact step (from 240 ms): lunge 12 -> 6 lu back
    v.update(40);
    expect(body(v).x).toBeCloseTo(-6, 6);
    // the recovery returns with the lunge (step 6, lunge 0)
    v.update(200);
    expect(body(v).x).toBeCloseTo(0, 6);
    // facing left (side 1): back is +x
    const w = view(fixture(), 1) as unknown as Combat;
    w.setPose(pose(0, -1));
    w.setGait({ speedLuPerS: 0 });
    w.setLungeComp(0.5);
    w.play('attack', { impactAtMs: 240 });
    w.update(10);
    w.update(240);
    expect(body(w).x).toBeCloseTo(6, 6);
  });

  it('without setLungeComp nothing moves (the old behaviour)', () => {
    const v = view(fixture()) as unknown as Combat;
    v.setPose(pose(0));
    v.setGait({ speedLuPerS: 0 });
    v.play('attack', { impactAtMs: 240 });
    v.update(250);
    expect(body(v).x).toBeCloseTo(0, 6);
  });
});

// ---------------------------------------------------------------------------------------------
// A2: react() and airborne()

type Reacting = Combat & {
  react(tier: 'light' | 'medium' | 'heavy' | 'kill', dir: 1 | -1): void;
  airborne(o: { ms: number; liftLu: number; kind: 'knockback' | 'pounce' | 'leap'; tumble: boolean; onLand?: () => void }): void;
  setMotion(m: { reduce: boolean; lite: boolean }): void;
};

const frameShown = (v: UnitView): Texture => (body(v).children[1] as unknown as { texture: Texture }).texture;

describe('reaction shapes (A2)', () => {
  it('push, tilt and squash peak early, rebound a little and settle to zero', () => {
    expect(reactionShape(0)).toEqual({ push: 0, tilt: 0, squash: 0 });
    expect(reactionShape(0.16).push).toBeCloseTo(1, 6);
    expect(reactionShape(0.1).tilt).toBeCloseTo(1, 6);
    expect(reactionShape(0.08).squash).toBeCloseTo(1, 6);
    // the head comes forward past neutral (follow-through) before it settles
    expect(Math.min(...Array.from({ length: 50 }, (_, i) => reactionShape(0.1 + (i / 50) * 0.9).tilt))).toBeLessThan(-0.1);
    expect(reactionShape(0.999).push).toBeCloseTo(0, 3);
    expect(reactionShape(1)).toEqual({ push: 0, tilt: 0, squash: 0 });
  });

  it('tiers grow from light to kill; heavier bodies move less', () => {
    for (const m of ['light', 'medium', 'heavy'] as const) {
      const p = HIT_TIERS.map((t) => REACTION[t][m].pushLu);
      expect([...p].sort((a, b) => a - b)).toEqual(p);
    }
    expect(REACTION.light.light.pushLu).toBeGreaterThan(REACTION.light.heavy.pushLu);
  });

  it('a knockback hops and tilts back; a tumble turns once; a pounce lifts its nose then dips it', () => {
    expect(airShape('knockback', 0.5, false).lift).toBeCloseTo(1, 6);
    expect(airShape('knockback', 0.35, false).backTilt).toBeCloseTo(1, 2);
    expect(airShape('knockback', 1, false).backTilt).toBeCloseTo(0, 6);
    expect(airShape('knockback', 1, true).spin).toBeCloseTo(1, 6);
    expect(airShape('pounce', 0.15, false).backTilt).toBeGreaterThan(0);
    expect(airShape('pounce', 0.9, false).backTilt).toBeLessThan(0);
  });
});

describe('react() on the atlas view (A2)', () => {
  const idleView = (side: 0 | 1 = 0): Reacting => {
    const v = view(fixture(), side) as unknown as Reacting;
    v.setPose(pose(0, side === 0 ? 1 : -1));
    v.play('idle', { loop: true });
    v.update(16);
    return v;
  };

  it('an idle victim plays the full hit clip and recoils along the blow: pushed, head back, squashed', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.play('idle', { loop: true });
    v.update(16);
    v.react('heavy', -1);
    v.update(30);
    expect(s.animations['hit']).toContain(frameShown(v));
    expect(body(v).x).toBeLessThan(-3);
    expect(body(v).rotation).toBeLessThan(-0.05);
    expect(body(v).scale.y).toBeLessThan(1);
    // gone by the end of the reaction
    v.update(400);
    expect(body(v).x).toBeCloseTo(0, 3);
    expect(body(v).rotation).toBeCloseTo(0, 3);
  });

  it('kill reacts harder than light, and Reduce motion softens (never hides) it', () => {
    const peak = (tier: 'light' | 'kill', reduce = false): number => {
      const v = idleView();
      if (reduce) v.setMotion({ reduce: true, lite: false });
      v.react(tier, -1);
      v.update(50);
      return -body(v).x;
    };
    expect(peak('kill')).toBeGreaterThan(peak('light') * 3);
    expect(peak('kill', true)).toBeLessThan(peak('kill'));
    expect(peak('kill', true)).toBeGreaterThan(0);
  });

  it('a hitstop holds the moment of contact, then the recoil plays', () => {
    const v = idleView();
    v.freeze(60);
    v.react('medium', -1);
    v.update(40);
    expect(Math.abs(body(v).rotation)).toBeLessThan(1e-9);
    v.update(60);
    expect(body(v).rotation).toBeLessThan(-0.02);
  });

  it('never cuts a wind-up or its impact hold: the attack keeps playing with the recoil on top', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.play('attack', { impactAtMs: 240 });
    v.update(100);
    v.react('medium', -1);
    v.update(20);
    expect(s.animations['attack']).toContain(frameShown(v));
    expect(body(v).x).toBeLessThan(0);
  });

  it('cuts a recovery after the impact hold: a short hit pose, then the idle', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.play('idle', { loop: true });
    v.play('attack', { impactAtMs: 240 });
    v.update(10);
    v.update(380);
    expect(s.animations['attack']).toContain(frameShown(v));
    v.react('light', -1);
    v.update(10);
    expect(frameShown(v)).toBe(s.animations['hit']?.[0]);
    v.update(30);
    expect(frameShown(v)).toBe(s.animations['hit']?.[1]);
    v.update(40);
    expect(s.animations['idle']).toContain(frameShown(v));
  });

  it('a walker gets the insert over its walk, which keeps running underneath', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    v.update(16);
    v.react('light', -1);
    v.update(10);
    expect(frameShown(v)).toBe(s.animations['hit']?.[0]);
    v.update(70);
    expect(s.animations['walk']).toContain(frameShown(v));
  });

  it('once react() drives a view, flash() only flashes; a view without react() keeps the old flinch', () => {
    const v = idleView();
    v.react('light', -1);
    v.update(400);
    v.flash(60);
    v.update(30);
    expect(body(v).x).toBeCloseTo(0, 6);
    const w = idleView();
    w.flash(60);
    w.update(30);
    expect(body(w).x).toBeLessThan(-1);
  });

  it('a flash earlier in the frame does not add the old flinch on top of the reaction', () => {
    const a = idleView();
    a.flash(60);
    a.react('light', -1);
    a.update(30);
    const b = idleView();
    b.react('light', -1);
    a.update(0);
    b.update(30);
    expect(body(a).x).toBeCloseTo(body(b).x, 6);
  });
});

describe('airborne() on the atlas view (A2, A8)', () => {
  it('a knockback hops (lift at mid-arc), lets the frame lock go, lands once with a squash and onLand', () => {
    const v = view(fixture()) as unknown as Reacting;
    let landed = 0;
    v.setPose(pose(0));
    v.setGait({ speedLuPerS: 0 });
    v.play('idle', { loop: true });
    v.update(16);
    v.airborne({ ms: 200, liftLu: 10, kind: 'knockback', tumble: false, onLand: () => landed++ });
    v.update(100);
    expect(body(v).y).toBeCloseTo(-10, 0);
    // tilted back: a unit facing +x leans toward -x
    expect(body(v).rotation).toBeLessThan(0);
    expect(landed).toBe(0);
    v.update(110);
    expect(landed).toBe(1);
    v.update(30);
    expect(body(v).scale.y).toBeLessThan(1);
    v.update(500);
    expect(landed).toBe(1);
    expect(body(v).y).toBeCloseTo(0, 6);
  });

  it('a knockback ends a swing short of its impact frame (the sim cancelled it): the hop shows the hit pose, never the impact frame (review A, S7)', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.play('idle', { loop: true });
    v.play('attack', { impactAtMs: 240 });
    v.update(10);
    v.update(110);
    expect(s.animations['attack']).toContain(frameShown(v));
    v.react('medium', -1);
    v.airborne({ ms: 220, liftLu: 9, kind: 'knockback', tumble: false });
    v.update(10);
    expect(s.animations['hit']).toContain(frameShown(v));
    for (let t = 0; t < 600; t += 10) {
      v.update(10);
      expect(s.animations['attack']).not.toContain(frameShown(v));
    }
  });

  it('a knockback after the impact frame keeps the follow-through; a pounce never cancels its strike', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.play('attack', { impactAtMs: 240 });
    v.update(10);
    v.update(250);
    v.airborne({ ms: 220, liftLu: 9, kind: 'knockback', tumble: false });
    v.update(10);
    expect(s.animations['attack']).toContain(frameShown(v));
    const w = view(s) as unknown as Reacting;
    w.setPose(pose(0));
    w.play('attack', { impactAtMs: 240 });
    w.update(10);
    w.update(100);
    w.airborne({ ms: 300, liftLu: 20, kind: 'pounce', tumble: false });
    w.update(10);
    expect(s.animations['attack']).toContain(frameShown(w));
  });

  it('a tumble turns a full backflip about the hit centre; Reduce motion never tumbles', () => {
    const v = view(fixture()) as unknown as Reacting;
    v.setPose(pose(0));
    v.airborne({ ms: 300, liftLu: 12, kind: 'knockback', tumble: true });
    v.update(150);
    expect(body(v).rotation).toBeCloseTo(-Math.PI, 1);
    const w = view(fixture()) as unknown as Reacting;
    w.setMotion({ reduce: true, lite: false });
    w.setPose(pose(0));
    w.airborne({ ms: 300, liftLu: 12, kind: 'knockback', tumble: true });
    w.update(150);
    expect(Math.abs(body(w).rotation)).toBeLessThan(0.2);
    expect(body(w).y).toBeCloseTo(-6, 0);
  });

  it('a pounce takes off nose up and comes down nose first', () => {
    const v = view(fixture()) as unknown as Reacting;
    v.setPose(pose(0));
    v.airborne({ ms: 500, liftLu: 30, kind: 'pounce', tumble: false });
    v.update(75);
    expect(body(v).rotation).toBeLessThan(0);
    v.update(375);
    expect(body(v).rotation).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
// A4: dieWith()

type Dying = Reacting & {
  dieWith(o: { dir: 1 | -1; tier: 'light' | 'medium' | 'heavy' | 'kill'; heavy: boolean; lieMs: number; fadeMs: number; onLand?: () => void }): void;
  readonly finished: boolean;
};

describe('death curves (A4)', () => {
  it('finds the ground frame of both shipped die timing tables', () => {
    expect(deathGroundMs([45, 60, 70, 60, 50, 60, 70, 90, 90, 100])).toBe(285);
    expect(deathGroundMs([60, 70, 80, 80, 60, 70, 80, 90, 90, 100, 100, 110])).toBe(290);
    expect(deathGroundMs([60, 70, 80, 80], 120)).toBe(120);
  });

  it('a light body under a heavy blow is thrown; light blows and heavy bodies crumple; Reduce motion never throws', () => {
    expect(deathStyle('heavy', false, 'light', false).fling).toBe(true);
    expect(deathStyle('light', false, 'light', false).fling).toBe(false);
    expect(deathStyle('heavy', true, 'light', false).fling).toBe(false);
    expect(deathStyle('heavy', false, 'heavy', false).bounceLu).toBe(0);
    expect(deathStyle('heavy', false, 'light', true)).toMatchObject({ fling: false, liftLu: 0, bounceLu: 0 });
  });

  it('the landing squashes, bounces and settles; the fade waits for the lie', () => {
    expect(deathLanding(50).squash).toBeCloseTo(1, 6);
    expect(deathLanding(125).bounce).toBeCloseTo(1, 6);
    expect(deathLanding(400)).toEqual({ squash: 0, bounce: 0 });
    expect(deathFade(1000, 2000, 600)).toEqual({ alpha: 1, sink: 0 });
    expect(deathFade(2300, 2000, 600).alpha).toBeCloseTo(0.5, 6);
    expect(deathFade(2700, 2000, 600)).toEqual({ alpha: 0, sink: 1 });
  });
});

describe('dieWith() on the atlas view (A4)', () => {
  const dying = (): { v: Dying; s: AtlasData } => {
    const s = fixture();
    const v = view(s) as unknown as Dying;
    v.setPose(pose(0));
    v.play('idle', { loop: true });
    v.update(16);
    return { v, s };
  };
  const ground = (v: UnitView): Container => v.root.children[0] as Container;

  it('falls, lands once on the ground frame, lies, then sinks and fades; finished stays true', () => {
    const { v, s } = dying();
    let lands = 0;
    v.dieWith({ dir: -1, tier: 'medium', heavy: false, lieMs: 2000, fadeMs: 600, onLand: () => lands++ });
    v.update(16);
    expect(s.animations['die']).toContain(frameShown(v));
    // crumple: the die clip at 0.92x, the ground at 280 ms of it
    v.update(280 / 0.92 - 30);
    expect(lands).toBe(0);
    v.update(30);
    expect(lands).toBe(1);
    // long past the clip's end the body still lies there, whole
    v.update(1500);
    expect(body(v).visible).toBe(true);
    expect(body(v).alpha).toBe(1);
    expect(body(v).isCachedAsTexture).toBe(false);
    expect(v.finished).toBe(false);
    // into the fade at 60 frames a second
    for (let i = 0; i < 40; i++) v.update(16);
    expect(body(v).alpha).toBeLessThan(1);
    expect(body(v).alpha).toBeGreaterThan(0);
    // it fades as one picture of itself, not as see-through layers (review A, N10)
    expect(body(v).isCachedAsTexture).toBe(true);
    v.update(500);
    expect(body(v).alpha).toBe(0);
    expect(v.finished).toBe(true);
    v.update(1000);
    expect(v.finished).toBe(true);
    expect(lands).toBe(1);
  });

  it('a thrown body lifts on its way down; a crumple stays on the ground', () => {
    const a = dying().v;
    a.dieWith({ dir: -1, tier: 'heavy', heavy: false, lieMs: 2000, fadeMs: 600 });
    a.update(120);
    expect(body(a).y).toBeLessThan(-5);
    const b = dying().v;
    b.dieWith({ dir: -1, tier: 'light', heavy: false, lieMs: 2000, fadeMs: 600 });
    b.update(120);
    expect(body(b).y).toBeCloseTo(0, 6);
  });

  it('ring, glyph and trim go at death; the contact shadow stays under the body and fades with it', () => {
    const { v } = dying();
    v.dieWith({ dir: 1, tier: 'light', heavy: false, lieMs: 100, fadeMs: 100 });
    v.update(16);
    const g = ground(v);
    const ring = g.children[0] as Container;
    const shadow = g.children[1] as Container;
    expect(ring.visible).toBe(false);
    expect(shadow.visible).toBe(true);
    // the ground at 280 / 0.92 ms, then 100 ms of lying, then half of the 100 ms fade
    v.update(280 / 0.92 + 150 - 16);
    expect(shadow.alpha).toBeCloseTo(0.36, 2);
  });

  it('a fade the frames would show in a few steps (a slow device, a catch-up, a fast-forward) fades as layers, and stays so', () => {
    const { v } = dying();
    v.dieWith({ dir: -1, tier: 'medium', heavy: false, lieMs: 2000, fadeMs: 600 });
    v.update(16);
    // landed and lying, just short of the fade (the ground at 280 / 0.92 ms, then 2 s)
    v.update(2200);
    expect(body(v).alpha).toBe(1);
    // a 150 ms frame into the fade: the frames would show its 600 ms in four steps
    v.update(150);
    expect(body(v).alpha).toBeLessThan(1);
    expect(body(v).isCachedAsTexture).toBe(false);
    for (let i = 0; i < 10; i++) v.update(16);
    expect(body(v).isCachedAsTexture).toBe(false);
    v.destroy();
  });

  it('Graphics Lite fades as layers', () => {
    const v = view(fixture(), 0, 'lite') as unknown as Dying;
    v.setPose(pose(0));
    v.play('idle', { loop: true });
    v.update(16);
    v.dieWith({ dir: -1, tier: 'medium', heavy: false, lieMs: 100, fadeMs: 600 });
    for (let i = 0; i < 40; i++) v.update(16);
    expect(body(v).alpha).toBeLessThan(1);
    expect(body(v).isCachedAsTexture).toBe(false);
    v.destroy();
  });

  it('at most four bodies fade as pictures at once; a view that goes frees its place', () => {
    const fading = (): Dying => {
      const { v } = dying();
      v.dieWith({ dir: -1, tier: 'medium', heavy: false, lieMs: 100, fadeMs: 600 });
      return v;
    };
    // five bodies into their fade together at 60 frames a second (the ground at 280 / 0.92 ms, then 100 ms)
    const vs = Array.from({ length: 5 }, fading);
    for (let i = 0; i < 40; i++) for (const v of vs) v.update(16);
    expect(vs.map((v) => body(v).alpha < 1)).toEqual([true, true, true, true, true]);
    expect(vs.map((v) => body(v).isCachedAsTexture)).toEqual([true, true, true, true, false]);
    // one goes: the next body to start its fade gets the place
    vs[0]!.destroy();
    const next = fading();
    for (let i = 0; i < 40; i++) next.update(16);
    expect(body(next).isCachedAsTexture).toBe(true);
    for (const v of [...vs.slice(1), next]) v.destroy();
  });

  it('play("die") keeps the old cartoon path: the poof and the body hidden at the clip end', () => {
    const { v } = dying();
    v.play('die');
    v.update(16);
    v.update(300);
    expect(body(v).visible).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// A8: the cut into the attack and the recovery jitter

describe('staging details (A8)', () => {
  it('an attack cuts straight into its first key (no cross-dissolve from the walk); walk and idle still dissolve', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    v.update(16);
    v.setGait({ speedLuPerS: 0 });
    v.play('attack', { impactAtMs: 240 });
    v.update(16);
    const ghost = body(v).children[3] as Container;
    expect(ghost.visible).toBe(false);
    expect(s.animations['attack']).toContain(frameShown(v));
  });

  it('the recovery after the impact varies 85-115% per unit and swing; the impact frame never moves', () => {
    const scales = Array.from({ length: 400 }, (_, i) => recoveryScale(i % 40, Math.floor(i / 40)));
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.85);
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.15);
    expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(0.2);
    expect(recoveryScale(7, 3)).toBe(recoveryScale(7, 3));
    const tl = [
      { step: 0, ms: 100 },
      { step: 1, ms: 140 },
      { step: 2, ms: 120 },
      { step: 3, ms: 100 },
    ];
    expect(jitterRecovery(tl, 2, 1.1)).toEqual([{ step: 0, ms: 100 }, { step: 1, ms: 140 }, { step: 2, ms: 120 }, { step: 3, ms: 110.00000000000001 }]);
    // on the view: the impact step starts exactly at the sim's impact, whatever the unit id
    const s = fixture();
    for (const id of [1, 2, 3, 4, 5]) {
      const v = view(s) as unknown as Reacting & { setIdentity(o: { id: number; seed: number }): void };
      v.setIdentity({ id, seed: 1 });
      v.setPose(pose(0));
      v.play('attack', { impactAtMs: 240 });
      v.update(239);
      expect(frameShown(v)).toBe(s.animations['attack']?.[3]);
      v.update(2);
      expect(frameShown(v)).toBe(s.animations['attack']?.[4]);
    }
  });
});

describe('hit-pose inserts under sustained fire (A2)', () => {
  it('a walker under ten hits a second still shows its walk between hit poses', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.setGait({ speedLuPerS: 60 });
    v.play('walk', { loop: true });
    v.update(16);
    let walkFrames = 0;
    let hitFrames = 0;
    for (let i = 0; i < 60; i++) {
      if (i % 6 === 0) v.react('light', -1);
      v.update(16);
      if (s.animations['walk']?.includes(frameShown(v))) walkFrames++;
      if (s.animations['hit']?.includes(frameShown(v))) hitFrames++;
    }
    expect(hitFrames).toBeGreaterThan(5);
    expect(walkFrames).toBeGreaterThan(hitFrames);
  });

  it('an idle victim under blows every 100 ms plays its hit clip through instead of locking on its first frame', () => {
    const s = fixture();
    const v = view(s) as unknown as Reacting;
    v.setPose(pose(0));
    v.play('idle', { loop: true });
    v.update(16);
    const second = s.animations['hit']?.[1];
    let reached = false;
    for (let t = 0; t < 600; t += 20) {
      if (t % 100 === 0) v.react('light', -1);
      v.update(20);
      if (frameShown(v) === second) reached = true;
    }
    expect(reached).toBe(true);
  });
});
