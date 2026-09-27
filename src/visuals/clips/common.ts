/**
 * Shared keyframe clips (DESIGN A11 Clip contract). Values are deltas from the rest pose: degrees
 * (clockwise on screen), lu, and scale multipliers. Negative x is backward (away from the facing
 * direction); negative rotation on a hanging arm swings it forward.
 *
 * Every rig family implements every clip name: spawn, idle, walk, attack, hit, stun, die, victory,
 * ability. Bones a puppet lacks are simply ignored.
 */
import { CLIP_TIMING } from '../style';
import type { ClipDef, Key } from '../types';

const S = CLIP_TIMING;

function clip(id: string, durationMs: number, loop: boolean, tracks: Record<string, Key[]>, extra: Partial<ClipDef> = {}): ClipDef {
  return { id, durationMs, loop, tracks, ...extra };
}

/** Squash on the wind-up (60% of it), stretch at the strike, settle (A11 attack treatment). */
function squashTrack(impactAt: number, lunge = 3): Key[] {
  const w = impactAt * S.attackWindupShare;
  return [
    { t: 0 },
    { t: w, sx: S.attackSquash[0], sy: S.attackSquash[1], x: -1, e: 'out' },
    { t: impactAt, sx: 0.94, sy: 1.07, x: lunge, e: 'in' },
    { t: Math.min(0.95, impactAt + 0.16), sx: 1, sy: 1, x: lunge * 0.6, e: 'out' },
    { t: 1, x: 0, e: 'inOut' },
  ];
}

// ---------------------------------------------------------------------------------------------
// Common (every family)

const common: ClipDef[] = [
  clip('common.spawn', S.spawnMs, false, {
    root: [
      { t: 0, sx: 0.05, sy: 0.05 },
      { t: 0.62, sx: S.spawnOvershoot, sy: S.spawnOvershoot, e: 'out' },
      { t: 1, sx: 1, sy: 1, e: 'inOut' },
    ],
  }),
  clip('common.hit', 170, false, {
    root: [{ t: 0 }, { t: 0.28, x: -S.hitRecoilLu, sx: 0.96, sy: 1.03, e: 'out' }, { t: 1, x: 0, e: 'inOut' }],
    torso: [{ t: 0 }, { t: 0.3, r: 7, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
    head: [{ t: 0 }, { t: 0.3, r: 9, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
    body: [{ t: 0 }, { t: 0.3, r: 3, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
    hull: [{ t: 0 }, { t: 0.3, r: 2, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
  }),
  clip(
    'common.die',
    S.dieMs,
    false,
    {
      root: [
        { t: 0 },
        { t: 0.12, sx: 1.12, sy: 0.88, e: 'out' },
        { t: 0.45, x: -22, y: -26, sx: 1, sy: 1, e: 'out' },
        { t: 0.8, x: -34, y: -2, e: 'in' },
        { t: 0.88, x: -35, y: -5, sx: 1.08, sy: 0.9, e: 'out' },
        { t: 1, x: -36, y: 0, sx: 1, sy: 1, e: 'in' },
      ],
      spin: [{ t: 0 }, { t: 0.12, r: 10 }, { t: 0.8, r: -330, e: 'out' }, { t: 1, r: -360 }],
    },
    { alpha: [{ t: 0, v: 1 }, { t: 0.72, v: 1 }, { t: 1, v: 0 }] },
  ),
  clip('common.stun', S.stunMs, true, {}, { proc: ['dizzy'] }),
  clip('common.victory', S.victoryMs, true, {
    root: [
      { t: 0, sx: 1.08, sy: 0.92 },
      { t: 0.18, sx: 0.95, sy: 1.06, y: -3, e: 'out' },
      { t: 0.42, sx: 1, sy: 1, y: -11, e: 'out' },
      { t: 0.66, y: 0, sx: 1, sy: 1, e: 'in' },
      { t: 0.78, sx: 1.1, sy: 0.9, y: 0, e: 'out' },
      { t: 1, sx: 1.08, sy: 0.92 },
    ],
    armF: [{ t: 0, r: -150 }, { t: 0.42, r: -165, e: 'out' }, { t: 1, r: -150 }],
    foreF: [{ t: 0, r: -15 }, { t: 1, r: -15 }],
    armB: [{ t: 0, r: -60 }, { t: 0.42, r: -95, e: 'out' }, { t: 1, r: -60 }],
    head: [{ t: 0, r: -6 }, { t: 1, r: -6 }],
    neck: [{ t: 0, r: -10 }, { t: 0.42, r: -18 }, { t: 1, r: -10 }],
  }),
  clip('ability.flourish', 600, false, {
    root: [{ t: 0 }, { t: 0.2, sx: 1.1, sy: 0.9, e: 'out' }, { t: 0.5, y: -8, sx: 0.96, sy: 1.05, e: 'out' }, { t: 0.8, y: 0, e: 'in' }, { t: 1 }],
    armF: [{ t: 0 }, { t: 0.5, r: -120, e: 'out' }, { t: 1, e: 'inOut' }],
    neck: [{ t: 0 }, { t: 0.5, r: -14, e: 'out' }, { t: 1, e: 'inOut' }],
  }),
];

// ---------------------------------------------------------------------------------------------
// Biped

const biped: ClipDef[] = [
  clip('biped.idle', S.idleMs, true, {}, { proc: ['breathe'] }),
  clip('biped.walk', S.walkCycleMs, true, {}, { proc: ['walkBiped'] }),
  clip(
    'biped.attack.swing',
    620,
    false,
    {
      root: squashTrack(0.55),
      armF: [{ t: 0 }, { t: 0.33, r: 115, e: 'out' }, { t: 0.55, r: -50, e: 'in' }, { t: 0.72, r: -58, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      foreF: [{ t: 0 }, { t: 0.33, r: -35, e: 'out' }, { t: 0.55, r: 8, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.33, r: 9, e: 'out' }, { t: 0.55, r: -11, e: 'in' }, { t: 0.72, r: -12 }, { t: 1, r: 0, e: 'inOut' }],
      head: [{ t: 0 }, { t: 0.33, r: 6 }, { t: 0.55, r: -7 }, { t: 1 }],
      armB: [{ t: 0 }, { t: 0.33, r: -25, e: 'out' }, { t: 0.55, r: 30, e: 'in' }, { t: 1, e: 'inOut' }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'biped.attack.thrust',
    600,
    false,
    {
      root: squashTrack(0.55, 5),
      armF: [{ t: 0 }, { t: 0.33, r: 32, e: 'out' }, { t: 0.55, r: -28, e: 'in' }, { t: 0.7, r: -30 }, { t: 1, r: 0, e: 'inOut' }],
      foreF: [{ t: 0 }, { t: 0.33, r: -30, e: 'out' }, { t: 0.55, r: 12, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      armB: [{ t: 0 }, { t: 0.33, r: 20, e: 'out' }, { t: 0.55, r: -20, e: 'in' }, { t: 1, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.33, r: 6, e: 'out' }, { t: 0.55, r: -10, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      legF: [{ t: 0 }, { t: 0.55, r: -14, e: 'in' }, { t: 1, e: 'inOut' }],
      legB: [{ t: 0 }, { t: 0.55, r: 12, e: 'in' }, { t: 1, e: 'inOut' }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'biped.attack.shoot',
    520,
    false,
    {
      root: [{ t: 0 }, { t: 0.3, sx: 1.06, sy: 0.95, e: 'out' }, { t: 0.5, x: -2.5, sx: 0.97, sy: 1.03, e: 'out' }, { t: 1, x: 0, sx: 1, sy: 1, e: 'inOut' }],
      armF: [{ t: 0 }, { t: 0.3, r: -4, e: 'out' }, { t: 0.5, r: 14, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      armB: [{ t: 0 }, { t: 0.3, r: -4, e: 'out' }, { t: 0.5, r: 12, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.3, r: -2 }, { t: 0.5, r: 6, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      head: [{ t: 0 }, { t: 0.5, r: 5, e: 'out' }, { t: 1, e: 'inOut' }],
    },
    { impactAt: 0.5 },
  ),
  clip(
    'biped.attack.heavyShot',
    680,
    false,
    {
      root: [{ t: 0 }, { t: 0.33, sx: 1.1, sy: 0.9, e: 'out' }, { t: 0.55, x: -5, sx: 0.95, sy: 1.05, e: 'out' }, { t: 1, x: 0, sx: 1, sy: 1, e: 'inOut' }],
      armF: [{ t: 0 }, { t: 0.33, r: -6, e: 'out' }, { t: 0.55, r: 18, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      armB: [{ t: 0 }, { t: 0.55, r: 14, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.33, r: -4 }, { t: 0.55, r: 12, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      pelvis: [{ t: 0 }, { t: 0.33, y: 2 }, { t: 0.55, y: 1 }, { t: 1, y: 0 }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'biped.attack.bow',
    720,
    false,
    {
      root: squashTrack(0.6, 0),
      armB: [{ t: 0 }, { t: 0.36, r: 55, e: 'out' }, { t: 0.58, r: 60 }, { t: 0.62, r: -15, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      foreB: [{ t: 0 }, { t: 0.36, r: -70, e: 'out' }, { t: 0.6, r: -75 }, { t: 0.66, r: -10, e: 'out' }, { t: 1, e: 'inOut' }],
      armF: [{ t: 0 }, { t: 0.36, r: -6, e: 'out' }, { t: 0.62, r: 4, e: 'out' }, { t: 1, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.36, r: 5, e: 'out' }, { t: 0.62, r: -3, e: 'out' }, { t: 1, e: 'inOut' }],
      bowString: [{ t: 0 }, { t: 0.36, x: -9, e: 'out' }, { t: 0.6, x: -9.5 }, { t: 0.63, x: 1, e: 'out' }, { t: 0.72, x: 0 }],
    },
    { impactAt: 0.6 },
  ),
  clip(
    'biped.attack.throw',
    640,
    false,
    {
      root: squashTrack(0.55, 3),
      armF: [{ t: 0 }, { t: 0.33, r: 150, e: 'out' }, { t: 0.55, r: -75, e: 'in' }, { t: 0.7, r: -80 }, { t: 1, r: 0, e: 'inOut' }],
      foreF: [{ t: 0 }, { t: 0.33, r: -40, e: 'out' }, { t: 0.55, r: 0, e: 'in' }, { t: 1, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.33, r: 10, e: 'out' }, { t: 0.55, r: -12, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      armB: [{ t: 0 }, { t: 0.33, r: -45, e: 'out' }, { t: 0.55, r: 25, e: 'in' }, { t: 1, e: 'inOut' }],
      head: [{ t: 0 }, { t: 0.33, r: 5 }, { t: 0.55, r: -5 }, { t: 1 }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'biped.attack.cast',
    700,
    false,
    {
      root: squashTrack(0.55, 0),
      armF: [{ t: 0 }, { t: 0.33, r: -150, e: 'out' }, { t: 0.55, r: -35, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      armB: [{ t: 0 }, { t: 0.33, r: -140, e: 'out' }, { t: 0.55, r: -30, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      foreF: [{ t: 0 }, { t: 0.33, r: -20 }, { t: 0.55, r: -5 }, { t: 1 }],
      torso: [{ t: 0 }, { t: 0.33, r: 6, e: 'out' }, { t: 0.55, r: -6, e: 'in' }, { t: 1, e: 'inOut' }],
      head: [{ t: 0 }, { t: 0.33, r: -10, e: 'out' }, { t: 0.55, r: 4 }, { t: 1 }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'biped.attack.drum',
    620,
    false,
    {
      root: squashTrack(0.5, 0),
      armF: [{ t: 0 }, { t: 0.3, r: -80, e: 'out' }, { t: 0.5, r: 10, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      foreF: [{ t: 0 }, { t: 0.3, r: -40 }, { t: 0.5, r: 0, e: 'in' }, { t: 1 }],
      armB: [{ t: 0 }, { t: 0.3, r: -30 }, { t: 0.5, r: 10, e: 'in' }, { t: 1 }],
      head: [{ t: 0 }, { t: 0.3, r: -8 }, { t: 0.5, r: 6 }, { t: 1 }],
    },
    { impactAt: 0.5 },
  ),
];

// ---------------------------------------------------------------------------------------------
// Quadruped and rider

const quad: ClipDef[] = [
  clip('quadruped.idle', S.idleMs * 1.3, true, {}, { proc: ['breathe'] }),
  clip('quadruped.walk', S.walkCycleMs, true, {}, { proc: ['walkQuad'] }),
  clip(
    'quadruped.attack.bite',
    560,
    false,
    {
      root: squashTrack(0.55, 5),
      neck: [{ t: 0 }, { t: 0.33, r: -16, x: -3, e: 'out' }, { t: 0.55, r: 18, x: 5, e: 'in' }, { t: 0.72, r: 14 }, { t: 1, r: 0, x: 0, e: 'inOut' }],
      jaw: [{ t: 0 }, { t: 0.33, r: 30, e: 'out' }, { t: 0.55, r: 0, e: 'in' }, { t: 1 }],
      legFN: [{ t: 0 }, { t: 0.55, r: -12 }, { t: 1 }],
      tail: [{ t: 0 }, { t: 0.33, r: -20 }, { t: 0.55, r: 15 }, { t: 1 }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'quadruped.attack.gore',
    620,
    false,
    {
      root: squashTrack(0.55, 7),
      body: [{ t: 0 }, { t: 0.33, r: 5, x: -4, e: 'out' }, { t: 0.55, r: -6, x: 5, e: 'in' }, { t: 1, r: 0, x: 0, e: 'inOut' }],
      neck: [{ t: 0 }, { t: 0.33, r: 14, e: 'out' }, { t: 0.55, r: -26, e: 'in' }, { t: 0.72, r: -20 }, { t: 1, r: 0, e: 'inOut' }],
      legFN: [{ t: 0 }, { t: 0.33, r: 12 }, { t: 0.55, r: -18, e: 'in' }, { t: 1 }],
      legFF: [{ t: 0 }, { t: 0.33, r: 8 }, { t: 0.55, r: -12, e: 'in' }, { t: 1 }],
      tail: [{ t: 0 }, { t: 0.33, r: -25 }, { t: 0.55, r: 20 }, { t: 1 }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'quadruped.attack.stomp',
    900,
    false,
    {
      root: squashTrack(0.55, 2),
      body: [{ t: 0 }, { t: 0.33, r: -12, e: 'out' }, { t: 0.55, r: 3, e: 'in' }, { t: 0.66, r: 1 }, { t: 1, r: 0, e: 'inOut' }],
      legFN: [{ t: 0 }, { t: 0.33, r: -28, e: 'out' }, { t: 0.55, r: 2, e: 'in' }, { t: 1 }],
      legFF: [{ t: 0 }, { t: 0.33, r: -22, e: 'out' }, { t: 0.55, r: 2, e: 'in' }, { t: 1 }],
      neck: [{ t: 0 }, { t: 0.33, r: -18, e: 'out' }, { t: 0.55, r: 12, e: 'in' }, { t: 1, e: 'inOut' }],
      trunk: [{ t: 0 }, { t: 0.33, r: -50, e: 'out' }, { t: 0.55, r: 20, e: 'in' }, { t: 1, e: 'inOut' }],
    },
    { impactAt: 0.55 },
  ),
  clip('rider.idle', S.idleMs * 1.3, true, {}, { proc: ['breathe'] }),
  clip('rider.walk', S.walkCycleMs, true, {}, { proc: ['walkQuad', 'riderBounce'] }),
  clip(
    'rider.attack.lance',
    620,
    false,
    {
      root: squashTrack(0.55, 6),
      armF: [{ t: 0 }, { t: 0.33, r: 25, e: 'out' }, { t: 0.55, r: -20, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.33, r: 8, e: 'out' }, { t: 0.55, r: -14, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      neck: [{ t: 0 }, { t: 0.33, r: -12 }, { t: 0.55, r: 10, e: 'in' }, { t: 1 }],
      legFN: [{ t: 0 }, { t: 0.33, r: -30 }, { t: 0.55, r: 5 }, { t: 1 }],
      legFF: [{ t: 0 }, { t: 0.33, r: -25 }, { t: 0.55, r: 5 }, { t: 1 }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'rider.attack.swing',
    640,
    false,
    {
      root: squashTrack(0.55, 4),
      armF: [{ t: 0 }, { t: 0.33, r: 120, e: 'out' }, { t: 0.55, r: -55, e: 'in' }, { t: 0.72, r: -60 }, { t: 1, r: 0, e: 'inOut' }],
      foreF: [{ t: 0 }, { t: 0.33, r: -30, e: 'out' }, { t: 0.55, r: 10, e: 'in' }, { t: 1, e: 'inOut' }],
      torso: [{ t: 0 }, { t: 0.33, r: 10, e: 'out' }, { t: 0.55, r: -14, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      neck: [{ t: 0 }, { t: 0.33, r: -8 }, { t: 0.55, r: 8 }, { t: 1 }],
    },
    { impactAt: 0.55 },
  ),
];

// ---------------------------------------------------------------------------------------------
// Vehicle, walker, flyer

const machines: ClipDef[] = [
  clip('vehicle.idle', 900, true, {}, { proc: ['breathe'] }),
  clip('vehicle.walk', S.walkCycleMs, true, {}, { proc: ['rollVehicle'] }),
  clip(
    'vehicle.attack.recoil',
    620,
    false,
    {
      root: [{ t: 0 }, { t: 0.25, sx: 1.04, sy: 0.97, e: 'out' }, { t: 0.4, x: -3, sx: 0.97, sy: 1.03, e: 'out' }, { t: 1, x: 0, sx: 1, sy: 1, e: 'inOut' }],
      barrel: [{ t: 0 }, { t: 0.38 }, { t: 0.42, x: -7, e: 'out' }, { t: 1, x: 0, e: 'inOut' }],
      hull: [{ t: 0 }, { t: 0.4 }, { t: 0.48, r: 3, e: 'out' }, { t: 1, r: 0, e: 'inOut' }],
      turret: [{ t: 0 }, { t: 0.3, r: -3, e: 'out' }, { t: 0.45, r: 2 }, { t: 1, r: 0, e: 'inOut' }],
    },
    { impactAt: 0.4 },
  ),
  clip(
    'vehicle.attack.ram',
    900,
    false,
    {
      root: squashTrack(0.6, 4),
      log: [{ t: 0 }, { t: 0.4, x: -16, r: 4, e: 'out' }, { t: 0.6, x: 12, r: -2, e: 'in' }, { t: 0.72, x: 9 }, { t: 1, x: 0, r: 0, e: 'inOut' }],
      hull: [{ t: 0 }, { t: 0.4, r: 2 }, { t: 0.6, r: -2, e: 'in' }, { t: 1, r: 0 }],
    },
    { impactAt: 0.6 },
  ),
  clip(
    'vehicle.die',
    900,
    false,
    {
      root: [{ t: 0 }, { t: 0.2, y: -10, sx: 0.95, sy: 1.08, e: 'out' }, { t: 0.45, y: 0, sx: 1.1, sy: 0.85, e: 'in' }, { t: 1, y: 4, sx: 1.05, sy: 0.8 }],
      hull: [{ t: 0 }, { t: 0.2, r: -8 }, { t: 0.45, r: 6 }, { t: 1, r: 10 }],
      turret: [{ t: 0 }, { t: 0.2, y: -12, r: -25, e: 'out' }, { t: 0.5, y: -4, r: -40, e: 'in' }, { t: 1, y: 0, r: -45 }],
      barrel: [{ t: 0 }, { t: 0.4, r: 20 }, { t: 1, r: 35 }],
    },
    { alpha: [{ t: 0, v: 1 }, { t: 0.7, v: 1 }, { t: 1, v: 0 }] },
  ),
  clip('walker.idle', S.idleMs, true, {}, { proc: ['breathe'] }),
  clip('walker.walk', S.walkCycleMs * 1.4, true, {}, { proc: ['walkWalker'] }),
  clip(
    'walker.attack.punch',
    640,
    false,
    {
      root: squashTrack(0.55, 4),
      armF: [{ t: 0 }, { t: 0.33, r: 45, x: -3, e: 'out' }, { t: 0.55, r: -70, x: 4, e: 'in' }, { t: 0.72, r: -65 }, { t: 1, r: 0, x: 0, e: 'inOut' }],
      foreF: [{ t: 0 }, { t: 0.33, r: -50, e: 'out' }, { t: 0.55, r: 5, e: 'in' }, { t: 1, e: 'inOut' }],
      hull: [{ t: 0 }, { t: 0.33, r: 5, e: 'out' }, { t: 0.55, r: -7, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
    },
    { impactAt: 0.55 },
  ),
  clip(
    'walker.attack.slam',
    720,
    false,
    {
      root: squashTrack(0.55, 3),
      armF: [{ t: 0 }, { t: 0.33, r: -150, e: 'out' }, { t: 0.55, r: -40, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      armB: [{ t: 0 }, { t: 0.33, r: -140, e: 'out' }, { t: 0.55, r: -35, e: 'in' }, { t: 1, r: 0, e: 'inOut' }],
      hull: [{ t: 0 }, { t: 0.33, r: 6, y: -4, e: 'out' }, { t: 0.55, r: -8, y: 2, e: 'in' }, { t: 1, r: 0, y: 0, e: 'inOut' }],
    },
    { impactAt: 0.55 },
  ),
  clip('flyer.idle', 1400, true, {}, { proc: ['hover', 'spinRotor'] }),
  clip('flyer.walk', 1400, true, { body: [{ t: 0, r: -5 }, { t: 1, r: -5 }] }, { proc: ['hover', 'spinRotor'] }),
  clip(
    'flyer.attack.gun',
    420,
    false,
    {
      body: [{ t: 0 }, { t: 0.3, r: 4, e: 'out' }, { t: 0.5, r: 7, x: -2, e: 'out' }, { t: 1, r: 0, x: 0, e: 'inOut' }],
      barrel: [{ t: 0 }, { t: 0.48 }, { t: 0.52, x: -3 }, { t: 1, x: 0 }],
    },
    { impactAt: 0.5, proc: ['spinRotor'] },
  ),
  clip(
    'flyer.attack.drop',
    620,
    false,
    {
      gondola: [{ t: 0 }, { t: 0.3, r: -6, e: 'out' }, { t: 0.5, r: 8, e: 'in' }, { t: 0.75, r: -4 }, { t: 1, e: 'inOut' }],
      hatch: [{ t: 0 }, { t: 0.4, r: 0 }, { t: 0.5, r: 70, e: 'out' }, { t: 0.8, r: 70 }, { t: 1, r: 0 }],
      body: [{ t: 0 }, { t: 0.5, y: -3, e: 'out' }, { t: 1, y: 0, e: 'inOut' }],
    },
    { impactAt: 0.5, proc: ['hover'] },
  ),
  clip(
    'flyer.attack.beam',
    600,
    false,
    {
      body: [{ t: 0 }, { t: 0.3, r: 8, e: 'out' }, { t: 0.5, r: 10 }, { t: 1, r: 0, e: 'inOut' }],
      emitter: [{ t: 0 }, { t: 0.4, sx: 1.4, sy: 1.4, e: 'out' }, { t: 0.6, sx: 1.2, sy: 1.2 }, { t: 1, sx: 1, sy: 1 }],
    },
    { impactAt: 0.5, proc: ['hover', 'spinRotor'] },
  ),
  clip(
    'flyer.die',
    1000,
    false,
    {
      root: [{ t: 0 }, { t: 0.15, y: -6, e: 'out' }, { t: 0.85, x: -30, y: 40, e: 'in' }, { t: 1, x: -34, y: 44 }],
      body: [{ t: 0 }, { t: 0.2, r: -10 }, { t: 1, r: 70, e: 'in' }],
    },
    { alpha: [{ t: 0, v: 1 }, { t: 0.75, v: 1 }, { t: 1, v: 0 }], proc: ['spinRotor'] },
  ),
];

// ---------------------------------------------------------------------------------------------
// Turret (DESIGN A11 Turret clips)

const turret: ClipDef[] = [
  clip('turret.idle', 3200, true, { pivot: [{ t: 0 }, { t: 0.3, r: -5, e: 'inOut' }, { t: 0.7, r: 4, e: 'inOut' }, { t: 1, e: 'inOut' }] }),
  clip(
    'turret.fire',
    300,
    false,
    {
      pivot: [{ t: 0 }, { t: 0.1, sx: 1.08, sy: 0.92, e: 'out' }, { t: 0.4, sx: 1, sy: 1, e: 'inOut' }],
      barrel: [{ t: 0 }, { t: 0.08, x: -6, e: 'out' }, { t: 0.7, x: 0, e: 'inOut' }],
      arm: [{ t: 0 }, { t: 0.15, r: -125, e: 'out' }, { t: 0.4, r: -115 }, { t: 1, r: 0, e: 'inOut' }],
      lid: [{ t: 0 }, { t: 0.1, r: -30, e: 'out' }, { t: 0.8, r: 0, e: 'inOut' }],
    },
    { impactAt: 0.1 },
  ),
  clip('turret.build', 460, false, {
    root: [
      { t: 0, y: -70, sx: 0.9, sy: 1.1 },
      { t: 0.55, y: 0, sx: 0.95, sy: 1.08, e: 'in' },
      { t: 0.72, sx: 1.18, sy: 0.82, e: 'out' },
      { t: 1, sx: 1, sy: 1, e: 'outBack' },
    ],
  }),
  clip(
    'turret.sell',
    380,
    false,
    { root: [{ t: 0 }, { t: 0.35, sx: 1.15, sy: 0.85, e: 'out' }, { t: 1, sx: 0.2, sy: 0.05, y: 4, e: 'in' }] },
    { alpha: [{ t: 0, v: 1 }, { t: 0.7, v: 1 }, { t: 1, v: 0 }] },
  ),
  clip(
    'turret.modernise',
    700,
    false,
    { root: [{ t: 0 }, { t: 0.2, sx: 1.08, sy: 0.92, e: 'out' }, { t: 1, y: 40, sx: 0.9, sy: 0.7, e: 'in' }] },
    { alpha: [{ t: 0, v: 1 }, { t: 0.6, v: 1 }, { t: 1, v: 0 }] },
  ),
];

export const COMMON_CLIPS: readonly ClipDef[] = [...common, ...biped, ...quad, ...machines, ...turret];
