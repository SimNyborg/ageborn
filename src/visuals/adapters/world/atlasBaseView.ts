/**
 * Sprite-sheet base view (DESIGN A11 Bases and Base clips) for the 3D-rendered bases.
 *
 * Frames: the body per crumble stage (75/50/25%), waving flags (looping clips, dropped by crumble
 * stage), Treasury props per level. Code motion on top: torch and window light flicker, damage
 * smoke from stage 2, hit shake with a white flash and debris, the Treasury pop, the Last Stand
 * horn and glow, the 1.8 s evolve morph (squash, flash, swap, rebuild) and the collapse.
 *
 * The root sits on the gate at ground level; side 1 is mirrored. `mountPoints()` returns the
 * sheet's `mountsLu`: the turret platforms modelled into each base (the same four points in every
 * age, `WORLD_BASE_MOUNTS_LU`), so turrets and tap targets sit on real ledges and never move on a morph.
 *
 * A soft contact shadow sits under the base (like the units'). Hits and crumbles knock off a few
 * rounded chunks in the base's own palette that spin, fall and bounce; the collapse throws 16 big
 * chunks and four slow dust billows (the live chunk count is capped). The evolve flash is a warm,
 * additive glow capped at 55% so the morph stays visible under it, and it fades while the base waits
 * for the next age's sheet.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import type { BaseView, VisualDef } from '@/contracts/art';
import type { AgeId, Pt, Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import type { PartBaker } from '../../bake';
import { FX_ZONES } from '../../effects/sprites';
import { CLIP_TIMING } from '../../style';
import { partSprite, PuffList } from '../procedural/shared';
import { clipDurations, frameIndex, setFrame, type WorldAtlas, type WorldSheet } from '../worldAtlas';

export interface AtlasBaseOptions {
  age: AgeId;
  side: Side;
  teamColor: number;
  decor: PartBaker;
  seed: number;
  world: WorldAtlas;
  /** The sheet source of an age's base (for morphs); undefined when that age has no sheet. */
  sourceFor: (age: AgeId) => string | undefined;
  def: VisualDef;
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

/** Rubble tints per age: the base's own large-area colours (wall, dark stone, accent material). */
const RUBBLE_COLORS: Record<AgeId, readonly number[]> = {
  stone: [0x8c7b68, 0x77695a, 0xa08e78, 0x6e8b3d],
  medieval: [0x9a9c98, 0x7c7f80, 0xaeb0aa, 0x7a5e44],
  gunpowder: [0xb8a88a, 0x9a8c72, 0xcabb9c, 0x857860],
  modern: [0xa29f96, 0x86837b, 0xb6b3a9, 0x62664a],
  future: [0xbfc4cb, 0x3a3f4a, 0xced3d9, 0x23262e],
};
const DUST_COLORS: Record<AgeId, number> = { stone: 0xb8a88e, medieval: 0xb4b2aa, gunpowder: 0xcfc2a6, modern: 0xb0ada4, future: 0xa8adb8 };
/** At most this many rubble chunks live at once (hits, crumbles and the collapse share it). */
const MAX_CHUNKS = 40;
const EVOLVE_FLASH_MAX = 0.55;

interface Chunk {
  s: Container;
  vx: number;
  vy: number;
  spin: number;
  age: number;
  life: number;
  bounces: number;
}

const LIGHT_COLORS: Record<AgeId, number> = {
  stone: 0xffc27a,
  medieval: 0xffd08a,
  gunpowder: 0xffd89a,
  modern: 0xf2ecd2,
  future: 0x9ff5d8,
};

export class AtlasBaseView implements BaseView {
  readonly root = new Container();
  private readonly body = new Container();
  private readonly art = new Container();
  private readonly lightLayer = new Container();
  private readonly overlay = new Container();
  private readonly glow: Container;
  private readonly horn: Container;
  private readonly puffs: PuffList;
  private readonly chunkLayer = new Container();
  private chunks: Chunk[] = [];
  private readonly shadow: Container;
  private readonly rng: CosmeticRng;
  private readonly facing: 1 | -1;
  private sheet: WorldSheet;
  private age: AgeId;
  private backFlags: Pair[] = [];
  private frontFlags: Pair[] = [];
  private bodyPair: Pair;
  private treasuryPair: Pair;
  private readonly flash: Sprite;
  private lights: { s: Container; phase: number; crumbleMax: number; a: number }[] = [];
  private crumble = 0;
  private treasury = 0;
  private clockMs = 0;
  private shakeMs = 0;
  private flashMs = 0;
  private popMs = 0;
  private smokeAcc = 0;
  private hornOn = false;
  private morph: { age: AgeId; t: number; ms: number; hold: number; swapped: boolean; next: WorldSheet | null } | null = null;
  private collapseT = -1;
  private destroyed = false;

  constructor(private readonly o: AtlasBaseOptions) {
    const s = o.world.get(o.def.source);
    if (!s) throw new Error(`World sheet "${o.def.source}" is not loaded`);
    this.sheet = s;
    this.age = o.age;
    this.facing = o.side === 0 ? 1 : -1;
    this.rng = mulberry32(o.seed);
    this.root.label = o.def.source;
    this.bodyPair = pair(o.teamColor);
    this.treasuryPair = pair(o.teamColor);
    this.flash = new Sprite(Texture.EMPTY);
    this.flash.blendMode = 'add';
    this.flash.tint = 0xfff0d8;
    this.flash.visible = false;
    this.body.addChild(this.art, this.lightLayer);
    this.body.scale.x = this.facing;
    this.glow = partSprite(o.decor, 'fx.p.glow', FX_ZONES);
    this.glow.tint = 0xffb3a0;
    this.glow.visible = false;
    this.horn = partSprite(o.decor, 'icon.horn', { ...FX_ZONES, bone: 0xede3c8, metal: 0x9aa3ab });
    this.horn.visible = false;
    // soft contact shadow: a wide pale ellipse and a tighter darker one at the foot
    this.shadow = new Container();
    for (const [sx, sy, a] of [
      [1, 1, 0.9],
      [0.72, 0.55, 1],
    ] as const) {
      const sh = partSprite(o.decor, 'shared.shadow', FX_ZONES);
      sh.scale.set(sx, sy);
      sh.alpha = a;
      this.shadow.addChild(sh);
    }
    this.root.addChild(this.shadow, this.glow, this.body, this.overlay, this.chunkLayer);
    this.overlay.addChild(this.horn);
    this.puffs = new PuffList(this.overlay);
    this.build();
  }

  /** (Re)builds the sprite layers for the current sheet. */
  private build(): void {
    // the flash sprite lives across rebuilds (it is re-added below): only detach it
    for (const c of [...this.art.children]) {
      if (c === this.flash) this.art.removeChild(c);
      else c.destroy({ children: true });
    }
    for (const c of [...this.lightLayer.children]) c.destroy({ children: true });
    const m = this.sheet.meta;
    const k = this.sheet.luPerUnit;
    this.art.scale.set(k);
    const tint = this.o.teamColor;
    this.bodyPair = pair(tint);
    this.treasuryPair = pair(tint);
    const flags = m.flags ?? [];
    this.backFlags = flags.filter((f) => f.z === 'back').map(() => pair(tint));
    this.frontFlags = flags.filter((f) => f.z !== 'back').map(() => pair(tint));
    this.art.addChild(...this.backFlags.map((p) => p.c), this.bodyPair.c, this.flash, this.treasuryPair.c, ...this.frontFlags.map((p) => p.c));
    this.lights = (m.lightsLu ?? []).map((l, i) => {
      const s = partSprite(this.o.decor, 'fx.p.glow', FX_ZONES);
      s.tint = LIGHT_COLORS[this.age];
      s.blendMode = 'add';
      s.position.set(l.x, -l.y);
      s.scale.set(Math.max(0.5, l.r / 9));
      this.lightLayer.addChild(s);
      return { s, phase: i * 1.7, crumbleMax: l.crumbleMax, a: 0.38 };
    });
    this.placeHorn();
    const w = m.widthLu ?? 160;
    this.shadow.position.set(-w * 0.48 * this.facing, 3);
    this.shadow.scale.set((w * 1.25) / 36, 2.4);
    this.show();
  }

  private placeHorn(): void {
    const h = this.sheet.meta.hornLu ?? [-80, 250];
    this.horn.position.set(h[0] * this.facing, -h[1]);
    this.horn.scale.set(1.6);
    const hc = this.o.def.anchors.hitCenter;
    this.glow.position.set(hc.x * this.facing, hc.y);
    this.glow.scale.set(this.sheet.meta.heightLu / 14);
  }

  mountPoints(): Pt[] {
    return (this.sheet.meta.mountsLu ?? []).map(([x, y]) => ({ x: this.root.x + x * this.facing, y: this.root.y - y }));
  }

  setCrumble(stage: 0 | 1 | 2 | 3): void {
    if (stage > this.crumble) this.debris(4 + stage * 2);
    this.crumble = stage;
    this.show();
  }

  setTreasury(level: number): void {
    if (level > this.treasury) this.popMs = 320;
    this.treasury = level;
    this.show();
  }

  morphTo(age: AgeId, ms: number = CLIP_TIMING.baseMorphMs): void {
    const m = { age, t: 0, ms: Math.max(200, ms), hold: 0, swapped: false, next: null as WorldSheet | null };
    this.morph = m;
    const src = this.o.sourceFor(age);
    if (src) {
      const hit = this.o.world.get(src);
      if (hit) m.next = hit;
      else void this.o.world.ensure(src).then((s) => (m.next = s));
    }
  }

  lastStandGlow(on: boolean): void {
    this.hornOn = on;
    this.horn.visible = on;
    this.glow.visible = on;
  }

  hit(): void {
    this.shakeMs = 240;
    this.flashMs = 90;
    this.debris(2);
  }

  collapse(): void {
    if (this.collapseT < 0) {
      this.collapseT = 0;
      this.debris(16, 1.6);
      this.billows(4);
    }
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clockMs += dtMs;
    let sx = 1;
    let sy = 1;
    let ox = 0;
    let oy = 0;
    if (this.shakeMs > 0) {
      this.shakeMs = Math.max(0, this.shakeMs - dtMs);
      const k = this.shakeMs / 240;
      ox = (this.rng.next() - 0.5) * 6 * k;
      oy = (this.rng.next() - 0.5) * 3 * k;
    }
    let flash = this.flashMs > 0 ? this.flashMs / 90 : 0;
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    if (this.morph) {
      const m = this.morph;
      // hold at the bottom of the squash until the next age's sheet has arrived (at most 3 s)
      const waiting = !m.swapped && !m.next && m.t >= m.ms * 0.5 && m.hold < 3000 && this.o.sourceFor(m.age) !== undefined;
      // while waiting for the next sheet the flash fades, so the base never sits as a white pillar
      if (waiting) m.hold += dtMs;
      else m.t += dtMs;
      const u = Math.min(1, m.t / m.ms);
      if (u < 0.25) {
        const s = Math.sin((u / 0.25) * Math.PI * 0.5);
        sx = 1 + 0.08 * s;
        sy = 1 - 0.12 * s;
      } else if (u < 0.5) {
        const s = (u - 0.25) / 0.25;
        sx = 1.08 - 0.3 * s;
        sy = 0.88 - 0.5 * s;
        flash = Math.max(flash, s * Math.max(0.2, 1 - m.hold / 500));
      } else {
        if (!m.swapped) this.swap(m);
        const s = (u - 0.5) / 0.5;
        const back = 1 - Math.pow(1 - s, 3);
        sx = 0.78 + 0.22 * back + 0.05 * Math.sin(s * Math.PI);
        sy = 0.38 + 0.62 * back + 0.08 * Math.sin(s * Math.PI);
        flash = Math.max(flash, 1 - s * 2);
      }
      if (u >= 1) this.morph = null;
    }
    if (this.collapseT >= 0) {
      this.collapseT += dtMs;
      const u = Math.min(1, this.collapseT / 1400);
      oy += u * u * 40;
      sy *= 1 - 0.45 * u;
      ox += (this.rng.next() - 0.5) * 4 * (1 - u);
      this.body.alpha = 1 - 0.55 * u;
      this.shadow.alpha = 1 - 0.6 * u;
      if (this.rng.next() < 0.06 * (1 - u)) this.debris(1, 1.2);
    }
    if (this.popMs > 0) {
      this.popMs = Math.max(0, this.popMs - dtMs);
      const s = Math.sin((this.popMs / 320) * Math.PI);
      sx *= 1 + 0.025 * s;
      sy *= 1 - 0.02 * s;
    }
    this.body.position.set(ox, oy);
    this.body.scale.set(this.facing * sx, sy);
    this.flash.visible = flash > 0.01;
    this.flash.alpha = Math.min(1, flash) * EVOLVE_FLASH_MAX;
    // lights flicker (two sines, per light phase)
    for (const l of this.lights) {
      const on = this.crumble <= l.crumbleMax && this.collapseT < 0;
      l.s.visible = on;
      if (on) {
        const f = 1 + 0.14 * Math.sin(this.clockMs / 83 + l.phase) + 0.08 * Math.sin(this.clockMs / 37 + l.phase * 2);
        l.s.alpha = l.a * f;
        l.s.scale.y = l.s.scale.x * (0.96 + 0.06 * f);
      }
    }
    // damage smoke from the stage-2 crumble on
    const smoke = (this.sheet.meta.smokeLu ?? []).filter((s) => this.crumble >= s.crumbleMin);
    if (smoke.length > 0 && this.collapseT < 0) {
      this.smokeAcc += (dtMs / 1000) * 1.1 * smoke.length;
      while (this.smokeAcc >= 1) {
        this.smokeAcc -= 1;
        const s = smoke[Math.floor(this.rng.next() * smoke.length)] ?? smoke[0];
        if (s) this.smokePuff(s.x, s.y);
      }
    }
    if (this.hornOn) {
      const k = 0.5 + 0.5 * Math.sin(this.clockMs / 180);
      const h = this.sheet.meta.hornLu ?? [-80, 250];
      this.horn.y = -h[1] - 4 * k;
      this.horn.rotation = Math.sin(this.clockMs / 260) * 0.08;
      this.glow.alpha = 0.35 + 0.35 * k;
    }
    this.show();
    this.puffs.update(dtMs);
    this.stepChunks(dtMs);
  }

  /** Rubble chunks: spin, fall under gravity, bounce on the ground (y = 0) twice, then fade. */
  private stepChunks(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      if (!c) continue;
      c.age += dtMs;
      if (c.age >= c.life) {
        c.s.destroy();
        this.chunks.splice(i, 1);
        continue;
      }
      c.vy += 900 * dt;
      c.s.x += c.vx * dt;
      c.s.y += c.vy * dt;
      c.s.rotation += c.spin * dt;
      if (c.s.y > 0 && c.vy > 0) {
        c.s.y = 0;
        if (c.bounces < 2) {
          c.vy *= -0.38;
          c.vx *= 0.6;
          c.spin *= 0.5;
          c.bounces++;
        } else {
          c.vy = 0;
          c.vx *= 0.8;
          c.spin = 0;
        }
      }
      const fade = c.life - c.age;
      c.s.alpha = Math.min(1, fade / 300);
    }
  }

  private swap(m: { age: AgeId; swapped: boolean; next: WorldSheet | null }): void {
    m.swapped = true;
    if (!m.next) return;
    this.sheet = m.next;
    this.age = m.age;
    const src = this.o.sourceFor(m.age);
    if (src) this.root.label = src;
    this.build();
  }

  private show(): void {
    const A = this.sheet.animations;
    const stage = Math.max(0, Math.min((A['body']?.length ?? 1) - 1, this.crumble));
    setFrame(this.bodyPair.base, A['body']?.[stage]);
    setFrame(this.bodyPair.team, A['body_team']?.[stage]);
    setFrame(this.flash, A['body']?.[stage]);
    const tl = Math.min(this.treasury, A['treasury']?.length ?? 0);
    this.treasuryPair.c.visible = tl > 0;
    if (tl > 0) {
      setFrame(this.treasuryPair.base, A['treasury']?.[tl - 1]);
      setFrame(this.treasuryPair.team, A['treasury_team']?.[tl - 1]);
    }
    const flags = this.sheet.meta.flags ?? [];
    let bi = 0;
    let fi = 0;
    for (const f of flags) {
      const p = f.z === 'back' ? this.backFlags[bi++] : this.frontFlags[fi++];
      if (!p) continue;
      p.c.visible = this.crumble <= f.crumbleMax;
      if (!p.c.visible) continue;
      const i = frameIndex(clipDurations(this.sheet, f.clip), this.clockMs + fi * 170 + bi * 90, true);
      setFrame(p.base, A[f.clip]?.[i]);
      setFrame(p.team, A[`${f.clip}_team`]?.[i]);
    }
  }

  private smokePuff(x: number, y: number): void {
    const s = partSprite(this.o.decor, 'fx.p.smoke', FX_ZONES);
    s.tint = this.age === 'future' ? 0x8c8aa0 : 0x7a746c;
    s.position.set(x * this.facing + (this.rng.next() - 0.5) * 8, -y);
    this.puffs.add(s, { vx: 6 + this.rng.next() * 8, vy: -26 - this.rng.next() * 14, life: 1600, s0: 1.1, s1: 3.2, a0: 0.45 });
  }

  /** Knocks `n` rounded chunks off the base in its own palette (`size` scales them). */
  private debris(n: number, size = 1): void {
    const w = this.sheet.meta.widthLu ?? 150;
    const h = this.sheet.meta.heightLu;
    const colors = RUBBLE_COLORS[this.age];
    for (let i = 0; i < n; i++) {
      if (this.chunks.length >= MAX_CHUNKS) {
        const old = this.chunks.shift();
        old?.s.destroy();
      }
      const s = partSprite(this.o.decor, i % 2 ? 'fx.p.rock' : 'fx.p.rock2', FX_ZONES);
      s.tint = colors[i % colors.length] ?? 0x9a9288;
      s.scale.set(size * (0.9 + this.rng.next() * 1.1));
      s.rotation = this.rng.next() * Math.PI * 2;
      s.position.set(-(0.1 + this.rng.next() * 0.8) * w * this.facing, -h * (0.2 + this.rng.next() * 0.6));
      this.chunkLayer.addChild(s);
      this.chunks.push({
        s,
        vx: (this.rng.next() - 0.25) * 150 * this.facing,
        vy: -120 - this.rng.next() * 180,
        spin: (this.rng.next() - 0.5) * 9,
        age: 0,
        life: 1400 + this.rng.next() * 900,
        bounces: 0,
      });
    }
  }

  /** Big soft dust billows that grow, rise a little and fade (the collapse). */
  private billows(n: number): void {
    const w = this.sheet.meta.widthLu ?? 150;
    for (let i = 0; i < n; i++) {
      const s = partSprite(this.o.decor, 'fx.p.cloud', FX_ZONES);
      s.tint = DUST_COLORS[this.age];
      s.position.set(-(0.15 + (i / Math.max(1, n - 1)) * 0.7) * w * this.facing, -10 - this.rng.next() * 30);
      this.puffs.add(s, { vx: (this.rng.next() - 0.5) * 30, vy: -14 - this.rng.next() * 14, life: 1800 + this.rng.next() * 700, s0: 2.2, s1: 5.2, a0: 0.8 });
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.puffs.clear();
    for (const c of this.chunks) c.s.destroy();
    this.chunks = [];
    this.root.destroy({ children: true });
  }

  /** Test and gallery hooks. */
  get debug(): { crumble: number; treasury: number; age: string; horn: boolean; morphing: boolean } {
    return { crumble: this.crumble, treasury: this.treasury, age: this.age, horn: this.hornOn, morphing: this.morph !== null };
  }
}
