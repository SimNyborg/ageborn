/**
 * The collected emotes (DESIGN A18.9.4; PLAN 2a "Emotes (24 collected)", redrawn 2026-10-09): 24 small
 * characters and props in the art sheet's cel style (AUDIT §3: one hard shadow band per part, one
 * highlight, an outline in the fill's own dark, never black) filling a 96-unit box, two per age and
 * eight general ones. The general ones star Pebble, a little stone pal, so the set reads as one cast.
 *
 * Each emote is a stack of layers; a layer may move with one motion of {@link EMOTE_MOTIONS}, written as
 * CSS keyframes inside the SVG, so the image animates wherever it is shown (the emote wheel, the battle
 * bubble, Customize, the capsule summary) without any script. Every motion runs a 1.2 s loop:
 * anticipation, the action with overshoot, then it settles on the emote's key pose and holds. A layer's
 * drawn geometry IS the key pose, so Reduce motion (no `<style>`) shows it still. Each emote has 3-4
 * moving parts.
 */
import { cel, celRamp, circle, ellipse, ellipsePath, gearPath, glow, ribbonPath, rotatePath, sparklePath, stadiumPath, star, xformPath, type Shape } from './shapes';

export type EmoteMotion =
  | 'hop'
  | 'squash'
  | 'bonk'
  | 'orbit'
  | 'pop'
  | 'popLate'
  | 'float'
  | 'floatLate'
  | 'trumpet'
  | 'flap'
  | 'nod'
  | 'drop'
  | 'pour'
  | 'drip'
  | 'toast'
  | 'bow'
  | 'flourish'
  | 'rock'
  | 'strum'
  | 'tip'
  | 'sway'
  | 'recoil'
  | 'slide'
  | 'puff'
  | 'burst'
  | 'toot'
  | 'pull'
  | 'spin'
  | 'spinBack'
  | 'beat'
  | 'ring'
  | 'ringLate'
  | 'blink'
  | 'wobble'
  | 'swing'
  | 'danceBody'
  | 'danceArmL'
  | 'danceArmR'
  | 'wave'
  | 'flicker'
  | 'pulse'
  | 'raysSpin'
  | 'raysBack'
  | 'aura'
  | 'orbitMoon'
  | 'clapL'
  | 'clapR'
  | 'jolt'
  | 'eyesPop'
  | 'ponder'
  | 'tap'
  | 'breathe'
  | 'inflate'
  | 'blow'
  | 'dropIn'
  | 'lean'
  | 'glint'
  | 'tremble'
  | 'scratch'
  | 'sweat';

export interface EmoteLayer {
  shapes: Shape[];
  motion?: EmoteMotion;
  /** Pivot of the motion (view-box units); default the box centre. */
  at?: [number, number];
  /** How far into its loop the motion starts (seconds), so parts do not move in lockstep. */
  delay?: number;
  /**
   * Parts attached to this one: they move with it and may add their own motion on top (a plume on a
   * tipped hat, an ear on a hopping mammoth). Drawn after this layer's shapes, or before them (`behind`).
   */
  sub?: EmoteSub[];
}

/** An attached part (see {@link EmoteLayer.sub}). */
export type EmoteSub = EmoteLayer & { behind?: boolean };

export interface EmoteArt {
  layers: EmoteLayer[];
}

/** The emote box (96 units square; the ground line about y 88). */
export const EMOTE_BOX = 96;

// ---------------------------------------------------------------------------------------------
// The motion library: one 1.2 s loop each (anticipation, action with overshoot, settle, hold)
// ---------------------------------------------------------------------------------------------

const T = (s: string) => `transform:${s}`;

/** Keyframes (the body of `@keyframes`), timing function and loop length per motion. */
export const EMOTE_MOTIONS: Readonly<Record<EmoteMotion, { kf: string; ease: string; dur?: number }>> = {
  hop: { kf: `0%,100%{${T('translate(0,0) scale(1,1)')}}10%{${T('translate(0,1.6px) scale(1.08,.9)')}}24%{${T('translate(0,-8px) scale(.94,1.08)')}}38%{${T('translate(0,.6px) scale(1.06,.93)')}}50%{${T('translate(0,0) scale(.98,1.02)')}}60%{${T('translate(0,0) scale(1,1)')}}`, ease: 'cubic-bezier(.4,0,.3,1)' },
  squash: { kf: `0%,24%,100%{${T('translate(0,0) scale(1,1)')}}30%{${T('translate(0,2px) scale(1.14,.84)')}}42%{${T('translate(0,-1px) scale(.95,1.06)')}}54%{${T('translate(0,0) scale(1.02,.98)')}}64%{${T('translate(0,0) scale(1,1)')}}`, ease: 'ease-out' },
  bonk: { kf: `0%,100%{${T('rotate(24deg)')}}12%{${T('rotate(36deg)')}}26%{${T('rotate(-4deg)')}}32%{${T('rotate(12deg)')}}42%{${T('rotate(2deg)')}}50%,72%{${T('rotate(0deg)')}}88%{${T('rotate(24deg)')}}`, ease: 'cubic-bezier(.5,0,.3,1)' },
  orbit: { kf: `0%{${T('rotate(0deg)')}}100%{${T('rotate(360deg)')}}`, ease: 'linear' },
  pop: { kf: `0%,16%{opacity:0;${T('scale(.2)')}}28%{opacity:1;${T('scale(1.28)')}}40%{${T('scale(.94)')}}50%,82%{opacity:1;${T('scale(1)')}}100%{opacity:0;${T('scale(.5)')}}`, ease: 'ease-out' },
  popLate: { kf: `0%,36%{opacity:0;${T('scale(.2)')}}48%{opacity:1;${T('scale(1.28)')}}58%{${T('scale(.94)')}}66%,86%{opacity:1;${T('scale(1)')}}100%{opacity:0;${T('scale(.5)')}}`, ease: 'ease-out' },
  float: { kf: `0%{opacity:0;${T('translate(-2px,8px) scale(.5)')}}18%{opacity:1;${T('translate(0,1px) scale(1.15)')}}30%{${T('translate(0,0) scale(1)')}}74%{opacity:1;${T('translate(3px,-8px) scale(1)')}}100%{opacity:0;${T('translate(5px,-15px) scale(.85)')}}`, ease: 'ease-out' },
  floatLate: { kf: `0%,30%{opacity:0;${T('translate(-2px,8px) scale(.5)')}}46%{opacity:1;${T('translate(0,1px) scale(1.15)')}}56%{${T('translate(0,0) scale(1)')}}86%{opacity:1;${T('translate(3px,-7px) scale(1)')}}100%{opacity:0;${T('translate(4px,-11px) scale(.85)')}}`, ease: 'ease-out' },
  trumpet: { kf: `0%,100%{${T('rotate(0deg)')}}10%{${T('rotate(16deg)')}}24%{${T('rotate(-9deg)')}}34%{${T('rotate(3deg)')}}44%{${T('rotate(0deg)')}}`, ease: 'cubic-bezier(.3,0,.2,1)' },
  flap: { kf: `0%,100%{${T('rotate(0deg)')}}14%{${T('rotate(-14deg)')}}26%{${T('rotate(9deg)')}}38%{${T('rotate(-4deg)')}}50%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  nod: { kf: `0%,100%{${T('rotate(0deg)')}}12%{${T('rotate(4deg)')}}28%{${T('rotate(-6deg)')}}42%{${T('rotate(2deg)')}}54%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  drop: { kf: `0%{opacity:0;${T('translate(0,-24px)')}}12%{opacity:1;${T('translate(0,-24px)')}}28%{${T('translate(0,2px) scale(1.08,.9)')}}38%{${T('translate(0,-3px) scale(.97,1.04)')}}48%,88%{opacity:1;${T('translate(0,0) scale(1,1)')}}100%{opacity:0;${T('translate(0,-8px)')}}`, ease: 'cubic-bezier(.5,0,.3,1)' },
  pour: { kf: `0%,100%{${T('rotate(-26deg)')}}14%{${T('rotate(-33deg)')}}30%{${T('rotate(5deg)')}}42%,78%{${T('rotate(0deg)')}}92%{${T('rotate(-26deg)')}}`, ease: 'cubic-bezier(.4,0,.2,1)' },
  drip: { kf: `0%,30%{opacity:0;${T('translate(0,-8px)')}}40%{opacity:1;${T('translate(0,-4px)')}}76%{opacity:1;${T('translate(0,5px)')}}90%,100%{opacity:0;${T('translate(0,9px)')}}`, ease: 'cubic-bezier(.5,0,1,1)' },
  toast: { kf: `0%,100%{${T('translate(0,0) rotate(0deg)')}}30%{${T('translate(0,3px) rotate(5deg)')}}44%{${T('translate(0,-7px) rotate(-9deg)')}}54%{${T('translate(0,-4px) rotate(-5deg)')}}68%{${T('translate(0,0) rotate(0deg)')}}`, ease: 'ease-in-out' },
  bow: { kf: `0%,100%{${T('rotate(-18deg)')}}12%{${T('rotate(-23deg)')}}30%{${T('rotate(5deg)')}}42%,74%{${T('rotate(0deg)')}}90%{${T('rotate(-18deg)')}}`, ease: 'cubic-bezier(.4,0,.2,1)' },
  flourish: { kf: `0%,100%{${T('rotate(34deg)')}}14%{${T('rotate(44deg)')}}30%{${T('rotate(-9deg)')}}42%,74%{${T('rotate(0deg)')}}90%{${T('rotate(34deg)')}}`, ease: 'cubic-bezier(.4,0,.2,1)' },
  rock: { kf: `0%,100%{${T('rotate(0deg)')}}25%{${T('rotate(-5deg)')}}50%{${T('rotate(0deg)')}}75%{${T('rotate(5deg)')}}`, ease: 'ease-in-out' },
  strum: { kf: `0%,100%{${T('translate(0,0) rotate(0deg)')}}10%{${T('translate(0,-5px) rotate(-12deg)')}}20%{${T('translate(0,5px) rotate(9deg)')}}30%{${T('translate(0,0) rotate(0deg)')}}50%{${T('translate(0,-5px) rotate(-12deg)')}}60%{${T('translate(0,5px) rotate(9deg)')}}70%{${T('translate(0,0) rotate(0deg)')}}`, ease: 'ease-in-out' },
  tip: { kf: `0%,100%{${T('translate(0,10px) rotate(-14deg)')}}14%{${T('translate(0,12px) rotate(-17deg)')}}30%{${T('translate(0,-3px) rotate(5deg)')}}42%,78%{${T('translate(0,0) rotate(0deg)')}}92%{${T('translate(0,10px) rotate(-14deg)')}}`, ease: 'cubic-bezier(.4,0,.2,1)' },
  sway: { kf: `0%,100%{${T('rotate(0deg)')}}18%{${T('rotate(11deg)')}}32%{${T('rotate(-13deg)')}}46%{${T('rotate(6deg)')}}58%{${T('rotate(-2deg)')}}68%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  recoil: { kf: `0%,100%{${T('translate(0,0) rotate(0deg) scale(1,1)')}}10%{${T('translate(1px,1px) rotate(0deg) scale(.95,1.05)')}}16%{${T('translate(-9px,4px) rotate(10deg) scale(1.08,.92)')}}30%{${T('translate(2px,-1px) rotate(-3deg) scale(1,1)')}}42%{${T('translate(0,0) rotate(0deg) scale(1,1)')}}`, ease: 'ease-out' },
  slide: { kf: `0%,10%,100%{${T('translate(0,0)')}}16%{${T('translate(-4px,0)')}}30%{${T('translate(1px,0)')}}42%{${T('translate(0,0)')}}`, ease: 'ease-out' },
  puff: { kf: `0%,12%{opacity:0;${T('scale(.3)')}}18%{opacity:1;${T('scale(1.1)')}}40%{opacity:.9;${T('translate(4px,-4px) scale(1.3)')}}62%,100%{opacity:0;${T('translate(8px,-9px) scale(1.6)')}}`, ease: 'ease-out' },
  burst: { kf: `0%,14%{opacity:0;${T('translate(0,0) scale(.15)')}}22%{opacity:1;${T('translate(0,0) scale(1.18)')}}34%{${T('translate(0,0) scale(1)')}}72%{opacity:1;${T('translate(0,7px) scale(1)')}}92%,100%{opacity:0;${T('translate(0,13px) scale(1)')}}`, ease: 'cubic-bezier(.2,.8,.3,1)' },
  toot: { kf: `0%,100%{${T('scale(1,1)')}}10%{${T('scale(1.07,.9)')}}20%{${T('scale(.93,1.1)')}}28%{${T('scale(1.04,.96)')}}36%{${T('scale(.98,1.03)')}}44%{${T('scale(1,1)')}}`, ease: 'ease-in-out' },
  pull: { kf: `0%,100%{${T('rotate(0deg)')}}6%{${T('rotate(-7deg)')}}16%{${T('rotate(18deg)')}}40%{${T('rotate(18deg)')}}52%{${T('rotate(-3deg)')}}60%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  spin: { kf: `0%{${T('rotate(0deg)')}}10%{${T('rotate(-14deg)')}}62%{${T('rotate(372deg)')}}72%,100%{${T('rotate(360deg)')}}`, ease: 'ease-in-out' },
  spinBack: { kf: `0%{${T('rotate(0deg)')}}10%{${T('rotate(18deg)')}}62%{${T('rotate(-465deg)')}}72%,100%{${T('rotate(-450deg)')}}`, ease: 'ease-in-out' },
  beat: { kf: `0%,100%{${T('scale(1)')}}12%{${T('scale(.9)')}}22%{${T('scale(1.2)')}}32%{${T('scale(.97)')}}42%{${T('scale(1.12)')}}54%{${T('scale(1)')}}`, ease: 'ease-in-out' },
  ring: { kf: `0%{opacity:0;${T('scale(.4)')}}14%{opacity:1}60%{opacity:.65;${T('scale(1.2)')}}82%,100%{opacity:0;${T('scale(1.5)')}}`, ease: 'ease-out' },
  ringLate: { kf: `0%,30%{opacity:0;${T('scale(.4)')}}44%{opacity:1}80%{opacity:.6;${T('scale(1.2)')}}96%,100%{opacity:0;${T('scale(1.45)')}}`, ease: 'ease-out' },
  blink: { kf: `0%,38%,62%,100%{opacity:1}48%{opacity:.25}`, ease: 'steps(1,end)' },
  wobble: { kf: `0%,100%{${T('rotate(0deg)')}}14%{${T('rotate(-11deg)')}}28%{${T('rotate(9deg)')}}42%{${T('rotate(-4deg)')}}56%{${T('rotate(2deg)')}}66%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  swing: { kf: `0%,100%{${T('rotate(0deg)')}}12%{${T('rotate(-15deg)')}}28%{${T('rotate(13deg)')}}44%{${T('rotate(-6deg)')}}58%{${T('rotate(3deg)')}}70%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  danceBody: { kf: `0%,30%,100%{${T('translate(0,0) rotate(0deg)')}}33%,63%{${T('translate(-3px,1.5px) rotate(-7deg)')}}66%,96%{${T('translate(3px,1.5px) rotate(7deg)')}}`, ease: 'ease-out' },
  danceArmL: { kf: `0%,30%,100%{${T('rotate(0deg)')}}33%,63%{${T('rotate(-120deg)')}}66%,96%{${T('rotate(-60deg)')}}`, ease: 'ease-out' },
  danceArmR: { kf: `0%,30%,100%{${T('rotate(0deg)')}}33%,63%{${T('rotate(-70deg)')}}66%,96%{${T('rotate(110deg)')}}`, ease: 'ease-out' },
  wave: { kf: `0%,100%{${T('rotate(0deg)')}}12%{${T('rotate(10deg)')}}24%{${T('rotate(-17deg)')}}36%{${T('rotate(13deg)')}}48%{${T('rotate(-8deg)')}}60%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  flicker: { kf: `0%,100%{opacity:1}7%{opacity:.35}10%{opacity:1}52%{opacity:1}54%{opacity:.5}57%{opacity:1}`, ease: 'steps(1,end)' },
  pulse: { kf: `0%,100%{opacity:.75;${T('scale(1)')}}50%{opacity:1;${T('scale(1.1)')}}`, ease: 'ease-in-out' },
  raysSpin: { kf: `0%{${T('rotate(0deg) scale(1)')}}20%{${T('rotate(6deg) scale(1.08)')}}100%{${T('rotate(30deg) scale(1)')}}`, ease: 'linear' },
  raysBack: { kf: `0%{${T('rotate(0deg) scale(1)')}}30%{${T('rotate(-14deg) scale(1.12)')}}100%{${T('rotate(-45deg) scale(1)')}}`, ease: 'linear' },
  aura: { kf: `0%,100%{opacity:.7;${T('scale(.94)')}}40%{opacity:1;${T('scale(1.06)')}}`, ease: 'ease-in-out' },
  orbitMoon: { kf: orbitKeyframes(48, 50, 38, 12, -14), ease: 'linear' },
  clapL: { kf: `0%,100%{${T('rotate(-26deg)')}}12%{${T('rotate(-32deg)')}}24%{${T('rotate(3deg)')}}32%{${T('rotate(0deg)')}}46%{${T('rotate(-24deg)')}}58%{${T('rotate(3deg)')}}66%,80%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  clapR: { kf: `0%,100%{${T('rotate(26deg)')}}12%{${T('rotate(32deg)')}}24%{${T('rotate(-3deg)')}}32%{${T('rotate(0deg)')}}46%{${T('rotate(24deg)')}}58%{${T('rotate(-3deg)')}}66%,80%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  jolt: { kf: `0%,100%{${T('translate(0,0) scale(1,1)')}}8%{${T('translate(0,2px) scale(1.07,.92)')}}20%{${T('translate(-3px,-9px) scale(.92,1.1)')}}34%{${T('translate(-1px,0) scale(1.05,.95)')}}46%{${T('translate(0,0) scale(1,1)')}}`, ease: 'cubic-bezier(.4,0,.3,1)' },
  eyesPop: { kf: `0%,100%{${T('scale(1)')}}14%{${T('scale(.55)')}}26%{${T('scale(1.35)')}}38%{${T('scale(.94)')}}48%{${T('scale(1)')}}`, ease: 'ease-out' },
  ponder: { kf: `0%,100%{${T('rotate(0deg)')}}30%,62%{${T('rotate(-5deg)')}}80%{${T('rotate(1deg)')}}`, ease: 'ease-in-out' },
  tap: { kf: `0%,100%{${T('rotate(0deg)')}}16%{${T('rotate(-13deg)')}}26%{${T('rotate(0deg)')}}36%{${T('rotate(-13deg)')}}46%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  breathe: { kf: `0%,100%{${T('scale(1,1)')}}50%{${T('scale(1.04,.96)')}}`, ease: 'ease-in-out', dur: 2.4 },
  inflate: { kf: `0%{opacity:1;${T('scale(.3)')}}62%{opacity:1;${T('scale(1.12)')}}70%{opacity:1;${T('scale(1.18)')}}74%{opacity:0;${T('scale(1.45)')}}100%{opacity:0;${T('scale(.3)')}}`, ease: 'ease-in-out', dur: 2.4 },
  blow: { kf: `0%,100%{${T('scale(.3,1)')}}12%{${T('scale(.18,1)')}}26%{${T('scale(1.14,1)')}}36%{${T('scale(.95,1)')}}46%,76%{${T('scale(1,1)')}}90%{${T('scale(.3,1)')}}`, ease: 'cubic-bezier(.3,0,.2,1)' },
  dropIn: { kf: `0%{opacity:0;${T('translate(0,-28px)')}}12%{opacity:1;${T('translate(0,-28px)')}}26%{${T('translate(0,2px) scale(1.07,.9)')}}36%{${T('translate(0,-2px) scale(.98,1.04)')}}46%,90%{opacity:1;${T('translate(0,0) scale(1,1)')}}100%{opacity:0;${T('translate(0,-10px)')}}`, ease: 'cubic-bezier(.5,0,.3,1)' },
  lean: { kf: `0%,100%{${T('rotate(0deg)')}}22%{${T('rotate(2deg)')}}36%{${T('rotate(-7deg)')}}48%,80%{${T('rotate(-5deg)')}}`, ease: 'ease-in-out' },
  glint: { kf: `0%,40%{opacity:0;${T('scale(.2) rotate(0deg)')}}50%{opacity:1;${T('scale(1.35) rotate(25deg)')}}62%{opacity:1;${T('scale(1) rotate(0deg)')}}82%,100%{opacity:0;${T('scale(.6) rotate(0deg)')}}`, ease: 'ease-out' },
  tremble: { kf: `0%,36%,100%{${T('translate(0,0)')}}6%{${T('translate(-1.6px,0)')}}12%{${T('translate(1.6px,0)')}}18%{${T('translate(-1.2px,0)')}}24%{${T('translate(1.2px,0)')}}30%{${T('translate(-.6px,0)')}}`, ease: 'linear' },
  scratch: { kf: `0%,100%{${T('rotate(0deg)')}}10%{${T('rotate(-15deg)')}}20%{${T('rotate(6deg)')}}30%{${T('rotate(-15deg)')}}40%{${T('rotate(6deg)')}}50%{${T('rotate(0deg)')}}`, ease: 'ease-in-out' },
  sweat: { kf: `0%{opacity:0;${T('translate(0,-4px) scale(.6)')}}16%{opacity:1;${T('translate(0,-2px) scale(1)')}}70%{opacity:1;${T('translate(0,7px) scale(.9,1.15)')}}86%,100%{opacity:0;${T('translate(0,11px) scale(.9,1.15)')}}`, ease: 'ease-in' },
};

/**
 * A moon on a tilted orbit (Orbit Heart): translate keyframes around an ellipse centred on (cx, cy) with
 * radii rx, ry, tilted by `tiltDeg`, starting (0% and 100%) where the moon is drawn (the front right),
 * a little bigger in front and smaller behind.
 */
function orbitKeyframes(cx: number, cy: number, rx: number, ry: number, tiltDeg: number): string {
  void cx;
  void cy;
  const tilt = (tiltDeg * Math.PI) / 180;
  const start = 0.6;
  const at = (a: number): [number, number] => {
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)];
  };
  const [x0, y0] = at(start);
  const out: string[] = [];
  for (let i = 0; i <= 8; i += 1) {
    const a = start + (i / 8) * Math.PI * 2;
    const [x, y] = at(a);
    const s = 1 + 0.18 * Math.sin(a);
    out.push(`${Math.round((i / 8) * 1000) / 10}%{${T(`translate(${(x - x0).toFixed(1)}px,${(y - y0).toFixed(1)}px) scale(${s.toFixed(2)})`)}}`);
  }
  return out.join('');
}

// ---------------------------------------------------------------------------------------------
// Palette and small helpers
// ---------------------------------------------------------------------------------------------

const STONE = '#bcab90';
const STONE_FOOT = '#97846c';
const WHITE = '#fbf8f0';
const PUPIL = '#2a2230';
const BLUSH = '#f08a7a';
const GLOVE = '#f4eee2';
const GOLD = '#f2c14e';
const WOOD = '#a96d3d';
const WOOD_DARK = '#7a4e2c';
const IVORY = '#f6ecd4';
const FUR = '#9b6b4a';
const FUR_DARK = '#7b4f33';
const MARBLE = '#ece6d8';
const TERRA = '#c8744a';
const BLACKFIG = '#3a2a24';
const WINE = '#9a2f55';
const ERMINE = '#f6f1e8';
const SKIN = '#f2c9a0';
const HAT = '#3a3346';
const BRASS = '#d9a441';
const IRON = '#5b6168';
const STEEL = '#b8c0cc';
const OLIVE = '#6b7a45';
const RED = '#e2465a';
const PINK = '#ff7aa8';
const MINT = '#5ef0c8';
const VIOLET = '#9a6bff';
const LILAC = '#c9a8ff';
const MOUTH = '#7a2a3a';
const CONFETTI = ['#ff6fa8', '#ffd447', '#5ef0c8', '#9a6bff', '#7fd65f', '#ff8a6a'];

/** The dark line of a fill (strokes drawn on a part: mouths, creases, grain). */
const ink = (fill: string): string => celRamp(fill).line;
/** An interior detail line in a part's mid-dark (dropped below 48 px). */
const crease = (d: string, fill: string, w = 1.5): Shape => ({ d, stroke: celRamp(fill).inner, width: w, lo: true });
const stroke = (d: string, color: string, w: number, alpha?: number): Shape => ({ d, stroke: color, width: w, ...(alpha !== undefined ? { alpha } : {}) });
const rot = (d: string, deg: number, cx: number, cy: number): string => rotatePath(d, deg, cx, cy);
/** Moves and turns every shape of a group (a prop drawn upright, then placed). */
function place(shapes: Shape[], o: { dx?: number; dy?: number; deg?: number; cx?: number; cy?: number }): Shape[] {
  const cx = o.cx ?? 0;
  const cy = o.cy ?? 0;
  const tf = (d: string) => {
    const r = o.deg ? rotatePath(d, o.deg, cx, cy) : d;
    return o.dx || o.dy ? xformPath(r, { dx: o.dx ?? 0, dy: o.dy ?? 0 }) : r;
  };
  return shapes.map((s): Shape => {
    if ('clip' in s) return s;
    if ('glow' in s) return s;
    return { ...s, d: tf(s.d) };
  });
}
const shadow = (cx = 48, w = 27): Shape => ellipse(cx, 88.6, w, 3.8, '#1b1330', { alpha: 0.2 });
const sparkle = (x: number, y: number, r: number, fill = '#fff3b0'): Shape => cel(sparklePath(x, y, r, r * 0.62), fill, { sh: 0, hl: 0, ln: 1.4 });
/** A heart around (cx, cy), `w` units wide. */
function heartPath(cx: number, cy: number, w: number): string {
  const s = w / 34;
  const P = (x: number, y: number) => `${(cx + x * s).toFixed(2)} ${(cy + y * s).toFixed(2)}`;
  return `M${P(0, 15)}C${P(-11, 8)} ${P(-17, 2)} ${P(-17, -4)}C${P(-17, -9.4)} ${P(-13, -13)} ${P(-8.6, -13)}C${P(-5, -13)} ${P(-2, -11)} ${P(0, -7.6)}C${P(2, -11)} ${P(5, -13)} ${P(8.6, -13)}C${P(13, -13)} ${P(17, -9.4)} ${P(17, -4)}C${P(17, 2)} ${P(11, 8)} ${P(0, 15)}Z`;
}
/** A music note: a round head and a stem with a flag. */
function note(x: number, y: number, fill: string, s = 1): Shape[] {
  return [
    cel(xformPath(ellipsePath(0, 0, 4.4, 3.4), { deg: -20, dx: x, dy: y }), fill, { sh: 1.2, hl: 0.8, ln: 1.8 }),
    cel(xformPath(`M3.4 -1.6V${-15 * s}C${7 * s} ${-13 * s} ${9 * s} ${-10 * s} ${8 * s} ${-6 * s}C${7 * s} ${-9 * s} 5.6 ${-10 * s} 5.6 ${-10 * s}V-1Z`, { dx: x, dy: y }), fill, { sh: 0, hl: 0, ln: 1.6 }),
  ];
}
/** A puff of smoke or steam: three lobes. */
function puffPath(x: number, y: number, s: number): string {
  return `M${x - 7 * s} ${y + 3 * s}C${x - 12 * s} ${y + 3 * s} ${x - 12 * s} ${y - 5 * s} ${x - 6.4 * s} ${y - 4.6 * s}C${x - 5.6 * s} ${y - 10 * s} ${x + 2.4 * s} ${y - 11 * s} ${x + 4 * s} ${y - 5.6 * s}C${x + 9.6 * s} ${y - 7 * s} ${x + 12 * s} ${y + 1 * s} ${x + 7 * s} ${y + 3 * s}Z`;
}
/** A gloved hand: an open mitt pointing up from a wrist at the origin (fingers together, thumb out to +x). */
function mitt(): Shape[] {
  return [
    cel('M-7 0C-8.6 -8 -8.4 -17 -6.4 -22.4C-4.6 -27 3.6 -27.4 5.6 -22.6C7 -19 7.4 -12 7 -6L12.4 -11.6C14.6 -13.6 17.6 -11.4 16 -8.6L9.4 0.4C7.8 3.2 4.4 4.6 0.4 4.6H-2.4C-5 4.6 -6.6 2.6 -7 0Z', GLOVE, { sh: 2.6, hl: 1.4, ln: 2.6 }),
    crease('M-2.8 -21V-8M1.2 -21.6V-8', GLOVE, 1.3),
    cel('M-7.6 2.6H6.4L7 8.6H-8.2Z', '#d6cdb9', { sh: 1, hl: 0, ln: 2.2 }),
  ];
}

// ---------------------------------------------------------------------------------------------
// Pebble, the little stone pal of the general emotes
// ---------------------------------------------------------------------------------------------

const PEB = 'M48 25C64.6 25 75 40.6 75 58.4C75 75.4 63.6 85 48 85C32.4 85 21 75.4 21 58.4C21 40.6 31.4 25 48 25Z';
const STONE_LINE = ink(STONE);

/** Pebble's body: feet, the stone with its speckles, rosy cheeks. */
function pebble(o: { cheeks?: boolean } = {}): Shape[] {
  return [
    cel(ellipsePath(37.5, 84.4, 8.6, 4.4), STONE_FOOT, { sh: 1.4, hl: 0.8, ln: 2.4 }),
    cel(ellipsePath(58.5, 84.4, 8.6, 4.4), STONE_FOOT, { sh: 1.4, hl: 0.8, ln: 2.4 }),
    cel(PEB, STONE, { sh: 6.5, hl: 3, ln: 3 }),
    { d: ellipsePath(31, 46, 1.8, 1.4), fill: STONE_FOOT, alpha: 0.65, lo: true },
    { d: ellipsePath(64.6, 41.6, 1.4, 1.1), fill: STONE_FOOT, alpha: 0.65, lo: true },
    { d: ellipsePath(67, 66.4, 1.7, 1.3), fill: STONE_FOOT, alpha: 0.6, lo: true },
    { d: ellipsePath(28.6, 70.4, 1.3, 1), fill: STONE_FOOT, alpha: 0.6, lo: true },
    ...(o.cheeks === false ? [] : [ellipse(31.6, 64.4, 4.4, 2.6, BLUSH, { alpha: 0.42 }), ellipse(64.4, 64.4, 4.4, 2.6, BLUSH, { alpha: 0.42 })]),
  ];
}
const eyeOpen = (x: number, y = 52, look = 0, r = 1): Shape[] => [
  cel(ellipsePath(x, y, 6.2 * r, 7.4 * r), WHITE, { sh: 1.6, hl: 0, ln: 2.2 }),
  cel(ellipsePath(x + 0.8 + look, y + 1.2, 3.4 * r, 4.1 * r), PUPIL, { sh: 0, hl: 0, ln: 0 }),
  circle(x + 2 + look, y - 0.8, 1.3 * r, '#ffffff'),
];
const eyesOpen = (look = 0, y = 52, r = 1): Shape[] => [...eyeOpen(39, y, look, r), ...eyeOpen(57, y, look, r)];
const pebArm = (x1: number, y1: number, x2: number, y2: number): Shape => cel(stadiumPath(x1, y1, x2, y2, 7), STONE, { sh: 1.6, hl: 0.8, ln: 2.4 });

// ---------------------------------------------------------------------------------------------
// The emotes
// ---------------------------------------------------------------------------------------------

/** Stone: Pebble gets bonked by a club; dizzy eyes, a lump pops up, stars circle. */
function bonk(): EmoteArt {
  const club = [
    cel(stadiumPath(86, 56, 66, 28, 6.4), WOOD, { sh: 1.6, hl: 1, ln: 2.6 }),
    crease('M82 49L71 33', WOOD, 1.2),
    cel(ellipsePath(61.6, 21, 11.4, 9), '#9a96a0', { sh: 3, hl: 1.6, ln: 2.8 }),
    cel(stadiumPath(64.4, 27.4, 71.2, 31.6, 4.4), '#6e402a', { sh: 0, hl: 0, ln: 1.8 }),
    crease('M55 17.4L60.4 15.6M64 24L68.6 22.6', '#9a96a0', 1.2),
  ];
  const starAt = (x: number, y: number, r: number): Shape => cel(star(x, y, r, GOLD, { ri: r * 0.45 }).d, '#ffd447', { sh: 0, hl: 0, ln: 1.5 });
  return {
    layers: [
      { shapes: [shadow()] },
      {
        shapes: [
          ...pebble(),
          // dizzy spiral eyes
          stroke('M34.4 52a4.6 4.6 0 1 0 4.6 -4.6a3 3 0 1 1 -3 3a1.4 1.4 0 1 0 1.4 1.4', PUPIL, 1.8),
          stroke('M52.4 52a4.6 4.6 0 1 0 4.6 -4.6a3 3 0 1 1 -3 3a1.4 1.4 0 1 0 1.4 1.4', PUPIL, 1.8),
          stroke('M41 68.4q3.4 -2.6 7 0t7 0', STONE_LINE, 2.4),
        ],
        motion: 'squash',
        at: [48, 88],
        sub: [{ shapes: [cel(ellipsePath(50, 25.6, 7.4, 6.4), '#d09a86', { sh: 1.8, hl: 1.2, ln: 2.4 })], motion: 'popLate', at: [50, 30], behind: true }],
      },
      { shapes: club, motion: 'bonk', at: [88, 58] },
      { shapes: [starAt(28, 20, 5), starAt(70, 38, 4), starAt(42, 10, 3.4)], motion: 'orbit', at: [48, 24] },
    ],
  };
}

/** Stone: a baby mammoth raises its trunk and trumpets notes; its ear flaps. */
function mammothToot(): EmoteArt {
  const legs = [
    [24, 70],
    [34, 72],
    [48, 72],
    [58, 70],
  ].map(([x, y]) => cel(`M${x! - 4.6} ${y}V${y! + 12}Q${x! - 4.6} ${y! + 15} ${x! - 1} ${y! + 15}H${x! + 1}Q${x! + 4.6} ${y! + 15} ${x! + 4.6} ${y! + 12}V${y}Z`, FUR_DARK, { sh: 1.6, hl: 0, ln: 2.4 }));
  return {
    layers: [
      { shapes: [shadow(44, 30)] },
      {
        shapes: [
          ...legs,
          cel('M17 58C12 55 9 60 11 64', FUR_DARK, { sh: 0, hl: 0, ln: 2.4 }),
          cel(ellipsePath(42, 60, 25, 18), FUR, { sh: 5, hl: 2.6, ln: 3 }),
          crease('M24 54Q27 50 30 54M33 47Q36 43 39 47M44 46Q47 42 50 46', FUR, 1.4),
          cel(ellipsePath(63, 47, 15, 14), FUR, { sh: 3.6, hl: 2, ln: 3 }),
          stroke('M56 33.6Q58 28.6 60.4 33M60.6 33Q63 28 65.4 33', FUR_DARK, 2.2),
          cel(ribbonPath([[66, 56], [72, 62], [79, 60]], 3.6, 1.4, 'point'), IVORY, { sh: 0.8, hl: 0.6, ln: 1.8 }),
          ...eyeOpen(67, 43, 0.4, 0.62),
          ellipse(71, 52, 3, 1.8, BLUSH, { alpha: 0.4 }),
        ],
        motion: 'hop',
        at: [44, 88],
        sub: [
          { shapes: [cel(ellipsePath(56.6, 47, 7.6, 10.4), FUR_DARK, { sh: 2, hl: 1, ln: 2.4 }), crease('M55.4 41Q58.6 47 55.6 53', FUR_DARK, 1.2)], motion: 'flap', at: [58, 40] },
          {
            shapes: [cel(ribbonPath([[71, 52], [79, 46], [83, 34], [81, 23]], 7.4, 5.6), FUR, { sh: 1.6, hl: 1, ln: 2.6 }), cel(ellipsePath(81, 21.4, 5, 3.2), FUR_DARK, { sh: 0, hl: 0, ln: 2.2 }), crease('M76 47L80 44M80 39L84 37', FUR, 1.2)],
            motion: 'trumpet',
            at: [71, 52],
          },
        ],
      },
      { shapes: [...note(85, 14, PINK), ...note(72, 9, VIOLET, 0.8)], motion: 'float', at: [80, 12], delay: 0.15 },
    ],
  };
}

/** Bronze: a golden laurel wreath settles on a marble bust, which nods; a sparkle, a leaf drifts. */
function laurelCrown(): EmoteArt {
  const leaf = (x: number, y: number, deg: number): Shape => cel(xformPath(ellipsePath(0, 0, 5, 2.3), { deg, dx: x, dy: y }), GOLD, { mat: 'gold', sh: 1, hl: 0.6, ln: 1.6 });
  const left = [
    [30, 46, -70],
    [31.6, 39, -56],
    [35, 33, -40],
    [40, 28.4, -22],
    [46, 26, -6],
  ] as const;
  const wreath = [
    stroke('M31 50Q30 34 47 26M65 50Q66 34 49 26', '#a46b17', 2.2),
    ...left.map(([x, y, d]) => leaf(x, y, d)),
    ...left.map(([x, y, d]) => leaf(96 - x, y, -d)),
    cel(ellipsePath(48, 26.4, 3, 2.4), '#e2513f', { sh: 0, hl: 0.6, ln: 1.4 }),
  ];
  return {
    layers: [
      { shapes: [shadow(48, 24)] },
      { shapes: [cel('M24 80H72L74 88H22Z', '#c9c1ae', { sh: 1.6, hl: 1, ln: 2.6 })] },
      {
        shapes: [
          cel('M34 66Q48 75 62 66L66 80H30Z', MARBLE, { sh: 2.4, hl: 1.2, ln: 2.6 }),
          cel(ellipsePath(48, 49, 17, 19.4), MARBLE, { sh: 4.4, hl: 2.2, ln: 3 }),
          ...[34, 40.6, 48, 55.4, 62].map((x, i) => cel(ellipsePath(x, i === 2 ? 30 : i % 4 === 0 ? 37 : 32, 4.6, 4.2), MARBLE, { sh: 1.4, hl: 0.8, ln: 2 })),
          stroke('M38.6 48Q41.6 50 44.6 48M51.4 48Q54.4 50 57.4 48', ink(MARBLE), 1.8),
          stroke('M48 48.6Q51.4 54.6 47 56', ink(MARBLE), 1.6),
          stroke('M43.6 61Q48 63.6 52.4 61', ink(MARBLE), 1.8),
          crease('M38 72L40 78M56 72L54 78', MARBLE, 1.2),
        ],
        motion: 'nod',
        at: [48, 80],
        sub: [{ shapes: wreath, motion: 'drop', at: [48, 30] }],
      },
      { shapes: [sparkle(70, 22, 5.2)], motion: 'popLate', at: [70, 22] },
      { shapes: [leaf(18, 30, 20)], motion: 'floatLate', at: [18, 30], delay: 0.2 },
    ],
  };
}

/** Bronze: an amphora tips and pours wine into a cup that rises in a toast. */
function amphoraCheers(): EmoteArt {
  const amph = [
    cel('M27 22H41V28C41 30 49 31 51 40C53 52 49 66 41 72H27C19 66 15 52 17 40C19 31 27 30 27 28Z', TERRA, { sh: 4, hl: 2, ln: 2.8 }),
    cel('M25.4 18.4H42.6V22.6H25.4Z', TERRA, { sh: 1, hl: 0.6, ln: 2.4 }),
    cel('M28 72H40L42 78H26Z', TERRA, { sh: 1.2, hl: 0, ln: 2.4 }),
    stroke('M27 30C20 30 17 36 19.4 42M41 30C48 30 51 36 48.6 42', ink(TERRA), 3.4),
    stroke('M27 30C20 30 17 36 19.4 42M41 30C48 30 51 36 48.6 42', TERRA, 1.6),
    cel('M17.6 44H50.4L49.8 52H18.2Z', BLACKFIG, { sh: 0, hl: 0, ln: 0 }),
    stroke('M20 48H24L24 46H28L28 50H32L32 46H36L36 50H40L40 46H44L44 48H48', '#e8b896', 1.1),
  ];
  const cup = [
    cel('M54 61H84Q82 71.6 69 72.4Q56 71.6 54 61Z', TERRA, { sh: 2.6, hl: 1.2, ln: 2.6 }),
    cel('M54.6 61H83.4L82.8 63.6H55.2Z', BLACKFIG, { sh: 0, hl: 0, ln: 0 }),
    cel(stadiumPath(69, 72, 69, 79, 3.2), TERRA, { sh: 0, hl: 0, ln: 2 }),
    cel(ellipsePath(69, 80.6, 8, 2.4), TERRA, { sh: 0.8, hl: 0, ln: 2.2 }),
    stroke('M54 62.6C49.6 61.6 49 66 53 66.8M84 62.6C88.4 61.6 89 66 85 66.8', ink(TERRA), 1.8),
    cel(ellipsePath(69, 61.4, 12.4, 2), '#6b1f42', { sh: 0, hl: 0, ln: 0 }),
  ];
  const drop = (x: number, y: number) => cel(`M${x} ${y}C${x + 1.6} ${y + 3} ${x + 2.2} ${y + 5} ${x + 1.2} ${y + 7}C${x + 0.2} ${y + 9} ${x - 2.2} ${y + 8.4} ${x - 2} ${y + 6.2}C${x - 1.8} ${y + 4.4} ${x - 1} ${y + 2.6} ${x} ${y}Z`, WINE, { sh: 0, hl: 0.6, ln: 1.4 });
  return {
    layers: [
      { shapes: [shadow(52, 34)] },
      { shapes: place(amph, { deg: 38, cx: 34, cy: 78 }), motion: 'pour', at: [34, 78] },
      { shapes: [drop(63.4, 40), drop(66.6, 50)], motion: 'drip', at: [65, 48] },
      { shapes: cup, motion: 'toast', at: [69, 80] },
      { shapes: [sparkle(84, 48, 4.4)], motion: 'popLate', at: [84, 48] },
    ],
  };
}

/** Medieval: a tiny king bows deeply with a flourish of his arm; sparkles. */
function royalBow(): EmoteArt {
  const body = [
    cel('M30 86C30 70 34 56 46 54C58 56 62 70 62 86Z', WINE, { sh: 4, hl: 2, ln: 2.8 }),
    cel('M31.4 79H60.6L62 86H30Z', ERMINE, { sh: 1, hl: 0, ln: 2.2 }),
    ...[36, 44, 52, 58].map((x) => cel(ellipsePath(x, 82.6, 1, 1.4), '#2a2230', { sh: 0, hl: 0, ln: 0, lo: true })),
    cel('M38 56C38 52 54 52 54 56L52 62C48 64 44 64 40 62Z', ERMINE, { sh: 1.2, hl: 0, ln: 2 }),
    cel(ellipsePath(46, 44, 11.4, 11), SKIN, { sh: 2.6, hl: 1.4, ln: 2.6 }),
    stroke('M40.6 44Q43 46 45.4 44M48 44Q50.4 46 52.8 44', ink(SKIN), 1.6),
    cel('M38 49C40 53 52 53 54 49C53 56 39 56 38 49Z', '#f1ece2', { sh: 1, hl: 0, ln: 1.8 }),
    ellipse(41, 48, 2.4, 1.4, BLUSH, { alpha: 0.4 }),
    ellipse(51, 48, 2.4, 1.4, BLUSH, { alpha: 0.4 }),
    cel('M35.6 36L37.4 26L41.6 32L46 24L50.4 32L54.6 26L56.4 36Z', GOLD, { mat: 'gold', sh: 2, hl: 1, ln: 2.4 }),
    cel(ellipsePath(46, 30.6, 1.8), '#e2513f', { sh: 0, hl: 0.5, ln: 1.2 }),
  ];
  const arm = [cel(stadiumPath(52, 64, 70, 70, 7), WINE, { sh: 1.6, hl: 0.8, ln: 2.4 }), cel(ellipsePath(73, 71, 4.6, 4), GLOVE, { sh: 1, hl: 0.6, ln: 2 })];
  return {
    layers: [
      { shapes: [shadow(46, 22)] },
      {
        shapes: place(body, { deg: 18, cx: 46, cy: 86 }),
        motion: 'bow',
        at: [46, 86],
        sub: [{ shapes: place(arm, { deg: 18, cx: 46, cy: 86 }), motion: 'flourish', at: [58.5, 67] }],
      },
      { shapes: [sparkle(70, 26, 4.6), sparkle(22, 40, 3.2)], motion: 'popLate', at: [46, 34] },
    ],
  };
}

/** Medieval: a lute rocks as a glove strums it; notes rise, the strings ring. */
function luteStrum(): EmoteArt {
  const lute = [
    cel(stadiumPath(52, 58, 79, 24, 6.4), WOOD_DARK, { sh: 1.4, hl: 0.8, ln: 2.4 }),
    cel('M75.6 27.4L86 21L88.4 26.6L80 31.4Z', WOOD_DARK, { sh: 1, hl: 0, ln: 2.2 }),
    ...[0, 1, 2].map((i) => cel(ellipsePath(80 + i * 2.6, 22 - i * 1.4, 1.4), IVORY, { sh: 0, hl: 0, ln: 1.2 })),
    cel('M20 70C20 52 38 43 51 51C62 58 63 75 51 84C39 93 20 87 20 70Z', '#c98a4b', { sh: 4.6, hl: 2.4, ln: 3 }),
    cel(ellipsePath(38.6, 67, 6.2), '#5a3416', { sh: 0, hl: 0, ln: 1.8 }),
    stroke('M30.2 67a8.4 8.4 0 1 0 16.8 0a8.4 8.4 0 1 0 -16.8 0', '#e8c48a', 1.2, 0.85),
    cel('M28 78L36 82L35 84.6L27 80.6Z', WOOD_DARK, { sh: 0, hl: 0, ln: 1.6 }),
    stroke('M31 80L78.6 25.6M32.6 81.2L80 26.6M34.2 82.2L81.2 27.8', '#fff2c8', 0.8, 0.9),
    crease('M24 60Q30 52 40 50', '#c98a4b', 1.3),
  ];
  return {
    layers: [
      { shapes: [shadow(42, 26)] },
      {
        shapes: lute,
        motion: 'rock',
        at: [40, 84],
        sub: [{ shapes: place(mitt(), { deg: -128, dx: 52, dy: 56 }), motion: 'strum', at: [52, 56] }],
      },
      { shapes: [...note(70, 50, VIOLET), ...note(84, 62, PINK, 0.8)], motion: 'float', at: [76, 54], delay: 0.1 },
      { shapes: [stroke('M60 40Q63 37 66 40', '#fff2c8', 1.6), stroke('M58 34Q62 30 66 34', '#fff2c8', 1.4, 0.7)], motion: 'ring', at: [62, 38] },
    ],
  };
}

/** Gunpowder: a glove tips a tricorne with a plume; the plume follows through. */
function hatTip(): EmoteArt {
  const hat = [
    cel('M16 54C28 40 68 40 80 54C71 58.6 61 51.4 48 53.4C35 51.4 25 58.6 16 54Z', HAT, { sh: 2.2, hl: 1.2, ln: 2.8 }),
    cel('M28.6 48C32 30 64 30 67.4 48C58 45.4 38 45.4 28.6 48Z', HAT, { sh: 3.2, hl: 1.6, ln: 2.8 }),
    stroke('M17.4 53.6C29 42 67 42 78.6 53.6', GOLD, 1.8),
    cel(ellipsePath(48, 43.6, 4.6), WINE, { sh: 1, hl: 0.6, ln: 1.8 }),
    cel(ellipsePath(48, 43.6, 1.8), GOLD, { sh: 0, hl: 0, ln: 1 }),
    ...place(mitt(), { deg: 16, dx: 62, dy: 70 }),
  ];
  const plume = [cel(ribbonPath([[42, 40], [34, 30], [25, 25], [16, 27]], 8, 2.4, 'point'), '#f7f1e6', { sh: 2, hl: 1, ln: 2.2 }), crease('M38 36L36 31M33 33L29.6 29M28 30L24 27.4', '#f7f1e6', 1.1)];
  return {
    layers: [
      { shapes: [shadow(48, 22)] },
      { shapes: hat, motion: 'tip', at: [62, 76], sub: [{ shapes: plume, motion: 'sway', at: [42, 40], behind: true }] },
      { shapes: [sparkle(82, 30, 4.6)], motion: 'popLate', at: [82, 30] },
    ],
  };
}

/** Gunpowder: a cannon recoils on its carriage and bursts confetti; smoke puffs from the muzzle. */
function cannonConfetti(): EmoteArt {
  const barrel = [
    cel(ribbonPath([[22, 74], [44, 58], [66, 42]], 17, 12), '#b8863b', { mat: 'bronze', sh: 3.6, hl: 2, ln: 2.8 }),
    cel(xformPath(ellipsePath(0, 0, 3.4, 6.6), { deg: -36, dx: 66.6, dy: 41.6 }), '#3a2a24', { sh: 0, hl: 0, ln: 1.8 }),
    stroke('M33.4 59.8L40 70.6M52 47L57.4 55.4', ink('#b8863b'), 2),
    cel(ellipsePath(19, 76.6, 4, 4), '#b8863b', { mat: 'bronze', sh: 1, hl: 0.6, ln: 2 }),
  ];
  const carriage = [
    cel('M12 72H48L52 82H10Z', WOOD, { sh: 2.2, hl: 1.2, ln: 2.6 }),
    crease('M16 77H46', WOOD, 1.2),
    cel(ellipsePath(30, 80, 11.6), WOOD_DARK, { sh: 2.4, hl: 1.2, ln: 2.6 }),
    stroke('M22 80a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', IRON, 2.4),
    stroke('M30 70.4V89.6M20.4 80H39.6M23.2 73.2L36.8 86.8M36.8 73.2L23.2 86.8', '#5a3a22', 1.6),
    cel(ellipsePath(30, 80, 2.6), IRON, { sh: 0, hl: 0, ln: 1.4 }),
  ];
  const bits = [
    [72, 24, 20],
    [80, 30, -30],
    [86, 18, 60],
    [76, 12, -10],
    [64, 18, 40],
    [90, 34, 10],
    [84, 8, -45],
    [68, 30, 75],
  ] as const;
  const confetti: Shape[] = bits.map(([x, y, d], i) => cel(xformPath('M-2.6 -1.6H2.6V1.6H-2.6Z', { deg: d, dx: x, dy: y }), CONFETTI[i % CONFETTI.length]!, { sh: 0, hl: 0, ln: 1 }));
  confetti.push(stroke('M70 36Q74 30 78 34T86 30', '#ffd447', 1.8), stroke('M62 26Q60 18 66 16T70 8', PINK, 1.8));
  return {
    layers: [
      { shapes: [shadow(34, 28)] },
      { shapes: carriage, motion: 'slide', at: [30, 82], sub: [{ shapes: barrel, motion: 'recoil', at: [34, 70], behind: true }] },
      { shapes: [cel(puffPath(72, 36, 0.9), '#eceae6', { sh: 1.6, hl: 1, ln: 2 })], motion: 'puff', at: [70, 38] },
      { shapes: confetti, motion: 'burst', at: [68, 38] },
    ],
  };
}

/** Industrial: a brass steam whistle toots as its lever pulls; steam rises, sound lines ring. */
function steamWhistle(): EmoteArt {
  const whistle = [
    cel('M42 64H54V86H42Z', IRON, { sh: 1.6, hl: 1, ln: 2.6 }),
    cel('M36 64H60L58 70H38Z', IRON, { sh: 1, hl: 0.6, ln: 2.4 }),
    cel('M36 30H60V60Q48 66 36 60Z', BRASS, { mat: 'gold', sh: 3.6, hl: 2, ln: 2.8 }),
    cel(ellipsePath(48, 30, 12, 4), BRASS, { mat: 'gold', sh: 0.8, hl: 0.8, ln: 2.4 }),
    cel(ellipsePath(48, 25.6, 4, 3), BRASS, { mat: 'gold', sh: 0.6, hl: 0.6, ln: 2 }),
    cel('M38.6 52H57.4V56H38.6Z', '#3a2a24', { sh: 0, hl: 0, ln: 1.6 }),
    stroke('M36.6 40H59.4M36.6 46H59.4', ink(BRASS), 1.4),
  ];
  const lever = [cel(stadiumPath(58, 66, 80, 58, 4.4), IRON, { sh: 0.8, hl: 0.6, ln: 2.2 }), cel(ellipsePath(81, 57.4, 4.6), '#a8473c', { sh: 1, hl: 0.8, ln: 2 })];
  return {
    layers: [
      { shapes: [shadow(48, 18)] },
      { shapes: whistle, motion: 'toot', at: [48, 86], sub: [{ shapes: lever, motion: 'pull', at: [58, 66] }] },
      { shapes: [cel(puffPath(46, 16, 1), '#f2f2ee', { sh: 1.8, hl: 1, ln: 2 }), cel(puffPath(64, 9, 0.7), '#f2f2ee', { sh: 1.2, hl: 0.8, ln: 1.8 })], motion: 'float', at: [52, 16] },
      { shapes: [stroke('M28 32Q24 40 28 48M22 28Q16 40 22 52', '#fff2c8', 1.8), stroke('M68 32Q72 40 68 48M74 28Q80 40 74 52', '#fff2c8', 1.8)], motion: 'ring', at: [48, 40] },
    ],
  };
}

/** Industrial: a steel gear turns around a beating heart; a brass gear turns the other way. */
function gearHeart(): EmoteArt {
  const bolts = [0, 1, 2, 3, 4, 5].map((i) => cel(ellipsePath(44 + Math.cos((i * Math.PI) / 3) * 21.6, 48 + Math.sin((i * Math.PI) / 3) * 21.6, 1.5), '#e9ecf0', { sh: 0, hl: 0, ln: 1, lo: true }));
  return {
    layers: [
      { shapes: [shadow(52, 30)] },
      { shapes: [cel(gearPath(76, 74, 13, 10, 8), BRASS, { mat: 'gold', sh: 2, hl: 1, ln: 2.4 }), cel(ellipsePath(76, 74, 3.4), '#6b4a2a', { sh: 0, hl: 0, ln: 1.6 })], motion: 'spinBack', at: [76, 74] },
      { shapes: [cel(gearPath(44, 48, 31, 25, 10), STEEL, { mat: 'metal', sh: 4, hl: 2, ln: 3 }), cel(ellipsePath(44, 48, 19), '#8a93a5', { sh: 1.6, hl: 0, ln: 2.4 }), ...bolts], motion: 'spin', at: [44, 48] },
      { shapes: [cel(heartPath(44, 49, 26), RED, { sh: 3, hl: 1.6, ln: 2.6 })], motion: 'beat', at: [44, 49] },
      { shapes: [sparkle(76, 26, 4.6)], motion: 'popLate', at: [76, 26] },
    ],
  };
}

/** Modern: a field radio bobs as it calls in; its antenna wobbles, a light blinks, signal arcs ring. */
function radioRoger(): EmoteArt {
  const radio = [
    stroke('M22 50C10 54 10 70 18 76', ink(OLIVE), 2),
    cel('M12 72C10 70 12 66 16 66C20 66 22 70 20 76C19 80 13 80 12 76Z', '#3a3f45', { sh: 1.2, hl: 0.6, ln: 2 }),
    cel('M22 40H70Q74 40 74 44V80Q74 84 70 84H22Q18 84 18 80V44Q18 40 22 40Z', OLIVE, { sh: 4, hl: 2, ln: 3 }),
    cel('M24 46H50V78H24Z', '#55603a', { sh: 1.2, hl: 0, ln: 2 }),
    ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => cel(ellipsePath(28.6 + c * 5.6, 51.4 + r * 6.4, 1.3), '#2d331f', { sh: 0, hl: 0, ln: 0, lo: true }))),
    cel(ellipsePath(62, 56, 6.4), '#e9e2c8', { sh: 1.2, hl: 0.6, ln: 2.2 }),
    stroke('M62 56L65.4 52.4', '#a8473c', 1.6),
    cel(ellipsePath(58, 72, 3.6), '#3a3f45', { sh: 0.6, hl: 0.6, ln: 1.8 }),
    cel(ellipsePath(67, 72, 3.6), '#3a3f45', { sh: 0.6, hl: 0.6, ln: 1.8 }),
  ];
  return {
    layers: [
      { shapes: [shadow(46, 30)] },
      {
        shapes: radio,
        motion: 'hop',
        at: [46, 88],
        sub: [
          { shapes: [cel(stadiumPath(66, 42, 76, 10, 2.6), '#4a4f55', { sh: 0.8, hl: 0, ln: 1.6 }), cel(ellipsePath(76.4, 9, 2.8), '#a8473c', { sh: 0.6, hl: 0.6, ln: 1.6 })], motion: 'wobble', at: [66, 42], behind: true },
          { shapes: [glow(62, 46, 5, '#9ef07a', 0.6), cel(ellipsePath(62, 46, 2), '#9ef07a', { sh: 0, hl: 0, ln: 1.2 })], motion: 'blink', at: [62, 46] },
        ],
      },
      { shapes: [stroke('M83 4A9 9 0 0 1 84 16M88 0A15 15 0 0 1 89.6 20', '#b8f28a', 2), stroke('M70 4A9 9 0 0 0 69 16', '#b8f28a', 2)], motion: 'ring', at: [77, 10] },
    ],
  };
}

/** Modern: a medal on its ribbon swings and shines. */
function medalShine(): EmoteArt {
  const medal = [
    cel('M34 4H46L52 40H44Z', WINE, { sh: 1.6, hl: 0.8, ln: 2.2 }),
    cel('M62 4H50L44 40H52Z', '#e8dfc8', { sh: 1.6, hl: 0.8, ln: 2.2 }),
    stroke('M38.6 4.6L46.6 38M57.4 4.6L49.4 38', GOLD, 1.4),
    cel(ellipsePath(48, 42, 4.6, 3.4), GOLD, { mat: 'gold', sh: 0.8, hl: 0.6, ln: 2 }),
    cel(ellipsePath(48, 62, 18.4), GOLD, { mat: 'gold', sh: 4.4, hl: 2.4, ln: 3 }),
    cel(ellipsePath(48, 62, 13.4), '#e2a12e', { mat: 'gold', sh: 1.6, hl: 0, ln: 1.6 }),
    cel(star(48, 62, 9.6, GOLD, { ri: 4.2 }).d, '#fff1b8', { sh: 1.4, hl: 0, ln: 1.6 }),
  ];
  return {
    layers: [
      { shapes: [shadow(48, 18)] },
      { shapes: medal, motion: 'swing', at: [48, 4], sub: [{ shapes: [sparkle(38, 52, 4.6, '#ffffff')], motion: 'glint', at: [38, 52] }] },
      { shapes: [sparkle(74, 46, 4), sparkle(22, 70, 3.2)], motion: 'popLate', at: [48, 58] },
    ],
  };
}

/** Future: a robot strikes three dance poses; its antenna light blinks, a note floats. */
function roboDance(): EmoteArt {
  const robo = [
    cel('M38 70H45V82Q45 84 43 84H40Q38 84 38 82Z', '#8a93a5', { mat: 'metal', sh: 1.4, hl: 0.6, ln: 2.2 }),
    cel('M51 70H58V82Q58 84 56 84H53Q51 84 51 82Z', '#8a93a5', { mat: 'metal', sh: 1.4, hl: 0.6, ln: 2.2 }),
    cel('M36 82H47V87H36ZM49 82H60V87H49Z', '#5b6168', { sh: 0.8, hl: 0, ln: 2 }),
    cel('M36 46H60Q64 46 64 50V68Q64 72 60 72H36Q32 72 32 68V50Q32 46 36 46Z', STEEL, { mat: 'metal', sh: 3.6, hl: 1.8, ln: 2.8 }),
    cel(ellipsePath(48, 58, 5), MINT, { sh: 0, hl: 0.8, ln: 1.8 }),
    stroke('M48 18V10', '#5b6168', 2.2),
    cel('M34 18H62Q68 18 68 24V38Q68 44 62 44H34Q28 44 28 38V24Q28 18 34 18Z', STEEL, { mat: 'metal', sh: 3.6, hl: 2, ln: 2.8 }),
    cel('M33 25H63V35Q63 38 60 38H36Q33 38 33 35Z', '#23262e', { sh: 0, hl: 0, ln: 2 }),
    cel('M37 29H44V33H37ZM52 29H59V33H52Z', MINT, { sh: 0, hl: 0, ln: 0 }),
  ];
  const armL = [cel(stadiumPath(32, 52, 18, 38, 6.4), '#8a93a5', { mat: 'metal', sh: 1.2, hl: 0.8, ln: 2.2 }), cel(ellipsePath(16.4, 36.4, 4.4), STEEL, { mat: 'metal', sh: 1, hl: 0.6, ln: 2 })];
  const armR = [cel(stadiumPath(64, 52, 78, 62, 6.4), '#8a93a5', { mat: 'metal', sh: 1.2, hl: 0.8, ln: 2.2 }), cel(ellipsePath(80, 63.4, 4.4), STEEL, { mat: 'metal', sh: 1, hl: 0.6, ln: 2 })];
  return {
    layers: [
      { shapes: [shadow(48, 20)] },
      {
        shapes: robo,
        motion: 'danceBody',
        at: [48, 86],
        sub: [
          { shapes: armL, motion: 'danceArmL', at: [32, 52], behind: true },
          { shapes: armR, motion: 'danceArmR', at: [64, 52], behind: true },
          { shapes: [glow(48, 9, 6, PINK, 0.5), cel(ellipsePath(48, 9, 3), PINK, { sh: 0, hl: 0.6, ln: 1.6 })], motion: 'blink', at: [48, 9] },
        ],
      },
      { shapes: [...note(82, 22, MINT, 0.8)], motion: 'float', at: [82, 20] },
    ],
  };
}

/** Future: a holographic hand waves over its projector; the beam and the scan lines flicker, the base pulses. */
function holoWave(): EmoteArt {
  const hand = cel(
    'M38 70V52L33 45C31 42 35 38.4 38 41L41 44V24C41 20.4 46 20.4 46 24V40V20C46 16.4 51 16.4 51 20V40V22C51 18.4 56 18.4 56 22V42V28C56 24.4 61 24.4 61 28V54C61 63 56 70 49 70Z',
    MINT,
    { sh: 3, hl: 1.6, ln: 2.4 },
  );
  return {
    layers: [
      { shapes: [shadow(48, 20)] },
      { shapes: [cel('M36 84H60L58 78H38Z', '#3a3f45', { sh: 1, hl: 0.6, ln: 2.2 }), cel(ellipsePath(48, 78, 10, 2.6), '#5b6168', { sh: 0, hl: 0, ln: 2 })] },
      { shapes: [{ d: 'M40 77L30 30H66L56 77Z', fill: MINT, alpha: 0.16 }], motion: 'flicker', at: [48, 54] },
      {
        shapes: [hand],
        motion: 'wave',
        at: [48, 70],
        sub: [{ shapes: [stroke('M39.4 58H59.6M39.6 63H58.4M41.4 34H45.6M46.4 30H50.6', '#ffffff', 0.9, 0.55)], motion: 'flicker', at: [48, 50], delay: 0.3 }],
      },
      { shapes: [glow(48, 78, 13, MINT, 0.7)], motion: 'pulse', at: [48, 78] },
    ],
  };
}

/** Cosmic, Legendary: a nova bursts; layered rays turn, the core beats, a sparkle ring spreads, a soft white aura. */
function supernova(): EmoteArt {
  return {
    layers: [
      { shapes: [glow(48, 48, 48, '#ffffff', 0.85), glow(48, 48, 34, LILAC, 0.6)], motion: 'aura', at: [48, 48] },
      { shapes: [cel(star(48, 48, 44, VIOLET, { n: 12, ri: 21 }).d, '#b86bff', { sh: 3, hl: 0, ln: 2.4 })], motion: 'raysSpin', at: [48, 48] },
      { shapes: [cel(star(48, 48, 30, GOLD, { n: 8, ri: 14, rotDeg: 22.5 }).d, '#ffe066', { mat: 'gold', sh: 2.4, hl: 0, ln: 2.2 })], motion: 'raysBack', at: [48, 48] },
      { shapes: [cel(ellipsePath(48, 48, 12), '#fffbe6', { sh: 2, hl: 1.4, ln: 2 }), circle(44.6, 44.6, 3, '#ffffff')], motion: 'beat', at: [48, 48] },
      { shapes: [stroke('M26 48a22 22 0 1 0 44 0a22 22 0 1 0 -44 0', '#ffffff', 1.6, 0.8)], motion: 'ring', at: [48, 48] },
      { shapes: [sparkle(80, 18, 5.4, '#ffffff'), sparkle(14, 74, 4.4, '#ffffff'), sparkle(84, 78, 3.4)], motion: 'popLate', at: [48, 48] },
    ],
  };
}

/** Cosmic: a heart beats while a little moon circles it on a tilted ring. */
function orbitHeart(): EmoteArt {
  const tilt = (d: string): string => rot(d, -14, 48, 50);
  return {
    layers: [
      { shapes: [shadow(48, 22)] },
      { shapes: [stroke(tilt('M10 50a38 12 0 1 1 76 0'), LILAC, 2.2)] },
      { shapes: [cel(heartPath(48, 50, 40), '#ff5f7a', { sh: 4, hl: 2.2, ln: 3 })], motion: 'beat', at: [48, 50] },
      { shapes: [stroke(tilt('M86 50a38 12 0 0 1 -76 0'), LILAC, 2.2)] },
      { shapes: [cel(ellipsePath(82.6, 49.4, 5.4), '#9ae0d0', { sh: 1.6, hl: 1, ln: 2 }), crease('M80 47.4Q82 46 84 47.6', '#9ae0d0', 1)], motion: 'orbitMoon', at: [82.6, 49.4] },
      { shapes: [sparkle(18, 20, 4.4), sparkle(78, 16, 3.4)], motion: 'popLate', at: [48, 20] },
    ],
  };
}

/** General: two big gloves clap twice; impact lines pop. */
function clap(): EmoteArt {
  // a glove at 1.5x, its cuff in a warm red so the pair reads on any plate
  const glove = (mirror: boolean, deg: number, dx: number, dy: number): Shape[] =>
    mitt().map((sh, i): Shape => {
      if (!('d' in sh)) return sh;
      const d = xformPath(sh.d, { s: 1.5, mirror, deg, dx, dy });
      return i === 2 && 'cel' in sh ? { ...sh, d, cel: '#c8504a' } : { ...sh, d };
    });
  return {
    layers: [
      { shapes: [shadow(48, 26)] },
      // the wrists apart, each glove leaning in so the fingertips meet over the middle (the key pose)
      { shapes: glove(false, 30, 30, 80), motion: 'clapL', at: [30, 83] },
      { shapes: glove(true, -30, 66, 80), motion: 'clapR', at: [66, 83] },
      { shapes: [stroke('M48 26V14M35 30L29 22M61 30L67 22', '#ffb347', 2.8), sparkle(76, 40, 3.8), sparkle(20, 42, 3.2)], motion: 'pop', at: [48, 30] },
    ],
  };
}

/** General: a big heart beats; little hearts float up. */
function heart(): EmoteArt {
  return {
    layers: [
      { shapes: [shadow(48, 22)] },
      { shapes: [cel(heartPath(48, 52, 62), '#ff4d6d', { sh: 6, hl: 3, ln: 3 })], motion: 'beat', at: [48, 52] },
      { shapes: [cel(heartPath(80, 22, 14), PINK, { sh: 1.4, hl: 0.8, ln: 1.8 })], motion: 'float', at: [80, 22] },
      { shapes: [cel(heartPath(16, 30, 11), PINK, { sh: 1.2, hl: 0.6, ln: 1.6 })], motion: 'floatLate', at: [16, 30] },
      { shapes: [sparkle(74, 74, 4)], motion: 'popLate', at: [74, 74] },
    ],
  };
}

/** General: Pebble jumps back in surprise: big bright eyes, an O mouth, hands up; burst lines. */
function wow(): EmoteArt {
  return {
    layers: [
      { shapes: [shadow()] },
      {
        shapes: [...pebble(), pebArm(24, 60, 13, 46), pebArm(72, 60, 83, 46), cel(ellipsePath(48, 68.4, 4.6, 5.8), MOUTH, { sh: 1.4, hl: 0, ln: 2.2 })],
        motion: 'jolt',
        at: [48, 88],
        sub: [{ shapes: [...eyesOpen(0, 51, 1.15), sparkle(41.6, 49, 1.6, '#ffffff'), sparkle(59.6, 49, 1.6, '#ffffff')], motion: 'eyesPop', at: [48, 51] }],
      },
      { shapes: [stroke('M14 24L20 30M48 8V16M82 24L76 30', '#ffb347', 2.6), stroke('M6 44H13M83 44H90', '#ffb347', 2.2)], motion: 'pop', at: [48, 30] },
    ],
  };
}

/** General: Pebble ponders, tapping its chin; a thought cloud with a turning gear. */
function thinking(): EmoteArt {
  return {
    layers: [
      { shapes: [shadow()] },
      {
        shapes: [...pebble(), ...eyeOpen(39, 50, -1.6), ...eyeOpen(57, 50, -1.6), stroke('M33 41Q37 38 42 40M52 38Q57 36 62 39', STONE_LINE, 2.2), stroke('M42 68H52', STONE_LINE, 2.4)],
        motion: 'ponder',
        at: [48, 86],
        sub: [{ shapes: [pebArm(64, 76, 55, 71), cel(ellipsePath(52, 70, 4.6, 4), STONE, { sh: 1, hl: 0.6, ln: 2 })], motion: 'tap', at: [66, 78] }],
      },
      { shapes: [cel(ellipsePath(70, 30, 2.4), '#f4f6f8', { sh: 0, hl: 0, ln: 1.4 }), cel(ellipsePath(75, 22, 3.4), '#f4f6f8', { sh: 0.6, hl: 0, ln: 1.6 })], motion: 'pop', at: [72, 26] },
      {
        shapes: [cel('M70 14C68 8 74 4 79 6C81 2 89 2 90 7C95 7 96 14 92 16C93 21 86 23 83 20C80 23 72 22 72 18C68 18 67 14 70 14Z', '#f4f6f8', { sh: 1.6, hl: 1, ln: 2 })],
        motion: 'popLate',
        at: [81, 13],
        sub: [{ shapes: [cel(gearPath(81, 13, 5, 3.6, 7), IRON, { mat: 'metal', sh: 0.8, hl: 0, ln: 1.4 })], motion: 'spin', at: [81, 13] }],
      },
    ],
  };
}

/** General: Pebble sleeps in a nightcap, breathing slowly; Zs drift up, a bubble grows and pops. */
function sleepy(): EmoteArt {
  const z = (x: number, y: number, k: number): Shape => stroke(`M${x} ${y}h${4 * k}l${-4 * k} ${4.6 * k}h${4 * k}`, VIOLET, 2.2);
  return {
    layers: [
      { shapes: [shadow()] },
      {
        shapes: [
          ...pebble(),
          stroke('M33 53Q38 56.4 43 53M53 53Q58 56.4 63 53', STONE_LINE, 2.4),
          cel(ellipsePath(48, 67, 3, 2), MOUTH, { sh: 0, hl: 0, ln: 1.8 }),
          cel('M28 38C32 22 58 16 74 28C70 30 66 32 64 36C56 30 40 32 28 38Z', '#6a5ab0', { sh: 2.4, hl: 1.2, ln: 2.6 }),
          cel('M27 39C38 33 58 31 66 37L64 41C56 36 40 37 29 42Z', ERMINE, { sh: 1, hl: 0, ln: 2 }),
        ],
        motion: 'breathe',
        at: [48, 88],
        sub: [
          { shapes: [cel(ellipsePath(78.6, 31, 4.8), ERMINE, { sh: 1.4, hl: 1, ln: 2 })], motion: 'sway', at: [72, 29] },
          { shapes: [cel(ellipsePath(57, 63, 4.4), '#cfe8f6', { sh: 0, hl: 1, ln: 1.6 })], motion: 'inflate', at: [54, 64] },
        ],
      },
      { shapes: [z(70, 12, 1.2), z(80, 4, 0.8)], motion: 'float', at: [76, 10] },
    ],
  };
}

/** General: Pebble parties in a hat; the blower unrolls, confetti flies. */
function party(): EmoteArt {
  const confetti = [
    [16, 24, 20],
    [24, 10, -40],
    [70, 8, 30],
    [84, 20, -20],
    [10, 40, 60],
    [88, 40, 10],
  ].map(([x, y, d], i) => cel(xformPath('M-2.6 -1.6H2.6V1.6H-2.6Z', { deg: d!, dx: x!, dy: y! }), CONFETTI[i % CONFETTI.length]!, { sh: 0, hl: 0, ln: 1 }));
  return {
    layers: [
      { shapes: [shadow()] },
      {
        shapes: [...pebble(), ...eyeOpen(39, 53, 0.4, 0.9), stroke('M53 53Q57 49.6 61 53', STONE_LINE, 2.4), cel('M41 64Q48 72 55 64Q48 66 41 64Z', MOUTH, { sh: 0, hl: 0, ln: 2 })],
        motion: 'hop',
        at: [48, 88],
        sub: [
          { shapes: [cel('M34 28L48 4L60 28Q47 32 34 28Z', '#ff6fa8', { sh: 2.6, hl: 1.4, ln: 2.6 }), stroke('M40 18L52 22M44 10L54 14', '#ffd447', 2), cel(ellipsePath(48, 4, 3.6), '#ffd447', { sh: 0.8, hl: 0.6, ln: 1.8 })], motion: 'wobble', at: [47, 28] },
          { shapes: [cel('M54 66H76Q80 66 80 70Q80 74 76 74H54Z', MINT, { sh: 1.6, hl: 0.8, ln: 2 }), stroke('M60 66V74M67 66V74', '#2a9a86', 1.2)], motion: 'blow', at: [54, 70] },
        ],
      },
      { shapes: confetti, motion: 'burst', at: [48, 30] },
    ],
  };
}

/** General: shades drop onto Pebble's eyes; a cool lean back, a glint on the lens. */
function coolShades(): EmoteArt {
  const shades = [
    cel('M28 46H45Q47 46 46.6 48.6L45.4 56Q44.6 60 40.6 60H33.4Q29.4 60 28.6 56L27.4 48.6Q27 46 28 46Z', '#23262e', { sh: 0, hl: 2, ln: 2.4 }),
    cel('M51 46H68Q69 46 68.6 48.6L67.4 56Q66.6 60 62.6 60H55.4Q51.4 60 50.6 56L49.4 48.6Q49 46 51 46Z', '#23262e', { sh: 0, hl: 2, ln: 2.4 }),
    stroke('M45 48.6H51M27.6 48L22 46M68.4 48L74 46', '#23262e', 2.4),
  ];
  return {
    layers: [
      { shapes: [shadow()] },
      {
        shapes: [...pebble(), ...eyesOpen(0, 52), cel('M40 65Q48 70 58 62Q48 66.4 40 65Z', MOUTH, { sh: 0, hl: 0, ln: 2 })],
        motion: 'lean',
        at: [48, 88],
        sub: [{ shapes: shades, motion: 'dropIn', at: [48, 53], sub: [{ shapes: [sparkle(34, 49, 3.6, '#ffffff')], motion: 'glint', at: [34, 49] }] }],
      },
      { shapes: [sparkle(82, 30, 4.4)], motion: 'popLate', at: [82, 30] },
    ],
  };
}

/** General: oops: Pebble grins sheepishly, scratching its head; a sweat drop slides. */
function oops(): EmoteArt {
  return {
    layers: [
      { shapes: [shadow()] },
      {
        shapes: [
          ...pebble(),
          stroke('M34 52L42 55L34 58M62 52L54 55L62 58', STONE_LINE, 2.4),
          cel('M40 64H56Q55 70 48 70.4Q41 70 40 64Z', '#ffffff', { sh: 1, hl: 0, ln: 2 }),
          stroke('M44 64V68.4M48 64V70M52 64V68.4', ink('#ffffff'), 0.9, 0.5),
        ],
        motion: 'tremble',
        at: [48, 88],
        sub: [
          { shapes: [pebArm(70, 62, 66, 38), cel(ellipsePath(64.6, 35.4, 4.6, 4.2), STONE, { sh: 1, hl: 0.6, ln: 2 })], motion: 'scratch', at: [70, 62] },
          { shapes: [cel('M30 30C32 34 33.4 36.6 33.4 38.4A3.4 3.4 0 0 1 26.6 38.4C26.6 36.6 28 34 30 30Z', '#7fc8f0', { mat: 'gloss', sh: 0, hl: 0.8, ln: 1.8 })], motion: 'sweat', at: [30, 36] },
        ],
      },
      { shapes: [stroke('M76 18L80 12M82 24L88 22M74 28L78 30', '#ffb347', 2)], motion: 'pop', at: [80, 22] },
    ],
  };
}

export const EMOTES: Readonly<Record<string, EmoteArt>> = {
  // Stone
  bonk: bonk(),
  mammoth_toot: mammothToot(),
  // Bronze
  laurel_crown: laurelCrown(),
  amphora_cheers: amphoraCheers(),
  // Medieval
  royal_bow: royalBow(),
  lute_strum: luteStrum(),
  // Gunpowder
  hat_tip: hatTip(),
  cannon_confetti: cannonConfetti(),
  // Industrial
  steam_whistle: steamWhistle(),
  gear_heart: gearHeart(),
  // Modern
  radio_roger: radioRoger(),
  medal_shine: medalShine(),
  // Future
  robo_dance: roboDance(),
  holo_wave: holoWave(),
  // Cosmic
  supernova: supernova(),
  orbit_heart: orbitHeart(),
  // General
  clap: clap(),
  heart: heart(),
  wow: wow(),
  thinking: thinking(),
  sleepy: sleepy(),
  party: party(),
  cool_shades: coolShades(),
  oops: oops(),
};
