/**
 * Damage on a sprite-sheet unit (queue item 40, design 4a "Runtime"): the stage of its `DamageModel` drawn on the atlas
 * view. Up to four mark sprites and one strip live in the view's `body` container, right after the base frame (before
 * the cross-dissolve ghost and the flash, so a hit's white flash covers them); each is placed from the bundle's spot data
 * for the frame on screen (position, in-plane turn, foreshortening and visibility, so an arm passing in front hides a
 * torso mark). The stage tint goes on the base frame only (a vertex colour: no batch break; the team colour stays
 * exact). Steps are reported to `onDamageStep` listeners (the battle view plays the burst and the sound), the live
 * emitters through `emitters()`.
 *
 * Without spot data (no bundle yet, or none for this unit) the unit shows the effects-only fallback: tint, emitters and
 * bursts at points of its torso box and head (bundle trackers), or of its static anchors.
 */
import { Sprite, Texture, type Container } from 'pixi.js';
import type { Anchors } from '@/contracts/art';
import type { PartBaker } from '../bake';
import { FX_ZONES } from '../effects/sprites';
import { getPart } from '../parts/registry';
import { damageBundles, frameOf, type DamageBundles } from './bundle';
import { emitterPoint, emittersFor, fireAt, torsoPoint, type EmitterAt, type EmitterSpec } from './emitters';
import { fallbackFamily, woodenBody } from './families';
import { markSizeLu } from './marks';
import { DamageModel, defaultMat, MARK_FADE_IN_MS, MARK_POP_MS, MEND_FADE_MS, type DamageStep, type PlacedMark } from './model';
import { WearyClock, type WearyPose } from './motion';
import { burns, LITE_MAX_MARKS, mixRgb, smallBody, stageTint, STRIP_DULL, STRIP_DUST, STRIP_SMALL_SCALE } from './stage';
import { DAMAGE_FX_PARTS, DAMAGE_STRIP_PARTS } from './kit';
import { markParts } from './marks';
import type { BlowKind, DamageEmitter, DamageFamily, DamageStage, DamageStepEvent, DamageUnitData, EmitKind, SpotFrame } from './types';

/** The body's transform as the view placed it (atlasAim's `BodyXform`): offset (root lu), rotation, scale per lu. */
export interface DamageXform {
  x: number;
  y: number;
  rotation: number;
  sx: number;
  sy: number;
}

/** A sheet point (lu, x forward, y up) in the root's space (y down) through the body's transform `b` and `hk`. */
function toRoot(px: number, py: number, b: DamageXform | null, hk: number): { x: number; y: number } {
  const lx = px * hk;
  const ly = -py * hk;
  if (!b) return { x: lx, y: ly };
  const cs = Math.cos(b.rotation);
  const sn = Math.sin(b.rotation);
  return { x: b.x + lx * b.sx * cs - ly * b.sy * sn, y: b.y + lx * b.sx * sn + ly * b.sy * cs };
}

/**
 * A kit part drawn about its own origin: one sprite anchored at the part's origin (one display object per mark, not a
 * container and a sprite: a brawl's marks are many).
 */
class PartNode {
  readonly root = new Sprite(Texture.EMPTY);
  private id = '';

  constructor(private readonly baker: PartBaker) {
    this.root.visible = false;
  }

  set(id: string): void {
    if (id === this.id) return;
    this.id = id;
    const p = getPart(id);
    if (!p) {
      this.root.texture = Texture.EMPTY;
      return;
    }
    const b = this.baker.get(p, FX_ZONES);
    this.root.texture = b.main;
    // the baked frame sits at `origin` from the part's origin: that point is the anchor (rotation and scale turn about it)
    const w = b.main.width || 1;
    const h = b.main.height || 1;
    this.root.anchor.set(-b.origin.x / w, -b.origin.y / h);
    this.baker.flush();
  }

  set tint(c: number) {
    this.root.tint = c;
  }
}

/** The damage kit's bake per baker: pending while it bakes, then done (`KIT_DONE`). */
const KIT_BAKES = new WeakMap<PartBaker, Promise<void>>();
const KIT_DONE = new WeakSet<PartBaker>();

/** The browser's idle callback with the time left in it (ms), else a timer with a fixed slice. */
function whenIdle(fn: (left: () => number) => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: (d: { timeRemaining(): number }) => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric((d) => fn(() => d.timeRemaining()), { timeout: 500 });
  else {
    setTimeout(() => {
      const t0 = Date.now();
      fn(() => KIT_SLICE_MS - (Date.now() - t0));
    }, 16);
  }
}

/** At most this long of baking in one idle slice (ms). */
const KIT_SLICE_MS = 8;

/** The pose of a unit that shows nothing weary (`update` below stage 2 without marks). */
const NEUTRAL_POSE: Readonly<WearyPose> = Object.freeze({ idleRate: 1, squash: 0, dipLu: 0, shiftLu: 0, pitchDeg: 0, flicker: 0, puff: false });

/** Every part of the damage kit: the marks and strips the units wear, and the step's pieces and flames. */
export function damageKitParts(): string[] {
  return [...markParts(), ...DAMAGE_STRIP_PARTS, ...DAMAGE_FX_PARTS];
}

/**
 * Bakes the whole damage kit once per baker before a battle (VS, the battle's loading: the provider's
 * `damageKitReady`), with `extra` (the sprites of the damage effects' recipes), a few parts per idle slice, ahead of use
 * (the views' flushes in between leave its pages alone), and uploads its pages once, at the end: no part bakes and no
 * page uploads in the battle for damage (W0: every part baked on first use uploads its whole 512 px page again, and the
 * damage effects' flushes doubled a war's page uploads; repeated canvas uploads are also a known WebKit GPU-memory
 * risk). Resolves when baked; null once it has been. A part a view asks for before (a battle that could not wait) bakes
 * on the spot, as before; a kit part a view gets while the kit bakes has its page uploaded by that view's flush.
 */
export function bakeDamageKit(baker: PartBaker, extra: readonly string[] = []): Promise<void> | null {
  if (!baker.enabled || KIT_DONE.has(baker)) return null;
  const had = KIT_BAKES.get(baker);
  if (had) return had;
  const todo = [...new Set([...damageKitParts(), ...extra])];
  const p = new Promise<void>((resolve) => {
    const step = (left: () => number): void => {
      // at least one part a slice, then while the slice has time
      do {
        const id = todo.shift();
        const part = id !== undefined ? getPart(id) : undefined;
        if (part && !baker.has(part, FX_ZONES)) baker.get(part, FX_ZONES, 0, { ahead: true });
      } while (todo.length > 0 && left() > 1);
      if (todo.length > 0) {
        whenIdle(step);
        return;
      }
      KIT_DONE.add(baker);
      // the one upload of the kit's pages
      baker.flushAll();
      resolve();
    };
    whenIdle(step);
  });
  KIT_BAKES.set(baker, p);
  return p;
}


export interface UnitDamageOptions {
  /** The view's body container and the sprite the marks go right after (the base frame); null: no marks (puppets). */
  body: Container;
  after: Container | null;
  baker: PartBaker;
  /** The sheet slug (`footman`, or `footman@skin` for a skin sheet). */
  slug: string;
  heightLu: number;
  anchors: Anchors;
  team: number;
  seed: number;
  air?: boolean;
  bundles?: DamageBundles;
  /**
   * Draw no marks and use no per-frame trackers (a procedural puppet, or a skin drawn as one: its shape is not the
   * sheet's, so the sheet's spots would land beside it). The family still comes from the bundle.
   */
  noSpots?: boolean;
}

export class UnitDamage {
  private model: DamageModel;
  private entry: DamageUnitData | null = null;
  private bundleVersion = -1;
  private readonly bundles: DamageBundles;
  private family: DamageFamily;
  private weary: WearyClock;
  private readonly marks: PartNode[] = [];
  private strip: PartNode | null = null;
  private readonly listeners: ((e: DamageStepEvent) => void)[] = [];
  private clock = 0;
  private dead = false;
  private lite = false;
  private reduce = false;
  private team: number;
  /** The frame on screen (the sheet's animation and its unique frame) and what was laid out for it. */
  private anim = 'idle';
  private frame = 0;
  private laidRev = -1;
  private laidAnim = '';
  private laidFrame = -1;
  private animating = false;
  /** The live emitters (resolved each call, no allocation once grown). */
  private specs: EmitterSpec[] = [];
  private specsStage: DamageStage = 0;
  /** Where a burning unit's fire and ignite flare sit (`fireAt`), null where nowhere is clear; undefined: not yet asked. */
  private fire: EmitterAt | null | undefined = undefined;
  private readonly firePt: [number, number] = [0, 0];
  private readonly out: DamageEmitter[] = [];
  private readonly emitPool: DamageEmitter[] = [];
  private readonly pt: [number, number] = [0, 0];
  private readonly wearyOpts = { moving: false, reduce: false };
  private stripSway = 0;
  private seed: number;

  constructor(private readonly o: UnitDamageOptions) {
    this.bundles = o.bundles ?? damageBundles;
    this.team = o.team;
    this.seed = o.seed >>> 0;
    this.entry = this.usable(this.bundles.entry(o.slug));
    this.bundleVersion = this.bundles.version;
    this.family = this.entry?.family ?? fallbackFamily(o.slug, { air: o.air === true });
    this.model = new DamageModel(this.family, this.seed, this.entry?.spots, defaultMat(this.family, woodenBody(o.slug)));
    this.weary = new WearyClock(this.family, this.seed);
  }

  get stage(): DamageStage {
    return this.model.stage;
  }

  get familyName(): DamageFamily {
    return this.family;
  }

  /** The bundle entry in use (tests, the gallery). */
  get data(): DamageUnitData | null {
    return this.entry;
  }

  /** The per-unit seed (unit id ^ match seed): only before the first step, so marks never jump. */
  setSeed(seed: number): void {
    if ((seed >>> 0) === this.seed || this.model.stage !== 0) return;
    this.seed = seed >>> 0;
    this.model = new DamageModel(this.family, this.seed, this.entry?.spots, this.model.fallbackMat);
    this.weary = new WearyClock(this.family, this.seed);
  }

  setMotion(o: { reduce: boolean; lite: boolean }): void {
    this.reduce = o.reduce;
    this.lite = o.lite;
    this.laidRev = -1;
  }

  setTeam(color: number): void {
    this.team = color;
    if (this.strip) this.strip.tint = mixRgb(color, STRIP_DUST, STRIP_DULL);
  }

  noteBlow(kind: BlowKind | null, effective = false): void {
    this.model.noteBlow(kind, effective);
    // a battle that did not bake the kit up front (no VS, no wait): it bakes now in idle time, once
    if (this.o.after && !this.o.noSpots && (this.entry?.spots?.length ?? 0) > 0) void bakeDamageKit(this.o.baker);
  }

  onStep(cb: (e: DamageStepEvent) => void): void {
    this.listeners.push(cb);
  }

  /** The HP the unit is drawn with this frame. The killing blow changes nothing (the body falls with its stage). */
  setHp(hpBp: number): void {
    if (this.dead) return;
    // most frames: the same HP and no new bundle (the view calls this every frame)
    if (hpBp === this.lastHp && this.bundleVersion === this.bundles.version) return;
    const first = Number.isNaN(this.lastHp);
    this.lastHp = hpBp;
    this.refreshEntry();
    // a view first drawn already hurt (made mid-fight) starts at its stage silently: it was not just hit
    if (first) {
      this.model.settle(hpBp, this.clock);
      return;
    }
    const step = this.model.update(hpBp, this.clock);
    if (step) this.report(step);
  }

  /** The unit died: its stage and marks stay as they are through the fall and the fade. */
  die(): void {
    this.dead = true;
  }

  /** The frame on screen (the sheet's animation name and unique frame index); marks follow it. */
  setFrame(anim: string, frame: number): void {
    this.anim = anim;
    this.frame = frame;
  }

  /** The stage tint for the unit's own art (never its team colour). */
  get tint(): number {
    return stageTint(this.family, this.model.stage);
  }

  /** Advances the clocks (game ms) and returns the motion to add this frame. */
  update(dtMs: number, moving: boolean): Readonly<WearyPose> {
    this.clock += Math.max(0, dtMs);
    const m = this.model;
    // an unhurt unit (most units, most frames): nothing to prune and no weary motion, so no pose to build (W0)
    if (m.stage === 0 && m.marks.length === 0 && m.strip === null) {
      this.weary.idle(dtMs);
      return NEUTRAL_POSE;
    }
    m.prune(this.clock);
    // one options object for the life of the view (no allocation per frame)
    const wo = this.wearyOpts;
    wo.moving = moving;
    wo.reduce = this.reduce;
    const pose = this.weary.update(dtMs, this.model.stage, wo);
    if (this.strip?.root.visible && !this.lite && !this.reduce) {
      this.stripSway += dtMs;
    }
    return pose;
  }

  /** A walk contact step was shown (tired walkers dip on every second one, a mech hitches). */
  contact(): void {
    this.weary.contact();
  }

  /** Lays the marks and the strip out for the frame on screen (cheap when nothing changed). */
  layout(luPerUnit: number): void {
    const m = this.model;
    // nothing to place: no marks or strip yet (most units: unhurt, or no spot data), none drawn before
    if (m.marks.length === 0 && m.strip === null && this.marks.length === 0 && this.strip === null) return;
    // culled far off view (the battle view hides the unit; its state still runs): laid out again once it is shown
    if (this.o.body.parent?.visible === false) return;
    if (m.revision === this.laidRev && this.anim === this.laidAnim && this.frame === this.laidFrame && !this.animating) {
      // nothing moved but the hanging strip's sway: turn the strip only (most frames of a damaged unit)
      if (this.strip?.root.visible) this.strip.root.rotation = this.swayAngle();
      return;
    }
    this.laidRev = m.revision;
    this.laidAnim = this.anim;
    this.laidFrame = this.frame;
    this.animating = false;
    const clips = this.entry?.clips?.[this.anim];
    const k = 1 / (luPerUnit || 1);
    // Lite keeps the newest marks only
    const first = this.lite ? Math.max(0, m.marks.length - LITE_MAX_MARKS) : 0;
    let n = 0;
    for (let i = first; i < m.marks.length; i++) {
      const mk = m.marks[i] as PlacedMark;
      const f = frameOf<SpotFrame>(clips?.[mk.slot.spot], this.frame);
      if (!f) continue;
      const node = this.markNode(n++);
      this.placeMark(node, mk, f, k);
    }
    for (let i = n; i < this.marks.length; i++) (this.marks[i] as PartNode).root.visible = false;
    this.placeStrip(clips, k);
  }

  private markNode(i: number): PartNode {
    let node = this.marks[i];
    if (!node) {
      node = new PartNode(this.o.baker);
      this.marks.push(node);
      const after = this.o.after;
      const at = after ? this.o.body.getChildIndex(after) + 1 + i : this.o.body.children.length;
      this.o.body.addChildAt(node.root, Math.min(at, this.o.body.children.length));
    }
    return node;
  }

  private placeMark(node: PartNode, mk: PlacedMark, f: SpotFrame, k: number): void {
    const [x, y, rot, scalePct, visPct] = f;
    // visibility: the share of camera rays that reach the spot; mostly hidden parts hide their marks
    let a = Math.max(0, Math.min(1, (visPct - 35) / 45));
    // the new mark pops in (1.25 -> 1.0 over 90 ms with an overshoot; Reduce motion: a 150 ms fade), a mended one fades
    let pop = 1;
    const age = this.clock - mk.bornMs;
    if (this.reduce) {
      if (age < MARK_FADE_IN_MS) {
        a *= age / MARK_FADE_IN_MS;
        this.animating = true;
      }
    } else if (age < MARK_POP_MS * 1.6) {
      const u = age / (MARK_POP_MS * 1.6);
      pop = 1 + 0.25 * Math.cos(u * Math.PI * 1.5) * (1 - u);
      this.animating = true;
    }
    if (mk.mendAt >= 0) {
      a *= Math.max(0, 1 - (this.clock - mk.mendAt) / MEND_FADE_MS);
      this.animating = true;
    }
    node.root.visible = a > 0.02;
    if (!node.root.visible) return;
    node.set(mk.part);
    const sc = Math.max(0.3, scalePct / 100);
    const size = markSizeLu(mk.slot.r, mk.big, mk.slot.scale) * pop;
    const r = ((rot + mk.slot.turn) * Math.PI) / 180;
    // the patch offset turns and foreshortens with the spot
    const ox = (mk.slot.dx * Math.cos(r) - mk.slot.dy * Math.sin(r)) * sc;
    const oy = (mk.slot.dx * Math.sin(r) + mk.slot.dy * Math.cos(r)) * sc;
    node.root.position.set((x + ox) * k, -(y + oy) * k);
    // counter-clockwise on screen is positive in the data; the body's mirror carries the facing
    node.root.rotation = -r;
    const s = (size / 8) * k;
    node.root.scale.set(s, s * sc);
    node.root.alpha = a;
  }

  private placeStrip(clips: Readonly<Record<string, readonly SpotFrame[]>> | undefined, k: number): void {
    const st = this.model.strip;
    const f = st ? frameOf<SpotFrame>(clips?.[st.spot.id], this.frame) : null;
    if (!st || !f) {
      if (this.strip) this.strip.root.visible = false;
      return;
    }
    if (!this.strip) {
      this.strip = new PartNode(this.o.baker);
      this.strip.tint = mixRgb(this.team, STRIP_DUST, STRIP_DULL);
      const after = this.o.after;
      const at = after ? this.o.body.getChildIndex(after) + 1 : this.o.body.children.length;
      this.o.body.addChildAt(this.strip.root, Math.min(at, this.o.body.children.length));
    }
    const node = this.strip;
    node.set(st.part);
    const [x, y, , , visPct] = f;
    let a = Math.max(0, Math.min(1, (visPct - 35) / 45));
    if (st.mendAt >= 0) a *= Math.max(0, 1 - (this.clock - st.mendAt) / MEND_FADE_MS);
    node.root.visible = a > 0.02;
    node.root.position.set(x * k, -y * k);
    node.root.rotation = this.swayAngle();
    // a foot soldier's strip hangs longer (A-S2: it carries the stage on a small body)
    const len = Math.max(0.6, Math.min(1.6, (st.spot.r || 10) / 11)) * (smallBody(this.family) ? STRIP_SMALL_SCALE : 1);
    node.root.scale.set(len * k, len * k);
    node.root.alpha = a;
    if (st.mendAt >= 0) this.animating = true;
  }

  /** The strip hangs (gravity), swaying a little; Lite and Reduce motion: still (design 6). */
  private swayAngle(): number {
    if (this.lite || this.reduce) return 0;
    return 0.14 * Math.sin((this.stripSway / 520) * Math.PI * 2) + 0.05 * Math.sin((this.stripSway / 210) * Math.PI * 2);
  }

  /**
   * The live emitters in the root's space (lu, y down) through the body's transform `b`, given `hk` (screen lu per
   * sheet lu). The array is reused: valid until the next call.
   */
  emitters(b: DamageXform, hk: number): readonly DamageEmitter[] {
    this.out.length = 0;
    if (this.dead) return this.out;
    const stage = this.model.stage;
    if (stage !== this.specsStage) {
      this.specsStage = stage;
      this.specs = emittersFor(this.family, stage, this.entry?.spots, this.o.heightLu, this.fireSpot());
    }
    if (this.specs.length === 0) return this.out;
    const cs = Math.cos(b.rotation);
    const sn = Math.sin(b.rotation);
    const p = this.pt;
    for (const s of this.specs) {
      if (!emitterPoint(s, this.entry, this.anim, this.frame, this.o.anchors, this.o.heightLu, p)) continue;
      const wx = p[0] * hk * b.sx;
      const wy = -p[1] * hk * b.sy;
      // reused objects: the emitters are read in the frame they are asked for (no allocation per frame)
      const i = this.out.length;
      const e = (this.emitPool[i] ??= { kind: s.kind, x: 0, y: 0, rate: 0, size: 0 });
      e.kind = s.kind as EmitKind;
      e.x = b.x + wx * cs - wy * sn;
      e.y = b.y + wx * sn + wy * cs;
      e.rate = s.rate;
      e.size = s.size * hk;
      this.out.push(e);
    }
    return this.out;
  }

  /** Where the burst of a step plays (root space): the new mark's place on this frame, else the torso's middle. */
  private burstAt(step: DamageStep, b: DamageXform | null, hk: number): { x: number; y: number; spot: boolean } {
    const clips = this.entry?.clips?.[this.anim];
    const f = step.mark ? frameOf<SpotFrame>(clips?.[step.mark.slot.spot], this.frame) : null;
    let px: number;
    let py: number;
    let spot = false;
    if (f) {
      [px, py] = f;
      spot = true;
    } else {
      const torso = frameOf(this.entry?.torso?.[this.anim], this.frame);
      if (torso) {
        torsoPoint('torsoMid', torso, this.pt);
        [px, py] = this.pt;
      } else [px, py] = [this.o.anchors.hitCenter.x, -this.o.anchors.hitCenter.y];
    }
    return { ...toRoot(px, py, b, hk), spot };
  }

  /**
   * Where a burning unit's fire sits (W0 review B1 and S3): `fireAt` over its bundle entry, clear of the crew's heads on
   * every frame; null for a unit that does not burn or has no such place. Asked once per entry.
   */
  private fireSpot(): EmitterAt | null {
    if (this.fire === undefined) this.fire = burns(this.family) ? fireAt(this.entry, this.o.anchors, this.o.heightLu) : null;
    return this.fire;
  }

  /** Where the ignite flare plays on this frame (root space): the fire's place, never the step's mark; null: no flare. */
  private igniteAt(b: DamageXform | null, hk: number): { x: number; y: number } | null {
    const at = this.fireSpot();
    if (!at) return null;
    if (!emitterPoint({ kind: 'fire', at, rate: 0, size: 0 }, this.entry, this.anim, this.frame, this.o.anchors, this.o.heightLu, this.firePt)) return null;
    return toRoot(this.firePt[0], this.firePt[1], b, hk);
  }

  /** The body's transform the burst is placed through (the view sets it before `setHp`, or `xformOf` to ask for it). */
  xform: DamageXform | null = null;
  xformOf: (() => DamageXform) | null = null;
  hk = 1;
  private lastHp = NaN;

  private report(step: DamageStep): void {
    if (this.listeners.length === 0) return;
    const b = this.xformOf ? this.xformOf() : this.xform;
    const at = this.burstAt(step, b, this.hk);
    // the fire catches where the fire burns, clear of the crew (never at the step's mark); no place, no flare
    const ig = step.ignite ? this.igniteAt(b, this.hk) : null;
    const e: DamageStepEvent = {
      stage: step.stage,
      prev: step.prev,
      mend: step.mend,
      x: at.x,
      y: at.y,
      spot: at.spot,
      mat: step.mat,
      kind: step.kind,
      family: this.family,
      heightLu: this.o.heightLu,
      ignite: ig !== null,
      ...(ig ? { igniteX: ig.x, igniteY: ig.y } : {}),
    };
    for (const cb of this.listeners) cb(e);
  }

  /** The last raw bundle entry seen (a puppet keeps only its family). */
  private lastRaw: DamageUnitData | null = null;

  /** The entry as this view may use it: a puppet takes only the family. */
  private usable(e: DamageUnitData | null): DamageUnitData | null {
    this.lastRaw = e;
    if (!e || !this.o.noSpots) return e;
    return { family: e.family };
  }

  /**
   * Counts arrivals of tracker data (item 38 B0): the view's reach and body change with it, so the battle view asks
   * again (`contactRevision`).
   */
  trackersRev = 0;

  /** The bundle came in after the unit spawned: its marks are laid again on its spots, silently. */
  private refreshEntry(): void {
    if (this.bundleVersion === this.bundles.version) return;
    this.bundleVersion = this.bundles.version;
    const raw = this.bundles.entry(this.o.slug);
    if (!raw || raw === this.lastRaw) return;
    this.lastRaw = raw;
    const e = this.usable(raw);
    if (!e) return;
    if (e.torso !== this.entry?.torso || e.head !== this.entry?.head) this.trackersRev++;
    this.entry = e;
    this.specsStage = 0;
    this.fire = undefined;
    if (e.family !== this.family && this.model.stage === 0) {
      // a family the table did not know (before any step, so nothing on screen changes)
      this.family = e.family;
      this.model = new DamageModel(this.family, this.seed, e.spots, defaultMat(this.family, woodenBody(this.o.slug)));
      this.weary = new WearyClock(this.family, this.seed);
      return;
    }
    this.model.setSpots(e.spots, this.clock);
    this.laidRev = -1;
  }

  destroy(): void {
    this.listeners.length = 0;
  }
}
