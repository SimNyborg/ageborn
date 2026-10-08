/**
 * The victory moments' choreography (owner request 2026-10-07; DESIGN A9 #7, A12; ui-plan MR-129).
 *
 * Each move is a script that writes one scene with the {@link SceneBuilder}: both Generals pop up
 * behind a little wall, then the five beats of ui-plan 5.1: anticipation (a wind-up, a nervous gulp),
 * the action, the impact (a hit-stop, a squash, a word burst, a flash and a kick of the camera),
 * follow-through (rebounds, wobbles) and residue (dizzy stars, cream, feathers, a twinkle, confetti).
 *
 * Deterministic: particles come from the match seed, so a Result always plays the same frames.
 * Reduce motion: the same scene becomes a two-frame storyboard (the set-up, then the outcome) that
 * cross-fades with no movement, shake, flash or hit-stop ({@link storyboard}).
 */
import { mulberry32, type CosmeticRng } from '@/core';
import { avatarSvg, type ResolvedLook } from '../../../components/avatar/render';
import type { PartLibrary } from '../../../components/avatar/types';
import * as A from './art';
import type { MomentKind } from './moves';
import { poseAt, SceneBuilder, STAGE_H, STAGE_W, type Ease, type NodeIn, type PoseIn, type Scene, type SceneNode } from './timeline';

export interface MomentInput {
  move: string;
  kind: MomentKind;
  seed: number;
  me: ResolvedLook;
  foe: ResolvedLook;
  /** The avatar part library (starters plus loaded wearables). */
  lib: PartLibrary;
  /** Team colours of the current preset (A11): your pennant and theirs. */
  team: { me: string; foe: string };
  reduce: boolean;
  /** Settings: hit-stop on/off and the shake strength (0-1). */
  hitstop: boolean;
  shake: number;
  /** Lite graphics: fewer particles. */
  lite: boolean;
  t: (key: string, p?: Record<string, string | number>) => string;
}

// ---------------------------------------------------------------------------------------------
// Layout (scene units; a General's bust is the avatar's 120 x 120 box at scale 1)
// ---------------------------------------------------------------------------------------------

/** The bust's bottom edge (avatar y 120) and the wall's rail: the wall hides the bust below y 104. */
const BASE_Y = 156;
const WALL_Y = 140;
const TOP_Y = BASE_Y - 120;
export const ME_X = 98;
export const FOE_X = 242;

type Who = 'me' | 'foe';
type Side = 'R' | 'L';

interface Ctx {
  b: SceneBuilder;
  m: MomentInput;
  rng: CosmeticRng;
  exprs: Record<Who, readonly A.ExpressionId[]>;
  /** Backdrop node ids (shared by both storyboard frames). */
  backdrop: Set<string>;
}

let svgSerial = 0;
/** SVG markup with ids unique to this scene node (the art carries the `§` placeholder). */
function uniq(svg: string): string {
  svgSerial = (svgSerial + 1) % 1e6;
  return svg.replace(/§/g, `vm${svgSerial}-`);
}

const art = (a: A.Art, look?: ResolvedLook): string => uniq(A.svgOf(a, look));

const cxOf = (who: Who): number => (who === 'me' ? ME_X : FOE_X);
const lookOf = (c: Ctx, who: Who): ResolvedLook => (who === 'me' ? c.m.me : c.m.foe);

/** A General's bust with an expression, as SVG (figure only, no plate). */
function portrait(c: Ctx, who: Who, x: A.ExpressionId): string {
  const lib = { ...c.m.lib, ...A.MOMENT_FACES };
  return uniq(avatarSvg(A.withExpression(lookOf(c, who), x), lib, { crop: 'bust', detail: 'full', motion: false, part: 'figure' }));
}

/** Rotates (x, y) around (ox, oy) by `deg` (CSS sense: clockwise on screen). */
function rot(x: number, y: number, ox: number, oy: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const dx = x - ox;
  const dy = y - oy;
  return [ox + dx * Math.cos(a) - dy * Math.sin(a), oy + dx * Math.sin(a) + dy * Math.cos(a)];
}

// ---------------------------------------------------------------------------------------------
// The stage
// ---------------------------------------------------------------------------------------------

function stage(c: Ctx, mood: A.StageMood): void {
  const { b } = c;
  const add = (n: NodeIn): void => {
    b.add(n);
    c.backdrop.add(n.id);
  };
  add({ id: 'cam', x: 0, y: 0, w: STAGE_W, h: STAGE_H, ox: STAGE_W / 2, oy: STAGE_H });
  if (mood !== 'loss') add({ id: 'sun', parent: 'cam', art: art(A.sun(mood)), x: 244, y: -8, w: 70, h: 70, z: 1, cls: 'vm-turn' });
  else add({ id: 'moon', parent: 'cam', art: art(A.sun('loss')), x: 256, y: 4, w: 44, h: 44, z: 1 });
  const cl = A.cloud();
  const clouds: [number, number, number][] = mood === 'loss' ? [[22, 12, 74], [184, 26, 62], [110, -46, 70]] : [[20, 14, 66], [176, 34, 52], [92, -56, 64], [286, -98, 58]];
  clouds.forEach(([x, y, w], i) => add({ id: `cloud${i}`, parent: 'cam', art: art(cl), x, y, w, h: (w * cl.h) / cl.w, z: 2 }));
  const h = A.hills(mood);
  add({ id: 'hillFar', parent: 'cam', art: art(h.far), x: A.STRIP_X, y: 66, w: A.STRIP_W, h: 70, z: 3 });
  add({ id: 'hillNear', parent: 'cam', art: art(h.near), x: A.STRIP_X, y: 84, w: A.STRIP_W, h: 60, z: 4 });
  add({ id: 'ground', parent: 'cam', art: art(A.ground(mood)), x: A.STRIP_X, y: 122, w: A.STRIP_W, h: 30, z: 5 });
  add({ id: 'wall', parent: 'cam', art: art(A.WALL), x: A.STRIP_X, y: WALL_Y - 2, w: A.STRIP_W, h: 60, z: 20 });
  add({ id: 'penMe', parent: 'cam', art: art(A.pennant(c.m.team.me, true)), x: ME_X - 12, y: WALL_Y + 7, w: 24, h: 34, z: 21 });
  add({ id: 'penFoe', parent: 'cam', art: art(A.pennant(c.m.team.foe, false)), x: FOE_X - 12, y: WALL_Y + 7, w: 24, h: 34, z: 21 });
}

/** The clouds drift a little for the whole moment (life, ui-plan 5.1). */
function drift(c: Ctx, end: number): void {
  for (let i = 0; c.b.has(`cloud${i}`); i++) c.b.to(`cloud${i}`, end, { x: ((i % 2 ? -10 : 12) * end) / 3000 }, 'linear', 0);
}

// ---------------------------------------------------------------------------------------------
// The Generals: bust, legs, expressions and two floating hands
// ---------------------------------------------------------------------------------------------

/** Hand rest: gripping the wall's rail (avatar units). */
const REST: Record<Side, { x: number; y: number }> = { R: { x: 100, y: 110 }, L: { x: 20, y: 110 } };
const HAND = 32;

function rig(c: Ctx, who: Who, exprs: readonly A.ExpressionId[], o: { z: number; back?: Side[] }): void {
  const { b } = c;
  const look = lookOf(c, who);
  c.exprs[who] = exprs;
  b.add({ id: who, parent: 'cam', x: cxOf(who) - 60, y: TOP_Y, w: 120, h: 160, ox: 60, oy: 120, z: o.z, base: { y: 100 } });
  b.add({ id: `${who}.legs`, parent: who, art: art(A.LOWER_BODY, look), x: 0, y: 0, w: 120, h: 160, z: 0 });
  b.add({ id: `${who}.body`, parent: who, x: 0, y: 0, w: 120, h: 120, ox: 60, oy: 118, z: 1 });
  const delay = who === 'me' ? '-1.1s' : '-3.4s';
  exprs.forEach((x, i) => b.add({ id: `${who}.f.${x}`, parent: `${who}.body`, art: portrait(c, who, x), x: 0, y: 0, w: 120, h: 120, z: i, base: { o: i === 0 ? 1 : 0 }, css: `--av-delay:${delay}` }));
  for (const side of ['R', 'L'] as const) {
    const id = `${who}.h${side}`;
    const p = REST[side];
    b.add({ id, parent: who, x: p.x - HAND / 2, y: p.y - HAND / 2, w: HAND, h: HAND, z: o.back?.includes(side) ? 0.5 : 8 });
    const flip = side === 'L' ? { sx: -1 } : {};
    b.add({ id: `${id}.fist`, parent: id, art: art(A.HAND_FIST, look), x: 0, y: 0, w: HAND, h: HAND, z: 2, base: flip });
    b.add({ id: `${id}.open`, parent: id, art: art(A.HAND_OPEN, look), x: 0, y: 0, w: HAND, h: HAND, z: 2, base: { ...flip, o: 0 } });
  }
}

/** Swaps a General's face at `t` (a cut, like a cartoon's drawn expressions). */
function face(c: Ctx, who: Who, t: number, x: A.ExpressionId): void {
  for (const e of c.exprs[who]) c.b.set(`${who}.f.${e}`, t, { o: e === x ? 1 : 0 });
}

/** Opens or closes a hand at `t`. */
function hand(c: Ctx, who: Who, side: Side, t: number, open: boolean): void {
  const id = `${who}.h${side}`;
  c.b.set(`${id}.fist`, t, { o: open ? 0 : 1 }).set(`${id}.open`, t, { o: open ? 1 : 0 });
}

/**
 * Moves a hand so its centre is at stage (x, y) at `t`, with the General's root moved `dx` sideways at
 * that time (the hand is the root's child).
 */
function handTo(c: Ctx, who: Who, side: Side, t: number, x: number, y: number, dx: number, e: Ease = 'standard', from?: number): void {
  const p = REST[side];
  c.b.to(`${who}.h${side}`, t, { x: x - (cxOf(who) - 60 + p.x + dx), y: y - (TOP_Y + p.y) }, e, from);
}

/** Springs up from behind the wall: stretch on the way up, squash on landing, settle. */
function popUp(c: Ctx, who: Who, t0: number): void {
  const { b } = c;
  b.to(who, t0 + 190, { y: -9, sx: 0.93, sy: 1.1 }, 'out', t0);
  b.to(who, t0 + 320, { y: 0, sx: 1.07, sy: 0.92 }, 'exit');
  b.to(who, t0 + 470, { sx: 1, sy: 1 }, 'back');
}

/** A slow breath on the body (life between beats). */
function breathe(c: Ctx, who: Who, t0: number, t1: number): void {
  if (t1 - t0 > 500) c.b.wave(`${who}.body`, 'sy', t0, t1, 0.014, 1300, { phase: who === 'me' ? 0 : 1.7 });
}

/** A hop on the spot (or toward `dx`): up, down, a squash on landing. */
function hop(c: Ctx, who: Who, t0: number, height: number, dur = 240): void {
  const { b } = c;
  b.to(who, t0 + dur / 2, { y: -height }, 'out', t0).to(who, t0 + dur, { y: 0 }, 'exit');
  b.to(who, t0 + dur + 70, { sx: 1.05, sy: 0.94 }, 'standard', t0 + dur).to(who, t0 + dur + 200, { sx: 1, sy: 1 }, 'back');
}

// ---------------------------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------------------------

/** A hit-stop, a camera kick and a flash at an impact (A12); none of it under reduce motion. */
function impact(c: Ctx, t: number, o: { stop: number; trauma: number; flash: number; dir?: number }): void {
  const { b, m } = c;
  if (m.hitstop) b.hitstop(t, o.stop);
  const amp = o.trauma * Math.max(0, Math.min(1, m.shake));
  if (amp > 0.15) {
    const d = o.dir ?? 1;
    const seq: [number, number, number][] = [
      [5 * d, -3, 0.45 * d],
      [-4 * d, 2.4, -0.35 * d],
      [3 * d, -1.6, 0.25 * d],
      [-2 * d, 1, -0.15 * d],
      [1 * d, -0.5, 0.08 * d],
    ];
    b.set('cam', t, { x: seq[0]![0] * amp, y: seq[0]![1] * amp, r: seq[0]![2] * amp });
    seq.slice(1).forEach(([x, y, r], i) => b.to('cam', t + 45 * (i + 1), { x: x * amp, y: y * amp, r: r * amp }, 'linear'));
    b.to('cam', t + 45 * (seq.length + 1), { x: 0, y: 0, r: 0 }, 'out');
  }
  if (o.flash > 0 && !m.reduce) {
    const id = `flash${t}`;
    b.add({ id, art: '<svg viewBox="0 0 10 10" preserveAspectRatio="none" width="100%" height="100%"><rect width="10" height="10" fill="#fff6dc"/></svg>', x: -60, y: -120, w: STAGE_W + 120, h: STAGE_H + 180, z: 90, base: { o: 0 } });
    b.set(id, t, { o: o.flash }).to(id, t + 100, { o: 0 }, 'out');
  }
}

/** The comic word burst ("BONK!") popping at an impact, then fading. */
function word(c: Ctx, id: string, key: string, t: number, x: number, y: number, r = -8, size = 1): void {
  const { b, m } = c;
  const w = 88 * size;
  const h = 51.2 * size;
  b.add({ id, parent: 'cam', art: uniq(A.burstSvg(m.t(key))), x: x - w / 2, y: y - h / 2, w, h, z: 60, base: { o: 0, s: 0.85, r } });
  b.set(id, t, { o: 1 }).to(id, t + 140, { s: 1.16 }, 'back', t).to(id, t + 260, { s: 1 }, 'standard');
  b.to(id, t + 640, { s: 1.06, r: r + 3 }, 'linear', t + 260).to(id, t + 800, { o: 0, s: 1.25 }, 'exit', t + 640);
}

/** Stars or blobs flying out of an impact point. */
function sparks(c: Ctx, prefix: string, t: number, x: number, y: number, n: number, o: { spread?: [number, number]; dist?: number; artFn?: (i: number) => A.Art; size?: number; fall?: number; z?: number } = {}): void {
  const { b, rng } = c;
  const [a0, a1] = o.spread ?? [200, 340];
  const size = o.size ?? 10;
  for (let i = 0; i < n; i++) {
    const id = `${prefix}${i}`;
    const ang = ((a0 + ((a1 - a0) * (i + 0.5)) / n + (rng.next() - 0.5) * 18) * Math.PI) / 180;
    const d = (o.dist ?? 34) * (0.75 + rng.next() * 0.5);
    b.add({ id, parent: 'cam', art: art(o.artFn ? o.artFn(i) : A.STAR), x: x - size / 2, y: y - size / 2, w: size, h: size, z: o.z ?? 55, base: { o: 0, s: 0.4 } });
    b.set(id, t, { o: 1 });
    const ex = Math.cos(ang) * d;
    const ey = Math.sin(ang) * d;
    if (o.fall) {
      b.to(id, t + 260, { x: ex, y: ey }, 'out', t).to(id, t + 520, { x: ex * 1.2, y: ey + o.fall }, 'exit');
      b.to(id, t + 520, { r: (rng.next() - 0.5) * 200 }, 'linear', t);
    } else {
      b.to(id, t + 380, { x: ex, y: ey, r: (rng.next() - 0.5) * 300 }, 'out', t);
    }
    b.to(id, t + 140, { s: 1.1 }, 'back', t).to(id, t + 460, { s: 0.6, o: 0 }, 'exit', t + 300);
  }
}

/** Dizzy stars circling over a General's head, from `t0` to `t1`. */
function dizzyStars(c: Ctx, who: Who, t0: number, t1: number): void {
  const { b } = c;
  const period = 820;
  for (let i = 0; i < 3; i++) {
    const id = `${who}.star${i}`;
    b.add({ id, parent: `${who}.body`, art: art(A.STAR), x: 60 - 8, y: 10 - 8, w: 16, h: 16, z: 30, base: { o: 0, s: 0.2 } });
    const at = (t: number): PoseIn => {
      const ph = ((t - t0) / period) * Math.PI * 2 + (i * Math.PI * 2) / 3;
      return { x: Math.cos(ph) * 36, y: Math.sin(ph) * 8 };
    };
    b.set(id, t0, { o: 1, ...at(t0) }).to(id, t0 + 200, { s: 1 }, 'back', t0);
    for (let t = t0 + 50; t <= t1; t += 50) b.to(id, t, at(t), 'linear');
  }
}

/** Spinning spiral eyes over a dizzy face, from `t0` to `t1`. */
function spiralEyes(c: Ctx, who: Who, t0: number, t1: number): void {
  const { b } = c;
  for (const [k, x] of [['L', 48], ['R', 72]] as const) {
    const id = `${who}.sp${k}`;
    b.add({ id, parent: `${who}.body`, art: art(A.SPIRAL_EYE), x: x - 9, y: 54 - 9, w: 18, h: 18, z: 24, base: { o: 0 } });
    b.set(id, t0, { o: 1 }).to(id, t1, { r: k === 'L' ? 900 : -900 }, 'linear', t0);
  }
}

/** A sweat drop that pops at the temple and slides off. */
function sweat(c: Ctx, who: Who, t: number, id = `${who}.sweat`): void {
  const { b } = c;
  b.add({ id, parent: `${who}.body`, art: art(A.SWEAT), x: 84, y: 26, w: 12, h: 16, z: 25, base: { o: 0, s: 0.3 } });
  b.set(id, t, { o: 1 }).to(id, t + 180, { s: 1.15 }, 'back', t).to(id, t + 260, { s: 1 }, 'standard');
  b.to(id, t + 700, { y: 10 }, 'exit', t + 300).to(id, t + 760, { o: 0 }, 'exit', t + 640);
}

/** White cartoon eyes on a covered face (cream, tar) that blink at the given times. */
function peekEyes(c: Ctx, who: Who, t0: number, blinks: number[], o: { id?: string; z?: number } = {}): void {
  const { b } = c;
  const id = o.id ?? `${who}.peek`;
  b.add({ id, parent: `${who}.body`, art: art(A.PEEK_EYES), x: 0, y: 0, w: 120, h: 120, ox: 60, oy: 53, z: o.z ?? 23, base: { o: 0 } });
  b.set(id, t0, { o: 1 });
  for (const t of blinks) b.to(id, t + 60, { sy: 0.1 }, 'exit', t).to(id, t + 140, { sy: 1 }, 'out');
}

/** The id prefix of the stage's confetti pieces (the storyboard leaves them out). */
const CONFETTI = 'conf';

/** A confetti burst over the stage (the celebration beat; the Result adds its own screen confetti). */
function confettiBurst(c: Ctx, t: number, end: number): void {
  const { b, rng, m } = c;
  const n = m.lite ? 10 : 18;
  for (let i = 0; i < n; i++) {
    const id = `${CONFETTI}${i}`;
    const x = 16 + ((i * 331) % 300) + (rng.next() - 0.5) * 20;
    const t0 = t + rng.next() * 260;
    const fall = Math.min(1100 + rng.next() * 700, end - t0);
    if (fall < 300) continue;
    b.add({ id, parent: 'cam', art: art(A.confetti(i)), x, y: -16, w: 6, h: 9, z: 70, base: { o: 0 } });
    b.set(id, t0, { o: 1 });
    b.to(id, t0 + fall, { y: STAGE_H + 30, x: (rng.next() - 0.5) * 60, r: (rng.next() > 0.5 ? 1 : -1) * (360 + rng.next() * 360) }, 'linear', t0);
  }
}

/** The celebration: confetti in the stage and on the screen, and the ta-da. */
function celebrate(c: Ctx, t: number, end: number, confetti = true): void {
  c.b.cue(t, { sound: 'moment_tada', celebrate: true });
  if (confetti) confettiBurst(c, t, end);
}

/** A cheer: the free hand pumps up open and waves. */
function cheerWave(c: Ctx, who: Who, side: Side, t: number, end: number, x: number, y: number, dx: number): void {
  hand(c, who, side, t, true);
  handTo(c, who, side, t + 220, x, y, dx, 'back', t);
  c.b.wave(`${who}.h${side}`, 'r', t + 220, end, 14, 420);
}

// ---------------------------------------------------------------------------------------------
// The moves
// ---------------------------------------------------------------------------------------------

interface MoveScript {
  /** Writes the scene. */
  write(c: Ctx): void;
  /** The storyboard frames for reduce motion (action times): the set-up and the outcome. */
  frames: [number, number];
  /** The sounds of the storyboard's two frames. */
  storySounds: [string, string];
  mood: A.StageMood;
}

/** Giant mallet: a hop, a wind-up behind the head, BONK, squash, spring back, dizzy stars. */
const MALLET: MoveScript = {
  mood: 'win',
  frames: [780, 2350],
  storySounds: ['ui_pop', 'moment_bonk'],
  write(c) {
    const { b } = c;
    const END = 2780;
    rig(c, 'me', ['base', 'smug', 'effort', 'cheer'], { z: 10, back: ['R'] });
    rig(c, 'foe', ['base', 'nervous', 'shock', 'ouch', 'dizzy'], { z: 11 });
    // The mallet in my right hand: its grip (50, 128 of 100 x 150) on the hand's centre.
    const sc = 0.86;
    b.add({ id: 'mallet', parent: 'me.hR', art: art(A.MALLET), x: HAND / 2 - 50 * sc, y: HAND / 2 - 128 * sc, w: 100 * sc, h: 150 * sc, ox: 50 * sc, oy: 128 * sc, z: 1, base: { r: -10 } });
    // The swing's smear: a pale arc where the mallet's head passes (around the grip at impact).
    const grip = { x: 182, y: 86 };
    b.add({ id: 'smear', parent: 'cam', art: uniq(smearArc(grip.x, grip.y, 60, 98, -26, 64)), x: 0, y: 0, w: STAGE_W, h: STAGE_H, z: 40, base: { o: 0 } });

    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });

    // The reveal: the mallet comes up from behind the wall.
    b.set('me.hR', 0, { y: 110 });
    face(c, 'me', 560, 'smug');
    handTo(c, 'me', 'R', 790, 152, 102, 0, 'back', 560);
    b.to('mallet', 790, { r: -2 }, 'back', 560);
    b.cue(600, { sound: 'moment_swish', pitchBp: 7000 });
    face(c, 'foe', 700, 'nervous');
    sweat(c, 'foe', 720);

    // Anticipation: hop closer, wind the mallet back over the head, lean back.
    b.to('me', 1040, { x: 34 }, 'standard', 860);
    b.to('me', 950, { y: -12 }, 'out', 860).to('me', 1040, { y: 0 }, 'exit');
    face(c, 'me', 900, 'effort');
    handTo(c, 'me', 'R', 1130, 118, 70, 34, 'anticipate', 900);
    b.to('mallet', 1130, { r: -84 }, 'anticipate', 900);
    b.to('me', 1130, { r: -7, sy: 1.05, sx: 0.97 }, 'standard', 1040);
    face(c, 'foe', 980, 'shock');
    b.to('foe.body', 1130, { sy: 0.94, r: 3 }, 'standard', 980);

    // The swing.
    b.cue(1130, { sound: 'moment_swish' });
    handTo(c, 'me', 'R', 1235, grip.x, grip.y, 34, 'exit');
    b.to('mallet', 1235, { r: 66 }, 'exit');
    b.to('me', 1235, { r: 9, sy: 0.95, sx: 1.04 }, 'exit');
    b.set('smear', 1160, { o: 0.9 }).to('smear', 1300, { o: 0 }, 'out');

    // BONK.
    const hit = 1235;
    b.cue(hit, { sound: 'moment_bonk', haptic: 'heavy' });
    impact(c, hit, { stop: 110, trauma: 1, flash: 0.16 });
    face(c, 'foe', hit, 'ouch');
    b.set('foe', hit, { sy: 0.7, sx: 1.26, y: 2 });
    b.set('foe.body', hit, { sy: 1, r: 0 });
    word(c, 'wBonk', 'moment.word.bonk', hit, 296, 34, 10);
    sparks(c, 'spk', hit, FOE_X, 50, c.m.lite ? 4 : 7);

    // Follow-through: the mallet bounces off, the opponent springs back up wobbling.
    b.to('mallet', 1340, { r: 30 }, 'out');
    handTo(c, 'me', 'R', 1340, grip.x - 4, grip.y - 12, 34, 'out');
    b.to('foe', 1390, { sy: 1.16, sx: 0.89, y: -7 }, 'out');
    b.to('foe', 1490, { sy: 0.92, sx: 1.06, y: 2 }, 'standard');
    b.to('foe', 1590, { sy: 1.04, sx: 0.98, y: 0 }, 'standard');
    b.to('foe', 1700, { sy: 1, sx: 1 }, 'standard');
    face(c, 'foe', 1340, 'dizzy');
    b.cue(1340, { sound: 'moment_dizzy' });
    spiralEyes(c, 'foe', 1340, END);
    dizzyStars(c, 'foe', 1340, END);
    b.wave('foe.body', 'r', 1480, END, 7, 980);

    // Residue: back home, the mallet held high like a trophy, a hop of joy and a wave.
    b.to('me', 1580, { x: 0, r: 0, sy: 1, sx: 1 }, 'standard', 1300);
    handTo(c, 'me', 'R', 1720, 150, 100, 0, 'back', 1380);
    b.to('mallet', 1720, { r: 12 }, 'back', 1380);
    face(c, 'me', 1520, 'cheer');
    cheerWave(c, 'me', 'L', 1600, END, 44, 86, 0);
    hop(c, 'me', 1760, 14);
    celebrate(c, 1760, END);
    breathe(c, 'me', 2240, END);
    b.until(END);
  },
};

/** A pale crescent along an arc around (cx, cy): from angle a0 to a1 (0 = up, clockwise), inner r0, outer r1. */
function smearArc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const pts: string[] = [];
  const n = 18;
  const P = (deg: number, r: number): string => {
    const a = (deg * Math.PI) / 180;
    return `${Math.round((cx + Math.sin(a) * r) * 10) / 10} ${Math.round((cy - Math.cos(a) * r) * 10) / 10}`;
  };
  for (let i = 0; i <= n; i++) pts.push(P(a0 + ((a1 - a0) * i) / n, r1));
  // The inner edge: thin at the start, full at the end.
  for (let i = n; i >= 0; i--) pts.push(P(a0 + ((a1 - a0) * i) / n, r1 - (r1 - r0) * (i / n) ** 0.7));
  const d = `M${pts.join('L')}Z`;
  return A.svgOf({ w: STAGE_W, h: STAGE_H, shapes: [{ d, c: '#fff8de', ln: 0, op: 0.92 }, { d, c: '#e2913c', st: true, ln: 2, op: 0.85 }] });
}

/** A cream pie: shown off on a fingertip, wound up, thrown with a spin, SPLAT, the tin slides off. */
const PIE: MoveScript = {
  mood: 'win',
  frames: [780, 2300],
  storySounds: ['ui_pop', 'moment_splat'],
  write(c) {
    const { b } = c;
    const END = 2700;
    rig(c, 'me', ['base', 'smug', 'effort', 'cheer'], { z: 10 });
    rig(c, 'foe', ['base', 'nervous', 'shock', 'blank'], { z: 11 });
    // The pie balanced on my open hand.
    const ps = 0.9;
    b.add({ id: 'pieHeld', parent: 'me.hR', art: art(A.PIE), x: HAND / 2 - 32 * ps, y: 3 - 39 * ps, w: 64 * ps, h: 40 * ps, ox: 32 * ps, oy: 39 * ps, z: 3 });
    b.add({ id: 'pieFly', parent: 'cam', art: art(A.PIE), x: -32 * ps, y: -20 * ps, w: 64 * ps, h: 40 * ps, z: 45, base: { o: 0 } });
    b.add({ id: 'pieStuck', parent: 'foe.body', art: art(A.PIE_STUCK), x: 60 - 35, y: 56 - 33, w: 70, h: 66, z: 26, base: { o: 0 } });
    b.add({ id: 'cream', parent: 'foe.body', art: art(A.CREAM_FACE), x: 0, y: 0, w: 120, h: 120, z: 21, base: { o: 0 } });
    const drips: [number, number, number][] = [[44, 80, 1], [70, 83, 0.8], [57, 86, 1.15]];
    drips.forEach(([x, y, s], i) => b.add({ id: `drip${i}`, parent: 'foe.body', art: art(A.CREAM_DRIP), x: x - 4 * s, y, w: 8 * s, h: 24 * s, ox: 4 * s, oy: 0, z: 20, base: { o: 0, sy: 0.1 } }));
    b.add({ id: 'cherry', parent: 'foe.body', art: art(A.CHERRY), x: 54, y: 2, w: 12, h: 16, ox: 6, oy: 16, z: 27, base: { o: 0, y: -70 } });

    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });

    // The reveal: the pie rises on my fingertips.
    hand(c, 'me', 'R', 0, true);
    b.set('me.hR', 0, { y: 110 });
    face(c, 'me', 560, 'smug');
    handTo(c, 'me', 'R', 800, 150, 104, 0, 'back', 560);
    b.cue(620, { sound: 'ui_pop', pitchBp: 12600 });
    b.wave('pieHeld', 'r', 800, 1000, 5, 200);
    face(c, 'foe', 700, 'nervous');
    sweat(c, 'foe', 740);

    // Wind-up: lean back, the pie pulled back and up.
    face(c, 'me', 960, 'effort');
    handTo(c, 'me', 'R', 1130, 124, 82, 0, 'anticipate', 1000);
    b.to('me', 1130, { r: -8, sx: 0.97, sy: 1.04 }, 'standard', 1000);
    face(c, 'foe', 1040, 'shock');
    b.to('foe.body', 1150, { sy: 0.95, r: 4 }, 'standard', 1040);

    // The throw: the pie leaves the hand and spins across on an arc.
    const rel = 1150;
    const hitT = 1310;
    b.cue(rel, { sound: 'moment_swish', pitchBp: 9000 });
    b.set('pieHeld', rel, { o: 0 });
    handTo(c, 'me', 'R', 1230, 170, 96, 0, 'exit', rel);
    b.to('me', 1230, { r: 8, sx: 1.04, sy: 0.96 }, 'exit', rel);
    b.set('pieFly', rel, { o: 1, x: 126, y: 50 });
    b.to('pieFly', hitT, { x: FOE_X }, 'linear', rel);
    b.to('pieFly', rel + 70, { y: 40 }, 'out', rel).to('pieFly', hitT, { y: 92 }, 'exit');
    b.to('pieFly', hitT, { r: 300 }, 'linear', rel);
    b.set('pieFly', hitT, { o: 0 });

    // SPLAT.
    b.cue(hitT, { sound: 'moment_splat', haptic: 'thump' });
    impact(c, hitT, { stop: 100, trauma: 0.7, flash: 0.1 });
    face(c, 'foe', hitT, 'blank');
    b.set('pieStuck', hitT, { o: 1, sx: 1.3, sy: 0.75 }).to('pieStuck', hitT + 180, { sx: 1, sy: 1 }, 'back');
    b.set('foe', hitT, { x: 6, sy: 0.9, sx: 1.08 }).to('foe', hitT + 260, { x: 0, sy: 1, sx: 1 }, 'back');
    b.set('foe.body', hitT, { r: 9, sy: 1 }).to('foe.body', hitT + 400, { r: 0 }, 'back');
    word(c, 'wSplat', 'moment.word.splat', hitT, 292, 34, 9);
    sparks(c, 'blob', hitT, FOE_X, 88, c.m.lite ? 5 : 9, { spread: [150, 390], dist: 42, artFn: () => A.BLOB, size: 9, fall: 50 });

    // The tin hangs on, then slides down and drops behind the wall: cream, blinking eyes, drips.
    const slide = 1760;
    b.wave('pieStuck', 'r', hitT + 200, slide, 3, 300);
    b.set('cream', slide, { o: 1 });
    b.to('pieStuck', slide + 260, { y: 70, r: 28 }, 'exit', slide).set('pieStuck', slide + 270, { o: 0 });
    peekEyes(c, 'foe', slide, [2050, 2420]);
    drips.forEach((_, i) => b.set(`drip${i}`, slide, { o: 1 }).to(`drip${i}`, slide + 520 + i * 120, { sy: 1 }, 'out', slide + 40 * i));
    b.set('cherry', 1880, { o: 1 }).to('cherry', 2040, { y: 0 }, 'exit', 1880).to('cherry', 2100, { sy: 0.7, sx: 1.25 }, 'standard', 2040).to('cherry', 2240, { sy: 1, sx: 1 }, 'back');
    b.cue(2040, { sound: 'ui_pop', pitchBp: 15000 });

    // I laugh, hands on my belly, bouncing.
    face(c, 'me', 1400, 'cheer');
    b.to('me', 1560, { r: 0, sx: 1, sy: 1 }, 'standard', 1360);
    hand(c, 'me', 'L', 1400, true);
    handTo(c, 'me', 'R', 1600, 120, 124, 0, 'standard', 1400);
    handTo(c, 'me', 'L', 1600, 76, 124, 0, 'standard', 1400);
    b.wave('me', 'y', 1600, 2400, -4, 240);
    celebrate(c, 1820, END);
    breathe(c, 'foe', 2300, END);
    b.until(END);
  },
};

/** Tar and feathers: a bucket of tar sloshed over the head, a pillow burst, feathers stick, BAWK! */
const TAR_FEATHERS: MoveScript = {
  mood: 'win',
  frames: [820, 3000],
  storySounds: ['ui_pop', 'moment_poof'],
  write(c) {
    const { b, rng, m } = c;
    const END = 3150;
    rig(c, 'me', ['base', 'smug', 'effort', 'cheer'], { z: 10 });
    rig(c, 'foe', ['base', 'nervous', 'shock', 'blank'], { z: 11 });
    // The bucket of tar in both hands (a stage prop; the hands follow its sides as it turns).
    const BW = 54;
    const BH = 57.6;
    const home = { x: 150, y: 104 };
    b.add({ id: 'bucket', parent: 'cam', art: art(A.TAR_BUCKET), x: home.x - BW / 2, y: home.y - BH / 2, w: BW, h: BH, z: 13, base: { o: 0, y: 90 } });
    const holdAt = (t: number, cx: number, cy: number, r: number, dx: number, e: Ease, from?: number): void => {
      const [lx, ly] = rot(cx - 25, cy + 8, cx, cy, r);
      const [rx, ry] = rot(cx + 25, cy + 8, cx, cy, r);
      handTo(c, 'me', 'L', t, lx, ly, dx, e, from);
      handTo(c, 'me', 'R', t, rx, ry, dx, e, from);
    };
    const bucketTo = (t: number, cx: number, cy: number, r: number, dx: number, e: Ease, from?: number): void => {
      b.to('bucket', t, { x: cx - home.x, y: cy - home.y, r }, e, from);
      holdAt(t, cx, cy, r, dx, e, from);
    };
    b.add({ id: 'tarBlob', parent: 'cam', art: art(A.TAR_BLOB), x: -20, y: -17, w: 40, h: 34, z: 44, base: { o: 0 } });
    b.add({ id: 'tar', parent: 'foe.body', art: art(A.TAR_COAT), x: 0, y: 0, w: 120, h: 120, ox: 60, oy: 0, z: 21, base: { o: 0 } });
    const drips: [number, number][] = [[48, 60], [78, 62]];
    drips.forEach(([x, y], i) => b.add({ id: `tdrip${i}`, parent: 'foe.body', art: art(A.TAR_DRIP), x: x - 4, y, w: 8, h: 26, ox: 4, oy: 0, z: 20, base: { o: 0, sy: 0.1 } }));
    b.add({ id: 'pillow', parent: 'me', art: art(A.PILLOW), x: 60 - 34, y: 30 - 24, w: 68, h: 47.6, z: 9, base: { o: 0, y: 110 } });

    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });

    // The bucket comes up from behind the wall in both hands, sloshing.
    face(c, 'me', 560, 'smug');
    b.set('bucket', 560, { o: 1 }).to('bucket', 800, { y: 0 }, 'back', 560);
    holdAt(800, home.x, home.y, 0, 0, 'back', 560);
    b.wave('bucket', 'r', 800, 1000, 5, 220);
    face(c, 'foe', 700, 'nervous');
    sweat(c, 'foe', 740);

    // Hop closer, swing it back (anticipation), then slosh it forward.
    b.to('me', 1060, { x: 20 }, 'standard', 880);
    b.to('me', 970, { y: -10 }, 'out', 880).to('me', 1060, { y: 0 }, 'exit');
    b.to('bucket', 1060, { x: 20 }, 'standard', 1000);
    holdAt(1060, home.x + 20, home.y, 0, 20, 'standard', 880);
    face(c, 'me', 1000, 'effort');
    bucketTo(1180, 162, 110, -30, 20, 'anticipate', 1060);
    face(c, 'foe', 1080, 'shock');
    b.to('foe.body', 1200, { sy: 0.95, r: 3 }, 'standard', 1080);
    const toss = 1280;
    bucketTo(toss, 190, 90, 104, 20, 'exit');
    b.cue(1180, { sound: 'moment_swish', pitchBp: 8000 });

    // The tar leaves the bucket in one gloopy blob and lands over the head: GLOOP.
    const splat = 1400;
    const [mx, my] = rot(190, 90 - 24, 190, 90, 104);
    b.set('tarBlob', toss, { o: 1, x: mx, y: my, s: 0.6, r: 40 });
    b.to('tarBlob', splat, { x: FOE_X }, 'linear', toss);
    b.to('tarBlob', toss + 70, { y: 44 }, 'out', toss).to('tarBlob', splat, { y: 58 }, 'exit');
    b.to('tarBlob', splat, { s: 1.15, r: -12 }, 'standard', toss);
    b.set('tarBlob', splat, { o: 0 });
    b.cue(splat, { sound: 'moment_tar', haptic: 'thump' });
    impact(c, splat, { stop: 90, trauma: 0.55, flash: 0 });
    face(c, 'foe', splat, 'blank');
    b.set('foe.body', splat, { sy: 1, r: 0 });
    b.set('tar', splat, { o: 1, sx: 1.18, sy: 0.82 }).to('tar', splat + 220, { sx: 0.97, sy: 1.04 }, 'out').to('tar', splat + 420, { sx: 1, sy: 1 }, 'standard');
    b.set('foe', splat, { sy: 0.86, sx: 1.1 }).to('foe', splat + 320, { sy: 1, sx: 1 }, 'back');
    drips.forEach((_, i) => b.set(`tdrip${i}`, splat + 120, { o: 1 }).to(`tdrip${i}`, splat + 760 + i * 160, { sy: 1 }, 'out', splat + 120 + i * 80));
    peekEyes(c, 'foe', splat + 60, [1920, 2600]);
    const goo = (): A.Art => ({ ...A.BLOB, shapes: A.BLOB.shapes.map((x) => ({ ...x, c: '#26222c' as const, m: 'gloss' as const })) });
    sparks(c, 'goo', splat, FOE_X, 56, m.lite ? 3 : 6, { spread: [180, 360], dist: 46, artFn: goo, size: 11, fall: 110 });
    // The empty bucket is tossed away over my shoulder; my hands come back.
    b.to('bucket', 1700, { x: -170, y: -150, r: -520 }, 'out', 1420).set('bucket', 1700, { o: 0 });
    b.to('me', 1560, { x: 30 }, 'standard', 1420);
    handTo(c, 'me', 'L', 1560, 58 + 30, 146, 30, 'standard', 1440);
    handTo(c, 'me', 'R', 1560, 138 + 30, 146, 30, 'standard', 1440);

    // The pillow: up from behind the wall, raised high over my head, then WHUMP on theirs.
    b.set('pillow', 1500, { o: 1 }).to('pillow', 1700, { y: 0 }, 'back', 1500);
    hand(c, 'me', 'R', 1500, true);
    hand(c, 'me', 'L', 1500, true);
    const ends = (px: number, py: number, r: number, dx: number): { l: [number, number]; r: [number, number] } => {
      const cx2 = ME_X + dx + px;
      const cy2 = TOP_Y + 30 + py;
      return { l: rot(cx2 - 34, cy2, cx2, cy2, r), r: rot(cx2 + 34, cy2, cx2, cy2, r) };
    };
    const e1 = ends(0, 0, 0, 30);
    handTo(c, 'me', 'L', 1700, e1.l[0], e1.l[1], 30, 'back', 1580);
    handTo(c, 'me', 'R', 1700, e1.r[0], e1.r[1], 30, 'back', 1580);
    const smack = 1980;
    b.to('pillow', 1860, { y: -48, r: -18, x: 6 }, 'anticipate', 1720);
    const e2 = ends(6, -48, -18, 30);
    handTo(c, 'me', 'L', 1860, e2.l[0], e2.l[1], 30, 'anticipate', 1720);
    handTo(c, 'me', 'R', 1860, e2.r[0], e2.r[1], 30, 'anticipate', 1720);
    face(c, 'me', 1720, 'effort');
    b.to('pillow', smack, { x: 108, y: 2, r: 26 }, 'exit');
    const e3 = ends(108, 2, 26, 30);
    handTo(c, 'me', 'L', smack, e3.l[0], e3.l[1], 30, 'exit');
    handTo(c, 'me', 'R', smack, e3.r[0], e3.r[1], 30, 'exit');
    b.cue(1860, { sound: 'moment_swish' });

    // POOF: the pillow bursts into feathers that drift down and stick to the tar.
    b.cue(smack, { sound: 'moment_poof', haptic: 'heavy' });
    impact(c, smack, { stop: 80, trauma: 0.6, flash: 0.12 });
    b.set('pillow', smack, { o: 0 });
    b.add({ id: 'puff', parent: 'cam', art: art(A.PUFF), x: FOE_X - 44, y: 18, w: 88, h: 72, z: 50, base: { o: 0, s: 0.5 } });
    b.set('puff', smack, { o: 1 }).to('puff', smack + 220, { s: 1.15 }, 'out', smack).to('puff', smack + 560, { s: 1.4, o: 0 }, 'exit', smack + 220);
    word(c, 'wPoof', 'moment.word.poof', smack, 150, 26, -10);
    const n = m.lite ? 9 : 16;
    for (let i = 0; i < n; i++) {
      const id = `fth${i}`;
      const a = (i / n) * Math.PI * 2 + rng.next() * 0.4;
      const d = 30 + rng.next() * 34;
      const x0 = FOE_X + Math.cos(a) * d;
      const y0 = 50 + Math.sin(a) * d * 0.7;
      b.add({ id, parent: 'cam', art: art(A.FEATHER), x: FOE_X - 6, y: 44, w: 12, h: 29, z: 52, base: { o: 0, s: 0.4, r: rng.next() * 360 } });
      b.set(id, smack, { o: 1 });
      b.to(id, smack + 240, { x: x0 - FOE_X, y: y0 - 50, s: 1 }, 'out', smack);
      const fallEnd = END - rng.next() * 200;
      const sway = 10 + rng.next() * 10;
      for (let t = smack + 240 + 180, k = 0; t < fallEnd; t += 180, k++) {
        b.to(id, t, { x: x0 - FOE_X + (k % 2 ? sway : -sway), y: y0 - 50 + ((t - smack - 240) / 1000) * 70, r: (k % 2 ? 25 : -25) + 180 }, 'standard');
      }
      b.to(id, fallEnd, { o: 0 }, 'linear', fallEnd - 200);
    }
    // Feathers that land on the tar and stay (a little pop as each one sticks).
    const stuck: [number, number, number][] = [[38, 26, -40], [82, 22, 35], [60, 8, 5], [24, 52, -70], [96, 50, 70], [50, 40, -15], [72, 38, 20]];
    stuck.forEach(([x, y, r], i) => {
      const id = `stk${i}`;
      const t = smack + 300 + i * 110;
      b.add({ id, parent: 'foe.body', art: art(A.FEATHER), x: x - 6, y: y - 14, w: 12, h: 28, ox: 6, oy: 26, z: 24, base: { o: 0, r, s: 0.3 } });
      b.set(id, t, { o: 1 }).to(id, t + 160, { s: 1.1 }, 'back', t).to(id, t + 260, { s: 1 }, 'standard');
    });

    // BAWK: the feathered opponent clucks and bobs like a chicken; I cheer.
    face(c, 'me', 2100, 'cheer');
    b.to('me', 2300, { x: 0 }, 'standard', 2100);
    handTo(c, 'me', 'R', 2300, 138, 146, 0, 'standard', 2100);
    handTo(c, 'me', 'L', 2300, 58, 146, 0, 'standard', 2100);
    hand(c, 'me', 'R', 2300, false);
    hand(c, 'me', 'L', 2100, false);
    cheerWave(c, 'me', 'L', 2350, END, 44, 86, 0);
    const bawk = 2650;
    b.cue(bawk, { sound: 'moment_cluck' });
    b.add({ id: 'wBawk', parent: 'cam', art: uniq(A.burstSvg(m.t('moment.word.bawk'))), x: 268, y: 6, w: 72, h: 42, z: 60, base: { o: 0, s: 0.85, r: 8 } });
    b.set('wBawk', bawk, { o: 1 }).to('wBawk', bawk + 140, { s: 1.12 }, 'back', bawk).to('wBawk', bawk + 260, { s: 1 }, 'standard');
    b.to('foe.body', bawk + 90, { y: -6, r: -6 }, 'out', bawk).to('foe.body', bawk + 180, { y: 0, r: 5 }, 'exit').to('foe.body', bawk + 270, { y: -5, r: -4 }, 'out').to('foe.body', bawk + 360, { y: 0, r: 0 }, 'exit');
    celebrate(c, 2240, END);
    b.until(END);
  },
};

/** The cannon: it drops on the opponent, I light the fuse, KA-BOOM, they sail over the horizon, twinkle. */
const LAUNCH: MoveScript = {
  mood: 'win',
  frames: [1300, 2600],
  storySounds: ['moment_clank', 'moment_twinkle'],
  write(c) {
    const { b, m } = c;
    const END = 3150;
    rig(c, 'me', ['base', 'smug', 'effort', 'squint', 'cheer'], { z: 10 });
    rig(c, 'foe', ['base', 'nervous', 'shock'], { z: 11 });
    // The cannon stands on the wall in the opponent's place; the barrel aims at the horizon.
    const car = { x: FOE_X - 62, y: WALL_Y - 64 };
    const BS = 0.92;
    const pivotLocal = { x: 54, y: 24 };
    const pivotArt = { x: 34 * BS, y: 26 * BS };
    const aim = -32;
    b.add({ id: 'cannon', parent: 'cam', art: art(A.CANNON), x: car.x, y: car.y, w: 130, h: 66, ox: 65, oy: 64, z: 12, base: { o: 0, y: -170 } });
    b.add({ id: 'barrel', parent: 'cannon', art: art(A.BARREL), x: pivotLocal.x - pivotArt.x, y: pivotLocal.y - pivotArt.y, w: 112 * BS, h: 44 * BS, ox: pivotArt.x, oy: pivotArt.y, z: -1, base: { r: aim } });
    // The opponent's eyes peeking out of the dark of the muzzle.
    const muzzleArt = { x: 99.5 * BS, y: 22 * BS };
    b.add({ id: 'muzzleEyes', parent: 'barrel', art: art(A.DARK_EYES), x: muzzleArt.x - 9.5, y: muzzleArt.y - 5.2, w: 19, h: 10.4, z: 3, base: { o: 0, r: -aim } });
    const world = (ax: number, ay: number): [number, number] => {
      const [x, y] = rot(ax, ay, pivotArt.x, pivotArt.y, aim);
      return [car.x + pivotLocal.x - pivotArt.x + x, car.y + pivotLocal.y - pivotArt.y + y];
    };
    const [muzzleX, muzzleY] = world(muzzleArt.x, muzzleArt.y);
    const [fuseX, fuseY] = world(24 * BS, -12 * BS);
    b.add({ id: 'fuseSpark', parent: 'cam', art: art(A.SPARK), x: fuseX - 7, y: fuseY - 7, w: 14, h: 14, z: 30, base: { o: 0 } });
    // The match in my right hand (held near its end, the head up).
    const ms = 0.9;
    b.add({ id: 'match', parent: 'me.hR', art: art(A.MATCH), x: HAND / 2 - 6 * ms, y: HAND / 2 - 48 * ms, w: 12 * ms, h: 60 * ms, ox: 6 * ms, oy: 48 * ms, z: 1, base: { r: 40 } });
    b.add({ id: 'flame', parent: 'match', art: art(A.FLAME), x: 6 * ms - 6, y: 12 * ms - 18, w: 12, h: 17, ox: 6, oy: 16, z: 2 });

    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });
    face(c, 'foe', 520, 'nervous');
    face(c, 'me', 520, 'smug');

    // The cannon falls out of the sky onto the opponent: CLANK, dust, they're inside.
    const land = 760;
    face(c, 'foe', 600, 'shock');
    b.to('foe', 750, { sy: 0.9, sx: 1.06 }, 'standard', 690);
    b.set('cannon', 560, { o: 1 }).to('cannon', land, { y: 0 }, 'exit', 560);
    b.set('foe', land, { o: 0 });
    b.to('cannon', land + 90, { sy: 0.84, sx: 1.12 }, 'out', land).to('cannon', land + 260, { sy: 1, sx: 1 }, 'back');
    b.cue(land, { sound: 'moment_clank', haptic: 'thump' });
    impact(c, land, { stop: 70, trauma: 0.6, flash: 0 });
    for (const [k, dx] of [[0, -58], [1, 52]] as const) {
      const id = `dust${k}`;
      b.add({ id, parent: 'cam', art: art(A.SMOKE), x: FOE_X + dx - 22, y: WALL_Y - 26, w: 44, h: 36, z: 22, base: { o: 0, s: 0.3 } });
      b.set(id, land, { o: 0.95 }).to(id, land + 340, { s: 1.1, x: dx * 0.4, y: -6 }, 'out', land).to(id, land + 460, { o: 0 }, 'exit', land + 220);
    }
    b.set('muzzleEyes', 900, { o: 1 });
    b.wave('muzzleEyes', 'x', 1000, 1500, 2.4, 300);

    // I take out a long match, hop to the breech and light the fuse.
    b.set('me.hR', 0, { y: 110 });
    handTo(c, 'me', 'R', 1060, 150, 100, 0, 'back', 860);
    b.wave('flame', 'sy', 860, 1500, 0.18, 120);
    b.to('me', 1200, { x: 44 }, 'standard', 1040);
    b.to('me', 1120, { y: -10 }, 'out', 1040).to('me', 1200, { y: 0 }, 'exit');
    face(c, 'me', 1060, 'effort');
    const tip = { dx: 32.4 * ms * Math.sin((40 * Math.PI) / 180), dy: -32.4 * ms * Math.cos((40 * Math.PI) / 180) };
    const light = 1280;
    handTo(c, 'me', 'R', light, fuseX - tip.dx, fuseY - tip.dy, 44, 'standard', 1140);
    b.cue(light, { sound: 'moment_fuse' });
    b.set('fuseSpark', light, { o: 1 });
    b.wave('fuseSpark', 'sx', light, 1720, 0.35, 90);
    b.wave('fuseSpark', 'r', light, 1720, 40, 140);
    sparks(c, 'fz', light + 120, fuseX, fuseY, m.lite ? 3 : 5, { spread: [200, 340], dist: 16, artFn: () => A.SPARK, size: 7 });
    // ...and run back to cover my ears.
    b.set('match', 1400, { o: 0 });
    b.to('me', 1520, { x: -6 }, 'out', 1360);
    face(c, 'me', 1420, 'squint');
    hand(c, 'me', 'R', 1420, true);
    hand(c, 'me', 'L', 1420, true);
    handTo(c, 'me', 'R', 1560, 128, 92, -6, 'back', 1400);
    handTo(c, 'me', 'L', 1560, 56, 92, -6, 'back', 1400);
    b.to('me.hL', 1560, { r: 20 }, 'back', 1400);
    b.to('me.hR', 1560, { r: -20 }, 'back', 1400);
    b.to('me', 1560, { sy: 0.94, sx: 1.04 }, 'standard', 1400);
    // The fuse burns down, the cannon trembles and swells, the eyes in the muzzle go wide.
    b.to('muzzleEyes', 1600, { s: 1.35 }, 'back', 1460);
    b.wave('cannon', 'r', 1460, 1720, 1.6, 90);
    b.to('cannon', 1720, { sx: 1.07, sy: 0.93 }, 'anticipate', 1500);

    // KA-BOOM: the cannon kicks back, smoke and a blast at the muzzle, the opponent flies off.
    const boom = 1720;
    b.cue(boom, { sound: 'moment_boom', haptic: 'heavy' });
    impact(c, boom, { stop: 100, trauma: 1, flash: 0.22, dir: -1 });
    b.set('fuseSpark', boom, { o: 0 });
    b.set('muzzleEyes', boom, { o: 0 });
    b.set('cannon', boom, { x: -12, sx: 1.16, sy: 0.88 }).to('cannon', boom + 260, { x: 0, sx: 1, sy: 1 }, 'back');
    b.add({ id: 'blast', parent: 'cam', art: art(A.BLAST), x: muzzleX - 28, y: muzzleY - 28, w: 56, h: 56, z: 48, base: { o: 0, s: 0.3 } });
    b.set('blast', boom, { o: 1 }).to('blast', boom + 120, { s: 1.25, r: 30 }, 'out', boom).to('blast', boom + 260, { s: 0.6, o: 0 }, 'exit');
    for (let i = 0; i < 3; i++) {
      const id = `smk${i}`;
      b.add({ id, parent: 'cam', art: art(A.SMOKE), x: muzzleX - 20 + i * 5, y: muzzleY - 18 - i * 3, w: 40, h: 32, z: 47, base: { o: 0, s: 0.4 } });
      b.set(id, boom + i * 40, { o: 0.92 }).to(id, boom + 520, { s: 1.25 + i * 0.12, x: 10 + i * 8, y: -10 - i * 7 }, 'out', boom + i * 40).to(id, boom + 600, { o: 0 }, 'exit', boom + 280);
    }
    word(c, 'wBoom', 'moment.word.boom', boom, 196, 24, -8, 1.08);
    // The flight: from the muzzle, spinning and shrinking to a point over the horizon.
    const fly0 = { x: muzzleX - FOE_X, y: muzzleY + 22 - BASE_Y };
    const far = { x: 318 - FOE_X, y: 12 - BASE_Y };
    const gone = boom + 540;
    face(c, 'foe', boom, 'shock');
    b.set('foe', boom, { o: 1, x: fly0.x, y: fly0.y, s: 0.44, r: 0 });
    b.to('foe', gone, { x: far.x }, 'out', boom);
    b.to('foe', boom + 360, { y: far.y }, 'out', boom).to('foe', gone, { y: far.y + 2 }, 'linear');
    b.to('foe', gone, { s: 0.05, r: 1080 }, 'out', boom);
    b.set('foe', gone, { o: 0 });
    b.cue(boom + 60, { sound: 'moment_whistle' });
    for (let i = 0; i < 4; i++) {
      const t = boom + 70 + i * 70;
      const id = `trail${i}`;
      const x = FOE_X + b.value('foe', 'x', t);
      const y = BASE_Y + b.value('foe', 'y', t) - 20 * b.value('foe', 'sy', t);
      b.add({ id, parent: 'cam', art: art(A.TRAIL), x: x - 7, y: y - 7, w: 14, h: 14, z: 13, base: { o: 0 } });
      b.set(id, t, { o: 0.9 }).to(id, t + 420, { s: 1.6, o: 0 }, 'out', t);
    }
    // A beat later, the twinkle where they vanished.
    const ting = gone + 160;
    b.add({ id: 'twinkle', parent: 'cam', art: art(A.TWINKLE), x: 318 - 14, y: 12 - 14, w: 28, h: 28, z: 49, base: { o: 0, s: 0.1 } });
    b.set('twinkle', ting, { o: 1 }).to('twinkle', ting + 150, { s: 1.35, r: 45 }, 'back', ting).to('twinkle', ting + 420, { s: 0.1, r: 90, o: 0 }, 'exit');
    b.cue(ting, { sound: 'moment_twinkle' });

    // I wave them bye-bye as they sail off, then cheer at the twinkle.
    face(c, 'me', boom + 200, 'smug');
    b.to('me', boom + 300, { sy: 1, sx: 1, r: 6 }, 'standard', boom + 100);
    handTo(c, 'me', 'R', boom + 300, 152, 84, -6, 'back', boom + 100);
    b.to('me.hR', boom + 300, { r: 0 }, 'standard', boom + 100);
    b.wave('me.hR', 'r', boom + 300, ting + 60, 16, 300);
    handTo(c, 'me', 'L', boom + 300, 58, 146, -6, 'standard', boom + 100);
    b.to('me.hL', boom + 300, { r: 0 }, 'standard', boom + 100);
    hand(c, 'me', 'L', boom + 300, false);
    face(c, 'me', ting + 120, 'cheer');
    b.to('me', ting + 220, { r: 0, x: 0 }, 'standard', ting + 60);
    cheerWave(c, 'me', 'R', ting + 120, END, 140, 82, 0);
    hop(c, 'me', ting + 160, 14);
    celebrate(c, ting + 160, END);
    b.until(END);
  },
};

/** The dust-up: square off, charge, a churning dust cloud with fists, a boot and POW, a white flag. */
const SCUFFLE: MoveScript = {
  mood: 'win',
  frames: [800, 2900],
  storySounds: ['ui_pop', 'moment_poof'],
  write(c) {
    const { b, m, rng } = c;
    const END = 3200;
    rig(c, 'me', ['base', 'determined', 'cheer'], { z: 10 });
    rig(c, 'foe', ['base', 'determined', 'dizzy'], { z: 11 });
    b.add({ id: 'scuffed', parent: 'foe.body', art: art(A.SCUFFED), x: 0, y: 0, w: 120, h: 120, z: 21, base: { o: 0 } });

    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });

    // Square off: fists up, a boxer's bounce.
    face(c, 'me', 520, 'determined');
    face(c, 'foe', 560, 'determined');
    handTo(c, 'me', 'R', 700, 142, 112, 0, 'back', 520);
    handTo(c, 'me', 'L', 700, 112, 118, 0, 'back', 520);
    handTo(c, 'foe', 'R', 720, 228, 118, 0, 'back', 560);
    handTo(c, 'foe', 'L', 720, 198, 112, 0, 'back', 560);
    b.wave('me.body', 'y', 640, 860, -3, 220);
    b.wave('foe.body', 'y', 660, 860, -3, 220, { phase: 1 });

    // Pull back, then charge into each other.
    b.to('me', 900, { x: -10 }, 'anticipate', 820);
    b.to('foe', 900, { x: 10 }, 'anticipate', 820);
    const clash = 980;
    b.to('me', clash, { x: 52 }, 'exit');
    b.to('foe', clash, { x: -52 }, 'exit');
    b.set('me', clash, { o: 0 });
    b.set('foe', clash, { o: 0 });
    b.cue(clash, { sound: 'moment_scuffle', haptic: 'heavy' });
    impact(c, clash, { stop: 80, trauma: 0.8, flash: 0.12 });

    // The cloud: it bursts out and churns, with bits flying out of it.
    const cx = 170;
    const cy = 92;
    b.add({ id: 'cloudFight', parent: 'cam', art: art(A.DUST_CLOUD), x: cx - 95, y: cy - 62, w: 190, h: 124, z: 45, base: { o: 0, s: 0.4 } });
    b.set('cloudFight', clash, { o: 1, s: 0.8 }).to('cloudFight', clash + 160, { s: 1.08 }, 'back', clash).to('cloudFight', clash + 240, { s: 1 }, 'standard');
    const clear = 2100;
    b.wave('cloudFight', 'x', clash + 240, clear, 5, 150);
    b.wave('cloudFight', 'y', clash + 240, clear, 4, 190, { phase: 1 });
    b.wave('cloudFight', 'r', clash + 240, clear, 3, 280);
    b.wave('cloudFight', 'sx', clash + 240, clear, 0.05, 230);
    b.wave('cloudFight', 'sy', clash + 240, clear, 0.05, 260, { phase: 2 });
    // A fist punches out of the right side, a boot out of the bottom left.
    b.add({ id: 'popFist', parent: 'cam', art: art(A.HAND_FIST, m.me), x: cx + 46, y: cy - 34, w: 46, h: 46, z: 46, base: { o: 0, r: 90 } });
    b.set('popFist', 1150, { o: 1 }).to('popFist', 1230, { x: 46, y: -10 }, 'exit', 1150).to('popFist', 1340, { x: 0, y: 0 }, 'standard').set('popFist', 1340, { o: 0 });
    b.add({ id: 'popBoot', parent: 'cam', art: art(A.BOOT), x: cx - 88, y: cy + 4, w: 50, h: 42, z: 46, base: { o: 0, r: 20, sx: -1 } });
    b.set('popBoot', 1420, { o: 1 }).to('popBoot', 1500, { x: -38, y: 10 }, 'exit', 1420).to('popBoot', 1620, { x: 0, y: 0 }, 'standard').set('popBoot', 1620, { o: 0 });
    // Heads pop out: theirs worried, mine grinning.
    b.add({ id: 'popFoe', parent: 'cam', art: portrait(c, 'foe', 'shock'), x: cx + 2, y: cy - 98, w: 76, h: 76, ox: 38, oy: 76, z: 44, base: { o: 0 } });
    b.set('popFoe', 1300, { o: 1, y: 30 }).to('popFoe', 1380, { y: 0 }, 'out', 1300).to('popFoe', 1520, { y: 0 }, 'linear').to('popFoe', 1580, { y: 40 }, 'exit').set('popFoe', 1580, { o: 0 });
    b.add({ id: 'popMe', parent: 'cam', art: portrait(c, 'me', 'cheer'), x: cx - 80, y: cy - 100, w: 76, h: 76, ox: 38, oy: 76, z: 44, base: { o: 0 } });
    b.set('popMe', 1700, { o: 1, y: 30 }).to('popMe', 1780, { y: 0 }, 'out', 1700).to('popMe', 1900, { y: 0 }, 'linear').to('popMe', 1960, { y: 40 }, 'exit').set('popMe', 1960, { o: 0 });
    word(c, 'wPow', 'moment.word.pow', 1460, cx + 70, 30, 10, 0.95);
    sparks(c, 'fs1', 1250, cx + 30, cy - 40, m.lite ? 2 : 3, { dist: 30 });
    sparks(c, 'fs2', 1620, cx - 40, cy - 30, m.lite ? 2 : 3, { dist: 30 });
    sparks(c, 'fs3', 1880, cx + 10, cy - 50, m.lite ? 2 : 3, { dist: 30 });

    // The cloud clears: me dusting off my hands, them sooty, dizzy and tilting.
    b.cue(clear, { sound: 'moment_poof' });
    b.to('cloudFight', clear + 260, { s: 1.25, o: 0 }, 'out', clear);
    for (let i = 0; i < 4; i++) {
      const id = `clr${i}`;
      const dx = (i - 1.5) * 44 + (rng.next() - 0.5) * 10;
      b.add({ id, parent: 'cam', art: art(A.SMOKE), x: cx + dx - 26, y: cy - 20, w: 52, h: 42, z: 44, base: { o: 0 } });
      b.set(id, clear, { o: 0.9 }).to(id, clear + 520, { x: dx * 0.6, y: -14 - rng.next() * 10, s: 1.4, o: 0 }, 'out', clear);
    }
    b.set('me', clear, { o: 1, x: 36 });
    b.set('foe', clear, { o: 1, x: -18 });
    face(c, 'me', clear, 'cheer');
    face(c, 'foe', clear, 'dizzy');
    b.set('scuffed', clear, { o: 1 });
    b.cue(clear + 120, { sound: 'moment_dizzy' });
    spiralEyes(c, 'foe', clear, END);
    dizzyStars(c, 'foe', clear, 2700);
    hand(c, 'me', 'R', clear, true);
    hand(c, 'me', 'L', clear, true);
    handTo(c, 'me', 'R', clear, 158, 126, 36, 'hold');
    handTo(c, 'me', 'L', clear, 112, 126, 36, 'hold');
    for (const [k, t] of [[0, clear + 120], [1, clear + 300]] as const) {
      handTo(c, 'me', 'R', t, 142, 124 - k, 36, 'exit', t - 90);
      handTo(c, 'me', 'L', t, 128, 126 + k, 36, 'exit', t - 90);
    }
    handTo(c, 'foe', 'R', clear, 228, 146, -18, 'hold');
    handTo(c, 'foe', 'L', clear, 152, 146, -18, 'hold');
    b.set('foe.body', clear, { r: -10 });
    b.wave('foe.body', 'r', clear + 100, 2600, 6, 700);

    // They wobble, sink behind the wall... and a white flag pops up: surrender.
    b.to('foe', 2900, { y: 120 }, 'exit', 2600);
    b.add({ id: 'flag', parent: 'cam', art: art(A.WHITE_FLAG), x: FOE_X - 24, y: WALL_Y - 52, w: 34, h: 54, ox: 4, oy: 54, z: 15, base: { o: 0, y: 70 } });
    b.set('flag', 2900, { o: 1 }).to('flag', 3040, { y: 0 }, 'back', 2900);
    b.wave('flag', 'r', 3040, END, 9, 360);
    b.cue(2920, { sound: 'ui_pop', pitchBp: 13000 });
    b.to('me', clear + 400, { x: 0 }, 'standard', clear + 200);
    handTo(c, 'me', 'R', clear + 560, 138, 146, 0, 'standard', clear + 420);
    hand(c, 'me', 'R', clear + 560, false);
    cheerWave(c, 'me', 'L', clear + 420, END, 44, 86, 0);
    hop(c, 'me', 2960, 14);
    // The ta-da and the confetti come as the dust settles (the flag is the last gag, with its pop);
    // the confetti falls until the hop's landing ends the scene.
    celebrate(c, clear + 320, b.end);
    b.until(END);
  },
};

/** A loss: they wave smugly, a little rain cloud rains on me (wah-wah), I wipe my face and shake it off. */
const RAIN_CLOUD: MoveScript = {
  mood: 'loss',
  frames: [700, 1500],
  storySounds: ['ui_pop', 'moment_wahwah'],
  write(c) {
    const { b, rng } = c;
    const END = 2300;
    rig(c, 'me', ['base', 'sulk', 'determined'], { z: 10 });
    rig(c, 'foe', ['base', 'smug', 'cheer'], { z: 11 });
    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });

    // They wave, pleased with themselves.
    face(c, 'foe', 500, 'smug');
    hand(c, 'foe', 'R', 500, true);
    handTo(c, 'foe', 'R', 700, 286, 92, 0, 'back', 500);
    b.wave('foe.hR', 'r', 700, 1400, 14, 380);
    handTo(c, 'foe', 'R', 1600, 282, 146, 0, 'standard', 1400);
    hand(c, 'foe', 'R', 1600, false);

    // My little rain cloud.
    face(c, 'me', 640, 'sulk');
    b.to('me', 860, { sy: 0.95, y: 3 }, 'standard', 640);
    b.add({ id: 'rain', parent: 'cam', art: art(A.RAIN_CLOUD), x: ME_X - 38, y: 2, w: 76, h: 46, z: 40, base: { o: 0, x: -120 } });
    b.set('rain', 680, { o: 1 }).to('rain', 900, { x: 0 }, 'out', 680);
    b.wave('rain', 'y', 900, 1800, 2, 600);
    b.cue(860, { sound: 'moment_wahwah' });
    for (let i = 0; i < 7; i++) {
      const id = `drop${i}`;
      const x = ME_X - 26 + i * 8.5;
      b.add({ id, parent: 'cam', art: art(A.DROP), x: x - 4, y: 36, w: 8, h: 14, z: 39, base: { o: 0 } });
      for (let k = 0; k < 3; k++) {
        const t0 = 920 + k * 300 + ((i * 97) % 260) + rng.next() * 30;
        b.set(id, t0, { o: 0.95, y: 0 }).to(id, t0 + 260, { y: 44 }, 'exit', t0).set(id, t0 + 262, { o: 0 });
      }
    }
    // A wipe, then a determined face; I shake the rain off and the cloud puffs away.
    hand(c, 'me', 'L', 1640, true);
    handTo(c, 'me', 'L', 1760, 112, 94, 0, 'standard', 1640);
    handTo(c, 'me', 'L', 1880, 58, 146, 0, 'standard', 1760);
    face(c, 'me', 1800, 'determined');
    b.to('me', 1880, { sy: 1, y: 0 }, 'back', 1760);
    b.wave('me', 'x', 1900, 2100, 3, 80);
    b.to('rain', 2100, { s: 1.2, o: 0 }, 'out', 1880);
    b.cue(1900, { sound: 'ui_pop', pitchBp: 8000 });
    face(c, 'foe', 1700, 'cheer');
    breathe(c, 'me', 2100, END);
    b.until(END);
  },
};

/** A loss: they throw a pie at me (gently), I blink through the cream and wipe it off with a wry smile. */
const PIED_YOU: MoveScript = {
  mood: 'loss',
  frames: [800, 1500],
  storySounds: ['ui_pop', 'moment_splat'],
  write(c) {
    const { b, m } = c;
    const END = 2400;
    rig(c, 'me', ['base', 'shock', 'blank', 'wry'], { z: 10 });
    rig(c, 'foe', ['base', 'smug', 'cheer'], { z: 11 });
    const ps = 0.82;
    b.add({ id: 'pieHeld', parent: 'foe.hL', art: art(A.PIE), x: HAND / 2 - 32 * ps, y: 3 - 39 * ps, w: 64 * ps, h: 40 * ps, ox: 32 * ps, oy: 39 * ps, z: 3 });
    b.add({ id: 'pieFly', parent: 'cam', art: art(A.PIE), x: -32 * ps, y: -20 * ps, w: 64 * ps, h: 40 * ps, z: 45, base: { o: 0 } });
    b.add({ id: 'cream', parent: 'me.body', art: art(A.CREAM_FACE), x: 0, y: 0, w: 120, h: 120, z: 21, base: { o: 0 } });
    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });

    hand(c, 'foe', 'L', 0, true);
    b.set('foe.hL', 0, { y: 110 });
    face(c, 'foe', 520, 'smug');
    handTo(c, 'foe', 'L', 760, 196, 104, 0, 'back', 520);
    face(c, 'me', 700, 'shock');
    handTo(c, 'foe', 'L', 960, 218, 86, 0, 'anticipate', 800);
    const rel = 980;
    const hitT = 1140;
    b.cue(rel, { sound: 'moment_swish', pitchBp: 9000 });
    b.set('pieHeld', rel, { o: 0 });
    handTo(c, 'foe', 'L', 1060, 170, 100, 0, 'exit', rel);
    b.set('pieFly', rel, { o: 1, x: 214, y: 52 });
    b.to('pieFly', hitT, { x: ME_X }, 'linear', rel);
    b.to('pieFly', rel + 70, { y: 44 }, 'out', rel).to('pieFly', hitT, { y: 90 }, 'exit');
    b.to('pieFly', hitT, { r: -300 }, 'linear', rel);
    b.set('pieFly', hitT, { o: 0 });
    // A soft splat: no shake, no flash, no hit-stop on a loss.
    b.cue(hitT, { sound: 'moment_splat' });
    face(c, 'me', hitT, 'blank');
    b.set('cream', hitT, { o: 1, sx: 1.2, sy: 0.85 }).to('cream', hitT + 200, { sx: 1, sy: 1 }, 'back');
    b.set('me.body', hitT, { r: -6 }).to('me.body', hitT + 360, { r: 0 }, 'back');
    sparks(c, 'blob', hitT, ME_X, 90, m.lite ? 4 : 7, { spread: [160, 380], dist: 34, artFn: () => A.BLOB, size: 8, fall: 40 });
    peekEyes(c, 'me', hitT + 60, [1380, 1640]);
    face(c, 'foe', 1200, 'cheer');
    handTo(c, 'foe', 'L', 1300, 202, 146, 0, 'standard', 1100);
    b.wave('foe', 'y', 1260, 2000, -3, 260);
    // I wipe the cream off with a sweep of my hand: a good sport's wry smile.
    hand(c, 'me', 'R', 1700, true);
    handTo(c, 'me', 'R', 1800, 70, 92, 0, 'standard', 1700);
    handTo(c, 'me', 'R', 1960, 128, 92, 0, 'standard', 1800);
    handTo(c, 'me', 'R', 2120, 138, 146, 0, 'standard', 1960);
    b.to('cream', 1960, { o: 0, x: 40 }, 'standard', 1800);
    b.set('me.peek', 1880, { o: 0 });
    face(c, 'me', 1880, 'wry');
    breathe(c, 'me', 2000, END);
    b.until(END);
  },
};

/** A draw: a stare-down, a tumbleweed rolls between them on the wind, both shrug. */
const STANDOFF: MoveScript = {
  mood: 'draw',
  frames: [700, 1900],
  storySounds: ['ui_pop', 'moment_shrug'],
  write(c) {
    const { b } = c;
    const END = 2300;
    rig(c, 'me', ['base', 'determined', 'wry'], { z: 10 });
    rig(c, 'foe', ['base', 'determined', 'wry'], { z: 11 });
    popUp(c, 'me', 120);
    popUp(c, 'foe', 210);
    b.cue(150, { sound: 'ui_pop' });
    // The stare-down.
    face(c, 'me', 480, 'determined');
    face(c, 'foe', 500, 'determined');
    b.to('me', 760, { r: 5, x: 6 }, 'standard', 520);
    b.to('foe', 760, { r: -5, x: -6 }, 'standard', 540);
    // The tumbleweed, bouncing across on the wind.
    b.cue(620, { sound: 'moment_wind' });
    b.add({ id: 'weed', parent: 'cam', art: art(A.TUMBLEWEED), x: 380, y: 100, w: 40, h: 40, z: 15, base: { o: 1 } });
    for (let i = 0; i < 3; i++) {
      const id = `gust${i}`;
      const t = 600 + i * 260;
      b.add({ id, parent: 'cam', art: art(A.WIND), x: 360, y: 52 + i * 26, w: 60, h: 8, z: 14, base: { o: 0 } });
      b.set(id, t, { o: 0.9 }).to(id, t + 900, { x: -460 }, 'linear', t).to(id, t + 900, { o: 0 }, 'exit', t + 600);
    }
    const t0 = 640;
    const t1 = 1640;
    b.to('weed', t1, { x: -460 }, 'linear', t0);
    b.to('weed', t1, { r: -900 }, 'linear', t0);
    for (let t = t0, k = 0; t < t1; t += 250, k++) b.to('weed', t + 125, { y: -10 - (k % 2) * 6 }, 'out', t).to('weed', t + 250, { y: 0 }, 'exit');
    // Both shrug: shoulders up, palms out, a question mark each.
    const shrug = 1700;
    b.cue(shrug, { sound: 'moment_shrug' });
    for (const who of ['me', 'foe'] as const) {
      face(c, who, shrug, 'wry');
      b.to(who, shrug + 200, { r: 0, x: 0, y: -5, sy: 1.05, sx: 0.98 }, 'back', shrug - 60);
      b.to(who, END - 100, { y: 0, sy: 1, sx: 1 }, 'standard', shrug + 500);
      hand(c, who, 'R', shrug, true);
      hand(c, who, 'L', shrug, true);
      const x = cxOf(who);
      handTo(c, who, 'R', shrug + 200, x + 50, 104, 0, 'back', shrug - 40);
      handTo(c, who, 'L', shrug + 200, x - 50, 104, 0, 'back', shrug - 40);
      b.to(`${who}.hR`, shrug + 200, { r: 30 }, 'back', shrug - 40);
      b.to(`${who}.hL`, shrug + 200, { r: -30 }, 'back', shrug - 40);
      const q = `${who}.q`;
      b.add({ id: q, parent: 'cam', art: art(A.QUESTION), x: x + 22, y: 8, w: 18, h: 27, ox: 9, oy: 27, z: 50, base: { o: 0, s: 0.3 } });
      b.set(q, shrug + 120, { o: 1 }).to(q, shrug + 300, { s: 1.15 }, 'back', shrug + 120).to(q, shrug + 420, { s: 1 }, 'standard');
    }
    b.until(END);
  },
};

const SCRIPTS: Readonly<Record<string, MoveScript>> = {
  mallet: MALLET,
  pie: PIE,
  tarFeathers: TAR_FEATHERS,
  launch: LAUNCH,
  scuffle: SCUFFLE,
  rainCloud: RAIN_CLOUD,
  piedYou: PIED_YOU,
  standoff: STANDOFF,
};

/** The move ids that have a script (an integrity test compares them with the data). */
export const SCRIPTED_MOVES: readonly string[] = Object.keys(SCRIPTS);

// ---------------------------------------------------------------------------------------------
// Reduce motion: the two-frame storyboard
// ---------------------------------------------------------------------------------------------

/** The storyboard's timing: the set-up fades in, holds, cross-fades to the outcome, which holds. */
export const STORY = { fade: 180, swap: 900, end: 2100 } as const;

/**
 * Reduce motion replaces the moment with a storyboard (ui-plan 5.6, "replaces, never deletes"): the
 * set-up (both Generals up, the prop out) fades in, then cross-fades to the outcome (the opponent
 * dizzy, creamed, feathered or gone with a twinkle; you cheering). Static poses, opacity only: no
 * movement, shake, flash or hit-stop, and the sounds of the two frames. The stage's confetti stays
 * out (frozen in mid-air its bits would sit on the faces).
 */
export function storyboard(full: Scene, backdrop: Set<string>, frames: [number, number], sounds: [string, string]): Scene {
  const b = new SceneBuilder(full.w, full.h);
  const kids = new Map<string, SceneNode[]>();
  for (const n of full.nodes) if (n.parent) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n]);
  const copy = (n: SceneNode, id: string, parent: string | undefined, base: PoseIn): NodeIn => ({
    id,
    ...(parent ? { parent } : {}),
    art: n.art,
    x: n.x,
    y: n.y,
    w: n.w,
    h: n.h,
    ox: n.ox,
    oy: n.oy,
    z: n.z,
    base,
    ...(n.cls ? { cls: n.cls } : {}),
    ...(n.css ? { css: n.css } : {}),
  });
  // The backdrop, static (the camera at rest).
  for (const n of full.nodes) if (n.id === 'cam' || backdrop.has(n.id)) b.add(copy(n, n.id, n.parent ?? undefined, n.base));
  frames.forEach((ft, f) => {
    const t = full.stops.reduce((x, s) => (s.at < ft ? x + s.ms : x), ft);
    const frame = `frame${f}`;
    b.add({ id: frame, parent: 'cam', x: 0, y: 0, w: full.w, h: full.h, z: 10, base: { o: 0 } });
    const clone = (n: SceneNode, parent: string): void => {
      const id = `${f}:${n.id}`;
      b.add(copy(n, id, parent, poseAt(full, n.id, t)));
      for (const k of kids.get(n.id) ?? []) clone(k, id);
    };
    for (const n of full.nodes) if (n.parent === 'cam' && !backdrop.has(n.id) && !n.id.startsWith(CONFETTI)) clone(n, frame);
    if (f === 0) b.to(frame, STORY.fade, { o: 1 }, 'out', 0).to(frame, STORY.swap + STORY.fade, { o: 0 }, 'linear', STORY.swap);
    else b.to(frame, STORY.swap + STORY.fade, { o: 1 }, 'linear', STORY.swap);
  });
  b.cue(0, { sound: sounds[0] });
  b.cue(STORY.swap, { sound: sounds[1], celebrate: true });
  b.until(STORY.end);
  return b.build();
}

// ---------------------------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------------------------

/** The scene of a move (null for an unknown id). Deterministic for the same input. */
export function buildMoment(m: MomentInput): Scene | null {
  const script = SCRIPTS[m.move];
  if (!script) return null;
  const b = new SceneBuilder(STAGE_W, STAGE_H);
  const c: Ctx = { b, m: { ...m, hitstop: m.hitstop && !m.reduce, shake: m.reduce ? 0 : m.shake }, rng: mulberry32(m.seed ^ 0x5eed), exprs: { me: [], foe: [] }, backdrop: new Set() };
  stage(c, script.mood);
  script.write(c);
  drift(c, b.end);
  const full = b.build();
  return m.reduce ? storyboard(full, c.backdrop, script.frames, script.storySounds) : full;
}

/** The stage mood of a move (the slot's sky). */
export function moodOf(move: string): A.StageMood {
  return SCRIPTS[move]?.mood ?? 'win';
}
