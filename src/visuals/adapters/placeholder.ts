/**
 * `PlaceholderView` tier (DESIGN B5): role-shaped capsule silhouettes in team colour, drawn with
 * Pixi Graphics. It exists so render work never blocks on art (day one), and it is the fallback for
 * the atlas and spine stubs and for unknown visual ids. `?art=placeholder` forces it.
 *
 * Shapes by role group (from the pose's `roleGlyph`): infantry capsule, ranged capsule with a bow
 * arc, heavy wide capsule, anti-armor capsule with a spike, support capsule with a cross, epic
 * capsule with a star, legendary tall capsule with a crown. Clips are simple procedural motions
 * with the same timing contract as the real tiers (attack impact lands at `impactAtMs`).
 */
import { Container, Graphics } from 'pixi.js';
import type { BackdropView, BaseView, ClipName, EffectView, TurretView, UnitPose, UnitView, VisualDef } from '@/contracts/art';
import type { AgeId, Pt, RoleGroup, Side } from '@/contracts/ids';
import { AGE_PALETTES, BACKDROP_PALETTES, darken, lighten, teamColor } from '../palette';
import { WORLD } from '../style';
import type { BackdropRequest, BaseRequest, EffectRequest, PortraitRequest, ViewRequest, VisualAdapter } from './types';

const WIDTH: Record<RoleGroup, number> = { infantry: 22, ranged: 20, heavy: 40, antiArmor: 26, support: 20, epic: 30, legendary: 64 };

function roleFromHeight(h: number): RoleGroup {
  if (h >= 160) return 'legendary';
  if (h >= 95) return 'heavy';
  return 'infantry';
}

function drawCapsule(g: Graphics, group: RoleGroup, h: number, color: number): void {
  const w = WIDTH[group];
  const line = darken(color, 0.45);
  g.clear();
  g.roundRect(-w / 2, -h, w, h, Math.min(w / 2, 14)).fill(color).stroke({ color: line, width: 3 });
  // facing marker (eye)
  g.circle(w * 0.22, -h * 0.8, 3).fill(0xffffff).stroke({ color: line, width: 1.5 });
  const cx = 0;
  const cy = -h * 0.45;
  switch (group) {
    case 'ranged':
      g.moveTo(w / 2 + 4, cy - 14).quadraticCurveTo(w / 2 + 14, cy, w / 2 + 4, cy + 14).stroke({ color: line, width: 3 });
      break;
    case 'antiArmor':
      g.poly([w / 2, cy - 4, w / 2 + 18, cy, w / 2, cy + 4]).fill(lighten(color, 0.4)).stroke({ color: line, width: 2 });
      break;
    case 'support':
      g.rect(cx - 2, cy - 7, 4, 14).fill(0xffffff);
      g.rect(cx - 7, cy - 2, 14, 4).fill(0xffffff);
      break;
    case 'epic':
      g.star(cx, cy, 5, 7, 3).fill(0xffffff);
      break;
    case 'legendary':
      g.poly([-14, -h - 2, -14, -h - 16, -7, -h - 8, 0, -h - 20, 7, -h - 8, 14, -h - 16, 14, -h - 2]).fill(0xffffff).stroke({ color: line, width: 2 });
      break;
    case 'heavy':
      g.rect(-w / 2 + 4, cy - 3, w - 8, 6).fill(darken(color, 0.25));
      break;
    default:
      break;
  }
}

class PlaceholderUnitView implements UnitView {
  readonly root = new Container();
  readonly anchors: VisualDef['anchors'];
  private readonly g = new Graphics();
  private readonly flashG = new Graphics();
  private group: RoleGroup;
  private clip = 'idle';
  private clipT = 0;
  private clipMs = 1000;
  private impactMs = 0;
  private frozenMs = 0;
  private flashMs = 0;
  private flashDur = 1;
  private t = 0;
  private dead = false;

  constructor(
    private readonly def: VisualDef,
    private readonly color: number,
  ) {
    this.anchors = def.anchors;
    this.group = roleFromHeight(def.heightLu);
    this.root.label = `placeholder:${def.source}`;
    this.root.addChild(this.g, this.flashG);
    this.flashG.visible = false;
    this.redraw();
  }

  private redraw(): void {
    drawCapsule(this.g, this.group, Math.max(30, this.def.heightLu), this.color);
    this.flashG.clear();
    const w = WIDTH[this.group];
    this.flashG.roundRect(-w / 2 - 1.5, -this.def.heightLu - 1.5, w + 3, this.def.heightLu + 3, 12).fill(0xffffff);
  }

  setPose(p: UnitPose): void {
    this.root.position.set(p.x, p.y);
    this.root.scale.x = p.facing;
    this.root.alpha = this.dead ? this.root.alpha : p.alpha;
    if (p.roleGlyph !== this.group) {
      this.group = p.roleGlyph;
      this.redraw();
    }
  }

  play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean }): void {
    if (this.dead) return;
    this.clip = clip;
    this.clipT = 0;
    this.impactMs = o?.impactAtMs ?? 0;
    this.clipMs = o?.durationMs ?? this.def.clips[clip]?.durationMs ?? (clip === 'attack' ? this.impactMs + 250 : 600);
    if (clip === 'die') this.dead = true;
  }

  freeze(ms: number): void {
    this.frozenMs = Math.max(this.frozenMs, ms);
  }

  flash(ms: number): void {
    this.flashMs = ms;
    this.flashDur = Math.max(1, ms);
  }

  update(dtMs: number): void {
    if (this.frozenMs > 0) {
      this.frozenMs -= dtMs;
      return;
    }
    this.t += dtMs;
    this.clipT += dtMs;
    let sy = 1;
    let sx = 1;
    let y = 0;
    switch (this.clip) {
      case 'spawn': {
        const u = Math.min(1, this.clipT / 180);
        sx = sy = u < 0.62 ? (u / 0.62) * 1.15 : 1.15 - 0.15 * ((u - 0.62) / 0.38);
        break;
      }
      case 'walk':
        y = -Math.abs(Math.sin((this.t / 250) * Math.PI)) * 3;
        break;
      case 'attack': {
        const im = Math.max(1, this.impactMs || this.clipMs * 0.5);
        if (this.clipT < im) {
          const k = Math.min(1, this.clipT / (im * 0.6));
          sx = 1 + 0.1 * k;
          sy = 1 - 0.1 * k;
        } else if (this.clipT < this.clipMs) {
          sx = 0.95;
          sy = 1.05;
        }
        break;
      }
      case 'die': {
        const u = Math.min(1, this.clipT / 600);
        this.root.alpha = 1 - u;
        this.root.rotation = -u * Math.PI * 0.5 * this.root.scale.x;
        break;
      }
      case 'victory':
        y = -Math.abs(Math.sin((this.t / 350) * Math.PI)) * 8;
        break;
      default:
        sy = 1 + 0.02 * Math.sin((this.t / 1200) * Math.PI * 2);
    }
    if (this.clip !== 'die' && this.clip !== 'idle' && this.clip !== 'walk' && this.clip !== 'victory' && this.clip !== 'stun' && this.clipT > this.clipMs) {
      this.clip = 'idle';
    }
    this.g.scale.set(sx, sy);
    this.g.y = y;
    if (this.flashMs > 0) {
      this.flashMs -= dtMs;
      this.flashG.visible = this.flashMs > 0;
      this.flashG.alpha = Math.max(0, this.flashMs / this.flashDur);
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class PlaceholderTurretView implements TurretView {
  readonly root = new Container();
  private readonly barrel = new Graphics();
  private readonly arrow = new Graphics();
  private recoil = 0;
  private readonly facing: 1 | -1;

  constructor(color: number, side: Side) {
    this.facing = side === 0 ? 1 : -1;
    const base = new Graphics().roundRect(-14, -22, 28, 22, 5).fill(color).stroke({ color: darken(color, 0.45), width: 3 });
    this.barrel.rect(0, -3, 24, 6).fill(0x555555).stroke({ color: 0x222222, width: 2 });
    this.barrel.position.set(0, -16);
    this.barrel.scale.x = this.facing;
    this.arrow.poly([0, -10, 8, 0, -8, 0]).fill(0xfff1b8);
    this.arrow.position.set(0, -40);
    this.arrow.visible = false;
    this.root.addChild(base, this.barrel, this.arrow);
  }

  aimAt(x: number): void {
    const dx = (x - this.root.x) * this.facing;
    this.barrel.rotation = Math.max(-0.9, Math.min(0.7, Math.atan2(-(this.root.y - 16), Math.max(1, dx)))) * this.facing;
  }

  play(clip: 'build' | 'idle' | 'fire' | 'sell' | 'modernise'): void {
    if (clip === 'fire') this.recoil = 120;
    if (clip === 'sell' || clip === 'modernise') this.root.alpha = 0.4;
    if (clip === 'build') this.root.alpha = 1;
  }

  setOutdated(on: boolean): void {
    this.arrow.visible = on;
  }

  update(dtMs: number): void {
    if (this.recoil > 0) {
      this.recoil -= dtMs;
      this.barrel.x = -4 * this.facing * Math.max(0, this.recoil / 120);
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class PlaceholderBaseView implements BaseView {
  readonly root = new Container();
  private readonly g = new Graphics();
  private readonly horn = new Graphics();
  private readonly facing: 1 | -1;
  private shake = 0;
  private crumble = 0;
  private age: AgeId;

  constructor(
    age: AgeId,
    private readonly color: number,
    side: Side,
  ) {
    this.age = age;
    this.facing = side === 0 ? 1 : -1;
    this.horn.poly([-8, 0, 8, -6, 8, 6]).fill(0xede3c8);
    this.horn.position.set(-70 * this.facing, -250);
    this.horn.visible = false;
    this.root.addChild(this.g, this.horn);
    this.draw();
  }

  private draw(): void {
    const c = AGE_PALETTES[this.age].large[0] ?? 0x888888;
    const h = 220 - this.crumble * 20;
    this.g.clear();
    this.g.rect(-140 * this.facing, -h, 140 * this.facing, h).fill(c).stroke({ color: darken(c, 0.45), width: 3 });
    this.g.rect(-140 * this.facing, -h, 140 * this.facing, 14).fill(this.color);
    for (let i = 0; i < 4; i++) this.g.rect(-24 * this.facing, -60 - i * 45, 18 * this.facing, 6).fill(darken(c, 0.3));
  }

  mountPoints(): Pt[] {
    return [0, 1, 2, 3].map((i) => ({ x: this.root.x - 15 * this.facing, y: this.root.y - 66 - i * 45 }));
  }

  setCrumble(stage: 0 | 1 | 2 | 3): void {
    this.crumble = stage;
    this.draw();
  }

  setTreasury(_level: number): void {}

  morphTo(age: AgeId): void {
    this.age = age;
    this.draw();
  }

  lastStandGlow(on: boolean): void {
    this.horn.visible = on;
  }

  hit(): void {
    this.shake = 200;
  }

  collapse(): void {
    this.g.alpha = 0.4;
  }

  update(dtMs: number): void {
    if (this.shake > 0) {
      this.shake -= dtMs;
      this.g.x = Math.sin(this.shake * 0.9) * 2 * Math.max(0, this.shake / 200);
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class PlaceholderBackdropView implements BackdropView {
  readonly root = new Container();
  private readonly g = new Graphics();
  private seam: number = WORLD.seamHomeLu;
  private target: number = WORLD.seamHomeLu;

  constructor(
    private left: AgeId,
    private right: AgeId,
  ) {
    this.root.addChild(this.g);
    this.draw();
  }

  private draw(): void {
    const L = BACKDROP_PALETTES[this.left];
    const R = BACKDROP_PALETTES[this.right];
    this.g.clear();
    this.g.rect(WORLD.worldLeftLu, WORLD.skyTopLu, this.seam - WORLD.worldLeftLu, -WORLD.skyTopLu).fill(L.skyTop);
    this.g.rect(this.seam, WORLD.skyTopLu, WORLD.worldRightLu - this.seam, -WORLD.skyTopLu).fill(R.skyTop);
    this.g.rect(WORLD.worldLeftLu, -80, this.seam - WORLD.worldLeftLu, 80).fill(L.mid);
    this.g.rect(this.seam, -80, WORLD.worldRightLu - this.seam, 80).fill(R.mid);
    this.g.rect(WORLD.worldLeftLu, 0, WORLD.worldRightLu - WORLD.worldLeftLu, WORLD.groundBottomLu).fill(0x6b5b48);
  }

  setSeam(x: number): void {
    this.target = Math.max(WORLD.seamMinLu, Math.min(WORLD.seamMaxLu, x));
  }

  wipe(side: Side, age: AgeId): void {
    if (side === 0) this.left = age;
    else this.right = age;
    this.draw();
  }

  update(dtMs: number): void {
    const step = (WORLD.seamDriftLuPerSec * dtMs) / 1000;
    const d = this.target - this.seam;
    if (Math.abs(d) > 0.01) {
      this.seam += Math.max(-step, Math.min(step, d));
      this.draw();
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class PlaceholderEffectView implements EffectView {
  readonly root = new Container();
  private remaining = 0;
  private started = false;
  private from: Pt = { x: 0, y: 0 };
  private to: Pt = { x: 0, y: 0 };
  private total = 1;
  private arc = false;

  constructor(color: number, radius: number) {
    this.root.addChild(new Graphics().circle(0, 0, radius).fill(color).stroke({ color: darken(color, 0.45), width: 1.5 }));
  }

  get done(): boolean {
    return this.started && this.remaining <= 0;
  }

  fly(from: Pt, to: Pt, travelMs: number, arc: boolean): void {
    this.started = true;
    this.from = from;
    this.to = to;
    this.total = Math.max(1, travelMs);
    this.remaining = travelMs;
    this.arc = arc;
    this.root.position.set(from.x, from.y);
  }

  playAt(at: Pt, o?: Record<string, number>): void {
    this.started = true;
    this.total = o?.['durationMs'] ?? 300;
    this.remaining = this.total;
    this.from = at;
    this.to = at;
    this.root.position.set(at.x, at.y);
  }

  update(dtMs: number): void {
    if (!this.started) return;
    this.remaining -= dtMs;
    const u = Math.min(1, 1 - this.remaining / this.total);
    const h = this.arc ? 4 * 60 * u * (1 - u) : 0;
    this.root.position.set(this.from.x + (this.to.x - this.from.x) * u, this.from.y + (this.to.y - this.from.y) * u - h);
    if (this.from === this.to) this.root.scale.set(1 + u);
    this.root.alpha = this.from === this.to ? 1 - u : 1;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/** The placeholder tier. */
export class PlaceholderAdapter implements VisualAdapter {
  readonly kind = 'placeholder' as const;
  readonly available = true;

  async preload(_ages: AgeId[]): Promise<void> {}

  createUnit(r: ViewRequest): UnitView {
    return new PlaceholderUnitView(r.def, teamColor(r.side, r.teamPreset));
  }

  createTurret(r: ViewRequest): TurretView {
    return new PlaceholderTurretView(teamColor(r.side, r.teamPreset), r.side);
  }

  createBase(r: BaseRequest): BaseView {
    return new PlaceholderBaseView(r.age, teamColor(r.side, r.teamPreset), r.side);
  }

  createBackdrop(r: BackdropRequest): BackdropView {
    return new PlaceholderBackdropView(r.left.age, r.right.age);
  }

  createProjectile(r: EffectRequest): EffectView {
    return new PlaceholderEffectView(teamColor(r.side, r.teamPreset), 4);
  }

  createEffect(r: EffectRequest): EffectView {
    return new PlaceholderEffectView(0xffffff, Math.max(4, Math.min(40, r.options['radius'] ?? 6)));
  }

  async portrait(r: PortraitRequest): Promise<string> {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas');
    c.width = c.height = r.size;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    const col = teamColor(r.side, 'default');
    ctx.fillStyle = '#2c2b44';
    ctx.fillRect(0, 0, r.size, r.size);
    ctx.fillStyle = `#${col.toString(16).padStart(6, '0')}`;
    const w = r.size * 0.36;
    ctx.beginPath();
    ctx.roundRect((r.size - w) / 2, r.size * 0.18, w, r.size * 0.7, w / 2);
    ctx.fill();
    return c.toDataURL('image/png');
  }
}
