/**
 * Backdrop skin weather (DESIGN A18.9.4 "Backdrops"): the falling snow, rain, petals and leaves, the
 * rising embers and sky lanterns, fireflies, motes and sparkles, and the distant lightning of a
 * side's backdrop theme ({@link BackdropTheme}).
 *
 * - Lives in the backdrop's root (world space), drawn over the mid layer and under the ground and the
 *   lane, so weather never covers a unit, a bar or a projectile (A11 readability).
 * - Each side's weather spawns only over the visible part of that side's half and fades out across the
 *   seam (the same seam blend as the layers), so your theme is yours and the enemy half keeps its sky.
 * - Budgets (B16): at most 90 particles (40 on Lite), halved rates on Lite; Reduce motion keeps a
 *   quiet, slower weather and drops the lightning flashes entirely.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import type { Side } from '@/contracts/ids';
import { WORLD } from '../../style';
import type { BackdropTheme } from '../../backdrops/themes';
import { fxSprite } from './effectView';
import type { PartBaker } from '../../bake';

interface Drop {
  s: Sprite;
  side: Side;
  vx: number;
  vy: number;
  spin: number;
  sway: number;
  swayHz: number;
  t: number;
  life: number;
  a0: number;
  x0: number;
  kind: BackdropTheme['weather'];
}

interface Flash {
  side: Side;
  t: number;
  veil: Sprite;
  bolt: Sprite;
}

const MAX_HIGH = 90;
const MAX_LITE = 40;
/** Where weather stops falling: the ground layer's top edge (world y). */
const FLOOR_Y = -30;

/** Weather sprite per kind (parts in `backdrops/themes.ts` and `effects/sprites.ts`). */
const PART: Record<Exclude<BackdropTheme['weather'], 'none'>, string> = {
  snow: 'fx.p.snow',
  rain: 'bd.streak',
  petals: 'bd.petal',
  leaves: 'bd.leaf',
  embers: 'fx.p.ember',
  lanterns: 'bd.lantern',
  fireflies: 'fx.p.glow',
  motes: 'fx.p.glow',
  sparkles: 'fx.p.star',
};

export interface WeatherView {
  left: number;
  width: number;
  above: number;
  seam: number;
}

export class BackdropWeatherLayer {
  readonly root = new Container();
  private readonly themes: [BackdropTheme | null, BackdropTheme | null] = [null, null];
  private drops: Drop[] = [];
  private flashes: Flash[] = [];
  private acc: [number, number] = [0, 0];
  private nextBolt: [number, number] = [4000, 4000];
  private reduce = false;
  private lite: boolean;
  private primed: [boolean, boolean] = [false, false];

  constructor(
    private readonly baker: PartBaker,
    quality: 'high' | 'lite',
    private readonly rng: { next(): number },
  ) {
    this.lite = quality === 'lite';
    this.root.label = 'backdrop.weather';
  }

  setTheme(side: Side, theme: BackdropTheme | null): void {
    this.themes[side] = theme;
    this.primed[side] = false;
    this.nextBolt[side] = 3000 + this.rng.next() * 4000;
  }

  setMotion(o: { reduce: boolean; lite: boolean }): void {
    this.reduce = o.reduce;
    this.lite = this.lite || o.lite;
    if (o.reduce) {
      for (const f of this.flashes) this.endFlash(f);
      this.flashes = [];
    }
  }

  /** Live particle count (tests and the gallery). */
  get count(): number {
    return this.drops.length;
  }

  private weight(side: Side, x: number, seam: number): number {
    const d = side === 0 ? seam - x : x - seam;
    return Math.max(0, Math.min(1, 0.5 + d / WORLD.seamBlendLu));
  }

  update(dtMs: number, v: WeatherView): void {
    const dt = Math.min(0.1, dtMs / 1000);
    const cap = this.lite ? MAX_LITE : MAX_HIGH;
    const calm = this.reduce ? 0.5 : 1;
    for (const side of [0, 1] as const) {
      const th = this.themes[side];
      if (!th || th.weather === 'none') continue;
      const x0 = side === 0 ? v.left : Math.max(v.left, v.seam - WORLD.seamBlendLu / 2);
      const x1 = side === 0 ? Math.min(v.left + v.width, v.seam + WORLD.seamBlendLu / 2) : v.left + v.width;
      if (x1 - x0 < 1) continue;
      const rate = th.weatherRate * ((x1 - x0) / 1000) * (this.lite ? 0.5 : 1) * calm;
      if (!this.primed[side]) {
        // start mid-shower: fill the half at once instead of waiting for the first flakes to fall
        this.primed[side] = true;
        const n = Math.min(cap, Math.round(rate * this.lifeOf(th) * 0.001 * 0.8));
        for (let i = 0; i < n && this.drops.length < cap; i++) this.spawn(side, th, x0, x1, v, true);
      }
      this.acc[side] += rate * dt;
      while (this.acc[side] >= 1) {
        this.acc[side] -= 1;
        if (this.drops.length < cap) this.spawn(side, th, x0, x1, v, false);
      }
      if (th.lightning && !this.reduce) {
        this.nextBolt[side] -= dtMs;
        if (this.nextBolt[side] <= 0) {
          this.nextBolt[side] = 5500 + this.rng.next() * 6000;
          this.startFlash(side, x0, x1, v);
        }
      }
    }
    const top = -v.above - 60;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]!;
      d.t += dtMs;
      const u = d.t / d.life;
      const gone = u >= 1 || d.s.y > FLOOR_Y + 4 || d.s.y < top - 40 || d.s.x < v.left - 120 || d.s.x > v.left + v.width + 120;
      if (gone || !this.themes[d.side]) {
        d.s.destroy();
        this.drops.splice(i, 1);
        continue;
      }
      const speed = this.reduce ? 0.6 : 1;
      d.s.x += (d.vx * dt + Math.sin((d.t / 1000) * d.swayHz * Math.PI * 2) * d.sway * dt) * speed;
      d.s.y += d.vy * dt * speed;
      d.s.rotation += d.spin * dt * speed;
      let a = d.a0 * this.weight(d.side, d.s.x, v.seam);
      // fade in and out over the life; embers and lanterns flicker, fireflies and sparkles blink
      a *= Math.min(1, u * 8) * Math.min(1, (1 - u) * 5);
      if (d.kind === 'embers') a *= 0.65 + 0.35 * Math.sin(d.t / 70 + d.x0);
      if (d.kind === 'fireflies' || d.kind === 'sparkles') a *= 0.5 + 0.5 * Math.sin(d.t / 260 + d.x0);
      if (d.kind === 'lanterns') a *= 0.85 + 0.15 * Math.sin(d.t / 180 + d.x0);
      // rain and snow slip behind the ground's top edge
      if (d.s.y > FLOOR_Y - 12 && d.vy > 0) a *= Math.max(0, (FLOOR_Y + 4 - d.s.y) / 16);
      d.s.alpha = a;
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]!;
      f.t += dtMs;
      // two soft pulses (never a strobe): 0-120 ms up, a dip, a second smaller pulse, fade by 700 ms
      const t = f.t;
      const env = t < 90 ? t / 90 : t < 180 ? 1 - ((t - 90) / 90) * 0.7 : t < 260 ? 0.3 + ((t - 180) / 80) * 0.45 : Math.max(0, 0.75 * (1 - (t - 260) / 440));
      f.veil.alpha = 0.16 * env * this.weight(f.side, f.veil.x + f.veil.width / 2, v.seam);
      f.bolt.alpha = Math.min(1, env * 1.4) * (t < 320 ? 1 : 0.4);
      if (t >= 700) {
        this.endFlash(f);
        this.flashes.splice(i, 1);
      }
    }
  }

  private lifeOf(th: BackdropTheme): number {
    switch (th.weather) {
      case 'rain':
        return 900;
      case 'lanterns':
        return 26000;
      case 'embers':
        return 7000;
      case 'fireflies':
      case 'motes':
        return 7000;
      case 'sparkles':
        return 2600;
      default:
        return 11000;
    }
  }

  private spawn(side: Side, th: BackdropTheme, x0: number, x1: number, v: WeatherView, prime: boolean): void {
    if (th.weather === 'none') return;
    const r = () => this.rng.next();
    const s = fxSprite(this.baker, PART[th.weather]);
    if (s.texture === Texture.EMPTY) return;
    const top = -v.above;
    const x = x0 + r() * (x1 - x0);
    const life = this.lifeOf(th) * (0.8 + r() * 0.4);
    const d: Drop = { s, side, vx: 0, vy: 0, spin: 0, sway: 0, swayHz: 0.2 + r() * 0.3, t: prime ? r() * life * 0.7 : 0, life, a0: 1, x0: r() * 10, kind: th.weather };
    // falling weather starts above the view, or anywhere in it when the half is being primed
    const falling = (): number => (prime ? top + r() * (FLOOR_Y - top) : top - 20 - r() * 40);
    let y = 0;
    switch (th.weather) {
      case 'snow':
        d.vy = 26 + r() * 26;
        d.vx = -4 + r() * 8;
        d.sway = 10 + r() * 8;
        s.scale.set(1.3 + r() * 1.5);
        d.a0 = 0.7 + r() * 0.3;
        y = falling();
        break;
      case 'rain':
        d.vy = 520 + r() * 140;
        d.vx = -90;
        s.rotation = 0.17;
        s.scale.set(1, 1 + r() * 0.5);
        d.a0 = 0.22 + r() * 0.2;
        y = falling();
        break;
      case 'petals':
      case 'leaves':
        d.vy = (th.weather === 'leaves' ? 30 : 22) + r() * 16;
        d.vx = 10 + r() * 18;
        d.sway = 14 + r() * 12;
        d.spin = (r() - 0.5) * 4;
        s.rotation = r() * Math.PI * 2;
        s.scale.set(1.3 + r() * 0.8);
        d.a0 = 0.8 + r() * 0.2;
        y = falling();
        break;
      case 'embers':
        d.vy = -(20 + r() * 26);
        d.vx = 4 + r() * 12;
        d.sway = 6;
        s.scale.set(1.1 + r() * 1.1);
        d.a0 = 0.75;
        y = prime ? FLOOR_Y - r() * (FLOOR_Y - top) * 0.8 : FLOOR_Y - 10 - r() * 60;
        break;
      case 'lanterns':
        d.vy = -(9 + r() * 7);
        d.vx = 2 + r() * 5;
        d.sway = 4;
        s.scale.set(1 + r() * 0.7);
        d.a0 = 0.92;
        y = prime ? FLOOR_Y - 40 - r() * (FLOOR_Y - top) * 0.85 : FLOOR_Y - 30 - r() * 50;
        break;
      case 'fireflies':
        d.vy = (r() - 0.5) * 8;
        d.vx = (r() - 0.5) * 10;
        d.sway = 10;
        s.scale.set(0.35 + r() * 0.25);
        d.a0 = 0.9;
        y = FLOOR_Y - 20 - r() * 190;
        break;
      case 'motes':
        d.vy = -(3 + r() * 5);
        d.vx = 4 + r() * 6;
        d.sway = 5;
        s.scale.set(0.22 + r() * 0.22);
        d.a0 = 0.55;
        y = FLOOR_Y - 20 - r() * 320;
        break;
      case 'sparkles':
        s.scale.set(0.35 + r() * 0.3);
        d.spin = (r() - 0.5) * 1.2;
        d.a0 = 0.8;
        y = top + r() * Math.max(40, (FLOOR_Y - 140 - top) * 0.8);
        break;
    }
    s.tint = th.weatherColor;
    s.position.set(x, y);
    s.alpha = 0;
    this.root.addChild(s);
    this.drops.push(d);
  }

  private startFlash(side: Side, x0: number, x1: number, v: WeatherView): void {
    const veil = new Sprite(Texture.WHITE);
    veil.tint = 0xe2e8f4;
    veil.position.set(x0, -v.above - 40);
    veil.width = x1 - x0;
    veil.height = v.above + 40 + FLOOR_Y;
    veil.alpha = 0;
    const bolt = fxSprite(this.baker, 'fx.p.bolt');
    bolt.tint = 0xf2f6ff;
    bolt.rotation = Math.PI / 2 + (this.rng.next() - 0.5) * 0.3;
    bolt.scale.set(7, 4);
    bolt.position.set(x0 + (0.15 + this.rng.next() * 0.7) * (x1 - x0), -v.above * 0.55);
    bolt.alpha = 0;
    this.root.addChildAt(veil, 0);
    this.root.addChildAt(bolt, 1);
    this.flashes.push({ side, t: 0, veil, bolt });
  }

  private endFlash(f: Flash): void {
    f.veil.destroy();
    f.bolt.destroy();
  }

  destroy(): void {
    for (const d of this.drops) d.s.destroy();
    this.drops = [];
    for (const f of this.flashes) this.endFlash(f);
    this.flashes = [];
  }
}
