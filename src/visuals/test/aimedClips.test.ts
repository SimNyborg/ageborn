/**
 * Art round W0, aimed clips at runtime (queue item 44's art part, contract C2). A sheet's shot clips carry `aimDeg`,
 * `release {frame, atLu}` and `omni`, and aimed variants (`<clip>_up45`, `_up70`, `_down`, `aimOf`) with exactly the
 * base clip's timing live in its extras sheet. When the battle view asks for a shot's launch angle (`aimAt`), the atlas
 * view plays, within the attack variant it plays anyway, the aimed clip drawn closest to it, with the same timing; the
 * shot leaves from that clip's `release`; emitters (`omni`) neither aim nor lean; item 44's table stays the fallback for
 * clips without data; and before the extras sheet has loaded the base clip plays, as before.
 */
import { Texture, type Container, type Sprite } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { UnitView, VisualDef } from '@/contracts/art';
import { aimWantDeg, ARC_MIN_LOFT_DEG, MAX_LAUNCH_DEG, pickAimVariant } from '@/render/aim';
import { AtlasAdapter, type AtlasData } from '../adapters/atlas';
import { AIMED_SLACK_DEG, aimedBaseOf, aimedNamesOf, aimLevelOf, clipAimOf, pickAimedClip, releasePoint, type AimCandidate } from '../adapters/atlasAim';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';

const C: AimCandidate[] = [
  { anim: 'attack', deg: 0 },
  { anim: 'attack_up45', deg: 44.6 },
  { anim: 'attack_up70', deg: 70.2 },
  { anim: 'attack_down', deg: -31 },
];
const pick = (want: number, prev: '' | 'up45' | 'up70' | 'down' | null = null): string => C[pickAimedClip(C, want, prev)]!.anim;

describe('choosing the aimed clip (atlasAim.ts)', () => {
  it('names: each shot clip has up45, up70 and down variants; nothing else is aimed', () => {
    expect(aimedNamesOf('attack_b')).toEqual(['attack_b_up45', 'attack_b_up70', 'attack_b_down']);
    expect(aimedNamesOf('walk')).toEqual([]);
    expect(aimedBaseOf('attack_alt_down')).toBe('attack_alt');
    expect(aimedBaseOf('attack_up45')).toBe('attack');
    expect(aimedBaseOf('attack_b')).toBeNull();
    expect(aimedBaseOf('walk_up45')).toBeNull();
    expect(aimLevelOf('attack_c_up70')).toBe('up70');
    expect(aimLevelOf('attack')).toBe('');
  });

  it('plays the clip drawn closest to the launch angle', () => {
    expect(pick(0)).toBe('attack');
    expect(pick(12)).toBe('attack');
    expect(pick(30)).toBe('attack_up45');
    expect(pick(50)).toBe('attack_up45');
    expect(pick(60)).toBe('attack_up70');
    expect(pick(85)).toBe('attack_up70');
    expect(pick(-20)).toBe('attack_down');
    expect(pick(-60)).toBe('attack_down');
    expect(pick(-14)).toBe('attack');
  });

  it('a tie goes to the pose nearer the base clip', () => {
    // halfway between the base (0) and up45 (44.6), and between up45 and up70 (57.4)
    expect(pick(22.3)).toBe('attack');
    expect(pick(57.4)).toBe('attack_up45');
    expect(pick(-15.5)).toBe('attack');
  });

  it("keeps the last shot's level near a midpoint (no pose switch at every shot), but not beyond the slack", () => {
    // 24 fits the base by 24 and up45 by 20.6: the base stays after a base shot, up45 wins after none
    expect(pick(24, null)).toBe('attack_up45');
    expect(pick(24, '')).toBe('attack');
    expect(pick(20, 'up45')).toBe('attack_up45');
    expect(pick(20 - AIMED_SLACK_DEG, 'up45')).toBe('attack');
    // a level the variant does not have is no reason to stay
    expect(C[pickAimedClip(C.slice(0, 2), 60, 'up70')]!.anim).toBe('attack_up45');
  });

  it('no aimed clip, or no angle: the base clip', () => {
    expect(pickAimedClip([C[0]!], 60)).toBe(0);
    expect(pickAimedClip([], 60)).toBe(0);
    expect(pickAimedClip(C, Number.NaN)).toBe(0);
  });

  it('the launch angle a shot asks for: down the line, an arc with its least loft (render/aim.ts)', () => {
    expect(aimWantDeg('direct', 30)).toBe(30);
    expect(aimWantDeg('ballistic', -12)).toBe(-12);
    expect(aimWantDeg('arc', 5)).toBe(5 + ARC_MIN_LOFT_DEG);
    expect(aimWantDeg('arc', 60)).toBe(MAX_LAUNCH_DEG);
  });

  it("a variant with aimed clips fits a shot as well as the best of its poses (item 44's variant choice)", () => {
    const level = { anim: 'attack', deg: 0, omni: false };
    const raised = { anim: 'attack_b', deg: 38, omni: false };
    // a direct shot 50 degrees up: the level variant gives way to the raised one ...
    expect(pickAimVariant([level, raised], 'attack', 'direct', 50, 14)).toBe('attack_b');
    // ... unless it has an aimed clip that can start it: then the cycle plays on (and the view plays that clip)
    expect(pickAimVariant([{ ...level, aimed: [44.6, 70.2] }, raised], 'attack', 'direct', 50, 14)).toBeNull();
  });

  it("C2's release is `{frame, atLu}`; item 44's bare point still reads; the sheet's data wins over the table", () => {
    expect(releasePoint({ frame: 6, atLu: [31.2, 52.4] })).toEqual([31.2, 52.4]);
    expect(releasePoint([10, 50])).toEqual([10, 50]);
    expect(releasePoint(undefined)).toBeUndefined();
    const table = { deg: 38, release: [12, 40] as const };
    expect(clipAimOf({ aimDeg: 20, release: { frame: 2, atLu: [10, 50] } }, table)).toEqual({ deg: 20, release: [10, 50] });
    expect(clipAimOf({ aimDeg: 20 }, table)).toEqual({ deg: 20, release: [12, 40] });
    expect(clipAimOf(undefined, table)).toBe(table);
    expect(clipAimOf({}, undefined)).toEqual({ deg: 0 });
    // an emitter: by the sheet, or by the table when the sheet gives the clip no axis
    expect(clipAimOf({ omni: true }, undefined)).toEqual({ deg: 0, omni: true });
    expect(clipAimOf({ release: { frame: 1, atLu: [5, 5] } }, { deg: 0, omni: true })).toEqual({ deg: 0, release: [5, 5], omni: true });
    // a clip with its own aim has an axis: the table's omni does not apply to it
    expect(clipAimOf({ aimDeg: 3 }, { deg: 0, omni: true })).toEqual({ deg: 3 });
  });

  it('a clip with sheet data builds its aim once (the battle reads it every frame), per table entry', () => {
    const meta = { aimDeg: 20, release: { frame: 2, atLu: [10, 50] as const } };
    const table = { deg: 38, release: [12, 40] as const };
    const first = clipAimOf(meta, table);
    expect(clipAimOf(meta, table)).toBe(first);
    // the same clip under another table entry (or none) is worked out again, and kept in turn
    const other = clipAimOf(meta, undefined);
    expect(other).not.toBe(first);
    expect(other).toEqual({ deg: 20, release: [10, 50] });
    expect(clipAimOf(meta, undefined)).toBe(other);
    // another clip (another sheet's copy of it) has its own
    expect(clipAimOf({ ...meta }, undefined)).not.toBe(other);
  });
});

// ---------------------------------------------------------------------------------------------
// The atlas view

const frameSet = new Map<string, Texture[]>();
/** Four distinct frames per clip, so a test can tell which clip and step is on screen. */
function frames(clip: string): Texture[] {
  let f = frameSet.get(clip);
  if (!f) {
    f = Array.from({ length: 4 }, () => new Texture());
    frameSet.set(clip, f);
  }
  return f;
}

const TIMING = { durationsMs: [100, 200, 100, 200], durationMs: 600, impactAt: 0.5, impactStep: 2, holdStep: 1, frames: 4, sequence: [0, 1, 2, 3] };
type ClipMeta = Record<string, unknown>;

/** A shooter's sheet with aimed variants of attack A (as if its extras sheet had merged), the base clip level. */
function sheet(o: { aimed?: boolean; omni?: boolean; altAimed?: boolean; patch?: Record<string, ClipMeta> } = {}): AtlasData {
  const aimed = o.aimed !== false;
  const animations: Record<string, Texture[]> = { idle: frames('idle'), walk: frames('walk'), attack: frames('attack'), attack_alt: frames('attack_alt'), hit: frames('hit'), die: frames('die') };
  const clips: Record<string, ClipMeta> = {
    idle: { durationsMs: [200, 200, 200, 200], loop: true },
    walk: { durationsMs: [150, 150, 150, 150], loop: true, naturalSpeedLuPerS: 60 },
    attack: { ...TIMING, aimDeg: 0, release: { frame: 2, atLu: [30, 40] }, ...(o.omni ? { omni: true } : {}) },
    attack_alt: { ...TIMING, aimDeg: 5, release: { frame: 2, atLu: [10, 70] } },
    hit: { durationsMs: [100, 100, 100, 100] },
    die: { durationsMs: [100, 100, 100, 100], hideUnitAtMs: 400 },
  };
  if (aimed) {
    for (const [name, deg, at] of [
      ['attack_up45', 44.6, [31.2, 52.4]],
      ['attack_up70', 70.2, [24, 60]],
      ['attack_down', -31, [33, 30]],
    ] as const) {
      animations[name] = frames(name);
      clips[name] = { ...TIMING, aimOf: 'attack', aimDeg: deg, release: { frame: 2, atLu: at } };
    }
  }
  if (o.altAimed) {
    animations['attack_alt_up45'] = frames('attack_alt_up45');
    clips['attack_alt_up45'] = { ...TIMING, aimOf: 'attack_alt', aimDeg: 47, release: { frame: 2, atLu: [14, 80] } };
  }
  for (const [k, v] of Object.entries(o.patch ?? {})) clips[k] = { ...clips[k], ...v };
  return { luPerUnit: 1, animations, clips, heightLu: 68, gait: 'biped' } as unknown as AtlasData;
}

type AimHooks = UnitView & {
  aimInfo(): { variants: { anim: string; deg: number; omni: boolean; aimed?: number[] }[]; next: string | null; maxLeanDeg: number } | null;
  aimLean(deg: number): void;
  aimNow(i?: number): { x: number; y: number; deg: number; drawnDeg: number; leanDeg: number; omni: boolean } | null;
  muzzleNow(i?: number): { x: number; y: number } | null;
  playAlt(o: { impactAtMs?: number; aimAt?: number }): void;
  setIdentity(o: { id: number; seed: number }): void;
  setGait(o: { speedLuPerS: number }): void;
};

/** A Crossbowman-sheeted view (item 44's table says -4 degrees; a sheet with its own aim wins). */
function view(s: AtlasData, side: 0 | 1 = 0, source = 'art/units/medieval/crossbowman.json'): AimHooks {
  const base = MANIFEST['unit.crossbowman'] ?? MANIFEST['unit.bonker'];
  if (!base) throw new Error('no base entry');
  const def: VisualDef = { ...base, source, heightLu: 68, events: { attack: { impactAt: 0.5 } } };
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker });
  a.register(source, s);
  const v = a.createUnit({ key: 'unit.crossbowman', def, side, teamPreset: 'default', seed: 3 }) as unknown as AimHooks;
  v.setIdentity({ id: 2, seed: 3 });
  v.setPose({ x: 100, y: 0, facing: side === 0 ? 1 : -1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'ranged' });
  v.setGait({ speedLuPerS: 0 });
  return v;
}

const shown = (v: UnitView): Texture => ((v.root.children[1] as Container).children[1] as Sprite).texture;
/** The clip and step on screen. */
function onScreen(v: UnitView): string {
  const t = shown(v);
  for (const [clip, f] of frameSet) {
    const i = f.indexOf(t);
    if (i >= 0) return `${clip}:${i}`;
  }
  return '?';
}

describe('the atlas view plays the aimed clip of its variant (contract C2)', () => {
  it('a shot up at about 45 degrees plays attack_up45; its weapon angle and release are that clip\'s', () => {
    const v = view(sheet());
    v.play('attack', { impactAtMs: 300, aimAt: 48 } as never);
    v.update(16);
    expect(onScreen(v)).toBe('attack_up45:0');
    expect(v.aimNow(0)?.drawnDeg).toBe(44.6);
    // the shot leaves from the clip's release (x forward, y up in the data; y down on screen)
    expect(v.muzzleNow(0)).toEqual({ x: 31.2, y: -52.4 });
  });

  it('down at a close target plays attack_down, level the base clip, steep up attack_up70', () => {
    for (const [want, clip] of [
      [-35, 'attack_down'],
      [3, 'attack'],
      [66, 'attack_up70'],
    ] as const) {
      const v = view(sheet());
      v.play('attack', { impactAtMs: 300, aimAt: want } as never);
      v.update(16);
      expect(onScreen(v), `${want}`).toBe(`${clip}:0`);
    }
  });

  it('an aimed clip keeps the base clip\'s timing step for step (the impact on the same moment)', () => {
    const base = view(sheet());
    const up = view(sheet());
    base.play('attack', { impactAtMs: 450 } as never);
    up.play('attack', { impactAtMs: 450, aimAt: 50 } as never);
    const raw = (v: UnitView): string[] => {
      const out: string[] = [];
      for (let t = 0; t < 900; t += 10) {
        v.update(10);
        out.push(onScreen(v));
      }
      return out;
    };
    const a = raw(base);
    const b = raw(up);
    const step = (s: string): string => s.replace(/^attack(_up45)?:/, 'attack:');
    expect(b.map(step)).toEqual(a.map(step));
    // the base played its own frames and the aimed one its own, through the impact step (2)
    expect(a).toContain('attack:2');
    expect(b).toContain('attack_up45:2');
    expect(b.some((s) => s.startsWith('attack:'))).toBe(false);
  });

  it('facing left chooses alike: the launch angle is relative to the facing direction', () => {
    const v = view(sheet(), 1);
    v.play('attack', { impactAtMs: 300, aimAt: 48 } as never);
    v.update(16);
    expect(onScreen(v)).toBe('attack_up45:0');
    // the weapon points up and away from the unit, mirrored on screen
    expect(v.aimNow(0)?.deg).toBeCloseTo(44.6, 6);
    expect(v.aimNow(0)?.x).toBeLessThan(0);
  });

  it('without an asked angle (the showcases), or for an emitter, the base clip plays', () => {
    const v = view(sheet());
    v.play('attack', { impactAtMs: 300 } as never);
    v.update(16);
    expect(onScreen(v)).toBe('attack:0');
    const o = view(sheet({ omni: true }));
    o.play('attack', { impactAtMs: 300, aimAt: 60 } as never);
    o.update(16);
    expect(onScreen(o)).toBe('attack:0');
    expect(o.aimNow(0)?.omni).toBe(true);
  });

  it('before the extras sheet has loaded (no aimed frames) the first shot plays the base clip, as before', () => {
    const v = view(sheet({ aimed: false }));
    v.play('attack', { impactAtMs: 300, aimAt: 60 } as never);
    v.update(16);
    expect(onScreen(v)).toBe('attack:0');
    expect(v.aimNow(0)?.drawnDeg).toBe(0);
  });

  it('an aimed clip without its aim is never chosen; a base clip without data falls back to the table', () => {
    const v = view(sheet({ patch: { attack_up45: { aimDeg: undefined }, attack_up70: { aimDeg: undefined } } }));
    v.play('attack', { impactAtMs: 300, aimAt: 50 } as never);
    v.update(16);
    expect(onScreen(v)).toBe('attack:0');
    // the base clip with no sheet data: item 44's table for the Crossbowman (-4 degrees)
    const t = view(sheet({ aimed: false, patch: { attack: { aimDeg: undefined, release: undefined } } }));
    expect(t.aimInfo()?.variants[0]?.deg).toBe(-4);
  });

  it('reports each variant\'s aimed angles (the battle view\'s variant choice counts them)', () => {
    expect(view(sheet()).aimInfo()?.variants).toEqual([{ anim: 'attack', deg: 0, omni: false, aimed: [44.6, 70.2, -31] }]);
    expect(view(sheet({ aimed: false })).aimInfo()?.variants).toEqual([{ anim: 'attack', deg: 0, omni: false }]);
  });

  it('a hit never cuts an aimed attack before its impact hold has shown (it is an attack like its base)', () => {
    const v = view(sheet());
    v.play('attack', { impactAtMs: 300, aimAt: 50 } as never);
    v.update(50);
    v.play('hit');
    v.update(16);
    expect(onScreen(v)).toMatch(/^attack_up45:/);
  });

  it("the second attacker's clip picks its aimed variant too, and its shot leaves that clip's release", () => {
    const v = view(sheet({ altAimed: true }));
    v.playAlt({ impactAtMs: 300, aimAt: 50 });
    v.update(16);
    expect(onScreen(v)).toBe('attack_alt_up45:0');
    expect(v.aimNow(1)?.drawnDeg).toBe(47);
    expect(v.muzzleNow(1)).toEqual({ x: 14, y: -80 });
    const plain = view(sheet({ altAimed: true }));
    plain.playAlt({ impactAtMs: 300 });
    plain.update(16);
    expect(onScreen(plain)).toBe('attack_alt:0');
  });

  it('the lean covers the residual: between shots the weapon counts as aimed as in the last (aimed) shot', () => {
    const v = view(sheet());
    v.play('attack', { impactAtMs: 300, aimAt: 50 } as never);
    for (let t = 0; t < 1200; t += 16) v.update(16);
    // the attack is over: the drawn aim the battle view leans from is still the aimed clip's
    expect(v.aimNow(0)?.drawnDeg).toBe(44.6);
    v.aimLean(5.4);
    for (let t = 0; t < 800; t += 16) v.update(16);
    expect(v.aimNow(0)?.deg).toBeCloseTo(50, 1);
  });
});
