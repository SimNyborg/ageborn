/**
 * Procedural motion helpers mixed into keyframe clips (DESIGN B5: "plus procedural helpers (walk
 * cycle, bob, squash)"). Each helper reads the clip phase (walks: distance-driven phase) and returns
 * bone deltas for the bones the puppet actually has.
 *
 * Walk cycles use a linear stance sweep and an eased swing, so a planted foot moves at a nearly
 * constant speed and the stride distance per cycle matches the ground speed (A12 checklist item 2:
 * no foot sliding beyond 3 px).
 */
import { CLIP_TIMING } from '../style';
import type { BoneDelta, ProcId } from '../types';

export interface ProcContext {
  bones: ReadonlySet<string>;
  heightLu: number;
  /** Hip to sole, lu. */
  legLu: number;
  /** Ground distance per walk cycle, lu. */
  strideLu: number;
  /** Nominal speed for time-driven walks (gallery, no movement reported). */
  speedLuPerSec: number;
  wheelRadiusLu: number;
  /** Leg swing amplitude in degrees. */
  legDeg: number;
  twirlBone?: string;
  air: boolean;
}

const TAU = Math.PI * 2;

function d(r = 0, x = 0, y = 0, sx = 1, sy = 1): BoneDelta {
  return { r, x, y, sx, sy };
}

/** Leg angle over a cycle: linear stance from forward (-A) to back (+A), eased swing return. */
export function legAngle(phase: number, amp: number): { angle: number; swing: number } {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.5) return { angle: -amp + 2 * amp * (p / 0.5), swing: 0 };
  const s = (p - 0.5) / 0.5;
  const e = s < 0.5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);
  return { angle: amp - 2 * amp * e, swing: Math.sin(s * Math.PI) };
}

/** Stride per cycle for a leg of length L swinging ±amp degrees (two steps per cycle). */
export function strideFor(legLu: number, ampDeg: number): number {
  return 4 * legLu * Math.sin((ampDeg * Math.PI) / 180);
}

export function* procDeltas(procs: readonly ProcId[], c: ProcContext, u: number, clockMs: number): Generator<[string, BoneDelta]> {
  const has = (b: string): boolean => c.bones.has(b);
  const k = c.heightLu / CLIP_TIMING.idleBobLu / 30; // scale small motions with size
  for (const p of procs) {
    switch (p) {
      case 'breathe': {
        const s = 0.5 - 0.5 * Math.cos(u * TAU);
        const bob = -CLIP_TIMING.idleBobLu * s * Math.max(0.6, Math.min(1.6, k));
        if (has('pelvis')) yield ['pelvis', d(0, 0, bob)];
        else if (has('body')) yield ['body', d(0, 0, bob)];
        else if (has('hull')) yield ['hull', d(0, 0, 0.35 * Math.sin((clockMs / 70) * TAU * 0.25))];
        if (has('torso')) yield ['torso', d(0, 0, 0, 1, 1 + 0.02 * s)];
        if (has('armF')) yield ['armF', d(-2 * s)];
        if (has('armB')) yield ['armB', d(2 * s)];
        if (has('tail')) yield ['tail', d(8 * Math.sin(u * TAU))];
        break;
      }
      case 'walkBiped': {
        const amp = c.legDeg;
        const f = legAngle(u, amp);
        const b = legAngle(u + 0.5, amp);
        if (has('legF')) yield ['legF', d(f.angle)];
        if (has('shinF')) yield ['shinF', d(38 * f.swing)];
        if (has('legB')) yield ['legB', d(b.angle)];
        if (has('shinB')) yield ['shinB', d(38 * b.swing)];
        const bob = CLIP_TIMING.walkBobLu * (0.5 + 0.5 * Math.cos(u * 2 * TAU)) - CLIP_TIMING.walkBobLu * 0.5;
        if (has('pelvis')) yield ['pelvis', d(0, 0, bob)];
        if (has('torso')) yield ['torso', d(-3 + 1.5 * Math.sin(u * 2 * TAU))];
        if (has('armF')) yield ['armF', d(-b.angle * 0.35)];
        if (has('armB')) yield ['armB', d(-f.angle * 0.8)];
        if (has('head')) yield ['head', d(1.5 * Math.sin(u * 2 * TAU + 0.6))];
        break;
      }
      case 'walkQuad': {
        const amp = c.legDeg;
        const a = legAngle(u, amp);
        const b = legAngle(u + 0.5, amp);
        if (has('legFN')) yield ['legFN', d(a.angle, 0, -1.5 * a.swing)];
        if (has('legBF')) yield ['legBF', d(a.angle, 0, -1.5 * a.swing)];
        if (has('legFF')) yield ['legFF', d(b.angle, 0, -1.5 * b.swing)];
        if (has('legBN')) yield ['legBN', d(b.angle, 0, -1.5 * b.swing)];
        const bob = CLIP_TIMING.walkBobLu * 0.8 * Math.cos(u * 2 * TAU);
        if (has('body')) yield ['body', d(1.2 * Math.sin(u * 2 * TAU), 0, bob)];
        if (has('neck')) yield ['neck', d(3 * Math.sin(u * 2 * TAU + 1))];
        if (has('tail')) yield ['tail', d(10 * Math.sin(u * TAU))];
        break;
      }
      case 'walkWalker': {
        const amp = c.legDeg;
        const f = legAngle(u, amp);
        const b = legAngle(u + 0.5, amp);
        if (has('legF')) yield ['legF', d(f.angle)];
        if (has('shinF')) yield ['shinF', d(30 * f.swing)];
        if (has('footF')) yield ['footF', d(-f.angle - 30 * f.swing)];
        if (has('legB')) yield ['legB', d(b.angle)];
        if (has('shinB')) yield ['shinB', d(30 * b.swing)];
        if (has('footB')) yield ['footB', d(-b.angle - 30 * b.swing)];
        const stomp = Math.pow(Math.abs(Math.cos(u * 2 * TAU * 0.5)), 6);
        if (has('hull')) yield ['hull', d(2 * Math.sin(u * 2 * TAU), 0, CLIP_TIMING.walkBobLu * 1.4 * (stomp - 0.5))];
        if (has('armF')) yield ['armF', d(-b.angle * 0.4)];
        if (has('armB')) yield ['armB', d(-f.angle * 0.4)];
        break;
      }
      case 'rollVehicle': {
        const dist = u * c.strideLu;
        const deg = (dist / (TAU * Math.max(1, c.wheelRadiusLu))) * 360;
        for (const w of ['wheel1', 'wheel2', 'wheel3', 'wheel4', 'wheel5']) if (has(w)) yield [w, d(deg)];
        if (has('treadTeeth')) yield ['treadTeeth', d(0, -(dist % 8))];
        if (has('hull')) yield ['hull', d(0.8 * Math.sin(u * 6 * TAU), 0, 0.8 * Math.sin(u * 4 * TAU + 1))];
        break;
      }
      case 'hover': {
        const s = Math.sin((clockMs / 1400) * TAU);
        const target = has('body') ? 'body' : 'hull';
        yield [target, d(2 * Math.sin((clockMs / 2100) * TAU), 0, 3.5 * s)];
        if (has('gondola')) yield ['gondola', d(4 * Math.sin((clockMs / 1400) * TAU - 0.8))];
        break;
      }
      case 'spinRotor': {
        const s = Math.cos((clockMs / 90) * TAU);
        if (has('rotor')) yield ['rotor', d(0, 0, 0, 0.15 + 0.85 * Math.abs(s), 1)];
        if (has('rotorB')) yield ['rotorB', d(0, 0, 0, 0.15 + 0.85 * Math.abs(Math.sin((clockMs / 90) * TAU)), 1)];
        if (has('prop')) yield ['prop', d(0, 0, 0, 1, 0.15 + 0.85 * Math.abs(s))];
        break;
      }
      case 'riderBounce': {
        const bob = 1.8 * (0.5 - 0.5 * Math.cos(u * 2 * TAU));
        if (has('pelvis')) yield ['pelvis', d(0, 0, -bob)];
        if (has('torso')) yield ['torso', d(-4 + 2 * Math.sin(u * 2 * TAU))];
        break;
      }
      case 'dizzy': {
        if (has('head')) yield ['head', d(9 * Math.sin(u * 2 * TAU))];
        if (has('snout')) yield ['snout', d(7 * Math.sin(u * 2 * TAU))];
        if (has('torso')) yield ['torso', d(4 * Math.sin(u * TAU))];
        if (has('body')) yield ['body', d(3 * Math.sin(u * TAU))];
        if (has('hull')) yield ['hull', d(2.5 * Math.sin(u * TAU))];
        break;
      }
      case 'tremble': {
        const j = Math.sin(clockMs * 0.9) * 0.6;
        yield ['root', d(0, j, 0)];
        break;
      }
    }
  }
}
