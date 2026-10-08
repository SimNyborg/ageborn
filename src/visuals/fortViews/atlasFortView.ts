/**
 * The fort view (DESIGN A16.14.8, B5): walls, field towers, camps and traps drawn from their realistic
 * sheets (`public/art/forts/<age>/<slug>(.hd).json`, made by `art/blender/styles/realistic/forts/`).
 *
 * Sheet clips: `body` (one frame per crumble stage 0-3), `front` (towers: the parapet drawn over the
 * crew), `scaffold`, `rubble`, `flag` (a looping banner), `door` (camps: closed, half, open) and `trap`
 * (unarmed, armed, sprung, spent). Every clip shares one canvas and feet anchor, so the layers line up.
 *
 * Code motion on top (A12; the sim owns every timing, so none of this can change balance):
 * - placing: the scaffold drops in with a thud, a dust ring and a squash;
 * - the scaffold: the body is revealed from the ground up behind the scaffold as `scaffoldBp` runs, with
 *   dust puffs and knocks;
 * - completion (`build`): the scaffold falls away, the body pops with squash and stretch, the flag unfurls;
 * - idle: the flag waves, fire and lamps flicker, smoke rises, the tower crew breathes;
 * - tower shots: a 200 ms wind-up read from `nextAttackInMs` (the crew's own attack clip is warped so
 *   its release lands on the shot), then recoil; crewless towers charge a glow and flash;
 * - hits: a local shake, a white flash and chips of the fort's material; crumble stages swap the body
 *   frame with a debris burst; decay draws cracks and sheds flakes;
 * - camps: the door opens with a puff for every levy (`spawn`);
 * - traps: armed / sprung / spent frames, a snap pop and charge pips;
 * - collapse: the body sinks and tilts into its rubble with debris, dust billows and a falling flag.
 * Reduce motion (`setMotion`) keeps the fades and drops the shake, squash and flying debris.
 *
 * Until its sheet arrives (or where none is installed) the view draws a code stand-in of the same size.
 */
import { ColorMatrixFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { FortPose, FortView, VisualDef } from '@/contracts/art';
import type { AgeId, Pt, Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import type { PartBaker } from '../bake';
import { FX_ZONES } from '../effects/sprites';
import type { AtlasData } from '../adapters/atlas';
import { partSprite, PuffList } from '../adapters/procedural/shared';
import { clipDurations, frameIndex, setFrame, type WorldAtlas, type WorldSheet } from '../adapters/worldAtlas';
import { Bits, clamp01, DEFAULT_MOTION, easeInQuad, easeOutCubic, springSettle, texRect, type Rect, type ViewMotion } from '../adapters/world/upgradeFx';
import type { FortKindId } from '../forts';
import { FORT_DRESS, fortSlugOf, shadeColor, type FortDress } from './fortDress';

export type FortMaterial = 'wood' | 'stone' | 'metal' | 'energy';

/** What the sheet's meta adds for forts (art/blender/styles/realistic/forts/kit.py). */
export interface FortSheetMeta {
  fortKind?: FortKindId;
  age?: AgeId;
  heightLu: number;
  material?: FortMaterial;
  footLu?: number;
  flag?: { crumbleMax: number; z?: 'front' | 'back' };
  door?: { crumbleMax: number };
  crew?: { visualId: string; x: number; y: number; scale: number };
  muzzleLu?: [number, number];
  lightsLu?: { x: number; y: number; r: number; crumbleMax: number }[];
  smokeLu?: { x: number; y: number; crumbleMin: number }[];
  anchorsLu?: Record<string, [number, number]>;
}

export interface FortViewOptions {
  def: VisualDef;
  side: Side;
  kind: FortKindId;
  teamColor: number;
  decor: PartBaker;
  seed: number;
  /** Fort sheets (loaded per age; the view draws a stand-in until its sheet arrives). */
  sheets: WorldAtlas;
  /** The loaded unit sheet of a crew visual id (a tower's crew), or undefined while it loads. */
  crewSheet: (visualId: string) => AtlasData | undefined;
  /** Runs once when the view is destroyed (the provider lets go of the crew's sheet, G7). */
  onDestroy?: () => void;
  age: AgeId | null;
  /** The sheet source to load (`hd` or 1x); null draws the code stand-in only (no sheet installed). */
  source: string | null;
}

/** Debris colours per material (the fort's own large-area colours; energy uses pale glows, A11). */
const DEBRIS: Record<FortMaterial, readonly number[]> = {
  wood: [0x7a6450, 0x5a4a3c, 0x9c8466, 0x6b5847],
  stone: [0x9a8e7e, 0x7a7064, 0xb0a494, 0x8a7e6e],
  metal: [0x5a5c60, 0x8a8e94, 0x3c3e42, 0x6e7278],
  energy: [0x9ff5d8, 0xc8f0ff, 0xd8ccff, 0x7af0ff],
};
const DUST = 0xc4b8a2;
/** Crumble stage per HP: 1 at ≤ 66%, 2 at ≤ 33%, 3 at ≤ 12% (A16.14.8). */
export function fortCrumbleStage(hpBp: number): 0 | 1 | 2 | 3 {
  if (hpBp <= 1200) return 3;
  if (hpBp <= 3300) return 2;
  if (hpBp <= 6600) return 1;
  return 0;
}

interface Pair {
  c: Container;
  team: Sprite;
  base: Sprite;
}

function pair(tint: number): Pair {
  const c = new Container();
  const team = new Sprite(Texture.EMPTY);
  team.tint = tint;
  const base = new Sprite(Texture.EMPTY);
  c.addChild(team, base);
  return { c, team, base };
}

function showFrame(p: Pair, sheet: WorldSheet, clip: string, i: number): boolean {
  const f = sheet.animations[clip];
  const t = sheet.animations[`${clip}_team`];
  if (!f || f.length === 0) {
    p.c.visible = false;
    return false;
  }
  const k = Math.max(0, Math.min(f.length - 1, i));
  setFrame(p.base, f[k]);
  setFrame(p.team, t?.[k]);
  p.c.visible = true;
  return true;
}

/** A tiny track over a unit sheet's clip (the tower crew). */
interface CrewTrack {
  clip: string;
  t: number;
  durationMs: number;
  loop: boolean;
}

const WINDUP_MS = 200;

export class AtlasFortView implements FortView {
  readonly root = new Container();
  /** Anchors in lu (y up is negative), duck-typed for the render layer (bars, sparks, shots). */
  anchors: VisualDef['anchors'];
  private readonly facing: 1 | -1;
  private readonly rng: CosmeticRng;
  /** Mirrored container in lu (the art, the crew and the cracks). */
  private readonly body = new Container();
  /** Art in texture units (scaled by the sheet's lu per unit). */
  private readonly art = new Container();
  private readonly fx = new Container();
  private readonly overlay = new Container();
  private readonly puffs: PuffList;
  private readonly bits: Bits;
  private readonly cracks = new Graphics();
  private readonly pips = new Graphics();
  private readonly glowLayer = new Container();
  private standIn: Container | null = null;
  private sheet: WorldSheet | null = null;
  private meta: FortSheetMeta | null = null;
  private flagBack: Pair | null = null;
  private flagFront: Pair | null = null;
  private bodyPair: Pair | null = null;
  private frontPair: Pair | null = null;
  private doorPair: Pair | null = null;
  private trapPair: Pair | null = null;
  private scaffoldPair: Pair | null = null;
  private rubblePair: Pair | null = null;
  private flashSprite: Sprite | null = null;
  private reveal: Graphics | null = null;
  private bodyRect: Rect | null = null;
  private crew: { c: Container; team: Sprite; base: Sprite; sheet: AtlasData; k: number; track: CrewTrack } | null = null;
  private crewWanted: FortSheetMeta['crew'] | null = null;
  private muzzleGlow: Container | null = null;
  private lights: { s: Container; phase: number; crumbleMax: number }[] = [];
  private motion: ViewMotion = DEFAULT_MOTION;
  private pose: FortPose = { x: 0, y: 0, hpBp: 10000, scaffoldBp: 10000, decayBp: 0, crumbleStage: 0, silenced: false };
  private posed = false;
  private clockMs = 0;
  private frozenMs = 0;
  private crumble = 0;
  private built = true;
  private placeT = -1;
  private buildT = -1;
  private scaffoldDrop = -1;
  private hitT = -1;
  private shakeMs = 0;
  private flashMs = 0;
  private flashDur = 1;
  private flashColor = 0xffffff;
  private doorT = -1;
  private fireT = -1;
  private windupShot = false;
  private trapFrame = 0;
  private trapPopT = -1;
  private spentT = -1;
  private collapseT = -1;
  private smokeAcc = 0;
  private dustAcc = 0;
  private flakeAcc = 0;
  private flagUnfurl = 1;
  private crackSeeds: { pts: Pt[]; w: number }[] = [];
  private crackShown = -1;
  private charges = -1;
  private destroyed = false;
  /** Per-sheet dressing (`fortDress.ts`): the team cloth and the body's ink outline. */
  private dress: FortDress | null = null;
  private banner: Graphics | null = null;
  private ink: Sprite[] = [];

  constructor(private readonly o: FortViewOptions) {
    this.facing = o.side === 0 ? 1 : -1;
    this.rng = mulberry32(o.seed);
    this.anchors = o.def.anchors;
    this.root.label = `fort:${o.def.source}`;
    this.body.scale.x = this.facing;
    this.body.addChild(this.art, this.glowLayer, this.cracks);
    this.root.addChild(this.body, this.fx, this.overlay);
    this.overlay.addChild(this.pips);
    this.puffs = new PuffList(this.fx);
    this.bits = new Bits(this.fx, 60);
    const src = o.source;
    const s = src ? o.sheets.get(src) : undefined;
    if (s) this.attach(s);
    else {
      this.drawStandIn();
      if (src) {
        void o.sheets.ensure(src).then((sh) => {
          if (sh && !this.destroyed) this.attach(sh);
        });
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Setup

  private attach(sheet: WorldSheet): void {
    this.sheet = sheet;
    this.meta = sheet.meta as unknown as FortSheetMeta;
    if (this.standIn) {
      this.standIn.destroy({ children: true });
      this.standIn = null;
    }
    const m = this.meta;
    const tint = this.o.teamColor;
    this.art.scale.set(sheet.luPerUnit);
    const flagZ = m.flag?.z ?? 'back';
    if (sheet.animations['flag']) {
      if (flagZ === 'front') this.flagFront = pair(tint);
      else this.flagBack = pair(tint);
    }
    this.bodyPair = sheet.animations['body'] ? pair(tint) : null;
    this.frontPair = sheet.animations['front'] ? pair(tint) : null;
    this.doorPair = sheet.animations['door'] ? pair(tint) : null;
    this.trapPair = sheet.animations['trap'] ? pair(tint) : null;
    this.scaffoldPair = sheet.animations['scaffold'] ? pair(tint) : null;
    this.rubblePair = sheet.animations['rubble'] ? pair(tint) : null;
    const flash = new Sprite(Texture.EMPTY);
    flash.blendMode = 'add';
    flash.visible = false;
    this.flashSprite = flash;
    const layers: Container[] = [];
    if (this.flagBack) layers.push(this.flagBack.c);
    if (this.rubblePair) layers.push(this.rubblePair.c);
    if (this.bodyPair) layers.push(this.bodyPair.c);
    if (this.trapPair) layers.push(this.trapPair.c);
    if (this.doorPair) layers.push(this.doorPair.c);
    layers.push(flash);
    this.art.addChild(...layers);
    // the crew stands between the body and the front (in lu, not texture units)
    this.crewWanted = m.crew ?? null;
    if (this.frontPair) {
      const front = new Container();
      front.scale.set(sheet.luPerUnit);
      front.addChild(this.frontPair.c);
      this.body.addChild(front);
    }
    const top = new Container();
    top.scale.set(sheet.luPerUnit);
    if (this.flagFront) top.addChild(this.flagFront.c);
    if (this.scaffoldPair) top.addChild(this.scaffoldPair.c);
    this.body.addChild(top);
    this.body.addChild(this.glowLayer, this.cracks);
    if (this.bodyPair) {
      showFrame(this.bodyPair, sheet, 'body', 0);
      this.bodyRect = texRect(this.bodyPair.base.texture);
    } else if (this.trapPair) {
      showFrame(this.trapPair, sheet, 'trap', 1);
      this.bodyRect = texRect(this.trapPair.base.texture);
    }
    if (this.rubblePair) {
      showFrame(this.rubblePair, sheet, 'rubble', 0);
      this.rubblePair.c.visible = false;
    }
    if (this.scaffoldPair) showFrame(this.scaffoldPair, sheet, 'scaffold', 0);
    // anchors from the sheet (y up in the sheet, y down in the VisualDef convention)
    const a = m.anchorsLu ?? {};
    const pt = (k: string, fb: Pt): Pt => {
      const v = a[k];
      return v ? { x: v[0], y: -v[1] } : fb;
    };
    const head = pt('head', this.anchors.head);
    const hit = pt('hitCenter', this.anchors.hitCenter);
    let muzzle = m.muzzleLu ? { x: m.muzzleLu[0], y: -m.muzzleLu[1] } : this.anchors.muzzle;
    if (m.crew) muzzle = { x: m.crew.x + 10 * m.crew.scale, y: -(m.crew.y + 40 * m.crew.scale) };
    this.anchors = { feet: { x: 0, y: 0 }, head: { x: head.x * this.facing, y: head.y }, hitCenter: { x: hit.x * this.facing, y: hit.y }, muzzle: { x: muzzle.x * this.facing, y: muzzle.y } };
    // flickering fires and lamps
    this.lights = (m.lightsLu ?? []).map((l, i) => {
      const s = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
      s.tint = this.o.age === 'future' || this.o.age === 'cosmic' ? 0xa8f2dc : 0xffc27a;
      s.blendMode = 'add';
      s.position.set(l.x, -l.y);
      s.scale.set(Math.max(0.5, l.r / 9));
      this.glowLayer.addChild(s);
      return { s, phase: i * 1.9, crumbleMax: l.crumbleMax };
    });
    if (!m.crew && m.muzzleLu) {
      const g = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
      g.blendMode = 'add';
      g.tint = this.o.age === 'future' || this.o.age === 'cosmic' ? 0x9ff5d8 : 0xffe2a8;
      g.position.set(m.muzzleLu[0], -m.muzzleLu[1]);
      g.alpha = 0;
      this.glowLayer.addChild(g);
      this.muzzleGlow = g;
    }
    this.applyDress();
    this.makeCracks();
    this.applyPose(true);
  }

  /** Dresses the sheet (`fortDress.ts`): underlay colour, cel value lift, ink outline and the team cloth. */
  private applyDress(): void {
    const d = FORT_DRESS[fortSlugOf(this.o.source) ?? ''] ?? null;
    const body = this.bodyPair;
    this.dress = d;
    if (!d || !body) return;
    if (d.underlay !== undefined) body.team.tint = d.underlay;
    if (d.contrast !== undefined || d.brightness !== undefined) {
      const f = new ColorMatrixFilter();
      f.brightness(d.brightness ?? 1, false);
      if (d.contrast) f.contrast(d.contrast, true);
      body.c.filters = [f];
    }
    if (d.ink !== undefined) {
      this.ink = [0, 1, 2, 3].map(() => {
        const sp = new Sprite(Texture.EMPTY);
        sp.tint = d.ink as number;
        return sp;
      });
      body.c.addChildAt(new Container(), 0).addChild(...this.ink);
    }
    if (d.banner) {
      this.banner = new Graphics();
      body.c.addChild(this.banner);
    }
    this.syncDress(0);
  }

  /** Keeps the dressing on the current body frame (crumble stage `st`): outline frames, the cloth's place and tear. */
  private syncDress(st: number): void {
    const body = this.bodyPair;
    const d = this.dress;
    if (!body || !d) return;
    const tex = body.base.texture;
    const W = tex.orig?.width ?? tex.width;
    const H = tex.orig?.height ?? tex.height;
    const step = Math.max(1, W * 0.006);
    const offs: [number, number][] = [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ];
    this.ink.forEach((sp, i) => {
      sp.texture = tex;
      sp.anchor.copyFrom(body.base.anchor);
      const o = offs[i] as [number, number];
      sp.position.set(o[0], o[1]);
    });
    const b = this.banner;
    if (!b || !d.banner) return;
    b.visible = st <= 2 && W > 1;
    if (!b.visible) return;
    const ax = body.base.anchor.x;
    const ay = body.base.anchor.y;
    const w = d.banner.w * W;
    const h = d.banner.h * H;
    const x = (d.banner.x - ax) * W;
    const y = (d.banner.y - ay) * H;
    const team = this.o.teamColor;
    const line = Math.max(1.5, W * 0.008);
    b.clear();
    // the cloth is drawn about its top centre, so the sway and the tear pivot on the rope
    const l = -w / 2;
    const r = w / 2;
    const tail = h * 0.2;
    const cloth = [l, 0, r, 0, r, h, w * 0.22, h - tail * 0.25, 0, h - tail, -w * 0.22, h - tail * 0.25, l, h];
    b.moveTo(l - w * 0.18, -line * 0.6)
      .lineTo(r + w * 0.18, -line * 0.6)
      .stroke({ color: 0x2a1c12, width: line * 1.6, cap: 'round' });
    b.poly(cloth).fill(team);
    b.poly([r - w * 0.3, 0, r, 0, r, h, r - w * 0.3, h - tail * 0.12]).fill(shadeColor(team, -0.32));
    b.poly([l, 0, l + w * 0.18, 0, l + w * 0.18, h - tail * 0.05, l, h]).fill({ color: shadeColor(team, 0.38), alpha: 0.9 });
    b.moveTo(l + w * 0.1, h * 0.2).lineTo(r - w * 0.12, h * 0.2).stroke({ color: shadeColor(team, -0.45), width: line, alpha: 0.6 });
    // a painted emblem: three claw marks in bone white (the tribe's mark)
    for (let i = -1; i <= 1; i++) {
      const cx = i * w * 0.2;
      b.moveTo(cx - w * 0.06, h * 0.34).quadraticCurveTo(cx + w * 0.02, h * 0.5, cx + w * 0.07, h * 0.66).stroke({ color: 0xf2e6c8, width: line * 1.3, cap: 'round' });
    }
    b.poly(cloth).stroke({ color: 0x1b1330, width: line, join: 'round' });
    b.circle(l + w * 0.12, line * 0.4, line * 1.1).fill(0xd9c49a).stroke({ color: 0x1b1330, width: line * 0.6 });
    b.circle(r - w * 0.12, line * 0.4, line * 1.1).fill(0xd9c49a).stroke({ color: 0x1b1330, width: line * 0.6 });
    b.position.set(x, y);
    b.rotation = st === 2 ? 0.2 : 0;
    b.alpha = st === 2 ? 0.92 : 1;
  }

  /** A code-drawn stand-in of the fort's size while its sheet loads (or where none is installed). */
  private drawStandIn(): void {
    const g = new Graphics();
    const team = this.o.teamColor;
    const wood = 0x6e5a48;
    const dark = 0x3e342c;
    const h = this.o.def.heightLu;
    switch (this.o.kind) {
      case 'wall':
        for (let i = 0; i < 7; i++) {
          const x = -24 + i * 8;
          const top = -h * (0.68 + ((i * 37) % 11) / 60);
          g.poly([x - 3.4, 0, x - 3.4, top + 6, x, top, x + 3.4, top + 6, x + 3.4, 0]).fill(i % 2 ? wood : 0x5e4c3c).stroke({ color: dark, width: 1 });
        }
        g.roundRect(-12, -h * 0.55, 24, 20, 3).fill(team).stroke({ color: dark, width: 1 });
        break;
      case 'tower':
        g.poly([-12, 0, -8, -44, 8, -44, 12, 0]).stroke({ color: wood, width: 3 });
        g.moveTo(-11, -4).lineTo(9, -40).moveTo(11, -4).lineTo(-9, -40).stroke({ color: wood, width: 2 });
        g.roundRect(-15, -50, 30, 7, 2).fill(wood).stroke({ color: dark, width: 1 });
        g.roundRect(-15, -60, 30, 10, 2).fill(team).stroke({ color: dark, width: 1 });
        break;
      case 'camp':
        g.poly([-28, 0, 0, -h * 0.62, 28, 0]).fill(0x8a7258).stroke({ color: dark, width: 1.2 });
        g.poly([-19, -18, 19, -18, 12.5, -34, -12.5, -34]).fill(team);
        g.poly([-5, 0, 0, -16, 5, 0]).fill(0x1b1511);
        break;
      case 'trap':
        g.ellipse(0, -2, 26, 7).fill({ color: 0x5e4e3c, alpha: 0.9 }).stroke({ color: dark, width: 1 });
        for (let i = 0; i < 7; i++) g.circle(-18 + i * 6, -3, 1.4).fill(0xb0a494);
        g.rect(-26, -18, 1.4, 16).fill(dark);
        g.poly([-25, -18, -17, -16, -25, -13]).fill(team);
        break;
    }
    g.scale.x = 1;
    this.standIn = g;
    this.art.scale.set(1);
    this.art.addChild(g);
  }

  private makeCracks(): void {
    const r = this.bodyRect;
    const k = this.sheet?.luPerUnit ?? 1;
    this.crackSeeds = [];
    if (!r || this.o.kind === 'trap') return;
    const x0 = r.x * k + r.w * k * 0.3;
    const w = r.w * k * 0.4;
    const y0 = r.y * k + r.h * k * 0.3;
    const hh = r.h * k * 0.45;
    for (let i = 0; i < 9; i++) {
      let x = x0 + this.rng.next() * w;
      let y = y0 + this.rng.next() * hh;
      const pts: Pt[] = [{ x, y }];
      const n = 2 + Math.floor(this.rng.next() * 3);
      for (let j = 0; j < n; j++) {
        x += (this.rng.next() - 0.5) * 5;
        y += 1.5 + this.rng.next() * 3;
        pts.push({ x, y });
      }
      this.crackSeeds.push({ pts, w: 0.7 + this.rng.next() * 0.6 });
    }
  }

  private ensureCrew(): void {
    const want = this.crewWanted;
    if (this.crew || !want) return;
    const sheet = this.o.crewSheet(want.visualId);
    if (!sheet || !sheet.animations['idle']) return;
    const c = new Container();
    const team = new Sprite(Texture.EMPTY);
    team.tint = this.o.teamColor;
    const base = new Sprite(Texture.EMPTY);
    c.addChild(team, base);
    const k = sheet.luPerUnit * want.scale;
    c.scale.set(k);
    c.position.set(want.x, -want.y);
    // between the body and the front parapet
    const frontIdx = this.body.children.findIndex((ch) => ch !== this.art && ch.children.some((x) => x === this.frontPair?.c));
    if (frontIdx >= 0) this.body.addChildAt(c, frontIdx);
    else this.body.addChildAt(c, this.body.children.indexOf(this.art) + 1);
    this.crew = { c, team, base, sheet, k, track: { clip: 'idle', t: this.rng.next() * 900, durationMs: this.crewClipMs(sheet, 'idle'), loop: true } };
  }

  private crewClipMs(sheet: AtlasData, clip: string): number {
    const d = sheet.clips[clip]?.durationsMs;
    return d && d.length ? d.reduce((a, b) => a + b, 0) : 600;
  }

  private crewPlay(clip: string, durationMs?: number, startAt = 0): void {
    const c = this.crew;
    if (!c || !c.sheet.animations[clip]) return;
    const d = durationMs ?? this.crewClipMs(c.sheet, clip);
    c.track = { clip, t: startAt, durationMs: Math.max(1, d), loop: clip === 'idle' };
  }

  private crewUpdate(dt: number): void {
    const c = this.crew;
    if (!c) return;
    const tr = c.track;
    tr.t += dt;
    if (!tr.loop && tr.t >= tr.durationMs) this.crewPlay('idle');
    const t2 = c.track;
    const frames = c.sheet.animations[t2.clip] ?? [];
    const team = c.sheet.animations[`${t2.clip}_team`];
    const authored = c.sheet.clips[t2.clip]?.durationsMs;
    const steps = authored && authored.length === frames.length ? [...authored] : frames.map(() => 100);
    const total = steps.reduce((a, b) => a + b, 0);
    const i = frameIndex(steps, (t2.t / t2.durationMs) * total, t2.loop);
    setFrame(c.base, frames[i]);
    setFrame(c.team, team?.[i]);
    // the crew climbs up when the scaffold completes (it never stands on a half-built tower)
    c.c.visible = this.built;
    if (this.collapseT < 0) {
      const inT = this.buildT >= 0 ? clamp01(this.buildT / 360) : 1;
      c.c.alpha = (this.pose.silenced ? 0.8 : 1) * inT;
      c.c.y = -(this.crewWanted?.y ?? 0) + (this.motion.reduce ? 0 : (1 - easeOutCubic(inT)) * 8);
    }
  }

  // ------------------------------------------------------------------------------------------
  // FortView

  setMotion(m: ViewMotion): void {
    this.motion = m;
  }

  setPose(p: FortPose): void {
    if (this.destroyed) return;
    const first = !this.posed;
    const prevCharges = this.charges;
    this.pose = p;
    this.posed = true;
    this.root.position.set(p.x, p.y);
    if (first) {
      this.built = p.scaffoldBp >= 10000;
      // a fresh placement drops in (a view created later, e.g. after a replay seek, just stands)
      if (p.scaffoldBp < 2500) this.placeT = 0;
      this.crumble = p.crumbleStage;
      if (this.o.kind === 'trap') this.trapFrame = p.scaffoldBp >= 10000 ? 1 : 0;
    }
    if (!this.built && p.scaffoldBp >= 10000) this.play('build');
    if (p.crumbleStage !== this.crumble) {
      if (p.crumbleStage > this.crumble && this.collapseT < 0) this.crumbleBurst(p.crumbleStage);
      this.crumble = p.crumbleStage;
    }
    if (this.o.kind === 'trap') {
      if (this.trapFrame === 0 && p.scaffoldBp >= 10000) this.play('armed');
      this.charges = p.charges ?? -1;
      if (prevCharges !== this.charges) this.drawPips();
    }
    this.applyPose(false);
    // the tower's wind-up (presentation only, B5): the crew starts its throw so the release lands on the shot
    const next = p.nextAttackInMs;
    // No target any more (it died or left range before the shot): that wind-up led to no shot, so the
    // next real shot must play its own crew attack.
    if (this.windupShot && next === undefined) this.windupShot = false;
    if (this.o.kind === 'tower' && this.built && !p.silenced && next !== undefined && next > 0 && next <= WINDUP_MS && !this.windupShot && this.collapseT < 0) {
      this.windupShot = true;
      if (this.crew) {
        const impactAt = this.crew.sheet.clips['attack']?.impactAt ?? 0.42;
        const dur = WINDUP_MS / Math.max(0.1, impactAt);
        this.crewPlay('attack', dur, WINDUP_MS - next);
      }
    }
  }

  private applyPose(force: boolean): void {
    const s = this.sheet;
    if (!s) return;
    const st = this.collapseT >= 0 ? 3 : this.crumble;
    if (this.bodyPair) showFrame(this.bodyPair, s, 'body', st);
    if (this.dress) this.syncDress(st);
    if (this.frontPair) showFrame(this.frontPair, s, 'front', st);
    if (this.o.kind === 'trap' && this.trapPair) showFrame(this.trapPair, s, 'trap', this.trapFrame);
    if (this.doorPair) {
      const dc = this.meta?.door?.crumbleMax ?? 2;
      this.doorPair.c.visible = st <= dc && this.collapseT < 0;
      if (this.doorPair.c.visible && (force || this.doorT < 0)) showFrame(this.doorPair, s, 'door', 0);
    }
  }

  play(clip: string, _o?: { durationMs?: number; loop?: boolean }): void {
    if (this.destroyed) return;
    switch (clip) {
      case 'place':
        this.placeT = 0;
        return;
      case 'build':
        if (this.built && this.buildT >= 0) return;
        this.built = true;
        this.buildT = 0;
        this.scaffoldDrop = 0;
        this.flagUnfurl = 0;
        this.dustRing(1.1);
        return;
      case 'attack':
      case 'fire':
        this.fireT = 0;
        if (this.crew && !this.windupShot) {
          const impactAt = this.crew.sheet.clips['attack']?.impactAt ?? 0.42;
          const dur = this.crewClipMs(this.crew.sheet, 'attack');
          this.crewPlay('attack', dur, dur * impactAt);
        }
        this.windupShot = false;
        this.muzzleFlash();
        return;
      case 'hit':
        this.hitT = 0;
        this.shakeMs = Math.max(this.shakeMs, 170);
        this.flashNow(80, 0xffffff);
        this.chips(3);
        return;
      case 'spawn':
        this.doorT = 0;
        return;
      case 'armed':
        this.trapFrame = 1;
        this.trapPopT = 0;
        this.applyPose(true);
        return;
      case 'trigger':
        this.trapFrame = 2;
        this.trapPopT = 0;
        this.applyPose(true);
        this.chips(5);
        this.dustRing(0.8);
        return;
      case 'spent':
        this.trapFrame = 3;
        this.spentT = 0;
        this.applyPose(true);
        return;
      case 'die':
      case 'collapse':
        this.collapse();
        return;
      default:
        return;
    }
  }

  freeze(ms: number): void {
    this.frozenMs = Math.max(this.frozenMs, ms);
  }

  flash(ms: number, color?: number): void {
    this.flashNow(ms, color ?? 0xffffff);
  }

  private flashNow(ms: number, color: number): void {
    this.flashMs = Math.max(this.flashMs, ms);
    this.flashDur = Math.max(1, ms);
    this.flashColor = color;
  }

  // ------------------------------------------------------------------------------------------
  // Moments

  private footLu(): number {
    return this.meta?.footLu ?? (this.o.kind === 'tower' ? 16 : 26);
  }

  private material(): FortMaterial {
    return this.meta?.material ?? 'wood';
  }

  private dustPuff(x: number, y: number, s: number, vx = 0, vy = -12, life = 700): void {
    const d = partSprite(this.o.decor, 'fx.p.dust', FX_ZONES);
    d.tint = DUST;
    d.position.set(x, y);
    this.puffs.add(d, { vx, vy, life, s0: 0.8 * s, s1: 1.8 * s, a0: 0.75, spin: (this.rng.next() - 0.5) * 1.2 });
  }

  private dustRing(power: number): void {
    const f = this.footLu();
    const n = this.motion.lite ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      this.dustPuff(u * f * 2, -2, power * (1 + this.rng.next() * 0.5), u * 70 * power, -8 - this.rng.next() * 14, 650 + this.rng.next() * 300);
    }
  }

  private chunk(x: number, y: number, vx: number, vy: number, s: number, life: number): void {
    const mat = this.material();
    const cols = DEBRIS[mat];
    const sprite = mat === 'wood' ? 'fx.p.chunkWood' : mat === 'energy' ? 'fx.p.spark' : this.rng.next() < 0.5 ? 'fx.p.rock' : 'fx.p.rock2';
    const c = partSprite(this.o.decor, sprite, FX_ZONES);
    c.tint = cols[Math.floor(this.rng.next() * cols.length)] ?? 0x8a7e70;
    if (mat === 'energy') c.blendMode = 'add';
    c.position.set(x, y);
    this.bits.add(c, { vx, vy, g: 420, drag: 0.4, spin: (this.rng.next() - 0.5) * 14, life, s0: s, s1: s * 0.85, ground: mat !== 'energy' });
  }

  private chips(n: number): void {
    if (this.motion.reduce) return;
    const hc = this.anchors.hitCenter;
    for (let i = 0; i < n; i++) {
      this.chunk(hc.x + (this.rng.next() - 0.5) * 10, hc.y + (this.rng.next() - 0.5) * 12, (this.rng.next() - 0.2) * 90 * this.facing, -60 - this.rng.next() * 90, 0.55 + this.rng.next() * 0.35, 520 + this.rng.next() * 300);
    }
  }

  private crumbleBurst(stage: number): void {
    this.shakeMs = Math.max(this.shakeMs, 220);
    this.flashNow(90, 0xfff0d8);
    const f = this.footLu();
    const h = -(this.o.def.heightLu * 0.6);
    const n = this.motion.lite ? 4 : 6 + stage * 2;
    if (!this.motion.reduce) {
      for (let i = 0; i < n; i++) {
        this.chunk((this.rng.next() - 0.5) * f * 1.6, h * (0.3 + this.rng.next() * 0.6), (this.rng.next() - 0.5) * 160, -40 - this.rng.next() * 120, 0.65 + this.rng.next() * 0.5, 700 + this.rng.next() * 400);
      }
    }
    for (let i = 0; i < 3; i++) this.dustPuff((this.rng.next() - 0.5) * f * 1.4, -4 - this.rng.next() * 10, 1.2, (this.rng.next() - 0.5) * 30, -10);
    this.crackShown = -1;
  }

  private muzzleFlash(): void {
    const m = this.anchors.muzzle;
    const g = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
    g.blendMode = 'add';
    g.tint = this.o.age === 'future' || this.o.age === 'cosmic' ? 0xc8fff0 : 0xfff0d2;
    g.position.set(m.x, m.y);
    this.puffs.add(g, { life: 140, s0: this.crew ? 0.5 : 1.2, s1: this.crew ? 0.9 : 2.2, a0: this.crew ? 0.35 : 0.9 });
    if (!this.crew && (this.o.age === 'gunpowder' || this.o.age === 'industrial' || this.o.age === 'modern')) {
      const sm = partSprite(this.o.decor, 'fx.p.smoke', FX_ZONES);
      sm.tint = 0xdcd8d2;
      sm.position.set(m.x, m.y);
      this.puffs.add(sm, { vx: 24 * this.facing, vy: -10, life: 700, s0: 0.5, s1: 1.4, a0: 0.55 });
    }
  }

  private collapse(): void {
    if (this.collapseT >= 0) return;
    this.collapseT = 0;
    this.shakeMs = Math.max(this.shakeMs, 320);
    this.flashNow(110, 0xfff0d8);
    const f = this.footLu();
    const H = this.o.def.heightLu;
    if (!this.motion.reduce) {
      const n = this.motion.lite ? 8 : 16;
      for (let i = 0; i < n; i++) {
        this.chunk((this.rng.next() - 0.5) * f * 1.8, -H * (0.2 + this.rng.next() * 0.6), (this.rng.next() - 0.5) * 220, -80 - this.rng.next() * 170, 0.7 + this.rng.next() * 0.7, 900 + this.rng.next() * 600);
      }
    }
    for (let i = 0; i < (this.motion.lite ? 4 : 7); i++) {
      this.dustPuff((this.rng.next() - 0.5) * f * 2.2, -4 - this.rng.next() * H * 0.35, 1.6 + this.rng.next(), (this.rng.next() - 0.5) * 60, -14 - this.rng.next() * 16, 1000 + this.rng.next() * 500);
    }
    if (this.rubblePair) this.rubblePair.c.visible = true;
  }

  private drawPips(): void {
    const g = this.pips;
    g.clear();
    if (this.charges <= 0 || this.o.kind !== 'trap') return;
    const n = this.charges;
    const y = -(this.o.def.heightLu + 4);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 5.2;
      g.circle(x, y, 2.1).fill({ color: this.o.teamColor, alpha: 0.95 }).stroke({ color: 0x1c1712, width: 0.9, alpha: 0.9 });
    }
  }

  private drawCracks(): void {
    const want = this.o.kind === 'trap' ? 0 : Math.min(this.crackSeeds.length, Math.ceil((this.pose.decayBp / 5500) * this.crackSeeds.length));
    if (want === this.crackShown) return;
    this.crackShown = want;
    const g = this.cracks;
    g.clear();
    for (let i = 0; i < want; i++) {
      const c = this.crackSeeds[i];
      if (!c) continue;
      const [p0, ...rest] = c.pts;
      if (!p0) continue;
      g.moveTo(p0.x, p0.y);
      for (const p of rest) g.lineTo(p.x, p.y);
      g.stroke({ color: 0x1a1410, width: c.w * 1.3, alpha: 0.55 });
      g.moveTo(p0.x + 0.6, p0.y);
      for (const p of rest) g.lineTo(p.x + 0.6, p.y);
      g.stroke({ color: 0xf0e2c8, width: c.w * 0.45, alpha: 0.25 });
    }
  }

  // ------------------------------------------------------------------------------------------
  // Frame

  update(dtMs: number): void {
    if (this.destroyed) return;
    let dt = dtMs;
    if (this.frozenMs > 0) {
      this.frozenMs -= dtMs;
      dt = 0;
    }
    this.clockMs += dt;
    this.ensureCrew();
    this.crewUpdate(dt);
    this.puffs.update(dtMs);
    this.bits.update(dtMs);
    const reduce = this.motion.reduce;
    const s = this.sheet;
    const H = this.o.def.heightLu;
    let sx = 1;
    let sy = 1;
    let ox = 0;
    let oy = 0;
    let alpha = 1;
    // placing: drops in with a thud
    if (this.placeT >= 0) {
      this.placeT += dt;
      const u = clamp01(this.placeT / 260);
      if (reduce) alpha *= clamp01(this.placeT / 200);
      else {
        oy -= (1 - easeInQuad(u)) * 10;
        if (u >= 1) {
          const v = clamp01((this.placeT - 260) / 260);
          sy *= 1 - 0.08 * Math.sin(Math.PI * v) * (1 - v);
          sx *= 1 + 0.06 * Math.sin(Math.PI * v) * (1 - v);
        }
      }
      if (this.placeT >= 260 && this.placeT - dt < 260) this.dustRing(1);
      if (this.placeT > 560) this.placeT = -1;
    }
    // scaffold: reveal the body from the ground up
    const sc = this.built ? 10000 : this.pose.scaffoldBp;
    if (this.o.kind !== 'trap' && this.bodyPair && s) {
      if (!this.built) {
        const r = this.bodyRect;
        if (r) {
          if (!this.reveal) {
            this.reveal = new Graphics();
            this.art.addChild(this.reveal);
            this.bodyPair.c.mask = this.reveal;
          }
          const u = 0.12 + 0.88 * clamp01(sc / 10000);
          const top = r.y + r.h * (1 - u);
          this.reveal.clear();
          this.reveal.rect(r.x - 20, top, r.w + 40, r.h * u + 40).fill(0xffffff);
        }
        this.bodyPair.c.alpha = 0.92;
        if (this.scaffoldPair) this.scaffoldPair.c.visible = true;
        // dust at the footing and a knock now and then
        this.dustAcc += dt;
        if (this.dustAcc > 520) {
          this.dustAcc = 0;
          this.dustPuff((this.rng.next() - 0.5) * this.footLu() * 1.6, -3, 0.8, (this.rng.next() - 0.5) * 20, -10, 600);
          if (!reduce) sy *= 0.985;
        }
      } else if (this.reveal) {
        this.bodyPair.c.mask = null;
        this.reveal.destroy();
        this.reveal = null;
        this.bodyPair.c.alpha = 1;
      }
    }
    // completion: the scaffold falls away and the body pops
    if (this.scaffoldPair) {
      if (this.scaffoldDrop >= 0) {
        this.scaffoldDrop += dt;
        const u = clamp01(this.scaffoldDrop / 420);
        const c = this.scaffoldPair.c;
        c.visible = u < 1;
        c.alpha = 1 - u;
        c.y = reduce ? 0 : easeInQuad(u) * 26 / (s?.luPerUnit ?? 1);
        c.rotation = reduce ? 0 : -0.1 * u;
        if (u >= 1) this.scaffoldDrop = -1;
      } else if (this.built) this.scaffoldPair.c.visible = false;
    }
    if (this.buildT >= 0) {
      this.buildT += dt;
      const u = clamp01(this.buildT / 520);
      if (!reduce) {
        const sp = springSettle(u, 2.4, 5);
        const k = (sp - 1) * 0.5;
        sy *= 1 + (u < 0.14 ? -0.1 * (u / 0.14) : 0.12 * (1 - u) * Math.sin(u * 9));
        sx *= 1 - k * 0.2;
      }
      if (u >= 1) this.buildT = -1;
    }
    // flag unfurl after completion
    if (this.flagUnfurl < 1) this.flagUnfurl = Math.min(1, this.flagUnfurl + dt / 520);
    // hit shake and flash
    if (this.shakeMs > 0) {
      this.shakeMs = Math.max(0, this.shakeMs - dtMs);
      if (!reduce) {
        const k = this.shakeMs / 200;
        ox += (this.rng.next() - 0.5) * 3.2 * k;
        oy += (this.rng.next() - 0.5) * 1.2 * k;
      }
    }
    if (this.hitT >= 0) {
      this.hitT += dt;
      if (!reduce) sy *= 1 - 0.025 * Math.sin(Math.PI * clamp01(this.hitT / 140));
      if (this.hitT > 140) this.hitT = -1;
    }
    // tower recoil
    if (this.fireT >= 0) {
      this.fireT += dt;
      const u = clamp01(this.fireT / 180);
      if (!reduce && !this.crew) ox -= 1.6 * Math.sin(Math.PI * u) * this.facing;
      if (u >= 1) this.fireT = -1;
    }
    if (this.muzzleGlow) {
      const next = this.pose.nextAttackInMs;
      const wind = this.built && !this.pose.silenced && next !== undefined && next > 0 && next <= WINDUP_MS ? 1 - next / WINDUP_MS : 0;
      this.muzzleGlow.alpha = 0.85 * easeInQuad(wind);
      this.muzzleGlow.scale.set(0.6 + wind * 0.9);
    }
    // camp door: open, hold, close
    if (this.doorPair && s && this.doorT >= 0) {
      this.doorT += dt;
      const t = this.doorT;
      const frame = t < 90 ? 1 : t < 520 ? 2 : t < 610 ? 1 : 0;
      showFrame(this.doorPair, s, 'door', frame);
      if (t >= 90 && t - dt < 90) {
        const dx = (this.meta?.footLu ?? 26) * 0.2;
        for (let i = 0; i < 3; i++) this.dustPuff(dx * this.facing + (this.rng.next() - 0.5) * 8, -4, 0.9, (40 + this.rng.next() * 30) * this.facing, -10, 600);
        if (!reduce) sy *= 1.02;
      }
      if (t > 640) this.doorT = -1;
    }
    // trap pops
    if (this.trapPopT >= 0) {
      this.trapPopT += dt;
      const u = clamp01(this.trapPopT / 260);
      if (!reduce) {
        sy *= 1 + 0.22 * Math.sin(Math.PI * u) * (1 - u);
        sx *= 1 - 0.06 * Math.sin(Math.PI * u) * (1 - u);
      }
      if (this.trapFrame === 2 && this.trapPopT > 620 && this.charges !== 0) {
        this.trapFrame = 1;
        this.applyPose(true);
      }
      if (u >= 1 && this.trapFrame !== 2) this.trapPopT = -1;
      if (this.trapPopT > 700) this.trapPopT = -1;
    }
    if (this.spentT >= 0) {
      this.spentT += dt;
      alpha *= 1 - clamp01((this.spentT - 300) / 600);
    }
    if (this.o.kind === 'trap' && this.trapFrame === 0) alpha *= 0.85;
    // collapse: sink and tilt into the rubble
    if (this.collapseT >= 0) {
      this.collapseT += dt;
      const u = clamp01((this.collapseT - 80) / 620);
      const e = easeInQuad(u);
      if (this.bodyPair) {
        const c = this.bodyPair.c;
        c.alpha = 1 - clamp01((u - 0.35) / 0.65);
        if (!reduce && s) {
          c.pivot.set(0, 0);
          c.scale.y = 1 - 0.45 * e;
          c.rotation = -0.06 * e;
          c.y = (H * 0.08 * e) / s.luPerUnit;
        }
      }
      if (this.frontPair) this.frontPair.c.alpha = 1 - u;
      if (this.crew) {
        this.crew.c.alpha = 1 - u;
        if (!reduce) {
          this.crew.c.rotation = -0.9 * e;
          this.crew.c.y = -(this.crewWanted?.y ?? 0) + (this.crewWanted?.y ?? 0) * e;
        }
      }
      for (const p of [this.flagBack, this.flagFront]) {
        if (!p) continue;
        p.c.alpha = 1 - u;
        if (!reduce) p.c.rotation = -0.8 * e;
      }
      if (this.doorPair) this.doorPair.c.visible = false;
      if (this.rubblePair) this.rubblePair.c.alpha = clamp01((this.collapseT - 60) / 360);
      if (this.collapseT > 120 && this.collapseT - dt <= 120) for (let i = 0; i < 3; i++) this.dustPuff((this.rng.next() - 0.5) * 40, -H * 0.3, 2.2, (this.rng.next() - 0.5) * 50, -12, 1300);
    }
    // flag loop, lights, smoke
    if (s) {
      const fc = this.meta?.flag?.crumbleMax ?? 2;
      for (const p of [this.flagBack, this.flagFront]) {
        if (!p) continue;
        const d = clipDurations(s, 'flag', 120);
        const on = this.built && this.crumble <= fc;
        if (on || this.collapseT >= 0) {
          showFrame(p, s, 'flag', frameIndex(d, this.clockMs + this.o.seed * 37, true));
          p.c.visible = on || this.collapseT >= 0;
        } else p.c.visible = false;
        if (this.collapseT < 0) {
          const k = this.flagUnfurl < 1 ? easeOutCubic(this.flagUnfurl) : 1;
          p.c.scale.set(1, 0.25 + 0.75 * k);
          p.c.alpha = 0.3 + 0.7 * k;
        }
      }
      for (const l of this.lights) {
        const on = this.built && this.crumble <= l.crumbleMax && this.collapseT < 0;
        l.s.visible = on;
        if (on) l.s.alpha = 0.32 + 0.12 * Math.sin(this.clockMs / 90 + l.phase) + 0.06 * Math.sin(this.clockMs / 37 + l.phase * 2);
      }
      this.smokeAcc += dt;
      if (this.smokeAcc > 650) {
        this.smokeAcc = 0;
        for (const sm of this.meta?.smokeLu ?? []) {
          if (!this.built || this.crumble < sm.crumbleMin || this.collapseT >= 0) continue;
          const p = partSprite(this.o.decor, 'fx.p.smoke', FX_ZONES);
          p.tint = 0xb8b2aa;
          p.position.set(sm.x * this.facing, -sm.y);
          this.puffs.add(p, { vx: (-6 + this.rng.next() * 4) * this.facing, vy: -16, life: 1800, s0: 0.5, s1: 1.8, a0: 0.4 });
        }
      }
    }
    // decay: cracks and falling flakes
    this.drawCracks();
    if (this.pose.decayBp > 0 && this.built && this.collapseT < 0 && this.o.kind !== 'trap') {
      this.flakeAcc += dt;
      if (this.flakeAcc > 900 - Math.min(600, this.pose.decayBp / 10)) {
        this.flakeAcc = 0;
        if (!reduce) this.chunk((this.rng.next() - 0.5) * this.footLu() * 1.4, -H * (0.3 + this.rng.next() * 0.5), (this.rng.next() - 0.5) * 20, 0, 0.6, 700);
      }
    }
    // flash (an additive copy of the body frame)
    if (this.flashSprite && this.bodyPair) {
      if (this.flashMs > 0) {
        this.flashMs = Math.max(0, this.flashMs - dtMs);
        this.flashSprite.texture = this.bodyPair.base.texture;
        this.flashSprite.anchor.copyFrom(this.bodyPair.base.anchor);
        this.flashSprite.tint = this.flashColor;
        this.flashSprite.alpha = 0.6 * (this.flashMs / this.flashDur);
        this.flashSprite.visible = true;
      } else this.flashSprite.visible = false;
    }
    // the team cloth sways on its rope (idle life)
    if (this.banner?.visible && !reduce) this.banner.skew.x = 0.05 * Math.sin(this.clockMs / 650 + this.o.seed);
    // decay darkens the body a little
    if (this.bodyPair) {
      const d = Math.min(1, this.pose.decayBp / 8000);
      const v = Math.round(255 * (1 - 0.18 * d));
      this.bodyPair.base.tint = (v << 16) | (v << 8) | v;
    }
    this.body.position.set(ox, oy);
    this.body.scale.set(this.facing * sx, sy);
    this.root.alpha = alpha;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.puffs.clear();
    this.bits.clear();
    this.root.destroy({ children: true });
    this.o.onDestroy?.();
  }
}
