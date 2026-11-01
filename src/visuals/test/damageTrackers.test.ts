/**
 * Item 38 B0 on the visuals side: the atlas view's `reach()` takes the torso and head the art pipeline tracks per frame
 * (the damage bundle, contract C1) in place of the team-colour layer's box, keeps the estimate without them, and tells
 * the battle view (`contactRevision`) when they arrive after a reach was taken.
 */
import { Rectangle, Texture } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';
import type { UnitPose, UnitView, VisualDef } from '@/contracts/art';
import { AtlasAdapter, type AtlasData } from '../adapters/atlas';
import type { Reach } from '../adapters/atlasCombat';
import { damageBundles } from '../damage/bundle';
import { trackerReach } from '../damage/trackers';
import type { DamageUnitData } from '../damage/types';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';

/** A Bonker-like entry: two idle frames, a seven-frame attack whose torso leans 18 lu forward on its impact frame (4). */
const ENTRY: DamageUnitData = {
  family: 'soldier',
  torso: {
    idle: [
      [-12, 16, 14, 44],
      [-14, 18, 16, 42],
    ],
    attack: [
      [-12, 16, 14, 44],
      [-16, 16, 10, 44],
      [-16, 16, 10, 44],
      [-6, 14, 24, 40],
      [-1, 12, 33, 37],
      [-6, 14, 24, 40],
      [-12, 16, 14, 44],
    ],
  },
  head: {
    idle: [
      [2, 48],
      [4, 46],
    ],
    attack: [
      [2, 48],
      [-4, 48],
      [-4, 48],
      [14, 42],
      [25, 38],
      [14, 42],
      [2, 48],
    ],
  },
};

describe('trackerReach', () => {
  it('takes the idle torso and head as means, and the torso front and head on the impact frame, in screen lu', () => {
    expect(trackerReach(ENTRY, 'attack', 'idle', 4, 1)).toEqual({
      torsoFrontLu: 15,
      torsoBackLu: 13,
      torsoBottomLu: 17,
      torsoTopLu: 43,
      headIdleLu: 3,
      headIdleYLu: 47,
      headLu: 25,
      headYLu: 38,
      torsoImpactLu: 33,
    });
    // an entry drawn smaller than its sheet (a levy) scales every length
    expect(trackerReach(ENTRY, 'attack', 'idle', 4, 0.5)).toMatchObject({ torsoFrontLu: 7.5, headLu: 12.5, torsoImpactLu: 16.5 });
    // no impact frame known: the idle data only
    expect(trackerReach(ENTRY, 'attack', 'idle', null, 1)).not.toHaveProperty('headLu');
  });

  it('is null without an idle torso (no bundle, or a unit not measured): the view keeps the estimate', () => {
    expect(trackerReach(null, 'attack', 'idle', 4, 1)).toBeNull();
    expect(trackerReach({ family: 'soldier' }, 'attack', 'idle', 4, 1)).toBeNull();
    expect(trackerReach({ family: 'soldier', torso: { idle: [] } }, 'attack', 'idle', 4, 1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// The atlas view (the fixture sheet of atlasCombat.test.ts: the team layer 16 wide, the body 30)

const frame = (w: number, h: number, tx: number, ty: number, tw: number, th: number): Texture =>
  new Texture({ orig: new Rectangle(0, 0, w, h), trim: new Rectangle(tx, ty, tw, th), defaultAnchor: { x: 0.5, y: 1 } });
const at = (cx: number, halfW = 15, top = 60): Texture => frame(100, 100, 50 + cx - halfW, 100 - top, halfW * 2, top);

function sheet(): AtlasData {
  const team = (cx: number): Texture => at(cx, 8, 40);
  return {
    luPerUnit: 1,
    animations: {
      idle: [at(0), at(0)],
      idle_team: [team(0), team(0)],
      attack: [at(0), at(-6), at(-6), at(8), at(12, 15, 50), at(4), at(0)],
      attack_team: [team(0), team(-6), team(-6), team(8), team(12), team(4), team(0)],
      walk: [at(0), at(0)],
      hit: [at(-4), at(-2)],
      die: [at(0), at(-10), at(-20)],
    },
    clips: {
      idle: { durationsMs: [500, 500], loop: true },
      walk: { durationsMs: [300, 300], loop: true, naturalSpeedLuPerS: 60 },
      attack: { durationsMs: [50, 50, 100, 40, 120, 60, 80], impactAt: 0.48, holdStep: 2, anchorsLu: { clubHead: [[10, 50], [-20, 60], [-30, 60], [30, 40], [44, 20], [36, 30], [20, 45]] } },
      hit: { durationsMs: [100, 100] },
      die: { durationsMs: [100, 100, 100], hideUnitAtMs: 300 },
    },
    heightLu: 68,
  } as unknown as AtlasData;
}

type Combat = UnitView & { reach(clip?: string): Reach | null; readonly contactRevision: number };

function view(): Combat {
  const def = MANIFEST['unit.bonker'];
  if (!def) throw new Error('bonker');
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker });
  const d: VisualDef = { ...def, heightLu: 68, events: { attack: { impactAt: 0.48 } } };
  a.register(def.source, { ...sheet(), heightLu: 68 });
  return a.createUnit({ key: 'unit.bonker', def: d, side: 0, teamPreset: 'default', seed: 9 }) as unknown as Combat;
}

const pose: UnitPose = { x: 0, y: 0, facing: 1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'infantry' } as UnitPose;

afterEach(() => damageBundles.clear());

describe("the atlas view's reach with trackers (item 38 B0)", () => {
  it('takes the tracked torso instead of the team layer, and adds the heads; without an entry the estimate stays', () => {
    damageBundles.clear();
    const plain = view().reach();
    // the team layer's box: 8 wide each side of the feet
    expect(plain).toMatchObject({ torsoFrontLu: 8, torsoBackLu: 8 });
    expect(plain).not.toHaveProperty('headLu');
    damageBundles.add('stone', { v: 1, units: { bonker: ENTRY } });
    const r = view().reach();
    expect(r).toMatchObject({ torsoFrontLu: 15, torsoBackLu: 13, torsoImpactLu: 33, headLu: 25, headYLu: 38, headIdleLu: 3 });
    // the tip and the lunge still come from the sheet
    expect(r?.tipLu).toBe(plain?.tipLu);
    expect(r?.lungeLu).toBe(plain?.lungeLu);
  });

  it('a bundle that arrives after the first reach changes contactRevision, and the reach is taken again', () => {
    damageBundles.clear();
    const v = view();
    v.setPose(pose);
    const before = v.reach();
    const rev = v.contactRevision;
    expect(before?.torsoFrontLu).toBe(8);
    damageBundles.add('stone', { v: 1, units: { bonker: ENTRY } });
    // the view picks the entry up on its next pose
    v.setPose(pose);
    expect(v.contactRevision).not.toBe(rev);
    expect(v.reach()?.torsoFrontLu).toBe(15);
  });
});
