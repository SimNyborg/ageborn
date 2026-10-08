/**
 * Draws a `CollapseWorld` (DESIGN A11 destroyed collapse, A12): the base frame cut into textured
 * meshes along the fracture (team underlay, the frame, a dark rim that reads as the broken edge and
 * the piece's thickness), the cracks spreading in the build-up, the failing shield of the energy ages,
 * the flag poles snapping, the lights dying on their pieces, the collapse kit's 3D debris and rubble
 * heaps, and every particle of the world. All timing comes from the world (fixed steps, seeded), so
 * this class only mirrors state.
 *
 * Layers (bottom to top): stump, heaps, pieces, debris, flags, dust and smoke, additive light.
 */
import { Container, earcut, Graphics, Mesh, MeshGeometry, Sprite, Texture } from 'pixi.js';
import type { PartBaker } from '../../../bake';
import { FX_ZONES } from '../../../effects/sprites';
import { partSprite } from '../../procedural/shared';
import { clipDurations, frameIndex, setFrame, type WorldSheet } from '../../worldAtlas';
import { texRect, type ViewMotion } from '../upgradeFx';
import { fracture, insidePoly, type Fracture, type Mask, type Rect, type Vec } from './fracture';
import type { CollapseMaterial, CollapseProfile } from './profiles';
import { CollapseWorld, collapseBeats, type Beats, type BodyPose, type ParticleKind, type WorldOptions } from './world';

export interface CollapseFlag {
  clip: string;
  z: 'front' | 'back';
}

export interface CollapseViewOptions {
  sheet: WorldSheet;
  /** Body frame index (the crumble stage). */
  stage: number;
  teamColor: number;
  /** A cosmetic base skin's body tint, or null. */
  skinTint: number | null;
  decor: PartBaker;
  profile: CollapseProfile;
  seed: number;
  motion: ViewMotion;
  /** The age's collapse kit (3D debris and rubble heaps), when loaded. */
  kit: WorldSheet | null;
  /** The visible flags (their poles snap). */
  flags: readonly CollapseFlag[];
  /** Flag animation clock (ms), so the flags keep their phase. */
  clockMs: number;
  /** Light glow colour and spots (lu, y down). */
  lightColor: number;
  lights: readonly Vec[];
  smokeSpots: readonly Vec[];
  /** The Treasury prop's rect (lu), when there is one. */
  treasury: Rect | null;
}

/** World pose of a mount during the collapse (lu, the base's local unmirrored space). */
export interface LocalMountPose {
  x: number;
  y: number;
  rotation: number;
  landed: boolean;
}

const PART_OF: Partial<Record<ParticleKind, string>> = {
  puff: 'fx.p.dust',
  dust: 'fx.p.cloud',
  smoke: 'fx.p.smoke',
  smokeLobe: 'fx.p.smokeLobe',
  fire: 'fx.p.fireLobe',
  flame: 'fx.p.fireLobe',
  ember: 'fx.p.glow',
  spark: 'fx.p.spark',
  sparkHot: 'fx.p.sparkHot',
  glow: 'fx.p.glow',
  ring: 'fx.p.ringThick',
  ringThin: 'fx.p.ring',
  shard: 'fx.p.shard',
  timber: 'fx.p.timber',
  coin: 'fx.p.coin',
  bolt: 'fx.p.bolt',
  rag: 'fx.p.dust',
};
const ROCK_PARTS = ['fx.p.rock', 'fx.p.rock2', 'fx.p.slab'];
/**
 * Dust and smoke bake white, so the particle tint is exactly the age's dust or smoke colour (the
 * stock palette bakes them grey, and a light tint on grey turns into a dark, heavy cloud).
 */
const WHITE_ZONES: Readonly<Record<string, number>> = { ...FX_ZONES, smoke: 0xffffff, smoke2: 0xe6e6e6, dust: 0xffffff, dust2: 0xe6e6e6 };
const WHITE_KINDS: ReadonlySet<ParticleKind> = new Set(['puff', 'dust', 'smoke']);

// ---------------------------------------------------------------------------------------------
// Alpha mask

const maskCache = new WeakMap<Texture, Mask | null>();

/**
 * The opaque art of a frame as a lookup in lu (sprite-local, y down), read back once from the sheet
 * through a small canvas at about 2 lu per cell. Null where there is no canvas (tests, headless).
 */
export function alphaMask(tex: Texture | undefined, k: number): Mask | null {
  if (!tex || tex === Texture.EMPTY) return null;
  if (maskCache.has(tex)) return maskCache.get(tex) ?? null;
  let out: Mask | null = null;
  try {
    const r = texRect(tex);
    const res = (tex.source as unknown as { _resolution?: number; resolution?: number })._resolution ?? tex.source.resolution ?? 1;
    const resource = tex.source.resource as CanvasImageSource | undefined;
    if (r && resource && typeof document !== 'undefined') {
      const gw = Math.max(1, Math.ceil((r.w * k) / 2));
      const gh = Math.max(1, Math.ceil((r.h * k) / 2));
      const c = document.createElement('canvas');
      c.width = gw;
      c.height = gh;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const f = tex.frame;
        ctx.drawImage(resource, f.x * res, f.y * res, f.width * res, f.height * res, 0, 0, gw, gh);
        const data = ctx.getImageData(0, 0, gw, gh).data;
        const a = new Uint8Array(gw * gh);
        for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3] ?? 0;
        out = (x, y) => {
          const u = (x / k - r.x) / r.w;
          const v = (y / k - r.y) / r.h;
          if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
          return (a[Math.floor(v * gh) * gw + Math.floor(u * gw)] ?? 0) / 255;
        };
      }
    }
  } catch {
    out = null;
  }
  maskCache.set(tex, out);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Meshes

function clipToRect(poly: readonly Vec[], R: Rect): Vec[] {
  let pts = poly.slice();
  const edges: [number, number, number][] = [
    [1, 0, R.x + R.w],
    [-1, 0, -R.x],
    [0, 1, R.y + R.h],
    [0, -1, -R.y],
  ];
  for (const [nx, ny, c] of edges) {
    const out: Vec[] = [];
    for (let i = 0; i < pts.length; i++) {
      const S = pts[i]!;
      const E = pts[(i + 1) % pts.length]!;
      const dS = nx * S.x + ny * S.y - c;
      const dE = nx * E.x + ny * E.y - c;
      if (dS <= 0) out.push(S);
      if (dS <= 0 !== dE <= 0) {
        const t = dS / (dS - dE);
        out.push({ x: S.x + t * (E.x - S.x), y: S.y + t * (E.y - S.y) });
      }
    }
    pts = out;
    if (pts.length < 3) return [];
  }
  return pts;
}

/**
 * A textured mesh of the part of `tex` inside `poly` (lu, sprite-local), positioned around (cx, cy).
 * UVs follow Pixi's texture matrix, which maps 0..1 over the untrimmed frame; the polygon is first
 * clipped to the trimmed frame so no neighbouring atlas sprite can bleed in.
 */
function polyMesh(tex: Texture | undefined, poly: readonly Vec[], cx: number, cy: number, k: number): Mesh | null {
  const r = texRect(tex);
  if (!tex || !r) return null;
  const R = { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k };
  const pts = clipToRect(poly, R);
  if (pts.length < 3) return null;
  const a = tex.defaultAnchor ?? { x: 0, y: 0 };
  const ow = tex.orig.width;
  const oh = tex.orig.height;
  const pos = new Float32Array(pts.length * 2);
  const uv = new Float32Array(pts.length * 2);
  pts.forEach((p, i) => {
    pos[i * 2] = p.x - cx;
    pos[i * 2 + 1] = p.y - cy;
    uv[i * 2] = (p.x / k + a.x * ow) / ow;
    uv[i * 2 + 1] = (p.y / k + a.y * oh) / oh;
  });
  const idx = earcut(Array.from(pos));
  if (idx.length < 3) return null;
  const geometry = new MeshGeometry({ positions: pos, uvs: uv, indices: new Uint32Array(idx) });
  // Always through the sprite batcher: a mesh over 100 vertices would otherwise take Pixi's own mesh
  // pipeline, whose shader compiles on first use, a long stall on the very frame the base breaks.
  geometry.batchMode = 'batch';
  return new Mesh({ geometry, texture: tex });
}

function mulColor(c: number, k: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
  const b = Math.min(255, Math.round((c & 255) * k));
  return (r << 16) | (g << 8) | b;
}

function lerpColor(a: number, b: number, t: number): number {
  const u = Math.max(0, Math.min(1, t));
  const ch = (s: number): number => Math.round(((a >> s) & 255) * (1 - u) + ((b >> s) & 255) * u);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * The start of a collapse is spread over its first frames (the first update runs on the frame of the
 * end itself): the dry run that finds the landing beat on the second, the chunk meshes on the third.
 * The break (520 ms in) forces both if the frames ran long.
 */
const BEATS_AT_FRAME = 2;
const BUILD_AT_FRAME = 3;

interface ChunkDisplay {
  c: Container;
  rim: Mesh | null;
  team: Mesh | null;
  main: Mesh | null;
  glow: Container | null;
}

interface FlagPiece {
  clip: string;
  c: Container;
  team: Sprite;
  base: Sprite;
  /** Pole base (lu, rest). */
  px: number;
  py: number;
  chunk: number;
  /** Snap: rotation target, the time it snaps, then a free flutter. */
  dir: 1 | -1;
  snapAt: number;
  free: boolean;
  x: number;
  y: number;
  vy: number;
  rot: number;
  spin: number;
  phase: number;
  landed: boolean;
}

export class CollapseView {
  readonly root = new Container();
  readonly world: CollapseWorld;
  /**
   * The collapse's beats and its sound material. The landing comes from a dry run of the same world,
   * done a frame into the build-up (it is needed at the earliest 250 ms after the break) and written
   * into this same object, so a caller holding it sees the final value.
   */
  readonly beats: Beats & { material: CollapseMaterial };
  readonly fracture: Fracture;
  /** Crack lines drawn over the trembling body (the base view adds it to its body). */
  readonly cracks = new Graphics();
  readonly cracksGlow = new Graphics();
  private readonly stumpLayer = new Container();
  private readonly heapLayer = new Container();
  private readonly chunkLayer = new Container();
  private readonly debrisLayer = new Container();
  private readonly flagLayer = new Container();
  private readonly frontLayer = new Container();
  private readonly addLayer = new Container();
  private readonly shield: Container | null = null;
  private readonly chunks = new Map<number, ChunkDisplay>();
  private readonly sprites = new Map<number, Container>();
  private readonly pool = new Map<string, Container[]>();
  private readonly flagPieces: FlagPiece[] = [];
  private readonly mountChunk: number[] = [];
  private readonly k: number;
  private shown = false;
  private heaps = false;
  private readonly heapItems: { c: Container; k: number; bottom: number; t0: number }[] = [];
  private destroyed = false;
  /** The body frames waiting to be cut into meshes (`ensureBuilt`). */
  private pending: { main: Texture | undefined; team: Texture | undefined } | null = null;
  /** The world's options, kept for the deferred dry run (null once the beats are final). */
  private worldOpts: WorldOptions | null;
  /** Updates so far (the deferred work counts frames, not world time, so 2x speed defers it too). */
  private frames = 0;
  private stamp = 0;
  private readonly seen = new Map<number, number>();

  constructor(private readonly o: CollapseViewOptions) {
    const A = o.sheet.animations;
    const k = o.sheet.luPerUnit;
    this.k = k;
    const stage = Math.max(0, Math.min((A['body']?.length ?? 1) - 1, o.stage));
    const main = A['body']?.[stage];
    const team = A['body_team']?.[stage];
    const rm = texRect(main);
    const rt = texRect(team);
    const rect: Rect = rm ? { x: rm.x * k, y: rm.y * k, w: rm.w * k, h: rm.h * k } : { x: -180, y: -300, w: 200, h: 300 };
    if (rt) {
      const x0 = Math.min(rect.x, rt.x * k);
      const y0 = Math.min(rect.y, rt.y * k);
      rect.w = Math.max(rect.x + rect.w, (rt.x + rt.w) * k) - x0;
      rect.h = Math.max(rect.y + rect.h, (rt.y + rt.h) * k) - y0;
      rect.x = x0;
      rect.y = y0;
    }
    const mm = alphaMask(main, k);
    const mt = alphaMask(team, k);
    const mask: Mask | null = mm || mt ? (x, y) => Math.max(mm ? mm(x, y) : 0, mt ? mt(x, y) : 0) : null;
    const p = o.profile;
    const lite = o.motion.lite;
    this.fracture = fracture({
      rect,
      mask,
      seed: o.seed,
      cells: Math.round(p.cells * (lite ? 0.55 : 1)),
      stumpLu: p.stumpLu,
      aspect: p.aspect,
      topple: p.topple,
    });
    const tr = o.treasury;
    const worldOpts = {
      fracture: this.fracture,
      profile: p,
      seed: o.seed,
      lite,
      reduce: o.motion.reduce,
      kitFrames: o.kit?.animations['piece']?.length ?? 0,
      treasuryAt: tr ? { x: tr.x + tr.w / 2, y: tr.y + tr.h * 0.4 } : null,
      lights: o.lights,
      smokeSpots: o.smokeSpots,
    };
    this.world = new CollapseWorld(worldOpts);
    const brk = this.world.breakMs;
    this.beats = { breakMs: brk, landMs: brk + (o.motion.reduce ? 700 : 620), settleMs: brk + 1400, material: p.material };
    this.worldOpts = worldOpts;
    this.root.addChild(this.stumpLayer, this.heapLayer, this.chunkLayer, this.debrisLayer, this.flagLayer, this.frontLayer, this.addLayer);
    this.addLayer.blendMode = 'add';
    this.cracksGlow.blendMode = 'add';
    if (p.shield) {
      const s = partSprite(o.decor, 'fx.p.hexDome', FX_ZONES);
      s.tint = p.colors.energy;
      s.blendMode = 'add';
      s.position.set(rect.x + rect.w * 0.52, 2);
      s.scale.set((rect.w * 1.25) / 100, (rect.h * 1.04) / 60);
      s.alpha = 0;
      this.shield = s;
      this.addLayer.addChild(s);
    }
    // the pieces are only seen from the break on: they are built a few frames into the build-up, so
    // the frame of the end does not also pay for them
    this.pending = { main, team };
    for (const [x, y] of o.sheet.meta.mountsLu ?? []) this.mountChunk.push(this.chunkAt(x, -y));
    this.chunkLayer.visible = false;
    this.stumpLayer.visible = false;
    this.flagLayer.visible = false;
  }

  /** Builds the chunk meshes and the flag pieces (once; before the break at the latest). */
  private ensureBuilt(): void {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    this.buildChunks(p.main, p.team, this.k);
    this.buildFlags();
  }

  // ------------------------------------------------------------------------------------------
  // Build

  private buildChunks(main: Texture | undefined, team: Texture | undefined, k: number): void {
    const o = this.o;
    const lite = o.motion.lite;
    const cellOf = new Map(this.fracture.cells.map((c) => [c.id, c]));
    for (const ch of this.world.chunks) {
      const cell = cellOf.get(ch.id);
      if (!cell) continue;
      const c = new Container();
      c.position.set(ch.rx, ch.ry);
      const mMain = polyMesh(main, cell.poly, ch.rx, ch.ry, k);
      const mTeam = polyMesh(team, cell.poly, ch.rx, ch.ry, k);
      let rim: Mesh | null = null;
      if (!lite && mMain && !ch.static) {
        rim = polyMesh(main, cell.poly, ch.rx, ch.ry, k);
        if (rim) {
          rim.tint = 0x2a2420;
          rim.alpha = 0.92;
          const s = 1 + Math.min(0.12, 2.4 / Math.max(8, cell.radius));
          rim.scale.set(s);
          c.addChild(rim);
        }
      }
      if (mTeam) {
        mTeam.tint = o.teamColor;
        c.addChild(mTeam);
      }
      if (mMain) {
        if (o.skinTint !== null) mMain.tint = o.skinTint;
        c.addChild(mMain);
      }
      (ch.static ? this.stumpLayer : this.chunkLayer).addChild(c);
      this.chunks.set(ch.id, { c, rim, team: mTeam, main: mMain, glow: null });
    }
    // the lights die on their pieces
    for (const l of o.lights) {
      const id = this.chunkAt(l.x, l.y);
      const d = this.chunks.get(id);
      const ch = this.world.chunks.find((q) => q.id === id);
      if (!d || !ch) continue;
      const g = partSprite(o.decor, 'fx.p.glow', FX_ZONES);
      g.tint = o.lightColor;
      g.blendMode = 'add';
      g.position.set(l.x - ch.rx, l.y - ch.ry);
      g.scale.set(1.8);
      g.alpha = 0.5;
      d.c.addChild(g);
      d.glow = g;
    }
  }

  private buildFlags(): void {
    const A = this.o.sheet.animations;
    const k = this.k;
    for (const f of this.o.flags) {
      const tex = A[f.clip]?.[0];
      const r = texRect(tex);
      if (!r) continue;
      // the pole stands at the flag frame's right edge (the cloth trails toward -x)
      const px = (r.x + r.w - 2) * k;
      const py = (r.y + r.h) * k;
      const c = new Container();
      const art = new Container();
      art.scale.set(k);
      const team = new Sprite(Texture.EMPTY);
      team.tint = this.o.teamColor;
      const base = new Sprite(Texture.EMPTY);
      art.addChild(team, base);
      art.position.set(-px, -py);
      c.addChild(art);
      c.position.set(px, py);
      this.flagLayer.addChild(c);
      const chunk = this.chunkAt(px, py - 4);
      const n = this.flagPieces.length;
      this.flagPieces.push({ clip: f.clip, c, team, base, px, py, chunk, dir: n % 2 === 0 ? 1 : -1, snapAt: this.world.breakMs + 120 + n * 90, free: false, x: px, y: py, vy: 0, rot: 0, spin: 0, phase: n * 1.7, landed: false });
    }
    this.flagLayer.visible = false;
  }

  /** The chunk containing a point (lu), else the nearest one. */
  private chunkAt(x: number, y: number): number {
    let best = -1;
    let bestD = Infinity;
    for (const c of this.fracture.cells) {
      if (c.kind === 'empty') continue;
      if (insidePoly(c.poly, x, y)) return c.id;
      const d = Math.hypot(c.cx - x, c.cy - y);
      if (d < bestD) {
        bestD = d;
        best = c.id;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------------------------------
  // Frame

  /** True once the base has given way (the base view hides its body then). */
  get broken(): boolean {
    return this.world.broken;
  }

  bodyPose(): BodyPose {
    return this.world.bodyPose();
  }

  lightFactor(): number {
    return this.world.lightFactor();
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.world.update(dtMs);
    const w = this.world;
    this.frames++;
    if (this.worldOpts && (w.broken || this.frames >= BEATS_AT_FRAME)) {
      Object.assign(this.beats, collapseBeats(this.worldOpts));
      this.worldOpts = null;
    }
    if (this.pending && (w.broken || this.frames >= BUILD_AT_FRAME)) this.ensureBuilt();
    if (!w.broken) {
      this.drawCracks();
      if (this.shield) this.shield.alpha = w.shieldAlpha();
    } else if (!this.shown) {
      this.shown = true;
      this.chunkLayer.visible = true;
      this.stumpLayer.visible = true;
      this.flagLayer.visible = true;
      this.cracks.clear();
      this.cracksGlow.clear();
      if (this.shield) this.shield.visible = false;
    }
    if (w.broken) {
      this.syncChunks();
      this.syncFlags(dtMs);
      if (!this.heaps && w.t >= w.breakMs + 260) this.placeHeaps();
      for (const h of this.heapItems) {
        const u = Math.max(0, Math.min(1, (w.t - h.t0) / 520));
        const e = 1 - (1 - u) * (1 - u);
        h.c.scale.set(h.k, h.k * (0.35 + 0.65 * e));
        h.c.y = 3 - h.bottom * (0.35 + 0.65 * e);
        h.c.alpha = Math.min(1, u * 3);
      }
    }
    this.syncParticles();
  }

  private drawCracks(): void {
    const g = this.cracks;
    const glow = this.cracksGlow;
    g.clear();
    glow.clear();
    const energy = this.o.profile.flicker;
    const flick = energy ? this.world.lightFactor() > 0.5 : true;
    for (const c of this.fracture.cracks) {
      const v = this.world.crackReveal(c.t0, c.t1);
      if (v <= 0) continue;
      const pts = c.pts;
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
      let left = len * v;
      const path: Vec[] = [pts[0]!];
      for (let i = 1; i < pts.length && left > 0; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d <= left) {
          path.push(b);
          left -= d;
        } else {
          path.push({ x: a.x + ((b.x - a.x) * left) / d, y: a.y + ((b.y - a.y) * left) / d });
          left = 0;
        }
      }
      const width = c.main ? 3.2 : 2.1;
      const stroke = (gr: Graphics, dx: number, dy: number): void => {
        gr.moveTo(path[0]!.x + dx, path[0]!.y + dy);
        for (let i = 1; i < path.length; i++) gr.lineTo(path[i]!.x + dx, path[i]!.y + dy);
      };
      // a chipped light edge under the dark groove
      stroke(g, 0.9, 0.9);
      g.stroke({ width: width * 0.55, color: 0xf2e8d6, alpha: 0.32, cap: 'round', join: 'round' });
      stroke(g, 0, 0);
      g.stroke({ width, color: 0x1f1a17, alpha: 0.88, cap: 'round', join: 'round' });
      if (energy && flick) {
        stroke(glow, 0, 0);
        glow.stroke({ width: width * 2.6, color: this.o.profile.colors.energy, alpha: 0.42, cap: 'round', join: 'round' });
        stroke(glow, 0, 0);
        glow.stroke({ width: width * 0.7, color: 0xffffff, alpha: 0.8, cap: 'round', join: 'round' });
      } else if (!energy && c.main && v > 0.6) {
        // light seeps through the widest cracks just before the break (fire glow inside)
        stroke(glow, 0, 0);
        glow.stroke({ width: width * 1.6, color: this.o.lightColor, alpha: 0.28 * (v - 0.6) * 2.5, cap: 'round', join: 'round' });
      }
    }
  }

  private syncChunks(): void {
    const w = this.world;
    const since = w.t - w.breakMs;
    const soot = this.o.profile.colors.soot;
    const sootK = Math.max(0, Math.min(1, (since - 350) / 900));
    for (const ch of w.chunks) {
      const d = this.chunks.get(ch.id);
      if (!d) continue;
      d.c.position.set(ch.x, ch.y);
      d.c.rotation = ch.a;
      d.c.alpha = ch.alpha;
      if (ch.static) {
        // the stump scorches
        const t = lerpColor(0xffffff, soot, sootK);
        if (d.main) d.main.tint = this.o.skinTint !== null ? mulColor(this.o.skinTint, ((t >> 16) & 255) / 255) : t;
        if (d.team) d.team.tint = mulColor(this.o.teamColor, ((t >> 16) & 255) / 255);
      } else {
        // tumbling pieces turn in and out of the light; the rim keeps its thickness downward
        const shade = 1 - 0.16 * Math.abs(Math.sin(ch.a));
        if (d.main) d.main.tint = mulColor(this.o.skinTint ?? 0xffffff, shade);
        if (d.team) d.team.tint = mulColor(this.o.teamColor, shade);
        if (d.rim) {
          const c = Math.cos(-ch.a);
          const s = Math.sin(-ch.a);
          d.rim.position.set(-2.2 * s, 2.2 * c);
        }
      }
      if (d.glow) {
        const u = since / (this.o.profile.flicker ? 520 : 460);
        const flick = this.o.profile.flicker ? (Math.floor(w.t / 50) % 3 === 0 ? 0.2 : 1) : 1;
        d.glow.alpha = Math.max(0, 0.55 * (1 - u)) * flick;
        if (u >= 1) d.glow.visible = false;
      }
    }
  }

  private syncFlags(dtMs: number): void {
    const w = this.world;
    const A = this.o.sheet.animations;
    for (const f of this.flagPieces) {
      // the cloth keeps waving, faster while it falls
      const durs = clipDurations(this.o.sheet, f.clip);
      const i = frameIndex(durs, (this.o.clockMs + w.t * (f.free ? 1.8 : 1.2)) % 100000, true);
      setFrame(f.base, A[f.clip]?.[i]);
      setFrame(f.team, A[`${f.clip}_team`]?.[i]);
      const ch = w.chunks.find((q) => q.id === f.chunk);
      if (!f.free) {
        // riding its piece, then the pole snaps over
        let x = f.px;
        let y = f.py;
        let rot = 0;
        if (ch) {
          const dx = f.px - ch.rx;
          const dy = f.py - ch.ry;
          x = ch.x + dx * Math.cos(ch.a) - dy * Math.sin(ch.a);
          y = ch.y + dx * Math.sin(ch.a) + dy * Math.cos(ch.a);
          rot = ch.a;
        }
        const snap = w.t >= f.snapAt ? Math.min(1, (w.t - f.snapAt) / 260) : 0;
        f.x = x;
        f.y = y;
        f.rot = rot + f.dir * 1.5 * snap * snap;
        if (snap >= 1 || this.o.motion.reduce) {
          f.free = true;
          f.vy = 20;
          f.spin = f.dir * 1.2;
        }
      } else if (!f.landed) {
        // a banner flutters down: a slow fall with a swing
        const dt = Math.min(0.1, dtMs / 1000);
        f.vy = Math.min(85, f.vy + 260 * dt);
        f.y += f.vy * dt;
        f.x += Math.sin(w.t / 230 + f.phase) * 34 * dt + 10 * dt;
        f.rot += f.spin * dt;
        f.spin *= 1 - 0.6 * dt;
        if (f.y >= -2) {
          f.y = -2;
          f.landed = true;
        }
      }
      f.c.position.set(f.x, f.y);
      f.c.rotation = f.rot;
      if (f.landed) f.c.alpha = Math.max(0, f.c.alpha - dtMs / 2600);
    }
  }

  private placeHeaps(): void {
    this.heaps = true;
    const R = this.fracture.rect;
    const kit = this.o.kit;
    const heaps = kit?.animations['heap'] ?? [];
    if (heaps.length > 0 && kit) {
      // the small heap at the back first, the wide one in front over the stump's foot
      [1, 0].forEach((i) => {
        const t = heaps[i];
        const r = texRect(t);
        if (!t || !r) return;
        const s = new Sprite(Texture.EMPTY);
        setFrame(s, t);
        const k = kit.luPerUnit;
        // seat the heap's bottom edge on the ground; it rises out of the dust
        const bottom = (r.y + r.h) * k;
        const c = new Container();
        c.addChild(s);
        c.scale.set(k);
        c.position.set(R.x + R.w * (i === 0 ? 0.56 : 0.2), 3 - bottom);
        this.heapLayer.addChild(c);
        this.heapItems.push({ c, k, bottom, t0: this.world.t + i * 70 });
      });
      return;
    }
    // no kit: a heap of code-drawn rubble along the footprint
    const rub = this.o.profile.colors.rubble;
    for (let i = 0; i < 9; i++) {
      const s = partSprite(this.o.decor, ROCK_PARTS[i % 3]!, FX_ZONES);
      s.tint = rub[i % rub.length] ?? 0x8c7b68;
      s.position.set(R.x + 14 + (R.w - 20) * (i / 8), -3 - (i % 3) * 3);
      s.scale.set(2.2 + (i % 3) * 0.5);
      s.rotation = i * 1.3;
      this.heapLayer.addChild(s);
    }
  }

  private take(key: string, make: () => Container): Container {
    const list = this.pool.get(key);
    const s = list?.pop();
    if (s) {
      s.visible = true;
      return s;
    }
    return make();
  }

  private syncParticles(): void {
    this.stamp++;
    const kit = this.o.kit;
    for (const q of this.world.particles) {
      let s = this.sprites.get(q.id);
      if (!s) {
        const key = q.kind === 'kit' ? `kit${q.frame}` : q.kind === 'rock' ? `rock${q.frame}` : q.kind;
        if (q.kind === 'rag' && !kit) continue;
        s = this.take(key, () => {
          if (q.kind === 'kit' || q.kind === 'rag') {
            // kit frames are anchored at the piece's centre (the sheet's feet), so they spin about it
            const clip = q.kind === 'rag' ? 'rag' : 'piece';
            const c = new Container();
            const team = kit?.animations[`${clip}_team`]?.[q.frame];
            if (team && texRect(team)) {
              const ts = new Sprite(Texture.EMPTY);
              setFrame(ts, team);
              ts.tint = this.o.teamColor;
              c.addChild(ts);
            }
            const sp = new Sprite(Texture.EMPTY);
            setFrame(sp, kit?.animations[clip]?.[q.frame]);
            c.addChild(sp);
            return c;
          }
          const id = q.kind === 'rock' ? (ROCK_PARTS[q.frame % ROCK_PARTS.length] ?? 'fx.p.rock') : (PART_OF[q.kind] ?? 'fx.p.dust');
          return partSprite(this.o.decor, id, WHITE_KINDS.has(q.kind) ? WHITE_ZONES : FX_ZONES);
        });
        (s as Container & { __key?: string }).__key = key;
        if (q.kind !== 'rag') s.tint = q.tint;
        s.blendMode = q.add ? 'add' : 'normal';
        const layer = q.add ? this.addLayer : q.kind === 'kit' || q.kind === 'rag' || q.kind === 'rock' || q.kind === 'timber' || q.kind === 'coin' || q.kind === 'flame' ? this.debrisLayer : this.frontLayer;
        layer.addChild(s);
        this.sprites.set(q.id, s);
      }
      this.seen.set(q.id, this.stamp);
      s.visible = q.alpha > 0.004;
      if (!s.visible) continue;
      const kitScale = q.kind === 'kit' || q.kind === 'rag' ? (kit?.luPerUnit ?? 1) : 1;
      let sc = q.scale * kitScale;
      if (q.kind === 'flame') sc *= 0.9 + 0.12 * Math.sin(this.world.t / 61 + q.phase) + 0.06 * Math.sin(this.world.t / 23 + q.phase);
      s.position.set(q.x + CollapseWorld.swayOf(q), q.y);
      s.rotation = q.rot;
      s.scale.set(sc, sc * q.flatY);
      s.alpha = Math.min(1, q.alpha);
    }
    for (const [id, s] of this.sprites) {
      if (this.seen.get(id) === this.stamp) continue;
      this.sprites.delete(id);
      this.seen.delete(id);
      s.visible = false;
      s.parent?.removeChild(s);
      const key = (s as Container & { __key?: string }).__key ?? '';
      let list = this.pool.get(key);
      if (!list) this.pool.set(key, (list = []));
      if (list.length < 40) list.push(s);
      else s.destroy({ children: true });
    }
  }

  /** Where mount `i` is now (lu, local unmirrored), riding its piece. */
  mountPose(i: number): LocalMountPose | null {
    const id = this.mountChunk[i];
    const m = this.o.sheet.meta.mountsLu?.[i];
    if (id === undefined || id < 0 || !m) return null;
    const ch = this.world.chunks.find((q) => q.id === id);
    if (!ch) return null;
    const mx = m[0];
    const my = -m[1];
    if (!this.world.broken) {
      const p = this.world.bodyPose();
      return { x: mx + p.ox, y: my + p.oy, rotation: p.rot, landed: false };
    }
    const dx = mx - ch.rx;
    const dy = my - ch.ry;
    const cos = Math.cos(ch.a);
    const sin = Math.sin(ch.a);
    return { x: ch.x + dx * cos - dy * sin, y: ch.y + dx * sin + dy * cos, rotation: ch.a, landed: ch.static || ch.landedMs >= 0 || ch.sleeping };
  }

  /** Test and gallery hooks. */
  get stats(): { chunks: number; particles: number; broken: boolean; t: number; settled: boolean } {
    return { chunks: this.world.chunks.length, particles: this.world.particles.length, broken: this.world.broken, t: this.world.t, settled: this.world.settled };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const list of this.pool.values()) for (const s of list) s.destroy({ children: true });
    this.pool.clear();
    this.sprites.clear();
    this.cracks.destroy();
    this.cracksGlow.destroy();
    if (!this.root.destroyed) this.root.destroy({ children: true });
  }
}
